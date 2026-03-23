# Project Backlog — FliHub

**Last updated**: 2026-03-23
**Project Heal**: Initial BACKLOG.md created from full history consolidation
**Total open**: 12 | Pending: 10 | In Progress: 1 | Deferred: 5 | Rejected: 4

---

## Pending

## Must Fix Before Major Feature (from 3-lens audit 2026-03-19)

- [x] B024 — Replace hardcoded PROJECTS_ROOT with `getConfig().projectsRootDirectory` | Priority: **blocker** | In 7+ files: routes/projects.ts, routes/transcriptions.ts, routes/state.ts, routes/query/projects.ts, routes/query/transcripts.ts, routes/video.ts, utils/projectResolver.ts, routes/index.ts | Audit: code-quality BLOCKER + architecture CRITICAL
- [x] B025 — Make `writeProjectState` atomic (write to .tmp then fs.rename) | Priority: **blocker** | 3-line change. Crash mid-write currently corrupts all safe/parked/annotation flags | Audit: code-quality MAJOR
- [x] B026 — Normalize config access — all route factories use `() => getConfig()` getter; replace `Object.assign` bypass in projects.ts + chapters.ts with `updateConfig` | Priority: **blocker** | Audit: architecture CRITICAL + code-quality MAJOR
- [x] B027 — Add chapter 99 existence check before swap-chapters | Priority: high | Swap uses ch99 as temp staging; silently clobbers real ch99 content | Audit: code-quality MAJOR

## Test Coverage Gaps (high regression risk — from test-quality audit 2026-03-19)

- [x] B028 — Test `renameRecording()` orchestration | Completed: test-coverage-gaps-2 | +8 tests
- [x] B029 — Test `extractChapters()` matching logic | Completed: test-coverage-gaps-2 | +25 tests, 3 exports added
- [x] B030 — Test `client/src/utils/srt.ts` | Completed: test-coverage-gaps-2 | +29 tests
- [x] B031 — Test `editManifest.ts` | Completed: test-coverage-gaps-2 | +24 tests
- [x] B032 — Test `shared/naming.ts` missing functions (parseImageFilename, buildImageFilename, findNextSequence, calculateSuggestedNaming) | Priority: medium | Completed: tech-debt-round1 | +42 tests

## Structural Debt (from architecture + code-quality audits 2026-03-19)

- [ ] B033 — Extract transcription queue state into a class (remove module-level mutable globals) | Priority: medium | queue/activeJob/recentJobs/activeProcess as module globals; no concurrency protection; untestable as singleton | Audit: code-quality MAJOR + architecture CRITICAL
- [ ] B034 — Fix asyncHandler — wrap all routes or remove and document Express 5 contract | Priority: medium | asyncHandler defined but never used; error response format inconsistent across routes | Audit: code-quality MAJOR
- [ ] B035 — Add React error boundary around tab components in App.tsx | Priority: medium | Render crash in any tab blanks entire SPA | Audit: code-quality
- [ ] B036 — Replace hardcoded WHISPER_BINARY path with config value | Priority: medium | Points to pyenv 3.14.3 — breaks on any other machine or Python upgrade | Audit: code-quality
- [ ] B037 — Remove `[FR-89 DEBUG]` console.log statements from production routes/index.ts | Priority: low | Debug logs from Jan 2026 still in production path | Audit: code-quality

---

## Feature Backlog

- [x] B041 — Manage page redesign — rethink "Manage & Export" as context-sensitive tool pages, not a generic shell with drawers | Priority: high | Feedback: F002, F003 | Completed: manage-page-redesign
- [x] B042 — Remove Regen Chapters from ToolsSidebar (temporary system, no longer useful) | Priority: medium | Feedback: F001 | Completed: pre-campaign quick fix
- [x] B043 — Type relay API responses and add HTTP status checking in hooks (audit M1, M2, M4) | Priority: medium | Completed: tech-debt-round1 | 7 response types + HTTP status checks on all 7 hooks
- [ ] B044 — Sync Hub — two-channel push/pull for app code + video projects with dirty-state notifications | Priority: high | Feedback: F004 | Scope: (1) App code sync: David pushes FliHub repo, collaborators get notified + one-click pull + server restart. (2) Video project sync: David pushes project recordings via git, collaborators pull. Both directions show dirty/clean state and notify the other side. Replaces manual terminal git commands. | UX requirements: (a) Persistent header indicator visible on ALL pages — colour-coded status dots for each channel (green=clean, amber=behind, red=dirty). Not flashing but always visible so you know at a glance without navigating to Sync page. (b) Conflict handling — detect merge conflicts on pull, show clear resolution UI (accept theirs / accept mine / open in editor). Low frequency but must not fail silently. (c) Mockup: `.mochaccino/designs/sync-hub/index.html`
- [x] B045 — Move AWB from top nav into Manage sidebar | Priority: medium | Feedback: F005 | Completed: tech-debt-round1
- [x] B046 — Relay UX redesign — workflow lanes, file drawers, activity feed, toasts, setup guide, project-list indicators | Priority: high | Campaign: relay-redesign | Completed: relay-redesign

