# FliHub Refactoring Backlog

**Generated:** 2024-12-14
**Source:** Code quality analysis of FliHub codebase
**Scope:** Server routes, shared utilities, client hooks, types

---

## Overview

This document captures technical debt and refactoring opportunities identified through static analysis. Items are prioritized by impact and effort.

---

## REF-1: Extract Transcript File Filtering Utility

**Priority:** High
**Effort:** Small (30 mins)
**Category:** Code Duplication

### Problem

The pattern for reading and filtering transcript files appears in 5+ locations with nearly identical code:

```typescript
const files = await fs.readdir(dir);
const transcriptFiles = files
  .filter(f => f.endsWith('.txt') && !f.endsWith('-chapter.txt'))
  .map(f => f.replace('.txt', ''));
```

### Affected Files

| File | Lines | Context |
|------|-------|---------|
| `server/src/routes/query.ts` | 433-437 | recordings endpoint |
| `server/src/routes/query.ts` | 554-556 | transcripts endpoint |
| `server/src/routes/query.ts` | 713-718 | chapters endpoint |
| `server/src/routes/query.ts` | 916-920 | export endpoint |
| `server/src/routes/query.ts` | 1044-1051 | export endpoint |
| `server/src/routes/projects.ts` | 200-215 | transcript sync |

### Proposed Solution

Create utility function in `server/src/utils/scanning.ts`:

```typescript
export async function getTranscriptBasenames(transcriptsDir: string): Promise<Set<string>> {
  if (!await fs.pathExists(transcriptsDir)) return new Set();
  const files = await fs.readdir(transcriptsDir);
  return new Set(
    files
      .filter(f => f.endsWith('.txt') && !f.endsWith('-chapter.txt'))
      .map(f => f.replace('.txt', ''))
  );
}
```

### Acceptance Criteria

- [ ] Utility function created in `server/src/utils/scanning.ts`
- [ ] All 6 locations updated to use the utility
- [ ] No functional changes to API responses
- [ ] Server builds without errors

---

## REF-2: Extract Tag Extraction Utility

**Priority:** High
**Effort:** Small (30 mins)
**Category:** Code Duplication

### Problem

Logic for extracting uppercase tags from recording names is duplicated:

```typescript
const nameParts = (parsed.name || '').split('-');
const tags: string[] = [];
const nameWords: string[] = [];
for (const part of nameParts) {
  if (/^[A-Z]+$/.test(part)) {
    tags.push(part);
  } else {
    nameWords.push(part);
  }
}
```

### Affected Files

| File | Lines | Context |
|------|-------|---------|
| `server/src/routes/query.ts` | 464-475 | recordings endpoint |
| `server/src/routes/query.ts` | 565-567 | transcripts endpoint |
| `server/src/routes/query.ts` | 943-952 | export recordings |
| `server/src/routes/query.ts` | 997-998 | export transcripts |

### Proposed Solution

Add to `shared/naming.ts`:

```typescript
export interface ParsedNameParts {
  cleanName: string;
  tags: string[];
}

export function extractTagsFromName(name: string): ParsedNameParts {
  const parts = (name || '').split('-');
  const tags: string[] = [];
  const nameWords: string[] = [];

  for (const part of parts) {
    if (/^[A-Z]+$/.test(part)) {
      tags.push(part);
    } else {
      nameWords.push(part);
    }
  }

  return {
    cleanName: nameWords.join('-'),
    tags,
  };
}
```

### Acceptance Criteria

- [ ] Function added to `shared/naming.ts`
- [ ] Exported from `shared/index.ts`
- [ ] All 4 locations in query.ts updated
- [ ] Client `RecordingsView.tsx` `getChapterDisplayName()` refactored to use it
- [ ] No functional changes to behavior

---

## REF-3: Consolidate Response Types in shared/types.ts

**Priority:** High
**Effort:** Medium (1-2 hours)
**Category:** Type Inconsistency

### Problem

Same response types are defined in multiple places, risking drift:

| Type | Defined In | Also In |
|------|-----------|---------|
| `QueryProjectSummary` | query.ts:54-68 | - |
| `QueryProjectDetail` | query.ts:70-94 | - |
| `QueryRecording` | query.ts:96-106 | Similar to `RecordingFile` in shared/types.ts |
| `QueryTranscript` | query.ts:108-116 | - |
| `QueryChapter` | query.ts:118-126 | - |
| `QueryImage` | query.ts:128-136 | Similar to `ImageAsset` in shared/types.ts |
| `SafeResponse` | useApi.ts:137-143 | - |
| `RestoreResponse` | useApi.ts:165-172 | - |
| `RecentRename` | index.ts:18-25 | useApi.ts:402-408 |
| `InboxFile` | query.ts:1156-1160 | useApi.ts:439-443 |
| `InboxSubfolder` | query.ts:1162-1167 | useApi.ts:445-450 |

### Proposed Solution

1. Move all Query* types to `shared/types.ts` under a "Query API Types" section
2. Move response types (SafeResponse, RestoreResponse, etc.) to shared/types.ts
3. Import in routes and hooks instead of redefining
4. Remove duplicate definitions

### Acceptance Criteria

- [ ] All Query* types moved to shared/types.ts
- [ ] SafeResponse, RestoreResponse moved to shared/types.ts
- [ ] RecentRename consolidated (single definition)
- [ ] InboxFile, InboxSubfolder consolidated
- [ ] server/src/routes/query.ts imports from shared
- [ ] client/src/hooks/useApi.ts imports from shared
- [ ] No duplicate type definitions remain
- [ ] TypeScript builds without errors

---

## REF-4: Split query.ts Into Sub-Modules

**Priority:** Medium
**Effort:** Large (3-4 hours)
**Category:** Large File

### Problem

`server/src/routes/query.ts` is 1352 lines containing 9 endpoints. This makes it difficult to:
- Locate specific endpoint logic
- Test endpoints independently
- Make changes without risking regressions

### Current Structure

| Endpoint | Lines | Purpose |
|----------|-------|---------|
| GET /config | 181-193 | System metadata |
| GET /projects/resolve | 198-238 | Resolve project prefix |
| GET /projects | 243-356 | List projects |
| GET /projects/:code | 361-409 | Project detail |
| GET /projects/:code/recordings | 415-522 | List recordings |
| GET /projects/:code/transcripts | 528-673 | List/get transcripts |
| GET /projects/:code/chapters | 678-783 | Chapter timestamps |
| GET /projects/:code/images | 788-852 | List images |
| GET /projects/:code/export | 858-1137 | Full export |
| GET /projects/:code/inbox | 1143-1271 | Inbox contents |
| GET /projects/:code/inbox/:sub/:file | 1278-1349 | Inbox file content |

### Proposed Solution

Split into sub-modules:

```
server/src/routes/query/
├── index.ts           # Router setup, imports sub-routers
├── config.ts          # /config endpoint
├── projects.ts        # /projects, /projects/resolve, /projects/:code
├── recordings.ts      # /projects/:code/recordings
├── transcripts.ts     # /projects/:code/transcripts
├── chapters.ts        # /projects/:code/chapters
├── images.ts          # /projects/:code/images
├── export.ts          # /projects/:code/export
└── inbox.ts           # /projects/:code/inbox endpoints
```

### Acceptance Criteria

- [ ] Create `server/src/routes/query/` directory
- [ ] Split endpoints into logical files (~100-200 lines each)
- [ ] Create index.ts that composes sub-routers
- [ ] Update `server/src/index.ts` import
- [ ] All endpoints function identically (no API changes)
- [ ] Server builds and runs without errors

---

## REF-5: Standardize Error Handling Pattern

**Priority:** Medium
**Effort:** Medium (2 hours)
**Category:** Inconsistent Patterns

### Problem

Error handling varies across the codebase:

**Pattern 1: Silent catch (hides errors)**
```typescript
try {
  const files = await fs.readdir(dir);
} catch {
  // Directory doesn't exist - but also hides permission errors, I/O errors
}
```

**Pattern 2: Log and continue**
```typescript
try {
  // logic
} catch (error) {
  console.error('Error:', error);
}
```

**Pattern 3: Return error response**
```typescript
try {
  // logic
} catch (error) {
  res.status(500).json({ success: false, error: 'Failed' });
}
```

### Affected Files

| File | Approximate Count |
|------|-------------------|
| `server/src/routes/query.ts` | 15+ empty catches |
| `server/src/routes/projects.ts` | 5+ mixed patterns |
| `server/src/routes/index.ts` | 3+ mixed patterns |

