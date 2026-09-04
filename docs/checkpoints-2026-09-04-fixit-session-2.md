# Checkpoint — fix-it/build session 2026-09-03→04 (pre-compaction handover)

Successor to `docs/checkpoints-2026-08-31-recording-day-session.md`. Everything below is
committed and pushed on `main`. A fresh session: read `CLAUDE.md` (rebuild-input pointer),
then this file.

## Shipped this session (all verified against the running app)

| Commit | What |
|---|---|
| `150f5cf` + `2a4f7e5`-era | **FR-162 brand switcher** — header dropdown, brands.json + disk v-* merge, live switch, T7 paths travel; kybernesis added to `~/.config/appydave/brands.json` |
| `f485b54` + `2a4f7e5` + `aaa5ef6` | **FR-163 auto-filled project codes** — per-root high-water mark (never decreases), two-field NewProjectForm with live preview; review by flihub-spec-writer PASSED (two scan holes found+fixed: two-level bucket scan for archived/ AND publishedPath); 22/22 tests |
| `1e3e1eb` | **FR-161 b-roll lane** — `b-roll/` sibling folder, Incoming "B-roll" button (name-only), B-Roll tab (list/play/delete→-trash), transcription+shadow skipped, added to HEAVY_SUBFOLDERS; verified end-to-end with generated clip, counts byte-identical |
| `977d586` | archaeology: **swap-chapters strands FR-157 titles** (new DEFECT, held) |
| appydave-plugins `1327b12` | **flihub skill rename correction** — "no rename at either grain" was false; verb table + five-file rule + 3 live caveats added |
| (data op) | d02: `05-4-outro` → `06-1-outro` via `POST /api/manage/bulk-rename` (all 5 files; David-confirmed fix) |

## Open — David's word pending (one-word answers)

1. **FR-163 §7: first code of an empty brand — `a00` (built) or `a01`?** Both this session and
   flihub-spec-writer recommend **a01** (every real series starts at 01). Fires on Kybernesis's
   first project.
2. **50-char length warning threshold** — keep 50 or another number (warn-only either way).

## Held queue (unchanged, all designed/scoped, in `docs/rebuild-2026/requirements-archaeology-2026-09.md`)

/config stages fix · FR-160 A/V delta + backfill (PRD ready; orch ruled backfill-all; awaiting
David's direct go) · take-marks (design reported) · re-transcribe-confirm · stage/priority into
state file · shadow strip-out (`docs/deprecation/shadow-recordings-inventory.md`, 57 folders) ·
dot-grammar reconciliation · swap-chapters/FR-157 title remap · focus-brand marker
(`~/.config/appydave/focus.json`, ~20 min when a second tool needs it) · bulk-rename
`transcriptionQueued:true`-when-skipped flag (observed 2026-09-04).

## Session-only facts a successor needs

- **David is testing b-roll + brand switching + project creation himself** — feedback may arrive
  as plain messages; the flow he'll use is in `docs/prd/fr-161-b-roll-lane.md` §status and the
  FR-162/163 PRDs.
- **Peer-session protocol this week**: work arrives as cross-session messages from orchestrators
  (agent-a-day-orch, video-projects-orch, flihub-spec-writer — sock addresses change per
  session, use ListAgents). Builds proceed on David's QUOTED go relayed by an orch when the
  design was already approved by him; pure relays without his words → hold and ask. Docs-only
  changes in this repo: standing grant, ship on own judgement, report past-tense.
- **Live-instrument rule** applies (CLAUDE.md): announce nodemon recycles of 5101 before
  touching `server/src/` when David is using the app.
- d02-cutty-audio-cleanup is the active project (13 recordings, 6 chapters); d01 has 10
  chapters, 49 recordings; Incoming had real files pending this morning.

## Ruled out this session (beyond what KDD already holds)

- `/api/rename` for EXISTING recordings — ingest-only; orphans the transcript trio (use
  `manage/bulk-rename`).
- Scan-only next-code and gap-filling — violate D1/D2 (spec'd in fr-163 PRD).
- brands.json as sole dropdown source — kybernesis was missing; disk-merge covers unregistered
  roots.
- Building on relayed go without David's quoted words (FR-160 precedent stands).
