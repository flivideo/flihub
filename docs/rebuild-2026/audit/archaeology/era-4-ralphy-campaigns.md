# Era 4 — "Ralphy Campaigns" (2026-03-19 → 2026-03-23)

**Range**: `1588f7bb..1b06f68f` — 34 commits, all authored by David Cruwys, all co-authored by a Claude agent.
**Active days**: 3 (Mar 19: 9 commits · Mar 22: 8 · Mar 23: 17). Mar 20–21 are empty.
**Net diff across the era**: 92 files, +12,515 / −2,403.
 - Code (`client/`, `server/`, `shared/`): 51 files, +5,659 / −2,344
 - Docs (`docs/`): 39 files, +6,104 / −59
 - Plus `.mochaccino/designs/sync-hub/index.html`, 731 lines.

**Commit type split**: 12 `chore` · 8 `fix` · 8 `feat` · 5 `docs` · 1 `plan`.
Half the era's commits (17 of 34) are campaign bookkeeping, not product.

---

## Headline

**The era where a whole collaboration subsystem was invented, shipped, redesigned and re-redesigned in 72 hours — and where the campaign machinery started producing more prose than code.** Relay went from "does not exist" to four route generations, three UI paradigms and two socket contracts inside three working days. The velocity was real; so was the cost — every relay concept (paths, folder names, machine role, sync direction) was invented *inside a route file or a React component* instead of in `shared/`, and every one of those decisions is still load-bearing today.

---

## Timeline narrative

### Day 1 — Mar 19: stabilise, then immediately destabilise

The era opens exactly where era 3 closed: a `chore:` commit reconciling the backlog. `8a7e833` lands a **3-lens audit** (code-quality / test-quality / architectural-review) that files B024–B037 and names four structural blockers:

- `PROJECTS_ROOT` hardcoded in 7+ files
- `writeProjectState` non-atomic
- config access inconsistent (`Object.assign` bypassing `updateConfig`)
- `renameRecording()` orchestration with zero test coverage

`9b08af6` plans it (6 work units, 2 waves, "5 parallel agents on disjoint files"). `36f0571` executes it across **21 files** — `getConfig().projectsRootDirectory` replaces the hardcoded root in 9 files, `projectState.ts` gets a `.tmp` + `fs.rename` two-step write, three route factories move to a `() => getConfig()` getter, and `manage.ts` gains a chapter-99 collision guard. Tests: 390 passing.

`ec0b16a` then adds **+57 tests** (390 → 447) and, buried in the same commit, three planning documents that set the entire rest of the era in motion:

- `docs/planning/requirements-workflow-braindump-2026-03-19.md`
- `docs/planning/requirements-relay-collaboration.md`
- `docs/planning/architectural-review-relay-2026-03-19.md`

The braindump contains the load-bearing constraint the whole subsystem is built around:

> "**SyncThing CANNOT be used on `v-appydave/` or any git-tracked project folder.** … Relay folders are separate, temporary file-share buckets — NOT git repos, NOT project directories."

That single constraint forces the design that follows: two parallel sync mechanisms (git for small files, a relay bucket for video), which FliHub must unify in its UI because nothing else can.

Nine hours later `dce171b` ships **B038 relay-collaboration-phase-1** — 1,050 lines: `Config.relayDirectory` + `relayEnabled`, `WatcherManager.startRelayWatcher()`, three new socket event types, `server/src/routes/relay.ts` (116 lines: status / preview / push / collect), `POST /api/system/git-sync`, `useRelayApi.ts` (4 hooks), `RelayTool.tsx` (170 lines, rendered in a `SlideOutDrawer`).

### Day 2 — Mar 22: three redesigns of the same page

Two long requirement documents land first: `f815baf` (443-line relay workflow diagrams) and `63c6fdc` (298-line manage-page + relay requirements brief, which names David as "Recorder" and Jan/Rome as "Editors" and specifies `machineRole` in `config.json`).

Then, in **six hours**, the Manage page is rebuilt three times:

1. `21f4ebe` **B039 wave 1** — security pass (`bash -lc` → `execFile` in `relay.ts` and `system.ts`), route guards, `machineRole` added to `Config`, sidebar regrouped into Record/Edit/Collaborate, **S3 Staging deleted** (−1,755 lines), 48 new relay tests (504 → 552). Drawers widened 300px → 600px.
2. `18b09ca` **B040 wave 2** — `getRelayPaths()` / `rsyncExcludeArgs()` / `RELAY_SUBFOLDERS` extracted, `GET /browse` + `RelayBrowser.tsx` table with colour-coded dots and a legend, subfolder-aware push/collect, `GET /versions` + `POST /promote`, role-based visibility, 842 tests. Drawers widened again, 600px → **700px**.
3. `1b436e2` **B041** — *all four drawers deleted*. "No more drawers." Each sidebar tool now swaps the centre content. `ChapterListPanel` loses its modal overlay and renders inline.

Between (2) and (3), `60ec36d` removes the **Regen Chapters** button (B042, "temporary chapter system no longer useful") and fixes a stale rsync diff surviving a successful push.

So: drawers were widened twice on Mar 22 and abolished on Mar 22.

### Day 3 — Mar 23: polish, tech debt, and a fourth relay UI

