# IMPLEMENTATION_PLAN.md — Storage Panel (Hold + Archive)

**Goal**: Replace the multi-project Archive list with a single per-active-project Storage panel that owns two verbs — **Hold** (heavy files only, reversible) and **Archive** (whole folder, near-permanent). One panel, hierarchical tree of what's where, context-aware actions.
**Started**: 2026-04-14
**Target**: Storage panel feels like Relay (per-active-project, sidebar in Manage). Old multi-project Archive tool removed. Three storage states (Active / Held / Archived) are mutually exclusive and clearly visible.
**Supersedes**: `archive-tool` campaign (kept the data layer + endpoints, replacing the UI shape)

## Summary
- Total: 5 | Complete: 5 | In Progress: 0 | Pending: 0 | Failed: 0

## Mental Model (read first)

Three storage locations on T7. FliHub manages two of them; DAM (Ruby gem) owns the third.

| T7 folder | Verb | What moves | Owner | Restore? |
|---|---|---|---|---|
| `youtube-HOLDING/<brand>/<code>/` | **Hold** | Heavy files only (local folder + light files stay) | FliHub | Yes — fast round-trip |
| `youtube-PUBLISHED/<brand>/<code>/` | **Archive** | Whole folder (local removed entirely) | FliHub *(this campaign)* | Yes — `Unarchive` (rare) |
| `youtube-FAILS/...` | — | (manual; ignored by FliHub for now) | Nobody | — |

PUBLISHED is written **flat** (`youtube-PUBLISHED/<brand>/<code>/`) — no `b50-b99` range bucket logic. DAM continues to own the bucket-shuffle if needed; a separate manual tool can do range-bucket reorganisation later.

States are mutually exclusive: a project is **Active** OR **Held** OR **Archived**.

## Design Principles

1. **Per-active-project** — same chrome as Relay tool. No multi-project list. Project name in the title.
2. **One panel, two verbs** — Hold and Archive coexist; UI shows the current state and only the actions that apply.
3. **Hierarchical tree is the panel** — the tree IS the main content, not a confirmation modal. Heavy/light nodes are visually distinct.
4. **Confirm proportional to impact** — Hold: no confirm. Restore: no confirm. Archive: confirm popover (it deletes local). Unarchive: confirm popover.
5. **No hidden footguns** — server endpoints re-validate state; UI always renders against fresh inventory; mutations invalidate.

## Heavy/Light Classification

**HEAVY = subfolder allowlist** (option (a) from planning conversation):
- `recordings/`
- `recording-shadows/`
- `final/`
- `recordings/-chapters/` (nested)

**LIGHT = everything else** stays on local during Hold:
- `recording-transcripts/`
- `assets/` (images, thumbs, prompts)
- `inbox/`
- top-level metadata files (state, naming maps, configs)

The split is hardcoded in a server-side constant `HEAVY_SUBFOLDERS` (single source of truth). UI reads classification from server response, never duplicates the list.

⚠ **OPEN QUESTION 1 (default chosen)** — confirm subfolder allowlist before WU1 starts. Alternatives: size-threshold (`>50MB`), or hybrid.

## Verbs and State Transitions

```
            Hold            Restore-held
  Active  ────────►  Held  ────────────►  Active
    │                                         ▲
    │                                         │
    │ Archive             Unarchive (rare)    │
    └─────────►  Archived ────────────────────┘
                    ▲
                    │ Archive-from-Held: restore heavy first, then archive everything
                  Held
```

Held → Archive is a **shortcut button** in the Held state ("Archive everything — restores heavy then archives"). Saves a round-trip.

⚠ **OPEN QUESTION 2 (default = yes)** — keep `Unarchive` as a small bottom-of-panel action in Archived state? Default: yes.
⚠ **OPEN QUESTION 3 (default = yes)** — keep Held → Archive shortcut? Default: yes.

## Panel Shape

```
Storage — c36-archon-bmad                              ● Active

[ Hold heavy files (2.7 GB → T7) ]   [ Archive everything (2.8 GB → T7) ]

▾ Project tree
   recordings/             2.4 GB   🟠 heavy   on local
     ├ 01-1-intro.mov         845 MB
     └ 01-2-cta.mov           520 MB
   final/                   313 MB  🟠 heavy   on local
     └ c36-final.mov          313 MB
   recording-transcripts/   1.2 MB  ⚪ light
   assets/                  340 KB  ⚪ light
   inbox/                    12 KB  ⚪ light

▾ Recent activity
   • Held — 7 Apr 2026
   • Restored — 2 Apr 2026

T7: ● Connected      Local: ~/dev/video-projects/v-appydave/c36-archon-bmad
```

