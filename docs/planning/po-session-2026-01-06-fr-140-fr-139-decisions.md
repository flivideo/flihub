# PO Session 2026-01-06: FR-140 & FR-139 Decisions

**Date:** 2026-01-06  
**Session Type:** Product Owner - Requirements Definition  
**Context:** Following scanner correction session, defining FR-140 and FR-139

---

## Executive Summary

**Session Goal:** Finalize FR-140 (Chapter Renumbering) and FR-139 (Folders Tool) specifications

**Decisions Made:**

1. **FR-140:** Fully specified as "Chapter Move & Cascade" - Ready for development (HIGH priority)
2. **FR-139:** Remove undefined button - Simple cleanup task (LOW priority)

**Key Insight from User:**

> "It's not about compressing gaps (01,03,05 → 01,02,03). What it is, is that the 03 can move up to 02, and everything below it should increase by one."

This clarified that FR-140 is NOT about gap compression - it's about targeted chapter movement with automatic cascade effects.

---

## FR-140: Chapter Move & Cascade Renumbering

### Decision Summary

**Status:** ✅ FULLY SPECIFIED - Ready for development  
**Priority:** HIGH (22 chapter gaps found across 12 projects)  
**Estimated Effort:** 4-6 hours  
**Specification:** `docs/prd/fr-140-bulk-chapter-renumbering.md`

### User Requirements (Clarified)

**What it IS:**

- Move specific chapter to new position (e.g., 03 → 02)
- Automatic cascade for chapters in between (e.g., 05 → 04)
- Targeted selection (NOT whole project)
- Preview required ("really important")
- Uses tooling to fix issues

**What it is NOT:**

- ❌ Gap compression (01,03,05 → 01,02,03)
- ❌ Whole project renumbering (too complex)
- ❌ Manual fixes (use tooling instead)

### Core Features

1. **Move Chapter Down** (fill gap)

   ```
   Before: 01, 03, 05
   Action: Move 03 → 02
   Cascade: 05 → 04 (automatic)
   Result: 01, 02, 04
   ```

2. **Move Chapter Up** (create gap)

   ```
   Before: 01, 03, 05
   Action: Insert at 03
   Cascade: 03 → 04, 05 → 06 (automatic)
   Result: 01, 04, 06 (gap at 03)
   ```

3. **Preview Panel**
   - Shows ALL affected chapters
   - Before → After mapping
   - File count per chapter
   - Warning: transcripts will regenerate

4. **Descending Processing**
   - High to low prevents conflicts
   - Reuses FR-130 delete+regenerate pattern

### Technical Implementation

**New Tool:** "Renumber" button in ToolsSidebar (Complex Tools)

**Drawer Components:**

- Chapter dropdown (existing chapters only)
- Target position input (01-99 validation)
- Preview panel (shows cascade effects)
- Apply/Cancel buttons

**Backend:**

- Cascade calculation algorithm
- Preview endpoint: `POST /api/manage/move-chapter`
- Execute endpoint: `POST /api/manage/execute-move-chapter`

**Estimated LOC:** ~300-400 lines

- Backend: 150 lines (cascade logic, endpoints)
- Frontend: 150 lines (ChapterMovePanel component)
- Shared: 50 lines (types)

### User Impact

**Value:**

- Eliminates manual cascade calculation
- One-click chapter reorganization
- Preview prevents mistakes
- Addresses pain point from FR-138 user testing

**User Quote:**

> "I don't see chapter 2, so it feels like I've got to move chapter 2 up to chapter 3. That's the way my brain works with it."

This feature directly addresses that mental model.

---

## FR-139: Folders Tool Specification

### Decision Summary

**Status:** ✅ DECISION MADE - Remove undefined button  
**Priority:** LOW (cleanup task)  
**Estimated Effort:** 30 minutes  
**Specification:** `docs/prd/fr-139-folders-tool-specification.md`

### PO Decision

**Path Chosen:** Remove the button (Path A)

**Rationale:**

1. User couldn't remember what it was for
2. User confused it with Export tool's folder management
3. No clear use case after 6 months
4. Better to remove than show "coming soon" indefinitely
5. Focus development on defined features (FR-140)

**User Quote:**

> "I don't really understand your questions related to folders tool. I don't even remember what it was about."

This confirms the button serves no current purpose.

### Alternative Paths Rejected

**Path B: Repurpose for FR-135 (Chapter Tools)** ❌

- Rejected: FR-135 is LOW priority, no evidence of need
- FR-140 addresses immediate chapter management needs
- Can create new button if FR-135 becomes priority

