# Era 6 — "Storage and Stall" (2026-03-25 → 2026-04-16)

**Commit range**: `ed908f8b..3b3b2f16` · 32 commits · 22 days
**Churn**: +17,337 / −4,855 lines of code (client + server + shared); +7,850 / −171 lines of docs; plus 6,402 lines of throwaway HTML mockups and a 3.8 MB screenshot ZIP committed into `docs/prd/`
**Then**: no commits for four months. Last commit `3b3b2f16`, 2026-04-16 10:51.

---

## Headline

**FliHub built its storage subsystem three times in eight days, deleted two of the three UIs, and — four days before it went quiet — commissioned a complete "rebuild in any tech stack" spec for itself.** The stall was not exhaustion or a blocking bug; it was a decision. The v2 requirements document and a paste-ready Baku one-shot build prompt both landed on 2026-04-12 (`a039d8ad`), while the storage campaign was still mid-flight. Everything committed after that date was work on an application its owner had already decided to replace.

---

## Timeline narrative

### Phase 1 — Consolidation and hover-help (2026-03-25, 7 commits in one day)

The era opens on a cleanup day, not a feature day. Four of the first five commits are `refactor:` or `fix:`:

- `b92f29de` 11:57 — `ChapterHelpPanel.tsx` (215 lines of hand-written prose, as JSX).
- `2b09fa83` 12:01 — a real safety fix (`fs.pathExists` guard before every core rename, because "fs.rename on macOS overwrites without error") bundled with a *second* help panel, `DamHelpPanel.tsx`. Bug fix and feature in the same commit.
- `e32dfaca` 12:01 — deletes `RelayDivergenceInfo`/`Response` interfaces that had been **defined twice in the same file** (`shared/types.ts` lines 134 and 1126).
- `bbb9b854` 12:01 — `RelayTool.tsx` 875 → 241 lines; 7 leaf components extracted into `client/src/components/shared/relay/`.
- `a38d9f27` 14:05 — a `/simplify` review pass: "Consolidate formatSize (5 copies → 1 canonical in utils/formatting.ts)".

Then the day's real work:

- `e2b055a3` 18:36 — **shared video player infrastructure**. `useVideoPlayback` hook + `VideoPlayerModal`; `IncomingVideoModal` and `RecordingVideoModal` collapse from ~170 lines each to ~25. Space-to-pause, path-traversal validation on the video route, video served from `edit-1st/`, `edit-2nd/`, `final/` and the relay directory.
- `c028aa8b` 19:28 — relay transcript sync via `srtUrl`; the vertical "Recent Renames" list is replaced by a horizontal `RecentlyNamedStrip` of cards with play/undo.

Note the shape of `e2b055a3`: it *builds* a shared keyboard hook and then, in the same commit, **hand-copies the Space handler into `WatchPage.tsx`** rather than using it (`git show e2b055a -- client/src/components/WatchPage.tsx`, +21 lines of duplicated `keydown` logic). WatchPage did not adopt the shared hook until `8f29c31d` on 2026-04-14 — twenty days of divergent duplicate behaviour in the app's most-used player.

### Phase 2 — The project list redesign (2026-03-26 → 03-30)

- `6e90d9c3` — eight Mochaccino mockups committed at once, 6,402 lines of HTML. The message records what git cannot: "Round 1 survivors (from initial 10)… Removed 6 rejected designs." Those six were deleted from the working tree **before the first commit**, so they leave no trace. `MockupsPage.tsx` (168 lines) is added in the same commit with the design list **hardcoded as a TypeScript array**.
- `5e2f5562` — chapter transcript UX: the two-step Combine → View button pair becomes "Copy transcript" / "View transcript", both auto-combining. A textbook single-action collapse.
- `7afcabf5` — **FR-148**: 9-column filterable project table + slide-in detail drawer + toolbar with search, 8 stage pills, 4 smart presets. 18 files, +1,592/−432, 29 tests.

The FR-148 PRD (`docs/prd/fr-148-project-list-redesign.md:196-205`) rules on the four round-2 mockups explicitly — and **rejects the hover card**: *"B (Hover card) — too subtle, easy to dismiss accidentally."* Five days earlier the same repo shipped three hover-triggered slide-out rails on the Recordings page. Nobody reconciled the two rulings.

### Phase 3 — Disk observability (2026-04-05 → 04-08)

Three low-value commits first (`ab20099f` "update context", `00c6f733`, `2f33dba0` "Push: CLAUDE.md, context.globs.json"), then the campaign:

- `4c174850` — **B062 disk observability**: 8 toggle-on disk columns (REC/TRASH/SHADOWS/OTHER/R-REC/R-1ST/R-2ND/TOTAL) with configurable pain thresholds and a stage multiplier; `diskUtils.ts`, `safeDelete.ts` (a generic 6-step validated delete, 20 tests), drawer subfolder breakdown, trash deletion.
- `f121c434` — the campaign assessment, which contains its own damning line: *"**B### ID collision** — B062 was already taken (FR-148)."* The requirement-ID namespace had already collided by the third campaign of the era.
- `ddaed6af` — **B064 Archive Offload**: rsync a project to the T7 `youtube-HOLDING` area, verify, delete local. 21 files, +3,277. `holdUtils.ts` with a 5-gate safety chain, 6 endpoints, 6 React Query hooks, `HoldDeleteModal`, and **an SSD Hold section with 9 UI states buried in `ProjectDrawer.tsx`**.

Then, within 2.5 hours on 2026-04-08, four consecutive fix commits:

| Time | Commit | Fix |
|---|---|---|
| 08:29 | `8e4f3bb8` | `useHoldStatus` returned `{success, data}` but the component read `.ssdMounted` directly → **always** "SSD not available". Plus a new `SsdIndicator` in the header. Plus moving "N of N" inline. |
| 08:31 | `0e97676b` | Move the project count *again* — next to the stage pills. |
| 08:35 | `54248500` | Rename "Hold" → "Offload" everywhere; "Dry Run" → "Preview". |
| 10:44 | `74097048` | B065: disk totals moved from a misaligned toolbar row into `<thead>` + `<tfoot>`. Project count moved **a third time**. |
| 10:54 | `45deeef9` | Verification changed from file-count **and** bytes to file-count only — "byte totals differ across filesystems due to .DS_Store churn and resource fork handling". |

`74097048` closes the campaign with a line that turns out to be the most honest sentence in the era:

> **Note: end-to-end offload/delete flow not yet tested by David.**

### Phase 4 — The kitchen-sink commit (2026-04-12)

`a039d8ad` is labelled `feat(config): add Brand tab to Configuration page`. It contains 64 files and +4,561 lines. What it *actually* carries:

