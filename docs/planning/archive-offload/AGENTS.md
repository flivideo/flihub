# AGENTS.md — Project Archive Offload (B064)

**Project**: FliHub — video recording workflow management tool
**Campaign**: archive-offload (B064)
**Stack**: TypeScript monorepo — Express server + React 19 client + shared types
**Inherits from**: `docs/planning/AGENTS.md` (baseline) — read that file for full conventions

---

## Campaign Goal

Add the ability to offload (hold) a project from local NVMe to the external SSD T7 HOLDING area, and restore it back. The feature lives in the ProjectDetailDrawer with relay-blocking logic. Projects with active relay files cannot be offloaded.

**Read MENTAL-MODEL.md first** — it explains the four-location storage model, the HOLDING vs PUBLISHED distinction, and why relay blocks offload.

**Key design rules**:
- FliHub writes to `youtube-HOLDING` (flat, no range folders). FliHub never writes to `youtube-PUBLISHED`.
- The flat structure in HOLDING signals "parked temporarily". Range-bucketed structure in PUBLISHED signals "done".
- **Offloading only frees space when the local copy is deleted.** Holding without deleting local doubles storage usage and solves nothing. The UI must drive the user to complete the full flow.
- `'both'` (local + HOLDING) is a transitional state, not a resting state. It must be visually distinct and actionable.

---

## Build & Run Commands

```bash
npm run build -w shared    # ALWAYS after changing shared/types.ts
npm run build -w server    # TypeScript check
npm run build -w client    # TypeScript + Vite build check
npm test                   # All tests must pass
lsof -i :5101 | grep LISTEN  # Check if server is already running
```

---

## Key Paths for This Campaign

| Path | Purpose |
|------|---------|
| `shared/types.ts` | Add HoldStatus, HoldVerification, HoldOperationResult types; extend DiskSizeData |
| `server/src/utils/holdUtils.ts` | NEW — checkSsdMounted, getHoldStatus, holdProject, verifyHoldingMatch, restoreFromHolding, deleteLocalProject, deleteHoldingProject |
| `server/src/routes/hold.ts` | NEW — all hold endpoints |
| `server/src/routes/index.ts` | Register hold router |
| `client/src/hooks/useHoldApi.ts` | NEW — all hold hooks |
| `client/src/hooks/useApi.ts` | Barrel re-export |
| `client/src/components/ProjectDetailDrawer.tsx` | Add Hold section with all states |
| `client/src/components/HoldDeleteModal.tsx` | NEW — confirmation modal for both delete operations |
| `client/src/components/ProjectsPanel.tsx` | Add HOLDING state badge |

## Read These Before Writing Code

**Before writing `holdUtils.ts`**: Read `server/src/routes/relay.ts` — the relay push/collect operations already use `child_process.spawn` with array args to rsync. That is the exact pattern to follow. Do not invent a new approach.

**Before writing hold routes**: Read `server/src/routes/projects.ts` — the in-memory `diskSizeCache` map is the template for how `heldAt` and `holdingPath` should be stored and invalidated.

**Before touching `shared/types.ts`**: Grep for `archivedAt` and `archivePath` across the entire codebase first (`grep -r "archivedAt\|archivePath" --include="*.ts"`). The B062 disk observability campaign added these as stubs in `DiskSizeData`. This campaign renames them to `heldAt` and `holdingPath`. Find every usage before renaming — stale references cause silent TypeScript failures if shared is rebuilt before server/client.

---

## The Full Lifecycle — Both Directions

The hold system has two symmetric phases. Each phase ends with a delete. Each delete is gated on verified matching files.

### Phase 1 — Offload (local → HOLDING)

```
Step 1: rsync local → HOLDING       [Hold on SSD button]
Step 2: verify files match          [auto-run after rsync]
Step 3: delete local copy           [only enabled after verify passes]
```

Result: `holding-only` — space freed on local NVMe.

### Phase 2 — Restore (HOLDING → local)

