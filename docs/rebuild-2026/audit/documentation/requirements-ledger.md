# Requirements Ledger — what FliHub actually built

**Audit date:** 2026-08-26 · **Scope:** `docs/` (255 files at audit start; the tree was being written to concurrently by sibling audit agents) + `git log` (203 commits) + `client/src`, `server/src`, `shared`
**Method:** every `FR-nnn` / `NFR-nnn` / `B0nn` token in `docs/` enumerated, then cross-referenced against commit subjects and code annotations.
**Purpose:** this is a *rebuild* input. The question is not "what shipped" but "which specs are worth carrying forward, and what did the tracking system itself get wrong".

---

## The headline

**There was never one ledger. There were seven, and no two agreed.**

| # | Ledger | ID scheme | Owns | Last updated | Still live? |
|---|---|---|---|---|---|
| 1 | `docs/prd/recording-namer-poc.md` §"Requirements" | `FR-1`..`FR-7` | the PoC user stories | pre-rename era | dead |
| 2 | `docs/current-state.md` | `FR-36`..`FR-51` | one-line table cells | **2025-12-05** (says so on line 3) | dead but load-bearing |
| 3 | `docs/archive/requirements-2025-q4.md` | `FR-8`..`FR-88`, `NFR-65`..`NFR-87` | numbered backlog table + full specs | 2025-12-16 | archived |
| 4 | `docs/backlog.md` | `FR-31`..`FR-153`, `NFR-65`..`NFR-146` | the "official" index | commit `a039d8a`, 2026-04-12 | stale-but-edited |
| 5 | `docs/changelog.md` + `archive/changelog-2025-q4.md` | per-item `### FR-nnn` history | narrative of what landed | commit `7409704`, 2026-04-08 | abandoned |
| 6 | `docs/planning/BACKLOG.md` | `B001`..`B072` | the actual work queue from Mar 2026 on | commit `4332504`, 2026-04-14 | live |
| 7 | `docs/planning/<campaign>/IMPLEMENTATION_PLAN.md` (27 campaign folders) | `WU-1`, `WU-B1`, wave numbers | what agents actually executed | 2026-04-16 | live |

Plus two more partial namespaces: `F001`..`F013` (user feedback, `docs/planning/flihub-feedback.md`) and `I-n`/`R-n`/`P-n`/`C-n` (UX review, `docs/prd/ux-improvements.md`).

Nothing reconciles these. `docs/backlog.md:83` says **NFR-146 (Test Coverage Foundation) is `Pending`**; `docs/planning/BACKLOG.md:138` says it shipped 2026-03-16; the repo has **41 test files and 942 `it()`/`test()` blocks** wired into `npm test` across all three workspaces (`package.json`). The backlog file was edited on 2026-04-12 — a month after — and the row was not touched.

---

## Hard counts

| Metric | Count |
|---|---|
| Distinct `FR-`/`NFR-` ids referenced anywhere in `docs/` | **167** (144 FR + 23 NFR) |
| PRD files in `docs/prd/` matching an id | **65** |
| Ids with **no** PRD file | **102** |
| Ids named in a git commit subject | 65 |
| Ids annotated in shipped code (`// FR-nnn:`) | 134 |
| Rows in `docs/backlog.md` | 57 FR + 9 NFR = 66 |
| `✓`/Implemented rows in `docs/backlog.md` | 38 |
| `B0nn` ids in `docs/planning/BACKLOG.md` | 71 distinct, spanning B001–B072 (only B007 unused) |
| Campaign folders under `docs/planning/` | 27 (plus 26 loose planning `.md` files, incl. `AGENTS.md` + `BACKLOG.md`) |
| **Ids that exist ONLY in code + commit subjects (no doc row anywhere)** | **16** |
| **Ids claimed complete with no code annotation** (annotation absence ≠ feature absence — see caveat) | 18 |
| Ids never built / deferred / cancelled | 22 |

### Numbering: the "gaps" are not gaps

The brief listed FR-65–68, 79, 81, 85, 86, 146 as missing. **They are not missing — they were consumed by the NFR series.** From FR-64 onward, FR and NFR draw from *one shared counter*: `NFR-65`, `NFR-66`, `NFR-67`, `NFR-68`, `FR-69`, `FR-70`, `FR-71`, `FR-72`, `NFR-79`, `FR-80`, `NFR-81`, `FR-82`… (`docs/archive/requirements-2025-q4.md:43-65`, the rows are numbered 43–65 in sequence).

That rule was then broken **twice**:
- **87** — `FR-87: GitHub Repo Link in Cog Menu` (`docs/archive/requirements-2025-q4.md:120`) **and** `NFR-87: Starred Projects Visual Update` (`docs/backlog.md:85`) are two different requirements sharing a number.
- **141** — `FR-141: Export & S3 Workflow Overhaul` **and** `NFR-141: Lenient Tag Parser` (cancelled). Both have handover docs: `docs/planning/developer-handover-fr-141.md` and `docs/planning/developer-handover-nfr-141.md`.

(Numbers 1–12 also collide, but harmlessly — FR and NFR were genuinely separate sequences before the merge.)

**Real holes after that correction (searching all of `docs/` except this audit folder): 95, 96, 97, 99, 100, 104, 129.**

| Number | What actually happened |
|---|---|
| 95, 96, 97, 99, 100 | **Shipped.** Annotated in code, named in commits `a8fbc9b`, `ec89018`, `7c2048a`, `cb4567d` (all 2025-12-16). Never written into any backlog, PRD or changelog. |
| 104 | **Shipped and now dead.** Only trace anywhere: `server/src/utils/s3Utils.ts:3` — `// FR-104: S3 Staging Migration Tool`. |
| 129 | **A true skipped number.** No PRD, no commit, no code, no doc row. |

Add FR-98, FR-101, FR-102, FR-103 (which *are* in docs, but only as passing cross-references, never as their own row) and the picture is: **FR-90 through FR-104 is a fifteen-requirement band that exists almost entirely in code comments and commit subjects.** That band is where Windows support, telemetry, Whisper output cleanup, the Gling dictionary and the whole S3 staging subsystem live.

---

## The five states, with evidence

### (a) Shipped and in use — 88 rows verdict `shipped`

The load-bearing spine: FR-1..FR-64 (naming, watcher, projects, assets, thumbs, transcription, chapters, inbox), FR-69..FR-88 (watch page, shadows, stage model, dual transcripts), FR-105..FR-128, FR-136..FR-153, plus NFR-1..NFR-12. Verified live-wired examples:
- `FR-144` POEM WUI intake — `client/src/components/PoemWuiPage.tsx:1`, `server/src/index.ts:300`, reachable via ManagePanel tool `'awb'` (`ManagePanel.tsx:644`).
- `FR-153` Storage Workflow Redesign — `client/src/components/shared/StoragePanel.tsx:51`, rendered at `ManagePanel.tsx:647`. **`docs/backlog.md:21` still says `Pending`.** Note the storage-panel campaign folder (`docs/planning/storage-panel/`) never once mentions FR-153 — it tracks `WU1`/`WU2` instead.
- `FR-53` ASCII report formatter — alive and used by four query routes (`server/src/routes/query/projects.ts:233,351`, `query/export.ts:291`, `query/chapters.ts:110`).