`682d8df` **manage-panel-polish** — fixes the stale closure over `modalChapterSettings` (silent data loss when the user edited chapter settings in the confirmation modal), deletes the `type === 'chapters'` branches that B042 orphaned, types `activeTool`, extracts pure functions, +41 tests.

`c0e291e` **tech-debt-round1** — 7 relay response interfaces + HTTP status checks on all hooks (B043), +42 naming tests (B032), and **B045: AWB removed from the top nav** and demoted into the Manage sidebar (`poem-wui` tab and `PoemWuiPage` import deleted from `App.tsx`).

`99aef7d` **B046 relay-redesign** — the fourth relay UI in four days. The 260-line `RelayTool.tsx` becomes 535 lines: three lane cards (Recordings → First Edit → Final), expandable file drawers with chapter grouping, an activity feed, global toasts. Server side: `relay:changed` replaces the three B038 socket events, `GET /files` with chapter extraction, an in-memory 50-event ring buffer behind `GET /activity`. `ProjectsPanel` gets a Relay column with hover-tooltip dot indicators. 941 tests.

Then five consecutive hotfixes in **90 minutes**, all on `RelayTool.tsx`, all about the same two words:

| Time | Commit | Change |
|---|---|---|
| 16:20 | `8ecc4d8` | remove duplicated "Relay Collaboration" heading |
| 16:33 | `a974121` | setup guide rewritten with real SyncThing commands; says `machineRole: "creator"` |
| 16:37 | `f8fffb2` | no — the enum value is `"recorder"`, not `"creator"` |
| 16:41 | `c516413` | give up: `isCreator = role !== 'editor'` |
| 16:45 | `dc0d1f9` | Send-to-Editor button was disabled when relay was empty; push copies *to* relay |
| 16:48 | `64e5f1c` | a `fix:` commit touching only `CLAUDE.md` + `BACKLOG.md`, restating the three fixes above and adding the Machine Inventory table |

The era closes with `e0ca7ab` (731-line Mochaccino mockup for B044 Sync Hub), `7d24475` (B046 marked done), `34f034d` (next-round brief for B044) and `1b06f68` (**B044 marked complete**).

**Note on the era boundary**: `1b06f68` marks B044 Sync Hub complete at 20:19:10. The commit that actually implements it, `ba19b14` ("feat: B044 Sync Hub — two-channel git sync with header indicators and conflict UI"), lands at 20:19:46 — **36 seconds later, outside this range**. Verified via `git merge-base --is-ancestor ba19b14 1b06f68f` → false. The docs-reconciliation commit was ordered ahead of the code commit. Within this range alone, B044's only artifact is the HTML mockup.

---

## Feature ledger

