# FR-150: Groq Transcription Engine

**Date:** 2026-04-08  
**Status:** Deferred — immediate fix was updating the MLX Whisper binary path to `~/.pyenv/shims/mlx_whisper`. MLX on Apple Silicon M4 is fast enough; Groq migration is optional future work.  
**Priority:** High (unblocks broken transcription)

---

## Background

FliHub has used a local MLX Whisper binary to transcribe recordings since FR-30. MLX Whisper runs on Apple Silicon's Neural Engine and is genuinely fast (typically 0.3–0.5× real-time on M4). It worked well — 891 telemetry entries logged between Dec 2025 and Jan 2026.

**Why it's broken now:** The binary path is hardcoded to `~/.pyenv/versions/3.14.3/bin/mlx_whisper`. When the pyenv Python version changed, the binary disappeared. Transcription silently fails with `spawn ENOENT` — shown in the UI as "Failed to start Whisper: spawn...".

**Why switch to Groq rather than just fix the path:**
- No local binary dependency — nothing to break when Python versions change
- `GROQ_API_KEY` is already present in the environment
- Groq's `whisper-large-v3-turbo` model is equivalent quality, comparable speed
- Eliminates the mlx_whisper, pyenv, and Python version management burden entirely
- The existing queue, socket events, and telemetry infrastructure are unchanged

---

## Goal

Replace the `spawn(whisperBinary, [...])` child process in `transcriptions.ts` with a Groq API call. Everything else — the job queue, socket.io progress events, telemetry, deduplication, and output file format — stays exactly as-is.

---

## Capabilities Required

### 1. Audio Extraction (pre-processing)

Groq's audio transcription API accepts audio files, not video files. It also has a **25 MB file size limit**.

`.mov` recordings from Ecamm range from ~10 MB (short clips) to 100+ MB (long recordings). A 65 MB `.mov` cannot be sent directly.

**Requirement:** Before calling the Groq API, extract the audio track using `ffmpeg`:

```
ffmpeg -i input.mov -vn -acodec aac -b:a 64k -ac 1 -ar 16000 output.m4a
```

Flags explained:
- `-vn` — no video (audio only)
- `-acodec aac` — AAC codec (Groq supports this)
- `-b:a 64k` — 64 kbps bitrate (sufficient for speech; keeps files small)
- `-ac 1` — mono (speech only needs one channel)
- `-ar 16000` — 16 kHz sample rate (optimal for Whisper models)

A typical 5-minute 65 MB `.mov` becomes ~2.5 MB as a 64 kbps mono `.m4a`. Well under the 25 MB limit even for long recordings.

**Supported input formats:** `.mov`, `.mp4` (both used by Ecamm recordings)

### 2. Temporary File Management

Extracted audio files are intermediate artifacts — they should never be stored with the project.

**Requirement:** 
- Write extracted audio to `os.tmpdir()` with a unique filename (e.g. `flihub-audio-{jobId}.m4a`)
- Delete the temp file immediately after the Groq API call completes (success or failure)
- If the server crashes mid-transcription, temp files are orphaned in the OS temp dir — this is acceptable; the OS cleans temp dirs on restart

**Do not** use the project's `recording-transcripts/` dir or any project folder for temp files.

### 3. Groq API Call

```typescript
// POST https://api.groq.com/openai/v1/audio/transcriptions
// Authorization: Bearer {GROQ_API_KEY}
// Body: FormData
//   file: <audio file>
//   model: whisper-large-v3-turbo
//   response_format: verbose_json
//   language: en
```

`verbose_json` returns segments with start/end timestamps — needed to generate SRT output.

**Model:** `whisper-large-v3-turbo` (same model name as the current MLX config, fast and accurate)

**Implementation note:** Groq's audio API is OpenAI-compatible. No SDK required — native `fetch` with `FormData` works (see openclaw reference: `src/media-understanding/providers/openai/audio.ts`).

