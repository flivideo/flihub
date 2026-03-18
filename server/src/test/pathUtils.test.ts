import { describe, it, expect } from 'vitest';
import os from 'os';
import { expandPath, queryString } from '../utils/pathUtils.js';

describe('expandPath', () => {
  it('expands a tilde-prefixed path to an absolute path', () => {
    const result = expandPath('~/documents');
    expect(result.startsWith('/')).toBe(true);
    expect(result).not.toContain('~');
  });

  it('expands tilde to the home directory', () => {
    const result = expandPath('~/documents');
    expect(result).toBe(`${os.homedir()}/documents`);
  });

  it('expands bare tilde to home directory', () => {
    const result = expandPath('~');
    expect(result).toBe(os.homedir());
  });

  it('returns an absolute path unchanged', () => {
    const result = expandPath('/absolute/path');
    expect(result).toBe('/absolute/path');
  });

  it('returns an empty string unchanged', () => {
    const result = expandPath('');
    expect(result).toBe('');
  });

  it('returns a relative path (no tilde) unchanged', () => {
    const result = expandPath('relative/path');
    expect(result).toBe('relative/path');
  });
});

describe('queryString', () => {
  it('returns the string value when given a plain string', () => {
    expect(queryString('hello')).toBe('hello');
  });

  it('returns the default value when given undefined', () => {
    expect(queryString(undefined)).toBe('');
  });

  it('returns the default value when given null', () => {
    // null is not in the type signature but the implementation guards against it
    expect(queryString(null as unknown as undefined)).toBe('');
  });

  it('returns a custom default value when given undefined', () => {
    expect(queryString(undefined, 'fallback')).toBe('fallback');
  });

  it('returns the default value when the string is empty', () => {
    expect(queryString('', 'fallback')).toBe('fallback');
  });

  it('returns the first element of a string array', () => {
    expect(queryString(['first', 'second'])).toBe('first');
  });

  it('returns the default value when the first array element is empty', () => {
    expect(queryString(['', 'second'], 'fallback')).toBe('fallback');
  });

  it('returns the default value when a non-string object is passed', () => {
    expect(queryString({ key: 'value' } as Record<string, unknown>)).toBe('');
  });

  it('returns the default value when the first array element is a non-string object', () => {
    expect(queryString([{ key: 'value' }] as Record<string, unknown>[])).toBe('');
  });

  it('returns custom default value when given a non-string object', () => {
    expect(queryString({ key: 'value' } as Record<string, unknown>, 'default')).toBe('default');
  });
});
