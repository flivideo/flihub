import { describe, it, expect } from 'vitest';
import {
  parseRecordingFilename,
  buildRecordingFilename,
  validateChapter,
  validateSequence,
  validateName,
} from './naming';

describe('naming utilities', () => {
  describe('parseRecordingFilename', () => {
    it('should parse a valid recording name with tags', () => {
      const result = parseRecordingFilename('05-3-intro-demo-CTA-SKOOL.mov');

      expect(result).toEqual({
        chapter: '05',
        sequence: '3',
        name: 'intro-demo',
        tags: ['CTA', 'SKOOL'],
        extension: '.mov',
        isValid: true,
      });
    });

    it('should parse a recording name without tags', () => {
      const result = parseRecordingFilename('10-1-summary.mov');

      expect(result).toEqual({
        chapter: '10',
        sequence: '1',
        name: 'summary',
        tags: [],
        extension: '.mov',
        isValid: true,
      });
    });

    it('should handle single-digit chapter with multi-digit sequence', () => {
      const result = parseRecordingFilename('01-25-conclusion.mov');

      expect(result).toEqual({
        chapter: '01',
        sequence: '25',
        name: 'conclusion',
        tags: [],
        extension: '.mov',
        isValid: true,
      });
    });

    it('should return invalid for malformed names', () => {
      const result = parseRecordingFilename('invalid-name.mov');

      expect(result.isValid).toBe(false);
    });

    it('should handle .mp4 extension', () => {
      const result = parseRecordingFilename('05-3-intro.mp4');

      expect(result.extension).toBe('.mp4');
      expect(result.isValid).toBe(true);
    });
  });

  describe('buildRecordingFilename', () => {
    it('should build a recording name with tags', () => {
      const result = buildRecordingFilename('05', '3', 'intro-demo', ['CTA']);

      expect(result).toBe('05-3-intro-demo-CTA.mov');
    });

    it('should build a recording name without tags', () => {
      const result = buildRecordingFilename('10', '1', 'summary', []);

      expect(result).toBe('10-1-summary.mov');
    });

    it('should handle multiple tags', () => {
      const result = buildRecordingFilename('01', '2', 'demo', ['CTA', 'SKOOL', 'ENDCARD']);

      expect(result).toBe('01-2-demo-CTA-SKOOL-ENDCARD.mov');
    });
  });

  describe('validateChapter', () => {
    it('should accept valid chapter numbers', () => {
      expect(validateChapter('01')).toBeNull(); // null = valid
      expect(validateChapter('05')).toBeNull();
      expect(validateChapter('99')).toBeNull();
    });

    it('should reject invalid chapter numbers', () => {
      expect(validateChapter('0')).toBeTruthy(); // error message = invalid
      expect(validateChapter('1')).toBeTruthy();
      expect(validateChapter('100')).toBeTruthy();
      expect(validateChapter('00')).toBeTruthy();
      expect(validateChapter('abc')).toBeTruthy();
    });
  });

  describe('validateSequence', () => {
    it('should accept valid sequence numbers', () => {
      expect(validateSequence('1')).toBeNull();
      expect(validateSequence('5')).toBeNull();
      expect(validateSequence('99')).toBeNull();
      expect(validateSequence('123')).toBeNull();
    });

    it('should reject invalid sequence numbers', () => {
      expect(validateSequence('0')).toBeTruthy();
      expect(validateSequence('00')).toBeTruthy();
      expect(validateSequence('abc')).toBeTruthy();
      expect(validateSequence('')).toBeTruthy();
    });
  });

  describe('validateName', () => {
    it('should accept valid kebab-case names', () => {
      expect(validateName('intro')).toBeNull();
      expect(validateName('intro-demo')).toBeNull();
      expect(validateName('final-summary-part-2')).toBeNull();
    });

    it('should reject invalid names', () => {
      expect(validateName('Intro')).toBeTruthy(); // uppercase
      expect(validateName('intro_demo')).toBeTruthy(); // underscore
      expect(validateName('intro demo')).toBeTruthy(); // space
      expect(validateName('intro--demo')).toBeTruthy(); // double dash
      expect(validateName('')).toBeTruthy(); // empty
    });
  });
});
