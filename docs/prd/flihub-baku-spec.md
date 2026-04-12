# FliHub v2 --- Complete Baku Build Specification

---

## 1. Baku Handover Prompt

> Paste this section directly into Baku to kick off the build. It is self-contained.

---

**Build me a full-stack application called FliHub.**

FliHub is a video production asset management system for a solo YouTube creator on macOS. It manages the lifecycle of video projects: watching for new screen recordings dropped by Ecamm Live, letting the user name and organise them using a strict filename convention, running AI transcription (MLX Whisper), managing image assets and thumbnails, and syncing files with remote video editors via rsync over Tailscale.

**Core behaviour:**
- There is always one "active project". Every tab and panel operates on that project. Switching the active project changes what all tabs display.
- The filesystem IS the database. Recording metadata lives in the filename (`{chapter}-{sequence}-{name}.mov`). Project state lives in a JSON file per project. Global config lives in `server/config.json`. There is no database.
- File changes are detected in real time via filesystem watchers and propagated to all connected clients over WebSocket. The UI never polls --- it reacts to socket events by invalidating query caches.
- The app runs a Node/Express backend that performs all file operations (rename, move, rsync, ffmpeg, whisper). The React frontend is a view layer that talks to the API and listens to WebSocket events.

**Design system (AppyDave brand --- warm editorial Swiss-grid aesthetic):**
- Background: `#faf5ec` (warm cream). Surface: `#f0ebe4`. Linen: `#e8e0d4`. Border: `#d4cdc4`.
- Primary text: `#342d2d` (dark brown). Muted text: `#7a6e5e`. Never use pure black `#000`.
- Primary CTA: `#ffde59` (yellow) with `#342d2d` text. Secondary: transparent with `1px solid rgba(52,45,45,0.25)`.
- Accent: `#c8841a` (amber) for sequence numbers and status indicators only --- never as primary CTA.
- Headings: Oswald (uppercase, bold). Body: Roboto. Labels/pills: Oswald 10-11px uppercase with wide letter-spacing.
- No glassmorphism. No dark mode as default. No SaaS-blue palettes. Swiss grid with 1px column rules at `rgba(52,45,45,0.12)`.

**Navigation tabs (in order):** Incoming, Recordings, Watch, Transcriptions, Inbox, Assets, Thumbs, Manage, Projects, Config, API Explorer.

**Key integrations (these talk to the OS, not a database):**
- File system watching (chokidar equivalent) for recordings, transcripts, images, thumbnails, inbox, relay, project folders.
- MLX Whisper subprocess (`~/.pyenv/shims/mlx_whisper`) for AI transcription.
- ffmpeg subprocess for chapter recording concatenation and shadow video generation.
- rsync for relay sync between machines.

**Phased build:**
- Phase 1: Project management + Recordings + Incoming (minimum useful app)
- Phase 2: Transcriptions + Watch + Assets + Thumbnails + Inbox
- Phase 3: Relay collaboration + Hold/Archive + Shadows
- Phase 4: Manage panel bulk ops + Edit Prep + Config + API Explorer

The full specification with every screen, data model, interaction, validation rule, and WebSocket event is in this document below. Refer to the numbered sections for detail.

---

## 2. What This Application Is

FliHub is a **video production asset management system** for a solo content creator (David) who records screen-capture tutorials on Mac using Ecamm Live and collaborates asynchronously with video editors in the Philippines via rsync over Tailscale.

**The mental model**: One active project at a time. Everything in the UI targets that project. All tabs work on the same project folder. The filesystem is the database --- filenames are metadata, folders are categories, and file presence is state.

**Primary user**: The creator. Records videos, names them, transcribes them, organises assets, pushes to editors.

**Secondary users**: Remote editors who collect recordings from relay, edit in DaVinci Resolve, and push finished edits back.

**What FliHub does NOT do**:
- Edit video (that is DaVinci Resolve / Gling)
- Perform transcription itself (it spawns MLX Whisper as a subprocess)
- Host or stream video (all files are local disk paths; the server serves video for in-browser preview only)
- Publish to YouTube (export tools prepare files; the actual upload is manual)
- Run on Windows in practice (macOS-first; cross-platform path support is partial)

### Design Principles

These are the DNA of the application. They are not aspirational --- they are enforced.

1. **One action, one click** --- collapse multi-step workflows into a single operation. No confirmation dialogs unless the operation is destructive.
2. **State over deletion** --- safe, parked, and trashed recordings are never permanently deleted by accident. Files move to subfolders. Only explicit user confirmation triggers real deletion.
3. **Surface complex state visually** --- disk usage, sync status, transcript %, relay divergence. Make it scannable at a glance without clicking into details.
4. **Error transparency** --- show errors where the action was taken. Never silently fail. Never bury errors in logs.
5. **Real-time, not polling** --- file changes propagate instantly via WebSocket. The UI never feels stale.
6. **Cross-project safety** --- operations on transcripts, shadows, and relay must always derive their target from the source file path, not the currently active project. Never silently write to the wrong project.
7. **Validate at the boundary** --- naming rules are enforced at input, not on save. Show the constraint before the user hits a wall.

---

## 3. Design System

### 3.1 Colour Palette

| Token | Hex | Usage |
|---|---|---|
| `brand-brown` | `#342d2d` | Primary text, structure, borders |
| `brand-gold` | `#ccba9d` | Secondary warm accent, hover states |
| `brand-yellow` | `#ffde59` | Primary CTA buttons, key accents |
| `brand-amber` | `#c8841a` | Sequence numbers, status accents. Never primary CTA. |
| `brand-muted` | `#7a6e5e` | Supporting text, labels, secondary content |
| `brand-near-white` | `#faf5ec` | Default background for the entire application |
| `brand-surface` | `#f0ebe4` | Card backgrounds, alternating table rows |
| `brand-linen` | `#e8e0d4` | Tertiary warm surface, row hover |
| `brand-border` | `#d4cdc4` | Dividers, separators, table borders |
| `brand-chrome` | `#1a1515` | Dark sections (CTA bars, footers) |
| `brand-dark-surface` | `#25201e` | Dark section backgrounds |

**Hard rules:**
- `#faf5ec` is always the page background.
- `#ffde59` is the only primary action colour. Use it for CTA buttons only.
- `#c8841a` is for sequence numbers and accent indicators only.
- Pure black (`#000`) is forbidden. Use `#1a1515` instead.
- Dark sections are intentional contrast beats, not a theme toggle.

### 3.2 Typography

| Use | Font | Size | Weight | Letter-spacing | Case |
|---|---|---|---|---|---|
| Hero headings | Oswald | `clamp(72px, 7.5vw, 108px)` | 700 | `-0.02em` | UPPERCASE |
| Section h2 | Oswald | 40px | 700 | `-0.01em` | UPPERCASE |
| Card titles | Oswald | 22px | 600 | `0.02em` | UPPERCASE |
| Labels / pills | Oswald | 10--11px | 400--600 | `0.15--0.3em` | UPPERCASE |
| Stat numbers | Oswald | 44px | 700 | --- | --- |
| Body text | Roboto | 13--15px | 400 | --- | sentence case |
| Button text | Oswald | 10--11px | 500--600 | `0.2em` | UPPERCASE |
| Nav links | Oswald | 10px | 400 | `0.2em` | UPPERCASE |

**Font families**: Oswald (headings, UI chrome), Roboto (body text), Bebas Neue (logo/watermarks only --- not used in the app UI).

### 3.3 Layout

