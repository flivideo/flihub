# Assessment: B047 Stabilisation

**Campaign**: b047-stabilisation
**Date**: 2026-03-24
**Results**: 3 complete, 0 failed
**Quality audit**: skipped (small bugfix campaign, all fixes have dedicated tests)

## Results Summary

| Work Unit | Outcome |
|-----------|---------|
| split-chapter-fixes (B050+B051) | Tags preserved via extractTagsFromName() in chapterMap. lastBatchMapping = undoMapping added. +5 tests. |
| apply-changes-parser (B052) | Hand-rolled regex replaced with parseRecordingFilename() + extractTagsFromName(). |
| undo-validation (B053) | fs.pathExists check before each undo revert. Stale files skipped with clear message. +4 tests. |

## What Worked Well

1. **Combined B050+B051** — both touched the same 10 lines of split-chapter; combining avoided merge conflicts
2. **Wave separation** — wave 1 (server + client parallel) then wave 2 (server-only) kept manage.ts conflict-free
3. **AGENTS.md quality** — detailed fix instructions with exact line numbers meant all 3 agents succeeded first try
4. **Fast campaign** — 3 work units, 2 waves, ~7 minutes total agent time

## What Didn't Work

Nothing failed. This was a clean stabilisation round.

## Key Learnings — Application

1. **extractTagsFromName() is the missing link** — anywhere parseRecordingFilename is used to reconstruct filenames, tags must be extracted separately. This pattern now appears in both manage.ts and RecordingsView.tsx.

## Key Learnings — Ralph Loop

1. **Bugfix campaigns are ideal for Ralphy** — small scope, clear instructions, high success rate. The audit → backlog → extend → build pipeline worked perfectly.
2. **Exact line numbers in AGENTS.md** — pointing agents to specific lines (not just files) reduced exploration time and prevented wrong-location edits.
3. **Quality audit is overkill for pure bugfix campaigns** — the fixes are smaller than the audit itself would be. Skip for campaigns under 5 work units that are all bug fixes.

## Suggestions for Next Campaign

The relay redesign requirements are ready at `docs/planning/requirements-relay-redesign.md`. That's a Plan (not Extend) — genuinely different domain from recording editor work.
