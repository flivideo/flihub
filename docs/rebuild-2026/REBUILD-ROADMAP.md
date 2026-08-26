---
title: FliHub Rebuild — Long-Horizon Roadmap
created: 2026-08-26
status: DRAFT — for David's review; sequencing is a proposal, not a decision
source: B475 + the rebuild-2026 audit
companion: NORTH-STAR.md (what we are building), DEAD-ENDS-AND-PAIN.md (what not to repeat)
---

# Rebuild Roadmap

## The constraint that shapes everything

From B475:

> "we'll probably do it over many sessions, because I'll probably do it as a video build-out, and as we
> build out FliHub — when I do videos around the sessions, they are section by section by section, so
> I'd like a video for each area."

**This is not a sprint plan. It is a season of episodes.** Each unit below is sized to be one build
session that yields one watchable video with a beginning, a middle and a visible payoff.

That forces three rules the plan must obey:

1. **Every episode ends with something demoable.** No "plumbing episode" whose payoff is in the next one.
   If it can't be shown working on camera, it isn't an episode — it's part of one.
2. **Episodes are ordered by narrative dependency, not just technical dependency.** The audience must be
   able to follow why this comes after that.
3. **The interesting decision goes on camera.** Each episode has a named decision (below) — that's the
   content, not the typing.

---

## Season 0 — Before any code (this session + your live usage)

| # | Deliverable | Status |
|---|---|---|
| 0.1 | The audit — archaeology, architecture, intent, live app | ✅ done, `docs/rebuild-2026/audit/` |
| 0.2 | North Star | ✅ draft, needs your §9 rulings |
| 0.3 | Your live-usage narration | ⏳ `NARRATION-GUIDE.md` |
| 0.4 | Design documents (see below) | ⏸ not started — the real gap |
| 0.5 | The five open rulings (North Star §9) | ⏸ needs you |

### 0.4 is the actual blocker

B475 asked for design documents so `/design` or Claude Design can be used. The audit found the gap is
worse than "we need mockups":

> `find . -iname "DESIGN.md" -o -iname "*style-guide*" -o -iname "*tokens*"` → **nothing**

Two full generations of design exploration happened (4 whole-app systems in Jan, 13 mockups in Mar) and
**neither produced a token spec, a type scale, a component vocabulary, or a layout contract.** The
measured consequence: **108 distinct card/container treatments across 181 instances**, 35 button colour
signatures, 6 modal scrims for 15 modals, and 153 elements applying a class that emits no CSS (L14).

So Season 0 needs **three** design artifacts, in this order:

- **D1 — `DESIGN.md`: the token + type + spacing contract.** One palette (AppyDave: cream `#faf5ec`,
  brown `#342d2d`, yellow `#ffde59` CTA, amber `#c8841a` accents; Bebas Neue / Oswald / Roboto).
  Light-only. Every token asserted at build time so an unresolvable class fails the build.
- **D2 — the component vocabulary.** Roughly 12 primitives: `Dialog`, `Table`, `Toolbar`, `Pill`,
  `Card`, `Rail`, `Indicator`, `ProgressBar`, `EmptyState`, `Field`, `Menu`, `Toast`. Named, drawn,
  and fixed *before* any page exists. The audit's clearest lesson: `components/shared/` has 41 files of
  which only **8** have more than one consumer — extraction after the fact does not produce a system.
- **D3 — the layout contract.** Two layout kinds only: *dense data view* (full-bleed) and *focused task*
  (constrained). Declared per surface, never a ternary on a tab name (L8).

**Recommendation:** D1–D3 are one design session, and it is a legitimate episode — "designing the design
system" is good content and it is the thing both previous generations skipped.

---

## Season 1 — The spine (episodes 1–5)

This is the North Star sentence, built end to end. At the end of Season 1 FliHub does its actual job and
nothing else. **Ship it and use it for real before Season 2 starts.**

| Ep | Title | What ships | The decision on camera |
|---|---|---|---|
| **1** | **The watcher and the queue** | Ecamm folder watched; every take lands in a queue for its segment; takes are held, never overwritten. Stable **take ids** that survive leaving the machine (§4 of North Star). | *"The filesystem is still the database — but the filename stops being the primary key."* This is the founding-bet reversal. Huge content. |
| **2** | **One API, three clients** | The core as a library; HTTP, CLI and MCP as three thin adapters over it, all unprivileged. Project identity is a **parameter**, never a global. | *"Why the UI gets no special privileges"* — and a live demo of doing the same operation three ways. |
| **3** | **Transcribe at queue time — by delegating** | Every take transcribed on arrival, not on promote. FliHub's own `mlx_whisper` spawn is **deleted** and replaced with a call to the canon tool `~/bin/transcribe` (ranked #1 in `docs/planning/v2-capability-mapping.md`). Queue shows transcripts as they land. | *"Why this one change is the whole redesign"* — the move from *you pick* to *it helps you pick*. |
| **4** | **The take bench** | The crown jewel rebuilt: transcript-synced player with keyword highlighting, as the surface where you compare takes and promote one. Keyboard-first (see below). | *"The one screen from v1 worth keeping"* — and the keyboard layer that was designed in Jan 2026 and never shipped. |
| **5** | **Scoring, not guessing** | Jaccard fidelity vs the script, cadence comparison, failure-marker detection ("fuck it"). Replaces length-and-recency. | *"Measuring a take"* — your own numbers: read ≈1.0, improvised 0.13–0.19; 11-word vs 7-word cadence. |

