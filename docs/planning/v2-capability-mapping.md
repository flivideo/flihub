# FliHub v2 — Capability Mapping

**Date**: 2026-08-18
**Lens**: `~/dev/ad/brains/video-editing-as-code/capability-inventory.yaml` (36 capabilities, 60 provider bindings)
**Viewer**: https://claude.ai/code/artifact/152eaeff-4aa7-495d-83fe-204f7b89025c

**What this is**: FliHub reviewed *through* the capability inventory rather than on its own terms. The
question is not "what does FliHub do" but "which inventory rows does it provide, which does it consume,
and which does it duplicate" — so v2 scope falls out of gaps rather than out of a wishlist.

**Method note**: FliHub's code and `CONTEXT.md` were **read, not run**, in this pass. Every FliHub
binding added to the manifest is therefore `reachable-untested`, and every quality cell is `?`. That is
the inventory's rule, not a judgement about FliHub — the validator rejects a grade without evidence.

---

## The headline finding

**The inventory was entirely made of *transformation* capabilities. FliHub is mostly *coordination*, and
that had no altitude at all.**

Six verbs came out of the mapping that the pipeline could not file:

| Verb | Spans | FliHub entry point |
|---|---|---|
| Watch a location for new arrivals | capture → ingest | `server/src/WatcherManager.ts` — 9 chokidar watchers → Socket.io |
| Detect a finished render | render → publish | `server/src/utils/finalMedia.ts` (FR-33) |
| Name and file a deliverable | capture → ingest | `shared/naming.ts` — filename *is* the metadata store |
| Move assets between machines | ingest → edit → render | `server/src/routes/relay.ts` — rsync, bidirectional |
| Track a project's state across tools | capture → publish | stage inference + `projectStageOverrides` |
| Synchronise code and project repos | edit → publish | `server/src/routes/sync.ts` (B044) |

These are not badly-named transformations. Every other row **changes an artefact** and therefore sits at
one pipeline stage. These **move work between stages** and belong to none.

**The fix was a second axis, not a ninth stage.** A `coordinate` stage would be wrong: a stage is a
*position in the pipeline*, and these verbs are orthogonal to position. Rows now carry
`kind: transformation | coordination`, and coordination rows declare `spans:` instead of pretending to
occupy a stage. The validator rejects a coordination row without `spans`.

**All six are provided by FliHub alone.** That concentration is the real finding: the arsenal has many
things that transform an artefact and exactly one thing that moves work between them.

---

## The four-way mapping

### 1. FliHub is the provider

| Row | Binding | Note |
|---|---|---|
| All six **coordination** rows above | FliHub | Sole provider in the inventory |
| `generate-proxy` (new, transformation) | `server/src/utils/shadowFiles.ts` | ffprobe + ffmpeg `scale=-2:{res}`. A thin wrapper, not a novel capability. |

⚠️ **`detect-finished-render` is not `export-to-nle`.** Export detection *observes* that a render
finished; it does not perform an export. Binding it to `export-to-nle` would have been the easy wrong
answer — the row stays with Gling's ffmpeg sidecar and DaVinci's Python API.

### 2. FliHub is a consumer

FliHub consumes `transcribe-speech` (mlx-whisper) and, at the seam with Gling, the whole
edit-stage cluster (`cut-silence`, `detect-bad-takes`, `remove-filler-words`, `join-clips`). Its Gling
integration is **folder + clipboard + human drag — no code injection.** FliHub is prior art for the
autopilot *watcher* only (`gling-puppeteer/docs/HANDOVER.md` finding 7).

### 3. Rows no provider covers → proposed and added

Six coordination rows plus `generate-proxy`. Now in the manifest; brain page and viewer regenerated.

### 4. FliHub duplicates a row served better elsewhere ⚠️

**`transcribe-speech`.** `server/src/routes/transcriptions.ts` spawns
`~/.pyenv/shims/mlx_whisper` **directly** — its own invocation of the same model the canon tool wraps.
It therefore does not get:

- the repetition-hallucination suppression flags (`--condition-on-previous-text False
  --compression-ratio-threshold 2.0`), and
- the `<stem>.health.json` sidecar carrying `repetition_share` / `longest_run`.

That failure mode was **measured at 10 of 21 files in one real batch** (`models-in-use.md`). FliHub is
exposed to it and has no detector. This is the clearest deletion case in v2.

