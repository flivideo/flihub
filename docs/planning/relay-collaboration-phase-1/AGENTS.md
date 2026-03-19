# AGENTS.md — relay-collaboration-phase-1

**Project**: FliHub — video recording workflow management tool
**Campaign**: relay-collaboration-phase-1
**Stack**: TypeScript monorepo — Express + Socket.io (server), React 19 + Vite + TailwindCSS v4 (client), shared types
**Last updated**: 2026-03-19
**Inherits from**: `docs/planning/AGENTS.md` (baseline — read both; this file adds relay-specific knowledge)

---

## Project Overview

FliHub is a TypeScript monorepo that watches Ecamm Live recordings, provides a web UI for naming/organising video files, and manages project assets for a solo YouTube creator workflow. It runs locally on macOS (Apple Silicon). There is no cloud deployment, no multi-user support, no authentication.

This campaign adds relay collaboration support: David (YouTuber) pushes raw recordings to a SyncThing relay folder Jan (editor) can access, Jan pushes edits back, FliHub provides a diff-preview-before-confirm UI. A git sync button lets either user pull project state updates (text, images, state files) without the terminal.

**Two distinct sync mechanisms — do not conflate:**
| Mechanism | What travels | How |
|-----------|-------------|-----|
| Git | Small files: transcripts, images, `.flihub-state.json`, text assets | `git pull --rebase` via FliHub button |
| Relay (SyncThing) | Large files: raw recordings, 1st/2nd edit `.mp4` | rsync to `~/relay/flihub-appydave/`, SyncThing auto-syncs peer-to-peer |

---

## Build & Run Commands

```bash
npm install                        # Install all workspace dependencies
npm run build -w shared            # ALWAYS run after changing shared/types.ts or shared/paths.ts
npm run build -w server            # TypeScript compile server
npm run build -w client            # tsc -b && vite build
npm test                           # runs shared → server → client (447 tests currently passing)
npm test -w shared
npm test -w server
npm test -w client

lsof -i :5101 | grep LISTEN        # Check if server is running
```

**Never start the dev server in an agent** — it's a long-running process. Build only.

---

## Directory Structure (relay-relevant files)

```
flihub/
├── shared/
│   ├── types.ts           ← Add relay fields to Config interface + relay socket events here
│   └── paths.ts           ← Add relayDir to ProjectPaths (derived from relayDirectory + projectCode)
├── server/src/
│   ├── index.ts           ← Wire relay routes (3 lines: import + app.use)
│   ├── WatcherManager.ts  ← Add startRelayWatcher() here
│   ├── config/
│   │   └── configManager.ts  ← Add relay fields to saveConfig allowlist
│   └── routes/
│       ├── relay.ts       ← CREATE THIS — createRelayRoutes() factory
│       └── system.ts      ← Add POST /api/system/git-sync here (existing file)
└── client/src/
    ├── components/shared/
    │   └── RelayTool.tsx  ← CREATE THIS — SlideOutDrawer tool
    └── hooks/
        ├── useRelayApi.ts ← CREATE THIS — relay mutations/queries
        └── useSystemApi.ts ← Add useGitSync() here (existing file)
```

---

## Relay Config Fields

**Add to `Config` interface in `shared/types.ts`:**
```typescript
// FR-B038: relay collaboration
relayDirectory?: string;   // ~/Relay/FliHub-appydave — machine-specific, gitignored
relayEnabled?: boolean;    // Feature gate — false/undefined until configured
```

**Add to `saveConfig()` allowlist in `configManager.ts`** (same pattern as `poemWuiUrl` ~line 126):
```typescript
if (config.relayDirectory !== undefined) toSave.relayDirectory = config.relayDirectory;
if (config.relayEnabled !== undefined) toSave.relayEnabled = config.relayEnabled;
```

No migration needed — new optional fields. Existing configs return `undefined` (relay disabled).

---

## Relay Path Convention

Same/same mirroring between project folder and relay folder:
```
v-appydave/b17-xmen/recordings/1-1-intro.mp4
    → ~/relay/flihub-appydave/b17-xmen/recordings/1-1-intro.mp4

v-appydave/b17-xmen/edit-1st/video.mp4
    → ~/relay/flihub-appydave/b17-xmen/edit-1st/video.mp4
```

Relay folder is machine-global (not per-project). `projectCode` is derived from the active project folder name (e.g., `b17-xmen`).

