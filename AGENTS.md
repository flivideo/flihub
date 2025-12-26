# AGENTS.md

This file provides guidance to Codex agents when working with this repository.

## Quick Reference

- `/progress` - Get quick project status
- `/po` - Product Owner mode (requirements, specs)
- `/dev` - Developer mode (implementation)
- `docs/backlog.md` - Active requirements
- `docs/changelog.md` - What's been implemented

---

## Project Overview

FliHub is a TypeScript application for managing video recording workflows. It watches for new recordings from Ecamm Live, provides a web UI for naming/organizing files, and manages project assets.

## Documentation

All documentation lives in `docs/`:

```
docs/
├── prd/              # Feature specs (FR-8, FR-30, etc.)
├── architecture/     # API reference, patterns, sockets
├── guides/           # Setup guides, troubleshooting
├── archive/          # Completed requirements (historical)
├── backlog.md        # Active requirements
├── changelog.md      # Implementation history
└── README.md         # Documentation index
```

**Key files:**
- `docs/backlog.md` - Current FRs/NFRs with status
- `docs/prd/*.md` - Detailed feature specifications
- `docs/architecture/patterns.md` - Code conventions

## Slash Commands

| Command | Purpose |
|---------|---------|
| `/po` | Product Owner - requirements, specs, handovers |
| `/dev` | Developer - implementation |
| `/uat` | User acceptance testing |
| `/progress` | Quick project status check |
| `/jan` | WSL collaborator support |

## PO Practices

**Handling Developer Handovers:**

Due to context limits, conversations may be split across sessions. Before issuing a handover to the developer:

1. **Check backlog status first** - Read `backlog.md` to see if the FR is already marked `✓ Complete`
2. **If complete** - Ask for sign-off verification instead of re-issuing the handover
3. **If pending** - Proceed with standard handover

**When receiving completion handovers:**
- Update `backlog.md` and `changelog.md` immediately before context splits
- Don't batch multiple completion updates

**When resuming from summary:**
- Re-read `backlog.md` to get accurate current state before taking action

## Commands

```bash
npm install              # Install all workspace dependencies
npm run dev              # Start both server (5101) and client (Vite dev server)
npm run build            # Build server then client

# Individual workspaces
npm run dev -w server    # Server only (Express + Socket.io on port 5101)
npm run dev -w client    # Client only (Vite React dev server)
npm run build -w client  # Build client: tsc -b && vite build
```

## Architecture

**Monorepo Structure** (npm workspaces):
- `client/` - React 19 + Vite + TailwindCSS v4
- `server/` - Express + Socket.io, file watchers (chokidar)
- `shared/` - TypeScript types and utilities

**Server (`server/src/`)**:
- `index.ts` - Express app setup, Socket.io, config management
- `WatcherManager.ts` - File watcher management
- `routes/index.ts` - Recording rename, project management
- `routes/assets.ts` - Image asset management
- `routes/thumbs.ts` - YouTube thumbnail management
- `routes/system.ts` - System operations (open Finder)

**Client (`client/src/`)**:
- `App.tsx` - Main app with tab navigation
- `hooks/useSocket.ts` - Socket.io connection
- `hooks/useApi.ts` - React Query hooks
- `components/` - UI components

**Shared (`shared/`)**:
- `types.ts` - TypeScript interfaces
- `naming.ts` - Naming validation and parsing
- `paths.ts` - Path utilities
- `constants.ts` - Shared constants

## Key Concepts

**Recording Naming Convention**: `{chapter}-{sequence}-{name}-{tags}.mov`
- Chapter: 2 digits (01-99)
- Sequence: 1+ digits (1, 2, 3...)
- Name: kebab-case descriptive name
- Tags: optional uppercase tags (CTA, SKOOL)
- Example: `10-5-intro-CTA.mov`

**Image Asset Naming**: `{chapter}-{seq}-{imgOrder}{variant}-{label}.{ext}`
- Example: `05-3-2a-workflow.png`

**Project Directory Structure**:
```
project-root/
├── recordings/           # Named video recordings (.mov/.mp4)
│   ├── -safe/            # Protected recordings
│   └── -chapters/        # Generated chapter videos (FR-58)
├── recording-shadows/    # Low-res video shadows for collaborators (FR-83)
├── recording-transcripts/# Whisper transcripts (.txt + .srt)
├── inbox/                # Incoming content staging (FR-59)
│   ├── raw/              # Dumps, notes, links
│   ├── dataset/          # Structured data
│   └── presentation/     # HTML visual assets
├── assets/
│   ├── images/           # Assigned image assets + prompts
│   └── thumbs/           # YouTube thumbnails
├── final/                # Final edited video + SRT
└── s3-staging/           # Files shared with editor via S3
```

**Configuration** (`server/config.json`):
- `watchDirectory` - Where Ecamm Live saves recordings
- `projectDirectory` - Current active project path
- `availableTags` - Tags available for recordings
- `commonNames` - Quick-select names with autoSequence rules
- `imageSourceDirectory` - Where to look for incoming images

## Real-time Updates

Socket.io events:
- `file:new`, `file:deleted`, `file:renamed` - Recording changes
- `recordings:changed` - Recording folder changes
- `assets:incoming-changed`, `assets:assigned-changed` - Image changes
- `thumbs:changed`, `thumbs:zip-added` - Thumbnail changes
- `projects:changed` - Project folder changes

## Git Workflow

Semantic commit helpers:
- `kfeat "message"` - New features
- `kfix "message"` - Bug fixes
- `kchore "message"` - Maintenance
- `kdocs "message"` - Documentation
