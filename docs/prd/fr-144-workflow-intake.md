# FR-144: Send Transcript to POEM WUI Workflow Intake

**Status:** Implemented
**Priority:** HIGH - Required for YouTube Launch Optimizer workflow integration
**Added:** 2026-02-25
**Type:** Feature
**Depends on:** FR-143 (SRT Clipboard - Complete), FR-142 (S3 Staging Tool - Complete)

---

## User Story

As a video producer, after my video is finished and the transcript is available, I want to click a single button in FliHub to send the project transcript and metadata to POEM WUI (SupportSignal), so it auto-loads into the YouTube Launch Optimizer workflow ready for me to generate YouTube optimisation artefacts (titles, descriptions, chapters, etc.) without any copy-paste friction.

---

## Problem

Once a video is finished — recording done, SRT generated, final edit complete — the producer needs to kick off YouTube optimisation. This currently means:

1. Locating the raw transcript `.txt` file on disk
2. Opening it in a text editor
3. Copying the full text
4. Switching to POEM WUI (SupportSignal prompt app)
5. Pasting into the workflow intake form along with project metadata
6. Submitting

This is a multi-step, context-switching, error-prone manual process. FliHub already has the project context (folder name, project code) and knows where the transcript lives — it should be able to push all of this with one click.

---

## Context

The POEM WUI app (SupportSignal `prompt.supportsignal.com.au`, running locally on port 3001) exposes a workflow intake endpoint:

```
POST http://localhost:5041/api/workflow/intake
Content-Type: application/json
```

This endpoint accepts a payload that specifies which workflow to launch and pre-populates the relevant data store. Within ~3 seconds, POEM WUI's landing screen detects the incoming data, auto-populates the paste textarea, switches to the correct workflow, and shows a "Data received from FliHub" banner. The user then reviews and clicks Submit.

The endpoint is being built in SupportSignal WUI Round 11. FliHub must be ready to call it as soon as that round ships.

---

## Solution

### Overview

Add a "Send to POEM WUI" button in the S3 Staging Tool POST section (the "publish" stage of the workflow, where the finished video and SRT have been returned from the editor). When clicked:

1. FliHub server reads the raw transcript `.txt` file from `recording-transcripts/`
2. FliHub server optionally reads the SRT file from `final/` or `s3-staging/`
3. FliHub server POSTs the payload to POEM WUI's intake endpoint
4. Client shows success or error feedback

### Payload Sent

```json
{
  "workflowId": "youtube-launch-optimizer",
  "store": {
    "projectFolder": "b85-clauding-01",
    "transcript": "<full raw transcript text>",
    "chapterFolderNames": [],
    "srt": "<srt file content or null>",
    "brandConfig": null
  }
}
```

Fields sent by FliHub:

| Field | Source in FliHub |
|-------|-----------------|
| `workflowId` | Hardcoded: `"youtube-launch-optimizer"` |
| `store.projectFolder` | Current project folder name (e.g. `b85-clauding-01`) |
| `store.transcript` | Contents of `recording-transcripts/<name>.txt` |
| `store.chapterFolderNames` | Empty array for now (future enhancement) |
| `store.srt` | Contents of SRT if found in `final/` or `s3-staging/`, else null |
| `store.brandConfig` | null (future enhancement) |

---

## Where the Button Lives

The button is placed in the **S3 Staging Tool POST section** — this is where the producer works after the editor has returned the finished video. A "Publish" subsection sits at the bottom of the POST section.

