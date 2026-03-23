# IMPLEMENTATION_PLAN.md — Recording Editor (B047)

**Goal**: Move all rename/renumber/split functionality inline on the Recordings page. Edit where you see the problem. Replace Manage panel rename tools.
**Started**: 2026-03-23
**Target**: Clickable filename segments, batch toolbar, chapter split, full preview, 30s undo, smart rename (no re-transcription), old Manage rename tools removed.

## Summary
- Total: 5 | Complete: 5 | In Progress: 0 | Pending: 0 | Failed: 0

## Pending

## In Progress

## Complete

- [x] smart-rename — Replaced delete+regenerate with rename-in-place. New `renameDerivableFiles()` function renames shadows + 5 transcript extensions via `fs.rename`. `deleteChapterVideo()` extracted as standalone helper. `renameRecording()` simplified to 2-phase (rename derivatives → rename core). `queueTranscription` parameter removed from signature + all 5 callers updated. +10 new tests.
- [x] split-chapter — New `POST /api/manage/split-chapter` endpoint. Cascade renumbering (highest-first to avoid collisions). Ch99 guard. Sequences renumbered from 1. Returns undoMapping. +12 new tests.
- [x] undo-rename — Module-scoped `lastBatchMapping` stores last batch. `POST /api/manage/undo-rename` reverses in reverse order, clears mapping. `bulk-rename` now stores mapping + returns `undoAvailable: true`. +8 new tests.
- [x] selection-and-editing — Extracted RecordingsView into sub-components (EditableFileRow 387 lines, BatchToolbar 321 lines). Selection state (Set<string>), select-all-chapter toggle. Inline editing: click chapter/name → input → Enter/Escape. Batch toolbar with Rename/MoveToChapter/AddTag/RemoveTag/SplitHere popovers. New useEditingApi.ts hooks (useBulkRename, useRenameRecording, useSplitChapter, useBatchUndoRename). "(Use Manage panel to rename)" hint replaced with "Select XX" button.
- [x] preview-and-cleanup — PreviewPanel (blue-bordered, grouped changes, green/amber dots, Apply/Cancel). SplitMarker (amber dashed line between files at split point). UndoToast (30s countdown, fixed bottom center). pendingOperation state tracks batch params. Deleted RenamePanel, ChapterListPanel, RenameLabelModal. Removed rename/renumber from ToolsSidebar and ManagePanel ActiveTool. chapterUtils.ts extracted for reuse. ToolsSidebar tests updated.

## Failed / Needs Retry

## Notes & Decisions
- Wave 1: smart-rename, split-chapter, undo-rename (server — ran in parallel, no file conflicts)
- Wave 2: selection-and-editing then preview-and-cleanup (both touch RecordingsView — ran sequentially)
- Smart rename rule: renaming chapter/sequence/name/tags never changes audio → always rename derivatives in-place, never delete+regenerate. Only explicit Regen button triggers re-transcription.
- Split cascade: splitting ch04 at seq 11 creates ch05. If ch05 already exists, push ch05→ch06, ch06→ch07, etc. before moving split files.
- Preview is computed client-side — no new server endpoint.
- Undo scope: single last-batch only. Server stores the old→new mapping. Client shows 30s toast.
- Chapter 99 guard from swap-chapters applies to split cascade too.
- Final stats: 1,042 total tests (800 server + 162 client + 80 shared), all passing. Build clean.
