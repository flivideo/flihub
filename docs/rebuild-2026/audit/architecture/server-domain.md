# Architecture Audit — Server Domain, Persistence & Filesystem Model

**Repo:** `/Users/davidcruwys/dev/ad/flivideo/flihub`
**Commit audited:** `3b3b2f1` (working tree has uncommitted client-side changes; none in server/src or shared/)
**Date:** 2026-08-26
**Scope:** `server/src/utils/**` (30 modules), `server/src/watcher.ts`, `server/src/WatcherManager.ts`,
`server/src/config/configManager.ts`, `server/src/scripts/scanProjects.ts`, plus the route modules and
`shared/` files those pull in.
**Framing:** rebuild-oriented. Architectural flaws only — things that would change how you *build* it,
not things you'd fix with a patch.

---

## The central question, answered up front

> FliHub's database IS the filesystem. Is that model explicit and owned by one module?

**No — it is *described* by one module and *owned* by none.**

`shared/paths.ts` (65 lines) is a good idea executed halfway. It declares a `ProjectPaths` interface
with 15 derived paths and a single `getProjectPaths(projectDirectory)` factory. But it is a **read-only
naming convenience**, not a schema:

- It **describes** paths; it never **creates** them. There is no `ensureProjectStructure()` anywhere
  (`grep -rn "scaffold|createProjectStructure|initProject|ensureProjectDirs" server/src client/src` →
  **0 hits**). Instead there are **39 `ensureDir`/`mkdir` call sites across 14 non-test modules**, each
  creating whatever folder that one feature needs, lazily, at write time. Project structure is therefore
  *emergent* — a project "has" a `final/` folder only because some code path already wrote into it.
- It **omits** a first-class concept. `recording-shadows/` (FR-83) is not in `ProjectPaths` at all
  (`grep -n shadow shared/paths.ts` → no match), yet it is referenced at **44 non-test sites** and
  reconstructed by hand as `path.join(x, 'recording-shadows')` in at least **14 distinct files**
  including `WatcherManager.ts:151`, `renameRecording.ts:93`, `shadowFiles.ts`, `projectStats.ts`,
  `diskUtils.ts`, `safeMigration.ts:54`, `scanProjects.ts`. `assets/prompts` is likewise absent
  (`scanning.ts:169`).
- It is **routinely bypassed**. There are **345 `path.join(...)` call sites in 47 non-test server
  modules**. Of those, **58 sites in 20 non-test files** join a project root to a hard-coded FliHub
  folder literal (`recordings`, `-safe`, `-chapters`, `assets`, `s3-staging`, `recording-transcripts`,
  `recording-shadows`, `inbox`, `final`, `-trash`) *without* going through `getProjectPaths`. Several
  do both in the same function — `renameRecording.ts:93` builds the shadow dir by hand from
  `paths.project` while using `paths.transcripts` two lines later.

Filename parsing is in better shape. `shared/naming.ts` (514 lines) is a genuine single source of truth
with 24 exported functions, and `parseRecordingFilename`/`parseImageFilename` are used at **52 non-test
sites across 12 files**. But **15 ad-hoc filename regexes** still live outside it, and they disagree on
strictness — `scanning.ts:40`, `renameRecording.ts:111`, `query/chapters.ts:46`, `query/export.ts:203`,
`relay.ts:245`, `transcriptions.ts:656` all use `/^(\d{2})-/` (strict 2-digit) while
`transcriptions.ts:774` uses `/^(\d{1,2})-(\d+)-(.+)\.txt$/` (lenient) and `naming.ts` itself carries
*both* a `pattern` and a `parsePattern` for exactly this reason. Which one a given file gets depends on
which endpoint you hit.

**Verdict on the model:** the filesystem-as-database has a *vocabulary* (`paths.ts`, `naming.ts`) but no
*schema owner*, no *migration story*, no *integrity checker that runs*, and no *transactional writer*.
Everything below follows from that.

---

## Finding 1 — Persistence is an allow-list, and it silently drops fields (CRITICAL)

Two of the three durable stores write a **hand-maintained enumeration of fields**, not the object they
were given. Anything not on the list is silently discarded, and the caller is told it succeeded.

**`server/src/config/configManager.ts:122-169` — `saveConfig`:**

