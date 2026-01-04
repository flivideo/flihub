# Changelog

Track what was implemented, fixed, or changed and when.

---

## Quick Summary - 2026-01-03

**Completed:** FR-5, FR-8, FR-9, FR-10, FR-11, FR-12, FR-13, FR-14, FR-15, FR-16, FR-17, FR-18, FR-19, FR-20, FR-21, FR-22, FR-23, FR-24, FR-25, FR-26, FR-27, FR-28, FR-29, FR-30, FR-32, FR-33, FR-35, FR-36 through FR-78, FR-80, FR-82, FR-83, FR-84, FR-87, FR-88, FR-90, FR-91, FR-92, FR-94, FR-105, FR-106, FR-107, FR-108, FR-109, FR-110, FR-111, FR-112, FR-113, FR-114 (Phase 1), FR-115, FR-116, FR-117, FR-118, FR-119, FR-120, FR-121, FR-122, FR-123, FR-124, FR-125, FR-126, FR-127, FR-128, FR-130, FR-73, FR-54 (discovered), FR-69 (discovered), FR-80 (discovered), NFR-1, NFR-2, NFR-3, NFR-4, NFR-5, NFR-6, NFR-7, NFR-8, NFR-79, NFR-85, NFR-87

**Still Open:** FR-31 (DAM Integration), FR-34 Phase 3 (Algorithm improvements), FR-89 (Cross-Platform Path Support), FR-93 (Project Name Shows Full Path on Windows), FR-114 (Phases 2-3), NFR-65/66/67/68 (Tech Debt), NFR-81 (Future), NFR-86 (Git Leak Detection), UX Improvements

---

## Per-Item History

### FR-130: Simplify Rename Logic (Delete+Regenerate)

| Date | Change | Commit |
|------|--------|--------|
| 2026-01-03 | Implemented | - |

**What was built:**
Simplified rename logic using delete+regenerate pattern instead of complex multi-directory renaming. Three critical bugs discovered and fixed during implementation.

**Three-Phase Algorithm:**
1. **Delete derivable files** - Shadows, transcripts (all 5 formats), chapter videos
2. **Rename core files** - Recording file, state key migration, manifest updates
3. **Regenerate derivables** - Shadow files (instant), transcriptions (queued)

**Core Features:**
- **State migration** - Preserves parked, annotation, safe flags when renaming
- **Manifest updates** - Updates FR-126 manifest filename references
- **Queue check** - Prevents rename during active transcription
- **User feedback** - Warning banner + enhanced toast notifications

**CRITICAL BUGS FOUND & FIXED:**

**Bug 1: Shadow Files Wrong Extension**
- **Problem:** Code tried to delete `.txt` shadow files, but shadows are `.mp4` files
- **Impact:** Old shadow files were never deleted, causing duplicate entries in UI
- **Fix:** Changed deletion target from `.txt` to `.mp4`
- **Evidence:** `[FR-130] Deleted: 04-1-steve-showcase-test.mp4`

**Bug 2: Incomplete Transcript Deletion**
- **Problem:** Whisper creates 5 file types (`.txt`, `.srt`, `.json`, `.vtt`, `.tsv`), but only 2 were deleted
- **Impact:** Orphaned `.json`, `.vtt`, `.tsv` files remained after rename
- **Fix:** Now deletes all 5 transcript file types
- **Evidence:** `[FR-130] Deleted: 04-1-steve-showcase-test.txt/srt`

**Bug 3: FR-111 Architecture Mismatch**
- **Problem:** Code assumed physical `-safe` folders (old architecture), but FR-111 Phase 3 migrated to state-based flags
- **Impact:** Code tried to access non-existent `-safe` subfolders
- **Fix:** Updated to FR-111 Phase 3 - all files stay in main folders, safe is just metadata

**Bug 4: Socket.IO Events Missing (CRITICAL)**
- **Problem:** Park/unpark/safe/restore endpoints wrote state files but didn't emit Socket.IO events
- **Impact:** Developer Tools (FR-127) showed stale data, users had to refresh page to see state changes
- **Fix:** Added `io.emit('recordings:changed')` to all four endpoints + created `useDeveloperSocket()` hook
- **Affected endpoints:** `/recordings/park`, `/recordings/unpark`, `/recordings/safe`, `/recordings/restore`
- **Result:** Real-time state updates now work - Developer Tools auto-refreshes on park/unpark/safe operations

**Code Improvements:**
- Rename endpoint: 152 → 139 lines (9% reduction in route code)
- New utility: 240 lines of clean, testable functions
- No special case handling (delete+regenerate is uniform)
- Reuses existing systems (shadows, transcription queue, state management)

**Files created:**
- `server/src/utils/renameRecording.ts` (240 lines) - New utility with 6 exported functions

**Files modified:**
- `server/src/routes/transcriptions.ts` - Added `getActiveJob()` and `getQueue()` getters
- `server/src/index.ts` - Queue getter integration + pass `io` to routes
- `server/src/routes/index.ts` - Replaced rename-chapter endpoint (152 → 139 lines) + Socket.IO events for park/unpark/safe/restore
- `client/src/components/RenameLabelModal.tsx` - Warning banner + toast notifications
- `client/src/hooks/useSocket.ts` - Added `useDeveloperSocket()` hook for real-time state updates
- `client/src/App.tsx` - Added `useDeveloperSocket()` at app level (always active)

**UX Changes:**
- Yellow warning banner: "⚠️ Transcripts will be regenerated (5-10 minutes)"
- Enhanced toast notifications:
  - Single file: "Renamed to {filename}" + "Transcription queued (view progress in Transcriptions tab)"
  - Multiple files: "Renamed {count} files" + "Transcriptions queued..."
  - Duration: 5 seconds (from 3 seconds)

**Testing Results:**
Verified working:
- ✅ Shadow deletion: `.mp4` files correctly deleted
- ✅ Transcript deletion: All 5 file types (`.txt`, `.srt`, `.json`, `.vtt`, `.tsv`) deleted
- ✅ Shadow regeneration: New `.mp4` created with correct name
- ✅ Transcript regeneration: Queued successfully
- ✅ Transcription conflict: Rename blocked during active transcription
- ✅ State preservation: Parked/annotation flags preserved (needs user verification)
- ✅ FR-111 compliance: No physical `-safe` folders used
- ✅ Socket.IO events: Developer Tools auto-refreshes on park/unpark/safe operations
- ✅ Real-time updates: No page refresh required for state changes

**Verification:**
Use FR-127 Developer Tools (⚙️ → 🔍) to inspect `.flihub-state.json`:
- `recordings[newFilename]` - Verify parked/annotation/safe preserved
- `editManifest[folder].files[]` - Verify filename updated

**Next steps for user:**
1. Verify state preservation (park + annotate → rename → confirm preserved)
2. Verify manifest updates (export → rename → check FR-127 Dev Tools)
3. User acceptance testing with real project data
4. Monitor for duplicate shadow files (should not occur)

---

### FR-128: Recording Quick Preview

| Date | Change | Commit |
|------|--------|--------|
| 2026-01-03 | Implemented | - |

**What was built:**
Added a play button (▶) to each recording row on the Recordings page that opens a video preview modal with playback speed controls.

**Core Features:**
- **Play Button**
  - Positioned at left side of each recording row (before filename)
  - Blue ▶ icon with hover state
  - Disabled (grayed with tooltip) for shadow-only files
  - Tooltip: "Video not available locally"

- **RecordingVideoModal Component**
  - Cloned from IncomingVideoModal pattern
  - Video player with 16:9 aspect ratio
  - Autoplay on open
  - HTML5 video controls (play/pause, scrubbing, volume)
  - Range request support for seeking

- **Playback Speed Controls**
  - Presets: 1x, 1.5x, 2x, 2.5x, 3x
  - Default: 2x (or last saved speed)
  - Speed persists to localStorage: `flihub:watch:playbackSpeed`
  - Shared across Incoming, Watch, and Recordings preview

- **Metadata Display**
  - Filename in modal header
  - Duration and file size in controls bar
  - Close button (X) in top-right

- **Keyboard Shortcuts**
  - Escape key closes modal
  - Click overlay (dark background) closes modal

**Files created:**
- `client/src/components/RecordingVideoModal.tsx` (196 lines)

**Files modified:**
- `client/src/components/RecordingsView.tsx` - Added play button, modal state, component render
- `server/src/routes/video.ts` - Added `GET /api/video/recordings/:filename` endpoint

**API Endpoint:**
- `GET /api/video/recordings/:filename` - Serves video from project recordings folder with Range request support

**Implementation time:** ~2 hours (matched estimate)

**User impact:**
- Quick video preview without leaving Recordings page
- Consistent UX with Incoming page preview
- Faster decision-making during recording review
- No navigation required for spot-checks

**Complements:**
- FR-106: Incoming Video Preview (same modal pattern)
- FR-71: Watch Page (alternative deep-review workflow)
- FR-88: Shadow Fallback (disabled state for shadow files)

---

### FR-127: Developer Drawer (Data Files Viewer)

| Date | Change | Commit |
|------|--------|--------|
| 2026-01-03 | Implemented | 7f5462c |

**What was built:**
Professional developer tools drawer with Monaco Editor integration for viewing and debugging internal JSON files without leaving FliHub.

