# AGENTS.md — test-coverage-gaps-2

**Campaign**: test-coverage-gaps-2 — add tests for 4 high-risk untested areas
**Inherits from**: `docs/planning/AGENTS.md` (read that file first for project-wide context)
**Date**: 2026-03-19
**Rule**: Tests only. Zero production code changes. If you find a bug, document it in a comment — do not fix it.

---

## Your Job

Add tests for one work unit. The work unit prompt tells you which one. Read the source file, read the existing tests (if any), add new tests that cover the untested functions. Run `npm test` to confirm all 390+ pass plus your additions.

---

## Build Commands

```bash
npm test                     # run all tests — must exit 0
npm test -w server           # server tests only
npm test -w client           # client tests only
npm run build -w shared      # rebuild shared if you touch shared/
```

---

## What's Already Tested — Do NOT Duplicate

### `server/src/test/renameRecording.test.ts` covers:
- `checkTranscriptionQueue` (8 cases)
- `migrateRecordingKey` (6 cases)
- `updateManifestFilename` (8 cases)

### `server/src/test/chapterExtraction.test.ts` covers:
- `parseSrtTimestamp` (6 cases)
- `formatYouTubeTimestamp` (9 cases)
- `calculateConfidence` (9 cases)

### No client srt tests exist at all.
### No editManifest tests exist at all.

---

## Work Unit: test-renameRecording-pipeline (B028)

**File to test**: `server/src/utils/renameRecording.ts`
**Test file**: `server/src/test/renameRecording.test.ts` — ADD to existing file (do not replace)
**Function to test**: `renameRecording()` — the main export

### What `renameRecording()` does (3-phase pipeline):
1. `checkTranscriptionQueue()` — if recording is being transcribed, abort and return error
2. `deleteDerivableFiles()` — deletes shadow `.mp4`, transcripts `.txt`/`.srt`, chapter videos
3. `renameCoreFiles()` — renames the `.mov`/`.mp4` recording, migrates state key
4. `regenerateDerivableFiles()` — recreates shadow, queues transcription

