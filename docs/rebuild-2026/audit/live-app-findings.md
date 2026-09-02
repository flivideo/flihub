---
title: Live App Findings
source: direct observation of the running FliHub instance, 2026-08-26
method: HTTP calls against localhost:5101 + code verification of every claim
status: verified
---

# Live App Findings — observed against the running instance

These were found by querying the **running** FliHub (Overmind: client 5100, server 5101 both up)
and then verifying each observation in source. They are separate from the static audit because the
audit agents were instructed not to touch the running server.

---

## L1 — The public query API advertises a stage vocabulary the app abandoned

**Severity: high. Confidence: certain (verified in source and against the live endpoint).**

`GET /api/query/config` returns:

```json
"stages": ["none", "recording", "editing", "done"],
"stageFilters": ["none", "recording", "editing", "done"]
```

Hardcoded at `server/src/routes/query/index.ts:43,46`.

The real domain type has **ten** values — `shared/types.ts:439-449`:

```ts
export type ProjectStage =
  | 'planning' | 'recording' | 'first-edit' | 'second-edit' | 'review'
  | 'ready-to-publish' | 'published' | 'archived'
  | 'shelved'   // FR-149: Abandoned — never published
  | 'remix';    // FR-149: Being repackaged into new content
```

Live project data (65 projects via `/api/query/projects`) uses:
`recording` 44, `published` 13, `planning` 4, `first-edit` 3, `ready-to-publish` 1.

A partial translation shim exists at `server/src/routes/query/projects.ts:46-47`:

```ts
editing: 'first-edit',
done:    'published',
```

So the query layer *knowingly* speaks a different dialect from the application.

**Why this is architectural, not a bug.** Nothing crashes. The shim works for the two cases it covers.
The flaw is that the public API keeps its own **private, hardcoded copy of a domain vocabulary** that
`shared/` exists specifically to own. The copy then drifted:

- 7 of 10 real stages are not expressible through the public API at all
  (planning, second-edit, review, ready-to-publish, archived, shelved, remix)
- `none` is advertised but is not a `ProjectStage` value
- the shim maps inward only (filter aliases), so responses still emit real stage names —
  a consumer that trusts the advertised vocabulary cannot parse what it gets back

**Blast radius.** Any external agent that does the correct thing — ask `/api/query/config` what the
valid stages are, then filter — gets a vocabulary that can address at most 47 of 65 projects, and
silently returns zero for `editing`/`done`/`none` if the shim is bypassed. The `flihub` skill at
`~/dev/ad/appydave-plugins/flivideo/skills/flihub/SKILL.md` documents `?stage=recording` and `?stage=editing` as the examples.

**Rebuild implication.** The stage vocabulary must have exactly one definition, and the public API must
project from it rather than restate it. If the API needs a coarser public vocabulary, that mapping is a
first-class, tested, bidirectional adapter — not two hardcoded arrays and a two-line lookup in a route file.

---

## L2 — Project state lives in a central config file, not with the project

**Severity: high. Confidence: certain.**

`server/config.json` carries `projectStageOverrides` — a single flat map of project code to stage,
**36 entries** at time of observation:

```json
"projectStageOverrides": {
  "b94-bmad-reference-sheet": "published",
  "b71-bmad-poem": "first-edit",
  "x01-remotion-video-generator-3rd-feb": "shelved",
  ... 33 more
}
```

Typed at `shared/types.ts:203` — *"FR-80: Manual stage overrides (absent = auto-detect)"*.

The stage of a project — arguably its most important single attribute — is therefore **not stored with
the project**. It lives in one mutable server-global JSON file that grows by one line per project forever
and is rewritten whenever any project's stage changes.

Consequences that follow structurally:
- A project folder is not self-describing. Move it, copy it to an editor machine, or open it on another
  machine in the fleet, and its stage does not travel with it.
- Every stage write is a read-modify-write of a global file — concurrent writes race by construction.
- The map never garbage-collects. Deleted projects keep their entries.
- This is precisely the drift the FliLaunch triage handoff complains about
  (`docs/triage-handoff-from-flilaunch.md`: *"`stage` is manually set. It drifts from reality"*).

