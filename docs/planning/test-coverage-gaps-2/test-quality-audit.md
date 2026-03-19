# Test Quality Audit — test-coverage-gaps-2

## Files Audited

| Test File | Source File |
|-----------|-------------|
| `server/src/test/renameRecording.test.ts` | `server/src/utils/renameRecording.ts` |
| `server/src/test/chapterExtraction.test.ts` | `server/src/utils/chapterExtraction.ts` |
| `server/src/test/editManifest.test.ts` | `server/src/utils/editManifest.ts` |
| `client/src/test/srt.test.ts` | `client/src/utils/srt.ts` |

New work only (pre-existing blocks noted but not graded):
- `renameRecording.test.ts`: The `describe('renameRecording')` pipeline block (lines 302–498) is new. The three blocks above it are pre-existing.
- `chapterExtraction.test.ts`: The `normalizeText`, `calculateSimilarity`, `findMatchInSrt`, and `extractChapters` blocks are new. The three blocks above them (`parseSrtTimestamp`, `formatYouTubeTimestamp`, `calculateConfidence`) are pre-existing.
- `editManifest.test.ts`: Entirely new.
- `client/src/test/srt.test.ts`: Entirely new.

---

## Grades

| File | Grade | Reason |
|------|-------|--------|
| `renameRecording.test.ts` (pipeline block) | B+ | Phase-ordering test is clever but has a structural gap: only the first `fs.unlink` call is tracked via `mockImplementationOnce`, so if `deleteDerivableFiles` produces zero unlink calls (e.g., when `pathExists` returns false), the `delete` sentinel is never pushed and the assertion `['delete','rename','regenerate']` passes vacuously. The transcription-abort, rename-failure, happy-path, and `queueTranscription` tests are solid. |
| `chapterExtraction.test.ts` (new blocks) | B | `normalizeText` and `calculateSimilarity` tests are clean and thorough. `findMatchInSrt` has two conditional-assertion tests (`if (result !== null)`) that can never fail if the function returns null unexpectedly. The `extractChapters` out-of-order penalty test is wrapped in three layers of `if` guards — it is effectively untestable if any guard condition is not met, making it a no-op in a regression. The empty-transcript-skip test asserts only `chapters.length === 0` without verifying the chapter was fully skipped (not a degraded entry). |
| `editManifest.test.ts` | A- | `cleanEditFolder` safety-critical test correctly asserts that `fsMock.remove` was called exactly once AND that non-manifested files appear in `result.preserved` AND that `result.deleted` contains only the manifested file — this is a genuine three-way assertion covering the key danger scenario. Minor deduction: `getManifestStatus` 'present' vs 'cleaned' distinction relies on a specific `pathExists` mock call sequence that is fragile if the source implementation reorders its calls. The `calculateFileHash` helper tests are well-structured. |
| `client/src/test/srt.test.ts` | A- | The single-word divide-by-zero edge case is tested correctly and in a way that would catch the `duration / (wordCount - 1)` regression (explained below). The `findCurrentEntry` boundary tests (inclusive start, exclusive end, gap between entries) are production-quality. Minor gap: no test for entries with whitespace-only text (the `filter(Boolean)` path in `srtToTimedWords`). |

---

## Key Question Answers

### renameRecording — does the phase-ordering test catch a swap of delete and rename?

**Partially, but with a structural gap.**

The test pushes `'delete'` inside `mockImplementationOnce` on `fsMock.unlink`, but the default mock for `fsMock.pathExists` returns `false`. In `deleteDerivableFiles`, all shadow and transcript unlinkings are attempted unconditionally (not gated on `pathExists`), so `unlink` is called regardless. However the chapter-video branch is gated on `fs.pathExists(chapterVideosDir)` which defaults to `false`, so no extra unlink calls are made there.

With the current mocks, `fs.unlink` is called for the 6 derivable files (1 shadow + 5 transcript extensions) and `fs.rename` is called once. If delete and rename phases were swapped in `renameRecording`, `fs.rename` would fire before `fs.unlink`, and the `callOrder` array would be `['rename', 'delete', 'regenerate']`, which would fail the assertion `['delete', 'rename', 'regenerate']`.

**Conclusion: Yes, the test would catch a delete/rename phase swap — because `deleteDerivableFiles` always calls `fs.unlink` at least once regardless of `pathExists`.** The gap is theoretical: if a future implementation added a `pathExists` guard before each unlink in the happy path, the sentinel might be silently skipped.

