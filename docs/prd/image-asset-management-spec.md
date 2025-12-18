# Image Asset Management - Specification

## Overview

A new "Assets" page in the Recording Namer app for assigning and organizing images downloaded from external sources (ChatGPT, Midjourney, etc.) into the project's asset structure.

---

## Problem Statement

Images are generated in external systems and downloaded to `~/Downloads`. They need to be:
1. Assigned to specific video chapters/sequences
2. Named consistently with the project naming scheme
3. Moved to the project's `assets/images/` folder
4. Support A/B/C variants for video editor selection

---

## File Naming Convention

```
{chapter}-{seq}-{imgOrder}{variant}-{label}.{ext}
```

| Component | Format | Description |
|-----------|--------|-------------|
| chapter | 2 digits | Chapter number (01-99) |
| seq | 1 digit | Sequence within chapter (1-9), matches video sequence |
| imgOrder | 1 digit | Image order within chapter-seq (1-9) |
| variant | letter (optional) | A/B testing variant (a-z), omit if no variants |
| label | kebab-case | Descriptive label |
| ext | png/jpg/webp | Original file extension preserved |

**Examples:**
```
05-3-1-demonstration-overview.png     # First image for chapter 05, seq 3
05-3-2a-workflow-diagram.png          # Second image, variant A
05-3-2b-workflow-diagram.png          # Second image, variant B
01-1-1-intro-title.png                # Intro chapter image
```

---

## Folder Structure

```
project/
├── recordings/           # Video files
├── assets/
│   ├── images/           # Chapter-related images (this feature)
│   └── thumbs/           # Thumbnails (future, separate naming)
├── .trash/
└── .safe/
```

---

## Configuration

Add to `server/.env` or `config.json`:

```
IMAGE_SOURCE_DIR=~/Downloads
```

Supported file extensions: `.png`, `.jpg`, `.jpeg`, `.webp`

---

## Backend API

### GET /api/assets/incoming
Scan image source directory for pending images.

**Response:**
```json
{
  "images": [
    {
      "path": "/Users/.../Downloads/ChatGPT Image Nov 29....png",
      "filename": "ChatGPT Image Nov 29, 2025, 09_22_59 AM.png",
      "size": 3140257,
      "timestamp": "2025-11-29T09:22:59.000Z",
      "hash": "8d2d7498..."  // For duplicate detection
    }
  ],
  "duplicates": [
    { "keep": "..._09_33_48 AM.png", "duplicate": "..._09_33_50 AM.png" }
  ]
}
```

### GET /api/assets/images
List existing images in project's `assets/images/` folder.

**Response:**
```json
{
  "images": [
    {
      "path": "/path/to/project/assets/images/05-3-1-demo.png",
      "filename": "05-3-1-demo.png",
      "chapter": "05",
      "sequence": "3",
      "imageOrder": "1",
      "variant": null,
      "label": "demo"
    }
  ]
}
```

### GET /api/assets/next-image-order?chapter=05&sequence=3
Calculate next available image order for a chapter-sequence.

**Response:**
```json
{
  "chapter": "05",
  "sequence": "3",
  "nextImageOrder": "2",
  "existingCount": 1
}
```

### POST /api/assets/assign
Assign (rename and move) an image to the project.

**Request:**
```json
{
  "sourcePath": "/Users/.../Downloads/ChatGPT Image....png",
  "chapter": "05",
  "sequence": "3",
  "imageOrder": "1",
  "variant": "a",  // optional, null if no variant
  "label": "workflow-diagram"
}
```

**Response:**
```json
{
  "success": true,
  "oldPath": "...",
  "newPath": "/path/to/project/assets/images/05-3-1a-workflow-diagram.png"
}
```

### DELETE /api/assets/incoming/:encodedPath
Remove an image from incoming (move to trash or delete).

---

## Frontend - Assets Page

### Navigation
- Add "Assets" button/tab to header alongside "Projects" and "Config"
- Route: `/assets` or toggle panel

### Layout

