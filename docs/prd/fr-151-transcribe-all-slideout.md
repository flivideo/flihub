# FR-151: Transcribe All Button in Project Slide-out Panel

**Date:** 2026-04-08  
**Status:** Pending

---

## Background

The project slide-out panel (opened by clicking a project row in the Projects list) shows stats, a progress checklist, health assessment, and Quick Actions. Current Quick Actions: "Open in Finder" and "Copy Transcript".

When a project has recordings but no transcripts (0% transcripts), there's no way to kick off transcription from this panel. The user has to navigate to the project, go to Recordings or Manage, and trigger it from there.

**Observed:** B66 context-engineered-html-art had 25 recordings and 0% transcripts with no action available in the panel.

---

## Requirement

Add a **"Transcribe All"** button to the Quick Actions section of the project slide-out panel.

### Display conditions

| Condition | Show button? |
|-----------|-------------|
| Project has recordings AND transcripts% < 100% | Yes |
| Project has no recordings | No |
| Project has recordings AND transcripts% = 100% | No |

When transcripts are at 100%, replace with a disabled/greyed "All Transcribed ✓" indicator (or simply hide the button).

### Behaviour on click

1. Switch the active project to this project (required — transcription queue uses the active project config)
2. Call `POST /api/transcriptions/queue-all` with `{ scope: 'project' }`
3. Show a brief inline confirmation: "Queued N files" (same feedback pattern as the Recordings page)
4. Button becomes disabled/loading while queuing

### Note on project switching

The transcription route derives the output directory from the video path (FR-109), so it's safe to queue transcriptions for a non-active project. Step 1 (switching active project) may not be strictly required — verify during implementation.

---

## Files to Change

| File | Change |
|------|--------|
| `client/src/components/ProjectSlideOut.tsx` (or equivalent) | Add Transcribe All button to Quick Actions section |
| Possibly `client/src/hooks/useApi.ts` | Add hook for `queue-all` if not already exposed |

---

## Acceptance Criteria

- [ ] "Transcribe All" button appears in slide-out Quick Actions when transcripts% < 100% and recordings > 0
- [ ] Clicking it queues all untranscribed recordings for that project
- [ ] Button shows count of queued files after clicking
- [ ] Button is hidden when transcripts are already at 100%
- [ ] Works without navigating away from the Projects page
