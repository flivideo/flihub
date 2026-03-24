# Architectural Review: B047 Recording Editor

**Date**: 2026-03-24
**Scope**: All B047 changes (smart-rename, split-chapter, undo-rename, selection-and-editing, preview-and-cleanup)
**Reviewer**: Claude Opus 4.6

---

## Data Flow Overview

```
User action (click/batch)
       |
       v
RecordingsView (orchestrator, 1399 lines)
   |-- selection state (Set<string>)
   |-- pendingChanges (Map<string, {old, new}>)
   |-- pendingOperation (type + params)
   |-- splitPoint (chapter + afterSequence)
       |
       v
[BatchToolbar]  -->  popover form  -->  set pendingChanges + pendingOperation
       |
       v
[PreviewPanel]  -->  Apply button  -->  handleApplyChanges()
       |
       v
useEditingApi hooks (useBulkRename / useSplitChapter)
       |
       v
Server: manage.ts endpoints
   |-- POST /api/manage/bulk-rename  -->  renameRecording() per file
   |-- POST /api/manage/split-chapter  -->  cascade + renameRecording()
   |-- POST /api/manage/undo-rename  -->  reverse lastBatchMapping
       |
       v
renameRecording.ts
   |-- Phase 1: renameDerivableFiles() (shadows, transcripts, chapter videos)
   |-- Phase 2: renameCoreFiles() (recording file + state migration)
       |
       v
Socket.io: recordings:changed  -->  React Query invalidation
```

---

## CRITICAL

### C1. Split-chapter does not store undo mapping

**File**: `server/src/routes/manage.ts` (line ~1528-1540)

The `split-chapter` endpoint computes `undoMapping` and returns it in the response, but **never writes it to `lastBatchMapping`**. This means:
- After a split, clicking "Undo" in the UndoToast calls `POST /api/manage/undo-rename`
- The server responds `{ success: false, error: "Nothing to undo" }`
- If a bulk-rename was the previous operation, undo would revert *that* instead of the split

The `IMPLEMENTATION_PLAN.md` and `AGENTS.md` both explicitly state the split-chapter endpoint should store `lastBatchMapping = undoMapping`. This was missed.

**Fix**: Add `lastBatchMapping = undoMapping;` after the split loop completes (before the `io.emit`).

### C2. handleApplyChanges parses newFilename with a fragile regex

**File**: `client/src/components/RecordingsView.tsx` (lines 852-857)

```typescript
const newFilenameMatch = firstChange.newFilename.match(
  /^(\d{2})-\d+-(.+?)(?:-([A-Z0-9]+(?:-[A-Z0-9]+)*))?\.(\w+)$/
);
```

This hand-rolls filename parsing instead of using `parseRecordingFilename()` from `shared/naming.ts`. The regex differs from the canonical parser and will break on:
- Names containing uppercase substrings that look like tags (e.g. `demo-CTA-walkthrough`)
- Multi-word tags with hyphens between them

The AGENTS.md anti-patterns section explicitly says: "DO NOT re-implement filename parsing -- always use `shared/naming.ts` functions."

**Fix**: Replace the regex with `parseRecordingFilename(firstChange.newFilename)` and `extractTagsFromName()`.

---

## MAJOR

### M1. RecordingsView is 1399 lines -- still a monolith

The extraction of EditableFileRow (387 lines) and BatchToolbar (321 lines) was a good start, but RecordingsView still contains:
- ~20 `useCallback` handlers for single-file and batch operations
- 5 batch change computation functions (handleBatchRename, handleBatchMoveToChapter, handleBatchAddTag, handleBatchRemoveTag, handleSplitHere)
- Preview computation logic
- Chapter header rendering with 8+ action buttons per chapter
- 3 modal state variables + rendering

The component holds 12 pieces of state and passes 15+ props to EditableFileRow. This will become harder to modify as new batch operations are added.

```
RecordingsView (1399 lines)
 ├─ State: 12 useState calls
 ├─ Handlers: ~20 useCallback functions (~400 lines)
 ├─ Memos: 7 useMemo computations
 ├─ Effects: 2 useEffect
 ├─ JSX: chapter headers + file rows + modals + toolbar + preview
 └─ Delegated to:
      ├─ EditableFileRow (387 lines) -- good extraction
      ├─ BatchToolbar (321 lines) -- good extraction
      ├─ PreviewPanel (159 lines) -- clean
      ├─ SplitMarker (38 lines) -- clean
      └─ UndoToast (58 lines) -- clean
```

**Recommendation**: Extract a `useRecordingEditor()` custom hook containing all B047 state + handlers. RecordingsView becomes ~800 lines of layout/rendering.

### M2. `groupByChapter` and `getChapterDisplayName` are tripled

