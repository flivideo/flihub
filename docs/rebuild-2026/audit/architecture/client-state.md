# Client State Management & Component Architecture — Rebuild Audit

**Scope:** `client/src/App.tsx`, `client/src/components/**`, `client/src/hooks/**`, `client/src/utils/**`
**Repo state audited:** `main` @ `3b3b2f16008dbae3b72fa99e745b2635c9c6295c` (working tree as of 2026-08-26)
**Method:** direct file reads + `grep`/`wc` measurements. No app run, no browser, no tests executed.
**Framing:** architectural flaws that would change a rebuild — not lint, not one-line bugs.

---

## 0. The measurements first

Everything below is a count I actually ran, not an impression.

| Measurement | Value |
|---|---|
| Total client TS/TSX lines | 27,989 |
| Components > 400 lines | 14 |
| `React.createContext` / `useContext` in the entire client | **0** |
| Router library in `client/package.json` | **none** (no react-router, no tanstack-router) |
| Form library | **none** |
| Headless-UI / dialog primitive library | **none** |
| Files calling `useConfig()` to re-derive the active project | 15 |
| Distinct "switch project" mutation payload shapes | 3 |
| `useState` calls in `ConfigPanel.tsx` | 45 |
| `useState` calls in `RecordingsView.tsx` | 16 |
| Independent `groupByChapter` implementations | 4 |
| Independent chapter-selection engines (`Set<string>` + toggle + selectAll) | 2 live + 1 dead |
| Hand-rolled `fixed inset-0` modal overlays | 15 |
| Distinct modal backdrop values across those 15 | 5 (`bg-black/30`, `/40`, `/50`, `/60`, `bg-opacity-50`) |
| Files in `components/shared/**` | 41 |
| …with **≥2** distinct consumers (real reuse) | **8** |
| …with exactly **1** consumer | 29 |
| …with **0** consumers (dead) | 4 |
| Socket→cache-invalidation hooks in `hooks/useSocket.ts` | 11 |
| Inline `socket.on(...)` subscriptions inside components | 17 |
| `refetchInterval` polls | 14 |
| Raw `fetch(` calls inside `components/` (bypassing `hooks/*Api.ts`) | 28, across 16 files |
| `queryKey: [` literals written inline instead of via `QUERY_KEYS` | 23 |
| Dead component lines (zero references anywhere) | **1,768** (6.3% of client) |

---

## 1. Where does application state actually live?

Four places, and the boundaries between them were never drawn.

**1. The server's `config.json` is the global store.** The active project, the watch directory,
the tag list, the common-names list, the gling dictionary, the relay settings, the machine role —
all of it lives in one server file, is read via `GET /api/config`, and is written via
`POST /api/config` with a `Partial<Config>` body. There is no client-side notion of "current
session"; there is only "what the server file currently says."

**2. React Query is the read cache** — 25 hook files under `client/src/hooks/`, a
`QUERY_KEYS` registry at `client/src/constants/queryKeys.ts` (~45 keys).

**3. Component-local `useState` holds everything else** — selection, filters, staged edits,
modal open/closed, expanded/collapsed, form buffers. `ConfigPanel.tsx` alone has 45.

**4. `localStorage` holds UI preferences**, written directly by 7 files with no shared module and
no key convention.

**There is no fifth place, and that is the finding.** `grep -rn "createContext\|useContext"` over
the whole client returns nothing. There is no store, no context, no reducer, no state machine.
Every piece of cross-cutting state is either pushed into the server config file or re-derived
independently in each component that needs it.

---

## 2. Findings

### F1 — "The currently selected project" was never made a first-class concept, and one of its three switch paths is a silent no-op

**Severity: critical. Confidence: certain (verified in both client and server source).**

The active project is the single most load-bearing value in the app — it scopes recordings,
transcripts, assets, thumbs, inbox, relay, and storage. It is not a client concept. It is a
string on the server config object, re-derived on demand by 15 different files, with four
different fallback expressions:

```
App.tsx:311             config?.activeProject || config?.projectDirectory?.split(/[/\\]/).pop() || ''
ManagePanel.tsx:647     config?.activeProject || ''
RecordingVideoModal:26  config?.activeProject ?? null
ProjectsPanel.tsx:572   config.activeProject === projectCode   (re-derives code from a path basename)
```

Worse, "switch project" was never named as a command. It is three ad-hoc `POST /api/config`
calls with **three different payload shapes**:

```ts
// client/src/App.tsx:318  — header dropdown switcher
await updateConfig.mutateAsync({ projectDirectory: projectPath });

// client/src/App.tsx:162  — T7 storage deep-link
await updateConfig.mutateAsync({ projectDirectory: match.path });

// client/src/components/ProjectsPanel.tsx:556  — Projects table row
await updateConfig.mutateAsync({ activeProject: projectCode });

// client/src/components/ConfigPanel.tsx:593  — config form save
await updateConfig.mutateAsync({ projectsRootDirectory: …, activeProject: activeProject.trim(), … });
```

The server does not accept the first shape. `server/src/index.ts:153-180`:

```ts
function updateConfig(newConfig: Partial<Config>): Config {
  if (newConfig.watchDirectory) currentConfig.watchDirectory = newConfig.watchDirectory;
  if (newConfig.imageSourceDirectory) currentConfig.imageSourceDirectory = newConfig.imageSourceDirectory;
  if (newConfig.projectsRootDirectory !== undefined) { … }
  if (newConfig.activeProject !== undefined) { … }
  // FR-89 Part 5: Derive projectDirectory from root + active (for backward compatibility)
  if (currentConfig.projectsRootDirectory && currentConfig.activeProject) {
    currentConfig.projectDirectory = path.join(currentConfig.projectsRootDirectory, currentConfig.activeProject);
  } …
```

There is **no** `newConfig.projectDirectory` branch. `grep -rn "currentConfig.projectDirectory\s*="
server/src/` returns exactly two lines — both derivations, neither an assignment from the request
body. `POST /api/config` (`server/src/routes/index.ts:119-150`) destructures `projectDirectory`
off the body and forwards it into `updateConfig()`, where it is discarded. The current
`server/config.json` has `projectsRootDirectory` set, so the derivation branch always fires and
recomputes the *old* path.

Net effect: `App.tsx:318` sends a field the server throws away, the mutation resolves 200 OK, and
the client fires `toast.success('Switched to …')`. Same for the T7 deep-link at `App.tsx:162`,
which then flips to the Storage tab against the unchanged project.

The type system cannot catch this because the mutation is typed `Partial<Config>` — `projectDirectory`
*is* a legal `Config` field, it is just not a legal *input* field. Read model and write model were
never separated.

The codebase already knows the invariant is unenforceable and defends against it — badly.
`client/src/components/shared/StoragePanel.tsx:52-76`:

```ts
const { data: config } = useConfig();                      // 52
const { data: tree, … } = useStorageTree(projectCode);     // 53
const activeProject = config?.activeProject;               // 58
if (projectCode && activeProject && projectCode !== activeProject) {
  return (<div …>Switching project…</div>);                // 60  ← early return
}
const hold = useHoldProject();                             // 66  ← hooks AFTER a conditional return
const restore = useRestoreHeld();                          // 67
…
const [pendingAction, setPendingAction] = useState(…);     // 74
```

Five hooks and two `useState` calls sit after a conditional `return`. When the guard flips from
true to false the hook count changes between renders — the Rules of Hooks violation React throws
on. This code exists *only* because there is no atomic "switch project" operation to depend on.

