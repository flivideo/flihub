# File Management Discovery Plan

**Date:** 2026-01-06
**Type:** Discovery & Analysis
**Goal:** Understand all use cases for file/folder management by analyzing existing requirements, rules, and real-world project data

---

## Executive Summary

Before building more file management features, we need to:
1. **Inventory** what requirements/features already exist
2. **Document** the rules for naming and organization
3. **Scan** all ~45 projects for discrepancies
4. **Analyze** patterns and common problems
5. **Define** test scenarios and new requirements

**Output:** Data-driven requirements backlog based on real user problems.

---

## Three-Source Analysis Approach

### Source 1: Existing Requirements & Features

**What do we already have planned/built?**

Review all FRs related to:
- File/folder management
- Renaming (bulk, individual, chapter-level)
- Reordering (chapter renumbering, sequence renumbering)
- Splitting (if any)
- Deletion (indirect effects on renaming)

### Source 2: The Rules (Ground Truth)

**What are the patterns we expect to follow?**

Document comprehensive rules for:
- Chapter numbering (format, range, sequencing)
- Sequence numbering (format, sequencing, gaps)
- Label formatting (kebab-case, constraints)
- Tags (format, allowed values, positioning)
- Folder structure (recordings, shadows, transcripts, etc.)

### Source 3: Real-World Data

**What's actually happening in the 45 projects?**

Scan every project for:
- Pattern violations
- Missing files
- Orphaned files
- Naming inconsistencies
- Structural problems

---

## Phase 1: Inventory Existing Requirements

**Duration:** 1-2 hours
**Owner:** PO (with dev support)

### Task 1.1: Review Implemented Features

**FRs to review:**
- ✅ **FR-130:** Simplify Rename Logic (delete+regenerate pattern)
- ✅ **FR-131:** Manage Panel with Bulk Rename
- ✅ **FR-136-138:** Tool-Oriented Manage Panel, Rename Tool
- ⏳ **FR-133:** File Status Indicators (pending)
- ⏳ **FR-134:** Inconsistency Detection & Auto-Fix (pending)
- ⏳ **FR-135:** Chapter Tools - Move, Swap, Undo (pending)
- ❓ **FR-139:** Folders Tool (blocked - needs definition)
- ❓ **FR-140:** Bulk Chapter Renumbering (pending PO definition)

**Questions to answer:**
1. What file operations can we do today?
2. What file operations are planned but not built?
3. What gaps exist?

**Output:** `docs/analysis/existing-requirements-inventory.md`
- Summary table: FR | Status | Capabilities | Gaps
- Relationship map: How FRs relate to each other

---

### Task 1.2: Review Related Architecture

**Documents to review:**
- `shared/naming.ts` - Validation rules and parsing logic
- `docs/architecture/patterns.md` - Code conventions
- `docs/prd/fr-137-slideout-drawer-pattern.md` - UI patterns
- `server/src/utils/renameRecording.ts` - Rename logic