### Proposed Solution

Create utility in `server/src/utils/errors.ts`:

```typescript
import fs from 'fs-extra';

// For expected "directory might not exist" cases
export async function readDirSafe(dir: string): Promise<string[]> {
  try {
    return await fs.readdir(dir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return []; // Expected: directory doesn't exist
    }
    throw error; // Unexpected: permission denied, I/O error, etc.
  }
}

// For route error responses
export function sendErrorResponse(
  res: Response,
  status: number,
  message: string,
  error?: unknown
) {
  if (error) {
    console.error(`[${status}] ${message}:`, error);
  }
  res.status(status).json({ success: false, error: message });
}
```

### Acceptance Criteria

- [ ] Create `server/src/utils/errors.ts`
- [ ] Replace empty catches with `readDirSafe()` where appropriate
- [ ] Replace route error handling with `sendErrorResponse()`
- [ ] Actual errors are logged, expected conditions are silent
- [ ] No behavior changes to API responses

---

## REF-6: Fix Fragile Transcript Filename Parsing

**Priority:** Medium
**Effort:** Small (30 mins)
**Category:** Fragile Code

### Problem

Transcript filenames are parsed by converting `.txt` to `.mov` and using the recording parser:

```typescript
const parsed = parseRecordingFilename(filename.replace('.txt', '.mov'));
```

This is fragile because:
- Assumes transcript naming matches recording naming exactly
- Extension substitution could fail for edge cases
- Intent is unclear

### Affected Files

| File | Lines |
|------|-------|
| `server/src/routes/query.ts` | 558 |
| `server/src/routes/query.ts` | 651 |
| `server/src/routes/query.ts` | 990 |

### Proposed Solution

Option A: Make `parseRecordingFilename` extension-agnostic:
```typescript
export function parseRecordingFilename(filename: string): ParsedRecording | null {
  // Strip any extension first
  const baseName = filename.replace(/\.[^/.]+$/, '');
  // ... rest of parsing
}
```

Option B: Create separate transcript parser:
```typescript
export function parseTranscriptFilename(filename: string): ParsedRecording | null {
  const baseName = filename.replace(/\.txt$/, '');
  return parseRecordingFilename(baseName + '.mov');
}
```

### Acceptance Criteria

- [ ] Parsing works without manual extension substitution
- [ ] All transcript parsing locations updated
- [ ] Unit tests added for edge cases
- [ ] No behavior changes

---

## REF-7: Standardize API Response Format

**Priority:** Low
**Effort:** Large (4+ hours)
**Category:** Inconsistent Patterns

### Problem

API responses use inconsistent formats:

```typescript
// Format 1: success + specific field
{ success: true, renamedFiles: [...] }

// Format 2: success + generic data
{ success: true, project: {...} }

// Format 3: no success field
{ projects: [...] }

// Format 4: nested structure
{ success: true, inbox: { totalFiles, subfolders } }
```

### Proposed Solution

Standardize to envelope pattern:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Usage
res.json({ success: true, data: { projects: [...] } });
res.json({ success: false, error: 'Not found' });
```

### Note

This is a breaking change for API consumers. Consider:
- Versioning the API (`/api/v2/...`)
- Migration period with both formats
- Updating all client code simultaneously

### Acceptance Criteria

- [ ] Response format documented
- [ ] All endpoints updated to use consistent format
- [ ] Client hooks updated to handle new format
- [ ] No runtime errors

---

## Summary Table

| ID | Title | Priority | Effort | Category |
|----|-------|----------|--------|----------|
| REF-1 | Extract Transcript Filtering Utility | High | Small | Duplication |
| REF-2 | Extract Tag Extraction Utility | High | Small | Duplication |
| REF-3 | Consolidate Response Types | High | Medium | Types |
| REF-4 | Split query.ts Into Sub-Modules | Medium | Large | Large File |
| REF-5 | Standardize Error Handling | Medium | Medium | Patterns |
| REF-6 | Fix Fragile Transcript Parsing | Medium | Small | Fragile Code |
| REF-7 | Standardize API Response Format | Low | Large | Patterns |

---

## Excluded Items

The following were identified but excluded from this backlog:

- **AssetsPage.tsx refactor** - Parked per product decision, noted in brainstorming-notes.md
- **API endpoint naming standardization** - Would be breaking change, defer to v2
