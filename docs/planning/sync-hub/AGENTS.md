# AGENTS.md — sync-hub

**Project**: FliHub — video recording workflow management tool
**Campaign**: sync-hub (B044 — two-channel git sync with persistent header indicators)
**Stack**: TypeScript monorepo — Express + Socket.io (server), React 19 + Vite + TailwindCSS v4 (client), shared types
**Last updated**: 2026-03-23
**Inherits from**: `docs/planning/relay-redesign/AGENTS.md`

---

## Project Overview

FliHub is a TypeScript monorepo managing video recording workflows for a YouTube creator (David) with editor collaborators (Jan, Roamy). This campaign adds a Sync Hub — git-based push/pull for two separate repos:

1. **App Code** (`~/dev/ad/flivideo/flihub`) — the FliHub application itself. Read-only in the UI: show dirty/behind/clean status. David commits and pushes from terminal. Editors can pull + see restart instructions.
2. **Video Project** (`projectsRootDirectory` from config, e.g. `~/dev/video-projects/v-appydave`) — video recordings and assets. Push auto-commits with a descriptive message, then pushes. Pull with conflict detection.

**Design reference**: `.mochaccino/designs/sync-hub/index.html` — 5 interactive scenarios.
**Next-round brief**: `docs/planning/next-round-brief.md`

---

## Build & Run Commands

```bash
npm install                        # Install all workspace dependencies
npm run build -w server            # TypeScript compile server
npm run build -w client            # tsc -b && vite build
npm test                           # runs shared → server → client (925+ tests currently passing)
npm test -w server                 # server tests only (fastest feedback loop)
npm test -w client                 # client tests only

lsof -i :5101 | grep LISTEN       # Check if server is running
```

**Note**: `shared/` has no build script — types are consumed directly via TypeScript project references. After changing `shared/types.ts`, run `npm run build -w server` and `npm run build -w client` to verify.

**Never start the dev server in an agent** — it's a long-running process. Build and test only.

---

## Directory Structure

```
flihub/
├── client/src/
│   ├── App.tsx                    # MODIFY — add SyncIndicator to header, wire useRelaySocket pattern
│   ├── constants/
│   │   └── queryKeys.ts           # MODIFY — add sync query keys
│   ├── components/
│   │   ├── ManagePanel.tsx        # MODIFY — add 'sync' to ActiveTool, remove useGitSync, add SyncTool
│   │   └── shared/
│   │       ├── ToolsSidebar.tsx   # MODIFY — add Sync button under Collaborate, remove Git Sync from Actions
│   │       ├── SyncTool.tsx       # CREATE — Sync Hub page (two channel cards)
│   │       ├── SyncIndicator.tsx  # CREATE — persistent header pills
│   │       ├── RelayTool.tsx      # DO NOT MODIFY
│   │       ├── RelayBrowser.tsx   # DO NOT MODIFY
│   │       ├── SlideOutDrawer.tsx # DO NOT MODIFY
│   │       ├── RenameTool.tsx     # DO NOT MODIFY
│   │       ├── GlingTool.tsx      # DO NOT MODIFY
│   │       └── RenumberTool.tsx   # DO NOT MODIFY
│   ├── hooks/
│   │   ├── useApi.ts              # MODIFY — add re-exports for sync hooks
│   │   ├── useSyncApi.ts          # CREATE — useSyncStatus(), useSyncPush(), useSyncPull()
│   │   ├── useRelayApi.ts         # DO NOT MODIFY
│   │   ├── useSocket.ts           # DO NOT MODIFY
│   │   └── useSystemApi.ts        # MODIFY — remove useGitSync() (replaced by useSyncPull)
│   └── config.ts                  # DO NOT MODIFY — API_URL constant
├── server/src/
│   ├── index.ts                   # MODIFY — import and wire createSyncRoutes at /api/sync
│   ├── routes/
│   │   ├── sync.ts                # CREATE — git status, push, pull endpoints
│   │   ├── system.ts              # MODIFY — remove POST /git-sync endpoint (moved to sync.ts)
│   │   ├── relay.ts               # DO NOT MODIFY
│   │   └── [all other routes]     # DO NOT MODIFY
│   ├── test/
│   │   ├── sync.test.ts           # CREATE — tests for sync endpoints
│   │   └── [existing tests]       # DO NOT MODIFY
│   ├── config/
│   │   └── configManager.ts       # DO NOT MODIFY — no new config fields needed
│   └── utils/
│       └── pathUtils.ts           # READ ONLY — expandPath()
└── shared/
    ├── types.ts                   # MODIFY — add sync types (SyncChannelStatus, etc.)
    ├── naming.ts                  # DO NOT MODIFY
    ├── paths.ts                   # DO NOT MODIFY
    └── constants.ts               # DO NOT MODIFY
```

