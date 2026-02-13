# Pattern Analysis - File Management Discovery

**Date:** 2026-01-06
**Phase:** 4 of 7 (Discovery Plan)
**Scanner Results:** 47 projects, 1805 issues across 42 projects

---

## Executive Summary

### Critical Finding: Tag Case Mismatch

**The #1 issue affecting 38 projects (81%) is invalid tag format** - users are consistently using lowercase/mixed-case tags when strict validation requires uppercase only.

- **1422 naming errors** (79% of all issues) - vast majority are tag case violations
- **361 derivative issues** (20%) - missing shadows/transcripts
- **22 structural issues** (1%) - chapter gaps, sequence gaps
- **0 state issues** - no deprecated -safe folders found

### Impact Assessment

| Issue               | Projects | Files | Severity | User Pain       | Fix Effort  | Priority        |
| ------------------- | -------- | ----- | -------- | --------------- | ----------- | --------------- |
| Lowercase tags      | 38       | ~1400 | ERROR    | ⭐⭐⭐⭐⭐ High | 🔧🔧 Medium | 🔴 **CRITICAL** |
| Missing derivatives | 26       | 361   | INFO     | ⭐⭐ Low        | 🔧 Low      | 🟢 Low          |
| Chapter gaps        | 12       | 22    | INFO     | ⭐⭐⭐ Medium   | 🔧🔧🔧 High | 🟡 Medium       |
| Sequence gaps       | ~5       | ~10   | INFO     | ⭐ Very Low     | 🔧🔧 Medium | 🟢 Low          |

**Recommendation:** Address tag case issue FIRST - it affects 81% of projects and is causing the majority of validation errors.

---

## Pattern 1: Tag Case Mismatch (CRITICAL)

### The Problem

**Strict rule:** Tags must be UPPERCASE letters only (A-Z)
**Real-world usage:** Users are using lowercase/mixed-case tags extensively

### Evidence

From `discrepancies.json`:

- **1422 tag-related errors** across 38 projects
- Common violations:
  - `bmad` → should be `BMAD`
  - `code`, `init` → should be `CODE`, `INIT`
  - `project`, `brief` → should be `PROJECT`, `BRIEF`
  - `community` → should be `COMMUNITY`
  - `server`, `account` → should be `SERVER`, `ACCOUNT`
  - `prd`, `sdk` → should be `PRD`, `SDK`

### Impact

- **Projects affected:** 38/47 (81%)
- **Files affected:** ~1400 files
- **User pain:** ⭐⭐⭐⭐⭐ Very High
  - Blocks rename operations
  - Confusing validation errors
  - Inconsistent with user expectations

### Root Cause Analysis

**Why is this happening?**

1. **UI doesn't enforce uppercase** - Users can type lowercase tags in FR-138 rename tool
2. **Parser is too strict** - Validates against uppercase-only, rejects otherwise
3. **No auto-correction** - Could convert to uppercase automatically
4. **Unclear expectations** - Users don't know tags must be uppercase

**Historical context:**

- Original naming convention document says tags are "uppercase" but didn't enforce
- Parser added strict validation later
- Existing projects created before strict validation
- UI never enforced uppercase input

### Proposed Solutions

#### Option A: Make Parser Lenient (RECOMMENDED)

**Change:** Accept lowercase tags, convert to uppercase automatically

**Pros:**

- ✅ Fixes 1422 errors instantly (zero user action required)
- ✅ Backwards compatible with existing files
- ✅ Matches user expectations (intuitive behavior)
- ✅ Simple code change (one function)

**Cons:**

- ⚠️ Silent conversion might surprise users
- ⚠️ Tags in filenames become uppercase even if typed lowercase

**Implementation:**

```typescript
// In shared/naming.ts - extractTagsFromName()
// BEFORE: Reject lowercase
if (!/^[A-Z]+$/.test(tag)) {
  throw new Error(`Tag "${tag}" must be uppercase`);
}

// AFTER: Convert to uppercase
tag = tag.toUpperCase();
```

**Effort:** 🔧 Low (1 hour)
**Risk:** 🟢 Low (well-tested conversion)

---

#### Option B: Fix UI to Enforce Uppercase

**Change:** Add `text-transform: uppercase` to tag inputs in FR-138

**Pros:**

- ✅ Prevents future violations
- ✅ Clear visual feedback

**Cons:**

- ❌ Doesn't fix 1422 existing errors
- ❌ Requires manual bulk rename to fix old files
- ❌ Users still need to understand the rule

**Implementation:**

```tsx
// In RenamePanel.tsx
<input
  type="text"
  style={{ textTransform: 'uppercase' }}
  ...
/>
```

