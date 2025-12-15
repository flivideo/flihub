# FliHub

Video recording workflow manager for content creators. Watch for new recordings, organize files with smart naming, manage transcripts, and collaborate with editors.

## Features

- **Recording Management** - Watch folder integration (Ecamm Live), smart naming with chapter/sequence/tags
- **Transcription** - Automatic transcription with WhisperAI, transcript sync highlighting
- **Asset Management** - Image assets, prompts, YouTube thumbnails
- **Chapter Videos** - Generate chapter compilations from segments
- **Shadow Files** - Lightweight placeholders for collaborators without video files
- **Real-time Updates** - Socket.io powered live UI updates

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open http://localhost:5101

## Documentation

| Document | Description |
|----------|-------------|
| [Cross-Platform Setup](docs/cross-platform-setup.md) | Setup guide for Windows users and collaborators |
| [Codebase Patterns](docs/patterns.md) | Architecture and code patterns |
| [CLAUDE.md](CLAUDE.md) | AI assistant instructions |

## Architecture

```
flihub/
├── client/          # React 19 + Vite + TailwindCSS v4
├── server/          # Express + Socket.io + chokidar watchers
└── shared/          # TypeScript types and utilities
```

## Project Structure

Each video project follows this structure:

```
project-folder/
├── recordings/              # Video recordings (.mov, .mp4)
├── recordings/-safe/        # Protected recordings
├── recordings/-chapters/    # Generated chapter videos
├── recording-shadows/       # Shadow placeholders (for collaborators)
├── recording-transcripts/   # Transcripts (.txt, .srt)
├── assets/
│   ├── images/             # Assigned image assets
│   ├── prompts/            # Image generation prompts
│   └── thumbs/             # YouTube thumbnails
├── inbox/                  # Incoming files
└── -final/                 # Final exported video
```

## Recording Naming Convention

```
{chapter}-{sequence}-{name}-{tags}.mov
```

- **Chapter**: 2 digits (01-99)
- **Sequence**: 1+ digits (1, 2, 3...)
- **Name**: kebab-case descriptive name
- **Tags**: Optional uppercase tags (CTA, SKOOL)

Example: `10-5-intro-CTA.mov`

## Configuration

Edit `server/config.json`:

```json
{
  "watchDirectory": "~/Movies/Ecamm Live",
  "projectDirectory": "/path/to/video-projects/v-appydave",
  "imageSourceDirectory": "~/Downloads"
}
```

## For Collaborators

If you're a video editor or collaborator without the original video files, see the [Cross-Platform Setup Guide](docs/cross-platform-setup.md) for instructions on working with shadow files.

## License

Private repository - AppyDave
