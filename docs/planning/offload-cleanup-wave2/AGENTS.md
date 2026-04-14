# AGENTS.md — offload-cleanup-wave2

**Project**: FliHub — video recording workflow management tool
**Campaign**: offload-cleanup-wave2 (Relay clear + pre-offload cleanup + rsync excludes)
**Inherited from**: docs/planning/offload-manage-tool/AGENTS.md (2026-04-13)
**Last updated**: 2026-04-13

---

## Project Overview

FliHub is a TypeScript monorepo that watches Ecamm Live recordings, provides a web UI for naming/organising video files, and manages project assets for a solo YouTube creator workflow. It runs locally on macOS (Apple Silicon). No cloud deployment, no multi-user support, no authentication.

---

## Campaign Goal

Three things: (1) Add relay-clear so offload isn't permanently blocked, (2) show per-folder breakdown in StorageTool so user can delete bloat before offloading, (3) auto-exclude junk from rsync. This campaign has both backend and frontend changes.

**Key user insight**: "More important than optionally skipping stuff is to just delete what I don't want, then offload." The user wants to make deletion decisions themselves — not have the system guess.

**Backup philosophy**:
- Recordings: always back up (source of truth, irreplaceable)
- edit-1st: back up, but user may want to trim old versions first
- edit-2nd: user says "never in a backup" — but we let them delete it rather than auto-skip
- final: back up (this is the keeper, promoted from edit-2nd)
- -trash, s3-staging, .DS_Store, ._*: never back up (auto-excluded)

---

## Build & Run Commands

```bash
npm run build -w shared    # ALWAYS run after changing shared/
npm run build -w server    # TypeScript check
npm run build -w client    # tsc -b && vite build
npm test                   # all three workspaces
lsof -i :5101 | grep LISTEN  # check server running
```

---

## Directory Structure (campaign-relevant)

```
server/src/
├── routes/
│   ├── relay.ts                # MODIFY — add DELETE /api/relay/clear endpoint
│   ├── hold.ts                 # READ ONLY — relay block check reference
│   └── manage.ts               # MODIFY — add DELETE /api/manage/delete-subfolder
├── utils/
│   ├── holdUtils.ts            # MODIFY — add rsync --exclude args
│   └── diskUtils.ts            # READ ONLY — DiskSizeData calculation reference
├── test/
│   ├── relay.test.ts           # MODIFY — add clear endpoint tests
│   ├── holdUtils.test.ts       # MODIFY — add exclude tests
│   └── manage.test.ts          # MODIFY — add delete-subfolder tests

client/src/
├── components/
│   ├── shared/
│   │   ├── StorageTool.tsx     # MODIFY — add folder breakdown + delete buttons + relay link
│   │   ├── RelayTool.tsx       # READ ONLY — reference for tool navigation pattern
│   │   └── relay/
│   │       └── KanbanLane.tsx  # MODIFY — add Clear button when synced
│   └── ManagePanel.tsx         # READ ONLY — onToolClick pattern reference
├── hooks/
│   ├── useRelayApi.ts          # MODIFY — add useRelayClear hook
│   └── useHoldApi.ts           # READ ONLY — hook pattern reference
```

---

## Architecture Docs Registry

| Doc | Path | Relevant For |
|-----|------|-------------|
| Assessment (product analysis) | `docs/planning/offload-manage-tool/assessment.md` | All WUs — explains the relay-block problem and backup strategy |
| Hold AGENTS | `docs/planning/archive-offload/AGENTS.md` | holdUtils data shapes, lifecycle |
| Shared types | `shared/types.ts` | HoldStatus, RelaySubfolder, DiskSizeData |
| Hold hooks | `client/src/hooks/useHoldApi.ts` | Hook pattern reference |
| Relay hooks | `client/src/hooks/useRelayApi.ts` | useRelayPush/useRelayCollect pattern for new useRelayClear |
| Relay routes | `server/src/routes/relay.ts` | deriveSyncStatus, RELAY_SUBFOLDERS, collect endpoint pattern |
| Hold routes | `server/src/routes/hold.ts` | relayBlocked check, holdProject call |
| Manage routes | `server/src/routes/manage.ts` | delete-transcripts/delete-shadows pattern for new delete-subfolder |
| Disk utils | `server/src/utils/diskUtils.ts` | DiskSizeData calculation, getSubfolderSizes |
| StorageTool | `client/src/components/shared/StorageTool.tsx` | Current UI to extend |
| KanbanLane | `client/src/components/shared/relay/KanbanLane.tsx` | Where Clear button goes |

---

## Constraints

