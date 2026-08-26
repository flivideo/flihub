# Architectural audit — Server HTTP surface and route layer

**Scope**: `server/src/index.ts`, `server/src/routes/**` (21 flat files + a 7-file `routes/query/` tree),
`server/src/middleware/errorHandler.ts`, `server/src/utils/responses.ts`, `server/src/config/**`.
**Audited at**: commit `3b3b2f1` (working tree, 2026-08-26).
**Framing**: rebuild input. Bugs are only reported where the bug is a *symptom of a structural choice*.

---

## 0. The measurements

Everything below is derived from scripted counts over the real files, not from reading impressions.

| Measurement | Value |
|---|---|
| Route registrations (`router.<verb>(`) across `routes/**` | **156** |
| Distinct URL paths after applying mounts from `index.ts` | **149** |
| Route files | 21 flat + 7 under `query/` |
| Handlers that call `fs.*` directly inside the handler body | **105 / 156 (67%)** |
| Total `fs.*` call sites inside `routes/**` | **296** |
| Handlers scoped by an implicit global "active project" (`config.projectDirectory` / `activeProject`) | **50** |
| Handlers scoped by an explicit `:code` path param | **40** |
| Handlers doing both | **1** (`DELETE /:code`, `routes/projects.ts:642`) |
| Routes whose last path segment is an action verb (RPC-shaped) | **69 / 156 (44%)** |
| HTTP method distribution | GET 72, POST 64, DELETE 16, PUT 3, PATCH 1 |
| Distinct `…/config` endpoints | **7** across 4 routers |
| Distinct `…status…` endpoints | **9** across 6 routers |
| Imports of `server/src/utils/responses.ts` | **0** |
| Uses of `AppError` outside its own definition | **0** |
| `next(err)` calls in `routes/**` | **0** |
| Handlers with their own `try { } catch { }` | **131 / 156** |
| `res.json({ success: false … })` with **no** `res.status(...)` (HTTP 200 errors) | **30** |
| Handlers whose success body has no `success:` envelope at all | **47** |
| `:code`-taking handlers with **no** traversal/resolve guard | **13 / 41** |
| Paths declared in `shared/apiRegistry.ts` (the API Explorer's contract) | **32 of 149** |
| `io.emit` sites in `routes/**` | 31, in only 5 of 28 route files |

Scripts used are throwaway and were run from the repo root; each finding below names the exact
files and lines so any count can be re-derived by hand.

---

## 1. There is no project-identity seam. The server has an implicit "current project" global, and half the API is built on it

This is the root cause of most of what follows, so it goes first.

`server/src/index.ts:110` creates one mutable object:

```ts
const currentConfig: Config = loadConfigFromFile();
```

Every route factory is then handed either that object directly or a `() => currentConfig` getter
(`index.ts:229–320`). `currentConfig.projectDirectory` is **derived** inside `updateConfig`
(`index.ts:170–177`) from `projectsRootDirectory + activeProject`. So "which project am I working on"
is server-global, mutable, persisted to `server/config.json`, and changed by any client that POSTs
`/api/config`.

Measured consequence: **50 of 156 handlers** read that global to decide which directory to touch —
they have no parameter that says which project they operate on. Examples:

- `GET /api/recordings` — `routes/index.ts:402`, 193 lines, builds the whole recordings list from
  `getProjectPaths(expandPath(config.projectDirectory))`.
- `GET /api/suggested-naming` — `routes/index.ts:85`.
- Every route in `routes/manage.ts` (13 of them), e.g. `POST /api/manage/regen-all`
  (`manage.ts:655`, 320 lines) regenerates shadows + transcripts + chapter videos for whatever
  project happens to be active *at the moment the async job runs*, not at the moment it was
  requested.
- `routes/transcriptions.ts` explicitly documents the race it had to work around
  (`transcriptions.ts:119`): *"This ensures transcripts go to the correct project even if user
  switches projects during queue"* — a comment that only exists because project identity is ambient.

Another 40 handlers take `:code` explicitly. So the API has **two incompatible addressing schemes
for the same resource**, and which one you get depends on which router file the endpoint landed in.

**Why this is the rebuild's most important lesson**: an ambient "current project" is a session
concept that got stored on the server. It makes every operation non-idempotent with respect to
time, makes concurrent/background work unsafe by construction, and makes it impossible to write an
HTTP-level test that means anything without mutating global config first. The rebuild should make
project code a required part of every path (`/projects/:code/...`) and keep "which project is the UI
looking at" purely in the client.

**Could not establish**: I did not run the server or reproduce a project-switch-mid-job failure.
The evidence is the code shape plus the defensive comment at `transcriptions.ts:119`, not an
observed incident. It is also possible David simply never switches projects mid-job, in which case
the hazard is latent rather than active — the two look identical from the code.

---

## 2. `routes/query/` is a parallel read model, not a seam — a migration that stopped at 32 endpoints

`routes/query/index.ts` is headed *"NFR-68: Query Routes — Split into Sub-Modules"* and mounts seven
sub-routers under `/api/query`. Git says the tree was created 2025-12-14 (`e2ef9d0`) and last
touched 2026-03-20 (`36f0571`) — it has not grown in five months while the flat routes kept growing.

What it actually is: a **second implementation of the same reads**, differing on three axes.

**Axis 1 — addressing.** `query/` resolves *short* project codes through
`utils/projectResolver.ts` (`resolveProjectCode("c10") -> "c10-poem-epic-3"`, documented at
`projectResolver.ts:36–47`). It is imported by 7 of the 8 `query/` files. The flat `/api/projects`
tree mostly does raw `path.join(projectsRoot, code)` — `routes/state.ts` (3 sites),
`routes/storage.ts` (5 sites), `routes/index.ts`, `routes/relay.ts`. So `GET /api/query/projects/c10`
works and `GET /api/projects/c10/disk` does not. Same resource, two identifier grammars.

**Axis 2 — duplicated scanning logic.** `GET /api/recordings` (`routes/index.ts:402`) and
`GET /api/query/projects/:code/recordings` (`routes/query/recordings.ts:38`) both build a
`unifiedMap` merging real recordings with 240p shadows, both re-derive tags, both compute shadow
sizes — 193 and 204 lines respectively, into two different result types (`RecordingFile` vs
`QueryRecording`). `getProjectFolders` is copied verbatim into both
`utils/projectResolver.ts:15–31` and `routes/query/projects.ts:54–70`.

**Axis 3 — output format.** `query/` alone supports `?format=text` (9 sites) and owns
`utils/reporters.ts` (7 formatters, imported by 6 files, all under `query/`). That is the one real
justification for the split: `query/` is the **LLM/CLI-facing** surface and the flat routes are the
**UI-facing** surface. But that distinction is never named anywhere in the code, and it is not
enforced — `query/` also serves JSON that the UI could use, and the UI's own endpoints could have
grown a formatter.

There is also a live contract drift *inside* the tree: `GET /api/query/config`
(`query/index.ts:37–47`) advertises `stages: ['none','recording','editing','done']`, while
`migrateOldStage` two files over (`query/projects.ts:36–52`) maps exactly those four values to
`planning / recording / first-edit / published`. The advertised vocabulary is the pre-migration one.

**Rebuild implication**: if there are genuinely two audiences (a UI and an agent/CLI), make that a
*representation* concern on one resource model — one router, one resolver, content negotiation for
text vs JSON — not a duplicate route tree with its own identifier grammar. If there is only one
audience, delete the idea.

**Could not establish**: whether the `query/` tree is still actually consumed by anything outside
the app. `shared/apiRegistry.ts` and the in-app API Explorer point at it, but I found no external
CLI/agent caller in this repo. Its endpoints being unused and its endpoints being used by tooling I
cannot see from here look identical from inside the repo.

---

## 3. `/api/projects` is owned by five routers, and one route is currently shadowed dead

`server/src/index.ts` mounts **three** routers on the same prefix, plus two more that write into the
same namespace:

```
index.ts:262  app.use('/api/projects', projectRoutes)   // routes/projects.ts   — 15 routes
index.ts:317  app.use('/api/projects', holdRoutes)      // routes/hold.ts       — 10 routes
index.ts:321  app.use('/api/projects', storageRoutes)   // routes/storage.ts    —  7 routes
index.ts:305  app.use('/api', stateRoutes)              // routes/state.ts declares /projects/:code/state
index.ts:243  app.use('/api', routes)                   // routes/index.ts declares POST /projects
```

Nothing in the codebase knows that `/api/projects` is one resource. Express resolves collisions by
mount order, silently.

**A collision is live right now.** Both of these are registered:

| File:line | Route | Semantics |
|---|---|---|
| `routes/hold.ts:93` | `POST /:code/hold` | rsync **the entire project** to the T7 holding area, then verify. Responds `{ success, data: result }`. Added 2026-04-08, commit `ddaed6a` (B064). |
| `routes/storage.ts:185` | `POST /:code/hold` | move only the **heavy subfolders** to holding, two-pass transactional, refuses when `tree.degraded`. Responds `StorageMutationResponse` = `{ success, newState }`. Added 2026-04-14, commit `a3db182` (storage-panel WU1). |

`hold.ts` is mounted first, and the string `next(` does not appear anywhere in `hold.ts` — every
branch of that handler terminates with a `res` call. So **`routes/storage.ts:185` is unreachable in
the composed app**; every `POST /api/projects/:code/hold` is served by the older whole-project
implementation.

The client is on the new contract: `client/src/components/shared/StoragePanel.tsx:24–31` imports
`useHoldProject` from `hooks/useStorageApi`, which is
`buildMutation('hold', 'Held heavy files to T7')` (`useStorageApi.ts:77`) and POSTs to
`/api/projects/${code}/hold` (`useStorageApi.ts:41`) expecting `newState` back. The older
`useHoldProject` in `hooks/useHoldApi.ts:31` is no longer imported by any component — but
`useHoldStatus` and `useSsdStatus` from that same file still are
(`ProjectsPanel.tsx:17`, `SsdIndicator.tsx:3`), so `hold.ts` cannot simply be unmounted.

**Why the tests did not catch it**: no test mounts the composed application. `storageRoutes.test.ts:176–179`
builds a bare `express()` and mounts *only* `createStorageRoutes`; `holdRoutes.test.ts:64–68` does the
same for *only* `createHoldRoutes`. Both suites pass. Grep for a test importing `../index` returns
nothing. Router composition is, structurally, the one thing this test suite cannot see.

Related contract drift from the same seam: `storageRoutes.test.ts:176` calls
`createStorageRoutes(() => config, () => logPath)` — two arguments — while `index.ts:320` calls it
with one, relying on the default `getLogPath` at `storage.ts:118`. The tested wiring is not the
shipped wiring.

**Rebuild implication**: one prefix, one owner. If a resource needs many files, compose them in a
single router module that owns the prefix and can see all of its own paths. And at least one test
must exercise the *assembled* app, or route collisions remain undetectable by construction.

**Could not establish**: I did not boot the server and issue the request. The conclusion rests on
Express's documented first-match-wins mounting plus the verified absence of `next(` in `hold.ts` —
strong, but it is a code-reading inference, not an observed 200.

---

## 4. There is no layer between HTTP and disk

**105 of 156 handlers (67%) call `fs.*` directly**, 296 call sites in total. The heaviest offenders:
`manage.ts` (38), `assets.ts` (33), `index.ts` (30), `transcriptions.ts` (29), `thumbs.ts` (25),
`projects.ts` (24), `relay.ts` (23). `rsync` is shelled out from three route files
(`storage.ts` ×20, `relay.ts` ×10, `hold.ts` ×7) and `spawn`/`exec` appears in four
(`transcriptions.ts`, `relay.ts`, `system.ts`, `sync.ts`).

`server/src/utils/` exists (28 modules) but is a **helper bag, not a service layer**. Measured:
13 of 28 modules are imported by more than one route file; 9 by exactly one (they are that route's
private implementation, e.g. `storageTree.ts` → `storage.ts`, `archiveInventory.ts` → `hold.ts`);
**6 are imported by no route file at all** (`editManifest`, `formatters`, `responses`, `s3Utils`,
`safeMigration`, `srtUtils`).

The sharpest illustration: **the only long-lived domain service in the app lives inside a route
file.** `routes/transcriptions.ts:20–23` declares module-global mutable state —

```ts
let queue: TranscriptionJob[] = [];
let activeJob: TranscriptionJob | null = null;
let recentJobs: TranscriptionJob[] = [];
let activeProcess: ChildProcess | null = null;
```

— and `createTranscriptionRoutes` returns not just a router but `{ router, queueTranscription,
killActiveProcess, getActiveJob, getQueue }` (`index.ts:224–230`), which `index.ts` then injects
into `createRoutes` and `createManageRoutes`, and whose `killActiveProcess` it calls from
`gracefulShutdown` (`index.ts:381`). The transcription worker's lifecycle is a side effect of
importing an HTTP module.

Consequences that show up as three *different* long-running-job mechanisms:

1. **Queue + worker** — `transcriptions.ts`, module globals, socket progress, killable.
2. **Boolean lock** — `routes/chapters.ts:38`, `let isGenerating = false;`, module-global.
3. **Fire-and-forget floating promise** — `routes/manage.ts:660`, `regenerateAllAsync(...)` invoked
   without `await`, returns `{ success: true, started: true }` immediately. No job id, no lock, no
   dedupe, no cancellation, and no HTTP way to ask how it is going — progress exists only as
   `io.emit('regen:all:progress', …)` (`manage.ts:694`), so a client that was not connected at that
   instant can never learn the outcome.

Also living in HTTP memory: two independent undo buffers for the same user-facing concept —
`recentRenames` at `routes/index.ts` module scope with a `cleanExpiredRenames()` TTL sweeper
(`index.ts:56–61`) backing `POST /api/recordings/undo-rename` (`index.ts:611`), and
`lastBatchMapping` in the `createManageRoutes` closure (`manage.ts:44`) backing
`POST /api/manage/undo-rename` (`manage.ts:1459`). Two undo systems, two lifetimes, two response
shapes, zero shared concept.

**Rebuild implication**: name the domain services — `RecordingLibrary`, `TranscriptionQueue`,
`StorageMover`, `RelaySync` — give them their own module with their own lifecycle owned by the
composition root, and make the route layer a thin adapter: parse → call service → serialise.
Introduce one `Job` abstraction (id, status, progress, result, queryable over HTTP) *before* the
second long-running feature, not after the third.

**Could not establish**: I counted `fs.*` textually inside handler bodies. A handler that calls a
util which then calls `fs` is counted as *not* touching disk, so 105 is a floor for "handlers
coupled to the filesystem", not a ceiling.

---

## 5. Error and response shaping is per-route; the shared abstractions for it are dead code

Three mechanisms were built for this. Two are unused.

**`server/src/utils/responses.ts`** — headed *"NFR-67: Standardized Response Utilities … Consistent
error and success response formats across all routes"* — exports `sendErrorResponse`,
`sendBadRequest`, `sendNotFound`, `sendServerError`. **It is imported by zero files.** Grep for the
symbols across `server/`, `client/`, `shared/` returns nothing. It has survived four commits
(`e9c2df4` → `0dcdddc`) as dead code.

**`server/src/middleware/errorHandler.ts`** — exports `AppError` and `errorHandler`, registered at
`index.ts:324`. `AppError` is **never thrown anywhere**. `next(err)` appears **zero times** in
`routes/**`. 131 of 156 handlers wrap themselves in `try { } catch { }` and answer the catch inline.
`throw` appears twice in the whole route layer (`poem-wui.ts`, `storage.ts`). Under Express 5
(`server/package.json` → `express: ^5.1.0`, installed 5.2.1) a rejected async handler *is*
auto-forwarded, so the middleware is not literally unreachable — but nothing in the codebase ever
deliberately routes an error through it.

**What routes do instead** — every module invented its own:

- The newest router, `routes/storage.ts` (April 2026), defines its own local envelope helpers at
  lines 104–110 rather than importing `utils/responses.ts`:
  ```ts
  function okResponse(newState: StorageState): StorageMutationResponse { return { success: true, newState }; }
  function errResponse(error: string, newState?: StorageState): StorageMutationResponse { … }
  ```
- **30 error responses are returned with HTTP 200** — `res.json({ success: false, … })` with no
  `res.status(…)`. Concentrated in `relay.ts` (15+), plus `poem-wui.ts`, `manage.ts:55`,
  `manage.ts:1461`, `projects.ts:616`.
- **47 handlers return a success body with no `success` envelope at all** — `GET /api/config`
  returns the raw config object (`index.ts:80`), `GET /api/files` returns a bare array
  (`index.ts:156`), `GET /api/recordings` returns `{ recordings, totalRecordingsSize,
  totalShadowsSize }` (`index.ts:578`) and on failure returns **HTTP 500 with that same shape plus
  an `error` key** (`index.ts:586–592`) — a fourth error format.
- Error-body key sets across the route layer: `success` ×205, `ok` ×3, `exists` ×1.

So a client cannot write one `fetchApi` that knows whether a call failed. It must know, per
endpoint, whether to check the status code, the `success` flag, the `ok` flag, or the presence of an
`error` key — and the client duly has both patterns: `useStorageApi.ts:31` checks `res.ok` for the
tree but `useStorageApi.ts:44–52` deliberately parses the body regardless of status for mutations.

`zod` is a declared server dependency and is used in exactly one place — `config/env.ts:2`, for env
vars. **No request body or param anywhere in 156 handlers is schema-validated.**

**Rebuild implication**: pick one envelope, put it in one module, and make it the *only* way to
respond — ideally by having handlers `return` a typed result that a wrapper serialises, so an
un-enveloped response is not expressible. Validate inputs at the boundary with the zod that is
already installed. A "standards" module nobody imports is worse than none: it makes the codebase
look like it has a convention.

**Could not establish**: my "47 un-enveloped" count keys on the literal shape at the first
`res.json(` in each handler; 8 further handlers build an envelope into a variable first and were
excluded. The number is a reasonable floor, not an exact census.

---

## 6. `routes/manage.ts` (1733 lines) is four concepts fused, and it is where the missing seams are most visible

Its 13 routes decompose cleanly into four unrelated responsibilities:

| Concept | Routes |
|---|---|
| **Bulk rename / renumber** | `POST /bulk-rename` (`:86`) |
| **Chapter numbering algebra** | `POST /rename-chapter` (`:1146`), `POST /swap-chapters` (`:1278`), `POST /split-chapter` (`:1526`) |
| **Derived-artifact regeneration pipeline** | `POST /regen-shadows` (`:223`), `/regen-transcripts` (`:342`), `/regen-chapters` (`:445`), `/regen-all` (`:655`) |
| **Destructive cleanup** | `DELETE /delete-transcripts` (`:975`), `/delete-shadows` (`:1025`), `/delete-subfolder` (`:1087`) |
| **Undo** | `POST /undo-rename` (`:1459`) |
| *(orphan)* | `GET /recordings-folder-path` (`:52`) — a path-disclosure endpoint that belongs nowhere |

It contains the five longest handlers in the codebase (`regen-all` 320 lines, `regen-chapters` 210,
`split-chapter` 209, `swap-chapters` 181, `rename-chapter` 132) and six private helpers
(`manage.ts:411, 528, 681, 736, 797, 836`) that are the *actual* domain logic — regeneration
orchestration — living inside a route factory closure where nothing else can reach them.

Two of its concepts are already duplicated elsewhere:
- `POST /api/manage/rename-chapter` (`manage.ts:1146`) vs `POST /api/recordings/rename-chapter`
  (`routes/index.ts:968`, 153 lines).
- `POST /api/manage/undo-rename` (`manage.ts:1459`) vs `POST /api/recordings/undo-rename`
  (`routes/index.ts:611`) — different memory, different TTL, different response type.

**What "manage" actually names**: it is not a domain concept at all. It is a *screen* — the Manage
Panel (FR-131). The file's boundary is a UI tab, so everything that tab needed got appended to it.
That is the accretion mechanism for this whole route layer in miniature: 44% of routes end in an
action verb, and each verb was added where the feature ticket was working, not where the concept
lives.

**Rebuild implication**: never let a route module be named after a screen. Name modules after
resources or services; let one screen call five of them. And extract "chapter numbering" — a pure,
testable, filesystem-free algebra over `{chapter, sequence, name, tags}` — into `shared/` before
writing any of rename/renumber/swap/split, because those four routes are the same algebra applied
four times with four hand-rolled implementations.

**Could not establish**: I read the four chapter-algebra handlers structurally, not line by line
for behavioural equivalence. That they *should* share an abstraction is well supported; that they
currently disagree on edge cases is plausible but unverified.

---

## 7. Config is a mutated singleton with a hand-maintained allow-list duplicated in three places

Adding one config field today requires edits in three unrelated locations that nothing keeps in sync:

1. `shared/types.ts` → the `Config` interface.
2. `routes/index.ts:120–134` → a 13-name destructure in `POST /api/config`.
3. `index.ts:154–207` → 12 hand-written `if (newConfig.X !== undefined)` branches in `updateConfig`.

They already disagree. `POST /api/config` destructures `projectDirectory` and passes it to
`updateConfig` (`routes/index.ts:123`, `:138`) — and `updateConfig` never reads it; the field is
derived from `projectsRootDirectory + activeProject` at `index.ts:170–177`. So the HTTP layer
accepts a field and silently discards it. Symmetrically, `availableTags` is part of `Config`, is
read by two handlers (`routes/index.ts:413`, `:994`) and returned by `GET /api/config`, but has no
branch in `updateConfig` and no slot in the POST destructure — it is settable only by editing
`server/config.json` by hand.

**Four different injection contracts** for the same object:

| Router | Contract | Site |
|---|---|---|
| most routers | `getConfig: () => Config` | `index.ts:246, 250, 254, …` |
| `createRoutes` | raw `config: Config` **plus** `updateConfig(Partial<Config>)` | `routes/index.ts:63–74` |
| `createProjectRoutes`, `createChapterRoutes` | `getConfig` **plus** `saveConfig(config: Config)` — a full-object `Object.assign` write-back (`index.ts:256–260`, `:266–274`) | |
| `createDeveloperRoutes` | raw `config: Config` **snapshot**, no getter | `routes/developer.ts:41`, called at `index.ts:310` |

The developer router works **only by accident**: `currentConfig` is a `const` object that
`updateConfig` mutates field-by-field and never reassigns. The day anyone refactors `updateConfig`
to `currentConfig = { ...currentConfig, ...newConfig }` — the natural, more correct shape —
`/api/developer/config` silently freezes at boot-time values with no error anywhere.
`createRoutes` holds the same snapshot reference (`routes/index.ts:64`) and is saved by the same
accident.

**Rebuild implication**: config is state, so give it an owner with a real interface —
`get()` returning a frozen snapshot, `patch(partial)` validated by a zod schema derived from the
type (so the allow-list *is* the type), and a change event. Never pass the live object. And separate
the two things `Config` currently fuses: **machine settings** (watch dir, roots, machine role,
resolution) and **session/UI state** (`activeProject`) — the second should not be on the server at
all (see §1).

**Could not establish**: I did not exercise `POST /api/config` to confirm `projectDirectory` is
dropped in practice; the claim is read from the absence of any `newConfig.projectDirectory`
reference in `updateConfig`. A caller that also sends `projectsRootDirectory` + `activeProject`
would see a correct-looking result either way.

---

## 8. The API has no contract. `shared/apiRegistry.ts` documents 32 of 149 paths and nothing enforces it

`client/src/components/ApiExplorer.tsx` (509 lines) presents an in-app API browser driven by
`shared/apiRegistry.ts` (1000 lines, hand-written endpoint descriptors with parameters and
examples). The server **does not import it** — grep for `apiRegistry` under `server/src` returns
nothing.

Measured drift: the registry declares **32** `/api/…` paths. The real surface is **149**.
Every registry path does exist (no phantom entries), but **117 real routes (79%) are absent from
it** — the entire `/api/manage`, `/api/assets`, `/api/poem-wui`, `/api/developer`, `/api/edit`,
`/api/chapters` families, all of `/api/projects/:code/*` including every storage and hold verb, and
even three routes inside `query/` itself
(`/api/query/projects/:code/transcript/text`, `…/transcripts/:recording`, `…/transcripts/:recording/srt`).
The registry is essentially a snapshot of the `query/` tree as it stood in December 2025.

The surface it is failing to describe is also not shaped for description:

- **69 of 156 routes (44%) end in an action verb** — `push`, `pull`, `collect`, `promote`,
  `regen-all`, `swap-chapters`, `held-archive`, `batch-offload`, `ensure-edit-folders`,
  `send-ylo`. Mutation is 64 POST + 16 DELETE + 3 PUT + 1 PATCH: verbs in the path, not in the method.
- **7 `…/config` endpoints** across four routers (`/api/config`, `/api/query/config`,
  `/api/chapters/config`, `/api/developer/config`, `/api/poem-wui/brand-config`) with five different
  body shapes.
- **9 `…status…` endpoints** across six routers (`/api/relay/status`, `/api/sync/status`,
  `/api/shadows/status`, `/api/chapters/status`, `/api/poem-wui/status`,
  `/api/projects/ssd-status`, `/api/projects/:code/hold/status`,
  `/api/transcriptions/status/:filename`, `/api/transcriptions/chapter-status/:chapter`) — no
  shared notion of "state of a subsystem".
- **Validation is per-handler and inconsistent.** 41 handlers take a `:code`; **13 have no guard at
  all** (all of `projects.ts` except two, plus two `query/transcripts.ts` SRT routes). The 28 that do
  guard use at least three different mechanisms: `isValidCode` (local to `storage.ts`, 8 sites), an
  inline `/[/\\]/.test(code) || code.includes('..')` regex (local to `hold.ts`, repeated per handler,
  9 sites), and `resolveProjectCode` (`query/` tree). There is **no param middleware** — Express's
  `router.param` is not used anywhere.
- **Freshness is split between push and poll with no rule.** Only 5 of 28 route files emit socket
  events (31 `io.emit` sites: `manage.ts` 15, `transcriptions.ts` 7, `index.ts` 4, `chapters.ts` 3,
  `state.ts` 2). Storage, hold, relay, sync, projects and assets mutations emit nothing, so the
  client compensates with 14 hand-tuned `refetchInterval`s ranging 5s → 120s
  (`useStorageApi.ts:36`, `useRelayApi.ts:33/48/236/250/264`, `useSyncApi.ts:25`,
  `useHoldApi.ts:14`, …).

**Rebuild implication**: derive the contract, never hand-maintain it. One registry that the router
is *built from* — routes registered by iterating typed descriptors carrying method, path, zod input
schema and output type — gives the API Explorer, the client's typed hooks, and the validation for
free, and makes drift impossible rather than merely discouraged. Decide once whether the API is
resource-oriented or RPC-oriented and hold the line; the current 44/56 split is the expensive
middle. And decide one freshness model: if mutations emit, the client never polls.

**Could not establish**: my path reconstruction applies the mounts from `index.ts` to each file's
declared paths. It is accurate for the 18 flat routers and the `query/` tree as mounted in
`query/index.ts:52–58`, but any route registered dynamically or through a path I did not model would
be missing from the 149. I found no such registration, but absence of dynamic registration and
failure to detect it look the same to a grep.

---

## What I would carry into the rebuild, in order

1. **Project code in the path, always.** Kill the server-side "active project". This alone removes
   the reason `query/` exists, removes the transcription queue's project race, and makes the manage
   routes safe to run in the background.
2. **One owner per URL prefix**, and at least one test that boots the assembled app.
3. **A service layer that is not the route layer.** Routes parse and serialise; services own disk,
   processes and long-running work. One `Job` abstraction from day one.
4. **One response envelope, enforced by types** — handlers return values, a wrapper serialises. One
   validation layer using the zod that is already a dependency.
5. **Config with an interface**, split from session state, with the allow-list derived from the type.
6. **A derived API contract** feeding the explorer, the client hooks, and validation from one source.
7. **Modules named after concepts, never after screens.**
