# AGENTS.md — relay-kanban-fixes

**Project**: FliHub — video recording workflow management tool
**Campaign**: relay-kanban-fixes (UX fixes from visual QA on editor machine)
**Stack**: TypeScript monorepo — Express + Socket.io (server), React 19 + Vite + TailwindCSS v4 (client), shared types
**Last updated**: 2026-03-24
**Inherits from**: `docs/planning/relay-kanban/AGENTS.md`

---

## Project Overview

FliHub manages video recording workflows between David (creator) and Jan (editor). Files sync through a relay folder (SyncThing). The relay-kanban campaign built a 4-lane Kanban UI with divergence detection. This fixes campaign addresses UX blockers found during visual QA on Jan's editor machine.

**Key context**: On the editor's machine, the local project may not have a `recordings/` folder — recordings arrive via relay. The current UI shows "Folder missing" with no way to collect, which is a dead end.

---

## Build & Run Commands

```bash
npm install                        # Install all workspace dependencies
npm run build -w server            # TypeScript compile server
npm run build -w client            # tsc -b && vite build
npm test -w server                 # server tests only (888 tests passing)
npm test                           # all tests
```

**Never start the dev server in an agent** — it's a long-running process. Build and test only.

---

## Directory Structure

```
flihub/
├── client/src/
│   ├── App.tsx                    # MODIFY (relay-header-indicator only) — add RelayIndicator import + mount
│   ├── constants/
│   │   └── queryKeys.ts           # READ ONLY (keys already exist)
│   ├── components/
│   │   ├── ProjectsPanel.tsx      # MODIFY (relay-badge-colors only) — fix badge color config
│   │   └── shared/
│   │       ├── RelayTool.tsx      # MODIFY (collect-without-folder only) — fix KanbanLane
│   │       ├── SyncIndicator.tsx  # READ ONLY — reference pattern for header indicator
│   │       ├── RelayIndicator.tsx # CREATE (relay-header-indicator only) — new header pill
│   │       └── index.ts           # MODIFY (relay-header-indicator only) — add export
│   ├── hooks/
│   │   ├── useRelayApi.ts         # MODIFY (collect-without-folder only) — add useEnsureAllFolders
│   │   └── useSocket.ts           # READ ONLY
│   └── config.ts                  # READ ONLY
├── server/src/
│   ├── routes/
│   │   └── relay.ts               # MODIFY (collect-without-folder only)
│   ├── test/
│   │   └── relay.test.ts          # MODIFY (collect-without-folder only)
│   └── (other files)             # DO NOT MODIFY
└── shared/
    └── types.ts                   # MODIFY (collect-without-folder only) — if needed for response type
```

---

## DO NOT MODIFY (Explicit Scope Boundaries)

Each work unit has a strict file scope. Do NOT touch files outside your scope:

**collect-without-folder** may modify: `server/src/routes/relay.ts`, `server/src/test/relay.test.ts`, `client/src/components/shared/RelayTool.tsx`, `client/src/hooks/useRelayApi.ts`
**relay-badge-colors** may modify: `client/src/components/ProjectsPanel.tsx` ONLY
**relay-header-indicator** may modify: `client/src/components/shared/RelayIndicator.tsx` (CREATE), `client/src/components/shared/index.ts`, `client/src/App.tsx`

ALL agents: do NOT modify `server/src/index.ts`, `client/src/hooks/useSocket.ts`, `shared/naming.ts`, `shared/paths.ts`, `shared/constants.ts`, any route files except `relay.ts`.

---

## Work Unit Details

### 1. collect-without-folder (F006 + F007 + F010 + F012)

**Problem**: On the editor's machine, the Recordings lane shows "Folder missing" with a "Create Folders" button. But:
- The "Create Folders" button calls `ensure-edit-folders` which creates edit-1st/edit-2nd, NOT recordings
- There's no collect button because `folderExists` is false (line 361 of RelayTool.tsx)
- The lane shows no info about what's in relay when the local folder is missing
- Action buttons remain enabled even when synced with 0 files to send

**Server fixes** (`server/src/routes/relay.ts`):

1. **Rename/expand `POST /ensure-edit-folders` to `POST /ensure-folders`** — create ALL missing subfolders (recordings, edit-1st, edit-2nd) instead of just edit folders. Keep the old `/ensure-edit-folders` route as an alias pointing to the same handler for backward compat.

2. **`POST /collect` should create the local subfolder if it doesn't exist** — before the rsync call, ensure the target directory exists with `await fs.mkdir(targetDir, { recursive: true })`. This way collecting recordings when the folder is missing just works.

