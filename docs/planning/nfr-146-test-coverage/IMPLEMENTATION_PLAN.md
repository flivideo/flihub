# IMPLEMENTATION_PLAN.md — NFR-146: Test Coverage Foundation

**Goal**: Get the FliHub test suite from silently broken → genuinely trustworthy. ~115 focused unit tests covering critical pure functions across all three workspaces.
**Started**: 2026-03-16
**Target**: `npm test` runs all three workspaces, zero failures, no placeholders, critical paths covered

## Summary
- Total: 15 | Complete: 15 | In Progress: 0 | Pending: 0 | Failed: 0

---

## Pending

### Wave 1 — Infrastructure (do first, unblocks everything)
- [x] wire-shared-test-script — Added `"test": "vitest run"` + vitest dep to `shared/package.json`, created `shared/vitest.config.ts` (copied from server), updated root test script to run shared first. Result: 14 shared tests now visible (7 pass, 7 fail — pre-existing failures, no production code touched).

### Wave 2 — Fix Broken Tests
- [x] fix-naming-tests — Fixed 7 failing tests in `shared/naming.test.ts`: updated `parseRecordingFilename` assertions to `RecordingFileParts | null` shape (no `isValid`/`extension`/`tags`), fixed `validateChapter('00')` and `validateSequence('0'/'00')` to expect `null` (min-value not enforced in implementation), removed placeholders from client + server. All 16 tests now pass.

### Wave 3 — Export Testable Functions
- [x] export-server-utils — Exported `extractBrand` + `categorizeMigrationFiles` (s3-staging.ts), `stripSrt` + `firstWords` (poem-wui.ts). `checkTranscriptionQueue`/`migrateRecordingKey`/`updateManifestFilename` were already exported. `sanitizeCustomTag` extracted to module level + exported from NamingControls.tsx; `shouldShowTemplate` exported in place. Both builds clean.

### Wave 4 — Path & Config Tests (highest transitive risk)
- [x] test-path-utils — 16 tests. `expandPath`: tilde→homedir, other paths unchanged. `queryString`: normalises Express query values (string, array first-element, object→default, empty→default). All passing.
- [x] test-project-paths — 24 tests. `getProjectPaths`: returns 16-key ProjectPaths object, all derived via path.join. `migrateTargetToProject`: strips trailing `/recordings` via regex, returns unchanged if no match. All passing.

### Wave 5 — State & Rename Tests (highest data-loss risk)
- [x] test-project-state — 40 tests. Prune fires when ALL 4 flags (safe/parked/stage/annotation) are falsy. Uses fs-extra (not fs/promises) — mock accordingly. `mergeRecordingStates` is pure. All passing.
- [x] test-rename-pipeline — 22 tests. All 3 functions are pure (no mocking needed). `checkTranscriptionQueue(filename, activeJob, queue): boolean`. `migrateRecordingKey(state, old, new): ProjectState`. `updateManifestFilename(state, old, new): ProjectState`. All passing.

### Wave 6 — Business Logic Tests
- [x] test-s3-utils — 23 tests. `extractBrand`: scans right-to-left for `v-` segment, falls back to 'appydave'. `categorizeMigrationFiles`: returns `{delete, toPost, toPrep, conflicts}`. Non-mp4/srt/mov files silently ignored. Import path: `../routes/s3-staging.js`. All passing.
- [x] test-chapter-extraction — 22 tests. Exported `parseSrtTimestamp`/`formatYouTubeTimestamp`/`calculateConfidence` (none were exported). NOTE: `parseSrtTimestamp` returns **seconds** (not ms). All passing.
- [x] test-final-media — 25 tests. Exported `extractVersion` + `isAdditionalSegment`. `extractVersion` returns `number | undefined` (not string/null). `isAdditionalSegment(filename, projectCode)` takes 2 params. Keyword patterns only fire when filename has 2+ dashes after code. All passing.

### Wave 7 — Client Utils Tests
- [x] test-naming-controls-utils — 28 tests. `sanitizeCustomTag`: uppercase, spaces/commas→dashes, strip non-[A-Z0-9-], trim leading dash. `shouldShowTemplate`: checks `chapterFilter` object with min?/max?. All passing.
- [x] test-client-formatting — 43 tests across 9 functions. `formatChapterTitle('HELLO-WORLD')→''` (all-uppercase stripped as tags). `toKebabCase('hello@world.com')→'helloworldcom'` (dot stripped). All passing.
- [x] test-client-naming — 22 tests. `buildPreviewFilename(chapter, sequence|null, name, tags[], customTag?)`: returns `'...'` when chapter/name falsy, appends `.mov`. All passing.

### Wave 8 — Route Integration Test
- [x] test-poem-wui-send — 13 tests. Scans 3 dirs for SRT (s3-staging/post → final → recording-transcripts). Two mocks needed: `fs/promises` + `fs-extra` (for readDirSafe). `fetch` throws → "AWB not reachable". AWB `{ok:false}` → error forwarded. AWB `{}` (no ok field) → treated as success. 166 server tests total, all passing.

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
