# Next Round Brief — FliHub

**Written**: 2026-03-23 (post manage-page-redesign)

---

## Goal

Fix bugs and dead code from the B041 campaign, then add test coverage for the Manage panel components.

## Background

B041 (manage-page-redesign) shipped: drawers removed, tool-owned center content, sidebar as pure navigation. Code quality audit found a stale closure bug and dead code. Test quality audit found zero test coverage on all 4 changed files.

## Suggested Work Items

### Must-fix (wave 1)
1. **Fix stale closure** in ManagePanel `handleRegenClick` — `modalChapterSettings` captured at closure creation, user edits silently ignored. Use ref or pass settings as param from ConfirmationModal.
2. **Remove dead `chapters` branches** — `type === 'chapters'` unreachable after B042 removed Regen Chapters button. ~15 lines of dead code in ManagePanel.tsx.
3. **Fix loose type** — ToolsSidebar `activeTool` prop is `string | null`, should be `ActiveTool`.

### Test coverage (wave 1 or 2)
4. **Extract and unit-test pure functions**: `groupByChapter()`, `getChapterDisplayName()` from ManagePanel
5. **Test ChapterListPanel logic**: chapter extraction, gap detection — pure computation, no mocking needed
6. **ToolsSidebar render test**: verify 5 tools render, active state toggles, callbacks fire
7. **ManagePanel integration test**: verify tool switching renders correct center content

### Technical debt (from prior audit, still pending)
8. B043: Type relay API responses and add HTTP status checking
9. Promote overwrite warning — check if dest exists before fs.copy

## Reference
- Assessment: `docs/planning/manage-page-redesign/assessment.md`
- AGENTS.md: `docs/planning/manage-page-redesign/AGENTS.md` (inherit for next wave)
- BACKLOG.md: `docs/planning/BACKLOG.md`

## To Start Next Session

```
/ralphy
```

Then: "Continue from the next-round brief."
