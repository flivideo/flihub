# FliHub Architecture

Comprehensive technical documentation for the FliHub video workflow management system.

## Technology Stack

FliHub is a **TypeScript monorepo** using npm workspaces. It is **not** TAN stack - it uses a custom React + Express + Socket.io architecture.

### Frontend (Client)

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.0.0 | UI framework |
| Vite | 6.0.0 | Build tool and dev server (port 5100) |
| TailwindCSS | 4.0.0 | Utility-first CSS (with Vite plugin) |
| TanStack React Query | 5.60.0 | Server state management and caching |
| Socket.io-client | 4.8.1 | Real-time WebSocket communication |
| Sonner | 1.7.0 | Toast notifications |
| TypeScript | 5.6.0 | Static typing |

### Backend (Server)

| Technology | Version | Purpose |
|------------|---------|---------|
| Express | 5.1.0 | Web framework |
| Node.js | 18+ | Runtime |
| Socket.io | 4.8.1 | Real-time server (websocket + polling) |
| Chokidar | 3.6.0 | File system watcher |
| Nodemon | 3.1.0 | Auto-restart on file changes (dev) |
| tsx | 4.19.0 | TypeScript execution (dev) |
| TypeScript | 5.6.0 | Static typing |

### External Services

| Technology | Purpose |
|------------|---------|
| Anthropic Claude SDK | AI verification for naming suggestions |
| FFmpeg | Video processing (chapter generation, duration) |
| WhisperAI | Audio transcription |
| adm-zip | ZIP file handling |
| fs-extra | Enhanced file system operations |

## Monorepo Structure

```
flihub/
├── client/               # React 19 + Vite SPA
│   ├── src/
│   │   ├── App.tsx       # Main app with tab navigation
│   │   ├── components/   # UI components
│   │   │   ├── shared/   # Reusable components
│   │   │   └── *.tsx     # Page-specific components
│   │   ├── hooks/        # Custom React hooks
│   │   └── constants/    # Query keys, etc.
│   └── index.html
├── server/               # Express + Socket.io backend
│   ├── src/
│   │   ├── index.ts      # Express app setup, Socket.io
│   │   ├── routes/       # API endpoints
│   │   ├── utils/        # Server utilities
│   │   ├── middleware/   # Error handling
│   │   └── WatcherManager.ts
│   └── config.json       # Application configuration
├── shared/               # TypeScript types, utilities
│   ├── types.ts          # Shared interfaces
│   ├── naming.ts         # Naming validation/parsing
│   └── paths.ts          # Path derivation
└── docs/                 # Documentation
```

## Port Configuration

| Service | Port | Description |
|---------|------|-------------|
| Client (Vite dev) | 5100 | React development server |
| Server (Express) | 5101 | API and Socket.io server |

In production, the client is built and served by Express from port 5101.

## Socket.io Real-Time System

### Architecture

```
┌─────────────────┐         WebSocket         ┌──────────────────┐
│     Client      │◄───────────────────────────│     Server       │
│  (React + Vite) │                            │ (Express + S.io) │
└────────┬────────┘                            └────────┬─────────┘
         │                                              │
         │  useSocket()                                 │  WatcherManager
         │  useRecordingsSocket()                       │  chokidar watchers
         │  useAssetsSocket()                           │
         │  useThumbsSocket()                           │
         └──────────────────────────────────────────────┘
```

### Server-to-Client Events

| Event | Trigger | Payload |
|-------|---------|---------|
| `file:new` | New file in watch directory | `FileInfo` |
| `file:renamed` | File renamed successfully | `{ oldPath, newPath }` |
| `file:deleted` | File deleted from disk | `{ path }` |
| `file:error` | Error with a file | `{ message, path }` |
| `recordings:changed` | Change in recordings/ or -safe/ | - |
| `assets:incoming-changed` | Change in image source directory | - |
| `assets:assigned-changed` | Change in assets/images/ | - |
| `thumbs:changed` | Change in thumbnails | - |
| `thumbs:zip-added` | ZIP file added to Downloads | `{ filename }` |
| `projects:changed` | Project list changed | - |
| `inbox:changed` | Inbox folder changed | - |
| `transcripts:changed` | Transcripts modified | - |
| `chapters:complete` | Chapter video generation finished | `{ success, message }` |