1. **Warm linen theme tokens only** — `bg-surface`, `bg-surface-muted`, `text-warm-primary`, `text-warm-secondary`, `text-warm-muted`, `text-warm-faint`, `border-warm`, `border-warm-strong`. Red for destructive: `border-red-300 bg-red-50 text-red-700`. Amber for warnings.
2. **Delete-subfolder allowlist** — Only `edit-1st`, `edit-2nd`, `final`, `-trash`, `s3-staging`, `inbox` can be deleted. `recordings` and `recording-transcripts` are NEVER deletable through this endpoint.
3. **Relay clear guard** — Only allow clear when sync status is `synced`. Do NOT allow clearing when `ahead`, `behind`, `diverged`, or `relay-only` — data loss risk.
4. **Empty folder, don't remove it** — `delete-subfolder` empties the folder contents but does not remove the folder itself. The folder structure should remain.
5. **rsync excludes in both directions** — Apply the same excludes to `holdProject()` and `restoreFromHolding()`. Don't offload junk, don't restore junk.
6. **`npm test` must stay at 1036 passing** — no regressions. New tests required for all new endpoints.
7. **Typecheck clean** — `npm run build -w client` and `npm run build -w server` must pass.

---

## Baseline Metrics

| Metric | Pre-campaign (2026-04-13) |
|--------|--------------------------|
| Tests | 1036 passed, 2 skipped |
| Typecheck | pass (all 3 workspaces) |
| Build | pass |

---

## Success Criteria

- [ ] `npm run build` passes (all workspaces)
- [ ] `npm test` exits 0, no regressions, new endpoint tests pass
- [ ] Relay Kanban lanes show "Clear" button when synced
- [ ] Clearing relay empties relay subfolder and unblocks offload
- [ ] StorageTool local-only state shows per-folder breakdown with sizes
- [ ] Each deletable folder has a delete button with confirmation
- [ ] Offload rsync excludes -trash/, s3-staging/, .DS_Store, ._*
- [ ] StorageTool relay-blocked message links to Relay tool
- [ ] Full flow works: clear relay -> delete unwanted folders -> offload

---

## Done-When Definitions

### WU1: Relay clear endpoint + UI
**Done when**:
- `DELETE /api/relay/clear` endpoint exists in `relay.ts`, accepts `{ subfolder: RelaySubfolder }`, deletes all files in relay subfolder directory
- Endpoint guards: returns 400 if sync status is not `synced` (call `deriveSyncStatus` to check)
- `useRelayClear` hook exists in `useRelayApi.ts`, follows same pattern as `useRelayCollect` (useMutation, invalidates relay browse query on success)
- Also invalidates hold status query on success (so StorageTool sees relayBytes drop)
- KanbanLane shows "Clear" text-button when `syncStatus === 'synced'` AND `relayFileCount > 0`. Button calls `onClear(subfolder)`. Button is red text link style, NOT a primary button.
- RelayTool wires `onClear` to `useRelayClear.mutate({ subfolder })`
- Tests: endpoint returns 200 on synced clear, 400 when not synced, clears files, leaves folder intact

### WU2: Pre-offload folder breakdown in StorageTool
**Done when**:
- In `local-only` state, above the offload buttons, a folder breakdown section shows:
  - Each folder name + size (e.g. "recordings — 391.8 MB", "edit-2nd — 313.9 MB")
  - Deletable folders (edit-1st, edit-2nd, final, -trash, s3-staging) have a small trash/delete icon-button
  - Non-deletable folders (recordings, recording-transcripts) show size only, no delete button
  - Folders with 0 bytes are omitted
- Clicking delete opens a lightweight confirm: "Delete {folder}? {size} will be freed. Cannot be undone." with Confirm (red) + Cancel buttons.
- `DELETE /api/manage/delete-subfolder` endpoint in `manage.ts`: accepts `{ subfolder: string }`, validates against allowlist, empties folder contents using `fs.emptyDir()` or equivalent, returns `{ success: true, deleted: N }`. Does NOT remove the folder itself.
- New `useDeleteSubfolder` hook in `useApi.ts` or `useHoldApi.ts` — useMutation, invalidates disk size + hold status on success
- StorageTool uses `DiskSizeData.detail.other` for subfolder sizes. If edit-1st/edit-2nd/final are lumped into "other", the breakdown still works (detail.other is a Record<string, number>).
- Tests: endpoint returns 200 for allowed subfolders, 400 for disallowed (recordings, recording-transcripts), empties folder

### WU3: Auto-exclude junk from rsync
**Done when**:
- `holdProject()` in `holdUtils.ts` passes `--exclude` args: `--exclude=-trash/`, `--exclude=s3-staging/`, `--exclude=.DS_Store`, `--exclude=._*`
- `restoreFromHolding()` passes the same excludes
- Dry-run byte calculation subtracts trash + s3-staging folder sizes from localBytes (so preview shows accurate "would copy X" amount). Use `getDirStats` on those folders and subtract.
- Tests: mock or verify rsync is called with exclude args. Test dry-run reports smaller bytes when trash/s3-staging exist.

