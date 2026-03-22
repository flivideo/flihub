# Next Round Brief — FliHub

**Written**: 2026-03-22 (post manage-relay-refactor wave 1)

---

## Resume Point

**Mode**: Ralphy Extend — ready to plan IMPLEMENTATION_PLAN.md for wave 2

**Wave 1 complete**: `docs/planning/manage-relay-refactor/` — 6/6 done, assessment written, AGENTS.md updated with learnings.

**Requirements brief**: `docs/planning/requirements-manage-relay-refactor.md` — Wave 2 items defined (section "Wave 2: Relay Features").

---

## Campaign: manage-relay-refactor (Wave 2)

### Wave 2: Relay Features (from requirements brief)

Estimated 4-5 work units:
1. **relay-folder-browser** — API to scan relay directory; show per-project breakdown (recordings, edit-1st, edit-2nd); file counts + sizes
2. **relay-push-collect-full** — push/collect for all edit levels (not just recordings); proper preview with correct file naming
3. **promote-to-final** — select approved version from edit-2nd, copy to final/
4. **role-based-visibility** — show/hide buttons based on machineRole (recorder: push/archive/cleanup; editor: ingest/push-edits)
5. **visual-indicators** — project pipeline status at a glance (what's in relay, what's been sent/received, what stage)

### Audit suggestions to incorporate:
- Extract `getRelayPaths(config)` helper before adding more routes (reduces duplication)
- Add error-path tests for relay routes (500 branch — 3 missing tests from wave 1)
- Add `._*` exclusion verification to push/collect tests
- Add "DO NOT MODIFY" section to AGENTS.md to prevent agent scope creep

### Rsync exclusion patterns (from background scan of v-appydave 2026-03-22)

Current excludes: `.DS_Store`, `._*`

**Add these to relay.ts rsync calls** as a wave 2 prerequisite:
- `.gitkeep` — git placeholder found in recordings/
- `.stfolder` — SyncThing marker directory (found in relay folder)
- `.stignore` — SyncThing config file (found in relay folder)
- `.stversions` — SyncThing versioning directory
- `.Spotlight-V100` — macOS Spotlight index
- `.Trashes` — macOS Trash
- `Thumbs.db` — Windows thumbnail cache

**Do NOT exclude** `*.mp3` or any media files — editors place these intentionally (e.g. music assets in edit-1st/).

Scan found 41 .DS_Store files (38 in recordings/, 2 in relay, 1 in edit-1st) — already handled. No other junk types found. Projects are clean.

---

## What Was Done This Session

1. Extended from next-round brief into IMPLEMENTATION_PLAN.md + AGENTS.md
2. Built wave 1: 3 waves (3→2→1 agents), 6/6 complete
3. Ran code-quality + test-quality audits, fixed BLOCKER (updateConfig propagation)
4. Committed everything, assessment written
5. Retired S3 Staging (3 files deleted, -20KB bundle)
6. 48 new relay tests (504→552 total)
7. Background scan of v-appydave projects launched for rsync junk files

---

## To Start Next Session

```
/ralphy
```

Then say: "Continue from the next-round brief — Extend mode, plan wave 2."

The brief, requirements doc, wave 1 AGENTS.md (with inherited learnings), and assessment all have what's needed.

---

## Reference Files

- `docs/planning/requirements-manage-relay-refactor.md` — full requirements (wave 2 section)
- `docs/planning/manage-relay-refactor/AGENTS.md` — relay AGENTS.md with wave 1 learnings
- `docs/planning/manage-relay-refactor/assessment.md` — wave 1 assessment + audit findings
- `docs/planning/AGENTS.md` — baseline AGENTS.md
- `docs/planning/BACKLOG.md` — B040 pending for wave 2
