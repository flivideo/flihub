# B047 Recording Editor — Test Quality Audit

**Date:** 2026-03-24
**Scope:** Server tests (`renameRecording.test.ts`, `manage.test.ts`) and client coverage gaps
**Verdict:** Server tests are strong for the functions they cover. Three critical gaps exist: zero client-side testing for new components, missing unit tests for two exported server utilities, and no negative-path integration tests for bulk-rename.

---

## CRITICAL GAPS

### C1. `chapterUtils.ts` — already tested (false alarm)

`client/src/test/chapterListUtils.test.ts` covers both `extractChapters` and `detectGaps` thoroughly (empty input, single chapter, multiple chapters, gaps, invalid filenames). No gap here.

### C2. `useEditingApi.ts` — zero test coverage

**File:** `client/src/hooks/useEditingApi.ts`
**Exports:** `useBulkRename`, `useRenameRecording`, `useSplitChapter`, `useBatchUndoRename`

These are React Query mutation hooks. While the server endpoints they call are tested via supertest, the hooks themselves have no tests verifying:
- Correct URL and HTTP method
- Request body serialization
- Query cache invalidation on success (`QUERY_KEYS.recordings`)
- Error propagation from `fetchApi`

**Suggested tests:**
```ts
// client/src/test/useEditingApi.test.ts
it('useBulkRename POSTs to /api/manage/bulk-rename with correct body')
it('useBulkRename invalidates recordings query key on success')
it('useSplitChapter POSTs to /api/manage/split-chapter')
it('useBatchUndoRename POSTs to /api/manage/undo-rename with no body')
it('useRenameRecording POSTs to /api/rename with correct shape')
```

### C3. `EditableFileRow.tsx` — zero test coverage

**File:** `client/src/components/shared/EditableFileRow.tsx`
**Risk:** This is the primary user interaction point for inline renaming. It contains validation logic (`validateChapter`, `validateLabel`), state transitions (edit mode enter/confirm/cancel), and keyboard handling (Enter/Escape).

**Suggested tests (React Testing Library):**
```tsx
it('renders filename segments: chapter, sequence, name, extension')
it('clicking chapter segment enters edit mode and focuses input')
it('pressing Enter with valid chapter calls onInlineRename')
it('pressing Enter with invalid chapter shows error, does NOT call onInlineRename')
it('pressing Escape cancels edit mode without calling onInlineRename')
it('empty input shows "Value cannot be empty" error')
it('submitting unchanged value cancels silently (no rename call)')
it('disabled prop prevents edit mode from activating')
it('shadow recording prevents edit mode and hides checkbox')
it('tags render as badges with remove buttons')
it('clicking tag remove button calls onTagRemove with correct args')
it('safe recording shows Restore button, not Safe/Park')
it('parked recording shows Unpark button')
it('pendingChange shows green arrow with new filename')
```

### C4. `BatchToolbar.tsx` — zero test coverage

**File:** `client/src/components/shared/BatchToolbar.tsx`
**Risk:** Contains inline validation logic for rename (kebab-case), chapter (2-digit), and tag (uppercase alphanumeric) that duplicates server-side validation. If these drift, users see confusing errors.

**Suggested tests:**
```tsx
it('displays correct selection count and chapter info')
it('rename popover validates label via validateLabel')
it('rename popover rejects empty input')
it('move-chapter popover validates chapter via validateChapter')
it('add-tag popover uppercases input and validates format')
it('add-tag rejects non-alphanumeric tags')
it('remove-tag popover only appears when selectedTags is non-empty')
it('clicking remove tag button calls onRemoveTag and closes popover')
it('Escape key closes any open popover')
it('Enter key submits the active popover form')
it('only one popover can be open at a time')
```

### C5. `PreviewPanel.tsx` — zero test coverage

**File:** `client/src/components/shared/PreviewPanel.tsx`
**Risk:** Lower than C3/C4 since it is a display-only component, but its grouping logic (chapter extraction from filename prefix) and count calculations are untested.

