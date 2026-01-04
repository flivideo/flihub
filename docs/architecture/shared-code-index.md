# Shared Code Index

**Last Updated:** 2026-01-04
**Purpose:** Document shared code between RecordingsView and ManagePanel to prevent duplication.

---

## Decision Rules

**When to create shared code:**
- Code is used by 2+ feature areas
- Logic is domain-agnostic (not Recordings-specific or Manage-specific)
- Reduces duplication

**When to keep code separate:**
- Code is feature-specific
- Only one feature needs it (now and foreseeable future)
- Sharing would create tight coupling

**Migration path:**
- Start in feature folder
- Move to shared/ when second feature needs it
- Update imports, test, commit

---

## Client-Side Shared Code

### Hooks

| Hook | Location | Used By | Purpose |
|------|----------|---------|---------|
| `useRecordings` | `hooks/useApi.ts` | RecordingsView, ManagePanel, WatchPage | Fetch recordings from API with React Query |
| `useConfig` | `hooks/useApi.ts` | All panels | Get server config (project path, tags, etc.) |
| `useRecordingsSocket` | `hooks/useSocket.ts` | RecordingsView, ManagePanel | Real-time file updates via Socket.io |

### Components

| Component | Location | Used By | Purpose |
|-----------|----------|---------|---------|
| `LoadingSpinner` | `components/shared/LoadingSpinner.tsx` | All panels | Consistent loading state |
| `ErrorMessage` | `components/shared/ErrorMessage.tsx` | All panels | Error display component |
| `RegenToolbar` | `components/shared/RegenToolbar.tsx` | ManagePanel (FR-131 Phase 2) | Regenerate derivative files (shadows/transcripts/chapters) |
| `PageContainer` | `components/shared/PageContainer.tsx` | All pages | Layout wrapper |
| `PageHeader` | `components/shared/PageHeader.tsx` | All pages | Consistent page headers |

### Utilities

| Utility | Location | Used By | Purpose |
|---------|----------|---------|---------|
| `formatFileSize` | `utils/formatting.ts` | RecordingsView, ManagePanel, ProjectsPage | Size formatting (B/KB/MB/GB) |
| `formatChapterTitle` | `utils/formatting.ts` | RecordingsView, ManagePanel | Format chapter display name |
| `groupByChapter` | `ManagePanel.tsx` | ManagePanel | Group recordings by chapter number |
| `extractTagsFromName` | `shared/naming.ts` | RecordingsView, ManagePanel | Parse tags from filename |

**NOTE:** `groupByChapter` function is currently in ManagePanel. Consider extracting to `utils/shared/grouping.ts` if RecordingsView needs it.

---

## Server-Side Shared Code

### Routes

| Endpoint | Location | Used By | Purpose |
|----------|----------|---------|---------|
| `GET /api/recordings` | `routes/index.ts` | RecordingsView, ManagePanel | Get recordings for viewing |
| `POST /api/manage/bulk-rename` | `routes/manage.ts` | ManagePanel | Bulk rename operation |
| `POST /api/manage/regen-shadows` | `routes/manage.ts` | ManagePanel (FR-131 Phase 2) | Regenerate shadow files |
| `POST /api/manage/regen-transcripts` | `routes/manage.ts` | ManagePanel (FR-131 Phase 2) | Queue transcriptions |
| `POST /api/manage/regen-chapters` | `routes/manage.ts` | ManagePanel (FR-131 Phase 2) | Regenerate chapter videos |
| `POST /api/manage/regen-all` | `routes/manage.ts` | ManagePanel (FR-131 Phase 2) | Regenerate all derivative files |

### Utilities

| Utility | Location | Used By | Purpose |
|---------|----------|---------|---------|
| `renameRecording` | `utils/renameRecording.ts` | ManagePanel, Index routes | FR-130 delete+regenerate rename logic |
| `getProjectPaths` | `shared/paths.ts` | All routes | Resolve project folder paths |
| `expandPath` | `utils/pathUtils.ts` | All routes | Expand ~ to home directory |
| `createShadowFile` | `utils/shadowFiles.ts` | Regen endpoints, Watcher | Create 240p shadow video |
| `queueTranscription` | `routes/transcriptions.ts` | Regen endpoints, Watcher | Queue Whisper transcription |
| `generateChapterRecording` | `utils/chapterRecording.ts` | Regen endpoints, Chapters route | Generate chapter video |
| `groupRecordingsByChapter` | `utils/chapterRecording.ts` | Regen endpoints, Chapters route | Group recordings by chapter |

---

## Code Examples

### Importing Shared Code

```typescript
// ✅ Good: Import from shared location
import { LoadingSpinner, ErrorMessage } from '../components/shared'
import { formatFileSize, formatChapterTitle } from '../utils/formatting'
import { useRecordings, useConfig } from '../hooks/useApi'

// ❌ Bad: Don't import from feature-specific locations
import { LoadingSpinner } from '../components/RecordingsView/LoadingSpinner'
```

### JSDoc Comments for Shared Code

```typescript
/**
 * Format file size in human-readable format
 *
 * @location utils/formatting.ts (SHARED)
 * @usedBy RecordingsView, ManagePanel, ProjectsPage
 * @param bytes - File size in bytes
 * @returns Formatted string like "2.3 MB"
 *
 * @example
 * formatFileSize(1024) // "1.0 KB"
 * formatFileSize(2500000) // "2.4 MB"
 */
export function formatFileSize(bytes: number): string {
  // ...
}
```

---

## Future Refactoring

**Potential shared code to extract:**

1. **`groupByChapter` function**
   - Currently: Duplicated in ManagePanel.tsx
   - Move to: `client/src/utils/shared/grouping.ts`
   - When: If RecordingsView needs chapter grouping

2. **File filtering logic (park/safe)**
   - Currently: Inline in RecordingsView
   - Move to: `client/src/utils/shared/filtering.ts`
   - When: If ManagePanel needs park/safe filtering

3. **Recording state management**
   - Currently: `.flihub-state.json` read/write scattered
   - Move to: `server/src/utils/shared/projectState.ts`
   - When: Multiple features need state manipulation

---

## FR-131 Phase 2 Additions

**New Shared Components:**
- `RegenToolbar` - Regeneration toolbar with 4 buttons (shadows, transcripts, chapters, all)

**New Server Utilities:**
- `regenerateShadowsInternal` - Internal helper for shadow regeneration
- `regenerateTranscriptsInternal` - Internal helper for transcript queuing
- `regenerateChaptersInternal` - Internal helper for chapter regeneration
- `regenerateAllAsync` - Orchestrator for sequential regeneration

**New Socket.io Events:**
- `regen:shadows:complete` - Shadow regeneration complete
- `regen:chapters:progress` - Chapter regeneration progress
- `regen:chapters:complete` - Chapter regeneration complete
- `regen:all:started` - All regeneration started
- `regen:all:progress` - All regeneration progress
- `regen:all:complete` - All regeneration complete
- `regen:all:error` - All regeneration error

---

**Maintenance:** Update this document when:
- New shared code is created
- Code is moved from feature to shared location
- New feature (e.g., WatchPage) uses existing shared code
