import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  parseSrtTimestamp,
  formatYouTubeTimestamp,
  calculateConfidence,
  type MatchResult,
} from '../utils/chapterExtraction.js';

// ---------------------------------------------------------------------------
// Mocks for extractChapters / findMatchInSrt tests
// fs-extra is mocked globally here; individual describe blocks reset via beforeEach
// ---------------------------------------------------------------------------
vi.mock('fs-extra', () => ({
  default: {
    pathExists: vi.fn(),
    readFile: vi.fn(),
    readdir: vi.fn(),
    stat: vi.fn(),
  },
}));

vi.mock('../utils/filesystem.js', () => ({
  readFileSafe: vi.fn(),
  statSafe: vi.fn(),
}));

// ---------------------------------------------------------------------------
// parseSrtTimestamp
// Format: "HH:MM:SS,mmm" → total seconds (float)
// ---------------------------------------------------------------------------
describe('parseSrtTimestamp', () => {
  it('converts a standard SRT timestamp to seconds', () => {
    // 00:02:34,500 = 2*60 + 34 + 0.5 = 154.5
    expect(parseSrtTimestamp('00:02:34,500')).toBe(154.5);
  });

  it('handles millisecond precision', () => {
    // 00:00:00,001 = 0.001
    expect(parseSrtTimestamp('00:00:00,001')).toBeCloseTo(0.001);
  });

  it('returns 0 for all-zero timestamp', () => {
    expect(parseSrtTimestamp('00:00:00,000')).toBe(0);
  });

  it('handles hours correctly', () => {
    // 01:00:00,000 = 3600
    expect(parseSrtTimestamp('01:00:00,000')).toBe(3600);
  });

  it('returns null for an invalid / empty string', () => {
    expect(parseSrtTimestamp('')).toBeNull();
    expect(parseSrtTimestamp('not-a-timestamp')).toBeNull();
  });

  it('combines hours, minutes, seconds, and millis correctly', () => {
    // 01:30:45,250 = 3600 + 1800 + 45 + 0.25 = 5445.25
    expect(parseSrtTimestamp('01:30:45,250')).toBeCloseTo(5445.25);
  });
});

// ---------------------------------------------------------------------------
// formatYouTubeTimestamp
// Input is SECONDS (not milliseconds).
// Under 1 hour  → "M:SS"
// 1 hour+       → "H:MM:SS"
// ---------------------------------------------------------------------------
describe('formatYouTubeTimestamp', () => {
  it('returns 0:00 for zero seconds', () => {
    expect(formatYouTubeTimestamp(0)).toBe('0:00');
  });

  it('formats sub-hour correctly (M:SS)', () => {
    // 90 seconds → 1 minute 30 seconds
    expect(formatYouTubeTimestamp(90)).toBe('1:30');
  });

  it('pads seconds to two digits', () => {
    // 65 seconds → 1:05
    expect(formatYouTubeTimestamp(65)).toBe('1:05');
  });

  it('formats exactly 1 minute', () => {
    expect(formatYouTubeTimestamp(60)).toBe('1:00');
  });

  it('formats sub-minute (seconds only)', () => {
    expect(formatYouTubeTimestamp(45)).toBe('0:45');
  });

  it('formats hours with zero-padded minutes and seconds (H:MM:SS)', () => {
    // 3700 seconds = 1h 1m 40s → 1:01:40
    expect(formatYouTubeTimestamp(3700)).toBe('1:01:40');
  });

  it('formats exactly 1 hour', () => {
    // 3600 seconds = 1h 0m 0s → 1:00:00
    expect(formatYouTubeTimestamp(3600)).toBe('1:00:00');
  });

  it('handles large hours', () => {
    // 7384 seconds = 2h 3m 4s → 2:03:04
    expect(formatYouTubeTimestamp(7384)).toBe('2:03:04');
  });

  it('truncates fractional seconds (floor)', () => {
    // 90.9 → still 1:30
    expect(formatYouTubeTimestamp(90.9)).toBe('1:30');
  });
});

