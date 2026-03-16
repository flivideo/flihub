# IMPLEMENTATION_PLAN.md — NFR-146: Test Coverage Foundation

**Goal**: Get the FliHub test suite from silently broken → genuinely trustworthy. ~115 focused unit tests covering critical pure functions across all three workspaces.
**Started**: 2026-03-16
**Target**: `npm test` runs all three workspaces, zero failures, no placeholders, critical paths covered

## Summary
- Total: 15 | Complete: 0 | In Progress: 0 | Pending: 15 | Failed: 0

---

## Pending

### Wave 1 — Infrastructure (do first, unblocks everything)
- [ ] wire-shared-test-script — Add `"test": "vitest run"` to `shared/package.json`; update root `npm test` to include `-w shared`; verify `naming.test.ts` now appears in test run output (even failing is fine — visible is the goal)

### Wave 2 — Fix Broken Tests
- [ ] fix-naming-tests — Fix all 7 failing tests in `shared/naming.test.ts`: update `parseRecordingFilename` assertions to match current return shape (`RecordingFileParts | null`, no `isValid`/`extension`/`tags` fields), fix `validateChapter('00')` and `validateSequence('0')` to match actual implementation semantics, remove placeholder `expect(true).toBe(true)` from client and server

### Wave 3 — Export Testable Functions
- [ ] export-server-utils — Export `extractBrand` and `categorizeMigrationFiles` from `server/src/routes/s3-staging.ts` (or extract to `server/src/utils/s3Utils.ts`); export `stripSrt` and `firstWords` from `server/src/routes/poem-wui.ts` (or extract to utility); export `checkTranscriptionQueue`, `migrateRecordingKey`, `updateManifestFilename` from `server/src/utils/renameRecording.ts`

### Wave 4 — Path & Config Tests (highest transitive risk)
- [ ] test-path-utils — Unit tests for `server/src/utils/pathUtils.ts`: `expandPath` (tilde expansion, already-expanded path, empty string) and `queryString` (string, array, object, undefined branches)
- [ ] test-project-paths — Unit tests for `shared/paths.ts`: `getProjectPaths` (verify every key resolves correctly relative to projectDirectory) and `migrateTargetToProject` (strips trailing `/recordings`, handles trailing slash, non-matching path)

### Wave 5 — State & Rename Tests (highest data-loss risk)
- [ ] test-project-state — Unit tests for `server/src/utils/projectState.ts`: `setRecordingSafe` (set true, set false, prune-when-all-default logic), `setRecordingParked` (same pattern), `mergeRecordingStates` (deep merge preserves untouched fields, shallow-merge regression detection)
- [ ] test-rename-pipeline — Unit tests for the three exported `renameRecording.ts` functions: `checkTranscriptionQueue` (active job found, no active jobs), `migrateRecordingKey` (key copied, old key deleted, missing key handled), `updateManifestFilename` (manifest updated, manifest missing handled gracefully)

### Wave 6 — Business Logic Tests
- [ ] test-s3-utils — Unit tests for the exported s3-staging utilities: `extractBrand` (v-appydave path, v-joy path, no v- segment fallback), `categorizeMigrationFiles` (final files → post/, regular files → prep/, junk → delete, conflict detection)
- [ ] test-chapter-extraction — Unit tests for `server/src/utils/chapterExtraction.ts` inner functions: `parseSrtTimestamp` (standard format, millis precision, zero values), `formatYouTubeTimestamp` (sub-hour, hours branch, zero), `calculateConfidence` (high-match, low-match, short-phrase penalty)
- [ ] test-final-media — Unit tests for `server/src/utils/finalMedia.ts`: `extractVersion` (v1, v3, no version → null), `isAdditionalSegment` (main video patterns, segment patterns, edge cases)

### Wave 7 — Client Utils Tests
- [ ] test-naming-controls-utils — Unit tests for functions extracted/exported from `client/src/components/NamingControls.tsx`: `sanitizeCustomTag` (spaces→dashes, commas→dashes, strips invalid chars, leading dash trim, uppercase), `shouldShowTemplate` (min only, max only, both bounds, no filter)
- [ ] test-client-formatting — Unit tests for `client/src/utils/formatting.ts`: `formatDuration` (all 3 styles — smart/youtube/seconds, hours branch, zero), `toKebabCase` (spaces, unicode, leading/trailing dashes), `formatChapterTitle`
- [ ] test-client-naming — Unit tests for `client/src/utils/naming.ts`: `buildPreviewFilename` (standard, empty tags, empty name, custom tag combinations)

### Wave 8 — Route Integration Test
- [ ] test-poem-wui-send — Integration test for `POST /api/poem-wui/send`: mock `fetch` and filesystem reads, cover happy path (SRT found, 200 response), no SRT found, AWB unreachable (ECONNREFUSED), AWB returns `{ok: false}`, no project selected

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

**2026-03-16 — Campaign start**

Key decisions going into this:
- Wave 1 (wire-shared-test-script) must complete before any other wave — it makes failures visible
- Wave 3 (export-server-utils) must complete before Waves 5 and 6 — functions need to be importable from test files
- Waves 4-8 can largely run in parallel once Wave 3 is done
- Wave 2 (fix-naming-tests) can run in parallel with Wave 3

**Scope boundary**: This campaign covers unit and integration tests for pure/near-pure functions only. No React component render tests, no Playwright E2E, no hook tests (React Query mocking complexity). Those are future NFRs.

**Do not aim for 100% coverage** — aim for coverage of critical business logic paths identified in the audit. The goal is a trustworthy baseline, not a coverage metric.

**If a function can't be tested without major refactor** — note it in learnings and move on. Don't let perfect be the enemy of done.
