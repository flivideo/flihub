# FR-131 Phase 2: Implementation Plan

**Status:** Ready for Development
**Created:** 2026-01-04
**Estimated Effort:** 3-5 days
**Blocks:** FR-133, FR-134, FR-135

---

## Overview

FR-131 Phase 1 (completed 2026-01-03) delivered:
- ✅ Panel renamed: Export → Manage
- ✅ Basic bulk rename (selected files only)
- ✅ Server endpoint: `POST /api/manage/bulk-rename`
- ✅ RecordingsView cleanup

**Phase 2 scope:**
- 🎯 **Regeneration Toolbar** - 4 buttons for regen operations
- 🎯 **Chapter-Level Rename** - Dropdown to rename entire chapter
- 🎯 **Shared Code Documentation** - Architecture guide for Recordings/Manage shared code

---

## Technical Approach

### Regeneration Operations

All regen operations follow this pattern:

1. **Regen Shadows** (FAST - ~1ms per file)
   - Delete existing shadow files
   - Call `createShadowFile()` for each recording
   - Uses existing `server/src/utils/shadowFiles.ts`

2. **Regen Transcripts** (SLOW - 5-10 min per file)
   - Queue transcription jobs for recordings
   - Option to force re-transcribe ALL files
   - Uses existing `queueTranscription()` from `server/src/routes/transcriptions.ts`

3. **Regen Chapters** (EXPENSIVE - 30-60s per chapter)
   - Delete existing chapter videos in `recordings/-chapters/`
   - Call `generateChapterRecording()` for each chapter
   - Uses existing `server/src/routes/chapters.ts` and `server/src/utils/chapterRecording.ts`
   - **Real-time progress** via Socket.io

4. **Regen All** (SEQUENTIAL)
   - Run shadows → transcripts → chapters sequentially
   - Show combined progress
   - Stop on first error OR continue with best effort (decision needed)

### Error Handling Strategy

**Decision:** **Best-effort with reporting**

- If shadow file fails: Log error, continue with next file
- If transcript fails: Log error, continue with next file
- If chapter fails: Log error, continue with next chapter
- Return summary: `{ success: true, completed: 50, failed: 3, errors: [...] }`

**Rationale:** User wants to regenerate as much as possible, not abort on first error.

---

## Feature 1: Regeneration Toolbar

### UI Component Design

**Location:** Top of ManagePanel, above bulk rename section

**Structure:**
```tsx
// New component: client/src/components/shared/RegenToolbar.tsx

interface RegenToolbarProps {
  projectCode: string
  onRegenComplete: (type: 'shadows' | 'transcripts' | 'chapters' | 'all') => void
}

export function RegenToolbar({ projectCode, onRegenComplete }: RegenToolbarProps) {
  const [isOpen, setIsOpen] = useState(true) // Collapsible
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [progress, setProgress] = useState<RegenProgress | null>(null)

  return (
    <div className="border rounded-lg mb-4">
      {/* Collapsible header */}
      <button onClick={() => setIsOpen(!isOpen)}>
        <h3>Regeneration Tools</h3>
        {isOpen ? '▼' : '▶'}
      </button>

      {isOpen && (
        <div className="p-4 space-x-2">
          <button onClick={() => handleRegen('shadows')}>↻ Regen Shadows</button>
          <button onClick={() => handleRegen('transcripts')}>↻ Regen Transcripts</button>
          <button onClick={() => handleRegen('chapters')}>↻ Regen Chapters</button>
          <button onClick={() => handleRegen('all')}>↻ Regen All</button>

          {/* Progress indicator */}
          {isRegenerating && <RegenProgress progress={progress} />}
        </div>
      )}
    </div>
  )
}
```

**Confirmation Dialogs:**

```tsx
// For expensive operations (Chapters, All)
function confirmRegenChapters(): boolean {
  return window.confirm(
    `Regenerate all chapter videos?\n\n` +
    `This may take 30-60 seconds per chapter.\n\n` +
    `Existing chapter videos will be deleted and recreated.`
  )
}

function confirmRegenAll(): boolean {
  return window.confirm(
    `Regenerate ALL derivative files?\n\n` +
    `This will:\n` +
    `1. Regenerate shadows (~1 minute)\n` +
    `2. Queue transcriptions (~5-10 min per file)\n` +
    `3. Regenerate chapter videos (~30-60s per chapter)\n\n` +
    `This may take a long time. Continue?`
  )
}
```

