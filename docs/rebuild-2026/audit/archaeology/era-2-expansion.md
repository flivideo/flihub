# Era 2 — "Expansion" (2025-12-18 → 2026-02-13)

**Range:** `e3b98570..df9be0c3` · 34 commits · 251 files changed · +86,710 / −4,535

**Split of that churn:**

| Surface | Files | Insertions |
|---|---:|---:|
| App code (`client/src`, `server/src`, `shared`) | 78 | 12,786 |
| `docs/` | 118 | 49,810 |
| `client/public/mocks/` (HTML design explorations) | 26 | 15,087 |

Commit types: 16 `feat`, 11 `docs`, 3 `fix`, 3 `chore`, 1 untyped (`update docs`).

**Tests written in this era: zero.** `git ls-tree -r --name-only df9be0c3 | grep -cE '\.test\.|\.spec\.'` → `0`. The first test file in the repo is `8797509` (2026-02-13, *after* this range's terminus in wall-clock terms but on the same day); the substantive suites arrive `fe228dd` (2026-03-18) and `ec0b16a` (2026-03-19). Everything described below was built, shipped and declared "verified" with no automated test of any kind.

---

## Headline

Era 2 is the era where FliHub stopped being a recorder-namer and became a **workbench** — 19 FRs in 20 days — and in doing so it locked in the two decisions everything after had to live with: **per-recording state lives in a per-project JSON file keyed by filename**, and **"the current project" is an ambient global rather than a parameter**. It also produced the largest crop of dead ends in the project's life: an API Explorer that froze the day it was born, a manifest subsystem now referenced only by its own tests, 15,000 lines of design mockups superseded by a different design process, and a documentation output four times the size of the code it described.

---

## Timeline narrative

### Phase A — the state-file rewrite (Dec 18 → Dec 31, 9 commits)

Opens with a **documentation re-architecture** (`8fa159f`, 2025-12-18): `backlog.md` cut from 683 lines to a 65-line index, 15 inline requirements extracted into individual PRD files, `docs/` split into `architecture/ guides/ uat/`, and six `.claude/commands/*.md` deleted (moved up to the parent `flivideo` repo). The stated pattern: *"PRD files ARE the handoffs, no separate handover-queue needed."* This is the moment the FR-number became the unit of work, the commit, and the code comment — a convention that then tattoos itself onto every file in the codebase.

`1e943b8` (FR-105) bolts **S3 DAM integration** onto the S3 Staging modal: four buttons that `exec()` an external Ruby CLI (`dam s3-up ${brand} ${projectCode}`), with "brand" recovered by walking the project path looking for a `v-*` segment (`server/src/routes/s3-staging.ts`, `extractBrand`). Integration-by-shell-command, with the domain concept "brand" existing only as a substring of a filesystem path.

`8226ea8` (FR-106) adds the first **video preview modal** — `IncomingVideoModal.tsx` (164 lines), a Range-request endpoint `/api/video/incoming/:filename`, playback speed 1x–3x persisted to `localStorage`.

Then the two commits that define the era:

- **`f2371b9` (2025-12-26, FR-107/108/109)** — three unrelated things in one commit. FR-108 is "Gling Dictionary Not Saving", fixed by *adding the field to three separate hand-written lists* (route destructure, `updateConfig()` merge, `saveConfig()` allowlist). FR-109 is "Fix wrong project: derive transcriptsDir from video path, not current config" — the first appearance of the ambient-project bug, fixed by string-splitting the video path on the literal segment `'recordings'`.
- **`95db6ac` (2025-12-26, FR-110/111/112)** — 42 files, +3,485/−483. **FR-111 abolishes the physical `recordings/-safe/` folder** and replaces it with `.flihub-state.json`, a per-project state file keyed by filename (`server/src/utils/projectState.ts`, new, 166 lines). A boot-time migration (`safeMigration.ts`, 228 lines) moves files back out of `-safe/`. In the *same commit*, **FR-110 puts per-project stage overrides into the global `config.json`** as `projectStageOverrides: Record<code, stage>`. Two state stores, two homes, one commit, no stated principle for the split.

`2b0d9d1` (Dec 31, FR-113/116/117) renames the `first-edit` subsystem to `edit` across three files, flattens `edits/prep` into `edit-1st / edit-2nd / edit-final`, and adds `useDelayedHover.ts` (134 lines) with enter/leave delays to stop "whack-a-mole" tooltips.

### Phase B — the blitz (Jan 2 → Jan 7, 17 commits in 6 days)

Six commits land on **Jan 3 alone**. Pace is visible in the timestamps: `7a8c5a1` 19:12 and `7f1b996` 19:14 on Jan 2 — two 1,800-line commits two minutes apart, meaning both had been sitting uncommitted in the tree.

- `7a8c5a1` **FR-119 API Explorer** — `shared/apiRegistry.ts` (973 lines, 36 endpoint definitions hand-written) + `ApiExplorer.tsx` (467 lines) + `projectResolver.ts` for short-code (`c10` → `c10-poem-epic-3`) resolution across all query routes.
- `7f1b996` **FR-123/125** — 27 files. Watch page gains a unified source dropdown, park/unpark, per-segment annotations. `EditPrepPage.tsx` is **deleted** and its functionality merged into `ConfigPanel.tsx`. `ExportPanel.tsx` created (726 lines).
- `7f5462c` **FR-127 Developer Drawer** — Monaco Editor (VSCode's editor) added as a dependency to view three internal JSON files. 307-line component, 193-line route.
- `5229de0` **FR-126 Edit Folder Manifest** — `editManifest.ts` (251 lines), SHA-256-of-first-1MB hashing, four endpoints, four status emoji (🟢 present / 🔴 cleaned / ⚠️ changed / ❌ missing). Same commit drops `BRIEF-dual-transcription-progress.md` (290 lines) and a gzipped telemetry archive of 891 transcriptions.
- `b991da9` **FR-128** — `RecordingVideoModal.tsx`, explicitly *"cloned from IncomingVideoModal"* per the commit body. A second near-identical Range endpoint `/api/video/recordings/:filename`.
- `fdc6aac` **FR-130** — `renameRecording.ts` (277 lines): the **delete+regenerate** pattern. Rename now destroys every derived artifact (shadow `.mp4`, five Whisper formats, chapter video + SRT), renames the source, migrates the state-file key, patches the manifest, then regenerates.
- `fa81286` **FR-131** — opens with a data-corruption fix: `config.json` had `{"name": {"name": "intro", …}}` instead of `{"name": "intro", …}`, crashing React. Component `ExportPanel.tsx` is **renamed to `ManagePanel.tsx`**; the "Export" tab becomes "Manage".
- `5ba69b1` **FR-136** — the tool-oriented turn. `ToolsSidebar`, `SlideOutDrawer`, `SelectionBadge`, `RegenToolbar`, `ConfirmationModal` created; `server/src/routes/manage.ts` goes from 0 to ~1,200 lines in ten days. Eight new `regen:*` Socket.io progress events.
- `41ddc0f` (Jan 5) — **15,087 lines of design mockups**: four complete design systems × five screens, standalone HTML.
- `3809e30` (Jan 6) — creates `components/shared/ExportPanel.tsx` (593 lines), **recycling the name freed two days earlier**, while the old inline copy stays live in `ManagePanel.tsx` for one commit.
- `699385b` (Jan 7) **FR-140** — removes those 696 duplicated lines from `ManagePanel.tsx` and adds `ChapterListPanel.tsx` (visual chapter list, click-to-rename, auto-swap on collision, gap warnings).

### Phase C — the doc dump and the stall (Jan 12 → Feb 13, 8 commits)

`a45a16c` (Jan 12) adds `.claudeignore` excluding `docs/prd/ docs/architecture/ docs/planning/ docs/analysis/ docs/testing/` — *"to prevent JSON parser overflow"*. The documentation had grown large enough to break the tool that produced it.

Jan 13, four commits in **nine minutes** (10:29 → 10:38): a 25-error TypeScript build fix, a WSL2 setup guide for Jan, an FR-140 tool-button swap, and `103ede0` — **17,831 insertions** of PO-session artefacts, PRDs, a 948-line project scanner, naming-decision logs, `RenamePanel.tsx` (516 lines) and `start.sh`.

Then **30 days of silence.** Feb 12: dependency bumps. Feb 13: one cross-project transcript fix (`225053c`) — *the same bug class as FR-109, seven weeks later* — and `df9be0c3`, "**partial** ESLint 9 and Prettier setup".

The era does not end on a feature. It ends on someone reaching for guardrails.

---

## Feature ledger

| FR / ID | Capability | Area | Evidence | KB / vis |
|---|---|---|---|---|
| FR-105 | S3 DAM upload/download/cleanup via shell-out to `dam` CLI; S3 status display | s3-staging | `1e943b8` | status text |
| FR-106 | Incoming video preview modal, Range streaming, 1x–3x speed shared via localStorage | recordings / video | `8226ea8` | Escape-to-close |
| FR-107 | Auto-focus Name input on "New Chapter" + 500 ms blue glow pulse | naming UI | `f2371b9` | **glow animation** |
| FR-108 | Gling dictionary persists to config | config | `f2371b9` | — |
| FR-109 | Transcript delete 404 fix; transcripts dir derived from video path | transcripts | `f2371b9` | — |
| FR-110 | Project stage dropdown (8 stages, coloured dots, checkmark, "Auto") replaces click-to-cycle | projects | `95db6ac` | **coloured dot indicators** |
| FR-111 | `.flihub-state.json` per-project state; `isSafe` flag replaces `-safe/` folder; "Show safe" toggle with yellow styling; boot migration | storage / state | `95db6ac`, `server/src/utils/projectState.ts`, `safeMigration.ts` | **yellow state styling** |
| FR-112 | Idempotent chapter increment; green glow (productive) / red glow (no-op) / blue glow (name); previous filename shown 1.5 s | naming UI | `95db6ac`, `client/src/index.css:34-72` | **3 glow variants** |
| FR-113 | Tilde-path fix; flat `edit-1st/2nd/final`; "Create All Folders" | edit folders | `2b0d9d1` | — |
| FR-115 | Chapter Context Panel on Incoming page | recordings | `2b0d9d1` (`ChapterContextPanel.tsx`) | — |
| FR-116 | ⚙+ quick-config jump from Incoming pills → Config tab, auto-focus Common Names | config | `2b0d9d1` | — |
| FR-117 | `useDelayedHover` hook — 250 ms enter / 200 ms leave, kills tooltip whack-a-mole | UX infra | `2b0d9d1`, `client/src/hooks/useDelayedHover.ts` | **hover behaviour** |
| FR-118 | Project-specific Gling dictionary (global + project merge) | transcripts / config | `dc713fb` docs, `7f1b996` code | — |
| FR-119 | API Explorer: 36 endpoints, 8 groups, live execution, copy-as-cURL, HTTP-method colour coding, auto-fill current project, short-code resolution | dev tooling | `7a8c5a1`, `shared/apiRegistry.ts` | **method colour coding** |
| FR-120/121 | Parked recording state + parked display in Watch panel | state | `dc713fb`, `7f1b996` | **park indicators** |
| FR-122/124 | Export panel + enhancements (Gling prep, folder status) | export | `7f1b996` | — |
| FR-123 | Watch panel: unified source dropdown (Recordings/Shadows/Chapters/Final), park/unpark, per-segment annotations, chapter context panel | watch | `7f1b996` | **park status badges** |
| FR-125 | EditPrep merged into ConfigPanel; `EditPrepPage.tsx` deleted | config | `7f1b996` | — |
| FR-126 | Edit-folder manifest: SHA-256(first 1MB) hashing, Clean/Restore, 4-state status | export / manifest | `5229de0`, `server/src/utils/editManifest.ts` | **🟢🔴⚠️❌ status indicators** |
| FR-127 | Developer Tools drawer — Monaco editor, resizable 300–1000 px, tabbed, sticky action bar, Escape to close; Socket.io live refresh | dev tooling | `7f5462c`, `28d8f12` | **Escape key; live refresh** |
| FR-128 | Recording quick-preview play button per row + second Range endpoint | recordings | `b991da9` | **Escape key; speed control** |
| FR-130 | Delete+regenerate rename; state-key migration; manifest patch; transcription-queue guard | rename | `fdc6aac`, `server/src/utils/renameRecording.ts` | — |
| FR-131 | Manage tab (renamed from Export); bulk rename; explicit Select All / Clear Selection; auto-selection removed | manage | `fa81286` | **SelectionBadge** |
| FR-136 | Tool-oriented Manage panel: ToolsSidebar, SlideOutDrawer, SelectionBadge, RegenToolbar, ConfirmationModal with editable chapter settings; per-request settings override | manage / UI infra | `5ba69b1`, `3809e30` | **progress bars, 8 `regen:*` socket events** |
| FR-137 | SlideOutDrawer pattern (documented retroactively) | UI infra | `103ede0` | — |
| FR-138 | Rename tool drawer: bulk rename with chapter / sequence preserve-or-renumber / label / tags | manage | `103ede0` (`RenamePanel.tsx`), `699385b` (route) | Enter/Escape inline |
| FR-140 | Visual chapter list: click-to-edit chapter number, auto-swap on collision (3-phase temp rename), gap warnings, auto-sort | manage / chapters | `699385b`, `c1617a6` | **⚠️ gap indicators; Enter/Escape** |
| — | 4-variant design-system exploration (20 HTML screens + approach docs) | design | `41ddc0f` | full mock UIs |
| — | `scanProjects.ts` naming-inconsistency scanner across 47 projects | analysis | `103ede0` | CSV/JSON/markdown reports |
| — | ESLint 9 flat config + Prettier ("partial") | tooling | `df9be0c3`, `eslint.config.js` | — |

### Keyboard / hover / visualisation summary

**Landed and still alive:** three glow-pulse animations (`client/src/index.css:34-72`, still driven from `NamingControls.tsx:192-221`); `useDelayedHover` (still used by `ProjectsPanel.tsx` and `WatchPage.tsx`); eight `regen:*` progress events (still emitted at `server/src/routes/manage.ts:259-765`, still consumed at `ManagePanel.tsx:179-191`); `SelectionBadge`; stage colour dots.

**Landed and died:** ⚠️ gap indicators and click-to-rename chapter numbers (`ChapterListPanel.tsx`, deleted `690f619` 2026-03-23); manifest 🟢🔴⚠️❌ badges (route deleted `9f428c0` 2026-02-16).

**Specced and never built:** the CMD+K command palette and full keyboard-shortcut map of `design-3` (`client/public/mocks/design-3/design-approach.md:44-136` — `CMD+K`, `CMD+P`, `CMD+[`/`]`). `grep -rn "metaKey\|CommandPalette" client/src` returns nothing today, and `git log --all -S'metaKey' -- client/src` returns nothing ever. Also never built: FR-132's transcription progress bar with ETA, despite 891 telemetry samples having been analysed for it.

**Never touched:** drag-and-drop. `git log e3b98570..df9be0c3 -S'draggable'` and `-S'onDragStart'` are both empty; the only drag/drop in the app today is in `ThumbsPage.tsx`, which predates this era.

**Keyboard handling as built:** ad-hoc, per-component. Five separate `document.addEventListener('keydown', …)` Escape handlers were introduced in this era (`8226ea8`, `7f5462c`, `b991da9`, `3809e30`, plus inline Enter/Escape in `699385b` and `103ede0`). No shared hook was ever extracted. Today `grep -rl "key === 'Escape'" client/src` returns **13 files**, and `client/src/hooks/` contains 25 hooks, none of them a keyboard hook.

---

## Dead ends

### 1. FR-126 Edit Folder Manifest — the most complete dead end in the repo

Built `5229de0` (2026-01-03): `editManifest.ts` (251 lines), 4 endpoints in `server/src/routes/export.ts`, `EditManifestFile` / `EditFolderManifest` / `ManifestStatus` types, `FolderManifestStatus` UI, three `useEditApi` hooks, Clean/Restore with change-detection warnings.

**Fate today:**
- `server/src/routes/export.ts` — **deleted** `9f428c0` (2026-02-16), six weeks after being written.
- `server/src/utils/editManifest.ts` — still present; `grep -rn "from '.*editManifest" server/src client/src shared` returns exactly **one** hit, and it is `server/src/test/editManifest.test.ts`. **Zero production importers.**
- `getEditManifest` / `setEditManifest` in `server/src/utils/projectState.ts:267,278` — **zero callers** outside that file.
- `EditManifest` still occupies `shared/types.ts:1195,1215-1232`.
- And it is still being *maintained*: `renameRecording.ts:256` calls `updateManifestFilename()` on **every rename**, rewriting manifest entries nothing will ever read.

*Why it probably failed:* it solved "safely delete source recordings after copying to Gling" — a disk-space problem. Disk pressure was later addressed structurally (the archive/offload and StoragePanel work of 2026-04), which made a per-edit-folder manifest redundant. The manifest also had to be kept in sync by hand through rename, which is exactly the kind of invariant a filename-keyed state store makes expensive.

### 2. FR-119 API Explorer / `shared/apiRegistry.ts` — froze on the day it was born

`shared/apiRegistry.ts` has **three commits total**: creation (`7a8c5a1`, 2026-01-02) and two lint/tooling passes on 2026-02-13. It has had **no content change in eight months**. It declares 38 endpoint entries (`grep -cE "^\s*path: '"`). The server today registers **156** `router.<verb>(` handlers across `server/src/routes/`. Six route files that exist today (`relay.ts`, `sync.ts`, `storage.ts`, `hold.ts`, `poem-wui.ts`, `chapters.ts`) are not represented in it at all.

*Fate:* still-present-but-stale. `ApiExplorer` is still mounted (`App.tsx:39,895`), so the tool still renders — showing a 2026-01 snapshot of an API that has since roughly quadrupled. A dev tool that silently lies is worse than no dev tool.

*Why it probably failed:* a hand-written parallel description of the routes, with nothing forcing the two to agree. There was no test, no build step, no lint rule connecting `apiRegistry.ts` to the Express routers.

### 3. The four design systems — 15,087 lines, never revisited

`41ddc0f` (2026-01-05) added `client/public/mocks/design-{1,2,3,4}/` — five fully interactive HTML screens each, plus `design-approach.md`, plus a comparison hub. `git log -- client/public/mocks` shows **two commits ever**: the creation, and a Prettier/tooling pass.

*Fate:* superseded. The theme actually adopted is "Warm Linen" (`fb99b1b`, 2026-03-24), produced 2.5 months later by a different process ("Mochaccino mockups"), and `MockupsPage.tsx` was rewritten around that. Design-3's keyboard-first command palette — arguably the most interesting idea in the set — was never implemented in any form.

*Why it probably failed:* four complete alternatives were generated in one sitting with no decision criteria, no chosen winner recorded in the commit, and no migration path from an HTML mock to a Tailwind React app. Producing four full options is a way of not deciding.

### 4. FR-132 Dual Transcription with Progress Tracking — specced, measured, abandoned

`BRIEF-dual-transcription-progress.md` (290 lines, `5229de0`) analysed **891 transcriptions** from the telemetry log: local Whisper runs at ~1.36× video duration, with 42% degradation over time. It proposed a progress bar with ETA and a dual local/cloud transcription path.

*Fate:* the brief was **deleted** (`0de5b6e`, 2026-02-13, "fix naming conventions"). `grep -rin "groq\|dualTranscription" server/src client/src shared` returns nothing. FR-132 still sits in `docs/backlog.md:40` as "Pending". Meanwhile `server/transcription-telemetry.jsonl` and `server/transcription-performance-summary.json` are still committed and still being appended to (`server/src/routes/transcriptions.ts:17,235`) — telemetry gathered forever, surfaced nowhere.

### 5. FR-105 S3/DAM integration

`server/src/routes/s3-staging.ts` (275 lines) and `client/src/components/S3StagingPage.tsx` (+218). The page was deleted `9f428c0` (2026-02-16); the route survived until `21f4ebe` (2026-03-22, "retire S3"). Superseded by the relay/rsync collaboration model.

*Why it probably failed:* it made FliHub depend on a separate Ruby CLI being installed and on a brand name that existed only as a `v-*` path segment. That is a lot of coupling for a copy operation.

### 6. FR-139 "Folders Tool" — cancelled after being specced

`c1617a6` (2026-01-13): *"remove FR-139's undefined 'Folders' button based on PO decision"*. A PRD was still written for it (`docs/prd/fr-139-folders-tool-specification.md`). Note the ledger disagrees with itself: `docs/backlog.md:33` marks FR-139 **"✓ Implemented"** while the commit that touched it removed its button. (Uncertain: "Implemented" may mean "the decision to remove was implemented" — I did not find a statement resolving this either way.)

### 7. NFR-141 "Lenient Tag Parser" — withdrawn on corrected data

Specced from a scanner run reporting **1,805 issues**; the scanner was then found to be buggy and the real number was **391**. `docs/backlog.md:84` records it as *"❌ CANCELLED — Based on incorrect scanner analysis (scanner bugs fixed, app parser validated as correct)"*. A developer handover doc for it (`docs/planning/developer-handover-nfr-141.md`) was written and shipped anyway. **A requirement, a handover and a day of analysis were produced from a measurement nobody had validated.**

### 8. `scanProjects.ts` — 948 lines, one use

Written for the 2026-01-06 PO discovery session, committed `103ede0`. Never wired into the app, never scheduled, referenced only by its own how-to doc. Its 391 findings fed FR-133/134/135, all three of which are still marked 🟢 LOW / "no evidence of need" in `docs/backlog.md:37-39` and none of which were built.

### 9. `SlideOutDrawer` — the "pattern" with no users

FR-137 documented `SlideOutDrawer` retroactively as the app's drawer pattern. Today: `grep -rn "SlideOutDrawer" client server shared docs` returns **five hits, all inside `SlideOutDrawer.tsx` itself plus its re-export in `shared/index.ts`**. Zero consumers. Still shipped in the bundle.

### 10. FR-140 `ChapterListPanel` and FR-138 `RenamePanel` — both killed by the same commit

Built Jan 7 and Jan 13. Both **deleted together** in `690f619` (2026-03-23, "B047 Recording Editor — inline rename, renumber, chapter split on Recordings page"). Lifespan ~10 weeks. See Pivots.

### 11. Root-level handover artefacts

`AGENTS.md` (159 lines, `95db6ac`), `HANDOVER-JAN.md` (204 lines, `877a6d4`), `BRIEF-dual-transcription-progress.md` — all written to the repo root, all since gone. Session-scoped documents were being committed as though they were project documents.

### 12. `RecordingState.stage` — a speculative field, dead on arrival

`shared/types.ts` still carries `stage?: string; // Future: per-recording stage`. `grep -n "\.stage" server/src/utils/projectState.ts` shows it is referenced in exactly two places — both `!recordingState.stage` guards in the "delete the entry if everything is default" cleanup. **Nothing ever writes it.** Eight months of a field that exists only to be checked for absence.

---

## Pivots

| From | To | Trigger | Evidence |
|---|---|---|---|
| Physical `recordings/-safe/` folder for protected takes | `isSafe` boolean in `.flihub-state.json`, all files stay in `recordings/` | Filesystem-as-state made every other operation (scan, rename, shadow, stats) branch on two directories | `95db6ac` (FR-111); `safeMigration.ts`; `shared/types.ts` diff removes `safeCount`, changes `folder: 'recordings' \| 'safe'` → `folder: 'recordings'` |
| Rename = move files and their derivatives | Rename = **destroy** every derivative, rename the source, regenerate | Rename kept silently corrupting derived files (wrong shadow extension, 2-of-5 transcript formats deleted, physical `-safe` paths still assumed post-FR-111) | `fdc6aac` (FR-130), `server/src/utils/renameRecording.ts`; commit body lists all three as "critical bugs found during implementation" |
| Click-to-cycle project stage | Dropdown with 8 stages, coloured dots, explicit "Auto" | Cycling is undiscoverable and unreversible | `95db6ac` (FR-110) |
| Page-per-function (`EditPrepPage`, `ExportPanel` page) | Tool-oriented: one Manage page + a tool sidebar + slide-out drawers | FR-131 Phase 2's 1,115-line plan was explicitly **superseded** by FR-136 mid-flight | `7f1b996` deletes `EditPrepPage.tsx`; `5ba69b1` creates `ToolsSidebar`/`SlideOutDrawer`; `3809e30` body: *"FR-131 Phase 2 — Superseded by FR-136 tool-oriented approach"* |
| Form-based chapter move with cascade renumbering | Visual chapter list, click the number, auto-swap on collision | Quoted in the commit: *"If I was just looking at a list of chapters…"* | `699385b` (FR-140) |
| Everything selected by default | **Nothing** selected by default; empty selection implicitly means "all files" | FR-131: *"Removed auto-selection (now 0 selected by default)"* | `fa81286`; `SelectionBadge.tsx:26`; `RegenToolbar.tsx:158` (`selectedFiles.length > 0 ? selectedFiles : undefined`) |
| Dedicated tool drawers for rename / chapter ops (this era's answer) | Inline editing on the Recordings page where the data is visible | *Post-era*, but it invalidates era 2's central UI bet | `690f619` (2026-03-23) deletes both `RenamePanel.tsx` and `ChapterListPanel.tsx` |
| Ship features, document after | Guardrails: dependency bump, ESLint 9 flat config, Prettier, then tests | 30-day stall after the doc dump | `81f3937`, `df9be0c3` ("**partial**"), then `8797509`/`fe228dd` |

---

## Pain signals

### 1. Config persistence — the same bug, five times, and still shipping

Adding a field to `Config` requires editing **three** hand-written enumerations. Miss one and the field silently fails to persist.

- `server/src/routes/index.ts:119-148` — POST `/api/config` destructures a literal list of 13 field names, then re-lists all 13 to pass on.
- `server/src/index.ts:160-200` — `updateConfig()` merges with one `if (newConfig.X !== undefined)` line per field.
- `server/src/config/configManager.ts:121-165` — `saveConfig()` builds `toSave` from an allowlist.

`saveConfig` alone now carries per-field comments tagged **FR-32, FR-89, FR-108, FR-110, FR-144, B038, B039, B064, storage-panel** — i.e. **at least nine separate occasions** on which someone added a field, found it didn't save, and patched the allowlist. Era 2 contributed two of them: FR-108 (`glingDictionary`) and FR-110 (`projectStageOverrides`).

**Fix count in this era: 2. Fix count to date, visible in the file: ≥9.**

### 2. The same allowlist anti-pattern in the *state* file

`writeProjectState()` (`server/src/utils/projectState.ts:75-95`) rebuilds the object from a literal field list with two conditional spreads, tagged `// FR-118: Preserve project dictionary` and `// FR-126: Preserve edit manifest`. Both comments exist because someone added a top-level state field and watched it get silently dropped on the next write. **Same failure mode as `saveConfig`, different file, discovered independently.**

### 3. Ambient current-project leaking into async work — fixed at both ends of the era

- **2025-12-26, FR-109** (`f2371b9`): transcription completion wrote transcripts to `getTranscriptsDir()` — the *active* project — so switching projects mid-queue filed transcripts under the wrong project. Fixed by `videoPath.split(path.sep).indexOf('recordings')` and slicing.
- **2026-02-13** (`225053c`), **seven weeks later**: `hasTranscriptFile()` had the identical bug in the read direction. Fixed by extracting the *same* path-splitting logic into `getTranscriptsDirFromVideoPath()`.

Today, `grep -rn "indexOf('recordings')" server/src` still returns **two** sites (`transcriptions.ts:53,232`), and `TranscriptionJob` in `shared/types.ts` **still has no project field** — only `videoPath` and `videoFilename`. The project identity is still being *reverse-engineered from a string* on every job.

**Fix count: 2 in this era, and the root cause is untouched today.**

### 4. Rename keeps breaking, because rename is the join point of everything

FR-130's own commit body enumerates three critical bugs found while implementing it: shadow files written with `.txt` instead of `.mp4` causing duplicates; transcript deletion covering 2 of 5 Whisper formats; and code still assuming physical `-safe/` folders five weeks after FR-111 abolished them. Rename touches: the recording, the shadow, five transcript formats, chapter videos + SRT, the state-file key, and the manifest. Every one of those is a hardcoded string list in `renameRecording.ts` — there is no registry of derived artifacts.

**Fix count in this era: 3 distinct bugs in one commit, plus FR-109's rename-adjacent 404.**

### 5. Copy-paste of whole components, and the bill 11 weeks later

FR-128's commit body says outright: *"RecordingVideoModal component (cloned from IncomingVideoModal)"*. Two 170–180 line modals, two Range endpoints doing the same job. The bill came due in `a38d9f2` (2026-03-25, *"consolidate duplicates and fix code quality issues from /simplify review"*) and `e2b055a` (*"shared video player infrastructure"*). Today the two modals are 51 and 64 lines and there are **three** overlapping video endpoints in `server/src/routes/video.ts` — a generic `/:projectCode/:folder/:filename` plus both era-2 legacy routes, still mounted.

### 6. `manage.ts` — a god route born in ten days

0 lines on 2026-01-03 → 1,202 lines by 2026-01-13 → 1,733 lines today, 13 route handlers, containing bulk rename, chapter rename, chapter swap (a hand-rolled 3-phase temp-rename algorithm), and all four regen operations. Built with zero tests.

### 7. Component sprawl in the panels era 2 touched

| File | End of era 1 | End of era 2 | Today |
|---|---:|---:|---:|
| `ConfigPanel.tsx` | 842 | 1,061 | **1,594** |
| `RecordingsView.tsx` | 825 | 972 | **1,537** |
| `WatchPage.tsx` | 873 | 1,171 | 1,060 |
| `ManagePanel.tsx` | — | 578 | 677 |
| `server/src/routes/manage.ts` | 0 | 1,202 | **1,733** |

FR-125's "consolidation" of EditPrep into ConfigPanel is the direct ancestor of today's five-tab, 1,594-line `ConfigPanel` (`directories | names | collaboration | advanced | brand`).

### 8. The build never actually built

`f3506fd` (2026-01-13): **25 TypeScript errors** had accumulated in `server/` — meaning the server had not compiled cleanly for an unknown but non-trivial stretch, while features shipped daily on `tsx`/dev-mode. The fix was to **comment out `rootDir`** rather than fix the workspace boundary. That comment is still in `server/tsconfig.json` today.

### 9. Documentation outgrew its own tooling

+49,810 lines of docs against +12,786 lines of code (**3.9 : 1**). By 2026-01-12 the doc tree had to be excluded from Claude's indexing to stop a JSON parser crash (`.claudeignore`). Two of the era's biggest commits are docs: `103ede0` (+17,831) and `8fa159f` (+16,327).

### 10. Documentation status that disagrees with the code

`dc713fb` (Jan 2, 14:07) declares FR-114/118/120/121/122/124 complete — and the code for FR-119/123/125 lands **five hours later** in commits that also touch those areas. `docs/backlog.md:33` marks FR-139 "✓ Implemented" for a feature whose button was removed. `fdc6aac`'s body says *"New utility: 240 lines of testable functions"* and *"Testing verified: …"* in a repo with **no test runner and no test files**. FR-129 has no PRD and no commit — a hole in the numbering.

### 11. Commit messages that describe work that did not happen

`699385b` (FR-140) states: *"DELETED: ChapterMovePanel (form-based, 300+ lines)"*, *"DELETED: chapterCascade.ts (complex cascade algorithm)"*, *"DELETED: /api/manage/move-chapter, /execute-move-chapter endpoints"*, and *"50% less code (600 lines → 550 lines)"*.

Verified: `git ls-tree -r --name-only 699385b^ | grep -iE 'chapterCascade|ChapterMove'` → **empty**. `git log --all -S'move-chapter' -- server client shared` → **empty**. The 696 lines actually removed from `ManagePanel.tsx` were the *Gling/export UI* that had been duplicated into `shared/ExportPanel.tsx` one commit earlier. **None of the four claimed deletions ever existed.** The commit is real and useful; its narrative is fiction. Anyone reading this history for "what did we try and abandon" would be misled.

---

## Architectural moments

### A. `.flihub-state.json`, keyed by filename (`95db6ac`, FR-111)

The single most consequential decision of the era. Per-recording state moved out of the filesystem into a JSON sidecar, and the **primary key chosen was the filename**.

Consequences that everything downstream had to live with:
- Every rename becomes a **state migration**. `migrateRecordingKey()` exists only because of this choice (`renameRecording.ts:190`).
- Every *external* rename (Finder, a script, another machine) **silently orphans** state, and nothing detects it.
- Filename is both the naming *convention* (`{chapter}-{seq}-{name}-{tags}.mov`, carrying semantics) and the *identity*. Changing the semantics changes the identity. There is no stable recording ID anywhere in the system today.
- The shape has been **frozen since this era**: `RecordingState { safe?, parked?, annotation?, stage? }` is byte-identical between `df9be0c3` and `HEAD`.
- `version: 1` is validated but never incremented, and `readProjectState()` returns an **empty state** for an unrecognised version (`projectState.ts:47-50`) — after which the next `writeProjectState()` overwrites the file. A future version bump is a silent data-loss path, not an error.

### B. Two state stores, split by accident (`95db6ac`, FR-110 + FR-111 in one commit)

Per-**recording** state → per-project `.flihub-state.json`. Per-**project** state → the **global** `server/config.json` as `projectStageOverrides: Record<code, ProjectStage>` (`shared/types.ts:203`), with a legacy `projectStages` fallback still consulted at `projectStats.ts:157-160` and `query/projects.ts:159-161`.

Consequence: project-level metadata does not travel with the project. Copy a project folder to the editor's machine and its stage stays behind on the creator's machine. This is precisely the constraint the later relay work had to fight. A rebuild should decide, once, that **everything about a project lives in the project**.

### C. "The current project" is ambient, never a parameter

`getConfig().projectDirectory` is read inside route handlers and inside async job completion. There is no project argument on `TranscriptionJob`; there is no project scope on any Socket.io emit (`io.emit('regen:shadows:progress', …)` broadcasts globally, `manage.ts:259`). Two independent bugs in this era (§Pain 3) came from this, both patched by re-deriving the project from a path string, and the root cause is untouched today.

### D. Delete + regenerate as the answer to derived state (`fdc6aac`, FR-130)

A genuinely good instinct — derived artifacts should be reproducible, not migrated — implemented without the abstraction it needs. There is **no named concept of a derived artifact**. `deleteDerivableFiles()` hardcodes: `recording-shadows/${base}.mp4`, five Whisper extensions under `paths.transcripts`, and a regex sweep of `recordings/-chapters/`. Note the inconsistency inside a single function: transcripts go through `paths.transcripts`, shadows are `path.join(paths.project, 'recording-shadows')` — a raw literal. `getProjectPaths()` (`shared/paths.ts`) **has no `shadows` entry at all**, so `'recording-shadows'` is a magic string in at least six files today (`WatcherManager.ts:151`, `projectStats.ts:139`, `diskUtils.ts:128,135`, `shadowFiles.ts:273`, `safeMigration.ts`). Meanwhile `paths.safe` — the folder FR-111 abolished — is *still* in the interface at `shared/paths.ts:14,40`.

### E. The `shared/` workspace is not a package

`shared/package.json` declares `"main": "types.ts"` — pointing at a **TypeScript source file**. Server code reaches it by relative path (`import … from '../../shared/types.js'`). `f3506fd` resolved the resulting build failure by **commenting out `rootDir`** in `server/tsconfig.json`; the commented line is still there. Compiled outputs are **committed to git** (`shared/types.js`, `types.d.ts`, `naming.js`, `naming.d.ts`, `paths.js`, `paths.d.ts`, `constants.js`, `constants.d.ts`) and were hand-edited alongside their sources in this era (`95db6ac` touched `paths.ts` + `paths.js` + `paths.d.ts`; `c1617a6` touched `naming.ts` + `naming.js` + `naming.d.ts`).

They are now badly stale: `shared/types.ts` is **1,410 lines** (last changed 2026-04-14) while the committed `shared/types.d.ts` is **704 lines** (last changed 2026-02-26) and `shared/types.js` is **25 lines** (last changed 2026-02-13). *Uncertain:* I did not run the build or trace module resolution, so I cannot say whether these stale artifacts are ever actually loaded at runtime — that check would look identical whether they are live or inert. What is certain is that four out-of-date copies of the type contract are tracked in the repo and can be read by a human or an agent as authoritative.

### F. HTTP 200 for everything; `{ success, error }` as the wire protocol

Established earlier, cemented here. Every new route in `manage.ts` returns `res.json({ success: false, error: '…' })` with a 200 status — including validation failures (`manage.ts`, FR-140 `rename-chapter`: invalid chapter numbers, same-chapter, no files found). Consequence: no HTTP-layer error handling is possible; React Query cannot distinguish failure from success; every call site must unwrap `success` by hand.

### G. Socket.io as an untyped, unscoped broadcast bus

Eight `regen:*` events added (`shared/types.ts` `ServerToClientEvents`, 21 → 29 events over the era). One of them is typed `(data: { shadows: any; transcripts: any; chapters: any })` — `any` in the shared contract. All are `io.emit` (global broadcast), none carry a project code. The **only** invalidation signal for most of the app is the coarse `'recordings:changed'`, which `28d8f12` then reused to refresh the Developer Drawer — a debug tool riding the same channel as the domain.

### H. FR-number-as-identity

`8fa159f` made the PRD file the handoff artifact. From then on the FR number is the commit prefix, the code comment, the changelog row, the socket event comment and the log prefix (`console.log('[FR-130] …')`, `console.warn('[FR-111] …')`). Today `grep -c "FR-" shared/types.ts` style tagging is everywhere. Consequence: the code is annotated with **why it was requested**, never with **what it does now** — and when an FR is superseded (FR-131 Phase 2 → FR-136; FR-122/124 → FR-126 → nothing), the tag becomes a pointer into a document tree that no longer describes the system.

### I. Implicit selection scope on destructive operations

`SelectionBadge` reads *"All files (26)"* when nothing is selected, and `RegenToolbar.tsx:158` passes `undefined` as the target list in that case, which the server reads as "everything". So the **default** state of the Manage panel targets every file in the project with regen, bulk rename and clean operations. Still true today.

### J. Zero tests, for the whole era

34 commits, +12,786 lines of app code, a hand-rolled 3-phase chapter swap, a rename that deletes irreplaceable-if-wrong derivatives, and a state file with no schema validation — shipped without a single automated test. `ConfirmationModal` (`5ba69b1`) is the substitute: the safety mechanism was a dialog, not a test.

---

## What a rebuild should learn from this era

1. **Give a recording a stable identity that is not its filename.** A ULID in the state file, filename as an attribute. That single change deletes `migrateRecordingKey`, deletes the manifest-patching in rename, makes external renames survivable, and makes "who is this file" answerable without parsing.

2. **Make the project an explicit parameter, never ambient.** Every route, every queued job, every socket emit carries a project code. Delete `getConfig().projectDirectory` from handler bodies. The two bugs that bracket this era (FR-109 and `225053c`) both disappear, and so does `videoPath.split(path.sep).indexOf('recordings')`.

3. **Name the "derived artifact" concept and put it in a registry.** One table: `{ kind, dirKey, extensions[], regenerate(fn) }` for shadow / transcript / chapter-video / chapter-srt. `deleteDerivableFiles`, `regenerateDerivableFiles`, the four regen tools and the disk accounting all become loops over that table. Add `shadows` to `getProjectPaths()`; remove `safe`.

4. **Never hand-maintain a serialisation allowlist.** `saveConfig` (≥9 patch commits) and `writeProjectState` (2) both failed the same way. Define the config and state schemas once (Zod or equivalent), parse on read, serialise the whole validated object on write. This is the highest-frequency bug class in the entire era.

5. **Version state files for real, or not at all.** `version: 1` that is checked, never incremented, and whose mismatch path returns empty and then overwrites, is worse than no version field. Either write migrations or drop the field.

6. **Anything that describes the API must be generated from the API.** `apiRegistry.ts` was accurate for exactly one day. Derive the registry from the router, or delete the explorer.

7. **One state store per project, inside the project.** Project stage, priority, dictionary, per-recording flags — all of it in the project folder. Nothing about a project in the machine's global config. This is the precondition for the relay/multi-machine work that came next.

8. **Extract shared interaction primitives on the second use, not the thirteenth.** One `useEscapeKey`, one `useVideoPlayer`, one video endpoint. The evidence that this was cheap and skipped: FR-128's commit *says* "cloned from IncomingVideoModal", and the consolidation happened anyway eleven weeks later at higher cost.

9. **HTTP status codes are part of the contract.** 4xx for validation, 5xx for failure, body for detail. Drop `{ success: false }` at 200.

10. **Scope socket events by project and type them properly.** No `any` in `ServerToClientEvents`. No global broadcast for project-scoped work. Do not let a debug drawer subscribe to a domain event.

11. **Do not generate four design systems.** Generate one, in the real stack, on a real screen. The 15,087-line exploration produced zero adopted decisions; the design that shipped came from a different process 2.5 months later.

12. **Validate the measurement before writing the requirement.** NFR-141 was specced, handed over, then cancelled because the scanner reporting 1,805 issues actually had 391. The scanner had no tests either.

13. **Write commit messages you could audit.** `699385b` claims four deletions that never existed. If commit history is the archaeology, fabricated history is the most expensive kind of debt — it is debt that looks like knowledge.

14. **Keep session artefacts out of the repo root**, and out of git entirely unless they are durable. `AGENTS.md`, `HANDOVER-JAN.md`, `BRIEF-*.md` all came and went.

15. **Let the doc:code ratio be a smoke alarm.** 3.9:1, ending with `.claudeignore` to hide docs from the tool that wrote them, followed by a 30-day stall. The docs were not the problem; the absence of anything that *executed* (tests, schema validation, generated registries) meant documents were the only artefact that could be produced.
