# FR-70 Product Owner Handover: Video Watch Page

**Status:** Complete
**Date:** 2025-12-14
**Developer:** Claude

---

## Summary

Added a dedicated video playback page to FliHub where users can watch recordings directly in the app. Features a full-width 16:9 video player with an innovative cascading panel system for chapter/segment selection.

---

## What Was Built

### New Files
| File | Purpose |
|------|---------|
| `server/src/routes/video.ts` | Video streaming endpoint with Range request support |
| `client/src/components/WatchPage.tsx` | Video playback page with cascading panels |

### Modified Files
| File | Change |
|------|--------|
| `server/src/index.ts` | Registered video routes |
| `client/src/App.tsx` | Added "Watch" tab (after Recordings) |

---

## Features Delivered

### Video Player
- Full-width 16:9 aspect ratio player
- Native HTML5 controls (play, pause, seek, volume, fullscreen)
- Range request support for smooth seeking (no full download required)
- Auto-play on selection

### Cascading Panel UX
Innovative two-panel slide-out system:

```
┌─────────────────────────────────┬────────────┬──────────────┐
│                                 │  Segments  │   Chapters   │
│         VIDEO PLAYER            │  (hover)   │  (slide-out) │
│                                 │            │              │
│                                 │ 02-1-demo  │ 01 Intro     │
│                                 │ 02-2-demo  │ 02 Demo  ←   │
│                                 │            │ 03 Summary   │
└─────────────────────────────────┴────────────┴──────────────┘
```

**Interaction:**
- Hover right edge → Chapter panel slides out
- Hover a chapter → Segments panel slides out to the left
- Click chapter → Plays chapter recording (from `-chapters/` folder)
- Click segment → Plays individual segment

**Why this pattern:**
- Chapter list stays completely stable (no "pogo stick" jumping)
- Video player gets maximum space
- Two-level hierarchy without nested expansion
- Smooth, predictable animations

---

## Video Sources

| Type | Path | When Available |
|------|------|----------------|
| Individual segment | `recordings/01-1-intro.mov` | Always |
| Chapter recording | `recordings/-chapters/01-intro.mov` | After FR-58 generation |

---

## API Endpoint

```
GET /api/video/:projectCode/:folder/:filename
```

**Parameters:**
- `projectCode` - Project folder name (e.g., `b86-claudemas-01-jump`)
- `folder` - Either `recordings` or `-chapters`
- `filename` - Video file name

**Features:**
- Range request support (206 Partial Content)
- Proper MIME types (.mov, .mp4, .webm)
- Security validation (no path traversal, allowed folders only)

---

## Design Decisions

### Why cascading panels instead of expandable list?
The original implementation used an expandable chapter list where hovering revealed segments inline. This caused the list to jump around as you moved between chapters ("pogo stick effect"). The cascading panel keeps the chapter list stable while showing segments in a separate panel.

### Why not use cascading panels on Recordings page?
Discussion concluded that:
- **Watch page = consumption** → Select one thing to play, video is the workspace
- **Recordings page = management** → Need to see everything, list is the workspace

The cascading panel solves selection, not management. Recordings page is correct as-is.

### Why slide-out panels instead of fixed sidebar?
Maximizes video viewing area. Panels only appear when needed.

---

## Testing Performed

- [x] Video streaming with Range requests (seek works)
- [x] Full file download (no Range header)
- [x] Non-existent file handling (404)
- [x] Invalid folder rejection (400)
- [x] Chapter panel slide-out animation
- [x] Segments panel cascade animation
- [x] Click chapter → plays chapter recording
- [x] Click segment → plays segment
- [x] Now Playing indicator updates correctly

---

## Known Limitations

1. **Chapter recordings require FR-58** - If chapter recordings haven't been generated, clicking a chapter will show a video error (file not found)

2. **No playlist/autoplay next** - Currently plays single video at a time; no automatic progression to next segment

3. **No keyboard shortcuts** - Navigation is mouse-only (could add arrow keys for chapter/segment navigation)

---

## Future Enhancement Ideas

1. **Autoplay next segment** - After video ends, play next segment in chapter
2. **Keyboard navigation** - Up/down arrows for chapters, left/right for segments
3. **Playback speed** - Quick access to 1.5x, 2x playback
4. **Loop segment** - For reviewing specific takes
5. **Mini-player** - Continue playing while browsing other tabs

---

## Acceptance Criteria Status

- [x] New "Watch" tab appears in navigation (after Recordings)
- [x] Video player displays with native controls
- [x] Chapter panel shows all chapters
- [x] Clicking chapter plays chapter recording
- [x] Hovering chapter reveals segments
- [x] Clicking segment plays that video
- [x] Videos stream properly (seek works)

---

## Screenshots

*To capture: Visit http://localhost:5100/#watch*

---

## Sign-off

Ready for product review. The cascading panel UX is a novel pattern that could potentially be reused elsewhere if a similar selection-focused use case emerges.
