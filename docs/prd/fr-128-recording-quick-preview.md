# FR-128: Recording Quick Preview

**Status:** With Developer
**Added:** 2026-01-03
**Implemented:** -
**Dependencies:** None (complements FR-106)

---

## User Story

As a user, I want a play button on each recording row in the Recordings page so I can quickly preview videos without navigating to the Watch page.

---

## Problem

**Current state:**
- Incoming page has play button (▶) on each file that opens a video preview modal
- Recordings page has NO play button - only transcription badges and state actions
- To watch a recording, user must navigate to the Watch page

**Pain points:**
1. **Context switching** - Must leave Recordings page to preview a video
2. **Inconsistent UX** - Incoming page has preview, Recordings page doesn't
3. **Extra clicks** - Navigate to Watch tab, find chapter, click segment
4. **Workflow friction** - When reviewing recordings, quick preview would speed up decisions

---

## Solution

Add a **play button (▶)** at the left side of each recording row that opens a video preview modal.

### Core Features

1. **Play Button Placement**
   - Left side of row, before filename
   - Consistent with Incoming page pattern
   - Disabled for shadow-only files (no local video available)

2. **Video Preview Modal**
   - Reuses IncomingVideoModal pattern
   - Header: filename, close button (X)
   - Video player: 16:9 aspect ratio, HTML5 controls
   - Controls bar: Play/pause button, playback speed buttons
   - Metadata: Duration, file size
   - Escape key closes modal

3. **Playback Speed**
   - Presets: 1x, 1.5x, 2x, 2.5x, 3x (same as Incoming and Watch pages)
   - Default: 2x
   - Persists via localStorage: `flihub:watch:playbackSpeed`
   - Shared across Incoming, Watch, and Recordings preview

4. **Shadow File Handling**
   - Button disabled (grayed out) for shadow-only files
   - Tooltip: "Video not available locally"
   - No modal opens when clicking disabled button

---

## UI Design

### Recording Row (Before)

```
┌─────────────────────────────────────────────────────────────────┐
│ 01-1-intro.mov [CTA]                1:23   2.3 MB   2h ago   T  │
│                                              [→ Safe] [→ Park]   │
└─────────────────────────────────────────────────────────────────┘
```

### Recording Row (After)

```
┌─────────────────────────────────────────────────────────────────┐
│ ▶  01-1-intro.mov [CTA]             1:23   2.3 MB   2h ago   T  │
│                                              [→ Safe] [→ Park]   │
└─────────────────────────────────────────────────────────────────┘
```

**Play button states:**
- Active: Blue ▶ icon, hover shows darker blue
- Disabled (shadow): Gray ▶ icon, cursor shows "not-allowed", tooltip appears

---

### Video Preview Modal

```
┌───────────────────────────────────────────────────────────────┐
│  01-1-intro.mov                                          [✕]  │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│                    [  VIDEO PLAYER  ]                         │
│                     (16:9 aspect)                             │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│  ▶  1:23   |   2.3 MB              Speed: [1x] [1.5x] [2x*]  │
│                                           [2.5x] [3x]         │
└───────────────────────────────────────────────────────────────┘
```

**Modal behavior:**
- Clicking overlay (dark background) closes modal
- Escape key closes modal
- Video starts playing immediately (autoPlay)
- Playback speed applied on load

---

## Acceptance Criteria

### Must Have

**Button Placement:**
- [ ] Play button (▶) appears at left side of each recording row
- [ ] Button positioned before filename text
- [ ] Visual styling matches row aesthetic (blue text, hover state)
- [ ] Button disabled for shadow-only files
- [ ] Disabled button shows tooltip: "Video not available locally"

**Modal Functionality:**
- [ ] Clicking play button opens RecordingVideoModal
- [ ] Modal displays filename in header
- [ ] Video player shows recording with HTML5 controls
- [ ] Video aspect ratio: 16:9 (letterboxed if needed)
- [ ] Video starts playing automatically (autoPlay)
- [ ] Close button (X) in top-right of header

**Playback Controls:**
- [ ] Play/pause button in controls bar
- [ ] Playback speed buttons: 1x, 1.5x, 2x, 2.5x, 3x
- [ ] Active speed highlighted (blue background, white text)
- [ ] Speed changes apply immediately to playing video
- [ ] Default speed: 2x (or last used speed from localStorage)
- [ ] Speed persists to localStorage: `flihub:watch:playbackSpeed`

**Metadata Display:**
- [ ] Duration shown in controls bar (e.g., "1:23")
- [ ] File size shown in controls bar (e.g., "2.3 MB")

**Keyboard Shortcuts:**
- [ ] Escape key closes modal
- [ ] Modal closes when clicking overlay (dark background)

**API Integration:**
- [ ] Video endpoint: `GET /api/video/recordings/:filename`
- [ ] Endpoint serves video from project recordings folder
- [ ] Returns 404 if file not found

### Should Have

- [ ] Loading spinner while video loads
- [ ] Error message if video fails to load
- [ ] Modal transition (fade in/out)