---

## DO NOT MODIFY (Explicit Scope Boundaries)

- `server/src/routes/relay.ts`, `assets.ts`, `thumbs.ts`, `manage.ts`, `transcriptions.ts`, `projects.ts`, `chapters.ts`, `video.ts`, `shadows.ts`, `edit.ts`, `poem-wui.ts`, `state.ts`, `developer.ts` — unrelated routes
- `server/src/utils/s3Utils.ts`, `execAsync.ts` — unrelated utilities
- `server/src/config/configManager.ts` — no new config fields this campaign
- `server/src/WatcherManager.ts` — no watcher changes needed
- `client/src/components/shared/RelayTool.tsx`, `RelayBrowser.tsx`, `RenameTool.tsx`, `GlingTool.tsx`, `RenumberTool.tsx`, `SlideOutDrawer.tsx`
- `client/src/hooks/useRelayApi.ts`, `useSocket.ts`
- `shared/naming.ts`, `shared/paths.ts`, `shared/constants.ts`

---

## Key Design Decisions

### App Code is read-only in the UI
- Show status (dirty count, behind count, local/remote hash) — but NO push button
- Editors get a "Pull & Restart" button that pulls code, then shows manual restart instructions
- David sees dirty state as a reminder to commit/push from terminal

### Video Project push auto-commits
- Stage all changes: `git add -A`
- Build commit message from `git status --porcelain`: group files by type/chapter
  - Example: `Push: 03-9-demo.mov, 03-10-setup.mov (2 recordings), project-state.json`
  - Truncate if too many files: `Push: 12 files (8 recordings, 3 transcripts, 1 other)`
- Then `git push`

