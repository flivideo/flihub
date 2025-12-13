/**
 * FR-53: ASCII Report Generators
 *
 * Functions to format query API data as human-readable ASCII reports.
 */

import {
  formatSize,
  formatDuration,
  formatAge,
  formatPercent,
  shortenPath,
  divider,
  doubleDivider,
  chapterDivider,
  toTitleCase,
  reportHeader,
  sectionHeader,
  exportHeader,
  STATUS,
  transcriptStatus,
} from './formatters.js';

// ============================================
// TYPE INTERFACES (match query.ts types)
// ============================================

interface ProjectSummary {
  code: string;
  stage: string;
  priority: string;
  stats: {
    recordings: number;
    chapters: number;
    transcriptPercent: number;
    images: number;
    thumbs: number;
  };
  lastModified: string | null;
}

interface ProjectDetail {
  code: string;
  path: string;
  stage: string;
  priority: string;
  stats: {
    recordings: number;
    safe: number;
    chapters: number;
    transcripts: {
      matched: number;
      missing: number;
      orphaned: number;
    };
    images: number;
    thumbs: number;
    totalDuration: number | null;
  };
  finalMedia: {
    video?: { filename: string; size: number };
    srt?: { filename: string };
  } | null;
  createdAt: string | null;
  lastModified: string | null;
}

interface Recording {
  filename: string;
  chapter: string;
  sequence: string;
  name: string;
  tags: string[];
  folder: 'recordings' | 'safe';
  size: number;
  duration: number | null;
  hasTranscript: boolean;
}

interface Transcript {
  filename: string;
  chapter: string;
  sequence: string;
  name: string;
  size: number;
  preview?: string;
  content?: string;
}

interface Chapter {
  chapter: number;
  name: string;
  displayName: string;
  timestamp: string | null;
  timestampSeconds: number | null;
  recordingCount: number;
  hasTranscript: boolean;
}

interface Image {
  filename: string;
  chapter: string;
  sequence: string;
  imageOrder: string;
  variant: string | null;
  label: string;
  size: number;
}

// ============================================
// PROJECTS LIST REPORT
// ============================================

export function formatProjectsReport(projects: ProjectSummary[]): string {
  const lines: string[] = [];

  // Header
  lines.push(reportHeader('FliHub Projects'));

  // Column headers
  const headers = ['PROJECT', 'STAGE', 'CH', 'FILES', STATUS.TRANSCRIPT, STATUS.VIDEO];
  const widths = [-40, -5, 4, 6, 6, 3];
  lines.push(formatRowWithWidths(headers, widths));
  lines.push(divider('─', 80));

  // Project rows
  for (const p of projects) {
    const pinIcon = p.priority === 'pinned' ? STATUS.PINNED + ' ' : '   ';
    const stage = p.stage === 'none' ? '-' : p.stage.toUpperCase().slice(0, 4);
    const transcriptCol = p.stats.recordings === 0 ? '-' : formatPercent(p.stats.transcriptPercent);
    const finalCol = STATUS.ERROR; // Would need finalMedia info to show properly

    const row = [
      pinIcon + p.code,
      stage,
      p.stats.chapters || '-',
      p.stats.recordings || '-',
      transcriptCol,
      finalCol,
    ];
    lines.push(formatRowWithWidths(row, widths));
  }

  // Footer
  const pinnedCount = projects.filter(p => p.priority === 'pinned').length;
  const totalRecordings = projects.reduce((sum, p) => sum + p.stats.recordings, 0);
  lines.push('');
  lines.push(`Total: ${projects.length} projects | ${pinnedCount} pinned | ${totalRecordings} recordings`);

  return lines.join('\n');
}

// ============================================
// PROJECT DETAIL REPORT
// ============================================

