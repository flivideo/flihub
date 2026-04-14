# AGENTS.md — Storage Panel Campaign

Operational knowledge for agents working on this campaign. Read alongside the work-unit prompt — this file is the only context you'll otherwise have.

## Project Overview

- **Project**: FliHub (`/Users/davidcruwys/dev/ad/flivideo/flihub`)
- **Stack**: TypeScript monorepo, npm workspaces. `client/` = React 19 + Vite + TailwindCSS v4 + React Query. `server/` = Express + Socket.io. `shared/` = types + utilities.
- **Campaign**: Storage panel — replace multi-project Archive list with per-active-project Storage panel that owns Hold + Archive verbs.
- **Worktree branch**: `storage-panel` (created by coordinator at build start).
- **Inherits patterns from**: `archive-tool` campaign (delivery-review patches, query invalidation discipline, warm linen tokens).

## Build & Run Commands

From repo root:
```bash
# Tests (from repo root, using workspaces)
npm test -w client          # vitest
npm test -w server          # vitest
npm test -w shared          # vitest

# Typecheck (per workspace)
npm run -w client typecheck
npm run -w server typecheck   # if defined; else `tsc -b --noEmit`

# Lint
npm run -w client lint        # if defined

# Build
npm run -w client build       # tsc -b && vite build
npm run -w server build       # tsc -b
```

Dev server: do NOT start. The user runs it manually. If you need to test against a running server, ask the coordinator.

## Directory Structure

| Concern | Path |
|---|---|
| Client components | `client/src/components/` |
| Shared client components | `client/src/components/shared/` |
| Client hooks | `client/src/hooks/` |
| Client query keys | `client/src/constants/queryKeys.ts` |
| Server routes | `server/src/routes/` |
| Server utils | `server/src/utils/` |
| Server tests | `server/src/test/` |
| Client tests | `client/src/test/` |
| Shared types | `shared/types.ts` |
| Campaign docs | `docs/planning/storage-panel/` |

## Architecture Docs Registry

| Doc | Path | Relevant for |
|---|---|---|
| Storage mental model | `docs/planning/archive-offload/MENTAL-MODEL.md` | Anyone touching storage state. Read before WU1. Documents Local / HOLDING / PUBLISHED / FAILS. |
| Prior campaign plan | `docs/planning/archive-tool/IMPLEMENTATION_PLAN.md` | What was built before. WU4 deletes parts of it. |
| Hold utils | `server/src/utils/holdUtils.ts` | Existing hold/restore logic to reuse — has `holdProject`, `restoreFromHolding`, `verifyHoldingMatch`, `holdExcludeArgs`. |
| Hold routes | `server/src/routes/hold.ts` | Existing endpoints; new endpoints sit beside them. |
| Relay pattern reference | `client/src/components/shared/RelayTool.tsx` | Per-active-project tool shape — Storage panel mirrors this. |

## Storage State Model (CRITICAL — read this)

A project is in exactly one of three storage states:

| State | Local presence | T7 HOLDING | T7 PUBLISHED |
|---|---|---|---|
| `active` | Full project (heavy + light) | empty | empty |
| `held` | Light files only (folder shell remains) | Heavy subfolders | empty |
| `archived` | Folder fully deleted | empty | Full project |

**HEAVY subfolders** (single source of truth, server-side constant):
```ts
export const HEAVY_SUBFOLDERS = ['recordings', 'recording-shadows', 'final'] as const;
// `recordings/-chapters/` is nested within recordings — moves with it.
```

**LIGHT** = anything not in HEAVY_SUBFOLDERS. Stays on local during Hold.

State derivation rule (server-side, single function):
- If `archivedFolderExists && !localFolderExists` → `archived`
- Else if `holdingFolderExists && heavySubfoldersAbsentFromLocal` → `held`
- Else → `active`

States are mutually exclusive. If both PUBLISHED and HOLDING contain copies, that's a corruption — return `degraded: true` with an explanation.

## Constraints

- Server code must NEVER assume client-supplied state is current. Re-derive from disk before any mutation.
- Client mutations MUST invalidate ALL of: `storage-tree`, `archive-inventory`, `hold-status`, `disk-size`, `relay-browse` query keys for the affected project. Use a shared invalidation helper.
- Never write to `youtube-FAILS/`. Never read from it for state purposes either.
- Never write `youtube-PUBLISHED/<brand>/<range>/<code>/` (no range-bucket logic). Always flat: `youtube-PUBLISHED/<brand>/<code>/`.
- Relay-blocked guard: any non-empty relay subfolder blocks Hold and Archive. Surface a clear error pointing to Relay tool.
- T7 must be mounted for any T7-touching operation. Surface clear error if not.
- All rsync invocations MUST include `holdExcludeArgs()` (excludes `-trash/`, `s3-staging/`, `.DS_Store`, `._*`).

## Baseline Metrics (record before Wave A)

Coordinator: capture at campaign start.

| Metric | Baseline | After Wave A | After Wave B |
|---|---|---|---|
| Client tests | TBD (~247) | | |
| Server tests | TBD (~1110) | | |
| Shared tests | TBD (~80) | | |
| Client typecheck | pass | | |
| Server typecheck | pass | | |
| Client build | pass | | |

A degraded baseline blocks the next wave.

## Success Criteria

