---
title: FliHub — North Star
created: 2026-08-26
status: DRAFT — awaiting David's live-usage narration (B475 stream 2) and the final audit reports
source: B475 + 203-commit archaeology + 27-agent audit + 8 months of voice corpus + the running app
supersedes: docs/prd/flihub-v2-requirements.md and docs/prd/flihub-baku-spec.md (April 2026) — see §8
---

# FliHub — North Star

> **Read §1 and §2. If those two are wrong, nothing after them matters.**

---

## 1. The sentence

David, correcting an agent that had got it wrong, 19 Aug 2026:

> "Ecamm is definitely capture. Why? Because firstly it can record videos, it can also hook into a
> Stream Deck so we can change scenes. I run it, I drive it personally from a foot pedal. So I start
> and I stop. **The moment I stop it goes into a folder and that's the moment that FliHub kicks in.
> It captures it and puts it into a queue of videos... And I might not like that video so I'll record
> another one and another one and another one. And this is what FliHub does really well — it captures
> all that, then when I'm ready I pick one of them and I say promote it, it becomes the project video...
> it goes into a specific subfolder and file name and that's it.**"
>
> "normally this is a **watcher application**. It watches the Ecamm folder and it routes, and then
> other tabs in that application do different things."

**The North Star sentence:**

> ## FliHub watches the folder, routes every take into the video's queue, holds all of them, helps you know which one is good, and promotes the one you pick.
>
> ### Everything else is a tab.

That last clause is David's, and it is the scope rule. A tab is allowed to exist. A tab is not allowed
to define the app, outrank the spine, or block a rebuild of it.

### Independently ratified, in another repo, a week earlier

This sentence is **not this audit's inference.** `~/dev/ad/apps/teletubby/docs/open-questions.md` §Q5
— *"Scope boundary with FliHub ✅ answered 2026-08-19"*, interviewed and ratified with David — states it
almost word for word, and corrects an earlier wrong assumption to get there:

> The old assumption here — *"FliHub owns capture, storage and stitching"* — was wrong... **Ecamm Live
> owns capture**, driven by David personally (foot pedal to start/stop, Stream Deck for scenes). When he
> stops, a file lands in a folder. **FliHub is a watcher** on that folder: it routes each take into a
> queue of takes for that video, creating the queue if none exists, and **holds every attempt** — record,
> dislike, record again is the normal loop, and holding all of them is what FliHub does well. When David
> is ready he **promotes** one and it becomes the project video.

Two teams, two repos, two independent processes, one sentence. The only clause this audit adds is
*"helps you know which one is good"* — which comes from the later recording the same day
(19 Aug, 09:32) where David rules that transcription must move to queue time so agents can score takes.
That is a superset, not a disagreement.

**Treat §1 as settled.** The open questions are in §9, not here.

### Corollary — what makes a tab acceptable

*Added 2026-08-26 after MicCheck Phase 1 shipped hours after this rule was written, giving it an
immediate live test.*

"Everything else is a tab" is a scope rule, not a prohibition. The failure in v1 was never the **count**
of tabs — it was their **coupling**. Measured in this audit: props threaded through a 922-line `App.tsx`,
zero React context, four independent `groupByChapter` implementations, 15 hand-rolled modals with five
different backdrops, and a `components/shared/` where only 8 of 41 files had more than one consumer.
Each tab reached into shared state and reimplemented selection, filtering and modals.

**MicCheck is the counter-example, and it is instructive.** Measured at `7553b9b`:

| Module | Imports |
|---|---|
| `client/public/miccheck-worklet.js` | **none** |
| `client/src/hooks/useMicAnalyser.ts` | React only |
| `client/src/utils/micGrading.ts` | one, from its own hook |
| `client/src/components/MicCheckPage.tsx` | React + its own modules |
| `client/src/App.tsx` | **+17 lines**. No server work. |

**Zero coupling to the spine** — *at `7553b9b`.* The capability was cleanly separated from the surface,
so moving it to Teletubby's `SetupPanel` would have been close to free.

