---
generated: 2026-04-05
generator: system-context
status: snapshot
sources:
  - CLAUDE.md
  - README.md
  - package.json
  - Procfile
  - start.sh
  - shared/types.ts
  - shared/naming.ts
  - shared/paths.ts
  - shared/constants.ts
  - server/config.template.json
  - server/src/WatcherManager.ts
  - server/src/routes/index.ts
  - server/src/routes/relay.ts
  - server/src/routes/sync.ts
  - server/src/routes/manage.ts
  - client/src/App.tsx
  - client/src/components/ProjectDrawer.tsx
  - client/src/components/ProjectsPanel.tsx
  - client/src/components/ProjectListToolbar.tsx
  - client/src/constants/stages.ts
  - client/src/utils/projectFilters.ts
  - docs/backlog.md
  - context.globs.json
regenerate: "Run /system-context in the repo root"
---

# FliHub — System Context

## Purpose
Manages the full lifecycle of video recordings for a solo content creator — from the moment Ecamm Live drops a .mov file, through naming and transcription, to multi-machine editor handoff and final export staging.

## Core Abstractions

- **Recording** — A `.mov` file named with the strict convention `{chapter}-{sequence}-{name}-{tags}.mov`. The filename *is* the metadata: chapter (2 digits), sequence (auto-incrementing integer), name (kebab-case), and optional uppercase tags (e.g. `CTA`, `SKOOL`). Renaming the file *is* categorization — there is no separate metadata store. Recordings also carry derived state: `safe` (protected from rename/delete), `parked` (set aside for later), and annotation text, all persisted in a sidecar `.flihub-state.json` file per project.

- **Project** — A folder on disk with a fixed internal structure (`recordings/`, `recording-shadows/`, `recording-transcripts/`, `assets/images/`, `assets/thumbs/`, `inbox/raw/`, `inbox/dataset/`, `final/`, `s3-staging/`). Projects move through a lifecycle stage — `planning → recording → first-edit → second-edit → review → ready-to-publish → published → archived`. Stage is inferred from filesystem heuristics unless explicitly overridden in `server/config.json`. Each project exposes `ProjectStats` including counts, transcript coverage, a `hasFinal` flag, and health signals used by the drawer and smart presets.

- **Relay** — A shared directory on a local network path used to move files between the creator machine and remote editor machines. Each project in relay has three subfolders: `recordings` (source footage), `edit-1st` (first edit output), `edit-2nd` (second edit output). Sync status per subfolder is computed by comparing relay file counts against local file counts: `synced`, `ahead`, `behind`, `diverged`, `local-only`, or `relay-only`. The relay is *bidirectional* — creator pushes recordings, editors push back edit files. An in-memory activity log (ring buffer of 50 events) tracks push/collect/promote actions for the activity feed. Divergence detection compares local vs relay per-subfolder with `localOnly`/`relayOnly` file lists and a `SyncDirection` (synced/outgoing/incoming/both).

- **Machine Role** — Every FliHub instance is configured as either `recorder` (legacy alias: `creator`) or `editor`. The role is set in `server/config.json` and controls which UI panels are rendered. A `recorder` machine sees incoming recordings, naming controls, transcription, and relay-push. An `editor` machine sees relay-collect, shadow previews, and edit-delivery tools. If `machineRole` is absent from config, it defaults to `recorder`.

- **Watcher** — Chokidar-based filesystem watchers managed by `WatcherManager`. Each watched path maps to a specific Socket.io event that the UI listens to for real-time updates. All watchers are debounced to prevent flooding the client. Watchers restart when config changes (e.g. `projectDirectory` or `relayDirectory` updates). The watcher fires on `add/unlink` only for most paths — relay watcher uses `awaitWriteFinish` with a 2-second stability threshold for large video files. Nine active watchers: zip, incoming-images, assigned-images, recordings, projects, inbox, transcripts, thumbs, relay.

