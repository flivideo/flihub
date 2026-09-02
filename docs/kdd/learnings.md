# Learnings

**Purpose**: Append-only log of earned insights during the build. Newest first. Tag each with the task.

**For Agents**: Add a dated entry when you learn something non-obvious. Keep each tight: what happened →
what you learned → what to do about it.

---

## 2026-09-02

- **[query-layer] The query layer's output shape is not derived from the model it describes,
  and nothing internal consumes it — so nothing internal notices when it drifts.** (Named by
  video-projects-orch, 2026-09-02, from three same-day instances in this repo:
  `/api/query/config` serving the abandoned 4-value stage vocabulary
  (`routes/query/index.ts:44`, hardcoded literal); `/api/query/projects` listing non-project
  folders (`catalog`, `poem`, `tools`, `docs`) as projects; and `brand` serialised per-ROW when
  it is per-ROOT (`query/projects.ts:105-107`, `182-184`) — shape implying that two projects in
  one listing could differ in brand when they structurally cannot.) The class, not the
  instances: hand-maintained response literals + zero internal consumers = an interface that
  only external agents read and only external agents can catch lying. Fix-class: derive
  response vocabularies from the model's own constants (`DEFAULT_PROJECT_STAGES`, the union),
  and serialise per-collection facts at the collection level. A fourth instance, if it exists,
  is in the remaining query endpoints. Fixes held for David.

- **[ops] A wrong path in a handover doc propagates as fact — three flags to fix the flihub
  skill died because they cited `~/.claude/skills/flihub/SKILL.md`, which does not exist.**
  The real source is `~/dev/ad/appydave-plugins/flivideo/skills/flihub/SKILL.md` (plugin repo;
  installed copies under `~/.claude/plugins/cache/`). The bad address came from this repo's own
  `docs/handover-miccheck-query.md` and was repeated verbatim each time. Rule: before flagging
  a file for someone else to edit, `ls` the path once — a flag with a dead address reads as
  actioned and silently is not. (Same session: `/api/query/config` found serving a hardcoded
  pre-FR-80 stage list `['none','recording','editing','done']` disproven by its own project
  data — endpoint defect recorded, fix held for David.)

## 2026-08-31

- **[FR-159] A dedupe gate that never re-checks its ground truth becomes a permanent silent
  veto.** `queueTranscription` skipped any base name in the in-memory last-5 `recentJobs` with
  status `complete` — but the gate above it already returns when the transcript EXISTS, so this
  gate could only ever fire when the transcript was MISSING (delete-then-re-record trashes the
  old transcript with the old take). Every skip path returned `success:true, job:null` with no
  toast, so "failed", "skipped" and "not pressed" were indistinguishable for four days; telemetry
  showed zero failures because whisper genuinely never failed — the work was refused upstream.
  Fix-class: a cache/dedupe entry is only as good as the artifact it stands for — verify the
  artifact before honouring the entry, and every refusal an API makes must carry a reason the UI
  shows. Diagnosis rule: "button does nothing" + zero errors anywhere = look for a silent skip
  gate, not a failing worker.

- **[FR-158] A right-edge hover flyout's hit area is its CONTAINER, not its visible tab — a
  translated-away panel still leaves a ~300px invisible hover strip over the content.** The
  Chapters/Help/DAM slide-outs used `group-hover` on a fixed container whose width came from the
  hidden panel (`translate-x-full` moves rendering AND hit-testing, but the parent box stays), so
  approaching any `⋯` menu near the right edge popped a panel over it — the menus were
  unreachable. Fix-class: edge flyouts are click-to-open with `pointer-events-none` on the closed
  container (only the tab re-enables events); hover may highlight, never open. Diagnosis rule:
  when hover triggers "too early", measure the hover element's box, not its visible pixels.

## 2026-08-30

- **[FR-157] "Replace the wrong thing on screen" is not the same as "show the right thing".** The
  first UI pass swapped the chapter *name* (dash notation David types, files keyed by it) for the
  new *title* wherever the name appeared — fixing the mangled ch03 display by silently conflating
  two concepts. David's rule from the redo: when a new field is a different KIND of thing, add it
  beside the old one (secondary, editable in place), never substitute. Ask "what does this label
  mean to the person reading it" before choosing which field a heading shows.

- **[FR-157] "Chapters" are derived in THREE places, and two of the three timestamp columns
  measure different things.** Recordings view groups `NN-` prefixes client-side and sums raw take
  durations for `starts @`; `/api/query/…/chapters` + FR-34 take names/timestamps from a final
  SRT (null without one); `/api/poem-wui/chapter-data` re-derives names from filenames. A fix in
  any one leaves the others stale — the FR-157 title landed in the API and the UI kept showing the
  slug. Convergence rule used: one server helper over the one store, every consumer reads it, and
  do NOT unify fields that only share a name (raw-cumulative vs final-cut timestamps). Before
  touching a "chapter" anything: `grep -rn 'NN-\|/^(\\d{2})-/'` across client + server first.

