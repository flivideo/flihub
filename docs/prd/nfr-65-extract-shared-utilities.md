# NFR-65: Extract Shared Server Utilities

**Status:** Pending
**Added:** 2025-12-14
**Implemented:** -
**Priority:** High
**Effort:** Small (1 hour)

---

## Problem

Code duplication in server routes.

## Scope

### 1. Transcript file filtering
6 locations filter .txt files excluding -chapter.txt

### 2. Tag extraction
4 locations parse uppercase tags from filenames

## Deliverables

- Create `getTranscriptBasenames(dir)` utility in `server/src/utils/scanning.ts`
- Create `extractTagsFromName(name)` utility in `shared/naming.ts`

## Acceptance Criteria

- [ ] `getTranscriptBasenames(dir)` utility created
- [ ] `extractTagsFromName(name)` utility created
- [ ] All duplicate code replaced with utility calls
- [ ] Existing tests pass

## Technical Notes

Search for patterns like:
- `.filter(f => f.endsWith('.txt') && !f.includes('-chapter'))`
- Regex for uppercase tags: `/[A-Z]+/g`

## Completion Notes

_To be filled by developer._
