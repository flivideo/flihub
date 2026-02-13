# Design 4: Dense Dashboard

**Created:** 2026-01-05
**Aesthetic:** Maximalist, data-rich, multi-panel power user interface
**Status:** Exploration

---

## Design Philosophy

**Core Principle:** "Show everything, hide nothing"

This design embraces information density. Multiple panels, split views, visible stats everywhere. Built for power users who want to see the entire project state at a glance. No clicking through pages - everything is visible simultaneously.

---

## Key Design Decisions

### 1. **Multi-Panel Grid Layout**

Complex grid system showing multiple views simultaneously:

```
┌──────────────┬─────────────────────┬──────────────┐
│  Navigator   │   Main Content      │  Inspector   │
│  (250px)     │   (Flexible)        │  (300px)     │
│              │                     │              │
│  • Projects  │   ┌───────────────┐ │  Selected:   │
│  • Chapters  │   │   Video Grid  │ │  01-1-intro  │
│  • Files     │   │               │ │              │
│  • Tags      │   └───────────────┘ │  Duration:   │
│              │                     │  36s         │
│              │   ┌───────────────┐ │              │
│              │   │   Timeline    │ │  Size:       │
│              │   └───────────────┘ │  19.0 MB     │
│              │                     │              │
└──────────────┴─────────────────────┴──────────────┘
│            Bottom Panel (200px)                    │
│  Metadata · Transcript · Activity Log · Console   │
└────────────────────────────────────────────────────┘
```

**Why multi-panel:**

- See project, content, and details simultaneously
- No context switching between views
- Compare files side-by-side
- Monitor multiple data streams
- Professional editing suite feel

### 2. **Resizable & Dockable Panels**

Every panel is interactive:

**Features:**

- **Drag handles:** Resize any panel edge
- **Collapse:** Double-click divider to collapse
- **Undock:** Drag panel header to float
- **Snap:** Panels snap to edges and each other
- **Save layout:** Store panel configuration per project

**Panel types:**

- **Navigator:** Tree view of all content
- **Content:** Main work area (video, files, etc.)
- **Inspector:** Details of selected item
- **Timeline:** Temporal visualization
- **Console:** Activity log, errors, processing status
- **Stats:** Real-time project analytics

### 3. **Information Density**

Maximum data visible with minimal scrolling:

**Typography:**

- Small but readable: 11px base font
- Compact line height: 1.4
- Tabular numbers throughout
- Abbreviations where sensible (Ch, Seq, Trans, etc.)

**Layout techniques:**

- Tables with many columns
- Inline stats and badges
- Icon-only buttons (with tooltips)
- Collapsed sections expand in-place
- Hover reveals additional details

**Example - file row:**

```
[▶] 01-1 intro.mov  36s  19MB  03/01  100% ✓ 🔒 ⭐
```

Showing: Play, Ch-Seq, Name, Duration, Size, Date, Transcript%, Safe, Locked, Favorite

### 4. **Split-Screen Comparison**

Compare any two items side-by-side:

**Video comparison:**

```
┌────────────────┬────────────────┐
│  01-1-intro    │  01-2-intro    │
│  [Video]       │  [Video]       │
│  36s / 19MB    │  18s / 6.5MB   │
│  ────●─────    │  ──●───────    │
└────────────────┴────────────────┘
```

**Transcript comparison:**

```
┌────────────────┬────────────────┐
│  Version 1     │  Version 2     │
│  Original      │  Edited        │
│  ─────────     │  ─────────     │
│  [Text diff]   │  [Text diff]   │
└────────────────┴────────────────┘
```

**Chapter comparison:**

```
┌────────────────┬────────────────┐
│  Chapter 01    │  Chapter 02    │
│  5 files       │  8 files       │
│  2:18          │  7:51          │
│  94.7 MB       │  268.5 MB      │
└────────────────┴────────────────┘
```

### 5. **Timeline Visualization**

Visual timeline shows project structure:

**Horizontal timeline:**

```
|00:00      |02:18       |10:10         |15:07|15:36|17:00 |18:13
├───────────┼────────────┼──────────────┼────┼────┼─────┼────┤
│ 01 Intro  │ 02 Overv.  │ 03 Generate  │ 04 │ 05 │ 06  │ 07 │
│ ▇▇▇▇▇     │ ▇▇▇▇▇▇▇▇   │ ▇▇▇          │ ▇  │▇▇▇ │ ▇▇  │ ▇  │
│ 5 files   │ 8 files    │ 3 files      │ 1f │ 3f │ 4f  │ 2f │
```

