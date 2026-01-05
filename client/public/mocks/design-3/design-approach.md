# Design 3: Command Palette Minimal

**Created:** 2026-01-05
**Aesthetic:** Keyboard-first, ultra-minimal, command-driven
**Status:** Exploration

---

## Design Philosophy

**Core Principle:** "Hide everything, surface on command"

This design embraces radical minimalism. No permanent sidebars, no visible chrome, no clutter. Everything is accessed through keyboard shortcuts and a powerful command palette (CMD+K). The interface disappears until you need it, leaving maximum space for content.

---

## Key Design Decisions

### 1. **Single-Column Layout**

Abandon the multi-sidebar approach entirely:

```
┌─────────────────────────────────────────┐
│  [Minimal header - 50px]                │
├─────────────────────────────────────────┤
│                                         │
│                                         │
│         CONTENT (100% width)            │
│         Max 900px, centered             │
│                                         │
│                                         │
└─────────────────────────────────────────┘
```

**Why single-column:**
- Maximum content focus
- No horizontal scrolling ever
- Simpler responsive design
- Faster page loads
- Better for keyboards users

### 2. **Command Palette (CMD+K)**

The core interaction pattern:

**Trigger:** CMD+K (Mac) / CTRL+K (Windows)
**Appearance:** Center screen, modal overlay
**Search:** Fuzzy search across all actions, files, chapters
**Categories:** Actions, Files, Navigation, Tools, Settings

**Command examples:**
```
> rename                  → Open rename tool
> goto chapter 3          → Jump to chapter 3
> safe all chapter 1      → Safe all files in chapter 1
> play 02-1-overview      → Play specific file
> export selected         → Export selected files
> dark mode               → Toggle theme
```

**Why command palette:**
- Keyboard users are 3x faster
- No need to remember UI locations
- Search replaces navigation
- Works same on every page
- Easy to add new features

### 3. **Minimal Visual Hierarchy**

Extreme reduction of visual elements:

**Typography:**
- Single font family: "Berkeley Mono" (beautiful mono for everything)
- Three sizes only: 12px, 14px, 18px
- Two weights only: 400 (regular), 600 (semibold)
- Line height: 1.6 (generous for readability)

**Colors:**
- Background: #ffffff (pure white)
- Text primary: #000000 (pure black)
- Text secondary: #666666 (medium gray)
- Accent: #0000ff (pure blue, no gradients)
- Border: #e0e0e0 (subtle gray)

**No:**
- No gradients
- No shadows
- No rounded corners (sharp 0px)
- No icons (text labels only)
- No illustrations

### 4. **Keyboard-First Interactions**

Every action has a keyboard shortcut:

**Global:**
- `CMD+K` - Command palette
- `CMD+P` - Quick file search
- `CMD+Shift+P` - Quick action
- `ESC` - Close any overlay

**Navigation:**
- `1-9` - Jump to page (1=Incoming, 2=Recordings, etc.)
- `CMD+[` / `CMD+]` - Previous/Next page
- `J` / `K` - Down/Up in lists
- `Space` - Select item

**Playback:**
- `Space` - Play/Pause
- `←` / `→` - Seek backward/forward
- `Shift+←` / `Shift+→` - Previous/Next file
- `1-9` - Jump to chapter 1-9

**Tools:**
- `R` - Rename selected
- `E` - Export selected
- `S` - Safe selected
- `P` - Park selected
- `T` - Regenerate transcripts

**Shortcuts shown:**
- Bottom right corner: Active shortcut hints
- Hover tooltips: Show shortcut in gray
- Command palette: Shows shortcut next to each command

### 5. **Content-First Page Structure**

Every page follows identical pattern:

```
┌─────────────────────────────────────────┐
│  Page Title         [CMD+K to search]   │
├─────────────────────────────────────────┤
│                                         │
│  Content Block 1                        │
│                                         │
│  Content Block 2                        │
│                                         │
│  Content Block 3                        │
│                                         │
└─────────────────────────────────────────┘
```

**No persistent sidebars ever**
**No tabs** (use CMD+K to switch)
**No breadcrumbs** (current page in title)
**No navigation menu** (keyboard shortcuts only)

### 6. **Inline Actions**

Actions appear contextually:

**On hover:** Text links appear inline
**On select:** Action bar slides up from bottom
**On right-click:** Context menu (keyboard navigable)

**Example - file list:**
```
01-1-intro.mov                    19.0 MB
  [on hover] → play · safe · park · rename
```

**Selected files:**
```
┌─────────────────────────────────────────┐
│  5 files selected (94.7 MB)            │
│  [Rename] [Export] [Safe] [Park] [Del] │
└─────────────────────────────────────────┘
```

### 7. **Modal Everything**

No drawers, no slide-outs - centered modals:

**Rename modal:**
```
┌──────────────────────┐
│  Rename 5 files      │
├──────────────────────┤
│  New name:           │
│  [intro________]     │
│                      │
│  [Cancel] [Rename]   │
└──────────────────────┘
```

**Why modals:**
- Focused interaction
- No layout shift
- Easy to dismiss (ESC)
- Keyboard navigable
- Consistent pattern

---

## Page-Specific Implementations

### Manage Page
- **Title:** "Manage & Export"
- **Content:** Single-column file list, grouped by chapter
- **Selection:** Checkboxes on left, action bar on select
- **No tools sidebar:** Use CMD+K instead

