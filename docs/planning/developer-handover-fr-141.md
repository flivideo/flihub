# Developer Handover - FR-141: Export & S3 Workflow Overhaul

**Date:** 2026-02-16
**Status:** Ready for implementation
**Priority:** 🔴 CRITICAL
**Estimate:** 16-20 hours

---

## Quick Summary

User tested Export + S3 workflow and found **7 pain points + 2 critical bugs**. After discussion, user approved **Option B: Full Redesign** to consolidate everything into Manage area as a new tool.

**User quote:** "Let's do option B. What we need to do is write up a ticket, and then I'll take it over to the developer."

---

## What We're Building

### New: Export/S3 Tool in Manage Area

Add a **new tool to Manage sidebar** (like Renumber, Regen tools) that combines:
1. **Gling Preparation** - Copy folder path + Open Finder (NO file copying)
2. **Gling Info** - Export filename + dictionary words
3. **Edit Folders** - Create/open edit-1st, edit-2nd, edit-final
4. **S3 Staging** - Upload/download + cleanup

### What Gets Removed

- ❌ Export tab (entire tab)
- ❌ S3 Staging modal (settings menu)
- ❌ "Prepare for Gling" button (creates duplicate files)
- ❌ Endpoint: `POST /api/export/copy-to-gling`

---

## User's 5 Key Decisions

### 1. Replace "Prepare for Gling" with 2 Buttons
- ✅ **Copy Folder Path** - Clipboard gets recordings folder path
- ✅ **Open in Finder** - Opens recordings folder
- ❌ NO file copying (user drags manually)

### 2. Create Sub-Menu in Manage Area
- Add ONE new tool: "📤 Export/S3"
- Tool opens drawer with 4 sections
- Consistent with existing tool pattern (FR-136/137)

### 3. Keep "View" Feature, But Fix It
- Display S3 bucket path prominently
- Make it copyable
- Optional: Show file preview via DAM CLI

### 4. Don't Remove edit-2nd Folder
- Keep all three folders (edit-1st, edit-2nd, edit-final)
- User needs clearer docs on what each does
- Future needs uncertain

### 5. No Frontend Designer Yet
- Still in requirements phase
- Focus on functionality first

---

## Two Critical Bugs to Fix

### BUG-1: Copy File List (30 min)

**Current:** Clipboard shows "Copies" instead of file paths

**Fix:**
```typescript
// Wrong:
navigator.clipboard.writeText('Copies');

// Correct:
const paths = selectedFiles.map(f => path.join(recordingsPath, f.filename));
navigator.clipboard.writeText(paths.join('\n'));
```

### BUG-2: S3 Status False Positive (2 hours)

**Current:** Shows "✓ Uploaded" when nothing was uploaded

**Fix:**
```typescript
// Wrong (checks local folder):
const uploaded = fs.existsSync(prepStagingPath);

// Correct (checks actual S3):
const damStatus = await runDamCommand(['s3-status', brand, projectCode]);
const uploaded = damStatus.includes('prep/') && !damStatus.includes('0 files');
```

---

## UI Mockup - New Tool Drawer

