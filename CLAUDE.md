# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

---

## Quick Reference

- `/progress` - Get quick project status
- `/po` - Product Owner mode (requirements, specs)
- `/dev` - Developer mode (implementation)
- `docs/backlog.md` - Active requirements
- `docs/changelog.md` - What's been implemented

---

**System context**: See [CONTEXT.md](CONTEXT.md) for purpose, core abstractions, key workflows, design decisions, non-obvious constraints, expert mental model, scope limits, and failure modes.

## Project Overview

FliHub is a TypeScript application for managing video recording workflows. It watches for new recordings from Ecamm Live, provides a web UI for naming/organizing files, and manages project assets.

## Documentation

All documentation lives in `docs/`:

```
docs/
├── prd/              # Feature specs (FR-8, FR-30, etc.)
├── architecture/     # API reference, patterns, sockets
├── guides/           # Setup guides, troubleshooting
├── archive/          # Completed requirements (historical)
├── backlog.md        # Active requirements
├── changelog.md      # Implementation history
└── README.md         # Documentation index
```

**Key files:**

- `docs/backlog.md` - Current FRs/NFRs with status
- `docs/prd/*.md` - Detailed feature specifications
- `docs/architecture/patterns.md` - Code conventions
- `docs/kdd/` - Learnings + patterns (KDD). **Mandatory:** when you learn something non-obvious,
  hit a gotcha twice, or fix a bug whose cause wasn't where you looked, capture it via the
  `appydave:lisa` skill before moving on — reconcile against `docs/kdd/learnings.md` first,
  bump rather than duplicate. No hook fires this; it is on you.

## Slash Commands

| Command     | Purpose                                        |
| ----------- | ---------------------------------------------- |
| `/po`       | Product Owner - requirements, specs, handovers |
| `/dev`      | Developer - implementation                     |
| `/uat`      | User acceptance testing                        |
| `/progress` | Quick project status check                     |
| `/jan`      | WSL collaborator support                       |

## PO Practices

**Handling Developer Handovers:**

Due to context limits, conversations may be split across sessions. Before issuing a handover to the developer:

1. **Check backlog status first** - Read `backlog.md` to see if the FR is already marked `✓ Complete`
2. **If complete** - Ask for sign-off verification instead of re-issuing the handover
3. **If pending** - Proceed with standard handover

**When receiving completion handovers:**

- Update `backlog.md` and `changelog.md` immediately before context splits
- Don't batch multiple completion updates

**When resuming from summary:**

- Re-read `backlog.md` to get accurate current state before taking action

## Commands

```bash
npm install              # Install all workspace dependencies
npm run dev              # Start both server (5101) and client (Vite dev server)
npm run build            # Build server then client

# Individual workspaces
npm run dev -w server    # Server only (Express + Socket.io on port 5101)
npm run dev -w client    # Client only (Vite React dev server)
npm run build -w client  # Build client: tsc -b && vite build
```

## Dev Server Management

Before starting any dev server, check if it is already running:

```bash
lsof -i :5100 | grep LISTEN
lsof -i :5101 | grep LISTEN
```

If a process is listed, the service is UP — do not restart it, do not change ports. Never kill a running dev server unless explicitly asked.

### Two launch modes — pick deliberately

| Mode           | Command            | Owns a terminal window?  | Use when                                                |
| -------------- | ------------------ | ------------------------ | ------------------------------------------------------- |
| **Detached**   | `overmind start -D` | No — returns your prompt | Normal use. Survives closing the window.                |
| **Foreground** | `./start.sh`       | **Yes**                  | You want live colour-coded logs + browser auto-open     |

> ⚠️ **`./start.sh` does NOT survive a terminal close.** It runs `overmind start` in the
> foreground under `trap 'rm -f ./.overmind.sock' EXIT INT TERM`. Close the window and the
> trap fires, the control socket is deleted, and every FliHub process dies with it.
>
> *This file previously claimed `./start.sh` was the "survives terminal close" option. It is
> the opposite. Corrected 2026-08-26 after a live incident — see
> [docs/operations/server-stability-issues.md](docs/operations/server-stability-issues.md).*