- **Sync Hub** — Git-based synchronization for two channels: `app-code` (the FliHub repo itself) and `video-project` (the active project's git repo, if any). Each channel reports `SyncState` (clean/dirty/behind/ahead/diverged/conflict/unknown) with dirty file counts, ahead/behind counts, and per-file dirty lists. Push auto-commits with a generated message; pull detects merge conflicts and returns conflict file details with resolution options (keep-mine/keep-theirs). A per-repo lock prevents concurrent git operations.

## Key Workflows

### Naming a new recording (creator machine)
1. Creator finishes recording in Ecamm Live; Ecamm drops a `.mov` file in `~/ecamm` (or configured `watchDirectory`).
2. The `WatcherManager` detects the new file and emits `file:new` via Socket.io to all connected clients.
3. The file appears as a card in the **Incoming** tab. The `RecentlyNamedStrip` shows recent activity across the top.
4. Creator selects chapter and name from `NamingControls` — the UI suggests next chapter/sequence based on existing recordings. Common names (e.g. `intro`, `demo`) are pre-filtered by chapter range from config.
5. Creator clicks Rename. The server moves the file to `recordings/` under the active project, applying the `{chapter}-{sequence}-{name}-{tags}.mov` convention.
6. Auto-transcription is queued: the server spawns a Whisper transcription job and deposits `.txt` and `.srt` files in `recording-transcripts/`.
7. A low-resolution shadow file is generated in `recording-shadows/` for editors to preview before downloading the full `.mov`.

### Editor collaboration via relay
1. Creator opens the **Manage** panel → Relay tool, selects the project and `recordings` subfolder.
2. Creator previews the diff (new/updated/deleted files) then pushes — `rsync` copies recordings to the relay directory.
3. Editor on a remote machine opens the same Relay tool, sees the relay folder has more files than their local copy (`relay-only` or `ahead` status).
4. Editor clicks **Collect** to pull files from relay into their local project `recordings/` folder. If the project directory doesn't exist locally, collect is blocked (FR-147).
5. Editor works on the edit, then pushes the rendered file back to `edit-1st` subfolder via relay.
6. Creator collects from `edit-1st` into their local `final/` directory, then stages for S3 upload via the Export tool.

### Managing project lifecycle
1. Creator navigates to **Projects** tab to see all projects under `projectsRootDirectory`.
2. A toolbar at the top provides a text search (filters by code or extracted name), stage filter pills (one per stage — toggle any combination), and smart preset buttons: **Needs Attention** (has recordings but no transcripts), **Dead** (≤2 files, 30+ days inactive), **Ready to Edit** (all transcripts done, still in recording stage). The result count ("X of Y projects") updates live.
3. Projects are displayed in a filterable table sorted by stage and priority. Pinned (starred) projects float to the top.
4. Creator clicks a project row to open the **Project Drawer** — a 40%-width slide-out panel from the right edge. The drawer shows: a stats grid (recordings, chapters, transcript %, images, thumbs, shadows), a progress checklist (has recordings / has transcripts / has chapters / has final video), a health assessment sentence computed from `getHealthAssessment()`, and two quick action buttons (Open in Finder, Copy Transcript).
5. Stage overrides are persisted in `server/config.json` under `projectStageOverrides` (keyed by project code). The drawer allows manual override when the filesystem heuristic is wrong.
6. The active project (used by Recordings, Transcriptions, Assets, etc.) is set by clicking "Set as active" in the drawer.

### Transcription and transcript handoff
1. After a recording is renamed, transcription is queued automatically (or triggered manually via the Transcriptions tab).
2. Whisper produces `.txt` and `.srt` files in `recording-transcripts/`.
3. Creator opens the recording row in Recordings tab — one click copies the transcript to clipboard or sends it to the POEM WUI workflow intake URL (configured in `poemWuiUrl`).
4. SRT files can be copied independently (FR-143) for subtitle use.
5. The **Copy Transcript** button in the Projects drawer calls `/api/query/projects/{code}/transcript/text` and copies the combined project transcript to clipboard with character-count feedback.

## Design Decisions

- **Filename as the sole metadata store**: Recording metadata (chapter, sequence, name, tags) lives entirely in the filename. No database, no sidecar JSON per file. This means FliHub is stateless about recordings — the filesystem *is* the database. *Alternative considered*: A SQLite DB or per-file JSON. *Why rejected*: Files must be portable — an editor on another machine or in a different tool (Finder, Terminal) can read the metadata from the filename alone. DB schemas require migrations; filenames require nothing.

- **No database for project config**: All configuration (`watchDirectory`, `projectsRootDirectory`, `activeProject`, stage overrides, pinned priorities, relay settings) is stored in a single `server/config.json`. *Alternative*: A proper relational or document store. *Why rejected*: FliHub runs on 4+ machines with separate configs. No shared DB infrastructure exists. File-based config is portable and transparent to inspect/edit.

- **Postel's Law in filename parsing**: `shared/naming.ts` is strict on *creation* (chapter must be exactly 2 digits: `01`-`99`) and lenient on *reading* (accepts 1-2 digits for backwards compatibility). This is explicitly documented in the `ParseOptions.lenient` field. *Alternative*: Strict parsing everywhere. *Why rejected*: Early recordings were created with 1-digit chapters. A strict reader would silently drop valid files from older projects.

- **Machine Role as primary UI branch**: Rather than one UI that hides/shows features via permissions, FliHub treats machine role as a first-class architectural concept that determines the visible surface. A `recorder` instance and an `editor` instance are effectively different apps sharing the same codebase. *Why*: The creator and editor workflows are distinct enough that combining them in one view creates confusion and clutter.

- **Feature references (FR-xxx/NFR-xxx) in code comments**: Every non-trivial implementation references a requirement number in `docs/prd/`. This creates a bidirectional link between code and spec. *Why*: With 148+ features across 18 months, it's impossible to reconstruct "why does this exist?" from code alone. The FR number is the canonical answer.

- **Relay via rsync over shared filesystem**: File sync between machines uses rsync to a shared directory (e.g. `~/relay/flihub-appydave`). *Alternative*: S3, SFTP, or a custom sync daemon. *Why rejected*: The relay directory already exists as a local mount on the creator machine. rsync provides native diff, preview, and atomic copy with no additional infrastructure.

- **Sync Hub uses per-repo locks**: The B044 Sync Hub wraps every git operation in a per-repo lock to prevent concurrent fetch/pull/push race conditions. *Alternative*: Queue operations or let git handle its own locking. *Why*: Git's native lockfile produces unhelpful errors when two operations collide. An async lock in the Node process is lighter and provides cleaner error messages.

- **Pure filter functions extracted from components**: `client/src/utils/projectFilters.ts` contains `filterProjects()` as a standalone pure function separate from `ProjectsPanel`. *Alternative*: Inline logic inside the component. *Why*: The filter logic (needs-attention, dead, ready-to-edit presets) involves date calculations and multi-field comparisons that are easy to mis-test in a component context. Extraction allows the timestamp to be injected (`now` parameter), making preset filters unit-testable without mocking `Date.now()`.

## Non-obvious Constraints

- **Philippines editors are Tailscale-only** — `mac-mini-jan` and `mac-mini-mary` are not on the local network. Their hostnames use Tailscale DNS, not `.local`. SSH or relay operations that work to `MacBook-Pro.local` will silently fail (timeout) for these machines. Always use Tailscale hostnames for Jan and Mary.

- **Tag parsing ignores pure numbers** — A tag like `CTA` or `V2` is valid (must contain at least one uppercase letter). A pure number like `2` or `555` appended to a filename is NOT parsed as a tag — it becomes part of the name. This is intentional per NFR-65 and is a frequent source of confusion when working with files that end in version numbers.

- **Stage inference is heuristic, not authoritative** — Project stage is guessed from the filesystem structure (does `final/` have files? does `recordings/` have recordings?). The heuristic is wrong for projects in transition. Manual overrides via `projectStageOverrides` in config are the escape valve, but they accumulate silently over time and are never auto-cleared.

- **Rename is blocked while transcription is active** — If a transcription job is running or queued for a recording, renaming that file will fail. The `getActiveJob()` and `getQueue()` checks in `routes/index.ts` enforce this. The UI shows a warning, but there's no notification when the block lifts — the creator must retry manually.

- **Chokidar watchers fire on `ignoreInitial: true`** — When FliHub starts, existing files in the watch directory do NOT trigger events. Only newly added or deleted files after startup fire events. If a file was dropped into `~/ecamm` while FliHub was not running, it will not appear automatically — the creator must reload the Incoming page.

- **config.json is written by the server process** — Any direct edits to `server/config.json` while the server is running risk being overwritten by an in-memory config write. The only safe way to edit config is through the Config panel in the UI or by restarting the server after editing.

- **Health assessment and smart presets are client-only** — The `getHealthAssessment()` logic in `ProjectDrawer` and the preset filters in `filterProjects()` run entirely in the browser using `ProjectStats` fields returned from the server. There is no server-side filtering endpoint. This means presets reflect the last server response — they do not auto-update when files change unless the projects query refetches.

- **Relay collect is blocked if project doesn't exist locally** — FR-147 enforces that an editor must create the project folder manually or via the Folders tool before collecting from relay. This prevents accidental creation of malformed project structures.

- **Sync Hub fetch can silently fail** — The `getChannelStatus()` function tries `git fetch --quiet` with a 15-second timeout but swallows the error and continues with local state. This means the sync status can be stale if the network is down — the UI shows the last known state, not a "network error" warning.

## Expert Mental Model

- **The filename is the unit of truth, not the UI** — A fluent user doesn't think "I renamed it in FliHub"; they think "I renamed the file." When debugging a missing recording, an expert goes straight to the filesystem (`ls recordings/`) before opening the UI. The UI is a view over the filesystem, not its source of truth.

- **Relay is a handoff point, not a backup** — The relay directory contains only what has been explicitly pushed. It is not a mirror of local state. After a collect, the relay copy and local copy exist independently — they can drift. Sync status (`synced`, `ahead`, `behind`, `diverged`) is a file-count comparison, not a content hash. `diverged` means both sides have changed; it does not auto-resolve.

- **Active project scopes everything** — Almost every panel (Recordings, Transcriptions, Assets, Inbox, Export) operates on `config.activeProject`. Switching the active project is a global state change. An expert always confirms the active project before performing operations, especially on machines with many projects.

- **FR numbers are the commit history of product decisions** — When code behavior seems arbitrary, look up the FR in `docs/prd/`. FR-130 (simplified rename logic), FR-147 (relay project awareness), FR-54 (tag stripping) each encode a specific past failure or user complaint. Changing code without reading the relevant FR risks re-introducing the original bug.

- **commonNames are chapter-filtered** — The quick-select name list in NamingControls is not flat. Each entry in `config.commonNames` can have a `chapterFilter` that limits which chapters it appears for (e.g. `intro` only shows for chapters 1-4). Newcomers are confused when a name they expect doesn't appear — experts know to check the chapter filter in config.

- **The Manage panel is the power-user surface** — Manage consolidates tools that were previously scattered (Export, S3, Relay, Rename, Folders, AWB/POEM). An expert navigates via the tool sidebar rather than tabbing. The manage panel includes batch undo for bulk rename/chapter operations via a single `lastBatchMapping` stored in memory on the server.

- **The Projects drawer is a read-only diagnostic, not an edit surface** — The drawer's health assessment, checklist, and stats are computed from `ProjectStats` (a server snapshot). Quick actions (Open in Finder, Copy Transcript) go directly to server APIs. But stage changes and active project selection route through separate `useUpdateProjectStage` and config mutations.

## Scope Limits

- Does NOT edit video — video editing happens in external tools (DaVinci Resolve, Gling). FliHub manages the filesystem around the edit, not the edit itself.
- Does NOT perform transcription — Whisper is an external process. FliHub queues transcription jobs and reads the output files. If Whisper is not installed or misconfigured, transcription silently fails to queue.
- Does NOT host or stream video — all files are local disk paths. The server serves video files for in-browser preview only; there is no CDN or media server.
- Does NOT publish to YouTube or other platforms — FliHub's export tools prepare files in `s3-staging/` and sync to S3, but the final YouTube upload is manual. The "ready-to-publish" stage is the end of FliHub's involvement.
- Does NOT auto-create relay project folders — if a project does not exist locally on an editor machine, `collect` is blocked (FR-147). The editor must create the project folder manually or via the Folders tool before collecting.
- Does NOT support Windows in practice — cross-platform path support (FR-89) exists for Windows path display but is only partially implemented. Jan and Mary run macOS; FliHub is a macOS-first tool.
- Does NOT resolve relay merge conflicts — the Sync Hub handles git merge conflicts for code, but relay (rsync-based) has no merge capability. `diverged` status requires manual intervention.

## Failure Modes

- **Silent file drop missed on startup**: If Ecamm drops a file while FliHub server is not running, the file will not appear in the Incoming tab after restart because chokidar uses `ignoreInitial: true`. Recognition: creator records and sees nothing appear in Incoming. Fix: reload the Incoming page, which issues a fresh API call to list pending files rather than relying on socket events.

- **config.json drift — stale stage overrides**: `projectStageOverrides` in config grows over time and is never pruned. A project archived months ago still has an explicit override that silently masks the filesystem heuristic. Recognition: project stage in UI doesn't match the folder state. Fix: open Config panel, inspect `projectStageOverrides`, and remove stale keys manually.

- **Rename race with active transcription**: Attempting to rename a recording while its transcription job is active or queued returns an error. The UI shows the error, but there is no progress indicator for when the block will lift. Recognition: rename button triggers an error mentioning transcription conflict. Fix: wait for transcription to complete (check Transcriptions tab), then retry.

- **Relay diverged with no resolution path**: When both creator and editor have modified the same subfolder since last sync, status shows `diverged`. FliHub has no merge or conflict resolution for relay — it only detects the divergence. Recognition: relay sync status shows `diverged` for a subfolder. Fix: manually decide which side wins, use rsync directly or delete from one side before re-syncing via relay.

- **Sync Hub stale status on network failure**: `git fetch --quiet` in the Sync Hub swallows errors and continues with local state. If the network is down, the UI shows the last known sync state without any error indicator. Recognition: sync status appears "clean" but remote has new commits. Fix: check network connectivity; the next successful fetch will update the state.

- **NFR-141 cancelled after incorrect scope**: A scanner ran on 47 projects and initially reported 1805 naming issues, prompting NFR-141 (lenient tag parser). The scanner had bugs; the real count was 391 issues (mostly INFO-level derivative files). NFR-141 was cancelled after the real data was verified. If you see references to NFR-141 in old branches, it was *incorrectly* scoped and should not be implemented.

- **Tailscale-only machine SSH timeout**: Attempting to SSH or rsync to `mac-mini-jan` or `mac-mini-mary` via `.local` hostname will hang for 30+ seconds before timing out because these machines are not on the local network. Recognition: relay push/collect to Philippines machines stalls indefinitely. Fix: always use Tailscale hostnames, not `.local` for these machines.

- **Copy Transcript silent empty result**: The `copyProjectTranscript()` utility fetches `/api/query/projects/{code}/transcript/text`. If no transcript files exist, the endpoint returns an empty body — the function shows a toast error "No transcript content available" but does not throw. Recognition: Copy Transcript button triggers an error toast even though recordings exist. Fix: check that transcription has actually run (Transcriptions tab shows `.txt` files in `recording-transcripts/`).

- **Batch undo is single-shot and in-memory**: The manage panel stores `lastBatchMapping` for undo of bulk rename/chapter operations, but only the most recent operation. A second bulk operation overwrites the undo buffer. Server restart clears it entirely. Recognition: undo button does nothing or reverts the wrong operation. Fix: there is no fix — this is by design for simplicity. Use git to recover from catastrophic renames.
