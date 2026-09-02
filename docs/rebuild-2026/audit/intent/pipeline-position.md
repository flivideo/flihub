---
title: FliHub's position in the video pipeline — upstream, downstream, and the gaps
audit: rebuild-2026 / intent
author: pipeline-position agent
created: 2026-08-26
evidence_cutoff: 2026-08-26
status: evidence report — not a spec
---

# FliHub's position in the pipeline

**Scope of this document.** Not a code audit. This reconstructs the production line FliHub sits
in, from evidence on disk and in David's own words, and places FliHub in it precisely: what
arrives at its door, what must leave, and where the joints do not fit.

**Evidence discipline used throughout.** Every claim is tagged:

- **(SAID)** — David stated this as intent. Quoted, with the file it came from.
- **(COMPLAINED)** — David named this as a problem. Quoted.
- **(MEASURED)** — I ran it against the real filesystem/code. Reproducible command in the appendix.
- **(INFERRED)** — my reading. Flagged as mine, not his.

Wearable transcripts (Plaud/OMI) mangle the name constantly — *fly hub, FlyHub, fli hub, flyhub*.
Quotes are reproduced verbatim including the mangling, and including the run-on punctuation of
speech-to-text. Where a word is genuinely unrecoverable I say so rather than guess.

---

## 0. The headline

FliHub is **the take vault between the camera and the editor**. Everything else it grew —
transcription, chapters, thumbnails, S3 staging, storage tooling, git sync, the project registry —
attached to it because it was the app that already had the filesystem open.

The single sharpest statement of the boundary is David's own, from 2026-08-19, four months after
the last commit:

> "so in FlyHub we don't do hyperframes or editing we just do joining and then we export through
> to Glean"
> — **(SAID)** `/Users/davidcruwys/dev/raw-intake/plaud/2026-08-19-0932-2026-08-19-093226.md`

And the rebuild itself is his stated decision, in the same breath as describing the pipeline:

> "it is a complex set of workflows anyway we're going to rebuild fly hub from ground up anyway"
> — **(SAID)** same file

---

## 1. The pipeline, as the evidence actually draws it

Two independent reconstructions agree, and they were made by two different people six days apart.

### 1a. Jan's version (the editor, describing it back to David)

Jan is the remote editor. He states the whole line unprompted at the top of the 2026-08-19
conversation — this is the most valuable single artifact found, because it is the *downstream*
station describing the pipeline it lives in:

> "and then we're gonna have the script or the wording and then after that is gonna be the
> teletubby will come in as far as i understand it then after the teletubby you're gonna record in
> in eCAMP [Ecamm] and then the flyhub collects all the takes and we're gonna select or we're
> gonna choose on that or promote them or that take and then select we're gonna transcribe it or
> we have what we shared earlier is the audio cleanup if we needed and then we're gonna have the
> analysis of it or some feedback about it about the tape and after that we can do the video
> editing with hyperframes"
> — **(SAID, by Jan)** `/Users/davidcruwys/dev/raw-intake/plaud/2026-08-19-0932-2026-08-19-093226.md`

### 1b. David's version (the same session, expanded)

> "Teletubby probably needs an int an integration to fly hub because when you record a video the
> video goes is recorded in Ecamm it's saved to a folder structure it hits the fly hub system"
> — **(SAID)** same file

### 1c. The drawing

```
  IDEA INTAKE                    SCRIPTING              RECORDING
  ┌──────────────────┐          ┌─────────────┐        ┌─────────────┐
  │ Captain's Log    │          │  Teletubby  │        │ Ecamm Live  │
  │ AngelEye sessions│──ideas──▶│ 3-column    │──the──▶│ foot pedal, │
  │ brains / research│  fact-   │ prompter    │ talent │ Stream Deck │
  │ conversation     │  sheet   │ (Aug 2026)  │ speaks │ (M4 Mini)   │
  └──────────────────┘          └─────────────┘        └──────┬──────┘
                                       ▲                      │ .mov lands in
                                       │                      │ ~/ecamm
                                  (the return                 ▼
                                   edge — NOT   ╔════════════════════════════╗
                                   BUILT)  ◀────╢         F L I H U B        ║
                                                ║  watch folder → name →     ║
                                                ║  take queue → PROMOTE →    ║
                                                ║  recordings/ → transcribe  ║
                                                ║  → chapters → shadows      ║
                                                ╚═══╤═════════╤══════════╤═══╝
                                                    │         │          │
                       ┌────────────────────────────┘         │          └─────────────┐
                       ▼                                      ▼                        ▼
              EDITING (human)                        EDITING (machine)           PUBLISHING
        ┌──────────────────────┐               ┌──────────────────────┐   ┌──────────────────┐
        │ relay (rsync)        │               │ Gling (Electron)     │   │ FliLaunch / YLO  │
        │ → Jan, Mary (PH)     │               │ silence+filler cut   │   │ transcript+SRT+  │
        │ via Tailscale        │               │ dictionary handoff   │   │ chapters→titles, │
        │ edit-1st / edit-2nd  │               ├──────────────────────┤   │ thumbs, descrip. │
        │ → back over relay    │               │ HyperFrames          │   ├──────────────────┤
        └──────────────────────┘               │ HTML→video overlays  │   │ POEM WUI :5041   │
                                               │ (not wired to FliHub)│   │ .awb.json sidecar│
                                               └──────────────────────┘   └────────┬─────────┘
                                                                                   │
                                                                                   ▼
                                                                    ┌──────────────────────────┐
                                                                    │ YouTube                  │
                                                                    │ ↓ mirrored back down to  │
                                                                    │ published/<brand>/videos │
                                                                    │ /<YOUTUBE_ID>/           │
                                                                    │ (183 appydave, 324       │
                                                                    │  aitldr, 49 claudinglab) │
                                                                    └──────────────────────────┘
                                                                    ▲ NO JOIN KEY back to the
                                                                      project code — see §4.5
  COLD STORAGE (parallel, not a station)
  /Volumes/T7/youtube-{HOLDING,PUBLISHED,FAILS}/<brand>/  ← projects leave here and never return
```

