/**
 * FR-58: Chapter grouping for the legacy chapter-preview status route.
 *
 * Generating chapter preview videos (title slides, FFmpeg concat, chapter SRTs) was removed when
 * chapter previews were deprecated (FliStudio roadmap §1.2e). Existing recordings/-chapters/
 * folders are left in place and still play.
 */

import path from 'path';
import fs from 'fs-extra';
import { getVideoDuration } from './videoDuration.js';
import { extractTagsFromName } from '../../../shared/naming.js';

export interface SegmentInfo {
  filename: string;
  path: string;
  sequence: number;
  label: string;
  tags: string[];
  duration: number; // seconds
}

export interface ChapterSegments {
  chapter: string;
  label: string; // From first segment
  segments: SegmentInfo[];
  totalDuration: number;
}

/**
 * Get video duration for a file
 */
export async function getSegmentDuration(filePath: string): Promise<number> {
  const duration = await getVideoDuration(filePath);
  return duration ?? 0;
}

/**
 * Parse recording filename to extract segment info
 * Format: {chapter}-{sequence}-{name}[-{tags}].mov
 */
export function parseRecordingFilename(filename: string): {
  chapter: string;
  sequence: number;
  name: string;
  tags: string[];
} | null {
  // Match pattern: 01-1-intro.mov or 01-2-demo-CTA-SKOOL.mov
  const match = filename.match(/^(\d{2})-(\d+)-(.+)\.mov$/);
  if (!match) return null;

  const [, chapter, sequence, rest] = match;

  // NFR-65: Extract tags from name using shared utility
  const { name, tags } = extractTagsFromName(rest);

  return {
    chapter,
    sequence: parseInt(sequence, 10),
    name,
    tags,
  };
}

/**
 * Group recordings by chapter
 */
export async function groupRecordingsByChapter(
  recordingsDir: string
): Promise<Map<string, ChapterSegments>> {
  const chapters = new Map<string, ChapterSegments>();

  if (!(await fs.pathExists(recordingsDir))) {
    return chapters;
  }

  const files = await fs.readdir(recordingsDir);
  const movFiles = files.filter((f) => f.endsWith('.mov') && !f.startsWith('.'));

  for (const filename of movFiles) {
    const parsed = parseRecordingFilename(filename);
    if (!parsed) continue;

    const filePath = path.join(recordingsDir, filename);
    const duration = await getSegmentDuration(filePath);

    const segment: SegmentInfo = {
      filename,
      path: filePath,
      sequence: parsed.sequence,
      label: parsed.name,
      tags: parsed.tags,
      duration,
    };

    if (!chapters.has(parsed.chapter)) {
      chapters.set(parsed.chapter, {
        chapter: parsed.chapter,
        label: parsed.name, // Will be updated to first segment's name
        segments: [],
        totalDuration: 0,
      });
    }

    const chapter = chapters.get(parsed.chapter)!;
    chapter.segments.push(segment);
    chapter.totalDuration += duration;
  }

  // Sort segments by sequence and set chapter label from first segment
  for (const chapter of chapters.values()) {
    chapter.segments.sort((a, b) => a.sequence - b.sequence);
    if (chapter.segments.length > 0) {
      chapter.label = chapter.segments[0].label;
    }
  }

  return chapters;
}