### Client-Side Integration

Each socket hook:
1. Subscribes to specific events on mount
2. Invalidates React Query cache when events fire
3. Triggers UI re-render with fresh data
4. Handles reconnection automatically

```typescript
// Example: useRecordingsSocket hook
export function useRecordingsSocket() {
  const socket = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    socket.on('recordings:changed', () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.recordings });
    });
    return () => socket.off('recordings:changed');
  }, [socket, queryClient]);
}
```

### Connection Handling

- Auto-reconnection with exponential backoff
- Visual indicator in UI (`ConnectionIndicator` component)
- Fallback to polling if WebSocket fails

## Server Architecture

### Entry Point (`server/src/index.ts`)

1. **Express app** - Static files, JSON parsing, CORS
2. **Socket.io server** - Real-time event broadcasting
3. **WatcherManager** - File watcher lifecycle
4. **Route registration** - API endpoints
5. **Config management** - Load/save configuration

### Route Modules

| Route File | Purpose | Key Endpoints |
|------------|---------|---------------|
| `routes/index.ts` | Core operations | POST /api/rename, GET /api/recordings |
| `routes/projects.ts` | Project management | GET /api/projects, POST /api/project |
| `routes/assets.ts` | Image assets | GET /api/assets, POST /api/assets/assign |
| `routes/thumbs.ts` | Thumbnails | GET /api/thumbs, POST /api/thumbs/extract |
| `routes/transcriptions.ts` | Whisper pipeline | POST /api/transcribe |
| `routes/chapters.ts` | Chapter generation | POST /api/chapters/record |
| `routes/video.ts` | Video metadata | GET /api/video/duration |
| `routes/shadows.ts` | Shadow files | POST /api/shadows/generate |
| `routes/system.ts` | System ops | POST /api/open-folder |
| `routes/first-edit.ts` | Gling prep | GET /api/first-edit/status |
| `routes/s3-staging.ts` | Editor collaboration | GET /api/s3-staging |

### WatcherManager

Centralized file watcher management:

```typescript
const watcherManager = new WatcherManager(io);
watcherManager.initAll(config);        // Start all watchers
watcherManager.updateFromConfig(old, new);  // Handle config changes
watcherManager.closeAll();             // Graceful shutdown
```

Watches:
- `watchDirectory` (Ecamm Live output)
- `projectDirectory/recordings/`
- `projectDirectory/recordings/-safe/`
- `projectDirectory/assets/images/`
- `projectDirectory/assets/thumbs/`
- `imageSourceDirectory` (Downloads)

### Error Handling

```typescript
// AppError for controlled errors with status codes
throw new AppError('File not found', 404);

// asyncHandler wrapper for async routes
router.post('/rename', asyncHandler(async (req, res) => {
  // Errors caught automatically
}));

// Global error handler registered last
app.use(errorHandler);
```

## Client Architecture

### Tab-Based Navigation

| Tab | Component | Description |
|-----|-----------|-------------|
| `incoming` | FileList | Files in watch directory |
| `recordings` | RecordingsView | Organized recordings with metadata |
| `watch` | WatchPage | Video playback + transcript sync |
| `transcriptions` | TranscriptionsPage | Transcription management |
| `inbox` | InboxPage | Incoming files staging |
| `assets` | AssetsPage | Image management |
| `thumbs` | ThumbsPage | YouTube thumbnails |
| `projects` | ProjectsPanel | Project list and switching |
| `config` | ConfigPanel | Settings and configuration |
| `mockups` | MockupsPage | Feature testing |

Plus modal pages:
- `FirstEditPrepPage` - Gling editing prep workflow
- `S3StagingPage` - Editor collaboration

### State Management

- **React Query** - Server state (recordings, config, projects)
- **Socket.io** - Real-time cache invalidation
- **React useState** - Local component state

No Redux or global state management - React Query handles server state.

### Custom Hooks

| Hook | Purpose |
|------|---------|
| `useSocket()` | Socket.io connection |
| `useApi()` | React Query API calls |
| `useRecordingsSocket()` | Recording events |
| `useAssetsSocket()` | Asset events |
| `useThumbsSocket()` | Thumbnail events |
| `useProjectsSocket()` | Project list updates |
| `useInboxSocket()` | Inbox updates |
| `useTranscriptsSocket()` | Transcript updates |
| `useOpenFolder()` | Cross-platform folder opening |
| `useBestTake()` | Best take selection logic |