```ts
export function saveConfig(configPath: string, config: Config): void {
  try {
    const toSave: Record<string, unknown> = {
      watchDirectory: config.watchDirectory,
      projectsRootDirectory: config.projectsRootDirectory,
      activeProject: config.activeProject || '',
      availableTags: config.availableTags,
      commonNames: config.commonNames,
      imageSourceDirectory: config.imageSourceDirectory,
      glingDictionary: config.glingDictionary || [],
    };
    // ... 11 more `if (config.X) toSave.X = config.X` lines ...
    fs.writeJsonSync(configPath, toSave, { spaces: 2 });
```

`shared/types.ts` `interface Config` declares **25 fields**. `saveConfig` writes at most **18**.
Never persisted: `fileExtensions`, `chapterRecordings`, `diskThresholds`, `whisperBinary`,
`whisperModel`, `whisperLanguage`.

This is not theoretical. **`server/src/routes/chapters.ts:63-86`:**

```ts
router.put('/config', (req: Request, res: Response) => {
  ...
  config.chapterRecordings = newChapterConfig;
  saveConfig(config);
  res.json({ success: true, config: newChapterConfig });
});
```

The endpoint returns `success: true`. `saveConfig` never writes `chapterRecordings`. The setting is
gone at next server start. The live `server/config.json` on this machine has exactly **16 keys** —
`chapterRecordings`, `diskThresholds`, `fileExtensions` and the three `whisper*` keys are all absent,
which is consistent with the allow-list, though absence alone does not prove the user ever set them.

The whisper fields are worse in a subtler way: `loadConfig` returns `{...defaults, ...saved}`
(`configManager.ts:111`), so a hand-edited `whisperBinary` in `config.json` *is* loaded into memory and
*is* used (`transcriptions.ts:125`). But the next time **any** unrelated setting is saved, `saveConfig`
rewrites the whole file without it. Hand-tuning the transcription binary is silently reverted by
clicking an unrelated toggle.

**`server/src/utils/projectState.ts:76-96` — `writeProjectState`** has the same shape:

```ts
const stateToWrite: ProjectState = {
  version: 1,
  recordings: state.recordings || {},
  ...(state.glingDictionary?.length ? { glingDictionary: state.glingDictionary } : {}),
  ...(state.editManifest ? { editManifest: state.editManifest } : {}),
};
```

Today `ProjectState` has exactly those 4 fields (`shared/types.ts:1191-1196`), so nothing is lost *yet* —
but the next field added to the interface is silently dropped by every writer until someone remembers
to edit this literal. The type system cannot catch it, because the object is *constructed*, not *spread*.

Note the durability asymmetry: `writeProjectState` does tmp-write + `fs.rename` (atomic,
`projectState.ts:93-95`); `saveConfig` does a bare `fs.writeJsonSync` and swallows the error into a
`console.error` while returning `void` (`configManager.ts:165-169`). Two stores, two different
durability disciplines, neither documented as a decision.

**Rebuild implication:** never let a persistence layer enumerate fields. Serialise the whole validated
object (zod/valibot schema → `parse` on read, `stringify` on write), version it, and make *adding a
field* a one-line schema change with no writer edits. Make `save` return a Result the caller must handle.

---

## Finding 2 — Multi-file operations have no transaction, and the guard is on the wrong side (CRITICAL)

`renameRecording` is the most-used mutation in the app (called from `routes/index.ts:1077`,
`manage.ts` bulk-rename / rename-chapter / swap-chapters / split-chapter / undo-rename). It touches up
to **8 filesystem objects plus the state file**: the `.mov`, the `.mp4` shadow, five transcript
extensions, the stale chapter video, and the `.flihub-state.json` key.

**`server/src/utils/renameRecording.ts:302-338`:**

```ts
// Phase 1: Rename derivative files in-place
await renameDerivableFiles(oldFilename, newFilename, paths);   // shadows + 5 transcripts

// Phase 2: Rename core files (recording + state migration)
await renameCoreFiles(oldFilename, newFilename, paths);
```

And `renameCoreFiles` (`:232-260`):

