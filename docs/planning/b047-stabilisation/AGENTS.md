# AGENTS.md — b047-stabilisation

**Project**: FliHub — video recording workflow management tool
**Campaign**: b047-stabilisation (fix 4 critical bugs from B047 Recording Editor audit)
**Stack**: TypeScript monorepo — Express + Socket.io (server), React 19 + Vite + TailwindCSS v4 (client), shared types
**Last updated**: 2026-03-24
**Inherits from**: `docs/planning/recording-editor/AGENTS.md`

---

## Project Overview

FliHub manages video recording workflows. The B047 campaign added inline rename, split-chapter, and undo to the Recordings page. A 3-lens quality audit found 4 bugs — this campaign fixes them.

---

## Build & Run Commands

```bash
npm install                        # Install all workspace dependencies
npm run build -w shared            # Build shared types (run first if you changed shared/)
npm run build -w server            # TypeScript compile server
npm run build -w client            # tsc -b && vite build
npm test                           # runs shared → server → client (980+ tests currently passing)
npm test -w server                 # server tests only (fastest feedback loop)
npm test -w client                 # client tests only
npm test -w shared                 # shared tests only

lsof -i :5101 | grep LISTEN       # Check if server is running (DO NOT start it)
```

**Never start the dev server in an agent** — it's a long-running process. Build and test only.

---

## Directory Structure (Scope of This Campaign)

```
flihub/
├── client/src/
│   ├── components/
│   │   └── RecordingsView.tsx      # MODIFY (B052 only) — replace regex with shared parser
│   └── [everything else]           # DO NOT MODIFY
├── server/src/
│   ├── routes/
│   │   └── manage.ts               # MODIFY (B050+B051, B053) — fix split-chapter + undo
│   └── test/
│       └── manage.ts.test.ts       # MODIFY — add tests for tag preservation, undo after split, stale filename validation
└── shared/
    └── naming.ts                   # READ ONLY — parseRecordingFilename(), buildRecordingFilename(), extractTagsFromName()
```

**DO NOT MODIFY** any file not listed above. This is a bugfix-only campaign.

---

## Recording Naming Convention

**Format**: `{chapter}-{sequence}-{name}[-{TAGS}].{ext}`

- Chapter: 2 digits, zero-padded (01-99)
- Sequence: 1+ digits (1, 2, 3...)
- Name: kebab-case (a-z, 0-9, hyphens)
- Tags: optional, uppercase-only (CTA, SKOOL, 1ST, V2)
- Extension: .mov or .mp4

**Examples**:
- `01-1-intro.mov` (no tags)
- `04-3-intro-CTA.mov` (one tag: CTA)
- `10-12-demo-setup-SKOOL-V2.mov` (two tags: SKOOL, V2)

**Critical detail for this campaign**: `parseRecordingFilename()` returns `{ chapter, sequence, name }` where `name` has tags STRIPPED. To get the tags, you must call `extractTagsFromName()` on the original filename's name+tags portion, or parse the raw filename yourself using `extractTagsFromName`.

**Key functions** (from `shared/naming.ts` — READ ONLY):
- `parseRecordingFilename(filename)` → `{ chapter, sequence, name }` — **name has tags stripped**
- `buildRecordingFilename(chapter, sequence, name, tags?)` → filename string
- `extractTagsFromName(name)` → `{ name, tags[] }` — extracts uppercase tag segments

**How to get tags from a filename**:
```typescript
// Given: filename = "04-3-intro-CTA.mov"
// parseRecordingFilename returns { chapter: "04", sequence: "3", name: "intro" } — CTA is gone!
//
// To reconstruct with tags, extract from the base filename:
const base = filename.replace(/\.(mov|mp4)$/i, '');
const parts = base.split('-');
// parts[0] = chapter, parts[1] = sequence, rest = name+tags
const nameAndTags = parts.slice(2).join('-'); // "intro-CTA"
const { name: cleanName, tags } = extractTagsFromName(nameAndTags);
// cleanName = "intro", tags = ["CTA"]
// Now: buildRecordingFilename(newChapter, newSeq, cleanName, tags)
```

---

## Work Unit Details

### 1. split-chapter-fixes (B050 + B051)

**Bug B050 — Tag loss**: In `manage.ts` lines 1475-1526, when building new filenames during cascade and move operations, `buildRecordingFilename(newChapterStr, String(file.sequence), file.name)` is called without tags. The `file.name` comes from `parseRecordingFilename` which strips tags. Tags are silently dropped.

**Fix B050**: When building the `chapterMap` (lines 1410-1421), extract tags from the original filename and store them alongside the other parsed fields. Then pass tags to every `buildRecordingFilename` call in cascade (line 1481) and move (line 1510).

Current code (line 1416-1421):
```typescript
chapterMap.get(chNum)!.push({
  filename,
  chapter: parsed.chapter,
  sequence: parseInt(parsed.sequence, 10),
  name: parsed.name,
});
```

