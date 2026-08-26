# FR-155: Ecamm Dual-Mode Recording Ingestion

**Added:** 2026-08-26
**Status:** Future — documented, not scheduled

## Summary

Ecamm Live's **dual mode** (simultaneous landscape + vertical render) changes the
shape of what lands in the watch directory: instead of a flat `.mov`, each take
becomes a **folder containing two `.mov` files**. FliHub's watcher globs one level
only, so dual-mode takes are invisible to the app.

This is a **known, unhandled shape**, captured here so the next person who turns
dual mode on knows immediately why nothing appeared. The workaround is to leave
dual mode off.

## Evidence

Recorded 2026-08-26 08:45 with dual mode on:

```
~/ecamm/
├── Default Show.ecammprofile
└── Ecamm Recording on 2026-08-26 at 08.45.12/          ← a FOLDER, not a file
    ├── Ecamm Recording on 2026-08-26 at 08.45.12.mov              8.4 MB  landscape
    └── Ecamm Recording (Vertical) on 2026-08-26 at 08.45.12.mov   8.3 MB  vertical
```

With single-camera mode the same take would have been a flat
`~/ecamm/Ecamm Recording on 2026-08-26 at 08.45.12.mov`.

Confirmed live: `GET /api/files` returned `[]` while both files sat on disk. The
server was up on 5100/5101 and the watcher was healthy — it simply had nothing
matching its glob.

## Root Cause

`server/src/watcher.ts:15`

```js
const watchPattern = path.join(expandedPath, '*.mov');   // → ~/ecamm/*.mov
```

A flat glob with chokidar's default `depth: 0`. The dual-mode files are one level
deeper, so they never match. Nothing errors; the take is silently absent.

## The Real Design Question

Recursing the glob is a one-line change and is **not** the hard part. The hard part
is that dual mode yields **two files per take**, and FliHub's naming convention has
exactly one slot per recording:

```
{chapter}-{sequence}-{name}-{tags}.mov
```

So a decision is required before any code is written:

| Option | What it means | Trade-off |
| ------ | ------------- | --------- |
| **A. Ignore the vertical** | Ingest the landscape only; leave the vertical on disk | Simplest. Vertical render is wasted work — arguably dual mode should just be off |
| **B. Vertical as a variant** | Ingest landscape; store vertical alongside with a tag (e.g. `-VERT`) | Keeps both, but tags currently carry editorial meaning (`CTA`, `SKOOL`), not format |
| **C. Vertical as a shadow** | Treat it like `recording-shadows/` — a derivative keyed to the parent recording | Fits the existing FR-83 shadow model best; no sequence-number competition |
| **D. Two recordings** | Both get their own chapter/sequence | Rejected — pollutes numbering and doubles every downstream count |

**Working position:** vertical is a **derivative, not a recording**. It should not
compete for a sequence number. That points at C (or A if the vertical is genuinely
unwanted). This is unresolved and needs David's call before implementation.

## Secondary Questions

- **Pairing rule** — is `(Vertical)` in the filename a stable contract, or should
  pairing be inferred from the shared folder + timestamp? The Ecamm naming has not
  been verified across versions.
- **Folder cleanup** — after ingest, does the wrapper folder get deleted, or left
  for Ecamm to manage?
- **Partial takes** — the `.inProgress.nosync/` folder appears inside the watch dir
  during recording. Any recursion must keep ignoring dotfolders (chokidar's default
  `ignored` is not set on this watcher).
- **`awaitWriteFinish`** — already configured on this watcher; must be preserved for
  the deeper glob, since two large files finish writing at slightly different times.

## Interim Guidance

**Leave dual mode off in Ecamm.** Single-camera mode drops a flat `.mov` into
`~/ecamm/` and FliHub picks it up as it always has. Vertical-only recording also
works fine today — see [FR-154](fr-154-orientation-aware-video-playback.md) for the
playback-orientation side of that.

If a dual-mode take has already been recorded and is needed, move the landscape
`.mov` up one level into `~/ecamm/` and the watcher will pick it up within seconds.

## Out of Scope for This Document

Implementation. This is a capture of the problem, the evidence and the open
decision — not a build order.
