# FR-135: Chapter Tools (Move, Swap, Undo)

**Status:** Pending
**Added:** 2026-01-04
**Implemented:** -
**Dependencies:** FR-130 (delete+regenerate), FR-131 (Manage panel), FR-134 (inconsistency detection)

---

## User Story

As a user, I want to reorganize recordings between chapters (move files to different chapters, swap entire chapters, undo mistakes) with preview and atomic rollback, so I can fix structural mistakes without manually renaming dozens of files.

---

## Problem

**Current state:**
- No way to move files from one chapter to another
- No way to swap entire chapters (e.g., swap chapter 05 ↔ 07)
- Mistakes during bulk operations are hard to undo
- Cascading renames (chapter 05 → 06 affects all subsequent chapters) are manual and error-prone

**Impact:**
- Users record content in wrong chapter and can't easily fix it
- Structural changes (reorder chapters) require manual file renaming
- Mistakes during complex reorganization are hard to reverse
- Time wasted on manual chapter management

---

## Solution

Add **dedicated "Chapter Tools" section** to Manage panel with three features:

1. **Move to Chapter** - Move selected files to a different chapter (insert/cascade behavior)
2. **Swap Chapters** - Swap two entire chapters
3. **Undo Last Move** - One-click rollback of last chapter operation

All operations use **FR-130 delete+regenerate pattern** for derivative files.

---

## Feature 1: Move to Chapter

### Primary Use Case

**Insert as new chapter (cascade subsequent chapters forward):**

```
Before:
18-1-demo.mov
19-1-config.mov
20-1-deploy.mov

User selects 02-5-setup.mov and moves to chapter 19:

After:
18-1-demo.mov
19-1-setup.mov      ← inserted from 02-5
20-1-config.mov     ← cascaded from 19-1
21-1-deploy.mov     ← cascaded from 20-1
```

### Move Modes

**User decision:** Absolute move only (no relative mode)

**Absolute move:**
- User specifies target chapter number (e.g., "Move to Chapter 19")
- Files are inserted at that chapter
- Subsequent chapters cascade forward

### Behavior Options

**Gap filling vs Insert:**

**Gap fill scenario:**
```
Before:
10-1-intro.mov
12-1-advanced.mov (chapter 11 is empty)
13-1-deploy.mov

User moves files to chapter 11:

After:
10-1-intro.mov
11-1-moved-file.mov ← fills gap
12-1-advanced.mov   ← NO cascade (gap was filled)
13-1-deploy.mov
```

**Insert scenario:**
```
Before:
10-1-intro.mov
11-1-existing.mov
12-1-advanced.mov

User moves files to chapter 11:

After:
10-1-intro.mov
11-1-moved-file.mov    ← inserted
12-1-existing.mov      ← cascaded from 11-1
13-1-advanced.mov      ← cascaded from 12-1
```

