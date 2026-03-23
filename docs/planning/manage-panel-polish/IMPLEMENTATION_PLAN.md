# IMPLEMENTATION_PLAN.md — manage-panel-polish

**Goal**: Fix bugs from B041 campaign (stale closure, dead code, loose types) and add first component-level test coverage for the Manage panel.
**Started**: 2026-03-23
**Target**: Stale closure fixed, dead code removed, types tightened. Pure functions extracted and tested. ToolsSidebar and ChapterListPanel logic tested. `npm test` passes, `npm run build` clean.

## Summary
- Total: 3 | Complete: 3 | In Progress: 0 | Pending: 0 | Failed: 0

## Pending

- [x] bugfix-cleanup — Fixed stale closure (onConfirm now receives ChapterSettings param), removed dead chapters branches, exported ActiveTool/ChapterGroup types, typed requestBody, exported pure functions. Removed modalChapterSettings state entirely.
- [x] pure-function-tests — 25 tests: groupByChapter (7), getChapterDisplayName (5), extractChapters (6), detectGaps (7). Extracted useMemo bodies from ChapterListPanel into exported functions.
- [x] component-render-tests — 16 tests: ToolsSidebar renders all 5 tools, active state styling, callback invocation, group headings, Git Sync pending state.

## In Progress

(coordinator moves items here with [~])

## Complete

(coordinator moves items here with [x], adds outcome notes)

## Failed / Needs Retry

(coordinator moves items here with [!], adds failure reason)

---

## Notes & Decisions

**Wave design**:
- Wave 1 (1 agent): `bugfix-cleanup` — modifies production files (ManagePanel.tsx, ToolsSidebar.tsx)
- Wave 2 (2 agents): `pure-function-tests` + `component-render-tests` — write test files only, no production changes

**Dependencies**:
- `bugfix-cleanup` must land before wave 2 (it exports the functions that tests import)
- `pure-function-tests` and `component-render-tests` can run in parallel (different test files)

**Scope boundary**: ChapterListPanel pure function extraction requires moving useMemo bodies to exported functions — keep the component calling the extracted functions (don't duplicate logic).
