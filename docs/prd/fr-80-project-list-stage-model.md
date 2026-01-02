# FR-80: Enhanced Project List & Stage Model

**Status:** Implemented (via FR-82)
**Added:** 2025-12-15
**Implemented:** 2025-12-15 (discovered in review 2026-01-01)

---

## User Story

As a user, I want to see at-a-glance which projects have inbox files, assets, and chapter videos, and I want stage values that reflect my actual video production workflow.

## Problem

1. Project list doesn't show content indicators
2. Current stage model doesn't match actual video production workflow

## Solution

### Part 1: Project List Indicators

| Indicator | Shows | Click Action |
|-----------|-------|--------------|
| Inbox | Has files in `inbox/` | Navigate to Inbox tab |
| Assets | Has files in `assets/images/` | Navigate to Assets tab |
| Chapters | Has files in `recordings/-chapters/` | Navigate to Watch tab |

### Part 2: 8-Stage Model

| Stage | When |
|-------|------|
| `planning` | Project created (default) |
| `recording` | First recording added (auto) |
| `first-edit` | Done recording, doing Gling cuts |
| `second-edit` | Sent to Jan for graphics |
| `review` | Jan done, user reviewing |
| `ready-to-publish` | Signed off, needs publishing |
| `published` | On YouTube |
| `archived` | On NAS, completely done |

## Acceptance Criteria

- [x] Project list shows inbox/assets/chapters indicators
- [x] Clicking indicator navigates to relevant tab
- [x] 8-stage model implemented
- [x] Stage auto-advances on first recording
- [x] Stage manually selectable

## Technical Notes

**Full spec:** See `archive/completed-requirements.md` line ~635 for detailed implementation notes.

Consider NFR-81 (Project List Scanning Optimization) if this causes performance issues with many projects.

## Completion Notes

**Discovered 2026-01-01:** Code review revealed FR-80 was implemented as part of FR-82: Project List UX Fixes.

**What was built:**
1. **Project List Indicators** - InboxIndicator, AssetsIndicator, ChaptersIndicator components
   - Show counts on hover (e.g., "Inbox - 3 items")
   - Click navigates to relevant tab
   - Empty indicators show blank (not faded)

2. **8-Stage Model** - STAGE_DISPLAY config in ProjectsPanel.tsx
   - planning, recording, first-edit, second-edit, review, ready-to-publish, published, archived
   - Stage badges with colors and descriptions
   - Dropdown for manual stage changes
   - Auto-advances to "recording" on first recording

**Evidence:**
- `client/src/components/ProjectsPanel.tsx` has `// FR-80: Stage display config` comment
- All indicator components implemented with click handlers
- StageCell component with dropdown

**Files:**
- `client/src/components/ProjectsPanel.tsx` - Indicators and stage components
- `server/src/utils/projectStats.ts` - inboxCount, chapterVideoCount fields
- `shared/types.ts` - Type definitions

**See also:** FR-82 changelog entry for implementation details.