**Progress Display:**

```tsx
interface RegenProgress {
  type: 'shadows' | 'transcripts' | 'chapters' | 'all'
  current: number
  total: number
  currentItem?: string // e.g., "Chapter 05: intro"
  status: 'running' | 'complete' | 'error'
}

function RegenProgress({ progress }: { progress: RegenProgress }) {
  const percentage = (progress.current / progress.total) * 100

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-sm text-gray-600">
          {progress.current}/{progress.total}
        </span>
      </div>
      {progress.currentItem && (
        <p className="text-xs text-gray-500 mt-1">{progress.currentItem}</p>
      )}
    </div>
  )
}
```

**localStorage State:**
- Remember collapsed state: `localStorage.getItem('regenToolbarOpen')`
- Default: open (true)

---

### Server Endpoints

**File:** `server/src/routes/manage.ts` (add to existing file)

#### Endpoint 1: Regen Shadows

```typescript
/**
 * POST /api/manage/regen-shadows
 * Regenerate shadow files for all recordings
 */
router.post('/regen-shadows', async (req, res) => {
  try {
    const config = getConfig()
    const paths = getProjectPaths(config.projectDirectory)

    // Get all recordings
    const recordingsDir = paths.recordings
    const files = await fs.readdir(recordingsDir)
    const recordings = files.filter(f => f.endsWith('.mov') || f.endsWith('.mp4'))

    const results = { completed: 0, failed: 0, errors: [] }

    for (const filename of recordings) {
      try {
        const recordingPath = path.join(recordingsDir, filename)

        // Delete existing shadow files (both main and -safe)
        const shadowPath = path.join(paths.shadows, filename.replace(/\.(mov|mp4)$/, '.mp4'))
        const safeShadowPath = path.join(paths.shadows, '-safe', filename.replace(/\.(mov|mp4)$/, '.mp4'))

        await fs.remove(shadowPath)
        await fs.remove(safeShadowPath)

        // Regenerate shadow
        await createShadowFile(recordingPath, paths.shadows, config.shadowResolution || 240)

        results.completed++
        console.log(`[Regen Shadows] Created: ${filename}`)
      } catch (err) {
        results.failed++
        results.errors.push({ file: filename, error: String(err) })
        console.error(`[Regen Shadows] Failed: ${filename}`, err)
      }
    }

    // Emit Socket.io event
    io.emit('shadows:regenerated', { completed: results.completed, failed: results.failed })

    res.json({
      success: true,
      completed: results.completed,
      failed: results.failed,
      total: recordings.length,
      errors: results.errors.length > 0 ? results.errors : undefined
    })
  } catch (err) {
    console.error('[Regen Shadows] Error:', err)
    res.status(500).json({ success: false, error: String(err) })
  }
})
```

#### Endpoint 2: Regen Transcripts

```typescript
/**
 * POST /api/manage/regen-transcripts
 * Queue transcription for recordings missing transcripts
 *
 * Body:
 * {
 *   force?: boolean  // If true, re-transcribe ALL files
 * }
 */
router.post('/regen-transcripts', async (req, res) => {
  try {
    const { force = false } = req.body
    const config = getConfig()
    const paths = getProjectPaths(config.projectDirectory)

    // Get all recordings
    const recordingsDir = paths.recordings
    const files = await fs.readdir(recordingsDir)
    const recordings = files.filter(f => f.endsWith('.mov') || f.endsWith('.mp4'))

    let queued = 0

    for (const filename of recordings) {
      const recordingPath = path.join(recordingsDir, filename)
      const baseName = path.basename(filename, path.extname(filename))
      const transcriptPath = path.join(paths.transcripts, `${baseName}.txt`)

      const hasTranscript = await fs.pathExists(transcriptPath)

      if (force || !hasTranscript) {
        // Use existing queueTranscription function
        queueTranscription(recordingPath)
        queued++
        console.log(`[Regen Transcripts] Queued: ${filename}`)
      }
    }

    res.json({
      success: true,
      queued,
      total: recordings.length,
      force
    })
  } catch (err) {
    console.error('[Regen Transcripts] Error:', err)
    res.status(500).json({ success: false, error: String(err) })
  }
})
```

#### Endpoint 3: Regen Chapters

