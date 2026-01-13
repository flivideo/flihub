# File Management Execution Plan

**Date:** 2026-01-06
**Phase:** 7 of 7 (Discovery Plan - FINAL)
**Based on:** Scanner analysis of 47 projects, 1805 issues

---

## Executive Summary

### Discovery Findings

- **47 projects scanned**
- **1805 issues found** across 42 projects (89%)
- **Critical finding:** 79% of issues (1422 errors) are tag case violations
- **Impact:** 38 projects (81%) affected by single root cause

### Recommended Approach

**3 Sprints:**
- **Sprint 1 (CRITICAL):** Fix tag parser - resolves 79% of all issues in 1.5 hours
- **Sprint 2 (HIGH):** Implement FR-140 bulk chapter renumbering - addresses 26% of projects
- **Sprint 3 (NICE-TO-HAVE):** Auto-regenerate missing derivatives - quality of life

---

## Sprint 1: Tag Case Handling (CRITICAL)

**Goal:** Fix 1422 errors affecting 38 projects (79% of all issues)

### Requirements

- **NFR-141:** Lenient Tag Parser (Uppercase Conversion)
- **Status:** Pending PO approval
- **Dependencies:** None
- **Risk:** Low

### Scope

#### 1.1: Lenient Parser Implementation

**File:** `shared/naming.ts`
**Change:** Accept lowercase/mixed-case tags, convert to uppercase

**Acceptance Criteria:**
- Parser accepts `bmad` → converts to `BMAD`
- Parser accepts `CommunIty` → converts to `COMMUNITY`
- Multiple tags: `project-brief-sdk` → `PROJECT-BRIEF-SDK`
- Invalid characters still rejected: `sdk-v2` → Error

**Effort:** 1 hour
**Developer:** 1 (solo task)

---

#### 1.2: UI Uppercase Enforcement

**File:** `client/src/components/shared/RenamePanel.tsx`
**Change:** Add `text-transform: uppercase` to tag inputs

**Acceptance Criteria:**
- User types "demo" → displays "DEMO"
- Saved tags are uppercase
- Placeholder shows uppercase examples

**Effort:** 30 minutes
**Developer:** 1 (solo task, can be done in parallel with 1.1)

---

#### 1.3: Testing & Verification

**Unit tests:** `shared/naming.test.ts`
**Integration tests:** See `rename-test-scenarios.md` TC1.1-TC1.7
**UAT:** See `uat-checklist-rename.md` Sprint 1

**Acceptance Criteria:**
- All unit tests pass
- All integration tests pass (TC1.1-TC1.7)
- UAT Sprint 1 approved
- Scanner shows 0 tag errors on test project

**Effort:** 1 hour
**Developer:** 1 (test execution) + 1 tester (UAT)

---

### Sprint 1 Timeline

| Task | Duration | Assignee | Dependencies |
|------|----------|----------|--------------|
| NFR-141 PO Approval | 30 min | PO | Decision 11 |
| Implement parser change | 1 hour | Dev | PO approval |
| Implement UI enforcement | 30 min | Dev | None (parallel) |
| Write unit tests | 30 min | Dev | Parser complete |
| Integration testing | 30 min | Dev | All code complete |
| UAT Sprint 1 | 1 hour | Tester | Integration tests pass |
| **TOTAL** | **3.5 hours** | | |

**Actual dev time:** 2 hours (parallel work)
**Calendar time:** 1 day (with testing)

---

### Sprint 1 Success Metrics

**Quantitative:**
- Scanner errors: 1422 → 0 (100% reduction)
- Projects affected: 38 → 0 (100% improvement)
- Validation error rate: ~79% → 0%

**Qualitative:**
- User feedback: "Tags work as expected now"
- Support tickets: Zero tag-related errors reported in first week

---

### Sprint 1 Deliverables

- [ ] Updated `shared/naming.ts` with lenient parser
- [ ] Updated `RenamePanel.tsx` with uppercase enforcement
- [ ] Unit tests passing
- [ ] Integration tests passing (TC1.1-TC1.7)
- [ ] UAT Sprint 1 approved
- [ ] Scanner verification: 0 tag errors
- [ ] Updated `naming-rules-reference.md` docs
- [ ] Updated `changelog.md`

