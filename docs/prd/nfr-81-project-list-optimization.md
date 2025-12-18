# NFR-81: Project List Scanning Optimization

**Status:** Future (implement when needed)
**Added:** 2025-12-15
**Implemented:** -

---

## Problem

FR-80 adds inbox/assets/chapters indicators. Live scanning directories for each project could slow down with 30+ projects.

## Options

1. **Live scan** (current pattern) - always accurate but slower
2. **Cached metadata** in project.json - fast but could get stale
3. **Hybrid** with background refresh

## When to Implement

When project list becomes noticeably slow (>500ms).

## Acceptance Criteria

- [ ] Project list loads in <500ms with 50+ projects
- [ ] Indicators remain accurate
- [ ] No stale data shown to user

## Technical Notes

Potential approaches:
- Cache scan results with TTL
- Background refresh on project change events
- Lazy load indicators (show skeleton, then populate)

## Completion Notes

_To be filled by developer._
