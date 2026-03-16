# NFR-146: Test Coverage Foundation

**Status:** Pending
**Priority:** HIGH — test suite is currently silently broken; regression risk compounds with each feature
**Added:** 2026-03-16
**Type:** Non-Functional — Testing

---

## Problem

The FliHub test infrastructure exists (Vitest configured in all three workspaces, testing-library installed, scripts wired) but the test suite is in a broken state and has no meaningful coverage of critical production paths.

### Current state

| Workspace | Test files | Real tests | Status |
|-----------|-----------|------------|--------|
| `shared/` | `naming.test.ts` | 14 | **7 FAILING — and ORPHANED: never run by `npm test`** |
| `server/` | `sample.test.ts` | 1 | Placeholder only (`expect(true).toBe(true)`) |
| `client/` | `App.test.tsx` | 1 | Placeholder only (`expect(true).toBe(true)`) |

**`npm test` currently reports 3 passing tests — all of which are either placeholders or never executed.**

### Critical discovery: shared tests are orphaned

`shared/naming.test.ts` is **never executed** by the normal test run. The `shared/package.json` has no `test` script, and the root `npm test` only runs `-w client` and `-w server`. The file exists, has 7 failing tests, and is completely invisible to the developer during normal workflow. Fix requires adding `"test": "vitest run"` to `shared/package.json` and updating the root test command.

### Broken tests: exact root causes

The `naming.test.ts` failures are due to two breaking API changes that were never reflected in the tests:

**1. `parseRecordingFilename` return shape changed (5 failures)**
- Old: `{ chapter, sequence, name, tags: string[], extension: string, isValid: boolean }`
- New: `{ chapter, sequence: string | null, name } | null`
- `tags` removed — now accessed via `extractTagsFromName(result.name)` separately
- `extension` removed entirely
- `isValid` removed — function returns `null` for invalid inputs instead

**2. Business rules not enforced (2 failures)**
- `validateChapter('00')` — test expects error; implementation accepts it (min-value check never wired up)
- `validateSequence('0')` — test expects error; pattern `/^\d+$/` accepts any digits including `0`

The `shared/naming.ts` failure is pre-existing: the tests were written against an older API contract that no longer matches the implementation. Because tests are not run in CI or as a dev workflow gate, this has gone unnoticed.

---

## Goals

1. **Fix broken tests** — align `naming.test.ts` with the current implementation
2. **Cover critical pure functions** — all deterministic functions that drive filenames, S3 routing, or file categorisation
3. **Cover the primary external integration** — `POST /api/poem-wui/send` error branches
4. **Establish a minimum viable test run** that passes clean and protects against regressions

---

## Scope

### Phase 1 — Fix Broken Tests (shared/naming.test.ts)

The `parseRecordingFilename` function API has changed. Current tests expect:
```ts
{ chapter, sequence, name, tags, extension, isValid }
```
Actual return is either a parsed object or `null` on failure. Assertions must be updated to match the real contract. All 7 failing tests fall into this category.

**Files:** `shared/naming.test.ts`, `shared/naming.ts`

### Phase 2 — Pure Function Unit Tests (server)

These are deterministic, side-effect-free functions with no mocking required:

| Function | File | Risk | Why it matters |
|----------|------|------|----------------|
| `extractBrand(path)` | `routes/s3-staging.ts` | CRITICAL | Wrong brand → wrong S3 bucket |
| `categorizeMigrationFiles(files, projectName)` | `routes/s3-staging.ts` | CRITICAL | Determines what gets deleted vs moved |
| `stripSrt(content)` | `routes/poem-wui.ts` | HIGH | Drives transcript content sent to AWB |
| `firstWords(content, count)` | `routes/poem-wui.ts` | MEDIUM | Chapter preview text |
| `extractVersion(filename)` | `components/shared/S3StagingTool.tsx` | MEDIUM | Version detection for promote workflow |

### Phase 3 — Pure Function Unit Tests (client)

| Function | File | Risk | Why it matters |
|----------|------|------|----------------|
| `sanitizeCustomTag(value)` | `components/NamingControls.tsx` | HIGH | Silently corrupts filenames on bad input |
| `shouldShowTemplate(template, chapter)` | `components/NamingControls.tsx` | HIGH | Chapter filter logic for naming templates |
| `groupByChapter(recordings)` | `components/RecordingsView.tsx` | MEDIUM | Recording grouping and counts |
| `formatSize(bytes)` | `components/shared/S3StagingTool.tsx` | LOW | Display formatting |

### Phase 4 — Server Route Integration Tests

Cover the key branches of the AWB send route:

| Scenario | Expected |
|----------|----------|
| SRT found, AWB returns 200 `{ ok: true }` | `{ ok: true }` |
| No SRT file found | `{ ok: false, error: 'No SRT file found...' }` |
| AWB unreachable (ECONNREFUSED) | `{ ok: false, error: 'AWB not reachable...' }` |
| AWB returns `{ ok: false, error: "workflowId required" }` | surfaces error message |
| No project selected | `{ ok: false, error: 'No project selected' }` |

Mock `fetch` and the filesystem reads. Do NOT hit the real AWB server.

