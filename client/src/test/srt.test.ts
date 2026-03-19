import { describe, it, expect } from 'vitest';
import {
  parseSrt,
  srtToTimedWords,
  findCurrentEntry,
  findCurrentWord,
  getSrtFullText,
} from '../utils/srt.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SAMPLE_SRT = `1
00:00:00,000 --> 00:00:03,000
Hello world this is a test

2
00:00:03,500 --> 00:00:06,000
Second entry here
`;

// ---------------------------------------------------------------------------
// parseSrt
// ---------------------------------------------------------------------------

describe('parseSrt', () => {
  describe('basic parsing', () => {
    it('returns the correct number of entries', () => {
      const entries = parseSrt(SAMPLE_SRT);
      expect(entries).toHaveLength(2);
    });

    it('parses entry index numbers', () => {
      const entries = parseSrt(SAMPLE_SRT);
      expect(entries[0].index).toBe(1);
      expect(entries[1].index).toBe(2);
    });

    it('parses start times correctly (comma separator)', () => {
      const entries = parseSrt(SAMPLE_SRT);
      expect(entries[0].startTime).toBe(0);
      expect(entries[1].startTime).toBeCloseTo(3.5);
    });

    it('parses end times correctly (comma separator)', () => {
      const entries = parseSrt(SAMPLE_SRT);
      expect(entries[0].endTime).toBe(3);
      expect(entries[1].endTime).toBe(6);
    });

    it('parses text content', () => {
      const entries = parseSrt(SAMPLE_SRT);
      expect(entries[0].text).toBe('Hello world this is a test');
      expect(entries[1].text).toBe('Second entry here');
    });
  });

  describe('empty input', () => {
    it('returns an empty array for empty string', () => {
      expect(parseSrt('')).toEqual([]);
    });
  });

  describe('timestamp separators', () => {
    it('handles period separator in timestamp (00:00:01.500)', () => {
      const srt = `1\n00:00:01.000 --> 00:00:02.500\nPeriod separator test\n`;
      const entries = parseSrt(srt);
      expect(entries).toHaveLength(1);
      expect(entries[0].startTime).toBe(1);
      expect(entries[0].endTime).toBeCloseTo(2.5);
    });
  });

  describe('multi-line text', () => {
    it('joins multiple text lines with a space', () => {
      const srt = `1\n00:00:00,000 --> 00:00:02,000\nLine one\nLine two\n`;
      const entries = parseSrt(srt);
      expect(entries[0].text).toBe('Line one Line two');
    });
  });
});

// ---------------------------------------------------------------------------
// srtToTimedWords
// ---------------------------------------------------------------------------

describe('srtToTimedWords', () => {
  describe('basic word count', () => {
    it('returns one TimedWord per word across all entries', () => {
      const entries = parseSrt(SAMPLE_SRT);
      // "Hello world this is a test" (6) + "Second entry here" (3) = 9
      const words = srtToTimedWords(entries);
      expect(words).toHaveLength(9);
    });
  });

  describe('timing distribution', () => {
    it('distributes timing evenly across words within an entry', () => {
      const srt = `1\n00:00:00,000 --> 00:00:03,000\nA B C\n`;
      const entries = parseSrt(srt);
      const words = srtToTimedWords(entries);
      // 3 words over 3 seconds => 1 second each
      expect(words[0].startTime).toBeCloseTo(0);
      expect(words[0].endTime).toBeCloseTo(1);
      expect(words[1].startTime).toBeCloseTo(1);
      expect(words[1].endTime).toBeCloseTo(2);
      expect(words[2].startTime).toBeCloseTo(2);
      expect(words[2].endTime).toBeCloseTo(3);
    });

    it('assigns word startTime within the entry time range', () => {
      const entries = parseSrt(SAMPLE_SRT);
      const words = srtToTimedWords(entries);
      for (const word of words) {
        const entry = entries.find((e) => e.index === word.entryIndex);
        expect(entry).toBeDefined();
        expect(word.startTime).toBeGreaterThanOrEqual(entry!.startTime);
        expect(word.endTime).toBeLessThanOrEqual(entry!.endTime + 0.001); // float tolerance
      }
    });

    it('stores the correct entry index on each word', () => {
      const entries = parseSrt(SAMPLE_SRT);
      const words = srtToTimedWords(entries);
      const firstEntryWords = words.filter((w) => w.entryIndex === 1);
      const secondEntryWords = words.filter((w) => w.entryIndex === 2);
      expect(firstEntryWords).toHaveLength(6);
      expect(secondEntryWords).toHaveLength(3);
    });
  });

  describe('single-word segment — critical edge case (B030)', () => {
    it('does not divide by zero on a single-word segment', () => {
      const srt = `1\n00:00:00,000 --> 00:00:05,000\nHello\n`;
      const entries = parseSrt(srt);
      const words = srtToTimedWords(entries);
      expect(words).toHaveLength(1);
      expect(words[0].startTime).toBe(0);
      expect(words[0].endTime).toBe(5);
    });

    it('single-word word value is the trimmed token', () => {
      const srt = `1\n00:00:01,000 --> 00:00:04,000\nOnlyWord\n`;
      const entries = parseSrt(srt);
      const words = srtToTimedWords(entries);
      expect(words[0].word).toBe('OnlyWord');
    });
  });

  describe('empty entries', () => {
    it('returns an empty array when given no entries', () => {
      expect(srtToTimedWords([])).toEqual([]);
    });
  });
});

// ---------------------------------------------------------------------------
// findCurrentEntry
// ---------------------------------------------------------------------------

describe('findCurrentEntry', () => {
  const entries = parseSrt(SAMPLE_SRT);
  // entry 1: 0 – 3s,  entry 2: 3.5 – 6s

  it('returns the matching entry when time is within range', () => {
    const result = findCurrentEntry(entries, 1.5);
    expect(result).not.toBeNull();
    expect(result!.index).toBe(1);
  });

  it('returns the second entry when time falls in its range', () => {
    const result = findCurrentEntry(entries, 5);
    expect(result).not.toBeNull();
    expect(result!.index).toBe(2);
  });

  it('returns null when time is before all entries', () => {
    expect(findCurrentEntry(entries, -1)).toBeNull();
  });

  it('returns null when time is after all entries', () => {
    expect(findCurrentEntry(entries, 100)).toBeNull();
  });

  it('returns null when time falls in the gap between entries (3.0–3.5)', () => {
    expect(findCurrentEntry(entries, 3.2)).toBeNull();
  });

  it('returns null for an empty entries array', () => {
    expect(findCurrentEntry([], 1)).toBeNull();
  });

  it('returns entry whose startTime equals currentTime (inclusive start)', () => {
    const result = findCurrentEntry(entries, 0);
    expect(result).not.toBeNull();
    expect(result!.index).toBe(1);
  });

  it('returns null when currentTime exactly equals endTime (exclusive end)', () => {
    // endTime of entry 1 is 3.0 — boundary is exclusive
    expect(findCurrentEntry(entries, 3)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// findCurrentWord
// ---------------------------------------------------------------------------

describe('findCurrentWord', () => {
  const entries = parseSrt(SAMPLE_SRT);
  const words = srtToTimedWords(entries);

  it('returns a word when currentTime matches a word range', () => {
    // entry 1: 0–3s, 6 words => 0.5s each; first word: 0–0.5s
    const result = findCurrentWord(words, 0.1);
    expect(result).not.toBeNull();
    expect(result!.word).toBe('Hello');
  });

  it('returns null when no word is active at currentTime', () => {
    // Gap between entries 1 and 2 is 3.0–3.5s
    expect(findCurrentWord(words, 3.2)).toBeNull();
  });

  it('returns null for an empty words array', () => {
    expect(findCurrentWord([], 1)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getSrtFullText
// ---------------------------------------------------------------------------

describe('getSrtFullText', () => {
  it('joins all entry texts with a space', () => {
    const entries = parseSrt(SAMPLE_SRT);
    expect(getSrtFullText(entries)).toBe('Hello world this is a test Second entry here');
  });

  it('returns an empty string for an empty entries array', () => {
    expect(getSrtFullText([])).toBe('');
  });

  it('returns the single entry text when there is only one entry', () => {
    const srt = `1\n00:00:00,000 --> 00:00:02,000\nJust one entry\n`;
    const entries = parseSrt(srt);
    expect(getSrtFullText(entries)).toBe('Just one entry');
  });
});
