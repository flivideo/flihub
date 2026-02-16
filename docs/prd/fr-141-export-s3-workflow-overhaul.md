# FR-141: Export & S3 Workflow Overhaul

**Status:** With Developer
**Priority:** 🔴 CRITICAL - Based on real user feedback
**Added:** 2026-02-16
**Decision:** Option B - Full Redesign (approved 2026-02-16)
**Type:** UX Redesign + Bug Fixes
**Estimate:** 16-20 hours

---

## Executive Summary

User tested Export panel + S3 Staging workflow and identified **7 critical pain points** during actual usage. After discussion, user approved **Option B: Full Redesign** to consolidate Export + S3 features into Manage area as a new tool.

**User decision:** "Let's do option B. What we need to do is write up a ticket, and then I'll take it over to the developer."

---

## User's 5 Decisions

### Q1: "Prepare for Gling" Button
**User answer:** Replace with TWO simpler buttons:
1. **Copy Folder Path** - Puts recordings folder path in clipboard
2. **Open in Finder** - Opens recordings folder in Finder

User wants to drag files manually to Gling, not have them copied automatically.

### Q2: Consolidate into Manage area
**User answer:** YES, but as its own **sub-menu** (not individual tools)
- Already have 7 sub-menus on left
- This is "another complex concept within management"
- Create one new sub-menu with Export + S3 features inside

### Q3: View button (S3)
**User answer:** Current form not useful, but keep the feature with fixes:
- Display bucket name/path (so user knows WHERE to navigate if needed)
- Show file list preview WITHOUT requiring AWS console login
- If preview isn't possible, at least show the S3 path clearly

### Q4: Frontend designer
**User answer:** Not needed yet (still in requirements phase)

### Q5: edit-2nd folder removal
**User answer:** DON'T remove yet
- Keep it for now
- User needs clearer explanation of what edit-1st does
- Future needs unclear, so keep both folders

---

## Pain Points Identified

### 1. "Prepare for Gling" Creates Unnecessary Duplicates ❌

**Problem:**
- Button copies `recordings/` → `edit-1st/`
- User says: "files were fine where they were in recordings directory"
- Creates duplicate files (wastes disk space)
- Button is "not that helpful"

**Root cause:**
- Original design assumed user would copy files TO Gling
- Reality: User exports FROM Gling directly to `edit-1st/`
- The copy step is pointless

**Solution (user-approved):**
Replace "Prepare for Gling" with:
1. **Copy Folder Path** button - Clipboard gets recordings folder path
2. **Open in Finder** button - Opens recordings folder

User drags files manually from Finder → Gling.

---

### 2. "Copy File List" Button is Broken 🐛

**Problem:**
- When clicked, clipboard only contains the word "Copies"
- Not copying actual file list

**Expected behavior:**
- Should copy absolute paths (one per line) to clipboard

**Solution:**
Fix clipboard logic to copy actual file paths.

---

### 3. Actual Workflow vs Intended Workflow Mismatch ⚠️

**Problem:**
- Intended workflow: recordings → copy to edit-1st → drag into Gling
- Actual workflow: recordings → drag into Gling → Gling exports to edit-1st

**Solution:**
Support actual workflow with folder path copy + Finder open.

---

### 4. UI Fragmentation - Features Split Across Two Places ⚠️

**Problem:**
- Export panel has: file selection, "Prepare for Gling", folder management
- S3 Staging modal (⚙️ menu) has: S3 upload/download, DAM integration
- User has to jump between Export tab and Settings menu

**Quote:** "This is where things all get a bit confusing"

**Solution (user-approved):**
Create new **Export/S3 sub-menu** in Manage area (like Renumber, Regen tools).

---

### 5. S3 Status Showing "✓ Uploaded" Incorrectly 🐛

**Problem:**
- Green text: "✓ Uploaded"
- But user says: "I have never pressed the upload to s3"
- Screenshot shows: folders show "(folder does not exist)"
- False positive status display

**Solution:**
Fix S3 status detection to check actual upload state (not just folder existence).

---

