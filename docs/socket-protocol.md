# FliHub Socket.io Protocol

Complete reference for real-time WebSocket communication.

## Overview

FliHub uses Socket.io for real-time updates between the Express server and React client. The connection is configured with:

- **Transports:** WebSocket (primary), polling (fallback)
- **CORS:** Enabled for local development
- **Typing:** Full TypeScript support via `shared/types.ts`

## Connection

### Client Connection

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:5101', {
  transports: ['websocket', 'polling']
});
```

### Connection Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `connect` | Built-in | Connection established |
| `disconnect` | Built-in | Connection lost |
| `reconnect_attempt` | Built-in | Attempting to reconnect |

---

## Server-to-Client Events

Events emitted by the server to update the client UI.

### File Events

#### `file:new`

New file detected in watch directory (Ecamm Live).

```typescript
interface FileNewPayload {
  path: string;       // Full path to file
  filename: string;   // Filename only
  timestamp: string;  // ISO timestamp
  size: number;       // File size in bytes
  duration?: number;  // Video duration in seconds
}
```

**Trigger:** Chokidar detects new `.mov` file in watch directory

**Client Action:** Add to pending files list, show toast notification

#### `file:deleted`

File removed from disk.

```typescript
interface FileDeletedPayload {
  path: string;  // Full path to deleted file
}
```

**Trigger:** File deleted from watch directory or discarded

**Client Action:** Remove from pending list, show toast

#### `file:renamed`

File successfully renamed.

```typescript
interface FileRenamedPayload {
  oldPath: string;  // Original path
  newPath: string;  // New path after rename
}
```

**Trigger:** Successful rename via `/api/rename`

**Client Action:** Remove from pending, show success toast

#### `file:error`

Error with file operation.

```typescript
interface FileErrorPayload {
  path: string;   // File path
  error: string;  // Error description
}
```

---

### Recording Events

#### `recordings:changed`

Change detected in recordings folder.

```typescript
// No payload - signals need to refetch
```

**Trigger:** File added, deleted, or modified in:
- `recordings/`
- `recordings/-safe/`
- `recording-shadows/`
- `recording-shadows/-safe/`

**Debounce:** 200ms

**Client Action:** Invalidate React Query cache for `QUERY_KEYS.recordings`

---

### Asset Events

#### `assets:incoming-changed`

Change in image source directory.

```typescript
// No payload
```

**Trigger:** Image added/removed from `~/Downloads/*.{png,jpg,jpeg,webp}`

**Debounce:** 200ms

**Client Action:** Invalidate cache for `QUERY_KEYS.incomingImages`

#### `assets:assigned-changed`

Change in assigned images.

```typescript
// No payload
```

**Trigger:** Image assigned, deleted, or modified in `assets/images/`

**Debounce:** 200ms

**Client Action:** Invalidate cache for `QUERY_KEYS.projectImages`

---

### Thumbnail Events

#### `thumbs:changed`

Change in thumbnails folder.

```typescript
// No payload
```

**Trigger:** Thumbnail imported, deleted, or reordered in `assets/thumbs/`

**Debounce:** 300ms

**Client Action:** Invalidate cache for `QUERY_KEYS.thumbs`

#### `thumbs:zip-added`

ZIP file detected in Downloads.

```typescript
// No payload
```

**Trigger:** New `.zip` file in `~/Downloads/`

**Debounce:** 200ms

**Client Action:** Invalidate cache for `QUERY_KEYS.thumbZips`

---

### Project Events

#### `projects:changed`

Project folder created or deleted.

```typescript
// No payload
```

**Trigger:** Folder added/removed in projects root directory

**Debounce:** 500ms

**Client Action:** Invalidate cache for `QUERY_KEYS.projects`

---

### Inbox Events

#### `inbox:changed`

Change in inbox staging directory.

```typescript
// No payload
```

**Trigger:** File added/removed in `inbox/` or subfolders

**Debounce:** 300ms

**Client Action:** Invalidate cache for `QUERY_KEYS.inbox(projectCode)`

---

### Transcript Events

#### `transcripts:changed`

Change in transcripts folder.

```typescript
// No payload
```

**Trigger:** Transcript added, removed, or modified in `recording-transcripts/`

**Debounce:** 300ms

**Client Action:** Invalidate multiple caches:
- `QUERY_KEYS.recordings` (updates `hasTranscript` flag)
- `QUERY_KEYS.projects` (updates transcript %)
- `QUERY_KEYS.transcriptions`

---

### Transcription Events

Progress events during Whisper transcription.

#### `transcription:queued`

Video queued for transcription.

```typescript
interface TranscriptionQueuedPayload {
  jobId: string;      // Unique job ID (job_{timestamp}_{random})
  videoPath: string;  // Path to video file
  position: number;   // Queue position (1-based)
}
```

#### `transcription:started`

Transcription process started.

```typescript
interface TranscriptionStartedPayload {
  jobId: string;
  videoPath: string;
}
```

#### `transcription:progress`

Progress update from Whisper.

```typescript
interface TranscriptionProgressPayload {
  jobId: string;
  text: string;  // Progress text from stdout/stderr
}
```

#### `transcription:complete`

Transcription finished successfully.

```typescript
interface TranscriptionCompletePayload {
  jobId: string;
  videoPath: string;
  transcriptPath: string;  // Path to generated .txt file
}
```

#### `transcription:error`

Transcription failed.

```typescript
interface TranscriptionErrorPayload {
  jobId: string;
  videoPath: string;
  error: string;  // Error description
}
```

---

### Chapter Recording Events

Progress events during chapter video generation.

#### `chapters:generating`

Starting to generate a chapter.

```typescript
interface ChaptersGeneratingPayload {
  chapter: string;  // Chapter number (e.g., "01")
  total: number;    // Total chapters to generate
  current: number;  // Current chapter (1-based)
}
```

#### `chapters:generated`

Single chapter generated successfully.

```typescript
interface ChaptersGeneratedPayload {
  chapter: string;
  outputFile: string;   // Generated video filename
  srtFile?: string;     // Optional SRT subtitle file
}
```

#### `chapters:complete`

All chapters processed.

```typescript
interface ChaptersCompletePayload {
  generated: string[];  // Successfully generated filenames
  errors?: string[];    // Error messages (if any)
}
```

**Client Action:**
- Invalidate cache for `QUERY_KEYS.chapterRecordingStatus`
- Show success/error toast

---

## Client-to-Server Events

Currently no client-to-server Socket.io events are used. All client-to-server communication uses HTTP REST API calls.

```typescript
export interface ClientToServerEvents {
  // No events defined
}
```

---

## Client Hooks

React hooks for subscribing to socket events.

### useSocket()

Base socket connection hook.

```typescript
const { socket, connected, isReconnecting } = useSocket();
```

### useRecordingsSocket()

Subscribe to recording changes.

```typescript
useRecordingsSocket();
// Automatically invalidates QUERY_KEYS.recordings on 'recordings:changed'
```

### useAssetsSocket()

Subscribe to asset changes.

```typescript
useAssetsSocket();
// Handles 'assets:incoming-changed' and 'assets:assigned-changed'
```

### useThumbsSocket()

Subscribe to thumbnail changes.

```typescript
useThumbsSocket();
// Handles 'thumbs:changed' and 'thumbs:zip-added'
```

### useProjectsSocket()

Subscribe to project list changes.

```typescript
useProjectsSocket();
// Handles 'projects:changed'
```

### useInboxSocket(projectCode)

Subscribe to inbox changes.

```typescript
useInboxSocket(projectCode);
// Handles 'inbox:changed'
// Requires projectCode parameter
```

### useTranscriptsSocket()

Subscribe to transcript changes.

```typescript
useTranscriptsSocket();
// Handles 'transcripts:changed'
// Invalidates recordings, projects, and transcriptions caches
```

### useChapterRecordingSocket()

Subscribe to chapter generation completion.

```typescript
useChapterRecordingSocket();
// Handles 'chapters:complete'
```

---

## WatcherManager

Server-side file watcher management using Chokidar.

### Watchers

| Watcher | Pattern | Events | Debounce |
|---------|---------|--------|----------|
| ZIP | `~/Downloads/*.zip` | add | 200ms |
| Incoming Images | `imageSourceDirectory/*.{png,jpg,...}` | add, unlink | 200ms |
| Assigned Images | `assets/images/` | add, unlink, change | 200ms |
| Recordings | `recordings/`, `-safe/`, `recording-shadows/` | add, unlink, change | 200ms |
| Projects | Parent directory | addDir, unlinkDir | 500ms |
| Inbox | `inbox/` + 2 levels | add, unlink, addDir, unlinkDir | 300ms |
| Transcripts | `recording-transcripts/` | add, unlink, change | 300ms |
| Thumbs | `assets/thumbs/` | add, unlink, change | 300ms |

### Lifecycle

```typescript
// Initialize all watchers
watcherManager.initAll(config);

// Update on config change
watcherManager.updateFromConfig(oldConfig, newConfig);

// Clean shutdown
watcherManager.closeAll();
```

---

## Real-Time Update Flow

### Example: Recording Renamed

```
1. User submits rename via UI
2. POST /api/rename called
3. Server renames file on disk
4. Chokidar detects change in recordings/
5. WatcherManager debounces (200ms)
6. Server emits 'recordings:changed'
7. Client's useRecordingsSocket() receives event
8. React Query cache invalidated
9. Component refetches and re-renders
```

### Example: Image Assigned

```
1. User assigns image via UI
2. POST /api/assets/assign called
3. Server moves image to assets/images/
4. Chokidar detects add in assets/images/
5. WatcherManager emits 'assets:assigned-changed'
6. Client's useAssetsSocket() receives event
7. React Query cache invalidated
8. AssetsPage refetches and updates
```

---

## Connection Handling

### Reconnection

Socket.io automatically reconnects with exponential backoff:

1. Connection lost
2. `disconnect` event fired
3. Client sets `connected = false`
4. Socket.io attempts reconnection
5. `reconnect_attempt` event fired
6. Client sets `isReconnecting = true`
7. On success: `connect` event, `connected = true`

### Connection Indicator

The `ConnectionIndicator` component shows connection status:
- Green: Connected
- Yellow: Reconnecting
- Red: Disconnected

### Transport Fallback

If WebSocket fails, Socket.io falls back to HTTP long-polling automatically.

---

## TypeScript Interfaces

From `shared/types.ts`:

```typescript
export interface ServerToClientEvents {
  'file:new': (file: FileInfo) => void;
  'file:deleted': (data: { path: string }) => void;
  'file:renamed': (data: { oldPath: string; newPath: string }) => void;
  'file:error': (data: { path: string; error: string }) => void;
  'recordings:changed': () => void;
  'assets:incoming-changed': () => void;
  'assets:assigned-changed': () => void;
  'thumbs:changed': () => void;
  'thumbs:zip-added': () => void;
  'projects:changed': () => void;
  'inbox:changed': () => void;
  'transcripts:changed': () => void;
  'transcription:queued': (data: TranscriptionQueuedPayload) => void;
  'transcription:started': (data: TranscriptionStartedPayload) => void;
  'transcription:progress': (data: TranscriptionProgressPayload) => void;
  'transcription:complete': (data: TranscriptionCompletePayload) => void;
  'transcription:error': (data: TranscriptionErrorPayload) => void;
  'chapters:generating': (data: ChaptersGeneratingPayload) => void;
  'chapters:generated': (data: ChaptersGeneratedPayload) => void;
  'chapters:complete': (data: ChaptersCompletePayload) => void;
}

export interface ClientToServerEvents {
  // No client-to-server events
}
```

---

## Debugging

### Browser DevTools

1. Open Network tab
2. Filter by "WS" for WebSocket
3. Click on Socket.io connection
4. View Messages tab for event traffic

### Server Logs

Socket events are logged to console during development:

```
[Socket.io] Client connected: abc123
[Watcher] recordings:changed emitted
[Socket.io] Client disconnected: abc123
```

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Events not received | CORS blocking | Check server CORS config |
| Stale data | Cache not invalidating | Verify hook is mounted |
| Too many refetches | Missing debounce | Check WatcherManager debounce |
| Reconnection loop | Server down | Check server is running |
