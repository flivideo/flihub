# FR Prioritization: File/Folder Management & Renaming

**Date:** 2026-01-06
**Session Type:** PO Review
**Scope:** File/folder management, renaming, sorting, chapter/segment management
**Context:** Discovery Plan complete - 7 phases, 1805 issues analyzed across 47 projects

---

## Executive Summary

### Discovery Findings Impact

The 7-phase discovery plan revealed critical insights that change FR priorities:

**Critical Finding:** 79% of all issues (1422 errors) are tag case violations affecting 38 projects (81%)
- Users type lowercase tags (`bmad`, `code`, `init`) but parser requires strict uppercase
- **NFR-141** (Lenient Tag Parser) addresses this - blocks FR-138 full implementation

**Key Insight:** FR-138 is already ✅ **Complete** and doesn't need updates based on discovery
- Implemented with chapter/sequence/tags/preview (2026-01-06)
- Tag case issue is a parser problem, not a UI problem
- FR-138 already has `textTransform: uppercase` for tag inputs

### Recommended Action

**Priority 0 (BLOCKER):** NFR-141 must be implemented before any FR work
- Fixes 79% of all issues instantly
- 1.5 hours effort
- Zero dependencies

**Priority 1:** FR-140 (Bulk Chapter Renumbering)
- Addresses chapter gaps found in 12 projects (26%)
- User explicitly requested during FR-138 testing
- Needs scope definition from PO

**Lower Priority:** FR-133/134/135 are good features but not critical based on data

---

## FR Analysis: What Needs Updates?

### FR-138: Rename Tool Specification ✅ **NO UPDATES NEEDED**

**Status:** ✓ Complete (2026-01-06)
**Completion Notes Section:** Lines 660-767 show full implementation

**What was implemented:**
- Chapter dropdown (01-99) with auto-detection
- Sequence numbering (preserve/renumber)
- Label input with real-time kebab-case validation
- Tags checkboxes + custom tag input
- Preview section (first 5 files before → after)
- Warning banner (transcript regeneration time)
- Full validation and pre-fill logic

**Discovery findings impact:** ❌ None
- Tag case issue is in `shared/naming.ts` parser (NFR-141), not FR-138 UI
- FR-138 already has `textTransform: uppercase` for tag inputs (line 159 in PRD spec)
- All acceptance criteria met (10/10 ✓)

**Recommendation:** No changes needed to FR-138

---

### FR-140: Bulk Chapter Renumbering ⚠️ **NEEDS SCOPE DEFINITION**

**Status:** Pending (needs PO definition)
**Discovery findings impact:** ✅ Validates need

**Evidence from discovery:**
- 22 chapter gaps found across 12 projects (26%)
- Pattern analysis confirms user pain point
- User explicitly requested during FR-138 testing: "I don't see chapter 2, so it feels like I've got to move chapter 2 up to chapter 3"

**Questions needing PO answers (from PRD):**
1. **Scope:** Renumber all chapters in project, or just selected files?
2. **Modes:**
   - Fill gaps only (01, 03, 05 → 01, 02, 03)?
   - Shift all by offset (03, 04, 05 → 02, 03, 04)?
   - Custom mapping (03→10, 04→11)?
   - All three?
3. **Implementation:** New tool or extend existing Rename Tool?
4. **Conflicts:** What if renumbering creates conflicts?
5. **Preview:** Show full preview before execute?

**Current PRD:** Lines 1-130 outline three solution options
**Recommendation:** Define scope, then write full spec with acceptance criteria

---

### FR-135: Chapter Tools (Move, Swap, Undo) ⚠️ **COMPREHENSIVE BUT LOW PRIORITY**

**Status:** Pending
**Discovery findings impact:** ❌ None - no evidence of need in scanner results

**PRD Quality:** ✅ Excellent (800+ lines, comprehensive spec)
- Full specification with acceptance criteria
- Three features: Move to Chapter, Swap Chapters, Undo Last Move
- Cascade algorithm, preview system, atomic rollback
- Estimated effort: 10-15 days