```
┌──────────────────────────────────────────────────────────┐
│  Export / S3 Staging                             [Close] │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ──────── GLING PREPARATION ────────                     │
│                                                          │
│  Recordings Folder:                                      │
│  ~/dev/video-projects/v-appydave/b93/recordings/         │
│                                                          │
│  [📋 Copy Folder Path]  [📂 Open in Finder]              │
│                                                          │
│  💡 Tip: Drag files from Finder into Gling, then        │
│          export to edit-1st                              │
│                                                          │
│  ──────── GLING INFO ────────                            │
│                                                          │
│  Export Filename: b93-poem-epic-1            [Copy]      │
│                                                          │
│  Dictionary:                                             │
│    Global: 25 words                          [Copy]      │
│    Project: 8 words                   [Edit] [Copy]      │
│    Combined: 33 words                     [Copy All]     │
│                                                          │
│  ──────── EDIT FOLDERS ────────                          │
│                                                          │
│  ✓ edit-1st    ← Gling exports          [Open]          │
│  ○ edit-2nd    ← Jan's edits            [Create]         │
│  ○ edit-final  ← Final publish          [Create]         │
│                                                          │
│                               [Create All Folders]       │
│                                                          │
│  ──────── S3 STAGING ────────                            │
│                                                          │
│  S3 Bucket: v-appydave/b93-poem-epic-1                   │
│  📋 s3://v-appydave/b93-poem-epic-1/         [Copy]      │
│                                                          │
│  PREP (Your First Edit → Jan)                            │
│  ┌────────────────────────────────────────────┐          │
│  │  Local: edit-1st/                          │          │
│  │    2 files (512 MB)                        │          │
│  │                                            │          │
│  │  S3 Status: ○ Not uploaded                │          │
│  │                                            │          │
│  │  [Upload to S3]                            │          │
│  └────────────────────────────────────────────┘          │
│                                                          │
│  POST (Jan's Edits → You)                                │
│  ┌────────────────────────────────────────────┐          │
│  │  S3: 2 new files available                 │          │
│  │    b93-v1.mp4 (498 MB)                     │          │
│  │    b93-v1.srt (31 KB)                      │          │
│  │                                            │          │
│  │  [Download from S3]                        │          │
│  └────────────────────────────────────────────┘          │
│                                                          │
│  CLEANUP                                                 │
│  ┌────────────────────────────────────────────┐          │
│  │  Local: 1.5 GB         [Clean Local]       │          │
│  │  S3: 1.5 GB            [Clean S3]          │          │
│  └────────────────────────────────────────────┘          │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Create New Tool (8 hours)

**Create:**
- `client/src/components/shared/ExportS3Tool.tsx` (~600-800 lines)
- Uses SlideOutDrawer pattern (FR-137)

**Migrate content from:**
- ExportPanel.tsx → Gling Info + Edit Folders sections
- S3StagingPage.tsx → S3 Staging section

**Add NEW:**
- Gling Preparation section (Copy Path + Open Finder buttons)
- Tip text explaining workflow

### Phase 2: Fix Bugs + Add Endpoints (2.5 hours)

**Fix bugs:**
1. Copy File List clipboard logic
2. S3 status detection in `s3-staging.ts`

**Add endpoint:**
- `GET /api/manage/recordings-folder-path` (returns recordings path)

### Phase 3: Remove Old UI (2 hours)

**Delete:**
1. Export tab from `App.tsx` navigation
2. S3 Staging modal from settings menu
3. Files: `ExportPanel.tsx`, `S3StagingPage.tsx`, `export.ts`

**Update:**
- `ManagePanel.tsx` - Add Export/S3 to tools array
- Navigation cleanup

### Phase 4: Testing (2-3 hours)

- Test all 4 sections in new drawer
- Verify bugs fixed
- Test S3 upload/download
- Verify no broken navigation

---

## Files to Create

| File | Lines | Purpose |
|------|-------|---------|
| `client/src/components/shared/ExportS3Tool.tsx` | 600-800 | New tool drawer |

## Files to Modify

| File | Changes |
|------|---------|
| `client/src/components/ManagePanel.tsx` | Add Export/S3 to tools sidebar |
| `client/src/App.tsx` | Remove Export tab + S3 modal |
| `server/src/routes/s3-staging.ts` | Fix S3 status bug |
| `server/src/routes/manage.ts` | Add folder path endpoint |
| `server/src/index.ts` | Wire up endpoints |

## Files to Delete

| File | Reason |
|------|--------|
| `client/src/components/ExportPanel.tsx` | Migrated to ExportS3Tool |
| `client/src/components/S3StagingPage.tsx` | Migrated to ExportS3Tool |
| `server/src/routes/export.ts` | Endpoint no longer needed |

---

## Key Technical Notes

### Copy Folder Path Implementation

```typescript
// Server: GET /api/manage/recordings-folder-path
const config = getConfig();
const recordingsPath = path.join(expandPath(config.projectDirectory), 'recordings');
return { success: true, path: recordingsPath };

// Client:
const handleCopyFolderPath = async () => {
  const { path } = await fetch('/api/manage/recordings-folder-path').then(r => r.json());
  navigator.clipboard.writeText(path);
  toast.success('Recordings folder path copied');
};
```

### Open Finder Implementation

```typescript
// Reuse existing endpoint:
POST /api/system/open-in-finder
{ folder: 'recordings' }
```

### S3 Status Fix

```typescript
// Query actual S3 bucket via DAM CLI:
const { stdout } = await execAsync(`dam s3-status ${brand} ${projectCode}`);
const uploaded = stdout.includes('prep/') && !stdout.includes('0 files');
```

---

## Testing Checklist

### Gling Preparation
- [ ] Copy Folder Path → clipboard has path
- [ ] Open in Finder → recordings folder opens
- [ ] Tip text displays

### Gling Info
- [ ] Filename + Copy button works
- [ ] Dictionary sections display with counts
- [ ] All Copy buttons work

### Edit Folders
- [ ] Status indicators correct (✓/○)
- [ ] Create/Open buttons work
- [ ] Create All creates all three folders

### S3 Staging
- [ ] Bucket path displays + Copy works
- [ ] PREP status correct (not false positive)
- [ ] Upload/Download buttons work
- [ ] Clean buttons work with confirmation

### Bug Fixes
- [ ] Copy File List copies actual paths
- [ ] S3 status accurate

### Cleanup
- [ ] Export tab gone
- [ ] S3 modal gone
- [ ] No console errors
- [ ] Other tools still work

---

## Complete Spec Location

**Full PRD:** `/Users/davidcruwys/dev/ad/flivideo/flihub/docs/prd/fr-141-export-s3-workflow-overhaul.md`

Contains:
- Detailed UI mockups
- All 7 pain points explained
- Complete acceptance criteria
- Technical implementation details
- Migration strategy
- Code examples

---

## Questions? None!

All user decisions made. Spec is complete. Ready to implement.

**User approval:** "Let's do option B. What we need to do is write up a ticket, and then I'll take it over to the developer."

---

**Next step:** Hand to `/dev` for implementation
