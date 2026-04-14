# AGENTS.md — offload-manage-tool

**Project**: FliHub — video recording workflow management tool
**Campaign**: offload-manage-tool (Offload UX redesign — new Manage tool + T7 pill fix + drawer removal)
**Inherited from**: docs/planning/archive-offload/AGENTS.md (B064, 2026-04-08) + docs/planning/video-controls-and-dictionary/AGENTS.md (2026-04-12)
**Last updated**: 2026-04-13

---

## Project Overview

FliHub is a TypeScript monorepo that watches Ecamm Live recordings, provides a web UI for naming/organising video files, and manages project assets for a solo YouTube creator workflow. It runs locally on macOS (Apple Silicon). No cloud deployment, no multi-user support, no authentication.

---

## Campaign Goal

Move all archive/offload UI from the buried ProjectDrawer into a dedicated Manage page tool. The hold/restore backend is already complete (B064/B065). This is a **pure UI reorganization** — no new API endpoints, no new hooks.

**Requirements doc**: `docs/planning/requirements-offload-ux.md`

**Key design rules from B064 (still apply)**:
- `'both'` is transitional, not a resting state — always surface as unfinished
- Offloading only frees space when local is deleted — UI must drive completion
- Verification gates every delete
- HOLDING is flat — FliHub never writes to youtube-PUBLISHED

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
client/src/
├── App.tsx                             # Tab nav, SsdIndicator wiring, manageTool state
├── components/
│   ├── ManagePanel.tsx                 # ActiveTool type, toolHeadings, tool routing, ToolsSidebar
│   ├── ProjectDrawer.tsx               # MODIFY — remove SSD Offload section
│   ├── HoldDeleteModal.tsx             # REUSE — move import into StorageTool
│   ├── ProjectsPanel.tsx               # HoldBadge stays (status indicator)
│   └── shared/
│       ├── ToolsSidebar.tsx            # MODIFY — add Storage button to new group
│       ├── SsdIndicator.tsx            # MODIFY — change nav target to Manage→Storage
│       ├── StorageTool.tsx             # CREATE — the new Manage tool
│       └── index.ts                    # ADD export for StorageTool
├── hooks/
│   ├── useHoldApi.ts                   # All 7 hooks — already complete, no changes needed
│   └── useApi.ts                       # Barrel re-export — no changes needed
```

---

## Architecture Docs Registry

| Doc | Path | Relevant For |
|-----|------|-------------|
| Requirements | `docs/planning/requirements-offload-ux.md` | All WUs — the source of truth for what to build |
| Hold AGENTS | `docs/planning/archive-offload/AGENTS.md` | Data shapes, lifecycle, anti-patterns |
| Shared types | `shared/types.ts` | HoldStatus, HoldVerification, HoldOperationResult, HoldLocation |
| Hold hooks | `client/src/hooks/useHoldApi.ts` | useSsdStatus, useHoldStatus, useHoldProject, useVerifyHolding, useDeleteLocal, useRestoreFromHolding, useDeleteHolding |
| Hold routes | `server/src/routes/hold.ts` | API endpoints (read-only reference — no changes) |
| Manage panel | `client/src/components/ManagePanel.tsx` | ActiveTool type, tool routing pattern, toolHeadings |
| Tools sidebar | `client/src/components/shared/ToolsSidebar.tsx` | Sidebar group pattern |
| SSD indicator | `client/src/components/shared/SsdIndicator.tsx` | Current nav wiring |
| Project drawer | `client/src/components/ProjectDrawer.tsx` | SSD Offload section to remove |
| HoldDeleteModal | `client/src/components/HoldDeleteModal.tsx` | Reuse as-is for destructive confirms |

---

## Constraints

1. **No new API endpoints** — the backend from B064 is complete. All 7 useHoldApi hooks work as-is.
2. **Warm linen theme tokens only** — `bg-surface`, `bg-surface-muted`, `text-warm-primary`, `text-warm-secondary`, `text-warm-muted`, `text-warm-faint`, `border-warm`, `border-warm-strong`. Red for destructive: `border-red-300 bg-red-50 text-red-700`. Amber for warnings: `bg-amber-50 text-amber-700`.
3. **Manage page pattern** — sidebar left, tool content center. ActiveTool union type in ManagePanel.tsx. Each tool renders when `activeTool === 'toolname'`.
4. **Three user-facing states only** — Local only / On T7 only / Both copies. Blocked conditions (relay active, SSD not mounted) are disabled buttons with inline reason — NOT separate UI states.
5. **`npm test` must stay at 1036 passing** — no regressions. New component tests welcome but not required for this UI-only campaign.
6. **Typecheck clean** — `npm run build -w client` must pass.

---

## Baseline Metrics

| Metric | Pre-campaign (2026-04-13) |
|--------|--------------------------|
| Tests | 1036 passed, 2 skipped |
| Typecheck | pass (all 3 workspaces) |
| Build | pass |

---

## Success Criteria

- [ ] `npm run build -w client` passes
- [ ] `npm test` exits 0, no regressions
- [ ] "Storage" tool appears in Manage sidebar under a new group
- [ ] StorageTool shows correct state for active project (local-only / holding-only / both)
- [ ] Offload, restore, delete-local, delete-holding all work from StorageTool
- [ ] HoldDeleteModal reused (not duplicated) for destructive confirms
- [ ] Restore has lightweight confirmation (not typed-code level)
- [ ] T7 header pill navigates to Manage → Storage (not Projects tab)
- [ ] ProjectDrawer SSD Offload section removed
- [ ] ProjectsPanel HoldBadge unchanged (still shows T7 / T7 ⚠ per row)

---

## Done-When Definitions

### WU1: StorageTool component
**Done when**: `StorageTool.tsx` exists in `client/src/components/shared/`, exports a `StorageTool` component, and renders 3 clear states:
- **Local only**: shows disk usage + "Offload to T7" button + "Preview" (dry run) link. Buttons disabled with reason text when SSD not mounted or relay blocked.
- **On T7 only**: shows held date + "Restore from T7" button with lightweight confirm (not typed-code). Shows disk size on T7.
- **Both copies**: amber warning "Offload incomplete — space not freed". Shows verification result. Primary action: "Free space — Delete Local" (opens HoldDeleteModal). Secondary: "Cancel — Remove T7 copy" (opens HoldDeleteModal).
- Uses all 7 hooks from useHoldApi.ts. Imports HoldDeleteModal for destructive confirms.
- Follows warm linen tokens. Section headers use `text-[10px] font-bold uppercase tracking-wide text-warm-faint` pattern.

### WU2: Wire StorageTool into ManagePanel
**Done when**: `ActiveTool` type includes `'storage'`. `toolHeadings` includes `storage: 'Storage'`. `ToolsSidebar` has a new "Storage" group (or added to an existing group). ManagePanel renders `<StorageTool />` when `activeTool === 'storage'`. StorageTool receives `activeProject` context (project code) from ManagePanel. Exported from `shared/index.ts`.

### WU3: Rewire T7 pill + remove drawer section
**Done when**: SsdIndicator `onNavigateToProjects` is replaced with a callback that navigates to Manage tab with `storage` tool selected (same pattern as Sync/Relay indicators: `setManageTool('storage')` + `changeTab('manage')`). ProjectDrawer.tsx no longer has the SSD Offload section (the entire block from the `border-l-2` section header through to the end of the hold state machine). The drawer still shows everything else (Stats, Progress, Health, Quick Actions, Disk Usage).

---

## Reference Patterns

### Adding a tool to the Manage page (from B044 Sync, B045 AWB)

```typescript
// 1. ManagePanel.tsx — extend ActiveTool union
export type ActiveTool = 'regen' | 'gling-edit' | 'relay' | 'awb' | 'sync' | 'storage';

