# Recording Namer PoC

> **Proof of Concept** | Stage 2 Recording Namer workflow - Watch, detect, rename, and move video recordings from Ecamm Live.

---

## References

This PoC implements a subset of the Stage 2 Recording workflow. For full specifications, see:

- **Naming conventions**: [`stage-2-recording/core-concepts.md`](../stage-2-recording/core-concepts.md) - Recording Session, Asset Watchers, Naming & Organization
- **Recording format**: [`stage-2-recording/overview.md`](../stage-2-recording/overview.md) - Recording Naming section
- **File organization**: [`stage-2-recording/overview.md`](../stage-2-recording/overview.md) - File Organization section

---

## MVP Scope

A minimal web app to:

1. **Watch** Ecamm Live output directory for new `.mov` files
2. **Push** new file detections to the browser in real-time
3. **Display** files in a simple UI for naming
4. **Rename & move** files to the target project folder

### Out of Scope (for PoC)

- Multiple projects/episodes
- Transcription
- Trash/undo
- Database persistence (JSON file is fine)
- Authentication

---

## Tech Stack

**Server:**
- Express + TypeScript
- chokidar - File watching
- Socket.io - Push events to client
- fs-extra - File operations

**Client:**
- React + Vite + TypeScript
- TailwindCSS
- Socket.io-client - Receive file events
- TanStack Query - Server state/mutations

### Why Socket.io + TanStack Query Together?

They solve different problems:

| Tool | Purpose | Use For |
|------|---------|---------|
| Socket.io | Real-time push from server | New file detection events |
| TanStack Query | Request/response + caching | API calls (config, rename, list files) |

Socket.io pushes "new file detected" events. TanStack Query handles the rename mutations and caches file lists.

---

## Project Setup

### Monorepo Structure (NPM Workspaces)

```
recording-namer-poc/
├── package.json              # Root workspace config
├── client/                   # React frontend
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       └── components/
├── server/                   # Express backend
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts          # Express + Socket.io setup
│       ├── watcher.ts        # chokidar file watcher
│       └── routes/
└── shared/                   # Shared TypeScript types (optional)
    └── types.ts
```

### Root package.json

```json
{
  "name": "recording-namer-poc",
  "private": true,
  "workspaces": ["client", "server", "shared"],
  "scripts": {
    "dev": "concurrently \"npm run dev -w server\" \"npm run dev -w client\"",
    "build": "npm run build -w server && npm run build -w client"
  },
  "devDependencies": {
    "concurrently": "^8.2.0"
  }
}
```

### Server Dependencies

```json
{
  "dependencies": {
    "express": "^5.1.0",
    "socket.io": "^4.8.1",
    "chokidar": "^3.6.0",
    "fs-extra": "^11.3.1",
    "cors": "^2.8.5",
    "dotenv": "^17.2.2"
  },
  "devDependencies": {
    "@types/express": "^5.0.3",
    "@types/fs-extra": "^11.0.4",
    "@types/node": "^24.3.1",
    "tsx": "^4.20.5",
    "nodemon": "^3.1.10",
    "typescript": "^5.9.2"
  }
}
```

### Client Dependencies

```json
{
  "dependencies": {
    "react": "^19.1.1",
    "react-dom": "^19.1.1",
    "socket.io-client": "^4.8.1",
    "@tanstack/react-query": "^5.87.1",
    "sonner": "^1.7.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^5.0.0",
    "@tailwindcss/vite": "^4.1.0",
    "tailwindcss": "^4.1.0",
    "vite": "^7.1.5",
    "typescript": "~5.8.3",
    "@types/react": "^19.1.10",
    "@types/react-dom": "^19.1.7"
  }
}
```

### TailwindCSS v4 Setup (Important)

Tailwind v4 is configured differently from v3. **Do NOT create a `tailwind.config.js` file.**

**vite.config.ts:**
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
})
```

**src/index.css:**
```css
@import "tailwindcss";
```

That's it. No PostCSS config, no content array, no autoprefixer. Tailwind v4 auto-detects your files.

### Toast Notifications (Sonner)

Add `<Toaster />` to your App root, then call `toast()` from anywhere:

```tsx
// App.tsx
import { Toaster } from 'sonner'

