# Edit Workflow & S3 Staging - Specification

## Overview

A comprehensive edit workflow system covering three stages of video post-production:

1. **Prep** - David's first edit (Gling output)
2. **Post** - Jan's edited versions (returned via S3)
3. **Publish** - Final selection for YouTube upload

This spec covers folder structure changes, two new UI pages (First Edit Prep, S3 Staging), migration tooling, and DAM integration requirements.

---

## Problem Statement

**Current workflow pain points:**

1. No dedicated folder for David's Gling output (first edit)
2. s3-staging is flat - mixes David's uploads with Jan's returns
3. No visibility into what's uploaded vs downloaded vs pending
4. First edit SRT lives in transient s3-staging but is a permanent asset
5. Old versions accumulate (b64 has 33GB in s3-staging with 6 final versions)
6. Manual file naming for Gling export
7. Dictionary words for Gling transcription not stored anywhere
8. System junk files (`.DS_Store`, `.Zone.Identifier`) clutter folders

**Current s3-staging state (17 active projects):**

- 12 "post/final" files from Jan
- 3 junk files (Zone.Identifier, etc.)
- ~42 prep files from David (mixed in flat structure)

---

## Folder Structure

### New Permanent Folders

```
project/
├── recordings/              # Source recordings (existing)
├── recording-transcripts/   # Whisper transcripts (existing)
├── recording-shadows/       # Low-res shadows (existing)
├── assets/                  # Images and thumbs (existing)
├── inbox/                   # Incoming content (existing)
└── edits/                   # NEW - Edit outputs (permanent)
    ├── prep/                # David's Gling output (kept forever)
    │   ├── b85-clauding-01.mp4
    │   └── b85-clauding-01.srt
    └── publish/             # Final for YouTube (kept forever)
        ├── b85-clauding-01.mp4
        └── b85-clauding-01.srt
```

### Transient S3 Staging

```
project/
└── s3-staging/              # Transient (deleted after project)
    ├── prep/                # Clone from edits/prep (for upload to Jan)
    │   ├── b85-clauding-01.mp4
    │   └── b85-clauding-01.srt
    └── post/                # Jan's returns
        ├── b85-clauding-01-v1.mp4
        ├── b85-clauding-01-v1.srt
        ├── b85-clauding-01-v2.mp4
        └── b85-clauding-01-v2.srt
```

---

## Naming Conventions

### Prep Files (David's First Edit)

```
{project-code}-{project-name}.mp4
{project-code}-{project-name}.srt
```

Example: `b85-clauding-01.mp4`, `b85-clauding-01.srt`

**No version suffix** - prep is typically one-time output from Gling.

**Extra files** (CTAs, demos) use descriptive names:

- `b85-clauding-01-outro.mp4`
- `b85-clauding-01-demo.mp4`

### Post Files (Jan's Edits)

```
{project-code}-{project-name}-v{N}.mp4
{project-code}-{project-name}-v{N}.srt
```

Example: `b85-clauding-01-v1.mp4`, `b85-clauding-01-v1.srt`

**Always versioned** - Jan may return multiple iterations.

### Publish Files

```
{project-code}-{project-name}.mp4
{project-code}-{project-name}.srt
```

Example: `b85-clauding-01.mp4`, `b85-clauding-01.srt`

**Version suffix removed** when promoting from post to publish.

---

## Feature 1: Clipboard Format Fix

**Bug:** Project clipboard button produces wrong format.

**Current:** `b85 - clauding-01`

**Should be:** `b85 > Clauding 01`

**Changes:**

- Separator: `-` → `>`
- Project name: `kebab-case` → `Title Case`

---

## Feature 2: First Edit Prep Page

### Purpose

Prepare for Gling editing session with clipboard helpers and folder setup.

### Navigation

Cog menu → "First Edit Prep"

