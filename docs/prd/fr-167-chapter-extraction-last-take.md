# FR-167 — FR-34 Chapter Extraction Anchors on the FIRST Take; David's Best Take Is the LAST

**Status: Pending — write-up only (2026-09-04), not authorised to build.**
**Class: known fragility in a shipped mechanism**, confirmed against David's stated mental
model during the 2026-09-03 mechanism review.

## The mechanism (as built)

`server/src/utils/chapterExtraction.ts:133-186` finds each chapter's start in the final-cut
SRT by TEXT-SEARCHING for the opening words of the chapter's **first take** (exact → partial →
trigram/Jaro/Dice at 0.6 threshold, with confidence scoring). There is no timestamp
arithmetic — raw-recording timestamps and final-cut timestamps are deliberately never merged.

## The fragility

David records multiple takes and **usually keeps the last one**. If take 4's opening words
differ from take 1's (they usually do — that's why there was a retake), the search degrades to
fuzzy similarity or fails outright. The ums are NOT the problem — the phrase search handles
those; the wrong-take anchor is.

## The fix shape (when approved)

Anchor on the take that actually made the cut. Options in rough order of effort: search with
ALL takes' opening phrases and take the best-scoring match; prefer the highest-sequence take
per chapter as primary anchor with earlier takes as fallback; or (with FR-170's seed data)
let the editor-side tool report which take was used. Needs David's read on which matches his
editing reality.

## Cross-references

- FR-34 spec: [chapter-extraction-spec.md](chapter-extraction-spec.md) (status: Future).
- Mechanism notes: 2026-09-03 session, `docs/kdd/learnings.md`.