---

## 2. Station by station — verified

### 2.1 Idea intake — real, but not wired to FliHub

**Status: live upstream, no contract.** Captain's Log (`~/dev/ad/apps/captains-log`), AngelEye
session data, and the brains exist and are used. David's own framing of the fan-in:

> "there is a fat sheet [fact sheet] gathering sort of process a research process that goes on for
> any transcript ahead of the transcript and interestingly where you get that information can come
> from three main sources ... with captain's log it could be a bunch of conversations you've had
> with angel I ... it could be a bunch of information coming in from Claude code sessions basically
> or it could just be conversational terms with the human"
> — **(SAID)** `/Users/davidcruwys/dev/raw-intake/plaud/2026-08-19-0932-2026-08-19-093226.md`

**(MEASURED)** No FliHub code path reads from Captain's Log, brains, or AngelEye. The only inbound
document channel is `POST /api/projects/:code/inbox/write` (`server/src/routes/projects.ts:726`),
and it is used by exactly **1 of 65** project folders on disk — `b72-opus-4.5-awesome` is the only
project with an `inbox/` directory at all, despite `inbox/` being documented as core structure in
`CLAUDE.md` and `CONTEXT.md`.

### 2.2 Teletubby — the scripting station. Real code, 7 days old, deliberately fenced off from FliHub

**Status: LIVE and actively developed.** Not a concept. It is at
`/Users/davidcruwys/dev/ad/apps/teletubby` (`git@github.com:appydave/teletubby.git`, jump alias
`japp-teletubby`), an Electron/AppyTron desktop app with a **control API on port 7111**, last
commit **2026-08-26 08:11** — i.e. *today*, while FliHub has been silent since 2026-04-16.

The three-column design David described on 2026-08-19 07:13 is now shipped:

> "should I be able to see the main points of the topic in our column yes should I be able to see
> the sub points in a column yes should I be able to see the paragraph of the transcript that I'm
> looking at yes in another column"
> — **(SAID)** `/Users/davidcruwys/dev/raw-intake/plaud/2026-08-19-0713-2026-08-19-071329.md`

**Why this matters to a FliHub rebuild — Teletubby has already written FliHub's job description
for it, and then ruled it un-buildable.** From `docs/open-questions.md` Q5 (answered 2026-08-19):

> "**Ecamm Live owns capture**, driven by David personally (foot pedal to start/stop, Stream Deck
> for scenes). When he stops, a file lands in a folder. **FliHub is a watcher** on that folder: it
> routes each take into a queue of takes for that video, creating the queue if none exists, and
> holds every attempt — record, dislike, record again is the normal loop, and holding all of them
> is what FliHub does well. When David is ready he **promotes** one and it becomes the project
> video, moved to its final subfolder and filename."
> — `/Users/davidcruwys/dev/ad/apps/teletubby/docs/open-questions.md`

And from `docs/requirements.md` §8, a hard ruling **against** depending on FliHub:

> "🚧 **Ruled 2026-08-19: you cannot rely on FliHub for this yet. It is all future.** The
> queue-and-promote model below is where David thinks FliHub *should go*, from one conversation
> with someone else — it is **not a contract**, and FliHub is slated for a ground-up rebuild.
> Nothing in this section may be built against today, and no acceptance criterion may depend on it."
> — `/Users/davidcruwys/dev/ad/apps/teletubby/docs/requirements.md`

**(INFERRED)** This is the most consequential fact in this report. A live, actively-built neighbour
app has *specified the integration it wants*, *verified FliHub's current source*, and *refused to
build against it* because the rebuild is coming. The rebuild has a waiting customer with a written
spec. That spec is `requirements.md §8` + `spec.md` criterion 16 (currently struck through as
BLOCKED).

### 2.3 Recording — Ecamm Live → `~/ecamm`

**(MEASURED)** `server/config.json` → `watchDirectory: "~/ecamm"`. The chokidar watcher fires
`file:new` over Socket.io. That is the entire inbound contract: **a `.mov` appearing in a flat
folder.** No metadata, no session id, no project association, no take grouping.

The `ecamm` skill (`/Users/davidcruwys/.claude/skills/ecamm/SKILL.md`) is real and capable — an
HTTP remote-control API (scene list, scene switch, go-live) plus plist read/write. **(MEASURED)**
It has **zero** connection to FliHub. Nothing in FliHub calls it; nothing in it writes anything
FliHub reads. The two systems that bracket the moment of recording do not speak.

**(INFERRED)** This is the single biggest missing upstream contract. Ecamm knows the scene, the
timestamp, and the start/stop boundaries. FliHub has to re-derive "which take belongs to what" from
file mtime alone.

