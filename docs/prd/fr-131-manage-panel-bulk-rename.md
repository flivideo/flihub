# FR-131: Manage Panel with Bulk Rename & Regen Toolbar

**Status:** Pending
**Added:** 2026-01-03
**Implemented:** -
**Dependencies:** FR-130 (Delete+Regenerate pattern), FR-122/124 (Export panel base)

---

## User Story

As a user, I want to rename multiple recordings at once and trigger regeneration operations from a dedicated "Manage" panel, so I can perform complex file operations without cluttering the Recordings panel.

---

## Problem

**Current state:**
- "Export" panel name is misleading (does more than just export)
- Bulk rename lives in Recordings panel (high-touch UI)
- No centralized location for regeneration operations
- Complexity in wrong place (Recordings should be simple viewing)

**User quote:** "We've got two totally different functional areas of the system. One's called Recordings, one's called Manage, but they have shared knowledge."

**Architectural concern:** Shared code between Recordings and Manage must be organized to prevent:
- Implementing in wrong feature
- Not knowing about code in another feature
- Code duplication

---

## Solution

Transform "Export" panel into "Manage" panel with three key areas:

### 1. Panel Rename: "Export" → "Manage"

**Rationale:** Panel does more than export - it's a power tools area for complex file operations.

**Changes:**
- Tab label: "Export" → "Manage"
- Component: `ExportPanel.tsx` → `ManagePanel.tsx`
- Tooltip: "Bulk operations, export to Gling, file regeneration, edit folder management"

---

### 2. Regen Toolbar (NEW FEATURE)

**User request:** "A little toolbar at the top" with regeneration capabilities.

**Location:** Top of Manage panel, above file list

**UI Design:**
```
┌─────────────────────────────────────────────────────────────────┐
│ Manage                                                          │
├─────────────────────────────────────────────────────────────────┤
│ Regeneration Tools                                              │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [↻ Regen Shadows] [↻ Regen Transcripts] [↻ Regen Chapters] │ │
│ │                                           [↻ Regen All]      │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Bulk Rename                                                     │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Selected files (12): Rename label to: [introduction      ]  │ │
│ │                                        [Apply Rename]        │ │
│ │                                                              │ │
│ │ Or rename by chapter:                                       │ │
│ │ Chapter 01 (15 files): [intro    ] → [introduction      ]  │ │
│ │                                        [Rename Ch 01]        │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ── Chapter 01: intro (15 files · 2.4 GB) ──────────────────── │
│ ☑ 01-1-intro.mov                                        245MB  │
│ ☑ 01-2-intro-retake.mov                                 312MB  │
│ ...                                                             │
└─────────────────────────────────────────────────────────────────┘
```

**Toolbar Buttons:**

1. **Regen Shadows** (↻ Regen Shadows)
   - Regenerates shadow files for all recordings
   - Fast operation (~1ms per file)
   - Use case: Shadow files were manually deleted or corrupted

2. **Regen Transcripts** (↻ Regen Transcripts)
   - Queues transcription for recordings missing transcripts
   - Or re-transcribes ALL recordings (user choice via dropdown)
   - Use case: Upgrade to better Whisper model, fix transcription errors

3. **Regen Chapters** (↻ Regen Chapters)
   - Regenerates all chapter videos in `-chapters/` folder
   - Expensive operation (30-60s per chapter)
   - Shows progress bar
   - Use case: Chapter videos deleted, need fresh renders

4. **Regen All** (↻ Regen All)
   - Runs all three operations sequentially
   - Shows combined progress
   - Use case: Full project regeneration after corruption or migration

**Implementation:**
- Collapsible section (can hide if not needed)
- Confirmation dialogs for expensive operations (Regen Chapters, Regen All)
- Progress indicators for long operations
- Toast notifications on completion

---

### 3. Bulk Rename Section

**Move from Recordings panel to Manage panel.**

**Features:**

#### A. Selected Files Rename
- Checkbox selection (already exists for export)
- Text input: "Rename label to: [_____]"
- Button: "Apply Rename"
- Applies new label to all selected files

**Example:**
- Selected: `01-1-intro.mov`, `01-2-intro.mov`, `01-3-intro-retake.mov`
- New label: "introduction"
- Result: `01-1-introduction.mov`, `01-2-introduction.mov`, `01-3-introduction-retake.mov`

