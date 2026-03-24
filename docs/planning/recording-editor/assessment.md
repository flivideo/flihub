# Assessment: Recording Editor (B047)

**Campaign**: recording-editor
**Date**: 2026-03-23 → 2026-03-24
**Results**: 5 complete, 0 failed
**Quality audit**: code-quality + test-quality + architectural-review (2026-03-24)

## Results Summary

| Work Unit | Outcome |
|-----------|---------|
| smart-rename | Replaced delete+regenerate with rename-in-place. `renameDerivableFiles()` renames shadows + 5 transcript extensions. +10 tests. |
| split-chapter | `POST /api/manage/split-chapter` with cascade renumbering (highest-first). Ch99 guard. +12 tests. |
| undo-rename | Module-scoped `lastBatchMapping`. Reverse-order undo. +8 tests. |
| selection-and-editing | Extracted EditableFileRow (387 lines) + BatchToolbar (321 lines). Selection state, inline editing, batch popovers. |
| preview-and-cleanup | PreviewPanel, SplitMarker, UndoToast. Deleted RenamePanel, ChapterListPanel, RenameLabelModal. Removed rename/renumber from ToolsSidebar. |

## What Worked Well

1. **Smart rename architecture** — two-phase approach (derivatives then core) eliminates 5-10 minute re-transcription delays. `safeRename()` with ENOENT swallowing is clean and robust.
2. **Component extraction** — EditableFileRow and BatchToolbar are well-bounded with clear responsibilities and shared validation via `naming.ts`.
3. **Server endpoint design** — cascade ordering (descending to avoid collisions), ch99 boundary guard, reverse-order undo all prevent subtle data corruption bugs.
4. **Deletion of dead UI** — removing RenamePanel, ChapterListPanel, RenameLabelModal and the ToolsSidebar rename tools cleans up significant surface area.
5. **Wave structure** — server-first (wave 1: 3 parallel agents) then client (wave 2: sequential due to shared files) was the right split.

## What Didn't Work

1. **Split-chapter does not store undo mapping** (C1 — code-quality + architecture) — `lastBatchMapping = undoMapping` was specified in both IMPLEMENTATION_PLAN.md and AGENTS.md but missed in implementation. Undo after split silently fails.
2. **handleApplyChanges uses hand-rolled regex** (C2 — code-quality + architecture) — duplicates parsing that exists in `shared/naming.ts`, breaks on names with uppercase substrings that look like tags. AGENTS.md anti-patterns explicitly warned against this.
3. **Split-chapter drops tags from filenames** (C3 — code-quality) — `buildRecordingFilename()` called without tags during cascade. Silent data loss on every cascaded file.
4. **Undo race condition** (C4 — code-quality) — inline rename between batch and undo causes ENOENT. No validation that files still have expected names.
5. **Zero client component tests** — EditableFileRow, BatchToolbar, PreviewPanel shipped with no test coverage despite containing validation logic.
6. **RecordingsView still 1,399 lines** — extraction helped but the component remains a monolith with 12 state variables and ~20 handlers.

## Key Learnings — Application

1. **Tags must flow through every rename path** — any function that builds a filename from parsed parts must include tags. This is easy to miss because tags are optional.
2. **Undo storage must happen at the operation boundary, not in the caller** — every endpoint that performs bulk renames should store `lastBatchMapping` before returning, not rely on the client to manage it.
3. **Shared parsing functions exist for a reason** — the AGENTS.md anti-pattern warning wasn't enough to prevent regex duplication. Consider a lint rule or compile-time check.
4. **`onBlur` vs `onClick` race** — EditableFileRow's `onBlur={cancelEditing}` fires before `onClick` on adjacent buttons. Classic React anti-pattern that needs `onMouseDown` + `preventDefault` or a `setTimeout` guard.

## Key Learnings — Ralph Loop

1. **Agent compliance with anti-patterns section** — AGENTS.md explicitly said "DO NOT re-implement filename parsing" but the selection-and-editing agent did it anyway (C2). Anti-patterns may need to be repeated in the work unit prompt, not just AGENTS.md.
2. **Undo mapping storage was in both plan docs** — two separate documents specified this requirement and it was still missed. Critical requirements may need explicit test stubs in AGENTS.md ("write a test that verifies lastBatchMapping is populated after split").
3. **Sequential wave for coupled files was correct** — running selection-and-editing before preview-and-cleanup (both touch RecordingsView) avoided merge conflicts.
4. **Quality audit timing** — running the 3-lens review post-merge rather than post-wave-completion meant the assessment was delayed to a second session. For future campaigns, offer the audit immediately when the last item marks `[x]`.

## Promote to Main KDD?

- Smart rename two-phase pattern (rename derivatives → rename core) — reusable for any file-with-derivatives workflow
- Tags-must-flow lesson — add to AGENTS.md for any future rename-related work
- Anti-pattern enforcement lesson — AGENTS.md anti-patterns alone don't prevent violations; need test stubs

## Suggestions for Next Campaign

1. **Fix C1-C4 as a stabilisation round** — small scope (4 work units), high value, prevents data loss in split-chapter
2. **Add client component tests** in the stabilisation round or as a follow-up — EditableFileRow and BatchToolbar are highest priority
3. **Extract `useRecordingEditor` hook** to reduce RecordingsView from 1,399 to ~700 lines
4. **Consolidate `groupByChapter`** — 3 implementations across RecordingsView, ManagePanel, WatchPage
5. **Split manage.ts** (1,556 lines) — extract editing endpoints into `manage-editing.ts` before adding more
6. **AGENTS.md improvement**: add explicit test stubs for critical requirements (not just prose anti-patterns)
