# AGENTS.md — relay-kanban

**Project**: FliHub — video recording workflow management tool
**Campaign**: relay-kanban (Divergence detection + Kanban UI for relay collaboration)
**Stack**: TypeScript monorepo — Express + Socket.io (server), React 19 + Vite + TailwindCSS v4 (client), shared types
**Last updated**: 2026-03-24
**Inherits from**: `docs/planning/relay-redesign/AGENTS.md`

---

## Project Overview

FliHub manages video recording workflows between David (creator) and Jan (editor). Files sync through a relay folder (SyncThing). This campaign adds **divergence detection** (comparing local vs relay file counts) and a **Kanban-style UI** so users see at a glance what needs syncing, in which direction, with green indicators when synced.

**Design direction**: Kanban horizontal flow — lanes go left-to-right (Recordings → 1st Edit → 2nd Edit → Final). Stages turn green when local matches relay. Split-pane is backup design. Timeline rejected.

**Mockup reference**: `.screenshots/relay-workflow-mockups.html` (Variation 1: Kanban Flow)

---

## Build & Run Commands

```bash
npm install                        # Install all workspace dependencies
npm run build -w server            # TypeScript compile server
npm run build -w client            # tsc -b && vite build
npm test                           # runs shared → server → client (980 tests passing: 818 server + 162 client)
npm test -w server                 # server tests only (fastest feedback loop)
npm test -w client                 # client tests only

lsof -i :5101 | grep LISTEN       # Check if server is running
```

**Note**: `shared/` has no build script — types are consumed via TypeScript project references. After changing `shared/types.ts`, run `npm run build -w server` and `npm run build -w client` to verify.

**Never start the dev server in an agent** — it's a long-running process. Build and test only.

---

## Directory Structure

```
flihub/
├── client/src/
│   ├── App.tsx                    # DO NOT MODIFY
│   ├── constants/
│   │   └── queryKeys.ts           # MODIFY — add divergence query keys
│   ├── components/
│   │   ├── ProjectsPanel.tsx      # MODIFY — upgrade RelayIndicator to Kanban badges
│   │   └── shared/
│   │       ├── RelayTool.tsx      # REWRITE — Kanban flow with divergence indicators
│   │       ├── RelayBrowser.tsx   # KEEP — browse data still feeds stats
│   │       └── (other tools)     # DO NOT MODIFY
│   ├── hooks/
│   │   ├── useApi.ts              # BARREL RE-EXPORT — add new hook re-exports
│   │   ├── useRelayApi.ts         # MODIFY — add useRelayDivergence(), useEnhancedRelayBrowse()
│   │   └── useSocket.ts           # READ ONLY (relay socket already wired)
│   └── config.ts                  # DO NOT MODIFY
├── server/src/
│   ├── index.ts                   # READ ONLY
│   ├── WatcherManager.ts          # READ ONLY
│   ├── routes/
│   │   ├── relay.ts               # MODIFY — add divergence endpoint, auto-create on collect, enhanced browse
│   │   ├── edit.ts                # READ ONLY — understand create-folders pattern
│   │   └── (other routes)        # DO NOT MODIFY
│   ├── test/
│   │   └── relay.test.ts          # MODIFY — add tests for new endpoints
│   └── utils/
│       └── pathUtils.ts           # READ ONLY — expandPath utility
└── shared/
    ├── types.ts                   # MODIFY — add divergence types, enhanced browse types
    └── (other files)             # DO NOT MODIFY
```

---

## DO NOT MODIFY (Explicit Scope Boundaries)

- `server/src/routes/` — ALL routes EXCEPT `relay.ts`
- `server/src/index.ts`, `server/src/WatcherManager.ts`
- `server/src/config/configManager.ts`
- `server/src/utils/` — all utility files
- `client/src/App.tsx` — main app shell
- `client/src/components/shared/` — ALL EXCEPT `RelayTool.tsx`
- `client/src/hooks/useSocket.ts`, `client/src/hooks/useConfigApi.ts`, `client/src/hooks/useSystemApi.ts`
- `shared/naming.ts`, `shared/paths.ts`, `shared/constants.ts`

---