**Effort:** 🔧 Low (30 minutes)
**Risk:** 🟢 Low

---

#### Option C: Bulk Auto-Fix Tool

**Change:** Create script to rename all files with lowercase tags → uppercase

**Pros:**

- ✅ Fixes all 1422 errors in one operation
- ✅ One-time migration

**Cons:**

- ❌ Requires regenerating all transcripts (~1400 × 10 min = 230 hours!)
- ❌ Risk of breaking references
- ❌ Doesn't prevent future violations

**Effort:** 🔧🔧🔧 High (2-3 hours to build, 230 hours to regenerate transcripts)
**Risk:** 🔴 High (massive transcript regeneration)

---

### Recommendation: Option A + B

1. **Implement Option A** (lenient parser) - fixes existing files instantly
2. **Implement Option B** (UI enforcement) - prevents future violations

**Total effort:** 🔧 1.5 hours
**Impact:** Fixes 1422 errors (79% of all issues)
**Priority:** 🔴 **CRITICAL**

---

## Pattern 2: Missing Derivatives (LOW PRIORITY)

### The Problem

**Issue:** Shadow files or transcripts missing for some recordings

### Evidence

- **361 derivative issues** across 26 projects
- Examples:
  - Recording exists but no shadow (.mp4)
  - Recording exists but no transcript (.txt/.srt)

### Impact

- **Projects affected:** 26/47 (55%)
- **Files affected:** 361 files
- **User pain:** ⭐⭐ Low
  - Shadows can be regenerated instantly
  - Transcripts take time but are queued automatically
  - Not blocking workflow

### Root Cause

- Transcripts fail occasionally (Whisper errors)
- Shadows might be deleted manually
- Legacy projects before shadow feature existed

### Proposed Solution

**Option A: Auto-Regenerate on Demand**

- Add "Regenerate Missing" button in Manage panel
- Detect missing shadows/transcripts
- Queue regeneration

**Effort:** 🔧 Low (already have regen endpoints from FR-136)
**Priority:** 🟢 Low (nice-to-have, not blocking)

---

## Pattern 3: Chapter Gaps (MEDIUM PRIORITY)

### The Problem

**Issue:** Missing chapters in sequence (01, 03, 05 - missing 02, 04)

### Evidence

- **22 structural issues** across 12 projects
- All marked as INFO (not errors)
- User explicitly mentioned this during FR-138 testing:
  > "I don't see chapter 2, so it feels like I've got to move chapter 2 up to chapter 3"

### Impact

- **Projects affected:** 12/47 (26%)
- **User pain:** ⭐⭐⭐ Medium
  - Confusing numbering
  - User wants to "fill gaps" or renumber
  - Already created FR-140 for this

### Root Cause

- Intentional deletions (bad content removed)
- OR desire to renumber but no tool exists

### Proposed Solution

**FR-140: Bulk Chapter Renumbering**

Already created as pending requirement. Implementation options:

1. **Fill gaps:** 01, 03, 05 → 01, 02, 03
2. **Shift chapters:** 03, 04, 05 → 02, 03, 04
3. **Preview before execute**

**Effort:** 🔧🔧🔧 Medium-High (3-4 hours)
**Priority:** 🟡 Medium (user explicitly requested)

---

## Pattern 4: Sequence Gaps (LOW PRIORITY)

### The Problem

**Issue:** Missing sequences within chapters (05-1, 05-3, 05-7 - missing 2, 4, 5, 6)

### Evidence

- Estimated ~10 instances across ~5 projects
- Marked as INFO (not errors)
- Less common than chapter gaps

### Impact

- **Projects affected:** ~5/47 (11%)
- **User pain:** ⭐ Very Low
  - Rare occurrence
  - FR-138 provides "renumber" option already

### Proposed Solution

**No action needed** - FR-138 already handles this with "Renumber" sequence mode

---

## Issue Categorization Matrix

### By Frequency

| Issue               | Count | % of Total |
| ------------------- | ----- | ---------- |
| Invalid tag format  | 1422  | 79%        |
| Missing derivatives | 361   | 20%        |
| Chapter gaps        | 22    | 1%         |
| Sequence gaps       | ~10   | <1%        |

### By Severity

| Severity   | Count | % of Total |
| ---------- | ----- | ---------- |
| ❌ Error   | 1432  | 79%        |
| ⚠️ Warning | 2     | <1%        |
| 🔍 Info    | 371   | 21%        |

### By Type

| Type       | Count | % of Total |
| ---------- | ----- | ---------- |
| Naming     | 1422  | 79%        |
| Derivative | 361   | 20%        |
| Structural | 22    | 1%         |
| State      | 0     | 0%         |

---

## Priority Matrix

