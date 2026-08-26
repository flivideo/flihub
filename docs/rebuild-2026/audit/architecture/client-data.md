# Architecture Audit — Client data layer, hooks, and realtime

**Scope:** `client/src/hooks/**` (25 files), `client/src/utils/**` (8 files), `client/src/constants/queryKeys.ts`,
cross-checked against `server/src/**` socket emissions and route registrations.
**Date:** 2026-08-26 · **Repo state:** `main` @ `3b3b2f1`
**Audience:** the rebuild. Findings are ranked by how much they should change the next build, not by fix cost.

---

## 0. First: your socket suspicion is mostly WRONG — and *why* it was wrong is itself the finding

You suspected the client listens for `assets:incoming-changed`, `assets:assigned-changed`, `thumbs:changed`,
`thumbs:zip-added`, `inbox:changed`, `transcripts:changed`, `file:renamed` that the server never emits.

I checked both directions exhaustively. **Six of those seven ARE emitted.** They are invisible to a literal
grep because emission is *indirected through a config table*:

```ts
// server/src/WatcherManager.ts:19-27
interface WatcherConfig {
  name: string;
  pattern: string | string[];
  event: keyof ServerToClientEvents;   // <-- event name is DATA, not a call site
  ...
}

// server/src/WatcherManager.ts:62
this.io.emit(config.event);            // <-- the only emit; name comes from the table
```

The event names live at `WatcherManager.ts:114, 126, 138, 155, 169, 185, 202, 217`. So
`grep "emit('thumbs:changed'"` returns nothing while the event is emitted every time a thumb file changes.

**Architectural note:** the indirection is *type-safe* (`event: keyof ServerToClientEvents` means a typo won't
compile) but it makes the socket contract statically unreadable — you cannot answer "who emits X?" by grepping,
and neither could you. That is a real cost paid for a small amount of table-driven tidiness. In the rebuild,
either (a) keep the table but generate/assert a contract manifest from it, or (b) emit named events from named
functions and accept the repetition.

### The verified matrix (29 declared events)

| Event | Emitted at | Listened at | Verdict |
|---|---|---|---|
| `file:new` | `index.ts:123`, `index.ts:337` | `useSocket.ts:48` | OK |
| `file:deleted` | `index.ts:130` | `useSocket.ts:65` | OK |
| **`file:renamed`** | **nowhere** | `useSocket.ts:59` | **DEAD LISTENER** |
| **`file:error`** | **nowhere** | `useSocket.ts:70` | **DEAD LISTENER** |
| `thumbs:changed` | `WatcherManager.ts:217` (via `:62`) | `useSocket.ts:109` | OK |
| `thumbs:zip-added` | `WatcherManager.ts:114` | `useSocket.ts:110` | OK |
| `assets:incoming-changed` | `WatcherManager.ts:126` | `useSocket.ts:136` | OK |
| `assets:assigned-changed` | `WatcherManager.ts:138` | `useSocket.ts:137` | OK |
| `recordings:changed` | `WatcherManager.ts:155` + 9 static sites | `useSocket.ts:158`, `:309` | OK |
| `projects:changed` | `WatcherManager.ts:169`, `projects.ts:716` | `useSocket.ts:178` | OK |
| `inbox:changed` | `WatcherManager.ts:185` | `useSocket.ts:200` | OK |
| `transcripts:changed` | `WatcherManager.ts:202` | `useSocket.ts:257` | OK |
| `relay:changed` | `WatcherManager.ts:262` | `useSocket.ts:291` | OK |
| **`chapters:generating`** | `chapters.ts:178` | **nowhere** | **UNHEARD** |
| **`chapters:generated`** | `chapters.ts:189` | **nowhere** | **UNHEARD** |
| `chapters:complete` | `chapters.ts:209` | `useSocket.ts:231` | OK |
| `transcription:queued` | `transcriptions.ts:366` | `TranscriptionsPage.tsx:83` | OK |
| `transcription:started` | `transcriptions.ts:113` | `TranscriptionsPage.tsx:82` | OK |
| `transcription:progress` | `transcriptions.ts:177,186` | `TranscriptionsPage.tsx:79` | OK |
| `transcription:complete` | `transcriptions.ts:215` | `TranscriptionsPage.tsx:80` | OK |
| `transcription:error` | `transcriptions.ts:261,288` | `TranscriptionsPage.tsx:81` | OK |
| `regen:shadows:progress` | `manage.ts:259,765` | `ManagePanel:179`, `RegenToolbar:137` | OK |
| `regen:shadows:complete` | `manage.ts:298` | `ManagePanel:180`, `RegenToolbar:138` | OK |
| `regen:chapters:progress` | `manage.ts:573` | `ManagePanel:181`, `RegenToolbar:139` | OK |
| `regen:chapters:complete` | `manage.ts:633` | `ManagePanel:182`, `RegenToolbar:140` | OK |
| **`regen:all:started`** | `manage.ts:693` | **nowhere** | **UNHEARD** |
| `regen:all:progress` | `manage.ts:698,702,710` | `ManagePanel:183`, `RegenToolbar:141` | OK |
| `regen:all:complete` | `manage.ts:719` | `ManagePanel:184`, `RegenToolbar:142` | OK |
| **`regen:all:error`** | `manage.ts:728` | **nowhere** | **UNHEARD** |

