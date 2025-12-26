# FR-111: Safe Architecture Rework

**Type:** Bug Fix + Architecture Enhancement
**Priority:** High
**Added:** 2025-12-26

---

## Overview

Two related issues:

1. **Immediate Bug:** Watch page segments not populating for chapters 09-10 after moving other files to safe
2. **Architecture:** Replace physical file move (-safe folder) with stateful flag system

---

## Part 1: Watch Page Segment Bug

### Symptoms
- User moved files from chapters 01-08 to `-safe` folder
- Chapters 09-10 (NOT in safe) appear in Watch chapter list
- But hovering chapters 09-10 doesn't show segments in the segment panel

### Investigation Needed
1. Check if React Query cache is stale (socket event might not have fired)
2. Check if `hoveredChapter.files` is empty when it shouldn't be
3. Add debug logging to trace data flow

### Debug Steps
```typescript
// In WatchPage.tsx, add temporary logging:
console.log('chapters:', chapters.map(c => ({ key: c.chapterKey, fileCount: c.files.length })))
console.log('hoveredChapter:', hoveredChapter?.chapterKey, hoveredChapter?.files.length)
```

### Possible Fix
If cache issue:
- Force refetch on page load
- Add manual refresh button to Watch page

If data issue:
- Trace `groupByChapterWithTiming()` logic
- Check if filter at line 90 is too aggressive

---

## Part 2: Stateful Safe Architecture

### Current Problem

When files are physically moved to `recordings/-safe/`:
- **Transcripts appear orphaned** - `01-1-intro.txt` exists but `01-1-intro.mov` is "missing"
- **Shadows become disconnected** - Shadow file exists for a "missing" recording
- **Chapter videos become stale** - Combined video references files that moved
- **Relationships break** - Filename-based matching fails across folders

### Current Architecture
```
recordings/
  09-1-demo.mov          ← visible (active)
recordings/-safe/
  01-1-intro.mov         ← hidden (safe)
recording-transcripts/
  01-1-intro.txt         ← appears ORPHANED (no matching recording in recordings/)
  09-1-demo.txt          ← appears matched
recording-shadows/
  01-1-intro.mp4         ← shadow for "missing" file
```

### Proposed: Per-Project State File

Replace physical move with stateful flags. Files stay in `recordings/`, state file tracks status.

```
recordings/
  01-1-intro.mov         ← stays here, flagged as safe
  09-1-demo.mov          ← active
recording-transcripts/
  01-1-intro.txt         ← now correctly matched!
  09-1-demo.txt          ← matched
recording-shadows/
  01-1-intro.mp4         ← correctly linked
.flihub-state.json       ← NEW: per-project state
```

### State File Format

```json
{
  "version": 1,
  "recordings": {
    "01-1-intro.mov": {
      "safe": true,
      "stage": "first-edit"
    },
    "09-1-demo.mov": {
      "stage": "recording"
    }
  }
}
```

### Benefits

1. **Relationships preserved** - Files don't move, filename matching always works
2. **Transcripts never orphaned** - Recording stays in place
3. **Chapter videos stay valid** - Source files don't change location
4. **Reversible instantly** - Toggle flag vs move files
5. **Extensible** - Can add more per-recording states:
   - `safe: boolean` - hide from active view
   - `stage: string` - recording, first-edit, review, etc.
   - `archived: boolean` - permanent archive
   - `priority: number` - for ordering
   - `notes: string` - per-file notes

### Migration Path

1. Read existing `-safe` folder
2. For each file in `-safe`:
   - Move back to `recordings/`
   - Add entry to `.flihub-state.json` with `safe: true`
3. Delete empty `-safe` folder

### Implementation Changes

| Area | Current | New |
|------|---------|-----|
| **Safe command** | `mv file recordings/-safe/` | Toggle flag in state file |
| **Restore command** | `mv file recordings/` | Toggle flag off |
| **Recordings list** | Scan both folders | Scan one folder + filter by state |
| **Watch page** | `filter(r => r.folder !== 'safe')` | `filter(r => !state[r].safe)` |
| **Transcript orphan check** | Check recordings/ only | No change (files in same place) |
| **Shadow matching** | Same filename | No change (files in same place) |
| **DAM sync** | Exclude `-safe/` folder | Read state file, exclude safe files |

