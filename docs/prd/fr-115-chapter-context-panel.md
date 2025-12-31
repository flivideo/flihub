# FR-115: Incoming Page - Chapter Context Panel

**Added:** 2025-12-30
**Status:** Implemented
**Scope:** Medium (new component, needs chapter data on Incoming)

---

## User Story

As a video creator working on the Incoming page, I want to see my current chapter structure at a glance so I know where I am in the recording flow and can quickly reuse chapter names for consistency.

---

## Problem

When naming incoming recordings on the Incoming page, users must:
1. Remember what chapters they've already recorded
2. Switch to Recordings tab to see chapter names
3. Mentally track "where am I in this video?"

This context-switching slows down the naming workflow and increases risk of naming inconsistencies.

---

## Solution

Add a sticky chapter context panel on the right side of the Incoming page showing a simplified view of existing chapters with quick-copy functionality.

---

## UI Mockup

```
┌─────────────────────────────────────────────┬──────────────────────┐
│                                             │   CHAPTERS           │
│   Incoming Files                            │   ──────────         │
│   ─────────────                             │                      │
│                                             │   01 intro      [📋] │
│   ┌─────────────────────────────┐           │   02 setup      [📋] │
│   │ Movie-2025-12-30.mov        │           │   03 demo       [📋] │
│   │ 2:34 | 245 MB               │           │   04 features   [📋] │
│   │ [Rename Controls...]        │           │   05 outro      [📋] │
│   └─────────────────────────────┘           │                      │
│                                             │   ─────────          │
│   ┌─────────────────────────────┐           │   Next: 06           │
│   │ Movie-2025-12-30-2.mov      │           │                      │
│   └─────────────────────────────┘           │                      │
│                                             │                      │
└─────────────────────────────────────────────┴──────────────────────┘
```

---

## Features

### Chapter List
- Shows all existing chapters (derived from recordings)
- Format: `{chapter} {name}` (e.g., "01 intro")
- Sorted by chapter number ascending
- Simplified view (no durations, no file counts)

### Copy Button
- Small clipboard icon next to each chapter name
- Copies just the name portion (e.g., "intro")
- Toast: "Copied: intro"
- Use case: Quick paste into name input for consistency

### "Next Chapter" Indicator
- Shows what the next chapter number would be
- Helps user know where they are in sequence
- Updates dynamically as new files are renamed

### Sticky Positioning
- Panel stays visible as user scrolls through incoming files
- Does not scroll with content

---

## Technical Notes

### Data Source
- Reuse existing chapter grouping logic from RecordingsView
- Need to fetch recordings data on Incoming page (currently only fetched on Recordings tab)
- Consider: lightweight endpoint returning just chapter summary

### New Endpoint Option
```
GET /api/query/projects/:code/chapters/summary
Response: {
  chapters: [
    { number: "01", name: "intro" },
    { number: "02", name: "setup" }
  ],
  nextChapter: "06"
}
```

### Client Changes
- New component: `ChapterContextPanel.tsx`
- `IncomingView.tsx` - Add panel to right side
- Layout: Flexbox with sticky positioning

### Panel Width
- Fixed width: ~200px (w-52)
- Collapsible on smaller screens (optional future enhancement)

---

## Acceptance Criteria

- [ ] Chapter panel visible on right side of Incoming page
- [ ] Shows all existing chapters with names
- [ ] Copy button copies name to clipboard
- [ ] "Next" indicator shows next chapter number
- [ ] Panel remains visible when scrolling
- [ ] Updates in real-time when new recordings are renamed
- [ ] Does not show when project has no recordings yet

---

## Edge Cases

1. **No recordings yet** - Panel shows "No chapters yet. Start recording!"
2. **Gaps in chapter numbers** - Show actual chapters, next = max + 1
3. **Many chapters (20+)** - Panel scrolls internally if needed

---

## Future Considerations

- Click chapter name to pre-fill naming template (not just copy)
- Expand/collapse toggle for panel
- Show chapter recording counts (subtle)

---

## Completion Notes

**Implemented:** 2025-12-31

**What was built:**
- New component: `client/src/components/ChapterContextPanel.tsx`
- Fixed position panel on right side of Incoming page
- Shows chapters derived from recordings with copy buttons
- "Next" chapter indicator at bottom
- Hides when no recordings exist

**Files created:**
- `client/src/components/ChapterContextPanel.tsx`

**Files modified:**
- `client/src/App.tsx` - Import and render panel on Incoming tab

**Implementation details:**
- Uses `extractTagsFromName` from shared/naming for clean chapter names
- Prefers sequence 1 file's name for each chapter
- Copy uses clipboard API with toast feedback
- Panel positioned at `left-[calc(50%+29rem)]` to sit outside the centered content area
- Max height with internal scroll for many chapters
