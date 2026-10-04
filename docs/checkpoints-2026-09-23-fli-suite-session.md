# Checkpoint: FliHub in the Fli-suite campaign (2026-09-22 → 27)

This session is a FliHub worker for the peer sessions `flivideo-orch` (now `uds:/tmp/cc-socks/62890.sock`),
`flitools` (`62190`) and `d06-work` (`99527`). Every job below is pushed to `origin/main`. The main checkout
`/Users/davidcruwys/dev/ad/flivideo/flihub` is live at `a1c3f85` (B584 merge) plus docs-only commits. It runs
under Overmind, loopback only. Health: `/api/system/health`.

## Current step
**Idle, waiting on flivideo-orch.** B584 is live: FliHub transcribes through FliTools :7161. The d06 loops are
re-transcribed clean. Nothing is half-built, and no branch or worktree is open. Standing rulings:
- no FliHub feature work unless orch/David asks;
- never pull, merge or restart the main checkout without David's window plus an idle check (pulling IS the restart);
- build in a worktree off origin/main and push with `git push origin HEAD:main`.

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
- [x] `112bb84` next-code also counts fli.studio.json codes and raises a stale high-water mark
- [x] `6a9503e` /recordings keeps filename tags (was [] for every file); template Seq = highest on disk + 1 after rename/undo (gaps NOT refilled — flagged to orch)
- [x] `35d9e17` a transcript attaches only if newer than its recording (isTranscriptFresh); Undo trashes the undone take's transcripts. d01 01-2 re-transcribed live (stale files in d01 -trash as *.stale-0639.*)
- [x] `b63c20c` player modal SRT lookup uses the full base name incl. tags; tags shown as coloured pills
- [x] Restart 2026-09-25 (David's go, via orch): live at b63c20c. v-appydave mark is d05; d01 shows tags ["HOOK"]; SRT 200. Health is at /api/system/health (not /api/health)
- [x] `c2fbde1` aspect: a ~16:9 inset picture (Ecamm screen-share + PIP, cropdetect box drifts ~1.8) is ok with a soft note, and only >20% off counts as wrong shape. Live 2026-09-27 (David's go); all three d06 Incoming takes re-probe ok
- [x] `a1c3f85` B584 LIVE (David's go, 2026-09-27): FliHub transcribes through FliTools :7161 (pid 26286, 97602fc). force_save; the language comes from fli.studio.json; suspect shows as a red T⚠. d06 03-2-setup + 04-1-annotate re-done as the caller: both suspect:false with clean tails; the looped originals are in d06 -trash/2026-09-27-pre-flitools/

- [x] `b06024f` transcript health reads any `flitools.transcript/<n>` schema (ready for transcript/2)
- [x] engine copies (David's transcript naming ruling, 2026-10-04): undo, rename and trash-recording carry
      `transcripts/engines/<base>.<engine>.*`; engines/ is never counted as a recording or orphan. Not restarted on
      the M4 (David restarts it himself); orch pulls onto Roamy

### Blocked on David
- [ ] Nothing. B&J a01 now has `aspect` 9:16 (v-beauty-and-joy `ccb25b8`), and the stale files are deleted

### Pending (low priority, when the code is next touched)
- [ ] Remove the legacy `recording-shadows` entry from `HEAVY_SUBFOLDERS`
      (`server/src/utils/storageTree.ts`) and the `diskUtils` note. David approved; the folders are already in `~/.Trash`
- [ ] docs/SYSTEM.md is stale since 95bfe6e (check_context). Refresh the narrative when there's time; don't just bump its marker
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
- **language "auto" on every FliTools submit**: rejected (flitools flagged it, orch ruled option 1). Auto misreads short takes and health can't see it. Use the project's fli.studio.json `languages`
- **d06-work's two-flag whisperArgs stop-gap**: never applied (cancelled); B584 removed whisperArgs
- **FliHub trashing old transcripts before submitting to FliTools**: rejected (orch + flitools). A failed job left the take with no transcript, and it would bin FliCut's fresh FliTools files. Use force_save
- **Refilling sequence gaps (lowest unused)**: rejected, and orch agreed. A sequence is take order, so the rule is highest on disk + 1
- **Hash-matching transcripts to recordings**: rejected for now. Hashing a multi-GB .mov on every status poll is too slow; mtime order is the guard
- **`git pull` in the main checkout "just to look"**: that IS the restart. Always use `git fetch` plus a worktree
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
