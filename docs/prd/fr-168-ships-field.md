# FR-168 — `ships: per-project | per-chapter` as a Create-Time Project Field

**Status: ✅ IMPLEMENTED 2026-09-08.** Design ruled by David 2026-09-04, defaults + labels ruled
2026-09-08, built the same day. Hand-setting the two existing per-chapter projects is the one
remaining step and is David's action through the drawer control.

## The gap it closes

Render grain is modelled nowhere. `chapters["NN"].title` in `.flihub-state.json` means a
**VIDEO title** when a project ships one video per chapter (d01: 12 chapters → 12 videos) and
a **CHAPTER title** when the project ships once (d02: 6 chapters → 1 video). Identical folder
shape, opposite meaning — deliberately cut from FR-157's scope. It stopped being theoretical
on 2026-09-04 when `ylo-agent` generated D02's chapters in the wrong register because nothing
machine-readable said which kind of project it was.

## David's ruling

`ships: 'per-project' | 'per-chapter'` becomes a field chosen at project creation.

## What it answers downstream

- How FR-157 titles should be read (video titles vs chapter titles).
- ⭐ **BOTH title fields flip register, not just the chapter one** (found 2026-09-08, never stated
  before): `ProjectState.title` is **the video's own title** under per-project and **the SERIES /
  playlist name** under per-chapter. Measured in the live file — a01-kybernesis stores
  *'Agents That Actually Hold Together'* beside five distinct video titles, which is a series name
  sitting in a slot that was labelled "YouTube title". Any agent reading FR-157 titles needs BOTH
  rules.
- ⭐ **No deliverable enumeration is needed** (ruled by David 2026-09-08): *"It's not like we're
  automating chapter video creation through FliCut… nothing happens till I press the button anyway."*
  Promotion to FliCut is on-demand and one chapter at a time, so FliHub never has to publish a
  deliverable list, a partition, or a discard flag. `ships` describes the project's SHAPE so humans
  and agents read the titles in the right register; WHICH chapters ship is decided at button-press
  time. This is why the field is a bare binary and not a set.
- How many FliCut runs a project needs.
- How many uploads FliLaunch should expect.
- How many files `final/` should end up containing.

## The fix shape (when approved)

- `shared/types.ts` ProjectState: add `ships` (remember `writeProjectState` is an
  **allowlist** — `server/src/utils/projectState.ts` must list the new field or it is
  silently dropped; this bit FR-157 already).
- `NewProjectForm.tsx` (FR-163): a two-option selector at create time.
- Surface it in `/api/query/projects` and the reporters so agents can read it.
- Default for existing projects. ⚠️ **The population cannot be enumerated and nothing may depend
  on enumerating it** — measured 2026-09-08: **64 project folders across the `v-*` brand roots,
  plus `published/` and material outside those roots, but only TWO `.flihub-state.json` files exist
  on the whole machine.** So this is not a migration: it is `absent ⇒ per-project` resolved at read
  time, plus **one** hand-set value.
  ⚠️ **The original line here said "whether d02 gets hand-set to per-chapter" — that is BACKWARDS.**
  d02-cutty-audio-cleanup is the ONE-video exemplar (many chapters, one output) and needs no write
  at all under sparse storage. The project that needs the explicit write is
  `v-kybernesis/a01-kybernesis-12-videos`, and `v-beauty-and-joy/a01-nail-art-…` when it is next
  touched.

## Cross-references

- **Register**: `~/dev/ad/brains/video-as-code/open-problems-register.md`
- **Lifecycle use case**: `~/dev/ad/brains/video-as-code/brand-project-lifecycle.md` — retire / renumber / cross-brand migrate as ONE capability
- **Grain doc**: `~/dev/ad/brains/video-as-code/project-identity-grain.md` (⛔ HELD)

- FR-157 PRD (scope-cut note): [fr-157-project-and-chapter-titles.md](fr-157-project-and-chapter-titles.md)
- FR-163 PRD (create form this lands in): [fr-163-auto-filled-project-codes.md](fr-163-auto-filled-project-codes.md)

---

# Evidence added 2026-09-08 — read this before implementing

**Why appended rather than rewritten**: the ruling above stands unchanged. What follows is a day of
evidence that changes what the field must EXPRESS and what already assumes its absence. Every claim
is marked **[measured]** (read from disk or source, cited) or **[inferred]** (reasoned, not observed).

⛔ **Companion documents — do not act on this ticket without them:**
- `~/dev/ad/brains/video-as-code/project-identity-grain.md` — what "a project" means in FliHub (§8),
  FliCut (§9) and Teletubby (§10). Status ⛔ HELD.
