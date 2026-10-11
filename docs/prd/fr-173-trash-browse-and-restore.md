# FR-173 — Trash You Can See Into and Restore From

**Status: Pending — write-up only (2026-10-11), not authorised to build.**
**Class: usability gap, observed live** during the D07 recording session (2026-10-11).

## What happened

Mid-recording, David needed one discarded take back (`Ecamm Recording on 2026-10-11 at 07.47.10.mov`).
FliHub had moved it to the project's `-trash/` (correctly: discard is recoverable by design). He then got stuck on all three steps:

1. **Couldn't open the trash folder.** Nothing on the main screens opens `-trash/` in Finder.
2. **Couldn't see what was in it.** There's no list of trashed videos with a way to tell takes apart (time, length, a preview).
3. **Couldn't put a take back into Incoming.** There's no restore. He had to ask an agent, which moved the file by hand
   from `-trash/` to the watch folder (`~/ecamm`).

Trash protected the footage, but FliHub gave him no way to get it back.

## What exists today

- `client/src/components/shared/TrashIndicator.tsx`: the header pill `Trash N · size`. Its only action is **Empty** (after a confirm).
- `client/src/components/ProjectDrawer.tsx:466-480`: an **Open in Finder** 📂 button, but only inside the **Delete Trash Files**
  dialog. To find the folder you have to start deleting.
- No restore route or button anywhere (no `restore` / `untrash` in client or server).

## What's wanted

1. **Open trash in Finder** from the header pill, without going through Delete.
2. **A trash view**: the trashed videos listed newest first, with recorded time, length and size, a ▶ preview, and
   the transcript files grouped under their recording.
3. **Restore to Incoming**: one click moves a take back to the watch folder (`watchDirectory`, today `~/ecamm`)
   under its original Ecamm name, so it shows up in Incoming and lands like any new take. Bring its transcripts back with it, or
   say plainly that they were left behind.
4. Refuse plainly if a file of the same name is already in Incoming; never overwrite.

## Acceptance (for whoever builds it)

- From the Recordings or Incoming screen, a person can open the trash, find a take by time, preview it and restore it to
  Incoming without touching Finder or a terminal.
- After restore, the file is gone from `-trash/` and appears in Incoming; the trash count drops by one.
- Same-name clash → nothing moves, with a message saying why.

## Related

- FR-156 (delete moves to `-trash/`), FR-171 (Archive destroys `-trash/`). Restore makes trash's safety usable; FR-171 is the opposite risk.
- Trash visibility rule (David, 2026-09-23, in `TrashIndicator.tsx`): trash must always be visible and emptiable. This adds: **and recoverable from the app**.

**Spec artifact (2026-10-11):** https://claude.ai/artifact/9KXTro86zAhzes7hs9hkZm, source `/Users/davidcruwys/dev/ad/flivideo/flihub/docs/prd/fr-173-trash-spec.html`. Candidate D08 job 4.
