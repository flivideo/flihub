# NFR-67: Standardize Server Error Handling

**Status:** Pending
**Added:** 2025-12-14
**Implemented:** -
**Priority:** Medium
**Effort:** Medium (2 hours)

---

## Problem

Error handling inconsistent - some errors silently swallowed.

## Deliverables

1. Create `readDirSafe(path)` utility - returns empty array for missing dirs
2. Create `sendErrorResponse(res, status, message)` helper
3. Replace 15+ silent catches in query.ts with appropriate handling

## Acceptance Criteria

- [ ] `readDirSafe(path)` utility created
- [ ] `sendErrorResponse(res, status, message)` helper created
- [ ] Silent catches replaced with proper error handling
- [ ] Errors logged appropriately
- [ ] Client receives meaningful error messages

## Technical Notes

Patterns to replace:
```typescript
// Bad: silent catch
try {
  const files = await fs.readdir(path);
} catch {
  return []; // Error swallowed
}

// Good: explicit handling
const files = await readDirSafe(path);
// Returns [] if dir doesn't exist, logs warning
```

## Completion Notes

_To be filled by developer._
