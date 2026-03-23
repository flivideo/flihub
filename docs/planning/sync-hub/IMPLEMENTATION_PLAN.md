# IMPLEMENTATION_PLAN.md — sync-hub

**Goal**: Build two-channel Sync Hub (B044) — git status/push/pull for App Code + Video Project repos with persistent header indicators, notification banners, and simplified conflict handling.
**Started**: 2026-03-23
**Target**: Persistent header indicators show sync state on all pages. Sync tool page under Manage > Collaborate > Sync. Video project push with auto-commit. App code + video project pull. Simplified conflict resolution. Old "Git Sync" button removed.

## Summary
- Total: 6 | Complete: 6 | In Progress: 0 | Pending: 0 | Failed: 0

## Pending

## In Progress

## Complete

- [x] sync-status-endpoints — GET /api/sync/status with getChannelStatus() helper. 9 tests. Route wired at /api/sync in index.ts.
- [x] sync-actions-endpoints — POST /push (auto-commit+push video project), POST /pull (both channels with conflict detection), POST /resolve (keep-mine/keep-theirs). buildCommitMessage helper. Removed old POST /git-sync from system.ts. 15 tests.
- [x] sync-types-and-hooks — useSyncStatus (120s polling), useSyncPush, useSyncPull, useSyncResolve hooks. QUERY_KEYS.syncStatus. Removed useGitSync + Git Sync button from ToolsSidebar. Client build passes.
- [x] sync-header-indicators — SyncIndicator component with two colour-coded pills (Project + Code) in App.tsx header. Click navigates to Manage > Sync. ManagePanel accepts initialTool prop.
- [x] sync-tool-page — SyncTool.tsx with two channel cards, status badges, state rows, role-aware action buttons, notification banners. Added 'sync' to ActiveTool. Sync button in ToolsSidebar Collaborate group.
- [x] sync-conflict-ui — Conflict state management in SyncTool. Purple-themed conflict banner + per-file resolution cards (Keep mine / Keep theirs). Disables push/pull while conflicts exist.

## Failed / Needs Retry

## Notes & Decisions
- Wave 1: sync-status-endpoints, sync-actions-endpoints, sync-types-and-hooks (plumbing) — COMPLETE
- Wave 2: sync-header-indicators, sync-tool-page, sync-conflict-ui (UI) — COMPLETE
- App Code is READ-ONLY in the UI — show dirty/behind status but no push. David commits/pushes from terminal.
- Video Project push auto-commits with a descriptive message built from git status (file names grouped by type), then pushes.
- App Code pull shows restart instructions (manual) — no auto-restart for now.
- Conflict resolution simplified: keep mine / keep theirs only. No diff view (binary files).
- Polling interval: 120s (2 minutes) — not 30s.
- App code directory: process.cwd() — no new config field needed.
- Replaces old POST /api/system/git-sync endpoint and useGitSync() hook.
- Mockup reference: `.mochaccino/designs/sync-hub/index.html`
- Next-round brief reference: `docs/planning/next-round-brief.md`
- Final test results: 80 shared + 162 client + 744 server = 986 total, 0 failures
- Pre-existing server tsc error in renameRecording.test.ts (unrelated)