```
Step 1: rsync HOLDING → local       [Restore from SSD button]
Step 2: verify files match          [auto-run after rsync]
Step 3: delete HOLDING copy         [only enabled after verify passes]
```

Result: `local-only` — HOLDING cleaned up, project back on local.

### The Abandoned Mid-Flow State

If the user completes Step 1 of either phase and then restarts the app without completing Steps 2–3, the project ends up in `location: 'both'` with no active flow. The app must detect and surface this on next load.

On any scan or drawer open where `location === 'both'`:
- Run verification automatically (compare file counts + sizes)
- Show recovery prompt in the drawer — do not silently ignore it
- User must choose: complete the offload, cancel it, or explicitly defer

---

## Data Shapes — Read These Before Writing Code

### Types to add to `shared/types.ts`

```typescript
// B064: Location states — 'both' is always transitional, never a final resting state
export type HoldLocation = 'local-only' | 'holding-only' | 'both' | 'unknown';

// B064: File comparison result — run before any delete operation
export interface HoldVerification {
  localFiles: number;
  holdingFiles: number;
  localBytes: number;
  holdingBytes: number;
  match: boolean;  // true only if both counts AND sizes match exactly
}

// B064: Full hold status for a project
export interface HoldStatus {
  location: HoldLocation;
  holdingPath?: string;          // Full path in youtube-HOLDING if copy exists
  heldAt?: string;               // ISO timestamp of last rsync to HOLDING
  relayBlocked: boolean;         // true if relay has files — hard block on offload
  relayBytes: number;            // rRec + r1st + r2nd bytes (0 if no relay)
  ssdMounted: boolean;           // Is /Volumes/T7 (or holdingPath parent) accessible?
  verification?: HoldVerification; // Only populated when location === 'both'
}

// B064: Result of any hold operation (rsync, delete, verify)
export interface HoldOperationResult {
  success: boolean;
  message: string;
  holdingPath?: string;
  verification?: HoldVerification;
  error?: string;
}
```

### Extend DiskSizeData

```typescript
// Rename the B062 stubs to match HOLDING semantics:
heldAt?: string;        // ISO timestamp when last offloaded to HOLDING SSD
holdingPath?: string;   // Full flat path in youtube-HOLDING
// archivePath/archivedAt remain for DAM cross-reference — FliHub does not write them
```

---

## server/src/utils/holdUtils.ts — What to Build

### checkSsdMounted(holdingRoot: string): Promise<boolean>
- Check `fs.access(path.dirname(holdingRoot))` — checks the T7 mount point, not the brand subfolder (which may not exist yet)
- Never throws — returns false on any error

### verifyHoldingMatch(localDir: string, holdingDir: string): Promise<HoldVerification>
- Count files and sum bytes in both directories recursively (reuse getDirSize pattern from diskUtils)
- Returns `HoldVerification` with counts, bytes, and `match: localFiles === holdingFiles && localBytes === holdingBytes`
- Never throws — returns `{ match: false, ... }` on any filesystem error
- **This is the gate for all delete operations.** `match: false` means delete button stays disabled.

### getHoldStatus(projectCode: string, projectDir: string, relayDir: string | null, holdingRoot: string): Promise<HoldStatus>
- Computes holdingPath: `holdingRoot + "/" + basename(projectDir)` (flat)
- Checks: SSD mounted, local exists, HOLDING exists, relay bytes
- If `location === 'both'`: runs `verifyHoldingMatch()` and includes result
- Returns full `HoldStatus`

### holdProject(projectDir: string, holdingRoot: string): Promise<HoldOperationResult>
- Destination: `holdingRoot + "/" + basename(projectDir)` — **flat, no range folder**
- `fs.mkdir(holdingRoot, { recursive: true })` — creates brand subfolder if needed
- `child_process.spawn('rsync', ['-a', projectDir + '/', destDir + '/'])` — array args, no shell
- Returns result with `holdingPath`

