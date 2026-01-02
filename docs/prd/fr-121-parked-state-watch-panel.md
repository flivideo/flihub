# FR-121: Parked State in Watch Panel

**Status:** ✓ Complete
**Added:** 2026-01-02
**Implemented:** 2026-01-02
**Dependencies:** FR-120

---

## User Story

As a video creator, I want to see parked recordings distinguished in the Watch panel so I know which clips are excluded from the current edit.

---

## Problem

- Watch panel currently shows safe recordings with yellow "SAFE" badge
- Need to visually indicate parked recordings
- Users should quickly see what's in vs out of the current edit

---

## Solution

### Badge Treatment

Show "PARKED" badge on parked recordings, similar to existing "SAFE" badge:

```
┌─────────────────────────────────────────────────────────────────────┐
│ 01-1-intro                                    2:34     ▶           │
├─────────────────────────────────────────────────────────────────────┤
│ 02-1-setup                                    3:15     ▶           │
│ 02-2-demo                      [PARKED]       4:22     ▶           │
│ 02-3-technical-deep-dive       [PARKED]       8:45     ▶           │
├─────────────────────────────────────────────────────────────────────┤
│ 03-1-outro                     [SAFE]         1:12     ▶           │
└─────────────────────────────────────────────────────────────────────┘
```

### Badge Styling

| Badge | Color | Background |
|-------|-------|------------|
| SAFE | Yellow text | Yellow/cream bg |
| PARKED | Pink text | Light pink bg |

Color should match the Recordings panel treatment from FR-120.

### Position Preserved

Parked recordings remain in their chapter position - they're just visually marked as excluded, not removed from the list.

---

## Acceptance Criteria

- [x] Parked recordings show "PARKED" badge in Watch panel
- [x] Badge color matches Recordings panel parked color (bg-pink-50, text-pink-800)
- [x] Parked recordings still appear in chapter list (position preserved)
- [x] Parked and Safe badges can coexist if needed (though unusual)
- [x] Show/hide toggle button for parked recordings (optional enhancement implemented)

---

## Technical Notes

### Extend Watch Panel Logic

Watch panel already handles safe state - extend the same pattern:

```typescript
// In WatchPanel.tsx or similar
const isParked = parkedRecordings.includes(recording.filename)
const isSafe = safeRecordings.includes(recording.filename)

// Render badge(s) based on state
```

### Files to Modify

| File | Changes |
|------|---------|
| `client/src/components/WatchPanel.tsx` | Add PARKED badge, conditional styling |

---

## Optional Enhancement

**Filter toggle to hide parked recordings:**

A checkbox or toggle in the Watch panel header:
- "Show parked" (default: checked)
- When unchecked, parked recordings are hidden from the list

This is optional - implement if time permits, otherwise defer.

---

## Dependencies

- **FR-120:** Parked Recording State (provides the data model)

---

## Completion Notes

**Implemented:** 2026-01-02

### Changes to WatchPage.tsx

**State Management:**
- Added `showParked` localStorage key for persistence
- Added `showParked` state (defaults to true)
- Added `handleShowParkedToggle` callback

**Filtering Logic:**
- Updated `groupByChapterWithTiming` to filter parked recordings based on toggle
- Updated `sortedRecordings` to respect showParked setting
- Updated `mostRecentRecording` to exclude parked recordings

**UI Updates:**
- Row styling: Pink background for parked files (`bg-pink-50 text-pink-700 hover:bg-pink-100 border-l-2 border-pink-400`)
- PARKED badge: Pink badge matching RecordingsView style
- Parked toggle button: Toggle button next to Safe button
- Title attributes: Updated to show "(Parked)" status

**Visual Design:**
- Uses pink styling (`bg-pink-50`, `border-pink-200`, `text-pink-800`) matching FR-120
- Consistent with SAFE feature UX pattern
- Badge and toggle follow the exact same pattern as Safe recordings