**Episode 4 carries the keyboard debt.** The audit is unambiguous: no global shortcut, no tab navigation,
no list movement, no command palette exists anywhere in v1 — while `design-3 Command Palette Minimal`
(Jan 2026) designed exactly that and was never built. Episode 4 is where it lands, and the January mockup
is the spec.

---

## Season 2 — The pipeline joints (episodes 6–9)

FliHub stops being an island. Each episode is a contract with a neighbour.

| Ep | Title | What ships | Neighbour |
|---|---|---|---|
| **6** | **Events out** (this is the control-plane migration — see NORTH-STAR §2c) | Domain events: `take.queued`, `take.transcribed`, `take.scored`, `take.promoted`, `video.assembled`. Consumers subscribe; nobody reaches into the filesystem. | Teletubby — *"Teletubby should be told as an event... the Teletubby agent decides what to do with it."* |
| **7** | **Assembly** | Many promoted takes → one video. Top-and-tail trims at take boundaries (the §3 ruling). No composition. | Hyperframes takes it from here. |
| **8** | **Deterministic project truth** | The triage endpoint from the May design: derived completion booleans + drift flags, `stage` as *intent* vs completion as *fact*. Resolve "shelved: state or move?" (§9.2). | FliLaunch, and any agent that currently re-derives state from disk. |
| **9** | **The editor relay, rebuilt once** | One synchronisation model, not three. v1 grew Relay (rsync) *and* Sync Hub (git) *and* the socket layer, and FR-147 named the flaw then declined to fix it. | Jan and Mary. |

---

## Season 3 — The tabs, judged one at a time (episodes 10+)

**Do not port these. Each gets a hearing.** For every one, the question is the North Star's: *does it
raise videos-shipped-per-week, and does anything else in the suite now own it better?*

| Surface | Likely verdict | Why |
|---|---|---|
| Assets (images/prompts) | → **Van Dam / DAMMIT** | Asset management is explicitly leaving |
| Thumbs | → **FliLaunch** | Publishing packaging already moved |
| Inbox | **keep, shrink** | It is the agent write-surface; `POST /:code/inbox/write` is a live contract |
| Chapters | **keep** | Structural to assembly |
| Transcripts tab | **absorbed by Ep 3/4** | Stops being a place you go |
| Storage / Hold / T7 | **keep, one owner** | Real need; v1 built it 3× in 8 days and deleted 2 |
| Manage (sync/relay/storage) | **dissolve** | It is a router pretending to be a tab (L7) |
| Mockups, API Explorer | **delete** | Dev scaffolding shipped in the product |
| Projects list | **keep — it is the front door** | The one design that won its exploration |

---

## What "done" means for the rebuild

Not feature parity. The April spec chased that and it is why nothing got built (§8 of North Star).

**Done = the spine works, the neighbours are wired by contract, and you shipped a video with it.**

The acceptance test never changes: *does it raise videos-shipped-per-week?*

---

## Carry-forward list — the good parts of v1

The audit was asked for flaws, so it found flaws. These earned their place and should survive:

- **React Query** as the server-state substrate — the right call; the flaw was it not being the *only* one.
- **The socket contract** (`ServerToClientEvents` / `ClientToServerEvents`) — the one genuinely enforced
  contract in the codebase. **Copy this pattern onto HTTP** rather than inventing something new.
- **State over deletion** — `-safe/`, `-trash/`, the 5-gate hold chain, `safeDelete`'s six validated steps.
  This instinct becomes *more* important when agents are callers.
- **One action, one click** — the design principle v1 got right.
- **The visualisation instinct** — confidence icons, match-method badges, divergence borders, threshold
  colouring. Dozens of them, and they are good. Keep the instinct, give it a vocabulary (D2).
- **The transcript-synced player** — the crown jewel (Ep 4).
- **`shared/naming.ts`** — a genuine domain module. It just needs to be the *only* one (L12).
- **`useVideoPlayback` and `projectFilters`** with real tests — proof the extraction instinct exists.
  It just needs to fire before a file hits 1,000 lines, not after.

---

## Risks, named

1. **Scope regrowth.** v1's tabs all arrived because FliHub "was the app that already had the filesystem
   open." The same gravity will act on v2. §1's "everything else is a tab" is the defence.
2. **The suite may not arrive — but it is arriving unevenly.** *Re-assessed 2026-08-26 against the disk:*

   | App | Status | Consequence |
   |---|---|---|
   | **Teletubby** | **Real.** 30 commits, `~/dev/ad/apps/teletubby`, started 2026-08-19. Electron. Has a ratified North Star, a `SetupPanel`, a saved `rig` model, a `CadencePanel` and a `control-server.ts`. | Episode 6 (events out) is **not speculative** — Teletubby's own North Star clause *"learn from every fumbled take"* depends on FliHub emitting take + transcript events. |
   | **Hyperframes** | Partial — a brain and test assets (`brains/video-as-code/`), no app. | Episode 7 must stop at trims; composition has no home yet. |
   | **Van Dam / DAMMIT** | **Does not exist.** No repo found. | ⚠️ **Season 3 must not move Assets out of FliHub.** There is nowhere for it to go. |

   **Mitigation, unchanged and now load-bearing:** nothing is deleted from v1 until its replacement is
   real; v1 keeps running until Season 1 is in daily use.
3. **Episode drift.** A build-out that becomes a video has pressure to look good, not to be right. The
   named decision per episode is the defence — the content is the reasoning, not the typing.
4. **Doing the audit again.** 27 campaigns produced 108 files of process exhaust and seven disagreeing
   ledgers. v2 needs *one* ledger, and campaign scaffolding must be disposable and out of `docs/`.