- FR-149 stage-system changes (`client/src/constants/stages.ts`, `shared/types.ts`, `server/src/routes/projects.ts`)
- FR-151 transcribe-all slide-out (`ProjectDrawer.tsx`)
- FR-152 safe project delete — a whole new `ProjectDeleteModal.tsx` (183 lines) + `projectDeleteRoute.test.ts` (198 lines)
- Five new PRDs: `fr-149` … `fr-153`
- `docs/prd/flihub-baku-spec.md` — **1,419 lines**
- `docs/prd/flihub-v2-requirements.md` — **1,004 lines**
- `docs/prd/flihub-screenshots.zip` — **3.8 MB binary**, committed
- 30 PNG screenshots under `.screenshots/`

The two big docs are the story of the stall. `flihub-v2-requirements.md:3` reads:

> **Purpose**: Complete functional requirements for rebuilding FliHub in any tech stack.
> **Audience**: Developer unfamiliar with the current codebase.

and `flihub-baku-spec.md:5-9`:

> ## 1. Baku Handover Prompt
> *Paste this section directly into Baku to kick off the build. It is self-contained.*
> **Build me a full-stack application called FliHub.**

The rebuild decision is dated **2026-04-12**, four days before the final commit.

Same day, two more commits ship an outbound integration: `56f0dedf` adds `POST /api/poem-wui/send-ylo`, pushing transcript + chapters to a Supabase inbox for the YouTube Launch Optimizer. FliHub starts becoming a *producer of data for other apps* — a theme that returns in May.

### Phase 5 — Three storage UIs in 36 hours (2026-04-14)

This is the densest and strangest day in the repo's history.

| Time | Commit | What happened |
|---|---|---|
| 08:23 | `8f29c31d` | "checkpoint WIP" — 46 files, +3,628/−614. Ships the **video-controls campaign** (B068/B069/B070: `VideoControlsBar`, `SpeedControl`, `PlayPauseButton`, `DictionaryQuickAdd`, `useProjectDictionary`), **rips 254 lines of SSD Hold UI out of `ProjectDrawer.tsx`**, adds **`StorageTool.tsx` (509 lines)** as a Manage-page tool, adds a "Storage" sidebar group, and drops in scaffolding for *three* more campaigns. |
| 10:11 | `7b271fd1` | "fix(archive): apply delivery-review patches P1-P8" — the message describes eight small patches. The diff **adds `ArchiveTool.tsx` (823 lines)**, `archiveToolUtils.ts`, 486 lines of new client tests, `archiveInventory.ts`, and 569 lines of new server tests, while **gutting `StorageTool.tsx` by 536 lines**. A `fix:` commit that is 2,732 insertions. |
| 10:24 | `43325043` | Backlog marks the archive-tool campaign **complete**; files B071 and B072 as follow-ups. |
| 17:56 | `c1da2bfe` | A 457-line plan to **replace everything just built**: *"Supersedes: `archive-tool` campaign (kept the data layer + endpoints, replacing the UI shape)."* |
| 18:42 | `a3db182e` | `storage.ts` + `storageTree.ts` + 25 route tests. A **second** hold implementation — heavy-subfolder-only, transactional. |
| 19:27 | `ba8a4404` | **Deletes `ArchiveTool.tsx` (823 lines), `archiveToolUtils.ts`, `StorageTool.tsx`, and 486 lines of their tests.** Ships `StoragePanel.tsx` + four `storage/` subcomponents + a JSONL activity log. |

`ArchiveTool.tsx` lived **9 hours and 16 minutes**. `StorageTool.tsx` lived from 08:23 on 04-14 to 19:27 on 04-14, having been declared "PASS" in its own assessment the previous day.

### Phase 6 — The last commit, and the four-month silence

`3b3b2f16` (2026-04-16 10:51) wires `holdingPath` and `publishedPath` through the ConfigPanel UI, the `POST /config` route, the `updateConfig` whitelist and `configManager` persistence — and fixes `verifyDirsMatch` to filter `HOLD_EXCLUDES` on both sides "so archive verification matches what rsync actually transfers".

`holdingPath` was introduced on **2026-04-08** (`git log -S'holdingPath' -- shared/types.ts` → `ddaed6af`). For eight days and three complete UI rewrites, the single configuration value the entire storage subsystem depends on **could only be set by hand-editing `server/config.json`**.

Then commits stop.

**But work did not stop on 2026-04-16.** Uncommitted evidence in the working tree:

| Path | mtime | What |
|---|---|---|
| `start.sh` | 2026-05-04 07:34 | Rewritten launcher — kills stale Overmind socket, force-kills ports 5100/5101. Dev-loop friction. |
| `docs/triage-handoff-from-flilaunch.md` | 2026-05-11 07:25 | Design handoff from the FliLaunch repo, dated 2026-05-10 |
| `docs/triage-answers-to-flihub-questions.md` | 2026-05-11 07:26 | Seven answers; four open questions all marked **"Not decided."** |
| `client/src/utils/projectFilters.ts` | 2026-05-11 15:15 | New `ready-to-launch-optimise` preset; `ready-to-edit` predicate rewritten to be stage-agnostic |
| `client/tsconfig.tsbuildinfo` | 2026-05-11 15:15 | A build ran that day |
| `server/transcription-telemetry.jsonl` | 2026-07-31 14:23 | The app was **still being used** — three MLX Whisper transcriptions on `x01-test` |

So the true shape of the stall is: **development commits stop 2026-04-16 → a three-week gap → a short uncommitted spike on 2026-05-04 and 2026-05-11 driven by an external consumer (FliLaunch/ALS) → nothing further. The app kept running (transcriptions on 2026-07-31) but stopped being built.** The last code change was never committed.

The May work is the tell. `docs/triage-handoff-from-flilaunch.md` records a decision made live with a third party on 2026-05-10:

> **Triage is not an ALS workflow. It belongs in FliHub.** … Cleaner contract: FliHub becomes the single source of pre-calculated truth; ALS workflows consume that truth, never re-derive it.

and then names FliHub's core defect:

> `stage` (`planning | recording | first-edit | ready-to-publish | published`) is **manually set**. It drifts from reality: … `b71` had `stage:first-edit` but `hasFinal:true`.

The answers doc closes it out: *"**Discussion only. No code landed.**"* and all four design questions *"Not decided."*

**Why it stalled — the evidence-backed reading.** Not one cause, three compounding:

1. **The rebuild had already been decided** (2026-04-12, `flihub-v2-requirements.md` + `flihub-baku-spec.md`). Continuing to invest in v1 storage UI stopped making sense the moment that spec existed.
2. **The storage campaign never got its acceptance moment.** `74097048` says the end-to-end flow "not yet tested by David"; nothing after it records a successful real offload. Three UIs shipped, zero confirmed round-trips in the log.
3. **The next demand came from outside and required a different architecture** — a deterministic `/triage` endpoint whose whole premise is that FliHub's manually-set `stage` is untrustworthy. That is not a feature; it is a re-modelling of the domain, and it was parked with all four questions undecided.

