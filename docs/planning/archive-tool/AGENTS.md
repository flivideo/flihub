# AGENTS.md — archive-tool

**Project**: FliHub — video recording workflow management tool
**Campaign**: archive-tool (Unified Archive/Offload UX consolidation)
**Inherited from**: docs/planning/offload-cleanup-wave2/AGENTS.md (2026-04-14)
**Last updated**: 2026-04-14

---

## Project Overview

FliHub is a TypeScript monorepo that watches Ecamm Live recordings, provides a web UI for naming/organising video files, and manages project assets for a solo YouTube creator workflow. It runs locally on macOS (Apple Silicon). No cloud deployment, no multi-user support, no authentication.

---

## Campaign Goal

Consolidate scattered offload UX into a single Archive tool. Today: actions live in a drawer section users must discover by clicking a project row; 4 entry points compete (header pill, table badge, drawer section, modal); no batch ops; no "what's on my T7?" overview. After this campaign: one filterable table owns the verbs; drawer demoted to read-only; T7 pill + badge deep-link into filtered Archive view.

**Key user insight**: "I don't know where to find anything for doing the archives. I don't know how to put stuff on hold. I don't know how to restore. I don't know how to delete locally. There's no unified approach."

**Design north stars**:
- Filterable table primary (matches David's preference — not dashboards, not timelines)
- Single-action collapse (one click for common path; multi-step only for nuclear ops)
- Edit where data is visible (actions next to sizes, not buried in drawer)
- Symmetric confirmations (restore + delete-local both need some confirmation)

---

## Build & Run Commands

```bash
npm run build -w shared    # ALWAYS run after changing shared/
npm run build -w server    # TypeScript check
npm run build -w client    # tsc -b && vite build
npm test                   # all three workspaces
lsof -i :5101 | grep LISTEN  # check server running
```

---

## Directory Structure (campaign-relevant)

```
server/src/
├── routes/
│   ├── manage.ts               # MODIFY — add archive-inventory, batch-offload, batch-delete-local
│   ├── hold.ts                 # READ ONLY — holdProject / restoreFromHolding reference
│   └── relay.ts                # READ ONLY — deriveSyncStatus reference
├── utils/
│   ├── holdUtils.ts            # READ ONLY — getHoldStatus, getDirStats
│   └── diskUtils.ts            # READ ONLY — DiskSizeData / getDiskSizeData reference
├── test/
│   ├── manage.test.ts          # MODIFY — add archive-inventory + batch endpoint tests

client/src/
├── components/
│   ├── shared/
│   │   ├── ArchiveTool.tsx     # CREATE — new tool (filterable table + batch bar)
│   │   ├── StorageTool.tsx     # READ ONLY — reference for tool shape & folder breakdown
│   │   ├── ToolsSidebar.tsx    # MODIFY — register Archive tool
│   │   └── SsdIndicator.tsx    # MODIFY — deep-link into Archive with filter
│   ├── ProjectDrawer.tsx       # MODIFY — demote SSD Offload section to read-only summary
│   ├── ManagePanel.tsx         # MODIFY — register ArchiveTool; wire initial filter/search props
│   └── RecordingsView.tsx      # MODIFY — T7 badge becomes clickable (navigates to Archive)
├── hooks/
│   ├── useApi.ts               # MODIFY — add useArchiveInventory, useBatchOffload, useBatchDeleteLocal
│   └── useHoldApi.ts           # READ ONLY — useHoldProject / useRestoreFromHolding reference

shared/
└── types.ts                    # MODIFY — add ArchiveRow, ArchiveState, ArchiveInventoryResponse
```

---

## Architecture Docs Registry

| Doc | Path | Relevant For |
|-----|------|-------------|
| UX audit (product rationale) | Conversation 2026-04-14 + this IMPLEMENTATION_PLAN.md | All WUs — why Archive tool exists |
| Wave 1 offload campaign | `docs/planning/offload-manage-tool/AGENTS.md` | Hold/restore lifecycle, HoldStatus shape |
| Wave 2 cleanup campaign | `docs/planning/offload-cleanup-wave2/AGENTS.md` | Relay clear, delete-subfolder, rsync excludes |
| Shared types | `shared/types.ts` | HoldStatus, DiskSizeData — extend with ArchiveRow |
| Hold routes | `server/src/routes/hold.ts` | holdProject/restoreFromHolding — batch endpoints wrap these |
| Manage routes | `server/src/routes/manage.ts` | delete-subfolder, project list endpoint patterns |
| Hold utils | `server/src/utils/holdUtils.ts` | getHoldStatus — used per-project in inventory endpoint |
| Disk utils | `server/src/utils/diskUtils.ts` | getDiskSizeData — used per-project in inventory endpoint |
| StorageTool | `client/src/components/shared/StorageTool.tsx` | Tool component shape reference |
| ManagePanel | `client/src/components/ManagePanel.tsx` | `initialTool` / `setActiveTool` navigation pattern |
| SsdIndicator | `client/src/components/shared/SsdIndicator.tsx` | T7 pill currently navigates to Projects tab — change to Archive |

---

## Constraints

1. **Warm linen theme tokens only** — `bg-surface`, `bg-surface-muted`, `text-warm-primary`, `text-warm-secondary`, `text-warm-muted`, `text-warm-faint`, `border-warm`, `border-warm-strong`. Red for destructive: `border-red-300 bg-red-50 text-red-700`. Amber for reclaimable-state pill.
2. **Reuse existing endpoints for single-project ops** — ArchiveTool row actions call existing `hold`, `restore-from-holding`, `delete-project-local` (via HoldDeleteModal) endpoints. Do NOT duplicate backend logic.
3. **Batch endpoints run sequentially** — `batch-offload` / `batch-delete-local` loop projects server-side; do not parallelise (rsync + disk writes). Return per-project result array so partial failures are visible.
4. **Batch endpoints validate allowlist** — `batch-delete-local` only accepts projects in `held-local` state (both copies exist). `batch-offload` only accepts projects in `local` state. Reject on mismatch to prevent accidental data loss.
5. **Drawer demotion is total** — all Offload/Restore/Delete *buttons* removed from ProjectDrawer. Only a read-only summary + "Manage in Archive →" link remains. Do not leave "just one button" behind.
6. **HoldDeleteModal for nuclear only** — typed-code modal stays, but only launched from Archive row's "Delete everything" action (delete both local + T7). Inline `Delete local` (held-local state) uses toast-with-undo, NOT the modal.
7. **Restore requires confirmation** — matches delete asymmetry. Lightweight confirm popover, not full modal. Symmetry: both actions that change storage state need a beat of user friction.
8. **`npm test` baseline: 1074 passing** — no regressions. New tests required for: archive-inventory route, batch-offload route, batch-delete-local route, ArchiveTool filter logic, ArchiveTool state→actions mapping.
9. **Typecheck clean** — `npm run build -w shared && -w server && -w client` must pass.
10. **Inventory endpoint must be fast** — single query replaces N per-project queries. Budget: < 2s for 20 projects. Cache nothing; fresh read each time (matches current per-project endpoint behaviour).

---

## Baseline Metrics

| Metric | Pre-campaign (2026-04-14) |
|--------|--------------------------|
| Tests | 1074 passed, 2 skipped |
| Typecheck | pass (all 3 workspaces) |
| Build | pass |
| Offload entry points | 4 (header pill, table badge, drawer section, modal) |
| Actions in drawer SSD Offload | up to 9 mutually-exclusive states |

---

## Success Criteria

- [ ] `npm run build` passes (all workspaces)
- [ ] `npm test` exits 0, no regressions, new endpoint + component tests pass
- [ ] Archive tool visible in ManagePanel tools sidebar
- [ ] Four filter tabs (All / Local only / On T7 / Reclaimable) correctly partition rows
- [ ] Single-row Offload / Restore / Delete flows work end-to-end
- [ ] Batch offload runs sequentially with per-project progress visible
- [ ] T7 header pill lands on Archive with `On T7` filter active
- [ ] Projects table T7 badge deep-links to Archive pre-filtered to that project
- [ ] Project drawer SSD Offload section contains NO action buttons — read-only summary + navigate link only
- [ ] Restore action requires confirmation (matches delete symmetry)
- [ ] HoldDeleteModal accessed only from Archive row "Delete everything"
- [ ] Offload entry points reduced from 4 to 2 (Archive tool + T7 pill as shortcut)

---

## Done-When Definitions

### WU1: Archive data layer

**Done when**:
- `GET /api/manage/archive-inventory` endpoint exists in `manage.ts`, returns `{ rows: ArchiveRow[] }`.
- `ArchiveRow` shape (in `shared/types.ts`): `{ projectCode, projectPath, localBytes, heldBytes, held: boolean, state: 'local' | 'held-local' | 'held-only', lastTouched: string | null }`.
- State derivation:
  - `heldBytes > 0 && localBytes > 0` → `held-local`
  - `heldBytes > 0 && localBytes === 0` → `held-only`
  - Otherwise → `local`
- Endpoint iterates all directories in projects root, calls existing `getHoldStatus` + `getDiskSizeData` per project, aggregates in single response.
- Endpoint performance: returns in < 2s for 20 projects. Use `Promise.all` for per-project aggregation.
- `useArchiveInventory()` hook in `useApi.ts` — useQuery, 30s staleTime, queryKey `['archive-inventory']`.
- Tests: route test verifies shape + state derivation using fixtures for each of 3 states; handles empty projects directory.

### WU2: ArchiveTool filterable table

**Done when**:
- `client/src/components/shared/ArchiveTool.tsx` created; exported from `shared/index.ts`; registered in `ManagePanel.tsx` tools array (after Storage).
- Table columns: checkbox · Project · Local size · T7 size · State pill · Last touched · Actions (right-aligned).
- Filter tabs (count badges): `All (N)` · `Local only (N)` · `On T7 (N)` · `Reclaimable (N)`. Default: `Reclaimable` when rows exist in that state, else `All`.
- State pills use warm linen tokens: `local` neutral, `held-local` amber (reclaimable emphasis), `held-only` muted.
- Per-row actions (context-aware, right-aligned):
  - `local` → `Offload` (primary button) + `Delete local` (red text-link — requires confirm toast)
  - `held-local` → `Delete local` (red primary — saves disk, this is the reclaim action) + `Clear T7 copy` (subtle text-link)
  - `held-only` → `Restore` (primary — opens confirm popover) + `Delete everything` (red text-link — opens HoldDeleteModal)
- Offload flow: click `Offload` → existing `useHoldProject` mutation → on success, query invalidates → row auto-updates to `held-local` → `Delete local` (red primary) appears as next natural action in same row.
- Inline delete-local: 2-second toast with `Undo` button; on timeout, fires existing delete-project-local endpoint. No typed-code.
- Nuclear delete-everything: launches existing HoldDeleteModal with project pre-filled.
- Component accepts optional props: `initialFilter?: 'all' | 'local' | 'held' | 'reclaimable'`, `initialSearch?: string` (for deep-link support in WU4).
- Tests: component test for filter logic (given rows array + filter → correct subset); test for state→actions mapping (given row state → correct action buttons rendered).

### WU3: Batch operations

**Done when**:
- Header checkbox selects all rows in *current filter* (not all rows in all filters).
- Selected rows tracked in component state as `Set<projectCode>`; cleared on filter change.
- Selection footer (fixed bottom within Archive tool): `{N} selected · {totalBytes}` + action buttons + `Clear selection` text-link.
- Batch actions appear only when selection is homogeneous:
  - All selected `local` → show `Offload selected (N)`
  - All selected `held-local` → show `Delete local from selected (N)`
  - Mixed selection → show only `Clear selection`
- `POST /api/manage/batch-offload` `{ projects: string[] }` → loops sequentially, calls existing `holdProject` per item, returns `{ results: Array<{ projectCode, success, error? }> }`.
- `POST /api/manage/batch-delete-local` same shape.
- Both endpoints reject empty array (400) and validate each project's state matches the operation (400 on mismatch).
- Progress UI: footer changes to `Processing 2/4: jfli-relay…` during batch; on completion, toast summary: `3 offloaded, 1 failed (jfli-xyz: rsync error)`.
- Query invalidation on batch completion (success OR failure): `archive-inventory`, `hold-status`, `disk-size-data`.
- Tests: route tests for both batch endpoints — empty array rejection, state-mismatch rejection, partial failure (one project fails, others succeed, all results returned).

### WU4: Deep-link entry points

**Done when**:
- `SsdIndicator` (T7 header pill): `onClick` navigates to ManagePanel with `activeTool='archive'` + `initialFilter='held'`. Remove existing Projects-tab navigation.
- `RecordingsView` projects table T7 badge: currently a `<span>` with amber styling → becomes `<button>` with same visuals, `onClick` navigates to Archive with `initialSearch={projectCode}`.
- `ManagePanel` accepts new optional props `initialArchiveFilter` + `initialArchiveSearch`; passes through to ArchiveTool.
- `App.tsx` navigation helpers: extend existing `setManageTool` pattern to accept tool-specific params (filter, search).
- `ProjectDrawer` SSD Offload section: replace with `ArchiveSummaryCard` sub-component showing:
  - State pill
  - Local size / T7 size (read-only)
  - Last offloaded date (if available)
  - Single `Manage in Archive →` link → navigates to Archive with `initialSearch={projectCode}` and closes drawer.
- All action buttons (Offload/Restore/Delete-local/Cancel-offload) removed from ProjectDrawer.
- Tests: navigation handlers fire with correct params; drawer summary card renders for each of 3 states.

### WU5: Restore confirm + drawer cleanup

**Done when**:
- `RestoreConfirmPopover` (or inline mini-dialog) component: triggered by `Restore` button in ArchiveTool row.
- Copy: `Restore {projectCode}? {formatBytes(heldBytes)} will be copied back to local disk.` + `Restore` (primary) + `Cancel` buttons.
- On confirm: fires existing `useRestoreFromHolding` mutation; closes popover; query invalidation as current.
- ProjectDrawer SSD Offload dead code removed: all state-specific branches, `offloadDisabledReason` text, the 9-state conditional rendering — all gone. Component diff should show ~100-200 lines removed from ProjectDrawer.
- HoldDeleteModal launch from drawer removed; modal code itself stays (used by Archive nuclear action).
- Any existing tests referencing drawer-based offload actions updated to use Archive tool flows, OR removed if redundant with new Archive tests.
- Test count ≥ 1074 (baseline); new tests offset any removed drawer tests.

---

## Reference Patterns

### Inventory endpoint pattern (for WU1)

```typescript
// server/src/routes/manage.ts
router.get('/archive-inventory', async (_req, res) => {
  const config = getConfig();
  const projectsRoot = expandPath(config.projectsDirectory);
  const t7Root = findT7HoldingRoot(); // existing helper from hold.ts

  const entries = await fs.readdir(projectsRoot, { withFileTypes: true });
  const projectDirs = entries.filter(e => e.isDirectory()).map(e => e.name);

  const rows: ArchiveRow[] = await Promise.all(
    projectDirs.map(async (projectCode) => {
      const projectPath = path.join(projectsRoot, projectCode);
      const [holdStatus, diskData] = await Promise.all([
        getHoldStatus(projectCode, t7Root),
        getDiskSizeData(projectPath),
      ]);
      const localBytes = diskData.totalBytes;
      const heldBytes = holdStatus.heldBytes ?? 0;
      const held = heldBytes > 0;
      const state: ArchiveState =
        held && localBytes > 0 ? 'held-local' :
        held ? 'held-only' : 'local';
      return { projectCode, projectPath, localBytes, heldBytes, held, state, lastTouched: holdStatus.lastTouched };
    })
  );

  res.json({ rows });
});
```

### Context-aware row actions pattern (for WU2)

```tsx
function RowActions({ row }: { row: ArchiveRow }) {
  switch (row.state) {
    case 'local':
      return (
        <>
          <PrimaryButton onClick={() => offload(row.projectCode)}>Offload</PrimaryButton>
          <RedTextLink onClick={() => deleteLocalWithUndo(row.projectCode)}>Delete local</RedTextLink>
        </>
      );
    case 'held-local':
      return (
        <>
          <RedPrimaryButton onClick={() => deleteLocalWithUndo(row.projectCode)}>Delete local</RedPrimaryButton>
          <SubtleTextLink onClick={() => clearT7(row.projectCode)}>Clear T7 copy</SubtleTextLink>
        </>
      );
    case 'held-only':
      return (
        <>
          <PrimaryButton onClick={() => setRestoreTarget(row)}>Restore</PrimaryButton>
          <RedTextLink onClick={() => setNukeTarget(row)}>Delete everything</RedTextLink>
        </>
      );
  }
}
```

### Batch endpoint pattern (for WU3)

```typescript
router.post('/batch-offload', async (req, res) => {
  const { projects } = req.body as { projects: string[] };
  if (!Array.isArray(projects) || projects.length === 0) {
    return res.status(400).json({ error: 'projects array required' });
  }
  const results: Array<{ projectCode: string; success: boolean; error?: string }> = [];
  for (const projectCode of projects) {
    try {
      await holdProject(projectCode); // existing util
      results.push({ projectCode, success: true });
    } catch (err) {
      results.push({ projectCode, success: false, error: (err as Error).message });
    }
  }
  res.json({ results });
});
```

### Deep-link navigation pattern (for WU4 — extends existing setManageTool)

```tsx
// App.tsx — extend existing navigation state
const [manageToolParams, setManageToolParams] = useState<{
  tool: ToolId;
  archiveFilter?: ArchiveFilter;
  archiveSearch?: string;
}>({ tool: 'projects' });

// SsdIndicator onClick:
onClick={() => {
  setManageToolParams({ tool: 'archive', archiveFilter: 'held' });
  changeTab('manage');
}}

// RecordingsView T7 badge onClick:
onClick={(e) => {
  e.stopPropagation(); // don't open drawer
  setManageToolParams({ tool: 'archive', archiveSearch: projectCode });
  changeTab('manage');
}}
```

---

## Anti-Patterns for This Campaign

1. **Do not keep action buttons in the drawer** — half-migration is worse than no migration. Drawer is read-only after this wave.
2. **Do not parallelise batch operations server-side** — rsync is I/O bound; running in parallel thrashes disk. Sequential with progress visibility is correct.
3. **Do not add a typed-code gate to inline `Delete local`** — that's the friction the whole campaign is removing. Use toast-with-undo. Only `Delete everything` (nuclear) keeps the typed-code modal.
4. **Do not auto-select rows on filter change** — selection should clear when filter changes to prevent acting on rows the user can no longer see.
5. **Do not invent new hold/restore backend logic** — reuse `holdProject`, `restoreFromHolding`, existing delete endpoints. Batch endpoints are thin loops over these.
6. **Do not use dashboards or timelines** — David's preference. Footer aggregate is one line of text; no charts.
7. **Do not leave the T7 pill pointing at Projects tab** — the whole point is Archive becomes THE destination. Half-fix defeats the campaign.

---

## Learnings (inherited + new)

- **Manage page `initialTool` pattern works well** — proven in wave 1 (SyncIndicator, RelayIndicator) and wave 2 (StorageTool onNavigateToRelay). Extend with `initialArchiveFilter` / `initialArchiveSearch` in this wave.
- **DiskSizeData already exposes per-subfolder breakdown** via `detail.other` — but for this wave we just need `totalBytes` aggregate per project.
- **HoldDeleteModal is self-contained** — keep it; launch only from Archive nuclear action in this wave.
- **delete-subfolder allowlist from wave 2** — `['edit-1st', 'edit-2nd', 'final', '-trash', 's3-staging', 'inbox']`. Not directly used this wave but good context if row actions ever need sub-project deletes.
- **Archive inventory is the expensive endpoint** — single call aggregates hold + disk for every project. 30s staleTime balances freshness vs reload cost.
- **Reclaimable is the default filter when rows exist there** — this is the answer to the most-asked question. Matches "edit where the data is visible" — if there's something to reclaim, show it first.