### Nice to Have

- [ ] Space bar toggles play/pause when modal has focus
- [ ] Arrow keys skip forward/backward (10 seconds)
- [ ] Click video player to toggle play/pause
- [ ] Show current playback position / total duration

---

## Technical Notes

### Component Structure

**New file:** `client/src/components/RecordingVideoModal.tsx`

This component is nearly identical to `IncomingVideoModal.tsx` with one key difference:

| Component | Video URL Pattern |
|-----------|-------------------|
| IncomingVideoModal | `${API_URL}/api/video/incoming/${encodeURIComponent(file.filename)}` |
| RecordingVideoModal | `${API_URL}/api/video/recordings/${encodeURIComponent(filename)}` |

**Shared constants:**
```typescript
const SPEED_PRESETS = [1, 1.5, 2, 2.5, 3]
const DEFAULT_SPEED = 2
const SPEED_STORAGE_KEY = 'flihub:watch:playbackSpeed'
```

**Props interface:**
```typescript
interface RecordingVideoModalProps {
  filename: string  // e.g., "01-1-intro.mov"
  onClose: () => void
}
```

---

### API Endpoint

**New endpoint:** `GET /api/video/recordings/:filename`

**Location:** `server/src/routes/video.ts` (add alongside existing `/incoming/:filename`)

**Implementation:**
```typescript
// GET /api/video/recordings/:filename
app.get('/api/video/recordings/:filename', async (req, res) => {
  const { filename } = req.params
  const config = await getConfig()
  const projectPaths = getProjectPaths(config.projectDirectory)

  const videoPath = path.join(projectPaths.recordings, filename)

  if (!fs.existsSync(videoPath)) {
    return res.status(404).json({
      success: false,
      error: 'Video file not found'
    })
  }

  const stat = fs.statSync(videoPath)
  const fileSize = stat.size
  const range = req.headers.range

  // Standard range request handling for video streaming
  // (Same pattern as /incoming/:filename)
  ...
})
```

**Note:** Shadow files not supported for preview - button is disabled for shadow-only recordings.

---

### Files to Modify

| File | Changes |
|------|---------|
| `client/src/components/RecordingVideoModal.tsx` | CREATE - Modal component (clone IncomingVideoModal) |
| `client/src/components/RecordingsView.tsx` | Add play button to row, import RecordingVideoModal, state management |
| `server/src/routes/video.ts` | Add GET /api/video/recordings/:filename endpoint |

---

## Integration with Existing Features

### FR-106 (Incoming Video Preview)

**Relationship:** Complementary feature

**Shared patterns:**
- Same modal design language
- Same playback speed presets and localStorage key
- Same keyboard shortcuts (Escape to close)

**Difference:** Video source location (incoming folder vs recordings folder)

---

### FR-71 (Watch Page)

**Relationship:** Alternative workflow

**Watch page:**
- Dedicated video review experience
- Chapter navigation, segment panels
- Transcript synchronization
- Best for: Deep video review, editing workflow

**Quick preview (this FR):**
- Inline preview on Recordings page
- Fast access, no navigation
- Best for: Quick checks, verify content, spot reviews

**Use cases that prefer quick preview:**
- "Did I say 'um' too much in this one?"
- "Which take had the better intro?"
- "Is this the segment where I mentioned X?"

---

## Future Enhancements

**Phase 2 Features (not in this FR):**

1. **Transcript Overlay**
   - Show synchronized transcript text over video
   - Click word to seek to timestamp
   - Requires: SRT file available

2. **Comparison Mode**
   - Open two recordings side-by-side
   - Compare different takes
   - Use case: Choose best take

3. **Thumbnail Preview on Hover**
   - Hover over play button shows video thumbnail
   - Quick visual cue without opening modal

4. **Share Timestamp**
   - Copy URL with timestamp (for sharing with editor)
   - Example: `flihub://b86/recordings/01-1-intro?t=45`

---

## Related Features

- FR-106: Incoming Video Preview (modal pattern reference)
- FR-71: Watch Page Enhancements (alternative video review workflow)
- FR-88: Shadow Fallback (disabled state for shadow files)

---

## Value Proposition

**User Benefits:**
- **Faster decisions** - Preview without leaving Recordings page
- **Consistent UX** - Same preview capability as Incoming page
- **Workflow efficiency** - Quick spot-checks during review
- **Better context** - See video content while reviewing list

**Developer Benefits:**
- **Code reuse** - Clone existing IncomingVideoModal
- **Simple endpoint** - Standard video streaming pattern
- **Low risk** - No changes to existing video playback logic

---

## Scope Estimate

| Task | Effort | Priority |
|------|--------|----------|
| RecordingVideoModal component | 30 min | High |
| RecordingsView integration | 30 min | High |
| API endpoint | 20 min | High |
| Testing & polish | 20 min | High |

**Total:** ~2 hours

---

## Completion Notes

_To be filled by developer upon completion._
