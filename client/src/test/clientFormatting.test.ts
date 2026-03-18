import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  formatFileSize,
  collapsePath,
  toKebabCase,
  formatDuration,
  formatChapterTitle,
  formatRelativeTime,
  formatDate,
  formatTimestamp,
  formatTime,
} from '../utils/formatting.js';

// ============================================================
// formatFileSize
// ============================================================
describe('formatFileSize', () => {
  it('formats bytes under 1 KB', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(500)).toBe('500 B');
    expect(formatFileSize(1023)).toBe('1023 B');
  });

  it('formats KB range', () => {
    expect(formatFileSize(1024)).toBe('1.0 KB');
    expect(formatFileSize(1536)).toBe('1.5 KB');
    expect(formatFileSize(1024 * 1023)).toBe('1023.0 KB');
  });

  it('formats MB range', () => {
    expect(formatFileSize(1024 * 1024)).toBe('1.0 MB');
    expect(formatFileSize(1024 * 1024 * 10)).toBe('10.0 MB');
    expect(formatFileSize(1024 * 1024 * 1023)).toBe('1023.0 MB');
  });

  it('formats GB range with 2 decimal places', () => {
    expect(formatFileSize(1024 * 1024 * 1024)).toBe('1.00 GB');
    expect(formatFileSize(1024 * 1024 * 1024 * 2.5)).toBe('2.50 GB');
  });
});

// ============================================================
// collapsePath
// ============================================================
describe('collapsePath', () => {
  it('collapses /Users/<username>/ paths to ~/', () => {
    expect(collapsePath('/Users/davidcruwys/dev/foo')).toBe('~/dev/foo');
    expect(collapsePath('/Users/alice/Documents/file.txt')).toBe('~/Documents/file.txt');
  });

  it('returns path unchanged if it does not start with /Users/', () => {
    expect(collapsePath('/var/tmp/foo')).toBe('/var/tmp/foo');
    expect(collapsePath('relative/path')).toBe('relative/path');
  });

  it('returns path unchanged if there is no slash after the username', () => {
    // /Users/alice with no trailing slash — slashIndex would be -1
    expect(collapsePath('/Users/alice')).toBe('/Users/alice');
  });
});

// ============================================================
// toKebabCase
// ============================================================
describe('toKebabCase', () => {
  it('converts spaces to dashes', () => {
    expect(toKebabCase('hello world')).toBe('hello-world');
    expect(toKebabCase('My Label')).toBe('my-label');
  });

  it('lowercases the result', () => {
    expect(toKebabCase('FooBar')).toBe('foobar');
    expect(toKebabCase('UPPER CASE')).toBe('upper-case');
  });

  it('removes invalid characters (keeps alphanumeric, hyphens, spaces)', () => {
    expect(toKebabCase('My Label!')).toBe('my-label');
    // dots and at-signs are stripped; alphanumerics survive
    // 'hello@world.com' → remove @ → 'helloworldcom' (dot also removed)
    expect(toKebabCase('hello@world.com')).toBe('helloworldcom');
  });

  it('collapses multiple dashes', () => {
    expect(toKebabCase('foo---bar')).toBe('foo-bar');
    expect(toKebabCase('a  b')).toBe('a-b');
  });

  it('trims leading and trailing dashes', () => {
    expect(toKebabCase('-leading')).toBe('leading');
    expect(toKebabCase('trailing-')).toBe('trailing');
    expect(toKebabCase('-both-')).toBe('both');
  });

  it('handles unicode characters by stripping them (only a-z0-9 survive)', () => {
    // Unicode letters are removed because the regex only keeps a-z0-9 after lowercasing
    expect(toKebabCase('café latte')).toBe('caf-latte');
    expect(toKebabCase('über cool')).toBe('ber-cool');
  });

  it('handles empty string', () => {
    expect(toKebabCase('')).toBe('');
  });
});

// ============================================================
// formatDuration
// ============================================================
describe('formatDuration', () => {
  describe('null / undefined', () => {
    it('returns "-" for null', () => {
      expect(formatDuration(null)).toBe('-');
    });

    it('returns "-" for undefined', () => {
      expect(formatDuration(undefined)).toBe('-');
    });
  });

  describe('smart style (default)', () => {
    it('formats zero seconds', () => {
      expect(formatDuration(0)).toBe('0s');
    });

    it('adds "s" suffix for durations under 60 seconds', () => {
      expect(formatDuration(18)).toBe('18s');
      expect(formatDuration(59)).toBe('59s');
    });

    it('formats minutes without hours', () => {
      expect(formatDuration(60)).toBe('1:00');
      expect(formatDuration(90)).toBe('1:30');
      expect(formatDuration(154)).toBe('2:34');
    });

    it('formats hours:minutes:seconds', () => {
      expect(formatDuration(3600)).toBe('1:00:00');
      expect(formatDuration(3754)).toBe('1:02:34');
    });

    it('floors fractional seconds', () => {
      expect(formatDuration(59.9)).toBe('59s');
      expect(formatDuration(60.9)).toBe('1:00');
    });
  });

  describe('youtube style', () => {
    it('zero-pads to MM:SS for under 1 hour', () => {
      expect(formatDuration(0, 'youtube')).toBe('00:00');
      expect(formatDuration(18, 'youtube')).toBe('00:18');
      expect(formatDuration(90, 'youtube')).toBe('01:30');
    });

    it('formats as H:MM:SS when >= 1 hour', () => {
      expect(formatDuration(3600, 'youtube')).toBe('1:00:00');
      expect(formatDuration(3754, 'youtube')).toBe('1:02:34');
    });
  });

  describe('seconds style', () => {
    it('returns raw total seconds as string', () => {
      expect(formatDuration(0, 'seconds')).toBe('0');
      expect(formatDuration(18, 'seconds')).toBe('18');
      expect(formatDuration(90, 'seconds')).toBe('90');
      expect(formatDuration(3754, 'seconds')).toBe('3754');
    });

    it('floors fractional seconds', () => {
      expect(formatDuration(18.7, 'seconds')).toBe('18');
    });
  });
});

