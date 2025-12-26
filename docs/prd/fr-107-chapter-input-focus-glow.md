# FR-107: Chapter Input Auto-Focus & Glow Animation

**Created:** 2025-12-23
**Status:** Pending

## Problem Statement

When users click the "New Chapter" button in the Chapter Recording modal, the chapter name input field does not receive focus automatically. This can lead to users forgetting to update the chapter name before proceeding with recording generation. The lack of visual feedback also makes the interaction feel less responsive.

## Goal

Improve the UX when creating a new chapter by:
1. Auto-focusing the chapter name input field when "New Chapter" is clicked
2. Adding a brief pulsed glow animation as visual feedback that the field is ready for input

This helps prevent workflow errors where users forget to rename the chapter.

---

## User Story

**As a** FliHub user creating chapter recordings,
**I want** the chapter name field to automatically focus and briefly glow when I click "New Chapter",
**So that** I'm immediately ready to type the chapter name without additional clicks, and I have clear visual feedback that the field is active.

---

## Detailed Specification

### 1. Auto-Focus Behavior

**When:** User clicks "New Chapter" button in the Chapter Recording modal

**Action:** The chapter name input field receives focus automatically

**Expected Behavior:**
- Cursor appears in the input field immediately
- User can start typing the chapter name without clicking the field
- Existing text (if any) remains selected or cursor moves to end

### 2. Glow Animation

**Visual Effect:**
- Brief pulsed glow animation around the input field border
- Duration: 300-500ms
- Style: Subtle blue glow (matching FliHub's primary blue color scheme)
- Timing: Runs once when field receives focus from "New Chapter" button

**Animation Spec:**
```
Initial state: Normal border (gray)
     ↓
0ms: Glow appears (blue shadow)
     ↓
~250ms: Glow at peak intensity
     ↓
500ms: Glow fades back to normal
```

**Implementation Notes:**
- Use CSS animation or Tailwind CSS animation utilities
- Should feel responsive, not distracting
- Glow color: `ring-blue-400` or similar Tailwind ring color
- Animation should only trigger on "New Chapter" click, not on manual focus

### 3. Implementation Location

**File:** `client/src/components/ChapterRecordingModal.tsx` (or wherever the Chapter Recording modal is implemented)

**Changes Required:**
1. Add `useRef` for the chapter name input
2. Add `useEffect` or click handler to focus the input when "New Chapter" is clicked
3. Add temporary CSS class with glow animation
4. Remove glow class after animation completes

---

## Technical Approach

### Option 1: Tailwind CSS Animation (Recommended)

```typescript
// In ChapterRecordingModal component
const [showGlow, setShowGlow] = useState(false)
const nameInputRef = useRef<HTMLInputElement>(null)

const handleNewChapter = () => {
  // Existing "New Chapter" logic...

  // Auto-focus and trigger glow
  nameInputRef.current?.focus()
  setShowGlow(true)
  setTimeout(() => setShowGlow(false), 500)
}

// In JSX:
<input
  ref={nameInputRef}
  className={`... ${showGlow ? 'animate-pulse ring-2 ring-blue-400' : ''}`}
  // ... other props
/>
```

### Option 2: Custom CSS Keyframe Animation

```css
@keyframes glow-pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
  }
  50% {
    box-shadow: 0 0 8px 2px rgba(59, 130, 246, 0.6);
  }
}

.input-glow {
  animation: glow-pulse 500ms ease-in-out;
}
```

Choose based on existing codebase patterns.

---

## Acceptance Criteria

### Functional
- [ ] Clicking "New Chapter" automatically focuses the chapter name input
- [ ] User can immediately start typing without additional clicks
- [ ] Focus behavior works consistently across browsers (Chrome, Firefox, Safari)

### Visual
- [ ] Input field shows a brief blue glow animation (300-500ms)
- [ ] Animation feels smooth and responsive, not jarring
- [ ] Glow color matches FliHub's blue theme
- [ ] Animation does not repeat on subsequent manual focus (only on "New Chapter" click)

### Edge Cases
- [ ] Works when modal first opens
- [ ] Works when creating multiple chapters in sequence
- [ ] Does not interfere with keyboard navigation (Tab key)
- [ ] Glow does not persist after animation completes

---

## UX Impact

**Positive:**
- Reduces cognitive load - users don't need to remember to click the input
- Provides immediate visual feedback that the field is active
- Prevents errors from forgetting to update the chapter name
- Makes the interaction feel polished and responsive

**Minimal Risk:**
- Very small change with low risk of breaking existing functionality
- Animation is brief and subtle - won't annoy users

---

## Related

- Chapter Recording Modal (implementation location)
- FR-76: Chapter SRT Generation (chapter recording workflow context)

---

## Completion Notes

**Status:** Complete

**What was done:**
- Added `useRef` hook for **name** input field (not chapter - name is what users edit)
- Added `useState` hook for glow animation state
- Added `useEffect` that detects chapter changes and triggers focus + glow animation
- Created custom CSS keyframe animation for proper pulsing glow effect
- Animation runs for 500ms when New Chapter button is clicked

**Files changed:**
- `client/src/components/NamingControls.tsx` (modified - added ref, state, effect)
- `client/src/index.css` (modified - added `glow-pulse` keyframe animation)

**Testing notes:**
- Click "New Chapter" button → **Name** input automatically receives focus
- Blue pulsing glow appears around input field for 500ms
- Animation only triggers on chapter changes (not on manual focus or initial mount)
- User can immediately start typing the new chapter name

**Implementation approach:**
Used Option 2 from the PRD (Custom CSS Keyframe Animation) with `glow-pulse` animation that pulses box-shadow from light to bright blue. Tracks chapter value changes via `useEffect` and compares with previous value to avoid triggering on initial mount.
