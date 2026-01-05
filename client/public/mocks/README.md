# FliHub Design Mocks

This directory contains HTML mockups for exploring different design directions for FliHub's user interface.

## Purpose

The current FliHub application has UI inconsistencies across different pages:
- Chapter navigation appears differently on each page
- Sidebar/drawer patterns are inconsistent
- Tool access varies
- Layout patterns differ

These mocks allow us to:
1. **Explore** different unified design systems
2. **Compare** alternative approaches side-by-side
3. **Test** consistency patterns before implementation
4. **Communicate** design decisions with stakeholders

## Structure

```
mocks/
├── README.md (this file)
├── design-1/          # First design exploration
│   ├── design-approach.md
│   ├── manage.html
│   ├── incoming.html
│   ├── recordings.html
│   ├── watch.html
│   └── projects.html
├── design-2/          # Future alternative approach
└── design-3/          # Another alternative
```

## Design Folders

Each design folder contains:
- **design-approach.md** - Philosophy, principles, and design decisions
- **HTML mockups** - Standalone pages demonstrating the design system

All HTML files are standalone (embedded CSS/JS) for easy viewing in a browser.

## Design-1: Unified Content-Centric System

**Philosophy:** "Content in the center, tools in the margins"

**Key Features:**
- Tri-column layout (tools left, content center, context right)
- Fixed chapter navigation on the right (280px)
- Consistent tool access via left sidebar (220px) + drawers (400px)
- Unified visual language across all pages

**Files:**
- `manage.html` - Tools sidebar + file management + chapter nav
- `incoming.html` - Naming template + incoming queue + chapter context
- `recordings.html` - File list + playback + chapter navigation
- `watch.html` - Video player + transcript + segments panel
- `projects.html` - Projects table with tooltips

**To view:** Open any HTML file in your browser

## Creating New Designs

To create a new design exploration (e.g., design-2):

1. Create a new folder: `mocks/design-2/`
2. Copy the structure from design-1
3. Write `design-approach.md` explaining your concept
4. Create HTML mockups for each page type
5. Ensure all pages in the folder share consistent patterns

### Design Exploration Ideas

**Design-2 could explore:**
- Dark mode aesthetic
- Minimalist single-column layout
- Command palette-first interaction
- Mobile-first responsive design

**Design-3 could explore:**
- Maximalist data-dense layout
- Split-screen chapter comparison
- Timeline-based navigation
- Card-based layout instead of tables

## Evaluation Criteria

When comparing designs, consider:

1. **Consistency** - Do all pages feel like one app?
2. **Clarity** - Is the hierarchy clear? Can users find what they need?
3. **Efficiency** - Does the layout support common workflows?
4. **Scalability** - Will this work as features are added?
5. **Accessibility** - Is it keyboard-navigable? High contrast?
6. **Aesthetics** - Is it pleasant to look at for hours?

## Next Steps

1. Review design-1 mockups
2. Gather feedback from users
3. Create design-2 with alternative approach
4. Compare and decide on direction
5. Implement chosen design in React app

## Automation Idea

Consider building an agent that can:
1. Read `design-approach.md` template
2. Generate all HTML pages automatically
3. Ensure consistency across pages
4. Create variations quickly for rapid exploration

---

**Last updated:** 2026-01-05