- Max container width: `1280px`, horizontal padding: `40px`.
- Swiss grid: 1px column rules between major layout zones at `rgba(52,45,45,0.12)`.
- Major section padding: `72px` top/bottom. Tighter zones: `48px`.
- Card grids: no gap. Use border-based separation: `1px solid rgba(52,45,45,0.08)`.

### 3.4 Component Specifications

**Primary button**
```
Background: #ffde59
Text colour: #342d2d
Font: Oswald 10-11px uppercase, letter-spacing 0.2em, weight 600
Padding: 14px 28px
Hover: opacity 0.9
Border-radius: 4px
```

**Secondary button (bordered)**
```
Background: transparent
Border: 1px solid rgba(52,45,45,0.25)
Text colour: #342d2d
Font: Oswald 11px uppercase, letter-spacing 0.2em
Padding: 14px 28px
Hover: background rgba(52,45,45,0.04)
Border-radius: 4px
```

**Stage pill / badge**
```
Padding: 3px 10px
Font: Oswald 10px uppercase, letter-spacing 0.15em
Border-radius: 12px (pill shape)
Active: border 1px solid #c8841a, colour #c8841a
Inactive: border 1px solid rgba(52,45,45,0.12), colour #7a6e5e
```

**Stage badge colours** (used in project list and drawer):

| Stage | Background | Text |
|---|---|---|
| planning | `#f3e8ff` (purple-100) | `#7c3aed` (purple-700) |
| recording | `#fef9c3` (yellow-100) | `#a16207` (yellow-700) |
| first-edit | `#dbeafe` (blue-100) | `#1d4ed8` (blue-700) |
| second-edit | `#bfdbfe` (blue-200) | `#1e40af` (blue-800) |
| ready-to-publish | `#dcfce7` (green-100) | `#15803d` (green-700) |
| published | `#bbf7d0` (green-200) | `#166534` (green-800) |
| archived | `#f0ebe4` (brand-surface) | `#7a6e5e` (brand-muted) |
| shelved | `#fee2e2` (red-100) | `#b91c1c` (red-700) |
| remix | `#ffe4e6` (rose-100) | `#be123c` (rose-700) |

**Section header pattern**
```
Layout: flex row, align baseline, gap 24px, margin-bottom 40px
h2: Oswald 40px bold uppercase
Trailing rule: flex: 1, height: 1px, background rgba(52,45,45,0.12)
Right label: Oswald 11px uppercase 0.25em, colour #7a6e5e, nowrap
```

**Tables**
```
Alternating rows: brand-surface (#f0ebe4) and brand-near-white (#faf5ec)
Column headers: Oswald 10px uppercase 0.2em, colour #7a6e5e
Cell text: Roboto 13px, colour #342d2d
Row hover: brand-linen (#e8e0d4)
Sortable columns: sort icon (asc/desc/none state)
```

### 3.5 Anti-Patterns

Do not use any of the following:
- Glassmorphism or frosted-glass effects
- Pure black `#000` anywhere
- Amber (`#c8841a`) as a primary CTA button colour
- Dark mode as default or as a toggle
- Grid lines outside hero/deliberate zones
- Generic SaaS blue-dominant palettes
- Identical 3-card grids repeated mechanically
- Rounded card corners larger than 4px

---

## 4. Core Concepts and Data Model

### 4.1 Project

A project is a **folder on disk** with a fixed internal structure. The folder name IS the project code.

**Project directory structure:**
```
{projectsRootDirectory}/{projectCode}/
  recordings/               # Named video recordings (.mov/.mp4)
    -safe/                  # Protected recordings (hidden from active view)
    -chapters/              # Generated chapter recordings
    -trash/                 # Soft-deleted recordings
  recording-shadows/        # Low-res proxy videos for editors
  recording-transcripts/    # Whisper output (.txt, .srt, .json)
  assets/
    images/                 # Assigned image assets + prompts (.txt)
    thumbs/                 # YouTube thumbnails
  inbox/
    raw/                    # Dumps, notes, links
    dataset/                # Structured data
    presentation/           # HTML visual assets
  final/                    # Final edited video + SRT
  s3-staging/               # Files shared with editor via S3
  .flihub-state.json        # Per-project state (safe/parked recordings, Gling dictionary)
```

**Project code format**: `[a-zA-Z]\d{2}(-[a-z0-9-]*)?` --- e.g., `b72`, `b72-awesome`, `c43`. Always stored lowercase.

**Project stages** (in pipeline order):

| Order | Stage | Label | Description |
|---|---|---|---|
| 1 | `planning` | Plan | Preparing content outline and script |
| 2 | `recording` | REC | Actively recording video segments |
| 3 | `first-edit` | 1st Edit | Initial rough cut and assembly |
| 4 | `second-edit` | 2nd Edit | Refining edit and adding polish |
| 5 | `ready-to-publish` | Ready | Approved and ready to upload |
| 6 | `published` | Published | Live on YouTube |
| 7 | `archived` | Archived | Completed and archived |
| 8 | `shelved` | Shelved | Abandoned --- never published |
| 9 | `remix` | Remix | Being repackaged into new content |

Note: `review` exists as a valid stage for backward compatibility but is excluded from the default pipeline. Projects with `review` stage display correctly but the stage does not appear in dropdowns or filter pills.

**Stage auto-detection heuristic** (can be overridden manually):
- `recording`: has recordings, no transcripts
- `first-edit`: has recordings + transcripts
- `second-edit`: has `edit-1st/` folder with content
- `ready-to-publish`: has `edit-2nd/` folder with content
- Default: `planning` if nothing detected

Manual overrides are stored in config as `projectStageOverrides[projectCode]`. Setting override to `auto` re-enables auto-detection.

### 4.2 Recording

A recording is a `.mov` or `.mp4` file in a project's `recordings/` folder. The filename IS the metadata:

```
{chapter:2d}-{sequence}-{name}-{tags}.{ext}
```

| Field | Format | Constraint | Example |
|---|---|---|---|
| chapter | 2 digits, zero-padded | `01`--`99` | `01`, `10` |
| sequence | 1+ digits | `1`--`9` (creation), lenient parsing accepts more | `1`, `3` |
| name | kebab-case | lowercase letters, numbers, periods, hyphens | `intro`, `demo-setup` |
| tags | uppercase, hyphen-separated | optional; must contain at least one letter | `-CTA`, `-CTA-SKOOL` |
| ext | file extension | `.mov` (primary), `.mp4` (supported) | `.mov` |

**Examples**: `01-1-intro.mov`, `02-3-explanation-of-things-CTA.mov`, `10-1-bmad-overview-SKOOL.mov`

**Recording states** (stored in `.flihub-state.json`, keyed by filename):
- **Normal**: visible in active view, eligible for editing
- **Safe**: hidden from active view, moved to `recordings/-safe/`. Protected from accidental rename/delete.
- **Parked**: visible but marked as excluded from current edit. Stays in place. Has optional annotation text.
- **Trashed**: moved to `recordings/-trash/`. Soft delete.

### 4.3 Transcript

Transcription output files in `recording-transcripts/`, keyed by base filename:
- `{basename}.txt` --- plain text (this is what counts as "transcribed")
- `{basename}.srt` --- timed subtitles
- `{basename}.json` --- word-level timestamps

Example: recording `01-1-intro.mov` produces `01-1-intro.txt`, `01-1-intro.srt`, `01-1-intro.json`.

### 4.4 Image Asset

Image files in `assets/images/`, named:
```
{chapter:2d}-{sequence:1d}-{order:1d}{variant?}-{label}.{ext}
```

