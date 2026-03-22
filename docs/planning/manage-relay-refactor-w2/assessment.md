# Assessment: manage-relay-refactor-w2 (Wave 2)

**Campaign**: manage-relay-refactor-w2
**Date**: 2026-03-22
**Results**: 6 complete, 0 failed
**Quality audit**: code-quality + test-quality audits run post-campaign; quick fixes applied

---

## Results Summary

| Work Unit | Status | Notes |
|-----------|--------|-------|
| relay-foundation | Complete | Extracted `getRelayPaths()`, `rsyncExcludeArgs()`, `RELAY_SUBFOLDERS`. 9 rsync exclusion patterns. 11 new tests. |
| relay-folder-browser | Complete | GET `/browse` endpoint, `RelayBrowser` table component, `useRelayBrowse()` hook with 30s refetch. 6 new tests. |
| relay-push-collect-full | Complete | Subfolder-aware preview/push/collect with body param. UI dropdown selector. Collect bug fixed (was relay/final/ → now relay/{subfolder}/). 10 new tests. |
| promote-to-final | Complete | GET `/versions` + POST `/promote`. Path traversal validation, existence check, `fs.copy` to final/. `EditVersion` type. Version list UI with selection. 11 new tests. |
| role-based-visibility | Complete | Push/Collect/Promote gated by machineRole. Used existing `useEnvironment()` from `useConfigApi.ts`. Recorder sees push-recordings + collect-edits + promote. Editor sees collect-recordings + push-edits. |
| visual-indicators | Complete | Color-coded status dots (blue=recordings, amber=edit-1st, emerald=edit-2nd). Summary footer row. Color legend. |

**Post-audit fixes**:
- Replaced duplicated `subfolderNames` array in browse route with `RELAY_SUBFOLDERS` constant (code-quality M3)
- Added invalid subfolder rejection tests for POST /push and /collect (test-quality MAJOR 2)
- Enhanced promote test to verify `fs.copy` source/dest paths (test-quality MAJOR 1)

---

## Test Count

| Phase | Tests |
|-------|-------|
| Pre-campaign | 552 |
| After wave 1 (foundation + browser) | 798 |
| After wave 2 (push-collect + promote) | 840 |
| After audit fixes | 842 |
| **Final** | **842** (38 shared + 126 client + 678 server) |

---

## Code Quality Audit Findings

| Severity | Count | Fixed |
|----------|-------|-------|
| BLOCKER | 0 | — |
| MAJOR | 4 | 1 fixed (M3 — duplicated subfolderNames) |
| MINOR | 7 | 0 (deferred) |
| INFO | 5 | — |

**Remaining MAJORs** (deferred — not blockers, but should be addressed):
- M1: Untyped API responses in all 7 relay hooks — `res.json()` returns `any`
- M2: No HTTP status check before `res.json()` in hooks — HTML error pages cause `SyntaxError`
- M4: Error responses return 200 for business logic failures — React Query `onError` never fires

**Notable MINORs**:
- m3: Stale diff state after push (diff shows old files after push completes)
- m5: Promote silently overwrites existing files in final/
- m6: `parseRsyncDiff` handles `*deleting` lines but rsync never generates them (no `--delete` flag)

## Test Quality Audit Findings

| Severity | Count | Fixed |
|----------|-------|-------|
| BLOCKER | 0 | — |
| MAJOR | 3 | 2 fixed |
| MINOR | 6 | 0 (deferred) |
| INFO | 5 | — |

**Test coverage: ~85-90% of branches in relay.ts**. `parseRsyncDiff` is the most thoroughly tested (20 tests).

---

## What Worked Well

1. **3-wave design matched dependencies perfectly** — foundation → features → UI polish. No merge conflicts between parallel agents in any wave.
2. **AGENTS.md "DO NOT MODIFY" section** worked — zero scope creep incidents across 6 agents (vs wave 1 which had poem-wui rewrite).
3. **`getRelayPaths()` extraction paid off immediately** — wave 2 agents used it for all new routes without duplicating guard logic.
4. **Existing `useEnvironment()` discovery** — role-based-visibility agent found `useConfigApi.ts` already had the hook, avoided creating a duplicate.
5. **840 → 842 tests** — audit caught 2 security-adjacent test gaps (invalid subfolder on push/collect) and a weak assertion (promote paths).

## What Didn't Work

1. **Browse route duplicated `RELAY_SUBFOLDERS`** — the browser agent created its own `subfolderNames` array instead of using the exported constant. Caught by audit, one-line fix.
2. **Relay drawer still feels narrow** — 600px→700px was done post-campaign but David flagged this before we caught it. Should have been in the plan.
3. **"Manage & Export" page heading is noise** — David flagged that the page concept doesn't serve the tools well. Relay should feel like a relay page, not a drawer on a generic shell. This is a design problem, not a feature gap.

## Key Learnings — Application

1. **Subfolder-aware routes with direction awareness** — push goes project→relay, collect goes relay→project. Direction + subfolder together determine the rsync source/dest. This pattern is clean.
2. **`fs.copy` for promote (not rsync)** — promote is a local file copy, not a sync. `fs.copy` is simpler and correct here.
3. **Existing hooks should be discovered before creating new ones** — `useEnvironment()` already existed in `useConfigApi.ts`. Agent found it by reading the codebase rather than assuming the plan was complete.

## Key Learnings — Ralph Loop

1. **"DO NOT MODIFY" sections in AGENTS.md are essential** — wave 1 had scope creep, wave 2 had none. The explicit boundary list works.
2. **Audit-driven test additions are high value** — the 2 invalid subfolder tests and promote path verification caught real gaps that parallel agents missed.
3. **Post-campaign UI width adjustments should be in the plan** — David noticed the width before we did. Visual impact should be verified during planning, not discovered at review.

## Promote to Main KDD?

- **"DO NOT MODIFY" section is now standard** — confirmed effective across 2 waves. Worth documenting in Ralphy's AGENTS.md template.
- **Subfolder direction pattern** — push=project→relay, collect=relay→project. Worth noting in baseline AGENTS.md.

## Suggestions for Next Campaign

1. **Manage page redesign** — F002/F003 feedback: the "Manage & Export" concept needs rethinking. The page should adapt to the active tool, not be a generic shell with drawers. This is a design problem worth a `/frontend-design` pass.
2. **Remove Regen Chapters** — F001: David confirmed it's a temporary system that's no longer useful.
3. **Fix remaining MAJORs from audit** — typed API responses (M1), HTTP status checking (M2), proper HTTP error codes (M4). These are cross-cutting concerns affecting all relay hooks.
4. **Clear stale diff after push** — m3: push completes but old diff remains visible.
5. **Promote overwrite warning** — m5: add existence check before `fs.copy` to prevent silent overwrites.
