# FliHub — Visual Design History: what was designed vs what got built

**Audit date**: 2026-08-26
**Scope**: `.mochaccino/` (13 mockups), `client/public/mocks/` (4 earlier whole-app designs), `.screenshots/` (90 PNGs),
`client/src/index.css` + Tailwind v4 setup, `docs/planning/{project-list-redesign,warm-linen-theme,manage-page-redesign,manage-panel-polish,relay-redesign,sync-hub}/`
**Method**: read every mockup's HTML, diffed against shipped components, traced token history through git, counted the actual component vocabulary in `client/src`.

---

## Headline

FliHub has had **two generations of design exploration and zero design system**.

Generation 1 (Jan 2026, `client/public/mocks/`) wrote down the diagnosis *precisely* — "chapter navigation appears
differently on each page; sidebar/drawer patterns are inconsistent; tool access varies; layout patterns differ"
(`client/public/mocks/README.md:9-14`) — produced four complete whole-app design systems, and shipped **none of them**.

Generation 2 (Mar 2026, `.mochaccino/`) produced 13 mockups in **nine days** (`fb99b1b` 2026-03-24 → `7afcabf` 2026-03-30),
shipped most of them, and then stopped dead. Every commit after 2026-03-30 (22 of them, through the repo's last commit
`3b3b2f1` 2026-04-16) is a feature commit with no design pass.

What was never produced in either generation: a token spec, a type scale, a component vocabulary, a layout contract.
`find . -iname "DESIGN.md" -o -iname "*style-guide*" -o -iname "*tokens*"` returns **nothing**. The only written design
spec in the repo is a colour-mapping table buried in `docs/planning/AGENTS.md:374-387` — **and it is wrong** (see §3).

The measurable consequence: **108 distinct card/container treatments across 181 instances** (1.68 instances per
treatment — essentially every container is bespoke), **35 distinct button colour signatures** across 127 classNamed
buttons, **6 modal scrim treatments** for 15 modals, and **155 usages of two colour classes that emit no CSS at all**.

---

## 1. Mockup-by-mockup: what each explored, and what won

### Generation 1 — `client/public/mocks/` (2026-01-05)

Four complete design systems, five screens each (`manage/incoming/recordings/watch/projects.html`), each with a
`design-approach.md` stating a philosophy.

| Design | Concept | Shipped? |
|---|---|---|
| design-1 Unified Content-Centric | Tri-column: 220px tools left, content centre, 280px chapter nav right, 400px drawers | **No** |
| design-2 Dark Cinematic | Dark theme, video-first, floating glass panels | **No** |
| design-3 Command Palette Minimal | Keyboard-driven single column, CMD+K, brutalist | **No** |
| design-4 Dense Dashboard | Maximalist multi-panel, resizable | **No** |

`README.md:70-76` lists "Next Steps: … 5. Implement chosen design in React app." Step 5 never happened. Descriptions
survive only as an inert `LEGACY_DESIGNS` array in `client/src/components/MockupsPage.tsx:80-85`.

**The un-run experiment**: design-1's tri-column layout with a persistent right-hand chapter nav was a direct answer to
the "chapter nav differs per page" complaint. Today there are still three separate chapter panel components with
different owners — `ChapterPanel.tsx` (103 lines, used by RecordingsView), `ChapterContextPanel.tsx` (108 lines, used by
App.tsx), `ChapterHelpPanel.tsx` (197 lines, used by RecordingsView) — plus a fourth private `ChapterHeader` inside
`RecordingsView.tsx:258` and a fifth hand-rolled separator inside `ManagePanel.tsx:546`. The January diagnosis is still
true in August.

### Generation 2 — `.mochaccino/designs/` (2026-03-22 → 2026-03-26)

**Feature mockups (5)** — each committed *in the same commit as its implementation*, which tells you they were
same-day sketches, not durable specs:

