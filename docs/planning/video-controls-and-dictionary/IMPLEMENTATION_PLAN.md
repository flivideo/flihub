# IMPLEMENTATION_PLAN.md — video-controls-and-dictionary

**Goal**: Unify video player controls across Watch and Recordings pages; add dictionary quick-add widget to video modals
**Started**: 2026-04-12
**Target**: B068 + B069 + B070 complete; typecheck + tests pass; no behaviour regression in Watch or Recordings modal

## Summary
- Total: 6 | Complete: 6 | In Progress: 0 | Pending: 0 | Failed: 0

---

## Wave A — Prerequisites (run first, sequential)

WU-A1 and WU-A2 must run sequentially (both touch WatchPage.tsx). WU-A3 is independent — run in parallel with WU-A1.

- [x] WU-A1 — Extract SpeedControl + PlayPauseButton shared components — Created SpeedControl.tsx (31 lines) + PlayPauseButton.tsx (21 lines). VideoPlayerModal 162→138 lines, WatchPage 1259→1224 lines. 1036 tests pass.
- [x] WU-A2 — Wire WatchPage to SizeToggle + useVideoPlayback — WatchPage 1224→1166 lines (-58). Removed local videoRef, playbackSpeed, isPlaying, handleSpeedChange, handlePlayPause, Space useEffect, speed-sync useEffect, inline size JSX. Added useVideoPlayback hook + SizeToggle. 1036 tests pass.
- [x] WU-A3 — B036 completion: read whisperModel + whisperLanguage from config — Fields already existed in types.ts + config.template.json from prior work. Added missing log line to transcriptions.ts:135. 1036 tests pass (+9 from baseline).

## Wave B — Main (run after Wave A complete)

WU-B1 and WU-B2 are parallel-safe (different files). WU-B3 depends on WU-B2.

- [x] WU-B1 — B069: VideoPlayerModal parity controls — Added onPrevious/onNext/position props, Size toggle (SizeToggle, flihub:modal:videoSize), Autoplay pill (flihub:modal:autoplay), Auto Next pill (flihub:modal:autonext). RecordingVideoModal forwards props. RecordingsView tracks previewIndex, passes nav handlers + position counter. Keyboard ArrowLeft/Right wired. 1036 tests pass.
- [x] WU-B2 — B070: DictionaryQuickAdd component + hook — Created useProjectDictionary.ts (query + 2 mutations), DictionaryQuickAdd.tsx (input + Global/Project pills, duplicate guard, sonner toasts). Re-exported from useApi.ts. PATCH endpoint confirmed: expects `{ words: string[] }`. 1036 tests pass.
- [x] WU-B3 — B070: Wire DictionaryQuickAdd into modals — Added dictionaryProps? to VideoPlayerModal (renders | + DictionaryQuickAdd when present, nothing when absent). RecordingVideoModal + IncomingVideoModal wired with useConfig + useProjectDictionary + both mutations. Full-array semantics on both add calls. 1036 tests pass.

## In Progress

## Complete

## Failed / Needs Retry

## Notes & Decisions

- WU-A3 (B036 model/language) included as a low-risk add-on to Wave A — same file, same pattern as existing binary config
- WU-A1 and WU-A2 are sequenced because both touch WatchPage.tsx — do NOT run in parallel
- WU-B2 creates the component and hook; WU-B3 wires them into the app — keep split so component is testable in isolation before wiring
- Transcripts page: no dictionary quick-add (wrong workflow moment — by the time you read a transcript, the recording is done)
- Watch page: no dictionary quick-add (Config panel is accessible from Watch; use case is Incoming/Recordings modal only)