```ts
// Guard: prevent silent overwrite of existing files
if (await fs.pathExists(newPath)) {
  throw new Error(`Target file already exists: ${newFilename}`);
}
await fs.rename(oldPath, newPath);
const state = await readProjectState(paths.project);
...
await writeProjectState(paths.project, updatedState);
```

The conflict guard runs in **Phase 2**, *after* Phase 1 has already renamed the shadow and all five
transcripts. If it fires, `renameRecording` returns `{success:false}` and the caller reports a clean
failure — but on disk the derivatives now carry the **new** basename while the `.mov` still carries the
**old** one. The entire derivative model joins by basename (`getTranscriptSyncStatus` in
`scanning.ts:52-80`, `getShadowCounts` in `shadowFiles.ts`), so that project now permanently reports
one missing transcript and one orphaned transcript, and the shadow will never play. There is no
rollback and no compensating action anywhere in the function.

The same non-atomicity repeats at the batch level. `routes/index.ts:1055-1070` pre-checks conflicts for
the whole batch, then `:1077` loops calling `renameRecording` one file at a time; a failure at file 3
leaves files 1-2 renamed with no undo. `manage.ts:86 bulk-rename` records `lastBatchMapping` only after
the fact.

The one module that got this right is the newest one. `routes/storage.ts:178-300` implements an explicit
two-pass copy-verify-then-delete with honest failure messages:

```
`Hold verification failed for '${sub}': local=${v.srcFiles} files/${v.srcBytes} bytes,
 holding=${v.destFiles} files/${v.destBytes} bytes. Local NOT deleted. Partial copies in
 HOLDING may need manual cleanup for: ${rsyncedSubfolders.join(', ')}`
```

That discipline was written once, for one feature, and never extracted into a primitive the rest of the
codebase could use. `grep -rni "rollback|transaction|journal|two-phase|atomic" server/src` (non-test)
returns hits in only **3 files**: `storage.ts`, `safeMigration.ts`, `storageActivityLog.ts` — and
`storageActivityLog.ts:14-16` explicitly documents itself out of the job: *"the log is a breadcrumb,
not a transaction."*

**Rebuild implication:** derivative files should not be joined to their source by *filename*. Give each
recording a stable opaque id (folder-per-recording, or an id recorded in state) so renaming is a
**single** metadata write and no derivative ever needs to move. If you keep the filename join, then a
`FileTransaction` primitive — plan all moves, validate all preconditions, execute, compensate on
failure — must exist before the first feature is written, not after the tenth.

---

## Finding 3 — Four different answers to "which project is this?" (CRITICAL)

Project identity is the most fundamental concept in the domain and it has **four incompatible
implementations**, one of which is ambient global state.

**(a) `utils/projectResolver.ts:49-77` — the intended one.** Filters out dotfiles, `-`-prefixed dirs and
`archived`; exact match first; then prefix match, **sorted**, take `[0]`. Used at 11 non-test sites
across 8 files — all of them read-only `routes/query/*` and `projects.ts`.

**(b) `routes/state.ts:120` and `:189` — inlined, twice, and different:**

```ts
const entries = await fs.readdir(projectsRoot, { withFileTypes: true });
const projectFolder = entries.find((e) => e.isDirectory() && e.name.startsWith(code));
```

No dotfile/`archived` filtering, no exact-match-first, **no sort** — it takes whatever `readdir` returns
first. For input `"b6"` with folders `b6-foo/` and `b60-bar/` present, (a) deterministically returns
`b6-foo` while (b) returns whichever the filesystem enumerates first. This is the module that writes
`.flihub-state.json` — the durable per-recording data (safe/parked/annotation/dictionary/manifest).
*I did not empirically produce a divergence; I am reporting that the two algorithms differ, which makes
divergence possible, not that it has occurred.*

**(c) `routes/hold.ts:25-27` — no validation at all:**

```ts
function resolveProjectDir(config: Config, code: string): string {
  const projectsRoot = expandPath(config.projectsRootDirectory!);
  return path.join(projectsRoot, code);
}
```

This feeds the destructive hold/restore/delete verbs. (Downstream safety gates in
`holdUtils.ts:384-404` do check the resolved path is strictly inside `projectsRoot`, which blocks the
traversal case — but they cannot detect "right shape, wrong project".)

