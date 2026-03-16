# AGENTS.md — FliHub Baseline

**Project**: FliHub — video recording workflow management tool
**Last updated**: 2026-03-16 (Project Heal — initial baseline from ~45 shipped features)
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

# Run tests (WARNING: shared workspace tests not wired — see Known Issues)
npm test -w client
npm test -w server
npm test -w shared         # must be run separately — no test script in shared/package.json yet

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
│   └── utils/                     # Pure utility functions (formatting, naming)
├── server/src/
│   ├── index.ts                   # Express app, Socket.io, config management
│   ├── routes/                    # Express routers (one file per domain)
│   └── utils/                     # Server-side utilities (pure functions + I/O)
│       ├── projectState.ts        # Read/write .flihub-state.json
│       ├── renameRecording.ts     # Safe file rename + state migration
│       ├── pathUtils.ts           # expandPath, queryString
│       ├── chapterExtraction.ts   # YouTube chapter timestamp logic
│       └── scanning.ts            # Project file scanning + transcript sync status
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

1. **Test suite is silently broken.** `npm test` reports 3 passing tests (all placeholders). `shared/naming.test.ts` has 7 failing tests and is never executed — `shared/package.json` has no test script. See NFR-146 before writing any new tests.

2. **`npm run build -w shared` is easy to forget.** The client and server import from shared via path aliases. If shared types change and you don't rebuild, the app uses stale types silently.

3. **Rename pipeline has zero test coverage.** `renameRecording.ts` — `checkTranscriptionQueue`, `migrateRecordingKey`, `updateManifestFilename` — are the most-used functions in the app and completely untested. Be conservative when modifying this file.

4. **`server/config.json` is gitignored.** Config changes made during development do not commit. If a Ralphy wave modifies config.json, it will not appear in the diff.

5. **NFR-141 is permanently cancelled.** Planning docs from Jan 2026 treat it as critical. It was cancelled after discovering scanner bugs. The tag parser in `shared/naming.ts` is correct as-is.

6. **FR-131 Phase 2 may be superseded.** The ManagePanel bulk rename Phase 2 work may have been made obsolete by FR-136/141 toolchain. Confirm before implementing.

7. **The shared workspace has no test script.** Add `"test": "vitest run"` to `shared/package.json` and update root `npm test` to include `-w shared` as part of NFR-146 work.

---

## Learnings (updated per campaign)

*No campaigns completed yet under Ralphy. This section will accumulate per-wave learnings.*

---

## Quality Gates (non-negotiable)

1. `npm run build -w server` clean — no TypeScript errors
2. `npm run build -w client` clean — no TypeScript errors or Vite build failures
3. `npm test` passes (once NFR-146 is complete, this will mean real tests pass)
4. No new `any` types introduced in `shared/types.ts`
5. New exported utility functions in `server/src/utils/` have at least a smoke test
