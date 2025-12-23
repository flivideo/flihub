# FR-106: Incoming Video Preview

**Created:** 2025-12-19
**Status:** Pending

## Problem Statement

Currently, to preview an incoming video before deciding to rename or discard it, users must:
1. Open the file in Finder (leaves the app), OR
2. Rename it → Go to Watch tab → Watch it → If unwanted: Return to Incoming → Undo → Delete

This multi-step workflow is frustrating, especially when reviewing multiple takes to find the best one.

## Goal

Enable video playback directly on the Incoming page so users can quickly preview files before making rename/discard decisions.

---

## UX Design Decision

### Options Considered

| Option | Description | Verdict |
|--------|-------------|---------|
| **Modal Video Player** | Full-screen overlay modal with video player | **SELECTED** |
| Inline Expansion | FileCard expands to show embedded video | Too disruptive, limited space |
| Side Panel | Video plays in sidebar while list visible | Complex layout, not used elsewhere |
| New Tab/Page | Separate preview page | Too many clicks, loses context |

### Why Modal?

1. **Consistency**: Matches existing modal patterns (TranscriptModal, FileViewerModal)
2. **Focus**: User watches video without distractions
3. **No Layout Disruption**: File list remains unchanged
4. **Easy Dismiss**: Click outside or Escape key to close
5. **Reuses Patterns**: Leverages WatchPage video player logic

---

## Detailed Specification

### 1. Trigger Mechanism

Add a **Play button** to each FileCard:

```
┌─────────────────────────────────────────────────────────────────┐
│  Ecamm Live Recording 2024-12-19...mov                          │
│  2 minutes ago                                       1:23  42MB │
│                                                                 │
│  Will rename to: 01-1-intro.mov                                 │
│                                                                 │
│            [▶ Preview]     [Discard]     [Rename]               │
│                  ↑                                              │
│               NEW BUTTON                                        │
└─────────────────────────────────────────────────────────────────┘
```

**Button Spec:**
- Label: "▶ Preview" or just "▶" icon
- Position: Left of Discard button (action group)
- Style: Neutral gray, hover to blue (non-destructive action)
- Keyboard: No shortcut needed (Rename is the primary action)

### 2. Modal Design

```
┌─────────────────────────────────────────────────────────────────┐
│                         BACKDROP (dark, click to close)         │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Ecamm Live Recording 2024-12-19 at 14.32.15.mov      [X] │  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │                                                           │  │
│  │                                                           │  │
│  │                    ┌─────────────────┐                    │  │
│  │                    │                 │                    │  │
│  │                    │   VIDEO PLAYER  │                    │  │
│  │                    │   (16:9 ratio)  │                    │  │
│  │                    │   with controls │                    │  │
│  │                    │                 │                    │  │
│  │                    └─────────────────┘                    │  │
│  │                                                           │  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │  ▶/⏹  1:23 | 42MB        Speed: [1x][1.5x][2x][2.5x][3x] │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Modal Spec:**
- Width: `max-w-4xl` (matches Watch page normal size, ~896px)
- Max Height: `90vh` to ensure it fits on screen
- Backdrop: `bg-black/60` with click-to-close
- Escape key: Close modal
- Video player: Native HTML5 with browser controls
- Aspect ratio: 16:9 with `object-contain`
- **Autoplay**: Video begins playing automatically when modal opens

### 3. Controls Bar

Below the video, show:

**Left side:**
- Play/Pause toggle (▶/⏹)
- Duration display (e.g., "1:23")
- File size (e.g., "42MB")

**Right side:**
- Speed presets: 1x, 1.5x, 2x, 2.5x, 3x (buttons, default 2x)
- Persist speed preference to localStorage (share with Watch page)

### 4. Video Streaming (Backend)

**New Endpoint Required:**

```
GET /api/video/incoming/:filename
```

This endpoint streams files from the watch directory (ecamm folder).

**Security:**
- Validate filename (no path traversal)
- Only serve `.mov` and `.mp4` files
- Must be a file that exists in the watch directory

**Implementation:**
- Add to `server/src/routes/video.ts`
- Use same Range request support as existing video endpoint
- Get watch directory path from config

---

## Implementation Guide

### Phase 1: Backend - Incoming Video Endpoint

**File: `server/src/routes/video.ts`**

Add this new route handler AFTER the existing `/:projectCode/:folder/:filename` route, before `return router;`.

**Important:** Route order matters in Express. The `/incoming/:filename` route must come AFTER the `/:projectCode/:folder/:filename` route because Express matches routes in order. If `/incoming/:filename` came first, requests like `/b85/recordings/video.mov` would incorrectly match with `incoming` as the filename.

Find this pattern and add the new route after it:
```typescript
  });

  return router;
}
```

```typescript
  /**
   * FR-106: GET /incoming/:filename
   * Stream an incoming video file from the watch directory
   * Supports Range requests for seeking
   */
  router.get('/incoming/:filename', async (req: Request, res: Response) => {
    const { filename } = req.params;

    // Security: Validate filename - no path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      res.status(400).json({ success: false, error: 'Invalid filename' });
      return;
    }

    // Only allow video files
    const ext = path.extname(filename).toLowerCase();
    if (!['.mov', '.mp4'].includes(ext)) {
      res.status(400).json({ success: false, error: 'Invalid file type' });
      return;
    }

    try {
      const config = getConfig();
      const watchDir = expandPath(config.watchDirectory);
      const videoPath = path.join(watchDir, filename);

      // Verify file exists
      if (!await fs.pathExists(videoPath)) {
        res.status(404).json({ success: false, error: 'Video not found' });
        return;
      }

      // Get file stats
      const stat = await fs.stat(videoPath);
      const fileSize = stat.size;

      // Determine MIME type
      const contentType = VIDEO_MIME_TYPES[ext] || 'video/mp4';

      // Handle Range requests for seeking
      const range = req.headers.range;

      if (range) {
        // Parse Range header
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        // Validate range
        if (start >= fileSize || end >= fileSize) {
          res.status(416).header('Content-Range', `bytes */${fileSize}`).end();
          return;
        }

        const chunkSize = end - start + 1;

        res.status(206);
        res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Content-Length', chunkSize);
        res.setHeader('Content-Type', contentType);

        // Stream the requested chunk
        const stream = fs.createReadStream(videoPath, { start, end });
        stream.pipe(res);
      } else {
        // No Range header - serve entire file
        res.setHeader('Content-Length', fileSize);
        res.setHeader('Content-Type', contentType);
        res.setHeader('Accept-Ranges', 'bytes');

        const stream = fs.createReadStream(videoPath);
        stream.pipe(res);
      }
    } catch (error) {
      console.error('Error streaming incoming video:', error);
      res.status(500).json({ success: false, error: 'Failed to stream video' });
    }
  });
