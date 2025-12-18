# Enhanced Project View with DAM Integration - Specification

## Overview

Improve the Projects panel with accurate file counts across all project folders and visibility into S3 staging status. Integrates with the DAM (Digital Asset Management) system for S3 collaboration data.

---

## Problem Statement

**Current state:**
- Projects table shows: Project Code, Files, Last Modified
- "Files" count is inaccurate (doesn't properly count recordings, safe, assets, etc.)
- No visibility into S3 staging (collaboration files shared with Jan)
- No breakdown of project contents

**Proposed state:**
- Accurate counts for each folder type (recordings, safe, images, thumbs)
- S3 staging visibility (file count, sync status)
- Better understanding of project state at a glance

---

## Scope

### In Scope (v1)

**Level 1: Better Project Metrics**
- Accurate file counts per folder type
- Show recordings, safe, images, thumbs counts

**Level 2: S3 Visibility**
- Show S3 file count and sync status
- Read from DAM manifest (`projects.json`)

### Out of Scope (Future - see appendix)

- Level 3: DAM Actions (upload/download buttons)
- Level 4: Project Detail Panel
- Direct DAM command execution
- SSD archive visibility
- Git repository status

---

## UI Design

### Projects Table (Enhanced)

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  AppyDave Projects                                                    (12 projects)     │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│  Project Code                    Rec   Safe   Img   Thumb   S3        Last Modified     │
│  ─────────────────────────────────────────────────────────────────────────────────────  │
│  ▸ b64-bmad-claude-sdk           10    79     0     0       ✓ 16      26/11/2025        │
│    b65-guy-monroe-marketing      26    0      5     3       ✓ 1       29/10/2025        │
│    b66-context-engineered        25    0      12    3       ⚠ 2/3     02/11/2025        │
│    b67-vam-s3-staging            2     0      0     0       -         03/11/2025        │
│    b68-claude-code-web           18    0      3     0       ✓ 2       09/11/2025        │
│    b69-claude-code-with-codex    11    0      0     0       ✓ 2       10/11/2025        │
│    b70-ito.ai-doubled            14    0      8     2       ⚠ 3/4     10/11/2025        │
│    b71-bmad-poem                 20    0      4     3       -         01/12/2025        │
│    b72-opus-4.5-awesome          20    0      6     3       ⚠ 2/3     27/11/2025        │
│    b73-vibe-code-ecamm           17    0      2     0       -         02/12/2025        │
│    b74-claude-skills             1     0      0     0       -         02/12/2025        │
│                                                                                          │
│  + Add new project...                                                                    │
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### Column Definitions

| Column | Description | Source |
|--------|-------------|--------|
| Project Code | Project identifier (e.g., b64-bmad-claude-sdk) | Directory name |
| Rec | Files in `recordings/` (excluding -safe) | Local filesystem |
| Safe | Files in `recordings/-safe/` | Local filesystem |
| Img | Files in `assets/images/` | Local filesystem |
| Thumb | Files in `assets/thumbs/` | Local filesystem |
| S3 | S3 staging status and file count | DAM manifest |
| Last Modified | Most recent file modification | Local filesystem |

### S3 Status Indicators

| Icon | Meaning | Description |
|------|---------|-------------|
| `✓ 16` | Synced | All S3 files exist locally (16 files) |
| `⚠ 2/3` | Partial | 2 of 3 S3 files exist locally |
| `-` | None | No files in S3 for this project |

---

## Data Sources

### Local File Counts

Count files in each project subfolder:

```typescript
interface ProjectCounts {
  recordings: number;  // files in recordings/ (excluding -safe/)
  safe: number;        // files in recordings/-safe/
  images: number;      // files in assets/images/
  thumbs: number;      // files in assets/thumbs/
  transcripts: number; // files in transcripts/ (optional, for future)
}
```

### S3 Data (from DAM Manifest)

Read from `~/dev/video-projects/v-appydave/projects.json`:

```json
{
  "id": "b64-bmad-claude-sdk",
  "storage": {
    "s3": {
      "exists": true,
      "file_count": 16,
      "total_bytes": 35565886893,
      "last_modified": "2025-11-28T04:23:51Z"
    },
    "local": {
      "exists": true,
      "has_heavy_files": false,
      "has_light_files": true
    }
  }
}
```

**Sync status calculation:**
- Count files in local `s3-staging/` folder
- Compare to `s3.file_count` from manifest
- If equal: "Synced" (✓)
- If different: "Partial" (⚠ local/remote)
- If no S3 data: "None" (-)

---

## API Design

### GET /api/projects (Enhanced)

Update existing endpoint to include detailed counts.

**Response:**
```json
{
  "projects": [
    {
      "code": "b64-bmad-claude-sdk",
      "path": "/Users/.../v-appydave/b64-bmad-claude-sdk",
      "lastModified": "2025-11-26T07:55:00Z",
      "counts": {
        "recordings": 10,
        "safe": 79,
        "images": 0,
        "thumbs": 0,
        "transcripts": 5
      },
      "s3": {
        "exists": true,
        "fileCount": 16,
        "localStagingCount": 15,
        "status": "partial"  // "synced" | "partial" | "none"
      }
    }
  ],
  "manifestPath": "/Users/.../v-appydave/projects.json",
  "manifestLastUpdated": "2025-12-02T09:09:28Z"
}
```

---

## Implementation Notes

### Backend

1. **Enhance project scanning:**
   - Count files in each subfolder (recordings, -safe, assets/images, assets/thumbs)
   - Exclude hidden files and directories

2. **Read DAM manifest:**
   - Path: `{brandRoot}/projects.json`
   - Parse JSON, extract S3 data per project
   - Handle missing manifest gracefully (show `-` for S3)

3. **Calculate sync status:**
   - Count files in `{project}/s3-staging/`
   - Compare to manifest `s3.file_count`

### Frontend

1. **Update ProjectsPanel table:**
   - Add new columns (Rec, Safe, Img, Thumb, S3)
   - Compact column headers to fit
   - Show `-` for zero counts or missing data

2. **S3 status badge:**
   - Small component showing icon + count
   - Tooltip with more detail on hover

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Manifest doesn't exist | S3 column shows `-` for all projects |
| Manifest is stale | Show data as-is (user can regenerate via DAM CLI) |
| Project not in manifest | S3 column shows `-` |
| Folder doesn't exist | Count shows `0` |
| Permission error reading folder | Count shows `-`, log warning |

---

## Testing

1. **Accurate counts:**
   - Create project with known file counts
   - Verify each column shows correct number

2. **S3 status:**
   - Project with full sync → shows ✓
   - Project with partial sync → shows ⚠
   - Project with no S3 → shows -

3. **Missing data:**
   - Delete manifest → S3 columns show -
   - New project not in manifest → shows -

---

---

# Appendix: Future Capabilities (Not In Scope)

This section documents DAM capabilities that could be integrated in future versions. Included here to preserve knowledge and inform future planning.

---

## DAM System Overview

**DAM (Digital Asset Management)** is a CLI tool for managing video project assets across multiple storage tiers.

### Storage Tiers

1. **Local** - Active editing and development
2. **S3 Staging** - 90-day collaboration window (auto-delete lifecycle)
3. **SSD Archive** - Long-term backup for completed projects

### Brands Supported

| Shortcut | Full Name | Workflow |
|----------|-----------|----------|
| `appydave` | v-appydave | FliVideo (sequential recording) |
| `voz` | v-voz | Storyline (script-first) |
| `aitldr` | v-aitldr | Storyline |
| `joy` | v-beauty-and-joy | Storyline |
| `kiros` | v-kiros | Storyline |
| `ss` | v-supportsignal | Storyline |

### Project Naming

**FliVideo (AppyDave):**
- Pattern: `[letter][2-digit]-[name]`
- Examples: `b65-guy-monroe`, `b72-opus-awesome`
- Short names: `b65` expands to full name

**Storyline (Other brands):**
- Full descriptive names
- Examples: `boy-baker`, `the-point`

---

## DAM Commands Reference

### Discovery & Status

```bash
dam list                      # All brands with counts
dam list appydave             # All projects for brand
dam list appydave 'b6*'       # Pattern matching
dam status appydave b65       # Unified status (local/S3/SSD/git)
dam manifest appydave         # Generate projects.json
```

### S3 Operations

```bash
dam s3-up appydave b65        # Upload to S3 staging
dam s3-down appydave b65      # Download from S3
dam s3-status appydave b65    # Check sync status
dam s3-discover appydave b65  # List files in S3
dam s3-share appydave b65 video.mp4  # Generate pre-signed URL (7-day)
dam s3-scan appydave          # Full bucket scan
dam s3-cleanup-remote appydave b65 --force  # Delete S3 files
dam s3-cleanup-local appydave b65   # Delete local staging
```

### Archive Operations

```bash
dam archive appydave b65      # Copy to SSD backup
dam sync-ssd appydave         # Restore from SSD
dam ssd-status appydave       # Check SSD mount status
```

### Git Operations

```bash
dam repo-status appydave      # Check git status
dam repo-sync appydave        # Pull updates
dam repo-push appydave b65    # Push changes
```

---

## Future Level 3: DAM Actions

Add buttons to trigger DAM commands from the UI.

### Potential UI

```
Project Code                    Rec   Safe   S3        Actions
b64-bmad-claude-sdk             10    79     ✓ 16      [↑] [↓] [🔗]
                                                        ↑   ↑   ↑
                                                     upload download share
```

### API Endpoints

```
POST /api/dam/upload
  { "project": "b64-bmad-claude-sdk" }
  Executes: dam s3-up appydave b64

POST /api/dam/download
  { "project": "b64-bmad-claude-sdk" }
  Executes: dam s3-down appydave b64

POST /api/dam/share
  { "project": "b64-bmad-claude-sdk", "file": "video.mp4" }
  Executes: dam s3-share appydave b64 video.mp4
  Returns: { "url": "https://...", "expires": "7 days" }
```

### Considerations

- DAM commands can be slow (large file transfers)
- Would need background job queue (like transcription)
- Progress feedback via sockets
- Error handling for AWS failures

---

## Future Level 4: Project Detail Panel

Click a project to see expanded detail view.

### Potential UI

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  b64-bmad-claude-sdk                                              [✕]       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  LOCAL STORAGE                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  recordings/          10 files     261.5 MB    [📁]                 │    │
│  │  recordings/-safe/    79 files     2.1 GB      [📁]                 │    │
│  │  assets/images/       0 files      -           [📁]                 │    │
│  │  assets/thumbs/       0 files      -           [📁]                 │    │
│  │  transcripts/         5 files      45 KB       [📁]                 │    │
│  │  s3-staging/          15 files     30.8 GB     [📁]                 │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  S3 STAGING (16 files, 33.1 GB)                              [↑] [↓] [🔄]  │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  b64-bmad-claude-sdk.mp4       3.7 GB    2025-11-26    [🔗]        │    │
│  │  b64-bmad-claude-sdk.srt       166 KB    2025-11-18    [🔗]        │    │
│  │  b64-final-v1.mp4              4.2 GB    2025-11-26    [🔗]        │    │
│  │  b64-final-v2.mp4              4.1 GB    2025-11-26    [🔗]        │    │
│  │  ...                                                                │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  SSD ARCHIVE                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  ❌ Not archived (SSD not mounted)                                  │    │
│  │  [Archive to SSD]                                                   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Future: Manifest Refresh Strategy

The `projects.json` manifest can become stale. Options for keeping it current:

### Option A: Read-Only (Current)
- Read existing manifest
- User runs `dam manifest appydave` or `dam s3-scan appydave` manually
- Pros: Simple, no unexpected delays
- Cons: Data can be stale

### Option B: On-Demand Refresh
- Add "Refresh" button that runs `dam s3-scan`
- Show loading state while scanning
- Pros: User control
- Cons: Can be slow (S3 scan takes time)

### Option C: Background Refresh
- Periodically refresh manifest (e.g., on app start, every hour)
- Run in background, update when complete
- Pros: Always fresh
- Cons: Background network activity, complexity

### Option D: Hybrid
- Read manifest on load (fast)
- Show "last updated" timestamp
- Button to refresh if stale

**Recommendation:** Start with Option A, add Option D later if users need fresher data.

---

## Future: SSD Archive Integration

Show SSD archive status when external drive is connected.

### Data from DAM

```bash
dam ssd-status appydave
# Shows: mounted/not mounted, path, project list
```

### Potential UI Addition

```
Project Code          Rec   Safe   S3      SSD     Last Modified
b64-bmad-claude-sdk   10    79     ✓ 16    ✓       26/11/2025
b65-guy-monroe        26    0      ✓ 1     -       29/10/2025
```

SSD column: `✓` (archived), `-` (not archived), `?` (SSD not mounted)

---

## Future: Git Status Integration

Show git repository status for projects.

### Data from DAM

```bash
dam repo-status appydave
# Shows: clean, dirty, ahead/behind remote
```

### Potential UI Addition

Small icon indicating git status:
- `●` Green: Clean, up to date
- `●` Yellow: Uncommitted changes
- `●` Red: Behind remote

---

## Configuration Reference

### System Config
Location: `~/.config/appydave/settings.json`
```json
{
  "video-projects-root": "/Users/davidcruwys/dev/video-projects"
}
```

### Brand Config
Location: `{brand-dir}/.video-tools.env`
```
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_REGION=us-east-1
S3_BUCKET=appydave-video-projects
```

### Manifest
Location: `{brand-dir}/projects.json`
- Generated by: `dam manifest` or `dam s3-scan`
- Contains: All project metadata, storage status, S3 data

---

## Integration Architecture (Future)

If Recording Namer needs to execute DAM commands:

```
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│   Recording Namer   │────▶│   Node.js Server    │────▶│   DAM CLI (Ruby)    │
│   (React Frontend)  │     │   (Express)         │     │   (child_process)   │
└─────────────────────┘     └─────────────────────┘     └─────────────────────┘
         │                           │                           │
         │  WebSocket                │  spawn/exec               │  AWS SDK
         │                           │                           │
         ▼                           ▼                           ▼
    Real-time UI              Job Queue              S3 / Local Filesystem
    Updates                   (for long ops)
```

**Key considerations:**
- DAM is a Ruby gem with CLI interface
- Call via `child_process.spawn` or `exec`
- Long operations (upload/download) need job queue
- Stream progress via WebSocket
