# FR-113: First Edit Prep Path Expansion Bug

**Type:** Bug Fix
**Priority:** High
**Added:** 2025-12-27

---

## Problem

The First Edit Prep modal shows "0 recordings" and fails to create the `edits/prep` folder in the correct location.

**Symptoms:**
- Recordings show "(no recordings)" even when project has recordings
- "Create prep folder" button says success but folder isn't created in project
- Folder is created at wrong location (literal `~` folder inside server directory)

**Actual path created:**
```
/Users/davidcruwys/dev/ad/flivideo/flihub/server/~/dev/video-projects/v-appydave/b93-poem-epic-1/edits/prep
```

**Expected path:**
```
/Users/davidcruwys/dev/video-projects/v-appydave/b93-poem-epic-1/edits/prep
```

---

## Root Cause

`server/src/routes/first-edit.ts` does not use `expandPath()` to convert tilde paths to absolute paths.

**Current code:**
```typescript
// Line 26
const recordingsPath = path.join(config.projectDirectory, 'recordings')

// Line 47
const prepPath = path.join(config.projectDirectory, 'edits', 'prep')

// Line 100
const prepPath = path.join(config.projectDirectory, 'edits', 'prep')
```

**Problem:** `config.projectDirectory` contains `~/dev/video-projects/...` (with tilde). Without `expandPath()`, the tilde is treated as a literal directory name.

**Other routes do it correctly:**
```typescript
// Example from routes/index.ts
const paths = getProjectPaths(expandPath(config.projectDirectory))
```

---

## Solution

Add `expandPath()` wrapper to all uses of `config.projectDirectory` in `first-edit.ts`.

---

## Acceptance Criteria

- [ ] Import `expandPath` from `../utils/pathUtils.js`
- [ ] Wrap `config.projectDirectory` with `expandPath()` on lines 26, 47, 100
- [ ] Recordings list shows actual recordings
- [ ] Prep folder is created in correct project location
- [ ] No literal `~` folders created anywhere

---

## Implementation

**File:** `server/src/routes/first-edit.ts`

**Changes:**

```typescript
// Add import at top
import { expandPath } from '../utils/pathUtils.js'

// Line 26 - recordings path
const recordingsPath = path.join(expandPath(config.projectDirectory), 'recordings')

// Line 47 - prep folder check
const prepPath = path.join(expandPath(config.projectDirectory), 'edits', 'prep')

// Line 100 - prep folder creation
const prepPath = path.join(expandPath(config.projectDirectory), 'edits', 'prep')
```

---

## Cleanup

User should delete the erroneously created folder:
```bash
rm -rf /Users/davidcruwys/dev/ad/flivideo/flihub/server/'~'
```

---

## Testing

1. Open First Edit Prep modal on a project with recordings
2. Verify recordings list shows actual files with sizes
3. Click "Create prep folder"
4. Verify folder created at `{project}/edits/prep/` (not in server directory)
5. Verify no `~` folder exists in `flihub/server/`

---

## Related

- FR-89: Cross-Platform Path Support (introduced split path config)
