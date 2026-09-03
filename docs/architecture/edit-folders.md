# edit-1st / edit-2nd / final — what the code actually holds (2026-09-03)

Written because David asked what these mean today, ahead of moving first/second edit under
FliCut. Every claim cited. Headline: **nobody ever defined `edit-1st`/`edit-2nd` in code.**

## The mechanical truth

- **FliHub never writes into them.** No route or util creates the folders or copies files in.
  The writers were always humans and Gling (FR-141:64 — "User exports FROM Gling directly to
  edit-1st") and Jan via the relay. The "Gling / Edit Prep" tool only copies the recordings
  folder PATH to the clipboard and opens Finder (`GlingEditTool.tsx`).
- **Two physical locations share the names:**
  - Project-level `{project}/edit-1st|edit-2nd`: openable (`system.ts:310`), deletable in
    storage cleanup (`manage.ts:1085` DELETABLE_SUBFOLDERS), otherwise **unread**.
  - Relay-level `~/relay/flihub-appydave/{code}/edit-1st|edit-2nd`: watched
    (`WatcherManager.ts:259` → `relay:changed`), byte-counted (`holdUtils.ts:275`,
    `diskUtils.ts:130`), shown in the storage tree (`storageTree.ts:246`). Relay is empty
    today (SyncThing dotfiles only).
- **No code distinguishes 1st from 2nd** — they are symmetric strings in every list. No stage
  inference, no delivery, no ordering, no meaning.
- **FR-126's manifest (`edit-1st/edit-2nd/edit-final` keys in `.flihub-state.json`) is
  PENDING and never wired**: `setEditManifest` has zero callers; only
  `updateManifestFilename` runs (rename keeps consistent a manifest nothing creates).
- The only definitions ever written are workflow diagrams:
  `docs/planning/relay-workflow-diagrams.md` — `edit-1st/` = Gling output (ums/ahs cut),
  pushed back by Jan; `edit-2nd/` = second pass. Convention, not code.

## What `final/` means, mechanically — and why "final" is overloaded

`final/` is the ONLY finished-thing folder FliHub READS. `detectFinalMedia`
(`finalMedia.ts:118-148`) scans `final/` → `s3-staging/` → project root for `{code}*.mp4` +
`.srt`; the hit feeds chapter timestamps (FR-34), the final-media display, and `hasFinal`
(client filters, drawer checklist — **not stage**). `edit-2nd/` is never read; that is the
entire distinction. Consequence of the overload David named: a first-edit export dropped in
`final/` (or even project root as `{code}-final.mp4`) becomes the "real final" to every
downstream consumer — the code cannot tell the difference.

## Stage is not driven by any of this

Auto-detect never advances past `recording` (`projectStats.ts:164-175`: 0 recordings =
planning, else recording; everything later is a manual override in global config). d01 reads
`recording` because no override was set — not because `final/` is empty. `pipeline/` (FliCut's
lane, 48 delivered variants in d01) has **zero references** in server/src — invisible.

## The seven archived names, reconciled

| folder (count across 61 archived) | FliHub's relationship |
|---|---|
| `final/` (9) | **read** — detectFinalMedia priority 1 |
| `s3-staging/` (21) | **read** — priority 2; excluded from hold rsync |
| `edit-1st` (18), `edit-2nd` (6) | watched/counted/openable/deletable; never read |
| `edit-final/` (8) | invisible (only an unwired FR-126 manifest key) |
| `edits/` (2) | invisible — FliCut's delivery lane |
| `edit-first` (1) | invisible |

## Context

The relay `edit-1st/2nd` lanes exist because of the Jan round-trip (same era and reason as the
deprecated `recording-shadows/`). With Jan leaving first edit and FliCut taking
first/second/final, the relay edit lanes and the unwired FR-126 machinery lose their purpose
together. David's new definitions (first edit = cut/join export, second edit = overlays,
real final = both) collide with **no mechanism** — only with folder-name muscle memory and the
legacy folders above.
