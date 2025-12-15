# FR-83 Product Owner Handover: Shadow Recording System Enhancements

**Status:** Complete
**Date:** 2025-12-15
**Developer:** Claude

---

## Summary

Enhanced the FR-83 Shadow Recording System with unified folder access, visual status indicators for recording states, and consistent UX patterns across the Projects page. Shadow recordings are 240p preview videos that enable collaborators to review content without transferring large original files.

---

## What Was Built

### Modified Files

| File | Change |
|------|--------|
| `server/src/routes/system.ts` | Extended open-folder API with `projectCode` parameter and new folder keys (`shadows`, `chapters`) |
| `server/src/routes/query/recordings.ts` | Added `hasShadow` tracking - identifies real recordings that have corresponding shadows |
| `server/src/WatcherManager.ts` | Added shadow directories to recordings watcher for real-time updates |
| `client/src/hooks/useOpenFolder.ts` | Extended to support project-specific folder opening |
| `client/src/components/ProjectsPanel.tsx` | Clickable columns (Files, Shadows, Ch), consistent UX patterns |
| `client/src/components/RecordingsView.tsx` | Added recording status indicators (real/shadow/both) |
| `client/src/components/WatchPage.tsx` | Added recording status indicators |
| `shared/types.ts` | Added `hasShadow` field to `RecordingFile` interface |

---

## Features Delivered

### 1. Unified Open-Folder API

Extended the existing unified API to support opening folders for ANY project (not just current):

```typescript
// Before: Only current project
openFolder('recordings')

// After: Any project
openFolder({ folder: 'recordings', projectCode: 'b72' })
openFolder({ folder: 'shadows', projectCode: 'b86' })
openFolder({ folder: 'chapters', projectCode: 'b88' })
```

**New folder keys added:**
- `shadows` - Opens `recording-shadows/` folder
- `chapters` - Opens `-chapters/` folder

### 2. Recording Status Indicators

Three-state visual system for recordings:

| State | Icon | Meaning |
|-------|------|---------|
| Real only | 📹 | Original recording, no shadow yet |
| Real + Shadow | 📹👻 | Original recording with shadow (synced for collaborators) |
| Shadow only | 👻 | Preview only, original not on this machine |

**Displayed in:**
- RecordingsView table (Status column)
- WatchPage segments panel

### 3. Shadow Directory Watching

Added `recording-shadows/` and `recording-shadows/-safe/` to the recordings watcher, so the UI auto-refreshes when shadows are created or deleted.

### 4. ProjectsPanel Clickable Stats

Made stat columns clickable to open their folders:

| Column | Click Action | Condition |
|--------|--------------|-----------|
| **Files** | Opens `recordings/` | Always clickable if count > 0 |
| **Shadows (👻)** | Opens `recording-shadows/` | Always clickable if count > 0 |
| **Ch** | Opens `-chapters/` | Only clickable if `chapterVideoCount > 0` |

---

## ProjectsPanel UX Pattern

Established consistent interaction patterns for the Projects table:

### Element Types

| Type | Behavior | Examples |
|------|----------|----------|
| **Indicators** | Show only when content exists, click navigates to tab | 📥 Inbox, 🖼 Assets |
| **Indicators (folder)** | Show only when content exists, click opens folder | 🎬 Chapters |
| **Count columns** | Show count, click opens folder | Files, Shadows, Ch |
| **Status displays** | Show status, hover for tooltip (not clickable) | 📄 Transcript %, ✅ Final |
| **Toggles** | Click cycles through states | 📌 Priority, Stage badge |

### Full UX Matrix

| Element | Type | Click Behavior | Tooltip |
|---------|------|----------------|---------|
| 📌 Priority | Toggle | Pin/unpin project | Shows current state |
| Project Code | Navigation | Switch to project | - |
| Stage | Toggle | Click: next, Shift+Click: prev | Shows description |
| 📥 Inbox | Indicator | Switch project + navigate to Inbox tab | "Click to view in app" |
| 🖼 Assets | Indicator | Switch project + navigate to Assets tab | "Click to view in app" |
| 🎬 Chapters | Indicator | Opens -chapters folder | "Click to open folder" |
| Ch column | Folder link | Opens -chapters folder | Only clickable if videos exist |
| Files column | Folder link | Opens recordings folder | "Open recordings folder" |
| 👻 Shadows column | Folder link | Opens recording-shadows folder | "Open recording-shadows folder" |
| 📄 Transcript % | Status | Not clickable | Shows sync stats |
| ✅ Final Video | Status | Not clickable | Shows video/srt status |
| ⓘ Info | Popup | Shows project stats popup | "View project stats" |

---

## API Changes

### POST /api/system/open-folder

**Request body (extended):**
```typescript
{
  folder: FolderKey;
  projectCode?: string;  // NEW: Optional project override
}
```

**Supported folder keys:**
```typescript
type FolderKey =
  | 'ecamm' | 'downloads' | 'project'
  | 'recordings' | 'safe' | 'trash'
  | 'images' | 'thumbs' | 'transcripts'
  | 'final' | 's3Staging' | 'inbox'
  | 'shadows'   // NEW
  | 'chapters'; // NEW
```

---

## Type Changes

### RecordingFile (shared/types.ts)

```typescript
interface RecordingFile {
  filename: string;
  chapter: string;
  sequence: string;
  name: string;
  tags: string[];
  folder: 'recordings' | 'safe';
  size: number;
  duration: number | null;
  hasTranscript: boolean;
  isShadow?: boolean;    // FR-83: True if shadow-only (no real recording)
  hasShadow?: boolean;   // FR-83: True if this recording has a shadow file
}
```

---

## Testing Notes

- [x] Files column opens recordings folder for correct project
- [x] Shadows column opens recording-shadows folder for correct project
- [x] Ch column only clickable when chapterVideoCount > 0
- [x] Status indicators display correctly in RecordingsView
- [x] Status indicators display correctly in WatchPage
- [x] Shadow directory changes trigger UI refresh
- [x] Inbox/Assets indicators still navigate to tabs (not folders)
- [x] Chapters indicator opens folder (not tab)

---

## Design Decisions

### Why distinguish "indicators" vs "count columns"?

- **Indicators** (📥, 🖼, 🎬) are presence markers - they show something exists
- **Count columns** show quantities and always open the underlying folder

Indicators can have varied behaviors (navigate to tab vs open folder) based on whether there's an in-app view for that content.

### Why not make Transcript % clickable to navigate to Transcriptions tab?

Transcript % is a sync status metric, not a content indicator. It shows coverage (how many recordings have transcripts) rather than "there's something here to see." Could be added as enhancement if useful.

### Why does Ch column have two clickable elements?

- **Ch column number** - Opens -chapters folder (same as Files/Shadows pattern)
- **🎬 indicator** - Also opens -chapters folder (presence marker pattern)

This is intentional redundancy. The Ch column follows the "count opens folder" pattern established by Files/Shadows. The 🎬 indicator follows the "presence marker" pattern. Both happen to do the same thing, which is fine.

---

## Future Enhancement Ideas

1. **Transcript % clickable** - Navigate to Transcriptions tab for that project
2. **Final Video clickable** - Open -final folder
3. **Bulk shadow generation** - Create shadows for all recordings missing them
4. **Shadow sync status** - Show which shadows are out of date

---

## Sign-off

FR-83 Shadow Recording System enhancements are complete. The ProjectsPanel now has a consistent, documented UX pattern that can guide future additions.
