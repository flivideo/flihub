# AGENTS.md — FliHub Baseline

**Project**: FliHub — video recording workflow management tool
**Last updated**: 2026-03-19 (Updated after nfr-146-test-coverage, nfr-code-quality-1, nfr-architecture-refactor campaigns)
**Purpose**: Operational knowledge for Ralphy agents. Self-contained — an agent receives this file + a work unit prompt and nothing else.

---

## Project Overview

FliHub is a TypeScript monorepo that watches Ecamm Live recordings, provides a web UI for naming/organising video files, and manages project assets for a solo YouTube creator workflow. It runs locally on macOS (Apple Silicon). There is no cloud deployment, no multi-user support, no authentication.

**Primary workflow**: Record → Watch incoming files in FliHub → Name them with chapter/sequence/tags → Transcribe → Export to editor via S3 → Receive final edit → Send to POEM WUI (AWB) for YouTube optimisation.

---

## Build & Run Commands

```bash
# Install all workspace dependencies
npm install

# Start both server (5101) and client (Vite dev)
npm run dev

# Build everything
npm run build

# Build individual workspaces
npm run build -w shared    # ALWAYS run after changing shared/
npm run build -w server
npm run build -w client    # tsc -b && vite build

# Run tests (all three workspaces — NFR-146 complete, all real tests)
npm test                   # runs shared → server → client
npm test -w shared
npm test -w server
npm test -w client

# Check if server is running
lsof -i :5101 | grep LISTEN

# Start persistent server (survives terminal close)
./start.sh
overmind start
```

**Ports**: Server `5101`, Client Vite dev (varies), POEM WUI / AWB `5041`

---

## Directory Structure

```
flihub/
├── client/src/
│   ├── App.tsx                    # Main app — tab navigation, state
│   ├── components/                # UI components (PascalCase.tsx)
│   │   └── shared/                # Reusable tool panels (SlideOutDrawer, S3StagingTool, etc.)
│   ├── hooks/                     # React Query hooks (use*Api.ts pattern)
│   │   └── useApi.ts              # BARREL RE-EXPORT ONLY — add new hooks to domain files, not here
│   └── utils/                     # Pure utility functions (formatting, naming)
│       └── namingControlsUtils.ts # sanitizeCustomTag, shouldShowTemplate (extracted from NamingControls.tsx)
├── server/src/
│   ├── index.ts                   # Express app, Socket.io, config push (updateConfig lives here — closes over io)
│   ├── config/
│   │   └── configManager.ts       # loadConfig, saveConfig, config migrations — canonical config persistence
│   ├── routes/                    # Express routers (one file per domain)
│   └── utils/                     # Server-side utilities (pure functions + I/O)
│       ├── projectState.ts        # Read/write .flihub-state.json (uses fs-extra, not fs/promises)
│       ├── renameRecording.ts     # Safe file rename + state migration
│       ├── pathUtils.ts           # expandPath, queryString
│       ├── chapterExtraction.ts   # YouTube chapter timestamp logic
│       ├── scanning.ts            # Project file scanning + transcript sync status
│       ├── s3Utils.ts             # extractBrand, categorizeMigrationFiles, isPathWithinProject, MigrationActions
│       ├── poemWuiUtils.ts        # mapBrandConfig, loadBrandConfig, firstWords, readChapterTranscript, findAllSrts, buildFliHubChapters
│       └── srtUtils.ts            # SRT processing — do NOT add SRT logic to route files
├── shared/
│   ├── types.ts                   # ALL shared TypeScript interfaces
│   ├── naming.ts                  # Filename parsing, building, validation
│   ├── paths.ts                   # Project path derivation (getProjectPaths)
│   └── constants.ts               # Shared constants
└── docs/
    ├── backlog.md                 # FR/NFR status (legacy — superseded by BACKLOG.md)
    ├── prd/                       # Individual requirement specs
    ├── changelog.md               # Implementation history
    └── planning/
        ├── BACKLOG.md             # Canonical backlog (B### IDs)
        └── AGENTS.md              # This file
```

---

## The Data Model — Read This First

**There is no database.** All state is file-based:

| Data | Location | Format |
|------|----------|--------|
| Recording metadata | Filename itself | `{chapter}-{sequence}-{name}-{TAGS}.mov` |
| Safe/parked/annotation flags | `.flihub-state.json` in project root | JSON via `ProjectState` type |
| Config (active project, tags, paths) | `server/config.json` | JSON via `Config` type |
| Gling dictionary | `.flihub-state.json` | Part of `ProjectState` |
| Transcripts | `recording-transcripts/` | `.txt` (raw) + `.srt` (subtitles) |
| Shadows | `recording-shadows/` | Low-res .mp4 derivatives |
| Chapter videos | `recordings/-chapters/` | Derivative .mp4 files |

