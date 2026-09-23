---
generated: 2026-09-23
generator: system-context
audience: human
status: snapshot
commit: 95bfe6e
supersedes: CONTEXT.md (2026-04-08, same generator — left in place with a pointer)
sources:
  - CLAUDE.md
  - README.md
  - CONTEXT.md
  - context.globs.json
  - package.json
  - Procfile
  - start.sh
  - scripts/app.sh
  - server/package.json
  - server/vitest.config.ts
  - server/src/index.ts
  - server/src/watcher.ts
  - server/src/WatcherManager.ts
  - server/src/config/configManager.ts
  - server/src/routes/index.ts
  - server/src/routes/context.ts
  - server/src/routes/brands.ts
  - server/src/routes/hold.ts
  - server/src/routes/storage.ts
  - server/src/routes/transcriptions.ts
  - server/src/routes/projects.ts
  - server/src/routes/manage.ts
  - server/src/routes/video.ts
  - server/src/routes/assets.ts
  - server/src/routes/query/index.ts
  - server/src/utils/openContext.ts
  - server/src/utils/brands.ts
  - server/src/utils/projectResolver.ts
  - server/src/utils/projectStats.ts
  - server/src/utils/projectState.ts
  - server/src/utils/holdUtils.ts
  - server/src/utils/storageTree.ts
  - server/src/utils/archiveInventory.ts
  - server/src/utils/diskUtils.ts
  - server/src/utils/safeDelete.ts
  - server/src/utils/renameRecording.ts
  - server/src/utils/recordingArtifacts.ts
  - server/src/utils/telemetry.ts
  - shared/paths.ts
  - shared/types.ts
  - shared/contextSchemas.ts
  - shared/naming.ts
  - shared/apiRegistry.ts
  - client/src/App.tsx
  - client/src/components/shared/TrashIndicator.tsx
  - client/src/components/shared/StoragePanel.tsx
  - client/src/components/shared/storage/StorageActions.tsx
  - client/src/components/ConfigPanel.tsx
  - client/src/components/ProjectsPanel.tsx
  - docs/schema-mirror.md
  - docs/schema-mirror.json
  - docs/AGENT-NOTES.md
  - docs/backlog.md
  - docs/changelog.md
  - docs/kdd/learnings.md
  - docs/rebuild-2026/NORTH-STAR.md
  - docs/rebuild-2026/requirements-archaeology-2026-09.md
  - docs/prd/fr-169-word-level-timestamps.md
  - ../fli-core/src/classify.ts
  - ../docs/agent-comprehension-docs.md
regenerate: 'Run /dev-team:system-context in the repo root (per ../docs/agent-comprehension-docs.md)'
---

# FliHub — System Context

> For humans orienting on the codebase. Agents load [AGENT-NOTES.md](AGENT-NOTES.md) instead.
> **Schemas, types and closed sets are in the [schema mirror](schema-mirror.md)**, generated from the
> code with a `file:line` on every value and a verify mode. This page names types; it does not
> restate their shape. Open the mirror (or the declaring file) for that.

## Purpose

FliHub is the watcher that sits behind Ecamm Live on David's recording machine. The moment a take
lands in the Ecamm folder, FliHub queues it. David then picks the takes worth keeping and promotes
each one into the active video project under a chapter/sequence filename. Transcription, assets,
trash and storage moves all happen around that promoted file. This is the North Star sentence in
`docs/rebuild-2026/NORTH-STAR.md` §1. FliHub is a single-user, local-first tool for one creator,
and it is in the middle of a rebuild campaign (B475). The rebuild is happening in place, as a
series of cuts and contract adoptions, rather than as a green-field rewrite.

## Core Abstractions

- **The pending take** is a `.mov` or `.mp4` in `watchDirectory`. It is held only in memory, in the
  server's `pendingFiles` map (`server/src/index.ts`), and re-sent to every socket that connects. It
  has no identity until it is promoted. _Discard_ (`DELETE /api/files/:path`) only drops it from the
  map. The file stays in `watchDirectory`, and because the watcher runs with `ignoreInitial: false`
  (`server/src/watcher.ts`), it reappears in Incoming after a server restart. _Trash_
  (`POST /api/trash`) is the verb that actually moves the file, into the active project's `-trash/`.