*Uncertainty note: mtimes on modified/untracked files are genuine edit times, but I cannot prove from this repo what David was doing between 2026-05-11 and 2026-08-26. The absence of commits and the absence of work look identical here except for the telemetry file, which proves only that the app ran.*

---

## Feature ledger

| Feature | Area | Req ID | Commit(s) | Kbd/Visual | Fate |
|---|---|---|---|---|---|
| Chapter Tools hover slide-out help rail | recordings | — | `b92f29de` | hover | Alive (`ChapterHelpPanel.tsx`, 197 lines) |
| DAM & Archiving hover slide-out help rail | recordings/storage | — | `2b09fa83` | hover | Alive (`DamHelpPanel.tsx`, 141 lines) |
| Rename collision guard (`fs.pathExists` before every core rename) | recordings | — | `2b09fa83` | — | Alive |
| RelayTool decomposition (875 → 241 lines, 7 leaf components) | relay | — | `bbb9b854` | — | Alive |
| `useVideoPlayback` + `VideoPlayerModal` shared player | video | — | `e2b055a3` | **Space to play/pause** | Alive |
| Play buttons on Relay FileDrawer rows; video served from relay/edit/final | relay, video | — | `e2b055a3` | — | Alive |
| Relay transcript sync via `srtUrl` | relay, transcripts | — | `c028aa8b` | — | Alive |
| `RecentlyNamedStrip` — horizontal cards, play + undo | recordings | — | `c028aa8b` | — | Alive (97 lines, used by `App.tsx`) |
| 8 Mochaccino project-list mockups + `MockupsPage` | design | — | `6e90d9c3` | — | Alive but drifted (see dead ends) |
| One-click chapter transcript copy / view (auto-combine) | chapters, transcripts | — | `5e2f5562` | — | Alive |
| Filterable 9-column project table + slide-in detail drawer | projects | **FR-148** | `7afcabf5` | stage pills, presets | Alive |
| Toolbar: search, 8 stage pills, 4 smart presets | projects | FR-148 | `7afcabf5` | **pill/preset viz** | Alive |
| `getHealthAssessment` narrative in drawer | projects | FR-148 | `7afcabf5` | **stat display** | Alive — but lives *inside* `ProjectDrawer.tsx:48` |
| Disk observability: 8 toggle-on columns + threshold colour coding | storage, projects | **B062** | `4c174850` | **colour-coded disk viz** | Alive |
| Configurable disk pain thresholds + stage penalty multiplier | config, storage | B062 | `4c174850` | — | Alive — **but the defaults are duplicated** client + server |
| `safeDelete` 6-step validated delete utility (20 tests) | storage | B062 | `4c174850` | — | Alive |
| Trash deletion + confirm modal with real path + Open Finder | storage | B062 | `4c174850` | — | Alive |
| SSD Hold/Offload: rsync to T7, verify, delete local, restore | storage | **B064** | `ddaed6af` | — | Superseded (see dead ends) |
| `HoldDeleteModal` typed-confirmation modal | storage | B064 | `ddaed6af` | — | Alive |
| `SsdIndicator` header dot (green when T7 mounted) | storage | B064/B065 | `8e4f3bb8` | **status indicator** | Alive (23 lines) — rewired 4× in 6 days |
| `GET /ssd-status` global mount probe (60 s poll) | storage | B064 | `8e4f3bb8` | — | Alive |
| `HoldBadge` per row (amber `T7⚠` / muted) | projects | B064 | `ddaed6af` | **row badge** | Alive |
| Disk totals in sticky `<thead>` + `<tfoot>`, aligned per column | projects | **B065** | `74097048` | **aggregate viz** | Alive |
| Brand tab in ConfigPanel (`brand-config.json` editor + affiliates) | config | — | `a039d8ad`, `e9a80f81` | — | Alive |
| Stage-system changes | projects | **FR-149** | `a039d8ad` | stage pills | Alive |
| Transcribe-all slide-out | transcripts | **FR-151** | `a039d8ad` | — | Alive |
| Safe project delete + `ProjectDeleteModal` | projects | **FR-152** | `a039d8ad` | — | Alive |
| Send to YLO (transcript + chapters → Supabase inbox) | integration | — | `56f0dedf` | — | Alive |
| `VideoControlsBar` unified across Watch + modals | video | **B068** | `8f29c31d` | **Space, ← →** | Alive (198 lines, 22 props) |
| Modal parity: prev/next nav, size toggle, autoplay, auto-next | video | **B069** | `8f29c31d` | **ArrowLeft/ArrowRight** | Alive |
| `DictionaryQuickAdd` + `useProjectDictionary` (global/project words) | transcripts | **B070** | `8f29c31d` | — | Alive |
| Whisper model + language from config | transcripts | **B036** (partial) | `8f29c31d` | — | Alive |
| `StorageTool` — per-project offload page in Manage | storage | — | `8f29c31d` | — | **DELETED same day** |
| `ArchiveTool` — multi-project filterable archive table + batch ops | storage | — | `7b271fd1` | filter tabs, aggregate footer | **DELETED 9h16m later** |
| `archive-inventory` + `batch-offload` + `batch-delete-local` endpoints | storage | — | `7b271fd1` | — | **Zombie — no caller** |
| `getStorageTree` + heavy/light classification (`HEAVY_SUBFOLDERS`) | storage | — | `a3db182e` | — | Alive |
| 5 storage endpoints: storage-tree, hold, restore-held, archive, unarchive | storage | — | `a3db182e` | — | Alive — **`hold` is route-shadowed** |
| Transactional two-pass hold (stage + verify all, then delete) | storage | — | `a3db182e` | — | Alive but likely unreachable |
| `StoragePanel` + `StorageStateHeader` / `Tree` / `Actions` / `ActivityFeed` | storage | — | `ba8a4404` | **hierarchical tree viz** | Alive |
| Atomic `POST /held-archive` (restore→verify→rsync→verify→delete×2) | storage | — | `ba8a4404` | — | Alive |
| Storage activity log — JSONL at `~/.flihub/storage-activity.jsonl` | storage | — | `ba8a4404` | **activity feed** | Alive |
| Deep-links: SsdIndicator + table T7 badge → Storage tool for that project | storage, projects | — | `ba8a4404` | — | Alive |
| `holdingPath` / `publishedPath` editable in ConfigPanel | config, storage | — | `3b3b2f16` | — | Alive (8 days late) |
| `verifyDirsMatch` honours `HOLD_EXCLUDES` on both sides | storage | — | `3b3b2f16` | — | Alive |
| `ready-to-launch-optimise` preset; stage-agnostic `ready-to-edit` | projects | — | **uncommitted**, 2026-05-11 | preset pill + tooltips | **Never committed** |
| `GET /api/projects/:code/triage` deterministic snapshot | projects | — | designed only | — | **Never built** |
| Groq transcription | transcripts | **FR-150** | PRD only (`a039d8ad`) | — | **Never built** — zero source references |
| Storage workflow redesign | storage | **FR-153** | PRD only (`a039d8ad`) | — | Superseded by the storage-panel plan two days later |

