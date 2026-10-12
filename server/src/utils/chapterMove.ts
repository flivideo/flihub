/**
 * Sequence numbers for takes MOVED into another chapter.
 *
 * Moving takes from chapter 02 into chapter 03 used to keep their old sequence numbers, so the
 * second and third take of the overview landed as 03-2 and 03-3 in an otherwise empty chapter
 * (David, D08, 2026-10-12: "They're not 1 and 2. They're 2 and 3 because that's where they were").
 * Moved takes now append after whatever the target chapter already holds, in their old order:
 * empty chapter → 1, 2, …; a chapter holding 03-1 → 2, 3, ….
 *
 * Takes that stay in their own chapter keep their number (that is a relabel, not a move).
 */
export interface MoveCandidate {
  filename: string;
  chapter: string; // current chapter, as in the filename
  sequence: number; // current sequence
}

export function planMovedSequences(
  moving: MoveCandidate[],
  targetChapter: string,
  targetSequencesAlreadyThere: number[]
): Map<string, number> {
  const target = parseInt(targetChapter, 10);
  const movers = moving
    .filter((f) => parseInt(f.chapter, 10) !== target)
    .sort((a, b) => parseInt(a.chapter, 10) - parseInt(b.chapter, 10) || a.sequence - b.sequence);
  let next = Math.max(0, ...targetSequencesAlreadyThere) + 1;
  const plan = new Map<string, number>();
  for (const f of movers) plan.set(f.filename, next++);
  return plan;
}
