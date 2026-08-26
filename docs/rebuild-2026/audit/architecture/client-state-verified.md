# Adversarial verification — Client state management & component architecture

Dimension: `client-state`
Verifier role: skeptic. Default was to refute. Every number below was re-measured independently.
Repo: `/Users/davidcruwys/dev/ad/flivideo/flihub` @ `3b3b2f1` (working tree, 2026-08-26)

**Outcome: 8 findings reviewed — 8 survive, 3 with corrections, 1 with a sub-claim refuted.**

---

## Summary table

| # | Finding | Verdict | Severity (orig → mine) | Confidence |
|---|---|---|---|---|
| 1 | "Selected project" never a first-class concept; one switch path is a server no-op | **UPHELD in full** | critical → critical | certain |
| 2 | Tab switch is not a routing layer | **UPHELD** | critical → **high** | certain |
| 3 | Three competing freshness mechanisms | **UPHELD** (count corrected) | high → high | probable → **certain** |
| 4 | Server state mirrored into useState + hand-diffed | **UPHELD in full** | high → high | certain |
| 5 | Page-level domain concepts never extracted | **UPHELD, one sub-claim REFUTED** | high → high | certain |
| 6 | `shared/` is a leftovers bin, primitives missing | **UPHELD** (breakdown corrected) | high → high | certain |
| 7 | Data-access seam is advisory | **UPHELD, measurement corrected** | medium → medium | certain |
| 8 | 1,768 lines of dead components | **UPHELD** ("ship" corrected) | medium → medium | certain |

---

## 1. Selected project was never a first-class concept — UPHELD IN FULL

Every cited line says what the auditor claims. I tried hard to refute this and could not.

**The no-op is real.** `server/src/index.ts:153-192` `updateConfig()` has no `newConfig.projectDirectory` branch. It handles `watchDirectory`, `imageSourceDirectory`, `projectsRootDirectory`, `activeProject`, `shadowResolution`, `glingDictionary`, `commonNames`, relay fields, `holdingPath`, `publishedPath` — and then at :172-179 **derives** `projectDirectory` from root + active:

```
if (currentConfig.projectsRootDirectory && currentConfig.activeProject) {
  currentConfig.projectDirectory = path.join(...)
```

`grep -rn "currentConfig.projectDirectory\s*=" server/src/` returns exactly two hits, `index.ts:173` and `:178` — both derivations. Confirmed.

`server/src/routes/index.ts:119-150` destructures `projectDirectory` off the body and forwards it into the function that discards it — so the field is legal at the HTTP boundary and inert behind it.

`server/config.json:1-4` has `projectsRootDirectory` and `activeProject` set and **no** `projectDirectory` key, so the first derivation branch always fires and always recomputes the *current* path.

**Therefore** `App.tsx:318` (`updateConfig.mutateAsync({ projectDirectory: projectPath })`) and `App.tsx:162` (same payload inside `navigateToManage`) are silent no-ops that return 200 with the unchanged config — and `App.tsx:321` then fires `toast.success(\`Switched to ${...}\`)`. Meanwhile `ProjectsPanel.tsx:554-556` sends `{ activeProject: projectCode }` (works) and `ConfigPanel.tsx:590-593` sends `{ projectsRootDirectory, activeProject, ... }` (works). Three call sites, three payloads, one of them dead.