### (b) Shipped but dead — nothing in the UI reaches it

| Thing | Evidence | Orphaned by |
|---|---|---|
| `client/src/components/ProjectStatsPopup.tsx` — **955 lines**, contains the FR-34 chapter-timestamp display | zero importers (`grep -rn ProjectStatsPopup client/src server/src shared` returns only the file itself) | `7afcabf` (2026-03-30, FR-148 project list redesign) |
| `client/src/components/shared/RegenToolbar.tsx` — **415 lines**, the FR-131 Phase 2 "Regeneration Toolbar" | zero importers, and not exported from `client/src/components/shared/index.ts` | `1b436e2` (2026-03-22, B041 manage page redesign) |
| `extractBrand()` + `categorizeMigrationFiles()` in `server/src/utils/s3Utils.ts` — FR-103/104/105 | zero non-test callers; only `isPathWithinProject` is still imported (`server/src/utils/safeDelete.ts:6`) | B039 "retire S3" + FR-141 consolidation |

Two second-order effects worth carrying into the rebuild:
1. **The Warm Linen theme campaign (B048, `fb99b1b`, 2026-03-24) repainted `RegenToolbar.tsx` — dead code — as part of a 500+ class sweep.** Dead code cost real campaign budget.
2. **`server/src/test/s3Utils.test.ts` still tests a retired feature.** The test suite pins FR-103/104/105 in place; `B023` (open) notes `server/src/test/sample.test.ts` is *still* the `1+1=2` placeholder — verified, it is.

### (c) Claimed complete but the claim is thinner than it looks

**Caveat first, because it matters:** the `// FR-nnn:` annotation convention was applied inconsistently. **A missing annotation is NOT evidence the feature is missing** — `FR-143` (SRT clipboard) has no annotation but `client/src/components/shared/GlingEditTool.tsx:139-171` clearly implements clipboard copies; `FR-153` has no annotation but is demonstrably built. For the 18 "claimed done, no code annotation" rows, absence and presence look identical from a grep. I did not verify all 18.

What I *did* verify as genuinely mis-stated:

| Claim | Where | Reality |
|---|---|---|
| `NFR-146` Test Coverage Foundation — `Pending` | `docs/backlog.md:83` | Shipped 2026-03-16 (`docs/planning/BACKLOG.md:138`). 41 test files, 942 test blocks, all 3 workspaces in `npm test`. |
| `NFR-65` Extract Shared Server Utilities — `Pending` | `docs/backlog.md:91` | "absorbed and completed by B019" (`docs/planning/BACKLOG.md:137`), and `NFR-65:` annotations exist in `client/src/utils/formatting.ts:104`, `server/src/utils/chapterRecording.ts:508`, `server/src/utils/scanning.ts:141`. |
| `NFR-68` Split Query Routes — `Pending` | `docs/backlog.md:88` | Done in commit `e2ef9d0` (2025-12-14). `server/src/routes/query/` has 8 sub-modules, each headed `// NFR-68: Query Routes - …`. |
| `NFR-66` / `NFR-67` — `Pending` | `docs/backlog.md:90,89` | **Partially** applied. Annotations are widespread (`useRecordingsApi.ts:68,84,100,116,132,156`; `server/src/utils/filesystem.ts:2`) but `docs/planning/BACKLOG.md:51` records "281 inconsistent [error] formats" remaining. Genuinely half-done — the row is not wrong so much as unhelpful. |
| `FR-139` Folders Tool — `✓ Implemented` | `docs/backlog.md:33` | Implemented, then the button was deleted. `docs/changelog.md:96` — "FR-139: Folders Tool — Remove Undefined Button… Verified already removed". `docs/planning/BACKLOG.md:145` calls it "Folders Tool (stub/removed from Manage panel)". Same id, three statuses. |
| `FR-131 Phase 2` — three-way disagreement | see below | `docs/changelog.md:388` says "2026-01-04 Implemented"; `docs/backlog.md:41` says "Phase 2 Pending"; `docs/planning/BACKLOG.md:100` says B002 **Deferred**. The code (`RegenToolbar.tsx`) exists and is dead. All three are arguably right about different things. |
| `B068`/`B069`/`B070` — `[ ]` open | `docs/planning/BACKLOG.md:79-81` | **Built.** `RecordingVideoModal.tsx:16-61` (B069 prev/next + B070 dictionary), `VideoPlayerModal.tsx:118-123` (arrow-key nav), `WatchPage.tsx:47,174` (B068 `useVideoPlayback`), `shared/DictionaryQuickAdd.tsx`, `shared/SpeedControl.tsx`, `shared/PlayPauseButton.tsx`, `shared/VideoControlsBar.tsx`. Landed in `8f29c31` (2026-04-14, "chore: checkpoint WIP") — a *chore* commit, so the ledger never learned. |

### (d) Specced and never built

`FR-31` (Enhanced Project View with DAM — `Future` since 2025-12-02), `FR-34 Phase 3` (chapter timing verification — rejected as B006), `FR-93` (Windows path display — rejected B004), `FR-89 parts 1b/2` (cross-platform — rejected B005), `FR-132` (Dual Transcription + progress — full 1300-line PRD, never started, B001 still open), `FR-133` (File Status Indicators — deferred B016), `FR-134` (Inconsistency Detection — deferred B015), `FR-135` (Chapter Tools Move/Swap/Undo — deferred B014; the only trace in code is `server/src/scripts/scanProjects.ts:355` suggesting users "Use FR-135 to reorganize chapters", i.e. **the scanner emits advice pointing at a feature that does not exist**), `FR-150` (Groq engine — deferred), `NFR-81`, `NFR-86`, `FR-154` (project triage endpoint — proposed only, in an *untracked* file `docs/triage-answers-to-flihub-questions.md:136`).

### (e) Cancelled / superseded

`NFR-141` Lenient Tag Parser — the only formally cancelled requirement (`docs/backlog.md:84`: "Based on incorrect scanner analysis"). `FR-122`/`FR-124` Export Panel — superseded by FR-141 (`docs/planning/BACKLOG.md:154,156` annotate them as such, `docs/backlog.md` does not). `FR-105` S3 DAM — superseded by relay (B038/B039) but never marked.

---

## Recovered: every KEYBOARD CONTROL and SHORTCUT ever requested

Swept from every FR/NFR/B description, PRD, brainstorm and spec. **Built** = verified in code today.

### Built and live (9)

