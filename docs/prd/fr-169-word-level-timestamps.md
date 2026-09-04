# FR-169 — Transcribe with Word-Level Timestamps (`--word-timestamps True`)

**Status: Pending — write-up only (2026-09-04), not authorised to build.**
**Class: small change, and the BLOCKER for FR-170 / FliCut's FC-30.**

## The corrected fact (measured, not assumed)

FliHub's transcripts exist in three forms (`.txt`/`.srt`/`.json` in
`recording-transcripts/`), but the JSON is Whisper **SEGMENT-level only**:
`segments[].{start,end,text,tokens,…}` with **no `words` key** — measured by flicut-dev
across all 13 of d02's JSON files (0 words total). An earlier report from this session
described the JSON as carrying word-level timestamps; that was wrong — a structure that
*could* hold words was described as one that *does*. (Same failure shape as
`transcriptionQueued:true`, FR-166.)

## The fix

MLX Whisper supports it already — same tool, one flag: `--word-timestamps True`. Add it to
the transcription invocation (`server/src/routes/transcriptions.ts` / the MLX runner), so
`segments[].words[] = {word, start, end, probability}` appears in the JSON. That is exactly
the shape FliCut's `transcriber.ts` / `wordsFromWhisper` consumes.

Existing transcripts stay segment-level until re-transcribed; FR-170's export must therefore
report per-take whether words are present rather than assume.

## The dictionary gap (found by flicut-dev, neither side had it)

FliCut feeds its term dictionary to ASR as a prompt (currently: AppyDave, Arcana, Kybernesis).
A transcript produced by FliHub WITHOUT that dictionary silently loses those corrections — so
"pass the transcript across" is not free. FliHub has its own dictionary machinery
(`glingDictionary` global + per-project dictionary, B066/B067); the two vocabularies need to
be reconciled or at least both applied at transcription time. This belongs in this ticket
because it changes what a "good enough to hand over" transcript is.

## Cross-references

- FliCut half: **FC-30 (P2)** in the flicut repo — explicitly blocked on this ticket.
- FR-170 (the export this unblocks): [fr-170-chapter-seed-export.md](fr-170-chapter-seed-export.md)
