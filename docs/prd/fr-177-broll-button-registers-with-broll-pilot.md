# FR-177: The purple B-roll button registers the take with B-Roll Pilot

**Status:** Built on branch `broll-register` (2026-11-02), awaiting orch gate + merge. Not merged.
**Go:** David, 2026-11-02 ("YES", decision 3 of the 11-02 report). Contract: flistudio
`docs/planning/broll-pilot/spec.md` §6 (6.1 call, 6.2 rules, 6.3 buttons, 6.4 refusals).
**Supersedes:** the button half of FR-161 (move to `b-roll/`).

## Behaviour

On an Incoming card the purple **B-roll** button opens a one-line row: *B-roll tags* (comma/space
separated, optional) + **Add to B-roll**. Pressing it:

1. `POST /api/broll-register { path, name, tags }` (FliHub server).
2. The server calls FliStudio `broll.register` over JSON-RPC at `127.0.0.1:<port>/api/rpc`
   (port + bearer token from `~/Library/Application Support/flistudio/control.json`, read per
   call, never logged or returned), principal `agent:flihub`, with `place: 'copy'`,
   brand (from the brand root), project (the open project), `title` = the Name field if set,
   tags, `from { app: 'flihub', take: 'ecamm:<file stem>', recordedAt }`. No transcript is sent
   (Incoming takes have none); FliStudio asks FliTools.
3. On `ok`, and only after FliStudio's registered file is verified on disk, the original is moved
   to `<project>/-trash/` (recoverable) and leaves Incoming. FliStudio's copy is the take now.
4. On any refusal the take stays in Incoming untouched.

Toasts (spec §6.4): `file-not-found` → "File not found — not added"; `unusable-file` → "Not an image
or video"; `project-not-found` / `project-ambiguous` → "Which project? …"; `invalid-input` → the
server's message; FliStudio down / connection refused / no control.json → "FliStudio isn't running
— not added to B-roll". `created:false` (already registered) → "Already in B-roll — tags merged".

## Decisions to rule on (flagged, nothing deleted)

- **Old move-to-`b-roll/` behaviour: button replaced, back end left in place.** The button no longer
  moves into `b-roll/` (spec §6.3: FliHub "does not file the take into hub/"; FliHub `b-roll/` is
  deprecated per the 2026-09-22 ruling). Still present, now unreachable from Incoming:
  `destination: 'b-roll'` in `POST /api/rename`, `GET/DELETE /api/broll`, the B-Roll page/tab, and
  `b-roll` in `HEAVY_SUBFOLDERS`. Kept so existing `b-roll/` folders stay readable and deletable.
  **Recommend:** keep until existing `b-roll/` content is migrated, then retire in a deprecation FR.
- **Original goes to `-trash/`, not left in the watch folder.** Spec §6.3 says the take clears from
  Incoming "the way it does after any routing", and Incoming is the watch folder, so something has
  to move. `-trash/` is the same recoverable place Discard uses. Alternative: leave the Ecamm file
  and hide it — rejected, it would reappear on restart.

## Not in scope / not verified

FliStudio-down was proven by unit test only (the live FliStudio could not be stopped). The live
refusals (`project-not-found`, `unusable-file`) are unit-tested against the §6.4 shapes, not provoked live.