> ⚠️ **That window closed the same day.** Commit `80a51f9` gave MicCheck a server API:
> `server/src/routes/miccheck.ts` (165 lines), `routes/query/miccheck.ts` (109),
> `utils/micCheckStore.ts` (314), **+125 lines in `shared/types.ts`**, three socket events
> (`miccheck:started|tick|finished`), reports persisted to `~/.flihub/miccheck/<id>.json`, and a
> `miccheck-command.md` registered in the machine-wide `flihub` skill.
>
> The measurement above is left standing rather than rewritten, because the *sequence* is the finding:
> **a feature was portable for roughly four hours and then was not.** Nobody decided to couple it; the
> coupling arrived as the natural next commit. This is the same gravity that grew v1's eleven tabs —
> observed live, at hour resolution, in an app whose rebuild was being planned in parallel.
>
> Relocating MicCheck is now a migration with a wire format, a persisted store, socket events, a shared
> type surface and an external skill contract attached. That does not make it wrong to live in FliHub —
> it makes the question **expensive to reopen**, which is precisely why the North Star tries to settle
> placement before the third commit rather than after.

**The rule, restated:** a tab may exist when it is an island — self-contained, testable alone, and
removable without touching the spine. A tab may not exist when it reaches into shared state, re-derives
project identity, or reimplements a primitive. Judge tabs by their **import graph**, not by their number.

### And a fifth "failure looks like success"

`useMicAnalyser.ts` pins the microphone by `deviceId` and **refuses virtual devices**, because the macOS
default input is `krisp microphone` — which denoises *before* anything downstream sees the audio. A plain
`{audio: true}` would have produced a confident, entirely fake noise-rejection result with no outward
sign of being wrong.

That is the same defect class as L12 (the lying preview), L14 (the class emitting no CSS) and L15 (the
config writer dropping keys) — except this time it was **caught prospectively**, before shipping. The
same discipline appears twice more in that commit: *"GREY never falls back to green"* (room tone reads
"no speech detected", not red), and Phase 1's limits stated in the UI rather than assumed.

**Promote this to a v2 principle:** every input FliHub trusts — the watch folder, the microphone, the
config file, a transcript, a relay directory — needs an *"am I actually getting what I think I am
getting?"* check. Absence and success must never render identically. This audit found four cases where
they did; the tooling to prevent a fifth already exists in the codebase and should be generalised.

---

## 2. Why a rewrite, and why now

FliHub is not failing. 203 commits, ~64k LOC, six live consumers. The reason to rebuild is that
**four separate forces have moved out from under it**, and each one invalidates a founding assumption.

| # | What moved | Founding assumption it breaks |
|---|---|---|
| 1 | **The suite arrived.** Van Dam/DAMMIT takes assets, Hyperframes takes editing/overlays, Teletubby takes the script, FliLaunch took chapters/titles/thumbnails/publishing. | FliHub was "everything a video project needs". Six of its nine tabs now have a better owner elsewhere. |
| 2 | **Agents became first-class users.** Six systems already call FliHub over HTTP; FliHub calls two more outbound. | FliHub was a UI with an API bolted on. It is already a service and nobody wrote the contract down. |
| 3 | **Takes became data, not files.** Transcription, Jaccard scoring, denoise, diarisation, SNR and VAD all now exist as capabilities *around* FliHub. | A take was a filename. It is now a scored, transcribed, comparable object. |
| 4 | **The operator changed.** Jan and Mary edit; agents act; David directs. | One operator, one machine, one active project. |

David's own framing, 14 Aug 2026:

> "I think the next few applications I make over the next couple of months are really just redoing
> FliHub, redoing this Joy footage, calling it Van Dam, using agents wherever possible, and **making
> it so that you and Mary can use them**, because it's all automation."

---

## 2b. The acceptance test — and a stance that constrains the rebuild

### The measure
Era 1 gives the only *measurable* justification FliHub has ever had. David, demoing live, Feb 2026:

> "these videos were all about me building this actual application, and it was such a wonderful
> experience for me to sit down and generate an application that solved a problem for me of releasing
> videos quicker. **To the point that theoretically I've doubled or tripled my ability to be a
> YouTuber. Because I can produce videos quicker.**"

> **The acceptance test for every rebuild decision: does it raise videos-shipped-per-week?**

Naming, chapters, stages, relay, storage, scoring — all of it is instrumental to throughput. If a
proposed feature cannot be argued back to that number, it is a tab (§1).

### Bespoke is a stance, not an apology
Said in the same session, to a room of other developers:

> "**this application is pretty much of no use to anyone in this room.**"

immediately after:

> "every time we need an application to solve our bespoke problem, we'll just create it."

**This is on the record as a deliberate position, and it constrains the rebuild.** Any drift toward
generality, multi-tenancy, or "other people could use this" contradicts it.

Distinguish carefully — these are not the same thing:
- **Multi-tenant** (other users, other orgs) — *explicitly rejected.* Do not build for it.
- **Multi-brand** (David's own AppyDave / Kybernesis / AITLDR / Beauty & Joy) — *required.* From Apr 2026:
  *"FliHub is my video editing platform, appydave happens to be one of the brands that we would use with
  it. We haven't got the others set up at all."* And it is already breaking: a Kybernesis project
  currently sits inside the `v-appydave` folder (§9.4).

### A naming correction that matters
Despite the name, **FliHub is not the hub of the suite.** Era 1, verbatim:

> "FliVideo is a main system for me. It's an umbrella in which I've got **FliGen, FliHub, FliDeck, and
> Storyline**."

**FliVideo** is the umbrella; FliHub is one child among four (now more).

**But naming hierarchy is not functional role — and I initially drew the wrong conclusion from this.**
See §2c.

---

## 2c. FliHub is the control plane

*Reconciled 2026-08-26 with `docs/planning/v2-capability-mapping.md` (authored 2026-08-18, eight days
before B475 — prior work this audit did not know about until it landed mid-session).*

That document maps FliHub through the 36-capability inventory at
`~/dev/ad/brains/video-editing-as-code/capability-inventory.yaml` and reaches a conclusion this audit
did not:

> **FliHub is the control plane. The capability inventory is the service layer.** FliHub is not a peer
> provider listed in the inventory; it is the thing that *calls* the inventory.

The evidence is strong and independent of anything here. The inventory turned out to be **entirely
transformation capabilities** — every row *changes an artefact* and therefore sits at one pipeline
stage. Six verbs would not file:

| Verb | FliHub entry point |
|---|---|
| Watch a location for new arrivals | `WatcherManager.ts` — 9 chokidar watchers |
| Detect a finished render | `utils/finalMedia.ts` |
| Name and file a deliverable | `shared/naming.ts` |
| Move assets between machines | `routes/relay.ts` |
| Track a project's state across tools | stage inference + `projectStageOverrides` |
| Synchronise code and project repos | `routes/sync.ts` |

These **move work between stages** and belong to none. **All six are provided by FliHub alone.**

### Correcting this document

An earlier draft of §2b concluded *"it is a station, not a switchboard."* **That was wrong.** It
inferred a functional role from a naming hierarchy. FliVideo is the product-family *name*; FliHub is
functionally the *coordinator* within it. Both are true at once.

And the two framings agree at the mechanism level, which is the real check: **every verb in the North
Star sentence — watch, route, hold, promote — is a coordination verb, not a transformation.** §1 was
already describing a control plane; it just called it something else.

### What actually changes

The rebuild question shifts from *"what is FliHub"* to **"what should FliHub stop holding privately?"**
— a migration, not a classification. §5.1 (one API, n unprivileged clients) is the mechanism for it, and
the precedent already exists in the codebase: `fligen/server/src/tools/flihub/client.ts` already calls
FliHub over HTTP.

**What stays control plane** (verified in that document as having no identifiable second caller):
watch-for-arrivals · track-project-state · sync-repos · move-assets-between-machines *(flagged for
revisit — rsync-between-machines is generic, but the relay's per-subfolder `synced/ahead/behind/diverged`
model is bound to the project layout)*.

**What should be extracted:** proxy/shadow generation, export detection. Naming/parsing: defer — no
confirmed second caller.

---

## 2d. The three UX laws

These recur across all three eras and are the closest thing FliHub has to design DNA.

**Law 1 — Show me the data where I already am.** Stated three times, three contexts, most bluntly:

> "**Please don't create a separate file anywhere. Please don't just figure out a table and have that
> hidden. I just want to see the list of broken links.**"

Corollary: no report files, no hidden tables, no "go to this other screen to see the result".
Act on the thing where the thing is visible.

**Law 2 — One action, one click.** Collapse multi-step workflows into a single operation. This is the
one principle the April v2 spec got right and it should survive verbatim.

**Law 3 — State over deletion.** Nothing is destroyed by accident; things *move* (`-safe/`, `-trash/`,
hold, archive). This becomes load-bearing when agents are callers (§5.2).

### The one surface he actually loves
Worth protecting by name. It is the only FliHub screen praised in the entire corpus, and it is praised
in **both** era 1 and era 3 — eight months apart:

> "we go to the Watch, we can see all the videos I was recording... and you can see the transcript
> going on down below, like **the transcript is playing through** at the moment." *(Feb 2026)*

> "if you ever looked at the FliHub video general tool, we have this **wonderful video playback
> capability with transcript and highlighted keywords**. We almost want the same sort of thing."
> *(Apr 2026, specifying FliLaunch)*

**The transcript-synced player with keyword highlighting is FliHub's crown jewel.** Rebuild it first,
and make it the surface where take-picking happens (§5.4, §5.5).

---

## 3. What FliHub is — and is not

### Is
- **A watcher.** The Ecamm folder is the input. Nothing else starts the loop.
- **A take queue.** Many attempts per intended segment. Holding all of them *is* the value — David
  records "another one and another one and another one".
- **A judge's bench.** It should make the good take obvious. Today it guesses from length and recency.
- **A promoter.** One take becomes the project video, at a canonical path and name.
- **An assembler.** Many short promoted takes become one video. *(Recurring want, 11/16/19 Aug.)*
- **An event source.** Other apps subscribe; they do not poll and do not reach into the filesystem.

### Is not
- Not the capture tool — that is **Ecamm** (foot pedal, Stream Deck).
- Not the asset manager — that is **Van Dam / DAMMIT**.
- Not the editor — that is **Hyperframes** ("in FliHub we don't do hyperframes or editing").
- Not the teleprompter/script tool — that is **Teletubby**.
- Not the publisher — that is **FliLaunch** (titles, thumbnails, description, YouTube).
- Not a database. The filesystem stays the store — but see §5.1, because *how* it is the store must change.

### The unresolved boundary (needs David's ruling)
He has argued both sides, five days apart:

> "In FliHub we don't do Hyperframes or editing, we just do joining, and then we export through to Gling."
>
> "But there's a lot of stuff you could edit directly in FliHub... **we could cut that one segment at
> the beginning and have a clean thing ready directly in FliHub.**"

**Proposed ruling:** FliHub may perform *destructive-free trims at take boundaries* (topping and tailing
a take), because that is take management. It may not perform *composition* (overlays, effects, beats) —
that is Hyperframes. The test: if it changes which frames of a take survive, FliHub can do it. If it
changes what is drawn on top of them, it cannot.

---

## 4. The founding bet, and the bill it ran up

Genesis (Dec 2025) chose: **the filesystem is the database, and the filename is the primary key.**
No `Project` entity, no `Recording` entity, no ids, no migrations.

That bet bought enormous early speed — a working app in two weeks, no schema to fight. It should be
respected, not sneered at. But the audit priced it, and the bill is specific:

| Cost | Measured |
|---|---|
| **No identity survives the editor handoff.** FliHub sends segments out, gets a finished video back, and must *guess* the mapping to recover chapter timestamps. | `chapterExtraction.ts` — **779 lines** of trigram/Sørensen-Dice/Jaro fuzzy matching, plus `llmVerification.ts` calling Claude to adjudicate when it fails. |
| **Path knowledge leaked everywhere.** `shared/paths.ts` describes structure but never creates it. | **39** `ensureDir`/`mkdir` sites across 14 modules; **58** sites in 20 files join hardcoded folder literals bypassing `getProjectPaths`; `recording-shadows/` isn't in `ProjectPaths` at all yet is referenced at **44** sites and rebuilt by hand in **14** files. |
| **Filename parsing forked.** | **15** ad-hoc filename regexes outside `naming.ts`, disagreeing on strictness — which one you get depends on which endpoint you hit. |
| **Per-project state went global.** Stage lives in `server/config.json` as one flat map. | **17 of 36** entries (47%) point at folders that no longer exist. All 14 `shelved` entries are stale, because shelving means *moving*, so a shelved project can never be observed. `shelved` is a write-only stage. |

**The rule for v2:** keep the filesystem as the store. Give every project and every take a **stable id
that survives leaving the machine**. The filename stays human-meaningful; it stops being the primary key.

---

### Live confirmation — 26 Aug 2026, the same morning this audit ran

A parallel `flihub-fix-bugs` session shipped four commits while this audit was being written. **Three of
them are the same root cause**, arrived at independently, without knowledge of this document:

| Commit | Symptom | Cause |
|---|---|---|
| **FR-155** Ecamm dual mode *(documented, not built)* | Dual mode writes a folder-per-take with a landscape **and** a vertical `.mov`. `GET /api/files` returned `[]` with both files on disk. | The naming convention has **exactly one slot per recording**. A take with two renditions has nowhere to live. |
| **FR-156** delete recording | Renaming fans one take across **5 files in 3 folders** (`.mov` + 240p shadow + `.json`/`.srt`/`.txt`). `POST /api/trash` moves one path, so it would delete the `.mov` and orphan four. | No id binds the set. `findRecordingArtifacts()` has to **re-derive** it by string-matching basename + known extensions + hardcoded folder names. |
| **`fix(watcher)`** `*.mov` → `*.{mov,mp4}` | `audio-clean` emitted a cleaned `.mp4`; it never appeared in Incoming. | The cleaned file is a **rendition of an existing take**, but nothing pairs them — post-fix it surfaces as an unrelated new take. |

**FR-155's own spec states the problem in the model's own terms** (`docs/prd/fr-155-ecamm-dual-mode-ingestion.md`):

> "Recursing the glob is a one-line change and is **not** the hard part. The hard part is that dual mode
> yields **two files per take**, and FliHub's naming convention has exactly one slot per recording... a
> decision is required before any code is written."

Its four options (ignore the vertical / tag it as a variant / treat it as a shadow / make it a second
recording) are all workarounds **inside** the filename-as-primary-key model. The working position —
*"vertical is a derivative, not a recording"* — is the best of them and should ship if v1 needs it now.

**Under §4's rule the decision does not arise.** A take is an entity; it has N renditions (landscape,
vertical, 240p shadow, cleaned `.mp4`); the filename is a human-readable label on each rendition, not the
identity. FR-155, FR-156's fan-out and the watcher's pairing gap collapse into one model.

