---
generated: 2026-09-27
generator: system-context
audience: agent
status: snapshot
commit: 442a78f
---

# FliHub — Agent Notes

Only what the code can't tell you. Everything here failed the derivation test on purpose. Dev-server,
Overmind, live-instrument and refusal rules are in `CLAUDE.md`; they are not repeated here.

## Schemas — use the mirror

- [`docs/schema-mirror.md`](schema-mirror.md) (+ `.json`) is generated from the code. It covers every
  type, zod schema and closed set, each with a `file:line`. Cite it and don't retype shapes.
  After a schema change, run the verify step. Exit 1 means regenerate. (Commands are in
  `docs/agent-comprehension-docs.md` in the flivideo suite repo, github.com/flivideo/flivideo.)
- The mirror records its root as `..` relative to the JSON, so verify works from any checkout. Never hand-edit
  the JSON or the `.md`; regenerate.
- The mirror has one gap: `ContextBodySchema` is built with `.partial()`, so it isn't expanded.
- `brands.json`, `~/.fli/machine.json`, `fli.studio.json`, the layout rule, video naming and
  `TRASH_FOLDER` are owned by `@flivideo/core` (github.com/flivideo/fli-core). FliHub reads them and writes none of
  them. Cite fli-core; don't restate it.

## Tooling

- Use npm workspaces. `pnpm-lock.yaml` is stale.
- `npm test -w server` starts vitest in watch mode and exits 1. For a one-shot run use
  `npx vitest run --exclude 'dist/**'` in `server/`. The exclude matters: a stale `server/dist/`
  doubles the count.
- CI is red on every push. `npm ci` fetches `flivideo/fli-core` over git+ssh (the lockfile form of
  the `github:` dependency), and CI has no SSH key. The repo is public, so privacy isn't the cause. A red CI badge says nothing about your change; local tests are the only gate.
- After bumping the fli-core pin, run
  `npm install @flivideo/core@github:flivideo/fli-core#vX -w server -w shared`, then check that
  `package-lock.json` resolves to the tag's commit. A plain `npm install` kept the old lock entry
  (observed twice, 2026-09-22).
- **Never commit tsc output next to a `.ts` source.** Vite loads `vite.config.js` before the `.ts`, and
  vitest loads `shared/*.js` before the `.ts`. Both did, and both bit us (Vite stayed on 0.0.0.0). They
  were removed on 2026-09-23 and are now gitignored; `client/tsconfig.node.json` emits to `node_modules/.tmp`.
- The lint baseline has known errors (NFR-172). The bar is "no new lint problems", not a clean lint.
- **Don't edit the main checkout while David's FliHub is running.** nodemon recycles the server on any
  `server/src` change, and Vite HMR pushes client edits into his open tab. Work in a git worktree,
  push with `git push origin HEAD:main`, and tell him the pull-and-restart line. It is
  `git pull && npm install && overmind restart server`; drop `npm install` when no dependency changed.

## Pitfalls

- **Never join `'recordings'` or `'recording-transcripts'` yourself.** Use
  `getProjectPaths(projectDir)`, which delegates to fli-core's `projectLayoutSync`. To go from a
  recording back to its project, use `projectDirFromRecordingPath`; `indexOf('recordings')` returns
  `<project>/hub`. A missed site fails silently: the project just looks empty.
- **A new `Config` field needs three edits** or it disappears on the next save:
  - the `POST /api/config` destructure in `server/src/routes/index.ts`;
  - the `updateConfig` copy list in `server/src/index.ts`;
  - `toSave` in `saveConfig` in `server/src/config/configManager.ts`.

  `whisperBinary`, `whisperModel`, `whisperLanguage` and `diskThresholds` are already dropped this
  way. A new `ProjectState` field needs the same treatment in `writeProjectState()`. A new
  `RecordingState` field also has to be added to `isEmptyRecordingState` in `projectState.ts`, the one
  "is this entry empty?" list every setter uses. Otherwise un-parking a take deletes the whole entry,
  new field included. `aspectWarning` hit this on 2026-09-23.
- **Change a segment number only through `POST /api/segments/op`** (`utils/segmentOps.ts`, CT-0107).
  It refuses while a FliCut cut or the FliStudio cut draft names the take: they point at takes by
  path, so a renumber makes them play the wrong take. It also journals each change for undo in
  `.flihub-segment-journal.json`. The older paths (`/api/rename` Seq, `manage.ts` renumber) have
  neither guard nor journal.