### 6. "View" Button Doesn't Work as Expected ⚠️

**Problem:**
- Takes user to Amazon login page
- Then have to navigate to right location
- User says: "That's all the pain in the ass as well"

**Expected behavior:**
- Show files WITHOUT signing into Amazon
- Display bucket name/location clearly
- Maybe show file preview if possible

**Solution (user-approved):**
- Display S3 bucket path prominently
- Show file list preview if possible (via DAM CLI)
- If preview not possible, just show clear path to bucket

---

### 7. edit-2nd Folder Confusion 💡

**Problem (from earlier discussion):**
- User questioned purpose of edit-2nd folder
- Seems redundant with s3-staging/post

**User decision:**
- Keep edit-2nd for now
- Provide clearer documentation about folder purposes
- Future needs unclear

**Out of scope for FR-141** (documentation update only)

---

## Solution: New Export/S3 Sub-Menu in Manage Area

### UI Mockup

**Manage Panel with new Export/S3 tool:**

```
┌─────────────────────────────────────────────────────────────────┐
│  Manage                                                          │
├──────────┬───────────────────────────────────────────────────────┤
│  Tools   │  [Main recording list with selection checkboxes]     │
│  ─────   │                                                       │
│          │  12 files selected (2.4 GB)                          │
│  ⚡ Regen │                                                       │
│          │  ☑ 01-1-intro.mov              245 MB                │
│  🔢 Renumber│  ☑ 01-2-intro.mov              312 MB                │
│          │  ☑ 02-1-demo.mov               456 MB                │
│  📤 Export/S3 │  ...                                                 │  ← NEW TOOL
│          │                                                       │
│  📁 Folders│                                                      │
│          │                                                       │
└──────────┴───────────────────────────────────────────────────────┘
```

**When Export/S3 tool is clicked, drawer opens:**

