# Next Round Brief — FliHub

**Written**: 2026-03-19 (post test-coverage-gaps-2 campaign)

## What Was Completed This Session

1. AGENTS.md + BACKLOG.md cleanup (B024-B027 removed from Known Issues, counts corrected)
2. `pre-feature-stabilisation/assessment.md` written and committed
3. `test-coverage-gaps-2` campaign — 4 parallel agents, +57 tests (390→447), all passing (commit ec0b16a)
4. Relay collaboration deep research:
   - Architecture review: `docs/planning/architectural-review-relay-2026-03-19.md` (Grade B)
   - Requirements: `docs/planning/requirements-workflow-braindump-2026-03-19.md`
   - DSS reference implementation found: `apps/digital-stage-summit-2026/server/src/routes/sync.ts`
   - B038 backlog entry created

## Current State

Build clean. 447 tests passing. 14 pending backlog items.

## Recommended Next Campaign: relay-collaboration-phase-1

**B038 — Relay Collaboration Phase 1**

Work units (suggest planning with Extend mode):
1. Add relay config fields to `shared/types.ts` + `configManager.ts` saveConfig allowlist (`relayDirectory`, `relayEnabled`)
2. Add `startRelayWatcher()` to `WatcherManager.ts` — watches `~/relay/flihub-appydave/` independently of active project
3. `POST /api/relay/preview` — rsync dry-run, returns structured diff (new/updated/deleted files)
4. `POST /api/relay/push` + `POST /api/relay/collect` — confirmed rsync with relay folder
5. UI: RelayTool in ManagePanel (SlideOutDrawer pattern) — diff preview panel + confirm button

**Also ready to plan: git sync button** (separate work unit)
- `POST /api/system/git-sync` in `routes/system.ts`
- Runs `bash -lc "cd <projectsRootDirectory> && git pull --rebase"` via execAsync
- Emits `projects:changed` on success
- Three open product decisions still needed: auto vs user commit message, conflict UX, pull-only vs pull+push

## Key Architecture Already Decided

- Relay path convention: same/same mirroring (`v-appydave/b17/recordings/` → `~/relay/flihub-appydave/b17/recordings/`)
- Relay is bidirectional (David→Jan for recordings, Jan→David for edits + assets)
- rsync with `--dry-run --itemize-changes` for preview before confirm
- Cleanup is manual (post-publish, user discretion)
- `relayPartnerId` deferred — folder name encodes partnership
- SyncThing CANNOT touch git folders — relay folders are separate buckets only
- Git sync targets `config.projectsRootDirectory` (v-appydave root), not active project

## Reference Files

- `docs/planning/AGENTS.md` — read first
- `docs/planning/BACKLOG.md` — 14 pending, B038 is priority
- `docs/planning/architectural-review-relay-2026-03-19.md` — full review
- `docs/planning/requirements-workflow-braindump-2026-03-19.md` — full requirements
- `apps/digital-stage-summit-2026/server/src/routes/sync.ts` — working relay reference
- `server/src/routes/s3-staging.ts` — execAsync shell pattern to copy for gitUtils
