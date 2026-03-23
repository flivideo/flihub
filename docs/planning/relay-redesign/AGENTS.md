# AGENTS.md — relay-redesign

**Project**: FliHub — video recording workflow management tool
**Campaign**: relay-redesign (Workflow-oriented relay UX)
**Stack**: TypeScript monorepo — Express + Socket.io (server), React 19 + Vite + TailwindCSS v4 (client), shared types
**Last updated**: 2026-03-23
**Inherits from**: `docs/planning/manage-relay-refactor-w2/AGENTS.md`

---

## Project Overview

FliHub is a TypeScript monorepo that watches Ecamm Live recordings, provides a web UI for naming/organising video files, and manages project assets for a YouTube creator workflow with editor collaboration via relay folders (SyncThing).

This campaign replaces the infrastructure-oriented relay UI (subfolder dropdown, global browser table, separate push/collect/promote sections) with a workflow-oriented design: three lane cards (Recordings → First Edit → Final), expandable file drawers with chapter grouping, an activity feed, toast notifications, and a setup guide for new collaborators.

**Design reference**: `.mochaccino/designs/relay-redesign/index.html` — the approved mockup.
**Requirements reference**: `docs/planning/requirements-relay-redesign.md`

---

## Build & Run Commands

```bash
npm install                        # Install all workspace dependencies
npm run build -w server            # TypeScript compile server
npm run build -w client            # tsc -b && vite build
npm test                           # runs shared → server → client (925 tests currently passing)
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
│   ├── App.tsx                    # Main app — tab navigation (DO NOT MODIFY)
│   ├── constants/
│   │   └── queryKeys.ts           # MODIFY — add relay query keys
│   ├── components/
│   │   ├── ManagePanel.tsx        # MODIFY — wire useRelaySocket(), maybe add toast hookup
│   │   └── shared/
│   │       ├── ToolsSidebar.tsx   # MODIFY — add relay indicators if needed
│   │       ├── RelayTool.tsx      # REWRITE — workflow lanes + file drawers
│   │       ├── RelayBrowser.tsx   # KEEP for now — browse data feeds lane stats
│   │       ├── SlideOutDrawer.tsx # Pattern template (DO NOT MODIFY)
│   │       ├── RenameTool.tsx     # DO NOT MODIFY
│   │       ├── GlingTool.tsx      # DO NOT MODIFY
│   │       └── RenumberTool.tsx   # DO NOT MODIFY
│   ├── hooks/
│   │   ├── useApi.ts              # BARREL RE-EXPORT — add new hook re-exports here only
│   │   ├── useRelayApi.ts         # MODIFY — add useRelayFiles(), useRelayActivity()
│   │   ├── useSocket.ts           # MODIFY — add useRelaySocket() hook
│   │   └── useSystemApi.ts        # READ ONLY — has useEnvironment() for machineRole
│   └── config.ts                  # API_URL constant (DO NOT MODIFY)
├── server/src/
│   ├── index.ts                   # Express app, Socket.io, route wiring (READ ONLY unless wiring activity storage)
│   ├── WatcherManager.ts          # MODIFY — fix relay watcher to emit real data + log activity
│   ├── config/
│   │   └── configManager.ts       # DO NOT MODIFY
│   ├── routes/
│   │   ├── relay.ts               # MODIFY — add files endpoint, activity endpoint
│   │   ├── system.ts              # DO NOT MODIFY
│   │   ├── poem-wui.ts            # DO NOT MODIFY
│   │   └── index.ts               # DO NOT MODIFY
│   ├── test/
│   │   └── relay.test.ts          # MODIFY — add tests for new endpoints
│   └── utils/
│       ├── pathUtils.ts           # expandPath, queryString (DO NOT MODIFY)
│       └── s3Utils.ts             # DO NOT MODIFY
└── shared/
    ├── types.ts                   # MODIFY — add relay:changed event, RelayFilesResponse, RelayActivityEvent
    ├── naming.ts                  # DO NOT MODIFY
    ├── paths.ts                   # DO NOT MODIFY
    └── constants.ts               # DO NOT MODIFY
```

---

## DO NOT MODIFY (Explicit Scope Boundaries)

