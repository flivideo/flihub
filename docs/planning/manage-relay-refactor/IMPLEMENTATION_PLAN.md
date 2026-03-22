# IMPLEMENTATION_PLAN.md — manage-relay-refactor

**Goal**: Fix relay security bugs, add route guards, add machineRole config, refactor Manage page layout, retire S3 Staging, and add relay test coverage. Wave 1 of 2 — foundation fixes before relay feature expansion.
**Started**: 2026-03-22
**Target**: All security vulnerabilities fixed, relay routes guarded, machineRole config exposed, Manage page layout refactored with workflow-ordered sidebar, S3 Staging retired, relay code tested. `npm test` passes, `npm run build` clean.

## Summary
- Total: 6 | Complete: 6 | In Progress: 0 | Pending: 0 | Failed: 0

## Pending

(none) — Widen right panel from 480px to ~560-640px. Make centre content context-sensitive (show recordings list for Rename, relay folder browser for Relay, etc.). Reorder sidebar to workflow sequence: Record → Rename → Gling → Relay → Renumber. Remove "Simple Tools" / "Complex Tools" labels, replace with workflow-stage groupings. Move Git Sync to collaboration area near Relay.
- [ ] retire-s3-staging — Remove S3StagingTool from ManagePanel/ToolsSidebar. Relocate "Send to POEM WUI" action to a standalone button (near transcripts or in a utility section). Remove s3-staging route file and useS3StagingApi hook. Clean up S3-related socket events and watcher code if unused. Keep `s3Utils.ts` utility functions (used by other routes).
- [ ] relay-tests — Add `parseRsyncDiff` unit tests (new files, updated files, deleted files, mixed output, empty output, malformed lines). Add relay route integration tests (status, preview, push, collect — with `relayEnabled` guard coverage). Add git-sync route test. Target: 30+ new tests.

## In Progress

(none)

## Complete

- [x] security-fixes — `execFile` replaces `bash -lc` in relay.ts (rsync) and system.ts (git-sync). `fs.ensureDir` replaces shell mkdir. `parseRsyncDiff` fixed to parse filename after first space. `.DS_Store`/`._*` exclusion added to all rsync calls. `parseRsyncDiff` exported for testing. Reverted unauthorized poem-wui changes made by agent.
- [x] relay-route-guards — `relayEnabled` check added to all 3 POST routes (preview/push/collect). `projectCode` validated non-empty and no `..` traversal. WatcherManager `updateFromConfig` now checks both `relayDirectory` and `relayEnabled` changes.
- [x] machine-role-config
- [x] manage-layout-refactor — Sidebar restructured: "Simple Tools"/"Complex Tools" labels replaced with 3 workflow groups: Record (regen ops), Edit (rename, gling, renumber), Collaborate (git sync, relay). Git Sync moved to Collaborate. Drawers widened: Rename/Relay/Renumber from 480px to 600px. S3 Staging button already removed by sibling agent.
- [x] retire-s3-staging
- [x] relay-tests — 48 new tests in `server/src/test/relay.test.ts`. parseRsyncDiff: 19 tests (new/updated/deleted/mixed/empty/special chars/unicode/spaces/directory entries). Relay routes: 23 tests (GET status, POST preview/push/collect with guard coverage for relayEnabled, relayDirectory, projectDirectory, projectCode validation). Git-sync: 6 tests (missing config, correct execFile args, stdout/stderr, error handling). Total test count: 504 → 552. — S3StagingTool.tsx, useS3StagingApi.ts, s3-staging.ts all deleted. References removed from ManagePanel, ToolsSidebar, shared/index.ts, server/index.ts. POEM WUI send remains on its dedicated page. s3Utils.ts and poem-wui.ts kept. Bundle size dropped ~20KB. — `MachineRole` type exported from `shared/types.ts`. `machineRole?: MachineRole` added to `Config` interface. Added to `saveConfig` allowlist in `configManager.ts`. `machineRole` added to `EnvironmentResponse` type and `GET /api/system/environment` response (defaults to `'recorder'`).

## Failed / Needs Retry

(coordinator moves items here with [!], adds failure reason)

---

## Notes & Decisions

**Wave design**:
- Wave 1 (parallel, 3 agents): `security-fixes` + `relay-route-guards` + `machine-role-config` — all touch different files, no overlap
- Wave 2 (parallel, 2 agents): `manage-layout-refactor` + `retire-s3-staging` — both modify ManagePanel/ToolsSidebar but in opposite directions (one adds layout changes, one removes a tool). Run in parallel since retire removes S3StagingTool entirely and layout refactor restructures the sidebar — no merge conflict expected.
- Wave 3 (1 agent): `relay-tests` — runs last because it tests the fixed relay code from waves 1-2

**Dependencies**:
- `security-fixes` must land before `relay-tests` (tests should validate the fixed code)
- `relay-route-guards` must land before `relay-tests` (tests cover the guard behaviour)
- `manage-layout-refactor` + `retire-s3-staging` can run in parallel (different tool targets)
- `machine-role-config` is independent — no downstream dependencies in wave 1

**Product decisions (confirmed by David 2026-03-22)**:
- S3 Staging: remove entirely; relocate POEM WUI send to standalone location
- machineRole: single config field, not a role management system
- Archive to T7: deferred — out of scope for this campaign
- Layout: keep left sidebar, wider right panel (50-60% viewport), context-sensitive centre

**Security bugs being fixed**:
- Shell injection in relay.ts: `bash -lc "rsync ... '${path}'"` → `execFile('rsync', [...args])`
- Shell injection in system.ts: `bash -lc "cd '${repoDir}' && git pull --rebase"` → `execFile('git', ['pull', '--rebase'], { cwd: repoDir })`
- rsync parser: `line.slice(12)` hardcoded column → parse filename after first space

**Reference files**:
- `docs/planning/requirements-manage-relay-refactor.md` — full requirements
- `docs/planning/relay-workflow-diagrams.md` — file flow diagrams
- `docs/planning/relay-collaboration-phase-1/AGENTS.md` — relay-specific AGENTS.md (inherit)
- `docs/planning/AGENTS.md` — baseline AGENTS.md
