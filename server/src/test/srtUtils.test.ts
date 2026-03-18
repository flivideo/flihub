import { describe, it, expect } from 'vitest';
import { stripSrt } from '../utils/srtUtils.js';

describe('stripSrt', () => {
  it('strips sequence numbers', () => {
    const input = '1\nHello world\n';
    const result = stripSrt(input);
    expect(result).not.toMatch(/^\d+$/m);
    expect(result).toBe('Hello world');
  });

  it('strips timestamps', () => {
    const input = '00:00:01,000 --> 00:00:03,000\nHello world\n';
    const result = stripSrt(input);
    expect(result).not.toContain('-->');
    expect(result).toBe('Hello world');
  });

  it('strips empty lines and returns plain joined text', () => {
    const input = '1\n00:00:01,000 --> 00:00:03,000\nHello world\n\n2\n00:00:04,000 --> 00:00:06,000\nSecond line\n';
    const result = stripSrt(input);
    expect(result).toBe('Hello world\nSecond line');
  });

  it('returns an empty string for SRT-only content with no text lines', () => {
    const input = '1\n00:00:01,000 --> 00:00:03,000\n\n';
    const result = stripSrt(input);
    expect(result).toBe('');
  });

  it('preserves content lines that happen to contain digits but are not pure sequence numbers', () => {
    const input = '1\n00:00:01,000 --> 00:00:03,000\nChapter 10 intro\n';
    const result = stripSrt(input);
    expect(result).toBe('Chapter 10 intro');
  });
});
