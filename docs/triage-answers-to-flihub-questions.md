---
purpose: Answers to the seven questions FliHub asked when reviewing the triage handoff. Companion to `triage-handoff-from-flilaunch.md`.
created: 2026-05-11
source: live FliLaunch ↔ FliHub conversation, 2026-05-10 and 2026-05-11
---

# Triage — Answers to FliHub's Questions

Both reference docs now exist alongside this one:

- `docs/triage-handoff-from-flilaunch.md` — the original handoff (API shape, derivation rules, ~40 LOC implementation footprint)
- `docs/triage-bulk-analysis-candidates-from-flilaunch.md` — the six candidate codes and the filter that produced them
- `docs/triage-answers-to-flihub-questions.md` — this file

---

## 1. Status of the work — what landed, what didn't

**Discussion only. No code landed.** The handoff doc was authored in the FliLaunch repo during a live co-design session with Nick Frith (ALS author) on 2026-05-10, then copied here on 2026-05-11.

- No changes to FliHub source.
- No new endpoints added.
- The gap-analysis numbers (~40 LOC, `getChapterList()` already exists at `chapterExtraction.ts:789`, etc.) came from a structural read of the FliHub codebase. **Verify those line numbers and helper names before relying on them** — they may have drifted.

The handoff is a design proposal at "ready for backlog grooming" maturity, not a spec.

---

## 2. The four parked open questions — none decided

Verbatim from the handoff, with current best-guess but **none of these were resolved in conversation**:

1. **Extend `/stats` or new `/triage` endpoint?** — Lean: new endpoint. `/stats` has implicit downstream consumers and triage is a different abstraction (derived completion truth vs. raw counts). A new endpoint is free to evolve. **Not decided.**

2. **YouTube join location** — Lean: option (c), read `published/<brand>/videos/*/metadata.json` directly at FliHub startup, build in-memory map. Reason: data already exists (confirmed: 183 metadata files at `~/dev/video-projects/published/appydave/videos/`). A separate publication ledger is more work than needed for v1. **Not decided.**

3. **`stage` ownership — manual vs. auto-derive** — Lean: keep manual, surface drift flags (`stage_lags_data`, `stage_overshoots_data`), let the operator decide when to update. Auto-deriving would silently overwrite intentional "intent" labels (operator marking `stage: ready-to-publish` before the assets land is a useful signal). **Not decided.**

4. **Brand awareness** — Single-brand today (v-appydave). The triage endpoint should be designed brand-agnostic from day one (path templates, no hardcoded brand prefix), but the v1 implementation can hardcode `v-appydave` if that ships faster. **Not decided.**

---

## 3. The six candidate codes + filter that produced them

Full detail in `docs/triage-bulk-analysis-candidates-from-flilaunch.md`. Summary:

**Filter applied** (these were the operative triage criteria in conversation):
- `stage !== 'published'`
- `transcriptPercent === 100`
- `transcriptSync.orphanedCount === 0`
- `chapterCount ≥ 3`
- Intro chapter present (`01-*-intro|opening|hook`)
- Outro chapter present (final chapter label matching `outro|wrap|cta|close`)

31 of 76 projects qualified. Top 6 after sorting pinned-first, then by transcript count:

| # | Code | Stage | Chapters | Transcripts |
|---|---|---|---|---|
| 1 | `b71-bmad-poem` | first-edit | 16 | 121 |
| 2 | `b81-dam-command-line` | recording | 10 | 31 |
| 3 | `b76-vibe-code-auto-chapters-opus-4.5` | recording | 8 | 23 |
| 4 | `b72-opus-4.5-awesome` | recording | 6 | 20 |
| 5 | `b73-vibe-code-ecamm-line-opus-4.5` | recording | 7 | 17 |
| 6 | `b70-ito.ai-doubled-productivity` | recording | 5 | 14 |

All six are pinned. Useful for **validating the flag logic** — these are the projects where every "happy path" boolean should resolve `true` once `/triage` ships. If any of them return `completion.recording: false`, the implementation has a bug.

Note: `b65-guy-monroe-marketing-plan` also passes all criteria but has `priority: normal`, so it ranked outside the top 6. It's the project the conversation deep-inspected first; useful as an additional smoke test.

---

## 4. YouTube join — does the metadata source exist?