**Path C: Define New Feature** ❌

- Rejected: User couldn't articulate use case
- No clear need after 6 months
- Would delay higher-priority work

### Implementation

**Files to modify:**

1. `client/src/components/shared/ToolsSidebar.tsx` - Remove "Folders" button
2. `client/src/components/ManagePanel.tsx` - Remove drawer
3. Update `activeTool` type to remove 'folders'

**Git commit message:**

```
chore(FR-139): Remove undefined Folders button from Manage panel
```

**Can be bundled with:** FR-140 implementation or done separately

---

## Documentation Updates

### Files Created/Updated

**PRD Updates:**

1. ✅ `docs/prd/fr-140-bulk-chapter-renumbering.md` - Complete specification
2. ✅ `docs/prd/fr-139-folders-tool-specification.md` - Removal decision

**Backlog Updates:**

- ✅ FR-140: Status changed to "Ready for development"
- ✅ FR-139: Status changed to "Ready - Remove button"

**Changelog Updates:**

- ✅ Added FR-140 specification entry
- ✅ Added FR-139 decision entry

**Planning Docs:**

- ✅ `docs/planning/po-session-2026-01-06-fr-140-fr-139-decisions.md` - This document

---

## Developer Handover

### Priority 1: FR-140 (HIGH Priority - 4-6 hours)

**Specification:** `docs/prd/fr-140-bulk-chapter-renumbering.md`

**Implementation Steps:**

1. **Create Cascade Algorithm** (~1 hour)
   - File: `server/src/utils/chapterCascade.ts`
   - Function: `calculateCascade(existingChapters, source, target)`
   - Returns: Array of `{from, to, fileCount}` mappings
   - Test scenarios in spec

2. **Add Backend Endpoints** (~1.5 hours)
   - File: `server/src/routes/manage.ts`
   - Preview endpoint: Calculates cascade, returns preview
   - Execute endpoint: Processes moves in descending order
   - Reuses FR-130 rename logic

3. **Create Frontend Component** (~2 hours)
   - File: `client/src/components/shared/ChapterMovePanel.tsx`
   - Chapter dropdown, target input, preview panel
   - Uses FR-137 SlideOutDrawer pattern

4. **Integrate into Manage Panel** (~0.5 hours)
   - Add "Renumber" button to ToolsSidebar
   - Wire up drawer

5. **Testing** (~1 hour)
   - Test move down (fill gap)
   - Test move up (create gap)
   - Test non-sequential chapters
   - Test error cases

**Acceptance Criteria:** See FR-140 PRD (5 sections: AC1-AC5)

---

### Priority 2: FR-139 (LOW Priority - 30 minutes)

**Specification:** `docs/prd/fr-139-folders-tool-specification.md`

**Implementation Steps:**

1. Remove button from ToolsSidebar (~5 min)
2. Remove drawer from ManagePanel (~5 min)
3. Update `activeTool` type (~5 min)
4. Verify no console errors (~15 min)
5. Git commit with clear message

**Can be done:** Separately or bundled with FR-140

---

## PO Process Notes

### What Worked Well

1. **User clarification session** - Direct quotes prevented misinterpretation
2. **Proactive decision on undefined features** - Removed FR-139 button instead of letting it linger
3. **Detailed technical spec** - FR-140 includes cascade algorithm pseudocode
4. **Multiple examples** - Test scenarios clarify expected behavior

### Key Learnings

1. **Question vague requirements** - "Bulk renumbering" needed clarification
2. **Get user's mental model** - "I'd move chapter 2 up to chapter 3" revealed true need
3. **Remove undefined features** - Don't keep placeholders indefinitely
4. **Write implementation notes** - Cascade algorithm, descending order, preview logic all documented

---

## Summary

**Accomplishments:**

- ✅ FR-140 fully specified (move + cascade, NOT gap compression)
- ✅ FR-139 decision made (remove button)
- ✅ Backlog updated
- ✅ Changelog updated
- ✅ Developer handover prepared

**Ready for Development:**

- FR-140: HIGH priority, 4-6 hours, fully specified
- FR-139: LOW priority, 30 minutes, simple removal

**Total Estimated Effort:** ~5-7 hours for both

**User Impact:**

- Chapter reorganization becomes one-click with preview
- Cleaner UI (no undefined buttons)
- Addresses user pain point from FR-138 testing

---

**Last updated:** 2026-01-06  
**Status:** Ready for developer handover  
**Next Action:** Developer implements FR-140 and FR-139
