# NFR-68: Split Query Routes into Sub-Modules

**Status:** Pending
**Added:** 2025-12-14
**Implemented:** -
**Priority:** Medium
**Effort:** Large (3-4 hours)
**Depends on:** NFR-66

---

## Problem

`routes/query.ts` is 1,352 lines with 9 endpoints.

## Target Structure

```
server/src/routes/query/
├── index.ts           # Router setup
├── projects.ts        # /projects, /resolve, /:code
├── recordings.ts      # /projects/:code/recordings
├── transcripts.ts     # /projects/:code/transcripts
├── chapters.ts        # /projects/:code/chapters
├── images.ts          # /projects/:code/images
├── export.ts          # /projects/:code/export
└── inbox.ts           # /projects/:code/inbox
```

## Acceptance Criteria

- [ ] query.ts split into sub-modules
- [ ] Each module handles related endpoints
- [ ] Router composition in index.ts
- [ ] All existing functionality preserved
- [ ] No breaking changes to API

## Technical Notes

Do NFR-66 first to avoid type import issues during the split.

Each sub-module should:
- Export a router
- Import shared types from `shared/types.ts`
- Use any utilities from NFR-65/NFR-67

## Completion Notes

_To be filled by developer._