| Field | Format | Example |
|---|---|---|
| chapter | 2 digits | `05` |
| sequence | 1 digit | `2` |
| order | 1 digit | `3` |
| variant | optional single letter a--z | `a` |
| label | kebab-case | `workflow-diagram` |
| ext | `.png`, `.jpg`, `.jpeg`, `.webp` | `.png` |

**Example**: `05-2-3a-workflow-diagram.png`

Each image can have a paired **prompt file** (same base name, `.txt` extension) containing the AI generation prompt used to create it.

### 4.5 Thumbnail

YouTube thumbnails in `assets/thumbs/`, imported from ZIP files. Numbered sequentially: `01_{originalname}.png`, `02_{originalname}.jpg`.

### 4.6 Shadow File

Low-resolution proxy video in `recording-shadows/`. Same filename as the source recording. Default resolution: 240p. Preserves audio.

### 4.7 Chapter Recording

Concatenated video of all recordings in a chapter. Output to `recordings/-chapters/`. Named `{chapter:2d}-{label}.mov` with matching `.srt`.

### 4.8 Configuration

All config lives in `server/config.json`. No database. Key fields:

```typescript
{
  watchDirectory: string;            // Where Ecamm Live saves recordings (e.g., ~/Movies/Ecamm Live/)
  projectsRootDirectory: string;     // Parent folder of all projects
  activeProject: string;             // Currently selected project folder name
  fileExtensions: string[];          // Supported video extensions
  availableTags: string[];           // Tags available for recording filenames (e.g., ["CTA", "SKOOL"])
  commonNames: CommonName[];         // Quick-select names for rename dialog
  imageSourceDirectory: string;      // Where to look for incoming images (default: ~/Downloads)
  projectPriorities: Record<string, 'pinned'>;     // Pinned projects
  projectStageOverrides: Record<string, ProjectStage>; // Manual stage overrides
  chapterRecordings: ChapterRecordingConfig;
  shadowResolution: number;          // Shadow video resolution (default: 240)
  glingDictionary: string[];         // Global Gling AI dictionary words
  poemWuiUrl: string;                // External Poem WUI service URL
  relayDirectory: string;            // Relay sync directory path
  relayEnabled: boolean;             // Feature gate for relay
  machineRole: 'recorder' | 'editor'; // Machine role
  holdingPath: string;               // External SSD path (default: /Volumes/T7/youtube-HOLDING)
  whisperBinary: string;             // Path to mlx_whisper (default: ~/.pyenv/shims/mlx_whisper)
  whisperModel: string;              // Whisper model name
  whisperLanguage: string;           // ISO-639-1 language code (default: en)
  diskThresholds: DiskThresholds;    // Per-column threshold config for disk observability
}
```

**CommonName** structure:
```typescript
{
  name: string;                          // Display name and value (e.g., "intro")
  autoSequence?: boolean;                // Reset sequence to 1 when selected
  suggestTags?: string[];                // Auto-suggest these tags
  chapterFilter?: 'all' | { min?: number; max?: number }; // Chapter visibility filter
}
```

### 4.9 Project State File

Per-project state at `.flihub-state.json` inside the project folder:

```typescript
{
  version: 1,
  recordings: {
    "01-1-intro.mov": {
      safe?: boolean,
      parked?: boolean,
      annotation?: string
    }
  },
  glingDictionary?: string[],
  editManifest?: {
    "edit-1st": { lastCopied: string | null, files: ManifestFile[] },
    "edit-2nd": { lastCopied: string | null, files: ManifestFile[] },
    "edit-final": { lastCopied: string | null, files: ManifestFile[] }
  }
}
```

### 4.10 ProjectStats

Computed on load for each project. This is the primary data structure for the project list and drawer:

```typescript
{
  code: string;
  path: string;
  priority: 'pinned' | 'normal';
  totalFiles: number;              // All files in recordings/
  chapterCount: number;            // Unique chapter numbers
  transcriptCount: number;         // Matching .txt files
  transcriptPercent: number;       // (matched / totalFiles) * 100
  transcriptSync: { matched, missingCount, orphanedCount };
  stage: ProjectStage;
  createdAt: string | null;
  lastModified: string | null;
  totalDuration: number | null;    // Sum of video durations in seconds
  imageCount: number;
  thumbCount: number;
  hasInbox: boolean;
  hasAssets: boolean;
  hasChapters: boolean;
  inboxCount: number;
  chapterVideoCount: number;
  shadowCount: number;
  hasFinal: boolean;
}
```

### 4.11 DiskSizeData

Per-project disk usage breakdown:

```typescript
{
  rec: number;        // bytes --- recordings/ folder
  trash: number;      // bytes --- -trash/ folder
  shadows: number;    // bytes --- recording-shadows/
  other: number;      // bytes --- everything else
  rRec: number;       // bytes --- relay recordings
  r1st: number;       // bytes --- relay edit-1st
  r2nd: number;       // bytes --- relay edit-2nd
  total: number;      // bytes --- sum of all
  calculatedAt: string;
  heldAt?: string;           // ISO timestamp when last offloaded
  holdingPath?: string;      // Path on SSD
}
```

### 4.12 Machine Role

Every FliHub instance is either `recorder` (creator) or `editor`. The role determines which UI panels and actions are visible:

- **Recorder**: sees Incoming recordings, naming controls, transcription, relay push, archive/promote
- **Editor**: sees relay collect, shadow previews, edit delivery tools. Hides archive/promote.

If `machineRole` is absent from config, default to `recorder`.

---

## 5. Application Structure

### 5.1 Navigation

Top navigation bar with tab buttons. URL hash routing (`#recordings`, `#projects`, etc.).

**Tabs (in order):**

| Tab | Hash | Description | Phase |
|---|---|---|---|
| Incoming | `#incoming` | New recordings from Ecamm Live | 1 |
| Recordings | `#recordings` | Named recordings, grouped by chapter | 1 |
| Watch | `#watch` | Full-screen video player with transcript sync | 2 |
| Transcriptions | `#transcriptions` | Transcription queue and status | 2 |
| Inbox | `#inbox` | Project inbox file browser | 2 |
| Assets | `#assets` | Image assets and prompts | 2 |
| Thumbs | `#thumbs` | YouTube thumbnail management | 2 |
| Manage | `#export` | Bulk operations, relay, sync, regen tools | 3/4 |
| Projects | `#projects` | Project browser and management | 1 |
| Config | `#config` | Settings panel | 4 |
| API Explorer | `#api-explorer` | In-app API browser | 4 |

### 5.2 Header Bar

Always visible. Contains:
- App logo/name (left)
- Active project indicator: project code + stage badge + "Change" link
- Navigation tabs (centre)
- Status indicators (right): Connection (WebSocket), Relay (if enabled), SSD mount status
- Open Folder dropdown: quick access to all project subfolders in Finder

### 5.3 Active Project Concept

The active project is a global context. It is stored in `server/config.json` (not just client state) because the server uses it for file watchers and path derivation.

When the user switches the active project:
1. Config is updated on the server
2. All file watchers restart for the new project's directories
3. All client query caches are invalidated
4. All tabs re-render with the new project's data

---

## 6. Phase 1 Features --- Projects + Recordings + Incoming

This is the minimum useful application. A user can manage projects, receive new recordings, name them, and organise them.

### 6.1 Projects Panel

**URL**: `#projects`

**What the user sees on arrival:**
A full-width filterable table of all project folders found in `projectsRootDirectory`. Each row represents one project folder.

**Table columns:**

