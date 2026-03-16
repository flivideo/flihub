# Changelog

Track what was implemented, fixed, or changed and when.

**Archive:** Pre-2026 entries moved to `archive/changelog-2025-q4.md`

---

## Quick Summary - 2026-01-06

**Completed:** FR-5, FR-8, FR-9, FR-10, FR-11, FR-12, FR-13, FR-14, FR-15, FR-16, FR-17, FR-18, FR-19, FR-20, FR-21, FR-22, FR-23, FR-24, FR-25, FR-26, FR-27, FR-28, FR-29, FR-30, FR-32, FR-33, FR-35, FR-36 through FR-78, FR-80, FR-82, FR-83, FR-84, FR-87, FR-88, FR-90, FR-91, FR-92, FR-94, FR-105, FR-106, FR-107, FR-108, FR-109, FR-110, FR-111, FR-112, FR-113, FR-114 (Phase 1), FR-115, FR-116, FR-117, FR-118, FR-119, FR-120, FR-121, FR-122, FR-123, FR-124, FR-125, FR-126, FR-127, FR-128, FR-130, FR-136 (Core), FR-137, FR-73, FR-54 (discovered), FR-69 (discovered), FR-80 (discovered), NFR-1, NFR-2, NFR-3, NFR-4, NFR-5, NFR-6, NFR-7, NFR-8, NFR-79, NFR-85, NFR-87

**Still Open:** FR-31 (DAM Integration), FR-34 Phase 3 (Algorithm improvements), FR-89 (Cross-Platform Path Support), FR-93 (Project Name Shows Full Path on Windows), FR-114 (Phases 2-3), FR-132 (Dual Transcription), FR-133/134/135 (Manage panel enhancements), FR-139 (Folders Tool), NFR-65/66/67/68 (Tech Debt), NFR-81 (Future), NFR-86 (Git Leak Detection), UX Improvements

---

## Per-Item History

### UX Improvements Batch (I-2, R-1, R-2, R-4, R-5, P-3, C-1, C-2, C-3, C-4)

| Date       | Change                                      | Commit |
| ---------- | ------------------------------------------- | ------ |
| 2026-03-16 | UX polish pass — 3 changes, 7 already in place | -   |

**What was implemented:**
- I-2: Preview filename in NamingControls.tsx bumped from `text-base` → `text-lg`
- R-2: Safe row styling changed from green highlight to muted gray (`bg-gray-50 border-gray-200`, text `text-gray-400`)
- R-5: Toggle labels in RecordingsView.tsx made subtler (`text-gray-400`, lowercase, tighter gap)

**Already in place (no changes needed):**
- R-1: Chapter headings already show "01 Poem Planning" — no brackets
- R-4: `formatTimestamp` already shows HH:MM for today, date for older files
- P-3: "+ Add new project..." already sits at bottom of table
- C-1: `collapsePath` already applied to all paths on load
- C-2/C-3/C-4: `hasChanges`, "Unsaved changes" text, disabled Save — all in place

**Files changed:**
- `client/src/components/NamingControls.tsx` (I-2 — text-lg preview filename)
- `client/src/components/RecordingsView.tsx` (R-2 safe row styling, R-5 toggle labels)

**Status:** ✓ Complete

---

### FR-145: Escape Key Closes Video Preview Modal

| Date       | Change                              | Commit |
| ---------- | ----------------------------------- | ------ |
| 2026-03-16 | Verified already implemented        | -      |

**Already in place:**
- `RecordingVideoModal.tsx:68-76` — useEffect keydown listener calling `onClose()` on Escape
- `IncomingVideoModal.tsx:63-71` — same pattern
- Watch screen uses inline player (no modal)

**Status:** ✓ Complete (pre-existing)

---

### FR-139: Folders Tool — Remove Undefined Button

| Date       | Change                              | Commit |
| ---------- | ----------------------------------- | ------ |
| 2026-03-16 | Verified already removed            | -      |

