# AGENTS.md — recording-editor (B047)

**Project**: FliHub — video recording workflow management tool
**Campaign**: recording-editor (B047 — inline rename, renumber, chapter split on Recordings page)
**Stack**: TypeScript monorepo — Express + Socket.io (server), React 19 + Vite + TailwindCSS v4 (client), shared types
**Last updated**: 2026-03-23
**Inherits from**: `docs/planning/sync-hub/AGENTS.md`

---

## Project Overview

FliHub manages video recording workflows for a YouTube creator (David) with editor collaborators. This campaign moves all rename/renumber/chapter-split operations inline on the Recordings page — replacing the separate Manage panel tools (RenamePanel, ChapterListPanel, RenameLabelModal).

**Core principle**: Edit where you see the problem. No navigation to a separate panel.

**Design reference**: `.mochaccino/designs/recording-editor/index.html` — 6 interactive scenes showing browse mode, batch edit, chapter split, preview panel, undo toast, and single-file inline edit.

---

## Build & Run Commands

```bash
npm install                        # Install all workspace dependencies
npm run build -w shared            # Build shared types (run first if you changed shared/)
npm run build -w server            # TypeScript compile server
npm run build -w client            # tsc -b && vite build
npm test                           # runs shared → server → client (925+ tests currently passing)
npm test -w server                 # server tests only (fastest feedback loop)
npm test -w client                 # client tests only
npm test -w shared                 # shared tests only

lsof -i :5101 | grep LISTEN       # Check if server is running (DO NOT start it)
```

**Never start the dev server in an agent** — it's a long-running process. Build and test only.

**After changing `shared/types.ts`**: run `npm run build -w shared` (if build script exists) or just run `npm test` — TypeScript project references handle it.

---

## Directory Structure

```
flihub/
├── client/src/
│   ├── App.tsx                    # DO NOT MODIFY
│   ├── constants/
│   │   └── queryKeys.ts           # MODIFY — add undo query key if needed
│   ├── components/
│   │   ├── RecordingsView.tsx     # MAJOR MODIFY — extract sub-components, add inline editing + selection + batch toolbar + preview + split
│   │   ├── ManagePanel.tsx        # MODIFY (cleanup only) — remove Rename/Renumber tool refs
│   │   ├── RenameLabelModal.tsx   # DELETE (cleanup work unit)
│   │   └── shared/
│   │       ├── ToolsSidebar.tsx   # MODIFY (cleanup only) — remove Rename/Renumber entries
│   │       ├── RenamePanel.tsx    # DELETE (cleanup work unit)
│   │       ├── ChapterListPanel.tsx # DELETE (cleanup work unit)
│   │       ├── EditableFileRow.tsx  # CREATE — single recording row with clickable segments
│   │       ├── BatchToolbar.tsx     # CREATE — sticky selection toolbar
│   │       ├── PreviewPanel.tsx     # CREATE — full change preview with green/amber dots
│   │       ├── SplitMarker.tsx      # CREATE — amber dashed line chapter split indicator
│   │       ├── UndoToast.tsx        # CREATE — 30s floating undo bar
│   │       ├── RelayTool.tsx      # DO NOT MODIFY
│   │       ├── RelayBrowser.tsx   # DO NOT MODIFY
│   │       ├── SyncTool.tsx       # DO NOT MODIFY
│   │       ├── SyncIndicator.tsx  # DO NOT MODIFY
│   │       ├── RenameTool.tsx     # DELETE (cleanup work unit)
│   │       ├── RenumberTool.tsx   # DELETE (cleanup work unit)
│   │       ├── SlideOutDrawer.tsx # DO NOT MODIFY
│   │       └── GlingTool.tsx      # DO NOT MODIFY
│   ├── hooks/
│   │   ├── useApi.ts              # MODIFY — add re-exports for new hooks
│   │   ├── useManageApi.ts        # MODIFY — add useSplitChapter(), useUndoRename(), update useBulkRename()
│   │   ├── useRelayApi.ts         # DO NOT MODIFY
│   │   ├── useSyncApi.ts          # DO NOT MODIFY
│   │   ├── useSocket.ts           # DO NOT MODIFY
│   │   └── useSystemApi.ts        # DO NOT MODIFY
│   └── config.ts                  # DO NOT MODIFY — API_URL constant
├── server/src/
│   ├── index.ts                   # DO NOT MODIFY — manage routes already wired
│   ├── routes/
│   │   ├── manage.ts              # MODIFY — add split-chapter endpoint, add undo endpoint, modify bulk-rename to return undo mapping
│   │   ├── index.ts               # DO NOT MODIFY
│   │   ├── relay.ts               # DO NOT MODIFY
│   │   ├── sync.ts                # DO NOT MODIFY
│   │   └── [all other routes]     # DO NOT MODIFY
│   ├── utils/
│   │   ├── renameRecording.ts     # MODIFY — smart rename (rename derivatives in-place)
│   │   ├── shadowFiles.ts         # READ ONLY — createShadowFile()
│   │   ├── projectState.ts        # READ ONLY — readProjectState(), writeProjectState()
│   │   └── pathUtils.ts           # READ ONLY — expandPath()
│   ├── config/
│   │   └── configManager.ts       # DO NOT MODIFY
│   └── test/
│       ├── manage.ts.test.ts      # MODIFY — add split-chapter + undo tests
│       ├── renameRecording.test.ts # MODIFY — add smart-rename tests
│       └── [existing tests]       # DO NOT MODIFY
└── shared/
    ├── types.ts                   # MODIFY — add SplitChapterRequest/Response, UndoRenameResponse, BulkRenameUndoMapping
    ├── naming.ts                  # READ ONLY — parseRecordingFilename(), buildRecordingFilename(), validateLabel(), etc.
    ├── paths.ts                   # READ ONLY — ProjectPaths
    └── constants.ts               # DO NOT MODIFY
```