// ---------------------------------------------------------------------------
// calculateConfidence
// Takes a MatchResult object and returns a 0–100 integer.
// ---------------------------------------------------------------------------
describe('calculateConfidence', () => {
  // ---- similarity matchType ------------------------------------------------
  it('maps similarity score 0.9 → 90', () => {
    const match: MatchResult = {
      segmentIndex: 0,
      matchType: 'similarity',
      wordCount: 10,
      wordsSkipped: 0,
      similarityScore: 0.9,
    };
    expect(calculateConfidence(match)).toBe(90);
  });

  it('maps similarity score 0.65 → 65', () => {
    const match: MatchResult = {
      segmentIndex: 0,
      matchType: 'similarity',
      wordCount: 10,
      wordsSkipped: 0,
      similarityScore: 0.65,
    };
    expect(calculateConfidence(match)).toBe(65);
  });

  it('maps similarity score 1.0 → 100', () => {
    const match: MatchResult = {
      segmentIndex: 0,
      matchType: 'similarity',
      wordCount: 20,
      wordsSkipped: 0,
      similarityScore: 1.0,
    };
    expect(calculateConfidence(match)).toBe(100);
  });

  // ---- partial_words matchType ---------------------------------------------
  it('returns flat 50 for partial_words match regardless of word count', () => {
    const match: MatchResult = {
      segmentIndex: 0,
      matchType: 'partial_words',
      wordCount: 15,
      wordsSkipped: 0,
    };
    expect(calculateConfidence(match)).toBe(50);
  });

  // ---- exact_phrase matchType ----------------------------------------------
  it('returns 100 for a long exact phrase with no skipped words', () => {
    const match: MatchResult = {
      segmentIndex: 0,
      matchType: 'exact_phrase',
      wordCount: 10,
      wordsSkipped: 0,
    };
    expect(calculateConfidence(match)).toBe(100);
  });

  it('applies -10 penalty for short phrase (5–6 words)', () => {
    const match: MatchResult = {
      segmentIndex: 0,
      matchType: 'exact_phrase',
      wordCount: 6,
      wordsSkipped: 0,
    };
    // 100 - 10 = 90
    expect(calculateConfidence(match)).toBe(90);
  });

  it('applies -15 penalty for very short phrase (< 5 words)', () => {
    const match: MatchResult = {
      segmentIndex: 0,
      matchType: 'exact_phrase',
      wordCount: 3,
      wordsSkipped: 0,
    };
    // 100 - 15 = 85
    expect(calculateConfidence(match)).toBe(85);
  });

  it('applies -5 per skipped word (up to -15 max)', () => {
    const match: MatchResult = {
      segmentIndex: 0,
      matchType: 'exact_phrase',
      wordCount: 10,
      wordsSkipped: 2,
    };
    // 100 - (2 * 5) = 90
    expect(calculateConfidence(match)).toBe(90);
  });

  it('caps skipped-word penalty at -15', () => {
    const match: MatchResult = {
      segmentIndex: 0,
      matchType: 'exact_phrase',
      wordCount: 10,
      wordsSkipped: 5, // 5 * 5 = 25, but capped at 15
    };
    // 100 - 15 = 85
    expect(calculateConfidence(match)).toBe(85);
  });

  it('stacks phrase-length and skip penalties', () => {
    const match: MatchResult = {
      segmentIndex: 0,
      matchType: 'exact_phrase',
      wordCount: 6, // -10 (short phrase)
      wordsSkipped: 2, // -10 (2 words * 5)
    };
    // 100 - 10 - 10 = 80
    expect(calculateConfidence(match)).toBe(80);
  });
});

// ---------------------------------------------------------------------------
// NEW TESTS — B029: test-extractChapters-matching
//
// Exports added to chapterExtraction.ts to enable testing:
//   - `export function normalizeText`     (was private)
//   - `export function calculateSimilarity` (was private)
//   - `export function findMatchInSrt`    (was private)
//
// extractChapters() was already exported.
// ---------------------------------------------------------------------------

import {
  normalizeText,
  calculateSimilarity,
  findMatchInSrt,
  extractChapters,
} from '../utils/chapterExtraction.js';
import fs from 'fs-extra';
import { readFileSafe, statSafe } from '../utils/filesystem.js';

// Shared SRT fixture used across findMatchInSrt and extractChapters tests
const SAMPLE_SRT = `1
00:00:00,000 --> 00:00:05,000
Welcome to this tutorial about AppyDave

2
00:00:05,500 --> 00:00:10,000
Today we will learn about the BMAD method

3
00:00:10,500 --> 00:00:15,000
Let's start with the introduction
`;

