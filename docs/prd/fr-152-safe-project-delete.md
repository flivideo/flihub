# FR-152: Safe Project Delete

**Date:** 2026-04-08  
**Status:** Pending

---

## Background

Some projects are genuinely abandoned with minimal content (e.g. B67 vam-s3-staging — 2 recordings, never progressed). These aren't worth archiving to T7; they should simply be deleted. No current mechanism exists for this.

The risk is high: accidentally deleting the wrong project would be unrecoverable. The feature must have strong guardrails.

---

## Requirement

Add a **Delete Project** action that permanently removes a project's local directory.

### Where it appears

- In the project slide-out panel, under a "Danger Zone" section (visually separated, below all other actions)
- Optionally accessible from a project row context menu (future — not this FR)

### Pre-delete checks (all must pass)

| Check | Failure message |
|-------|----------------|
| Relay folder is empty (no files to push) | "Relay has files — push or clear relay before deleting" |
| No active transcription jobs for this project | "Transcription in progress — wait for it to complete" |
| T7 SSD holding copy exists (optional safety net) | Warning only: "No T7 backup exists — this is your only copy" (not a block, but shown prominently) |

### Confirmation flow

1. User clicks "Delete Project"
2. Modal opens showing:
   - Project name and code in large text
   - File count and total disk size being deleted
   - Warning if no T7 backup exists
   - "Type the project code to confirm" input field
3. User types the exact project code (e.g. `b67-vam-s3-staging`)
4. Delete button activates only when input matches exactly
5. On confirm: delete local project directory, emit `projects:changed` socket event

### What gets deleted

The entire project directory (e.g. `~/dev/video-projects/v-appydave/b67-vam-s3-staging/`) including all recordings, transcripts, assets, shadows, chapters.

**Does not delete:** Any T7 holding copy (if one exists, it remains untouched).

### No undo

This action is permanent. The confirmation copy must make this explicit: "This cannot be undone."

---

## Files to Change

| File | Change |
|------|--------|
| `server/src/routes/` | New `DELETE /api/projects/:code/local` endpoint (or reuse hold.ts delete-local if scoped correctly) |
| `client/src/components/ProjectSlideOut.tsx` | Add Danger Zone section with Delete button + confirmation modal |

---

## Acceptance Criteria

- [ ] Delete option appears in project slide-out under clearly labelled Danger Zone
- [ ] Pre-checks run before modal opens — relay and transcription checks
- [ ] Confirmation modal shows project name, file count, disk size
- [ ] Delete button only activates when project code typed correctly
- [ ] "No T7 backup" warning shown prominently when applicable
- [ ] Project directory is removed on confirm
- [ ] Projects list updates immediately after deletion
- [ ] Error shown (not crash) if delete fails (permissions, in use, etc.)
