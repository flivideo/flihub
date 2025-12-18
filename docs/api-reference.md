# FliHub API Reference

Complete reference for all REST API endpoints.

## Base URL

```
http://localhost:5101/api
```

## Response Format

All endpoints return JSON with consistent structure:

**Success:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error message"
}
```

**HTTP Status Codes:**
- `200` - Success
- `206` - Partial Content (video streaming)
- `400` - Bad Request (validation error)
- `404` - Not Found
- `409` - Conflict (file exists)
- `500` - Server Error

---

## Configuration

### GET /api/config

Get current server configuration.

**Response:**
```json
{
  "watchDirectory": "~/Movies/Ecamm Live",
  "projectsRootDirectory": "~/dev/video-projects/v-appydave",
  "activeProject": "b72-project-name",
  "imageSourceDirectory": "~/Downloads",
  "availableTags": ["CTA", "SKOOL"],
  "commonNames": [{ "name": "intro", "autoSequence": 1 }],
  "shadowResolution": 240
}
```

### POST /api/config

Update server configuration.

**Request:**
```json
{
  "watchDirectory": "~/Movies/Ecamm Live",
  "projectsRootDirectory": "~/dev/video-projects/v-appydave",
  "activeProject": "b72-new-project",
  "shadowResolution": 360
}
```

---

## Recording Management

### GET /api/files

List pending files in watch directory (waiting to be renamed).

**Response:**
```json
{
  "files": [
    {
      "path": "/Users/.../Ecamm Live/Movie on 2025-01-15.mov",
      "filename": "Movie on 2025-01-15.mov",
      "size": 524288000,
      "timestamp": "2025-01-15T10:30:00.000Z",
      "duration": 125.5
    }
  ]
}
```

### GET /api/recordings

List all recordings in current project (includes shadows).

**Response:**
```json
{
  "recordings": [
    {
      "filename": "10-5-intro-CTA.mov",
      "path": "/path/to/recordings/10-5-intro-CTA.mov",
      "size": 524288000,
      "timestamp": "2025-01-15T10:30:00.000Z",
      "duration": 125.5,
      "chapter": "10",
      "sequence": "5",
      "name": "intro",
      "tags": ["CTA"],
      "folder": "recordings",
      "isShadow": false,
      "hasShadow": true,
      "shadowSize": 1024000
    }
  ],
  "totalRecordingsSize": 5242880000,
  "totalShadowsSize": 10240000
}
```

### GET /api/suggested-naming

Calculate suggested naming for next recording.

**Response:**
```json
{
  "chapter": "10",
  "sequence": "6",
  "name": "intro",
  "existingFiles": ["10-5-intro-CTA.mov"]
}
```

### POST /api/rename

Rename and move a file to recordings folder.

**Request:**
```json
{
  "originalPath": "/path/to/Ecamm Live/Movie.mov",
  "chapter": "10",
  "sequence": "5",
  "name": "intro",
  "tags": ["CTA"]
}
```

**Response:**
```json
{
  "success": true,
  "oldPath": "/path/to/Ecamm Live/Movie.mov",
  "newPath": "/path/to/recordings/10-5-intro-CTA.mov"
}
```

### DELETE /api/files/:encodedPath

Remove a file from pending list (discard without renaming).

**Path Parameter:** `encodedPath` - URL-encoded file path

### POST /api/trash

Move file to -trash directory.

**Request:**
```json
{
  "path": "/path/to/recordings/10-5-intro.mov"
}
```

### POST /api/recordings/safe

Move file(s) to -safe folder (protected).

**Request:**
```json
{
  "files": ["10-5-intro.mov", "10-6-outro.mov"]
}
```
or
```json
{
  "chapter": "10"
}
```

### POST /api/recordings/restore

Restore file(s) from -safe folder.

**Request:**
```json
{
  "files": ["10-5-intro.mov"]
}
```

### POST /api/recordings/rename-chapter

Rename label for all files in a chapter.

**Request:**
```json
{
  "chapter": "10",
  "currentLabel": "intro",
  "newLabel": "introduction"
}
```

### GET /api/recordings/recent-renames

Get recent renames for undo functionality.

**Response:**
```json
{
  "renames": [
    {
      "id": "abc123",
      "originalName": "Movie.mov",
      "newName": "10-5-intro.mov",
      "timestamp": "2025-01-15T10:30:00.000Z",
      "age": "2 minutes ago"
    }
  ]
}
```

### POST /api/recordings/undo-rename

Undo a recent rename.

**Request:**
```json
{
  "id": "abc123"
}
```

---

## Project Management

### GET /api/projects/stats

Get extended stats for all projects.

**Response:**
```json
{
  "projects": [
    {
      "code": "b72-project-name",
      "path": "/path/to/b72-project-name",
      "priority": "pinned",
      "recordingsCount": 15,
      "safeCount": 3,
      "totalFiles": 18,
      "chapterCount": 5,
      "transcriptCount": 12,
      "transcriptPercent": 80,
      "stage": "recording",
      "imageCount": 8,
      "thumbCount": 3,
      "hasInbox": true,
      "hasAssets": true,
      "hasChapters": true,
      "shadowCount": 15
    }
  ]
}
```

### POST /api/projects

Create a new project.

**Request:**
```json
{
  "code": "b73-new-project"
}
```

### PUT /api/projects/:code/priority

Update project priority (pin/unpin).

**Request:**
```json
{
  "priority": "pinned"
}
```

### PUT /api/projects/:code/stage

Update project stage.

**Request:**
```json
{
  "stage": "first-edit"
}
```

**Valid stages:** `planning`, `recording`, `first-edit`, `second-edit`, `review`, `ready-to-publish`, `published`, `archived`, `auto`

### GET /api/projects/:code/final

Get final video and SRT info.

### GET /api/projects/:code/chapters

Extract chapter timestamps from SRT.

**Response:**
```json
{
  "success": true,
  "chapters": [
    {
      "chapter": "01",
      "name": "Introduction",
      "timestamp": "00:00:00"
    }
  ],
  "formatted": "00:00:00 Introduction\n00:05:30 Chapter 2"
}
```

### POST /api/projects/:code/inbox/write

Write file to inbox subfolder.

**Request:**
```json
{
  "subfolder": "raw",
  "filename": "notes.md",
  "content": "# Project Notes\n..."
}
```

---

## Image/Asset Management

### GET /api/assets/incoming

Scan image source directory for pending images.

**Response:**
```json
{
  "images": [
    {
      "path": "~/Downloads/screenshot.png",
      "filename": "screenshot.png",
      "size": 524288,
      "timestamp": "2025-01-15T10:30:00.000Z"
    }
  ],
  "duplicates": []
}
```

### GET /api/assets/images

List existing images in project.

**Response:**
```json
{
  "images": [
    {
      "filename": "05-3-2a-workflow.png",
      "path": "/path/to/assets/images/05-3-2a-workflow.png",
      "chapter": "05",
      "sequence": "3",
      "imageOrder": "2",
      "variant": "a",
      "label": "workflow"
    }
  ],
  "prompts": [
    {
      "filename": "05-3-2a-workflow.prompt.md",
      "content": "..."
    }
  ]
}
```

### GET /api/assets/next-image-order

Calculate next available image order.

**Query Parameters:**
- `chapter` - Chapter number
- `sequence` - Sequence number

**Response:**
```json
{
  "chapter": "05",
  "sequence": "3",
  "nextImageOrder": "3",
  "existingCount": 2
}
```

### POST /api/assets/assign

Assign an image to the project.

**Request:**
```json
{
  "sourcePath": "~/Downloads/screenshot.png",
  "chapter": "05",
  "sequence": "3",
  "imageOrder": "2",
  "variant": "a",
  "label": "workflow"
}
```

### DELETE /api/assets/incoming/:encodedPath

Remove an incoming image.

### GET /api/assets/image/:encodedPath

Serve an image file (for previews).

### POST /api/assets/prompt

Create/update/delete a prompt file.

**Request:**
```json
{
  "chapter": "05",
  "sequence": "3",
  "imageOrder": "2",
  "variant": "a",
  "label": "workflow",
  "content": "A diagram showing..."
}
```

### POST /api/assets/clipboard/assign

Save clipboard image to assets.

**Request:**
```json
{
  "imageData": "data:image/png;base64,...",
  "chapter": "05",
  "sequence": "3",
  "imageOrder": "2",
  "label": "diagram"
}
```

---

## Thumbnail Management

### GET /api/thumbs/zips

List ZIP files in Downloads containing images.

### GET /api/thumbs/zip/:filename/contents

Preview images in a ZIP file.

### POST /api/thumbs/import

Import selected images from ZIP.

**Request:**
```json
{
  "zipFilename": "thumbnails.zip",
  "selectedImages": ["thumb1.png", "thumb2.png"]
}
```

### GET /api/thumbs

List current thumbnails.

### GET /api/thumbs/image/:filename

Serve a thumbnail image.

### POST /api/thumbs/reorder

Rename files to match new order.

**Request:**
```json
{
  "order": ["thumb2.png", "thumb1.png", "thumb3.png"]
}
```

### DELETE /api/thumbs/:filename

Delete a thumbnail and renumber.

---

## Transcription

### GET /api/transcriptions

Get all transcription state.

**Response:**
```json
{
  "active": {
    "jobId": "job_123",
    "videoPath": "/path/to/video.mov",
    "startedAt": "2025-01-15T10:30:00.000Z"
  },
  "queue": [
    {
      "jobId": "job_124",
      "videoPath": "/path/to/video2.mov",
      "queuedAt": "2025-01-15T10:31:00.000Z"
    }
  ],
  "recent": []
}
```

### GET /api/transcriptions/status/:filename

Get status for specific file.

**Response:**
```json
{
  "filename": "10-5-intro.mov",
  "status": "complete",
  "transcriptPath": "/path/to/10-5-intro.txt"
}
```

**Status values:** `none`, `queued`, `transcribing`, `complete`, `error`

### GET /api/transcriptions/transcript/:filename

Get transcript content.

**Query Parameter:** `format` - `txt` or `srt` (default: `txt`)

**Response:**
```json
{
  "filename": "10-5-intro.txt",
  "content": "Hello and welcome...",
  "formats": {
    "txt": true,
    "srt": true
  },
  "activeFormat": "txt"
}
```

### POST /api/transcriptions/queue

Queue a transcription.

**Request:**
```json
{
  "videoPath": "/path/to/video.mov"
}
```

### POST /api/transcriptions/queue-all

Queue all videos for transcription.

**Request:**
```json
{
  "scope": "project"
}
```
or
```json
{
  "scope": "chapter",
  "chapter": "10"
}
```

### POST /api/transcriptions/combine-chapter

Combine all chapter transcripts.

**Request:**
```json
{
  "chapter": "10"
}
```

---

## Chapter Recording

### GET /api/chapters/config

Get chapter recording configuration.

### PUT /api/chapters/config

Update chapter recording configuration.

**Request:**
```json
{
  "slideDuration": 3,
  "resolution": "1080p",
  "autoGenerate": true,
  "includeTitleSlides": true
}
```

### POST /api/chapters/generate

Generate chapter recordings.

**Request:**
```json
{
  "chapter": "10"
}
```

### GET /api/chapters/status

Get generation status and existing recordings.

---

## Video Streaming

### GET /video/:projectCode/:folder/:filename

Stream a video file with HTTP Range support.

**Path Parameters:**
- `projectCode` - Project code (e.g., `b72-project`)
- `folder` - `recordings`, `-chapters`, `recording-shadows`
- `filename` - Video filename

**Headers:**
- `Range: bytes=0-1024` - For seeking support

---

## Shadow Files

### GET /api/shadows/status

Get shadow status for current project.

**Response:**
```json
{
  "currentProject": {
    "recordings": 15,
    "shadows": 12,
    "missing": 3
  },
  "watchDirectory": {
    "configured": true,
    "exists": true,
    "path": "~/Movies/Ecamm Live"
  }
}
```

### POST /api/shadows/generate

Generate shadows for current project.

### POST /api/shadows/generate-all

Generate shadows for all projects.

---

## First Edit Prep

### GET /api/first-edit/prep

Get first edit prep data.

**Response:**
```json
{
  "success": true,
  "project": "b72-project",
  "glingFilename": "b72-project-gling.txt",
  "glingDictionary": ["AppyDave", "FliVideo"],
  "recordings": [...],
  "recordingsTotal": 15,
  "prepFolder": "/path/to/edits/prep"
}
```

### POST /api/first-edit/create-prep-folder

Create edits/prep folder.

---

## S3 Staging

### GET /api/s3-staging/status

Get S3 staging status.

### POST /api/s3-staging/sync-prep

Copy from edits/prep to s3-staging/prep.

### POST /api/s3-staging/promote

Promote post version to publish.

**Request:**
```json
{
  "version": "v1"
}
```

---

## System Operations

### GET /api/system/health

Health check endpoint.

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "server": "FliHub",
  "port": 5101,
  "project": "b72-project"
}
```

