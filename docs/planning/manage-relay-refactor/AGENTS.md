# AGENTS.md — manage-relay-refactor

**Project**: FliHub — video recording workflow management tool
**Campaign**: manage-relay-refactor (Wave 1 — foundation fixes)
**Stack**: TypeScript monorepo — Express + Socket.io (server), React 19 + Vite + TailwindCSS v4 (client), shared types
**Last updated**: 2026-03-22
**Inherits from**: `docs/planning/relay-collaboration-phase-1/AGENTS.md` + `docs/planning/AGENTS.md`

---

## Project Overview

FliHub is a TypeScript monorepo that watches Ecamm Live recordings, provides a web UI for naming/organising video files, and manages project assets for a solo YouTube creator workflow. It runs locally on macOS (Apple Silicon).

This campaign fixes security vulnerabilities in relay code, adds route guards and machineRole config, refactors the Manage page layout for the workflow pipeline, retires the obsolete S3 Staging tool, and adds relay test coverage.

---

## Build & Run Commands

```bash
npm install                        # Install all workspace dependencies
npm run build -w shared            # ALWAYS run after changing shared/types.ts
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

## Directory Structure

```
flihub/
├── client/src/
│   ├── App.tsx                    # Main app — tab navigation
│   ├── components/
│   │   ├── ManagePanel.tsx        # MODIFY — layout refactor, tool ordering
│   │   └── shared/
│   │       ├── ToolsSidebar.tsx   # MODIFY — remove Simple/Complex labels, reorder
│   │       ├── RelayTool.tsx      # EXISTS — relay tool UI (480px drawer)
│   │       ├── S3StagingTool.tsx  # REMOVE — retiring S3 Staging
│   │       ├── SlideOutDrawer.tsx # Pattern template — do not modify
│   │       ├── RenameTool.tsx     # EXISTS — rename tool
│   │       ├── GlingTool.tsx      # EXISTS — Gling/edit tool
│   │       └── RenumberTool.tsx   # EXISTS — renumber tool
│   ├── hooks/
│   │   ├── useApi.ts              # BARREL RE-EXPORT — add new hooks here as re-exports only
│   │   ├── useRelayApi.ts         # EXISTS — relay mutations/queries
│   │   ├── useS3StagingApi.ts     # REMOVE — retiring S3 Staging
│   │   └── useSystemApi.ts        # EXISTS — git-sync hook
│   └── config.ts                  # API_URL constant
├── server/src/
│   ├── index.ts                   # Express app, Socket.io, route wiring
│   ├── WatcherManager.ts          # MODIFY — fix relay toggle bug in updateFromConfig
│   ├── config/
│   │   └── configManager.ts       # MODIFY — add machineRole to saveConfig allowlist
│   ├── routes/
│   │   ├── relay.ts               # MODIFY — execFile, route guards, rsync parser fix
│   │   ├── system.ts              # MODIFY — execFile for git-sync
│   │   ├── s3-staging.ts          # REMOVE — retiring S3 Staging
│   │   └── index.ts               # MODIFY — remove s3-staging route wiring
│   └── utils/
│       ├── pathUtils.ts           # expandPath, queryString
│       ├── s3Utils.ts             # KEEP — utility functions used elsewhere
│       └── execAsync.ts           # EXISTS — promisified exec (may be unused after execFile migration)
└── shared/
    ├── types.ts                   # MODIFY — add machineRole to Config, MachineRole type
    ├── naming.ts                  # Do not modify
    ├── paths.ts                   # Do not modify
    └── constants.ts               # Do not modify
```

---

## Work Unit Details

### 1. security-fixes

**Files to modify**:
- `server/src/routes/relay.ts` — replace all `bash -lc "rsync ..."` calls with `execFile('rsync', [...args])`
- `server/src/routes/system.ts` — replace `bash -lc "cd '${repoDir}' && git pull --rebase"` with `execFile('git', ['pull', '--rebase'], { cwd: repoDir })`
- `server/src/routes/relay.ts` — fix `parseRsyncDiff` to extract filename after first space, not `slice(12)`

**execFile pattern** (replaces bash -lc string interpolation):
```typescript
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

// rsync preview
const src = expandPath(sourceDir) + '/';
const dest = expandPath(destDir) + '/';
const { stdout } = await execFileAsync('rsync', [
  '-av', '--dry-run', '--itemize-changes',
  '--exclude', '.DS_Store',
  '--exclude', '._*',
  src, dest
], { timeout: 60000 });

// rsync push
const { stdout } = await execFileAsync('rsync', [
  '-av',
  '--exclude', '.DS_Store',
  '--exclude', '._*',
  src, dest
], { timeout: 300000 });

