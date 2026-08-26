# FliHub — Product Surface Inventory

**Audit date:** 2026-08-26 · **HEAD:** `3b3b2f1` (2026-04-16) · **Scope:** `client/src` UI surfaces
**Purpose:** rebuild-2026 — what does this app actually DO, screen by screen, and what would we build differently.

Every claim below cites a file:line or commit SHA that was read. Uncertainty is marked explicitly.

---

## 0. Headline

FliHub is **9 visible tabs + 3 hidden tabs + 6 sub-tools + 5 slide-outs**, all hung off a single 922-line
`App.tsx` that holds routing, naming state, project switching, undo, clipboard, and header chrome at once.
The last four months of commits went almost entirely into **two** areas — Projects/Storage (`ProjectsPanel`,
`StoragePanel`, `ConfigPanel`) and video playback (`WatchPage`, `VideoPlayerModal`) — while six components
totalling **~1,770 LOC are wired to nothing at all**, including a 955-line `ProjectStatsPopup` superseded by a
drawer in March and never deleted.

**Keyboard control barely exists.** The complete shipped set is Escape, Enter, Space, Shift, ArrowLeft/Right —
17 handler sites, every one of them local to a modal or a text input. There is **no global shortcut, no tab
navigation key, no j/k list movement, no command palette** anywhere in the app. (Verified by exhaustive grep,
§4.)

---

## 1. Tab surfaces

`ViewTab` union — `client/src/App.tsx:43-55`. `VALID_TABS` at `:57-70`. Routing is a URL-hash string
(`getTabFromHash`, `App.tsx:75-81`); no router library.

**Only 9 of the 12 tabs appear in the nav bar** (`App.tsx:604-707`). `config`, `mockups`, `api-explorer` are
reachable only from the gear-icon `HeaderDropdown` (`App.tsx:573-599`) or by typing the hash.

| # | Tab id | Nav label | Component | LOC | Last commit | State |
|---|--------|-----------|-----------|-----|-------------|-------|
| 1 | `incoming` | Incoming | inline in `App.tsx:733-796` + `NamingControls` + `FileCard` | 922/326/181 | 2026-03-24 `fb99b1b` | **CORE** |
| 2 | `recordings` | Recordings | `RecordingsView.tsx` | 1537 | 2026-04-14 `8f29c31` | **CORE** |
| 3 | `watch` | Watch | `WatchPage.tsx` | 1060 | 2026-04-14 `8f29c31` | **CORE** |
| 4 | `transcriptions` | Transcripts | `TranscriptionsPage.tsx` | 262 | 2026-03-24 `fb99b1b` | SECONDARY |
| 5 | `inbox` | Inbox | `InboxPage.tsx` | 288 | 2026-03-24 `fb99b1b` | SECONDARY |
| 6 | `assets` | Assets | `AssetsPage.tsx` | 1462 | 2026-03-24 `fb99b1b` | SECONDARY |
| 7 | `thumbs` | Thumbs | `ThumbsPage.tsx` | 459 | 2026-03-24 `fb99b1b` | SECONDARY |
| 8 | `export` | **Manage** | `ManagePanel.tsx` | 677 | 2026-04-14 `ba8a440` | **CORE** |
| 9 | `projects` | Projects | `ProjectsPanel.tsx` | 1034 | 2026-04-14 `ba8a440` | **CORE** |
| 10 | `config` | *(gear menu)* | `ConfigPanel.tsx` | 1594 | 2026-04-16 `3b3b2f1` | **CORE (config)** |
| 11 | `mockups` | *(gear menu)* | `MockupsPage.tsx` | 379 | 2026-03-26 `6e90d9c` | **DEV SCAFFOLDING** |
| 12 | `api-explorer` | *(gear menu)* | `ApiExplorer.tsx` | 509 | 2026-03-25 `fcb1ba2` | **DEV SCAFFOLDING, stale** |

> **Name drift, three ways.** Tab id `export` → nav label `Manage` → component `ManagePanel` → heading
> `toolHeadings[activeTool]`. `App.tsx:107` comments *"FR-141: S3StagingPage removed — consolidated into
> ExportS3Tool"*, `ManagePanel.tsx:1` says *"FR-131: Manage Panel (formerly Export Panel)"*. The URL still says
> `#export`. Three renames landed in the label but never in the identifier.

---

### 1.1 Incoming — CORE

**For:** the moment a recording lands. Watch folder → name it → it becomes a project recording.
**Lives in `App.tsx` itself**, not a page component (`App.tsx:733-796`).

**Can do:** set chapter / sequence / name / tags / one-off custom tag (`NamingControls.tsx`); New Chapter
(`App.tsx:384-410`, computes next chapter from highest recorded); rename a file via `FileCard`; preview the
video (`FileCard.tsx:178` → `IncomingVideoModal`); Discard All (`App.tsx:264-268`); after a rename, a
`DiscardModal` offers to bin the remaining takes (`App.tsx:225-244`); undo a recent rename from
`RecentlyNamedStrip` (`App.tsx:788`); best/good take ranking badges (`useBestTake`, `App.tsx:414`).