### UI Changes

1. **Watch page toggle**: "Show safe files: [on/off]"
2. **Recordings panel**: Filter toggle instead of separate section
3. **Safe/Restore buttons**: Same UI, different backend

---

## Part 3: Per-Recording Stage (Future Extension)

The state file naturally extends to per-recording stages:

```json
{
  "recordings": {
    "01-1-intro.mov": { "safe": true, "stage": "first-edit" },
    "02-1-demo.mov": { "stage": "recording" },
    "09-1-outro.mov": { "stage": "review" }
  }
}
```

This complements the per-project stage (FR-110) with per-recording granularity.

---

## Implementation Order

### Phase 1: Bug Fix (Immediate) ✓ COMPLETE
- ~~Investigate Watch page segment bug~~
- ~~Add debug logging~~
- ~~Fix caching issue if found~~

**Root Cause Found:** CSS layout issue, not caching. The parent container for the cascading panels had no explicit width (only 288px from chapter panel). The segment panel at `right-72` was outside the parent's bounds, so mouse movement triggered `onMouseLeave`.

**Fix Applied:**
- Added `w-[544px]` to parent (wide enough for both panels: 288px + 256px)
- Added `pointer-events-none` to parent, `pointer-events-auto` to children
- Added `absolute right-0 top-0` to chapter panel

### Phase 2: State File Foundation ✓ COMPLETE

**Goal:** Create infrastructure for reading/writing `.flihub-state.json` without changing existing safe functionality.

#### Acceptance Criteria
- [x] State file reader returns typed object with safe recordings
- [x] State file writer persists changes to disk
- [x] State file added to project paths (`shared/paths.ts`)
- [x] API endpoint exists to read state: `GET /api/projects/:code/state`
- [x] API endpoint exists to write state: `POST /api/projects/:code/state`
- [x] Missing/corrupt state files handled gracefully (return empty state)
- [x] Existing `-safe` folder behavior unchanged (Phase 3 will migrate)

**Files Created/Modified:**
- `shared/paths.ts` - Added `stateFile` path to `ProjectPaths` interface
- `shared/types.ts` - Added `RecordingState`, `ProjectState`, `ProjectStateResponse`, `UpdateProjectStateRequest`
- `server/src/utils/projectState.ts` - NEW: State file utilities (read, write, merge, helpers)
- `server/src/routes/state.ts` - NEW: GET/POST endpoints for `/api/projects/:code/state`
- `server/src/index.ts` - Registered state routes

#### API Contract

**GET /api/projects/:code/state**
```typescript
// Response
{
  success: true,
  state: {
    version: 1,
    recordings: {
      "01-1-intro.mov": { safe: true },
      "02-1-demo.mov": {}
    }
  }
}
```

**POST /api/projects/:code/state**
```typescript
// Request body
{
  recordings: {
    "01-1-intro.mov": { safe: true }
  }
}

// Response
{ success: true }
```

#### Default Behavior
- If `.flihub-state.json` doesn't exist → return `{ version: 1, recordings: {} }`
- If state file is corrupt JSON → log warning, return empty state
- If recording not in state → treat as `{ safe: false }` (active by default)

#### Implementation Details

**New file:** `server/src/utils/projectState.ts`
```typescript
interface RecordingState {
  safe?: boolean;
  stage?: string; // future: recording, first-edit, review
}

interface ProjectState {
  version: 1;
  recordings: Record<string, RecordingState>;
}

export function readProjectState(projectDir: string): ProjectState
export function writeProjectState(projectDir: string, state: ProjectState): void
export function isRecordingSafe(state: ProjectState, filename: string): boolean
```

**Updated:** `shared/paths.ts`
```typescript
export interface ProjectPaths {
  // ... existing paths
  stateFile: string; // .flihub-state.json
}
```

**New routes:** `server/src/routes/state.ts`
- `GET /api/projects/:code/state` - Read state file
- `POST /api/projects/:code/state` - Write state file (full replace)

