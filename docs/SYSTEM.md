---
generated: 2026-09-22
generator: system-context
audience: human
status: snapshot
supersedes: CONTEXT.md (2026-04-08, same generator — left in place with a pointer)
sources:
  - CLAUDE.md
  - AGENTS.md
  - README.md
  - CONTEXT.md
  - context.globs.json
  - package.json
  - Procfile
  - start.sh
  - scripts/app.sh
  - .github/workflows/ci.yml
  - server/package.json
  - server/nodemon.json
  - server/tsconfig.json
  - server/vitest.config.ts
  - server/config.template.json
  - server/src/index.ts
  - server/src/watcher.ts
  - server/src/config/configManager.ts
  - server/src/config/env.ts
  - server/src/routes/index.ts
  - server/src/routes/context.ts
  - server/src/routes/brands.ts
  - server/src/routes/hold.ts
  - server/src/routes/storage.ts
  - server/src/routes/relay.ts
  - server/src/routes/sync.ts
  - server/src/routes/transcriptions.ts
  - server/src/routes/projects.ts
  - server/src/routes/manage.ts
  - server/src/routes/miccheck.ts
  - server/src/routes/poem-wui.ts
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
  - server/src/test/storageRoutes.test.ts
  - server/src/test/holdArchiveInventory.test.ts
  - shared/package.json
  - shared/types.ts
  - shared/types.js
  - shared/contextSchemas.ts
  - shared/naming.ts
  - shared/apiRegistry.ts
  - client/vite.config.ts
  - client/tsconfig.json
  - client/src/App.tsx
  - client/src/hooks/useStorageApi.ts
  - client/src/hooks/useHoldApi.ts
  - client/src/components/shared/StoragePanel.tsx
  - client/src/components/shared/ToolsSidebar.tsx
  - client/src/components/shared/RelayTool.tsx
  - client/src/components/shared/SyncTool.tsx
  - docs/backlog.md
  - docs/kdd/learnings.md
  - docs/rebuild-2026/README.md
  - docs/rebuild-2026/NORTH-STAR.md
  - docs/rebuild-2026/requirements-archaeology-2026-09.md
  - docs/architecture/project-codes.md
  - docs/architecture/edit-folders.md
  - server/src/routes/chapters.ts
  - ../docs/agent-comprehension-docs.md
regenerate: 'Run /dev-team:system-context in the repo root (per ../docs/agent-comprehension-docs.md)'
---

# FliHub — System Context

> For humans orienting on the codebase. Agents load [AGENT-NOTES.md](AGENT-NOTES.md) instead.
> There is **no schema mirror** for this repo yet: `/dev-team:schema-mirror` has no TypeScript
> extractor, so step 1 of the comprehension run was skipped. Schema facts below are cited to the
> source file. Open the file rather than trusting a restatement.

## Purpose

FliHub is the watcher that sits behind Ecamm Live on David's recording machine. The moment a take
lands in the Ecamm folder, FliHub queues it. David then picks the takes worth keeping and promotes
each one into the active video project under a chapter/sequence filename. Transcription, assets and
storage moves all happen around that promoted file. This is the North Star sentence in
`docs/rebuild-2026/NORTH-STAR.md` §1. FliHub is a single-user, local-first tool for one creator plus
a few editor machines, and it is in the middle of a rebuild campaign (B475).

## Core Abstractions

- **The pending take** is a `.mov` or `.mp4` in `watchDirectory`. It is held only in memory, in the
  server's `pendingFiles` map (`server/src/index.ts`), and re-sent to every socket that connects. It
  has no identity until it is renamed. _Discard_ (`DELETE /api/files/:path`) only drops it from the
  map. The file stays in `watchDirectory`, and because the watcher runs with `ignoreInitial: false`
  (`server/src/watcher.ts`), it reappears in Incoming after a server restart. _Trash_
  (`POST /api/trash`) is the verb that actually moves the file. Everything else in FliHub operates
  on takes that have already been promoted.

- **The recording is its filename.** Promotion (`POST /api/rename`, `server/src/routes/index.ts`)
  moves the file into `{project}/recordings/` as `{chapter}-{sequence}-{name}-{TAGS}.mov`. The
  grammar lives in `NAMING_RULES` (`shared/naming.ts:16`): strict when creating a file, lenient when
  parsing an existing one. Chapters, sequences and tags are all derived from filenames wherever they
  are read. Nothing about the recording lives in a database. Per-recording _flags_ (safe, parked,
  annotation) and per-project metadata (YouTube title, chapter titles, `ships`, dictionary) live in
  the project's `.flihub-state.json` (`server/src/utils/projectState.ts`; type `ProjectState` at
  `shared/types.ts:1181`). So "the filename is the only metadata" was true once and is now only
  mostly true.

