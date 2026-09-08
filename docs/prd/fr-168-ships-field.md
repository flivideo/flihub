# FR-168 — `ships: per-project | per-chapter` as a Create-Time Project Field

**Status: Pending — DESIGN RULED BY DAVID (2026-09-04), implementation not yet authorised.**
This ticket is "implement the ruled field", not "consider adding one".

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
- How many FliCut runs a project needs.
- How many uploads FliLaunch should expect.
- How many files `final/` should end up containing.

## The fix shape (when approved)

- `shared/types.ts` ProjectState: add `ships` (remember `writeProjectState` is an
  **allowlist** — `server/src/utils/projectState.ts` must list the new field or it is
  silently dropped; this bit FR-157 already).
- `NewProjectForm.tsx` (FR-163): a two-option selector at create time.
- Surface it in `/api/query/projects` and the reporters so agents can read it.
- Decide a default for the ~97 existing projects (probably `per-project`, the historical
  norm) and whether d02 gets hand-set to `per-chapter`.

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
