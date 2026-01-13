# UAT Checklist - Rename Operations

**Date:** 2026-01-06
**Phase:** 5 of 7 (Discovery Plan)
**Sprint:** To be determined

---

## Purpose

User Acceptance Testing checklist for rename operations, derived from real-world patterns found in 47 production projects.

---

## Pre-Test Setup

### Environment Checklist

- [ ] Test project created: `~/test-flihub-rename/`
- [ ] Sample files created (see `rename-test-scenarios.md`)
- [ ] Server running on port 5101
- [ ] Client running (Vite dev server)
- [ ] Browser DevTools open (Console tab)

### Test Data Verification

- [ ] Files with lowercase tags exist
- [ ] Files with chapter gaps exist (01, 03, 05)
- [ ] Files with sequence gaps exist (10-1, 10-3, 10-7)
- [ ] Valid control files exist (20-1-intro-CTA.mov)

---

## Sprint 1: Tag Case Handling (CRITICAL)

**Goal:** Fix 1422 errors affecting 81% of projects

### Feature: Lenient Tag Parser

#### Acceptance Criteria

- [ ] **AC1:** Parser accepts lowercase tags
- [ ] **AC2:** Parser converts lowercase to uppercase automatically
- [ ] **AC3:** No validation errors for lowercase tags
- [ ] **AC4:** Existing files parse correctly
- [ ] **AC5:** Renamed files have uppercase tags in filename

#### Test Cases

##### TC1.1: Single Lowercase Tag

- [ ] File: `01-1-intro-bmad.mov`
- [ ] **Given** file with lowercase tag `bmad`
- [ ] **When** I open Rename tool
- [ ] **Then** tag displays as `BMAD` (uppercase)
- [ ] **And** tag is pre-checked
- [ ] **And** preview shows `01-1-intro-BMAD.mov`
- [ ] **When** I click Rename
- [ ] **Then** file is renamed successfully
- [ ] **And** no validation errors occur

**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail
**Notes:** _____________________________

---

##### TC1.2: Multiple Lowercase Tags

- [ ] File: `03-1-analysis-project-brief-sdk.mov`
- [ ] **Given** file with tags `project`, `brief`, `sdk`
- [ ] **When** I open Rename tool
- [ ] **Then** tags display as `PROJECT`, `BRIEF`, `SDK`
- [ ] **And** all tags are pre-checked
- [ ] **And** preview shows uppercase tags

**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail
**Notes:** _____________________________

---

##### TC1.3: Mixed Case Tag

- [ ] File: `02-1-outro-CommunIty.mov`
- [ ] **Given** file with mixed-case tag `CommunIty`
- [ ] **When** I parse filename
- [ ] **Then** tag converts to `COMMUNITY`
- [ ] **And** preview shows `02-1-outro-COMMUNITY.mov`

**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail
**Notes:** _____________________________

---

### Feature: UI Uppercase Enforcement

#### Acceptance Criteria

- [ ] **AC6:** Custom tag input converts to uppercase as user types
- [ ] **AC7:** Visual feedback (all caps displayed)
- [ ] **AC8:** Saved tags are uppercase
- [ ] **AC9:** No manual uppercase conversion needed

#### Test Cases

##### TC1.4: User Types Lowercase Tag

- [ ] File: `20-1-intro-CTA.mov`
- [ ] **Given** I open Rename tool
- [ ] **When** I type "demo" in custom tag input (lowercase)
- [ ] **Then** input displays "DEMO" (uppercase)
- [ ] **When** I click Rename
- [ ] **Then** file saved as `20-1-intro-CTA-DEMO.mov`

**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail
**Notes:** _____________________________

---

### Regression Tests

##### TC1.5: Valid Uppercase Tags Still Work

- [ ] File: `20-1-intro-CTA.mov`
- [ ] **Given** file with valid uppercase tag `CTA`
- [ ] **When** I rename to new label
- [ ] **Then** tag remains `CTA`
- [ ] **And** rename succeeds without errors

**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail
**Notes:** _____________________________

---

##### TC1.6: Files Without Tags Still Work

- [ ] File: `21-1-demo.mov` (no tags)
- [ ] **Given** file without tags
- [ ] **When** I rename to new label
- [ ] **Then** rename succeeds
- [ ] **And** no tag-related errors

**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail
**Notes:** _____________________________

---

### Bulk Operation Tests

##### TC1.7: Bulk Rename with Lowercase Tags

