# FR-137: SlideOutDrawer Tool Pattern

**Status:** Implemented (Documentation Only)
**Added:** 2026-01-06
**Implemented:** 2026-01-04 (via FR-136 implementation)
**Type:** NFR (Architectural Pattern)

---

## User Story

As a developer working on FliHub, I need a documented standard pattern for tool-based UIs with slide-out drawers, so that I can implement new tools consistently and understand the expected behavior of drawer interactions.

---

## Problem

**Current state:**

- SlideOutDrawer component exists and is used in 3+ places (Rename, Export, Folders)
- Pattern is working in production but undocumented
- No specification for when to use slide-out vs modal vs inline
- No documented rules for drawer behavior (close, animations, mutual exclusivity)
- New developers have no guidance on implementing new tools

**Impact:**

- Inconsistent implementations if pattern isn't documented
- Developers must reverse-engineer behavior from existing code
- No single source of truth for drawer UX patterns
- Risk of breaking expected behaviors when refactoring

---

## Solution

Document the SlideOutDrawer pattern as an architectural standard for FliHub tool-based UIs.

This is a **documentation-only requirement** - the implementation already exists and is working. We're capturing what was built so it can be reused consistently.

---

## Pattern Definition

### When to Use SlideOutDrawer

**Use slide-out drawer for:**

- Complex tools requiring multi-field configuration (Rename, Export)
- Tools that need significant vertical space
- Tools that benefit from side-by-side view (file list + config)
- Operations that take >1 field of input

**Use modal dialog for:**

- Confirmation prompts (yes/no decisions)
- Single-field inputs
- Error messages
- Destructive action warnings

**Use inline UI for:**

- Simple toggles (Show Parked checkbox)
- Instant actions (Select All button)
- Status displays (selection count)

---

## Drawer Behavior Specification

### Standard Behaviors

**1. Mutual Exclusivity**

- Only one drawer can be open at a time
- Opening a new drawer closes the current drawer
- State managed by single `activeTool` variable

**2. Close Interactions**

- ESC key closes drawer
- Click overlay (dark background) closes drawer
- X button in drawer header closes drawer
- Close button in drawer footer closes drawer
- Clicking same tool button toggles drawer closed

**3. Open Interactions**

- Click tool button opens drawer
- Drawer slides in from right side
- Previous drawer (if any) closes before new one opens
- 300ms slide animation (smooth transition)

**4. Visual Behavior**

