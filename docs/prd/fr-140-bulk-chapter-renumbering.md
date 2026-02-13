# FR-140: Visual Chapter Management with Click-to-Rename

**Status:** With Developer
**Added:** 2026-01-06
**Revised:** 2026-01-07 (complete redesign - simpler approach)
**Priority:** HIGH (22 chapter gaps found across 12 projects)
**Estimated Effort:** 1-2 hours

---

## User Story

As a user managing my video chapters, I want to SEE all chapters laid out visually and click any chapter number to rename it, so I can quickly reorganize chapters without complex forms or manual calculations.

---

## Problem

**Current pain from screenshot:**

```
┌─────────────────────────────────────┐
│ Move chapter:  [06 ▼]               │
│ To position:   [5]                  │
│                                     │
│ Preview:                            │
│ Chapter 05 → 06 (8 files)           │
│ Chapter 06 → 05 (1 file)            │
└─────────────────────────────────────┘
```

**User feedback:**

> "I don't understand where moving chapter 6 to position 5 happens. You've got this preview that says 5 to 6 or 6 to 5. It's so unclear what that means."

**Why form-based approach failed:**

- ❌ Abstract mental model (dropdowns hide the structure)
- ❌ Confusing preview (05→06, 06→05 - what does that mean?)
- ❌ Hidden complexity (cascade algorithms, descending order)
- ❌ Can't SEE the chapters

---

## Solution: Visual Chapter List with Inline Editing

**Core principle:** Show, don't hide. Make the structure visible.

### Visual Layout

```
┌─────────────────────────────────────────┐
│ Chapter Management                  [X] │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 📄 Chapter [01] (5 files)       │   │ ← Click [01] to edit
│  └─────────────────────────────────┘   │
│                                         │
│  ⚠️  Gap at 02                          │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 📄 Chapter [03] (8 files)       │   │ ← Click [03] to edit
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 📄 Chapter [04] (3 files)       │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 📄 Chapter [05] (8 files)       │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 📄 Chapter [06] (1 file)        │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 📄 Chapter [07] (2 files)       │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

### Interaction Model: Click → Type → Auto-Sort/Swap

**Rule 1: Click any chapter number to edit it**

- All chapters are editable (01-99 range)
- Click turns number into input field
- Type new number, press Enter or blur

**Rule 2: Auto-sort after rename**

- Chapters always displayed in numerical order
- After rename, list re-sorts automatically

**Rule 3: Collision = Auto-swap**

- If target number exists, automatically swap
- No errors, no warnings, just swap
- Example: Rename 01→06 swaps with existing 06

**Rule 4: Gaps are OK**

- Renaming creates gaps naturally
- Gaps are VISUAL placeholders (not files)
- User can fill gaps by renaming into them

---

## Behavior Examples

### Example 1: Rename to Free Number

```
Before: 01, 03, 04, 05, 06, 07
Action: Click [01] → Type "02" → Enter
Result: 02, 03, 04, 05, 06, 07 (auto-sorted, gap created at 01)
```

### Example 2: Rename to Existing Number (Auto-Swap)

```
Before: 01, 03, 04, 05, 06, 07
Action: Click [01] → Type "06" → Enter
Result: 03, 04, 05, 06, 01, 07
        Auto-sorted: 01, 03, 04, 05, 06, 07
        (01 and 06 swapped positions)