### restoreFromHolding(holdingDir: string, localDir: string): Promise<HoldOperationResult>
- `fs.mkdir(localDir, { recursive: true })` — creates local dir if project was fully deleted
- `child_process.spawn('rsync', ['-a', holdingDir + '/', localDir + '/'])` — array args
- Returns result

### deleteLocalProject(projectDir: string, projectsRoot: string): Promise<HoldOperationResult>
**5-gate safety chain — all must pass before `fs.rm()` is called:**
1. Resolve both paths to absolute (`path.resolve`)
2. Resolved `projectDir` must start with resolved `projectsRoot + path.sep`
3. Resolved `projectDir` must not equal resolved `projectsRoot`
4. HOLDING copy must exist (`fs.access(holdingDir)`) — **called from route, which has already verified**
5. Verification must have passed — **route passes `verified: true` only after `verifyHoldingMatch().match === true`**
- `fs.rm(projectDir, { recursive: true })`

### deleteHoldingProject(holdingDir: string, holdingRoot: string): Promise<HoldOperationResult>
**Symmetric 5-gate safety chain:**
1. Resolve both paths to absolute
2. Resolved `holdingDir` must start with resolved `holdingRoot + path.sep`
3. Resolved `holdingDir` must not equal resolved `holdingRoot`
4. Local copy must exist — **verified by route before calling**
5. Verification must have passed — **route passes `verified: true` only after match**
- `fs.rm(holdingDir, { recursive: true })`

---

## server/src/routes/hold.ts — Endpoints

Register as `/api/projects/:code/hold/*` and `/api/projects/:code/holding` in `routes/index.ts`.

### GET /api/projects/:code/hold/status
- Calls `getHoldStatus()` — includes verification if `location === 'both'`
- Returns `{ success: true, data: HoldStatus }`

### POST /api/projects/:code/hold
- Body: `{ dryRun?: boolean }`
- Validates: SSD mounted, relay not blocked (hard 400 if relayBlocked)
- If `dryRun`: returns `{ holdingPath, localBytes }`, no transfer
- Otherwise: runs `holdProject()`, then runs `verifyHoldingMatch()` automatically
- Updates disk cache with `heldAt` + `holdingPath`
- Returns `HoldOperationResult` with `verification` included
- **Does NOT delete local** — that is a separate endpoint requiring explicit user action

### POST /api/projects/:code/hold/verify
- Runs `verifyHoldingMatch(localDir, holdingDir)` on demand
- Used by client after app restart to check abandoned mid-flow state
- Returns `{ success: true, verification: HoldVerification }`

### DELETE /api/projects/:code/local
**Danger endpoint — deletes local project directory.**
Extra checks before calling `deleteLocalProject()`:
1. `projectDir` inside `config.projectsRootDirectory` (safety — reject otherwise)
2. HOLDING copy exists (`fs.access`)
3. Run `verifyHoldingMatch()` — reject if `match === false`
4. Body must include `{ confirmCode: projectCode }` — exact match required
- Invalidates disk cache + project stats cache
- Returns `HoldOperationResult`

### POST /api/projects/:code/hold/restore
- Validates: SSD mounted, holdingPath exists
- Runs `restoreFromHolding(holdingDir, localDir)`
- Then runs `verifyHoldingMatch()` automatically
- Returns `HoldOperationResult` with `verification` included
- **Does NOT delete HOLDING copy** — separate endpoint

### DELETE /api/projects/:code/holding
**Danger endpoint — deletes HOLDING copy.**
Extra checks before calling `deleteHoldingProject()`:
1. `holdingDir` inside `config.holdingPath` (safety)
2. Local project must exist (`fs.access`)
3. Run `verifyHoldingMatch()` — reject if `match === false`
4. Body must include `{ confirmCode: projectCode }` — exact match required
- Returns `HoldOperationResult`

---

## client/src/hooks/useHoldApi.ts — What to Build

