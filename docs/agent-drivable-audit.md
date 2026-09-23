# FliHub — agent-drivable audit

**Status**: read-only audit, 2026-09-23, true at `e17e5b7`. Measured against the FliCast reference
checklist ([`flivideo/flicast` `docs/agent-drivable-reference.md`](https://github.com/flivideo/flicast/blob/main/docs/agent-drivable-reference.md),
flicast `dd157ad`). Nothing was built. Size = effort to close: **S** under a day · **M** a few days · **L** a campaign.

**Tally (24 items)**: **5 HAVE · 9 PARTIAL · 8 MISSING · 2 N-A.**

## Can an agent quit or restart FliHub today?

**Only from a shell. There is no door, no CLI and no MCP path.**

| Action | Door (HTTP) | Shell | Evidence |
|---|---|---|---|
| Is it up? | `GET /api/system/health` | `scripts/app.sh status` | `server/src/routes/system.ts:344` · `scripts/app.sh` |
| Start (on a project) | — (must be up to answer) | `scripts/app.sh start [--brand … --project … --video …]` | `scripts/app.sh`, `start.sh` |
| Bring to front | — | `scripts/app.sh open` (opens the browser tab) | `scripts/app.sh` |
| Open / list / create projects | `POST /api/context`, `GET /api/query/projects`, `POST /api/projects` | — | `server/src/routes/context.ts`, `routes/query/`, `routes/index.ts` |
| Logs | **none** | `scripts/app.sh logs` / `tail` (`.logs/*.log`) | `scripts/app.sh:242` |
| **Quit** | **none** | `scripts/app.sh stop` · `overmind quit` (from the repo root) | `scripts/app.sh:238` |
| **Restart** | **none** | `scripts/app.sh restart` · `overmind restart server` (any terminal, via `.overmind.sock`) | `scripts/app.sh:239`, `CLAUDE.md` → Dev Server Management |

The server handles `SIGINT`/`SIGTERM` gracefully: it kills the active Whisper process and closes the
watchers (`server/src/index.ts:424-452`). No route triggers that shutdown. Never `pkill overmind`,
because AngelEye and Captain's Log share the binary; `CLAUDE.md` has the kill-by-cwd runbook.

## 1 · The core

| Item | Verdict | Evidence | To close |
|---|---|---|---|
| One capability core, every edit a named verb, one `call()` seam, pinned set | **MISSING** | About 150 Express handlers, each with its own logic; 105 of 156 call `fs.*` directly (`docs/rebuild-2026/NORTH-STAR.md` §5.1). No registry, no pinned test | **L**. This is the B475 rebuild's §5.1 commitment ("one API, n unprivileged clients") |
| UI is a client of the core, never an editor | **PARTIAL** | The UI has no privileged path: it only calls the same `/api/*` routes an agent can (`client/src/hooks/use*Api.ts`). But there is no core under those routes and no boundary test | **M** after the core exists: add a boundary test like FliCast's |
| Dry-run, undo, idempotency on every command | **PARTIAL** | Dry-run on hold and batch-offload (`server/src/routes/hold.ts`) and on recording trash (`usePreviewTrashRecordings`, `routes/index.ts`). Undo only for renames, in memory (`POST /api/recordings/undo-rename`, `routes/index.ts:672`). No idempotency keys, no per-principal history | **L** (it needs the core); **S** for idempotency keys on the few destructive routes |
| Long work is a Task (handle, events, status, cancel) | **PARTIAL** | Transcription has a queue with `jobId`, `transcription:*` socket events and `GET /api/transcriptions` state (`routes/transcriptions.ts`), but **no cancel route**. `POST /api/projects/batch-offload` holds the request open for the whole rsync run (`routes/hold.ts:490`) | **M** |

## 2 · The doors

| Item | Verdict | Evidence | To close |
|---|---|---|---|
| HTTP control door on loopback (`/call`, JSON-RPC, capabilities, events, health) | **PARTIAL** | There is a REST API on :5101 with health, and socket.io events. **It binds every interface** (`httpServer.listen(PORT)`, `server/src/index.ts:414`; `lsof` shows `*:5101`). There is no `/call`, JSON-RPC or capabilities listing | **S** to bind 127.0.0.1 (first check that no other machine uses FliHub over Tailscale); **M** to add a `/v1` door |
| Per-launch bearer token in a control file | **MISSING** | No auth middleware. CORS reflects any origin (`server/src/index.ts:90`) | **S–M**. With `*:5101` plus destructive routes (`DELETE /api/projects/:code/local`, `/trash`, project delete) this is the top safety gap |
| CLI that is only a client of the door, help generated | **MISSING** | No `bin/`, no CLI | **M** (after a capabilities listing exists) |
| MCP server (describe + call) | **MISSING** | No `.mcp.json`, no MCP binary | **M** |
| Claude skill that speaks the CLI (generated verb list) | **PARTIAL** | `flivideo:flihub` skill (`~/dev/ad/appydave-plugins/flivideo/skills/flihub/`) with 12 hand-written command docs over curl and `/api/query/*`. It is hand-copied and was already stale (archaeology: "Known-stale external surfaces") | **S** to refresh; **M** to generate it once a capabilities listing exists |

## 3 · Swagger-like surface

| Item | Verdict | Evidence | To close |
|---|---|---|---|
| Machine-readable spec (OpenRPC/OpenAPI), generated, with `--check` | **MISSING** | `shared/apiRegistry.ts` is hand-written and lists 34 of about 150 routes. No generator, no staleness check | **M** (zod-to-OpenAPI would need request schemas; only the open contract has zod today) |
| Human reference page served by the app | **PARTIAL** | The in-app API Explorer (`client/src/components/ApiExplorer.tsx`, gear menu), but it is built from the hand-written registry and incomplete | **S** once a spec exists |
| Pick a verb, fill fields, fire, see the result, in the app | **PARTIAL** | The API Explorer fires real requests (`fetch`, `ApiExplorer.tsx:150-160`) and copies curl. It covers 34 endpoints, has no principal and no fence | **S–M** on top of the spec |

## 4 · Refusals are data

| Item | Verdict | Evidence | To close |
|---|---|---|---|
| Named failure modes, stable codes, typed details | **PARTIAL** | Only the open-contract doors use the shared `REFUSAL_CODES` (`shared/contextSchemas.ts`, zod). Everywhere else errors are ad-hoc strings: 353 `success: false` sites, and at least 51 handlers return errors with HTTP 200 (North Star §5.1). FR-159's `reason` on `/queue` is the one earned exception | **M** |

## 5 · Context (the open contract)

| Item | Verdict | Evidence | To close |
|---|---|---|---|
| Launch pointed at a project; re-point while running; suite refusal codes | **HAVE** | `./start.sh` / `scripts/app.sh start --brand --project --video`, `FLIVIDEO_*` env, `POST /api/context`. One `applyContext` (`server/src/utils/openContext.ts`), and a refused launch keeps the previous project | — |
| Say what is active | **HAVE** | `GET /api/context` → `{ context, missing, refused? }` (`server/src/routes/context.ts`) | — |

## 6 · Lifecycle

This is the table under "Can an agent quit or restart FliHub today?" above. Health and project
selection are on the door. Logs, quit and restart are shell-only.

## 7 · The launcher

| Item | Verdict | Evidence | To close |
|---|---|---|---|
| Runs as its own bundle via LaunchServices (TCC grants) | **N-A** | FliHub is a Node server plus a browser UI. It needs no Screen Recording or Input Monitoring grant. MicCheck's microphone access is the browser's own grant | — |

## 8 · Test harness

| Item | Verdict | Evidence | To close |
|---|---|---|---|
| Fake engine beneath the real app | **MISSING** | ffmpeg, ffprobe and mlx_whisper are spawned directly. Tests mock per module, and there is no fake mode for the running app | **M** |
| UAT stories drive the built app, controls located by verb | **MISSING** | No `data-verb` (24 `data-testid` only), no CDP/uat runner. `/uat` is a manual slash command | **M–L** |
| Isolated homes | **PARTIAL** | Route tests use temp dirs and supertest (`server/src/test/storageRoutes.test.ts`, `newProjectHub.test.ts`, `trashVisibility.test.ts`). The running app has one global `server/config.json` and no isolated-home launch | **S–M** |

## 9 · Agent safety

| Item | Verdict | Evidence | To close |
|---|---|---|---|
| A ★ human-only fence in the core | **MISSING** | There is no principal concept at all: every caller, including any host on the network (see §2), can hold, archive, delete or empty trash | **M**, alongside the core and a token |
| No OS keystrokes or clicks needed to drive it | **HAVE** | Everything a person does in the UI is an HTTP call an agent can make | — |
| Privacy by construction (typed characters) | **N-A** | FliHub captures no keystrokes | — |
| Never `pkill`; stop by its own control path | **HAVE** | `scripts/app.sh stop` / `overmind quit`; `CLAUDE.md` recovery runbook kills by cwd | — |

## 10 · Shared through `@flivideo/core`

| Item | Verdict | Evidence | To close |
|---|---|---|---|
| Open-args, brands, project resolution, identity, layout, trash zone from fli-core | **HAVE** | `parseOpenArgs`, `resolveBrandRoot` and `readIdentity` (`server/src/utils/openContext.ts`), `projectLayoutSync` and `LAYOUT_DIRS` (`shared/paths.ts`), `TRASH_FOLDER` (`routes/projects.ts`). Window positions are N-A (browser app) | — |

## Top gaps, in order

1. **Network exposure without auth.** The server listens on `*:5101` with no token, CORS reflects
   any origin, and destructive routes are open. Binding 127.0.0.1 is **S**, if nothing remote relies
   on it; a per-launch token is **S–M**. Do this before anything else below.
2. **No capability core.** Every verb is a hand-rolled Express handler. The OpenRPC spec, the CLI,
   the MCP server, the ★ fence, dry-run, idempotency and typed refusals all hang off a core, which
   is **L**. This is the rebuild's own North Star §5.1, so it belongs in B475, not a side patch.
3. **No agent lifecycle, CLI or MCP.** Quit, restart and logs are shell-only. There is no
   `flihub` CLI and no MCP server. A thin `/v1` door with `system.logs`, plus a CLI and MCP over the
   existing REST routes, would be **M** as an interim step before the core.