### The cost, measured over three hours

This audit found `recording-shadows` **absent from `shared/paths.ts`** and hand-constructed in **14
non-test files**. After the morning's four commits: **17**.

The debt grew while the code got *better* — those commits carry live verification, 1,255 passing tests,
and a `dryRun` that shares one server-side discovery path with the real operation specifically so the
warning cannot drift from what moves. That is careful engineering. The structural number still went up.

**This is the clearest available argument for rebuilding rather than repairing:** the flaw is not
reachable by doing the current work well.

---

## 5. Architectural commitments

### 5.1 One API, n unprivileged clients
David, 19 Aug, endorsing the `drivable` doctrine:

> "External control surface: one API, n clients — user interface, command line interface, model context
> protocol interface are **equally unprivileged adapters holding no business logic**... the capability
> living in the user interface process is not extendably reachable, so script editing can't be a button
> that also contains the logic."

This is not aspirational. It is already half-true and unmanaged, and today's code actively prevents it:

- **105 of 156** route handlers call `fs.*` directly in the handler body. There is no layer between HTTP and disk.
- **50 of 156** handlers are scoped by an implicit server-global mutable "current project", with no
  parameter saying which project they act on. A CLI, an MCP client and the UI would fight over one global.
- **45 of 156** routes are RPC-shaped (last segment is a verb). *(The first audit said 69; the
  adversarial pass could not reproduce that and measured 45. The shape is pervasive; the number 69 is not defensible.)*