Three separate implementations exist:
1. `client/src/components/RecordingsView.tsx` (lines 57-100) -- returns `Map<string, ChapterGroup>`
2. `client/src/components/ManagePanel.tsx` (lines 40-76, exported) -- returns `ChapterGroup[]`
3. `client/src/components/WatchPage.tsx` (lines 88-133) -- different interface shape

The plan mentioned extracting `chapterUtils.ts`, which exists but only contains `extractChapters()` and `detectGaps()` -- the core grouping functions were not moved there. Tests in `managePanelUtils.test.ts` import from `ManagePanel.tsx`.

**Fix**: Consolidate into `client/src/utils/chapterUtils.ts` with a single canonical implementation. The three callers need slightly different shapes, which can be handled by a common base + thin adapters.

### M3. EditableFileRow receives 15 props including 3 formatting functions

**File**: `client/src/components/shared/EditableFileRow.tsx` (lines 18-37)

The component receives `formatDuration`, `formatFileSize`, and `formatTimestamp` as props. These are pure utility functions imported from `client/src/utils/formatting.ts` -- they have no instance-specific behavior and should be imported directly by EditableFileRow.

This pattern:
- Inflates the component's prop surface unnecessarily
- Creates coupling between parent and child on stable utility signatures
- Would need to be repeated in every consumer of EditableFileRow

**Fix**: Import formatting utilities directly in EditableFileRow. Remove the 3 props.

### M4. Preview transcriptCount is hardcoded to 5

**File**: `client/src/components/RecordingsView.tsx` (line 907)

```typescript
transcriptCount: 5,
```

Every file is reported as having 5 transcript files regardless of what actually exists. The `RecordingFile` type has `hasShadow` but no `transcriptExtensions` or similar field. The PreviewPanel shows this count as "5 transcripts" for every row.

**Impact**: Cosmetic for now (the green/amber dot logic works correctly), but misleading.

**Fix**: Either remove the count from the preview display, or add transcript presence data to the `RecordingFile` type on the server.

### M5. Undo is module-scoped -- lost on server restart, not multi-user safe

**File**: `server/src/routes/manage.ts` (line 46)

```typescript
let lastBatchMapping: Array<{ oldFilename: string; newFilename: string }> = [];
```

The undo mapping lives in a single `let` variable. This means:
- Server restart loses the undo state (no persistence)
- If two browser tabs do batch operations, the second overwrites the first's undo mapping
- No way to inspect or recover the mapping after 30 seconds (toast hides but server mapping persists silently until overwritten)

This is documented as a deliberate design choice ("single last-batch only"). It works for the single-user workflow today, but will break if David opens multiple tabs or if the server restarts mid-session.

**Not blocking for V1**, but worth noting for next wave.

---

## MINOR

### m1. Batch change handlers share identical structure

**File**: `client/src/components/RecordingsView.tsx` (lines 702-803)

The five `handleBatch*` functions follow the same pattern:
1. Create a Map
2. Filter selected recordings
3. For each, compute new filename using `buildRecordingFilename()`
4. Set pendingChanges and pendingOperation
5. Toast if no changes

This could be a single `computeBatchChanges(transform)` function with a transform descriptor.

### m2. `selectAllInChapter` dependency array uses eslint-disable

**File**: `client/src/components/RecordingsView.tsx` (lines 627-628)

```typescript
// eslint-disable-next-line react-hooks/exhaustive-deps
[data?.recordings, showSafe, showParked]
```

The callback references `filteredRecordings` (a `useMemo` value) but lists `data?.recordings, showSafe, showParked` as deps instead. This works because those are the inputs to `filteredRecordings`, but it's fragile if the memo's inputs change.