- [ ] B001 — Dual Transcription System with Progress Tracking (FR-132) | Priority: medium | PRD: `docs/prd/fr-132-dual-transcription-progress.md`
- [ ] B010 — Split Query Routes into Sub-Modules (NFR-68) | Priority: low | PRD: `docs/prd/nfr-68-split-query-routes.md`
- [ ] B011 — Standardize Server Error Handling (NFR-67) | Priority: low | PRD: `docs/prd/nfr-67-standardize-error-handling.md`
- [ ] B012 — Consolidate TypeScript Response Types (NFR-66) | Priority: low | PRD: `docs/prd/nfr-66-consolidate-response-types.md`
- [ ] B014 — Chapter Tools: Move, Swap, Undo (FR-135) | Priority: low | PRD ready, no user demand yet | PRD: `docs/prd/fr-135-chapter-tools.md`
- [ ] B003 — Transcript Quick Access Phases 2-3 (FR-114) | Priority: low | Phase 1 complete; phases 2-3 not started | PRD: `docs/prd/fr-114-transcript-quick-access.md`
- [ ] B020 — React Hook Tests (useSocket.ts + domain useApi hooks) | Priority: low | Suggested by nfr-146 + nfr-architecture-refactor assessments; useApi.ts now partitioned making this feasible
- [ ] B021 — Playwright E2E: Recording Rename Flow | Priority: low | Suggested by nfr-146 assessment; highest-value E2E scenario not covered by unit tests
- [ ] B022 — Run vitest --coverage and document real coverage baselines | Priority: low | Suggested by nfr-code-quality-1 assessment; thresholds are floors not targets, actual % unknown
- [ ] B023 — Replace server/src/test/sample.test.ts placeholder | Priority: low | Discovered 2026-03-19; still contains 1+1=2 smoke test — replace with real server smoke test

## Deferred

- [-] B015 — Inconsistency Detection & Auto-Fix (FR-134) | Reason: PRD ready, no user demand | PRD: `docs/prd/fr-134-inconsistency-detection.md`
- [-] B016 — File Status Indicators (FR-133) | Reason: PRD ready, no user demand | PRD: `docs/prd/fr-133-file-status-indicators.md`
- [-] B002 — Manage Panel Regen Toolbar + Chapter Rename (FR-131 Phase 2) | Reason: UI approach needs updating to SlideOutDrawer pattern (FR-137) before building — the feature (regen shadows/transcripts/chapters buttons + chapter-level rename) is still valid but the original toolbar mockup is obsolete. Reassess when needed.
- [r] B004 — Project Name Shows Full Path on Windows (FR-93) | Reason: all users now on Mac — Windows/WSL workflow retired
- [r] B005 — Cross-Platform Path Support Parts 1b/2 (FR-89) | Reason: all users now on Mac — Windows/WSL workflow retired
- [-] B008 — Git Leak Detection (NFR-86) | Reason: no activity since 2025-12-15, lower priority than test coverage | PRD: `docs/prd/nfr-86-git-leak-detection.md`
- [-] B009 — Project List Scanning Optimization (NFR-81) | Reason: future, no urgency | PRD: `docs/prd/nfr-81-project-list-optimization.md`

## Rejected / Cancelled

- [r] NFR-141 — Lenient Tag Parser | Reason: cancelled 2026-01-06 — based on incorrect scanner analysis. App parser validated as correct.
- [r] B006 — Chapter Timestamp Extraction Phase 3 (FR-34) | Reason: marked Future with no roadmap; superseded by current chapter workflow | PRD: `docs/prd/chapter-extraction-spec.md`

## Done

The following items shipped successfully. Full completion notes are in each PRD file.

| ID | Title | Shipped |
|----|-------|---------|
| B045 | Move AWB from top nav into Manage sidebar (tech-debt-round1). Removed from ViewTab/VALID_TABS, added as Manage tool. F005 resolved. | 2026-03-23 |
| B043 | Type relay API responses (tech-debt-round1). 7 response type interfaces + HTTP status checks on all 7 hooks. | 2026-03-23 |
| B032 | Test shared/naming.ts missing functions (tech-debt-round1). +42 tests for parseImageFilename, buildImageFilename, findNextSequence, calculateSuggestedNaming. | 2026-03-23 |
| B041 | Manage page redesign (manage-page-redesign) — context-sensitive tool pages, drawers eliminated, sidebar as pure navigation. 3/3 complete. Feedback F002+F003 resolved. | 2026-03-23 |
| B040 | Manage + Relay Refactor Wave 2 (manage-relay-refactor-w2) — relay folder browser, subfolder-aware push/collect, promote-to-final, role-based visibility, visual indicators. 6/6 complete. 842 tests. | 2026-03-22 |
| B039 | Manage + Relay Refactor Wave 1 (manage-relay-refactor) — security fixes (execFile), route guards, machineRole, layout refactor, retire S3, 48 relay tests. 6/6 complete. | 2026-03-22 |
| B038 | Relay Collaboration Phase 1 (relay-collaboration-phase-1) — push/collect/preview + git sync, 5/5 work units | 2026-03-19 |
| B019 | Architecture Refactor (nfr-architecture-refactor) — configManager, s3Utils, poemWuiUtils extracted; useApi.ts barrel; fs-extra unified | 2026-03-16 |
| B018 | Code Quality Round 1 (nfr-code-quality-1) — srtUtils extracted, path traversal fixed, isPathWithinProject tested, 24 new tests | 2026-03-16 |
| B013 / NFR-65 | Extract Shared Server Utilities — absorbed and completed by B019 (nfr-architecture-refactor) | 2026-03-16 |
| B017 / NFR-146 | Test Coverage Foundation — 3 placeholders → 331 real tests (verified 2026-03-19) | 2026-03-16 |
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
