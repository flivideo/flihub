# FR-166 — Bulk-Rename Response Claims `transcriptionQueued: true` When Nothing Was Queued

**Status: Pending — write-up only (2026-09-04), not authorised to build.**
**Class: defect, OBSERVED live** (2026-09-04, during the d02 outro rename): the transcript
already existed, `queueTranscription` correctly skipped, and the response still said
`transcriptionQueued: true`.

## Why this matters more than its size

Same class as the FR-159 veto bug that cost four days of missing transcripts (see CLAUDE.md
"Operating Rules"): **success and no-op are indistinguishable to the caller.** A refusal that
looks like success is a defect even when refusing is correct. FR-159's `/queue` endpoint is
the reference fix — it returns a `reason` on skip.

## The fix shape (when approved)

`POST /api/manage/bulk-rename` (`server/src/routes/manage.ts`): thread the actual outcome of
the queue attempt into the response — `transcriptionQueued: false, reason: 'transcript
already exists'` — and let the client toast say "renamed, transcript kept" instead of
implying re-transcription.

## Cross-references

- FR-159 reference implementation: `server/src/routes/transcriptions.ts` (`/queue` skip
  reasons).
- Logged as a caveat in the flivideo plugin flihub skill (2026-09-04) and in the archaeology
  held queue ("bulk-rename transcriptionQueued flag").
