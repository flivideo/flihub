# FR-58: Chapter Recordings

Generate combined preview videos for each chapter with visual segment markers.

**Date:** 2025-12-13

**Status:** Pending

---

## Overview

Create a `-chapters` folder (alongside `-safe`) that contains combined preview videos for each chapter. Each chapter recording concatenates all segments with purple title slides between them, making it easy to review an entire chapter's flow.

**Purpose:** Quick preview of chapter content without opening files individually, with visual/audio markers for segment transitions.

---

## Output

### Folder Structure

```
recordings/
├── 01-1-intro.mov
├── 01-2-intro.mov
├── 01-3-intro-CTA.mov
├── 03-1-scenario.mov
├── ...
├── -safe/
│   └── ...
└── -chapters/
    ├── 01-intro.mov      ← Combined chapter 1
    ├── 03-scenario.mov   ← Combined chapter 3
    └── ...
```

### File Naming

`{chapter}-{label}.mov`

Where:

- `chapter` = 2-digit chapter number (01, 03, etc.)
- `label` = First label from the chapter (from segment 1), could be multi-word

**Examples:**

- `01-intro.mov`
- `03-agent-mary.mov`
- `10-setup-environment.mov`

**Note:** Label is the descriptive name, NOT the uppercase tags. If `01-1-agent-mary-CTA.mov`, the label is `agent-mary`, not `CTA`.

---

## Video Structure

Each chapter recording is structured as:

```
[Slide 1] → [Segment 1] → [Slide 2] → [Segment 2] → [Slide 3] → [Segment 3] → ...
```

### Title Slides

**Visual:**

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│              BRIGHT PURPLE BACKGROUND                   │
│                                                         │
│                     Segment 2                           │
│                     "intro"                             │
│                    CTA, SKOOL                           │
│                                                         │
│              01:53 → 02:17 (24s)                        │
│                                                         │
│              [2:15 into chapter]                        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Slide content:**
| Element | Description |
|---------|-------------|
| Segment number | "Segment 2" |
| Label | The segment's label in quotes |
| Tags | Uppercase tags from filename (if any) |
| Time range | Start → End timestamp of this segment in combined video |
| Duration | Segment duration in parentheses |
| Cumulative | How far into the chapter video we are |

**Audio:** Subtle beep sound to mark transition

**Duration:** Configurable (default: 1 second, supports float like 1.5)

### Resolution

Default: **1280x720** (lower res for preview purposes)

Configurable - user may want 1920x1080 for specific use cases.

---

## UI

### Trigger Button

On the Recordings page, add a button:

```
┌─────────────────────────────────────────────────────────────────┐
│  Project Recordings                                              │
│  118 files | 1:18:56 | 24 chapters                               │
│                                                                  │
│  [📄 Transcript]  [🎬 Create Chapter Recordings]                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Button behavior:**

- Click → Shows options modal (see below)
- Generates chapter recordings for all chapters (or selected chapter?)

### Options Modal

```
┌─────────────────────────────────────────────────────────────────┐
│  Create Chapter Recordings                                  [✕] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Slide Duration:  [1.0] seconds                                 │
│                                                                  │
│  Resolution:      (•) 720p (1280x720)                           │
│                   ( ) 1080p (1920x1080)                         │
│                                                                  │
│  ☐ Auto-generate when creating new chapter                      │
│                                                                  │
│  Chapters to generate:                                          │
│    (•) All chapters                                             │
│    ( ) Current chapter only: [01 Intro]                         │
│                                                                  │
│                                        [Cancel]  [Generate]     │
└─────────────────────────────────────────────────────────────────┘
```

### Auto-Generate Option

When "Auto-generate when creating new chapter" is checked:

- Pressing the "New Chapter" button triggers generation of the **previous** chapter
- Does NOT auto-generate for the last chapter (no "new chapter" follows outro)

**Example flow:**

1. User is working on chapter 3
2. User clicks "New Chapter" (to start chapter 4)
3. System automatically generates `03-scenario.mov` in `-chapters/`

---

## Configuration

Store in `server/config.json`:

```json
{
  "chapterRecordings": {
    "slideDuration": 1.0,
    "resolution": "720p",
    "autoGenerate": false
  }
}
```

| Setting         | Type    | Default | Description                      |
| --------------- | ------- | ------- | -------------------------------- |
| `slideDuration` | float   | 1.0     | Seconds to show each title slide |
| `resolution`    | string  | "720p"  | "720p" or "1080p"                |
| `autoGenerate`  | boolean | false   | Auto-generate on new chapter     |

---

## Technical Implementation

### FFmpeg Approach

**Step 1: Generate title slide for each segment**

```bash
ffmpeg -f lavfi -i color=c=#8B5CF6:s=1280x720:d=1 \
  -f lavfi -i "sine=frequency=800:duration=0.1" \
  -vf "drawtext=text='Segment 2\nintro\nCTA\n\n01:53 → 02:17 (24s)':fontsize=48:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2" \
  -shortest \
  slide_02.mov