- **The project is a folder name under a brand root.** Identity is the folder name verbatim
  (`docs/architecture/project-codes.md`). `projectsRootDirectory` plus `activeProject` in
  `server/config.json` are the two coordinates, and `projectDirectory` is derived from them on every
  load (`server/src/config/configManager.ts`). There are **two resolvers with different rules**:
  - the legacy `:code` resolver (`server/src/utils/projectResolver.ts`) takes the first folder, in
    alphabetical order, whose name _starts with_ the input;
  - the open-contract resolver (`server/src/utils/openContext.ts`) goes through `@flivideo/core`
    and refuses an ambiguous code with a 409.

  Stage is a `ProjectStage` union (`shared/types.ts:438`). Auto-detection only ever answers
  `planning` or `recording` (`server/src/utils/projectStats.ts`); a human sets every later stage,
  and those overrides are stored in _global_ config keyed by folder name.

- **The brand is a root, resolved through the shared Fli contract.** A brand is a key in
  `~/.config/appydave/brands.json`. The root it points to on this machine is resolved by
  `@flivideo/core` (`resolveBrandRoot`, with the `~/.fli/machine.json` override). FliHub **reads**
  `brands.json`, `~/.fli/machine.json` and a project's `fli.studio.json` (the identity file, via
  `readIdentity`). It **writes** none of them, and it neither reads nor writes any `fli.<app>…json`
  decision file. For the shape of those files, see fli-core (`../fli-core/`) and the open contract
  (`../flistudio/docs/open-contract.md`). They are not restated here. A brand switch also moves the
  two T7 paths (`publishedPath`, `holdingPath`) together with the root (`server/src/utils/brands.ts`).

- **Storage lanes** are the places a project's bytes can be:
  - local disk;
  - the relay (`relayDirectory/{code}/{recordings,edit-1st,edit-2nd}`, moved by rsync);
  - T7 HOLDING (heavy subfolders evacuated, with the shell left local);
  - T7 PUBLISHED (the whole folder archived).

  The verbs are in `server/src/routes/hold.ts` (B064) and `server/src/routes/storage.ts` (the
  storage panel). Moving storage never changes a project's identity.

## Key Workflows

### Record → promote → transcribe (the one workflow that matters)

1. David stops recording with the foot pedal. Ecamm writes the file into `watchDirectory`.
2. chokidar (`server/src/watcher.ts`, `*.{mov,mp4}`, with `awaitWriteFinish`) waits for the file to
   finish writing, probes its duration with ffprobe, and emits `file:new`. The take appears in the
   **Incoming** tab.
3. David picks a chapter and a name (NamingControls suggests the next sequence; common names can
   carry chapter filters) and promotes the take. The server moves it into `recordings/`, or into
   `b-roll/` for a chapter-less b-roll take (FR-161), and records the rename in an in-memory undo
   list.
4. Recordings (not b-roll) are queued for transcription. A single in-process worker
   (`server/src/routes/transcriptions.ts`) spawns `mlx_whisper` (default
   `~/.pyenv/shims/mlx_whisper`), using the global Gling dictionary as `--initial-prompt`. The
   output is `.txt`, `.srt` and `.json` in `recording-transcripts/`. Progress streams over the socket
   as `transcription:*` events.
5. From the Recordings view, David copies or sends transcripts onward, for example to the POEM WUI
   intake (`server/src/routes/poem-wui.ts`).

### Point FliHub at a brand and project (the open contract)

1. There are three ways in: the picker in the UI, launch arguments
   (`./start.sh --brand … --project …`, or `FLIVIDEO_*` env), or `POST /api/context`.
2. The last two both go through `applyContext` (`server/src/utils/openContext.ts`), which resolves
   via `@flivideo/core` and then calls the same `updateConfig` that a UI pick uses.
3. A refusal uses the shared refusal vocabulary (`REFUSAL_CODES`, `shared/contextSchemas.ts`) and
   leaves the previous project open. `GET /api/context` is derived from live config, so a pick in the
   UI and a door-3 call report the same state. A launch is stamped with `FLIVIDEO_LAUNCH_ID`
   (`server/.launch-context.json`), so a nodemon restart does not re-apply it on top of a later pick.
4. The README's "Open at a brand and project" section is the caller-facing reference for this.

### Free disk: hold, archive, restore

1. The Storage panel (`client/src/components/shared/StoragePanel.tsx`) shows a storage tree per
   project and offers Hold, Restore, Archive, Unarchive and Archive-from-held.
2. The copies are rsync with `HOLD_EXCLUDES` (`server/src/utils/holdUtils.ts:11`), which leaves out
   `-trash/` and `s3-staging/`. The storage verbs verify the copy before deleting anything locally.
