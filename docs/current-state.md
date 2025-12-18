# Recording Namer - Current State

**Last Updated:** 2025-12-05 (FR-52 added - 17 features completed this session)

Quick reference for what's implemented, what's not, and current priorities. Read this instead of exploring the codebase.

---

## Application Overview

**Recording Namer** is a web app for managing video recording workflows. It watches for new recordings from Ecamm Live, provides a UI for naming/organizing files, and manages project assets.

- **Client:** React 19 + Vite + TailwindCSS v4 (port 5100)
- **Server:** Express + Socket.io (port 5101)
- **Location:** `/flihub/`

---

## What's Implemented

### Core Features (Stable)

| Feature | FR | Notes |
|---------|-----|-------|
| File watcher (Ecamm) | FR-1 | Watches for new recordings |
| Rename with naming convention | FR-2 | `{chapter}-{sequence}-{name}-{tags}.mov` |
| Project switcher | FR-10/11 | List, select, create projects |
| Recordings view | FR-14 | Chapter groupings, move to safe |
| Transcriptions (Whisper) | FR-30 | Auto-transcribe on rename, queue system |
| Image assets | FR-17-19 | Import, assign, variants |
| Image prompts | FR-22 | Text files paired with images |
| YouTube thumbnails | FR-27 | ZIP import, drag-to-reorder |
| Final video detection | FR-33 | Auto-detect in final/ or s3-staging/ |
| Chapter timestamps | FR-34 | Extract from SRT (Phase 2 done) |

### Recent Additions (2025-12-05)

| Feature | FR | Notes |
|---------|-----|-------|
| Duration on recordings | FR-36 | Shows video length everywhere |
| Two-row header + project display | FR-37 | Breadcrumb style, gear for config |
| Delete prompts | FR-38 | 🗑️ button or save empty |
| Field persistence (Assets) | FR-39 | Remembers chapter/sequence/label |
| Grab transcript button | FR-40 | One-click paste transcript to prompt |
| Chapter timing calculations | FR-41 | Cumulative YouTube timestamps |
| Clipboard paste images | FR-42 | Cmd+V to paste images |
| Project switcher dropdown | FR-43 | Quick switch pinned projects |
| Intentional project selection | FR-44 | Only code clickable, not whole row |
| Relative time display | FR-46 | "5s ago" on incoming files |
| Rename chapter label | FR-47 | Rename all files in chapter |
| Transcript sync validation | FR-48 | Proper matching, orphan detection |
| Delete assigned images | FR-49 | 🗑️ button on image rows |
| Undo last rename | FR-50 | Recent section on Incoming page |
| Calendar copy | FR-51 | 📋 button copies project for calendar |
| Transcription progress bar | FR-52 | Summary at top of Transcriptions page |

---

## What's NOT Implemented

### Pending FRs (Ready for Dev)

| Feature | FR | Notes |
|---------|-----|-------|
| In-app video playback | FR-45 | Modal player with speed control |

### Pending but Needs Spec Work

| Feature | FR | Notes |
|---------|-----|-------|
| Enhanced project view (DAM) | FR-31 | Large scope, DAM integration |
| Chapter grouping fix | FR-35 | Overlap with FR-34 work |

### Future / Brainstorming

- FR-34 Phase 3: Algorithm improvements with string-comparisons library
- Pre-project notes / idea codes
- Research links / tab collector
- Timing reconciliation (editor handover)
- Jan version naming tool
- Windows compatibility

---

## Current Priorities

**Next up:**
1. FR-45 - In-app video playback (modal with speed control)
2. FR-34 Phase 3 - Fix chapter extraction algorithm
3. FR-31 - DAM integration (when ready)

---

## Key File Locations

| What | Where |
|------|-------|
| Application code | `/flihub/` |
| Documentation | `/docs/recording-namer/` |
| Backlog | `/docs/recording-namer/backlog.md` |
| Changelog | `/docs/recording-namer/changelog.md` |
| Brainstorming | `/docs/recording-namer/brainstorming-notes.md` |
| Agent commands | `/.claude/commands/` |

---

## API Endpoints (Key Ones)

| Endpoint | Purpose |
|----------|---------|
| `POST /api/rename` | Rename incoming file |
| `GET /api/recordings` | List project recordings |
| `POST /api/recordings/safe` | Move to safe folder |
| `POST /api/transcriptions/queue` | Queue transcription |
| `GET /api/projects/stats` | All project stats |
| `GET /api/projects/:code/transcript-sync` | Sync validation |
| `POST /api/assets/clipboard/assign` | Paste image from clipboard |

---

## Socket Events

| Event | When |
|-------|------|
| `file:new` | New file in watch directory |
| `recordings:changed` | Recordings folder changed |
| `transcription:progress` | Whisper progress update |
| `transcription:complete` | Job finished |
| `assets:assigned-changed` | Image assigned |

---

*This file should be updated when major features are completed or priorities change.*