### WU4: Relay-blocked UX improvement
**Done when**:
- When `relayBlocked` is true in StorageTool, the amber warning text includes a clickable "Go to Relay" link
- The link calls `onToolClick('relay')` (passed as a new prop to StorageTool, wired in ManagePanel)
- If relay has bytes but all lanes are synced (need to check: this info may not be in HoldStatus — may need to add a note or just use the existing relayBlocked + relayBytes), the message reads "Relay synced but not cleared — clear relay folders to unblock offload"
- This is a small UI tweak — no new endpoints needed

---

## Reference Patterns

### Relay hook pattern (from useRelayApi.ts — for useRelayClear)

```typescript
// Follow useRelayCollect pattern
export function useRelayClear() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { subfolder: RelaySubfolder }) => {
      const res = await fetch('/api/relay/clear', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Clear failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relay-browse'] });
      queryClient.invalidateQueries({ queryKey: ['hold-status'] });
    },
  });
}
```

### Delete endpoint pattern (from manage.ts delete-transcripts — for delete-subfolder)

```typescript
router.delete('/delete-subfolder', async (req, res) => {
  const config = getConfig();
  const projectPath = expandPath(config.projectDirectory);
  const { subfolder } = req.body as { subfolder: string };

  const ALLOWED = ['edit-1st', 'edit-2nd', 'final', '-trash', 's3-staging', 'inbox'];
  if (!subfolder || !ALLOWED.includes(subfolder)) {
    return res.status(400).json({ success: false, error: `Cannot delete ${subfolder}` });
  }

  const dir = path.join(projectPath, subfolder);
  if (!fs.existsSync(dir)) {
    return res.json({ success: true, deleted: 0 });
  }

  const files = await fs.readdir(dir);
  let deleted = 0;
  for (const file of files) {
    const fullPath = path.join(dir, file);
    await fs.remove(fullPath);
    deleted++;
  }

  res.json({ success: true, deleted });
});
```

### rsync exclude pattern (from relay.ts — for holdUtils)

```typescript
// relay.ts already has this pattern:
const RSYNC_EXCLUDES = ['.DS_Store', '._*', '.gitkeep', '.stfolder', ...];
export function rsyncExcludeArgs(): string[] {
  return RSYNC_EXCLUDES.flatMap(pattern => ['--exclude', pattern]);
}

// For holdUtils, create similar:
const HOLD_EXCLUDES = ['-trash/', 's3-staging/', '.DS_Store', '._*'];
function holdExcludeArgs(): string[] {
  return HOLD_EXCLUDES.flatMap(pattern => ['--exclude', pattern]);
}

// Then in holdProject:
await spawnAsync('rsync', ['-a', ...holdExcludeArgs(), projectDir + '/', destDir + '/']);
```

### Tool navigation pattern (from ManagePanel — for WU4 relay link)

```typescript
// StorageTool receives onNavigateToRelay prop
interface StorageToolProps {
  projectCode: string;
  onNavigateToRelay?: () => void;  // new prop
}

// ManagePanel wires it:
<StorageTool
  projectCode={config?.activeProject || ''}
  onNavigateToRelay={() => setActiveTool('relay')}
/>

// StorageTool uses it in the blocked message:
{offloadDisabledReason?.includes('Relay') && onNavigateToRelay && (
  <button onClick={onNavigateToRelay} className="text-sm text-blue-600 hover:underline">
    Go to Relay
  </button>
)}
```

---

## Anti-Patterns for This Campaign

1. **Do not auto-skip edit-2nd** — The user said "second edit is never in a backup" but the system should let them delete it, not silently exclude it. Their choice, not ours.
2. **Do not allow deleting recordings** — Recordings are the irreplaceable source of truth. The delete-subfolder endpoint allowlist must never include `recordings`.
3. **Do not delete the folder itself** — `delete-subfolder` empties contents but leaves the empty folder. Relay and other systems expect the folder structure to exist.
4. **Do not allow relay clear when not synced** — Clearing relay files that haven't been collected = data loss. Guard with deriveSyncStatus check.
5. **Do not forget to invalidate hold-status** — After relay clear or subfolder delete, the StorageTool needs fresh data. Always invalidate hold-status and disk-size queries.

---

## Learnings (inherited + new)

- **Manage page `initialTool` pattern works well** — SyncIndicator and RelayIndicator both navigate to Manage with a tool pre-selected via `setManageTool()` + `changeTab('manage')`. SsdIndicator follows the same pattern (proven in wave 1).
- **HoldDeleteModal is self-contained** — it handles its own state. Parent just passes props and callbacks.
- **`relayBlocked` counts all bytes in relay folders** — it doesn't know about sync status. Relay clear fixes this by actually removing the files.
- **`DiskSizeData.detail.other` already has per-subfolder sizes** — this is a Record<string, number> keyed by subfolder name. StorageTool can use this directly for the folder breakdown.
- **`deriveSyncStatus` is a pure function** — takes relay count + local count, returns status. Can be called server-side in the clear endpoint to guard against data loss.
- **delete-transcripts/delete-shadows pattern is proven** — follow the same shape for delete-subfolder. allowlist + fs.remove loop + count.
