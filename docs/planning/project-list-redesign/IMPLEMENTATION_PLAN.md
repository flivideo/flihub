# IMPLEMENTATION_PLAN.md — Project List Redesign (FR-148)

**Goal**: Replace current project list with filterable table + detail drawer per mockup A
**Started**: 2026-03-30
**Target**: All 17 acceptance criteria from FR-148 PRD pass; tests pass; warm linen palette throughout
**PRD**: `docs/prd/fr-148-project-list-redesign.md`
**Profile**: Development

## Summary
- Total: 5 | Complete: 5 | In Progress: 0 | Pending: 0 | Failed: 0

## Pending

## In Progress

## Complete

- [x] backend-stats — Added hasFinal boolean to ProjectStats in shared/types.ts. Server computes it in projectStats.ts by scanning final/ directory for .mp4/.mov files. Mapped in projects.ts route. 908 server tests pass. Note: agent compiled shared/ with CommonJS output (breaking Vite) — fixed by restoring ESM compiled files.

- [x] project-list-toolbar — Created ProjectListToolbar.tsx with search input, 8 stage pills (using STAGE_DISPLAY colors), 4 smart presets, result count. Exported STAGE_DISPLAY and STAGE_ORDER constants. 6 tests added. 174 client tests pass.

- [x] project-drawer — Created ProjectDrawer.tsx with slide-in panel (40vw), stats grid, progress checklist, health assessment, quick actions (Open in Finder, Copy Transcript), metadata. Escape key and backdrop click close. 6 tests added. 174 client tests pass.

- [x] visual-polish — Matched mockup A fidelity: (1) Code column — plain bold `text-warm-secondary` not blue links, truncated max-w-[100px], (2) Star icons — ★/☆ in amber-400/warm-faint replacing emoji/circles, (3) Final column — ✓ green/amber replacing ✅🎬📝 emoji, (4) Trans% — clipboard emoji replaced with subtle ⎘, added inline progress bar (w-10 h-1.5 with color-coded fill), (5) Row density — py-2→py-1.5, whitespace-nowrap on name, (6) Preset buttons — rounded-full pills with border matching stage pill pattern, (7) Name column truncated with max-w-[250px]. Build passes, 22 filter tests pass.

- [x] table-redesign-integration — Refactored ProjectsPanel.tsx: 9-column table (star, code, name, stage, files, trans%, final, relay, modified), stage-tinted rows, sticky thead, row click opens drawer, filter state management, removed ProjectStatsPopup and content indicator columns. Delivery review applied 7 patches: STAGE_DISPLAY dedup, hasFinal cast fix, filter logic extraction (22 tests), drawerCode stale-snapshot fix, shared copyProjectTranscript utility, search-by-name, daysAgo null safety. Build passes, all new tests pass.

## Failed / Needs Retry

## Notes & Decisions
- Current ProjectsPanel has many inline cell components (FinalMediaCell, StageCell, TranscriptPercentCell, RelayIndicator, etc.) — these should be preserved and reused in the redesigned table
- The content indicators (Inbox, Assets, Chapters) are being removed from the table columns — this data is visible in the drawer instead
- Shadows column and Chapters column are also moving to drawer — keeps the table scannable
- The stats popup (ProjectStatsPopup) is replaced by the drawer — remove the popup integration
- Stage dropdown (StageCell) stays in the table — stage editing happens inline, not in the drawer
- F011 (relay badges showing dashes) is a known issue — do not attempt to fix in this campaign
- TranscriptCopyButton logic should be reused in the drawer's quick actions
- Wave plan: wave 1 = items 1-3 (parallel, different files), wave 2 = item 4 (integration)