// ============================================================
// formatChapterTitle
// ============================================================
describe('formatChapterTitle', () => {
  it('returns empty string for falsy input', () => {
    expect(formatChapterTitle('')).toBe('');
  });

  it('converts kebab-case to Title Case', () => {
    expect(formatChapterTitle('poem-planning')).toBe('Poem Planning');
    expect(formatChapterTitle('intro')).toBe('Intro');
  });

  it('strips trailing uppercase tags before converting', () => {
    // "setup-bmad-TECHSTACK" → strip TECHSTACK → "setup-bmad" → "Setup Bmad"
    expect(formatChapterTitle('setup-bmad-TECHSTACK')).toBe('Setup Bmad');
    expect(formatChapterTitle('intro-demo-CTA')).toBe('Intro Demo');
    expect(formatChapterTitle('intro-demo-CTA-SKOOL')).toBe('Intro Demo');
  });

  it('all-uppercase words are treated as tags and stripped, leaving empty string', () => {
    // extractTagsFromName treats every all-uppercase part as a tag, so
    // 'HELLO-WORLD' → both parts are tags → name is '' → result is ''
    expect(formatChapterTitle('HELLO-WORLD')).toBe('');
  });
});

// ============================================================
// formatRelativeTime
// ============================================================
describe('formatRelativeTime', () => {
  it('returns "-" for null', () => {
    expect(formatRelativeTime(null)).toBe('-');
  });

  it('returns "just now" for timestamps in the future or 0s diff', () => {
    const futureDate = new Date(Date.now() + 1000);
    expect(formatRelativeTime(futureDate)).toBe('just now');
  });

  it('formats seconds ago', () => {
    const date = new Date(Date.now() - 30 * 1000);
    expect(formatRelativeTime(date)).toBe('30s ago');
  });

  it('formats minutes ago', () => {
    const date = new Date(Date.now() - 5 * 60 * 1000);
    expect(formatRelativeTime(date)).toBe('5m ago');
  });

  it('formats hours ago', () => {
    const date = new Date(Date.now() - 3 * 60 * 60 * 1000);
    expect(formatRelativeTime(date)).toBe('3h ago');
  });

  it('formats days ago for 1–29 days', () => {
    const date = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    expect(formatRelativeTime(date)).toBe('7d ago');
  });

  it('accepts ISO string input', () => {
    const date = new Date(Date.now() - 45 * 1000);
    expect(formatRelativeTime(date.toISOString())).toBe('45s ago');
  });
});

// ============================================================
// formatDate
// ============================================================
describe('formatDate', () => {
  it('returns "-" for null', () => {
    expect(formatDate(null)).toBe('-');
  });

  it('formats a date in en-AU locale (e.g. "15 Dec 2025")', () => {
    // Use a fixed date in UTC that won't shift between timezones during CI
    const result = formatDate('2025-12-15T00:00:00+11:00');
    // The result is locale-formatted; just confirm shape and year presence
    expect(result).toContain('2025');
    expect(result).toMatch(/\d/);
  });

  it('accepts a Date object', () => {
    const date = new Date('2025-01-01T12:00:00Z');
    const result = formatDate(date);
    expect(result).toContain('2025');
  });
});

// ============================================================
// formatTimestamp
// ============================================================
describe('formatTimestamp', () => {
  afterEach(() => vi.useRealTimers());

  it('returns time string (HH:MM) for a timestamp from today', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-16T14:30:00'));
    // Same calendar day — should format as time only
    const result = formatTimestamp(new Date('2026-03-16T09:15:00').getTime());
    // toLocaleTimeString with hour:'2-digit' minute:'2-digit' produces e.g. "09:15 AM"
    expect(result).toMatch(/\d{1,2}:\d{2}/);
    // Should NOT contain the year (it's a time-only display)
    expect(result).not.toContain('2026');
  });

  it('returns date string for a timestamp not from today', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-16T14:30:00'));
    // Different calendar day — should format as a date
    const result = formatTimestamp(new Date('2025-06-15T09:15:00').getTime());
    // toLocaleDateString produces e.g. "6/15/2025"
    expect(result).toContain('2025');
  });

  it('accepts a numeric timestamp (ms since epoch) and returns a date string for a past date', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-16T14:30:00'));
    const ms = new Date('2020-06-01T00:00:00').getTime();
    const result = formatTimestamp(ms);
    // Past date — toLocaleDateString should include the year
    expect(result).toContain('2020');
  });
});

// ============================================================
// formatTime
// ============================================================
describe('formatTime', () => {
  it('returns a time string containing hours and minutes from an ISO timestamp', () => {
    // toLocaleTimeString with hour:'2-digit' minute:'2-digit' produces e.g. "09:15 AM" or "14:30"
    // Use a local-time ISO string to avoid UTC offset shifting the hour
    const result = formatTime('2025-06-15T09:15:00');
    // Must contain a colon-separated HH:MM pattern
    expect(result).toMatch(/\d{1,2}:\d{2}/);
    // Must contain the minute value 15
    expect(result).toContain('15');
  });

  it('returns a different time string for a different hour', () => {
    const result = formatTime('2025-06-15T20:45:00');
    expect(result).toMatch(/\d{1,2}:\d{2}/);
    // Must contain the minute value 45
    expect(result).toContain('45');
  });
});