- `utils/responses.ts` has **0 importers**. `AppError` has **0 uses**. `next(err)` appears **0 times** —
  the error middleware is dead; **131 of 156** handlers hand-roll try/catch, and **at least 51** return errors as HTTP 200.

**Commitment:** business logic lives in a core the adapters call. Project identity is a **parameter**,
never a global. The UI gets no privileged path.

### 5.2 Safety is not optional
> "An agent can call a destructive [action] 50 times in three seconds, and safety is not optional —
> that's directly why you flagged versioning."

Every destructive operation is versioned, reversible, and rate-aware, because the caller may be a machine.
The existing instincts here are good and must survive: `-safe/`, `-trash/`, "state over deletion", the
5-gate hold chain, `safeDelete`'s six validated steps.

### 5.3 Events out, not polling in
> "Teletubby shouldn't be storing the videos, because that's FliHub's job. But Teletubby should be able
> to read, and be told as an event, that hey — new video hit FliHub, in queue, it's been transcribed by
> FliHub, here's the transcript... **the Teletubby application can receive events from FliHub, but the
> Teletubby agent can decide what to do with those events.**"

FliHub emits domain events (`take.queued`, `take.transcribed`, `take.scored`, `take.promoted`,
`video.assembled`). Consumers subscribe. No consumer reaches into FliHub's filesystem. Today: three
independent sync/realtime mechanisms exist (socket, Relay/rsync, Sync Hub/git) with no shared abstraction,
and FR-147 named the flaw then explicitly declined to fix it.

