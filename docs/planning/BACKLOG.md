# Project Backlog — FliHub

**Last updated**: 2026-03-16
**Project Heal**: Initial BACKLOG.md created from full history consolidation
**Total open**: 17 | Pending: 8 | Deferred: 7 | Rejected: 2

---

## Pending

- [ ] B017 — Test Coverage Foundation (NFR-146) | Priority: **high** | PRD: `docs/prd/nfr-146-test-coverage-foundation.md`
- [ ] B001 — Dual Transcription System with Progress Tracking (FR-132) | Priority: medium | PRD: `docs/prd/fr-132-dual-transcription-progress.md`
- [ ] B013 — Extract Shared Server Utilities (NFR-65) | Priority: medium | Note: overlaps with B017 — `extractBrand`, `stripSrt` must be exported before unit tests work
- [ ] B010 — Split Query Routes into Sub-Modules (NFR-68) | Priority: low | PRD: `docs/prd/nfr-68-split-query-routes.md`
- [ ] B011 — Standardize Server Error Handling (NFR-67) | Priority: low | PRD: `docs/prd/nfr-67-standardize-error-handling.md`
- [ ] B012 — Consolidate TypeScript Response Types (NFR-66) | Priority: low | PRD: `docs/prd/nfr-66-consolidate-response-types.md`
- [ ] B014 — Chapter Tools: Move, Swap, Undo (FR-135) | Priority: low | PRD ready, no user demand yet | PRD: `docs/prd/fr-135-chapter-tools.md`
- [ ] B003 — Transcript Quick Access Phases 2-3 (FR-114) | Priority: low | Phase 1 complete; phases 2-3 not started | PRD: `docs/prd/fr-114-transcript-quick-access.md`

## Deferred

- [-] B015 — Inconsistency Detection & Auto-Fix (FR-134) | Reason: PRD ready, no user demand | PRD: `docs/prd/fr-134-inconsistency-detection.md`
- [-] B016 — File Status Indicators (FR-133) | Reason: PRD ready, no user demand | PRD: `docs/prd/fr-133-file-status-indicators.md`
- [-] B002 — Manage Panel Bulk Rename Phase 2 (FR-131) | Reason: likely superseded by FR-136/141 toolchain — confirm before resuming | PRD: `docs/prd/fr-131-manage-panel-bulk-rename.md`
- [-] B004 — Project Name Shows Full Path on Windows (FR-93) | Reason: WSL/Windows-only, no activity since 2025-12-16 | PRD: `docs/prd/fr-93-windows-project-path-display.md`
- [-] B005 — Cross-Platform Path Support Parts 1b/2 (FR-89) | Reason: WSL-related, no activity since 2025-12-16; Mac-only primary workflow | PRD: `docs/prd/fr-89-cross-platform-path-support.md`
- [-] B008 — Git Leak Detection (NFR-86) | Reason: no activity since 2025-12-15, lower priority than test coverage | PRD: `docs/prd/nfr-86-git-leak-detection.md`
- [-] B009 — Project List Scanning Optimization (NFR-81) | Reason: future, no urgency | PRD: `docs/prd/nfr-81-project-list-optimization.md`

## Rejected / Cancelled

- [r] NFR-141 — Lenient Tag Parser | Reason: cancelled 2026-01-06 — based on incorrect scanner analysis. App parser validated as correct.
- [r] B006 — Chapter Timestamp Extraction Phase 3 (FR-34) | Reason: marked Future with no roadmap; superseded by current chapter workflow | PRD: `docs/prd/chapter-extraction-spec.md`

## Done

The following items shipped successfully. Full completion notes are in each PRD file.

| ID | Title | Shipped |
|----|-------|---------|
| FR-145 | Escape Key Closes Video Preview Modal | 2026-03-16 |
| FR-144 | Send Transcript to POEM WUI / AWB | 2026-03-16 |
| FR-143 | SRT Clipboard Copy Button | 2026-02-24 |
| FR-142 | Split Export/S3 Tool | 2026-02-18 |
| FR-141 | Export & S3 Workflow Overhaul | 2026-02-16 |
| FR-140 | Chapter Move & Cascade Renumbering | 2026-01-06 |
| FR-139 | Folders Tool (stub/removed from Manage panel) | 2026-01-06 |
| FR-138 | Rename Tool Specification | 2026-01-06 |
| FR-137 | SlideOutDrawer Tool Pattern | 2026-01-06 |
| FR-136 | Tool-Oriented Manage Panel | 2026-01-04 |
| FR-130 | Simplify Rename Logic | 2026-01-03 |
| FR-128 | Recording Quick Preview | 2026-01-03 |
| FR-127 | Developer Drawer | 2026-01-02 |
| FR-126 | Edit Folder Manifest & Cleanup | 2026-01-02 |
| FR-125 | Config & EditPrep Consolidation | 2026-01-02 |
| FR-124 | Export Panel Enhancements (superseded by FR-141) | 2026-01-02 |
| FR-123 | Watch Panel Enhancements | 2026-01-02 |
| FR-122 | Export Panel (superseded by FR-141) | 2026-01-02 |
| FR-121 | Parked State in Watch Panel | 2026-01-02 |
| FR-120 | Parked Recording State | 2026-01-02 |
| FR-119 | API Documentation & Testing Page | 2025-12-31 |
| FR-118 | Project-Specific Gling Dictionary | 2025-12-31 |
| FR-117 | Hover UX Improvements | 2025-12-30 |
| FR-116 | Incoming Page Quick Config Access | 2025-12-30 |
| FR-115 | Chapter Context Panel | 2025-12-30 |
| FR-114 Phase 1 | Transcript Quick Access (Phase 1) | 2025-12-30 |
| FR-113 | Edit Prep Path Fix & Folder Restructure | 2025-12-27 |
| FR-112 | Sequential Chapter Increment | 2025-12-26 |
| FR-111 | Safe Architecture Rework | 2025-12-26 |
| FR-110 | Project Stage Persistence & Dropdown | 2025-12-26 |
| FR-109 | Transcript Management Bugs | 2025-12-26 |
| FR-108 | Gling Dictionary Not Saving | 2025-12-25 |
| FR-107 | Chapter Input Auto-Focus & Glow | 2025-12-23 |
| FR-106 | Incoming Video Preview | 2025-12-19 |
| FR-105 | S3 DAM Integration | 2025-12-18 |
| FR-94 | Transcription Progress State Bugs | 2025-12-16 |
| FR-92 | Transcribe All Skip Existing | 2025-12-16 |
| FR-80 | Enhanced Project List & Stage Model | 2025-12-15 |
| FR-73 | Template Visibility Rules | 2025-12-15 |
| FR-71 | Watch Page Enhancements | 2025-12-15 |
| FR-69 | Header Dropdown Menus | 2025-12-14 |
| FR-54 | Naming Template Bugs | 2025-12-10 |
| NFR-87 | Starred Projects Visual Update | 2025-12-16 |

---

## Notes

- B017 (NFR-146) should be done before B001 (FR-132) — the test infrastructure needs to be trustworthy before adding complex new features
- B013 (NFR-65) is a prerequisite for B017 — some functions need to be exported before they can be unit tested
- B002 (FR-131 Phase 2) should be reviewed against current ManagePanel implementation before resuming — the FR-136/141 toolchain may have made it obsolete
- WSL/Windows items (B004, B005) have no near-term champion — defer indefinitely unless a Windows user is actively using the app
