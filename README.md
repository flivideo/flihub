# FliHub

Video recording workflow manager for content creators. Watch for new recordings, organize files with smart naming, manage transcripts, and collaborate with editors.

## Features

- **Recording Management** - Watch folder integration (Ecamm Live), smart naming with chapter/sequence/tags
- **Transcription** - Automatic transcription with WhisperAI, transcript sync highlighting
- **Asset Management** - Image assets, prompts, YouTube thumbnails
- **Chapter Videos** - _Deprecated (FliStudio roadmap §1.2e)_: existing `recordings/-chapters/` still play; new previews are no longer made
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

## Open at a brand and project (open contract)

FliHub follows the FliVideo open contract (`flistudio/docs/open-contract.md` §3): the same context —
`brand`, `project`, optional `video` — can be set three ways, and all three run one `applyContext`
on the server (`server/src/utils/openContext.ts`).

| Door | How | Missing argument |
| --- | --- | --- |
| 1 · Picker | Brand switcher + project list in the UI | — |
| 2 · Launch | `./start.sh --brand appydave --project b85-demo [--video 01-intro]` · `scripts/app.sh start --brand … --project …` · or `FLIVIDEO_BRAND` / `FLIVIDEO_PROJECT` / `FLIVIDEO_VIDEO` (argv wins) | Starts as it would have, on the picker. Only `--brand` switches the brand and leaves the project list as the picker |
| 3 · API | `POST /api/context {"brand","project","video?"}` → `200 {context}` · `400 {missing}` · `404` unknown brand/project · `409 {candidates}` ambiguous · `503` registry or brand root unreadable | `400` naming the field |

`GET /api/context` returns `{ context, missing, refused? }`, derived from the live config (so a pick in the UI shows too).
`scripts/app.sh start --brand … --project …` on an app that is already running switches it through door 3.

- **Resolution** goes through `@flivideo/core`: `brands.json` → brand root on this machine (home prefix rewritten,
  `~/.fli/machine.json` override) → project by folder name, `fli.studio.json` id, or whole code.
- **Membership**: a folder with a valid `fli.studio.json` is `membership: "member"` with its `projectId`. Most FliHub
  projects have no `fli.studio.json` yet (adoption is FliStudio's job), so any other existing folder in the brand
  root is accepted as `membership: "folder"` with `projectId: null`.
- **Refusal** (unknown brand, no such folder, ambiguous code) never falls back to the last project: the config stays
  as it was, the server logs one `[context] … refused:` line, and `GET /api/context` carries `refused: { code, reason, candidates? }`.
- **Restarts**: the scripts stamp each launch with `FLIVIDEO_LAUNCH_ID`; a nodemon or `overmind restart server` under
  the same launch does not re-apply it (remembered in `server/.launch-context.json`), so a later pick survives.

## Documentation

| Document                                             | Description                                           |
| ---------------------------------------------------- | ----------------------------------------------------- |
| [Architecture](docs/architecture.md)                 | Full stack overview, Socket.io, server/client details |
| [API Reference](docs/api-reference.md)               | Complete REST API endpoint documentation              |
| [Socket Protocol](docs/socket-protocol.md)           | Real-time WebSocket events and payloads               |
| [Codebase Patterns](docs/patterns.md)                | Code conventions and established patterns             |
| [Troubleshooting](docs/troubleshooting.md)           | Common issues and solutions                           |
| [Cross-Platform Setup](docs/cross-platform-setup.md) | Setup guide for Windows users and collaborators       |
| [CLAUDE.md](CLAUDE.md)                               | AI assistant instructions                             |

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
