# IMPLEMENTATION_PLAN.md — Archive Tool (Unified Offload UX)

**Goal**: Consolidate scattered offload/archive UX into a single dedicated Archive tool — filterable project table, inline row actions, batch operations, deep-linked entry points. Eliminate the "I don't know where to find anything" problem.
**Started**: 2026-04-14
**Target**: Archive becomes *the* surface for T7 lifecycle — drawer section demoted to read-only summary; T7 header pill + table badge deep-link into filtered Archive view.

## Summary
- Total: 5 | Complete: 5 | In Progress: 0 | Pending: 0 | Failed: 0

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

- [x] **WU1** — Archive data layer (hook + route) — consolidates per-project hold/disk state into one query ✅ 2026-04-14

## Wave B — Main Wave (run in parallel after WU1)

- [x] **WU2** — ArchiveTool component with filterable table + inline single-project actions ✅ 2026-04-14
- [x] **WU3** — Batch selection + batch offload/delete operations ✅ 2026-04-14
- [x] **WU4** — Deep-link entry points (T7 pill, table badge → Archive with filter) ✅ 2026-04-14
- [x] **WU5** — Restore confirm popover + StorageTool demotion ✅ 2026-04-14

## WU4 + WU5 — Delivered 2026-04-14

**WU4 — Deep-link entry points**
- `SsdIndicator` renamed prop `onNavigateToStorage` → `onNavigateToArchive`; T7 pill now deep-links to Archive with `initialFilter='held'`.
- `ProjectsPanel.HoldBadge` is now a `<button>` with `data-testid="hold-badge-{code}"`; `stopPropagation` keeps it from opening the row drawer; passes `projectCode` as `initialSearch` via new `onNavigateToArchive` prop threaded through `ProjectsPanel`.
- `App.tsx`: new `navigateToManage(tool, opts)` helper; `manageArchiveFilter` + `manageArchiveSearch` state passed through to `ManagePanel`.
- `ManagePanel`: new `initialArchiveFilter` + `initialArchiveSearch` props; `archiveMountKey` nonce bumps ArchiveTool remount so repeat navigations re-apply `initial*` props cleanly.
- `ArchiveTool`: search input added above filter tabs; wires `initialSearch` prop; case-insensitive substring match on `projectCode`.

**WU5 — Restore confirm + StorageTool demotion**
- `ArchiveTool.handleRestore` no longer fires the mutation; opens inline `restore-confirm-popover` mini-dialog with `formatBytes(heldBytes)` copy, `Confirm` / `Cancel` buttons. Mutation only fires from `confirmRestore`.
- `StorageTool` rewritten top-to-bottom: 510-line 9-state offload/restore/delete action UI → ~95-line read-only summary with `Manage in Archive →` link. Removed: `useHoldProject`, `useVerifyHolding`, `useDeleteLocal`, `useRestoreFromHolding`, `useDeleteHolding`, `useProjectDisk`, `useDeleteSubfolder`, HoldDeleteModal, FolderBreakdown sub-component, 3-state main content, dry-run message, restore confirm.
- `ToolsSidebar` label changed from "SSD Offload" to "SSD Status" to match new read-only posture.
- Tests: `ArchiveTool.test.tsx` +4 (search pre-fill, case-insensitive filter, restore opens popover, cancel closes); `ToolsSidebar.test.tsx` updated label.

**Note on ProjectDrawer.tsx**: Task brief specified "drawer SSD Offload section — delete 9-state UI". Current `ProjectDrawer.tsx` has NO SSD Offload section (removed in commit 7409704 "close archive-offload campaign"); the 9-state UI lives in `StorageTool.tsx`. Treated StorageTool as the demotion target. Drawer was already at the desired read-only posture for SSD state (it only shows Disk Usage).

**Tests: 245 client (+4 new), 1110 server, 80 shared — no regressions**

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

### WU1 — Archive data layer ✅ 2026-04-14

- `GET /api/manage/archive-inventory` added in `server/src/routes/manage.ts` (+122 lines)
- `useArchiveInventory()` hook in `client/src/hooks/useApi.ts` (+14 lines)
- `ArchiveRow` / `ArchiveState` / `ArchiveInventoryResponse` added to `shared/types.ts` (+19 lines)
- 4 new route tests in `server/src/test/manage.test.ts` (+161 lines) covering all three `state` derivations, empty case, unconfigured case, hidden-dir filtering
- Tests: 1082 passed / 2 skipped (baseline 1074 → +8 from new tests)
- Builds: server + client pass

**Deviations from plan (approved inline)**:
1. Endpoint unions `projectsRootDirectory` + `holdingPath` to capture `held-only` rows (projects with no local folder left)
2. `localBytes = total − rRec − r1st − r2nd` (strip relay subfolders that `calculateProjectDiskSize` rolls into `total`)
3. `lastTouched` reads `HoldStatus.heldAt` which is currently null until disk-cache update populates it — wired through, returns null when absent

## Failed / Needs Retry
(coordinator moves items here with [!], adds failure reason)

## Patches Applied — After Wave A Delivery Review (2026-04-14)

Delivery review verdict: **FAIL** → CONDITIONAL after patches. All 8 blockers applied in one pass. Tests: 1082 → 1094 server (+12 net), 1393 total passing, no regressions.