### Conflict handling is simplified
- On pull, if `git pull --rebase` fails with conflicts: parse conflict file list
- UI shows per-file: "Keep mine" / "Keep theirs" buttons
- No diff view (binary video files can't be diffed meaningfully)
- After resolution: auto-commit merge result

### Polling at 120s
- `useSyncStatus()` polls `GET /api/sync/status` every 120 seconds
- Status endpoint runs `git fetch` (to update remote refs) then reads local state
- `git fetch` is cheap and non-destructive

### App code directory from process.cwd()
- No new config field — server always runs from the flihub repo root
- Video project directory from `getConfig().projectsRootDirectory` (already exists)

---

## Work Unit Details

### 1. sync-status-endpoints (Wave 1)

**Purpose**: Server endpoint returning git state for both repos.

**Files to create/modify**:
- `server/src/routes/sync.ts` — CREATE new route file
- `shared/types.ts` — add sync types
- `server/src/index.ts` — wire routes at `/api/sync`
- `server/src/test/sync.test.ts` — CREATE tests

**Types** (add to `shared/types.ts`):
```typescript
// B044: Sync Hub — git sync status types
export type SyncState = 'clean' | 'dirty' | 'behind' | 'ahead' | 'diverged' | 'conflict' | 'unknown';

export interface SyncChannelStatus {
  channel: 'app-code' | 'video-project';
  state: SyncState;
  localHash: string;       // short SHA
  remoteHash: string;      // short SHA
  dirtyCount: number;      // uncommitted files (untracked + modified + staged)
  behindCount: number;     // commits behind remote
  aheadCount: number;      // commits ahead of remote
  lastFetch: string;       // ISO date of last git fetch
  dirtyFiles?: string[];   // list of dirty filenames (for commit message preview)
  error?: string;          // if git commands fail
}

export interface SyncStatusResponse {
  success: boolean;
  appCode?: SyncChannelStatus;
  videoProject?: SyncChannelStatus;
  error?: string;
}
```

**Route** (`sync.ts`):
```typescript
import { Router, Request, Response } from 'express';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { getConfig } from '../config/configManager.js';
import { expandPath } from '../utils/pathUtils.js';
import type { SyncChannelStatus, SyncState, SyncStatusResponse } from '@flihub/shared';

const execFileAsync = promisify(execFile);

export function createSyncRoutes() {
  const router = Router();

  async function getChannelStatus(
    channel: 'app-code' | 'video-project',
    repoDir: string
  ): Promise<SyncChannelStatus> {
    try {
      // Fetch remote refs (non-destructive)
      await execFileAsync('git', ['fetch', '--quiet'], {
        cwd: repoDir, timeout: 30000,
      });

      // Local HEAD short hash
      const { stdout: localHash } = await execFileAsync(
        'git', ['rev-parse', '--short', 'HEAD'],
        { cwd: repoDir }
      );

      // Remote HEAD short hash (tracking branch)
      const { stdout: remoteHash } = await execFileAsync(
        'git', ['rev-parse', '--short', '@{upstream}'],
        { cwd: repoDir }
      ).catch(() => ({ stdout: 'unknown' }));

      // Behind/ahead counts
      const { stdout: revList } = await execFileAsync(
        'git', ['rev-list', '--left-right', '--count', 'HEAD...@{upstream}'],
        { cwd: repoDir }
      ).catch(() => ({ stdout: '0\t0' }));
      const [aheadStr, behindStr] = revList.trim().split(/\s+/);
      const aheadCount = parseInt(aheadStr, 10) || 0;
      const behindCount = parseInt(behindStr, 10) || 0;

      // Dirty files (porcelain for machine parsing)
      const { stdout: statusOut } = await execFileAsync(
        'git', ['status', '--porcelain'],
        { cwd: repoDir }
      );
      const dirtyFiles = statusOut.trim()
        ? statusOut.trim().split('\n').map(line => line.slice(3))
        : [];
      const dirtyCount = dirtyFiles.length;

      // Determine state
      let state: SyncState = 'clean';
      if (dirtyCount > 0 && behindCount > 0) state = 'diverged';
      else if (dirtyCount > 0) state = 'dirty';
      else if (behindCount > 0) state = 'behind';
      else if (aheadCount > 0) state = 'ahead';

      return {
        channel,
        state,
        localHash: localHash.trim(),
        remoteHash: remoteHash.trim(),
        dirtyCount,
        behindCount,
        aheadCount,
        lastFetch: new Date().toISOString(),
        dirtyFiles: dirtyCount > 0 ? dirtyFiles : undefined,
      };
    } catch (error) {
      return {
        channel,
        state: 'unknown',
        localHash: '',
        remoteHash: '',
        dirtyCount: 0,
        behindCount: 0,
        aheadCount: 0,
        lastFetch: new Date().toISOString(),
        error: String(error),
      };
    }
  }

  // GET /api/sync/status
  router.get('/status', async (_req: Request, res: Response) => {
    const config = getConfig();
    const appCodeDir = process.cwd();
    const videoProjectDir = config.projectsRootDirectory
      ? expandPath(config.projectsRootDirectory)
      : null;

    const [appCode, videoProject] = await Promise.all([
      getChannelStatus('app-code', appCodeDir),
      videoProjectDir
        ? getChannelStatus('video-project', videoProjectDir)
        : Promise.resolve(null),
    ]);

    const response: SyncStatusResponse = {
      success: true,
      appCode,
      ...(videoProject && { videoProject }),
    };
    res.json(response);
  });

  return router;
}
```

**Wiring** (add to `server/src/index.ts`):
```typescript
import { createSyncRoutes } from './routes/sync.js';
// ... in route setup section:
const syncRoutes = createSyncRoutes();
app.use('/api/sync', syncRoutes);
```

**Test target**: ~10 tests — clean repo, dirty repo, behind, ahead, diverged, no remote, video project not configured, error handling.

---

### 2. sync-actions-endpoints (Wave 1)

**Purpose**: Push (video project only) and pull (both channels) endpoints.

**Files to modify**:
- `server/src/routes/sync.ts` — add push and pull routes
- `server/src/routes/system.ts` — remove POST /git-sync (moved here)
- `shared/types.ts` — add response types
- `server/src/test/sync.test.ts` — add tests

**Types** (add to `shared/types.ts`):
```typescript
export interface SyncPushResponse {
  success: boolean;
  commitHash?: string;
  commitMessage?: string;
  filesCommitted?: number;
  output?: string;
  error?: string;
}

export interface SyncConflictFile {
  path: string;
  status: 'both-modified' | 'deleted-by-them' | 'deleted-by-us' | 'added-by-both';
}

export interface SyncPullResponse {
  success: boolean;
  output?: string;
  behindCount?: number;       // commits pulled
  conflicts?: SyncConflictFile[];
  restartInstructions?: string; // for app-code channel
  error?: string;
}

export interface SyncResolveRequest {
  channel: 'app-code' | 'video-project';
  file: string;
  resolution: 'keep-mine' | 'keep-theirs';
}

export interface SyncResolveResponse {
  success: boolean;
  remainingConflicts?: number;
  error?: string;
}
```

**Push endpoint** (video project only):
```typescript
// POST /api/sync/push — auto-commit + push video project
router.post('/push', async (_req: Request, res: Response) => {
  const config = getConfig();
  if (!config.projectsRootDirectory) {
    res.json({ success: false, error: 'No projects root directory configured' });
    return;
  }
  const repoDir = expandPath(config.projectsRootDirectory);

  try {
    // Stage all changes
    await execFileAsync('git', ['add', '-A'], { cwd: repoDir });

    // Build commit message from status
    const { stdout: statusOut } = await execFileAsync(
      'git', ['diff', '--cached', '--name-only'], { cwd: repoDir }
    );
    const files = statusOut.trim().split('\n').filter(Boolean);
    if (files.length === 0) {
      res.json({ success: false, error: 'Nothing to commit' });
      return;
    }
    const commitMessage = buildCommitMessage(files);

    // Commit
    await execFileAsync('git', ['commit', '-m', commitMessage], {
      cwd: repoDir, timeout: 30000,
    });

    // Push
    const { stdout, stderr } = await execFileAsync(
      'git', ['push'], { cwd: repoDir, timeout: 120000 }
    );

    // Get new commit hash
    const { stdout: hash } = await execFileAsync(
      'git', ['rev-parse', '--short', 'HEAD'], { cwd: repoDir }
    );

    res.json({
      success: true,
      commitHash: hash.trim(),
      commitMessage,
      filesCommitted: files.length,
      output: stdout || stderr,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});
```

**buildCommitMessage helper** (in sync.ts):
```typescript
function buildCommitMessage(files: string[]): string {
  // Group by extension/type
  const recordings = files.filter(f => /\.(mov|mp4)$/i.test(f));
  const transcripts = files.filter(f => /\.(txt|srt)$/i.test(f));
  const images = files.filter(f => /\.(png|jpg|jpeg|gif|webp)$/i.test(f));
  const other = files.filter(f =>
    !recordings.includes(f) && !transcripts.includes(f) && !images.includes(f)
  );

  if (files.length <= 5) {
    // Short list — show filenames
    const names = files.map(f => f.split('/').pop()).join(', ');
    return `Push: ${names}`;
  }

  // Longer — show counts by type
  const parts: string[] = [];
  if (recordings.length) parts.push(`${recordings.length} recording${recordings.length > 1 ? 's' : ''}`);
  if (transcripts.length) parts.push(`${transcripts.length} transcript${transcripts.length > 1 ? 's' : ''}`);
  if (images.length) parts.push(`${images.length} image${images.length > 1 ? 's' : ''}`);
  if (other.length) parts.push(`${other.length} other`);
  return `Push: ${files.length} files (${parts.join(', ')})`;
}
```

**Pull endpoint** (both channels):
```typescript
// POST /api/sync/pull
router.post('/pull', async (req: Request, res: Response) => {
  const { channel } = req.body as { channel: 'app-code' | 'video-project' };
  if (!channel || !['app-code', 'video-project'].includes(channel)) {
    res.json({ success: false, error: 'Invalid channel' });
    return;
  }

  const repoDir = channel === 'app-code'
    ? process.cwd()
    : expandPath(getConfig().projectsRootDirectory || '');

  if (!repoDir) {
    res.json({ success: false, error: 'Directory not configured' });
    return;
  }

  try {
    const { stdout, stderr } = await execFileAsync(
      'git', ['pull', '--rebase'],
      { cwd: repoDir, timeout: 120000 }
    );

    const response: SyncPullResponse = {
      success: true,
      output: stdout || stderr,
    };

    // App code pull: include restart instructions
    if (channel === 'app-code') {
      response.restartInstructions =
        'Code updated. To apply:\n' +
        '1. npm install (if dependencies changed)\n' +
        '2. npm run build\n' +
        '3. overmind restart (or ./start.sh)';
    }

    res.json(response);
  } catch (error) {
    const errorStr = String(error);
    // Detect merge conflicts
    if (errorStr.includes('CONFLICT') || errorStr.includes('could not apply')) {
      try {
        const { stdout: conflictOut } = await execFileAsync(
          'git', ['diff', '--name-only', '--diff-filter=U'],
          { cwd: repoDir }
        );
        const conflictFiles: SyncConflictFile[] = conflictOut.trim()
          .split('\n')
          .filter(Boolean)
          .map(path => ({ path, status: 'both-modified' as const }));

        res.json({
          success: false,
          conflicts: conflictFiles,
          error: 'Merge conflicts detected — resolve before continuing',
        });
        return;
      } catch {
        // Fall through to generic error
      }
    }
    res.status(500).json({ success: false, error: errorStr });
  }
});
```

**Resolve endpoint** (for conflicts):
```typescript
// POST /api/sync/resolve
router.post('/resolve', async (req: Request, res: Response) => {
  const { channel, file, resolution } = req.body as SyncResolveRequest;
  if (!channel || !file || !resolution) {
    res.json({ success: false, error: 'Missing channel, file, or resolution' });
    return;
  }

  // Validate no path traversal
  if (file.includes('..') || file.startsWith('/')) {
    res.json({ success: false, error: 'Invalid file path' });
    return;
  }

  const repoDir = channel === 'app-code'
    ? process.cwd()
    : expandPath(getConfig().projectsRootDirectory || '');

  try {
    const strategy = resolution === 'keep-mine' ? '--ours' : '--theirs';
    await execFileAsync('git', ['checkout', strategy, '--', file], { cwd: repoDir });
    await execFileAsync('git', ['add', file], { cwd: repoDir });

    // Check remaining conflicts
    const { stdout: remaining } = await execFileAsync(
      'git', ['diff', '--name-only', '--diff-filter=U'],
      { cwd: repoDir }
    );
    const remainingConflicts = remaining.trim() ? remaining.trim().split('\n').length : 0;

    // If no more conflicts, complete the rebase
    if (remainingConflicts === 0) {
      await execFileAsync('git', ['rebase', '--continue'], {
        cwd: repoDir,
        env: { ...process.env, GIT_EDITOR: 'true' },
      });
    }

    res.json({ success: true, remainingConflicts });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});
```

**Remove from system.ts**: Delete the `POST /git-sync` route (lines ~568-595) and its JSDoc comment. This functionality moves to `POST /api/sync/pull` with `channel: 'video-project'`.

**Test target**: ~12 tests — push with files, push nothing to commit, pull clean, pull behind, pull with conflicts, resolve keep-mine, resolve keep-theirs, resolve all done (rebase continue), invalid channel, path traversal blocked, buildCommitMessage short list, buildCommitMessage counts.

---

### 3. sync-types-and-hooks (Wave 1)

**Purpose**: Client-side hooks and query keys for the sync endpoints.

**Files to create/modify**:
- `client/src/hooks/useSyncApi.ts` — CREATE
- `client/src/hooks/useApi.ts` — add re-exports
- `client/src/hooks/useSystemApi.ts` — remove useGitSync()
- `client/src/constants/queryKeys.ts` — add sync keys

**Query keys** (add to `queryKeys.ts`):
```typescript
// B044: Sync Hub
syncStatus: ['sync-status'] as const,
```

**Hook file** (`useSyncApi.ts`):
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { API_URL } from '../config';
import { QUERY_KEYS } from '../constants/queryKeys';
import type {
  SyncStatusResponse,
  SyncPushResponse,
  SyncPullResponse,
  SyncResolveRequest,
  SyncResolveResponse,
} from '@flihub/shared';

export function useSyncStatus() {
  return useQuery({
    queryKey: QUERY_KEYS.syncStatus,
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/sync/status`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<SyncStatusResponse>;
    },
    refetchInterval: 120000, // 2 minutes
  });
}

export function useSyncPush() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_URL}/api/sync/push`, { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<SyncPushResponse>;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`Pushed ${data.filesCommitted} file${data.filesCommitted !== 1 ? 's' : ''}`);
      } else {
        toast.error(data.error || 'Push failed');
      }
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.syncStatus });
    },
    onError: () => toast.error('Push failed'),
  });
}