---

## Sprint 2: Bulk Chapter Renumbering (HIGH)

**Goal:** Address chapter gaps found in 12 projects (26%)

### Requirements

- **FR-140:** Bulk Chapter Renumbering
- **Status:** Needs PO definition
- **Dependencies:** FR-130 (delete+regenerate pattern) - ✅ Complete
- **Risk:** Medium (complex preview logic, transcript regeneration)

### Scope

#### 2.1: FR-140 Specification Finalization

**Task:** PO defines scope for FR-140

**Questions to resolve:**
1. Fill gaps mode: `01, 03, 05` → `01, 02, 03`?
2. Shift chapters mode: `03, 04, 05` → `02, 03, 04`?
3. Both modes or just one?
4. Preview requirements?
5. Confirmation flow?

**Effort:** 1 hour (PO + Dev discussion)

---

#### 2.2: Chapter Renumbering Tool Implementation

**File:** `client/src/components/shared/ChapterRenumberPanel.tsx` (new)
**Backend:** Extend `server/src/routes/manage.ts` with renumber endpoint

**Acceptance Criteria:**
- Detect chapter gaps
- Preview all changes before execution
- Support "Fill gaps" mode (minimum)
- Support "Shift chapters" mode (optional)
- Use FR-130 pattern (delete+regenerate)
- Queue transcripts for regeneration
- Show progress via Socket.io

**Effort:** 3-4 hours
**Developer:** 1

---

#### 2.3: Testing & Verification

**Integration tests:** See `rename-test-scenarios.md` TC2.1-TC2.2
**UAT:** See `uat-checklist-rename.md` Sprint 2

**Effort:** 1-2 hours

---

### Sprint 2 Timeline

| Task | Duration | Assignee | Dependencies |
|------|----------|----------|--------------|
| FR-140 PO definition | 1 hour | PO + Dev | Decision 1 (chapter gaps) |
| Implement renumber tool | 4 hours | Dev | PO approval |
| Integration testing | 1 hour | Dev | Code complete |
| UAT Sprint 2 | 1 hour | Tester | Integration tests pass |
| **TOTAL** | **7 hours** | | |

**Calendar time:** 2-3 days

---

### Sprint 2 Success Metrics

**Quantitative:**
- Chapter gaps detected: 22 instances across 12 projects
- User operations: Fill gaps in X projects
- Time saved: Avoid manual multi-step renames

**Qualitative:**
- User feedback: "Chapter renumbering is straightforward"
- Addresses pain point from FR-138 testing

---

### Sprint 2 Deliverables

- [ ] FR-140 fully specified (PO sign-off)
- [ ] ChapterRenumberPanel component (or similar UI)
- [ ] Backend renumber endpoint
- [ ] Integration tests passing (TC2.1-TC2.2)
- [ ] UAT Sprint 2 approved
- [ ] Updated `changelog.md`

---

## Sprint 3: Auto-Regenerate Missing Derivatives (NICE-TO-HAVE)

**Goal:** Address 361 derivative issues across 26 projects

### Requirements

- **New FR (optional):** Auto-Detect & Regenerate Missing Derivatives
- **Status:** Not yet created
- **Dependencies:** FR-136 (regen endpoints) - ✅ Complete
- **Risk:** Low

### Scope

#### 3.1: Missing Derivative Detection

**File:** Add detection logic to `server/src/routes/manage.ts`

**Acceptance Criteria:**
- Scan for missing shadows (recording exists, shadow missing)
- Scan for missing transcripts (recording exists, transcript missing)
- Return count and file list

**Effort:** 1 hour

---

#### 3.2: Regeneration UI

**File:** Add "Regenerate Missing" button to Manage panel

**Acceptance Criteria:**
- Display count of missing derivatives
- Click button to queue regeneration
- Show progress via Socket.io

**Effort:** 1 hour

---

#### 3.3: Testing & Verification

**Integration tests:** See `rename-test-scenarios.md` TC3.1-TC3.2
**UAT:** See `uat-checklist-rename.md` Sprint 3

**Effort:** 1 hour

---

