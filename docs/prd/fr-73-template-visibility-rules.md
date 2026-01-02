# FR-73: Template Visibility Rules

**Status:** Complete
**Added:** 2025-12-15
**Updated:** 2026-01-02
**Implemented:** 2026-01-02

---

## Background: Deferred Work from NFR-3

This requirement completes functionality that was originally specified in **NFR-3: Configurable Common Names with Rules Engine** but deferred during initial implementation.

**Original NFR-3 spec included:**
```json
{
  "commonNames": [
    { "name": "intro", "minChapter": 1, "maxChapter": 2 },
    { "name": "outro", "minChapter": 4 },
    { "name": "setup", "maxChapter": 3 }
  ]
}
```

The `minChapter`/`maxChapter` rules were never implemented. FR-73 completes this with an improved syntax (`chapterFilter`) and adds a Config UI for editing.

---

## Foundation Stories (Already Implemented)

| Story | What It Built | Relevance |
|-------|---------------|-----------|
| **NFR-3** | Common names config structure with `autoSequence`, `suggestTags` | Base config format that FR-73 extends |
| **FR-13** | Common name pill buttons in NamingControls | The pills that FR-73 will filter |
| **FR-116** | Common Names section in Config panel (add/remove) | UI that FR-73 Part 2 extends with filter dropdowns |
| **FR-118** | Auto-save for Common Names add/delete | Config save pattern already working |
| **FR-115** | Chapter Context Panel on Incoming page | Shows current chapters (visual context) |
| **FR-112** | New Chapter button calculates next chapter | Current chapter value available in state |

---

## User Story

As a user, I want quick-select templates filtered based on the current chapter so I only see relevant options, and I want to configure these rules easily in the UI.

## Problem

All templates show for all chapters, even when some are only relevant to specific chapters (e.g., "intro" only makes sense in early chapters). There's no way to configure visibility rules without editing config.json directly.

---

## Solution

### Part 1: Smart Chapter Filtering

Add flexible `chapterFilter` property to each template in config:

```json
{
  "commonNames": [
    { "name": "intro", "autoSequence": true, "chapterFilter": { "max": 4 } },
    { "name": "scenario", "chapterFilter": { "max": 4 } },
    { "name": "demo", "chapterFilter": "all" },
    { "name": "review", "chapterFilter": { "min": 5, "max": 15 } },
    { "name": "summary", "chapterFilter": "all" },
    { "name": "outro", "suggestTags": ["RECAP", "ENDCARD"], "chapterFilter": { "min": 10 } }
  ]
}
```

**Filter options:**

| Syntax | Meaning | Example Use |
|--------|---------|-------------|
| `"all"` | Show in all chapters (default) | demo, summary |
| `{ "max": 4 }` | Show if chapter <= 4 | intro, scenario (early) |
| `{ "min": 10 }` | Show if chapter >= 10 | outro (late) |
| `{ "min": 5, "max": 15 }` | Show if 5 <= chapter <= 15 | middle sections |

**Evaluation logic:**
```typescript
function shouldShowTemplate(template: CommonName, currentChapter: number): boolean {
  const filter = template.chapterFilter ?? 'all'
  if (filter === 'all') return true

  const { min, max } = filter
  if (min !== undefined && currentChapter < min) return false
  if (max !== undefined && currentChapter > max) return false
  return true
}
```

### Part 2: Config UI for Editing

Extend the Common Names section in Config page (FR-116 foundation) with filter editing:

```
┌─────────────────────────────────────────────────────────────────────┐
│ Common Names                                                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ intro        │ Chapters: [Early (1-4) ▼]        │ [×]      │   │
│  │ scenario     │ Chapters: [Early (1-4) ▼]        │ [×]      │   │
│  │ demo         │ Chapters: [All ▼]                │ [×]      │   │
│  │ review       │ Chapters: [Custom ▼] 5 to 15     │ [×]      │   │
│  │ summary      │ Chapters: [All ▼]                │ [×]      │   │
│  │ outro        │ Chapters: [Late (10+) ▼]         │ [×]      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  [+ Add name]                                                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Dropdown presets:**
- All (default)
- Early (1-4)
- Late (10+)
- Custom (shows min/max inputs)

**Custom range inputs:**
- Two small number inputs: "from ___  to ___"
- Either can be blank (open-ended range)

---

## Acceptance Criteria

### Part 1: Filtering Logic
- [x] Templates filtered by current chapter selection in naming controls
- [x] `chapterFilter` property added to CommonName type
- [x] Support for `"all"`, `{ max }`, `{ min }`, `{ min, max }` filters
- [x] Default to "all" when property not specified
- [x] Filtering works on Incoming page template buttons

### Part 2: Config UI
- [x] Common Names rows show chapter filter dropdown
- [x] Preset options: All, Early (1-4), Late (10+), Custom
- [x] Custom shows min/max number inputs
- [x] Changes persist on Save (auto-save)
- [x] New names default to "All"
- [x] ▲/▼ reorder buttons (bonus feature)

---

## Technical Notes

### What's Already In Place

The foundation is solid - here's what exists:

| Component | Location | What's There |
|-----------|----------|--------------|
| CommonName type | `shared/types.ts` | `{ name, autoSequence?, suggestTags? }` - extend with `chapterFilter` |
| Pill buttons | `NamingControls.tsx` | Maps over `commonNames`, shows all - add filter before map |
| Config UI | `ConfigPanel.tsx` | Common Names section with add/remove pills - extend to rows with dropdowns |
| Current chapter | `App.tsx` → `NamingControls` | `namingState.chapter` already passed as prop |
| Auto-save | `ConfigPanel.tsx` | Common names add/remove already auto-saves (FR-118) |

### Type Changes

```typescript
// shared/types.ts
interface ChapterFilter {
  min?: number  // Show if chapter >= min
  max?: number  // Show if chapter <= max
}

interface CommonName {
  name: string
  autoSequence?: boolean
  suggestTags?: string[]
  chapterFilter?: 'all' | ChapterFilter  // NEW
}
```

### Implementation Order

**Part 1 (filtering logic) can be done independently:**
1. Add `ChapterFilter` type to `shared/types.ts`
2. Add `shouldShowTemplate()` function to filter by current chapter
3. Filter `commonNames` in `NamingControls.tsx` before rendering pills

**Part 2 (Config UI) builds on Part 1:**
1. Refactor Common Names section from pills to rows
2. Add dropdown with presets (All, Early, Late, Custom)
3. Add min/max inputs for Custom option
4. Auto-save on change (pattern already exists from FR-118)

### Files to Modify

| File | Changes |
|------|---------|
| `shared/types.ts` | Add `ChapterFilter` type, extend `CommonName` |
| `client/src/components/NamingControls.tsx` | Filter template buttons by current chapter |
| `client/src/components/ConfigPanel.tsx` | Add filter dropdown/inputs to Common Names rows |
| `server/src/index.ts` | Handle chapterFilter in config save |

### Migration

Existing configs without `chapterFilter` continue to work (defaults to "all").

### Ordering

Array position in config determines display order (existing behavior). Explicit ordering field deferred unless requested.

---

## Future Considerations

- Drag-to-reorder common names
- `autoSequence` toggle in Config UI
- `suggestTags` editing in Config UI
- Keyboard shortcuts for common names

---

## Completion Notes

**What was done:**

### Part 1: Filtering Logic
- Added `ChapterFilter` interface to `shared/types.ts`
- Extended `CommonName` with `chapterFilter?: 'all' | ChapterFilter`
- Added `shouldShowTemplate()` function in `NamingControls.tsx`
- Template pills filtered by current chapter value

### Part 2: Config UI
- Refactored Common Names from pills to rows
- Each row shows: ▲/▼ reorder, name, dropdown, custom inputs (if needed), delete button
- ▲/▼ buttons to reorder (order = display order on Incoming page)
- Dropdown presets: All chapters, Early (1-4), Late (10+), Custom
- Custom shows min/max number inputs
- All changes auto-save immediately

**Files changed:**
- `shared/types.ts` - Added ChapterFilter type, extended CommonName
- `client/src/components/NamingControls.tsx` - Added filter function, useMemo for filtered list
- `client/src/components/ConfigPanel.tsx` - Refactored CommonName state to full objects, new row-based UI

**Testing notes:**
1. Go to Config → Common Names
2. Change dropdown to "Early (1-4)" for intro → verify saves automatically
3. Go to Incoming page, set chapter to 10 → verify "intro" pill doesn't show
4. Set chapter to 2 → verify "intro" pill shows
5. Add new common name → defaults to "All chapters"
6. Select "Custom", enter min=5 max=15 → verify filtering works
7. Click ▲/▼ to reorder → verify order persists and matches Incoming page pill order

**Status:** Complete (2026-01-02)