```

### Example 3: Rename to Higher Number

```
Before: 01, 03, 04, 05, 06, 07
Action: Click [03] → Type "20" → Enter
Result: 01, 04, 05, 06, 07, 20 (moved to end, gap at 03)
```

### Example 4: Fill Gap

```
Before: 01, 03, 04, 05, 06, 07 (gap at 02)
Action: Click [03] → Type "02" → Enter
Result: 01, 02, 04, 05, 06, 07 (gap filled, auto-sorted)
```

---

## Scope

### In Scope (Phase 1)

1. **Visual Chapter List**
   - Vertical stack of chapter panels
   - Show chapter number + file count
   - Show gaps visually between chapters
   - Auto-sort by chapter number

2. **Inline Editing**
   - Click chapter number to edit
   - Input field with 01-99 validation
   - Enter or blur to save
   - ESC to cancel

3. **Rename Logic**
   - Rename all files in chapter
   - Auto-swap on collision
   - Auto-sort after rename
   - Use FR-130 delete+regenerate pattern

4. **Gap Detection**
   - Visual indicator for missing chapters
   - Example: "⚠️ Gap at 02"

### Out of Scope (Future - Phase 2)

- ❌ Drag-and-drop reordering (nice-to-have, not essential)
- ❌ Multi-select operations
- ❌ Undo stack
- ❌ Batch operations

---

## Acceptance Criteria

### AC1: Visual Chapter List

- [ ] Shows all chapters as vertical panels
- [ ] Each panel shows: chapter number + file count
- [ ] Panels sorted numerically (01, 03, 05, etc.)
- [ ] Gap indicators shown between non-sequential chapters

### AC2: Inline Editing

- [ ] Click chapter number → becomes input field
- [ ] Input accepts 2-digit numbers (01-99)
- [ ] Enter key saves
- [ ] ESC key cancels
- [ ] Blur (click away) saves

### AC3: Rename to Free Number

- [ ] User clicks [03], types "02" (free)
- [ ] All files in chapter 03 renamed to chapter 02
- [ ] List auto-sorts: 01, 02, 04, 05...
- [ ] Gap created at 03

### AC4: Rename to Existing Number (Swap)

- [ ] User clicks [01], types "06" (exists)
- [ ] Chapter 01 files → 06, Chapter 06 files → 01
- [ ] List auto-sorts
- [ ] No errors, seamless swap

### AC5: FR-130 Integration

- [ ] Shadows deleted before rename
- [ ] Transcripts deleted before rename
- [ ] All regenerated after rename
- [ ] Socket.io event emitted

### AC6: Error Handling

- [ ] Block rename if transcription in progress
- [ ] Validate input (01-99 only)
- [ ] Show error toast on failure
- [ ] Roll back on failure

---

## Technical Implementation

### Frontend Component Structure

**File:** `client/src/components/shared/ChapterListPanel.tsx`

```typescript
interface ChapterListPanelProps {
  recordings: string[]
  onClose: () => void
  onSuccess: () => void
}

interface Chapter {
  number: number
  fileCount: number
  isEditing: boolean
}

export function ChapterListPanel({ recordings, onClose, onSuccess }: ChapterListPanelProps) {
  // Extract chapters from recordings
  const chapters = useMemo(() => extractChapters(recordings), [recordings])

  // Detect gaps
  const gaps = useMemo(() => detectGaps(chapters), [chapters])

  // Handle chapter rename
  const handleRename = async (oldChapter: string, newChapter: string) => {
    // Check if collision
    const collision = chapters.find(ch => ch.number === parseInt(newChapter))

    if (collision) {
      // SWAP: oldChapter ↔ newChapter
      await swapChapters(oldChapter, newChapter)
    } else {
      // RENAME: oldChapter → newChapter
      await renameChapter(oldChapter, newChapter)
    }

    // Emit success event (causes re-fetch & re-sort)
    onSuccess()
  }

  return (
    <div>
      {chapters.map((ch, idx) => (
        <>
          {/* Show gap indicator if needed */}
          {gaps.includes(ch.number - 1) && (
            <div className="gap-indicator">
              ⚠️ Gap at {String(ch.number - 1).padStart(2, '0')}
            </div>
          )}

          {/* Chapter panel */}
          <ChapterPanel
            chapter={ch}
            onRename={(newNum) => handleRename(String(ch.number), newNum)}
          />
        </>
      ))}
    </div>
  )
}
```

### Backend Endpoints

**New endpoints:**

```typescript
// Rename chapter (all files)
POST /api/manage/rename-chapter
{
  oldChapter: string;  // "03"
  newChapter: string;  // "02"
}

Returns: { success: true, filesRenamed: number }

// Swap two chapters
POST /api/manage/swap-chapters
{
  chapter1: string;  // "01"
  chapter2: string;  // "06"
}

