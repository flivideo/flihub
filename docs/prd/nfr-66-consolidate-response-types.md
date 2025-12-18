# NFR-66: Consolidate TypeScript Response Types

**Status:** Pending
**Added:** 2025-12-14
**Implemented:** -
**Priority:** High
**Effort:** Medium (1-2 hours)

---

## Problem

Same response types defined in multiple places.

## Types to Consolidate

| Type | Current Location |
|------|------------------|
| InboxFile, InboxSubfolder | query.ts AND useApi.ts |
| SafeResponse, RestoreResponse | useApi.ts only |
| Query types | query.ts only |

## Solution

Move all to `shared/types.ts`.

## Acceptance Criteria

- [ ] All response types in `shared/types.ts`
- [ ] No duplicate type definitions
- [ ] Both client and server import from shared
- [ ] TypeScript compiles without errors

## Technical Notes

May need to update import paths in:
- `server/src/routes/query.ts`
- `client/src/hooks/useApi.ts`
- Any other files using these types

## Completion Notes

_To be filled by developer._
