# Existing Requirements Inventory - File Management

**Date:** 2026-01-06
**Scope:** All FRs related to file/folder management, renaming, reordering, and organization

---

## Executive Summary

**Total FRs reviewed:** 11
**Implemented:** 5 (45%)
**Partially implemented:** 1 (9%)
**Pending:** 4 (36%)
**Blocked:** 1 (9%)

**Key capabilities:**

- ✅ Basic rename (label only)
- ✅ Full rename (chapter/sequence/tags)
- ✅ Bulk operations on selected files
- ✅ Delete+regenerate pattern for derivatives
- ❌ Chapter renumbering (gaps, reordering)
- ❌ Move files between chapters
- ❌ Inconsistency detection
- ❌ Auto-fix common issues

---

## FR Inventory by Status

### ✅ Implemented (5 FRs)

#### FR-130: Simplify Rename Logic (Delete+Regenerate)

**Status:** ✅ Implemented 2026-01-03
**What it does:**

- Three-phase rename algorithm:
  1. Delete derivable files (shadows, transcripts, chapters)
  2. Rename core file + migrate state
  3. Regenerate derivatives (shadows instant, transcripts queued)
- State migration: Preserves parked/annotation/safe flags
- Manifest updates: FR-126 integration
- Queue check: Blocks rename during active transcription

**Capabilities provided:**

- Safe rename without orphaned files
- State preservation across renames
- Simplified codebase (152 → 139 lines in route)

**Limitations:**

- Only renames one file at a time (use FR-131/138 for bulk)
- User must wait for transcript regeneration (~10 min per file)

**Files:**

- `server/src/utils/renameRecording.ts` (240 lines)
- Uses: All rename operations (FR-131, FR-138)

---

#### FR-131: Manage Panel with Bulk Rename

**Status:** ✅ Phase 1 Complete, Phase 2 Superseded by FR-136
**What it does:**

- **Phase 1 (basic bulk rename):**
  - Select multiple files
  - Rename with new label
  - Preserves chapter/sequence/tags
  - Uses FR-130 pattern

- **Phase 2 (regeneration toolbar):** Superseded by FR-136
  - Regen shadows, transcripts, chapters, all
  - Progress tracking via Socket.io
  - Confirmation modals

**Capabilities provided:**

- Multi-file rename operations
- Chapter-level select/deselect
- Selection state management

**Limitations:**

- Phase 1: Label-only changes (no chapter/sequence control)
- Phase 2: Superseded by FR-136 tool-oriented design

**Files:**

- `client/src/components/ManagePanel.tsx`
- `server/src/routes/manage.ts` (bulk-rename endpoint)

---

#### FR-136: Tool-Oriented Manage Panel

**Status:** ✅ Complete 2026-01-04
**What it does:**

- Tool-oriented UI architecture
- Vertical sidebar with tools
- Slide-out drawers (FR-137 pattern)
- 4 simple tools (regen shadows/transcripts/chapters/all)
- 3 complex tools (rename, export, folders)

**Capabilities provided:**

- Consistent UI pattern for all tools
- Regen operations with progress tracking
- Tool extensibility (add new tools easily)

**Limitations:**

- Folders tool undefined (FR-139 blocked)
- Rename tool was basic (enhanced by FR-138)

**Files:**

- `client/src/components/shared/ToolsSidebar.tsx` (147 lines)
- `client/src/components/shared/SlideOutDrawer.tsx` (51 lines)
- `client/src/components/shared/RegenToolbar.tsx` (386 lines)
- `server/src/routes/manage.ts` (regen endpoints +690 lines)

---

#### FR-137: SlideOutDrawer Tool Pattern

**Status:** ✅ Documented 2026-01-06
**What it does:**

- Architectural pattern documentation
- When to use slide-out vs modal vs inline
- Standard drawer behaviors (ESC, overlay, mutual exclusivity)
- Component APIs and state management
- Animation specs (300ms slide, 200ms fade)
- Width guidelines (380px/480px/560px)

**Capabilities provided:**

- Consistent drawer UX across all tools
- Reusable SlideOutDrawer component
- Clear guidelines for adding new tools

**Files:**