Fix — add tags extraction:
```typescript
// Extract tags from the raw filename (parseRecordingFilename strips them)
const base = filename.replace(/\.(mov|mp4)$/i, '');
const nameParts = base.split('-').slice(2).join('-');
const { tags } = extractTagsFromName(nameParts);

chapterMap.get(chNum)!.push({
  filename,
  chapter: parsed.chapter,
  sequence: parseInt(parsed.sequence, 10),
  name: parsed.name,
  tags,
});
```

Then update both `buildRecordingFilename` calls:
```typescript
// Line 1481 (cascade):
const newFilename = buildRecordingFilename(newChapterStr, String(file.sequence), file.name, file.tags);

// Line 1510 (move):
const newFilename = buildRecordingFilename(targetChapterStr, newSeq, file.name, file.tags);
```

**NOTE**: You will need to update the TypeScript type for the chapterMap entries to include `tags: string[]`. The type is inline (not a named interface), so update the `push()` call and any destructuring that references these entries.

**Bug B051 — Missing undo mapping storage**: After the split loop completes (around line 1528), `lastBatchMapping` is never set. The `undoMapping` is returned in the response but not stored.

**Fix B051**: Add one line before the `io.emit`:
```typescript
// Store undo mapping so POST /api/manage/undo-rename can use it
lastBatchMapping = undoMapping;
```

**Required imports**: Add `extractTagsFromName` to the import from `../../shared/naming.js` at the top of manage.ts.

**Tests to add** (in `manage.ts.test.ts`):
```
describe('POST /api/manage/split-chapter — tag preservation', () => {
  it('preserves tags on cascaded files (e.g. CTA tag survives ch04→ch05)')
  it('preserves tags on moved files (split files keep their tags)')
  it('preserves multiple tags on files with more than one tag')
})

describe('POST /api/manage/split-chapter — undo mapping', () => {
  it('stores lastBatchMapping so undo-rename works after split')
  it('undo after split reverts all cascade and move renames')
})
```

**Done when**:
- `npm test -w server` passes
- `npm run build -w server` passes
- New tests prove tags are preserved through cascade and move
- New tests prove undo works after split-chapter

---

### 2. apply-changes-parser (B052)

**Bug**: In `RecordingsView.tsx` line 1009, `handleApplyChanges` uses a hand-rolled regex to parse the new filename:
```typescript
const newFilenameMatch = firstChange.newFilename.match(
  /^(\d{2})-\d+-(.+?)(?:-([A-Z0-9]+(?:-[A-Z0-9]+)*))?\.(\w+)$/
);
```

This regex cannot distinguish between label hyphens and tag hyphens. For example, `01-1-my-intro-CTA.mov` — is `CTA` a tag or part of the label? The regex guesses wrong on some inputs.

**Fix**: Replace lines 1008-1013 with:
```typescript
// Parse the new filename using shared naming utilities (not regex)
const parsed = parseRecordingFilename(firstChange.newFilename);
const base = firstChange.newFilename.replace(/\.(mov|mp4)$/i, '');
const nameAndTags = base.split('-').slice(2).join('-');
const { name: cleanName, tags: parsedTags } = extractTagsFromName(nameAndTags);

const newChapter = parsed ? parsed.chapter : firstFile.chapter;
const newLabel = parsed ? cleanName : firstFile.name;
const newTags = parsedTags;
```

**Required imports**: Add `parseRecordingFilename` and `extractTagsFromName` to imports from the shared naming module. Check existing imports at the top of RecordingsView.tsx — `buildRecordingFilename` is likely already imported; add the two new ones alongside it.

**Import path**: The client imports from shared via relative paths. Check how `buildRecordingFilename` is imported and use the same pattern.

**Tests**: This is a client component. Ensure:
- `npm run build -w client` passes (no type errors)
- `npm test -w client` passes (existing tests unbroken)
- If there are existing tests for RecordingsView, verify they still pass

**Done when**:
- `npm run build -w client` passes
- `npm test -w client` passes
- `npm test` (all workspaces) passes
- The hand-rolled regex on line 1009 is gone, replaced with shared naming functions

---

### 3. undo-validation (B053)

**Bug**: In `manage.ts` lines 1300-1343, the undo-rename endpoint assumes every file in `lastBatchMapping` still has the expected `newFilename`. If the user does a batch rename, then an inline rename on one of those files, then presses Undo, the undo tries to rename a file that no longer exists at that path → ENOENT error.

**Fix**: Before attempting each undo revert, check that the file still exists at the expected `newFilename` path. If not, skip it and report it as "skipped — file was modified since batch".

Current code (lines 1315-1330):
```typescript
for (const { oldFilename, newFilename } of reversedMapping) {
  const result = await renameRecording(
    newFilename,
    oldFilename,
    paths,
    activeJob,
    queue
  );

  if (result.success) {
    revertedCount++;
  } else {
    errors.push(`Failed to revert ${newFilename}: ${result.error}`);
  }
}
```

