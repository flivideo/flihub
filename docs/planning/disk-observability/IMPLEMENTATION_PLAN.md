# IMPLEMENTATION_PLAN.md — Disk Space Observability (B062)

**Goal**: Add per-project disk usage observability to the Projects view — toggle-on columns showing size per subfolder (recordings, trash, shadows, other, relay/recordings, relay/edit-1st, relay/edit-2nd, total) with configurable pain-threshold colour coding.
**Started**: 2026-04-07
**Target**: All 7 work units complete, TypeScript clean, tests pass, thresholds configurable via config.json.
**Requirements**: `docs/planning/requirements-disk-observability.md`

## Summary
- Total: 11 | Complete: 11 | In Progress: 0 | Pending: 0 | Failed: 0

## Pending

- [x] shared-types — Add DiskSizeData, DiskThresholds, DiskThresholdLevel types to shared/types.ts; extend Config with diskThresholds and archivePath
- [x] disk-utils — Create server/src/utils/diskUtils.ts: getDirSize(), calculateProjectDiskSize(), getThresholdLevel()
- [x] disk-routes — In-memory cache + POST /api/projects/disk/scan-all + GET /api/projects/:code/disk in projects.ts
- [x] config-defaults — diskThresholds defaults in configManager.ts; archivePath wired through; config.json sample updated
- [x] client-hook — useProjectDiskApi.ts: useDiskScanAll() mutation + useProjectDisk(code) query; re-export from useApi.ts
- [x] projects-panel-columns — Toggle button in filter area; 8 disk columns appear on toggle-on; toggle-on fires scan-all
- [x] drawer-disk-section — Disk breakdown section in detail drawer; on-demand load if not cached; refresh button per project

## In Progress

## Complete

## Wave 2 — Pending

- [x] disk-detail-scan — Extend DiskSizeData with detail field; extend diskUtils scan to collect trashFiles, recTopFiles, other subfolder breakdown; pre-computed during scan-all
- [x] safe-delete-util — Create server/src/utils/safeDelete.ts with 6-step validation chain + unit tests covering all rejection cases
- [x] delete-trash-route — DELETE /api/projects/:code/trash route using safeDelete + client hook + confirmation modal (file list, real path, Open Finder button)
- [x] drawer-enhancements — Folder-open (Finder) button on every drawer disk row + OTHER subfolder breakdown display using detail data

## Failed / Needs Retry

## Notes & Decisions

- Cache is in-memory only (lost on server restart) — acceptable per requirements
- Stage multiplier: `published` and `archived` stages halve all thresholds
- Archive path `/Volumes/T7/youtube-PUBLISHED/appydave` goes in config.json as `archivePath`; not used in this pass but cache shape should accommodate `archivedAt?: string` and `archivePath?: string` fields in `DiskSizeData`
- getDirSize should return 0 (not throw) if the directory doesn't exist — many projects won't have all subfolders
- Wave 1: units 1–4 (server foundation). Wave 2: units 5–7 (client).