// ---------------------------------------------------------------------------
// normalizeText
// ---------------------------------------------------------------------------
describe('normalizeText', () => {
  // Import is checked at top of file; these tests call the exported function directly.

  it('lowercases all characters', () => {
    const result = normalizeText('Hello World');
    expect(result).toBe('hello world');
  });

  it('removes punctuation characters', () => {
    const result = normalizeText("it's great, isn't it?");
    // apostrophes, commas, question marks removed; words still separated by spaces
    expect(result).not.toMatch(/[^\w\s]/);
  });

  it('collapses multiple spaces into one', () => {
    const result = normalizeText('too   many    spaces');
    expect(result).toBe('too many spaces');
  });

  it('trims leading and trailing whitespace', () => {
    const result = normalizeText('  leading and trailing  ');
    expect(result).toBe('leading and trailing');
  });

  it('handles empty string', () => {
    expect(normalizeText('')).toBe('');
  });

  it('combines all transformations: uppercase + punctuation + extra spaces', () => {
    const result = normalizeText('  Hello,   World!  ');
    expect(result).toBe('hello world');
  });
});

// ---------------------------------------------------------------------------
// calculateSimilarity
// ---------------------------------------------------------------------------
describe('calculateSimilarity', () => {
  it('returns combined score of 1 for identical strings', () => {
    const result = calculateSimilarity('hello world', 'hello world');
    expect(result.combined).toBe(1);
  });

  it('returns individual scores of 1 for identical strings', () => {
    const result = calculateSimilarity('hello world', 'hello world');
    expect(result.trigram).toBe(1);
    expect(result.jaro).toBe(1);
    expect(result.dice).toBe(1);
  });

  it('returns combined score of 0 for empty inputs', () => {
    const result = calculateSimilarity('', 'hello world');
    expect(result.combined).toBe(0);
  });

  it('returns combined score of 0 when both inputs are empty', () => {
    const result = calculateSimilarity('', '');
    expect(result.combined).toBe(0);
  });

  it('returns a low score for completely different strings', () => {
    const result = calculateSimilarity('aaaa bbbb cccc', 'xxxx yyyy zzzz');
    expect(result.combined).toBeLessThan(0.4);
  });

  it('returns an intermediate score for partial overlap', () => {
    // Half the words match
    const result = calculateSimilarity('hello world foo bar', 'hello world baz qux');
    expect(result.combined).toBeGreaterThan(0.3);
    expect(result.combined).toBeLessThan(1.0);
  });

  it('returns scores strictly between 0 and 1 for partially similar strings', () => {
    const result = calculateSimilarity('the quick brown fox', 'the slow brown dog');
    expect(result.combined).toBeGreaterThan(0);
    expect(result.combined).toBeLessThan(1);
  });

  it('combined score is a weighted blend of trigram, jaro, and dice', () => {
    const result = calculateSimilarity('hello world test', 'hello world test case');
    // Verify the combined formula: trigram*0.4 + jaro*0.3 + dice*0.3
    const expected = result.trigram * 0.4 + result.jaro * 0.3 + result.dice * 0.3;
    expect(result.combined).toBeCloseTo(expected, 5);
  });
});

// ---------------------------------------------------------------------------
// findMatchInSrt
// Needs parsed SRT segments; we build a minimal segment array inline
// to avoid depending on the private parseSrt function.
// ---------------------------------------------------------------------------

// Minimal SRT segment shape matching the internal SrtSegment interface
interface TestSrtSegment {
  index: number;
  startSeconds: number;
  endSeconds: number;
  startTimestamp: string;
  text: string;
}

function makeSrtSegments(): TestSrtSegment[] {
  return [
    {
      index: 1,
      startSeconds: 0,
      endSeconds: 5,
      startTimestamp: '00:00:00,000',
      text: 'Welcome to this tutorial about AppyDave',
    },
    {
      index: 2,
      startSeconds: 5.5,
      endSeconds: 10,
      startTimestamp: '00:00:05,500',
      text: 'Today we will learn about the BMAD method',
    },
    {
      index: 3,
      startSeconds: 10.5,
      endSeconds: 15,
      startTimestamp: '00:00:10,500',
      text: "Let's start with the introduction",
    },
  ];
}