### GET /api/system/environment

Detect server's runtime environment.

**Response:**
```json
{
  "platform": "darwin",
  "isWSL": false,
  "pathFormat": "unix",
  "guidance": "Use forward slashes for paths"
}
```

### POST /api/system/open-folder

Open folder in file explorer.

**Request:**
```json
{
  "folder": "recordings",
  "projectCode": "b72-project"
}
```

**Valid folders:** `ecamm`, `downloads`, `recordings`, `safe`, `trash`, `images`, `thumbs`, `transcripts`, `project`, `final`, `s3Staging`, `inbox`, `shadows`, `chapters`

### POST /api/system/open-file

Open file in default application.

**Request:**
```json
{
  "subfolder": "inbox/raw",
  "filename": "notes.md"
}
```

### GET /api/system/path-exists

Check if path exists.

**Query Parameter:** `path`

### GET /api/system/watchers

Get list of active file watchers.

---

## Query Endpoints

Read-only endpoints optimized for querying.

### GET /api/query/config

Get configuration metadata.

### GET /api/query/projects

List all projects with filtering.

**Query Parameters:**
- `filter` - `pinned`
- `stage` - Filter by stage
- `recent` - Number of recent projects
- `format` - `text` for plain text output

### GET /api/query/projects/:code

Get project detail.

### GET /api/query/projects/:code/recordings

List recordings for a project.

**Query Parameters:**
- `chapter` - Filter by chapter
- `missing-transcripts` - Only show files without transcripts
- `format` - `text` for plain text output

### GET /api/query/projects/:code/transcripts

List transcripts for a project.

### GET /api/query/projects/:code/transcripts/:recording

Get single transcript content.

### GET /api/query/projects/:code/transcripts/:recording/srt

Get SRT subtitle file.

### GET /api/query/projects/:code/chapters

Get chapters with timestamps.

### GET /api/query/projects/:code/images

List images for a project.

### GET /api/query/projects/:code/export

Export combined project data.

**Query Parameters:**
- `include` - Comma-separated: `project,recordings,transcripts,chapters,images`
- `format` - `text` for plain text output

### GET /api/query/projects/:code/inbox

List inbox files and subfolders.

### GET /api/query/projects/:code/inbox/:subfolder/:filename

Read inbox file content.

**Note:** Use `(root)` for subfolder to access root-level files.