| Column | Content |
|---|---|
| Star | Pin/unpin toggle (star icon). Pinned projects sort to top. |
| Code | Project code extracted from folder name (e.g., `b72`). Bold. |
| Name | Extracted descriptive name (e.g., `awesome-project`). Muted if absent. |
| Files | Recording count badge |
| Stage | Stage pill with colour (see 3.4 stage badge colours) |
| Transcript % | Progress indicator (number or micro bar) |
| Modified | Last modified date, relative format ("2d ago") |
| Disk | Total disk usage, colour-coded by threshold |

**Sorting**: Click column header to sort. Default: pinned first, then by last modified descending.

**Toolbar (above table):**
- Search box: live filter by project code or name
- Stage filter pills: one per stage in `STAGE_ORDER`. Click to toggle filter. Multiple stages can be active simultaneously. Showing count of filtered results ("X of Y projects").
- Smart preset buttons:
  - **Needs Attention**: has recordings but no transcripts (missingCount > 0)
  - **Dead**: 2 or fewer files AND last modified > 30 days ago
  - **Ready to Edit**: transcript % = 100% AND stage is still `recording`

**Row interaction:**
- Click row: opens Project Drawer (slide-out panel from right edge, 40% width)
- Double-click or "Set Active" button: sets this as the active project

**Project Drawer** (40% width slide-out from right):

The drawer is a diagnostic and action panel for the selected project.

*Stats grid (top):*
- Recordings: count
- Chapters: count
- Transcript %: percentage with visual bar
- Images: count
- Thumbs: count
- Shadows: count

*Progress checklist:*
- Has recordings (green check / red x)
- Has transcripts (green check / red x)
- Has chapters (green check / red x)
- Has final video (green check / red x)

*Health assessment:* A single computed sentence like "Project is healthy --- all recordings transcribed, chapters generated." or "Needs attention --- 3 recordings missing transcripts."

*Stage override:* Dropdown selector. Options: Auto-detect + all 9 stages. Current stage highlighted. Changing triggers API call to update `projectStageOverrides` in config.

*Priority toggle:* Star icon to pin/unpin.

*Quick actions:*
- Open in Finder (opens project folder in macOS Finder)
- Copy path to clipboard
- Set as Active Project
- Copy Project Transcript (fetches combined transcript text, copies to clipboard, shows character count toast)
- Transcribe All (queues all recordings missing transcripts; shows count)
- Empty Trash (confirmation required; shows trash file count and size)

*Disk usage breakdown:*
Per-subfolder sizes: recordings, trash, shadows, other, relay (rec/1st/2nd), total. Colour-coded by threshold (faint grey / amber / red).

*Hold status* (if configured):
Location indicator (local-only / holding-only / both / unknown). Path on SSD. Last sync timestamp. File count verification.

*Delete project button:* Opens confirmation modal. User must type the exact project code to confirm. Permanently removes the project folder.

**Create project:**
A "New Project" button in the toolbar. Opens inline form: project code input (validated against `[a-zA-Z]\d{2}(-[a-z0-9-]*)?`), creates folder with `recordings/` subfolder.

### 6.2 Incoming Panel

**URL**: `#incoming`

**What the user sees on arrival:**
Cards for each video file found in the configured `watchDirectory` (where Ecamm Live drops recordings). If no files, a clean empty state: "No incoming recordings. Files dropped in {watchDirectory} will appear here automatically."

**Per-file card:**
- Filename
- File size (formatted: MB/GB)
- Video duration (if detectable)
- Timestamp (when file appeared)
- "Name & File" button (primary CTA, yellow)
- "Discard" button (secondary, opens confirmation)

**Naming flow** (when user clicks "Name & File"):
1. A naming dialog appears with:
   - **Chapter** selector: 2-digit input (`01`--`99`). Pre-filled with suggested next chapter.
   - **Sequence** selector: auto-calculated (next available for chosen chapter). Editable.
   - **Name** input: free text (validated as kebab-case) OR dropdown of `commonNames` from config, filtered by chapter range.
   - **Tags** multi-select: from `availableTags` config list (e.g., CTA, SKOOL).
   - **Preview**: shows the resulting filename before confirming.
2. On confirm: server moves file from `watchDirectory` to `{project}/recordings/{chapter}-{sequence}-{name}-{tags}.mov`.
3. Auto-transcription is queued if `autoTranscribeOnRename` is configured.
4. A low-resolution shadow file is generated in `recording-shadows/`.
5. The file disappears from Incoming and appears in Recordings.

**Suggested naming logic:**
- Scans existing recordings in the active project
- Suggests next chapter = highest existing chapter
- Suggests next sequence = highest sequence in that chapter + 1
- Common names filtered by `chapterFilter` config

**Recently Named Strip:**
Bottom strip showing last 5 renames. Each entry shows: original filename, new filename, timestamp, and an Undo button. Entries expire after 10 minutes. Undo restores the file to its original path.

**Background behaviour:**
- File watcher on `watchDirectory`. Fires on `add` and `unlink`. Debounced 200ms.
- WebSocket event `file:new` when a new file is detected.
- WebSocket event `file:deleted` when a file is removed (renamed or discarded).

### 6.3 Recordings Panel

**URL**: `#recordings`

**What the user sees on arrival:**
All recordings in the active project's `recordings/` folder, grouped by chapter number and sorted by sequence within each chapter.

