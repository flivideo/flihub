# Server domain, persistence & filesystem model — adversarial verification

**Role:** skeptic. Every claim below was re-read at source; every count re-run.
**Date:** 2026-08-26 · **Repo:** `/Users/davidcruwys/dev/ad/flivideo/flihub` @ `3b3b2f1`
**Result:** 8 of 8 findings survive. 2 downgraded, 1 upgraded, 4 sub-claims refuted, 1 new live defect found.

---

## What I refuted

| # | Sub-claim refuted | Why |
|---|---|---|
| 1 | "`writeProjectState` constructs the same lossy shape" | `ProjectState` has exactly 4 fields (`shared/types.ts:1191-1196`) and `writeProjectState` enumerates all 4 (`projectState.ts:82-91`). It is **not currently lossy** — same fragile pattern, zero live loss. |
| 4 | "the boot migration can never finish… live code paths can recreate `-safe`" | I grepped every `-safe` literal across `server/src`, `client/src`, `shared` (non-test). **Zero write sites.** All 11 live sites read, enumerate, or delete. The migration is idempotent and converges. |
| 4 | "a failed per-file move leaves a file in `recordings/` with no `safe:true` flag → reappears in active view" | Wrong direction. The in-loop catch (`safeMigration.ts:113-115`) fires *after* `fs.move` failed, so the file is still in `-safe` — it vanishes from the UI entirely, it does not reappear. The claim IS correct for the **outer-catch rollback-failure** path (`:157-163`) only. |
| 8 | "nothing prevents a shortcut-path route from changing `activeProject`" | Hypothetical, not live. `projects.ts` calls `saveConfig` only at `:179` (priority) and `:234` (stage override); `chapters.ts:80` sets `chapterRecordings`. None touch `activeProject`/`projectDirectory` today. |

## Counts the auditor got wrong (all in the same direction — mild overstatement)

| Claim | Auditor | Re-measured |
|---|---|---|
| `config.projectDirectory` non-test sites | 89 | **83** |
| Mutating routes under `server/src/routes` | 86 | **84** |
| Directory reads bypassing `readDirSafe` | 80 of 115 | **80 raw vs 34 safe** = 80 of 114 (70%) — confirmed |
| `paths.safe` / `-safe` live sites | 12 | **11** (and 3 of them are `recording-shadows/-safe`, a *different* folder) |

None of these changes a verdict.

---

## Finding 1 — Persistence is a hand-maintained field allow-list — **UPHELD, critical/certain**

Verified at `server/src/config/configManager.ts:121-169`. `toSave` is built literal-by-literal, 18 keys. `shared/types.ts:190-220` declares 25. Live `server/config.json` has exactly the 16 keys reachable today.

**Silently dropped: `fileExtensions`, `chapterRecordings`, `diskThresholds`, `whisperBinary`, `whisperModel`, `whisperLanguage`.** (`projectDirectory` is dropped deliberately — FR-89 migration.)

Three confirmed consequences:
- `server/src/routes/chapters.ts:79-85` — `config.chapterRecordings = …; saveConfig(config); res.json({success:true})`. Never written. **The API lies.**
- `server/src/routes/transcriptions.ts:125-127` — `whisperBinary` / `whisperModel` / `whisperLanguage` are *read and used to spawn the process*. A hand-edited value works until any unrelated save erases it.
- `server/src/config/configManager.ts:107-108` injects `DEFAULT_DISK_THRESHOLDS` on load; the client reads `config.diskThresholds` at `client/src/components/ProjectsPanel.tsx:893`. A user-tuned threshold cannot survive a restart.

Durability also disagrees: `writeProjectState` does tmp+rename (`projectState.ts:93-95`); `saveConfig` does bare `fs.writeJsonSync` and swallows the error into `console.error` returning `void` (`configManager.ts:167-169`).

**Rebuild:** one schema (zod/valibot), `parse(input)` → `write(JSON.stringify(parsed))`. Never enumerate fields at the write boundary. Atomic write for both stores.

---

## Finding 2 — Rename's conflict guard runs after the derivatives have moved — **UPHELD, critical/certain**

`renameRecording` (`renameRecording.ts:299-338`):
```
Phase 1: await renameDerivableFiles(...)   // :82-116 — shadow .mp4 + 5 transcript exts + may delete chapter video
Phase 2: await renameCoreFiles(...)        // :232-247 — the pathExists guard lives HERE
```
`renameCoreFiles:243-245`: `if (await fs.pathExists(newPath)) throw new Error('Target file already exists')`.