| Mockup | Explored | Shipped as | Evidence |
|---|---|---|---|
| `relay-redesign` | Workflow lanes (creator→editor), per-lane file drawers, activity feed, setup guide | **Yes** — `components/shared/RelayTool.tsx:1` "Relay Kanban Board — horizontal four-lane workflow", plus `shared/relay/{KanbanLane,FileDrawer,ActivityFeed,SetupGuide}.tsx` | commit `99aef7d` |
| `sync-hub` | Two-channel git sync, persistent header indicators, inline conflict UI | **Yes** — `shared/SyncTool.tsx`, `shared/SyncIndicator.tsx` | commit `ba19b14` |
| `recording-editor` | Inline filename-segment editing, batch select, chapter split marker, preview panel with undo | **Yes** — `shared/EditableFileRow.tsx`, `shared/SplitMarker.tsx`, `shared/PreviewPanel.tsx`, `shared/BatchToolbar.tsx`, `shared/UndoToast.tsx` | commit `690f619` |
| `chapter-separator` | Card-style chapter header: name + duration pill + hover overflow menu | **Partially** — shipped into `RecordingsView.tsx:276` only; `ManagePanel.tsx:546` still renders the *old* rule-and-label separator it was meant to replace | commit `6ea452c` touched RecordingsView.tsx, EditableFileRow.tsx, index.css — **not** ManagePanel.tsx |
| `sync-hub-v2` | Channel cards with collapsible file lists, A/M/D badges, commit-preview modal, descriptive header pills | **Yes** | commit `6c959d3` |

**Project-list variants (8)** — two rounds, all dated 2026-03-25/26, all committed together in `6e90d9c`:

*Round 1 (survivors of an original 10 — the banner in `project-list-06-split-focus/index.html` reads "6 of 10", so
four numbered variants were culled and are not in the repo):*

| Mockup | Explored |
|---|---|
| `01-filterable-table` | Full-width table, search, column sorts, smart preset filters (Dead / Needs Attention / Ready to Edit) |
| `02-kanban-pipeline` | Horizontal stage swim lanes, compact cards, per-column collapse, dead-project dimming |
| `06-split-focus` | 40% left list + 60% right detail, pin-to-compare up to 3 projects |
| `10-hybrid-table-drawer` | Table + slide-out drawer with health assessment, Shift+Click to compare |

*Round 2 — four recombinations of "table + how do you show detail":*

| Mockup | Detail mechanism |
|---|---|
| **`a-table-drawer`** | **Slide-out drawer, click = select + open** |
| `b-table-hover` | Floating hover card, click = select, pin via info icon |
| `c-table-kanban` | List/Board view toggle, same filters, same drawer |
| `d-table-inline` | Row expands inline below itself, no layout shift |

**Winner: A.** Stated explicitly at `docs/planning/project-list-redesign/AGENTS.md:15` — "The mockup is at
`.mochaccino/designs/project-list-a-table-drawer/index.html`" — and confirmed in the shipped code:

- Mockup A columns: star, Code, Name, Stage, Files, Trans%, Final, Relay, Modified.
  `ProjectsPanel.tsx:740-748` ships exactly those nine, in that order.
- Mockup A's four presets (All / Needs Attention / Dead / Ready to Edit) ship in `ProjectListToolbar.tsx:4-28`
  (a fifth, "Launch Optimise", was added later).
- Mockup A's `renderDrawer` with stats grid + progress checklist + health box + quick actions maps 1:1 to
  `ProjectDrawer.tsx:172` (Stats), `:190` (Progress Checklist), `:213` (Health Assessment), `:221` (Quick Actions).
- `ProjectsPanel.tsx:699` — `marginRight: isDrawerOpen ? '40%' : '0'` — matches the mockup's `--drawer-width: 40%`.

Two source files carry the provenance in a header comment: `ProjectListToolbar.tsx:1` and `ProjectDrawer.tsx:1` both say
"matches Mochaccino mockup".

**Losers left no record.** There is no decision doc for why B, C or D lost, and the `c-table-kanban` List/Board toggle —
the one variant that would have satisfied both David's stated preference for a filterable table *and* his interest in
Kanban (`feedback_ui_preferences` memory) — simply vanished. `IMPLEMENTATION_PLAN.md` for the campaign records
implementation notes but no comparative rationale.

---

## 2. Why eight of thirteen mockups are project-list variants

This is the loudest signal in the whole design history, and it is **not** "the project list was hard to lay out."

The project list is the only surface in FliHub where the user is **making a decision rather than performing an action**.
Every other tab is a verb — Incoming (name this file), Recordings (rename/split these), Watch (play this), Transcripts
(transcribe these), Manage (regen/relay/sync). The Projects tab is the only place David asks *"which of my 62 videos
should I touch next, and what state is it in?"* Eight mockups is the cost of never having named that question.

Three pieces of evidence that it is a **model** problem, not a layout problem:

1. **The rounds are about detail disclosure, not about the list.** All four round-2 variants share an identical
   filterable table; they differ only in drawer / hover-card / board / inline-expand. That means the table itself was
   settled by round 1 and the remaining four mockups were spent on *"where does the rest of a project's truth live?"* —
   which is a question about the domain model, not the pixels.

2. **The winning drawer is populated by an invented concept that has no home in the data.** `ProjectDrawer.tsx:48`
   defines `getHealthAssessment(project)` — client-side, derived, untyped in `shared/types.ts`. "Health" and "the
   progress checklist" are the actual answer to David's question, and they were invented at the UI layer during a
   *visual* campaign. `AGENTS.md:57-58` for that campaign shows the same thing happening to the data: `hasFinal` and
   `hasRelay` were listed as **MISSING** and had to be back-filled into `ProjectStats` to make the mockup renderable.

3. **The stage vocabulary was still moving after the mockups shipped.** `project-list-02-kanban-pipeline/index.html:22-29`
   defines eight stages (`plan/rec/1st/2nd/rev/ready/pub/arch`). The shipped toolbar today shows nine — `Rev` gone,
   `Shelved` and `Remix` added (visible in `.screenshots/flihub-02-projects.png`, tracked as FR-149 in
   `project_stage_system` memory). The pipeline the board was drawing was not yet a settled pipeline.

**Read for the rebuild**: the eight variants are a symptom of designing a *view* over an unnamed *thing*. Name the thing
first — a Project's stage machine, its readiness/health derivation, and what "the rest of its truth" is — and the view
becomes a one-mockup decision.

---

## 3. The actual current visual system

### Colour — one theme, six dead tokens, two broken classes

`client/src/index.css:9-32` is the entire design token surface: **20 `--color-*` tokens, nothing else**. No spacing
scale, no type scale, no radius scale, no shadow scale, no motion tokens.

Palette (Warm Linen, B048, motivated by camera reflection during recording —
`docs/planning/warm-linen-theme/IMPLEMENTATION_PLAN.md:3`):

| Role | Hex |
|---|---|
| page | `#e8e0d4` |
| surface-muted / surface-hover / surface | `#eee8de` / `#ede5d8` / `#f5f1eb` |
| borders | `#d4cdc4` (warm) · `#b8a99a` (strong) |
| text | `#2a2018` → `#4a3e30` → `#7a6e5e` → `#9a8a78` |
| accent | Tailwind `blue-500/600` (kept deliberately — `IMPLEMENTATION_PLAN.md` note: "Keep FliHub's existing blue (#3b82f6)") |

**Two colour classes emit no CSS.** This is the single most concrete finding in the audit.

`fb99b1b` defined the text tokens with a `text-` prefix *inside* the variable name:

```css
--color-text-warm-primary: #2a2018;   /* generates .text-text-warm-primary */
--color-text-warm-faint:   #9a8a78;   /* generates .text-text-warm-faint  */
```

but the migration guide (`docs/planning/AGENTS.md:381-386`) told every agent to write `text-warm-primary`.
A follow-up commit `aa0c171` ("fix: warm linen visual consistency — add missing tokens") noticed the mismatch and added
`--color-warm-muted` and `--color-warm-secondary` — **fixing two of the four and never adding
`--color-warm-primary` or `--color-warm-faint`.**

Verified against the built stylesheet (`client/dist/assets/index-ChMHJZsH.css`, built 2026-04-13, i.e. *newer* than
`src/index.css` from 2026-03-24, so this is current):

```
grep -c "warm-primary" dist/assets/*.css  →  0
grep -c "warm-faint"   dist/assets/*.css  →  0
.text-warm-secondary{color:var(--color-warm-secondary)}   ✓ present
.text-warm-muted    {color:var(--color-warm-muted)}       ✓ present
```

- `text-warm-primary` — **90 usages in source, 0 bytes of CSS**
- `text-warm-faint` — **65 usages in source, 0 bytes of CSS**

No `body { color: … }` rule exists either, so all 155 elements fall back to the UA default (`canvastext`, near-black).
`#2a2018` vs near-black is a difference of a few percent — **which is exactly why it survived four months.**