**Current collect endpoint** (lines ~382-444 of relay.ts):
```typescript
router.post('/collect', async (req, res) => {
  // ... validates subfolder, gets relay paths
  const relaySubDir = path.join(paths.relayProjectDir, subfolder);
  const projectSubDir = path.join(paths.projectDir, subfolder);
  // ... runs rsync from relaySubDir to projectSubDir
```

Add before the rsync call:
```typescript
// Ensure local subfolder exists (editor may not have it yet)
await fs.mkdir(projectSubDir, { recursive: true });
```

**Current ensure-edit-folders endpoint** (lines ~447-479 of relay.ts):
Expand to handle all three subfolders. The `foldersCreated` response should list what was created.

**Client fixes** (`client/src/components/shared/RelayTool.tsx`):

3. **KanbanLane: show relay counts even when local folder missing**. Currently when `folderExists` is false, the lane shows only "Folder missing / No folder". Instead, read the relay side from divergence data and show: "⚠ Folder missing — 20 files in relay". The relay file count and size should be visible.

4. **KanbanLane: show collect/action button even when folder missing**. Remove the `folderExists` gate on the action button (line 361). When folder is missing AND there are relay files, show the action button (collect will create the folder). Keep the "Create Folders" button as fallback only when there are NO relay files AND folder is missing.

5. **Disable action buttons when nothing to send** (F012). When direction is 'synced' or file count is 0 for a push action, disable the button. Current code at line 364: `disabled={isPending || (direction === 'synced' && !isPush)}`. Fix to also disable when `isPush && localCount === 0`.

**Hook fix** (`client/src/hooks/useRelayApi.ts`):

6. **Update `useEnsureEditFolders`** — rename to `useEnsureFolders` and point to `POST /ensure-folders`. Keep the old function name as a re-export alias for backward compat if needed.

**Tests** (`server/src/test/relay.test.ts`):

- Collect when local subfolder doesn't exist → creates it, rsync succeeds
- Ensure-folders creates recordings + edit-1st + edit-2nd when all missing
- Ensure-folders skips folders that already exist
- Collect when local subfolder already exists → no error, rsync succeeds (existing behavior)

**Test count target**: +4-6 new tests

---

### 2. relay-badge-colors (F009)

**Problem**: On the Projects page, `relay-only` status shows as red/! which looks like an error. For an editor, relay-only recordings is the normal starting state.

**File to modify**: `client/src/components/ProjectsPanel.tsx`

**Current badge config** (around line 269):
```typescript
const SYNC_BADGE_CONFIG: Record<RelaySyncStatus, { bg: string; text: string; icon: (count: number) => string } | null> = {
  synced: { bg: 'bg-green-100', text: 'text-green-700', icon: () => '✓' },
  ahead: { bg: 'bg-blue-100', text: 'text-blue-700', icon: (n) => `↑${n}` },
  behind: { bg: 'bg-amber-100', text: 'text-amber-700', icon: (n) => `↓${n}` },
  diverged: { bg: 'bg-amber-100', text: 'text-amber-700', icon: () => '↕' },
  'local-only': { bg: 'bg-green-100', text: 'text-green-700', icon: () => '✓' },
  'relay-only': { bg: 'bg-red-100', text: 'text-red-600', icon: () => '!' },
};
```

**Fix**: Change `relay-only` to use amber (incoming indicator) instead of red (error):
```typescript
'relay-only': { bg: 'bg-amber-100', text: 'text-amber-700', icon: (n) => `↓${n}` },
```

This communicates "files available to collect" (amber = action needed, not error).

**Also update the tooltip text** (around line 298) for `relay-only`:
```typescript
case 'relay-only': statusText = `${relayCount} to collect`; break;
```

**No server changes. No new tests. Client must build clean.**

---

### 3. relay-header-indicator (F008)

**Problem**: No header-level indicator for relay status. Jan has no way to know recordings arrived unless he navigates to the Relay tool.

**Create**: `client/src/components/shared/RelayIndicator.tsx`

Follow the **exact pattern** of `SyncIndicator.tsx` (155 lines). It uses:
- `useSyncStatus()` hook for data
- Pill subcomponent with dot + icon + label + badge + summary
- State-to-style map
- Tooltip on hover
- Click navigates to the tool

**Your version should**:
- Use `useRelayDivergence()` hook for data
- Show a single pill: "📡 Relay" with aggregate status
- Aggregate logic:
  - If any subfolder has `direction === 'incoming'` → amber dot, badge = total incoming count, summary = "incoming"
  - If any subfolder has `direction === 'outgoing'` → blue dot, badge = total outgoing count, summary = "to push"
  - If any subfolder has `direction === 'both'` → red dot, summary = "sync needed"
  - If all synced → green dot, no badge, no summary (same as SyncIndicator clean state)
  - If divergence data not loaded → grey dot (unknown state)
