# Shadow Recordings (FR-83) — deprecation inventory

**Status: IDENTIFY ONLY (2026-09-03). Nothing removed. David has ruled the feature deprecated;
this is the complete trace for a later, approved strip-out.**

## 6 · What it was for (the record, before erasure)

**David, directly, 2026-09-03 (via agent-a-day-orch):** *"`recording-shadows/` was a
pre-relay bandwidth fix for Jan. With the relay in place it no longer makes sense."* That is
the why the code could not state: shadows predate the relay lane; the relay superseded them.

`server/src/utils/shadowFiles.ts` header: 240p H.264 + 128kbps AAC `.mp4` mirrors of every
recording, in `recording-shadows/` (sibling of `recordings/`), so **collaborators (editors, e.g.
Jan) can watch/transcribe/chapter content without the heavy source files**. FR-83; resolution
made configurable (240/180/160) by FR-89 P6; sizes surfaced by FR-95. The editor-machine
workflow was the audience (machineRole=editor plays shadows in Watch).

## 1 · What creates a shadow

- **Auto, on every ingest-rename**: `routes/index.ts:263-267` — after a successful
  `POST /api/rename`, `createShadowFile(newPath, …)` fires (fire-and-forget, warn on fail).
  **This is the live producer.** Removing shadows means touching the rename path.
- **Bulk**: `POST /api/shadows/generate` (active project) and `/generate-all` (all projects) —
  `routes/shadows.ts:64,93` → `generateProjectShadows`.
- **Regen**: `POST /api/manage/regen-shadows` (`manage.ts:223`, delete-then-recreate) and a
  second `createShadowFile` call at `manage.ts:773` (bulk-rename repair path).
- Engine: `shadowFiles.ts` (`createShadowFile`, ffmpeg spawn; also exports rename/move/delete
  helpers and `getVideoDuration`, **which non-shadow code imports** — see §5).

## 2 · What consumes them

- `GET /api/recordings` (`routes/index.ts`, 47 refs): unified real+shadow listing —
  `isShadow`, `hasShadow`, `shadowSize`, `totalShadowsSize` per row/response.
- **Watch page** (`client/WatchPage.tsx`, 60 refs): plays shadow `.mp4`s via
  `/api/video/:code/recording-shadows/:file` (`routes/video.ts`); URL builder at
  WatchPage.tsx:146-158 (note a `recording-shadows-safe` URL variant — **on disk this folder
  does not exist anywhere; URL-convention only**).
- Stats: `projectStats.ts` (shadowCount), disk observability `diskUtils.ts` (per-folder
  shadow bytes + thresholds, `shared/types.ts:226,257`), `scanProjects.ts` (19 refs).
- Transcription: `transcriptions.ts` — queue-all scans REAL recordings only (FR-94,
  lines 636-676); a second map at :724 adds shadows for pending-count pairing.
- Storage: `storageTree.ts` (1 ref); hold/archive rsync moves the folder implicitly (not in
  `HOLD_EXCLUDES`, `holdUtils.ts:11` — shadows travel on hold/archive).
- Client: `ConfigPanel` (shadowResolution UI, 66), `RegenToolbar` (30), `ManagePanel` (25),
  `EditableFileRow` (19 — shadow rows disabled/badged), `RecordingsView` (shadows size line
  :1332, disable :1554), `ProjectsPanel`/`ProjectDrawer` (counts), `PreviewPanel`,
  `useTranscriptionsApi` (15), `useRecordingsApi`.

## 3 · Every surface

- **Routes**: `/api/shadows/status|generate|generate-all` (`routes/shadows.ts`, mounted
  `index.ts:284`); `/api/manage/regen-shadows` (manage.ts:223), `/api/manage/delete-shadows`
  (manage.ts:1025); `/api/video/:code/recording-shadows/…` (video.ts, 9 refs);
  shadow fields on `/api/recordings`.
- **Config**: `shadowResolution` (`server/config.json`, `shared/types.ts:206`,
  `configManager.ts` ×6, ConfigPanel UI).
- **Types**: `shared/types.ts` — `shadowCount:537`, `isShadow/hasShadow/shadowSize:558-560`,
  disk-threshold shadows:226/257/567, socket events `regen:shadows:*`:726-745;
  `shared/apiRegistry.ts` (1).
- **Sockets**: `regen:shadows:progress|complete`, `regen:all` step `'shadows'`.
- **Enumerations of derivative types** (the load-bearing ones):
  `recordingArtifacts.ts:15` — `ArtifactKind = 'recording'|'shadow'|'transcript'` (FR-156
  delete preview/execute); `renameRecording.ts:79-96` — renames the shadow in-place
  alongside transcripts, and its FALLBACK path REGENERATES one (`:281`);
  `safeMigration.ts` (25 refs — FR-111 startup migration moves shadow twins);
  delete flow `routes/index.ts` (deleteShadowFile import :16).
- **Tests**: manage, renameRecording (incl. an assertion that smart-rename does NOT call
  createShadowFile), recordingArtifacts, storageRoutes, holdArchiveInventory, configManager,
  client ProjectDrawer/getHealthAssessment/projectFilters tests.
