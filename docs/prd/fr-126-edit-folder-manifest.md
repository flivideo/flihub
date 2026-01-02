# FR-126: Edit Folder Manifest & Cleanup

**Status:** Pending
**Added:** 2026-01-02
**Implemented:** -
**Dependencies:** FR-122, FR-124, FR-111

---

## User Story

As a video creator, I want to delete source files from edit folders after copying them to save disk space, and be able to restore them from a manifest when I need to re-edit, so I don't waste 2-10 GB per project on duplicate video files.

---

## Problem

After copying files to `edit-1st/` for Gling editing (FR-122), there are several issues:

1. **Duplicate storage** - Full-size video files exist in both `recordings/` and `edit-1st/` (2-10 GB duplication)
2. **Disk space waste** - After Gling finishes editing, the source files in `edit-1st/` serve no purpose
3. **Can't safely delete** - If I delete sources and later reopen Gling, it errors (missing source files)
4. **Manual re-copy is tedious** - Have to remember which files were selected and copy them again

**User's workflow need:**
- Copy files to Gling → Edit in Gling → Delete sources to save space
- If Gling session closes → Restore sources from manifest → Continue editing

---

## Solution

Implement a **manifest-based copy tracking system** with three operations:

### 1. Manifest Creation (automatic during copy)

When "Prepare for Gling" copies files, create/update a manifest tracking:
- Which files were copied
- Source file hash (for change detection)
- Timestamp and size

### 2. Clean Edit Folder (new button)

Delete all source `.mov/.mp4` files from `edit-1st/` to save disk space:
- Preserve Gling output files (edited cuts)
- Manifest remains intact in `.flihub-state.json`
- Show confirmation with size savings

### 3. Restore from Manifest (new button)

Re-copy original files from `recordings/` → `edit-1st/`:
- Read manifest to know which files
- Validate originals still exist
- Warn if originals changed since copy (hash mismatch)
- Update manifest timestamps

---

## Manifest Design

### Storage Location

Store in `.flihub-state.json` (per-project state file from FR-111):

```json
{
  "version": 1,
  "recordings": { /* ... */ },
  "glingDictionary": [ /* ... */ ],
  "editManifest": {
    "edit-1st": {
      "lastCopied": "2026-01-02T15:30:00Z",
      "files": [
        {
          "filename": "01-1-intro.mov",
          "sourceHash": "sha256:abc123def456...",
          "copiedAt": "2026-01-02T15:30:00Z",
          "sourceSize": 245000000
        },
        {
          "filename": "01-2-intro-retake.mov",
          "sourceHash": "sha256:def456abc789...",
          "copiedAt": "2026-01-02T15:30:15Z",
          "sourceSize": 312000000
        }
      ]
    },
    "edit-2nd": {
      "lastCopied": null,
      "files": []
    },
    "edit-final": {
      "lastCopied": null,
      "files": []
    }
  }
}
```

### Manifest Fields

**Per edit folder:**
- `lastCopied` - ISO timestamp of most recent copy operation
- `files` - Array of file records

**Per file:**
- `filename` - Base filename (e.g., `01-1-intro.mov`)
- `sourceHash` - SHA-256 hash of first 1MB (fast change detection)
- `copiedAt` - ISO timestamp when this file was copied
- `sourceSize` - File size in bytes at time of copy

### Why This Design

✅ Consistent with existing `.flihub-state.json` pattern (FR-111)
✅ One manifest per project (user requirement)
✅ Tracks all three edit folders (edit-1st, edit-2nd, edit-final)
✅ Source hash detects if original changed since copy
✅ Timestamp tracking provides audit trail
✅ Survives project moves (state file moves with project)

---

## UI Design

### Export Panel - Edit Folders Section

```
── Edit Folders ─────────────────────────────────────────────────
✓ edit-1st    ← Gling exports     [Open]

  📋 Manifest: 12 files tracked
  Source files: 🟢 Present (2.4 GB)

  [Clean Edit Folder]  [Restore for Gling]

○ edit-2nd    ← Jan's edits       [Create]
○ edit-final  ← Final publish     [Create]

                         [Create All Folders]
```

### Status Indicators

Four possible states for edit-1st:

| Indicator | Meaning | Actions Available |
|-----------|---------|-------------------|
| 🟢 Present (2.4 GB) | Source files exist in edit-1st | Clean |
| 🔴 Cleaned | Source files deleted, manifest ready | Restore |
| ⚠️ Changed (3 files) | Original files modified since copy | Restore (with warnings) |
| ❌ Missing (2 files) | Original files no longer in recordings/ | Cannot restore |

### Button States

**Clean Edit Folder:**
- Enabled when: Status is 🟢 Present
- Disabled when: Status is 🔴 Cleaned, ⚠️ Changed, or ❌ Missing
- Action: Opens confirmation dialog

**Restore for Gling:**
- Enabled when: Status is 🔴 Cleaned or ⚠️ Changed
- Disabled when: Status is 🟢 Present or ❌ Missing
- Action: Copies files from recordings/ to edit-1st/

### Confirmation Dialogs

