# Next Round Brief — FliHub

**Written**: 2026-03-23 (post tech-debt-round1)

---

## Goal

Ship the app auto-update feature for collaborators (B044) and address remaining structural debt.

## Background

Three campaigns shipped this session:
- **B041 (manage-page-redesign)**: Drawers removed, tool-owned center content, sidebar as pure navigation
- **manage-panel-polish**: Fixed stale closure, dead code, loose types, +41 tests
- **tech-debt-round1**: Typed relay API (B043), +42 naming tests (B032), AWB moved to Manage sidebar (B045)

Total test count: 925 (80 shared + 167 client + 678 server). Build clean.

## Pending Config Task

- **Jan's machineRole**: `ssh janreyes@mac-mini-jan` — set `"machineRole": "editor"` in `~/dev/ad/flivideo/flihub/server/config.json`. Machine was offline during this session.
- **Roamy git pull**: `ssh davidcruwys@MacBook-Pro.local 'cd ~/dev/ad/flivideo/flihub && git pull'` — needs today's code changes.

## Suggested Work Items

### B044 — App auto-update for collaborators (high)
- Jan and Roamy need version notifications + one-click update (git pull + restart)
- Currently must go to terminal and run `git pull` manually
- Server: version check endpoint (compare local git hash to remote). Client: notification banner + update button.
- From feedback F004.

### Structural debt (medium)
- B033: Extract transcription queue state into a class (module-level mutable globals)
- B034: Fix asyncHandler — wrap all routes or remove
- B035: Add React error boundary around tab components
- B036: Replace hardcoded WHISPER_BINARY path with config
- B037: Remove `[FR-89 DEBUG]` console.log statements

### Design iteration (future)
- ManagePanel is 650+ lines with 6 tools — extract tool rendering into sub-components
- Fixed sidebar positioning is fragile — consider layout grid

## Reference
- Assessment: `docs/planning/tech-debt-round1/assessment.md`
- AGENTS.md: `docs/planning/tech-debt-round1/AGENTS.md` (inherit for next wave)
- BACKLOG.md: `docs/planning/BACKLOG.md`

## To Start Next Session

```
/ralphy
```

Then: "Continue from the next-round brief."