**(d) `expandPath(config.projectDirectory)` — the ambient active project.** `config.projectDirectory` is
referenced at **89 non-test sites across 14 route modules**. The modules that use it own **86 mutating
routes** between them (`index.ts` 11, `manage.ts` 12, `projects.ts` 9, `relay.ts` 7, `assets.ts` 7,
`thumbs.ts` 4, `transcriptions.ts` 4, `poem-wui.ts` 4, `system.ts` 3, `edit.ts` 2, `shadows.ts` 2,
`chapters.ts` 2). None of them take a project identity in the request; they act on whatever the server's
singleton `currentConfig` currently points at.

The sharpest case is **`manage.ts:1459-1512` `POST /undo-rename`**:

```ts
let lastBatchMapping: Array<{ oldFilename: string; newFilename: string }> = [];  // :45 — no projectCode
...
const config = getConfig();
const paths = getProjectPaths(expandPath(config.projectDirectory));   // :1465 — re-read at undo time
for (const { oldFilename, newFilename } of reversedMapping) {
  const filePath = path.join(paths.recordings, newFilename);
  if (!(await fs.pathExists(filePath))) { skippedCount++; continue; }
  await renameRecording(newFilename, oldFilename, paths, activeJob, queue);
}
```

The undo buffer carries **no project identity**. Bulk-rename in project A, switch to project B, hit
undo → the loop runs against B's `recordings/`. The `pathExists` check makes it *skip* names that don't
exist — but recording names are convention-generated (`01-1-intro.mov`), so collisions across projects
are the expected case, not the exception. Confirmed by reading the code; I have not executed it.

**Rebuild implication:** make `ProjectId` an explicit, validated, first-class parameter on **every**
endpoint that touches a project. Delete the ambient "active project" from the server entirely — let the
client hold the selection and pass it. Any in-memory buffer (undo, queue, batch) must be keyed by
`ProjectId` and refuse to apply against a different one. One resolver, one algorithm, no inlined copies.

---

## Finding 4 — "Safe" has two representations and FR-111 never finished (HIGH)

FR-111 migrated `safe` from a physical `recordings/-safe/` folder to a state flag
(`RecordingState.safe`, `shared/types.ts:1184`). `utils/safeMigration.ts` runs on every server boot
(`index.ts:349-366`) to move files back and set the flag. Comments across the codebase declare the
folder dead:

- `scanning.ts:103` — `// FR-111: Removed recordings/-safe (no more -safe folder)`
- `WatcherManager.ts:146` — `// FR-111: No more -safe folders (safe status tracked in state file)`
- `renameRecording.ts:134` — `// FR-111: Shadow files are ... only in main recording-shadows/ folder (no -safe subfolder)`
- `projectStats.ts:54` — `// FR-111: safeCount removed`

It is not dead. `shared/paths.ts:40` still derives `paths.safe`, and **12 non-test sites still read or
write it**, including read paths that would return stale data and one that still *writes* into it:

| Site | What it does |
|---|---|
| `routes/index.ts:1046` | `await findRecordings(paths.safe)` — enumerates the folder for rename |
| `routes/index.ts:1060` | `path.join(paths.safe, newFilename)` — conflict-checks a target *in* `-safe` |
| `routes/query/chapters.ts:43` | `for (const dir of [paths.recordings, paths.safe])` |
| `routes/query/export.ts:200` | same |
| `utils/poemWuiUtils.ts:106` | same |
| `routes/system.ts:297` | exposes `safe: paths.safe` to the UI |
| `routes/video.ts:92-97` | maps `recording-shadows-safe` → `recording-shadows/-safe` for streaming |
| `routes/transcriptions.ts:714` | scans `recording-shadows/-safe` |
| `routes/manage.ts:1040,1053` | deletes shadows from `[shadowsDir, shadowsDir/-safe]` |
| `scripts/scanProjects.ts:593` | still audits for `-safe` |
| `client/src/components/TranscriptSyncModal.tsx:36` | client builds a `recordings/-safe/` URL |

So a boolean now lives in two places (a folder and a JSON flag) with no invariant tying them together,
and the migration that was supposed to collapse them runs *once per boot* but is never able to finish
because live code paths can recreate the condition. `scanProjects.ts:74` still carries the unresolved
decision: `safeFolderDeprecated: false, // Decision 7: needs investigation`.

