# Assessment: relay-kanban-fixes

**Campaign**: relay-kanban-fixes (B061)
**Date**: 2026-03-24
**Results**: 3 complete, 0 failed
**Quality audit**: code-quality A-, test-quality A-

## Results Summary

| Work Unit | Items | Outcome |
|-----------|-------|---------|
| collect-without-folder | F006+F007+F010+F012 | Server: `POST /ensure-folders` creates all 3 subfolders. `POST /collect` calls `fs.ensureDir` before rsync. Client: KanbanLane shows relay counts when folder missing + collect button. Push disabled when 0 files. +12 tests (900 total). |
| relay-badge-colors | F009 | `relay-only` badge changed from red/! to amber/↓ with count. Tooltip shows "N to collect". |
| relay-header-indicator | F008 | RelayIndicator pill in header next to SyncIndicator. Aggregate relay sync status with per-subfolder tooltip. Click navigates to Relay tool. |

**Bonus (manual)**: Open-folder buttons added to Sync tool (ChannelCard headers) and Relay tool (KanbanLane headers + relay directory footer).

## What Worked Well

1. **Parallel agent execution** — all 3 work units touched different files, ran in 1 wave with zero conflicts
2. **AGENTS.md inheritance** — relay-kanban AGENTS.md gave agents full context on the stack, mocking patterns, and theme tokens. No correction passes needed.
3. **SyncIndicator as gold standard** — RelayIndicator agent followed SyncIndicator.tsx exactly, producing a consistent header experience
4. **Feedback-driven planning** — every F### item mapped directly to a work unit. No scope creep, no ambiguity.
5. **Campaign was fast** — from QA screenshots to shipped code in a single session, including the audit

## What Didn't Work

1. **Minor: console.log in production** — agents added `console.log` in ensure-folders and collect handlers. Should use activity log only. (Audit MINOR #1)
2. **Minor: useOpenFolder per lane** — each KanbanLane instantiates its own useOpenFolder hook. Works but wasteful. (Audit MINOR #2)
3. **Minor: useEnsureFolders response type incomplete** — doesn't include `foldersCreated` field. (Audit MINOR #3)
4. **Test placement** — 2 tests in the `ensure-edit-folders` describe block actually test the divergence endpoint. Misleading for future readers. (Test audit #4)

## Key Learnings — Application

- **Editor machines rarely have `recordings/`** — always ensure the folder exists before rsync, never gate UI on `folderExists` for collect actions
- **Red = error in David's mental model** — amber for "action needed", red only for actual problems (conflicts, missing config)
- **Header indicators are high-value** — users can't check every tool page; persistent pills solve this
- **Open-folder buttons are basic expectation** — any file listing should have a way to open the folder in Finder

## Key Learnings — Ralph Loop

- **Single-wave campaigns are fast** — 3 non-conflicting work units completed in one pass
- **Feedback files bootstrap campaigns cleanly** — F### items → work units is a 1:1 mapping that eliminates ambiguity
- **Inheriting AGENTS.md saves 80% of planning** — only the work unit details needed writing; stack, patterns, anti-patterns were all inherited

## Promote to Main KDD?

- "Editor machines lack recordings folder" — worth noting in any relay-related KDD
- "Red = error, amber = action" — David's color semantics should be a permanent design rule

## Suggestions for Next Campaign

- Remove `console.log` calls in relay.ts (2 lines)
- Add `foldersCreated` to useEnsureFolders response type
- Move misplaced divergence tests to the correct describe block
- Consider extracting KanbanLane into its own file if RelayTool.tsx grows further (currently 743 lines)
- F011 (no badges on most projects) remains open but is correct behaviour — revisit only if users ask
