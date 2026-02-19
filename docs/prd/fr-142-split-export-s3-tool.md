# FR-142: Split Export/S3 Tool — Separate Gling Prep from S3 Staging

**Status:** Pending
**Priority:** MEDIUM - UX improvement (separation of concerns)
**Added:** 2026-02-19
**Type:** UX Refactor
**Depends on:** FR-141 (Export & S3 Workflow Overhaul - Complete)

---

## Problem

FR-141 consolidated Export + S3 into a single "Export / S3 Staging" drawer. While this was an improvement over the previous fragmented UI (Export tab + S3 modal), the resulting drawer mixes two distinct workflows:

1. **Gling / Edit Prep** — Local editing workflow (prepare recordings, configure Gling, manage edit folders)
2. **S3 Staging** — Remote collaboration workflow (sync, upload, download, promote, cleanup with Jan)

These are separate stages in the pipeline. A user doing Gling prep doesn't need to see S3 controls, and a user managing S3 transfers doesn't need dictionary editing.

---

## Proposal

Split the current `ExportS3Tool` drawer into **two separate tools** in the Manage sidebar:

### Tool 1: Gling / Edit Prep

Everything about preparing recordings for local editing.

**Sections:**
- **Gling Preparation** — Recordings folder path, Copy Folder Path, Open in Finder
- **Gling Info** — Export filename, global/project/combined dictionaries
- **Edit Folders** — Create/open `edit-1st`, `edit-2nd`, `edit-final`

### Tool 2: S3 Staging

Everything about file transfer and collaboration with Jan.

**Sections:**
- **PREP** (Your First Edit to Jan) — Source files, sync, upload
- **POST** (Jan's Edits to You) — Download, file list, SRT status
- **Publish** — Version promotion
- **Cleanup** — Local and S3 cleanup

---

## Sidebar Changes

**Current:**
```
SIMPLE TOOLS
  Regen Shadows
  Regen Transcripts
  Regen Chapters
  Regen All

COMPLEX TOOLS
  Rename
  Export / S3      ← single combined tool
  Renumber
```

**Proposed:**
```
SIMPLE TOOLS
  Regen Shadows
  Regen Transcripts
  Regen Chapters
  Regen All

COMPLEX TOOLS
  Rename
  Gling / Edit     ← local editing workflow
  S3 Staging       ← collaboration workflow
  Renumber
```

---

## Implementation

### Client Changes

**Split `ExportS3Tool.tsx` into two components:**

| New File | Source Sections | Lines (est.) |
|----------|----------------|--------------|
| `client/src/components/shared/GlingEditTool.tsx` | Gling Preparation + Gling Info + Edit Folders | ~300 |
| `client/src/components/shared/S3StagingTool.tsx` | PREP + POST + Publish + Cleanup + modals | ~500 |

**Modify:**

| File | Change |
|------|--------|
| `client/src/components/shared/ToolsSidebar.tsx` | Replace `export-s3` entry with `gling-edit` + `s3-staging` |
| `client/src/components/ManagePanel.tsx` | Register two drawers instead of one |
| `client/src/components/shared/index.ts` | Export new components, remove old |

**Delete after migration:**

| File | Reason |
|------|--------|
| `client/src/components/shared/ExportS3Tool.tsx` | Split into two files above |

### Server Changes

None. All existing API routes (`/api/edit/*`, `/api/s3-staging/*`, `/api/manage/*`, `/api/system/*`) remain unchanged.

---

## Acceptance Criteria

- [ ] "Gling / Edit" tool appears in Manage sidebar and opens a drawer with Gling Prep, Gling Info, and Edit Folders sections
- [ ] "S3 Staging" tool appears in Manage sidebar and opens a drawer with PREP, POST, Publish, and Cleanup sections
- [ ] All existing functionality preserved (no regressions from FR-141)
- [ ] Old combined "Export / S3" tool removed from sidebar
- [ ] No server-side changes required

---

## Out of Scope

- Server route refactoring (already split across `edit.ts`, `s3-staging.ts`, `manage.ts`)
- New features or bug fixes (this is a pure UI separation)
- Renaming API endpoints

---

## Completion Notes

**What was done:**

- Created `client/src/components/shared/GlingEditTool.tsx` — Gling Preparation + Gling Info + Edit Folders sections
- Created `client/src/components/shared/S3StagingTool.tsx` — S3 PREP + POST + Publish + Cleanup + modals
- Updated `client/src/components/shared/ToolsSidebar.tsx` — replaced single `export-s3` button with `gling-edit` + `s3-staging` buttons; updated `onComplexToolClick` type
- Updated `client/src/components/ManagePanel.tsx` — updated `activeTool` type, replaced single `ExportS3Tool` drawer with two drawers (`GlingEditTool` + `S3StagingTool`); updated `handleComplexToolClick` type
- Updated `client/src/components/shared/index.ts` — exports new components, removed old
- Deleted `client/src/components/shared/ExportS3Tool.tsx`

**Files changed:**

- `client/src/components/shared/GlingEditTool.tsx` (new)
- `client/src/components/shared/S3StagingTool.tsx` (new)
- `client/src/components/shared/ToolsSidebar.tsx` (modified)
- `client/src/components/ManagePanel.tsx` (modified)
- `client/src/components/shared/index.ts` (modified)
- `client/src/components/shared/ExportS3Tool.tsx` (deleted)

**Testing notes:**

- Build passes clean (`tsc -b && vite build` — 184 modules, no errors)
- Open Manage panel → verify sidebar shows "Gling / Edit" and "S3 Staging" instead of "Export / S3"
- Click "Gling / Edit" → drawer opens with Gling Preparation, Gling Info, Edit Folders
- Click "S3 Staging" → drawer opens with PREP, POST, Publish, Cleanup sections

**Status:** Complete

---

## Testing Checklist

### Gling / Edit Tool
- [ ] Copy Folder Path copies recordings path to clipboard
- [ ] Open in Finder opens recordings folder
- [ ] Export filename displays and copies correctly
- [ ] Global/Project/Combined dictionaries display, edit, and copy
- [ ] Edit folder status indicators correct
- [ ] Create/Open folder buttons work
- [ ] Create All Folders works

### S3 Staging Tool
- [ ] PREP section shows source files and sync status
- [ ] Sync from Source button works
- [ ] Upload to S3 button works
- [ ] POST section shows download status and file list
- [ ] Download from S3 button works
- [ ] SRT presence indicators display correctly
- [ ] Publish version promotion works
- [ ] Clean Local with confirmation works
- [ ] Clean S3 with confirmation works
- [ ] Legacy migration banner appears when needed