The migration itself is also not safe under partial failure. `safeMigration.ts:104-117` catches per-file
move errors *inside* the loop and merely records them, then writes state once at the end; the
`catch`-block rollback at `:152-173` only fires on a thrown error and its own `fs.move` reversals are
individually try/caught and logged — so a failed rollback leaves a file sitting in `recordings/` with
no `safe: true` flag. The file silently reappears in the active view. That is the exact failure mode
"safe" exists to prevent.

**Rebuild implication:** a status must have exactly one representation. Pick *state file* (right choice
here — it survives rsync and doesn't perturb the derivative-name join) and make the folder form
impossible to construct: don't export a `paths.safe` at all. And a migration must be a **one-way,
recorded, idempotent** step — write a `schemaVersion` into the state file and gate on it, rather than
re-detecting the old shape on every boot forever.

---

## Finding 5 — The watcher layer is nine bare invalidation pings with no change model (HIGH)

There are **two independent watcher systems**:

- `watcher.ts` — one chokidar watcher on `<watchDirectory>/*.mov` with `awaitWriteFinish`. Feeds the
  in-memory `pendingFiles: Map` in `index.ts:95`. Emits `file:new` / `file:deleted` *with* payloads.
- `WatcherManager.ts` — **nine** watchers: `zip`, `incoming-images`, `assigned-images`, `recordings`,
  `projects`, `inbox`, `transcripts`, `thumbs`, `relay`.

Every WatcherManager watcher except `relay` emits a **bare, payload-free event**:

```ts
// WatcherManager.ts:62
this.io.emit(config.event);
```

So the client is told "something under `recordings/` changed" and must refetch the whole view. There is
no change model — no "which file", no "what kind of change", no sequence number, no way for the client
to reconcile. `recordings:changed` is emitted from **10 different server locations**, and `state.ts:144`
and `:205` re-use it for *state file* changes because there is no `state:changed` event to use.

Four concrete drift windows, all verified by reading the watcher configs:

1. **`.flihub-state.json` is not watched by anything.** The `recordings` watcher watches
   `[paths.recordings, <project>/recording-shadows]` at `depth: 0` (`WatcherManager.ts:148-158`,
   default `depth: config.depth ?? 0` at `:50`). The state file lives at the *project root*. Any
   external edit — a relay/rsync pull from another machine, a hand edit, a second FliHub instance —
   is invisible until something else happens to fire an event.
2. **`recordings/-chapters/` is not watched.** `depth: 0` on `paths.recordings` means direct children
   only. Chapter videos are generated *into* that subdirectory (`chapterRecording.ts`), and there is no
   chapters watcher. `getProjectIndicators` (`scanning.ts:183`) reads it on demand, so the UI updates
   only on an unrelated invalidation.
3. **`final/`, `s3-staging/`, `-trash/`, `assets/prompts/` have no watcher at all** — yet `final/` is one
   of the three `HEAVY_SUBFOLDERS` that drive the storage panel's state derivation.
4. **`file:renamed` and `file:error` are declared in `ServerToClientEvents`
   (`shared/types.ts`) but emitted from zero server sites.** Dead contract surface the client may still
   subscribe to.

The in-memory `pendingFiles` map can also drift: it is populated only by `watcher.ts`'s `add` event and
cleared wholesale on watch-directory change (`index.ts:144`). It is mutated from `routes/index.ts` at
`:233`, `:283`, `:303`, `:330`. If a file is renamed on disk by an external tool, `onFileDeleted` fires
and drops it, but nothing re-adds under the new name unless the new name also lands in `watchDirectory`.
The reconnect path (`index.ts:336`) replays the map's contents to a newly connected client, so a drifted
map is served as truth to every new tab.

Likewise the transcription queue: `routes/transcriptions.ts:20-23` holds `queue`, `activeJob`,
`recentJobs`, `activeProcess` as module-level `let`. Nothing persists them. `nodemon` restarts on every
`.ts` edit (`server/nodemon.json`), and `killActiveProcess()` runs on SIGINT — so a restart mid-batch
silently discards every queued transcription with no user-visible error. *I have not observed this at
runtime; it follows from the state being module-scoped with no persistence and no re-hydration path,
and I found no re-queue-on-boot code.*

**Rebuild implication:** one watcher process producing **typed change events with payloads**
(`{kind, projectId, path, op}`), fanned out through a single invalidation bus with an explicit
event→query-key map. Watch the state file. Treat any in-memory view as a *cache* that is rebuilt from
disk on connect, never as the source of truth served to new clients.

---

## Finding 6 — Three-plus independent, drifting models of "what a project looks like" (HIGH)

`getProjectPaths` describes one model. At least four other modules declare their own:

| Module | Its model of project structure |
|---|---|
| `shared/paths.ts:36-57` | 15 named paths, incl. `safe` (dead), excl. `recording-shadows` |
| `utils/storageTree.ts:23` | `export const HEAVY_SUBFOLDERS = ['recordings', 'recording-shadows', 'final']` — comment literally says *"Single source of truth for Heavy subfolders"* |
| `utils/scanning.ts:105` | `const subdirs = ['recordings', 'recording-transcripts', 'assets/images', 'assets/thumbs']` (drives `lastModified`) |
| `utils/diskUtils.ts:135` | `getSubfolderSizes(projectDir, ['recordings', '-trash', 'recording-shadows'])` — an *exclude* list that is a fourth partition of the same folder set |
| `scripts/scanProjects.ts` | a fifth, including `recordings/-safe` at `:593` |

The relay subfolder set is declared **six times**:

```
server/src/routes/relay.ts:12        export const RELAY_SUBFOLDERS: RelaySubfolder[] = ['recordings', 'edit-1st', 'edit-2nd'];   ← the canonical one
server/src/WatcherManager.ts:259     if (!['recordings', 'edit-1st', 'edit-2nd'].includes(subfolder)) return;
server/src/utils/storageTree.ts:246  for (const sub of ['recordings', 'edit-1st', 'edit-2nd'])
server/src/routes/projects.ts:692    const relaySubdirs = ['recordings', 'edit-1st', 'edit-2nd'];
server/src/routes/storage.ts:88      for (const sub of ['recordings', 'edit-1st', 'edit-2nd'])
client/src/components/ProjectsPanel.tsx:239  const subfolders: RelaySubfolder[] = ['recordings', 'edit-1st', 'edit-2nd'];
```

An exported constant exists and **five of six sites don't use it**. Adding `edit-final` (already a
key in `EditManifest`, `projectState.ts:269`) means finding all six by grep.

