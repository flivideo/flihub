# Naming Decisions Matrix

**Date:** 2026-01-06
**Purpose:** Document open questions and decisions needed for naming rules
**Status:** Pending PO review and decisions

---

## Decision Framework

Each decision uses this format:

```
## Decision: [Topic]
**Status:** ✅ Decided | ⏳ Pending | 🤔 Needs Discussion
**Priority:** High | Medium | Low
**Impact:** [Who/what is affected]

### Current Behavior
[What happens now]

### Options
A. [Option description] - Pros/Cons
B. [Option description] - Pros/Cons
C. [Option description] - Pros/Cons

### Recommendation
[Suggested approach with reasoning]

### PO Decision
[To be filled in]
```

---

## Critical Decisions (Affect Scanner Phase 3)

These decisions are BLOCKING for the scanner implementation. We need answers before Phase 3.

---

### Decision 1: Chapter Gaps

**Status:** ⏳ Pending
**Priority:** 🔴 **HIGH** (blocks scanner categorization)
**Impact:** 35-40 projects likely affected (estimate based on user statement)

#### Current Behavior

Code allows chapter gaps. Example:

```
01-1-intro.mov
03-1-setup.mov     ← Chapter 02 is missing
05-1-demo.mov      ← Chapter 04 is missing
```

No validation, no warnings. User can create this structure.

#### Context from User

User stated when testing FR-138:

> "I don't see chapter 2, so it feels like I've got to move chapter 2 up to chapter 3"

This suggests:

- Chapter gaps are common
- Users may want to fill them
- OR gaps are intentional (deleted bad content)

#### Options

**A. Gaps are INTENTIONAL (benign)**

- Pros: No changes needed, matches current behavior
- Cons: May confuse users (like above example)
- Scanner: Report as INFO level only
- Tools: Provide optional gap-filling (FR-140)

**B. Gaps are ERRORS (should fix)**

- Pros: Cleaner structure, sequential chapters
- Cons: Forces renaming, may delete intentional gaps
- Scanner: Report as WARNING level
- Tools: Provide gap-filling tool (FR-140)

**C. Gaps are USER CHOICE (ask each time)**

- Pros: Flexible, user controls
- Cons: Repetitive prompts, decision fatigue
- Scanner: Report as WARNING with "dismiss" option
- Tools: Gap-filling optional, user-initiated

#### Recommendation

**Option A: Gaps are INTENTIONAL (benign)**

Reasoning:

1. Common in real projects (user confirmed)
2. Deleting chapter 02 because content was bad = valid workflow
3. Don't force users to renumber 40 projects
4. Provide OPTIONAL tool (FR-140) for those who want sequential

#### PO Decision

[ ] **A - Intentional (benign)** - Report as INFO, tool optional
[ ] **B - Error (should fix)** - Report as WARNING, tool recommended
[ ] **C - User choice** - Report as WARNING with dismiss
[ ] **Other:** \***\*\*\*\*\***\_\_\_\***\*\*\*\*\***

---

### Decision 2: Sequence Gaps

**Status:** ⏳ Pending
**Priority:** 🟡 **MEDIUM** (affects scanner, but less common)
**Impact:** ~5-10 projects likely affected (estimate)

#### Current Behavior

Code allows sequence gaps within a chapter. Example:

```
05-1-intro.mov
05-3-setup.mov     ← Sequence 2 is missing
05-7-demo.mov      ← Sequences 4, 5, 6 are missing
```

No validation, no warnings.

#### Context

