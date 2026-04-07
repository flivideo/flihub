# Assessment — disk-observability (B063)

**Completed**: 2026-04-07
**Total work units**: 11/11
**Tests**: 928 server + 80 shared passing | 4 pre-existing client failures (unchanged from main)

---

## What Shipped

**Wave 1 — Server foundation + client display**
- `shared/types.ts`: DiskSizeData, DiskThresholds, DiskThresholdLevel, Config extension
- `server/utils/diskUtils.ts`: getDirSize (pure Node, 0 on missing), calculateProjectDiskSize (with detail), getThresholdLevel, parseSizeString
- `server/routes/projects.ts`: scan-all + per-project endpoints + in-memory Map cache
- `server/config/configManager.ts`: DEFAULT_DISK_THRESHOLDS wired in
- `client/hooks/useProjectDiskApi.ts`: useDiskScanAll, useProjectDisk, useDeleteTrash
- `client/utils/formatBytes.ts`: formatBytes, parseSizeString, getThresholdLevelClient
- `client/components/ProjectListToolbar`: Disk toggle in preset row (amber when active, separator)
- `client/components/ProjectsPanel`: 8 disk columns with colour coding + vertical separator on REC
- `client/components/ProjectDrawer`: disk section with subfolder detail, top files, folder-open buttons

**Wave 2 — Safe delete + detail**
- `server/utils/safeDelete.ts`: generic 6-step validated delete (rootDir non-empty → exists → targetPath non-empty → exists → within root → correct suffix)
- `server/test/safeDelete.test.ts`: 20 tests covering all rejection cases + happy path
- `DELETE /api/projects/:code/trash` route using safeDelete
- Confirmation modal: real path, Open Finder, file list, total, explicit delete button
- OTHER subfolder breakdown + recTopFiles in drawer

---

## What Worked Well

- **Pure Node getDirSize** — right call to avoid shell path injection; the `parentPath ?? path ?? dirPath` Dirent fallback for Node 20 compatibility was a good catch by the agent
- **safeDelete as a generic utility** — not tied to `-trash`; already ready for relay subfolders, final/, etc.
- **Pre-computing detail during scan** — correct for a toggle-gated feature; no lazy loading complexity
- **Wave structure** — types → utils → routes → client hook → UI worked cleanly; dependencies respected
- **Parallel Wave 2b** — trash-route and drawer-enhancements ran in parallel on the same file (ProjectDrawer.tsx); linter changes from drawer agent were picked up correctly by trash-route agent

## What Didn't Work / Watch Out For

- **B### ID collision** — B062 was already taken (FR-148). Added B063 in the done table. Check last used ID more carefully before assigning.
- **formatBytes duplication** — canonical `client/src/utils/formatBytes.ts` exists, but `ProjectDrawer.tsx` still has a local copy with a TODO. Consolidate in a future cleanup pass.
- **Relay Finder buttons disabled** — relay base path not available in the drawer. TODO left in code. Fix: pass `relayDirectory` from config as a prop or via a config hook.
- **Two agents on same file** — drawer-enhancements and delete-trash-route both edited ProjectDrawer.tsx in parallel wave 2b. Worked because linter changes were visible, but this is fragile. For future waves with parallel agents, prefer cleaner file separation.

---

## Efficiency Report

- Models: all Sonnet 4.6 — appropriate for this work
- Wave sizing: 4+2+2 (Wave 1 / 2a / 2b) — right shape
- No clarification loops
- Biggest efficiency gain: inheriting AGENTS.md meant zero ramp-up on stack conventions
- Biggest loss: B### collision required post-merge fix
- Change before next campaign: check last B### ID before assigning new one