#### Files to Create/Modify
- `server/src/utils/projectState.ts` - NEW: State file utilities
- `server/src/routes/state.ts` - NEW: State API endpoints
- `shared/paths.ts` - Add stateFile path
- `shared/types.ts` - Add ProjectState, RecordingState types
- `server/src/index.ts` - Register state routes

### Phase 3: Safe Migration 🔴 WITH DEVELOPER

**Goal:** Migrate existing `-safe/` folder architecture to state-based flags. Files physically move back to `recordings/`, state tracks which are safe.

#### Acceptance Criteria

- [ ] Migration script moves all files from `recordings/-safe/` back to `recordings/`
- [ ] Migration script creates `.flihub-state.json` with `safe: true` for migrated files
- [ ] Migration script moves shadow files from `recording-shadows/-safe/` to `recording-shadows/`
- [ ] Migration script cleans up empty `-safe` folders (both recordings and shadows)
- [ ] Safe command (`POST /api/recordings/safe`) uses state file instead of moving files
- [ ] Restore command (`POST /api/recordings/restore`) uses state file instead of moving files
- [ ] Recordings list (`GET /api/recordings`) checks state instead of scanning `-safe/` folder
- [ ] Watch page filters using state flags instead of `folder === 'safe'`
- [ ] Recordings view filters using state flags instead of `folder === 'safe'`
- [ ] Rename label modal checks state instead of folder
- [ ] Orphan detection (`getTranscriptSyncStatus`) no longer scans `-safe/` folder
- [ ] Chapter counting (`countUniqueChapters`) no longer scans `-safe/` folder
- [ ] All places referencing `paths.safe` are removed or refactored
- [ ] All socket events for safe folder removed (no longer needed)
- [ ] Migration runs automatically on server startup if `-safe/` folder exists

#### Implementation Details

**1. Migration Script** (`server/src/utils/safeMigration.ts` - NEW)

```typescript
/**
 * FR-111 Phase 3: Migrate -safe folder to state-based architecture
 *
 * What it does:
 * 1. Check if recordings/-safe/ exists
 * 2. If exists, read all .mov files
 * 3. Move each file back to recordings/
 * 4. Update state file to mark each as safe: true
 * 5. Move shadow files from recording-shadows/-safe/ to recording-shadows/
 * 6. Delete empty -safe folders
 *
 * Returns: { migrated: number, errors: string[] }
 */
export async function migrateSafeFolder(projectDir: string): Promise<MigrationResult>
```

**Key operations:**
- Read current state file (or create empty)
- For each file in `recordings/-safe/`:
  - Move to `recordings/`
  - Add `{ safe: true }` to state
  - Move corresponding shadow if exists
- For orphan shadows in `recording-shadows/-safe/`:
  - Move to `recording-shadows/`
  - Add warning (shadow without recording)
- Write updated state file
- Remove empty directories
- Log migration summary

**Error handling:**
- If file already exists in recordings → skip with warning
- If move fails → collect error, continue with others
- If state write fails → rollback moves (transaction-style)

**2. Update Safe/Restore Commands** (`server/src/routes/index.ts`)

**Current:** `POST /api/recordings/safe` moves files to `-safe/` folder
**New:** Toggle `safe: true` in state file (files stay in place)

```typescript
// FR-111 Phase 3: Safe command uses state file
router.post('/recordings/safe', async (req: Request, res: Response) => {
  const { files, chapter } = req.body;

  // Read current state
  const state = await readProjectState(config.projectDirectory);

  // Determine which files to mark safe
  let filesToMark: string[] = [];
  if (files && Array.isArray(files)) {
    filesToMark = files;
  } else if (chapter) {
    // Find all .mov files in recordings/ matching chapter
    const paths = getProjectPaths(expandPath(config.projectDirectory));
    const entries = await fs.readdir(paths.recordings);
    filesToMark = entries.filter(name => {
      const parsed = parseRecordingFilename(name);
      return parsed && parsed.chapter === chapter;
    });
  }

  // Update state
  let updatedState = state;
  for (const filename of filesToMark) {
    updatedState = setRecordingSafe(updatedState, filename, true);
  }

  // Write state
  await writeProjectState(config.projectDirectory, updatedState);

  // Emit socket event for UI refresh
  io.emit('recordings:changed');

  res.json({ success: true, marked: filesToMark.length });
});
```

