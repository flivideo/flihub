# IMPLEMENTATION_PLAN.md — Project Archive Offload (B064)

**Goal**: Add "Hold on SSD" offload (local → HOLDING, flat) and restore (HOLDING → local) to FliHub. Both directions are symmetric: rsync → verify → delete. Verification gates every delete. Abandoned mid-flow state (`'both'`) is detected on restart and surfaced with recovery UI.
**Started**: 2026-04-08
**Requirements**: `docs/planning/archive-offload/MENTAL-MODEL.md`, `docs/planning/archive-offload/AGENTS.md`

## Summary
- Total: 8 | Complete: 8 | In Progress: 0 | Pending: 0 | Failed: 0

## In Progress

## Complete

- [x] **hold-types** — Added HoldLocation, HoldVerification, HoldStatus, HoldOperationResult to shared/types.ts. Renamed B062 stubs archivedAt→heldAt, archivePath→holdingPath in DiskSizeData. No cascading renames needed. Server + client builds pass.

- [x] **config-holding-path** — Added holdingPath persistence to saveConfig() and loadConfig() migration in configManager.ts. holdingPath already existed in Config interface (added by hold-types agent). Default is undefined (machine-specific, optional). Server build passes.

- [x] **hold-utils** — Created server/src/utils/holdUtils.ts with 7 functions. 24 tests (6+6 safety chain, 4 verifyHoldingMatch, 6 rsync, 2 mount). Note: relay.ts uses execFile not spawn — holdUtils uses spawn (right call for rsync streams). Gate ordering: equality check before startsWith. 974 tests pass.

- [x] **hold-delete-modal** — Created HoldDeleteModal.tsx following ChapterRecordingModal.tsx pattern (backdrop click, Escape, warm linen classes). Both local/holding variants. 10 tests. Build clean. 4 pre-existing failures in ProjectDrawer/ProjectListToolbar unrelated.

- [x] **hold-routes** — Created server/src/routes/hold.ts with 6 endpoints. Added updateDiskCacheHoldData() + invalidateDiskCacheEntry() exports to projects.ts (cache was private). Registered at app.use('/api/projects', holdRoutes) in index.ts. Dry-run localBytes uses verifyHoldingMatch trick. Build pass, 0 new failures.

- [x] **client-hook** — Created useHoldApi.ts with all 6 hooks. holdStatus added to queryKeys.ts as factory fn. Barrel re-export added to useApi.ts. Invalidation follows projectDisk pattern. Build clean, 4 pre-existing failures only.

- [x] **drawer-hold-section** — Added SSD Hold section to ProjectDrawer.tsx (not ProjectDetailDrawer — name mismatch). All 9 states implemented. HoldDeleteModal wired. formatBytes imported from canonical utils. Build clean, 4 pre-existing failures only.

- [x] **projects-panel-hold-badge** — Option A (per-row hook). DiskSizeData has heldAt/holdingPath but can't derive location without endpoint. HoldBadge sub-component uses useHoldStatus per row. Placed in Relay cell after RelayIndicator. Relay column widened 48→64px. Build clean, 4 pre-existing failures only.

## Notes & Decisions

- **`'both'` is always transitional** — it means space has not been freed. The UI never presents it as a completed state. Badge is amber, not neutral.
- **Symmetric lifecycle** — hold phase and restore phase are mirrors. Both end with a delete gated on verification. Neither combines rsync + delete into one action.
- **Verification = file count + total bytes** — not MD5. Fast enough for the use case. MD5 would be too slow on video files. Counts + sizes catch any incomplete rsync.
- **Auto-verify after rsync** — the server runs `verifyHoldingMatch()` immediately after `holdProject()` or `restoreFromHolding()` and includes the result. Client does not need a separate verify step for the happy path.
- **On-demand verify endpoint** — for the abandoned mid-flow case (app restart). Client calls this when it finds `location === 'both'` with no recent verification.
- **HOLDING is flat** — `youtube-HOLDING/appydave/b72-project-name/`. No range subfolders. FliHub never writes to `youtube-PUBLISHED`.
- **New config key** — `holdingPath` alongside existing `archivePath`. HOLDING brand subdirectory is created by `holdProject()` if it doesn't exist. T7 root must already be mounted.
- **Use `spawn` with array args** — never `exec` with path templates. Relay campaign proved this. Project names have spaces and hyphens.
- **Temp dirs in tests** — not mocks for filesystem ops. Both `deleteLocalProject` and `deleteHoldingProject` safety chains must have full unit test coverage with real temp directories.
- **One integration rsync test** — a single test that actually runs rsync on a temp fixture and verifies files landed. This catches the "args were subtly wrong and nothing actually copied" failure that mocks would hide.

## Failed / Needs Retry
