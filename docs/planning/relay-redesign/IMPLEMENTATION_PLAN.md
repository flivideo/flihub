# IMPLEMENTATION_PLAN.md — relay-redesign

**Goal**: Replace infrastructure-oriented relay UI (subfolder dropdown, global browser) with workflow-oriented design (lane cards, file drawers, activity feed, toasts, setup guide). Backlog item: new B046.
**Started**: 2026-03-23
**Target**: David never selects a subfolder. Lane cards show per-stage stats + actions. File drawers show individual files grouped by chapter. Activity feed shows recent relay events. Toast notifications on relay changes. Setup guide for new collaborators. Project-list relay indicators.

## Summary
- Total: 6 | Complete: 6 | In Progress: 0 | Pending: 0 | Failed: 0

## Pending

- [x] relay-workflow-lanes — Full rewrite of RelayTool.tsx: three-column lane cards, file drawers with chapter grouping, activity feed, role-aware actions, setup guide panel.
- [x] relay-toast-notifications — Wired useRelaySocket() into App.tsx for global relay toast notifications. Formatted messages per subfolder.
- [x] relay-setup-guide — Collapsible setup guide in RelayTool. Added Relay column with colored dot indicators to ProjectsPanel.

## In Progress

## Complete

- [x] relay-socket-foundation — Added RelayChangeEvent type, replaced 3 placeholder socket events with relay:changed, added 5 relay query key constants, fixed WatcherManager to parse real file paths, added useRelaySocket() hook, migrated all inline query keys to QUERY_KEYS constants.
- [x] relay-files-endpoint — Added GET /files endpoint with chapter extraction, source=project|relay param, RelayFileInfo/RelayFilesResponse types, useRelayFiles() hook. +8 tests.
- [x] relay-activity-endpoint — Added in-memory ring buffer (50 events), GET /activity endpoint with projectCode filter, logRelayActivity() export, wired into push/collect/promote success handlers, useRelayActivity() hook. +6 tests.

## Failed / Needs Retry

## Notes & Decisions
- Wave 1: relay-socket-foundation, relay-files-endpoint, relay-activity-endpoint (plumbing)
- Wave 2: relay-workflow-lanes, relay-toast-notifications, relay-setup-guide (UI)
- Activity feed uses in-memory ring buffer — no database, persists until server restart
- RelayBrowser.tsx kept for now — browse data still feeds lane card stats
- Mockup reference: `.mochaccino/designs/relay-redesign/index.html`
- Requirements reference: `docs/planning/requirements-relay-redesign.md`
