# Video Transcription - Specification

## Overview

Automatic transcription of video recordings using local Whisper AI. When a recording is renamed and moved to the `recordings/` folder, transcription starts automatically in the background. Users can monitor progress via a new "Transcriptions" tab and see status indicators on recording rows.

---

## Problem Statement

**Current workflow:**

1. Record video, rename in app
2. Later, manually run transcription command in terminal
3. Manually move transcript to correct location
4. No visibility into transcription progress

**Proposed workflow:**

1. Record video, rename in app
2. Transcription starts automatically in background
3. Watch progress in real-time on Transcriptions tab
4. Transcript appears in `recording-transcripts/` folder when complete

---

## Folder Structure

```
project/
├── recordings/
│   ├── 07-5-outro-endcard.mov
│   ├── 08-1-intro.mov
│   └── -safe/
│       └── 01-1-intro.mov
├── recording-transcripts/    # Sibling to recordings - clearly pre-edit transcripts
│   ├── 07-5-outro-endcard.txt
│   ├── 08-1-intro.txt
│   └── 01-1-intro.txt        # Transcripts don't move with videos
└── assets/
```

**Key decisions:**

- `recording-transcripts/` is a sibling folder to `recordings/`
- Name makes clear these are raw recording transcripts (pre-edit), NOT final video transcripts
- Transcripts do NOT move when videos move to `-safe/`
- Transcript filename matches video filename (different extension)

### Migration: Rename Existing Folders

Some projects already have a `transcripts/` folder that needs renaming:

```bash
# Projects with existing transcripts/ folders:
# - b64-bmad-claude-sdk
# - b71-bmad-poem
# - b73-vibe-code-ecamm-line-opus-4.5
# - b75-vibe-code-whisper-ai-opus-4.5
```

**Server startup migration:**

- On server start, check each known project for `transcripts/` folder
- If found and `recording-transcripts/` doesn't exist, rename it
- Log the migration: "Migrated transcripts/ to recording-transcripts/ in {project}"

---

## Trigger: Automatic on Rename

When a file is successfully renamed and moved to `recordings/`:

1. Check if transcript already exists
2. If not, queue transcription job
3. Start background transcription process

**Why automatic?** Files only get renamed once they're considered valid takes. By that point, transcription is always wanted.

---

## UI Design

### Navigation

Add "Transcriptions" to header navigation:

```
[Incoming] [Recordings] [Transcriptions] [Assets] [Thumbs] [Projects] [Config]
```

### Recordings View - Status Indicators

Show transcription status on each recording row:

```
No transcript:
┌─────────────────────────────────────────────────────────────────────────────┐
│  07-5-outro-endcard.mov    2:34    14.1 MB    Dec 2    [No transcript]      │
└─────────────────────────────────────────────────────────────────────────────┘

Transcription in progress:
┌─────────────────────────────────────────────────────────────────────────────┐
│  07-5-outro-endcard.mov    2:34    14.1 MB    Dec 2    [⏳ Transcribing...] │
└─────────────────────────────────────────────────────────────────────────────┘

Transcription complete:
┌─────────────────────────────────────────────────────────────────────────────┐
│  07-5-outro-endcard.mov    2:34    14.1 MB    Dec 2    [📄] [📁]            │
│                                                         ↑    ↑              │
│                                                      view  open folder      │
└─────────────────────────────────────────────────────────────────────────────┘

Transcription failed:
┌─────────────────────────────────────────────────────────────────────────────┐
│  07-5-outro-endcard.mov    2:34    14.1 MB    Dec 2    [❌ Failed]          │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Click behaviors:**

- `[📄]` - Opens modal with transcript text
- `[📁]` - Opens `recording-transcripts/` folder in Finder
- `[⏳ Transcribing...]` - Navigates to Transcriptions tab

### Transcriptions Tab - Live Log View

A dedicated page showing transcription activity with real-time streaming output:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Transcriptions                                                    [📁]     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ACTIVE TRANSCRIPTION                                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  07-5-outro-endcard.mov                              [⏳ 45% ~2:30]  │    │
│  │                                                                      │    │
│  │  ┌─────────────────────────────────────────────────────────────┐    │    │
│  │  │ So in this video we're going to look at how to set up      │    │    │
│  │  │ the recording namer application. First thing you need      │    │    │
│  │  │ to do is make sure you have Node.js installed on your      │    │    │
│  │  │ computer. You can check this by opening terminal and       │    │    │
│  │  │ typing node --version. If you see a version number,        │    │    │
│  │  │ you're good to go. If not, head over to nodejs.org and     │    │    │
│  │  │ download the latest LTS version...                         │    │    │
│  │  │ █                                                          │    │    │
│  │  └─────────────────────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  QUEUE (2 pending)                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  08-1-intro.mov                                           [Queued]   │    │
│  │  08-2-demo.mov                                            [Queued]   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  RECENT (last 5)                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  06-3-summary.mov                    ✅ Complete    2:34    Dec 2   │    │
│  │  06-2-demo.mov                       ✅ Complete    5:12    Dec 2   │    │
│  │  06-1-intro.mov                      ✅ Complete    1:45    Dec 2   │    │
│  │  05-4-outro.mov                      ❌ Failed      -       Dec 1   │    │
│  │  05-3-scenario.mov                   ✅ Complete    8:23    Dec 1   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Sections:**

1. **Active Transcription** - Currently running job with live streaming text
2. **Queue** - Pending jobs waiting to start
3. **Recent** - Last 5 completed/failed transcriptions

**Live streaming:**

- Whisper outputs text incrementally as it processes
- Server captures stdout and streams via socket
- Frontend displays text appearing in real-time
- Cursor/caret shows where new text will appear

### Transcript View Modal

When clicking `[📄]` on a completed transcript:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  07-5-outro-endcard.txt                                    [📋] [📁] [✕]   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  So in this video we're going to look at how to set up the recording        │
│  namer application.                                                          │
│                                                                              │
│  First thing you need to do is make sure you have Node.js installed on      │
│  your computer. You can check this by opening terminal and typing           │
│  node --version. If you see a version number, you're good to go.            │
│                                                                              │
│  If not, head over to nodejs.org and download the latest LTS version.       │
│  Once that's installed, you'll also need to clone the repository from       │
│  GitHub...                                                                   │
│                                                                              │
│  (scrollable)                                                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Actions:**

- `[📋]` - Copy to clipboard
- `[📁]` - Open transcripts folder in Finder
- `[✕]` - Close modal

---

## Transcription Engine (v1)

Using local Whisper via command line:

```bash
~/.pyenv/versions/3.11.12/bin/python -m whisper "$input" --model medium --language en --output_format txt --output_dir "$output_dir"
```

**Configuration:**

- Python path: `~/.pyenv/versions/3.11.12/bin/python`
- Model: `medium` (balance of speed/quality)
- Language: `en` (English)
- Output format: `txt` (plain text)

**Future (v2):** Remote GROQ-based transcription for speed, SRT format support.

---

## Real-Time Streaming Architecture

### Server Side

```typescript
import { spawn } from 'child_process';

function transcribeVideo(videoPath: string, outputDir: string, io: Server) {
  const jobId = generateJobId();

  const process = spawn(
    '~/.pyenv/versions/3.11.12/bin/python',
    [
      '-m',
      'whisper',
      videoPath,
      '--model',
      'medium',
      '--language',
      'en',
      '--output_format',
      'txt',
      '--output_dir',
      outputDir,
    ],
    { shell: true }
  );

  process.stdout.on('data', (data) => {
    // Whisper outputs progress/text to stdout
    io.emit('transcription:progress', { jobId, text: data.toString() });
  });

  process.stderr.on('data', (data) => {
    // Whisper outputs some info to stderr
    io.emit('transcription:progress', { jobId, text: data.toString() });
  });

  process.on('close', (code) => {
    if (code === 0) {
      io.emit('transcription:complete', { jobId, videoPath });
    } else {
      io.emit('transcription:error', { jobId, videoPath, error: 'Transcription failed' });
    }
  });
}
```

### Socket Events

```typescript
// Server → Client
'transcription:queued': { jobId, videoPath, position }
'transcription:started': { jobId, videoPath }
'transcription:progress': { jobId, text }  // Streaming text chunks
'transcription:complete': { jobId, videoPath, transcriptPath }
'transcription:error': { jobId, videoPath, error }

// Client → Server (optional, for manual control)
'transcription:cancel': { jobId }
```

### Client Side

```typescript
// In Transcriptions page
socket.on('transcription:progress', ({ jobId, text }) => {
  setStreamingText((prev) => prev + text);
});

