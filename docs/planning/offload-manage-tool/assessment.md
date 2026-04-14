# Assessment — offload-manage-tool

**Campaign**: offload-manage-tool
**Profile**: Development
**Started**: 2026-04-13
**Completed**: 2026-04-13
**Verdict**: PASS (with delivery review patches applied)

---

## Goal

Move all archive/offload UI from the buried ProjectDrawer into a dedicated Manage page tool. Rewire T7 header pill. Remove drawer section. Pure UI reorganization — no backend changes.

## Outcome

3/3 work units complete. All delivery review patches applied. 1036 tests pass. Typecheck clean. Build clean.

## Work Units

| WU | Description | Status | Notes |
|----|-------------|--------|-------|
| WU1 | StorageTool component | Done | 3 user-facing states, 7 hooks, HoldDeleteModal reused, LocationBadge sub-component |
| WU2 | Wire into ManagePanel | Done | ActiveTool union + ToolsSidebar "Storage" group + toolHeadings |
| WU3 | Rewire T7 pill + remove drawer section | Done | SsdIndicator prop renamed, ~170 lines removed from ProjectDrawer |

## Delivery Review Patches Applied

| Finding | Source | Action |
|---------|--------|--------|
| State persistence across project switches | EC-002/003/004 | Added useEffect reset on projectCode change |
| Incomplete useEffect dependency array | BH-001, EC-001/007, AR-007, CQ-001 | Added projectCode to deps + guard |
| targetPath showed code not filesystem path | BH-005 | Added useConfig() for real projectDirectory |
| ToolsSidebar test missing new button | UT-002 | Added SSD Offload + Storage assertions |

## Metrics

| Metric | Before | After |
|--------|--------|-------|
| Tests | 1036 | 1036 |
| Typecheck | Pass | Pass |
| Build | Pass | Pass |

## What Went Well

- Clean extraction: all 7 useHoldApi hooks reused without modification
- HoldDeleteModal reused, not duplicated
- Drawer removal was surgical — zero stale references
- T7 pill rewire follows established Sync/Relay indicator pattern
- Delivery review caught 4 real issues before they became bugs

## Open Questions Raised During Campaign

1. **Relay-blocked state is confusing** — Storage tool says "Relay active — clear 1.1 GB" but Relay tool shows all lanes "Synced". The relay block checks byte counts in relay folders, not sync status. Synced files physically remain in relay and block offload. There is no "clear relay" operation. See product analysis below.

2. **What should be backed up?** — Current offload is a full `rsync -a` of the entire project directory with zero exclusions. No selectivity for recordings vs edits vs final. Duplicate finals and old edit versions are all copied. See product analysis below.

---

## Product Analysis: Relay Block & Backup Strategy

### Why offload is blocked

The Storage tool shows "Relay active — clear 1.1 GB in relay before offloading" because:

1. `holdUtils.ts:157-169` scans three relay subfolders (`recordings/`, `edit-1st/`, `edit-2nd/`) and sums all file bytes
2. `relayBlocked = relayBytes > 0` — any bytes at all = hard block
3. The Relay tool's "Synced" status means file **counts** match between relay and local (`deriveSyncStatus` at `relay.ts:78-87`), NOT that the relay folder is empty
4. `POST /api/relay/collect` copies files FROM relay TO local but **does not delete** the relay-side copies
5. There is no "clear relay" or "delete relay files" operation in the system

**Result**: Once files are pushed to relay and collected back, they remain in relay indefinitely, permanently blocking offload for that project.

### How to clear it today (manual)

Delete the relay subfolder contents manually in Finder or terminal:
```
rm -rf ~/Relay/FliHub-appydave/{project-code}/recordings/*
rm -rf ~/Relay/FliHub-appydave/{project-code}/edit-1st/*
rm -rf ~/Relay/FliHub-appydave/{project-code}/edit-2nd/*
```

### What should be built

A "Clear Relay" action — either per-lane or whole-project — that deletes relay-side files once sync status is "Synced". This is a prerequisite for a smooth offload workflow. Candidates:

- **Per-lane clear button** on Relay Kanban (only enabled when synced)
- **Auto-clear on collect** (delete relay files after successful collect)
- **Clear-before-offload** (Storage tool offers to clear synced relay as part of offload flow)

### What gets backed up (and what probably shouldn't)

Current: `rsync -a projectDir/ holdingPath/` — copies **everything** with no exclusions.

| Folder | Typical Size | Worth Backing Up? | Notes |
|--------|-------------|-------------------|-------|
| `recordings/` | Largest (raw clips) | Yes — source of truth, irreplaceable | These are the raw Ecamm recordings |
| `recording-transcripts/` | Small (text) | Yes — cheap to store, expensive to regenerate | Whisper outputs |
| `assets/` | Varies | Yes — images, thumbs | |
| `final/` | Large | Maybe not — usually a duplicate of 2nd edit | Could be regenerated |
| `edit-1st/` | Large | Depends — if editor has old versions, those are bloat | Only latest version matters |
| `edit-2nd/` | Large | Depends — same old-version concern | Only latest version matters |
| `-trash/` | Varies | No — already deleted by user | Wasting T7 space |
| `s3-staging/` | Varies | No — transit folder for DAM | Copies exist on S3/DAM already |
| `inbox/` | Varies | Depends | Staging area — may already be processed |
| `.DS_Store`, `._*` | Tiny | No | macOS metadata cruft |

### Recommendations for future work

1. **B-NEW: Add relay clear operation** — `DELETE /api/relay/clear` per-subfolder or whole-project. Guard: only when synced. UI: button on Kanban lane or pre-offload prompt.
2. **B-NEW: Selective offload** — Add `--exclude` patterns to the rsync: skip `-trash/`, `s3-staging/`, `.DS_Store`, `._*` at minimum. Optional: skip `final/` when it duplicates `edit-2nd/`.
3. **B-NEW: Old version cleanup** — Before offload, show a "N old versions found (X GB)" summary and offer to clean up. Edit folders often accumulate `v1`, `v2`, `v3` exports.