```

**Key Points:**
- Route: `/api/video/incoming/:filename`
- Uses `config.watchDirectory` as base path (the ecamm dropbox folder)
- Same Range request handling for seeking as existing endpoint
- Security: No path traversal, video files only (.mov, .mp4)

### Phase 2: Frontend - IncomingVideoModal Component

**New File: `client/src/components/IncomingVideoModal.tsx`**

```typescript
/**
 * FR-106: Incoming Video Preview Modal
 *
 * Modal video player for previewing incoming files before rename/discard.
 * Reuses video player patterns from WatchPage.
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { API_URL } from '../config'
import { formatDuration, formatFileSize } from '../utils/formatting'
import type { FileInfo } from '../../../shared/types'

// Speed presets (shared with WatchPage)
const SPEED_PRESETS = [1, 1.5, 2, 2.5, 3]
const DEFAULT_SPEED = 2

// localStorage key (shared with WatchPage for consistency)
const SPEED_STORAGE_KEY = 'flihub:watch:playbackSpeed'

interface IncomingVideoModalProps {
  file: FileInfo
  onClose: () => void
}

export function IncomingVideoModal({ file, onClose }: IncomingVideoModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(() => {
    const saved = localStorage.getItem(SPEED_STORAGE_KEY)
    return saved ? parseFloat(saved) : DEFAULT_SPEED
  })

  // Build video URL
  const videoUrl = `${API_URL}/api/video/incoming/${encodeURIComponent(file.filename)}`

  // Apply playback speed
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed
    }
  }, [playbackSpeed])

  // Handle speed change
  const handleSpeedChange = useCallback((speed: number) => {
    setPlaybackSpeed(speed)
    localStorage.setItem(SPEED_STORAGE_KEY, speed.toString())
    if (videoRef.current) {
      videoRef.current.playbackRate = speed
    }
  }, [])

  // Handle play/pause toggle
  const handlePlayPause = useCallback(() => {
    if (!videoRef.current) return
    if (isPlaying) {
      videoRef.current.pause()
    } else {
      videoRef.current.play()
    }
  }, [isPlaying])

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
          <h3 className="font-medium text-gray-800 truncate pr-4">
            {file.filename}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
            title="Close (Escape)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Video Player */}
        <div className="bg-black" style={{ aspectRatio: '16/9' }}>
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            autoPlay
            className="w-full h-full object-contain"
            onLoadedMetadata={() => {
              if (videoRef.current) {
                videoRef.current.playbackRate = playbackSpeed
              }
            }}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
          />
        </div>

        {/* Controls Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
          {/* Left: Play/Pause + Info */}
          <div className="flex items-center gap-4">
            <button
              onClick={handlePlayPause}
              className={`text-lg transition-colors ${
                isPlaying
                  ? 'text-red-500 hover:text-red-600'
                  : 'text-blue-500 hover:text-blue-600'
              }`}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? '⏹' : '▶'}
            </button>
            <span className="font-mono text-sm text-gray-600">
              {formatDuration(file.duration)}
            </span>
            <span className="text-sm text-gray-400">|</span>
            <span className="text-sm text-gray-600">
              {formatFileSize(file.size)}
            </span>
          </div>

          {/* Right: Speed Controls */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">Speed:</span>
            <div className="flex gap-1">
              {SPEED_PRESETS.map((speed) => (
                <button
                  key={speed}
                  onClick={() => handleSpeedChange(speed)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    playbackSpeed === speed
                      ? 'bg-blue-600 text-white font-medium'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

### Phase 3: Frontend - Update FileCard

**File: `client/src/components/FileCard.tsx`**

**Step 3a: Add import at top of file (after existing imports, around line 7):**

```typescript
import { IncomingVideoModal } from './IncomingVideoModal'
```

**Step 3b: Add state variable (inside FileCard component, around line 33):**

```typescript
// FR-106: State for video preview modal
const [showPreview, setShowPreview] = useState(false)
```

**Step 3c: Replace the button group section (lines 155-169) with this:**

```typescript
        <div className="flex gap-2">
          {/* FR-106: Preview button */}
          <button
            onClick={() => setShowPreview(true)}
            disabled={isLoading}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
            title="Preview video"
          >
            ▶
          </button>
          <button
            onClick={handleDiscard}
            disabled={isLoading}
            className="px-3 py-1.5 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
          >
            {trashMutation.isPending ? 'Trashing...' : 'Discard'}
          </button>
          <button
            onClick={handleRename}
            disabled={isLoading || !chapter || !name}
            className="px-4 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {renameMutation.isPending ? 'Renaming...' : 'Rename'}
          </button>
        </div>
```

**Step 3d: Add modal at end of component (just before the final closing `</div>` around line 173):**

```typescript
      {/* FR-106: Video preview modal */}
      {showPreview && (
        <IncomingVideoModal
          file={file}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  )
}
```

**Complete FileCard.tsx diff summary:**
1. Line 7: Add `import { IncomingVideoModal } from './IncomingVideoModal'`
2. Line ~33: Add `const [showPreview, setShowPreview] = useState(false)`
3. Lines 155-169: Replace button group to include Preview button
4. Before final `</div>`: Add modal render

---

## Implementation Checklist

### Backend
- [ ] Add `/api/video/incoming/:filename` route in `server/src/routes/video.ts`
- [ ] Validate filename (no path traversal, video files only)
- [ ] Use `config.watchDirectory` as base path
- [ ] Support Range requests for seeking
- [ ] Test: Can stream a file from watch directory

### Frontend
- [ ] Create `IncomingVideoModal.tsx` component
- [ ] Video player with 16:9 aspect ratio
- [ ] Speed controls (1x, 1.5x, 2x, 2.5x, 3x) - shared preference with Watch page
- [ ] Play/Pause button
- [ ] Duration and file size display
- [ ] Click-outside-to-close and Escape key support
- [ ] Add Preview button to FileCard
- [ ] Integrate modal with FileCard state

### Testing
- [ ] Preview button appears on all incoming files
- [ ] Modal opens with correct video
- [ ] **Video autoplays when modal opens**
- [ ] Video plays with seeking support
- [ ] Speed controls work and persist
- [ ] Modal closes on backdrop click
- [ ] Modal closes on Escape key
- [ ] Modal closes on X button
- [ ] After closing, can preview again
- [ ] Works with multiple incoming files

---

## Edge Cases

1. **File deleted while modal open**: Modal should handle video error gracefully
2. **Very long filenames**: Truncate in header with title tooltip
3. **No incoming files**: Preview button won't show (no files = no cards)
4. **Video load failure**: Show error message in video area
5. **Large files**: Range requests ensure efficient streaming

---

## Future Enhancements (Out of Scope)

- Quick rename/discard buttons in modal
- Keyboard shortcuts for speed changes
- Picture-in-picture support
- Comparison view for multiple takes
- Waveform visualization

---

## Related

- FR-70: Watch Page (video player patterns)
- FR-71: Watch Page Enhancements (speed controls)
- FileCard component (trigger location)
- FileViewerModal (modal patterns)

---

## Completion Notes

**What was done:**
- Added `/api/video/incoming/:filename` endpoint to stream videos from watch directory
- Created `IncomingVideoModal.tsx` component with video player, speed controls, and file info
- Added Preview button (▶) to FileCard component
- Integrated modal with FileCard state

**Files changed:**
- `server/src/routes/video.ts` (modified) - Added incoming video endpoint with Range support
- `client/src/components/IncomingVideoModal.tsx` (new) - Video preview modal component
- `client/src/components/FileCard.tsx` (modified) - Added Preview button and modal integration

**Testing notes:**
- Preview button appears on all incoming file cards
- Modal opens with video autoplay
- Speed controls work and persist to localStorage (shared with Watch page)
- Seeking works via Range request support
- Modal closes on backdrop click, X button, or Escape key
- Security: Path traversal blocked, only .mov/.mp4 allowed

**Status:** Complete
