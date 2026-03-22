# Assessment: manage-relay-refactor (Wave 1)

**Campaign**: manage-relay-refactor
**Date**: 2026-03-22
**Results**: 6 complete, 0 failed
**Quality audit**: code-quality + test-quality audits run post-campaign

---

## Results Summary

| Work Unit | Status | Notes |
|-----------|--------|-------|
| security-fixes | Complete | `execFile` replaces `bash -lc` in relay.ts + system.ts. rsync parser fixed. .DS_Store exclusion added. |
| relay-route-guards | Complete | `relayEnabled` check on all POST routes. projectCode validation. WatcherManager toggle fix. |
| machine-role-config | Complete | `MachineRole` type, Config field, saveConfig allowlist, environment API response. |
| manage-layout-refactor | Complete | Sidebar: Record/Edit/Collaborate groups. Drawers widened to 600px. Git Sync moved to Collaborate. |
| retire-s3-staging | Complete | 3 files deleted (S3StagingTool, useS3StagingApi, s3-staging route). Bundle dropped ~20KB. |
| relay-tests | Complete | 48 new tests. parseRsyncDiff (19), relay routes (23), git-sync (6). Total: 504 → 552. |

---

## Post-Campaign Fix

**BLOCKER found by code-quality audit**: `updateConfig()` in `server/src/index.ts` did not propagate `relayEnabled`, `relayDirectory`, or `machineRole` to in-memory `currentConfig`. Config changes were persisted to disk but not applied at runtime until server restart. Fixed with 3 lines — relay and machineRole now update live.

---

## What Worked Well

1. **Wave design was correct** — 3 waves (3 parallel → 2 parallel → 1 sequential) matched the dependency graph. No merge conflicts between parallel agents.
2. **AGENTS.md inheritance** — relay-collaboration-phase-1 AGENTS.md provided agents with accurate patterns. No agent needed to rediscover mock patterns or file conventions.
3. **Security fixes landed cleanly** — `execFile` migration was straightforward with clear before/after examples in AGENTS.md.
4. **S3 retirement was surgical** — 3 files deleted, 4 files modified, no orphaned imports. POEM WUI functionality preserved independently.
5. **48 tests exceeded the 30+ target** — relay route guard coverage is thorough (all config permutations tested).

## What Didn't Work

1. **Agent scope creep** — Wave 1 security-fixes agent rewrote `poem-wui.ts` (switched from fs-extra to fs/promises, rewrote utility functions). Required manual revert. Need stricter scope boundaries in agent prompts.
2. **updateConfig propagation gap** — The AGENTS.md correctly documented that `updateConfig` in `index.ts` is "intentionally un-extracted" but didn't flag that new config fields MUST be added to it. The audit caught this as a BLOCKER.
3. **Error path tests missing** — All 3 relay POST routes have `catch` blocks returning 500, but none are tested. parseRsyncDiff tests are thorough but route error handling is untested.
4. **Pre-existing `exec()` in system.ts** — `openInFileExplorer` and `openInDefaultApp` still use shell string interpolation. Not a campaign regression but audit flagged it as MAJOR.

## Key Learnings — Application

1. **New config fields need THREE additions**: (a) `shared/types.ts`, (b) `configManager.ts` saveConfig allowlist, (c) `index.ts` updateConfig propagation. Missing any one creates a silent bug.
2. **`parseRsyncDiff` filename extraction after first space** is robust across different rsync versions and flag widths. The old `slice(12)` was version-dependent.
3. **S3 Staging removal leaves `s3Staging`/`s3Prep`/`s3Post` in the FolderKey type and folderMap** in system.ts. These folders still exist on disk, so the open-folder API should keep them for now.

## Key Learnings — Ralph Loop

1. **Agent scope creep is real** — one agent rewrote unrelated code (poem-wui). Future AGENTS.md should include an explicit "DO NOT MODIFY" list for files outside scope.
2. **Parallel agent conflicts on shared files need careful prompt design** — relay-route-guards and security-fixes both touched relay.ts. They merged cleanly because the prompts clearly delineated which parts each agent owned (guards vs exec/parser). This approach works.
3. **Post-campaign quality audit is high-value** — caught a BLOCKER (updateConfig propagation) that would have caused silent failures in Wave 2. The mandatory pause-and-ask before writing assessment is justified.

## Promote to Main KDD?

- **Config field triple-addition pattern** — worth adding to baseline AGENTS.md under Key Conventions
- **Agent "DO NOT MODIFY" list** — worth adding to Ralphy standard agent prompt template

## Suggestions for Next Campaign

1. **Add error path tests** for relay routes (3 tests: preview/push/collect rsync failure → 500)
2. **Add `._*` exclusion verification** to push/collect tests
3. **Extract relay guard + path helper** (`getRelayPaths(config)`) before Wave 2 adds more routes
4. **Fix `openInFileExplorer`/`openInDefaultApp` to use execFile** — pre-existing but increasingly inconsistent with the rest of the codebase
5. **Wave 2 AGENTS.md should include "DO NOT MODIFY" section** listing files agents must not touch