| Shortcut | Where | Evidence |
|---|---|---|
| `Space` — play/pause | any video (Watch page, all video modals) | `client/src/hooks/useVideoPlayback.ts:77` |
| `Escape` — close | video player, drawers, modals, dropdowns | `useVideoPlayback.ts:80`; also 9 independent handlers: `DeveloperDrawer.tsx:63`, `VideoTranscriptModal.tsx:73`, `HeaderDropdown.tsx:39`, `ProjectDeleteModal.tsx:39`, `ChapterRecordingModal.tsx:83`, `ProjectDrawer.tsx:98`, `HoldDeleteModal.tsx:48`, `FileViewerModal.tsx:52`, `ConfirmationModal.tsx:53` |
| `←` / `→` — prev/next recording | `VideoPlayerModal` (Recordings modal) | `client/src/components/shared/VideoPlayerModal.tsx:118,123` (B069) |
| `Shift` + hover — full-size image preview | Assets, Thumbs | `client/src/hooks/useShiftHover.ts:61-64` (FR-20) |
| `Shift` + click — range-select thumbnails | Thumbs page | `client/src/components/ThumbsPage.tsx:171` |
| `Enter` / `Escape` — commit / cancel inline rename | Recordings inline editor | `client/src/components/shared/EditableFileRow.tsx:122,125` (B047) |
| `Enter` / `Escape` — batch toolbar | Recordings batch rename | `client/src/components/shared/BatchToolbar.tsx:100,105` |
| `Enter` — add dictionary word | Dictionary quick-add | `client/src/components/shared/DictionaryQuickAdd.tsx:77` (B070) |
| `Enter` — confirm | Clipboard paste modal, new-project input, common-names input | `ClipboardPasteModal.tsx:26`, `ProjectsPanel.tsx:967`, `ConfigPanel.tsx:1140` |

### Requested and NEVER built (14)

| Shortcut | Requested for | Source |
|---|---|---|
| `R` or `Enter` — rename selected recording | Recordings | `docs/prd/flihub-baku-spec.md:1393` |
| `S` — toggle safe | Recordings | `docs/prd/flihub-baku-spec.md:1394` |
| `P` — toggle parked | Recordings | `docs/prd/flihub-baku-spec.md:1395`; also `docs/prd/fr-123-per-segment-annotation.md:263` ("P to park") |
| `N` — add note / annotation | Recordings | `docs/prd/fr-123-per-segment-annotation.md:263` |
| `N` / `P` — next / prev recording **on the Watch page** | Watch | `docs/prd/flihub-baku-spec.md:1396` — note the ←/→ pair only exists inside the *modal*, never on Watch |
| `1`–`5` — playback speed presets | Watch | `docs/prd/flihub-baku-spec.md:1398` |
| `←` / `→` — skip ±10 s in video | Recording quick preview | `docs/prd/fr-128-recording-quick-preview.md:172` ("Nice to have", never ticked) |
| Click video body to toggle play/pause | Recording quick preview | `docs/prd/fr-128-recording-quick-preview.md:173` |
| `Cmd+M` — open Manage panel | global | `docs/prd/fr-131-manage-panel-bulk-rename.md:497` |
| `Cmd+E` — open Export/S3 tool | global | `docs/prd/fr-141-export-s3-workflow-overhaul.md:648` |
| `Ctrl+F` — search keys/values in the JSON viewer | Developer drawer | `docs/prd/fr-127-developer-drawer.md:229,522` |
| Keyboard shortcuts for common names (quick-fill pills) | Incoming | `docs/prd/fr-73-template-visibility-rules.md:223` |
| Keyboard shortcuts for speed changes | Incoming video preview | `docs/prd/fr-106-incoming-video-preview.md:541` |
| `Shift+click` / `Ctrl+A` for selection | Recordings batch selection | `docs/planning/recording-editor/audit-architecture.md:296` |
| "Keyboard shortcuts for fast naming" (unscoped) | the original PoC's stated next step | `docs/prd/recording-namer-poc.md:496` |

**Also never done, and repeatedly promised:** full keyboard *accessibility* (tab order, ARIA) of the Manage panel. `docs/prd/fr-136-tool-oriented-manage-panel.md:396,654,775` all list it; `:932` closes it out with "❌ Keyboard accessibility partially working (ESC works, tab navigation not tested)".

**The pattern:** every shortcut that shipped is a *modal-local* one — Escape, Enter, Space, arrows-inside-a-modal. **Not one global or page-level shortcut was ever built.** There is no key-binding registry, no `useHotkeys`, no shortcut help overlay anywhere in `client/src`. Each of the 9 shipped bindings is a hand-rolled `document.addEventListener('keydown', …)` in its own component — which is exactly why "keyboard accessibility" kept being re-promised and never landed: there was nowhere to put it.

---

## Recovered: every VISUALISATION ever requested

### Built (13)

| Visualisation | Where |
|---|---|
| Relay Kanban — 4 workflow lanes | `client/src/components/shared/relay/KanbanLane.tsx`, `FinalLane.tsx` (B060) |
| Relay activity feed | `shared/relay/ActivityFeed.tsx` (B046) |
| Storage tree (recursive folder breakdown) | `shared/storage/StorageTree.tsx` (FR-153) |
| Storage activity log | `shared/storage/StorageActivityFeed.tsx` |
| Disk-space columns (REC/TRASH/SHADOWS/OTHER/R-REC/R-1ST/R-2ND/TOTAL) + thresholds + tfoot totals | B063/B065, `docs/planning/BACKLOG.md:121,119` |
| Transcription progress bar | `client/src/components/TranscriptionProgressBar.tsx` (FR-52) |
| Transcript sync highlighting (segment + chapter level) | `TranscriptSyncPanel.tsx`, `TranscriptSyncModal.tsx` (FR-75/FR-77) |
| Chapter navigation panel | `ChapterPanel.tsx`, `ChapterContextPanel.tsx` (FR-56/FR-115) |
| ASCII report formatter (terminal/LLM-readable tables) | `server/src/utils/reporters.ts`, `formatters.ts` (FR-53) |
| Stage pills | `client/src/constants/stages.ts` (FR-80/FR-110/FR-149) |
| Header status pills — Sync / Relay / SSD | `shared/SyncIndicator.tsx`, `RelayIndicator.tsx`, `SsdIndicator.tsx` |
| Shift-hover full-size image overlay | `ImagePreviewOverlay.tsx` (FR-20) |
| Filterable project table + detail drawer | `ProjectsPanel.tsx` + `ProjectDrawer.tsx` (FR-148) |

### Requested and NEVER built (11)

