# IMPLEMENTATION_PLAN.md — offload-manage-tool

**Goal**: Move all archive/offload UI from the buried ProjectDrawer into a dedicated Manage page tool. Rewire T7 header pill. Remove drawer section. Pure UI reorganization — no backend changes.
**Started**: 2026-04-13
**Target**: StorageTool in Manage sidebar, T7 pill → Manage, drawer SSD section removed. Typecheck + tests pass.
**Requirements**: `docs/planning/requirements-offload-ux.md`

## Summary
- Total: 3 | Complete: 3 | In Progress: 0 | Pending: 0 | Failed: 0

## Complete

- [x] WU1 — StorageTool component — Created `client/src/components/shared/StorageTool.tsx`. Three user-facing states (local-only / holding-only / both). Uses all 7 useHoldApi hooks. HoldDeleteModal reused for destructive confirms. Restore has lightweight confirm step. Blocked conditions as disabled buttons with inline reason text. LocationBadge sub-component. Warm linen tokens. Exported from `shared/index.ts`. 1036 tests pass.

- [x] WU2 — Wire StorageTool into ManagePanel — Added `'storage'` to ActiveTool union. Added `storage: 'Storage'` to toolHeadings. Added "SSD Offload" button to ToolsSidebar in new "Storage" group. ManagePanel renders `<StorageTool projectCode={config?.activeProject || ''} />` when active. Build clean, 1036 tests pass.

- [x] WU3 — Rewire T7 pill + remove drawer section — SsdIndicator prop renamed `onNavigateToProjects` → `onNavigateToStorage`. App.tsx wires it to `changeTab('export'); setManageTool('storage')` (same pattern as Sync/Relay). Removed entire SSD Offload section from ProjectDrawer.tsx (~170 lines): hold imports, hold state, hold useEffect, hold JSX section, HoldDeleteModal instance. All other drawer sections intact. Build clean, 1036 tests pass.

## In Progress

## Complete

## Failed / Needs Retry

## Notes & Decisions

- All 3 WUs are sequential (each depends on the prior) — this is a 1-wave campaign, run in sequence
- No new API endpoints or hooks — pure UI reorganization using existing useHoldApi.ts
- HoldDeleteModal is reused, not duplicated
- ProjectsPanel HoldBadge (T7 / T7 ⚠ per row) is unchanged — it's a useful at-a-glance indicator
- Lightweight restore confirm = simple "Restore project-code? This will copy X GB to local." with Confirm/Cancel buttons — NOT typed-code level
