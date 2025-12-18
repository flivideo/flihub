# FR-71: Watch Page Enhancements

**Status:** Pending
**Added:** 2025-12-15
**Implemented:** -

---

## User Story

As a user, I want the Watch page to auto-select the most recent recording, default to 2x playback speed, and have a larger video player.

## Problem

Current Watch page requires manual selection and has suboptimal default settings for review workflow.

## Solution

Enhance Watch page with smart defaults and better video player controls.

## Requirements

| # | Requirement | Priority |
|---|-------------|----------|
| 1 | Auto-select last recording on page load | High |
| 2 | Default playback speed to 2x | High |
| 3 | Custom speed control with presets (1x, 1.5x, 2x, 2.5x, 3x, 4x) | Medium |
| 4 | Video size toggle (Normal / Large / Extra Large) | Medium |
| 5 | Transcript panel below video | High |
| 6 | Persist preferences in localStorage | Low |

## Acceptance Criteria

- [ ] Most recent recording auto-selected on page load
- [ ] Playback defaults to 2x speed
- [ ] Speed control shows preset options
- [ ] Video size can be toggled
- [ ] Transcript displays below video
- [ ] User preferences persist across sessions

## Technical Notes

**Full spec:** See `archive/completed-requirements.md` line ~1573 for detailed implementation notes.

localStorage keys to use:
- `flihub.watch.playbackSpeed`
- `flihub.watch.videoSize`

## Completion Notes

_To be filled by developer._