## Work Unit Details

### 1. divergence-endpoint (Wave 1)

**Purpose**: New endpoint that compares local project files vs relay files per subfolder. This is the core data source for all Kanban divergence indicators.

**Files to modify**:
- `shared/types.ts` — add `RelayDivergenceInfo`, `RelayDivergenceResponse`
- `server/src/routes/relay.ts` — add `GET /divergence` endpoint
- `server/src/test/relay.test.ts` — add tests

**Types** (add to `shared/types.ts` near other relay types):
```typescript
export interface RelayDivergenceInfo {
  subfolder: RelaySubfolder;
  local: { fileCount: number; totalSize: number; files: string[] };
  relay: { fileCount: number; totalSize: number; files: string[] };
  localOnly: string[];    // files in local but not in relay (outgoing)
  relayOnly: string[];    // files in relay but not in local (incoming)
  direction: 'synced' | 'outgoing' | 'incoming' | 'both'; // overall sync direction
  folderExists: boolean;  // whether the local folder exists
}

export interface RelayDivergenceResponse {
  success: boolean;
  projectCode?: string;
  subfolders?: RelayDivergenceInfo[];
  error?: string;
}
```

**Endpoint logic** (add to `relay.ts`):
```typescript
// GET /api/relay/divergence — compare local vs relay for active project
router.get('/divergence', async (req, res) => {
  try {
    const config = getConfig();
    const paths = getRelayPaths(config);
    if ('error' in paths) return res.json({ success: false, error: paths.error });

    const subfolders: RelayDivergenceInfo[] = [];

    for (const subfolder of RELAY_SUBFOLDERS) {
      const localDir = path.join(paths.projectDir, subfolder);
      const relayDir = path.join(paths.relayProjectDir, subfolder);

      const localFiles = await listFiles(localDir);
      const relayFiles = await listFiles(relayDir);

      const localNames = new Set(localFiles.map(f => f.filename));
      const relayNames = new Set(relayFiles.map(f => f.filename));

      const localOnly = [...localNames].filter(n => !relayNames.has(n));
      const relayOnly = [...relayNames].filter(n => !localNames.has(n));

      let direction: RelayDivergenceInfo['direction'] = 'synced';
      if (localOnly.length > 0 && relayOnly.length > 0) direction = 'both';
      else if (localOnly.length > 0) direction = 'outgoing';
      else if (relayOnly.length > 0) direction = 'incoming';

      let folderExists = false;
      try { folderExists = (await fs.stat(localDir)).isDirectory(); } catch { /* noop */ }

      subfolders.push({
        subfolder,
        local: {
          fileCount: localFiles.length,
          totalSize: localFiles.reduce((s, f) => s + f.size, 0),
          files: localFiles.map(f => f.filename),
        },
        relay: {
          fileCount: relayFiles.length,
          totalSize: relayFiles.reduce((s, f) => s + f.size, 0),
          files: relayFiles.map(f => f.filename),
        },
        localOnly,
        relayOnly,
        direction,
        folderExists,
      });
    }

    res.json({ success: true, projectCode: paths.projectCode, subfolders });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});
```

**Extract a `listFiles` helper** (reuse the pattern from the existing `/files` endpoint):
```typescript
async function listFiles(dirPath: string): Promise<{ filename: string; size: number }[]> {
  try {
    const entries = await fs.readdir(dirPath);
    const files: { filename: string; size: number }[] = [];
    for (const entry of entries) {
      if (entry.startsWith('.')) continue;
      try {
        const stat = await fs.stat(path.join(dirPath, entry));
        if (stat.isFile()) files.push({ filename: entry, size: stat.size });
      } catch { /* skip */ }
    }
    return files;
  } catch {
    return []; // Directory doesn't exist
  }
}
```

Also refactor the existing `GET /files` endpoint to use this `listFiles` helper.

**Test target**: ~12 tests:
- All synced (same files both sides) → direction: 'synced'
- Local has extras → direction: 'outgoing', localOnly populated
- Relay has extras → direction: 'incoming', relayOnly populated
- Both have extras → direction: 'both'
- Empty local folder → folderExists: false, direction based on relay
- Empty relay folder → direction based on local
- Relay not configured → error response
- Hidden files (.DS_Store) excluded from counts
- Multiple subfolders returned in one response