**Confirmed: yes.** Not aspirational.

- Path: `~/dev/video-projects/published/<brand>/videos/<YOUTUBE_ID>/metadata.json`
- AppyDave brand: 183 metadata files present as of 2026-05-11
- Each metadata.json contains at minimum: `id` (YouTube ID), `title`, `description`. Also a sibling `transcript.txt` and `thumbnail.jpg`.
- Channel-level info at `~/dev/video-projects/published/<brand>/channel.json` (`id`, `handle`, `title`, `description`).

The **gap** is the join key — v-appydave projects use project codes (`b65-guy-monroe-marketing-plan`), published archive uses YouTube IDs (`_5me1HzMKc8`). They don't share a key.

**Options for the join** (in order of effort, cheapest first):
- Title fuzzy match (probabilistic, never 100%)
- Operator-set `youtube_id` field on the v-appydave project (manual, one-time per project)
- A manifest file (`published/manifests/v-appydave.json`) mapping code → YouTube ID

The handoff doc recommends starting with title fuzzy match + a `matched_via` field in the response, so consumers know whether it's deterministic or probabilistic.

---

## 5. ALS context — is ALS still the eventual consumer?

**Honest update from 2026-05-11:** complicated.

Original framing (2026-05-10): ALS was the intended primary consumer. The `/triage` bulk endpoint was specifically shaped to feed ALS Delamain workflows ("give me all completion.recording === true && completion.published === false").

What actually happened in the same session: we built the bulk-analysis ALS workflow as a proof-of-concept and found ALS is **over-engineered for the actual workload** (12 prompts × 76 videos = simple batch, but ALS's per-record git worktree + dispatcher + merge-back contention added significant friction). The 12-prompt analysis itself probably belongs in a plain skill, not ALS.

**So the realistic consumer set for `/triage` is now:**
1. **FliHub UI** (primary) — operator browses projects, sees completion lenses + drift flags directly
2. **Any future workflow tool** (FliLaunch UI, ALS, ad-hoc scripts) — secondary

**Implication for the API:** the shape stays the same. Brand-agnostic, deterministic JSON, no ALS-specific assumptions. The bulk endpoint (`/api/projects/triage`) is still worth shipping — even without ALS, an operator UI wants to fetch the table view.

---

## 6. Relationship to FR-153 (storage redesign)

**Yes — triage should land before FR-153.**

Reason: storage decisions ("can this project be archived to S3?", "is this safe to delete the recordings for?", "does this need a re-cut?") all depend on knowing the project's actual completion state. If FR-153 ships first, it builds on `stage` (which can lie) or re-derives the same signals triage would compute — duplicating work and risking drift.

Order recommendation:
1. **Triage first** — gives FR-153 a reliable predicate library to gate on
2. **FR-153 storage workflow** — consumes triage flags (e.g., `completion.published && !final_is_empty` → safe to archive recordings)
3. FR-133 file status indicators can be deprecated in favour of triage's structured response

---

## 7. Memory-worthy

**Yes.** Recommend a `project_triage.md` memory entry covering:
- Decision: triage lives in FliHub, not in any downstream workflow tool
- Three independent completion lenses (recording / first-edit / final / published)
- The `stage_lags_data` / `stage_overshoots_data` drift-flag pattern (stage is intent, completion is fact)
- `/api/projects/:code/triage` + `/api/projects/triage` endpoint shape
- The four parked questions

Single line in MEMORY.md: `- [Project triage](project_triage.md) — derived completion truth lives in FliHub; stage is intent, completion is fact`

---

## Suggested backlog item

**FR-154: project triage endpoint** (proposed)

- Reads: filesystem (recording transcripts, final/, assets/, thumbs), published archive metadata
- Writes: nothing (read-only API)
- Surfaces: completion booleans, structural facts, drift flags, YouTube linkage
- Effort: ~40 LOC for items 1-2-3-4 from handoff doc; YouTube join (~15 LOC + design decision) optional for v1
- Dependencies: none — purely additive
- Unblocks: FR-153 (storage workflow), any workflow consumer wanting deterministic project state
- Deprecates: FR-133 (file status indicators) once shipped

Worth shaping into a story with acceptance criteria derived from the six candidate codes (§3) — those should all return `completion.recording: true, completion.published: false` and zero drift flags.
