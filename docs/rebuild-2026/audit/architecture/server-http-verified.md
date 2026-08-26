# Adversarial Verification — Server HTTP Surface and Route Layer

Reviewer stance: skeptic. Every number below was re-measured independently against
the working tree (branch `main`, HEAD `3b3b2f1`). Where my measurement disagreed
with the original auditor's, mine is stated and theirs is marked.

## Method

Two throwaway scripts sliced every `router.<verb>('<path>'` declaration in
`server/src/routes/**` and attributed the text between one declaration and the next
to that handler. **Known limitation of that slicing, which matters below:** helper
functions declared *between* two route declarations get attributed to the preceding
handler. That is exactly how the original auditor produced a bogus "regen-all is a
320-line handler". Any per-handler *length* claim from either of us is suspect;
per-handler *presence* claims (does this body touch `fs`, does it self-catch) are safe.

Baseline I reproduced exactly: **156 route handlers** across 26 route files
(18 flat + 8 under `query/`).

---

## Verdicts

| # | Finding | Verdict | Severity (mine) |
|---|---------|---------|-----------------|
| 1 | Project identity is an ambient mutable server global | **UPHELD** | critical |
| 2 | `POST /api/projects/:code/hold` registered twice; new impl dead | **UPHELD, upgraded to certain** | critical |
| 3 | No layer between HTTP and disk | **UPHELD, one sub-claim refuted** | critical |
| 4 | `routes/query/` is a duplicate read model | **UPHELD** | high |
| 5 | Response/error shaping is per-route; abstractions dead | **UPHELD** | high |
| 6 | `routes/manage.ts` named after a screen | **UPHELD, two sub-claims refuted** | high |
| 7 | Config is a mutated singleton with hand-maintained allow-lists | **UPHELD, citation corrected** | medium |
| 8 | No enforced API contract | **UPHELD** | medium |

Nothing was refuted outright. Three findings carried sub-claims that did not survive;
those are itemised so the rebuild does not inherit a wrong number.

---

## 1 — Ambient project identity — UPHELD (critical / certain)

Confirmed:

- `server/src/index.ts:111` `const currentConfig: Config = loadConfigFromFile()`
  (auditor said :110; that line is the comment above it — immaterial).
- `index.ts:170-177` derives `currentConfig.projectDirectory` by
  `path.join(projectsRootDirectory, activeProject)`, **mutating the object in place**.
- `server/src/routes/index.ts:119` `POST /api/config` lets any client move it.
- `server/src/routes/transcriptions.ts:118-119` carries the tell verbatim:
  `// FR-109: Derive transcripts dir from video path, not current config`
  `// This ensures transcripts go to the correct project even if user switches projects during queue`.

My classification of all 156 handlers (path-param `:code` vs ambient config read):

| bucket | count |
|---|---|
| reads `projectDirectory`/`activeProject` in the handler body, no `:code` | **54** (auditor: 50) |
| `:code` in the path, no ambient read | **28** |
| both | **1** — `routes/projects.ts:642` `DELETE /:code` (auditor: same line) |
| `?code=` query param / `resolveProjectCode` | 12 |
| neither | 61 |

The 54 is a **floor, not a ceiling**. Several route files reach the ambient config
through a file-local helper rather than in the handler body, so my body-text scan
misses them: `routes/thumbs.ts:52-53` reads `config.projectDirectory` inside a shared
`getPaths()` used by all 8 of its handlers. File-level counts of
`projectDirectory|activeProject` show 14 route files touching it (index.ts 25 sites,
manage.ts 16, assets.ts 14, poem-wui.ts 10, edit.ts 8).

**Not established:** I did not test that switching projects mid-flight actually
corrupts anything at runtime. The FR-109 comment is evidence the author *hit* that
class of bug once; it is not evidence the remaining 53 handlers are currently broken.
A handler that reads ambient state and a handler that is racy look identical to a
static read.

**Rebuild implication:** project identity is a request-scoped parameter, not server
state. Pick one addressing scheme (`/api/projects/:code/...`) and make it the only one.

---

## 2 — Duplicate `POST /:code/hold` — UPHELD, confidence upgraded probable → certain