- **The recording is its filename, in a folder chosen by the project's layout.** Promotion
  (`POST /api/rename`, `server/src/routes/index.ts`) moves the file into the project's recordings
  folder as `{chapter}-{sequence}-{name}-{TAGS}.mov`. The grammar is `NAMING_RULES` in
  `shared/naming.ts`: strict when creating a file, lenient when parsing one. Open the file for it.
  The mirror lists it as declared but not read, because the extractor skips object constants.
  Chapters, sequences and tags are derived from filenames wherever they are read. Per-recording
  flags (safe, parked, annotation) and per-project metadata (YouTube title, chapter titles, `ships`,
  dictionary) live in the project's `.flihub-state.json` (type `ProjectState`).

- **The project layout: hub or legacy.** Every path to recordings or transcripts comes from
  `getProjectPaths(projectDir)` (`shared/paths.ts`), which asks `@flivideo/core`'s
  `projectLayoutSync`. There is one copy of the rule, and it lives in fli-core:
  - `hub/recordings/` exists → **hub** (`hub/recordings/`, `hub/transcripts/`);
  - a top-level `recordings/`, `recording-transcripts/` or `transcripts/` exists → **legacy**;
  - anything else (a new, empty or missing folder) → **hub**.

  New projects are hub. `POST /api/projects` creates only the folder (step 4, 2026-09-23), and
  promotion creates `hub/recordings/` on the first take. Every existing project is legacy, and FliHub
  never migrates one. FliStudio's `project.migrate-layout` does that, and only when David says "move".

- **The project is a folder name under a brand root.** Identity is the folder name verbatim
  (`docs/architecture/project-codes.md`). `projectsRootDirectory` plus `activeProject` in
  `server/config.json` are the two coordinates, and `projectDirectory` is derived from them on every
  load (`server/src/config/configManager.ts`). There are **two resolvers with different rules**:
  - the legacy `:code` resolver (`server/src/utils/projectResolver.ts`) takes the first folder, in
    alphabetical order, whose name _starts with_ the input;
  - the open-contract resolver (`server/src/utils/openContext.ts`) goes through `@flivideo/core`
    and refuses an ambiguous code with a 409.

  Stage is `ProjectStage` (see the mirror). Auto-detection only ever answers `planning` or
  `recording` (`server/src/utils/projectStats.ts`). A human sets every later stage, and those
  overrides are stored in the _global_ config, keyed by folder name.

- **The brand is a root, resolved through the shared Fli contract.** A brand is a key in
  `~/.config/appydave/brands.json`. The root it points to on this machine is resolved by
  `@flivideo/core` (`resolveBrandRoot`, with the `~/.fli/machine.json` override). FliHub **reads**
  `brands.json`, `~/.fli/machine.json` and a project's `fli.studio.json`, and writes none of them. For
  their shape, see fli-core (`../fli-core/`) and the open contract (`../flistudio/docs/open-contract.md`).

- **Storage lanes** are where a project's bytes can be: local disk, T7 HOLDING (heavy subfolders
  evacuated, with the shell left local) and T7 PUBLISHED (the whole folder archived). The verbs are
  in `server/src/routes/hold.ts` (B064) and `server/src/routes/storage.ts` (the storage panel).
  - "Heavy" is the `HEAVY_SUBFOLDERS` list (`server/src/utils/storageTree.ts`). It includes both
    `recordings` and `hub/recordings`. Transcripts are never held.
  - `-trash/` is also a place bytes sit. Since 2026-09-23 it is always visible in the header and can
    be emptied at any time.

## Key Workflows

### Record → promote → transcribe (the one workflow that matters)

1. David stops recording with the foot pedal. Ecamm writes the file into `watchDirectory`.
2. chokidar (`server/src/watcher.ts`, `*.{mov,mp4}`, with `awaitWriteFinish`) waits for the write to
   finish, probes the duration with ffprobe, and emits `file:new`. The take appears in **Incoming**.
   A background probe then compares the take with the active project's declared `aspect`
   (`server/src/utils/aspectCheck.ts`). A mismatch raises a loud warning, and after promotion the
   recording row keeps the warning until David dismisses it. The probe never blocks anything.