**File:** `server/src/test/poem-wui.test.ts` (new)

---

## Critical Untested Paths (from full audit)

| File | Function | Risk | Why it matters |
|------|----------|------|----------------|
| `server/src/utils/renameRecording.ts` | `checkTranscriptionQueue`, `migrateRecordingKey`, `updateManifestFilename` | CRITICAL | Rename during transcription corrupts job state; state key migration silently loses safe/parked/annotation data |
| `server/src/utils/projectState.ts` | `setRecordingSafe`, `setRecordingParked`, `mergeRecordingStates` | CRITICAL | "Prune if all flags default" logic can silently wipe annotations on any refactor |
| `server/src/utils/safeMigration.ts` | `migrateSafeFolder` | CRITICAL | Physically moves files + rewrites state; rollback logic itself is untested |
| `server/src/utils/pathUtils.ts` | `expandPath`, `queryString` | HIGH | Transitive dependency of every server file op; wrong branch = reads/writes wrong paths |
| `shared/paths.ts` | `getProjectPaths`, `migrateTargetToProject` | HIGH | Every server path derivation flows through here; typo silently routes files to wrong directories |
| `shared/naming.ts` | `extractTagsFromName`, `calculateSuggestedNaming` | HIGH | Drives default naming suggestion on watch page; wrong result silently mis-guides users |
| `server/src/utils/chapterExtraction.ts` | `parseSrtTimestamp`, `formatYouTubeTimestamp`, `calculateConfidence` | HIGH | Off-by-one in millis propagates to every chapter timestamp; scoring branches all dark |
| `server/src/utils/finalMedia.ts` | `extractVersion`, `isAdditionalSegment` | HIGH | Wrong version detection = old video served; wrong segment detection = main video buried |
| `server/src/utils/scanning.ts` | `getTranscriptSyncStatus`, `countUniqueChapters` | HIGH | Transcript % and chapter counts displayed per-project; miscounting shows wrong stats |
| `client/src/utils/formatting.ts` | `formatDuration`, `toKebabCase`, `formatChapterTitle` | MEDIUM | YouTube style zero-padding, hours branch, unicode edge cases all untested |

## Minimum Viable Test Suite

Target ~115 focused tests across 4 tiers:

| Tier | Scope | Target |
|------|-------|--------|
| Fix now | `naming.test.ts` aligned to current API + `extractTagsFromName` + `calculateSuggestedNaming` | ~20 |
| Fix now | `pathUtils`, `getProjectPaths`, `migrateTargetToProject` | ~15 |
| Fix now | `projectState.ts` — all pure state functions including prune logic | ~20 |
| Fix now | `renameRecording.ts` — queue guard + key migration + manifest update | ~15 |
| High | `chapterExtraction.ts` inner functions | ~15 |
| High | `finalMedia.ts` inner functions | ~10 |
| High | `client/utils/formatting.ts` + `client/utils/naming.ts` | ~20 |

## Acceptance Criteria

1. `npm test` passes with zero failures across all three workspaces
2. `shared/naming.test.ts` — all 14 tests passing, aligned with current implementation
3. `server/src/test/` — at minimum `extractBrand` and `categorizeMigrationFiles` fully covered with edge cases
4. `server/src/test/poem-wui.test.ts` — 5 route scenarios covered (see Phase 4)
5. `client/src/test/` — at minimum `sanitizeCustomTag` and `shouldShowTemplate` covered
6. No placeholder tests remain (`expect(true).toBe(true)` removed or replaced)

---

## Out of Scope

- 100% line coverage (not the goal)
- Component render tests (React Testing Library for complex UI — future NFR)
- E2E tests (Playwright — future NFR)
- Hook tests (require more complex React Query mocking — future NFR)

---

## Technical Notes

### Why naming.test.ts is broken

`parseRecordingFilename` in `shared/naming.ts` returns `RecordingFileParts | null`. The test file expects an object with `isValid: boolean` and always-present `tags` and `extension`. The implementation evolved but the tests were not updated. To fix: read the current function signature and rewrite assertions to match.

### Wire shared workspace into test run

Add to `shared/package.json`:
```json
"scripts": { "test": "vitest run" }
```
Update root `npm test` to include `-w shared`. Until this is done, `naming.test.ts` silently never runs despite reporting 7 failures when executed manually.

### Extracting testable functions

`extractBrand` and `categorizeMigrationFiles` are module-level functions in `s3-staging.ts` but not currently exported. They need to be exported (or extracted to a utils file) before they can be unit tested. See also NFR-65 (Extract Shared Server Utilities) — this work may overlap.

`stripSrt` in `poem-wui.ts` is also not exported. Same pattern.

`checkTranscriptionQueue`, `migrateRecordingKey`, `updateManifestFilename` in `renameRecording.ts` — same, currently unexported.

### Running tests

```bash
npm test -w shared     # run shared tests only
npm test -w server     # run server tests only
npm test -w client     # run client tests only
npm test               # run all workspaces
```

---

## Completion Notes

*(To be filled by developer)*

**What was done:**
-

**Files changed:**
-

**Test results before/after:**
- Before: X passing, 7 failing
- After: X passing, 0 failing

**Status:** Pending