- **[FR-157] `writeProjectState()` is an ALLOWLIST — a new field on `ProjectState` is silently
  dropped on the next write unless you also add it to the spread in
  `server/src/utils/projectState.ts`.** Adding `title`/`chapters` to the type alone would have
  round-tripped once and vanished on the next dictionary or safe-flag save. Same class as
  Captain's Log's *Diff-the-generated-artifact* pattern (field mappers drop what they don't
  name). Rule: after adding a state field, write it, then trigger an unrelated state write and
  re-read the file.

- **[process] An investigation step in a ticket is worth more than the ticket.** A relayed
  ticket for "persist chapters with slug/marker/youtube + a project-shape flag" was written from
  the `flihub` skill doc, not the code. A 20-minute read-only §1 killed three premises before a
  line was written (chapters aren't SRT-derived here; the mangled name is on disk, not computed;
  no `title` field exists anywhere) and the ticket collapsed to two fields. Rule: when a ticket
  describes your own system from the outside, verify every premise against source and the live
  API first, and treat each mismatch as a finding — then re-scope before designing.

- **[ch03-name] Chapter names are not derived at read time — they ARE the filenames, so a
  mangled chapter name means a mangled rename, and it lives on disk.** `d01-kybernesis` ch03 read
  `why-agents-need-governed-memorywhy-ai-pilots-becom`: the new name (31 chars) prepended to the
  previous name (ch02's, carried into the ch03 take), clipped at exactly 50 by `sanitizeName()`'s
  silent `.slice(0, maxLength)` (`shared/naming.ts:334`) / the input's `maxLength={50}`. The
  orphan `03-1-why-ai-pilots-become-dead-ends.*` transcript is the fossil of the pre-rename name.
  Diagnosis rule: when a chapter name looks concatenated, `ls recordings/` first — the API has no
  chapter store to be wrong in (`GET …/chapters` counts `NN-` prefixes; names come only from
  `extractChapters` over a final SRT, absent here → "Chapter N"). A truncation that never errors
  is the class: clamps should reject, not slice.

- **[ops] Never launch FliHub with `npm run dev` — it collides with the Overmind instance David
  actually runs.** `npm run dev` is the `concurrently` path; it binds 5100/5101 itself, so on a
  machine where Overmind already supervises FliHub it either fails with `EADDRINUSE` or (via the
  server's startup port-cleanup) kills the supervised server out from under every tool that reads
  the API. Rule: `overmind ps` first; if it's up, use `overmind restart server|client`. Only ever
  start via `overmind start -D`. Source: `CLAUDE.md` → Dev Server Management.

- **[ops] `./start.sh` is the FOREGROUND mode and dies with its window — it is not the persistent
  launcher, despite what `CLAUDE.md` said until 2026-08-26.** It runs `overmind start` under
  `trap 'rm -f ./.overmind.sock' EXIT INT TERM`, so the window *is* the supervisor: close it and
  the trap deletes the socket and tears everything down. Backgrounding it (`./start.sh &`,
  `nohup`) is worse — the trap fires on return, leaving live processes the CLI can no longer
  reach. Rule: `overmind start -D` for normal use; `./start.sh` only when you want live logs and
  will keep the window. Incident: `docs/operations/server-stability-issues.md` (2026-08-26).

- **[ops] `pkill overmind` takes down AngelEye and Captain's Log, not just FliHub.** Three apps
  share one Overmind binary on this machine (`~/dev/ad/apps/angeleye`,
  `~/dev/ad/apps/captains-log`, this repo), each with its own supervisor process. A name-based
  kill is a fleet outage with no warning. Rule: identify the target supervisor by its **cwd**
  (`lsof -a -p <pid> -d cwd`) and `kill` that single PID; never match on the process name.

- **[ops] Orphaned supervisor recovery: `overmind ps` errors but processes are alive → the socket
  was deleted, not the supervisor.** A hard-closed `start.sh` window fires the EXIT trap (socket
  gone) but `overmind start` + its tmux session survive, one orphan per hard close; `start.sh`
  never reaps them because its `overmind stop` needs the socket that was just removed. Recovery
  runbook lives in `CLAUDE.md` → *Recovering an orphaned supervisor*: find the overmind whose cwd
  is `…/flivideo/flihub`, `kill -9` only that PID, `rm -rf "${TMPDIR}"overmind-flihub-*`,
  `rm -f .overmind.sock`, clear 5100/5101, `overmind start -D`.

## 2026-01-02

- **[FR-123] Verify which endpoint the client actually calls BEFORE editing a route handler.**
  Spent ~90 min debugging an annotation field in `server/src/routes/query/recordings.ts` (handles
  `/api/projects/:code/recordings`) while the client was calling `/api/recordings`, served by
  `server/src/routes/index.ts`. Grep found a similar-sounding route and the assumption was never
  checked; debug logs that never appeared were the tell. Fix was 3 lines in the right file.
  Rule: before touching any API handler — (1) read the client hook for the exact path,
  (2) trace where that path is mounted in the server, (3) edit only that handler. When added
  logs don't show, stop adding logs and confirm the code is even running.