**Restore command:** Similar but sets `safe: false`

**3. Update Recordings List** (`server/src/routes/index.ts`)

**Current:** Line 404-407 scans `shadowSafeDir`, line 451-454 scans `paths.safe`
**New:** Only scan `recordings/` and `recording-shadows/`, check state for safe flag

```typescript
// FR-111 Phase 3: Read state file
const state = await readProjectState(config.projectDirectory);

// FR-111 Phase 3: Remove -safe scanning (folders no longer exist)
// Only scan: recordings/ and recording-shadows/
const shadowFolders = [
  { dir: shadowDir, folder: 'recordings' },
  // REMOVED: { dir: shadowSafeDir, folder: 'safe' },
];

const realFolders = [
  { dir: paths.recordings, folder: 'recordings' },
  // REMOVED: { dir: paths.safe, folder: 'safe' },
];

// When building RecordingFile objects, check state:
const isSafe = isRecordingSafe(state, entry.name);

return {
  filename: entry.name,
  // ... other fields
  folder: 'recordings',  // FR-111: Always 'recordings' now
  isSafe,  // FR-111 Phase 3: NEW field from state
};
```

**4. Update Watch Page** (`client/src/components/WatchPage.tsx`)

**Current:** Lines 90, 211, 232, 250, 270, 373, 401, 448 check `folder === 'safe'` or `folder !== 'safe'`
**New:** Check `r.isSafe` flag

```typescript
// Before (line 90):
const activeRecordings = recordings.filter(r => r.folder !== 'safe')

// After (FR-111 Phase 3):
const activeRecordings = recordings.filter(r => !r.isSafe)
```

**Remove:** All `shadowFolder` logic (lines 232, 250, 373, 401, 448) - shadows are always in `recording-shadows/` now

**5. Update Recordings View** (`client/src/components/RecordingsView.tsx`)

**Current:** Lines 59, 346, 428, 515, 601, 690, 737 check `folder === 'safe'`
**New:** Check `r.isSafe`

**6. Update Rename Label Modal** (`client/src/components/RenameLabelModal.tsx`)

**Current:** Lines 146-147 check `folder === 'safe'`
**New:** Check `file.isSafe`

**7. Update Orphan Detection** (`server/src/utils/scanning.ts`)

**Current:** Line 68 scans both `recordingsDir` and `safeDir`
**New:** Only scan `recordingsDir` (safe files are in recordings/ now)

```typescript
// Before:
export async function getTranscriptSyncStatus(
  recordingsDir: string,
  safeDir: string,  // REMOVE
  transcriptsDir: string
)

// After:
export async function getTranscriptSyncStatus(
  recordingsDir: string,
  transcriptsDir: string
)

// Body change:
const recordingFiles: string[] = [];
// REMOVED: for (const dir of [recordingsDir, safeDir])
const files = await readDirSafe(recordingsDir);
recordingFiles.push(
  ...files.filter(f => f.endsWith('.mov')).map(f => f.replace('.mov', ''))
);
```

**8. Update Chapter Counting** (`server/src/utils/scanning.ts`)

**Current:** Line 46 scans both `recordingsDir` and `safeDir`
**New:** Only scan `recordingsDir`

```typescript
// Before:
export async function countUniqueChapters(
  recordingsDir: string,
  safeDir: string  // REMOVE
)

// After:
export async function countUniqueChapters(recordingsDir: string)

// Body change:
const chapters = new Set<string>();
// REMOVED: for (const dir of [recordingsDir, safeDir])
const files = await readDirSafe(recordingsDir);
for (const file of files) {
  const match = file.match(/^(\d{2})-/);
  if (match) chapters.add(match[1]);
}
```

**9. Remove Safe Paths** (`shared/paths.ts`)

**Current:** `safe: path.join(project, 'recordings', '-safe')`
**New:** Remove `safe` field from `ProjectPaths` interface

