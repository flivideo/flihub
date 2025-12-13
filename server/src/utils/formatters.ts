/**
 * FR-53: ASCII Report Formatter Utilities
 *
 * Formatting utilities for human-readable ASCII output from query endpoints.
 * Inspired by DAM formatting patterns in appydave-tools.
 */

import os from 'os';

// ============================================
// SIZE & DURATION FORMATTING
// ============================================

/**
 * Format bytes into human-readable size (e.g., "1.5 GB")
 */
export function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const size = bytes / Math.pow(1024, exp);

  return `${size.toFixed(1)} ${units[exp]}`;
}

/**
 * Format seconds into duration string (e.g., "2:34" or "1:02:34")
 */
export function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === 0) return '-';

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format relative time (e.g., "3d ago", "2w ago")
 */
export function formatAge(date: Date | string | null): string {
  if (!date) return 'N/A';

  const time = typeof date === 'string' ? new Date(date) : date;
  const seconds = (Date.now() - time.getTime()) / 1000;

  if (seconds < 60) return 'just now';

  const minutes = seconds / 60;
  if (minutes < 60) return `${Math.round(minutes)}m ago`;

  const hours = minutes / 60;
  if (hours < 24) return `${Math.round(hours)}h ago`;

  const days = hours / 24;
  if (days < 7) return `${Math.round(days)}d ago`;

  const weeks = days / 7;
  if (weeks < 4) return `${Math.round(weeks)}w ago`;

  const months = days / 30;
  if (months < 12) return `${Math.round(months)}mo ago`;

  const years = days / 365;
  return `${Math.round(years)}y ago`;
}

// ============================================
// PATH FORMATTING
// ============================================

/**
 * Shorten path by replacing home directory with ~
 */
export function shortenPath(path: string): string {
  return path.replace(os.homedir(), '~');
}

// ============================================
// TABLE FORMATTING
// ============================================

/**
 * Create a horizontal divider line
 */
export function divider(char = '─', width = 80): string {
  return char.repeat(width);
}

/**
 * Create a double-line divider (for major sections)
 */
export function doubleDivider(width = 80): string {
  return '═'.repeat(width);
}

/**
 * Format a row with fixed-width columns
 * @param columns Array of column values
 * @param widths Array of column widths (negative for left-align, positive for right-align)
 */
export function formatRow(columns: (string | number)[], widths: number[]): string {
  return columns
    .map((col, i) => {
      const str = String(col);
      const width = Math.abs(widths[i] || 0);
      const leftAlign = widths[i] < 0;

      if (leftAlign) {
        return str.padEnd(width);
      }
      return str.padStart(width);
    })
    .join('  ');
}

/**
 * Create a chapter section divider
 * Example: "── Chapter 01: intro ──────────────────────────"
 */
export function chapterDivider(chapterNum: number, name: string, width = 80): string {
  const label = `── Chapter ${String(chapterNum).padStart(2, '0')}: ${name} `;
  const remaining = width - label.length;
  return label + '─'.repeat(Math.max(0, remaining));
}

// ============================================
// TITLE CASE
// ============================================

/**
 * Convert kebab-case to Title Case
 * Example: "intro-setup" -> "Intro Setup"
 */
export function toTitleCase(str: string): string {
  return str
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// ============================================
// STATUS INDICATORS
// ============================================

export const STATUS = {
  OK: '✅',
  WARNING: '⚠️',
  ERROR: '❌',
  PINNED: '📌',
  FOLDER: '📂',
  TRANSCRIPT: '📄',
  VIDEO: '🎬',
};

/**
 * Get transcript status indicator
 */
export function transcriptStatus(hasTranscript: boolean): string {
  return hasTranscript ? STATUS.OK : `${STATUS.WARNING} missing`;
}

/**
 * Get percentage display
 */
export function formatPercent(value: number): string {
  if (value === 0) return '0%';
  if (value === 100) return '100%';
  return `${Math.round(value)}%`;
}

// ============================================
// REPORT HEADERS & FOOTERS
// ============================================

/**
 * Create a report header
 */
export function reportHeader(title: string, subtitle?: string, width = 80): string {
  const date = new Date().toLocaleString('en-AU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const lines: string[] = [];
  lines.push(`${STATUS.FOLDER} ${title}`.padEnd(width - date.length) + date);
  if (subtitle) {
    lines.push(`   ${subtitle}`);
  }
  lines.push('');
  return lines.join('\n');
}

/**
 * Create a section header
 */
export function sectionHeader(title: string): string {
  return `\n${title}\n${divider('─', title.length)}\n`;
}

/**
 * Create a full export header (for combined reports)
 */
export function exportHeader(projectCode: string, width = 80): string {
  const date = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const lines: string[] = [];
  lines.push(doubleDivider(width));
  lines.push(centerText('FliHub Project Export', width));
  lines.push(centerText(projectCode, width));
  lines.push(centerText(`Generated: ${date}`, width));
  lines.push(doubleDivider(width));
  return lines.join('\n');
}

/**
 * Center text within a width
 */
function centerText(text: string, width: number): string {
  const padding = Math.max(0, Math.floor((width - text.length) / 2));
  return ' '.repeat(padding) + text;
}