**Re-derivation count confirmed.** 15 client files call `useConfig()` (16 including the hook's own file). Four distinct fallback expressions:
- `App.tsx:311` — `config?.activeProject || config?.projectDirectory?.split(/[/\\]/).pop() || ''`
- `ManagePanel.tsx:647`, `RelayTool.tsx:62`, `SyncTool.tsx:111` — `config?.activeProject || ''`
- `InboxPage.tsx:62` — `config?.projectDirectory?.split('/').pop() || null`
- `WatchPage.tsx:245` — `config?.projectDirectory?.split('/').pop() || ''`

The last two both derive from the *stale-derived* `projectDirectory` **and** use `split('/')`, which the FR-93 comment at `App.tsx:309` explicitly says is wrong.

**Rules-of-Hooks violation confirmed.** `shared/StoragePanel.tsx:59-64` is a conditional `return`; `useHoldProject()`/`useRestoreHeld()`/`useArchiveProject()`/`useUnarchiveProject()`/`useHeldArchiveProject()` follow at :66-70 and two `useState` at :73-76. Five hooks and two state slots after a conditional return, in committed code, added as "defense-in-depth" against the very race this finding describes.

Verdict: **critical / certain**. This is the single most rebuild-relevant finding in the set.

---

## 2. Tab switch is not a routing layer — UPHELD, severity corrected to HIGH

All evidence confirmed:
- `App.tsx:76-82` `getTabFromHash()`, `:101-106` `changeTab` writes `window.location.hash`, `:109-115` hashchange listener. Only the top-level tab is addressable.
- Not in the URL: `ManagePanel.tsx:109` `activeTool` (`ActiveTool` = 6 values, declared `:91`), `ConfigPanel.tsx:309` `activeTab: ConfigTab`, `ProjectsPanel.tsx:520` `drawerCode`, and the active project.
- `grep -c "activeTab === " client/src/App.tsx` = **25**; 12 of those are page-level `{activeTab === 'x' && <Page/>}` renders (`App.tsx:727-899`) plus `:913`. Inactive tabs unmount — selection, filters, scroll and staged renames are destroyed.
- `client/package.json` has **no** router dependency (grep returns nothing).
- Fire-and-reset prop protocol confirmed twice: `App.tsx:849-855` `<ManagePanel initialTool onToolActivated>` and `App.tsx:874-880` `<ConfigPanel focusSection onFocusSectionHandled>`. The receiver needs `// eslint-disable-next-line react-hooks/exhaustive-deps` at `ManagePanel.tsx:117`.
- `navigateToManage` (`App.tsx:141-176`) is a 36-line async function with a `pendingSwitchRef` promise-dedupe (`App.tsx:132`) to express what `#/manage/storage?project=X` would.
- Extra evidence the auditor missed: `ManagePanel.tsx:94` types the prop `initialTool?: string | null`, **not** `ActiveTool` — the deep-link channel is stringly-typed while the state it feeds is a union.

**Severity corrected critical → high.** Shipping a single-user local tool without a router is a defensible starting choice, and the hash does carry the top-level tab. The architectural cost is real but it degrades ergonomics and forces the prop protocol; it does not silently produce wrong results the way #1 does.

---

## 3. Three competing freshness mechanisms — UPHELD, confidence RAISED, one count corrected

- **Correction:** `hooks/useSocket.ts` exports **10** hooks, not 11 — `useSocket` (:23) plus 9 domain hooks (`useThumbsSocket` :93, `useAssetsSocket` :120, `useRecordingsSocket` :147, `useProjectsSocket` :167, `useInboxSocket` :187, `useChapterRecordingSocket` :209, `useTranscriptsSocket` :241, `useRelaySocket` :266, `useDeveloperSocket` :297). Each hand-maps one event to a hardcoded key list.
- **17 inline `socket.on(` in components** — confirmed exactly, across 3 files: `ManagePanel.tsx`, `TranscriptionsPage.tsx`, dead `shared/RegenToolbar.tsx`.
- **14 `refetchInterval`** — confirmed exactly, 5s to 120s: `useSyncApi.ts:25` (120s), `useHoldApi.ts:14` (60s), `useRecordingsApi.ts:161` (30s), `useStorageApi.ts:36` (30s), `useRelayApi.ts:33,48,236,250` (30s) and `:264` (15s), `useEditApi.ts:90` (5s), `useTranscriptionsApi.ts:111` (5s), `TranscriptionsPage.tsx:31` (5s) and `:43` (10s), `RecordingsView.tsx:142` (fn).

**The subscriber map is the load-bearing part and it holds.** `grep -rn "useTranscriptsSocket()"` returns exactly one call site outside the hook file: `ProjectsPanel.tsx:550`. `useTranscriptsSocket` (`useSocket.ts:241-262`) invalidates `QUERY_KEYS.recordings`, `.projects` **and** `.transcriptions`. Because inactive tabs unmount (#2), standing on the Transcripts tab means `ProjectsPanel` is unmounted and `transcripts:changed` invalidates **nothing** — which is exactly why `TranscriptionsPage.tsx:31,43` carries two polls and its own inline handlers at `:79-83`.

**Double mount confirmed.** `useChapterRecordingSocket()` at `RecordingsView.tsx:526` and `ChapterRecordingModal.tsx:30`; `RecordingsView.tsx:1495` renders `<ChapterRecordingModal>` as its own child, so both are mounted simultaneously and the `toast.success` at `useSocket.ts:216-219` fires twice per completion.

**The `socket.off` caveat is stated honestly and is correct.** `useSocket.ts:73-79` calls `socket.off('connect')` etc. with no handler argument — that removes *all* listeners for those events. It is safe only because `useSocket()` has exactly one caller (`App.tsx:183`, verified by grep). Absence of a bug here and absence of a second caller look identical; the auditor said so.

**Confidence raised probable → certain.**

---

## 4. Server state mirrored into useState and hand-diffed — UPHELD IN FULL

Every number is exact:
- `ConfigPanel.tsx` is **1,594 lines**; `grep -c useState` = **45**.
- Field shadows at `:290-338` (paths, relay, machineRole, holdingPath, publishedPath, glingDictionary, commonNames, plus six `PathExistsStatus` slots at `:331-336`).
- Hydration `useEffect` at `:376-400`.
- `hasChanges` useMemo `:468-527` with an **18-entry** dependency array, including `JSON.stringify(config.commonNames || []) !== JSON.stringify(commonNames)` at **:503** exactly.
- Save at `:590-618` fans out to `updateConfig.mutateAsync` + `updateChapterConfig.mutateAsync` + `refetchSuggestedNaming()` + `refetchShadowStatus()`.
- Six unrelated domains behind one atomic Save: paths, relay/machineRole, storage (holding/published), gling dictionary, chapter recording defaults, common names — plus a whole brand-config block (`:290-306`).

**Recording cursor duplication confirmed, and it is worse than described.** `AssetsPage.tsx:75` stores `AssignmentState` under `ASSIGNMENT_STATE_STORAGE_KEY = 'assetsAssignmentState'` — a **global** key with no project scope (`:136-159`), and `:162-165` sets `initialized = true` whenever that key exists. So after the first use, switching project never re-seeds the chapter/sequence from `suggestedNaming` (`:172-184`, with the `nextSeq > 1 ? nextSeq - 1 : 1` correction at :176-177). `App.tsx:212` keeps a different `NamingState` reset on project change via the `previousProjectDir` ref (`App.tsx:209, 217-240`). Two screens, two independently-derived, independently-persisted copies of the same cursor, with different reset semantics.

Verdict: **high / certain**.

---

## 5. Page-level domain concepts never extracted — UPHELD, video-playback sub-claim REFUTED

**Chapter grouping — confirmed, 4 implementations / 3 interfaces:**
- `RecordingsView.tsx:44` `interface ChapterGroup`, `:53` `ChapterGroupWithTiming`, `:70` `groupByChapter → Map<string, ChapterGroup>`, `:105` `addCumulativeTiming`
- `ManagePanel.tsx:35` `export interface ChapterGroup`, `:51` `export function groupByChapter → ChapterGroup[]`
- `WatchPage.tsx:73` `interface ChapterGroup`, `:91` `groupByChapterWithTiming → ChapterGroup[]`
- `shared/relay/FileDrawer.tsx:25` `function ChapterGroup(...)` — a *component* squatting the same name

**Selection — confirmed, 2 live + 1 dead fork:** `RecordingsView.tsx:504` `Set<string>`, `:739 toggleSelect`, `:748 selectAllInChapter`, `:766 deselectAll`; `ManagePanel.tsx:104` `Set<string>`, `:252 selectAllInChapter`, `:263 deselectAllInChapter`; dead `shared/RegenToolbar.tsx:27` uses `selectedFiles: string[]`.

**Safe/parked filter — confirmed, 3 sites / 3 defaults / 2 persistence models:** `RecordingsView.tsx:487-488` (`showSafe=true`, `showParked=true`, not persisted); `ManagePanel.tsx:105` (`showParked=false`, not persisted); `WatchPage.tsx:222-232` (both restored from localStorage, `showSafe` defaults false, `showParked` defaults true). Three screens disagree on the default for the same domain filter.

**REFUTED — "video playback was never extracted."** It was. `client/src/hooks/useVideoPlayback.ts` (108 lines, B068) is a shared hook consumed by **both** `<video>` sites: `WatchPage.tsx:47,182` and `shared/VideoPlayerModal.tsx:8,83`. `shared/VideoControlsBar.tsx:10` shares `SPEED_PRESETS` from it, and `SPEED_STORAGE_KEY = 'flihub:watch:playbackSpeed'` (`useVideoPlayback.ts:12`) is genuinely shared across both players.

The auditor's reading of `VideoPlayerModal.tsx:15` ("must NOT use `flihub:watch:*` prefix") as "the architecture confessing" does not survive. Speed IS shared through the hook; only size/autoplay/autonext are deliberately namespaced `flihub:modal:*` (`:16-18`) — which is a reasonable product decision (a modal preview and a full watch page should plausibly remember different sizes), not a forced workaround. **This sub-claim is struck.**

Verdict: **high / certain** on chapter grouping, selection and the safe/parked filter. Video playback is a counter-example: it shows the team *could* extract a shared concept when they set out to.

---

## 6. `shared/` is a leftovers bin — UPHELD, consumer breakdown corrected

`find client/src/components/shared -type f` = **45** files; **41** are components once the three barrels (`shared/index.ts`, `shared/relay/index.ts`, `shared/storage/index.ts`) and `shared/relay/types.ts` are excluded. The auditor's 41 is right.

**Corrected breakdown.** My count (distinct consuming files, excluding own file, barrels, tests): **11** have ≥2 consumers, **26** have exactly 1, **4** have 0. The auditor reported 8 / 29 / 4. My grep is word-boundary based and so counts type-only imports, which likely explains the drift. Either way the structural claim holds: **~63% of `shared/` has exactly one caller**, not 71%.

Zero-consumer files confirmed: `PageHeader`, `RegenToolbar`, `RelayBrowser`, `SlideOutDrawer`.

**Tool bodies confirmed exactly.** `SyncTool.tsx` **623** lines, `GlingEditTool.tsx` **419**, `RelayTool.tsx` **245** — each imported only by `ManagePanel.tsx` (:24-26, rendered :641-643) plus the barrel.

**No Dialog primitive — confirmed exactly.** `grep -rn "fixed inset-0" client/src` = **15**. Backdrop values in use: `bg-black/30` ×1, `/40` ×1, `/50` ×11, `/60` ×1, `bg-opacity-50` ×1 (the `/70` hit is a WatchPage shadow badge, not a modal). Z-scale on those overlays: `z-50` ×12, `z-[100]` ×3. `role="dialog"` appears **exactly once** in the whole client (`shared/storage/StorageActions.tsx:253`); `aria-modal` **0**; `createPortal` **2** (`ImagePreviewOverlay.tsx:118`, `ThumbsPage.tsx:436`).

**Formatter divergence — confirmed exactly, with a smoking gun.** `utils/formatting.ts:7 formatFileSize` (`<1024 → "500 B"`, MB to 1dp) vs `utils/formatBytes.ts:4 formatBytes` (`<1024 → "—"`, MB rounded) vs a **third verbatim copy** at `ProjectDrawer.tsx:16`, which carries its own confession:

```
// B062: Local formatBytes — TODO: consolidate with client/src/utils/formatBytes.ts later
```

Two relative-time formatters (`utils/formatting.ts:120` "5m ago" vs `ProjectDrawer.tsx:24` "5 min ago"). `formatDate` three times (`utils/formatting.ts:163`, `InboxPage.tsx:49`, `shared/storage/StorageActivityFeed.tsx:27`). `client/src/utils/shared/` is an **empty directory**, unchanged since 2026-01-03.

Verdict: **high / certain**.

---

## 7. Data-access seam is advisory — UPHELD, but the measurement was WRONG

**The auditor's headline number is inflated.** Their grep counted `refetch()` as `fetch(`.

Re-measured (`grep -rn "fetch(" client/src/components | grep -vE "refetch|prefetch|useFetch"`):
- **19 raw `fetch(` calls across 13 component files** — not 28 across 16.
- `RecordingsView` 4, `TranscriptSyncPanel` 2, `TranscriptionsPage` 2, `ManagePanel` 2, then 1 each in `VideoTranscriptModal`, `TranscriptModal`, `shared/RegenToolbar`, `shared/GlingEditTool`, `DeveloperDrawer`, `ConfigPanel`, `ChapterPanel`, `AssetsPage`, `ApiExplorer`.
- **Three files on the auditor's list have zero raw fetch**: `PoemWuiPage.tsx` (only `refetch()` at :55), `TranscriptSyncModal.tsx` (`refetch()` at :31,39,59), `shared/StoragePanel.tsx` (`refetch()` at :100). Struck.

**Inline query keys — 20, not 23**, and the distribution changes the argument: **18 of the 20 live in hook files** (`useProjectsApi`, `usePoemWuiApi`, `useRelayApi`, `useHoldApi`, `useProjectDictionary`, `useEditApi`, `useConfigApi`), only **2** in a component (`TranscriptionsPage.tsx:36` declaring `['project-transcripts', activeProject]` and `:62` re-typing the same literal to invalidate it). So this is mostly an **incomplete registry**, not a bypassed one.

**What survives is real.** `constants/queryKeys.ts` holds **46** keys; `'ssd-status'` (`useHoldApi.ts:10`), `'edit-prep'` (`useEditApi.ts:37`, invalidated from four different files) and `'brand-config'` (`useConfigApi.ts:81`) are absent from it. `ConfigPanel.tsx:340-363` bypasses both `fetchApi` (`hooks/useApi.ts:7`) and React Query for `/api/system/path-exists`, running its own try/catch and its own `PathExistsStatus` machine instantiated six times (`:331-336`). Invalidation correctness genuinely cannot be read from one place.

Verdict: **medium / certain**, with the corrected numbers. The direction is right; "half the app routes around it" is not supported.

---

## 8. Dead components — UPHELD, "ship" corrected

Zero-reference check re-run per file (excluding own file, barrel, tests). Line counts exact:

| File | Lines | References outside itself |
|---|---|---|
| `components/ProjectStatsPopup.tsx` | 955 | **none** |
| `components/shared/RegenToolbar.tsx` | 415 | **none** (not even in the barrel) |
| `components/HoldDeleteModal.tsx` | 203 | only its own test |
| `components/shared/RelayBrowser.tsx` | 119 | **none** |
| `components/shared/SlideOutDrawer.tsx` | 61 | barrel only (`shared/index.ts:10`) |
| `components/shared/PageHeader.tsx` | 15 | barrel only (`shared/index.ts:4`) |
| **Total** | **1,768** | |

`find client/src -name "*.ts*" | xargs wc -l` = **27,989**. 1,768 / 27,989 = **6.3%**. Exact.

`shared/SelectionBadge.tsx` (30 lines) is transitively dead — its only consumer is `RegenToolbar.tsx:15,299`.

`RegenToolbar.tsx:137-142` duplicates `ManagePanel.tsx:179-184`'s six regen socket handlers verbatim (`regen:shadows:progress|complete`, `regen:chapters:progress|complete`, `regen:all:progress|complete`).

**The passing test is real.** I initially got 10 failures — that was my own harness error (running vitest from the repo root, which has no jsdom config). Run correctly from `client/` with `client/vitest.config.ts`: `10 passed`. `HoldDeleteModal` has a green 137-line test suite and is rendered by nothing.

**Correction: "ship" is not established, and is probably false.** None of these files is in the import graph, so Rollup should tree-shake them. Checked against the existing build: the minification-surviving string literal `"Help AI Fix Chapter"` (`ProjectStatsPopup.tsx:91`) returns **0 matches** in `client/dist/assets/index-DILBzix_.js`. Caveat stated plainly: that bundle is dated Apr 13 and the last commit is Apr 16, so it is stale, and this check proves tree-shaking only for that one file. **They compile under `tsc -b` and live in the repo; they do not ship.**

Verdict: **medium / certain**. The architectural point — a superseded component and a live one are indistinguishable to grep, to the test runner, and to a future session reading for context — stands untouched.

---

## What I refuted

1. **#5's video-playback sub-claim** — `useVideoPlayback.ts` (108 lines) IS shared by both `<video>` call sites, `VideoControlsBar` is shared, and `SPEED_STORAGE_KEY` is genuinely common. The `flihub:modal:*` vs `flihub:watch:*` split is deliberate namespacing, not architectural failure.
2. **#7's fetch count** — 28 calls / 16 files was produced by counting `refetch()`. Real figure: 19 calls / 13 files. `PoemWuiPage`, `TranscriptSyncModal` and `StoragePanel` have zero raw fetch.
3. **#7's inline-key framing** — 20 literals, not 23, and 18 of them sit in hook files. That is an incomplete registry, not "half the app routing around the seam."
4. **#8's "ship"** — dead components compile but are tree-shaken out of the bundle (verified for `ProjectStatsPopup` via a minification-surviving string literal; caveat: stale build, one file).
5. **#2's severity** — downgraded critical → high. No router in a single-user local tool is a defensible starting choice; the flaw is that navigation never became addressable once deep-linking arrived.
6. **#3's hook count** — 10 hooks in `useSocket.ts`, not 11.
7. **#6's consumer breakdown** — 11 / 26 / 4, not 8 / 29 / 4. ~63% single-consumer, not 71%.

## What I could not establish

- Whether the dead components ship in a **current** build (only a stale Apr-13 bundle was available, and I probed one file).
- Whether the `projectDirectory` no-op has ever produced a user-visible wrong result in practice — I confirmed the code path is dead, not that a user hit it. The `StoragePanel` "Switching project…" guard and the `pendingSwitchRef` dedupe are strong circumstantial evidence someone did.
- Whether the duplicate `useChapterRecordingSocket` mount actually double-toasts at runtime; I confirmed both hooks mount simultaneously by reading the render tree, not by running the app.