### 2.4 FliHub itself

**(MEASURED)** 203 commits, **2025-12-13 → 2026-04-16**, then silence. Serves exactly one root:
`projectsRootDirectory: "~/dev/video-projects/v-appydave"`.

The naming step is the load-bearing act: `{chapter}-{sequence}-{name}-{tags}.mov`. Per
`CONTEXT.md`, "the filename *is* the metadata... Renaming the file *is* categorization."

**Transcription fires on promotion, not on arrival** — verified in code:
`server/src/routes/index.ts:254` calls `queueTranscription(newPath)` inside the rename handler.
David describes this correctly and names it as the thing that must change (§4.1).

### 2.5 Editing — three different editors, one of them human

**(a) Jan and Mary, over relay.** `relayDirectory: "~/relay/flihub-appydave"`, rsync, bidirectional,
`edit-1st` / `edit-2nd` back-channel. Jan and Mary are Tailscale-only (Philippines). This is the
only editor handoff FliHub actually implements.

**(b) Gling** — the AI silence/filler cutter. FliHub's contribution is *preparation*, not
invocation: `GET /api/edit/prep` (`server/src/routes/edit.ts`) hands out a merged global+project
dictionary and the target filename, and creates `edit-1st/edit-2nd/edit-final`. The operator then
drives Gling by hand. David wants that automated:

> "I should be able to from my FlyHub application where I might record a video I should be able to
> have it open up Glyn [Gling] with a little bit of direction from me ... if it could add the videos
> would be great but there's all sorts of other controls would be able to build on it and the
> automations just to make my life as a video editor easier that would be the main goal"
> — **(SAID)** `/Users/davidcruwys/dev/raw-intake/plaud/2026-07-11-1627-07-11-turning-gling-ai-into-a-programmable-tool-in.md`

By 2026-08-19 he had reverse-engineered it:

> "you know Glean I've reverse engineered it the code is all available I thought all the secret
> juice of Glean was on the server it's not it's actually in the app and funnily enough everything
> it does that's secret I already do in other skills"
> — **(SAID)** `/Users/davidcruwys/dev/raw-intake/plaud/2026-08-19-0738-2026-08-19-073856.md`

**(c) HyperFrames** — video-as-code (HTML compositions → rendered video). Four skills installed
(`hyperframes-core/-animation/-cli/-read-first`), plus a `video-editor` plugin with
`audio-clean` / `overlay-sheet` / `overlay-compile`. **(MEASURED)** No FliHub code path touches any
of them. David places it explicitly outside FliHub *and* immediately wants a doorway from inside it:

> "we could have a little panel over on the right of that one video that says, do you want a beat?
> Do you like, do you want something for hyperframes overlays? And you go, yeah, I do. I think I
> do. They give me three different sorts, right?"
> — **(SAID)** `/Users/davidcruwys/dev/raw-intake/plaud/2026-08-19-0932-2026-08-19-093226.md`

He also frames FliHub as the *joiner* for HyperFrames-style segmented recording:

> "if you could have recorded it as 20 seconds of snippets and then go to another area and record
> another 20 seconds of snippets and then use something like fly hub to combine them all together
> yet yeah it would save a lot of time"
> — **(SAID)** `/Users/davidcruwys/dev/raw-intake/plaud/2026-08-11-1205-2026-08-11-120508.md`

### 2.6 Publishing — two live outbound wires and one dead one

**(a) POEM WUI** — `POST /api/poem-wui/send` → `http://localhost:5041/api/workflow/intake`.
**(b) YouTube Launch Optimizer** — `POST /api/poem-wui/send-ylo` → a **Supabase edge function**
(`.../functions/v1/inbox`, bearer-token auth), payload `{store:{projectFolder, transcript,
srtContent, fliHubChapters}}` (`server/src/routes/poem-wui.ts:153`). Result comes back as an
`.awb.json` sidecar in the project folder. **(MEASURED)** 8 of 65 projects have one.

**(c) FliLaunch** (`/Users/davidcruwys/dev/ad/flivideo/flilaunch`, jump `jfli-launch`) — the repo
that the YLO workflow evolved into. Last commit **2026-05-10**. It reads FliHub as a data source,
documented at `docs/data-sources/flihub.md`, and it is explicit about the boundary:

> "**Published YouTube data** — FliHub knows nothing about post-publication state, YouTube IDs, or
> what's actually on the channel."
> "**Cross-channel data** — FliHub is currently rooted at `~/dev/video-projects/v-appydave/`. Other
> brand folders (`v-aitldr/`, `v-shared/`, etc.) exist but FliHub doesn't currently serve them."
> — `/Users/davidcruwys/dev/ad/flivideo/flilaunch/docs/data-sources/flihub.md`

### 2.7 The published archive — the loop that does not close

