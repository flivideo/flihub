# Tooling Verification Plan

## What We Need to Verify

### 1. TDD Workflow ❌ Not Tested
**What to verify:**
- Write a real unit test for shared utilities
- Run tests in watch mode (`npm test`)
- Show test failure → fix → test pass cycle
- Verify coverage reports work

**Action Items:**
- [ ] Write unit tests for `shared/naming.ts` functions
- [ ] Demonstrate watch mode workflow
- [ ] Generate coverage report
- [ ] Show how tests integrate with development

### 2. GitHub Actions CI ❌ Not Verified
**What to verify:**
- CI runs on push to main
- CI runs on pull requests
- All steps pass (lint, format, build, test)
- Failures block merges

**Action Items:**
- [ ] Create a test branch
- [ ] Push a commit to trigger CI
- [ ] Verify all CI steps pass
- [ ] Test that CI catches failures (intentional break)

### 3. Code Quality Tools ⚠️ Partially Tested
**What to verify:**
- ESLint catches errors during development
- Prettier auto-formats on save (with editor integration)
- Pre-commit hooks (optional - not configured yet)

**Action Items:**
- [ ] Show ESLint catching a real error
- [ ] Show Prettier formatting a file
- [ ] Document editor integration (VS Code)
- [ ] Optional: Add pre-commit hooks with husky

### 4. Type Safety (Zod) ❌ Not Tested
**What to verify:**
- Zod catches invalid environment variables
- Server refuses to start with bad config
- Type inference works correctly

**Action Items:**
- [ ] Test with invalid PORT (non-number)
- [ ] Test with invalid NODE_ENV
- [ ] Show error messages are helpful
- [ ] Verify type inference in IDE

### 5. Structured Logging (Pino) ❌ Not Used
**What to verify:**
- Logger works in development (pretty print)
- Logger works in production (JSON)
- Log levels work correctly

**Action Items:**
- [ ] Replace console.log with log.info in one file
- [ ] Show output in development vs production
- [ ] Demonstrate error logging with stack traces

---

## Verification Execution Plan

### Phase 1: TDD Workflow (20 min)
1. Write real unit tests for `parseRecordingName()` in naming.ts
2. Run tests in watch mode
3. Demonstrate red → green → refactor cycle
4. Generate coverage report

### Phase 2: GitHub Actions (10 min)
1. Create a feature branch
2. Push to trigger CI
3. Verify CI passes
4. Create a PR and check CI status

### Phase 3: Type Safety Demo (10 min)
1. Test Zod validation with invalid env vars
2. Show helpful error messages
3. Verify server startup protection

### Phase 4: Code Quality in Action (10 min)
1. Introduce an ESLint error
2. Show it's caught immediately
3. Demonstrate auto-fix
4. Show Prettier formatting

### Phase 5: Logging Demo (5 min)
1. Add structured logging to one route
2. Show pretty output in dev
3. Show JSON output in production

---

## Success Criteria

- ✅ Can write and run unit tests in watch mode
- ✅ GitHub Actions CI passes on a real PR
- ✅ Zod catches invalid environment variables
- ✅ ESLint/Prettier catch issues during development
- ✅ Pino logging works in both dev and prod modes
- ✅ Coverage reports generate successfully

---

## Quick Verification Commands

```bash
# TDD Workflow
npm test                    # Run tests once
npm run test:client -- --watch  # Watch mode
npm run test:coverage       # Coverage report

# Code Quality
npm run lint                # Check for issues
npm run format:check        # Check formatting
npm run format              # Auto-fix formatting

# Type Safety
# (Modify .env file with invalid values and run server)
PORT=invalid npm run dev    # Should fail with Zod error

# GitHub Actions
git checkout -b test/verify-ci
git push origin test/verify-ci  # Triggers CI
# Check: https://github.com/flivideo/flihub/actions
```