| Visualisation | Source |
|---|---|
| Transcript-completion **micro-bar** in each project-list row (replacing the raw `%`) | `docs/prd/flihub-v2-requirements.md:974`; `docs/prd/flihub-baku-spec.md:1380` |
| Distinct stage **colours + legend** ("current pills are hard to distinguish at scale") | `docs/prd/flihub-v2-requirements.md:972`; `flihub-baku-spec.md` §14.1 |
| "Needs attention" **row highlight** for diverged relay projects | `docs/prd/flihub-v2-requirements.md:976`; `flihub-baku-spec.md:1384` |
| Prominent "action required" state for incomplete T7 offloads (amber badge is too subtle) | `docs/prd/flihub-v2-requirements.md:984`; `flihub-baku-spec.md:1390` |
| Compact / comfortable **density toggle** for the recordings table | `docs/prd/flihub-v2-requirements.md:980`; `flihub-baku-spec.md:1386` |
| Provider comparison **dashboard** (MLX vs Groq) | `docs/prd/fr-132-dual-transcription-progress.md:50,1001` |
| Chart: average speedup by provider | `docs/prd/fr-132-dual-transcription-progress.md:1004` |
| Chart: accuracy distribution | `docs/prd/fr-132-dual-transcription-progress.md:1005` |
| Cost-tracking dashboard | `docs/prd/fr-132-dual-transcription-progress.md:1259,1292` |
| Chart visualisation in the Developer drawer (telemetry) | `docs/prd/fr-127-developer-drawer.md:535` |
| File-status badge / hover indicators (stale, orphaned, Groq-accuracy warnings) | `docs/prd/fr-133-file-status-indicators.md` — full PRD, deferred as B016 |
| Word-level asset placement visualisation ("how to visualize word-level assets in the UI?" — open question, never answered) | `docs/brainstorming-notes.md:66-71` |
| Recordings-page header stats redesign (explicitly asked for a designer; "feels like it grew organically") | `docs/brainstorming-notes.md:1724-1748` |

**The pattern:** every visualisation that shipped is **structural** (a tree, a lane, a table, a pill). **Not one quantitative visualisation was ever built** — no bar, no chart, no sparkline, no distribution. Every request for one (micro-bar, speedup chart, accuracy distribution, cost dashboard, telemetry chart) is still open. The telemetry data to feed them has been collected since 2025-12-16 (`server/src/utils/telemetry.ts:2`, FR-99) and has never been rendered.

---

## What to carry into the rebuild

### Keep — genuinely worth reading again

| Path | Why |
|---|---|
| `docs/prd/flihub-baku-spec.md` | The only document that describes the **whole** app as one system rather than as a diff. ~1,400 lines, written as a build brief, with an explicit §15 "Out of Scope" that already made the cancel decisions. This is the rebuild's starting spec. |
| `docs/prd/flihub-v2-requirements.md` | The same content in a tighter register, with §9 "v2 Improvements" (8 numbered, all still unbuilt) and §10 "Out of Scope for v2". Cross-check against baku; where they disagree, that disagreement is a decision that was never made. |
| `docs/prd/fr-132-dual-transcription-progress.md` | ~1,300 lines, never implemented, still the best statement of the transcription problem (dual provider, progress, telemetry, cost). Carries the only quantitative-visualisation spec in the repo. |
| `docs/prd/fr-153-storage-workflow-redesign.md` + `docs/planning/storage-panel/IMPLEMENTATION_PLAN.md` | The newest and cleanest thinking in the repo — an explicit state machine (Local / Held / Archived) with named transitions and numbered open questions. The one place a domain concept got *named* before being coded. |
| `docs/prd/fr-137-slideout-drawer-pattern.md` | The only PRD that specifies a **pattern** rather than a feature. It is why drawers are consistent; its absence is why keyboard handling is not. Rebuild needs its sibling: a shortcut/keymap pattern doc. |
| `docs/architecture/naming-rules-reference.md` + `docs/architecture/naming-decisions.md` | The naming convention is the app's actual domain model. These two are the canonical statement of it and the reasoning behind it. |
| `docs/planning/flihub-feedback.md` | 13 items of *real user friction* (F001–F013) with the fix and campaign for each. This is the only ledger written from the user's side rather than the builder's. |
| `docs/prd/ux-improvements.md` | The I/R/P/C review. Small, concrete, mostly still true, and several items are still open. |
| `docs/planning/requirements-relay-collaboration.md` + `docs/planning/relay-workflow-diagrams.md` | The multi-machine collaboration model (creator/editor roles, push/collect, divergence). The hardest-won domain knowledge in the project. |
| `docs/brainstorming-notes.md` §"Word-Level Transcript Features" (lines 9–71) | An unbuilt vision with a clear dependency chain (FR-74→77 built; the payoff never was). Decide in the rebuild whether it is in or out — do not let it drift again. |

### Do NOT carry

| Path | Why |
|---|---|
| `docs/current-state.md` | Stamped 2025-12-05, calls the app "Recording Namer" (renamed 2025-12-14 by FR-62), points at `/docs/recording-namer/` paths that no longer exist — **and is the sole definition of FR-36 through FR-51.** Mine it once for those 16 titles, then delete it. |
| `docs/backlog.md` | Contradicts `docs/planning/BACKLOG.md` on at least 6 rows and was edited *after* the contradictions appeared. Untrustworthy as status. |
| `docs/changelog.md` | Per-item history stops at FR-147 (2026-03-25). Everything from B063 onward — disk observability, archive offload, archive tool, storage panel — is absent. |
| `docs/analysis/` (scanner + discrepancies) | The scanner it describes was found buggy on 2026-01-06 (`docs/planning/po-session-2026-01-06-scanner-correction.md`); its output caused NFR-141 to be specced and then cancelled. Historical interest only. |

### Rebuild implications

1. **One ledger, or none.** Seven partial ledgers produced a state where the *most recently edited* status file was also the *most wrong*. If the rebuild tracks requirements, one file owns status and everything else links to it. If it does not, drop the ids entirely and track by campaign — which is what actually happened from March 2026 onward and worked better.
2. **The id must not be the only home of a requirement.** FR-36..FR-51 and FR-90..FR-104 — 31 requirements, roughly a fifth of the total — exist only as a table cell or a code comment. A requirement whose only durable artifact is `// FR-97:` in a route file cannot be reviewed, tested, or retired.
3. **Numbering: never share a counter between two prefixes.** The FR/NFR merge at 65 makes every gap ambiguous, and it broke twice anyway (87, 141). It also collides with the domain: FliVideo project codes are `B59`, `B66`, `B475` — the *same shape* as backlog ids `B059`, `B066`. `docs/prd/fr-149-stage-system-changes.md:87` reads "B68/B69 can be set to Remix" (projects) while `docs/planning/BACKLOG.md:79-80` defines B068/B069 as video-control work items. Zero-padding is the only thing separating them, and it is applied inconsistently.
4. **"Complete" needs a definition that includes removal.** FR-139 is simultaneously implemented, removed and a stub. FR-131 Phase 2 is implemented, pending and deferred. A status field with no "superseded by" or "removed in" transition cannot express what actually happened, so it just goes stale.
5. **A build system that leaves dead code costs money later.** `ProjectStatsPopup.tsx` (955 lines) and `RegenToolbar.tsx` (415 lines) have zero importers; `RegenToolbar` was repainted by the Warm Linen campaign three months *after* it was orphaned. Nothing in the pipeline detects an unreferenced component.
6. **Build the keyboard layer as a layer, once.** Nine hand-rolled `keydown` listeners shipped; fourteen requested shortcuts did not; "keyboard accessibility" was promised in three separate FRs and closed as ❌. There is no keymap registry in the codebase. The rebuild should establish one before the first shortcut.
7. **Telemetry with no renderer is not observability.** FR-99 has been writing `telemetry.jsonl` since 2025-12-16. Every chart that would read it (FR-132 Phase 3, FR-127 §535) is unbuilt. Either render it or stop collecting it.