- **Docs**: changelog (FR-83/89/94/95/111 entries), prd/fr-111, fr-152, fr-131, fr-127,
  fr-89, flihub-v2-requirements, planning/* (5), analysis/* (5), archive/*.
- **Skill (plugin repo `~/dev/ad/appydave-plugins/flivideo/skills/flihub/`)**: **zero shadow
  mentions** — nothing to strip there. (Outside this repo either way.)
- **Machine roles**: `machineRole` editor/creator exists partly FOR shadows (CLAUDE.md
  Machine Inventory; editors consume shadows via Watch).

## 4 · Load-bearing dependencies (beyond the two known)

1. `renameRecording.ts` — moves shadow as a derivative; fallback path regenerates one.
2. Hold/archive — shadows travel implicitly (absence from HOLD_EXCLUDES).
3. **FR-156 delete** — `recordingArtifacts.ts` enumerates the shadow as a deletable artifact
   and the confirm modal counts it ("linked files"); removing the kind changes the preview
   contract and byte totals.
4. **FR-155 (open design doc)** leans on shadows: its working position for Ecamm vertical
   files is "treat like recording-shadows — fits the FR-83 model" (fr-155 doc :63). Removing
   shadows removes that option's foundation.
5. `getVideoDuration` exists TWICE — `shadowFiles.ts:42` and a standalone
   `utils/videoDuration.ts:7`. Telemetry/watcher/manage/index import the STANDALONE one
   (first inventory said telemetry — wrong caller, corrected 2026-09-03). The one real
   importer of the shadowFiles copy is **`routes/query/recordings.ts:18`** — repoint that
   import (or delete the duplicate in favour of videoDuration.ts) before removing the file.
6. `pending-count`/queue-all shadow-vs-real pairing (`transcriptions.ts:636-740`).

## 5 · What silently shifts if the files vanish (no code change)

- `hasShadow=false`, `shadowSize=null`, `totalShadowsSize` line disappears — display only.
- Watch page: shadow-only rows 404 on play (for editors, every row).
- FR-156 delete previews list one fewer artifact — counts change, no error.
- Disk-observability shadow bytes → 0 ("ok" that means "absent", the known ambiguity class).
- Nothing errors: every consumer treats absence as "no shadow yet". **The system reads
  shadow-less as healthy-but-ungenerated — deletion is invisible to it**, EXCEPT the
  auto-create on next rename quietly repopulates the folder (the zombie risk: strip the
  folders but not `routes/index.ts:263` and shadows come back one rename later).

## 7 · Removal order (sequence only — NOT executed)

1. Producers: auto-create in `routes/index.ts:263-267`; `regen-shadows` + manage.ts:773;
   `routes/shadows.ts` router + mount (`index.ts:284`). (Kills the zombie risk first.)
2. Relocate `getVideoDuration` (+ any shared helpers) out of `shadowFiles.ts`.
3. Consumers: WatchPage shadow playback + video.ts shadow serving; unified-listing shadow
   fields in `/api/recordings`; client badges/disables; RegenToolbar/ManagePanel surfaces.
4. Derivative enumerations: renameRecording shadow branch; recordingArtifacts 'shadow' kind
   (+ FR-156 modal copy); safeMigration shadow moves; transcriptions pairing maps.
5. Config + types: `shadowResolution` (config, types, ConfigPanel), shadow fields/sockets in
   shared/types, apiRegistry; delete `shadowFiles.ts`.
6. Tests updated alongside each step; docs note in changelog; PRD fr-155 option C re-decided.
7. LAST, after code ships: delete `recording-shadows/` folders on disk (David's word; d01 =
   48 files/15MB is the only one found).

## Disk truth (corrected 2026-09-03, second measurement)

**⚠️ First reading understated scope — a root move happened between measurements.** My
initial `find` covered only `~/dev/video-projects` (→ exactly one folder, d01, 48 files) and
called that "ecosystem-wide". video-projects-orch corrected it; re-verified directly:

- `~/dev/video-projects` (local): **1** — `v-appydave/d01-kybernesis-12-videos/recording-shadows`, 48 files / 15 MB
- `/Volumes/T7/v-appydave-old/*/recording-shadows` (offloaded this morning with the archived
  projects): **56 folders, 1,200 files, 1367 MB**

Total: **57 folders**. No `recording-shadows-safe` exists anywhere on disk (URL convention in
WatchPage only). David's "two folders" remains UNSURE against this count — possibly he meant
the two *locations* (local + T7).

**Restore hazard for the strip-out:** any project restored from `v-appydave-old` brings its
`recording-shadows/` back into a tree that no longer expects it — and until the ingest-rename
auto-producer (`routes/index.ts:263`) is removed, a single rename regenerates shadows locally
anyway. Step 1 of the removal order (kill producers) is what makes the disk cleanup stick;
step 7 must include the T7 folders or a documented decision to leave offloaded copies as
historical record.

**Method lesson (recorded so the next measurement doesn't repeat it):** a `find` answers only
for the tree it was pointed at; "ecosystem-wide" requires enumerating the roots first —
local + T7 + any relay. Counts from a moving system carry a timestamp or they mislead.
