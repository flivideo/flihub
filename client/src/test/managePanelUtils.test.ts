import { describe, it, expect } from 'vitest';
import { groupByChapter, getChapterDisplayName } from '../components/ManagePanel';
import type { ChapterGroup } from '../components/ManagePanel';
import type { RecordingFile } from '../../../shared/types';

// Helper to create a mock RecordingFile with sensible defaults
function mockRecording(overrides: Partial<RecordingFile> & { filename: string }): RecordingFile {
  return {
    path: `/projects/test/recordings/${overrides.filename}`,
    size: 1000,
    timestamp: '2026-01-01T00:00:00Z',
    chapter: '01',
    sequence: '1',
    name: 'intro',
    tags: [],
    folder: 'recordings',
    isSafe: false,
    isParked: false,
    ...overrides,
  };
}

// ============================================================
// groupByChapter
// ============================================================
describe('groupByChapter', () => {
  it('returns empty array for empty input', () => {
    expect(groupByChapter([])).toEqual([]);
  });

  it('returns one chapter group for a single file', () => {
    const recordings = [mockRecording({ filename: '01-1-intro.mov', chapter: '01', sequence: '1', name: 'intro' })];
    const result = groupByChapter(recordings);

    expect(result).toHaveLength(1);
    expect(result[0].chapterKey).toBe('01');
    expect(result[0].files).toHaveLength(1);
  });

  it('groups multiple files in the same chapter, sorted by sequence', () => {
    const recordings = [
      mockRecording({ filename: '01-3-outro.mov', chapter: '01', sequence: '3', name: 'outro' }),
      mockRecording({ filename: '01-1-intro.mov', chapter: '01', sequence: '1', name: 'intro' }),
      mockRecording({ filename: '01-2-demo.mov', chapter: '01', sequence: '2', name: 'demo' }),
    ];
    const result = groupByChapter(recordings);

    expect(result).toHaveLength(1);
    expect(result[0].files).toHaveLength(3);
    // Files sorted by sequence
    expect(result[0].files[0].sequence).toBe('1');
    expect(result[0].files[1].sequence).toBe('2');
    expect(result[0].files[2].sequence).toBe('3');
  });

  it('sorts chapters numerically (2 before 10)', () => {
    const recordings = [
      mockRecording({ filename: '10-1-setup.mov', chapter: '10', sequence: '1', name: 'setup' }),
      mockRecording({ filename: '02-1-intro.mov', chapter: '02', sequence: '1', name: 'intro' }),
    ];
    const result = groupByChapter(recordings);

    expect(result).toHaveLength(2);
    expect(result[0].chapterKey).toBe('02');
    expect(result[1].chapterKey).toBe('10');
  });

  it('sums totalSize correctly', () => {
    const recordings = [
      mockRecording({ filename: '01-1-intro.mov', chapter: '01', sequence: '1', size: 500 }),
      mockRecording({ filename: '01-2-demo.mov', chapter: '01', sequence: '2', size: 300 }),
      mockRecording({ filename: '01-3-outro.mov', chapter: '01', sequence: '3', size: 200 }),
    ];
    const result = groupByChapter(recordings);

    expect(result[0].totalSize).toBe(1000);
  });

  it('preserves chapter key from recording', () => {
    const recordings = [
      mockRecording({ filename: '05-1-intro.mov', chapter: '05', sequence: '1', name: 'intro' }),
    ];
    const result = groupByChapter(recordings);

    expect(result[0].chapterKey).toBe('05');
  });

  it('handles files with zero size', () => {
    const recordings = [
      mockRecording({ filename: '01-1-intro.mov', chapter: '01', sequence: '1', size: 0 }),
    ];
    const result = groupByChapter(recordings);

    expect(result[0].totalSize).toBe(0);
  });
});

// ============================================================
// getChapterDisplayName
// ============================================================
describe('getChapterDisplayName', () => {
  it('returns name from the sequence-1 file', () => {
    const files = [
      mockRecording({ filename: '01-2-demo.mov', chapter: '01', sequence: '2', name: 'demo' }),
      mockRecording({ filename: '01-1-intro.mov', chapter: '01', sequence: '1', name: 'intro' }),
      mockRecording({ filename: '01-3-outro.mov', chapter: '01', sequence: '3', name: 'outro' }),
    ];
    const result = getChapterDisplayName(files);

    expect(result).toBe('intro');
  });

  it('falls back to first file if no sequence-1 exists', () => {
    const files = [
      mockRecording({ filename: '01-3-outro.mov', chapter: '01', sequence: '3', name: 'outro' }),
      mockRecording({ filename: '01-2-demo.mov', chapter: '01', sequence: '2', name: 'demo' }),
    ];
    const result = getChapterDisplayName(files);

    // Falls back to the first file in the array (sequence 3)
    expect(result).toBe('outro');
  });

  it('returns empty string for empty array', () => {
    expect(getChapterDisplayName([])).toBe('');
  });

  it('strips tags from name', () => {
    const files = [
      mockRecording({ filename: '01-1-intro-CTA.mov', chapter: '01', sequence: '1', name: 'intro-CTA' }),
    ];
    const result = getChapterDisplayName(files);

    // extractTagsFromName strips trailing uppercase tags
    expect(result).toBe('intro');
  });

  it('strips multiple tags from name', () => {
    const files = [
      mockRecording({ filename: '01-1-setup-bmad-CTA-SKOOL.mov', chapter: '01', sequence: '1', name: 'setup-bmad-CTA-SKOOL' }),
    ];
    const result = getChapterDisplayName(files);

    expect(result).toBe('setup-bmad');
  });
});