- `server/src/routes/poem-wui.ts`, `assets.ts`, `thumbs.ts`, `manage.ts`, `transcriptions.ts` — unrelated routes
- `server/src/utils/s3Utils.ts`, `execAsync.ts` — unrelated utilities
- `server/src/config/configManager.ts` — no new config fields this campaign
- `client/src/App.tsx` — main app shell
- `client/src/components/shared/RenameTool.tsx`, `GlingTool.tsx`, `RenumberTool.tsx`, `SlideOutDrawer.tsx`
- Any Watch/Incoming/Config page components
- `shared/naming.ts`, `shared/paths.ts`, `shared/constants.ts`

---

## Work Unit Details

### 1. relay-socket-foundation (Wave 1)

**Purpose**: Wire up real-time relay events end-to-end: types → watcher → socket → client cache invalidation.

**Files to modify**:
- `shared/types.ts` — replace 3 placeholder relay events with `relay:changed`
- `client/src/constants/queryKeys.ts` — add relay keys
- `server/src/WatcherManager.ts` — fix `startRelayWatcher()` to parse file paths
- `client/src/hooks/useSocket.ts` — add `useRelaySocket()` hook

**shared/types.ts changes** — replace lines 425-428 in ServerToClientEvents:
```typescript
// OLD (remove):
'relay:recordings-available': (data: { projectCode: string; count: number }) => void;
'relay:edit-received': (data: { projectCode: string; filename: string }) => void;
'relay:sync-status': (data: { status: 'idle' | 'syncing' | 'error'; message?: string }) => void;

// NEW (add):
'relay:changed': (data: RelayChangeEvent) => void;
```

Add new type near other relay types (top of file):
```typescript
export interface RelayChangeEvent {
  projectCode: string;
  subfolder: RelaySubfolder;
  action: 'add' | 'unlink';
  filename: string;
  timestamp: string; // ISO date
}
```

**queryKeys.ts changes** — add to QUERY_KEYS object:
```typescript
// Relay collaboration
relayBrowse: ['relay-browse'] as const,
relayStatus: ['relay-status'] as const,
relayVersions: ['relay-versions'] as const,
relayFiles: (subfolder: string) => ['relay-files', subfolder] as const,
relayActivity: ['relay-activity'] as const,
```

**WatcherManager.ts changes** — fix `emitChange` in `startRelayWatcher()`:
```typescript
// Replace the current emitChange closure (lines 244-258)
const emitChange = (filePath: string, action: 'add' | 'unlink') => {
  const existingTimeout = this.debounceTimeouts.get('relay');
  if (existingTimeout) clearTimeout(existingTimeout);

  const timeout = setTimeout(() => {
    try {
      // Parse: /relay-dir/projectCode/subfolder/filename
      const relative = path.relative(expandedRelay, filePath);
      const parts = relative.split(path.sep);
      if (parts.length < 3) return; // Not deep enough to be a relay file

      const projectCode = parts[0];
      const subfolder = parts[1] as RelaySubfolder;
      const filename = parts.slice(2).join(path.sep);

      if (!['recordings', 'edit-1st', 'edit-2nd'].includes(subfolder)) return;

      console.log(`relay:changed — ${action} ${projectCode}/${subfolder}/${filename}`);
      this.io.emit('relay:changed', {
        projectCode,
        subfolder,
        action,
        filename,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Error emitting relay event:', err);
    }
  }, 1000);

  this.debounceTimeouts.set('relay', timeout);
};

// Update event listeners to pass filePath:
for (const event of ['add', 'unlink'] as const) {
  watcher.on(event, (filePath: string) => emitChange(filePath, event));
}
```

**useSocket.ts changes** — add hook following existing pattern (e.g. `useThumbsSocket`):
```typescript
export function useRelaySocket() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = getSocket();

    const handleRelayChanged = (data: RelayChangeEvent) => {
      console.log(`Socket: relay:changed — ${data.action} ${data.projectCode}/${data.subfolder}/${data.filename}`);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.relayBrowse });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.relayFiles(data.subfolder) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.relayActivity });
      if (data.subfolder === 'edit-2nd') {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.relayVersions });
      }
    };

    socket.on('relay:changed', handleRelayChanged);
    return () => { socket.off('relay:changed', handleRelayChanged); };
  }, [queryClient]);
}
```

