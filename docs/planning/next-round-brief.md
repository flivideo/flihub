# Next Round Brief — FliHub

**Written**: 2026-03-23 (post manage-panel-polish)

---

## Goal

Address remaining technical debt — relay API typing, test coverage gaps, and structural cleanup items.

## Background

Two campaigns shipped this session:
- **B041 (manage-page-redesign)**: Drawers removed, tool-owned center content, sidebar as pure navigation
- **manage-panel-polish**: Fixed stale closure, dead code, loose types, +41 tests (client: 126 → 167)

Total test count: 883. Build clean. All feedback items (F001-F003) resolved.

## Suggested Work Items

### B043 — Type relay API responses + HTTP status checking (medium)
- Relay hooks use untyped API responses — add TypeScript interfaces
- No HTTP status checking on fetch calls — add error handling
- From code-quality audit on manage-relay-refactor-w2

### B032 — Test shared/naming.ts missing functions (medium)
- parseImageFilename, buildImageFilename, findNextSequence, calculateSuggestedNaming
- Image filename parsing and suggested-naming logic completely untested
- From test-quality audit

### Structural debt (lower priority)
- B033: Extract transcription queue state into a class (module-level mutable globals)
- B034: Fix asyncHandler — wrap all routes or remove
- B035: Add React error boundary around tab components
- B036: Replace hardcoded WHISPER_BINARY path with config
- B037: Remove `[FR-89 DEBUG]` console.log statements

### Design iteration (future)
- ManagePanel is 620+ lines — extract regen handler + file list into sub-components
- Fixed sidebar positioning (`fixed left-8 top-32`) is fragile — consider layout grid
- Promote overwrite warning — check if dest exists before fs.copy

## Reference
- Assessment: `docs/planning/manage-panel-polish/assessment.md`
- AGENTS.md: `docs/planning/manage-panel-polish/AGENTS.md` (inherit for next wave)
- BACKLOG.md: `docs/planning/BACKLOG.md`

## To Start Next Session

```
/ralphy
```

Then: "Continue from the next-round brief."