---

## Dead ends

### 1. `ArchiveTool.tsx` — 823 lines, alive for 9 hours 16 minutes
Added `7b271fd1` (2026-04-14 10:11), deleted `ba8a4404` (2026-04-14 19:27). With it went `archiveToolUtils.ts` (84 lines) and 486 lines of tests (`ArchiveTool.test.tsx` 362, `archiveToolUtils.test.ts` 124).
**Why it failed**: it was the *multi-project* answer to a *single-project* question. The plan that killed it (`c1da2bfe`) says so directly: *"Per-active-project — same chrome as Relay tool. No multi-project list."* The archive-tool plan had chosen a filterable table because `docs/planning/archive-tool/IMPLEMENTATION_PLAN.md` cites "Filterable table primary — matches David's preference"; that preference was real but belonged to the *Projects* page, not to a per-project verb surface. Nine hours of use was enough to see it.
**Fate**: deleted.

### 2. `StorageTool.tsx` — built, "PASSED", gutted, deleted
Added in the `8f29c31d` checkpoint (509 lines) as the deliverable of the **offload-manage-tool** campaign, whose assessment (`docs/planning/offload-manage-tool/assessment.md`) reads *"Started 2026-04-13 / Completed 2026-04-13 / Verdict: PASS"*. Cut by 536 lines in `7b271fd1` the next morning, deleted entirely in `ba8a4404` that evening (patch P3: "deleted dead `StorageTool.tsx` + stale `useRelayApi` comment").
**Why it failed**: it was the *right* shape (per-project, three states) shipped one campaign too early — the archive-tool campaign then overrode it with a multi-project table, and the storage-panel campaign came back to StorageTool's original shape under a new name. A full round trip.
**Fate**: deleted.

### 3. `ProjectDrawer`'s "SSD Hold" section — 254 lines
Built in `ddaed6af` (B064) with **nine distinct UI states**. Removed wholesale in `8f29c31d`.
**Why it failed**: recorded verbatim in `docs/planning/requirements-offload-ux.md`, in David's own words:
> *"I don't know where to find anything for doing the archives. I don't know how to put stuff on hold. I don't know how to restore. I don't know how to delete locally. There's no unified approach."*
A nine-state machine at the bottom of the sixth section of a drawer.
**Fate**: deleted (moved, then the destination was deleted twice more).

### 4. `archive-inventory` + `batch-offload` + `batch-delete-local` — zombie endpoints, still present
`ba8a4404` removed the client hooks (`useArchiveInventory`, `useBatchOffload`, `useBatchDeleteLocal`) but kept the server side: *"Server endpoints `archive-inventory` / `batch-*` preserved for future Projects-page chips."* The stated rationale is in `docs/planning/storage-panel/IMPLEMENTATION_PLAN.md`: *"Cheap to keep, expensive to rebuild."*
**Verified today**: `server/src/routes/hold.ts:436, 510, 589` still register all three. `server/src/test/holdArchiveInventory.test.ts` (299 lines) + `holdBatch.test.ts` (270 lines) + `server/src/utils/archiveInventory.ts` (172 lines) still exist. **No client code fetches any of them.** Worse, `client/src/constants/queryKeys.ts:72` still defines `archiveInventory`, and *six* call sites still invalidate it (`useHoldApi.ts:42,74,90,106`, `useInvalidateProjectStorage.ts:16`) — and `client/src/test/useInvalidateProjectStorage.test.tsx:31` **pins that dead key as a contract**. A test now defends a cache key for an endpoint nothing calls.
**Fate**: still-present-but-unused (~740 lines of server code and tests, plus a client contract test).

### 5. The six rejected round-1 mockups — invisible to git
`6e90d9c3`'s message: *"Round 1 survivors (from initial 10) … Removed 6 rejected designs."* The commit is +6,402/−0. The six were deleted before the first commit.
**Fate**: unknown — no artifact survives. **Flagging explicitly: a deleted-pre-commit design and a design that never existed look identical in this repo.** The commit message is the only evidence they existed.

### 6. `MockupsPage` design registry drift
`client/src/components/MockupsPage.tsx:11-…` hardcodes 11 designs in three arrays. `.mochaccino/designs/` on disk holds **13** folders. `chapter-separator` and `sync-hub-v2` exist on disk and are unreachable from the app.
**Fate**: still-present-but-unlinked.

### 7. Shift+Click "pin-to-compare up to 3 projects"
Described in `MockupsPage.tsx` for mockup 10 ("Shift+Click to compare") and mockup 06 ("pin-to-compare up to 3 projects side-by-side"). FR-148 shipped the table + drawer without it; `grep -rn "shiftKey" client/src` finds it only in `ThumbsPage.tsx:171` and `useShiftHover.ts` (used solely by `AssetsPage`, and predating this era).
**Fate**: designed, never built.

### 8. The hover card, rejected — while three hover rails shipped
FR-148 rejects mockup B: *"too subtle, easy to dismiss accidentally"* (`docs/prd/fr-148-project-list-redesign.md:200`). Five days earlier, `RecordingsView.tsx:1424, 1447, 1466` gained three pure-CSS `group-hover/*` slide-out rails with no click affordance and no keyboard path.
**Fate**: contradiction never resolved; both states persist.

### 9. FR-150 Groq transcription
167-line PRD in `a039d8ad`. `grep -rl "FR-150" client/src server/src shared` → nothing.
**Fate**: never built.

### 10. FR-153 storage workflow redesign
200-line PRD in `a039d8ad` (2026-04-12); superseded two days later by `docs/planning/storage-panel/IMPLEMENTATION_PLAN.md`, which does not reference it. No source references FR-153.
**Fate**: superseded before implementation.

### 11. B071 / B072 — follow-ups for a deleted tool
`43325043` (10:24) files B071 ("Archive tool polish: extract `useBatchSelection`, replace mount nonce with explicit `navigationNonce`, `left-[232px]` footer layout fix") and B072 ("Add `DELETE /holding-only` endpoint to restore 'Delete everything' on held-only rows"). The tool they refer to was deleted nine hours later. Both are still open in `docs/planning/BACKLOG.md`.
**Fate**: orphaned backlog items pointing at deleted code.

