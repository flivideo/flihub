# FliHub v2 — Product Requirements Document

> **Purpose**: Complete functional requirements for rebuilding FliHub in any tech stack.  
> **Audience**: Developer unfamiliar with the current codebase.  
> **Approach**: Replicate what works faithfully. Note improvements where clear. Don't strip features — this is a well-engineered, mature application.

---

## Table of Contents

1. [What FliHub Is](#1-what-flihub-is)
2. [Core Design Principles](#2-core-design-principles)
3. [Design System](#3-design-system)
4. [Architecture Patterns to Preserve](#4-architecture-patterns-to-preserve)
5. [Feature Requirements](#5-feature-requirements)
   - 5.1 Recordings
   - 5.2 Transcriptions
   - 5.3 Watch
   - 5.4 Inbox
   - 5.5 Assets (Images & Prompts)
   - 5.6 Thumbnails
   - 5.7 Projects & Project Management
   - 5.8 Chapters & Chapter Recordings
   - 5.9 Relay Collaboration
   - 5.10 Hold/Archive Operations
   - 5.11 Shadow Files (Low-Res Proxies)
   - 5.12 Manage Panel (Bulk Operations)
   - 5.13 Edit Prep
   - 5.14 Configuration & Settings
   - 5.15 API Explorer
   - 5.16 Poem WUI Integration
   - 5.17 Mockups Page
6. [Real-time Events](#6-real-time-events)
7. [Naming Conventions](#7-naming-conventions)
8. [Non-Functional Requirements](#8-non-functional-requirements)
9. [v2 Improvements](#9-v2-improvements)
10. [Out of Scope for v2](#10-out-of-scope-for-v2)

---

## 1. What FliHub Is

FliHub is a **video production asset management system** for solo/small-team content creators. It manages the full lifecycle of video projects — from raw recordings out of Ecamm Live, through naming/organisation/transcription, to editing prep and relay sync with remote collaborators.

**Mental model**: One active project at a time. Everything in the UI targets that project. All tabs/panels work on the same project folder.

**Primary user**: A solo YouTube creator (David) recording screen-capture tutorials on Mac, collaborating asynchronously with editors in another timezone via rsync over Tailscale.

**Secondary users**: Remote video editors who need to collect, edit, and return project files.

---

## 2. Core Design Principles

These are the DNA of the application. Do not compromise them in v2.

1. **One action, one click** — collapse multi-step workflows into a single operation wherever possible. No confirmation dialogs unless destructive.
2. **State over deletion** — safe, parked, trashed recordings are never permanently deleted by accident. Files move to subfolders. Only explicit user confirmation triggers real deletion.
3. **Surface complex state visually** — disk usage, sync status, transcript %, relay divergence. Make it scannable at a glance without clicking into details.
4. **Error transparency** — show errors where the action was taken. Don't silently fail. Don't bury errors in logs.
5. **Real-time, not polling** — file changes propagate instantly via WebSocket. The UI never feels stale.
6. **Cross-project safety** — operations on transcripts, shadows, relay must always derive their target from the source file path, not the currently active project. Never silently write to the wrong project.
7. **Validate at the boundary** — naming rules are enforced at input, not on save. Show the constraint before the user hits a wall.

---

## 3. Design System

Apply the AppyDave brand system. This is the **warm, editorial, Swiss-grid aesthetic** — not generic SaaS.

### 3.1 Colour Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `brand-brown` | `#342d2d` | Primary text, structure, borders |
| `brand-gold` | `#ccba9d` | Secondary warm accent, hover states |
| `brand-yellow` | `#ffde59` | Primary CTA buttons, key accents |
| `brand-amber` | `#c8841a` | Sequence numbers (01/02/03), status accents |
| `brand-muted` | `#7a6e5e` | Supporting text, labels, secondary content |
| `brand-near-white` | `#faf5ec` | Default background |
| `brand-surface` | `#f0ebe4` | Section alternates, card backgrounds |
| `brand-linen` | `#e8e0d4` | Tertiary warm surface |
| `brand-border` | `#d4cdc4` | Dividers, separators |
| `brand-chrome` | `#1a1515` | Dark sections (CTAs, footer) |
| `brand-dark-surface` | `#25201e` | Dark section backgrounds |

**Rules:**
- Warm cream (`#faf5ec`) is always the default background
- Yellow (`#ffde59`) is the primary action colour — use for CTA buttons only
- Amber (`#c8841a`) is for sequences and accent indicators only — never primary CTA
- Pure black (`#000`) is forbidden — use `#1a1515` instead
- Dark sections are intentional contrast beats, not a theme

### 3.2 Typography

| Use | Font | Size | Weight | Letter-spacing | Case |
|-----|------|------|--------|---------------|------|
| Hero headings | Oswald | `clamp(72px, 7.5vw, 108px)` | 700 | `-0.02em` | uppercase |
| Section h2 | Oswald | 40px | 700 | `-0.01em` | uppercase |
| Card titles | Oswald | 22px | 600 | `0.02em` | uppercase |
| Labels / pills | Oswald | 10–11px | 400–600 | `0.15–0.3em` | uppercase |
| Stat numbers | Oswald | 44px | 700 | — | — |
| Body text | Roboto | 13–15px | 400 | — | — |
| Button text | Oswald | 10–11px | 500–600 | `0.2em` | uppercase |
| Nav links | Oswald | 10px | 400 | `0.2em` | uppercase |

**Fonts**: Oswald (headings/UI), Roboto (body), Bebas Neue (logo/watermarks only)

### 3.3 Layout

- Max container width: `1280px`, horizontal padding `40px`
- Swiss grid approach: column rules (1px, `rgba(52,45,45,0.12)`) between major layout zones
- Section padding: `72px` top/bottom for major sections, `48px` for tighter zones
- No gap in card grids — use border-based separation instead: `1px solid rgba(52,45,45,0.08)`

### 3.4 Components

**Primary button**
```
Background: #ffde59 | Text: #342d2d | Font: Oswald 10–11px uppercase 0.2em
Padding: 14px 28px | Font-weight: 600 | Hover: opacity 0.9
```

**Secondary button (bordered)**
```
Background: transparent | Border: 1px solid rgba(52,45,45,0.25) | Text: #342d2d
Font: Oswald 11px uppercase 0.2em | Padding: 14px 28px
```

**Stage pill / badge**
```
Padding: 3px 10px | Font: Oswald 10px uppercase 0.15em | Border: 1px solid (varies)
Active/current: border #c8841a, color #c8841a
Inactive: border rgba(52,45,45,0.12), color #7a6e5e
```

**Section header pattern**
```
Flex row, align baseline, gap 24px, margin-bottom 40px
h2: Oswald 40px bold uppercase
Trailing rule: flex 1, height 1px, background rgba(52,45,45,0.12)
Right label: Oswald 11px uppercase 0.25em, color #7a6e5e, nowrap
```

**Tables**
- Use `brand-surface` (`#f0ebe4`) for alternating row backgrounds
- Column headers: Oswald 10px uppercase 0.2em, `brand-muted`
- Cell text: Roboto 13px, `brand-brown`
- Row hover: `brand-linen` (`#e8e0d4`)
- Sortable columns have a sort icon (asc/desc/none state)

### 3.5 Anti-Patterns (Do Not Do)

- No glassmorphism
- No pure black `#000`
- No amber as primary CTA
- No dark mode as default
- No grid lines outside hero/deliberate zones
- No generic SaaS blue-dominant palettes
- No identical 3-card grids repeated mechanically

---

## 4. Architecture Patterns to Preserve

These are non-obvious constraints that must be carried into v2.

### 4.1 Active Project Context
All operations target the single "active project". Switching projects changes all tabs simultaneously. Store active project in server config, not just client state — so the server can use it for file operations and watchers.

### 4.2 File Watching + WebSocket Events
Use a file watcher (inotify/chokidar equivalent) to detect file system changes. Debounce changes (200–500ms). Emit named WebSocket events per area (recordings, transcripts, assets, etc.). Client invalidates query cache on receipt — no manual refresh buttons.

### 4.3 State Files, Not Database
Project-specific state (safe/parked recordings, Gling dictionary, stage overrides) lives in `~/.flihub/{projectCode}.state.json`. Config lives in `server/config.json`. No database required.

### 4.4 Cross-Project Safety for Transcriptions
When transcribing, always derive the output directory from the source video's path — NOT from the currently active project in config. A user can start transcription on project A, switch to project B, and the transcript must still save to project A's folder.

### 4.5 Naming as a Contract
The naming convention (`{chapter}-{sequence}-{label}.mov`) is the primary key of the system. Everything (transcripts, shadows, chapters, prompts) is keyed off the base filename. Validate this format at every input boundary.

### 4.6 Rsync for Relay
Relay sync uses rsync (or equivalent) — not a custom file transfer. Standard excludes: `.DS_Store`, `._*`, `.gitkeep`, `.stfolder`, `.stignore`, `Thumbs.db`. Rsync preserves timestamps, permissions, ownership.

---

## 5. Feature Requirements

---

### 5.1 Recordings

**What it is**: The primary workspace. Shows all recordings in the active project's `recordings/` folder, grouped by chapter.

#### Display
- Group recordings by chapter number (2-digit prefix)
- Within each chapter, sort by sequence number
- Per-recording row shows:
  - Filename (parsed: chapter badge, sequence, name, tags)
  - File size + video duration
  - Transcription status badge: none / queued / transcribing / complete / error
  - Safe indicator (eye-slash icon) if in safe state
  - Parked indicator if parked
  - Shadow file status (exists/missing)
- Chapter header shows: chapter number, derived label, file count (active/safe/parked), total duration
- **Recently Named Strip**: bottom strip showing last 5 renames with undo button. Expires after 10 minutes.
- **Suggested Naming Panel**: shows next suggested chapter/sequence based on existing files

#### Actions — Per Recording
- **Rename**: dialog with chapter (01-99), sequence (1-9), name (validated kebab-case), tags (multi-select from configured list). On confirm: rename file, rename matching `.srt` if present, auto-queue transcription if configured.
- **Move to Safe**: hide from active view (moves to `recordings/-safe/`). State tracked in state file.
- **Restore from Safe**: move back to `recordings/`.
- **Park**: mark as excluded from current edit. Per-file, with optional annotation. Does NOT move the file.
- **Unpark**: restore parked status.
- **Move to Trash**: move to `recordings/-trash/` subfolder (soft delete).
- **Undo Rename**: available from Recently Named Strip for 10 minutes. Restores file to original path.

#### Actions — Per Chapter
- **Select all in chapter**: batch checkbox
- **Rename chapter label**: update the label portion of all files in the chapter

#### Background Behaviour
- File watcher on `recordings/` and `recording-shadows/`. Debounced 200ms. Emits `recordings:changed`.
- Suggested naming: scans existing files, calculates next chapter (highest + 1) and sequence (reset to 1 for new chapter). Matches against `commonNames` config.
- Auto-transcribe after rename: if `autoTranscribeOnRename` is true in config, queue transcription immediately.

#### Constraints
- Chapter: `01`–`99` (2 digits, zero-padded)
- Sequence: `1`–`9` (1 digit)
- Label: alphanumeric + hyphens only, no spaces, no special chars
- Tags: comma-separated from `availableTags` config list
- Extensions: `.mov` primary, `.mp4` also supported

---

### 5.2 Transcriptions

**What it is**: Manages the queue of recordings waiting for AI transcription (Whisper/mlx_whisper). Shows active job, queue, and project transcript status.

#### Display
- Active job: filename, status text, real-time streaming output
- Queue: ordered list of pending jobs with positions
- Recent jobs: last 5 completed/failed with timestamps
- Project transcripts: all `.txt` files in `recording-transcripts/`, with first ~50 chars preview
- Progress bar: % of recordings that have matching transcripts

#### Per-Recording Badge (in Recordings view)
- ◯ none / ⧗ queued / ▶ transcribing / ✓ complete / ✗ error
- Hover: filename + error message if failed

#### Actions
- **Queue for transcription**: per-recording button. Skips if `.txt` already exists.
- **Queue all missing**: bulk button. Skips already-transcribed.
- **View transcript**: modal with full text, copy button, open-in-editor button.
- **Delete transcript**: removes `.txt` file. Can re-queue to regenerate.
- **Combine chapter transcripts**: merge all `.txt` files for a chapter into one file.

#### Background Behaviour
- Single-threaded queue: one job active at a time, processed sequentially.
- Whisper invoked via configured binary path (default: `~/.pyenv/shims/mlx_whisper`), model, and language.
- Outputs: `.txt` (plain text), `.srt` (timed subtitles), `.json` (word-level timestamps).
- Real-time streaming: stdout/stderr captured and emitted as `transcription:progress` socket events.
- Cross-project safety: output directory derived from source video path, not active project config.
- Watcher on `recording-transcripts/`. Debounced 300ms. Emits `transcripts:changed`.

#### Constraints
- Only `.txt` files count as "transcribed" for status/progress purposes
- Filename mapping: base name only — `01-1-intro.mov` → `01-1-intro.txt`
- Both `.mov` and `.mp4` with the same base name treated as the same recording

---

### 5.3 Watch

**What it is**: A full-screen video player with chapter/segment navigation and transcript sync highlighting. Read-only — no mutations.

#### Display
- Full-width centered video player
- Chapter panel (hover near right edge → slides out):
  - Lists all chapters with file count and total duration
  - Click to play that chapter's first/best recording
- Segment panel (hover over chapter → cascades from right):
  - Lists all files in that chapter with sequence, name, duration
  - Click to play that specific file
- Transcript sync (below player):
  - SRT-based word/phrase highlighting
  - Highlights follow video playback position (50ms polling)
  - Click word/phrase → seek video to that timestamp
- Playback speed presets: 0.75x, 1x, 1.25x, 1.5x, 2x (default: 2x, persisted in localStorage)
- Size toggle: Normal / Large (persisted in localStorage)
- Toggles: Show Safe Recordings, Show Parked Recordings (independent, visual filter only)

#### Actions
- Play/pause, seek, volume, fullscreen (browser native controls)
- Click chapter or segment to switch playback
- Click transcript word → seek to timestamp
- Toggle speed via presets
- Toggle size (Normal/Large)
- Toggle Safe/Parked visibility
- Open folder (OS file manager)

#### Background Behaviour
- Groups recordings by chapter, sorts by sequence
- Calculates cumulative start times per chapter (for SRT offset when playing chapter recording)
- Auto-selects last recording on page load (highest chapter + sequence)
- Auto-play next segment on completion (configurable)

---

### 5.4 Inbox

**What it is**: A file browser for the project's `inbox/` folder. Read-mostly.

#### Structure
The inbox has three subfolders:
- `inbox/raw/` — dumps, notes, links
- `inbox/dataset/` — structured data
- `inbox/presentation/` — HTML visual assets

#### Display
- Shows contents of each subfolder
- File list with name, size, modified date
- Preview panel for selected file (text content, image, HTML)

#### Actions
- Browse subfolder contents
- Open file in external viewer
- View file content inline (text/HTML/image)

#### Background Behaviour
- File watcher on `inbox/`. Debounced 200ms. Emits `inbox:changed`.

---

### 5.5 Assets (Images & Prompts)

**What it is**: Manages visual assets (images + AI generation prompts) for the project. Two panels: Incoming (from Downloads) and Assigned (in project).

#### Incoming Panel
- Scans configured `imageSourceDirectory` (default: `~/Downloads`)
- Displays all `.png`, `.jpg`, `.jpeg`, `.webp` files, newest first
- Per-file: filename, size, timestamp
- Duplicate detection: MD5 hash based. Shows original + duplicates with count.
- Shift+Hover → full-size image preview overlay

#### Assigned Panel
- Project's `assets/images/` folder contents
- Paired display: image + corresponding prompt (if exists)
- Filenames parsed to show chapter-sequence-order-variant-label
- Shift+Hover preview for both image and prompt

#### Actions — Incoming
- **Assign image**: select chapter/sequence/order/variant/label → moves file to `assets/images/`
- **Delete incoming**: removes from Downloads (confirm)
- **Detect duplicates**: MD5 match, bulk-delete duplicates
- **Paste from clipboard**: save clipboard image as PNG to Downloads, then assign

#### Actions — Assigned
- **Edit prompt**: modal with full text. Auto-save on close. Create if new.
- **Delete prompt**: clear content triggers delete
- **Delete assigned image**: removes from `assets/images/`

#### Display Controls
- Thumbnail size toggle: S (80px) / M (120px) / L (25vw) / XL (35vw), persisted per-panel

#### Background Behaviour
- Watcher on `imageSourceDirectory`. Debounced 200ms. Emits `assets:incoming-changed`.
- Watcher on `assets/images/` (depth 2). Emits `assets:assigned-changed`.
- Duplicate detection: MD5 hash on first-seen, matched against subsequent files.
- Assignment controls (chapter/sequence/order) persisted to localStorage.
- Next image order API: returns next sequential order number for a chapter-sequence.

#### Constraints
- Image formats: `.png`, `.jpg`, `.jpeg`, `.webp` (case-insensitive)
- Naming: `{chapter:2d}-{sequence:1d}-{order:1d}{variant?}-{label}.{ext}`
- Label: kebab-case only
- Variant: optional single letter (a–z)
- Prompt pairing: matched by base filename, `.txt` extension

---

### 5.6 Thumbnails

**What it is**: Manages YouTube thumbnails imported from ZIP files.

#### Display
- ZIP files detected in Downloads: filename, size, timestamp. Expandable to see contents.
- ZIP contents preview: image grid, Shift+Hover for full preview
- Imported thumbnails (`assets/thumbs/`): numbered grid, Shift+Hover preview, drag-to-reorder
- Thumbnail size toggle: S / M / L / XL (persisted)

#### Actions
- **Preview ZIP contents**: click ZIP → loads images inside
- **Import thumbnails**: checkbox select (max 3 per import) → copies to `assets/thumbs/` with sequential numbering
- **Reorder thumbnails**: drag-and-drop → updates filenames to match new order
- **Delete thumbnail**: confirm → remaining images renumbered
- **Delete ZIP**: confirm → removes from Downloads

#### Background Behaviour
- Watcher on Downloads for `*.zip`. Emits `thumbs:zip-added`.
- Watcher on `assets/thumbs/`. Emits `thumbs:changed`.
- Import: auto-numbers sequentially (01, 02, 03, …). Preserves original filename as suffix.
- Reorder: renames all files atomically to match new order.

#### Constraints
- ZIP extension: `.zip` (case-insensitive)
- Supported image formats inside ZIP: `.png`, `.jpg`, `.jpeg`, `.webp`
- Max selection per import: 3 images
- Numbering: `01_{originalname}.{ext}`

---

### 5.7 Projects & Project Management

**What it is**: The project browser. Shows all project folders, their status, and provides management operations. This is the most actively developed area of the app.

#### Project List Display
- Sortable/filterable table of all projects in `projectsRootDirectory`
- Per-project row:
  - Thumbnail (first frame of first recording, if available)
  - Name (parsed from folder: `b72-awesome` → `b72` + `awesome`)
  - File count badge (# recordings)
  - Last modified date
  - Stage badge (colour-coded)
  - Transcript % progress
  - Star icon: pin/unpin
  - Relay sync badges per subfolder (↑ ahead, ↓ behind, ✓ synced) if relay enabled
  - Hold badge: `T7` (green = on SSD only), `T7 ⚠` (amber = both local + SSD)
  - Disk usage columns: rec, trash, shadows, other, total — colour-coded by threshold (faint/amber/red)
- Hover row → project drawer slides in from right

#### Filtering & Sorting
- Search box: filter by project name/code (live filter)
- Sort: name (asc/desc), stage, modified date, file count, transcript %
- Filter presets: All, Active, Pinned, Dead, Needs Attention, Ready to Publish

#### Project Drawer (slide-out)
- Full stats: created date, last modified, total video duration, file counts by type
- Content indicators: ✓ has inbox, ✓ has assets, ✓ has chapters, etc.
- Stage override dropdown (auto-detect or manual, 9 stages)
- Priority toggle (star/unstar)
- Folder actions: open in OS, copy path
- Disk usage breakdown per subfolder
- Trash folder size + "Empty Trash" button
- Relay sync status per subfolder (detailed file counts)
- Hold status: location, path, verification (file count match)
- Transcribe All button: queue all missing transcripts for this project
- Delete project button (opens confirmation modal)

#### Project Stages
Supported stages (in order):
1. `planning`
2. `recording`
3. `first-edit`
4. `second-edit`
5. `ready-to-publish`
6. `published`
7. `archived`
8. `shelved`
9. `remix`

Auto-detection heuristic (can be overridden):
- recording: has recordings, no transcripts
- first-edit: has recordings + transcripts
- second-edit: has `edit-1st/` folder
- ready-to-publish: has `edit-2nd/` folder

Manual overrides stored in `config.projectStageOverrides`.

Stage badge colours should be visually distinct and consistent. Suggested: planning (grey), recording (blue), first-edit (amber), second-edit (amber-dark), ready (green), published (green-dark), archived (muted), shelved (red-muted), remix (purple-muted).

#### Disk Usage Display
- Per-column thresholds: faint / amber / red (configurable per column)
- Stage-based penalty multiplier: published/archived projects get 0.5× thresholds (they're expected to be larger)
- Drill-down: click column → see subfolders + top files
- Columns: `rec`, `trash`, `shadows`, `other`, `rRec` (relay rec), `r1st`, `r2nd`, `total`

#### Actions
- **Select active project**: click row → sets active project in config. All tabs target this project.
- **Create project**: input project code, validates format, creates folder + `recordings/` subfolder.
- **Pin/unpin project**: star toggle. Pinned projects sort first.
- **Override stage**: dropdown in drawer. "auto" re-enables auto-detection.
- **View full stats**: info icon → popup with all file/folder details.
- **Empty trash**: confirm → deletes all files in `{project}/-trash/`.
- **Scan all disk usage**: background scan of all projects for size data.
- **Delete project**: confirmation modal. User must type exact project code. Permanently removes project folder.

#### Background Behaviour
- Watcher on parent directory of active project (depth 1). Debounced 500ms. Emits `projects:changed`.
- Project stats calculated on load: count recordings, transcripts, images, thumbs, shadows, inbox contents.
- Transcript sync: counts matched/missing/orphaned.
- Disk size calculation: per-project subfolder breakdown.
- Hold status: checks for copy on configured SSD path. Verifies file counts.

#### Constraints
- Project code format: `[a-zA-Z]\d{2}(-[a-z0-9-]*)?` — e.g., `b72`, `b72-awesome`, `c43`
- Stored lowercase
- Pinned state stored in `config.projectPriorities`
- Stage overrides stored in `config.projectStageOverrides`

---

### 5.8 Chapters & Chapter Recordings

**What it is**: Groups recordings by chapter prefix and manages generated "chapter recordings" (concatenated videos of all files in a chapter).

#### Display (Recordings View — Chapter Panel)
- Per-chapter:
  - Chapter number badge
  - Derived chapter label (from first file's name)
  - File count breakdown: active / safe / parked
  - Total duration
  - Chapter recording status: if generated, shows preview image + Watch button + Regenerate button

#### Chapter Recording Modal
- Preview of generated chapter video
- Metadata: file size, duration, last generated time
- Regenerate button

#### Actions
- **Generate single chapter recording**: concatenate all files in chapter + optional watermark → output to `recording-chapters/`
- **Generate all chapter recordings**: bulk, sequential, with progress
- **Regenerate**: delete existing + recreate
- **Rename chapter label**: update display name (renames all files in chapter)

#### Background Behaviour
- Chapter recording generation:
  - Concatenates `.mov` files in chapter by sequence order
  - Applies configurable watermark (image, scale, position)
  - Outputs: `{chapter:2d}-{label}.mov` in `recording-chapters/`
  - Also generates matching `.srt` with cumulative timing (FR-76)
- Progress streamed via socket: `chapters:generating` (chapter, current, total)
- Completion: `chapters:generated` (outputFile, srtFile), `chapters:complete` (summary)

#### Watermark Config (per preset in config)
- Watermark image path
- Scale (e.g., 0.15 = 15% of frame width)
- Position: x/y offset from corner (e.g., bottom-right)

#### Constraints
- Chapter recording filename: `{chapter:2d}-{label}.mov`
- Output directory: `recording-chapters/` (auto-created)
- Concat order: by sequence number ascending
- SRT timing: cumulative — each segment's start time = sum of all previous segment durations

---

### 5.9 Relay Collaboration

**What it is**: Rsync-based sync system for sharing recordings and edits between a Creator machine and Editor machine(s). Core collaborative workflow.

#### Display
- Relay status indicator in header: enabled/disabled, green/grey
- Activity feed: last 50 events (timestamp, project code, subfolder, action, filename)
- Relay Browser (Kanban-style):
  - Project list sidebar: all projects in relay directory
  - Main: 4 lanes per project: recordings, edit-1st, edit-2nd, final
  - Per lane: file count badge, sync status indicator, expandable file drawer

#### Sync Status Badges
- ✓ synced (green) — counts match
- ↑ N ahead (blue) — local has more files than relay
- ↓ N behind (amber) — relay has more than local
- ↕ diverged (amber) — one folder is missing while other has files
- local-only — relay folder empty
- relay-only — local folder missing

#### Actions
- **Enable/disable relay**: toggle in config. Must configure `relayDirectory` first.
- **Browse relay projects**: list all project folders in relay directory
- **Push (local → relay)**: send recordings/edits from local to relay. Preview (dry-run) available first.
- **Collect (relay → local)**: pull files from relay to local. Soft-fails gracefully if local project doesn't exist (FR-147).
- **Preview**: dry-run diff — shows new/updated/deleted per subfolder, no changes applied
- **Promote to final**: move file from `edit-2nd` → `final` lane on relay
- **View divergence**: shows conflicting files list with reconcile options

#### Machine Role
Config option `machineRole`: `creator` (records video) or `editor` (edits video).
- Creator: shows Push, Archive, Promote
- Editor: shows Collect, hides Archive

#### Background Behaviour
- Rsync operations with standard excludes: `.DS_Store`, `._*`, `.gitkeep`, `.stfolder`, `.stignore`, `Thumbs.db`
- Preserves timestamps, ownership, permissions
- Activity log: in-memory ring buffer, max 50 events. Not persisted.
- Socket event `relay:changed` emitted on push/collect/promote.

#### Relay Directory Structure
```
{relayDirectory}/{projectCode}/recordings/
{relayDirectory}/{projectCode}/edit-1st/
{relayDirectory}/{projectCode}/edit-2nd/
{relayDirectory}/{projectCode}/final/
```

#### Constraints
- Philippines machines are Tailscale-only — `.local` hostnames will not resolve
- Machine role affects UI visibility, not backend logic
- Collect fails gracefully (returns error, no crash) if local project directory doesn't exist
- Divergence requires manual reconciliation via Preview + Push/Collect

---

### 5.10 Hold/Archive Operations

**What it is**: Offloads projects to an external SSD (T7) for long-term storage. Manages the full lifecycle: copy → verify → delete local.

#### Display
- Hold badge on project row:
  - Green `T7`: on holding SSD, local copy deleted
  - Amber `T7 ⚠`: on both (in-progress or needs cleanup)
- Hold details in project drawer:
  - Location: `local-only` / `holding-only` / `both` / `unknown`
  - Path on SSD
  - Last sync timestamp
  - File count verification: local vs SSD
  - Relay block warning (if relay has files, offload is blocked)

#### Actions
- **Offload to SSD**: copies entire project to `{holdingPath}/{projectCode}/` using rsync. Requires SSD mounted + relay synced.
- **Verify hold status**: compare file counts + sizes between local and SSD.
- **Delete local after hold**: confirmation modal — user must confirm explicitly. Shows file counts side-by-side.
- **Restore from SSD**: copies files back from SSD to local.
- **Test SSD mount**: checks if configured path exists and is writable.

#### Background Behaviour
- Hold status detection: on project load, checks for SSD copy. Compares file counts + total sizes.
- Relay block: hard block — if relay has files AND relay is enabled → cannot offload. Message: "Relay has {N} recording files — sync relay first."
- Location states: `local-only`, `holding-only`, `both`, `unknown`
  - `both` is always transitional (rsync in progress or incomplete)

#### Constraints
- Default holding path: `/Volumes/T7/youtube-HOLDING`
- Configurable via `holdingPath` in config
- SSD must be mounted and writable
- Relay must be synced before offloading (if relay is enabled)
- Verification: file count AND total sizes must match exactly (`match: true`)

---

### 5.11 Shadow Files (Low-Res Proxies)

**What it is**: Generates low-resolution video proxies for faster scrubbing by remote editors on slow connections.

#### Display
- Per-recording: shadow file size shown if exists
- Shadow count in project stats
- Shadow section in Config/Manage panels: count, missing count, generate buttons

#### Actions
- **Generate shadows for current project**: creates low-res versions for all missing recordings
- **Generate all shadows**: scans all projects, generates missing across all
- **Regenerate specific shadow**: delete + recreate

#### Background Behaviour
- Source: `{project}/recordings/{filename}.mov`
- Output: `{project}/recording-shadows/{filename}.mov`
- Resolution: configurable (default: 240p). Preserves audio.
- Generation progress: `regen:shadows:progress` socket event (current/total/filename)
- Skip existing: generation skips if shadow already exists and is valid
- Watcher on `recording-shadows/`. Part of recordings watcher. Emits `recordings:changed`.

---

### 5.12 Manage Panel (Bulk Operations)

**What it is**: A sidebar panel with bulk operation tools. Tabs: Regen, Gling/Edit Prep, Relay, Sync, AWB.

#### Regen Tool
- Recordings grid grouped by chapter
- Bulk actions:
  - Regenerate Shadows (all missing)
  - Regenerate Transcripts (queue all missing)
  - Regenerate Chapters (all)
  - Regenerate All (shadows → transcripts → chapters in sequence)
- Progress bars per regen type

#### Bulk Rename
- Select files in recordings grid → open Bulk Rename dialog
- Options:
  - New chapter: preserve original or override with value
  - Label: required
  - Sequence mode: preserve original sequences OR renumber from start value
  - Tags: optional
- Preview changes before confirming
- Auto-transcribe all renamed files if configured
- Single-level undo: stores last batch mapping in memory, can revert entire batch

#### Chapter Operations
- **Rename chapter label**: change display name for entire chapter (renames all files)
- **Swap chapters**: exchange numeric prefixes of two chapters (all files renamed)
- **Split chapter**: select chapter + split point → divides into two chapters, renumbers sequences

#### Gling / Edit Prep Tool
- Global Gling dictionary (from config)
- Project-specific Gling dictionary (from state file)
- Edit interface: add/remove words
- Export to Gling AI format

#### Constraints
- Bulk rename undo: single array, replaced on every batch operation (not unlimited history)
- Sequence renumber: starts from configured `sequenceStart` value

---

### 5.13 Edit Prep

**What it is**: Shows project info, edit folder status, and Gling AI dictionary management.

#### Display
- Project code + name
- Recordings summary: count, total size, sample list
- Edit folder status: `edit-1st` / `edit-2nd` / `edit-final` — ✓ exists / ✗ missing
- Gling dictionary: merged global + project-specific, sorted alphabetically
- Edit interface for dictionary words

#### Actions
- **Create all edit folders**: batch create `edit-1st`, `edit-2nd`, `edit-final`
- **Create individual folder**: per-folder create button
- **Edit Gling dictionary**: add/remove project-specific words
- **Export to Gling**: send merged dictionary to Gling AI service

#### Background Behaviour
- Dictionary merging: global (config.json) + project (state file) → deduplicated + sorted
- State file updated when project dictionary edited

---

### 5.14 Configuration & Settings

**What it is**: Full settings panel. Many integrations. Complex but well-organised.

#### Sections

**Watch Directory**
- Path input with `~` support + folder browser
- Status indicator: exists / not-found / checking
- Save → restart file watcher

**Projects Structure**
- `projectsRootDirectory`: parent folder of all projects
- `activeProject`: current project folder name
- Folder browser for each
- Derived full path shown
- Save → restart watchers

**Image Source Directory**
- For incoming images (default: `~/Downloads`)
- Save → restart watcher

**Common Names**
- Predefined names for rename dialog (e.g., "intro", "outro", "cta")
- Per-name config: display name, value, auto-sequence (bool), suggest-tags (list), chapter filter (all or min/max)
- Add/edit/remove inline
- These names appear in the rename dialog dropdown

**Available Tags**
- Tags available for recording filenames
- Add/edit/remove inline
- Shown as multi-select in rename dialog
- Default: `cta`, `endcards`

**Shadow Configuration**
- Resolution dropdown: 480p / 360p / 240p (default) / custom
- Generate current project button
- Generate all projects button

**Relay Configuration**
- Relay directory path
- Relay enabled toggle
- Machine role: `creator` / `editor`
- Setup guide (shown if not configured)

**Whisper Configuration**
- Binary path (default: `~/.pyenv/shims/mlx_whisper`)
- Model (default: `mlx-community/whisper-large-v3-turbo`)
- Language (ISO-639-1, default: `en`)
- Test button → verifies binary responds + returns version

**Disk Thresholds (per column)**
- Per-column: faint / amber / red threshold values
- Stage penalty multiplier (0.0–1.0, default 0.5 for published/archived)

**Hold Configuration**
- Holding SSD path (default: `/Volumes/T7/youtube-HOLDING`)
- Test button: checks if mounted + writable

**Poem WUI**
- URL to external Poem WUI service (default: `http://localhost:5041`)
- Brand config path

**Watcher Status**
- List of active watchers + paths
- Restart button per watcher

#### Background Behaviour
- Path expansion: `~` → home directory, cross-platform
- Path validation: detect format mismatch (e.g. Windows path on Unix). Show warning + suggestion.
- Config migration: if old `projectDirectory` exists, auto-migrate to `projectsRootDirectory` + `activeProject` on first load
- Config save → restart relevant watchers immediately
- Whisper test: runs `mlx_whisper --version`, returns version string

---

### 5.15 API Explorer

**What it is**: In-app browser for all API endpoints. Useful for development and debugging.

#### Display
- Left sidebar: grouped endpoint list (collapsible by category: Projects, Recordings, Transcriptions, Assets, Thumbs, Relay, etc.)
- Right panel: selected endpoint inspector
  - HTTP method, path, description
  - Parameters table: name, type (path/query/body), data type, required, example, enum values
  - Request body template for POST/PUT
  - Response schema/example
- Input fields for parameters (text/number/checkbox/dropdown per type)
- Auto-populate current project code for `code`/`projectCode` params
- Response viewer: status code, JSON pretty-printed, raw option
- Request history: last 10, click to re-run
- Copy CURL button

#### Background Behaviour
- Endpoint registry: centralised in `shared/apiRegistry.ts` (or equivalent). Single source of truth.
- Parameter auto-population from active project context.
- Request builder: replaces path params, appends query params, serialises JSON body.

---

### 5.16 Poem WUI Integration

**What it is**: Integration with external YouTube Launch Optimizer (Poem WUI service).

#### Display
- Status: connected / not connected to configured URL
- Chapter data export button
- Embedded/linked view of Poem WUI

#### Actions
- **Export chapter data**: sends project chapter list, titles, durations, SRT to Poem WUI service
- **View optimized metadata**: receives SEO-optimized titles, descriptions, tags

#### Background Behaviour
- Collects all chapters: titles, durations, SRT paths
- Sends as structured payload to configured Poem WUI URL
- Receives optimized metadata for export

---

### 5.17 Mockups Page

Reference page showing historical design explorations and current mockups. Not critical to core workflow.

- Links to Mochaccino design files
- Design variant comparisons (read-only)
- Useful for understanding UX decisions

---

## 6. Real-time Events

The following WebSocket events must be implemented. Client invalidates corresponding query cache on receipt.

| Event | Trigger | Payload |
|-------|---------|---------|
| `recordings:changed` | Recordings folder added/renamed/deleted | — |
| `transcripts:changed` | Transcript folder changed | — |
| `projects:changed` | Project folder added/removed | — |
| `inbox:changed` | Inbox file added/removed | — |
| `assets:incoming-changed` | New/deleted incoming image | — |
| `assets:assigned-changed` | Assigned image added/deleted | — |
| `thumbs:changed` | Thumbs reordered/added/deleted | — |
| `thumbs:zip-added` | New ZIP in Downloads | — |
| `relay:changed` | Relay push/collect/promote | `{ event, projectCode, subfolder, filename }` |
| `transcription:queued` | Job added to queue | `{ jobId, position }` |
| `transcription:started` | Job started | `{ jobId, videoPath }` |
| `transcription:progress` | Text streaming | `{ jobId, text }` |
| `transcription:complete` | Job finished | `{ jobId, transcriptPath }` |
| `transcription:error` | Job failed | `{ jobId, error }` |
| `chapters:generating` | Chapter being created | `{ chapter, current, total }` |
| `chapters:generated` | Single chapter done | `{ outputFile, srtFile? }` |
| `chapters:complete` | All chapters done | `{ generated[], errors? }` |
| `regen:shadows:progress` | Shadow generation progress | `{ current, total, filename }` |
| `regen:shadows:complete` | Shadows done | `{ completed, failed, errors? }` |
| `regen:all:started` | Bulk regen started | — |
| `regen:all:progress` | Bulk regen step progress | `{ step, current, total }` |
| `regen:all:complete` | Bulk regen done | `{ shadows, transcripts, chapters }` |

---

## 7. Naming Conventions

These are the primary keys of the system. Everything is keyed off base filenames.

### Recording Filename
```
{chapter:2d}-{sequence:1d}-{label}.{ext}
```
- chapter: `01`–`99`
- sequence: `1`–`9`
- label: kebab-case alphanumeric only
- ext: `.mov` (primary), `.mp4` (supported)
- Example: `01-1-intro.mov`, `02-3-explanation-of-things.mov`

### Image Filename
```
{chapter:2d}-{sequence:1d}-{order:1d}{variant?}-{label}.{ext}
```
- order: `1`–`9`
- variant: optional single letter `a`–`z`
- Example: `10-6-1a-bigpicture.png`, `05-2-3-shortlabel.jpg`

### Prompt Filename
- Same as image, `.txt` extension
- Content: free-form text

### Transcript Filename
- Base name from recording + `.txt`
- Also: `.srt` (timed), `.json` (word-level)
- Example: `01-1-intro.txt`, `01-1-intro.srt`

### Chapter Recording Filename
```
{chapter:2d}-{label}.mov
```
- Also generates: `{chapter:2d}-{label}.srt`

### Project Code
```
[a-zA-Z]\d{2}(-[a-z0-9-]*)?
```
- Example: `b72`, `b72-awesome`, `c43`
- Stored lowercase

### State File
- Path: `~/.flihub/{projectCode}.state.json`
- Contains: safe files map, parked files map, Gling dictionary, chapter overrides

---

## 8. Non-Functional Requirements

### Performance
- File watcher debounce: 200–500ms (per watcher type)
- Project list scan: fast path for last-modified sort; full stats only on-demand or in background
- Disk usage scan: background operation with progress. Not blocking the UI.

### Reliability
- Never silently fail on file operations. Surface errors in the UI where the action was taken.
- Config save is atomic (write to temp, rename). Never corrupt config.json.
- Transcription queue survives project switches (cross-project safety).

### Multi-machine
- Server runs on each machine independently
- Relay uses rsync over Tailscale/local network
- No shared database between machines

### Dev Server Management
- Check ports before starting: `lsof -i :5100/5101`. If listening, do NOT restart.
- Use Overmind (or equivalent) for persistent process management.

### Logging
- Transcription stdout/stderr: stream to clients via socket, store to file for debugging
- Telemetry: append `{ type, timestamp, ...data }` to `telemetry.jsonl` for performance analysis

---

## 9. v2 Improvements

These are clear improvements identified from codebase analysis. Implement them but do not let them block v2 parity.

1. **Better project stage visualisation**: Current stage pills are small and hard to distinguish at scale. Use distinct colours per stage with a consistent legend.

2. **Transcript progress in project list**: The `%` is useful but a visual bar would communicate urgency better at a glance.

3. **Relay sync status**: Current badges (↑↓) are correct but small. Consider a more prominent "needs attention" signal for diverged projects.

4. **Config panel UX**: Currently one long page. Break into logical groups with collapsible sections. Most users only need Watch Dir + Projects.

5. **Recordings view density**: High information density is good, but the current table can feel cramped on smaller screens. Consider a compact/comfortable toggle.

6. **Error states**: Current error handling is good. v2 should add retry buttons on failed transcription jobs without needing to re-queue manually.

7. **Hold verification UI**: The T7 ⚠ badge is subtle. A more prominent "action required" state for incomplete offloads would reduce confusion.

8. **Keyboard shortcuts**: Add keyboard navigation to high-frequency actions (rename, safe, next/prev recording in Watch).

---

## 10. Out of Scope for v2

These features exist in v1 but are low-priority, unfinished, or speculative. Do not include in v2 until user need is confirmed.

- FR-134: Inconsistency detection & auto-fix (speculative)
- FR-133: File status indicators (optional visibility tool)
- FR-132: Dual transcription system with progress tracking (never started)
- FR-135: Chapter tools — Move, Swap, Undo (marked LOW)
- FR-34 Phase 3: LLM-based chapter timing verification (complex, limited value)
- NFR-86: Git leak detection
- Developer routes (telemetry endpoint, raw config endpoint): include but don't surface in UI

---

*Generated from FliHub v1 codebase audit, git history analysis (50 commits), and AppyDave brand system extraction. April 2026.*