```
┌─────────────────────────────────────────────────────────────────────┐
│  Export / S3 Staging                                        [Close] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ──────────── GLING PREPARATION ────────────────────────────────    │
│                                                                     │
│  Recordings Folder:                                                 │
│  ~/dev/video-projects/v-appydave/b93-poem-epic-1/recordings/        │
│                                                                     │
│  [📋 Copy Folder Path]  [📂 Open in Finder]                         │
│                                                                     │
│  💡 Tip: Drag files from Finder into Gling, then export to edit-1st │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  ──────────── GLING INFO ───────────────────────────────────────    │
│                                                                     │
│  Export Filename: b93-poem-epic-1                         [Copy]    │
│                                                                     │
│  Dictionary:                                                        │
│    Global: 25 words                                       [Copy]    │
│    Project: 8 words                                [Edit] [Copy]    │
│    Combined: 33 words                                  [Copy All]   │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  ──────────── EDIT FOLDERS ─────────────────────────────────────    │
│                                                                     │
│  ✓ edit-1st    ← Gling exports                          [Open]     │
│  ○ edit-2nd    ← Jan's edits                            [Create]    │
│  ○ edit-final  ← Final publish                          [Create]    │
│                                                                     │
│                                              [Create All Folders]   │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  ──────────── S3 STAGING ───────────────────────────────────────    │
│                                                                     │
│  S3 Bucket: v-appydave/b93-poem-epic-1                              │
│  📋 s3://v-appydave/b93-poem-epic-1/                      [Copy]    │
│                                                                     │
│  PREP (Your First Edit → Jan)                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Local: edit-1st/                                           │   │
│  │    2 files (512 MB)                                         │   │
│  │                                                             │   │
│  │  S3 Status: ○ Not uploaded                                 │   │
│  │                                                             │   │
│  │  [Upload to S3]  (uploads edit-1st/ contents)              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  POST (Jan's Edits → You)                                           │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  S3: 2 new files available                                  │   │
│  │    b93-poem-epic-1-v1.mp4 (498 MB)                          │   │
│  │    b93-poem-epic-1-v1.srt (31 KB)                           │   │
│  │                                                             │   │
│  │  [Download from S3]  (downloads to s3-staging/post/)        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  CLEANUP                                                            │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Local s3-staging: 1.5 GB                    [Clean Local]  │   │
│  │  S3 bucket: 1.5 GB                           [Clean S3]     │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## What Gets Removed

### Delete Entirely

1. **Export tab** - Remove from navigation
   - File: `client/src/App.tsx` (navigation array)
   - Component: `client/src/components/ExportPanel.tsx` (DELETE after migrating content)

2. **S3 Staging modal** - Remove from settings menu
   - File: `client/src/App.tsx` (remove menu item, state, modal)
   - Component: `client/src/components/S3StagingPage.tsx` (DELETE after migrating content)

3. **"Prepare for Gling" button** - Replaced with Copy Folder Path + Open Finder
   - Endpoint: `POST /api/export/copy-to-gling` (DELETE)
   - Logic: File copy operation (DELETE)

### Relocate (Move to New Tool)

**From ExportPanel.tsx:**
- Gling filename with copy button
- Dictionary display (Global, Project, Combined)
- Edit folders section (edit-1st, edit-2nd, edit-final)
- Open folder buttons

**From S3StagingPage.tsx:**
- S3 bucket path display
- PREP section (upload status, upload button)
- POST section (download status, file list, download button)
- CLEANUP section (clean local, clean S3)

---

## What Gets Created

### New Components

1. **ExportS3Tool.tsx** (new drawer component)
   - Combines Export + S3 features
   - ~600-800 lines
   - Uses SlideOutDrawer pattern (FR-137)

### New Endpoints

1. **`POST /api/manage/copy-folder-path`**
   - Returns recordings folder path
   - Client copies to clipboard

2. **`GET /api/s3-staging/file-preview`** (optional enhancement)
   - Returns S3 file list via DAM CLI
   - Shows files without AWS console login

### New Buttons

1. **Copy Folder Path** - Copies recordings folder path to clipboard
2. **Open in Finder** - Opens recordings folder in Finder

---

## Bug Fixes Included

### BUG-1: Copy File List (30 min)

**File:** `client/src/components/ExportPanel.tsx` (migrate to ExportS3Tool.tsx)

**Current (broken):**
```typescript
navigator.clipboard.writeText('Copies'); // ❌ Hardcoded string
```

**Fix:**
```typescript
const paths = selectedFiles.map(f => path.join(recordingsPath, f.filename));
navigator.clipboard.writeText(paths.join('\n')); // ✅ Actual paths
```

### BUG-2: S3 Status False Positive (2 hours)

**File:** `server/src/routes/s3-staging.ts`

**Problem:** Returns "uploaded" even when nothing was uploaded

**Fix:**
1. Don't rely on local folder existence
2. Query actual S3 bucket via DAM CLI
3. Default to "Not uploaded" unless confirmed upload

**Implementation:**
```typescript
// Current logic (wrong):
const uploaded = fs.existsSync(prepStagingPath); // ❌ Just checks local folder