**Vertical timeline (activity log):**

```
2026-01-05 14:32  Transcribed 01-5-intro.mov
2026-01-05 14:30  Renamed 5 files to "intro"
2026-01-05 14:28  Imported 01-1 through 01-5
2026-01-05 14:15  Created chapter 01
```

**Waveform timeline:**

```
Amplitude visualization for audio scrubbing
```

### 6. **Real-Time Stats Panels**

Live dashboard showing project health:

**Project Stats Card:**

```
┌─────────────────────────┐
│  PROJECT OVERVIEW       │
├─────────────────────────┤
│  Chapters:          7   │
│  Files:            26   │
│  Duration:      18:35   │
│  Size:        743.5 MB  │
│  Transcribed:     100%  │
│  Safe:              0   │
│  Parked:            0   │
│  Last mod:      2 hrs   │
└─────────────────────────┘
```

**Processing Queue:**

```
┌─────────────────────────┐
│  ACTIVE TASKS           │
├─────────────────────────┤
│  Transcribing...    45% │
│  ██████░░░░░░           │
│  01-5-intro.mov         │
│  ETA: 3min              │
└─────────────────────────┘
```

**Storage Usage:**

```
┌─────────────────────────┐
│  STORAGE                │
├─────────────────────────┤
│  Recordings:   743.5 MB │
│  Transcripts:    2.3 MB │
│  Shadows:       22.6 MB │
│  Assets:        15.8 MB │
│  ─────────────────────  │
│  Total:        784.2 MB │
└─────────────────────────┘
```

### 7. **Data Tables with Sorting & Filtering**

Advanced table controls:

**Features:**

- Click column header to sort
- Multi-column sort (Shift+Click)
- Filter row above headers
- Column show/hide toggle
- Export to CSV
- Inline editing (double-click cell)

**Table with all features:**

```
┌─[Filter: _______________]─────────────────┐
│ ▼Ch  ▼Seq  ▼Name        ▼Dur  ▼Size  ▼%  │
├───────────────────────────────────────────┤
│  01    1   intro         36s   19MB  100  │
│  01    2   intro         18s    7MB  100  │
│  02    1   overview      56s   36MB  100  │
│  ...                                      │
└───────────────────────────────────────────┘
```

---

## Page-Specific Implementations

### Manage Page

**Layout:** 4-panel grid

- Left: File tree navigator
- Center: File grid/table with bulk actions
- Right: Inspector with selected file details
- Bottom: Activity log and processing queue

### Incoming Page

**Layout:** Split view

- Top: Live preview of watch directory
- Bottom-left: Naming form
- Bottom-right: Recently imported files

### Recordings Page

**Layout:** Triple pane

- Left: Chapter list with stats
- Center: Video grid with thumbnails
- Right: Timeline visualization + player

### Watch Page

**Layout:** Video + panels

- Main: Large video player
- Right: Tabbed panel (Transcript, Chapters, Segments)
- Bottom: Timeline with waveform

### Projects Page

**Layout:** Table + details

- Main: Projects table (sortable, filterable)
- Right: Selected project breakdown
- Bottom: Project activity timeline

---

## Visual Design Language

**Colors:**

- Background: #fafafa (light gray)
- Panels: #ffffff (white)
- Borders: #d0d0d0 (visible dividers)
- Headers: #f0f0f0 (subtle gray)
- Accent: #2563eb (blue)
- Success: #059669 (green)
- Warning: #f59e0b (orange)

**Typography:**

