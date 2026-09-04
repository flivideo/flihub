# Backlog

Requirements index for FliHub.

**Archive:** Completed items moved to `archive/requirements-2025-q4.md`

**Discovery Plan (2026-01-06):** 7-phase file management discovery complete - scanner analyzed 47 projects.

**Scanner Correction (2026-01-06):** Scanner bugs fixed - accurate results: **391 issues** (not 1805). **NFR-141 withdrawn.** See `docs/planning/po-session-2026-01-06-scanner-correction.md`

**Accurate Results:** 361 derivative (92%, INFO), 22 structural (6%, INFO), 8 naming (2%, ERROR). **App parser validated as correct.**

**Priority Order:** FR-140 (HIGH - validated by data) → 8 manual fixes (15 min) → FR-134/133/135 (OPTIONAL future enhancements)

**Ruled, not yet actioned (2026-09-04):** David ruled the project-folder convention as
`recordings/` · `recording-transcripts/` · `b-roll/` · `first-edit/` · `audio/` ·
`second-edit/` · `final/`. The dead `edit-1st`/`edit-2nd` strings (FliHub never reads or
writes them — see `architecture/edit-folders.md`) and the relay edit lanes can be retired
when that lands. Captured only; no ticket yet. Also 2026-09-04: shadow recordings (FR-83)
code fully removed — see `deprecation/shadow-recordings-inventory.md`; disk cleanup (57
folders) still awaits David's word.

---

## Functional Requirements