**Fix**: Use `filteredRecordings` directly in the deps (it's stable via useMemo).

### m3. `rename-chapter` and `swap-chapters` endpoints do not store undo mapping

These pre-B047 endpoints perform bulk renames but do not populate `lastBatchMapping`. If a user does a chapter swap via the Manage panel and then tries to undo from the Recordings page, it either does nothing or undoes a stale operation.

**Fix**: Either add `lastBatchMapping` storage to these endpoints, or accept they are outside undo scope and document it.

### m4. UndoToast `onExpire` in useEffect dependency could cause stale closure

**File**: `client/src/components/shared/UndoToast.tsx` (line 41)

```typescript
}, [onExpire]);
```

If the parent re-renders and `onExpire` changes identity (it's an inline `() => setUndoMessage(null)` in RecordingsView), the interval restarts. In practice this works because the parent is stable, but it's a latent bug.

**Fix**: Use `useRef` for `onExpire` to avoid interval restart on callback identity change.

### m5. manage.ts is 1556 lines and growing

The manage routes file handles regen-shadows, regen-transcripts, regen-chapters, regen-all, rename-chapter, swap-chapters, bulk-rename, undo-rename, split-chapter, and several internal helpers. It's the largest route file in the server.

**Recommendation**: Extract split/undo logic into `server/src/routes/manage-editing.ts` or similar in a future wave.

---

## STRENGTHS

### S1. Smart rename is a significant architectural improvement

Replacing delete+regenerate with `renameDerivableFiles()` eliminates 5-10 minute re-transcription delays on every rename. The `safeRename()` helper with ENOENT swallowing is clean and robust. The two-phase approach (derivatives then core) is easy to reason about.

### S2. EditableFileRow extraction is well-bounded

The component has clear responsibilities: rendering, inline edit state, validation via shared `validateChapter`/`validateLabel`. It does not make API calls directly -- it delegates up via callbacks. This makes it testable and reusable.

### S3. PreviewPanel is stateless and clean

No internal state, no side effects, pure rendering. The grouped-by-chapter display with green/amber dots maps directly to the mockup. Easy to test, easy to extend.

### S4. Server-side undo architecture is simple and correct (modulo C1)

The reverse-order undo avoids naming collisions. Using `renameRecording()` for undo ensures derivatives are handled consistently. The "single last batch" constraint is clearly documented and appropriate for the workflow.

### S5. Inline editing validation uses shared naming functions

Both `EditableFileRow` and `BatchToolbar` call `validateChapter()` and `validateLabel()` from `shared/naming.ts`. This ensures validation rules are consistent between inline edits and batch operations.

### S6. Socket events ensure UI consistency

Every server-side mutation emits `recordings:changed`, which triggers React Query invalidation. This means multi-tab scenarios at least see fresh data (even if undo state is per-process).

---

## RECOMMENDATIONS FOR NEXT WAVE

### R1. Extract `useRecordingEditor` hook (addresses M1)

Move all B047 state and handlers into a custom hook:

```
client/src/hooks/useRecordingEditor.ts
  - selectedFiles, pendingChanges, splitPoint, undoMessage, pendingOperation
  - toggleSelect, selectAllInChapter, deselectAll
  - handleBatchRename, handleBatchMoveToChapter, handleBatchAddTag, handleBatchRemoveTag
  - handleSplitHere, handleSplitHereFromRow
  - handleApplyChanges, handleCancelChanges, handleUndo
  - computePreviewChanges
  - handleInlineRename, handleTagRemove

RecordingsView receives the hook return and renders.
Target: RecordingsView drops to ~700 lines.
```

### R2. Consolidate chapter grouping utilities (addresses M2)

```
client/src/utils/chapterUtils.ts
  - groupByChapter(recordings) -> base implementation
  - getChapterDisplayName(files)
  - addCumulativeTiming(groups)  (currently in RecordingsView)
  - extractChapters(), detectGaps()  (already here)

Update: RecordingsView, ManagePanel, WatchPage to import from here.
Update: managePanelUtils.test.ts to import from chapterUtils.ts.
```

### R3. Fix C1 before shipping (split undo)

Single line: `lastBatchMapping = undoMapping;` in split-chapter endpoint. This is the only functional bug found.

### R4. Fix C2 before shipping (regex parsing)

Replace the hand-rolled regex in `handleApplyChanges` with `parseRecordingFilename()`. This prevents a class of subtle naming bugs.

### R5. Consider context for selection state if editing grows

If future waves add:
- Multi-chapter batch operations with drag-and-drop reordering
- Keyboard shortcuts for selection (Shift+click, Ctrl+A)
- Selection persistence across tab switches

Then selection state should move to a React Context to avoid prop drilling through RecordingsView to EditableFileRow. For now, the current pattern is adequate.

### R6. Server: split manage.ts when adding next endpoint

At 1556 lines, manage.ts is at its practical limit. The next server-side feature (e.g., sequence reorder, drag-to-resequence) should trigger a split into:

```
server/src/routes/
  manage.ts           (regen endpoints, existing chapter operations)
  manage-editing.ts   (bulk-rename, split-chapter, undo-rename)
```

### R7. Remove formatting function props from EditableFileRow

Direct imports reduce prop surface from 15 to 12 and eliminate a category of unnecessary coupling.

---

## Summary

| Category | Count | Items |
|----------|-------|-------|
| Critical | 2 | C1 split undo not stored, C2 fragile regex parsing |
| Major | 5 | M1 monolith, M2 duplicated utils, M3 prop drilling, M4 hardcoded count, M5 undo fragility |
| Minor | 5 | m1 handler duplication, m2 eslint-disable, m3 old endpoints no undo, m4 stale closure, m5 manage.ts size |
| Strengths | 6 | Smart rename, EditableFileRow, PreviewPanel, undo design, shared validation, socket events |

**Overall assessment**: The B047 implementation is structurally sound. The component extraction was well-directed and the server-side smart-rename is a clear improvement. Two critical issues (C1, C2) should be fixed before the feature ships. The major items are all manageable in a cleanup wave and none blocks further development.
