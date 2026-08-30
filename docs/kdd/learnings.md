# Learnings

**Purpose**: Append-only log of earned insights during the build. Newest first. Tag each with the task.

**For Agents**: Add a dated entry when you learn something non-obvious. Keep each tight: what happened →
what you learned → what to do about it.

---

## 2026-08-30

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
