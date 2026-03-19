# Assessment: test-coverage-gaps-2

**Campaign**: test-coverage-gaps-2
**Date**: 2026-03-19 → 2026-03-19
**Results**: 4/4 complete, 0 failed
**Quality audits**: code-quality A, test-quality B+ average
**Final test count**: 390 → 447 (+57 tests across server + client)

---

## Results Summary

| Unit | File | Tests Added | Result |
|------|------|-------------|--------|
| B028 — renameRecording pipeline | `renameRecording.test.ts` | +8 | ✅ Complete |
| B029 — extractChapters matching | `chapterExtraction.test.ts` | +25 | ✅ Complete (3 exports added) |
| B030 — client SRT utilities | `client/src/test/srt.test.ts` (new) | +29 | ✅ Complete |
| B031 — editManifest | `server/src/test/editManifest.test.ts` (new) | +24 | ✅ Complete |

**Post-campaign fix**: 2 conditional-assertion bugs in `findMatchInSrt` tests corrected by coordinator after test-quality-audit.

---

## What Worked Well

1. **All 4 agents ran in parallel without conflict** — disjoint file ownership meant zero merge collisions
2. **Agents read actual source before writing** — `TimedWord.startTime/endTime` correction (vs AGENTS.md's `start/end` example) caught before submission
3. **Critical safety test landed correctly** — `cleanEditFolder` non-manifested file assertion is a genuine whitelist check, not a line-coverage placeholder
4. **Phase-ordering verification is real** — B028's mock-dependency approach (track `fs.unlink` before `fs.rename`) actually catches a delete/rename swap
5. **Test-quality-audit caught a real defect** — 2 conditional assertions without prior `not.toBeNull()` would have silently passed on false-negative returns; fixed before commit

---

## What Didn't Work

1. **AGENTS.md had wrong field names** — `start`/`end` in `TimedWord` example should be `startTime`/`endTime`. Agent corrected from source — but it was a near-miss. AGENTS.md examples must be verified against actual source.
2. **ESM `vi.spyOn` can't intercept internal function calls** — B028 agent had to use mocked dependency calls (fs.unlink, fs.rename) to track phase ordering rather than spying on the phase functions directly. This is a TypeScript ESM limitation, not a test design flaw, but future agents should know this upfront.
3. **`fs.promises.open` not in standard fs-extra mock** — B031 agent needed to stub `promises.open` with a FileHandle-shaped object for `calculateFileHash`. This is subtle and not documented in the project AGENTS.md mock patterns.
4. **`dist/` test duplication** — server vitest runs both `src/test/*.ts` and `dist/server/src/test/*.js`. The dist files are stale (pre-campaign compiled JS) so they show lower test counts. This is cosmetic but confusing. Rebuild with `npm run build -w server` to sync.

---

## Key Learnings — Application

- **ESM `vi.spyOn` limitation**: Cannot intercept calls to functions within the same ESM module. Verify phase ordering through mocked external dependencies (fs, shell commands), not through spying on sibling functions.
- **`calculateFileHash` uses `fs.promises.open`**: Mock must include `promises: { open: vi.fn() }` returning a fake FileHandle with `read()` and `close()` methods.
- **`SrtSegment` interface is not exported**: Tests must use structural object literals or `Parameters<typeof findMatchInSrt>[1]` typing. Alternatively, export the interface (one-line fix).
- **Conditional assertions silently pass on false negatives**: `if (result !== null) { expect(...) }` without a prior `expect(result).not.toBeNull()` is a latent test quality bug. Always assert the expected null/non-null state before branching.

## Key Learnings — Ralph Loop

- **4 parallel agents, 0 conflicts** — disjoint file ownership is the key constraint; plan work units around it
- **AGENTS.md examples must match source** — wrong field names nearly caused a bad test; examples should be derived from reading the actual files, not from memory
- **Test-quality-audit is worth the time** — caught 2 real defects in the test files themselves. The investment paid off.

---

## Promote to Main KDD?

- ESM `vi.spyOn` limitation and the `fs.promises.open` mock pattern are worth promoting
- Conditional assertion anti-pattern is worth noting as a code review checklist item

---

## Suggestions for Next Campaign

- **AGENTS.md**: Add ESM spyOn limitation to Anti-Patterns. Add `fs.promises.open` mock shape to Mock Patterns. Export `SrtSegment` interface (one-line fix in production).
- **Add annotation comments**: The 3 newly exported functions in `chapterExtraction.ts` need `// NFR-146: exported for unit testing` comments per convention.
- **B032** (shared/naming.ts missing functions) is the natural next test-coverage item — medium priority, same patterns apply.
- **Next feature** (B038 — relay collaboration) is clear: rsync + relay folder push/collect. Architecture review is complete (`docs/planning/architectural-review-relay-2026-03-19.md`). Requirements captured (`docs/planning/requirements-workflow-braindump-2026-03-19.md`).
