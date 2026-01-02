# FR-122: Export Panel

**Status:** ✓ Complete
**Added:** 2026-01-02
**Implemented:** 2026-01-02
**Dependencies:** FR-120

---

## User Story

As a video creator, I want an Export panel to easily prepare files for Gling AI without manually finding folders or accidentally including parked recordings.

---

## Problem

Current workflow for using Gling AI:

1. Have to manually navigate to project folder in Finder
2. If selecting "all recordings", parked recordings get included
3. No central place to see what's being exported
4. First Edit Prep folder exists but no easy way to populate it

---

## Solution

New "Export" tab with export management:

### UI Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ Export                                                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Files for Export (excludes parked)           12 files | 2.4 GB    │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  ── Chapter 01: intro ──                                            │
│  ☑ 01-1-intro.mov                             245 MB               │
│  ☑ 01-2-intro.mov                             312 MB               │
│                                                                     │
│  ── Chapter 02: demo ──                                             │
│  ☑ 02-1-demo.mov                              456 MB               │
│  ☐ 02-2-demo-alt.mov                          389 MB   [PARKED]    │
│                                                                     │
│  ── Chapter 03: outro ──                                            │
│  ☑ 03-1-outro.mov                             178 MB               │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  [📋 Copy File List]    [📁 Prepare for Gling]    [📂 Open Folder] │
│                                                                     │
│  First Edit Prep: ~/Projects/b87/first-edit-prep/                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Features

1. **File List**
   - Shows all recordings grouped by chapter
   - Parked recordings shown but unchecked by default (with PARKED badge)
   - Checkboxes for selective export
   - File size per file and total

2. **Copy File List**
   - Copies absolute paths to clipboard
   - Only includes checked files
   - Format: One path per line

3. **Prepare for Gling**
   - Copies checked files to First Edit Prep folder
   - Shows progress indicator
   - First Edit Prep folder is where Gling reads input and writes output

4. **Open Folder**
   - Opens First Edit Prep folder in Finder
   - Uses existing "Open in Finder" pattern

---

## Acceptance Criteria

- [x] New "Export" tab in navigation
- [x] Shows list of recordings grouped by chapter
- [x] Parked recordings shown but unchecked by default (with Show Parked toggle)
- [x] "Copy file list" copies paths to clipboard (checked files only)
- [x] "Prepare for Gling" copies checked files to edit-1st folder
- [x] Shows edit-1st folder path with "Open in Finder" button
- [x] File count and total size displayed
- [x] Progress indicator during file copy
- [x] Chapter-level Select/Deselect All buttons (bonus)
- [x] Color-coded rows matching RecordingsView style (bonus)

---

## Technical Notes

### Navigation

Add new tab alongside existing tabs (Incoming, Recordings, Watch, etc.):

```typescript
const TABS = ['incoming', 'recordings', 'watch', 'export', ...] as const
```

### File List Data

Reuse existing recordings query, filter by parked state:

```typescript
const exportableFiles = recordings.filter(r => !parkedRecordings.includes(r.filename))
```

### Prepare for Gling Action

1. Get list of checked files
2. Create First Edit Prep folder if doesn't exist
3. Copy files (or create symlinks for faster operation)
4. Show completion toast

### First Edit Prep Folder

Already exists from edit workflow (FR-113). Path: `{projectDir}/first-edit-prep/`

### Files to Modify/Create

| File | Changes |
|------|---------|
| `client/src/App.tsx` | Add Export tab to navigation |
| `client/src/components/ExportPanel.tsx` | New component |
| `server/src/routes/export.ts` | New route for copy operations |

---

## Future Considerations

- Symlinks instead of copies (faster, less disk space)
- Export presets (e.g., "YouTube", "SKOOL", "Archive")
- Integration with DAM upload

---

## Dependencies

- **FR-120:** Parked Recording State (to know what to exclude)

---

## Completion Notes

**Implemented:** 2026-01-02

### Files Created
- `client/src/components/ExportPanel.tsx` - Main export panel component
- `server/src/routes/export.ts` - Backend API for file copy operations

### Files Modified
- `client/src/App.tsx` - Added Export tab to navigation
- `client/src/hooks/useApi.ts` - Exported fetchApi helper function
- `server/src/index.ts` - Registered export routes
- `server/src/routes/system.ts` - Added 'edit-1st' to supported folders

### Features Implemented

1. **Show Parked Toggle** (default: OFF/hidden)
   - Checkbox in header to show/hide parked recordings
   - Pink checkbox accent matching parked color scheme

2. **File Selection System**
   - All non-parked files selected by default
   - Individual file checkboxes
   - Chapter-level Select/Deselect All buttons
   - Visual feedback (blue=selected, gray=unselected, pink=parked)

3. **Stats Header**
   - Shows "X of Y selected (size)"
   - Displays active vs parked file counts

4. **Chapter Grouping**
   - Horizontal line separators (matching RecordingsView)
   - Chapter number and title with file count and size

5. **Action Buttons**
   - Copy File List - Copies absolute paths to clipboard
   - Prepare for Gling - Copies selected files to edit-1st/ folder
   - Open Folder - Opens edit-1st/ in Finder

### API Endpoint
- `POST /api/export/copy-to-gling` - Copies selected files to edit-1st folder
  - Creates edit-1st folder if it doesn't exist
  - Individual file error handling

### Known Issue
- "Open Folder" errors if edit-1st doesn't exist (addressed in FR-124)