export function useSyncPull() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (channel: 'app-code' | 'video-project') => {
      const res = await fetch(`${API_URL}/api/sync/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<SyncPullResponse>;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Pull complete');
        if (data.restartInstructions) {
          toast.info('Restart needed — see Sync page for instructions');
        }
      } else if (data.conflicts?.length) {
        toast.warning(`${data.conflicts.length} conflict${data.conflicts.length !== 1 ? 's' : ''} — resolve in Sync page`);
      } else {
        toast.error(data.error || 'Pull failed');
      }
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.syncStatus });
    },
    onError: () => toast.error('Pull failed'),
  });
}

export function useSyncResolve() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (request: SyncResolveRequest) => {
      const res = await fetch(`${API_URL}/api/sync/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<SyncResolveResponse>;
    },
    onSuccess: (data) => {
      if (data.success) {
        if (data.remainingConflicts === 0) {
          toast.success('All conflicts resolved');
        } else {
          toast.info(`${data.remainingConflicts} conflict${data.remainingConflicts !== 1 ? 's' : ''} remaining`);
        }
      } else {
        toast.error(data.error || 'Resolution failed');
      }
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.syncStatus });
    },
    onError: () => toast.error('Resolution failed'),
  });
}
```

**useApi.ts re-exports** — add:
```typescript
export { useSyncStatus, useSyncPush, useSyncPull, useSyncResolve } from './useSyncApi';
```

**useSystemApi.ts** — remove the `useGitSync()` function entirely (lines 1-23). Keep `useOpenInboxFile()` and everything else. Update imports if `useMutation` or `toast` are no longer used by remaining functions.

**Test target**: 0 new tests (hooks are tested via endpoint integration). Verify build passes.

---

### 4. sync-header-indicators (Wave 2)

**Purpose**: Persistent sync status pills in the App.tsx header — visible on every page.

**Files to create/modify**:
- `client/src/components/shared/SyncIndicator.tsx` — CREATE
- `client/src/App.tsx` — MODIFY (add SyncIndicator to header)

**SyncIndicator component**:
```typescript
// Renders two small pills in the header:
//   🎬 Project  [green dot | red dot with count | amber dot with count | purple dot with !]
//   ⌘ Code      [green dot | red dot with count | amber dot with count]
//
// Each pill is clickable — navigates to Manage > Sync tab.
// Uses useSyncStatus() hook (120s polling).

