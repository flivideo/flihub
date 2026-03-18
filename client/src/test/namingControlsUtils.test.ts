import { describe, it, expect } from 'vitest';
import { sanitizeCustomTag, shouldShowTemplate } from '../components/NamingControls.js';
import type { CommonName } from '../../../shared/types';

// ---------------------------------------------------------------------------
// sanitizeCustomTag
// ---------------------------------------------------------------------------

describe('sanitizeCustomTag', () => {
  it('converts lowercase letters to uppercase', () => {
    expect(sanitizeCustomTag('cta')).toBe('CTA');
  });

  it('converts spaces to dashes', () => {
    expect(sanitizeCustomTag('TAG ONE')).toBe('TAG-ONE');
  });

  it('converts commas to dashes', () => {
    expect(sanitizeCustomTag('TAG1,TAG2')).toBe('TAG1-TAG2');
  });

  it('converts multiple consecutive spaces to a single dash', () => {
    expect(sanitizeCustomTag('TAG  ONE')).toBe('TAG-ONE');
  });

  it('converts mixed spaces and commas to a single dash', () => {
    expect(sanitizeCustomTag('TAG , ONE')).toBe('TAG-ONE');
  });

  it('strips characters that are not A-Z, 0-9, or dash', () => {
    expect(sanitizeCustomTag('TAG!@#ONE')).toBe('TAGONE');
  });

  it('trims a leading dash', () => {
    expect(sanitizeCustomTag('-TAG')).toBe('TAG');
  });

  it('does NOT trim a trailing dash (user may be mid-typing TAG1-TAG2)', () => {
    expect(sanitizeCustomTag('TAG-')).toBe('TAG-');
  });

  it('collapses multiple dashes into one', () => {
    expect(sanitizeCustomTag('TAG--ONE')).toBe('TAG-ONE');
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeCustomTag('')).toBe('');
  });

  it('returns empty string for whitespace-only input (leading dash trimmed after collapse)', () => {
    // '   ' → upper → '   ' → replace spaces → '---' → collapse → '-' → trim leading → ''
    expect(sanitizeCustomTag('   ')).toBe('');
  });

  it('handles digits correctly', () => {
    expect(sanitizeCustomTag('tag123')).toBe('TAG123');
  });

  it('preserves an already-valid uppercase tag unchanged', () => {
    expect(sanitizeCustomTag('CTA')).toBe('CTA');
  });
});

// ---------------------------------------------------------------------------
// shouldShowTemplate
// ---------------------------------------------------------------------------

describe('shouldShowTemplate', () => {
  // Helper to build a minimal CommonName
  function makeTemplate(chapterFilter?: CommonName['chapterFilter']): CommonName {
    return { name: 'intro', chapterFilter };
  }

  describe('filter === "all" (default)', () => {
    it('returns true when chapterFilter is omitted (defaults to "all")', () => {
      expect(shouldShowTemplate(makeTemplate(), 5)).toBe(true);
    });

    it('returns true when chapterFilter is explicitly "all"', () => {
      expect(shouldShowTemplate(makeTemplate('all'), 1)).toBe(true);
    });
  });

  describe('min only', () => {
    const template = makeTemplate({ min: 5 });

    it('returns true when chapter equals min', () => {
      expect(shouldShowTemplate(template, 5)).toBe(true);
    });

    it('returns true when chapter is above min', () => {
      expect(shouldShowTemplate(template, 10)).toBe(true);
    });

    it('returns false when chapter is below min', () => {
      expect(shouldShowTemplate(template, 4)).toBe(false);
    });
  });

  describe('max only', () => {
    const template = makeTemplate({ max: 10 });

    it('returns true when chapter equals max', () => {
      expect(shouldShowTemplate(template, 10)).toBe(true);
    });

    it('returns true when chapter is below max', () => {
      expect(shouldShowTemplate(template, 3)).toBe(true);
    });

    it('returns false when chapter exceeds max', () => {
      expect(shouldShowTemplate(template, 11)).toBe(false);
    });
  });

  describe('both min and max', () => {
    const template = makeTemplate({ min: 3, max: 7 });

    it('returns true when chapter is within range', () => {
      expect(shouldShowTemplate(template, 5)).toBe(true);
    });

    it('returns true when chapter equals min boundary', () => {
      expect(shouldShowTemplate(template, 3)).toBe(true);
    });

    it('returns true when chapter equals max boundary', () => {
      expect(shouldShowTemplate(template, 7)).toBe(true);
    });

    it('returns false when chapter is below range', () => {
      expect(shouldShowTemplate(template, 2)).toBe(false);
    });

    it('returns false when chapter is above range', () => {
      expect(shouldShowTemplate(template, 8)).toBe(false);
    });
  });

  describe('edge: chapter 0', () => {
    it('returns false for min:1 when chapter is 0', () => {
      expect(shouldShowTemplate(makeTemplate({ min: 1 }), 0)).toBe(false);
    });

    it('returns true for max:0 when chapter is 0', () => {
      expect(shouldShowTemplate(makeTemplate({ max: 0 }), 0)).toBe(true);
    });
  });
});