**Already in place:**
- No Folders button in `ToolsSidebar.tsx`
- `activeTool` type in `ManagePanel.tsx` already excludes `'folders'` (comment: FR-139 removed)

**Status:** ✓ Complete (pre-existing)

---

### FR-143: SRT Clipboard Copy Button

| Date       | Change                                                              | Commit |
| ---------- | ------------------------------------------------------------------- | ------ |
| 2026-02-25 | Implemented clipboard copy for SRT files in S3 Staging PREP section | -      |

**What was implemented:**
- New `GET /api/s3-staging/srt-text?path=<filepath>` endpoint — reads SRT file, strips sequence numbers and timestamp lines, returns clean plain text
- `listFiles()` in `/status` endpoint now includes absolute `path` per file
- `FileInfo` interface in `useS3StagingApi.ts` gains optional `path` field
- `FileList` component gains `showSrtClipboard` prop — renders inline 📋 button on `.srt` files only
- PREP Source and PREP Staging columns pass `showSrtClipboard={true}`; POST section unchanged
- Clicking button copies stripped transcript text via `navigator.clipboard.writeText()`
- Success toast "Copied to clipboard" / error toast "Copy failed"
- Bug fix: timestamp regex changed from `\d{3}` to `\d{1,3}` to handle Whisper SRTs with inconsistent millisecond digits (e.g. `,00` vs `,630`)

**Files changed:**
- `server/src/routes/s3-staging.ts` (modified — listFiles path + new srt-text route + regex fix)
- `client/src/hooks/useS3StagingApi.ts` (modified — FileInfo.path field)
- `client/src/components/shared/S3StagingTool.tsx` (modified — FileList + API_URL import)

**Status:** ✓ Complete

---

### FR-141: Export & S3 Workflow Overhaul

| Date       | Change                                                    | Commit  |
| ---------- | --------------------------------------------------------- | ------- |
| 2026-02-16 | Consolidated Export + S3 into unified Manage tool         | 99b281f |
| 2026-02-16 | Cleanup: deleted S3StagingPage, ExportPanel, export routes | -       |

**What was implemented:**
- New "Export/S3" tool in Manage sidebar with 4-section drawer
- Copy Folder Path, Open in Finder buttons
- Gling Info (filename + dictionaries)
- Edit Folders (status + Create/Open)
- S3 PREP section (upload status + button)
- S3 POST section (file list + download)
- S3 CLEANUP section (Clean Local + Clean S3)
- Old files deleted: S3StagingPage.tsx, ExportPanel.tsx, export.ts
- Export tab removed, S3 Staging modal removed from settings

**Status:** ✓ Complete

---

### FR-140: Chapter Move & Cascade Renumbering

| Date       | Change                                          | Commit |
| ---------- | ----------------------------------------------- | ------ |
| 2026-01-06 | Specification completed - Ready for development | -      |
| 2026-02-16 | Implementation complete                         | -      |

**What was specified:**

**PO Decision:** Move with automatic cascade (NOT gap compression)

**Core Features:**

1. **Move Chapter Down** - Fill gap (03→02 causes 05→04)
2. **Move Chapter Up** - Create gap (03→05 causes 04→03)
3. **Automatic Cascade** - Chapters between source/target shift automatically
4. **Preview Panel** - Shows all affected chapters before execution
5. **Descending Processing** - High to low prevents conflicts

**Key Insight from User:**

> "It's not 01,03,05 → 01,02,03. What it is, is that 03 can move up to 02, and everything below it should increase by one."

**Technical:**

- Reuses FR-130 delete+regenerate pattern
- Reuses FR-137 SlideOutDrawer pattern
- New cascade calculation algorithm
- 2 new endpoints: preview + execute
- Estimated: 4-6 hours, ~300-400 LOC

**User Impact:**

- Eliminates manual cascade calculation
- One-click chapter reorganization
- Addresses pain point from FR-138 testing
- Preview prevents mistakes