```typescript
/**
 * POST /api/manage/regen-chapters
 * Regenerate all chapter videos
 *
 * Emits Socket.io events for progress:
 * - regen:chapters:progress { current, total, chapter }
 * - regen:chapters:complete { completed, failed }
 */
router.post('/regen-chapters', async (req, res) => {
  try {
    const config = getConfig()
    const paths = getProjectPaths(config.projectDirectory)

    // Get all recordings grouped by chapter
    const recordingsDir = paths.recordings
    const files = await fs.readdir(recordingsDir)
    const recordings = files.filter(f => f.endsWith('.mov') || f.endsWith('.mp4'))

    // Group by chapter
    const chapters = groupRecordingsByChapter(recordings)
    const chapterKeys = Array.from(chapters.keys()).sort()

    // Start async generation
    regenerateChaptersAsync(chapterKeys, chapters, paths, config, io)

    res.json({
      success: true,
      started: true,
      chapters: chapterKeys.length
    })
  } catch (err) {
    console.error('[Regen Chapters] Error:', err)
    res.status(500).json({ success: false, error: String(err) })
  }
})

/**
 * Async chapter regeneration with progress updates
 */
async function regenerateChaptersAsync(
  chapterKeys: string[],
  chapters: Map<string, RecordingFile[]>,
  paths: ProjectPaths,
  config: Config,
  io: Server
) {
  const results = { completed: 0, failed: 0, errors: [] }

  for (let i = 0; i < chapterKeys.length; i++) {
    const chapterKey = chapterKeys[i]
    const chapterFiles = chapters.get(chapterKey)!

    try {
      // Emit progress
      io.emit('regen:chapters:progress', {
        current: i + 1,
        total: chapterKeys.length,
        chapter: chapterKey
      })

      // Delete existing chapter video
      const chapterVideoPath = path.join(paths.recordings, '-chapters', `${chapterKey}-*.mov`)
      const existing = await glob(chapterVideoPath)
      for (const file of existing) {
        await fs.remove(file)
      }

      // Generate new chapter video
      await generateChapterRecording(chapterKey, chapterFiles, paths, config.chapterRecordings)

      results.completed++
      console.log(`[Regen Chapters] Created: Chapter ${chapterKey}`)
    } catch (err) {
      results.failed++
      results.errors.push({ chapter: chapterKey, error: String(err) })
      console.error(`[Regen Chapters] Failed: Chapter ${chapterKey}`, err)
    }
  }

  // Emit completion
  io.emit('regen:chapters:complete', {
    completed: results.completed,
    failed: results.failed,
    errors: results.errors
  })
}
```

#### Endpoint 4: Regen All

```typescript
/**
 * POST /api/manage/regen-all
 * Regenerate all derivative files (shadows, transcripts, chapters)
 * Runs sequentially with progress updates
 */
router.post('/regen-all', async (req, res) => {
  try {
    // Start async regeneration
    regenerateAllAsync(getConfig, queueTranscription, io)

    res.json({
      success: true,
      started: true
    })
  } catch (err) {
    console.error('[Regen All] Error:', err)
    res.status(500).json({ success: false, error: String(err) })
  }
})

/**
 * Async regeneration of all derivative files
 */
async function regenerateAllAsync(
  getConfig: () => Config,
  queueTranscription: (path: string) => void,
  io: Server
) {
  try {
    io.emit('regen:all:started', {})

    // Step 1: Shadows
    io.emit('regen:all:progress', { step: 'shadows', current: 1, total: 3 })
    const shadowsResult = await regenerateShadowsInternal(getConfig, io)

    // Step 2: Transcripts
    io.emit('regen:all:progress', { step: 'transcripts', current: 2, total: 3 })
    const transcriptsResult = await regenerateTranscriptsInternal(getConfig, queueTranscription)

    // Step 3: Chapters
    io.emit('regen:all:progress', { step: 'chapters', current: 3, total: 3 })
    const chaptersResult = await regenerateChaptersInternal(getConfig, io)

    // Emit completion
    io.emit('regen:all:complete', {
      shadows: shadowsResult,
      transcripts: transcriptsResult,
      chapters: chaptersResult
    })
  } catch (err) {
    console.error('[Regen All] Error:', err)
    io.emit('regen:all:error', { error: String(err) })
  }
}
```

---

### Socket.io Events

**New events to add to `shared/types.ts`:**

