# FR-92: Transcribe All Re-Transcribes Existing Files

**Status:** Implemented
**Added:** 2025-12-16
**Implemented:** 2025-12-16

---

## User Story

As a user, I want "Transcribe All" to skip files that already have transcripts so that I don't waste time re-transcribing my entire project.

## Problem

"Transcribe All" button re-transcribes ALL recordings, including those that already have transcripts.

**Reported scenario:** Project B71 with 3 new recordings. User clicked "Transcribe All" expecting only 3 files to be transcribed, but system is transcribing 113 files.

## Solution

Skip files that already have a corresponding transcript in `recording-transcripts/`.

**Skip logic:**
- For each `.mov`/`.mp4` in `recordings/`
- Check if matching `.txt` exists in `recording-transcripts/`
- Example: `01-1-intro.mov` → skip if `01-1-intro.txt` exists
- Only transcribe files without existing transcripts

## Acceptance Criteria

- [x] "Transcribe All" skips recordings that already have `.txt` transcripts
- [x] UI shows count of files to be transcribed (e.g., "Transcribe 3 new files")
- [x] Previously transcribed files are not re-processed

## Technical Notes

**Root cause:** FR-74 changed `getTranscriptPath()` to require BOTH .txt AND .srt, but older transcripts only have .txt.

**Fix:** Created separate `hasTranscriptFile()` that only checks for .txt existence.

## Completion Notes

Implemented 2025-12-16. Created `hasTranscriptFile()` utility that checks only for .txt existence, separate from `getTranscriptPath()` which checks for both formats.
