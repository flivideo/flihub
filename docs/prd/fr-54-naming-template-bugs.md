# FR-54: Naming Template Bugs

**Status:** Already Implemented (discovered during code review)
**Added:** 2025-12-10
**Implemented:** Various dates (fixes applied incrementally)

---

## User Story

As a user, I want the automatic naming template on the Incoming tab to work correctly without losing my input or showing incorrect suggestions.

## Problem

Four related issues with the automatic naming template on the Incoming tab.

## Bug Details

### Bug 1: Custom tag cleared after rename

- **Current:** Custom tag field cleared after each rename
- **Expected:** Persist until user explicitly clears it
- **Fix:** Remove `customTag: ''` from `handleRenamed` in App.tsx
- **Status:** FIXED - `handleRenamed` in App.tsx (line 169) only updates `sequence`, custom tag persists

### Bug 2: Tags appearing in suggested name

- **Current:** After `12-8-winston-architect-TECHSTACK.mov`, next suggestion shows `winston-architect-TECHSTACK`
- **Expected:** Strip uppercase tags from name suggestion
- **Fix:** Update `parseRecordingFilename` or `calculateSuggestedNaming`
- **Status:** FIXED - `stripTrailingTags()` function added to `shared/naming.ts` (lines 163-170), called in `parseRecordingFilename()` (line 232)

### Bug 3: Sequence limited to single digit

- **Current:** Cannot type "13" in sequence field - limited to 1 character
- **Fix:** Change `slice(0, 1)` to `slice(0, 3)` and `maxLength={3}` in NamingControls.tsx
- **Status:** FIXED - Sequence input now has `slice(0, 3)` and `maxLength={3}` (NamingControls.tsx lines 170-171)

### Bug 4: Can't enter multiple custom tags

- **Current:** Custom tag input too small (w-16)
- **Fix:** Widen input to w-24 or w-32, update placeholder to hint format
- **Status:** FIXED - Input now `w-24` with title hint for TAG1-TAG2 format (NamingControls.tsx lines 262-263)

## Acceptance Criteria

- [x] Custom tag persists after rename
- [x] Tags stripped from suggested name
- [x] Sequence field accepts 2-3 digits
- [x] Custom tag input wide enough for multiple tags

## Technical Notes

Files modified:
- `App.tsx` - `handleRenamed` function (no longer clears customTag)
- `NamingControls.tsx` - input constraints updated
- `shared/naming.ts` - `stripTrailingTags()` and `extractTagsFromName()` utilities added

## Completion Notes

**Discovered 2026-01-01:** Code review revealed all 4 bugs were already fixed during previous development work. The fixes were applied incrementally but the PRD was not updated at the time.

**Evidence of fixes:**
1. App.tsx line 168: Comment explicitly references FR-54
2. NamingControls.tsx line 114: Comment references FR-21/FR-54
3. shared/naming.ts line 161: Comment references FR-54 for tag stripping
4. shared/naming.ts line 231: Comment references FR-54 in parseRecordingFilename

No further development work required.