**Score: 2 dead listeners, 4 unheard emissions, 23 correctly paired.** The contract is 79% honest — better than
suspected, but the 21% is not random: every failure is on an *error* or *sub-progress* path, i.e. exactly the
paths nobody drove during UAT.

`regen:all:error` being unheard is the one with a user-visible consequence:
`RegenToolbar.tsx:97-101` only clears `setIsRegenerating(false)` inside `handleAllComplete`. If
`manage.ts:728` fires instead, no handler runs and the toolbar stays stuck in the regenerating state until
remount. Same in `ManagePanel.tsx`.

---

## Finding 1 — Two live implementations of the "hold" concept, and their HTTP routes collide

This is the most consequential thing I found, and it is a client-contract failure, not a server bug.

`POST /api/projects/:code/hold` is registered **twice**:

```
server/src/routes/hold.ts:93      router.post('/:code/hold', ...)   // B064, added 2026-04-08 (ddaed6a)
server/src/routes/storage.ts:185  router.post('/:code/hold', ...)   // storage-panel WU1, added 2026-04-14 (a3db182)
```

Both routers are mounted on the same prefix, hold first:

```
server/src/index.ts:322   app.use('/api/projects', holdRoutes);
server/src/index.ts:326   app.use('/api/projects', storageRoutes);
```

Express matches in registration order and `hold.ts:93` fully handles the request (it always calls
`res.json(...)` / `res.status(...).json(...)`; it never calls `next()`). **`storage.ts:185` is unreachable.**

Meanwhile the client has **two hooks with the same name**:

```ts
// client/src/hooks/useHoldApi.ts:31   — B064
export function useHoldProject()  // mutationFn: ({code, dryRun}) => POST /api/projects/:code/hold
                                  // returns HoldOperationResult; invalidates holdStatus/projectDisk/archiveInventory

// client/src/hooks/useStorageApi.ts:76 — storage-panel
export const useHoldProject = buildMutation('hold', 'Held heavy files to T7');
                                  // mutationFn: (projectCode: string) => POST /api/projects/:code/hold
                                  // expects {success, newState}; invalidates via useInvalidateProjectStorage()
```

`client/src/components/shared/StoragePanel.tsx:27,66` imports the **storage** one. Its click therefore reaches
the **hold.ts** handler, which does a different disk operation (rsync the *whole* project to HOLDING, no local
deletion, `{dryRun}` body ignored because the client sends none) and returns a `HoldOperationResult` that has
no `newState` field. The toast reads `data.success`, which `hold.ts` does set — so the UI reports success while
the storage state machine (`tree.state`) the panel was designed around was never consulted.

The two are not variants of one concept — they are two *generations* of the same concept, six days apart,
both alive. `server/src/routes/storage.ts:185` has a whole two-pass verify-then-delete design in its comment
block that has never executed in production.

Semantic clash, same names, different meanings:

| Name | `useHoldApi` (B064) | `useStorageApi` (storage-panel) |
|---|---|---|
| "hold" | copy entire project to T7, keep local | move heavy subfolders to T7, delete local |
| status source | `GET /:code/hold/status` → `HoldStatus.location` | `GET /:code/storage-tree` → `tree.state` |
| consumer | `ProjectsPanel.tsx:127` (row badge) | `StoragePanel.tsx` |

So the Projects list badge and the Storage panel are reading **two different models of the same disk**.

**Rebuild implication:** name the domain concept once — a project has a *storage state* (`active | held |
archived | degraded`) derived from disk — and give it exactly one route family and one hook module. Do not let a
"v2 of X" ship alongside v1; the old routes must be deleted in the same wave, and route registration should
fail loudly on a duplicate method+path rather than silently shadowing.

