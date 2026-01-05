# Design 2: Dark Cinematic

**Created:** 2026-01-05
**Aesthetic:** Dark, immersive, video-first with cinematic feel
**Status:** Exploration

---

## Design Philosophy

**Core Principle:** "The video is the hero"

This design system transforms FliHub from a file management tool into an immersive video workspace. Dark backgrounds reduce eye strain during long editing sessions, while vibrant accent colors draw attention to key actions. The interface recedes, letting content shine.

---

## Key Design Decisions

### 1. **Dark Theme Foundation**

Complete inversion of design-1's light aesthetic:

```
Background hierarchy:
- App background: #0a0a0a (near black)
- Panels: #1a1a1a (dark gray)
- Cards/surfaces: #242424 (medium dark)
- Elevated elements: #2a2a2a (lighter dark)
```

**Why dark works for video:**
- Reduces eye strain during long sessions
- Makes video content pop with higher contrast
- Professional editing suite aesthetic
- Better for timeline/waveform visibility
- Hides UI chrome, focuses on content

### 2. **Video-First Layout**

Every page prioritizes video content:

**Manage page:** Thumbnail previews instead of just filenames
**Incoming page:** Live preview of last recorded file
**Recordings page:** Hoverable video scrubbing
**Watch page:** Full-bleed video with minimal chrome
**Projects page:** Video thumbnails in table rows

**Pattern:**
```
┌─────────────────────────────────────────────────────┐
│  Minimal Header (60px, translucent)                │
├─────────────────────────────────────────────────────┤
│                                                     │
│         VIDEO / VISUAL CONTENT (primary)            │
│                                                     │
│  ┌────────────────────────────────────┐             │
│  │  Floating Controls (translucent)    │             │
│  └────────────────────────────────────┘             │
│                                                     │
├─────────────────────────────────────────────────────┤
│  Bottom Timeline / Metadata (collapsible)           │
└─────────────────────────────────────────────────────┘
```

### 3. **Floating Translucent Panels**

Instead of fixed sidebars, floating panels with glassmorphism:

**Material:** `backdrop-filter: blur(20px)` with alpha transparency
**Background:** `rgba(26, 26, 26, 0.85)`
**Borders:** Subtle glow instead of hard lines
**Shadow:** Deep, dramatic shadows for depth

**Panel types:**
- **Overlay panels:** Appear on hover, auto-hide
- **Floating toolbars:** Draggable, dockable
- **Context menus:** Radial or arc-based
- **Chapter timeline:** Bottom-docked, expandable

### 4. **Vibrant Accent Colors**

Dark backgrounds need punchy accents:

**Primary actions:** Electric blue (#0ea5e9)
**Success/Safe:** Neon green (#10b981)
**Warning/Park:** Amber glow (#f59e0b)
**Danger/Delete:** Hot pink (#ec4899)
**Playback:** Purple gradient (#8b5cf6 → #d946ef)

**Usage:**
- Glowing buttons with subtle animation
- Neon borders on active elements
- Vibrant progress indicators
- Colored shadows for depth

### 5. **Cinematic Typography**

**Display/Headers:** "Space Grotesk" - Geometric, modern, tech feel
**Body text:** "Inter" - Highly legible at small sizes on dark
**Mono/Code:** "JetBrains Mono" - Consistent with design-1
**Emphasis:** "Archivo Black" - Bold, impactful for stats

**Sizes:**
- Keep text slightly larger than design-1 (dark reduces readability)
- Higher contrast ratios (WCAG AAA on dark)
- Subtle text shadows for depth

### 6. **Motion & Animation**

Dark themes benefit from smooth, cinematic motion:

**Page transitions:** Fade + slide (400ms cubic-bezier)
**Hover states:** Glow intensifies (200ms ease-out)
**Panel reveals:** Scale + fade (300ms spring)
**Video scrubbing:** Smooth preview on hover
**Timeline playhead:** Animated with easing

**Signature effect:** Glow pulse on active video
```css
@keyframes glow-pulse {
  0%, 100% { box-shadow: 0 0 20px rgba(14, 165, 233, 0.5); }
  50% { box-shadow: 0 0 40px rgba(14, 165, 233, 0.8); }
}
```

### 7. **Timeline-Centric Navigation**

Replace right sidebar chapters with bottom timeline:

```
┌──────────────────────────────────────────────────┐
│  [00:00]━━━━━━●━━━━━━━━━━━━━━━━━━━━━[18:35]   │
│    01      02       03    04  05  06    07       │
│   Intro  Overview  Gen…  Steve N8n Outro Repl… │
└──────────────────────────────────────────────────┘
```

**Features:**
- Scrubbing timeline shows video thumbnails
- Chapter markers with hover labels
- Waveform visualization behind timeline
- Click to jump, drag to scrub
- Expandable for segment view

---

## Page-Specific Implementations

### Manage Page
- **Left:** Floating toolbar (auto-hide, glass effect)
- **Center:** Grid of video thumbnails with filename overlays
- **Bottom:** Timeline showing all files in sequence
- **Interaction:** Hover thumbnail to preview/scrub

### Incoming Page
- **Top:** Full-width preview of last recording
- **Center:** Naming form overlaid on video
- **Bottom:** Timeline of existing chapters (context)

### Recordings Page
- **Center:** Large thumbnail grid (4 columns)
- **Hover:** Video preview plays automatically
- **Bottom:** Expanded timeline with waveforms
- **Filter:** Floating panel, top-right

### Watch Page
- **Full-screen video** with minimal chrome
- **Controls:** Floating, translucent, auto-hide
- **Timeline:** Bottom-docked, always visible
- **Transcript:** Overlay panel (toggle with T key)

### Projects Page
- **Table rows:** Include thumbnail preview column
- **Hover:** Row highlights with glow effect
- **Stats:** Vibrant colored progress rings
- **No timeline:** Not relevant for this view

---

## Visual Design Language

**Glassmorphism:**
```css
.glass-panel {
  background: rgba(26, 26, 26, 0.85);
  backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}
```

**Glow Effects:**
```css
.glow-primary {
  box-shadow:
    0 0 20px rgba(14, 165, 233, 0.4),
    0 0 40px rgba(14, 165, 233, 0.2),
    inset 0 0 10px rgba(14, 165, 233, 0.1);
}
```

**Depth Layers:**
- Background: -100 (darkest)
- Video surface: 0 (content plane)
- Floating panels: +100 (above content)
- Modals/drawers: +200 (top layer)
- Tooltips: +300 (always visible)

**Border Radius:**
- Small elements: 8px
- Panels: 16px
- Video containers: 12px
- Buttons: 6px
- Full-round: 9999px (pills)

---

## Solving Inconsistencies

| Inconsistency | Design-2 Solution |
|--------------|-------------------|
| Chapter navigation varies | Bottom timeline, consistent across all pages |
| Sidebar patterns differ | Floating glass panels, appear/disappear contextually |
| Tool access unclear | Floating toolbar with radial menu on right-click |
| Layout shifts | Fixed viewport, panels overlay (never push content) |
| Interactive feedback | Glow effects, smooth animations, haptic feel |

---

## Technical Implementation

**CSS Variables:**
```css
--bg-void: #0a0a0a;
--bg-panel: #1a1a1a;
--bg-surface: #242424;
--bg-elevated: #2a2a2a;
--text-primary: #f5f5f5;
--text-secondary: #a3a3a3;
--text-tertiary: #737373;
--accent-electric: #0ea5e9;
--accent-neon: #10b981;
--accent-amber: #f59e0b;
--accent-pink: #ec4899;
--accent-purple: #8b5cf6;
--glow-blur: 20px;
--panel-glass: rgba(26, 26, 26, 0.85);
```

**Responsive Breakpoints:**
- Desktop (1920px+): Full cinematic experience
- Laptop (1440px-1919px): Compact timeline
- Tablet (1024px-1439px): Hide floating panels, drawer-based
- Mobile (< 1024px): Single column, bottom nav

**Performance:**
- Use `will-change` for animated elements
- Lazy-load video thumbnails
- Debounce scrubbing events
- GPU-accelerated transforms only

---

## Design Goals Checklist

- ✅ **Immersive:** Video content is primary focus
- ✅ **Professional:** Dark theme reduces eye strain
- ✅ **Cinematic:** Motion and depth create premium feel
- ✅ **Consistent:** Timeline pattern unifies all pages
- ✅ **Accessible:** High contrast, keyboard shortcuts
- ✅ **Modern:** Glassmorphism, glow effects, smooth motion

---

## Comparison to Design-1

| Aspect | Design-1 | Design-2 |
|--------|----------|----------|
| Theme | Light, clean | Dark, cinematic |
| Layout | Tri-column, fixed | Floating, overlay |
| Chapter nav | Right sidebar | Bottom timeline |
| Focus | File management | Video immersion |
| Aesthetic | Professional, minimal | Premium, dramatic |
| Motion | Subtle transitions | Cinematic animations |

---

## Future Considerations

1. **Custom video player:** Native controls with dark theme
2. **AI assistance:** Floating AI panel for suggestions
3. **Multi-monitor:** Panels can pop out to second screen
4. **VR preview:** 360° video preview in floating orb
5. **Collaboration:** Live cursors with colored glows

---

**Next Steps:**
- Create HTML mockups demonstrating glass panels
- Test video thumbnail performance
- Prototype timeline scrubbing interaction
- Gather feedback on dark theme eye strain
- Compare with design-1 for user preference
