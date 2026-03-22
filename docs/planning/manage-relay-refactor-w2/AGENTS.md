# AGENTS.md — manage-relay-refactor-w2

**Project**: FliHub — video recording workflow management tool
**Campaign**: manage-relay-refactor-w2 (Wave 2 — relay feature expansion)
**Stack**: TypeScript monorepo — Express + Socket.io (server), React 19 + Vite + TailwindCSS v4 (client), shared types
**Last updated**: 2026-03-22
**Inherits from**: `docs/planning/manage-relay-refactor/AGENTS.md`

---

## Project Overview

FliHub is a TypeScript monorepo that watches Ecamm Live recordings, provides a web UI for naming/organising video files, and manages project assets for a YouTube creator workflow with editor collaboration via relay folders (SyncThing).

This campaign adds: relay folder browser, subfolder-aware push/collect, promote-to-final, role-based UI visibility, and visual pipeline indicators.

---

## Build & Run Commands

```bash
npm install                        # Install all workspace dependencies
npm run build -w shared            # ALWAYS run after changing shared/types.ts
npm run build -w server            # TypeScript compile server
npm run build -w client            # tsc -b && vite build
npm test                           # runs shared → server → client (552 tests currently passing)
npm test -w server                 # server tests only (fastest feedback loop)

lsof -i :5101 | grep LISTEN        # Check if server is running
```

**Never start the dev server in an agent** — it's a long-running process. Build and test only.

---

## Directory Structure

```
flihub/
├── client/src/
│   ├── App.tsx                    # Main app — tab navigation (DO NOT MODIFY)
│   ├── components/
│   │   ├── ManagePanel.tsx        # Manage page container (DO NOT MODIFY unless wiring new tool)
│   │   └── shared/
│   │       ├── ToolsSidebar.tsx   # MODIFY — role-based visibility (wave 3)
│   │       ├── RelayTool.tsx      # MODIFY — subfolder selector, promote section
│   │       ├── RelayBrowser.tsx   # CREATE — relay folder browser component (wave 1)
│   │       ├── SlideOutDrawer.tsx # Pattern template (DO NOT MODIFY)
│   │       ├── RenameTool.tsx     # DO NOT MODIFY
│   │       ├── GlingTool.tsx      # DO NOT MODIFY
│   │       └── RenumberTool.tsx   # DO NOT MODIFY
│   ├── hooks/
│   │   ├── useApi.ts              # BARREL RE-EXPORT — add new hook re-exports here only
│   │   ├── useRelayApi.ts         # MODIFY — add browse, promote, subfolder-aware mutations
│   │   └── useSystemApi.ts        # READ ONLY — has useEnvironment() for machineRole
│   └── config.ts                  # API_URL constant (DO NOT MODIFY)
├── server/src/
│   ├── index.ts                   # Express app, Socket.io, route wiring (MODIFY only to wire new routes if needed)
│   ├── WatcherManager.ts          # DO NOT MODIFY
│   ├── config/
│   │   └── configManager.ts       # DO NOT MODIFY
│   ├── routes/
│   │   ├── relay.ts               # MODIFY — extract helper, add browse/promote/versions routes, subfolder param
│   │   ├── system.ts              # DO NOT MODIFY (machineRole already exposed)
│   │   ├── poem-wui.ts            # DO NOT MODIFY
│   │   └── index.ts               # DO NOT MODIFY (relay routes already wired)
│   ├── test/
│   │   └── relay.test.ts          # MODIFY — add error-path tests, browse/promote/subfolder tests
│   └── utils/
│       ├── pathUtils.ts           # expandPath, queryString (DO NOT MODIFY)
│       └── s3Utils.ts             # DO NOT MODIFY
└── shared/
    ├── types.ts                   # MODIFY — add RelayBrowseResult, RelaySubfolder types
    ├── naming.ts                  # DO NOT MODIFY
    ├── paths.ts                   # DO NOT MODIFY
    └── constants.ts               # DO NOT MODIFY
```

---

## DO NOT MODIFY (Explicit Scope Boundaries)

These files are OUT OF SCOPE for all wave 2 agents. Do not read, modify, or refactor them:

- `server/src/routes/poem-wui.ts` — unrelated feature
- `server/src/utils/s3Utils.ts` — utility used by other code
- `server/src/utils/execAsync.ts` — legacy, not used by relay
- `server/src/routes/assets.ts`, `thumbs.ts`, `manage.ts`, `transcriptions.ts` — unrelated routes
- `server/src/WatcherManager.ts` — relay watcher setup already correct
- `server/src/config/configManager.ts` — no new config fields this wave
- `client/src/components/ManagePanel.tsx` — only modify if wiring a new tool component
- `client/src/App.tsx` — main app shell
- Any Watch/Incoming/Config page components
- Any test files other than `relay.test.ts`
- `shared/naming.ts`, `shared/paths.ts`, `shared/constants.ts`

---

## Work Unit Details

### 1. relay-foundation (Wave 1)

**Purpose**: Refactor relay.ts to reduce duplication before adding features. Add missing test coverage.

**Files to modify**:
- `server/src/routes/relay.ts` — extract helper, add exclusions
- `server/src/test/relay.test.ts` — add error-path and exclusion tests
- `shared/types.ts` — add `RelaySubfolder` type

**Extract `getRelayPaths(config)`** — currently duplicated 3x (lines 33-38, 63-68, 93-98):
```typescript
export type RelaySubfolder = 'recordings' | 'edit-1st' | 'edit-2nd';

export const RELAY_SUBFOLDERS: RelaySubfolder[] = ['recordings', 'edit-1st', 'edit-2nd'];

interface RelayPaths {
  projectDir: string;
  projectCode: string;
  relayProjectDir: string;
}

function getRelayPaths(config: Config): RelayPaths | { error: string } {
  if (!config.relayEnabled || !config.relayDirectory || !config.projectDirectory) {
    return { error: 'Relay not enabled or not configured' };
  }
  const projectDir = expandPath(config.projectDirectory);
  const projectCode = path.basename(projectDir);
  if (!projectCode || projectCode.includes('..')) {
    return { error: 'Invalid project directory' };
  }
  const relayProjectDir = path.join(expandPath(config.relayDirectory), projectCode);
  return { projectDir, projectCode, relayProjectDir };
}
```

Then refactor each route to use it:
```typescript
router.post('/preview', async (req, res) => {
  try {
    const config = getConfig();
    const paths = getRelayPaths(config);
    if ('error' in paths) return res.json({ success: false, error: paths.error });
    const { projectDir, relayProjectDir } = paths;
    // ... rest of route using paths
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});
```

**Add rsync exclusion patterns** — define once, use everywhere:
```typescript
const RSYNC_EXCLUDES = [
  '.DS_Store', '._*',
  '.gitkeep',
  '.stfolder', '.stignore', '.stversions',
  '.Spotlight-V100', '.Trashes',
  'Thumbs.db',
];

function rsyncExcludeArgs(): string[] {
  return RSYNC_EXCLUDES.flatMap(pattern => ['--exclude', pattern]);
}
```

Replace all inline `'--exclude', '.DS_Store', '--exclude', '._*'` with `...rsyncExcludeArgs()`.

**Add error-path tests** (3 new tests):
```typescript
it('POST /preview returns 500 when rsync fails', async () => {
  mockExecFile.mockImplementation(() => { throw new Error('rsync: connection refused'); });
  const res = await request(app).post('/api/relay/preview');
  expect(res.status).toBe(500);
  expect(res.body.success).toBe(false);
});
// Same pattern for push and collect
```

**Add exclusion verification tests** (2 new tests):
```typescript
it('POST /push includes all rsync exclusion patterns', async () => {
  mockExecFile.mockReturnValue({ stdout: '', stderr: '' });
  await request(app).post('/api/relay/push');
  const args = mockExecFile.mock.calls[0][1];
  expect(args).toContain('.stfolder');
  expect(args).toContain('.gitkeep');
  expect(args).toContain('Thumbs.db');
});
```

**Test target**: ~8 new tests

---

### 2. relay-folder-browser (Wave 1)

**Purpose**: New API endpoint + UI component to show what's in the relay folder.