```typescript
interface ServerToClientEvents {
  // ... existing events

  // Regen events
  'shadows:regenerated': (data: { completed: number; failed: number }) => void
  'regen:chapters:progress': (data: { current: number; total: number; chapter: string }) => void
  'regen:chapters:complete': (data: { completed: number; failed: number; errors?: any[] }) => void
  'regen:all:started': (data: {}) => void
  'regen:all:progress': (data: { step: string; current: number; total: number }) => void
  'regen:all:complete': (data: { shadows: any; transcripts: any; chapters: any }) => void
  'regen:all:error': (data: { error: string }) => void
}
```

**Client-side hook:**

```typescript
// client/src/hooks/useRegenSocket.ts
export function useRegenSocket(onProgress: (data: any) => void) {
  const { socket } = useSocket()

  useEffect(() => {
    if (!socket) return

    socket.on('regen:chapters:progress', onProgress)
    socket.on('regen:all:progress', onProgress)

    return () => {
      socket.off('regen:chapters:progress', onProgress)
      socket.off('regen:all:progress', onProgress)
    }
  }, [socket, onProgress])
}
```

---

## Feature 2: Chapter-Level Rename

### UI Component Design

**Location:** Inside bulk rename section in ManagePanel

**Structure:**

```tsx
// Add to ManagePanel.tsx bulk rename section

function ChapterRenameSection({ chapters }: { chapters: ChapterGroup[] }) {
  const [selectedChapter, setSelectedChapter] = useState('')
  const [chapterLabel, setChapterLabel] = useState('')

  // When chapter is selected, pre-fill current label
  const handleChapterSelect = (chapterKey: string) => {
    setSelectedChapter(chapterKey)
    const chapter = chapters.find(c => c.chapterKey === chapterKey)
    if (chapter) {
      setChapterLabel(chapter.title)
    }
  }

  const handleChapterRename = async () => {
    const chapter = chapters.find(c => c.chapterKey === selectedChapter)
    if (!chapter) return

    const filenames = chapter.files.map(f => f.filename)

    if (window.confirm(
      `Rename ${filenames.length} files in Chapter ${selectedChapter}?\n\n` +
      `New label: "${chapterLabel}"\n\n` +
      `Transcripts will be regenerated (5-10 minutes).`
    )) {
      // Reuse bulk rename endpoint
      await handleBulkRename(filenames, chapterLabel)
    }
  }

  return (
    <div className="mt-4 p-4 border-t">
      <h4 className="text-sm font-medium mb-2">Or rename by chapter:</h4>
      <div className="flex items-center gap-2">
        <select
          value={selectedChapter}
          onChange={(e) => handleChapterSelect(e.target.value)}
          className="border rounded px-2 py-1"
        >
          <option value="">Select chapter...</option>
          {chapters.map(ch => (
            <option key={ch.chapterKey} value={ch.chapterKey}>
              Chapter {ch.chapterKey} ({ch.files.length} files)
            </option>
          ))}
        </select>

        <input
          type="text"
          value={chapterLabel}
          onChange={(e) => setChapterLabel(e.target.value)}
          placeholder="New label"
          className="flex-1 border rounded px-2 py-1"
          disabled={!selectedChapter}
        />

        <button
          onClick={handleChapterRename}
          disabled={!selectedChapter || !chapterLabel.trim()}
          className="px-4 py-1 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          Rename Ch {selectedChapter}
        </button>
      </div>
    </div>
  )
}
```

**Integration:**
- Reuses existing `POST /api/manage/bulk-rename` endpoint
- Just passes all chapter files instead of selected files
- Same confirmation dialog, same FR-130 delete+regenerate logic

---

## Feature 3: Shared Code Documentation

### File: `docs/architecture/shared-code-index.md`

**Purpose:** Document what code is shared between Recordings and Manage panels to prevent duplication.

**Template:**

