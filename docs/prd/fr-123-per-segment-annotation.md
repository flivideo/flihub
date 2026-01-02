# FR-123: Watch Panel Enhancements - Annotation & Actions

**Status:** Pending
**Added:** 2026-01-02
**Updated:** 2026-01-02
**Implemented:** -
**Dependencies:** FR-120, FR-121

---

## User Story

As a video creator, I want to park recordings and add annotations while watching videos, because the Watch panel is where I make decisions about what to include or exclude.

---

## Problem

### Current Workflow Issues

1. **Wrong place for decisions** - Park/Unpark actions are in Recordings panel, but decisions happen while watching videos in Watch panel

2. **No annotation capability** - When parking recordings, can't capture reasoning ("too technical", "save for SKOOL", etc.)

3. **Redundant navigation** - Previous/Next + filename + counter appears ABOVE video, but controls bar is BELOW video. User's eyes jump around.

### Current Layout (Inefficient)

```
┌─────────────────────────────────────────────────────────────────┐
│  [← Previous]     07-1-3.2-new-prompt.mov (29 of 29)   [Next →] │  ← Above video
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                        VIDEO PLAYER                             │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  ▶ 07-1-3.2-new-prompt.mov  [tags] [Safe] [Parked] [toggles]   │  ← Below video
└─────────────────────────────────────────────────────────────────┘
```

Eyes must move from top → video → bottom. Navigation split from other controls.

---

## Solution

### Part 1: Consolidate Navigation Below Video

Move Previous/Next to the controls bar below video. Single location for all controls.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                        VIDEO PLAYER                             │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ [←] [▶/⏹] [→]  07-1-3.2-new-prompt.mov (29/29) [tags] [toggles]│
└─────────────────────────────────────────────────────────────────┘
```

**Controls bar layout (left to right):**
1. `←` Previous button
2. `▶/⏹` Play/Stop button
3. `→` Next button
4. Filename + counter (X/Y)
5. Tags
6. Toggles (Safe, Parked, etc.)

### Part 2: Park/Unpark Actions in Watch Panel

Add ability to park/unpark the current recording directly from Watch panel:

**Option A: Toggle button (like Safe)**
- "Park" / "Unpark" button in controls bar
- Matches existing Safe button pattern

**Option B: Right-click context menu**
- Right-click on segment in right panel → Park/Unpark

**Recommend: Both** - Button for current video, context menu for any segment.

### Part 3: Per-Segment Annotation

When parking (or after), allow adding a note explaining why.

**Option A: Inline annotation area**
```
┌─────────────────────────────────────────────────────────────────┐
│ [←] [▶] [→]  07-1-deep-dive.mov [PARKED]                        │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Too technical for YouTube. Save for SKOOL advanced module. │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**Option B: Click-to-edit annotation**
- Only shows when parked
- Click to expand/edit
- Auto-save on blur

**Option C: Annotation in segment panel**
- Annotation shown in right-side segment list
- Click to edit
- Visible while browsing segments

**Recommend: Option B + C** - Editable in controls bar when current, visible in segment panel for all parked.

---

## Acceptance Criteria

### Part 1: Navigation Consolidation
- [ ] Remove navigation from above video
- [ ] Add Previous/Next buttons to controls bar below video
- [ ] Play/Stop button between Previous and Next
- [ ] Filename and counter (X/Y) in controls bar
- [ ] Clean, single-line layout

### Part 2: Park/Unpark in Watch Panel
- [ ] "Park" / "Unpark" button in controls bar for current video
- [ ] Button state reflects current recording's parked status
- [ ] Optional: Context menu on segment rows

### Part 3: Per-Segment Annotation
- [ ] Annotation field visible when current video is parked
- [ ] Click to edit, auto-save on blur
- [ ] Annotations visible in segment panel (right side)
- [ ] Stored in `.flihub-state.json`
- [ ] Annotation optional (can park without notes)

---

## Technical Notes

### Navigation Move

Current structure (WatchPage.tsx ~line 540-580):
```tsx
{/* Navigation above video */}
<div className="flex items-center justify-between mb-4">
  <button>← Previous</button>
  <span>{title} (X of Y)</span>
  <button>Next →</button>
</div>
```

Move into controls bar (~line 633+):
```tsx
{/* Controls bar - now includes navigation */}
<div className="mt-3 flex items-center gap-3">
  <button>←</button>
  <button>{isPlaying ? '⏹' : '▶'}</button>
  <button>→</button>
  <span>{title} ({index}/{total})</span>
  {/* ... existing tags, toggles */}
</div>
```

### Park/Unpark Button

Reuse existing mutations from RecordingsView:
```tsx
const parkRecording = useParkRecording()
const unparkRecording = useUnparkRecording()

// Button in controls bar
<button onClick={() => currentVideo.isParked
  ? unparkRecording.mutate({ files: [filename] })
  : parkRecording.mutate({ files: [filename] })
}>
  {currentVideo.isParked ? '← Unpark' : '→ Park'}
</button>
```

### Annotation Storage

Add to ProjectState (Option A from original spec):
```typescript
interface ProjectState {
  safeRecordings?: string[]
  parkedRecordings?: string[]
  parkedAnnotations?: Record<string, string>  // NEW: filename → note
}
```

### Files to Modify

| File | Changes |
|------|---------|
| `client/src/components/WatchPage.tsx` | Move navigation, add Park button, add annotation UI |
| `shared/types.ts` | Add `parkedAnnotations` to ProjectState |
| `server/src/utils/projectState.ts` | Add annotation helpers |
| `server/src/routes/state.ts` | Add annotation endpoint |

---

## UI Mockup - Final State

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                        VIDEO PLAYER                             │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ [←] [▶] [→]  07-1-deep-dive.mov (5/29)  [PARKED]  [Safe][Parked]│
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Note: Too technical for YouTube audience                    │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ [Speed: 2x]  [Size: N/L]  [Autoplay]  [AutoNext]               │
└─────────────────────────────────────────────────────────────────┘
```

**Segment panel (right side) showing annotation:**
```
┌─────────────────────────────────────┐
│ 05 Deep Dive                        │
│ 4 segments                          │
├─────────────────────────────────────┤
│   05-1-setup         2:34  [PARKED] │
│   "Save for SKOOL"                  │
│   05-2-demo          3:15           │
│   05-3-advanced      8:45  [PARKED] │
│   "Too technical"                   │
│   05-4-summary       1:22           │
└─────────────────────────────────────┘
```

---

## Dependencies

- **FR-120:** Parked Recording State (park/unpark mutations)
- **FR-121:** Parked State in Watch Panel (badge display)

---

## Future Considerations

- Annotation categories (dropdown: "b-roll", "SKOOL", "future")
- Annotations for non-parked recordings
- Search/filter by annotation content
- Keyboard shortcuts (P to park, N to add note)

---

## Completion Notes

_To be filled by developer._