---

## Full ledger

Verdicts in this table are **derived** from the three mechanical columns (documented status × commit subject × code annotation), not individually verified. Treat them as a triage sort, not a finding. **Critically: the `// FR-nnn:` annotation convention was applied inconsistently, so a `—` in "Code trace" is NOT evidence the feature is absent** — FR-143 and FR-153 both have no annotation and both demonstrably exist. Rows I verified by hand are called out in the sections above.

| ID | Title | Spec home | Claimed status | Commit | Code trace | Derived verdict |
|---|---|---|---|---|---|---|
| FR-1 | File watcher (Ecamm) | prd/recording-namer-poc.md | Watches for new recordings | — | yes | — |
| FR-2 | Rename with naming convention | current-state.md | `{chapter}-{sequence}-{name}-{tags}.mov` | — | yes | — |
| FR-3 | New Chapter button (increments chapter, resets seq) | **NONE** | — | — | yes | **undocumented — code/commit only** |
| FR-4 | As a content creator, I should be able to open the applicati | prd/recording-namer-poc.md | — | — | yes | — |
| FR-5 | Trash Folder | changelog only | logged in changelog | — | yes | **undocumented — code/commit only** |
| FR-6 | As a content creator, if I click "Discard" on an incoming fi | prd/recording-namer-poc.md | — | — | — | — |
| FR-7 | File size + duration + good-take highlight on incoming | **NONE** | — | — | — | **undocumented — code/commit only** |
| FR-8 | Good Take Algorithm | archive/req-2025-q4 | ✅ v2 Implemented 2025-11-29 | — | yes | shipped |
| FR-9 | Default port 5100 | archive/req-2025-q4 | ✅ Implemented 2025-11-29 | — | — | claimed done, no code annotation* |
| FR-10 | Project List Panel | archive/req-2025-q4 | ✅ Implemented 2025-11-29 | — | yes | shipped |
| FR-11 | Project Selector/Switcher | archive/req-2025-q4 | ✅ Implemented 2025-11-29 | — | yes | shipped |
| FR-12 | Create New Project | archive/req-2025-q4 | ✅ Implemented 2025-11-29 | — | yes | shipped |
| FR-13 | Common Names Quick-Select UI | archive/req-2025-q4 | ✅ Implemented 2025-11-29 | — | yes | shipped |
| FR-14 | Recordings Asset View | archive/req-2025-q4 | ✅ Implemented 2025-11-29 | — | yes | shipped |
| FR-15 | Move to Safe | archive/req-2025-q4 | ✅ Implemented 2025-11-30 | — | yes | shipped |
| FR-16 | Discard Remaining Files Prompt | archive/req-2025-q4 | ✅ Implemented 2025-11-29 | — | yes | shipped |
| FR-17 | Image Asset Management Page | archive/req-2025-q4 | ✅ Implemented 2025-11-29 | — | yes | shipped |
| FR-18 | Image Duplicate Detection | archive/req-2025-q4 | ✅ Implemented 2025-11-29 | — | — | claimed done, no code annotation* |
| FR-19 | Image Variant Support (A/B/C) | archive/req-2025-q4 | ✅ Implemented 2025-11-29 | — | — | claimed done, no code annotation* |
| FR-20 | Image Quick Preview (Shift+Hover) | archive/req-2025-q4 | ✅ Implemented 2025-11-30 | — | yes | shipped |
| FR-21 | Custom Tag Input | archive/req-2025-q4 | ✅ Implemented 2025-12-01 | — | yes | shipped |
| FR-22 | Image Prompt Creation | archive/req-2025-q4 | ✅ Implemented 2025-12-01 | — | yes | shipped |
| FR-23 | Thumbnail Size Toggle | archive/req-2025-q4 | ✅ Implemented 2025-12-01 | — | yes | shipped |
| FR-24 | Image Source Directory in Config | archive/req-2025-q4 | ✅ Implemented 2025-12-01 | — | — | claimed done, no code annotation* |
| FR-25 | Assigned Assets Row Cleanup | archive/req-2025-q4 | ✅ Implemented 2025-12-01 | — | — | claimed done, no code annotation* |
| FR-26 | Paired Asset Display with Prompt Preview | archive/req-2025-q4 | ✅ Implemented 2025-12-01 | — | — | claimed done, no code annotation* |
| FR-27 | YouTube Thumbnails Page | archive/req-2025-q4 | ✅ Implemented 2025-12-01 | — | yes | shipped |
| FR-28 | Server Connection Indicator | archive/req-2025-q4 | ✅ Implemented 2025-12-01 | — | yes | shipped |
| FR-29 | Open Folder in Finder | archive/req-2025-q4 | ✅ Implemented 2025-12-01 | — | yes | shipped |
| FR-30 | Video Transcription | archive/req-2025-q4 | ✅ Implemented 2025-12-03 | — | yes | shipped |
| FR-31 | Enhanced Project View with DAM | backlog.md; archive/req-2025-q4 | Future | — | — | never built / deferred |
| FR-32 | Improved Project List Columns | archive/req-2025-q4 | ✅ Implemented 2025-12-03 | — | yes | shipped |
| FR-33 | Final Video & SRT Reference | archive/req-2025-q4 | ✅ Implemented 2025-12-03 | — | yes | shipped |
| FR-34 | Chapter Timestamp Extraction - Phase 3 | backlog.md; archive/req-2025-q4 | Future | — | yes | never built / deferred |
| FR-35 | Fix Chapter Grouping Logic + Total Duration | archive/req-2025-q4 | ✅ Implemented 2025-12-10 | — | yes | shipped |
| FR-36 | Duration on recordings | current-state.md | Shows video length everywhere | — | yes | — |
| FR-37 | Two-row header + project display | current-state.md | Breadcrumb style, gear for config | — | yes | — |
| FR-38 | Delete prompts | current-state.md | 🗑️ button or save empty | — | yes | — |
| FR-39 | Field persistence (Assets) | current-state.md | Remembers chapter/sequence/label | — | yes | — |
| FR-40 | Grab transcript button | current-state.md | One-click paste transcript to prompt | — | yes | — |
| FR-41 | Chapter timing calculations | current-state.md | Cumulative YouTube timestamps | — | yes | — |
| FR-42 | Clipboard paste images | current-state.md | Cmd+V to paste images | — | yes | — |
| FR-43 | Project switcher dropdown | current-state.md | Quick switch pinned projects | — | yes | — |
| FR-44 | Intentional project selection | current-state.md | Only code clickable, not whole row | — | — | — |
| FR-45 | In-app video playback | current-state.md | Modal player with speed control | — | — | — |
| FR-46 | Relative time display | current-state.md | "5s ago" on incoming files | — | yes | — |
| FR-47 | Rename chapter label | current-state.md | Rename all files in chapter | — | yes | — |
| FR-48 | Transcript sync validation | current-state.md | Proper matching, orphan detection | — | yes | — |
| FR-49 | Delete assigned images | current-state.md | 🗑️ button on image rows | — | yes | — |
| FR-50 | Undo last rename | current-state.md | Recent section on Incoming page | — | yes | — |
| FR-51 | Calendar copy | current-state.md | 📋 button copies project for calendar | — | yes | — |
| FR-52 | Transcription Progress Bar | archive/req-2025-q4 | ✅ Implemented 2025-12-05 | — | yes | shipped |
| FR-53 | ASCII Report Formatter | archive/req-2025-q4 | ✅ Implemented 2025-12-07 | — | yes | shipped |
| FR-54 | Naming Template Bugs | `prd/fr-54-naming-template-bugs.md`; backlog.md; archive/req-2025-q4 | ✓ Implemented (discovered in review) | — | yes | shipped |
| FR-55 | Video-Level Transcript Export | archive/req-2025-q4 | ✅ Implemented 2025-12-13 | — | yes | shipped |
| FR-56 | Chapter Navigation Panel | archive/req-2025-q4 | ✅ Implemented 2025-12-13 | — | yes | shipped |
| FR-57 | Parallelize ffprobe Calls | archive/req-2025-q4 | ✅ Implemented 2025-12-13 | — | yes | shipped |
| FR-58 | Chapter Recordings | archive/req-2025-q4 | ✅ Implemented 2025-12-14, Fixed 2025-12-15 | 4108f9e | yes | shipped |
| FR-59 | Inbox Tab | archive/req-2025-q4 | ✅ Implemented 2025-12-14 | 8829f2f | yes | shipped |
| FR-60 | FliHub Skill Updates | archive/req-2025-q4 | ✅ Implemented 2025-12-14 | — | — | claimed done, no code annotation* |
| FR-61 | Project Resolution Endpoint | archive/req-2025-q4 | ✅ Implemented 2025-12-14 | — | yes | shipped |
| FR-62 | Rename to FliHub | archive/req-2025-q4 | ✅ Implemented 2025-12-14 | — | — | claimed done, no code annotation* |
| FR-63 | Terminal Quick-Open Button | archive/req-2025-q4 | ✅ Implemented 2025-12-14 | — | — | claimed done, no code annotation* |
| FR-64 | Inbox File Viewer | archive/req-2025-q4 | ✅ Implemented 2025-12-14 | 8e24183 | yes | shipped |
| FR-69 | Header Dropdown Menus | `prd/fr-69-header-dropdown-menus.md`; backlog.md; archive/req-2025-q4 | ✓ Implemented | e2ef9d0 | yes | shipped |
| FR-70 | Video Watch Page (HTML5 player + chapter panel + Range streaming) | brainstorming-notes.md | — | e2ef9d0 | yes | — |
| FR-71 | Watch Page Enhancements | `prd/fr-71-watch-page-enhancements.md`; backlog.md; archive/req-2025-q4 | ✓ Implemented | — | yes | shipped |
| FR-72 | Fix Chapter Recording Codec Mismatch | archive/req-2025-q4 | ✅ Implemented 2025-12-15 | — | yes | shipped |
| FR-73 | Template Visibility Rules | `prd/fr-73-template-visibility-rules.md`; backlog.md; archive/req-2025-q4 | ✓ Implemented | — | yes | shipped |
| FR-74 | Dual Transcript Output - TXT + SRT | archive/req-2025-q4 | ✅ Implemented 2025-12-15 | 360c432 | yes | shipped |
| FR-75 | Transcript Sync Highlighting - Segments | archive/req-2025-q4 | ✅ Implemented 2025-12-15 | — | yes | shipped |
| FR-76 | Chapter SRT Generation | archive/req-2025-q4 | ✅ Implemented 2025-12-15 | — | yes | shipped |
| FR-77 | Transcript Sync Highlighting - Chapters | archive/req-2025-q4 | ✅ Implemented 2025-12-15 | — | yes | shipped |
| FR-78 | Transcript Stats Require SRT | archive/req-2025-q4 | ✅ Implemented 2025-12-15 | 360c432 | — | claimed done, no code annotation* |
| FR-80 | Enhanced Project List & Stage Model | `prd/fr-80-project-list-stage-model.md`; backlog.md; archive/req-2025-q4 | ✓ Implemented (via FR-82) | 4bc6130 | yes | shipped |
| FR-82 | Project List UX Fixes | archive/req-2025-q4 | ✅ Implemented 2025-12-15 | 8a47d09 | yes | shipped |
| FR-83 | Shadow Recording System | archive/req-2025-q4 | ✅ Implemented 2025-12-15 | 0d71b48 | yes | shipped |
| FR-84 | Cross-Platform Setup Guide | archive/req-2025-q4 | ✅ Implemented 2025-12-15 | 0d71b48 | — | claimed done, no code annotation* |
| FR-87 | GitHub Repo Link in Cog Menu | archive/req-2025-q4 | ✅ Implemented 2025-12-15 | 23fb6ca | — | claimed done, no code annotation* |
| FR-88 | Shadow Fallback in Recordings UI | archive/req-2025-q4 | Pending | 23fb6ca | yes | never built / deferred |
| FR-89 | Cross-Platform Path Support | `prd/fr-89-cross-platform-path-support.md`; backlog.md | Pending (Parts 1b, 2 await UAT) | b7762ff | yes | never built / deferred |
| FR-90 | Show All Active Watchers (Config panel) | changelog only | logged in changelog | 5777a80 | yes | **undocumented — code/commit only** |
| FR-91 | Fix Video Size Toggle (N/L/XL → N/L) | changelog only | logged in changelog | 5777a80 | yes | **undocumented — code/commit only** |
| FR-92 | Transcribe All Re-Transcribes Existing Files | `prd/fr-92-transcribe-all-skip-existing.md`; backlog.md | Implemented | b7762ff | yes | shipped |
| FR-93 | Project Name Shows Full Path on Windows | `prd/fr-93-windows-project-path-display.md`; backlog.md | Pending | a3683d8 | yes | never built / deferred |
| FR-94 | Transcription Progress State Bugs | `prd/fr-94-transcription-progress-bugs.md`; backlog.md | Implemented | a8fbc9b | yes | shipped |
| FR-95 | Recording + shadow file sizes in Recordings view | **NONE** | — | a8fbc9b | yes | **undocumented — code/commit only** |
| FR-96 | Environment detection / path-format mismatch warning | **NONE** | — | ec89018 | yes | **undocumented — code/commit only** |
| FR-97 | Fix hardcoded project path in shadow generation | **NONE** | — | 7c2048a | yes | **undocumented — code/commit only** |
| FR-98 | Whisper output-format cleanup (all → delete vtt/tsv) | **NONE** | — | ec89018 | yes | **undocumented — code/commit only** |
| FR-99 | Transcription telemetry logging (telemetry.jsonl) | **NONE** | — | ec89018 | yes | **undocumented — code/commit only** |
| FR-100 | Watch page next/prev navigation + Jan agent | **NONE** | — | cb4567d | yes | **undocumented — code/commit only** |
| FR-101 | Breadcrumb project display "b85 > Clauding 01" | **NONE** | — | b8088b8 | yes | **undocumented — code/commit only** |
| FR-102 | Global Gling dictionary in Config | **NONE** | — | — | yes | **undocumented — code/commit only** |
| FR-103 | S3 Staging page API | **NONE** | — | — | yes | **undocumented — code/commit only** |
| FR-104 | S3 Staging migration tool | **NONE** | — | — | yes | **undocumented — code/commit only** |
| FR-105 | S3 DAM Integration | `prd/fr-105-s3-dam-integration.md`; backlog.md | Implemented | 1e943b8 | yes | shipped |
| FR-106 | Incoming Video Preview | `prd/fr-106-incoming-video-preview.md`; backlog.md | Implemented | 8226ea8 | yes | shipped |
| FR-107 | Chapter Input Auto-Focus & Glow | `prd/fr-107-chapter-input-focus-glow.md`; backlog.md | Implemented | f2371b9 | yes | shipped |
| FR-108 | Gling Dictionary Not Saving | `prd/fr-108-gling-dictionary-save-bug.md`; backlog.md | Implemented | f2371b9 | yes | shipped |
| FR-109 | Transcript Management Bugs | `prd/fr-109-transcript-bugs.md`; backlog.md | Implemented | f2371b9 | yes | shipped |
| FR-110 | Project Stage Persistence & Dropdown | `prd/fr-110-project-stage-fixes.md`; backlog.md | Implemented | 95db6ac | yes | shipped |
| FR-111 | Safe Architecture Rework | `prd/fr-111-safe-architecture-rework.md`; backlog.md | Implemented (Phase 5 Future) | 95db6ac | yes | shipped |
| FR-112 | Sequential Chapter Increment | `prd/fr-112-sequential-chapter-increment.md`; backlog.md | ✓ Implemented | 95db6ac | yes | shipped |
| FR-113 | Edit Prep Path Fix & Folder Restructure | `prd/fr-113-first-edit-path-expansion.md`; backlog.md | ✓ Implemented | 2b0d9d1 | — | claimed done, no code annotation* |
| FR-114 | Projects Page - Transcript Quick Access | `prd/fr-114-transcript-quick-access.md`; backlog.md | ✓ Phase 1 Complete | dc713fb | yes | shipped |
| FR-115 | Incoming Page - Chapter Context Panel | `prd/fr-115-chapter-context-panel.md`; backlog.md | ✓ Implemented | — | yes | shipped |
| FR-116 | Incoming Page - Quick Config Access | `prd/fr-116-quick-config-access.md`; backlog.md | ✓ Implemented | 2b0d9d1 | yes | shipped |
| FR-117 | Hover UX Improvements | `prd/fr-117-hover-ux-improvements.md`; backlog.md | ✓ Implemented | 2b0d9d1 | yes | shipped |
| FR-118 | Project-Specific Gling Dictionary | `prd/fr-118-project-gling-dictionary.md`; backlog.md | ✓ Implemented | — | yes | shipped |
| FR-119 | API Documentation & Testing Page | `prd/fr-119-api-documentation-testing.md`; backlog.md | ✓ Implemented | 7a8c5a1 | yes | shipped |
| FR-120 | Parked Recording State | `prd/fr-120-parked-recording-state.md`; backlog.md | ✓ Implemented | — | yes | shipped |
| FR-121 | Parked State in Watch Panel | `prd/fr-121-parked-state-watch-panel.md`; backlog.md | ✓ Implemented | — | yes | shipped |
| FR-122 | Export Panel | `prd/fr-122-export-panel.md`; backlog.md | ✓ Implemented | — | yes | shipped |
| FR-123 | Watch Panel Enhancements | `prd/fr-123-per-segment-annotation.md`; backlog.md | ✓ Implemented | 7f1b996 | yes | shipped |
| FR-124 | Export Panel Enhancements | `prd/fr-124-export-panel-enhancements.md`; backlog.md | ✓ Implemented | — | yes | shipped |
| FR-125 | Config & EditPrep Consolidation | `prd/fr-125-config-editprep-consolidation.md`; backlog.md | ✓ Implemented | 7f1b996 | yes | shipped |
| FR-126 | Edit Folder Manifest & Cleanup | `prd/fr-126-edit-folder-manifest.md`; backlog.md | ✓ Implemented | 2350ebe | yes | shipped |
| FR-127 | Developer Drawer (Data Files Viewer) | `prd/fr-127-developer-drawer.md`; backlog.md | ✓ Implemented | 28d8f12 | yes | shipped |
| FR-128 | Recording Quick Preview | `prd/fr-128-recording-quick-preview.md`; backlog.md | ✓ Implemented | b991da9 | yes | shipped |
| FR-130 | Simplify Rename Logic (Delete+Regenerate) | `prd/fr-130-simplify-rename-delete-regenerate.md`; backlog.md | ✓ Implemented | fdc6aac | yes | shipped |
| FR-131 | Manage Panel with Bulk Rename & Regen Toolbar | `prd/fr-131-manage-panel-bulk-rename.md`; backlog.md | Phase 1 ✓ / Phase 2 Pending - See FR-136 for alter | fa81286 | yes | shipped |
| FR-132 | Dual Transcription System with Progress Tracking | `prd/fr-132-dual-transcription-progress.md`; backlog.md | Pending | — | — | never built / deferred |
| FR-133 | File Status Indicators | `prd/fr-133-file-status-indicators.md`; backlog.md | 🟢 LOW - Optional visibility tool | c1cee0e | — | never built / deferred |
| FR-134 | Inconsistency Detection & Auto-Fix | `prd/fr-134-inconsistency-detection.md`; backlog.md | 🟢 LOW - Optional preventative warnings | c1cee0e | — | never built / deferred |
| FR-135 | Chapter Tools (Move, Swap, Undo) | `prd/fr-135-chapter-tools.md`; backlog.md | 🟢 LOW - Ready but not urgent (No evidence of need) | c1cee0e | yes | never built / deferred |
| FR-136 | Tool-Oriented Manage Panel | `prd/fr-136-tool-oriented-manage-panel.md`; backlog.md | ✓ Complete (Core Architecture - See FR-137/138/139 | 3809e30 | yes | shipped |
| FR-137 | SlideOutDrawer Tool Pattern | `prd/fr-137-slideout-drawer-pattern.md`; backlog.md | ✓ Implemented (Documented retroactively) | 103ede0 | — | claimed done, no code annotation* |
| FR-138 | Rename Tool Specification | `prd/fr-138-rename-tool-specification.md`; backlog.md | ✓ Implemented (Validated - no updates needed) | — | yes | shipped |
| FR-139 | Folders Tool Specification | `prd/fr-139-folders-tool-specification.md`; backlog.md | ✓ Implemented | — | — | claimed done, no code annotation* |
| FR-140 | Chapter Move & Cascade Renumbering | `prd/fr-140-bulk-chapter-renumbering.md`; backlog.md | ✓ Implemented | 9f428c0 | yes | shipped |
| FR-141 | Export & S3 Workflow Overhaul | `prd/fr-141-export-s3-workflow-overhaul.md`; backlog.md | ✓ Implemented | 9f428c0 | yes | shipped |
| FR-142 | Split Export/S3 Tool: Separate Gling Prep from S3 Staging | `prd/fr-142-split-export-s3-tool.md`; backlog.md | ✓ Implemented | bc78182 | yes | shipped |
| FR-143 | SRT Clipboard Copy Button | `prd/fr-143-srt-clipboard.md`; backlog.md | ✓ Implemented | — | — | claimed done, no code annotation* |
| FR-144 | Send Transcript to POEM WUI Workflow Intake | `prd/fr-144-workflow-intake.md`; backlog.md | ✓ Implemented | a5a0504 | yes | shipped |
| FR-145 | Escape Key Closes Video Preview Modal | `prd/fr-145-escape-closes-video-modal.md`; backlog.md | ✓ Implemented | a5a0504 | — | claimed done, no code annotation* |
| FR-147 | Relay Project Awareness — Two-Pool Split | `prd/fr-147-relay-project-awareness.md`; backlog.md | ✓ Implemented | ed908f8 | yes | shipped |
| FR-148 | Project List Redesign — filterable table + detail drawer | `prd/fr-148-project-list-redesign.md` | — | 7afcabf | yes | — |
| FR-149 | Stage System Changes — Shelved, Remix, Drop Rev | `prd/fr-149-stage-system-changes.md`; backlog.md | ✓ Implemented | — | yes | shipped |
| FR-150 | Groq Transcription Engine | `prd/fr-150-groq-transcription.md`; backlog.md | Deferred (MLX path fix applied instead) | — | — | never built / deferred |
| FR-151 | Transcribe All Button in Project Slide-out | `prd/fr-151-transcribe-all-slideout.md`; backlog.md | ✓ Implemented | — | yes | shipped |
| FR-152 | Safe Project Delete | `prd/fr-152-safe-project-delete.md`; backlog.md | ✓ Implemented | — | yes | shipped |
| FR-153 | Storage Workflow Redesign — Hold, Archive, Restore | `prd/fr-153-storage-workflow-redesign.md`; backlog.md | Pending | — | — | never built / deferred |
| FR-154 | Project triage endpoint (proposed only) | **NONE** | — | — | — | **undocumented — code/commit only** |
| NFR-1 | Dynamic CORS origins | archive/req-2025-q4 | ✅ Implemented 2025-11-29 | — | yes | shipped |
| NFR-2 | Configurable tags via JSON | archive/req-2025-q4 | ✅ Implemented 2025-11-29 | — | yes | shipped |
| NFR-3 | Configurable common names with rules | archive/req-2025-q4 | ✅ Implemented 2025-11-29 | — | yes | shipped |
| NFR-4 | Rename "subsequence" to "sequence" | archive/req-2025-q4 | ✅ Implemented 2025-11-29 | — | — | claimed done, no code annotation* |
| NFR-5 | Extend Socket Infrastructure | archive/req-2025-q4 | ✅ Implemented 2025-12-01 | — | yes | shipped |
| NFR-6 | Codebase Refactor | archive/req-2025-q4 | ✅ Implemented 2025-12-03 | — | yes | shipped |
| NFR-7 | Show Recording Duration | archive/req-2025-q4 | ✅ Implemented 2025-12-02 | — | yes | shipped |
| NFR-8 | Project Data Query API | archive/req-2025-q4 | ✅ Implemented 2025-12-06 | — | yes | shipped |
| NFR-9 | Extract getProjectStats() utility | archive/req-2025-q4 | Pending | — | yes | never built / deferred |
| NFR-10 | Consolidate formatting utilities | archive/req-2025-q4 | Pending | — | yes | never built / deferred |
| NFR-11 | Extract file scanning utilities | archive/req-2025-q4 | Pending | — | yes | never built / deferred |
| NFR-12 | Extract API_URL config | archive/req-2025-q4 | Pending | — | yes | never built / deferred |
| NFR-65 | Extract Shared Server Utilities | `prd/nfr-65-extract-shared-utilities.md`; backlog.md; archive/req-2025-q4 | Pending | 81fda05 | yes | never built / deferred |
| NFR-66 | Consolidate TypeScript Response Types | `prd/nfr-66-consolidate-response-types.md`; backlog.md; archive/req-2025-q4 | Pending | e9c2df4 | yes | never built / deferred |
| NFR-67 | Standardize Server Error Handling | `prd/nfr-67-standardize-error-handling.md`; backlog.md; archive/req-2025-q4 | Pending | e9c2df4 | yes | never built / deferred |
| NFR-68 | Split Query Routes into Sub-Modules | `prd/nfr-68-split-query-routes.md`; backlog.md; archive/req-2025-q4 | Pending | e2ef9d0 | yes | never built / deferred |
| NFR-79 | Tech Debt Exploration | archive/req-2025-q4 | ✅ Completed 2025-12-15 | 2ce9743 | yes | shipped |
| NFR-81 | Project List Scanning Optimization | `prd/nfr-81-project-list-optimization.md`; backlog.md; archive/req-2025-q4 | Future | — | — | never built / deferred |
| NFR-85 | File Watcher Additions | archive/req-2025-q4 | ✅ Implemented 2025-12-15 | — | yes | shipped |
| NFR-86 | Git Leak Detection | `prd/nfr-86-git-leak-detection.md`; backlog.md; archive/req-2025-q4 | Pending | — | — | never built / deferred |
| NFR-87 | Starred Projects Visual Update | `prd/nfr-87-starred-projects-visual.md`; backlog.md | Implemented | a8fbc9b | yes | shipped |
| NFR-141 | Lenient Tag Parser (Uppercase Conversion) | `prd/nfr-141-lenient-tag-parser.md`; backlog.md | ❌ **CANCELLED** - Based on incorrect scanner analy | — | — | — |
| NFR-146 | Test Coverage Foundation | `prd/nfr-146-test-coverage-foundation.md`; backlog.md | Pending | 0b483b0 | — | never built / deferred |


---

## What this audit did NOT establish

- **Runtime behaviour.** Every "shipped" verdict is a static-analysis result (import graph, annotation, commit). Nothing here was exercised in a running app. A feature can be wired and broken.
- **The 18 "claimed done, no code annotation" rows.** For these, a working feature and a missing feature look identical to grep. I verified two (FR-143, FR-153 — both real) and left the rest.
- **Whether the "dead" components are truly unreachable at runtime.** `ProjectStatsPopup` and `RegenToolbar` have zero static importers; a dynamic `import()` or string-keyed registry would not show up. I found no such mechanism in `client/src`, but absence of a dynamic-import pattern and absence of a search for one look the same if I missed it. The import-graph check rules out static references only.
- **Whether the campaign folders contain further requirements** that never got an FR or B id at all. 27 campaign folders were enumerated but only sampled; the WU-level ids were not extracted exhaustively.
