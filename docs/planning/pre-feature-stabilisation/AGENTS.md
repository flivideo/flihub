# AGENTS.md — Pre-Feature Stabilisation

**Inherits from**: `docs/planning/AGENTS.md` (project baseline — read that first)
**Campaign**: pre-feature-stabilisation
**Purpose**: Close 4 structural blockers before the next major feature. Corrections only — no new functionality.

---

## Campaign Goal

Fix exactly these 4 things:

1. **B024** — Replace hardcoded `PROJECTS_ROOT` constant across 8 files with `getConfig().projectsRootDirectory`
2. **B025** — Make `writeProjectState` atomic (write to `.tmp`, then `fs.rename`)
3. **B026** — Normalize config access: `assets`, `thumbs`, `system` route factories use `getConfig: () => Config` getter instead of direct object reference
4. **B027** — Guard `swap-chapters` against chapter 99 collision

---

## What NOT To Do

- Do NOT add new tests (that is B028–B031, a separate campaign)
- Do NOT refactor beyond the stated change for each work unit
- Do NOT change any business logic — these are structural corrections only
- Do NOT touch `updateConfig` in `index.ts` — it is intentionally coupled to Socket.io and is out of scope

---

## Build & Run Commands

```bash
npm run build -w server    # must pass clean after every change
npm run build -w client    # should not be affected, but verify
npm test -w server         # must pass (196 tests)
npm test -w shared         # must pass (38 tests)
npm test                   # full suite — 331 tests, zero failures
```

---

## Key Files for This Campaign

```
server/src/utils/projectState.ts          # B025 — writeProjectState (line 76-94)
server/src/routes/manage.ts               # B027 — swap-chapters (line 1110-1269)
server/src/routes/state.ts                # B024 — PROJECTS_ROOT line 31
server/src/routes/video.ts                # B024 — PROJECTS_ROOT line 21
server/src/routes/transcriptions.ts       # B024 — PROJECTS_ROOT line 29
server/src/routes/projects.ts             # B024 — PROJECTS_ROOT line 26
server/src/routes/query/projects.ts       # B024 — PROJECTS_ROOT line 36
server/src/routes/query/transcripts.ts    # B024 — PROJECTS_ROOT line 20 (_getConfig → getConfig)
server/src/utils/projectResolver.ts       # B024 — module-level PROJECTS_ROOT constant
server/src/index.ts                       # B026 — direct-ref factories lines 229/233/238
server/src/routes/assets.ts               # B026 — signature change line 38
server/src/routes/thumbs.ts               # B026 — signature change line 78
server/src/routes/system.ts               # B026 — signature change line 204
```

---

## Precise Fix Patterns

### B025 — Atomic writeProjectState

**Before** (`server/src/utils/projectState.ts` line 93):
```typescript
await fs.writeFile(stateFilePath, JSON.stringify(stateToWrite, null, 2), 'utf-8');
```

**After**:
```typescript
const tmpPath = stateFilePath + '.tmp';
await fs.writeFile(tmpPath, JSON.stringify(stateToWrite, null, 2), 'utf-8');
await fs.rename(tmpPath, stateFilePath);
```

`fs` here is `fs-extra` (already imported). `fs.rename` on the same filesystem is atomic on POSIX (macOS).

---

### B027 — Chapter 99 guard in swap-chapters

Insert this check after line 1160 (`const recordings = allFiles.filter(...)`), before line 1163 (`console.log`):

```typescript
// Guard: chapter 99 is used as staging area — reject if it already has files
const ch99Files = recordings.filter((f) => f.startsWith('99-'));
if (ch99Files.length > 0 && chapter1 !== '99' && chapter2 !== '99') {
  return res.json({
    success: false,
    error: `Chapter 99 is in use (${ch99Files.length} file(s)) — cannot use it as swap staging. Rename chapter 99 files first.`,
  });
}
```

---

### B024 — PROJECTS_ROOT replacement pattern

Every affected file has the same pattern. For route files that already receive `getConfig: () => Config`:

**Before**:
```typescript
const PROJECTS_ROOT = '~/dev/video-projects/v-appydave';
// ... later in handler:
const projectsDir = expandPath(PROJECTS_ROOT);
```