**Held state**: heavy nodes greyed out + `on T7` annotation; primary button changes to `Restore heavy files`; secondary `Archive everything` shows as the shortcut.

**Archived state**: tree collapses to a path label `youtube-PUBLISHED/appydave/c36-archon-bmad`; primary button is empty space + `Unarchive →` link at the bottom.

## Wave A — Prerequisites (run first, in sequence)

- [x] **WU1** — Backend foundation: `HEAVY_SUBFOLDERS` + `getStorageTree` util + 5 endpoints + 25 route/util tests. Server 555→580 (+25), shared unchanged. SSD mount check ordered before state derivation (prevents mis-classifying held/archived as active when T7 unplugged). New `Config.publishedPath` field added; not yet wired into `config.template.json` (flagged for WU3). Completed 2026-04-14.

## Wave B — Main Wave (run in parallel after WU1)

- [x] **WU2** — `StoragePanel.tsx` + tree view + state-aware action buttons + confirms. Added `StoragePanel` + `storage/` subcomponents (`StorageStateHeader`, `StorageTree`, `StorageActions`), `useStorageApi` hooks, `useInvalidateProjectStorage` helper, `QUERY_KEYS.storageTree`. Client tests +11. Completed 2026-04-14.
- [x] **WU3** — Sidebar wiring + deep-links. Replaced SSD Status with Storage in ToolsSidebar; `SsdIndicator` / ProjectsPanel T7 badges navigate to storage for chosen project; `App.navigateToManage` accepts `{ projectCode? }` and switches active project. Completed 2026-04-14.
- [x] **WU4** — Removed old `ArchiveTool.tsx` + archiveToolUtils + tests; stripped archive filter state from App.tsx/ManagePanel; deleted `useArchiveInventory`/`useBatchOffload`/`useBatchDeleteLocal` hooks. Server endpoints left intact for future Projects-page chips. Completed 2026-04-14.
- [x] **WU5** — Activity log persistence + feed. New `storageActivityLog` util (JSONL at `~/.flihub/storage-activity.jsonl`, injectable path), `GET /api/projects/:code/storage-activity`, `useStorageActivity` hook, `StorageActivityFeed` component rendered below tree. Server +9 tests, client +5 tests. Completed 2026-04-14.

## Pending

### WU1 — Backend foundation

**Type**: Backend (Wave A prerequisite)

**Scope**:
- Add `HEAVY_SUBFOLDERS = ['recordings', 'recording-shadows', 'final']` constant + `recordings/-chapters/` nested-glob handled in walk.
- New util `getStorageTree(projectCode)` returns:
  ```ts
  {
    state: 'active' | 'held' | 'archived',
    nodes: TreeNode[], // hierarchical, each with { name, path, sizeBytes, classification: 'heavy'|'light', location: 'local'|'holding'|'published' }
    sizes: { localTotal, heavyTotal, lightTotal, heldTotal, archivedTotal },
    paths: { local, holding, published }
  }
  ```
- Endpoint `GET /api/projects/:code/storage-tree` returns the above.
- Endpoint `POST /api/projects/:code/hold` — rsync HEAVY subfolders to `youtube-HOLDING/<brand>/<code>/`, then delete the same subfolders from local. Light files + folder shell remain.
- Endpoint `POST /api/projects/:code/restore-held` — rsync from HOLDING back to local. T7 copy stays (caller decides whether to clear it via existing `DELETE /holding`).
- Endpoint `POST /api/projects/:code/archive` — rsync entire local folder to `youtube-PUBLISHED/<brand>/<code>/`, verify, then delete local folder entirely.
- Endpoint `POST /api/projects/:code/unarchive` — rsync entire PUBLISHED folder back to local; T7 copy stays.
- All endpoints re-derive state server-side, return structured `{ ok, error, newState }`.
- Reuse existing `holdExcludeArgs()` (excludes `-trash/`, `s3-staging/`, `.DS_Store`, `._*`) on every rsync.
- Relay-blocked guard: if any relay subfolder is non-empty, refuse Hold and Archive with a clear error.

