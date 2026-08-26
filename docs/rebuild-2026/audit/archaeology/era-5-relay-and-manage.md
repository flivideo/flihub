# Era 5 — "Relay and Manage" (2026-03-23 → 2026-03-25)

**Commit range:** `1b06f68f..ed908f8b` — 34 commits (28 non-merge), ~64 working hours wall-clock,
of which **26 commits land inside a single 11-hour day (2026-03-24)**.

**Audit method:** every commit message + body read; every `--stat` read; ~20 diffs read in full;
all deletions and all renames enumerated; every claim below cites a SHA or a `file:line` at a
specific SHA. Where a check cannot distinguish presence from absence, that is stated inline.

---

## Headline

**This is the era where FliHub grew a second, incompatible synchronisation system — and then spent
the rest of the era discovering that the two systems do not know each other exists.**

Relay (rsync over a Syncthing folder, filename-set comparison, no history) and Sync Hub (git,
commit graph, real history) both answer the question *"what does the other machine have that I
don't?"* — with different state models, different colour vocabularies, different indicators,
different scopes, and no shared abstraction. Everything painful in this era is downstream of that
one fact. The era ends (FR-147, `ed908f8b`) with a spec that names the flaw out loud — *"The three
sync systems (App Code, Video Project, Relay) operate independently with no dependency awareness"*
— and then **explicitly declines to fix it**, listing "Relay-to-sync orchestration" as out of scope
(`docs/prd/fr-147-relay-project-awareness.md:104`).

The secondary story is speed. Parallel worktree agents ("waves") shipped three server endpoints in
sixty seconds of commit timestamps (`89a05af`, `944acf2`, `4839dd8` all at 03-24 19:03–19:04) and
two client rewrites at 19:14. The throughput is real. So is the cost: the accordion config layout
lived **17 minutes**, the `showCheckbox` prop lived **105 minutes**, and the auto-create-folders
behaviour shipped at 19:04 was declared a data-loss bug **17 hours later**.

---

## Timeline narrative

### Mar 23 evening — Sync Hub lands (`ba19b14`, 20:19)

2,767 insertions in one commit. A brand-new subsystem: `server/src/routes/sync.ts` (399 lines),
`SyncTool.tsx` (429), `SyncIndicator.tsx` (112), `useSyncApi.ts` (117), 531 lines of tests, 60 lines
of new shared types. It replaces the old `POST /git-sync` + `useGitSync` (removed in the same commit,
`ManagePanel.tsx` diff).

Three decisions in this commit constrain the rest of the era and everything after it:

1. **The app repo is `process.cwd()`** (`sync.ts:144` at `ed908f8b`). FliHub's *own source tree* becomes
   a first-class managed resource of the running app. There is no config field for it, no validation
   that cwd is a git repo, no seam.
2. **The wire format for "what changed" is `git status --porcelain` text.** The server splits porcelain
   on newlines and ships `dirtyFiles: string[]` (`sync.ts:63`, `sync.ts:88` at `ba19b14`). The client
   then *re-parses* those lines itself — `parseDirtyFile()` added at `6c959d3`
   (`SyncTool.tsx`, `+34..+47`). The client/server contract for the sync subsystem is the git CLI's
   human output.
3. **`git add -A` on the video project** (`sync.ts:183` at `ba19b14`). Push means "stage literally
   everything and commit it", on a directory tree whose whole purpose is holding multi-gigabyte `.mov`
   files.

Eleven minutes later, `d289b11` fixes `⌘` / `🎬` rendering as literal text in four
components. Root cause: JSX *attribute* strings do not process `\u` escapes, JS string literals do —
so agents writing `icon="⌘"` produced visible garbage while `const x = '—'` was fine.
Four components had to be patched at once because **there is no icon or glyph layer**; every symbol
in this app is an inline literal (verified: `client/package.json` at `ed908f8b` has no icon
dependency — deps are react, react-dom, react-query, socket.io-client, sonner, monaco).

### Mar 23 late — Recording Editor replaces the Manage panel (`690f619`, 21:30)

The largest single behavioural change of the era, and the one genuine architectural *win*.

Deleted outright: `RenamePanel.tsx` (509 lines), `ChapterListPanel.tsx` (227), `RenameLabelModal.tsx`
(206) — 942 lines of "go to a panel, select files, describe what you want" UI. The `Rename` and
`Renumber` buttons are removed from `ToolsSidebar.tsx`. Replaced by `EditableFileRow` (387),
`BatchToolbar` (321), `PreviewPanel` (159), `SplitMarker` (38), `UndoToast` (58) — editing happens
*on the row where the problem is visible*.

The server side is the better half: `renameRecording.ts` switches from delete-and-regenerate
derivatives to `fs.rename` in place, killing a 5–10 minute re-transcription on every rename
(commit body; `server/src/utils/renameRecording.ts` +136/−?? in the stat).

But three structural choices land here that the rest of the era pays for:

- **Undo is a single module-scoped variable.** `let lastBatchMapping: Array<{oldFilename,newFilename}> = []`
  inside `createManageRoutes` (`server/src/routes/manage.ts`, `690f619` diff line 53). One slot,
  server-global, no project scoping, no user scoping, gone on restart.
- **`parseRecordingFilename` is lossy.** It returns `{chapter, sequence, name}` and *discards tags*
  (`shared/naming.ts:217-262` at `ed908f8b` — `stripTrailingTags(parts.slice(2))`, tags never
  returned). Every parse→rebuild round-trip silently drops data.
- **`RecordingsView.tsx` grows to 1,501 lines** despite five components being extracted from it.

### Mar 24 morning — Warm Linen (`fb99b1b` 10:13, `aa0c171` 10:16)

A 500-class mechanical replacement across 40+ components to stop the white UI reflecting off David's
face on camera. 12 semantic `@theme` tokens in `client/src/index.css`.

Three minutes later `aa0c171` patches it, and the patch is the finding:

- Four tokens agents *used* had no `--color-*` definition (`warm-strong`, `warm`, `warm-muted`,
  `warm-secondary`) — they were invented by agents following the migration guide, which instructs
  `divide-gray-*` → `divide-warm` (`docs/planning/AGENTS.md`, `fb99b1b` diff) before `--color-warm`
  existed.
- `surface-muted` and `surface-hover` were **the same hex** (`#ede7dc`), so hover states were
  invisible against secondary panels.
- `warm-header` was the same hex as `surface`, so the nav bar dissolved into the cards.

