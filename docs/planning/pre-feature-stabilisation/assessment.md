# Assessment: Pre-Feature Stabilisation

**Campaign**: pre-feature-stabilisation
**Date**: 2026-03-19 → 2026-03-19
**Results**: 6/6 complete, 0 failed

---

## Results Summary

| Work Unit | Files Changed | Outcome |
|-----------|--------------|---------|
| fix-writeProjectState-atomic | projectState.ts, projectState.test.ts | Atomic write implemented, test mock updated |
| fix-swap-chapters-ch99 | manage.ts | Ch99 guard inserted, legitimate ch99 swaps preserved |
| fix-projects-root-state-video | state.ts, video.ts | PROJECTS_ROOT removed, projectsRootDirectory guards added |
| fix-projects-root-transcriptions-projects | transcriptions.ts, projects.ts | PROJECTS_ROOT removed from all 8 usages |
| fix-projects-root-query-resolver | query/projects.ts, query/transcripts.ts, projectResolver.ts + 5 call sites | Full query layer cleaned, resolver signature updated |
| fix-config-access-index | index.ts, assets.ts, thumbs.ts, system.ts | Getter pattern normalised, one miss fixed by coordinator |

Build: clean. Tests: 390 passing, 0 failures.

---

## What Worked Well

1. **Wave 1 parallel execution was clean** — 5 agents on disjoint file sets, zero conflicts
2. **Route factories already had `getConfig`** — B024 was simpler than anticipated; no signature changes needed for the main route files, just delete the constant and use the existing getter
3. **projectResolver.ts signature change was the right call** — adding `projectsRootDir: string` as a parameter avoided a circular dependency risk and all callers already had `getConfig()` access
4. **fix-projects-root-transcriptions-projects spotted the updated resolveProjectCode signature** from the parallel agent and updated the call site proactively — good agent awareness
5. **fix-projects-root-query-resolver found 5 extra call sites** not listed in the plan (query/inbox.ts, images.ts, export.ts, recordings.ts, chapters.ts) — complete cleanup with no plan amendment needed

---

## What Didn't Work

1. **Wave 2 agent missed `routes/index.ts:364`** — reported the hardcoded path "was not present" but grep found it. Coordinator fixed directly (1-line edit). Likely caused by the agent searching for the exact string it was told to expect rather than grepping broadly.
2. **Brief test collision during Wave 1** — fix-swap-chapters-ch99 ran `npm test` while fix-writeProjectState-atomic was mid-execution, causing 3 failures in `projectState.test.ts` (`fs.rename is not a function`). Self-resolved once the atomic-write agent updated the mock. No corrective action needed — parallel test runs on shared files are inherently racy.
3. **B026 scope was partial** — the `Object.assign` bypasses in `projectRoutes` and `chapterRoutes` callbacks in `index.ts` were explicitly left out of scope (they require `updateConfig` refactor). BACKLOG item B026 should reflect this is only partially complete.

---

## Key Learnings — Application

- `projectsRootDirectory` is typed `string | undefined` in `Config` — use `!` non-null assertion at call sites (`configManager` always sets a default, so the assertion is safe)
- All main route factories already used `getConfig: () => Config` pattern — the direct-reference anomaly was isolated to 3 factories in `index.ts` plus 1 inline handler
- `routes/index.ts` receives `config: Config` as a snapshot (not a getter) — this is a known remaining issue; fixes in this file use `config.X!` not `getConfig().X`
- `projectResolver.ts` is a utility that should always receive its root path as a parameter — never import configManager into utilities (circular dep risk)

---

## Key Learnings — Ralph Loop

1. **Wave 2 alone was right** — index.ts is the entry point; running it alongside any route-touching agent risks merge conflicts
2. **"Grep broadly after each agent" should be in AGENTS.md** — the Wave 2 miss would have been caught by a post-fix verification grep. Add this to quality gates for structural fix campaigns.
3. **Parallel test collisions are expected and self-resolving** — don't treat mid-wave test failures as blockers; wait for all Wave 1 agents to complete before evaluating test state
4. **Plan line counts are approximate** — agents should read files first, not trust line numbers in the plan. All agents did this correctly.

---

## Promote to Main KDD?

- `projectsRootDirectory` non-null assertion pattern (`!`) — safe because configManager default always sets it
- `projectResolver.ts` parameter pattern — utility functions should receive path params, not import config
- Parallel test collision behaviour — self-resolving, not a blocker

---

## Suggestions for Next Campaign

- **B026 partial** — the `Object.assign` bypasses in `createProjectRoutes` and `createChapterRoutes` callbacks (index.ts lines 245, 259) are still live. These bypass `updateConfig`, skipping watcher restarts. A future campaign should route these through `updateConfig` properly.
- **Add post-fix grep to quality gates** — `grep -rn "PROJECTS_ROOT\|v-appydave" server/src/` as a mandatory check prevents the Wave 2 miss pattern.
- **Next campaign: test-coverage-gaps-2** — B028 (renameRecording orchestration), B029 (extractChapters), B030 (client srt.ts), B031 (editManifest). All high regression risk. No structural blockers remain.
