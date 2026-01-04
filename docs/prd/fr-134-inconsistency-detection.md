# FR-134: Inconsistency Detection & Auto-Fix

**Status:** Pending
**Added:** 2026-01-04
**Implemented:** -
**Dependencies:** FR-131 (Manage panel)

---

## User Story

As a user in the Manage panel, I want to be warned about critical file organization issues (label mismatches, chapter gaps) with the option to auto-fix them, so I can maintain consistent chapter numbering and avoid publishing mistakes.

---

## Problem

**Current state:**
- Users can create inconsistent naming (label says "Chapter 5" but files are 04-*)
- Chapter gaps (01, 02, 04, 05 - missing 03) go unnoticed
- Bulk rename operations can create mixed labels unintentionally
- No detection system to catch these issues

**Impact:**
- Publishing with wrong chapter numbers in YouTube description
- Confusion when sharing files with editor (chapter numbers don't match)
- Time wasted manually checking for gaps
- Mistakes discovered late in workflow

---

## Solution

Add **inconsistency detection system** that warns about critical issues only (label mismatches and chapter gaps) with auto-fix confirmation dialogs.

### Detection Types

**Type 1: Label Mismatch** (CRITICAL)
- User types "Chapter 5" in rename label field
- Files are numbered 04-1, 04-2, 04-3
- System detects: Label says "5" but files are "04"
- Action: Show warning with auto-fix option

**Type 2: Chapter Gaps** (CRITICAL)
- Files exist for chapters 01, 02, 04, 05
- Chapter 03 is missing
- System detects: Gap at chapter 03
- Action: Show warning (no auto-fix, might be intentional)

**Type 3: Sequence Gaps** (SKIP - Not implemented)
- Chapter has: 10-1, 10-2, 10-5, 10-6 (missing 10-3, 10-4)
- Action: SKIP - User decision says ignore sequence gaps

**Type 4: Missing Expected Files** (SKIP - Covered by FR-133)
- FR-133 (File Status Indicators) already handles this
- Action: SKIP - No duplicate implementation

---

## Label Mismatch Detection

### Trigger Points

**When to detect:**
1. User types in "Chapter Label" field during bulk rename
2. User clicks "Apply Bulk Rename" button
3. Before executing any rename operation

**Detection logic:**
```typescript
function detectLabelMismatch(
  selectedFiles: string[],
  newLabel: string
): { hasMismatch: boolean, suggestion: string } {
  // Extract chapter number from label
  const labelChapter = extractChapterNumber(newLabel) // "Chapter 5" → "05"

  // Extract chapter numbers from selected files
  const fileChapters = selectedFiles.map(f => f.split('-')[0]) // "04-1-intro.mov" → "04"

  // Check if all files have same chapter number
  const uniqueChapters = [...new Set(fileChapters)]

  if (uniqueChapters.length === 1 && uniqueChapters[0] !== labelChapter) {
    return {
      hasMismatch: true,
      suggestion: `Did you mean to rename these to ${labelChapter}-*?`
    }
  }

  // Mixed chapters (warn but allow)
  if (uniqueChapters.length > 1) {
    return {
      hasMismatch: true,
      suggestion: "Selected files have mixed chapter numbers"
    }
  }

  return { hasMismatch: false, suggestion: '' }
}
```

### UI Warning Dialog

**Scenario:** User types "Chapter 5" but files are 04-1, 04-2, 04-3

```
┌─────────────────────────────────────────────────────┐
│  ⚠️  Label Mismatch Detected                        │
├─────────────────────────────────────────────────────┤
│                                                     │
│  You entered: "Chapter 5"                           │
│  But files are: 04-1-intro.mov, 04-2-setup.mov, ... │
│                                                     │
│  Did you mean to rename these files to:             │
│    05-1-intro.mov                                   │
│    05-2-setup.mov                                   │
│    05-3-demo.mov                                    │
│                                                     │
│  ─────────────────────────────────────────────────  │
│                                                     │
│  [ Fix Chapter Numbers ]  [ Keep Current Numbers ]  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**User choices:**
- "Fix Chapter Numbers": Update chapter prefix to 05-*
- "Keep Current Numbers": Proceed with 04-* (keep label as "Chapter 5")

---

## Mixed Labels Warning

**Scenario:** User selects files from different chapters (02-1, 02-2, 05-3) and tries bulk rename

```
┌─────────────────────────────────────────────────────┐
│  ⚠️  Mixed Chapters Selected                        │
├─────────────────────────────────────────────────────┤
│                                                     │
│  You selected files from multiple chapters:         │
│    02-1-intro.mov                                   │
│    02-2-setup.mov                                   │
│    05-3-demo.mov  ← Different chapter               │
│                                                     │
│  Bulk rename will keep their chapter numbers.       │
│  Is this what you want?                             │
│                                                     │
│  ─────────────────────────────────────────────────  │
│                                                     │
│  [ Continue ]  [ Cancel and Reselect ]              │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Warning level:** Yellow (warning but allow)

---

## Chapter Gap Detection

### Detection Logic

```typescript
function detectChapterGaps(recordings: string[]): number[] {
  // Extract all chapter numbers
  const chapters = recordings
    .map(f => parseInt(f.split('-')[0], 10))
    .filter((v, i, a) => a.indexOf(v) === i) // Unique
    .sort((a, b) => a - b)

  // Find gaps
  const gaps: number[] = []
  for (let i = 0; i < chapters.length - 1; i++) {
    const current = chapters[i]
    const next = chapters[i + 1]

    if (next - current > 1) {
      // Gap detected: push missing chapter numbers
      for (let missing = current + 1; missing < next; missing++) {
        gaps.push(missing)
      }
    }
  }

  return gaps
}
```

### UI Warning Panel

**Display location:** Top of Manage panel (persistent warning)

```
┌────────────────────────────────────────────────────────┐
│  ⚠️  Chapter Gaps Detected                             │
│                                                        │
│  Missing chapters: 03, 07                              │
│                                                        │
│  This might be intentional (deleted content).          │
│  No action required unless this is a mistake.          │
│                                                        │
│  [Dismiss]                                             │
└────────────────────────────────────────────────────────┘
```

**Warning level:** Yellow (info only, no auto-fix)

**Dismissal:** User can dismiss, but warning reappears if page refreshed (not persisted)

---

## Acceptance Criteria

### Label Mismatch Detection

**1. Detection Trigger**
- [ ] Detects when user types in "Chapter Label" field
- [ ] Compares label number to selected file chapter numbers
- [ ] Shows warning BEFORE rename executes

**2. Single Chapter Mismatch**
- [ ] Files: 04-1, 04-2, 04-3
- [ ] Label: "Chapter 5"
- [ ] Shows dialog: "Did you mean to rename to 05-*?"
- [ ] "Fix Chapter Numbers" → Renames to 05-1, 05-2, 05-3
- [ ] "Keep Current Numbers" → Proceeds with 04-* (label stays "Chapter 5")

**3. Mixed Chapters Warning**
- [ ] Selected files from chapters 02, 05, 07
- [ ] Shows yellow warning: "Mixed chapters selected"
- [ ] "Continue" → Proceeds with rename
- [ ] "Cancel" → Cancels operation

**4. Always Ask First**
- [ ] NEVER auto-fixes without confirmation
- [ ] ALWAYS shows dialog with user choices
- [ ] User can opt-out of fix

### Chapter Gap Detection

**5. Gap Detection**
- [ ] Scans all recordings in project
- [ ] Identifies missing chapter numbers (01, 02, 04 → gap at 03)
- [ ] Shows warning panel at top of Manage panel

**6. Warning Display**
- [ ] Lists missing chapter numbers: "03, 07"
- [ ] Yellow warning level (info, not error)
- [ ] Includes dismissal message: "This might be intentional"
- [ ] [Dismiss] button hides warning
- [ ] Warning reappears on page refresh (not persisted)

### Critical Issues Only

**7. Sequence Gaps (NOT IMPLEMENTED)**
- [ ] Do NOT warn about sequence gaps (10-1, 10-2, 10-5)
- [ ] Only warn about chapter-level gaps (01, 02, 04)

**8. Missing Files (NOT IMPLEMENTED)**
- [ ] FR-133 handles missing derivative files
- [ ] Do NOT duplicate that logic here

---

## Technical Notes

### Detection Timing

```typescript
// In ManagePanel.tsx
function handleBulkRename() {
  // BEFORE executing rename
  const labelMismatch = detectLabelMismatch(selectedFiles, chapterLabel)

  if (labelMismatch.hasMismatch) {
    setShowMismatchDialog(true) // Show confirmation dialog
    return // Don't proceed until user chooses
  }

  // If no mismatch, proceed with rename
  executeBulkRename()
}
```

### Mixed Chapter Detection

```typescript
function detectMixedChapters(selectedFiles: string[]): boolean {
  const chapters = selectedFiles.map(f => f.split('-')[0])
  const uniqueChapters = [...new Set(chapters)]
  return uniqueChapters.length > 1
}
```

### Chapter Gap Persistence

**Decision:** Gaps are NOT persisted (no "dismiss forever")

**Rationale:**
- Gaps might be unintentional (user forgot to record)
- Warning should reappear until gap is filled or user is sure
- If annoying, user can fix the gap by using FR-135 (Chapter Tools) to fill it

---

## UI Components

### LabelMismatchDialog.tsx

```typescript
interface LabelMismatchDialogProps {
  currentChapter: string // "04"
  labelChapter: string   // "05"
  selectedFiles: string[]
  onFix: () => void      // User chose "Fix Chapter Numbers"
  onKeep: () => void     // User chose "Keep Current Numbers"
}
```

### MixedChaptersDialog.tsx

```typescript
interface MixedChaptersDialogProps {
  selectedFiles: string[]
  chapterGroups: Map<string, string[]> // "02" → ["02-1-intro.mov", ...]
  onContinue: () => void
  onCancel: () => void
}
```

### ChapterGapWarning.tsx

```typescript
interface ChapterGapWarningProps {
  gaps: number[]         // [3, 7]
  onDismiss: () => void
}
```

---

## Testing

**Test scenarios:**

1. **Label mismatch (fix path):**
   - Select 04-1, 04-2, 04-3
   - Type "Chapter 5"
   - Dialog appears
   - Click "Fix Chapter Numbers"
   - Files renamed to 05-1, 05-2, 05-3

2. **Label mismatch (keep path):**
   - Select 04-1, 04-2, 04-3
   - Type "Chapter 5"
   - Dialog appears
   - Click "Keep Current Numbers"
   - Files stay 04-*, label is "Chapter 5"

3. **Mixed chapters warning:**
   - Select 02-1, 05-3, 07-2
   - Type "Various"
   - Mixed chapters dialog appears
   - Click "Continue" → Proceeds
   - Click "Cancel" → Cancels

4. **Chapter gaps:**
   - Delete all chapter 03 files
   - Reload Manage panel
   - Warning appears: "Missing chapters: 03"
   - Click [Dismiss]
   - Warning disappears
   - Refresh page → Warning reappears

5. **No false positives:**
   - Select 05-1, 05-2, 05-3
   - Type "Chapter 5"
   - No dialog (numbers match)

---

## Implementation Notes

### Phase 1: Label Mismatch
- Implement detection logic
- Build confirmation dialogs
- Wire up to bulk rename flow

### Phase 2: Mixed Chapters
- Detect mixed chapter selections
- Show warning dialog
- Allow continue or cancel

### Phase 3: Chapter Gaps
- Scan for gaps on page load
- Display warning panel
- Implement dismissal (session-only)

---

## Effort Estimate

**Total:** 3-5 days

- Label mismatch detection: 1 day
- Mismatch dialog UI: 1 day
- Mixed chapters warning: 0.5 day
- Chapter gap detection: 0.5 day
- Gap warning panel: 0.5 day
- Testing & edge cases: 1-2 days

---

## Related

- FR-131: Manage Panel with Bulk Rename (where this logic lives)
- FR-133: File Status Indicators (similar warning system)
- FR-135: Chapter Tools (uses this for validation before moving chapters)