When that throws, the `.mov` still carries the old basename while the shadow and all five transcripts already carry the new one. The outer catch (`:333-338`) returns `{success:false, error}` — a **clean-looking failure over permanent corruption**. No rollback, no compensating action.

The derivative join is purely by basename (`scanning.ts:52-79` matches `.mov` basenames against `.txt` basenames), so a rename is inherently an 8-object multi-file transaction written as two sequential awaits.

Batch is worse: `routes/index.ts:1055-1077` pre-checks all conflicts, then loops one-at-a-time with no undo on mid-loop failure.

**The team already knows how to do this correctly elsewhere.** `routes/storage.ts:275-303` implements a genuine two-pass copy → `verifyDirsMatch` → *then* delete, with explicit `"Local NOT deleted. Partial copies in HOLDING may need manual cleanup for: …"` messaging. Rename never got that treatment. `storageActivityLog.ts:14-16` states outright: *"the log is a breadcrumb, not a transaction."*

**Rebuild:** all preconditions before any mutation; then either a real journal, or make the derivative link not be the filename (stable recording id + derivative index).

---

## Finding 3 — Four incompatible answers to "which project is this?" — **UPHELD, high/certain** *(auditor said critical)*

Four resolution strategies confirmed:
1. `utils/projectResolver.ts:15-77` — filters dotfiles / `-` prefix / `archived`, exact-match first, prefix matches sorted. Used at **11 sites, all in `routes/query/*` (read-only) plus `projects.ts:153`**. Zero destructive callers.
2. `routes/state.ts:120` and `:189` — inlined twice: `entries.find(e => e.isDirectory() && e.name.startsWith(code))`. No filtering, no exact-match-first, no sort. This is the module that writes the **durable state file**.
3. `routes/hold.ts:24-27` — `path.join(projectsRoot, code)`, no validation at all. These are the destructive verbs.
4. Ambient `config.projectDirectory` — **83 non-test references across 17 modules** owning 84 mutating routes.

The sharpest consequence is confirmed exactly as claimed: `routes/manage.ts:45` declares `let lastBatchMapping: Array<{oldFilename, newFilename}>` with **no project identity**, and the undo handler at `:1465` re-reads `getConfig()` → `config.projectDirectory` **at undo time**. Bulk-rename in A → switch to B → undo renames B's files.

*Severity corrected to high:* the `pathExists` guard in `renameCoreFiles` prevents silent overwrite, so the damage is misnaming rather than destruction — bad but recoverable. I could not observe an actual cross-project undo; this is a code-path reading, and the collision requires convention-generated names to coincide (which is the expected case, not the exotic one).

**Rebuild:** `ProjectRef` as a validated branded type, resolved once at the route boundary, threaded explicitly. No ambient "current project" on the server. Any undo/journal record carries the ref.

---

## Finding 4 — "Safe" has two representations — **UPHELD but DOWNGRADED to medium/certain** *(auditor said high)*

Confirmed: `RecordingState.safe` (`shared/types.ts:1184`) and `paths.safe` (`shared/paths.ts:40`) both live. Four modules carry comments declaring the folder dead (`scanning.ts:103`, `WatcherManager.ts:146`, `renameRecording.ts:134`, `shadowFiles.ts:221`) while 11 non-test sites still consult it:

`poemWuiUtils.ts:106` · `transcriptions.ts:644,729` · `routes/index.ts:1046,1060` · `query/export.ts:200` · `query/chapters.ts:43` · `system.ts:297` · `safeMigration.ts` (×9, legitimately) — plus `manage.ts:1040,1053` and `video.ts:92` for the sibling `recording-shadows/-safe`.

**Why downgraded:** the migration DOES converge (see refutations). The residue is read-side only.

**But one real bug falls out of it:** `routes/index.ts:1046` enumerates `paths.safe` for bulk relabel and `:1060` conflict-checks a target inside `paths.safe` — then hands the filename to `renameRecording`, whose `renameCoreFiles:239-240` joins `paths.recordings/oldFilename`. A `-safe`-resident file would ENOENT. Dead-concept residue producing a live inconsistency.

`scripts/scanProjects.ts:74` still carries `safeFolderDeprecated: false, // Decision 7: needs investigation`.

**Rebuild:** when a concept migrates representation, delete the old constructor in the same commit. `paths.safe` should not be constructible.

---

## Finding 5 — Nine watchers emitting payload-free pings; the state file is unwatched — **UPHELD, high/certain**