**Impact:** Update all callers of `getProjectPaths()` that reference `paths.safe`

**10. Update TypeScript Types** (`shared/types.ts`)

**Current:** `folder: 'recordings' | 'safe'`
**New:**
```typescript
folder: 'recordings'  // Always recordings now
isSafe: boolean       // NEW: From state file
```

**11. Server Startup Integration** (`server/src/index.ts`)

```typescript
// FR-111 Phase 3: Auto-migrate on startup
import { migrateSafeFolder } from './utils/safeMigration.js';

async function startServer() {
  // ... existing setup

  // Check if migration needed
  const paths = getProjectPaths(expandPath(config.projectDirectory));
  const safeExists = await fs.pathExists(paths.safe);

  if (safeExists) {
    console.log('[FR-111] Detected -safe folder, running migration...');
    const result = await migrateSafeFolder(config.projectDirectory);
    console.log(`[FR-111] Migration complete: ${result.migrated} files migrated`);
    if (result.errors.length > 0) {
      console.warn('[FR-111] Migration warnings:', result.errors);
    }
  }

  // ... start server
}
```

#### Files to Create/Modify

**Create:**
- `server/src/utils/safeMigration.ts` - Migration script

**Modify:**
- `server/src/routes/index.ts` - Safe/Restore commands, recordings list
- `server/src/utils/scanning.ts` - Remove safeDir params from functions
- `shared/paths.ts` - Remove `safe` field
- `shared/types.ts` - Update `RecordingFile` type
- `client/src/components/WatchPage.tsx` - Replace folder checks with isSafe
- `client/src/components/RecordingsView.tsx` - Replace folder checks with isSafe
- `client/src/components/RenameLabelModal.tsx` - Replace folder checks with isSafe
- `server/src/index.ts` - Add migration on startup
- All files that call `getTranscriptSyncStatus` or `countUniqueChapters` (update signatures)

**Complete Reference Map:**

Files using `paths.safe` (14 locations):
- `server/src/WatcherManager.ts` - Watcher pattern
- `server/src/routes/index.ts` (6 locations) - Safe/restore commands, recordings list
- `server/src/routes/query/projects.ts` (3 locations) - Project stats
- `server/src/routes/query/export.ts` (2 locations) - Export functionality
- `server/src/routes/query/recordings.ts` - Recordings query
- `server/src/routes/query/chapters.ts` - Chapter aggregation
- `server/src/routes/system.ts` - System paths API

Files using `safeDir` (21 locations total, including shadows):
- All of the above plus shadow-related files

Files calling `getTranscriptSyncStatus` or `countUniqueChapters`:
- `server/src/utils/projectStats.ts` (2 calls)
- `server/src/routes/query/projects.ts` (2 calls)

Client files checking `folder === 'safe'` or `folder !== 'safe'`:
- `client/src/components/WatchPage.tsx` (8 locations)
- `client/src/components/RecordingsView.tsx` (7 locations)
- `client/src/components/RenameLabelModal.tsx` (2 locations)

#### Testing Steps

**Manual Testing:**
1. Create test project with files in `recordings/-safe/`
2. Start server, verify migration runs
3. Check `.flihub-state.json` created with correct flags
4. Verify files moved to `recordings/`
5. Verify `-safe/` folders deleted
6. Test Safe button → check state file, UI updates
7. Test Restore button → check state file, UI updates
8. Test Watch page filters (should hide safe files)
9. Test Recordings view (safe files marked correctly)
10. Test transcript sync (no orphans for safe files)
11. Restart server → migration should NOT run again

**Edge Cases:**
- Empty `-safe/` folder → no errors
- File exists in both recordings/ and -safe/ → skip with warning
- Shadow exists but recording doesn't → move shadow anyway
- Corrupt state file → migration creates new state
- State file already has entries → merge with migrated files

#### Migration Safety

**Rollback strategy:**
- Keep backup of state file before writing
- If state write fails, move files back to `-safe/`
- Log all operations for debugging

**Non-destructive:**
- Migration only runs if `-safe/` exists
- After migration, `-safe/` deleted (empty)
- If user has backup, they can manually restore

