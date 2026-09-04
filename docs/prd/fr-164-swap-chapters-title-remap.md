# FR-164 — Swap-Chapters Must Remap FR-157 Chapter Titles

**Status: Pending — write-up only (2026-09-04), not authorised to build.**
**Class: defect, latent (unhit so far).** Found during 2026-09-03 archaeology; first logged in
commit `977d586` and the held queue of
[requirements-archaeology-2026-09.md](../rebuild-2026/requirements-archaeology-2026-09.md).

## The defect

`POST /api/manage/swap-chapters` (FR-140, `server/src/routes/manage.ts`) remaps recordings,
transcripts, and per-recording state keys when two chapters trade numbers — but not
`.flihub-state.json` → `chapters["NN"].title` (FR-157). The title stays glued to the chapter
NUMBER while the content swaps beneath it: after swapping ch02↔ch05, both titles label the
wrong videos.

## Why it exists

FR-140 predates FR-157; nothing reconciled them when titles landed (2026-09-03). The state
helpers are in `server/src/utils/projectState.ts` (`setChapterTitle`, `getChapterTitles`,
`normaliseChapterKey`).

## The fix shape (when approved)

Inside the swap operation, swap the two `chapters["NN"]` entries in the same
`writeProjectState` call that migrates the recording flags. Same audit applies to
`split-chapter` and `rename-chapter` (a chapter renumber strands its title identically —
verify each caller of `renameRecording` that changes the chapter component).

## Cross-references

- FR-157 PRD: [fr-157-project-and-chapter-titles.md](fr-157-project-and-chapter-titles.md)
- Held-queue entry: "swap-chapters/FR-157 title remap" in the archaeology doc.
