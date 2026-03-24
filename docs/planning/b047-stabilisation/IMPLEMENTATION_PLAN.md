# IMPLEMENTATION_PLAN.md — B047 Stabilisation

**Goal**: Fix 4 critical/high bugs found by 3-lens audit on the B047 Recording Editor campaign. Prevent data loss in split-chapter, fix broken undo, replace fragile regex parsing.
**Started**: 2026-03-24
**Target**: All 4 audit findings resolved with tests. Zero regressions.

## Summary
- Total: 3 | Complete: 3 | In Progress: 0 | Pending: 0 | Failed: 0

## Pending

## In Progress

## Complete

### Wave 2
- [x] undo-validation — B053: Added fs.pathExists check before each undo revert. Stale files skipped with clear error message. +4 new tests. 818 server tests pass.

### Wave 1 (parallel — different files)
- [x] split-chapter-fixes — B050+B051: Fixed tag loss in cascade/move renaming (extractTagsFromName added to chapterMap, tags passed to buildRecordingFilename). Stored undoMapping in lastBatchMapping. +5 new tests. 810 server tests pass.
- [x] apply-changes-parser — B052: Replaced hand-rolled regex in handleApplyChanges with parseRecordingFilename() + extractTagsFromName(). 162 client tests pass.

## Complete

## Failed / Needs Retry

## Notes & Decisions
- B050+B051 combined into one work unit — both touch the split-chapter endpoint within 10 lines of each other
- B053 runs in wave 2 because it modifies manage.ts (same file as split-chapter-fixes)
- B052 is client-only (RecordingsView.tsx) — safe to parallel with wave 1 server work
- The split-chapter tag bug: `parseRecordingFilename` strips tags via `stripTrailingTags`, so `file.name` never contains tags. Must extract tags from the original filename and pass them to `buildRecordingFilename`.
- The undo validation: `renameRecording` will return `{ success: false }` on ENOENT anyway, but the error message is confusing. Better to detect the stale filename upfront and return a clear "file was modified since batch" message.
