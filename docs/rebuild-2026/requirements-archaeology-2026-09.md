# Requirements archaeology — 2026-09-01→03 fix-it & survey sessions

**For the rebuild.** David: "It's not like we have to fix everything, but we do have to
understand a lot of it… I don't want to have this question with you or FliHub next week."
Test for this doc: a fresh session answers all of it from the repo alone.
Each item marked **DEFECT** / **DELIBERATE** / **UNKNOWN**, with file:line.

## Already durable — do not re-derive

| Doc | Covers |
|---|---|
| `docs/architecture/project-codes.md` | identity = folder name; kebab-only enforcement; series = convention; d01 start; NO rename/move (Teletubby implemented the semantics first — match, don't reinvent); machine-readable surfaces |
| `docs/architecture/edit-folders.md` | edit-1st/2nd never defined in code; two locations; final/'s overload; the 7-name reconciliation; stage not driven by folders |
| `docs/deprecation/shadow-recordings-inventory.md` | FR-83 full strip-out inventory; 57 folders (1 local + 56 on T7); producer-first removal order; David's purpose quote |
| `docs/prd/fr-157-…` / `fr-160-…` | titles model; A/V-delta design (held) |
| `docs/kdd/learnings.md` + `docs/kdd/patterns.md` | earned rules incl. the query-layer drift class, silent-refusal class, allowlist trap |
| `CLAUDE.md` → Operating Rules | refusals-must-be-visible; live-instrument rule |
| `docs/checkpoints-2026-08-31-…` | recording-day session state |

## Facts that lived only in messages until now

1. **Stage auto-detect never advances past `recording`.** `projectStats.ts:164-175`: 0
   recordings → `planning`, else `recording`. `final/` drives only `hasFinal`. Every later
   stage was hand-set: 36 overrides in `server/config.json` — published 15 · shelved 14 ·
   first-edit 3 · recording 2 · ready-to-publish 1 · archived 1 (verified 2026-09-03).
   **DELIBERATE mechanism, UNKNOWN intent** — a rebuild reimplementing "stages" is
   reimplementing a field only a human moves. Overrides live in GLOBAL config, not the
   project (portability gap: they don't travel on archive/copy).
2. **`/api/query/config` serves a dead stage vocabulary.** `routes/query/index.ts:44,47`
   hardcodes `['none','recording','editing','done']` — pre-FR-80; 3 of 4 values occur in zero
   real data; real lists are the 10-value union (`shared/types.ts:439`) and 9-value default
   (`:456`, no `review`). Nothing internal consumes the endpoint. **DEFECT** (fix held:
   serve the real constants).
3. **`/api/query/projects` lists non-projects** (`catalog`, `docs`, `poem`, `tools`) — the
   query layer treats every root folder as a project; only dot-/dash-prefixed and `archived`
   are excluded (`projectResolver.ts:22-31`, duplicated in `query/projects.ts:56` —
   the duplication itself is a drift risk). **DEFECT** (of the same query-layer class as #2).
4. **Codes are not unique — only full folder names are.** Prefix resolution =
   first-alphabetical `startsWith` (`projectResolver.ts:65-77`). Stage overrides + priorities
   are keyed by CODE in global config → they **bleed across roots** on any future multi-brand
   switch. **DEFECT by consequence** (each half deliberate). Scoped fix (held): move both
   into per-project `.flihub-state.json`.
5. **Two project-name grammars disagree on dots.** Create allows periods:
   `NAMING_RULES.name.pattern = /^[a-z0-9.]+(-[a-z0-9.]+)*$/` (`shared/naming.ts:47-51`);
   the archive scanner's `isValidProjectDirName` = `/^[a-z0-9][a-z0-9-]+$/i` — **no dot**
   (`server/src/utils/archiveInventory.ts:~32`). Consequence measured by ad-video-index: the
   "safely on T7" answer was wrong for 8 of 54 projects (`b70-ito.ai…`, the `opus-4.5/4.6`
   sets). **DEFECT** — one grammar must own the name.
6. **"Held" ≠ "backed up": hold/offload excludes `s3-staging/`** (`holdUtils.ts:11`
   HOLD_EXCLUDES, incl. `-trash/`) — 19.5 GB across 21 projects (ad-video-index
   measurement) never travels. **DELIBERATE** exclusion, **UNKNOWN** whether the
   backed-up-ness claim was meant to include it.
7. **The T7 seam.** `holdingPath`/`publishedPath` embed the brand in absolute paths with no
   structural link to the root (`server/config.json`). `~/.config/appydave/brands.json`
   (canonical, self-declared) supplies `ssd_backup` (= published) per brand but has **no
   holding equivalent** — that hole is David's file to fill. Live FliHub reads brands.json
   NOWHERE (only a stale gitignored `dist/` fossil of a deleted s3-staging route did).
   Recommendation (held): derive the brand segment at use-time in `storage.ts` resolveRoots.
   **DEFECT waiting to fire** on the first real brand switch.
8. **The 50-char truncation is recording-grain, not project-grain — corrected twice, so the
   correction is the record:** `sanitizeName()` silently `.slice(0,50)`s recording *names*
   (`shared/naming.ts:334`; the d01-ch03 mangle). Project create validates pattern ONLY
   (`routes/index.ts:359`) — **no length cap at all** on project names. **DEFECT** in both
   directions: silent clamp on one grain, no clamp on the other.
9. **The registry silently read 66 → 6 across the archive move** — correct both times
   (`archived` exclusion is DELIBERATE), and **nothing distinguishes "archived on purpose"
   from "root pointed somewhere wrong"** — same silence class as a root rename (no caches;
   readdir per request; dangling `activeProject` is the only trace). **Rebuild requirement:**
   intended-emptiness must be distinguishable from misconfiguration.
10. **Shadows scope: 57 folders** — 1 live (d01, 48 files/15 MB) + 56 under
    `/Volumes/T7/v-appydave-old/` (1,200 files, 1,367 MB). Restores re-introduce them; the
    ingest-rename producer regenerates them (details in the inventory doc).

## ⭐ The deprecation cluster — one change, three machines

**The relay edit lanes (`edit-1st/2nd` watching, `WatcherManager.ts:259`; byte counts), the
FR-126 edit-folder manifest (typed, Pending, `setEditManifest` has zero callers), and
`recording-shadows/` (FR-83) are one cluster: all three exist because Jan edited remotely.**
Shadows = pre-relay bandwidth fix for Jan (David, 2026-09-03); relay lanes = the Jan
round-trip; FR-126 = manifest for that round-trip's copies. With Jan out of first edit and
FliCut taking first/second/final, they lose their purpose *together*. A rebuild carrying any
one of them forward should do so knowing the other two fell — not by accident. (Clustering
them for removal is David's call; the relationship is the fact.)

## Known-stale external surfaces (outside this repo)

- flihub skill (`~/dev/ad/appydave-plugins/flivideo/skills/flihub/SKILL.md`): stage list
  stale (4-value), chapters described as SRT-derived, FR-157/159 endpoints missing. The
  legacy `~/.claude/skills/flihub/` path does not exist (fixed in this repo's docs
  2026-09-02).
- `~/.config/appydave/locations.json` lists `v-kiros` — absent on disk (Kiros retired
  2026-09-02 per brands.json).
- `v-appydave/projects.json` = DAM s3-scan manifest, not FliHub's registry.

## Held recommendations queue (David rules; none actioned)

/config stages fix · FR-160 A/V delta + backfill · take-marks · re-transcribe-confirm ·
T7 derive-don't-gate · stage/priority into state file · shadow strip-out (inventory ready) ·
dot-grammar reconciliation.
