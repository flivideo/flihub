# B044 Sync Hub — Campaign Assessment

**Campaign**: sync-hub (branch: `sync-hub`)
**Backlog item**: B044
**Date**: 2026-03-23
**Work units**: 6/6 complete

## What was built

Two-channel git sync system — persistent header indicators + full Sync tool page under Manage > Collaborate > Sync.

- **App Code channel**: read-only status (dirty/behind/ahead), pull with restart instructions
- **Video Project channel**: auto-commit + push (creator only), pull, conflict resolution
- **Header indicators**: two colour-coded pills in the app header, clickable to navigate to Sync tool
- **Conflict UI**: purple-themed per-file resolution cards (keep mine / keep theirs)
- **Replaces**: old POST /api/system/git-sync endpoint and useGitSync() hook

## Files changed

### New files
- `server/src/routes/sync.ts` — 4 endpoints + helpers
- `client/src/hooks/useSyncApi.ts` — 4 React Query hooks
- `client/src/components/shared/SyncTool.tsx` — full sync page
- `client/src/components/shared/SyncIndicator.tsx` — header pills
- `server/src/test/sync.test.ts` — 24 tests
- `docs/planning/sync-hub/` — planning docs

### Modified files
- `shared/types.ts` — sync type definitions added
- `server/src/index.ts` — sync routes mounted
- `server/src/routes/system.ts` — old git-sync endpoint removed
- `client/src/components/ManagePanel.tsx` — sync tool + initialTool navigation
- `client/src/components/shared/ToolsSidebar.tsx` — sync button added, git sync removed
- `client/src/components/shared/index.ts` — barrel exports
- `client/src/App.tsx` — SyncIndicator in header
- `client/src/hooks/useSystemApi.ts` — useGitSync removed
- `client/src/hooks/useApi.ts` — useSyncApi re-export
- `client/src/constants/queryKeys.ts` — syncStatus key
- `client/src/test/ToolsSidebar.test.tsx` — stale tests removed
- `server/src/test/relay.test.ts` — stale git-sync tests removed

## Test results
- 24 sync tests pass (status, push, pull, resolve, buildCommitMessage)
- Client build clean
- 986 total tests across project, 0 failures

## Post-audit fixes
- **M2**: `handleResolve` now uses tracked `conflictChannel` state instead of hardcoded `'video-project'`
- **M5**: `useSyncPull` parameter typed as `'app-code' | 'video-project'` union instead of `string`

## Known limitations
- App Code push is disabled in UI (creator uses terminal)
- No auto-restart after app code pull (manual instructions shown)
- Conflict resolution is keep-mine / keep-theirs only (no diff view — binary files)
- Polling interval 120s (intentional, not a limitation)
- Pre-existing tsc error in renameRecording.test.ts (unrelated)
