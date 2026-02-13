# Rename Test Scenarios

**Date:** 2026-01-06
**Phase:** 5 of 7 (Discovery Plan)
**Based on:** Real-world patterns from 47 projects

---

## Purpose

Test scenarios derived from actual discrepancies found in production projects. These scenarios ensure rename operations handle real-world edge cases.

---

## Test Data Setup

### Create Test Project

```bash
mkdir -p ~/test-flihub-rename/recordings
cd ~/test-flihub-rename
```

### Scenario Files

Create these files to test each pattern:

```bash
# Pattern 1: Lowercase tags (CRITICAL - 1422 instances)
touch recordings/01-1-intro-bmad.mov
touch recordings/01-2-setup-code.mov
touch recordings/01-3-demo-project-brief.mov

# Pattern 2: Mixed case tags
touch recordings/02-1-outro-CommunIty.mov
touch recordings/02-2-wrap-pRd.mov

# Pattern 3: Multiple lowercase tags
touch recordings/03-1-analysis-project-brief-sdk.mov

# Pattern 4: Chapter gaps (26% of projects)
touch recordings/01-1-intro.mov
touch recordings/03-1-setup.mov
touch recordings/05-1-demo.mov
# Missing: 02, 04

# Pattern 5: Sequence gaps
touch recordings/10-1-intro.mov
touch recordings/10-3-outro.mov
touch recordings/10-7-wrap.mov
# Missing: 2, 4, 5, 6

# Pattern 6: Valid files (control)
touch recordings/20-1-intro-CTA.mov
touch recordings/20-2-demo-SKOOL.mov
```

---

## Test Scenario 1: Lowercase Tags (CRITICAL)

### Background

**Pattern found:** 1422 errors across 38 projects (81%)
**Root cause:** Users type lowercase tags, parser rejects

### Test Case 1.1: Single Lowercase Tag

**File:** `01-1-intro-bmad.mov`
**Expected:** Tag should be converted to `BMAD` automatically
**Current behavior:** Validation error

#### Test Steps

1. Open Manage panel
2. Select `01-1-intro-bmad.mov`
3. Click Rename tool
4. Observe pre-filled tags

**Expected Result (AFTER FIX):**

- Tags checkbox shows: `BMAD` (uppercase, checked)
- File preview shows: `01-1-intro-BMAD.mov`
- No validation errors

**Current Result (BEFORE FIX):**

- Validation error: "Tag 'bmad' must be uppercase"
- Rename blocked

---

### Test Case 1.2: Multiple Lowercase Tags

**File:** `03-1-analysis-project-brief-sdk.mov`
**Tags:** `project`, `brief`, `sdk`

#### Test Steps

1. Select file
2. Open Rename tool
3. Observe tag handling

**Expected Result (AFTER FIX):**

- Tags show: `PROJECT`, `BRIEF`, `SDK` (all uppercase)
- All checked
- Preview correct

---

### Test Case 1.3: Mixed Case Tag

**File:** `02-1-outro-CommunIty.mov`
**Tag:** `CommunIty` (mixed case)

#### Test Steps

1. Select file
2. Open Rename tool

**Expected Result (AFTER FIX):**

- Tag shows: `COMMUNITY` (fully uppercase)
- Preview: `02-1-outro-COMMUNITY.mov`

---

### Test Case 1.4: User Types New Lowercase Tag

**Action:** User manually types new lowercase tag in custom tag input

#### Test Steps

1. Select `20-1-intro-CTA.mov`
2. Open Rename tool
3. Type new tag: `demo` (lowercase)
4. Click Rename

**Expected Result (AFTER FIX):**

- Input auto-converts to `DEMO` as user types (CSS text-transform)
- Saved as uppercase
- No validation error

---

## Test Scenario 2: Chapter Gaps (MEDIUM)

### Background

**Pattern found:** 22 instances across 12 projects (26%)
**User feedback:** "I don't see chapter 2, so it feels like I've got to move chapter 2 up to chapter 3"

### Test Case 2.1: Detect Chapter Gaps

**Files:**

- `01-1-intro.mov`
- `03-1-setup.mov`
- `05-1-demo.mov`

#### Test Steps

1. Open Manage panel
2. View chapter list

**Expected Result:**

- Chapter 01 displayed
- Chapter 03 displayed (gap indicator?)
- Chapter 05 displayed (gap indicator?)
- **Future:** Message: "Missing chapters: 02, 04"

---

### Test Case 2.2: Fill Chapter Gaps (FR-140)

**Action:** Use bulk renumber to fill gaps

#### Test Steps (FUTURE - FR-140)

1. Open Manage panel
2. Click "Renumber Chapters" tool
3. Select "Fill gaps" option
4. Preview:
   - `01-1-intro.mov` → `01-1-intro.mov` (no change)
   - `03-1-setup.mov` → `02-1-setup.mov` (renumbered)
   - `05-1-demo.mov` → `03-1-demo.mov` (renumbered)
5. Confirm

**Expected Result:**

- All chapters sequential: 01, 02, 03
- No gaps

---

## Test Scenario 3: Sequence Gaps (LOW)

### Background

**Pattern found:** ~10 instances across ~5 projects (11%)
**Current solution:** FR-138 "Renumber" sequence mode

### Test Case 3.1: Renumber Sequences

**Files:**