**Add to `getProjectPaths()` in `shared/paths.ts`:**
```typescript
// Only computable when relayDirectory is set
relayDir: relayDirectory
  ? path.join(expandPath(relayDirectory), path.basename(projectDir))
  : undefined,
```

---

## rsync Shell Pattern

Use rsync for all relay file operations. Model on `runDamCommand()` in `server/src/routes/s3-staging.ts`.

```typescript
import { execAsync } from '../utils/execAsync.js';
import { expandPath } from '../utils/pathUtils.js';

// Dry-run preview — returns structured diff
async function relayPreview(sourceDir: string, destDir: string) {
  const src = expandPath(sourceDir) + '/';
  const dest = expandPath(destDir) + '/';
  const cmd = `bash -lc "rsync -av --dry-run --itemize-changes '${src}' '${dest}'"`;
  const { stdout, stderr } = await execAsync(cmd, { timeout: 60000 });
  return parseRsyncDiff(stdout); // parse itemize-changes output into { new: [], updated: [], deleted: [] }
}

// Confirmed push
async function relayPush(sourceDir: string, destDir: string) {
  const src = expandPath(sourceDir) + '/';
  const dest = expandPath(destDir) + '/';
  const cmd = `bash -lc "rsync -av --delete '${src}' '${dest}'"`;
  const { stdout, stderr } = await execAsync(cmd, { timeout: 300000 });
  return { success: true, output: stdout };
}
```

**rsync itemize-changes format** — each line is `YXcstpoguax filename`:
- First char `>` = file being sent, `<` = file being received, `.` = not transferred
- Second char `f` = file, `d` = directory
- `*deleting` prefix = file deleted
- Parse: lines starting with `>f` = new/updated files; lines starting with `*deleting` = deleted

---

## WatcherManager Extension Pattern

Add to `WatcherManager.ts` — follows exact same pattern as existing watchers:

```typescript
startRelayWatcher(relayDir: string): void {
  if (!relayDir) return;
  this.startWatcher({
    name: 'relay',
    pattern: expandPath(relayDir),
    event: 'relay:recordings-available',
    debounceMs: 1000,  // larger debounce for large video files
    depth: 3,
    watchEvents: ['add', 'unlink', 'addDir'],
    awaitWriteFinish: { stabilityThreshold: 2000, pollInterval: 500 },  // wait for large files
  });
}
```

Call from `initAll()`:
```typescript
if (config.relayDirectory && config.relayEnabled) {
  this.startRelayWatcher(config.relayDirectory);
}
```

**Do NOT restart relay watcher when `config.projectDirectory` changes** — relay is machine-global. Only restart if `config.relayDirectory` changes.

---

## New Socket Events

**Add to `ServerToClientEvents` in `shared/types.ts`:**
```typescript
// FR-B038: relay collaboration
'relay:recordings-available': (data: { projectCode: string; count: number }) => void;
'relay:edit-received': (data: { projectCode: string; filename: string }) => void;
'relay:sync-status': (data: { status: 'idle' | 'syncing' | 'error'; message?: string }) => void;
```

---

## Relay Routes Pattern

```typescript
// server/src/routes/relay.ts
import express from 'express';
import type { Config } from '../../../shared/types.js';
import { expandPath } from '../utils/pathUtils.js';
import { execAsync } from '../utils/execAsync.js';

export function createRelayRoutes(getConfig: () => Config) {
  const router = express.Router();

  router.post('/preview', async (req, res) => {
    try {
      const config = getConfig();
      if (!config.relayDirectory || !config.projectDirectory) {
        return res.json({ success: false, error: 'Relay not configured' });
      }
      // ... rsync dry-run
      res.json({ success: true, diff: { new: [], updated: [], deleted: [] } });
    } catch (error) {
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  router.post('/push', async (req, res) => { /* ... */ });
  router.post('/collect', async (req, res) => { /* ... */ });

  return router;
}
```

**Wire in `server/src/index.ts`** (3 lines, follow existing pattern):
```typescript
import { createRelayRoutes } from './routes/relay.js';
// ...
app.use('/api/relay', createRelayRoutes(getConfig));
```

---

## Git Sync Pattern

Add to `server/src/routes/system.ts` (existing file). Model exactly on `runDamCommand()` in s3-staging.ts:

```typescript
router.post('/git-sync', async (req, res) => {
  try {
    const config = getConfig();
    if (!config.projectsRootDirectory) {
      return res.json({ success: false, error: 'No projects root directory configured' });
    }
    const repoDir = expandPath(config.projectsRootDirectory);
    const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const shellCommand = `bash -lc "cd '${repoDir}' && git pull --rebase"`;
    const { stdout, stderr } = await execAsync(shellCommand, { timeout: 120000 });
    io.emit('projects:changed');  // NOTE: io is not available in route factory — see below
    res.json({ success: true, output: stdout });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});
```

**IMPORTANT — `io` access in system routes**: The `system.ts` route factory already receives `io` as a second parameter (check the existing factory signature). If it doesn't, update the factory to accept `(getConfig: () => Config, io: Server)` and pass `io` from `index.ts`.

---

## RelayTool UI Pattern

Follow `S3StagingTool.tsx` as the structural template — it uses SlideOutDrawer and has similar push/status/refresh patterns.

```typescript
// client/src/components/shared/RelayTool.tsx
// Opens as SlideOutDrawer in ManagePanel
// Sections:
//   1. Status bar (relay configured? / relay enabled?)
//   2. Preview button → shows diff table (new/updated/deleted files)
//   3. Push button (disabled until preview run) → confirmed rsync
//   4. Collect button → pull edits from relay into project
```

**Add to ManagePanel** following the same pattern as existing tools (S3StagingTool, etc.).

---

## Success Criteria Checklist

Before marking any work unit complete:

- [ ] `npm run build -w shared` passes (if shared/ was changed)
- [ ] `npm run build -w server` passes — TypeScript clean
- [ ] `npm run build -w client` passes — TypeScript + Vite build clean
- [ ] `npm test` exits 0 — all 447+ tests pass
- [ ] New exported utility functions in `server/src/utils/` have at least a smoke test
- [ ] New routes follow `createXxxRoutes(getConfig)` factory pattern
- [ ] New shared types added to `shared/types.ts` (not duplicated in client or server)
- [ ] FR annotation comment added: `// B038: relay collaboration`
- [ ] No new `any` types in `shared/types.ts`

---

## Anti-Patterns to Avoid

All baseline anti-patterns from `docs/planning/AGENTS.md` apply, plus:

- **Do not use `fs/promises` for relay file operations** — use `execAsync` with rsync shell commands (proven pattern from s3-staging.ts and DSS sync.ts)
- **Do not watch `config.projectDirectory` for relay events** — relay folder is machine-global; restart relay watcher only when `config.relayDirectory` changes
- **Do not add relay config fields outside of `shared/types.ts`** — the `Config` interface is the contract
- **Do not use SyncThing programmatically** — FliHub only copies files to/from the relay folder; SyncThing handles the actual peer sync automatically
- **Do not implement git push or git commit** — pull-only for MVP; pushing is manual via terminal
- **Do not hardcode `~/relay/`** — use `config.relayDirectory` via `getConfig()` + `expandPath()`
- **Do not skip `expandPath()`** for relay paths — `~` is not expanded by Node.js path functions

---

## Mock Patterns

All baseline mock patterns from `docs/planning/AGENTS.md` apply, plus:

```typescript
// Mock execAsync for relay route tests
vi.mock('../utils/execAsync.js', () => ({
  execAsync: vi.fn().mockResolvedValue({ stdout: '', stderr: '' }),
}));
```

For rsync output parsing tests — use literal rsync itemize-changes strings as fixtures:
```
>f+++++++++ b17/recordings/1-1-intro.mp4
>f.st...... b17/recordings/1-2-setup.mp4
*deleting   b17/recordings/old-file.mp4
```

---

## Reference Files

- `server/src/routes/s3-staging.ts` — execAsync + runDamCommand pattern (copy this approach)
- `server/src/WatcherManager.ts` — existing watcher registration pattern
- `server/src/config/configManager.ts` — saveConfig allowlist (lines ~99-131)
- `shared/types.ts` — Config interface + ServerToClientEvents
- `client/src/components/shared/S3StagingTool.tsx` — SlideOutDrawer tool template
- `client/src/hooks/useSystemApi.ts` — add useGitSync() here
- `apps/digital-stage-summit-2026/server/src/routes/sync.ts` — working relay reference (rsync + chokidar patterns)

---

## Learnings (updated per wave)

_None yet — campaign starting 2026-03-19_
