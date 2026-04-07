---
type: requirements
feature: Disk Space Observability
status: draft
date: 2026-04-07
---

# Requirements: Disk Space Observability (Projects View)

## Problem

76+ video projects accumulate disk usage across multiple locations. There is currently no visibility into which projects are consuming the most space or where that space is going. Goal is observability first — identify pain points across all projects so individual cleanup decisions can be made manually.

## Surfaces

### 1. Projects Table — Disk Columns (opt-in)

- **Hidden by default.** A toggle button alongside the existing filter pills (All / Needs Attention / Dead / Ready to Edit) enables disk columns.
- **Toggling ON triggers a full scan** of all projects immediately — calculates all values across all 76 projects.
- **Toggling OFF then ON rescans** — no stale data from prior toggle session.
- **Columns added when enabled** (8 total):

| Column | What it measures |
|--------|-----------------|
| `REC` | `recordings/` folder size |
| `TRASH` | `-trash/` folder size |
| `SHADOWS` | `recording-shadows/` folder size |
| `OTHER` | Everything else in project dir (transcripts, assets, final, s3-staging, inbox) |
| `R-REC` | `{relay}/{project}/recordings/` size |
| `R-1ST` | `{relay}/{project}/edit-1st/` size |
| `R-2ND` | `{relay}/{project}/edit-2nd/` size |
| `TOTAL` | Sum of all above |

- `TOTAL` is sortable — primary tool for finding biggest offenders.
- `TOTAL` is colored by the worst individual cell in that row.

### 2. Detail Drawer — Disk Breakdown

- Shows the same 8 values as the columns.
- If data exists (from a prior table scan), shows cached values.
- If no data yet (never scanned), calculates on demand when drawer opens.
- **Refresh button** forces recalculation for that individual project.

## Caching

- **In-memory only.** Lost on server restart. This is acceptable — the scan is on-demand and the toggle workflow naturally regenerates.
- Cache key: project name. Cache value: `{ rec, trash, shadows, other, rRec, r1st, r2nd, total, calculatedAt }`.

## Color Coding — Pain Thresholds

### Default thresholds (configurable — see below)

| Column | Faint warning | Amber | Red |
|--------|-------------|-------|-----|
| TRASH | > 0 | > 300 MB | > 1 GB |
| REC | > 2 GB | > 5 GB | > 10 GB |
| SHADOWS | > 100 MB | > 300 MB | > 500 MB |
| OTHER | > 500 MB | > 1 GB | — |
| R-REC | > 1 GB | > 3 GB | > 6 GB |
| R-1ST | > 500 MB | > 2 GB | > 4 GB |
| R-2ND | > 500 MB | > 2 GB | > 4 GB |
| TOTAL | > 3 GB | > 8 GB | > 15 GB |

### Stage multiplier

Projects in `published` or `archived` stage have all thresholds **halved**. A published project has no business holding large relay or recordings folders.

### Configuration

Thresholds live in `config.json` under a new `diskThresholds` key. Structure:

```json
"diskThresholds": {
  "stagePenaltyMultiplier": 0.5,
  "columns": {
    "trash":   { "faint": "0",      "amber": "300MB",  "red": "1GB"  },
    "rec":     { "faint": "2GB",    "amber": "5GB",    "red": "10GB" },
    "shadows": { "faint": "100MB",  "amber": "300MB",  "red": "500MB" },
    "other":   { "faint": "500MB",  "amber": "1GB",    "red": null   },
    "rRec":    { "faint": "1GB",    "amber": "3GB",    "red": "6GB"  },
    "r1st":    { "faint": "500MB",  "amber": "2GB",    "red": "4GB"  },
    "r2nd":    { "faint": "500MB",  "amber": "2GB",    "red": "4GB"  },
    "total":   { "faint": "3GB",    "amber": "8GB",    "red": "15GB" }
  }
}
```

## Key Paths

- **Projects root**: `projectsRootDirectory` from config (e.g. `~/dev/video-projects/v-appydave`)
- **Relay root**: `relayDirectory` from config (e.g. `/Users/davidcruwys/relay/flihub-appydave`)
- **Archive destination** (future): `/Volumes/T7/youtube-PUBLISHED/appydave`

## Out of Scope (This Pass)

- Cleanup actions (clear trash, clear relay subfolder) — future, in drawer
- Archive to external drive (`/Volumes/T7/youtube-PUBLISHED/appydave`) — future
- Restore from archive — future

**Note for future passes:** The archive/restore workflow implies projects will have a state beyond `published` — potentially `archived` (on T7) with a restore path. The cache structure should accommodate a `archivedAt` and `archivePath` field even if not populated now. The `diskThresholds` stage multiplier system should also accommodate an `archived` stage entry.

## Success Criteria

- Disk columns hidden by default, appear when toggled
- Toggle triggers full scan; re-toggle rescans
- All 8 columns present with correct values
- Color coding reflects per-column thresholds with stage multiplier applied
- Thresholds are in config.json and changes take effect without code change
- Detail drawer shows same breakdown; refresh button works
- In-memory cache: drawer uses cached values if available, on-demand if not

---

## Addendum: Wave 2 — Delete + Detail (2026-04-07)

### Pre-computed detail during scan

Extend `DiskSizeData` with a `detail` field populated during the main scan:

```typescript
detail?: {
  other: Record<string, number>                        // subfolder → bytes (e.g. { "final": 38GB, "assets": 1GB })
  recTopFiles: Array<{ name: string; size: number }>   // top 5 recordings by size
  trashFiles: Array<{ name: string; size: number }>    // all trash files (reused in confirm modal)
}
```

No lazy loading — detail is computed alongside sizes during scan (feature is behind a toggle, performance not a concern).

### Safe Delete — generic utility

Create `server/src/utils/safeDelete.ts` — reusable for all future deletions (relay subfolders, final/, etc.).

**Validation chain (all must pass before any delete):**
1. `rootDir` is non-empty string
2. `rootDir` exists on disk (`fs.pathExists`)
3. `targetPath` is non-empty string
4. `targetPath` exists on disk
5. Resolved `targetPath` is strictly within resolved `rootDir` (use existing `isPathWithinProject`)
6. `targetPath` matches caller-supplied pattern rule (e.g. must end with `/-trash`)

**Interface:**
```typescript
interface SafeDeleteRule {
  rootDir: string                    // must contain the target
  allowedSuffix: string              // e.g. '-trash' — target basename must match
  description: string                // human-readable label for error messages
}

async function safeDelete(targetPath: string, rule: SafeDeleteRule): Promise<{ deleted: string[]; error?: string }>
```

Returns list of deleted files (for audit/display). Each deletion type passes its own rule.

### Delete trash route

`DELETE /api/projects/:code/trash` — uses `safeDelete` with `-trash` rule.

Unit tests must cover:
- Rejects empty `projectsRootDirectory`
- Rejects non-existent root
- Rejects path outside projects root
- Rejects path not ending in `-trash`
- Happy path deletes files and returns list

### Confirmation modal (drawer)

Shown before any delete. Always includes:
- Real expanded absolute path (not a template)
- "Open in Finder" button next to the path
- Full file list with individual sizes
- Total size being removed
- Explicit "Delete X files (Y MB)" confirm button

### Folder-open buttons

Small Finder icon button on every row in the drawer disk section. Uses existing `useOpenFolder` hook.