Verified line by line:
- `WatcherManager.ts:62` — `this.io.emit(config.event)`, **no payload**, for all 8 generic watchers (`zip`, `incoming-images`, `assigned-images`, `recordings`, `projects`, `inbox`, `transcripts`, `thumbs`). Only the 9th (relay, `:262`) emits a typed payload. Meanwhile the *other* watcher system, `watcher.ts:44-52`, builds a full `FileInfo` and emits it.
- `WatcherManager.ts:50` — `depth: config.depth ?? 0`. The recordings watcher (`:148-158`) covers `[paths.recordings, <project>/recording-shadows]` at depth 0 → **`recordings/-chapters/` is not watched**.
- **`.flihub-state.json` is invisible to the realtime layer.** The only watcher near the project root is `projects` (`:165-176`), which watches `dirname(projectDir)` at depth 1, with `ignored: /(^|[/\\])\../` (dotfiles) and `watchEvents: ['addDir','unlinkDir']` only. A relay/rsync pull that updates another machine's state file produces **no invalidation**.
- No watcher exists for `final/`, `s3-staging/`, `-trash/`, `assets/prompts/`.
- `'recordings:changed'` is emitted from **10** server sites, including `state.ts:144` and `:205` for state writes — i.e. the server tells clients "refetch everything" as its only change vocabulary.
- **`file:renamed` and `file:error` are declared in `ServerToClientEvents` (`shared/types.ts:694-695`) and subscribed by the client (`client/src/hooks/useSocket.ts:59,70`) but emitted from ZERO server sites.** A dead contract with a live listener.
- `index.ts:335-338` replays the in-memory `pendingFiles` Map to every newly connected client as truth.
- `routes/transcriptions.ts:19-22` — `queue`, `activeJob`, `recentJobs`, `activeProcess` as module-level `let`, no persistence, against a nodemon that restarts on every `.ts` edit.

**Rebuild:** one change model. Events carry `{projectRef, entity, id, op}` so the client reconciles instead of refetching. Watch the durable state file. Delete or emit the declared events — never both.

---

## Finding 6 — Five competing models of project structure; the canonical constant is imported by nobody — **UPHELD, high/certain (understated by the auditor)**

Confirmed, and worse than described. **`RELAY_SUBFOLDERS` is exported at `routes/relay.ts:12` and imported by ZERO other modules.** The literal `['recordings','edit-1st','edit-2nd']` is retyped at:
`WatcherManager.ts:259` · `storageTree.ts:246` · `projects.ts:692` · `storage.ts:88` — plus near-variants at `edit.ts:50,109,133` (adds `edit-final`), `video.ts:60-61`, `system.ts:310`, `manage.ts:1085` (`DELETABLE_SUBFOLDERS`), `diskUtils.ts:129-131`, `holdUtils.ts:275`, `renameRecording.ts:208`, `client/ProjectsPanel.tsx:73`.

`edit-final` is already a live key in `EditManifest` (`projectState.ts:269,280`) and is present in the `edit.ts` lists but **absent** from `RELAY_SUBFOLDERS` and all four retypes. Adding it is a grep exercise.

Five competing partitions confirmed:
| Site | Set | Self-description |
|---|---|---|
| `shared/paths.ts:36-57` | 15 paths, incl. dead `safe`, **omits `recording-shadows`** | (implicit canon) |
| `storageTree.ts:23` | `['recordings','recording-shadows','final']` | *"Single source of truth for Heavy subfolders"* |
| `scanning.ts:105` | `['recordings','recording-transcripts','assets/images','assets/thumbs']` | — |
| `diskUtils.ts:135` | exclude `['recordings','-trash','recording-shadows']` | — |
| `scripts/scanProjects.ts:593` | a fifth, still including `recordings/-safe` | — |

Error handling fragments identically: `utils/filesystem.ts:20-31` was written *specifically* to standardise ENOENT-vs-real-error, and **80 raw `fs.readdir`/`readdirSync` calls vs 34 `readDirSafe` calls (non-test)** — 70% bypass. Same missing-directory condition returns empty, throws a 500, or is swallowed depending on the file.

**`holdUtils.ts` contradicts itself in one file, and both branches gate destructive deletes:**
- `:194-196` — *"Match on file count only — byte totals differ across filesystems due to .DS_Store churn, resource fork handling, and extended attributes."*
- `:227-232` — *"compares bytes strictly — cross-filesystem byte drift on the same source tree indicates a partial/corrupt copy, which is what we want to catch before deleting the original."*

`verifyHoldingMatch` feeds 8 call sites in `hold.ts`; `verifyDirsMatch` feeds 4 in `storage.ts`. Both precede `fs.rm`.

**Rebuild:** one project-layout table with roles (`heavy`/`light`/`derived`/`relay`/`transient`); every feature derives its set from it. One filesystem access module, enforced by lint.

---