| ID     | Requirement                                                                                   | Added      | Status                                                          |
| ------ | --------------------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------- |
| FR-170 | [Chapter Seed Export for FliCut](prd/fr-170-chapter-seed-export.md)                     | 2026-09-04 | Pending (blocked on FR-169; FliCut half = FC-30)                |
| FR-169 | [Word-Level Timestamps in Transcription](prd/fr-169-word-level-timestamps.md)           | 2026-09-04 | Pending (blocker for FR-170/FC-30; one-flag change + dictionary question) |
| FR-168 | [`ships` Field: per-project / per-chapter](prd/fr-168-ships-field.md)                   | 2026-09-04 | Pending — design RULED by David 2026-09-04                      |
| FR-167 | [Chapter Extraction Anchors Wrong Take](prd/fr-167-chapter-extraction-last-take.md)     | 2026-09-04 | Pending (FR-34 fragility; needs David's read on options)        |
| FR-166 | [Bulk-Rename Honest Response](prd/fr-166-bulk-rename-honest-response.md)                | 2026-09-04 | Pending (defect, observed live)                                 |
| FR-165 | [One Undo Story for Renames](prd/fr-165-unified-rename-undo.md)                         | 2026-09-04 | Pending (design gap, observed live)                             |
| FR-164 | [Swap-Chapters Strands FR-157 Titles](prd/fr-164-swap-chapters-title-remap.md)          | 2026-09-04 | Pending (latent defect)                                         |
| FR-163 | [Auto-filled Project Codes on New Project](prd/fr-163-auto-filled-project-codes.md) | 2026-09-03 | ✓ Implemented (a01 + 50-char threshold ruled 2026-09-04)            |
| FR-161 | [B-roll Lane](prd/fr-161-b-roll-lane.md)                                                | 2026-09-03 | ✓ Implemented                                                   |
| FR-162 | [Brand Switcher Dropdown](prd/fr-162-brand-switcher.md)                                 | 2026-09-03 | ✓ Implemented                                                   |
| FR-157 | [Project and Chapter YouTube Titles](prd/fr-157-project-and-chapter-titles.md)          | 2026-08-30 | ✓ Implemented                                                   |
| FR-156 | [Delete Recording (with confirmation)](prd/fr-156-delete-recording.md)                | 2026-08-26 | ✓ Implemented                                                   |
| FR-155 | [Ecamm Dual-Mode Recording Ingestion](prd/fr-155-ecamm-dual-mode-ingestion.md)          | 2026-08-26 | Future (documented — design decision open)                      |
| FR-154 | [Orientation-Aware Video Playback](prd/fr-154-orientation-aware-video-playback.md)     | 2026-08-26 | ✓ Implemented                                                   |
| FR-153 | [Storage Workflow Redesign — Hold, Archive, Restore](prd/fr-153-storage-workflow-redesign.md) | 2026-04-09 | Pending                                                         |
| FR-152 | [Safe Project Delete](prd/fr-152-safe-project-delete.md)                                        | 2026-04-08 | ✓ Implemented                                                   |
| FR-151 | [Transcribe All Button in Project Slide-out](prd/fr-151-transcribe-all-slideout.md)             | 2026-04-08 | ✓ Implemented                                                   |
| FR-150 | [Groq Transcription Engine](prd/fr-150-groq-transcription.md)                                   | 2026-04-08 | Deferred (MLX path fix applied instead)                         |
| FR-149 | [Stage System Changes — Shelved, Remix, Drop Rev](prd/fr-149-stage-system-changes.md)           | 2026-04-08 | ✓ Implemented                                                   |
| FR-147 | [Relay Project Awareness — Two-Pool Split](prd/fr-147-relay-project-awareness.md)               | 2026-03-25 | ✓ Implemented                                                   |
| FR-145 | [Escape Key Closes Video Preview Modal](prd/fr-145-escape-closes-video-modal.md)                | 2026-03-16 | ✓ Implemented                                                   |
| FR-144 | [Send Transcript to POEM WUI Workflow Intake](prd/fr-144-workflow-intake.md)                    | 2026-02-25 | ✓ Implemented                                                   |
| FR-143 | [SRT Clipboard Copy Button](prd/fr-143-srt-clipboard.md)                                        | 2026-02-24 | ✓ Implemented                                                   |
| FR-142 | [Split Export/S3 Tool: Separate Gling Prep from S3 Staging](prd/fr-142-split-export-s3-tool.md) | 2026-02-18 | ✓ Implemented                                                   |
| FR-141 | [Export & S3 Workflow Overhaul](prd/fr-141-export-s3-workflow-overhaul.md)                    | 2026-02-16 | ✓ Implemented                                                   |
| FR-140 | [Chapter Move & Cascade Renumbering](prd/fr-140-bulk-chapter-renumbering.md)                  | 2026-01-06 | ✓ Implemented                                                   |
| FR-139 | [Folders Tool Specification](prd/fr-139-folders-tool-specification.md)                        | 2026-01-06 | ✓ Implemented                                                   |
| FR-138 | [Rename Tool Specification](prd/fr-138-rename-tool-specification.md)                          | 2026-01-06 | ✓ Implemented (Validated - no updates needed)                   |
| FR-137 | [SlideOutDrawer Tool Pattern](prd/fr-137-slideout-drawer-pattern.md)                          | 2026-01-06 | ✓ Implemented (Documented retroactively)                        |
| FR-136 | [Tool-Oriented Manage Panel](prd/fr-136-tool-oriented-manage-panel.md)                        | 2026-01-04 | ✓ Complete (Core Architecture - See FR-137/138/139)             |
| FR-135 | [Chapter Tools (Move, Swap, Undo)](prd/fr-135-chapter-tools.md)                               | 2026-01-04 | 🟢 LOW - Ready but not urgent (No evidence of need)             |
| FR-134 | [Inconsistency Detection & Auto-Fix](prd/fr-134-inconsistency-detection.md)                   | 2026-01-04 | 🟢 LOW - Optional preventative warnings                         |
| FR-133 | [File Status Indicators](prd/fr-133-file-status-indicators.md)                                | 2026-01-04 | 🟢 LOW - Optional visibility tool                               |
| FR-132 | [Dual Transcription System with Progress Tracking](prd/fr-132-dual-transcription-progress.md) | 2026-01-03 | Pending                                                         |
| FR-131 | [Manage Panel with Bulk Rename & Regen Toolbar](prd/fr-131-manage-panel-bulk-rename.md)       | 2026-01-03 | Phase 1 ✓ / Phase 2 Pending - See FR-136 for alternative UI     |
| FR-130 | [Simplify Rename Logic (Delete+Regenerate)](prd/fr-130-simplify-rename-delete-regenerate.md)  | 2026-01-03 | ✓ Implemented                                                   |
| FR-128 | [Recording Quick Preview](prd/fr-128-recording-quick-preview.md)                              | 2026-01-03 | ✓ Implemented                                                   |
| FR-127 | [Developer Drawer (Data Files Viewer)](prd/fr-127-developer-drawer.md)                        | 2026-01-02 | ✓ Implemented                                                   |
| FR-126 | [Edit Folder Manifest & Cleanup](prd/fr-126-edit-folder-manifest.md)                          | 2026-01-02 | ✓ Implemented                                                   |
| FR-125 | [Config & EditPrep Consolidation](prd/fr-125-config-editprep-consolidation.md)                | 2026-01-02 | ✓ Implemented                                                   |
| FR-124 | [Export Panel Enhancements](prd/fr-124-export-panel-enhancements.md)                          | 2026-01-02 | ✓ Implemented                                                   |
| FR-123 | [Watch Panel Enhancements](prd/fr-123-per-segment-annotation.md)                              | 2026-01-02 | ✓ Implemented                                                   |
| FR-122 | [Export Panel](prd/fr-122-export-panel.md)                                                    | 2026-01-02 | ✓ Implemented                                                   |
| FR-121 | [Parked State in Watch Panel](prd/fr-121-parked-state-watch-panel.md)                         | 2026-01-02 | ✓ Implemented                                                   |
| FR-120 | [Parked Recording State](prd/fr-120-parked-recording-state.md)                                | 2026-01-02 | ✓ Implemented                                                   |
| FR-119 | [API Documentation & Testing Page](prd/fr-119-api-documentation-testing.md)                   | 2025-12-31 | ✓ Implemented                                                   |
| FR-118 | [Project-Specific Gling Dictionary](prd/fr-118-project-gling-dictionary.md)                   | 2025-12-31 | ✓ Implemented                                                   |
| FR-117 | [Hover UX Improvements](prd/fr-117-hover-ux-improvements.md)                                  | 2025-12-30 | ✓ Implemented                                                   |
| FR-116 | [Incoming Page - Quick Config Access](prd/fr-116-quick-config-access.md)                      | 2025-12-30 | ✓ Implemented                                                   |
| FR-115 | [Incoming Page - Chapter Context Panel](prd/fr-115-chapter-context-panel.md)                  | 2025-12-30 | ✓ Implemented                                                   |
| FR-114 | [Projects Page - Transcript Quick Access](prd/fr-114-transcript-quick-access.md)              | 2025-12-30 | ✓ Phase 1 Complete                                              |
| FR-113 | [Edit Prep Path Fix & Folder Restructure](prd/fr-113-first-edit-path-expansion.md)            | 2025-12-27 | ✓ Implemented                                                   |
| FR-112 | [Sequential Chapter Increment](prd/fr-112-sequential-chapter-increment.md)                    | 2025-12-26 | ✓ Implemented                                                   |
| FR-111 | [Safe Architecture Rework](prd/fr-111-safe-architecture-rework.md)                            | 2025-12-26 | Implemented (Phase 5 Future)                                    |
| FR-110 | [Project Stage Persistence & Dropdown](prd/fr-110-project-stage-fixes.md)                     | 2025-12-26 | Implemented                                                     |
| FR-109 | [Transcript Management Bugs](prd/fr-109-transcript-bugs.md)                                   | 2025-12-26 | Implemented                                                     |
| FR-108 | [Gling Dictionary Not Saving](prd/fr-108-gling-dictionary-save-bug.md)                        | 2025-12-25 | Implemented                                                     |
| FR-107 | [Chapter Input Auto-Focus & Glow](prd/fr-107-chapter-input-focus-glow.md)                     | 2025-12-23 | Implemented                                                     |
| FR-106 | [Incoming Video Preview](prd/fr-106-incoming-video-preview.md)                                | 2025-12-19 | Implemented                                                     |
| FR-105 | [S3 DAM Integration](prd/fr-105-s3-dam-integration.md)                                        | 2025-12-18 | Implemented                                                     |
| FR-94  | [Transcription Progress State Bugs](prd/fr-94-transcription-progress-bugs.md)                 | 2025-12-16 | Implemented                                                     |
| FR-93  | [Project Name Shows Full Path on Windows](prd/fr-93-windows-project-path-display.md)          | 2025-12-16 | Pending                                                         |
| FR-92  | [Transcribe All Re-Transcribes Existing Files](prd/fr-92-transcribe-all-skip-existing.md)     | 2025-12-16 | Implemented                                                     |
| FR-89  | [Cross-Platform Path Support](prd/fr-89-cross-platform-path-support.md)                       | 2025-12-16 | Pending (Parts 1b, 2 await UAT)                                 |
| FR-80  | [Enhanced Project List & Stage Model](prd/fr-80-project-list-stage-model.md)                  | 2025-12-15 | ✓ Implemented (via FR-82)                                       |
| FR-73  | [Template Visibility Rules](prd/fr-73-template-visibility-rules.md)                           | 2025-12-15 | ✓ Implemented                                                   |
| FR-71  | [Watch Page Enhancements](prd/fr-71-watch-page-enhancements.md)                               | 2025-12-15 | ✓ Implemented                                                   |
| FR-69  | [Header Dropdown Menus](prd/fr-69-header-dropdown-menus.md)                                   | 2025-12-14 | ✓ Implemented                                                   |
| FR-54  | [Naming Template Bugs](prd/fr-54-naming-template-bugs.md)                                     | 2025-12-10 | ✓ Implemented (discovered in review)                            |
| FR-34  | [Chapter Timestamp Extraction - Phase 3](prd/chapter-extraction-spec.md)                      | 2025-12-03 | Future                                                          |
| FR-31  | [Enhanced Project View with DAM](prd/enhanced-project-view-spec.md)                           | 2025-12-02 | Future                                                          |

## Non-Functional Requirements

| ID      | Requirement                                                                       | Added      | Status                                                                                                       |
| ------- | --------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------ |
| NFR-146 | [Test Coverage Foundation](prd/nfr-146-test-coverage-foundation.md)               | 2026-03-16 | Pending                                                                                                      |
| NFR-141 | [Lenient Tag Parser (Uppercase Conversion)](prd/nfr-141-lenient-tag-parser.md)    | 2026-01-06 | ❌ **CANCELLED** - Based on incorrect scanner analysis (scanner bugs fixed, app parser validated as correct) |
| NFR-87  | [Starred Projects Visual Update](prd/nfr-87-starred-projects-visual.md)           | 2025-12-16 | Implemented                                                                                                  |
| NFR-86  | [Git Leak Detection](prd/nfr-86-git-leak-detection.md)                            | 2025-12-15 | Pending                                                                                                      |
| NFR-81  | [Project List Scanning Optimization](prd/nfr-81-project-list-optimization.md)     | 2025-12-15 | Future                                                                                                       |
| NFR-68  | [Split Query Routes into Sub-Modules](prd/nfr-68-split-query-routes.md)           | 2025-12-14 | Pending                                                                                                      |
| NFR-67  | [Standardize Server Error Handling](prd/nfr-67-standardize-error-handling.md)     | 2025-12-14 | Pending                                                                                                      |
| NFR-66  | [Consolidate TypeScript Response Types](prd/nfr-66-consolidate-response-types.md) | 2025-12-14 | Pending                                                                                                      |
| NFR-65  | [Extract Shared Server Utilities](prd/nfr-65-extract-shared-utilities.md)         | 2025-12-14 | Pending                                                                                                      |

## UX Improvements

See [ux-improvements.md](prd/ux-improvements.md) for detailed list.

**Implemented (2026-03-16):**

- I-2: Preview filename bumped to text-lg — NamingControls.tsx:320
- R-1: Already done — no brackets, Title Case format was in place
- R-2: Removed green background from safe rows — RecordingsView.tsx:864
- R-4: Already done — formatTimestamp shows HH:MM today, date otherwise
- R-5: Safe/parked toggles made more subtle (text-gray-400, lowercase) — RecordingsView.tsx:676
- P-3: Already done — "+ Add new project..." was already at bottom of table
- C-1: Already done — collapsePath applied to all paths on load
- C-2/C-3/C-4: Already done — hasChanges, "Unsaved changes" text, disabled Save

---

## Status Legend

| Status           | Meaning                     |
| ---------------- | --------------------------- |
| `Pending`        | Ready for development       |
| `With Developer` | Currently being implemented |
| `Implemented`    | Complete                    |
| `Future`         | Planned but not prioritized |

## Adding Requirements

1. Create new file: `docs/prd/fr-XX-short-name.md` or `docs/prd/nfr-XX-short-name.md`
2. Add row to appropriate table above
3. Update status as work progresses
