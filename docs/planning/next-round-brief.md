# Next Round Brief — FliHub

**Written**: 2026-03-22 (post manage-relay-refactor-w2)

---

## Resume Point

**Wave 2 complete**: `docs/planning/manage-relay-refactor-w2/` — 6/6 done, assessment written, audits run, 842 tests passing.

**Uncommitted work**: All wave 2 changes are on main branch, uncommitted. Run `git status` on entry to see what needs committing.

---

## What Was Done This Session

1. Planned wave 2 in Extend mode from previous next-round brief
2. Built 3 waves (2→2→2 agents), 6/6 complete:
   - relay-foundation (getRelayPaths, rsyncExcludeArgs, RELAY_SUBFOLDERS, rsync exclusions, 11 tests)
   - relay-folder-browser (GET /browse, RelayBrowser table, useRelayBrowse, 6 tests)
   - relay-push-collect-full (subfolder-aware push/collect/preview, UI dropdown, collect bug fix, 10 tests)
   - promote-to-final (GET /versions, POST /promote, version list UI, 11 tests)
   - role-based-visibility (machineRole gating on push/collect/promote)
   - visual-indicators (color dots, summary footer, legend)
3. Ran code-quality + test-quality audits, fixed 3 issues:
   - Replaced duplicated subfolderNames with RELAY_SUBFOLDERS constant
   - Added invalid subfolder rejection tests for push/collect
   - Enhanced promote test to verify fs.copy source/dest paths
4. Widened Relay drawer from 600px → 700px
5. Created feedback file with F001-F003 (David's Manage page frustration)
6. Updated BACKLOG.md — B040 done, B041-B043 added
7. Test count: 552 → 842

---

## David's Feedback (Important — Address Next Session)

David is frustrated with the Manage page. Key points:
- **F001**: Remove Regen Chapters — temporary system, no longer useful (B042, quick fix)
- **F002**: "Manage & Export" heading is meaningless noise when using Relay (B041)
- **F003**: Manage page needs full design review — tools bolted onto a generic shell, never properly designed (B041)

**David's words**: "I don't really get what the manage and export is even doing... it's never fit... here I am on a relay screen, and I've got this manage and export which doesn't seem to do anything and just adds noise rather than the relay collaboration."

**Recommended approach**: Run a `/frontend-design` or `/critique` pass on the Manage page before planning the next wave. The page layout problem is a design problem, not a feature gap.

---

## Pending Work (from audits + feedback)

### Quick wins (do first)
- B042: Remove Regen Chapters from ToolsSidebar — 5-minute change
- Stale diff after push (audit m3) — clear diff state on push success

### Design work (needs thought)
- B041: Manage page redesign — context-sensitive tool pages instead of generic shell with drawers

### Technical debt (from audit)
- B043: Type relay API responses (M1), add HTTP status checking (M2), proper HTTP error codes (M4)
- Promote overwrite warning (audit m5) — check if dest exists before fs.copy
- Remove dead `*deleting` handling in parseRsyncDiff or add `--delete` flag (audit m6)

---

## To Start Next Session

```
/ralphy
```

Then say: "Continue from the next-round brief. Start with the quick fixes (B042, stale diff), then run /critique on the Manage page for B041."

---

## Reference Files

- `docs/planning/manage-relay-refactor-w2/AGENTS.md` — wave 2 AGENTS.md
- `docs/planning/manage-relay-refactor-w2/assessment.md` — wave 2 assessment + audit findings
- `docs/planning/flihub-feedback.md` — F001-F003 feedback items
- `docs/planning/BACKLOG.md` — B041-B043 pending
- `docs/planning/requirements-manage-relay-refactor.md` — full requirements
