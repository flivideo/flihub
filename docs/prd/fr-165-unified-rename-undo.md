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