#### Performance Considerations

- Migration runs once on startup (not per-request)
- State file read once per recordings list request
- No change to file scanning performance (still scan recordings/)
- Fewer directories to scan (no more -safe folders)

#### Developer Quick Start Checklist

**Step 1: Create Migration Script**
- [ ] Create `server/src/utils/safeMigration.ts`
- [ ] Implement `migrateSafeFolder()` function
- [ ] Add `MigrationResult` type
- [ ] Handle file conflicts, shadow moves, state updates
- [ ] Add rollback on error

**Step 2: Update Backend Routes**
- [ ] `server/src/routes/index.ts` - Rewrite safe/restore commands (lines 649-789)
- [ ] `server/src/routes/index.ts` - Update recordings list (lines 370-547)
- [ ] `server/src/routes/query/projects.ts` - Remove paths.safe (3 locations)
- [ ] `server/src/routes/query/export.ts` - Remove paths.safe (2 locations)
- [ ] `server/src/routes/query/recordings.ts` - Remove paths.safe
- [ ] `server/src/routes/query/chapters.ts` - Remove paths.safe
- [ ] `server/src/routes/system.ts` - Remove paths.safe from system paths

**Step 3: Update Scanning Utilities**
- [ ] `server/src/utils/scanning.ts` - Remove `safeDir` param from `getTranscriptSyncStatus()`
- [ ] `server/src/utils/scanning.ts` - Remove `safeDir` param from `countUniqueChapters()`
- [ ] `server/src/utils/projectStats.ts` - Update function calls (2 locations)

**Step 4: Update Shared Types**
- [ ] `shared/types.ts` - Change `folder: 'recordings' | 'safe'` to `folder: 'recordings'`
- [ ] `shared/types.ts` - Add `isSafe: boolean` to `RecordingFile`
- [ ] `shared/paths.ts` - Remove `safe` field from `ProjectPaths`

**Step 5: Update Client Components**
- [ ] `client/src/components/WatchPage.tsx` - Replace 8 folder checks with `isSafe`
- [ ] `client/src/components/RecordingsView.tsx` - Replace 7 folder checks with `isSafe`
- [ ] `client/src/components/RenameLabelModal.tsx` - Replace 2 folder checks with `isSafe`

**Step 6: Update Watcher**
- [ ] `server/src/WatcherManager.ts` - Remove `paths.safe` from watch pattern

**Step 7: Server Startup**
- [ ] `server/src/index.ts` - Add migration check on startup
- [ ] Import `migrateSafeFolder`
- [ ] Call migration before server starts if `-safe/` exists

**Step 8: Testing**
- [ ] Manual test with existing `-safe/` folder
- [ ] Verify migration logs
- [ ] Test safe/restore UI buttons
- [ ] Test watch page filtering
- [ ] Verify transcript sync (no orphans)
- [ ] Test restart (no re-migration)

### Phase 4: UI Polish 🔴 WITH DEVELOPER

**Goal:** Add "Show safe" toggle to Watch page, following the same pattern already implemented in RecordingsView.

#### Acceptance Criteria

- [ ] "Show safe" checkbox added to Watch page controls (same pattern as RecordingsView line 547-555)
- [ ] Toggle state persisted to localStorage (key: `flihub:watch:showSafe`)
- [ ] When unchecked (default), safe recordings are filtered out (current behavior maintained)
- [ ] When checked, safe recordings appear in chapter list with visual indicator
- [ ] Safe recordings show "SAFE" badge in chapter file list
- [ ] Safe recordings have distinct background color (e.g., yellow-50) when shown
- [ ] Toggle state survives page refresh
- [ ] Default state is unchecked (safe files hidden) to match current behavior

#### UI Mockup (ASCII Art)

**Watch Page Controls Bar:**
```
┌──────────────────────────────────────────────────────────────────────┐
│ Watch                                                                │
│                                                                      │
│ [▶ N] [L]  [1x] [1.5x] [2x] [2.5x] [3x] [4x]  |  ☐ Autoplay  ☐ Next │
│                                                                      │
│            |  ☑ Safe  ←── NEW TOGGLE (same style as RecordingsView) │
└──────────────────────────────────────────────────────────────────────┘
```