### 12. The triage endpoint / the May work
`docs/triage-handoff-from-flilaunch.md` + `docs/triage-answers-to-flihub-questions.md`, plus a working `ready-to-launch-optimise` preset in `client/src/utils/projectFilters.ts:48-57` with matching tooltips in `ProjectListToolbar.tsx`.
**Fate**: uncommitted for 3.5 months and counting. The answers doc says it plainly: *"Discussion only. No code landed."* All four open questions: *"Not decided."*

---

## Pivots

### P1 — Storage UI location: drawer → tool page → multi-project table → per-project panel
Four homes in six days.

```
2026-04-08  ProjectDrawer § "SSD Hold"        9 states, buried    ddaed6a
2026-04-14  StorageTool (Manage tool)         per-project         8f29c31  →  deleted 19:27 same day
2026-04-14  ArchiveTool (Manage tool)         multi-project       7b271fd  →  deleted 19:27 same day
2026-04-14  StoragePanel (Manage tool)        per-project         ba8a440  →  current
```

**Trigger for the first move**: David's verbatim complaint in `docs/planning/requirements-offload-ux.md`.
**Trigger for the second**: `docs/planning/archive-tool/IMPLEMENTATION_PLAN.md` — *"Filterable table primary — matches David's preference"* + the desire for batch operations.
**Trigger for the third**: `docs/planning/storage-panel/IMPLEMENTATION_PLAN.md` — *"Storage panel feels like Relay (per-active-project, sidebar in Manage)"*, i.e. consistency with an existing pattern beat the abstract table preference. The end state is the same shape StorageTool had 11 hours earlier.

### P2 — Storage vocabulary: Hold → Offload → Hold + Archive
`54248500` renames "SSD Hold" → "SSD Offload", "Dry Run" → "Preview", "HOLDING" → "SSD copy". Six days later `c1da2bfe` restores **Hold** as a *distinct verb from* **Archive** and locks the vocabulary:
> *"Naming locked in: `Storage` (tool name), `Hold` (verb), `Archive` (verb), `Restore`, `Unarchive`. State labels: `Active` / `Held` / `Archived`."*
**Trigger**: the discovery that the original "hold" conflated two operations with different reversibility — reversible heavy-file staging vs near-permanent whole-folder archival. The vocabulary was only nailed down *after* two UIs had shipped on the conflated model.

### P3 — What gets copied: everything → heavy allowlist
B064 did `rsync -a projectDir/ holdingPath/` with **zero exclusions**. The offload-manage-tool assessment flagged it (*"Current: copies everything with no exclusions"*) with a table of what shouldn't go. `a3db182e` introduces `HEAVY_SUBFOLDERS = ['recordings', 'recording-shadows', 'final']` + `recordings/-chapters/`, and `holdExcludeArgs()` on every rsync. `3b3b2f16` then had to teach the *verifier* the same exclusions, because verification was counting files rsync never transferred.
**Trigger**: real T7 space being consumed by `-trash/`, `s3-staging/`, and duplicate finals.

### P4 — Verification: bytes + count → count only → count with exclusions
`ddaed6af` verified count **and** bytes. `45deeef9` dropped bytes (*"byte totals differ across filesystems due to .DS_Store churn and resource fork handling"*). `a3db182e` P4 reinstated a `verifyDirsMatch` on count **and** bytes. `3b3b2f16` fixed it again by filtering excludes on both sides.
**Trigger**: the safety gate for a destructive delete could not be made to agree with itself across three attempts. That is the single most-revisited piece of logic in the era.

### P5 — Direction of demand: internal features → external consumer
Until 2026-04-12 every requirement came from David using FliHub. Then `56f0dedf` (Send to YLO) makes FliHub a *producer* for FliLaunch, and the May triage handoff makes it explicit: *"FliHub becomes the single source of pre-calculated truth; ALS workflows consume that truth, never re-derive it."*
**Trigger**: other apps in the ecosystem started needing FliHub's filesystem knowledge — and immediately hit the fact that FliHub's `stage` is a manual label that drifts.

### P6 — Improve v1 → rebuild v1
`a039d8ad` (2026-04-12) commits a v2 PRD explicitly written for *"a developer unfamiliar with the current codebase"* plus a self-contained one-shot build prompt for Baku.
**Trigger**: not stated in the repo. What *is* in the repo is that the same commit contains a full screenshot tour (`.screenshots/flihub-main/`, 17 PNGs + `tour.yml`) and a 3.8 MB PRD screenshot ZIP — the artifacts you produce when you are documenting a system for *replacement*, not for maintenance.

---

## Pain signals

### PS1 — The storage subsystem: 3 UIs, 2 deletions, 18 commits, 8 days
`git log ed908f8b..3b3b2f16 -- server/src/routes/hold.ts server/src/utils/holdUtils.ts server/src/routes/storage.ts client/src/hooks/useHoldApi.ts` → **8 commits** on the data layer alone; 18 of the era's 32 commits touch storage in some form. **Two complete UIs (1,332 lines) plus 486 lines of their tests were written and deleted within the era.** This is not iteration; it is the same design being re-derived from scratch three times because the underlying concepts (*hold* vs *archive*, *per-project* vs *fleet-wide*) were never named before building.

### PS2 — `verifyDirsMatch` / verification semantics: 4 rewrites
`ddaed6af` → `45deeef9` → `a3db182e` (P4) → `3b3b2f16`. **Fix count: 4**, on the gate that authorises deleting the user's raw footage. The last one landed on the final day of the era and is the last thing anyone did to this codebase.

### PS3 — `SsdIndicator`: 23 lines, rewired 4 times in 6 days
`8e4f3bb8` (born) → `8f29c31d` → `7b271fd1` → `ba8a4404`. Every rewire is the same edit: *where does clicking this dot take you?* The answer changed every time the storage UI moved. **Fix count: 4.** A status indicator should not be coupled to the location of a tool.

### PS4 — Project-count / disk-totals placement: 3 moves in 8 hours
`8e4f3bb8` 08:29 ("moved 'N of N' count inline on filter row") → `0e97676b` 08:31 ("move project count next to stage pills") → `74097048` 10:44 ("Project count moved inline into filter bar" + totals moved out of the toolbar into `<thead>`/`<tfoot>`). **Fix count: 3.** The toolbar had no layout model, so every new element re-litigated the whole row.

