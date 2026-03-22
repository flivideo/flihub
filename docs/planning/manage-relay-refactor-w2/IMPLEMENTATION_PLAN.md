# IMPLEMENTATION_PLAN.md — manage-relay-refactor-w2

**Goal**: Relay folder browser, push/collect for all edit levels with subfolder selection, promote-to-final, role-based visibility, and visual pipeline indicators. Wave 2 of manage-relay-refactor — feature expansion on the wave 1 foundation.
**Started**: 2026-03-22
**Target**: Full relay workflow UI — David can push recordings, collect any edit level, promote approved versions to final/, see pipeline status at a glance. Editors see only their relevant actions. `npm test` passes, `npm run build` clean.

## Summary
- Total: 6 | Complete: 6 | In Progress: 0 | Pending: 0 | Failed: 0

## Pending

(none)

## In Progress

(none)

## Complete

- [x] relay-foundation — Extracted `getRelayPaths(config)` helper, `rsyncExcludeArgs()` with 9 exclusion patterns, `RELAY_SUBFOLDERS` constant, `RelaySubfolder` type. Refactored all 3 POST routes to use helpers. 11 new tests (error-paths, exclusion verification, helper unit tests). Tests: 552 → 563.
- [x] relay-folder-browser — New GET `/api/relay/browse` endpoint scanning relay directory with per-project subfolder breakdown. New `RelayBrowser.tsx` component with table display. New `useRelayBrowse()` hook with 30s refetch. Embedded in RelayTool. Added `RelaySubfolderInfo`, `RelayProjectInfo`, `RelayBrowseResult` types. 6 new tests. Tests: 563 → 798 (includes dist mirror tests).
- [x] relay-push-collect-full — POST preview/push/collect now accept `{ subfolder }` body param. UI has subfolder dropdown selector. Collect route bug fixed (was relay/final/ → now relay/{subfolder}/). Dynamic labels/descriptions. Push/collect invalidate relay-browse query. 10 new tests. Tests: 798 → 818.
- [x] promote-to-final — New GET `/versions` lists edit-2nd/ files sorted newest-first. New POST `/promote` copies selected file to final/ with path traversal validation and existence check. New `EditVersion` type. UI Promote section with selectable version list. `useRelayVersions()` + `useRelayPromote()` hooks. 11 new tests. Tests: 818 → 840.
- [x] role-based-visibility — Push/Collect/Promote sections gated by machineRole. Used existing `useEnvironment()` from `useConfigApi.ts`. Recorder sees push-recordings + collect-edits + promote. Editor sees collect-recordings + push-edits. Preview/browser/selector visible to both. TODO comment added to ToolsSidebar for future gating.
- [x] visual-indicators — RelayBrowser enhanced with color-coded status dots (blue=recordings, amber=edit-1st, emerald=edit-2nd). Summary footer row with project and file totals. Color legend below table.

## Failed / Needs Retry

(coordinator moves items here with [!], adds failure reason)

---

## Notes & Decisions

**Wave design**:
- Wave 1 (parallel, 2 agents): `relay-foundation` + `relay-folder-browser` — foundation refactors relay.ts internals; browser adds a new GET endpoint and new client component. No file overlap (foundation modifies existing routes/tests, browser adds new ones).
- Wave 2 (parallel, 2 agents): `relay-push-collect-full` + `promote-to-final` — push-collect extends existing POST routes with subfolder param; promote adds new routes + UI section. Both modify relay.ts but different sections (existing routes vs new routes). Both modify RelayTool.tsx but different sections (existing buttons vs new promote section).
- Wave 3 (parallel, 2 agents): `role-based-visibility` + `visual-indicators` — both client-only, different components. Role-visibility modifies RelayTool + ToolsSidebar; visual-indicators modifies RelayBrowser (created in wave 1).

**Dependencies**:
- `relay-foundation` must land before wave 2 (new routes use `getRelayPaths()` helper and `RELAY_SUBFOLDERS` constant)
- `relay-folder-browser` must land before `visual-indicators` (badges need browse data)
- `relay-push-collect-full` and `promote-to-final` can run in parallel (different route endpoints, different UI sections)
- `role-based-visibility` and `visual-indicators` can run in parallel (different concerns — gating vs display)

**Product decisions (confirmed by David 2026-03-22)**:
- Push/collect subfolder selection: user picks which subfolder (recordings, edit-1st, edit-2nd) — most flexible
- Promote-to-final: copies from local project edit-2nd/ → local project final/ (not from relay)
- Visual indicators: implement first pass, David will review and request changes
- Current collect route is wrong (uses relay/final/) — wave 2 fixes to use relay/{subfolder}/

**Relay subfolders** (canonical list):
- `recordings` — raw recordings (David pushes, editor collects)
- `edit-1st` — Gling output, video + SRT (editor pushes, David collects)
- `edit-2nd` — Final edits, versioned v1/v2/v3 (editor pushes, David collects)

**Reference files**:
- `docs/planning/requirements-manage-relay-refactor.md` — full requirements (wave 2 section)
- `docs/planning/manage-relay-refactor/AGENTS.md` — wave 1 AGENTS.md with learnings
- `docs/planning/manage-relay-refactor/assessment.md` — wave 1 assessment + audit findings
- `docs/planning/BACKLOG.md` — B040 covers this wave
