# FliHub Quality Tooling - Action Plan

## Current State (Verified)

All npm scripts run successfully:

| Script                  | Result                                 |
| ----------------------- | -------------------------------------- |
| `npm run build`         | Pass (server + client compile clean)   |
| `npm run lint`          | Pass (0 errors, 151 warnings)          |
| `npm run lint:fix`      | Available, auto-fixes formatting rules |
| `npm run format`        | Available, formats all files           |
| `npm run format:check`  | Pass (all files formatted)             |
| `npm test`              | Pass (3/3 tests)                       |
| `npm run test:client`   | Pass (1/1)                             |
| `npm run test:server`   | Pass (2/2)                             |
| `npm run test:ui`       | Available (launches Vitest UI)         |
| `npm run test:coverage` | Available (generates coverage reports) |
| `npm run dev`           | Available (concurrent server + client) |

---

## Phase 1: Fix the 151 ESLint Warnings (auto-fixable)

### Breakdown by category:

| Category                                                                                          | Count | Effort | Auto-fix?                                       |
| ------------------------------------------------------------------------------------------------- | ----- | ------ | ----------------------------------------------- |
| `@typescript-eslint/no-unused-vars`                                                               | 59    | Low    | `lint:fix` for some, manual for others          |
| `@typescript-eslint/no-explicit-any`                                                              | 25    | Medium | Manual - need proper types                      |
| `react/no-unescaped-entities`                                                                     | 23    | Low    | Replace `"` with `&quot;` and `'` with `&apos;` |
| `react-hooks/*` (exhaustive-deps, set-state-in-effect, preserve-manual-memoization, immutability) | 20    | High   | Manual - requires understanding component logic |
| `no-useless-escape`                                                                               | 6     | Low    | `lint:fix` handles these                        |
| `no-case-declarations`                                                                            | 2     | Low    | Wrap case blocks in `{}`                        |
| Other (node warnings, type: module)                                                               | 16    | -      | Noise, not real issues                          |

### Recommended approach - 4 batches:

**Batch 1: Quick wins (est. ~35 warnings removed)**

- Run `npm run lint:fix` to auto-fix `no-useless-escape` (6)
- Fix `react/no-unescaped-entities` (23) - find/replace `"` with `&quot;` in JSX
- Fix `no-case-declarations` (2) - wrap case bodies in `{}`
- Wrap unused function params with `_` prefix (4)

**Batch 2: Unused vars cleanup (est. ~55 warnings removed)**

- Remove unused imports: `fs`, `path`, `expandPath`, `PROJECTS_ROOT`, `glob` across ~15 server files
- Remove unused type imports: `EditFolderKey`, `ProjectState`, `ProjectPriority`, `ProjectStage`, `ChapterMatchCandidate`, `TranscriptSyncStatus`, `InboxFile`
- Remove or prefix unused function params: `getConfig`, `recordingsDir`, `segmentIndex`, `transcriptText`, `matchResultInternal`, `projectCode`, `index`
- Remove unused variables: `code`, `stat`, `existsInEdit`, `chapterNumbers`, `chaptersPath`, `key`, `filepath`
- Remove unused functions: `handleEditPrompt`, `generateChapter`, `toTitleCase`, `sectionHeader`, `countTxtFiles`, `formatTimestamp`, `getFirstWords`, `parseChapterNum`, `parseSequenceNum`, `moveShadowFile`, `renameShadowFile`, `groupRecordingsByChapter`, `STATE_FILE_NAME`

**Batch 3: Type safety (est. ~25 warnings removed)**

- Replace `any` with proper types across 25 instances
- Common patterns: `error: unknown` in catch blocks, proper response types, typed event handlers

**Batch 4: React hooks (est. ~20 warnings removed, requires care)**

- `react-hooks/set-state-in-effect` (8) - refactor setState-in-effect patterns to avoid cascading renders
- `react-hooks/preserve-manual-memoization` (7) - review useMemo dependencies
- `react-hooks/exhaustive-deps` (4) - add missing dependencies or restructure
- `react-hooks/immutability` (1) - ensure immutable patterns

---

## Phase 2: Issues a Verification Agent Would Find

### 2a. Pino Logger is Dead Code

**Status:** `server/src/config/logger.ts` exists but is never imported. 325+ `console.log` calls remain.

**Options:**

1. **Migrate incrementally** - Replace console.log in `index.ts` and `WatcherManager.ts` first (high-value), then routes over time
2. **Remove it** - If structured logging isn't needed yet, remove the dead code and add it when ready
3. **Quick win** - Import logger in `index.ts` only and replace the ~15 console.log calls there

