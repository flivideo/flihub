# IMPLEMENTATION_PLAN.md — manage-page-redesign

**Goal**: Replace the generic "Manage & Export" shell with context-sensitive tool pages. Each tool owns the center content when active. File list only shows for tools that need it. No more drawers.
**Started**: 2026-03-22
**Target**: Manage tab feels purposeful — Relay feels like a relay page, Gling feels like a gling page. Sidebar is pure navigation. `npm test` passes, `npm run build` clean.

## Summary
- Total: 3 | Complete: 3 | In Progress: 0 | Pending: 0 | Failed: 0

## Pending

- [x] manage-tool-pages — Core restructure: remove all 4 SlideOutDrawers from ManagePanel, add conditional center rendering based on activeTool, remove "Manage & Export" heading from App.tsx, add contextual heading per tool. Regen actions move from sidebar buttons to inline toolbar. ToolsSidebar simplified to pure navigation. Default view = regen (file list + inline regen buttons). All 842 tests pass, build clean.
- [x] renumber-inline — Removed modal overlay wrapper from ChapterListPanel. Replaced window.location.reload() with onClose(). Replaced alert() with toast from sonner. Component now renders as inline content.
- [x] sidebar-active-state — Restored Record/Edit/Collaborate semantic groupings. Verified active state styling (blue left border). Git Sync separated in Actions group. No stale references.

## In Progress

(coordinator moves items here with [~])

## Complete

(coordinator moves items here with [x], adds outcome notes)

## Failed / Needs Retry

(coordinator moves items here with [!], adds failure reason)

---

## Notes & Decisions

**Design direction (confirmed by David 2026-03-22)**:
- Sidebar stays as sub-navigation within Manage tab (no new top-level tabs)
- Each tool owns the full center area when selected
- File list only for tools that need it: Regen (default), Rename, Renumber
- Standalone tools: Relay and Gling get full-width center views
- Drawers are eliminated entirely
- "Manage & Export" heading replaced with contextual heading per tool
- Default landing state = Regen view (file list + regen toolbar)
- Git Sync stays as a one-click sidebar action (not a page)

**File scope**:
- ManagePanel.tsx — major refactor (remove drawers, add conditional rendering)
- ToolsSidebar.tsx — simplify to navigation (all tools become complex, collapse regen)
- App.tsx — remove "Manage & Export" heading (line 853)
- ChapterListPanel.tsx — remove modal overlay wrapper

**No server changes** — this is purely client-side restructuring.

**Wave design**:
- Wave 1 (1 agent): `manage-tool-pages` — the core restructure. All rendering logic changes.
- Wave 2 (2 agents): `renumber-inline` + `sidebar-active-state` — cleanup that depends on wave 1's new structure.

**Dependencies**:
- `manage-tool-pages` must land before wave 2 (it defines the new rendering pattern)
- `renumber-inline` and `sidebar-active-state` can run in parallel (different files)

**Reference files**:
- `docs/planning/manage-relay-refactor-w2/AGENTS.md` — previous campaign AGENTS.md
- `docs/planning/flihub-feedback.md` — F001-F003 feedback items
- `.screenshots/manage-page-full.png` — current Manage page screenshot for reference