**Clean confirmation:**
```
┌──────────────────────────────────────────────────┐
│ Clean Edit Folder                                │
├──────────────────────────────────────────────────┤
│ Delete 12 source files from edit-1st/?          │
│                                                  │
│ • Will free up 2.4 GB                           │
│ • Gling output files will be preserved          │
│ • Original files in recordings/ are safe        │
│ • You can restore anytime using the manifest    │
│                                                  │
│              [Cancel]  [Delete Sources]          │
└──────────────────────────────────────────────────┘
```

**Restore with changes warning:**
```
┌──────────────────────────────────────────────────┐
│ Restore from Manifest - WARNING                  │
├──────────────────────────────────────────────────┤
│ 3 files have changed since they were copied:     │
│                                                  │
│ • 01-1-intro.mov (size changed)                 │
│ • 02-5-demo.mov (hash mismatch)                 │
│ • 03-2-outro.mov (modified today)               │
│                                                  │
│ Proceed anyway?                                  │
│                                                  │
│              [Cancel]  [Restore Anyway]          │
└──────────────────────────────────────────────────┘
```

---

## Acceptance Criteria

### Must Have

- [ ] Manifest created/updated automatically when "Prepare for Gling" copies files
- [ ] Manifest stored in `.flihub-state.json` under `editManifest` field
- [ ] File hash calculated using first 1MB of each file (SHA-256)
- [ ] "Clean Edit Folder" button deletes source files from edit-1st/
- [ ] Clean operation preserves Gling output files (smart detection)
- [ ] "Restore for Gling" button re-copies files from recordings/ to edit-1st/
- [ ] Status indicator shows current state (Present/Cleaned/Changed/Missing)
- [ ] Confirmation dialog before cleaning shows file count and size savings
- [ ] Restore validates all originals exist before copying any
- [ ] Warning dialog if originals changed (hash mismatch)

### Should Have

- [ ] Manifest tracks all three edit folders (edit-1st, edit-2nd, edit-final)
- [ ] Status shows total size of source files
- [ ] Clean preserves files that don't match manifest (manual additions)
- [ ] Restore updates manifest with new timestamps/hashes

### Nice to Have

- [ ] Progress indicator during clean/restore operations
- [ ] Detailed log of what was cleaned/restored
- [ ] "View Manifest" button to inspect tracked files

---

## Technical Notes

### API Endpoints

**New endpoints:**

1. **`POST /api/export/clean-edit-folder`**
   - Deletes source files from edit folder based on manifest
   - Request: `{ folder: "edit-1st" | "edit-2nd" | "edit-final" }`
   - Response: `{ success: boolean, deletedCount: number, freedBytes: number, errors?: string[] }`

2. **`POST /api/export/restore-edit-folder`**
   - Restores files from recordings/ to edit folder using manifest
   - Request: `{ folder: "edit-1st" | "edit-2nd" | "edit-final" }`
   - Response: `{ success: boolean, restoredCount: number, changedFiles?: string[], errors?: string[] }`

3. **`GET /api/export/manifest-status/:folder`**
   - Returns current status of edit folder vs manifest
   - Response: `{ status: "present" | "cleaned" | "changed" | "missing", fileCount: number, totalBytes: number, changedFiles?: string[], missingFiles?: string[] }`

**Enhanced endpoint:**

4. **`POST /api/export/copy-to-gling`** (existing)
   - Add manifest creation after successful copy
   - Calculate hash for each copied file
   - Update `.flihub-state.json`

### Hash Calculation

Use Node.js `crypto` module:

```typescript
import crypto from 'crypto'
import fs from 'fs/promises'

async function calculateFileHash(filePath: string): Promise<string> {
  const CHUNK_SIZE = 1024 * 1024 // 1MB
  const fd = await fs.open(filePath, 'r')
  const buffer = Buffer.alloc(CHUNK_SIZE)

  try {
    await fd.read(buffer, 0, CHUNK_SIZE, 0)
    const hash = crypto.createHash('sha256').update(buffer).digest('hex')
    return `sha256:${hash}`
  } finally {
    await fd.close()
  }
}
```