```markdown
# Shared Code Index

**Last Updated:** 2026-01-04
**Purpose:** Document shared code between RecordingsView and ManagePanel to prevent duplication.

---

## Decision Rules

**When to create shared code:**
- Code is used by 2+ feature areas
- Logic is domain-agnostic (not Recordings-specific or Manage-specific)
- Reduces duplication

**When to keep code separate:**
- Code is feature-specific
- Only one feature needs it (now and foreseeable future)
- Sharing would create tight coupling

**Migration path:**
- Start in feature folder
- Move to shared/ when second feature needs it
- Update imports, test, commit

---

## Client-Side Shared Code

### Hooks

| Hook | Location | Used By | Purpose |
|------|----------|---------|---------|
| `useRecordings` | `hooks/useApi.ts` | RecordingsView, ManagePanel, WatchPage | Fetch recordings from API with React Query |
| `useConfig` | `hooks/useApi.ts` | All panels | Get server config (project path, tags, etc.) |
| `useRecordingsSocket` | `hooks/useSocket.ts` | RecordingsView, ManagePanel | Real-time file updates via Socket.io |

### Components

| Component | Location | Used By | Purpose |
|-----------|----------|---------|---------|
| `LoadingSpinner` | `components/shared/LoadingSpinner.tsx` | All panels | Consistent loading state |
| `ErrorMessage` | `components/shared/ErrorMessage.tsx` | All panels | Error display component |
| `OpenFolderButton` | `components/shared/OpenFolderButton.tsx` | RecordingsView, ManagePanel | Open folder in Finder |
| `PageContainer` | `components/shared/PageContainer.tsx` | All pages | Layout wrapper |
| `PageHeader` | `components/shared/PageHeader.tsx` | All pages | Consistent page headers |

### Utilities

| Utility | Location | Used By | Purpose |
|---------|----------|---------|---------|
| `formatFileSize` | `utils/formatting.ts` | RecordingsView, ManagePanel, ProjectsPage | Size formatting (B/KB/MB/GB) |
| `formatChapterTitle` | `utils/formatting.ts` | RecordingsView, ManagePanel | Format chapter display name |
| `groupByChapter` | `ManagePanel.tsx` | ManagePanel | Group recordings by chapter number |
| `extractTagsFromName` | `shared/naming.ts` | RecordingsView, ManagePanel | Parse tags from filename |

**NOTE:** `groupByChapter` function is currently duplicated in ManagePanel. Consider extracting to `utils/shared/grouping.ts` if RecordingsView needs it.

---

## Server-Side Shared Code

### Routes

| Endpoint | Location | Used By | Purpose |
|----------|----------|---------|---------|
| `GET /api/recordings` | `routes/index.ts` | RecordingsView, ManagePanel | Get recordings for viewing |
| `POST /api/manage/bulk-rename` | `routes/manage.ts` | ManagePanel | Bulk rename operation |
| `POST /api/recordings/rename-chapter` | `routes/index.ts` | ~~RecordingsView~~ (removed) | Legacy rename endpoint |

### Utilities

| Utility | Location | Used By | Purpose |
|---------|----------|---------|---------|
| `renameRecording` | `utils/renameRecording.ts` | ManagePanel, Index routes | FR-130 delete+regenerate rename logic |
| `getProjectPaths` | `shared/paths.ts` | All routes | Resolve project folder paths |
| `expandPath` | `utils/pathUtils.ts` | All routes | Expand ~ to home directory |
| `createShadowFile` | `utils/shadowFiles.ts` | Regen endpoints, Watcher | Create 240p shadow video |
| `queueTranscription` | `routes/transcriptions.ts` | Regen endpoints, Watcher | Queue Whisper transcription |
| `generateChapterRecording` | `utils/chapterRecording.ts` | Regen endpoints, Chapters route | Generate chapter video |

---

## Code Examples

### Importing Shared Code

```typescript
// ✅ Good: Import from shared location
import { LoadingSpinner, ErrorMessage } from '../components/shared'
import { formatFileSize, formatChapterTitle } from '../utils/formatting'
import { useRecordings, useConfig } from '../hooks/useApi'

// ❌ Bad: Don't import from feature-specific locations
import { LoadingSpinner } from '../components/RecordingsView/LoadingSpinner'
```

### JSDoc Comments for Shared Code

```typescript
/**
 * Format file size in human-readable format
 *
 * @location utils/formatting.ts (SHARED)
 * @usedBy RecordingsView, ManagePanel, ProjectsPage
 * @param bytes - File size in bytes
 * @returns Formatted string like "2.3 MB"
 *
 * @example
 * formatFileSize(1024) // "1.0 KB"
 * formatFileSize(2500000) // "2.4 MB"
 */
export function formatFileSize(bytes: number): string {
  // ...
}
```

---

## Future Refactoring

**Potential shared code to extract:**

1. **`groupByChapter` function**
   - Currently: Duplicated in ManagePanel.tsx
   - Move to: `client/src/utils/shared/grouping.ts`
   - When: If RecordingsView needs chapter grouping

2. **File filtering logic (park/safe)**
   - Currently: Inline in RecordingsView
   - Move to: `client/src/utils/shared/filtering.ts`
   - When: If ManagePanel needs park/safe filtering

3. **Recording state management**
   - Currently: `.flihub-state.json` read/write scattered
   - Move to: `server/src/utils/shared/projectState.ts`
   - When: Multiple features need state manipulation

---

**Maintenance:** Update this document when:
- New shared code is created
- Code is moved from feature to shared location
- New feature (e.g., WatchPage) uses existing shared code
```