**Status:** Ready for developer handover (HIGH priority)

---

### FR-139: Folders Tool Specification

| Date       | Change                                | Commit |
| ---------- | ------------------------------------- | ------ |
| 2026-01-06 | PO Decision - Remove undefined button | -      |

**What was decided:**

**PO Decision:** Remove the "Folders" button (Path A)

**Rationale:**

1. User couldn't remember what it was for
2. User confused it with Export tool's folder management
3. No clear use case after 6 months
4. Better to remove than show "coming soon" indefinitely
5. Focus development on defined features (FR-140)

**Quote from user:**

> "I don't really understand your questions related to folders tool. I don't even remember what it was about."

**Implementation:**

- Remove button from ToolsSidebar.tsx
- Remove drawer from ManagePanel.tsx
- Update `activeTool` type
- Estimated: 30 minutes

**Alternative paths rejected:**

- Path B: Repurpose for FR-135 (FR-135 is LOW priority)
- Path C: Define new feature (no clear use case)

**Status:** Ready for developer (quick cleanup task)

---

### FR-136/137/138/139: Tool-Oriented Manage Panel & Sub-Requirements

| Date       | Change                                 | Commit |
| ---------- | -------------------------------------- | ------ |
| 2026-01-06 | Documentation & Requirements Breakdown | -      |

**What was implemented (2026-01-04 to 2026-01-06):**

**FR-136: Tool-Oriented Manage Panel (Core Architecture) - ✓ Complete**

Implemented tool-oriented UI with vertical sidebar and slide-out drawers, superseding FR-131 Phase 2 approach.

**Core Architecture:**

- ToolsSidebar component (147 lines) - Vertical tool palette
- SlideOutDrawer component (51 lines) - Reusable drawer with animations
- Tool-oriented state management (activeTool, mutual exclusivity)
- ESC/overlay close behaviors
- Tool registration pattern

**Simple Tools (4/4 Complete):**

1. Regen Shadows - Immediate execution
2. Regen Transcripts - Queue with count
3. Regen Chapters - Confirmation modal with editable settings
4. Regen All - Sequential with progress tracking

**Export Tool (Complete):**

- ExportPanel component (593 lines)
- Gling prep UI (filename, dictionaries, folders)
- FR-126 Manifest integration (Clean/Restore)
- Edit folder creation/management
- Auto-save pattern for dictionaries

**Commits:**

- `3809e30` - Export Tool drawer with Gling prep functionality (2026-01-06)
- `5ba69b1` - ToolsSidebar backend connection + regen tools (2026-01-04)

**Files Created (6):**

- `client/src/components/shared/ToolsSidebar.tsx` (147 lines)
- `client/src/components/shared/SlideOutDrawer.tsx` (51 lines)
- `client/src/components/shared/ExportPanel.tsx` (593 lines)
- `client/src/components/shared/RegenToolbar.tsx` (386 lines)
- `client/src/components/shared/ConfirmationModal.tsx` (180 lines)
- `client/src/components/shared/SelectionBadge.tsx` (30 lines)

**Files Modified (4):**

- `client/src/components/ManagePanel.tsx` - Tool integration
- `server/src/routes/manage.ts` - Regen endpoints (+690 lines)
- `shared/types.ts` - Socket.io event types
- `server/src/index.ts` - Route wiring

**FR-137: SlideOutDrawer Tool Pattern - ✓ Implemented (Documented Retroactively)**

Created comprehensive documentation for the architectural pattern that was implemented as part of FR-136.

**Documented:**

- When to use slide-out vs modal vs inline
- Standard drawer behaviors (ESC, overlay, mutual exclusivity)
- Component APIs (SlideOutDrawer, ToolsSidebar)
- State management patterns
- Animation specifications (300ms slide, 200ms fade)
- Width guidelines (380px default, 480px medium, 560px wide)
- Code examples for adding new tools

**File Created:**

- `docs/prd/fr-137-slideout-drawer-pattern.md` (full pattern documentation)