| ID | Area | Capability | Evidence | Kbd/Vis |
|---|---|---|---|---|
| B024 | config/paths | `PROJECTS_ROOT` replaced by `getConfig().projectsRootDirectory` across 9 files; `projectResolver` gains a `projectsRootDir` param | `36f0571` | — |
| B025 | storage | `writeProjectState` made atomic (`.tmp` + `fs.rename`) | `36f0571` (`server/src/utils/projectState.ts`) | — |
| B026 | config | `assets`/`thumbs`/`system` route factories take `() => getConfig()` | `36f0571` | — |
| B027 | chapters | swap-chapters guarded against chapter-99 collision | `36f0571` (`server/src/routes/manage.ts`) | — |
| B028–B031 | tests | +57 tests: `renameRecording` pipeline, `extractChapters`/`findMatchInSrt`/`calculateSimilarity`, `client/src/utils/srt.ts`, `editManifest` | `ec0b16a` | — |
| B038 | relay | Relay MVP: `relayDirectory`/`relayEnabled` config, `startRelayWatcher()`, `routes/relay.ts` (status/preview/push/collect), `parseRsyncDiff`, `RelayTool` in a drawer | `dce171b` | — |
| B038 | sync | `POST /api/system/git-sync` (`git pull --rebase`) + `useGitSync()` + Git Sync button | `dce171b` | — |
| B039 | security | `bash -lc` string interpolation → `execFile` with arg arrays, in relay + git-sync | `21f4ebe` | — |
| B039 | relay | `relayEnabled` guard + projectCode traversal validation on every POST; `.DS_Store`/`._*` rsync excludes | `21f4ebe` | — |
| B039 | config | `MachineRole = 'recorder' \| 'editor'` added to `Config`, `saveConfig`, `EnvironmentResponse` | `21f4ebe` (`shared/types.ts:4`) | — |
| B039 | layout | Manage sidebar regrouped Record / Edit / Collaborate; drawers 300→600px | `21f4ebe` | — |
| B039 | s3 | S3 Staging retired — `S3StagingTool.tsx`, `useS3StagingApi.ts`, `routes/s3-staging.ts` deleted (−1,755) | `21f4ebe` | — |
| B040 | relay | `getRelayPaths()`, `rsyncExcludeArgs()`, `RELAY_SUBFOLDERS`, 9 exclusion patterns | `18b09ca` | — |
| B040 | relay | `GET /browse` + `RelayBrowser.tsx` — per-project × per-subfolder table | `18b09ca` | **Vis**: colour dots (blue/amber/emerald), size formatter, totals footer, legend, row hover |
| B040 | relay | subfolder-aware push/collect/preview + UI dropdown; collect path bug fixed (was `relay/<code>/final/`) | `18b09ca` | — |
| B040 | relay | `GET /versions` + `POST /promote` with traversal validation, version list UI | `18b09ca` | — |
| B040 | relay | role-based visibility — push/collect/promote shown per `machineRole` | `18b09ca` | — |
| B042 | chapters | Regen Chapters button removed from sidebar (server route kept for Regen All) | `60ec36d` | — |
| B041 | manage | Context-sensitive tool pages — all 4 `SlideOutDrawer`s removed, tool owns the centre, contextual heading | `1b436e2` | **Kbd**: inline chapter rename input with Enter=save / Escape=cancel (`ChapterListPanel`) — the era's *only* keyboard affordance |
| B041 | manage | `ChapterListPanel` de-modalised, renders inline, alert→toast | `1b436e2` | — |
| — | manage | stale-closure fix on `modalChapterSettings`; dead `type==='chapters'` branches removed; +41 tests | `682d8df` | — |
| B043 | relay | 7 relay response interfaces + HTTP status checks on all 7 hooks | `c0e291e` | — |
| B032 | naming | +42 tests for `parseImageFilename`, `buildImageFilename`, `findNextSequence`, `calculateSuggestedNaming` | `c0e291e` (`shared/naming.test.ts`) | — |
| B045 | nav | AWB (`poem-wui`) removed from top nav, demoted to a Manage sidebar tool | `c0e291e` (`client/src/App.tsx`) | — |
| B046 | relay | `relay:changed` socket event with real path parsing (`projectCode/subfolder/filename`) | `99aef7d` (`server/src/WatcherManager.ts`) | — |
| B046 | relay | `GET /files` with chapter extraction (`/^(\d{2})-/`) and `source=project\|relay` | `99aef7d` | — |
| B046 | relay | In-memory activity ring buffer (50) + `GET /activity`, logged on push/collect/promote | `99aef7d` (`server/src/routes/relay.ts`) | **Vis**: activity feed with relative timestamps |
| B046 | relay | RelayTool rewritten as three workflow lanes + expandable file drawers grouped by chapter | `99aef7d` | **Vis**: lane cards, dot colours, direction labels ("YOU → EDITOR") |
| B046 | relay | Global relay toasts via `useRelaySocket()` in `App.tsx` | `99aef7d` (`client/src/hooks/useSocket.ts`) | **Vis**: toast notifications |
| B046 | projects | `ProjectsPanel` Relay column | `99aef7d` | **Vis + hover**: `RelayIndicator` with `useDelayedHover(0,150)` tooltip listing per-subfolder counts |
| B046 | relay | Collapsible SyncThing setup guide with real `brew` commands, device-ID steps, JSON config samples | `99aef7d`, `a974121` | — |
| B044 | sync | Sync Hub *design only* — 5-scenario interactive mockup | `e0ca7ab` (`.mochaccino/designs/sync-hub/index.html`) | **Vis**: persistent header status pills (green/amber/red/purple), conflict-resolution UI |

### Keyboard / direct-manipulation scorecard

Scanned every `client`/`server`/`shared` diff in the range for `onKeyDown`, `onKeyPress`, `keydown`, hotkey/shortcut, `onDrag`, `onDrop`, `draggable`, `dataTransfer`:

- **One hit total** — the Enter/Escape handler on the inline chapter-number input in `ChapterListPanel` (`1b436e2`).
- **Zero** global shortcuts, zero drag-and-drop, zero drop targets, in an era whose entire subject was moving files between folders and machines.
- The era *removed* hover affordance: B041 replaced `ToolsSidebar`'s dynamic tooltips (`Regenerate shadows for ${selectedFiles.length} selected`) with static strings ("Regenerate shadows, transcripts, and chapters"). Verified in the `1b436e2` diff of `ToolsSidebar.tsx`.
- Visualisation additions were 11 `rounded-full` status dots and one activity feed. No progress bars, no spinners (grep for `progress`, `animate-spin`, `animate-pulse` over the era's client diffs returns only two tooltip strings saying "Git sync in progress...").

---

## Dead ends

### 1. S3 Staging — deleted (−1,755 lines), but its footprint never left

`21f4ebe` deleted `client/src/components/shared/S3StagingTool.tsx` (679), `client/src/hooks/useS3StagingApi.ts` (332) and `server/src/routes/s3-staging.ts` (744). The commit body says "Keep `s3Utils.ts` and `poem-wui.ts` (used independently)."

**Fate: deleted, residue permanent.** `shared/paths.ts` still declares `s3Staging: path.join(projectDirectory, 's3-staging')` as a first-class project path today, `server/src/utils/s3Utils.ts` (83 lines) is still present, and `s3-staging/` still appears as an exclude pattern in `holdUtils`/`storageRoutes`. The era's own architectural review had predicted this: it flagged that `ProjectPaths` "hardcodes `s3Staging: string` as a first-class path". Deleting the feature did not delete the concept.

### 2. The three B038 relay socket events — declared, never wired

`dce171b` added to `ServerToClientEvents`:

```
'relay:recordings-available': (data: { projectCode: string; count: number }) => void;
'relay:edit-received':        (data: { projectCode: string; filename: string }) => void;
'relay:sync-status':          (data: { status: 'idle'|'syncing'|'error'; message?: string }) => void;
```

Verified at `18b09ca` (four days later, after two more relay campaigns):
- `relay:edit-received` and `relay:sync-status` — **zero emitters, zero listeners**; the only occurrence in the whole tree is the type declaration itself (`git grep` at that ref hits only `shared/types.ts:380-381`).
- `relay:recordings-available` — emitted exactly once, in `WatcherManager.ts:251`, as `this.io.emit('relay:recordings-available', { projectCode: '', count: 0 })`. A hardcoded empty payload.
- `git grep 'relay:' 18b09ca -- client` returns **nothing** — no client ever listened.

**Fate: superseded.** `99aef7d` deleted all three and replaced them with a single `relay:changed` that carries a real parsed payload. So for four days, across three "shipped" relay campaigns, the real-time relay layer was a stub.

**Why it happened**: those three event signatures appear *verbatim* in `docs/planning/architectural-review-relay-2026-03-19.md` (added in `ec0b16a`) under "New Socket.io events needed". The contract was copied from a design document into `shared/types.ts` before any consumer existed. A type that no one calls compiles perfectly.

### 3. `RelayBrowser.tsx` — orphaned within ~18 hours, still in the tree

Created `18b09ca` (Mar 22, 23:23) as B040's folder browser: a 123-line table with per-subfolder colour dots, a `formatSize` helper, a totals `<tfoot>` and a legend. `99aef7d` (Mar 23) replaced the whole browse-oriented UI with workflow lanes.

**Fate: still present but unused.** `grep -rn "RelayBrowser" client/src server/src shared` today returns exactly one line — its own `export function` declaration. Nothing imports it. It has been carried through two later refactors (`fb99b1b` Warm Linen theme, `a38d9f2` `/simplify` consolidation) without anyone noticing it is dead.

### 4. `SlideOutDrawer` — the pattern the project explicitly repudiated, still exported

B038 put `RelayTool` in a drawer. B039 widened drawers to 600px. B040 widened the relay drawer to 700px. B041, the next day, removed all four drawer instances. The campaign's own assessment says it plainly:

> "The SlideOutDrawer pattern was a dead end for this project — inline rendering with conditional content is simpler and more maintainable."
> — `docs/planning/manage-page-redesign/assessment.md` (`80f97f8`)

**Fate: still-present-but-unused.** `client/src/components/shared/SlideOutDrawer.tsx` (61 lines) and its barrel export in `shared/index.ts:10` are still in the tree; a grep across `client/src` finds no JSX usage.

### 5. Regen Chapters — removed, leaving unreachable branches behind

`60ec36d` removed the button (B042, feedback F001: "temporary chapter system that's no longer useful"). The server route was deliberately kept "for Regen All". The `type === 'chapters'` branches in `handleRegenClick` became unreachable and survived until `682d8df` cleaned them up — flagged by the campaign's own audit as "should have been caught during B042".

**Fate: reverted in UI, dead code lingered one campaign.**

### 6. Activity feed richness — typed but never populated (in this era)

`RelayActivityEvent` declares `fileCount?: number` and `totalSize?: number`, and `99aef7d`'s commit body advertises descriptions like `"You pushed 15 recordings (338 MB)"`. The three `logRelayActivity(...)` call sites in that commit pass `description: 'Pushed ${subfolder} to relay'` and omit both numeric fields. The campaign assessment lists it as the #1 code-quality issue: *"activity descriptions are static strings — fileCount/totalSize never populated."*

**Fate: partially fixed later.** `server/src/routes/relay.ts` today does populate `fileCount`/`totalSize` at lines 297–303 in a different endpoint. I did **not** verify which later commit closed the gap on the activity-log call sites specifically — treat "fixed later" as uncertain; what is verified is that it shipped empty in `99aef7d`.

### 7. The `bash -lc` shell pattern — prescribed on Mar 19, ripped out on Mar 22

`architectural-review-relay-2026-03-19.md` recommends, under "What's Already Well-Positioned":

> "**`execAsync` shell pattern**: `runDamCommand()` in `s3-staging.ts` is the proven template for `gitSync()`. Uses `bash -lc` wrapper so PATH is available…"

`dce171b` followed the advice: four `bash -lc "…'${interpolatedPath}'…"` call sites. `21f4ebe` replaced every one with `execFile` + arg arrays as a **security** fix, three days later — and in the same commit deleted `s3-staging.ts`, the file the pattern was copied from.

**Fate: reverted.** The dead end here is the *review*, not the code: it validated a pattern by citing precedent in a subsystem that was about to be deleted.

### 8. `-w` `relayPartnerId` — designed out before it was built

The architectural review explicitly deferred `relayPartnerId` ("Not needed for MVP… User identity becomes relevant when Supabase lands"). It never appears in `Config`. Noted here only because the era's whole authorization story rests on there being no identity at all — see Architectural Moments #3.

---

## Pivots

### Pivot 1 — Transport: S3/DAM → SyncThing relay bucket
**From**: recordings and edits move through S3 via the DAM CLI (`s3-staging/`, `S3StagingTool`, 744-line route).
**To**: a machine-global `~/relay/flihub-appydave/` folder that SyncThing replicates peer-to-peer; FliHub only rsyncs into and out of it.
**Trigger**: the braindump constraint — *"SyncThing CANNOT be used on `v-appydave/` or any git-tracked project folder"* plus *"folders are too large (no NAS, limited disk space)"* — combined with the real goal: getting **raw** recordings to Jan so he can do the Gling edit, which S3 never carried.
**Evidence**: `ec0b16a` (`requirements-workflow-braindump-2026-03-19.md`), `dce171b` (relay built), `21f4ebe` (S3 deleted).
**Note the whiplash**: the architectural review written on Mar 19 said "The relay feature does not need to replace S3… relay is an **alternative**… while S3 continues to be used for the second-edit workflow." Three days later S3 was deleted outright.

### Pivot 2 — UI: slide-out drawers → tool-owned pages
**From**: a fixed "Manage & Export" shell with a permanent recordings list in the centre, tools opening in 300px (then 600px, then 700px) drawers.
**To**: the sidebar is pure navigation; the selected tool owns the whole centre; the heading is contextual.
**Trigger**: David's own feedback, verbatim in `docs/planning/flihub-feedback.md` (`18b09ca`):
> F002 — *"'Manage & Export' heading shown regardless of which tool is active… generic noise."*
> F003 — *"Tools bolted onto a page that was never designed to hold them. The three-column layout with a static recordings list in the centre doesn't serve any tool well."*
**Evidence**: `1b436e2` (all 4 drawers removed), `80f97f8` (assessment: drawers "a dead end for this project").

### Pivot 3 — Relay UI: infrastructure view → workflow view
**From**: a folder browser. Pick a subfolder from a dropdown, look at a table of projects × subfolders, hit Push or Collect. The mental model is *the relay filesystem*.
**To**: three lane cards named after pipeline stages (Recordings → First Edit → Final), each with a direction label ("YOU → EDITOR"), a role-appropriate verb ("Send to Editor" / "Pull from Editor" / "Promote to Final"), an expandable file drawer, and an activity feed underneath. The mental model is *the handoff*.
**Trigger**: the commit message states it directly — "Replace infrastructure-oriented relay UI (subfolder dropdown, global browser) with workflow-oriented design". The Mochaccino mockup gave the agent a visual target; the assessment credits it: *"Mockup-driven UI: the Mochaccino mockup gave the lanes agent a concrete visual target."*
**Evidence**: `99aef7d`. Casualty: `RelayBrowser.tsx` (dead end #3).

### Pivot 4 — Top-level navigation shrinks; Manage absorbs everything
**From**: AWB / POEM WUI as a first-class tab in `App.tsx` (`FR-144`).
**To**: a tool inside the Manage sidebar; `ViewTab`'s `'poem-wui'` member and the `PoemWuiPage` import deleted.
**Trigger**: feedback F005.
**Evidence**: `c0e291e` (`client/src/App.tsx`). Same era also removed Regen Chapters and S3 Staging from the sidebar — the direction across the whole era is *fewer top-level surfaces, more tools funnelled through Manage*, which is exactly what made Manage the pressure point that F003 complained about.

### Pivot 5 — Sync itself becomes a product surface
**From**: one button ("Git Sync") running `git pull --rebase`, tucked under Actions.
**To**: B044 Sync Hub — two channels (app code + video project), push *and* pull, dirty/behind/conflict state, persistent header indicators on every page, conflict resolution UI.
**Trigger**: feedback F004 — *"Jan and Roamy need to go to terminal and run `git pull`… No notification that a new version is available."* The collaboration feature exposed that the collaborators couldn't get the app that runs the collaboration feature.
**Evidence**: `e0ca7ab` (mockup), `34f034d` (brief), `1b06f68` (marked complete); implementation `ba19b14` is the first commit of the next era.

---

## Pain signals

### 1. `machineRole` — 5 fixes in 90 minutes, and the vocabulary never converged
| Commit | Time | What |
|---|---|---|
| `a974121` | 16:33 | setup guide tells collaborators to set `"machineRole": "creator"` |
| `f8fffb2` | 16:37 | "uses correct machineRole value **'recorder'** not 'creator'" |
| `c516413` | 16:41 | `isCreator = role === 'recorder'` → `role !== 'editor'` |
| `dc0d1f9` | 16:45 | push buttons disabled when relay empty (push copies *to* relay) |
| `64e5f1c` | 16:48 | docs-only `fix:` commit restating the above + adding the Machine Inventory table |

**The count is the finding.** Four code fixes and one doc fix, all on `RelayTool.tsx`, all downstream of one thing: the concept has two names. `shared/types.ts:4` says `MachineRole = 'recorder' | 'editor'`; the requirements brief, the UI labels and `CLAUDE.md` say **creator**. The resolution was not to pick one — it was to stop trusting the type: `role !== 'editor'`.

**Still unresolved today** (verified in the working tree):
- `shared/types.ts:4` — `export type MachineRole = 'recorder' | 'editor';`
- `server/config.json` — `"machineRole": "recorder"`
- `client/src/components/shared/SyncTool.tsx:110` — `const isCreator = role !== 'editor';`
- `SyncTool.tsx:183` — renders the label `'Creator'`
- `CLAUDE.md` — table column says `creator`; rule says *"defaults to `recorder` (legacy alias for creator)"*

Five months on, a two-value enum still has three spellings and is never compared by equality.

### 2. `RelayTool.tsx` — 8 commits, 4 designs, 3 days
`git log --oneline 1588f7bb..1b06f68f -- client/src/components/shared/RelayTool.tsx` → **8**. Line count: created at 170 (`dce171b`) → 260 (`18b09ca`) → 535 (`99aef7d`) → 245 today (after later decomposition into `client/src/components/shared/relay/`).

### 3. The Manage page — 8 commits on `ManagePanel.tsx`, 7 on `ToolsSidebar.tsx`, in 34 total commits
Both files were touched by roughly a quarter of the era's commits. `ManagePanel.tsx` oscillated 643 → 633 → 649 → 636 → 639 lines while its internal paradigm changed twice. It is 677 lines today.

### 4. Campaign bookkeeping churn
`docs/planning/next-round-brief.md`: **16 commits** in this era, and it was **created and deleted 5 times** (`git log --diff-filter=D`/`A`) — a single filename repeatedly consumed and regenerated. `docs/planning/BACKLOG.md`: **15 commits**. That is more commits on two markdown files than on any source file.

### 5. Test counts stopped being trustworthy
Claimed progression across the era: 390 (`36f0571`) → 447 (`ec0b16a`) → 504→552 (`21f4ebe`) → 842 (`18b09ca`) → 941 (`99aef7d`). The 447→504 jump is unexplained by any commit in the range. The `relay-redesign` assessment names the problem outright:
> "**Test count discrepancy**: AGENTS.md said '925 tests' but actual count was 587 at start, 941 after campaign. Prior campaign's count included different test runner invocations."

The number that every campaign used as its headline health metric was measuring different things in different campaigns.

### 6. Post-campaign hotfix tails are structural, not incidental
Every one of the three big relay campaigns closed with a "done" commit and then needed fixes: B038 → `21f4ebe` calls its rsync parsing "broken" and its shell usage a security vulnerability; B040 → `60ec36d` fixes a stale diff surviving push; B046 → five hotfixes. The pattern is consistent: **campaigns were graded by their own agents against their own AGENTS.md, and the gap only surfaced when David used the app in a browser** (`64e5f1c`: "tested in browser").

### 7. Duplicate formatters, flagged and unfixed
The `relay-redesign` assessment's suggestion #5 was *"Extract formatSize/formatRelativeTime to shared utility (duplicated across components)."* Today there are still **four** `formatSize` definitions (`DeveloperDrawer.tsx`, `RelayBrowser.tsx`, `shared/relay/types.ts`, `server/src/utils/formatters.ts`) and `formatRelativeTime` appears across 9 client files.

---

## Architectural moments

### 1. The relay grew its own path system, parallel to `shared/paths.ts` — and it is still there
`getRelayPaths(config)` was defined in **`server/src/routes/relay.ts`** (`18b09ca`), not in `shared/paths.ts`. The architectural review had explicitly recommended the opposite:

> "7. **Add relay fields to `ProjectPaths`** — Add `relayDir` to `getProjectPaths()` in `shared/paths.ts`, derived from `config.relayDirectory` + project code."

That recommendation was never executed. Verified today: `grep -n "relay" shared/paths.ts` returns **nothing**; `getProjectPaths()` has no `relayDir`. Meanwhile `WatcherManager.startRelayWatcher()` parses the *same* path structure (`projectCode/subfolder/filename`) independently, with its own hardcoded subfolder list. The B046 assessment noticed and filed it as suggestion #7 — *"Consider extracting parseRelayPath() into shared/paths.ts — watcher and routes parse the same path structure independently"* — and it was not done.

**Consequence for a rebuild**: there are two path authorities. Anything that changes the relay layout must be changed in `routes/relay.ts`, in `WatcherManager.ts`, and in whatever component hardcodes the folder name — with no compiler help.

### 2. The folder vocabulary was invented three times and never unified
`edit-1st` / `edit-2nd` first entered the codebase on **2026-01-03** in `5229de0` (`FR-126: Edit folder manifest tracking`) as `EditFolderKey = 'edit-1st' | 'edit-2nd' | 'edit-final'`. On **2026-03-22**, `18b09ca` introduced the *same string literals* as a brand-new, unrelated type: `RelaySubfolder = 'recordings' | 'edit-1st' | 'edit-2nd'`.

Today the same literals live in at least four disconnected places:
- `shared/types.ts:7` — `RelaySubfolder`
- `shared/types.d.ts:665` — `EditFolderKey` (superset, includes `edit-final`)
- `server/src/routes/relay.ts` — `RELAY_SUBFOLDERS` array
- `server/src/WatcherManager.ts` — a hardcoded `['recordings','edit-1st','edit-2nd']` literal that does **not** import `RELAY_SUBFOLDERS` (verified: `grep -n RELAY_SUBFOLDERS server/src/WatcherManager.ts` → no match)

And `shared/paths.ts`'s `getProjectPaths()` knows about `recordings`, `final`, `s3Staging`, `inbox…` but **not** `edit-1st`/`edit-2nd` — even though `POST /promote` reads from `path.join(paths.projectDir, 'edit-2nd', filename)`.

**Consequence**: "the pipeline stages" is the single most important concept in the app and it was never given one home.

### 3. Role became an authorization concept implemented entirely in the view layer
B040's work unit is literally named `role-based-visibility`. The requirements brief said editors have *"No destructive controls in FliHub."* What shipped:

- `machineRole` is read by the client from `GET /api/system/environment` and used to choose labels and hide buttons (`RelayTool.tsx`, later `SyncTool.tsx`).
- `server/src/routes/relay.ts` **never reads `machineRole`** — verified today: `grep -rn "machineRole" server/src/routes/relay.ts` returns nothing.
- `POST /promote` validates the filename for traversal and nothing else. Any machine can POST it.
- The default is **fail-open**: `server/src/routes/system.ts:239` — `machineRole: config.machineRole || 'recorder'`. Combined with `isCreator = role !== 'editor'`, a machine with a missing *or misspelled* role gets creator powers.

**Consequence**: this is fine while the only clients are trusted machines on Tailscale, which is exactly the situation — but it means the role concept cannot be tightened later without inventing server-side enforcement from scratch, and it means the "editor can't do destructive things" guarantee in the requirements brief is not a guarantee at all.

### 4. "What changed" is derived by scraping rsync's human-readable output
`parseRsyncDiff(stdout)` reads `rsync --itemize-changes` text and pattern-matches on `*deleting`, `>f+++`, `>f…`. It was written in `dce171b`, patched in `21f4ebe` (the original `line.slice(12)` broke on any itemize format variation), and is still the mechanism today (`server/src/routes/relay.ts:632`, called at :341).

**Consequence**: the app's model of sync state is a text parse of an external CLI's presentation layer. Any rsync version or flag change is a silent data bug — the parser returns empty arrays rather than failing.

### 5. The relay activity log is server memory, not a shared artifact
`99aef7d` put the activity feed in a module-level array: `const activityLog: RelayActivityEvent[] = []` with `MAX_ACTIVITY = 50`, in `routes/relay.ts`. Still there today (lines 46–57).

Three properties follow, none of which were stated as decisions:
- a server restart erases the collaboration history;
- **David's FliHub never sees Jan's actions** — the log records only what this process did, while the relay folder itself is the one thing both machines can see;
- the feature that answers "what has been sent / what came back" — the exact question the requirements brief asked for under "Visual Indicators" — is answered from the least durable place in the system.

A `manifest.json` inside the relay folder (which the referenced DSS `sync.ts` implementation actually used, per the architectural review) would have been shared, durable, and watchable. That option was in the review and not taken.

### 6. The relay watcher's debounce silently drops payload-bearing events — identified in this era, unfixed today
`WatcherManager.startRelayWatcher()` debounces on a **single key** `'relay'` with a 1000ms timer, and every `add`/`unlink` clears the previous timer. When 15 recordings sync in, 14 events are discarded and one `relay:changed` fires with the last filename.

The `relay-redesign` assessment caught it at the time and generalised it correctly:
> "**Watcher debounce must be per-event-type** when events carry distinct payloads — content-free events (like `recordings:changed`) can safely coalesce, but payload-bearing events (`relay:changed` with filename) lose data."

Verified in the working tree today: still one `this.debounceTimeouts.get('relay')` key, still `setTimeout(..., 1000)`, still per-file payload. The learning was written down and not applied.

### 7. Workflow direction lives as `if/else` inside a React component
`99aef7d` expresses the entire domain model of the collaboration pipeline as three parallel functions in `RelayTool.tsx`:

```
getDirectionLabel(lane, isCreator)  // "YOU → EDITOR" / "CREATOR → YOU" / …
getActionLabel(lane, isCreator)     // "Send to Editor" / "Pull into Project" / "Promote to Final"
isPushAction(lane, isCreator)       // recordings ? isCreator : !isCreator
```

Who sends what, in which direction, at which stage — the thing the requirements brief spent two ASCII flow diagrams describing — is three branch tables in the view. The server does not model it. `shared/` does not model it. `dc0d1f9`'s bug (push buttons disabled when the relay was empty) is a direct symptom: the UI had to *infer* direction from file counts because nothing told it.

### 8. The campaign apparatus became a first-class part of the codebase
This era created eight per-campaign `docs/planning/<campaign>/` folders, each with its own forked `AGENTS.md` (`pre-feature-stabilisation` 210 lines, `test-coverage-gaps-2` 291, `relay-collaboration-phase-1` 338, `manage-relay-refactor` 452, `manage-relay-refactor-w2` 645, `manage-page-redesign` 405, `manage-panel-polish` 318, `tech-debt-round1` 246, `relay-redesign` 619 — **~3,524 lines as they stand today**), plus `IMPLEMENTATION_PLAN.md` and `assessment.md` per campaign. The repo now holds **27** campaign `AGENTS.md` files totalling 10,382 lines.

The assessments explicitly credit copy-forward inheritance for the velocity — *"AGENTS.md inheritance from manage-relay-refactor-w2 was effective — agents knew the codebase patterns immediately"* — and the same mechanism produced the stale test count in signal #5. Copied context is fast and drifts.

**Consequence**: the era's docs out-grew its code (+6,104 doc lines vs +5,659 code lines), and campaign closeout became a source-of-truth ritual whose ordering was not guaranteed — B044 was marked complete 36 seconds *before* its implementation commit existed.

---

## What a rebuild should learn from this era

1. **Name the pipeline once, in `shared/`.** One `PipelineStage` model — stage id, display label, which side produces it, which side consumes it, where it lives locally, where it lives in the relay. Everything else (`RELAY_SUBFOLDERS`, the watcher's literal array, `EditFolderKey`, `getRelayPaths`, `getDirectionLabel`/`getActionLabel`/`isPushAction`) becomes a projection of that one model instead of a fifth independent copy.

2. **Path derivation is a single module, and the relay is not an exception.** `getProjectPaths()` should have returned the relay paths from day one — the review said so and it was skipped for speed. If a path is computed in a route handler, it will be recomputed in a watcher within a week.

3. **Sync direction belongs on the server, not in a component.** The server knows the role, the folders, and the file state. It should return "here are the available actions and their directions"; the UI should render them. That single change removes the `isCreator` thrash, the empty-relay disabled-button bug, and the client's need to guess.

4. **If a role gates a destructive operation, enforce it where the operation happens.** Hiding a button is a UI preference. And do not default an unknown role to the privileged one.

5. **Don't declare a contract before a consumer exists.** Three socket events were copied from a design doc into `shared/types.ts` and sat there for four days, two of them never emitted, none ever listened to, all three eventually deleted. TypeScript will happily compile a fully-specified system that does nothing. Add the event when the listener lands.

6. **Collaboration state belongs in the shared medium.** The relay folder is the one surface both machines see. A manifest written there is durable, watchable, and answers "what did the other side do" — which an in-process ring buffer structurally cannot.

7. **Don't parse a CLI's presentation output as a data source.** Compare directory listings, or use a transfer library. `parseRsyncDiff` has been patched once already and fails silently when it fails.

8. **Debounce content-free events; never debounce payload-bearing ones on a shared key.** This exact lesson was written into an assessment in this era and is still a live bug in `WatcherManager.ts`. A rebuild should either make events content-free (`relay:changed` → "something changed, refetch") or key the debounce by payload identity — and the choice should be explicit in the socket contract.

9. **A "tools page" is a router, and needs to be designed as one from the start.** The Manage page got three layouts in three days because tools kept being bolted onto a shell that was never a router. F003's phrasing is the spec: *"Relay should feel like a relay page. Rename should feel like a rename page."*

10. **Assessments generate findings faster than campaigns consume them.** Five suggestions from the `relay-redesign` assessment — debounce key, activity payloads, `enabled:` guard on `useRelayBrowse`, shared formatters, `parseRelayPath()` extraction — were written on 2026-03-23 and at least three are still open. A rebuild should either promote assessment suggestions into the backlog automatically or stop generating them; a findings list nobody drains is a slowly-souring inventory.

11. **Keyboard and direct manipulation were never on the agenda.** In an era entirely about moving files between folders, there is one Enter/Escape handler and zero drag-and-drop, and the only hover richness that existed (selection-count tooltips in `ToolsSidebar`) was *removed*. If direct manipulation matters in the rebuild, it has to be a first-class requirement, because it will not emerge from feature campaigns on its own.

12. **Delete the concept, not just the component.** S3 Staging's UI, hook and route were deleted in one commit; `s3Staging` is still a field in `ProjectPaths`, `s3Utils.ts` still exists, and `s3-staging/` is still hardcoded in exclusion lists five months later. Removal should include the type and the path.

---

## Verification notes (what this report did and did not check)

- Every commit in `1588f7bb..1b06f68f` was read — message, body, and `--stat`. Structurally significant commits (`36f0571`, `dce171b`, `21f4ebe`, `18b09ca`, `1b436e2`, `99aef7d`, plus all five machineRole hotfixes) had their diffs read directly.
- "Still present today" claims were checked against the **working tree** as of 2026-08-26, which contains uncommitted modifications (`ProjectListToolbar.tsx`, `projectFilters.ts`, `start.sh`). None of those files are relay- or role-related, so the relay/role findings are unaffected.
- **Dead-code claims** (`RelayBrowser`, `SlideOutDrawer`) rest on a `grep` for the identifier across `client/src`, `server/src` and `shared`. That rules out static imports and JSX usage. It would **not** detect a dynamic import or a string-keyed component registry. I found no such registry in this codebase, but I did not exhaustively search for one — treat "unused" as "no static reference", which is strong but not absolute.
- **"Never emitted"** for `relay:edit-received` / `relay:sync-status` was checked with `git grep` at ref `18b09ca` across `server`, `client` and `shared`. A hit would have appeared; none did. Absence and non-existence look identical to grep only if the identifier were constructed dynamically (e.g. `io.emit('relay:' + x)`) — I checked `WatcherManager.ts` and found only literal emits, so this one is solid.
- **The activity-log `fileCount`/`totalSize` gap** is confirmed *as shipped in `99aef7d`*. Whether and when it was later closed at the `logRelayActivity` call sites is **not verified** — today's `relay.ts` populates those fields at lines 297–303, but that is a different endpoint.
- **Test-count figures** are quoted from commit messages and assessments, not re-run. The era's own assessment says those numbers were inconsistent, so treat every count in the feature ledger as a claim, not a measurement.
- The B044 ordering finding (docs commit 36 seconds before the implementation commit) is verified via `git merge-base --is-ancestor ba19b14 1b06f68f` → false, plus committer timestamps. It shows the commits' *recorded* order; it does not prove the code did not exist on disk earlier.
