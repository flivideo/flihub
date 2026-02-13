# Developer Handover: NFR-141 Lenient Tag Parser

**Date:** 2026-01-06
**Priority:** 🔴 CRITICAL
**Estimated Effort:** 1.5 hours
**Sprint:** Sprint 1 (Discovery Plan)

---

## Quick Context

**Problem:** 79% of all file issues (1,422 errors) are tag case violations

- Users type lowercase tags (`bmad`, `code`, `init`)
- Parser strictly requires uppercase only
- 38 projects affected (81% of all projects)

**Solution:** Accept lowercase tags, convert to uppercase automatically

- ✅ Fixes 1,422 errors instantly
- ✅ Zero user action required
- ✅ Matches user expectations
- ✅ Simple code change

**Full spec:** `/Users/davidcruwys/dev/ad/flivideo/flihub/docs/prd/nfr-141-lenient-tag-parser.md`

---

## What You're Implementing

### 1. Update Parser (Core Change)

**File:** `shared/naming.ts`
**Function:** `extractTagsFromName()`

**Change:**

```typescript
// BEFORE (strict uppercase validation):
for (const tag of tagList) {
  if (!NAMING_RULES.tags.pattern.test(tag)) {
    throw new Error(`Tag "${tag}" must be uppercase letters only (A-Z)`);
  }
  tags.push(tag);
}

// AFTER (lenient with auto-uppercase):
for (const tag of tagList) {
  // Convert to uppercase first
  const normalizedTag = tag.toUpperCase();

  // Then validate (letters only)
  if (!/^[A-Z]+$/.test(normalizedTag)) {
    throw new Error(`Tag "${tag}" contains invalid characters. Tags must be letters only.`);
  }

  tags.push(normalizedTag);
}
```

**Why this works:**

- Converts `bmad` → `BMAD` automatically
- Still rejects invalid characters (numbers, hyphens, etc.)
- Backwards compatible with existing uppercase tags
- Silent conversion (expected behavior)

---

### 2. Update UI (Prevent Future Issues)

**File:** `client/src/components/shared/RenamePanel.tsx`

**Add CSS to tag inputs:**

```tsx
// Custom tag input (around line 300)
<input
  type="text"
  value={customTag}
  onChange={(e) => setCustomTag(e.target.value)}
  style={{ textTransform: 'uppercase' }} // ← ADD THIS
  placeholder="Add custom tag (e.g., DEMO)"
  className="px-3 py-2 border rounded"
/>
```

**Update placeholder text:**

- Change: `"Custom tag"` → `"Add custom tag (e.g., DEMO)"`
- Shows uppercase examples

**Why this helps:**

- Visual feedback (user sees uppercase as they type)
- Prevents confusion about tag format
- Consistent with parser behavior

---

## Acceptance Criteria (Copy from PRD)

### AC1: Parser Accepts Lowercase Tags

- [ ] Given filename `01-1-intro-bmad.mov`
- [ ] When parsed via `parseRecordingFilename()`
- [ ] Then returns tags: `['BMAD']` (uppercase)
- [ ] And no validation error thrown

### AC2: Parser Accepts Mixed-Case Tags

- [ ] Given filename `02-1-demo-CommunIty.mov`
- [ ] When parsed
- [ ] Then returns tags: `['COMMUNITY']` (fully uppercase)

### AC3: Parser Accepts Multiple Lowercase Tags

- [ ] Given filename `03-1-analysis-project-brief-sdk.mov`
- [ ] When parsed
- [ ] Then returns tags: `['PROJECT', 'BRIEF', 'SDK']` (all uppercase)

### AC4: Invalid Characters Still Rejected

- [ ] Given filename `04-1-demo-sdk-v2.mov` (hyphen in tag)
- [ ] When parsed
- [ ] Then throws error: "Tag 'sdk-v2' contains invalid characters"

### AC5: UI Auto-Uppercases Input

- [ ] Given Rename tool is open
- [ ] When I type "demo" in custom tag input
- [ ] Then input displays "DEMO" (uppercase)
- [ ] When I save, tag saved as "DEMO"

### AC6: Existing Valid Tags Still Work

- [ ] Given filename `05-1-intro-CTA-SKOOL.mov` (already uppercase)
- [ ] When parsed
- [ ] Then returns tags: `['CTA', 'SKOOL']` (unchanged)

