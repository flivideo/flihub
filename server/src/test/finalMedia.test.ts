import { describe, it, expect } from 'vitest';
import { extractVersion, isAdditionalSegment } from '../utils/finalMedia.js';

// ── extractVersion ────────────────────────────────────────────────────────────
// Signature: extractVersion(filename: string): number | undefined
// Pattern:   /-v(\d+)\.[^.]+$/ — must appear at end of filename before extension

describe('extractVersion', () => {
  it('returns numeric version 1 for a -v1 suffix', () => {
    expect(extractVersion('b64-final-v1.mp4')).toBe(1);
  });

  it('returns numeric version 3 for a -v3 suffix', () => {
    expect(extractVersion('b64-final-v3.mp4')).toBe(3);
  });

  it('returns a higher version number correctly', () => {
    expect(extractVersion('b64-final-v10.mp4')).toBe(10);
  });

  it('returns undefined when no version tag is present', () => {
    expect(extractVersion('b64-final.mp4')).toBeUndefined();
  });

  it('returns undefined for a bare project code filename', () => {
    expect(extractVersion('b64.mp4')).toBeUndefined();
  });

  it('returns undefined when version tag is not at end of filename', () => {
    // -v2 is not immediately before the extension → no match
    expect(extractVersion('b64-v2-final.mp4')).toBeUndefined();
  });

  it('returns the version number as a number type (not string)', () => {
    const result = extractVersion('project-v5.mp4');
    expect(typeof result).toBe('number');
    expect(result).toBe(5);
  });

  it('returns undefined for an empty string', () => {
    expect(extractVersion('')).toBeUndefined();
  });
});

// ── isAdditionalSegment ────────────────────────────────────────────────────────
// Signature: isAdditionalSegment(filename: string, projectCode: string): boolean
//
// Main video patterns (→ false):
//   ^{code}$               e.g. b64.mp4
//   ^{code}-final          e.g. b64-final.mp4, b64-final-v1.mp4
//   ^{code}-[^-]+$         e.g. b64-intro.mp4 (code + single suffix, no extra dash)
//
// Segment patterns (→ true) regardless of code:
//   /outro$/i, /talking-head/i, /demonstration/i, /segment/i
//
// Falls back to dash count: starts with code + '-' and has 2+ dashes → true