export function formatProjectDetail(project: ProjectDetail): string {
  const lines: string[] = [];

  // Header
  lines.push(`${STATUS.FOLDER} Project: ${project.code}`);
  lines.push(`   Stage: ${project.stage.toUpperCase()} | Priority: ${project.priority}`);
  lines.push(`   Path: ${shortenPath(project.path)}`);
  lines.push('');

  // Stats section
  lines.push('STATS');
  lines.push(divider('─', 30));

  const totalRecordings = project.stats.recordings + project.stats.safe;
  const totalTranscripts = project.stats.transcripts.matched;
  const transcriptPercent = totalRecordings > 0
    ? Math.round((totalTranscripts / totalRecordings) * 100)
    : 0;

  lines.push(`Recordings:     ${project.stats.recordings}`);
  lines.push(`Safe:           ${project.stats.safe}`);
  lines.push(`Chapters:       ${project.stats.chapters}`);
  lines.push(`Transcripts:    ${totalTranscripts}/${totalRecordings} (${transcriptPercent}%)`);
  lines.push(`Images:         ${project.stats.images}`);
  lines.push(`Thumbnails:     ${project.stats.thumbs}`);
  if (project.stats.totalDuration) {
    lines.push(`Duration:       ${formatDuration(project.stats.totalDuration)}`);
  }
  lines.push('');

  // Final media section
  lines.push('FINAL MEDIA');
  lines.push(divider('─', 30));

  if (project.finalMedia?.video) {
    lines.push(`Video:   ${STATUS.OK} ${project.finalMedia.video.filename} (${formatSize(project.finalMedia.video.size)})`);
  } else {
    lines.push(`Video:   ${STATUS.ERROR} Not found`);
  }

  if (project.finalMedia?.srt) {
    lines.push(`SRT:     ${STATUS.OK} ${project.finalMedia.srt.filename}`);
  } else {
    lines.push(`SRT:     ${STATUS.ERROR} Not found`);
  }
  lines.push('');

  // Timestamps
  if (project.createdAt || project.lastModified) {
    const created = project.createdAt
      ? new Date(project.createdAt).toLocaleDateString('en-AU')
      : 'Unknown';
    const modified = project.lastModified ? formatAge(project.lastModified) : 'Unknown';
    lines.push(`Created: ${created} | Last modified: ${modified}`);
  }

  return lines.join('\n');
}

// ============================================
// RECORDINGS REPORT
// ============================================

export function formatRecordingsReport(recordings: Recording[], projectCode: string): string {
  const lines: string[] = [];

  // Header
  lines.push(reportHeader(`Recordings: ${projectCode}`));

  // Column headers
  const headers = ['RECORDING', 'SIZE', 'DURATION', STATUS.TRANSCRIPT];
  const widths = [-48, 10, 10, 12];
  lines.push(formatRowWithWidths(headers, widths));
  lines.push(divider('─', 80));

  // Group by chapter
  const byChapter = new Map<string, Recording[]>();
  for (const rec of recordings) {
    const chapter = rec.chapter;
    if (!byChapter.has(chapter)) {
      byChapter.set(chapter, []);
    }
    byChapter.get(chapter)!.push(rec);
  }

  // Sort chapters
  const sortedChapters = Array.from(byChapter.keys()).sort(
    (a, b) => parseInt(a, 10) - parseInt(b, 10)
  );

  let totalSize = 0;
  let totalDuration = 0;
  let transcriptCount = 0;

  for (const chapter of sortedChapters) {
    const recs = byChapter.get(chapter)!;
    // Get chapter name from first recording
    const firstName = recs[0]?.name || 'unknown';
    lines.push(chapterDivider(parseInt(chapter, 10), firstName));

    for (const rec of recs) {
      const sizeStr = formatSize(rec.size);
      const durationStr = formatDuration(rec.duration);
      const transcriptStr = transcriptStatus(rec.hasTranscript);

      const row = [`   ${rec.filename}`, sizeStr, durationStr, transcriptStr];
      lines.push(formatRowWithWidths(row, widths));

      totalSize += rec.size;
      if (rec.duration) totalDuration += rec.duration;
      if (rec.hasTranscript) transcriptCount++;
    }
  }

  // Footer
  lines.push('');
  lines.push(
    `Total: ${recordings.length} recordings | ${formatSize(totalSize)} | ${formatDuration(totalDuration)} duration`
  );
  lines.push(`Transcripts: ${transcriptCount}/${recordings.length} (${formatPercent((transcriptCount / recordings.length) * 100)})`);

  return lines.join('\n');
}

// ============================================
// TRANSCRIPTS REPORT
// ============================================

export function formatTranscriptsReport(transcripts: Transcript[], projectCode: string): string {
  const lines: string[] = [];

  // Header
  lines.push(reportHeader(`Transcripts: ${projectCode}`));

  // Column headers
  const headers = ['TRANSCRIPT', 'SIZE', 'PREVIEW'];
  const widths = [-40, 10, 30];
  lines.push(formatRowWithWidths(headers, widths));
  lines.push(divider('─', 80));

  let totalSize = 0;

  for (const t of transcripts) {
    const preview = t.preview || '';
    const truncatedPreview = preview.length > 28 ? preview.slice(0, 28) + '...' : preview;

    const row = [t.filename, formatSize(t.size), truncatedPreview];
    lines.push(formatRowWithWidths(row, widths));

    totalSize += t.size;
  }

  // Footer
  lines.push('');
  lines.push(`Total: ${transcripts.length} transcripts | ${formatSize(totalSize)}`);

  return lines.join('\n');
}