I verified every link in the chain:

- Mount order, `server/src/index.ts`: `app.use('/api/projects', projectRoutes)` at **:261**,
  `holdRoutes` at **:322**, `storageRoutes` at **:326** (auditor cited 317/321 — those
  are the `createXRoutes(...)` lines, not the `app.use` lines).
- `server/src/routes/hold.ts:93` `router.post('/:code/hold', ...)` — added `ddaed6a`
  (2026-04-08). I read the whole handler (:93-177). **Every branch terminates in a
  `res.*` call followed by `return`, and the catch block responds.** `grep -c 'next(' hold.ts` = 0.
- `server/src/routes/storage.ts:185` `router.post('/:code/hold', ...)` — added `a3db182`
  (2026-04-14). Registered on the same prefix, *after*. **Unreachable.**
- The two disagree on contract: hold.ts responds `{success, data}` (whole-project
  rsync); storage.ts responds `{success, newState}` (`okResponse` at :104, heavy-subfolder
  two-pass).

This is not a latent smell — it is live. `client/src/components/shared/StoragePanel.tsx:66`
calls `useHoldProject()` from `useStorageApi`, rendered at
`client/src/components/ManagePanel.tsx:647`. That hook (`useStorageApi.ts:77`) posts
to `/api/projects/{code}/hold` (`postMutation`, :40-42) and reads `data.success` /
`data.error` (:64-70). The Hold button therefore runs the **old whole-project rsync**,
not the two-pass heavy-subfolder logic the panel was built for, and `newState` is
never in the response.

Additional evidence the auditor missed, which strengthens it: **two client hooks share
the name `useHoldProject`** — `useHoldApi.ts:32` (sends `{dryRun}`, expects
`HoldOperationResult`) and `useStorageApi.ts:77` (sends no body, expects
`StorageMutationResponse`) — pointing at the same URL with incompatible expectations.

`hold.ts` cannot simply be unmounted: `useHoldStatus` (`ProjectsPanel.tsx:17`) and
`useSsdStatus` (`shared/SsdIndicator.tsx:3`) are still live against it.

Test blindness confirmed. `grep 'express()' server/src/test/` returns 12 hits, all
bare apps mounting exactly one router — `storageRoutes.test.ts:177-179` and
`holdRoutes.test.ts:66-68` both do `express(); app.use('/api/projects', router)`.
No test imports the composed app (`grep "from '../index'"` → 0 hits).

**Not established:** I did not run the server; the shadowing is established by Express
mount semantics plus a read of every branch, not by an HTTP round-trip.

**Rebuild implication:** one prefix, one owner. If routers must share a prefix, assert
it — a startup pass over `app._router` that fails on duplicate `method+path`. And at
least one test that boots the real composed app.

---

## 3 — No service tier — UPHELD (critical / certain), one sub-claim refuted

Measurements reproduced **exactly**:

- **105 of 156 handlers** contain an `fs*.<call>` in the handler body.
- **296 `fs` call sites** across `routes/**`. Top files: manage.ts 38, assets.ts 33,
  index.ts 30, transcriptions.ts 29, thumbs.ts 25, projects.ts 24, relay.ts 23.

Confirmed the smuggled service:

- `routes/transcriptions.ts:19-22` — module-global `queue`, `activeJob`, `recentJobs`,
  `activeProcess`.
- `index.ts:218-224` destructures `{router, queueTranscription, killActiveProcess,
  getActiveJob, getQueue}` out of `createTranscriptionRoutes(...)`, then injects those
  functions into `createRoutes` (:232-236) and `createManageRoutes`, and calls
  `killActiveProcess()` from `gracefulShutdown`.

Confirmed three incompatible job mechanisms:

- real queue — `transcriptions.ts:19-22`
- boolean lock — `chapters.ts:38` `let isGenerating = false;`
- floating promise — `manage.ts:661` `regenerateAllAsync(...)` un-awaited, responds
  `{success:true, started:true, scope}` at :663-667. Progress only via `io.emit`.

