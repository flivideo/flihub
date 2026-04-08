# Assessment — archive-offload (B064)

**Completed**: 2026-04-08
**Delivery review**: appydave:delivery-review (6/6 dimensions)
**Final verdict**: CONDITIONAL PASS → patched to PASS

---

## Results

- **8/8 work units complete**
- **1006 server tests pass** (up from 974 — +32 including 9 route tests + 7 holdUtils tests)
- **Client build clean** — 4 pre-existing B062 failures unrelated to B064
- **16 new tests added** in patch round

---

## What Shipped

B064 adds full SSD hold/restore workflow to FliHub:

- **`server/src/utils/holdUtils.ts`** — 7 functions: checkSsdMounted, verifyHoldingMatch, getHoldStatus, holdProject, restoreFromHolding, deleteLocalProject, deleteHoldingProject. 5-gate safety chain on both delete operations. spawn() array args throughout.
- **`server/src/routes/hold.ts`** — 6 endpoints: GET /hold/status, POST /hold (+ dry-run), POST /hold/verify, DELETE /local, POST /hold/restore, DELETE /holding. All require confirmCode for destructive operations.
- **`client/src/hooks/useHoldApi.ts`** — 6 React Query hooks. Correct cache invalidation per operation.
- **`client/src/components/HoldDeleteModal.tsx`** — Typed confirmation modal, both local/holding variants. canConfirm guards: verification.match + typed code + !isLoading.
- **`client/src/components/ProjectDrawer.tsx`** — SSD Hold section with 9 UI states. Modal closes in onSuccess only. Auto-verify in useEffect (not render body).
- **`client/src/components/ProjectsPanel.tsx`** — HoldBadge per-row: amber T7⚠ for 'both', muted T7 for 'holding-only'.
- **`shared/types.ts`** — HoldLocation, HoldVerification, HoldStatus, HoldOperationResult. DiskSizeData stubs renamed archivedAt→heldAt, archivePath→holdingPath.
- **`server/src/config/configManager.ts`** — holdingPath wired into save/load.

---

## Delivery Review Findings & Dispositions

### Fixed in patch round (8 patches)

| Finding | Fix |
|---------|-----|
| DVR-EC-005 / DVR-BH-005 (REJECT) — path traversal via code param | Added `/[/\\.]/.test(code)` guard to all 6 route handlers |
| DVR-BH-001 / DVR-AR-001 / DVR-CQ-002 — mutation in render body | Moved verifyHolding.mutate into useEffect |
| DVR-BH-002 — "Cancel hold" dead-end in mismatch state | Removed button; added guidance note |
| DVR-BH-008 — modal closes before mutation resolves | onSuccess callback closes modal, not onConfirm |
| DVR-CQ-003 / DVR-BH-009 — targetPath shows wrong path | target='local' now passes project.path |
| DVR-EC-003 — zero-file project verifies as match:true | Both-zero early-returns match:false |
| DVR-EC-001 — cache updated on unverified hold | updateDiskCacheHoldData only on result.success && verification.match |
| DVR-EC-002 — trailing slash corrupts path.basename | path.normalize() wrapper in holdProject + getHoldStatus |
| DVR-UT-007 — zero HTTP-level tests for DELETE routes | Added holdRoutes.test.ts with 9 tests |
| DVR-UT-002/003 — getHoldStatus uncovered | Added 6 getHoldStatus tests + missing localDir test |

### Deferred to next campaign

| Finding | Reason |
|---------|--------|
| DVR-AR-002 — N API calls per row (HoldBadge) | Needs bulk /hold/status-all endpoint — future B065 |
| DVR-BH-004 — rsync without --checksum | Performance tradeoff on large video files; acceptable for now |
| DVR-AR-003 — cache mutation leaky abstraction | extracting diskCache module is a larger refactor |
| DVR-AR-004 — heldAt lost on server restart | Sidecar file persistence — future work |
| DVR-EC-004 — same-volume rsync frees no space | Config hygiene issue; add warning not block |
| DVR-EC-006/BH-010 — checkSsdMounted checks wrong level | mount-point detection edge case |
| DVR-EC-007 — concurrent hold ops, no mutex | Low likelihood; add if users report |
| DVR-UT-004 — rsync integration test skipped | CI environment constraint |
| DVR-AA-001 — shared/package.json missing build script | AC was incorrect; shared has no compile step |
| DVR-AA-004 — 4 pre-existing test failures | B062 debt: "Thumbnails"→"Thumbs" label rename |