- Click navigates to Relay tool (same pattern as SyncIndicator's `onNavigateToSync`)
- Tooltip: multi-line, one per subfolder:
  ```
  Relay Sync
  Recordings: 20 incoming
  1st Edit: synced
  2nd Edit: — (no files)
  ```

**Mount in App.tsx** — add next to SyncIndicator (around line 493-497):
```tsx
{/* B044: Persistent sync indicators */}
<div className="flex items-center gap-3 flex-shrink-0">
  <SyncIndicator onNavigateToSync={() => { changeTab('export'); setManageTool('sync'); }} />
  <RelayIndicator onNavigateToRelay={() => { changeTab('export'); setManageTool('relay'); }} />
</div>
```

**Export from barrel** — add to `client/src/components/shared/index.ts`:
```typescript
export { RelayIndicator } from './RelayIndicator';
```

**Import in App.tsx** — update the existing import:
```typescript
import { OpenFolderButton, SyncIndicator, RelayIndicator } from './components/shared';
```

**Only show the pill when relay is enabled** — check if divergence data returns successfully (non-error). If relay isn't configured, don't render anything (same as SyncIndicator hiding when data is absent).

**Warm linen theme tokens**: Use `bg-surface-hover`, `text-warm-muted`, `text-warm-primary` etc. Match SyncIndicator's styling exactly.

**No server changes. No new tests. Client must build clean.**

---

## Success Criteria Checklist

Before marking any work unit complete:

- [ ] `npm run build -w server` passes — TypeScript clean
- [ ] `npm run build -w client` passes — TypeScript + Vite build clean
- [ ] `npm test -w server` exits 0 — all 888+ tests pass
- [ ] No new `any` types
- [ ] No shell injection
- [ ] Path traversal validation on user-supplied paths
- [ ] Warm linen theme tokens used (no bright whites, no `bg-white`)
- [ ] Files modified are ONLY within the work unit's scope (see Directory Structure)

---

## Anti-Patterns to Avoid

- **Do not import from `fs/promises`** — all server I/O uses `fs-extra`. Mock target is `vi.mock('fs-extra')`
- **Do not start the dev server** — build and test only
- **Do not use inline query key strings** — use `QUERY_KEYS.*` from `queryKeys.ts`
- **Do not add bright white backgrounds** — use warm linen tokens
- **Do not modify files outside your work unit scope**
- **Do not bypass `getConfig()`** — always get config through the getter
- **Do not use `exec` or `bash -lc`** — use `execFileAsync` for shell commands
- **Do not persist activity to disk** — ring buffer is in-memory
- **Do not break backward compatibility** — keep old endpoint names as aliases

---

## Mock Patterns (for collect-without-folder tests)

```typescript
// Mock fs.mkdir for folder creation
const mockMkdir = vi.fn().mockResolvedValue(undefined);

// Mock pathExists to control which folders exist
mockPathExists.mockImplementation(async (p: string) => {
  if (p.includes('recordings')) return false;  // local recordings doesn't exist
  if (p.includes('edit-1st')) return false;
  if (p.includes('edit-2nd')) return true;     // already exists
  return true;
});

// Mock readdir for relay side (has files)
mockReaddir.mockImplementation(async (dir: string) => {
  if (dir.includes('relay') && dir.includes('recordings')) {
    return ['01-1-intro.mov', '02-1-setup.mov'];
  }
  return [];
});
```

---

## Quality Gates

1. `npm run build -w server` clean
2. `npm run build -w client` clean
3. `npm test -w server` passes — 888+ tests
4. No new `any` types
5. Each work unit modifies ONLY its scoped files
6. Warm linen tokens used throughout
7. Action buttons disabled when nothing to send/collect
8. Relay counts visible even when local folder missing
9. Header indicator follows SyncIndicator pattern exactly

---

## Learnings (inherited from relay-kanban)

- **`fs.mkdir` with `{ recursive: true }` is idempotent** — safe to call even if folder exists
- **Warm linen theme tokens**: `bg-surface`, `bg-surface-muted`, `border-warm`, `text-warm-primary`, `text-warm-secondary`, `text-warm-muted`
- **Kanban preferred over timeline** — David thinks left-to-right
- **Browse endpoint backward compatibility matters** — use `?detailed=true` param
- **SyncIndicator is the gold standard** for header indicators — follow its pattern exactly
- **`ensure-edit-folders` only creates edit folders** — the endpoint name was too specific, expand to `ensure-folders`
- **Editor machines often lack `recordings/` folder** — recordings arrive via relay, not Ecamm Live
- **Red = error in David's mental model** — use red only for actual problems (conflicts, missing config), amber for "action needed"