interface SyncIndicatorProps {
  onNavigateToSync: () => void;
}
```

**Design from mockup** (map to Tailwind):
- Container: `flex items-center gap-3`
- Each pill: `flex items-center gap-1.5 text-xs px-2 py-0.5 rounded cursor-pointer`
- State colours:
  - `clean`: green dot, grey text
  - `dirty`: red dot, red text, red-50 background, count badge
  - `behind`: amber dot, amber text, amber-50 background, count badge
  - `conflict`: purple dot, purple text, purple-50 background, "!" badge
  - `unknown`/loading: grey dot, grey text
- Dot: `w-1.5 h-1.5 rounded-full`
- Count badge: `text-[10px] font-semibold bg-current text-white rounded-full px-1 leading-4`

**Behaviour**:
- Clicking either pill calls `onNavigateToSync()` which sets activeTab to 'manage' and activeTool to 'sync'
- Tooltip on hover: "Video Project: 3 uncommitted files — click to open Sync"
- If `useSyncStatus()` returns error or loading: show grey dots with no text

**App.tsx integration** — add between project name and settings gear:
```tsx
{/* B044: Persistent sync indicators */}
<SyncIndicator onNavigateToSync={() => {
  setActiveTab('manage');
  // ManagePanel needs to know to activate sync tool — pass via prop or use URL state
}} />
<div className="w-px h-5 bg-gray-200" /> {/* divider */}
```

**Challenge**: App.tsx sets `activeTab` but ManagePanel manages `activeTool` internally. To navigate to Sync from the header indicator, either:
- (a) Lift `activeTool` state to App.tsx (large change, avoid)
- (b) Pass an `initialTool` prop to ManagePanel that triggers on change
- (c) Use a simple ref or callback pattern

Option (b) is cleanest — add `initialTool?: ActiveTool` prop to ManagePanel. When `initialTool` changes, set `activeTool` to it. Header click sets `activeTab='manage'` + `manageTool='sync'`.

**Test target**: 0 new tests. Verify build passes.

---

### 5. sync-tool-page (Wave 2)

**Purpose**: Full Sync page in ManagePanel — two channel cards with status, actions, banners.

**Files to create/modify**:
- `client/src/components/shared/SyncTool.tsx` — CREATE
- `client/src/components/ManagePanel.tsx` — MODIFY (add 'sync' to ActiveTool, render SyncTool, remove useGitSync usage)
- `client/src/components/shared/ToolsSidebar.tsx` — MODIFY (add Sync button, remove Git Sync button)

**ManagePanel changes**:
```typescript
// Update ActiveTool type:
export type ActiveTool = 'regen' | 'rename' | 'gling-edit' | 'renumber' | 'relay' | 'sync' | 'awb';

