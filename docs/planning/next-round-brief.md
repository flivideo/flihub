# Next Round Brief — B044 Sync Hub

**Written**: 2026-03-23 (post relay-redesign campaign)

---

## Goal

Build the Sync Hub (B044) — two-channel push/pull for app code + video projects with persistent header indicators and conflict handling.

## Background

**Relay redesign (B046) shipped this session** — workflow lanes, file drawers, activity feed, toasts, setup guide. Plus post-campaign hotfixes: machineRole detection, push button enable logic, setup guide rewrite.

**What exists now**:
- `useGitSync()` hook + `POST /api/system/git-sync` — pull-only on video project repo
- "Git Sync" button in ToolsSidebar under Actions — gets replaced by Sync tool page
- SyncThing configured for relay file sync between 3 machines

**What's missing** (the B044 scope):
- No push capability from UI — David must use terminal
- No dirty-state detection — nobody knows when something needs syncing
- No version check — collaborators don't know when to pull
- No conflict handling — a failed pull just shows a generic error toast

## Pending Config Tasks

- **Jan's machineRole**: `ssh janreyes@mac-mini-jan` — set `"machineRole": "editor"` in `~/dev/ad/flivideo/flihub/server/config.json`. Machine was offline.
- **SyncThing**: FliHub AppyDave folder needs to be shared with `mini-jan` device (currently only shared with macbook-pro-m4)

## B044 — Sync Hub

### Two sync channels
1. **App Code** (`~/dev/ad/flivideo/flihub`) — David pushes code, collaborators pull + rebuild + restart
2. **Video Project** (`~/dev/video-projects/v-appydave`) — David pushes after recording, collaborators pull

### UX requirements (from David)
- Persistent header indicators visible on ALL pages — green=clean, amber=behind, red=dirty, purple=conflict
- Not flashing but always visible
- Conflict detection with resolution UI (keep mine / keep theirs / show diff)
- Notifications: David sees dirty state, Jan sees "update available"

### Mockup
`.mochaccino/designs/sync-hub/index.html` — 5 interactive scenarios

### Suggested work units
1. Server: git status endpoints (local hash, remote hash, dirty count, behind count) for both repos
2. Server: git push/pull/commit endpoints with conflict detection
3. Client: SyncTool.tsx page under Manage → Collaborate → Sync
4. Client: SyncIndicator component in App.tsx header (persistent)
5. Client: conflict resolution UI
6. Server: polling or socket for remote change detection

### Config
- `appCodeDirectory` (or derive from process.cwd())
- `projectsRootDirectory` (already exists)
- Paths differ per machine

### Code to build on
- `useGitSync()` in `client/src/hooks/useSystemApi.ts`
- `POST /api/system/git-sync` in `server/src/routes/system.ts`
- Inherit AGENTS.md from `docs/planning/relay-redesign/AGENTS.md`

## Other pending items (medium/low)
- B033: Extract transcription queue state into a class
- B034: Fix asyncHandler
- B035: React error boundary
- B036: Replace hardcoded WHISPER_BINARY
- B037: Remove FR-89 DEBUG console.logs

## To Start Next Session

```
/ralphy
```

Then: "Extend for B044 Sync Hub — use the next-round brief."
