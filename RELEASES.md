# FliHub Release Notes

User-facing release history with features, fixes, and learnings.

**Versioning:** Semantic versioning (MAJOR.MINOR.PATCH)
- v0.x.x = Pre-1.0 development (evolving, may have breaking changes)
- Future v1.0.0 = Stable release (likely after BMAD rebuild)

---

## v0.6.0 - Edit Workflow (2025-12-17)

**Theme:** Post-production collaboration with Jan

### What's New

- **First Edit Prep Page** - Prepare for Gling editing sessions
  - Copy Gling filename to clipboard
  - Copy dictionary words for better transcription
  - View recordings with file sizes
  - Create prep folder with one click

- **S3 Staging Page** - Manage editor collaboration workflow
  - PREP section: Your first edit files to send to Jan
  - POST section: Jan's edited versions received back (with SRT status warnings)
  - PUBLISH section: Select and promote final version (removes version suffix)

- **Clipboard Format Fix** - Project clipboard now produces `b85 > Clauding 01` format (Title Case, `>` separator)

### Learnings

- **Modal pattern established:** Cog menu → modal pages for workflow-specific tools (not tabs)
- **Light theme consistency:** All modals now use light theme matching the main app
- **Edit workflow is multi-stage:** prep → staging → post → publish with clear folder structure

---

## v0.5.0 - Windows/WSL Support (2025-12-16)

**Theme:** Cross-platform support for Jan on Windows/WSL

### What's New

- **WSL Path Translation** - Folder open buttons now work on WSL
  - Automatically converts `/mnt/c/...` to `C:\...` for Windows Explorer
  - Debug logging added for troubleshooting

- **Environment Detection** - Config panel shows detected environment (macOS/Linux/Windows/WSL)
  - Path format guidance based on environment
  - Inline warnings when path format doesn't match

- **Recording Size Totals** - Header shows total recording size and shadow size
- **Transcription Telemetry** - Logging transcription timing for future predictions
- **Jan Agent** - Custom Claude command for Jan's workflow

### Fixes

- Project name no longer shows full path on Windows (FR-93)
- Transcription skip logic now works correctly (FR-92)
- Shadow generation path bug fixed (FR-97)
- Whisper output cleaned up (FR-98) - only TXT, SRT, JSON now

### Learnings

- **WSL is a unique platform:** Neither pure Linux nor pure Windows. Need special handling.
- **Centralized helpers pay off:** Single `openInFileExplorer()` function meant one fix covered all buttons
- **Telemetry enables prediction:** Collecting timing data now enables future "estimated time remaining" features

---

## v0.4.0 - Shadow System (2025-12-15 PM)

**Theme:** Enable collaboration without sharing large video files

### What's New

- **Shadow Recordings** - Lightweight `.txt` placeholders mirroring video files
  - Collaborators see project structure without 100GB+ video files
  - Ghost icon (👻) indicates shadow-only files
  - Shadow count column in project list

- **Shadow Fallback** - Watch page automatically uses shadow video when real video unavailable
- **GitHub Links** - Quick access to repo and video-projects from cog menu
- **Cross-Platform Setup Guide** - Documentation for Jan/collaborators

### Learnings

- **Text shadows before video shadows:** Started simple (txt files), video shadows (240p mp4) can come later
- **Folder naming convention:** `recording-shadows/` matches `recording-transcripts/` pattern
- **Auto-generation on rename:** Shadows created when recordings renamed, not manually

---

## v0.3.0 - Watch Page + Transcript Sync (2025-12-15 AM)

**Theme:** Video playback with synchronized transcripts

### What's New

- **Watch Page** - Video playback with segment/chapter navigation
  - Play/Stop, Autoplay, Auto-Next controls
  - Size toggle (Normal/Large)
  - Segment list with duration and transcript status

- **Transcript Sync Highlighting** - Real-time word highlighting during playback
  - Word and Phrase modes (toggle)
  - Click any word to seek video
  - Auto-scroll to keep highlighted text visible

- **Chapter SRT Generation** - Combined SRT files for chapter videos
  - Timing offsets calculated from segment durations
  - Title slide duration included in calculations

- **Dual Transcript Output** - Whisper now generates both TXT and SRT files

- **Enhanced Project List** - 8-stage workflow, indicators, clickable stats

### Learnings

- **SRT timing is cumulative:** Chapter videos need offset calculation from all preceding segments
- **Word-level timing is estimated:** Whisper provides phrase-level only; words distributed evenly
- **Chapter recordings need concat filter:** FFmpeg demuxer requires identical streams; filter re-encodes but reliable

---

## v0.2.0 - Inbox + Chapter Recordings (2025-12-14)

**Theme:** Content staging and chapter video generation

### What's New

- **Inbox Tab** - Stage incoming content before processing
  - Dynamic folder scanning (any folder in `inbox/` appears automatically)
  - Preferred sort: (root) → raw → dataset → presentation
  - Write API for programmatic file creation