**Suggested tests:**
```tsx
it('groups changes by source chapter prefix')
it('displays correct instant vs re-transcription counts')
it('shows split info badge when splitInfo is provided')
it('Apply button is disabled when isApplying is true')
it('Apply button shows "Applying..." text when isApplying')
it('handles changes with "??" chapter (unparseable prefix)')
```

---

## MAJOR GAPS

### M1. `renameCoreFiles` — no direct unit test

**File:** `server/src/utils/renameRecording.ts` (line 232)
**Status:** Only tested indirectly through the `renameRecording` integration test. If the state migration or manifest update logic breaks, the `renameRecording` test won't catch it because `readProjectState` and `writeProjectState` are mocked to no-ops.

**Suggested tests:**
```ts
it('renames the recording file via fs.rename')
it('calls readProjectState and writeProjectState with migrated key')
it('calls updateManifestFilename to update edit manifest')
it('propagates fs.rename errors as thrown exceptions')
```

### M2. `deleteDerivableFiles` — no test coverage

**File:** `server/src/utils/renameRecording.ts` (line 126)
**Exports:** `deleteDerivableFiles`
**Risk:** Still used by regen-shadow and regen-chapter endpoints. It deletes shadow + 5 transcript extensions + chapter video. If it silently fails on non-ENOENT errors, files accumulate.

**Suggested tests:**
```ts
it('calls fs.unlink for shadow (.mp4) and 5 transcript extensions')
it('calls deleteChapterVideo for the matching chapter')
it('swallows ENOENT but logs non-ENOENT errors')
it('does not throw when all files are missing (all ENOENT)')
```

### M3. `regenerateDerivableFiles` — no test coverage

**File:** `server/src/utils/renameRecording.ts` (line 264)
**Risk:** Used by regen endpoints. Creates shadow file and optionally queues transcription. Currently mocked everywhere but never tested in isolation.

### M4. Bulk-rename endpoint — no negative-path integration tests

**File:** `server/src/test/manage.test.ts`
**Status:** The undo-rename tests call bulk-rename as setup, but there are no dedicated tests for the bulk-rename endpoint itself:
- Missing: empty `files` array returns error
- Missing: invalid `label` returns error
- Missing: unparseable filename in the array is skipped with error
- Missing: partial failure (some files rename, some fail) returns mixed results
- Missing: `sequenceMode: 'renumber'` with `sequenceStart` produces correct filenames

**Suggested tests:**
```ts
describe('POST /api/manage/bulk-rename', () => {
  it('returns error when files array is empty')
  it('returns error when label is missing')
  it('handles unparseable filenames gracefully')
  it('renumber mode assigns sequential numbers from sequenceStart')
  it('emits recordings:changed socket event on success')
  it('returns partial success when some renames fail')
  it('preserves tags from request body in built filenames')
})
```

### M5. Split-chapter — missing partial-failure test

The split-chapter tests cover happy paths and validation guards well, but there is no test for what happens when `renameRecording` fails mid-cascade. If the 2nd of 3 cascade renames fails, does the endpoint report partial success? Does it leave the undo mapping in a usable state?

**Suggested test:**
```ts
it('reports partial success when cascade rename fails mid-operation', async () => {
  // First cascade succeeds, second fails
  mockRenameRecording
    .mockResolvedValueOnce({ success: true })
    .mockResolvedValueOnce({ success: false, error: 'EACCES' });
  // Verify response includes error and correct filesMoved count
})
```

### M6. Undo-rename — does not test socket event emission

The undo-rename tests verify `filesReverted` and mapping behavior, but never assert that `io.emit('recordings:changed')` is called on success. The split-chapter tests do verify this (line 540), but undo-rename does not.

**Suggested test:**
```ts
it('emits recordings:changed socket event after successful undo', async () => {
  // ... setup bulk rename then undo ...
  expect(mockIo.emit).toHaveBeenCalledWith('recordings:changed');
})
```

---

## MINOR GAPS

### m1. `renameRecording` test — mock count fragility

