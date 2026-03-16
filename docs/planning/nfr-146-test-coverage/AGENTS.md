# AGENTS.md — NFR-146: Test Coverage Foundation

**Inherits from**: `docs/planning/AGENTS.md` (project baseline)
**Campaign**: nfr-146-test-coverage
**Purpose**: Additional context specific to writing tests in FliHub. Read the project baseline AGENTS.md first, then this file.

---

## Campaign Goal

Write ~115 focused unit/integration tests that make the FliHub test suite genuinely trustworthy. Currently: 3 passing placeholders + 7 invisible failing tests. Target: all three workspaces wired, zero failures, critical paths covered.

---

## Test Infrastructure

### Running tests

```bash
# After wire-shared-test-script is complete:
npm test                    # runs all three workspaces
npm test -w shared          # shared only
npm test -w server          # server only
npm test -w client          # client only

# Watch mode during development
npx vitest --watch -w server
```

### Test file locations

```
shared/naming.test.ts                          # EXISTS — currently broken, fix in wave 2
server/src/test/sample.test.ts                 # EXISTS — placeholder, replace content
server/src/test/pathUtils.test.ts              # CREATE
server/src/test/projectState.test.ts           # CREATE
server/src/test/renameRecording.test.ts        # CREATE
server/src/test/s3Utils.test.ts               # CREATE
server/src/test/chapterExtraction.test.ts      # CREATE
server/src/test/finalMedia.test.ts             # CREATE
server/src/test/poemWuiSend.test.ts           # CREATE (integration)
client/src/test/App.test.tsx                   # EXISTS — placeholder, replace content
client/src/test/namingControlsUtils.test.ts    # CREATE
client/src/test/clientFormatting.test.ts       # CREATE
client/src/test/clientNaming.test.ts           # CREATE
```

### Vitest config locations

```
shared/vitest.config.ts    # check if exists, may need to create
server/vitest.config.ts    # exists
client/vitest.config.ts    # exists
```

---

## Test Patterns

### Basic unit test (pure function)

```typescript
import { describe, it, expect } from 'vitest';
import { expandPath } from '../utils/pathUtils.js';

describe('expandPath', () => {
  it('expands tilde to home directory', () => {
    const result = expandPath('~/documents');
    expect(result).toMatch(/^\/Users\//);
    expect(result).toContain('documents');
  });

  it('returns already-expanded paths unchanged', () => {
    expect(expandPath('/absolute/path')).toBe('/absolute/path');
  });

  it('handles empty string', () => {
    expect(expandPath('')).toBe('');
  });
});
```

### Testing a function that reads from filesystem (mock fs)

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { migrateRecordingKey } from '../utils/renameRecording.js';

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  access: vi.fn(),
}));

import * as fs from 'fs/promises';

describe('migrateRecordingKey', () => {
  beforeEach(() => vi.clearAllMocks());

  it('copies old key to new key and deletes old key', async () => {
    const state = { recordings: { 'old-file.mov': { safe: true } } };
    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(state));
    vi.mocked(fs.writeFile).mockResolvedValue();

    await migrateRecordingKey('/project', 'old-file.mov', 'new-file.mov');

    const written = JSON.parse(vi.mocked(fs.writeFile).mock.calls[0][1] as string);
    expect(written.recordings['new-file.mov']).toEqual({ safe: true });
    expect(written.recordings['old-file.mov']).toBeUndefined();
  });
});
```

### Testing Express route (integration test with supertest)

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createPoemWuiRoutes } from '../../routes/poem-wui.js';

// Mock fetch globally
vi.stubGlobal('fetch', vi.fn());

describe('POST /api/poem-wui/send', () => {
  const app = express();
  app.use(express.json());

  const mockConfig = {
    projectDirectory: '/test/project',
    poemWuiUrl: 'http://localhost:5041',
  };
  app.use('/api/poem-wui', createPoemWuiRoutes(() => mockConfig as any));

  beforeEach(() => vi.clearAllMocks());

  it('returns ok: false when no SRT found', async () => {
    // Mock fs.readdir to return empty
    vi.mock('fs/promises', () => ({ readdir: vi.fn().mockResolvedValue([]) }));

    const res = await request(app).post('/api/poem-wui/send');
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toMatch(/No SRT/i);
  });

  it('returns ok: false with helpful message when AWB unreachable', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('ECONNREFUSED'));
    // ... setup SRT mock to return content
    const res = await request(app).post('/api/poem-wui/send');
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toContain('not reachable');
  });
});
```

