# FR: Chapter Video Joiner

## Purpose

As a content creator, I want to quickly join all video segments from a specific chapter into a single video file, so I can review the entire chapter flow without switching between files.

## User Story

As a content creator, when I'm working on a video project with multiple chapters and segments, I want to select a chapter and have all its segments automatically joined into a single preview video, so I can:
- Review the chapter as a continuous flow
- Check pacing and transitions between segments
- Quickly assess if reshoots are needed
- Discard the joined file after review (not for final production)

## FliVideo Naming Convention Context

Files follow the pattern: `{chapter}-{segment}-{name}[-{tags}].mov`

Examples:
- `01-1-intro.mov`
- `01-2-main-content.mov`
- `01-3-demo.mov`
- `02-1-intro.mov`
- `02-2-deep-dive.mov`
- `02-3-summary-cta.mov`

## Functional Requirements

**FR-JOIN-1:** As a content creator, I should be able to select a chapter number and have all segments for that chapter automatically identified and listed in sequence order, so I know exactly which files will be joined.

**FR-JOIN-2:** As a content creator, when I trigger the join action for a chapter, all segment videos should be concatenated using ffmpeg into a single file, preserving the original quality (copy codec, no re-encoding), so the process is fast and lossless.

**FR-JOIN-3:** As a content creator, the joined output file should be saved to a `.chapters/` subfolder (sibling to `.trash/`, one level up from recordings) with the naming pattern `{chapter}-{name-from-first-segment}.mov`, so joined files are organized separately from source files.

Example:
- Source: `recordings/01-1-intro.mov`, `recordings/01-2-content.mov`, `recordings/01-3-outro.mov`
- Output: `.chapters/01-intro.mov` (name taken from first segment)

**FR-JOIN-4:** As a content creator, I should see progress/status while joining is in progress, especially for large files, so I know the operation is working.

**FR-JOIN-5:** As a content creator, I should see the total size and estimated duration before joining starts, so I can decide whether to proceed.

**FR-JOIN-6:** As a content creator, if a joined file already exists for a chapter, I should be warned before overwriting, so I don't accidentally lose a previous join.

## Technical Notes

- Use ffmpeg concat demuxer: `ffmpeg -f concat -safe 0 -i filelist.txt -c copy output.mov`
- Requires generating a temporary file list in ffmpeg format:
  ```
  file '/path/to/01-1-intro.mov'
  file '/path/to/01-2-main-content.mov'
  file '/path/to/01-3-demo.mov'
  ```
- All segments must have compatible codecs (typically all from same camera/Ecamm = same encoding)
- `-c copy` = no re-encoding, fast, preserves quality

## UI/UX (for FliHub web interface)

- "Join Chapter" button in the UI (near naming controls or as separate section)
- Chapter selector dropdown showing available chapters with segment counts
- Shows segment count and total size before joining
- Progress indicator during ffmpeg operation
- Success message with path to joined file

## Folder Structure

```
project-folder/
├── recordings/
│   ├── 01-1-intro.mov
│   ├── 01-2-content.mov
│   ├── 01-3-outro.mov
│   ├── 02-1-setup.mov
│   └── 02-2-demo.mov
├── .chapters/          ← joined output goes here
│   ├── 01-intro.mov
│   └── 02-setup.mov
└── .trash/             ← discarded files
    └── ...
```

## CLI Alternative

If implemented as CLI first:
```bash
flivideo-join --chapter 01 --project /path/to/project
flivideo-join --chapter 02 --dry-run  # Preview what would be joined
```

## Out of Scope

- Re-encoding or transcoding
- Adding transitions between segments
- Final production output (this is for review only)
- Joining across chapters