Fixed code:
```typescript
import fs from 'fs-extra';
// ... (fs-extra is already imported in manage.ts)

let skippedCount = 0;
for (const { oldFilename, newFilename } of reversedMapping) {
  // Validate file still has expected name before attempting undo
  const filePath = path.join(paths.recordings, newFilename);
  const exists = await fs.pathExists(filePath);
  if (!exists) {
    skippedCount++;
    errors.push(`Skipped ${newFilename}: file was modified since batch operation`);
    continue;
  }

  const result = await renameRecording(
    newFilename,
    oldFilename,
    paths,
    activeJob,
    queue
  );

  if (result.success) {
    revertedCount++;
  } else {
    errors.push(`Failed to revert ${newFilename}: ${result.error}`);
  }
}
```

Also update the response to include skipped info (optional — the `error` field already captures it via errors array).

**Tests to add**:
```
describe('POST /api/manage/undo-rename — stale filename handling', () => {
  it('skips files that no longer exist at expected path and reports them')
  it('still reverts other files in the batch that are valid')
  it('returns success: false when some files were skipped')
  it('returns success: true when all files were valid and reverted')
})
```

**Done when**:
- `npm test -w server` passes
- `npm run build -w server` passes
- New tests verify stale filename handling
- Undo no longer throws confusing ENOENT when a file was renamed after the batch

---

## Success Criteria (All Work Units)

Before marking any work unit complete, verify ALL of these:

1. **TypeScript compiles**: `npm run build -w server` and/or `npm run build -w client` pass with zero errors
2. **Tests pass**: `npm test` passes across all workspaces (980+ existing tests must not break)
3. **New tests written**: every fix has at least 1 test proving the bug is resolved
4. **No `any` types**: all new/modified code is fully typed
5. **Config via getter**: access config through `() => getConfig()` pattern, never cache
6. **Socket events**: emit `recordings:changed` after any file rename operation (already done — don't remove)
7. **Naming convention**: use `parseRecordingFilename()` and `buildRecordingFilename()` from shared/naming.ts — never hand-parse filenames with regex

---

## Anti-Patterns to Avoid

- **DO NOT** re-implement filename parsing — always use `shared/naming.ts` functions
- **DO NOT** hand-build filenames with string concatenation — use `buildRecordingFilename()`
- **DO NOT** use `fs` (Node built-in) — use `fs-extra` which is the project standard
- **DO NOT** start the dev server in a test or agent — build and test only
- **DO NOT** modify files outside the scope listed in Directory Structure
- **DO NOT** add snapshot tests — this project uses assertion-based tests only
- **DO NOT** add `any` types — fully type all new code
- **DO NOT** assume `parseRecordingFilename().name` contains tags — it STRIPS them. Always use `extractTagsFromName()` separately.

---

## Mock Patterns (for Tests)

Server tests mock `fs-extra` (not `fs/promises`):
```typescript
vi.mock('fs-extra', () => ({
  default: {
    rename: vi.fn().mockResolvedValue(undefined),
    unlink: vi.fn().mockResolvedValue(undefined),
    pathExists: vi.fn().mockResolvedValue(true),
    readdir: vi.fn().mockResolvedValue([]),
    readJson: vi.fn().mockResolvedValue({}),
    writeJson: vi.fn().mockResolvedValue(undefined),
    ensureDir: vi.fn().mockResolvedValue(undefined),
  },
}));
```

Server route tests use `supertest`:
```typescript
import request from 'supertest';
import express from 'express';

const app = express();
app.use(express.json());
// Wire routes...

const res = await request(app).post('/api/manage/split-chapter').send({ chapter: '04', splitAtSequence: 11 });
expect(res.status).toBe(200);
expect(res.body.success).toBe(true);
```

**Important**: The existing `manage.ts.test.ts` uses a `createApp()` factory that wires up the manage routes with mocked dependencies. Follow this pattern — do not create a new test file. Add your tests to the existing describe blocks or create new describe blocks within the same file.

**For B053 (undo validation)**: You'll need `fs.pathExists` to return `false` for specific filenames to simulate a file that was renamed after the batch. Mock it per-test:
```typescript
mockFs.pathExists.mockImplementation((filePath: string) => {
  if (filePath.includes('modified-file.mov')) return Promise.resolve(false);
  return Promise.resolve(true);
});
```

---

## Quality Gates

- `npm run build -w server && npm run build -w client` — zero TypeScript errors
- `npm test` — all tests pass (980+ existing + new tests)
- Each bug fix has a test that would have caught the original bug

---

## Learnings (from B047)

1. **`parseRecordingFilename().name` strips tags** — this caused B050. Every code path that reconstructs a filename from parsed parts must separately extract and preserve tags.
2. **Anti-patterns in AGENTS.md don't prevent violations** — B052 happened despite "DO NOT re-implement filename parsing" being in the anti-patterns. Adding explicit test stubs for critical requirements helps.
3. **Undo mapping must be stored at the operation boundary** — B051 happened because the split-chapter endpoint computed `undoMapping` and returned it but forgot to store it in `lastBatchMapping`.
4. **Smart rename two-phase pattern works well** — `renameDerivableFiles()` then `renameCoreFiles()` is clean and fast. Preserve this pattern.