**Files to modify/create**:
- `server/src/routes/relay.ts` — add GET `/browse` endpoint
- `client/src/components/shared/RelayBrowser.tsx` — CREATE new component
- `client/src/hooks/useRelayApi.ts` — add `useRelayBrowse()` hook
- `client/src/hooks/useApi.ts` — re-export `useRelayBrowse`
- `client/src/components/shared/RelayTool.tsx` — embed `<RelayBrowser />` at top
- `shared/types.ts` — add browse result types
- `server/src/test/relay.test.ts` — add browse tests

**Types** (add to `shared/types.ts`):
```typescript
export interface RelayProjectInfo {
  projectCode: string;
  subfolders: {
    recordings: { fileCount: number; totalSize: number };
    'edit-1st': { fileCount: number; totalSize: number };
    'edit-2nd': { fileCount: number; totalSize: number };
  };
}

export interface RelayBrowseResult {
  projects: RelayProjectInfo[];
  relayDirectory: string;
}
```

**Browse endpoint**:
```typescript
// GET /api/relay/browse — scan relay directory for per-project breakdown
router.get('/browse', async (req, res) => {
  try {
    const config = getConfig();
    if (!config.relayEnabled || !config.relayDirectory) {
      return res.json({ success: false, error: 'Relay not enabled' });
    }
    const relayDir = expandPath(config.relayDirectory);
    // Read top-level directories (each is a project)
    const entries = await fs.readdir(relayDir, { withFileTypes: true });
    const projects: RelayProjectInfo[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
      const projectPath = path.join(relayDir, entry.name);
      const subfolders = {} as RelayProjectInfo['subfolders'];

      for (const sub of RELAY_SUBFOLDERS) {
        const subPath = path.join(projectPath, sub);
        try {
          const files = await fs.readdir(subPath);
          // Filter out hidden files and directories
          const realFiles = [];
          let totalSize = 0;
          for (const f of files) {
            if (f.startsWith('.')) continue;
            const stat = await fs.stat(path.join(subPath, f));
            if (stat.isFile()) {
              realFiles.push(f);
              totalSize += stat.size;
            }
          }
          subfolders[sub] = { fileCount: realFiles.length, totalSize };
        } catch {
          subfolders[sub] = { fileCount: 0, totalSize: 0 };
        }
      }

      projects.push({ projectCode: entry.name, subfolders });
    }

    res.json({ success: true, projects, relayDirectory: config.relayDirectory });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});
```