**After** (delete the module-level constant, update each handler):
```typescript
// No module-level constant
// ... in handler:
const config = getConfig();
const projectsDir = expandPath(config.projectsRootDirectory);
```

If the handler already has `const config = getConfig()` at the top, just use that existing variable — don't call `getConfig()` twice.

**Special case — `routes/query/transcripts.ts`**: The factory parameter is named `_getConfig` (leading underscore = "unused"). Rename it to `getConfig` and use it.

**Special case — `utils/projectResolver.ts`**: This utility has no config parameter. Change the exported function signatures:

```typescript
// Before:
export async function resolveProjectCode(codeInput: string): Promise<...>
export async function resolveProjectCodeOrFail(codeInput: string): Promise<...>

// After:
export async function resolveProjectCode(codeInput: string, projectsRootDir: string): Promise<...>
export async function resolveProjectCodeOrFail(codeInput: string, projectsRootDir: string): Promise<...>
```

Inside both functions, replace `expandPath(PROJECTS_ROOT)` with `expandPath(projectsRootDir)`.

All callers of these functions are in route handlers that have `getConfig()`. Update call sites to pass `getConfig().projectsRootDirectory`.

Find all callers:
```bash
grep -rn "resolveProjectCode\|resolveProjectCodeOrFail" server/src/ --include="*.ts" | grep -v "projectResolver.ts"
```

---

### B026 — Config access normalization

**Change in `server/src/index.ts`** (lines 229/233/238):
```typescript
// Before:
const assetRoutes = createAssetRoutes(currentConfig);
const thumbRoutes = createThumbRoutes(currentConfig);
const systemRoutes = createSystemRoutes(currentConfig, watcherManager);

// After:
const assetRoutes = createAssetRoutes(() => currentConfig);
const thumbRoutes = createThumbRoutes(() => currentConfig);
const systemRoutes = createSystemRoutes(() => currentConfig, watcherManager);
```

**Change factory signatures** in each route file:
```typescript
// Before (assets.ts line 38):
export function createAssetRoutes(config: Config): Router {

// After:
export function createAssetRoutes(getConfig: () => Config): Router {
```

Apply same pattern to `thumbs.ts` (line 78) and `system.ts` (line 204).

**Inside each route file**: replace all direct `config.X` field accesses with `getConfig().X` or `const config = getConfig()` at the top of each handler. Do NOT use `getConfig()` at module scope — only inside request handlers.

**Also fix in `index.ts` line 364** (inline hardcoded path):
```typescript
// Before:
const projectsRoot = expandPath('~/dev/video-projects/v-appydave');

// After:
const projectsRoot = expandPath(currentConfig.projectsRootDirectory);
```

---

## Success Criteria

Before marking any work unit complete:

- [ ] `npm run build -w server` passes with zero TypeScript errors
- [ ] `npm test -w server` passes (196 tests, zero failures)
- [ ] `npm test` (full suite) passes (331 tests)
- [ ] The changed file has no remaining references to the hardcoded string `v-appydave` (for PROJECTS_ROOT fixes)
- [ ] No new `any` types introduced
- [ ] No logic changes — only structural corrections

---

## Anti-Patterns for This Campaign

- **Do not call `getConfig()` at module scope** — only inside request handlers. Module-scope calls run at import time before config is loaded.
- **Do not change `updateConfig` in `index.ts`** — it is intentionally out of scope.
- **Do not add error handling around `fs.rename`** — the `.tmp` approach is already safe; over-engineering adds complexity.
- **Do not change the `Object.assign` in `projectRoutes` and `chapterRoutes` callbacks** — those are in `index.ts` and are a known issue (B026 only covers the 3 direct-ref factories, not the full `updateConfig` refactor).
- **Do not remove the `WHISPER_BINARY` constant** from `transcriptions.ts` — that is B036, out of scope.

---

## Quality Gates

1. `npm run build -w server` clean — zero TypeScript errors
2. `npm test` exits 0 — all 331 tests pass
3. `grep -rn "v-appydave\|PROJECTS_ROOT" server/src/ --include="*.ts" | grep -v "node_modules\|configManager\|scanProjects\|s3Utils\|comment"` returns zero hits in route/util files (configManager default and scanProjects env-var fallback are acceptable)