#### B. Chapter-Level Rename
- Dropdown: Select chapter (01, 02, 03, ...)
- Text input: Current label → New label
- Button: "Rename Ch 01"
- Renames all files in chapter

**Example:**
- Chapter 01: 15 files with label "intro"
- New label: "introduction"
- Result: All 15 files renamed to "introduction"

**Workflow:**
1. User goes to Manage panel
2. Selects files via checkboxes OR selects chapter
3. Enters new label
4. Clicks "Apply Rename" or "Rename Ch 01"
5. Confirmation dialog: "Rename 12 files? Transcripts will be regenerated (may take 5-10 minutes)."
6. Backend: Delete+Rename+Regenerate (FR-130)
7. Toast: "Renamed 12 files. Transcription queued (view progress in Transcriptions tab)"

---

### 4. Remove Rename from Recordings Panel

**Current:** Recordings panel has "Rename Chapter" button in chapter headers

**Remove:**
- "Rename Chapter" button
- `RenameLabelModal.tsx` (move to Manage panel)

**Add help text:**
- "To rename multiple files, use Manage panel"
- Tooltip on chapter headers: "Use Manage panel for renaming"

**Result:** Recordings panel becomes simpler, focused on viewing.

---

## Shared Code Architecture (CRITICAL)

**User's concern:** "The big problem we'll end up with by having two different features is that we'll implement in one feature when it should have been the other or we won't know about code in another feature."

### Problem

Two separate feature areas share concepts:
- **Recordings panel:** High-touch, view-focused
- **Manage panel:** Low-touch, operation-focused
- **Shared:** Recordings data, park/safe states, chapter grouping, file selection

**Risk:** Code duplication, implementing in wrong place, not knowing about existing code.

---

### Solution: Shared Code Organization

#### Folder Structure

```
client/src/
├── components/
│   ├── RecordingsView.tsx          # Recordings panel (viewing)
│   ├── ManagePanel.tsx              # Manage panel (operations)
│   └── shared/                      # Shared UI components
│       ├── RecordingFileRow.tsx     # Single file display
│       ├── ChapterGroup.tsx         # Chapter grouping logic
│       ├── FileStatsDisplay.tsx     # File count, size display
│       └── index.ts                 # Export barrel
│
├── hooks/
│   ├── useRecordings.ts             # Recordings-specific hooks
│   ├── useManage.ts                 # Manage-specific hooks
│   └── shared/                      # Shared data hooks
│       ├── useRecordingsData.ts     # Fetch recordings
│       ├── useChapterGroups.ts      # Group by chapter
│       ├── useFileSelection.ts      # Checkbox selection state
│       └── index.ts                 # Export barrel
│
└── utils/
    ├── recordings/                  # Recordings-specific utilities
    │   ├── viewHelpers.ts
    │   └── index.ts
    ├── manage/                      # Manage-specific utilities
    │   ├── bulkOperations.ts
    │   └── index.ts
    └── shared/                      # Shared utilities
        ├── fileGrouping.ts          # Chapter grouping logic
        ├── fileFiltering.ts         # Park/safe filtering
        ├── fileFormatting.ts        # Size, duration formatting
        └── index.ts                 # Export barrel

server/src/
├── routes/
│   ├── recordings.ts                # Recordings panel endpoints
│   ├── manage.ts                    # Manage panel endpoints (NEW)
│   └── shared/                      # Shared route utilities
│       ├── projectResolver.ts       # Project code resolution
│       ├── fileValidation.ts        # File existence checks
│       └── index.ts
│
└── utils/
    ├── recordings/                  # Recordings-specific
    │   └── index.ts
    ├── manage/                      # Manage-specific
    │   ├── bulkRename.ts
    │   ├── regeneration.ts
    │   └── index.ts
    └── shared/                      # Shared utilities
        ├── projectState.ts          # State file operations
        ├── fileOperations.ts        # Common file ops
        ├── renameRecording.ts       # FR-130 rename logic
        └── index.ts
```

#### Naming Conventions

**Prevent confusion:**