function App() {
  return (
    <>
      <Toaster position="top-right" />
      {/* rest of app */}
    </>
  )
}

// Anywhere in app
import { toast } from 'sonner'

toast.success('File renamed successfully')
toast.error('Rename failed: file not found')
```

### Environment Variables

**Server `.env`:**
```
PORT=3001
WATCH_DIR=~/Movies/Ecamm Live/
TARGET_DIR=/path/to/project/recordings/
```

**Client `.env`:**
```
VITE_API_URL=http://localhost:3001
```

### Port Configuration

| Service | Port | Purpose |
|---------|------|---------|
| Server (Express + Socket.io) | 3001 | API + WebSocket |
| Client (Vite dev server) | 5173 | React app (default Vite port) |

---

## Project Code Format

Target directories use project codes from Stage 2:

```
{Sequence}-{ChannelCode}-{ProjectName}
```

| Component | Description | Example |
|-----------|-------------|---------|
| Sequence | Alphanumeric, `a00`→`a99`→`b00` | `a27`, `b03` |
| ChannelCode | Optional channel identifier | `xmen`, `tldr` |
| ProjectName | Kebab-case description | `my-video-project` |

**Examples:**
- `a27-xmen-my-video-project`
- `a27-my-video-project` (no channel code)
- `b03-claude-code-tutorial`

**Full target path:**
```
/Volumes/Expansion/Sync/tube-channels/video-projects/a27-my-video-project/recordings/
```

---

## Recording Naming Format

From Stage 2 docs:

```
{ChapterSequence}-{Subsequence}-{ChapterName}-{Tag1}-{Tag2}.mov
```

| Component | Description | Example |
|-----------|-------------|---------|
| ChapterSequence | Zero-padded chapter number | `01`, `02`, `03` |
| Subsequence | Take/part within chapter (only if multiple) | `1`, `2` |
| ChapterName | Descriptive name | `intro`, `content`, `outro` |
| Tags | Optional pre-configured variations | `cta`, `endcards` |

**Examples:**
- `01-intro.mov` (single take)
- `02-1-content.mov` (first take)
- `02-2-content.mov` (second take)
- `03-1-outro-cta.mov` (with tag)

### Pre-configured Tags

Tags must be from this predefined list to enable automatic parsing:

| Tag | Description |
|-----|-------------|
| `cta` | Call to Action segment |
| `endcards` | End screen with video references |

Additional tags can be added to configuration as needed.

---

## How It Works

```
Ecamm Live saves recording
        ↓
  [Watch Directory]
  ~/Movies/Ecamm Live/
        ↓
chokidar detects new .mov
        ↓
Socket.io emits "file:new"
        ↓
  [Browser UI]
  Shows: "Ecamm Live Recording on 2024-12-29 at 15.28.18.mov"
  User enters: Chapter=01, Name=intro
        ↓
POST /api/rename
        ↓
Server renames & moves to:
  [Target Directory]
  /project-name/recordings/01-intro.mov
```

---

## API Endpoints

### `GET /api/config`
Returns current watch/target directories.

### `POST /api/config`
Update watch/target directories.

### `GET /api/files`
List pending files (not yet renamed).

### `POST /api/rename`
Rename and move a file.

```json
{
  "originalPath": "/path/to/Ecamm Live Recording....mov",
  "chapter": "01",
  "subsequence": null,
  "name": "intro",
  "tags": []
}
```

---

## Socket Events

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `file:new` | `{ path, filename, timestamp }` | New file detected |
| `file:renamed` | `{ oldPath, newPath }` | File successfully renamed |
| `file:error` | `{ path, error }` | Rename failed |

---

## UI Components

### Minimal Layout

```
┌─────────────────────────────────────────────┐
│ Recording Namer                    [Config] │
├─────────────────────────────────────────────┤
│                                             │
│  Incoming Files                             │
│  ┌─────────────────────────────────────┐   │
│  │ Ecamm Live Recording...15.28.18.mov │   │
│  │ Chapter: [01] Name: [intro] Tags: []│   │
│  │                          [Rename]   │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ Ecamm Live Recording...15.32.45.mov │   │
│  │ Chapter: [02] Name: [content] Tags: │   │
│  │                          [Rename]   │   │
│  └─────────────────────────────────────┘   │
│                                             │
├─────────────────────────────────────────────┤
│ Target: /project-name/recordings/           │
└─────────────────────────────────────────────┘
```

---

## Configuration

Stored in `config.json` or via environment variables:

```json
{
  "watchDirectory": "~/Movies/Ecamm Live/",
  "targetDirectory": "/path/to/project-name/recordings/",
  "fileExtensions": [".mov"]
}
```

---

## Quick Start

```bash
# From project root
npm install
npm run dev

