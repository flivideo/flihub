import { describe, it, expect } from 'vitest';
import { extractChapters, detectGaps } from '../utils/chapterUtils';

// ============================================================
// extractChapters
// ============================================================
describe('extractChapters', () => {
  it('returns empty array for empty input', () => {
    expect(extractChapters([])).toEqual([]);
  });

  it('returns one chapter for a single recording', () => {
    const result = extractChapters(['01-1-intro.mov']);

    expect(result).toHaveLength(1);
    expect(result[0].number).toBe(1);
    expect(result[0].fileCount).toBe(1);
  });

  it('counts multiple recordings in same chapter correctly', () => {
    const result = extractChapters([
      '01-1-intro.mov',
      '01-2-demo.mov',
      '01-3-outro.mov',
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].number).toBe(1);
    expect(result[0].fileCount).toBe(3);
  });

  it('sorts chapters numerically', () => {
    const result = extractChapters([
      '10-1-setup.mov',
      '02-1-intro.mov',
      '05-1-middle.mov',
    ]);

    expect(result).toHaveLength(3);
    expect(result[0].number).toBe(2);
    expect(result[1].number).toBe(5);
    expect(result[2].number).toBe(10);
  });

  it('skips invalid filenames', () => {
    const result = extractChapters([
      '01-1-intro.mov',
      'not-a-valid-recording',
      'random.txt',
      '02-1-demo.mov',
    ]);

    expect(result).toHaveLength(2);
    expect(result[0].number).toBe(1);
    expect(result[1].number).toBe(2);
  });

  it('handles multiple chapters with correct file counts', () => {
    const result = extractChapters([
      '01-1-intro.mov',
      '01-2-demo.mov',
      '02-1-setup.mov',
      '03-1-review.mov',
      '03-2-summary.mov',
      '03-3-outro.mov',
    ]);

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ number: 1, fileCount: 2 });
    expect(result[1]).toEqual({ number: 2, fileCount: 1 });
    expect(result[2]).toEqual({ number: 3, fileCount: 3 });
  });
});

// ============================================================
// detectGaps
// ============================================================
describe('detectGaps', () => {
  it('returns empty array when no gaps exist', () => {
    const chapters = [{ number: 1 }, { number: 2 }, { number: 3 }];
    expect(detectGaps(chapters)).toEqual([]);
  });

  it('detects a single gap', () => {
    const chapters = [{ number: 1 }, { number: 3 }];
    expect(detectGaps(chapters)).toEqual([2]);
  });

  it('detects multiple gaps', () => {
    const chapters = [{ number: 1 }, { number: 4 }, { number: 8 }];
    expect(detectGaps(chapters)).toEqual([2, 3, 5, 6, 7]);
  });

  it('returns empty array for consecutive chapters', () => {
    const chapters = [{ number: 5 }, { number: 6 }, { number: 7 }, { number: 8 }];
    expect(detectGaps(chapters)).toEqual([]);
  });

  it('returns empty array for a single chapter', () => {
    const chapters = [{ number: 5 }];
    expect(detectGaps(chapters)).toEqual([]);
  });

  it('returns empty array for empty input', () => {
    expect(detectGaps([])).toEqual([]);
  });

  it('detects gaps at multiple positions', () => {
    const chapters = [{ number: 1 }, { number: 3 }, { number: 5 }, { number: 7 }];
    expect(detectGaps(chapters)).toEqual([2, 4, 6]);
  });
});
