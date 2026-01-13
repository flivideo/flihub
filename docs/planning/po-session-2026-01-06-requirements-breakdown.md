# PO Session: FR-136 Requirements Breakdown

**Date:** 2026-01-06
**Session Type:** Requirements Documentation & Gap Analysis
**Trigger:** User identified that FR-136 was implemented unevenly (Export complete, Rename partial, Folders undefined)

---

## Problem Identified

**User feedback:**
1. "We moved everything over to side panels but I don't see any tickets to really talk about this"
2. "It just has this idea of if you press a button something happens. This is not good enough"

**Root cause:**
- FR-136 was too high-level ("tool-oriented design")
- No architectural pattern documentation
- No detailed specs for each tool drawer
- "Press button → drawer opens" is NOT a specification
- Uneven implementation (Export: 593 lines, Rename: 44 lines, Folders: 3 lines)

---

## What Was Created

### 1. FR-137: SlideOutDrawer Tool Pattern

**File:** `docs/prd/fr-137-slideout-drawer-pattern.md`
**Status:** ✓ Implemented (Documented retroactively)
**Purpose:** Document the architectural pattern for tool-based UIs

**Contents:**
- When to use slide-out vs modal vs inline
- Standard drawer behaviors (ESC, overlay, mutual exclusivity, animations)
- Component APIs (SlideOutDrawer, ToolsSidebar)
- State management patterns (activeTool, toggle behavior)
- Animation specifications (300ms slide, 200ms fade)
- Width guidelines (380px/480px/560px/640px)
- Code examples for adding new tools

**Why needed:** SlideOutDrawer is used 3+ times but had no documentation

---

### 2. FR-138: Rename Tool Specification

**File:** `docs/prd/fr-138-rename-tool-specification.md`
**Status:** ⚠️ Partial (Basic input exists, needs full implementation)
**Purpose:** Complete specification for Rename tool drawer

**Current state (Basic - 44 lines):**
- Single text input for label
- Apply/Close buttons
- Warning about transcript regeneration

**Missing (Specified in FR-138):**
- **Chapter dropdown** (01-99 with auto-detection from selected files)
- **Sequence numbering** (radio: preserve original OR renumber from X)
- **Tags checkboxes** (from config.availableTags + custom tag input)
- **Preview section** (shows first 5 files: before → after)
- **Pre-fill logic** (detect chapter/tags from first selected file)
- **Validation UI** (real-time kebab-case validation with error messages)

**Full drawer mockup:** Included in FR-138 PRD (ASCII art + field specs)

**Estimated effort:** 5-8 hours

**Backend changes:** Extend `POST /api/manage/bulk-rename` to accept chapter, sequenceMode, sequenceStart, tags

---

### 3. FR-139: Folders Tool Specification

**File:** `docs/prd/fr-139-folders-tool-specification.md`
**Status:** ❌ Blocked (Needs feature definition)
**Purpose:** Identify that "Folders" tool has no specification

**Current state:**
- Button exists in ToolsSidebar
- Placeholder drawer: "Folder management functionality coming soon..."
- No defined purpose or spec

**Options identified:**
1. **Edit Folder Management** - Duplicate of Export tool (already has this)
2. **Recording Organization** - Move files to subfolders (requires architecture changes)
3. **Chapter Tools (FR-135)** - Rename button to "Chapter Tools"
4. **Project Structure Validation** - Utility for fixing broken folders
5. **Remove button** - Delete until feature is defined

**Decision needed:** Stakeholder must define what "Folders" should do

---

### 4. Updated FR-136

**File:** `docs/prd/fr-136-tool-oriented-manage-panel.md`
**Status:** ✓ Complete (Core Architecture) - See Sub-Requirements

**Changes:**
- Status changed from "Pending" to "Complete (Core Architecture)"
- Added sub-requirements section linking to FR-137/138/139
- Added comprehensive "Completion Notes" section documenting:
  - What was delivered (Core, Simple Tools, Export complete, Rename partial, Folders undefined)
  - Implementation evidence (commits, files created/modified)
  - Sub-requirements created
  - Success metrics review
  - PO lessons learned
  - Recommendation (mark FR-136 core as complete)