- **Chapter Recordings** - Generate combined chapter videos from segments
  - Purple title slides with segment info
  - Configurable slide duration and resolution
  - Auto-generate option

- **Mockups Page** - Design reference for UI work
- **File Viewer Modal** - Preview files from inbox

- **Renamed to FliHub** - From "Recording Namer"

### Tech Improvements

- NFR-65/66/67: Extracted shared utilities, consolidated types, standardized errors
- Header dropdowns for navigation

### Learnings

- **Chapter grouping by number only:** Originally grouped by number+name, but segment names vary
- **Concat filter over demuxer:** Audio codec mismatches broke chapter videos until switched to filter approach
- **Inbox is a staging area:** Not for final content, but for incoming material to process

---

## v0.1.0 - Initial Release (2025-12-13)

**Theme:** Core recording workflow for video production

### What's New

This initial release bundled ~2 weeks of development (Nov 28 - Dec 13).

**Recording Workflow:**
- Watch for Ecamm recordings, rename with structured naming convention
- Chapter/sequence/name/tags format: `01-1-intro-CTA.mov`
- Good Take Algorithm suggests best recording from duplicates
- Move unwanted takes to safe folder (not deleted)
- Trash folder for discards

**Project Management:**
- Project list with b-code format (b64, b65, etc.)
- Pin/unpin projects, stage indicators (REC/EDIT/DONE)
- Create new projects with validation
- Project stats popup (files, transcripts, dates)

**Transcription:**
- Whisper AI integration with queue and progress
- Auto-transcribe on file rename
- Transcripts folder: `recording-transcripts/`
- Combined transcript export for full video

**Assets:**
- Image management with assignment controls
- YouTube thumbnail import from ZIP files
- Image prompts creation (.txt alongside images)
- Shift+hover preview

**Infrastructure:**
- Socket.io for real-time file updates
- File watchers (chokidar) for recordings, assets, projects
- Query API for LLM context (`/api/query/*`)
- Open folder buttons throughout
- Connection status indicator

### Key Decisions Made

1. **Naming convention:** `{chapter}-{sequence}-{name}-{tags}.ext` - proven pattern from manual workflow
2. **Transcripts folder:** `recording-transcripts/` not `transcripts/` - clarifies these are pre-edit
3. **Safe folder inside recordings:** `-safe/` not sibling folder - keeps related files together
4. **Project codes:** b-prefixed numbers (b64, b65) - matches existing AppyDave video numbering
5. **Tags are uppercase:** CTA, SKOOL, RECAP - visual distinction in filenames

### Learnings from v0.1.0 Development

- **Good Take Algorithm v2:** First version failed with baseline files. 5MB threshold identifies substantial takes.
- **Parallel ffprobe:** 8-9s → 1s by parallelizing 118 ffprobe calls
- **Socket over polling:** Real-time updates essential for file-heavy workflow
- **Config as state:** Single `config.json` stores all user preferences

---

## Version History Summary

| Version | Date | Theme | Key Features |
|---------|------|-------|--------------|
| v0.6.0 | 2025-12-17 | Edit Workflow | First Edit Prep, S3 Staging |
| v0.5.0 | 2025-12-16 | Windows/WSL | Cross-platform, Jan integration |
| v0.4.0 | 2025-12-15 | Shadow System | Collaboration without video files |
| v0.3.0 | 2025-12-15 | Watch Page | Video playback, transcript sync |
| v0.2.0 | 2025-12-14 | Inbox + Chapters | Content staging, chapter generation |
| v0.1.0 | 2025-12-13 | Initial | Core recording workflow |

---

## Development Context

### The Opus 4.5 Journey

FliHub development coincided with testing Claude Opus 4.5. Video projects document this journey:

- **b72-opus-4.5-awesome** - Started skeptical ("is this going to be a shit model?"), ended calling it awesome
- **b73-vibe-code-ecamm-line-opus-4.5** - Ecamm integration work
- **b75-vibe-code-whisper-ai-opus-4.5** - Whisper AI integration
- **b76-vibe-code-auto-chapters-opus-4.5** - Chapter auto-generation
- **b89-vibe-code-video-player-opus-4.5** - Watch page development

### Velocity

5 days from initial commit to v0.6.0:
- 32 commits
- 100+ functional requirements implemented
- Full collaboration workflow with Jan established

### Architecture Patterns Established

1. **Monorepo structure:** client/ + server/ + shared/
2. **React Query for state:** Consistent hooks pattern
3. **Socket.io for real-time:** File watchers trigger UI updates
4. **Query API for LLM context:** /api/query/* endpoints
5. **PO/Dev workflow:** Requirements in fli-brief, handovers via Claude commands

---

## Future: v1.0.0

The v1.0.0 release will likely come after rebuilding with the BMAD method, incorporating learnings from v0.x development. Key areas for BMAD rebuild:

- Multi-brand support (currently locked to v-appydave)
- DAM integration for S3 operations
- Enhanced project stages and workflow tracking
- Improved architecture based on patterns discovered

---

## Release Process

See `docs/release-process.md` for how to create releases.