- `10-1-intro.mov`
- `10-3-outro.mov`
- `10-7-wrap.mov`

#### Test Steps

1. Select all files in chapter 10
2. Open Rename tool
3. Choose sequence mode: "Renumber starting from 1"
4. Preview:
   - `10-1-intro.mov` → `10-1-intro.mov` (no change)
   - `10-3-outro.mov` → `10-2-outro.mov`
   - `10-7-wrap.mov` → `10-3-wrap.mov`
5. Rename

**Expected Result:**

- Sequences sequential: 1, 2, 3
- No gaps

---

## Test Scenario 4: Bulk Operations

### Test Case 4.1: Rename All Files with Lowercase Tags

**Files:** Select all files with lowercase tags (01-1, 01-2, 01-3, 02-1, 02-2, 03-1)

#### Test Steps

1. Select all files
2. Open Rename tool
3. Change label to "tutorial"
4. Preview shows all files with uppercase tags
5. Rename

**Expected Result (AFTER FIX):**

- All files renamed with new label
- All tags converted to uppercase
- No validation errors

---

## Test Scenario 5: Edge Cases

### Test Case 5.1: Tag with Numbers

**File:** `06-1-example-n9n.mov`
**Tag:** `n9n`

#### Test Steps

1. Select file
2. Open Rename tool

**Expected Result (CURRENT):**

- Validation error: "Tag must be letters only"
- **OR** accept and convert to `N9N`?

**Question for PO:** Should tags allow numbers? (e.g., `N8N`, `N9N`)

---

### Test Case 5.2: Tag with Special Characters

**File:** Create `07-1-demo-sdk-v2.mov`
**Tag:** `sdk-v2` (hyphen)

#### Test Steps

1. Parse filename

**Expected Result (CURRENT):**

- Validation error: "Tag must be letters only"

---

### Test Case 5.3: Empty Tag

**File:** Create `08-1-intro-.mov`
**Tag:** Empty string after hyphen

#### Test Steps

1. Parse filename

**Expected Result:**

- Should skip empty tag
- OR validation error

---

## Test Scenario 6: Integration Tests

### Test Case 6.1: Full Rename Workflow

**Action:** Rename file with lowercase tags through entire workflow

#### Test Steps

1. Create `new-recording.mov` in watch directory
2. Name it: `15-1-intro-bmad-code` (lowercase tags)
3. Rename in UI
4. Verify:
   - File renamed on disk
   - Tags uppercase in filename: `15-1-intro-BMAD-CODE.mov`
   - Shadow regenerated
   - Transcript queued
   - State preserved

---

### Test Case 6.2: Bulk Rename with Mixed Chapter Selection

**Files:** Select files from chapters 01, 03, 05 (with gaps)

#### Test Steps

1. Select all files
2. Open Rename tool
3. Chapter dropdown shows blank (mixed chapters)
4. Info message: "Selected files from chapters: 01, 03, 05"
5. Choose target chapter: 07
6. Rename

**Expected Result:**

- All files moved to chapter 07
- Sequences preserved or renumbered based on selection

---

## Test Scenario 7: Regression Tests

### Test Case 7.1: Valid Uppercase Tags Still Work

**File:** `20-1-intro-CTA.mov`
**Tag:** `CTA` (already uppercase)

#### Test Steps

1. Select file
2. Rename to new label "tutorial"

**Expected Result:**

- No changes to tag behavior
- Tag remains `CTA`
- Rename succeeds

---

### Test Case 7.2: Files Without Tags Still Work

**File:** `21-1-demo.mov`
**No tags**

#### Test Steps

1. Select file
2. Rename to "tutorial"

**Expected Result:**

- Rename succeeds
- No tag-related errors

---

## Performance Test Scenarios

### Test Case P1: Bulk Rename 100 Files with Lowercase Tags

**Setup:** Create 100 files with lowercase tags

#### Test Steps

1. Select all 100 files
2. Bulk rename with new label
3. Measure time

**Expected Result:**

- Completes in < 30 seconds
- All tags converted to uppercase
- All files renamed successfully

---

## Accessibility Test Scenarios

### Test Case A1: Keyboard Navigation in Rename Tool

#### Test Steps

1. Open Rename tool with Tab key
2. Navigate through chapter dropdown (arrow keys)
3. Navigate to tags (Tab)
4. Toggle tags (Space)
5. Submit rename (Enter)

**Expected Result:**

- All controls keyboard-accessible
- Clear focus indicators
- No mouse required

---

## Summary

### Critical Tests (Must Pass Before Release)

- ✅ Test Case 1.1: Single lowercase tag
- ✅ Test Case 1.2: Multiple lowercase tags
- ✅ Test Case 1.4: User types lowercase tag
- ✅ Test Case 6.1: Full rename workflow
- ✅ Test Case 7.1: Valid tags still work

### Important Tests (Should Pass)

- ⚠️ Test Case 2.2: Fill chapter gaps (FR-140)
- ⚠️ Test Case 3.1: Renumber sequences
- ⚠️ Test Case 6.2: Mixed chapter selection

### Edge Case Tests (Nice to Have)

- 🔍 Test Case 5.1: Tag with numbers
- 🔍 Test Case 5.2: Tag with special characters
- 🔍 Test Case 5.3: Empty tag

---

**Last updated:** 2026-01-06