**State needed:** `namingState` (5 fields, held in `App.tsx:195`), socket `files` list, `suggestedNaming`,
`recordings` (for New Chapter maths), `recentRenames`, `config`.

**Note:** a floating `ChapterContextPanel` is pinned at `fixed left-[calc(50%+29rem)] top-32`
(`App.tsx:915-919`) — a hard-coded offset derived from the `max-w-4xl` container. It exists only on this tab.

---

### 1.2 Recordings — CORE (the densest screen in the app)

`RecordingsView.tsx`, 1537 LOC, 25 commits, most recent 2026-04-14.

**Can do:** per-chapter grouping with separators; inline rename / renumber via `EditableFileRow`; chapter split
via `SplitMarker` (`:1372`); batch select + `BatchToolbar` (rename, move to chapter, add/remove tags, preview
changes before apply); Park / Unpark / Safe / Restore (all + per-file); Transcribe all; generate chapter
preview recordings (`ChapterRecordingModal`); view transcript (`TranscriptModal`); view combined video
transcript (`VideoTranscriptModal`); play a recording with prev/next paging (`RecordingVideoModal` → shared
`VideoPlayerModal`, `:1500-1519`); undo a batch operation (`UndoToast`, 30s window, `:1528`).

**Three hover-only slide-out tabs** stacked down the right edge (`:1420`, `:1443`, `:1464`):
`Chapters (n)` / `Help` / `DAM`. Each is `position: fixed` with a hand-placed vertical offset — `top-32`,
`top-80`, and literally `style={{ top: 'calc(20rem + 8rem)' }}`. Nothing but hover reveals them; there is no
click affordance and no keyboard route.

---

### 1.3 Watch — CORE

`WatchPage.tsx`, 1060 LOC. Full-width player with speed control, size toggle (localStorage), autoplay/autonext
toggles, show-safe / show-parked toggles, park-with-note editing, and SRT-driven transcript highlighting
(`TranscriptSyncPanel`, word/phrase modes, click-to-seek).

**Cascading hover panels** (`:846-870`): hover the right edge → Chapters panel slides out; hover a chapter →
Segments panel slides out further left. The container is a `fixed … w-[544px]` box whose width is a comment-
documented sum: *"FR-111: Width must include both panels (72+64=136 units = 544px)"*. A `lockCurrentChapter`
on mouse-enter (`:864`) exists purely to stop the segment panel flickering as the mouse crosses other rows.
This is the most elaborate pure-hover interaction in the app and it has **zero keyboard equivalent**.

---

### 1.4 Transcripts — SECONDARY

`TranscriptionsPage.tsx` (262 LOC). Shows ACTIVE job with streaming text, QUEUE, RECENT, and PROJECT
TRANSCRIPTS list; click View → `TranscriptModal`. Polls every 5s / 10s **in addition to** socket events
(`:30`, `:41` — `refetchInterval` alongside `getSocket()` listeners). Belt-and-braces, or the sockets weren't
trusted; worth asking.

Renders `TranscriptionProgressBar` (`:105`). That component returns `null` unless it can match the active
project by **exact string equality on the directory path** (`TranscriptionProgressBar.tsx:16-26`, comparing
`config.projectDirectory` to `p.path` and `p.path + '/'`). If the match fails, the whole progress bar silently
vanishes — indistinguishable from "no data".

---

### 1.5 Inbox — SECONDARY

`InboxPage.tsx` (288 LOC). Lists `inbox/raw`, `inbox/dataset`, `inbox/presentation` with file counts and
sizes; click a viewable file (10 extensions, `:19-31`) → `FileViewerModal`; HTML files get an "open in
browser" button. Read-only — no way to add anything to the inbox from the UI.

---

### 1.6 Assets — SECONDARY (large, but untouched since the theme pass)

`AssetsPage.tsx` (1462 LOC), last real change 2026-03-24 in the Warm Linen theme commit `fb99b1b`.

