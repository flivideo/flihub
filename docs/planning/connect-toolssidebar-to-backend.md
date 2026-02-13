# Developer Handoff: Connect ToolsSidebar to Working Backend

## Problem

ToolsSidebar UI is shown but buttons call stub functions. The working backend endpoints exist but aren't connected.

## Solution (30 minutes)

Replace the stub `handleSimpleToolClick` in ManagePanel.tsx with actual API calls.

---

## Step 1: Add Socket.io Listeners (10 min)

**Location:** `client/src/components/ManagePanel.tsx`

**After line 97** (after existing useEffect), add Socket.io listeners:

```typescript
// Socket.io listeners for regen progress
useEffect(() => {
  const socket = getSocket();

  const handleShadowsProgress = (data: { current: number; total: number; filename: string }) => {
    toast.loading(`Shadows: ${data.current}/${data.total} - ${data.filename}`, {
      id: 'shadows-progress',
    });
  };

  const handleShadowsComplete = (data: { completed: number; failed: number }) => {
    toast.dismiss('shadows-progress');
    if (data.failed > 0) {
      toast.warning(`Shadows: ${data.completed} done, ${data.failed} failed`);
    } else {
      toast.success(`Shadows: ${data.completed} regenerated`);
    }
  };

  const handleChaptersProgress = (data: { current: number; total: number; chapter: string }) => {
    toast.loading(`Chapters: ${data.current}/${data.total} - Chapter ${data.chapter}`, {
      id: 'chapters-progress',
    });
  };

  const handleChaptersComplete = (data: { completed: number; failed: number }) => {
    toast.dismiss('chapters-progress');
    if (data.failed > 0) {
      toast.warning(`Chapters: ${data.completed} done, ${data.failed} failed`);
    } else {
      toast.success(`Chapters: ${data.completed} regenerated`);
    }
  };

  const handleAllProgress = (data: { step: string; current: number; total: number }) => {
    toast.loading(`Regen All: Step ${data.current}/${data.total} (${data.step})`, {
      id: 'all-progress',
    });
  };

  const handleAllComplete = () => {
    toast.dismiss('all-progress');
    toast.success('All derivative files regenerated');
  };

  socket.on('regen:shadows:progress', handleShadowsProgress);
  socket.on('regen:shadows:complete', handleShadowsComplete);
  socket.on('regen:chapters:progress', handleChaptersProgress);
  socket.on('regen:chapters:complete', handleChaptersComplete);
  socket.on('regen:all:progress', handleAllProgress);
  socket.on('regen:all:complete', handleAllComplete);

  return () => {
    socket.off('regen:shadows:progress', handleShadowsProgress);
    socket.off('regen:shadows:complete', handleShadowsComplete);
    socket.off('regen:chapters:progress', handleChaptersProgress);
    socket.off('regen:chapters:complete', handleChaptersComplete);
    socket.off('regen:all:progress', handleAllProgress);
    socket.off('regen:all:complete', handleAllComplete);
  };
}, []);
```

**Add import at top:**

```typescript
import { getSocket } from '../hooks/useSocket';
```

---

## Step 2: Replace Stub Function (15 min)

**Location:** `client/src/components/ManagePanel.tsx` line 318-320

**Remove this:**

```typescript
const handleSimpleToolClick = (
  tool: 'regen-shadows' | 'regen-transcripts' | 'regen-chapters' | 'regen-all'
) => {
  toast.info(`${tool} - coming soon`);
};
```

**Replace with:**