```
┌──────────────────────────────────────────────────────────────────────┐
│  S3 STAGING TOOL                                                     │
│                                                                      │
│  [PREP]  [POST]  [CLEANUP]                          ← section tabs  │
│                                                                      │
│  ── POST — Jan's Edits → You ──────────────────────────────────────  │
│                                                                      │
│  Files in s3-staging/ (from editor):                                 │
│  📄 c15-opus-4.6-appystack-v2.mp4    1.2 GB  [View] [Open]          │
│  📄 c15-opus-4.6-appystack-v2.srt   27.6 KB  [📋]  [View] [Open]   │
│                                                                      │
│  [↓ Download from S3]    [→ Promote to final/]                       │
│                                                                      │
│  ── Publish ───────────────────────────────────────────────────────  │
│                                                                      │
│  Transcript:  recording-transcripts/c15-opus-4.6-appystack.txt ✓    │
│  SRT:         s3-staging/c15-opus-4.6-appystack-v2.srt         ✓    │
│                                                                      │
│  [ Send to POEM WUI → ]                                              │
│                                                                      │
│  Status: ● Ready  (transcript found, SRT found)                      │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

- The "Publish" subsection shows which transcript and SRT files were found
- If no transcript is found, the button is disabled with a tooltip explaining why
- If no SRT is found, the button is enabled but SRT will be sent as null
- After clicking: button shows a loading spinner, then success ("Sent to POEM WUI") or error feedback

---

## Acceptance Criteria

1. A "Publish" subsection appears at the bottom of the POST section in the S3 Staging Tool
2. The subsection shows the transcript file found (filename + found/missing status)
3. The subsection shows the SRT file found (filename + found/missing status, optional)
4. The "Send to POEM WUI" button is disabled (with tooltip) if no transcript file is found
5. Clicking the button calls `POST /api/s3-staging/publish-to-poem` on the FliHub server
6. The server reads the transcript `.txt` file from `recording-transcripts/` in the current project directory
7. The server reads the SRT file from `s3-staging/` or `final/` if one exists (first match wins); sends null if not found
8. The server POSTs to the configured POEM WUI URL (default `http://localhost:5041/api/workflow/intake`) with `workflowId: "youtube-launch-optimizer"` and the store payload
9. If POEM WUI returns `{ ok: true }`, the client shows a toast: "Sent to POEM WUI"
10. If POEM WUI returns `{ ok: false, error: "..." }`, the client shows an error toast with the message
11. If the network call fails (POEM WUI not running), the client shows an error toast: "POEM WUI not reachable — is it running on port 3001?"
12. The POEM WUI base URL is configurable via `server/config.json` (key: `poemWuiUrl`, default: `http://localhost:5041`)
13. The button shows a loading spinner while the request is in flight
14. The feature does not block or interfere with any other S3 Staging Tool functionality

---

## Technical Notes

### Server Endpoint

**New route:** `POST /api/s3-staging/publish-to-poem`

No request body required — the server uses the current project configuration.

Request flow:
1. Read `projectDirectory` from server config
2. Derive `projectFolder` as the basename of `projectDirectory`
3. Scan `recording-transcripts/` for the first `.txt` file; read its contents
4. Scan `s3-staging/` and then `final/` for the first `.srt` file; read its contents (or leave null)
5. Build payload and POST to `config.poemWuiUrl + "/api/workflow/intake"`
6. Return `{ ok: true }` or `{ ok: false, error: "..." }` to client

Response shape:
```json
{ "ok": true }
// or
{ "ok": false, "error": "No transcript file found in recording-transcripts/" }
// or
{ "ok": false, "error": "POEM WUI returned: workflowId is required" }
```

**Suggested location:** Add to `server/src/routes/s3-staging.ts`

### Server Status Endpoint Enhancement

**Enhanced route:** `GET /api/s3-staging/status` (existing)

Add a `publishReady` section to the existing status response so the client can show what was found without a separate fetch:

```json
{
  "publishReady": {
    "transcriptFile": "c15-opus-4.6-appystack.txt",
    "transcriptFound": true,
    "srtFile": "c15-opus-4.6-appystack-v2.srt",
    "srtFound": true
  }
}
```

If no project is configured, return `null` for `publishReady`.

### Transcript File Location

Per project directory structure in CLAUDE.md:

```
project-root/
├── recording-transcripts/   # .txt and .srt files from Whisper
│   ├── <name>.txt           # Raw text transcript  ← what we read
│   └── <name>.srt           # SRT subtitle file
```

The server scans `recording-transcripts/` for the first `.txt` file. If multiple `.txt` files exist, it picks the first one alphabetically (or we can pick the largest — TBD by developer, document in completion notes).

### SRT File Location (Optional)

Scan order (first match wins):
1. `s3-staging/*.srt` — most recent version from editor
2. `final/*.srt` — promoted final copy
3. `recording-transcripts/*.srt` — original Whisper SRT

### Config

Add to `server/config.json`:
```json
{
  "poemWuiUrl": "http://localhost:5041"
}
```

The server must fall back to `"http://localhost:5041"` if the key is absent (backwards compatibility).

### Client

**Component:** `client/src/components/shared/S3StagingTool.tsx`

- Add a "Publish" subsection inside the POST section
- Read `publishReady` from the existing `useS3StagingStatus()` hook response (after server enhancement)
- Add a `usePublishToPoem` mutation hook in `useS3StagingApi.ts` (POST to `/api/s3-staging/publish-to-poem`)
- Button state: disabled (grey) if `!publishReady?.transcriptFound`, loading spinner while mutation is in flight, normal otherwise
- Use existing `toast` (sonner) for success/error feedback