// New logic (correct):
const damStatus = await runDamCommand(['s3-status', brand, projectCode]);
const uploaded = damStatus.includes('prep/') && damStatus.includes('uploaded'); // ✅ Actual S3 check
```

---

## Acceptance Criteria

### Must Have (Phase 1: Bug Fixes + Core Consolidation)

- [ ] **New tool added to Manage sidebar**: "📤 Export/S3"
- [ ] **Tool drawer opens** with all 4 sections (Gling Prep, Gling Info, Edit Folders, S3 Staging)
- [ ] **Copy Folder Path button** copies recordings folder path to clipboard
- [ ] **Open in Finder button** opens recordings folder in Finder
- [ ] **Gling Info section** shows filename + dictionary (Global, Project, Combined)
- [ ] **Edit Folders section** shows folder status + Create/Open buttons
- [ ] **S3 Bucket path displayed** with Copy button
- [ ] **S3 PREP section** shows upload status + Upload button
- [ ] **S3 POST section** shows file list + Download button
- [ ] **S3 CLEANUP section** shows storage + Clean buttons
- [ ] **BUG FIX**: Copy File List copies actual paths (not "Copies")
- [ ] **BUG FIX**: S3 status shows "Not uploaded" correctly
- [ ] **Export tab removed** from navigation
- [ ] **S3 Staging modal removed** from settings menu
- [ ] **Prepare for Gling endpoint deleted** (`POST /api/export/copy-to-gling`)

### Should Have (Phase 2: Enhancements)

- [ ] **S3 file preview** - Show files without AWS console login (via DAM CLI)
- [ ] **Bucket path more prominent** - Large, copyable text
- [ ] **Tip text** - Explain drag workflow ("Drag files from Finder into Gling...")
- [ ] **All buttons disabled** during DAM operations (prevent double-clicks)
- [ ] **Progress indicators** for Upload/Download operations

### Nice to Have (Phase 3: Polish)

- [ ] **Smooth animations** - Tool drawer slide-in/out
- [ ] **Icon consistency** - Replace emojis with proper icons (future)
- [ ] **Responsive drawer** - Adjust width for different screen sizes

---

## Technical Notes

### Folder Path Operations

**Copy Folder Path:**
```typescript
// Server endpoint: GET /api/manage/recordings-folder-path
const config = getConfig();
const recordingsPath = path.join(expandPath(config.projectDirectory), 'recordings');
return { success: true, path: recordingsPath };

// Client handler:
const handleCopyFolderPath = async () => {
  const response = await fetch('/api/manage/recordings-folder-path');
  const { path } = await response.json();
  navigator.clipboard.writeText(path);
  toast.success('Recordings folder path copied to clipboard');
};
```

**Open in Finder:**
```typescript
// Reuse existing system endpoint:
POST /api/system/open-in-finder
{ folder: 'recordings' }

