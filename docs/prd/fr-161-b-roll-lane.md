# FR-161: B-roll lane — promote target that is not `recordings/`

**Status:** Designed 2026-09-03, awaiting David. Stopgap available today (§5).
**Direction from David (verbatim, via orch):** record b-roll via Ecamm → lands in ingestion →
"I don't have a place to put it other than recordings… happy to have a brand new page…
promoted to that location… they're not part of the regular recording flow."

## 1 · What "promote" is today (the thing needing a second destination)

`POST /api/rename` (`server/src/routes/index.ts:167-270`): validates chapter/sequence/name,
builds `{NN}-{seq}-{name}-{TAGS}.mov`, `fs.ensureDir(recordings/)`, `fs.move()` from the
watch dir, tracks the rename for undo, then **auto-queues transcription** (FR-30, :259) and
**auto-creates a shadow** (FR-83, :263). Destination is hardcoded: `paths.recordings`.

## 2 · The structural fact: b-roll has no chapter

The entire recording grammar hangs off the `NN-` prefix — parsing (`naming.ts:217`), chapter
grouping, chapter counts, transcript pairing, FR-34 chapters. Options and costs:
- **Fake chapter number (e.g. `99-`)**: pollutes chapter count, YouTube chapter list, stats,
  and transcript-sync ratios. Rejected.
- **Chapter-less names inside `recordings/`**: `parseRecordingFilename` returns null →
  invisible-but-present files distorting counts. Rejected.
- ⭐ **Separate folder, own convention**: costs ZERO — every consumer (stage auto-detect,
  stats, chapters, transcription queue-all, verify gates, FR-156 artifacts) scans
  `paths.recordings` only. A sibling folder is structurally inert. **This is the design.**

## 3 · Recommendation

- **Folder: `b-roll/`** — top-level sibling of `recordings/` (matches the
  `recording-transcripts` naming family; NOT under `assets/`, which means images+prompts —
  `hasAssets` = image/prompt files, `scanning.ts:180`).
- **Naming: `{kebab-name}-{n}.mov`** (optional `-TAGS`), no chapter prefix — the absence of
  `NN-` IS the marker that it is not narrative footage.
- **Promote-to-b-roll** = the existing rename route with a `destination: 'recordings'|'b-roll'`
  field; for `b-roll`: same fs.move + undo tracking, **skip transcription auto-queue and
  shadow creation**. New page lists `b-roll/` (a thin variant of the recordings list).

## 4 · Behaviour matrix (verified against code)

| Behaviour | Applies to b-roll/? | Mechanism |
|---|---|---|
| Transcription auto-queue | **must not** — skipped by design | queue-all + auto-queue scan `recordings/` only (`transcriptions.ts:655`, `index.ts:259`) |
| Shadow auto-create | **must not** (deprecated anyway) | fires only in the recordings promote path (`index.ts:263`) |
| Stage flip | **does not** — auto-detect counts `recordings/` only (`projectStats.ts`) | separate folder inert |
| Stats/counts/verify gates | **not distorted** — all `paths.recordings`-scoped | ✓ |
| **Archive/unarchive** | **travels** — whole-folder copy (`storage.ts`) | ✓ |
| ⚠️ **Hold/offload** | **does NOT travel** — `HEAVY_SUBFOLDERS = ['recordings','recording-shadows','final']` (`storageTree.ts:23`); `b-roll/` stays local on hold | add to the list when built, or accept |
| Delete/undo, FR-156 artifacts | recordings-only today; b-roll page needs its own delete (simple move to `-trash/`) | |

## 5 · Stopgap for TODAY (no code)

1. `mkdir b-roll/` inside the project folder.
2. Record with Ecamm as normal → files appear in Incoming (watch dir).
3. **Drag them from `~/ecamm` into `b-roll/` in Finder** — the watcher sees the unlink and
   Incoming clears itself; FliHub ignores unknown folders entirely (readDirSafe), so nothing
   breaks, no stage flips, no transcription fires, no shadow is made.
   Name them kebab-case by hand (`office-pan-1.mov`).
   Limitation: no preview/duration UI for them until the page exists.

## 6 · Rebuild requirement

Chapter-less media is a real category the current grammar cannot express. The rebuild's
naming/model must admit **project media that belongs to zero or many chapters** (b-roll now;
FR-155's Ecamm verticals are the same shape). See
`docs/rebuild-2026/requirements-archaeology-2026-09.md`.