---

## Task Breakdown

### Phase 2.1: Regeneration Toolbar Backend (Day 1-2)

**Estimated effort:** 1.5-2 days

**Tasks:**

1. **Create regen endpoint helpers** (4 hours)
   - [ ] Extract shadow regeneration logic from endpoint
   - [ ] Extract transcript queuing logic
   - [ ] Extract chapter regeneration logic
   - [ ] Create `regenerateAllAsync()` orchestrator
   - **Files:** `server/src/routes/manage.ts`

2. **Implement 4 regen endpoints** (4 hours)
   - [ ] `POST /api/manage/regen-shadows`
   - [ ] `POST /api/manage/regen-transcripts`
   - [ ] `POST /api/manage/regen-chapters`
   - [ ] `POST /api/manage/regen-all`
   - **Files:** `server/src/routes/manage.ts`

3. **Add Socket.io events** (2 hours)
   - [ ] Add event types to `shared/types.ts`
   - [ ] Emit progress events during regen operations
   - [ ] Test Socket.io integration
   - **Files:** `shared/types.ts`, `server/src/routes/manage.ts`

4. **Testing** (2 hours)
   - [ ] Test regen-shadows endpoint (fast)
   - [ ] Test regen-transcripts endpoint (queues jobs)
   - [ ] Test regen-chapters endpoint (slow, real-time updates)
   - [ ] Test regen-all sequential execution
   - [ ] Test error handling (missing ffmpeg, file not found, etc.)

**Acceptance Criteria:**
- All 4 endpoints return correct JSON responses
- Socket.io events emitted for progress
- Error handling: best-effort with error reporting
- Logs show regeneration activity

---

### Phase 2.2: Regeneration Toolbar Frontend (Day 2-3)

**Estimated effort:** 1-1.5 days

**Tasks:**

1. **Create RegenToolbar component** (3 hours)
   - [ ] Build collapsible toolbar UI
   - [ ] Add 4 regen buttons
   - [ ] Add confirmation dialogs for expensive ops
   - [ ] Add progress display component
   - [ ] localStorage for collapsed state
   - **Files:** `client/src/components/shared/RegenToolbar.tsx`

2. **Create useRegen hook** (2 hours)
   - [ ] API calls for 4 regen endpoints
   - [ ] Socket.io progress listener
   - [ ] State management (isRegenerating, progress)
   - **Files:** `client/src/hooks/useRegen.ts`

3. **Integrate into ManagePanel** (1 hour)
   - [ ] Import RegenToolbar
   - [ ] Place above bulk rename section
   - [ ] Wire up callbacks
   - **Files:** `client/src/components/ManagePanel.tsx`

4. **Testing** (2 hours)
   - [ ] Test regen buttons trigger correct endpoints
   - [ ] Test confirmation dialogs
   - [ ] Test progress updates (Socket.io)
   - [ ] Test toast notifications on completion
   - [ ] Test collapsed state persistence

**Acceptance Criteria:**
- Toolbar appears at top of Manage panel
- Buttons trigger regen operations
- Confirmation dialogs work
- Progress updates show in real-time
- Toast notifications on success/error
- Collapsed state persists across page reloads

---

### Phase 2.3: Chapter-Level Rename (Day 3)

**Estimated effort:** 0.5 days (4 hours)

**Tasks:**

1. **Build ChapterRenameSection component** (2 hours)
   - [ ] Chapter dropdown (populated from existing chapters)
   - [ ] Label input (pre-fills current label)
   - [ ] "Rename Ch XX" button
   - [ ] Confirmation dialog
   - **Files:** `client/src/components/ManagePanel.tsx`

2. **Wire up to bulk rename logic** (1 hour)
   - [ ] Reuse `handleBulkRename()` function
   - [ ] Pass all chapter files instead of selected files
   - [ ] Same FR-130 delete+regenerate flow
   - **Files:** `client/src/components/ManagePanel.tsx`