| Code Type | Location | Naming Pattern | Example |
|-----------|----------|----------------|---------|
| **Recordings-only** | `recordings/` folder | `recordings*`, `view*` | `recordingsViewHelpers.ts` |
| **Manage-only** | `manage/` folder | `manage*`, `bulk*`, `regen*` | `manageBulkRename.ts` |
| **Shared** | `shared/` folder | Generic names | `fileGrouping.ts`, `useChapterGroups.ts` |

**Import paths:**
```typescript
// Recordings panel
import { useRecordingsData } from '../hooks/shared/useRecordingsData'
import { viewHelpers } from '../utils/recordings/viewHelpers'

// Manage panel
import { useRecordingsData } from '../hooks/shared/useRecordingsData'
import { bulkRename } from '../utils/manage/bulkRename'

// Shared imports are explicit
import { groupByChapter } from '../utils/shared/fileGrouping'
```

---

#### Index & Cross-Reference System

**Create:** `docs/architecture/shared-code-index.md`

**Purpose:** Document what code belongs where and why.

**Structure:**
```markdown
# Shared Code Index

## Client-Side

### Hooks

| Hook | Location | Used By | Purpose |
|------|----------|---------|---------|
| `useRecordingsData` | `hooks/shared/` | Recordings, Manage, Watch | Fetch recordings from API |
| `useChapterGroups` | `hooks/shared/` | Recordings, Manage | Group recordings by chapter |
| `useFileSelection` | `hooks/shared/` | Manage, Export | Checkbox selection state |

### Components

| Component | Location | Used By | Purpose |
|-----------|----------|---------|---------|
| `RecordingFileRow` | `components/shared/` | Recordings, Manage | Display single file |
| `ChapterGroup` | `components/shared/` | Recordings, Manage | Chapter section UI |

### Utilities

| Utility | Location | Used By | Purpose |
|---------|----------|---------|---------|
| `groupByChapter` | `utils/shared/fileGrouping.ts` | Recordings, Manage | Chapter grouping logic |
| `formatFileSize` | `utils/shared/fileFormatting.ts` | All panels | Size formatting (B/KB/MB/GB) |

## Server-Side

### Routes

| Endpoint | Location | Used By | Purpose |
|----------|----------|---------|---------|
| `GET /api/recordings` | `routes/recordings.ts` | Recordings panel | Get recordings for viewing |
| `POST /api/manage/bulk-rename` | `routes/manage.ts` | Manage panel | Bulk rename operation |

### Utilities

| Utility | Location | Used By | Purpose |
|---------|----------|---------|---------|
| `renameRecording` | `utils/shared/renameRecording.ts` | Manage, Recordings | FR-130 rename logic |
| `projectState` | `utils/shared/projectState.ts` | All features | State file operations |

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
```

---

#### Documentation in Code

**Add JSDoc comments to shared code:**

```typescript
/**
 * Groups recordings by chapter number.
 *
 * @location shared/fileGrouping.ts
 * @usedBy RecordingsView, ManagePanel
 * @param recordings - Array of recording files
 * @returns Map of chapter number to recordings
 *
 * @example
 * const groups = groupByChapter(recordings)
 * // { '01': [...], '02': [...] }
 */
export function groupByChapter(recordings: RecordingFile[]): Map<string, RecordingFile[]> {
  // ...
}
```

---

## API Design

### New Endpoint: Bulk Rename

**`POST /api/manage/bulk-rename`**

**Request:**
```json
{
  "files": ["01-1-intro.mov", "01-2-intro.mov", "01-3-intro-retake.mov"],
  "newLabel": "introduction"
}
```

**Response:**
```json
{
  "success": true,
  "renamedCount": 3,
  "transcriptionQueued": true,
  "files": [
    { "old": "01-1-intro.mov", "new": "01-1-introduction.mov" },
    { "old": "01-2-intro.mov", "new": "01-2-introduction.mov" },
    { "old": "01-3-intro-retake.mov", "new": "01-3-introduction-retake.mov" }
  ]
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Cannot rename while transcribing: 01-1-intro.mov"
}
```

---

### New Endpoints: Regeneration

**`POST /api/manage/regen-shadows`**
- Regenerates shadow files for all recordings
- Returns count of regenerated files

**`POST /api/manage/regen-transcripts`**
- Queues transcription for missing transcripts
- Optional `force: true` to re-transcribe all
- Returns count of queued jobs

