# Learnings

**Purpose**: Append-only log of earned insights during the build. Newest first. Tag each with the task.

**For Agents**: Add a dated entry when you learn something non-obvious. Keep each tight: what happened →
what you learned → what to do about it.

---

## 2026-08-30

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