### 5.4 Transcribe at queue time — by delegating, not by owning
> "Transcription does not happen until you place the video you like into the FliHub project. **That's
> going to change** — because firstly I think transcription should happen the moment the video hits the
> queue, because there's a lot of stuff the agents could do in FliHub to decide which is the better video."

This one change unlocks the spine. It moves FliHub from *"you pick a take"* to *"FliHub helps you pick"*.

**And it should delegate, not own.** `docs/planning/v2-capability-mapping.md` ranks this its #1 v2 change:
replace FliHub's own `mlx_whisper` spawn with a call to the canon tool `~/bin/transcribe`. That deletes a
code path, inherits the suppression flags and health sidecar, and removes a *measured* silent-corruption
exposure. FliHub's worker predates the canon tool by ~3 months — this is sequencing, not criticism.

The two rulings compose: **transcribe at queue time, by calling the canon tool.** Queue-time is *when*;
delegation is *who*. This audit supplied the first; the capability mapping supplied the second.

### 5.5 Take scoring replaces the length-and-recency heuristic
Today's colours are, in David's words, *"deterministic... a probability score that something is good if
it's the last one, the latest. I'm going to get rid of stuff that's just short."*

v2 scores against the **script**, using signals already proven outside FliHub:
- **Jaccard similarity** vs the intended paragraph — a read-vs-improvise detector. Measured: a read take
  scored ~1.0 shared vocabulary; improvised takes 0.13–0.19. Target for "said it in their own words": ≥0.9.
- **Cadence** — *"I speak in 11-word things and he writes in 7-word things."* Cadence mismatch, not
  vocabulary, was the real signal.
