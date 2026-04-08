# AGENTS.md — Disk Space Observability (B062)

**Project**: FliHub — video recording workflow management tool
**Campaign**: disk-observability (B062)
**Stack**: TypeScript monorepo — Express server + React 19 client + shared types
**Inherits from**: `docs/planning/AGENTS.md` (baseline) — read that file for full conventions

---

## Campaign Goal

Add disk space observability to the Projects view. Users can toggle on 8 columns (REC, TRASH, SHADOWS, OTHER, R-REC, R-1ST, R-2ND, TOTAL) that show per-subfolder disk usage with colour-coded pain thresholds. Thresholds are configurable in config.json. Detail drawer shows the same data with a refresh button.

---

## Build & Run Commands

```bash
npm run build -w shared    # ALWAYS after changing shared/types.ts
npm run build -w server    # TypeScript check
npm run build -w client    # TypeScript + Vite build check
npm test                   # All tests must pass (447+ total)
lsof -i :5101 | grep LISTEN  # Check if server is already running
```

---

## Key Paths for This Campaign

| Path | Purpose |
|------|---------|
| `shared/types.ts` | Add DiskSizeData, DiskThresholds, DiskThresholdLevel; extend Config |
| `server/src/utils/diskUtils.ts` | NEW — getDirSize, calculateProjectDiskSize, getThresholdLevel |
| `server/src/routes/projects.ts` | Add disk scan-all + per-project endpoints + in-memory cache |
| `server/src/config/configManager.ts` | Add diskThresholds defaults + archivePath |
| `client/src/hooks/useProjectDiskApi.ts` | NEW — useDiskScanAll, useProjectDisk |
| `client/src/hooks/useApi.ts` | Barrel re-export — add `export * from './useProjectDiskApi.js'` |
| `client/src/components/ProjectsPanel.tsx` | Toggle button + 8 new columns |
| `client/src/components/ProjectDetailDrawer.tsx` | Disk section + refresh button |

---

## Data Shapes — Read These Before Writing Code

### DiskSizeData (cache entry per project)

```typescript
export interface DiskSizeData {
  // B062: Disk space observability
  rec: number;        // bytes — recordings/ folder
  trash: number;      // bytes — -trash/ folder
  shadows: number;    // bytes — recording-shadows/ folder
  other: number;      // bytes — everything else in project dir
  rRec: number;       // bytes — relay/{project}/recordings/
  r1st: number;       // bytes — relay/{project}/edit-1st/
  r2nd: number;       // bytes — relay/{project}/edit-2nd/
  total: number;      // bytes — sum of all above
  calculatedAt: string; // ISO timestamp
  // Future archive fields (not populated in this pass):
  archivedAt?: string;
  archivePath?: string;
}
```

### DiskThresholds (config.json shape)

```typescript
export interface DiskThresholdConfig {
  faint: string | null;  // e.g. "300MB", "2GB", "0" — null = no threshold
  amber: string | null;
  red: string | null;
}

export interface DiskThresholds {
  // B062: Configurable pain thresholds per column
  stagePenaltyMultiplier: number;  // 0.5 = halve thresholds for published/archived
  columns: {
    trash:   DiskThresholdConfig;
    rec:     DiskThresholdConfig;
    shadows: DiskThresholdConfig;
    other:   DiskThresholdConfig;
    rRec:    DiskThresholdConfig;
    r1st:    DiskThresholdConfig;
    r2nd:    DiskThresholdConfig;
    total:   DiskThresholdConfig;
  };
}

export type DiskThresholdLevel = 'faint' | 'amber' | 'red' | null;
```

### Config extension

Add to `Config` interface in `shared/types.ts`:
```typescript
diskThresholds?: DiskThresholds;  // B062: Pain thresholds for disk observability columns
archivePath?: string;             // B062: External archive drive path (e.g. /Volumes/T7/youtube-PUBLISHED/appydave)
```

---

## Default Thresholds (use in configManager.ts)

