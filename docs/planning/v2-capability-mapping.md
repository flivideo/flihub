# FliHub v2 — Capability Mapping

**Date**: 2026-08-18
**Lens**: `~/dev/ad/brains/video-editing-as-code/capability-inventory.yaml` (36 capabilities, 60 provider bindings)
**Viewer**: https://claude.ai/code/artifact/152eaeff-4aa7-495d-83fe-204f7b89025c

**What this is**: FliHub reviewed *through* the capability inventory rather than on its own terms. The
question is not "what does FliHub do" but "which inventory rows does it provide, which does it consume,
and which does it duplicate" — so v2 scope falls out of gaps rather than out of a wishlist.

**Revised 2026-08-18** — transcription reframed as delegate-vs-pattern-adopt after verifying the
sequencing; the two cheap measurements written out with method and honest cost.

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

### 4. FliHub holds a row the arsenal later grew a canon provider for ⚠️

**`transcribe-speech`.** `server/src/routes/transcriptions.ts` spawns
`~/.pyenv/shims/mlx_whisper` **directly** — its own invocation of the same model the canon tool wraps.
⚠️ **This predates the canon tool by ~3 months and is not a design error** — see *Transcription* in the
extraction list for the verified sequencing. It therefore does not get:

- the repetition-hallucination suppression flags (`--condition-on-previous-text False
  --compression-ratio-threshold 2.0`), and
- the `<stem>.health.json` sidecar carrying `repetition_share` / `longest_run`.

That failure mode was **measured at 10 of 21 files in one real batch** (`models-in-use.md`). FliHub is
exposed to it and has no detector. This is the clearest deletion case in v2.

---

## Ranked v2 scope

### Rank 1 — Delegate transcription to the canon tool *(deletion)*
Replace FliHub's own `mlx_whisper` spawn with a call to `~/bin/transcribe`. Deletes a code path, inherits
the suppression flags and the health sidecar, and removes a **measured** silent-corruption exposure.
Smallest change with the largest correctness gain, and no decision needed.

Not a criticism of the original: FliHub's worker predates the canon tool by ~3 months. The alternative —
adopting the flags without delegating — is written up as Option B under *Transcription* in the extraction
list, along with the machine-dependency check and why delegation still wins.

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

## The two cheap measurements

Both convert `?` cells in the capability inventory into graded ones. Neither spends credit. **Do the
second one first** — it is cheaper and more certain.

### A. Static trace of the six `EnhancementType` values — DO THIS FIRST

**What it settles.** Six `?` cells in the manifest: `jumpCutZoom`, `audioDenoise`, `bRoll`,
`speechEnhancement`, `aiStudio`, `smartCaptions`. For each, nobody knows whether it computes
**server-side or client-side** — and that single fact decides whether L1 can reach it at all. The enum
lives in `packages/server-client`, which *hints* at server involvement and proves nothing: the core cut
flow is demonstrably client-side despite identical packaging.

**What you actually do.** Follow each enum value through the reconstructed study tree at
`~/dev/upstream/repos/gling-study/current` until it lands in either a REST call or a renderer module.
Grep, read, record. Same method that answered the `packages/takes` question.

**Honest cost.** Reading only — no credit, no app running, no network, nothing installed. An hour or two
of grep-and-read, and the tree is already extracted at 1.53.2. **This is the cheapest and most certain
measurement available**, and it resolves six cells rather than one.

### B. Silence A/B against `auto-editor`

**What it settles.** Whether the palette's row 2 (cut silence) is genuinely unique or simply replaceable.
Gling cuts on a **fixed 0.5-second gap between word timestamps** — it reads the transcript. `auto-editor`
cuts on a **dB threshold** — it hears quiet. The real question is whether *reading* beats *listening* in
practice, and no amount of code-reading answers it.

**What you actually do.** Take one clip containing both deliberate dramatic pauses **and** genuine dead
air. Cut it both ways. Compare which pauses survived: a dramatic pause that Gling keeps and `auto-editor`
removes is the whole case for the row.

**⚠️ Honest cost — higher than "an hour", and the earlier estimate was wrong.** Two reasons:

1. **`auto-editor` is `not-wired`** in the inventory — cloned, never run. The estimate assumed a tool
   that has never been invoked once. Budget install, first-run and parameter-fumbling before any
   comparison starts.
2. **The Gling side cannot run headless.** The cut is client-side, so this runs *through the app*, by
   hand, with a plan-minutes transcription first.

Call it a half-day with a real chance of a snag, not an hour. Still cheap for what it settles — but it is
the more expensive of the two and it should go second.

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

### 4. Transcription — neither an extraction nor a rewrite

⚠️ **Sequencing correction — FliHub did not duplicate a mature system, it predates one.** Verified from
the repos:

| | Date |
|---|---|
| FliHub's transcription path fixed to the pyenv shim | **April 2026** (`CONTEXT.md`, generated 2026-04-08) |
| `~/bin/transcribe` symlink created | **2026-07-09** |
| `voice-analysis` brain makes it canon | **2026-07-25** |

FliHub's worker is roughly **three months older** than the tool it is now measured against. **The
duplication is an artefact of sequence, not a design error** — there was nothing to delegate to when it
was written. Earlier wording in this doc read as a criticism of a decision nobody made; it isn't one.

"Rewrite" is also the wrong word and inflates the cost. There are two distinct options that have been
collapsing into one item:

**Option A — delegate to.** FliHub stops owning transcription and shells out to `~/bin/transcribe`.

- Deletes the spawn; inherits the `--condition-on-previous-text False --compression-ratio-threshold 2.0`
  suppression flags and the `<stem>.health.json` sidecar **for free**
- Any future improvement to the canon tool arrives with **no FliHub change**
- **Cost: one route file** (`server/src/routes/transcriptions.ts`)
- **Creates a hard dependency** on the tool being installed wherever FliHub transcribes

**Option B — observe the patterns of.** FliHub keeps its own invocation but adopts what the mature tool
proved: the two suppression flags, plus writing a health sidecar it can then act on.

- Keeps FliHub self-contained — no new dependency
- **Keeps the duplication**, so the next fix must be applied twice
- Fixes today's known failure mode and leaves FliHub to rediscover the next one

**The dependency check, done rather than assumed:**

| Machine | `~/bin/transcribe` | `mlx_whisper` shim |
|---|---|---|
| Roamy (this machine) | ✅ present (Jul 9) | ✅ |
| mac-mini-m4 | ✅ present (Jul 9) | ✅ |
| mac-mini-jan / mac-mini-mary | ⚠️ **could not check** — SSH key auth refused from Roamy | ⚠️ unknown |

⚠️ **Permission-denied is not evidence of absence.** Jan's and Mary's machines are unverified, not bare.

But `CONTEXT.md` resolves it from the other side: **transcription is a `recorder`-role function.** A
`recorder` machine sees incoming recordings, naming and transcription; an `editor` machine sees
relay-collect, shadow previews and edit-delivery. The editor machines do not transcribe, so the
dependency lands only on recorder-role machines — **and both verified recorder machines already have the
tool.**

**Recommendation: Option A, delegate.** The dependency that made B attractive largely evaporates once
role scoping is accounted for. Decisive point: **only delegation removes the measured exposure
permanently.** Pattern-adoption fixes the *known* failure mode — repetition-hallucination, measured at
**10 of 21 files** — and leaves FliHub to rediscover the next one on its own, three months late, exactly
as happened this time.

⚠️ **Confirm before shipping A**: that no `editor`-role machine ever triggers transcription (the
"Transcribe All" slide-out, FR-151, is the path worth checking), and that Jan's and Mary's machines are
provisioned if any does.

**Three systems in this arsenal touch transcription, and only one is canon:**

1. **`~/bin/transcribe`** — canon (`voice-analysis` brain)
2. **FliHub** — its own `mlx_whisper` spawn
3. **Captain's Log** (`~/dev/ad/apps/captains-log` + the `captains-log` plugin) — a separate
   transcript-capture backlog with its own server and MCP surface

**Whether Captain's Log and FliHub should both delegate to the same tool is worth recording, not
answering here.** It is a wider convergence question than v2 scope, and Captain's Log has not been read
in this pass.

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