---

## DO NOT MODIFY (Explicit Scope Boundaries)

- `server/src/routes/relay.ts`, `sync.ts`, `assets.ts`, `thumbs.ts`, `transcriptions.ts`, `projects.ts`, `chapters.ts`, `video.ts`, `shadows.ts`, `edit.ts`, `poem-wui.ts`, `state.ts`, `developer.ts`, `system.ts`, `index.ts`
- `server/src/index.ts` — routes already wired
- `server/src/config/configManager.ts`
- `server/src/WatcherManager.ts`
- `client/src/App.tsx`
- `client/src/hooks/useRelayApi.ts`, `useSyncApi.ts`, `useSocket.ts`, `useSystemApi.ts`
- `client/src/components/shared/RelayTool.tsx`, `RelayBrowser.tsx`, `SyncTool.tsx`, `SyncIndicator.tsx`, `SlideOutDrawer.tsx`, `GlingTool.tsx`
- `shared/naming.ts`, `shared/paths.ts`, `shared/constants.ts`

---

## Recording Naming Convention

**Format**: `{chapter}-{sequence}-{name}[-{TAGS}].{ext}`

- Chapter: 2 digits, zero-padded (01-99)
- Sequence: 1+ digits (1, 2, 3... no zero-padding)
- Name: kebab-case (a-z, 0-9, hyphens), max 50 chars
- Tags: optional, uppercase-only (CTA, SKOOL, 1ST, V2), space-separated in filename
- Extension: .mov or .mp4

**Examples**:
- `01-1-intro.mov`
- `02-5-epic1-story1-CTA.mov`
- `10-12-demo-setup-SKOOL-V2.mov`

**Key functions** (from `shared/naming.ts`):
- `parseRecordingFilename(filename)` → `{ chapter, sequence, name }` (returns null on parse failure)
- `buildRecordingFilename(chapter, sequence, name, tags?)` → filename string
- `extractTagsFromName(name)` → `{ cleanName, tags[] }`
- `validateLabel(value)` → boolean (kebab-case check)
- `formatChapter(num)` → 2-digit string
- `findNextSequence(items, chapter)` → next available sequence number
- `compareChapterSequence(a, b)` → sort comparator

---

## Key Design Decisions

### Smart rename — never delete+regenerate on rename

