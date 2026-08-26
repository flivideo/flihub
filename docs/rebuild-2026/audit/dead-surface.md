# Dead Surface Audit — FliHub

**Date:** 2026-08-26
**Repo:** `/Users/davidcruwys/dev/ad/flivideo/flihub` @ `3b3b2f1` (main)
**Scope:** code that exists but does nothing — unimported modules, uncalled routes, orphan socket
events, drifted config, repo debris.

---

## 0. Evidence discipline — what this audit can and cannot prove

Read this before trusting any "dead" label below.

**What makes static grep unusually reliable in THIS client:**

```
grep -rnE "React\.lazy|[^a-zA-Z]import\(|require\(|import\.meta\.glob" client/src
→ 0 results
```

There is **not one dynamic import, `React.lazy`, `require()`, or `import.meta.glob` anywhere in
`client/src`**. Every client module edge is a static ESM import. So for client components, hooks and
utils, "no importer found" is close to proof. It is still not absolute: a re-export barrel can
launder a name, so every barrel (`components/shared/index.ts`, `shared/relay/index.ts`,
`shared/storage/index.ts`, `hooks/useApi.ts`) was expanded symbol-by-symbol and each exported name
re-checked for a downstream consumer.

**Where the evidence is weaker, and I say so inline:**

- **HTTP routes.** The client builds URLs from at least three different bases (`API_URL`,
  `API_BASE = ${API_URL}/api`, and `fetchApi()`'s implicit base) and does interpolate path segments
  — `` `/api/manage/delete-${target}` `` (ManagePanel.tsx:290), `` `${API_URL}${endpoint}` ``
  (ManagePanel.tsx:387), `` `/api/projects/${code}/${verb}` `` (useStorageApi.ts:75). My first pass
  produced **9 false "dead" calls** purely from these. Every route below was then verified by hand.
  Even so: a route is only proven *un-called-by-this-client*. It is **not** proven unused —
  `/api/query/*` is deliberately an external read API (§4).
- **Socket events.** Server emits were found by literal-string grep. The only emit indirection is
  `WatcherManager.ts:62` (`this.io.emit(config.event)` over a table of literals), which I expanded.
  No other wrapper exists, so the emit census is complete.
- **Config keys.** "Read by code" means the identifier appears in a non-test source file. A key read
  only via `Object.keys()`/spread would look identical to a dead key. I found no such pattern, but I
  did not exhaustively prove its absence.

---

## 1. Client modules with no production consumer

Counts are "references anywhere in `client/src` + `server/src` + `shared`, excluding the file
itself", split into production vs test.

| File | prod refs | test refs | LOC | Verdict |
|---|---|---|---|---|
| `client/src/components/ProjectStatsPopup.tsx` | **0** | 0 | **955** | Dead — zero references repo-wide |
| `server/src/scripts/scanProjects.ts` | **0** | 0 | **944** | Dead — not in any `package.json` script |
| `client/src/components/shared/RegenToolbar.tsx` | **0** | 0 | 415 | Dead |
| `client/src/components/HoldDeleteModal.tsx` | 0 | 8 | 203 | Dead in prod, tested only |
| `client/src/components/shared/RelayBrowser.tsx` | **0** | 0 | 119 | Dead |
| `client/src/components/shared/SlideOutDrawer.tsx` | 1 (barrel only) | 0 | 61 | Dead — barrel re-export, no consumer |
| `client/src/utils/chapterUtils.ts` | 0 | 1 | 36 | Dead in prod, tested only |
| `client/src/components/shared/PageHeader.tsx` | 1 (barrel only) | 0 | 15 | Dead — barrel re-export, no consumer |

**Total: 2,748 LOC (~4.3% of the 63,614 LOC in `client/src` + `server/src` + `shared`).**

Verification for each (representative — same command shape run for all):

```
grep -rn "ProjectStatsPopup" client/src server/src shared --include='*.ts' --include='*.tsx'
→ client/src/components/ProjectStatsPopup.tsx:234:export function ProjectStatsPopup(...)   ← only the definition
```

`PageHeader` / `SlideOutDrawer` each have exactly one hit —
`client/src/components/shared/index.ts:4` and `:10` — a barrel line that nothing imports the symbol
from. Barrel expansion confirmed these two are the only zero-consumer names in that barrel; the
`relay/` and `storage/` barrels are fully consumed.

**When they died (git archaeology, `git log -S`):**

| File | Last commit touching it | Story |
|---|---|---|
| `ProjectStatsPopup.tsx` | `fb99b1b` 2026-03-24 | Import removed by `7afcabf` 2026-03-30 *"filterable project table + detail drawer (FR-148)"* — replaced by `ProjectDrawer`, file left behind |
| `RegenToolbar.tsx` | `fcb1ba2` 2026-03-25 | Superseded by `1b436e2` 2026-03-22 *"manage page redesign (B041)"* — its socket wiring was **copied into `ManagePanel.tsx:179-192`**, original never deleted |
| `RelayBrowser.tsx` | `a38d9f2` 2026-03-25 | Orphaned by `99aef7d` 2026-03-23 *"relay-redesign — B046 workflow lanes"* — 1 day after `18b09ca` created it |
| `HoldDeleteModal.tsx` | `45deeef` 2026-04-08 | Born `ddaed6a` 2026-04-08 (B064), orphaned by `ba8a440` 2026-04-14 (StoragePanel). **Alive 6 days.** |
| `chapterUtils.ts` | `690f619` 2026-03-23 | Created and orphaned in the same commit (B047) |

`RegenToolbar.tsx` is the sharpest case: lines 137-152 register/unregister the exact same six
`regen:*` socket listeners as `ManagePanel.tsx:179-192`. Two copies of the same event contract, one
of which nothing renders.

**Nothing dead in `client/src/hooks/`** at file level — but see §3 for four dead *hooks* inside a
live file.

---

## 2. Server utils — all reachable

Every file in `server/src/utils/` has at least one production importer. The two thinnest:

- `server/src/utils/formatters.ts` — one importer, `server/src/utils/reporters.ts:20`.
- `server/src/utils/safeMigration.ts` — one importer, `server/src/index.ts:31`.

Both legitimate. No dead server utils found.

---

## 3. Dead hooks inside a live file

`client/src/hooks/useHoldApi.ts` exports 7 hooks. Four have **zero consumers**:

| Hook | Line | Endpoint it wraps | Consumers |
|---|---|---|---|
| `useSsdStatus` | 8 | `GET /api/projects/ssd-status` | `SsdIndicator.tsx:3` ✅ |
| `useHoldStatus` | 19 | `GET /api/projects/:code/hold/status` | `ProjectsPanel.tsx:17` ✅ |
| `useHoldProject` | 31 | `POST /api/projects/:code/hold` | **0** (see §5 — name collision) |
| `useVerifyHolding` | 48 | `POST /api/projects/:code/hold/verify` | **0** |
| `useDeleteLocal` | 63 | `DELETE /api/projects/:code/local` | **0** |
| `useRestoreFromHolding` | 84 | `POST /api/projects/:code/hold/restore` | **0** |
| `useDeleteHolding` | 100 | `DELETE /api/projects/:code/holding` | **0** |

```
grep -rn "useVerifyHolding\|useDeleteLocal\|useRestoreFromHolding\|useDeleteHolding" client/src \
  | grep -v "hooks/useHoldApi.ts:" | grep -vE '/test/|__tests__'
→ (empty)
```

This is the **B064 Archive Offload** feature. Shipped 2026-04-08 (`ddaed6a`), superseded by the
storage-panel campaign 2026-04-13/14 (`a3db182`, `ba8a440` — whose message literally says
*"ArchiveTool removal"*). The tool was removed; **the hooks, the modal, and the routes behind them
were not.** Five days of feature, still fully wired end-to-end and unreachable.

---

## 4. HTTP routes with no client caller

**156 route registrations, 155 unique (method, path) pairs** — the duplicate is §5.

```
grep -rnE "router\.(get|post|put|patch|delete)\(" server/src/routes | wc -l  → 156
```

### 4a. Routes verified to have no static client reference

Each hand-checked. **This proves no call from `client/src` only** — see the caveats after the table.

| Method | Path | Source | Note |
|---|---|---|---|
| GET | `/api/projects/archive-inventory` | `hold.ts:436` | Only the *query key* `['archive-inventory']` survives (`queryKeys.ts:72`), invalidated by 6 sites — invalidating a query nothing fetches |
| POST | `/api/projects/batch-offload` | `hold.ts:510` | B064 batch UI never built |
| POST | `/api/projects/batch-delete-local` | `hold.ts:589` | B064 batch UI never built |
| POST | `/api/projects/:code/hold/verify` | `hold.ts:185` | reachable only via dead `useVerifyHolding` |
| DELETE | `/api/projects/:code/local` | `hold.ts:220` | reachable only via dead `useDeleteLocal` |
| POST | `/api/projects/:code/hold/restore` | `hold.ts:293` | reachable only via dead `useRestoreFromHolding` |
| DELETE | `/api/projects/:code/holding` | `hold.ts:357` | reachable only via dead `useDeleteHolding` |
| POST | `/api/projects/:code/hold` | `storage.ts:185` | **shadowed — unreachable at any cost, see §5** |
| GET | `/api/files` | `index.ts:155` | original pending-file list; superseded by sockets |
| DELETE | `/api/files/:encodedPath` | `index.ts:280` | ditto |
| POST | `/api/manage/regen-chapters` | `manage.ts:445` | `ManagePanel.tsx:307` types the tool union as `'regen-shadows' \| 'regen-transcripts' \| 'regen-all'` — **`regen-chapters` was dropped from the union**, leaving the endpoint stranded. `docs/planning/implementation-status-report.md:15` still calls it "✅ WORKING". |
| POST | `/api/manage/rename-chapter` | `manage.ts:1146` | **duplicate implementation** — client calls `/api/recordings/rename-chapter` (`useRecordingsApi.ts:146` → `index.ts:968`) |
| POST | `/api/manage/swap-chapters` | `manage.ts:1278` | has its own backlog bug (`docs/planning/BACKLOG.md:38`, B027) for a feature no UI reaches |
| POST | `/api/relay/ensure-edit-folders` | `relay.ts:500` | see below |
| GET | `/api/system/health` | `system.ts:346` | no client, no probe, no Procfile healthcheck |
| GET | `/api/transcriptions/chapter-status/:chapter` | `transcriptions.ts:523` | only the query key `chapterStatus` survives (`queryKeys.ts:26`) — **zero other references, not even an invalidation** |

`POST /api/relay/ensure-edit-folders` is worth its own line. It arrived on branch
`worktree-agent-a00111bf` (*"auto-create edit folders on recordings collect + ensure-edit-folders
endpoint"*, 2026-03-24), was merged, and `docs/planning/relay-kanban/IMPLEMENTATION_PLAN.md:18`
marks it `[x]` done. `docs/planning/flihub-feedback.md:45` then records F007: the button was
*supposed* to be expanded to `POST /ensure-folders` with the old one kept as an alias. **Neither
path is called from `client/src`.** The project memory note *"Relay Kanban shipped; auto-create edit
folders still missing"* is exactly right — the backend shipped, the button never did.

### 4b. `/api/query/*` — not dead, a second consumer surface

16 GET routes under `/api/query`. The client calls only 6 of them:

```
grep -rn "api/query" client/src | grep -vE '/test/|__tests__'
→ transcript/text, transcripts, transcripts/:rec/srt,
  transcripts/chapters/:name/srt, inbox, inbox/:sub/:file
```

The other 10 (`/config`, `/projects`, `/projects/resolve`, `/projects/:code`, `.../recordings`,
`.../chapters`, `.../images`, `.../export`, `/transcripts/:recording`) have **no client caller**,
but they are not dead surface — they are a deliberate agent/CLI-facing read API. Proof:
`server/src/utils/reporters.ts` exists solely to render them as ASCII text reports
(`formatProjectsReport`, `formatChaptersReport`, …, 6 importers all under `routes/query/`), and
`docs/uat/FR-53-ascii-report-formatter.md` + `docs/prd/project-data-query-spec.md` specify them.

**I cannot rule out external callers for any route in §4a either** — a curl from a skill, another
FliVideo app, or an agent. What I checked is the client only. For `/api/query` I found positive
evidence of an intended external consumer; for §4a I found none, but absence-of-evidence here looks
identical to a caller I can't see.

### 4c. `apiRegistry.ts` — documentation that fell 121 routes behind

`shared/apiRegistry.ts` (1,000 LOC) powers `ApiExplorer.tsx`, which is a live tab
(`App.tsx:39,895`). Machine-compared registry entries against real registrations:

```
registry entries:                      34
… that match a real (method, path):    34   ← no stale entries, good
real routes NOT in the registry:      121   ← 78% of the API is undocumented
```

So the in-app API explorer shows 22% of the surface. Not dead, but a contract that stopped being
maintained after the query API era.

---

## 5. The shadowed route — `POST /api/projects/:code/hold` registered twice

This is the single most consequential finding in the audit.

```
server/src/index.ts:322   app.use('/api/projects', holdRoutes);      // B064
server/src/index.ts:326   app.use('/api/projects', storageRoutes);   // storage-panel WU1

server/src/routes/hold.ts:93       router.post('/:code/hold', …)
server/src/routes/storage.ts:185   router.post('/:code/hold', …)
```

Express dispatches to the **first** registered router that matches and responds. `hold.ts:93`
responds unconditionally (`res.json({ success: true, data: result })` at hold.ts:176, or a 4xx/5xx).
It never calls `next()`. Therefore **`storage.ts:185-318` is unreachable in production.**

The two handlers are not equivalent:

| | `hold.ts:93` (wins) | `storage.ts:185` (dead) |
|---|---|---|
| Success body | `{ success: true, data: result }` | `{ success, newState, error? }` (`errResponse`, storage.ts:108) |
| Degraded-state guard | none | 409 *"Project is in a degraded storage state"* |
| Illegal-state guard | none | 400 *"Cannot hold: project is in state '…'"* |
| Empty-hold guard (P9) | none | 400 *"No heavy content to hold"* |
| Relay byte accounting | no | yes (`relayBytesFor`) |

The live consumer is `StoragePanel.tsx:66` → `useStorageApi.ts:77`
(`useHoldProject = buildMutation('hold', …)`), which types the response as `StorageMutationResponse`
and reads `data.newState` (`useStorageApi.ts:60`). The winning handler never returns `newState`, so
that read is `undefined` in production.

**Why no test caught it:** both suites mount their own router in isolation at the same prefix —

```
server/src/test/holdRoutes.test.ts:68     app.use('/api/projects', router);
server/src/test/storageRoutes.test.ts:179 app.use('/api/projects', router);
```

Neither ever composes the real `index.ts` mount order, so both suites pass while production routes
to the other file. The seam that would have caught this — a single place that owns route
composition and asserts uniqueness — does not exist.

**Confidence: CONFIRMED by static mount order** (Express's first-match-wins dispatch is
deterministic and documented). **I did not execute a live POST** against the running server, because
either handler mutates the T7 drive on success. So I have not *observed* the shadowing at runtime —
I have proven the registration order that causes it.

**Related name collision:** `useHoldProject` is defined twice —

```
client/src/hooks/useHoldApi.ts:31      export function useHoldProject()
client/src/hooks/useStorageApi.ts:77   export const useHoldProject = buildMutation('hold', …)
```

and it is the **only** duplicated export name across `client/src/hooks/*.ts`. `useApi.ts:33` does
`export * from './useHoldApi.js'`. `useStorageApi` is *not* in that barrel, which is the only reason
the ESM ambiguous-re-export rule (which silently drops a colliding name) does not bite today. Add
`export * from './useStorageApi.js'` to `useApi.ts` and `useHoldProject` silently disappears from
the barrel.

---

## 6. Socket events — both directions broken

### 6a. Client listens, server never emits (dead listeners)

```
grep -rn "file:renamed\|file:error" client shared server --include='*.ts' --include='*.tsx'
```

| Event | Client listener | Server emitter |
|---|---|---|
| `file:renamed` | `useSocket.ts:59` (+ off at :78) | **none in `server/src`** — declared in the contract at `shared/types.ts:694`, emitted nowhere |
| `file:error` | `useSocket.ts:70` (+ off at :80) | **none in `server/src`** — declared at `shared/types.ts:695`, emitted nowhere |

Both are declared in the `ServerToClientEvents` interface, so TypeScript is *satisfied* — the
contract type says they exist, and nothing checks that a declared event has a producer. `useSocket`
destructures `{ oldPath, newPath }` from a payload that never arrives.

The other seven client listeners I initially flagged (`assets:incoming-changed`,
`assets:assigned-changed`, `inbox:changed`, `projects:changed`, `thumbs:changed`,
`thumbs:zip-added`, `transcripts:changed`) are **live** — emitted indirectly through
`WatcherManager.ts:62` (`this.io.emit(config.event)`) over a config table at
`WatcherManager.ts:114-217`. Flagging them would have been a false positive from literal-string grep.

### 6b. Server emits, no client listener (unheard emissions)

| Event | Emitter | Listener |
|---|---|---|
| `chapters:generating` | `routes/chapters.ts:178` | none |
| `chapters:generated` | `routes/chapters.ts:189` | none |
| `regen:all:started` | `routes/manage.ts:693` | none |
| `regen:all:error` | `routes/manage.ts:728` | none |

`regen:all:error` is the one that matters operationally: **a failed "Regenerate All" reports its
failure over a socket channel nothing is listening on.** `ManagePanel.tsx:179-192` subscribes to
`regen:all:progress` and `regen:all:complete` but not `:started` or `:error`. The user sees a
progress bar that stops.

Note `chapters:complete` *is* heard, `chapters:generating`/`chapters:generated` are not — three
events for one lifecycle, two of them unwired.

---

## 7. Config — no dead keys, but the template is 9 keys behind

All 25 `Config` keys are read somewhere in non-test source. **No dead config keys.** The failure is
in the opposite direction: `server/config.template.json` is the onboarding contract and it has
drifted badly.

| Key | server reads | client reads | in `config.json` | in `config.template.json` |
|---|---|---|---|---|
| `glingDictionary` | 15 | 22 | ✅ | ❌ |
| `projectPriorities` | 12 | 0 | ✅ | ❌ |
| `projectStageOverrides` | 12 | 0 | ✅ | ❌ |
| `poemWuiUrl` | 9 | 0 | ✅ | ❌ |
| `relayDirectory` | 35 | 18 | ✅ | ❌ |
| `relayEnabled` | 19 | 9 | ✅ | ❌ |
| `machineRole` | 6 | 11 | ✅ | ❌ |
| `projectStages` | 8 | 0 | ❌ | ❌ |
| `chapterRecordings` | 12 | 1 | ❌ | ❌ |
| `brandConfigPath` | 9 | 1 | ❌ | ❌ |
| `diskThresholds` | 2 | 1 | ❌ | ❌ |
| `whisperBinary` / `whisperModel` / `whisperLanguage` | 3/4/3 | 0 | ❌ | ✅ |
| `fileExtensions` | **0 (source)** | 0 | ❌ | ❌ |
| `projectDirectory` | 132 | 17 | ❌ | ❌ |

Three specific rots:

1. **`relayEnabled` / `relayDirectory` / `machineRole` are absent from the template.** The entire
   Relay collaboration subsystem (54 server read-sites) is invisible to anyone setting up a new
   machine from the template. Given FliHub runs on five machines, this is the setup contract for the
   feature that *depends* on multi-machine setup.
2. **`whisperBinary` / `whisperModel` / `whisperLanguage` are in the template but not in the live
   `config.json`.** So the template documents transcription config the working machine does not use
   (defaults win). Template and reality point in opposite directions.
3. **`fileExtensions` is a *required* field of `interface Config` (`shared/types.ts:198`)** but
   appears in zero config files and in exactly one non-test source line —
   `server/src/config/configManager.ts:30`, a hardcoded default `['.mov']`. It is required by the
   type, supplied by nobody, and defaulted in one place. `projectDirectory` is the same shape:
   required in the type (`shared/types.ts:200`), absent from `config.json`, migrated on load.

**Caveat:** "read by code" = identifier appears in a non-test source file. A key consumed only via
spread or `Object.keys()` would look dead here. I found no such pattern but did not prove its absence.

---

## 8. `shared/` — the seam that silently forked

### 8a. Checked-in build artifacts, and Vite actually loads them

`shared/` contains hand-committed `.js` and `.d.ts` next to each `.ts`:

```
shared/constants.ts / .js / .d.ts
shared/naming.ts    / .js / .d.ts
shared/paths.ts     / .js / .d.ts
shared/types.ts     / .js / .d.ts
```

`.gitignore` covers `dist/` and `build/` but not these, so all 8 artifacts are **tracked**.

The client imports extensionless (`from '../../../shared/types'`, 63 occurrences). Vite's default
`resolve.extensions` puts `.js` **before** `.ts`, and `client/vite.config.ts` does not override it.
I confirmed this against the **running dev server** rather than reasoning about it:

```
$ curl -s http://localhost:5100/src/components/NamingControls.tsx | grep 'shared/types'
from "/@fs/Users/davidcruwys/dev/ad/flivideo/flihub/shared/types.js"

$ curl -s http://localhost:5100/src/utils/formatting.ts | grep 'shared/'
from "/@fs/Users/davidcruwys/dev/ad/flivideo/flihub/shared/naming.js"
```

**The client runs against the committed `.js` snapshots, not the `.ts` sources.** Meanwhile
`client/tsconfig.json` sets `moduleResolution: "bundler"`, which resolves the same specifier to the
`.ts`. So **the typechecker and the bundler read different files**, and `npx tsc -p
client/tsconfig.json --noEmit` passes clean, proving nothing about what actually ships.

### 8b. How far the artifacts have drifted

```
shared/types.ts    1410 lines   last commit ba8a440  2026-04-14
shared/types.d.ts   704 lines   last commit 429acc3  2026-02-26
shared/types.js      25 lines   last commit 8d0d5f8  2026-02-13
```

`shared/types.ts` has changed in **29 commits** since the `.js`/`.d.ts` were last written.
`shared/types.d.ts` is missing **60 exported types** — the whole Relay, Storage, Sync, Hold and Disk
vocabulary:

```
ArchiveInventoryResponse ArchiveRow ArchiveState DiskSizeData DiskThresholdConfig
DiskThresholdLevel DiskThresholds EditVersion FolderKey HoldLocation HoldOperationResult
HoldStatus HoldVerification MachineRole Relay* (21 types) Split* Storage* (12 types)
Sync* (10 types) UndoRenameResponse
```

**Is there a live bug today? No — and I want to be precise about why, because the check is
ambiguous.** `shared/types.ts` and `shared/types.js` export the *same three runtime values*
(`DEFAULT_TAGS`, `DEFAULT_PROJECT_STAGES`, `STAGE_LABELS`); everything added since February was
type-only, and types erase. `shared/naming.ts`/`.js` and `paths`, `constants` are identical modulo
type annotations (verified by normalised identifier-set diff — the only `.ts`-only identifiers are
`ParsedRecording`, `ParseOptions`, `string`, `boolean`, `number`, i.e. pure annotation), and
`naming.ts` has not been committed since the `.js` (`git log 8d0d5f8..HEAD -- shared/naming.ts` →
empty).

So: **a working system and a broken one look identical right now.** The moment anyone edits a
*function body* in `shared/naming.ts` and does not hand-recompile `shared/naming.js`, the client
silently keeps the February behaviour, the server (which imports `shared/naming.js` specifiers under
`moduleResolution: NodeNext`, and so resolves to the `.ts`) gets the new behaviour, and **no
typecheck, test, or lint will fail.** Client and server would disagree about filename parsing —
the core domain rule of the app — with no error anywhere.

### 8c. Server build output does not match its own start script

```
server/package.json  "build": "tsc"   "start": "node dist/index.js"
server/tsconfig.json  outDir "./dist",  // "rootDir": "./src"  ← commented out to allow ../shared imports
```

With `rootDir` commented out, `tsc` roots at the common ancestor and emits `dist/server/src/index.js`
+ `dist/shared/`. Verified on disk:

```
server/dist/server/src/index.js   EXISTS
server/dist/index.js              MISSING
```

`npm start -w server` cannot work. It is never noticed because `npm run dev` uses
`tsx src/index.ts` (`server/nodemon.json`), so the production entrypoint is never exercised.

### 8d. Dead exports in `shared/`

`shared/naming.ts` — **11 of 25 exports (44%) have zero consumers** in `client/src` or `server/src`:

```
compareChapterSequence  compareRecordings  findMaxImageOrder  findNextSequence
formatSequence  PATTERNS  sanitizeName  validateImageOrder  validateName
validateSequence  validateVariant
```

`shared/types.ts` — 10 exports with zero consumers:

```
ChapterGenerationProgress  DEFAULT_PROJECT_STAGES  DiskThresholdConfig  EditManifest
EditVersion  RelayBrowseResult  RelaySubfolderInfo  STAGE_LABELS  StorageTreePaths
TranscriptContentResponse
```

`shared/paths.ts` and `shared/constants.ts` are fully consumed.

### 8e. The stage vocabulary forked three ways

`DEFAULT_PROJECT_STAGES` and `STAGE_LABELS` are dead in `shared/types.ts` because the concept
migrated into the client without being retired at the source. There are now **three** lists of
project stages:

| Location | Stages | Notes |
|---|---|---|
| `shared/types.ts:439` (`ProjectStage`) + `:456` (`DEFAULT_PROJECT_STAGES`) | 8 | canonical type — **no `shelved`, no `remix`** at the DEFAULT const |
| `client/src/constants/stages.ts` (`STAGE_DISPLAY` / `STAGE_ORDER`) | 10 display / 9 ordered | adds `shelved`, `remix`; **drops `review` from `STAGE_ORDER`** but keeps it in `STAGE_DISPLAY` "for backward compat" |
| `server/src/routes/projects.ts:193` (`validStages`, inline array) | 11 | hardcoded literal, includes `review` *and* `shelved`/`remix` *and* `'auto'` |

Three hand-maintained lists, no single owner, differing membership. Adding a stage means editing
three files in two languages of intent, and nothing fails if you edit one.

---

## 9. Repo debris

### 9a. Branches — all seven are fully merged, zero unmerged work

```
$ for b in <all non-main branches>; do git rev-list --count main..$b; done
worktree-agent-a00111bf   0   tip 2026-03-24 auto-create edit folders + ensure-edit-folders endpoint
worktree-agent-a49fa9be   0   tip 2026-03-24 project Kanban badges
worktree-agent-a678329a   0   tip 2026-03-24 Kanban relay tool
worktree-agent-a8a8d1bd   0   tip 2026-03-24 relay divergence endpoint
worktree-agent-acdaede0   0   tip 2026-03-24 enhanced relay browse
test/verify-ci-2026-02-13 0   tip 2026-02-13 TDD demonstration docs
storage-panel             0   tip 2026-04-14 Wave B — StoragePanel UI
```

**`git log main..storage-panel --oneline` → empty.** The parallel worktree at
`/Users/davidcruwys/dev/ad/flivideo/flihub-storage-panel` sits on `ba8a440`, main is at `3b3b2f1`
(`ba8a440` + the T7-path follow-up fix). **The branch holds nothing unmerged** — the worktree is a
strictly-behind checkout. Safe to delete all seven branches and the worktree.

`origin` still carries `test/verify-ci-2026-02-13`.

### 9b. Tracked vs ignored

| Path | On disk | Tracked | In `.gitignore` | Verdict |
|---|---|---|---|---|
| `.screenshots/` | 24 MB, 81 entries | **85 files** | ❌ | 24 MB of PNGs in git history; 11 more untracked right now |
| `.mochaccino/` | 15 files | **15 files** | ❌ | HTML design mockups; symlinked into the app at `client/public/mochaccino → ../../.mochaccino` and served as a live tab |
| `client/public/mocks/` | 496 KB | 27 files | ❌ | legacy design explorations, shipped in the client build |
| `.playwright-mcp/` | 10 MB, 112 entries | **1 file** | ✅ (ignored) | `page-2026-03-23T09-43-40-929Z.png` was committed *before* the ignore rule; 111 entries now untracked debris |
| `.auto-claude/` | 192 KB | 0 | ✅ | clean |
| `coverage/` | 344 KB | 0 | ✅ | clean |
| `.worktrees/` | empty dir | 0 | ✅ | clean |
| `shared/*.js`, `shared/*.d.ts` | 8 files | **8 files** | ❌ | see §8 — these are the dangerous ones |

`git ls-files | git check-ignore --stdin` → empty, so nothing tracked is currently *also* ignored;
the debris is tracked because the rules were never written for it.

**The `.mochaccino` symlink is worth flagging as architecture, not debris:** `MockupsPage.tsx`
(a live tab, `App.tsx:28,887`) links to `/mochaccino/designs/${slug}/index.html`, served through
`client/public/mochaccino → ../../.mochaccino`. A design-tooling directory is a runtime dependency
of the shipped app.

### 9c. Uncommitted work in the tree

```
 D .claude/scheduled_tasks.lock
 M client/src/components/ProjectListToolbar.tsx      +30/-?
 M client/src/utils/projectFilters.ts                +12/-?
 M client/src/utils/__tests__/projectFilters.test.ts +115/-?
 M start.sh                                          +31/-?
?? 11 × .screenshots/*.png
?? docs/triage-*.md (3 files)
?? docs/rebuild-2026/
```

162 insertions across 5 files. The `projectFilters` + `ProjectListToolbar` change is coherent
work-in-progress with tests written (115 lines of test vs 42 lines of source) — this looks live, not
abandoned. Nothing else in the working tree is at risk.

---

## 10. Summary counts

| Metric | Value |
|---|---|
| Route registrations | 156 (155 unique — 1 duplicate) |
| Routes with no client caller (excl. `/api/query`) | 16 |
| `/api/query` routes with no client caller (external API by design) | 10 of 16 |
| Routes registered twice (one unreachable) | 1 |
| Routes documented in `apiRegistry.ts` | 34 of 155 (22%) |
| Client component/util/script files with zero prod consumers | 8 |
| Dead LOC in those files | 2,748 (4.3% of 63,614) |
| Exported hooks with zero consumers | 5 (4 in `useHoldApi`, + the shadowed `useHoldProject`) |
| Duplicated export names across `client/src/hooks/` | 1 (`useHoldProject`) |
| Client socket listeners with no server emitter | 2 |
| Server socket emissions with no client listener | 4 |
| Config keys read by code but absent from template | 9 |
| Config keys in template but absent from live config | 3 |
| `shared/naming.ts` exports with zero consumers | 11 of 25 (44%) |
| `shared/types.ts` exports with zero consumers | 10 |
| Types in `shared/types.ts` missing from `shared/types.d.ts` | 60 |
| Tracked build artifacts in `shared/` | 8 |
| Branches with unmerged commits | **0 of 7** |
| Tracked bytes of screenshots/mockups | ~24.5 MB |
| Parallel-list definitions of "project stage" | 3 |

---

## 11. What to build differently

1. **Route composition needs one owner and a uniqueness assertion.** Three routers
   (`projects.ts`, `hold.ts`, `storage.ts`) mount on the same `/api/projects` prefix from three
   different lines of `index.ts`. A single registry that collects `(method, path) → handler` and
   throws on collision would have failed the build on `ba8a440`.
2. **Test the composed app, not the isolated router.** Both hold and storage suites mount their own
   router at `/api/projects`. Neither could ever see the shadow. At least one test must build the
   real app.
3. **Delete the `shared/*.js` + `*.d.ts` artifacts and let the bundler read `.ts`.** Or set
   `resolve.extensions` explicitly in `vite.config.ts`. Right now the typechecker and the bundler
   read different files and agree only by luck.
4. **A declared socket event with no producer should not typecheck.** `shared/types.ts` declares
   `file:renamed` and `file:error` in `ServerToClientEvents`; nothing emits them. The event contract
   needs producers and consumers derived from one table, not two hand-maintained sides.
5. **Supersession must include removal.** B064 (Apr 8) → StoragePanel (Apr 14) left a modal, 4
   hooks, 8 routes and a duplicate handler behind after six days. FR-148 left `ProjectStatsPopup`
   (955 LOC). B041 left `RegenToolbar` with a *copy* of the live socket wiring. The pattern is
   consistent: the replacement lands, the replaced stays.
6. **"Project stage" was never named as one thing.** Three lists in two workspaces with different
   membership. It wants to be one enum with one display map, exported once.
7. **`config.template.json` is a contract, not a sample.** Nine keys the code reads are missing from
   it; three keys it advertises are unused. Generate it from the `Config` type, or validate it in CI.