// ============================================
// CHAPTERS REPORT (YouTube-ready)
// ============================================

export function formatChaptersReport(chapters: Chapter[], projectCode: string, formatted: string): string {
  const lines: string[] = [];

  // Header
  lines.push(reportHeader(`Chapters: ${projectCode}`));

  // If we have YouTube-formatted output, show it
  if (formatted && formatted.trim().length > 0) {
    lines.push(formatted);
  } else {
    // Show chapters without timestamps
    for (const ch of chapters) {
      const timestamp = ch.timestamp || '??:??';
      lines.push(`${timestamp} ${ch.displayName}`);
    }
  }

  // Footer
  lines.push('');
  lines.push(divider('─', 30));
  const hasTimestamps = chapters.filter(c => c.timestamp).length;
  if (hasTimestamps === chapters.length) {
    lines.push(`${chapters.length} chapters | Ready for YouTube description`);
  } else {
    lines.push(`${chapters.length} chapters | ${hasTimestamps} with timestamps`);
  }

  return lines.join('\n');
}

// ============================================
// IMAGES REPORT
// ============================================

export function formatImagesReport(images: Image[], projectCode: string): string {
  const lines: string[] = [];

  // Header
  lines.push(reportHeader(`Images: ${projectCode}`));

  // Column headers
  const headers = ['IMAGE', 'CHAPTER', 'SEQ', 'SIZE'];
  const widths = [-45, 8, 5, 10];
  lines.push(formatRowWithWidths(headers, widths));
  lines.push(divider('─', 70));

  let totalSize = 0;

  for (const img of images) {
    const variant = img.variant ? ` [${img.variant.toUpperCase()}]` : '';
    const row = [
      img.filename + variant,
      img.chapter,
      img.sequence,
      formatSize(img.size),
    ];
    lines.push(formatRowWithWidths(row, widths));

    totalSize += img.size;
  }

  // Footer
  lines.push('');
  lines.push(`Total: ${images.length} images | ${formatSize(totalSize)}`);

  return lines.join('\n');
}

// ============================================
// FULL EXPORT REPORT
// ============================================

interface ExportData {
  exportedAt?: string;
  project?: ProjectDetail;
  recordings?: Recording[];
  transcripts?: Transcript[];
  chapters?: Chapter[];
  images?: Image[];
}

export function formatExportReport(data: ExportData, projectCode: string): string {
  const lines: string[] = [];

  // Main header
  lines.push(exportHeader(projectCode));

  // Project summary
  if (data.project) {
    lines.push('');
    lines.push(formatProjectDetail(data.project));
  }

  // Chapters
  if (data.chapters && data.chapters.length > 0) {
    lines.push('');
    lines.push(divider('─', 80));
    const formatted = data.chapters
      .filter(ch => ch.timestamp)
      .map(ch => `${ch.timestamp} ${ch.displayName}`)
      .join('\n');
    lines.push(formatChaptersReport(data.chapters, projectCode, formatted));
  }

  // Recordings
  if (data.recordings && data.recordings.length > 0) {
    lines.push('');
    lines.push(divider('─', 80));
    lines.push(formatRecordingsReport(data.recordings, projectCode));
  }

  // Transcripts (without content by default in export)
  if (data.transcripts && data.transcripts.length > 0) {
    lines.push('');
    lines.push(divider('─', 80));
    lines.push(formatTranscriptsReport(data.transcripts, projectCode));
  }

  // Images
  if (data.images && data.images.length > 0) {
    lines.push('');
    lines.push(divider('─', 80));
    lines.push(formatImagesReport(data.images, projectCode));
  }

  // Footer
  lines.push('');
  lines.push(doubleDivider(80));

  return lines.join('\n');
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Format a row with given column widths
 * Negative width = left align, positive = right align
 */
function formatRowWithWidths(columns: (string | number)[], widths: number[]): string {
  return columns
    .map((col, i) => {
      const str = String(col);
      const width = Math.abs(widths[i] || 0);
      const leftAlign = widths[i] < 0;

      if (leftAlign) {
        return str.slice(0, width).padEnd(width);
      }
      return str.slice(0, width).padStart(width);
    })
    .join('  ');
}