**Done when**:
- All 5 endpoints exist with route tests covering happy-path, relay-blocked, T7-not-mounted, invalid-state (e.g. Archive when already Archived).
- `getStorageTree` returns correct classification for a fixture project with mixed subfolders.
- Typecheck passes; existing tests don't regress.

### WU2 — StoragePanel component

**Type**: Frontend (parallel after WU1)

**Scope**:
- New `client/src/components/shared/StoragePanel.tsx`. Per-active-project (no project-list).
- Reads `useStorageTree(projectCode)` hook backed by `GET /storage-tree`.
- Renders the panel shape above. Tree is collapsible per-folder; default top-level expanded.
- Heavy nodes: 🟠 marker + `(heavy)` label. Light: ⚪ + `(light)`. Held heavy nodes: greyed + `on T7`.
- State header: `● Active` / `● Held` / `● Archived` with warm linen pill colours.
- Action button rules:
  - **Active** → `Hold heavy files (X GB → T7)` (primary, no confirm) + `Archive everything (Y GB → T7)` (red-text, confirm popover)
  - **Held** → `Restore heavy files (X GB ← T7)` (primary, no confirm) + `Archive everything` shortcut (red-text, confirm)
  - **Archived** → empty action area; bottom-of-panel `Unarchive →` link (confirm popover)
- Confirm popover for Archive: "Archive c36? 2.8 GB will be moved to T7 PUBLISHED and the local folder will be deleted." Confirm / Cancel.
- Confirm popover for Unarchive: "Unarchive c36? 2.8 GB will be copied back to local." Confirm / Cancel.
- All mutations invalidate `storage-tree`, `archive-inventory`, `hold-status`, `disk-size` query keys (full set documented in AGENTS.md).
- Disabled states with inline reason: T7 not mounted, relay non-empty.

**Done when**:
- Three states render correctly against fixture data.
- All four mutations (Hold, Restore-held, Archive, Unarchive) work end-to-end.
- Unit tests for state→buttons mapping + tree rendering with mixed classifications.
- Component < 500 lines (extract `StorageTree`, `StorageActions`, `StorageStateHeader` sub-components).

### WU3 — Sidebar wiring + deep-links

**Type**: Frontend (parallel after WU1)

**Scope**:
- Add `Storage` entry to ManagePanel ToolsSidebar under STORAGE group (replaces or sits alongside `SSD Status` — see open question).
- Wire `StoragePanel` to render when `activeTool === 'storage'`.
- T7 header pill (`SsdIndicator`): change `onNavigateToArchive` → `onNavigateToStorage`. Click navigates to Manage > Storage tool for the active project.
- Projects table T7 badge: click navigates to Manage > Storage tool for THAT project (sets active project + opens Storage tool).
- `App.tsx`: extend `navigateToManage(tool, opts)` to support `{ tool: 'storage', projectCode?: string }`.

⚠ **OPEN QUESTION 4** — Does Storage tool replace the existing `SSD Status` read-only tool, or sit alongside it?
- (a) Replace — Storage IS the SSD UI now; remove SSD Status.
- (b) Alongside — keep SSD Status as the at-a-glance mount/disk view; Storage is the action surface.
- Default: **(a) Replace** — one home for storage. SSD mount status becomes a small line inside the Storage panel.

**Done when**:
- T7 pill click lands on Storage panel for active project.
- Projects table T7 badge click lands on Storage panel for that specific project.
- Sidebar shows `Storage` (and either removes or keeps `SSD Status` per OQ4).

### WU4 — Remove old ArchiveTool

**Type**: Frontend cleanup (parallel after WU1; can land last)

**Scope**:
- Delete: `client/src/components/shared/ArchiveTool.tsx`, `client/src/components/shared/archiveToolUtils.ts`, `client/src/test/ArchiveTool.test.tsx`, `client/src/test/archiveToolUtils.test.ts`.
- Remove `Archive` entry from ManagePanel ToolsSidebar.
- Remove `archiveMountKey`, `manageArchiveFilter`, `manageArchiveSearch` state from `App.tsx` and `ManagePanel.tsx`.
- Remove `initialArchiveFilter` / `initialArchiveSearch` props.
- Keep server endpoints `archive-inventory`, `batch-offload`, `batch-delete-local` — they may power future Projects-page filter chips. Just unwire from any UI consumer.
- Keep `useArchiveInventory`, `useBatchOffload`, `useBatchDeleteLocal` hooks but mark with `@deprecated` JSDoc + reason. Or delete if no consumer. (Decision: delete unless explicit follow-up planned.)