**Rebuild implication.** Per-project state belongs in the project. The filesystem is already the database;
a project should be readable and complete on its own. Global config should hold machine/app settings, not
per-entity domain state.

---

## L3 — Five route modules mount on two overlapping prefixes

**Severity: medium. Confidence: certain.**

From `server/src/index.ts`:

| Mount | Modules |
|---|---|
| `/api/projects` | `projectRoutes` (261), `holdRoutes` (322), `storageRoutes` (326) |
| `/api` | `routes` (238), `stateRoutes` (306) |

Three separate modules own paths under `/api/projects`, and two own bare `/api`. No single file describes
what `/api/projects` responds to; resolution depends on Express registration order in `index.ts`.

**Rebuild implication.** One resource, one owner. Overlapping mounts make the HTTP surface unreadable
without executing it in your head, and make it impossible to answer "what does this resource support?"
from any single place.

---

## L4 — The brain's integration design doc points at an endpoint that never existed

**Severity: low (documentation), but it is a live instruction to agents.**

`~/dev/ad/brains/brand-dave/flihub-integration-design.md` tells Brand Dave agents:

> Check FliHub health: `curl -s localhost:5101/api/health`

`/api/health` returns **404**. The real endpoint is `/api/system/health`
(`server/src/routes/system.ts:346`, mounted at `index.ts:251`), which responds correctly:

```json
{"success":true,"status":"ok","server":"FliHub","port":5101,"project":"d01-kybernesis-12-videos"}
```

The doc's fallback rule is *"if down -> write directly to the filesystem"*. So an agent following that doc
concludes FliHub is down **every time**, and always takes the fallback path — silently. The failure and the
success look identical from the agent's side.

The live skill (`~/dev/ad/appydave-plugins/flivideo/skills/flihub/SKILL.md:42`) has it right. Only the brain doc is stale. The same
doc also specifies `POST /api/projects/:code/inbox`; the endpoint that shipped is
`POST /api/projects/:code/inbox/write` (`server/src/routes/projects.ts:726`).

**What this does not establish:** I did not test whether any Brand Dave agent actually runs this health
check today, only that the documented check would fail if run.

---

## L5 — 47% of the stage overrides are inert, and `shelved` can never be observed

**Severity: high. Confidence: certain (reconciled config against the live API and the disk).**

This is L2's predicted failure, measured.

`server/config.json` -> `projectStageOverrides` holds **36 entries**. Reconciled against the 65 projects the
server actually reports:

| | count | stages |
|---|---|---|
| Overrides pointing at a **live** project | 19 | published 13, first-edit 3, recording 2, ready-to-publish 1 |
| Overrides pointing at a project that **no longer exists** | **17** | **shelved 14**, published 2, archived 1 |

So **47% of the stage map is dead weight**, silently. Nothing reports it, nothing prunes it.

### The part that is a design flaw, not just stale data

Look at which overrides went stale: **all 14 `shelved` entries, and the single `archived` entry.**
Not a random sample — a clean sweep of exactly two stage values.

The reason is that in David's actual workflow, *shelving a project means moving its folder away*
(there is an `~/dev/video-projects/v-appydave/archived/` directory holding them). So:

- `shelved` and `archived` were modelled as **states** a project can be in (`shared/types.ts:447-449`,
  added by FR-149)
- but the operator performs them as a **relocation**
- a relocated project is no longer scanned, so its stage can never be read back

**`shelved` is therefore a write-only stage.** The UI offers "Shelved" and "Arch" filter chips
(visible in the Projects toolbar) that can match **zero projects, ever**, by construction. Two of the
nine stage filters in the primary surface are permanently empty.

Neither the code nor the docs record this. Both look correct in isolation.

**Rebuild implication.** Decide whether lifecycle-exit is a *state* or a *move*, and model exactly one.
If a project can leave the scanned set, then "gone" is not a stage — it is a different storage location,
and the thing that needs modelling is the **transition**, plus a way to see what left. If instead shelved
projects should stay visible, they must stay scanned. The current design tries both and gets neither.

---

## L6 — Three different counts of "how many projects are there"

**Severity: medium. Confidence: partial — see what this does not establish.**

