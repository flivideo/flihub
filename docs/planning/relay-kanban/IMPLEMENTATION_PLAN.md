# IMPLEMENTATION_PLAN.md — relay-kanban

**Goal**: Add divergence detection (local vs relay comparison), auto-folder creation, and Kanban-style UI for the relay workflow. Users see at a glance what needs syncing, in which direction, with green indicators when synced.
**Started**: 2026-03-24
**Target**: David/Jan see Kanban lanes with divergence indicators on both the Relay tool and Projects page. Edit folders auto-create when recordings are collected. All endpoints tested.

## Summary
- Total: 5 | Complete: 0 | In Progress: 0 | Pending: 5 | Failed: 0

## Pending

### Wave 1 — Backend (3 parallel work units, independent files)
- [ ] divergence-endpoint — New `GET /api/relay/divergence` endpoint comparing local vs relay per subfolder for active project. Returns file counts, file lists, delta, and sync direction per subfolder.
- [ ] auto-create-on-collect — After `POST /api/relay/collect` with subfolder=recordings succeeds, auto-create edit-1st/ and edit-2nd/ folders if they don't exist. Also add manual `POST /api/relay/ensure-edit-folders`.
- [ ] enhanced-browse — Enhance `GET /api/relay/browse` to include local file counts alongside relay counts for each project. Powers project-level Kanban badges.

### Wave 2 — Client UI (2 parallel work units, independent components)
- [ ] kanban-relay-tool — Rewrite RelayTool.tsx as horizontal Kanban flow with divergence indicators, sync direction arrows, folder creation status, and action buttons. Lanes go green when synced.
- [ ] project-kanban-badges — Upgrade ProjectsPanel RelayIndicator from plain dots to Kanban-style mini-badges showing sync direction and delta counts per subfolder. Stages go green when local matches relay.

## In Progress

## Complete

## Failed / Needs Retry

## Notes & Decisions
- Kanban layout chosen (David: "I love that things go green when synced"). Split-pane is backup. Timeline rejected.
- Mockup reference: `.screenshots/relay-workflow-mockups.html` (Variation 1: Kanban Flow)
- Inherits from relay-redesign campaign (B046) — all push/collect/promote/files/activity endpoints already working
- enhanced-browse adds local counts by scanning `projectsRootDirectory` for matching project folders — may be slower for 70+ projects, use Promise.all for parallelism
- Auto-create is a safety improvement — Jan doesn't have to remember to create edit folders manually
- The divergence endpoint is per-active-project only (not batch) — detailed comparison with file lists
- The enhanced-browse is batch (all projects) but lightweight — just file counts, no file lists