- **Mount order decides which router owns a route.** `projects.ts`, `hold.ts` and `storage.ts` all
  mount on `/api/projects`. A duplicate path is silently answered by the first router mounted:
  `POST /:code/hold` in `storage.ts` is dead code. Per-router tests can't see this, so test through
  `server/src/index.ts`'s mount order.
- **Two `:code` resolvers.** Legacy routes use `projectResolver.ts`: prefix match, first
  alphabetical, never ambiguous. `/api/context` uses fli-core: whole code only, 409 when ambiguous.
- **Probing the API can move real data.** `hold`, `archive`, `batch-offload`, `DELETE /:code/local`
  and `DELETE /:code/trash` all act on `/Users/davidcruwys/dev/video-projects/` and the T7. Probe
  in-process instead: mount the routers on a throwaway Express app with a temp-dir config, and use
  supertest.
- **`machineRole` is read by nothing.** Its only consumers, RelayTool and SyncTool, were removed on
  2026-09-22. It is still saved and shown in Config.
- **Promotion always writes `.mov`** (`buildRecordingFilename`), even though the watcher accepts
  `.mp4`. Don't "fix" extensions in a downstream tool.
- **Chapters are derived three ways**: client `NN-` grouping, the final-SRT query, and POEM WUI
  filenames. Grep all three before changing anything called "chapter".
- **Two transcript `.json` shapes coexist.** Old FliHub whisper output is segment-level with no
  `words`. FliTools writes `flitools.transcript/<n>` (words + `health`). Check `schema` before reading.
- **`<transcripts>/engines/` holds FliTools' per-engine copies** (`<base>.<engine>.<ext>`). FliHub reads
  only the plain `<base>.*` files, but anything that moves a take must carry them
  (`engineCopiesFor` in `utils/transcriptFiles.ts`), or they stay behind under a freed name.

## Decisions worth knowing

- **Existing projects keep their layout; FliHub never migrates one.** FliStudio's
  `project.migrate-layout` does, on David's word only, and it refuses while FliHub has the project
  open. New projects are hub: `POST /api/projects` creates only the folder.
- **A refused open-contract launch keeps the previous project** (W3 F3a). Callers check `refused`
  before `context`. Don't "fix" this by clearing `activeProject`.
- **FliHub accepts plain folders as projects** (`membership: "folder"`) and never emits
  `not-a-project` or `video-not-found`. Adoption is FliStudio's job. Use only the shared
  `REFUSAL_CODES`, never an app-local code (Swagger decision 4).
- **Stage auto-detection stops at `recording` on purpose.** Later stages are human overrides in the
  global config. Don't infer stages from `final/` or edit folders.
- **Trash must stay visible and emptiable** (David, 2026-09-23). The header pill shows a count even
  at 0, and "?" when the folder can't be read, never a silent 0. What it counts must equal what
  empty removes.
- **The API is loopback-only** (`server/src/utils/loopback.ts`): 127.0.0.1 + ::1, and a 403 for any
  non-loopback browser Origin. There's no token. Don't reopen it to Tailscale: nothing remote uses it.
  Vite (5100) binds 127.0.0.1 too.
- **Cut, don't hide.** Relay, git sync and shadows are gone. B-roll (FR-161) and the FR-126 manifest
  are deprecated but still in the code. Don't extend either without David's ruling, and don't touch
  `recording-shadows/` handling until he rules.

## Scope limits

- Does NOT write `fli.studio.json`, `brands.json` or any `fli.<app>…json` decision file.
- Does NOT sync machines, generate chapter videos (410) or generate shadows.
- Does NOT rename or move projects. A project's identity is its folder name.
- Does NOT transcribe. FliTools (:7161) is the only transcriber (B584, David 2026-09-27). FliHub queues,
  calls it (`utils/flitoolsClient.ts`), and shows `health.suspect`. `whisper*` config and
  `glingDictionary` no longer reach any engine; words come from the suite word store in FliTools.

## Before you design a fix

Read `docs/rebuild-2026/requirements-archaeology-2026-09.md` first. It lists the known defects with
file:line references, and the queue of recommendations still waiting on David. Don't action
anything in that queue unasked.

---

Deep comprehension narrative for humans: [SYSTEM.md](./SYSTEM.md) — not loaded into agent context.