> **Evidence-discipline note**: the campaign's own quality gate (`docs/planning/AGENTS.md:409`) was *"Visually verify the
> component renders with warm tones (no stray white panels)"*. That check **cannot distinguish success from failure
> here** — a broken warm-primary and a working warm-primary look identical on screen. The campaign assessment
> (`warm-linen-theme/assessment.md`) accordingly reports *"Token naming consistent across all files. Zero typos in token
> names"* and *"All 1,042 tests pass"*. Both statements are true and both are blind to the defect. This is a missing
> **verification seam**, not a careless developer.

**Six of twenty tokens are dead or near-dead**:

| Token | Utility it generates | Uses |
|---|---|---|
| `--color-text-warm-primary` | `text-text-warm-primary` | 0 |
| `--color-text-warm-secondary` | `text-text-warm-secondary` | 0 |
| `--color-text-warm-muted` | `text-text-warm-muted` | 0 |
| `--color-text-warm-faint` | `text-text-warm-faint` | 0 |
| `--color-border-warm-strong` | `border-border-warm-strong` | 0 |
| `--color-border-warm` | `border-border-warm` | 0; survives only via one accidental `bg-border-warm` at `ProjectListToolbar.tsx:123` |

And the doc drifted from the code: `docs/planning/AGENTS.md:379-380` still lists `surface-hover` and `surface-muted` as
*the same hex* `#ede7dc`; `aa0c171` differentiated them to `#ede5d8` / `#eee8de` and the table was never updated.

**The token gap forced a raw hex into the shipped toolbar.** `ProjectListToolbar.tsx:110` — the active preset button is
`bg-[#2a2018] text-surface border-[#2a2018]`. That hex *is* `--color-text-warm-primary`. With no reachable token, the
developer inlined the value.

Legacy palette residue is genuinely small — `bg-white` ×2 (`shared/UndoToast.tsx`), `text-gray-*` ×14, `bg-gray-*` ×21,
`border-gray-*` ×7, slate ×4. The mechanical migration worked. It just wasn't the problem.

### Type — no scale

11 distinct sizes, none declared anywhere:

| Named | Count | Arbitrary | Count |
|---|---|---|---|
| `text-sm` (14px) | 422 | `text-[10px]` | 73 |
| `text-xs` (12px) | 380 | `text-[11px]` | 34 |
| `text-lg` | 31 | `text-[12px]` | 8 |
| `text-base` | 7 | `text-[13px]` | 3 |
| `text-xl` / `text-2xl` | 4 / 4 | `text-[15px]` | 2 |

`text-xs` and `text-[12px]` are the same size expressed two ways. Six of the eleven sizes live between 10px and 15px —
that band is where all the information density is, and it has no grammar. Fonts: `font-mono` ×139, `font-sans` ×2,
no custom face, no `@theme` font tokens.

### Component vocabulary — improvised per component

**No primitives exist.** There is no `Button`, no `Card`, no `Table`, no `Badge`, no `Pill`. `grep "export function Button"`
returns nothing. There are **290 raw `<button>` elements**.

| Vocabulary | Distinct treatments | Instances |
|---|---|---|
| Card / bordered container (rounded + border + bg) | **108** | 181 |
| Button background-colour signature | **35** | 127 (of 290 buttons) |
| Button padding pair (`px-N py-M`) | **20** | — |
| Button corner radius | 5 (`rounded`, `-md`, `-lg`, `-l/-r`, `-full`) + 31 with none | 127 |
| Modal scrim | **6** (`black/50`, `black/50 z-[100]`, `bg-opacity-50`, `black/40`, `black/60`, `black/30`) | 15 |
| `<table>` elements | 4, all hand-rolled | — |
| Inline `style={{}}` escapes | — | 84 |

Three pill treatments live in **one 80-line toolbar** (`ProjectListToolbar.tsx:71-135`):
stage pills are `rounded-full` + `bg-blue-500` when active; preset pills are `rounded-md` + raw `bg-[#2a2018]` when
active; the Disk toggle is `rounded-md` + `bg-amber-100` when active — and it sits in the preset row looking like a
preset while being a column toggle.

The `shared/` folder (30 components) is not a design system — it's a folder. **Four members have zero consumers
anywhere in the codebase**: `PageHeader.tsx` (15 lines), `RegenToolbar.tsx` (415), `RelayBrowser.tsx` (119),
`SlideOutDrawer.tsx` (61). Two of those four aren't even exported from the barrel. Add the orphaned
`ProjectStatsPopup.tsx` (955 lines — the pre-drawer detail view, superseded by FR-148 and never deleted) and
`SelectionBadge.tsx` (30, kept alive only by dead `RegenToolbar`) and that is **1,595 lines of dead UI**.

