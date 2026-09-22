---
generated: 2026-09-22
generator: system-context
audience: agent
status: snapshot
---

# FliHub — Agent Notes

Only what the code can't tell you. Everything here failed the derivation test on purpose. Dev-server,
Overmind, live-instrument and refusal rules are in `CLAUDE.md`; they are not repeated here.

## Schema sources — read these; there is no mirror

`/dev-team:schema-mirror` has no TypeScript extractor, so there is no `docs/schema-mirror.*`.
Open the declaring file:

- `shared/types.ts` is the TS contract for server and client: `Config` :190, `ProjectStage` :438,
  `DEFAULT_PROJECT_STAGES` :455, `ProjectStats` :496, socket events :660/:705, `ProjectState` :1181.
- `shared/contextSchemas.ts` holds the zod schemas for the open contract (`HubContext`,
  `REFUSAL_CODES`, `OpenContextState`). These are the only zod request/response schemas in the repo.
- `shared/naming.ts` → `NAMING_RULES` :16 is the filename and project-name grammar.
- `server/src/config/env.ts` is the zod schema for environment variables.
- `brands.json`, `~/.fli/machine.json` and `fli.studio.json` are shaped by `@flivideo/core`
  (`../fli-core/src`, pinned `#v0.2.3`) and `../flistudio/docs/open-contract.md`. FliHub reads
  them and writes none of them. Cite them there; don't restate them.
- **Do not read `shared/*.js` or `shared/*.d.ts`.** They are tracked but stale build output from
  Feb and Sep 2026. `types.js` still lists `review` and lacks `shelved`/`remix`. tsx resolves
  `../shared/types.js` imports to the `.ts` source, so the running server is fine. **Vitest does
  not**: it loads the stale `.js` (probed 2026-09-22), so tests of shared code can run old code.
  `paths.js` is deleted; `types`, `naming` and `constants` still shadow their `.ts` in tests.
- **Two project layouts (2026-09-22).** `hub` (`hub/recordings/`, `hub/transcripts/`) and legacy
  (`recordings/`, `recording-transcripts/`) are read forever and never migrated. Always get these
  folders from `getProjectPaths(projectDir)` (`shared/paths.ts`); never join `'recordings'` yourself.
  New projects are still created legacy until rebuild step 4.
- `shared/apiRegistry.ts` (the API Explorer) lists 34 endpoints; the routers define about 170. To
  find a route, grep `router\.(get|post|put|patch|delete)` in `server/src/routes/`, not the registry.

## Tooling

- Use npm workspaces (`npm test -w server`). `pnpm-lock.yaml` is stale; CI and scripts use npm.
- CI is red on every push: `npm ci` can't fetch the private `github:flivideo/fli-core` over SSH.
  A red CI badge says nothing about your change. Run `npm test` locally; it is the only gate.
- Compare server test counts or coverage only with `--exclude 'dist/**'`. A stale `server/dist/`
  doubles the count (about 1,356 vs 696). The coverage thresholds never fire (NFR-172). Don't fix
  that inside a feature change.
- The lint baseline has 20 known errors (NFR-172). The bar is "no new lint problems", not a clean
  lint.

## Pitfalls

- **A new `Config` field needs three edits** or it disappears on the next save: the destructure in
  `POST /api/config` (`server/src/routes/index.ts`), the copy list in `updateConfig`
  (`server/src/index.ts`), and `toSave` in `saveConfig` (`server/src/config/configManager.ts`).
  `whisperBinary`, `whisperModel`, `whisperLanguage` and `diskThresholds` are already dropped this
  way. A new `ProjectState` field needs the same treatment in `writeProjectState()`.
- **Mount order decides route ownership.** `projects.ts`, `hold.ts` and `storage.ts` all mount on
  `/api/projects`, and `routes/index.ts` plus `state.ts` mount on `/api`. A duplicate path is
  answered silently by the first router mounted. `POST /:code/hold` in `storage.ts` is already dead
  code this way. Per-router tests can't see this; test through `server/src/index.ts`'s mount order.
- **Two `:code` resolvers.** Legacy routes use `projectResolver.ts` (prefix match, first
  alphabetical, never ambiguous). `/api/context` uses fli-core (whole code, 409 when ambiguous).
  Don't assume a short code means the same thing on both.
- **`machineRole` is `recorder` | `editor`, and nothing reads it any more.** Its only consumers
  (RelayTool, SyncTool) were removed on 2026-09-22. It is still saved and shown in Config.
- **Probing the API can move real data.** `hold`, `archive`, `batch-offload` and `DELETE /:code/local`
  all act on `/Users/davidcruwys/dev/video-projects/`
  and the T7. Probe route behaviour in-process instead: mount the routers on a throwaway Express app
  with a fake config and use supertest.
- **Promotion always writes `.mov`** (`buildRecordingFilename`), even though the watcher accepts
  `.mp4`. Don't "fix" extensions in a downstream tool.
- **Chapters are derived three ways** (client `NN-` grouping, final-SRT query, POEM WUI filenames).
  Grep all three before changing anything called "chapter".
- **Transcript `.json` is segment-level**, despite the comment at `transcriptions.ts` that says
  "word-level". No `words` key was found when measured (kdd 2026-09-04).

## Decisions worth knowing

- **A refused open-contract launch keeps the previous project** (W3 F3a). Callers check `refused`
  before `context`. Don't "fix" this by clearing `activeProject`.
- **FliHub accepts plain folders as projects** (`membership: "folder"`) and never emits
  `not-a-project` or `video-not-found`. Adoption is FliStudio's job. Use only the shared
  `REFUSAL_CODES`; never add an app-local code (Swagger decision 4).
- **Stage auto-detect stops at `recording` on purpose.** Later stages are human overrides in global
  config. Don't infer stages from `final/` or edit folders.
- **Relay, the FR-126 manifest (`setEditManifest` has no callers) and shadows are one deprecation
  cluster** (Jan-era). Shadows and relay are gone, and so is git sync (2026-09-22). Don't extend the
  FR-126 manifest without David's ruling.

## Scope limits

- Does NOT write `fli.studio.json`, `brands.json` or any `fli.<app>…json` decision file.
- Does NOT generate chapter videos (410) or shadows (removed 2026-09-04).
- Does NOT rename or move projects. Identity is the folder name.

## Before you design a fix

Read `docs/rebuild-2026/requirements-archaeology-2026-09.md` first. It lists the known defects with
file:line references and the queue of recommendations still waiting on David. Don't action anything
in that queue unasked.

---

Deep comprehension narrative for humans: [SYSTEM.md](./SYSTEM.md) — not loaded into agent context.