### AC7: Files Without Tags Still Work

- [ ] Given filename `06-1-demo.mov` (no tags)
- [ ] When parsed
- [ ] Then returns tags: `[]` (empty array)

---

## Testing Instructions

### Unit Tests (Create/Update)

**File:** `shared/naming.test.ts`

Add new test suite:

```typescript
describe('extractTagsFromName - lenient mode', () => {
  it('should convert lowercase tags to uppercase', () => {
    const result = extractTagsFromName('intro-bmad-code');
    expect(result.tags).toEqual(['BMAD', 'CODE']);
  });

  it('should convert mixed-case tags to uppercase', () => {
    const result = extractTagsFromName('demo-CommunIty');
    expect(result.tags).toEqual(['COMMUNITY']);
  });

  it('should still reject invalid characters', () => {
    expect(() => extractTagsFromName('demo-sdk-v2')).toThrow(
      'Tag "sdk-v2" contains invalid characters'
    );
  });

  it('should preserve valid uppercase tags', () => {
    const result = extractTagsFromName('intro-CTA-SKOOL');
    expect(result.tags).toEqual(['CTA', 'SKOOL']);
  });

  it('should handle files without tags', () => {
    const result = extractTagsFromName('intro');
    expect(result.tags).toEqual([]);
  });

  it('should handle multiple lowercase tags', () => {
    const result = extractTagsFromName('analysis-project-brief-sdk');
    expect(result.tags).toEqual(['PROJECT', 'BRIEF', 'SDK']);
  });
});
```

**Run tests:**

```bash
# From flihub/ directory
npm test -- naming.test.ts
```

---

### Integration Testing (Manual)

**Scenario 1: Rename with lowercase tag**

1. Start dev server: `npm run dev`
2. Navigate to Manage panel
3. Select a file (e.g., `01-1-intro.mov`)
4. Click "Rename" tool
5. Add custom tag: type "demo" (lowercase)
6. Input should display "DEMO" (uppercase)
7. Apply rename
8. Verify file renamed with uppercase tag: `01-1-intro-DEMO.mov`

**Scenario 2: Bulk rename with multiple lowercase tags**

1. Select 3 files
2. Click "Rename" tool
3. Select tags: check "CTA", add custom "sdk" (lowercase)
4. Apply rename
5. Verify all files have uppercase tags: `-CTA-SDK.mov`

**Scenario 3: Invalid tag (should still fail)**

1. Select a file
2. Click "Rename" tool
3. Add custom tag: "sdk-v2" (hyphen invalid)
4. Should show error: "Tag must be letters only"
5. Verify cannot save with invalid tag

---

### Scanner Verification (After Implementation)

**Run scanner on test project:**

```bash
cd server
npm run scan-projects
```

**Expected results:**

- Tag validation errors: 1422 → 0 (100% reduction)
- Projects with tag errors: 38 → 0

**Files to check:**

- `docs/analysis/discrepancies.json` - Should show 0 naming errors
- `docs/analysis/project-discrepancies.md` - Should show improvement

---

## Files to Modify

### Backend (Parser)

1. **`shared/naming.ts`** (~5 line change)
   - Function: `extractTagsFromName()`
   - Add: `const normalizedTag = tag.toUpperCase()`
   - Update: Validation logic

2. **`shared/naming.test.ts`** (add ~50 lines)
   - Add: New test suite for lenient mode
   - Tests: 6 test cases (AC1-AC7)

### Frontend (UI)

3. **`client/src/components/shared/RenamePanel.tsx`** (~2 line change)
   - Add: `style={{ textTransform: 'uppercase' }}`
   - Update: Placeholder text to show uppercase example

---

## Documentation to Update

### After Implementation

1. **`docs/architecture/naming-rules-reference.md`**
   - Add note: "Tags are case-insensitive (automatically converted to uppercase)"
   - Update examples to show lowercase → uppercase conversion

2. **`docs/architecture/naming-decisions.md`**
   - Update Decision 11 status: ⏳ Pending → ✅ Decided
   - Add PO decision: Option A (case-insensitive)

3. **`docs/changelog.md`**
   - Add entry for NFR-141 implementation

