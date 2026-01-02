# FR-69: Header Dropdown Menus

**Status:** Implemented
**Added:** 2025-12-14
**Implemented:** 2025-12 (discovered in review 2026-01-01)

---

## User Story

As a user, I want the header icons organized into dropdown menus for a cleaner interface.

## Problem

Header has multiple standalone icons that could be better organized into logical dropdown menus.

## Solution

### Gear Menu
- Config
- Mockups
- (future: API Help)

### Project Actions Menu
- Copy for calendar
- Copy full path
- Open in Finder

## Acceptance Criteria

- [x] Gear icon opens dropdown with Config and Mockups
- [x] Project actions grouped into single dropdown
- [x] Dropdowns close when clicking outside
- [x] Keyboard accessible

## Technical Notes

Consider using a dropdown component library or building a simple one with proper accessibility (ARIA attributes, keyboard navigation).

## Completion Notes

**Discovered 2026-01-01:** Code review revealed FR-69 was already implemented.

**What was built:**
- `client/src/components/HeaderDropdown.tsx` - Reusable dropdown component
- Settings dropdown (gear icon) with Config and Mockups options
- Project actions dropdown (ellipsis icon) with Copy for Calendar, Copy Path, Open in Finder

**Evidence:**
- HeaderDropdown.tsx has `// FR-69:` comment at top
- App.tsx uses HeaderDropdown with `// FR-69: Project Actions dropdown` and `// FR-69: Settings dropdown` comments

**Files:**
- `client/src/components/HeaderDropdown.tsx` (created)
- `client/src/App.tsx` (modified - imports and uses HeaderDropdown)