`PageContainer.tsx` — the one thing that could have enforced a card treatment — has **exactly one consumer**
(`ConfigPanel.tsx`). It is nine words long: `bg-surface rounded-lg border border-warm p-6`. Had every page used it,
the 108 card treatments would be ~10.

### Layout — two apps in one shell

`App.tsx:725`:

```tsx
<main className={activeTab === 'projects'
  ? 'flex-1 flex flex-col overflow-hidden'
  : 'max-w-4xl mx-auto px-4 py-6'}>
```

Every tab except Projects is a **896px centred column**. Projects is **full-bleed**. Six of the eight project-list
mockups declare `min-width: 1280px`. The winning mockup couldn't fit the shell, so the shell was special-cased for one
tab rather than changed — visible side by side in `.screenshots/flihub-02-projects.png` (dense full-width table) vs
`.screenshots/flihub-main/08-manage-export.png` (narrow column, sidebar card floating detached and ending halfway down
the page while content scrolls past it, and the project title colliding with the sync pill in the header).

### Verdict

Not a design system. A **colour palette applied mechanically to an improvised UI**, with 155 usages of the palette's
own primary text colour silently doing nothing.

---

## 4. Design work clearly started and abandoned

| # | Artifact | Evidence of abandonment |
|---|---|---|
| 1 | **All four Generation-1 whole-app designs** | `client/public/mocks/README.md:70-76` "Next Steps … Implement chosen design in React app" — never done. None of the tri-column / dark / palette / dense layouts exist in `client/src`. Still served at `/mocks/` and bundled into `client/dist/`. |
| 2 | **The Mochaccino gallery** | `.mochaccino/index.html:154` badge reads **"3 designs"** and lists only recording-editor, sync-hub, relay-redesign. Ten more designs were added afterwards; the gallery was never updated. |
| 3 | **`.mochaccino/config.md`** | The design register lists **5** of 13 designs. The 8 project-list variants (commit `6e90d9c`) were never registered. |
| 4 | **Four culled project-list variants** | `project-list-06-split-focus/index.html` banner: "6 of 10". Variants 03, 04, 05, 07, 08, 09 were generated and discarded with no record of what they explored or why they lost. |
| 5 | **`SlideOutDrawer.tsx`** | Built in the warm-linen Wave 1 (W1-03, listed in `warm-linen-theme/IMPLEMENTATION_PLAN.md`), then `manage-page-redesign/IMPLEMENTATION_PLAN.md:3` declared **"No more drawers"** and stripped all four from ManagePanel (2026-03-22). Eight days later FR-148 made a drawer *the winning pattern* — and built a **second, bespoke** one (`ProjectDrawer.tsx:138`) rather than reviving the primitive. `SlideOutDrawer` has had zero consumers ever since. |
| 6 | **The chapter-separator redesign, half-landed** | `ManagePanel.tsx:546` still carries the comment `{/* Chapter separator - matching RecordingsView */}` above the rule-and-label markup that B049 (`6ea452c`) replaced in RecordingsView with a card header + duration pill. The comment is now false. ManagePanel carries **six** "matching RecordingsView" comments (`:8, :498, :535, :546, :584, :590`) — copy-paste is the sharing mechanism, so a redesign lands on exactly one of the two copies. |
| 7 | **The gold/amber accent direction** | Mockups `10-hybrid-table-drawer`, `c-table-kanban` and `d-table-inline` use `--accent: #8b6914` (warm gold, harmonising with the linen palette). Mockups `01`, `02`, `a`, `b` use blue `#3b82f6`. Blue shipped. No decision recorded anywhere. |
| 8 | **Three mockups stranded on the pre-linen palette** | `recording-editor`, `relay-redesign` and `sync-hub` (2026-03-22/23, before B048) use cool grey `#f3f4f6` / `#f8fafc` backgrounds. They were never re-skinned, so the mockup corpus itself is two-toned — 10 warm, 3 cold. |
| 9 | **The Mockups tab** | `MockupsPage.tsx` is a first-class tab in the running app (`App.tsx:885`) whose entire 200+ lines are inline `style={{}}` objects on a **slate/blue** palette (`#1e293b`, `#3b82f6`, `#f1f5f9`) — no warm tokens, no Tailwind. Flagged as a to-do in `warm-linen-theme/assessment.md` ("consider converting to Tailwind classes in a future cleanup"); never done. It also still shows only the 3 original feature mockups in its `MOCHACCINO_DESIGNS` array (`:11-29`) despite hard-coding the round-1 and round-2 project-list lists below it. |
| 10 | **`.screenshots/consistency-*` series** | Eight PNGs dated 2026-03-24 10:13–10:16 (`consistency-01-incoming` → `consistency-08-recordings-fixed`) — a manual visual-consistency sweep, run once, with no checklist, criteria doc, or follow-up run. 90 PNGs total (85 git-tracked), one `tours.yml` describing a single 16-shot tour captured 2026-04-08, never re-captured. |
| 11 | **The whole design practice** | Last design commit `7afcabf` 2026-03-30. The following 22 commits (disk observability B062/B063, archive offload B064/B065, video controls, dictionary, storage panel B066+) shipped with **no mockup and no design doc** — `grep -rl mochaccino docs/planning/` matches only the six March campaigns. `shared/StoragePanel.tsx:3` records the replacement practice verbatim: *"Shape mirrors RelayTool.tsx."* |

