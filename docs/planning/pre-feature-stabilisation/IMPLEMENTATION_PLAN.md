# IMPLEMENTATION_PLAN.md — Pre-Feature Stabilisation

**Goal**: Close the 4 structural blockers identified in the 3-lens audit before any major new feature lands. No new functionality — correctness and safety only.
**Started**: 2026-03-19
**Target**: `npm test` passes, `npm run build` clean, all 4 blocker items resolved (B024–B027)

## Summary
- Total: 6 | Complete: 0 | In Progress: 0 | Pending: 6 | Failed: 0

---

## Pending

### Wave 1 — Independent fixes (run in parallel, no file conflicts)

- [ ] fix-writeProjectState-atomic — Make `writeProjectState` safe against crash-mid-write. Change `fs.writeFile(stateFilePath, ...)` to write to `stateFilePath + '.tmp'` then `fs.rename(tmp, stateFilePath)`. File: `server/src/utils/projectState.ts` only.
- [ ] fix-swap-chapters-ch99 — Guard against chapter 99 collision in `swap-chapters`. Before Phase 1 begins, read `recordingsDir`, filter for files starting with `99-`, and if any exist return `{ success: false, error: 'Chapter 99 is in use — cannot use it as a swap staging area. Rename chapter 99 files first.' }`. File: `server/src/routes/manage.ts` only.
- [ ] fix-projects-root-state-video — Replace module-level `PROJECTS_ROOT` constant with `getConfig().projectsRootDirectory` in handlers. Files: `server/src/routes/state.ts` (lines 31, 54, 109, 174) and `server/src/routes/video.ts` (lines 21, 70). Both factories already receive `getConfig: () => Config`.
- [ ] fix-projects-root-transcriptions-projects — Same PROJECTS_ROOT fix. Files: `server/src/routes/transcriptions.ts` (lines 29, 466) and `server/src/routes/projects.ts` (lines 26, 76, 213, 257, 278, 355, 393, 457, 516). Both factories already receive `getConfig: () => Config`.
- [ ] fix-projects-root-query-resolver — Fix `routes/query/projects.ts` (line 36), `routes/query/transcripts.ts` (line 20, rename `_getConfig` → `getConfig`), and `utils/projectResolver.ts`. For `projectResolver.ts`: add `projectsRootDir: string` as second parameter to `resolveProjectCode` and `resolveProjectCodeOrFail`; remove module-level `PROJECTS_ROOT` constant. All callers of these functions are in route handlers that already have `getConfig()` access.

### Wave 2 — index.ts (run alone — touches the entry point)

- [ ] fix-config-access-index — Two changes in `server/src/index.ts`: (1) line 364 hardcoded `expandPath('~/dev/video-projects/v-appydave')` → `expandPath(currentConfig.projectsRootDirectory)`; (2) lines 229/233/238: change `createAssetRoutes(currentConfig)`, `createThumbRoutes(currentConfig)`, `createSystemRoutes(currentConfig, watcherManager)` to use getter `() => currentConfig`. Requires updating factory signatures in `routes/assets.ts` (line 38), `routes/thumbs.ts` (line 78), `routes/system.ts` (line 204) from `config: Config` to `getConfig: () => Config`, and updating all internal references from `config.X` to `getConfig().X`.

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

**2026-03-19 — Wave design rationale**

Wave 1: 5 agents in parallel. Each owns a disjoint set of files — zero conflict risk.
Wave 2: 1 agent alone. `fix-config-access-index` touches `index.ts` (server entry point) AND 3 route files. Running it with other agents while they modify related files would risk merge conflicts.

**fix-projects-root-resolver decision**: `projectResolver.ts` exports two public functions. Adding `projectsRootDir: string` as a parameter is cleaner than importing configManager (avoids circular dependency risk). All callers are route handlers with `getConfig()` access — they pass `getConfig().projectsRootDirectory`.

**fix-config-access-index decision**: Assets, thumbs, and system routes receive `config: Config` by direct reference today. This works because `currentConfig` is mutated in-place by `updateConfig`. Changing to `getConfig: () => Config` makes the contract explicit and safe against any future refactor that switches to immutable replace. No behaviour change today — correctness improvement for tomorrow.

**Scope boundary**: This campaign is corrections only. No new features, no test additions (tests for renameRecording orchestration are B028 — separate campaign), no refactoring beyond what is stated above.