### Shared Components

From `client/src/components/shared/`:

- `PageContainer` - Consistent page layout with border/padding
- `PageHeader` - Title bar with action buttons
- `LoadingSpinner` - Loading state display
- `ErrorMessage` - Error display
- `OpenFolderButton` - Cross-platform folder opening

## Shared Code

### Types (`shared/types.ts`)

Core interfaces used by both client and server:

- `FileInfo` - Recording metadata (name, size, duration, shadow)
- `Config` - Application configuration
- `ProjectInfo` - Project statistics
- `RenameRequest/Response` - Rename operations
- `SuggestedNaming` - AI naming suggestions
- `ProjectStage` - 8-stage workflow model
- `CommonName` - Quick-select recording names

### Naming System (`shared/naming.ts`)

Single source of truth for all naming validation:

```typescript
// Validation
validateChapter('05');     // null (valid)
validateSequence('abc');   // 'Sequence must be a number'

// Parsing (lenient for existing files)
parseRecordingFilename('10-5-intro-CTA.mov');
// { chapter: '10', sequence: '5', name: 'intro', tags: ['CTA'] }

// Building (strict for new files)
buildRecordingFilename('10', '5', 'intro', ['CTA']);
// '10-5-intro-CTA.mov'

// Sorting
recordings.sort(compareChapterSequence);
```

### Path System (`shared/paths.ts`)

All paths derived from single `projectDirectory`:

```typescript
const paths = getProjectPaths('/path/to/b72-project');
// paths.project     -> /path/to/b72-project
// paths.recordings  -> /path/to/b72-project/recordings
// paths.safe        -> /path/to/b72-project/recordings/-safe
// paths.chapters    -> /path/to/b72-project/recordings/-chapters
// paths.shadows     -> /path/to/b72-project/recording-shadows
// paths.transcripts -> /path/to/b72-project/recording-transcripts
// paths.images      -> /path/to/b72-project/assets/images
// paths.thumbs      -> /path/to/b72-project/assets/thumbs
// paths.final       -> /path/to/b72-project/final
// paths.s3Staging   -> /path/to/b72-project/s3-staging
// paths.inbox       -> /path/to/b72-project/inbox
```

**Never** construct paths manually with `path.join()`.

## Configuration

Located at `server/config.json`:

```json
{
  "watchDirectory": "~/Movies/Ecamm Live",
  "projectsRootDirectory": "/path/to/video-projects/v-appydave",
  "activeProject": "b72-project-name",
  "imageSourceDirectory": "~/Downloads",
  "availableTags": ["CTA", "SKOOL", "GITHUB"],
  "commonNames": [
    { "name": "intro", "autoSequence": 1 }
  ],
  "shadowResolution": "240p"
}
```

## Data Flow

### Recording Rename Flow

```
1. User types new name in UI
2. Client validates with shared/naming.ts
3. POST /api/rename { oldName, newName, chapter, sequence, tags }
4. Server validates and renames file
5. Server emits 'recordings:changed' via Socket.io
6. Client receives event, invalidates React Query cache
7. UI re-renders with fresh data
```

### Real-Time Update Flow

```
1. Chokidar detects file change
2. WatcherManager debounces (300ms)
3. WatcherManager emits appropriate socket event
4. Client hook receives event
5. React Query cache invalidated
6. Component re-fetches data
7. UI updates automatically
```

## Key Design Decisions

1. **Monorepo with shared code** - Types defined once, used everywhere
2. **Socket.io for real-time** - Immediate UI updates on file changes
3. **React Query for caching** - Efficient data fetching, automatic invalidation
4. **Path centralization** - All paths derived from single root
5. **TailwindCSS v4** - Modern CSS with Vite integration
6. **Express 5** - Latest async/await support
7. **Cross-platform** - Works on Mac, Windows, Linux, WSL

## Related Documentation

- [Codebase Patterns](patterns.md) - Detailed code conventions
- [Cross-Platform Setup](cross-platform-setup.md) - Windows/WSL setup
- [WSL Development Guide](wsl-development-guide.md) - WSL-specific workflows
- [Release Process](release-process.md) - Versioning and releases