---

## Finding 2 — The hooks layer is not a boundary: 56 raw `fetch()` calls, 19 of them inside components

Measured across `client/src`:

- `fetchApi<T>()` (the shared helper at `useApi.ts:7`) — **89** call sites
- raw `await fetch(...)` — **56** call sites in **25** files
- of those, **19** are inside `client/src/components/**`, not in hooks

Components that talk to the network directly (count of `await fetch(`):
`RecordingsView.tsx` 4, `ManagePanel.tsx` 2, `TranscriptionsPage.tsx` 2, `TranscriptSyncPanel.tsx` 2, plus
`ApiExplorer`, `ChapterPanel`, `AssetsPage`, `ConfigPanel`, `DeveloperDrawer`, `VideoTranscriptModal`,
`TranscriptModal`, `shared/RegenToolbar`, `shared/GlingEditTool` at 1 each. `client/src/utils/clipboard.ts` also
fetches.

And hooks bypass their own helper: `useRelayApi.ts` 13, `useEditApi.ts` 6, `useSyncApi.ts` 4,
`usePoemWuiApi.ts` 4, `useStorageApi.ts` 3.

This matters because `fetchApi` is where the **error contract** lives:

```ts
// client/src/hooks/useApi.ts:8-21
if (!response.ok) {
  const error = await response.json().catch(() => ({ error: 'Request failed' }));
  throw new Error(error.error || 'Request failed');   // throw-on-!ok
}
```

whereas `useStorageApi.ts:39-52` does the opposite:

```ts
// Server returns 4xx/5xx with a structured body — parse regardless.
let body: StorageMutationResponse;
try { body = await res.json(); } catch { body = { success: false, error: `HTTP ${res.status}` }; }
return body;                                            // never throws
```

So there are two incompatible error models in the same data layer: one where React Query's `isError` is the
truth, one where `data.success === false` is the truth. `RecordingsView.tsx:152-158` invents a third
(`if (!res.ok) { const err = await res.json(); throw new Error(err.error ...) }` inlined in a component).

**Rebuild implication:** one transport function, one response envelope, enforced by making it the *only* thing
that can construct a request (no `API_URL` export that components can concatenate onto). If a component needs
data, it needs a hook. That is the seam the `use*Api` split was reaching for and never closed.

---

## Finding 3 — `shared/apiRegistry.ts` is a 1000-line contract nobody enforces

`shared/apiRegistry.ts` is a hand-written catalogue of endpoints with methods, paths, parameters and example
responses. Measured:

- endpoints described in the registry: **34**
- actual `router.<verb>(` handlers in `server/src/routes/**`: **156**
- distinct `/api/...` string/template literals in `client/src`: **91**
- files importing `apiRegistry`: **1** — `client/src/components/ApiExplorer.tsx:8`

So the registry documents roughly **22%** of the surface, is consumed only by a documentation UI, and is
structurally incapable of drifting *loudly* — nothing type-checks a client call against it, nothing
type-checks a server route against it. It is a third source of truth alongside the routes themselves and the
91 client literals.

This is the same failure shape as Finding 1: a good idea (name the contract) implemented as a *parallel
artifact* instead of as *the thing itself*.

**Rebuild implication:** if you want an API registry, it must be the definition — routes registered *from* it,
client hooks generated or at minimum keyed *from* it, so an endpoint that isn't in the registry cannot exist.
Otherwise skip it entirely; a 22%-accurate catalogue is worse than none because `ApiExplorer` presents it as
authoritative.

---

## Finding 4 — Realtime is not a layer; it is 14 subscription sites with hand-written invalidation maps

The 20-hook `use*Api` split **is** deliberate and reasonable — 17 `use*Api.ts` files against 17
`server/src/routes/*.ts` files, 142 exported hooks total. That is per-domain, not per-feature sprawl. I am not
calling that a flaw.

Realtime is the opposite. There is no single subscription layer. There are:

- **11 named socket hooks** inside `useSocket.ts` (315 lines), each with a bespoke `invalidateQueries` list
- **2 near-identical inline blocks** of 6 `socket.on(...)` calls, duplicated between
  `ManagePanel.tsx:179-192` and `shared/RegenToolbar.tsx:137-152` — same six handler names
  (`handleShadowsProgress`, `handleShadowsComplete`, `handleChaptersProgress`, `handleChaptersComplete`,
  `handleAllProgress`, `handleAllComplete`) in both files
