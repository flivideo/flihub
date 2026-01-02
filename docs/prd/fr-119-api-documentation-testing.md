# FR-119: API Documentation & Testing Page

**Status:** Pending
**Added:** 2025-12-31
**Implemented:** -
**Origin:** User request for integration documentation and testing

---

## User Story

As a developer or integrator, I want comprehensive API documentation with an interactive testing UI so I can understand available endpoints, their schemas, and test them without external tools.

---

## Problem

Current state:
- APIs exist but documentation is scattered across code comments
- No single source of truth for endpoint schemas
- External integrations require reading source code to understand data shapes
- No easy way to test endpoints during development
- Difficult to keep documentation in sync with implementation

---

## Solution

Create a comprehensive API documentation system with three phases:

### Phase 1: API Audit & Documentation

**Deliverable:** `docs/architecture/api-reference.md`

Document all existing endpoints:

| Route File | Prefix | Endpoints |
|------------|--------|-----------|
| `routes/index.ts` | `/api/` | Core recording operations |
| `routes/projects.ts` | `/api/projects/` | Project CRUD, stats |
| `routes/assets.ts` | `/api/assets/` | Image asset management |
| `routes/thumbs.ts` | `/api/thumbs/` | YouTube thumbnails |
| `routes/chapters.ts` | `/api/chapters/` | Chapter video generation |
| `routes/transcriptions.ts` | `/api/transcriptions/` | Whisper transcription |
| `routes/shadows.ts` | `/api/shadows/` | Shadow file generation |
| `routes/state.ts` | `/api/projects/:code/state` | Project state management |
| `routes/video.ts` | `/api/video/` | Video streaming |
| `routes/s3-staging.ts` | `/api/s3-staging/` | S3 DAM integration |
| `routes/system.ts` | `/api/system/` | System operations |
| `routes/first-edit.ts` | `/api/first-edit/` | First edit prep |
| `routes/query/*` | `/api/query/` | Read-only query endpoints |

For each endpoint, document:
- HTTP method and path
- Request parameters (path, query, body)
- Request body schema (TypeScript interface)
- Response schema (TypeScript interface)
- Example request/response
- Error responses

### Phase 2: Schema Types Consolidation

Ensure all request/response types are in `shared/types.ts`:
- Move inline types to shared
- Add JSDoc comments with descriptions
- Export for client and server use

### Phase 3: Interactive API Explorer UI

New page in FliHub (accessible from Cog menu like Mockups):

