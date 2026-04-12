# IMPLEMENTATION_PLAN.md — Stage & Project Actions

**Goal**: Add Shelved/Remix stages, externalize Whisper config, add Transcribe All to slide-out, Safe Project Delete
**Started**: 2026-04-08
**Profile**: Development
**PRDs**: fr-149, fr-151, fr-152, backlog B036

## Summary
- Total: 4 | Complete: 4 | In Progress: 0 | Pending: 0 | Failed: 0

## Pending

## In Progress

## Complete

- [x] stage-types — Add `shelved` and `remix` to ProjectStage union + STAGE_DISPLAY. Remove `review` from DEFAULT_PROJECT_STAGES (keep in type). Update stage filter pills. FR-149. Tests: 1018 passing.
- [x] whisper-config — Add `whisperBinary`, `whisperModel`, `whisperLanguage` to Config interface + config.template.json defaults. Update transcriptions.ts to read from config instead of hardcoded constants. B036. b66 25/25 transcripts confirmed working.
- [x] transcribe-all-slideout — Add "Transcribe All" button to ProjectDrawer.tsx Quick Actions. Show when transcriptPercent < 100 and totalFiles > 0. FR-151. Button visibility + mutation tests added.
- [x] safe-delete — Server: DELETE /api/projects/:code with relay-empty + confirmation-code guards. Client: Danger Zone section in ProjectDrawer.tsx with ProjectDeleteModal. FR-152. 6 server tests added.

## Failed / Needs Retry

## Notes & Decisions

- stage-types and whisper-config are independent — run in parallel (Wave A)
- transcribe-all-slideout and safe-delete BOTH touch ProjectDrawer.tsx — run sequentially (Wave B), transcribe-all first
- safe-delete server endpoint can be in server/src/routes/projects.ts (existing file) or a new routes/delete.ts — agent's call
- For stage-types: `review` stays in the ProjectStage union for backward compat but is removed from DEFAULT_PROJECT_STAGES array. Any project with stage='review' should still render correctly.
- For shelved: muted red — use `bg-red-100 text-red-700` (consistent with warm linen semantic pattern)
- For remix: rose/coral — use `bg-rose-100 text-rose-700`
- Whisper config defaults: binary=`~/.pyenv/shims/mlx_whisper`, model=`mlx-community/whisper-large-v3-turbo`, language=`en`
- safe-delete: confirmation requires typing exact project code. No undo. Relay must be empty. Server deletes local dir, emits projects:changed.