- Drawer overlays main content (doesn't push it)
- Dark overlay (50% opacity) behind drawer
- Drawer width configurable (default 380px, can override)
- Drawer height: full viewport minus header
- Scroll if content exceeds height

**5. Focus Management**

- First input field auto-focused on open
- Tab navigation trapped within drawer
- Focus returns to tool button on close

---

## Component API

### SlideOutDrawer Component

```tsx
interface SlideOutDrawerProps {
  isOpen: boolean; // Controlled by parent activeTool state
  title: string; // Drawer header title
  onClose: () => void; // Called when user closes drawer
  width?: string; // Optional width override (default: "w-96" = 380px)
  children: React.ReactNode; // Drawer content
}

// Usage example:
<SlideOutDrawer
  isOpen={activeTool === 'rename'}
  title="Rename Tool"
  onClose={() => setActiveTool(null)}
  width="w-[560px]" // Optional: wider drawer
>
  <RenamePanel selectedFiles={selectedFiles} />
</SlideOutDrawer>;
```

**File:** `client/src/components/shared/SlideOutDrawer.tsx`

---

### ToolsSidebar Component

```tsx
interface ToolsSidebarProps {
  selectedFiles: string[]; // Currently selected files
  totalFiles: number; // Total files in project
  activeTool: string | null; // Which tool is currently active
  onSimpleToolClick: (
    tool: 'regen-shadows' | 'regen-transcripts' | 'regen-chapters' | 'regen-all'
  ) => void;
  onComplexToolClick: (tool: 'rename' | 'export' | 'folders') => void;
}

// Usage example:
<ToolsSidebar
  selectedFiles={Array.from(selectedFiles)}
  totalFiles={filteredRecordings.length}
  activeTool={activeTool}
  onSimpleToolClick={handleSimpleToolClick}
  onComplexToolClick={handleComplexToolClick}
/>;
```

**File:** `client/src/components/shared/ToolsSidebar.tsx`

---

## State Management Pattern

### Parent Component State

```tsx
// In ManagePanel.tsx or similar
const [activeTool, setActiveTool] = useState<'rename' | 'export' | 'folders' | null>(null);

// Simple tool handler (executes immediately)
const handleSimpleToolClick = (tool: string) => {
  // Execute tool logic directly
  executeSimpleTool(tool);
};

// Complex tool handler (opens drawer)
const handleComplexToolClick = (tool: 'rename' | 'export' | 'folders') => {
  // Toggle drawer: if already open, close it; otherwise open it
  setActiveTool(activeTool === tool ? null : tool);
};
```

### Mutual Exclusivity

**Rule:** Only one `activeTool` at a time

```tsx
// Opening new tool automatically closes previous
setActiveTool('rename'); // Opens Rename drawer
setActiveTool('export'); // Closes Rename, opens Export
setActiveTool(null); // Closes current drawer
```

**Toggle behavior:**

```tsx
// Clicking same tool button toggles closed
setActiveTool(activeTool === 'rename' ? null : 'rename');
```

---

## Animation Specifications

### Slide-In Animation

```css
/* Drawer slides in from right */
transition: transform 300ms cubic-bezier(0.4, 0, 0.2, 1)

/* Closed state */
transform: translateX(100%)

/* Open state */
transform: translateX(0)
```

### Overlay Fade

```css
/* Overlay fades in/out */
transition: opacity 200ms ease-in-out

/* Closed */
opacity: 0

/* Open */
opacity: 0.5  /* 50% dark overlay */
```

---

## Width Guidelines

**Default:** 380px (`w-96`)

- Use for simple forms (2-4 fields)
- Example: Basic rename input

**Medium:** 480px (`w-[480px]`)

- Use for moderate complexity (5-8 fields)
- Example: Rename with Chapter/Sequence/Tags

**Wide:** 560px (`w-[560px]`)

- Use for complex forms or content display
- Example: Export tool with dictionary sections

**Extra Wide:** 640px (`w-[640px]`)

- Use for side-by-side layouts within drawer
- Rare - only if absolutely needed

---

## Acceptance Criteria

### Behavioral Requirements

**1. Mutual Exclusivity**

- [ ] Only one drawer can be open at a time
- [ ] Opening new drawer closes previous drawer
- [ ] State managed by single `activeTool` variable

**2. Close Interactions**

- [ ] ESC key closes drawer
- [ ] Click overlay closes drawer
- [ ] X button in header closes drawer
- [ ] Close/Cancel button in footer closes drawer
- [ ] Clicking active tool button toggles drawer closed

**3. Animations**

- [ ] Drawer slides in from right (300ms)
- [ ] Overlay fades in (200ms)
- [ ] Smooth cubic-bezier easing
- [ ] No layout shift (drawer overlays content)

**4. Focus Management**

- [ ] First input auto-focused on open
- [ ] Tab navigation stays within drawer
- [ ] Focus returns to trigger button on close
- [ ] ESC key works from any focused element

**5. Responsive Behavior**

- [ ] Drawer width configurable via prop
- [ ] Drawer scrolls if content exceeds viewport height
- [ ] Overlay covers entire viewport
- [ ] Works on different screen sizes

### Documentation Requirements

- [ ] SlideOutDrawer API documented
- [ ] ToolsSidebar API documented
- [ ] State management pattern documented
- [ ] Animation specs documented
- [ ] Width guidelines documented
- [ ] Usage examples provided

---

## Implementation Reference

### Existing Implementations

**1. SlideOutDrawer Component**

- File: `client/src/components/shared/SlideOutDrawer.tsx` (51 lines)
- Features: Overlay, animations, ESC handler, close on overlay click
- Props: isOpen, title, onClose, width, children

**2. ToolsSidebar Component**

- File: `client/src/components/shared/ToolsSidebar.tsx` (147 lines)
- Features: Simple/Complex tool sections, tooltips, active state, disabled state
- Props: selectedFiles, totalFiles, activeTool, handlers

**3. ManagePanel Integration**

- File: `client/src/components/ManagePanel.tsx`
- Lines 76-77: activeTool state
- Lines 402-404: handleComplexToolClick
- Lines 574-583: ToolsSidebar render
- Lines 586-651: Three SlideOutDrawer instances

**4. Current Tool Implementations**

- Rename drawer (lines 586-629): Basic input + buttons
- Export drawer (lines 631-641): ExportPanel component (593 lines)
- Folders drawer (lines 643-651): Placeholder

---

## Code Examples

### Adding a New Complex Tool

**Step 1: Add tool to ToolsSidebar**

```tsx
// In ToolsSidebar.tsx, add button to Complex Tools section
<ToolButton
  label="My New Tool"
  disabled={selectedFiles.length === 0}
  active={activeTool === 'my-tool'}
  onClick={() => onComplexToolClick('my-tool')}
  tooltip="Description of what this tool does"
/>
```

**Step 2: Update activeTool type**

```tsx
// In ManagePanel.tsx
const [activeTool, setActiveTool] = useState<'rename' | 'export' | 'folders' | 'my-tool' | null>(
  null
);
```

**Step 3: Add SlideOutDrawer**

```tsx
// In ManagePanel.tsx, add drawer
<SlideOutDrawer
  isOpen={activeTool === 'my-tool'}
  title="My New Tool"
  onClose={() => setActiveTool(null)}
>
  <MyToolPanel selectedFiles={Array.from(selectedFiles)} />
</SlideOutDrawer>
```

**Step 4: Create tool panel component**

```tsx
// In client/src/components/shared/MyToolPanel.tsx
export function MyToolPanel({ selectedFiles }: { selectedFiles: string[] }) {
  return <div className="space-y-4">{/* Tool UI here */}</div>;
}
```

---

## Technical Notes

### Dependencies

- React 19
- TailwindCSS v4
- Headless UI (for accessibility patterns)

### Files Modified (Historical - from FR-136 implementation)

**Created:**

- `client/src/components/shared/SlideOutDrawer.tsx` (51 lines)
- `client/src/components/shared/ToolsSidebar.tsx` (147 lines)
- `client/src/components/shared/ExportPanel.tsx` (593 lines)

**Modified:**

- `client/src/components/ManagePanel.tsx` - Added tool state, handlers, drawers
- `client/src/components/shared/index.ts` - Exported new components

### Related Requirements

- **FR-136:** Tool-Oriented Manage Panel (parent requirement)
- **FR-138:** Rename Tool Specification (uses this pattern)
- **FR-139:** Folders Tool Specification (uses this pattern)

---

## Completion Notes

**Status:** Documentation complete

**What exists:**

- ✅ SlideOutDrawer component fully implemented
- ✅ ToolsSidebar component fully implemented
- ✅ State management pattern in use
- ✅ Three working examples (Rename, Export, Folders placeholder)
- ✅ Animations and close behaviors working
- ✅ Mutual exclusivity working

**What was documented:**

- Pattern definition (when to use)
- Behavior specification (all close/open interactions)
- Component APIs (props, usage)
- State management pattern
- Animation specs
- Width guidelines
- Code examples

**Next steps:**

- Use this pattern for all future complex tools
- Reference this PRD when implementing FR-138, FR-139, etc.
- Keep this document updated if pattern evolves

---

**Last updated:** 2026-01-06
