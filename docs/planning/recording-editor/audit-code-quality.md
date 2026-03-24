# B047 Recording Editor — Code Quality Audit

**Date:** 2026-03-24
**Auditor:** Senior architect review (Claude Opus 4.6)
**Scope:** All files changed in the B047 Recording Editor campaign

---

## CRITICAL

### C1. Split-chapter cascade loses tags from filenames
**File:** `server/src/routes/manage.ts` line 1481
**Issue:** `buildRecordingFilename(newChapterStr, String(file.sequence), file.name)` is called without passing tags. The `file.name` field comes from `parseRecordingFilename`, which strips tags from the name segment. If the original filename had tags (e.g., `04-3-intro-CTA.mov`), the cascade rename drops the tags entirely, producing `05-3-intro.mov`.
**Impact:** Silent data loss on every file in every cascaded chapter during a split operation. Users will not notice until they inspect filenames later.
**Fix:** Parse tags from the original filename and pass them to `buildRecordingFilename`. Same issue exists at line 1510 where move files are renamed.

### C2. Partial failure in split-chapter leaves filesystem in inconsistent state
**File:** `server/src/routes/manage.ts` lines 1475-1526
**Issue:** The cascade and move operations are not transactional. If any rename fails midway (e.g., disk full, permission error, transcription lock), earlier renames have already been applied. The `undoMapping` is returned to the client but never stored in `lastBatchMapping`, so the server-side undo endpoint cannot revert the split.
**Impact:** A failed split can leave chapters partially renumbered with no automatic recovery path. The user would need to manually rename files to restore order.
**Fix:** Store the `undoMapping` in `lastBatchMapping` before returning, or implement a rollback that reverses successful renames on failure.

### C3. Race condition: undo-rename uses stale filenames after concurrent operations
**File:** `server/src/routes/manage.ts` lines 1300-1343
**Issue:** `lastBatchMapping` is a module-level variable replaced on each bulk rename. If the user performs a bulk rename, then an inline rename on one of those files, then presses Undo, the undo will try to rename `newFilename` back to `oldFilename` but the file no longer has `newFilename` (it was renamed again inline). This produces a confusing ENOENT error.
**Impact:** Undo fails silently or partially, leaving some files reverted and others errored.
**Fix:** Validate that each file still has the expected `newFilename` before attempting the undo revert, and report which files were skipped.

---

## MAJOR

### M1. Regex injection in `deleteChapterVideo`
**File:** `server/src/utils/renameRecording.ts` line 65
**Issue:** `new RegExp(\`^${chapter}-.*\\.(mov|mp4)$\`)` interpolates the `chapter` string directly into a regex without escaping. The `chapter` parameter comes from the filename match `oldFilename.match(/^(\d{2})-/)?.[1]` (line 111), so in practice it will be 2 digits. However, the function is exported and could be called with arbitrary strings from other code paths. If `chapter` ever contains regex metacharacters, it would match unexpected files and delete them.
**Severity note:** Low risk today because callers sanitize, but the function's contract does not enforce this.
**Fix:** Use `escapeRegExp(chapter)` or validate the input at the function boundary.

### M2. `selectAllInChapter` references `filteredRecordings` before it is defined
**File:** `client/src/components/RecordingsView.tsx` lines 613-629 vs 931
**Issue:** `selectAllInChapter` uses `filteredRecordings` (line 615) inside a `useCallback`, but `filteredRecordings` is a `useMemo` defined much later (line 931). This works at runtime because JavaScript closures capture the variable reference (not the value), and the callback is only invoked after render. However, the dependency array (line 628) lists `[data?.recordings, showSafe, showParked]` instead of `[filteredRecordings]`, which means the callback captures a stale closure if `filteredRecordings` changes for reasons other than those three deps.
**Fix:** Move `filteredRecordings` above `selectAllInChapter`, and use `[filteredRecordings]` in the dependency array.

### M3. `handleApplyChanges` parses new filename with fragile regex
**File:** `client/src/components/RecordingsView.tsx` lines 853-857
**Issue:** The regex `/^(\d{2})-\d+-(.+?)(?:-([A-Z0-9]+(?:-[A-Z0-9]+)*))?\.(\w+)$/` attempts to extract chapter, label, and tags from the computed new filename. This is fragile because:
- It cannot distinguish between a label segment containing hyphens and a tag (e.g., `01-1-my-intro-CTA.mov` — is `CTA` a tag or part of the label?).
- It duplicates parsing logic that already exists in `shared/naming.ts`.
**Fix:** Use `parseRecordingFilename` from shared/naming instead of a hand-rolled regex.

### M4. `computePreviewChanges` hardcodes `transcriptCount: 5`
**File:** `client/src/components/RecordingsView.tsx` line 907
**Issue:** Every preview change reports `transcriptCount: 5` regardless of how many transcript files actually exist. This misleads the user about the scope of the rename.
**Fix:** Either query actual transcript counts from the server, or remove the field from the preview display.

### M5. `onBlur` on inline edit triggers `cancelEditing` which discards valid edits
**File:** `client/src/components/shared/EditableFileRow.tsx` lines 199 and 245
**Issue:** The `onBlur={cancelEditing}` on both chapter and name inputs means that if the user clicks the confirm button or any element outside the input, the edit is cancelled before the click registers. This is a common React anti-pattern — `onBlur` fires before `onClick` on adjacent buttons.
**Impact:** Users may find that clicking away from the input (intending to confirm) silently discards their edit.
**Fix:** Use `onBlur` with a `setTimeout` or `onMouseDown` with `preventDefault` on nearby action elements to prevent the race.

