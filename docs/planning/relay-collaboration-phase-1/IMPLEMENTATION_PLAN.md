# IMPLEMENTATION_PLAN.md — relay-collaboration-phase-1

**Goal**: Add relay collaboration support — David can push raw recordings to `~/Relay/FliHub-appydave/` (SyncThing folder Jan watches), Jan can push edits back, FliHub UI shows diff preview before confirming. Git sync button lets either user pull project state updates without touching the terminal.
**Started**: 2026-03-19
**Target**: `npm test` passes, `npm run build` clean, relay push/collect/preview working in browser, git sync button working.

## Summary
- Total: 5 | Complete: 5 | In Progress: 0 | Pending: 0 | Failed: 0

---

## Pending

- [ ] relay-ui — Create `client/src/hooks/useRelayApi.ts` + `client/src/components/shared/RelayTool.tsx` (SlideOutDrawer pattern); add RelayTool to ManagePanel tab (B038)

## In Progress

(none)

## Complete

- [x] relay-config-fields — `relayDirectory?` + `relayEnabled?` added to Config interface + saveConfig allowlist. 38 shared + 504 server tests passing.
- [x] git-sync — POST /api/system/git-sync in system.ts (execAsync bash -lc git pull --rebase); useGitSync() hook in useSystemApi.ts; Git Sync button wired into ToolsSidebar + ManagePanel. 504 server + 126 client tests passing.
- [x] relay-watcher — startRelayWatcher() added to WatcherManager with awaitWriteFinish + depth:3 + 1000ms debounce; 3 relay socket events in ServerToClientEvents; wired into initAll() + updateFromConfig(). 38 shared + 504 server tests passing.
- [x] relay-routes — relay.ts created (GET status, POST preview/push/collect); parseRsyncDiff helper; wired into index.ts. 504 server tests passing.
- [x] relay-ui — useRelayApi.ts (4 hooks); RelayTool.tsx (SlideOutDrawer with status/preview/push/collect); wired into ToolsSidebar + ManagePanel. 126 client tests passing.

## Failed / Needs Retry

(coordinator moves items here with [!], adds failure reason)

---

## Notes & Decisions

**Wave design**:
- Wave 1 (parallel): `relay-config-fields` + `git-sync` — independent of each other; both are short, focused tasks
- Wave 2 (parallel): `relay-watcher` + `relay-routes` — both depend on relay-config-fields being done (types must exist); can run in parallel since watcher touches WatcherManager and routes touches new file relay.ts
- Wave 3: `relay-ui` — depends on relay-watcher (socket events) + relay-routes (API endpoints)

**Product decisions settled before build**:
- Git commit message: auto timestamp `"FliHub sync YYYY-MM-DD HH:mm"` — no user input needed for MVP
- Git conflict UX: show raw stderr in toast.error for MVP — no dedicated conflict panel
- Pull-only for MVP: `git pull --rebase` only; no push from FliHub
- rsync used for relay file operations (dry-run `--itemize-changes` for preview)
- Relay path convention: same/same mirroring `v-appydave/b17/recordings/` → `~/relay/flihub-appydave/b17/recordings/`
- `relayPartnerId` deferred — folder name encodes partnership
- Cleanup is manual — FliHub does not automate relay cleanup

**Open questions deferred**:
- Relay vs S3 for edits (relay is for raw recordings MVP; S3 continues for 1st/2nd edit)
- Shadow video removal — evaluate after relay Phase 2

**Reference files**:
- `docs/planning/AGENTS.md` — baseline operational knowledge
- `docs/planning/relay-collaboration-phase-1/AGENTS.md` — relay-specific extensions (read this one for this campaign)
- `docs/planning/architectural-review-relay-2026-03-19.md` — architectural decisions
- `server/src/routes/s3-staging.ts` — execAsync shell pattern to copy for relay routes
- `apps/digital-stage-summit-2026/server/src/routes/sync.ts` — working relay reference (if accessible)
