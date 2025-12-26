# FR-109: Transcript Management Bugs

**Type:** Bug Fix
**Priority:** High
**Added:** 2025-12-26

---

## Overview

Two related bugs affecting transcript management:

1. **Delete orphaned transcripts fails** - 404 errors when deleting transcripts with dots in filename
2. **Transcripts save to wrong project** - When switching projects during transcription queue, output goes to new project instead of original

Both bugs cause orphaned transcripts to accumulate.

---

## Bug 1: Delete Orphaned Transcripts Fails (404)

### Problem

Clicking "Delete" on an orphaned transcript returns 404 Not Found, even though the file exists.

### Root Cause

The DELETE handler incorrectly uses `path.extname()` on filenames that contain dots in the name portion.

**File:** `server/src/routes/transcriptions.ts:429-430`

```typescript
const baseName = path.basename(filename, path.extname(filename));
const transcriptFilename = `${baseName}.txt`;
```

**Example failure:**
- Input: `filename = "23-1-develop.2.4-read-write-data"` (base name, no extension)
- `path.extname()` returns `".4-read-write-data"` (last dot onwards)
- `baseName` becomes `"23-1-develop.2"` (wrong!)
- Looks for `"23-1-develop.2.txt"` instead of `"23-1-develop.2.4-read-write-data.txt"`

### Fix

The filename from the client is already a base name (no extension). Just append `.txt`:

```typescript
// Before (broken):
const baseName = path.basename(filename, path.extname(filename));
const transcriptFilename = `${baseName}.txt`;

// After (fixed):
const transcriptFilename = `${filename}.txt`;
```

**Location:** `server/src/routes/transcriptions.ts:429-430`

---

## Bug 2: Transcripts Save to Wrong Project

### Problem

When you queue transcriptions for project A, then switch to project B before they complete, the transcripts are saved to project B's `recording-transcripts/` folder instead of project A's.

### Root Cause

The transcripts directory is derived from the **current** config at processing time, not from the video path.

**File:** `server/src/routes/transcriptions.ts:101`

```typescript
const transcriptsDir = getTranscriptsDir();  // Uses current config.projectDirectory
```

This is called inside `processQueue()` when a job **starts**, not when it's **queued**.

### Fix

Derive the transcripts directory from the video path instead of the current config:

```typescript
// Before (broken):
const transcriptsDir = getTranscriptsDir();

// After (fixed):
// Derive transcripts dir from video path (e.g., /path/to/b85-project/recordings/file.mov)
const pathParts = activeJob.videoPath.split(path.sep);
const recordingsIndex = pathParts.indexOf('recordings');
if (recordingsIndex > 0) {
  const projectDir = pathParts.slice(0, recordingsIndex).join(path.sep);
  transcriptsDir = path.join(projectDir, 'recording-transcripts');
} else {
  // Fallback to current config if path structure unexpected
  transcriptsDir = getTranscriptsDir();
}
```

**Location:** `server/src/routes/transcriptions.ts:101`

---

## Testing

### Bug 1 Test
1. Have a project with orphaned transcripts that have dots in the name (e.g., `14-1-develop.1.1-setup.txt`)
2. Open Transcript Sync modal (info icon → View Details)
3. Click Delete on an orphaned transcript
4. **Before:** 404 error
5. **After:** File deleted successfully

### Bug 2 Test
1. Open project A with missing transcripts
2. Click "Transcribe All Missing"
3. Immediately switch to project B
4. Wait for transcriptions to complete
5. **Before:** Transcripts appear in project B
6. **After:** Transcripts appear in project A

---

## Impact

Both bugs cause orphaned transcripts to accumulate:
- Bug 1: Can't delete them
- Bug 2: Creates them in wrong project

Fixing both will allow proper transcript management.

---

## Related

- FR-94: Transcription Progress State Bugs (previous transcript fixes)
- FR-30: Video Transcription (original implementation)

---

## Completion Notes

**What was done:**

Bug 1 (Delete 404):
- Removed broken `path.extname()` logic that failed on filenames with dots
- Filename param is already a base name, just append `.txt` directly

Bug 2 (Wrong project):
- Derive `transcriptsDir` from `activeJob.videoPath` instead of current config
- Parse path to find `recordings/` folder, go up one level, append `recording-transcripts/`
- Fallback to current config if path structure unexpected

**Files changed:**
- `server/src/routes/transcriptions.ts` (lines 101-112, 429-431)

**Testing notes:**
- Bug 1: Delete orphaned transcripts with dots in name (e.g., `14-1-develop.1.1-setup`)
- Bug 2: Queue transcriptions, switch projects, verify output goes to original project

**Status:** Complete