**Current behaviour** (`renameRecording.ts`): Phase 1 deletes shadows + transcripts, Phase 2 renames .mov + migrates state, Phase 3 regenerates shadow + queues transcription. This means every rename triggers a ~5-10 minute re-transcription.

**New behaviour**: When renaming (chapter/sequence/name/tags change), derivative files are renamed in-place via `fs.rename`. No deletion, no regeneration, no re-transcription.

**What to rename in-place**:
- Shadow file: `recording-shadows/{oldBase}.mp4` → `recording-shadows/{newBase}.mp4`
- Transcript files: `recording-transcripts/{oldBase}.{txt,srt,json,vtt,tsv}` → same with newBase
- Chapter videos in `-chapters/`: only delete if chapter NUMBER changed (the combined chapter video is now stale). If only name/sequence/tags changed, chapter video is unaffected.

**State migration**: `migrateRecordingKey()` and `updateManifestFilename()` still run as before — these update JSON state, not files.

**Implementation approach**: Replace `deleteDerivableFiles()` + `regenerateDerivableFiles()` with a new `renameDerivableFiles()` function. The `renameRecording()` orchestrator becomes: check queue → `renameDerivableFiles()` → `renameCoreFiles()`. Two phases instead of three.

### Split-chapter with cascade

`POST /api/manage/split-chapter` takes `{ chapter: string, splitAtSequence: number }`.

**Algorithm**:
1. Find all files in the source chapter with sequence >= splitAtSequence
2. Determine target chapter = source chapter + 1 (e.g., ch04 → ch05)
3. **Cascade check**: if target chapter already has files, push ALL chapters from target upward by 1. E.g., if splitting ch04 and ch05/ch06 exist, first rename ch06→ch07, then ch05→ch06, then move split files to ch05.
4. Guard: cascade cannot push any chapter past 98 (ch99 is reserved for swap staging). Reject with error if it would.
5. Move split files to target chapter, renumber sequences starting from 1.
6. Each file rename uses the new smart-rename path (rename derivatives in-place).

### Undo — single last-batch

The server stores the most recent batch rename mapping: `Array<{ oldFilename: string, newFilename: string }>`. One array, replaced on every bulk operation.

`POST /api/manage/undo-rename` reads the stored mapping and reverses each rename (newFilename → oldFilename), including derivatives. Clears the stored mapping after undo (no undo-of-undo).

The bulk-rename endpoint (`POST /api/manage/bulk-rename`) and split-chapter endpoint both store their undo mapping after successful execution.

Client shows a 30-second toast with Undo button. After 30s the toast hides but the server mapping remains until the next batch operation overwrites it.

### Preview — client-side computation

