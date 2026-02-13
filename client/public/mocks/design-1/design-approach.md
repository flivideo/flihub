# Design 1: Unified Content-Centric System

**Created:** 2026-01-05
**Aesthetic:** Clean, professional, content-first with cinematic touches
**Status:** Exploration

---

## Design Philosophy

**Core Principle:** "Content in the center, tools in the margins"

This design system addresses FliHub's current UI inconsistencies by establishing a unified pattern where all pages share:

- Fixed navigation patterns
- Consistent chapter/segment presentation
- Predictable tool access
- Cohesive visual language

---

## Key Design Decisions

### 1. **Tri-Column Layout Pattern**

Every page follows this structure:

```
┌─────────────────────────────────────────────────────────────┐
│  HEADER (Fixed, 80px)                                       │
├──────────┬─────────────────────────────────┬────────────────┤
│          │                                 │                │
│  TOOLS   │        CONTENT AREA             │   CHAPTERS/    │
│  LEFT    │        (Max 1200px, centered)   │   CONTEXT      │
│  220px   │                                 │   RIGHT 280px  │
│  Fixed   │                                 │   Fixed        │
│          │                                 │                │
└──────────┴─────────────────────────────────┴────────────────┘
```

**Why this works:**

- Content stays centered and focused (1200px max-width)
- Tools are always accessible in left margin
- Context (chapters, segments, meta) lives consistently on the right
- Sidebars are truly outside the content flow - they don't push content around

### 2. **Chapter Navigation - Always Right**

**Inconsistency solved:** Chapters currently appear differently on each page

**Solution:** Fixed right sidebar (280px) with collapsible chapter list

- Manage page: Shows all chapters with file counts
- Incoming page: Shows existing chapters for context
- Recordings page: Shows chapters with timestamps, click to jump
- Watch page: Shows chapters with timestamps, current chapter highlighted
- Projects page: No chapter panel (not relevant)

**Pattern:**

```
CHAPTERS (7)
Total: 18:35

01  00:00  Intro
02  02:18  Overview ← current
03  10:10  Generate...
04  15:07  Steve Final
...
```

### 3. **Tool Access - Sidebar + Drawer Pattern**

**Inconsistency solved:** Tool access varies across pages

**Solution:**

- **Left sidebar (220px):** Category-based tool launcher
  - Simple Tools: One-click actions (Regen Shadows, etc.) → Toast notification
  - Complex Tools: Multi-step flows (Rename, Export) → Right drawer

- **Right drawer (400px):** Slides over the right chapter panel for complex tools
  - Rename Tool
  - Export Tool
  - Folder Management

**Why:** Keeps tools accessible without cluttering content, drawer overlays chapter panel since you can't use both simultaneously

### 4. **Visual Design Language**

**Typography:**

- Headers: DM Sans (700) - Professional, readable
- Body: DM Sans (400-600) - Consistent with headers
- Monospace: JetBrains Mono - For filenames, code, technical content

**Colors:**

- Background: #f8f9fa (Soft neutral)
- Content: #ffffff (Clean white)
- Borders: #e5e7eb, #d1d5db (Subtle grays)
- Primary: #2563eb (Professional blue)
- Accent: #059669 (Success green), #ea580c (Alert orange)

**Spacing:**

- Base unit: 4px
- Common gaps: 8px, 12px, 16px, 24px, 32px
- Section padding: 20px, 28px, 40px

**Shadows:**

- Subtle: 0 1px 2px rgba(0,0,0,0.05)
- Medium: 0 4px 6px rgba(0,0,0,0.1)
- Drawer: -4px 0 24px rgba(0,0,0,0.12)

### 5. **Interactive Patterns**

**Hover States:**

- Tools: Background → accent-blue-light, Text → accent-blue
- Files: Background → #fafbfc
- Buttons: Border → accent-blue, Lift with shadow

**Selection:**

- Selected files: Background → accent-blue-light (#dbeafe)
- Active tool: Background → accent-blue, Text → white

**Tooltips:**

- Position: Below element, centered
- Style: Dark background (#1f2937), white text, 8px border-radius
- Animation: Fade in 150ms, delay 300ms

**Loading States:**

- Simple tools: Toast with spinner (purple gradient)
- Complex operations: Inline progress bar or skeleton screens

---

## Page-Specific Implementations

### Manage Page

- **Left:** Tools sidebar (Simple: Regen, Complex: Rename/Export/Folders)
- **Center:** Chapter-grouped file list with selection
- **Right:** Chapter navigation (collapsed by default on this page)

### Incoming Page

- **Left:** No tools sidebar (full-width naming form)
- **Center:** Naming template + incoming files queue
- **Right:** Chapter navigation (shows what chapters exist)

### Recordings Page

- **Left:** No tools sidebar (filters/sort controls in content)
- **Center:** Flat file list with chapter groups
- **Right:** Chapter navigation with timestamps + playback controls

### Watch Page

- **Left:** Collapsed (just logo or minimal nav)
- **Center:** Video player + transcript
- **Right:** Chapter/segment navigation with current position

### Projects Page

- **Left:** No tools (full table width)
- **Center:** Projects table with stage/status columns
- **Right:** No chapter panel (not relevant)

---

## Solving Current Inconsistencies

| Inconsistency             | Current State                    | Design-1 Solution                                |
| ------------------------- | -------------------------------- | ------------------------------------------------ |
| Chapter navigation varies | Different on every page          | Fixed right panel (280px), consistent structure  |
| Sidebar patterns differ   | Sometimes left, sometimes none   | Left sidebar (220px) only on Manage page         |
| Tool access unclear       | Mixed in content vs panels       | Left sidebar = tools, right drawer = complex UIs |
| Layout shifts             | Content jumps when panels appear | Fixed margins, content always centered           |
| Interactive feedback      | Inconsistent tooltips/loading    | Standard toast, drawer, tooltip patterns         |

---

## Technical Implementation

**CSS Variables:**

```css
--sidebar-left-width: 220px;
--sidebar-right-width: 280px;
--drawer-width: 400px;
--content-max-width: 1200px;
--header-height: 80px;
```

**Responsive Breakpoints:**

- Desktop (1600px+): Full tri-column layout
- Tablet (1024px-1599px): Hide chapter panel, show on toggle
- Mobile (< 1024px): Stack layout, hamburger menus

**Animations:**

- Drawer slide: 300ms cubic-bezier(0.4, 0, 0.2, 1)
- Toast slide: 300ms ease-out
- Hover transitions: 150ms ease
- Loading spinners: 800ms linear infinite

---

## Design Goals Checklist

- ✅ **Consistency:** Same patterns across all pages
- ✅ **Predictability:** Users know where to find tools/chapters
- ✅ **Focus:** Content stays centered, distractions in margins
- ✅ **Accessibility:** Clear hierarchy, keyboard navigation, ARIA labels
- ✅ **Performance:** CSS-only animations, minimal JS
- ✅ **Scalability:** Patterns work for new pages/features

---

## Future Considerations

1. **Dark mode:** CSS variables make this trivial
2. **Customization:** Users could hide/resize panels
3. **Keyboard shortcuts:** J/K for navigation, CMD+K for command palette
4. **Multi-select gestures:** Shift-click ranges, CMD-A select all
5. **Drag & drop:** Files to folders, reorder chapters

---

**Next Steps:**

- Implement HTML mockups for each page
- Test with real content and data
- Gather user feedback on consistency improvements
- Consider design-2 exploration with different aesthetic (dark, minimal, etc.)
