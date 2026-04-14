# IMPLEMENTATION_PLAN.md — offload-cleanup-wave2

**Goal**: Add relay-clear operation, pre-offload folder cleanup in StorageTool, and auto-exclude junk from rsync. Make the full offload flow smooth: clear relay -> clean up folders -> offload lean project.
**Started**: 2026-04-13
**Target**: Relay clear per-subfolder. StorageTool shows folder breakdown with delete buttons. rsync excludes -trash/, s3-staging/, .DS_Store, ._*. Typecheck + tests pass.
**Requirements**: Assessment product analysis in `docs/planning/offload-manage-tool/assessment.md`

## Summary
- Total: 4 | Complete: 4 | In Progress: 0 | Pending: 0 | Failed: 0

## Wave A — Prerequisite (run first)

- [ ] WU1 — moved to Complete — `DELETE /api/relay/clear` accepts `{ subfolder: RelaySubfolder }`, deletes all files in the relay subfolder, guards: only when deriveSyncStatus is 'synced'. New `useRelayClear` hook in `useRelayApi.ts`. UI: "Clear" button on Kanban lane, enabled only when synced. After clear, invalidate relay browse + hold status queries (so StorageTool sees relayBytes drop to 0). Tests for endpoint + sync guard.

## Wave B — Main Wave (run in parallel after WU1)

- [ ] WU2 — moved to Complete — Pre-offload folder breakdown in StorageTool — In the `local-only` state, show a per-folder size breakdown above the offload button: recordings, edit-1st, edit-2nd, final, -trash, s3-staging, other. Each deletable folder (edit-1st, edit-2nd, final, -trash, s3-staging) has a delete icon-button. Clicking opens a lightweight confirm ("Delete edit-2nd? 313.9 MB will be freed. Cannot be undone."). New endpoint: `DELETE /api/manage/delete-subfolder` accepts `{ subfolder: string }`, validates subfolder is in an allowlist (edit-1st, edit-2nd, final, -trash, s3-staging, inbox), deletes folder contents (not the folder itself — just empties it). Uses existing `DiskSizeData.detail.other` for sizes. After delete, invalidate disk size + hold status queries. Tests for endpoint allowlist + guard.

- [ ] WU3 — moved to Complete — Auto-exclude junk from rsync — In `holdProject()` (`holdUtils.ts`), add `--exclude` args to the rsync command: `-trash/`, `s3-staging/`, `.DS_Store`, `._*`. Same excludes for `restoreFromHolding()` (don't restore junk back). Update dry-run byte calculation to exclude these folders too (subtract trash + s3-staging bytes from localBytes). Tests for exclude behavior.

- [ ] WU4 — moved to Complete — Relay-blocked UX improvement — When StorageTool shows "Relay active — clear X in relay", add a "Go to Relay" link-button that navigates to Manage→Relay tool (same pattern as T7 pill nav: `onToolClick('relay')`). If all relay lanes are synced, change the message to "Relay synced but not cleared — clear relay folders to unblock offload" with the same link. This makes the blocked state actionable instead of a dead end.

## In Progress

## Complete

- [x] WU1 — Relay clear endpoint + UI — `DELETE /api/relay/clear` with sync-status guard. `useRelayClear` hook. "Clear" red text-link on KanbanLane when synced + has files. 8 new tests. Invalidates relay-browse + hold-status. 1054 tests pass.

- [x] WU2 — Pre-offload folder breakdown in StorageTool — FolderBreakdown sub-component shows per-folder sizes in local-only state. Deletable folders (edit-1st, edit-2nd, final, -trash, s3-staging, inbox) have delete icon with inline confirm. `DELETE /api/manage/delete-subfolder` with allowlist guard. `useDeleteSubfolder` hook in `useProjectDiskApi.ts`. 6 new endpoint tests. 1074 tests pass.

- [x] WU3 — Auto-exclude junk from rsync — `HOLD_EXCLUDES` constant and `holdExcludeArgs()` in holdUtils.ts. Applied to both `holdProject()` and `restoreFromHolding()`. Dry-run subtracts trash + s3-staging bytes. `getDirStats` now exported. 5 new tests. 1074 tests pass.

- [x] WU4 — Relay-blocked UX improvement — `onNavigateToRelay` prop on StorageTool. "Go to Relay" blue link in relay-blocked message. ManagePanel wires `setActiveTool('relay')`. Pure UI, no new tests needed. 1074 tests pass.

## Failed / Needs Retry

## Notes & Decisions

- WU1 is prerequisite because WU4 references the clear operation and WU2's offload flow benefits from relay being clearable
- WU2 delete-subfolder endpoint uses an allowlist — recordings and recording-transcripts are NOT deletable through this endpoint (recordings are source of truth, transcripts are cheap to keep)
- WU3 excludes are applied to both hold and restore rsync commands for consistency
- The folder breakdown in WU2 reuses DiskSizeData.detail.other which already has per-subfolder sizes. May need to add edit-1st, edit-2nd, final to the detail breakdown if they're currently lumped into "other"
- David's workflow: "I must say second edit is never in a backup, only final" — but we don't auto-skip edit-2nd. Instead, the delete button lets David remove it before offloading. His choice, not ours.
