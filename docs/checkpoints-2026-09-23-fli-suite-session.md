# Checkpoint: FliHub in the Fli-suite campaign (2026-09-22 → 23)

This session was a FliHub worker for the peer orchestrators (`d01-work`, later `flivideo-orch`, on
the `uds:/tmp/cc-socks/88202.sock` and `59703` sockets), plus `flistudio`. Every job below is pushed
to `origin/main`. The main checkout, `/Users/davidcruwys/dev/ad/flivideo/flihub`, is at `376459f` plus
this doc, and FliHub was restarted at `376459f` (server + client) after an idle check. It is live on
loopback only.

## Current step
**Idle, waiting on flivideo-orch.** The d04 UAT preflight probe (REST-only take workflow) is reported and
cleaned up. The orchestrator's plan is `/Users/davidcruwys/dev/ad/brains/docs/handovers/deliver-2026-09-23-B587-B588-d04-uat.md`
(§4 D3/D7). Standing ruling: no FliHub feature work, and don't adopt the agent layer. Nothing is half-built.

## Progress
### Done (commit → what)
- [x] `b3ab831` b-roll lane deprecated (docs only; the code is untouched on purpose)
- [x] `43c7365` → `0e8b92d` → `8b344ec` → `a076acc` hub layout: `getProjectPaths` delegates to fli-core
      `projectLayoutSync`. Option A: a folder with no recordings anywhere is hub. Transcriptions misfile fixed
- [x] `7a5fc7d` step 4: `POST /api/projects` creates only the folder, so new projects are hub
- [x] `19ddd05` + `49894aa` relay and git sync removed (−7,471 lines)
- [x] `ba8f45a` fli-core v0.3.0: video names are kebab, not numbered (D15)
- [x] `ae2d9b1` always-visible trash pill + `GET /api/projects/:code/trash`; fli-core v0.6.0 (`TRASH_FOLDER`)
- [x] `95bfe6e` aspect-mismatch warning at ingest (ffprobe + cropdetect), row chip until dismissed
- [x] `2fddba7`, `283935b`, `e17e5b7` doc set (mirror, SYSTEM, AGENT-NOTES, README to the suite template); all
      three dev-team 0.4.3 gates exit 0. MIT LICENSE added
- [x] `flihub-storage-panel` worktree and branch removed (0 unique commits)
- [x] `299a048` read-only audit `/Users/davidcruwys/dev/ad/flivideo/flihub/docs/agent-drivable-audit.md`
      (5 HAVE · 9 PARTIAL · 8 MISSING · 2 N-A)
- [x] `ff05bae` API on 127.0.0.1 + ::1; a non-loopback browser Origin gets 403 `foreign-origin` (REST + socket.io)
- [x] `34100d1` + `143191e` Vite on 127.0.0.1. A tracked stale `client/vite.config.js` shadowed the `.ts`
- [x] `376459f` stale tsc output deleted (`shared/*.js|d.ts`, `client/vite.config.*`), gitignored, and
      `client/tsconfig.node.json` now emits to `node_modules/.tmp`. Aspect race fixed: `/rename` checks the promoted
      file if the ingest probe hadn't landed, and returns `aspect: 'pending' | <status>`
- [x] d04 preflight probe (no code). Path: POST /api/context → cp to `/Users/davidcruwys/ecamm` → GET /api/files
      (wait for `aspectCheck`) → POST /api/rename → poll GET /api/transcriptions/status/:filename to `complete`.
      Scratch `z99-uat-probe` deleted; d01 is active again
- [x] `d42e01e` FR-172 ticket only (2026-09-24): Whisper prompt from fli-core v0.11.0 `readWords`; low, for the rebuild

### Blocked on David
- [ ] Nothing. B&J a01 now has `aspect` 9:16 (v-beauty-and-joy `ccb25b8`), and the stale files are deleted

### Pending (low priority, when the code is next touched)
- [ ] Remove the legacy `recording-shadows` entry from `HEAVY_SUBFOLDERS`
      (`server/src/utils/storageTree.ts`) and the `diskUtils` note. David approved; the folders are already in `~/.Trash`
- [ ] Switch FliHub's Whisper worker over to the FliTools service (B584) when the orchestrator says so.
      Inventory already sent (Lane F)

## Before starting the next step
- **David's FliHub is often live.** Never edit the main checkout while it runs: nodemon recycles on
  `server/src` edits and Vite hot-reloads client edits into his open tab. Work in a worktree off
  `origin/main`, `git push origin HEAD:main`, remove the worktree, and tell him the pull line
  (`git pull && npm install && overmind restart server`; drop `npm install` when no dependency changed).
- **Pin bumps:** `npm install @flivideo/core@github:flivideo/fli-core#vX -w server -w shared`, then check that
  the lockfile resolves to the tag's commit. A plain `npm install` kept the old version twice.
- **Doc gates** (dev-team 0.4.3, `/Users/davidcruwys/dev/ad/appydave-plugins/dev-team/skills/`):
  `verify_mirror.py docs/schema-mirror.json`, `check_context.py .`, `check_readme.py . --ref origin/main`.
  Read the skill files from disk; the loaded skill text in an old session may be stale.
- Test counts at `e17e5b7`: shared 111 · server 552 (+1 skipped, `npx vitest run --exclude 'dist/**'`) ·
  client 329.

## Ruled out this window
- **FliHub-owned detection rule** (its own `detectProjectLayout`): replaced by fli-core, so the two apps
  can never disagree about a folder
- **"hub/ exists → hub"**: a stray empty `hub/` would have hidden a legacy project's recordings
  (a silent-empty project). Superseded by option A
- **Relay guards left permanently false**: rejected. The guards were deleted outright with relay
- **Moving all of `hub/` on hold**: rejected. Only `hub/recordings` travels, and transcripts stay local (David)
- **Assuming fli-core's 16:9 default when a project has no aspect**: rejected. An unset aspect is
  skipped, so projects that never declared an aspect don't shout
- **Hand-patching the mirror JSON's root**: an old workaround. The 0.4.0 extractor records a relative
  `..`; never hand-edit the mirror
- **Trusting the orchestrator's predicted gate findings**: two didn't reproduce (SYSTEM.md anchors, dead
  sources). Report what the gate actually says
- **Reading the plan's "GET /incoming" as the pending-takes route**: wrong. `/api/assets/incoming` is image
  assets; pending takes are `GET /api/files`
- **A hand-written scratch `fli.studio.json` with code `zz99`**: fli-core reads it as invalid (codes are one
  letter plus two digits), so the aspect check says "no aspect set". Use a code like `z99`
- **Fixing the Vite bind in `vite.config.ts` alone**: no effect while the tracked `vite.config.js` existed