**Discovery findings:** No evidence users need this
- 0 issues related to needing to move files between chapters
- 0 issues related to needing to swap chapters
- Feature is well-specified but data doesn't show user pain

**Recommendation:** Low priority - implement only after FR-140 if user requests

---

### FR-134: Inconsistency Detection & Auto-Fix ⚠️ **PARTIALLY RELEVANT**

**Status:** Pending
**Discovery findings impact:** ⚠️ Mixed

**What FR-134 covers:**
1. Label mismatch detection (user types "Chapter 5" but files are 04-*)
2. Mixed chapters warning (files from multiple chapters selected)
3. Chapter gap detection (warning banner)

**Discovery findings:**
- Chapter gaps found (22 instances) - ✅ validates Feature 3
- Label mismatches: Not detected by scanner (would be runtime issue)
- Mixed chapters: Not detected by scanner (would be runtime issue)

**Recommendation:** Medium priority - useful warnings but not critical
- Gap detection is nice-to-have (FR-140 is the fix)
- Label mismatch and mixed warnings are preventative (good UX)
- Estimated effort: 3-5 days

---

### FR-133: File Status Indicators ❌ **NOT RELEVANT TO DISCOVERY**

**Status:** Pending
**Discovery findings impact:** ❌ None

**What FR-133 covers:**
- Badge system showing derivative file status (✓/⚠️/✗)
- Hover tooltips with breakdown (shadows, transcripts, chapters, manifest)
- Stale file warnings (derivative older than recording)
- Groq accuracy warnings (< 97%)

**Discovery findings:**
- 361 derivative issues found (20% of total)
- But these are INFO-level, not errors
- Missing transcripts queue automatically
- Missing shadows regenerate on demand (FR-136 regen buttons exist)

**Recommendation:** Low priority - nice-to-have visibility tool
- Data shows missing derivatives aren't blocking users
- FR-136 already provides "Regen Shadows" / "Regen Transcripts" buttons
- Estimated effort: 5-8 days

---

### FR-139: Folders Tool Specification ❌ **REMOVE OR DEFINE**

**Status:** Blocked - Needs Definition
**Discovery findings impact:** ❌ None

**Current state:**
- Button exists with "coming soon" placeholder (3 lines)
- No spec, no purpose defined
- Wasting UI real estate

**Options identified in PRD:**
1. **Remove button** (30 min) - simplest
2. **Repurpose for FR-135** (rename to "Chapter Tools") - future-proof
3. **Define new feature** - requires stakeholder input

**Recommendation:** Remove button or repurpose for FR-135
- No discovery data supports a "Folders" tool
- If keeping, rename to "Chapter Tools" for FR-135 future use

---

## NFR-141: Lenient Tag Parser 🔴 **CRITICAL BLOCKER**

**Type:** Non-Functional Requirement
**Status:** Pending PO Approval (Decision 11)
**Discovery findings impact:** ✅ This IS the discovery

**Evidence:**
- 1422 tag validation errors (79% of ALL issues)
- 38 projects affected (81%)
- Root cause: Lowercase tags rejected by strict parser

**Solution:** Accept lowercase, convert to uppercase automatically
- ✅ Fixes 1422 errors instantly (zero user action)
- ✅ Matches user expectations
- ✅ Backwards compatible
- ✅ Simple code change (1 hour effort)

**Why this blocks FRs:**
- FR-138 already implemented with tag inputs
- Users will encounter 1422 validation errors when using FR-138
- Must fix parser before users can successfully rename files with tags

**Recommendation:** 🔴 **PRIORITY 0 - Implement immediately**

---

## Prioritized FR List

### Priority 0: BLOCKER (Must fix before any FR work)

| # | Requirement | Type | Effort | Impact | Status | Ready? |
|---|-------------|------|--------|--------|--------|--------|
| 1 | **NFR-141: Lenient Tag Parser** | NFR | 1.5h | Fixes 79% of issues | Needs PO approval | ⚠️ Needs Decision 11 |