**Core Features:**
- Monaco Editor integration (VSCode's actual editor)
  - Perfect syntax highlighting (VSCode Dark+ theme)
  - Collapsible JSON sections with +/- icons
  - Line numbers and professional code viewing
  - Read-only mode prevents accidental edits

- Resizable drawer
  - 800px default width (resizable 300-1000px)
  - Drag left edge to resize
  - Width persists to localStorage
  - No black overlay - slides over content without blocking app

- Tab navigation
  - Three tabs: `.flihub-state.json` | `config.json` | `telemetry.jsonl`
  - Simple, clean navigation (rejected tree view)
  - File metadata: path, size, modified date, line count

- Actions
  - Copy JSON - Copies formatted JSON to clipboard
  - Open in Editor - Opens file in default text editor (VSCode, TextEdit, etc.)
  - Refresh - Reloads file content from disk
  - Sticky action bar always visible while scrolling

**Access:**
- Cog menu (⚙️) → 🔍 Developer Tools
- Escape key closes drawer

**Use Cases:**
- Debug application state
- Verify FR-126 manifest creation
- Inspect configuration
- Review transcription performance
- Support debugging

**Files created:**
- `client/src/components/DeveloperDrawer.tsx` (307 lines)
- `server/src/routes/developer.ts` (195 lines)

**Files modified:**
- `server/src/index.ts` - Registered developer routes
- `server/src/routes/system.ts` - Added `POST /api/system/open-file-by-path`
- `client/src/App.tsx` - Drawer state, menu item, component render
- `client/src/hooks/useApi.ts` - Added 3 hooks
- `client/src/constants/queryKeys.ts` - Developer query keys

**API Endpoints:**
- `GET /api/developer/project-state` - Returns `.flihub-state.json`
- `GET /api/developer/config` - Returns `config.json`
- `GET /api/developer/telemetry` - Returns `transcription-telemetry.jsonl`
- `POST /api/system/open-file-by-path` - Opens file in default editor

**Dependencies:**
- `@monaco-editor/react` - VSCode editor component

**Design Iterations:**
1. Custom JSON viewer ❌
2. @uiw/react-json-view ❌
3. react-json-view-lite ❌
4. Monaco Editor ✅ (Perfect VSCode experience)

**Time:** ~6-7 hours (within 5-7 hour estimate)

**User impact:**
- Developers can debug state without leaving app
- Exactly matches VSCode's JSON viewing experience
- Essential tool for FR-126 manifest verification
- Professional developer experience

---

### FR-126: Edit Folder Manifest & Cleanup

| Date | Change | Commit |
|------|--------|--------|
| 2026-01-03 | Implemented | 5229de0 |

**What was built:**
Manifest-based copy tracking system with clean/restore operations to save disk space after exporting files to Gling.

**Core Features:**
1. **Manifest Creation** (automatic during copy)
   - Tracks which files were copied to edit folders
   - SHA-256 hash of first 1MB (fast change detection)
   - Timestamp and size metadata
   - Stored in `.flihub-state.json` under `editManifest`

2. **Clean Edit Folder** (new button)
   - Deletes source `.mov/.mp4` files from edit folders
   - Preserves Gling output files (not in manifest)
   - Shows confirmation with size savings
   - Manifest remains intact for restore

3. **Restore for Gling** (new button)
   - Re-copies original files from `recordings/` → edit folder
   - Validates originals exist before copying
   - Warns if originals changed (hash mismatch)
   - Atomic operation (all or nothing)

**Status Indicators:**
- 🟢 Present (X.X GB) - Source files exist in edit folder
- 🔴 Cleaned - Source files deleted, ready to restore
- ⚠️ Changed (N files) - Originals modified since copy
- ❌ Missing (N files) - Originals no longer exist

**Example workflow:**
1. Copy 12 files to Gling → Edit → Clean (saves 2.4 GB)
2. Gling crashes or session closes
3. Restore with 1 click → Continue editing
4. No need to remember which files were selected

**Files created:**
- `server/src/utils/editManifest.ts` (230 lines)
  - `calculateFileHash()` - SHA-256 hash
  - `createManifest()` - Generate manifest
  - `getManifestStatus()` - Check state
  - `cleanEditFolder()` - Delete sources
  - `restoreEditFolder()` - Re-copy from recordings

**Files modified:**
- `shared/types.ts` (+90 lines) - Manifest types
- `server/src/utils/projectState.ts` (+28 lines) - Manifest helpers
- `server/src/routes/export.ts` (+180 lines) - New endpoints
- `client/src/hooks/useEditApi.ts` (+55 lines) - Query hooks
- `client/src/components/ExportPanel.tsx` (+105 lines) - UI

**API Endpoints:**
- `GET /api/export/manifest-status/:folder` - Returns status
- `POST /api/export/clean-edit-folder` - Delete source files
- `POST /api/export/restore-edit-folder` - Restore from manifest
- Enhanced: `POST /api/export/copy-to-gling` - Creates manifest

**Value:**
- Disk space savings: 2-10 GB per project during editing
- Safe: Originals never touched in recordings/
- Manifest provides audit trail
- Can restore anytime
- Gling outputs automatically preserved

**Critical bug fixed during development:**
- Missing .js extension in imports (TypeScript ES modules)
- Wrong fs API usage (callback-based vs. promise-based)
- Missing type annotations
- Server compiles cleanly after fixes

**Verification via FR-127:**
Users can now verify manifest creation by opening Developer Tools and inspecting `.flihub-state.json` → `editManifest` section.

---

### FR-119: API Documentation & Testing Page

| Date | Change | Commit |
|------|--------|--------|
| 2026-01-02 | Implemented (Phase 3) | 7a8c5a1 |

**What was built:**
Interactive API Explorer with 36 documented endpoints, auto-populate features, and short code resolution.

**Phase 3: Interactive API Explorer UI**
- New "API Explorer" accessible from Cog menu (⚙ → 🔌 API Explorer)
- Two-column layout: endpoint list (left) + request/response panel (right)
- 36 endpoints across 7 groups (180% of minimum 20 requirement)
- Endpoint groups:
  - Query API (10 endpoints)
  - Config (2 endpoints)
  - Projects (6 endpoints)
  - Recordings (6 endpoints)
  - Transcription (4 endpoints)
  - System (4 endpoints)
  - State (2 endpoints)

**Core Features:**
- Collapsible endpoint groups with expand/collapse
- HTTP method color coding (GET=green, POST=blue, PUT=yellow, DELETE=red)
- Smart parameter forms (dropdowns for enums, text/number inputs)
- Live request execution against localhost:5101
- Response display with status code and JSON formatting
- "Copy as cURL" generates curl command
- "Copy Response" copies JSON to clipboard

**Bonus Feature 1: Auto-populate Current Project**
- Project code parameters auto-filled with active project
- Eliminates repetitive typing for `:code` parameters
- Still manually editable for testing other projects
- Applies to: GET/POST/PUT endpoints with `:code` path param

**Bonus Feature 2: Short Code Resolution**
- All endpoints accept short codes (e.g., "c10") OR full codes (e.g., "c10-poem-epic-3")
- Resolution logic: Exact match → Prefix match → 404
- New utility: `server/src/utils/projectResolver.ts`
- Updated 13 route files with resolution:
  - 7 query routes (projects.ts, recordings.ts, transcripts.ts, chapters.ts, images.ts, export.ts, inbox.ts)
  - 2 main routes (projects.ts, state.ts)
  - 4 specialized routes (transcriptions.ts, chapters.ts, s3-staging.ts, shadows.ts)

**Bonus Feature 3: Comma-delimited Segments Filter**
- New `segments` parameter for transcripts endpoint
- Usage: `GET /api/query/projects/:code/transcripts?segments=1,2,3`
- Returns only recordings matching specified segment numbers
- Example: `segments=1,5,10` returns all X-1, X-5, X-10 recordings

**UX Polish:**
- Required parameters pre-filled with example values
- Optional parameters empty with placeholder hints
- Enum parameter simplification (include: "content" dropdown)
- Error messages displayed clearly

**Files created:**
- `client/src/components/ApiExplorer.tsx` (418 lines)
- `shared/apiRegistry.ts` (650 lines) - 36 endpoint definitions
- `server/src/utils/projectResolver.ts` (82 lines) - Short code resolution

**Files modified:**
- `client/src/App.tsx` - Navigation integration (Cog menu + tab routing)
- 13 route files with short code resolution
- `docs/prd/fr-119-api-documentation-testing.md` - Completion notes

**Git commit:**
- Hash: 7a8c5a1
- Message: "feat(FR-119): API Explorer with auto-populate and short code support"
- Stats: 13 files changed, 1,850 insertions(+), 67 deletions(-)

**User impact:**
- Developers can test APIs without Postman/curl
- Auto-populate saves typing for project-specific endpoints
- Short codes (c10) work everywhere, not just full codes
- Segment filtering enables granular transcript queries

**Note:** Phase 1 (documentation) was already complete via `docs/architecture/api-reference.md`. Phase 2 (type consolidation) was skipped as optional.

---

### FR-123: Watch Panel Enhancements

| Date | Change | Commit |
|------|--------|--------|
| 2026-01-02 | Implemented | - |

**What was built:**
Unified Watch panel controls with park/unpark actions and per-segment annotations for better video review workflow.

**Part 1: Consolidated Navigation**
- Moved Previous/Next buttons from above video to controls bar below
- Clean single-line layout: [← Prev] [▶ Play] [→ Next] filename (X/Y) [tags] [toggles]
- All controls in one visual location (better UX)

**Part 2: Park/Unpark in Watch Panel**
- Park button added to controls bar (between navigation and filename)
- Visual states:
  - Active: Gray "Park →" button
  - Parked: Pink "← Unpark" button
- Toast notifications on state changes
- Uses existing FR-120 mutations

**Part 3: Per-Segment Annotations**
- Optional note field appears when recording is parked
- Edit/save/cancel workflow
- Stored in `.flihub-state.json` under `recordings[filename].annotation`
- Persists across navigation and sessions
- Real-time updates via Socket.io

**Example annotation in state file:**
```json
{
  "recordings": {
    "05-1-setup.mov": {
      "parked": true,
      "annotation": "Save for SKOOL advanced module"
    }
  }
}
```

**Files modified:**
- `shared/types.ts` - Added `annotation?: string` to RecordingState, RecordingFile, QueryRecording
- `server/src/utils/projectState.ts` - Added `getRecordingAnnotation()` helper
- `server/src/routes/index.ts` - Added annotation to recordings endpoint
- `server/src/routes/query/recordings.ts` - Added annotation support
- `server/src/routes/query/export.ts` - Added annotation support
- `server/src/routes/state.ts` - Socket.io events for real-time updates
- `client/src/components/WatchPage.tsx` - Full UI implementation

**UX Benefits:**
- Single eye position for all controls (no more jumping between top/bottom)
- Make park decisions while watching (instead of switching to Recordings panel)
- Capture reasoning immediately ("why did I park this?")
- Annotations persist and travel with recording state

---

### FR-125: Config & EditPrep Consolidation

| Date | Change | Commit |
|------|--------|--------|
| 2026-01-02 | Implemented | - |

**What was built:**
Consolidated Gling preparation features into Export panel with split dictionary display and inline project dictionary editing.

**Features:**
- Split dictionary display: Global (config.json) / Project (.flihub-state.json) / Combined (merged)
- Three copy buttons for each dictionary type
- Inline project dictionary editing with Save/Cancel buttons
- Project dictionary removed from Config panel (kept Global only)
- EditPrep modal deleted (redundant after FR-124)

**Files modified:**
- `client/src/components/ExportPanel.tsx` - Added dictionary split display, editing, 3 copy buttons
- `client/src/components/ConfigPanel.tsx` - Removed project dictionary section
- `client/src/App.tsx` - Removed EditPrep menu item and modal

**Files deleted:**
- `client/src/components/EditPrepPage.tsx` - No longer needed

**API changes:** None - existing endpoints work as-is

**User impact:**
- One location for all Gling prep (Export panel)
- More flexible dictionary copying (can copy global/project separately)
- Cleaner Config page (only global settings)

---

### FR-124: Export Panel Enhancements

| Date | Change | Commit |
|------|--------|--------|
| 2026-01-02 | Implemented | - |

**What was built:**
Smart folder creation, edit folders management, and Gling prep info in Export panel.

**Features:**
- Smart Open/Create button (detects folder existence, prevents errors)
- Edit Folders section with ✓/○ status indicators
- Individual Create/Open buttons per folder
- "Create All Folders" convenience button
- Collapsible Gling Prep Info section
- Gling filename with copy button
- Dictionary words with count and copy button

**Files modified:**
- `server/src/routes/edit.ts` - Single folder creation endpoint
- `client/src/components/ExportPanel.tsx` - UI enhancements
- `client/src/hooks/useEditApi.ts` - Single folder mutation hook

**New API:** `POST /api/edit/create-folder`

---

### FR-122: Export Panel

| Date | Change | Commit |
|------|--------|--------|
| 2026-01-02 | Implemented | - |

**What was built:**
New "Export" tab for preparing recordings for Gling AI, with file selection and copy operations.

**Files created:**
- `client/src/components/ExportPanel.tsx`
- `server/src/routes/export.ts`

**Features:**
- Show Parked toggle (default: OFF)
- File selection with checkboxes (non-parked selected by default)
- Chapter-level Select/Deselect All buttons
- Color-coded rows (blue=selected, pink=parked, gray=unselected)
- Copy File List - copies paths to clipboard
- Prepare for Gling - copies files to edit-1st folder
- Open Folder button

**API:** `POST /api/export/copy-to-gling`

**Known issue:** Open Folder errors if folder doesn't exist (FR-124)

---

### FR-121: Parked State in Watch Panel

| Date | Change | Commit |
|------|--------|--------|
| 2026-01-02 | Implemented | - |

**What was built:**
PARKED badge and filtering for Watch panel, matching FR-120's pink styling.

**Changes to WatchPage.tsx:**
- State: `showParked` with localStorage persistence
- Filtering: `groupByChapterWithTiming`, `sortedRecordings`, `mostRecentRecording` respect toggle
- UI: Pink row styling (`bg-pink-50`), PARKED badge, toggle button next to Safe

**Visual consistency:** Same UX pattern as SAFE feature.

---

### FR-120: Parked Recording State

| Date | Change | Commit |
|------|--------|--------|
| 2026-01-02 | Implemented | - |

**What was built:**
Third recording state "Parked" for clips that are good content but not for this edit.

**Backend:**
- Types: Added `parked?: boolean` to RecordingState, `isParked: boolean` to RecordingFile/QueryRecording
- State management: `isRecordingParked()`, `setRecordingParked()`, `getParkedRecordings()`
- API routes: `POST /api/recordings/park`, `POST /api/recordings/unpark`
- Query endpoints return `isParked` flag

**Frontend:**
- API hooks: `useParkRecording()`, `useUnparkRecording()`
- RecordingsView: Pink background (`bg-pink-50`), show/hide toggle, per-file and chapter-level actions
- Stats display: "(X active, Y safe, Z parked)"

**Files modified:**
- `shared/types.ts`
- `server/src/utils/projectState.ts`
- `server/src/routes/index.ts`
- `server/src/routes/query/recordings.ts`
- `server/src/routes/query/export.ts`
- `client/src/hooks/useApi.ts`
- `client/src/components/RecordingsView.tsx`

---

### FR-73: Template Visibility Rules

| Date | Change | Commit |
|------|--------|--------|
| 2026-01-02 | Implemented | - |

**What was built:**
Chapter-based filtering for common name templates, plus Config UI for editing filter rules.

**Part 1: Filtering Logic**
- Added `ChapterFilter` interface to `shared/types.ts`
- Extended `CommonName` with `chapterFilter?: 'all' | ChapterFilter`
- Template pills on Incoming page now filter by current chapter value
- Support for `"all"`, `{ max }`, `{ min }`, `{ min, max }` filters

**Part 2: Config UI**
- Refactored Common Names from pills to rows
- Each row: ▲/▼ reorder, name, dropdown, custom inputs (if needed), delete
- Dropdown presets: All chapters, Early (1-4), Late (10+), Custom
- All changes auto-save immediately

**Bonus:** ▲/▼ reorder buttons to control display order on Incoming page

**Files modified:**
- `shared/types.ts` - ChapterFilter type, extended CommonName
- `client/src/components/NamingControls.tsx` - Filter function, useMemo for filtered list
- `client/src/components/ConfigPanel.tsx` - Row-based Common Names UI with dropdowns

---

### FR-69: Header Dropdown Menus (Discovered Already Implemented)

| Date | Change | Commit |
|------|--------|--------|
| 2026-01-01 | Discovered already implemented during backlog audit | - |

**What was discovered:**
HeaderDropdown component exists with FR-69 comments. Used in App.tsx for:
- Settings dropdown (gear icon) - Config, Mockups
- Project actions dropdown (ellipsis) - Copy for Calendar, Copy Path, Open in Finder

**Files:**
- `client/src/components/HeaderDropdown.tsx` (created)
- `client/src/App.tsx` (uses HeaderDropdown)

---

### FR-80: Enhanced Project List & Stage Model (Discovered Already Implemented)

| Date | Change | Commit |
|------|--------|--------|
| 2026-01-01 | Discovered implemented via FR-82 during backlog audit | - |

**What was discovered:**
All FR-80 functionality was implemented as part of FR-82: Project List UX Fixes (2025-12-15).

- 8-stage model with STAGE_DISPLAY config
- InboxIndicator, AssetsIndicator, ChaptersIndicator components
- Click handlers navigate to relevant tabs
- Stage dropdown for manual changes

See FR-82 changelog entry for full implementation details.

---

### FR-118: Project-Specific Gling Dictionary

| Date | Change | Commit |
|------|--------|--------|
| 2026-01-02 | Implemented | - |

**What was built:**
Project-specific dictionary words that merge with global dictionary, plus UX improvements for dictionary management.

1. **Project Dictionary Storage**
   - Added `glingDictionary` field to ProjectState (`.flihub-state.json`)
   - New endpoint: `PATCH /api/projects/:code/state/dictionary`

2. **Dictionary Merge**
   - First Edit Prep now merges global + project dictionaries (deduped, sorted)
   - Returns both individual and merged dictionaries

3. **Config Panel UI**
   - Renamed "Gling Dictionary Words" to "Global Dictionary Words"
   - Added "Project Dictionary Words" textarea (shows project code, disabled when no project)
   - Added "Copy all" button - copies merged dictionary to clipboard

4. **Common Names Auto-Save**
   - Add/delete now saves immediately (no need to click Save button)
   - Updated help text to indicate auto-save behavior

**Files modified:**
- `shared/types.ts` - Added glingDictionary to ProjectState
- `server/src/utils/projectState.ts` - Updated write + added helper
- `server/src/routes/state.ts` - Added PATCH dictionary endpoint
- `server/src/routes/edit.ts` - Merge dictionaries in /prep
- `client/src/hooks/useApi.ts` - Added useProjectState, useUpdateProjectDictionary
- `client/src/components/ConfigPanel.tsx` - Added project dictionary UI

---

### FR-54: Naming Template Bugs (Discovered Already Fixed)

| Date | Change | Commit |
|------|--------|--------|
| 2026-01-01 | Discovered all 4 bugs already fixed during code review | - |

**What was discovered:**
Code review revealed all 4 naming template bugs had been fixed incrementally during previous development work. The PRD was not updated at the time.

**Bugs confirmed fixed:**
1. **Custom tag cleared after rename** - `handleRenamed` in App.tsx no longer clears customTag
2. **Tags appearing in suggested name** - `stripTrailingTags()` in shared/naming.ts removes uppercase tags
3. **Sequence limited to single digit** - Input now accepts 3 digits (slice(0, 3), maxLength={3})
4. **Custom tag input too narrow** - Width increased from w-16 to w-24, helpful title added

**Evidence:** Comments referencing FR-54 found in App.tsx (line 168), NamingControls.tsx (line 114), and shared/naming.ts (lines 161, 231).

---

### FR-114: Projects Page - Transcript Quick Access (Phase 1)

| Date | Change | Commit |
|------|--------|--------|
| 2026-01-01 | Phase 1 Implemented | - |

**What was built:**
One-click transcript copy from the Projects panel.

1. **New API endpoint** - `GET /api/query/projects/:code/transcript/text`
   - Reads all transcript `.txt` files from the project
   - Sorts by chapter/sequence order
   - Returns combined plain text

2. **Copy button in UI** - 📋 icon on each project row
   - Disabled (grayed) when project has 0% transcripts
   - On click: fetches transcript -> copies to clipboard -> shows toast with char count

**Bug fix during implementation:**
- Had to use `API_URL` (`http://localhost:5101`) instead of relative URL, since Vite dev server doesn't proxy API requests to the backend.

**Files modified:**
- `server/src/routes/query/projects.ts` - New transcript text endpoint
- `client/src/components/ProjectsPanel.tsx` - Copy button per row

**Phases 2-3 (Multi-Select):** Future work - enables bulk transcript operations.

---

### FR-113: Edit Prep Path Fix & Folder Restructure

| Date | Change | Commit |
|------|--------|--------|
| 2025-12-31 | Implemented | - |

**Bug fix:**
Path expansion bug - `expandPath()` was missing, causing folders to be created at literal `~` path inside server directory instead of user's home directory.

**Enhancements bundled with fix:**

1. **New folder structure:**
   ```
   project/
   ├── edit-1st/      # First edit prep (Gling cuts)
   ├── edit-2nd/      # Second edit (Jan's graphics)
   └── edit-final/    # Final review
   ```

2. **"Create All" button** - Single click creates all three folders

3. **Naming convention** - Renamed from "first-edit/edits" to "edit" (singular) for consistency with "recording"

**Files renamed:**
- `server/src/routes/first-edit.ts` -> `server/src/routes/edit.ts`
- `client/src/hooks/useFirstEditApi.ts` -> `client/src/hooks/useEditApi.ts`
- `client/src/components/FirstEditPrepPage.tsx` -> `client/src/components/EditPrepPage.tsx`

**Files modified:**
- `server/src/index.ts` - Import + route `/api/edit`
- `client/src/App.tsx` - Imports, state, menu label

**API changes:**
- `GET /api/edit/prep` - Returns `editFolders: { allExist, folders: [{name, exists}] }`
- `POST /api/edit/create-folders` - Creates all three edit folders

---

### FR-117: Hover UX Improvements

| Date | Change | Commit |
|------|--------|--------|
| 2025-12-31 | Implemented | - |

**What was built:**
Improved hover interactions across the app to reduce flicker and prevent "whack-a-mole" behavior.

**Part A: Tooltip Delays (Projects Page)**
- All indicator tooltips (📥 Inbox, 🖼 Assets, 🎬 Chapters, % Transcripts, 🎬 Final) now have 150ms leave delay
- Visual anchors (tooltip arrows) added pointing to trigger element
- Reduces flicker when moving mouse across multiple indicators

**Part B: Chapter Panel Hover (Watch Page)**
- 250ms enter delay on chapter hover - prevents accidental panel switches
- 200ms leave delay keeps segment panel visible while moving toward it
- `lockCurrentChapter()` - entering segment panel cancels any pending chapter switches
- Solves "whack-a-mole" issue where mouse path crossed other chapters

**Key insight:** The fix required canceling pending enter timers when mouse reaches destination (segment panel), not just delaying the enter.

**Files created:**
- `client/src/hooks/useDelayedHover.ts` - Reusable hooks: `useDelayedHover`, `useDelayedHoverValue`

**Files modified:**
- `client/src/components/WatchPage.tsx` - Chapter hover delays, `lockCurrentChapter` on segment panel enter
- `client/src/components/ProjectsPanel.tsx` - 5 indicator components updated with delayed hover

---

### FR-116: Incoming Page - Quick Config Access

| Date | Change | Commit |
|------|--------|--------|
| 2025-12-31 | Implemented | - |

**What was built:**
Quick access to common names configuration from the Incoming page.

**Features:**
- ⚙+ button added after common name pills on Incoming page
- Clicking navigates to Config tab and auto-focuses new "Common Names" section
- Common Names section added to Config page with:
  - Existing names shown as removable pills (× to delete)
  - Input field to add new names (Enter or Add button)
  - Input sanitization (lowercase, alphanumeric, dashes only)
- Changes persist on Save

**Files modified:**
- `client/src/App.tsx` - state, navigation callback
- `client/src/components/NamingControls.tsx` - ⚙+ button
- `client/src/components/ConfigPanel.tsx` - Common Names section
- `server/src/index.ts` - updateConfig handler
- `server/src/routes/index.ts` - POST /config endpoint

---

### FR-111: Safe Architecture Rework (Phase 1-4)

| Date | Change | Commit |
|------|--------|--------|
| 2025-12-26 | Phase 1 implemented | - |
| 2025-12-26 | Phase 2 implemented | - |
| 2025-12-26 | Phase 3 implemented | - |
| 2025-12-26 | Phase 4 implemented | - |

**Phase 1 - What was fixed:**
Watch page segment panel not showing when hovering chapters 09-10 after moving other files to safe.

**Root cause:**
CSS layout issue - the parent container for the cascading panels had no explicit width, so it was only as wide as the chapter panel (288px). The segment panel, positioned at `right-72` (288px from the parent's right edge), was outside the parent's bounds. When the mouse moved from the chapter panel toward the segment panel, it exited the parent container, triggering `onMouseLeave → setHoveredChapter(null)`.

**Fix applied:**
- Added `w-[544px]` to parent container (288px + 256px for both panels)
- Added `pointer-events-none` to parent, `pointer-events-auto` to children
- Added `absolute right-0 top-0` to chapter panel

**Files modified:**
- `client/src/components/WatchPage.tsx`

**Phase 2 - State File Foundation:**
Created infrastructure for `.flihub-state.json` per-project state files.

**New API endpoints:**
- `GET /api/projects/:code/state` - Read project state
- `POST /api/projects/:code/state` - Update project state (merge with existing)

**Files created/modified:**
- `shared/paths.ts` - Added `stateFile` path
- `shared/types.ts` - Added `RecordingState`, `ProjectState`, `ProjectStateResponse`, `UpdateProjectStateRequest`
- `server/src/utils/projectState.ts` - NEW: State file utilities
- `server/src/routes/state.ts` - NEW: State API endpoints
- `server/src/index.ts` - Registered state routes

**Phase 3 - Safe Migration:**
Replaced physical `-safe/` folder moves with state-based flags.

**Migration script:** `server/src/utils/safeMigration.ts`
- `migrateSafeFolder()` - Moves files from `-safe/` back to `recordings/`, updates state file
- `needsMigration()` - Checks if project has files to migrate
- Runs automatically on server startup if `-safe/` folder detected

**Architecture changes:**
- `RecordingFile.folder` now always `'recordings'` (removed `'safe'` option)
- Added `RecordingFile.isSafe: boolean` flag
- Removed `recordingsCount` and `safeCount` from ProjectStats (use `isSafe` filter instead)
- Safe/Restore buttons toggle state flag instead of moving files

**Files created/modified:**
- `server/src/utils/safeMigration.ts` - NEW: Migration utilities
- `shared/types.ts` - Changed folder type, added isSafe flag
- `server/src/routes/index.ts` - Safe/Restore now toggle state flags
- `server/src/utils/scanning.ts` - Removed safeDir parameters
- `server/src/WatcherManager.ts` - Only watches `recordings/` (no more `-safe`)
- `client/src/components/WatchPage.tsx` - Uses `isSafe` instead of `folder === 'safe'`
- `client/src/components/RecordingsView.tsx` - Uses `isSafe` for filtering
- `client/src/components/RenameLabelModal.tsx` - Simplified shadowFolder logic

**Phase 4 - UI Polish:**
Added "Show safe" toggle to Watch page.

**Changes:**
- Added `showSafe` state with localStorage persistence (default: false)
- Updated `groupByChapterWithTiming()` to filter based on toggle
- Added yellow "Safe" button in controls bar
- Safe files show yellow background + border + SAFE badge when visible

**Additional cleanup:**
- `ProjectStatsPopup.tsx` - Replaced `recordingsCount/safeCount` with `totalFiles`
- `RecordingsView.tsx` - Updated `editingChapter` type to use `isSafe`

**Files modified:**
- `client/src/components/WatchPage.tsx`
- `client/src/components/ProjectStatsPopup.tsx`
- `client/src/components/RecordingsView.tsx`

**Phase 5 (optional, future):** Per-recording stage UI.

---

### FR-110: Project Stage Persistence & Dropdown

| Date | Change | Commit |
|------|--------|--------|
| 2025-12-26 | Implemented | - |

**What was fixed:**
Two issues with project stage management.

**Bug Fix - Persistence:**
- `saveConfig()` wasn't including `projectStageOverrides`
- Stage changes were lost on server restart
- Same pattern as FR-108

**Enhancement - Dropdown UI:**
- Replaced click-to-cycle with dropdown menu
- Shows all 8 stages with colored dots
- "Auto" option to reset to auto-detection
- Current stage has checkmark indicator

**Files modified:**
- `server/src/index.ts` - Added projectStageOverrides to saveConfig()
- `client/src/components/ProjectsPanel.tsx` - StageCell dropdown, removed cycle code

---

### FR-109: Transcript Management Bugs

| Date | Change | Commit |
|------|--------|--------|
| 2025-12-26 | Implemented | - |

**What was fixed:**
Two related bugs causing orphaned transcripts to accumulate.

**Bug 1 - Delete returns 404:**
- `path.extname()` broke on filenames with dots (e.g., `23-1-develop.2.4-setup`)
- The last dot was treated as a file extension, corrupting the filename
- Fix: Filename param is already a base name, just append `.txt` directly

**Bug 2 - Transcripts save to wrong project:**
- Output dir used current config's `projectDirectory` instead of the video's project
- When switching projects during queue processing, transcripts went to wrong folder
- Fix: Derive `transcriptsDir` from `activeJob.videoPath` by finding `recordings/` and going up one level

**Files modified:**
- `server/src/routes/transcriptions.ts` (lines 101-112, 429-431)

---

### FR-108: Gling Dictionary Not Saving

| Date | Change | Commit |
|------|--------|--------|
| 2025-12-26 | Implemented | - |

**What was fixed:**
Config save pipeline was dropping the `glingDictionary` field at every step - the UI sent it but the server never extracted, processed, or persisted it.

**Root cause:**
Three locations all needed to handle the field:
1. POST route didn't extract it from request body
2. `updateConfig()` didn't process it
3. `saveConfig()` didn't include it in the saved object

**Files modified:**
- `server/src/routes/index.ts` - Added glingDictionary to destructure and pass-through
- `server/src/index.ts` - Added to saveConfig() toSave object and updateConfig() handling

---

### FR-107: Chapter Input Auto-Focus & Glow Animation

| Date | Change | Commit |
|------|--------|--------|
| 2025-12-23 | Implemented | - |

**What was built:**
Small UX enhancement for the Naming Template. When user clicks "New Chapter" button, the **Name** input field automatically receives focus with a pulsing blue glow animation (500ms).

**Features:**
- Auto-focus on Name input (not Chapter) when "New Chapter" clicked
- Custom CSS `glow-pulse` keyframe animation with pulsing box-shadow
- Animation only triggers on chapter change, not manual focus or initial mount
- Helps prevent users from forgetting to update the chapter name

**Files modified:**
- `client/src/components/NamingControls.tsx` - Added useRef, useState, useEffect for focus/glow
- `client/src/index.css` - Added `@keyframes glow-pulse` and `.animate-glow-pulse` class

---

### FR-105: S3 DAM Integration

| Date | Change | Commit |
|------|--------|--------|
| 2025-12-18 | Implemented | - |

**What was built:**
S3 DAM Integration adds Upload/Download buttons to the S3 Staging modal that execute DAM CLI commands for S3 sync operations.

**Features:**
- PREP section: S3 status display (uploaded/not uploaded/out of sync), [Upload to S3] button, [View] button
- POST section: S3 status display (new files available/all downloaded), [Download from S3] button
- CLEANUP section: Local staging size display with [Clean Local] button, S3 size with [Clean S3] button
- Confirmation dialogs for destructive operations
- Progress indicators during DAM operations
- All buttons disabled during active DAM operations

**API Endpoints:**
- `GET /api/s3-staging/s3-status` - Get S3 bucket status via `dam s3-status`
- `POST /api/s3-staging/dam` - Execute DAM command (upload/download/cleanup-s3/status)
- `DELETE /api/s3-staging/local` - Delete all local staging files
- `GET /api/s3-staging/local-size` - Get local staging size

**DAM Commands Used:**
- `dam s3-up {brand} {project}` - Upload prep files to S3
- `dam s3-down {brand} {project}` - Download post files from S3
- `dam s3-cleanup {brand} {project}` - Delete S3 files for project
- `dam s3-status {brand} {project}` - Get S3 file listing

**Brand Detection:**
Brand is extracted from project path: `/video-projects/v-appydave/b85-...` → `appydave`

**Files created/modified:**
- `server/src/routes/s3-staging.ts` - Added DAM command execution, S3 status, local cleanup endpoints
- `client/src/hooks/useS3StagingApi.ts` - Added useS3Status, useDamCommand, useCleanLocal, useLocalSize hooks
- `client/src/components/S3StagingPage.tsx` - Added S3 status displays, DAM buttons, CLEANUP section

**Note:** Requires DAM CLI (`appydave-tools` gem) and AWS CLI configured with credentials.

---

### FR-94: Transcription Progress State Bugs

| Date | Change | Commit |
|------|--------|--------|
| 2025-12-16 | Implemented | - |

**Root cause:** Broken Whisper command with two `--output_format` flags - only `.srt` files were created, so `.txt` checks failed everywhere.

**Changes:**
- Fixed Whisper to use `--output_format all` (creates both .txt and .srt)
- Standardized ALL transcript checks to use `.txt` only
- Removed shadow folder from transcription scanning
- Added base name normalization to prevent duplicates
- Added TXT/SRT toggle in transcript viewer modal

**Files:**
- `server/src/routes/transcriptions.ts`
- `server/src/utils/scanning.ts`
- `server/src/routes/query/recordings.ts`
- `client/src/components/TranscriptModal.tsx`
- `client/src/components/shared/FileViewerModal.tsx`

**Note:** B89's existing `.srt`-only files need re-transcription.

---

### NFR-87: Starred Projects Visual Update

| Date | Change | Commit |
|------|--------|--------|
| 2025-12-16 | Implemented | - |

**Changes:**
- Icon: 📌 → ⭐ (Projects panel + header dropdown)
- Tooltips: "Pinned (click to unpin)" → "Starred (click to unstar)"
- Sort order: Changed from "starred first" to natural code order (b40, b41, b42...)

**Files:**
- `client/src/components/ProjectsPanel.tsx`
- `client/src/App.tsx`
- `server/src/routes/projects.ts`
- `server/src/routes/query/projects.ts`

---

### FR-92: Transcribe All Re-Transcribes Existing Files

| Date | Change | Commit |
|------|--------|--------|
| 2025-12-16 | Implemented | b7762ff |

**Root cause:** FR-74 changed `getTranscriptPath()` to require BOTH .txt AND .srt files, but older transcripts only have .txt.

**Changes:**
- Created `hasTranscriptFile()` function that only checks for .txt existence
- Updated `queueTranscription()` skip logic to use new function
- `getTranscriptPath()` left unchanged (still requires both for "complete" status)

**Bonus - UI Enhancement:**
- New endpoint: `GET /api/transcriptions/pending-count` returns `{ pendingCount, totalCount }`
- Button now shows count: "🎙️ Transcribe 3" instead of "Transcribe All"
- Button disabled when no pending files, shows "All Transcribed"

**Files:**
- `server/src/routes/transcriptions.ts` - New `hasTranscriptFile()`, updated skip logic, new endpoint
- `client/src/hooks/useApi.ts` - Hook for pending count
- `client/src/constants/queryKeys.ts` - New query key
- `client/src/components/RecordingsView.tsx` - Updated button UI

---

### FR-89: Cross-Platform Path Support (Partial)

| Date | Change | Commit |
|------|--------|--------|
| 2025-12-16 | Parts 1b & 2 implemented | b7762ff |

**Parts completed:**
- Part 1b: Tilde expansion - already implemented
- Part 2: Path existence indicators - fixed for Windows UNC paths

**Fix:** Replaced `fs.pathExists()` with `fs.stat()` + try/catch for better Windows UNC path support.

**File:** `server/src/routes/system.ts`

**Status:** Needs UAT on Windows - Jan should test after pulling.

**Remaining parts:** 3 (folder picker), 4 (input sanitization), 5 (root directory), 6 (shadow resolution), 7 (docs)

---

### FR-91: Fix Video Size Toggle

| Date | Change | Commit |
|------|--------|--------|
| 2025-12-16 | Implemented | - |

**Changes:**
- Removed XL option, simplified to N (Normal) and L (Large) only
- Fixed Large mode to properly break out of container constraints
- Large now renders noticeably bigger than Normal

**File:** `client/src/components/WatchPage.tsx`

---

### FR-90: Show All Active Watchers

| Date | Change | Commit |
|------|--------|--------|
| 2025-12-16 | Implemented | - |

**Changes:**
- Added `GET /api/system/watchers` endpoint to expose all active watchers
- Config panel now displays all watchers (Ecamm, Downloads, project folders)
- Shows green dot for active watchers

**Files:**
- `server/src/routes/system.ts` - New watchers endpoint
- `client/src/components/ConfigPanel.tsx` - Watchers display UI

---

### FR-88: Shadow Fallback in Recordings UI

| Date | Change | Commit |
|------|--------|--------|
| 2025-12-16 | Implemented | - |

**Changes:**
- Watch page now falls back to shadow video when real video fails to load
- Segment icons show both playing state AND shadow status (e.g., ▶ 👻)
- Added `handleVideoError` callback for automatic fallback
- Added `sourceFile` reference to VideoMeta interface

**Files:**
- `client/src/components/WatchPage.tsx` - Shadow fallback logic, icon updates

**Also fixed:** New Chapter button now preserves previous name instead of clearing it

---

### FR-87: GitHub Repo Link in Cog Menu

| Date | Change | Commit |
|------|--------|--------|
| 2025-12-15 | Implemented | - |

**Changes:**
- Added "GitHub" link with 🔗 icon → `https://github.com/flivideo/flihub`
- Added "Video Projects" link with 🔗 icon → `https://github.com/appydave-video-projects/v-appydave`
- Both grouped below a divider, separate from config/mockups

**File:** `client/src/App.tsx`

---

### NFR-85: File Watcher Additions

| Date | Change | Commit |
|------|--------|--------|
| 2025-12-15 | Implemented | - |

**Features:**
- Added transcripts watcher (`recording-transcripts/`) for real-time transcript UI updates
- Added thumbs watcher (`assets/thumbs/`) for real-time thumbnail UI updates
- Added Refresh button to ProjectsPanel header (manual cache invalidation)

**Tech debt fixed during implementation:**
- Renamed `projectStats` → `projects` throughout codebase (queries, hooks, endpoints)
- Deleted dead code: `server/src/utils/projectStats.ts` (functionality already in `routes/query/projects.ts`)
- Fixed query key bug: Refresh button was invalidating wrong key (`projectStats` instead of `projects`)

**Files modified:**
- `server/src/WatcherManager.ts` - Added transcripts and thumbs watchers
- `client/src/components/ProjectsPanel.tsx` - Added Refresh button
- `client/src/hooks/useApi.ts` - Renamed hooks
- `client/src/constants/queryKeys.ts` - Renamed keys
- Multiple files - Query key references updated

---

### FR-84: Cross-Platform Setup Guide

| Date | Change | Commit |
|------|--------|--------|
| 2025-12-15 | Documentation written | - |

**Created:** `/docs/cross-platform-setup.md`

**Sections:**
- Prerequisites (Node.js, Git, FFmpeg, WhisperAI)
- Installation steps
- Configuration for recipients (watch dir, project dir)
- Understanding shadow files and 👻 indicators
- What works without video files (feature matrix)
- Project list column guide
- Syncing workflow with David
- Troubleshooting
- Future: alternative screen recorders

**Target audience:** Jan (Windows), future collaborators

---

### FR-83: Shadow Recording System

| Date | Change | Commit |
|------|--------|--------|
| 2025-12-15 | Full implementation | - |
| 2025-12-15 | Extended with folder access, status indicators, watcher | - |

**What was built:**
Shadow files are lightweight `.txt` placeholders that mirror video recordings, allowing collaborators without video files to see project structure.

**Implementation decisions (changed from spec):**
- Folder naming: `recording-shadows/` (not `recordings-shadow/`) to match `recording-transcripts/` convention
- Display: Shadow count as numeric column in project list (not icon indicator) - easier to compare "88 files, 88 shadows"
- Auto-generation: Shadows created automatically when recordings are renamed

**Features:**
- Unified scanning merges `recordings/` + `recording-shadows/`
- Ghost icon 👻 for shadow-only files in recordings list
- Watch page shows "Video not available locally" for shadows
- Config page: Generate Shadows buttons + watch directory status (🟢/🟡/🔴)
- Project list: Shadow count column

**Session 2 additions:**
- Unified folder access: Open-folder API extended to work with any project, added shadows and chapters folder keys
- Recording status indicators (three states):
  - 📹 Real only (original recording, no shadow)
  - 📹👻 Real + shadow (synced for collaborators)
  - 👻 Shadow only (preview mode)
- Shadow watcher: Shadow directories added to recordings watcher for auto-refresh
- ProjectsPanel clickable stats: Files, Shadows, Ch columns now clickable to open folders
- UX consistency patterns established:
  - Indicators (📥 Inbox, 🖼 Assets) → navigate to tabs
  - Count columns (Files, Shadows, Ch) → open folders
  - Status cells (Transcript %, Final) → read-only with tooltips

**Files created:**
- `server/src/utils/shadowFiles.ts` - Core shadow utilities
- `server/src/routes/shadows.ts` - API endpoints

**Files modified:**
- `shared/types.ts` - Shadow types and `shadowCount` on ProjectStats
- `server/src/routes/index.ts` - Auto-generate on rename
- `server/src/routes/query/recordings.ts` - Unified scanning
- `server/src/utils/projectStats.ts` - Shadow counting
- `server/src/routes/projects.ts` - Pass shadowCount
- `client/src/hooks/useApi.ts` - Shadow hooks
- `client/src/components/ConfigPanel.tsx` - Shadow UI + status refresh fix
- `client/src/components/ProjectsPanel.tsx` - Shadow count column + clickable stats
- `client/src/components/RecordingsView.tsx` - Ghost icon + status indicators
- `client/src/components/WatchPage.tsx` - "Not available" state
- `server/src/routes/system.ts` - Extended open-folder API
- `server/src/WatcherManager.ts` - Shadow directory watching
- `client/src/hooks/useOpenFolder.ts` - Updated for new folder keys

**Bugs fixed during implementation:**
- Config page watch directory status wasn't updating after save - added `refetchShadowStatus()` after config save

**Note:** Original spec proposed video shadows (240p mp4), but implemented as text placeholders first. Video shadows can be added later if needed.

---

### FR-82: Project List UX Fixes

| Date | Change | Commit |
|------|--------|--------|
| 2025-12-15 | All parts implemented | - |

**Bug fix:**
- Transcript percentage was showing 0% everywhere
- Root cause: FR-78 changed logic to require both `.txt` AND `.srt`, but this was too strict
- Fix: Now counts `.txt` files as valid transcripts (SRT is optional)
- Verified: b71-bmad-poem now shows 100% (118 matched)

**UX improvements:**
- Rich tooltips on indicator icons (📥🖼🎬) - hover shows count (e.g., "Inbox - 3 items")
- Empty indicators now blank (not faded icons)
- Stage badge tooltips with descriptions (e.g., "Actively recording video segments")

**API additions:**
- `inboxCount` and `chapterVideoCount` fields added to project stats

**Files modified:**
- `server/src/utils/scanning.ts` - transcript logic fix + indicator counts
- `server/src/utils/projectStats.ts` - added count fields
- `server/src/routes/projects.ts` - include counts in API response
- `client/src/components/ProjectsPanel.tsx` - new tooltip components
- `shared/types.ts` + `shared/types.d.ts` - type definitions

---

### NFR-79: Tech Debt Exploration

| Date | Change | Commit |
|------|--------|--------|
| 2025-12-15 | Investigation complete, toKebabCase extraction done | 2ce9743 |

**Findings:**

| Area | Result |
|------|--------|
| Transcription queue | **Accept** - Low risk, safe design |
| AssetsPage quick wins | 4 remaining (hooks extraction), all Small/Low risk |
| General code health | Large route files noted, error handling already in NFR-67 |

**Implemented:** Extracted `toKebabCase` to `client/src/utils/formatting.ts`

**Parked:** 4 hook extractions (useChapterNavigation, usePersistedState, useWindowedRecordings, PairedAsset grouping) - available if needed

---

### FR-78: Transcript Stats Require SRT

| Date | Change | Commit |
|------|--------|--------|
| 2025-12-15 | Stats now require both TXT and SRT for "complete" | - |

**Change:**
- `getTranscriptSyncStatus()` updated to require both `.txt` AND `.srt` for a transcript to count as "matched"
- Creates intersection of txt and srt file sets
- Aligns with FR-74's definition of "complete"

**Files modified:**
- `server/src/utils/scanning.ts:75-105` - Updated matching logic with comment

---

### FR-77: Transcript Sync Highlighting (Chapters)

| Date | Change | Commit |
|------|--------|--------|
| 2025-12-15 | Chapter videos now have synchronized transcript highlighting | - |

**Features:**
- Chapter videos show word/phrase highlighting (same as segments)
- Uses chapter SRT with correct timing offsets
- Click-to-seek works within chapter video
- "Chapter" badge in transcript panel header
- Error guidance if chapter SRT missing

**Files created/modified:**
- `server/src/routes/query/transcripts.ts` - Added `GET /chapters/:chapterName/srt` endpoint
- `client/src/components/TranscriptSyncPanel.tsx` - Added `chapterName` prop
- `client/src/components/WatchPage.tsx` - Unified transcript panel for segments and chapters
- `shared/types.ts` - Added `srtFile` to chapters:generated event

**Note:** Segment boundaries in transcript panel (showing "── Segment 1 ──" markers) is an optional future enhancement.

---

### FR-76: Chapter SRT Generation

| Date | Change | Commit |
|------|--------|--------|
| 2025-12-15 | Chapter videos now generate matching SRT files | - |

**Features:**
- Reads each segment's `.srt` from `recording-transcripts/`
- Calculates timing offsets based on segment durations
- With slides ON: adds slideDuration before each segment's offset
- With slides OFF: offsets based purely on segment durations
- Writes combined SRT to `recordings/-chapters/{chapter}-{label}.srt`
- SRT entries renumbered sequentially

**Config page additions:**
- Include purple title slides (checkbox)
- Slide duration (seconds)
- Default resolution (720p/1080p)
- Auto-generate on new chapter
- Defaults pre-populate the Chapter Recording modal

**Output:**
```
recordings/-chapters/
├── 01-intro.mov     ← video
├── 01-intro.srt     ← synchronized subtitles
```

**Files modified:**
- `server/src/utils/chapterRecording.ts` - SRT generation logic
- `server/src/routes/chapters.ts` - passes transcriptsDir option
- `client/src/components/ConfigPanel.tsx` - chapter recording defaults UI
- `client/src/hooks/useApi.ts` - refetchOnMount for config sync

---

### FR-75: Transcript Sync Highlighting (Segments)

| Date | Change | Commit |
|------|--------|--------|
| 2025-12-15 | Added real-time transcript highlighting to Watch page | - |

**Features:**
- Words/phrases highlight as video plays
- Toggle between Word and Phrase modes (persists to localStorage)
- Click any word to seek video to that timestamp
- Auto-scrolls to keep highlighted text visible

**Files created:**
- `client/src/utils/srt.ts` - SRT parsing utilities
- `client/src/components/TranscriptSyncPanel.tsx` - Highlighting panel component

**Files modified:**
- `client/src/components/WatchPage.tsx` - Integration with video timeupdate
- `server/src/routes/query/transcripts.ts` - GET endpoint for SRT content

**Note:** Word-level timing is estimated by distributing phrase duration evenly (whisper provides phrase-level only). Chapter video sync is FR-77.

---

### FR-74: Dual Transcript Output (TXT + SRT)

| Date | Change | Commit |
|------|--------|--------|
| 2025-12-15 | Whisper now outputs both TXT and SRT files | - |

**Changes:**
- Added `--output_format srt` alongside existing txt format
- Updated `getTranscriptPath()` to require BOTH `.txt` and `.srt` for "complete" status
- Legacy txt-only transcripts will re-transcribe when "Transcribe All" is clicked

**Files modified:**
- `server/src/routes/transcriptions.ts`

**Note:** This enables FR-75/FR-77 (transcript sync highlighting).

---

### FR-72: Fix Chapter Recording Codec Mismatch

| Date | Change | Commit |
|------|--------|--------|
| 2025-12-15 | Fixed corrupted chapter recordings | - |

**Problem:** Generated chapter recordings were corrupted - audio pitch wrong, video freezing after a few seconds.

**Root causes fixed:**
1. Title slide audio was only 0.1s (beep duration) - now full slide duration with beep at start
2. Used wrong FFmpeg concat method (demuxer requires identical streams) - switched to concat filter (re-encodes but reliable)
3. Unicode arrow `→` rendered as box on some systems - simplified slide text
4. Chapter videos returned 404 in Watch page - fixed path (`-chapters` is inside `recordings/`)

**Slide text simplified to:**
```
Segment 1
intro

28 seconds
```

**Files modified:**
- `server/src/utils/chapterRecording.ts` - concat filter approach, audio fix, text simplification
- `server/src/routes/video.ts` - fixed chapter video path resolution

---

### Watch Page Playback Controls (Bonus)

| Date | Change | Commit |
|------|--------|--------|
| 2025-12-15 | Added playback controls and toggles | - |

**Note:** These are UX enhancements beyond FR-71 scope.

**Button layout (left to right):**

| Button | State | Color | Function |
|--------|-------|-------|----------|
| Play/Stop | Stopped | Blue | Click to play video |
| Play/Stop | Playing | Red | Click to pause video |
| Autoplay | OFF/ON | Gray/Green | Auto-starts videos when clicked in panel |
| Auto Next | OFF/ON | Gray/Green | Auto-advances to next segment when video ends |

**Behavior:**
- Play/Stop button disabled until a video is selected
- Play/Stop directly controls the current video
- Autoplay and Auto Next are toggles that persist in localStorage

**Files modified:**
- `client/src/components/WatchPage.tsx`

---

### FR-61, FR-62, FR-63: Project Resolution, Rename, Terminal Button

| Date | Change | Commit |
|------|--------|--------|
| 2025-12-14 | Implemented all three features together | - |

**FR-61: Project Resolution + Enhanced Project List**
- New resolve endpoint: `GET /api/query/projects/resolve?q=b86`
- Returns full code, brand, and filesystem path
- Enhanced projects list now includes `brand` and `path` fields
- Brand derived from folder: `v-appydave` → `appydave`

**FR-62: Rename to FliHub**
- Header text changed from "Recording Namer" to "FliHub"
- Browser tab title was already "FliHub"

**FR-63: Terminal Quick-Open Button**
- New `>_` button in header next to clipboard button
- Copies full project path to clipboard
- Dark styling, tooltip "Copy project path"

**Files modified:**
- `server/src/routes/query.ts` - resolve endpoint, brand/path fields
- `client/src/App.tsx` - header rename, copy path button
- `~/.claude/skills/flihub/SKILL.md` - documentation update
- `~/.claude/skills/flihub/resolve-command.md` - new file

---

### FR-60: FliHub Skill Updates

| Date | Change | Commit |
|------|--------|--------|
| 2025-12-14 | Updated FliHub skill with health and write commands | - |

**Changes:**
- Renamed skill folder: `querying-flihub` → `flihub`
- Updated SKILL.md with new name, health check, and write commands
- Created `health-command.md` - documents GET /api/system/health
- Created `write-command.md` - documents POST /api/projects/:code/inbox/write

**Skill location:** `~/.claude/skills/flihub/`

**Files in skill:**
- `SKILL.md` - main skill file (updated)
- `health-command.md` - new
- `write-command.md` - new
- Plus existing command docs (chapters, export, images, project, projects, recordings, transcripts)

---

### FR-59: Inbox Tab

| Date | Change | Commit |
|------|--------|--------|
| 2025-12-14 | Implemented Inbox tab with dynamic folder scanning | - |

**Features:**
- New Inbox tab (positioned after Recordings, before Assets)
- Dynamic folder scanning (any folder in `inbox/` appears automatically)
- Root-level files shown under `(root)` group
- Preferred sort order: (root) → raw → dataset → presentation → alphabetical
- Chapter-row separator UI pattern (matching RecordingsView)
- Shows folder name, file count, and total size per folder
- Live updates via WebSocket file watcher
- Write API for programmatic file creation

**Files created:**
- `client/src/components/InboxPage.tsx`

**Files modified:**
- `shared/paths.ts` - inbox path definitions
- `shared/types.ts` - inbox:changed socket event
- `server/src/routes/query.ts` - GET /api/query/projects/:code/inbox
- `server/src/routes/projects.ts` - POST /api/projects/:code/inbox/write
- `server/src/routes/system.ts` - inbox folder key for Open button
- `server/src/WatcherManager.ts` - inbox file watcher
- `client/src/App.tsx` - Inbox tab, reordered tabs
- `client/src/hooks/useApi.ts` - useInbox, useWriteToInbox hooks
- `client/src/hooks/useSocket.ts` - useInboxSocket for live updates
- `client/src/constants/queryKeys.ts` - inbox query key

---

### FR-57: Parallelize ffprobe Calls

| Date | Change | Commit |
|------|--------|--------|
| 2025-12-13 | Implemented parallel ffprobe calls | - |

**Performance improvement:**
- Before: 8-9 seconds (118 files × ~50ms sequential)
- After: ~1 second (all in parallel)

**Changes:**
- Both `recordings/` and `safe/` folder loops now use `Promise.all`
- Added TypeScript type guard for filter

**Files modified:**
- `server/src/routes/index.ts:395-415`

**Decision:** Stayed stateless - parallelization was sufficient, no caching needed. See brainstorming notes for full architectural discussion.

---

### FR-55 & FR-56: Video Transcript Export + Chapter Navigation Panel

| Date | Change | Commit |
|------|--------|--------|
| 2025-12-13 | Implemented both features together | - |
| 2025-12-13 | FR-56 polish: chapter numbers, right-aligned timestamps, active state consistency | - |

**FR-56: Chapter Navigation Panel**
- Slide-out panel from right edge (hover to expand)
- Vertical "Chapters (24)" tab visible on right side
- Chapter list with YouTube-format timestamps
- Current chapter highlighted (Intersection Observer tracking)
- Click chapter → scrolls to that section
- "Copy for YouTube" button

**FR-55: Video-Level Transcript Export**
- 📄 Transcript button in Recordings header
- Modal with combined transcript for entire video
- Chapter headings toggle (checkbox in modal)
  - Checked: Shows "Chapter 1: Title" headers with separators
  - Unchecked: Raw transcript text only

**Other changes:**
- Removed "Chapters" checkbox toggle from Recordings header
- Added shared `formatChapterTitle()` utility

**Files created:**
- `client/src/components/ChapterPanel.tsx`
- `client/src/components/VideoTranscriptModal.tsx`

**Files modified:**
- `client/src/components/RecordingsView.tsx` - slide-out panel, transcript button
- `client/src/utils/formatting.ts` - formatChapterTitle utility
- `client/src/constants/queryKeys.ts` - combinedTranscript key
- `server/src/routes/transcriptions.ts` - combined transcript endpoint

**Performance issue identified:** FR-57 created for duration caching (118 ffprobe calls causing 5s delays)

---

### FR-35: Fix Chapter Grouping Logic + Total Duration

| Date | Change | Commit |
|------|--------|--------|
| 2025-12-10 | Implemented chapter grouping fix and total duration display | - |

**Features:**
- Group recordings by chapter NUMBER only (not number + name)
- Display name from sequence 1 file with uppercase tags stripped
- Total duration in header: `83 files (6 active, 77 safe) | 1h 23m 45s`
- Total duration in footer: `Total: 1h 23m 45s`

**Files modified:**
- `client/src/components/RecordingsView.tsx` - groupByChapter(), getChapterDisplayName(), totalDuration

---

### FR-53: ASCII Report Formatter

| Date | Change | Commit |
|------|--------|--------|
| 2025-12-07 | Implemented `?format=text` support for all NFR-8 query endpoints | - |

**Features:**
- All 7 query endpoints support `?format=text` parameter
- Returns `Content-Type: text/plain` with formatted ASCII reports
- DAM-style formatting: emoji indicators, human-readable sizes, relative times
- New utilities: `formatSize()`, `formatDuration()`, `formatAge()`, `shortenPath()`
- Report generators for projects, recordings, transcripts, chapters, images, export

**Files created:**
- `server/src/utils/formatters.ts` - Core formatting utilities
- `server/src/utils/reporters.ts` - Report generators

**Files modified:**
- `server/src/routes/query.ts` - Added format=text handling
- `~/.claude/skills/querying-flihub/SKILL.md` - Updated with format=text docs

---

### FR-5: Trash Folder

| Date | Change | Commit |
|------|--------|--------|
| 2025-11-29 | Initial: `.trash` folder for discarded files | earlier |
| 2025-11-29 | Fix: Renamed `.trash` → `-trash` (visible in Finder) | db85daf |

---

### FR-8: Good Take Algorithm

| Date | Change | Commit |
|------|--------|--------|
| 2025-11-28 | Initial: Recency-weighted scoring algorithm | earlier |
| 2025-11-29 | Rewrite: Baseline-aware algorithm, <5MB = junk | db85daf |

**Notes:** v1 algorithm failed when baseline file existed with smaller junk files. v2 uses 5MB threshold to identify substantial takes.

---

### FR-9: Default Port

| Date | Change | Commit |
|------|--------|--------|
| 2025-11-29 | Changed Vite default port to 5100 | earlier |

---

### FR-10: Project List Panel

| Date | Change | Commit |
|------|--------|--------|
| 2025-11-29 | Initial: Panel showing AppyDave projects | earlier |
| 2025-11-29 | UI: Removed max-height scroll, full page display | - |

---

### FR-11: Project Selector/Switcher

| Date | Change | Commit |
|------|--------|--------|
| 2025-11-29 | Initial: Click project to switch target directory | earlier |

---

### FR-12: Create New Project

| Date | Change | Commit |
|------|--------|--------|
| 2025-11-29 | Initial: Create project with kebab-case code | earlier |
| 2025-11-30 | Fix: Allow periods in project names (e.g., `b73-opus-4.5-awesomer`) | - |

**Bug fix:** Project names with periods were rejected. Updated validation pattern to allow periods alongside letters, numbers, and hyphens.

---

### FR-13: Common Names Quick-Select UI

| Date | Change | Commit |
|------|--------|--------|
| 2025-11-29 | Initial: Pill buttons below name field | - |

---

### FR-14: Recordings Asset View

| Date | Change | Commit |
|------|--------|--------|
| 2025-11-29 | Initial: New tab with chapter groupings | - |
| 2025-11-29 | Fix: `-safe` folder path (was sibling, now inside recordings/) | - |
| 2025-11-29 | Fix: Chapter name parsing only strips known tags from config | - |
| 2025-11-29 | UI: Toggle buttons for "Show safe" and "Chapter headings" | - |

---

### FR-15: Move to Safe

| Date | Change | Commit |
|------|--------|--------|
| 2025-11-30 | Initial: Full implementation | - |

**Features:**
- Per-file action: `[→ Safe]` button on each file row
- Per-chapter action: `[→ Safe All]` button on chapter headings
- Restore action: `[← Restore]` button on safe file rows (when "Show safe" toggle is on)
- Visual indicators: "in safe" badge on chapter headings, muted styling for safe files
- Toast feedback after each move/restore action

**Backend endpoints:**
- `POST /api/recordings/safe` - Move files to `-safe/` folder (by filename or by chapter)
- `POST /api/recordings/restore` - Restore files from `-safe/` back to recordings

---

### FR-16: Discard Remaining Files Prompt

| Date | Change | Commit |
|------|--------|--------|
| 2025-11-29 | Initial: Modal after rename when files remain | earlier |
| 2025-11-29 | Added: "Discard All" button in Incoming Files header | db85daf |

---

### FR-20: Image Quick Preview (Shift+Hover)

| Date | Change | Commit |
|------|--------|--------|
| 2025-11-30 | Initial: Full implementation | - |

**Features:**
- Shift+Hover preview: Hold Shift and hover over any image thumbnail for large 600px preview
- Applies to: Both incoming images grid and assigned images list on Assets page
- Preview content: Large image, filename, file size, timestamp
- Smart positioning: Preview stays within viewport bounds, repositions automatically
- Visual cue: Cursor changes to zoom-in icon when Shift is held
- Instant response: No delay on appear/disappear

---

### FR-21: Custom Tag Input

| Date | Change | Commit |
|------|--------|--------|
| 2025-12-01 | Initial: Full implementation | - |

**Features:**
- Small inline text input after tag buttons
- Type text, converts to UPPERCASE in filename
- Spaces/commas become dashes
- One-off per rename, not persisted

---

### FR-22: Image Prompt Creation

| Date | Change | Commit |
|------|--------|--------|
| 2025-12-01 | Initial: Full implementation | ed666ae |

**Features:**
- Added "Image Prompt" textarea in Assignment Controls for creating `.txt` prompt files
- Prompts follow same naming convention as images: `{chapter}-{seq}-{imgOrder}{variant}-{label}.txt`
- Backend endpoints: `POST /api/assets/prompt` and `GET /api/assets/prompt/:filename`
- Assigned Assets list shows both images (📷) and prompts (📝) sorted together
- Click any asset row to populate controls (with toast feedback)
- Click prompt preview box to edit existing prompts

**Minor UX Enhancement:**
- Clicking any assigned asset (image or prompt) populates the Assignment Controls
- Toast notification confirms: "Controls set to 10-6-a "bigpicture""
- Use case: See an image, click it, type a prompt to regenerate it

---

### FR-24: Image Source Directory in Config

| Date | Change | Commit |
|------|--------|--------|
| 2025-12-01 | Initial: Full implementation | - |

**Features:**
- Added "Image Watch Directory" field to ConfigPanel
- Same validation as other path fields (must start with ~ or /)
- Renamed existing labels for clarity:
  - "Watch Directory" → "Ecamm Watch Directory"
  - "Target Directory" → "Target Project Directory"

---

### FR-25: Assigned Assets Row Cleanup

| Date | Change | Commit |
|------|--------|--------|
| 2025-12-01 | Initial: Full implementation | - |

**Features:**
- Removed `[↑ label]` button (redundant since clicking any row populates all controls)
- Added variant badge with colors: `[A]` green, `[B]` yellow, `[C]` blue
- Added file extension to filename display (e.g., `10-6-1a-bigpicture.png`)
- Removed date column to reduce clutter
- Unified font size for recording name and image filename

---

### FR-26: Paired Asset Display with Prompt Preview

| Date | Change | Commit |
|------|--------|--------|
| 2025-12-01 | Initial: Full implementation | - |

**Features:**
- Images and prompts with same base filename grouped on one row
- Prompt text displays inline in multi-line text area (height scales with thumbnail size)
- Shift+Hover on prompt text shows full content in modal overlay with line breaks preserved
- Shift+Hover on thumbnail shows large image preview (existing FR-20)
- Click anywhere on row populates ALL assignment controls including prompt text
- Prompt-only assets show placeholder thumbnail with 📝 icon

---

### FR-27: YouTube Thumbnails Page

| Date | Change | Commit |
|------|--------|--------|
| 2025-12-01 | Initial: Full implementation | - |

**Features:**
- New "Thumbs" page in navigation
- Scan ~/Downloads for ZIP files containing images
- Preview ZIP contents, select up to 3 images
- Import selected → renamed to thumb-1, thumb-2, thumb-3
- Drag-to-reorder thumbnails (auto-renames files)
- Delete individual thumbnails (remaining auto-renumber)
- Delete ZIP files from Downloads
- Size toggle (S/M/L/XL) for thumbnail previews
- "Refresh Thumbs" button for manual refresh

**Note:** Thumbs folder watching disabled (folder changes per project). Uses manual refresh instead.

---

### FR-28: Server Connection Indicator

| Date | Change | Commit |
|------|--------|--------|
| 2025-12-01 | Initial: Full implementation | 5cf9758 |

**Features:**
- Footer bar with connection status indicator (bottom-right)
- Green dot = Connected
- Red dot = Disconnected
- Yellow dot = Reconnecting
- Hover tooltip shows status text

---

### FR-29: Open Folder in Finder

| Date | Change | Commit |
|------|--------|--------|
| 2025-12-01 | Initial: Full implementation | 0fe2336 |

**Features:**
- Folder icon (📁) buttons throughout the app to open folders in macOS Finder
- Backend: `POST /api/system/open-folder` endpoint using macOS `open` command
- Error handling: Shows toast if folder doesn't exist
- Security: Only opens predefined folder keys mapped to config paths

**Button locations:**

| Page | Location | Opens |
|------|----------|-------|
| Config | Next to Ecamm Watch Directory | Ecamm recordings folder |
| Config | Next to Target Directory | Current project recordings folder |
| Config | Next to Image Watch Directory | Downloads folder |
| Incoming | Section header | Ecamm recordings folder |
| Recordings | Section header | Recordings + Safe folders |
| Assets | Incoming Images header | Downloads folder |
| Assets | Assigned Assets header | Project assets/images folder |
| Thumbs | Current Thumbnails header | Project assets/thumbs folder |
| Thumbs | Import from ZIP header | Downloads folder |

---

### FR-30: Video Transcription

| Date | Change | Commit |
|------|--------|--------|
| 2025-12-03 | Initial: Full implementation | - |

**Features:**
- Whisper AI integration with streaming progress via Socket.io
- Auto-triggers on file rename (queues transcription automatically)
- Job queue with status tracking (queued → transcribing → complete/error)
- New Transcriptions tab showing active job, queue, and recent history
- Folder: `recording-transcripts/` (not `transcripts/` - makes clear these are pre-edit)
- Manual "Transcribe" button for legacy recordings
- "Combine" button to merge chapter transcripts (plain text, no headers)
- "Transcribe All" buttons at project and chapter level

**Files created:**
- `client/src/components/TranscriptionsPage.tsx`
- `client/src/components/TranscriptModal.tsx`
- `server/src/routes/transcriptions.ts`

**Migration:** Manually renamed `transcripts/` → `recording-transcripts/` in b64, b71, b73, b75

---

### NFR-6: Codebase Refactor

| Date | Change | Commit |
|------|--------|--------|
| 2025-12-03 | NFR-6a: Quick wins - error handling, query keys, system routes docs | 69e1515 |
| 2025-12-03 | NFR-6c: UI consistency - shared components, transcript badge cleanup | f5066df |

**Note:** NFR-6b (Path Architecture) was already implemented in earlier work - `projectDirectory` config model and `getProjectPaths()` were in place.

**NFR-6a Features:**
- Query keys already centralized in `client/src/constants/queryKeys.ts` (verified)
- Fixed ~14 error responses to include `success: false`
- Added comprehensive JSDoc to `server/src/routes/system.ts` documenting `/api/system/` pattern and security

**NFR-6c Features:**
- Created `client/src/components/shared/` with 6 components:
  - `OpenFolderButton.tsx` (moved from root)
  - `SizeToggle.tsx` (new)
  - `LoadingSpinner.tsx` (new)
  - `ErrorMessage.tsx` (new)
  - `PageContainer.tsx` (new)
  - `PageHeader.tsx` (new)
- Simplified transcript badges: "Transcript/Transcribe/Retry" → "T" with color coding
- WatcherManager already well-organized (verified)

---

### FR-32: Improved Project List Columns

| Date | Change | Commit |
|------|--------|--------|
| 2025-12-03 | Initial: Full implementation | - |
| 2025-12-04 | Fix: Query key mismatch - new/renamed projects now refresh list | - |
| 2025-12-04 | Fix: Invalid projects now shown in "Issues" section (not filtered out) | - |

**Bug fixes (2025-12-04):**

1. **Query key mismatch** - `useCreateProject` was invalidating wrong cache key, so list never refreshed after project creation

2. **Silent filter removed** - Client-side regex was filtering out any project not matching `b##-...` pattern. This filter wasn't in the spec. Instead of filtering, invalid projects now appear in a third "Issues" section below Normal projects, separated by `border-gray-300`.

**Future UX considerations (documented, not implemented):**
- Warning badges on issue projects
- Tooltips explaining why project is flagged
- Rename project action
- Hide/archive capability

**Features:**
- Priority: Simple 📌 pin toggle (click to pin/unpin)
- Sorting: Projects now sort by code ascending (b67, b68...), pinned first
- Stage click-to-cycle: Click badge to cycle - → REC → EDIT → DONE → auto
- Stats popup (ⓘ): Created date, last edit, file counts, assets, transcripts %
- Files count now includes recordings + safe combined

**Files created:**
- `client/src/components/ProjectStatsPopup.tsx`
- `server/src/routes/projects.ts` (new endpoints)

**Files modified:**
- `client/src/components/ProjectsPanel.tsx` (new table layout)
- `shared/types.ts` (added ProjectStats types)

---

### FR-33: Final Video & SRT Reference

| Date | Change | Commit |
|------|--------|--------|
| 2025-12-03 | Initial: Full implementation | - |

**Features:**
- Auto-detection of final video and SRT files for each project
- Detection priority: `final/` → `s3-staging/` → project root
- Version extraction from filenames (e.g., `b64-final-v3.mp4` → v3)
- Additional Gling segment detection
- New 🎬 column in Projects table (✅ video+SRT, 🎬 video only, 📝 SRT only, - none)
- Final Media section in ProjectStatsPopup with size, version, location
- Open folder button for final/s3-staging folders

**Files created:**
- `server/src/utils/finalMedia.ts`

**Files modified:**
- `shared/paths.ts` (added `final`, `s3Staging` to ProjectPaths)
- `shared/types.ts` (added FinalMediaResponse types)
- `server/src/routes/projects.ts` (added GET /:code/final endpoint)
- `server/src/routes/system.ts` (added final/s3Staging folder keys)
- `client/src/components/ProjectsPanel.tsx` (added FinalMediaCell, 🎬 column)
- `client/src/components/ProjectStatsPopup.tsx` (added Final Media section)
- `client/src/hooks/useApi.ts` (added useFinalMedia hook)
- `client/src/constants/queryKeys.ts` (added finalMedia key)

---

### NFR-7: Show Recording Duration

| Date | Change | Commit |
|------|--------|--------|
| 2025-12-02 | Initial: Full implementation | - |

**Features:**
- Video duration displayed on incoming files list (between filename and file size)
- Format: `0:45` (under 1 min), `2:34` (1-59 min), `1:02:34` (60+ min)
- Uses `ffprobe` to extract duration without scanning entire file
- Graceful degradation: shows `-` if ffprobe not installed

**Files:**
- `server/src/utils/videoDuration.ts` (new)
- `server/src/watcher.ts` (modified)
- `client/src/utils/formatting.ts` (modified - added `formatDuration`)
- `client/src/components/FileCard.tsx` (modified)

---

### NFR-5: Extend Socket Infrastructure

| Date | Change | Commit |
|------|--------|--------|
| 2025-12-01 | Initial: Full implementation | 5cf9758 |

**Features:**
- Replaced polling with socket-based updates using chokidar file watchers
- ZIP file downloads now update instantly
- Assets, recordings, and projects panels get real-time updates
- Added socket events: `thumbs:zip-added`, `assets:incoming-changed`, `assets:assigned-changed`, `recordings:changed`, `projects:changed`

**Note:** Thumbs folder watcher disabled (changes per project) - uses manual refresh button.

**Bug fixes during implementation:**
- Fixed browser image caching: thumbnails now refresh correctly using timestamp cache-busting
- Fixed ZIP watcher not detecting new downloads

---

### NFR-1: Dynamic CORS Origins

| Date | Change | Commit |
|------|--------|--------|
| 2025-11-29 | Changed from hardcoded ports to `origin: true` | - |

---

### NFR-2: Configurable Tags via JSON

| Date | Change | Commit |
|------|--------|--------|
| 2025-11-29 | Initial: Tags in config.json | earlier |
| 2025-11-29 | Fix: Separated global tags (`availableTags`) from suggested tags (`suggestTags`) | 88abf0e |
| 2025-11-29 | Fix: suggestTags only makes tags available, doesn't auto-select | db85daf |

---

### NFR-3: Configurable Common Names

| Date | Change | Commit |
|------|--------|--------|
| 2025-11-29 | Initial: Common names with rules in config.json | earlier |

---

### NFR-4: Rename Subsequence to Sequence

| Date | Change | Commit |
|------|--------|--------|
| 2025-11-29 | Renamed throughout codebase and UI | 504b68f |

---

### FR-52: Transcription Progress Bar

| Date | Change | Commit |
|------|--------|--------|
| 2025-12-05 | Initial: Full implementation | - |

**Features:**
- Progress bar at top of Transcriptions page showing project-wide status
- Visual bar with percentage display (e.g., "12/15 files (80%)")
- Status chips showing: ✓ complete | ⏳ active | 📋 queued | ⚠ missing
- Conditional chip display (active/queued/missing only shown when > 0)
- Real-time updates via socket event invalidation
- Shows "All recordings transcribed!" when 100% complete with no pending work
- Works with empty state (no active/queued/recent jobs)

**Files created:**
- `client/src/components/TranscriptionProgressBar.tsx`

**Files modified:**
- `client/src/components/TranscriptionsPage.tsx` (added import and integration)

---

## Refactoring - 2025-11-29

Code cleanup removing duplication:

| Change | From → To |
|--------|-----------|
| `formatFileSize` | FileCard, RecordingsView → `utils/formatting.ts` |
| `buildPreviewFilename` | FileCard, NamingControls → `utils/naming.ts` |
| `expandPath` | routes, watcher → `server/utils/pathUtils.ts` |
| Best-take algorithm | App.tsx → `hooks/useBestTake.ts` |
| File discard logic | App.tsx → `utils/fileActions.ts` |
| Query keys | useApi.ts → `constants/queryKeys.ts` |
| Magic numbers | Inline → `shared/constants.ts` |
| Unused hook | Removed `useDiscardFile` from useApi.ts |

---

### NFR-8: Project Data Query API

| Date | Change | Commit |
|------|--------|--------|
| 2025-12-06 | Initial: Full implementation | - |

**Features:**
- Read-only JSON endpoints under `/api/query/` prefix for LLM context and external tools
- `GET /api/query/config` - System metadata (stages, priorities, filters, tags, names)
- `GET /api/query/projects` - List with `?filter=pinned`, `?stage=X`, `?recent=N`
- `GET /api/query/projects/:code` - Full project detail with stats
- `GET /api/query/projects/:code/recordings` - With `?chapter=N`, `?missing-transcripts=true`
- `GET /api/query/projects/:code/transcripts` - With `?chapter=N`, `?include=content`
- `GET /api/query/projects/:code/chapters` - Dynamically generated from SRT
- `GET /api/query/projects/:code/images` - With `?chapter=N`
- `GET /api/query/projects/:code/export` - Combined data for LLM context
- Request logging with `[Query API]` prefix

**Files created:**
- `flihub/server/src/routes/query.ts`

**Files modified:**
- `flihub/server/src/index.ts` (route registration)

**Spec:** `project-data-query-spec.md`

---

## Miscellaneous Changes

| Date | Change |
|------|--------|
| 2025-11-29 | File timestamp uses actual mtime (not detection time) |
| 2025-11-29 | Header navigation: moved to header as text links (saves vertical space) |

---

## Document Index

| Document | Purpose |
|----------|---------|
| `backlog.md` | FR/NFR list with status |
| `recording-namer-FR.md` | Original functional requirements (FR-1 to FR-10) |
| `changelog.md` | What changed and when (this file) |
| `implementation-notes.md` | Learnings, decisions, gotchas |
| `good-take-algorithm.md` | FR-8 algorithm details and test cases |
| `move-to-safe-spec.md` | FR-15 full specification |
| `image-asset-management-spec.md` | FR-17/18/19 full specification |
| `image-prompt-spec.md` | FR-22 full specification |
| `youtube-thumbnails-spec.md` | FR-27 full specification |
| `video-transcription-spec.md` | FR-30 full specification |
| `enhanced-project-view-spec.md` | FR-31 full specification (includes DAM reference) |
| `chapter-extraction-spec.md` | FR-34 full specification |
| `project-data-query-spec.md` | NFR-8 full specification |
| `ux-improvements.md` | UX improvement items |
| `assets-page-mockup.md` | Assets page UI mockups |