3. **Testing** (1 hour)
   - [ ] Select chapter, enter label, rename
   - [ ] Verify all chapter files renamed
   - [ ] Verify transcriptions queued
   - [ ] Verify state preserved (parked, annotations)
   - [ ] Test error handling (transcription in progress)

**Acceptance Criteria:**
- Dropdown shows all chapters with file counts
- Label input pre-fills current chapter name
- Rename button triggers bulk rename for entire chapter
- Confirmation dialog shows file count
- Uses existing bulk rename endpoint (no new backend code needed)

---

### Phase 2.4: Shared Code Documentation (Day 4)

**Estimated effort:** 0.5 days (4 hours)

**Tasks:**

1. **Create shared-code-index.md** (2 hours)
   - [ ] Use template above
   - [ ] Document existing shared hooks
   - [ ] Document existing shared components
   - [ ] Document existing shared utilities
   - [ ] Add JSDoc examples
   - **Files:** `docs/architecture/shared-code-index.md`

2. **Add JSDoc comments to shared code** (1.5 hours)
   - [ ] Add `@location` and `@usedBy` tags to:
     - `utils/formatting.ts`
     - `components/shared/*`
     - `hooks/useApi.ts` (shared hooks)
   - **Files:** Various shared code files

3. **Identify future refactoring opportunities** (0.5 hours)
   - [ ] Document `groupByChapter` duplication
   - [ ] Document file filtering logic
   - [ ] Add to "Future Refactoring" section
   - **Files:** `docs/architecture/shared-code-index.md`

**Acceptance Criteria:**
- Documentation file created with all sections
- Existing shared code documented
- JSDoc comments added to key shared functions
- Future refactoring opportunities identified

---

### Phase 2.5: Testing & Polish (Day 4-5)

**Estimated effort:** 0.5-1 day

**Tasks:**

1. **Integration testing** (2 hours)
   - [ ] Full workflow: select files → bulk rename → regen transcripts
   - [ ] Full workflow: chapter rename → verify derivatives regenerated
   - [ ] Full workflow: regen all → verify all derivatives regenerated
   - [ ] Test Socket.io real-time updates

2. **Error handling polish** (1 hour)
   - [ ] Test regen failures (missing ffmpeg, permissions)
   - [ ] Test network errors
   - [ ] Verify error messages are clear
   - [ ] Verify best-effort behavior (continue on error)

3. **UI/UX polish** (1 hour)
   - [ ] Verify button states (disabled while renaming/regenerating)
   - [ ] Verify loading spinners
   - [ ] Verify toast notification text
   - [ ] Verify confirmation dialog wording

4. **Documentation updates** (1 hour)
   - [ ] Update `docs/changelog.md` with FR-131 Phase 2 completion
   - [ ] Update `docs/backlog.md` status: "With Developer" → "✓ Implemented"
   - [ ] Update `docs/prd/fr-131-manage-panel-bulk-rename.md` completion notes

**Acceptance Criteria:**
- All acceptance criteria from PRD met
- No TypeScript errors
- No console warnings
- Error handling graceful
- Documentation updated

---

## Files to Create/Modify

### New Files (3)

1. **`client/src/components/shared/RegenToolbar.tsx`** (~200 lines)
   - Regeneration toolbar component
   - 4 buttons, confirmation dialogs, progress display

2. **`client/src/hooks/useRegen.ts`** (~100 lines)
   - API calls for regen endpoints
   - Socket.io progress listening

3. **`docs/architecture/shared-code-index.md`** (~300 lines)
   - Shared code documentation
   - Decision rules, examples, JSDoc patterns

### Modified Files (5)

1. **`server/src/routes/manage.ts`** (+300 lines)
   - Add 4 regen endpoints
   - Add helper functions
   - Socket.io events

2. **`client/src/components/ManagePanel.tsx`** (+150 lines)
   - Import RegenToolbar
   - Add ChapterRenameSection
   - Wire up callbacks

3. **`shared/types.ts`** (+10 lines)
   - Add Socket.io event types for regen

4. **`docs/changelog.md`** (+50 lines)
   - FR-131 Phase 2 completion entry

5. **`docs/backlog.md`** (1 line)
   - Update FR-131 status: "✓ Implemented"

**Total LOC estimate:** ~800-900 lines

---

## Technical Decisions

### Decision 1: Error Handling Strategy

**Options:**
- A) Abort on first error (atomic)
- B) Best-effort (continue on error, report at end)

**Chosen:** **B) Best-effort**