**`POST /api/manage/regen-chapters`**
- Regenerates chapter videos
- Returns progress updates via Socket.io
- Expensive operation (30-60s per chapter)

**`POST /api/manage/regen-all`**
- Runs all three operations sequentially
- Returns combined status

---

## Acceptance Criteria

### Must Have

**Panel Rename:**
- [ ] Tab label changed: "Export" → "Manage"
- [ ] Component renamed: `ExportPanel.tsx` → `ManagePanel.tsx`
- [ ] Route updated: `/export` → `/manage` (or kept for backwards compat)
- [ ] All references updated in codebase
- [ ] Tooltip added: "Bulk operations, export to Gling, file regeneration, edit folder management"

**Regen Toolbar:**
- [ ] Toolbar at top of Manage panel
- [ ] Four buttons: Regen Shadows, Regen Transcripts, Regen Chapters, Regen All
- [ ] Confirmation dialogs for expensive operations (Chapters, All)
- [ ] Progress indicators for long operations
- [ ] Toast notifications on completion
- [ ] Collapsible section (can hide toolbar)

**Bulk Rename:**
- [ ] "Bulk Rename" section in Manage panel
- [ ] Text input for new label
- [ ] "Apply Rename" button for selected files
- [ ] Chapter dropdown + rename for entire chapter
- [ ] Confirmation dialog before renaming
- [ ] Uses FR-130 delete+regenerate logic
- [ ] Toast notification after rename

**Recordings Panel Cleanup:**
- [ ] "Rename Chapter" button removed from chapter headers
- [ ] Help text added: "To rename multiple files, use Manage panel"
- [ ] Tooltip on chapter headers links to Manage panel

**Shared Code Architecture:**
- [ ] `shared/` folders created in `components/`, `hooks/`, `utils/`
- [ ] Shared code moved to `shared/` folders
- [ ] Export barrel files created (`index.ts`)
- [ ] `docs/architecture/shared-code-index.md` created
- [ ] JSDoc comments added to shared code (location, usedBy)

### Should Have

- [ ] Keyboard shortcut for Manage panel (Cmd+M)
- [ ] Bulk rename preview (show before/after filenames)
- [ ] Regen toolbar remembers collapsed state (localStorage)

### Nice to Have

- [ ] Progress bar for Regen Chapters (shows current chapter X/Y)
- [ ] Estimate time for bulk operations
- [ ] Undo last bulk rename (via FR-50 undo system)

---

## Technical Notes

### Bulk Rename Implementation

**Reuses FR-130 logic:**
```typescript
// server/src/routes/manage.ts
router.post('/bulk-rename', async (req, res) => {
  const { files, newLabel } = req.body
  const config = getConfig()
  const projectPath = expandPath(config.projectDirectory)

  const renamed = []
  const errors = []

  for (const oldFilename of files) {
    try {
      // FR-130 delete+regenerate pattern
      const { chapter, sequence } = parseFilename(oldFilename)
      const newFilename = buildFilename(chapter, sequence, newLabel, tags)

      await renameRecording(oldFilename, newFilename, projectPath)
      renamed.push({ old: oldFilename, new: newFilename })
    } catch (err) {
      errors.push({ file: oldFilename, error: String(err) })
    }
  }

  res.json({
    success: errors.length === 0,
    renamedCount: renamed.length,
    transcriptionQueued: true,
    files: renamed,
    errors: errors.length > 0 ? errors : undefined
  })
})
```

---

### Regeneration Implementation

**Regen Shadows:**
```typescript
router.post('/regen-shadows', async (req, res) => {
  const config = getConfig()
  const recordings = await getRecordings(config.projectDirectory)
  let count = 0

  for (const recording of recordings) {
    await createShadowFile(recording.filename, getShadowDir(recording))
    count++
  }

  res.json({ success: true, regenerated: count })
})
```

**Regen Transcripts:**
```typescript
router.post('/regen-transcripts', async (req, res) => {
  const { force } = req.body
  const config = getConfig()
  const recordings = await getRecordings(config.projectDirectory)

  let queued = 0
  for (const recording of recordings) {
    const hasTranscript = await checkTranscript(recording.filename)
    if (force || !hasTranscript) {
      queueTranscription(recording.path)
      queued++
    }
  }

  res.json({ success: true, queued })
})
```

