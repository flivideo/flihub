# FliHub Documentation

Documentation for FliHub - the video recording workflow management application (FliVideo Stage 2).

---

## Quick Links

| Document | Purpose |
|----------|---------|
| [backlog.md](backlog.md) | Requirements index (links to PRD files) |
| [changelog.md](changelog.md) | Implementation history |
| [brainstorming-notes.md](brainstorming-notes.md) | Ideas and exploration |
| [current-state.md](current-state.md) | What's implemented |

---

## Workflow

See [/flivideo/docs/po-dev-workflow.md](../../docs/po-dev-workflow.md) for the shared PO ↔ Dev workflow pattern.

**TL;DR:** PRD files in `docs/prd/` ARE the handoffs. `backlog.md` is just an index.

---

## Documentation Structure

```
docs/
├── prd/                  # Requirement specs (FR-XX, NFR-XX)
│   ├── fr-54-naming-template-bugs.md
│   ├── fr-89-cross-platform-path-support.md
│   └── ... (30+ spec files)
│
├── architecture/         # Technical documentation
│   ├── architecture.md
│   ├── api-reference.md
│   ├── socket-protocol.md
│   └── patterns.md
│
├── guides/               # Setup and operational guides
│   ├── cross-platform-setup.md
│   ├── wsl-development-guide.md
│   ├── release-process.md
│   └── troubleshooting.md
│
├── uat/                  # User Acceptance Testing
│
├── archive/              # Completed requirements (historical)
│   └── completed-requirements.md
│
├── backlog.md            # Requirements INDEX
├── changelog.md          # Version history
└── README.md             # This file
```

---

## By Topic

### Product Requirements (prd/)

| Spec | FRs | Description |
|------|-----|-------------|
| [good-take-algorithm.md](prd/good-take-algorithm.md) | FR-8 | Best take detection algorithm |
| [move-to-safe-spec.md](prd/move-to-safe-spec.md) | FR-15 | Move recordings to safe folder |
| [image-asset-management-spec.md](prd/image-asset-management-spec.md) | FR-17/18/19 | Image asset workflows |
| [image-prompt-spec.md](prd/image-prompt-spec.md) | FR-22 | AI image prompts |
| [youtube-thumbnails-spec.md](prd/youtube-thumbnails-spec.md) | FR-27 | Thumbnail management |
| [video-transcription-spec.md](prd/video-transcription-spec.md) | FR-30 | Whisper integration |
| [enhanced-project-view-spec.md](prd/enhanced-project-view-spec.md) | FR-31 | DAM integration |
| [chapter-extraction-spec.md](prd/chapter-extraction-spec.md) | FR-34 | Timestamp extraction |
| [chapter-recordings-spec.md](prd/chapter-recordings-spec.md) | FR-58 | Chapter video generation |
| [edit-workflow-spec.md](prd/edit-workflow-spec.md) | FR-101/102/103 | First edit workflow |
| [project-data-query-spec.md](prd/project-data-query-spec.md) | NFR-8 | Query API |

### Architecture (architecture/)

| Document | Description |
|----------|-------------|
| [architecture.md](architecture/architecture.md) | System architecture overview |
| [api-reference.md](architecture/api-reference.md) | REST API documentation |
| [socket-protocol.md](architecture/socket-protocol.md) | WebSocket events |
| [patterns.md](architecture/patterns.md) | Code patterns and conventions |

### Guides (guides/)

| Guide | Audience |
|-------|----------|
| [cross-platform-setup.md](guides/cross-platform-setup.md) | Windows/WSL users |
| [wsl-development-guide.md](guides/wsl-development-guide.md) | WSL development |
| [release-process.md](guides/release-process.md) | Release workflow |
| [troubleshooting.md](guides/troubleshooting.md) | Common issues |

---

## Related

- **Shared workflow**: `/flivideo/docs/po-dev-workflow.md`
- **Slash commands**: `/flivideo/.claude/commands/`
- **Application code**: `/flivideo/flihub/`