// 2. ManagePanel.tsx — add heading
const toolHeadings: Record<string, string> = {
  regen: 'Recordings',
  'gling-edit': 'Gling / Edit Prep',
  relay: 'Relay Collaboration',
  sync: 'Sync',
  awb: 'AWB',
  storage: 'Storage',
};

// 3. ManagePanel.tsx — render tool content (follows existing pattern)
{activeTool === 'storage' && <StorageTool projectCode={activeProjectCode} />}

// 4. ToolsSidebar.tsx — add button in a group
<ToolButton
  label="Storage"
  active={activeTool === 'storage'}
  onClick={() => onToolClick('storage')}
  tooltip="Offload to T7 SSD / restore from T7"
/>
```

### SsdIndicator nav rewiring (from SyncIndicator/RelayIndicator pattern)

```typescript
// App.tsx — current
<SsdIndicator onNavigateToProjects={() => changeTab('projects')} />

// App.tsx — new (same pattern as Sync/Relay)
<SsdIndicator onNavigateToStorage={() => { setManageTool('storage'); changeTab('manage'); }} />
```

### HoldDeleteModal usage (from ProjectDrawer — reuse pattern)

```typescript
// Already works standalone — just import and wire
<HoldDeleteModal
  target="local"  // or "holding"
  projectCode={projectCode}
  verification={holdStatus.verification}
  bytesToFree={holdStatus.verification?.localBytes || 0}
  holdingPath={holdStatus.holdingPath || ''}
  onConfirm={handleDeleteLocal}
  onCancel={() => setShowDeleteModal(false)}
  isLoading={deleteLocalMutation.isPending}
  error={deleteLocalMutation.error?.message}
/>
```

---

## Anti-Patterns for This Campaign

1. **Do not duplicate HoldDeleteModal** — import and reuse the existing component. It already handles both `target: 'local'` and `target: 'holding'`.
2. **Do not create new API hooks** — all 7 hooks in `useHoldApi.ts` are complete and tested. Read the hook file before writing any fetch calls.
3. **Do not show 9 states** — the drawer had 9 mutually exclusive states. StorageTool collapses to 3 user-facing states with disabled buttons for blocked conditions.
4. **Do not leave the drawer section** — if StorageTool exists, the drawer section must be removed. Two homes for the same actions is worse than one buried home.
5. **Do not change the backend** — this is a UI-only campaign.

---

## Learnings (inherited from prior campaigns)

- **Manage page `initialTool` pattern works well** — SyncIndicator and RelayIndicator both navigate to Manage with a tool pre-selected via `setManageTool()` + `changeTab('manage')`. SsdIndicator should follow the same pattern.
- **HoldDeleteModal is self-contained** — it handles its own state (typed code input, verification display, loading, error). Parent just passes props and callbacks.
- **ProjectDrawer hold section was 9 states because it handled infrastructure concerns (SSD mounted? relay blocked?) as top-level states.** StorageTool should handle these as disabled-button reasons instead.
- **`useHoldStatus(code)` auto-verifies when location is 'both'** — the server includes verification in the status response. No separate verify call needed for the happy path.