- Sans: "Roboto" (Google's data-dense font)
- Mono: "Roboto Mono"
- Size: 11px base (compact)
- Weight: 400, 500, 700

**Spacing:**

- Panel padding: 12px
- Row height: 28px (compact)
- Section gaps: 16px
- Icon size: 14px

**Borders & Shadows:**

- Panel borders: 1px solid #d0d0d0
- Dividers: 1px solid #e0e0e0
- Subtle shadows on floating panels
- No border radius (0px, sharp edges)

---

## Advanced Features

### 1. **Saved Views**

Create custom layouts:

- "Editing Mode" - Video player + transcript
- "Organization Mode" - File tree + table
- "Review Mode" - Side-by-side comparison
- "Stats Mode" - All analytics panels

### 2. **Batch Operations Dashboard**

Dedicated panel for bulk actions:

```
┌──────────────────────────────┐
│  BATCH OPERATIONS            │
├──────────────────────────────┤
│  ☑ 5 files selected          │
│                              │
│  [▶] Rename all to...        │
│  [▶] Regenerate transcripts  │
│  [▶] Move to -safe/          │
│  [▶] Export to S3            │
│  [▶] Delete files            │
└──────────────────────────────┘
```

### 3. **Smart Filters**

Complex query builder:

```
Chapter = 01 AND Duration > 30s
OR
Name CONTAINS "intro" AND Size < 20MB
```

### 4. **Heatmaps**

Visual density indicators:

- File size heatmap by chapter
- Duration distribution graph
- Transcript completion matrix
- Recording frequency calendar

### 5. **Minimap**

Page overview for quick navigation:

```
┌──────┐
│▓▓▓▓▓▓│ ← Viewport
│░░░░░░│
│░░░░░░│ ← Scrollable content
│░░░░░░│
└──────┘
```

---

## Solving Inconsistencies

| Inconsistency             | Design-4 Solution                                |
| ------------------------- | ------------------------------------------------ |
| Chapter navigation varies | Unified navigator panel on left, always visible  |
| Sidebar patterns differ   | All panels follow same resizable pattern         |
| Tool access unclear       | Dedicated tools panel, always accessible         |
| Layout shifts             | Grid-based layout, panels resize but don't shift |
| Interactive feedback      | Dense hover states, inline editing everywhere    |

---

## Technical Implementation

**CSS Grid:**

```css
.dashboard {
  display: grid;
  grid-template-columns: 250px 1fr 300px;
  grid-template-rows: 1fr 200px;
  gap: 1px;
  height: 100vh;
}
```

**Panel resizing:**

```javascript
// Draggable dividers
const divider = document.querySelector('.divider');
divider.addEventListener('mousedown', startResize);
```

**Data virtualization:**

- Only render visible rows (1000+ file support)
- Lazy load thumbnails
- Paginate activity logs

**Performance:**

- Web workers for heavy computations
- Debounced filter updates
- Cached sort results

---

## Design Goals Checklist

- ✅ **Comprehensive:** All data visible at once
- ✅ **Efficient:** Bulk operations built-in
- ✅ **Flexible:** Customizable panel layouts
- ✅ **Powerful:** Advanced filtering and sorting
- ✅ **Professional:** Matches industry editing suites
- ✅ **Scalable:** Handles large projects (100+ files)

---

## Comparison to Other Designs

| Aspect         | Design-1    | Design-2    | Design-3   | Design-4        |
| -------------- | ----------- | ----------- | ---------- | --------------- |
| Complexity     | Medium      | High        | Low        | Very High       |
| Info density   | Medium      | Low         | Very Low   | Maximum         |
| Panels         | 3 fixed     | Floating    | 1          | 4-6 resizable   |
| Best for       | General use | Video focus | Speed      | Power users     |
| Learning curve | Easy        | Medium      | Hard (kbd) | Hard (features) |

---

## Inspiration

- Adobe Premiere Pro (video editing)
- Blender (3D modeling panels)
- Visual Studio (IDE panels)
- Jira (project dashboards)
- Bloomberg Terminal (data density)

---

## User Types

**Best for:**

- Power users managing 100+ file projects
- Users who want overview at a glance
- Multi-monitor setups
- Batch operations and analysis
- Professional video producers

**Not ideal for:**

- Beginners (overwhelming)
- Small projects (overkill)
- Mobile devices (too complex)
- Simple workflows (too much UI)

---

## Future Considerations

1. **Workspace templates:** Pre-configured panel layouts
2. **Plugin system:** Custom panels for specific workflows
3. **Collaborative cursors:** See teammate panel focus
4. **AI insights panel:** Automated suggestions
5. **Export layouts:** Share panel configurations

---

**Next Steps:**

- Build resizable panel prototype
- Test with large datasets (100+ files)
- Create panel configuration system
- Gather feedback from power users
- Measure performance with full data