// git pull
const { stdout, stderr } = await execFileAsync('git', ['pull', '--rebase'], {
  cwd: repoDir,
  timeout: 120000,
});
```

**rsync parser fix** — current code uses `line.slice(12)` which hardcodes column width. Fix:
```typescript
function parseRsyncDiff(stdout: string): { new: string[]; updated: string[]; deleted: string[] } {
  const lines = stdout.split('\n').filter(l => l.trim());
  const result: { new: string[]; updated: string[]; deleted: string[] } = { new: [], updated: [], deleted: [] };

  for (const line of lines) {
    if (line.startsWith('*deleting')) {
      // Format: "*deleting   filename" — extract after "*deleting"
      result.deleted.push(line.replace(/^\*deleting\s+/, ''));
    } else if (line.startsWith('>f')) {
      // Format: ">f+++++++++ filename" or ">f.st...... filename"
      // Extract filename after first space
      const spaceIndex = line.indexOf(' ');
      if (spaceIndex === -1) continue;
      const filename = line.slice(spaceIndex).trim();
      if (!filename) continue;

      // New file: all plusses after >f
      if (line.startsWith('>f+++')) {
        result.new.push(filename);
      } else {
        result.updated.push(filename);
      }
    }
  }

  return result;
}
```

**Also add .DS_Store exclusion** to all rsync calls via `--exclude` flags (not in the parser).

**mkdir -p replacement**: Replace `bash -lc "mkdir -p '${dir}'"` with:
```typescript
import fs from 'fs-extra';
await fs.ensureDir(dest);
```

### 2. relay-route-guards

**Files to modify**:
- `server/src/routes/relay.ts` — add `relayEnabled` check to all POST routes
- `server/src/WatcherManager.ts` — fix `updateFromConfig` to handle `relayEnabled` toggle

**Current relay route guard** (missing `relayEnabled`):
```typescript
if (!config.relayDirectory || !config.projectDirectory) {
  return res.json({ success: false, error: 'Relay not configured or no active project' });
}
```

**Fixed guard** (add `relayEnabled` + `projectCode` validation):
```typescript
if (!config.relayEnabled || !config.relayDirectory || !config.projectDirectory) {
  return res.json({ success: false, error: 'Relay not configured or not enabled' });
}
const projectDir = expandPath(config.projectDirectory);
const projectCode = path.basename(projectDir);
if (!projectCode || projectCode.includes('..')) {
  return res.json({ success: false, error: 'Invalid project directory' });
}
```

**WatcherManager fix** — `updateFromConfig` currently only checks `relayDirectory` change:
```typescript
// CURRENT (buggy — misses relayEnabled toggle):
if (!oldConfig || oldConfig.relayDirectory !== newConfig.relayDirectory) {

// FIXED — check both fields:
if (!oldConfig ||
    oldConfig.relayDirectory !== newConfig.relayDirectory ||
    oldConfig.relayEnabled !== newConfig.relayEnabled) {
```

### 3. machine-role-config

**Files to modify**:
- `shared/types.ts` — add `MachineRole` type and `machineRole` to Config
- `server/src/config/configManager.ts` — add to saveConfig allowlist
- `server/src/routes/system.ts` — add `machineRole` to environment response

**Type addition** (in `shared/types.ts`):
```typescript
// B039: machine role — determines which UI capabilities are visible
export type MachineRole = 'recorder' | 'editor';

// Add to Config interface:
machineRole?: MachineRole;  // Machine role — recorder shows archive/promote/cleanup, editor hides them
```

**saveConfig allowlist** (in `configManager.ts`, same pattern as `poemWuiUrl`):
```typescript
if (config.machineRole !== undefined) toSave.machineRole = config.machineRole;
```

**Environment response** (in `system.ts`, extend existing response):
```typescript
// Add to the response object in GET /api/system/environment:
machineRole: config.machineRole || 'recorder',  // Default to recorder for David's machine
```

### 4. manage-layout-refactor

**Files to modify**:
- `client/src/components/ManagePanel.tsx` — layout changes
- `client/src/components/shared/ToolsSidebar.tsx` — tool ordering and labels

**Layout requirements**:
1. Widen slide-out drawers from 480px to 560-640px
2. Make centre content context-sensitive:
   - Default / Rename active → show recordings list
   - Relay active → show relay info (relay folder browser comes in wave 2)
   - Gling active → show Gling prep view
   - Other tools → hide recordings list, show tool-specific content or nothing
3. Reorder sidebar tools to workflow sequence:
   - **Record**: Regen Shadows, Regen Transcripts, Regen Chapters, Regen All
   - **Edit**: Rename, Gling / Edit, Renumber
   - **Collaborate**: Relay, Git Sync
4. Remove "Simple Tools" / "Complex Tools" section labels
5. Use subtle group separators (thin line or spacing, no labels — or workflow-stage labels like "Record", "Edit", "Collaborate")

**Current ToolsSidebar structure** (from exploration):
- Simple Tools: Regen Shadows, Regen Transcripts, Regen Chapters, Regen All, Git Sync
- Complex Tools: Rename, Gling / Edit, S3 Staging, Renumber, Relay

**New structure**:
- Record group: Regen Shadows, Regen Transcripts, Regen Chapters, Regen All
- Edit group: Rename, Gling / Edit, Renumber
- Collaborate group: Relay, Git Sync

**Width change**: Update SlideOutDrawer width props. Current drawers use `w-[480px]` or `w-[560px]`. Standardise complex tools to `w-[600px]`.

### 5. retire-s3-staging

**Files to remove**:
- `client/src/components/shared/S3StagingTool.tsx`
- `client/src/hooks/useS3StagingApi.ts`
- `server/src/routes/s3-staging.ts`

**Files to modify**:
- `client/src/components/ManagePanel.tsx` — remove S3StagingTool import and rendering
- `client/src/components/shared/ToolsSidebar.tsx` — remove S3 Staging button
- `client/src/hooks/useApi.ts` — remove useS3StagingApi re-exports
- `server/src/index.ts` — remove s3-staging route wiring (`app.use('/api/s3-staging', ...)`)

**POEM WUI send relocation**: The "Send to POEM WUI" button currently lives in S3StagingTool. Move it to a standalone button in the sidebar's "Edit" or utility section, or keep the existing `POST /api/poem-wui/send` route (in `routes/poem-wui.ts`) and just add a button in the appropriate place.

**Keep these** (used by other code):
- `server/src/utils/s3Utils.ts` — utility functions used by other routes
- `server/src/routes/poem-wui.ts` — POEM WUI send route (independent of S3)

### 6. relay-tests

**Files to create**:
- `server/src/test/relay.test.ts` — relay route + parseRsyncDiff tests

**parseRsyncDiff test cases**:
```typescript
// New files
'>f+++++++++ recordings/01-1-intro.mov'  → new: ['recordings/01-1-intro.mov']

// Updated files
'>f.st...... recordings/01-1-intro.mov'  → updated: ['recordings/01-1-intro.mov']

// Deleted files
'*deleting   recordings/old-file.mov'    → deleted: ['recordings/old-file.mov']

// Mixed output (new + updated + deleted)
// Empty output → { new: [], updated: [], deleted: [] }
// Non-rsync lines (sending, receiving, summary) → ignored
// Directory entries (>d) → ignored (only files matter)
```

**Relay route test patterns**:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createRelayRoutes } from '../routes/relay.js';

// Mock execFile
vi.mock('child_process', () => ({
  execFile: vi.fn(),
}));

// Mock fs-extra for ensureDir
vi.mock('fs-extra', () => ({
  default: { ensureDir: vi.fn() },
}));

const mockConfig = {
  relayDirectory: '~/relay/flihub-appydave',
  relayEnabled: true,
  projectDirectory: '~/dev/video-projects/v-appydave/b17-test',
  // ... other required Config fields
};

describe('relay routes', () => {
  it('GET /status returns configured and enabled state', async () => { ... });
  it('POST /preview returns 400 when relay disabled', async () => { ... });
  it('POST /preview returns 400 when relayEnabled is false', async () => { ... });
  it('POST /push validates projectCode is non-empty', async () => { ... });
  // etc.
});
```

**git-sync test** (in existing or new test file):
```typescript
describe('POST /api/system/git-sync', () => {
  it('returns error when projectsRootDirectory not configured', ...);
  it('calls execFile with git pull --rebase', ...);
  it('returns stdout on success', ...);
  it('returns 500 on exec failure', ...);
});
```

**Export `parseRsyncDiff`**: Currently a private function in `relay.ts`. Export it for testing:
```typescript
export function parseRsyncDiff(stdout: string): { ... }
```

---

## Success Criteria Checklist

Before marking any work unit complete:

- [ ] `npm run build -w shared` passes (if shared/ was changed)
- [ ] `npm run build -w server` passes — TypeScript clean
- [ ] `npm run build -w client` passes — TypeScript + Vite build clean
- [ ] `npm test` exits 0 — all 447+ tests pass
- [ ] New exported functions have at least a smoke test
- [ ] New routes follow `createXxxRoutes(getConfig)` factory pattern
- [ ] New shared types added to `shared/types.ts` (not duplicated in client or server)
- [ ] No new `any` types in `shared/types.ts`
- [ ] No shell injection — all user-supplied paths use `execFile`, never string interpolation

---

## Anti-Patterns to Avoid

All baseline anti-patterns from `docs/planning/AGENTS.md` apply, plus:

- **Do not use `bash -lc` with user-supplied paths** — use `execFile('rsync', [...args])` or `execFile('git', [...args], { cwd })`. Only hardcoded system commands can use shell strings.
- **Do not use `execAsync` (promisified exec) for new code** — use `execFileAsync` (promisified execFile). `exec` runs through a shell; `execFile` does not.
- **Do not remove `s3Utils.ts`** — utility functions are used by other routes. Only remove the S3 Staging route file and its UI.
- **Do not add SRT processing logic to route files** — `srtUtils.ts` is the canonical location.
- **Do not mock `fs/promises`** — all server I/O uses `fs-extra`. Mock target is `vi.mock('fs-extra')`.
- **Do not bypass `shared/naming.ts`** to parse filenames.
- **Do not add hooks directly to `useApi.ts`** — it's a barrel re-export.
- **Do not hardcode relay paths** — use `config.relayDirectory` via `getConfig()` + `expandPath()`.
- **Do not start the dev server in agents** — build and test only.

---

## Mock Patterns

```typescript
// Mock execFile for relay/system route tests
vi.mock('child_process', () => ({
  execFile: vi.fn((cmd, args, opts, cb) => {
    if (typeof opts === 'function') { cb = opts; opts = {}; }
    cb(null, { stdout: '', stderr: '' });
  }),
}));

// Or with promisify:
import { execFile } from 'child_process';
import { promisify } from 'util';
const execFileAsync = promisify(execFile);
// In tests, mock the module:
vi.mock('child_process', () => {
  const execFileMock = vi.fn();
  return {
    execFile: execFileMock,
    // promisify needs to work with it
  };
});

// Preferred: mock at the route level using vi.mock on the util
// If relay.ts imports execFileAsync from a local util, mock that util instead

// fs-extra mock (standard pattern)
vi.mock('fs-extra', () => ({
  default: {
    pathExists: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    ensureDir: vi.fn(),
    readdir: vi.fn(),
  },
}));
```

---

## Quality Gates (non-negotiable)

1. `npm run build -w server` clean — no TypeScript errors
2. `npm run build -w client` clean — no TypeScript errors or Vite build failures
3. `npm test` passes — all 447+ tests pass
4. No new `any` types introduced in `shared/types.ts`
5. No shell injection — zero `bash -lc` with user-supplied paths after this campaign
6. All relay routes check both `relayEnabled` AND `relayDirectory`
7. `parseRsyncDiff` correctly handles variable-width itemize-changes format

---

## Learnings (inherited from relay-collaboration-phase-1)

- **Use `execFile` not string interpolation for user-supplied paths** — `bash -lc "cd '${path}'"` is safe only for hardcoded system paths. User-configured paths can contain single-quotes, breaking shell quoting.
- **Route guards must check both configured AND enabled** — when a feature has both a path field and a boolean toggle, action routes must check both.
- **`startWatcher()` helper is mandatory** — WatcherManager has a private `startWatcher(config: WatcherConfig)` abstraction. Do NOT bypass it.
- **Validate `path.basename()` results before use** — returns `''` if path has trailing slash.
- **`updateFromConfig` must check all relevant config fields** — path changes AND enable flag toggles.
- **Test count baseline: 447** (as of 2026-03-22)
- **ESM `vi.spyOn` cannot intercept internal module calls** — verify through mocked external dependencies, not sibling function spies.
- **All server I/O uses `fs-extra`** — mock target is `vi.mock('fs-extra')`, not `vi.mock('fs/promises')`.
- **`useApi.ts` is a barrel re-export** — add domain hooks to their own `use*Api.ts` file, then re-export.

### manage-relay-refactor wave 1 (2026-03-22)

- **Config field triple-addition**: New config fields need (a) `shared/types.ts`, (b) `configManager.ts` saveConfig allowlist, AND (c) `index.ts` updateConfig propagation. Missing (c) creates silent bug — changes saved to disk but not applied in memory.
- **rsync parser: use first-space extraction** — `line.indexOf(' ')` is robust across rsync versions. `line.slice(12)` was version-dependent.
- **`execFile` for user-supplied paths is mandatory** — `promisify(execFile)` works cleanly for async/await. `mkdir -p` replaced with `fs.ensureDir()`.
- **S3 Staging retired** — `s3-staging.ts`, `S3StagingTool.tsx`, `useS3StagingApi.ts` deleted. `s3Utils.ts` and `poem-wui.ts` kept (used by other code). FolderKey still includes s3 entries (folders exist on disk).
- **Test count after campaign: 552** (38 shared + 126 client + 388 server real tests, some duplicated via dist/)
- **Agent scope creep**: Always include explicit "DO NOT MODIFY" section in AGENTS.md listing files outside scope.