3. Guards refuse the move when the relay still holds bytes for the project, or when the T7 is not
   mounted.

### Hand a project to an editor machine (relay — deprecation cluster)

1. On the creator machine, David pushes `recordings/` to the relay with rsync
   (`server/src/routes/relay.ts`). The editor collects it, then pushes cut files back into
   `edit-1st` or `edit-2nd`.
2. Sync status is derived by comparing file counts, not hashes (`deriveSyncStatus`).
3. This whole lane exists because Jan edited remotely. It is part of the deprecation cluster
   (`docs/rebuild-2026/requirements-archaeology-2026-09.md`, "The deprecation cluster") along with
   shadows (already removed) and the FR-126 manifest, which was never wired up.

## Design Decisions

- **The filesystem is the database.** Recordings, projects and chapters are all derived by reading
  directories on each request. There are no caches and no DB.
  - _Alternative considered_: SQLite, or a per-file JSON sidecar.
  - _Why rejected_: files have to stay legible in Finder and on other machines, and there is no
    shared infrastructure across the fleet.
  - _Cost_: silence. An archived-on-purpose root and a mis-pointed root both just read as empty
    (archaeology #9).

- **Postel's law in the naming grammar.** `shared/naming.ts` writes strictly (two-digit chapters)
  and reads leniently (older one-digit files still parse).
  - _Alternative considered_: strict everywhere.
  - _Why rejected_: it would silently drop old projects' recordings.

- **One `applyContext` for every way into a project** (W3). Launch arguments and `POST /api/context`
  share one code path and derive their state from config rather than keeping a second store. The
  point is that FliStudio can drive every Fli app the same way.
  - _Alternative rejected_: per-door handlers, which would drift apart.

- **A refused launch keeps the previous project** (W3 review F3, option a). Clearing it would wipe a
  pick that had been persisted, just because of a typo. The price is that callers must check
  `refused` before trusting `context`.

- **FliHub accepts plain folders as projects** (`membership: "folder"`). Most projects have no
  `fli.studio.json` yet, and adopting them is FliStudio's job. So FliHub never emits `not-a-project`.

- **zod appears only at the new seams.** The open-contract bodies (`shared/contextSchemas.ts`) and
  the environment (`server/src/config/env.ts`) are validated with zod. Everything older is
  hand-typed TypeScript interfaces, and request bodies are read with destructuring. [inferred] The
  pattern is to add schemas where the contract is shared across apps, not to retrofit old routes.

- **MLX Whisper stays local, over Groq** (FR-150 was deferred). It is free and fast on Apple
  Silicon. Moving to Groq would mean audio extraction and managing an API key, for no gain on the
  current machine.

## Non-obvious Constraints

- **Stage never advances by itself.** Every stage past `recording` is a manual override in _global_
  `server/config.json`, keyed by folder name. The overrides don't travel when a project is archived
  or copied, and they would bleed across brand roots whose codes collide (archaeology #1 and #4).

- **Three allowlists guard config.** A `Config` field survives a save only if it is named in:
  - the `POST /api/config` destructure (`routes/index.ts`);
  - `updateConfig` (`index.ts`);
  - `saveConfig` (`configManager.ts:121`).

  `whisperBinary`, `whisperModel`, `whisperLanguage` and `diskThresholds` are read but never saved,
  so a hand-edited value disappears the next time the server writes config (for example on a brand
  switch). `writeProjectState()` is the same kind of allowlist, for `.flihub-state.json`.

- **Two routers can claim one path.** `hold.ts` and `storage.ts` are both mounted on
  `/api/projects`, and both define `POST /:code/hold`. Express runs whichever router was mounted
  first (`hold.ts`), so `storage.ts`'s `/hold` handler is unreachable in the running app. Each
  router's own test passes, because each test mounts only that router.

- **Promotion always writes `.mov`.** The watcher accepts `.mp4` (commit `7600930`), but
  `buildRecordingFilename` (`shared/naming.ts:352`) and the b-roll branch both append `.mov`.

- **The server kills whatever holds its port on startup.** `cleanupPort()` in `index.ts` runs
  `kill -9` on the port's owner. This is why a stray `npm run dev` can take down the
  Overmind-supervised server.

- **Name length is capped in one place and not the other.** Recording names are silently cut to 50
  characters by `sanitizeName()` (`shared/naming.ts:327`). Project names are checked against the
  pattern only, so the 50-character rule is bypassed there (archaeology #8).

- **Two brand listers disagree.** `/api/brands` lists `brands.json` entries plus any unregistered
  `v-*` sibling folders. The open-contract doors only know `brands.json`. A disk-only brand can be
  switched to in the UI but refused as `unknown-brand` through `POST /api/context`.

## Expert Mental Model

- **Ask "which resolver?" before "which project?"** The same short code can resolve to different
  folders depending on the door: prefix-first-alphabetical under `/api/query/projects/:code` and the
  other `:code` routes, whole-code-or-409 under `/api/context`. An expert reads the route, not the
  URL.

- **A green response isn't proof the work happened.** The repo's earned rule (CLAUDE.md →
  Operating Rules; `docs/kdd/learnings.md` FR-159) is that a skip, a veto or a refusal must say which
  one it was. When a button "does nothing" and there are no errors anywhere, look for a silent gate
  upstream, not a failing worker. The shadowed hold route is this class again: the old handler
  answers `success: true`, so the storage panel's success toast fires even though a different
  operation ran.

- **The query layer describes the model; it isn't derived from it.** `/api/query/*` responses are
  hand-built literals with no internal consumer. For example, `/api/query/config` still serves the
  dead stage list `['none','recording','editing','done']` (`routes/query/index.ts`). The same goes
  for `shared/apiRegistry.ts`: the in-app API Explorer lists 34 endpoints, while the routers define
  about 170. Treat both as views that can lag behind the code.

- **Chapters are derived in three places.** The Recordings view groups by `NN-` prefix on the
  client, `/api/query/…/chapters` reads a final SRT, and POEM WUI re-derives chapters from
  filenames. Before touching anything called "chapter", grep all three (`docs/kdd/learnings.md`
  FR-157).

- **Jan-era machinery is dying as a cluster.** Relay edit lanes, the FR-126 manifest and shadows
  exist for the same reason. Shadows are gone: `storageTree.ts:24` keeps the folder name only so
  that legacy folders still travel on hold. A change to one of the three should be made knowing the
  other two are going too.

## Scope Limits

- Does NOT edit video. First edit, second edit and final belong to FliCut and the external editors
  (Gling, DaVinci). FliHub never writes into `edit-1st`/`edit-2nd` (`docs/architecture/edit-folders.md`).
- Does NOT create chapter videos any more. `POST /api/chapters/generate` returns 410 (FliStudio
  roadmap §1.2e); existing `recordings/-chapters/` files still play.
- Does NOT generate shadow recordings (FR-83 was removed on 2026-09-04).
- Does NOT own project identity or adoption. `fli.studio.json` is written by FliStudio; FliHub only
  reads it through fli-core.
- Does NOT rename or move projects. A folder rename or code change has no route; titles are
  metadata (FR-157, `docs/architecture/project-codes.md`).
- Does NOT publish. The final upload is manual; FliHub stages files and reports `hasFinal`.
- Does NOT merge relay conflicts. `diverged` is detected, not resolved.

## Failure Modes

- **The storage panel's Hold runs the old B064 hold instead.** Symptom: the success toast says
  "Held heavy files to T7", but the heavy subfolders are still on local disk. The B064 handler
  (`hold.ts:93`) rsyncs and verifies but deletes nothing locally, and it answers before the
  storage-panel handler (`storage.ts:185`) can. [inferred from code order and a mounted-router probe;
  not observed in the live app]

- **Whisper settings silently revert.** Symptom: a custom `whisperModel` or `whisperBinary` put in
  `server/config.json` works until the next config write from the UI, then the defaults come back.
  Cause: the `saveConfig` allowlist.

- **A new state field vanishes.** Symptom: a field added to `ProjectState` round-trips once and is
  gone after an unrelated state write. Cause: the `writeProjectState()` allowlist
  (`projectState.ts`, comment at line 99).

- **CI always fails.** Symptom: every push to `main` is red within about 25 seconds. Cause:
  `npm ci` can't clone the private `github:flivideo/fli-core` over SSH ("Permission denied
  (publickey)"), so lint, the format check, the build and the tests never run in CI. Local
  `npm test` is the only gate.

- **Test counts double.** Symptom: the server reports about 1,356 tests instead of about 696. Cause:
  a stale, gitignored `server/dist/` is collected by vitest. The coverage thresholds in
  `server/vitest.config.ts` never fire, because `coverage` sits outside `test` (NFR-172).

- **Sync push commits everything.** `POST /api/sync/push` runs `git add -A`, commits and pushes.
  With no body it defaults to the `video-project` channel, which is the whole brand root
  (`projectsRootDirectory`), not the active project. The `app-code` channel is the FliHub checkout,
  including any uncommitted work an agent left behind. Status after a failed `git fetch` still
  stamps `lastFetch: now`.

- **Stale sync status.** `git fetch` failures are swallowed (`sync.ts`), so an offline machine
  shows a confident "clean".

- **Short code opens the wrong project.** Symptom: `/api/query/projects/c10` returns a different
  project than you expected. Cause: prefix match plus alphabetical order, with no ambiguity error.
  `/api/context` would have refused with a 409.