### Sprint 3 Timeline

| Task | Duration | Assignee | Dependencies |
|------|----------|----------|--------------|
| Detection logic | 1 hour | Dev | None |
| Regeneration UI | 1 hour | Dev | Detection logic |
| Integration testing | 30 min | Dev | Code complete |
| UAT Sprint 3 | 30 min | Tester | Integration tests pass |
| **TOTAL** | **3 hours** | | |

**Calendar time:** 1 day

---

### Sprint 3 Success Metrics

**Quantitative:**
- Missing derivatives detected: 361 instances
- Regenerations triggered: X files

**Qualitative:**
- User feedback: "Nice to have one-click regeneration"

---

### Sprint 3 Deliverables

- [ ] Detection logic implemented
- [ ] "Regenerate Missing" UI added
- [ ] Integration tests passing (TC3.1-TC3.2)
- [ ] UAT Sprint 3 approved
- [ ] Updated `changelog.md`

---

## Overall Timeline

### Sequential Execution

| Sprint | Duration | Calendar Time | Start After |
|--------|----------|---------------|-------------|
| Sprint 1 | 3.5 hours | 1 day | PO approval |
| Sprint 2 | 7 hours | 2-3 days | Sprint 1 complete |
| Sprint 3 | 3 hours | 1 day | Sprint 2 complete |
| **TOTAL** | **13.5 hours** | **4-5 days** | |

---

### Parallel Execution (Optimized)

| Sprint | Dev Hours | Calendar Days | Notes |
|--------|-----------|---------------|-------|
| Sprint 1 | 2 hours | 1 day | Parser + UI in parallel, then testing |
| Sprint 2 | 4 hours | 2 days | Includes PO definition time |
| Sprint 3 | 2 hours | 1 day | Can start while Sprint 2 in UAT |
| **TOTAL** | **8 hours** | **3-4 days** | Optimized with parallelization |

---

## Resource Requirements

### Developers

- **1 full-time developer** for Sprints 1-3
- **OR 2 developers** (Sprint 1 + Sprint 2/3 in parallel)

### Product Owner

- **Decision 11 approval:** 30 minutes (Sprint 1 blocker)
- **FR-140 definition:** 1 hour (Sprint 2 blocker)
- **Total PO time:** 1.5 hours

### Testers

- **UAT Sprint 1:** 1 hour
- **UAT Sprint 2:** 1 hour
- **UAT Sprint 3:** 30 minutes
- **Total tester time:** 2.5 hours

---

## Dependencies & Blockers

### Sprint 1 Blockers

- ❌ **PO approval of Decision 11** (Tag case sensitivity)
  - Required before implementation
  - Estimated approval time: 30 minutes

### Sprint 2 Blockers

- ❌ **PO definition of FR-140** (Bulk chapter renumbering scope)
  - Required before implementation
  - Estimated definition time: 1 hour
- ⚠️ **Decision 1 approval** (Chapter gaps intentional or error?)
  - Informational, not blocking

### Sprint 3 Blockers

- None (all dependencies met)

---

## Risks & Mitigation

### Risk 1: Tag Conversion Breaks Existing Code

**Likelihood:** Low
**Impact:** Medium

**Mitigation:**
- Comprehensive unit tests
- Integration tests with real files
- Scanner verification before release

---

### Risk 2: FR-140 Scope Creep

**Likelihood:** Medium
**Impact:** High

**Mitigation:**
- Clear PO definition upfront
- Minimum viable features first (Fill gaps mode only)
- Defer "Shift chapters" to future if complex

---

### Risk 3: Transcript Regeneration Time

**Likelihood:** High (if many chapters renumbered)
**Impact:** Low (user aware, queued)

**Mitigation:**
- Clear warning before execution
- Progress tracking via Socket.io
- FR-132 (dual transcription) can help in future

---

## Success Criteria

### Sprint 1 Complete When:

- [ ] NFR-141 implemented and tested
- [ ] Scanner shows 0 tag errors on test project
- [ ] UAT Sprint 1 approved
- [ ] Zero user-reported tag errors in first week

---

### Sprint 2 Complete When:

- [ ] FR-140 fully implemented
- [ ] Chapter gaps can be filled in test project
- [ ] UAT Sprint 2 approved
- [ ] User feedback: "Chapter renumbering works as expected"

---

### Sprint 3 Complete When:

- [ ] Missing derivative detection works
- [ ] Regeneration triggered successfully
- [ ] UAT Sprint 3 approved

---

### Overall Project Complete When:

- [ ] All 3 sprints complete
- [ ] All UAT checklists approved
- [ ] Scanner verification: Significant reduction in errors (1805 → <400 expected)
- [ ] Documentation updated
- [ ] Changelog updated
- [ ] No critical bugs reported in first 2 weeks

---

## Post-Release Plan

### Week 1: Monitoring

- [ ] Monitor scanner results on real projects
- [ ] Track user-reported issues
- [ ] Verify tag conversion working as expected

### Week 2: Optimization

- [ ] Review user feedback
- [ ] Optimize slow operations
- [ ] Fix any edge cases discovered

### Week 3: Retrospective

- [ ] Document lessons learned
- [ ] Update scanner for new discrepancy types
- [ ] Plan next discovery cycle (if needed)

---

## Future Enhancements (Out of Scope)

Based on scanner results, these are lower priority:

1. **FR-134:** Inconsistency Detection & Auto-Fix
   - Detect duplicates, invalid formats
   - Auto-fix simple issues

2. **FR-135:** Chapter Tools (Move, Swap, Undo)
   - Move files between chapters
   - Swap entire chapters
   - Undo operations

3. **FR-133:** File Status Indicators
   - Visual indicators for file states
   - Color-coded rows

---

## Discovery Plan Summary

### 7 Phases Completed

1. ✅ **Inventory:** 11 FRs reviewed, capabilities documented
2. ✅ **Rules:** Comprehensive naming rules documented, 11 decisions identified
3. ✅ **Scanner:** Built scanner script, ran on 47 projects
4. ✅ **Analysis:** Pattern analysis, impact assessment
5. ✅ **Test Scenarios:** Created test scenarios and UAT checklist
6. ✅ **Requirements:** Created NFR-141, updated backlog, documented Decision 11
7. ✅ **Execution Plan:** This document

### Total Discovery Time

**Actual:** ~8-10 hours (compressed)
**Estimated:** 15-22 hours
**Efficiency:** 50% time saved through automation and parallel work

---

## Deliverables Index

### Documentation Created

1. **Phase 1:** `docs/analysis/existing-requirements-inventory.md`
2. **Phase 2:** `docs/architecture/naming-rules-reference.md`
3. **Phase 2:** `docs/architecture/naming-decisions.md` (+ Decision 11)
4. **Phase 3:** `server/src/scripts/scanProjects.ts` (scanner script)
5. **Phase 3:** `docs/analysis/HOW-TO-RUN-SCANNER.md`
6. **Phase 3:** Scanner results (JSON, CSV, Markdown)
7. **Phase 4:** `docs/analysis/pattern-analysis.md`
8. **Phase 5:** `docs/testing/rename-test-scenarios.md`
9. **Phase 5:** `docs/testing/uat-checklist-rename.md`
10. **Phase 6:** `docs/prd/nfr-141-lenient-tag-parser.md`
11. **Phase 7:** `docs/planning/file-management-execution-plan.md` (this document)

---

## Next Steps

### Immediate (PO)

1. **Review Decision 11** (`naming-decisions.md`)
   - Approve Option A (case-insensitive, recommended)
   - OR provide alternative direction

2. **Review NFR-141** (`nfr-141-lenient-tag-parser.md`)
   - Approve for Sprint 1
   - Confirm scope and acceptance criteria

3. **Define FR-140 scope**
   - Fill gaps mode? Shift chapters mode? Both?
   - Preview requirements
   - Confirmation flow

---

### Immediate (Developer)

1. **Wait for PO approval** of Decision 11
2. **Implement Sprint 1** (NFR-141)
   - Update parser
   - Update UI
   - Write tests
3. **Run UAT Sprint 1**
4. **Proceed to Sprint 2** (after FR-140 definition)

---

**Last updated:** 2026-01-06
**Status:** READY FOR PO REVIEW