**Chapter Panel (when showSafe is checked):**
```
┌─────────────────────────────────────────┐
│  09 - Active Chapter                    │
│    09-1-intro.mov           [2:45]      │
│    09-2-demo.mov            [3:20]      │
│                                         │
│  10 - Mixed Chapter                     │
│    10-1-active.mov          [1:15]      │
│    10-2-safe.mov  [SAFE]    [2:30] ←── Yellow bg, safe badge
│    10-3-active.mov          [1:45]      │
│                                         │
│  11 - All Safe                          │
│    11-1-safe.mov  [SAFE]    [4:00] ←── Yellow bg
│    11-2-safe.mov  [SAFE]    [2:15] ←── Yellow bg
└─────────────────────────────────────────┘
```

**Chapter Panel (when showSafe is unchecked - current behavior):**
```
┌─────────────────────────────────────────┐
│  09 - Active Chapter                    │
│    09-1-intro.mov           [2:45]      │
│    09-2-demo.mov            [3:20]      │
│                                         │
│  10 - Mixed Chapter                     │
│    10-1-active.mov          [1:15]      │
│    10-3-active.mov          [1:45]      │
│                                         │
│  (Chapter 11 hidden - all files safe)  │
└─────────────────────────────────────────┘
```

#### Implementation Details

**1. Add State Management** (`client/src/components/WatchPage.tsx`)

```typescript
// Add localStorage key constant (around line 58)
const STORAGE_KEYS = {
  speed: 'flihub:watch:playbackSpeed',
  size: 'flihub:watch:videoSize',
  autoplay: 'flihub:watch:autoplay',
  autonext: 'flihub:watch:autonext',
  showSafe: 'flihub:watch:showSafe',  // NEW
}

// Add state (around line 176 with other useState calls)
const [showSafe, setShowSafe] = useState(() => {
  const stored = localStorage.getItem(STORAGE_KEYS.showSafe)
  return stored ? JSON.parse(stored) : false  // Default: hide safe files
})

// Add effect to persist toggle state (around line 212 with other effects)
useEffect(() => {
  localStorage.setItem(STORAGE_KEYS.showSafe, JSON.stringify(showSafe))
}, [showSafe])
```

**2. Update Chapter Filtering** (`client/src/components/WatchPage.tsx`)

Current code at line 86-90:
```typescript
function groupByChapterWithTiming(recordings: RecordingFile[]): ChapterGroup[] {
  const groups = new Map<string, { files: RecordingFile[]; totalDuration: number }>()

  // FR-111: Only include active recordings (not safe) for watching
  const activeRecordings = recordings.filter(r => !r.isSafe)
```

Update to:
```typescript
function groupByChapterWithTiming(
  recordings: RecordingFile[],
  showSafe: boolean  // NEW PARAMETER
): ChapterGroup[] {
  const groups = new Map<string, { files: RecordingFile[]; totalDuration: number }>()

  // FR-111 Phase 4: Filter based on showSafe toggle
  const filteredRecordings = showSafe
    ? recordings  // Show all
    : recordings.filter(r => !r.isSafe)  // Hide safe files
```

**3. Update Function Calls**

Find all calls to `groupByChapterWithTiming()` (around line 263):
```typescript
// Before:
const chapters = useMemo(
  () => groupByChapterWithTiming(recordings),
  [recordings]
)

// After:
const chapters = useMemo(
  () => groupByChapterWithTiming(recordings, showSafe),
  [recordings, showSafe]  // Add showSafe to deps
)
```

**4. Add Toggle to UI** (`client/src/components/WatchPage.tsx`)

Find the controls section (around line 295, after the autoplay/autonext toggles):
```typescript
{/* FR-111 Phase 4: Show safe toggle */}
<span className="text-gray-300">|</span>
<label className="flex items-center gap-1.5 cursor-pointer hover:text-gray-700">
  <input
    type="checkbox"
    checked={showSafe}
    onChange={(e) => setShowSafe(e.target.checked)}
    className="w-3 h-3 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
  />
  Safe
</label>
```

