# FR-54: Naming Template Bugs

**Status:** Pending
**Added:** 2025-12-10
**Implemented:** -

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

### Bug 2: Tags appearing in suggested name

- **Current:** After `12-8-winston-architect-TECHSTACK.mov`, next suggestion shows `winston-architect-TECHSTACK`
- **Expected:** Strip uppercase tags from name suggestion
- **Fix:** Update `parseRecordingFilename` or `calculateSuggestedNaming`

### Bug 3: Sequence limited to single digit

- **Current:** Cannot type "13" in sequence field - limited to 1 character
- **Fix:** Change `slice(0, 1)` to `slice(0, 3)` and `maxLength={3}` in NamingControls.tsx

### Bug 4: Can't enter multiple custom tags

- **Current:** Custom tag input too small (w-16)
- **Fix:** Widen input to w-24 or w-32, update placeholder to hint format

## Acceptance Criteria

- [ ] Custom tag persists after rename
- [ ] Tags stripped from suggested name
- [ ] Sequence field accepts 2-3 digits
- [ ] Custom tag input wide enough for multiple tags

## Technical Notes

Files to modify:
- `App.tsx` - `handleRenamed` function
- `NamingControls.tsx` - input constraints
- `parseRecordingFilename` or `calculateSuggestedNaming` - tag stripping

## Completion Notes

_To be filled by developer._