// Client handler:
const handleOpenFinder = async () => {
  await fetch('/api/system/open-in-finder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folder: 'recordings' })
  });
};
```

### S3 Status Detection Fix

**Current (broken):**
```typescript
// Checks local folder, not S3 bucket
const prepPath = path.join(projectDir, 's3-staging', 'prep');
const uploaded = fs.existsSync(prepPath) && fs.readdirSync(prepPath).length > 0;
```

**Fixed (correct):**
```typescript
// Query actual S3 bucket via DAM CLI
const { stdout } = await execAsync(`dam s3-status ${brand} ${projectCode}`);
const uploaded = stdout.includes('prep/') && !stdout.includes('0 files');
```

### Tool Registration

**Manage Panel Tools Array:**
```typescript
const MANAGE_TOOLS = [
  { id: 'regen', label: 'Regen', icon: '⚡' },
  { id: 'renumber', label: 'Renumber', icon: '🔢' },
  { id: 'export-s3', label: 'Export/S3', icon: '📤' }, // NEW
  { id: 'folders', label: 'Folders', icon: '📁' },
] as const;
```

### Drawer Component Structure

```typescript
// ExportS3Tool.tsx structure
export function ExportS3Tool({ isOpen, onClose }: ToolProps) {
  return (
    <SlideOutDrawer isOpen={isOpen} onClose={onClose} width={560}>
      {/* GLING PREPARATION section */}
      <GlingPreparation />

      {/* GLING INFO section */}
      <GlingInfo />

      {/* EDIT FOLDERS section */}
      <EditFolders />

      {/* S3 STAGING section */}
      <S3Staging />
    </SlideOutDrawer>
  );
}
```

---

## Files to Create

| File | Purpose | Estimate |
|------|---------|----------|
| `client/src/components/shared/ExportS3Tool.tsx` | New tool drawer (600-800 lines) | 8 hours |
| `server/src/routes/manage.ts` | Add recordings-folder-path endpoint | 30 min |

---

## Files to Modify

| File | Changes | Estimate |
|------|---------|----------|
| `client/src/components/ManagePanel.tsx` | Add Export/S3 tool to sidebar | 1 hour |
| `client/src/App.tsx` | Remove Export tab, S3 modal, navigation | 1 hour |
| `server/src/routes/s3-staging.ts` | Fix S3 status detection logic | 2 hours |
| `server/src/routes/system.ts` | Ensure recordings folder supported | 30 min |
| `server/src/index.ts` | Wire up new endpoints | 30 min |

---

## Files to Delete

| File | Reason |
|------|--------|
| `client/src/components/ExportPanel.tsx` | Content moved to ExportS3Tool.tsx |
| `client/src/components/S3StagingPage.tsx` | Content moved to ExportS3Tool.tsx |
| `server/src/routes/export.ts` | Endpoint `/copy-to-gling` no longer needed |

**Note:** Keep backup before deleting - verify all content migrated.

---

## Migration Strategy

### Phase 1: Create New Tool (8 hours)

1. Create `ExportS3Tool.tsx` drawer component
2. Migrate Gling Prep section:
   - Copy Folder Path button (new)
   - Open in Finder button (new)
   - Tip text (new)
3. Migrate Gling Info section:
   - From ExportPanel.tsx: Filename + Dictionary
4. Migrate Edit Folders section:
   - From ExportPanel.tsx: Folder list + Create/Open buttons
5. Migrate S3 Staging section:
   - From S3StagingPage.tsx: PREP, POST, CLEANUP sections

### Phase 2: Fix Bugs (2.5 hours)

1. Fix Copy File List bug (migrate fixed version to tool)
2. Fix S3 status detection in `s3-staging.ts`
3. Add recordings-folder-path endpoint

### Phase 3: Remove Old UI (2 hours)

1. Remove Export tab from navigation
2. Remove S3 Staging modal from settings menu
3. Delete old components (ExportPanel, S3StagingPage)
4. Delete export routes file

### Phase 4: Testing (2-3 hours)

1. Test Copy Folder Path button
2. Test Open in Finder button
3. Test S3 upload/download
4. Test all existing features still work
5. Verify no broken links/navigation

**Total estimate:** 16-20 hours

---

## Testing Checklist

### Gling Preparation
- [ ] Copy Folder Path copies recordings path to clipboard
- [ ] Open in Finder opens recordings folder
- [ ] Tip text displays correctly

### Gling Info
- [ ] Filename displays correctly
- [ ] Copy filename works
- [ ] Global dictionary displays with word count
- [ ] Project dictionary displays with word count
- [ ] Combined dictionary displays with merged count
- [ ] All Copy buttons work

### Edit Folders
- [ ] Folder status indicators correct (✓ exists, ○ missing)
- [ ] Create buttons create folders
- [ ] Open buttons open folders in Finder
- [ ] Create All Folders creates all three

### S3 Staging
- [ ] S3 bucket path displays correctly
- [ ] Copy bucket path works
- [ ] PREP shows correct upload status (Not uploaded if not uploaded)
- [ ] Upload button uploads edit-1st/ contents
- [ ] POST shows file list from S3
- [ ] Download button downloads to s3-staging/post/
- [ ] Clean Local deletes s3-staging folder
- [ ] Clean S3 deletes S3 bucket contents

### Bug Fixes
- [ ] Copy File List (if kept) copies actual paths
- [ ] S3 status no longer shows false positive

### Cleanup
- [ ] Export tab removed from navigation
- [ ] S3 Staging modal removed from settings menu
- [ ] No errors in browser console
- [ ] All existing Manage tools still work

---

## Dependencies

- **FR-136:** Tool-Oriented Manage Panel (provides sidebar)
- **FR-137:** SlideOutDrawer Tool Pattern (drawer component)
- **FR-122:** Export Panel (current implementation to migrate)
- **FR-105:** S3 DAM Integration (current implementation to migrate)
- **FR-125:** Config & EditPrep Consolidation (dictionary split)

---

## User Impact

### Before (Current Pain Points)

❌ "Prepare for Gling" creates duplicate files
❌ Copy File List broken (shows "Copies")
❌ S3 shows "uploaded" when nothing uploaded
❌ Features split across Export tab + S3 modal
❌ Have to navigate between 3 places
❌ "View" button sends to AWS login

### After (Fixed)

✅ Copy Folder Path + Open Finder (no duplicates)
✅ Copy File List works correctly
✅ S3 status accurate (shows "Not uploaded")
✅ All features in one place (Manage → Export/S3 tool)
✅ Consistent tool pattern (like Renumber, Regen)
✅ S3 bucket path displayed prominently

---

## Documentation Updates Needed

After implementation:

1. Update `docs/architecture/patterns.md` - Add ExportS3Tool example
2. Update `docs/backlog.md` - Mark FR-141 as Complete
3. Update `docs/changelog.md` - Document what changed
4. Update `CLAUDE.md` - Remove references to Export tab
5. Create user guide: "Working with Gling and S3" (explain new workflow)

---

## Future Enhancements (Out of Scope)

- **S3 file preview** - Show S3 files without AWS login (requires DAM enhancement)
- **Icon design** - Replace emoji icons with proper SVG icons
- **Keyboard shortcuts** - Quick access to tools (Cmd+E for Export/S3?)
- **Gling integration** - Auto-detect when Gling export completes
- **edit-2nd folder clarity** - Better documentation/tooltips explaining folder purposes

---

## Handover to Developer

**Priority:** 🔴 CRITICAL (user waiting)

**Approach:** Option B - Full Redesign (user-approved)

**Key points:**
1. Consolidate Export + S3 into ONE new tool in Manage sidebar
2. Replace "Prepare for Gling" with Copy Folder Path + Open Finder
3. Fix two critical bugs (Copy File List, S3 status)
4. Delete Export tab and S3 Staging modal
5. Keep edit-2nd folder (don't remove)

**User quote:** "Let's do option B. What we need to do is write up a ticket, and then I'll take it over to the developer."

**Start with:** Phase 1 (Create new tool) → Phase 2 (Fix bugs) → Phase 3 (Remove old UI)

**Questions for developer:** None - all decisions made by user

---

## Completion Notes

**What was done:**
- Created `ExportS3Tool.tsx` (~700 lines) - new unified drawer component with 4 sections
- Added `GET /api/manage/recordings-folder-path` endpoint
- Registered Export/S3 as complex tool in ToolsSidebar (replacing old Export tool)
- Wired up SlideOutDrawer in ManagePanel
- Removed S3 Staging modal from App.tsx settings menu
- Fixed S3 status false positive (BUG-2): `uploaded` now defaults to false, only true when DAM confirms files exist
- Copy File List bug (BUG-1) addressed by design: replaced with Copy Folder Path button

**Files created:**
- `client/src/components/shared/ExportS3Tool.tsx` (new)

**Files modified:**
- `server/src/routes/manage.ts` - Added recordings-folder-path endpoint
- `server/src/routes/s3-staging.ts` - Fixed S3 status false positive bug
- `client/src/components/ManagePanel.tsx` - Replaced Export drawer with ExportS3Tool
- `client/src/components/shared/ToolsSidebar.tsx` - Changed Export to Export/S3 tool
- `client/src/components/shared/index.ts` - Added ExportS3Tool export
- `client/src/App.tsx` - Removed S3 Staging modal and menu item

**Files now unused (can be deleted after UAT):**
- `client/src/components/S3StagingPage.tsx` - Content migrated to ExportS3Tool
- `client/src/components/shared/ExportPanel.tsx` - Content migrated to ExportS3Tool
- `server/src/routes/export.ts` - copy-to-gling endpoint no longer needed (manifest/clean/restore endpoints still used)

**Testing notes:**
- Navigate to Manage panel, click "Export / S3" in sidebar
- Verify Gling Preparation section: Copy Folder Path and Open in Finder buttons
- Verify Gling Info section: filename, dictionaries (global/project/combined)
- Verify Edit Folders section: folder status, create/open buttons
- Verify S3 Staging section: bucket path, PREP/POST/CLEANUP sections
- Verify S3 status shows "Not uploaded" by default (not false positive)
- Verify S3 Staging modal no longer appears in settings menu

**Status:** Complete

---

**Status:** Complete
**Approved by:** David (product owner)
**Date:** 2026-02-16
