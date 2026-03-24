# IMPLEMENTATION_PLAN.md — relay-kanban-fixes

**Goal**: Fix relay UX blockers discovered during visual QA on Jan's editor machine. Editor can't collect recordings, badges are alarming, no header notification for relay activity.
**Started**: 2026-03-24
**Target**: Editor can collect files even when local folder missing, badge colors communicate direction not error, header shows relay status from any page.

## Summary
- Total: 3 | Complete: 3 | In Progress: 0 | Pending: 0 | Failed: 0

## Pending

## In Progress

## Complete

- [x] collect-without-folder — F006+F007+F010+F012: POST /ensure-folders creates all 3 subfolders. KanbanLane shows relay counts when folder missing + collect button. Push disabled when 0 files. +12 tests (900 total).
- [x] relay-badge-colors — F009: relay-only changed from red/! to amber/↓ with count. Tooltip shows "N to collect".
- [x] relay-header-indicator — F008: RelayIndicator pill in header next to SyncIndicator. Shows aggregate relay sync status with per-subfolder tooltip. Click navigates to Relay tool.

## Failed / Needs Retry

## Notes & Decisions
- Feedback items: F006, F007, F008, F009, F010, F012
- F011 (no badges on most projects) skipped — correct behaviour
- All 3 work units can run in parallel — they touch different files
- Inherits AGENTS.md from relay-kanban campaign
