# FR-113: Edit Prep Path Fix & Folder Restructure

**Type:** Bug Fix + Enhancement
**Priority:** High
**Added:** 2025-12-27
**Implemented:** 2025-12-31

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

## Completion Notes

**Implemented:** 2025-12-31

### Bug Fix (Original Scope)
- Added `expandPath()` to resolve tilde paths correctly
- Recordings list now shows actual files
- Folders created in correct project location

### Additional Enhancements (Bundled)

**New folder structure:**
```
project/
├── edit-1st/      # First edit prep (Gling cuts)
├── edit-2nd/      # Second edit (Jan's graphics)
└── edit-final/    # Final review
```

- Flat structure (no nested `edits/prep`)
- Singular naming to match "recording" convention
- "Create All" button creates all three folders in one click

**Naming convention change:**
- Renamed from "first-edit/edits" to "edit" (singular)
- Consistent with "recording" (not "recordings")

### Files Changed

**Renamed:**
- `server/src/routes/first-edit.ts` -> `server/src/routes/edit.ts`
- `client/src/hooks/useFirstEditApi.ts` -> `client/src/hooks/useEditApi.ts`
- `client/src/components/FirstEditPrepPage.tsx` -> `client/src/components/EditPrepPage.tsx`

**Modified:**
- `server/src/index.ts` - Import + route `/api/edit`
- `client/src/App.tsx` - Imports, state, menu label

### API Changes

| Endpoint | Purpose |
|----------|---------|
| `GET /api/edit/prep` | Returns `editFolders: { allExist, folders: [{name, exists}] }` |
| `POST /api/edit/create-folders` | Creates all three edit folders |

### Testing

1. Open Edit Prep page
2. Verify recordings list shows files with sizes
3. Click "Create All" -> all three folders created
4. Folders appear at `{project}/edit-1st/`, `edit-2nd/`, `edit-final/`

**Status:** Complete

---

## Related

- FR-89: Cross-Platform Path Support (introduced split path config)
