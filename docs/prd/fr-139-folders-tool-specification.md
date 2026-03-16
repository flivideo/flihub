# FR-139: Folders Tool Specification

**Status:** Blocked - Needs Definition
**Added:** 2026-01-06
**Implemented:** Placeholder only (3 lines - "coming soon")
**Dependencies:** FR-137 (SlideOutDrawer pattern)

---

## User Story

**UNKNOWN** - This tool's purpose has not been defined yet.

---

## Problem

**Current state:**

- "Folders" button exists in ToolsSidebar (Complex Tools section)
- Clicking it opens drawer with placeholder: "Folder management functionality coming soon..."
- No specification exists for what this tool should do
- FR-136 mentions it as "placeholder for extensibility" and "Future FR-135 functionality"

**Impact:**

- Wasted screen real estate (button that does nothing)
- User confusion (what is "Folders" supposed to do?)
- Incomplete FR-136 implementation
- No clear path to completion

---

## Possible Interpretations

### Option 1: Edit Folder Management

**What it might be:** UI for creating and managing edit folders (edit-1st, edit-2nd, edit-final)

**Problem:** This already exists in Export tool (FR-136-B)

- ExportPanel.tsx has "Edit Folders" section (lines 350-450)
- Create/Open buttons per folder
- FR-126 Manifest status with Clean/Restore operations

**Verdict:** ❌ Duplicate - already implemented in Export

---

### Option 2: Recording Organization

**What it might be:** Move recordings into subfolders for organization

**Example use cases:**

- Create folders by topic ("Intro", "Advanced", "Demos")
- Move files into chapter-based folders (ch-01/, ch-02/, etc.)
- Archive old recordings into "Archive" folder

**Challenges:**

- FliHub assumes flat file structure in `recordings/`
- Moving to subfolders would break chapter extraction
- Would require major refactoring of file watchers

**Verdict:** ⚠️ Possible but requires architectural changes

---

### Option 3: Chapter Tools (FR-135)

**What it might be:** UI for FR-135 Chapter Tools (Move, Swap, Undo)

**FR-135 features:**

- Move files to different chapter
- Swap entire chapters
- Undo last chapter operation

**Problem:** FR-135 is a separate requirement with its own spec

**Verdict:** ⚠️ Possible - rename button from "Folders" to "Chapter Tools"

---

### Option 4: Project Folder Structure

**What it might be:** Manage overall project folder structure

**Example features:**

- Create missing standard folders (inbox/, assets/, final/)
- Verify folder structure compliance
- Fix broken folder structures

**Use case:** Project setup and validation

**Verdict:** ⚠️ Possible utility tool

---

### Option 5: Delete/Archive

**What it might be:** Placeholder for future functionality that doesn't exist yet

**Verdict:** ❌ Remove button until feature is defined

---

## PO Decision

**Decision:** Remove the button (Path A)

**Rationale:**

1. **User confusion confirmed** - User couldn't remember what it was for and confused it with Export tool's folder management
2. **No clear use case** - After 6 months, no feature definition has emerged
3. **Clean UI principle** - Better to remove undefined features than show "coming soon" indefinitely
4. **Future flexibility** - Can add back when a clear need arises
5. **FR-140 priority** - Focus development effort on defined, high-value features

**Quote from user:**

> "I don't really understand your questions related to folders tool. I don't even remember what it was about."

This confirms the button serves no current purpose and should be removed.

---

## Recommendation: Remove Button

### Path A: Remove the Button ✅ APPROVED

**Action:**

- Remove "Folders" button from ToolsSidebar.tsx
- Remove corresponding SlideOutDrawer from ManagePanel.tsx
- Update `activeTool` type to remove 'folders'

**Rationale:**

- No spec = no implementation
- User doesn't remember what it's for
- Better to remove than show "coming soon" indefinitely
- Can add back when feature is defined

**Effort:** 30 minutes

---

### Alternative Paths (Rejected)

### Path B: Repurpose for FR-135 Chapter Tools ❌

**Rejected because:**

- FR-135 is LOW priority (no evidence of need from scanner)
- FR-140 (move/cascade) addresses the immediate chapter management need
- Can create new button if FR-135 becomes priority

---

### Path C: Define New Feature ❌

**Rejected because:**

- User couldn't articulate what it should do
- No clear use case after 6 months
- Would delay higher-priority work (FR-140)

---

## Acceptance Criteria