**Rebuild implication.** Make the selected project an explicit client-side concept — in the URL,
in a context/store, and in every React Query key that depends on it. Give it one named command
(`switchProject(code)`), one payload, one mutation hook, and a *write* DTO that is distinct from
the *read* `Config` shape so an ignored field is a type error rather than a success toast. If the
project code is in the query keys, the "Switching project…" guard, the `pendingSwitchRef` dedupe
in `App.tsx:126-171`, and the whole class of stale-project renders disappear.

**Could not establish.** I did not run the app, so I have not observed the header dropdown failing
in the browser — the conclusion is from reading both sides of the wire. I also did not check
whether some other caller (e.g. an older client build, or a direct API user) still depends on
`projectDirectory` being writable.

---

### F2 — The tab switch is not a routing layer: the URL carries one of at least four navigation dimensions

**Severity: critical. Confidence: certain.**

`App.tsx:73-79` and `:98-112` do put the tab in `window.location.hash` and listen for
`hashchange`, so back/forward works *for the top-level tab only*. Everything else the user
navigates to is invisible:

| Navigation dimension | Where it lives | In URL? |
|---|---|---|
| Top-level tab (12 values) | `App.tsx:96` `useState<ViewTab>` + hash | yes |
| Manage sub-tool (6 values: regen / gling-edit / relay / sync / awb / storage) | `ManagePanel.tsx:101` local `useState<ActiveTool>` | **no** |
| Config sub-tab (`ConfigTab`) | `ConfigPanel.tsx:309` local `useState` | **no** |
| Projects drawer target | `ProjectsPanel.tsx:520` `drawerCode` local `useState` | **no** |
| Active project | server `config.json` | **no** |

Because there is no router, cross-page navigation was re-invented as an ad-hoc **fire-and-reset
prop protocol**, three separate times:

```ts
// App.tsx:855-860 → ManagePanel
<ManagePanel initialTool={manageTool} onToolActivated={() => setManageTool(null)} />

// App.tsx:884-887 → ConfigPanel
<ConfigPanel focusSection={configFocusSection} onFocusSectionHandled={() => setConfigFocusSection(null)} />
```

The receiving side has to consume the command and tell the parent to clear it, which fights the
dependency rules:

```ts
// ManagePanel.tsx:106-113
useEffect(() => {
  if (initialTool) { setActiveTool(initialTool as ActiveTool); onToolActivated?.(); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [initialTool]);
```

And `navigateToManage` (`App.tsx:126-171`) had to grow an async project-switch, a promise dedupe
ref, and error handling — 45 lines of hand-written navigation logic — to express what a router
would express as a URL with two params.

Compounding this: inactive tabs are **unmounted**, not hidden. `App.tsx:733-905` renders every
page as `{activeTab === 'x' && <Page/>}`. So every tab switch destroys that page's selection,
filters, staged renames, scroll position and expanded state, and re-runs its mount effects. The
only page state that survives a tab switch is whatever was manually written to `localStorage`.

**Rebuild implication.** Adopt a real router and make the URL the navigation state — including
the project code and the sub-tool (`/p/:projectCode/manage/:tool`). Deep links then need no
props, no reset callbacks, and no `pendingSwitchRef`. Decide deliberately which page state should
survive a tab switch (selection: no; filters: probably yes) and put the survivors in the URL or a
store, not in scattered `localStorage` keys.

**Could not establish.** I did not test back/forward behaviour in a browser. The hash listener at
`App.tsx:100-110` looks correct for tab-only navigation; my claim is about what the URL *omits*,
which is a static property of the code.

---

### F3 — Data freshness has three competing mechanisms, and correctness depends on which tab happens to be mounted

**Severity: high. Confidence: certain for the wiring; uncertain about the user-visible staleness.**

Three overlapping strategies coexist with no stated contract:

1. **Socket → hand-written invalidation lists.** `hooks/useSocket.ts` exports 11 hooks, each
   mapping one event name to a hardcoded list of keys, e.g. `useTranscriptsSocket` (lines 216-240)
   invalidates `recordings`, `projects`, and `transcriptions`.