No new server endpoint. The client computes the preview by:
1. Parsing each selected file with `parseRecordingFilename()`
2. Applying the transform (new name, new chapter, new tags, split renumbering)
3. Building the new filename with `buildRecordingFilename()`
4. Checking if the recording has `hasShadow` and/or transcript files (already in recordings list data)
5. Marking green (instant rename) or amber (would need re-transcription — but with smart rename this is always green for rename operations; amber only if audio source somehow changed, which doesn't happen via the UI)

### Sub-component extraction from RecordingsView

RecordingsView.tsx is ~1,040 lines. New functionality adds significant state. Extract:

- `EditableFileRow` — single recording row with clickable segments (chapter, name, tags), inline edit inputs, checkbox, play button, row actions
- `BatchToolbar` — sticky toolbar appearing when files are selected, with action buttons and popover forms
- `PreviewPanel` — full change preview showing old→new for every file + associated derivatives
- `SplitMarker` — amber dashed line inserted between files to show chapter break point
- `UndoToast` — 30s floating bar at bottom of screen after batch operations

RecordingsView becomes the orchestrator: manages selection state, pending changes, and delegates rendering to sub-components.

---

## Work Unit Details

### 1. smart-rename (Wave 1)

**Purpose**: Modify `renameRecording()` to rename derivative files in-place instead of deleting and regenerating them.

**Files to modify**:
- `server/src/utils/renameRecording.ts` — replace delete+regenerate with rename-in-place
- `server/src/test/renameRecording.test.ts` — add tests for smart rename behaviour

**Implementation**:

Add new function `renameDerivableFiles(oldFilename, newFilename, paths)`:
```typescript
export async function renameDerivableFiles(
  oldFilename: string,
  newFilename: string,
  paths: ProjectPaths
): Promise<void> {
  const oldBase = oldFilename.replace(/\.(mov|mp4)$/, '');
  const newBase = newFilename.replace(/\.(mov|mp4)$/, '');

  // Rename shadow file (.mp4 in recording-shadows/)
  const shadowDir = path.join(paths.project, 'recording-shadows');
  await safeRename(
    path.join(shadowDir, `${oldBase}.mp4`),
    path.join(shadowDir, `${newBase}.mp4`)
  );

  // Rename transcript files
  const transcriptExts = ['.txt', '.srt', '.json', '.vtt', '.tsv'];
  await Promise.all(
    transcriptExts.map(ext =>
      safeRename(
        path.join(paths.transcripts, `${oldBase}${ext}`),
        path.join(paths.transcripts, `${newBase}${ext}`)
      )
    )
  );

  // Chapter videos: if chapter number changed, delete old chapter video (it's now stale)
  // If only name/seq/tags changed, chapter video is unaffected
  const oldChapter = oldFilename.match(/^(\d{2})-/)?.[1];
  const newChapter = newFilename.match(/^(\d{2})-/)?.[1];
  if (oldChapter && newChapter && oldChapter !== newChapter) {
    await deleteChapterVideo(oldChapter, paths);
  }
}

// Helper: rename file, ignore ENOENT (file doesn't exist)
async function safeRename(oldPath: string, newPath: string): Promise<void> {
  try {
    await fs.rename(oldPath, newPath);
  } catch (err: any) {
    if (err.code !== 'ENOENT') throw err;
  }
}
```

Modify `renameRecording()` to call `renameDerivableFiles()` instead of `deleteDerivableFiles()` + `regenerateDerivableFiles()`:
```typescript
// Phase 1: Rename derivative files in-place
await renameDerivableFiles(oldFilename, newFilename, paths);

// Phase 2: Rename core files (recording + state migration)
await renameCoreFiles(oldFilename, newFilename, paths);
```

**Keep** `deleteDerivableFiles()` and `regenerateDerivableFiles()` as exports — they're used by the Regen endpoints in manage.ts. Just stop calling them from `renameRecording()`.

**Extract** the chapter video deletion into a standalone helper `deleteChapterVideo(chapter, paths)` so both `deleteDerivableFiles()` and `renameDerivableFiles()` can use it.

**Test targets** (~10 new tests):
- Rename updates shadow file path
- Rename updates all 5 transcript file extensions
- Missing derivative files don't cause errors (ENOENT ignored)
- Chapter number change deletes old chapter video
- Same-chapter rename does NOT delete chapter video
- State migration still works (existing tests should pass unchanged)

**Done when**:
- `npm test -w server` passes
- `npm run build -w server` passes
- Existing renameRecording tests still pass (backwards compatible)
- New tests cover derivative rename behaviour

---

### 2. split-chapter (Wave 1)

**Purpose**: New endpoint to split a chapter at a given sequence number, with cascade renumbering of higher chapters.

**Files to modify**:
- `server/src/routes/manage.ts` — add `POST /api/manage/split-chapter` endpoint
- `shared/types.ts` — add request/response types
- `server/src/test/manage.ts.test.ts` — add tests

**Types** (add to `shared/types.ts`):
```typescript
// B047: Recording Editor — split chapter types
export interface SplitChapterRequest {
  chapter: string;          // source chapter, e.g. "04"
  splitAtSequence: number;  // files with seq >= this move to new chapter
}

export interface SplitChapterResponse {
  success: boolean;
  sourceChapter: string;
  newChapter: string;
  filesMoved: number;
  cascadedChapters: number; // how many existing chapters were pushed up
  undoMapping: Array<{ oldFilename: string; newFilename: string }>;
  error?: string;
}
```

**Algorithm** (in manage.ts):
```
1. Parse chapter, validate splitAtSequence
2. Read all recordings in project
3. Find files in source chapter — partition into:
   - keepFiles: sequence < splitAtSequence (stay in source chapter)
   - moveFiles: sequence >= splitAtSequence (move to new chapter)
4. Determine targetChapter = parseInt(chapter) + 1
5. CASCADE: find all chapters >= targetChapter that have files
   - Sort descending (highest first)
   - Guard: if highest + cascadeCount >= 99, reject with error
   - For each, rename ch(N) → ch(N+1) using renameRecording()
6. Rename moveFiles to targetChapter, sequence 1, 2, 3...
7. Store undoMapping (all renames from cascade + split)
8. Emit socket recordings:changed
9. Return SplitChapterResponse
```

**Important**: use the updated `renameRecording()` (from smart-rename work unit) which renames derivatives in-place. If smart-rename hasn't landed yet, the existing delete+regenerate still works — just slower.

**Test targets** (~12 new tests):
- Basic split: ch04 seq 11+ → ch05 (no cascade)
- Split with cascade: ch04 split when ch05 exists → ch05 pushed to ch06
- Multi-cascade: ch04 split when ch05, ch06, ch07 exist → all pushed up
- Guard: reject if cascade would push past ch98
- Sequences renumbered starting from 1
- Empty split (no files >= splitAtSequence) → error
- Invalid chapter → error
- Returns correct undoMapping
- Socket event emitted

**Done when**:
- `npm test -w server` passes
- `npm run build -w server` passes
- New tests cover cascade, guard, and edge cases

---

### 3. undo-rename (Wave 1)

**Purpose**: Store last batch rename mapping and provide an endpoint to reverse it.

**Files to modify**:
- `server/src/routes/manage.ts` — add undo storage, modify bulk-rename to store mapping, add `POST /api/manage/undo-rename` endpoint
- `shared/types.ts` — add response type
- `server/src/test/manage.ts.test.ts` — add tests

**Types** (add to `shared/types.ts`):
```typescript
// B047: Recording Editor — undo types
export interface UndoRenameResponse {
  success: boolean;
  filesReverted: number;
  error?: string;
}
```

**Server-side storage** (module-level in manage.ts, alongside existing `recentRenames`):
```typescript
// B047: Last batch undo mapping — single array, replaced on every bulk operation
let lastBatchMapping: Array<{ oldFilename: string; newFilename: string }> = [];
```

**Modify** `POST /api/manage/bulk-rename`:
- After successful renames, store the mapping: `lastBatchMapping = results.map(r => ({ oldFilename: r.old, newFilename: r.new }))`
- Return the mapping in the response (client needs it for preview)

**Modify** `POST /api/manage/split-chapter` (from split-chapter work unit):
- After successful split, store `lastBatchMapping = undoMapping`

**New endpoint** `POST /api/manage/undo-rename`:
```
1. If lastBatchMapping is empty, return { success: false, error: 'Nothing to undo' }
2. Reverse the array (undo in reverse order to avoid conflicts)
3. For each { oldFilename, newFilename }: call renameRecording(newFilename, oldFilename, ...)
4. Clear lastBatchMapping
5. Emit socket recordings:changed
6. Return { success: true, filesReverted: count }
```

**Test targets** (~8 new tests):
- Undo after bulk-rename reverts all files
- Undo with empty mapping returns error
- Undo clears the mapping (second undo fails)
- New bulk-rename overwrites previous undo mapping
- Undo reverses in correct order

**Done when**:
- `npm test -w server` passes
- `npm run build -w server` passes
- Undo correctly reverses a bulk rename operation

---

### 4. selection-and-editing (Wave 2)

**Purpose**: Extract RecordingsView into sub-components. Add selection state, inline editing, and batch toolbar.

**Files to create**:
- `client/src/components/shared/EditableFileRow.tsx`
- `client/src/components/shared/BatchToolbar.tsx`

**Files to modify**:
- `client/src/components/RecordingsView.tsx` — extract file row rendering, add selection state management, add inline editing state
- `client/src/hooks/useManageApi.ts` — add `useSplitChapter()`, `useUndoRename()` hooks
- `client/src/hooks/useApi.ts` — re-export new hooks

**Sub-component: EditableFileRow**

Props:
```typescript
interface EditableFileRowProps {
  recording: RecordingFile;
  isSelected: boolean;
  onToggleSelect: (filename: string) => void;
  onInlineEdit: (filename: string, field: 'chapter' | 'name', newValue: string) => void;
  onTagRemove: (filename: string, tag: string) => void;
  onPlay: (filename: string) => void;
  onSplitHere: (filename: string) => void;
  onPark: (filename: string) => void;
  onSafe: (filename: string) => void;
  pendingChange?: { oldFilename: string; newFilename: string }; // from preview state
}
```

Renders:
- Checkbox (toggle selection)
- Play button
- Filename segments: chapter (clickable → inline input), dash, sequence, dash, name (clickable → inline input), tags (clickable → remove on x, clickable tag for edit), extension
- Row actions on hover: Split Here (scissors), Park, Safe
- If pendingChange: show old→new with green change arrow
- Inline edit state: `editingField: 'chapter' | 'name' | null`, shows input with Enter/Escape

**Sub-component: BatchToolbar**

Props:
```typescript
interface BatchToolbarProps {
  selectedCount: number;
  selectedChapterInfo: string; // e.g. "Chapter 02" or "Chapters 02, 03"
  onRename: (newName: string) => void;
  onMoveToChapter: (chapter: string) => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  onSplitHere: () => void;
  onDeselectAll: () => void;
}
```

Renders:
- Sticky blue toolbar (position: sticky, top: 0, z-index: 50)
- "{N} files selected" + chapter info
- Buttons: Rename, Move to Ch..., +Tag, -Tag, Split Here
- Each button opens a small popover form (inline, not a modal)
- Deselect All button (right side)
- Only visible when selectedCount > 0

**RecordingsView changes**:
- New state: `selectedFiles: Set<string>`, `pendingChanges: Map<string, { old, new }>`, `splitPoint: { chapter, sequence } | null`
- Replace inline file row JSX with `<EditableFileRow>` component
- Add `<BatchToolbar>` above chapter groups (conditionally rendered)
- Chapter header gets "Select XX" button that toggles all files in that chapter
- Single-file inline edit: click segment → inline input → Enter calls existing rename endpoint directly (no batch, no preview needed for single file edits)
- Batch actions: set `pendingChanges` map → triggers preview panel (next work unit)

**Hooks to add** (`useManageApi.ts`):
```typescript
export function useSplitChapter() {
  return useMutation({
    mutationFn: async (req: SplitChapterRequest) => {
      const res = await fetch(`${API_URL}/api/manage/split-chapter`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      });
      if (!res.ok) throw new Error(`Split failed: ${res.status}`);
      return res.json() as Promise<SplitChapterResponse>;
    },
  });
}

export function useUndoRename() {
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_URL}/api/manage/undo-rename`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error(`Undo failed: ${res.status}`);
      return res.json() as Promise<UndoRenameResponse>;
    },
  });
}
```

**Test approach**: This is a client UI work unit. Ensure:
- `npm run build -w client` passes (no type errors)
- `npm test -w client` passes (existing tests unbroken)
- Manual verification via mockup comparison

**Done when**:
- `npm run build -w client` passes
- `npm test -w client` passes
- `npm test -w server` still passes (no server changes break)
- RecordingsView renders EditableFileRow for each recording
- Checkbox selection works (single + select-all-chapter)
- BatchToolbar appears on selection with all action buttons
- Inline editing (click chapter/name → input → Enter/Escape) works for single files
- Popover forms for batch rename / move-to-chapter / add-tag / remove-tag

---

### 5. preview-and-cleanup (Wave 2)

**Purpose**: Preview panel showing all changes before applying. Split marker UI. Undo toast. Remove old Manage panel rename tools.

**Files to create**:
- `client/src/components/shared/PreviewPanel.tsx`
- `client/src/components/shared/SplitMarker.tsx`
- `client/src/components/shared/UndoToast.tsx`

**Files to modify**:
- `client/src/components/RecordingsView.tsx` — add preview panel, split marker, undo toast integration
- `client/src/components/ManagePanel.tsx` — remove Rename/Renumber tool references
- `client/src/components/shared/ToolsSidebar.tsx` — remove Rename/Renumber entries

**Files to delete**:
- `client/src/components/shared/RenamePanel.tsx`
- `client/src/components/shared/ChapterListPanel.tsx`
- `client/src/components/RenameLabelModal.tsx`
- `client/src/components/shared/RenameTool.tsx`
- `client/src/components/shared/RenumberTool.tsx`

**Sub-component: PreviewPanel**

Props:
```typescript
interface PreviewPanelProps {
  changes: Array<{
    oldFilename: string;
    newFilename: string;
    hasShadow: boolean;
    hasTranscripts: boolean;
    needsReTranscription: boolean; // always false for rename-only operations
  }>;
  splitInfo?: { sourceChapter: string; newChapter: string };
  onApply: () => void;
  onCancel: () => void;
}
```

Renders per mockup Scene 4:
- Header: "Review N changes" + badge counts (green instant / amber re-transcription)
- Body: grouped by operation type, each row shows old→new + associated file note
- Green dot = instant rename (always, with smart rename)
- Amber dot = re-transcription needed (rare edge case, included for future-proofing)
- Footer: legend + Cancel / Apply buttons

**Client-side preview computation** (in RecordingsView or a utility):
```typescript
function computePreview(
  selectedFiles: RecordingFile[],
  transform: { newName?: string; newChapter?: string; newTags?: string[]; removeTags?: string[] },
  allRecordings: RecordingFile[]
): PreviewChange[] {
  return selectedFiles.map(file => {
    const parsed = parseRecordingFilename(file.name);
    if (!parsed) return null;
    const newFilename = buildRecordingFilename(
      transform.newChapter || parsed.chapter,
      /* compute new sequence */,
      transform.newName || parsed.name,
      /* compute new tags */
    );
    return {
      oldFilename: file.name,
      newFilename,
      hasShadow: file.hasShadow,
      hasTranscripts: /* check from recording data */,
      needsReTranscription: false, // rename never needs re-transcription
    };
  }).filter(Boolean);
}
```

**Sub-component: SplitMarker**

Props:
```typescript
interface SplitMarkerProps {
  newChapter: string;
  fileCount: number;
  onRemove: () => void;
}
```

Renders per mockup Scene 3:
- Amber dashed line (CSS repeating-linear-gradient)
- Label: "Split → New Chapter {XX} starts here ({N} files, renumbered 1-N)"
- Remove button (x icon)

Inserted between file rows in RecordingsView when `splitPoint` state is set.

**Sub-component: UndoToast**

Props:
```typescript
interface UndoToastProps {
  message: string;         // e.g. "Renamed 8 files (split ch04 → ch04 + ch05)"
  onUndo: () => void;
  durationMs?: number;     // default 30000
}
```

Renders per mockup Scene 5:
- Fixed position bottom center
- Dark background, white text
- Message + Undo button + countdown timer
- Auto-hides after duration
- Internal timer state with 1s interval

**Cleanup — remove old components**:

1. Delete files: `RenamePanel.tsx`, `ChapterListPanel.tsx`, `RenameLabelModal.tsx`, `RenameTool.tsx`, `RenumberTool.tsx`
2. In `ToolsSidebar.tsx`: remove "Rename" and "Renumber" entries from the sidebar items array
3. In `ManagePanel.tsx`: remove the `ActiveTool` cases for 'rename' and 'renumber', remove imports for deleted components
4. Remove any `useRenameChapter` or related hooks if they become unused
5. Remove the "(Use Manage panel to rename)" hint from RecordingsView chapter headers (if it still exists)

**After cleanup**: run `npm run build -w client` to verify no dangling imports.

**Test approach**: Client UI work unit. Ensure:
- `npm run build -w client` passes (no type errors, no dangling imports)
- `npm test -w client` passes
- Deleted components have no remaining references

**Done when**:
- `npm run build -w client` passes
- `npm test -w client` passes
- `npm test` (all workspaces) passes
- PreviewPanel renders all changes with old→new and green/amber dots
- SplitMarker renders between correct file rows
- UndoToast appears after batch operations with 30s countdown
- Old components deleted, ToolsSidebar and ManagePanel updated
- No dangling imports or references to deleted components

---

## Success Criteria (All Work Units)

Before marking any work unit complete, verify ALL of these:

1. **TypeScript compiles**: `npm run build -w server` and `npm run build -w client` both pass with zero errors
2. **Tests pass**: `npm test` passes across all workspaces (925+ existing tests must not break)
3. **New tests written**: every new exported function has at least 1 test
4. **No `any` types**: all new code is fully typed
5. **No shell injection**: use `execFile` with args array if spawning processes (not applicable for this campaign but a standing rule)
6. **Config via getter**: access config through `() => getConfig()` pattern, never cache
7. **Socket events**: emit `recordings:changed` after any file rename operation
8. **Naming convention**: use `parseRecordingFilename()` and `buildRecordingFilename()` from shared/naming.ts — never hand-parse filenames with regex

---

## Anti-Patterns to Avoid

- **DO NOT** call `deleteDerivableFiles()` + `regenerateDerivableFiles()` in the rename path — use `renameDerivableFiles()` instead
- **DO NOT** re-implement filename parsing — always use `shared/naming.ts` functions
- **DO NOT** hand-build filenames with string concatenation — use `buildRecordingFilename()`
- **DO NOT** use `fs` (Node built-in) — use `fs-extra` which is the project standard
- **DO NOT** start the dev server in a test or agent — build and test only
- **DO NOT** modify files listed in DO NOT MODIFY section
- **DO NOT** add snapshot tests — this project uses assertion-based tests only
- **DO NOT** use `window.location.reload()` — use React Query cache invalidation + Socket.io events
- **DO NOT** add `any` types — fully type all new code
- **DO NOT** create modals for batch operations — use inline popovers per the mockup

---

## Mock Patterns (for Tests)

Server tests mock `fs-extra` (not `fs/promises`):
```typescript
vi.mock('fs-extra', () => ({
  default: {
    rename: vi.fn().mockResolvedValue(undefined),
    unlink: vi.fn().mockResolvedValue(undefined),
    pathExists: vi.fn().mockResolvedValue(true),
    readdir: vi.fn().mockResolvedValue([]),
    readJson: vi.fn().mockResolvedValue({}),
    writeJson: vi.fn().mockResolvedValue(undefined),
    ensureDir: vi.fn().mockResolvedValue(undefined),
  },
}));
```

Server route tests use `supertest`:
```typescript
import request from 'supertest';
import express from 'express';