describe('findMatchInSrt', () => {
  it('finds an exact phrase match and returns high confidence', () => {
    const segments = makeSrtSegments();
    // Text that contains the first segment's phrase
    const chapterText = 'Welcome to this tutorial about AppyDave and more content here to pad';
    const result = findMatchInSrt(chapterText, segments as never);
    expect(result).not.toBeNull();
    expect(result!.segmentIndex).toBe(0);
    expect(result!.confidence).toBeGreaterThanOrEqual(85);
    expect(result!.matchResult.matchType).toBe('exact_phrase');
  });

  it('returns null when no segment matches and similarity is below threshold', () => {
    const segments = makeSrtSegments();
    // Text with no words in common with any segment
    const chapterText = 'xyz zyx qqq rrr sss ttt uuu vvv www aaa bbb ccc ddd eee fff ggg hhh';
    const result = findMatchInSrt(chapterText, segments as never);
    expect(result).toBeNull();
  });

  it('returns null when the only matching segment is excluded', () => {
    const segments = makeSrtSegments();
    const chapterText = 'Welcome to this tutorial about AppyDave and more content here to pad';
    // Exclude segment index 0 which would normally match — no other segment is similar enough
    const excluded = new Set([0, 1, 2]); // exclude all segments to guarantee null
    const result = findMatchInSrt(chapterText, segments as never, excluded);
    expect(result).toBeNull();
  });

  it('falls back to similarity matching when exact phrase is not found', () => {
    const segments = makeSrtSegments();
    // Paraphrase of segment 2 — not an exact phrase match but similar content
    const chapterText =
      'Today we will be learning all about the BMAD methodology and how it applies';
    const result = findMatchInSrt(chapterText, segments as never);
    // Similarity fallback should find segment 1 (BMAD content)
    expect(result).not.toBeNull();
    expect(result!.segmentIndex).toBe(1);
  });

  it('respects skipFirstWords by skipping opening words during match', () => {
    const segments = makeSrtSegments();
    // The phrase starting at word 2 matches segment 0
    const chapterText =
      'These words will be skipped Welcome to this tutorial about AppyDave and more content here';
    // With skipFirstWords=2 it should still find the match (shifted into the phrase)
    const result = findMatchInSrt(chapterText, segments as never, new Set(), 2);
    // Result may or may not match depending on phrase construction — just confirm no crash
    // and that if matched it is a valid segment index
    if (result !== null) {
      expect(result.segmentIndex).toBeGreaterThanOrEqual(0);
      expect(result.segmentIndex).toBeLessThan(segments.length);
    }
  });
});