2. **Inline `socket.on` inside components** — 17 subscriptions in `ManagePanel.tsx:179-184`,
   `TranscriptionsPage.tsx:79-83`, and the dead `RegenToolbar.tsx:137-142`.
3. **Polling** — 14 `refetchInterval` values ranging 5s → 120s (`useSyncApi.ts:25` 120s,
   `useHoldApi.ts:14` 60s, `useRecordingsApi.ts:161` 30s, `useEditApi.ts:90` 5s, and two more in
   `TranscriptionsPage.tsx:31,43`).

Because subscriptions are hooks, they only exist while a subscriber component is mounted — and
inactive tabs are unmounted (F2). The subscriber map:

```
useSocket             → App.tsx only          (the incoming-files list lives in this hook's useState)
useRecordingsSocket   → App, RecordingsView, ManagePanel, WatchPage   (4 simultaneous subscribers)
useThumbsSocket       → ThumbsPage only
useAssetsSocket       → AssetsPage only
useProjectsSocket     → ProjectsPanel only
useTranscriptsSocket  → ProjectsPanel only     ← note
useRelaySocket        → App.tsx only
useDeveloperSocket    → App.tsx only
useChapterRecordingSocket → RecordingsView AND ChapterRecordingModal
```

Two concrete consequences fall straight out of that table:

- `transcripts:changed` — the event that invalidates `recordings`, `projects` and `transcriptions`
  — is subscribed **only by `ProjectsPanel`** (`ProjectsPanel.tsx:550`). It is not subscribed on
  the Transcripts tab. `TranscriptionsPage` compensates with its own inline handlers and two
  polls (5s and 10s), which is why the polls exist at all.
- `useChapterRecordingSocket` is mounted twice simultaneously when the chapter-recording modal is
  open over `RecordingsView` (`RecordingsView.tsx:526` + `ChapterRecordingModal.tsx:30`). Its
  handler calls `toast.success(...)` (`useSocket.ts:205-212`), so `chapters:complete` fires two
  toasts.

There is also a module-level singleton socket (`useSocket.ts:9-18`) whose cleanup calls
`socket.off('connect')` with no handler argument (`useSocket.ts:73-79`) — removing *all* listeners
for those events, not just this component's. That is safe today only because `useSocket()` has
exactly one caller. It is a landmine, not a design.

**Rebuild implication.** Make freshness a single declared contract: server events carry the
affected resource identity, and one mapping layer (mounted once, at app root, not per-page) turns
an event into invalidations. Poll only where there is genuinely no event. Never let a page's
freshness depend on another page being open.

**Could not establish.** I did not observe stale data or duplicate toasts in a running app — the
subscriber map and the handler bodies are the evidence, and a user might never hit the window
where it matters. I also did not check whether the server emits `transcripts:changed` at all, or
how often; if it never fires, the missing subscription would look identical to a working one.

---

### F4 — Server-owned data is copied into local `useState` and diffed by hand instead of being edited through the cache

**Severity: high. Confidence: certain.**

`ConfigPanel.tsx` (1,594 lines) is the extreme case and the clearest warning. It shadows the
entire server config into ~45 individual `useState` fields (`:294-338`), hydrates them in a
`useEffect` (`:376-400`), and then computes dirtiness by **hand-writing a comparison for every
field** with an 18-entry dependency array (`:468-527`):

```ts
const hasChanges = useMemo(() => {
  if (!config) return false;
  const pathsChanged =
    collapsePath(config.watchDirectory) !== watchDirectory ||
    collapsePath(config.projectsRootDirectory || '') !== projectsRootDirectory ||
    (config.activeProject || '') !== activeProject || …
  const commonNamesChanged =
    JSON.stringify(config.commonNames || []) !== JSON.stringify(commonNames);   // :503
  return pathsChanged || relayChanged || storagePathsChanged || dictChanged
      || chapterChanged || shadowChanged || commonNamesChanged;
}, [config, watchDirectory, …18 deps…]);
```

