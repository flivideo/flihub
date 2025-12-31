# FR-117: Hover UX Improvements

**Added:** 2025-12-30
**Status:** Pending
**Scope:** Small-Medium (interaction refinement)

---

## User Story

As a FliHub user, I want hover interactions to feel stable and predictable so I can access information without fighting the UI.

---

## Problem

Two hover-related UX issues have been identified:

### Issue 1: Projects Page - Floating Tooltips
The status tooltips (info popup, stage descriptions) float loosely and can feel disconnected from their trigger elements. When moving the mouse, tooltips can disappear unexpectedly.

### Issue 2: Recordings/Watch Page - Chapter Hover "Whack-a-Mole"
On the Watch page, hovering over chapters to see segments triggers panel appearances that can be hard to target. The segment panel may disappear before the user can interact with it.

---

## Solution

### Part A: Anchored Tooltips (Projects Page)

Make tooltips feel more connected to their trigger elements:

1. **Pointer/Arrow** - Add small triangle pointing to trigger element
2. **Sticky Delay** - Add small delay before tooltip disappears (150-200ms)
3. **Connected Hit Area** - Extend hoverable area between trigger and tooltip

#### Current vs Improved
```
Current:                          Improved:

  [i]                               [i]
                                     ▼
  ┌────────────┐                  ┌────────────┐
  │ Tooltip    │                  │ Tooltip    │
  │ content    │                  │ content    │
  └────────────┘                  └────────────┘
     (floats)                        (anchored)
```

### Part B: Stable Chapter Hover (Watch Page)

Fix the segment panel hover sensitivity:

1. **Hover Intent Delay** - Small delay (100ms) before panel appears
2. **Leave Delay** - Panel stays visible for 200ms after mouse leaves
3. **Bridge Area** - Extend hoverable area to include gap between panels
4. **Sticky While Interacting** - Panel stays if mouse is moving toward it

#### Hover Zone Diagram
```
┌──────────────────┐
│   Chapter Panel  │ ← Hover zone extends...
│   [Chapter 1]    │
│   [Chapter 2] ●──┼────────────────────┐
│   [Chapter 3]    │                    │
└──────────────────┘    ← ...through    │
                        this gap to...  │
                    ┌───────────────────┴──┐
                    │   Segment Panel      │
                    │   [Segment details]  │
                    └──────────────────────┘
```

---

## Technical Notes

### Part A Implementation

**Option 1: CSS-only (preferred)**
```css
/* Add hover bridge with pseudo-element */
.tooltip-trigger {
  position: relative;
}
.tooltip-trigger::after {
  content: '';
  position: absolute;
  /* Creates invisible bridge to tooltip */
  width: 100%;
  height: 10px;
  top: 100%;
}
```

**Option 2: JavaScript delay**
```typescript
const [isHovered, setIsHovered] = useState(false);
const leaveTimer = useRef<number>();

const handleMouseEnter = () => {
  clearTimeout(leaveTimer.current);
  setIsHovered(true);
};

const handleMouseLeave = () => {
  leaveTimer.current = setTimeout(() => setIsHovered(false), 150);
};
```

### Part B Implementation

**Existing Code Location**
- `client/src/components/WatchPage.tsx` - Chapter/segment hover panels

**Key Changes**
- Add `onMouseEnter`/`onMouseLeave` to parent container (not just panels)
- Use `setTimeout` for delayed state changes
- Consider using `pointer-events` CSS to create continuous hover zones

**State Machine Approach**
```typescript
type HoverState =
  | { type: 'idle' }
  | { type: 'hovering-chapter', chapter: string }
  | { type: 'moving-to-segment', chapter: string }
  | { type: 'hovering-segment', chapter: string };
```

---

## Acceptance Criteria

### Part A: Tooltips
- [ ] ProjectStatsPopup has visual anchor (arrow/pointer)
- [ ] Stage tooltips stay visible briefly after mouse leaves
- [ ] Can move mouse from trigger to tooltip without it disappearing

### Part B: Chapter Hover
- [ ] Segment panel appears smoothly (slight delay prevents flicker)
- [ ] Segment panel stays visible while moving mouse toward it
- [ ] Can click items in segment panel reliably
- [ ] No "whack-a-mole" behavior when browsing chapters

---

## Files to Modify

### Part A
- `client/src/components/ProjectStatsPopup.tsx`
- `client/src/components/ProjectsPanel.tsx` (stage tooltip)

### Part B
- `client/src/components/WatchPage.tsx` (chapter/segment panels)

---

## Testing

1. Move mouse quickly from trigger to tooltip - should not close
2. Move mouse diagonally from chapter to segment panel - should work
3. Rapidly hover different chapters - panels should not flicker excessively
4. Click item in segment panel - should register click

---

## Completion Notes

_To be filled in by developer after implementation._