---

## Ranked v2 scope

### Rank 1 — Stop reimplementing a graded provider *(deletion)*
Replace FliHub's own `mlx_whisper` spawn with a call to `~/bin/transcribe`. Deletes a code path, inherits
the suppression flags and the health sidecar, and removes a silent-corruption exposure. Smallest change
with the largest correctness gain.

### Rank 2 — Own the coordination rows deliberately *(identity)*
Nothing else in the arsenal holds these six. They are not FliHub's incidental plumbing — they are the
only thing of their kind. v2 should treat them as the product and name them as such.

### Rank 3 — Fix the heuristic that is documented as wrong *(correctness)*
`CONTEXT.md` records that stage inference is a filesystem guess, that manual overrides are the escape
valve, and that overrides **accumulate silently and are never auto-cleared**. A `track-project-state`
provider whose state quietly drifts undermines every consumer of it.

### Rank 4 — Reach the `not-wired` and `none` bindings *(new capability)*
From the inventory's own gaps, in order of payoff:
- **DaVinci Resolve — `none`, despite an official Python/Lua API.** Flagged in `app-readiness.md` as the
  biggest unclaimed win in the stack: no reverse engineering, no update hazard, no grey area. FliHub
  already detects the finished render; driving the NLE is the adjacent step.
- **RobustVideoMatting — `not-wired`.** Measured good (clean silhouette, burnt-in graphics ignored at
  0.0/255) but the weights and venv were lost with a scratchpad. ⚠️ **GPL-3.0** — copyleft bites on
  *distribution*, so if it is embedded in a shipping FliHub, use **BiRefNet (MIT)** instead.
- **`reframe-aspect` — `designed`, never built.** ⚠️ The safe-zone model *inverts* between 9:16 and 16:9.

### Rank 5 — Do not build *(explicit non-scope)*
Anything in the edit cluster. Gling's algorithm is ~777 readable lines, but reimplementing it is a
separate decision with a licence question attached — see `brains/gling/gling-capability-palette.md`
§ *Port vs automate*.

---

## ANSWERED — FliHub is the control plane

**FliHub is the control plane. The capability inventory is the service layer.** FliHub is not a peer
provider listed in the inventory; it is the thing that *calls* the inventory. Recorded 2026-08-18.

That reframes v2. The question stops being "what is FliHub" and becomes **"what should FliHub stop
holding privately?"** — a migration, not a classification.

**The precedent already exists in the codebase**, which is the strongest argument that this is the right
frame rather than a nice idea:

```
fligen/server/src/tools/flihub/client.ts
  → GET {FLIHUB}/api/system/health
  → GET {FLIHUB}/api/query/projects/{code}/transcripts?chapter=&segments=&include=content
```

**fligen already calls FliHub over HTTP.** A second tool is already treating FliHub as a service. The
transcript query is the template every extraction below should copy.

---

## ⚠️ Correction to the extraction premise

The working assumption was that these functions are "reachable only from inside FliHub." **That is wrong,
and the real gap is different and more interesting.**

All three candidates already have HTTP routes:

| Function | Existing endpoint |
|---|---|
| Proxy / shadow generation | `POST /api/shadows/generate`, `/generate-all`, `GET /api/shadows/status` |
| Export detection | `GET /api/query/export` |
| Naming / parsing | no endpoint of its own — a shared library imported by **9** route files |

**The blocker is not missing HTTP. It is ambient state.** `shadows.ts` handlers take `_req` — the request
object is unused. They operate on the **active project read from `server/config.json`**, not on arguments.
You cannot ask FliHub to make a proxy of *an arbitrary file*; you can only ask it to make proxies for
whatever project it currently thinks is active.

**So extraction here means removing the implicit project context, not adding a transport.** That is a
smaller job than a rewrite and a different job from the one originally scoped.

---

## Ranked extraction list

Test applied to each: *would another tool or agent plausibly want to call this?* A candidate with no
identifiable second caller is not a candidate.

### 1. Proxy / shadow generation — EXTRACT

