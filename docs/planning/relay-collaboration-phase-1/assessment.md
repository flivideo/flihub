# Assessment: relay-collaboration-phase-1

**Campaign**: relay-collaboration-phase-1
**Date**: 2026-03-19 → 2026-03-19
**Results**: 5 complete, 0 failed
**Quality audit**: code-quality-audit + test-quality-audit run post-campaign

---

## Results Summary

| Work unit | Result | Notes |
|-----------|--------|-------|
| relay-config-fields | ✓ | `relayDirectory?` + `relayEnabled?` in Config + saveConfig allowlist |
| git-sync | ✓ | POST /api/system/git-sync + useGitSync() hook + Git Sync button in ManagePanel |
| relay-watcher | ✓ | startRelayWatcher() in WatcherManager + 3 socket events in ServerToClientEvents |
| relay-routes | ✓ | relay.ts (status/preview/push/collect + parseRsyncDiff) wired into index.ts |
| relay-ui | ✓ | useRelayApi.ts (4 hooks) + RelayTool.tsx (SlideOutDrawer) in ManagePanel |

Test counts: 38 shared + 504 server + 126 client = **668 total passing** (up from 447 pre-campaign)

---

## What Worked Well

1. **Wave structure was clean** — config fields first, then watcher + routes in parallel, then UI. No agent conflicts. All 5 agents completed without retries.
2. **AGENTS.md relay extensions were sufficient** — agents found the right patterns (S3StagingTool template, SlideOutDrawer, route factory) without needing additional guidance.
3. **Architectural pre-work paid off** — the prior session's architectural review gave agents exact code patterns (rsync commands, WatcherManager extension point, saveConfig allowlist pattern) that were used correctly.
4. **All builds clean, zero regressions** — 668 tests pass. No agent introduced a TypeScript error or broke an existing test.
5. **git-sync agent correctly found the ToolsSidebar/ManagePanel wiring pattern** independently — no explicit guidance was needed for this.

---

## What Didn't Work

### BLOCKERs (fix before Jan uses this)

1. **Shell injection in relay.ts** (lines 38, 62, 65, 89) — rsync and mkdir commands embed `projectDirectory` and `relayDirectory` paths using single-quote shell escaping. A path containing a single-quote character breaks the quoting and allows arbitrary command execution. `config.projectDirectory` is a free-text field editable by the user. Fix: switch to `execFile('rsync', [...args])` to avoid a shell entirely, or validate no single-quote chars in paths before executing.

2. **Shell injection in system.ts git-sync** (line 584) — same vulnerability: `bash -lc "cd '${repoDir}' && git pull --rebase"`. Fix: use `execFile('git', ['pull', '--rebase'], { cwd: repoDir })`.

### MAJORs

3. **relay-routes missing `relayEnabled` check** — push/collect/preview routes check `relayDirectory` but not `relayEnabled`. A configured-but-disabled relay still accepts file operations.

4. **projectCode not validated** — `path.basename(projectDirectory)` used as relay subdirectory name with no empty/traversal check. Trailing slash on `projectDirectory` produces empty `projectCode`, collapsing relay path to relay root.

5. **WatcherManager.startRelayWatcher bypasses shared helper** — duplicates debounce logic instead of using the private `startWatcher()` abstraction. Will silently diverge if the helper is modified.

6. **Known bug: `updateFromConfig` ignores `relayEnabled` toggle** — if `relayEnabled` changes from true to false without `relayDirectory` changing, the relay watcher continues running. Surfaced by test-quality audit; would be caught immediately by writing WatcherManager tests.

7. **No pre-flight git repo check** in git-sync — `git pull` on a non-repo returns an unreadable error string. Should check `git rev-parse --is-inside-work-tree` first.

8. **No `res.ok` checks** in `useRelayApi.ts` hooks — non-2xx HTTP responses silently parsed as success, masking server errors.

9. **Zero tests written for any new code** — all relay routes, parseRsyncDiff, git-sync, WatcherManager relay logic, and hooks are completely dark. Silent failures produce data loss with no observable signal.

### Minors

- Relay socket events (`relay:edit-received`, `relay:sync-status`) are defined and typed but never emitted — dead infrastructure in phase 1
- `relay:recordings-available` emits stub `{ projectCode: '', count: 0 }` — no real data
- Stale diff not cleared in `RelayTool` after push — misleads user about current relay state
- `diff === null` guard on Push button not visually communicated as a required workflow step

---

## Key Learnings — Application

1. **rsync/git shell commands need `execFile` not string interpolation** — this project uses `bash -lc "cd '${path}'"` extensively (copied from s3-staging.ts). That pattern is safe only for controlled system paths. User-configured paths (projectDirectory, relayDirectory) are free-text and can contain single quotes. The relay campaign propagated the vulnerability by copying the pattern without scrutiny. All future shell commands with user-supplied paths should use `execFile` with argument arrays.

2. **Route guards should check both `configured` and `enabled`** — when a feature has both a path config and an enable toggle, action routes must check both. The status endpoint exposed both flags; the action routes only checked one.

3. **`startWatcher()` abstraction must be respected** — WatcherManager has a private helper that centralises debounce + error handling. Bypassing it (as `startRelayWatcher` did) creates maintenance divergence. The right fix is to extend `WatcherConfig` to support `awaitWriteFinish` and route through the helper.

4. **Pre-flight path validation** — before running any shell command, validate: non-empty, no traversal (`..`), no shell-special characters (for string-interpolated commands), and the path actually exists on disk.

---

## Key Learnings — Ralph Loop

1. **Wave 2 parallel was clean** — watcher agent (WatcherManager.ts + shared/types.ts) and routes agent (new relay.ts + index.ts) had zero file overlap. Good decomposition.
2. **Code quality audit found BLOCKERs that tests would not** — the shell injection issues are not testable without actually running malicious paths. Pre-ship code audit is load-bearing here.
3. **Test-quality audit surfaced a known bug** — the `relayEnabled` toggle bug in `updateFromConfig` was not caught by any existing test. Writing WatcherManager tests would expose it immediately. Add test-writing to wave 2 scope next time for WatcherManager changes.

---

## Promote to Main KDD?

Suggested (human makes final call):

- **rsync/git safety**: always use `execFile` with argument arrays for user-supplied paths; string interpolation is safe only for hardcoded system paths
- **Feature guard pattern**: action routes must check both `xyzDirectory` (configured) and `xyzEnabled` (enabled) when a feature has both
- **WatcherManager extension**: extend `WatcherConfig` to add `awaitWriteFinish?` option, then route all watchers through `startWatcher()` — no direct chokidar calls in the class

---

## Suggestions for Next Campaign

**relay-collaboration-phase-1-fixes** (should happen before Jan uses the relay feature):

Priority order:
1. Fix shell injection — `execFile` for rsync + git commands (2 files: relay.ts + system.ts)
2. Add `relayEnabled` check to relay action routes
3. Validate `projectCode` non-empty before constructing relay path
4. Fix `updateFromConfig` relayEnabled toggle bug in WatcherManager
5. Write tests: `parseRsyncDiff` unit tests (pure function, 30 min), relay-routes integration tests (mock execAsync), git-sync route tests

**relay-collaboration-phase-2** (after fixes):
- Emit real `projectCode` and `count` from `relay:recordings-available`
- Wire relay socket events in RelayTool (live notification when Jan pushes edits back)
- Clear stale diff after successful push
- Add `relay:edit-received` emission when collect succeeds
