# Next Round Brief — FliHub

**Written**: 2026-03-19 (post relay-collaboration-phase-1 campaign)

---

## What Was Completed This Session

1. **relay-collaboration-phase-1** — 5 work units, all passing (668 tests)
   - `relayDirectory` + `relayEnabled` added to Config + saveConfig
   - `startRelayWatcher()` added to WatcherManager (awaitWriteFinish for large video files)
   - 3 relay socket events added to ServerToClientEvents
   - `server/src/routes/relay.ts` — GET status, POST preview/push/collect
   - `POST /api/system/git-sync` — git pull --rebase against projectsRootDirectory
   - `useRelayApi.ts` (4 hooks) + `RelayTool.tsx` (SlideOutDrawer) in ManagePanel
   - `useGitSync()` hook + Git Sync button in ManagePanel
   - Verified in browser via Playwright — both buttons visible, Relay drawer shows "not configured" (correct)
   - Committed + pushed: `dce171b`

2. **Code quality + test quality audits run** — 2 BLOCKERs found (shell injection), documented in assessment

---

## Current State

Build clean. 668 tests passing. relay-collaboration-phase-1 shipped.

**Relay is NOT yet usable** — needs:
1. SyncThing configured for `~/relay/flihub-appydave/` on both machines (never done — DSS used `david-jan`)
2. `relayDirectory` + `relayEnabled` added to `config.json` on both machines
3. relay-fixes campaign (shell injection BLOCKERs) before Jan uses it

---

## Immediate Next Step: Test Relay M4 Mini → M4 Pro

Before Jan, test the relay flow between your own two machines:

**Setup (one-time, on BOTH machines):**
1. `mkdir -p ~/relay/flihub-appydave`
2. Add to SyncThing on both machines — new shared folder → `~/relay/flihub-appydave`
3. Add to `server/config.json` on both machines:
   ```json
   "relayDirectory": "/Users/davidcruwys/relay/flihub-appydave",
   "relayEnabled": true
   ```

**Test flow:**
- M4 Mini: FliHub → Manage → Relay → Preview → Push Recordings
- SyncThing auto-syncs to M4 Pro
- M4 Pro: verify files landed in `~/relay/flihub-appydave/[project]/recordings/`

---

## Recommended Campaign: relay-fixes (before Jan)

Fix the 2 BLOCKERs + 4 MAJORs found in the code quality audit. Short campaign — 3 work units:

**Work unit 1: shell-injection-fix**
- `relay.ts` — replace `bash -lc "rsync ... '${path}'"` with `execFile('rsync', [...args])`
- `system.ts` git-sync — replace `bash -lc "cd '${repoDir}' && git pull --rebase"` with `execFile('git', ['pull', '--rebase'], { cwd: repoDir })`

**Work unit 2: relay-route-guards**
- Add `relayEnabled` check to all relay action routes (preview/push/collect)
- Validate `projectCode` (basename) is non-empty before constructing relay path
- Add pre-flight git repo check in git-sync (`git rev-parse --is-inside-work-tree`)

**Work unit 3: watcher-fix**
- Fix `updateFromConfig` in WatcherManager — handle `relayEnabled` toggle without `relayDirectory` change (currently watcher keeps running when disabled)
- Refactor `startRelayWatcher` to use shared `startWatcher()` helper (add `awaitWriteFinish?` to WatcherConfig)

---

## After relay-fixes: relay-tests

Test coverage for all the dark relay code (pure function + route guards are highest ROI):

1. `server/src/test/relay.test.ts` — `parseRsyncDiff` unit tests (pure function, ~30 min)
2. `server/src/test/relay-routes.test.ts` — route integration tests (mock execAsync)
3. `server/src/test/git-sync.test.ts` — git-sync route tests
4. `server/src/test/WatcherManager-relay.test.ts` — watcher lifecycle + relayEnabled toggle bug

---

## After relay-tests: relay-phase-2

- Wire relay socket events in RelayTool (live notification when files arrive from Jan)
- Emit real `projectCode` + `count` from `relay:recordings-available`
- Clear stale diff after successful push
- Emit `relay:edit-received` when collect succeeds

---

## Broader Backlog (14 items)

High structural debt (B033-B037) and feature backlog (B001, B003, B010-B014, B020-B023) — see `docs/planning/BACKLOG.md` for full list.

---

## Reference Files

- `docs/planning/relay-collaboration-phase-1/assessment.md` — full audit findings
- `docs/planning/relay-collaboration-phase-1/AGENTS.md` — relay-specific patterns (inherit for relay-fixes)
- `docs/planning/AGENTS.md` — baseline operational knowledge
- `docs/planning/BACKLOG.md` — canonical backlog (B038 now in progress)
