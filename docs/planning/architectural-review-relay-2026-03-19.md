# Architectural Review: FliHub — Relay Collaboration Readiness

**Date**: 2026-03-19
**Feature anchor**: Multi-user relay collaboration (SyncThing + Git sync)
**Grade**: B

---

## Executive Summary

FliHub's architecture is fundamentally sound for extending collaboration. The main clarification since the initial review: **SyncThing cannot interact with git folders and the v-appydave tree is too large for it anyway** — so the relay concept applies only to a separate temporary file-share bucket (`~/relay/xxx`), not to the project structure itself. Video files (recordings, edits) travel via S3 (DAM, existing) or relay bucket (temporary P2P). Small files (text, images, state, transcripts) travel via git. These are two distinct sync mechanisms and must not be confused. The architecture is inflexible and fragile in its current form — not because of bad code, but because the workflow spans two separate sync systems with no unified FliHub UI over them.

---

## Top 5 Structural Concerns

### 1. `.flihub-state.json` Merge Conflicts — MODERATE (downgraded from CRITICAL 2026-03-19)

**Where**: `shared/paths.ts` line 55, `server/src/utils/projectState.ts`

**Problem**: `.flihub-state.json` lives at the individual project root (e.g., `v-appydave/b85-project/.flihub-state.json`) — confirmed **per-video-project, not global** to `v-appydave`. Conflict only occurs if David and Jan both actively modify the same project's state file simultaneously, which the relay workflow is designed to avoid (David records → shares → Jan edits sequentially).

**Downgrade rationale**: The original assessment assumed global scope. Confirmed it's per-project via `shared/paths.ts:55`. Conflict risk is real but narrow — sequential handoff workflow means both users are rarely in the same project at the same time.

**Near-term approach**: Accept occasional conflicts — manually resolvable with a simple `git checkout --theirs`. David confirmed: "we can manage the odd conflict for now."

**Long-term**: A Supabase layer will replace the file-based state entirely. When that lands, `.flihub-state.json` becomes a local cache only and the merge conflict problem disappears. No action needed before relay MVP.

**Impact on relay feature**: Low. The relay watcher and share-recordings button do not require state file changes.

---

### 2. `Config` Has No Relay Fields — SIGNIFICANT

**Where**: `shared/types.ts`, `server/src/config/configManager.ts` (saveConfig allowlist lines 99–131)

**Problem**: The `Config` interface has no relay fields. `saveConfig()` has an explicit allowlist — any field not added there is silently dropped on save.

**Recommended fix** — two fields only:
```typescript
// shared/types.ts — add to Config interface
relayDirectory?: string;   // ~/Relay/FliHub-appydave — machine-specific, gitignored
relayEnabled?: boolean;    // Feature gate
```

```typescript
// configManager.ts saveConfig() — same pattern as poemWuiUrl (lines 126-128)
if (config.relayDirectory) toSave.relayDirectory = config.relayDirectory;
if (config.relayEnabled !== undefined) toSave.relayEnabled = config.relayEnabled;
```

**Skip `relayPartnerId`**: Not needed for MVP. The relay folder name (`FliHub-appydave`) already encodes the partnership. User identity becomes relevant when Supabase lands — add it then.

**No migration needed**: New optional fields. Existing configs return `undefined` for both, which is the correct default (relay disabled until configured).

**gitignored is correct**: Each machine sets its own `relayDirectory` path locally. Jan's `~/Relay/FliHub-appydave/` on his Mac, David's on his Mac — same folder name, different machine paths. This is the same class as `watchDirectory` and `imageSourceDirectory` — already handled correctly.

---

### 3. WatcherManager Watches Active b17 Project Only — SIGNIFICANT

**Where**: `server/src/WatcherManager.ts` — `initAll()`, `updateFromConfig()`

**Clarification**: "Single-project" means the **active b17 video directory** (e.g., `v-appydave/b85-something/`). All project-specific watchers (recordings, transcripts, inbox, thumbs, assigned-images) are tied to `config.projectDirectory` and restart whenever the active project switches. The exception is `startProjectsWatcher()` which watches `path.dirname(projectDir)` = the v-appydave root, to detect new/removed project folders.

**Problem for relay**: The relay folder (`~/Relay/FliHub-appydave/`) is a **machine-global path** independent of which project is active. It must stay watched across project switches. Currently no watcher mechanism supports this.

**Fix is simple**: Add `startRelayWatcher()` — called once from `initAll()` and only restarted in `updateFromConfig()` when `config.relayDirectory` changes (NOT when `config.projectDirectory` changes). This is a clean addition that doesn't touch any existing watcher logic.