### Incoming Page
- **Title:** "Incoming Files"
- **Content:** Naming form (collapsed by default)
- **Queue:** List of pending files below
- **Expand form:** Click or press N key

### Recordings Page
- **Title:** "Recordings"
- **Content:** Flat file list (no chapter groups)
- **Playback:** Click filename or press Space
- **Filters:** CMD+F for filter modal

### Watch Page
- **Title:** Hidden (full-screen video)
- **Content:** Video player only
- **Controls:** Overlay on hover or mouse move
- **Timeline:** Minimal scrubber, bottom of video

### Projects Page
- **Title:** "Projects"
- **Content:** Simple table (project, stage, files, %)
- **No thumbnails:** Text-only, faster loading
- **Quick switch:** CMD+number to open project

---

## Visual Design Language

**Spacing:**
- Base unit: 8px
- Section gaps: 32px
- Content padding: 24px
- Line spacing: 8px between items

**Borders:**
- All borders: 1px solid #e0e0e0
- No border radius: 0px everywhere
- No shadows: flat design

**Buttons:**
```
[Button Text]
Background: transparent
Border: 1px solid #000
Padding: 8px 16px
Hover: Background #000, Color #fff
```

**Links:**
```
Underline only on hover
Color: #0000ff (pure blue)
Weight: 600
```

**Tables:**
```
Header: Bold, border-bottom only
Rows: 1px border between
Hover: Background #f5f5f5
```

---

## Command Palette Design

**Appearance:**
```
┌────────────────────────────────────┐
│  ▸ search query...                 │
├────────────────────────────────────┤
│  ACTIONS                           │
│  › Rename selected files      ⌘R   │
│  › Export selected files      ⌘E   │
│                                    │
│  FILES                             │
│  › 01-1-intro.mov                  │
│  › 02-1-overview.mov               │
│                                    │
│  NAVIGATION                        │
│  › Go to Recordings           2    │
│  › Go to Chapter 3            #3   │
└────────────────────────────────────┘
```

**Search algorithm:**
- Fuzzy matching (fzf-style)
- Results ranked by relevance
- Recent actions ranked higher
- File names searchable by chapter-seq-name
- Chapter names searchable

**Categories shown:**
1. Actions (tools, operations)
2. Files (recordings, videos)
3. Navigation (pages, chapters)
4. Settings (preferences, config)

---

## Solving Inconsistencies

| Inconsistency | Design-3 Solution |
|--------------|-------------------|
| Chapter navigation varies | No chapter nav UI - use CMD+K "goto chapter 3" |
| Sidebar patterns differ | No sidebars - command palette only |
| Tool access unclear | CMD+K → search for any tool by name |
| Layout shifts | Single column, nothing shifts ever |
| Interactive feedback | Minimal hover states, keyboard focus rings |

---

## Technical Implementation

**CSS Variables:**
```css
--bg: #ffffff;
--text: #000000;
--text-secondary: #666666;
--accent: #0000ff;
--border: #e0e0e0;
--hover-bg: #f5f5f5;
--spacing-unit: 8px;
--font-family: 'Berkeley Mono', monospace;
--font-size-sm: 12px;
--font-size-base: 14px;
--font-size-lg: 18px;
```

**Keyboard handler:**
```javascript
// Global shortcut listener
document.addEventListener('keydown', (e) => {
  if (e.metaKey && e.key === 'k') {
    openCommandPalette();
  }
  // ... more shortcuts
});
```

**Performance:**
- No animations (instant state changes)
- No images (text-only UI)
- Minimal JavaScript
- Fast keyboard response (<16ms)

---

## Design Goals Checklist

- ✅ **Minimal:** Zero visual clutter
- ✅ **Fast:** Keyboard shortcuts for everything
- ✅ **Focused:** Content takes 100% of space
- ✅ **Accessible:** Keyboard-first by design
- ✅ **Scalable:** Easy to add new commands
- ✅ **Consistent:** Same pattern every page

---

## Comparison to Design-1 & Design-2

| Aspect | Design-1 | Design-2 | Design-3 |
|--------|----------|----------|----------|
| Layout | Tri-column | Floating panels | Single column |
| Navigation | Tabs + sidebars | Timeline | Command palette |
| Aesthetic | Professional | Cinematic | Brutalist minimal |
| Input | Mouse-primary | Balanced | Keyboard-only |
| Visual | Polished | Dramatic | Stark |
| Complexity | Medium | High | Low |

---

## Inspiration

- Linear app (command palette)
- Superhuman email (keyboard shortcuts)
- Terminal UIs (text-only interfaces)
- Notion (slash commands)
- VS Code (CMD+P quick open)

---

## User Types

**Best for:**
- Power users who live in keyboard
- Developers comfortable with CLI
- Users who hate clutter
- Fast-paced workflows
- Screen reader users

**Not ideal for:**
- Mouse-only users
- Beginners learning the tool
- Users who prefer visual menus
- Touch-screen interfaces

---

## Future Considerations

1. **Vim mode:** hjkl navigation everywhere
2. **Custom shortcuts:** User-defined key bindings
3. **Command chaining:** "safe all then export"
4. **Macro recording:** Record command sequences
5. **Voice commands:** Speak instead of type

---

**Next Steps:**
- Build working command palette prototype
- Create keyboard shortcut reference card
- Test with keyboard-only workflow
- Gather feedback from CLI enthusiasts
- Measure speed vs mouse-based designs