The fix adds the four missing tokens *as aliases of existing ones* — `--color-warm-muted: #7a6e5e`
duplicates `--color-text-warm-muted: #7a6e5e`; `--color-warm-secondary` duplicates
`--color-text-warm-secondary`. Two names for one colour, permanently.

And the migration guide contains the era's most consequential design decision, in a section titled
**"What NOT to Replace"**:

> keep all colored semantic indicators (status pills, buttons, alerts) — `bg-blue-*`, `bg-red-*`,
> `bg-green-*`, `bg-yellow-*`

The design system was scoped to *chrome* — surfaces, text, borders — and **status colour was
deliberately left outside it.** Status colour is the entire subject matter of this era.

### Mar 24 midday — the clash the theme created (`0dcdddc` 12:45, `6ea452c` 14:30)

`0dcdddc` is titled "Fix blue/brown clash": recording rows were `bg-blue-50` on a warm-linen page;
`TranscriptionBadge` was bright blue/green/yellow against brown text. Six colour swaps in one
component. This is the direct, same-day consequence of exempting status colour from the token system.

Same commit introduces **selection mode**: a `selectionMode` boolean in `RecordingsView` and a
`showCheckbox` prop on `EditableFileRow`, so checkboxes only appear after clicking "Select 05".

`6ea452c`, **105 minutes later**, deletes both (`EditableFileRow.tsx` diff: `-showCheckbox?: boolean`,
`-showCheckbox = true`) and replaces the idea with an opacity fade —
`opacity-15 group-hover:opacity-60`, solid when checked. At `ed908f8b`, `grep selectionMode|showCheckbox`
on `RecordingsView.tsx` returns nothing.

`6ea452c` also introduces the era's most interesting interaction: `ChapterHeader` with a
**hover-opened overflow menu** (`onMouseEnter={openMenu}`, `onMouseLeave={scheduleClose}` with a
250 ms `setTimeout` close-delay) holding safe/park/restore/transcribe/combine. Six chapter actions
move from always-visible clutter into hover. Plus a global `cursor: pointer` rule for all buttons in
`index.css`.

### Mar 24 afternoon — Sync Hub v2 and the code-push decision (`6c959d3`, 14:40)

`POST /api/sync/push` gains a `channel` parameter. `channel === 'app-code'` → `repoDir = process.cwd()`.

**FliHub can now `git add -A`, commit, and push its own source code, from a browser button.**
The next day (`fcb1ba2`) that browser is reachable from every machine on the Tailnet. There is no
auth middleware anywhere in the server — `server/src/index.ts:89` is `app.use(cors())` with no
origin restriction, and none of the 18 route mounts are gated.

Same commit adds `groupFiles()` to `SyncTool.tsx` — a client-side extension→category classifier
(Recordings / Transcripts / Images / Components / Source / Styles / Config / Other). The server
already has `buildCommitMessage()` doing the same job with a *different* taxonomy
(recordings / transcripts / images / other — `sync.ts`, `ba19b14`). Two divergent answers to
"what kind of file is this", one on each side of the wire, in an app that already has a canonical
`FolderKey` union and a `shared/naming.ts`.

### Mar 24 evening — config thrash (`72d71a3` 17:44 → `c3de5e3` 17:48 → `a20d2ec` 18:01)

Relay fields (`relayDirectory`, `relayEnabled`, `machineRole`) reach the Configuration UI. In the
same commit the page is reorganised into **collapsible accordion sections**.

**Seventeen minutes later** `a20d2ec` replaces the accordion with **horizontal tabs**.

`a20d2ec` also carries the era's clearest evidence of a missing seam. It extracts `FolderKey` into
`shared/types.ts` — and the diff shows the client and server unions **had already drifted**: the
server knew `edit-1st`, `edit-2nd`, `edit-final`; the client did not. The client literally could not
name three folders the server could open. Nothing failed at build time, because they were two
independent declarations. Caught by a human code review, not by the compiler, in a monorepo that has
a `shared/` workspace specifically to prevent this.