### UI Design

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  First Edit Prep                                                    [Close] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PROJECT: b85-clauding-01                                                    │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  GLING FILENAME                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  b85-clauding-01                                            [Copy]  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│  Use this as the export filename in Gling                                    │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  DICTIONARY WORDS                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  AppyDave, AI-TLDR, ChatGPT, BMAD, FliVideo, FliHub, Gling,        │    │
│  │  Ecamm, YouTube, GitHub, TypeScript, JavaScript, Claude, ...       │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│  [Copy All]  [Edit in Config]                                                │
│                                                                              │
│  Paste into Gling's custom dictionary for better transcription               │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  RECORDINGS                                                                  │
│  12 recordings ready (3.2 GB total)                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  01-1-intro.mov                                           45.2 MB   │    │
│  │  01-2-intro.mov                                           38.1 MB   │    │
│  │  02-1-setup.mov                                          112.4 MB   │    │
│  │  ...                                                                │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│  [Open in Finder]  Drag these into Gling in order                           │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  PREP FOLDER: edits/prep/                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  (empty - ready for Gling export)                                   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│  [Create Folder]  (if doesn't exist)                                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Config Addition

Add to `server/config.json`:

```json
{
  "glingDictionary": [
    "AppyDave",
    "AI-TLDR",
    "ChatGPT",
    "BMAD",
    "FliVideo",
    "FliHub",
    "Gling",
    "Ecamm",
    "YouTube",
    "GitHub",
    "TypeScript",
    "JavaScript",
    "Claude",
    "Anthropic",
    "Whisper",
    "OpenAI"
  ]
}
```

### API Design

#### GET /api/first-edit/prep

Get first edit prep data for current project.

**Response:**

```json
{
  "project": {
    "code": "b85",
    "name": "clauding-01",
    "fullCode": "b85-clauding-01"
  },
  "glingFilename": "b85-clauding-01",
  "glingDictionary": ["AppyDave", "AI-TLDR", "..."],
  "recordings": [
    { "name": "01-1-intro.mov", "size": 47419392 },
    { "name": "01-2-intro.mov", "size": 39954432 }
  ],
  "recordingsTotal": 3355443200,
  "prepFolder": {
    "exists": false,
    "path": "edits/prep/",
    "files": []
  }
}
```

#### POST /api/first-edit/create-prep-folder

Create `edits/prep/` folder if it doesn't exist.

**Response:**

```json
{
  "success": true,
  "path": "edits/prep/"
}
```

---

## Feature 3: S3 Staging Page

### Purpose

Manage S3 collaboration workflow with Jan - upload prep, download post, promote to publish.

### Navigation

Cog menu → "S3 Staging"

### UI Design

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  S3 Staging                                                         [Close] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PROJECT: b85-clauding-01                                                    │
│  S3 Bucket: v-appydave/b85-clauding-01                                       │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════════│
│                                                                              │
│  PREP (Your First Edit → Jan)                                                │
│                                                                              │
│  Source: edits/prep/                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  b85-clauding-01.mp4                                       512 MB   │    │
│  │  b85-clauding-01.srt                                        32 KB   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  Staging: s3-staging/prep/                          [Sync from Source]       │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  ✓ b85-clauding-01.mp4                             512 MB  synced   │    │
│  │  ✓ b85-clauding-01.srt                              32 KB  synced   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  S3 Status: ✓ Uploaded (2 days ago)        [Upload to S3]  [View in S3]     │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════════│
│                                                                              │
│  POST (Jan's Edits → You)                                                    │
│                                                                              │
│  S3: 2 files available                              [Download from S3]       │
│                                                                              │
│  Local: s3-staging/post/                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  ✓ b85-clauding-01-v1.mp4                          498 MB  synced   │    │
│  │  ✓ b85-clauding-01-v1.srt                           31 KB  synced   │    │
│  │  ✓ b85-clauding-01-v2.mp4                          502 MB  synced   │    │
│  │  ⚠️ b85-clauding-01-v2.srt                         MISSING          │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ⚠️ Warning: v2 video has no matching SRT file                              │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════════│
│                                                                              │
│  PUBLISH                                                                     │
│                                                                              │
│  Select version to promote:                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  ○ b85-clauding-01-v1  (498 MB + SRT)                               │    │
│  │  ○ b85-clauding-01-v2  (502 MB, no SRT)                             │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  Destination: edits/publish/                                                 │
│  Will copy as: b85-clauding-01.mp4 + b85-clauding-01.srt                    │
│                                                                              │
│  [Promote to Publish]                                                        │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════════│
│                                                                              │
│  CLEANUP                                                                     │
│  Local staging: 1.5 GB        [Clean Local]                                  │
│  S3 staging: 1.5 GB           [Clean S3]  (requires DAM)                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Validation Rules

| Condition                       | Warning                                |
| ------------------------------- | -------------------------------------- |
| Post video without matching SRT | ⚠️ "v2 video has no matching SRT file" |
| Prep files not yet uploaded     | ⚠️ "Prep files not uploaded to S3"     |
| Post files in S3 not downloaded | ⚠️ "New files available from Jan"      |

### API Design

#### GET /api/s3-staging/status

Get full S3 staging status for current project.

**Response:**

```json
{
  "project": "b85-clauding-01",
  "prep": {
    "source": {
      "path": "edits/prep/",
      "files": [
        { "name": "b85-clauding-01.mp4", "size": 536870912 },
        { "name": "b85-clauding-01.srt", "size": 32768 }
      ]
    },
    "staging": {
      "path": "s3-staging/prep/",
      "files": [
        { "name": "b85-clauding-01.mp4", "size": 536870912, "synced": true },
        { "name": "b85-clauding-01.srt", "size": 32768, "synced": true }
      ]
    },
    "s3": {
      "uploaded": true,
      "lastSync": "2025-12-14T10:30:00Z",
      "files": 2
    }
  },
  "post": {
    "staging": {
      "path": "s3-staging/post/",
      "files": [
        { "name": "b85-clauding-01-v1.mp4", "size": 522190848, "hasSrt": true },
        { "name": "b85-clauding-01-v1.srt", "size": 31744 },
        { "name": "b85-clauding-01-v2.mp4", "size": 526385152, "hasSrt": false }
      ]
    },
    "s3": {
      "filesAvailable": 2,
      "needsDownload": false
    },
    "warnings": [{ "type": "missing_srt", "file": "b85-clauding-01-v2.mp4" }]
  },
  "publish": {
    "path": "edits/publish/",
    "files": []
  }
}
```

#### POST /api/s3-staging/sync-prep

Copy files from `edits/prep/` to `s3-staging/prep/`.

**Response:**

```json
{
  "success": true,
  "copied": 2,
  "totalSize": 536903680
}
```

#### POST /api/s3-staging/promote

Promote a post version to publish (copies to `edits/publish/`, removes version suffix).

**Request:**

```json
{
  "version": "v1"
}
```

**Response:**

```json
{
  "success": true,
  "files": [
    { "from": "s3-staging/post/b85-clauding-01-v1.mp4", "to": "edits/publish/b85-clauding-01.mp4" },
    { "from": "s3-staging/post/b85-clauding-01-v1.srt", "to": "edits/publish/b85-clauding-01.srt" }
  ]
}
```

#### POST /api/s3-staging/dam/:action

Trigger DAM commands (upload, download, cleanup).

**Request:**

```json
{
  "action": "upload" // or "download", "cleanup-local", "cleanup-remote"
}
```

**Response:**

```json
{
  "success": true,
  "command": "dam s3-up appydave b85-clauding-01",
  "output": "..."
}
```

---

## Feature 4: Auto-Cleanup

### Junk Files to Delete

Automatically delete on any folder scan:

- `.DS_Store` (macOS)
- `*.Zone.Identifier` (Windows)

### Implementation

Add cleanup to file listing operations. When listing `s3-staging/` contents, delete junk files automatically.

---

## Feature 5: Migration Tool

### Purpose

Migrate existing flat `s3-staging/` folders to new `prep/` + `post/` structure.

### CLI Usage

```bash
# From FliHub server
npm run migrate-staging <project-code>

# Example
npm run migrate-staging b64
```

### UI Trigger

S3 Staging page shows migration prompt if flat files detected:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ⚠️ Legacy Structure Detected                                               │
│                                                                              │
│  This project has 16 files in flat s3-staging/ structure.                   │
│  Migrate to prep/ + post/ subfolders?                                        │
│                                                                              │
│  [Preview Migration]  [Run Migration]                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Migration Rules

| Pattern                    | Destination                 | Example                                                    |
| -------------------------- | --------------------------- | ---------------------------------------------------------- |
| `*-final*.mp4`             | `post/` (rename to `-v{N}`) | `b64-final-v3.mp4` → `post/b64-bmad-claude-sdk-v3.mp4`     |
| `*-final.mp4` (no version) | `post/` (as `-v1`)          | `b64-final.mp4` → `post/b64-bmad-claude-sdk-v1.mp4`        |
| `*.Zone.Identifier`        | DELETE                      |                                                            |
| `.DS_Store`                | DELETE                      |                                                            |
| Other `.mp4/.srt`          | `prep/`                     | `b64-bmad-claude-sdk.mp4` → `prep/b64-bmad-claude-sdk.mp4` |

### Preview Output

```
Migration Preview for b64-bmad-claude-sdk:

DELETE (3 files):
  .DS_Store
  b70-ito.ai-doubled-productivity-s3-staging.mp4:Zone.Identifier

MOVE TO prep/ (8 files):
  b64-bmad-claude-sdk.mp4 → prep/b64-bmad-claude-sdk.mp4
  b64-bmad-claude-sdk.srt → prep/b64-bmad-claude-sdk.srt
  b64-outro.mp4 → prep/b64-outro.mp4
  b64-outro.srt → prep/b64-outro.srt
  b64.mp4 → prep/b64.mp4
  main-demonstration.mp4 → prep/main-demonstration.mp4
  main-demonstration.srt → prep/main-demonstration.srt
  talking-head.mp4 → prep/talking-head.mp4
  talking-head.srt → prep/talking-head.srt
  talking-head-demonstration.mov → prep/talking-head-demonstration.mov

MOVE TO post/ (7 files):
  b64-final.mp4 → post/b64-bmad-claude-sdk-v1.mp4
  b64-final-v1.mp4 → post/b64-bmad-claude-sdk-v1.mp4 (CONFLICT - skip)
  b64-final-v2.mp4 → post/b64-bmad-claude-sdk-v2.mp4
  b64-final-v3.mp4 → post/b64-bmad-claude-sdk-v3.mp4
  b64-final-v4.mp4 → post/b64-bmad-claude-sdk-v4.mp4
  b64-final-v5.mp4 → post/b64-bmad-claude-sdk-v5.mp4

Proceed? [y/N]
```

### API

#### POST /api/s3-staging/migrate

**Request:**

```json
{
  "dryRun": true
}
```

**Response:**

```json
{
  "success": true,
  "dryRun": true,
  "actions": {
    "delete": [".DS_Store"],
    "toPrep": [{ "from": "b64-bmad-claude-sdk.mp4", "to": "prep/b64-bmad-claude-sdk.mp4" }],
    "toPost": [{ "from": "b64-final-v3.mp4", "to": "post/b64-bmad-claude-sdk-v3.mp4" }],
    "conflicts": [{ "file": "b64-final-v1.mp4", "reason": "Would overwrite existing v1" }]
  }
}
```

---

## DAM Integration Requirements

### Questions for DAM Coding Agent

1. **Subfolder support:** Does DAM currently preserve subfolder structure when uploading/downloading? If `s3-staging/prep/file.mp4` is uploaded, does it appear in S3 as `prep/file.mp4` or flat?

2. **Selective upload:** Can DAM upload only specific subfolders (e.g., only `s3-staging/prep/`)?

3. **Sync status granularity:** Can `dam s3-status` show per-subfolder status?

4. **S3 discovery:** Does `dam s3-discover` show subfolder structure from S3?

### Desired Outcomes for DAM Coding Agent

1. **Preserve subfolder structure:** When uploading `s3-staging/`, maintain `prep/` and `post/` subfolders in S3 bucket.

2. **Subfolder-aware status:** `dam s3-status` should show:

   ```
   📊 S3 Sync Status for appydave/b85-clauding-01

   prep/ (2 files, 512 MB)
     ✓ b85-clauding-01.mp4 [synced]
     ✓ b85-clauding-01.srt [synced]

   post/ (4 files, 1.0 GB)
     ✓ b85-clauding-01-v1.mp4 [synced]
     ✓ b85-clauding-01-v1.srt [synced]
     ✓ b85-clauding-01-v2.mp4 [synced]
     ✗ b85-clauding-01-v2.srt [not in S3]
   ```

3. **Subfolder-aware discovery:** `dam s3-discover` should show:

   ```
   🔍 S3 Discovery: v-appydave/b85-clauding-01

   prep/
     b85-clauding-01.mp4        512 MB    2025-12-14
     b85-clauding-01.srt         32 KB    2025-12-14

   post/
     b85-clauding-01-v1.mp4     498 MB    2025-12-15
     b85-clauding-01-v1.srt      31 KB    2025-12-15
   ```

4. **Selective cleanup:** Ability to clean only `post/` while keeping `prep/`:
   ```bash
   dam s3-cleanup-remote appydave b85 --path post/
   ```

---

## Implementation Phases

### Phase 1: Foundation

- [ ] FR-A: Clipboard format fix (`b85 > Clauding 01`)
- [ ] Config: Add `glingDictionary` to server config
- [ ] Folder: Support `edits/prep/` and `edits/publish/` folders

### Phase 2: First Edit Prep

- [ ] FR-B: First Edit Prep page (cog menu)
- [ ] API: `/api/first-edit/prep`
- [ ] API: `/api/first-edit/create-prep-folder`

### Phase 3: S3 Staging

- [ ] FR-C: S3 Staging page (cog menu)
- [ ] API: `/api/s3-staging/status`
- [ ] API: `/api/s3-staging/sync-prep`
- [ ] API: `/api/s3-staging/promote`
- [ ] API: `/api/s3-staging/dam/:action`
- [ ] Auto-cleanup junk files

### Phase 4: Migration

- [ ] FR-D: Migration tool (CLI + UI)
- [ ] API: `/api/s3-staging/migrate`
- [ ] Preview mode
- [ ] Conflict detection

### Phase 5: DAM Integration

- [ ] DAM: Subfolder structure preservation
- [ ] DAM: Subfolder-aware status/discovery
- [ ] DAM: Selective cleanup by path

---

## Acceptance Criteria

### Clipboard Fix

- [ ] Project clipboard produces `b85 > Clauding 01` format
- [ ] Title case applied to project name

### First Edit Prep

- [ ] Gling filename copied to clipboard
- [ ] Dictionary words copied to clipboard
- [ ] Recordings listed with sizes
- [ ] Open in Finder works
- [ ] Create prep folder works

### S3 Staging

- [ ] Prep section shows source + staging + S3 status
- [ ] Post section shows Jan's files with version detection
- [ ] Missing SRT warning displayed
- [ ] Sync from source copies to staging
- [ ] Promote removes version suffix
- [ ] DAM upload/download triggers work

### Migration

- [ ] Preview shows planned actions
- [ ] Junk files deleted
- [ ] Final files moved to post/ with version rename
- [ ] Other files moved to prep/
- [ ] Conflicts detected and reported

### Auto-Cleanup

- [ ] .DS_Store deleted automatically
- [ ] .Zone.Identifier deleted automatically

---

## File References

| File                                          | Purpose                     |
| --------------------------------------------- | --------------------------- |
| `server/config.json`                          | Add `glingDictionary` array |
| `server/src/routes/first-edit.ts`             | New route file              |
| `server/src/routes/s3-staging.ts`             | New route file              |
| `client/src/components/FirstEditPrepPage.tsx` | New page                    |
| `client/src/components/S3StagingPage.tsx`     | New page                    |
| `server/src/scripts/migrate-staging.ts`       | CLI migration tool          |
