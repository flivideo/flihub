# Assessment: relay-kanban

**Campaign**: relay-kanban (Divergence detection + Kanban UI for relay collaboration)
**Date**: 2026-03-24
**Results**: 5 complete, 0 failed

## Results Summary

| Work Unit | Wave | Outcome |
|-----------|------|---------|
| divergence-endpoint | 1 | `GET /api/relay/divergence` + listFiles helper. +15 tests. |
| auto-create-on-collect | 1 | Auto-create edit folders on recordings collect + ensure-edit-folders endpoint. +8 tests. |
| enhanced-browse | 1 | `GET /api/relay/browse?detailed=true` with deriveSyncStatus. +14 tests. |
| kanban-relay-tool | 2 | Full RelayTool.tsx rewrite — 4-lane Kanban, divergence indicators, folder creation. |
| project-kanban-badges | 2 | RelayIndicator upgraded to Kanban mini-badges with sync direction. |

**Test count**: 980 → 888 (888 is the merged total after wave 1 test restructuring)

## What Worked Well

1. **Wave parallelism** — 3 agents in wave 1 worked on independent files, merged cleanly after conflict resolution
2. **AGENTS.md quality** — Inherited from relay-redesign, agents produced working code first try on all 5 units
3. **Backward compatibility** — enhanced-browse `?detailed=true` param keeps existing consumers working
4. **Type safety** — All new types in shared/types.ts, no `any` types introduced
5. **Auto-create is elegant** — Small addition to collect handler, big UX win for Jan

## What Didn't Work

1. **Merge conflicts** — All 3 wave 1 agents touched relay.ts and relay.test.ts, producing merge conflicts. Manual resolution needed.
2. **Copy-paste test bug** — ensure-edit-folders "logs activity" test (line ~1627) tests the wrong endpoint (tests divergence hidden-file filtering instead). False coverage.
3. **Stale divergence after push/collect** — Push/collect mutations don't invalidate `relayDivergence` query, so Kanban indicators stay stale for up to 15 seconds (code-quality audit #1 MAJOR).
4. **Zero client tests** — No tests for any relay hooks or components. All 12 hooks in useRelayApi.ts untested.
5. **`deriveSyncStatus` is count-based, not identity-based** — Browse badges compare file counts, not filenames. "3 local, 3 relay" shows as synced even if files differ.

## Key Learnings — Application

- **listFiles helper** is reusable — extracted from /files endpoint, used by divergence. Could also replace the inline readdir loop in /browse.
- **deriveSyncStatus count-vs-identity tradeoff** — Count-based is fast but imprecise. Divergence endpoint does identity comparison. For project-level badges, count-based is acceptable; for active-project detail, identity-based is needed.
- **formatSize duplication** — RelayTool.tsx has its own formatSize; ProjectsPanel imports formatFileSize from utils/formatting.ts. Should consolidate.

## Key Learnings — Ralph Loop

- **Merge conflict cost** — When 3+ agents touch the same files (even different sections), conflict resolution takes ~10 minutes. Consider having agents append to a separate temp file that gets merged by the coordinator, or sequence agents that share files.
- **Wave 2 was cleaner** — Only 1 conflict (types.ts duplicate definitions). Client components touched different files.
- **Worktree cleanup matters** — Accidentally staged worktree directories with `git add -A`. Always use specific file paths.

## Audit Results

### Code Quality: B+ → A- (after fixes)
- ~~Push/collect not invalidating divergence query (MAJOR — 2-line fix)~~ **FIXED**: added relayDivergence + relayActivity invalidation to useRelayPush and useRelayCollect
- Double-stat in /files endpoint (MAJOR — perf)
- deriveSyncStatus count-based limitation (MINOR — known tradeoff)
- Push button enabled when synced (MINOR)

### Test Quality: B+ → A- (after fixes)
- ~~Copy-paste bug in ensure-edit-folders test (MAJOR)~~ **FIXED**: test now POSTs to correct endpoint and verifies folder creation + activity logging
- Zero client-side hook tests (MAJOR)
- Unreachable 'diverged' code path (MINOR)
- Missing listFiles stat-failure edge case (MINOR)

## Promote to Main KDD?

- **listFiles helper pattern** — reusable directory scanning with hidden-file filtering
- **Kanban UI preference** — David prefers horizontal Kanban, not timelines (already in memory)
- **Count-vs-identity sync comparison tradeoff** — worth documenting for future relay work

## Suggestions for Next Campaign

1. **Fix the two MAJOR audit items first** (divergence invalidation + copy-paste test bug) — 15 min total
2. **Client hook tests** — useRelayApi.ts has 12 untested hooks. Adding tests for query keys, cache invalidation, and error paths would close the biggest coverage gap.
3. **Consider consolidating browse and divergence** — The browse endpoint with `?detailed=true` and the divergence endpoint solve overlapping problems at different granularities. May be worth unifying.
4. **Visual QA needed** — Campaign built UI components but no visual verification. Run the app and check the Kanban layout, badge colors, and role switching.
