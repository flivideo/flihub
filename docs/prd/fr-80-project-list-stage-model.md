# FR-80: Enhanced Project List & Stage Model

**Status:** Pending
**Added:** 2025-12-15
**Implemented:** -

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

- [ ] Project list shows inbox/assets/chapters indicators
- [ ] Clicking indicator navigates to relevant tab
- [ ] 8-stage model implemented
- [ ] Stage auto-advances on first recording
- [ ] Stage manually selectable

## Technical Notes

**Full spec:** See `archive/completed-requirements.md` line ~635 for detailed implementation notes.

Consider NFR-81 (Project List Scanning Optimization) if this causes performance issues with many projects.

## Completion Notes

_To be filled by developer._