- **1 more inline block** in `TranscriptionsPage.tsx:79-83`

Worse, subscription lifetime is bound to **component mount**, and panels are conditionally rendered by tab
(`App.tsx:727,799,811,818,825,832,840,848,860` — `{activeTab === 'x' && <Panel/>}`). Where each socket hook is
mounted:

| Hook | Mounted at | Alive when? |
|---|---|---|
| `useRecordingsSocket` | `App.tsx:204` + `RecordingsView:523` + `ManagePanel:132` + `WatchPage:242` | always (×1–2 duplicated) |
| `useRelaySocket` | `App.tsx:205` | always |
| `useDeveloperSocket` | `App.tsx:207` | always |
| `useProjectsSocket` | `ProjectsPanel.tsx:548` | **only on Projects tab** |
| `useTranscriptsSocket` | `ProjectsPanel.tsx:550` | **only on Projects tab** |
| `useThumbsSocket` | `ThumbsPage.tsx:50` | **only on Thumbs tab** |
| `useAssetsSocket` | `AssetsPage.tsx:119` | **only on Assets tab** |
| `useInboxSocket` | `InboxPage.tsx:68` | **only on Inbox tab** |
| `useChapterRecordingSocket` | `RecordingsView:526` + `ChapterRecordingModal:30` | recordings/modal only |

Two consequences worth carrying into the rebuild:

1. **The invalidation is a no-op exactly when it matters.** `transcripts:changed` fires while you sit on the
   Transcriptions tab — but its only listener lives in `ProjectsPanel`, which is unmounted. Same for
   `thumbs:zip-added`, which watches your *global* `~/Downloads` folder (`WatcherManager.ts:110-115`) yet is
   only heard while the Thumbs tab is open.

2. **Nothing broke, because a second mechanism silently covers for it.** `client/src/main.tsx:7` is
   `new QueryClient()` with **no `defaultOptions`** — so `staleTime` is 0 everywhere and every query refetches
   on mount. Switching back to a tab remounts its queries and refetches. The realtime layer and the
   zero-staleTime default each hide the other's flaw. *This is the single most important thing to know before
   rebuilding: the app's freshness does not actually come from the socket layer, it comes from remounting.*

Minor but related: `useSocket.ts:77-82` cleans up with bare `socket.off('file:new')` (no handler argument) on a
module-level singleton socket, while every other hook uses `socket.off(event, handler)`. Today no other code
listens to those five events so nothing is clobbered, but the pattern is a landmine on a shared singleton.

**Rebuild implication:** one realtime provider mounted once at the root, owning every subscription for the app's
lifetime, with a single declarative `event -> queryKey[]` map that lives next to the query-key registry. Panels
subscribe to nothing.

---

## Finding 5 — Cache invalidation is hand-written per mutation, and the seam built to fix that was never adopted

`client/src/constants/queryKeys.ts` is genuinely good: 45 keys, centralised, factories for parameterised keys,
and it even carries the right lesson in a comment (`storageActivityBase` exists "so renames stay consistent").
168 `queryKey: QUERY_KEYS.*` uses vs 20 hard-coded literal-array keys that bypass the registry entirely
(`['ssd-status']`, `['edit-prep']`, `['brand-config']`, `['environment']`, `['projectState', code]`,
`['project-dictionary', code]`, `['manifest-status', folder]`, `['poem-wui-status']`,
`['project-transcripts', activeProject]`) — ~89% adoption.

But invalidation is 138 hand-written `invalidateQueries` calls across 20 files, with no map from *event* to
*affected keys*. Measured outcomes:

- **1 dead key**: `QUERY_KEYS.chapterStatus` (`queryKeys.ts:29`) is referenced nowhere outside its declaration.
- **10 keys are never invalidated by anything**: `nextImageOrder`, `prompt`, `thumbZipContents`, `transcript`,
  `combinedTranscript`, `finalMedia`, `transcriptSync`, `inboxFile`, `watchers`, `storageActivity` (exact form).
  They stay fresh only because of the zero `staleTime`. (`storageActivity` is the honourable exception — it is
  deliberately invalidated by prefix via `storageActivityBase`, with a comment saying so.)