```

**Step 2: Create concat file**

```
file 'slide_01.mov'
file '01-1-intro.mov'
file 'slide_02.mov'
file '01-2-intro.mov'
file 'slide_03.mov'
file '01-3-intro-CTA.mov'
```

**Step 3: Concatenate**

```bash
ffmpeg -f concat -safe 0 -i concat_list.txt \
  -vf "scale=1280:720" \
  -c:v libx264 -preset fast \
  -c:a aac \
  output.mov
```

### Server Endpoint

```
POST /api/chapters/generate
Body: {
  chapter?: string,        // Optional: specific chapter, or all if omitted
  slideDuration?: number,  // Override config
  resolution?: string      // Override config
}

Response: {
  success: boolean,
  generated: string[],     // List of generated files
  errors?: string[]
}
```

### Processing Steps

1. Get list of segments for the chapter (sorted by sequence)
2. Calculate cumulative timestamps for each segment
3. Generate title slide video for each segment
4. Create concat file list
5. Run ffmpeg concat
6. Clean up temp slide files
7. Emit socket event: `chapters:generated`

---

## Edge Cases

| Case                          | Behavior                                     |
| ----------------------------- | -------------------------------------------- |
| Chapter has only 1 segment    | Still generate with single slide + segment   |
| Segment missing duration      | Use ffprobe to get it (already parallelized) |
| Chapter already has recording | Overwrite existing file                      |
| FFmpeg not installed          | Error message, graceful failure              |
| Generation in progress        | Disable button, show progress                |

---

## Files to Create/Modify

| File                                              | Changes                                    |
| ------------------------------------------------- | ------------------------------------------ |
| `server/src/routes/chapters.ts`                   | New: chapter recording generation endpoint |
| `server/src/utils/chapterRecording.ts`            | New: FFmpeg generation logic               |
| `client/src/components/ChapterRecordingModal.tsx` | New: options modal                         |
| `client/src/components/RecordingsView.tsx`        | Add trigger button                         |
| `server/config.json`                              | Add chapterRecordings settings             |

---

## Acceptance Criteria

- [ ] `-chapters` folder created in project
- [ ] Button to trigger chapter recording generation
- [ ] Options modal with slide duration, resolution, auto-generate settings
- [ ] Title slides with purple background, segment info, timestamps
- [ ] Beep sound on each slide transition
- [ ] Configurable slide duration (float, e.g., 1.5)
- [ ] Configurable resolution (720p default, 1080p option)
- [ ] Auto-generate on new chapter (when enabled)
- [ ] Generated file named `{chapter}-{label}.mov`
- [ ] Progress indication during generation
- [ ] Socket event when generation completes

---

## Design Decisions

Decisions made during planning (2025-12-14):

### 1. Progress Feedback: Spinner with Status Text

**Decision:** Simple spinner with chapter-level status updates, not streaming frame progress.

**Rationale:**

- Chapter generation is fast (seconds per chapter)
- Streaming FFmpeg progress adds unnecessary complexity
- Emit socket events at chapter boundaries: "Generating chapter 01..." → "Generating chapter 03..."
- Pattern exists from FR-52 (transcription progress) if streaming needed later

### 2. Font: System Default

**Decision:** Use FFmpeg's default font handling (no custom fonts).

**Rationale:**

- FFmpeg `drawtext` uses system fonts automatically (Helvetica on macOS)
- Avoids bundling font files or cross-platform path issues
- Slides are functional markers, not branded content
- Implementation: `drawtext=text='...':fontsize=48:fontcolor=white` (no `fontfile=` needed)

### 3. Beep Sound: FFmpeg Sine Wave

**Decision:** Generate beep with FFmpeg's built-in audio synthesis.

**Rationale:**

- Zero dependencies - no audio file to bundle
- Consistent across all systems
- Easy to tweak frequency/duration without replacing files
- Implementation: `-f lavfi -i "sine=frequency=800:duration=0.1"`

---

## Future Enhancements (Not in Scope)

- Custom background color
- Custom beep sound
- Include chapter panel data (if FR-56 timestamps available)
- Thumbnail generation from chapter recordings
- Preview before generating