**Formula:** `Priority Score = (Projects Affected × User Pain × 10) / Fix Effort`

| Issue               | Projects | Pain (1-5) | Effort (1-5) | Score | Priority        |
| ------------------- | -------- | ---------- | ------------ | ----- | --------------- |
| Lowercase tags      | 38       | 5          | 2            | 95    | 🔴 **CRITICAL** |
| Chapter gaps        | 12       | 3          | 3            | 12    | 🟡 Medium       |
| Missing derivatives | 26       | 2          | 1            | 52    | 🟢 Low          |
| Sequence gaps       | 5        | 1          | 2            | 2.5   | 🟢 Low          |

---

## Solution Roadmap

### Sprint 1: Critical Fixes (1-2 hours)

**Goal:** Fix 79% of all issues

1. ✅ **Make tag parser lenient**
   - Accept lowercase tags, convert to uppercase
   - File: `shared/naming.ts` - `extractTagsFromName()`
   - Effort: 1 hour
   - Impact: Fixes 1422 errors instantly

2. ✅ **Enforce uppercase in UI**
   - Add `text-transform: uppercase` to tag inputs
   - File: `client/src/components/shared/RenamePanel.tsx`
   - Effort: 30 minutes
   - Impact: Prevents future violations

### Sprint 2: Quality of Life (3-4 hours)

**Goal:** Address user-requested features

3. ⏳ **Implement FR-140: Bulk Chapter Renumbering**
   - Fill gaps or shift chapters
   - Preview before execute
   - Effort: 3-4 hours
   - Impact: Addresses user pain from FR-138 testing

### Sprint 3: Nice-to-Have (1-2 hours)

**Goal:** Polish and completeness

4. ⏳ **Auto-detect missing derivatives**
   - Add "Regenerate Missing" button
   - Scan for missing shadows/transcripts
   - Queue regeneration
   - Effort: 1-2 hours
   - Impact: Quality of life improvement

---

## Data-Driven Insights

### Insight 1: Tag Convention Mismatch

**Finding:** 81% of projects violate tag case rules
**Implication:** Rules don't match real-world usage
**Action:** Relax parser to match user behavior

### Insight 2: Chapter Gaps Are Common

**Finding:** 26% of projects have chapter gaps
**Implication:** Users delete content or want renumbering
**Action:** Build FR-140 to support this workflow

### Insight 3: Derivative Issues Are Benign

**Finding:** 55% of projects missing some derivatives
**Implication:** Not blocking, can regenerate
**Action:** Low priority, offer optional tool

### Insight 4: Sequence Gaps Are Rare

**Finding:** Only ~11% of projects affected
**Implication:** FR-138 renumber feature is sufficient
**Action:** No additional work needed

---

## Risk Assessment

### Low Risk

- ✅ Lenient tag parser (well-tested conversion)
- ✅ UI text-transform (CSS only)
- ✅ Chapter renumbering preview (user confirms before execute)

### Medium Risk

- ⚠️ Bulk auto-fix script (requires massive transcript regeneration)

### High Risk

- 🔴 None identified

---

## Validation Against Phase 2 Decisions

**From `naming-decisions.md`:**

| Decision                        | Scanner Finding                  | Validation                              |
| ------------------------------- | -------------------------------- | --------------------------------------- |
| Decision 1: Chapter gaps        | 12 projects affected, INFO level | ✅ Correct - gaps are benign but common |
| Decision 2: Sequence gaps       | ~5 projects affected, INFO level | ✅ Correct - rare and benign            |
| Decision 9: Missing derivatives | 26 projects affected, INFO level | ✅ Correct - not blocking               |
| Tag case rule                   | **NOT DOCUMENTED IN DECISIONS**  | ❌ **MISSING** - should add Decision 11 |

**Action:** Add **Decision 11: Tag Case Sensitivity** to naming-decisions.md

---

## Recommendations for PO

### Immediate Actions (Required for Sprint 1)

1. **Approve lenient tag parser** (Option A)
   - Accept lowercase, convert to uppercase
   - Zero user action required to fix 1422 errors

2. **Approve UI enforcement** (Option B)
   - Prevent future violations
   - Clear visual feedback

### Medium-Term Actions (Sprint 2)

3. **Prioritize FR-140** - Bulk Chapter Renumbering
   - User explicitly requested
   - 26% of projects affected

### Optional (Sprint 3)

4. **Consider auto-regenerate missing derivatives**
   - Nice-to-have, not blocking

---

## Next Steps (Phase 5-7)

**Phase 5:** Create test scenarios based on these patterns
**Phase 6:** Update FR-140, create new FRs if needed
**Phase 7:** Create sprint breakdown with effort estimates

---

**Last updated:** 2026-01-06
