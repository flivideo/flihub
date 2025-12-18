# Handover: FliHub Refactoring Items for PO Review

**Date:** 2024-12-14
**From:** Developer (Code Analysis Session)
**To:** Product Owner
**Subject:** Technical debt items requiring formal requirements

---

## Context

A full code quality analysis was performed on the FliHub codebase. Several technical debt items were identified that impact maintainability and developer velocity. These items need to be added to the backlog with proper requirements.

**Reference Document:** `/fli-brief/docs/flihub/refactoring-backlog.md` contains full technical details including affected files, line numbers, code examples, and proposed solutions.

---

## Items Requiring Requirements

### 1. REF-1: Transcript File Filtering Utility
**What:** Same 6-line code pattern for filtering transcript files is copy-pasted in 6 different places.
**Why it matters:** When the filtering logic needs to change, developers must find and update 6 locations. Easy to miss one, causing bugs.
**Effort:** ~30 minutes
**Risk if not done:** Inconsistent behavior, bugs when requirements change

---

### 2. REF-2: Tag Extraction Utility
**What:** Logic for extracting uppercase tags (like "CTA", "SKOOL") from filenames is duplicated in 4+ places.
**Why it matters:** Same risk as REF-1 - changes require updating multiple locations.
**Effort:** ~30 minutes
**Risk if not done:** Tag parsing could become inconsistent across different views

---

### 3. REF-3: Consolidate Response Types
**What:** TypeScript types for API responses are defined in 3 different files. Same type appears in server code, client code, and shared code with slight variations.
**Why it matters:** Types can drift apart over time. A field added in one place might be missing in another, causing runtime errors.
**Effort:** 1-2 hours
**Risk if not done:** Type safety compromised, potential runtime errors, confusing for developers

---

### 4. REF-4: Split query.ts Route File
**What:** One file (`query.ts`) contains 1,352 lines and 9 different API endpoints.
**Why it matters:**
- Hard to find specific code
- Difficult to test individual endpoints
- High risk of merge conflicts when multiple developers work on it
- Cognitive load for developers

**Effort:** 3-4 hours
**Risk if not done:** Slows down development velocity, increases bug risk

---

### 5. REF-5: Standardize Error Handling
**What:** Error handling is inconsistent - some errors are silently swallowed, some are logged, some return different response formats.
**Why it matters:**
- Silent errors hide real problems (permission issues, disk errors)
- Inconsistent error responses confuse API consumers
- Debugging production issues is harder

**Effort:** 2 hours
**Risk if not done:** Hidden bugs, harder debugging, inconsistent user experience

---

### 6. REF-6: Fix Fragile Transcript Parsing
**What:** Code converts `.txt` filenames to `.mov` just to use a parser, then converts back. This is a workaround that could break.
**Why it matters:** Edge cases could cause parsing failures. Code intent is unclear.
**Effort:** ~30 minutes
**Risk if not done:** Potential parsing bugs for unusual filenames

---

### 7. REF-7: Standardize API Response Format
**What:** API responses use 4+ different formats - some have `success` field, some don't, data is nested differently.
**Why it matters:**
- Client code must handle multiple formats
- Documentation is harder to write
- New developers are confused by inconsistency

**Effort:** 4+ hours (includes client updates)
**Risk if not done:** API is harder to use and document
**Note:** This is lowest priority and could be deferred or done incrementally

---

## Excluded from This Review

- **AssetsPage.tsx refactor** - Already noted in brainstorming-notes.md as parked. Not included here per product decision.

---

## Recommended Prioritization

| Priority | Items | Total Effort | Rationale |
|----------|-------|--------------|-----------|
| **Do First** | REF-1, REF-2, REF-3 | ~3 hours | High impact, low effort, reduces bug risk |
| **Do Next** | REF-5, REF-6 | ~2.5 hours | Improves reliability and debugging |
| **Plan For** | REF-4 | ~4 hours | Largest effort but big maintainability win |
| **Defer** | REF-7 | 4+ hours | Nice to have, not blocking anything |

---

## Requested Action

Please create formal requirements (FRs or NFRs) for items REF-1 through REF-6 so they can be scheduled for development. REF-7 can remain in backlog for future consideration.

Each requirement should include:
- Clear acceptance criteria
- Any dependencies on other items
- Whether it can be done incrementally or needs to be atomic

---

## Questions for PO

1. Should these be tracked as separate FRs, or grouped (e.g., REF-1 + REF-2 as single "Extract Shared Utilities" FR)?
2. Should REF-4 (split query.ts) be done before or after REF-3 (consolidate types)?
3. Any preference on NFR numbering scheme for technical debt items?