- [ ] Files: `01-1-intro-bmad.mov`, `01-2-setup-code.mov`, `01-3-demo-project-brief.mov`
- [ ] **Given** I select all 3 files
- [ ] **When** I bulk rename to label "tutorial"
- [ ] **Then** all files renamed successfully
- [ ] **And** all tags converted to uppercase in filenames
- [ ] **And** preview showed correct uppercase tags

**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail
**Notes:** _____________________________

---

### Performance Test

##### TC1.8: Large Bulk Rename (100+ Files)

- [ ] Setup: Create 100 files with lowercase tags
- [ ] **Given** 100 files selected
- [ ] **When** I bulk rename
- [ ] **Then** operation completes in < 30 seconds
- [ ] **And** all tags converted to uppercase
- [ ] **And** no errors or timeouts

**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail
**Notes:** _____________________________

---

## Sprint 2: Bulk Chapter Renumbering (FR-140)

**Goal:** Address chapter gaps found in 26% of projects

### Feature: Fill Chapter Gaps

#### Acceptance Criteria

- [ ] **AC10:** Detect chapter gaps
- [ ] **AC11:** Offer "Fill gaps" option
- [ ] **AC12:** Preview changes before executing
- [ ] **AC13:** Renumber all chapters sequentially
- [ ] **AC14:** Preserve sequences within chapters

#### Test Cases

##### TC2.1: Fill Chapter Gaps

- [ ] Files: `01-1-intro.mov`, `03-1-setup.mov`, `05-1-demo.mov`
- [ ] **Given** files in chapters 01, 03, 05 (missing 02, 04)
- [ ] **When** I open "Renumber Chapters" tool (FR-140)
- [ ] **Then** tool detects gaps: "Missing chapters: 02, 04"
- [ ] **When** I select "Fill gaps" mode
- [ ] **Then** preview shows:
  - `01-1-intro.mov` → `01-1-intro.mov` (no change)
  - `03-1-setup.mov` → `02-1-setup.mov`
  - `05-1-demo.mov` → `03-1-demo.mov`
- [ ] **When** I confirm
- [ ] **Then** all files renumbered successfully
- [ ] **And** chapters are sequential: 01, 02, 03

**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail
**Notes:** _____________________________

---

##### TC2.2: Shift Chapters

- [ ] Files: `03-1-intro.mov`, `04-1-demo.mov`, `05-1-outro.mov`
- [ ] **Given** files in chapters 03, 04, 05
- [ ] **When** I select "Shift chapters" mode
- [ ] **And** I set target start: 02
- [ ] **Then** preview shows:
  - `03-1-intro.mov` → `02-1-intro.mov`
  - `04-1-demo.mov` → `03-1-demo.mov`
  - `05-1-outro.mov` → `04-1-outro.mov`
- [ ] **When** I confirm
- [ ] **Then** all files shifted successfully

**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail
**Notes:** _____________________________

---

### Feature: Renumber Sequences (FR-138 Existing)

#### Test Cases

##### TC2.3: Renumber Sequences within Chapter

- [ ] Files: `10-1-intro.mov`, `10-3-outro.mov`, `10-7-wrap.mov`
- [ ] **Given** files in chapter 10 with sequence gaps
- [ ] **When** I select all files in chapter 10
- [ ] **And** I open Rename tool
- [ ] **And** I choose "Renumber starting from 1"
- [ ] **Then** preview shows:
  - `10-1-intro.mov` → `10-1-intro.mov`
  - `10-3-outro.mov` → `10-2-outro.mov`
  - `10-7-wrap.mov` → `10-3-wrap.mov`
- [ ] **When** I confirm
- [ ] **Then** sequences are sequential: 1, 2, 3

**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail
**Notes:** _____________________________

---

## Sprint 3: Auto-Regenerate Missing Derivatives

**Goal:** Address 361 derivative issues across 26 projects

### Feature: Detect Missing Derivatives

#### Acceptance Criteria

- [ ] **AC15:** Scan for missing shadows
- [ ] **AC16:** Scan for missing transcripts
- [ ] **AC17:** Display count of missing derivatives
- [ ] **AC18:** Offer regeneration

#### Test Cases

##### TC3.1: Detect Missing Shadows

- [ ] Setup: Delete shadow for `20-1-intro-CTA.mov`
- [ ] **Given** recording exists but shadow missing
- [ ] **When** I open Manage panel
- [ ] **Then** file shows indicator: "Missing shadow"
- [ ] **When** I click "Regenerate Missing" button
- [ ] **Then** shadow regenerates instantly
- [ ] **And** indicator disappears