- `docs/prd/fr-137-slideout-drawer-pattern.md` (pattern docs)
- `client/src/components/shared/SlideOutDrawer.tsx`

---

#### FR-138: Rename Tool Specification

**Status:** ✅ Implemented 2026-01-06
**What it does:**

- Full-featured rename tool in drawer
- Chapter dropdown (01-99) - ⚠️ Now starts blank (no auto-select)
- Sequence preserve/renumber controls
- Label input with validation
- Tags checkboxes + custom tags
- Real-time preview (before → after)
- Warning banner (transcript time estimate)

**Capabilities provided:**

- Complete control over chapter/sequence/label/tags
- Visual preview before executing
- Intelligent pre-fill for tags
- Real-time validation

**Limitations:**

- Single target chapter only (can't renumber all chapters)
- No bulk chapter renumbering (see FR-140)
- Mixed chapters require manual dropdown selection

**Files:**

- `client/src/components/shared/RenamePanel.tsx` (461 lines)
- `server/src/routes/manage.ts` (extended bulk-rename endpoint)

**Recent changes:**

- 2026-01-06: Fixed confusing auto-select logic (now starts blank)

---

### ⏳ Partially Implemented (1 FR)

#### FR-131 Phase 2: Regeneration Toolbar

**Status:** ⏳ Implemented but superseded by FR-136
**What it does:**

- Originally: Collapsible toolbar in Manage panel
- Now: Integrated into FR-136 ToolsSidebar

**Note:** Functionality exists, but UI pattern changed. Consider "implemented via FR-136."

---

### ❌ Pending (4 FRs)

#### FR-133: File Status Indicators

**Status:** ❌ Pending (was blocked by FR-136, now unblocked but low priority)
**What it should do:**

- Visual indicators for file states:
  - Transcribed (✓ has transcript)
  - Missing transcript (⚠️ queued or failed)
  - Parked (🅿️ pink indicator)
  - Safe (🔒 protected)
  - Shadow status (has/missing shadow file)
- Color-coded rows in file lists
- Tooltip explanations

**Value:**

- At-a-glance file status
- Identify missing derivatives quickly
- Better visual hierarchy

**Dependencies:** Unblocked (FR-136 complete)
**Priority:** Low (nice-to-have, not blocking)

---

#### FR-134: Inconsistency Detection & Auto-Fix

**Status:** ❌ Pending (was blocked by FR-136, now unblocked but low priority)
**What it should do:**

- Detect common issues:
  - Duplicate sequences (03-1 used twice)
  - Invalid naming (uppercase in label)
  - Missing derivatives (no shadow/transcript)
  - Orphaned files (shadow without source)
  - Chapter gaps (01, 03, 05)
  - Sequence gaps (1, 3, 7)
- Auto-fix simple issues:
  - Lowercase invalid labels
  - Delete orphaned shadows
  - Regenerate missing shadows
- Warning dialogs for complex issues:
  - Duplicate sequences (user chooses which to rename)
  - Chapter gaps (user decides: fill or keep)

**Value:**

- Data quality enforcement
- Prevent user errors
- Reduce manual cleanup

**Dependencies:** Unblocked (FR-136 complete)
**Priority:** Medium-High (blocks FR-135, useful standalone)
**Note:** **This FR is VERY relevant to discovery plan Phase 3**

---

#### FR-135: Chapter Tools (Move, Swap, Undo)

**Status:** ❌ Pending (was blocked by FR-136, now unblocked but low priority)
**What it should do:**

- **Move to Chapter:** Move files from one chapter to another
  - Insert mode: Push subsequent chapters forward
  - Fill gap mode: Fill empty chapters without cascading
- **Swap Chapters:** Swap two entire chapters (05 ↔ 07)
- **Undo Last Move:** One-click rollback

**Value:**

- Fix recording mistakes (recorded in wrong chapter)
- Structural reorganization (reorder chapters)
- Safety net (undo complex operations)

**Dependencies:**

- FR-130 (delete+regenerate) - ✅ Complete
- FR-134 (inconsistency detection) - ❌ Recommended but not blocking

**Priority:** Medium (useful, but complex)
**Complexity:** High (preview, atomic operations, rollback)

---

#### FR-140: Bulk Chapter Renumbering

**Status:** ❌ Pending (needs PO definition)
**What it should do:**

- Renumber all chapters in sequence
- Fill gaps (01, 03, 05 → 01, 02, 03)
- Shift chapters (03, 04, 05 → 02, 03, 04)
- Preview all changes before executing

**Value:**

- Fix chapter gaps (common issue per discovery plan)
- Simplify chapter management
- Avoid tedious multi-step renames

**Dependencies:** None (can use FR-138 backend)
**Priority:** TBD (discovery plan will determine)
**Created:** 2026-01-06 based on user testing FR-138

---

### 🚫 Blocked (1 FR)

#### FR-139: Folders Tool Specification

**Status:** 🚫 Blocked (needs feature definition)
**What it should do:** **UNDEFINED**

**Current state:**

- Button exists in ToolsSidebar
- Placeholder drawer: "Folder management functionality coming soon..."
- No spec, no purpose

**Options identified:**

1. Edit Folder Management (duplicate of Export tool)
2. Recording Organization (needs architecture changes)
3. Chapter Tools / FR-135 (rename button)
4. Project Structure Validation (new utility)
5. Remove button until feature defined

**Blocker:** Stakeholder decision needed
**Note:** May be resolved by discovery plan (Phase 6)

---

## Capabilities Matrix

| Capability                               | Supported? | FR(s)          | Notes                        |
| ---------------------------------------- | ---------- | -------------- | ---------------------------- |
| **Rename single file (label only)**      | ✅ Yes     | FR-130, FR-131 | Basic                        |
| **Rename single file (full control)**    | ✅ Yes     | FR-138         | Chapter/seq/label/tags       |
| **Rename multiple files (label only)**   | ✅ Yes     | FR-131, FR-138 | Bulk                         |
| **Rename multiple files (full control)** | ✅ Yes     | FR-138         | Chapter/seq/label/tags       |
| **Rename files to different chapter**    | ✅ Yes     | FR-138         | But all to SAME chapter      |
| **Move files between chapters**          | ❌ No      | FR-135 pending | Insert/cascade logic         |
| **Swap entire chapters**                 | ❌ No      | FR-135 pending | Complex                      |
| **Renumber all chapters**                | ❌ No      | FR-140 pending | Fill gaps, shift             |
| **Undo rename operations**               | ❌ No      | FR-135 pending | Rollback                     |
| **Detect inconsistencies**               | ❌ No      | FR-134 pending | Duplicates, gaps, etc.       |
| **Auto-fix simple issues**               | ❌ No      | FR-134 pending | Lowercase, orphans           |
| **Preview rename before executing**      | ✅ Yes     | FR-138         | Shows first 5 files          |
| **Regenerate derivatives**               | ✅ Yes     | FR-130, FR-136 | Shadows/transcripts/chapters |
| **File status indicators**               | ❌ No      | FR-133 pending | Visual indicators            |

---

## Gap Analysis

### What we CAN do today:

1. ✅ Rename files (individually or bulk)
2. ✅ Change chapter/sequence/label/tags
3. ✅ Preview renames before executing
4. ✅ Regenerate shadows/transcripts/chapters
5. ✅ Select files by chapter
6. ✅ Preserve state during renames (parked/annotation)

### What we CANNOT do today:

1. ❌ Renumber all chapters at once (fill gaps, shift)
2. ❌ Move files between chapters with cascading
3. ❌ Swap entire chapters
4. ❌ Detect inconsistencies automatically
5. ❌ Auto-fix common issues
6. ❌ Undo complex operations
7. ❌ See file status at-a-glance (indicators)
8. ❌ Validate structure (gaps, duplicates, etc.)

### Critical missing features (based on user request):

1. **Bulk chapter renumbering** (FR-140) - user explicitly requested
2. **Inconsistency detection** (FR-134) - needed for discovery plan
3. **Move between chapters** (FR-135) - structural reorganization

---

## Architecture Review

### Code Files Relevant to File Management

**Shared Utilities:**

- `shared/naming.ts` (510 lines) - **CRITICAL**
  - Validation rules (chapter, sequence, label, tags)
  - Parsing functions (parseRecordingFilename, parseImageFilename)
  - Building functions (buildRecordingFilename)
  - Sorting comparators
  - Calculation utilities (findNextSequence)

**Server Utilities:**

- `server/src/utils/renameRecording.ts` (240 lines)
  - FR-130 delete+regenerate pattern
  - State migration logic
  - Manifest updates
  - Queue checking

**Server Routes:**

- `server/src/routes/manage.ts` (~800 lines)
  - POST /api/manage/bulk-rename (FR-131, FR-138)
  - POST /api/manage/regen-shadows (FR-136)
  - POST /api/manage/regen-transcripts (FR-136)
  - POST /api/manage/regen-chapters (FR-136)
  - POST /api/manage/regen-all (FR-136)

**Client Components:**

- `client/src/components/ManagePanel.tsx` (669 lines)
  - File selection state
  - Chapter grouping
  - ToolsSidebar integration
- `client/src/components/shared/RenamePanel.tsx` (461 lines)
  - Full rename UI (FR-138)
- `client/src/components/shared/ToolsSidebar.tsx` (147 lines)
  - Tool palette (FR-136)

**Patterns:**

- `docs/architecture/patterns.md` - Code conventions
- `docs/prd/fr-137-slideout-drawer-pattern.md` - UI pattern

---

## Technical Constraints

### Current Limitations

1. **Rename conflicts:**
   - Cannot rename if target file already exists
   - No automatic conflict resolution
   - User must manually resolve

2. **Transcription dependency:**
   - Cannot rename during active transcription
   - User must wait for queue to clear
   - Check via `getActiveJob()` and `getQueue()`

3. **State synchronization:**
   - `.flihub-state.json` must be kept in sync
   - Manifest updates for FR-126
   - Parked/annotation/safe flags

4. **Derivative regeneration:**
   - Shadows: Instant (~1ms per file)
   - Transcripts: Slow (5-10 min per file, queued)
   - Chapters: Expensive (30-60s per chapter)
   - All: Sequential (can take hours)

5. **No batch validation:**
   - Renames validated one-at-a-time
   - No pre-flight check for entire operation
   - Partial failures possible

---

## Opportunities for New Features

Based on gaps and constraints:

### High Priority:

1. **FR-140: Bulk Chapter Renumbering**
   - Solves common user problem (chapter gaps)
   - Reuses FR-138 backend
   - Medium complexity

2. **FR-134: Inconsistency Detection**
   - Enables discovery plan (Phase 3)
   - Prevents user errors
   - Foundation for auto-fix

3. **Pre-flight Validation**
   - Check all renames before executing
   - Detect conflicts early
   - Atomic operations (all or nothing)

### Medium Priority:

4. **FR-135: Chapter Tools**
   - Move files between chapters
   - Structural reorganization
   - High complexity, high value

5. **FR-133: File Status Indicators**
   - Visual quality of life
   - Low complexity, medium value

### Low Priority:

6. **FR-139: Folders Tool**
   - Undefined, needs stakeholder input

---

## Recommendations for Discovery Plan

**Phase 2 (Rules Documentation):**

- Use `shared/naming.ts` as source of truth
- Document gaps vs what code enforces
- Clarify edge cases (chapter gaps allowed? sequence gaps?)

**Phase 3 (Scanner):**

- **FR-134 is highly relevant** - scanner logic overlaps
- Consider building scanner as part of FR-134 implementation
- Reuse validation logic from `shared/naming.ts`

**Phase 4-6 (Analysis → Requirements):**

- FR-140, FR-134, FR-135 likely to be prioritized
- Scanner results will inform FR-134 scope
- Real-world data will validate FR-140 need

---

## Conclusion

**Strong foundation:**

- Rename operations well-supported (label, full control, bulk)
- Delete+regenerate pattern proven (FR-130)
- Tool-oriented UI established (FR-136, FR-137)

**Missing pieces:**

- Chapter management (renumbering, moving, swapping)
- Inconsistency detection and auto-fix
- File status visibility

**Next steps:**

- Execute discovery plan (Phases 2-7)
- Scanner will inform FR-134, FR-140 priorities
- Real-world data drives requirements

---

**Last updated:** 2026-01-06
