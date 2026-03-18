# Assessment: NFR Architecture Refactor

**Campaign**: nfr-architecture-refactor
**Date**: 2026-03-16 → 2026-03-16
**Results**: 6/6 complete, 0 failed

---

## Results Summary

| Workspace | Tests Before | Tests After |
|-----------|-------------|-------------|
| shared    | 38          | 38          |
| server    | 368         | 390 (+22)   |
| client    | 97          | 97          |
| **Total** | **503**     | **525**     |

Net new tests: 22 (configManager). Structural changes across 8 files.

---

## Structural Changes Made

| Item | Before | After |
|------|--------|-------|
| `useApi.ts` | 795 lines, 40+ hooks | 28-line barrel re-export |
| `poem-wui.ts` | 330 lines | 208 lines (−37%) |
| `index.ts` | loadConfig/saveConfig/migration inline | imports from configManager |
| Server I/O | fs/promises in 3 route files | fs-extra everywhere |
| `s3Utils.ts` | functions in s3-staging.ts | own utils file |
| `poemWuiUtils.ts` | functions in poem-wui.ts | own utils file |
| `configManager.ts` | logic in index.ts | own tested module |
| `poemWuiSend.test.ts` | 2 separate mocks | 1 mock (fs-extra only) |

---

## What Worked Well

1. **Wave dependency order held** — Wave 1 (safe moves) → Wave 2 (with fs-extra unified) → Wave 3 (alone) was exactly right
2. **extract-s3Utils was trivially safe** — tests already existed, just updating import paths
3. **standardize-fs-extra delivered the dual-mock fix** — `poemWuiSend.test.ts` went from two mock targets to one
4. **extract-configManager discovered hidden migration logic** — two migration steps (NFR-6 and FR-89) that were untested and buried in index.ts are now covered by 22 tests
5. **Wave 3 ran alone with no incident** — dev server stayed alive on 5101 throughout

---

## What Didn't Work / Notable Discoveries

1. **`readAwbJson` stayed in poem-wui.ts** — agent correctly identified it as infrastructure (not pure domain) and left it in the route file. Good judgement call.
2. **`useOpenFolder` was a dead duplicate** — existed in `useApi.ts` but all components already imported from `hooks/useOpenFolder.ts` directly. Dropped cleanly.
3. **Config migration is more complex than expected** — two separate migration paths (NFR-6: targetDirectory → projectDirectory; FR-89: projectDirectory split into root + active). Both were untested before this campaign. They are now covered.
4. **`updateConfig` stayed in index.ts** — it closes over `currentConfig` and `io` (Socket.io) for real-time config push to the client. Cannot be extracted without also extracting those dependencies. Correct decision to leave it.

---

## Key Learnings — Application

- `server/src/config/configManager.ts` is the canonical location for config persistence — future config shape changes go here
- Two config migration paths exist: NFR-6 (`targetDirectory`) and FR-89 (`projectDirectory` split) — do not remove either without verifying no users have pre-migration config files
- `server/src/utils/s3Utils.ts` now owns `extractBrand`, `categorizeMigrationFiles`, `isPathWithinProject`, `MigrationActions`
- `server/src/utils/poemWuiUtils.ts` owns `mapBrandConfig`, `loadBrandConfig`, `firstWords`, `readChapterTranscript`, `findAllSrts`, `buildFliHubChapters`
- All server I/O: `vi.mock('fs-extra')` is the single mock target — no more `fs/promises` split
- `useApi.ts` is now a barrel re-export — add new hooks to the appropriate domain file, not to `useApi.ts`

---

## Key Learnings — Ralph Loop

1. **"Write tests first, then modify index.ts" rule for Wave 3 worked** — agent wrote configManager + tests, confirmed they compiled, then modified index.ts
2. **Running Wave 3 alone was the right call** — a concurrent agent touching server code during a server entry-point refactor would have been risky
3. **6 items in 3 waves completed in one session** — wave sequencing (low-risk → medium → high-risk alone) is the right pattern for refactoring campaigns

---

## Absorbs

- **B013 (NFR-65)**: "Extract Shared Server Utilities" — fully delivered by extract-s3Utils + extract-poemWuiUtils

---

## Suggestions for Next Campaign

- **React hook tests**: `useApi.ts` is now partitioned — hook tests can target individual domain files with clean import paths. The server uses `fs-extra` uniformly — test mocking is now a single target.
- **Coverage thresholds will need updating**: configManager's 22 new tests and the utils extractions have moved testable code into utils files. Expect server line coverage to rise from ~21% → ~28%. Update thresholds after next test run with coverage.
- **`updateConfig` in index.ts** is still untested (closes over Socket.io). Consider a future campaign to extract the config-push mechanism from the render/push coupling.