**5. Add Visual Indicators for Safe Files**

In the chapter file list rendering (around line 377-430 in the chapter panel):
```typescript
{chapter.files.map((file) => (
  <div
    key={file.filename}
    className={cn(
      'px-2 py-1 cursor-pointer flex items-center justify-between gap-2 group',
      // FR-111 Phase 4: Highlight safe files
      file.isSafe
        ? 'bg-yellow-50 hover:bg-yellow-100'
        : 'hover:bg-gray-100'
    )}
    onClick={() => onFileSelect(file)}
  >
    <span className="text-sm flex items-center gap-2">
      {file.sequence}-{file.name}
      {/* FR-111 Phase 4: Safe badge */}
      {file.isSafe && (
        <span className="text-xs px-1.5 py-0.5 bg-yellow-200 text-yellow-800 rounded font-medium">
          SAFE
        </span>
      )}
    </span>
    <span className="text-xs text-gray-500">
      [{formatDuration(file.duration)}]
    </span>
  </div>
))}
```

#### Files to Modify

- `client/src/components/WatchPage.tsx` - Add toggle, state persistence, visual indicators

#### Testing Steps

1. **Default State (Safe Hidden)**
   - Open Watch page
   - Verify safe files NOT shown in chapter list
   - Verify chapters with only safe files are hidden
   - This matches current behavior

2. **Toggle On (Show Safe)**
   - Check "Safe" checkbox
   - Verify safe files appear with yellow background
   - Verify safe files have "SAFE" badge
   - Verify chapters with only safe files now visible

3. **State Persistence**
   - Toggle safe ON, refresh page → should stay ON
   - Toggle safe OFF, refresh page → should stay OFF
   - Clear localStorage, refresh → should default to OFF

4. **Mixed Chapters**
   - Create chapter with both safe and active files
   - Toggle OFF → only active files shown
   - Toggle ON → all files shown, safe files highlighted

5. **All-Safe Chapters**
   - Create chapter with only safe files
   - Toggle OFF → chapter hidden from list
   - Toggle ON → chapter appears with all files highlighted

6. **Visual Consistency**
   - Compare toggle styling with RecordingsView
   - Verify safe badge matches RecordingsView pattern
   - Verify yellow background is subtle but noticeable

#### Edge Cases

- Empty chapter list (all safe, toggle OFF) → show "No recordings" message
- Chapter has only safe files → entire chapter hidden when toggle OFF
- User clicks safe file when toggle ON → video should play normally
- Segments for safe recording → should work when file is shown

#### Design Notes

**Toggle Position:**
- Place after autoplay/autonext toggles, before end of controls bar
- Same styling as RecordingsView (line 547-555)
- Separated by `|` divider

**Visual Treatment:**
- Background: `bg-yellow-50` (idle) → `bg-yellow-100` (hover)
- Badge: `bg-yellow-200 text-yellow-800`
- Same yellow theme as RecordingsView uses for safe files

**Default Behavior:**
- Default to `false` (unchecked) to maintain current UX
- Users who want to see safe files must explicitly enable
- State persists across sessions via localStorage

### Phase 5: Per-Recording Stage (Optional)
- Add stage field to state schema
- UI for per-recording stage

---

## Files to Change

**Phase 1 (Bug Fix):**
- `client/src/components/WatchPage.tsx` - Debug logging, possible fix

**Phase 2-3 (State Architecture):**
- `shared/paths.ts` - Add `stateFile` path
- `server/src/utils/projectState.ts` - NEW: State file reader/writer
- `server/src/routes/index.ts` - Update recordings endpoint
- `server/src/routes/index.ts` - Update safe/restore endpoints
- `server/src/utils/scanning.ts` - Update orphan detection
- `client/src/components/WatchPage.tsx` - State-based filtering
- `client/src/components/RecordingsPanel.tsx` - State-based filtering

---

## Related

- FR-110: Project Stage Persistence (per-project state, similar pattern)
- FR-80: Enhanced Project List & Stage Model (project stages)
- NFR-87: Starred Projects Visual (another config-stored state)
