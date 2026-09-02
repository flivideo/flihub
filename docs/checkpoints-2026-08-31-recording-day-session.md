# Checkpoint — fix-it session, recording day 2026-08-30/31

Session role: live fix-it support while David recorded `d01-kybernesis-12-videos`.
Everything below is committed and pushed on `main` as of this checkpoint.

## Shipped (all verified against the running app, not just tests)

| Commit | What |
|---|---|
| `0277aea` | Seeded `docs/kdd/` (Captain's Log shape); migrated + deleted old `docs/learnings.md`; CLAUDE.md mandates capture via `appydave:lisa` |
| `b58fa13` | FR-157: project + chapter YouTube titles persisted in `.flihub-state.json`; PUT endpoints; query API surfaces them |
| `ccea5d6` | FR-157: converged the THREE independent chapter-name derivations (Recordings view, chapters query, POEM payload) on one server helper |
| `9ebb4ed` | FR-157: name and title BOTH shown (name primary, title secondary); titles editable in place (`InlineTitle`); project title beside "Project Recordings" |
| `ff0bb92` | InlineTitle saves on click-away, not just Enter (blur used to discard silently) |
| `93174d2` | FR-158: right-edge Chapters/Help/DAM flyouts click-to-open; invisible ~300px hover strip removed (three-dots menus were unreachable) |
| `a60dc4c` | FR-159: stale `recentJobs` entry no longer silently vetoes re-transcribe after delete+re-record; `/queue` skips carry a reason; truthful toast |
| `c298d6a` | CLAUDE.md Operating Rules: refusals must be visible; live-instrument rule |

## State that must not be re-derived wrongly

- **Transcriptions: 0 pending / 37 is REAL** — it got to zero via the FR-159 fix draining
  02-1, 02-2, 08-1 on 2026-08-31 ~09:24. A future zero is not automatically healthy: the
  pre-fix UI showed "2 pending" for four days while presses were silently vetoed.
- **Chapter 03's mangled name is a RENAME ACCIDENT, not a generator bug.** Diagnosis (only
  established in this session): new name typed IN FRONT of the previous name in the inline
  editor, silently clipped to exactly 50 chars by `sanitizeName()`'s `.slice()`
  (`shared/naming.ts:334`). No generator concatenates slugs, so chapters 11–12 are not at
  automatic risk — but the silent clamp is still there; a clamp that rejects instead of
  slices would prevent a repeat. Files on disk still carry the mangled name
  (`03-*-why-agents-need-governed-memorywhy-ai-pilots-becom.*`); David has not asked for a
  file rename; the persisted chapter TITLE is correct and independent of it.
  Fossil: orphan transcript trio `03-1-why-ai-pilots-become-dead-ends.*` in
  `recording-transcripts/` — safe to delete, never requested.
- **Project titles seeded**: project = "Agents That Actually Hold Together" (orch's playlist
  guess, David never explicitly confirmed the wording); chapters 01–05 have YouTube titles;
  **chapter 06 (`what-an-orchestrator-agent-does`) and later have none yet.**

## Designed and WAITING on David — do not re-design

1. **Take-quality marks (Incoming screen)** — full design reported to David 2026-08-31:
   3 states (best/reject/neutral), ★/✕ chips per card, user click beats the FR-8 heuristic,
   verdict persisted through rename into `.flihub-state.json` as `take?: 'best'|'reject'`
   (remember `writeProjectState`'s allowlist). Open sub-question put to David: should
   reject change the Discard affordance or stay informational.
   Also established: same-target renames do NOT collide (server rejects + sequence
   auto-increments) — the orch's suspected bug is not a bug.
2. **Re-transcribe confirm** — "if a transcript already exists, ask before re-transcribing".
   Requested by David via orch; not designed beyond the sentence; explicitly queued BEHIND
   the FR-159 fix (which shipped), awaiting his go.

## Known facts for the next session

- Server runs under Overmind (`overmind ps`; PIDs client 56919 / server 56940 this session);
  nodemon recycles 5101 on any `server/src/` save — announce first on recording days
  (CLAUDE.md Operating Rules).
- `start.sh` has an UNCOMMITTED working-copy change (David's): the EXIT-trap version that
  CLAUDE.md documents. The committed version differs. Left alone deliberately.
- Untracked and left alone: `.screenshots/*`, `AGENTS.md`, `docs/triage-*.md`,
  deleted `.claude/scheduled_tasks.lock`.
- `~/.config/appydave/apps.json` flihub entry is wrong on three counts (start_script,
  ports.client null, "no client UI" note) — cross-repo, reported to David twice, not fixed.
- `~/dev/ad/appydave-plugins/flivideo/skills/flihub/SKILL.md` predates FR-157/159: says chapters are SRT-derived,
  lacks the title endpoints. Outside the repo; David's call.

## Single next action

When David returns: get his go (or edits) on the two waiting features above — the take-marks
design message and this file contain everything needed to build without re-investigation.
