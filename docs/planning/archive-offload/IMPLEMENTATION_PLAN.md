# IMPLEMENTATION_PLAN.md — Project Archive Offload (B064)

**Goal**: Add "Hold on SSD" offload (local → HOLDING, flat) and restore (HOLDING → local) to FliHub. Both directions are symmetric: rsync → verify → delete. Verification gates every delete. Abandoned mid-flow state (`'both'`) is detected on restart and surfaced with recovery UI.
**Started**: 2026-04-08
**Requirements**: `docs/planning/archive-offload/MENTAL-MODEL.md`, `docs/planning/archive-offload/AGENTS.md`

## Summary
- Total: 8 | Complete: 8 | In Progress: 0 | Pending: 0 | Failed: 0

## Pending

- [ ] **hold-utils** — `server/src/utils/holdUtils.ts` (NEW):
  - `checkSsdMounted(holdingRoot)` — checks T7 mount point, not brand subfolder (may not exist yet)
  - `verifyHoldingMatch(localDir, holdingDir)` — file count + total bytes comparison; returns `HoldVerification`; never throws
  - `getHoldStatus(...)` — location detection, relay bytes, SSD mount, auto-runs verify when `location === 'both'`
  - `holdProject(projectDir, holdingRoot)` — rsync local → HOLDING flat; `spawn` array args
  - `restoreFromHolding(holdingDir, localDir)` — rsync HOLDING → local; creates localDir if missing
  - `deleteLocalProject(projectDir, projectsRoot)` — 5-gate safety chain; unit tested with temp dirs
  - `deleteHoldingProject(holdingDir, holdingRoot)` — symmetric 5-gate safety chain; unit tested
  - Unit tests: all 5 delete gates × 2 functions + full `verifyHoldingMatch` suite + one real rsync integration test

- [ ] **hold-routes** — `server/src/routes/hold.ts` (NEW) + register in `routes/index.ts`:
  - `GET /api/projects/:code/hold/status` — full status including verify if `location === 'both'`
  - `POST /api/projects/:code/hold` — rsync to HOLDING + auto-verify; body `{ dryRun? }`
  - `POST /api/projects/:code/hold/verify` — on-demand verify (used after app restart)
  - `DELETE /api/projects/:code/local` — delete local; gates: HOLDING exists + verify match + confirmCode
  - `POST /api/projects/:code/hold/restore` — rsync from HOLDING + auto-verify
  - `DELETE /api/projects/:code/holding` — delete HOLDING copy; gates: local exists + verify match + confirmCode

- [ ] **client-hook** — `client/src/hooks/useHoldApi.ts` (NEW) + re-export from `useApi.ts`:
  - `useHoldStatus(code)` — 30s stale time; includes verification when `location === 'both'`
  - `useHoldProject()` — mutation; invalidates holdStatus + projectDisk on success
  - `useVerifyHolding()` — on-demand mutation; invalidates holdStatus
  - `useDeleteLocal()` — mutation; invalidates holdStatus + projectStats
  - `useRestoreFromHolding()` — mutation; invalidates holdStatus + projectDisk
  - `useDeleteHolding()` — mutation; invalidates holdStatus
  - Add `holdStatus` to `QUERY_KEYS` in `queryKeys.ts`

- [ ] **hold-delete-modal** — `client/src/components/HoldDeleteModal.tsx` (NEW):
  - Shared modal for both delete operations (controlled by `target: 'local' | 'holding'`)
  - Shows: folder name, bytes freed, target path
  - Shows verification status: "X files, X GB — verified ✓" or "Not verified ✗"
  - Input: type project code; confirm button disabled until exact match
  - Does not submit if verification has not passed (defence in depth)

- [ ] **drawer-hold-section** — Add "SSD Hold" section to `ProjectDetailDrawer.tsx` below Disk Usage:
  - **7 UI states** (see AGENTS.md for full layout per state):
    1. `relay-blocked` — amber warning, relay bytes shown, no buttons
    2. `ssd-not-mounted` — muted "SSD not available"
    3. `local-only` — [Hold on SSD] + [Dry Run] buttons
    4. `both-verifying` — spinner while verification runs
    5. `both-verified-match` — amber warning + [Free X GB — Delete Local] + [Cancel hold]
    6. `both-verified-mismatch` — red warning + [Re-run rsync] + [Cancel hold]
    7. `holding-only` — [Restore from SSD] button, held timestamp
    - After restore: symmetric states 4–6 for deleting HOLDING copy
  - Abandoned mid-flow recovery: state detected on drawer open; auto-triggers verify; presents [Complete] / [Cancel] / [Defer] options

- [ ] **projects-panel-hold-badge** — `ProjectsPanel.tsx`:
  - `'both'` state → amber `T7 ⚠` badge; tooltip "Offload incomplete — space not freed"
  - `'holding-only'` state → muted `T7` badge; tooltip "On HOLDING SSD"
  - No badge for `'local-only'`
  - Badge data sourced from disk cache `holdingPath` / hold status query


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