- `~/dev/ad/brains/video-as-code/brand-project-lifecycle.md` — the lifecycle use case this field lives inside.
- `~/dev/ad/brains/video-as-code/open-problems-register.md` — where this ticket sits among the other
  open problems, and the record that **this ruling was re-derived from scratch on 2026-09-08 by a
  session that did not read this file.** That is the failure the cross-references exist to prevent.

## 0 · ⭐ The grain confusion fooled the orchestrator who commissioned this ticket [measured, 2026-09-08]

Four hours after specifying FR-168, `agent-a-day-orch` filed a bug report stating *"Beauty & Joy
genuinely has 3 projects on disk"*. It has **ONE** — `a01-nail-art-learning-three-customer-groups`,
containing **three recordings** (`01-1-hobby-learners`, `02-1-working-nail-technician`,
`03-1-salon-investor`) that are three separate videos. Verified with `find -maxdepth 2`. Its own
words on discovering this: *"I read 'three videos' and wrote 'three projects'."*

**This is the strongest single justification the field has.** The ambiguity is not a modelling
nicety that agents trip over through ignorance — it misled the party that had just written the
specification for it, in the same working session, while holding all the evidence. If "3 videos"
and "3 projects" are indistinguishable to the author of the ticket, they are indistinguishable
full stop, and no amount of documentation substitutes for a machine-readable field.

## 1 · A second per-chapter project exists, in a different brand [measured]

`v-beauty-and-joy/a01-nail-art-learning-three-customer-groups` — three recordings
(`01-1-hobby-learners`, `02-1-working-nail-technician`, `03-1-salon-investor`) that are **three
separate videos**, not three chapters of one. d01 is no longer the only case, and the second one
arrived **in a brand-new brand within four days of the ruling**.

**David's reason, and it predicts recurrence** — when the videos are shorts or verticals around one
topic, it is far easier to record them all in one sitting under one project. So `project = multiple
videos` is **how he works**, not an accident to be designed away. Expect a third.

## 2 · The output naming constrains the field [measured — David's own statement]

He has stated deliverables as `01-[name].mp4` … `10-[name].mp4`. **The deliverable is identified BY
ITS CHAPTER NUMBER.** So `per-chapter` must be able to express *"chapter N is deliverable N"* — a
design that only records "this project ships N videos", without saying which N, **fails against his
own stated output**. This is the first hard constraint anyone has put on the field's shape, and it
came from him describing filenames rather than from a design discussion.

## 3 · Joy's a01 has no `.flihub-state.json` at all [measured — `ls`]

The folder holds only `recordings/`, `recording-transcripts/` and `-trash/`. Every value on the
Recordings screen is derived; **nothing is stored**. So the field's storage location does not exist
for the very project that most needs it — the file is created on first write.

**What that means for the default**: the default cannot be "read the field" for a project whose
state file is absent. `absent ⇒ per-project` must therefore be a **read-time interpretation**, not a
migration that writes files. Writing state files into ~97 projects to record a default would create
a file where none existed and make "never declared" indistinguishable from "declared as the default".

## 4 · Three places already assume one-project-one-video [measured, cited]

| Site | What it assumes | Consequence |
|---|---|---|
| `client/src/utils/projectFilters.ts:45-48` | `ready-to-edit` = `!p.hasFinal` | ⚠️ **LIVE TODAY.** With N videos, ONE finished video flips the boolean and the project **vanishes from ready-to-edit while the rest are still uncut.** Filter logic measured; that d01 is currently mis-filtered is **[inferred]** — not queried. |
| `server/src/utils/finalMedia.ts:79+` | `detectFinalMedia` returns a **singular** `video`, picks one by version | Extra videos are demoted into `additionalSegments` (:141,207) — **a leftovers bin, not peers.** |
| `client/src/components/RecordingsView.tsx:111-125` | `addCumulativeTiming` sums prior chapter durations | Produces "starts @ MM:SS" offsets. For Joy's three videos this is **a correct computation of a meaningless quantity**, and it is on screen right now. Computed from raw recording durations, never from any render. |

## 5 · "+ YouTube title" is named like a deliverable and wired like a label [measured]

`ChapterState.title` (`shared/types.ts:1152`) is stored per chapter and feeds
`server/src/routes/query/chapters.ts:106-119`, which builds the `MM:SS Title` line of a **YouTube
description** — a chapter marker inside ONE video, not a video title.

Nothing downstream treats a chapter as publishable: `routes/thumbs.ts` has **zero** chapter
references (grep, measured); thumbnails are project-scoped.

**Record as the strongest hint that the model already half-believes what `ships` would make
explicit.** The affordance was built at the right grain for the wrong reason.

## 6 · Stage is not per-video, and per-video stage is OUT OF SCOPE [measured]