**Also update useRelayApi.ts** — replace inline string keys with QUERY_KEYS constants:
- `['relay-browse']` → `QUERY_KEYS.relayBrowse`
- `['relay-status']` → `QUERY_KEYS.relayStatus`
- `['relay-versions']` → `QUERY_KEYS.relayVersions`
- Update all `invalidateQueries` calls to use constants too

**Test target**: 0 new server tests for this unit (watcher is integration-tested). Verify builds pass.

---

### 2. relay-files-endpoint (Wave 1)

**Purpose**: New endpoint returning per-file detail for a subfolder, enabling file drawers.

**Files to modify**:
- `server/src/routes/relay.ts` — add `GET /files` endpoint
- `shared/types.ts` — add `RelayFileInfo`, `RelayFilesResponse`
- `client/src/hooks/useRelayApi.ts` — add `useRelayFiles()` hook
- `client/src/hooks/useApi.ts` — re-export
- `server/src/test/relay.test.ts` — add tests

**Types** (add to `shared/types.ts`):
```typescript
export interface RelayFileInfo {
  filename: string;
  size: number;
  modified: string; // ISO date
  chapter: string;  // extracted from filename, e.g. "01" from "01-1-intro.mov"
}

export interface RelayFilesResponse {
  success: boolean;
  files?: RelayFileInfo[];
  subfolder?: RelaySubfolder;
  error?: string;
}
```

**Endpoint** (add to `relay.ts`):
```typescript
// GET /api/relay/files?subfolder=recordings&source=project|relay
// source=project: files in local project dir (for push preview)
// source=relay: files in relay dir (for collect preview)
router.get('/files', async (req, res) => {
  try {
    const config = getConfig();
    const paths = getRelayPaths(config);
    if ('error' in paths) return res.json({ success: false, error: paths.error });

    const subfolder = (req.query.subfolder as RelaySubfolder) || 'recordings';
    if (!RELAY_SUBFOLDERS.includes(subfolder)) {
      return res.json({ success: false, error: `Invalid subfolder: ${subfolder}` });
    }

    const source = (req.query.source as string) || 'project';
    const baseDir = source === 'relay' ? paths.relayProjectDir : paths.projectDir;
    const targetDir = path.join(baseDir, subfolder);

    try {
      const entries = await fs.readdir(targetDir);
      const files: RelayFileInfo[] = [];

      for (const entry of entries) {
        if (entry.startsWith('.')) continue;
        const fullPath = path.join(targetDir, entry);
        const stat = await fs.stat(fullPath);
        if (!stat.isFile()) continue;

        // Extract chapter from naming convention: "01-1-intro.mov" → "01"
        const chapterMatch = entry.match(/^(\d{2})-/);
        const chapter = chapterMatch ? chapterMatch[1] : '00';

        files.push({
          filename: entry,
          size: stat.size,
          modified: stat.mtime.toISOString(),
          chapter,
        });
      }

      // Sort by chapter, then filename
      files.sort((a, b) => a.chapter.localeCompare(b.chapter) || a.filename.localeCompare(b.filename));
      res.json({ success: true, files, subfolder });
    } catch {
      res.json({ success: true, files: [], subfolder }); // Dir doesn't exist yet
    }
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});
```

**Hook** (add to `useRelayApi.ts`):
```typescript
export function useRelayFiles(subfolder: RelaySubfolder, source: 'project' | 'relay' = 'project') {
  return useQuery({
    queryKey: [...QUERY_KEYS.relayFiles(subfolder), source],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/relay/files?subfolder=${subfolder}&source=${source}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<RelayFilesResponse>;
    },
    refetchInterval: 30000,
  });
}
```

**Test target**: ~8 tests (files with recordings, empty dir, hidden files filtered, chapter extraction, invalid subfolder, source=relay vs project, relay not configured)

---

### 3. relay-activity-endpoint (Wave 1)

**Purpose**: In-memory activity log for relay events, powering the activity feed UI.

