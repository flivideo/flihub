# Assessment: NFR-146 Test Coverage Foundation

**Campaign**: nfr-146-test-coverage
**Date**: 2026-03-16 → 2026-03-16
**Results**: 15/15 complete, 0 failed

---

## Results Summary

| Workspace | Test Files | Tests |
|-----------|-----------|-------|
| shared    | 2         | 38    |
| server    | 9         | 166   |
| client    | 4         | 94    |
| **Total** | **15**    | **298** |

Starting state: 3 passing placeholders, 7 invisible failing tests.
End state: 298 real tests, zero failures, zero placeholders.

---

## What Worked Well

1. **Wave dependency order held perfectly** — Wire → Fix → Export → parallel bulk was the right structure. No agent was blocked.
2. **All 9 parallel agents (Waves 4-7) completed independently** — no file conflicts, no coordination needed. Each agent created a single new test file.
3. **"Test current behaviour, don't fix it" rule** — prevented scope creep. Agents correctly read implementations and matched assertions to reality rather than guessing or changing production code.
4. **Pure functions dominated** — most server utils (`renameRecording.ts`, `projectState.ts`) turned out to be pure, meaning no mocking overhead and very fast tests.
5. **AGENTS.md import path guidance** — the correct `.js` extension pattern was pre-documented; no agent had to rediscover it.

---

## What Didn't Work

1. **Initial import path guess was wrong for s3-utils** — prompt said `../../routes/s3-staging.js` but the correct path from `server/src/test/` is `../routes/s3-staging.js`. Agent self-corrected but wasted a run.
2. **chapterExtraction functions were unexported** — `parseSrtTimestamp`, `formatYouTubeTimestamp`, `calculateConfidence` all needed `export` added. Wave 3 could have covered these alongside the others.
3. **finalMedia functions were also unexported** — same issue: `extractVersion` and `isAdditionalSegment` needed `export`. Wave 3 scope was too narrow.
4. **poem-wui.ts needs two separate mocks** — `fs/promises` for direct calls AND `fs-extra` (via `readDirSafe`). This was non-obvious and required the agent to trace through an indirect dependency.
5. **`extractVersion` return type was wrong in the plan** — documented as `string | null`, actual is `number | undefined`. Plan docs should be derived from the code, not guessed.

---

## Key Learnings — Application

1. **`projectState.ts` uses `fs-extra`, not `fs/promises`** — mock `fs-extra` with `{ pathExists, readFile, writeFile }`.
2. **Prune logic fires when ALL 4 flags are falsy** — safe, parked, stage, annotation must all be falsy/zero for an entry to be deleted.
3. **`parseSrtTimestamp` returns seconds (float), not ms** — `'00:02:34,500'` → `154.5`.
4. **`extractVersion` returns `number | undefined`** — not string, not null.
5. **`isAdditionalSegment` takes 2 params** — `(filename, projectCode)`.
6. **`formatChapterTitle('HELLO-WORLD')` → `''`** — all-uppercase is treated as tags by `extractTagsFromName`, leaving nothing.
7. **AWB `{}` (no ok field) is treated as success** — strict `=== false` check.
8. **`categorizeMigrationFiles` silently ignores non-mp4/srt/mov files** — `.txt`, `.png` etc. appear in none of the output arrays.
9. **Server test import paths**: from `server/src/test/`, routes are `../routes/X.js`, utils are `../utils/X.js`.

---

## Key Learnings — Ralph Loop

1. **Export wave should be wider** — Wave 3 only covered explicitly listed functions. A pre-flight grep for unexported functions in the target files would catch stragglers before the test agents hit them.
2. **"Read current implementation first" rule is load-bearing** — every agent that read the code before writing assertions produced passing tests first try. The two that needed correction (clientFormatting) corrected themselves on the second run within the same agent.
3. **9 parallel agents on 9 independent files = no conflicts** — this wave pattern works cleanly when each agent owns exactly one output file.
4. **Combined agents (two files, one agent) also works** — the naming-controls + client-naming agent handled both files cleanly. Useful when files are small.
5. **Plan docs should cite actual return types** — guessed types (`string | null`) caused one agent to write wrong assertions. Always derive plan docs from the code.

---

## Promote to Main KDD?

- `fs-extra` mock pattern for `projectState.ts` tests
- Two-mock pattern for `poem-wui.ts` (fs/promises + fs-extra)
- The `parseSrtTimestamp` → seconds (not ms) fact
- The prune-all-flags-falsy behaviour of projectState

Human makes final call on promotion.

---

## Suggestions for Next Campaign

- **NFR: add export pass to Wave 3 scope** — grep for unexported functions in all test-target files before launching test agents. Saves a round-trip when an agent discovers an unexported function mid-task.
- **NFR: React hook tests** — `useSocket.ts`, `useApi.ts` hooks are currently untested. React Query mocking is the blocker. Consider a dedicated wave with a clear mock strategy.
- **NFR: Playwright E2E** — recording rename flow end-to-end is the highest-value scenario not covered.
- **Consider a coverage report** — now that the suite is real, `vitest --coverage` would show actual coverage % and identify gaps for the next wave.