4. **`docs/backlog.md`**
   - Update NFR-141 status: Pending → ✓ Implemented

---

## Time Breakdown

| Task                    | Estimated   | Notes                             |
| ----------------------- | ----------- | --------------------------------- |
| Update parser logic     | 30 min      | Core change in `shared/naming.ts` |
| Add unit tests          | 30 min      | 6 test cases                      |
| Update UI (RenamePanel) | 15 min      | CSS + placeholder                 |
| Manual testing          | 15 min      | Test scenarios 1-3                |
| Update documentation    | 15 min      | 4 docs to update                  |
| Scanner verification    | 15 min      | Run and verify results            |
| **Total**               | **2 hours** | **Includes buffer**               |

**Original estimate:** 1.5 hours
**With testing/docs:** 2 hours

---

## Success Criteria

### Quantitative

- ✅ Unit tests pass (6/6)
- ✅ Integration tests pass (3/3 scenarios)
- ✅ Scanner shows 0 tag errors on test project
- ✅ 1422 errors → 0 errors (100% reduction)
- ✅ 38 projects → 0 projects with tag issues

### Qualitative

- ✅ User can type lowercase tags successfully
- ✅ Tags appear uppercase in filenames
- ✅ Invalid characters still rejected
- ✅ No breaking changes (existing uppercase tags work)

---

## Risk Assessment

### Risk 1: Breaking Existing Functionality

**Likelihood:** Low
**Impact:** Medium

**Mitigation:**

- Unit tests verify backwards compatibility
- Existing uppercase tags pass through unchanged
- Invalid characters still rejected (no new edge cases)

### Risk 2: Silent Conversion Surprises Users

**Likelihood:** Low
**Impact:** Low

**Mitigation:**

- UI shows uppercase as user types (visual feedback)
- Placeholder text shows uppercase examples
- Documentation updated with conversion behavior

---

## Rollback Plan

If implementation causes issues:

1. **Revert parser change:**

   ```bash
   git revert <commit-hash>
   ```

2. **Emergency fix (if partial revert needed):**

   ```typescript
   // In shared/naming.ts
   // Change back to strict validation:
   if (!NAMING_RULES.tags.pattern.test(tag)) {
     throw new Error(`Tag "${tag}" must be uppercase letters only (A-Z)`);
   }
   ```

3. **Remove UI changes:**
   - Remove `style={{ textTransform: 'uppercase' }}`
   - Revert placeholder text

---

## Questions for PO (Before Starting)

### Decision 11 Approval

**Required:** PO must approve Decision 11 (Tag Case Sensitivity)

**Location:** `docs/architecture/naming-decisions.md` lines 586-636

**Options:**

- [ ] **Option A:** Case-insensitive (convert to uppercase) ← **RECOMMENDED**
- [ ] **Option B:** Case-sensitive (strict uppercase only)
- [ ] **Option C:** Validate and suggest

**PO Decision:** ******\_******

**If not Option A:** This handover is invalid, new approach needed.

---

## Related Requirements

- **FR-138:** Rename Tool Specification (uses tag parser)
- **FR-130:** Delete+Regenerate Pattern (validates filenames)
- **Discovery Plan:** Phase 4 (Pattern Analysis) identified this issue

---

## After Completion

### PO Sign-Off

Once implemented and tested:

1. **Notify PO:** Implementation complete
2. **Run UAT:** PO tests 3 scenarios
3. **Verify scanner:** Run on real project
4. **Update backlog:** Mark NFR-141 as ✓ Implemented
5. **Proceed to Sprint 2:** FR-140 definition

---

## Support Materials

**Full specification:** `docs/prd/nfr-141-lenient-tag-parser.md` (425 lines)
**Discovery analysis:** `docs/analysis/pattern-analysis.md` (Pattern 1: Tag Case Mismatch)
**Execution plan:** `docs/planning/file-management-execution-plan.md` (Sprint 1)
**Test scenarios:** `docs/testing/rename-test-scenarios.md` (TC1.1-TC1.7)
**UAT checklist:** `docs/testing/uat-checklist-rename.md` (Sprint 1)

---

**Status:** Ready for implementation (after PO approval)
**Blocked by:** Decision 11 approval
**Next:** FR-140 (after this completes)

---

**Last updated:** 2026-01-06