```typescript
startRelayWatcher(relayDir: string): void {
  this.startWatcher({
    name: 'relay',
    pattern: expandPath(relayDir),
    event: 'relay:changed',
    debounceMs: 300,
    depth: 1,
    watchEvents: ['add', 'unlink', 'addDir'],
  });
}
```

Note: `awaitWriteFinish: { stabilityThreshold: 300 }` should be added for large video files — proven in DSS app's `sync.ts`.

**New Socket.io events needed** (add to `ServerToClientEvents` in `shared/types.ts`):
```typescript
'relay:recordings-available': (data: { projectCode: string; count: number }) => void;
'relay:edit-received': (data: { projectCode: string; filename: string }) => void;
'relay:sync-status': (data: { status: 'idle' | 'syncing' | 'error'; message?: string }) => void;
```

---

### 4. No Git Operations Exist Anywhere — SIGNIFICANT

**Where**: `server/src/routes/s3-staging.ts` has the `execAsync` pattern to copy from. No git code exists in any SupportSignal project either — confirmed by research. Needs to be built fresh, but all building blocks are in FliHub already.

**The pattern is fully proven** (from `s3-staging.ts`):
```typescript
const shellCommand = `bash -lc "cd ${repoDir} && git pull --rebase"`;
const { stdout, stderr } = await execAsync(shellCommand, { timeout: 300000 });
```
- `bash -lc` ensures PATH from `.bashrc`/`.profile` is available — `git` is always on PATH on macOS
- Returns `{ success, output, error, duration }` — same shape as DAM results

**Recommended implementation** (no separate `gitUtils.ts` needed for MVP):
1. Add `POST /api/system/git-sync` to `server/src/routes/system.ts` — runs `git pull --rebase` in `config.projectsRootDirectory`, emits `projects:changed` on success
2. Add `useGitSync()` hook to `client/src/hooks/useSystemApi.ts` — `useMutation` calling the route, `toast.success/error` on result

**No polling needed**: Push model via Socket.io is already in place. After a pull, the watcher fires `projects:changed` automatically.

**Open product decisions** (must answer before building):
- Which git repo? `projectsRootDirectory` (v-appydave root, containing all projects) — the transcript implies this
- Commit message: auto-generated with timestamp (`"FliHub sync 2026-03-19 14:32"`) or user-provided?
- Conflict UX: if `git pull` finds a conflict, show raw error in toast or a dedicated conflict panel?

---

### 5. S3 Coupling Is Moderate — MODERATE

**Where**: `server/src/routes/s3-staging.ts` (745 lines), `shared/paths.ts` (line 49: `s3Staging`), `server/src/utils/s3Utils.ts`

**Problem**: The S3/DAM workflow is self-contained in `s3-staging.ts` and `s3Utils.ts`. The `ProjectPaths` type hardcodes `s3Staging: string` as a first-class path. The relay feature does not need to replace S3 — the transcript explicitly says relay is an **alternative** for sending raw recordings to Jan (so he can do the Gling edit), while S3 continues to be used for the second-edit workflow. However, if the relay feature eventually replaces the `s3-staging/prep/` flow, the `s3Staging` path in `ProjectPaths` and the `S3StagingTool` in ManagePanel will need a parallel `relay` entry.

**Impact on relay feature**: Low immediate impact. The relay feature can be added as a **new route** (`server/src/routes/relay.ts`) and a **new tool** in ManagePanel (`RelayTool`) without touching any S3 code. The `ProjectPaths` type should gain a `relayDir` computed path once `relayDirectory` is in Config.

**Note**: `s3Staging` path currently uses the project directory as the root — Jan's relay folder is a machine-global path (not per-project), so it will need a different path derivation strategy.

---

## Reference Implementation — DSS App (2026-03-17, Working)

**`/Users/davidcruwys/dev/ad/apps/digital-stage-summit-2026/server/src/routes/sync.ts`** — a fully working relay implementation built across Waves 1–4. This is the closest reference for FliHub relay work.

