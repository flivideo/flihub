# FR-160: Per-take container A/V delta, measured at ingest

**Status:** Designed, awaiting David's go (2026-09-01). Feeds FliCut **FC-16**.

## Problem

Ecamm source recordings carry a per-file container offset between the audio and video
streams. When FliCut joins takes, the sync error changes at every segment join, so one global
correction is a compromise. FC-16 needs each take's offset **as data**, captured when the take
arrives — not reconstructed from a finished cut.

## Positive control (2026-09-01)

Two tools, two codebases, same numbers — the spread is real, not an artefact of either:

| take (d01 ch01) | `ffprobe` a:0 `start_time` − v:0 `start_time` | `av-sync.py probe` (relayed) |
|---|---|---|
| 01-1 | **+31.7 ms** | within +20.0…+41.7 |
| 01-2 | **+20.0 ms** | " |
| 01-3 | **+20.0 ms** | " |
| 01-4 | **+41.7 ms** | " |

Half a frame of spread (at 25 fps, one frame = 40 ms) across four takes of one chapter.

## The measurement

```
ffprobe -v error -select_streams a:0 -show_entries stream=start_time -of csv=p=0 <file>
ffprobe -v error -select_streams v:0 -show_entries stream=start_time -of csv=p=0 <file>
delta_ms = (audio_start − video_start) × 1000, 1 dp
```

FliHub already spawns `ffprobe` for duration (`server/src/utils/shadowFiles.ts`
`getVideoDuration`); this is the same family. **No `av-sync.py` dependency.**

## Semantics — the honesty rules

- **It is a measured container delta, never a verdict.** A well-behaved remux resamples audio
  to match and legitimately reports 0. So **0 ≠ "in sync"** and **non-zero ≠ "out of sync"**.
  Its value is comparing originals against pipeline output. Field name says so.
- **`null` = not measured. Never store 0 for "unknown".**
- **Originals only** (`recordings/*.mov`, incl. `-safe`). **Never shadows** — the `.mp4`
  remux would read 0 and poison the comparison.
- **No UI, no judging, no correction.** FliHub measures and stores; FliCut applies; the
  person decides the final number ("an agent cannot hear, so it cannot judge sync").
- **Provenance is explicit.** `measuredAt` is set when measured; a backfilled value carries
  `measuredAt` later than the file's own arrival AND `source: 'backfill'` vs `'ingest'` so the
  two provenances never look identical on the page.

## Storage

`.flihub-state.json` → `recordings[filename]`:

```json
"01-1-what-kybernesis-actually-builds.mov": {
  "containerAvDeltaMs": 31.7,
  "avDeltaMeasuredAt": "2026-09-01T…Z",
  "avDeltaSource": "backfill"
}
```

`RecordingState` gains the three optional fields. The `recordings` map is preserved wholesale
by `writeProjectState`, so no allowlist change (unlike FR-157's top-level fields).

## Where it runs

1. **Ingest** — in the rename handler that moves a file into `recordings/`
   (`server/src/routes/index.ts`), after the move succeeds: probe, write state,
   `source: 'ingest'`. Failure to probe → leave `null`, log — never block the rename.
2. **Backfill** — `POST /api/projects/:code/av-delta/backfill` probes every original without a
   value (`source: 'backfill'`), returns `{ measured, skipped, values }`. One-off for d01's
   existing recordings (37 at time of writing); idempotent.

## Surface

- `/api/recordings` rows: `containerAvDeltaMs: number | null`
- `/api/query/projects/:code/recordings` (json + `?format=text` column) — the FC-16 read path.

## Provenance / decision log

Who said what matters here, because a relayed instruction and a first-hand one look identical
on the page.

- **The measurement itself — David's direction**, as relayed by the orchestrator session
  (2026-09-01; his text in his own message to it, not a quote inside someone else's):
  > "FliHub still gets a piece, and a cheap one: probing takes before they're joined.
  > Catching +20 vs +41 ms at ingest is much cheaper than reconstructing it from a finished
  > cut. That's a measurement on recordings — squarely FliHub's model, one probe, no UI."

  Status: **direction given, direct confirmation pending** — the build waits on David's own
  "go" in the FliHub session, because it is a server change.
- **Backfill all existing recordings, not forward-only — orchestrator's ruling**, scope of the
  already-directed measurement (reasoning: every chapter FC-16 exists to fix is already
  recorded; forward-only would have no data for ten of twelve chapters; cost is ~37
  read-only ffprobe calls).
- **Provenance must be explicit — orchestrator's condition**; the typed
  `avDeltaSource: 'ingest' | 'backfill'` field is this session's implementation of it (an
  enum cannot decay into ambiguity the way an inferred timestamp comparison can).
- **Two-tool positive control** — this session, unprompted: raw `ffprobe` vs `av-sync.py`'s
  independently noted spread agree, so the spread is a fact, not an artefact of either tool.