### editManifest — does the cleanEditFolder test verify non-manifested files are NOT deleted?

**Yes, comprehensively.** The safety-critical test (lines 242–268) sets up three files in the edit folder (one manifested, two not), then asserts all three of:
1. `fsMock.remove` was called exactly once (not three times)
2. `fsMock.remove` was called with the manifested file path
3. `result.preserved` contains both non-manifested filenames (`gling-output.mov`, `project.glingproj`)
4. `result.deleted` equals `['01-1-intro.mov']` only

This is a genuine whitelist assertion — it would catch any regression where non-manifested files were deleted.

### client srt — does the single-word test catch `duration / (wordCount - 1)`?

**Yes.** The test checks:
```
words[0].startTime === 0
words[0].endTime === 5
```
The source implementation uses `duration / entryWords.length` (= 5/1 = 5). A buggy implementation using `duration / (wordCount - 1)` would produce `5/0 = Infinity`, making `endTime = entry.startTime + 1 * Infinity = Infinity`. The assertion `expect(words[0].endTime).toBe(5)` would fail with `Infinity !== 5`. **The edge case is caught.**

---

## Top 5 Missing Behaviour Tests

Ranked by regression risk (highest first):

1. **`renameRecording` — delete phase has no `pathExists=true` variant for the chapter-video branch.**
   The phase-ordering test never exercises the `readdir` / chapter-video deletion path inside `deleteDerivableFiles` because `fsMock.pathExists` defaults to `false`. If a developer introduced a bug in the chapter-video deletion loop, no test would catch it. Risk: Medium-High (chapter video deletion is real production behaviour).

2. **`findMatchInSrt` — conditional assertions allow silent false negatives.**
   Two tests (`'returns null when the matching segment is excluded'` and `'respects skipFirstWords'`) use `if (result !== null) { expect(...) }` guards. If the implementation returned `null` when it should have matched, the test passes silently. A `expect(result).not.toBeNull()` before the conditional check is absent. Risk: Medium-High (these are the two tests meant to verify non-trivial matching behaviour).

3. **`extractChapters` — out-of-order penalty test is effectively untestable.**
   The test body has three nested `if` guards before making any assertion. If `ch10`, `ch5`, or their `timestampSeconds` fields are undefined, the assertion block is skipped entirely. The test can pass even if the out-of-order penalty logic is completely deleted. Risk: Medium (penalty logic exists in the source; no test would catch its removal).

4. **`getManifestStatus` — mixed 'present'/'cleaned' states not tested.**
   No test covers the case where some (but not all) files are present in the edit folder. The source code uses `allInEditFolder.every(exists => !exists)` for 'cleaned', so a partial state (some in edit folder, some not) would return 'present'. This boundary is untested. Risk: Medium.

5. **`srtToTimedWords` — whitespace-only text entries not tested.**
   `srtToTimedWords` filters words with `filter(Boolean)` and skips entries with zero words via `if (entryWords.length === 0) continue`. An SRT entry containing only spaces or tabs would hit this path. No test exercises it. Risk: Low-Medium (edge case, but SRT files in the wild can have blank captions).

---

## Zero Tolerance Check

- `.skip`: none found
- `.only`: none found
- Flaky timers: none found (no `setTimeout`, `setInterval`, or real `Date.now()` comparisons in test assertions — the `createManifest` timestamp test uses `before/after = Date.now()` bracketing which is deterministic)

---

## Verdict

**The suite would catch real regressions in all three areas, but with meaningful gaps:**

- **`renameRecording` pipeline**: Yes for the most common regressions (transcription abort, phase swap, rename failure blocking regeneration, queueTranscription callback). Misses the chapter-video deletion path entirely.

- **`editManifest`**: Yes for all primary operations. The safety-critical non-manifested-file preservation test is well-constructed and would catch the most dangerous regression. Minor fragility in `getManifestStatus` mock call ordering.

- **`srt`**: Yes for the divide-by-zero edge case (the primary concern). Comprehensive boundary testing on `findCurrentEntry`. Solid overall.

**Overall confidence: 75%.** The suite provides real regression protection for the happy path and the critical safety constraint in `cleanEditFolder`. The main weaknesses are the conditional-assertion pattern in `findMatchInSrt` tests (which can silently pass on false negatives) and the effectively untestable out-of-order penalty test in `extractChapters`.