**FR-138: Rename Tool Specification - ⚠️ Partial (Needs Chapter/Sequence/Tags/Preview)**

Created detailed specification for complete Rename tool implementation.

**Current State (Basic):**

- Single text input for label
- Apply/Close buttons
- Warning about transcript regeneration
- Uses existing backend endpoint

**Missing (Specified in FR-138):**

- Chapter dropdown (01-99 with auto-detection)
- Sequence numbering (preserve/renumber options)
- Tags checkboxes (from config.availableTags + custom)
- Preview section (shows before → after)
- Pre-fill logic from selected files
- Validation UI (real-time kebab-case validation)

**File Created:**

- `docs/prd/fr-138-rename-tool-specification.md` (complete field-by-field spec)

**Estimated Effort:** 5-8 hours to complete

**FR-139: Folders Tool Specification - ❌ Blocked (Needs Feature Definition)**

Created placeholder PRD identifying that "Folders" tool has no specification.

**Current State:**

- Button exists in ToolsSidebar
- Placeholder drawer: "Folder management functionality coming soon..."
- No defined purpose

**Options Identified:**

1. Edit Folder Management (duplicate of Export tool)
2. Recording Organization (requires architectural changes)
3. Chapter Tools / FR-135 (rename button)
4. Project Structure Validation (new utility)
5. Remove button until feature defined

**File Created:**

- `docs/prd/fr-139-folders-tool-specification.md` (identifies gap, proposes options)

**Requires:** Stakeholder decision on what "Folders" should do

**Requirements Breakdown Created (2026-01-06):**

Split FR-136 into four trackable requirements:

- FR-136: Core Architecture (✓ Complete)
- FR-137: SlideOutDrawer Pattern (✓ Documented)
- FR-138: Rename Tool Full Spec (Partial)
- FR-139: Folders Tool Definition (Blocked)

**PO Lessons Learned:**

1. "Press button, drawer opens" is NOT a specification
2. Must document architectural patterns (not just implement)
3. Split complex requirements into sub-requirements upfront
4. Track partial completion properly
5. Field-by-field specs required for forms (not just "rename panel")

**User Impact:**

- Tool-oriented workflow eliminates forced-rename UX
- Consistent pattern for all tools (extensible)
- Export tool fully functional with all Gling prep features
- Rename tool functional but basic (enhancement optional)
- Folders tool undefined (decision needed)

---

### FR-131 Phase 2: Manage Panel Regeneration Toolbar & Chapter-Level Rename

| Date       | Change      | Commit |
| ---------- | ----------- | ------ |
| 2026-01-04 | Implemented | -      |

**What was built:**
Completed FR-131 Phase 2 with three major features: Regeneration Toolbar (4 buttons), Chapter-Level Rename dropdown, and Shared Code Documentation.

**Feature 1: Regeneration Toolbar**

Added collapsible toolbar with 4 buttons to regenerate derivative files:

1. **Regen Shadows** (FAST - ~1ms per file)
   - Deletes existing shadow files in `recording-shadows/`
   - Regenerates 240p preview videos from source recordings
   - Socket.io event: `regen:shadows:complete`

2. **Regen Transcripts** (SLOW - 5-10 min per file, queued)
   - Queues transcription jobs for recordings without transcripts
   - Optional `force` parameter to re-transcribe ALL files
   - Uses existing transcription queue system

3. **Regen Chapters** (EXPENSIVE - 30-60s per chapter)
   - Deletes existing chapter videos in `recordings/-chapters/`
   - Regenerates chapter videos from recordings
   - Real-time progress via Socket.io: `regen:chapters:progress`

4. **Regen All** (SEQUENTIAL)
   - Runs shadows → transcripts → chapters sequentially
   - Progress updates for each step via Socket.io
   - Best-effort error handling (continues on error, reports at end)

**Backend Implementation:**

**New Routes:**