// Remove useGitSync import and usage
// Add SyncTool import
// Add case in the tool rendering section for 'sync'
// Add initialTool prop for header indicator navigation (see work unit 4)
```

**ToolsSidebar changes**:
```typescript
// In the Collaborate group, add Sync button after Relay:
<ToolButton
  label="Sync"
  active={activeTool === 'sync'}
  onClick={() => onToolClick('sync')}
  tooltip="Git sync for app code and video project"
/>

// Remove the Git Sync button from the Actions group entirely
// Remove onGitSync and isGitSyncPending props
```

**SyncTool.tsx design** (from mockup — two channel cards):

Each channel card:
- **Header row**: icon + title + path + status badge
- **State row**: 3 info boxes (local version, remote version, last sync / dirty files)
- **Action row**: Push/Pull buttons + hint text
- **Notification banner** (conditional): shown when dirty or behind

**Role-aware behaviour**:
```
Channel         Creator (David)               Editor (Jan/Roamy)
App Code        Shows dirty count (no push)   "Pull & Restart" button
Video Project   "Push Project" button         "Pull Project" button
```

Use `useEnvironment()` → `machineRole` to determine role (same pattern as RelayTool).

**Notification banners** (conditional, at top of page):
- Video project dirty: "Video project has uncommitted changes. {N} new recordings since last push."
- App code behind (editor): "App update available. David pushed {N} new commits."
- Video project behind (editor): "New recordings available. Pull to sync."

**Test target**: 0 server tests. Client build must pass.

---

### 6. sync-conflict-ui (Wave 2)

**Purpose**: Conflict detection display and resolution in SyncTool.

**Files to modify**:
- `client/src/components/shared/SyncTool.tsx` — add conflict state management and resolution UI

**This is part of SyncTool but broken out as a separate work unit because it has distinct logic.**

**Conflict state**: After `useSyncPull()` returns `conflicts` array, SyncTool enters conflict mode:
- Show purple conflict banner at top: "Merge conflict in Video Project. {N} files need resolution."
- Per-file card: filename + two buttons ("Keep mine" / "Keep theirs")
- Disable push/pull buttons while conflicts exist
- After all resolved (useSyncResolve returns remainingConflicts: 0): exit conflict mode, refresh status

**State management in SyncTool**:
```typescript
const [conflicts, setConflicts] = useState<SyncConflictFile[]>([]);

