# FR-156: Delete Recording (with confirmation)

**Added:** 2026-08-26
**Status:** ✓ Implemented

## Summary

Once a take has been renamed into the project there is no way to remove it from the
app. The Recordings row offers Rename, Move to Chapter, +Tag, Split, Safe and Park —
no delete of any kind. The only escape was Finder.

This adds a **Delete** action on the recording row that moves the recording **and
every file linked to it** into `-trash/`, behind a confirmation dialog that spells
out exactly what is about to move.

## Problem

Renaming a take fans one file out into as many as five, across three folders:

```
recordings/01-1-what-kybernesis-actually-builds.mov     13.8 MB
recording-shadows/01-1-…builds.mp4                       269 KB   (FR-83)
recording-transcripts/01-1-…builds.json                  853 B    (FR-30)
recording-transcripts/01-1-…builds.srt                   211 B
recording-transcripts/01-1-…builds.txt                   178 B
```

The pre-existing `POST /api/trash` (FR-5) moves only the path it is given. Wiring
that straight into the Recordings row would have removed the `.mov` and left four
orphans — a shadow and a transcript set pointing at a recording that no longer
exists. That is why this needed to be a feature rather than a one-line hookup.

## Behaviour

- **Delete** button on each active recording row (not shown for safe, parked or
  shadow rows, which already have their own restore/unpark actions).
- Clicking it asks the server what exists on disk, then opens a confirmation
  listing every file, its role, and the total size.
- Confirming moves them all to `<project>/-trash/`.
- Files are **recoverable** — `-trash/` is emptied separately from the Project
  drawer, which is where permanent deletion already lives.
- Safe/parked flags for that recording are cleared from project state, so a
  restored-then-renamed file doesn't inherit stale status.
- `recordings:changed` and `transcripts:changed` fire so every open panel updates.

### The warning

Deliberately concrete rather than a generic "Are you sure?":

- Leads with the count and total size — *"5 files (4.0 MB) will be moved to -trash/."*
- Names the linked files explicitly when there are any, so the blast radius is
  visible before confirming rather than discovered afterwards.
- States that `-trash/` is recoverable **and** where permanent deletion happens.
- Adds a transcription note when a transcript exists — restoring the file will not
  restore its place in the transcription pipeline without a regenerate.
- Red `danger` variant, confirm button reads **"Move to -trash"**, not "Delete" —
  the button should say what actually happens.

## Design Decision: one discovery path

`POST /api/recordings/trash` accepts `dryRun: true`. The confirmation dialog calls
it with `dryRun`, the confirm calls it without. **Both run the same server-side
discovery** (`findRecordingArtifacts`).

This is the whole point of the design: a separate client-side guess at "what will be
deleted" would drift from the server's actual behaviour, and the failure mode is
silent — the user gets warned about three files while five move. Sharing the code
path makes that class of bug impossible.

## API

```
POST /api/recordings/trash
  body: { files: string[], dryRun?: boolean }

  dryRun: true  → { success, dryRun, items: [{ filename, artifacts[], totalBytes }],
                    artifactCount, totalBytes, errors? }   // moves nothing
  dryRun: false → { success, trashed[], count, artifactCount, totalBytes, errors? }
```

Artifacts carry `{ kind, label, path, filename, size }` where `kind` is
`recording | shadow | transcript`.

## Files

**New:**
- `server/src/utils/recordingArtifacts.ts` — `findRecordingArtifacts()` and
  `moveArtifactToTrash()` (collision-suffixing).
- `server/src/test/recordingArtifacts.test.ts` — 11 tests.

**Changed:**
- `server/src/routes/index.ts` — `POST /api/recordings/trash`.
- `client/src/hooks/useRecordingsApi.ts` — `usePreviewTrashRecordings`,
  `useTrashRecordings`.
- `client/src/components/shared/EditableFileRow.tsx` — Delete button + `onDelete`.
- `client/src/components/RecordingsView.tsx` — handlers + confirmation dialog.
- `client/src/components/shared/ConfirmationModal.tsx` — added `filesLabel` and
  `maxFilesShown` (default 3 kept, so existing callers are unaffected); a delete
  warning must not truncate its file list at three.

## Verification

Against the running server:

| Case | Result |
| ---- | ------ |
| `dryRun` on a 5-artifact take | all 5 reported; **source files untouched** |
| Real trash | all 5 moved; `recordings/`, `recording-shadows/`, `recording-transcripts/` left empty |
| Trash a second take of the same name | suffixed to `-1.mov`; earlier trashed copy byte-identical, not overwritten |
| Nonexistent file | `success: false` with a clear error, no crash |
| Full UI round-trip | dialog listed all 5, confirm removed the row, toast read "Moved 5 files to -trash", disk matched |

Unit tests: 11 passing, including prefix-collision (`01-1-intro` must not match
`01-1-intro-extended`) and stacked trash collisions.

## Out of Scope

- **Batch delete** from the multi-select toolbar. The endpoint already accepts an
  array of files, so the backend is ready; only the toolbar button is missing.
- **Undo / restore from `-trash`.** Recovery is currently a Finder move.
- **"Send back to Incoming"** — arguably the more useful action for a mis-named take
  (undo the rename rather than bin the file). Different feature, worth its own FR.