- Less common than chapter gaps (user didn't mention)
- FR-138 provides "renumber" option to fix this
- May be intentional (deleted bad segments)

#### Options

**A. Gaps are INTENTIONAL (benign)**

- Same reasoning as chapter gaps
- Scanner: INFO level
- Tool: FR-138 already provides renumber

**B. Gaps are ERRORS (should fix)**

- Sequential is cleaner
- Scanner: WARNING level
- Tool: FR-138 renumber feature

**C. Gaps are USER CHOICE**

- Same as chapter gaps

#### Recommendation

**Option A: Gaps are INTENTIONAL (benign)**

Reasoning:

1. Same as chapter gaps (delete bad content)
2. FR-138 already provides renumber tool
3. Less disruptive than forcing fixes

#### PO Decision

[ ] **A - Intentional (benign)** - Report as INFO
[ ] **B - Error (should fix)** - Report as WARNING
[ ] **C - User choice** - Report as WARNING with dismiss
[ ] **Other:** \***\*\*\*\*\***\_\_\_\***\*\*\*\*\***

---

### Decision 3: Non-Sequential Chapter Order

**Status:** ⏳ Pending
**Priority:** 🟡 **MEDIUM**
**Impact:** Unknown (scanner will tell us)

#### Current Behavior

Code allows chapters in any order. Example:

```
05-1-demo.mov
03-1-setup.mov     ← Chapter 3 after chapter 5
07-1-deploy.mov
01-1-intro.mov     ← Chapter 1 last
```

File list would sort numerically, but this could happen during reorganization.

#### Context

- Unlikely in stable projects
- Possible during bulk operations
- Could indicate user mistake

#### Options

**A. Non-sequential is ERROR**

- Chapters should always be in order
- Scanner: ERROR level
- Recommendation: Use FR-135 (move/swap tools) to fix

**B. Non-sequential is WARNING**

- Might be temporary (mid-reorganization)
- Scanner: WARNING level
- User can dismiss if intentional

**C. Non-sequential is ALLOWED**

- Trust the user
- Scanner: Don't check

#### Recommendation

**Option B: Non-sequential is WARNING**

Reasoning:

1. Likely indicates user mistake
2. But might be temporary (mid-work)
3. WARNING gives visibility without blocking

#### PO Decision

[ ] **A - Error** - Must fix
[ ] **B - Warning** - Should fix
[ ] **C - Allowed** - Don't check
[ ] **Other:** \***\*\*\*\*\***\_\_\_\***\*\*\*\*\***

---

### Decision 4: Sequence Must Start at 1

**Status:** ⏳ Pending
**Priority:** 🟢 **LOW**
**Impact:** Probably rare

#### Current Behavior

Code allows any starting sequence. Example:

```
05-7-intro.mov     ← Starts at 7, not 1
05-8-setup.mov
05-9-demo.mov
```

No validation.

#### Context

- Sequences 1-6 deleted?
- Moved files from another chapter?
- Probably rare

#### Options

**A. Must start at 1 (ERROR)**

- Enforces convention
- Scanner: ERROR level

**B. Should start at 1 (WARNING)**

- Soft recommendation
- Scanner: WARNING level

**C. Can start anywhere (ALLOWED)**

- Flexible
- Scanner: Don't check

#### Recommendation

**Option C: Can start anywhere (ALLOWED)**

Reasoning:

1. Edge case (very rare)
2. Could be intentional (moved files)
3. Not worth enforcing

#### PO Decision

[ ] **A - Must start at 1** - ERROR
[ ] **B - Should start at 1** - WARNING
[ ] **C - Can start anywhere** - Don't check
[ ] **Other:** \***\*\*\*\*\***\_\_\_\***\*\*\*\*\***

---

## Important Decisions (Affect User Experience)

---

### Decision 5: Same Label in Same Chapter

**Status:** ⏳ Pending
**Priority:** 🟡 **MEDIUM**
**Impact:** Affects naming flexibility

#### Current Behavior

Technically possible if sequences differ:

```
05-1-intro.mov
05-2-intro.mov     ← Same label, different sequence
```

Code allows this. Filesystem allows this (different filenames).

#### Context

- Could be intentional (intro part 1, intro part 2)
- Could be error (forgot to change label)
- FR-138 preview would show this

#### Options

**A. Same label is ERROR**

- Forces unique labels
- Scanner: ERROR level
- Prevents confusion

**B. Same label is WARNING**

- Soft discouragement
- Scanner: WARNING level
- User can override

**C. Same label is ALLOWED**

- Flexible
- Scanner: Don't check
- User responsibility

#### Recommendation

**Option C: Same label is ALLOWED**

Reasoning:

1. Might be intentional (multi-part segments)
2. Sequence provides uniqueness
3. Don't limit user flexibility

#### PO Decision

[ ] **A - Error** - Must fix
[ ] **B - Warning** - Discouraged
[ ] **C - Allowed** - Don't check
[ ] **Other:** \***\*\*\*\*\***\_\_\_\***\*\*\*\*\***

---

### Decision 6: Same Label Across Chapters

**Status:** ⏳ Pending (probably obvious)
**Priority:** 🟢 **LOW**
**Impact:** Common and expected

#### Current Behavior

Allowed and common:

```
01-1-intro.mov
02-1-intro.mov     ← Same label, different chapter
03-1-intro.mov
```

This is probably intentional (each chapter starts with intro).

#### Options

**A. Same label across chapters is ALLOWED**

- Obviously intentional
- Scanner: Don't check

**B. Same label across chapters is INFO**

- Just report it
- Scanner: INFO level for visibility

#### Recommendation

**Option A: ALLOWED (don't check)**

Reasoning:

1. Obviously intentional
2. Labels describe content, not unique identifiers
3. No value in reporting

#### PO Decision

[ ] **A - Allowed** - Don't check
[ ] **B - Info** - Report for visibility
[ ] **Other:** \***\*\*\*\*\***\_\_\_\***\*\*\*\*\***

---

## Structural Decisions

---

### Decision 7: -safe Folder Status

**Status:** 🤔 **Needs Discussion** (FR-111 context needed)
**Priority:** 🔴 **HIGH** (affects folder structure)
**Impact:** All projects with -safe folders

#### Current Behavior

According to FR-111 Phase 3:

- OLD: Physical `-safe` subfolder
- NEW: State-based (flag in `.flihub-state.json`)

But documentation unclear if migration complete.

#### Context from Code

FR-130 rename logic still references `-safe` folders:

```typescript
const shadowPaths = [
  path.join(paths.project, 'recording-shadows', `${baseName}.txt`),
  path.join(paths.project, 'recording-shadows', '-safe', `${baseName}.txt`),
];
```

Suggests `-safe` folders still exist?

#### Options

**A. -safe folder DEPRECATED**

- Migrate all projects to state-based
- Scanner: WARNING if -safe folder exists
- Migration tool needed

**B. -safe folder SUPPORTED (dual-mode)**

- Support both physical folder AND state
- Scanner: Don't warn
- Keep current code

**C. -safe folder USER CHOICE**

- Old projects use folder
- New projects use state
- Scanner: INFO level

#### Recommendation

**Needs more investigation** - Check FR-111 implementation status

#### PO Decision

[ ] **A - Deprecated** - Migrate to state-based
[ ] **B - Supported** - Keep dual-mode
[ ] **C - User choice** - Both valid
[ ] **Other:** \***\*\*\*\*\***\_\_\_\***\*\*\*\*\***

---

### Decision 8: Legacy Format (No Sequence)

**Status:** ⏳ Pending
**Priority:** 🟢 **LOW**
**Impact:** Old projects only

#### Current Behavior

Parser accepts legacy format:

```
05-intro.mov       ← No sequence number
```

Parsed as: `{ chapter: "05", sequence: null, name: "intro" }`

#### Context

- Backwards compatibility
- Probably old projects only
- New files always have sequence (UI enforces)

#### Options

**A. Migrate legacy files**

- Batch rename: `05-intro.mov` → `05-1-intro.mov`
- Scanner: WARNING on legacy format
- Migration tool provided

**B. Support legacy format**

- Keep parser lenient
- Scanner: INFO level (just report)
- No migration needed

#### Recommendation

**Option B: Support legacy format**

Reasoning:

1. Backwards compatibility
2. Parser already handles it
3. Low priority (old projects only)

#### PO Decision

[ ] **A - Migrate** - Add sequences to legacy files
[ ] **B - Support** - Keep as-is
[ ] **Other:** \***\*\*\*\*\***\_\_\_\***\*\*\*\*\***

---

## Data Quality Decisions

---

### Decision 9: Missing Derivatives

**Status:** ⏳ Pending
**Priority:** 🟡 **MEDIUM**
**Impact:** User workflow visibility

#### Scenario

Recording exists but shadow/transcript missing:

```
recordings/05-3-demo.mov              ← Source exists
recording-shadows/05-3-demo.mp4       ← Missing!
recording-transcripts/05-3-demo.txt   ← Missing!
```

#### Options

**A. Missing derivatives are INFO**

- Just informational
- Might be queued/in-progress
- Scanner: INFO level

**B. Missing derivatives are WARNING**

- Should exist
- Scanner: WARNING level
- Offer regenerate button

#### Recommendation

**Option A: INFO level**

Reasoning:

1. Might be queued (transcriptions take time)
2. Shadows can be regenerated anytime
3. Not blocking

#### PO Decision

[ ] **A - Info** - Just report
[ ] **B - Warning** - Should fix
[ ] **Other:** \***\*\*\*\*\***\_\_\_\***\*\*\*\*\***

---

### Decision 10: Orphaned Derivatives

**Status:** ⏳ Pending
**Priority:** 🟡 **MEDIUM**
**Impact:** Disk space, data hygiene

#### Scenario

Derivative exists but source deleted:

```
recordings/05-3-demo.mov              ← Deleted!
recording-shadows/05-3-demo.mp4       ← Orphaned
recording-transcripts/05-3-demo.txt   ← Orphaned
```

#### Options

**A. Orphans are ERROR**

- Should never happen
- Scanner: ERROR level
- Auto-delete option

**B. Orphans are WARNING**

- Might be temporary
- Scanner: WARNING level
- User decides to delete

#### Recommendation

**Option B: WARNING level with auto-delete**

Reasoning:

1. Easy to fix (just delete)
2. Low risk (can regenerate if mistake)
3. Disk space savings

#### PO Decision

[ ] **A - Error** - Auto-delete
[ ] **B - Warning** - User decides
[ ] **Other:** \***\*\*\*\*\***\_\_\_\***\*\*\*\*\***

---

---

### Decision 11: Tag Case Sensitivity

**Status:** ⏳ Pending
**Priority:** 🔴 **CRITICAL** (blocks 79% of all issues)
**Impact:** 38 projects (81%) with 1422 tag validation errors

#### Current Behavior

Parser rejects lowercase/mixed-case tags:

```
01-1-intro-bmad.mov     ← ERROR: "Tag 'bmad' must be uppercase"
```

**Strict rule:** Tags must be `[A-Z]+` (uppercase only)

#### Evidence from Scanner (2026-01-06)

- **1422 tag errors** across 38 projects
- Common violations:
  - `bmad` → should be `BMAD`
  - `code`, `init` → should be `CODE`, `INIT`
  - `project`, `brief` → should be `PROJECT`, `BRIEF`

**User impact:** Blocks rename operations, confusing errors

#### Options

**A. Case-Insensitive (Convert to Uppercase)** ← RECOMMENDED

- Accept lowercase, convert to uppercase automatically
- Pros: Fixes 1422 errors instantly, intuitive, backwards compatible
- Cons: Silent conversion (but expected behavior)
- Scanner: 1422 errors → 0 errors
- Implementation: `tag.toUpperCase()` in parser

**B. Case-Sensitive (Strict Uppercase Only)**

- Keep current strict validation
- Pros: Explicit convention enforcement
- Cons: Blocks 1422 files, poor UX, requires manual fixes
- Scanner: 1422 errors remain
- Implementation: No change

**C. Validate and Suggest**

- Show error with suggestion to convert
- Pros: User explicitly confirms
- Cons: Still blocks operations, tedious for 1422 errors
- Scanner: 1422 errors remain until user fixes
- Implementation: Error message with suggestion

#### Recommendation

**Option A: Case-Insensitive (Convert to Uppercase)**

Reasoning:

1. **Massive impact:** Fixes 79% of all issues in one change
2. **User expectations:** Typing `bmad` clearly means `BMAD`
3. **Zero user action:** Existing files work immediately
4. **Backwards compatible:** Uppercase tags unchanged
5. **Simple implementation:** One-line change in parser
6. **Future-proof:** UI can enforce uppercase with CSS

#### Implementation

**Parser change:** `shared/naming.ts`

```typescript
// BEFORE: Reject lowercase
if (!/^[A-Z]+$/.test(tag)) {
  throw new Error(`Tag "${tag}" must be uppercase`);
}

// AFTER: Accept and convert
const normalizedTag = tag.toUpperCase();
if (!/^[A-Z]+$/.test(normalizedTag)) {
  throw new Error(`Tag contains invalid characters`);
}
tags.push(normalizedTag);
```

**UI enforcement:** `RenamePanel.tsx`

```tsx
<input style={{ textTransform: 'uppercase' }} placeholder="Add custom tag (e.g., DEMO)" />
```

#### PO Decision

[ ] **A - Case-insensitive** - Convert to uppercase (RECOMMENDED)
[ ] **B - Case-sensitive** - Keep strict validation
[ ] **C - Validate and suggest** - Show error with suggestion
[ ] **Other:** \***\*\*\*\*\***\_\_\_\***\*\*\*\*\***

**Impact if approved:**

- NFR-141 can proceed immediately
- 1422 errors fixed in 1 hour
- 38 projects unblocked

---

## Summary Table

| Decision                      | Priority     | Status              | Blocks Scanner?             |
| ----------------------------- | ------------ | ------------------- | --------------------------- |
| **11. Tag case sensitivity**  | **CRITICAL** | ⏳ Pending          | 🔴 **BLOCKS 79% OF ISSUES** |
| 1. Chapter gaps               | HIGH         | ⏳ Pending          | ✅ Yes                      |
| 2. Sequence gaps              | MEDIUM       | ⏳ Pending          | ✅ Yes                      |
| 3. Non-sequential chapters    | MEDIUM       | ⏳ Pending          | ✅ Yes                      |
| 4. Sequence start             | LOW          | ⏳ Pending          | ⚠️ Partial                  |
| 5. Same label in chapter      | MEDIUM       | ⏳ Pending          | ⚠️ Partial                  |
| 6. Same label across chapters | LOW          | ⏳ Pending          | ⚠️ Partial                  |
| 7. -safe folder               | HIGH         | 🤔 Needs discussion | ✅ Yes                      |
| 8. Legacy format              | LOW          | ⏳ Pending          | ⚠️ Partial                  |
| 9. Missing derivatives        | MEDIUM       | ⏳ Pending          | ⚠️ Partial                  |
| 10. Orphaned derivatives      | MEDIUM       | ⏳ Pending          | ⚠️ Partial                  |

**Legend:**

- ✅ Yes: Must decide before implementing scanner
- ⚠️ Partial: Scanner can proceed, but categorization depends on decision
- ❌ No: Scanner doesn't need this decision

---

## Next Steps

**For PO:**

1. Review all 10 decisions
2. Make decisions (checkboxes above)
3. Add notes for "Other" choices
4. Prioritize: HIGH decisions first

**For Dev:**

1. Wait for Decisions 1, 2, 3, 7 (HIGH priority)
2. Can start scanner with placeholder logic
3. Update scanner after decisions made

**For Phase 3:**

- Scanner categorization depends on these decisions
- Error vs Warning vs Info levels determined by decisions
- Auto-fix candidates identified by decisions

---

**Last updated:** 2026-01-06