**Done when**:
- No reference to `ArchiveTool` anywhere in client.
- Manage sidebar no longer shows `Archive`.
- No regressions in unrelated tests.

### WU5 — Activity log + Recent Activity feed

**Type**: Backend + frontend (parallel after WU1)

**Scope**:
- Reuse existing `logRelayActivity` pattern from `relay.ts`. New log file: `~/.flihub/storage-activity.jsonl` (or in project state — decide in WU1).
- Log entries: `{ projectCode, action: 'hold'|'restore-held'|'archive'|'unarchive', sizeBytes, timestamp }`.
- Endpoint `GET /api/projects/:code/storage-activity?limit=10` returns recent entries for the project.
- Hook `useStorageActivity(projectCode)`.
- Render in StoragePanel below the tree as a collapsed section (default open). Format: `• Held — 7 Apr 2026 · 2.7 GB`.

**Done when**:
- Each successful mutation appends a log entry.
- Recent Activity shows the project's last N entries.
- Survives server restart (file-based persistence).

## In Progress
(coordinator moves items here with [~])

## Complete
(coordinator moves items here with [x], adds outcome notes)

## Failed / Needs Retry
(coordinator moves items here with [!], adds failure reason)

## Patches Applied — After Wave A Delivery Review

Delivery review verdict: FAIL (2 critical, 9 high). 11 patches applied in one pass. Server tests 580→591 (+11). All quality gates green.

| # | Finding | Source | Action | Status |
|---|---|---|---|---|
| P1 | Archive silently merges into existing PUBLISHED | DVR-EC-001 | Refuse archive if publishedDir has content (409) | [x] |
| P2 | Unarchive silently merges into existing local | DVR-EC-002 | Refuse unarchive if localDir exists (409) | [x] |
| P3 | Hold orphans HOLDING on partial failure | DVR-BH-001 | Two-pass: stage+verify ALL heavy subs, then delete all locals | [x] |
| P4 | Archive verify is fileCount-only | DVR-BH-002 | New `verifyDirsMatch(src, dest)` util (count+bytes); used by archive + hold pass-1 | [x] |
| P5 | `{ok}` envelope diverges from project `{success}` | DVR-AR-001 | Renamed `ok→success` (flat shape, not `{data:…}`) | [x] |
| P6 | `spawnAsync` duplicated verbatim | DVR-CQ-001, AR-002 | Exported from `holdUtils.ts`; duplicate removed | [x] |
| P7 | SSD probe in storageTree was no-op | DVR-BH-005, CQ-004, AR-003 | Delegates to `checkSsdMounted`; shim deleted | [x] |
| P8 | `degraded: true` not enforced by mutations | DVR-EC-019, AA-003 | All 4 mutations return 409 when degraded | [x] |
| P9 | Hold with zero heavy content lies about newState | DVR-BH-003, EC-017 | Refuse 400 with `newState: 'active'` | [x] |
| P10 | Verify-failure branch had zero coverage | DVR-UT-002 | Archive test truncates bytes; asserts 500 + local preserved. Hold pass-1 test asserts all locals preserved on mid-seq failure | [x] |
| P11 | rsync `--exclude` args not asserted | DVR-UT-001 | New `captureRsyncCalls` spy; 4 tests assert every `holdExcludeArgs()` pattern per mutation | [x] |

**Deferred to Wave B/later** (documented, not blocking):
- Concurrency mutex (DVR-EC-013, EC-014, BH-010) — single-user app; revisit post-MVP
- Socket emits + disk-cache invalidation on storage mutations (DVR-AR-006) — wire in WU3 when UI needs it
- Brand derivation / publishedPath template (DVR-BH-008, AA-005) — WU3 config wiring
- `.DS_Store`-only relay blocking (DVR-EC-011) — filter hidden files in relay-bytes probe
- Held→Archive atomic shortcut (DVR-AA-002) — UI chain in WU2
- `-chapters/` nested heavy test (DVR-UT-004, AA-001) — add in WU2
- Safety gate moved to top of archive handler (DVR-BH-011), symlink handling (DVR-BH-012)

