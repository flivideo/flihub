# IMPLEMENTATION_PLAN.md — Archive Tool (Unified Offload UX)

**Goal**: Consolidate scattered offload/archive UX into a single dedicated Archive tool — filterable project table, inline row actions, batch operations, deep-linked entry points. Eliminate the "I don't know where to find anything" problem.
**Started**: 2026-04-14
**Target**: Archive becomes *the* surface for T7 lifecycle — drawer section demoted to read-only summary; T7 header pill + table badge deep-link into filtered Archive view.

## Summary
- Total: 5 | Complete: 0 | In Progress: 0 | Pending: 5 | Failed: 0

## Design Principles (from UX audit)

1. **One surface, one job** — Archive tool owns offload/restore/delete verbs. No competing entry points.
2. **Filterable table primary** — matches David's preference; 4 filters answer the real questions
3. **Single-action collapse** — one-click offload runs rsync + verify + prompts delete in same row
4. **Edit where data is visible** — action buttons sit next to the size/state they act on
5. **Symmetric confirmations** — restore needs same confirm treatment as delete (both change storage state)
6. **No dashboards** — aggregate footer only shows reclaimable bytes; no charts, no timelines

## Filter Model (the 4 questions)

| Filter | Query | Answers |
|---|---|---|
| All | — | Complete inventory |
| Local only | `!held && localBytes > 0` | "What hasn't been backed up yet?" |
| On T7 | `held` | "What's on my external drive?" |
| Reclaimable | `held && localBytes > 0` | "What can I free up?" ⭐ the most-used filter |

Footer aggregate: `T7: {held total} used · Local reclaimable: {sum of both-copies} · {N} selected: {bytes}`

## Wave A — Prerequisites (run first, in sequence)

- [ ] **WU1** — Archive data layer (hook + route) — consolidates per-project hold/disk state into one query

## Wave B — Main Wave (run in parallel after WU1)

- [ ] **WU2** — ArchiveTool component with filterable table + inline single-project actions
- [ ] **WU3** — Batch selection + batch offload/delete operations
- [ ] **WU4** — Deep-link entry points (T7 pill, table badge → Archive with filter)
- [ ] **WU5** — Restore confirm modal + drawer section demotion

## Pending

### WU1 — Archive data layer

**Type**: Backend + hook (Wave A prerequisite)

**Scope**:
- Add `GET /api/manage/archive-inventory` → returns array of `{ projectCode, projectPath, localBytes, heldBytes, held: boolean, state: 'local' | 'held-local' | 'held-only', lastTouched }` for every project in the projects directory.
- Reuses existing `getHoldStatus`, `getDiskSizeData`, and the same T7 `youtube-HOLDING` discovery logic as current drawer.
- New `useArchiveInventory()` hook in `useApi.ts` — single query powers the whole Archive tool, replacing N per-project queries.
- `shared/types.ts` — add `ArchiveRow`, `ArchiveState`, `ArchiveInventoryResponse` types.

**Done when**:
- Endpoint returns all projects with hold state + sizes in one call (< 2s for ~20 projects).
- `state` field derived correctly: `local` (no T7 copy), `held-local` (both), `held-only` (only T7).
- Typecheck + route test verify shape and state derivation on fixtures.

### WU2 — ArchiveTool filterable table

**Type**: Frontend (parallel)

**Scope**:
- New `client/src/components/shared/ArchiveTool.tsx` registered in ManagePanel tools.
- Table columns: `[ ] Checkbox | Project | Size (local) | Size (T7) | State pill | Last touched | Actions`.
- Filter tabs: All / Local only / On T7 / Reclaimable. Filter state local to component (no URL state yet).
- Per-row inline actions (context-aware):
  - `local` state → `Offload` (primary) + `Delete local` (red text-link)
  - `held-local` state → `Delete local` (red primary, saves disk) + `Clear T7 copy` (subtle)
  - `held-only` state → `Restore` (primary) + `Delete everything` (red)
- Offload action: single click → runs hold mutation → row state auto-updates via query invalidation → `Delete local` button now appears as the next natural action.
- Inline `Delete local` uses toast-with-undo pattern (2-second window) — no typed-code modal.
- `Delete everything` (nuclear) still requires HoldDeleteModal with typed project code.
- Reuses warm linen theme tokens. State pills: `local` = warm, `held-local` = amber (reclaimable), `held-only` = muted.

**Done when**:
- Archive appears in ManagePanel tools sidebar (below Storage or Relay).
- Filter tabs correctly partition rows; counts visible per filter.
- Single-row Offload / Restore / Delete flows work end-to-end against real endpoints.
- Table reuses existing project table styling patterns (sortable columns, row hover).
- Typecheck + unit test for filter logic + state-to-actions mapping.

