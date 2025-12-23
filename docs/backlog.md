# Backlog

Requirements index for FliHub.

**Archive:** Completed items moved to `archive/completed-requirements.md`

---

## Functional Requirements

| ID | Requirement | Added | Status |
|----|-------------|-------|--------|
| FR-106 | [Incoming Video Preview](prd/fr-106-incoming-video-preview.md) | 2025-12-19 | Implemented |
| FR-105 | [S3 DAM Integration](prd/fr-105-s3-dam-integration.md) | 2025-12-18 | Implemented |
| FR-94 | [Transcription Progress State Bugs](prd/fr-94-transcription-progress-bugs.md) | 2025-12-16 | Implemented |
| FR-93 | [Project Name Shows Full Path on Windows](prd/fr-93-windows-project-path-display.md) | 2025-12-16 | Pending |
| FR-92 | [Transcribe All Re-Transcribes Existing Files](prd/fr-92-transcribe-all-skip-existing.md) | 2025-12-16 | Implemented |
| FR-89 | [Cross-Platform Path Support](prd/fr-89-cross-platform-path-support.md) | 2025-12-16 | Pending (Parts 1b, 2 await UAT) |
| FR-80 | [Enhanced Project List & Stage Model](prd/fr-80-project-list-stage-model.md) | 2025-12-15 | Pending |
| FR-73 | [Template Visibility Rules](prd/fr-73-template-visibility-rules.md) | 2025-12-15 | Pending |
| FR-71 | [Watch Page Enhancements](prd/fr-71-watch-page-enhancements.md) | 2025-12-15 | Pending |
| FR-69 | [Header Dropdown Menus](prd/fr-69-header-dropdown-menus.md) | 2025-12-14 | Pending |
| FR-54 | [Naming Template Bugs](prd/fr-54-naming-template-bugs.md) | 2025-12-10 | Pending |
| FR-34 | [Chapter Timestamp Extraction - Phase 3](prd/chapter-extraction-spec.md) | 2025-12-03 | Future |
| FR-31 | [Enhanced Project View with DAM](prd/enhanced-project-view-spec.md) | 2025-12-02 | Future |

## Non-Functional Requirements

| ID | Requirement | Added | Status |
|----|-------------|-------|--------|
| NFR-87 | [Starred Projects Visual Update](prd/nfr-87-starred-projects-visual.md) | 2025-12-16 | Implemented |
| NFR-86 | [Git Leak Detection](prd/nfr-86-git-leak-detection.md) | 2025-12-15 | Pending |
| NFR-81 | [Project List Scanning Optimization](prd/nfr-81-project-list-optimization.md) | 2025-12-15 | Future |
| NFR-68 | [Split Query Routes into Sub-Modules](prd/nfr-68-split-query-routes.md) | 2025-12-14 | Pending |
| NFR-67 | [Standardize Server Error Handling](prd/nfr-67-standardize-error-handling.md) | 2025-12-14 | Pending |
| NFR-66 | [Consolidate TypeScript Response Types](prd/nfr-66-consolidate-response-types.md) | 2025-12-14 | Pending |
| NFR-65 | [Extract Shared Server Utilities](prd/nfr-65-extract-shared-utilities.md) | 2025-12-14 | Pending |

## UX Improvements

See [ux-improvements.md](prd/ux-improvements.md) for detailed list.

**Selected items pending:**
- I-2: More prominent preview filename
- R-1: Cleaner chapter heading format
- R-2: Less repetitive safe indicators
- R-4: Add time for same-day files
- R-5: Smaller/subtler toggle buttons
- P-3: Alternative "New Project" placement
- C-1 through C-4: Config page improvements

---

## Status Legend

| Status | Meaning |
|--------|---------|
| `Pending` | Ready for development |
| `Implemented` | Complete |
| `Future` | Planned but not prioritized |

## Adding Requirements

1. Create new file: `docs/prd/fr-XX-short-name.md` or `docs/prd/nfr-XX-short-name.md`
2. Add row to appropriate table above
3. Update status as work progresses