**File:** `server/src/test/renameRecording.test.ts` (lines 382-401, 406-425)
**Issue:** Tests rely on exact call counts (6 derivatives + 1 core = 7 calls) to distinguish phases. If a new transcript extension is added (e.g., `.ass` for subtitles), these tests break silently. Consider asserting on called-with arguments rather than positional call counts.

### m2. `deleteChapterVideo` — does not test `.srt` deletion when file is missing

The test at line 638 checks that `.srt` companion is deleted, but does not test the case where the `.srt` does not exist (ENOENT on unlink). If `unlink` throws for the `.srt`, does it propagate or swallow?

### m3. `makePaths()` helper duplicated 4 times

The `makePaths()` factory function is copy-pasted across `renameRecording`, `renameDerivableFiles`, `deleteChapterVideo` describe blocks, and `manage.test.ts`. This should be extracted to a shared test fixture to reduce maintenance burden.

### m4. `manage.test.ts` — `createApp()` does not expose `getActiveJob`/`getQueue` overrides

All tests use the default `getActiveJob: () => null` and `getQueue: () => []`. There is no test that verifies split-chapter or undo-rename correctly block when a file is being transcribed. This is an edge case but could cause data corruption.

### m5. `renameRecording` test — no test for same-name rename (no-op)

What happens when `oldFilename === newFilename`? The implementation probably renames to itself, which is wasteful but not harmful. A guard test would document expected behavior.

### m6. `checkTranscriptionQueue` — comment on line 67 contradicts assertion

The comment says "Base of 'intro.mp4' != base of '01-1-intro' so this should be false (different base)" but the assertion expects `true`. The test is correct (comparing without extension), but the comment is misleading.

---

## POSITIVE PATTERNS

### P1. Immutability assertions

Both `migrateRecordingKey` and `updateManifestFilename` tests explicitly verify the original state is not mutated (lines 108-115, 212-226). This is excellent practice for state management functions.

### P2. Supertest integration for endpoints

`manage.test.ts` uses supertest with a real Express app and router, not just function calls. This catches middleware issues, JSON parsing, and status code problems that unit tests miss.

### P3. Reverse-order undo verification

The test at line 216 explicitly verifies that undo happens in reverse order (last renamed file undone first). This catches a real collision bug where forward-order undo would fail when filenames overlap.

### P4. Cascade order verification

Split-chapter tests verify descending cascade order (ch07 before ch06 before ch05) which prevents filename collision during rename. This is the kind of ordering bug that only shows up in production.

### P5. ENOENT handling differentiation

`renameDerivableFiles` tests distinguish between ENOENT (swallowed — file simply didn't exist) and EPERM (thrown — real permission error). This is critical for rename reliability.

### P6. Boundary guard for chapter 99

Split-chapter tests verify that cascading past chapter 99 is rejected. This prevents data loss from truncated chapter numbers.

### P7. Solid edge case coverage for pure functions

`checkTranscriptionQueue`, `migrateRecordingKey`, and `updateManifestFilename` have thorough edge case coverage: empty inputs, missing keys, multiple entries, no-op cases, and cross-format comparisons.

---

## Summary

| Category | Count | Key Action |
|----------|-------|------------|
| Critical | 5 | Add client component tests (C3, C4 highest priority) |
| Major | 6 | Add bulk-rename endpoint tests (M4), test `renameCoreFiles` directly (M1) |
| Minor | 6 | Refactor shared helpers (m3), fix misleading comment (m6) |
| Positive | 7 | Good immutability, integration, ordering, and boundary patterns |

**Recommended priority order:**
1. **C3 + C4** — EditableFileRow and BatchToolbar contain validation logic that users interact with directly
2. **M4** — Bulk-rename is the most-used endpoint but has zero dedicated tests
3. **M1** — `renameCoreFiles` state migration is tested only through mocked dependencies
4. **C2** — Hook tests are lower priority since the server endpoints they wrap are well-tested
5. **C5** — PreviewPanel is display-only, lowest risk