**Mock pattern**: Same as existing relay tests — mock `fs.readdir` and `fs.stat` per directory path.

---

### 2. auto-create-on-collect (Wave 1)

**Purpose**: When Jan collects recordings from relay, auto-create edit-1st/ and edit-2nd/ folders so he's ready to start editing.

**Files to modify**:
- `server/src/routes/relay.ts` — modify `POST /collect`, add `POST /ensure-edit-folders`
- `server/src/test/relay.test.ts` — add tests

**Modify `POST /collect`** — after successful rsync for recordings subfolder:
```typescript
// In POST /collect, after successful rsync and logRelayActivity:
if (subfolder === 'recordings') {
  // Auto-create edit folders so editor is ready to start
  const editFolders = ['edit-1st', 'edit-2nd'];
  const created: string[] = [];
  for (const folder of editFolders) {
    const folderPath = path.join(paths.projectDir, folder);
    const exists = await fs.pathExists(folderPath);
    if (!exists) {
      await fs.mkdir(folderPath, { recursive: true });
      created.push(folder);
    }
  }
  if (created.length > 0) {
    logRelayActivity({
      projectCode: paths.projectCode,
      subfolder: 'recordings',
      action: 'collect',
      description: `Auto-created folders: ${created.join(', ')}`,
      timestamp: new Date().toISOString(),
    });
  }
}
```

**Add `POST /ensure-edit-folders`** — manual button for creating edit folders:
```typescript
// POST /api/relay/ensure-edit-folders — create edit-1st/ and edit-2nd/ if missing
router.post('/ensure-edit-folders', async (req, res) => {
  try {
    const config = getConfig();
    const paths = getRelayPaths(config);
    if ('error' in paths) return res.json({ success: false, error: paths.error });

    const editFolders = ['edit-1st', 'edit-2nd'];
    const results: { folder: string; created: boolean }[] = [];

    for (const folder of editFolders) {
      const folderPath = path.join(paths.projectDir, folder);
      const exists = await fs.pathExists(folderPath);
      if (!exists) {
        await fs.mkdir(folderPath, { recursive: true });
        results.push({ folder, created: true });
      } else {
        results.push({ folder, created: false });
      }
    }

    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});
```

**Test target**: ~8 tests:
- Collect recordings → edit-1st and edit-2nd created
- Collect recordings → folders already exist → no error, no duplicate
- Collect edit-1st → no auto-create (only triggers for recordings)
- Collect edit-2nd → no auto-create
- ensure-edit-folders → creates both when missing
- ensure-edit-folders → one exists, one missing → only creates missing one
- ensure-edit-folders → both exist → returns created: false for both
- ensure-edit-folders → relay not configured → error

**Important**: Use `fs.pathExists` (not `fs.stat`) to check — it's the existing pattern in relay.ts.

---

### 3. enhanced-browse (Wave 1)

**Purpose**: Enhance `GET /api/relay/browse` to include local file counts alongside relay counts. This powers the Projects page Kanban badges that show sync direction per project.

**Files to modify**:
- `shared/types.ts` — extend `RelayProjectInfo` to include local counts
- `server/src/routes/relay.ts` — modify browse endpoint
- `server/src/test/relay.test.ts` — update existing browse tests + add new ones

**Extend types** (modify `RelaySubfolderInfo` and `RelayProjectInfo` in `shared/types.ts`):
```typescript
// ADD new type (keep original for backward compat):
export interface RelayProjectSyncInfo extends RelayProjectInfo {
  localSubfolders: {
    recordings: RelaySubfolderInfo;
    'edit-1st': RelaySubfolderInfo;
    'edit-2nd': RelaySubfolderInfo;
  };
  syncStatus: {
    recordings: 'synced' | 'outgoing' | 'incoming' | 'both' | 'unknown';
    'edit-1st': 'synced' | 'outgoing' | 'incoming' | 'both' | 'unknown';
    'edit-2nd': 'synced' | 'outgoing' | 'incoming' | 'both' | 'unknown';
  };
}
```