### PS5 — The response-envelope bug class
`8e4f3bb8` fixes `useHoldStatus` reading `.ssdMounted` off a `{success, data}` wrapper. `a3db182e` patch P5: *"envelope uses `success` (was `ok`) to match project convention."* Measured today across `server/src/routes/`: **96** `res.json({ success…`, **14** `res.json({ ok…`, and ~100 bare-shape responses (`{projects}`, `{images}`, `{chapters}`, `{renames}`…). `docs/planning/BACKLOG.md` (B034) records "281 inconsistent formats (NFR-67)" as a known, deferred campaign. There is no envelope type in `shared/`. **This is a bug factory, and it produced at least two bugs in this era alone.**

### PS6 — Byte formatters: consolidated 5→1, back to 4 within 13 days
`a38d9f27` (2026-03-25): *"Consolidate formatSize (5 copies → 1 canonical in `utils/formatting.ts`)"*. Today:
- `client/src/utils/formatting.ts:7` → `formatFileSize`
- `client/src/utils/formatBytes.ts:4` → `formatBytes` (added by B062, `4c174850`)
- `client/src/components/ProjectDrawer.tsx:16` → a **local** `formatBytes`
- `server/src/utils/formatters.ts:17` → `formatSize`

The B062 assessment even predicted it: *"canonical `client/src/utils/formatBytes.ts` exists, but `ProjectDrawer.tsx` still has a local copy with a TODO."* The consolidation had no mechanism to hold — no shared module, no lint rule.

### PS7 — Constants duplicated across the workspace boundary that exists to prevent it
`server/src/config/configManager.ts:7` defines `DEFAULT_DISK_THRESHOLDS`. `client/src/components/ProjectsPanel.tsx:476` defines it again, with the comment: *"B062: Client-side default thresholds (**mirrors server configManager.ts — keep in sync**)."* The repo has a `shared/` workspace with a `constants.ts`. It was not used. A comment was used instead.

### PS8 — The delivery-review treadmill
Patch counts applied *post*-implementation, per campaign: FR-148 (unnumbered set), disk-observability (4), archive-tool **P1–P8**, storage-panel Wave A **P1–P11**, storage-panel Wave B **P1–P7**. That is **30 numbered review patches** across the era, several of them structural (P3 "hold is transactional", P7 "SSD probe was a no-op", P1 "atomic `/held-archive` endpoint replaces fragile client chain"). The review process was catching real defects — but it was catching *design* defects after the code was written, every single time.

### PS9 — Client tests: ~236 vs server ~1,230
`ba8a4404` gates: *"client 236/16 · server 1230+2skip/46 · shared 80/2"*. Every UX decision in this era was on the client. `client/src/test/` + `client/src/components/__tests__/` + `client/src/utils/__tests__/` contain **no tests** for `VideoControlsBar`, `VideoPlayerModal`, `useVideoPlayback`, `DictionaryQuickAdd`, `RecentlyNamedStrip`, `ChapterHelpPanel`, `ProjectsPanel`, `RecordingsView`, or `WatchPage`. The video-controls campaign's plan records "1036 tests pass" after all six work units — **it added zero tests**. Cheap to delete 823 lines of UI is not a virtue when the reason it is cheap is that nothing tested it.

### PS10 — Three test directory conventions
`client/src/test/`, `client/src/components/__tests__/`, `client/src/utils/__tests__/`. `StoragePanel.test.tsx` lives in the first; `ProjectDrawer.test.tsx` in the second. No rule.

### PS11 — Commit messages stopped describing commits
- `74097048` "B065 … SSD polish" re-narrates fixes already shipped in `ddaed6af`/`8e4f3bb8`/`54248500`; its diff **does not touch `useHoldApi.ts`** at all.
- `7b271fd1` is labelled `fix: apply delivery-review patches P1-P8` and is **+2,732/−510**, introducing an 823-line component.
- `a039d8ad` is labelled "add Brand tab" and ships FR-149, FR-151, FR-152, five PRDs, a 1,419-line build spec, a 1,004-line v2 PRD and a 3.8 MB ZIP.
- `8f29c31d` is `chore: checkpoint WIP` and is +3,628/−614 across three campaigns.

**The log is no longer a change ledger.** This directly damages the ability to do exactly what this document is doing.

### PS12 — Dual backlog, dual ID namespace, stale pointer
`docs/backlog.md` (FR-numbered, last modified 2026-04-09) and `docs/planning/BACKLOG.md` (B-numbered, last modified 2026-04-14) both exist. `CLAUDE.md` points readers at **`docs/backlog.md`** — the stale one. IDs collided at least once by David's own record (B062 taken twice, per `docs/planning/disk-observability/assessment.md`). The storage-panel campaign — the last real work in the repo — has **no B number at all**, and `BACKLOG.md` still says its predecessor archive-tool is `[x]` complete with two open follow-ups against deleted code.

### PS13 — Planning volume vs shipped volume
`docs/` grew **+7,850 lines** in 22 days (excluding the ZIP and screenshots) against +17,337 lines of code. `docs/planning/` now holds **26 campaign directories**. Five campaign folders were created in this era (`disk-observability`, `archive-offload`, `offload-manage-tool`, `offload-cleanup-wave2`, `archive-tool`, `storage-panel`, `video-controls-and-dictionary`, `stage-and-project-actions`), two of which describe code that no longer exists.

---

## Architectural moments

### AM1 — Two routers mounted at the same prefix, and one shadows the other
**This is the single most consequential defect I found, and it is live in `main` today.**

`server/src/index.ts:321-326`:
```
const holdRoutes = createHoldRoutes(() => currentConfig);
app.use('/api/projects', holdRoutes);          // line 322

const storageRoutes = createStorageRoutes(() => currentConfig);
app.use('/api/projects', storageRoutes);       // line 326
```

Both register `POST /:code/hold`:
- `server/src/routes/hold.ts:93` — B064 semantics: rsync the **whole project** to T7, verify, **delete nothing**.
- `server/src/routes/storage.ts:185` — storage-panel semantics: two-pass transactional copy of **heavy subfolders only**, then delete those subfolders locally.

Express matches in registration order and `hold.ts`'s handler always responds (`grep -n "next(" server/src/routes/hold.ts` → no matches). The client's `useStorageApi.ts:40-42` posts to `/api/projects/${code}/${verb}` with `verb: 'hold'`, behind a button reading **"Hold heavy files (X → T7)"** (`storage/StorageActions.tsx:117-124`).

**Consequence**: the storage panel's primary verb almost certainly executes the *old* whole-project copy, not the heavy-only transactional hold it was rewritten to perform. Every one of the 591→1,230 server tests passes, because `storageRoutes.test.ts:179` and `holdRoutes.test.ts:68` each build a fresh `express()` and mount **only their own router**. *The tests cannot see the collision by construction.*