**Rationale:** User wants to regenerate as many files as possible. If one shadow fails, continue with others. Report all errors at the end.

**Implementation:**
```typescript
const results = { completed: 0, failed: 0, errors: [] }
for (const file of files) {
  try {
    await regenerate(file)
    results.completed++
  } catch (err) {
    results.failed++
    results.errors.push({ file, error: String(err) })
  }
}
return results
```

---

### Decision 2: Regen All Execution Order

**Options:**
- A) Parallel (all three at once)
- B) Sequential (shadows → transcripts → chapters)

**Chosen:** **B) Sequential**

**Rationale:**
- Shadows are fast (~1 min total)
- Transcripts are slow but just queued (no immediate CPU load)
- Chapters are expensive (30-60s each)
- Running chapters while shadows regenerate could cause CPU contention
- Sequential is clearer for progress reporting

**Implementation:**
```typescript
async function regenerateAllAsync() {
  await regenerateShadows()
  await queueTranscriptions()
  await regenerateChapters() // Waits for chapters to complete
}
```

---

### Decision 3: Chapter Rename Endpoint

**Options:**
- A) Create new endpoint: `POST /api/manage/rename-chapter`
- B) Reuse existing: `POST /api/manage/bulk-rename`

**Chosen:** **B) Reuse existing**

**Rationale:**
- Chapter rename is just bulk rename with all chapter files
- No new server logic needed
- Frontend just collects chapter files and calls bulk-rename
- Reduces code duplication

**Implementation:**
```tsx
function handleChapterRename(chapterKey: string, newLabel: string) {
  const chapter = chapters.find(c => c.chapterKey === chapterKey)
  const filenames = chapter.files.map(f => f.filename)

  // Reuse bulk rename
  handleBulkRename(filenames, newLabel)
}
```

---

### Decision 4: Progress Granularity

**Options:**
- A) File-level progress (emit every file)
- B) Batch progress (emit every 10 files)
- C) Chapter-level progress (emit per chapter)

**Chosen:**
- **Shadows:** B) Batch progress (every 10 files)
- **Transcripts:** No progress (just queue count)
- **Chapters:** C) Chapter-level progress

**Rationale:**
- Shadows are fast, too many events if per-file
- Transcripts are queued, actual progress tracked in Transcriptions tab
- Chapters are slow enough that per-chapter makes sense

---

## Dependencies

**Required before Phase 2:**
- ✅ FR-130 (delete+regenerate pattern) - Implemented
- ✅ FR-131 Phase 1 (Manage panel, bulk rename) - Implemented
- ✅ Existing shadow/transcript/chapter utilities - Exist

**No new dependencies needed.** Phase 2 reuses existing systems.

---

## Success Metrics

**Phase 2 complete when:**
- [ ] 4 regen buttons working in Manage panel
- [ ] Real-time progress updates for chapter regen
- [ ] Chapter-level rename dropdown working
- [ ] Shared code documentation complete
- [ ] All acceptance criteria met (42 total from PRD)
- [ ] Changelog updated with completion entry
- [ ] Backlog status updated to "✓ Implemented"

**Ready to unblock:**
- FR-133 (File Status Indicators)
- FR-134 (Inconsistency Detection)
- FR-135 (Chapter Tools)

---

## Handoff to Developer

**Read this plan, then:**

1. ✅ **Read PRD:** `docs/prd/fr-131-manage-panel-bulk-rename.md`
2. ✅ **Review Phase 1:** Understand what's already implemented
3. ✅ **Start with Phase 2.1:** Backend endpoints (easiest to test standalone)
4. ✅ **Then Phase 2.2:** Frontend toolbar (visible progress)
5. ✅ **Then Phase 2.3:** Chapter rename (reuses bulk rename)
6. ✅ **Then Phase 2.4:** Documentation (can be done in parallel)
7. ✅ **Finally Phase 2.5:** Testing and polish

**Questions?** Check:
- `docs/prd/fr-131-manage-panel-bulk-rename.md` - Full requirements
- `server/src/utils/shadowFiles.ts` - Shadow regeneration examples
- `server/src/routes/transcriptions.ts` - Transcript queue examples
- `server/src/routes/chapters.ts` - Chapter generation examples

**Estimated Timeline:** 3-5 days (6-8 hours per day)

**Critical Success Factor:** Real-time progress updates via Socket.io for user feedback during long operations.

---

**Ready for development?** ✅ Yes - All decisions made, approach documented, tasks broken down.
