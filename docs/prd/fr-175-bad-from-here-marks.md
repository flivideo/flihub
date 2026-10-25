# FR-175: "Bad from here" Marks: Telling FliCut What Was Decided at Review

**Status**: IDEA, banked (David, 2026-10-25). Not authorised to build. Paired with FliCut **FC-48**.
**Added**: 2026-10-25
**Cross-app**: FliHub captures the mark; FliCut uses it. Neither app owns this kind of knowledge today.

---

## The rule this idea keeps

**Nothing is cut in FliHub.** A mark here *says where bad material is*. FliCut still does the cutting.
David: "it's not an instruction to cut anything off. It's an instruction to say where bad stuff is."

## The live case (D12, 2026-10-25)

- `04-4-ai-slop-team.mov` (49 s). In Transcript Sync, David highlighted **"and"** in "…we'll play both sides **and** we
  can go through the different foundations…". From there on, background noise ruins the take. In the word transcript
  (`hub/transcripts/04-4-ai-slop-team.json`) that word is #130 and **starts at 35.52 s**. He wants nothing from that
  word onward.
- `04-5-ai-slop-team.mov` is the retake. It opens with "So I've turned **off** the audio…", which is exactly the
  section 04-4 lost, so 04-5 picks up where 04-4's good part ends.
- Screenshots: `docs/prd/assets/fr-175/04-4-mark-from-and.png`, `docs/prd/assets/fr-175/04-5-retake.png`.

FliCut would probably get this right on its own (noise, retake detection). But it can't know what David **already
decided** while reviewing in FliHub, and that decision is the most reliable signal there is.

## What's wanted

1. In the FliHub player's Transcript Sync, pick a word and mark **"bad from here"** (to the end of the take). Probably
   also **"bad up to here"** and **"bad between A and B"** later, but the from-here case is the one seen live.
2. The mark is stored as data with the recording: recording name, word index, word text, start time in seconds,
   kind (`from-here`), an optional reason ("background noise"), and who made it and when.
3. FliCut reads the marks when it builds the cut and treats them as **David's prior decision**: the marked span starts
   out excluded, and it says why ("marked bad in FliHub, 2026-10-25").

## Open design questions (David / FliCut owner decide)

- **Where the mark lives.** Proposal: a project-level sidecar both apps read, e.g. `hub/review-marks.json` beside
  `hub/transcripts/`, keyed by recording name plus a word time, so it survives a rename. Not decided.
- **Who owns the format.** FliHub writes it and FliCut reads it. It may belong in fli-core's shared structure
  (alongside FR-170's chapter-seed export) so neither app invents its own.
- **Is a mark binding or a hint?** Recommended: excluded by default but visible, so David can bring the span back in
  FliCut with one click.
- Scope creep to watch for: this isn't a general notes or annotation system. It records one kind of fact, "this span is
  bad".

## Related

- FliCut **FC-48**, the consuming half of this idea.
- FR-169 word-level timestamps (they exist now: the D12 transcripts carry word starts). FR-170 / FC-30 chapter-seed
  export is the same pattern: FliHub knowledge handed to FliCut.