| | |
|---|---|
| **Current entry point** | `POST /api/shadows/generate` — no parameters; acts on the active project. Logic in `server/src/utils/shadowFiles.ts` (ffprobe + ffmpeg `scale=-2:{res}`, libx264). |
| **Standalone would look like** | `POST /api/media/proxy { input, resolution }` → output path. Arbitrary file in, proxy out, no project context. |
| **Second caller** | **Dam'It R12 — "Generate thumbnail + low-res proxy on ingest"** (`brains/damit/requirements-v2.md`). A documented requirement in a different product. Dam'It also models `master / proxy / export / transcript` as a first-class asset role (R9), so it needs this repeatedly, not once. |
| **Cost** | **Low.** `shadowFiles.ts` already takes explicit paths internally — the project-scoping lives in the *route*, not the utility. This is mostly a new thin handler over existing code. |

### 2. Export detection — EXTRACT

| | |
|---|---|
| **Current entry point** | `GET /api/query/export` — project-scoped. Logic in `server/src/utils/finalMedia.ts` (FR-33). |
| **Standalone would look like** | `GET /api/media/final?roots=<a>,<b>` — search roots passed in rather than derived from FliHub's project layout. |
| **Second caller** | **`gling-puppeteer`'s autopilot watcher.** `docs/HANDOVER.md` finding 7 names `finalMedia.ts` as prior art — i.e. a second consumer that today would **copy the code** rather than call it. Extraction converts a planned duplication into a call. |
| **Cost** | **Low–medium.** The scan order (`final/` → `s3-staging/` → root) *is* FliHub's project convention, so a general version must accept the roots. The version-parsing and segment-detection logic transfers unchanged. |

### 3. Naming / parsing — DEFER, no confirmed second caller

| | |
|---|---|
| **Current entry point** | `shared/naming.ts`, imported by 9 route files. Already a shared library; the extraction would be *publishing a package*, not adding a route. |
| **Second caller** | **None found.** Dam'It models asset *roles*, not this `{chapter}-{sequence}-{name}-{tags}` convention. No fli sibling imports it. `fligen` calls FliHub's transcript API, not its naming. |
| **Verdict** | **Not a candidate yet**, by the stated test. The convention is also deeply FliHub-specific (Postel's-law parsing, the NFR-65 pure-number rule) — generalising it before a second caller exists would be speculative. Revisit if Dam'It adopts the convention. |

### 4. Transcription — not an extraction, a deletion *(unchanged, still rank 1 overall)*

The direction is reversed: FliHub should **stop owning** a spawn and **call** `~/bin/transcribe`. It
currently invokes `~/.pyenv/shims/mlx_whisper` itself and therefore misses the repetition-suppression
flags and the `health.json` sidecar for a failure mode **measured at 10 of 21 files**.

### Confirmed control plane — do not extract

Verified against the same test; none has an identifiable second caller, and each is orchestration *across*
other functions rather than a function itself:

- **watch-for-arrivals** — a watcher is only meaningful with somewhere to route the event
- **track-project-state** — the 9-stage lifecycle is FliHub's own model, and its heuristic is documented
  as unreliable; exporting it would export the unreliability
- **sync-repos** — per-repo git locking is orchestration by definition
- **move-assets-between-machines** — ⚠️ the closest call. rsync-between-machines *is* generic, and a
  standalone version is imaginable. But no second caller exists today, and the relay's value is the
  per-subfolder sync-state model (`synced/ahead/behind/diverged`) which is bound to the project layout.
  **Stays control plane, flagged for revisit.**

---

## The `fires_via` consequence

If v2 commits to the control-plane role, FliHub becomes the thing that **reads the manifest at runtime** —
routing work to whichever provider serves a row, choosing on grade, cost and locality. At that moment the
inventory's substitution claims stop being documentation and become a live routing table:
`fires_via: none` → `fires_via: check`, and the manifest becomes infrastructure rather than a brain file.

**Does v2 commit? In principle yes — the control-plane answer above makes it the only coherent
destination. But `fires_via` stays `none` until something actually reads the manifest.**

Flipping it on the strength of an intention is exactly the failure the field exists to prevent: an
enforced rule and a never-enforced one must not look identical on the page. The flip is a consequence of
shipping the reader, not a declaration of intent to ship it.

---

## Still open — and not mine to close

The **Gling port decision** remains open and is David's alone. Reading the algorithm sits inside the
posture; shipping any of it does not. See `brains/gling/gling-capability-palette.md` § *Port vs automate*.