### M6. `UndoToast` calls `onExpire` inside `setTimeLeft` updater — stale closure risk
**File:** `client/src/components/shared/UndoToast.tsx` lines 28-33
**Issue:** `onExpire` is captured in the `useEffect` closure via the dependency array, but the interval callback calls `onExpire()` from inside `setTimeLeft`'s updater function. If `onExpire` changes identity between renders (which it will unless the parent wraps it in `useCallback`), the effect re-runs, clearing and restarting the interval, which resets the countdown. Even with the `[onExpire]` dep, the `setTimeLeft` updater always uses the initial `onExpire` from the first effect run.
**Fix:** Use a ref to hold the latest `onExpire` callback, and call `onExpireRef.current()` from the interval.

---

## MINOR

### m1. `availableTags` prop declared but never used in `BatchToolbar`
**File:** `client/src/components/shared/BatchToolbar.tsx` line 21, 38
**Issue:** `availableTags` is in the interface but destructured with a default and never referenced in the component body. Dead prop.

### m2. Unused `generateChapter` variable suppressed with eslint-disable
**File:** `client/src/components/RecordingsView.tsx` lines 348-349
**Issue:** `generateChapter` is imported and assigned but explicitly silenced with `@typescript-eslint/no-unused-vars`. If it is not needed, it should be removed rather than suppressed.

### m3. `pendingOperation` state is set but only used as a truthy check
**File:** `client/src/components/RecordingsView.tsx` lines 373-376, 843
**Issue:** `pendingOperation` stores a structured `{ type, params }` object, but `handleApplyChanges` only checks `if (pendingOperation)` (line 843) — it never reads `type` or `params`. The actual transformation is derived by re-parsing `pendingChanges`. This is dead data that adds complexity without value.
**Fix:** Simplify to a boolean flag, or actually use the operation type to dispatch different apply strategies.

### m4. `SplitMarker` label says "renumbered 1-N" but does not account for sequence preservation
**File:** `client/src/components/shared/SplitMarker.tsx` line 23
**Issue:** The display says files will be "renumbered 1-{fileCount}" but this is a UI label on the client that does not know whether the server will actually renumber. It happens to be correct for the current split implementation, but if the server behavior changes, the label becomes misleading.

### m5. Duplicated `.filter()` calls on `data?.recordings` in batch handlers
**File:** `client/src/components/RecordingsView.tsx` lines 705, 730, 755, 782, 809, 844
**Issue:** Every batch handler re-filters `data?.recordings` with `selectedFiles.has(r.filename)`. This is O(n) per call. With many recordings or rapid interactions it is mildly wasteful, though not a real performance problem at current scale.
**Fix:** Extract a single `selectedRecordings` memo.

### m6. No loading/disabled state on inline rename inputs during mutation
**File:** `client/src/components/shared/EditableFileRow.tsx`
**Issue:** After `confirmEditing()` calls `onInlineRename`, the input disappears immediately (via `cancelEditing()`), but the mutation is async. If the rename fails, the user sees no error — the row just keeps the old name, which may look like their edit was ignored.
**Fix:** Keep the editing state open until the mutation resolves, or show a brief spinner.

### m7. `RecordingsView` component is 1000+ lines
**File:** `client/src/components/RecordingsView.tsx`
**Issue:** The file mixes chapter grouping logic, selection state, batch operation handlers, split logic, inline rename, preview computation, and rendering. This makes it hard to test or modify individual features without risking regressions.
**Fix:** Extract batch editing state and handlers into a custom hook (e.g., `useBatchEditing`), and split the chapter rendering section into a sub-component.

---

## POSITIVE PATTERNS

### P1. Smart rename with in-place derivative file renaming
`server/src/utils/renameRecording.ts` — The two-phase approach (rename derivatives first, then core file + state migration) is well-structured and avoids the old delete-regenerate pattern. The `safeRename` helper that silently ignores ENOENT is a pragmatic choice for optional derivative files.

### P2. Validation at the boundary
Both `EditableFileRow` and `BatchToolbar` validate inputs against `shared/naming.ts` rules (validateChapter, validateLabel) before calling mutation handlers. This prevents invalid filenames from reaching the server.

### P3. Type-safe shared contracts
`SplitChapterRequest`, `SplitChapterResponse`, and `UndoRenameResponse` in `shared/types.ts` provide a clear contract between client and server. The `satisfies` keyword is used correctly in the undo endpoint (manage.ts line 1302, 1342).

### P4. Idempotent change detection
All batch handlers (rename, moveChapter, addTag, removeTag) check `if (newFilename !== file.filename)` before adding to `pendingChanges`, and show "No changes needed" when the preview is empty. This prevents accidental no-op operations.

### P5. Cascade ordering in split-chapter
The split-chapter endpoint sorts cascaded chapters in descending order (line 1449) before renaming, which prevents filename collisions when shifting chapters up by 1. This is the correct approach.

### P6. Clean component decomposition for shared UI
`EditableFileRow`, `BatchToolbar`, `PreviewPanel`, `SplitMarker`, and `UndoToast` are well-scoped, single-responsibility components with clear prop interfaces. The slot pattern for `transcriptionBadge` keeps EditableFileRow decoupled from transcription concerns.

### P7. State migration on rename
`migrateRecordingKey` and `updateManifestFilename` in renameRecording.ts correctly preserve user annotations, parked/safe flags, and edit manifest references when files are renamed. This prevents data loss in the project state file.