Returns: { success: true, filesSwapped: number }
```

### Rename Algorithm

```typescript
async function renameChapter(
  oldChapter: string,
  newChapter: string,
  projectPath: string
): Promise<void> {
  // Get all files for this chapter
  const files = recordings.filter((f) => f.startsWith(`${oldChapter}-`));

  for (const file of files) {
    const parsed = parseRecordingFilename(file);

    // Build new filename with new chapter
    const newFilename =
      buildRecordingFilename(newChapter, parsed.sequence, parsed.name) + path.extname(file);

    // Use FR-130 pattern: delete derivatives, rename, regenerate
    await renameRecording(file, newFilename, paths, activeJob, queue);
  }

  // Emit Socket.io event
  io.emit('recordings:changed');
}
```

### Swap Algorithm

```typescript
async function swapChapters(
  chapter1: string,
  chapter2: string,
  projectPath: string
): Promise<void> {
  const tempChapter = '99'; // Temporary chapter

  // Phase 1: chapter1 → temp
  await renameChapter(chapter1, tempChapter, projectPath);

  // Phase 2: chapter2 → chapter1
  await renameChapter(chapter2, chapter1, projectPath);

  // Phase 3: temp → chapter2
  await renameChapter(tempChapter, chapter2, projectPath);

  // Emit Socket.io event
  io.emit('recordings:changed');
}
```

---

## UI Design Details

### Chapter Panel Component

```tsx
<div className="chapter-panel">
  {isEditing ? (
    <input
      type="text"
      value={editValue}
      onChange={handleChange}
      onBlur={handleSave}
      onKeyDown={(e) => {
        if (e.key === 'Enter') handleSave();
        if (e.key === 'Escape') handleCancel();
      }}
      maxLength={2}
      autoFocus
      className="chapter-input"
    />
  ) : (
    <button onClick={() => setIsEditing(true)} className="chapter-number">
      Chapter {chapter.number.toString().padStart(2, '0')}
    </button>
  )}
  <span className="file-count">
    ({chapter.fileCount} {chapter.fileCount === 1 ? 'file' : 'files'})
  </span>
</div>
```

### Gap Indicator

```tsx
<div className="gap-indicator">⚠️ Gap at {gapNumber.toString().padStart(2, '0')}</div>
```

---

## Testing Scenarios

### Scenario 1: Rename to Free Number

- Setup: Chapters 01, 03, 05
- Action: Click [03] → Type "02" → Enter
- Expected: Chapters become 01, 02, 05 (sorted)

### Scenario 2: Rename with Swap

- Setup: Chapters 01, 03, 05, 06
- Action: Click [01] → Type "06" → Enter
- Expected: 01↔06 swap, result: 01, 03, 05, 06 (sorted)

### Scenario 3: Rename to Higher Number

- Setup: Chapters 01, 03, 05
- Action: Click [03] → Type "20" → Enter
- Expected: 01, 05, 20 (gap at 03)

### Scenario 4: Fill Gap

- Setup: Chapters 01, 05, 10 (gaps at 02-04)
- Action: Click [05] → Type "02" → Enter
- Expected: 01, 02, 10 (gap filled)

### Scenario 5: Error - Transcription Active

- Setup: Chapter 03 transcribing
- Action: Click [03] → Type "02" → Enter
- Expected: Error toast, rename blocked

---

## Implementation Notes

**Reuses:**

- FR-130 delete+regenerate pattern
- FR-137 SlideOutDrawer pattern
- Existing rename logic from manage.ts

**New code:**

- ChapterListPanel component (~200 lines)
- Gap detection utility (~30 lines)
- Swap endpoint (~50 lines)
- Rename endpoint (~50 lines)

**Estimated LOC:** ~330 lines total

- Frontend: 200 lines (component)
- Backend: 100 lines (endpoints)
- Shared: 30 lines (utilities)

**Time estimate:** 1-2 hours (much simpler than cascade approach)

---

## Why This Approach is Better

**Old approach (Form-based):**

- ❌ Hidden structure (dropdowns)
- ❌ Complex cascade algorithm
- ❌ Confusing preview
- ❌ 600+ lines of code
- ❌ User confusion

**New approach (Visual):**

- ✅ SEE all chapters at once
- ✅ Direct manipulation (click to edit)
- ✅ Simple rules (rename + sort + swap)
- ✅ ~330 lines of code (50% less)
- ✅ Intuitive UX

**User quote:**

> "If I was just looking at a list of chapters, I might see the three and I might have the ability to type the number there if I just wanted to custom change it."

This is exactly what we're building.

---

## Related Requirements

- **FR-130:** Delete+regenerate pattern (reused)
- **FR-137:** SlideOutDrawer pattern (reused)
- **FR-138:** Rename Tool (provides context)
- **FR-135:** Chapter Tools (future - drag-and-drop)

---

**Last updated:** 2026-01-07
**Status:** 🟡 With Developer (redesign in progress)