3. David picks a chapter and a name (NamingControls suggests the next sequence) and promotes the take.
   The server `ensureDir`s the layout's recordings folder, moves the file there (or to `b-roll/` for
   a chapter-less take, FR-161, which is deprecated), and records the rename in an in-memory undo list.
4. Recordings (not b-roll) are queued for transcription. A single in-process worker
   (`server/src/routes/transcriptions.ts`) spawns `mlx_whisper`
   (default `~/.pyenv/shims/mlx_whisper`, model `whisper-large-v3-turbo`), with the global Gling
   dictionary as `--initial-prompt`.
   - The output is `.txt`, `.srt` and `.json` in the layout's transcripts folder. The folder is
     derived from the video's own path, not from the active project.
   - The `.json` is segment-level. `--word-timestamps` is never passed; FR-169 is pending.
   - Progress streams over the socket as `transcription:*` events.
5. From Recordings or Watch, David reads the transcript against the video. The transcript-synced
   player is the surface David praises, and North Star calls it the crown jewel.
   - He can send a transcript onward, for example to the POEM WUI intake (`server/src/routes/poem-wui.ts`).
   - Transcription is being pulled out into a shared FliTools service (B584). FliHub has not yet
     been switched over to it.

### Point FliHub at a brand and project (the open contract)

1. There are three ways in: the picker in the UI, launch arguments
   (`./start.sh --brand … --project … [--video <kebab-name>]`, or `FLIVIDEO_*` env), or
   `POST /api/context`.
2. The last two both go through `applyContext` (`server/src/utils/openContext.ts`). It resolves the
   brand and project through `@flivideo/core`, then calls the same `updateConfig` that a UI pick uses.
3. A video is a kebab name, not a number (fli-core v0.3.0, spec D15). A non-kebab name is refused as
   `video-invalid`.
4. A refusal uses the shared vocabulary (`REFUSAL_CODES`, `shared/contextSchemas.ts`) and leaves the
   previous project open. `GET /api/context` is derived from live config. A launch is stamped with
   `FLIVIDEO_LAUNCH_ID`, so a nodemon restart doesn't re-apply it on top of a later pick.

### Free disk: trash, hold, archive, restore

1. The **header trash pill** shows the active project's `-trash/` (count and size) on every tab.
   Clicking it asks for confirmation, then empties the trash through the six-step guard in
   `safeDelete`.
   - The count comes from `GET /api/projects/:code/trash`, which reads the folder fresh on every call.
   - The pill refreshes after every trash action, on window focus, and every 15 seconds.
2. The **Storage panel** (`client/src/components/shared/StoragePanel.tsx`) shows a storage tree per
   project and offers Hold, Restore, Archive, Unarchive and Archive-from-held.
   - The tree splits `hub/` so that `hub/recordings` counts as heavy and `hub/transcripts` as light.
3. The copies are made with rsync using `HOLD_EXCLUDES` (`server/src/utils/holdUtils.ts`), which
   leaves out `-trash/` and `s3-staging/`. The storage verbs verify the copy before deleting anything
   locally.
4. The guards refuse a move when the T7 isn't mounted or the storage state is degraded. The relay
   guard is gone, because relay itself was removed on 2026-09-22.

## Design Decisions