**Chapter header:**
- Chapter number badge (amber `#c8841a`, bold)
- Derived chapter label (from first file's name field)
- File count: "X recordings" (with breakdown: active / safe / parked if any)
- Total duration for chapter
- Expand/collapse toggle

**Per-recording row:**

| Element | Detail |
|---|---|
| Chapter badge | 2-digit, amber |
| Sequence number | Bold |
| Name | The kebab-case name, displayed as title case |
| Tags | Pill badges per tag |
| File size | Formatted |
| Duration | mm:ss format |
| Transcript status | Icon: none / queued / transcribing / complete / error |
| Safe indicator | Eye-slash icon if safe |
| Parked indicator | Pause icon if parked, with annotation on hover |
| Shadow status | Small indicator if shadow exists |

**Per-recording actions (context menu or action buttons):**
- **Rename**: opens rename dialog (same as Incoming naming, but pre-filled with current values)
- **Move to Safe**: moves to `recordings/-safe/`, updates state file. Disappears from active view.
- **Restore from Safe**: moves back to `recordings/`. Reappears in active view.
- **Park**: marks as excluded from current edit. Optional annotation input. File stays in place.
- **Unpark**: removes parked status.
- **Move to Trash**: moves to `recordings/-trash/`. Soft delete.
- **Play**: opens video in Watch tab, seeking to this recording.
- **View Transcript**: modal with full text + copy button.
- **Copy Transcript**: copies plain text to clipboard.
- **Copy SRT**: copies .srt content to clipboard.
- **Queue Transcription**: queues this recording for transcription (skips if .txt already exists).

**Per-chapter actions:**
- **Select all in chapter**: batch checkbox
- **Rename chapter label**: updates the name portion of all files in the chapter
- **Generate chapter recording**: concatenates all recordings in this chapter into a single video

**Rename validation rules (enforced at input):**
- Chapter: exactly 2 digits, `01`--`99`
- Sequence: 1+ digits, starting from `1`
- Name: must match `/^[a-z0-9.]+(-[a-z0-9.]+)*$/` (kebab-case with periods allowed)
- Tags: from the configured list only
- The preview filename updates in real-time as the user types

**Rename side effects:**
- If a matching `.srt` file exists, it is also renamed
- If `autoTranscribeOnRename` is configured, transcription is queued
- Rename is blocked if a transcription job is active or queued for this file (show error message)

**Background behaviour:**
- File watcher on `recordings/` and `recording-shadows/`. Debounced 200ms. Emits `recordings:changed`.
- Client invalidates recordings query cache on `recordings:changed` event.

---

## 7. Phase 2 Features --- Transcriptions + Watch + Assets + Thumbnails + Inbox

### 7.1 Transcriptions Panel

**URL**: `#transcriptions`

**What the user sees on arrival:**
Three sections stacked vertically: Active Job, Queue, and Project Transcripts.

**Active Job section:**
- If a transcription is running: filename, status ("Transcribing..."), and a real-time streaming text area showing Whisper output as it arrives.
- If no active job: "No active transcription."

**Queue section:**
- Ordered list of pending jobs with position numbers (1, 2, 3...).
- Per job: filename, file size, duration estimate.
- Queue All Missing button: scans active project, queues every recording without a `.txt` file.

**Recent Jobs section:**
- Last 5 completed or failed jobs. Timestamp, filename, status (complete / error). Error message shown on hover for failed jobs.

**Project Transcripts section:**
- List of all `.txt` files in `recording-transcripts/`.
- Per transcript: filename, size, first ~50 characters preview.
- Progress bar: % of recordings with matching transcripts (matched / totalFiles).
- Actions per transcript: View (modal), Copy, Delete, Open in Editor.

**Per-recording badge (shown in Recordings view, not this panel):**
- Circle: none (empty) / clock (queued) / play (transcribing) / check (complete) / x (error)

**Transcription mechanics:**
- Single-threaded queue: one job at a time, processed sequentially.
- Whisper invoked via configured binary path (default: `~/.pyenv/shims/mlx_whisper`).
- Configured model: `mlx-community/whisper-large-v3-turbo`.
- Configured language: `en`.
- Outputs: `.txt`, `.srt`, `.json` in `recording-transcripts/`.
- **Cross-project safety**: output directory derived from the source video's path, NOT from the active project in config. If user starts transcription on project A then switches to project B, the transcript still saves to project A's folder.
- Real-time streaming: stdout/stderr captured and emitted as `transcription:progress` WebSocket events.
- Watcher on `recording-transcripts/`. Debounced 300ms. Emits `transcripts:changed`.

### 7.2 Watch Panel

**URL**: `#watch`

**What the user sees on arrival:**
A full-width centred video player with chapter/segment navigation panels and transcript sync.

**Video player:**
- Standard HTML5 video controls (play/pause, seek, volume, fullscreen)
- Playback speed presets: 0.75x, 1x, 1.25x, 1.5x, 2x (default: 2x, persisted in localStorage)
- Size toggle: Normal / Large (persisted in localStorage)

**Chapter panel** (hover near right edge, slides out):
- Lists all chapters with file count and total duration per chapter
- Click chapter to play that chapter's first recording

**Segment panel** (hover over a chapter in the chapter panel, cascades):
- Lists all recordings in that chapter with sequence, name, duration
- Click to play that specific recording

**Transcript sync** (below player):
- SRT-based word/phrase highlighting
- Highlights follow video playback position (polled every 50ms)
- Click any word or phrase to seek the video to that timestamp

**Toggles:**
- Show Safe Recordings (includes safe files in chapter/segment lists)
- Show Parked Recordings (includes parked files)

**Auto-behaviour:**
- On page load: auto-selects the last recording (highest chapter + highest sequence)
- Auto-play next segment on completion (configurable)

### 7.3 Assets Panel

**URL**: `#assets`

**What the user sees on arrival:**
Two-panel layout: Incoming (left) and Assigned (right).

**Incoming panel:**
- Scans `imageSourceDirectory` (default: `~/Downloads`) for image files (`.png`, `.jpg`, `.jpeg`, `.webp`).
- Sorted newest first.
- Per image: filename, size, timestamp.
- Shift+Hover: full-size image preview overlay.
- Duplicate detection: MD5 hash. Shows original + duplicates with count.

**Assigned panel:**
- Project's `assets/images/` contents.
- Paired display: image + corresponding prompt (if `.txt` file exists with same base name).
- Filenames parsed: chapter-sequence-order-variant-label displayed as structured info.
- Shift+Hover preview for both image and prompt.

**Incoming actions:**
- **Assign image**: opens assignment dialog with chapter/sequence/order/variant/label selectors. Moves file to `assets/images/` with computed filename.
- **Delete incoming**: removes from Downloads (confirmation required).
- **Detect duplicates**: MD5 match across all incoming, bulk-delete duplicates button.
- **Paste from clipboard**: save clipboard image as PNG to Downloads, then assign.

**Assigned actions:**
- **Edit prompt**: modal with full text editor. Auto-saves on close. Creates file if new.
- **Delete prompt**: clearing content triggers file deletion.
- **Delete assigned image**: removes from `assets/images/` (confirmation required).

**Display controls:**
- Thumbnail size toggle: S (80px) / M (120px) / L (25vw) / XL (35vw). Persisted per-panel in localStorage.

**Background behaviour:**
- Watcher on `imageSourceDirectory`. Emits `assets:incoming-changed`.
- Watcher on `assets/images/`. Emits `assets:assigned-changed`.
- Assignment controls (chapter/sequence/order) persisted to localStorage for quick repeat assignment.
- Next image order API: returns next sequential order number for a chapter-sequence pair.

### 7.4 Thumbnails Panel

**URL**: `#thumbs`

**What the user sees on arrival:**
Two sections: ZIP Import (top) and Imported Thumbnails (bottom).

**ZIP Import section:**
- Lists ZIP files detected in Downloads. Per ZIP: filename, size, timestamp.
- Click ZIP to expand and preview its image contents (grid).
- Shift+Hover for full preview of any image inside the ZIP.
- Checkbox selection (max 3 per import).
- "Import Selected" button: copies selected images to `assets/thumbs/` with sequential numbering.

**Imported Thumbnails section:**
- Numbered grid of thumbnails currently in `assets/thumbs/`.
- Shift+Hover for full preview.
- Drag-and-drop to reorder (renaming files to match new order).
- Delete button per thumbnail (remaining images renumbered).

**Display controls:** Thumbnail size toggle: S / M / L / XL (persisted).

**Background behaviour:**
- Watcher on Downloads for `*.zip`. Emits `thumbs:zip-added`.
- Watcher on `assets/thumbs/`. Emits `thumbs:changed`.
- Import numbering: `01_{originalname}.{ext}`, `02_{originalname}.{ext}`.
- Reorder: atomic rename of all files to match new order.
- Delete: remaining images renumbered to close gaps.

### 7.5 Inbox Panel

**URL**: `#inbox`

**What the user sees on arrival:**
Three-column layout showing the contents of each inbox subfolder.

**Subfolders:**
- `inbox/raw/` --- Dumps, notes, links
- `inbox/dataset/` --- Structured data
- `inbox/presentation/` --- HTML visual assets

**Per subfolder:**
- File list with name, size, modified date.
- Click file to preview: text content inline, images inline, HTML rendered.
- Open file in external viewer button.

**Background behaviour:**
- Watcher on `inbox/`. Debounced 200ms. Emits `inbox:changed`.

---

## 8. Phase 3 Features --- Relay + Hold/Archive + Shadows

### 8.1 Relay Collaboration

**What it is**: Rsync-based file sync between the Creator machine and Editor machines over Tailscale. This is the core collaborative workflow.

**Relay directory structure:**
```
{relayDirectory}/{projectCode}/
  recordings/     # Source footage (Creator pushes)
  edit-1st/       # First edit output (Editor pushes back)
  edit-2nd/       # Second edit output (Editor pushes back)
  final/          # Promoted final edit
```

**UI elements:**

*Header indicator:* Relay status badge in header bar: green dot = enabled and connected, grey = disabled.

*Activity feed:* Last 50 events in a scrollable log. Each event: timestamp, project code, subfolder, action (push/collect/promote), filename.

*Relay Browser (within Manage panel or dedicated sub-tab):*
- Project list sidebar: all projects found in relay directory.
- Main area: per project, shows 4 lanes (recordings, edit-1st, edit-2nd, final).
- Per lane: file count badge, sync status indicator, expandable file drawer.

**Sync status badges:**

| Status | Display | Meaning |
|---|---|---|
| `synced` | Green check | Local and relay file counts match |
| `ahead` | Blue up-arrow + N | Local has more files than relay |
| `behind` | Amber down-arrow + N | Relay has more files than local |
| `diverged` | Amber double-arrow | Both sides have changed independently |
| `local-only` | Grey dash | No relay folder for this subfolder |
| `relay-only` | Grey dash | No local folder for this subfolder |

**Actions:**
- **Push (local to relay)**: Preview (dry-run) shows new/updated/deleted files. Confirm to rsync.
- **Collect (relay to local)**: Pull files from relay. Blocked if local project folder doesn't exist (shows error with instructions to create folder first).
- **Preview**: dry-run diff with no changes applied.
- **Promote to final**: move file from `edit-2nd` to `final` lane.
- **View divergence**: shows file lists for local-only and relay-only files per subfolder.

**Machine role behaviour:**
- `recorder` (creator): sees Push, Archive, Promote, Preview
- `editor`: sees Collect, Preview. Hides Archive and Promote.

**Rsync configuration:**
- Standard excludes: `.DS_Store`, `._*`, `.gitkeep`, `.stfolder`, `.stignore`, `Thumbs.db`
- Preserves timestamps, ownership, permissions
- Uses `--dry-run` flag for preview
- Uses `awaitWriteFinish` with 2-second stability threshold for large video files on the relay watcher

**Background behaviour:**
- Activity log: in-memory ring buffer, max 50 events. Not persisted across server restart.
- WebSocket event `relay:changed` emitted on push/collect/promote with project code, subfolder, and action.

**Constraint**: Philippines machines (Jan, Mary) are Tailscale-only. `.local` hostnames will not resolve. Always use Tailscale hostnames.

### 8.2 Hold/Archive Operations

**What it is**: Offloads project folders to an external SSD (T7) for long-term storage. Full lifecycle: copy, verify, delete local.

**T7 SSD holding areas** (three distinct folders):
- `youtube-HOLDING` --- general offload/hold destination
- `youtube-PUBLISHED` --- archived published videos
- `youtube-FAILS` --- shelved (abandoned) projects

Stage-based routing:
- `shelved` stage projects go to `youtube-FAILS`
- `archived` (post-publish) projects go to `youtube-PUBLISHED`
- General hold goes to `youtube-HOLDING`

**Display (in project list):**
- Hold badge on project row:
  - Green `T7`: on holding SSD only, local copy deleted. Project is safely archived.
  - Amber `T7 warning`: on both local and SSD (in-progress or needs cleanup).

**Display (in project drawer):**
- Location: `local-only` / `holding-only` / `both` / `unknown`
- Path on SSD
- Last sync timestamp
- File count verification: local count vs SSD count, match status
- Relay block warning: if relay has files, offload is blocked

**Actions:**
- **Offload to SSD**: rsync entire project to `{holdingPath}/{projectCode}/`. Requires: SSD mounted + relay synced (no relay files).
- **Verify**: compare file counts + sizes between local and SSD. Shows match/mismatch status.
- **Delete local after hold**: confirmation modal. Shows file counts side-by-side. User must confirm explicitly.
- **Restore from SSD**: rsync files back from SSD to local project folder.
- **Test SSD mount**: checks if configured path exists and is writable.

**Constraints:**
- Relay block: hard block. If relay has files AND relay is enabled, cannot offload. Message: "Relay has N recording files --- sync relay first."
- `both` location is always transitional, never a final resting state.
- Verification must compare file count AND total sizes exactly.

### 8.3 Shadow Files

**What it is**: Low-resolution video proxies for editors to preview before downloading full recordings.

**Actions:**
- **Generate shadows for current project**: creates 240p versions for all missing recordings.
- **Generate all shadows**: scans all projects, generates missing across all.
- **Regenerate specific shadow**: delete existing + recreate.

**Generation mechanics:**
- Source: `{project}/recordings/{filename}.mov`
- Output: `{project}/recording-shadows/{filename}.mov`
- Resolution: configurable (default 240p). Preserves audio.
- Uses ffmpeg subprocess.
- Progress: `regen:shadows:progress` WebSocket event with current/total/filename.
- Skips existing valid shadows.

---

## 9. Phase 4 Features --- Manage + Edit Prep + Config + API Explorer

### 9.1 Manage Panel

**URL**: `#export`

**What the user sees on arrival:**
A sidebar panel with tool tabs: Regen, Gling/Edit Prep, Relay, Sync, AWB/POEM.

**Regen Tool:**
- Recordings grid grouped by chapter.
- Bulk action buttons:
  - Regenerate Shadows (all missing)
  - Regenerate Transcripts (queue all missing)
  - Regenerate Chapters (all chapter recordings)
  - Regenerate All (shadows, then transcripts, then chapters --- sequential)
- Progress bars per regen type. Real-time updates via WebSocket events.

**Bulk Rename Tool:**
- Select recordings in grid, open Bulk Rename dialog.
- Options:
  - Chapter: preserve original or override with new value
  - Label: required input
  - Sequence mode: preserve original sequences OR renumber from start value
  - Tags: optional multi-select
- Preview: shows all filename changes before confirming
- Single-level undo: stores last batch mapping in memory on server. Undo reverts entire batch. Server restart clears undo buffer.

**Chapter Operations:**
- Rename chapter label: change name portion of all files in a chapter
- Swap chapters: exchange numeric prefixes of two chapters (all files renamed)
- Split chapter: select chapter + split-at-sequence point. Files at or after that sequence move to a new chapter (highest + 1). All subsequent chapters cascade their numbers up.

**Gling / Edit Prep Tool:**
- Global dictionary from config + project-specific dictionary from state file.
- Merged, deduplicated, sorted alphabetically.
- Add/remove words inline.
- Export to Gling AI format.

**Relay Tool** (if relay enabled):
- Full relay browser (as described in 8.1).

**Sync Tool:**
- Two channels: `app-code` (the FliHub repo) and `video-project` (active project git repo).
- Per channel: state indicator (clean/dirty/behind/ahead/diverged/conflict/unknown), dirty file count, ahead/behind counts.
- Push: auto-commits with generated message, then pushes.
- Pull: detects merge conflicts, shows conflict files with resolution options (keep-mine / keep-theirs).
- Per-repo lock prevents concurrent git operations.

**AWB/POEM Tool:**
- Status: connected / not connected to configured Poem WUI URL.
- Export chapter data: sends project chapters, titles, durations, SRT to Poem WUI service.
- View optimised metadata: receives SEO-optimised titles, descriptions, tags.

### 9.2 Edit Prep

Part of the Manage panel. Shows:
- Project code + name
- Recordings summary: count, total size, sample list
- Edit folder status: `edit-1st` / `edit-2nd` / `edit-final` --- each shows exists/missing
- Create all edit folders button (batch)
- Create individual folder buttons
- Gling dictionary editor (merged global + project-specific)

### 9.3 Configuration Panel

**URL**: `#config`

Organised into collapsible sections. Most users only need the first two.

**Sections:**

1. **Watch Directory**
   - Path input with `~` expansion support
   - Status indicator: exists / not-found / checking
   - Save restarts the file watcher

2. **Projects Structure**
   - `projectsRootDirectory`: parent folder of all projects
   - `activeProject`: current project folder name
   - Derived full path shown inline
   - Save restarts watchers

3. **Image Source Directory**
   - Path for incoming images (default: `~/Downloads`)
   - Save restarts watcher

4. **Common Names**
   - Table of predefined names for the rename dialog
   - Per name: display name, auto-sequence toggle, suggest-tags list, chapter filter (all or min/max)
   - Add/edit/remove inline

5. **Available Tags**
   - List of tags for recording filenames
   - Add/edit/remove inline

6. **Shadow Configuration**
   - Resolution dropdown: 480p / 360p / 240p / custom
   - Generate for current project / all projects buttons

7. **Relay Configuration**
   - Relay directory path
   - Enabled toggle
   - Machine role: recorder / editor
   - Setup guide if not configured

8. **Whisper Configuration**
   - Binary path (default: `~/.pyenv/shims/mlx_whisper`)
   - Model name
   - Language code
   - Test button: runs `mlx_whisper --version`, shows result

9. **Disk Thresholds**
   - Per-column: faint / amber / red threshold values (with size format like "300MB", "2GB")
   - Stage penalty multiplier (0.0--1.0)

10. **Hold Configuration**
    - Holding SSD path
    - Test button: checks mounted + writable

11. **Poem WUI**
    - URL input
    - Brand config path

12. **Watcher Status**
    - List of all active watchers with watched paths
    - Restart button per watcher

**Background behaviour:**
- Path expansion: `~` replaced with home directory
- Path validation: detect format mismatch (Windows path on Unix), show warning
- Config migration: if old `projectDirectory` field exists, auto-migrate to `projectsRootDirectory` + `activeProject`
- Config save is atomic: write to temp file, then rename. Never corrupt config.json.

### 9.4 API Explorer

**URL**: `#api-explorer`

**What the user sees on arrival:**
Two-panel layout. Left: grouped endpoint list. Right: endpoint inspector.

**Left sidebar:**
- Collapsible groups: Projects, Recordings, Transcriptions, Assets, Thumbs, Relay, System, Developer
- Each endpoint: HTTP method badge + path

**Right panel (selected endpoint):**
- HTTP method, full path, description
- Parameters table: name, location (path/query/body), data type, required flag, example, enum values
- Input fields per parameter (auto-populated: current project code fills `code`/`projectCode` params)
- Request body template for POST/PUT
- "Send" button
- Response viewer: status code, JSON pretty-printed, raw toggle
- Request history: last 10 requests, click to re-run
- Copy cURL button

---

## 10. Real-time Architecture

### 10.1 WebSocket Event Catalogue

The server uses Socket.io (or equivalent) for real-time communication. The client invalidates the corresponding query cache when it receives an event.

**File system events (payload-free --- client re-fetches data):**

| Event | Trigger |
|---|---|
| `recordings:changed` | Recording added, renamed, moved, or deleted in `recordings/` |
| `transcripts:changed` | Transcript file added, removed, or changed in `recording-transcripts/` |
| `projects:changed` | Project folder added or removed in `projectsRootDirectory` |
| `inbox:changed` | File added or removed in `inbox/` |
| `assets:incoming-changed` | Image added or deleted in `imageSourceDirectory` |
| `assets:assigned-changed` | Image assigned or deleted in `assets/images/` |
| `thumbs:changed` | Thumbnail imported, deleted, or reordered |
| `thumbs:zip-added` | New ZIP file detected in Downloads |

**Relay events:**

| Event | Payload |
|---|---|
| `relay:changed` | `{ event, projectCode, subfolder, filename, timestamp }` |

**Transcription events:**

| Event | Payload |
|---|---|
| `transcription:queued` | `{ jobId, videoPath, position }` |
| `transcription:started` | `{ jobId, videoPath }` |
| `transcription:progress` | `{ jobId, text }` (streaming stdout) |
| `transcription:complete` | `{ jobId, videoPath, transcriptPath }` |
| `transcription:error` | `{ jobId, videoPath, error }` |

**Chapter generation events:**

| Event | Payload |
|---|---|
| `chapters:generating` | `{ chapter, current, total }` |
| `chapters:generated` | `{ chapter, outputFile, srtFile? }` |
| `chapters:complete` | `{ generated[], errors? }` |

**Regeneration events:**

| Event | Payload |
|---|---|
| `regen:shadows:progress` | `{ current, total, filename }` |
| `regen:shadows:complete` | `{ completed, failed, errors? }` |
| `regen:chapters:progress` | `{ current, total, chapter }` |
| `regen:chapters:complete` | `{ completed, failed, errors? }` |
| `regen:all:started` | --- |
| `regen:all:progress` | `{ step: 'shadows'|'transcripts'|'chapters', current, total }` |
| `regen:all:complete` | `{ shadows, transcripts, chapters }` |
| `regen:all:error` | `{ error }` |

### 10.2 File Watcher Configuration

Nine active watchers, all using `ignoreInitial: true` (existing files on startup do NOT trigger events --- only new changes after startup):

| Watcher | Path | Debounce | Events |
|---|---|---|---|
| ZIP | Downloads (`*.zip`) | 200ms | `thumbs:zip-added` |
| Incoming images | `imageSourceDirectory` | 200ms | `assets:incoming-changed` |
| Assigned images | `assets/images/` (depth 2) | 200ms | `assets:assigned-changed` |
| Recordings | `recordings/` + `recording-shadows/` | 200ms | `recordings:changed` |
| Projects | `projectsRootDirectory` (depth 1) | 500ms | `projects:changed` |
| Inbox | `inbox/` | 200ms | `inbox:changed` |
| Transcripts | `recording-transcripts/` | 300ms | `transcripts:changed` |
| Thumbnails | `assets/thumbs/` | 200ms | `thumbs:changed` |
| Relay | `relayDirectory` | 200ms + `awaitWriteFinish` 2s | `relay:changed` |

Watchers restart when config changes (project switch, directory path changes).

---

## 11. System Integrations

### 11.1 File System

FliHub's primary integration is the local filesystem. All data lives on disk. The server performs file operations:
- `fs.rename()` for renaming recordings
- `fs.copyFile()` for assigning images
- `fs.unlink()` for deletions
- `fs.readdir()` for listing directories
- `fs.stat()` for file metadata (size, timestamps)
- `fs.readFile()` / `fs.writeFile()` for config, state files, transcript content
- `child_process.exec('open', [path])` for opening folders in Finder (macOS)

**Path expansion**: `~` is expanded to the user's home directory on the server. All paths stored in config use `~` for portability.

**Atomic config writes**: write to `config.json.tmp`, then `fs.rename()` to `config.json`. Never corrupt config.

### 11.2 MLX Whisper (Transcription)

**Binary**: `~/.pyenv/shims/mlx_whisper` (the pyenv shim --- version-agnostic)

**Invocation**:
```bash
mlx_whisper --model {whisperModel} --language {whisperLanguage} --output-format all {videoPath}
```

**Output**: `.txt`, `.srt`, `.json` files in `recording-transcripts/`.

**Streaming**: stdout/stderr are captured in real-time and emitted as `transcription:progress` WebSocket events.

**Queue**: single-threaded. One job active at a time. Jobs are processed sequentially. Queue survives project switches (cross-project safety).

**Error handling**: if the binary is not found (`spawn ENOENT`), the error is shown in the UI. No silent failures.

### 11.3 ffmpeg (Video Processing)

Used for two operations:

**Chapter recordings** (concatenation):
- Concatenates all `.mov` files in a chapter by sequence order
- Applies configurable watermark (image, scale, position)
- Outputs `{chapter}-{label}.mov` to `recordings/-chapters/`
- Also generates matching `.srt` with cumulative timing

**Shadow generation** (low-res proxy):
- Transcodes recording to configured resolution (default: 240p)
- Preserves audio
- Outputs to `recording-shadows/` with same filename

### 11.4 rsync (Relay Sync)

**Invocation**:
```bash
rsync -av --exclude='.DS_Store' --exclude='._*' --exclude='.gitkeep' \
  --exclude='.stfolder' --exclude='.stignore' --exclude='Thumbs.db' \
  {source}/ {destination}/
```

**Preview (dry-run)**:
```bash
rsync -avn --exclude=... {source}/ {destination}/
```

Rsync preserves timestamps, ownership, and permissions.

**Hold operations** (offload to SSD) also use rsync.

### 11.5 Git (Sync Hub)

Two channels:
- `app-code`: the FliHub repository itself
- `video-project`: the active project's git repo (if initialised)

Operations: `git fetch`, `git status`, `git add`, `git commit`, `git push`, `git pull`, `git merge`.

Per-repo async lock prevents concurrent git operations. `git fetch` has a 15-second timeout and swallows errors (falls back to local state).

---

## 12. Naming Conventions and Validation Rules

These are the primary keys of the system. Everything (transcripts, shadows, chapters, prompts) is keyed off base filenames.

### 12.1 Recording Filename

```
{chapter:2d}-{sequence}-{name}[-{tags}].{ext}
```

| Component | Format | Validation (creation) | Validation (reading) |
|---|---|---|---|
| chapter | 2-digit, zero-padded | Must match `/^\d{2}$/` (01--99) | Lenient: accepts `/^\d{1,2}$/` |
| sequence | integer | Must match `/^\d+$/`, min 1 | Same |
| name | kebab-case | Must match `/^[a-z0-9.]+(-[a-z0-9.]+)*$/`, max 50 chars | Same |
| tags | uppercase, hyphen-joined | Each must contain at least one letter. Pure numbers are NOT tags. | Same |
| ext | file extension | `.mov` (primary), `.mp4` (supported) | Case-insensitive |

**Postel's Law**: strict on creation, lenient on reading. Early recordings with 1-digit chapters must still be parseable.

**Tag rule**: a tag like `CTA` or `V2` is valid (contains at least one uppercase letter). A pure number like `2` or `555` is NOT a tag --- it becomes part of the name.

### 12.2 Image Filename

```
{chapter:2d}-{sequence:1d}-{order:1d}{variant?}-{label}.{ext}
```

| Component | Format |
|---|---|
| chapter | 2 digits |
| sequence | 1 digit (1--9) |
| order | 1 digit (1--9) |
| variant | optional single letter a--z |
| label | kebab-case |
| ext | `.png`, `.jpg`, `.jpeg`, `.webp` |

### 12.3 Prompt Filename

Same as image filename but with `.txt` extension. Content is free-form text.

### 12.4 Transcript Filename

Base name from recording + extension:
- `.txt` --- plain text (counts as "transcribed")
- `.srt` --- timed subtitles
- `.json` --- word-level timestamps

### 12.5 Chapter Recording Filename

```
{chapter:2d}-{label}.mov
```

Also generates: `{chapter:2d}-{label}.srt`

### 12.6 Project Code

```
[a-zA-Z]\d{2}(-[a-z0-9-]*)?
```

Examples: `b72`, `b72-awesome`, `c43`. Always stored lowercase.

### 12.7 State File Location

`{projectRoot}/.flihub-state.json` --- inside the project folder itself.

---

## 13. Non-Functional Requirements

### 13.1 Performance

- File watcher debounce: 200--500ms depending on watcher type (see Section 10.2)
- Project list scan: fast path for last-modified sort; full stats only on-demand or background
- Disk usage scan: background operation with progress. Must not block the UI.
- Video player: smooth scrubbing, transcript sync polling at 50ms

### 13.2 Reliability

- Never silently fail on file operations. Surface errors in the UI where the action was taken.
- Config save is atomic (write to temp, rename). Never corrupt config.json.
- Transcription queue survives project switches (cross-project safety).
- If a file is dropped while the server is not running, it will NOT appear on startup (chokidar `ignoreInitial: true`). Reloading the Incoming page fetches the file list from the API directly.

### 13.3 Multi-Machine

- Each machine runs its own FliHub server independently.
- No shared database between machines.
- Relay uses rsync over Tailscale/local network for file exchange.
- Machine role (`recorder`/`editor`) determines UI visibility, not backend logic.

### 13.4 Logging

- Transcription stdout/stderr: stream to clients via WebSocket, also store to file for debugging.
- Telemetry: append `{ type, timestamp, ...data }` to `telemetry.jsonl` for performance analysis.

### 13.5 Port Configuration

- Server: port 5101 (Express + Socket.io)
- Client: Vite dev server (port 5100 in development)
- Before starting, check if ports are in use. If listening, do NOT restart.

---

## 14. v2 Improvements Over v1

These are clear improvements to make during the rebuild. They should not block feature parity but should be implemented where natural.

1. **Better project stage visualisation**: Use the distinct stage badge colours from Section 3.4. Make stages instantly scannable in the project list.

2. **Transcript progress bar**: Replace the raw `%` number with a visual micro-bar in the project list row. The number is useful but the bar communicates urgency at a glance.

3. **Relay sync prominence**: Current badges are correct but small. Add a "needs attention" row highlight for projects with `diverged` relay status.

4. **Config panel organisation**: Break the single long page into collapsible sections. Default-collapse everything except Watch Directory and Projects Structure.

5. **Recordings density toggle**: Add a compact/comfortable toggle for the recordings table. High density is good for power users; comfortable mode helps on smaller screens.

6. **Transcription retry**: Add a "Retry" button on failed transcription jobs. Currently the user must re-queue manually, which is friction.

7. **Hold verification prominence**: Upgrade the `T7 warning` badge to a more prominent "action required" state for incomplete offloads. Amber is too subtle.

8. **Keyboard shortcuts**: Add keyboard navigation for high-frequency actions:
   - `R` or `Enter`: rename selected recording
   - `S`: toggle safe
   - `P`: toggle parked
   - `N/P` or arrow keys: next/prev recording in Watch
   - `Space`: play/pause in Watch
   - `1`--`5`: speed presets in Watch

---

## 15. Out of Scope for Initial Build

Do not include these features. They are low-priority, unfinished, or speculative in v1:

- FR-134: Inconsistency detection and auto-fix
- FR-133: File status indicators (optional visibility tool)
- FR-132: Dual transcription system with progress tracking
- FR-135: Chapter tools (Move, Swap, Undo) --- marked LOW priority
- FR-34 Phase 3: LLM-based chapter timing verification
- NFR-86: Git leak detection
- NFR-141: Lenient tag parser (cancelled --- scanner had bugs, real scope was minimal)
- Developer-only routes (telemetry endpoint, raw config): include in backend but do not surface in UI
- Mockups page: reference-only, not critical workflow
- Windows/WSL support: macOS-first, cross-platform is partial and not worth investing in

---

*This specification was generated from the FliHub v1 codebase, git history, shared type definitions, CONTEXT.md system snapshot, and AppyDave brand system documentation. April 2026.*
