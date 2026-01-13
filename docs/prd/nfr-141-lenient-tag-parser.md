# NFR-141: Lenient Tag Parser (Uppercase Conversion)

**Type:** Non-Functional Requirement (Bug Fix / Enhancement)
**Priority:** 🔴 **CRITICAL**
**Effort:** 🔧 Low (1-1.5 hours)
**Status:** Pending PO Approval

---

## Background

### Discovery Findings

Scanner analysis of 47 production projects revealed:
- **1422 tag validation errors** (79% of all issues)
- **38 projects affected** (81% of all projects)
- **Root cause:** Users typing lowercase tags when parser requires uppercase only

### Evidence

**From `docs/analysis/discrepancies.json`:**

```json
{
  "summary": {
    "totalIssues": 1805,
    "byType": {
      "naming": 1422,  // 79% are naming errors
      ...
    },
    "bySeverity": {
      "error": 1432  // Almost all naming errors
    }
  }
}
```

**Sample violations:**
- `bmad` should be `BMAD` (207 instances in b64-bmad-claude-sdk)
- `code`, `init` should be `CODE`, `INIT`
- `project`, `brief` should be `PROJECT`, `BRIEF`
- `community` should be `COMMUNITY`
- `server`, `account` should be `SERVER`, `ACCOUNT`

### User Impact

- ⭐⭐⭐⭐⭐ **Very High Pain:**
  - Validation errors block rename operations
  - Confusing error messages
  - Inconsistent with user expectations (tags typed lowercase work everywhere else)
  - Manual uppercase conversion tedious

---

## Current Behavior

### Strict Validation

**Code:** `shared/naming.ts` - `extractTagsFromName()`

```typescript
export function extractTagsFromName(nameWithTags: string): ParsedTags {
  // ...
  for (const tag of tagList) {
    // STRICT: Must be uppercase only
    if (!NAMING_RULES.tags.pattern.test(tag)) {
      throw new Error(
        `Tag "${tag}" must be uppercase letters only (A-Z)`
      );
    }
    tags.push(tag);
  }
  // ...
}
```

**`NAMING_RULES.tags.pattern`:** `/^[A-Z]+$/` (uppercase only)

### Problems

1. **Rejects valid intent:** User types `bmad`, clearly means `BMAD`
2. **No auto-correction:** Errors instead of helping
3. **Inconsistent with UI:** FR-138 allows typing lowercase (then shows error)
4. **Breaks existing projects:** 38 projects have lowercase tags

---

## Proposed Solution

### Lenient Parser with Auto-Uppercase

**Change:** Accept lowercase/mixed-case tags, convert to uppercase automatically

### Implementation

#### Option A: Auto-Convert in Parser (RECOMMENDED)

**File:** `shared/naming.ts`

```typescript
export function extractTagsFromName(nameWithTags: string): ParsedTags {
  // ...
  for (const tag of tagList) {
    // LENIENT: Accept any case, convert to uppercase
    const normalizedTag = tag.toUpperCase();

    // Validate AFTER conversion (letters only)
    if (!/^[A-Z]+$/.test(normalizedTag)) {
      throw new Error(
        `Tag "${tag}" contains invalid characters. Tags must be letters only.`
      );
    }

    tags.push(normalizedTag);
  }
  // ...
}
```

**Pros:**
- ✅ Fixes 1422 errors instantly (zero user action)
- ✅ Backwards compatible
- ✅ Matches user expectations
- ✅ Simple code change

**Cons:**
- ⚠️ Silent conversion (but this is expected behavior)
- ⚠️ Tags in filenames always uppercase (enforced convention)

---

#### Option B: Validate and Suggest (NOT RECOMMENDED)

**Alternative:** Show error but suggest uppercase conversion

**Pros:**
- ✅ User explicitly confirms conversion

**Cons:**
- ❌ Still blocks operations
- ❌ Tedious for 1422 errors
- ❌ Doesn't match user expectations

---

### Additional Change: UI Enforcement

**File:** `client/src/components/shared/RenamePanel.tsx`

Add CSS to prevent future lowercase input:

```tsx
<input
  type="text"
  value={customTag}
  onChange={(e) => setCustomTag(e.target.value)}
  style={{ textTransform: 'uppercase' }}  // Auto-uppercase display
  placeholder="Add custom tag (e.g., DEMO)"
  className="px-3 py-2 border rounded"
/>
```

**Also update placeholder text to show uppercase examples.**

---

## Acceptance Criteria

### AC1: Parser Accepts Lowercase Tags

- [ ] **Given** filename `01-1-intro-bmad.mov`
- [ ] **When** parsed via `parseRecordingFilename()`
- [ ] **Then** returns tags: `['BMAD']` (uppercase)
- [ ] **And** no validation error thrown

---

### AC2: Parser Accepts Mixed-Case Tags

- [ ] **Given** filename `02-1-demo-CommunIty.mov`
- [ ] **When** parsed
- [ ] **Then** returns tags: `['COMMUNITY']` (fully uppercase)

---

### AC3: Parser Accepts Multiple Lowercase Tags

- [ ] **Given** filename `03-1-analysis-project-brief-sdk.mov`
- [ ] **When** parsed
- [ ] **Then** returns tags: `['PROJECT', 'BRIEF', 'SDK']` (all uppercase)