---

## Learnings

### Application
- `both` is always transitional — drive the UI state machine toward resolution aggressively
- Mutations in JSX render bodies will appear to work (isPending guard prevents loops) but violate React rendering contract and fail in Strict Mode — always use useEffect
- `path.basename` on a trailing-slash path returns `''` on POSIX — always `path.normalize()` before `path.basename()`
- Both-zero in verifyHoldingMatch is inconclusive, not a positive match — empty projects need protection too
- `confirmCode` in DELETE body requires explicit Content-Type: application/json — fetchApi sets this; document the assumption
- Cache mutation across route modules: export named functions, not the Map itself

### Loop meta-learnings
- 5 waves for 8 work units worked well — dependency chain (types→utils→routes→hooks→UI) maps naturally to waves
- Delivery review caught a REJECT issue (path traversal) that the campaign agents didn't flag — the review investment paid off immediately
- Client+server parallel patch agents saved one full round-trip
- Pre-existing test failures from prior campaigns create false noise on `npm test` — fix them in a dedicated cleanup pass (B065 candidate)

---

## Efficiency Report
- Average model match: good (Sonnet throughout, appropriate for this work)
- AGENTS.md: ~130 lines at start, appropriate
- Prompt clarity: 0 clarification loops across 5 waves
- Biggest efficiency gain: reading relay.ts before writing holdUtils — spawn pattern transferred directly
- Biggest efficiency loss: IIFE pattern in drawer introduced 3 review findings that needed a patch round
- Change before next campaign: extract complex stateful UI sections into sub-components from the start

---

## Post-Campaign Polish (B065 — same session, after B064 shipped)

Immediately after B064 merged, a follow-on polish pass fixed bugs surfaced by first real use and added UX improvements:

### Bugs fixed
- **Response unwrap bug** — `useHoldStatus` was returning the `{ success, data }` wrapper as the query result; `holdStatus.data.ssdMounted` was always `undefined` → "SSD not available" even with T7 connected. Fix: added `.then(res => res.data)` unwrap.
- **Code validation regex** — `/[/\\.]/.test(code)` rejected project codes with dots (e.g. `b75-...-claude-4.5`), causing 400 → undefined query data → wrong UI state. Fix: `/[/\\]/.test(code) || code.includes('..')`.
- **Global SSD status endpoint** — added `GET /api/projects/ssd-status` (no project code required) for the header indicator.

### UX changes
- **Terminology**: "SSD Hold" → "SSD Offload", "Hold on SSD" → "Offload to SSD", "Dry Run" → "Preview" (shows bytes + destination path)
- **SSD indicator in app header** — `SsdIndicator` component, green dot when T7 mounted, faint when not; click navigates to Projects tab
- **Project count inline** — moved "76 of 76" count into the filter bar row (no separate row)
- **Disk column totals** — aligned `tfoot` + `thead` second row inside the table, each total directly under its column (REC, TRASH, SHADOWS, OTHER, R-REC, R-1ST, R-2ND, TOTAL); totals update as filters change

### Not yet tested by David
The end-to-end hold/delete flow (Offload to SSD → verify → Delete Local, and the restore path) has not been exercised against real data. The API is correct (confirmed by curl), the UI states are wired, but David has not run a real offload operation yet. This will be tested in a future session when David is ready to actually move projects to the T7.

## Deferred Backlog Items (B066 candidates)

- B066a — HoldBadge bulk status endpoint (N→1 API calls for project list)
- B066b — Fix 4 pre-existing test failures from B062 (ProjectDrawer "Thumbnails", ProjectListToolbar search)
- B066c — heldAt persistence across server restarts (sidecar file or config)
- B066d — rsync --checksum option (configurable, off by default)
- B066e — End-to-end real offload test (David to run when T7 workflow is ready)
