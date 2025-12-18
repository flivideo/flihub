# Architecture Comparison: Storyline App vs FliHub

Analysis for creating a new presentations app based on lessons learned from both applications.

## Technology Stack Comparison

| Component | Storyline App | FliHub | Recommended |
|-----------|---------------|--------|-------------|
| **React** | 19.1.1 | 19 | **19.x** |
| **TypeScript** | 5.9.2 (server), 5.8.3 (client) | 5.6 | **5.9+** |
| **Vite** | 7.1.5 | 6 | **7.x** |
| **Express** | 5.1.0 | 5.1 | **5.x** |
| **Socket.io** | 4.8.1 | 4.8.1 | **4.8.x** |
| **TanStack Query** | 5.87.1 | 5.60 | **5.87+** |
| **Tailwind CSS** | 4.1.13 | 4 | **4.x** |
| **Chokidar** | 3.6.0 | 3.6 | **3.6.x** |
| **Node.js** | 18+ | 22 | **22+** |

### UI Components

| Aspect | Storyline App | FliHub |
|--------|---------------|--------|
| **Component Library** | Custom Tailwind | Custom Tailwind |
| **Routing** | React Router 7.8.2 | Hash-based (#tabs) |
| **Notifications** | None mentioned | Sonner 1.7 |
| **Icons** | Not specified | Not specified |

**Recommendation**: Consider adding Sonner for toast notifications. Both apps use custom Tailwind components rather than ShadCN/Radix - this keeps bundle size down but requires more UI work.

---

## Monorepo Structure

Both apps use identical npm workspaces structure:

```
app-name/
├── package.json          # Root with workspaces config
├── client/               # React frontend
│   ├── package.json
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── hooks/
│   │   ├── components/
│   │   ├── utils/
│   │   └── config.ts
│   ├── vite.config.ts
│   └── tsconfig.json
├── server/               # Express backend
│   ├── package.json
│   ├── src/
│   │   ├── index.ts
│   │   ├── routes/
│   │   ├── services/     (Storyline) or direct files (FliHub)
│   │   ├── middleware/
│   │   └── utils/
│   ├── nodemon.json
│   └── tsconfig.json
├── shared/               # Shared types & utilities
│   ├── types.ts
│   └── [domain utilities]
└── docs/
```

**Key Pattern**: Both apps put shared TypeScript types in `shared/` and reference them via path aliases (`@shared` in Storyline, relative imports in FliHub).

---

## Socket.io Implementation Patterns

### Storyline App: Room-Based Architecture

```typescript
// Multi-project support via Socket.io rooms
socket.on('join:project', ({ projectName }) => {
  socket.join(`project:${projectName}`);
  io.to(`project:${projectName}`).emit('project:joined', projectName);
});

// Broadcasting to specific room + general
io.to(`project:${projectName}`).emit('status:updated', statusData);
```

**Events**: Connection status, file changes, directory changes, watcher control, status sync

### FliHub: Direct Event Broadcasting

```typescript
// Single project, direct events
io.emit('recordings:changed');
io.emit('file:new', fileInfo);
```

**Events**: File lifecycle (new/deleted/renamed), folder-specific changes, transcription progress

### Decision Points for New App

| Consideration | Use Rooms | Use Direct |
|---------------|-----------|------------|
| Multi-project support | ✅ | ❌ |
| Simpler implementation | ❌ | ✅ |
| Resource efficiency | ✅ | ❌ |
| Real-time collaboration | ✅ | Possible |

**Recommendation**: If the presentations app will support multiple presentations simultaneously, use room-based architecture like Storyline. If single-presentation focus, direct events are simpler.

---

## Server Architecture Patterns

### Service Layer (Storyline)

```typescript
// Services as singletons extending EventEmitter
class FileWatcherService extends EventEmitter {
  private static instance: FileWatcherService;
  private watchers: Map<string, FSWatcher>;

  startWatching(projectName: string): void { ... }
  stopWatching(projectName: string): void { ... }
}

// Usage in routes
const fileWatcher = FileWatcherService.getInstance();
fileWatcher.on('fileChange', (event) => {
  io.emit('file:change', event);
});
```

### Route Factory Pattern (FliHub)

```typescript
// Routes receive dependencies via closure
export function createRoutes(
  pendingFiles: Map<string, FileInfo>,
  config: Config,
  updateConfig: (newConfig: Partial<Config>) => Config,
  queueTranscription?: (videoPath: string) => void
): Router {
  const router = Router();
  // Define routes with access to injected dependencies
  return router;
}

// In index.ts
app.use('/api', createRoutes(pendingFiles, currentConfig, updateConfig));
```

### Centralized Watcher (FliHub - NFR-6)

```typescript
class WatcherManager {
  private watchers: Map<string, FSWatcher>;
  private debounceTimeouts: Map<string, NodeJS.Timeout>;

  startRecordingsWatcher(): void { ... }
  startAssetsWatcher(): void { ... }
  startThumbsWatcher(): void { ... }
  updateFromConfig(config: Config): void { ... }
  shutdown(): void { ... }
}
```

**Recommendation**:
- Use **Service Layer** pattern for complex domain logic (validation, data transformation)
- Use **Route Factory** pattern for testability and dependency injection
- Use **WatcherManager** for file watching centralization

---

## State Management Comparison

### Server State (TanStack Query)

Both apps use TanStack Query identically:

```typescript
// Query keys pattern
const QUERY_KEYS = {
  config: ['config'],
  recordings: ['recordings'],
  projects: ['projects'],
  // ...
};

// Query hook
export function useConfig() {
  return useQuery({
    queryKey: QUERY_KEYS.config,
    queryFn: () => fetchApi<Config>('/api/config'),
    staleTime: 5 * 60 * 1000,  // 5 min
  });
}

// Mutation with cache invalidation
export function useUpdateConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (config) => postApi('/api/config', config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.config });
    },
  });
}
```

### Real-Time Invalidation via Socket.io

```typescript
// Hook pattern for Socket.io → React Query integration
export function useFileSocket() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = getSocket();
    const handleChange = () => {
      queryClient.invalidateQueries({ queryKey: ['recordings'] });
    };
    socket.on('recordings:changed', handleChange);
    return () => socket.off('recordings:changed', handleChange);
  }, [queryClient]);
}
```

**This pattern is critical**: Socket.io events trigger React Query cache invalidation, creating reactive UI without polling.

---

## Error Handling Patterns

### FliHub: AppError Class

```typescript
export class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function asyncHandler(fn: AsyncRequestHandler) {
  return (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);
}

// Global error middleware
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({ success: false, error: err.message });
});
```

### Storyline: Standard Express Pattern

```typescript
// Global error handler with dev stack traces
app.use((err, req, res, next) => {
  const status = err.status || 500;
  res.status(status).json({
    error: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});
```

**Recommendation**: Use FliHub's `asyncHandler` + `AppError` pattern - it's more explicit and testable.

---

## Configuration Management

### Storyline: JSON Config File

```typescript
// Loaded from project-config.json
interface ProjectConfig {
  currentProject: string;
  projects: Array<{
    projectName: string;
    projectPath: string;
    status: 'active' | 'invalid';
    lastUsed: string;
  }>;
}
```

### FliHub: JSON Config with In-Memory Updates

```typescript
// config.json with runtime updates
interface Config {
  watchDirectory: string;
  projectsRootDirectory: string;
  activeProject: string;
  fileExtensions: string[];
  availableTags: string[];
  // ...
}

// Update function persists to disk
function updateConfig(newConfig: Partial<Config>): Config {
  currentConfig = { ...currentConfig, ...newConfig };
  writeFileSync('config.json', JSON.stringify(currentConfig, null, 2));
  return currentConfig;
}
```

**Recommendation**: JSON config file with in-memory caching and disk persistence on updates.

---

## Data Flow Architecture

### Storyline: Request → Service → Response

```
Client Request
    ↓
Express Route
    ↓
Service Layer (DataService, ValidationService, etc.)
    ↓
File System / External Data
    ↓
Schema Transformation (legacy → current)
    ↓
Response
```

### FliHub: Request → Route Logic → Response

```
Client Request
    ↓
Express Route (with injected dependencies)
    ↓
Utility Functions (pathUtils, projectStats, etc.)
    ↓
File System Operations
    ↓
Response
```

**Recommendation**: For a presentations app with complex domain logic (slide transformations, template rendering), use the Service Layer pattern. For simpler CRUD, route-level logic is sufficient.

---

## Key Reusable Patterns

### 1. Monorepo Setup Script

```json
// package.json (root)
{
  "workspaces": ["client", "server", "shared"],
  "scripts": {
    "dev": "concurrently \"npm run dev -w server\" \"npm run dev -w client\"",
    "build": "npm run build -w server && npm run build -w client",
    "start": "npm start -w server"
  }
}
```

### 2. Socket.io React Hook Template

```typescript
// useSocket.ts
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

const socket = io(API_URL, { transports: ['websocket', 'polling'] });

export function useSocketInvalidation(event: string, queryKey: string[]) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handler = () => queryClient.invalidateQueries({ queryKey });
    socket.on(event, handler);
    return () => socket.off(event, handler);
  }, [queryClient, event, queryKey]);
}
```

### 3. API Fetch Wrapper

```typescript
// api.ts
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5101';

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }
  return response.json();
}
```

### 4. Express Route Factory

```typescript
// routes/feature.ts
export function createFeatureRoutes(
  getConfig: () => Config,
  io: Server
): Router {
  const router = Router();

  router.get('/', asyncHandler(async (req, res) => {
    const config = getConfig();
    // ... route logic
    res.json({ success: true, data: result });
  }));

  return router;
}
```

### 5. Graceful Shutdown

```typescript
// index.ts
const shutdown = (signal: string) => {
  console.log(`Received ${signal}, shutting down...`);
  watcherManager.shutdown();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
```

---

## Recommendations for New Presentations App

### Core Stack (Proven)

```json
{
  "frontend": {
    "react": "^19.0.0",
    "vite": "^7.0.0",
    "typescript": "^5.9.0",
    "@tanstack/react-query": "^5.87.0",
    "tailwindcss": "^4.0.0",
    "socket.io-client": "^4.8.0",
    "sonner": "^1.7.0"
  },
  "backend": {
    "express": "^5.1.0",
    "socket.io": "^4.8.0",
    "chokidar": "^3.6.0",
    "typescript": "^5.9.0"
  }
}
```

### Architecture Decisions

| Decision | Recommendation | Rationale |
|----------|----------------|-----------|
| Routing | **React Router** | More complex app benefits from proper routing |
| Socket.io | **Room-based** if multi-presentation | Allows isolated updates per presentation |
| Server structure | **Service Layer** | Presentations have complex logic (rendering, templates) |
| File watching | **WatcherManager** | Centralized control, debouncing built-in |
| Error handling | **AppError + asyncHandler** | Clean, testable patterns |
| Config | **JSON + in-memory** | Proven pattern, persists on restart |

### Domain-Specific Considerations

For a presentations app, consider:

1. **Slide Data Model** - Complex nested structure (slides → elements → properties)
2. **Template System** - Reusable slide templates
3. **Export Formats** - PDF, PowerPoint, HTML
4. **Real-Time Collaboration** - Socket.io rooms per presentation
5. **Asset Management** - Images, fonts, media files
6. **Version History** - Track changes, undo/redo
7. **Preview Rendering** - Server-side or client-side rendering

### Suggested Initial Structure

```
presentations-app/
├── package.json
├── client/
│   └── src/
│       ├── components/
│       │   ├── Editor/          # Main editor interface
│       │   ├── Slides/          # Slide components
│       │   ├── Elements/        # Slide elements (text, image, shape)
│       │   └── Toolbar/         # Editing tools
│       ├── hooks/
│       │   ├── useSocket.ts
│       │   ├── usePresentation.ts
│       │   └── useSlide.ts
│       └── utils/
├── server/
│   └── src/
│       ├── services/
│       │   ├── PresentationService.ts
│       │   ├── TemplateService.ts
│       │   ├── ExportService.ts
│       │   └── AssetService.ts
│       ├── routes/
│       │   ├── presentations.ts
│       │   ├── templates.ts
│       │   ├── assets.ts
│       │   └── export.ts
│       └── middleware/
└── shared/
    ├── types.ts              # Presentation, Slide, Element types
    └── validation.ts         # Schema validation
```

---

## Summary

Both Storyline App and FliHub demonstrate mature, production-ready patterns for React + Express + Socket.io applications. The key insights:

1. **npm workspaces monorepo** is simpler than Nx/Turborepo for small teams
2. **TanStack Query + Socket.io** creates excellent reactive UX
3. **Service Layer** pattern works well for complex domain logic
4. **Route Factory** pattern with dependency injection improves testability
5. **Centralized file watching** (WatcherManager) prevents resource leaks
6. **Shared types** in separate workspace eliminates drift between client/server
7. **Graceful shutdown** is essential for file watchers and queues

The presentations app should leverage all these patterns while adding domain-specific services for slide rendering, template management, and export functionality.
