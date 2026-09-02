# Handover — Talking to FliHub and the microphone

**Written:** 2026-08-27 · **Repo:** `/Users/davidcruwys/dev/ad/flivideo/flihub`

You are querying FliHub and its microphone-monitoring data. **Do not write application code.**

---

## 1. The skill

Load the **`flihub`** skill. It covers projects, recordings, transcripts, chapters, images, inbox
and — added 2026-08-26 — **MicCheck**.

The MicCheck reference is `/Users/davidcruwys/dev/ad/appydave-plugins/flivideo/skills/flihub/miccheck-command.md`, registered
in that skill's `SKILL.md` Quick Reference. **Read it before answering anything about microphone
levels.**

FliHub must be running: `lsof -i :5101 | grep LISTEN`. If not:
`cd ~/dev/ad/flivideo/flihub && overmind start -D`.

## 2. Endpoints

```
GET http://localhost:5101/api/query/miccheck/live          run in progress
GET http://localhost:5101/api/query/miccheck/sessions      finished reports, newest first
GET http://localhost:5101/api/query/miccheck/sessions/:id  one full report
```

Reports persist to `~/.flihub/miccheck/<id>.json` — **global, not per-project**, because the mic and
the room outlive any project. Each carries `projectCode` so a report can still be attached to a take.

## 3. ⚠️ Read `/live` as THREE states, never two

Collapsing them produces confidently wrong advice.

| `active` | `measurable` | What to say |
|---|---|---|
| `false` | `false` | *"MicCheck isn't running. Open the Mic Check tab, press Start monitoring."* |
| `true` | `false` | **Quote `reason` verbatim. Do NOT advise on gain.** |
| `true` | `true` | Safe to advise. |

`reason` is always populated when `measurable` is false. Two you will see often:

- `"Run is in ROOM mode…"` → he is measuring background noise **on purpose**. Not a problem.
- `"Only room tone is present…"` → he must **TALK**. Never read this as "level is low, turn gain up"
  — that would tell him to amplify his fans to the target.

**`shortTermLufs: null` means NOT MEASURABLE, not quiet.** Never infer a level from a null or a
missing field.

## 4. Interpreting the numbers

Capture targets, **not** delivery targets — `audio-clean` applies make-up gain later.

| Field | Green | Meaning |
|---|---|---|
| `shortTermLufs` | −26…−20, centre **−23** | the number the gain knob moves |
| `samplePeakDbfs` | ≤ −6 | guard. **NEVER a target**; a low peak is not a reason to raise gain |
| `driftLu` | under ~3 | spread quietest-to-loudest. Large means he **MOVED**, not gain |
| `clipCount` | 0 | unrecoverable |
| `measurableTickCount` | — | if **0**, NOTHING was measured — say so plainly |

Advice for a low reading: *"turn the GAIN knob up ~N dB"*, N = −23 − `shortTermLufs`, rounded to
whole dB. **The QuadCast has NO software volume control** — the physical front knob is the only gain.

## 5. Always read `not_measured`

Before answering *"is everything fine?"*. It names each metric Phase 1 did not measure, with the
reason. **Absence is not success.** Phase 1 always omits SNR, spectrum, proximity, sibilance, pops,
polar pattern, integrated loudness, PLR and true peak — plus `systemProcessingProbe` when the probe
was never run.

## 6. Two data caveats

- **Sessions recorded between commits `458b78e` and `87293e4` are unusable as records.** Mode was
  stuck at `room` with no UI to leave it, so they show many ticks, **0 gradeable**, and a run of
  spurious `room-contaminated` events. Check `modes seen` before trusting an old report.
- **The store was cleared at the end of that build session**, so there may be no reports on disk yet.
  If `sessions` returns an empty list, say **the store is empty** — do NOT report it as
  *"no problems found"*.

## 7. Measured reference values

2026-08-26, mac-mini-m4, HyperX QuadCast:

```
room tone   -61.5 LUFS integrated, peaking 250 Hz (fan/HVAC)
speech      -39.0 and -40.2 LUFS
PLR         20-29 LU   (healthy spoken word is 11-15)
device      48 kHz fixed, 2 ch, 16-bit, hog mode -1 (shared)
```

The macOS **default** input is `krisp microphone` (virtual, denoised) — but **Ecamm records DIRECT
from the QuadCast**, and MicCheck pins it by `deviceId`. His recordings do **not** pass through Krisp.

## 8. Model choice

This session runs **Sonnet**: the work is applying a documented lookup procedure, not open design.
The judgement it *does* need — the three-state rule above — is written down explicitly rather than
left to inference.

## 9. Done condition

Answer the question from **real data fetched now**, and state explicitly what the data does not cover.