**Files to modify**:
- `server/src/routes/relay.ts` — add activity ring buffer + `GET /activity` endpoint
- `server/src/WatcherManager.ts` — call activity logger when relay:changed fires
- `server/src/index.ts` — pass activity logger to watcher manager (or relay routes export it)
- `shared/types.ts` — add `RelayActivityEvent`, `RelayActivityResponse`
- `client/src/hooks/useRelayApi.ts` — add `useRelayActivity()` hook
- `server/src/test/relay.test.ts` — add tests

**Types** (add to `shared/types.ts`):
```typescript
export interface RelayActivityEvent {
  id: string;           // unique id (timestamp + random)
  projectCode: string;
  subfolder: RelaySubfolder;
  action: 'push' | 'collect' | 'promote' | 'file-detected';
  description: string;  // "You pushed 15 recordings (338 MB)"
  timestamp: string;    // ISO date
  fileCount?: number;
  totalSize?: number;
}

export interface RelayActivityResponse {
  success: boolean;
  events?: RelayActivityEvent[];
  error?: string;
}
```

**Activity buffer** (add to `relay.ts`):
```typescript
// In-memory ring buffer — last 50 events, no persistence needed
const activityLog: RelayActivityEvent[] = [];
const MAX_ACTIVITY = 50;

export function logRelayActivity(event: Omit<RelayActivityEvent, 'id'>) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  activityLog.unshift({ ...event, id });
  if (activityLog.length > MAX_ACTIVITY) activityLog.length = MAX_ACTIVITY;
}

// GET /api/relay/activity?projectCode=c32-bmad
router.get('/activity', (req, res) => {
  const projectCode = req.query.projectCode as string | undefined;
  const events = projectCode
    ? activityLog.filter(e => e.projectCode === projectCode)
    : activityLog;
  res.json({ success: true, events });
});
```

**Log from push/collect/promote routes** — at the end of each successful operation:
```typescript
// In POST /push success handler:
logRelayActivity({
  projectCode: paths.projectCode,
  subfolder,
  action: 'push',
  description: `Pushed ${subfolder} to relay`,
  timestamp: new Date().toISOString(),
});
```

**Log from watcher** — when relay:changed fires, also log a file-detected event. Pass `logRelayActivity` to WatcherManager or import from relay routes.

