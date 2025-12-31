# FR-116: Incoming Page - Quick Config Access

**Added:** 2025-12-30
**Status:** Pending
**Scope:** Small (navigation + autofocus)

---

## User Story

As a video creator, I want to quickly add a new common name to my config when I realize I'm using a new recording pattern, without losing my context or having to hunt for the setting.

---

## Problem

When working on the Incoming page, users sometimes realize they need a new common name (e.g., "demo", "review", "qa"). Currently they must:

1. Click Config tab
2. Scroll/search for "Common Names" section
3. Find the input field
4. Type the new name

The context switch disrupts workflow and the config page has many fields to scan.

---

## Solution

Add a subtle config shortcut button near the common name pills on the Incoming page that navigates to Config and auto-focuses the common names input.

---

## UI Mockup

### Incoming Page - Common Names Section
```
┌─────────────────────────────────────────────────────────────────────┐
│  Common Names:                                                      │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐             │
│  │ intro│ │ demo │ │ setup│ │ outro│ │ cta  │ │ hook │  ⚙ [+]     │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘             │
└─────────────────────────────────────────────────────────────────────┘
                                                       ↑
                                            Small config shortcut
```

### Button Appearance
- Small cog icon with plus: `⚙+` or just `+`
- Muted color (gray-400) to not distract from main workflow
- Tooltip: "Add common name"
- Size: Same as pill buttons or slightly smaller

---

## Behavior

1. User clicks the config shortcut button
2. App navigates to Config tab
3. Config page scrolls to "Common Names" section (if needed)
4. Input field receives focus automatically
5. User types new name, presses Enter or clicks Add
6. User can navigate back to Incoming

---

## Technical Notes

### Navigation with Focus
- Use URL hash or query param: `/config#common-names` or `/config?focus=commonNames`
- Config page reads hash/param on mount and focuses appropriate field

### Config Page Changes
- Add `id="common-names"` to section for scroll targeting
- Add `ref` to common names input field
- On mount, check for focus param and trigger `inputRef.current?.focus()`

### Incoming Page Changes
- Add button next to common name pills
- Button triggers navigation with focus param

### Implementation Options

**Option A: URL Hash (simpler)**
```typescript
// In Incoming page
<button onClick={() => navigate('/config#common-names')}>
  <CogIcon />
</button>

// In Config page
useEffect(() => {
  if (location.hash === '#common-names') {
    commonNamesRef.current?.scrollIntoView();
    commonNamesInputRef.current?.focus();
  }
}, []);
```

**Option B: App State (cleaner)**
```typescript
// App-level state
const [configFocus, setConfigFocus] = useState<string | null>(null);

// In Incoming page
setConfigFocus('commonNames');
navigate('/config');

// In Config page
useEffect(() => {
  if (configFocus === 'commonNames') {
    commonNamesInputRef.current?.focus();
    setConfigFocus(null);
  }
}, [configFocus]);
```

---

## Acceptance Criteria

- [ ] Small config button visible near common name pills
- [ ] Clicking button navigates to Config tab
- [ ] Common names input field receives focus automatically
- [ ] Button has tooltip explaining its purpose
- [ ] Button styling is subtle/non-intrusive

---

## Edge Cases

- If config is already open, still scroll to and focus the field
- Works even if common names section is collapsed (expand it first)

---

## Completion Notes

_To be filled in by developer after implementation._
