import { describe, it, expect } from 'vitest';
import { buildPreviewFilename } from '../utils/naming.js';

// ---------------------------------------------------------------------------
// buildPreviewFilename(chapter, sequence, name, tags, customTag?): string
//
// Returns '...' when chapter or name is falsy.
// Otherwise: [chapter, sequence?, sanitized-name, ...tags, customTag?].join('-') + '.mov'
// Name sanitisation: lowercased, spaces→dashes, non-[a-z0-9-] stripped.
// ---------------------------------------------------------------------------

describe('buildPreviewFilename', () => {
  describe('guard: returns placeholder when required parts missing', () => {
    it('returns "..." when chapter is empty', () => {
      expect(buildPreviewFilename('', '1', 'intro', [])).toBe('...');
    });

    it('returns "..." when name is empty', () => {
      expect(buildPreviewFilename('01', '1', '', [])).toBe('...');
    });

    it('returns "..." when both chapter and name are empty', () => {
      expect(buildPreviewFilename('', '', '', [])).toBe('...');
    });
  });

  describe('standard: chapter + sequence + name', () => {
    it('builds a basic filename with no tags', () => {
      expect(buildPreviewFilename('01', '1', 'intro', [])).toBe('01-1-intro.mov');
    });

    it('includes sequence between chapter and name', () => {
      expect(buildPreviewFilename('10', '5', 'setup', [])).toBe('10-5-setup.mov');
    });

    it('omits sequence segment when sequence is null', () => {
      expect(buildPreviewFilename('01', null, 'intro', [])).toBe('01-intro.mov');
    });

    it('omits sequence segment when sequence is empty string', () => {
      expect(buildPreviewFilename('01', '', 'intro', [])).toBe('01-intro.mov');
    });
  });

  describe('name sanitisation', () => {
    it('lowercases the name', () => {
      expect(buildPreviewFilename('01', '1', 'INTRO', [])).toBe('01-1-intro.mov');
    });

    it('converts spaces in name to dashes', () => {
      expect(buildPreviewFilename('01', '1', 'my intro', [])).toBe('01-1-my-intro.mov');
    });

    it('strips characters that are not a-z, 0-9, or dash', () => {
      expect(buildPreviewFilename('01', '1', 'intro!@#', [])).toBe('01-1-intro.mov');
    });

    it('preserves hyphens already present in the name', () => {
      expect(buildPreviewFilename('01', '1', 'call-to-action', [])).toBe('01-1-call-to-action.mov');
    });
  });

  describe('tags', () => {
    it('appends a single tag after the name', () => {
      expect(buildPreviewFilename('01', '1', 'intro', ['CTA'])).toBe('01-1-intro-CTA.mov');
    });

    it('appends multiple tags in order', () => {
      expect(buildPreviewFilename('01', '1', 'intro', ['CTA', 'SKOOL'])).toBe('01-1-intro-CTA-SKOOL.mov');
    });

    it('produces correct result with empty tags array', () => {
      expect(buildPreviewFilename('05', '3', 'workflow', [])).toBe('05-3-workflow.mov');
    });
  });

  describe('customTag', () => {
    it('appends customTag after the tags list', () => {
      expect(buildPreviewFilename('01', '1', 'intro', [], 'DEMO')).toBe('01-1-intro-DEMO.mov');
    });

    it('appends customTag after standard tags', () => {
      expect(buildPreviewFilename('01', '1', 'intro', ['CTA'], 'DEMO')).toBe('01-1-intro-CTA-DEMO.mov');
    });

    it('omits customTag segment when customTag is empty string', () => {
      expect(buildPreviewFilename('01', '1', 'intro', ['CTA'], '')).toBe('01-1-intro-CTA.mov');
    });

    it('omits customTag segment when customTag is undefined', () => {
      expect(buildPreviewFilename('01', '1', 'intro', ['CTA'])).toBe('01-1-intro-CTA.mov');
    });

    it('handles multi-part custom tags already containing dashes', () => {
      expect(buildPreviewFilename('01', '1', 'intro', [], 'TAG1-TAG2')).toBe('01-1-intro-TAG1-TAG2.mov');
    });
  });

  describe('combined scenarios', () => {
    it('builds a full filename with chapter, sequence, name, tags, and customTag', () => {
      expect(buildPreviewFilename('10', '5', 'intro', ['CTA', 'SKOOL'], 'BONUS')).toBe(
        '10-5-intro-CTA-SKOOL-BONUS.mov'
      );
    });

    it('builds a realistic filename matching the docs example', () => {
      // Docs example: 10-5-intro-CTA.mov
      expect(buildPreviewFilename('10', '5', 'intro', ['CTA'])).toBe('10-5-intro-CTA.mov');
    });

    it('builds filename without sequence when null, with tags', () => {
      expect(buildPreviewFilename('05', null, 'workflow', ['SKOOL'])).toBe('05-workflow-SKOOL.mov');
    });
  });
});