**PO Action Required:** Approve Decision 11 (Tag Case Sensitivity)
- Recommended: Option A (Case-insensitive, auto-uppercase)
- Documented in: `docs/architecture/naming-decisions.md` lines 586-636

---

### Priority 1: HIGH (User-requested, data-validated)

| # | Requirement | Type | Effort | Impact | Status | Ready? |
|---|-------------|------|--------|--------|--------|--------|
| 2 | **FR-140: Bulk Chapter Renumbering** | FR | 7h | 12 projects (26%) | Needs scope definition | ❌ Not ready |

**PO Action Required:** Define FR-140 scope
1. Which modes? Fill gaps / Shift chapters / Both?
2. UI approach? New tool / Extend rename?
3. Preview requirements?

**Once defined:** Write full spec with acceptance criteria → Ready for dev

---

### Priority 2: MEDIUM (Nice-to-have, preventative UX)

| # | Requirement | Type | Effort | Impact | Status | Ready? |
|---|-------------|------|--------|--------|--------|--------|
| 3 | **FR-134: Inconsistency Detection** | FR | 3-5 days | Preventative warnings | Pending | ✅ Ready (PRD complete) |

**Why medium priority:**
- Gap detection useful but FR-140 is the actual fix
- Label mismatch warning is good UX but not critical
- Comprehensive PRD (lines 1-421)

---

### Priority 3: LOW (Data doesn't support need)

| # | Requirement | Type | Effort | Impact | Status | Ready? |
|---|-------------|------|--------|--------|--------|--------|
| 4 | **FR-135: Chapter Tools** | FR | 10-15 days | No evidence of need | Pending | ✅ Ready (PRD complete) |
| 5 | **FR-133: File Status Indicators** | FR | 5-8 days | Visibility tool | Pending | ✅ Ready (PRD complete) |

**Why low priority:**
- FR-135: Comprehensive spec (800+ lines) but 0 scanner issues show need
- FR-133: Nice-to-have visibility, but FR-136 regen buttons already solve missing derivatives
- Both well-specified but not urgent

---

### Priority 4: UNDEFINED (Remove or define)

| # | Requirement | Type | Effort | Impact | Status | Ready? |
|---|-------------|------|--------|--------|--------|--------|
| 6 | **FR-139: Folders Tool** | FR | 30min-15days | Unknown | Blocked | ❌ Needs definition |

**PO Action Required:** Choose path:
- **Path A:** Remove button (30 min) - simplest
- **Path B:** Rename to "Chapter Tools" for FR-135 future use (1 hour)
- **Path C:** Define new feature (unknown effort)

---

## Summary: What Needs Updates?

### FRs Needing Changes

**None.** All FRs are either complete (FR-138) or well-specified (FR-133/134/135/140).

### FRs Needing PO Decisions

1. ✅ **NFR-141** - Needs Decision 11 approval (30 min review)
2. ⚠️ **FR-140** - Needs scope definition (1 hour discussion)
3. ⚠️ **FR-139** - Needs path decision (remove/repurpose/define)

### FRs Ready for Dev (no changes needed)

- ✅ **FR-134** - Inconsistency Detection (PRD complete)
- ✅ **FR-135** - Chapter Tools (PRD complete, 800+ lines)
- ✅ **FR-133** - File Status Indicators (PRD complete)

---

## Recommended Execution Order

### Sprint 1: CRITICAL (1.5 hours dev + 1 hour UAT)

**Goal:** Fix 79% of all issues

1. **PO:** Approve NFR-141 (Decision 11) - 30 min
2. **Dev:** Implement NFR-141 (lenient tag parser) - 1.5 hours
3. **UAT:** Test NFR-141 - 1 hour

**Success metric:** Scanner shows 0 tag errors on test project

---

### Sprint 2: HIGH (7-8 hours dev + 1 hour UAT)

