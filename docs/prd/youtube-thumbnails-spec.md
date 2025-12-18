# YouTube Thumbnails Page - Specification

## Overview

A dedicated page for managing YouTube thumbnail options. Thumbnails are typically downloaded as a ZIP file from Canva containing 3-4 design variants. The creator reviews, selects up to 3, reorders them, and saves to `assets/thumbs/`.

---

## Problem Statement

**Current workflow:**
1. Design thumbnails in Canva (usually 3-4 options)
2. Download as ZIP (Canva bundles multiple exports)
3. Manually extract ZIP
4. Manually rename to `thumb-1.jpg`, `thumb-2.jpg`, `thumb-3.jpg`
5. Manually move to project's `assets/thumbs/` folder

**Pain points:**
- Manual extraction and renaming is tedious
- No easy way to preview and compare options
- No easy way to reorder after deciding
- YouTube only allows 3 custom thumbnails, need to pick best 3

---

## Folder Structure

```
project/
├── recordings/
└── assets/
    ├── images/       # B-roll images (existing)
    └── thumbs/       # YouTube thumbnails (this feature)
        ├── thumb-1.jpg
        ├── thumb-2.jpg
        └── thumb-3.jpg
```

---

## Naming Convention

Simple sequential naming:
```
thumb-1.jpg
thumb-2.jpg
thumb-3.jpg
```

- Always `thumb-{n}` where n is 1, 2, or 3
- Extension preserved from original (`.jpg`, `.png`, `.webp`)
- Order reflects preference (thumb-1 = primary choice)
- Maximum 3 thumbnails (YouTube limit)

---

## UI Design

### Navigation

Add "Thumbs" to header navigation:
```
[Incoming] [Recordings] [Assets] [Thumbs] [Projects] [Config]
```

### Page Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Thumbs                                                    [S] [M] [L] [XL] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  IMPORT FROM ZIP                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  📦 b64-thumbnail.zip                                               │    │
│  │  4 images found                              [Preview →]  [🗑]      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  No other ZIP files found in ~/Downloads                                    │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  THUMBNAILS (assets/thumbs/)                          Max 3 for YouTube     │
│                                                                              │
│  ⋮⋮ [thumb-1.jpg]  thumb-1.jpg    312 KB                           [🗑]    │
│  ⋮⋮ [thumb-2.jpg]  thumb-2.jpg    291 KB                           [🗑]    │
│  ⋮⋮ [thumb-3.jpg]  thumb-3.jpg    176 KB                           [🗑]    │
│   ↑                                                                          │
│   drag handle                                                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Import Flow

### Step 1: Detect ZIP

- Scan Downloads folder for `.zip` files
- Show ZIP files that contain images
- Display: filename, image count

### Step 2: Preview ZIP Contents

Click "Preview →" to see what's inside:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Import from b64-thumbnail.zip                                    [Cancel]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Select thumbnails to import (max 3):                                        │
│                                                                              │
│  [✓] [thumb]  2.jpg           383 KB                                        │
│  [✓] [thumb]  3.jpg           313 KB                                        │
│  [✓] [thumb]  4.jpg           176 KB                                        │
│  [ ] [thumb]  concept-1.jpg   291 KB                                        │
│                                                                              │
│  3 of 4 selected                                                             │
│                                                                              │
│                                                    [Import Selected]         │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Behavior:**
- Show all images in ZIP as thumbnail list
- Checkbox to select/deselect
- Max 3 selection enforced (disable checkbox when 3 selected)
- Order of selection = order of import (first selected = thumb-1)

### Step 3: Import

Click "Import Selected":
1. Extract selected images from ZIP to temp location
2. Rename to `thumb-1.jpg`, `thumb-2.jpg`, `thumb-3.jpg` (based on selection order)
3. Move to `assets/thumbs/`
4. Create `assets/thumbs/` directory if it doesn't exist
5. Toast: "Imported 3 thumbnails"
6. After successful import, show checkbox option: "Delete ZIP file after import"

---

## Thumbnail Management

### Display

- List view with thumbnail preview
- Same size toggle as Assets page (S/M/L/XL)
- Shift+Hover for large preview (reuse existing)
- Show filename and file size

### Reorder (Drag & Drop)

- Drag handle on left side of each row
- Drag up/down to reorder
- On drop: files are renamed to match new order
  - If you drag thumb-3 to position 1, it becomes thumb-1
  - Others shift accordingly

**Example:**
```
Before drag:          After dropping thumb-3 to top:
thumb-1.jpg           thumb-1.jpg (was thumb-3)
thumb-2.jpg           thumb-2.jpg (was thumb-1)
thumb-3.jpg           thumb-3.jpg (was thumb-2)
```

### Delete

- Delete button on each row
- Deletes file from `assets/thumbs/`
- Remaining files renumber automatically
  - Delete thumb-2 → thumb-3 becomes thumb-2

---

## API Design

### GET /api/thumbs/zips

List ZIP files in Downloads that contain images.

**Response:**
```json
{
  "zips": [
    {
      "path": "/Users/.../Downloads/b64-thumbnail.zip",
      "filename": "b64-thumbnail.zip",
      "imageCount": 4,
      "size": 1165754
    }
  ]
}
```

