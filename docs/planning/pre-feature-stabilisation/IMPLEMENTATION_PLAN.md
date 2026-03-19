# IMPLEMENTATION_PLAN.md — Pre-Feature Stabilisation

**Goal**: Close the 4 structural blockers identified in the 3-lens audit before any major new feature lands. No new functionality — correctness and safety only.
**Started**: 2026-03-19
**Target**: `npm test` passes, `npm run build` clean, all 4 blocker items resolved (B024–B027)

## Summary
- Total: 6 | Complete: 6 | In Progress: 0 | Pending: 0 | Failed: 0

---

## In Progress

(none)

---

## Complete

### Wave 1 — Independent fixes

- [x] fix-writeProjectState-atomic — Atomic write implemented. `projectState.ts` line 93: write to `.tmp` then `fs.rename`. Test mock updated with `rename: vi.fn()` and assertions updated. 390 tests pass.
- [x] fix-swap-chapters-ch99 — Guard inserted after recordings filter. Returns `{ success: false, error: "Chapter 99 is in use (N file(s))..." }` when ch99 has files and neither operand is 99. Legitimate ch99 swaps still work.
- [x] fix-projects-root-state-video — `state.ts` and `video.ts` clean. `PROJECTS_ROOT` constant removed. Added `projectsRootDirectory` guard (400 if not configured) matching pattern in `shadows.ts`/`system.ts`.
- [x] fix-projects-root-transcriptions-projects — `transcriptions.ts` and `projects.ts` clean. 8 PROJECTS_ROOT usages replaced. `WHISPER_BINARY` untouched. Agent spotted updated `resolveProjectCode` signature and updated call site proactively.
- [x] fix-projects-root-query-resolver — `query/projects.ts`, `query/transcripts.ts`, `projectResolver.ts` clean. `_getConfig` renamed. 5 extra call sites in query/ updated. 390 tests pass.
- [x] fix-config-access-index — `assets.ts`, `thumbs.ts`, `system.ts` factory signatures updated to `getConfig: () => Config`. `index.ts` calls updated to use `() => currentConfig`. Hardcoded `v-appydave` in `routes/index.ts:364` missed by agent — fixed by coordinator (`config.projectsRootDirectory!`). Build clean, 390 tests pass. — `query/projects.ts`, `query/transcripts.ts`, `projectResolver.ts` clean. `_getConfig` renamed to `getConfig`. 5 additional call sites in `query/inbox.ts`, `images.ts`, `export.ts`, `recordings.ts`, `chapters.ts` also updated. Build clean, 390 tests pass.

---

## Failed / Needs Retry

(none)

---

## Notes & Decisions

**2026-03-19 — Wave design rationale**

Wave 1: 5 agents in parallel. Each owns a disjoint set of files — zero conflict risk.
Wave 2: 1 agent alone. `fix-config-access-index` touches `index.ts` (server entry point) AND 3 route files. Running it with other agents while they modify related files would risk merge conflicts.

**fix-projects-root-resolver decision**: `projectResolver.ts` exports two public functions. Adding `projectsRootDir: string` as a parameter is cleaner than importing configManager (avoids circular dependency risk). All callers are route handlers with `getConfig()` access — they pass `getConfig().projectsRootDirectory`.

**fix-config-access-index decision**: Assets, thumbs, and system routes receive `config: Config` by direct reference today. This works because `currentConfig` is mutated in-place by `updateConfig`. Changing to `getConfig: () => Config` makes the contract explicit and safe against any future refactor that switches to immutable replace. No behaviour change today — correctness improvement for tomorrow.

**Scope boundary**: This campaign is corrections only. No new features, no test additions (tests for renameRecording orchestration are B028 — separate campaign), no refactoring beyond what is stated above.