const app = express();
app.use(express.json());
// Wire routes...

const res = await request(app).post('/api/manage/split-chapter').send({ chapter: '04', splitAtSequence: 11 });
expect(res.status).toBe(200);
expect(res.body.success).toBe(true);
```

Client tests use `@testing-library/react` + `vitest`:
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
```

---

## Quality Gates

- `npm run build -w server && npm run build -w client` — zero TypeScript errors
- `npm test` — all tests pass (925+ existing + new tests)
- No dangling imports after cleanup (verify with build)
- Manual verification: compare implemented UI against mockup scenes 1-6

---

## Reference Files (Read These)

- `.mochaccino/designs/recording-editor/index.html` — the mockup (6 scenes)
- `server/src/utils/renameRecording.ts` — current rename implementation (modify)
- `server/src/routes/manage.ts` — existing rename/chapter endpoints (modify)
- `client/src/components/RecordingsView.tsx` — current recordings page (major modify)
- `client/src/components/shared/RenamePanel.tsx` — current rename UI (delete after cleanup)
- `client/src/components/shared/ChapterListPanel.tsx` — current chapter list (delete after cleanup)
- `shared/naming.ts` — naming convention parser/builder (read only)
- `shared/types.ts` — shared TypeScript interfaces (modify)

---

## Learnings

(Updated by coordinator as waves complete)