---

### AC4: Invalid Characters Still Rejected

- [ ] **Given** filename `04-1-demo-sdk-v2.mov` (hyphen in tag)
- [ ] **When** parsed
- [ ] **Then** throws error: "Tag 'sdk-v2' contains invalid characters"

---

### AC5: UI Auto-Uppercases Input

- [ ] **Given** Rename tool is open
- [ ] **When** I type "demo" in custom tag input
- [ ] **Then** input displays "DEMO" (uppercase)
- [ ] **When** I save
- [ ] **Then** tag saved as "DEMO"

---

### AC6: Existing Valid Tags Still Work

- [ ] **Given** filename `05-1-intro-CTA-SKOOL.mov` (already uppercase)
- [ ] **When** parsed
- [ ] **Then** returns tags: `['CTA', 'SKOOL']` (unchanged)
- [ ] **And** no errors

---

### AC7: Files Without Tags Still Work

- [ ] **Given** filename `06-1-demo.mov` (no tags)
- [ ] **When** parsed
- [ ] **Then** returns tags: `[]` (empty array)
- [ ] **And** no errors

---

## Impact Assessment

### Before Fix

- ❌ 1422 validation errors
- ❌ 38 projects affected (81%)
- ❌ Rename operations blocked
- ❌ Confusing user experience

### After Fix

- ✅ 0 validation errors (all auto-corrected)
- ✅ 0 projects affected
- ✅ Rename operations succeed
- ✅ Intuitive user experience

---

## Test Plan

### Unit Tests

**File:** `shared/naming.test.ts` (add new tests)

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
});
```

---

### Integration Tests

**Scenarios:** See `docs/testing/rename-test-scenarios.md`

- TC1.1: Single lowercase tag
- TC1.2: Multiple lowercase tags
- TC1.3: Mixed-case tag
- TC1.4: User types lowercase tag in UI
- TC1.5: Valid uppercase tags still work
- TC1.6: Files without tags still work
- TC1.7: Bulk rename with lowercase tags

---

### UAT

**Checklist:** See `docs/testing/uat-checklist-rename.md` - Sprint 1

---

## Rollout Plan

### Phase 1: Implementation (1 hour)

1. Update `shared/naming.ts` - `extractTagsFromName()`
2. Add unit tests
3. Test locally

### Phase 2: UI Enhancement (30 minutes)

1. Update `RenamePanel.tsx` - add `textTransform: uppercase`
2. Update placeholder text
3. Test in browser

### Phase 3: Verification (30 minutes)

1. Run scanner on test project
2. Verify 0 tag-related errors
3. Test with real project files

---

## Risks & Mitigation

### Risk 1: Silent Conversion Surprises Users

**Likelihood:** Low
**Impact:** Low

**Mitigation:**
- Document behavior in help text
- Show uppercase in preview before rename
- Placeholder text shows uppercase examples

---

### Risk 2: Breaking Change for Dependent Code

**Likelihood:** Very Low
**Impact:** Medium

**Mitigation:**
- Tag validation is encapsulated in `extractTagsFromName()`
- All code uses this function (no direct tag parsing elsewhere)
- Unit tests verify backwards compatibility

---

## Success Metrics

### Quantitative

- **Validation errors:** 1422 → 0 (100% reduction)
- **Projects affected:** 38 → 0 (100% improvement)
- **User-reported tag errors:** Track for 1 month after release

### Qualitative

- User feedback: "Tags work as expected now"
- Support tickets: Reduction in tag-related confusion

---

## Related Requirements

- **FR-138:** Rename Tool Specification (uses tag parser)
- **FR-130:** Delete+Regenerate Pattern (validates filenames)
- **FR-140:** Bulk Chapter Renumbering (may use tag parser)
- **NFR (New):** Update naming-decisions.md with Decision 11

---

## Decision Log

### Decision 11: Tag Case Sensitivity (NEW)

**Question:** Should tags be case-sensitive?

**Options:**
- **A. Case-insensitive (convert to uppercase)** ← **RECOMMENDED**
- B. Case-sensitive (strict uppercase only)

**Recommendation:** Option A
- Matches user expectations
- Fixes 1422 existing errors
- No breaking changes (uppercase enforced in output)

**PO Decision:** [ ] Approve Option A | [ ] Approve Option B | [ ] Other: _______

---

## Completion Checklist

### Code

- [ ] Update `shared/naming.ts` - `extractTagsFromName()`
- [ ] Add unit tests in `shared/naming.test.ts`
- [ ] Update `RenamePanel.tsx` - add `textTransform: uppercase`
- [ ] Update placeholder text in tag inputs

### Documentation

- [ ] Update `naming-rules-reference.md` with lenient parser behavior
- [ ] Update `naming-decisions.md` with Decision 11
- [ ] Add test scenarios to `rename-test-scenarios.md` (already done)
- [ ] Add UAT checklist items (already done)

### Testing

- [ ] Unit tests pass
- [ ] Integration tests pass (TC1.1 - TC1.7)
- [ ] UAT Sprint 1 complete
- [ ] Scanner shows 0 tag errors on test project

### Release

- [ ] Code reviewed
- [ ] Merged to main
- [ ] Deployed to production
- [ ] Changelog updated

---

**Last updated:** 2026-01-06
