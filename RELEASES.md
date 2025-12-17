# FliHub Release Notes

User-facing release history documenting the complete development journey.

**Versioning:** Semantic versioning (MAJOR.MINOR.PATCH)
- v0.x.x = Pre-1.0 development (evolving rapidly)
- Future v1.0.0 = Stable release (likely after BMAD rebuild)

**Note:** Git tracking began Dec 13. Earlier versions (v0.1.0-v0.6.0) are documented from changelog but cannot be git-tagged.

---

## Table of Contents

- [v0.13.0 - Edit Workflow](#v0130---edit-workflow-2025-12-17) (Dec 17)
- [v0.12.0 - Windows/WSL Support](#v0120---windowswsl-support-2025-12-16) (Dec 16)
- [v0.11.0 - Shadow System](#v0110---shadow-system-2025-12-15-pm) (Dec 15 PM)
- [v0.10.0 - Watch Page](#v0100---watch-page-2025-12-14-15) (Dec 14-15)
- [v0.9.0 - Inbox + Chapter Recordings](#v090---inbox--chapter-recordings-2025-12-14) (Dec 14)
- [v0.8.0 - Initial Git Commit](#v080---initial-git-commit-2025-12-13) (Dec 13)
- [Pre-Git History](#pre-git-history-nov-28---dec-12) (Nov 28 - Dec 12)

---

## v0.13.0 - Edit Workflow (2025-12-17)

**Theme:** Post-production collaboration with Jan

**Git Tag:** `v0.13.0` → `bddf922`

### What's New

- **First Edit Prep Page** - Prepare for Gling editing sessions
  - Copy Gling filename to clipboard (matches project code format)
  - Copy dictionary words for better Gling transcription
  - View all recordings with file sizes
  - Create `edits/prep/` folder with one click

- **S3 Staging Page** - Manage the editor collaboration workflow
  - **PREP section:** Your first edit files to send to Jan
  - **POST section:** Jan's edited versions received back (with SRT status warnings)
  - **PUBLISH section:** Select and promote final version (removes version suffix)
  - Sync files between `edits/prep/` and `s3-staging/prep/`

- **Clipboard Format Fix** - Project clipboard now produces `b85 > Clauding 01` format
  - Changed from `b85 - clauding-01`
  - Uses `>` separator and Title Case

### Learnings

- **Modal pattern established:** Cog menu → modal pages for workflow-specific tools
- **Edit workflow is multi-stage:** prep → staging → post → publish with clear folder structure
- **Light theme consistency:** All modals now use light theme

---

## v0.12.0 - Windows/WSL Support (2025-12-16)

**Theme:** Cross-platform support for Jan on Windows/WSL

**Git Tag:** `v0.12.0` → `9bba398`

### What's New

- **WSL Path Translation** - Folder open buttons now work on WSL
  - Automatically converts `/mnt/c/...` to `C:\...` for Windows Explorer
  - Uses `wslpath -w` for path conversion
  - Debug logging for troubleshooting

- **Environment Detection** - Config panel shows detected environment
  - Icons: 🍎 macOS, 🐧 Linux, 🪟 Windows/WSL
  - Path format guidance based on environment
  - Inline warnings when path format doesn't match

- **Recording Size Totals** - Header shows total recording + shadow size
- **Transcription Telemetry** - Logging timing for future predictions
- **Jan Agent** - Custom Claude command for Jan's workflow

### Fixes

- Project name no longer shows full path on Windows (FR-93)
- Transcription skip logic now works correctly (FR-92)
- Shadow generation hardcoded path bug (FR-97)
- Whisper output cleaned up - only TXT, SRT, JSON (FR-98)

### Learnings

- **WSL is a unique platform:** Neither pure Linux nor pure Windows
- **Centralized helpers pay off:** One `openInFileExplorer()` function = one fix covers all buttons
- **Telemetry enables prediction:** Collecting timing data for "estimated time remaining"

---

## v0.11.0 - Shadow System (2025-12-15 PM)

**Theme:** Enable collaboration without sharing large video files

**Git Tag:** `v0.11.0` → `23fb6ca`

### What's New

- **Shadow Recordings** - Lightweight `.txt` placeholders mirroring video files
  - Collaborators see project structure without 100GB+ video files
  - Ghost icon (👻) indicates shadow-only files
  - Shadow count column in project list
  - Auto-generated when recordings are renamed

- **Shadow Fallback** - Watch page automatically uses shadow video when real unavailable
- **GitHub Links** - Quick access to repos from cog menu
- **Cross-Platform Setup Guide** - Documentation for Jan/collaborators

### Learnings

- **Text shadows before video shadows:** Start simple, video shadows (240p) can come later
- **Folder naming convention:** `recording-shadows/` matches `recording-transcripts/`
- **Unified scanning:** Merge recordings + shadows seamlessly

---

## v0.10.0 - Watch Page (2025-12-14-15)

**Theme:** Video playback with synchronized transcripts

**Git Tag:** `v0.10.0` → `8a47d09`

### What's New

- **Watch Page** - Video playback with segment/chapter navigation
  - Play/Stop, Autoplay, Auto-Next controls
  - Size toggle (Normal/Large)
  - Segment list with duration and transcript status

- **Transcript Sync Highlighting** - Real-time word highlighting during playback
  - Word and Phrase modes (toggle, persists to localStorage)
  - Click any word to seek video
  - Auto-scroll to keep highlighted text visible

- **Chapter SRT Generation** - Combined SRT files for chapter videos
  - Timing offsets calculated from segment durations
  - Title slide duration included in calculations

- **Dual Transcript Output** - Whisper generates both TXT and SRT

- **Enhanced Project List** - 8-stage workflow, clickable indicators

### Learnings

- **SRT timing is cumulative:** Chapter videos need offset calculation from all preceding segments
- **Word-level timing is estimated:** Whisper provides phrase-level; words distributed evenly
- **Intersection Observer:** Track which chapter is currently visible for navigation

---

## v0.9.0 - Inbox + Chapter Recordings (2025-12-14)

**Theme:** Content staging and chapter video generation

**Git Tag:** `v0.9.0` → `e2ef9d0`

### What's New

- **Inbox Tab** - Stage incoming content before processing
  - Dynamic folder scanning (any folder in `inbox/` appears automatically)
  - Preferred sort: (root) → raw → dataset → presentation
  - Write API for programmatic file creation
  - Different from "Incoming Files" (which is Ecamm recordings)

- **Chapter Recordings** - Generate combined chapter videos from segments
  - Purple title slides with segment info
  - Configurable slide duration and resolution
  - Auto-generate option in config

- **File Viewer Modal** - Preview files from inbox
- **Renamed to FliHub** - From "Recording Namer"
- **Header Dropdowns** - Better navigation structure

### Learnings

- **Inbox ≠ Incoming:** Inbox is for staging any content; Incoming is specifically Ecamm recordings
- **Concat filter over demuxer:** Audio codec mismatches broke chapter videos until switched
- **Chapter grouping by number only:** Segment names vary; group by chapter number

---

## v0.8.0 - Initial Git Commit (2025-12-13)

**Theme:** First git-tracked version (bundles v0.1.0-v0.7.0)

**Git Tag:** `v0.8.0` → `da12b86`

### What This Represents

This is the first commit in the git repository, but it represents ~2 weeks of development from Nov 28 - Dec 13. All the features in v0.1.0 through v0.7.0 are included here.

### What's Included

Everything from the Pre-Git History (see below), plus:

- **FR-55: Video Transcript Export** - Combined transcript for entire video
- **FR-56: Chapter Navigation Panel** - Slide-out panel with chapter list
- **FR-57: Parallelize ffprobe** - 8-9s → 1s by parallelizing calls

### Why Start Here?

The earlier development happened in an experimental context. This commit represents the point where FliHub became "real enough" to track properly.

---

## Pre-Git History (Nov 28 - Dec 12)

These versions are documented from the changelog but cannot be git-tagged since they predate the repository.

---

### v0.7.0 - Query API (Dec 6-7)

**Theme:** LLM context endpoints for external tools

**Features:**
- Read-only JSON endpoints under `/api/query/` prefix
- `GET /api/query/projects`, `/api/query/projects/:code/recordings`, etc.
- ASCII text formatting with `?format=text` parameter
- DAM-style formatting: emoji indicators, human-readable sizes

**Learnings:**
- Separate read API from write API for safety
- ASCII format useful for CLI tools and LLM context

---

### v0.6.0 - Transcription (Dec 3-5)

**Theme:** Whisper AI integration

**Features:**
- Auto-transcribe on file rename (queued automatically)
- Job queue with status tracking (queued → transcribing → complete/error)
- New Transcriptions tab showing active job, queue, history
- Folder: `recording-transcripts/` (not `transcripts/`)
- Manual "Transcribe" button for legacy recordings
- Progress bar with percentage and status chips
- "Combine" button to merge chapter transcripts
- Socket.io streaming progress updates

**Learnings:**
- Folder naming: `recording-transcripts/` clarifies these are pre-edit transcripts
- Queue system prevents overload when batch-transcribing
- Progress feedback essential for long-running operations

---

### v0.5.0 - Thumbnails (Dec 1)

**Theme:** YouTube thumbnail workflow

**Features:**
- New "Thumbs" page in navigation
- Scan ~/Downloads for ZIP files containing images
- Preview ZIP contents, select up to 3 images
- Import selected → renamed to thumb-1, thumb-2, thumb-3
- Drag-to-reorder (auto-renames files)
- Delete individual thumbnails (remaining auto-renumber)
- Size toggle (S/M/L/XL) for previews

**Learnings:**
- ZIP import pattern useful for batch operations
- Drag-to-reorder with auto-rename = intuitive UX
- Thumbs folder changes per project, so manual refresh vs. watcher

---

### v0.4.0 - Assets (Nov 30 - Dec 1)

**Theme:** Image management linked to video segments

**Features:**
- Assets page with incoming images grid and assigned images list
- Assignment Controls: chapter, sequence, image order, variant, label
- Image naming: `{chapter}-{seq}-{imgOrder}{variant}-{label}.{ext}`
- Shift+Hover preview (600px large preview)
- Image Prompt Creation - `.txt` files alongside images
- Paired asset display (image + prompt on same row)
- Click any asset to populate assignment controls

**Learnings:**
- Assets linked to segments via naming convention
- Prompts as `.txt` files = simple, version-controllable
- Paired display pattern for related files

---

### v0.3.0 - Recordings View (Nov 29-30)

**Theme:** Enhanced recordings management

**Features:**
- New tab with chapter groupings
- Group by chapter NUMBER only (not chapter + name)
- Safe folder (`-safe/` inside recordings) for unwanted takes
- Per-file `[→ Safe]` button, per-chapter `[→ Safe All]`
- Restore from safe `[← Restore]`
- Toggle buttons: "Show safe", "Chapter headings"
- Total duration display

**Learnings:**
- Safe folder inside recordings keeps related files together
- Chapter grouping by number only - names vary between segments
- Don't delete - move to safe (recoverable)

---

### v0.2.0 - Projects (Nov 29)

**Theme:** Multi-project support

**Features:**
- Project list panel showing all AppyDave projects
- Click to switch active project
- Create new project with b-code format (b64, b65, etc.)
- Validation for project names (kebab-case, allow periods)
- Project selector dropdown

**Learnings:**
- b-code format matches existing AppyDave video numbering
- Project codes are simple identifiers, full name is separate
- Allow periods (for names like `b73-opus-4.5-awesome`)

---

### v0.1.0 - Incoming → Recordings (Nov 28-29)

**Theme:** The foundation - watch and rename

**Features:**
- Watch for Ecamm Live recordings in configured directory
- File cards showing: filename, duration, size, timestamp
- Naming controls: chapter, sequence, name, tags
- Structured naming: `{chapter}-{sequence}-{name}-{tags}.mov`
- Good Take Algorithm - suggests best recording from duplicates
- Common Names quick-select (pill buttons)
- Custom tag input (inline, converts to UPPERCASE)
- Discard remaining files prompt
- Trash folder (`-trash/`) for discards
- Real-time updates via Socket.io file watcher

**Key Decisions:**
- Naming convention: `{chapter}-{sequence}-{name}-{tags}` - proven from manual workflow
- Tags uppercase: CTA, SKOOL, RECAP - visual distinction
- Trash not delete - recoverable mistakes
- Ecamm-first: Built for Ecamm Live workflow (other recorders could come later)

**Learnings:**
- Good Take Algorithm v2: First version failed with baseline files. 5MB threshold identifies substantial takes
- File watcher + Socket.io = instant UI updates
- Config as state: Single `config.json` stores user preferences

---

## Version History Summary

| Version | Date | Theme | Git Tagged? |
|---------|------|-------|-------------|
| v0.13.0 | 2025-12-17 | Edit Workflow | ✓ |
| v0.12.0 | 2025-12-16 | Windows/WSL Support | ✓ |
| v0.11.0 | 2025-12-15 | Shadow System | ✓ |
| v0.10.0 | 2025-12-14-15 | Watch Page | ✓ |
| v0.9.0 | 2025-12-14 | Inbox + Chapters | ✓ |
| v0.8.0 | 2025-12-13 | Initial Git Commit | ✓ |
| v0.7.0 | Dec 6-7 | Query API | - |
| v0.6.0 | Dec 3-5 | Transcription | - |
| v0.5.0 | Dec 1 | Thumbnails | - |
| v0.4.0 | Nov 30 - Dec 1 | Assets | - |
| v0.3.0 | Nov 29-30 | Recordings View | - |
| v0.2.0 | Nov 29 | Projects | - |
| v0.1.0 | Nov 28-29 | Incoming → Recordings | - |

---

## Development Context

### The Opus 4.5 Journey

FliHub development coincided with testing Claude Opus 4.5:

- **b72-opus-4.5-awesome** - Started skeptical, ended calling it awesome
- **b73-vibe-code-ecamm-line-opus-4.5** - Ecamm integration work
- **b75-vibe-code-whisper-ai-opus-4.5** - Whisper AI integration
- **b76-vibe-code-auto-chapters-opus-4.5** - Chapter auto-generation
- **b89-vibe-code-video-player-opus-4.5** - Watch page development

### Velocity

19 days from first feature (Nov 28) to v0.13.0 (Dec 17):
- 100+ functional requirements
- Full collaboration workflow established
- Cross-platform support

### Architecture Patterns

1. **Monorepo:** client/ + server/ + shared/
2. **React Query:** Consistent hooks pattern
3. **Socket.io:** Real-time file updates
4. **Query API:** LLM context endpoints
5. **PO/Dev workflow:** Requirements in fli-brief, handovers via Claude commands

---

## Future: v1.0.0

The v1.0.0 release will likely come after BMAD rebuild, incorporating learnings:

- Multi-brand support (currently locked to v-appydave)
- DAM integration for S3 operations
- Enhanced project stages and workflow tracking
- Architecture improvements from patterns discovered

---

## Release Process

See `docs/release-process.md` for how to create releases.