```typescript
export const DEFAULT_DISK_THRESHOLDS: DiskThresholds = {
  stagePenaltyMultiplier: 0.5,
  columns: {
    trash:   { faint: '0',      amber: '300MB',  red: '1GB'   },
    rec:     { faint: '2GB',    amber: '5GB',    red: '10GB'  },
    shadows: { faint: '100MB',  amber: '300MB',  red: '500MB' },
    other:   { faint: '500MB',  amber: '1GB',    red: null    },
    rRec:    { faint: '1GB',    amber: '3GB',    red: '6GB'   },
    r1st:    { faint: '500MB',  amber: '2GB',    red: '4GB'   },
    r2nd:    { faint: '500MB',  amber: '2GB',    red: '4GB'   },
    total:   { faint: '3GB',    amber: '8GB',    red: '15GB'  },
  }
};
```

---

## server/src/utils/diskUtils.ts — What to Build

### getDirSize(dirPath: string): Promise<number>
- Use Node `fs/promises` + recursive `readdir` with `{ withFileTypes: true, recursive: true }` (Node 18+)
- **Return 0 if dir doesn't exist** — many projects won't have all subfolders, this must never throw
- Sum `stat.size` for all files (not directories)
- Do NOT use shell `du` — keep it pure Node

### calculateProjectDiskSize(projectDir: string, relayDir: string | null): Promise<DiskSizeData>
- projectDir: full expanded path to project folder (e.g. `/Users/davidcruwys/dev/video-projects/v-appydave/c37-...`)
- relayDir: full expanded path to relay project folder (e.g. `/Users/davidcruwys/relay/flihub-appydave/c37-...`) or null if relay not configured
- Calculate each subfolder independently (all can run in parallel via `Promise.all`)
- `other` = totalProjectDir − rec − trash − shadows (avoids double-counting)
- Returns `DiskSizeData` with `calculatedAt: new Date().toISOString()`

### parseSizeString(s: string | null): number
- Converts `"300MB"` → bytes, `"2GB"` → bytes, `"0"` → 0, `null` → `Infinity` (no threshold)
- Support: `B`, `KB`, `MB`, `GB`, `TB` (case-insensitive)

### getThresholdLevel(bytes: number, column: keyof DiskThresholds['columns'], stage: ProjectStage | null, thresholds: DiskThresholds): DiskThresholdLevel
- Apply `stagePenaltyMultiplier` if stage is `'published'` or `'archived'`
- Check red first, then amber, then faint (return highest triggered level)
- Return `null` if below all thresholds

---

## server/src/routes/projects.ts — New Endpoints

### In-memory cache

Add at module level (above route definitions):
```typescript
// B062: In-memory disk size cache (lost on server restart — by design)
const diskSizeCache = new Map<string, DiskSizeData>();
```

### POST /api/projects/disk/scan-all

- Scans ALL projects (reads `config.projectsRootDirectory`, lists project dirs)
- For each project: calls `calculateProjectDiskSize(projectDir, relayProjectDir)`
- Populates `diskSizeCache`
- Returns `{ success: true, results: Record<string, DiskSizeData> }`
- This will take several seconds for 76 projects — that's fine, client handles loading state

### GET /api/projects/:code/disk

- Checks `diskSizeCache.get(code)`
- If found: returns `{ success: true, data: cached, fromCache: true }`
- If not found: calculates on demand, stores in cache, returns `{ success: true, data: fresh, fromCache: false }`

---

## client/src/hooks/useProjectDiskApi.ts — What to Build

```typescript
// B062: Scan all projects — mutation (not query, because it's a heavy on-demand operation)
export function useDiskScanAll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => fetchApi<{ success: boolean; results: Record<string, DiskSizeData> }>(
      '/api/projects/disk/scan-all', { method: 'POST' }
    ),
    onSuccess: (data) => {
      if (data.success) {
        // Populate per-project cache entries in React Query
        Object.entries(data.results).forEach(([code, diskData]) => {
          queryClient.setQueryData(QUERY_KEYS.projectDisk(code), { success: true, data: diskData });
        });
      }
    },
  });
}

// B062: Get disk data for one project (on-demand, uses cache)
export function useProjectDisk(code: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.projectDisk(code || ''),
    queryFn: () => fetchApi<{ success: boolean; data: DiskSizeData }>(`/api/projects/${code}/disk`),
    enabled: !!code,
    staleTime: Infinity,  // Never auto-refetch — user triggers refresh explicitly
  });
}
```

