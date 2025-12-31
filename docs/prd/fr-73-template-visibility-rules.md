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

### Sync with FR-116 (completed 2025-12-31)

FR-116 added Config UI for common names:
- CommonName type exists in `shared/types.ts`: `{ name, autoSequence?, suggestTags? }`
- Config page now has "Common Names" section with add/remove UI
- This FR adds `showInChapters` property to CommonName type

**UI consideration:** How to expose `showInChapters` in Config?
- Option A: Simple dropdown per name (All / Early chapters / Custom)
- Option B: Advanced settings expandable per name
- Option C: Keep simple - edit in config.json directly for power users

### Ordering Consideration (new)

Common names should support ordering for workflow-based display:
- Current: Array position in config determines order
- Consider: Explicit `order` field or `category` field (early/middle/late)
- Use case: intro → scenario → demo → summary → outro workflow progression

**Options:**
1. **Array position** - Simple, current behavior (recommended for now)
2. **Workflow category** - early/middle/late with sort within category
3. **Numeric order** - Explicit order field per name

Recommend starting with array position (already works) and adding explicit ordering only if users request it.

## Completion Notes

_To be filled by developer._