---

### 5. Updated Backlog

**File:** `docs/backlog.md`

**Added rows:**
```markdown
| FR-139 | Folders Tool Specification | 2026-01-06 | Blocked (Needs feature definition) |
| FR-138 | Rename Tool Specification | 2026-01-06 | Partial (needs Chapter/Sequence/Tags/Preview) |
| FR-137 | SlideOutDrawer Tool Pattern | 2026-01-06 | ✓ Implemented (Documented retroactively) |
| FR-136 | Tool-Oriented Manage Panel | 2026-01-04 | ✓ Complete (Core - See FR-137/138/139) |
```

**Updated dependencies:**
- FR-133/134/135 changed from "Blocked by FR-136" to "Unblocked, but low priority"

---

### 6. Updated Changelog

**File:** `docs/changelog.md`

**Added comprehensive entry:**
- FR-136/137/138/139 combined entry
- What was implemented (Core, Simple Tools, Export)
- What was documented (FR-137 pattern)
- What was specified (FR-138 full spec)
- What was identified as gap (FR-139 undefined)
- Requirements breakdown created
- PO lessons learned
- User impact

**Quick Summary updated:**
- Added FR-136 (Core), FR-137 to completed list
- Added FR-138 (partial), FR-139 (blocked) to "Still Open"

---

## PO Lessons Learned

### Critical Failures Identified

1. **"Press button, drawer opens" is NOT a specification**
   - Must specify: fields, validation, pre-fill logic, preview, error states
   - Forms require field-by-field breakdown

2. **Architectural patterns must be documented**
   - SlideOutDrawer was used 3+ times but undocumented
   - Created FR-137 to fix this gap

3. **Split complex requirements into sub-requirements upfront**
   - FR-136 should have been 4 requirements from the start
   - Now properly tracked as FR-136/137/138/139

4. **Track partial completion properly**
   - "Pending" when it's 60% done is misleading
   - Now showing "Complete (Core)" with sub-requirements

5. **Implemented ≠ Specified**
   - Code exists doesn't mean spec is complete
   - Must write detailed specs for all features

### Corrective Actions Taken

- ✅ Created FR-137 (pattern documentation)
- ✅ Created FR-138 (complete Rename spec with all fields)
- ✅ Created FR-139 (identified undefined feature)
- ✅ Updated FR-136 with completion notes
- ✅ Updated backlog to reflect reality
- ✅ Updated changelog with full breakdown

### Going Forward

**Every Complex Tool needs:**
- [ ] Own FR with detailed specification
- [ ] Field-by-field breakdown (for forms)
- [ ] Pre-fill logic specification
- [ ] Validation rules
- [ ] Preview behavior (if applicable)
- [ ] Success/error states
- [ ] Backend contract (endpoints, request/response)

**Every Architectural Pattern needs:**
- [ ] NFR documenting when to use it
- [ ] Component API specification
- [ ] Behavior rules
- [ ] Code examples
- [ ] Animation/interaction specs

---

## Summary

**Created 3 new PRDs:**
1. FR-137: SlideOutDrawer Tool Pattern (pattern doc)
2. FR-138: Rename Tool Specification (complete spec)
3. FR-139: Folders Tool Specification (gap identified)

**Updated 3 existing docs:**
1. FR-136: Added completion notes + sub-requirements
2. backlog.md: Added FR-137/138/139 + updated statuses
3. changelog.md: Added comprehensive entry

**Total files created/modified:** 6

**Status:**
- FR-136 Core: ✓ Complete (properly documented)
- FR-137 Pattern: ✓ Documented
- FR-138 Rename: Specified (ready for `/dev`)
- FR-139 Folders: Blocked (needs user decision)

**Next steps:**
1. User decides what "Folders" tool should do (FR-139)
2. Optionally implement FR-138 (Rename enhancement)
3. Use this process for all future requirements

---

**Session outcome:** Requirements properly broken down, gaps identified, documentation complete.