**Enhance browse endpoint** — add `?detailed=true` query param:
```typescript
// GET /api/relay/browse?detailed=true
// When detailed=true, also scan local project directories for comparison
```

When `detailed=true`:
1. Scan relay dir as before (get relay counts)
2. For each project found in relay, look for matching local project dir in `config.projectsRootDirectory`
3. Scan local subfolders for counts
4. Compare: if relay count === local count → synced; relay > local → incoming; etc.

**Performance note**: Use `Promise.all` to scan all projects in parallel. Only count files, don't stat them (use readdir length). For 70 projects × 3 subfolders = 210 readdir calls — should complete in <500ms.

When `detailed=false` (default, backward compatible): return existing format unchanged.

**Test target**: ~8 tests:
- browse with detailed=false → existing format (backward compat)
- browse with detailed=true → includes localSubfolders and syncStatus
- Project in relay but not local → syncStatus: 'incoming' for all
- Project in both, same counts → syncStatus: 'synced'
- Project in both, local has more → syncStatus: 'outgoing'
- Empty relay dir → empty projects array
- projectsRootDirectory not set → localSubfolders all zero

---

### 4. kanban-relay-tool (Wave 2)

**Purpose**: Rewrite RelayTool.tsx as a horizontal Kanban board showing the relay workflow.

**Files to modify**:
- `client/src/components/shared/RelayTool.tsx` — REWRITE
- `client/src/hooks/useRelayApi.ts` — add `useRelayDivergence()` hook
- `client/src/hooks/useApi.ts` — re-export new hook
- `client/src/constants/queryKeys.ts` — add `relayDivergence` key

**Design (Kanban Flow)**:

```
┌─────────────────────────────────────────────────────────────────────┐
│ Relay — b85-clauding-01                     ● Relay connected      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─ Recordings ──┐  ┌─ 1st Edit ─────┐  ┌─ 2nd Edit ─────┐  ┌─ Final ─┐
│  │ ● 10 files    │  │ ● 1 file       │  │ ○ No files     │  │ ○ -     │
│  │  338 MB       │→ │  45 MB         │→ │                │→ │         │
│  │               │  │                │  │ ⚠ Folder       │  │         │
│  │ ✓ Synced      │  │ ↓ 1 incoming   │  │   missing      │  │         │
│  │               │  │                │  │ [Create]       │  │ [Promote]│
│  │ [Push]        │  │ [Collect]      │  │ [Push]         │  │         │
│  └───────────────┘  └────────────────┘  └────────────────┘  └─────────┘
│                                                                     │
│  Activity: Jan pushed first edit 2 hours ago                        │
└─────────────────────────────────────────────────────────────────────┘
```

**Lane states and colors**:
- `synced` → green border, green "✓ Synced" text, green dot
- `outgoing` → blue border, blue "↑ N to push" text
- `incoming` → amber border, amber "↓ N incoming" text
- `both` → red border, red "↕ N out / N in" text
- No folder → grey border, warning icon, "Create" button

**Data sources**:
- `useRelayDivergence()` → per-subfolder divergence (local vs relay counts, direction)
- `useRelayBrowse()` → relay file counts and sizes (existing)
- `useRelayActivity()` → activity feed (existing)
- `useRelayPush()`, `useRelayCollect()`, `useRelayPromote()` → action mutations (existing)
- `useEnvironment()` → machineRole for button labels

**Role-aware labels**:
```
Lane          Creator action          Editor action
Recordings    "Send to Editor"        "Pull into Project"
1st Edit      "Pull from Editor"      "Send to Creator"
2nd Edit      "Pull from Editor"      "Send to Creator"
Final         "Promote to Final"      (hidden)
```

**Key implementation**:
- Four lane cards in CSS grid `grid-cols-4` (Recordings, 1st Edit, 2nd Edit, Final)
- Each card self-contained: dot, file count, size, sync status, action button
- Arrow indicators (→) between lanes showing flow direction
- Folder creation button when `folderExists: false` (calls `POST /api/relay/ensure-edit-folders`)
- Activity feed as a single-line footer below the lanes
- Existing file drawer behavior (click to expand) kept for detailed file lists

