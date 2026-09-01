---
purpose: Six candidate videos for the bulk-analysis (12-prompt) ALS workflow design session with Nick. Selected on 2026-05-10.
created: 2026-05-10
---

# Bulk-Analysis Candidates — Six Picks

## Selection criteria

A project qualifies if it's at a point where bulk analysis is meaningful — i.e. it has enough recorded substrate to analyse, but isn't already published.

Filter applied:
- `stage !== 'published'`
- `transcriptPercent === 100` (full transcript coverage)
- `transcriptSync.orphanedCount === 0` (no drift)
- `chapterCount ≥ 3`
- intro chapter present (`01-*-intro|opening|hook`)
- outro chapter present (final chapter labelled `outro|wrap|cta|close`)

31 of 76 projects qualify. Sort: pinned-first, then by transcript count (proxy for substantive content).

## The six

| # | Code | Stage | Chapters | Transcripts | Pinned | Notes |
|---|---|---|---|---|---|---|
| 1 | `b71-bmad-poem` | first-edit | 16 | 121 | ⭐ | Largest substrate; `hasFinal:true` already — closest to publish-ready |
| 2 | `b81-dam-command-line` | recording | 10 | 31 | ⭐ | Pinned, clean recording |
| 3 | `b76-vibe-code-auto-chapters-opus-4.5` | recording | 8 | 23 | ⭐ | Pinned |
| 4 | `b72-opus-4.5-awesome` | recording | 6 | 20 | ⭐ | Pinned |
| 5 | `b73-vibe-code-ecamm-line-opus-4.5` | recording | 7 | 17 | ⭐ | Pinned |
| 6 | `b70-ito.ai-doubled-productivity` | recording | 5 | 14 | ⭐ | Pinned |

All six are pinned. Together they span 17–121 transcripts, giving the workflow a range of input sizes to test prompt behaviour against. `b71` is an outlier in scale and edit-progress — useful as the "heavy" test case.

## Why these and not others

- **Excluded `c32-bmad-v6-epic1-foundation`** despite 71 transcripts: not pinned, lower priority signal from operator
- **Excluded `b97-poem-epic-2` / `b93-poem-epic-1`**: in `first-edit` but not pinned; deprioritised vs. the pinned set
- **Excluded all 14 `published`**: bulk analysis on already-shipped videos is a different workflow (channel intelligence / retro analysis), out of scope today

## What this set is for

Designing the **12-prompt bulk-analysis ALS workflow** with Nick. Goal: per-project `analysis-record.md` per the ALS shape Nick will define, persisted independently from any launch session.

Not for: actually running the workflow today. Today is about workflow shape, record contract, and operator gates.