*Verification honesty*: I established this by reading the mount order, both route registrations, the absence of `next()`, and the client's URL construction. I did **not** run the server or issue a request. Everything except the runtime confirmation is verified.

**The architectural lesson is bigger than the bug**: there is no route registry, no ownership map, and no single place where "what does `/api/projects` respond to" can be read. `shared/apiRegistry.ts` was built to *be* that map — it documents **38** endpoints against **156** `router.<verb>(` registrations in `server/src/routes/`, and it contains **zero** of the 16 storage/hold endpoints added in this era. A contract surface existed and new subsystems simply stopped feeding it.

### AM2 — Project truth has no home
Derived project state is computed in at least four unrelated places:

| Where | What it derives |
|---|---|
| `server/src/routes/projects.ts:101` `/stats` | file counts, transcript %, `hasFinal`, `lastModified` — full directory walk per call |
| `client/src/utils/projectFilters.ts:38-58` | the `needs-attention` / `dead` / `ready-to-edit` predicates |
| `client/src/components/ProjectDrawer.tsx:48` | `getHealthAssessment()` — narrative health, **exported from a component**, tested by importing from the component |
| `shared/types.ts` `stage` | a **manually set** label with no relationship to any of the above |

The May handoff names the resulting failure exactly: *"`b71` had `stage:first-edit` but `hasFinal:true`."* And it proposes the fix FliHub never made — `GET /api/projects/:code/triage`, a server-side deterministic snapshot, *"FliHub becomes the single source of pre-calculated truth; ALS workflows consume that truth, never re-derive it."*
**Consequence**: every consumer (the project table, the presets, the drawer, FliLaunch, ALS) re-derives project truth its own way, and they disagree. The uncommitted 2026-05-11 edit to `projectFilters.ts` — rewriting `ready-to-edit` from `stage === 'recording'` to `!p.hasFinal` — is a client-side patch on a server-side modelling problem.

### AM3 — "Real-time, not polling" is documented as a principle and is false
`docs/prd/flihub-v2-requirements.md:64` lists as core DNA: *"**Real-time, not polling** — file changes propagate instantly via WebSocket. The UI never feels stale."*

Reality: `grep -rho "io\.emit('[a-z:-]*'" server/src | sort -u` → **20 events**, all covering the *original* chokidar-watched areas (recordings, chapters, transcription, relay). None for disk, hold, storage, sync or edit. Meanwhile the client runs **13+** `refetchInterval` polls (`useStorageApi.ts:36` 30 s, `useHoldApi.ts:14` 60 s, `useRelayApi.ts` ×5, `useSyncApi.ts:25` 120 s, `useEditApi.ts:90` 5 s, `useTranscriptionsApi.ts:111` 5 s…). The storage-panel review even flagged it and deferred it: *"Socket emits + disk-cache invalidation on storage mutations (DVR-AR-006) — wire in WU3 when UI needs it."* WU3 shipped; it was never wired.

**Root cause**: every socket event is a bespoke `io.emit` broadcast to all clients, tied to a specific chokidar watcher. There is no generic "invalidate query key K for project P" channel. So a subsystem whose state changes because of an *action* (not a file watch) has no way onto the socket bus, and defaults to polling. **This is the seam that was never cut, and it is why every post-era-4 subsystem polls.**

### AM4 — The filesystem is the database, and nothing owns schema
`flihub-baku-spec.md` states it as a virtue: *"The filesystem IS the database. Recording metadata lives in the filename… There is no database."* This era shows the bill:
- `getStorageTree` must re-derive `active | held | archived` by probing three T7 directories on every poll.
- Verification of a destructive delete is a directory walk that must be taught rsync's exclusion semantics (`3b3b2f16` adds `matchesExcludePattern` — a hand-rolled rsync-glob matcher — to make the *verifier* agree with the *copier*).
- `docs/planning/storage-panel/IMPLEMENTATION_PLAN.md` needs a `degraded` state because the disk can disagree with itself, and all four mutations must return 409 when it does.

**Consequence**: safety logic is O(disk) and lives in three implementations (`getDirStats`, `getDirSize`, `getStorageTree`, `archiveInventory`). The storage-activity JSONL log (`~/.flihub/storage-activity.jsonl`, `ba8a4404`) is the first admission that *something* needs to be remembered rather than re-derived — and it arrived on the last real working day.

### AM5 — Config values shipped nine days ahead of any way to set them
`holdingPath` entered `shared/types.ts` on 2026-04-08 (`ddaed6af`); `publishedPath` on 2026-04-14 (`a3db182e`). Neither reached `ConfigPanel`, `POST /config`, the `updateConfig` whitelist, or `configManager` persistence until **2026-04-16** (`3b3b2f16`).
**Consequence**: for the entire life of B064, B065, StorageTool, ArchiveTool and StoragePanel-v1, the storage subsystem could only be configured by hand-editing `server/config.json`. Every "it says SSD not connected" symptom in that window has this as a candidate cause, and the campaign that closed with *"not yet tested by David"* had no UI path to make it testable.

### AM6 — `VideoControlsBar` is shared code that knows its callers
`client/src/components/shared/VideoControlsBar.tsx` — 198 lines, **22 props**, with comments naming specific consumers:
```
// Watch-only: Park button in nav row
// Watch-only: filter toggles in controls row
// Info slot rendered after ← → (filename+counter on Watch, duration+filesize on modal)
```
**Consequence**: this is false sharing. Two callers with different needs were merged behind one prop bag; every future third caller must either add props or fork. The correct seam — a controls *layout* primitive plus per-page composition — was available and not taken. The same commit did the same thing well elsewhere (`SpeedControl` 31 lines, `PlayPauseButton` 21 lines, `SizeToggle`), which shows the team knew how; the bar itself was just where the leftovers went.

### AM7 — Documentation implemented as JSX
`ChapterHelpPanel.tsx` (197 lines) and `DamHelpPanel.tsx` (141 lines) are **prose documentation compiled into the bundle** — step-by-step instructions for split / move / swap / rename, storage tiers, CLI commands, project lifecycle, safety tips. They are rendered from three hardcoded `group-hover/*` rails at `RecordingsView.tsx:1424, 1447, 1466`, inside a component that `docs/planning/BACKLOG.md` B054 already flags for extraction (*"1,399 → ~700 lines"* — it is **1,537 lines** today).
**Consequence**: 338 lines of behavioural documentation with no source of truth, no test, no link to the code it describes, and no way to notice when it goes stale. `DamHelpPanel` describes an archiving model that was redesigned three times in the same era.