**Recording filename is the schema.** Example: `10-5-intro-CTA.mov`
- Chapter: `10` (2 digits)
- Sequence: `5` (1+ digits)
- Name: `intro` (kebab-case)
- Tags: `CTA` (uppercase, dash-separated)
- Extension: `.mov` or `.mp4`

All grouping, sequence tracking, and tag parsing flows through `shared/naming.ts`. Never bypass this parser.

---

## Key Conventions

### 1. Route → Hook → Component layering
New functionality always follows this order:
1. Add route to `server/src/routes/` (returns typed JSON)
2. Add or update hook in `client/src/hooks/use*Api.ts` (React Query)
3. Wire up component

### 2. Shared types first
New data structures go into `shared/types.ts` before any route or component. The type is the contract. After changing `shared/`, always run `npm run build -w shared`.

### 3. SlideOutDrawer is the canonical tool pattern
Since FR-137, all tool panels in ManagePanel open in a `SlideOutDrawer`. If adding a new ManagePanel tool, follow this pattern. Legacy components (`RegenToolbar.tsx`) predate this pattern — do not extend them.

### 4. FR annotations in code
Every piece of code introduced by a requirement gets a comment: `// FR-144: POEM WUI workflow intake`. This is the only traceability system (no JIRA). Always annotate new code with its FR/NFR number.

### 5. Config is config.json
User preferences and environment-specific paths live in `server/config.json`, typed via the `Config` interface in `shared/types.ts`. New configurable values must be added to both. The file is gitignored — changes are local-only.

### 6. Socket.io for long-running operations
Operations that take more than ~1 second (transcription, shadow generation) emit progress events via Socket.io rather than polling. Event types are defined in `ServerToClientEvents` in `shared/types.ts`.

### 7. Safe/parked are state flags, not folder locations
Post-FR-111, recordings stay in `recordings/` regardless of safe/parked status. State is in `.flihub-state.json`. Pre-FR-111 code that moves files to `-safe/` subfolders is legacy — do not extend it.

---

## Success Criteria Checklist

Before marking any work unit complete:

- [ ] `npm run build -w server` passes (TypeScript clean)
- [ ] `npm run build -w client` passes (TypeScript + Vite build clean)
- [ ] No `console.error` from the browser during manual test of the changed feature
- [ ] New server functions are exported if they need to be unit-tested
- [ ] New shared types added to `shared/types.ts` (not duplicated in client or server)
- [ ] FR annotation comment added to new code (`// FR-XXX: description`)
- [ ] If the PRD has a Testing Checklist — verify each item manually
- [ ] `npm test` exits 0 — all 331+ tests pass (zero failures)

---

## Reference Patterns

### Adding a new server route

```typescript
// server/src/routes/my-feature.ts
import express from 'express';
import type { Config } from '../../../shared/types.js';
import { expandPath } from '../utils/pathUtils.js';

export function createMyFeatureRoutes(getConfig: () => Config) {
  const router = express.Router();

  router.get('/status', async (req, res) => {
    try {
      const config = getConfig();
      if (!config.projectDirectory) {
        return res.json({ success: false, error: 'No project selected' });
      }
      const projectDir = expandPath(config.projectDirectory);
      // ... logic
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  return router;
}
```

### Adding a React Query hook

```typescript
// client/src/hooks/useMyFeatureApi.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { API_URL } from '../config';

export function useMyFeatureStatus() {
  return useQuery({
    queryKey: ['my-feature-status'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/my-feature/status`);
      return res.json();
    },
  });
}

export function useMyFeatureAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_URL}/api/my-feature/action`, { method: 'POST' });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Done');
        queryClient.invalidateQueries({ queryKey: ['my-feature-status'] });
      } else {
        toast.error(data.error || 'Failed');
      }
    },
  });
}
```

### Sending to POEM WUI / AWB

The authoritative send route is `POST /api/poem-wui/send` in `server/src/routes/poem-wui.ts`. It reads SRT transcript, builds `fliHubChapters`, loads brand config, and posts to `config.poemWuiUrl` (default: `http://localhost:5041`). Do not create duplicate send routes in other route files.

---

## Anti-Patterns to Avoid