The same fragmentation shows in the read layer. There are **115 directory-read call sites** in
non-test server code. `utils/filesystem.ts` exists specifically to standardise ENOENT-vs-real-error
handling — and is used at **34 sites** while **80 sites call `fs.readdir`/`readdirSync` raw**. Roughly
70% of directory reads bypass the module written to make directory reads consistent. Modules that read
raw either swallow everything in a bare `catch {}` (`storageTree.ts:36-39`, `diskUtils.ts:31-34`,
`projectResolver.ts`) or let permission errors escape as 500s — two opposite behaviours for the same
condition depending on which file you land in.

Similarly, the storage layer has **two verifiers with directly contradictory documented rationales in
the same file**:

```ts
// holdUtils.ts:194-196  (verifyHoldingMatch)
// B065: Match on file count only — byte totals differ across filesystems
// due to .DS_Store churn, resource fork handling, and extended attributes.

// holdUtils.ts:227-232  (verifyDirsMatch)
//   - compares bytes strictly — cross-filesystem byte drift on the same
//     source tree indicates a partial/corrupt copy, which is what we want to
//     catch before deleting the original.
```

Both gate destructive deletes of the same local↔T7 pair. They cannot both be right about whether byte
totals drift across those filesystems. *I did not measure real byte drift between APFS and the T7 — I am
reporting that the codebase asserts both propositions and acts on each.*

**Rebuild implication:** one declarative project-structure manifest — a data structure, not scattered
literals — that names every folder once and tags it (`heavy|light`, `derived|source`, `synced|local`,
`relay-subfolder: bool`). Every consumer (paths, watchers, disk sizing, storage classification, relay,
rsync excludes) derives from that one table. If a set is needed in two places, it is imported, never
retyped.

---