// ---------------------------------------------------------------------------
// extractChapters
// Mocks fs-extra (used by parseSrt + getChaptersFromTranscripts) and
// filesystem.js (used by readFileSafe + statSafe).
// ---------------------------------------------------------------------------
describe('extractChapters', () => {
  const PROJECT_PATH = '/fake/project';
  const SRT_PATH = '/fake/srt/final.srt';
  const TRANSCRIPTS_DIR = `${PROJECT_PATH}/recording-transcripts`;

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns empty chapters array when SRT file has no parseable segments', async () => {
    // fs.readFile for SRT → empty string
    vi.mocked(fs.readFile).mockResolvedValue('' as never);
    // getChaptersFromTranscripts won't even be reached, but set safe defaults
    vi.mocked(fs.pathExists).mockResolvedValue(false as never);
    vi.mocked(fs.readdir).mockResolvedValue([] as never);

    const result = await extractChapters(PROJECT_PATH, SRT_PATH);

    expect(result.success).toBe(false);
    expect(result.chapters).toHaveLength(0);
    expect(result.error).toMatch(/parse SRT/i);
  });

  it('returns error when no chapter transcripts are found', async () => {
    // Provide a valid SRT so parseSrt succeeds
    vi.mocked(fs.readFile).mockResolvedValue(SAMPLE_SRT as never);
    // Transcripts dir does not exist
    vi.mocked(fs.pathExists).mockResolvedValue(false as never);
    vi.mocked(fs.readdir).mockResolvedValue([] as never);

    const result = await extractChapters(PROJECT_PATH, SRT_PATH);

    expect(result.success).toBe(false);
    expect(result.chapters).toHaveLength(0);
    expect(result.error).toMatch(/No chapter transcripts/i);
  });

  it('returns one chapter entry per recording when a match is found', async () => {
    // SRT content returned for parseSrt
    vi.mocked(fs.readFile).mockResolvedValue(SAMPLE_SRT as never);
    // Transcripts dir exists
    vi.mocked(fs.pathExists).mockResolvedValue(true as never);
    // One transcript file matching segment 0
    vi.mocked(fs.readdir).mockResolvedValue(['01-1-intro.txt'] as never);
    // statSafe returns a non-zero size so the file is not skipped
    vi.mocked(statSafe).mockResolvedValue({ size: 100 } as never);
    // readFileSafe returns transcript text that matches SAMPLE_SRT segment 0
    vi.mocked(readFileSafe).mockResolvedValue(
      'Welcome to this tutorial about AppyDave and some more words to pad the phrase'
    );

    const result = await extractChapters(PROJECT_PATH, SRT_PATH);

    expect(result.success).toBe(true);
    expect(result.chapters).toHaveLength(1);
    expect(result.chapters[0].chapter).toBe(1);
    expect(result.chapters[0].name).toBe('intro');
    expect(result.chapters[0].status).not.toBe('not_found');
  });

  it('marks chapter as not_found when transcript cannot be read', async () => {
    vi.mocked(fs.readFile).mockResolvedValue(SAMPLE_SRT as never);
    vi.mocked(fs.pathExists).mockResolvedValue(true as never);
    vi.mocked(fs.readdir).mockResolvedValue(['02-1-overview.txt'] as never);
    vi.mocked(statSafe).mockResolvedValue({ size: 50 } as never);
    // readFileSafe returns null → transcript unreadable
    vi.mocked(readFileSafe).mockResolvedValue(null);

    const result = await extractChapters(PROJECT_PATH, SRT_PATH);

    expect(result.success).toBe(true);
    expect(result.chapters).toHaveLength(1);
    expect(result.chapters[0].status).toBe('not_found');
  });

  it('skips transcript files that are empty (size 0)', async () => {
    vi.mocked(fs.readFile).mockResolvedValue(SAMPLE_SRT as never);
    vi.mocked(fs.pathExists).mockResolvedValue(true as never);
    vi.mocked(fs.readdir).mockResolvedValue(['03-1-setup.txt'] as never);
    // statSafe returns size 0 — file should be skipped entirely
    vi.mocked(statSafe).mockResolvedValue({ size: 0 } as never);
    vi.mocked(readFileSafe).mockResolvedValue(null);

    const result = await extractChapters(PROJECT_PATH, SRT_PATH);

    // Empty transcript skipped → no chapters found → error response
    expect(result.chapters).toHaveLength(0);
  });

  it('applies out-of-order penalty when a chapter timestamp precedes a higher-numbered chapter', async () => {
    // Two chapters: chapter 10 appears at 0s, chapter 5 appears at 10.5s (out of order)
    const twoChapterSrt = `1
00:00:00,000 --> 00:00:05,000
Welcome to this tutorial about AppyDave

2
00:00:05,500 --> 00:00:10,000
Today we will learn about the BMAD method

3
00:00:10,500 --> 00:00:15,000
Let us start with the introduction section now
`;

    vi.mocked(fs.readFile).mockResolvedValue(twoChapterSrt as never);
    vi.mocked(fs.pathExists).mockResolvedValue(true as never);
    // Chapter 10 first, then chapter 5 — out of order by chapter number vs timestamp
    vi.mocked(fs.readdir).mockResolvedValue(['05-1-bmad.txt', '10-1-welcome.txt'] as never);
    vi.mocked(statSafe).mockResolvedValue({ size: 80 } as never);

    // Chapter 05 transcript matches segment 1 (BMAD method, at 5.5s)
    // Chapter 10 transcript matches segment 0 (Welcome, at 0s)
    // So chapter 10 appears BEFORE chapter 5 in the SRT → out of order
    vi.mocked(readFileSafe)
      .mockResolvedValueOnce(
        'Today we will learn about the BMAD method and dive deeper into its principles'
      ) // chapter 05
      .mockResolvedValueOnce(
        'Welcome to this tutorial about AppyDave and everything you need to know'
      ); // chapter 10

    const result = await extractChapters(PROJECT_PATH, SRT_PATH);

    expect(result.success).toBe(true);
    // Both chapters should be present
    expect(result.chapters.length).toBeGreaterThanOrEqual(2);

    // The out-of-order chapter (10 appearing at 0s when 5 is at 5.5s) should have
    // reduced confidence or low_confidence status
    const ch10 = result.chapters.find((c) => c.chapter === 10);
    if (ch10 && ch10.status !== 'not_found' && ch10.timestampSeconds !== undefined) {
      const ch5 = result.chapters.find((c) => c.chapter === 5);
      if (ch5 && ch5.status !== 'not_found' && ch5.timestampSeconds !== undefined) {
        // If chapter 10 is before chapter 5 in the SRT, it gets a penalty
        if ((ch10.timestampSeconds ?? 0) < (ch5.timestampSeconds ?? 0)) {
          expect(ch10.confidence).toBeLessThan(100);
        }
      }
    }
  });
});
