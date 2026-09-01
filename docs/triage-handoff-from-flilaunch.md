---
purpose: Move triage out of ALS and into FliHub. Capture the decision, the proposed deterministic API surface, and the minimal-change recommendations from the FliHub gap-analysis.
created: 2026-05-10
status: design — to be implemented in FliHub later
---

# FliHub-side Triage — Handoff Doc

## Decision (2026-05-10, live with Nick)

**Triage is not an ALS workflow.** It belongs in FliHub.

Reason: every signal triage needs is filesystem-deterministic. Running it through an ALS Delamain would mean the workflow re-derives state that FliHub already computes (or could trivially compute) on the data it owns. Cleaner contract: FliHub becomes the single source of pre-calculated truth; ALS workflows consume that truth, never re-derive it.

Side effect: ALS workflows stop needing direct filesystem access for project state. They call one endpoint, get a deterministic snapshot, branch on it.

## What `stage` is, and why it isn't enough

`stage` (`planning | recording | first-edit | ready-to-publish | published`) is **manually set**. It drifts from reality:

- `b65` had `final/` directory but it was empty → `hasFinal:false` correctly
- `b71` had `stage:first-edit` but `hasFinal:true` (final is actually present)
- 14 projects sit in `stage:published` but the linkage to YouTube is title-fuzzy at best

Triage should expose **derived** completion signals alongside the manual `stage`, so consumers can ask "is this actually recording-complete?" without trusting the label.

## Proposed clean API — `GET /api/projects/:code/triage`

Per-project deterministic snapshot. No prompts, no AI — just structural truth.

```json
{
  "code": "b65-guy-monroe-marketing-plan",
  "stage": "recording",
  "completion": {
    "recording": true,
    "first_edit": false,
    "final": false,
    "published": false
  },
  "structure": {
    "chapter_count": 9,
    "has_intro": true,
    "has_outro": true,
    "chapters": [
      { "number": 1, "name": "intro",          "segment_count": 2 },
      { "number": 2, "name": "scenario",       "segment_count": 1 },
      { "number": 3, "name": null,             "segment_count": 2 },
      { "number": 4, "name": "surgeon-list",   "segment_count": 6 },
      { "number": 5, "name": "guy",            "segment_count": 2 },
      { "number": 6, "name": "test",           "segment_count": 2 },
      { "number": 7, "name": "update-claude",  "segment_count": 1 },
      { "number": 8, "name": "research-prompt","segment_count": 9 },
      { "number": 9, "name": "outro",          "segment_count": 1 }
    ]
  },
  "transcripts": {
    "total": 26,
    "percent": 100,
    "missing": 0,
    "orphaned": 0
  },
  "media": {
    "has_final": false,
    "final_is_empty": true,
    "thumb_count": 0,
    "image_count": 0
  },
  "publication": {
    "youtube_url": null,
    "youtube_id": null,
    "matched_via": null
  },
  "flags": [
    "stage_lags_data",
    "no_thumbnails"
  ],
  "last_modified": "2025-12-26T03:00:16.000Z"
}
```

### Endpoint shape options

- `GET /api/projects/:code/triage` — single project
- `GET /api/projects/triage` — all projects (array of the above), the bulk feed for ALS
- Optional query: `?completion=recording-complete,not-published` for filtering

### Completion booleans — derivation rules

| Field | True when |
|---|---|
| `completion.recording` | `transcripts.percent === 100` AND `transcripts.orphaned === 0` AND `chapters.has_intro` AND `chapters.has_outro` AND `chapter_count ≥ 3` |
| `completion.first_edit` | A merged MP4+SRT exists named after the project at the canonical first-edit location (TBD: `final/` only, or also accept `edit-1st/` from the relay layer) |
| `completion.final` | `media.has_final === true` AND `media.thumb_count ≥ 1` AND stage is `ready-to-publish` or `published` |
| `completion.published` | Match exists in `~/dev/video-projects/published/<brand>/videos/` (by title fuzzy-match or explicit manifest) |

