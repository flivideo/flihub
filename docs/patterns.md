# NFR-6: Codebase Patterns

This document describes the architectural patterns established during the NFR-6 refactor.

## Directory Structure

```
flihub/
├── shared/                     # Shared code between client and server
│   ├── types.ts               # TypeScript interfaces
│   ├── naming.ts              # Naming utilities (validation, parsing, building)
│   └── paths.ts               # Centralized path derivation
├── client/src/
│   ├── components/
│   │   ├── shared/            # Reusable UI components
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── ErrorMessage.tsx
│   │   │   ├── PageContainer.tsx
│   │   │   ├── PageHeader.tsx
│   │   │   └── index.ts
│   │   └── *.tsx              # Page-specific components
│   ├── constants/
│   │   └── queryKeys.ts       # Centralized React Query keys
│   └── hooks/                 # Custom React hooks
└── server/src/
    ├── middleware/
    │   └── errorHandler.ts    # Global error handling
    ├── routes/                # Express routes
    ├── utils/                 # Server utilities
    └── WatcherManager.ts      # File watcher management
```

## 1. Path Centralization (`shared/paths.ts`)

All project-relative paths are derived from `projectDirectory` using `getProjectPaths()`:

```typescript
import { getProjectPaths } from '../../shared/paths.js';

const paths = getProjectPaths(expandPath(config.projectDirectory));
// paths.project    -> /path/to/b72-project
// paths.recordings -> /path/to/b72-project/recordings
// paths.safe       -> /path/to/b72-project/recordings/-safe
// paths.trash      -> /path/to/b72-project/-trash
// paths.assets     -> /path/to/b72-project/assets
// paths.images     -> /path/to/b72-project/assets/images
// paths.thumbs     -> /path/to/b72-project/assets/thumbs
```

**Never** construct paths manually with `path.join()` or `path.dirname()`.

## 2. Query Key Centralization (`client/src/constants/queryKeys.ts`)

All React Query keys are defined centrally:

```typescript
import { QUERY_KEYS } from '../constants/queryKeys';

// Static keys
queryKey: QUERY_KEYS.config
queryKey: QUERY_KEYS.recordings
queryKey: QUERY_KEYS.incomingImages

// Dynamic keys (functions)
queryKey: QUERY_KEYS.nextImageOrder(chapter, sequence)
queryKey: QUERY_KEYS.prompt(filename)
queryKey: QUERY_KEYS.thumbZipContents(zipFilename)

// Prefix keys (for invalidation)
queryClient.invalidateQueries({ queryKey: QUERY_KEYS.nextImageOrderPrefix })
```

**Never** use inline query key arrays like `['assets', 'images']`.

## 3. Shared Components (`client/src/components/shared/`)

Use shared components for consistent UI patterns:

```typescript
import { LoadingSpinner, ErrorMessage, PageContainer, PageHeader } from './shared';

// Loading states
if (isLoading) {
  return <LoadingSpinner message="Loading recordings..." />;
}

// Error states
if (error) {
  return <ErrorMessage message="Error loading recordings" />;
}

// Page containers (consistent border/padding)
return (
  <PageContainer>
    <PageHeader title="Recordings">
      <OpenFolderButton folder="recordings" />
    </PageHeader>
    {/* content */}
  </PageContainer>
);
```

## 4. Watcher Management (`server/src/WatcherManager.ts`)

File watchers are centralized in `WatcherManager`:

```typescript
// Initialization
const watcherManager = new WatcherManager(io);
watcherManager.initAll(config);

// Config changes
watcherManager.updateFromConfig(oldConfig, newConfig);

// Shutdown
watcherManager.closeAll();
```

**Never** create chokidar watchers directly in `index.ts`.

## 5. Error Handling (`server/src/middleware/errorHandler.ts`)

Use `AppError` for controlled errors and `asyncHandler` for async routes:

```typescript
import { AppError, asyncHandler, errorHandler } from './middleware/errorHandler.js';

// Throw controlled errors
if (!file) {
  throw new AppError('File not found', 404);
}

// Wrap async handlers
router.post('/rename', asyncHandler(async (req, res) => {
  // async code here - errors will be caught automatically
}));

// Register globally (after all routes)
app.use(errorHandler);
```

## 6. Config Pattern

Configuration uses `projectDirectory` (not `targetDirectory`):

```typescript
// Config interface (shared/types.ts)
interface Config {
  watchDirectory: string;      // Ecamm recording source
  projectDirectory: string;    // Project root (e.g., /path/to/b72-project)
  imageSourceDirectory: string; // Image watch source (e.g., ~/Downloads)
  // ...
}

// Derive all paths from projectDirectory
const paths = getProjectPaths(config.projectDirectory);
```

## 7. Socket Events

Real-time updates use standardized socket events:

| Event | Trigger |
|-------|---------|
| `file:new` | New file in watch directory |
| `file:deleted` | File removed from watch directory |
| `recordings:changed` | Change in recordings/ or safe/ |
| `assets:incoming-changed` | Change in imageSourceDirectory |
| `assets:assigned-changed` | Change in assets/images/ |
| `projects:changed` | Change in project directory siblings |
| `thumbs:changed` | Change in assets/thumbs/ |
| `thumbs:zip-added` | ZIP file added to Downloads |

Client hooks subscribe automatically:
- `useRecordingsSocket()`
- `useAssetsSocket()`
- `useThumbsSocket()`
- `useProjectsSocket()`

## 8. Naming Utilities (`shared/naming.ts`)

Use centralized naming functions:

```typescript
import {
  validateChapter,
  validateSequence,
  parseRecordingFilename,
  buildImageFilename,
  compareChapterSequence,
} from '../../../shared/naming';

// Validation
const error = validateChapter(value);
if (error) throw new AppError(error);

// Parsing
const parsed = parseRecordingFilename(filename);
// { chapter: '10', sequence: '5', name: 'intro' }

// Building
const newName = buildImageFilename('10', '5', '1', 'a', 'demo', '.png');
// '10-5-1a-demo.png'

// Sorting
items.sort(compareChapterSequence);
```
