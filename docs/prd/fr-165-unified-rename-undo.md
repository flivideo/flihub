# FR-165 — One Undo Story for Renames (Two Disjoint Journals Today)

**Status: Pending — write-up only (2026-09-04), not authorised to build.**
**Class: design gap, OBSERVED live** during the d02 `05-4-outro` → `06-1-outro` rename
(2026-09-04), not theorised.

## What exists

Two in-memory undo journals, mutually unaware:

1. **Ingest journal** — `recentRenames[]` in `server/src/routes/index.ts` (FR-50): last 5
   promote-path renames, 10-minute expiry, undone via
   `POST /api/recordings/undo-rename/:id`. Only knows about the `.mov` (ingest-era
   single-file semantics).
2. **Bulk journal** — FR-138's last-batch undo in `server/src/routes/manage.ts`
   (`undoAvailable` + revert endpoint): knows the whole batch, but only the most recent one.

Both die on every nodemon recycle (each `server/src/` edit), and FliHub has no log file, so a
dead journal leaves no trail. "Can I undo this?" has no single answer — it depends on which
ROUTE performed the rename, which the user never sees.

## The design question (for David)

Either converge on one durable journal (e.g. an append-only log in `.flihub-state.json` or a
sidecar, replayable across restarts), or explicitly declare undo as best-effort-ephemeral and
make the UI say WHICH renames are still undoable. The current state silently mixes both.

## Cross-references

- Rename verb table: flivideo plugin skill `skills/flihub/SKILL.md` (corrected 2026-09-03).
- Related honesty defect: FR-166 (bulk-rename response lies about transcription).

## Recurrence — 2026-10-25 (D12): Undo doesn't bring back what the rename discarded

David renamed a take to `04-7-ai-slop-team.mov` and answered **"Yes, discard"** to "Discard remaining files?". Two
other takes (`10.54.15`, `10.54.30`), which he meant to keep, went to `-trash/` in that same action. He then pressed
**Undo** on the 04-7 card: the rename was reversed and the take went back to Incoming, **but the two discarded takes
stayed in trash.** An agent had to move them back by hand. This was the second hand-rescue on D12 that morning.

**What's wanted:**
1. **Rename + discard is one action, so Undo reverses all of it**: un-rename the kept take *and* return the files that
   discard sent to trash, back to Incoming under their original names.
2. **Restore is scoped to that ingestion, not the whole video.** D12's `-trash/` held 30+ takes from the morning, and
   only the 2–3 from the last ingestion should come back. So the discard has to record *which files it trashed*
   (a batch id or list) at the moment it happens, because trash alone can't tell batches apart.

Ties to FR-173 (trash restore, including the "return recent discards" idea) and FR-174 (Rename Keep / Rename Discard):
offering **Rename Keep** would have avoided this case entirely. Status: **banked, not authorised to build.**

**And again, 11:23 the same morning.** After renaming `05-5-ai-slop-rig-design`, "Yes, discard" sent `11.22.12` and
`11.22.30` to trash, and one of them was wanted. That's the **third agent hand-rescue on D12 in two hours.** The
discard-after-rename dialog is a trap during fast recording.