### GET /api/thumbs/zip/:filename/contents

List images inside a ZIP file.

**Response:**
```json
{
  "filename": "b64-thumbnail.zip",
  "images": [
    { "name": "2.jpg", "size": 383618 },
    { "name": "3.jpg", "size": 313218 },
    { "name": "4.jpg", "size": 176823 },
    { "name": "concept-1.jpg", "size": 291321 }
  ]
}
```

### POST /api/thumbs/import

Import selected images from ZIP.

**Request:**
```json
{
  "zipPath": "/Users/.../Downloads/b64-thumbnail.zip",
  "selectedImages": ["2.jpg", "3.jpg", "4.jpg"],
  "deleteZipAfter": false
}
```

**Response:**
```json
{
  "success": true,
  "imported": ["thumb-1.jpg", "thumb-2.jpg", "thumb-3.jpg"]
}
```

### GET /api/thumbs

List current thumbnails.

**Response:**
```json
{
  "thumbs": [
    { "filename": "thumb-1.jpg", "size": 383618, "path": "..." },
    { "filename": "thumb-2.jpg", "size": 313218, "path": "..." },
    { "filename": "thumb-3.jpg", "size": 176823, "path": "..." }
  ]
}
```

### POST /api/thumbs/reorder

Reorder thumbnails.

**Request:**
```json
{
  "order": ["thumb-3.jpg", "thumb-1.jpg", "thumb-2.jpg"]
}
```

**Response:**
```json
{
  "success": true,
  "thumbs": ["thumb-1.jpg", "thumb-2.jpg", "thumb-3.jpg"]
}
```

### DELETE /api/thumbs/:filename

Delete a thumbnail.

**Response:**
```json
{
  "success": true,
  "remaining": ["thumb-1.jpg", "thumb-2.jpg"]
}
```

### DELETE /api/thumbs/zip/:filename

Delete a ZIP file from Downloads folder.

**Response:**
```json
{
  "success": true,
  "deleted": "b64-thumbnail.zip"
}
```

**Use cases:**
- Clean up after import (if user chose not to delete during import)
- Remove unwanted/old ZIP files cluttering Downloads
- Manual cleanup when ZIP is no longer needed

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| No ZIP files in Downloads | Show "No ZIP files found" message |
| ZIP has no images | Don't show in list, or show with warning |
| ZIP has < 3 images | Allow import of all |
| ZIP has > 3 images | Only allow selecting 3 |
| `assets/thumbs/` doesn't exist | Create on first import |
| Thumbnails already exist | Prompt to replace or add? (TBD) |
| Reorder with only 1 thumb | No drag handle needed |
| Delete last thumbnail | Show empty state |

---

## Future Enhancements (Out of Scope)

1. **Single image import** - Add individual images from Downloads (not ZIP)
2. **Prompt support** - Like images, save prompts for thumbnail concepts
3. **A/B variant naming** - `thumb-1a.jpg`, `thumb-1b.jpg` for sub-variants
4. **Preview in YouTube dimensions** - Show 1280x720 preview frame

---

## Implementation Notes

### Backend

1. **ZIP handling:**
   - Use `unzipper` or `adm-zip` npm package
   - Extract to temp directory, then move to assets
   - Clean up temp files after import

2. **File operations:**
   - Use `fs-extra` for rename/move (atomic operations)
   - Handle file extension preservation

3. **Routes:** Create `server/src/routes/thumbs.ts`

### Frontend

1. **New page:** `client/src/components/ThumbsPage.tsx`

2. **Reuse existing:**
   - Size toggle (S/M/L/XL) from Assets
   - Shift+Hover preview from Assets
   - Toast notifications

3. **New:**
   - ZIP preview modal/section
   - Drag-and-drop reordering (use `@dnd-kit/core` or similar)

4. **Hooks:**
   - `useZipFiles()` - list ZIPs in Downloads
   - `useZipContents(filename)` - preview ZIP contents
   - `useImportFromZip()` - import mutation
   - `useDeleteZip()` - delete ZIP from Downloads
   - `useThumbs()` - list current thumbs
   - `useReorderThumbs()` - reorder mutation
   - `useDeleteThumb()` - delete mutation

---

## Mockup - Full Page

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Recording Namer                                                             │
│  [Incoming] [Recordings] [Assets] [Thumbs] [Projects] [Config]              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Thumbs                                                    [S] [M] [L] [XL] │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  IMPORT FROM ZIP                                                     │    │
│  │                                                                      │    │
│  │  📦 b64-thumbnail.zip (4 images)               [Preview →]  [🗑]   │    │
│  │                                                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  THUMBNAILS (assets/thumbs/)                          Max 3 for YouTube     │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ ⋮⋮ │ [=========] │ thumb-1.jpg          312 KB            │ [🗑] │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │ ⋮⋮ │ [=========] │ thumb-2.jpg          291 KB            │ [🗑] │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │ ⋮⋮ │ [=========] │ thumb-3.jpg          176 KB            │ [🗑] │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  Empty state (when no thumbs):                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                                                                      │    │
│  │                    No thumbnails yet                                 │    │
│  │                                                                      │    │
│  │         Import from a ZIP file above to get started                  │    │
│  │                                                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```