`ProjectStage` (`shared/types.ts:439`) is a **single scalar per project**, and it is **not stored in
the project folder** — it comes from `projectStageOverrides` in FliHub's **global**
`server/config.json` (`configManager.ts:140-141`, `projectStats.ts:151-153`, `query/projects.ts:160`).

**A project is not self-describing today.** Per-video stage would require relocating stage storage
into the project before it could be per-anything. **Explicitly out of scope for FR-168** — declaring
render grain and tracking per-video progress are different features, and bundling them turns a
one-field change into a storage migration.

## 7 · The recommendation, and the one thing that would flip it

**Recommended: project-level, in `ProjectState`, one optional field, `absent ⇒ per-project`, zero
migration.** `ProjectState` is already the only per-project persisted store, already version-stamped,
already read by every route that matters. The question the field answers — *what does this project
ship* — is **knowable before recording**: David decides "these three are separate shorts" when he
sets up the sitting.

**Per-chapter placement was rejected** [measured reasoning]: extending `ChapterState` is structurally
cheap because it is already chapter-keyed — but it **hangs durable meaning off a DERIVED key**.
Chapter keys orphan on renumber, and **swap-chapters already has a known bug leaving FR-157 titles on
the wrong videos**. Per-chapter inherits that defect and makes it expensive.

⚠️ **WHAT WOULD FLIP IT: if MIXED projects are real** — one long-form plus two shorts in the same
folder. Then project-level is wrong and per-chapter becomes necessary. **Nothing in either codebase
answers whether mixed happens.** It is a question for David and it is the only one that changes the
answer.

## 8 · `ships` is invisible to FliCut — a scope boundary, not a defect [measured]

**FliHub contains ZERO references to FliCut** in `server/`, `client/` or `shared/` (case-insensitive
grep). No handoff, no manifest, no export path. The connection is entirely external: a human points
FliCut at a recordings folder.

So **whatever FliHub declares does not reach the app that renders.** No association was lost between
the two apps — none was ever created.

**Scope boundary**: FR-168 makes the grain DECLARABLE and READABLE BY AGENTS. It does not make it
reach FliCut. That is a separate question (S3 in the register) and must not be smuggled into this
ticket.

## What is NOT established

- Whether d01 is currently mis-filtered by `ready-to-edit` — the filter logic is measured, the
  live consequence is inferred.
- Whether MIXED projects happen. §7's flip condition.
- Whether `.flihub-state.json` is the only marker FliHub writes. If a second registration surface
  exists, §3's absence reasoning weakens.
- Nothing here was tested by running FliHub.


---

# Implementation notes — 2026-09-08

**Shipped**: `ProjectShips` type + `ProjectState.ships` (shared/types.ts) · allowlist entry +
`resolveShips` / `setProjectShips` (server/src/utils/projectState.ts) · `PUT /api/projects/:code/ships`
(routes/state.ts) · create-time write (routes/index.ts) · resolved serve on `/api/query/projects`
(list + detail) and the text reporters · `ShipsSelector` shared by NewProjectForm and ProjectDrawer ·
grain-aware relabelling of both title slots · `starts @` suppressed under per-chapter.

**Labels are David's words** — "Video per project" / "Video per chapter" — carried with a mandatory
COUNT line beneath each. Both phrases are silent about which side multiplies ("video per chapter"
scans either as *N videos* or as *a video that has chapters*), and that bistability flipped the terms
in David's own sentence during the design discussion. The count line is the disambiguator; do not
tidy it away. See the header comment in `client/src/components/shared/ShipsSelector.tsx`.

**Storage is sparse, serving is resolved.** Only `'per-chapter'` is written. Absence means
per-project, so no file is created for the historical norm and reading never creates one — which
matters because the most important project (Joy's a01) has no state file at all. Every API response
carries a concrete `ships` plus `shipsDeclared`, so no consumer has to know the absent-means-default
rule. **`shipsDeclared: false` is the safety property**: a consumer that cares should ask rather than
trust the default.

**Set-after-create was required, not optional.** Both known per-chapter projects existed before the
field did and can never pass through the create form; without the drawer control the feature could
not describe a single existing project.

**MIXED projects remain unmodelled** — the escape hatch is a per-chapter field, and no project-level
patch reaches it. Confirmed independently by this session and teletubby-dev.

**Resolved**: the open question *"whether `.flihub-state.json` is the only marker FliHub writes"*.
There IS a second surface — `projectCodeHighWater` in the GLOBAL `server/config.json`, written only by
the create route — but it is global, monotonic and carries no per-project state, so §3's absence
reasoning stands unchanged.

**Not verified**: the per-chapter UI (the "+ Series title" / "+ Video title" labels and the suppressed
`starts @`) has never been seen rendering, because reaching that state requires declaring a real
project per-chapter and both candidates sit under a standing hold. David flipping Kybernesis in the
drawer is itself that verification.