```typescript
const handleSimpleToolClick = async (
  tool: 'regen-shadows' | 'regen-transcripts' | 'regen-chapters' | 'regen-all'
) => {
  const selectedFilesArray = Array.from(selectedFiles);

  // Determine scope
  const targetFiles = selectedFilesArray.length > 0 ? selectedFilesArray : undefined;
  const scope =
    selectedFilesArray.length > 0
      ? `${selectedFilesArray.length} selected file${selectedFilesArray.length === 1 ? '' : 's'}`
      : `all ${recordings?.length || 0} files`;

  // Build file list preview (max 3 files)
  let fileListPreview = '';
  if (selectedFilesArray.length > 0) {
    if (selectedFilesArray.length <= 3) {
      fileListPreview = selectedFilesArray.map((f) => `• ${f}`).join('\n');
    } else {
      fileListPreview = `• ${selectedFilesArray.slice(0, 3).join('\n• ')}\n... and ${selectedFilesArray.length - 3} more`;
    }
  }

  // Confirmation dialog
  const type = tool.replace('regen-', '');
  const typeLabel =
    type === 'shadows'
      ? 'shadows'
      : type === 'transcripts'
        ? 'transcripts'
        : type === 'chapters'
          ? 'chapter videos'
          : 'all derivative files';

  let confirmMessage = `Regenerate ${typeLabel} for ${scope}?`;

  if (fileListPreview) {
    confirmMessage += `\n\nThis will regenerate:\n${fileListPreview}`;
  }

  if (type === 'chapters') {
    confirmMessage += `\n\nThis may take 30-60 seconds per chapter.`;
  } else if (type === 'all') {
    confirmMessage +=
      `\n\nThis will:\n` +
      `1. Regenerate shadows\n` +
      `2. Queue transcriptions\n` +
      `3. Regenerate chapter videos\n\n` +
      `This may take a long time.`;
  }

  confirmMessage += `\n\nContinue?`;

  const confirmed = window.confirm(confirmMessage);
  if (!confirmed) return;

  // Show start toast
  const toastLabel =
    type === 'shadows'
      ? 'Shadow Files'
      : type === 'transcripts'
        ? 'Transcripts'
        : type === 'chapters'
          ? 'Chapter Videos'
          : 'All Files';
  toast.info(`Regenerating ${toastLabel}...`);

  try {
    const endpoint = `/api/manage/${tool}`;
    const response = await fetch(`http://localhost:5101${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: targetFiles }),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Regeneration failed');
    }

    // For transcripts, show immediate completion (no Socket.io events)
    if (type === 'transcripts') {
      const queued = result.queued || 0;
      toast.success(`Queued ${queued} file${queued !== 1 ? 's' : ''} for transcription`);
    }

    // For shadows, chapters, and all - Socket.io events will handle progress/completion
  } catch (err) {
    console.error(`[Regen ${type}] Error:`, err);
    toast.error(
      `Failed to regenerate ${type}: ${err instanceof Error ? err.message : String(err)}`
    );
  }
};
```

---

## Step 3: Add Import for getSocket (1 min)

**Location:** Top of `client/src/components/ManagePanel.tsx`

**Find this line (around line 22):**

```typescript
import { useRecordingsSocket } from '../hooks/useSocket';
```

**Change to:**

```typescript
import { useRecordingsSocket, getSocket } from '../hooks/useSocket';
```

---

## Step 4: Test (5 min)

1. Start the server: `npm run dev`
2. Select 2-3 files in chapter 1
3. Click "Regen Shadows"
4. Confirm the dialog
5. Watch for:
   - ✅ Toast showing progress
   - ✅ Socket.io updates
   - ✅ Success toast when done
6. Check `recording-shadows/` folder for new files
7. Repeat for Regen Transcripts, Regen Chapters

---

## Expected Behavior After Fix

### Regen Shadows

- Confirmation dialog: "Regenerate shadows for 3 selected files?"
- Shows file list
- Toast: "Regenerating Shadow Files..."
- Progress toast updates: "Shadows: 1/3 - 01-1-intro.mov"
- Completion toast: "Shadows: 3 regenerated"

### Regen Transcripts

- Confirmation dialog: "Queue transcription for 3 selected files?"
- Toast: "Queued 3 files for transcription"
- Jobs appear in transcription queue

### Regen Chapters

- Confirmation dialog with warning: "This may take 30-60 seconds per chapter"
- Progress toast: "Chapters: 1/1 - Chapter 01"
- Completion toast: "Chapters: 1 regenerated"
- New chapter video in `recordings/-chapters/`

### Regen All

- Confirmation dialog with 3-step explanation
- Sequential progress through shadows → transcripts → chapters
- Final toast: "All derivative files regenerated"

---

## Files Modified

1. `client/src/components/ManagePanel.tsx`
   - Added Socket.io listeners (useEffect)
   - Replaced `handleSimpleToolClick` stub with real implementation
   - Added `getSocket` import

**Total lines changed:** ~150 lines
**Estimated time:** 30 minutes
**Risk:** Low (backend already works, just connecting frontend)

---

## Verification Checklist

- [ ] Regen Shadows works on selected files
- [ ] Regen Shadows works on all files (no selection)
- [ ] Progress toasts appear during regeneration
- [ ] Shadow files created in `recording-shadows/`
- [ ] Regen Transcripts queues jobs
- [ ] Transcription queue shows new jobs
- [ ] Regen Chapters creates chapter videos
- [ ] Chapter videos appear in `recordings/-chapters/`
- [ ] Regen All runs all three operations
- [ ] Confirmation dialogs show correct file counts
- [ ] Errors are caught and displayed

---

## Notes

- Socket.io events are already being emitted by the backend
- The backend already respects file selection (FR-136)
- Progress tracking is already implemented server-side
- This fix just connects the frontend UI to the working backend

---

**TL;DR:** Copy the working logic from RegenToolbar.tsx into ManagePanel.tsx to replace the stub functions. 30 minutes of work.