// After pull:
const handlePull = async (channel: 'app-code' | 'video-project') => {
  const result = await syncPull.mutateAsync(channel);
  if (result.conflicts?.length) {
    setConflicts(result.conflicts);
  }
};

// After resolve:
const handleResolve = async (file: string, resolution: 'keep-mine' | 'keep-theirs') => {
  const result = await syncResolve.mutateAsync({
    channel: 'video-project', file, resolution
  });
  if (result.success) {
    setConflicts(prev => prev.filter(c => c.path !== file));
  }
};
```

**Conflict card styling** (from mockup):
- Purple border, purple-50 background
- Monospace filename
- Two action buttons: "Keep mine" (purple primary) + "Keep theirs" (grey secondary)

**Test target**: 0 new tests. Verify build passes.

---

## Success Criteria Checklist

Before marking any work unit complete:

- [ ] `npm run build -w server` passes — TypeScript clean
- [ ] `npm run build -w client` passes — TypeScript + Vite build clean
- [ ] `npm test` exits 0 — all 925+ tests pass
- [ ] New exported functions have at least one test
- [ ] New shared types added to `shared/types.ts` (not duplicated in client or server)
- [ ] No new `any` types
- [ ] No shell injection — all git commands use `execFileAsync` with argument arrays
- [ ] Path traversal validation on user-supplied filenames (resolve endpoint)
- [ ] New hooks added to `useSyncApi.ts` and re-exported from `useApi.ts`
- [ ] New query keys added to `queryKeys.ts` constants (no inline strings)
- [ ] No inline query key strings
- [ ] Polling interval is 120000ms (2 minutes), not 30000ms

---

## Anti-Patterns to Avoid

All prior campaign anti-patterns still apply, plus:

- **Do not add a push button for App Code** — David commits/pushes from terminal only
- **Do not auto-restart the server** — show instructions, let the user restart manually
- **Do not use `exec` or `bash -lc`** — use `execFileAsync` for all git commands
- **Do not import from `fs/promises`** — all server I/O uses `fs-extra`. Mock target is `vi.mock('fs-extra')`
- **Do not add hooks directly to `useApi.ts`** — create in `useSyncApi.ts`, re-export from `useApi.ts`
- **Do not modify files in the DO NOT MODIFY list** above
- **Do not start the dev server in agents** — build and test only
- **Do not bypass `getConfig()`** — always get config through the getter
- **Do not use inline query key strings** — use `QUERY_KEYS.*` constants
- **Do not cache `process.cwd()`** — call it each time (it doesn't change, but consistent with getConfig pattern)
- **Do not add a new config field for appCodeDirectory** — use `process.cwd()`
- **Do not poll faster than 120s** — this is David's explicit preference
- **Do not show diff for conflicts** — simplified to keep mine / keep theirs only
- **Do not add socket events for sync** — polling is sufficient at 120s

---

## Mock Patterns

For `sync.test.ts`, mock `child_process.execFile`:

```typescript
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock child_process
const mockExecFile = vi.fn();
vi.mock('child_process', () => ({
  execFile: mockExecFile,
}));