**Regen Chapters:**
```typescript
router.post('/regen-chapters', async (req, res) => {
  const config = getConfig()
  const chapters = await getUniqueChapters(config.projectDirectory)

  // Start async regeneration with Socket.io progress updates
  regenerateChaptersAsync(chapters, (progress) => {
    io.emit('regen:chapters:progress', progress)
  })

  res.json({ success: true, started: true, chapters: chapters.length })
})
```

---

### Files to Create

| File | Purpose |
|------|---------|
| `client/src/components/ManagePanel.tsx` | Renamed from ExportPanel.tsx |
| `client/src/components/shared/RegenToolbar.tsx` | Regen toolbar component |
| `client/src/components/shared/BulkRenameSection.tsx` | Bulk rename UI |
| `server/src/routes/manage.ts` | Manage panel endpoints |
| `docs/architecture/shared-code-index.md` | Shared code documentation |

---

### Files to Modify

| File | Changes |
|------|---------|
| `client/src/App.tsx` | Rename tab, update route |
| `client/src/components/RecordingsView.tsx` | Remove rename button, add help text |
| `client/src/hooks/useManage.ts` | CREATE - Manage panel hooks |
| `server/src/index.ts` | Register manage routes |
| `docs/CLAUDE.md` | Update panel names |

---

## Testing Checklist

**Panel Rename:**
1. ✅ Tab shows "Manage" instead of "Export"
2. ✅ Tooltip shows "Bulk operations, export to Gling..."
3. ✅ All existing export features still work

**Regen Toolbar:**
1. ✅ Regen Shadows - regenerates all shadows
2. ✅ Regen Transcripts - queues missing transcripts
3. ✅ Regen Chapters - regenerates chapter videos with progress
4. ✅ Regen All - runs all three operations
5. ✅ Confirmation dialogs show for expensive ops
6. ✅ Toast notifications on completion

**Bulk Rename:**
1. ✅ Select 3 files → rename → all renamed
2. ✅ Select chapter → rename → all files in chapter renamed
3. ✅ Confirmation dialog shows before rename
4. ✅ Toast shows "Renamed X files. Transcriptions queued"
5. ✅ State preserved (parked, annotations)

**Recordings Panel:**
1. ✅ "Rename Chapter" button removed
2. ✅ Help text shows "Use Manage panel for renaming"
3. ✅ Recordings panel simpler, focused on viewing

**Shared Code:**
1. ✅ `shared/` folders exist
2. ✅ No code duplication between Recordings and Manage
3. ✅ Import paths correct
4. ✅ Documentation in shared-code-index.md accurate

---

## Dependencies

**Depends on:**
- FR-130 (Delete+Regenerate pattern) - Bulk rename uses this logic
- FR-122/124 (Export panel) - Base for Manage panel

**Enables:**
- Simpler Recordings panel (focused on viewing)
- Centralized complex operations
- Better code organization (shared utilities)

---

## Migration Path

**From current state:**
1. Rename component files (`ExportPanel.tsx` → `ManagePanel.tsx`)
2. Create `shared/` folder structure
3. Move shared code to `shared/` folders
4. Create regen toolbar component
5. Create bulk rename section
6. Remove rename from Recordings panel
7. Add help text to Recordings panel
8. Update documentation

**User impact:**
- Export panel becomes Manage panel (same location, new name)
- Existing export features unchanged
- New features added (regen toolbar, bulk rename)
- Recordings panel simpler

---

## Success Metrics

**Code organization:**
- Shared code clearly identified
- No duplication between Recordings and Manage
- Documentation complete (shared-code-index.md)

**User experience:**
- Recordings panel simpler (remove complexity)
- Manage panel is "power tools" area
- Clear mental model (viewing vs. operations)

**Feature completeness:**
- Bulk rename working
- Regen toolbar working (4 operations)
- Toast notifications clear

---

## Completion Criteria

**Definition of Done:**
- [ ] All acceptance criteria met
- [ ] All tests passing
- [ ] Shared code architecture implemented
- [ ] Documentation complete (shared-code-index.md)
- [ ] Recordings panel simplified
- [ ] Manage panel has bulk rename + regen toolbar
- [ ] Code reviewed and merged

---

**Last updated:** 2026-01-03