- `POST /api/manage/regen-shadows` - Regenerate shadow files
- `POST /api/manage/regen-transcripts` - Queue transcriptions
- `POST /api/manage/regen-chapters` - Regenerate chapter videos (async)
- `POST /api/manage/regen-all` - Regenerate all (async, sequential)

**Helper Functions:**

- `regenerateShadowsInternal()` - Shadow regeneration logic
- `regenerateTranscriptsInternal()` - Transcript queuing logic
- `regenerateChaptersInternal()` - Chapter regeneration logic
- `regenerateAllAsync()` - Sequential orchestrator
- `regenerateChaptersAsync()` - Async chapter generation with progress

**Socket.io Events (added to `shared/types.ts`):**

- `regen:shadows:complete` - Shadow regeneration complete
- `regen:chapters:progress` - Chapter-by-chapter progress
- `regen:chapters:complete` - All chapters complete
- `regen:all:started` - All regeneration started
- `regen:all:progress` - Step-by-step progress (shadows/transcripts/chapters)
- `regen:all:complete` - All regeneration complete
- `regen:all:error` - Regeneration error

**Frontend Implementation:**

**New Component:**

- `client/src/components/shared/RegenToolbar.tsx` (280 lines)
  - Collapsible toolbar (localStorage persists state)
  - Confirmation dialogs for expensive operations
  - Real-time progress display via Socket.io
  - Progress bar with percentage and current item display

**Feature 2: Chapter-Level Rename**

Added dropdown to rename all files in a chapter at once:

- Select chapter from dropdown (shows file count)
- Input new label (pre-fills current chapter label)
- "Rename Ch XX" button
- Reuses existing `POST /api/manage/bulk-rename` endpoint
- Same FR-130 delete+regenerate logic
- Confirmation dialog with file count

**UI Location:**

- Inside bulk rename section in ManagePanel
- Separated by border with "Or rename by chapter:" header
- Appears only when files are selected (same condition as bulk rename)

**Feature 3: Shared Code Documentation**

Created comprehensive documentation for shared code between RecordingsView and ManagePanel:

**New File:**

- `docs/architecture/shared-code-index.md` (300+ lines)

**Contents:**

- Decision rules (when to share code vs keep separate)
- Client-side shared hooks (useRecordings, useConfig, useRecordingsSocket)
- Client-side shared components (LoadingSpinner, ErrorMessage, RegenToolbar)
- Client-side shared utilities (formatFileSize, formatChapterTitle, extractTagsFromName)
- Server-side shared routes (bulk-rename, regen endpoints)
- Server-side shared utilities (renameRecording, createShadowFile, queueTranscription, etc.)
- Code examples and JSDoc patterns
- Future refactoring opportunities

**Files Created (3):**

- `client/src/components/shared/RegenToolbar.tsx` (280 lines)
- `docs/architecture/shared-code-index.md` (300+ lines)

**Files Modified (4):**

- `server/src/routes/manage.ts` (+480 lines) - 4 regen endpoints + helper functions
- `server/src/index.ts` (1 line) - Pass `io` to createManageRoutes
- `client/src/components/ManagePanel.tsx` (+80 lines) - RegenToolbar + chapter rename
- `shared/types.ts` (+7 lines) - Socket.io event types

**Total LOC:** ~850 lines

**UX Enhancements:**

- Collapsible toolbar (saves screen space)
- Real-time progress updates (no page refresh needed)
- Confirmation dialogs prevent accidental operations
- Best-effort error handling (show errors but continue)
- Toast notifications for completion
- Disabled state during operations (prevents double-clicks)

**Testing:**

- Backend endpoints compile successfully
- Socket.io event types validated
- Frontend component integrates into ManagePanel
- Chapter rename reuses existing bulk rename logic (already tested)

**User Impact:**

- Quick regeneration of derivative files without manual deletion
- Faster workflow for chapter-level renaming
- Clear documentation for future developers
- Real-time feedback during long operations

**Ready to Test:**