### Removal Acceptance Criteria

- [ ] "Folders" button removed from ToolsSidebar.tsx
- [ ] SlideOutDrawer for 'folders' removed from ManagePanel.tsx
- [ ] `activeTool` type updated (remove 'folders' from union)
- [ ] No references to 'folders' tool remain in codebase
- [ ] Manage panel still functions correctly
- [ ] No console errors after removal
- [ ] Git commit with clear message

---

## Technical Notes

### Current Implementation (To Be Removed)

**File:** `client/src/components/ManagePanel.tsx` (lines 643-651)

```tsx
<SlideOutDrawer
  isOpen={activeTool === 'folders'}
  title="Folder Management"
  onClose={() => setActiveTool(null)}
>
  <div className="text-gray-600">Folder management functionality coming soon...</div>
</SlideOutDrawer>
```

**File:** `client/src/components/shared/ToolsSidebar.tsx` (lines 98-103)

```tsx
<ToolButton
  label="Folders"
  disabled={false}
  active={activeTool === 'folders'}
  onClick={() => onComplexToolClick('folders')}
  tooltip="Manage edit folders"
/>
```

### If Implementing Option 2 (Recording Organization)

**Challenges:**

- FliHub assumes flat structure in `recordings/`
- File watcher monitors single directory
- Chapter extraction parses filenames (e.g., `05-2-intro.mov`)
- Moving to subfolders would break existing logic

**Required changes:**

- Update WatcherManager to support nested folders
- Update chapter extraction to search recursively
- Update all file operations to handle paths
- Migration strategy for existing projects

**Estimated effort:** 15-20 days (major refactoring)

---

### If Implementing Option 3 (Chapter Tools / FR-135)

**Implementation:**

- Rename button to "Chapter Tools"
- Build ChapterToolsPanel component
- Implement Move to Chapter feature
- Implement Swap Chapters feature
- Implement Undo feature

**Estimated effort:** 10-15 days (see FR-135)

---

### If Implementing Option 4 (Project Structure Validation)

**Features:**

- Scan project for missing folders
- Create standard folder structure
- Validate folder names
- Fix broken structures

**Example UI:**

```
┌─────────────────────────────────────────────┐
│ Folder Management                      [X]  │
├─────────────────────────────────────────────┤
│                                             │
│ Project Folder Status                       │
│                                             │
│ ✓ recordings/                               │
│ ✓ recordings/-chapters/                     │
│ ✓ recording-shadows/                        │
│ ✓ recording-transcripts/                    │
│ ✓ inbox/                                    │
│ ✓ inbox/raw/                                │
│ ✓ inbox/dataset/                            │
│ ✓ inbox/presentation/                       │
│ ✓ assets/                                   │
│ ✓ assets/images/                            │
│ ✓ assets/thumbs/                            │
│ ✗ final/  ← Missing                         │
│ ✗ s3-staging/  ← Missing                    │
│                                             │
│ [Create Missing Folders]                    │
│                                             │
└─────────────────────────────────────────────┘
```

**Estimated effort:** 3-5 days

---

## Completion Notes

**Status:** Complete

**What was done:**
- Removed "Folders" `ToolButton` from `ToolsSidebar.tsx` (Complex Tools section)
- Removed `SlideOutDrawer` for `activeTool === 'folders'` from `ManagePanel.tsx`
- Updated `activeTool` type union to `'rename' | 'gling-edit' | 's3-staging' | 'renumber' | null` (no 'folders')
- Added inline comment on line 86 of ManagePanel.tsx: `FR-139: removed 'folders'`

**Files changed:**
- `client/src/components/shared/ToolsSidebar.tsx` (removed Folders ToolButton)
- `client/src/components/ManagePanel.tsx` (removed activeTool type entry + SlideOutDrawer)

**Testing notes:**
- Manage panel loads without errors
- No Folders button visible in Complex Tools sidebar
- All other tools (Rename, Gling/Edit, S3 Staging, Renumber) still work

---

## Related Requirements

- **FR-136:** Tool-Oriented Manage Panel (parent - Folders was one of 3 complex tools, now 2)
- **FR-137:** SlideOutDrawer Tool Pattern (architecture)
- **FR-140:** Chapter Move & Cascade (HIGH priority - focus here instead)
- **FR-122/124:** Export Panel (already has edit folder management)

---

**Last updated:** 2026-01-06

**Status:** Ready for developer - Remove button per PO decision