# Server: http://localhost:3001
# Client: http://localhost:5173
```

---

## Edge Cases

### Input Validation

| Field | Rule |
|-------|------|
| ChapterSequence | Must be 2-digit number (`01`-`99`) |
| Subsequence | Optional, single digit (`1`-`9`) |
| ChapterName | Lowercase, alphanumeric, hyphens only. No spaces or special characters. Max 50 chars. |
| Tags | Must match pre-configured list |

### Filename Conflicts

If target filename already exists:
1. **Warn user** - Show conflict in UI
2. **Suggest increment** - Offer next available subsequence (e.g., `02-1-content.mov` → `02-2-content.mov`)
3. **User decides** - Overwrite, rename, or cancel

### Invalid Characters

ChapterName input is sanitized:
- Spaces → hyphens
- Uppercase → lowercase
- Special characters → removed
- Multiple hyphens → single hyphen

Example: `"My Intro!!"` → `my-intro`

---

## Trash Folder

Bad takes can be moved to `.trash/` within the recordings folder:

```
project-name/recordings/
├── 01-intro.mov
├── 02-1-content.mov
├── .trash/
│   └── Ecamm Live Recording on 2024-12-29 at 15.28.18.mov
```

### Trash Behavior (Future Enhancement)

- **Move to trash**: Button in UI to discard without naming
- **Restore**: Drag from trash back to pending
- **Empty trash**: Manual action, not automatic

For PoC: Simply skip files user doesn't want - no trash implementation required.

---

## Functional Requirements

### Default Values & Auto-Increment

| ID | User Story | Status |
|----|------------|--------|
| FR-1 | As a content creator, when I start a new video project, the chapter, subsequence, and name should default to `01`, `1`, and `intro` so that I don't have to remember how to name the first video. | ✅ Done |
| FR-2 | As a content creator, when I finish recording a video and it appears in the incoming files list, the subsequence should automatically increment by one so that I don't accidentally overwrite an existing video. | ✅ Done |
| FR-3 | As a content creator, I should have a "New Chapter" button that increments the chapter number, resets subsequence to `1`, and clears the name field so that it's easy to change chapters with consistent naming. | ✅ Done |
| FR-4 | As a content creator, I should be able to open the application pointed at a folder and when the folder changes, it recalculates what the next chapter ID, segment ID and name should be. | ✅ Done |

### File Management

| ID | User Story | Status |
|----|------------|--------|
| FR-5 | As a content creator, if I manually delete the Ecamm Live video from the hard drive, it should automatically be removed from the incoming files list so that I know what files are actually available to rename. | ✅ Done |
| FR-6 | As a content creator, if I click "Discard" on an incoming file, it should be removed from the UI and moved to a `.trash/` directory in my target project folder so that I can recover it if needed. | ✅ Done |

### File Metadata & Visual Cues

| ID | User Story | Status |
|----|------------|--------|
| FR-7 | As a content creator, when a video appears in the incoming files list, I should see its file size and duration so that I can quickly identify which recordings are real takes versus quick discards. The likely "good take" (largest/longest recent file) should be visually highlighted so I can focus on the right file when multiple recordings are pending. | ✅ Done |

---

## Future Enhancements (Post-PoC)

- Project/episode selection
- Keyboard shortcuts for fast naming
- Restore from trash functionality
- Integration with full Stage 2 system

---

**Status**: PoC / Experimental
**Last Updated**: 2025-11-26
