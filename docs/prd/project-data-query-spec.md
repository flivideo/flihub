# NFR-8: Project Data Query API

**Purpose:** Expose project data via structured JSON endpoints to enable LLM context gathering, future import/export, and external tool integration (e.g., Claude Code skills).

---

## Context

FliVideo has rich project data spread across the filesystem:
- Projects with stats and stages
- Recordings with parsed naming components
- Transcripts linked to recordings
- Images and prompts
- Chapters (dynamically generated from recordings + final SRT)

Currently this data is only accessible through the web UI. To enable:
- **LLM context feeding** (e.g., "summarize this project", "generate chapter descriptions")
- **External tools** (e.g., Claude Code FliNamer skill)
- **Future import/export**

We need clean JSON query endpoints.

---

## API Endpoints

### 1. List Projects

```
GET /api/query/projects
GET /api/query/projects?filter=pinned
GET /api/query/projects?stage=recording
GET /api/query/projects?recent=5
```

**Response:**
```json
{
  "success": true,
  "projects": [
    {
      "code": "b72-flivideo-demo",
      "stage": "editing",
      "priority": "pinned",
      "stats": {
        "recordings": 28,
        "chapters": 12,
        "transcriptPercent": 100,
        "images": 8,
        "thumbs": 3
      },
      "lastModified": "2025-12-05T14:30:00Z"
    }
  ]
}
```

**Filters:**
| Filter | Behaviour |
|--------|-----------|
| `pinned` | Only pinned projects |
| `stage=X` | Filter by specific stage (none, recording, editing, done) |
| `recent=N` | Last N modified projects |

---

### 0. System Config (Metadata)

```
GET /api/query/config
```

**Response:**
```json
{
  "success": true,
  "stages": ["none", "recording", "editing", "done"],
  "priorities": ["pinned", "normal"],
  "filters": ["pinned"],
  "stageFilters": ["none", "recording", "editing", "done"],
  "availableTags": ["CTA", "SKOOL", "ENDCARD"],
  "commonNames": ["intro", "demo", "summary", "outro"]
}
```

Returns system metadata for LLM agents and external tools to understand valid values.

---

### 2. Project Detail

```
GET /api/query/projects/:code
```

**Response:**
```json
{
  "success": true,
  "project": {
    "code": "b72-flivideo-demo",
    "path": "/dev/video-projects/v-appydave/b72-flivideo-demo",
    "stage": "editing",
    "priority": "normal",
    "stats": {
      "recordings": 28,
      "safe": 12,
      "chapters": 12,
      "transcripts": { "matched": 28, "missing": 0, "orphaned": 0 },
      "images": 8,
      "thumbs": 3,
      "totalDuration": 2847
    },
    "finalMedia": {
      "video": { "filename": "b72-final-v2.mp4", "size": 4400000000 },
      "srt": { "filename": "b72-final-v2.srt" }
    },
    "createdAt": "2025-11-28T10:00:00Z",
    "lastModified": "2025-12-05T14:30:00Z"
  }
}
```

---

### 3. Recordings

```
GET /api/query/projects/:code/recordings
GET /api/query/projects/:code/recordings?chapter=5
GET /api/query/projects/:code/recordings?missing-transcripts=true
```

**Response:**
```json
{
  "success": true,
  "recordings": [
    {
      "filename": "05-3-demo-CTA.mov",
      "chapter": "05",
      "sequence": "3",
      "name": "demo",
      "tags": ["CTA"],
      "folder": "recordings",
      "size": 145000000,
      "duration": 124,
      "hasTranscript": true
    }
  ]
}
```

---

### 4. Transcripts

```
GET /api/query/projects/:code/transcripts
GET /api/query/projects/:code/transcripts?chapter=5
GET /api/query/projects/:code/transcripts?include=content
GET /api/query/projects/:code/transcripts/:recording-name
```

**Response (list, without content):**
```json
{
  "success": true,
  "transcripts": [
    {
      "filename": "05-3-demo-CTA.txt",
      "chapter": "05",
      "sequence": "3",
      "name": "demo",
      "size": 4500,
      "preview": "Welcome to the demo section where we'll..."
    }
  ]
}
```

**Response (with content):**
```json
{
  "success": true,
  "transcripts": [
    {
      "filename": "05-3-demo-CTA.txt",
      "chapter": "05",
      "sequence": "3",
      "name": "demo",
      "content": "Welcome to the demo section where we'll show you how to set up the project..."
    }
  ]
}
```