### The clearest single instance of design intent being lost

Mockup A's stated principle, recorded in `project-list-redesign/IMPLEMENTATION_PLAN.md`:

> "The content indicators (Inbox, Assets, Chapters) are being removed from the table columns — this data is visible in
> the drawer instead… Shadows column and Chapters column are also moving to drawer — **keeps the table scannable**."

Nine columns shipped 2026-03-30. **Eight days later**, B062 added eight more columns straight back into the table
(`ProjectsPanel.tsx:752-759`: REC, TRASH, SHADOWS, OTHER, R-REC, R-1ST, R-2ND, TOTAL) — 17 columns when the Disk toggle
is on. The principle held for eight days because it lived in a plan document that the next campaign never read. Nothing
in the code, the types, or a design doc encoded "the table stays scannable; detail goes in the drawer."

---

## 5. What the mockup history says the app should look like

Thirteen mockups, made independently over nine days, agree on more than they disagree. That agreement *is* the design
brief, and it was never written down:

1. **Warm Linen, and it is load-bearing, not decorative.** 10 of 13 mockups converge on the same five values —
   `#e8e0d4` page, `#f5f1eb` surface, `#d4cdc4` border, `#2a2018` text, `#b8a99a` strong border. The rationale is
   recorded once (`warm-linen-theme/IMPLEMENTATION_PLAN.md:3`): white UI reflects on David's face and shifts the video's
   colour profile. **FliHub is on camera. Its palette is a production constraint, not taste.** Nothing in the codebase
   states this.
2. **Dense, wide, table-first.** Every project-list mockup is `min-width: 1280px`. 10–13px type. Compact rows. The 896px
   centred column that eight of nine tabs still use contradicts every mockup ever drawn for this app.
3. **Filterable table primary, board secondary.** Round 1 tried a pure Kanban (`02`); round 2 demoted it to a toggle
   *inside* the table view (`c-table-kanban`). Consistent with `feedback_ui_preferences` memory.
4. **Detail on selection, never a modal.** All four round-2 variants show detail without leaving the list — drawer,
   hover card, board panel, inline expand. Zero mockups use a centred modal for project detail. The app has 15 modals
   with 6 different scrims.
5. **Edit where the data is visible.** `recording-editor` makes filename *segments* individually clickable
   (`.seg-ch`, `.seg-seq`, `.seg-name`, `.seg-tag`, `.seg-ext`) with a preview-before-commit panel and a 30-second undo.
   Consistent with `feedback_rename_trust` memory.
6. **Actions hide until hover, state is always visible.** `chapter-separator` moves five chapter actions into a hover
   overflow menu, keeping name + duration pill + file count permanently visible. Same instinct in
   `b-table-hover` and in `a-table-drawer`'s row-action reveal.
7. **Progress belongs to a stage machine, not to a status string.** Six mockups render stages as an ordered colour ramp
   (`--stage-plan` violet → `--stage-pub` dark green, `02-kanban-pipeline/index.html:22-29`). The vocabulary drifted
   (Rev dropped, Shelved + Remix added) because the ramp lived in CSS, not in a typed model.