Per work unit, agent must verify before marking complete:
1. Workspace typecheck passes for any workspace touched.
2. Workspace lint passes (if defined).
3. Workspace tests pass (no regressions vs baseline).
4. Any new behaviour has at least one test (component test, route test, or util test).
5. All Constraints satisfied (see above).
6. Each new endpoint or hook listed in IMPLEMENTATION_PLAN.md "Done when" section is verified.

## Done-When Definitions

### WU1 — Backend foundation
- `HEAVY_SUBFOLDERS` exported from `server/src/utils/storageTree.ts` (new file)
- `getStorageTree(projectCode)` returns the documented shape; tested against fixture with mixed subfolders.
- 5 endpoints exist with happy-path + relay-blocked + T7-not-mounted + invalid-state route tests:
  - `GET /api/projects/:code/storage-tree`
  - `POST /api/projects/:code/hold`
  - `POST /api/projects/:code/restore-held`
  - `POST /api/projects/:code/archive`
  - `POST /api/projects/:code/unarchive`
- `archive-tool` Patches Applied invariants honored: degraded rows surface `error`, server re-derives state, mutations return `{ ok, error, newState }`.

### WU2 — StoragePanel component
- `StoragePanel.tsx` < 500 lines (extract `StorageTree`, `StorageActions`, `StorageStateHeader`).
- Three states render correctly with action buttons matching IMPLEMENTATION_PLAN.md tables.
- All 4 mutations work end-to-end through the UI; manual smoke test optional.
- Confirm popovers anchored to row, not full-screen modals.
- Tests: state→buttons mapping, tree rendering with mixed classification, confirm-cancel paths.

### WU3 — Sidebar wiring + deep-links
- Click T7 pill → Storage panel for active project.
- Click Projects table T7 badge → Storage panel for that project.
- Sidebar `Storage` entry under STORAGE group.
- OQ4 resolved (replace `SSD Status` or sit alongside).

### WU4 — Remove old ArchiveTool
- `grep -r ArchiveTool client/src` returns nothing.
- Manage sidebar no longer shows `Archive`.
- All deep-link state for old archive removed from `App.tsx` and `ManagePanel.tsx`.
- Server endpoints (`archive-inventory`, batch-*) untouched (kept for future Projects-page chips).

### WU5 — Activity log + feed
- Each successful mutation appends one entry to the log.
- `GET /api/projects/:code/storage-activity?limit=10` returns recent entries.
- Feed renders in panel below tree, default expanded.
- Survives server restart.

## Reference Patterns

**Per-active-project tool** — copy shape from `RelayTool.tsx`:
- Top header: `<ToolName> — <projectCode>` + optional connection pill on the right
- Body: state-specific content
- Footer: project path + connection status

**Query invalidation helper** — write a small util:
```ts
// client/src/hooks/useInvalidateProjectStorage.ts
export function useInvalidateProjectStorage() {
  const qc = useQueryClient();
  return (projectCode: string) => {
    qc.invalidateQueries({ queryKey: QUERY_KEYS.storageTree(projectCode) });
    qc.invalidateQueries({ queryKey: QUERY_KEYS.archiveInventory });
    qc.invalidateQueries({ queryKey: QUERY_KEYS.holdStatus(projectCode) });
    qc.invalidateQueries({ queryKey: QUERY_KEYS.diskSize(projectCode) });
    qc.invalidateQueries({ queryKey: QUERY_KEYS.relayBrowse(projectCode) });
  };
}
```
Use in every storage mutation `onSuccess`. This was the WU1-of-archive bug (DVR-BH-001) — don't repeat it.

**Confirm popover** — anchor to button. Avoid `fixed inset-0` modal pattern (this was a Wave-B partial AC, DVR-AA-004). Use floating-ui or a simple inline absolute popover relative to the button.

**Tree node component** — recursive. Each node renders its row + a `<ul>` of children if expanded. Heavy nodes get a marker; light nodes a different marker. State (`expanded`) is local component state; no global tree state.

## Anti-Patterns to Avoid

1. **Don't add cross-project list views** — this campaign's whole point is removing that. If you find yourself rendering rows for projects other than the active one, stop.
2. **Don't invent new state names** — the three states are `active` / `held` / `archived`. Don't add `mid-transfer` / `partial` etc. Mutual exclusivity is the invariant.
3. **Don't write to youtube-PUBLISHED with bucket folders** — flat only. DAM owns buckets.
4. **Don't trust client-supplied state in server endpoints** — always re-derive from disk.
5. **Don't omit query invalidation** — repeat of DVR-BH-001 is a hard fail.

## Mock Patterns

Server route tests use `tmp` directories + fs fixtures. See `server/src/test/holdArchiveInventory.test.ts` for the pattern: build a fixture project with subfolders + sizes, point the endpoint at it, assert the response shape and disk effects.

Client component tests use `@testing-library/react`. See `client/src/test/ArchiveTool.test.tsx` for fixture render + assert pattern (still in repo as of campaign start; WU4 removes it).

## Quality Gates

Coordinator runs after each wave:
1. All workspaces: typecheck pass
2. All workspaces: lint pass (if defined)
3. All workspaces: tests pass with no regressions vs baseline
4. Manual: no `console.log` left in shipped code
5. Delivery review pause between Wave A and Wave B (mandatory)
6. Delivery review at campaign end (mandatory)

## Learnings

(Coordinator appends here as waves complete.)