**Hook** (add to `useRelayApi.ts`):
```typescript
export function useRelayActivity(projectCode?: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.relayActivity, projectCode],
    queryFn: async () => {
      const qs = projectCode ? `?projectCode=${projectCode}` : '';
      const res = await fetch(`${API_URL}/api/relay/activity${qs}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<RelayActivityResponse>;
    },
    refetchInterval: 30000,
  });
}
```

**Test target**: ~6 tests (activity list, filter by project, activity logged on push, ring buffer overflow, empty activity)

---

### 4. relay-workflow-lanes (Wave 2)

**Purpose**: Rewrite RelayTool.tsx with the approved mockup design.

**Files to modify**:
- `client/src/components/shared/RelayTool.tsx` — REWRITE

**Design (from mockup)**:
- **Header**: "Relay — {projectCode}" + green "Relay connected" badge (top-right)
- **Three lane cards** in a CSS grid (1fr 1fr 1fr, gap 16px):
  - **Recordings** (blue dot) — file count, total MB, "Ready to send" / "N new from editor", action button
  - **First Edit** (amber dot) — file count, total MB, timestamp, action button
  - **Final** (green dot) — file count or "No files yet", promote button
- **Direction labels**: "YOU → EDITOR" or "EDITOR → YOU" based on machineRole
- **Action buttons**: Role-aware (creator sees "Send to Editor" on recordings, "Pull from Editor" on edit-1st)
- **"Show N files" toggle** at bottom of each card — opens full-width file drawer below the grid
- **File drawer**: Chapter-grouped table (chapter headers, filename/size/modified columns), footer with totals, close button

**Data sources**:
- Lane stats: `useRelayBrowse()` (existing) — gets file counts + sizes per subfolder
- File lists: `useRelayFiles(subfolder)` (new from wave 1) — gets individual files
- Versions: `useRelayVersions()` (existing) — for Final lane
- Actions: `useRelayPush()`, `useRelayCollect()`, `useRelayPromote()` (existing)
- Role: `useEnvironment()` → `machineRole`

**Role logic**:
```
Lane          Creator action       Editor action
Recordings    "Send to Editor"     "Pull into Project"
First Edit    "Pull from Editor"   "Send to Creator"
Final         "Promote"            "Send to Creator"
```

**Key implementation details**:
- Remove the subfolder `<select>` dropdown entirely
- Remove the separate Preview/Push/Collect/Promote sections
- Each lane card is self-contained with its own action button
- Preview runs automatically before push/collect (show diff in a small section within the lane)
- Only one file drawer open at a time (track with React state)
- Chapter grouping: parse `chapter` field from RelayFileInfo, group by chapter, show chapter label row

**No new server changes** — this is purely client-side, consuming endpoints from wave 1.

**Test target**: 0 server tests. Client build must pass.

---

### 5. relay-toast-notifications (Wave 2)

**Purpose**: Global toast notifications when relay files change.

**Files to modify**:
- `client/src/components/ManagePanel.tsx` — call `useRelaySocket()` so it's active when Manage tab is open
- OR `client/src/App.tsx` — call `useRelaySocket()` at app level so toasts fire on any tab

**Decision**: Wire in App.tsx alongside other socket hooks (useThumbsSocket, useAssetsSocket, etc.) so relay toasts fire regardless of which tab the user is on. This matches the requirement "David is on the Watch tab and gets a toast about Jan's edit."

**Toast formatting** in useRelaySocket (enhance the hook from wave 1):
```typescript
const handleRelayChanged = (data: RelayChangeEvent) => {
  // ... cache invalidation (already done in wave 1) ...

  // Toast notification
  if (data.action === 'add') {
    const label = data.subfolder === 'recordings' ? 'recordings'
      : data.subfolder === 'edit-1st' ? 'a first edit'
      : 'a final version';
    toast.info(`New relay activity: ${label} updated for ${data.projectCode}`);
  }
};
```

**Also**: Check if App.tsx already calls socket hooks — follow the same pattern.

**Test target**: 0 new tests. Verify build passes.

---

### 6. relay-setup-guide (Wave 2)

**Purpose**: Collapsible setup guide + project-list relay indicators.

**Files to modify**:
- `client/src/components/shared/RelayTool.tsx` — add SetupGuide section at bottom (part of the rewrite)
- `client/src/components/ProjectsPanel.tsx` or equivalent — add relay column/indicators

**Setup Guide** — collapsible `<details>` element:
```
Setup Help — How to configure Relay for a new collaborator

For David (Creator):
1. Install SyncThing on this machine and the editor's machine
2. Create relay folder: mkdir -p ~/relay/flihub-appydave
3. Share in SyncThing: Add the relay folder and share with editor
4. Set config: relayDirectory + relayEnabled in server/config.json
5. Set role: machineRole: "creator"
6. Verify: Relay Status shows green checkmark

