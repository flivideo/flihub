# IMPLEMENTATION_PLAN.md — Warm Linen Theme

**Goal**: Replace FliHub's bright white UI with a warm linen palette (v2-linen from AngelEye Mochaccino) to reduce camera reflection during recording sessions.
**Started**: 2026-03-24
**Target**: All 53 component files use semantic color tokens instead of raw Tailwind gray/white classes. Zero bright white surfaces remain.

## Summary
- Total: 13 | Complete: 13 | In Progress: 0 | Pending: 0 | Failed: 0

## Pending

## In Progress

## Complete

### Wave 3 — Remaining components
- [x] W3-01 — AssetsPage.tsx + ThumbsPage.tsx + InboxPage.tsx + TranscriptionsPage.tsx — ~95 replacements across 4 files
- [x] W3-02 — ProjectsPanel.tsx + ConfigPanel.tsx + ApiExplorer.tsx + HeaderDropdown.tsx — ~85 replacements across 4 files
- [x] W3-03 — Modal components (TranscriptModal, VideoTranscriptModal, RecordingVideoModal, ChapterRecordingModal, DiscardModal, ClipboardPasteModal, ImagePreviewOverlay, TranscriptSyncModal, ProjectStatsPopup, ChapterContextPanel, TranscriptionProgressBar) — all 11 files converted
- [x] W3-04 — Small components (SizeToggle, RelayBrowser, OpenFolderButton, ToolsSidebar, SyncIndicator, SelectionBadge, EditableFileRow) — 7 converted, 3 skipped (SplitMarker has no gray classes, DeveloperDrawer + ConnectionIndicator use intentional dark themes)

### Wave 2 — Page components (high-traffic pages)
- [x] W2-01 — RecordingsView.tsx — 27 replacements (bg-white, bg-gray-100, text-gray-*, border-gray-*, hover states)
- [x] W2-02 — WatchPage.tsx + TranscriptSyncPanel.tsx + ChapterPanel.tsx — 50+ replacements across 3 files
- [x] W2-03 — NamingControls.tsx + FileCard.tsx + IncomingVideoModal.tsx — all gray/white classes replaced with warm tokens
- [x] W2-04 — ManagePanel.tsx + PoemWuiPage.tsx — all gray/white classes replaced with warm tokens

### Wave 1 — Foundation (theme tokens + shared components)
- [x] W1-01 — Define @theme color tokens in index.css — 12 semantic color tokens added via Tailwind v4 @theme block (page, surface, surface-hover, surface-muted, border-warm, border-warm-strong, text-warm-primary/secondary/muted/faint, warm-header, warm-divider)
- [x] W1-02 — Update App.tsx shell — all bg-gray-100, bg-white, text-gray-*, border-gray-*, hover:bg-gray-* replaced with semantic warm tokens
- [x] W1-03 — Update shared components — 14 files converted: PageContainer, PageHeader, SlideOutDrawer, ConfirmationModal, ErrorMessage, LoadingSpinner, BatchToolbar, PreviewPanel, UndoToast, FileViewerModal, GlingEditTool, RelayTool, SyncTool, RegenToolbar

## Failed / Needs Retry

## Notes & Decisions
- Palette source: AngelEye Mochaccino v2-linen, adapted for FliHub's blue accent
- 1,125 total color class occurrences across 53 files (92 bg-white, 207 bg-gray-*, 638 text-gray-*, 188 border-gray-*)
- Keep FliHub's existing blue (#3b82f6) for interactive elements — don't switch to amber accent
- The @theme block approach (Tailwind v4) lets us define semantic names that map to the warm palette
- Wave 1 changes alone will fix ~80% of the brightness problem (App shell + PageContainer wraps everything)
- ToolsSidebar.test.tsx updated to assert `text-warm-secondary` instead of `text-gray-600`
- 3 files intentionally skipped: DeveloperDrawer (dark theme drawer), ConnectionIndicator (dark tooltip bg), SplitMarker (amber only, no gray)
- All 800 tests pass, client build clean