### What to test:
- Abort when `checkTranscriptionQueue` returns true (transcription in progress)
- Phase order: delete fires before rename, rename fires before regenerate
- If `renameCoreFiles` fails (file doesn't exist), regenerate does NOT fire
- Happy path: all 3 phases complete, returns `{ success: true }`
- State migration happens: old key gone, new key present

### Mock pattern (all server utils use fs-extra):
```typescript
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('fs-extra', () => ({
  default: {
    pathExists: vi.fn(),
    rename: vi.fn(),
    remove: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    ensureDir: vi.fn(),
    readdir: vi.fn(),
  },
}));

// Mock execAsync for shadow generation
vi.mock('../utils/execAsync.js', () => ({
  execAsync: vi.fn().mockResolvedValue({ stdout: '', stderr: '' }),
}));
```

### Key import path from test file:
```typescript
import { renameRecording } from '../utils/renameRecording.js';
```

---

## Work Unit: test-extractChapters-matching (B029)

**File to test**: `server/src/utils/chapterExtraction.ts`
**Test file**: `server/src/test/chapterExtraction.test.ts` — ADD to existing file
**Functions to test**: `extractChapters()`, `findMatchInSrt()`, `calculateSimilarity()`, `normalizeText()`

Note: These are NOT exported in the current file. Check the file before writing tests. If they're not exported, you must add `export` keywords to the functions — that IS a production code change but it's the minimum needed to make these testable. Document the exports added.

### What to test for `extractChapters()`:
- Returns empty array when no transcripts found
- Returns one chapter entry per recording with a match found
- Skips recordings with no SRT transcript
- Out-of-order detection: flags when a match appears before the previous match
- Duplicate detection: two chapters matching the same SRT segment

### What to test for `findMatchInSrt()`:
- Exact phrase match returns high confidence
- Similarity fallback when exact phrase not found
- Returns null when no match exceeds threshold
- Short phrases get confidence penalty

### What to test for `calculateSimilarity()`:
- Identical strings return 1.0
- Completely different strings return low score
- Substring match returns intermediate score

### SRT fixture for tests:
```typescript
const SAMPLE_SRT = `1
00:00:00,000 --> 00:00:05,000
Welcome to this tutorial about AppyDave

2
00:00:05,500 --> 00:00:10,000
Today we will learn about the BMAD method

3
00:00:10,500 --> 00:00:15,000
Let's start with the introduction
`;
```

### Mock pattern — `getChaptersFromTranscripts` uses fs-extra:
```typescript
vi.mock('fs-extra', () => ({
  default: {
    pathExists: vi.fn().mockResolvedValue(true),
    readFile: vi.fn().mockResolvedValue(SAMPLE_SRT),
    readdir: vi.fn().mockResolvedValue(['01-1-intro.srt']),
  },
}));
```

---

## Work Unit: test-client-srt (B030)

**File to test**: `client/src/utils/srt.ts`
**Test file**: `client/src/test/srt.test.ts` — CREATE new file
**Functions to test**: `parseSrt`, `srtToTimedWords`, `findCurrentEntry`, `findCurrentWord`, `getSrtFullText`

### Client test setup (different from server):
```typescript
import { describe, it, expect } from 'vitest';
// No fs-extra mocking needed — client srt.ts is pure functions, no I/O
import {
  parseSrt,
  srtToTimedWords,
  findCurrentEntry,
  findCurrentWord,
  getSrtFullText,
} from '../utils/srt.js';
```

### SRT fixture:
```typescript
const SAMPLE_SRT = `1
00:00:00,000 --> 00:00:03,000
Hello world this is a test

2
00:00:03,500 --> 00:00:06,000
Second entry here
`;
```

### What to test:

**`parseSrt`**:
- Parses two entries — correct count, start/end times, text
- Handles period separator in timestamp (`00:00:01.500`)
- Returns empty array for empty string

**`srtToTimedWords`**:
- Returns one TimedWord per word
- Each word has `start` and `end` within the entry's time range
- Single-word segment: `start === entry.start`, `end === entry.end` (no divide-by-zero)
- Empty entries: returns empty array

**`findCurrentEntry`**:
- Returns entry when currentTime is within range
- Returns null when before all entries
- Returns null when after all entries
- Returns correct entry when multiple entries exist

**`findCurrentWord`**:
- Returns word at currentTime
- Returns null when no entry active

**Critical edge case — single-word segment (B030 origin bug):**
```typescript
it('does not divide by zero on a single-word segment', () => {
  const srt = `1\n00:00:00,000 --> 00:00:05,000\nHello\n`;
  const entries = parseSrt(srt);
  const words = srtToTimedWords(entries);
  expect(words).toHaveLength(1);
  expect(words[0].start).toBe(0);
  expect(words[0].end).toBe(5);
});
```

### Import path from `client/src/test/srt.test.ts`:
```typescript
import { parseSrt, ... } from '../utils/srt.js';
```

---

## Work Unit: test-editManifest (B031)

**File to test**: `server/src/utils/editManifest.ts`
**Test file**: `server/src/test/editManifest.test.ts` — CREATE new file

### Functions to test:
- `getManifestStatus(manifest, projectDir)` — checks if files match hashes
- `cleanEditFolder(manifest, folderPath)` — deletes manifested files, preserves non-manifested
- `restoreEditFolder(manifest, recordingsDir, folderPath)` — restores from recordings
- `createManifest(files, projectDir)` — creates manifest from file list

### What to test:

**`getManifestStatus`**:
- Returns `'empty'` when manifest has no files
- Returns `'clean'` when all files exist and hashes match
- Returns `'modified'` when a file's hash differs from manifest
- Returns `'missing'` when a manifested file doesn't exist on disk

**`cleanEditFolder`** — the safety-critical one:
- Deletes files that ARE in the manifest
- Does NOT delete files that are NOT in the manifest (preserves extras)
- Returns list of deleted files

**`restoreEditFolder`**:
- Copies files from `recordingsDir` to `folderPath`
- Skips files that already exist at destination with matching hash

**`createManifest`**:
- Returns manifest with one entry per file
- Each entry has filename, sourceHash, copiedAt, sourceSize

### Mock pattern:
```typescript
vi.mock('fs-extra', () => ({
  default: {
    pathExists: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    remove: vi.fn(),
    copy: vi.fn(),
    stat: vi.fn(),
  },
}));
```

### Import path:
```typescript
import { getManifestStatus, cleanEditFolder, restoreEditFolder, createManifest } from '../utils/editManifest.js';
```

---

## Success Criteria (ALL must pass before marking complete)

- [ ] `npm test` exits 0 — all existing 390 tests still pass
- [ ] New tests cover the untested orchestration functions (not just helper re-tests)
- [ ] The single-word SRT divide-by-zero edge case is explicitly tested (B030)
- [ ] `cleanEditFolder` safety test: non-manifested files are NOT deleted (B031)
- [ ] `renameRecording()` abort-on-transcription test passes (B028)
- [ ] No production code changes except `export` keywords where needed for testability
- [ ] No `any` types in new test files

---

## Anti-Patterns to Avoid

- Do not re-test functions already covered by existing tests (`checkTranscriptionQueue`, `parseSrtTimestamp`, etc.)
- Do not mock `fs/promises` — all server I/O uses `fs-extra`. Mock target: `vi.mock('fs-extra')`
- Do not add SRT logic to test files — test only, no new utilities
- Do not fix bugs found during testing — add a `// BUG:` comment and keep moving
- Do not create new test helper files — keep helpers inline or in the same test file