**(MEASURED, confirms the brief's figure)** `~/dev/video-projects/published/`:

| brand | `metadata.json` files |
|---|---|
| aitldr | 324 |
| appydave | **183** |
| claudinglab | 49 |

Shape per video: `published/<brand>/videos/<YOUTUBE_ID>/{metadata.json, thumbnail.jpg,
transcript.txt}`. `metadata.json` keys: `id, title, description, publishedAt, channelId, tags,
categoryId, duration, viewCount, likeCount, commentCount, thumbnailUrl, fetchedAt` — a raw YouTube
Data API pull, `fetchedAt: 2026-05-09`.

**There is no project code anywhere in it.** The archive is keyed by YouTube ID; FliHub is keyed by
`b65-guy-monroe-marketing-plan`. See §4.5.

---

## 3. The handoff contracts

| # | From → To | Carrier / format | Stable? |
|---|---|---|---|
| H1 | Ecamm Live → FliHub | a `.mov` file appearing in `~/ecamm`. **Nothing else.** | Stable but information-free |
| H2 | Operator → FliHub | the filename `{chapter}-{sequence}-{name}-{tags}.mov` — the sole metadata store | Stable, 1417 files honour it |
| H3 | FliHub → transcripts | MLX Whisper → `recording-transcripts/*.{txt,srt,json}`, matched to the recording **by basename** | Stable; 1345/1417 coverage |
| H4 | FliHub → editor (Jan/Mary) | rsync into `~/relay/flihub-appydave/<code>/{recordings,edit-1st,edit-2nd}` over Tailscale | Fragile — count-based diff, `diverged` has no resolution |
| H5 | Editor → FliHub | `edit-1st/` then `edit-2nd/` pushed back over relay | Semi-stable; naming has drifted (§4.3) |
| H6 | FliHub → Gling | `GET /api/edit/prep`: `{glingFilename, glingDictionary[], editFolders}` — **the operator carries it by hand** | Manual, no automation |
| H7 | FliHub → POEM WUI | `POST localhost:5041/api/workflow/intake` | Live, localhost-only |
| H8 | FliHub → YLO/FliLaunch | `POST <supabase>/functions/v1/inbox`, `{store:{projectFolder,transcript,srtContent,fliHubChapters}}` + bearer | Live; 8/65 projects used it |
| H9 | FliLaunch → FliHub | `GET /api/projects/stats`, `/transcripts?include=content`, `/chapters?format=text`, `/export?format=text`, `/recordings?missing-transcripts=true` on `:5101` | **Documented as a contract by a consumer.** Breaking these breaks FliLaunch |
| H10 | Anything → FliHub | `POST /api/projects/:code/inbox/write` | Exists; effectively unused (1/65) |
| H11 | YouTube → archive | `published/<brand>/videos/<ID>/metadata.json` | Stable, but **no key back to a project** |
| H12 | FliHub → cold storage | `/Volumes/T7/youtube-{HOLDING,PUBLISHED,FAILS}/<brand>/` | One-way. Config never cleaned up after |
| H13 | Teletubby → FliHub | *specified, not built.* Loopback control API on `:7111` exists on Teletubby's side | **Designed, then explicitly blocked** |
| H14 | FliHub → Teletubby | *specified, not built.* "take landed + here is its transcript" event | **Designed, then explicitly blocked** |

---

## 4. Where the pipeline breaks

### 4.1 BREAK — transcription happens one step too late. This is the break David names himself.

> "normally transcription does not happen until you place the video you like into the fly hub
> project that's going to change because firstly I think transcription should happen the moment the
> video hits the queue because there's a lot of stuff the agents could do in fly hub to decide which
> is the better video"
> — **(SAID + COMPLAINED)** `/Users/davidcruwys/dev/raw-intake/plaud/2026-08-19-0932-2026-08-19-093226.md`

**(MEASURED, confirms him)** `queueTranscription()` is called from the *rename* handler
(`server/src/routes/index.ts:254`, `server/src/utils/renameRecording.ts:292`) — i.e. after the
operator has already chosen. The information that would inform the choice arrives after the choice.

He is precise about what today's take selection uses instead:

> "have you ever noticed Jan that when I record four or five takes but some of them are gray some
> of them are green and one of them is green and one of them is yellow ... this is deterministic
> meaning it reads things like I'm going to give a probability score that something is good if it's
> the last one the latest I'm gonna get rid of stuff that's just short right I'm gonna look at the
> length of them so this is all deterministic but if we got the transcript on each recording ...
> you ever notice me say fuck it ... that's signal well that's signal that something is not quite
> right and if you've got the transcript the agent can see that signal and go well that's probably
> a bad ta[ke] right and tag it straight away"
> — **(SAID + COMPLAINED)** same file

**Rebuild implication:** transcribe on arrival in the watch folder, before naming. This one change
is the enabler for H13/H14 and for content-aware take selection. It is the highest-value single
item found in this audit.

### 4.2 BREAK — `stage` is app-local config, not project state, and it is measurably wrong

The triage doc's claim ("`stage` is **manually set**. It drifts from reality") is **understated**.
The real situation is worse than "manual label drifts".

**(MEASURED)** `stage` lives in `server/config.json` → `projectStageOverrides` — a flat map keyed by
project code inside the *server's own config file*
(`server/src/routes/projects.ts:187-237`, `server/src/utils/projectStats.ts:157-173`). It is **not**
in `.flihub-state.json`, and **not** in the project folder. Consequences, all measured:

1. **It does not travel with the project.** The v-appydave project folder is its own git repo
   (`git@github.com:appydave-video-projects/v-appydave.git`, 85 commits, last 2026-08-14). Stage
   is not in it. An editor machine pulling the project repo gets no stage at all.
2. **When there is no override, the "derivation" has exactly two outcomes.** From
   `projectStats.ts:166-173`: `totalFiles === 0 → 'planning'`, else `'recording'`. That is all.
   **46 of 65** project folders have no override, so 46 projects report `recording` regardless of
   whether they have `edit-1st/`, `edit-2nd/`, `edit-final/`, or a rendered `final/`.
3. **Concrete lies, measured today:**
   - `c37-agent-team-claude-bbmad` — has `final/` with video, `edit-1st/`, `edit-2nd/`, 28
     recordings → reports **recording**.
   - `c15-opus-4.6-appystack`, `c18-claude-computer-mesh`, `c20-…` — full
     `edit-1st`+`edit-2nd`+`edit-final` chains → all report **recording**.
   - `b71-bmad-poem` — override says `first-edit`, but `final/` contains video and there are 121
     recordings.
   - Eight projects marked `published` (`c02, c03, c04, c05, c06, c07, c09, b94`) have **no
     `final/` directory with video at all** — so `hasFinal` (FR-148) reports `false` for
     published work.
4. **The override map is a graveyard.** 36 overrides; **17 of them (47%) name folders that no
   longer exist** — `b59-n8n-digital-ocean`, `b64-bmad-claude-sdk`, `b67`, `b77`, `b80`, `b82`,
   `b84`, `b85-clauding-lab-intro`, `b88`, `b92`, `c08`, `c13`, `c36-archon-bmad`, `x01`–`x04`.
   Two of those (`b59`, `c36`) are sitting on the T7 SSD at
   `/Volumes/T7/youtube-PUBLISHED/appydave/`; `b64` is in `youtube-HOLDING`. `projectPriorities`
   has the same rot (2 of 2 pinned projects no longer exist on disk). Archiving a project moves the
   folder and leaves its FliHub state behind forever.
5. **The pill row shows 9 stages** (`planning, recording, first-edit, second-edit,
   ready-to-publish, published, archived, shelved, remix` —
   `client/src/constants/stages.ts` `STAGE_ORDER`), of which the system can derive exactly **2**.

**(INFERRED)** `stage` is not a state machine, it is a *sticky note*. The rebuild should either
(a) derive completion from the filesystem and let the operator record *intent* separately and
visibly, exactly as the triage handoff proposes with `stage_lags_data` / `stage_overshoots_data`, or
(b) drop the linear stage concept entirely in favour of the completion lenses. Do not carry the
9-stage pill row forward as-is.

### 4.3 BREAK — the code's idea of the folder structure does not match the disk

`CLAUDE.md` and `CONTEXT.md` both document a canonical project layout. **(MEASURED)** across all
65 project folders in `v-appydave`:

| documented folder | folders that actually have it |
|---|---|
| `recordings/` | **62** ✅ |
| `recording-transcripts/` | **61** ✅ |
| `recording-shadows/` | **56** ✅ |
| `assets/` | 28 |
| `s3-staging/` | 21 (20 non-empty) |
| `final/` | **9** |
| `inbox/` | **1** |
| `recordings/-chapters/` | (not surveyed separately; `hasChapters` is derived) |

and the folders the code does **not** name as canonical:

| undocumented folder | count |
|---|---|
| `edit-1st/` | **18** |
| `edit-final/` | **8** |
| `edit-2nd/` | 6 |
| `-trash/` | 3 |
| `edits/` | 2 (`b94`, `c16`) |
| `edit-first/` | 1 (`c11` — typo variant) |

**This falsifies item 4 of the triage handoff.** That doc asserts: *"Directory naming — 0 LOC.
Codebase is already consistent: `final/` for merged output. `edit-1st/` / `edit-2nd/` are
relay-layer concepts only... `b94`'s `edits/` is a one-off filesystem artefact, not a convention."*
On the real disk, `edit-1st/` outnumbers `final/` two to one, `edits/` occurs twice not once, and
`edit-first/` is a third spelling. FR-148's `hasFinal` — which only ever looks at `final/`
(`projectStats.ts:142-155`) — is therefore blind to where most finished work actually is.

**Rebuild implication:** the completion predicate cannot be "does `final/` have an mp4". It has to
accept the relay vocabulary, and the rebuild has to pick one spelling and migrate.

### 4.4 BREAK — one root, many brands, and the active project is in the wrong one

**(MEASURED)** `projectsRootDirectory` is hard-pinned to `v-appydave`. But `~/dev/video-projects/`
holds nine brand roots: `v-aitldr` (9 projects), `v-guy` (7), `v-voz` (4), `v-supportsignal` (4),
`v-shared` (4), `v-kybernesis` (1), `v-kiros` (1), `v-beauty-and-joy` (0), plus `v-appydave` (65).

And the smoking gun: `activeProject` in `server/config.json` is
**`d01-kybernesis-12-videos`** — a *Kybernesis* project, living inside the *appydave* folder,
because FliHub can only see one root. `v-kybernesis/` exists separately on disk and holds
`phase-1/` — the twelve scripts Teletubby is built around. The brand boundary has already been
violated to get work done.

**(MEASURED)** FliHub's project scan also has no notion of "not a video project": `catalog/`,
`poem/`, and `tools/` are three code/data folders inside `v-appydave` that FliHub lists as projects
in `planning` stage, because the filter only excludes dot-prefixed, dash-prefixed, and `archived`
(`server/src/routes/projects.ts:112-119`).

### 4.5 BREAK — the publish loop does not close: no join key

**(MEASURED)** 183 appydave `metadata.json` files keyed by YouTube ID (`To8zyO6dG3Y`). 65 project
folders keyed by code (`b65-guy-monroe-marketing-plan`). **No shared field exists.** The triage
answers doc reaches the same conclusion and names the three options (title fuzzy match / an
operator-set `youtube_id` / a manifest), and records that **none was decided**:

> "The **gap** is the join key — v-appydave projects use project codes ..., published archive uses
> YouTube IDs .... They don't share a key."
> — `/Users/davidcruwys/dev/ad/flivideo/flihub/docs/triage-answers-to-flihub-questions.md`

**(INFERRED)** This is a one-field fix that has been deferred twice. The rebuild should write the
YouTube ID into project state at publish time — FliHub already *has* an outbound publish wire
(`send-ylo`), so it is the natural place to capture the return value. Fuzzy-matching 183 titles is
solving a problem that only exists because nobody wrote the ID down.

### 4.6 BREAK — the archive is a trapdoor

**(MEASURED)** `/Volumes/T7/youtube-PUBLISHED/appydave/` holds range buckets (`a01-a49`,
`b00-b49`, `b50-b99`, …) plus loose recent codes; `youtube-FAILS/appydave/` holds 9 abandoned
projects; `youtube-HOLDING/appydave/` holds 1. The local `v-appydave/archived/` mirrors the same
bucket names. FliHub excludes `archived` from the scan.

The v-appydave repo's most recent commit is literally a manual reconciliation:
`"align repo with disk: record 11 removed projects, add 3 new ones"` (2026-08-14). **Someone has
to hand-repair the registry after archiving.**

### 4.7 BREAK — no automation at either editing boundary

- **Gling:** FliHub prepares the dictionary and the folders, then stops. The human opens Gling,
  types the filename, pastes the dictionary. **(SAID)** David wants FliHub to drive it (§2.5b) —
  and by August he had the reverse-engineering to do it.
- **HyperFrames:** no wire at all, in either direction.
- **Relay `diverged`:** `CONTEXT.md` states plainly — *"FliHub has no merge or conflict resolution
  for relay — it only detects the divergence... manually decide which side wins."* Sync status is a
  **file-count comparison, not a content hash**.

### 4.8 BREAK — a documented integration surface that consumers were told to use, and one of them was told not to

Two live consumer documents point at FliHub's HTTP API as a contract
(`flilaunch/docs/data-sources/flihub.md`, `~/dev/ad/appydave-plugins/flivideo/skills/flihub/SKILL.md`), including a health
check that starts the server if down. Meanwhile Teletubby — the newest and most active neighbour —
inspected the same surface and was ruled off it:

> "**FliHub — ruled out for now.** I verified socket.io and a transcriptions module exist in
> FliHub's current source, and was about to specify against them. **David's ruling supersedes that
> reading**: the queue-and-promote model came from one conversation about where FliHub *should* go,
> it is not a contract, and FliHub is being rebuilt from the ground up."
> — `/Users/davidcruwys/dev/ad/apps/teletubby/docs/spec.md`

**(INFERRED)** The rebuild has to decide, explicitly and once: is the HTTP surface a **published
contract** or an **internal API**? Right now it is treated as both by different neighbours, and the
difference is undocumented.

---

## 5. The scope question — what is genuinely FliHub's job?

This is the argument the rebuild turns on. Both directions, from evidence.

### 5a. The case that FliHub's job is SMALL — the take vault

**David's own boundary statement is narrow.** Twice in the same conversation:

> "in FlyHub we don't do hyperframes or editing we just do joining and then we export through to
> Glean" — **(SAID)**

> "Teletubby shouldn't be storing the videos because that's fly hubs job" — **(SAID)**
> `/Users/davidcruwys/dev/raw-intake/plaud/2026-08-19-0932-2026-08-19-093226.md`

Teletubby's answered Q5 is the same boundary written down by a second party: *watch the folder,
queue the takes, hold every attempt, promote one.* That is roughly four verbs.

**The "one app per job" plan is explicit.** David's stated architecture for the next few months is
to *split* FliHub, not extend it:

> "We're going to rebuild FlyHub, we're going to build Teletubby We're going to build something to
> work with Hyperframes, but it's probably going to be called Van Dam After the martial artist Van
> Dam, but it's going to be video asset manager video Digital asset management. We're going to
> create Dammit and Dammit is going to be digital asset management to the cloud ... these little
> applications we're going to build ... we're just going to order automate our video pipeline"
> — **(SAID)** `/Users/davidcruwys/dev/raw-intake/plaud/2026-08-19-0738-2026-08-19-073856.md`

> "the next few applications I make over the next couple of months are really just redoing FlyHub,
> redoing this joy footage, calling it Van Dam, using agents wherever possible and making it so that
> you and Mary can use them"
> — **(SAID)** `/Users/davidcruwys/dev/raw-intake/plaud/2026-08-14-0926-2026-08-14-092618.md`

**(INFERRED)** "Van Dam" is a *named successor* for the asset-management half of FliHub. If Van Dam
is real, then `assets/images/`, `assets/thumbs/`, and probably the S3/T7 storage tooling all leave
FliHub. That is a large deletion, and it is David's plan, not mine.

**Usage backs the small case.** **(MEASURED)** The three folders that are near-universal are
`recordings/` (62/65), `recording-transcripts/` (61/65) and `recording-shadows/` (56/65) — the take
vault and its derivatives. `assets/` is 28, `s3-staging/` 21, `final/` 9, `inbox/` **1**. The
features that leaked in are the features nobody uses.

### 5b. The case that FliHub's job is BIG — the only place the operator is already standing

**David keeps reaching for FliHub because it is where the video is.** In the same breath as "we
don't do editing", he asks for editing:

> "But there's a lot of stuff you could edit directly in FliHub. For instance, I do a perfect
> transcript for a segment... and then I go well that's shit because of the way I started it right
> ... If I loved that video but it's crap at the beginning, can I say no, I want to publish it so it
> becomes 3-1-overview... And then I have some agents that can look at individual videos and
> suggest, do you just want to clean this up while you're here? We could cut that one segment at the
> beginning and have a clean thing ready directly in Flyhub."
> — **(SAID)** `/Users/davidcruwys/dev/raw-intake/plaud/2026-08-19-0932-2026-08-19-093226.md`

This is not scope creep by accident — it is a coherent principle he has stated elsewhere as a UX
preference (`feedback_ux_friction`: collapse multi-step workflows into one click;
`feedback_rename_trust`: edit where the data is visible). **Trimming a bad opening off a take is a
take-vault operation, not an editing-suite operation.** It happens at the moment of judging the
take, in front of the take.

**Downstream systems have already made FliHub the source of truth.** The triage handoff's central
decision:

> "**Triage is not an ALS workflow.** It belongs in FliHub. Reason: every signal triage needs is
> filesystem-deterministic... Cleaner contract: FliHub becomes the single source of pre-calculated
> truth; ALS workflows consume that truth, never re-derive it."
> — `/Users/davidcruwys/dev/ad/flivideo/flihub/docs/triage-handoff-from-flilaunch.md`

FliLaunch's own docs list FliHub as one of three sources of truth and call it "the BI surface".

### 5c. My reading — where the line actually falls

**(INFERRED, mine.)** The two cases are not in conflict once you separate *owning a capability*
from *offering a doorway to one*. The consistent rule that fits every quote above:

> **FliHub owns the take and everything derived from the take. It owns no timeline, no composition,
> and no asset library. Where another app owns the capability, FliHub offers the doorway and the
> payload — not the implementation.**

By that rule:

| Job | Verdict | Why |
|---|---|---|
| Watch folder, queue takes, hold every attempt, promote one | **Core** | Every source agrees; Teletubby wrote it down |
| Name / renumber / split, filename-as-metadata | **Core** | 1417 files depend on it |
| Transcribe — **on arrival, not on promotion** | **Core** | §4.1; it is what makes take selection intelligent |
| Chapters, SRT, project transcript export | **Core** | Derived from takes; H9 consumers depend on it |
| Take scoring / "this take is dead" tagging | **Core, missing** | David specified it; needs 4.1 first |
| Trim head/tail of a single take | **Core (argued)** | It is judging the take, not editing the video |
| Emit events (take landed + transcript) | **Core, missing** | H14 — Teletubby's blocked requirement |
| Joining / stitching segments | **Core** | "we just do joining" |
| Relay to Jan and Mary | **Core** | Nothing else does it |
| Gling hand-off | **Doorway** | Prepare + launch; Gling owns the cut |
| HyperFrames overlays | **Doorway** | "a little panel... do you want a beat?" |
| YLO / FliLaunch publish | **Doorway** | Already is one (`send-ylo`) |
| **Image assets, thumbnails** | **Leaked → Van Dam / ThumbRack** | 28/65 and 0 near-universal use; a named successor exists |
| **S3 staging, T7 archive, storage tooling** | **Leaked → Dammit** | David named the successor |
| **Git Sync Hub (app-code + video-project channels)** | **Leaked** | This is developer tooling that lives in a creator app because the creator app was open |
| **Project registry / `projects.json` / catalog** | **Leaked** | Being hand-reconciled (§4.6); wants to be its own thing |
| **The 9-stage pill row** | **Leaked** | Derives 2 states, displays 9, drifts (§4.2) |

**The strongest single test for the rebuild:** *does this feature need the take in front of you?*
If yes, it is FliHub's. If it needs a timeline, a library, or a bucket, it is somebody else's.

---

## 6. What the rebuild inherits whether it likes it or not

1. **`{chapter}-{sequence}-{name}-{tags}.mov`** — 1417 files. Non-negotiable.
2. **Transcript matched to recording by basename** in `recording-transcripts/`. 1345 files.
3. **`recording-shadows/`** low-res proxies — 1200 files, and the only thing that makes remote
   editing over Tailscale viable.
4. **The relay folder shape** `<relay>/<code>/{recordings,edit-1st,edit-2nd}` — Jan and Mary's
   machines depend on it.
5. **The `:5101` query API** — FliLaunch (`docs/data-sources/flihub.md`) and the `flihub` skill
   both hard-code these routes. Decide loudly whether they survive.
6. **`published/<brand>/videos/<ID>/metadata.json`** — 556 files across 3 brands. Read-only truth
   the rebuild should join to, not restructure.
7. **One waiting customer with a written spec** — Teletubby `requirements.md §8` + `spec.md`
   criterion 16. It wants exactly two things: transcribe-on-arrival, and an event.

---

## Appendix A — how to reproduce the measurements

```bash
# project folders as FliHub filters them + stage truth table
cd ~/dev/ad/flivideo/flihub && python3 - <<'EOF'
import json, os
c=json.load(open('server/config.json'))
root=os.path.expanduser(c['projectsRootDirectory'])
folders={d for d in os.listdir(root)
         if os.path.isdir(os.path.join(root,d))
         and not d.startswith(('.','-')) and d!='archived'}
ov=c.get('projectStageOverrides',{})
print(len(folders),'folders;',len(ov),'overrides;',
      len([k for k in ov if k not in folders]),'orphaned')
EOF

# folder-shape frequency across all projects
cd ~/dev/video-projects/v-appydave && \
  for d in */; do ls -d "$d"*/ 2>/dev/null; done | \
  awk -F/ '{print $2}' | sort | uniq -c | sort -rn

# published archive counts
for b in ~/dev/video-projects/published/*/; do \
  echo "$b $(find "$b/videos" -name metadata.json | wc -l)"; done
```

## Appendix B — sources

**David's words (Plaud wearable, verbatim incl. STT mangling):**
- `/Users/davidcruwys/dev/raw-intake/plaud/2026-08-19-0932-2026-08-19-093226.md` — *the* pipeline
  conversation with Jan. Rebuild decision, transcription timing, Gling export, HyperFrames panel.
- `/Users/davidcruwys/dev/raw-intake/plaud/2026-08-19-0738-2026-08-19-073856.md` — the four-app
  plan (FliHub / Teletubby / Van Dam / Dammit), Gling reverse-engineering.
- `/Users/davidcruwys/dev/raw-intake/plaud/2026-08-19-0713-2026-08-19-071329.md` — the three-column
  teleprompter North Star; "where FlyHub comes in" for segmented recording.
- `/Users/davidcruwys/dev/raw-intake/plaud/2026-08-14-0926-2026-08-14-092618.md` — "redoing FlyHub
  ... calling it Van Dam ... so that you and Mary can use them".
- `/Users/davidcruwys/dev/raw-intake/plaud/2026-08-11-1205-2026-08-11-120508.md` — FliHub as the
  joiner for 20-second snippets.
- `/Users/davidcruwys/dev/raw-intake/plaud/2026-07-11-1627-07-11-turning-gling-ai-into-a-programmable-tool-in.md`
  — "from my FlyHub application ... have it open up Glyn".

**Neighbour-app documents:**
- `/Users/davidcruwys/dev/ad/apps/teletubby/{README.md,CLAUDE.md,AGENTS.md}`
- `/Users/davidcruwys/dev/ad/apps/teletubby/docs/{concept.md,open-questions.md,requirements.md,spec.md,north-star.md}`
- `/Users/davidcruwys/dev/ad/flivideo/flilaunch/docs/data-sources/flihub.md`
- `/Users/davidcruwys/dev/ad/appydave-plugins/flivideo/skills/flihub/SKILL.md`
- `/Users/davidcruwys/.claude/skills/ecamm/SKILL.md`

**FliHub's own:**
- `/Users/davidcruwys/dev/ad/flivideo/flihub/docs/triage-handoff-from-flilaunch.md`
- `/Users/davidcruwys/dev/ad/flivideo/flihub/docs/triage-answers-to-flihub-questions.md`
- `/Users/davidcruwys/dev/ad/flivideo/flihub/CONTEXT.md`
- `server/config.json`, `server/src/routes/{projects,edit,poem-wui,relay,sync}.ts`,
  `server/src/utils/{projectStats,projectState,renameRecording}.ts`,
  `client/src/constants/stages.ts`

**Live filesystem:** `~/dev/video-projects/` (9 brand roots, 65 appydave projects, 1417 recordings),
`~/dev/video-projects/published/` (556 videos, 3 brands), `/Volumes/T7/youtube-*`.

## Appendix C — what this audit did NOT establish

Stated explicitly, because absence and success look identical for several of these:

- **I did not read all 905 Plaud + 1260 OMI transcripts.** I grepped for FliHub spelling variants
  and pipeline terms. Quotes not found here may still exist. The OMI files in particular are
  Haiku-summarised, and their "Transcript" sections are lossy — I treated them as weak evidence and
  leaned on Plaud (raw) instead.
- **I did not check the 6335 `claude-sessions` or 8677 `chatgpt` raw-intake files.** A dedicated
  archaeology pass over those would likely add intent evidence, especially for Dec 2025–Apr 2026,
  the period when FliHub was actually being built. This report is strongest on **Jul–Aug 2026**
  intent and weakest on original 2025 intent.
- **I did not run FliHub.** All API behaviour is read from source, not observed. Nothing here
  proves the `:5101` endpoints currently respond as documented.
- **Speaker attribution in the 2026-08-19-0932 file is partly inferential.** Plaud does not
  diarise. I attribute the opening pipeline recital to Jan because David replies "*Alright so I'll
  just after that because I'm recording what you said anyway*" — that reading is strong but not
  proven.
- **"Van Dam" / "Dammit" are spoken names only.** No repository exists for either
  (`~/dev/ad/apps/` was listed; neither is present). They are stated intent, not code.
- **Teletubby's `:7111` control API was not exercised.** Its existence is from the repo README, not
  from a live call.
