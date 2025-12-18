# FR-73: Template Visibility Rules

**Status:** Pending
**Added:** 2025-12-15
**Implemented:** -

---

## User Story

As a user, I want quick-select templates filtered based on the current chapter so I only see relevant options.

## Problem

All templates show for all chapters, even when some are only relevant to specific chapters (e.g., "intro" only makes sense in early chapters).

## Solution

Add `showInChapters` property to each template in config:

```json
{
  "commonNames": [
    { "name": "intro", "autoSequence": true, "showInChapters": [1, 2, 3, 4] },
    { "name": "scenario", "showInChapters": [1, 2, 3, 4] },
    { "name": "demo", "showInChapters": "all" },
    { "name": "summary", "showInChapters": "all" },
    { "name": "outro", "suggestTags": ["RECAP", "ENDCARD"], "showInChapters": "all" }
  ]
}
```

**Rules:**
- `showInChapters: [1, 2, 3, 4]` - Only show in chapters 1-4
- `showInChapters: "all"` - Show in all chapters (default)

## Acceptance Criteria

- [ ] Templates filtered by current chapter selection
- [ ] `showInChapters` property respected in config
- [ ] Default behavior ("all") when property not specified
- [ ] Add missing "scenario" template

## Technical Notes

Filter logic in the component that renders template buttons, based on current chapter value in naming controls.

## Completion Notes

_To be filled by developer._