| # | Finding | Source | Action | Status |
|---|---|---|---|---|
| 1 | `lastTouched` always null — heldAt never populated | BH-001/EC-001/UT-004 | fs.stat(holdingPath).mtime fallback in buildArchiveRow | [x] done |
| 2 | Phantom rows from unvalidated holdingRoot entries | BH-002 | `isValidProjectDirName` regex shared across both roots | [x] done |
| 3 | State derivation diverges from spec | AA-002 | `held = heldBytes > 0`; `deriveArchiveState` is pure bytes-only | [x] done |
| 4 | Silent `.catch(() => null)` → data-loss path | BH-004/EC-004/CQ-003 | `degraded` + `error` fields on ArchiveRow; console.warn | [x] done |
| 5 | localBytes subtraction unsafe + untested | BH/EC/AA/CQ/AR/UT (all 6) | `Math.max(0, ...)` clamp + WHY comment + relay test | [x] done |
| 6 | Wrong route file (manage.ts vs hold.ts) | AR-001/AR-002 | Moved to `hold.ts` at `/api/projects/archive-inventory`; extracted `utils/archiveInventory.ts` | [x] done |
| 7 | QUERY_KEYS violated + hook in barrel | AR-004/AR-005 | `QUERY_KEYS.archiveInventory` + hook moved to `useHoldApi.ts` (barrel re-export preserves import path) | [x] done |
| 8 | Test hardening (symmetric fixtures, no relay test, etc.) | UT-001/UT-002/UT-003 | Asymmetric fixtures, relay subtraction test, partial-failure isolation, non-null lastTouched | [x] done |

**Deferred to follow-ups**: EC-002 archived filter edge, EC-005 concurrency cap, EC-006 mutation invalidation, AR-006 response envelope, UT-005/006 minor test hygiene, BH-003 projectPath nullable (wait for Wave B consumer).

**Key contract changes Wave B must know**:
- Endpoint URL is `/api/projects/archive-inventory` (not `/api/manage/...`)
- `ArchiveRow.degraded` — Wave B destructive actions MUST gate on `!row.degraded`
- `ArchiveRow.error` — surface in UI when present
- `deriveArchiveState(localBytes, heldBytes)` is exported from `server/src/utils/archiveInventory.ts` — WU3 batch endpoints should use it for allowlist validation
- Hook import path unchanged (`useArchiveInventory` still re-exported from `useApi`)

## Patches Applied — After Wave B Delivery Review (2026-04-14)

Delivery review verdict: **CONDITIONAL PASS** → READY TO MERGE after patches. All 8 patches applied in one pass. Commit `7b271fd`. Tests: 247 client / 1110 server / 80 shared passing.

| # | Finding | Source | Action | Status |
|---|---|---|---|---|
| P1 | Single-row mutations don't invalidate archive inventory (stale UI 30s) | BH-001 (critical) | Added `QUERY_KEYS.archiveInventory` invalidation to `useHoldProject`, `useDeleteLocal`, `useRestoreFromHolding`, `useDeleteHolding` | [x] done |
| P2 | `held-only` Delete-everything fails server-side (requires local copy) | BH-003/AR-005/AA-001 | Removed `Delete everything` button from held-only rows; removed `syntheticHeldOnlyVerification` and `nukeTarget` state | [x] done |
| P3 | Batch buttons double-click race | EC-001 | Disabled while `batchOffloadMut.isPending \|\| batchDeleteLocalMut.isPending` | [x] done |
| P4 | Misleading `1/N` batch progress (never advances) | AA-002 | Changed to `"Offloading N projects…"` / `"Deleting N projects…"` | [x] done |
| P5 | Undo setTimeout leaks on unmount + magic 2000 | CQ-005/EC-004 | Extracted `UNDO_WINDOW_MS`, stored timer in ref, cleanup in `useEffect` | [x] done |
| P6 | Restore popover uses stale heldBytes snapshot | EC-003 | `confirmRestore` re-reads row from inventory; aborts if state changed | [x] done |
| P7 | Degraded rows invisible outside `all` filter | EC-005 | `matchesArchiveFilter` returns true for degraded regardless of filter; +2 tests | [x] done |
| P8 | Dead `onNavigateToRelay` prop on StorageTool | CQ-002 | Removed from StorageTool props + ManagePanel callsite | [x] done |

**Deferred to follow-ups**: AR-002 ArchiveTool at 845 lines (extract `useBatchSelection`), AR-003/CQ-003 `archiveMountKey` nonce → explicit `navigationNonce`, CQ-001 hardcoded `left-[232px]` footer → sticky inside scroll container, CQ-004 batch endpoints 3× disk scans per project, AA-004 restore confirm form factor (modal vs inline popover), AA-005 StorageTool line count, BH-005 selection ghost after filter change, EC-002 re-navigation no-op, UT-001/002/004 test hardening.

**Follow-up campaign recommendation**: "Archive tool polish" mini-wave for the deferred structural items — none block merge.

## Notes & Decisions

- **Batch scope**: Batch offload is the #1 user value — David already knows which projects to archive. Batch restore intentionally excluded from this wave (rarer, higher stakes, can revisit if requested).
- **Why unified inventory endpoint**: Current drawer queries hold+disk per-project. With 20+ projects, Archive tool needs one query not 40. Server-side aggregation is necessary.
- **Drawer SSD Offload fate**: Demoted, not deleted. Keeps the at-a-glance state view for users who open the drawer for other reasons; removes the competing action surface.
- **Table T7 badge click behaviour**: Current badge is amber "⚠" for both-copies, muted for holding-only. Becomes clickable; tooltip explains the state; click jumps to Archive.
- **Restore confirm is new UX**: Current system fires restore immediately. Asymmetric with delete-requires-typed-code. This wave normalises by making destructive-to-state actions both require *some* confirmation (lightweight for reversible like restore, heavy for nuclear like delete-everything).
- **Not in scope**: Offload scheduling, automatic archival policies, T7-to-cloud sync, per-subfolder selective offload (separate feature). The wave 2 pre-offload cleanup already solved selective offload via delete-then-offload.