**Client hook** (add to `useRelayApi.ts`):
```typescript
export function useRelayBrowse() {
  return useQuery({
    queryKey: ['relay-browse'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/relay/browse`);
      return res.json();
    },
    refetchInterval: 30000, // refresh every 30s
  });
}
```

**RelayBrowser component** — compact table:
```tsx
export function RelayBrowser() {
  const { data, isLoading } = useRelayBrowse();
  // Table: projectCode | recordings | edit-1st | edit-2nd
  // Each cell: "3 files (45 MB)" or "—"
  // Highlight the current project row if it matches config.projectDirectory
}
```

**Embed in RelayTool.tsx** — add `<RelayBrowser />` above the existing Status section.

**Test target**: ~6 new tests (browse with projects, empty relay, relay disabled, hidden files filtered, subfolder missing)

---

### 3. relay-push-collect-full (Wave 2)

**Purpose**: Extend push/collect/preview to support any subfolder, not just recordings/final.

**Files to modify**:
- `server/src/routes/relay.ts` — accept `subfolder` body param in preview/push/collect
- `client/src/components/shared/RelayTool.tsx` — add subfolder selector
- `client/src/hooks/useRelayApi.ts` — pass subfolder to mutations
- `server/src/test/relay.test.ts` — test subfolder routing

**Route changes** — preview/push/collect accept `{ subfolder: RelaySubfolder }` in request body:
```typescript
router.post('/preview', async (req, res) => {
  try {
    const config = getConfig();
    const paths = getRelayPaths(config);
    if ('error' in paths) return res.json({ success: false, error: paths.error });

    const subfolder: RelaySubfolder = req.body?.subfolder || 'recordings';
    if (!RELAY_SUBFOLDERS.includes(subfolder)) {
      return res.json({ success: false, error: `Invalid subfolder: ${subfolder}` });
    }

    const { projectDir, relayProjectDir } = paths;
    const sourceDir = path.join(projectDir, subfolder) + '/';
    const destDir = path.join(relayProjectDir, subfolder) + '/';

    const { stdout } = await execFileAsync('rsync', [
      '-av', '--dry-run', '--itemize-changes',
      ...rsyncExcludeArgs(),
      sourceDir, destDir
    ], { timeout: 60000 });

    const diff = parseRsyncDiff(stdout);
    res.json({ success: true, diff, subfolder });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});
```

Same pattern for push and collect. **Direction**: push goes project→relay, collect goes relay→project.

**UI subfolder selector** (in RelayTool.tsx):
```tsx
const [subfolder, setSubfolder] = useState<RelaySubfolder>('recordings');

<select value={subfolder} onChange={(e) => setSubfolder(e.target.value as RelaySubfolder)}>
  <option value="recordings">Recordings</option>
  <option value="edit-1st">Edit 1st (Gling)</option>
  <option value="edit-2nd">Edit 2nd (Final)</option>
</select>
```

**Hook changes** — mutations accept subfolder:
```typescript
export function useRelayPreview() {
  return useMutation({
    mutationFn: async (subfolder: RelaySubfolder = 'recordings') => {
      const res = await fetch(`${API_URL}/api/relay/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subfolder }),
      });
      return res.json();
    },
    // ...
  });
}
```

**Fix current collect route**: Currently hardcoded to relay/final/ → project/final/. Change to use the subfolder param like push (relay/{subfolder}/ → project/{subfolder}/).

**Test target**: ~10 new tests (each subfolder for preview/push/collect, invalid subfolder, missing body defaults to recordings)

---

### 4. promote-to-final (Wave 2)

**Purpose**: List versions in local edit-2nd/, promote selected file to final/.

**Files to modify**:
- `server/src/routes/relay.ts` — add GET `/versions` and POST `/promote`
- `client/src/components/shared/RelayTool.tsx` — add Promote section
- `client/src/hooks/useRelayApi.ts` — add `useRelayVersions()` and `useRelayPromote()`
- `shared/types.ts` — add version types
- `server/src/test/relay.test.ts` — test promote routes

**Types** (add to `shared/types.ts`):
```typescript
export interface EditVersion {
  filename: string;
  size: number;
  modified: string; // ISO date string
}
```

**GET /versions** — list files in local project edit-2nd/:
```typescript
router.get('/versions', async (req, res) => {
  try {
    const config = getConfig();
    const paths = getRelayPaths(config);
    if ('error' in paths) return res.json({ success: false, error: paths.error });

    const editDir = path.join(paths.projectDir, 'edit-2nd');
    try {
      const files = await fs.readdir(editDir);
      const versions: EditVersion[] = [];
      for (const f of files) {
        if (f.startsWith('.')) continue;
        const stat = await fs.stat(path.join(editDir, f));
        if (stat.isFile()) {
          versions.push({ filename: f, size: stat.size, modified: stat.mtime.toISOString() });
        }
      }
      res.json({ success: true, versions });
    } catch {
      res.json({ success: true, versions: [] }); // edit-2nd doesn't exist yet
    }
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});
```

**POST /promote** — copy selected file from edit-2nd/ to final/:
```typescript
router.post('/promote', async (req, res) => {
  try {
    const config = getConfig();
    const paths = getRelayPaths(config);
    if ('error' in paths) return res.json({ success: false, error: paths.error });

    const { filename } = req.body;
    if (!filename || typeof filename !== 'string') {
      return res.json({ success: false, error: 'filename is required' });
    }
    // Validate no path traversal
    if (filename.includes('/') || filename.includes('..')) {
      return res.json({ success: false, error: 'Invalid filename' });
    }

    const source = path.join(paths.projectDir, 'edit-2nd', filename);
    const destDir = path.join(paths.projectDir, 'final');
    await fs.ensureDir(destDir);
    await fs.copy(source, path.join(destDir, filename));
    res.json({ success: true, promoted: filename });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});
```

**UI Promote section** (add to RelayTool.tsx after Collect):
```tsx
<section>
  <SectionHeader title="Promote to Final" />
  {/* List edit-2nd versions with radio/click select */}
  {/* Show filename, size, date */}
  {/* "Promote" button copies selected to final/ */}
</section>
```

**Test target**: ~8 new tests (versions list, empty dir, promote success, promote missing filename, path traversal, file not found)

---

### 5. role-based-visibility (Wave 3)

**Purpose**: Show/hide relay buttons based on machineRole from config.

**Files to modify**:
- `client/src/components/shared/RelayTool.tsx` — gate buttons by role
- `client/src/components/shared/ToolsSidebar.tsx` — gate sidebar items by role
- `client/src/hooks/useRelayApi.ts` or `useSystemApi.ts` — ensure machineRole accessible

**Check existing useSystemApi.ts** for environment hook — machineRole is already in the `/api/system/environment` response.

**Role gating rules**:
- **Recorder** (David): push recordings, collect edit-1st, collect edit-2nd, promote to final, all browse
- **Editor** (Jan): collect recordings (ingest), push edit-1st, push edit-2nd, all browse
- Both roles can preview any subfolder

**Implementation pattern**:
```tsx
const { data: env } = useEnvironment(); // from useSystemApi
const role = env?.machineRole || 'recorder';
const isRecorder = role === 'recorder';
const isEditor = role === 'editor';

// In push section:
{isRecorder && <PushRecordingsButton />}
{isEditor && <PushEditsButton />}
```

**ToolsSidebar gating** — for now, all tools remain visible for both roles. Future waves may hide recorder-only tools (archive, cleanup) from editors. This wave only gates buttons within RelayTool.

**No server changes** — role filtering is client-only. Server routes remain accessible (defense in depth is wave 1's route guards).

**Test target**: 0 new server tests. Client component tests if the project has component testing set up (check first — if not, skip).

---

### 6. visual-indicators (Wave 3)

**Purpose**: At-a-glance pipeline status badges in the relay browser.

**Files to modify**:
- `client/src/components/shared/RelayBrowser.tsx` — add status badges per project

**Badge rules** (per project row in the browser):
- **recordings**: `"3 files"` with size, green dot if files present
- **edit-1st**: `"2 files"` or `"—"`, amber dot when files arrive
- **edit-2nd**: `"v1, v2"` (version labels from filenames) or `"—"`, blue dot when files arrive
- **promoted**: green checkmark if any file exists in local project final/ (requires a small addition to browse response or a separate check)

**Optional: extend browse response** — add a `localFinal` field to RelayProjectInfo:
```typescript
// Only for the currently active project
localFinal?: { fileCount: number; totalSize: number };
```

This tells the browser whether the active project has promoted files.

**Visual treatment** — use Tailwind badges:
```tsx
<span className="inline-flex items-center gap-1 text-xs">
  <span className="w-2 h-2 rounded-full bg-green-500" />
  3 files (45 MB)
</span>
```

**Test target**: 0 server tests (display only). Add browse response extension tests if localFinal is added (~2 tests).

---

## Success Criteria Checklist

Before marking any work unit complete:

- [ ] `npm run build -w shared` passes (if shared/ was changed)
- [ ] `npm run build -w server` passes — TypeScript clean
- [ ] `npm run build -w client` passes — TypeScript + Vite build clean
- [ ] `npm test` exits 0 — all 552+ tests pass
- [ ] New routes use `getRelayPaths()` helper (no duplicated guard logic)
- [ ] New routes use `rsyncExcludeArgs()` for exclusions (no inline excludes)
- [ ] New exported functions have at least one test
- [ ] New routes follow `createRelayRoutes(getConfig)` factory pattern (all in relay.ts)
- [ ] New shared types added to `shared/types.ts` (not duplicated in client or server)
- [ ] No new `any` types
- [ ] No shell injection — all user-supplied paths use `execFile` or `fs` operations with validation
- [ ] Path traversal validation on all user-supplied filenames (`filename.includes('..')` check)

---

## Anti-Patterns to Avoid

All wave 1 anti-patterns still apply, plus:

- **Do not duplicate `getRelayPaths()` logic** — always call the helper. If you need different validation, extend the helper.
- **Do not add inline rsync excludes** — always use `rsyncExcludeArgs()`. Add new patterns to `RSYNC_EXCLUDES` array only.
- **Do not read relay directory synchronously** — all fs operations in routes must be async.
- **Do not trust user-supplied filenames** — validate no `/`, no `..`, no empty string before using in `path.join()`.
- **Do not import from `fs/promises`** — all server I/O uses `fs-extra`. Mock target is `vi.mock('fs-extra')`.
- **Do not add hooks directly to `useApi.ts`** — create in `useRelayApi.ts`, re-export from `useApi.ts`.
- **Do not modify files in the DO NOT MODIFY list** above.
- **Do not start the dev server in agents** — build and test only.
- **Do not use `exec` or `bash -lc`** — use `execFileAsync` for all shell commands.
- **Do not bypass `getConfig()`** — always get config through the getter, never cache it.

---

## Mock Patterns

Inherit all wave 1 mock patterns from `relay.test.ts` (lines 1-70). Key additions for wave 2:

```typescript
// Mock fs.readdir for browse endpoint
const mockReaddir = vi.fn();
const mockStat = vi.fn();
// Already in the fs-extra mock — just configure return values:

// Browse: relay directory with 2 projects
mockReaddir.mockImplementation(async (dir: string, opts?: any) => {
  if (dir.endsWith('flihub-appydave')) {
    if (opts?.withFileTypes) {
      return [
        { name: 'b17-test', isDirectory: () => true },
        { name: 'c32-bmad', isDirectory: () => true },
        { name: '.stfolder', isDirectory: () => true }, // hidden — filtered out
      ];
    }
    return ['b17-test', 'c32-bmad', '.stfolder'];
  }
  if (dir.includes('recordings')) return ['01-1-intro.mov', '.DS_Store'];
  if (dir.includes('edit-1st')) return [];
  if (dir.includes('edit-2nd')) return ['b17-final-v1.mp4', 'b17-final-v2.mp4'];
  return [];
});

mockStat.mockImplementation(async (filepath: string) => ({
  isFile: () => !filepath.endsWith('/'),
  isDirectory: () => filepath.endsWith('/'),
  size: 1024000, // ~1MB
  mtime: new Date('2026-03-20'),
}));

// Mock fs.copy for promote
const mockCopy = vi.fn().mockResolvedValue(undefined);
// Add to fs-extra mock: copy: (...args) => mockCopy(...args)
```

---

## Quality Gates (non-negotiable)

1. `npm run build -w server` clean — no TypeScript errors
2. `npm run build -w client` clean — no TypeScript errors or Vite build failures
3. `npm test` passes — all 552+ tests pass
4. No new `any` types introduced
5. No shell injection — zero `bash -lc` with user-supplied paths
6. All relay routes use `getRelayPaths()` helper (no duplicated guard/path logic)
7. All rsync calls use `rsyncExcludeArgs()` (no inline exclude patterns)
8. Path traversal validation on promote filename
9. New routes have at least smoke test coverage

---

## Learnings (inherited from manage-relay-refactor wave 1)

- **Config field triple-addition**: New config fields need (a) `shared/types.ts`, (b) `configManager.ts` saveConfig allowlist, AND (c) `index.ts` updateConfig propagation. Missing (c) creates silent bug — changes saved to disk but not applied in memory.
- **rsync parser: use first-space extraction** — `line.indexOf(' ')` is robust across rsync versions.
- **`execFile` for user-supplied paths is mandatory** — `promisify(execFile)` works cleanly for async/await.
- **S3 Staging retired** — `s3Utils.ts` and `poem-wui.ts` kept (used by other code).
- **Test count after wave 1: 552** (38 shared + 126 client + 388 server).
- **Agent scope creep**: Always include explicit "DO NOT MODIFY" section listing files outside scope.
- **ESM `vi.spyOn` cannot intercept internal module calls** — verify through mocked external dependencies.
- **All server I/O uses `fs-extra`** — mock target is `vi.mock('fs-extra')`, not `vi.mock('fs/promises')`.
- **`useApi.ts` is a barrel re-export** — add domain hooks to their own `use*Api.ts` file, then re-export.
- **Collect route fix needed** — wave 1 collect hardcoded relay/final/ → project/final/. Wave 2 fixes to use subfolder param.
