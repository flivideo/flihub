# IMPLEMENTATION_PLAN.md — NFR: Code Quality Round 1

**Goal**: Close the concrete code quality issues surfaced by the NFR-146 post-campaign audits. Targeted, safe fixes — no structural refactoring (that's nfr-architecture-refactor).
**Started**: TBD
**Target**: All 9 issues resolved, builds clean, tests green, no new regressions

## Summary
- Total: 9 | Complete: 9 | In Progress: 0 | Pending: 0 | Failed: 0

---

## Pending

### Wave 1 — Independent safe fixes (run all in parallel)

- [x] fix-path-traversal — Extracted `isPathWithinProject(filePath, projectRoot): boolean` helper (exported, tested). Added guard to `srt-text` route handler. 7 unit tests (including sibling-directory prefix bypass). Also fixed pre-existing TS error in `projectState.test.ts`. Build now clean. 358 tests passing.

- [x] remove-dead-getFirstWords — Deleted 9 lines (JSDoc + eslint-disable + function body) from `chapterExtraction.ts`. Zero imports found across codebase. All tests passing.

- [x] fix-loadBrandConfig-errors — Split catch: ENOENT→continue, SyntaxError→log+return `{error}`, other→re-throw. Route surfaces `brandConfigError` in response body when config corrupt. 2 new tests (send still proceeds, error field present). 358 tests passing.

- [x] escape-projectCode-regex — Added `escapedCode` const in `isAdditionalSegment`, replaced 3 `new RegExp(projectCode...)` calls. Added 5 tests with `b64.1` project code (literal dot). 30 finalMedia tests passing (up from 25), 356 total.

- [x] add-coverage-thresholds — Measured actual coverage, set thresholds 5pts below floor. shared: lines 27/fn 20/br 18. server: lines 16/fn 20/br 18. client: lines 28/fn 15/br 25. All passing.

### Wave 2 — Targeted fixes (run in parallel, independent)

- [x] dedup-strip-srt — Created `srtUtils.ts` (13 lines, canonical from poem-wui). `poem-wui.ts` now imports instead of defining. `s3-staging.ts` inline block (10 lines) replaced with 2-line import+call. Created `srtUtils.test.ts` with 5 tests. 368 total server tests passing.

- [x] fix-parseSrtTimestamp-null — Return type `number | null`, returns `null` on bad input. `parseSrt` now has null guard (`if (startSeconds === null || endSeconds === null) continue`). 2 test assertions updated. 358 tests passing.

- [x] fix-formatTimestamp-tests — Replaced 7 weak assertions (`typeof`, `match(/\d/)`, `length>0`) with `vi.setSystemTime` deterministic tests. "today" → time pattern + no year. "past" → contains year. `formatTime` → asserts minute digits. 97 client tests passing.

- [x] fix-app-test-placeholder — Replaced `1+1=2` with 3 `ConnectionIndicator` render tests (isConnected/isDisconnected/isReconnecting). Full `App` render skipped — requires socket+QueryClient mocking. `ConnectionIndicator` is a real presentational component from App's footer. 97 client tests passing.

---

## In Progress

(coordinator moves items here with [~])

---

## Complete

(coordinator moves items here with [x], adds outcome notes)

---

## Failed / Needs Retry

(coordinator moves items here with [!], adds failure reason)

---

## Notes & Decisions

**Wave dependencies:**
- Wave 1 and Wave 2 are fully independent of each other — both waves can run in any order, or Wave 2 can start before Wave 1 completes
- `fix-parseSrtTimestamp-null` touches `chapterExtraction.ts` and `chapterExtraction.test.ts` — do NOT run concurrently with `remove-dead-getFirstWords` (both touch the same file). They are in different waves to avoid conflicts.
- `dedup-strip-srt` creates `srtUtils.ts` and modifies both `poem-wui.ts` and `s3-staging.ts` — do not combine with any other agent touching those files

**Scope boundary**: No structural refactoring here. If a fix requires moving a function to a new utils file, do it — but do not re-architect route files, do not extract domain logic layers, do not partition `useApi.ts`. That is nfr-architecture-refactor.

**Test note**: The `fix-parseSrtTimestamp-null` change may require updating `chapterExtraction.ts` callers. Read the downstream usage carefully before changing the return type — there may be a `|| 0` fallback elsewhere that silently absorbs the null.