**Can do:** browse incoming images from the configured source dir; assignment controls (chapter / sequence /
image# / variant a-b-c / label, with auto-calculated ordering); assign, duplicate, delete; save/load/delete a
prompt paired to each image; paste an image from the clipboard (`ClipboardPasteModal`); "Grab Transcript";
thumbnail size S/M/L/XL persisted to localStorage; **Shift+hover** to preview an image or a full prompt
(`useShiftHover` → `ImagePreviewOverlay`).

Shift+hover is the only modifier-key interaction in the app and it exists on exactly this one page.

---

### 1.7 Thumbs — SECONDARY

`ThumbsPage.tsx` (459 LOC). Scans Downloads for ZIPs, previews ZIP contents, imports selected images as
YouTube thumbnails, drag-to-reorder, delete thumb / delete ZIP, S/M/L/XL sizing, portal-rendered lightbox
(`:436`).

---

### 1.8 Manage (`#export`) — CORE, and the app's second router

`ManagePanel.tsx` (677 LOC). A **six-way tool switch inside a tab**, with its own sidebar
(`ToolsSidebar.tsx`) pinned at `fixed left-8 top-32 bottom-8 w-[200px] z-30` (`ManagePanel.tsx:650`).

| Tool | Component | LOC | Purpose |
|------|-----------|-----|---------|
| `regen` (default) | inline in `ManagePanel` | — | Regen shadows / transcripts / all; delete transcripts / shadows; chapter-grouped multi-select file list |
| `gling-edit` | `GlingEditTool.tsx` | 419 | Gling export prep, edit folders, dictionary, copy paths |
| `awb` | `PoemWuiPage.tsx` | 234 | Send transcript + SRT + brand config to AWB / YouTube Launch Optimizer |
| `relay` | `RelayTool.tsx` | 245 (+ 7 files in `shared/relay/`) | Kanban lanes, push/collect with editor machines, file drawers |
| `sync` | `SyncTool.tsx` | 623 | Two-channel git sync (App Code / Video Project), conflict "keep mine / keep theirs" |
| `storage` | `StoragePanel.tsx` | 255 (+ 4 in `shared/storage/`) | Hold heavy files to T7 SSD / archive / restore / unarchive |

**Second-router smell:** `ManagePanel` accepts `initialTool` and mirrors it into local state via a `useEffect`
with `eslint-disable react-hooks/exhaustive-deps` (`:110-116`), and `App.tsx` has to do a `navigateToManage()`
dance (`:135-176`) that awaits a config mutation, dedupes in-flight switches with a `pendingSwitchRef`, and
then flips the tab. Tool identity lives in three places at once: URL hash (`#export` only — the tool is **not**
in the URL), `App.manageTool`, and `ManagePanel.activeTool`. **You cannot link to a specific tool.**

Also: `handleToolClick` toggles back to `regen` when you click the already-active tool (`:562`) — clicking
"Sync" twice silently dumps you on the Regen file list.

`ToolsSidebar.tsx:1` opens with `// TODO: Gate sidebar tools by machineRole in a future wave` — the
creator/editor split described in `CLAUDE.md` was never applied to the UI.

---

### 1.9 Projects — CORE

`ProjectsPanel.tsx` (1034 LOC) + `ProjectListToolbar.tsx` (142) + `ProjectDrawer.tsx` (536). Ships FR-148's
"Table + Drawer" mockup. It is the only tab that breaks the `max-w-4xl` layout (`App.tsx:730`) and the only one
that hides the footer (`App.tsx:900`).

**Table columns** (`:740-760`): star, Code, Name, Stage, Files, Trans%, Final, Relay, Modified — plus 8
optional disk columns behind a toggle (REC / TRASH / SHADOWS / OTHER / R-REC / R-1ST / R-2ND / TOTAL) with a
sticky totals row (`:763`, `:928`).

**Toolbar:** free-text filter, 9 stage pills, 5 saved presets — All / Needs Attention / Dead / Ready to Edit /
Launch Optimise (`ProjectListToolbar.tsx:4-30`).

**Row actions:** click row → open `ProjectDrawer`; click star → cycle priority; click stage → stage picker
(`:813`, `:824`); copy transcript; T7 badge → deep-link into the Storage tool for that project.

**Drawer:** Health Assessment, Progress Checklist, Stats, Disk Usage (calculate on demand), Relay paths, Quick
Actions (Open in Finder × 4), Danger Zone (Delete Trash Files, Delete Project → `ProjectDeleteModal`).

**Stage vocabulary drift:** `constants/stages.ts` defines 10 stages but `STAGE_ORDER` ships 9 — `review` was
dropped from the pill row and kept in `STAGE_DISPLAY` "for backward compat" (`stages.ts:68`). So a project can
be in a stage that no filter pill can select.

---

### 1.10 Configuration — CORE (hidden behind the gear)

`ConfigPanel.tsx` — **1594 LOC, the largest file in the client**, 18 commits, the most recently touched file in
the repo (`3b3b2f1`, 2026-04-16).

Five tabs (`:223`, default `names` at `:309`): `directories` · `names` · `collaboration` · `advanced` ·
`brand`. Includes cross-platform path validation with quote-stripping (`:27-49`), live path-existence checking
(`PathExistsStatus`, `:25`), watcher status, environment info, shadow generation, chapter-recording defaults,
and brand-config editing.

This is a settings screen that grew into an admin console.

---

### 1.11 Mockups — DEV SCAFFOLDING, shipped

`MockupsPage.tsx` (379 LOC). A **hard-coded array of links** to static HTML files: 3 Mochaccino feature
mockups, 4 "round 1 survivor" project-list designs, 4 "round 2 refined" designs, 4 legacy design-system
explorations (`:11-84`). Targets verified present at `client/public/mochaccino/designs/` (13 dirs) and
`client/public/mocks/` (4 dirs) — so the links work, but the list is maintained by hand and
`client/public/mochaccino/designs/` already contains `chapter-separator` and `sync-hub-v2`, **neither of which
appears in the page**.

Tell that it never became product: the whole file is written in raw inline styles with hex literals
(`#1e293b`, `#f1f5f9`, `#3b82f6` — `:96`, `:139`, `:104`) and **never received the Warm Linen token pass**
that every other component got in `fb99b1b`.

**Verdict: developer scaffolding shipped in the product.** It documents design history, not app function.

---

### 1.12 API Explorer — DEV SCAFFOLDING, and stale

`ApiExplorer.tsx` (509 LOC). A Postman-lite: pick an endpoint from a registry, fill parameters, fire the
request, copy the curl. Auto-fills `code`/`projectCode` from the active project (`:56-58`).

It reads `shared/apiRegistry.ts`. **That registry has 3 commits total and was last touched 2026-02-13**
(`14ff7c5`) — over six months before HEAD.

| | count |
|---|---|
| Endpoints documented in `apiRegistry.ts` | **~35** (39 `path:` literals, 4 of which are example values like `'/path/to/project'`) |
| `router.<verb>(...)` definitions across `server/src/routes/*.ts` | **141** |

Whole route families are absent from the registry: `/api/relay` (13), `/api/manage` (13), `/api/hold` (10),
`/api/thumbs` (8), `/api/storage` (7), `/api/poem-wui` (7), `/api/sync` (4), `/api/chapters` (4), `/api/video`
(3), `/api/shadows` (3), `/api/edit` (3), `/api/developer` (3). The Explorer shows a **February view of the
API** and nothing tells you so.

**Verdict: dev scaffolding, and actively misleading.** A hand-maintained doc with no drift check.

---

## 2. Non-tab surfaces

| Surface | Invoked from | State |
|---|---|---|
| **Developer Drawer** | gear menu → "Developer Tools" (`App.tsx:594`) | SECONDARY. Monaco editor over 3 files: `.flihub-state.json`, `config.json`, `telemetry.jsonl`. Resizable 300–1000px, width in localStorage. Escape closes. Comment at `DeveloperDrawer.tsx:8`: *"Tab-based navigation (not tree - tree sucks)"*. |
| **Project switcher dropdown** | project code in header (`App.tsx:459`) | CORE. Lists **pinned projects only**, then "All projects…" |
| **Project actions `···`** | header (`App.tsx:472`) | Copy for calendar · Copy full path · Open in Finder |
| **Gear menu** | header (`App.tsx:539`) | Configuration · Mockups · API Explorer · Developer Tools · GitHub · Video Projects |
| **Header status pills** | always visible (`App.tsx:521-533`) | `SyncIndicator` (2 pills) · `RelayIndicator` · `SsdIndicator` (T7) — each click deep-links to a Manage tool |
| **Toast layer** | `sonner` `<Toaster position="top-right" richColors />` (`App.tsx:425`) | The app's only global feedback channel |

---

## 3. Modal inventory — 13 `*Modal.tsx` files, plus 8 modal-shaped things that aren't

### The 13 modals

| Modal | LOC | Invoked from | Notes |
|---|---|---|---|
| `VideoPlayerModal` | 272 | `RecordingVideoModal:49`, `IncomingVideoModal:42`, `RecentlyNamedStrip:86`, `relay/FileDrawer:169` | The one genuinely shared modal. Hosts `VideoControlsBar` + `TranscriptSyncPanel` + `DictionaryQuickAdd` |
| `RecordingVideoModal` | — | `RecordingsView:1500` | Thin wrapper over `VideoPlayerModal` |
| `IncomingVideoModal` | — | `FileCard:178` | Thin wrapper over `VideoPlayerModal` |
| `TranscriptModal` | 91 | `RecordingsView:1483`, `TranscriptionsPage:247` | **A modal whose entire body is another modal** — its return is a single `<FileViewerModal>` (`:70-80`) |
| `FileViewerModal` | 145 | `TranscriptModal:72`, `InboxPage:180` | |
| `VideoTranscriptModal` | 179 | `RecordingsView:1490` | |
| `ChapterRecordingModal` | 328 | `RecordingsView:1495` | |
| `ConfirmationModal` | 188 | `ManagePanel:663` | Generic-ish, but carries a `chapterSettings` payload — regen-specific fields leaked into the shared confirm |
| `ClipboardPasteModal` | — | `AssetsPage:1347` | |
| `DiscardModal` | — | `App.tsx:430` | |
| `ProjectDeleteModal` | 183 | `ProjectDrawer:455` | |
| `TranscriptSyncModal` | 243 | `ProjectStatsPopup:450` — **and only there** | **Transitively dead** (§5) |
| `HoldDeleteModal` | 203 | **nothing** | **Dead** (§5) — has a 130-line test file that still passes |

### Is modal sprawl a product smell here? **Yes — but the sprawl is in the *implementation*, not the count.**

13 modals for an app this size is defensible. What isn't:

1. **No modal primitive.** Every modal hand-rolls its own backdrop + centering + `z-50`. Verified: 26 distinct
   `z-50` sites across the client, one per overlay, all the same value — so stacking order is decided by DOM
   order, not by design. Only 2 files in the whole client use `createPortal` (`ImagePreviewOverlay.tsx:118`,
   `ThumbsPage.tsx:436`); every other modal renders inline inside whatever component opened it.
2. **Escape is re-implemented five different ways.** `document.addEventListener` in `ConfirmationModal`
   (`:58` — actually `window`), `ProjectDeleteModal:46`, `HoldDeleteModal:55`, `ProjectDrawer:105`,
   `ClipboardPasteModal:38`, `DeveloperDrawer:67`, `HeaderDropdown:42`; `window.addEventListener` in
   `VideoTranscriptModal:77`, `ConfirmationModal:58`; a React `onKeyDown` on the root div in
   `ChapterRecordingModal:95` and `FileViewerModal:61` (which requires the div to be focused). No shared
   dismiss behaviour, so **whether Escape works depends on which modal you opened**.
3. **No focus trap anywhere.** No `role="dialog"`, no `aria-modal`, no focus restoration — grep found none.
4. **Nesting is real.** `RecordingsView` → `RecordingVideoModal` → `VideoPlayerModal` → `TranscriptSyncPanel`
   is 4 components deep for "play a video and follow the transcript."
5. **Wrapper modals that only exist to pass props.** `RecordingVideoModal`, `IncomingVideoModal`,
   `TranscriptModal` are all ~50-90 lines whose whole job is to render one other modal.

**Rebuild implication:** one `<Dialog>` primitive owning backdrop, portal, escape, focus trap, and stacking,
with modals declared as content — not as components that each re-derive "what a modal is."

### Modal-shaped things that aren't modals

`ProjectDrawer` (536, slide-out), `DeveloperDrawer` (318, slide-out, deliberately no backdrop),
`relay/FileDrawer` (183), `ChapterPanel` / `ChapterHelpPanel` / `DamHelpPanel` (hover slide-outs on
Recordings), `ImagePreviewOverlay` (portal, Shift+hover), `ProjectStatsPopup` (dead), `UndoToast` (`z-50`
floating bar), `BatchToolbar` (`z-50` floating bar), `SlideOutDrawer` (dead abstraction, §5).

That's **five separate answers to "show me more detail about this row"**: modal, drawer, hover slide-out,
floating popup, and inline expand. None share a mechanism.

---

## 4. Keyboard interactions — the complete shipped set

Exhaustive sweep: `grep -rn -e "key ===" -e "onKeyDown" -e "keydown" -e "onKeyUp" -e "keyup" -e "onKeyPress"
-e "e\.key" -e "code ===" client/src` (tests excluded). **17 real handler sites. Nothing else exists.**

| Key | Where it works | Evidence |
|---|---|---|
| **Escape** | closes Developer Drawer | `DeveloperDrawer.tsx:63` |
| | closes Clipboard Paste modal | `ClipboardPasteModal.tsx:29` |
| | closes Video Transcript modal | `VideoTranscriptModal.tsx:73` |
| | closes any `HeaderDropdown` (project `···`, gear) | `HeaderDropdown.tsx:39` |
| | closes Chapter Recording modal — **only if not generating** | `ChapterRecordingModal.tsx:83` |
| | closes Project Delete modal — **only if not loading** | `ProjectDeleteModal.tsx:39` |
| | closes Hold Delete modal | `HoldDeleteModal.tsx:48` — *dead code, unreachable* |
| | closes Project Drawer — **only if delete modal isn't open** | `ProjectDrawer.tsx:98` |
| | closes File Viewer modal (**requires the div to have focus**) | `FileViewerModal.tsx:52` |
| | closes Confirmation modal | `ConfirmationModal.tsx:53` |
| | cancels an inline file-row edit | `EditableFileRow.tsx:125` |
| | cancels a Batch Toolbar input | `BatchToolbar.tsx:105` |
| | closes the video player (via `useVideoPlayback({onEscape})`) | `useVideoPlayback.ts:80`, wired at `VideoPlayerModal.tsx:83` |
| **Enter** | confirms Clipboard Paste (**unless a save is in flight**) | `ClipboardPasteModal.tsx:26` |
| | adds a Common Name in Config | `ConfigPanel.tsx:1140` |
| | adds a dictionary word | `DictionaryQuickAdd.tsx:77` |
| | creates a project (new-project input) | `ProjectsPanel.tsx:967` |
| | commits an inline file-row edit | `EditableFileRow.tsx:122` |
| | applies a Batch Toolbar input | `BatchToolbar.tsx:100` |
| **Space** | play/pause the video — **global while any video surface is mounted**; skipped when focus is in INPUT/TEXTAREA/SELECT | `useVideoPlayback.ts:71-79` |
| **← / →** | previous / next video, **only inside `VideoPlayerModal`** and only when `onPrevious`/`onNext` were passed | `VideoPlayerModal.tsx:118,123` |
| **Shift (held)** | reveals image/prompt preview on hover — **Assets page only** | `useShiftHover.ts:61-66`, consumed at `AssetsPage.tsx:129` |

### What does NOT exist (verified absent, not merely unfound)

The grep above matches **any** key comparison in the client. It returned nothing for: digits, letters,
`Cmd`/`Ctrl`/`Meta`/`Alt` combos, `Tab` handling, `?` for help, `/` for search focus, `j`/`k`, `n`/`p`,
Delete/Backspace, PageUp/Down, Home/End.

Concretely, **none of these are keyboard-reachable today**:
- switching tabs (9 nav buttons, mouse only)
- switching Manage tools (6 sidebar buttons, mouse only)
- switching projects (dropdown, mouse only)
- moving through the recordings list, or selecting/deselecting a row
- opening any of the 4 hover-only slide-out panels (Chapters / Help / DAM / Segments) — **there is no
  non-mouse route to that content at all**
- scrubbing, speed, or size on the video player (Space is play/pause only)
- triggering Park / Safe / Transcribe / Rename
- a command palette — `MockupsPage.tsx:81` describes a legacy mockup as *"Keyboard-driven single column, CMD+K
  palette"*. **That design was explored and never built.**

**This is the largest single gap between the app's intent and what shipped.** For a tool driven at speed by one
person during a recording session, the entire interaction surface is pointer-bound.

---

## 5. Dead and vestigial code — 6 components, ~1,770 LOC, wired to nothing

Method: for every `.tsx` under `client/src/components`, search all non-test client sources for
`<ComponentName` followed by whitespace/`/`/`>`. Six files have **zero** JSX usage anywhere.

| Component | LOC | Status |
|---|---|---|
| **`ProjectStatsPopup.tsx`** | **955** | **Superseded, not deleted.** The only two commits that touch its name are the initial commit (`da12b86`) and `7afcabf` *"feat: filterable project table + detail drawer (FR-148)"* (2026-03-30) — which introduced `ProjectDrawer.tsx` and orphaned it. Five months later it still compiles, still imports 6 shared types, still renders a `TranscriptSyncModal` nobody can reach. |
| `RegenToolbar.tsx` | 415 | No usage. Still reads/writes `localStorage['flihub:regenToolbarOpen']` (`:39,47`) and still renders `SelectionBadge` — so `SelectionBadge` is *transitively* dead too. Superseded by the inline regen toolbar in `ManagePanel.tsx:577-616`. |
| `TranscriptSyncModal.tsx` | 243 | **Transitively dead** — its sole reference is `ProjectStatsPopup.tsx:450`. |
| **`HoldDeleteModal.tsx`** | **203** | Orphaned by `ba8a440` (2026-04-14, *"Wave B — … ArchiveTool removal …"*). Its **130-line test file `__tests__/HoldDeleteModal.test.tsx` still exists and still runs** — green tests over unreachable UI. |
| `RelayBrowser.tsx` | 119 | No usage, and **not even exported from `shared/index.ts`**. Superseded by `RelayTool.tsx` + `shared/relay/*`. |
| `SlideOutDrawer.tsx` | 61 | Exported from `shared/index.ts:10` but imported by nobody. The shared drawer abstraction that lost to four hand-rolled hover panels. |
| `PageHeader.tsx` | 15 | Exported from `shared/index.ts:4`, used nowhere. Sibling `PageContainer` is used exactly once (`ConfigPanel`). |

**Other dead-wiring evidence:**

- **Dead prop, documented as dead:** `StoragePanelProps.brand` — *"Brand is currently unused by the panel …
  but accepted so callers can pass it without TS errors"* (`StoragePanel.tsx:45-48`).
- **Deprecated-but-live API:** `useRelayApi.ts:294` `/** @deprecated Use useEnsureFolders instead */`;
  `useShiftHover.ts:35` `/** @deprecated Use handlePreviewEnter instead */` — both still exported.
- **Socket events declared and subscribed but never emitted:** `file:renamed` and `file:error` are in the
  shared `ServerToClientEvents` contract (`shared/types.ts:694,695`) and actively listened for
  (`useSocket.ts:59,70`), but an exhaustive scan of every `.emit(` call in `server/src` (33 `io.emit`, 10
  `emitter.emit`, 2 `this.io.emit`, 1 `socket.emit`) finds no sender. *Caveat: `WatcherManager.ts:62` emits
  `config.event` dynamically, so I enumerated every `event:` literal in that file (`:114-217`) — the eight
  events I initially could not match (`assets:*`, `inbox:changed`, `thumbs:*`, `projects:changed`,
  `transcripts:changed`) **are** emitted there. Only `file:renamed` and `file:error` remain unmatched.* A typed
  event map guarantees the payload shape and guarantees nothing about anyone sending it.

---

## 6. Visualisations, stats and status displays

| Display | File | Live? | What it shows |
|---|---|---|---|
| `ConnectionIndicator` | `ConnectionIndicator.tsx` | ✅ footer, every tab except Projects | 2×2px dot: green/yellow/red + hover tooltip. **Oldest untouched component in the client** — last real change `8d0d5f8`, 2026-02-13. |
| `SyncIndicator` | `shared/SyncIndicator.tsx` | ✅ header | Two pills (Project / Code) × 7 git states (`clean/dirty/behind/ahead/diverged/conflict/unknown`), each with dot colour, count badge, descriptive text (`:25-33`) |
| `RelayIndicator` | `shared/RelayIndicator.tsx` | ✅ header | One pill × 5 aggregate states (`synced/incoming/outgoing/both/unknown`); *"Pattern follows SyncIndicator.tsx exactly"* (`:6`) — copied, not shared |
| `SsdIndicator` | `shared/SsdIndicator.tsx` | ✅ header | T7 mount pill; **renders nothing at all if `holdingPath` isn't configured** (`:11`) |
| `TranscriptionProgressBar` | `TranscriptionProgressBar.tsx` | ✅ Transcripts tab | Project-wide transcript %, active/queued/missing counts. Returns `null` on path-match failure (see §1.4) |
| `ChapterContextPanel` | `ChapterContextPanel.tsx` | ✅ Incoming tab only | Chapter list + next-chapter suggestion, `position: fixed` at a hard-coded offset |
| Projects table + disk columns | `ProjectsPanel.tsx:738-950` | ✅ Projects tab | 9 base + 8 disk columns, sticky totals row, threshold colouring via `getThresholdLevelClient` |
| `ProjectDrawer` Health Assessment | `ProjectDrawer.tsx:48` `getHealthAssessment()` | ✅ | Derived narrative health string; has its own test (`__tests__/getHealthAssessment.test.ts`) |
| `ProjectStatsPopup` | `ProjectStatsPopup.tsx` | ❌ **DEAD** | 955 LOC of stats visualisation nobody can open |
| Stage pills | `constants/stages.ts` | ✅ toolbar, table, drawer | 10 defined, 9 in the pill row |
| Take-rank badges | `App.tsx:774-782` + `useBestTake` | ✅ Incoming | `best` / `good` on incoming takes, only when >1 file |
| Toasts | `sonner` | ✅ global | Progress is reported almost entirely through toasts — `ManagePanel.tsx:123-186` uses `toast.loading` with a fixed id as a **progress bar substitute** for regen jobs |

**Pattern worth naming for the rebuild:** there are three parallel copy-pasted status-pill implementations
(Sync / Relay / SSD), each with its own `stateStyles` record mapping a domain state enum to Tailwind classes.
No shared `StatusPill` and no shared state→colour vocabulary — `relay:synced` is `bg-green-600` and
`sync:clean` is `bg-green-600` by coincidence, not by contract.

**Long-running work has no persistent progress surface.** Regen shadows / chapters / all report through
`toast.loading(..., { id })` and disappear on completion. Transcription is the only job with a real progress
component, and it's on a tab you have to navigate to.

---

## 7. The `.screenshots/` record — 90 PNGs

Verified: 73 at top level + 17 in `flihub-main/` = **90 PNGs** (the brief said 77; the extra 13 are the
`flihub-main/` tour subfolder). 85 files are git-tracked; 11 are untracked working files. Also present:
5 `.html` mockups and 2 `.yml` tour manifests.

**Top level (73):**
```
01-homepage · 01-incoming · 02-projects-page · 02-recordings · 03-project-drawer-open · 03-watch
04-drawer-ssd-section · 04-transcripts · 05-drawer-wide · 05-inbox · 06-assets · 06-drawer-1920
07-manage-panel · 07-thumbs · 08-manage · 08-relay-tool · 09-projects · 09-sync-tool · 10-config
10-t7-button-clicked · 11-disk-view · 12-disk-view-c36 · angeleye-gallery · config-full-page
config-improved · config-tabbed · consistency-01-incoming · consistency-02-recordings
consistency-03-watch · consistency-04-manage · consistency-05-projects · consistency-06-transcripts
consistency-07-incoming-fixed · consistency-08-recordings-fixed · current-state* · dict-added*
dict-typed* · flihub-01-landing* · flihub-02-projects* · manage-default · manage-final-regen
manage-final-renumber · manage-full-page · manage-gling-edit · manage-page-full · manage-redesign-regen
manage-redesign-relay · manage-relay · manage-rename · manage-renumber · manage-s3-staging
mochaccino-gallery-new · mochaccino-recording-editor · mockups-page-current · mockups-page-unified
mockups-page-with-legacy · modal-current* · modal-dict-bottom* · modal-new* · old-mocks-index
projects-list · recordings-modal* · recordings-page · relay-redesign-live · relay-redesign-mockup
relay-redesign-v2-both-expanded · relay-redesign-v2-expanded · relay-redesign-v3-collapsed
relay-redesign-v3-files-open · relay-tool · warm-linen-incoming · watch-new* · watch-page*
```
*(`*` = untracked, i.e. from the most recent, uncommitted work)*

**`flihub-main/` (17, all dated 2026-04-09 16:39 — one full app tour):**
```
01-incoming · 02-recordings · 03-watch · 04-transcripts · 05-inbox · 06-assets · 07-thumbs
08-manage-export · 09-manage-gling-edit · 10-manage-awb · 11-projects · 12-projects-drawer
13-settings-config · 14-configuration · 14b-config-directories · 15-api-explorer · 16-mockups
```

**Non-PNG:** `mockup-a-tabbed.html`, `mockup-b-cards.html`, `mockup-c-sidebar.html`,
`relay-workflow-mockups.html`, `tours.yml`, `flihub-main/tour.yml`.

**What the filenames say about where effort went** — the clusters are: `manage-*` (11), `relay-redesign-*` (7),
`consistency-*` (8, a theme-uniformity sweep), `drawer-*` (4), `config-*` (3), `mockups-page-*` (3),
`disk-view` (2), and a late `modal-*` / `dict-*` / `watch-new` cluster (the uncommitted B068-B070 video-controls
+ dictionary work). Note that **`flihub-main/08-manage-export.png` still carries the old "export" name**, and
`manage-s3-staging.png` documents a tool (`S3StagingPage`) that `App.tsx:107` says was removed in FR-141.

---

## 8. Architectural findings, ranked for the rebuild

1. **`App.tsx` is the app.** 922 LOC holding routing, naming state, project switching, undo, clipboard,
   header chrome, dropdowns and three modal triggers. Every new feature has had to be threaded through it.
   *Rebuild seam: a real router, a `NamingSession` owner, and a `ProjectContext` — none of which exist today.*

2. **Two routers, one URL.** Tab lives in the hash; Manage-tool lives in React state passed as `initialTool`
   and mirrored via a lint-suppressed `useEffect` (`ManagePanel.tsx:110-116`). You cannot deep-link to
   `#export/sync`, so every navigation into a tool needs the bespoke `navigateToManage()` orchestration in
   `App.tsx:135-176` — including an in-flight-mutation dedupe (`pendingSwitchRef`) that only exists because
   "switch project" and "open tool" are two operations that must happen in order.

3. **"Show me detail" has five incompatible implementations.** Modal, drawer, hover slide-out, floating popup,
   inline expand. `SlideOutDrawer.tsx` was the attempt at one — it lost, and is now dead.

4. **No modal primitive.** 26 hand-rolled `z-50` overlays, 11 independent Escape handlers with different
   semantics, 2 uses of `createPortal`, zero focus traps.

5. **Keyboard was designed and never built.** A CMD+K palette exists as a 2026-03 mockup
   (`MockupsPage.tsx:81`); the shipped app has Escape/Enter/Space/Shift/arrows only, all pointer-adjacent.
   The four hover-only panels have no non-mouse route at all.

6. **Vocabularies drifted in three places.** `export`/Manage (tab id vs label vs component); `review` stage
   defined but unselectable (`stages.ts:68`); `hold`→`offload`→`Storage` (commits `ddaed6a` → `5424850` →
   `ba8a440`) leaving a dead `HoldDeleteModal` with live tests.

7. **The typed socket contract is one-directional.** `ServerToClientEvents` proves payload shape, not
   delivery. Two events are declared + subscribed + never emitted.

8. **Documentation surfaces have no drift check.** `apiRegistry.ts` (Feb) vs 141 live routes (Aug);
   `MockupsPage` misses 2 of 13 mockup folders that exist on disk. Both are hand-maintained lists rendered as
   if authoritative.

9. **Superseded code is never deleted.** ~1,770 LOC of unreachable components, one of them 955 lines, one of
   them with a green 130-line test suite.

10. **Progress for long jobs is a toast.** Regen shadows/chapters/all report via `toast.loading` with a fixed
    id and vanish. There is no job list, no history, no way to see what ran while you were on another tab.

---

## 9. What only David can answer — watch for these while using the app today

1. **Mockups + API Explorer** — do you ever open them, or are they leftovers? If API Explorer is genuinely
   used, note whether the endpoint you wanted was even in the list (it's a February snapshot; 106 of ~141
   routes are missing).
2. **Assets and Thumbs** — untouched since the March theme pass. Do you still use them, or did the workflow
   move elsewhere? Note if you open them at all today.
3. **Shift+hover on Assets** — do you actually use it, or did you forget it exists?
4. **The four hover-only panels** (Recordings: Chapters / Help / DAM; Watch: Chapters→Segments) — do you find
   them on purpose, or discover them by accident when the mouse strays? Do you ever want them *pinned*?
5. **Keyboard** — while working, catch yourself reaching for a key that doesn't do anything. Which one, on
   which screen? That list is the rebuild's keyboard spec.
6. **Manage tool switching** — you can't bookmark or link a tool. Does that cost you? Also note if clicking an
   already-active sidebar tool ever dumps you back on the Regen list unexpectedly (`ManagePanel.tsx:562`).
7. **Header pills (Sync / Relay / T7)** — do you read them, or click straight through? Would you rather they
   *acted* than navigated?
8. **Regen progress** — start a Regen All, then navigate away. Can you tell what's happening? Do you want a
   persistent job panel?
9. **`review` stage** — is it a real stage you use, or should it die? It's defined but has no filter pill.
10. **Transcripts tab** — does the progress bar ever just... not appear? It silently returns `null` on a path
    mismatch, which looks identical to "nothing to show".
11. **Incoming vs Recordings** — is the Incoming tab a *place* you go, or a state the app should drop you into
    automatically when a file lands?
12. **Project switcher** — the dropdown shows pinned projects only. How often do you hit "All projects…"?
    Should the switcher just *be* the Projects table?
13. **ProjectStatsPopup (955 LOC, dead since 2026-03-30)** — was there anything in the old popup that the new
    `ProjectDrawer` does not show? Worth a look before it's deleted for good.

---

*Report generated 2026-08-26 against `3b3b2f1`. No source files were modified.*