**Why first 1MB only:**
- Fast (don't hash multi-GB files)
- Sufficient for change detection
- Video file headers change if content changes

### Gling Output Detection

Smart detection to preserve Gling output files:

```typescript
function isGlingOutput(filename: string, manifestFiles: string[]): boolean {
  // If file is NOT in manifest, it's a Gling output or manual addition
  return !manifestFiles.includes(filename)
}
```

**Rules:**
- Only delete files that are IN the manifest
- Preserve everything else (Gling outputs, manual additions)

### TypeScript Types

Add to `shared/types.ts`:

```typescript
export interface EditManifestFile {
  filename: string
  sourceHash: string
  copiedAt: string  // ISO 8601
  sourceSize: number
}

export interface EditFolderManifest {
  lastCopied: string | null  // ISO 8601
  files: EditManifestFile[]
}

export interface EditManifest {
  'edit-1st': EditFolderManifest
  'edit-2nd': EditFolderManifest
  'edit-final': EditFolderManifest
}

export interface ProjectState {
  version: number
  recordings: Record<string, RecordingState>
  glingDictionary?: string[]
  editManifest?: EditManifest  // NEW
}

export type ManifestStatus = 'present' | 'cleaned' | 'changed' | 'missing'

export interface ManifestStatusResponse {
  success: boolean
  status: ManifestStatus
  fileCount: number
  totalBytes: number
  changedFiles?: string[]
  missingFiles?: string[]
}
```

### Files to Modify

| File | Changes |
|------|---------|
| `server/src/routes/export.ts` | Add clean/restore endpoints, enhance copy-to-gling |
| `server/src/utils/projectState.ts` | Add manifest helper functions |
| `client/src/components/ExportPanel.tsx` | Add Clean/Restore buttons, status display |
| `client/src/hooks/useApi.ts` | Add hooks for new endpoints |
| `shared/types.ts` | Add manifest types |

**New utilities:**

Create `server/src/utils/editManifest.ts`:
```typescript
// Manifest creation
export async function createManifest(folder: string, files: string[], recordingsPath: string): Promise<EditFolderManifest>

// Clean operation
export async function cleanEditFolder(folder: string, manifest: EditFolderManifest, editFolderPath: string): Promise<CleanResult>

// Restore operation
export async function restoreEditFolder(folder: string, manifest: EditFolderManifest, recordingsPath: string, editFolderPath: string): Promise<RestoreResult>

// Status check
export async function getManifestStatus(folder: string, manifest: EditFolderManifest, recordingsPath: string, editFolderPath: string): Promise<ManifestStatusResponse>
```

---

## Edge Cases & Safeguards

### Edge Case 1: Original File Renamed

**Scenario:** User renames `01-1-intro.mov` → `01-1-introduction.mov` in recordings/

**Behavior:**
- Manifest becomes stale (still references `01-1-intro.mov`)
- Status shows ❌ Missing
- Restore button disabled
- Error message: "1 file no longer exists in recordings/"

**Solution:** Manual cleanup - user must update manifest or re-copy

### Edge Case 2: Original File Modified

**Scenario:** User re-records over `01-1-intro.mov` (same filename, different content)

**Behavior:**
- Hash mismatch detected
- Status shows ⚠️ Changed
- Restore shows warning dialog
- User decides to proceed or cancel

**Solution:** Let user restore anyway (they may want new version)

### Edge Case 3: Manual File Deletion

**Scenario:** User manually deletes files from edit-1st/ outside FliHub

**Behavior:**
- Status check detects missing files
- Status shows 🔴 Cleaned (partial)
- Restore restores all manifest files

**Solution:** Idempotent restore - no harm in re-copying

### Edge Case 4: Gling Output Name Collision

**Scenario:** Gling outputs `01-1-intro-cut.mov` but manifest has `01-1-intro.mov`

**Behavior:**
- Clean only deletes `01-1-intro.mov` (in manifest)
- Preserves `01-1-intro-cut.mov` (not in manifest)

**Solution:** Smart detection works correctly

### Edge Case 5: Multiple Copy Operations

**Scenario:** User copies different file selections to same folder

**Behavior:**
- Each copy operation REPLACES the manifest for that folder
- Manifest always reflects most recent copy operation
- Old selections forgotten

**Solution:** Expected behavior - manifest = current Gling session

### Safeguards

**Before Clean:**
1. Validate manifest exists and has files
2. Scan edit folder to preserve non-manifest files
3. Show confirmation dialog with accurate counts
4. Log what will be deleted

**Before Restore:**
1. Check ALL originals exist before copying ANY
2. Calculate hashes to detect changes
3. Show warning if any files changed
4. Atomic operation (all or nothing)

**Hash Validation:**
1. Detect size changes (different from manifest)
2. Detect hash mismatches (content changed)
3. Warn user, but allow proceeding

**Manifest Validation:**
1. Validate manifest structure on read
2. Handle corrupt/missing manifest gracefully
3. Never delete files without valid manifest

---

## Dependencies

- **FR-122:** Export Panel (provides copy-to-gling operation) ✓ Implemented
- **FR-124:** Export Panel Enhancements (provides folder management UI) ✓ Implemented
- **FR-111:** Safe Architecture (provides `.flihub-state.json` pattern) ✓ Implemented

---

## Value Proposition

**Disk Space Savings:**
- Typical project: 88 recordings × ~100 MB = ~8.8 GB
- After clean: 0 bytes (sources deleted)
- Savings: 8.8 GB per project during editing phase

**Workflow Improvement:**
1. Copy 12 files to Gling → Edit → Clean (saves 2.4 GB)
2. Gling crashes or session closes
3. Restore with 1 click → Continue editing
4. No need to remember which files were selected

**Safety:**
- Originals never touched in `recordings/`
- Manifest provides audit trail
- Can restore anytime
- Gling outputs automatically preserved

---

## Future Considerations

- Manifest for edit-2nd and edit-final (currently only edit-1st needed)
- Auto-clean after Gling completes (detect output files, auto-delete sources)
- Compression instead of deletion (`.mov.gz` saves space, preserves files)
- Manifest export/import for collaboration
- Visual diff showing what changed in originals

---

## Completion Notes

_To be filled by developer upon completion._
