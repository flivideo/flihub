# FR-94: Transcription Progress State Bugs

**Status:** Implemented
**Added:** 2025-12-16
**Implemented:** 2025-12-16

---

## User Story

As a user, I want the transcription progress display to show accurate status without duplicates or conflicting states.

## Problem

Multiple bugs observed in the transcription progress UI (Project B89):

**Screenshot context:**
```
Transcription Progress
0/5 files (0%)
✓0 complete | ⏳1 active | 📋1 queued | ⚠5 missing

ACTIVE: 02-1-vibe-code-minor-feature.mov

RECENT (all showing ✓):
- 01-1-intro.mov        ← appears TWICE
- 03-1-smart-video-player.mov
- 02-2-vibe-code-minor-feature.mov
- 02-1-vibe-code-minor-feature.mov  ← also shown as ACTIVE
- 01-1-intro.mov        ← duplicate
```

## Bugs Identified

| # | Bug | Symptom |
|---|-----|---------|
| 1 | **Duplicate entries** | `01-1-intro.mov` appears twice in RECENT |
| 2 | **Conflicting status** | `02-1-vibe-code-minor-feature.mov` shows as both ACTIVE and ✓ complete |
| 3 | **Wrong count** | "0/5 files (0%)" but 5 files show ✓ in RECENT |
| 4 | **Unclear "missing"** | "⚠5 missing" meaning unclear when 5 show complete |

## Solution

**Actual root cause:** Broken Whisper command with two `--output_format` flags - only the last one (`srt`) was applied, so no `.txt` files were created.

**Fixes applied:**
1. Fixed Whisper to use `--output_format all` (creates both .txt and .srt)
2. Standardized ALL transcript checks to use `.txt` only:
   - `getTranscriptPath()` - status check
   - `hasTranscriptFile()` - skip logic
   - `getTranscriptSyncStatus()` - progress stats
   - `transcriptSet` in recordings query - badge display
3. Removed shadow folder from transcription scanning
4. Added base name normalization to prevent duplicates
5. Added TXT/SRT toggle in transcript viewer

## Acceptance Criteria

- [x] No duplicate files in RECENT list
- [x] File cannot be both ACTIVE and COMPLETE
- [x] Progress percentage matches actual completion
- [x] "Missing" status clearly explained or removed

## Technical Notes

**Note:** Existing `.srt`-only files in b89 will need re-transcription to create `.txt` files.

## Completion Notes

Implemented 2025-12-16. Root cause was Whisper command format issue. Standardized on `.txt` as the primary transcript indicator across all code paths.