### WU3 — Batch operations

**Type**: Frontend + backend (parallel, depends on WU2 row actions existing — but WUs share a branch)

**Scope**:
- Header checkbox (select all in current filter) + per-row checkboxes.
- Selection footer bar (fixed bottom of Archive tool when `selected.length > 0`):
  - `{N} selected · {aggregate bytes}`
  - `Offload selected` (if all selected are `local`)
  - `Delete local from selected` (if all selected are `held-local`)
  - `Clear selection`
- Batch endpoints: `POST /api/manage/batch-offload` `{ projects: string[] }` and `POST /api/manage/batch-delete-local` `{ projects: string[] }`. Each runs sequentially server-side, returns per-project result array.
- Progress: footer shows `Offloading 2/4: jfli-relay...` during batch run. No modal — inline status.
- Errors per-project: show toast summary `3 offloaded, 1 failed (jfli-xyz: rsync error)`, row stays in pre-batch state.

**Done when**:
- Selecting 4 local projects + clicking batch offload runs them sequentially, with progress visible.
- Batch buttons disabled/hidden when selection is heterogeneous (mix of states).
- Server endpoints return structured per-project results; failures don't abort the batch.
- Route tests for both batch endpoints (success, partial failure, empty array rejection).

### WU4 — Deep-link entry points

**Type**: Frontend (parallel)

**Scope**:
- T7 header pill (`SsdIndicator`): currently jumps to Projects tab → change to jump to ManagePanel with Archive tool + filter `On T7`.
- Projects table T7 badge: currently visual-only → clickable; deep-link to Archive with that single project pre-filtered (use search/filter text box).
- Drawer "SSD Offload" section: demote to read-only summary card showing current state + sizes + a single `Manage in Archive →` link that navigates to Archive with project pre-filtered. All action buttons removed from drawer.
- Archive tool accepts optional initial filter + optional project search string as props (similar to `initialTool` pattern from SyncIndicator).

**Done when**:
- Clicking T7 pill lands on Archive with `On T7` filter already active.
- Clicking table T7 badge lands on Archive filtered to that project code.
- Project drawer no longer contains Offload/Restore/Delete action buttons — only a summary and a navigate link.
- HoldDeleteModal launched from drawer removed; accessed only from Archive row nuclear action.

### WU5 — Restore confirm + drawer cleanup

**Type**: Frontend (parallel)

**Scope**:
- Add lightweight confirm for Restore: `Restore {project}? {heldBytes} will be copied back to local disk.` Confirm (primary) + Cancel.
- Symmetric with Delete local inline confirm — not a full modal, a small inline popover or mini-dialog.
- Remove dead code from `ProjectDrawer.tsx` SSD Offload section (all the 9-state mutually-exclusive logic).
- Update any tests referencing drawer-based offload actions to use Archive tool flows instead.

**Done when**:
- Restore no longer fires immediately without confirmation.
- ProjectDrawer SSD Offload section reduced to ~20 lines of read-only summary + navigate link.
- No test regressions. 1074 tests → still passing (new tests added for Archive).

## In Progress
(coordinator moves items here with [~])

## Complete
(coordinator moves items here with [x], adds outcome notes)

## Failed / Needs Retry
(coordinator moves items here with [!], adds failure reason)

## Notes & Decisions

- **Batch scope**: Batch offload is the #1 user value — David already knows which projects to archive. Batch restore intentionally excluded from this wave (rarer, higher stakes, can revisit if requested).
- **Why unified inventory endpoint**: Current drawer queries hold+disk per-project. With 20+ projects, Archive tool needs one query not 40. Server-side aggregation is necessary.
- **Drawer SSD Offload fate**: Demoted, not deleted. Keeps the at-a-glance state view for users who open the drawer for other reasons; removes the competing action surface.
- **Table T7 badge click behaviour**: Current badge is amber "⚠" for both-copies, muted for holding-only. Becomes clickable; tooltip explains the state; click jumps to Archive.
- **Restore confirm is new UX**: Current system fires restore immediately. Asymmetric with delete-requires-typed-code. This wave normalises by making destructive-to-state actions both require *some* confirmation (lightweight for reversible like restore, heavy for nuclear like delete-everything).
- **Not in scope**: Offload scheduling, automatic archival policies, T7-to-cloud sync, per-subfolder selective offload (separate feature). The wave 2 pre-offload cleanup already solved selective offload via delete-then-offload.