### AM8 — Delivery review as the design phase
30 numbered post-hoc patches, several of which are architecture, not polish:
- Wave A **P3**: *"hold is transactional — stage+verify all heavy subs before deleting any locals."* Transactionality on a destructive operation, discovered in review.
- Wave A **P7**: *"SSD probe delegates to `checkSsdMounted` (was no-op)."* The mount check did nothing.
- Wave B **P1**: *"atomic `POST /held-archive` endpoint … replaces fragile client chain."* A multi-step destructive workflow had been orchestrated **from the browser**.

**Consequence**: the review process is genuinely good — it caught all three. But its position in the pipeline means the architecture is decided by the implementer and corrected by the reviewer, at 100% of the cost of having built it wrong. Every campaign paid this tax.

### AM9 — Campaign-shaped development with no acceptance gate
Every campaign has `AGENTS.md`, `IMPLEMENTATION_PLAN.md`, an `assessment.md`, and a `PASS` verdict. **None of them has "David used it and it worked" as a gate.** The offload-manage-tool assessment reads `Verdict: PASS` for a component deleted 30 hours later. `74097048` closes the archive-offload campaign with *"end-to-end offload/delete flow not yet tested by David."* The definition of done was *tests pass, typecheck passes, build passes* — which is exactly the set of checks that AM1's route collision satisfies while being wrong.

---

## What a rebuild should learn from this era

1. **Name the concepts before you build the surface.** *Hold* and *Archive* are two verbs with different reversibility, different scope (subfolder vs whole project) and different destinations. Until `c1da2bfe` locked the vocabulary, three UIs were built on a conflation, and two of them were deleted. Cost: ~1,332 lines of UI + 486 lines of tests, in one day. **A one-page state machine — `Active | Held | Archived`, four verbs, one owner per destination — would have prevented all three rebuilds.** It exists; it was written on 2026-04-14 at 17:56, after the deletions.

2. **One prefix, one router, or a registry that fails the build.** AM1 is a live, test-invisible defect. In a rebuild: either every route namespace has exactly one owner, or route registration is data (a manifest) that is validated for collisions at startup — and `shared/apiRegistry.ts` is generated *from* that manifest rather than hand-maintained beside it (38 documented vs 156 real).

3. **Give derived truth one home, on the server.** AM2 + the FliLaunch handoff say the same thing from both sides. `stage` is intent; completion is fact; they must be separate fields, both server-computed, both exposed on one endpoint. Client-side preset predicates and a `getHealthAssessment()` exported from a drawer component are symptoms of a missing service.

4. **Cut the invalidation seam on day one.** AM3: a generic server→client `invalidate(queryKey, projectCode)` channel would have cost an afternoon in era 1 and removed 13 polling intervals plus the entire "does the UI know yet?" class of bug. Without it, every new subsystem defaults to polling and the stated architecture becomes fiction.

5. **A response envelope is a type, not a convention.** PS5: 96 `{success}` / 14 `{ok}` / ~100 bare shapes, 281 known-inconsistent error formats, and at least two shipped bugs in this era from unwrapping the wrong thing. `shared/` should export `ApiResponse<T>` and the client should have exactly one `fetchApi` that unwraps it.

6. **Config and capability ship together.** AM5: never merge a config key without its editor. The rule is cheap and would have made the storage campaign testable eight days earlier.

7. **Make destructive verification a single, tested, shared function — and test it against the real copier.** PS2: four rewrites, ending with a hand-rolled rsync-glob matcher so the verifier and the copier agree. In a rebuild, the copy and the verify should share one exclusion list *object*, and the test should assert the two agree on a fixture — not assert each in isolation.

8. **Test the client where the churn is.** PS9: 236 client tests vs 1,230 server. All the deleting, re-shaping and re-deleting happened on the client, unprotected. A rebuild does not need 100% client coverage; it needs tests on the three or four *interaction contracts* (which verb does this button fire, what does this state render, what does this deep-link do) that this era broke repeatedly.

9. **Delete the zombies, or don't keep them.** Dead end #4: ~740 lines of server code + tests for three endpoints with no caller, plus a client contract test *pinning the dead cache key*. "Cheap to keep, expensive to rebuild" is how the archive-inventory endpoints survived their UI. They are not cheap: they are 740 lines of surface area that every future reader must evaluate.

10. **Don't build documentation into components.** AM7: 338 lines of prose in JSX, describing a model that changed three times in the same era. Help content belongs in markdown that ships alongside the code and can be diffed against it.

11. **The acceptance gate is "David ran it."** AM9. Three passing campaigns, zero confirmed end-to-end offloads, and the last commit in the repo is still fixing the verifier. Green tests were never the missing signal.

12. **Keep the log honest.** PS11: `fix:` commits with 2,732 insertions, `chore: checkpoint` spanning three campaigns, a "Brand tab" commit carrying the rebuild spec. Whatever the rebuild's cadence, one commit should be one intent — because this document was only possible where that held, and guesswork where it didn't.

---

## Appendix — evidence and its limits

**Verified by reading the actual artifact**: every commit SHA, date and diffstat; the mount order at `server/src/index.ts:321-326`; both `/:code/hold` registrations; the absence of `next()` in `hold.ts`; the client's verb-based URL construction; the presence/absence of every file named as alive or deleted; the `archive-inventory` zombie (no non-test client caller); the four byte formatters; the duplicated `DEFAULT_DISK_THRESHOLDS`; the 20 socket events and 13 poll intervals; the 38-vs-156 registry gap; the 13-vs-11 mockup drift; the two backlog files and their mtimes; the mtimes on the uncommitted May work and the July telemetry.

**Inferred, not executed**: the runtime effect of AM1's route shadowing. Express's first-match-wins semantics for two routers mounted at the same path are standard and `hold.ts` never delegates, but **I did not start the server or issue a request**. If someone wants certainty, `curl -X POST localhost:5101/api/projects/<code>/hold` and check which handler's error strings come back (`hold.ts` says *"Relay is not empty — N bytes"*; `storage.ts` returns an `errResponse` envelope and would say *"Holding SSD is not mounted"* first).

**Cannot be established from this repo**:
- Why the rebuild was decided on 2026-04-12. The artifacts of the decision are committed; the reasoning is not.
- What happened between 2026-05-11 and 2026-08-26. Absence of commits and absence of work are indistinguishable here, with one exception: `server/transcription-telemetry.jsonl` proves the app *ran* on 2026-07-31. It proves nothing about development.
- The six rejected round-1 mockups. They were deleted before the first commit; only `6e90d9c3`'s message attests they existed. A design that was deleted pre-commit and a design that never existed leave identical traces.
- Whether any real T7 offload ever completed successfully. `74097048` says the flow was untested as of 2026-04-08; nothing after it records a test. The storage activity log (`~/.flihub/storage-activity.jsonl`) would answer this — it is outside the repo and I did not read the user's home directory.