**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail
**Notes:** _____________________________

---

##### TC3.2: Detect Missing Transcripts

- [ ] Setup: Delete transcript for `20-2-demo-SKOOL.mov`
- [ ] **Given** recording exists but transcript missing
- [ ] **When** I view file status
- [ ] **Then** file shows indicator: "Missing transcript"
- [ ] **When** I click "Regenerate Missing"
- [ ] **Then** transcript queued
- [ ] **And** progress tracked via Socket.io

**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail
**Notes:** _____________________________

---

## Edge Cases & Validation

### Test Cases

##### TC4.1: Tag with Numbers

- [ ] **Question for PO:** Should tags allow numbers? (e.g., `N8N`)
- [ ] **If YES:**
  - [ ] File: `06-1-demo-n8n.mov`
  - [ ] **When** parsed
  - [ ] **Then** tag converts to `N8N`
- [ ] **If NO:**
  - [ ] **Then** validation error shown

**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail | ⏸️ Blocked (needs PO decision)
**Notes:** _____________________________

---

##### TC4.2: Empty Tag

- [ ] File: Create `08-1-intro-.mov` (trailing hyphen)
- [ ] **When** parsed
- [ ] **Then** empty tag is skipped
- [ ] **Or** validation error shown

**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail
**Notes:** _____________________________

---

## Integration Tests

##### TC5.1: Full Workflow (New Recording → Rename)

- [ ] **Given** new recording appears in watch directory
- [ ] **When** I name it: `15-1-intro-bmad-code` (lowercase tags)
- [ ] **Then** file appears in UI
- [ ] **When** I rename using Rename tool
- [ ] **Then** file renamed on disk: `15-1-intro-BMAD-CODE.mov`
- [ ] **And** shadow regenerated
- [ ] **And** transcript queued
- [ ] **And** state preserved (parked/annotation flags)

**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail
**Notes:** _____________________________

---

## Accessibility Tests

##### TC6.1: Keyboard Navigation

- [ ] **Given** Rename tool is open
- [ ] **When** I navigate using only keyboard
- [ ] **Then** I can:
  - [ ] Tab to chapter dropdown
  - [ ] Arrow through chapter options
  - [ ] Tab to tags section
  - [ ] Space to toggle tags
  - [ ] Tab to custom tag input
  - [ ] Enter to submit rename
- [ ] **And** focus indicators are visible
- [ ] **And** no mouse required

**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail
**Notes:** _____________________________

---

## Browser Compatibility

##### TC7.1: Chrome

- [ ] All Sprint 1 tests pass in Chrome
- [ ] No console errors

**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

##### TC7.2: Firefox

- [ ] All Sprint 1 tests pass in Firefox
- [ ] No console errors

**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

##### TC7.3: Safari

- [ ] All Sprint 1 tests pass in Safari
- [ ] No console errors

**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

---

## Sign-Off

### Sprint 1 Completion

- [ ] All Critical tests (TC1.1 - TC1.6) passed
- [ ] Bulk operation test (TC1.7) passed
- [ ] Performance test (TC1.8) passed
- [ ] No regression issues found
- [ ] Browser compatibility verified

**Tester Name:** _____________________________
**Date:** _____________________________
**Sign-off:** ⬜ Approved | ⬜ Rejected (see notes)

---

### Sprint 2 Completion

- [ ] Chapter gap detection works (TC2.1)
- [ ] Fill gaps functionality works (TC2.1)
- [ ] Shift chapters functionality works (TC2.2)
- [ ] Sequence renumbering works (TC2.3)
- [ ] Preview accurate before execution

**Tester Name:** _____________________________
**Date:** _____________________________
**Sign-off:** ⬜ Approved | ⬜ Rejected (see notes)

---

### Sprint 3 Completion

- [ ] Missing derivative detection works (TC3.1, TC3.2)
- [ ] Regeneration triggers correctly
- [ ] Progress tracking visible
- [ ] No performance issues

**Tester Name:** _____________________________
**Date:** _____________________________
**Sign-off:** ⬜ Approved | ⬜ Rejected (see notes)

---

## Known Issues

| Issue # | Description | Severity | Sprint | Status |
|---------|-------------|----------|--------|--------|
| | | | | |

---

## Test Environment

**Date Tested:** _____________________________
**Tester:** _____________________________
**Node Version:** _____________________________
**Browser:** _____________________________
**OS:** _____________________________

---

**Last updated:** 2026-01-06
