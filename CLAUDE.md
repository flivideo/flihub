# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

## Current Focus (2025-12-05)

**Sprint:** Video playback + transcription UI

| Priority | Item | Status |
|----------|------|--------|
| 1 | FR-45: In-app video playback | Pending |
| 2 | FR-52: Transcription progress bar | Pending |

**Recently Completed:** FR-36 through FR-51 (16 features)

**Quick Reference:**
- `/progress` - Get quick project status
- Specs in [flivideo-docs](https://github.com/flivideo/flivideo-docs) repo

---

## Project Overview

FliHub is a TypeScript application for managing video recording workflows. It watches for new recordings from Ecamm Live, provides a web UI for naming/organizing files, and manages project assets.

**Specifications:** See [flivideo-docs](https://github.com/flivideo/flivideo-docs) repository

## Slash Commands

| Command | Purpose |
|---------|---------|
| `/dev` | Developer role - implementation |
| `/uat` | User acceptance testing |
| `/progress` | Quick project status check |

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
├── recordings/    # Named video recordings
├── safe/          # Protected recordings
├── assets/
│   └── images/    # Assigned image assets
└── thumbs/        # YouTube thumbnails
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
