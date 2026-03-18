import { describe, it, expect } from 'vitest';
import {
  parseSrtTimestamp,
  formatYouTubeTimestamp,
  calculateConfidence,
  type MatchResult,
} from '../utils/chapterExtraction.js';

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