socket.on('transcription:complete', ({ jobId }) => {
  // Move job from active to recent
  // Show toast notification
});
```

---

## API Design

### GET /api/transcriptions

Get transcription status for all recordings.

**Response:**

```json
{
  "active": {
    "jobId": "abc123",
    "videoPath": "/path/to/07-5-outro-endcard.mov",
    "startedAt": "2025-12-02T10:30:00Z",
    "streamedText": "So in this video..."
  },
  "queue": [{ "jobId": "def456", "videoPath": "/path/to/08-1-intro.mov", "queuedAt": "..." }],
  "recent": [
    { "videoPath": "...", "status": "complete", "completedAt": "...", "duration": 154 },
    { "videoPath": "...", "status": "error", "error": "...", "completedAt": "..." }
  ]
}
```

### GET /api/transcriptions/status/:filename

Get transcription status for a specific recording.

**Response:**

```json
{
  "filename": "07-5-outro-endcard.mov",
  "status": "complete", // "none" | "queued" | "transcribing" | "complete" | "error"
  "transcriptPath": "/path/to/recording-transcripts/07-5-outro-endcard.txt"
}
```

### GET /api/transcriptions/transcript/:filename

Get transcript content.

**Response:**

```json
{
  "filename": "07-5-outro-endcard.txt",
  "content": "So in this video we're going to look at..."
}
```

### POST /api/transcriptions/queue

Manually queue a transcription (for retries or manual trigger).

**Request:**

```json
{
  "videoPath": "/path/to/recording.mov"
}
```

---

## Job Queue Management

Since transcription is resource-intensive:

1. **One job at a time** - Only one transcription runs at a time
2. **Queue pending jobs** - Additional files wait in queue
3. **Process in order** - FIFO queue
4. **Persist queue state** - Queue survives server restart (store in file or memory)

---

## Edge Cases

| Scenario                            | Behavior                                            |
| ----------------------------------- | --------------------------------------------------- |
| Transcript already exists           | Skip transcription, show as complete                |
| Video deleted while transcribing    | Cancel job, remove from queue                       |
| Server restart during transcription | Job is lost, shows as "none" status, user can retry |
| Whisper not installed               | Show error state, toast notification                |
| Corrupt/unreadable video            | Show error state on that file                       |
| Very long video (60+ min)           | Works, just takes longer                            |
| Multiple files renamed quickly      | All queue up, process one at a time                 |

---

## States Summary

| Status       | Icon | Recording Row          | Transcriptions Tab            |
| ------------ | ---- | ---------------------- | ----------------------------- |
| None         | -    | `[No transcript]`      | Not shown                     |
| Queued       | ⏳   | `[⏳ Queued]`          | In Queue section              |
| Transcribing | ⏳   | `[⏳ Transcribing...]` | Active section with live text |
| Complete     | 📄   | `[📄] [📁]`            | In Recent section             |
| Error        | ❌   | `[❌ Failed]`          | In Recent section with error  |

---

## Implementation Notes

### Backend

1. **New route file:** `server/src/routes/transcriptions.ts`
2. **Job queue:** Simple in-memory queue with array
3. **Process spawning:** Use `child_process.spawn` for streaming
4. **Socket integration:** Emit events as transcription progresses

### Frontend

1. **New page:** `client/src/components/TranscriptionsPage.tsx`
2. **Socket hooks:** Listen for transcription events
3. **Transcript modal:** Reusable modal component
4. **Status badges:** Small component for recording rows

### Config Considerations

May need to add to config:

```json
{
  "transcription": {
    "pythonPath": "~/.pyenv/versions/3.11.12/bin/python",
    "model": "medium",
    "language": "en"
  }
}
```

---

## Future Enhancements (v2 - Out of Scope)

1. **GROQ-based remote transcription** - Faster, cloud-based
2. **SRT format** - Subtitles with timestamps
3. **Speaker diarization** - Identify different speakers
4. **Multiple languages** - Auto-detect or configurable
5. **Retry failed jobs** - Manual retry button
6. **Cancel running job** - Stop button

---

## Mockup - Transcriptions Page (Empty State)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Transcriptions                                                    [📁]     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                                                                              │
│                         No transcriptions yet                                │
│                                                                              │
│           Transcriptions start automatically when you                        │
│           rename recordings in the Incoming tab                              │
│                                                                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Mockup - Transcriptions Page (Active)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Transcriptions                                                    [📁]     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ACTIVE                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  📹 07-5-outro-endcard.mov                                          │    │
│  │  Started 45 seconds ago                                              │    │
│  │                                                                      │    │
│  │  ┌─────────────────────────────────────────────────────────────┐    │    │
│  │  │ So in this video we're going to look at how to set up      │    │    │
│  │  │ the recording namer application. First thing you need      │    │    │
│  │  │ to do is make sure you have Node.js installed...█          │    │    │
│  │  └─────────────────────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  QUEUE                                                            2 pending  │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  📹 08-1-intro.mov                                                   │    │
│  │  📹 08-2-demo.mov                                                    │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  COMPLETED TODAY                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  ✅ 06-3-summary.mov                              2:34      10:15am │    │
│  │  ✅ 06-2-demo.mov                                 5:12      10:12am │    │
│  │  ❌ 05-4-outro.mov                                Failed    9:45am  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```
