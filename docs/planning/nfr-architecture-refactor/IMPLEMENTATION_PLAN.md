# IMPLEMENTATION_PLAN.md — NFR: Architecture Refactor

**Goal**: Fix the structural issues identified in the NFR-146 post-campaign architectural review. Consolidates B013 (NFR-65 extract server utilities) and the review's top 5 concerns. After this campaign, route files are thin coordinators, I/O has a single mock target, and `useApi.ts` is partitioned for hook testing.
**Started**: TBD
**Target**: Builds clean, all 298+ tests still pass, route files contain no domain logic, `fs-extra` is the single server I/O library, `useApi.ts` is split into domain files

## Summary
- Total: 6 | Complete: 6 | In Progress: 0 | Pending: 0 | Failed: 0

---

## Pending

### Wave 1 — Low-risk extractions (run in parallel, well-backed by existing tests)

- [x] extract-s3Utils — Moved `extractBrand`, `categorizeMigrationFiles`, `isPathWithinProject` + `MigrationActions` interface to `server/src/utils/s3Utils.ts`. Updated imports in `s3-staging.ts` and test file. Build clean, 368 tests passing.

- [x] partition-useApi — 795→28 line barrel. 6 domain files: useRecordingsApi (11 hooks), useProjectsApi (14), useTranscriptionsApi (11), useConfigApi (5), useDeveloperApi (3), useSystemApi (1). Dead duplicate `useOpenFolder` dropped. Build clean, 97 tests passing.

### Wave 2 — Domain logic extraction from routes (sequence matters: do after Wave 1)

- [x] extract-poemWuiUtils — Moved `mapBrandConfig`, `loadBrandConfig`, `firstWords`, `readChapterTranscript`, `findAllSrts`, `buildFliHubChapters` to `poemWuiUtils.ts` (127 lines). `poem-wui.ts` 330→208 lines. No test changes needed. Build clean, 368 tests passing.

- [x] standardize-fs-extra — Swapped `fs/promises` → `fs-extra` in s3-staging.ts, poem-wui.ts, edit.ts. `poemWuiSend.test.ts` simplified from 2 mocks to 1 `vi.mock('fs-extra')`. Build clean, 368 tests passing.

### Wave 3 — High-risk extraction (do last, own wave, careful sequencing)

- [x] extract-configManager — Extracted `loadConfig(path)`, `saveConfig(path, config)`, `getDefaultConfig()` to `server/src/config/configManager.ts`. Migration logic (NFR-6 targetDirectory→projectDirectory, FR-89 split into root+active) moved with it. `index.ts` uses thin wrappers passing `CONFIG_FILE`. 22 new tests (6 describe blocks). Build clean, 390 server tests passing, dev server unaffected.

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
- Wave 1 items are independent of each other and of Wave 2
- Wave 2 items (`extract-poemWuiUtils`, `standardize-fs-extra`) should run after Wave 1 is complete — Wave 1 may move files that Wave 2 imports
- Wave 3 (`extract-configManager`) must run alone — it touches `index.ts` which is the entry point for the entire server
- Do NOT run `extract-configManager` concurrently with any other server-touching work unit

**Relationship to nfr-code-quality-1:**
- `dedup-strip-srt` (code quality) creates `srtUtils.ts` — if it has run before this campaign starts, `extract-poemWuiUtils` imports from `srtUtils.ts` and does not need to create it
- If code quality campaign has NOT run, `extract-poemWuiUtils` should create `srtUtils.ts` itself
- Check for the file before starting the work unit: `ls server/src/utils/srtUtils.ts`

**Risk profile:**
- Wave 1: Low. Functions already have tests. Moving home, not logic.
- Wave 2: Medium. Route files become thin — any missed import breaks the build (caught immediately by TypeScript).
- Wave 3: High. `index.ts` is the server entry point. A mistake here prevents the server from starting. Mitigation: write `configManager.ts` tests before touching `index.ts`.

**Absorbs backlog item B013 (NFR-65):** "Extract Shared Server Utilities" — the extract-s3Utils and extract-poemWuiUtils work units deliver this. Mark B013 done when this campaign completes.

**Enables next campaign:** After this campaign, `useApi.ts` is partitioned and the server has a clean `fs-extra`-only I/O surface. React hook tests (the next test wave) can then use a single mock target per file.