> ⚠️ **Never background `start.sh`** (`./start.sh &`, `nohup ./start.sh`). The EXIT trap
> deletes `.overmind.sock` the moment the script returns, so `overmind ps` / `restart` /
> `quit` all stop working *even though the processes are still alive* — an orphan the CLI
> can no longer reach. Use `overmind start -D` instead.

### Commands (run from repo root)

```bash
overmind start -D        # start detached — the normal way
overmind ps              # what's running
overmind echo            # tail combined logs (Ctrl-C stops watching, NOT the server)
overmind connect server  # attach to server pane (Ctrl+B then D to detach)
overmind restart server  # recycle the API (5101) only — leaves Vite/HMR alone
overmind restart client  # recycle the UI (5100) only
overmind quit            # stop everything (daemonized instance)
overmind stop            # stop everything (foreground instance)
```

`overmind restart <proc>` talks over `.overmind.sock`, so it works from **any** terminal —
you never need to find the window that launched it.

### Recovering an orphaned supervisor

**Symptom:** `.overmind.sock` is missing, or `overmind ps` errors, while `overmind start`
processes are still alive. Cause: a hard-closed window fired the EXIT trap (socket deleted)
but left the supervisor and its tmux session running.

```bash
# 1. Identify FliHub's overmind by its cwd — other apps use Overmind too
ps aux | grep "overmind start" | grep -v grep | awk '{print $2}' | \
  while read p; do echo "$p $(lsof -a -p $p -d cwd -Fn 2>/dev/null | grep ^n | cut -c2-)"; done

# 2. Kill only the one whose cwd is .../flivideo/flihub, plus its tmux
kill -9 <pid>
rm -rf "${TMPDIR}"overmind-flihub-*
rm -f ./.overmind.sock

# 3. Clear ports, then relaunch
for port in 5100 5101; do
  pids=$(lsof -ti :$port 2>/dev/null); [ -n "$pids" ] && echo "$pids" | xargs kill -9 2>/dev/null
done
overmind start -D
```

> ⚠️ **Other Overmind apps run on this machine** — AngelEye (`~/dev/ad/apps/angeleye`) and
> Captain's Log (`~/dev/ad/apps/captains-log`). Always confirm the process cwd before
> killing. `pkill overmind` would take all of them down.

---

## Architecture

**Monorepo Structure** (npm workspaces):

- `client/` - React 19 + Vite + TailwindCSS v4
- `server/` - Express + Socket.io, file watchers (chokidar)
- `shared/` - TypeScript types and utilities

**Server (`server/src/`)**:

- `index.ts` - Express app setup, Socket.io, config management
- `WatcherManager.ts` - File watcher management
- `routes/index.ts` - Recording rename, project management
- `routes/assets.ts` - Image asset management
- `routes/thumbs.ts` - YouTube thumbnail management
- `routes/system.ts` - System operations (open Finder)

**Client (`client/src/`)**:

- `App.tsx` - Main app with tab navigation
- `hooks/useSocket.ts` - Socket.io connection
- `hooks/useApi.ts` - React Query hooks
- `components/` - UI components

**Shared (`shared/`)**:

- `types.ts` - TypeScript interfaces
- `naming.ts` - Naming validation and parsing
- `paths.ts` - Path utilities
- `constants.ts` - Shared constants

## Key Concepts

**Recording Naming Convention**: `{chapter}-{sequence}-{name}-{tags}.mov`

- Chapter: 2 digits (01-99)
- Sequence: 1+ digits (1, 2, 3...)
- Name: kebab-case descriptive name
- Tags: optional uppercase tags (CTA, SKOOL)
- Example: `10-5-intro-CTA.mov`

**Image Asset Naming**: `{chapter}-{seq}-{imgOrder}{variant}-{label}.{ext}`

- Example: `05-3-2a-workflow.png`

**Project Directory Structure**:

```
project-root/
├── recordings/           # Named video recordings (.mov/.mp4)
│   ├── -safe/            # Protected recordings
│   └── -chapters/        # Generated chapter videos (FR-58)
├── recording-shadows/    # Low-res video shadows for collaborators (FR-83)
├── recording-transcripts/# Whisper transcripts (.txt + .srt)
├── inbox/                # Incoming content staging (FR-59)
│   ├── raw/              # Dumps, notes, links
│   ├── dataset/          # Structured data
│   └── presentation/     # HTML visual assets
├── assets/
│   ├── images/           # Assigned image assets + prompts
│   └── thumbs/           # YouTube thumbnails
├── final/                # Final edited video + SRT
└── s3-staging/           # Files shared with editor via S3
```

**Configuration** (`server/config.json`):

- `watchDirectory` - Where Ecamm Live saves recordings
- `projectDirectory` - Current active project path
- `availableTags` - Tags available for recordings
- `commonNames` - Quick-select names with autoSequence rules
- `imageSourceDirectory` - Where to look for incoming images

## Real-time Updates

Socket.io events:

- `file:new`, `file:deleted`, `file:renamed` - Recording changes
- `recordings:changed` - Recording folder changes
- `assets:incoming-changed`, `assets:assigned-changed` - Image changes
- `thumbs:changed`, `thumbs:zip-added` - Thumbnail changes
- `projects:changed` - Project folder changes

## Machine Inventory

FliHub runs on multiple machines. **Never rediscover this — use this table.**

| Machine | Hostname | SSH User | machineRole | Network | Notes |
|---------|----------|----------|-------------|---------|-------|
| Mac Mini M4 (David) | `mac-mini-m4.local` | `davidcruwys` | `creator` | .local + Tailscale | Primary workstation, Ecamm recordings |
| MacBook Pro M4 (Roamy) | `MacBook-Pro.local` | `davidcruwys` | `editor` | .local + Tailscale | David's laptop, field machine |
| Mac Mini M2 (Bot) | `mac-mini-m2.local` | `davidcruwys` | — | .local + Tailscale | Headless bot, no FliHub |
| Jan's Mac Mini | `mac-mini-jan` | `janreyes` | `editor` | Tailscale ONLY | Philippines — no .local |
| Mary's Mac Mini | `mac-mini-mary` | `mary` | `editor` | Tailscale ONLY | Philippines — no .local |

**Key rules:**
- Jan is **he/him**, username `janreyes` — NOT `davidcruwys`
- Philippines machines are Tailscale-only — `.local` will NOT resolve
- `machineRole` is set in `server/config.json` — `creator` (records video) or `editor` (edits video)
- If `machineRole` is missing, it defaults to `recorder` (legacy alias for creator)
- Mac Mini M2 does not run FliHub

**Authoritative source**: `~/dev/ad/agent-os/ansible/inventory/hosts.yml`

## Operating Rules (earned locally)

**A refusal that looks like success is a defect — even when refusing is correct.**
When an operation declines, skips, or no-ops, the response and the UI must say WHICH,
because "failed", "skipped" and "not pressed" are otherwise the same pixels.
Earned 2026-08-31 (FR-159): `POST /api/transcriptions/queue` returned `success:true, job:null`
for a silently vetoed job, no client path toasted a null job, and the queue-all toast claimed
*"All videos already have transcripts"* while two recordings sat untranscribed for four days.
Reference implementation: `/queue` now returns a `reason` on skip and the toast reports
"nothing queued". Corollary from the same bug: **a gate whose correct case is unreachable can
only ever fire wrongly** — the `recentJobs` "recently transcribed" check sat below a gate that
already returned whenever a transcript existed, so it exclusively blocked legitimate work.
Related fact a future session needs: **FliHub has no log file** — server output goes only to
the Overmind tmux pane (`overmind connect server`), so silent failures leave no trail.

**The live-instrument rule.** David uses FliHub *during* recording days. While he is using it
in anger, no visual or behavioural change reaches the running app unannounced — HMR makes
shipping frictionless, which is exactly the hazard. Say in one line what is about to change
(and that nodemon will recycle 5101, when touching `server/src/`) BEFORE the edit lands.
This is not "stop shipping": mid-shoot fixes are often right — keep the speed, add the line.
Tests, types and docs are exempt.

## Git Workflow

Semantic commit helpers:

- `kfeat "message"` - New features
- `kfix "message"` - Bug fixes
- `kchore "message"` - Maintenance
- `kdocs "message"` - Documentation
