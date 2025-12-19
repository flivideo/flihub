# FR-105: S3 DAM Integration

## User Story

As David, I want to upload my prep files to S3 and download Jan's edits directly from the S3 Staging modal, so I don't have to switch to the terminal to run DAM commands.

## Problem Statement

The S3 Staging modal (FR-103) currently handles local file management only:
- Syncing files from `edits/prep/` to `s3-staging/prep/`
- Promoting post versions to `edits/publish/`
- Migrating legacy flat structures

**Missing:** The actual S3 sync operations that would call the DAM CLI tool to upload/download files to/from the shared S3 bucket.

Current workflow requires David to:
1. Use FliHub modal to sync local files
2. Open terminal
3. Run `dam s3-up appydave b85-clauding-01` manually
4. Wait for Jan to edit
5. Run `dam s3-down appydave b85-clauding-01` manually
6. Return to FliHub to promote

This breaks the flow and requires context switching.

## Solution

Add DAM integration buttons to the S3 Staging modal that execute DAM CLI commands and show S3 status.

---

## UI Design

### Updated PREP Section

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PREP (Your First Edit → Jan)                                               │
│                                                                             │
│  Source: edits/prep/                                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ✓ b85-clauding-01.mp4                                      512 MB  │   │
│  │  ✓ b85-clauding-01.srt                                       32 KB  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Staging: s3-staging/prep/                           [Sync from Source]     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ✓ b85-clauding-01.mp4                              512 MB  synced  │   │
│  │  ✓ b85-clauding-01.srt                               32 KB  synced  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  S3: ✓ Uploaded                              [Upload to S3] [View]  │   │
│  │      2 files • Last sync: 2 days ago                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Updated POST Section

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  POST (Jan's Edits → You)                                                   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  S3: 2 new files available                      [Download from S3]  │   │
│  │      b85-clauding-01-v2.mp4, b85-clauding-01-v2.srt                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Local: s3-staging/post/                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ✓ b85-clauding-01-v1.mp4                             498 MB  v1    │   │
│  │  ✓ b85-clauding-01-v1.srt                              31 KB  v1    │   │
│  │  ✓ b85-clauding-01-v2.mp4                             502 MB  v2    │   │
│  │  ⚠ b85-clauding-01-v2.srt                            MISSING  v2    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### New CLEANUP Section (at bottom)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  CLEANUP                                                                    │
│                                                                             │
│  Local s3-staging: 1.5 GB                                  [Clean Local]    │
│  S3 bucket: 1.5 GB                                         [Clean S3]       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Button Behaviors

### [Upload to S3]
- **Action:** Upload `s3-staging/prep/` contents to S3
- **DAM command:** `dam s3-up {brand} {project-code}`
- **Example:** `dam s3-up appydave b85-clauding-01`
- **Feedback:** Progress indicator, then success/error toast
- **Post-action:** Refresh S3 status

### [Download from S3]
- **Action:** Download new files from S3 `post/` to local `s3-staging/post/`
- **DAM command:** `dam s3-down {brand} {project-code}`
- **Example:** `dam s3-down appydave b85-clauding-01`
- **Feedback:** Progress indicator, then success/error toast
- **Post-action:** Refresh file list

### [View]
- **Action:** Open S3 console in browser for this project's bucket
- **URL pattern:** `https://s3.console.aws.amazon.com/s3/buckets/v-{brand}/{project-code}/`
- **Example:** `https://s3.console.aws.amazon.com/s3/buckets/v-appydave/b85-clauding-01/`

### [Clean Local]
- **Action:** Delete all files in `s3-staging/` (both prep/ and post/)
- **Confirmation:** "Delete all staging files? This cannot be undone."
- **Note:** Local only, no DAM command

### [Clean S3]
- **Action:** Delete S3 bucket contents for this project
- **DAM command:** `dam s3-cleanup {brand} {project-code}`
- **Confirmation:** "Delete all S3 files for this project? This cannot be undone."

---

## S3 Status Display

### PREP S3 Status States

| State | Display | Meaning |
|-------|---------|---------|
| Not uploaded | `S3: ○ Not uploaded` (gray) | No files in S3 prep/ |
| Uploaded | `S3: ✓ Uploaded` (green) | Files match local staging |
| Out of sync | `S3: ⚠ Out of sync` (amber) | Local has newer files |
| Error | `S3: ✕ Error` (red) | DAM command failed |

### POST S3 Status States

| State | Display | Meaning |
|-------|---------|---------|
| No files | `S3: No files from Jan` (gray) | S3 post/ is empty |
| New available | `S3: 2 new files available` (blue) | Files in S3 not downloaded |
| All synced | `S3: ✓ All downloaded` (green) | Local matches S3 |

---

## API Design

### GET /api/s3-staging/s3-status

Get S3 bucket status for current project.

**Response:**
```json
{
  "success": true,
  "prep": {
    "uploaded": true,
    "fileCount": 2,
    "totalSize": 536903680,
    "lastSync": "2025-12-16T10:30:00Z",
    "inSync": true
  },
  "post": {
    "fileCount": 4,
    "totalSize": 1073741824,
    "newFilesAvailable": 2,
    "newFiles": ["b85-clauding-01-v2.mp4", "b85-clauding-01-v2.srt"]
  }
}
```

### POST /api/s3-staging/dam

Execute a DAM command.

**Request:**
```json
{
  "action": "upload" | "download" | "cleanup-s3" | "status"
}
```

**Response (success):**
```json
{
  "success": true,
  "action": "upload",
  "command": "dam s3-up appydave b85-clauding-01",
  "output": "Uploaded 2 files (512 MB)",
  "duration": 45000
}
```

**Response (error):**
```json
{
  "success": false,
  "action": "upload",
  "command": "dam s3-up appydave b85-clauding-01",
  "error": "AWS credentials not configured",
  "exitCode": 1
}
```

### DELETE /api/s3-staging/local

Delete all local staging files.

**Response:**
```json
{
  "success": true,
  "deleted": {
    "prep": 2,
    "post": 4
  },
  "freedSpace": 1610612736
}
```

---

## Technical Notes

### DAM CLI Integration

The server needs to execute DAM commands via child_process:

```typescript
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

async function runDamCommand(args: string[]): Promise<{ stdout: string; stderr: string }> {
  const command = `dam ${args.join(' ')}`
  return execAsync(command, { timeout: 300000 }) // 5 min timeout for large files
}
```

### Brand Detection

Brand is derived from project path:
- `/video-projects/v-appydave/b85-clauding-01/` → brand: `appydave`
- `/video-projects/v-voz/boy-baker/` → brand: `voz`

This is already available in the project resolution API (FR-61).

### Error Handling

| Error | User Message |
|-------|--------------|
| DAM not installed | "DAM CLI not found. Install with: gem install appydave-tools" |
| AWS credentials missing | "AWS credentials not configured. Run: aws configure" |
| Network timeout | "Upload timed out. Check your connection and try again." |
| S3 bucket not found | "S3 bucket not found for this brand." |

### Progress Feedback

For long operations (upload/download), show:
1. Button changes to spinner + "Uploading..."
2. Disable other S3 buttons during operation
3. On complete: Toast with result, refresh status

---

## DAM Prerequisites

The following DAM commands must exist and work:

| Command | Purpose | Status |
|---------|---------|--------|
| `dam s3-up {brand} {project}` | Upload staging/prep to S3 | Verify exists |
| `dam s3-down {brand} {project}` | Download S3 post to local | Verify exists |
| `dam s3-status {brand} {project}` | Get S3 file listing | May need creation |
| `dam s3-cleanup {brand} {project}` | Delete S3 files | Verify exists |

**Action needed:** Verify these commands exist in appydave-tools DAM module. If `s3-status` doesn't exist, it needs to be created to support the status display.

---

## Acceptance Criteria

- [ ] PREP section shows S3 upload status (uploaded/not uploaded/out of sync)
- [ ] [Upload to S3] button calls `dam s3-up` and shows progress
- [ ] [View] button opens S3 console in browser
- [ ] POST section shows count of new files available in S3
- [ ] [Download from S3] button calls `dam s3-down` and refreshes file list
- [ ] CLEANUP section shows local and S3 storage sizes
- [ ] [Clean Local] deletes staging files with confirmation
- [ ] [Clean S3] calls `dam s3-cleanup` with confirmation
- [ ] Error states display helpful messages
- [ ] All buttons disabled during active DAM operations

---

## Out of Scope

- Subfolder-aware DAM commands (prep/ vs post/ in S3) - requires DAM enhancement
- Real-time S3 sync progress (percentage) - DAM doesn't expose this
- Automatic sync detection - requires polling or webhooks

---

## Dependencies

- FR-103: S3 Staging Page (completed)
- appydave-tools DAM module with S3 commands
- AWS CLI configured with credentials

---

## Files to Modify

| File | Changes |
|------|---------|
| `server/src/routes/s3-staging.ts` | Add /s3-status, /dam, DELETE /local endpoints |
| `client/src/components/S3StagingPage.tsx` | Add S3 status display, DAM buttons, cleanup section |
| `client/src/hooks/useS3StagingApi.ts` | Add hooks for new endpoints |

---

## Completion Notes

**Implemented:** 2025-12-18

**What was built:**
- All API endpoints as specified (s3-status, dam, local cleanup, local-size)
- Full UI implementation with S3 status displays in PREP and POST sections
- CLEANUP section with confirmation dialogs
- Progress indicators during DAM operations
- Brand detection from project path

**DAM Command Integration:**
The implementation calls DAM CLI commands via child_process.exec with:
- 5-minute timeout for large file uploads
- Helpful error messages for common issues (DAM not installed, AWS credentials missing, timeout)
- Console logging of DAM operations for debugging

**Files Modified:**
- `server/src/routes/s3-staging.ts` - 4 new endpoints
- `client/src/hooks/useS3StagingApi.ts` - 4 new hooks
- `client/src/components/S3StagingPage.tsx` - S3 status displays, DAM buttons, CLEANUP section

**Testing Notes:**
- Server starts and runs without errors
- Pre-existing TypeScript config issues in the codebase don't affect this feature
- Requires DAM CLI and AWS CLI to be installed and configured for full functionality