8. **One monospace face for machine truth.** Every mockup renders codes, filenames and paths in `SF Mono` and prose in
   the system sans. The app has `font-mono` ×139 with no declared stack. **Two families, and only two.**

Two unresolved disagreements the rebuild must actually decide:

- **Accent: blue `#3b82f6` or gold `#8b6914`?** 4 mockups each way. Blue shipped by default, not by decision. Gold
  harmonises with linen; blue is the "interactive" convention already in 100+ places.
- **Code vs Name columns.** Every table mockup carries both, and in the live screenshot they are near-duplicates
  (`b65-guy-monroe-marketing-plan` / `guy-monroe-marketing-plan`) consuming the widest region of the table. No mockup
  ever questioned it.

---

## 6. Design artifacts that must exist BEFORE the rebuild

Ordered by how much downstream rework each one prevents. Items 1–4 are prerequisites for writing any component.

### 1. `DESIGN-TOKENS.md` + a single generated `theme.css` — **one source, machine-checked**

The tokens must be *generated* from the doc (or the doc generated from the tokens), and a CI check must assert that
**every colour/size/radius class used in `src/` resolves to an emitted CSS rule**. That check — a diff of "classes
referenced" against "classes emitted in `dist/*.css`" — is roughly 20 lines and is the exact seam whose absence let
`text-warm-primary` be wrong 90 times for four months.

Must cover, at minimum:

| Scale | Required because |
|---|---|
| Colour: page / surface / surface-muted / surface-hover / border / border-strong / text ×4 | Currently 20 tokens with 6 dead and 2 unreachable |
| **Type: exactly 5 steps** with names | Currently 11 undeclared sizes, 6 of them between 10 and 15px |
| **Radius: exactly 3** (`sharp`, `card`, `pill`) | Currently 5 + 31 buttons with none |
| **Elevation: exactly 3** | Currently 5 shadow levels, mostly bare `shadow` ×161 |
| **Scrim: exactly 1** | Currently 6 |
| Semantic status: success / warn / danger / info / neutral | Currently raw `blue/red/green/amber/purple/pink-N00` chosen ad hoc, 35 button signatures |
| Density: row height, cell padding, gutter | Currently 20 button padding pairs |

Also record **why the palette is warm** (camera reflection). It is the single most important non-obvious constraint in
the product and it currently exists in one sentence inside an archived campaign plan.

### 2. `COMPONENT-VOCABULARY.md` — the closed list, with the primitives built first

Name every widget the app is allowed to contain, and build them before any page. Minimum from the mockup corpus:

`Button` (primary/secondary/ghost/danger × sm/md) · `IconButton` · `Pill` (filter, toggle, status — **one shape, one
active treatment**) · `Card` · `Table` + `Th`/`Td` (`ProjectsPanel.tsx:740-759` repeats the identical 8-utility `<th>`
string 17 times) · `Drawer` (the *one* drawer — resurrect and own `SlideOutDrawer`) · `Modal` (one scrim) ·
`FileRow` · `ChapterHeader` (**one**, shared by Recordings and Manage) · `ProgressBar` · `StatCard` · `EmptyState` ·
`Toolbar` · `ActivityFeed` · `HoverCard`.

The rule that makes it stick: **a page may not introduce a colour, radius, shadow or padding value directly.** If a page
needs a treatment the vocabulary lacks, the vocabulary changes.

### 3. `LAYOUT-CONTRACT.md` — pick one shell

Decide, once: dense full-width (what 6 of 8 mockups drew, what Projects already does) or narrow centred (what 8 of 9
tabs do). Do not ship both. Specify chrome height, sidebar behaviour (`08-manage-export.png` shows the current sidebar
as a floating card that stops halfway down the page), the drawer's width and push-vs-overlay behaviour, breakpoints, and
whether the app has a minimum width at all.

### 4. `PROJECT-MODEL.md` — the design doc that isn't visual

Eight project-list mockups happened because this file didn't exist. Before drawing anything, write down:

- the **stage machine**: the canonical ordered list, allowed transitions, and which are derived vs. user-set (currently
  a `STAGE_DISPLAY` CSS record that has churned through 8 → 9 members)
- **"health" and "readiness"** as first-class typed concepts, computed server-side — not `getHealthAssessment()`
  invented at `ProjectDrawer.tsx:48` during a visual campaign