## Finding 7 — The integrity checker exists, is 944 lines, and has never been wired to run (MEDIUM-HIGH)

`server/src/scripts/scanProjects.ts` is a complete project-integrity scanner: naming violations,
structural issues, derivative mismatches, state inconsistencies; emits JSON, CSV and Markdown. It is
exactly the tool a filesystem-as-database needs.

Nothing runs it:

- Not in root `package.json` scripts (`dev`, `build`, `lint`, `lint:fix`, `format`, `format:check`,
  `test`, `test:client`, `test:server`, `test:ui`, `test:coverage` — no scanner).
- Not in `server/package.json` scripts (`dev`, `build`, `start`, `test`, `test:ui`, `test:coverage`).
- Not imported anywhere in `server/src` or `client/src`.
- Its only references are its own header, `docs/analysis/HOW-TO-RUN-SCANNER.md`, and two planning docs
  — all of which say to run `tsx server/src/scripts/scanProjects.ts` by hand.

Consequently its model has drifted. It carries its own `PROJECTS_ROOT`
(`process.env.PROJECTS_ROOT || ~/dev/video-projects/v-appydave`) and never reads `config.json`, so it
audits a *different* project set than the running app. It still checks `recordings/-safe`
(`:593`) months after FR-111. Its `DECISIONS` block is a frozen TODO
(`safeFolderDeprecated: false, // Decision 7: needs investigation`). Last commit touching it is
`14ff7c5` (2026-02-13), an ESLint cleanup.

The deeper point is not that the file is unused. It is that **the invariants of the data model live in a
script rather than in the writers**. Nothing prevents an invalid state from being written; a detached
tool can be run afterwards to notice.

**Rebuild implication:** invariants belong at the write boundary — validate on write, reject invalid
state, and make the integrity scan a *test* that runs in CI against fixture projects plus a
one-command `npm run doctor` against real ones. A checker that requires a human to remember it is a
checker that has already drifted.

---

## Finding 8 — Config is a mutated singleton with three writeback paths, two of which skip the watchers (MEDIUM)

`index.ts:111` — `const currentConfig: Config = loadConfigFromFile();` — is a module-level object
**mutated in place** for the process lifetime and handed to every router. Three inconsistencies:

1. **Two injection styles.** 16 routers get a getter `() => currentConfig`; `createDeveloperRoutes`
   (`index.ts:309`) gets the raw object. Two different lifetimes for the same dependency.
2. **Three writeback paths, and only one restarts watchers.**
   - `updateConfig()` (`index.ts:154-213`) — persists **and** calls `watcherManager.updateFromConfig`.
   - `projects.ts` (`:179`, `:234`) and `chapters.ts` (`:80`) get a different callback
     (`index.ts:256-259` / `:270-273`): `Object.assign(currentConfig, config); saveConfigToFile(...)` —
     **no `watcherManager.updateFromConfig`**. If a route on that path changes `activeProject` /
     `projectDirectory`, the recordings/inbox/transcripts/thumbs/assigned-images watchers keep
     watching the *old* project. I read `projects.ts:179` and `:234` and they set priorities/stages, not
     the project directory — so I have **not** established that this fires today. What I have
     established is that the seam permits it silently, with no type or runtime guard.
3. **`updateConfig` is a third hand-maintained field list** — 14 `if (newConfig.X !== undefined)`
   assignments (`index.ts:159-199`). A new `Config` field that isn't added here is accepted by the API
   and silently ignored. Same failure class as Finding 1, third instance.

Two smaller structural notes from the same file:
- `/api/projects` is mounted **three times** — `projectRoutes` (`:261`), `holdRoutes` (`:322`),
  `storageRoutes` (`:326`). Behaviour depends on Express registration order; there is no shared prefix
  ownership.
- `cleanupPort()` (`index.ts:51-77`) `kill -9`s whatever holds port 5101 at import time. That is the
  process doing the exact same job — a second FliHub, or a stale one mid-write to a state file. The
  app's startup path is destructive to its own concurrency.