### Flags — derived anomalies

- `stage_lags_data` — completion booleans suggest a later stage than `stage` claims
- `stage_overshoots_data` — `stage` claims later than completion booleans support
- `no_intro` / `no_outro` / `thin_chapters` — structural gaps
- `orphaned_transcripts` — drift between recordings and SRTs
- `final_is_empty` — `final/` directory exists but contains no video (b65 case)
- `no_thumbnails` — `thumbCount === 0` for ready-to-publish or later
- `youtube_unmatched` — `stage:published` but no archive match

## Minimal FliHub changes (from gap analysis)

Stats endpoint: `flihub/server/src/routes/projects.ts:101` · helpers: `flihub/server/src/utils/projectStats.ts:105`.

**All needed data is already computed by existing helpers; it just isn't surfaced.**

| # | Need | Effort | Notes |
|---|---|---|---|
| 1 | Per-chapter `{number, name, segment_count}` array | ~20 LOC | `getChapterList()` already exists in `chapterExtraction.ts:789` — just call it from stats |
| 2 | `has_intro` / `has_outro` booleans | ~5 LOC | Trivial reduction over the chapter list |
| 3 | `hasFinal` semantics | 0 LOC | Code is correct ("`final/` contains a video"). Add `final_is_empty` companion if a separate "ready-to-publish" signal is wanted. The b71/b65 mismatch with `stage` is a manual-label drift, not a code bug |
| 4 | Directory naming | 0 LOC | Codebase is already consistent: `final/` for merged output. `edit-1st/` / `edit-2nd/` are relay-layer concepts only. There is no `edits/` directory in FliHub vocabulary — `b94`'s `edits/` is a one-off filesystem artefact, not a convention |
| 5 | YouTube URL / video ID | ~15 LOC + design | No existing storage. Decide between (a) per-project `.youtube-metadata.json`, (b) a join-manifest at brand level, or (c) match against `~/dev/video-projects/published/<brand>/videos/*/metadata.json`. (c) gives the most for least, since the published archive already has `id`, `title`, `description`, `transcript` |

**Total: ~40 LOC** to wire 1, 2, 5 into a triage response. Items 3 and 4 are documentation-only.

## Implementation order (suggested)

1. Add `getChapterList()` call + `hasIntro/hasOutro` to `/stats` (cheapest, immediately useful)
2. Introduce `/api/projects/:code/triage` and `/api/projects/triage` as new endpoints that compose stats + chapter list + completion derivation. Don't change `/stats` semantics — leave it as-is for backward compat.
3. Add YouTube join (option c — read the published archive at startup, build an in-memory map by title, attach to triage response)
4. Document `hasFinal` semantics, add `final_is_empty`, retire ambiguity

## What this unlocks for ALS

- **No filesystem access from ALS workflows.** One HTTP call per project, deterministic data.
- **Triage records become derived, not authored.** ALS doesn't need a `triage-record.md` shape — it just queries FliHub when it needs the truth.
- **Bulk analysis can filter cleanly.** "Give me everything where `completion.recording === true` AND `completion.published === false`" becomes a one-liner. (See `flihub-bulk-analysis-candidates.md` for today's working set.)
- **Workflow gates are cheap.** Operator-gated branches like "missing SRT → generate / investigate / manual" can ask FliHub for the current truth at every gate, not carry stale state.

## Open questions for FliHub implementation

1. **Is `/stats` versioned?** If we extend it, do downstream consumers care, or is the new `/triage` endpoint cleaner because it's free to evolve?
2. **YouTube join location** — published archive (option c) is rich but cross-brand. Decide whether FliHub reads it directly, or whether a separate "publication ledger" service owns that join.
3. **`stage` ownership** — keep manual? Or auto-derive from completion booleans with manual override? (Don't auto-derive without consent — the manual label is sometimes "intent" not "state".)
4. **Brand awareness** — currently FliHub is single-brand (v-appydave). The triage endpoint shouldn't assume that forever, but today's implementation can.