- **`useInvalidateProjectStorage.ts` — the explicit fix — has exactly one consumer.** Its own docblock says
  "a storage mutation (Hold / Restore / Archive / Unarchive) … Calling a bespoke list in each mutation is how we
  missed an invalidation last round, so the full set lives here and every mutation's `onSuccess` calls this
  helper." Grep says only `useStorageApi.ts:60` calls it. The five hold/restore/delete mutations in
  `useHoldApi.ts:32,49,64,81,97` — which mutate the exact same bytes — each still hand-write a three-key list
  and never invalidate `storageTree` or `storageActivity`.

That is the pattern: the right abstraction was identified, written down, tested
(`client/src/test/useInvalidateProjectStorage.test.tsx`), and then applied only to the new code that motivated it.
The old call sites were never migrated, so the invariant is not an invariant.

**Rebuild implication:** invalidation should be derived, not written. Either colocate `invalidates: [...]` with
each mutation's *definition* in one registry, or let mutations declare which domain entities they touch and let
one function map entity → keys. A helper that mutations *may* call is not a seam.

---

## Finding 6 — There are no optimistic updates anywhere, and per-row queries fan out instead

Measured across `client/src`: **90** `useMutation` sites, **51** `useQuery` sites.

- `onMutate`: **0**
- `cancelQueries`: **0**
- `setQueryData`: **1** — `useProjectDiskApi.ts:21`, and that is a cache *seeding* from a bulk scan response,
  not an optimistic write with rollback.

Every mutation is fire → await round trip → `invalidateQueries` → refetch. On localhost that is defensible, but
it means the UI has no concept of "pending change", and no mutation can be rolled back, so every write path
depends on the refetch succeeding to show truth.

At the same time, reads fan out per row:

- `ProjectsPanel.tsx:127` — `HoldBadge` calls `useHoldStatus(code)` **per project row**. Each call hits
  `GET /api/projects/:code/hold/status`, which runs `getHoldStatus` (`server/src/utils/holdUtils.ts:251`),
  which performs `getDirStats` recursive walks over three relay subfolders (`holdUtils.ts:273-277`,
  walker at `holdUtils.ts:47-62`). N projects → N recursive directory walks. `staleTime: 30_000` caps it,
  but window-focus refetching (React Query default, not overridden) re-triggers the whole fan-out.
- `RecordingsView.tsx:132-147` — a per-recording `useQuery(QUERY_KEYS.transcriptionStatus(filename))` with
  `refetchInterval` up to 10 s while queued/transcribing. N recordings → N polling queries. Notably the
  `transcripts:changed` socket handler (`useSocket.ts:246-253`) invalidates `recordings`, `projects` and
  `transcriptions` but **not** `transcriptionStatus(filename)` or `transcript(filename)` — the parameterised
  keys are invisible to the hand-written invalidation map, which is why the per-row poller exists at all.

Polling census: **14** `refetchInterval` sites; **12** are unconditional (5 s, 10 s, 15 s, 30 s ×5, 60 s, 120 s).
Only `RecordingsView.tsx:142` and `useTranscriptionsApi.ts:111` gate on state. Only **6** of 51 queries set a
`staleTime` at all.

**Rebuild implication:** one query per *collection* with the row data denormalised server-side (a projects list
endpoint that already carries storage state and transcript counts), not one query per row. And set
`QueryClient` defaults explicitly — the current `new QueryClient()` is an unowned decision that the whole app
now silently depends on.

---

## Finding 7 — The app's most important state (the pending-recordings queue) lives outside the data layer entirely

Everything else in the app is server state via React Query. The queue of just-recorded, not-yet-named files —
the thing FliHub exists to manage — is not:

- Server truth: an in-memory `Map` (`server/src/index.ts:95`, `pendingFiles`), never persisted.
- Transport: push-only. `io.emit('file:new', file)` on detection (`index.ts:123`) and a replay of the whole map
  to each newly connected socket (`index.ts:335-338`).
- Client store: **React `useState`** inside `useSocket()` (`useSocket.ts:24`, `setFiles` at `:49, :60, :66`),
  mutated locally by an exported `removeFile` callback (`useSocket.ts:84-86`), consumed by `App.tsx` at
  `:183, :253, :262, :274, :284, :421, :634, :764`.
- There **is** a REST endpoint for it — `GET /api/files` (`server/src/routes/index.ts:154-158`) — and the client
  **never calls it** (0 matches for `api/files` in `client/src`).