Add to `QUERY_KEYS` in `client/src/constants/queryKeys.ts`:
```typescript
projectDisk: (code: string) => ['project-disk', code] as const,
```

Re-export from `useApi.ts`:
```typescript
export * from './useProjectDiskApi.js';
```

---

## ProjectsPanel — Toggle & Columns

### Toggle button

In the filter pills area (alongside All / Needs Attention / Dead / Ready to Edit):
- Button label: `Disk` (or `Disk ●` when active)
- State: `const [diskColumnsEnabled, setDiskColumnsEnabled] = useState(false)`
- On toggle-on: immediately call `scanAll()` mutation; show spinner in button while pending
- On toggle-off: `setDiskColumnsEnabled(false)` — columns disappear, cache untouched
- On re-toggle-on: fires `scanAll()` again (fresh data)

### 8 new columns (only render when diskColumnsEnabled)

Column order: REC | TRASH | SHADOWS | OTHER | R-REC | R-1ST | R-2ND | TOTAL

Each cell:
- Shows formatted size (e.g. `1.2 GB`, `340 MB`, `—` if 0 or not calculated)
- Background or text colour from `getThresholdLevel()` result:
  - `faint` → `text-amber-300` (very subtle)
  - `amber` → `text-amber-500` or `bg-amber-50 text-amber-700`
  - `red` → `bg-red-50 text-red-700`
  - `null` → default

Use a `formatBytes(n: number): string` helper in `client/src/utils/formatBytes.ts`:
- < 1 KB → `"—"` (treat as empty)
- < 1 MB → `"X KB"`
- < 1 GB → `"X MB"`
- >= 1 GB → `"X.X GB"`

### Loading state

While `scanAll` is pending: show a shimmer/skeleton in the disk cells or a loading indicator in the TOTAL column.

---

## Detail Drawer — Disk Section

Add a collapsible "Disk Usage" section to the project detail drawer:

- Shows all 8 values in a simple labeled list (not a table — too narrow)
- Each value colour-coded same as table columns
- **Refresh button** (↻) triggers `useProjectDisk(code)` refetch + server recalculates
- If data not yet in cache (never scanned): shows "Not calculated" with a "Calculate" button that calls `GET /api/projects/:code/disk`
- `calculatedAt` shown as subtle timestamp: "Calculated 5 min ago"

---

## Success Criteria

Before marking any work unit complete:

- [ ] `npm run build -w shared` passes (after shared-types unit)
- [ ] `npm run build -w server` passes
- [ ] `npm run build -w client` passes
- [ ] `npm test` exits 0 (447+ tests pass)
- [ ] getDirSize returns 0 for non-existent directories (not throws)
- [ ] parseSizeString handles all size units correctly
- [ ] scan-all route populates cache for all projects
- [ ] per-project route returns cached data if available
- [ ] Toggle-on triggers scan, toggle-off hides columns, re-toggle rescans
- [ ] Columns only appear when disk mode enabled
- [ ] Threshold colour coding matches requirements (stage multiplier applied for published/archived)
- [ ] Detail drawer shows breakdown with refresh
- [ ] diskThresholds present in config.json after first run (via configManager defaults)
- [ ] FR annotation `// B062:` on all new code

---

## Anti-Patterns for This Campaign

- **Do not use shell `du` for size calculation** — use pure Node recursive stat. Shell commands with user-supplied paths need careful quoting (see relay learnings). Pure Node avoids this entirely.
- **Do not throw if a subfolder doesn't exist** — `getDirSize` must return 0 gracefully. Projects are in varying states.
- **Do not add disk logic to existing route handlers** — keep it in `diskUtils.ts` and the new endpoints.
- **Do not add `projectDisk` query key inline in components** — use `QUERY_KEYS.projectDisk(code)` from `queryKeys.ts`.
- **Do not forget `npm run build -w shared`** after touching `shared/types.ts` — stale types are silent failures.
