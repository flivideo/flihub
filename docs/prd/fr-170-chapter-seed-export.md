# FR-170 — Chapter Seed Export for FliCut

**Status: Pending — write-up only (2026-09-04), not authorised to build.**
**Blocked on FR-169** (word-level timestamps) for the part that makes it worth doing.

## The finding that motivates it

**Everything gets transcribed twice.** FliHub has all 13 D02 takes transcribed; FliCut
re-transcribes every take on ingest with mlx-whisper, because the handoff today is a bare
folder path carrying no transcript data. Duplicated compute — and two DIFFERENT transcripts
of the same audio, with FliCut's copy being the one that drives cutting.

## What FliHub can serialise today

Per chapter: number, name slug, FR-157 title when set, the take list. Per take: transcripts
in three forms (**segment-level** — word timestamps only after FR-169; the export must state
per-take which grain is present, not assume), and durations. Natural shape: one JSON handed
over via a query endpoint or a file dropped beside the recordings.

## What it is NOT

Not a build queue for FliCut integration — FliCut's accept-door is **FC-30 (P2)** in the
flicut repo, written independently and explicitly blocked on the FliHub half (FR-169 + this).
The dictionary reconciliation question lives in FR-169.

## Cross-references

- FR-169 (blocker): [fr-169-word-level-timestamps.md](fr-169-word-level-timestamps.md)
- FR-168 (`ships` field — tells FliCut how many runs to expect):
  [fr-168-ships-field.md](fr-168-ships-field.md)