So the pending queue has: no cache, no refetch, no reconciliation read, no query key, and a client-side
mutation path (`removeFile`) that is separate from the server-side deletes at `routes/index.ts:233, 283, 303, 330`.
The two are kept in step only by convention — each client action that removes a file happens to also call an
endpoint that removes it server-side.

I want to be precise about what this does *not* mean: I traced `createWatcher` (`server/src/watcher.ts:19-26`)
and it uses `ignoreInitial: false`, so on server restart the watch directory is rescanned and `pendingFiles` is
repopulated from disk, and `useSocket`'s dedupe-by-path (`useSocket.ts:50-52`) prevents duplicate rows. I did
not find a concrete divergence bug. The flaw is structural, not symptomatic: the single most important entity in
the app is the one entity with no query key, no server-truth reconciliation, and a bespoke state container.

**Rebuild implication:** model the pending queue as server state like everything else — `GET /api/pending` as
the source of truth with a query key, socket events as *invalidation signals only* (never as the data channel),
and no client-side mutation of the list. The general rule the rebuild should adopt: **sockets carry
"something changed", never "here is the new state."** FliHub currently does both, and only the queue does the
second.

---

## Finding 8 — Small but telling: duplicated naming logic and empty scaffolding directories

`shared/naming.ts` is a proper domain module (28 exports: validators, parsers, builders, comparators). Yet
`client/src/utils/naming.ts:4` re-implements filename construction inline:

```ts
// client/src/utils/naming.ts:4-23  (buildPreviewFilename)
name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
```

versus the canonical version:

```ts
// shared/naming.ts:327-335  (sanitizeName)
name.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9.-]/g, '')   // keeps periods
    .replace(/-+/g, '-')           // collapses runs
    .replace(/^-|-$/g, '')         // trims
    .slice(0, NAMING_RULES.name.maxLength);
```

The two disagree on periods, hyphen collapsing, trimming, and length capping. `buildPreviewFilename` is the
function that renders the filename **preview the user reads before committing a rename**. The preview and the
actual write (`shared/naming.ts:340 buildRecordingFilename`, used server-side) can therefore disagree. I did not
construct a failing input at runtime, but the divergence is visible in the source: an input like
`"Intro v1.2  — take"` sanitises differently under each.

Also noted, low weight but symptomatic of scaffolding that was planned and abandoned:
`client/src/hooks/shared/` and `client/src/utils/shared/` are both **empty directories**, and `shared/`
has compiled `.js` and `.d.ts` artifacts checked into git alongside their `.ts` sources
(`shared/constants.js`, `shared/naming.js`, `shared/paths.js`, `shared/types.js` + four `.d.ts` — all tracked
per `git ls-files shared/`), so a stale build output can shadow the source depending on resolution.

**Rebuild implication:** the shared workspace must own naming end-to-end — preview, validation and write all
call the same function — and it must ship source only, with build output gitignored.

---

## What I could not establish

- **Runtime confirmation.** Everything here is from reading source, `git log`, and grep. I did not start the
  dev server or click through the UI. Findings 1 and 4 in particular predict user-visible behaviour I inferred
  from code paths, not observed. The Finding 1 route-shadowing claim rests on Express's documented
  first-match-wins ordering plus my reading that `hold.ts:93` always terminates the request — I did not issue an
  HTTP request to prove which handler answers.
- **Whether the dead listeners / unheard emissions are intentional.** `file:renamed` and `file:error` are fully
  declared in `shared/types.ts:694-695` with typed payloads. That is consistent with "planned, never wired" and
  equally consistent with "wired once, removed server-side later." Git archaeology on those two events was not
  run.
- **Actual refetch volume.** I counted `refetchInterval` sites and `staleTime` omissions; I did not measure real
  network traffic. With N projects and N recordings unknown, "storm" is a structural prediction, not a
  measurement. A DevTools network capture on the Projects tab would settle it in 30 seconds.
- **Whether the never-invalidated keys cause stale UI.** They are covered by zero-`staleTime` remount refetching.
  Whether any of them is *visibly* stale in practice depends on whether its component ever stays mounted across
  the mutation. I did not trace all 10.
- **The `useHoldProject` collision's blast radius.** I confirmed `StoragePanel.tsx:66` uses the storage variant.
  I did not audit whether any other component imports the storage one via a path that resolves differently, nor
  whether `useApi.ts`'s barrel (which re-exports `useHoldApi` but *not* `useStorageApi` — see the six
  not-in-barrel modules) causes a name to resolve differently depending on import style. That is worth 10
  minutes before touching it.