// Mock util.promisify to return mockExecFile directly
vi.mock('util', () => ({
  promisify: () => mockExecFile,
}));

// Mock configManager
vi.mock('../config/configManager.js', () => ({
  getConfig: vi.fn(() => ({
    projectsRootDirectory: '~/dev/video-projects/v-appydave',
  })),
}));

// Mock pathUtils
vi.mock('../utils/pathUtils.js', () => ({
  expandPath: vi.fn((p: string) => p.replace('~', '/Users/test')),
}));

// Helper to set up git command responses
function mockGitResponse(command: string, response: { stdout?: string; stderr?: string }) {
  mockExecFile.mockImplementation(
    async (cmd: string, args: string[]) => {
      if (args[0] === command || args.includes(command)) {
        return { stdout: response.stdout || '', stderr: response.stderr || '' };
      }
      return { stdout: '', stderr: '' };
    }
  );
}

// For multiple git commands in sequence:
function mockGitSequence(responses: Record<string, { stdout?: string; stderr?: string }>) {
  mockExecFile.mockImplementation(
    async (_cmd: string, args: string[]) => {
      for (const [key, value] of Object.entries(responses)) {
        if (args.includes(key)) return { stdout: value.stdout || '', stderr: value.stderr || '' };
      }
      return { stdout: '', stderr: '' };
    }
  );
}
```

---

## Quality Gates (non-negotiable)

1. `npm run build -w server` clean — no TypeScript errors
2. `npm run build -w client` clean — no TypeScript errors or Vite build failures
3. `npm test` passes — all 925+ tests pass
4. No new `any` types introduced
5. No shell injection — zero use of `exec()` with string concatenation
6. All git commands use `execFileAsync` with argument arrays
7. Path traversal validation on resolve endpoint
8. Polling interval is exactly 120000ms
9. New routes have at least smoke test coverage
10. All query keys use `QUERY_KEYS.*` constants

---

## Learnings (inherited from relay-redesign + prior campaigns)

- **Config field triple-addition**: New config fields need (a) `shared/types.ts`, (b) `configManager.ts` saveConfig allowlist, AND (c) `index.ts` updateConfig propagation. Missing (c) creates silent bug. (Not needed this campaign — no new config fields.)
- **`execFile` for user-supplied paths is mandatory** — `promisify(execFile)` works cleanly for async/await.
- **Test count after relay-redesign: 925+** (80 shared + 167 client + 678 server).
- **Agent scope creep**: Always include explicit "DO NOT MODIFY" section listing files outside scope.
- **ESM `vi.spyOn` cannot intercept internal module calls** — verify through mocked external dependencies.
- **All server I/O uses `fs-extra`** — mock target is `vi.mock('fs-extra')`, not `vi.mock('fs/promises')`.
- **`useApi.ts` is a barrel re-export** — add domain hooks to their own `use*Api.ts` file, then re-export.
- **`shared/` has no build script** — `npm run build -w shared` fails. Verify types by building server + client.
- **Socket hook pattern**: Follow `useThumbsSocket()` exactly — `getSocket()`, named handler function, `socket.on()` in useEffect, cleanup with `socket.off()` in return function.
- **Route wiring pattern**: Import `createXRoutes` in index.ts, create instance, mount at `/api/x`.
- **ManagePanel tool pattern**: Add to `ActiveTool` union, add `ToolButton` in ToolsSidebar, add rendering case in ManagePanel tool switch.