### 2b. Server Vitest picks up dist/ tests

**Fix:** Add `include` pattern to `server/vitest.config.ts`:

```typescript
test: {
  include: ['src/**/*.test.ts'],
  globals: true,
  testTimeout: 10000,
  hookTimeout: 10000,
}
```

### 2c. Raw `req.query` access bypasses queryString()

11 instances of `req.query.format === 'text'` in query routes bypass the `queryString()` wrapper. While these work (string comparison with union type), they should be standardized for consistency.

### 2d. Only sample tests exist

Both client and server have only `expect(true).toBe(true)` placeholder tests. No real business logic is tested.

---

## Phase 3: Playwright Spot-Check Prompt

Use this prompt to verify the application still works after the quality tooling changes:

```
You are testing the FliHub application to verify it still works correctly after
quality tooling changes (ESLint, Prettier, Vitest, Zod env, Pino, CI were added).

The application runs at:
- Client: http://localhost:5173 (Vite dev server)
- Server API: http://localhost:5101

## Prerequisites
1. Start the app: `cd /Users/davidcruwys/dev/ad/flivideo/flihub && npm run dev`
2. Wait for both server and client to be ready

## Test Plan - Smoke Tests

### Test 1: Server Health
- GET http://localhost:5101/api/config
- Verify: Response is JSON with `watchDirectory`, `projectDirectory` fields
- Verify: HTTP 200 status

### Test 2: Client Loads
- Navigate to http://localhost:5173
- Verify: Page loads without blank screen or JS errors
- Verify: Main navigation/layout is visible
- Take a screenshot for visual verification

### Test 3: Socket Connection
- Navigate to http://localhost:5173
- Open browser dev tools network tab (WS filter)
- Verify: WebSocket connection established to localhost:5101
- Verify: No connection errors in console

### Test 4: Project List
- Navigate to the app
- Verify: Projects panel or project list loads
- Verify: If projects are configured, project names appear
- If no projects configured, verify the config panel is accessible

### Test 5: Config Panel
- Navigate to the configuration/settings panel
- Verify: Watch directory field is populated
- Verify: Projects root directory field is populated
- Verify: Save button is functional (does not throw errors)

### Test 6: API Endpoints
- GET http://localhost:5101/api/projects - verify JSON response
- GET http://localhost:5101/api/system/info - verify response
- GET http://localhost:5101/api/config - verify config shape

### Test 7: No Console Errors
- Open browser console on any page
- Verify: No red error messages
- Verify: No unhandled promise rejections
- Warning messages are acceptable

## What to report:
- Screenshot of each page visited
- Any JavaScript errors from the console
- Any network request failures (4xx, 5xx)
- Whether the WebSocket connection is active
- Overall: Does the app function identically to before the tooling changes?
```

---

## Phase 4: Recommendations

### High Priority

1. **Fix the 59 unused-vars warnings** - These are the biggest chunk and indicate dead code that should be cleaned up. Many are unused imports that increase bundle size or unused variables from refactoring.

2. **Add real unit tests** - The sample tests prove infrastructure works but test nothing. Priority targets:
   - `shared/naming.ts` - recording filename parsing (pure logic, easy to test)
   - `server/src/utils/pathUtils.ts` - the `queryString()` and `expandPath()` utilities
   - `server/src/utils/chapterExtraction.ts` - chapter parsing logic
   - `client/src/utils/formatting.ts` - display formatting helpers

3. **Activate the Pino logger** - At minimum in `server/src/index.ts` to replace the 15 console.log calls there. This gives structured logging for startup, shutdown, and connection events.

### Medium Priority

4. **Fix the 25 `any` types** - Replace with proper types to get real type safety from the TypeScript investment.

5. **Fix React hooks warnings** - The `set-state-in-effect` (8) and `exhaustive-deps` (4) warnings can cause subtle bugs (infinite renders, stale closures). These need careful review of each component.

6. **Add `type: "module"` to root package.json** - Eliminates the ESM warning.

7. **Exclude dist/ from server vitest** - Prevents future double-test pickup.

### Low Priority

8. **Consider stricter ESLint rules** - Once warnings are at 0, promote some `warn` rules back to `error` (e.g., `no-unused-vars`).

9. **Add Playwright e2e tests** - Use the prompt above as a starting point for automated smoke tests.

10. **Shared ESLint config package** - If applying the same config to FliDeck and Storyline App, consider extracting to a shared `@flivideo/eslint-config` package.