Related hygiene, verified rather than assumed: `shared/` contains **committed build artifacts** —
`types.js`, `types.d.ts`, `naming.js`, `naming.d.ts`, `paths.js`, `paths.d.ts`, `constants.js`,
`constants.d.ts`, all tracked by git, none gitignored. `types.d.ts` is 2 months stale (git 2026-02-26 vs
`types.ts` 2026-04-14) and is missing `holdingPath`, `publishedPath`, `diskThresholds`, `machineRole`,
`whisperBinary`, `StorageTreeNode`. **They are not being used**: `cd server && npx tsc --noEmit` exits 0
while `index.ts:198` reads `config.holdingPath`, which would fail if the stale `.d.ts` were resolved;
dev runs `tsx src/index.ts` and prod runs `node dist/index.js` against a freshly compiled
`dist/shared/`. So this is confusing dead weight, not a live bug — but it is exactly the kind of thing
that becomes a live bug the first time a tool resolves differently.
(Separately: `server/nodemon.json` watches only `["src"]`, so edits to `shared/*.ts` do not restart
the dev server.)

**Rebuild implication:** config should be immutable, loaded once, and *replaced* rather than mutated —
`applyConfig(next)` returning a new object and driving watcher reconciliation as the only path.
One writeback function, no callbacks that bypass it. Gitignore build output.

---

## What this audit did NOT establish

- **No runtime execution.** Every finding is from reading source at `3b3b2f1` plus one `tsc --noEmit`
  and one `config.json` key dump. I did not start the server, trigger a rename, force a partial failure,
  or observe a watcher miss. Where I say a failure mode *exists*, I mean the code path permits it; where
  I say it *has happened*, I say so explicitly (I never do).
- **No concurrency measurement.** I found no locking anywhere (0 lockfile/mutex/semaphore hits in
  `server/src`), and all three stores use read-modify-write. But I did not construct a race, and
  single-user local-first usage may make many of these theoretical in practice.
- **The client side is out of scope**, so I cannot say how much of the drift is compensated by client
  refetch behaviour. `client/src` does contain its own path knowledge (`WatchPage.tsx:147-150`,
  `TranscriptSyncModal.tsx:36`, `ProjectsPanel.tsx:239`), which suggests the leak crosses the wire.
- **Test coverage was not assessed.** There are 24 test files in `server/src/test/`, and several
  (`renameRecording.test.ts` 660 lines, `holdUtils.test.ts` 753, `relay.test.ts` 2219) are substantial.
  A passing suite does **not** contradict any finding here — none of these are logic bugs in a single
  function; they are all seams *between* functions, which unit tests structurally cannot see.
- **Counts are grep-based.** They exclude `**/test/**` and `**/__tests__/**` and are stated as
  measurements of *call sites matching a pattern*, not of semantic occurrences. A site that constructs a
  path via a variable I didn't match would be undercounted — so the path-fragmentation numbers are
  **floors, not ceilings**.

---

## Ranked summary for the rebuild

| # | Finding | Severity | The one thing to do differently |
|---|---|---|---|
| 1 | Persistence writes a hand-maintained field allow-list (3 instances) | Critical | Schema-validated whole-object serialisation, versioned |
| 2 | Multi-file mutations are non-transactional; rename's guard runs after the derivatives moved | Critical | Stable recording ids so rename is one metadata write — or a `FileTransaction` primitive from day one |
| 3 | Four project-identity resolvers; 86 mutating routes bound to an ambient active project | Critical | `ProjectId` explicit on every endpoint; delete server-side "active project" |
| 4 | "Safe" exists as both a folder and a flag; FR-111 never completed | High | One representation; make the dead one unconstructible; versioned one-way migration |
| 5 | 9 watchers emitting bare payload-free pings; state file unwatched; in-memory views can drift and are served to new clients | High | Typed change events with payloads; watch state; caches rebuilt from disk on connect |
| 6 | 5 competing models of project structure; relay subfolder set declared 6×; 80/115 dir reads bypass the safe-read module; 2 contradictory copy verifiers | High | One declarative structure manifest all consumers derive from |
| 7 | 944-line integrity scanner never wired to run, model already drifted | Med-High | Validate at the write boundary; scanner becomes a CI test + `npm run doctor` |
| 8 | Mutated config singleton, 3 writeback paths (2 skip watcher reconciliation), `/api/projects` mounted 3× | Medium | Immutable config, single `applyConfig` reconciliation path |