```
┌─────────────────────────────────────────────────────────┐
│  Recording Namer            [Projects] [Assets] [Config]│
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Assignment Controls                              │   │
│  │ Chapter: [05]  Sequence: [3]  Order: [auto: 2]  │   │
│  │ Variant: ( ) None (•) A ( ) B ( ) C             │   │
│  │ Label: [workflow-diagram___________]            │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Incoming Images (~/Downloads)                          │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐         │
│  │ img1 │ │ img2 │ │ img3 │ │ img4 │ │ img5 │         │
│  │      │ │      │ │      │ │      │ │      │         │
│  │ 3.1MB│ │ 3.0MB│ │ 2.7MB│ │ 2.9MB│ │ 3.1MB│         │
│  │[Asgn]│ │[Asgn]│ │[Asgn]│ │[Asgn]│ │[Asgn]│         │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘         │
│                                                         │
│  ⚠ 1 duplicate detected (auto-hidden)                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Interaction Flow

1. User navigates to Assets page
2. Incoming images displayed as thumbnail grid
3. User sets chapter/sequence (could pre-fill from current naming state)
4. Image order auto-calculated based on existing images
5. User enters label (kebab-case, validated)
6. User optionally selects variant (A/B/C) for alternatives
7. Click "Assign" on an image
8. Image moves to `assets/images/` with generated name
9. Next image order recalculates
10. Repeat for remaining images

### Duplicate Handling
- Detect duplicates by file hash (MD5)
- Show warning: "1 duplicate detected"
- Auto-hide duplicates from grid (or show with "Duplicate" badge)
- Option to delete duplicate

---

## Future Enhancements (Out of Scope for POC)

1. **Inline assignment from Incoming page** - Quick-assign images while doing video naming
2. **Inline assignment from Recordings view** - Assign images while viewing chapter list
3. **Drag-drop reordering** - Change image order within a chapter-seq
4. **Bulk assign** - Select multiple images, assign to same chapter with sequential ordering
5. **Thumbnail generation** - Separate `thumbs/` workflow with different naming (thumb-a, thumb-b)
6. **Image preview modal** - Click to see full-size before assigning

---

## Implementation Instructions for Dev Agent

### Phase 1: Backend

1. **Update shared types** (`shared/types.ts`):
   - Add `ImageInfo` interface (path, filename, size, timestamp, hash)
   - Add `ImageAsset` interface (parsed naming components)
   - Add `AssignImageRequest` interface

2. **Add image source config**:
   - Add `IMAGE_SOURCE_DIR` to `.env` (default: `~/Downloads`)
   - Update config loading in `server/src/index.ts`

3. **Create asset routes** (`server/src/routes/assets.ts`):
   - `GET /api/assets/incoming` - scan Downloads for images, detect duplicates
   - `GET /api/assets/images` - list existing project images
   - `GET /api/assets/next-image-order` - calculate next order
   - `POST /api/assets/assign` - rename and move image
   - `DELETE /api/assets/incoming/:path` - trash an incoming image

4. **Register routes** in `server/src/index.ts`

### Phase 2: Frontend

1. **Add hooks** (`client/src/hooks/useAssetApi.ts`):
   - `useIncomingImages()` - fetch incoming images
   - `useProjectImages()` - fetch assigned images
   - `useNextImageOrder(chapter, seq)` - get next order
   - `useAssignImage()` - mutation to assign
   - `useTrashIncomingImage()` - mutation to trash

2. **Create AssetsPage component** (`client/src/components/AssetsPage.tsx`):
   - Assignment controls (chapter, seq, variant, label inputs)
   - Image thumbnail grid
   - Assign button per image
   - Duplicate warning display

3. **Update App.tsx**:
   - Add "Assets" button to header
   - Add state for `showAssets`
   - Conditionally render AssetsPage

### Phase 3: Polish

1. Add validation for label (kebab-case)
2. Add loading states
3. Add error handling with toast notifications
4. Test duplicate detection
5. Ensure `assets/images/` directory is created if missing

---

## Test Data

Current images in `~/Downloads`:
- 13 PNG files from ChatGPT
- 12 unique (1 duplicate pair: 09_33_48 and 09_33_50)
- Sizes: 2.7MB - 3.3MB
- Content: POEM capability diagrams for video B-roll