**Hook** (add to `useRelayApi.ts`):
```typescript
export function useRelayDivergence() {
  return useQuery({
    queryKey: QUERY_KEYS.relayDivergence,
    queryFn: async (): Promise<RelayDivergenceResponse> => {
      const res = await fetch(`${API_URL}/api/relay/divergence`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    refetchInterval: 15000, // More frequent — this is the key indicator
  });
}
```

**Query key** (add to `queryKeys.ts`):
```typescript
relayDivergence: ['relay-divergence'] as const,
```

**Also update `useSocket.ts`** — in `useRelaySocket`, invalidate divergence on relay:changed:
```typescript
queryClient.invalidateQueries({ queryKey: QUERY_KEYS.relayDivergence });
```

**Test target**: 0 server tests. Client must build clean. No new `any` types.

---

### 5. project-kanban-badges (Wave 2)

**Purpose**: Upgrade the RelayIndicator in ProjectsPanel from plain colored dots to Kanban-style mini-badges showing sync direction and delta counts.

**Files to modify**:
- `client/src/components/ProjectsPanel.tsx` — rewrite `RelayIndicator` component
- `client/src/hooks/useRelayApi.ts` — add `useEnhancedRelayBrowse()` or modify `useRelayBrowse()`

**Current state**: RelayIndicator shows 3 colored dots (blue/amber/green) when relay has files. No direction info, no delta counts.

**New design (Kanban mini-badges)**:

```
Project Row:  b85-clauding-01  │ Plan │ REC │ 1st │ 2nd │ Rev │ ...  │ ●●● relay │
                                                                        ↑
                                                          Kanban mini-badges
```

Each subfolder gets a tiny badge:
- **Green** badge = synced (local matches relay)
- **Blue** badge with `↑N` = N files to push (outgoing)
- **Amber** badge with `↓N` = N files incoming
- **Red** badge with `↕` = both directions have deltas
- **No badge** = subfolder empty on both sides

Badge format: `REC ✓` (green) or `1st ↓2` (amber) or `2nd ↑1` (blue)

**Hook** — use enhanced browse with `?detailed=true`:
```typescript
export function useEnhancedRelayBrowse() {
  return useQuery({
    queryKey: [...QUERY_KEYS.relayBrowse, 'detailed'],
    queryFn: async (): Promise<RelayBrowseResponse & { projects: RelayProjectSyncInfo[] }> => {
      const res = await fetch(`${API_URL}/api/relay/browse?detailed=true`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    refetchInterval: 30000,
  });
}
```

**Tooltip** — on hover, show detailed breakdown:
```
Relay Status
  Recordings: 10 local, 10 relay ✓
  1st Edit:   0 local, 1 relay ↓
  2nd Edit:   — (no files)
```

**Test target**: 0 server tests. Client must build clean.

---

## Success Criteria Checklist

Before marking any work unit complete:

- [ ] `npm run build -w server` passes — TypeScript clean
- [ ] `npm run build -w client` passes — TypeScript + Vite build clean
- [ ] `npm test` exits 0 — all 980+ tests pass
- [ ] New exported functions have at least one test
- [ ] New routes use `getRelayPaths()` helper (no duplicated guard logic)
- [ ] New shared types added to `shared/types.ts` (not duplicated in client or server)
- [ ] No new `any` types
- [ ] No shell injection — all user-supplied paths use `execFile` or `fs` operations with validation
- [ ] Path traversal validation on all user-supplied filenames
- [ ] New hooks added to `useRelayApi.ts` and re-exported from `useApi.ts`
- [ ] New query keys added to `queryKeys.ts` constants (no inline strings)
- [ ] New endpoint tests follow existing relay.test.ts mock patterns

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
- **Do not add new socket events without updating `shared/types.ts` ServerToClientEvents**
- **Do not persist activity to disk** — the ring buffer is intentionally in-memory
- **Do not scan all 70 projects synchronously** — use `Promise.all` for parallel reads
- **Do not stat files when you only need counts** — `readdir` + filter is sufficient for browse

---

## Mock Patterns