- **The filesystem is the database.** Recordings, projects, chapters and trash are all derived by
  reading directories on each request. There are no caches except the disk-size cache (B062).
  - _Alternative considered_: SQLite, or a per-file JSON sidecar.
  - _Why rejected_: files have to stay legible in Finder and on other machines.
  - _Cost_: silence. An archived-on-purpose root, a mis-pointed root, and a path a code site forgot
    to route through the layout all read as "empty" (archaeology #9).

- **The layout rule lives in fli-core, not in FliHub.**
  - FliHub first shipped its own detector. It then kept a sync mirror with a parity test, because
    fli-core's `projectLayout` is async and `getProjectPaths` has about 100 sync callers.
  - It deleted that mirror when fli-core added `projectLayoutSync` (v0.2.3).
  - _Why_: FliHub and FliStudio must never disagree about which folder holds a project's recordings.
    If they did, one app would show the takes and the other would show an empty project.
  - The parity test that remains checks that FliHub's composed paths still match fli-core's
    `projectLayoutPaths`.

- **Detect the layout, don't migrate it** (ruled 2026-09-22). Existing projects keep their layout
  forever unless FliStudio's migrate tool is run deliberately.
  - _Alternative rejected_: migrate every project on upgrade.
  - _Why_: it would move files on David's live recording machine and on the T7.
  - _Cost_: every consumer must read both layouts permanently.

- **One `applyContext` for every way into a project** (W3). Launch arguments and `POST /api/context`
  share one code path and derive their state from config, not from a second store.
  - _Alternative rejected_: a separate handler per door, which would drift apart.

- **A refused launch keeps the previous project** (W3 review F3, option a). Clearing it would wipe
  a persisted pick just because of a typo. The price is that callers must check `refused` before
  trusting `context`.

- **Cut rather than hide.** Relay collaboration and git sync were deleted, not feature-flagged
  (2026-09-22, about 7,500 lines), including their guards on hold, archive and delete.
  - Flags or guards that are "permanently false" were rejected. A dead guard still reads as a
    possible refusal, and it keeps dead config alive.

- **MLX Whisper stays local, over Groq** (FR-150 was deferred). It is free and fast on Apple
  Silicon. This is now being superseded by a shared FliTools transcription service (B584), not by
  a second engine inside FliHub.

## Non-obvious Constraints

- **Stage never advances by itself.** Every stage past `recording` is a manual override in
  _global_ `server/config.json`, keyed by folder name. The overrides don't travel when a project is
  archived or copied, and they would bleed across brand roots whose codes collide (archaeology #1, #4).

- **Three allowlists guard config.** A `Config` field survives a save only if it is named in all
  three:
  - the `POST /api/config` destructure (`routes/index.ts`);
  - `updateConfig` (`index.ts`);
  - `saveConfig` (`configManager.ts`).

  `whisperBinary`, `whisperModel`, `whisperLanguage` and `diskThresholds` are read but never saved.
  `writeProjectState()` is the same kind of allowlist for `.flihub-state.json`.

- **Two routers claim one path.** `hold.ts` and `storage.ts` are both mounted on `/api/projects` and
  both define `POST /:code/hold`. `hold.ts` is mounted first, so the storage panel's `/hold` is
  answered by the old B064 handler. Each router's own test passes, because each test mounts only
  that router.

- **Empty-trash deletes only top-level files.** `safeDelete` unlinks the files directly inside
  `-trash/`. The trash endpoint reports any files inside subfolders separately (`nestedCount`), so
  the pill never claims "empty" while bytes remain.
  - No current FliHub writer creates subfolders.
  - FliStudio's empty-trash does recurse into subfolders.

- **Promotion always writes `.mov`.** The watcher accepts `.mp4`, but `buildRecordingFilename` and
  the b-roll branch both append `.mov`.

- **The server kills whatever holds its port on startup.** `cleanupPort()` in `index.ts` runs
  `kill -9` on the port's owner. A stray `npm run dev` can therefore take down the
  Overmind-supervised server.

- **Two brand listers disagree.** `/api/brands` lists `brands.json` entries plus any unregistered
  `v-*` sibling folders. The open-contract doors only know `brands.json`. So a disk-only brand can be
  switched to in the UI but is refused as `unknown-brand` by `POST /api/context`.

- **Vitest and tsx load different files.** Server code imports `../../../shared/X.js`.
  - tsx maps that import to the `.ts` source.
  - Vitest loads the tracked, stale `shared/X.js` when one exists.
  - `paths.js` was deleted. `types.js`, `naming.js` and `constants.js` still shadow their `.ts` in
    tests.

## Expert Mental Model

- **Ask "which layout?" before "which folder?"** A path containing the literal `'recordings'` is a
  bug waiting for the first hub project. Only `getProjectPaths` knows where a project keeps its
  takes. Recovering the project from a recording's path needs `projectDirFromRecordingPath`, because
  `indexOf('recordings')` returns `<project>/hub`.

- **Ask "which resolver?" before "which project?"** The same short code can resolve to different
  folders depending on the door. The `:code` routes take the first alphabetical prefix match;
  `/api/context` takes the whole code or refuses with a 409.

- **A green response isn't proof the work happened.** The repo's earned rule (CLAUDE.md → Operating
  Rules; `docs/kdd/learnings.md` FR-159) is that a skip, a veto or a refusal must say which one it
  was.
  - When a button "does nothing" and there are no errors anywhere, look for a silent gate upstream.
  - The shadowed hold route is this class: it answers `success: true` for the wrong operation.
  - The trash pill shows "Trash ?" rather than "0" when the folder can't be read, for the same reason.

- **The query layer describes the model; it isn't derived from it.** `/api/query/*` responses are
  hand-built. For example, `/api/query/config` still serves the dead stage list
  `['none','recording','editing','done']`. `shared/apiRegistry.ts` lists 34 endpoints, while the
  routers define about 150. Trust the [schema mirror](schema-mirror.md) and the routers, not these views.

- **Capabilities are leaving FliHub, not arriving.** In the last two days relay, git sync and
  shadows went. Transcription is next (FliTools). Layout rules, video naming and trash zones moved
  into fli-core. A change that makes FliHub own *more* should be questioned against the North Star
  scope rule: "everything else is a tab".

## Scope Limits

- Does NOT edit video. First edit, second edit and final belong to FliCut and the external editors
  (Gling, DaVinci). FliHub never writes into edit folders.
- Does NOT sync machines. Relay collaboration and git sync were removed on 2026-09-22. Moving bytes
  between machines is not FliHub's job.
- Does NOT migrate a project between layouts. That is FliStudio's `project.migrate-layout`, and it
  refuses while FliHub has the project open or a T7 copy exists.
- Does NOT own project identity or adoption. `fli.studio.json` is written by FliStudio; FliHub reads
  it through fli-core and accepts plain folders (`membership: "folder"`).
- Does NOT create chapter videos (`POST /api/chapters/generate` returns 410) or shadow recordings.
  `recording-shadows/` folders still travel on hold, but no code creates or reads them.
- Does NOT rename or move projects. Identity is the folder name.
- Does NOT publish. The final upload is manual.

## Failure Modes

- **The storage panel's Hold runs the old B064 hold.** Symptom: the toast says "Held heavy files to
  T7", but the heavy subfolders are still on local disk. The B064 handler (`hold.ts`) rsyncs and
  verifies but deletes nothing locally, and it answers before `storage.ts` can.
  [inferred from mount order and a mounted-router probe; not observed in the live app]

- **A code path that skipped the layout shows an empty project.** Symptom: a hub project shows 0
  recordings, 0% transcribed, or a missing transcript in one view but not in another. Cause: a site
  that joins `'recordings'` or `'recording-transcripts'` by hand.
  - All known sites were routed through `getProjectPaths` on 2026-09-22.
  - A new one fails silently, because no error is raised.

- **Whisper settings silently revert.** A custom `whisperModel` or `whisperBinary` in
  `server/config.json` works until the next config save from the UI, then the defaults return. The
  cause is the `saveConfig` allowlist.

- **A new state field vanishes.** A field added to `ProjectState` round-trips once, then disappears
  after an unrelated state write. The cause is the `writeProjectState()` allowlist.

- **Restoring a held project into a migrated one hides its takes.** HOLDING holds `recordings/` for a
  legacy project. If the local copy had been migrated to `hub/`, a restore would recreate a
  top-level `recordings/` that the layout rule ignores. FliStudio's migrate tool refuses a project
  that has a T7 copy to prevent this.

- **CI always fails.** Every push to `main` goes red within about 25 seconds. `npm ci` can't clone
  `flivideo/fli-core` over git+ssh (the lockfile form of the `github:` dependency) and CI has no
  SSH key. The repo itself is public. Local tests are the only gate.

- **Test counts double.** The server reports about twice the real number of tests. A stale,
  gitignored `server/dist/` is collected by vitest; run with `--exclude 'dist/**'`.

- **A short code opens the wrong project.** `/api/query/projects/c10` can return a different project
  than you expected, because of prefix matching plus alphabetical order with no ambiguity error.