**Goal:** Address chapter gaps (26% of projects)

1. **PO:** Define FR-140 scope - 1 hour discussion
2. **PO:** Write full FR-140 spec with acceptance criteria - 2 hours
3. **Dev:** Implement FR-140 (bulk chapter renumbering) - 4 hours
4. **Dev:** Testing - 1 hour
5. **UAT:** Test FR-140 - 1 hour

**Success metric:** User can fill chapter gaps in one operation

---

### Sprint 3: MEDIUM (Optional - 3-5 days)

**Goal:** Add preventative warnings

1. **Dev:** Implement FR-134 (inconsistency detection) - 3-5 days
2. **UAT:** Test FR-134 - 1 day

**Success metric:** Users warned about label mismatches and chapter gaps

---

### Future: LOW (Optional - only if user requests)

**FR-135:** Chapter Tools (10-15 days)
**FR-133:** File Status Indicators (5-8 days)

---

## PO Action Items (Next Steps)

### Immediate (Required for Sprint 1)

1. **Review Decision 11** (`docs/architecture/naming-decisions.md` lines 586-636)
   - Approve Option A (case-insensitive, auto-uppercase) OR
   - Provide alternative direction
   - **Estimated time:** 30 minutes

2. **Review NFR-141 PRD** (`docs/prd/nfr-141-lenient-tag-parser.md`)
   - Confirm scope and acceptance criteria
   - Sign off for Sprint 1 implementation
   - **Estimated time:** 15 minutes

### Medium-term (Required for Sprint 2)

3. **Define FR-140 scope**
   - Answer 5 questions (modes, UI, preview, conflicts, implementation)
   - **Estimated time:** 1 hour discussion
   - **Deliverable:** Updated FR-140 PRD with full spec

4. **Decide on FR-139** (Folders Tool)
   - Choose: Remove / Repurpose / Define
   - **Estimated time:** 15 minutes
   - **Deliverable:** Updated FR-139 status

### Optional (For future sprints)

5. **Prioritize FR-133/134/135** if needed
   - All have complete PRDs
   - Can be implemented any time
   - No discovery blockers

---

## Discovery Plan Success Metrics

### What Discovery Achieved

✅ **Phase 1:** Inventoried 11 FRs
✅ **Phase 2:** Documented 11 naming decisions
✅ **Phase 3:** Scanned 47 projects, found 1805 issues
✅ **Phase 4:** Analyzed patterns, identified root cause (tag case)
✅ **Phase 5:** Created test scenarios and UAT checklist
✅ **Phase 6:** Created NFR-141, updated backlog
✅ **Phase 7:** Created execution plan (3 sprints)

### Key Insights

1. **Tag case mismatch is #1 issue** (79% of all problems)
2. **FR-138 is already complete** (no updates needed)
3. **FR-140 is validated by data** (chapter gaps in 26% of projects)
4. **FR-133/134/135 are low priority** (no strong evidence of need)

### Time Investment

- **Discovery:** ~8-10 hours (50% faster than estimated 15-22 hours)
- **ROI:** Identified critical blocker (NFR-141) that fixes 79% of issues in 1.5 hours

---

## Next Steps

### For PO (Today)

1. Read this document (15 min)
2. Approve Decision 11 for NFR-141 (15 min)
3. Review NFR-141 PRD (15 min)
4. Decide on FR-139 path (5 min)

**Total time:** 50 minutes

**Output:** Handover to dev for Sprint 1 (NFR-141)

---

### For Dev (After PO approval)

1. Wait for PO approval of NFR-141
2. Implement Sprint 1 (NFR-141) - 1.5 hours
3. Run UAT Sprint 1 - 1 hour
4. Wait for FR-140 scope definition
5. Implement Sprint 2 (FR-140) - 7 hours

**Total time:** 9.5 hours (Sprint 1 + Sprint 2)

---

**Last updated:** 2026-01-06
**Status:** Ready for PO review
