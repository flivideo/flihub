# FR-30: Video Transcription - Implementation Complete

## Summary

Implemented automatic video transcription using local Whisper AI. The feature includes:
- Auto-transcription when recordings are renamed
- Manual transcription for legacy recordings
- Transcription monitoring via "Transcripts" tab
- Chapter transcript combining

---

## What Was Built

### Core Feature: Auto-Transcription

When a recording is renamed/moved to `recordings/`, transcription automatically queues and processes in the background using Whisper AI.

**Transcripts location:** `{project}/transcripts/`

**Naming convention:** `{chapter}-{sequence}-{name}.txt` (matches video filename)

### Enhancement A: Manual Transcribe Button

For legacy recordings without transcripts, users can manually trigger transcription.

**Location:** Recordings tab > individual recording rows

**Button states:**
- `[Transcribe]` - gray, for recordings with no transcript
- `[Queued]` - yellow, waiting to process
- `[Transcribing...]` - blue, currently processing
- `[Transcript]` - green, click to view
- `[Retry]` - red, for failed transcriptions

### Enhancement B: Combine Chapter Transcripts

Combines all transcripts for a chapter into a single file.

**Location:** Recordings tab > chapter headers (when "Chapters" checkbox enabled)

**Combined file:** `{chapter}-chapter.txt` (e.g., `07-chapter.txt`)

**Button states:**
- Hidden - no transcripts for chapter
- `[Combine]` - purple, transcripts exist but not combined yet
- `[View] [Combine ✓]` - blue View + green Combine when combined file exists

**Format:** Plain text, each transcript separated by blank line (no headers)

### Transcripts Tab

New tab for monitoring transcription progress.

**Sections:**
- **Active** - Currently transcribing with live progress
- **Queue** - Pending transcriptions
- **Recent** - Last 5 completed/failed jobs

---

## Files Created

| File | Purpose |
|------|---------|
| `server/src/routes/transcriptions.ts` | Transcription API & job queue |
| `client/src/components/TranscriptionsPage.tsx` | Transcripts tab UI |
| `client/src/components/TranscriptModal.tsx` | Transcript viewer modal |

## Files Modified

| File | Changes |
|------|---------|
| `shared/types.ts` | Added TranscriptionJob, status types, socket events |
| `shared/paths.ts` | Added `transcripts` to ProjectPaths |
| `server/src/index.ts` | Registered transcription routes |
| `server/src/routes/index.ts` | Auto-queue on rename |
| `server/src/routes/system.ts` | Added transcripts folder to open-folder |
| `client/src/App.tsx` | Added Transcripts tab |
| `client/src/components/RecordingsView.tsx` | Added TranscriptionBadge, CombineChapterButton |
| `client/src/constants/queryKeys.ts` | Added transcription query keys |
| `client/src/hooks/useOpenFolder.ts` | Added transcripts folder type |

---

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/transcriptions` | Get all transcription state (active, queue, recent) |
| GET | `/api/transcriptions/status/:filename` | Get status for specific video |
| GET | `/api/transcriptions/transcript/:filename` | Get transcript content |
| POST | `/api/transcriptions/queue` | Manually queue a transcription |
| GET | `/api/transcriptions/chapter-status/:chapter` | Check if combined exists |
| POST | `/api/transcriptions/combine-chapter` | Create combined chapter file |

---

## Socket Events

| Event | Payload | Purpose |
|-------|---------|---------|
| `transcription:queued` | `{ jobId, videoPath, position }` | Job added to queue |
| `transcription:started` | `{ jobId, videoPath }` | Processing began |
| `transcription:progress` | `{ jobId, text }` | Streaming output |
| `transcription:complete` | `{ jobId, videoPath, transcriptPath }` | Successfully completed |
| `transcription:error` | `{ jobId, videoPath, error }` | Failed |

---

## Prerequisites

For transcription to work, the server machine needs:

1. **Python 3.11+** at `~/.pyenv/versions/3.11.12/bin/python`
2. **Whisper** installed: `pip install openai-whisper`
3. **ffmpeg** installed: `brew install ffmpeg`

---

## Testing Checklist

### Auto-Transcription
- [ ] Rename a recording in Incoming tab
- [ ] Verify transcription queues (check Transcripts tab)
- [ ] Verify transcript file created in `transcripts/` folder
- [ ] Verify status badge updates on Recordings tab

### Manual Transcription
- [ ] Find a recording without transcript (shows `[Transcribe]`)
- [ ] Click Transcribe, verify it queues
- [ ] Verify badge changes to `[Transcript]` when done

### Combine Chapter
- [ ] Go to Recordings tab with Chapters enabled
- [ ] Find chapter with transcripts
- [ ] Click `[Combine]`, verify combined file created
- [ ] Click `[View]` to open combined transcript
- [ ] Verify content is plain text (no headers)

### Edge Cases
- [ ] Server restart during transcription (job lost, can retry manually)
- [ ] Video deleted while transcribing (should fail gracefully)
- [ ] Transcript already exists (should skip, not duplicate)

---

## Documentation Updates Needed

- [ ] Update `backlog.md` - mark FR-30 as complete
- [ ] Update `changelog.md` - add implementation entry
- [ ] Consider adding transcription config options to spec (model, language, python path)

---

## Known Limitations

1. **In-memory queue** - Transcription jobs are lost on server restart
2. **Single worker** - One transcription at a time to avoid resource contention
3. **Hardcoded config** - Whisper model/language/python path are hardcoded
4. **No cancel** - Cannot cancel in-progress transcription

---

## Future Enhancements (if needed)

- Persist queue to disk for restart recovery
- Add transcription settings to Config tab
- Add cancel button for active transcription
- Support multiple Whisper models (tiny, base, small, medium, large)
