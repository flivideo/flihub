# IMPLEMENTATION_PLAN.md — test-coverage-gaps-2

**Goal**: Add integration/unit tests for the 4 highest regression-risk untested areas (B028–B031). No production code changes — tests only.
**Started**: 2026-03-19
**Target**: `npm test` passes with coverage added for `renameRecording()` pipeline, `extractChapters()` matching, `client/src/utils/srt.ts`, and `editManifest.ts` core functions.

## Summary
- Total: 4 | Complete: 4 | In Progress: 0 | Pending: 0 | Failed: 0

---

## Pending

(none)

## In Progress

(none)

## Complete

- [x] test-renameRecording-pipeline — +8 tests. Phase ordering verified via dependency mocks (ESM spyOn limitation). (B028)
- [x] test-extractChapters-matching — +25 tests. 3 exports added to production: normalizeText, calculateSimilarity, findMatchInSrt. (B029)
- [x] test-client-srt — +29 tests. New file. Single-word divide-by-zero locked in. (B030)
- [x] test-editManifest — +24 tests. New file. cleanEditFolder safety test is a genuine whitelist assertion. (B031)

## Failed / Needs Retry

(none)

---

## Notes & Decisions

**2026-03-19 — What existing tests DO cover (do not duplicate)**

`renameRecording.test.ts` already tests: `checkTranscriptionQueue`, `migrateRecordingKey`, `updateManifestFilename`

`chapterExtraction.test.ts` already tests: `parseSrtTimestamp`, `formatYouTubeTimestamp`, `calculateConfidence`

**The gaps**: None of the existing tests import or call `renameRecording()`, `extractChapters()`, `findMatchInSrt()`, `getManifestStatus()`, `cleanEditFolder()`, or `restoreEditFolder()`.

**Wave design**: All 4 work units are independent — different files, different test files. Run all 4 in parallel.

**Test count baseline**: 390 tests passing before this campaign. Target: 390 + meaningful additions (not a specific number — quality over quantity).
