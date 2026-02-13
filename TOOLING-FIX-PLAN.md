# FliHub Tooling Fix Plan

## Current Status

### ✅ Working

- All npm scripts functional (format, lint, test, build)
- Prettier formatting: ✅ All files formatted
- Tests: ✅ Client + Server passing

### ⚠️ Issues to Fix

#### ESLint Warnings: 156 (non-blocking)

- 78x `@typescript-eslint/no-unused-vars` - Unused catch variables
- 25x `@typescript-eslint/no-explicit-any` - Any types in Socket.IO types
- 23x `react/no-unescaped-entities` - Apostrophes in JSX
- Rest: misc warnings

#### TypeScript Errors: 39 (blocking build)

- Query parameter type handling (`string | string[]`)
- Affects 10 route files

---

## Fix Strategy

### Phase 1: TypeScript Errors (CRITICAL)

**Goal:** Make `npm run build` pass

**Problem:** Express 5 types `req.query` values as `string | string[]`, but code expects `string`

**Solution:** Import and use `queryString()` helper from `pathUtils.ts`

**Files to fix:**

1. `server/src/routes/projects.ts` - 4 errors
2. `server/src/routes/query/recordings.ts` - 1 error
3. `server/src/routes/query/transcripts.ts` - 10 errors
4. `server/src/routes/state.ts` - 3 errors
5. `server/src/routes/thumbs.ts` - 5 errors
6. `server/src/routes/transcriptions.ts` - 3 errors
7. `server/src/routes/video.ts` - 7 errors
8. `server/src/routes/query/chapters.ts` - TBD
9. `server/src/routes/query/export.ts` - TBD
10. `server/src/routes/query/images.ts` - TBD
11. `server/src/routes/query/inbox.ts` - TBD
12. `server/src/routes/query/projects.ts` - TBD

**Pattern to apply:**

```typescript
// BEFORE
const project = req.query.project; // Type: string | string[]

// AFTER
import { queryString } from '../utils/pathUtils.js';
const project = queryString(req.query.project); // Type: string
```

### Phase 2: ESLint Warnings (CODE QUALITY)

**Goal:** Reduce warnings from 156 to <10

#### 2A: Unused Catch Variables (78 warnings)

**Auto-fixable:** Rename to `_error` or `_err`

```bash
# Find and replace pattern
catch (error) -> catch (_error)
catch (err) -> catch (_err)
catch (e) -> catch (_e)
```

#### 2B: React Unescaped Entities (23 warnings)

**Auto-fixable:** Replace `'` with `&apos;` or use template literals

#### 2C: Any Types (25 warnings)

**Manual review:** Socket.IO type definitions

- Most are in `shared/types.ts` for Socket.IO events
- These may be unavoidable - add `// eslint-disable-next-line` if needed

#### 2D: Remaining (30 warnings)

- Review each case individually
- Fix or suppress with comments

---

## Execution Plan

### Step 1: Fix TypeScript Errors

Run this command to see all errors:

```bash
npm run build 2>&1 | grep "error TS"
```

For each file:

1. Add import: `import { queryString } from '../utils/pathUtils.js';`
2. Wrap all `req.query.*` and `req.params.*` with `queryString()`
3. Verify build passes for that file

### Step 2: Fix ESLint Warnings (Automated)

```bash
# This will auto-fix most issues
npx eslint . --fix
```

### Step 3: Fix Remaining ESLint Warnings (Manual)

```bash
# Show remaining issues
npm run lint
```

Fix remaining issues one by one.

### Step 4: Verify Everything

```bash
npm run format:check  # Should pass
npm run lint          # Should have <10 warnings
npm run build         # Should pass with 0 errors
npm test              # Should pass
```

### Step 5: Commit

```bash
git add -A
git commit -m "fix: resolve all TypeScript errors and ESLint warnings"
git push
```

---

## Success Criteria

- ✅ TypeScript build: 0 errors
- ✅ ESLint: <10 warnings (only unavoidable ones)
- ✅ All tests passing
- ✅ All npm scripts working