**Response (single transcript):**
```json
{
  "success": true,
  "transcript": {
    "filename": "05-3-demo-CTA.txt",
    "chapter": "05",
    "sequence": "3",
    "name": "demo",
    "content": "Full transcript content here..."
  }
}
```

---

### 5. Chapters

```
GET /api/query/projects/:code/chapters
```

**Note:** Chapters are dynamically generated (not persisted). This endpoint runs the chapter detection logic.

**Response:**
```json
{
  "success": true,
  "chapters": [
    {
      "chapter": 1,
      "name": "intro",
      "displayName": "Intro",
      "timestamp": "00:00",
      "timestampSeconds": 0,
      "recordingCount": 3,
      "hasTranscript": true
    },
    {
      "chapter": 5,
      "name": "demo",
      "displayName": "Demo",
      "timestamp": "12:34",
      "timestampSeconds": 754,
      "recordingCount": 2,
      "hasTranscript": true
    }
  ],
  "formatted": "00:00 Intro\n12:34 Demo\n..."
}
```

---

### 6. Images

```
GET /api/query/projects/:code/images
GET /api/query/projects/:code/images?chapter=5
```

**Response:**
```json
{
  "success": true,
  "images": [
    {
      "filename": "05-3-2a-workflow.png",
      "chapter": "05",
      "sequence": "3",
      "imageOrder": "2",
      "variant": "a",
      "label": "workflow",
      "size": 245000
    }
  ]
}
```

---

### 7. Full Export (Convenience)

```
GET /api/query/projects/:code/export
GET /api/query/projects/:code/export?include=transcripts,chapters
```

Returns combined data in single response for LLM context:

```json
{
  "success": true,
  "exportedAt": "2025-12-06T10:30:00Z",
  "project": { /* project detail */ },
  "recordings": [ /* all recordings */ ],
  "transcripts": [ /* with content */ ],
  "chapters": [ /* with timestamps */ ],
  "images": [ /* all images */ ]
}
```

**Query params:**
- `include=X,Y,Z` - Only include specified sections
- Default: all sections

---

## Route Organization

New route file: `server/src/routes/query.ts`

All query endpoints under `/api/query/` prefix to distinguish from existing CRUD/action endpoints.

---

## Design Principles

1. **Read-only** - Query endpoints don't modify data
2. **Consistent shape** - All responses have `success` + data key
3. **Filterable** - Query params for common filters
4. **Transcript content opt-in** - Large text only included when requested
5. **Chapters are dynamic** - Generated on request, not cached

---

## Relationship to Existing Endpoints

| Existing | Purpose | Query Equivalent |
|----------|---------|------------------|
| `GET /api/projects` | UI project list | `GET /api/query/projects` (richer data) |
| `GET /api/projects/:code/stats` | UI stats popup | `GET /api/query/projects/:code` |
| `GET /api/projects/:code/chapters` | UI chapter extraction | `GET /api/query/projects/:code/chapters` |

**Note:** Query endpoints may reuse existing logic but return more structured/complete data for external consumption.

---

## Future: Import Endpoint

Once export shape stabilizes through use:

```
POST /api/query/projects/:code/import
```

Would accept the same shape as export. Out of scope for this NFR.

---

## Acceptance Criteria

- [x] `GET /api/query/config` returns system metadata (stages, priorities, filters, tags, names)
- [x] `GET /api/query/projects` returns project list with filters (`?filter=pinned`, `?stage=X`, `?recent=N`)
- [x] `GET /api/query/projects/:code` returns full project detail
- [x] `GET /api/query/projects/:code/recordings` returns recordings with optional chapter filter
- [x] `GET /api/query/projects/:code/transcripts` returns transcripts (content opt-in)
- [x] `GET /api/query/projects/:code/chapters` returns dynamically generated chapters
- [x] `GET /api/query/projects/:code/images` returns images with optional chapter filter
- [x] `GET /api/query/projects/:code/export` returns combined data
- [x] All endpoints return consistent `{ success, ... }` shape
- [x] Query endpoints are read-only (no side effects)
- [x] Request logging with `[Query API]` prefix

**Implementation**: `flihub/server/src/routes/query.ts` (2025-12-06)