- **Failure markers** — *"you ever notice me say 'fuck it'? That's signal that something is not quite
  right, and if you've got the transcript the agent can see that signal and tag it as a bad take."*

### 5.6 One project is a parameter, not a mode
"One active project at a time" is a *UI convenience* that leaked into the server as a global. v2: the UI
may show one project at a time; the core must never assume it.

---

## 6. The user is no longer only David

Three classes, all first-class:
1. **The talent** (David, recording). Gets the ruling on anything subjective — *"the talent gets the choice."*
2. **The editors** (Jan, Mary — Tailscale-only, Philippines). *"Making it so that you and Mary can use them."*
   The relay layer exists for them; today it is one of three uncoordinated sync systems.
3. **The agents** (Teletubby, Vicki, Brand Dave commands, FliGen, FliVoice, FliLaunch). Already six live
   HTTP consumers. *"None of them are sub-agents really. These are all top-level agents. They have real
   roles in the organisation."*

---

## 7. Recurring wants — the ledger

Every item below was asked for **more than once** across the 8-month corpus. Recurrence is the evidence.

| # | Want | Status today |
|---|---|---|
| 1 | Transcribe at queue time, so agents can score takes | Not built — transcription happens at promote time |
| 2 | Agent-drivable without the GUI | Partially — query API exists, but 50 handlers depend on a global |
| 3 | One API, n unprivileged clients | Not built — 105/156 handlers touch `fs` directly |
| 4 | Assemble many short takes into one video | Partially — chapter concat via ffmpeg exists |
| 5 | Trim a take in place (top and tail) | Not built |
| 6 | Per-take overlay suggestions ("do you want a beat?") | Not built |
| 7 | Emit events other apps subscribe to | Not built — sockets are internal-only |
| 8 | **Keyboard control** | **Barely** — only Escape/Enter/Shift/arrows/space, almost all inside modals. No navigation, selection, or promote shortcut exists anywhere. |
| 9 | Config change without an app restart | Not built — *"That kills the loop"* |
| 10 | Start/stop the app without burning tokens in Claude | Not built — fleet-level problem |

**On #8**, which B475 called out specifically: the memory of extensive keyboard work is not supported by
the code. The commits and the live app agree — the keyboard surface is nearly empty. If David remembers
building more, the audit needs to hear it, because the evidence says otherwise.

---

## 8. Relationship to the April 2026 v2 specs

`docs/prd/flihub-v2-requirements.md` (1,004 lines) and `docs/prd/flihub-baku-spec.md` (1,419 lines) were
written 2026-04-08/12 — four days before the last commit, and they are *why* the repo went quiet.

**They must not be used as the build brief.** Their opening instruction is:

> *"Replicate what works faithfully. **Don't strip features** — this is a well-engineered, mature application."*

That is the opposite of B475. Concretely, they:
- preserve all eleven tabs, one-active-project, and the global `config.json` that this audit finds structurally wrong;
- list eight "v2 improvements", all cosmetic (bigger stage pills, a progress bar, collapsible config sections);
- contain no version of "one API, n unprivileged clients", no take scoring, no event emission, no queue-time transcription;
- were generated from **50 commits** when the repo had **193** — missing the genesis and expansion eras entirely,
  which is precisely where the constraining decisions were made.

**Use them for exactly one thing:** they are the most complete *feature inventory* that exists. Mine them
for "what does this app currently do" — and nothing else.

---

## 9. What is still open

1. **The trim boundary** (§3) — proposed ruling needs David's yes/no.
2. **Shelved: state or move?** (§4) — the app was built for one and David does the other.
3. **Does the suite own the tabs?** Assets, Thumbs, Inbox — do they move to Van Dam/DAMMIT, or stay?
4. **Multi-brand.** A Kybernesis project currently lives inside the `v-appydave` folder. Brand needs to
   become a modelled attribute, not a directory. Note this is *multi-brand for David*, not multi-tenant —
   see §2b, where multi-tenancy is explicitly off the table.
5. **What David finds while using it today** — B475's second input stream, still open.