Confirmed two undo buffers for one concept: `routes/index.ts:56-61` `recentRenames`
(TTL-expiring) vs `manage.ts:45` `lastBatchMapping` (single array, replaced each op).

**REFUTED sub-claim:** "6 utils modules are imported by no route at all
(editManifest, formatters, responses, s3Utils, safeMigration, srtUtils)." I traced
each. Only **`responses.ts` is genuinely dead** (that is finding 5's subject). The
other five are live, just transitively: `editManifest` → `routes/developer.ts`
(and `utils/projectState.ts`, `utils/renameRecording.ts`); `formatters` → `utils/reporters.ts`
→ 6 query routes; `s3Utils` → `utils/safeDelete.ts`; `srtUtils` → `utils/poemWuiUtils.ts`;
`safeMigration` → `server/src/index.ts`. The auditor's grep apparently only looked one
hop. `server/src/utils/` holds 28 `.ts` modules plus 2 subdirectories (`manage/`, `shared/`),
so the "28 modules" figure is right.

**Rebuild implication:** the domain operations (hold, archive, regenerate, rename-chapter,
transcribe) are the real units. Routes should be a thin adapter over them. The
transcription worker in particular is a process-lifetime service and must be owned by
composition root, not fall out of a router factory's return value.

---

## 4 — `routes/query/` is a duplicate read model — UPHELD (high / certain)

Confirmed:

- Header at `routes/query/index.ts:1-12` — "NFR-68: Query Routes - Split into Sub-Modules".
- Created `e2ef9d0` (2025-12-14); last touched `36f0571` (**2026-03-19**; auditor said
  2026-03-20 — author-vs-commit date).
- `utils/projectResolver.ts:38-47` documents short-code resolution (`"c10"` →
  `"c10-poem-epic-3"`). Imported by **7 of the 8** query files (all but `query/index.ts`).
- `getProjectFolders` is duplicated: `utils/projectResolver.ts:15-31` vs
  `routes/query/projects.ts:54-70`. `diff` of the two ranges shows only a comment line
  and a trailing-line offset — functionally identical.
- Raw `path.join(projectsRoot, code)` in the flat tree: storage.ts ×5 (:203, :337, :422,
  :552, :646), state.ts ×3 (:69, :129, :197), projects.ts ×4 (:556, :592, :621, :666),
  plus index.ts:363, hold.ts:27, relay.ts:166.
- Duplicated read model: `routes/index.ts:435` and `routes/query/recordings.ts:59`
  each build a `unifiedMap` of real+shadow recordings into **different types**
  (`RecordingFile` vs `UnifiedRecording`).
- `?format=text` appears only under `query/`; `utils/reporters.ts` is imported by
  exactly the 6 query route files and nothing else.
- **Internal drift confirmed and it is real:** `query/index.ts:38-47` advertises
  `stages: ['none','recording','editing','done']` while `query/projects.ts:39-51`
  `migrateOldStage` maps exactly those four strings *away* to
  `planning / recording / first-edit / published`. The same router tells a caller the
  vocabulary it has already migrated off.

**Sharpening the auditor:** the split is worse than "flat tree uses raw joins".
`routes/projects.ts` uses **both** — `resolveProjectCode` at :153 and raw joins at
:556/:592/:621/:666. The two grammars coexist inside one file.

**Not established:** I did not check whether any external agent/CLI actually consumes
`?format=text`, so I cannot say whether the second tree earns its keep as a *product*
surface. The claim upheld here is about *duplication*, not about deleting it.

**Rebuild implication:** one resource model, one resolver, representation chosen by
`Accept`/`?format`. Never a parallel route tree.

---

## 5 — Per-route response and error shaping — UPHELD (high / certain)

Confirmed dead abstractions:

- `server/src/utils/responses.ts` ("NFR-67: Standardized Response Utilities").
  `grep -r 'sendErrorResponse|sendBadRequest|sendNotFound|sendServerError|utils/responses'`
  across `server/ client/ shared/` returns **only** `server/dist/**` build artifacts —
  **zero source imports**.
- `middleware/errorHandler.ts:15` `export class AppError` — appears nowhere outside
  its own file.
- `grep 'next(' server/src/routes/` → **1** hit, and it is not error propagation:
  `query/index.ts:34`, a logging middleware pass-through. (Auditor said 0.)
- `grep 'throw '` in routes → **2** hits, one of which is a comment
  (`storage.ts:126`); the only real one is `poem-wui.ts:267` re-raising a non-ENOENT.
- **131 of 156 handlers self-catch** — reproduced exactly.
- `routes/storage.ts:104-110` — the newest router defines its own local
  `okResponse`/`errResponse` rather than importing the module built for it.

Confirmed envelope chaos:

- `routes/index.ts:79-81` `GET /api/config` → `res.json(config)`, raw object, no envelope.
- `routes/index.ts:155-158` `GET /api/files` → bare array.
- `routes/index.ts:578-582` `GET /api/recordings` → `{recordings, totalRecordingsSize,
  totalShadowsSize}`; the failure path at `:584-592` returns **HTTP 500 with the same
  shape plus an `error` key** — so a client cannot distinguish success from failure by
  body shape, only by status.
- `zod` is a server dependency imported at exactly one place, `config/env.ts:2`.
  **No request body or path param in any of the 156 handlers is schema-validated.**
- Client inconsistency confirmed: `useStorageApi.ts:31` throws on `!res.ok`;
  `useStorageApi.ts:40-52` (`postMutation`) deliberately parses the body regardless of
  status, with the comment "Server returns 4xx/5xx with a structured body — parse regardless."

**Correction to the auditor's numbers, in the direction that makes it worse:**
they claimed "30 error responses returned with HTTP 200". I count **51** occurrences of
`res.json({ success: false` with no `res.status()` call. I could not reproduce their
"47 handlers with no envelope" or the "success ×205 / ok ×3 / exists ×1" key-set tally
— my raw counts are 523 `success:` and 33 `ok:` occurrences in `routes/**`, which
includes non-response uses, so neither figure is directly comparable. **Treat 47 and
205/3/1 as unverified.** The three verified anchors (`config`, `files`, `recordings`)
are enough to carry the claim.

**Rebuild implication:** the envelope must be the only expressible path — a typed
`reply()` the handler *returns*, or thrown domain errors caught by one middleware.
A helper module that authors may ignore will be ignored; this repo proves it twice
(`responses.ts` and `AppError`).

---

## 6 — `routes/manage.ts` is named after a screen — UPHELD (high / certain), two sub-claims refuted

Confirmed exactly, line for line:

13 routes, and they are four unrelated concepts plus an orphan:

| concept | routes |
|---|---|
| bulk rename | `:86` POST /bulk-rename |
| chapter-number algebra | `:1146` /rename-chapter, `:1278` /swap-chapters, `:1526` /split-chapter |
| regeneration pipeline | `:223` /regen-shadows, `:342` /regen-transcripts, `:445` /regen-chapters, `:655` /regen-all |
| destructive cleanup | `:975` DELETE /delete-transcripts, `:1025` /delete-shadows, `:1087` /delete-subfolder |
| undo | `:1459` /undo-rename |
| orphan | `:52` GET /recordings-folder-path |

Six private helpers at `:411, :528, :681, :736, :797, :836` — `regenerateChaptersAsync`,
`regenerateAllAsync`, `regenerateShadowsInternal`, `regenerateTranscriptsInternal`,
`regenerateChaptersInternal`, `groupRecordingFilesByChapter`. These are the regeneration
domain, and they are trapped inside the `createManageRoutes` closure, reachable only
through HTTP.

Duplication confirmed: `POST /api/manage/rename-chapter` (`manage.ts:1146`) vs
`POST /api/recordings/rename-chapter` (`routes/index.ts:968`); `POST /api/manage/undo-rename`
(`manage.ts:1459`) vs `POST /api/recordings/undo-rename` (`routes/index.ts:611`), backed
by the two different undo buffers noted in finding 3.

File is **1733 lines** — confirmed.

**REFUTED sub-claim (a):** "holds the five longest handlers in the codebase —
regen-all 320 lines". I read `manage.ts:655-676`. The `POST /regen-all` handler is
**~21 lines**: it calls `regenerateAllAsync(...)` un-awaited, responds, catches. The
"320" is the artifact of measuring to the next `router.post(` while four helper
functions sit in between. Every per-handler length figure in the original finding
(210 / 209 / 181 / 132) is produced the same way and should not be trusted.
This does not weaken the finding — the *file* is still 1733 lines of four concepts —
but the "longest handlers" framing is wrong.

**REFUTED sub-claim (b):** "69 of 156 routes end in an action verb". I cannot
reproduce 69. Counting route declarations whose last path segment is hyphenated and
not a parameter gives **45**. The RPC-verb shape is real and pervasive; the number 69
is not one I can stand behind.

Method mix I *did* reproduce exactly: **GET 72, POST 64, DELETE 16, PUT 3, PATCH 1**.

**Rebuild implication:** never name a server module after a UI tab. `manage.ts` exists
because FR-131 built a panel; four domains were appended to it because that is where
the ticket was open.

---

## 7 — Config singleton — UPHELD (medium / certain), one citation corrected

Confirmed:

- Three places must change to add a field: `shared/types.ts` (the `Config` interface,
  e.g. `availableTags` at :199), `routes/index.ts:120-134` (a 13-name destructure in
  `POST /api/config`), `index.ts:154-207` (hand-written
  `if (newConfig.X !== undefined)` branches).
- **They already disagree, both ways:**
  - `projectDirectory` is destructured at `routes/index.ts:123` and passed at :137,
    but `updateConfig` has **no branch reading it** — it *derives* the value at
    `index.ts:170-177`. Accepted and silently discarded. Confirmed.
  - `availableTags` is in `Config` (`shared/types.ts:199`), persisted by
    `config/configManager.ts:90,129`, read at `routes/index.ts:413` and `:994` and
    returned by `query/index.ts:47` — but has **no `updateConfig` branch and no POST
    slot**. Settable only by hand-editing `config.json`. Confirmed.
- Four injection contracts confirmed:
  1. `getConfig: () => Config` — system, query, video, shadows, edit, manage, poem-wui,
     state, relay, sync, hold, storage.
  2. raw `config` object + `updateConfig(Partial<Config>)` — `createRoutes`
     (`index.ts:229-237`); that router then reads `config.projectDirectory` directly
     (`routes/index.ts:405, 413`).
  3. `getConfig` + full-object write-back `(config) => { Object.assign(currentConfig,
     config); saveConfigToFile(currentConfig); }` — `createProjectRoutes`
     (`index.ts:256-260`) and `createChapterRoutes` (`index.ts:266-274`).
  4. raw snapshot, no getter — `createDeveloperRoutes(config: Config)`
     (`routes/developer.ts:41`, called at `index.ts:310`).
- The accidental-aliasing mechanic is real: `updateConfig` mutates `currentConfig`
  **in place** (`index.ts:158-177`), so contracts (2) and (4) see updates only because
  they hold the same object reference. A refactor to `currentConfig = {...currentConfig,
  ...newConfig}` — the more correct shape — would silently freeze them.

**CORRECTED citation:** the auditor named `GET /api/developer/config` as the endpoint
that would freeze. That is wrong — `developer.ts:110` re-reads `config.json` from disk
(`CONFIG_FILE`, :38) and never touches the injected object. The endpoint that actually
depends on the aliasing is **`GET /api/developer/project-state`**, which reads
`config.projectDirectory` at **`developer.ts:59`** — the only use of the injected
snapshot in that file. Same failure, different route.

**Rebuild implication:** config is a value, not a mutable singleton. One accessor
contract. Derive the write allow-list from the type (a zod schema over `Config`), so
`projectDirectory` and `availableTags` cannot drift out of it.

---

## 8 — No enforced API contract — UPHELD (medium / certain)

Reproduced exactly:

- `shared/apiRegistry.ts` is **1000 lines**, hand-written; `client/src/components/ApiExplorer.tsx`
  is **509 lines** and imports it (:8). `grep apiRegistry server/src` → **0** —
  the server never reads its own registry.
- Registry declares **32 distinct `/api` paths**. I listed them all and confirmed the
  absences: `grep -c '/api/manage'` = 0, and likewise `/api/assets`, `/api/poem-wui`,
  `/api/developer`, `/api/edit`, `/api/chapters` — all **0**. Every `/api/projects/:code`
  storage and hold verb is absent. Route declarations in `routes/**` yield 129 distinct
  path patterns before mount-prefixing (the auditor's 149 counts mounted full paths;
  plausible, not independently reproduced). Either way coverage is ~21-25%.
- `router.param` is used **nowhere** in `server/src`.
- Guard mechanisms confirmed as three flavours: `isValidCode` (local to `storage.ts`,
  **8** sites), an inline `/[/\\]/ + '..'` regex repeated per handler in `hold.ts`
  (**8** sites; auditor said 9), and `resolveProjectCode` in the `query/` tree.
  Similar ad-hoc `includes('..')` checks also appear in relay.ts ×2, system.ts ×3,
  video.ts ×4, sync.ts, projects.ts.
- **9 distinct `...status...` endpoints** — reproduced exactly (`/status`,
  `/status/:filename`, `/ssd-status`, `/chapter-status/:chapter`, `/:code/hold/status`).
- Freshness split confirmed: **31 `io.emit` sites in exactly 5 of 26 route files** —
  manage.ts 15, transcriptions.ts 7, index.ts 4, chapters.ts 3, state.ts 2. Reproduced
  exactly. storage / hold / relay / sync / projects / assets emit nothing.
  The client compensates with **14 `refetchInterval` values** ranging 5s → 120s
  (useEditApi 5s, useTranscriptionsApi 5s, useRelayApi 15s/30s×4, useStorageApi 30s,
  useRecordingsApi 30s, useHoldApi 60s, useSyncApi 120s) — reproduced exactly.

**Minor correction:** the auditor's "7 distinct `.../config` endpoints across 4 routers"
does not hold. I count **8 handler declarations** across **5 route files** on **5
distinct paths** (`/api/config` GET+POST, `/api/chapters/config` GET+PUT,
`/api/query/config`, `/api/developer/config`, `/api/poem-wui/brand-config` GET+POST).
Substance unchanged.

**Not established:** I did not check whether the 13 unguarded `:code` handlers are
actually exploitable — this is a localhost single-user app, and every one of them is
reached only from a same-machine client. The finding stands as *contract absence*,
not as a security claim.

**Rebuild implication:** generate the contract from one schema (route + params + body +
response), rather than maintaining a document beside the code. And decide *once*
whether freshness is push or poll; 14 hand-tuned intervals is the shape of that decision
never having been made.

---

## Summary of what I refuted

1. **Finding 3** — "6 utils modules imported by no route". Only `responses.ts` is dead.
   The other five are live one hop away.
2. **Finding 6** — "regen-all is a 320-line handler / five longest handlers". It is
   ~21 lines. All per-handler length figures are a slicing artifact.
3. **Finding 6** — "69 of 156 routes end in an action verb". I measure 45 by the
   nearest defensible definition; 69 is unreproduced.
4. **Finding 7** — wrong endpoint named. `GET /api/developer/config` reads from disk;
   the aliasing-dependent endpoint is `GET /api/developer/project-state`
   (`developer.ts:59`).
5. **Finding 8** — "7 config endpoints across 4 routers" is 8 handlers across 5 files.
6. **Finding 5** — "30 error responses at HTTP 200" is at least 51; "47 handlers with
   no envelope" and the "success ×205 / ok ×3 / exists ×1" tally are unreproduced and
   should not be quoted.

## Summary of what I strengthened

1. **Finding 2** goes from *probable* to *certain*, and from architectural to a **live
   functional defect**: the Storage panel's Hold button runs the old whole-project
   rsync. Two client hooks named `useHoldProject` point at the same URL with
   incompatible contracts.
2. **Finding 1**'s count of 54 ambient handlers is a floor — files like `thumbs.ts`
   reach ambient config through a file-local helper my scan does not count.
3. **Finding 4** is worse than stated: `routes/projects.ts` uses *both* identifier
   grammars inside one file (`resolveProjectCode` at :153, raw joins at :556/592/621/666).