- **Do not bypass `shared/naming.ts` to parse filenames** — regex in application code will drift from the parser
- **Do not add `{ success: boolean }` typed responses that mix with `{ ok: boolean }` responses** — `poem-wui` routes use `{ ok }`, everything else uses `{ success }`. Stay consistent within a file.
- **Do not hardcode port 3001** — that was the wrong AWB port. AWB server is `5041`.
- **Do not move files to `-safe/` subfolders** — post-FR-111 architecture uses `.flihub-state.json` flags. Safe = a state flag, not a directory.
- **Do not build a new tool into ManagePanel without using SlideOutDrawer** — the old RegenToolbar/ToolsSidebar approach is legacy.
- **Do not create a new `IMPLEMENTATION_PLAN.md` at the repo root** — campaign artifacts belong in `docs/planning/[campaign-name]/`.
- **Do not update the main repo KDD during a Ralphy loop** — local KDD in `docs/planning/[campaign]/learnings/` is the scratchpad; human promotes selectively.
- **Do not add new hooks directly to `useApi.ts`** — it is now a barrel re-export. Add domain hooks to their own `use*Api.ts` file, then re-export from `useApi.ts`.
- **Do not add SRT processing logic to route files** — `server/src/utils/srtUtils.ts` is the canonical location.
- **Do not mock `fs/promises` when testing server utils** — all server I/O uses `fs-extra`. Mock target is `vi.mock('fs-extra')`, not `vi.mock('fs/promises')`.

---

## Mock Patterns

**All server I/O uses `fs-extra`** (standardised in nfr-architecture-refactor). The single mock target is `vi.mock('fs-extra')`.

```typescript
// Standard server util mock — use this for projectState, configManager, and route files
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

**Exception**: `poem-wui.ts` route integration tests still need `vi.mock('fs/promises')` in addition to `vi.mock('fs-extra')` because `readDirSafe` goes through an indirect `fs-extra` wrapper. When in doubt — check the import in the file you're testing.

```typescript
// configManager.ts tests — mock fs-extra directly
vi.mock('fs-extra', () => ({ default: { pathExists: vi.fn(), readFile: vi.fn(), writeFile: vi.fn() } }));
```

**External shell commands** (`dam`, `mlx-whisper`): mock via `vi.mock('../utils/execAsync.js')` or equivalent. Never let real shell commands run in tests.

---

## External Dependencies

| Dependency | Type | Notes |
|-----------|------|-------|
| `mlx-whisper` | Shell command | Apple Silicon transcription. Must be on PATH. Not a Node module. |
| `dam` CLI | Shell command | S3 operations (`dam s3-status`, `dam s3-upload` etc.). Must be installed. Tests must mock `execAsync`. |
| POEM WUI / AWB | HTTP server | Local at `http://localhost:5041`. One pending payload at a time — second POST overwrites. |
| Ecamm Live | File system | Writes recordings to `config.watchDirectory`. FliHub watches via chokidar. |

---

## Known Issues / Gotchas

### Active Structural Problems (from 3-lens audit 2026-03-19 — fix before major feature)

1. **`PROJECTS_ROOT` is hardcoded in 7+ server files.** The constant `~/dev/video-projects/v-appydave` bypasses `config.projectsRootDirectory` entirely. Any new feature touching multi-project logic will silently fail on any machine except the original author's. See B024. Files: `routes/projects.ts`, `routes/transcriptions.ts`, `routes/state.ts`, `routes/query/projects.ts`, `routes/query/transcripts.ts`, `routes/video.ts`, `utils/projectResolver.ts`, `routes/index.ts`.

2. **`writeProjectState` is non-atomic.** `fs.writeFile` truncates then writes. A crash mid-write produces a corrupt or zero-byte state file, silently losing all safe/parked/annotation flags. Fix: write to `.tmp` then `fs.rename`. See B025.

3. **Config access is inconsistent across route factories.** Three route factories (`assets`, `thumbs`, `system`) receive the live `currentConfig` object by direct reference rather than the `() => getConfig()` getter used everywhere else. Two routes (`projects`, `chapters`) bypass `updateConfig` via `Object.assign`, skipping watcher restarts and persistence ordering. See B026.

4. **`renameRecording()` orchestration is untested.** The 3-phase rename pipeline (delete derivable → rename core → regenerate) has zero integration test coverage. Phase-ordering regressions and removal of the transcription-block guard would pass the suite silently. See B028.

5. **`swap-chapters` uses chapter `99` as a collision-unsafe temp workspace.** If the project has real recordings in chapter 99, the swap silently clobbers them. See B027.