### Testing naming.test.ts — what changed

The old API (tests expect):
```typescript
// OLD — does not exist anymore
const result = parseRecordingFilename('01-1-intro-CTA.mov');
expect(result.isValid).toBe(true);
expect(result.tags).toEqual(['CTA']);
expect(result.extension).toBe('.mov');
```

The new API (what tests should expect):
```typescript
// NEW — current implementation
const result = parseRecordingFilename('01-1-intro-CTA.mov');
expect(result).not.toBeNull();
expect(result!.chapter).toBe('01');
expect(result!.sequence).toBe('1');
// Tags are embedded in name — use extractTagsFromName to get them
// Extension is not returned — not part of the model
```

For invalid input, the function returns `null`:
```typescript
const result = parseRecordingFilename('not-a-recording.txt');
expect(result).toBeNull();
```

---

## Functions to Export (Wave 3 work)

These functions exist in production code but are not exported. The export-server-utils work unit adds the `export` keyword. No logic changes.

### s3-staging.ts → extract or export
```typescript
// Currently unexported module-level functions — add export keyword:
export function extractBrand(projectPath: string): string { ... }
export function categorizeMigrationFiles(files: string[], projectName: string): MigrationActions { ... }
```

### poem-wui.ts → extract or export
```typescript
// Currently unexported — add export keyword:
export function stripSrt(content: string): string { ... }
export function firstWords(content: string, count?: number): string { ... }
```

### renameRecording.ts → export
```typescript
// Currently unexported — add export keyword to these three:
export async function checkTranscriptionQueue(...): Promise<...> { ... }
export async function migrateRecordingKey(...): Promise<...> { ... }
export async function updateManifestFilename(...): Promise<...> { ... }
```

### NamingControls.tsx → extract to utils file
`sanitizeCustomTag` and `shouldShowTemplate` are currently defined inside the component file (not exported). To test them:
- Either add `export` to each function in `NamingControls.tsx`
- Or move them to `client/src/utils/namingControlsUtils.ts` and import in the component

---

## Critical Test Cases by Work Unit

### wire-shared-test-script
```json
// shared/package.json — add:
{
  "scripts": {
    "test": "vitest run"
  }
}
```
Root package.json test script should become: `npm test -w shared && npm test -w server && npm test -w client`
OR use the workspace flag: `npm test --workspaces`

### fix-naming-tests
Key failures to fix:
1. `parseRecordingFilename` — update 5 tests to use `result | null` shape
2. `validateChapter('00')` — implementation accepts '00' as valid (the regex `/^\d{2}$/` matches) — update test to match reality OR add the min-value check to the implementation (check with PO which is correct)
3. `validateSequence('0')` — same decision: update test OR enforce min:1 in implementation

**Before changing any validation rule, check if it would affect real data.** If recordings exist with chapter '00' or sequence '0', enforcing the rule retroactively would break the file listing.

### test-project-state
The prune logic is the highest-risk path:
```typescript
// The prune: if a recording entry has all flags at their default values,
// the entry is deleted from state entirely rather than stored as empty object.
// Test this explicitly:
it('prunes entry when all flags are default after unsetting safe', async () => {
  // start with only safe: true
  // set safe: false
  // expect the recording key to be gone entirely from state
});
```

---

## Anti-Patterns for This Campaign

- **Do not test implementation details** — test behaviour (inputs → outputs), not internal structure
- **Do not mock everything** — pure functions need zero mocking; only mock I/O at the boundary
- **Do not write tests that always pass** — if `expect(true).toBe(true)` still exists anywhere after this campaign, it's a failure
- **Do not change production logic to make tests pass** — if a function is hard to test because it's tangled with I/O, note it in learnings and move on
- **Do not add `supertest` for unit tests** — only use it for the poem-wui-send route integration test where it genuinely helps

---

## Quality Gates (non-negotiable for this campaign)

1. `npm test` (all workspaces) exits 0 with zero failures
2. No `expect(true).toBe(true)` placeholders remain anywhere
3. `shared/naming.test.ts` runs as part of `npm test` (not just manually)
4. Every work unit that exports a function: the export does not change any observable behaviour (export keyword only, no logic changes)
5. `npm run build -w server` and `npm run build -w client` still pass clean after all changes

---

## Learnings (updated per wave)

*To be populated as waves complete.*