For Jan (Editor):
1. Accept SyncThing share from David
2. Set config: relayDirectory + relayEnabled + machineRole: "editor"
3. Verify: Relay Status shows green checkmark
```

**Project-list relay indicators**:
- Read `useRelayBrowse()` data in the Projects component
- For each project row, show a colored dot if relay has files:
  - Blue dot = recordings present
  - Amber dot = edit-1st present
  - Green dot = edit-2nd present
- Hover tooltip: "3 recordings, 1 first edit"

**Identify the right component**: Check what renders the Projects tab list. It may be in `App.tsx` or a dedicated `ProjectsPanel.tsx`. The relay indicator needs to be added to each project row.

**Test target**: 0 server tests. Client build must pass.

---

## Success Criteria Checklist

Before marking any work unit complete:

- [ ] `npm run build -w server` passes — TypeScript clean
- [ ] `npm run build -w client` passes — TypeScript + Vite build clean
- [ ] `npm test` exits 0 — all 925+ tests pass
- [ ] New exported functions have at least one test
- [ ] New routes use `getRelayPaths()` helper (no duplicated guard logic)
- [ ] New shared types added to `shared/types.ts` (not duplicated in client or server)
- [ ] No new `any` types
- [ ] No shell injection — all user-supplied paths use `execFile` or `fs` operations with validation
- [ ] Path traversal validation on all user-supplied filenames
- [ ] New hooks added to `useRelayApi.ts` and re-exported from `useApi.ts`
- [ ] New query keys added to `queryKeys.ts` constants (no inline strings)

---

## Anti-Patterns to Avoid

All prior campaign anti-patterns still apply, plus:

- **Do not duplicate `getRelayPaths()` logic** — always call the helper
- **Do not add inline rsync excludes** — always use `rsyncExcludeArgs()`
- **Do not read relay directory synchronously** — all fs operations must be async
- **Do not trust user-supplied filenames** — validate no `/`, no `..`, no empty string
- **Do not import from `fs/promises`** — all server I/O uses `fs-extra`. Mock target is `vi.mock('fs-extra')`
- **Do not add hooks directly to `useApi.ts`** — create in `useRelayApi.ts`, re-export from `useApi.ts`
- **Do not modify files in the DO NOT MODIFY list** above
- **Do not start the dev server in agents** — build and test only
- **Do not use `exec` or `bash -lc`** — use `execFileAsync` for all shell commands
- **Do not bypass `getConfig()`** — always get config through the getter, never cache it
- **Do not use inline query key strings** — use `QUERY_KEYS.*` constants from `queryKeys.ts`
- **Do not add new socket events without updating `shared/types.ts` ServerToClientEvents** — TypeScript enforces this
- **Do not persist activity to disk** — the ring buffer is intentionally in-memory

---

## Mock Patterns

Inherit all patterns from `relay.test.ts`. Key additions for this campaign:

```typescript
// Mock fs.readdir for files endpoint (per-file detail)
mockReaddir.mockImplementation(async (dir: string) => {
  if (dir.includes('recordings')) return ['01-1-intro.mov', '01-2-intro.mov', '02-1-setup.mov', '.DS_Store'];
  if (dir.includes('edit-1st')) return ['c32-gling-edit.mp4'];
  if (dir.includes('edit-2nd')) return [];
  return [];
});

mockStat.mockImplementation(async (filepath: string) => ({
  isFile: () => true,
  isDirectory: () => false,
  size: 27800000, // ~27.8 MB
  mtime: new Date('2026-03-22T14:10:00Z'),
}));

// Activity buffer — test by importing logRelayActivity and calling it
// Then GET /activity should return the logged events
```

---

## Quality Gates (non-negotiable)

1. `npm run build -w server` clean — no TypeScript errors
2. `npm run build -w client` clean — no TypeScript errors or Vite build failures
3. `npm test` passes — all 925+ tests pass
4. No new `any` types introduced
5. No shell injection — zero `bash -lc` with user-supplied paths
6. All relay routes use `getRelayPaths()` helper
7. All rsync calls use `rsyncExcludeArgs()`
8. Path traversal validation on user-supplied filenames
9. New routes have at least smoke test coverage
10. All query keys use `QUERY_KEYS.*` constants

---

## Learnings (inherited from prior relay campaigns)

- **Config field triple-addition**: New config fields need (a) `shared/types.ts`, (b) `configManager.ts` saveConfig allowlist, AND (c) `index.ts` updateConfig propagation. Missing (c) creates silent bug.
- **rsync parser: use first-space extraction** — `line.indexOf(' ')` is robust across rsync versions.
- **`execFile` for user-supplied paths is mandatory** — `promisify(execFile)` works cleanly for async/await.
- **Test count after tech-debt-round1: 925** (80 shared + 167 client + 678 server).
- **Agent scope creep**: Always include explicit "DO NOT MODIFY" section listing files outside scope.
- **ESM `vi.spyOn` cannot intercept internal module calls** — verify through mocked external dependencies.
- **All server I/O uses `fs-extra`** — mock target is `vi.mock('fs-extra')`, not `vi.mock('fs/promises')`.
- **`useApi.ts` is a barrel re-export** — add domain hooks to their own `use*Api.ts` file, then re-export.
- **`shared/` has no build script** — `npm run build -w shared` fails. Verify types by building server + client.
- **Stale closure in ManagePanel**: When adding hooks, ensure dependencies are in the useEffect dependency array. Prior campaign (manage-panel-polish) found a stale closure bug in ManagePanel.
- **Socket hook pattern**: Follow `useThumbsSocket()` exactly — `getSocket()`, named handler function, `socket.on()` in useEffect, cleanup with `socket.off()` in return function.