The same commit patches a data-loss bug nobody hit yet: `configManager.ts` migration writes a
**hand-maintained allowlist** of fields and drops everything else, so `relayDirectory`,
`relayEnabled` and `machineRole` would have been silently wiped on any config that triggered
migration (`server/src/config/configManager.ts:70-85` at `ed908f8b`). *(Caveat: this only fires when
`needsSave` is true, i.e. for configs still in an old format — so real blast radius is limited to
users who hadn't yet migrated. I did not verify how many such configs exist.)*

### Mar 24 evening — B047 stabilisation (`635615b`, 18:18)

Four bugs, all from a 3-lens audit of the 21-hour-old Recording Editor. Read together they are one
bug:

- **B050** — split-chapter dropped tags on every cascaded file. Cause: `buildRecordingFilename()`
  called without tags because `parseRecordingFilename()` never returned them.
- **B052** — the client had hand-rolled a *third* filename regex rather than use `shared/naming.ts`.
- **B051** — split-chapter never populated `lastBatchMapping`, so undo after split silently no-opped.
- **B053** — undo blew up on `ENOENT` if a file was renamed between batch and undo.

The B050 *fix* is the tell. Since `parseRecordingFilename` cannot return tags, the fix re-derives
them with a second parser, by hand, right next to the first:

```ts
const base = filename.replace(/\.(mov|mp4)$/i, '');
const nameParts = base.split('-').slice(2).join('-');
const { tags } = extractTagsFromName(nameParts);
```

Two parsers for one format, called back-to-back in one function, because the parse result is not a
lossless representation of the filename. *(Also visible: `parseRecordingFilename` at `ed908f8b`
strips only `\.mov$`, while `manage.ts` strips `\.(mov|mp4)$`. Whether `.mp4` recordings ever reach
the parser I did not verify — the check would look the same either way.)*

The owner's own assessment, written in this commit
(`docs/planning/recording-editor/assessment.md`), is unusually honest and worth quoting:

> AGENTS.md explicitly said "DO NOT re-implement filename parsing" but the selection-and-editing
> agent did it anyway… Anti-patterns may need to be repeated in the work unit prompt, not just
> AGENTS.md.

> Undo mapping storage was in both plan docs… **two separate documents specified this requirement and
> it was still missed.**

And it lists debt that was never paid in this era: `groupByChapter` has **3 implementations**
(RecordingsView, ManagePanel, WatchPage — B055); `manage.ts` is 1,556 lines; `RecordingsView` is
1,399 lines with 12 state variables.

### Mar 24 19:03–19:15 — the relay wave

Three parallel worktree agents land within 60 seconds of each other:

| SHA | Endpoint | Comparison model |
|---|---|---|
| `89a05af` | `GET /api/relay/divergence` | filename **set difference** per subfolder |
| `944acf2` | auto-create `edit-1st`/`edit-2nd` on collect | — |
| `4839dd8` | `GET /api/relay/browse?detailed=true` | `deriveSyncStatus(relayCount, localCount, exists)` — **file counts** |

Two agents, in the same wave, invented **two different definitions of "synced"** for the same domain.
`deriveSyncStatus` (`relay.ts:79-87` at `ed908f8b`) returns `'synced'` whenever `relayCount === localCount`.
`divergence` (`relay.ts`, `89a05af` diff) returns `'synced'` whenever the filename sets match. **Neither
looks at mtime, size, or hash** — a file present on both sides with different content is "synced" under
both models. The project's own assessment logs this
(`docs/planning/relay-kanban/assessment.md`: *"deriveSyncStatus is count-based, not identity-based…
'3 local, 3 relay' shows as synced even if files differ"*) and accepts it.

`f8f245f` (19:06) then deletes three accidentally-committed gitlink entries —
`.claude/worktrees/agent-a00111bf`, `agent-a8a8d1bd`, `agent-acdaede0` — pointing at the very commits
the wave produced. The parallel-agent machinery leaked into the repo, caused by `git add -A`.

19:14: two more agents rewrite the client. `39ed310` turns `RelayTool.tsx` into a **4-lane Kanban**
(Recordings → 1st Edit → 2nd Edit → Final) with colour-coded divergence borders. `e96eec2` turns the
project-list `RelayIndicator` from three dots into **directional mini-badges** (`REC ✓`, `1st ↓2`,
`2nd ↑1`).

Three things about `39ed310` matter for the rebuild:

- The Kanban has **four lanes but the transport has three subfolders.** `LaneKey = RelaySubfolder | 'final'`
  with `subfolder?: RelaySubfolder; // undefined for 'final'`. "Final" is a pipeline stage the relay
  layer has no concept of. `RELAY_SUBFOLDERS` is a hardcoded `['recordings','edit-1st','edit-2nd']`
  (`relay.ts:12`).
- The old lane labels are silently redefined: `edit-2nd` was labelled **"Final"** before this commit
  and becomes **"2nd Edit"** after, with a new "Final" beside it. The vocabulary changed under the
  data.
- It is written in **raw Tailwind palette classes** — 35 occurrences of `bg-/text-/border-{green,blue,amber,red,gray}-N`
  survive in `RelayTool.tsx` at `ed908f8b`, nine hours after the warm-linen campaign. Not a slip: the
  migration guide told it to.

### Mar 24 19:34–21:13 — three rounds of fixing what the wave shipped

`4105f5d` (19:34) — push/collect never invalidated `relayDivergence`, so the Kanban badges the same
campaign had just built were stale for up to 15 seconds. Two-line fix. Also fixes a copy-paste test
that asserted the wrong endpoint entirely — *false coverage*, caught by an audit, not by CI.

`cf6af61` (20:10) — six UAT findings (F006–F012) from real use on Jan's editor machine in the
Philippines. F007 is the sharpest: clicking **"Create Folders"** on the *Recordings* lane created
`edit-1st/` and `edit-2nd/`, because the button was wired to the `ensure-edit-folders` endpoint an
independent agent had built 66 minutes earlier with a hardcoded list. The fix widens the endpoint to
all three subfolders and renames it `ensure-folders` — **and adds a backward-compat alias**
(`router.post('/ensure-edit-folders', ensureFoldersHandler); // backward compat alias`) plus a
`/** @deprecated */` re-export of the hook, for a one-hour-old private endpoint in a single-app
monolith with no external consumer.

F009 records a design law worth keeping: **red = error, amber = action needed.** The `relay-only`
badge was red-with-`!` on Jan's machine, where "recordings exist in relay, not yet collected" is the
*normal starting state*.

`b590ab0` (21:01) — truncated file paths in the Sync file lists had no tooltip and no way to copy
them. Logged as F013 and fixed with `title=` + click-to-copy.

`2569b00` (21:13) — **the pivot of the era.** The Kanban's action buttons were hardcoded to
`machineRole`: recordings ⇒ creator pushes, edits ⇒ editor pushes. But David sometimes does the
Gling edit himself and needs to send `edit-1st` *out*. The fix derives the action from the observed
divergence direction instead of the assumed role.

It is a half-pivot, and the half shows in the code. `machineRole` is not removed; it survives as a
"fallback for when synced" in three places (`getActionLabel` default, `defaultIsPush`, `FileDrawer`
source selection). The residue is visible at `RelayTool.tsx:122` (`ed908f8b`):

```ts
return isCreator ? 'Push to Relay' : 'Push to Relay';
```

A ternary whose branches are identical — role-based logic hollowed out but not removed. And
`direction === 'both'` renders the label **"Sync Needed"** while `handleAction` still falls through
to the one-way role default, so the button labelled "sync" performs a push or a collect, not a sync.

### Mar 25 — Tailscale, and the era's last spec (`fcb1ba2` 11:10, `ed908f8b` 11:52)

`fcb1ba2` does two unrelated things in one commit, and the combination is the architectural moment.

*Widening:* Vite binds `host: true` (0.0.0.0); `client/src/config.ts` derives `API_URL` from
`window.location.hostname`; six hardcoded `localhost:5101` strings are removed from client
components. Those six existed despite `config.ts` carrying the comment
`/** NFR-12: Centralized client configuration */` — **a stated architectural rule with no enforcement
mechanism, which drifted.**

*Narrowing:* `withRepoLock()` — an in-memory `Map<string, Promise<void>>` keyed by repo path — is
added because the 120-second status poll's `git fetch` was racing the user's `git pull --rebase`.

The two halves fight. The lock serialises operations *within this one Node process*. In the same
commit the server becomes reachable from every machine on the Tailnet, so two browsers can now drive
`/api/sync/push` on the same repo concurrently — and David's own terminal was never covered anyway.
The mutual-exclusion boundary is the process; the concurrency boundary is now the network.

`ed908f8b` closes the era with FR-147. The spec's problem statement is the best diagnosis anyone in
this repo wrote:

> The three sync systems (App Code, Video Project, Relay) operate independently with no dependency
> awareness… Relay `collect` calls `fs.ensureDir()` — silently auto-creates folders outside git
> control… Editor ends up with ghost project directories that aren't tracked in git.

That `fs.ensureDir()` is the auto-create behaviour shipped 17 hours earlier at `944acf2`.

The fix: `browse?detailed=true` returns `projectExists` per project; `collect` refuses when the
project directory is missing; the UI shows a **BlockedProjectsBanner** with a one-click "Sync Video
Project" button. `useSyncPull` gains hardcoded knowledge of three relay query keys.

Three gaps between spec and implementation, all verified:

1. The spec says *"In `GET /api/relay/browse?detailed=true` **and** `GET /api/relay/divergence`… Return
   `projectExists`"*. `grep projectExists` on `relay.ts` at `ed908f8b` returns lines 168, 169, 189 —
   **browse only**. Divergence does not carry it.
2. The spec's acceptance criterion 3 is *"Relay Kanban splits into Ready and Blocked sections"*; the
   commit message says *"the UI splits into Ready/Blocked pools"*. What shipped is a **banner above an
   unchanged single-project Kanban** (`BlockedProjectsBanner`, `RelayTool.tsx:~753` at `ed908f8b`).
   There is no Ready pool.
3. The spec says *"Out of scope: Relay-to-sync orchestration (keeping systems independent with
   awareness, not coupling)"* — and the implementation puts relay cache keys inside the git-sync hook
   (`useSyncApi.ts`, `ed908f8b` diff). The coupling was declared out of scope and then implemented in
   the client hook layer, where it is least visible.

---

## Feature ledger

| Feature | Area | ID | SHA | Kbd/Vis |
|---|---|---|---|---|
| Sync Hub: `GET /sync/status` (2 channels), `POST /push`, `/pull`, `/resolve` | sync | B044 | `ba19b14` | |
| SyncIndicator header pills — colour dots + count badges + tooltips | sync / visualisation | B044 | `ba19b14` | **yes** |
| SyncTool page — channel cards, notification banners, conflict resolution UI | sync | B044 | `ba19b14` | |
| Inline recording editing — click chapter / name / tag segments to edit | recordings | B047 | `690f619` | **yes** (Enter=commit, Esc=cancel, hover affordances) |
| BatchToolbar — sticky on selection: Rename, Move to Ch, +/−Tag, Split Here | recordings | B047 | `690f619` | **yes** (Enter/Esc in popovers) |
| PreviewPanel — old→new change preview with green/amber status dots | recordings / visualisation | B047 | `690f619` | **yes** |
| SplitMarker — amber dashed chapter-break line | recordings / visualisation | B047 | `690f619` | **yes** |
| UndoToast — 30 s floating undo bar after batch ops | recordings | B047 | `690f619` | **yes** |
| Smart rename — derivatives `fs.rename`d in place (no re-transcription) | recordings | B047 | `690f619` | |
| `POST /manage/split-chapter` with cascade renumbering | recordings | B047 | `690f619` | |
| `POST /manage/undo-rename` | recordings | B047 | `690f619` | |
| Warm Linen theme — 12 `@theme` tokens, 40+ components, ~500 class swaps | ui/theme | B048 | `fb99b1b` | |
| Mochaccino mockups hub — `.mochaccino/` gallery + `client/public/mochaccino` symlink | ui/tooling | B048 | `fb99b1b` | |
| Checkbox opacity fade (faint → hover → solid) | recordings / visualisation | B049 | `6ea452c` | **yes** (hover) |
| ChapterHeader card + **hover-opened** overflow menu (6 chapter actions, 250 ms close delay) | recordings | B049 | `6ea452c` | **yes** (hover) |
| Global `cursor: pointer` rule for buttons | ui | B049 | `6ea452c` | **yes** |
| Sync channel cards: collapsible file lists grouped by type, A/M/D badges | sync / visualisation | B050 | `6c959d3` | **yes** |
| App-code push (creator) behind a confirmation modal | sync | B050 | `6c959d3` | |
| Header pill summary text + file-type-breakdown tooltips | sync / visualisation | B050 | `6c959d3` | **yes** (hover) |
| Relay config fields in ConfigPanel (`relayDirectory`, `relayEnabled`, `machineRole`) | config | — | `72d71a3` | |
| Tabbed Configuration layout (Directories / Recording Names / Collaboration / Advanced) | config | — | `a20d2ec` | |
| Canonical `FolderKey` in `shared/types.ts` | shared | — | `a20d2ec` | |
| `GET /relay/divergence` — per-subfolder filename set diff + direction | relay | B060 | `89a05af` | |
| Auto-create `edit-1st`/`edit-2nd` on recordings collect | relay | B060 | `944acf2` | |
| `GET /relay/browse?detailed=true` — local counts + `deriveSyncStatus` | relay | B060 | `4839dd8` | |
| **Relay Kanban** — 4 horizontal lanes with colour-coded divergence borders | relay / visualisation | B060 | `39ed310` | **yes** |
| Project-list Kanban mini-badges (`REC ✓`, `1st ↓2`, `2nd ↑1`) with hover tooltip | projects / visualisation | B050 | `e96eec2` | **yes** (hover, `useDelayedHover(0,150)`) |
| `POST /relay/ensure-folders` (all 3 subfolders) | relay | F006/F007 | `cf6af61` | |
| **RelayIndicator header pill** — aggregate relay state, dot + badge + multi-line tooltip | relay / visualisation | F008 | `cf6af61` | **yes** (hover) |
| `relay-only` badge red/`!` → amber/`↓N` | relay / visualisation | F009 | `cf6af61` | **yes** |
| Lane shows relay counts when local folder missing | relay / visualisation | F010 | `cf6af61` | **yes** |
| Push buttons disabled at 0 files | relay | F012 | `cf6af61` | |
| Open-in-Finder buttons on Sync channel cards + each Kanban lane + relay footer | sync/relay | — | `04bf2c1` | |
| Hover tooltip + click-to-copy on truncated file paths | sync | F013 | `b590ab0` | **yes** (hover) |
| Direction-aware relay actions (derived from divergence, not role) | relay | — | `2569b00` | |
| Tailscale access — Vite `host: true`, hostname-derived `API_URL` | infra | — | `fcb1ba2` | |
| `withRepoLock` — per-repo in-process git serialisation | sync | — | `fcb1ba2` | |
| `projectExists` + collect guard + BlockedProjectsBanner | relay | FR-147 | `ed908f8b` | **yes** (banner visualisation) |

---

## Dead ends

Ranked by how much they should change the rebuild.

### 1. `selectionMode` / `showCheckbox` — built 12:45, deleted 14:30 (105 minutes)
**Evidence:** added `0dcdddc` (`RecordingsView.tsx` `+const [selectionMode, setSelectionMode] = useState(false)`,
`EditableFileRow.tsx` `+showCheckbox?: boolean`); removed `6ea452c` (`-showCheckbox?: boolean`,
`-showCheckbox = true`). `grep -n "selectionMode\|showCheckbox"` on `RecordingsView.tsx` at `ed908f8b`
returns nothing.
**Fate:** deleted. **Why it failed:** an explicit *mode* was invented to solve a visual-noise problem
that a progressive-disclosure affordance (opacity fade on hover) solved with no state at all. Modes
are the expensive answer to clutter.

### 2. Collapsible accordion Configuration layout — 17 minutes
**Evidence:** `72d71a3` (`ConfigPanel.tsx` +181/−37, "collapsible sections… set-once sections collapsed");
`a20d2ec` 17 minutes later ("Replace collapsible accordion with horizontal tabs").
**Fate:** superseded. **Why:** the accordion encoded a *frequency* judgement ("set-once vs daily-use")
in the layout; tabs let the frequency judgement be one default (`Recording Names`) instead of a per-
section policy.

### 3. `POST /api/relay/ensure-edit-folders` — deprecated 66 minutes after birth
**Evidence:** created `944acf2` 19:04; at `cf6af61` 20:10 it becomes
`router.post('/ensure-edit-folders', ensureFoldersHandler); // backward compat alias` plus
`/** @deprecated Use useEnsureFolders instead */ export const useEnsureEditFolders = useEnsureFolders;`
**Fate:** still present, aliased. **Why:** it hardcoded two of three subfolders, so the Recordings lane's
"Create Folders" button created the wrong folders (F007, observed live on Jan's machine). The
back-compat alias is pure ceremony — the client and server ship in one repo, and no external consumer
exists.

### 4. Auto-create-on-collect — declared a data-loss bug 17 hours later
**Evidence:** added `944acf2` 03-24 19:04 (`fs.mkdir(editDir, {recursive:true})` inside the collect
handler). `docs/prd/fr-147-relay-project-awareness.md` (03-25 11:36) lists it as failure step 5:
*"silently auto-creates folders outside git control… ghost project directories that aren't tracked in git."*
**Fate:** partially reversed. The *project-level* guard was added (`relay.ts:399-408` at `ed908f8b`),
but the inline auto-create block is **still there** at `relay.ts:438` (`Auto-created ${editFolder}/ folder`),
and `ensure-folders` at `relay.ts:478` still does `fs.mkdir(..., {recursive:true})` under `projectDir`
with **no `projectExists` check** — which will create the project directory FR-147 exists to prevent.
*(Narrow in practice: `getRelayPaths` resolves to `config.projectDirectory`, i.e. the active project,
which normally exists. I did not construct a case where it fires. Flagging as a hole in the guard, not
a demonstrated failure.)*

### 5. `SyncState = 'conflict'` — a fully-styled state the server never emits
**Evidence:** `shared/types.ts:1160` at `ed908f8b` includes `'conflict'`. Every `state` assignment in
`sync.ts` at `ed908f8b` is at lines 58, 98, 100, 102, 104, 106, 123 — `dirty | clean | diverged |
behind | ahead | unknown`. `'conflict'` appears only in client render code
(`SyncIndicator.tsx:40,51,86`; `SyncTool.tsx:49,480`) — a purple dot, a `!` badge, a "merge conflicts"
tooltip, a purple status bar.
**Fate:** still present, unreachable. Conflicts *are* surfaced, but through the `/pull` response's
`conflicts[]` array, not through channel state. Two representations of one concept; one is dead.

### 6. `RelayIndicator`'s "backward compatible fallback" dot rendering
**Evidence:** `e96eec2` keeps the old three-dot renderer behind `if (!hasSyncInfo)` where
`hasSyncInfo = 'syncStatus' in relayProject && 'localSubfolders' in relayProject`
(`ProjectsPanel.tsx:308+`). But the only caller switched to `useEnhancedRelayBrowse()` in the same
commit (`ProjectsPanel.tsx:19,642` at `ed908f8b`), which always sends `?detailed=true`.
**Fate:** still-present-but-unreachable, ~35 lines. Same pattern as #3: compatibility shims between
two halves of one deployable.

### 7. `useRelayBrowse()` in `RelayTool` — polled every 30 s, never read
**Evidence:** `RelayTool.tsx:140` at `ed908f8b` is `const { data: browseData } = useRelayBrowse();`
and `grep browseData` returns **only that line**. `useRelayBrowse` polls at 30 s
(`useRelayApi.ts:32`). The component also calls `useEnhancedRelayBrowse()` (line 141), which hits the
*same endpoint* with `?detailed=true` on its own 30 s timer.
**Fate:** still present. Two polls of one endpoint, one of them feeding nothing.

### 8. `machineRole` as the primary control axis
**Evidence:** `2569b00` replaces role-driven action selection with divergence-driven, leaving
`RelayTool.tsx:122` = `return isCreator ? 'Push to Relay' : 'Push to Relay';` and three surviving
role fallbacks.
**Fate:** superseded-but-not-removed. `machineRole` remains a config field, a Config UI dropdown, and
a header badge — but no longer decides anything the user can observe except in the `synced` no-op case.

### 9. The relay redesign requirements brief — committed already stale
**Evidence:** `4f378ab` (03-24 18:21) commits `docs/planning/requirements-relay-redesign.md`, dated
`Written: 2026-03-23`, listing as gaps: *"relay watcher not implemented, socket events not connected"*
and *"Socket events defined: shared/types.ts (not yet emitted)"*. But `99aef7d` ("feat: relay-redesign
— B046 workflow lanes, file drawers, activity feed, toasts, setup guide", 2026-03-23, verified an
ancestor of the era start `1b06f68f`) had already shipped the watcher, the toasts and the lanes.
`git log --all -S"relay:recordings-available"` shows the three named events were introduced at
`dce171b` and removed at `99aef7d`, replaced by one generic `relay:changed`.
**Fate:** consumed anyway — the relay-kanban campaign that followed it rebuilt "workflow lanes" a
second time in 24 hours, as Kanban.

### 10. The `.claude/worktrees/*` gitlinks
**Evidence:** `f8f245f` deletes three `160000` mode entries pointing at `944acf2`, `89a05af`,
`4839dd8`. Root cause named in the campaign assessment: *"Accidentally staged worktree directories
with `git add -A`."*
**Fate:** deleted. Notable because `git add -A` is also the *product's* push mechanism
(`sync.ts:183`).

---

## Pivots

| From | To | Trigger | Evidence |
|---|---|---|---|
| **Rename by describing** — pick files in a Manage panel, fill in a form, apply | **Rename where you see it** — click a filename segment on the Recordings row | *"Edit where you see the problem — no more navigating to a separate panel"* | `690f619` — deletes `RenamePanel` (509), `ChapterListPanel` (227), `RenameLabelModal` (206); removes Rename + Renumber from `ToolsSidebar` |
| **Role decides direction** — `machineRole` drives push vs collect per lane | **Divergence decides direction** — the filesystem's actual state drives the button | *"sometimes the creator does the Gling edit and needs to send edit-1st files to the editor"* | `2569b00` — `getActionLabel(lane, isCreator)` → `getActionLabel(direction, isCreator)`; `isPushAction` → `defaultIsPush` fallback |
| **Three vertical lane cards** (rebuilt at B046 the day before) | **Four horizontal Kanban lanes** with divergence borders | David's stated preference for horizontal Kanban over timelines/dashboards | `39ed310` — `RelayTool.tsx` rewrite, `LANES` gains `'final'`, `getDirectionLabel` replaced by four direction-styling functions |
| **Plain presence dots** — "there is something in relay" | **Directional badges** — "there are 2 files coming *to you*" | Presence ≠ actionability; a dot can't tell you which way to press | `e96eec2` — `SYNC_BADGE_CONFIG` with `↑n` / `↓n` / `✓`; `subfolderTooltipLine()` |
| **Red for relay-only** | **Amber with `↓N` for relay-only** | F009, from real use: on an editor's machine "not yet collected" is the normal opening state, not an error | `cf6af61`; assessment records the rule — *"Red = error in David's mental model… amber for 'action needed'"* |
| **Bright/white UI** | **Warm linen** | The white UI reflected off David's face and shifted the video's colour profile | `fb99b1b` — the only theme decision in the repo driven by a camera, not a taste |
| **Silently create whatever folders are needed** | **Refuse, and tell the user to sync git first** | Ghost project directories appeared on the editor's machine, outside git control | `944acf2` → `ed908f8b`, 17 hours |
| **Localhost-only single-user app** | **Tailnet-reachable multi-machine app** | David and Jan on different continents needed the same UI | `fcb1ba2` — `host: true`, hostname-derived `API_URL` |
| **Accordion config (frequency encoded in layout)** | **Tabbed config (frequency encoded in the default tab)** | 17 minutes of use | `72d71a3` → `a20d2ec` |

---

## Pain signals

### 1. Relay sync-state semantics — **5 corrective commits in 30 hours**
`89a05af` (set-diff model) → `4839dd8` (count model, contradicting it) → `4105f5d` (badges stale, missing
invalidation) → `cf6af61` (F006/F009/F010: wrong colour, missing counts, dead-end when folder absent)
→ `2569b00` (wrong direction) → `ed908f8b` (missing project). Six commits, one subject: *what does
"in sync" mean, and which way should the user press?* The count is the finding. There was never a
single owner of the answer.

### 2. Two definitions of "synced", shipped in the same wave
`deriveSyncStatus(relayCount, localCount, exists)` at `relay.ts:79` vs the filename set-difference in
`/divergence`. Two agents, sixty seconds apart, two models. Neither compares content. The project's
own assessment names it and accepts it.

### 3. Cache invalidation as the only cross-system coordination — **111 `invalidateQueries` calls** across 17 client files at `ed908f8b`
(`git grep -c invalidateQueries ed908f8b -- client/src`), 12 of them in `useRelayApi.ts` alone. Every
new query key requires hand-auditing every mutation and socket handler that could stale it, and the
audit is done by memory. `relayDivergence` was created at `39ed310` and had to be retrofitted into
invalidation lists **twice** — `4105f5d` (push/collect) and `ed908f8b` (after video-project pull).

### 4. Poll and push, both, with no decision — **13 `refetchInterval` timers** at `ed908f8b`
Five of them in `useRelayApi.ts` (30 s ×4, 15 s ×1) for a directory that is *already* watched by
chokidar and *already* emits `relay:changed` into `useRelaySocket`
(`WatcherManager.ts:261`, `useSocket.ts:272-292`). The likely reason the polls exist: the watcher
covers the **relay** tree only, while divergence compares relay against **local** `edit-1st`/`edit-2nd`,
which `WatcherManager.initAll` never watches (verified — `initAll` at `ed908f8b:325-338` starts zip,
incoming-images, assigned-images, recordings, projects, inbox, transcripts, thumbs, relay). So half the
inputs to a computed value are watched and half are polled.

### 5. Filename-as-database — **3 parsers for one format, in one commit**
`shared/naming.ts:parseRecordingFilename` (lossy — drops tags), `shared/naming.ts:extractTagsFromName`
(the other half), and a hand-rolled client regex (B052). `635615b` fixes the client regex *and* has to
call both shared parsers back-to-back to reassemble one filename. B050 (tag loss) and B051 (undo
mapping) and B052 (regex) and B053 (stale undo) are one architectural bug reported four times.

### 6. Status colour is outside the design system — **≥2 corrective commits, and permanent divergence**
The migration guide's "What NOT to Replace" section (`docs/planning/AGENTS.md`, `fb99b1b`) exempts
`bg-blue-*`, `bg-red-*`, `bg-green-*`, `bg-yellow-*`. Consequences observed: `aa0c171` (four
undefined tokens, two identical hexes, three minutes later); `0dcdddc` ("Fix blue/brown clash", six
swaps); `cf6af61`/F009 (red vs amber semantics); and **35 raw palette classes still in
`RelayTool.tsx`** at `ed908f8b`. Three colour vocabularies now coexist: warm-linen tokens (chrome),
raw Tailwind (relay status), and per-component hardcoded `Record<State, {dot,text,bg,badgeBg}>` maps in
`SyncIndicator.tsx:26`, `RelayIndicator.tsx:26`, and `ProjectsPanel.tsx:266` — three near-identical
style tables for three near-identical pills, with **`incoming` = orange in `RelayIndicator` but amber
in `RelayTool`**.

### 7. Config has no schema — one field, **five edit sites**
Adding `relayDirectory` required: `shared/types.ts` (`Config`), `ConfigPanel.tsx` (form),
`server/src/routes/index.ts` (destructure **and** re-pass — the same field is typed twice in one
function, `72d71a3` diff), `server/src/index.ts:190-193` (`if (newConfig.X !== undefined) currentConfig.X = ...`),
and `configManager.ts:82-84` (migration allowlist). Miss the last one and the user's value is
silently deleted on migration — which is exactly what `a20d2ec` had to patch.

### 8. "Shared" types aren't the default home — the drift was already there when someone looked
`a20d2ec`'s `FolderKey` extraction reveals a client union missing `edit-1st`/`edit-2nd`/`edit-final`
that the server union had. Caught by human review. The monorepo has a `shared/` workspace and it did
not prevent this, because nothing routes new cross-boundary types into it.

### 9. Test count is the headline metric and it does not reconcile
Commit messages and assessments in a six-hour window report **1,042** (`690f619`), **1,060**
(`635615b`, 18:18), **"980 baseline"** and **888** (`d9d2cf7`, 19:08), **900** (`cf6af61`, 20:10) —
while `docs/planning/relay-kanban/assessment.md` writes "980 → 888" and glosses it as
*"test restructuring"*.
**What I actually verified:** counting `^\s*(it|test)\(` across every `*.test.ts(x)` at each SHA gives
a **monotonic 597 → 638 → 647 → 682 → 688 → 692** (+95 over the era, 22→24 test files). So **no tests
were lost** — the reported numbers are runtime totals that are not measuring one consistent thing.
*Caveat: the static count is a proxy. It ignores `it.each` expansion, `describe.each`, and `.skip`, and
I did not run any suite at a historical SHA. It establishes that test **cases in source** grew
monotonically; it does not establish that the **runtime** suite did.*

### 10. Audits, not CI, catch the real bugs
`4105f5d` fixes a test that asserted the wrong endpoint entirely (*"tests divergence hidden-file
filtering instead"*) — green, and meaningless. All four B047 stabilisation bugs came from a post-hoc
3-lens audit, not from the suite that was passing. `docs/planning/relay-kanban/assessment.md` records
*"Zero client tests… All 12 hooks in useRelayApi.ts untested"* and
`docs/planning/recording-editor/assessment.md` records *"Zero client component tests"* for
`EditableFileRow` / `BatchToolbar` / `PreviewPanel` — the three components that hold the era's
validation logic.

### 11. Four parallel issue vocabularies
`docs/backlog.md` (FR-nnn / NFR-nnn, PO-driven, backed by `docs/prd/*.md`),
`docs/planning/BACKLOG.md` (B0nn, audit- and campaign-driven),
`docs/planning/flihub-feedback.md` (F0nn, UAT-driven),
`docs/refactoring-backlog.md`. All four exist at `ed908f8b`; none cross-references the others. FR-147
is the **only** FR raised in the entire era — everything else is a B or an F. The requirements system
and the work that actually happened had drifted onto separate rails.

---

## Architectural moments

Decisions made here that everything downstream has to live with.

### A1 — Two sync systems were named, built and kept separate on purpose
**Decision:** relay (rsync/Syncthing, filename comparison) and Sync Hub (git, commit graph) remain
independent; cross-awareness is patched per-symptom at the UI layer.
**Evidence:** `ba19b14` creates `routes/sync.ts` alongside the existing `routes/relay.ts`;
`docs/prd/fr-147-relay-project-awareness.md:104` — *"Out of Scope: … Relay-to-sync orchestration
(keeping systems independent with awareness, not coupling)"*.
**Consequence:** three status vocabularies (`SyncState` 7 values; `RelaySyncStatus` 6 values;
`RelayDivergenceInfo.direction` 4 values), two header pills, two comparison algorithms, no shared
"remote peer" concept. The coupling arrived anyway, in the least visible place: `useSyncApi.ts`'s pull
handler now invalidates three relay query keys (`ed908f8b`). **A rebuild should name one concept —
`Channel`, with a `compare()` and a `transfer()` — and give git and rsync two implementations of it.**

### A2 — `process.cwd()` is a managed resource; the app can commit and push its own source
**Evidence:** `sync.ts:144, 176, 247, 283, 337` at `ed908f8b` — five separate `process.cwd()` sites;
`6c959d3` enables `channel: 'app-code'` on push; `sync.ts:~186` is `git add -A` then commit then push.
`fcb1ba2` then binds the server to `0.0.0.0`. `server/src/index.ts:89` is `app.use(cors())` with no
origin restriction and no auth middleware on any of the 18 route mounts.
**Consequence:** an unauthenticated Tailnet-reachable HTTP endpoint that force-stages and pushes the
application's own repository. Also: `channel → repoDir` resolution is copy-pasted **five times**
because no `Channel` object was ever created. **The rebuild should treat "which repo" as data, not as
five inline `if`s, and should decide deliberately whether the app may write its own source at all.**

### A3 — Sync state is compared by *name*, never by *content*
**Evidence:** `relay.ts:79-87` (`deriveSyncStatus` — counts only); `89a05af` (`localOnly` / `relayOnly`
as `Set` differences of filenames; `direction` derived solely from those). `listFiles` collects sizes
but the comparison never uses them; mtime is never fetched for comparison.
**Consequence:** a file edited on one side and not the other reads as **synced**, in both models, in
the Kanban, in the project badges and in the header pill. The three-way state (`local`, `relay`,
`last-known-common`) needed for real divergence was never modelled. **A rebuild needs a manifest —
per-file size + mtime + a cheap hash — and a persisted last-sync marker. Everything about "direction"
follows from that; without it, every direction indicator is a guess.**

### A4 — Undo is a single server-global variable, not an operation log
**Evidence:** `let lastBatchMapping = []` in `createManageRoutes` (`690f619`); written by bulk-rename
and (after `635615b`) by split-chapter; cleared on use; `B053` adds existence validation before
reverting because the slot goes stale.
**Consequence:** one undo, for the whole server, for whoever asks first — which became meaningfully
wrong the moment `fcb1ba2` put two machines on the same server. It cannot express "undo *that*
operation", cannot survive a restart, and cannot be shown in a history. **A rebuild should append every
mutation to a per-project operations journal on disk; undo becomes "invert entry N", and the journal
is also the activity feed the relay tool hand-rolls in memory
(`relay.ts:44-52` — a 50-entry non-persistent ring buffer).**

### A5 — The filename is the database, and its parser is lossy
**Evidence:** `shared/naming.ts:217-262` — `parseRecordingFilename` returns `{chapter, sequence, name}`,
tags stripped and dropped. `635615b` must re-derive tags with a second parser to fix silent data loss
in split-chapter (B050).
**Consequence:** every code path that parses and rebuilds a filename is a potential data-loss site,
forever, and the type system cannot see it. Three parsers coexisted at one point. **A rebuild should
make the parse result total and round-trippable — `parse(build(x)) === x` as a property test — or stop
storing metadata in filenames and put a sidecar manifest next to the media.**

### A6 — The design system covers chrome and deliberately excludes status
**Evidence:** `docs/planning/AGENTS.md` (`fb99b1b`), §"What NOT to Replace"; 35 raw palette classes
surviving in `RelayTool.tsx` at `ed908f8b`; three near-duplicate `Record<State, StateStyle>` tables
(`SyncIndicator.tsx:26`, `RelayIndicator.tsx:26`, `ProjectsPanel.tsx:266`) that already disagree
(`incoming` = orange in one, amber in the other).
**Consequence:** the app's *semantics* — ahead / behind / diverged / incoming / blocked — have no
canonical visual encoding, in an app whose entire job this era was communicating those semantics.
**A rebuild should define the status vocabulary FIRST — as a typed union with one styling table — and
build every indicator from it. Status colour is not decoration; it is the domain model.**

### A7 — There is no router
**Evidence:** `App.tsx:42-53` (`ViewTab`, 12 hand-listed values), `App.tsx:75-80` (`getTabFromHash`),
`App.tsx:100-113` (hash listener). Sub-navigation is a prop: `<ManagePanel initialTool={manageTool}
onToolActivated={() => setManageTool(null)} />` (`App.tsx:813`), consumed by a `useEffect` in
`ManagePanel.tsx:105-110`.
**Consequence:** the Sync tool and the Relay tool have **no URL**. `SyncIndicator`'s click does
`changeTab('export'); setManageTool('sync')` — a tab literally named `export` opening a panel named
Manage showing a tool named Sync. Refresh loses the tool. Nothing is linkable, bookmarkable, or
shareable with Jan. **A rebuild should adopt a real router on day one; the tool identity belongs in the
URL.**

### A8 — Parallel worktree agents became the default unit of work
**Evidence:** `89a05af`/`944acf2`/`4839dd8` at 19:03–19:04; `39ed310`/`e96eec2` at 19:14;
merge commits `e2e77f3`, `483e9b8`, `d9d2cf7`, `8aaafd4`, `f52156b`; `f8f245f` cleaning up leaked
gitlinks; 20 planning documents added this era (`docs/planning/*/AGENTS.md`,
`IMPLEMENTATION_PLAN.md`, `assessment.md`, three `audit-*.md`).
**Consequence, both directions.** The throughput is genuine and the assessments are unusually candid.
But every wave that touched one file produced conflicts (*"All 3 wave 1 agents touched relay.ts and
relay.test.ts"*), and every wave shipped at least one duplicate concept — two `synced` definitions,
two `RelayIndicator` components (one exported from `shared/`, one file-local in `ProjectsPanel.tsx:308`;
both rendered in the same app at `ed908f8b`), two file-type taxonomies, two browse hooks polling one
endpoint. **The lesson the assessments themselves reach: prose anti-patterns in AGENTS.md do not bind
agents. If a rebuild keeps this method, the shared vocabulary must be a compiled artefact — a types
module the agents must import, or a test stub they must make pass — not a paragraph.**

### A9 — Concurrency was bounded to the process, on the same day the process stopped being alone
**Evidence:** `fcb1ba2` — `const repoLocks = new Map<string, Promise<void>>()` (in-memory) added in
the same commit that sets `host: true` and derives `API_URL` from `window.location.hostname`.
**Consequence:** the lock cannot see a second browser, a second FliHub instance, or David's terminal.
**A rebuild that intends multi-machine use must put the mutex where the contention is — a lockfile in
the repo, or a single serialised worker — and must decide, explicitly, whether the server is
single-tenant or not.**

---

## What a rebuild should learn from this era

1. **Model the peer, not the transport.** One `Channel` abstraction with `status()`, `compare()`,
   `send()`, `receive()`; git and rsync as two implementations. Every duplicated concept in this era
   (two sync states, two indicators, two invalidation regimes, five copy-pasted `repoDir` blocks)
   dissolves at this seam.

2. **Comparison needs content, and a last-known-common marker.** Filename set-difference cannot
   express "modified on both sides". Ship a per-file manifest (size + mtime + cheap hash) and persist
   the last successful sync. Direction, conflict, and "what changed since I looked" all fall out of it.

3. **Define the status vocabulary before the first indicator.** A typed union, one styling table, one
   set of glyphs, one rule (David's, from F009: *red = error, amber = action needed, green = done*).
   Then every pill, badge, border and tooltip is generated from it instead of hand-written three times
   and drifting.

4. **Make the parse total.** `parse(build(x)) === x`, property-tested. Or stop encoding metadata in
   filenames. The tag-loss bug, the third regex, and the two-parser fix are all one decision made once,
   early, wrongly.

5. **Undo is a journal, not a variable.** Append every mutation to a per-project on-disk log. Undo,
   redo, the activity feed, the "what did Jan just do" question, and multi-client safety are all the
   same feature.

6. **Config needs a schema, in one place.** One declaration that generates the type, the form, the
   route validation, the persistence and the migration. Five edit sites per field is how a user's
   `relayDirectory` almost got deleted.

7. **Adopt a router, and put tool identity in the URL.** `#export` opening a Manage panel showing a
   Sync tool is a concept collision that a URL would have made visible on day one.

8. **Pick one freshness mechanism per data source.** Watcher *or* poll. If a computed value depends on
   two trees, watch both. Thirteen timers plus a socket, with hand-maintained invalidation lists, is a
   design that guarantees a stale-badge bug per feature.

9. **Give the parallel-agent method a compiled contract.** The assessments prove prose does not bind:
   *"AGENTS.md explicitly said DO NOT re-implement filename parsing… the agent did it anyway"*, and
   *"two separate documents specified this requirement and it was still missed."* Encode the invariant
   as a type the agent must satisfy or a failing test it must fix.

10. **Decide the trust boundary before widening the transport.** App-code push and `cors()` were
    acceptable for a localhost tool. `host: true` changed what they mean, in a different commit, with
    nothing forcing the question.

11. **Keep what worked.** Two things in this era are unambiguously right and should survive the
    rewrite: *edit where the problem is visible* (`690f619` — inline row editing beat the rename panel
    so decisively that 942 lines were deleted), and *rename derivatives in place* (killing a 5–10
    minute re-transcription per rename). Both are the same instinct: put the operation where the user's
    attention already is, and never redo expensive work you can move instead.