### 4. Output Generation

From the Groq `verbose_json` response, write the same output files the old Whisper binary produced:

| File | Content | How |
|------|---------|-----|
| `{basename}.txt` | Plain text transcript | `response.text` |
| `{basename}.srt` | Timed subtitles | Convert `response.segments` → SRT format |
| `{basename}.json` | Full response | Write raw Groq JSON |

SRT segment format:
```
1
00:00:01,240 --> 00:00:04,680
This is the first segment text.

2
00:00:05,100 --> 00:00:08,300
This is the second segment.
```

Timestamps from Groq are floats (seconds). Convert to `HH:MM:SS,mmm` format.

### 5. Progress Events

The old Whisper binary streamed text to stdout/stderr which was forwarded via `transcription:progress` socket events. Groq is a single blocking HTTP call — there is no stream of progress text.

**Requirement:**
- Emit `transcription:started` when the Groq call begins
- Emit a single `transcription:progress` event with a status message like `"Transcribing with Groq..."` so the UI shows activity
- Emit `transcription:complete` or `transcription:error` on completion
- No change to socket event names or payload shapes

### 6. Configuration

`GROQ_API_KEY` is read from `process.env`. No changes to `config.json`.

Add a startup check: if `GROQ_API_KEY` is not set, log a clear warning at server start and return a descriptive error on any transcription attempt (not a silent spawn failure).

### 7. Error Handling

| Scenario | Behaviour |
|----------|-----------|
| `GROQ_API_KEY` missing | Fail fast with clear message at queue time |
| ffmpeg not found | Fail with "ffmpeg required for audio extraction" |
| ffmpeg extraction fails | Fail job, clean up temp file, emit `transcription:error` |
| Groq API error (4xx/5xx) | Fail job, clean up temp file, emit `transcription:error` with status code |
| File > 25 MB after extraction | Should not happen given 64 kbps mono encoding — but if it does, fail with clear message |
| Temp file cleanup failure | Log warning, continue (don't fail the job) |

---

## Files Changed

| File | Change |
|------|--------|
| `server/src/routes/transcriptions.ts` | Replace `spawn(whisperBinary, [...])` block with `transcribeWithGroq()` call. Remove `WHISPER_BINARY`, `WHISPER_MODEL`, `WHISPER_LANGUAGE` constants. Remove `ChildProcess` import. |
| `server/src/utils/groqTranscription.ts` | New file. `extractAudio()` (ffmpeg wrapper), `callGroqApi()` (fetch), `segmentsToSrt()`, `transcribeWithGroq()` orchestrator. |

No changes to: queue management, socket events, telemetry schema, output file naming, deduplication logic, manage routes, or client-side components.

---

## Out of Scope

- Dual transcription (local + Groq in parallel) — FR-132 concept, not this FR
- Progress bar with time estimation — FR-132 Phase 2, depends on streaming
- Vocabulary hints / accuracy comparison — FR-132 Phase 3
- Making the transcription engine configurable (Groq vs MLX) — unnecessary complexity; Groq is the engine going forward

---

## Acceptance Criteria

- [ ] Recording renamed via Incoming screen triggers Groq transcription automatically (FR-30 path)
- [ ] "Transcribe (N pending)" on Recordings page queues all files and processes them via Groq
- [ ] Manage → Regenerate Transcripts queues files and processes via Groq
- [ ] `.txt`, `.srt`, and `.json` files appear in `recording-transcripts/` after completion
- [ ] No temp audio files left behind after successful or failed transcription
- [ ] `transcription:started`, `transcription:progress`, `transcription:complete` socket events fire
- [ ] Clear error message if `GROQ_API_KEY` not set
- [ ] Works for both `.mov` and `.mp4` inputs
- [ ] Works for recordings up to at least 120 minutes duration
- [ ] Telemetry entry written to `server/transcription-telemetry.jsonl` on completion