Key patterns to reuse:
- `RELAY_ROOT` = `~/relay/david-jan/` (flat folder, no subfolders) — FliHub equivalent will be `~/Relay/FliHub-appydave/`
- `GET /api/sync/status` → list relay folder contents
- `POST /api/sync/pull` → copy files into relay flat folder, update `manifest.json`
- `POST /api/sync/open` → open relay folder in Finder (pattern already exists in FliHub's `system.ts`)
- **Chokidar watcher on manifest file** with `awaitWriteFinish: { stabilityThreshold: 300 }` — handles incremental writes cleanly. This exact pattern should be used for FliHub's relay watcher.
- Socket event: `sync:pulled` fired by watcher

**SyncThing** is installed and confirmed working from the Digital Summit session. The `~/relay/david-jan/` folder doesn't currently exist on disk (likely cleaned up post-summit), but the infrastructure is proven.

**Two distinct relay concepts — don't conflate:**
| Context | Folder | Purpose |
|---|---|---|
| Digital Summit 2026 | `~/relay/david-jan/` | Brain content → Jan for graphic generation |
| FliHub (planned) | `~/Relay/FliHub-appydave/` | Raw recordings → Jan for Gling editing; edits back |

---

## What's Already Well-Positioned

**WatcherManager abstraction**: The named-watcher pattern in `WatcherManager.ts` makes adding a `relay` watcher trivial. The debounce + Socket.io emission pattern is exactly what relay detection needs.

**Socket.io event system**: `ServerToClientEvents` in `shared/types.ts` is additive — new relay events slot in without breaking existing consumers. The client already listens to typed events via `useSocket`.

**Route factory pattern**: All routes use `createXxxRoutes(getConfig: () => Config)`. A `createRelayRoutes()` following the same pattern will integrate cleanly with zero changes to `index.ts` middleware wiring (just add three lines).

**`execAsync` shell pattern**: `runDamCommand()` in `s3-staging.ts` is the proven template for `gitSync()`. Uses `bash -lc` wrapper so PATH is available, 5-min timeout, structured `{ success, output, error, duration }` return. The DSS `sync.ts` file-copy pattern is the template for `copyRecordingsToRelay()`. Note: Signal Studio has no git sync button — this is a greenfield build, but the FliHub DAM pattern is sufficient. The timeout handling, error parsing, and structured return type are all reusable patterns.

**`projectsRootDirectory` is now clean (B024–B027 done)**: The blocker work that fixed hardcoded paths is complete. Jan can configure a different `projectsRootDirectory` on his machine and the server will resolve all project-relative paths correctly.

**`.flihub-state.json` is per-project (not global)**: The concern in the transcript about a "global projects.json" does not apply — state is stored per-project. The conflict risk is real but scoped: only the project Jan is actively editing will have a state collision, not all projects at once.

**Config migration infrastructure**: `configManager.ts` has two proven migration paths already. Adding relay config fields with a migration (in case old configs lack them) is well-supported.

---

## Readiness Verdict

The codebase is **ready to start relay feature work** with pre-work caveats. The infrastructure (watchers, sockets, route factories, path utilities) is solid. Nothing about the relay feature requires a rewrite of existing systems. However, two items should be resolved before writing production relay code:

1. The `.flihub-state.json` merge conflict risk must be mitigated (design decision, then type change) — this is the highest-consequence issue.
2. The `Config` relay fields must be added (30-minute task) to unblock all other work.

**Note on state file conflicts**: Downgraded to manageable — per-project scope means sequential David→Jan handoff workflow avoids most conflicts. Long-term: Supabase replaces file-based state entirely.

The Git sync button is independently deliverable as a separate work unit and does not depend on the relay watcher or the state file split.

---

## Suggested Pre-Work Before Building Relay

Ordered by dependency and risk:

1. **Add relay config fields to `Config` + `saveConfig`** — Add `relayDirectory`, `relayPartnerId`, `relayEnabled` to `shared/types.ts` and the `saveConfig` allowlist in `configManager.ts`. 30 minutes. Unblocks watcher and route work.

2. **Add `startRelayWatcher()` to WatcherManager** — Watch `config.relayDirectory` (if set) for new `.mov`/`.mp4` files. Emit `relay:recordings-available` or `relay:edit-received` based on subfolder convention. Add the two new socket event types to `ServerToClientEvents`.

5. **Create `server/src/utils/gitUtils.ts`** — `gitStatus()` and `gitSync()` modelled on `runDamCommand()`. Mock via `vi.mock('../utils/execAsync.js')` pattern per AGENTS.md. Needs a decision on which directory is the git repo root.

6. **Create `server/src/routes/relay.ts`** — "Share recordings" POST endpoint (copy recordings to relay folder, emit socket event), relay status GET endpoint. Follow existing route factory pattern.

7. **Add relay fields to `ProjectPaths`** — Add `relayDir` to `getProjectPaths()` in `shared/paths.ts`, derived from `config.relayDirectory` + project code. Rebuild shared after.

8. **Build the Git sync button UI** — Add a `GitSyncTool` to ManagePanel's SlideOutDrawer pattern. Show status (clean/ahead/behind), last sync time, and a sync button. Socket.io `relay:sync-status` drives the spinner.

9. **Build the "Share recordings" button UI** — Button in RecordingsView or ManagePanel that calls the relay route. Shows confirmation of files copied and notifies Jan.

10. **Address B036 (hardcoded WHISPER_BINARY path) as a parallel concern** — It's a signal that machine-specific paths aren't yet config-driven. The relay directory is the same class of problem, and fixing B036 first establishes the pattern.
