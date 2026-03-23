/**
 * Chapter utility functions extracted from ChapterListPanel for reuse and testability.
 */

import { parseRecordingFilename } from '../../../shared/naming';

export function extractChapters(recordings: string[]): { number: number; fileCount: number }[] {
  const chapterMap = new Map<number, number>();

  recordings.forEach((filename) => {
    const parsed = parseRecordingFilename(filename);
    if (parsed) {
      const chapterNum = parseInt(parsed.chapter, 10);
      chapterMap.set(chapterNum, (chapterMap.get(chapterNum) || 0) + 1);
    }
  });

  return Array.from(chapterMap.entries())
    .map(([number, fileCount]) => ({ number, fileCount }))
    .sort((a, b) => a.number - b.number);
}

export function detectGaps(chapters: { number: number }[]): number[] {
  const gapNumbers: number[] = [];
  for (let i = 0; i < chapters.length - 1; i++) {
    const current = chapters[i].number;
    const next = chapters[i + 1].number;

    if (next - current > 1) {
      for (let gap = current + 1; gap < next; gap++) {
        gapNumbers.push(gap);
      }
    }
  }
  return gapNumbers;
}