| Source | Count |
|---|---|
| Directories on disk (`~/dev/video-projects/v-appydave/*/`) | 66 (65 projects + an `archived/` folder) |
| `GET /api/query/projects` | 65 |
| `GET /api/projects/stats` (what the table renders) | 65 |
| **The Projects tab header** | **"62 of 62"** |

The two APIs agree with each other and with disk. The UI does not. Three projects are dropped
client-side, and the header reports the filtered number as *both* halves of "X of Y" — so the count that
is supposed to reveal filtering is itself filtered, and the 3 missing projects are invisible in a display
whose whole job is to tell you what you are not seeing.

**What this does NOT establish:** I did not isolate which 3 projects are dropped or why, and
`client/src/components/ProjectListToolbar.tsx` + `client/src/utils/projectFilters.ts` are **currently
modified in the working tree** (uncommitted, David's in-progress work). So this may be a live edit rather
than committed behaviour. It needs re-checking against a clean tree before being treated as a defect.

---

## L7 — Two parallel navigation states, and a tab whose id is a fossil

**Severity: medium. Confidence: certain.**

The tab labelled **"Manage"** in the UI is `activeTab === 'export'` internally
(`client/src/App.tsx:43-55`, button at :700). It was renamed in the UI and never in the code.

That tab then hosts a *second* router: a `manageTool` state selecting `sync` / `relay` / `storage`
(`App.tsx:177-181`, :548-559). So navigation is two independent variables — `activeTab` in the URL hash,
`manageTool` in React state only.

Consequences:
- The URL hash captures the tab but **not** the tool, so `#export` is not a shareable or restorable
  location, and browser back does not undo a tool switch.
- Reading the code, "export" and "Manage" appear to be different features. They are the same one.
- Three header indicators (`SyncIndicator`, `RelayIndicator`, `SsdIndicator`) each navigate by setting
  *both* variables — the coupling is repeated at every call site rather than expressed once.

**Rebuild implication.** One routing concept, one representation, addressable end to end. If a surface has
sub-surfaces, they are part of the route, not a second state variable beside it.

---

## L8 — Two incompatible layout philosophies in one app

**Severity: medium (product/design). Confidence: certain.**

`App.tsx:725`:

```tsx
<main className={activeTab === 'projects' ? 'flex-1 flex flex-col overflow-hidden' : 'max-w-4xl mx-auto px-4 py-6'}>
```

**Projects** is full-bleed: a dense, sortable, filterable table using the whole 1600px viewport — genuinely
good, and clearly the design that won the eight-variant Mochaccino exploration.

**Every other tab** is clamped to `max-w-4xl` (896px) and centred. On the Incoming tab that leaves roughly
60% of the horizontal canvas empty and the content ending two-thirds of the way down the page.

One app, two answers to "how wide is a page", chosen by a ternary on a single tab name. Every future
surface inherits whichever branch it happens to fall into.

**Rebuild implication.** Layout is a property of the *kind* of surface (dense data view vs focused form),
declared per surface — not a special case for one tab name in a ternary in the root component.

---

## L9 — Redundant and empty columns in the primary table

**Severity: low-medium (product). Confidence: certain, from the rendered table.**

In the Projects table:

- **CODE** and **NAME** are near-duplicates for every row: `b65-guy-monroe-marketing-plan` /
  `guy-monroe-marketing-plan`. NAME is CODE with the prefix stripped. Two columns, one fact, 62 rows.
- **RELAY** is empty for every visible row.
- The table sorts by CODE by default, so MODIFIED dates read as noise (26 Dec, 8 Apr, 26 Dec, 15 Dec...)
  in the app's most important "what should I work on" surface.

**Rebuild implication.** The project list is the app's front door. Columns should earn their width.

---

## L10 — Multi-brand content inside a single-brand folder assumption

**Severity: informational, but it invalidates a stated design assumption.**

`/api/system/health` reports the active project as `d01-kybernesis-12-videos` — a **Kybernesis** project —
and the footer shows its path as `~/dev/video-projects/v-appydave/d01-kybernesis-12-videos`.

So a Kybernesis project physically lives inside the **v-appydave** brand folder. Of 65 project codes the
prefixes are `c` 35, `b` 25, and one each of `d`, `p`, `t`, `v`, `x` — the prefix is a *series* marker, not
a brand, and brand is encoded only by the parent directory, which is now wrong for at least one project.

The May 2026 triage handoff states *"currently FliHub is single-brand (v-appydave)"* and permits hardcoding
that. The folder layout still says single-brand; the content no longer is.

**Rebuild implication.** Brand/series needs to be a modelled attribute, not a directory the operator has to
put the project in correctly. Any design doc predicated on single-brand should be re-read before use.

---

## L11 — React hydration warning on the Projects table

**Severity: low. Confidence: observed, attribution uncertain.**

The Projects tab logs a React error on load:

> In HTML, whitespace text nodes cannot be a child of `<tr>`. ... This will cause a hydration error.

Traced to the `<thead><tr>` in the projects table (`ProjectsPanel` -> `<table>` -> `<thead>` -> `<tr>`),
a stray `{" "}` between `<th>` elements.

**What this does not establish:** `ProjectListToolbar.tsx` is uncommitted work-in-progress in the tree
right now, so this may be from a live edit rather than committed code. Re-check against a clean tree.
Noted for completeness rather than as an audit finding — it is a bug, and B475 is explicit that bugs are
not the point.

---

## L12 — The filename preview lies, and it may explain the "rename feels untrustworthy" complaint

**Severity: high (trust surface). Confidence: confirmed in source; end-to-end UI click-through not performed.**

Two different sanitisers are wired to the two halves of the same action.

**What you read** — `client/src/components/NamingControls.tsx:321` (and `FileCard.tsx:146`) render
`buildPreviewFilename` from `client/src/utils/naming.ts:4`:

```ts
name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
```

**What gets written** — the client posts the **raw** name; `server/src/routes/index.ts:162` destructures
`{ originalPath, chapter, sequence, name, tags }` and `:211` calls `buildRecordingFilename(...)`, which
calls `sanitizeName` at `shared/naming.ts:327`:

```ts
name.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9.-]/g, '')   // KEEPS periods
    .replace(/-+/g, '-')           // collapses hyphen runs
    .replace(/^-|-$/g, '')         // trims
    .slice(0, NAMING_RULES.name.maxLength);
```

They disagree on **periods, hyphen-run collapsing, trimming, and length capping**. Verified by running
both implementations against real inputs:

| typed | preview shows | file becomes |
|---|---|---|
| `Opus 4.5 awesome` | `opus-45-awesome` | `opus-4.5-awesome` |
| `vibe code whisper ai opus 4.5` | `vibe-code-whisper-ai-opus-45` | `vibe-code-whisper-ai-opus-4.5` |
| `claude 3.7 vs 4.5` | `claude-37-vs-45` | `claude-3.7-vs-4.5` |
| `Intro v1.2  — take` | `intro-v12--take` | `intro-v1.2-take` |
| `ito.ai doubled productivity` | `itoai-doubled-productivity` | `ito.ai-doubled-productivity` |

**This fires in normal use.** 8 of the 65 live project codes contain a period:
`b70-ito.ai-doubled-productivity`, `b72-opus-4.5-awesome`, `b73-vibe-code-ecamm-line-opus-4.5`,
`b75-vibe-code-whisper-ai-opus-4.5`, `b76-vibe-code-auto-chapters-opus-4.5`,
`b89-vibe-code-video-player-opus-4.5`, `c14-opus-4.6-elevenlabs-voice-agent`, `c15-opus-4.6-appystack`.
Version numbers and domain names are a habitual naming pattern here.

### Why this is more than a bug

There is a standing recorded complaint from David that **rename tools "feel untrustworthy"**
(memory: `feedback_rename_trust`). The preview is *the entire trust surface* of the rename action — the
thing you read to decide whether to commit. It is wired to a weaker, divergent implementation of the
app's own core domain rule.

**Hypothesis, not proven causation:** the untrustworthy feeling has a mechanical source. Worth testing
directly during live usage — type a name with a version number and watch what lands.

### Scope note (what is NOT affected)
The image/asset path is correct: `AssetsPage.tsx:85` defines a local `buildPreviewFilename` that
delegates to the shared `buildImageFilename`. Only the **recordings** preview diverges.

**Rebuild implication.** The shared workspace owns naming end to end — preview, validation and write must
call the *same* function. A preview that is not literally produced by the writer is not a preview, it is a
second implementation with a misleading name. In v2 the preview should be computed by asking the writer.

---

## L13 — Git-tracked compiled `.js` shadows the `.ts` source (a loaded gun, not yet a live bug)

**Severity: high as a structural trap. Confidence: mechanism certain; the dangerous divergence is
currently NOT reached — see scope.**

`shared/` ships both sources and their compiled output, all git-tracked (`git ls-files shared/`):

```
constants.d.ts  constants.js  constants.ts
naming.d.ts     naming.js     naming.ts
paths.d.ts      paths.js      paths.ts
types.d.ts      types.js      types.ts
```

Client code imports these **extensionless** — `import { parseRecordingFilename } from '../../../shared/naming'`.
`client/vite.config.ts` sets no `resolve.extensions`, so Vite's default order applies: **`.js` is resolved
before `.ts`**. There are **13 runtime (value) imports** from `shared/` in the client, including
`RecordingsView.tsx:33` (`buildRecordingFilename`, `parseRecordingFilename`), `NamingControls.tsx:4`
(`DEFAULT_TAGS`) and `useBestTake.ts:3` (`FILE_SIZE`).

So the client **type-checks against the `.ts` and executes the `.js`.**

### The divergence that exists

`shared/types.ts` was last committed **2026-04-14**; `shared/types.js` **2026-02-13**. The gap is exactly FR-149:

| | `DEFAULT_PROJECT_STAGES` |
|---|---|
| `types.ts` (Apr 14) | planning, recording, first-edit, second-edit, ready-to-publish, published, archived, **shelved**, **remix** |
| `types.js` (Feb 13, tracked) | planning, recording, first-edit, second-edit, **review**, ready-to-publish, published, archived |

`types.d.ts` has no knowledge of `shelved` or `remix` at all.

### Scope — what I checked, and what it rules out

I searched client and server for runtime consumers of the stale constants:

```
grep -rn "DEFAULT_PROJECT_STAGES\|STAGE_LABELS" client/src server/src  ->  no matches
```

**Nothing imports them at runtime today.** So the stale stage list is *not currently executing*, and this is
**not** the cause of L1 or L5 — those have their own separate causes (a hardcoded array in
`query/index.ts:43`, and stale config entries respectively). I checked and I am saying so, rather than
letting three findings collapse into one satisfying story that is not true.

I also verified `naming.js` is **in sync** with `naming.ts` on the rule that matters for L12 — both keep
periods in `sanitizeName`. So L12's preview divergence is genuine and unrelated to this.

### Why it is still a high-severity finding

It is a trap with no tripwire. The next person — or agent — who writes
`import { DEFAULT_PROJECT_STAGES } from '../../shared/types'` in the client silently gets February's data.
Nothing errors. Type-checking passes, because tsc reads the `.ts`. The failure and the success look identical,
which is the single most expensive property a defect can have.

**Rebuild implication.** Ship source only; `.gitignore` all build output. If a compiled artifact must exist,
it lives outside the source tree and is never resolvable ahead of the source. More generally: a workspace must
have exactly one representation of itself on disk.

---

## L14 — 153 elements apply a colour class that produces no CSS. This is why the theme "feels inconsistent"

**Severity: high (visible, app-wide). Confidence: certain — verified against the CSS the dev server
is actually serving.**

### The mechanism

Tailwind v4 generates utilities from `--color-<name>`, so `--color-foo` yields `.text-foo`.

Commit `fb99b1b` defined the text tokens with the `text-` prefix *inside the variable name*
(`client/src/index.css:25-28`):

```css
--color-text-warm-primary:   #2a2018;   /* generates .text-text-warm-primary */
--color-text-warm-secondary: #4a3e30;
--color-text-warm-muted:     #7a6e5e;
--color-text-warm-faint:     #9a8a78;
```

But the migration guide every agent followed (`docs/planning/AGENTS.md:381-386`) told them to write
`text-warm-primary` — which requires `--color-warm-primary`.

A follow-up commit `aa0c171` ("fix: warm linen visual consistency — add missing tokens") spotted the
mismatch and added **two** of the four (`index.css:29-30`):

```css
--color-warm-muted:     #7a6e5e;   ✓
--color-warm-secondary: #4a3e30;   ✓
```

`--color-warm-primary` and `--color-warm-faint` were never added.

### Measured, against the running app

Fetched the served stylesheet from the Vite dev server on :5100 (80,360 bytes) and grepped for the rules:

| class | usages in `client/src` | rule in served CSS |
|---|---|---|
| `text-warm-primary` | **89** | **0 — no rule exists** |
| `text-warm-faint` | **64** | **0 — no rule exists** |
| `text-warm-secondary` | 357 | 1 ✓ |
| `text-warm-muted` | 424 | 1 ✓ |
| `text-text-warm-primary` | 0 | 0 (nobody writes the double-prefixed name) |

**153 elements across the application apply a class that emits nothing.** They silently inherit colour
from an ancestor instead of rendering the intended token. `text-warm-primary` is the *primary body text
colour* — the most common text role in the app.

Both ends are broken simultaneously: `--color-text-warm-primary` is a defined token generating a utility
nobody writes, and `text-warm-primary` is a written utility with no token behind it.

### Why this matters beyond the CSS

There is a standing recorded note from David (memory: `warm-linen-consistency`) that **the theme "needs a
visual consistency pass after mechanical token replacements."** That is a reported *feeling*.

This is its mechanical cause, proven: a bulk token migration was performed against a guide that named the
tokens wrongly, a partial fix corrected half of them, and 153 usages have been rendering with no colour
rule ever since. The app does not look broken — inherited colours are plausible — it looks *slightly
inconsistent*, which is exactly what was reported and exactly what nobody could pin down.

This is the second finding in this audit where a vague user complaint turns out to have a precise,
verifiable mechanical cause (see also **L12**, the lying filename preview → "rename feels untrustworthy").

### Fix (trivial, and worth doing before the rebuild)
Add to `client/src/index.css`:
```css
--color-warm-primary: #2a2018;
--color-warm-faint:   #9a8a78;
```
…then delete the four `--color-text-warm-*` tokens, which generate utilities nothing uses.

**Rebuild implication.** Design tokens need a build-time assertion that every utility referenced in source
resolves to a defined token. A class name that silently produces nothing is the CSS equivalent of a
swallowed exception — and a bulk mechanical migration is precisely the operation that needs the guard.

---

## L15 — Corrections applied after adversarial verification

Recorded so the rebuild does not inherit a wrong number. All from the verifier passes.

| Claim as first reported | Corrected |
|---|---|
| 69 of 156 routes are RPC-shaped | **45** — 69 could not be reproduced |
| `regen-all` is a 320-line handler; manage.ts holds the 5 longest handlers | **~21 lines.** All per-handler length figures were a slicing artifact (measuring to the next `router.post(` across intervening helpers). The finding survives — `manage.ts` is still 1,733 lines of four fused concepts — the framing was wrong. |
| 30 error responses return HTTP 200 | **at least 51** (worse) |
| 47 handlers with no success envelope | **unreproduced — do not quote** |
| 6 utils modules imported by no route | **only `responses.ts` is dead**; the other five are live one hop away |
| 7 config endpoints across 4 routers | 8 handlers across 5 files |
| `config.projectDirectory` non-test sites: 89 | **83** |
| Mutating routes: 86 | **84** |
| `-safe` live sites: 12 | **11** (3 of them are `recording-shadows/-safe`, a different folder) |
| Client listens for 7 socket events the server never emits *(main session's own hypothesis)* | **Refuted — 6 of 7 are emitted** via a config-table indirection at `WatcherManager.ts:62` that literal grep cannot see. Only `file:renamed` and `file:error` are dead listeners. |
| `POST /:code/hold` shadowing is "three missing guards plus accounting" *(main session's own downgrade)* | **Upgraded.** The winning handler runs `holdProject(projectDir, …)` — a **whole-project** rsync — where the dead handler would have rsynced **only heavy subfolders**. Different operation, not just fewer guards. Still not a data-loss hazard: `holdUtils`' 5-gate chain protects the delete on both paths. |

**The pattern worth keeping:** across four verification passes, **every finding survived**, but sub-claims
were killed and counts moved in both directions. Nothing was rubber-stamped; nothing was dismissed. Two of
the corrections above are to the main session's own claims.