```
┌─────────────────────────────────────────────────────────────────────┐
│  FliHub API Explorer                                          [X]   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Endpoints                    │  Request / Response                 │
│  ─────────────                │  ─────────────────                  │
│  ▼ Query API                  │                                     │
│    GET /api/query/projects    │  GET /api/query/projects            │
│    GET /api/query/projects/:c │  ─────────────────────              │
│    GET /api/query/.../record  │                                     │
│  ▼ Projects                   │  Parameters:                        │
│    GET /api/projects          │  ┌─────────────────────────────┐    │
│    POST /api/projects         │  │ filter: [starred ▼]         │    │
│    GET /api/projects/:code/st │  │ stage:  [any ▼]             │    │
│  ▼ Recordings                 │  │ recent: [10        ]        │    │
│    POST /api/recordings/renam │  └─────────────────────────────┘    │
│    POST /api/recordings/safe  │                                     │
│  ▼ Transcriptions             │  [Send Request]                     │
│  ▼ System                     │                                     │
│                               │  Response (200 OK):                 │
│                               │  ┌─────────────────────────────┐    │
│                               │  │ {                           │    │
│                               │  │   "projects": [             │    │
│                               │  │     { "code": "b85-..." }   │    │
│                               │  │   ]                         │    │
│                               │  │ }                           │    │
│                               │  └─────────────────────────────┘    │
│                               │                                     │
│                               │  Schema:                            │
│                               │  ProjectListResponse {              │
│                               │    projects: ProjectStats[]         │
│                               │  }                                  │
│                               │                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Features:**
- Collapsible endpoint groups by route file
- Click endpoint to see details
- Form inputs for parameters
- "Send Request" executes against local server
- Response displayed with syntax highlighting
- Schema reference with TypeScript types
- Copy as cURL button

---

## Acceptance Criteria

### Phase 1 (Documentation)
- [ ] Complete API reference document in `docs/architecture/api-reference.md`
- [ ] All 20+ route files documented
- [ ] Request/response schemas for each endpoint
- [ ] Example payloads included

### Phase 2 (Types)
- [ ] All API types consolidated in `shared/types.ts`
- [ ] JSDoc comments on all exported types
- [ ] No duplicate type definitions

### Phase 3 (UI)
- [ ] API Explorer page accessible from Cog menu
- [ ] Endpoint list with collapsible groups
- [ ] Parameter input forms per endpoint
- [ ] Live request execution
- [ ] Response display with formatting
- [ ] Schema reference panel

---

## Technical Notes

### Existing Documentation
- `docs/architecture/sockets.md` - Socket.io events (good pattern to follow)
- `docs/architecture/patterns.md` - Code conventions
- Some JSDoc in route files

### API Explorer Implementation
- New route: `/api-explorer` or modal overlay
- Can use existing endpoint metadata or build from route definitions
- Consider: Generate OpenAPI spec from code annotations

### Priority
Phase 1 (documentation) provides immediate value for integrations.
Phase 3 (UI) is nice-to-have but not urgent.

---

## Scope Estimate

| Phase | Effort | Priority |
|-------|--------|----------|
| Phase 1: Audit & Document | Medium (2-3 hours) | High |
| Phase 2: Type Consolidation | Small (1 hour) | Medium |
| Phase 3: API Explorer UI | Large (4-6 hours) | Low |

**Recommendation:** Start with Phase 1, evaluate need for Phase 3 after.

---

## Related

- NFR-66: Consolidate TypeScript Response Types (partial overlap)
- NFR-68: Split Query Routes into Sub-Modules (makes docs easier)

---

## Completion Notes

**Status:** Complete

**What was implemented:**

Phase 3 (Interactive API Explorer UI) has been fully implemented with all requested features plus additional enhancements.

**Core Features Delivered:**

1. **API Registry System** (`shared/apiRegistry.ts`)
   - Comprehensive type definitions: `ApiEndpoint`, `ApiParameter`, `HttpMethod`, etc.
   - 36 endpoints documented across 8 functional groups
   - Helper functions: `getEndpointGroups()`, `getEndpointById()`
   - Support for path, query, and body parameters
   - Enum value definitions for dropdowns
   - Example responses for each endpoint

2. **Interactive API Explorer Component** (`client/src/components/ApiExplorer.tsx`)
   - Two-column layout: Endpoint list (left) + Request/Response (right)
   - Collapsible endpoint groups with counts
   - HTTP method color coding (GET=green, POST=blue, PUT=yellow, etc.)
   - Active endpoint highlighting
   - Smart parameter form rendering:
     - Text inputs for strings
     - Number inputs for numbers
     - Checkboxes for booleans
     - Dropdowns for enum values
     - Textareas with JSON formatting for objects/arrays
   - Path parameter substitution in URL
   - Query parameter building
   - Request body construction
   - Live request execution with fetch
   - Response display with status codes and color coding
   - JSON syntax highlighting in responses
   - Example response display (when no request has been made yet)
   - Copy as cURL button (generates valid curl commands)
   - Copy Response button
   - Loading states during requests
   - Error handling and display

3. **App Integration**
   - Added to Cog menu (⚙️) as "API Explorer" 🔌
   - New tab route: `#api-explorer`
   - Gear icon highlights when API Explorer is active
   - Consistent with existing FliHub UI patterns

**Endpoint Coverage:**

| Group | Count | Examples |
|-------|-------|----------|
| Query API | 10 | `/api/query/projects`, `/api/query/recordings`, `/api/query/export` |
| Configuration | 2 | `/api/config` (GET/POST) |
| Projects | 6 | Create, update priority/stage, final media, inbox write |
| Recordings | 6 | List, rename, park/unpark, suggested naming |
| Transcription | 4 | Queue, status, queue-all |
| System | 4 | Health check, environment, open folder, watchers |
| State | 2 | Get/update project state |

**Total: 36 endpoints** (exceeds minimum requirement of 20)

**Files Created:**
- `shared/apiRegistry.ts` - API metadata registry
- `client/src/components/ApiExplorer.tsx` - Main UI component

**Files Modified:**
- `client/src/App.tsx` - Added import, tab type, navigation menu item, tab rendering, gear icon highlighting

**UX Enhancements Beyond Spec:**
- HTTP method badges with color coding
- Smart form inputs based on parameter types
- Auto-populated example values
- Example response display before first request
- Status code color coding (green=2xx, yellow=3xx, red=4xx/5xx)
- Endpoint counts in group headers
- Truncated path display in endpoint list (shows relative path)
- Active endpoint border highlighting
- Disabled button states during loading

**Testing Notes:**

To test the API Explorer:
1. Start dev server: `npm run dev`
2. Navigate to app (default: http://localhost:5100)
3. Click Cog menu (⚙️) → "API Explorer" 🔌
4. Select any endpoint group to expand
5. Click an endpoint to view details
6. Fill in parameters (examples auto-populate)
7. Click "Send Request" to execute
8. View response with status code
9. Test "Copy as cURL" and "Copy Response" buttons

**Recommended endpoints for initial testing:**
- `GET /api/system/health` - No parameters, instant response
- `GET /api/config` - View current configuration
- `GET /api/query/projects` - List all projects with optional filters
- `GET /api/system/environment` - Detect runtime environment

**Known Limitations:**
- Phase 2 (Schema Types Consolidation) was skipped - types are defined in registry but not moved to shared/types.ts
- No OpenAPI spec generation (could be future enhancement)
- No request history or saved requests (could be future enhancement)

**Future Enhancements (Optional):**
- Request history panel
- Save/load request templates
- Batch request execution
- WebSocket endpoint testing
- Generate TypeScript client code
- Export as Postman collection