## Open Questions Summary

| # | Question | Default | Decide before |
|---|---|---|---|
| 1 | Heavy classification — subfolder allowlist vs size threshold? | Subfolder allowlist (recordings, recording-shadows, final, -chapters) | WU1 |
| 2 | Keep `Unarchive` action? | Yes (small, bottom-of-panel) | WU2 |
| 3 | Keep Held → Archive shortcut? | Yes | WU2 |
| 4 | Storage tool replaces or sits alongside `SSD Status`? | Replace | WU3 |

## Notes & Decisions

- **Why one panel, not two pages**: Hold and Archive are mutually exclusive states, and the user toggles between them frequently. Two pages would force the user to know which page to open before they know which verb they want. One panel reads the current state and shows only the relevant verbs.
- **Why subfolder allowlist not size threshold**: Predictable. The user can look at the project and know "these folders go to T7, those stay". Size threshold is opaque and changes per file.
- **Why no bucket folders in PUBLISHED**: DAM owns range-bucket shuffling. FliHub writes flat. A future tool can do bucket reorganisation manually if/when needed.
- **Why FAILS is ignored**: Once-a-year disk-cleanup chore, not a workflow. Manual delete in Finder is fine until it isn't.
- **Why we keep `archive-inventory` server-side**: Future Projects-page filter chips (`Local only` / `Held` / `Archived` / `Reclaimable`) will reuse it. Cheap to keep, expensive to rebuild.
- **What we drop from prior campaign**: the multi-project list UI, batch UI, all related state, deep-link query params. All committed work in `archive-tool` campaign — see `docs/planning/archive-tool/IMPLEMENTATION_PLAN.md` for what was built.
- **Naming locked in**: `Storage` (tool name), `Hold` (verb), `Archive` (verb), `Restore` (verb back from Held), `Unarchive` (verb back from Archived). State labels: `Active` / `Held` / `Archived`.

## Patches Applied — After Wave B Delivery Review

6-dimension review (BH/EC/AA/AR/CQ/UT) returned CONDITIONAL PASS. All 7 patches applied in a single pass before commit.

| # | Patch | Source | Action |
|---|---|---|---|
| P1 | Held→Archive chain not atomic (restore left HOLDING orphan → degraded) | DVR-BH-001, DVR-EC-003 | New server `POST /api/projects/:code/held-archive` atomic endpoint (restore + verify + rsync + verify + delete local + delete HOLDING). New `useHeldArchiveProject` client mutation. `StorageActivityAction` union extended with `'held-archive'`. |
| P2 | Deep-link project-switch race (fire-and-forget `updateConfig.mutate`) | DVR-EC-001 | `navigateToManage` is now async; awaits `updateConfig.mutateAsync` before flipping tool; surfaces toast on failure; dedupes concurrent switches via ref. StoragePanel renders "Switching project…" gate when projectCode ≠ activeProject. |
| P3 | Dead `StorageTool.tsx` still exported with stale ArchiveTool comment | DVR-AR-001, DVR-AA-009, DVR-BH-003, DVR-CQ-001 | Deleted component, removed barrel export, updated stale comment in `useRelayApi.ts`. |
| P4 | Activity-log invalidation uses raw literal tuple | DVR-EC-002, DVR-AR-002, DVR-BH-005 | Added `QUERY_KEYS.storageActivityBase(code)`; `useInvalidateProjectStorage` now sources prefix from factory. |
| P5 | Route-level mutation → activity-log side effect untested | DVR-UT-003, DVR-UT-004 | 5 happy-path tests assert exactly-one entry; 3 refusal tests assert empty log. |
| P6 | `useInvalidateProjectStorage` 6-key contract untested | DVR-UT-002 | New `client/src/test/useInvalidateProjectStorage.test.tsx` — pins all keys + total call count. |
| P7 | `await logActivity` inside route try/catch contradicted "best-effort" comment | DVR-UT-005 | Each route wraps `logActivity` in its own try/catch → console.warn only; test with `appendStorageActivity` rejection confirms 200 still returned. |

**Post-patch gates**: client 236/16 ✓ · server 1230+2skip/46 ✓ · shared 80/2 ✓ · both builds ✓