Inherit all patterns from `relay.test.ts`. Key additions for this campaign:

```typescript
// Mock readdir to return different files for local vs relay directories
mockReaddir.mockImplementation(async (dir: string) => {
  // Local project recordings
  if (dir.includes('/projects/') && dir.includes('/recordings')) {
    return ['01-1-intro.mov', '02-1-setup.mov'];
  }
  // Relay recordings (has more files — incoming)
  if (dir.includes('/relay/') && dir.includes('/recordings')) {
    return ['01-1-intro.mov', '02-1-setup.mov', '03-1-demo.mov'];
  }
  // Local edit-1st doesn't exist — throw ENOENT
  if (dir.includes('/projects/') && dir.includes('/edit-1st')) {
    throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
  }
  return [];
});

// For enhanced browse — mock readdir with withFileTypes
mockReaddir.mockImplementation(async (dir: string, options?: any) => {
  if (options?.withFileTypes) {
    // Return Dirent-like objects for project directories
    return [
      { name: 'b85-clauding-01', isDirectory: () => true },
      { name: 'b86-demo', isDirectory: () => true },
      { name: '.stfolder', isDirectory: () => true }, // hidden, should be skipped
    ];
  }
  // Regular readdir for file lists
  return ['01-1-intro.mov', '.DS_Store'];
});

// For auto-create tests — track mkdir calls
mockEnsureDir.mockResolvedValue(undefined);
// Use mockPathExists to control folder existence
mockPathExists.mockImplementation(async (p: string) => {
  if (p.includes('edit-1st')) return false; // doesn't exist yet
  if (p.includes('edit-2nd')) return false;
  return true;
});
```

---

## Quality Gates (non-negotiable)

1. `npm run build -w server` clean — no TypeScript errors
2. `npm run build -w client` clean — no TypeScript errors or Vite build failures
3. `npm test` passes — all 980+ tests pass
4. No new `any` types introduced
5. No shell injection — zero `bash -lc` with user-supplied paths
6. All relay routes use `getRelayPaths()` helper
7. All rsync calls use `rsyncExcludeArgs()`
8. Path traversal validation on user-supplied filenames
9. New endpoints have test coverage (target: ~28 new tests across wave 1)
10. All query keys use `QUERY_KEYS.*` constants
11. Enhanced browse backward compatible (no `detailed` param = same response as before)

---

## Learnings (inherited from prior relay campaigns)

- **Config field triple-addition**: New config fields need (a) `shared/types.ts`, (b) `configManager.ts` saveConfig allowlist, AND (c) `index.ts` updateConfig propagation. Missing (c) creates silent bug. (No new config fields this campaign.)
- **rsync parser: use first-space extraction** — `line.indexOf(' ')` is robust across rsync versions.
- **`execFile` for user-supplied paths is mandatory** — `promisify(execFile)` works cleanly for async/await.
- **Test count at campaign start: 980** (818 server + 162 client).
- **Agent scope creep**: Always include explicit "DO NOT MODIFY" section listing files outside scope.
- **ESM `vi.spyOn` cannot intercept internal module calls** — verify through mocked external dependencies.
- **All server I/O uses `fs-extra`** — mock target is `vi.mock('fs-extra')`, not `vi.mock('fs/promises')`.
- **`useApi.ts` is a barrel re-export** — add domain hooks to their own `use*Api.ts` file, then re-export.
- **`shared/` has no build script** — `npm run build -w shared` fails. Verify types by building server + client.
- **Socket hook pattern**: Follow `useThumbsSocket()` — `getSocket()`, named handler, `socket.on()` in useEffect, cleanup in return.
- **Warm linen theme tokens**: Use `bg-surface`, `bg-surface-muted`, `border-warm`, `text-warm-primary`, `text-warm-secondary` etc. No bright whites.
- **Kanban preferred over timeline** — David thinks left-to-right, not top-to-bottom.
- **`fs.mkdir` with `{ recursive: true }` is idempotent** — safe to call even if folder exists.
- **Browse endpoint backward compatibility matters** — existing RelayTool.tsx and ProjectsPanel.tsx consume the current format. Adding `?detailed=true` avoids breaking them.