- the **column contract**: which facts earn a table column vs. drawer-only, and the rule that governs it. Write it as a
  constraint the code can hold, so the next feature cannot quietly add eight columns eight days later.
- whether Code and Name are one field or two

### 5. `INTERACTION-PATTERNS.md` — the behaviours the mockups already agreed on

Detail-on-selection (never modal) · edit-in-place with preview-then-commit and timed undo · actions-on-hover /
state-always-visible · one-click over multi-step (`feedback_ux_friction` memory) · keyboard: Esc closes, `/` focuses
filter, arrows move selection (three mockups wired `keydown`; the app has no keyboard model at all).

### 6. A refreshed, curated mockup set — and a register that cannot drift

The 13 existing mockups are the best design asset in the repo and they are already unmaintainable: the gallery says "3",
`config.md` lists 5, `MockupsPage.tsx` hardcodes a fourth list, four variants are gone without trace, and three sit on a
dead palette. For the rebuild:

- **generate** the gallery from the folder, never hand-write it
- one `decision.md` per exploration round: what was tried, what won, **what lost and why** — the four culled
  project-list variants and the gold-accent direction are lost information that cost real hours to produce
- re-skin or delete the three pre-linen mockups so the corpus states one palette
- decide whether mockups ship inside the app bundle (`client/public/mochaccino` is a symlink to `.mochaccino`, so today
  they do)

### 7. A screenshot baseline with a purpose

90 PNGs, one 16-shot tour captured once (2026-04-08), an 8-shot consistency sweep run once (2026-03-24), no criteria doc.
Either make it a real visual-regression baseline (fixed viewport, fixed fixture project, re-captured per release,
diffed) or delete it. Right now it is 38 MB of evidence that nobody can compare against anything.

---

## Open questions — only David can answer these

1. **Blue or gold?** Four mockups each. Blue shipped by inertia. Gold (`#8b6914`) is what three of the *later* mockups
   chose, and it harmonises with linen. Which one is FliHub?
2. **Does the whole app go full-width and dense, or does Projects come back into the 896px column?** Both currently
   exist and the split is a one-line ternary at `App.tsx:725`.
3. **Code and Name — one field or two?** They are near-identical in every real row and together consume the widest part
   of the table.
4. **`c-table-kanban` (List/Board toggle) lost with no record. Was that deliberate,** or did A simply get built first?
   The rebuild can still take it.
5. **What are the four culled project-list variants (03, 04, 05, 07, 08, 09)?** They exist only as the number "10" in a
   banner. Is any of that thinking worth recovering, or is it genuinely dead?
6. **Is "health" a real product concept or a drawer filler?** If real, it needs a server-side definition and a place in
   `ProjectStats`. If not, cut it and say what the drawer is actually for.
7. **What is the Manage tab, really?** Six "matching RecordingsView" comments say it is a second copy of Recordings.
   Should it be a *view mode* of Recordings rather than a tab?
8. **Does FliHub need a keyboard model?** Three mockups wired keyboard handling; the app has none. On a tool used daily
   for hours during recording, this may be the highest-leverage unbuilt design.
9. **Should the design system be shared across the FliVideo suite** (FliDeck, FliGen, FliBrief, Storyline, FliVoice) or
   is Warm Linen FliHub-only? The palette came from AngelEye's Mochaccino v2-linen, so precedent for sharing exists.

---

## Appendix — reproduce the counts

```bash
cd /Users/davidcruwys/dev/ad/flivideo/flihub/client

# the two broken classes
grep -ro "text-warm-primary" src | wc -l     # 90
grep -ro "text-warm-faint"   src | wc -l     # 65
grep -c  "warm-primary" dist/assets/*.css    # 0
grep -c  "warm-faint"   dist/assets/*.css    # 0

# vocabulary
grep -ro "<button" src | wc -l               # 290
grep -rhoE 'text-\[[0-9]+px\]' src | sort -u # 5 arbitrary sizes
grep -rhoE '(bg|text|border)-\[#[0-9a-f]{6}\]' src | sort | uniq -c

# zero-consumer shared components
for n in PageHeader RegenToolbar RelayBrowser SlideOutDrawer; do
  echo "$n: $(grep -rn "$n" src | grep -v "shared/$n.tsx:" | wc -l)"
done

# design docs
find . -iname "DESIGN.md" -o -iname "*style-guide*" -o -iname "*tokens*" | grep -v node_modules   # empty
```
