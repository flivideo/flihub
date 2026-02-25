# FR-143: SRT Clipboard Copy Button

**Status:** Pending
**Priority:** LOW - Quality of life improvement
**Added:** 2026-02-24
**Type:** Feature
**Depends on:** FR-142 (S3 Staging Tool - Complete)

---

## User Story

As a video producer, when I see an SRT file listed in the S3 Staging PREP section, I want to click a small button next to it to copy the clean spoken text to my clipboard, so I can quickly paste transcribed content elsewhere without opening the file manually.

---

## Problem

SRT files appear in the S3 Staging PREP section (both Source and Staging columns). When a user wants the transcript text — for pasting into notes, a script, a prompt, or another tool — they currently have to:

1. Navigate to the file on disk
2. Open it in a text editor
3. Manually strip out the sequence numbers and timestamp lines
4. Copy the remaining text

This is friction for what should be a one-click action.

---

## Solution

Add a small clipboard icon button inline next to any `.srt` file listed in the S3 Staging PREP section. Clicking the button:

1. Calls a server endpoint to read the SRT file
2. Server strips all sequence numbers and timestamp lines, returning plain text
3. Client writes the plain text to the clipboard via `navigator.clipboard.writeText()`
4. A brief toast notification confirms "Copied to clipboard"

No modal, drawer, or preview needed — pure clipboard action.

---

## UI Mockup

SRT file row in PREP section (Source or Staging column):

```
┌──────────────────────────────────────────────────────┐
│  PREP — Source (edit-1st/)                           │
│  ┌────────────────────────────────────────────────┐  │
│  │ 📄 c15-opus-4.6-appystack.srt  27.6 KB  [📋]  │  │
│  │ 📄 c15-opus-4.6-appystack.mov  1.2 GB          │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

- The `[📋]` clipboard icon button appears **only** for `.srt` files
- Non-SRT files render as before with no extra button
- Button is small, muted, inline — does not disrupt layout
- On click: button briefly shows a check state, then toast confirms copy

---

## Acceptance Criteria

- [ ] A clipboard icon button appears next to `.srt` files in the S3 Staging PREP section (Source column and Staging column)
- [ ] Clicking the button calls `GET /api/s3/srt-text?path=<filepath>`
- [ ] The server reads the file, strips sequence number lines (digit-only lines) and timestamp lines (`HH:MM:SS,mmm --> HH:MM:SS,mmm`), and returns joined plain text
- [ ] Client writes the returned text to clipboard using `navigator.clipboard.writeText()`
- [ ] A toast notification "Copied to clipboard" appears after successful copy
- [ ] The button does not appear on non-SRT files
- [ ] The button does not appear in the POST section (only PREP)
- [ ] If the clipboard API fails (e.g. insecure context), an error toast is shown
- [ ] If the server cannot read the file, an error toast is shown

---

## Technical Notes

### Server Endpoint

**New route:** `GET /api/s3/srt-text?path=<filepath>`

- `path` is the absolute file path to the `.srt` file on the server
- Reads the file with `fs.readFile`
- Strips SRT formatting:
  - Remove lines matching `/^\d+$/` (sequence numbers)
  - Remove lines matching `/^\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}$/` (timestamps)
  - Remove blank lines that result from stripping
  - Join remaining lines with a single space or newline (newline preferred for readability)
- Returns `Content-Type: text/plain` with the stripped text
- Returns 400 if `path` param is missing
- Returns 404 if file does not exist
- Returns 500 on read error

**Suggested location:** Add to `server/src/routes/s3-staging.ts` or a new `server/src/routes/srt.ts`

### Client

**Component:** `client/src/components/shared/S3StagingTool.tsx`

- PREP section renders a file list; each item needs an `.srt` check
- If `file.name.endsWith('.srt')`, render a small clipboard icon button after the filename
- On click, call `GET /api/s3/srt-text?path=<file.path>` via fetch
- On success, call `navigator.clipboard.writeText(text)`
- Show toast: "Copied to clipboard" (success) or "Copy failed" (error)
- Use existing toast pattern in the codebase (check for existing toast utility)

**Button styling:**
```tsx
<button
  onClick={() => handleCopySrtText(file.path)}
  title="Copy transcript text"
  className="ml-2 text-gray-400 hover:text-gray-200 transition-colors"
>
  <ClipboardIcon className="w-4 h-4" />
</button>
```

### SRT Stripping Algorithm (pseudo-code)

```
lines = file.split('\n')
result = []
for line in lines:
  trimmed = line.trim()
  if trimmed matches /^\d+$/:         # sequence number
    skip
  if trimmed matches /^\d{2}:\d{2}:\d{2},\d{3} --> ...$/:  # timestamp
    skip
  if trimmed is empty:
    skip
  result.append(trimmed)
return result.join('\n')
```

### Scope Boundary

- **In scope:** S3 Staging PREP section file rows only (Source column + Staging column)
- **Out of scope:** POST section files, recordings list, any other SRT file display elsewhere in the app

---

## Out of Scope

- Inline SRT preview (no modal or drawer)
- SRT editing
- Timestamp-preserving view mode
- Applying this button to other sections (POST, recordings, assets)

---

## Completion Notes

**What was done:**
- Added `path` field to `listFiles()` in the `/status` endpoint so each file includes its absolute path
- Added `GET /api/s3-staging/srt-text?path=<filepath>` endpoint that reads an SRT file and strips sequence numbers and timestamps, returning clean plain text
- Added `path?: string` to `FileInfo` interface in `useS3StagingApi.ts`
- Added `showSrtClipboard` prop to `FileList` component with local `copyingFile` state
- `FileList` shows a 📋 clipboard button inline after `.srt` filenames when `showSrtClipboard` is true
- Clicking copies stripped text to clipboard via `navigator.clipboard.writeText()` with success/error toasts
- Imported `API_URL` into `S3StagingTool.tsx` for the fetch call
- `showSrtClipboard` passed to PREP Source and PREP Staging `FileList` instances only — POST section unchanged

**Files changed:**
- `server/src/routes/s3-staging.ts` (modified — listFiles + new srt-text route)
- `client/src/hooks/useS3StagingApi.ts` (modified — FileInfo.path)
- `client/src/components/shared/S3StagingTool.tsx` (modified — FileList + API_URL import)

**Testing notes:**
- Start dev server (`npm run dev`)
- Open S3 Staging tool in Manage panel
- If an `.srt` file appears in PREP Source or PREP Staging, a 📋 button should appear inline
- Click it — clean transcript text should be in clipboard, toast "Copied to clipboard" shown
- Non-SRT files (.mov, .mp4, .zip) should show no button
- POST section file list has no clipboard buttons

**Status:** Complete

---

## Testing Checklist

- [ ] `.srt` file in PREP Source column shows clipboard button
- [ ] `.srt` file in PREP Staging column shows clipboard button
- [ ] Non-SRT files (`.mov`, `.mp4`, `.zip`) do not show the button
- [ ] Clicking button on valid SRT copies clean text (no timestamps, no sequence numbers)
- [ ] Toast "Copied to clipboard" appears on success
- [ ] POST section files do not show the button
- [ ] Error toast shown when server returns non-200
- [ ] Error toast shown when clipboard API is unavailable