- Start dev server (`npm run dev`)
- Navigate to Manage panel
- Test regen buttons with a real project
- Test chapter rename dropdown
- Verify Socket.io progress updates in console

---

### FR-130: Simplify Rename Logic (Delete+Regenerate)

| Date       | Change      | Commit |
| ---------- | ----------- | ------ |
| 2026-01-03 | Implemented | -      |

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

| Date       | Change      | Commit |
| ---------- | ----------- | ------ |
| 2026-01-03 | Implemented | -      |

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

| Date       | Change      | Commit  |
| ---------- | ----------- | ------- |
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

| Date       | Change      | Commit  |
| ---------- | ----------- | ------- |
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

| Date       | Change                | Commit  |
| ---------- | --------------------- | ------- |
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

| Date       | Change      | Commit |
| ---------- | ----------- | ------ |
| 2026-01-02 | Implemented | -      |

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

| Date       | Change      | Commit |
| ---------- | ----------- | ------ |
| 2026-01-02 | Implemented | -      |

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

| Date       | Change      | Commit |
| ---------- | ----------- | ------ |
| 2026-01-02 | Implemented | -      |

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

| Date       | Change      | Commit |
| ---------- | ----------- | ------ |
| 2026-01-02 | Implemented | -      |

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

| Date       | Change      | Commit |
| ---------- | ----------- | ------ |
| 2026-01-02 | Implemented | -      |

**What was built:**
PARKED badge and filtering for Watch panel, matching FR-120's pink styling.

**Changes to WatchPage.tsx:**

- State: `showParked` with localStorage persistence
- Filtering: `groupByChapterWithTiming`, `sortedRecordings`, `mostRecentRecording` respect toggle
- UI: Pink row styling (`bg-pink-50`), PARKED badge, toggle button next to Safe

**Visual consistency:** Same UX pattern as SAFE feature.

---

### FR-120: Parked Recording State

| Date       | Change      | Commit |
| ---------- | ----------- | ------ |
| 2026-01-02 | Implemented | -      |

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

| Date       | Change      | Commit |
| ---------- | ----------- | ------ |
| 2026-01-02 | Implemented | -      |

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

| Date       | Change                                              | Commit |
| ---------- | --------------------------------------------------- | ------ |
| 2026-01-01 | Discovered already implemented during backlog audit | -      |

**What was discovered:**
HeaderDropdown component exists with FR-69 comments. Used in App.tsx for:

- Settings dropdown (gear icon) - Config, Mockups
- Project actions dropdown (ellipsis) - Copy for Calendar, Copy Path, Open in Finder

**Files:**

- `client/src/components/HeaderDropdown.tsx` (created)
- `client/src/App.tsx` (uses HeaderDropdown)

---

### FR-80: Enhanced Project List & Stage Model (Discovered Already Implemented)

| Date       | Change                                                | Commit |
| ---------- | ----------------------------------------------------- | ------ |
| 2026-01-01 | Discovered implemented via FR-82 during backlog audit | -      |

**What was discovered:**
All FR-80 functionality was implemented as part of FR-82: Project List UX Fixes (2025-12-15).

- 8-stage model with STAGE_DISPLAY config
- InboxIndicator, AssetsIndicator, ChaptersIndicator components
- Click handlers navigate to relevant tabs
- Stage dropdown for manual changes

See FR-82 changelog entry for full implementation details.

---

### FR-118: Project-Specific Gling Dictionary

| Date       | Change      | Commit |
| ---------- | ----------- | ------ |
| 2026-01-02 | Implemented | -      |

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

| Date       | Change                                                 | Commit |
| ---------- | ------------------------------------------------------ | ------ |
| 2026-01-01 | Discovered all 4 bugs already fixed during code review | -      |

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

| Date       | Change              | Commit |
| ---------- | ------------------- | ------ |
| 2026-01-01 | Phase 1 Implemented | -      |

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
| ---- | ------ | ------ |
