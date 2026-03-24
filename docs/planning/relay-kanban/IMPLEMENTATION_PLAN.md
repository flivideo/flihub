# IMPLEMENTATION_PLAN.md — relay-kanban

**Goal**: Add divergence detection (local vs relay comparison), auto-folder creation, and Kanban-style UI for the relay workflow. Users see at a glance what needs syncing, in which direction, with green indicators when synced.
**Started**: 2026-03-24
**Target**: David/Jan see Kanban lanes with divergence indicators on both the Relay tool and Projects page. Edit folders auto-create when recordings are collected. All endpoints tested.

## Summary
- Total: 5 | Complete: 5 | In Progress: 0 | Pending: 0 | Failed: 0

## Pending

## In Progress

## Complete

### Wave 1 (merged to main — 888 tests pass)
- [x] divergence-endpoint — `GET /api/relay/divergence` with listFiles helper. +15 tests (4 listFiles + 11 divergence). Compares local vs relay per subfolder, returns direction/localOnly/relayOnly/folderExists.
- [x] auto-create-on-collect — `POST /collect` auto-creates edit-1st/ and edit-2nd/ when collecting recordings. `POST /ensure-edit-folders` for manual creation. +8 tests.
- [x] enhanced-browse — `GET /api/relay/browse?detailed=true` with local counts and syncStatus per project. deriveSyncStatus helper. Backward compatible. +14 tests (7 deriveSyncStatus + 7 integration).

### Wave 2 (merged to main — 888 tests pass)
- [x] kanban-relay-tool — Full rewrite of RelayTool.tsx as 4-lane Kanban board. useRelayDivergence hook (15s refetch), useEnsureEditFolders mutation. Green/blue/amber/red lane borders. Folder creation buttons. Activity footer. 318 lines added, 140 removed.
- [x] project-kanban-badges — Rewrote RelayIndicator with Kanban mini-badges (REC ✓, 1st ↓2, 2nd ↑1). useEnhancedRelayBrowse hook. Backward-compatible fallback to dots. Hover tooltip with detailed breakdown.

## Failed / Needs Retry

## Notes & Decisions
- Kanban layout chosen (David: "I love that things go green when synced"). Split-pane is backup. Timeline rejected.
- Mockup reference: `.screenshots/relay-workflow-mockups.html` (Variation 1: Kanban Flow)
- Inherits from relay-redesign campaign (B046) — all push/collect/promote/files/activity endpoints already working
- enhanced-browse adds local counts by scanning `projectsRootDirectory` for matching project folders — may be slower for 70+ projects, use Promise.all for parallelism
- Auto-create is a safety improvement — Jan doesn't have to remember to create edit folders manually
- The divergence endpoint is per-active-project only (not batch) — detailed comparison with file lists
- The enhanced-browse is batch (all projects) but lightweight — just file counts, no file lists