**Rule:** If target chapter is empty (gap), just fill it (don't cascade). If target chapter has files, insert and cascade.

---

### Empty Chapters After Move

**User decision:** Leave empty chapters as placeholders

```
Before:
02-1-intro.mov
02-2-setup.mov
02-3-demo.mov

User moves all three to chapter 10:

After:
(Chapter 02 is now empty - no files)
10-1-intro.mov
10-2-setup.mov
10-3-demo.mov
```

**Rationale:** User might want to re-record chapter 02 later. Empty chapters are harmless.

---

### Sequence Numbering

**User decision:** Leave gaps (don't auto-renumber sequences)

```
User selects (non-contiguous):
02-2-setup.mov
02-5-demo.mov
02-8-recap.mov

Moves to chapter 10:

After:
10-2-setup.mov  ← preserves original sequence number
10-5-demo.mov
10-8-recap.mov

NOT:
10-1-setup.mov  ← we DON'T renumber to 10-1, 10-2, 10-3
10-2-demo.mov
10-3-recap.mov
```

**Rationale:** User might have recorded 10-1, 10-3, 10-4 already. Preserving sequence numbers avoids conflicts.

---

### Preview System

**User decision:** Always show preview before executing

**Preview dialog:**
```
┌──────────────────────────────────────────────────────────┐
│  📋 Preview: Move to Chapter 19                          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Selected files:                                         │
│    02-5-setup.mov                                        │
│                                                          │
│  Will be renamed to:                                     │
│    19-5-setup.mov                                        │
│                                                          │
│  ⚠️  Cascade required: 2 chapters affected               │
│                                                          │
│  Existing files will be renumbered:                      │
│    19-1-config.mov   → 20-1-config.mov                   │
│    20-1-deploy.mov   → 21-1-deploy.mov                   │
│                                                          │
│  Derivative files:                                       │
│    ✓ Shadows will be deleted and regenerated            │
│    ✓ Transcripts will be deleted and regenerated        │
│    ✓ Chapter videos will be deleted and regenerated     │
│                                                          │
│  ─────────────────────────────────────────────────────── │
│                                                          │
│  [ Execute Move ]  [ Cancel ]                            │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Warning for large cascades:**
```
⚠️  Warning: This will cascade 23 chapters (19 → 42)
```

**User decision:** Warn if > 20 chapters affected, but allow operation.

---

### Cascade Algorithm

**Direction:** MUST rename in REVERSE order (highest chapter to lowest)

```typescript
async function cascadeChapters(
  startChapter: number,
  endChapter: number,
  projectPath: string
): Promise<void> {
  // Get all chapters in range (sorted descending)
  const chaptersToMove = getChaptersInRange(startChapter, endChapter)
    .sort((a, b) => b - a) // REVERSE ORDER: [42, 41, 40, ..., 20, 19]

  for (const chapter of chaptersToMove) {
    const files = getFilesForChapter(chapter, projectPath)

    for (const file of files) {
      // Rename: chapter N → N+1
      const newChapter = chapter + 1
      const newFilename = file.replace(/^(\d{2})/, String(newChapter).padStart(2, '0'))

      // Use FR-130 pattern: delete derivatives, rename core, regenerate
      await renameWithDeleteRegenerate(file, newFilename, projectPath)
    }
  }
}
```

**Why reverse order?** Avoids filename conflicts during rename.

**Example:** If renaming 19→20, 20→21, must do 20→21 FIRST, otherwise 19→20 conflicts with existing 20-*.

---

### Mixed Labels Warning

**User decision:** Warn but allow

**Scenario:** User selects files from chapters 02, 05, 07 and moves to chapter 10.

```
┌──────────────────────────────────────────────────────────┐
│  ⚠️  Mixed Chapters Selected                             │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  You selected files from multiple source chapters:       │
│    02-2-setup.mov                                        │
│    05-3-demo.mov                                         │
│    07-1-recap.mov                                        │
│                                                          │
│  All will be moved to chapter 10 with their original     │
│  sequence numbers preserved.                             │
│                                                          │
│  Is this what you want?                                  │
│                                                          │
│  ─────────────────────────────────────────────────────── │
│                                                          │
│  [ Continue ]  [ Cancel ]                                │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

### Fractional Chapters

**User decision:** No fractional chapters (integers only)

- No support for chapter 02.5
- No support for 02a, 02b notation
- Chapters are integers: 01, 02, 03, ..., 99

---

### Failure Mode

**User decision:** Rollback everything (atomic operation)

**Implementation:**
```typescript
async function moveToChapter(
  files: string[],
  targetChapter: number,
  projectPath: string
): Promise<{ success: boolean, error?: string }> {
  // Create backup state
  const backup = await createBackupState(projectPath)

  try {
    // Execute move + cascade
    await executeMoveWithCascade(files, targetChapter, projectPath)

    // Save undo state
    await saveUndoState(backup)

    return { success: true }

  } catch (error) {
    // Rollback on ANY failure
    await restoreBackupState(backup)

    return {
      success: false,
      error: `Move failed: ${error.message}. All changes have been rolled back.`
    }
  }
}
```

**All-or-nothing:** If ANY file fails to rename, entire operation is rolled back.

---

## Feature 2: Swap Chapters

### Use Case

**Swap entire chapters:**

```
Before:
05-1-partA.mov
05-2-partB.mov
07-1-demo.mov
07-2-config.mov

User swaps chapter 05 ↔ 07:

After:
05-1-demo.mov    ← was 07-1
05-2-config.mov  ← was 07-2
07-1-partA.mov   ← was 05-1
07-2-partB.mov   ← was 05-2
```

### UI

**Swap dialog:**
```
┌──────────────────────────────────────────────────────────┐
│  🔄 Swap Chapters                                        │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Swap chapter:  [ 05 ▼ ]  with:  [ 07 ▼ ]               │
│                                                          │
│  Preview:                                                │
│                                                          │
│  Chapter 05 (2 files) → Chapter 07                       │
│    05-1-partA.mov → 07-1-partA.mov                       │
│    05-2-partB.mov → 07-2-partB.mov                       │
│                                                          │
│  Chapter 07 (2 files) → Chapter 05                       │
│    07-1-demo.mov  → 05-1-demo.mov                        │
│    07-2-config.mov → 05-2-config.mov                     │
│                                                          │
│  ─────────────────────────────────────────────────────── │
│                                                          │
│  [ Swap Chapters ]  [ Cancel ]                           │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Algorithm

**Three-phase swap (avoids conflicts):**

```typescript
async function swapChapters(
  chapter1: number,
  chapter2: number,
  projectPath: string
): Promise<void> {
  const tempChapter = 999 // Temporary chapter number

  // Phase 1: Move chapter1 to temp
  await moveCoreFiles(chapter1, tempChapter, projectPath)

  // Phase 2: Move chapter2 to chapter1
  await moveCoreFiles(chapter2, chapter1, projectPath)

  // Phase 3: Move temp to chapter2
  await moveCoreFiles(tempChapter, chapter2, projectPath)

  // Use FR-130 pattern for each move
}
```

**Derivative files:** Deleted and regenerated using FR-130 pattern.

---

## Feature 3: Undo Last Move

### Use Case

**One-click rollback:**
- User moves files to chapter 19
- Realizes it was wrong chapter
- Clicks "Undo Last Move"
- Files restored to original chapter

### Undo State

**Stored in memory (server-side):**
```typescript
interface UndoState {
  operation: 'move' | 'swap'
  timestamp: string
  backup: {
    recordingsState: Map<string, string> // filename → path
    derivativesState: Map<string, string[]> // filename → derivative paths
    projectState: ProjectState // .flihub-state.json backup
  }
}

// Global undo stack (last operation only)
let lastUndoState: UndoState | null = null
```

**User decision:** Track last operation only (not full undo stack)

### UI

**Undo button (in Chapter Tools section):**
```
┌────────────────────────────────────────────────────────┐
│  Chapter Tools                                         │
├────────────────────────────────────────────────────────┤
│  [ Move to Chapter... ]  [ Swap Chapters... ]          │
│                                                        │
│  ⏮️ Undo Last Move (moved 3 files to ch 19, 5 min ago) │
└────────────────────────────────────────────────────────┘
```

**Undo confirmation:**
```
┌──────────────────────────────────────────────────────────┐
│  ⏮️ Undo Last Move?                                      │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  This will undo:                                         │
│    Moved 3 files to chapter 19 (5 minutes ago)           │
│                                                          │
│  Files will be restored to:                              │
│    02-5-setup.mov                                        │
│    02-6-demo.mov                                         │
│    02-7-recap.mov                                        │
│                                                          │
│  Cascaded chapters (19→20, 20→21) will be restored.      │
│                                                          │
│  ─────────────────────────────────────────────────────── │
│                                                          │
│  [ Undo ]  [ Cancel ]                                    │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Undo Expiry

**When undo state is cleared:**
- After 1 hour (prevent stale undo)
- After server restart
- After another move/swap operation (only last operation tracked)

---

## Acceptance Criteria

### Move to Chapter

**1. Basic Move (Gap Fill)**
- [ ] User selects 02-5-setup.mov
- [ ] Clicks "Move to Chapter..."
- [ ] Enters target: 11 (empty chapter, gap)
- [ ] Preview shows: "02-5-setup.mov → 11-5-setup.mov (no cascade)"
- [ ] Execute → File moved to 11-5, chapter 12+ unchanged

**2. Insert Move (Cascade)**
- [ ] User selects 02-5-setup.mov
- [ ] Moves to chapter 19 (already has files)
- [ ] Preview shows cascade: 19→20, 20→21
- [ ] Execute → Files cascaded in reverse order
- [ ] Chapter 02 now empty (placeholder)

**3. Multi-File Move**
- [ ] User selects 02-2, 02-5, 02-8 (non-contiguous)
- [ ] Moves to chapter 10
- [ ] Files become: 10-2, 10-5, 10-8 (sequence preserved)

**4. Large Cascade Warning**
- [ ] Move triggers cascade of 23 chapters
- [ ] Warning shown: "⚠️ This will cascade 23 chapters"
- [ ] User can proceed or cancel

**5. Mixed Labels Warning**
- [ ] User selects files from chapters 02, 05, 07
- [ ] Warning: "Mixed chapters selected"
- [ ] User can continue or cancel

**6. FR-130 Integration**
- [ ] Shadows deleted before move
- [ ] Transcripts deleted before move
- [ ] Chapter videos deleted before move
- [ ] All regenerated after move

**7. Atomic Rollback**
- [ ] If ANY file fails to move, entire operation rolls back
- [ ] Error message shown
- [ ] No partial state (all or nothing)

### Swap Chapters

**8. Basic Swap**
- [ ] Select chapters 05 ↔ 07
- [ ] Preview shows both directions
- [ ] Execute → Chapter 05 becomes 07, 07 becomes 05

**9. Three-Phase Algorithm**
- [ ] Uses temp chapter (999) to avoid conflicts
- [ ] Phase 1: 05 → 999
- [ ] Phase 2: 07 → 05
- [ ] Phase 3: 999 → 07

**10. Derivative Files**
- [ ] Shadows deleted and regenerated
- [ ] Transcripts deleted and regenerated
- [ ] Chapter videos deleted and regenerated

### Undo Last Move

**11. Undo State Saved**
- [ ] After move, undo state stored in memory
- [ ] Shows in UI: "Undo Last Move (3 files, 5 min ago)"

**12. Undo Execution**
- [ ] Click "Undo Last Move"
- [ ] Preview shows what will be restored
- [ ] Execute → Files restored to original chapter
- [ ] Cascaded chapters restored

**13. Undo Expiry**
- [ ] Undo state cleared after 1 hour
- [ ] Undo state cleared after server restart
- [ ] Undo state cleared after new move operation

**14. No Undo Available**
- [ ] If no recent move, button disabled
- [ ] Shows: "No recent moves to undo"

---

## Technical Notes

### API Endpoints

**New endpoints:**

```typescript
// Move files to chapter
POST /api/chapter-tools/move
{
  "files": ["02-5-setup.mov", "02-6-demo.mov"],
  "targetChapter": 19,
  "preview": false // true = preview only, false = execute
}

Response:
{
  "success": true,
  "preview": {
    "moves": [
      { "from": "02-5-setup.mov", "to": "19-5-setup.mov" }
    ],
    "cascades": [
      { "from": "19-1-config.mov", "to": "20-1-config.mov" },
      { "from": "20-1-deploy.mov", "to": "21-1-deploy.mov" }
    ],
    "affectedChapters": 2
  }
}

// Swap chapters
POST /api/chapter-tools/swap
{
  "chapter1": 5,
  "chapter2": 7,
  "preview": false
}

// Undo last move
POST /api/chapter-tools/undo

// Get undo state
GET /api/chapter-tools/undo-state
Response:
{
  "available": true,
  "operation": "move",
  "summary": "Moved 3 files to chapter 19",
  "timestamp": "2026-01-04T10:30:00Z",
  "expiresIn": 3200 // seconds
}
```

---

### Cascade Detection

```typescript
function detectCascade(
  targetChapter: number,
  projectPath: string
): { cascadeNeeded: boolean, affectedChapters: number[] } {
  // Check if target chapter has files
  const targetFiles = getFilesForChapter(targetChapter, projectPath)

  if (targetFiles.length === 0) {
    return { cascadeNeeded: false, affectedChapters: [] }
  }

  // Cascade needed: find all subsequent chapters
  const allChapters = getAllChapters(projectPath).sort((a, b) => a - b)
  const cascadeStart = allChapters.indexOf(targetChapter)
  const affected = allChapters.slice(cascadeStart)

  return {
    cascadeNeeded: true,
    affectedChapters: affected
  }
}
```

---

### Backup & Restore

```typescript
interface BackupState {
  recordings: Map<string, Buffer> // filename → file contents
  projectState: ProjectState      // .flihub-state.json
  manifest?: EditManifest          // edit folder manifest (if exists)
}

async function createBackupState(projectPath: string): Promise<BackupState> {
  // Backup all recordings (copy to temp)
  // Backup .flihub-state.json
  // Backup manifest files
}

async function restoreBackupState(backup: BackupState): Promise<void> {
  // Restore recordings from backup
  // Restore .flihub-state.json
  // Restore manifest files
  // Delete any files created during failed operation
}
```

---

## UI Design

### Chapter Tools Section (Manage Panel)

```
┌────────────────────────────────────────────────────────────┐
│  Manage                                              [Dev] │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  Chapter Tools                                       │ │
│  ├──────────────────────────────────────────────────────┤ │
│  │  [ Move to Chapter... ]  [ Swap Chapters... ]        │ │
│  │                                                      │ │
│  │  ⏮️ Undo Last Move                                   │ │
│  │  (moved 3 files to ch 19, 5 minutes ago)             │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  Bulk Rename                                         │ │
│  │  ...                                                 │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  Chapter 01: Introduction                      ✓ [7]      │
│  ☑ 01-1-intro.mov      [Rename] [Chapter...]              │
│  ☐ 01-2-setup.mov      [Rename] [Chapter...]              │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## Testing

**Test scenarios:**

1. **Gap fill move:**
   - Chapter 11 empty
   - Move 02-5 to chapter 11
   - Becomes 11-5, no cascade

2. **Insert move with cascade:**
   - Move 02-5 to chapter 19 (has files)
   - Cascades 19→20, 20→21
   - Verify reverse-order execution

3. **Multi-file move:**
   - Select 02-2, 02-5, 02-8
   - Move to chapter 10
   - Verify: 10-2, 10-5, 10-8 (gaps preserved)

4. **Large cascade warning:**
   - 30 chapters exist
   - Move to chapter 10
   - Warning shown, can proceed

5. **Swap chapters:**
   - Swap 05 ↔ 07
   - Verify both directions
   - Verify temp chapter (999) used

6. **Undo move:**
   - Move files to chapter 19
   - Click undo
   - Verify restored to original chapter

7. **Rollback on failure:**
   - Simulate file lock during cascade
   - Verify entire operation rolls back
   - No partial state

8. **FR-130 integration:**
   - Verify shadows deleted before move
   - Verify transcripts deleted before move
   - Verify regeneration after move

---

## Implementation Notes

### Phase 1: Move to Chapter (Core)
- Basic move logic (gap fill vs insert)
- Preview system
- FR-130 integration (delete+regenerate)

### Phase 2: Cascade Algorithm
- Reverse-order cascade
- Large cascade warning
- Atomic rollback

### Phase 3: Swap Chapters
- Three-phase swap algorithm
- Preview UI

### Phase 4: Undo System
- Backup state storage
- Undo UI
- Expiry logic

---

## Effort Estimate

**Total:** 10-15 days

- Move to chapter (core logic): 3 days
- Cascade algorithm: 2 days
- Preview system: 2 days
- Swap chapters: 2 days
- Undo system: 2 days
- FR-130 integration: 1 day
- Atomic rollback: 1 day
- Testing & edge cases: 2-3 days

---

## Dependencies

**Required:**
- FR-130: Delete+regenerate pattern (critical for derivative file handling)
- FR-131: Manage panel (where Chapter Tools UI lives)

**Recommended:**
- FR-134: Inconsistency Detection (provides mixed label warnings)

---

## Related

- FR-130: Simplify Rename Logic (provides delete+regenerate foundation)
- FR-131: Manage Panel with Bulk Rename (UI container)
- FR-134: Inconsistency Detection (warning dialogs)
- Future Bulk Operations: Documents park/safe operations (deferred)
