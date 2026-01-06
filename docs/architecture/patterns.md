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

## 9. ProjectsPanel UX Pattern

The ProjectsPanel table uses consistent interaction patterns for each element type:

### Element Types

| Type | Behavior | Visual Cue |
|------|----------|------------|
| **Indicators** | Show only when content exists, click navigates to tab | Emoji only, no number |
| **Indicators (folder)** | Show only when content exists, click opens folder | Emoji only, no number |
| **Count columns** | Show count, click opens folder | Number, hover underline |
| **Status displays** | Show status, hover for tooltip (read-only) | Text/emoji, cursor-help |
| **Toggles** | Click cycles through states | Badge/icon |

### Full UX Matrix

| Element | Type | Click Behavior | Tooltip |
|---------|------|----------------|---------|
| 📌 Priority | Toggle | Pin/unpin project | Shows current state |
| Project Code | Navigation | Switch to project | - |
| Stage | Toggle | Click: next, Shift+Click: prev | Shows description |
| 📥 Inbox | Indicator | Switch project + navigate to Inbox tab | "Click to view in app" |
| 🖼 Assets | Indicator | Switch project + navigate to Assets tab | "Click to view in app" |
| 🎬 Chapters | Indicator (folder) | Opens -chapters folder | "Click to open folder" |
| Ch column | Folder link | Opens -chapters folder | Only clickable if videos exist |
| Files column | Folder link | Opens recordings folder | "Open recordings folder" |
| 👻 Shadows column | Folder link | Opens recording-shadows folder | "Open recording-shadows folder" |
| 📄 Transcript % | Status | Not clickable | Shows sync stats |
| ✅ Final Video | Status | Not clickable | Shows video/srt status |
| ⓘ Info | Popup | Shows project stats popup | "View project stats" |

### Design Rationale

**Why distinguish "indicators" vs "count columns"?**
- **Indicators** (📥, 🖼, 🎬) are presence markers - they show something exists
- **Count columns** show quantities and always open the underlying folder

Indicators can have varied behaviors (navigate to tab vs open folder) based on whether there's an in-app view for that content.

**Why does Ch column have two clickable elements?**
- **Ch column number** - Opens -chapters folder (same as Files/Shadows pattern)
- **🎬 indicator** - Also opens -chapters folder (presence marker pattern)

This is intentional redundancy. Both follow their respective patterns and happen to do the same thing.

### Open Folder Hook

Use `useOpenFolder()` for consistent folder opening:

```typescript
import { useOpenFolder } from '../hooks/useOpenFolder';

const { mutate: openFolder } = useOpenFolder();

// Current project
openFolder('recordings');

// Specific project
openFolder({ folder: 'recordings', projectCode: 'b72' });
openFolder({ folder: 'shadows', projectCode: project.code });
```

**Supported folder keys:**
- `recordings`, `safe`, `trash` - Recording folders
- `shadows` - Shadow recordings (`recording-shadows/`)
- `chapters` - Chapter recordings (`-chapters/`)
- `images`, `thumbs`, `inbox` - Asset folders
- `transcripts`, `final` - Output folders
- `ecamm`, `downloads`, `project` - System folders

## 11. Auto-save on Blur

**Pattern:** For text input auto-save, save when user leaves the field (onBlur), not on every keystroke. Show subtle feedback, no success toasts.

### Implementation

```typescript
// 1. Save handler (no debounce needed)
const handleSave = () => {
  if (!hasChanges) return

  setSaving(true)
  mutation.mutate(data, {
    onSuccess: () => {
      setSaving(false)  // ✅ Silent success
    },
    onError: () => {
      toast.error('Failed to save thing')  // ✅ Show error toast
      setSaving(false)
    },
  })
}

// 2. Attach to onBlur
<textarea
  value={text}
  onChange={(e) => setText(e.target.value)}
  onBlur={handleSave}  // ✅ Save when user leaves field
/>

// 3. Show "Saving..." indicator during save
{saving && <span className="text-xs text-blue-600">Saving...</span>}
```

### Key Principles

**Do:**
- ✅ Save on `onBlur` (when user exits field)
- ✅ Show "Saving..." indicator during save
- ✅ Show error toast if save fails
- ✅ Check if data changed before saving (avoid unnecessary API calls)

**Don't:**
- ❌ Save on every keystroke (noisy, triggers constantly while typing)
- ❌ Show success toast (auto-save should be silent when it works)
- ❌ Use debounced useEffect for text input (onBlur is cleaner)

### Toast Conventions

- **Auto-save:** No success toast, only error toast
- **Explicit saves (button clicks):** Show success toast (`'Thing saved'`)

### Rationale

1. **onBlur vs debounced** - User controls when save happens (exit field), not a timer
2. **Silent success** - Auto-save is expected to work; only announce failures
3. **No keystroke noise** - Indicators don't flash while user is typing

### Examples

- **ExportPanel** - Global/Project dictionary (FR-136)
- **ConfigPanel** - Explicit save button with success toast
- **WatchPage** - Annotation save button with success toast