## Finding 7 — The 944-line integrity scanner has never been wired to run — **UPHELD but DOWNGRADED to medium/certain** *(auditor said high)*

All facts confirmed:
- `server/src/scripts/scanProjects.ts` — 944 lines (`wc -l`).
- Root `package.json` scripts: `dev, build, lint, lint:fix, format, format:check, test, test:client, test:server, test:ui, test:coverage`. `server/package.json`: `dev, build, start, test, test:ui, test:coverage`. **No scanner entry in either.**
- `grep -rn scanProjects server/src client/src package.json server/package.json` returns **nothing outside the file itself**. Zero imports.
- `:63-64` — `const PROJECTS_ROOT = process.env.PROJECTS_ROOT || path.join(process.env.HOME!, 'dev/video-projects/v-appydave')`. Never reads `config.json`. **It can audit a different project root than the running app.**
- `:591-605` still checks `recordings/-safe`; `:74` `safeFolderDeprecated: false, // Decision 7: needs investigation`; `:66-67` `// TODO: Update these after PO makes decisions`.
- `git log -1 --format='%h %ad' -- server/src/scripts/scanProjects.ts` → `14ff7c5 2026-02-13` — an ESLint cleanup. Six months untouched.

**Why downgraded:** this is a dead analysis tool, not a load-bearing runtime path. Nothing depends on it, so nothing breaks. The *architectural* point stands and is rebuild-relevant: the invariants of the filesystem-as-database were written into a detached after-the-fact auditor instead of enforced at the write boundary — so the system has neither write-time validation nor a running checker.

**Rebuild:** invariants go in the write path as an assertion, and in CI as a test. If a checker is worth 944 lines, it is worth an npm script and a fixture.

---

## Finding 8 — Config is a mutated singleton with three writeback paths — **UPHELD and UPGRADED to high/certain** *(auditor said medium/probable)*

Structure confirmed:
- `index.ts:111` — `const currentConfig: Config = loadConfigFromFile()`, mutated in place for process lifetime.
- `index.ts:154-213` — `updateConfig` is a **third** field allow-list (14 `if (newConfig.X !== undefined)` lines), persists **and** calls `watcherManager.updateFromConfig(oldConfig, currentConfig)` at `:210`.
- `index.ts:255-259` (projects) and `:268-273` (chapters) — a *different* callback `(config) => { Object.assign(currentConfig, config); saveConfigToFile(currentConfig); }` with **no watcher reconciliation**. No type or runtime guard separates the two paths.
- `index.ts:309` — `createDeveloperRoutes(currentConfig)` gets the raw mutable object, not the `() => currentConfig` getter the other 16 routers get.
- `index.ts:51-77` — `cleanupPort()` runs `lsof -ti:5101` then `kill -9` on every PID at module import, before anything else. That is exactly a second or stale FliHub, possibly mid-write to a state file. Confirmed.
- `shared/` ships 8 committed build artifacts (`types.js/.d.ts`, `naming.js/.d.ts`, `paths.js/.d.ts`, `constants.js/.d.ts`); `types.d.ts` last committed 2026-02-26 vs `types.ts` 2026-04-14 — **7 weeks stale**. Dead weight, not a live bug (TS resolves the `.ts` sources).

### NEW — the prefix-collision is not hypothetical, it is shadowing a live route today

`/api/projects` is mounted **three times**: `index.ts:261` (projects), `:321` (hold), `:325` (storage). I enumerated every path in all three routers:

**`POST /:code/hold` is defined in BOTH `hold.ts:93` and `storage.ts:185`.**

`hold.ts` is mounted first and contains **zero `next()` calls** — its handler always terminates the request. Therefore `storage.ts:185`, the newer storage-panel implementation (the one with the two-pass copy→verify→delete at `:275-303`), is **unreachable dead code**.

And the client is calling it: `client/src/hooks/useStorageApi.ts:77` — `export const useHoldProject = buildMutation('hold', 'Held heavy files to T7')` — POSTs `/api/projects/${code}/hold` with **no body**, expecting `StorageMutationResponse`. It is served by `hold.ts`'s B064 handler, which reads `const { dryRun } = req.body` and returns `HoldOperationResult` — a different shape, different semantics, different verification rationale (file-count-only vs bytes-strict, see Finding 6).

*I confirmed the route definitions, the mount order, the absence of `next()`, and the client caller. I did NOT execute the request — the runtime behaviour is inferred from Express's documented first-match-wins routing, not observed.*

**Rebuild:** one router owns one prefix. Config is immutable — `applyConfig(next)` returns a new object and drives reconciliation as its only effect. Never `kill -9` a peer on startup; fail loudly on a busy port.
