# Next Round Brief — FliHub

**Written**: 2026-03-22 (post requirements capture session)

---

## Resume Point

**Mode**: Ralphy Extend — ready to write IMPLEMENTATION_PLAN.md + update AGENTS.md

**Requirements brief**: `docs/planning/requirements-manage-relay-refactor.md` — fully captured, 7/8 questions resolved.

**Decisions confirmed by David**:
- Manage page layout: keep left sidebar, wider right panel (50-60%), context-sensitive centre content
- S3 Staging: remove entirely (relocate AWB send)
- Archive to T7: deferred (no code exists, out of scope)
- Machine role: single `machineRole` config field, not a role management system
- Two waves approved

---

## Campaign: manage-relay-refactor

### Wave 1: Foundation (fix bugs + layout refactor + machineRole)

Estimated 5-6 work units:
1. **security-fixes** — replace `bash -lc` with `execFile` in relay.ts + system.ts; fix rsync parser to find filename after first space; add `.DS_Store` exclusion to rsync
2. **relay-route-guards** — add `relayEnabled` check to all relay routes; validate `projectCode`; fix WatcherManager relay toggle bug
3. **machine-role-config** — add `machineRole: 'recorder' | 'editor'` to Config interface + types; expose via API
4. **manage-layout-refactor** — wider right panel, context-sensitive centre content, workflow-ordered sidebar; remove "Simple Tools" / "Complex Tools" labels
5. **retire-s3-staging** — remove S3StagingTool; relocate AWB send to standalone location; clean up S3-related hooks
6. **relay-tests** — parseRsyncDiff unit tests, relay route integration tests, git-sync tests

### Wave 2: Relay Features (folder browser + push/collect + promote + visual indicators)

Estimated 4-5 work units:
1. **relay-folder-browser** — API to scan relay directory; show per-project breakdown (recordings, edit-1st, edit-2nd); file counts + sizes
2. **relay-push-collect-full** — push/collect for all edit levels (not just recordings); proper preview with correct file naming
3. **promote-to-final** — select approved version from edit-2nd, copy to final/
4. **role-based-visibility** — show/hide buttons based on machineRole (recorder: push/archive/cleanup; editor: ingest/push-edits)
5. **visual-indicators** — project pipeline status at a glance (what's in relay, what's been sent/received, what stage)

---

## What Was Done This Session

1. Both machines configured for relay (config.json + relay folder + SyncThing shared folder)
2. SyncThing `flihub-appydave` folder created and sync verified between M4 Mini and MacBook Pro
3. `.stignore` created for DS_Store exclusion
4. Browsed full Manage & Export UI via Playwright — identified layout problems
5. Requirements brief written and committed
6. Relay workflow diagrams written and committed
7. Discovered Jan's versioning convention from real s3-staging data (`{project-code}-final-v{N}.mp4`)
8. Discovered archive structure on T7 drive (`/Volumes/T7/youtube-PUBLISHED/appydave/`)

---

## To Start Next Session

```
/ralphy
```

Then say: "Continue from the next-round brief — we're in Extend mode, ready to write the implementation plan for wave 1."

The brief, requirements doc, relay diagrams, and both AGENTS.md files have everything needed.

---

## Reference Files

- `docs/planning/requirements-manage-relay-refactor.md` — full requirements
- `docs/planning/relay-workflow-diagrams.md` — file flow diagrams
- `docs/planning/relay-collaboration-phase-1/AGENTS.md` — relay-specific AGENTS.md (inherit this)
- `docs/planning/AGENTS.md` — baseline AGENTS.md
- `docs/planning/BACKLOG.md` — project backlog (B038 relay phase 1 in progress)
