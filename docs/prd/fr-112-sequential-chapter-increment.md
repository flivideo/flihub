# FR-112: Sequential Chapter Increment

**Type:** UX Improvement
**Priority:** Medium
**Added:** 2025-12-26

---

## Problem

When clicking "New Chapter" button multiple times (accidentally or rapidly), the chapter number increments each time:
- Start at chapter 03
- Click "New Chapter" → 04
- Click again → 05
- Click again → 06

This creates unintentional gaps in chapter numbering (e.g., 1, 2, 3, 5, 8, 9, 10 with chapters 4, 6, 7 missing).

**Real example:** User recorded a video with chapters 1-10 but ended up with gaps because they accidentally double-clicked "New Chapter" multiple times during the session.

---

## Solution

"New Chapter" should always calculate the next chapter based on **highest chapter actually recorded in the project**, not from the current input field value.

### Current Behavior

```typescript
// App.tsx line 285-286
const currentChapter = parseInt(prev.chapter || '01', 10)
const nextChapter = String(Math.min(99, currentChapter + 1)).padStart(2, '0')
```

Reads from state → easy to increment multiple times.

### New Behavior

```typescript
// Calculate from highest recorded chapter in project
const highestRecordedChapter = Math.max(
  ...recordings.map(r => parseInt(r.chapter || '0', 10)),
  0
)
const nextChapter = String(Math.min(99, highestRecordedChapter + 1)).padStart(2, '0')
```

- Click "New Chapter" once → goes to highest + 1
- Click "New Chapter" again → still highest + 1 (idempotent until you record)
- Record a file → now highest is updated
- Click "New Chapter" → goes to new highest + 1

### Intentional Skips

To intentionally skip chapters (rare use case):
- Manually type desired chapter number in the input field
- Don't click "New Chapter"
- Proceed with naming

---

## Acceptance Criteria

- [ ] "New Chapter" calculates next chapter from highest recorded chapter in project
- [ ] Clicking "New Chapter" multiple times stays on same next chapter (idempotent)
- [ ] After recording a file, "New Chapter" correctly advances
- [ ] Manual chapter input still works for intentional skips
- [ ] Empty project starts at chapter 01

---

## Implementation

**File:** `client/src/App.tsx`

**Function:** `handleNewChapter` (line 282-300)

**Change:**
1. Pass `recordings` data to the callback (or access via ref/context)
2. Calculate highest chapter from recordings
3. Set next chapter to highest + 1

**Edge cases:**
- No recordings yet → default to chapter 01
- All recordings in safe → still count them for highest chapter
- Recordings with non-numeric chapters → skip/ignore in calculation

---

## Testing

1. **Fresh project:** Click "New Chapter" → should be 01
2. **After recording chapter 03:** Click "New Chapter" → should be 04
3. **Rapid clicks:** Click "New Chapter" 5 times quickly → should stay at 04 (not 08)
4. **Intentional skip:** Type "10" manually, record file, click "New Chapter" → should be 11
5. **Mixed chapters:** Have recordings 01, 02, 05 (gap) → "New Chapter" should be 06

---

## Related

- FR-107: Chapter Input Auto-Focus & Glow (related UX for New Chapter)

---

## Completion Notes

**What was done:**
- Added `useRecordings` hook to fetch project recordings data
- Updated `handleNewChapter` to calculate next chapter from highest recorded chapter in project
- Added `recordingsData` to the useCallback dependency array
- Function is now idempotent - clicking multiple times stays on same value until a new file is recorded

**Files changed:**
- `client/src/App.tsx` (modified)
  - Added `useRecordings` to imports
  - Added `useRecordings()` hook call
  - Updated `handleNewChapter` logic to calculate from recordings

**Testing notes:**
1. Fresh project (no recordings): Click "New Chapter" → should be 01
2. After recording chapter 03: Click "New Chapter" → should be 04
3. Rapid clicks: Click "New Chapter" 5 times quickly → should stay at 04
4. Intentional skip: Type "10" manually, record file, click "New Chapter" → should be 11
5. Mixed chapters with gaps: Have recordings 01, 02, 05 → "New Chapter" should be 06
6. Safe recordings: Files in safe folder should still be counted

**Status:** Complete