Saving then fans out to two different mutations plus two manual refetches
(`:589-618`): `updateConfig.mutateAsync({…12 fields…})`, then
`updateChapterConfig.mutateAsync({…4 fields…})`, then `refetchSuggestedNaming()`, then
`refetchShadowStatus()`. Six unrelated domains — paths, relay, storage, gling dictionary, chapter
defaults, common names — are welded into one atomic Save button because they happen to share a
screen.

Every new config field costs: one `useState`, one hydration line, one dirty-comparison clause,
one dependency-array entry, one save-payload entry, plus JSX. Five edits in five places, none of
them checked by the compiler. That is why this file is 1,594 lines.

The same pattern in miniature: `AssetsPage.tsx:135-183` keeps its own `AssignmentState`
`{chapter, sequence, variant, label}` in `useState` + `localStorage`, seeded from `suggestedNaming`
with an ad-hoc `-1` correction; `App.tsx:210-246` keeps a *different* `NamingState`
`{chapter, sequence, name, tags, customTag}`, also seeded from `suggestedNaming`, reset on project
change via a `previousProjectDir` ref. Two parallel "where am I in the chapter/sequence" cursors,
two derivation rules, two persistence behaviours, no shared concept.

**Rebuild implication.** Never mirror server state into `useState`. Either edit optimistically
through the cache or use a form library with a schema, so dirtiness, validation and the save
payload are all derived from one declaration. Split the settings screen by domain, each with its
own save. And name the "recording cursor" (chapter + sequence + label) once, own it in one place,
and have both the incoming-file namer and the asset assigner read it.

**Could not establish.** I did not verify that the two cursors actually diverge in practice — the
`-1` adjustment at `AssetsPage.tsx:174-181` may make them agree in the common case. I verified
only that they are independently stored and independently derived.

---

### F5 — Page-level domain concepts were never extracted; each page reinvented them

**Severity: high. Confidence: certain.**

The pages were built one after another and each one re-implemented the same domain vocabulary
locally.

**Chapter grouping — 4 implementations:**

| File | Symbol | Returns |
|---|---|---|
| `RecordingsView.tsx:70` | `groupByChapter` | `Map<string, ChapterGroup>` |
| `RecordingsView.tsx:105` | `addCumulativeTiming` | `ChapterGroupWithTiming[]` |
| `ManagePanel.tsx:51` | `groupByChapter` (exported) | `ChapterGroup[]` |
| `WatchPage.tsx:91` | `groupByChapterWithTiming` | `ChapterGroup[]` |
| `shared/relay/FileDrawer.tsx:25` | `ChapterGroup` (a *component* with the same name) | JSX |

Three different `ChapterGroup` interfaces (`RecordingsView.tsx:44`, `ManagePanel.tsx:35`,
`WatchPage.tsx:73`) describe the same domain object. "A chapter" is the central abstraction of
this app and it has no single definition.

**Selection — 2 live engines + 1 dead:**
`RecordingsView.tsx:504,739-766` and `ManagePanel.tsx:104,225-273` each implement
`Set<string>` + `toggleSelect` + `selectAllInChapter` + `deselectAll` independently. The dead
`shared/RegenToolbar.tsx` is a third fork of the same idea (it takes `selectedFiles: string[]`
instead of a Set).

**The safe/parked filter — 3 copies, 3 different defaults, 2 different persistence models:**

```
RecordingsView.tsx:487-488   showSafe = true,  showParked = true    (not persisted)
ManagePanel.tsx:105          showParked = false                     (not persisted)
WatchPage.tsx:222-232        showSafe, showParked  ← restored from localStorage
```

Toggle "hide parked" on Watch, go to Recordings, and it is back on — by design of nobody.

**Video playback — 2 players.** `WatchPage.tsx:640` and `shared/VideoPlayerModal.tsx:204` each own
a `<video>`. There *is* a shared `hooks/useVideoPlayback.ts`, but the preference keys deliberately
fork; `VideoPlayerModal.tsx:15` says so out loud:

```ts
// B069: localStorage keys for modal-specific preferences (must NOT use flihub:watch:* prefix)
```

That comment is the architecture confessing: two players that should share a preference model were
forced apart because there was no preference model to share.

**Rebuild implication.** Name the domain objects once, in the `shared/` workspace or a client
`domain/` module: `Chapter`, `ChapterGroup`, `RecordingFilter`, `Selection`. Build selection and
filtering as headless hooks (`useSelection(items)`, `useRecordingFilter()`), so a new page inherits
them instead of forking them. Have exactly one video-playback model with one preference namespace.

**Could not establish.** I compared the grouping functions' signatures and read
`RecordingsView.tsx:70-122`, `ManagePanel.tsx:51-77` and `WatchPage.tsx:91-130`; I did not
line-by-line diff them for behavioural equivalence, so I cannot say whether the four
implementations agree on edge cases (missing chapter, sequence ties) — only that they are separate
code with separate types.

---

### F6 — `components/shared/` is a leftovers bin, not a design system

**Severity: high. Confidence: certain.**

41 files live under `components/shared/**`. Counting distinct consuming files (excluding the
component's own file, tests, and the `index.ts` barrel):

| Consumers | Count | Which |
|---|---|---|
| ≥2 (real reuse) | **8** | `OpenFolderButton` (7), `LoadingSpinner` (6), `ErrorMessage` (5), `VideoPlayerModal` (4), `VideoControlsBar` (2), `RelayIndicator` (2), `KanbanLane` (2), `FileViewerModal` (2) |
| exactly 1 | 29 | `SyncTool`, `RelayTool`, `GlingEditTool`, `StoragePanel`, `BatchToolbar`, `EditableFileRow`, `PreviewPanel`, `ToolsSidebar`, … |
| 0 (dead) | 4 | `SlideOutDrawer`, `PageHeader`, `RelayBrowser`, `RegenToolbar` |

So 71% of "shared" has exactly one caller. `SyncTool` (623 lines), `GlingEditTool` (419) and
`RelayTool` (245) are ManagePanel's tool bodies that were moved into `shared/` and are used
nowhere else. `shared/` is where files went when a page got too big — a location, not a contract.

**The real primitives are the ones that are missing.** There is no `Dialog`. There are 15
hand-rolled overlays:

```
ClipboardPasteModal:45  bg-black bg-opacity-50 … z-50
VideoTranscriptModal:83 bg-black/50 … z-50
TranscriptSyncModal:97  bg-black/50 … z-[100]
ChapterRecordingModal:93 bg-black/50 … z-50
ProjectDrawer:482       bg-black/40 … z-50
DiscardModal:9          bg-black/50 … z-50
ProjectStatsPopup:83,164 bg-black/50 … z-[100]
ProjectDeleteModal:68   bg-black/50 … z-50
shared/VideoPlayerModal:168 bg-black/60 … z-50
shared/FileViewerModal:59 bg-black/50 … z-50
ThumbsPage:337          bg-black/50 … z-50
shared/SyncTool:317     bg-black/30 … z-50
HoldDeleteModal:99      bg-black/50 … z-50
shared/ConfirmationModal:70 bg-black/50 … z-50
```

Five backdrop values, two z-index scales (`z-50` vs `z-[100]`), 12 files independently handling
`Escape`, and exactly **one** `role="dialog"` in the whole client
(`shared/storage/StorageActions.tsx:253`) and **zero** `aria-modal`. Only two files use
`createPortal` (`ImagePreviewOverlay.tsx:118`, `ThumbsPage.tsx:436`), so the other 13 render
inside whatever stacking context their parent happens to have — which is why the z-index escalation
to `z-[100]` exists.

**Formatting is forked too.** Three byte formatters that disagree:

```ts
utils/formatting.ts:7   formatFileSize   500 → "500 B"   5_242_880 → "5.0 MB"
utils/formatBytes.ts:4  formatBytes      500 → "—"       5_242_880 → "5 MB"
ProjectDrawer.tsx:16    formatBytes      500 → "—"       5_242_880 → "5 MB"   ← third copy, inline
```

And two relative-time formatters that disagree: `utils/formatting.ts:120` renders `"5m ago"`;
`ProjectDrawer.tsx:24` renders `"5 min ago"`. `formatDate` exists three times
(`utils/formatting.ts:163`, `InboxPage.tsx:49`, `shared/storage/StorageActivityFeed.tsx:27`).
The same file size renders differently depending on which screen you are looking at.

`utils/shared/` is an empty directory.

**Rebuild implication.** Build the primitive layer *first* and make it small and mandatory:
`Dialog` (portal + focus trap + Escape + one backdrop token + one z-scale), `Table`, `Toolbar`,
`Badge`, plus one formatting module that owns every unit the domain has (bytes, duration, relative
time, chapter title). Then keep `shared/` for things with ≥2 consumers and give single-consumer
extractions a home next to their consumer (`components/manage/SyncTool.tsx`), so "shared" keeps
meaning something.

**Could not establish.** The consumer counts are JSX-usage based (`grep -F "<Name"`). A component
consumed only through a non-JSX reference (a render-prop, a lookup table) would undercount; I
spot-checked the four zero-consumer files by full-text grep and confirmed them, but did not
spot-check all 29 single-consumer files.

---

### F7 — The data-access seam exists but is advisory, so half the app routes around it

**Severity: medium-high. Confidence: certain.**

There is a real attempt at a data layer: 25 files under `hooks/`, a `QUERY_KEYS` registry, a
`fetchApi` helper. Nothing enforces it.

- **28 raw `fetch(` calls in 16 component files** — `ConfigPanel`, `AssetsPage`, `ManagePanel`,
  `RecordingsView`, `TranscriptionsPage`, `TranscriptSyncPanel`, `TranscriptModal`,
  `VideoTranscriptModal`, `TranscriptSyncModal`, `ChapterPanel`, `PoemWuiPage`, `ApiExplorer`,
  `DeveloperDrawer`, `shared/StoragePanel`, `shared/GlingEditTool`, `shared/RegenToolbar`.
  Example: `ConfigPanel.tsx:355-360` calls `/api/system/path-exists` directly, with its own
  `try/catch` and its own `PathExistsStatus` state machine, six times over (`:331-336`).
- **23 inline `queryKey` literals** that bypass the registry. `TranscriptionsPage.tsx:36` declares
  `['project-transcripts', activeProject]` — a key no other file can invalidate without
  duplicating the literal, which `TranscriptionsPage.tsx:62` promptly does. `useHoldApi.ts:10`
  uses `['ssd-status']`, absent from `QUERY_KEYS` entirely.
- Consequently, **invalidation correctness is not readable from one place.** Whether a mutation
  refreshes the right screens can only be checked by grepping every literal.

The `StoragePanel` hooks-after-return problem (see F1) is the same category: no lint gate caught
a Rules-of-Hooks violation in committed code.

**Rebuild implication.** One transport module, one key factory, and a lint rule that forbids
`fetch(` and inline `queryKey` array literals outside it. Derive keys from a resource description
(`keys.recordings(projectCode)`) so an invalidation is a call, never a copied literal. Turn on
`react-hooks/rules-of-hooks` as an error in CI.

**Could not establish.** I did not check whether an ESLint config exists or what it enables — the
`// eslint-disable-next-line react-hooks/exhaustive-deps` comments (`ManagePanel.tsx:112`,
`RecordingsView.tsx:481`) prove the plugin is configured, but not whether it runs in CI or blocks
a commit.

---

### F8 — 1,768 lines of dead client components still compile, ship, and carry tests

**Severity: medium. Confidence: certain.**

Components with **zero** references anywhere in the client (excluding their own file and the
`shared/index.ts` barrel):

| Component | Lines | Note |
|---|---|---|
| `components/ProjectStatsPopup.tsx` | 955 | Only reference is its own `export function` line |
| `components/shared/RegenToolbar.tsx` | 415 | Not even exported from `shared/index.ts`; duplicates `ManagePanel.tsx:179-184`'s six regen socket handlers verbatim |
| `components/HoldDeleteModal.tsx` | 203 | **Has a passing test** at `components/__tests__/HoldDeleteModal.test.tsx` (137 lines) but is rendered by nothing |
| `components/shared/RelayBrowser.tsx` | 119 | — |
| `components/shared/SlideOutDrawer.tsx` | 61 | Exported from the barrel, imported by nobody |
| `components/shared/PageHeader.tsx` | 15 | Exported from the barrel, imported by nobody |
| **Total** | **1,768** | 6.3% of the 27,989-line client |

`shared/SelectionBadge.tsx` (30 lines) is transitively dead — its only consumer is the dead
`RegenToolbar`.

This is not tidiness. `ProjectStatsPopup` is 955 lines of a *project detail view* — the same job
`ProjectDrawer.tsx` (536 lines) actually does. `RegenToolbar` is a fork of ManagePanel's regen
tool. `HoldDeleteModal` has a test, which means it passed review as working code and was then
never wired up. The rebuild will be tempted to read these files as reference implementations of
features that were in fact abandoned mid-flight, and a test suite that goes green on unreachable
code trains the wrong instinct about what "covered" means.

**Rebuild implication.** Run dead-code detection (`knip` / `ts-prune`) in CI from day one and fail
on unreferenced exports. When a component is superseded, delete it in the same commit that lands
the replacement — a superseded component and a working one look identical to `grep`, to the test
runner, and to a future session reading for context.

**Could not establish.** Dead-ness was determined by text search for the component name across
`*.ts`/`*.tsx` under `client/src`. A component reached only via a dynamic string (`React.lazy`
with a computed path, a name in a config map) would be miscounted as dead. I found no dynamic
import machinery in this client, but I did not exhaustively prove its absence.

---

## 3. What was *not* wrong

Worth recording so the rebuild does not throw away the good parts:

- **React Query was the right call.** The caching, invalidation and polling substrate is sound;
  the problem is only that it is not the *sole* substrate.
- **Hash-based tab persistence** (`App.tsx:73-112`) already gets deep-linking half-right and
  proves the need for a router rather than arguing against one.
- **`hooks/useVideoPlayback.ts` and `utils/projectFilters.ts`** are genuine extractions with tests
  (`utils/__tests__/projectFilters.test.ts`, 320 lines) — evidence that the extraction instinct
  exists and just needs to be applied before a page reaches 1,000 lines, not after.
- **`constants/queryKeys.ts` and `constants/stages.ts`** are the right shape. They are just
  incomplete (23 keys escaped the registry).

---

## 4. Ranked rebuild order

1. **Router + project in the URL** (fixes F1, F2, and half of F3's mounting problem).
2. **A single freshness contract** — one event→invalidation map, mounted at root (F3).
3. **Primitive layer before pages** — `Dialog`, `Table`, `Toolbar`, one formatting module (F6).
4. **Name the domain** — `Chapter`, `ChapterGroup`, `Selection`, `RecordingFilter`, `RecordingCursor` — in `shared/` (F5, F4).
5. **Enforced data-access seam** — one transport, one key factory, lint gates (F7).
6. **Dead-code gate in CI from commit one** (F8).

---

*Audited without running the application. Every file:line above was read directly. Claims about
runtime behaviour (F1's silent no-op, F3's duplicate toasts and stale caches) are derived from
source on both sides of the wire and are marked as such — they have not been observed in a
browser.*