**Questions to answer:**
1. What naming rules are enforced in code?
2. What operations are technically possible but not exposed in UI?
3. What constraints exist (e.g., can't rename if transcription active)?

**Output:** Add section to inventory document

---

## Phase 2: Document The Rules

**Duration:** 2-3 hours
**Owner:** PO + Dev (collaborative)

### Task 2.1: Naming Rules Reference

Create comprehensive rules document: `docs/architecture/naming-rules-reference.md`

**Content:**

**1. Chapter Numbering**
- Format: 2 digits, zero-padded (01-99)
- Valid: 01, 02, ..., 99
- Invalid: 1, 001, 00, 100
- Sequencing: Should be sequential, gaps allowed?
- Edge cases: What if chapter 02 is deleted?

**2. Sequence Numbering**
- Format: 1+ digits, no zero-padding (1, 2, 3, ...)
- Valid: 1, 2, 10, 123
- Invalid: 01, 001
- Sequencing: Should be sequential within chapter, gaps allowed?
- Edge cases: What if sequence 2 is deleted?

**3. Label Formatting**
- Format: kebab-case (lowercase, hyphens, numbers)
- Valid: intro, setup-demo, build-server-api
- Invalid: Intro, setup_demo, BuildServer
- Constraints: Max 50 chars, no consecutive hyphens
- Edge cases: Can labels change? (yes, that's renaming)

**4. Tags (CTAs)**
- Format: Uppercase letters only (CTA, SKOOL, DEMO)
- Valid: CTA, INTRO, API
- Invalid: cta, Cta, CTA123
- Positioning: After label, before .mov extension
- Multiple: Allowed (CTA-SKOOL-DEMO)
- Constraints: Max 5 tags?

**5. Filename Format**
- Pattern: `{chapter}-{sequence}-{label}-{tags}.mov`
- With tags: `05-3-setup-demo-CTA-SKOOL.mov`
- Without tags: `05-3-setup-demo.mov`
- Extension: .mov or .mp4

**6. Folder Structure**
- `recordings/` - Main videos
- `recordings/-safe/` - Protected (deprecated? check FR-111)
- `recordings/-chapters/` - Generated chapter videos
- `recording-shadows/` - Low-res previews
- `recording-transcripts/` - Whisper outputs (.txt, .srt, .json, .vtt, .tsv)
- `inbox/` - Incoming content staging
- `assets/images/` - Image assets
- `assets/thumbs/` - Thumbnails
- `final/` - Final edited video
- `s3-staging/` - Editor collaboration

**Output:** Complete rules reference document

---

### Task 2.2: Decision Matrix

Create decision matrix: `docs/architecture/naming-decisions.md`

**Questions to answer:**

| Question | Current State | Decision Needed? |
|----------|---------------|------------------|
| Are chapter gaps allowed? (01, 03, 05) | ? | Yes / No / User choice |
| Are sequence gaps allowed? (1, 3, 7) | ? | Yes / No / User choice |
| Can files exist without sequence? (01-intro.mov) | Yes (old format) | Migrate or support both? |
| Can labels be duplicated in same chapter? | ? | Yes / No |
| Can same label exist across chapters? | Yes | Keep or warn? |
| What happens to -safe folder? (FR-111) | State-based now | Remove physical folder? |
| Are transcripts required for all files? | No (queued async) | Should we warn if missing? |
| Are shadows required for all files? | No (can regenerate) | Should we warn if missing? |

**Output:** Documented decisions for each question

---

## Phase 3: Scan All Projects

**Duration:** 4-6 hours (mostly automated)
**Owner:** Dev (script creation) + PO (analysis)

### Task 3.1: Create Discrepancy Scanner Script

Create automated scanner: `server/src/scripts/scanProjects.ts`

**What to detect:**

**Naming Violations:**
1. ❌ Invalid chapter format (single digit, 000, 100+)
2. ❌ Invalid sequence format (leading zeros, non-numeric)
3. ❌ Invalid label (uppercase, underscores, spaces)
4. ❌ Invalid tags (lowercase, numbers, special chars)
5. ❌ Unparseable filenames (don't match pattern)

**Structural Issues:**
6. ⚠️ Chapter gaps (01, 03, 05 - missing 02, 04)
7. ⚠️ Sequence gaps (1, 3, 7 - missing 2, 4, 5, 6)
8. ⚠️ Duplicate sequences (same chapter-sequence twice)
9. ⚠️ Non-sequential chapters (05, 03, 07, 01)
10. ⚠️ Sequence doesn't restart at 1 for each chapter

**Derivative Mismatches:**
11. 🔍 Orphaned shadows (shadow exists, no source recording)
12. 🔍 Missing shadows (source exists, no shadow)
13. 🔍 Orphaned transcripts (transcript exists, no source)
14. 🔍 Missing transcripts (source exists, no transcript)
15. 🔍 Chapter videos without source files

**State Inconsistencies:**
16. 🔍 Files in -safe folder (should be state-based now)
17. 🔍 Parked files without annotation
18. 🔍 Manifest references missing files

**Output:**
```typescript
interface ProjectDiscrepancy {
  projectCode: string
  projectPath: string
  type: 'naming' | 'structural' | 'derivative' | 'state'
  severity: 'error' | 'warning' | 'info'
  issue: string
  file?: string
  suggestion?: string
}
```

---

### Task 3.2: Run Scanner on All Projects

**Execution:**
```bash
# Run scanner
npm run scan-projects

# Output formats
- JSON: docs/analysis/discrepancies.json
- CSV: docs/analysis/discrepancies.csv
- Markdown: docs/analysis/project-discrepancies.md
```

**Expected output structure:**

```markdown
# Project Discrepancy Report

**Scan Date:** 2026-01-06
**Projects Scanned:** 45
**Projects with Issues:** TBD
**Total Issues Found:** TBD

## Summary by Type

| Type | Count | Projects Affected |
|------|-------|-------------------|
| Naming Violations | ? | ? |
| Structural Issues | ? | ? |
| Derivative Mismatches | ? | ? |
| State Inconsistencies | ? | ? |

## Summary by Severity

| Severity | Count | Description |
|----------|-------|-------------|
| ❌ Error | ? | Blocks operations, must fix |
| ⚠️ Warning | ? | Should fix, but non-blocking |
| 🔍 Info | ? | Informational, may be intentional |

## Projects with Issues

### b59-n8n-digital-ocean (5 issues)

**Chapter Gaps (Warning)**
- Missing chapters: 02, 04
- Current: 01, 03, 05, 06
- Suggestion: Renumber to fill gaps? Or leave as-is?

**Duplicate Sequence (Error)**
- Files: 03-1-intro.mov, 03-1-setup.mov
- Suggestion: Rename one to 03-2-setup.mov

**Missing Transcript (Info)**
- File: 05-3-demo.mov
- Suggestion: Queue transcription

...

### c10-poem-epic-3 (0 issues)
✅ No issues found

...
```

---

### Task 3.3: Manual Review & Categorization

**PO reviews report and categorizes each issue:**

**Category A: Auto-Fixable**
- Clear solution, no user decision needed
- Example: "03-01-intro.mov" → rename to "03-1-intro.mov"

**Category B: User Decision Required**
- Multiple valid solutions
- Example: Chapter gaps - fill or keep?

**Category C: Benign / Intentional**
- Not actually a problem
- Example: Intentional gap (deleted chapter 02 because content was bad)

**Category D: Requires New Feature**
- Can't be fixed with existing tools
- Example: Bulk chapter renumbering

**Output:** Updated report with categories and priorities

---

## Phase 4: Pattern Analysis

**Duration:** 2-3 hours
**Owner:** PO

### Task 4.1: Identify Common Patterns

**Questions to answer:**
1. What's the most common discrepancy type?
2. How many projects have chapter gaps?
3. How many have sequence gaps?
4. Are there patterns in specific project types? (e.g., early projects vs recent)
5. Which issues affect the most projects?

**Output:** `docs/analysis/common-patterns.md`

**Example insights:**
- "35 of 45 projects have chapter gaps"
- "Chapter gaps are intentional (deleted bad content)"
- "Sequence gaps are rare (only 3 projects)"
- "15 projects missing transcripts (queued but not finished)"

---

### Task 4.2: Impact Assessment

**For each discrepancy type, assess:**

| Issue | Projects Affected | Blocking? | User Pain | Fix Effort |
|-------|-------------------|-----------|-----------|------------|
| Chapter gaps | 35 | No | Low (intentional) | N/A |
| Duplicate sequences | 3 | Yes | High | Low (rename) |
| Invalid labels (uppercase) | 8 | No | Medium | Low (auto-fix) |
| Missing transcripts | 15 | No | Low (in progress) | N/A |
| Orphaned shadows | 2 | No | Low | Low (delete) |

**Output:** Prioritized list of issues to address

---

## Phase 5: Test Scenario Definition

**Duration:** 2-3 hours
**Owner:** PO + UAT

### Task 5.1: Create Test Projects

**From real discrepancies, create test projects:**

**Test Project 1: Chapter Gaps**
- Files: 01-1-intro.mov, 03-1-setup.mov, 05-1-demo.mov
- Missing: 02, 04
- Test scenarios:
  - Can I rename 03 → 02?
  - Can I renumber all (fill gaps)?
  - Does preview show correctly?

**Test Project 2: Duplicate Sequences**
- Files: 03-1-intro.mov, 03-1-setup.mov (conflict!)
- Test scenarios:
  - What happens if I try to rename?
  - Does validation catch this?
  - Can I auto-renumber to fix?

**Test Project 3: Mixed Issues**
- Multiple types of discrepancies
- Test: Does scanner report all issues?

**Output:**
- `test-data/` folder with test projects
- `docs/testing/rename-test-scenarios.md`

---

### Task 5.2: UAT Checklist

Create checklist: `docs/testing/uat-checklist-rename.md`

**For each test scenario:**
1. Setup: How to reproduce
2. Expected behavior: What should happen
3. Acceptance criteria: What defines success
4. Edge cases: What to watch for

---

## Phase 6: Requirements Definition

**Duration:** 3-4 hours
**Owner:** PO

### Task 6.1: Map Issues to Requirements

**Based on analysis, define new FRs or update existing:**

**Example mapping:**

| Issue Type | Affected Projects | Solution | FR |
|------------|-------------------|----------|-----|
| Chapter gaps | 35 | User education (intentional) | Update docs |
| Duplicate sequences | 3 | Validation + auto-fix | FR-141: Duplicate Detection |
| Invalid labels | 8 | Auto-fix on rename | Update FR-138 |
| Bulk renumbering | User request | New tool | FR-140 (already created) |
| Orphaned files | 2 | Cleanup tool | FR-142: Orphan Cleanup |

---

### Task 6.2: Prioritize Requirements

**Prioritization matrix:**

| FR | Projects Affected | User Pain | Implementation Effort | Priority |
|----|-------------------|-----------|----------------------|----------|
| FR-141: Duplicate Detection | 3 | High | Low | P0 (Critical) |
| FR-140: Bulk Renumbering | User request | Medium | Medium | P1 (High) |
| FR-142: Orphan Cleanup | 2 | Low | Low | P2 (Nice to have) |
| FR-138 enhancements | 8 | Medium | Low | P1 (High) |

**Output:** Updated backlog.md with prioritized FRs

---

### Task 6.3: Write/Update PRDs

**For each new FR:**
1. User story
2. Problem statement (backed by data from scan)
3. Solution approach
4. Acceptance criteria
5. Technical notes

**Example:**

```markdown
# FR-141: Duplicate Sequence Detection & Auto-Fix

## Problem (Data-Driven)

**Scan results:** 3 of 45 projects have duplicate sequences
- b12-project-alpha: 03-1 appears twice
- c05-project-beta: 07-2 appears twice
- b22-project-gamma: 01-1 appears twice

**User impact:**
- Cannot rename files (conflict error)
- Unclear which file is "correct"
- Manual fix is tedious

## Solution

Auto-detect and offer to fix...
```

---

## Phase 7: Execution Plan

**Duration:** 1 hour
**Owner:** PO + Dev

### Task 7.1: Sprint Planning

**Based on prioritized backlog, plan implementation:**

**Sprint 1 (Critical):**
- FR-141: Duplicate Detection
- FR-138 enhancements (validation improvements)

**Sprint 2 (High):**
- FR-140: Bulk Chapter Renumbering
- FR-142: Orphan Cleanup

**Sprint 3 (Nice to have):**
- FR-134: Inconsistency Detection (expanded scope based on learnings)
- FR-135: Chapter Tools (move, swap)

---

### Task 7.2: Success Metrics

**Define success criteria:**

1. **Coverage:** X% of discrepancies have tool-based solutions
2. **Reduction:** Y% reduction in manual file operations
3. **User satisfaction:** Positive UAT feedback on new tools
4. **Data validation:** Re-scan after fixes shows improvement

---

## Timeline & Resource Allocation

| Phase | Duration | Owner | Dependencies |
|-------|----------|-------|--------------|
| 1. Inventory | 1-2 hours | PO + Dev | None |
| 2. Rules Documentation | 2-3 hours | PO + Dev | Phase 1 |
| 3. Project Scanning | 4-6 hours | Dev + PO | Phase 2 |
| 4. Pattern Analysis | 2-3 hours | PO | Phase 3 |
| 5. Test Scenarios | 2-3 hours | PO + UAT | Phase 4 |
| 6. Requirements Definition | 3-4 hours | PO | Phase 5 |
| 7. Execution Planning | 1 hour | PO + Dev | Phase 6 |
| **Total** | **15-22 hours** | | |

**Suggested approach:**
- **Week 1:** Phases 1-3 (inventory, rules, scanning)
- **Week 2:** Phases 4-5 (analysis, test scenarios)
- **Week 3:** Phases 6-7 (requirements, planning)

---

## Deliverables Checklist

**Phase 1:**
- [ ] `docs/analysis/existing-requirements-inventory.md`

**Phase 2:**
- [ ] `docs/architecture/naming-rules-reference.md`
- [ ] `docs/architecture/naming-decisions.md`

**Phase 3:**
- [ ] `server/src/scripts/scanProjects.ts` (scanner script)
- [ ] `docs/analysis/discrepancies.json` (raw data)
- [ ] `docs/analysis/discrepancies.csv` (spreadsheet)
- [ ] `docs/analysis/project-discrepancies.md` (formatted report)

**Phase 4:**
- [ ] `docs/analysis/common-patterns.md`
- [ ] `docs/analysis/impact-assessment.md`

**Phase 5:**
- [ ] `test-data/` (test projects)
- [ ] `docs/testing/rename-test-scenarios.md`
- [ ] `docs/testing/uat-checklist-rename.md`

**Phase 6:**
- [ ] Updated `docs/backlog.md` with new/updated FRs
- [ ] New PRD files for each FR
- [ ] Prioritization matrix

**Phase 7:**
- [ ] Sprint plan
- [ ] Success metrics definition

---

## Next Steps

**Immediate actions:**

1. **PO:** Review this plan, adjust as needed
2. **PO + Dev:** Align on Phase 1 start date
3. **Dev:** Start creating scanner script (Phase 3.1) - can run in parallel with Phases 1-2
4. **PO:** Begin Phase 1 (inventory) while dev works on scanner

**Decision needed:**
- Should we execute this discovery plan before building more features?
- Or should we prioritize FR-138 UAT testing first?

---

**Last updated:** 2026-01-06
