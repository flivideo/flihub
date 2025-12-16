# Cross-Platform Setup Guide

This guide helps collaborators (primarily on Windows) set up and use FliHub without the original video recordings.

## Who This Is For

- **Video editors** who receive project files but don't record videos
- **Collaborators** reviewing transcripts, assets, and project structure
- **Anyone on Windows** (FliHub was built on Mac but works cross-platform)

## Prerequisites

### Node.js (Required)

Install Node.js v18 or later:
1. Download from https://nodejs.org/
2. Choose the LTS version
3. Run the installer, accept defaults
4. Verify: Open terminal/PowerShell and run `node --version`

### Git (Required)

Install Git:
1. Download from https://git-scm.com/download/win
2. Run installer, accept defaults
3. Verify: `git --version`

### FFmpeg (Optional)

Only needed if you want to generate chapter videos from recordings.

**Windows installation:**
1. Download from https://ffmpeg.org/download.html (choose Windows build)
2. Extract to `C:\ffmpeg`
3. Add `C:\ffmpeg\bin` to your PATH environment variable
4. Verify: `ffmpeg -version`

### WhisperAI (Optional)

Only needed if you want to transcribe videos locally. As a recipient, you'll typically receive transcripts already generated.

If needed, see: https://github.com/openai/whisper

## Installation

```bash
# Clone the repository
git clone https://github.com/appydave/flihub.git
cd flihub

# Install dependencies
npm install

# Start the application
npm run dev
```

The app runs on http://localhost:5101

## Configuration

### First-Time Setup

On first run, you'll need to configure paths in the Config tab.

#### Path Format Examples

FliHub supports paths from all major platforms:

| Platform | Format | Example |
|----------|--------|---------|
| **Mac** | Unix paths | `~/dev/video-projects/v-appydave` or `/Users/jan/projects` |
| **Windows** | Drive letters | `C:\Users\Jan\video-projects\v-appydave` |
| **Windows** | UNC paths | `\\wsl$\Ubuntu\home\jan\projects` |
| **Linux** | Unix paths | `/home/jan/video-projects` |

**Tips:**
- Paths can start with `~` (home), `/` (Unix root), `C:\` (Windows drive), or `\\` (UNC)
- The Config panel shows ✓ if the path exists, ⚠ if not found
- Pasted paths with quotes are automatically cleaned (e.g., `"C:\path"` → `C:\path`)

#### Projects Root Directory (Required)

This is the parent folder containing all your project folders:

**Examples:**
- Mac: `~/dev/video-projects/v-appydave`
- Windows: `C:\Users\Jan\video-projects\v-appydave`
- WSL: `\\wsl$\Ubuntu\home\jan\video-projects\v-appydave`

This folder should contain project subfolders like `b64-bmad-claude-sdk`, `b71-bmad-poem`, etc.

#### Active Project

The currently selected project folder name (e.g., `b71-bmad-poem`). You can:
- Type the folder name directly, or
- Select from the Projects panel

#### Watch Directory (Optional - Leave Blank)

This is for Ecamm Live (Mac screen recording software). As a recipient:
- Leave this blank, or
- Set it to any empty folder

The Config page will show:
```
🔴 Not configured
Incoming recordings from Ecamm Live will not be detected.
```

This is expected and fine - you're not recording videos.

### Example Config for Recipients

```json
{
  "watchDirectory": "",
  "projectsRootDirectory": "C:\\Users\\Jan\\video-projects\\v-appydave",
  "activeProject": "b71-bmad-poem",
  "imageSourceDirectory": "C:\\Users\\Jan\\Downloads"
}
```

## Understanding Shadow Files

### What Are Shadows?

Shadow files are lightweight `.txt` placeholders that represent video recordings. They allow you to see project structure and file listings without having the actual video files (which are too large to share via git).

### Where Are They?

```
project-folder/
├── recordings/              ← Original videos (you won't have these)
├── recording-shadows/       ← Shadow placeholders (you have these)
├── recording-transcripts/   ← Transcripts (you have these)
└── assets/                  ← Images and prompts (you have these)
```

### Recording Status Indicators

In the Recordings tab, you'll see different icons:

| Icon | Meaning |
|------|---------|
| 📹 | Real video file (original recording) |
| 📹👻 | Real + shadow (synced for collaborators) |
| 👻 | Shadow only (preview mode - no video available) |

As a recipient, you'll typically see 👻 for all recordings.

### Watch Page Behavior

When you click on a shadow-only recording:
- Video player shows "Video not available locally"
- Duration and original file size are displayed
- Transcript panel works normally (if transcripts exist)
- Transcript sync highlighting is disabled (no video to sync with)

## What Works Without Video Files

| Feature | Status | Notes |
|---------|--------|-------|
| Project list | ✅ Works | See all projects, stats, stages |
| File counts | ✅ Works | Shadow count matches original |
| Transcripts | ✅ Works | Read transcripts if .txt/.srt exist |
| Transcript sync | ❌ Disabled | Needs actual video to sync |
| Assets/Images | ✅ Works | View and manage images |
| Inbox | ✅ Works | View inbox files |
| Video playback | ❌ Disabled | Shadow files aren't playable |
| Transcription | ❌ Disabled | Nothing to transcribe |
| Chapter generation | ❌ Disabled | Needs real video files |

## Project List Columns

The Projects tab shows useful stats:

| Column | Meaning | Click Action |
|--------|---------|--------------|
| Files | Total recordings | Opens recordings folder |
| Shadows | Shadow file count | Opens shadows folder |
| Ch | Chapter count | Opens chapters folder |
| 📥 | Has inbox files | Navigates to Inbox tab |
| 🖼 | Has assets | Navigates to Assets tab |
| 🎬 | Has chapter videos | Navigates to Recordings tab |
| % | Transcript completion | Tooltip shows details |
| ✅ | Final video status | Tooltip shows video/SRT status |

## Syncing with David

### Getting Updates

```bash
cd flihub
git pull origin main
```

### What Gets Synced

- ✅ Shadow files (`recording-shadows/`)
- ✅ Transcripts (`recording-transcripts/`)
- ✅ Assets and prompts (`assets/`)
- ✅ Inbox files (`inbox/`)
- ❌ Original recordings (`recordings/`) - too large

### If You See Missing Shadows

If a project shows files but no shadows, David needs to generate them:
1. Config tab → Shadow Videos section
2. Click "Generate Shadows"

Then commit and push for you to receive them.

## Troubleshooting

### "Cannot find module" errors

```bash
npm install
```

### Port 5101 already in use

Check for other instances or change the port in server config.

### Watch directory warnings

If you see red warnings about watch directory - this is normal for recipients. You can ignore it or set `watchDirectory` to an empty string in config.

### Projects not showing

Make sure `projectDirectory` points to a folder containing project subfolders with the correct naming pattern (e.g., `b71-project-name`).

## Future: Alternative Screen Recorders

FliHub was built for Ecamm Live (Mac), but the architecture supports any screen recorder that saves files to a watched folder:

- **OBS Studio** - Set output folder as watch directory
- **Camtasia** - Export location as watch directory
- **ScreenFlow** (Mac) - Export folder as watch directory

This enables creators on any platform to use FliHub for their recording workflow.