```typescript
// B064: Hold status (includes verification when location === 'both')
export function useHoldStatus(code: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.holdStatus(code || ''),
    queryFn: () => fetchApi<{ success: boolean; data: HoldStatus }>(`/api/projects/${code}/hold/status`),
    enabled: !!code,
    staleTime: 30_000,
  });
}

// B064: Step 1 of offload — rsync to HOLDING (returns with verification result)
export function useHoldProject() { ... invalidates holdStatus + projectDisk }

// B064: On-demand verify — used on app restart to check abandoned state
export function useVerifyHolding() { ... invalidates holdStatus }

// B064: Delete local — only callable after verification.match === true
export function useDeleteLocal() { ... invalidates holdStatus + projectStats }

// B064: Step 1 of restore — rsync from HOLDING (returns with verification result)
export function useRestoreFromHolding() { ... invalidates holdStatus + projectDisk }

// B064: Delete HOLDING copy — only callable after verification.match === true
export function useDeleteHolding() { ... invalidates holdStatus }
```

Add to `QUERY_KEYS`:
```typescript
holdStatus: (code: string) => ['hold-status', code] as const,
```

---

## ProjectDetailDrawer — Hold Section

Add a "SSD Hold" section at the bottom of the drawer. Use "Hold" as the verb — not "Archive".

### State Machine

```
local-only           → [Hold on SSD]  [Dry Run]
both (unverified)    → amber — running verification...
both (verified ✓)    → amber — [Delete Local — X GB freed]  [Cancel: Delete HOLDING copy]
both (verified ✗)    → red   — "Files don't match — cannot delete. Re-run rsync?"
holding-only         → neutral — [Restore from SSD]
relay-blocked        → amber warning — no buttons
ssd-not-mounted      → muted — no buttons
loading              → spinner
```

### Layouts per state

**local-only (normal):**
```
│ SSD Hold                                      │
│ Location: Local only                          │
│ [Hold on SSD]  [Dry Run ▸]                    │
```

**both — unverified (just after rsync or after app restart):**
```
│ SSD Hold                                      │
│ ⚠️  Offload incomplete — space not freed yet  │
│ Verifying files...  ◌                         │
```

**both — verified match:**
```
│ SSD Hold                                      │
│ ⚠️  Offload incomplete — space not freed yet  │
│ HOLDING: 47 files, 4.2 GB  ✓ matches local   │
│ [Free 4.2 GB — Delete Local]                  │  ← primary action
│ [Cancel hold — Remove SSD copy]               │  ← secondary
```

**both — verified mismatch:**
```
│ SSD Hold                                      │
│ ✗ Files don't match — cannot delete local     │
│ Local: 47 files  HOLDING: 45 files  ← mismatch│
│ [Re-run rsync]  [Cancel hold — Remove SSD copy]│
```

**holding-only (offload complete):**
```
│ SSD Hold                                      │
│ Location: HOLDING SSD (local deleted)         │
│ Held: 3 days ago                              │
│ [Restore from SSD]                            │
```

**After restore — both — verified match (symmetric):**
```
│ SSD Hold                                      │
│ ⚠️  Restore incomplete — HOLDING copy still exists │
│ Local: 47 files, 4.2 GB  ✓ matches HOLDING    │
│ [Remove from HOLDING]                         │  ← primary
│ [Keep both for now]                           │  ← secondary (defer)
```

### Delete Local modal
- Shows: folder name, bytes freed, HOLDING path, "Local copy will be permanently deleted"
- Input: type project code to confirm
- Confirm button disabled until code matches exactly
- "HOLDING verified ✓ — X files, X GB" shown above input

### Delete HOLDING modal (symmetric)
- Shows: HOLDING path, bytes freed from SSD, "HOLDING copy will be permanently deleted"
- Input: type project code to confirm
- "Local copy verified ✓ — X files, X GB" shown above input

---

## ProjectsPanel — Hold State Badge

In the project list row, after the relay badges:

| State | Badge | Colour | Tooltip |
|-------|-------|--------|---------|
| `both` | `T7 ⚠` | amber | "Offload incomplete — space not freed" |
| `holding-only` | `T7` | muted | "On HOLDING SSD — local deleted" |

No badge for `local-only`. Amber for `both` because it's unfinished, not a resting state.

---

## Testing Strategy

**Use temp directories for filesystem operations — not mocks.** Node's `os.tmpdir()` + `fs.mkdtemp()` creates real isolated directories. These work identically in CI.

```typescript
// Standard fixture setup
const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'flihub-hold-'))
const projectsRoot = path.join(tmpRoot, 'projects')
const holdingRoot = path.join(tmpRoot, 'holding')
const projectDir = path.join(projectsRoot, 'b72-test-project')
await fs.mkdir(path.join(projectDir, 'recordings'), { recursive: true })
await fs.writeFile(path.join(projectDir, 'recordings', 'clip.txt'), 'fake video data')
// afterEach: fs.rm(tmpRoot, { recursive: true })
```

**Mock only rsync** — verify it's called with the correct args array (no shell string). One integration test should actually run rsync on the temp fixture and verify files landed.

**The critical test suite — `deleteLocalProject` safety chain:**
```typescript
it('allows valid path inside projectsRoot')
it('rejects path outside projectsRoot')          // '/tmp/evil'
it('rejects path equal to projectsRoot')          // exact match
it('rejects path traversal after resolve')        // '../../etc'
it('rejects when verification.match is false')    // mismatch state
```

**Symmetric suite for `deleteHoldingProject`** — same five cases, mirrored.

**`verifyHoldingMatch` tests:**
```typescript
it('returns match:true when files and bytes are identical')
it('returns match:false when file count differs')
it('returns match:false when total bytes differ')
it('returns match:false (not throws) when holdingDir does not exist')
```

---

## Success Criteria

- [ ] `npm run build -w shared` passes
- [ ] `npm run build -w server` passes
- [ ] `npm run build -w client` passes
- [ ] `npm test` exits 0
- [ ] HOLDING destination is flat: `youtube-HOLDING/appydave/b72-project-name/` (no range subfolder)
- [ ] Hold blocked when relay bytes > 0
- [ ] SSD not mounted shows graceful UI
- [ ] Dry run returns destination + size, no transfer
- [ ] rsync result includes `verification` automatically (no separate user step)
- [ ] Delete local requires: HOLDING exists + verify match + confirmCode
- [ ] Delete HOLDING requires: local exists + verify match + confirmCode
- [ ] Restore result includes `verification` automatically
- [ ] `'both'` state detected on app restart and surfaced in drawer with recovery options
- [ ] Amber badge in ProjectsPanel for `'both'` state
- [ ] Neutral badge for `'holding-only'` state
- [ ] FliHub never writes to `youtube-PUBLISHED`
- [ ] All delete safety chains covered by unit tests with temp dirs
- [ ] FR annotation `// B064:` on all new code

---

## Anti-Patterns for This Campaign

- **Never shell-interpolate paths** — `child_process.spawn` with args array always. Project names contain spaces and hyphens.
- **Never delete without verified match** — `verifyHoldingMatch().match` must be `true` before any `fs.rm()`. This applies to both `deleteLocalProject` and `deleteHoldingProject`.
- **Never treat `'both'` as a stable state** — the UI must surface it as unfinished and drive the user to resolve it.
- **Never combine rsync + delete into one button** — they are always separate steps with a verify gate between them.
- **Never hold if relay bytes > 0** — hard block, no bypass.
- **Do not write to `youtube-PUBLISHED`** — DAM's domain. Mixing the two breaks the semantic signal.
- **Do not add range folders to HOLDING** — flat always.
- **Do not auto-hold on stage change** — always explicit user action.
- **Do not mock the filesystem in unit tests** — use temp dirs. Mocks hide the failures that cause data loss.