### Pre-existing Gotchas

6. **`npm run build -w shared` is easy to forget.** The client and server import from shared via path aliases. If shared types change and you don't rebuild, the app uses stale types silently.

7. **`server/config.json` is gitignored.** Config changes made during development do not commit. If a Ralphy wave modifies config.json, it will not appear in the diff.

8. **NFR-141 is permanently cancelled.** Planning docs from Jan 2026 treat it as critical. It was cancelled after discovering scanner bugs. The tag parser in `shared/naming.ts` is correct as-is.

9. **FR-131 Phase 2 may be superseded.** The ManagePanel bulk rename Phase 2 work may have been made obsolete by FR-136/141 toolchain. Confirm before implementing.

10. **`updateConfig` in index.ts is intentionally un-extracted.** It closes over `currentConfig` and `io` (Socket.io) for real-time config push to clients. Do not extract it — the coupling is intentional.

11. **Two config migration paths exist in configManager.ts.** NFR-6 (`targetDirectory → projectDirectory`) and FR-89 (`projectDirectory` split into root + active). Do not remove either without verifying no users have pre-migration config files.

12. **`formatTimestamp`/`formatTime` are locale-sensitive in tests.** Use `/\d{1,2}:\d{2}/` regex patterns rather than exact strings — output depends on `en-US` locale and will break in CI with different locales.

---

## Learnings (updated per campaign)

### nfr-146-test-coverage (2026-03-16) — Test Coverage Foundation

- `projectState.ts` uses **`fs-extra`**, not `fs/promises` — mock with `{ pathExists, readFile, writeFile }`
- Prune fires when **all 4 flags** (safe, parked, stage, annotation) are falsy — not just one
- `parseSrtTimestamp` returns **seconds (float)**, not ms — `'00:02:34,500'` → `154.5`
- `extractVersion` returns **`number | undefined`** — not string, not null
- `isAdditionalSegment` takes **2 params** — `(filename, projectCode)`
- `formatChapterTitle('HELLO-WORLD')` → `''` — all-uppercase treated as tags, nothing left
- AWB body `{}` (no `ok` field) is treated as **success** — strict `=== false` check
- `categorizeMigrationFiles` **silently ignores** non-mp4/srt/mov files
- Server test import paths from `server/src/test/`: routes are `../routes/X.js`, utils are `../utils/X.js`

### nfr-code-quality-1 (2026-03-16) — Code Quality Round 1

- `isPathWithinProject` is now an exported, tested helper in `s3Utils.ts` — use it for all path validation
- `srtUtils.ts` is the canonical location for SRT processing — do not add SRT logic to route files
- `loadBrandConfig` returns `{ data, found, path?, error? }` — `error` present when file exists but is corrupt
- `parseSrtTimestamp` returns `number | null` — callers must handle null (skip the segment)
- Coverage thresholds (floors, not targets): server lines 16%, functions 20%, branches 18%

### nfr-architecture-refactor (2026-03-16) — Architecture Refactor

- `server/src/config/configManager.ts` owns `loadConfig`, `saveConfig`, config migrations — future config shape changes go here
- `server/src/utils/s3Utils.ts` owns `extractBrand`, `categorizeMigrationFiles`, `isPathWithinProject`, `MigrationActions`
- `server/src/utils/poemWuiUtils.ts` owns `mapBrandConfig`, `loadBrandConfig`, `firstWords`, `readChapterTranscript`, `findAllSrts`, `buildFliHubChapters`
- All server I/O uses `fs-extra` — `vi.mock('fs-extra')` is the single mock target for all server util tests
- `useApi.ts` is now a **barrel re-export** — add new hooks to domain files, re-export from useApi.ts
- `readAwbJson` intentionally stays in `poem-wui.ts` — it is infrastructure, not pure domain
- `useOpenFolder` was a dead duplicate — all components import from `hooks/useOpenFolder.ts` directly
- Total tests after 3 campaigns: **331** (38 shared, 196 server, 97 client) — verified 2026-03-19
- `server/src/test/sample.test.ts` is still a placeholder (1+1=2) — a future wave should replace it with a real test

---

## Quality Gates (non-negotiable)

1. `npm run build -w server` clean — no TypeScript errors
2. `npm run build -w client` clean — no TypeScript errors or Vite build failures
3. `npm test` passes (once NFR-146 is complete, this will mean real tests pass)
4. No new `any` types introduced in `shared/types.ts`
5. New exported utility functions in `server/src/utils/` have at least a smoke test