describe('isAdditionalSegment', () => {
  const code = 'b64';

  // ── main video patterns (should return false) ──────────────────────────────

  it('returns false for exact project code filename', () => {
    expect(isAdditionalSegment('b64.mp4', code)).toBe(false);
  });

  it('returns false for {code}-final.mp4', () => {
    expect(isAdditionalSegment('b64-final.mp4', code)).toBe(false);
  });

  it('returns false for {code}-final-v1.mp4', () => {
    expect(isAdditionalSegment('b64-final-v1.mp4', code)).toBe(false);
  });

  it('returns false for {code}-final-v3.mp4', () => {
    expect(isAdditionalSegment('b64-final-v3.mp4', code)).toBe(false);
  });

  it('returns false for {code}-singlesuffix.mp4 (one dash, no extra parts)', () => {
    // Matches ^{code}-[^-]+$ because there are no additional dashes
    expect(isAdditionalSegment('b64-intro.mp4', code)).toBe(false);
  });

  // ── explicit segment keyword patterns ─────────────────────────────────────
  // Note: {code}-[singleword].mp4 is caught by the main pattern ^{code}-[^-]+$
  // and returns false BEFORE keyword patterns are checked. Keywords only fire
  // when the filename escapes all three main patterns — e.g. when it contains
  // multiple dash-separated parts after the code, or doesn't start with the code.

  it('returns false for {code}-outro.mp4 (caught by main single-suffix pattern)', () => {
    // ^b64-[^-]+$ matches "b64-outro" → returns false before keyword check
    expect(isAdditionalSegment('b64-outro.mp4', code)).toBe(false);
  });

  it('returns false for {code}-demonstration.mp4 (caught by main single-suffix pattern)', () => {
    expect(isAdditionalSegment('b64-demonstration.mp4', code)).toBe(false);
  });

  it('returns true for {code}-part-outro.mp4 (keyword fires after 2-dash escape)', () => {
    // "b64-part-outro" → doesn't match any main pattern (has 2 dashes after code),
    // then /outro$/i matches → true
    expect(isAdditionalSegment('b64-part-outro.mp4', code)).toBe(true);
  });

  it('returns true for outro keyword in a filename not starting with project code', () => {
    expect(isAdditionalSegment('standalone-outro.mp4', code)).toBe(true);
  });

  it('returns true for outro keyword case-insensitively in a non-main filename', () => {
    expect(isAdditionalSegment('standalone-Outro.mp4', code)).toBe(true);
  });

  it('returns true for a filename containing "talking-head" (two dashes, code prefix)', () => {
    // "b64-talking-head" → 2 dashes, doesn't match ^b64-[^-]+$
    // /talking-head/i matches → true
    expect(isAdditionalSegment('b64-talking-head.mp4', code)).toBe(true);
  });

  it('returns true for a filename containing "segment" with extra part', () => {
    expect(isAdditionalSegment('b64-segment-1.mp4', code)).toBe(true);
  });

  // ── dash-count heuristic: starts with code and has 2+ dashes → true ────────

  it('returns true for {code}-with-extra-parts (≥2 dashes, not a keyword pattern)', () => {
    // "b64-custom-clip" → starts with "b64-", dash count = 2, not a main pattern
    expect(isAdditionalSegment('b64-custom-clip.mp4', code)).toBe(true);
  });

  it('returns true for {code} with three extra dash-separated parts', () => {
    expect(isAdditionalSegment('b64-part-a-end.mp4', code)).toBe(true);
  });

  // ── unrelated filename (doesn't start with project code) ──────────────────

  it('returns false for a filename that does not start with project code and has no segment keywords', () => {
    // No segment keywords, doesn't start with code — falls through to return false
    expect(isAdditionalSegment('unrelated-file.mp4', code)).toBe(false);
  });

  // ── full path input (basename is extracted) ────────────────────────────────

  it('handles a full path — extracts basename correctly', () => {
    expect(isAdditionalSegment('/project/s3-staging/b64-final.mp4', code)).toBe(false);
  });

  it('handles a full path for a segment (keyword after multi-dash escape)', () => {
    // basename = "b64-part-outro" → passes main patterns, /outro$/i fires → true
    expect(isAdditionalSegment('/project/s3-staging/b64-part-outro.mp4', code)).toBe(true);
  });

  // ── project code with regex special characters (e.g. dot in "b64.1") ────────
  // The dot must be treated as a literal character, not a regex wildcard.

  it('returns false for exact match when code contains a dot (b64.1.mp4)', () => {
    // "b64.1" as regex without escaping would treat the dot as any char,
    // matching e.g. "b6411". Escaping ensures literal dot match only.
    expect(isAdditionalSegment('b64.1.mp4', 'b64.1')).toBe(false);
  });

  it('returns false for {code}-final.mp4 when code contains a dot', () => {
    expect(isAdditionalSegment('b64.1-final.mp4', 'b64.1')).toBe(false);
  });

  it('returns false for {code}-singlesuffix.mp4 when code contains a dot', () => {
    expect(isAdditionalSegment('b64.1-setup.mp4', 'b64.1')).toBe(false);
  });

  it('returns true for {code}-part-outro.mp4 when code contains a dot', () => {
    // "b64.1-part-outro" → 2 dashes after code, /outro$/i fires → true
    expect(isAdditionalSegment('b64.1-part-outro.mp4', 'b64.1')).toBe(true);
  });

  it('returns true for {code}-custom-clip.mp4 when code contains a dot (dash heuristic)', () => {
    expect(isAdditionalSegment('b64.1-custom-clip.mp4', 'b64.1')).toBe(true);
  });
});