---

## POEM WUI Behaviour After Intake

For reference — what happens on the POEM WUI side once FliHub POSTs:

1. POEM WUI server stores the payload in memory (one pending payload at a time — a second POST overwrites)
2. The landing screen polls every 3 seconds and detects incoming data
3. The paste textarea auto-populates with the received JSON
4. A notification banner appears: "Data received from FliHub"
5. The workflow selector auto-switches to YouTube Launch Optimizer
6. User reviews and clicks Submit to load into the wizard

If POEM WUI is not running, the FliHub call will fail at network level and show the "not reachable" error toast.

---

## Completion Notes

**What was done:**
- Added `poemWuiUrl?: string` to `Config` interface in `shared/types.ts` and `shared/types.d.ts`
- Added `"poemWuiUrl": "http://localhost:5041"` to `server/config.json`
- Enhanced `GET /api/s3-staging/status` — added `publishReady` object (transcriptFile, transcriptFound, srtFile, srtFound) by scanning `recording-transcripts/*.txt` and SRT scan order: `s3-staging/post/` → `final/` → `recording-transcripts/`
- Added `POST /api/s3-staging/publish-to-poem` endpoint in `server/src/routes/s3-staging.ts` — reads transcript + SRT, builds payload, POSTs to POEM WUI; handles network errors with "not reachable" message and POEM WUI `{ok: false}` responses
- Added `publishReady` field to `S3StagingStatus` interface in `useS3StagingApi.ts`
- Added `usePublishToPoem` mutation hook in `useS3StagingApi.ts` with success/error toast
- Added "Send to POEM WUI" subsection to the POST section in `S3StagingTool.tsx` — shows transcript/SRT file status, disabled button with tooltip if no transcript, purple button with spinner during request

**Transcript file selection:** First `.txt` alphabetically in `recording-transcripts/`. If multiple exist, alphabetical order ensures deterministic selection.

**Files changed:**
- `shared/types.ts` (modified — poemWuiUrl field)
- `shared/types.d.ts` (modified — poemWuiUrl field)
- `server/config.json` (modified — poemWuiUrl default)
- `server/src/routes/s3-staging.ts` (modified — publishReady in status + new publish-to-poem route)
- `client/src/hooks/useS3StagingApi.ts` (modified — publishReady type + usePublishToPoem hook)
- `client/src/components/shared/S3StagingTool.tsx` (modified — Publish subsection with Send to POEM WUI button)

**Testing notes:**
- With POEM WUI running on port 3001: click "Send to POEM WUI →", expect success toast
- With POEM WUI not running: expect error toast "POEM WUI not reachable — is it running on port 3001?"
- With no transcript file: button should be disabled with tooltip
- With no SRT: button enabled, SRT shows "not found (optional)"

**Status:** Complete

---

## Out of Scope

- Sending chapter folder names (array will be sent as empty `[]` for now; future FR when chapters are formalised)
- Sending `brandConfig` (sent as null; future FR)
- Any UI inside POEM WUI (that is SupportSignal's domain)
- Authentication between FliHub and POEM WUI (playground mode, no auth required)
- Multiple workflow targets (only `youtube-launch-optimizer` for now)
- Queueing or retry logic if POEM WUI is temporarily unavailable
- Persisting send history / audit log

---

## Testing Checklist

- [ ] "Publish" subsection appears in POST section of S3 Staging Tool
- [ ] Transcript filename and found status shown correctly
- [ ] SRT filename and found/missing status shown correctly
- [ ] Button is disabled when no transcript file found, with tooltip message
- [ ] Button is enabled when transcript found (SRT optional)
- [ ] Clicking button triggers POST to `/api/s3-staging/publish-to-poem`
- [ ] Server reads transcript from `recording-transcripts/*.txt`
- [ ] Server reads SRT from `s3-staging/*.srt`, falls back to `final/*.srt`, then `recording-transcripts/*.srt`
- [ ] Server POSTs to `http://localhost:5041/api/workflow/intake` (or configured URL)
- [ ] Success toast "Sent to POEM WUI" on `{ ok: true }` response
- [ ] Error toast with message on `{ ok: false, error: "..." }` response
- [ ] Error toast "POEM WUI not reachable — is it running on port 3001?" on network failure
- [ ] Loading spinner shown on button during in-flight request
- [ ] `poemWuiUrl` in config.json overrides the default URL
- [ ] Missing `poemWuiUrl` in config.json falls back to `http://localhost:5041`
- [ ] No disruption to other S3 Staging Tool sections (PREP, CLEANUP)
