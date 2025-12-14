/**
 * FR-58: Chapter Recording Generation Utility
 *
 * Generates combined preview videos for each chapter with title slides
 * between segments. Uses FFmpeg for video generation and concatenation.
 */

import { exec, spawn } from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import { getVideoDuration } from './videoDuration.js';
import { extractTagsFromName } from '../../../shared/naming.js';

// Resolution presets
const RESOLUTIONS = {
  '720p': { width: 1280, height: 720 },
  '1080p': { width: 1920, height: 1080 },
};

// Purple background color for title slides
const SLIDE_BG_COLOR = '#8B5CF6';

// Beep sound settings
const BEEP_FREQUENCY = 800;  // Hz
const BEEP_DURATION = 0.1;   // seconds

export interface SegmentInfo {
  filename: string;
  path: string;
  sequence: number;
  label: string;
  tags: string[];
  duration: number;  // seconds
}

export interface ChapterSegments {
  chapter: string;
  label: string;  // From first segment
  segments: SegmentInfo[];
  totalDuration: number;
}

export interface GenerateOptions {
  slideDuration: number;  // seconds
  resolution: '720p' | '1080p';
  outputDir: string;
  tempDir: string;
}

/**
 * Format seconds to MM:SS or H:MM:SS
 */
function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Generate a title slide video for a segment
 */
async function generateTitleSlide(
  segmentIndex: number,
  segment: SegmentInfo,
  cumulativeStart: number,
  options: GenerateOptions
): Promise<string> {
  const { width, height } = RESOLUTIONS[options.resolution];
  const outputPath = path.join(options.tempDir, `slide_${segmentIndex.toString().padStart(2, '0')}.mov`);

  // Build slide text content
  const segmentNumber = `Segment ${segment.sequence}`;
  const labelText = `"${segment.label}"`;
  const tagsText = segment.tags.length > 0 ? segment.tags.join(', ') : '';

  const startTime = formatTimestamp(cumulativeStart);
  const endTime = formatTimestamp(cumulativeStart + segment.duration);
  const durationText = `${Math.round(segment.duration)}s`;
  const timeRange = `${startTime} → ${endTime} (${durationText})`;

  const cumulativeText = `[${formatTimestamp(cumulativeStart)} into chapter]`;

  // Build multi-line text with proper escaping for FFmpeg drawtext
  // Use \n for newlines, escape special chars
  const lines = [
    segmentNumber,
    labelText,
  ];
  if (tagsText) lines.push(tagsText);
  lines.push('');  // blank line
  lines.push(timeRange);
  lines.push(cumulativeText);

  // Escape text for FFmpeg drawtext filter
  const escapedText = lines.join('\\n')
    .replace(/:/g, '\\:')
    .replace(/'/g, "'\\''");

  // FFmpeg command to generate title slide with beep
  const ffmpegArgs = [
    '-y',  // Overwrite output
    '-f', 'lavfi',
    '-i', `color=c=${SLIDE_BG_COLOR.replace('#', '0x')}:s=${width}x${height}:d=${options.slideDuration}`,
    '-f', 'lavfi',
    '-i', `sine=frequency=${BEEP_FREQUENCY}:duration=${BEEP_DURATION}`,
    '-vf', `drawtext=text='${escapedText}':fontsize=${Math.floor(height / 15)}:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2:line_spacing=10`,
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-c:a', 'aac',
    '-shortest',
    outputPath,
  ];

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', ffmpegArgs);

    let stderr = '';
    ffmpeg.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve(outputPath);
      } else {
        reject(new Error(`FFmpeg failed to generate slide: ${stderr.slice(-500)}`));
      }
    });

    ffmpeg.on('error', (err) => {
      reject(new Error(`Failed to start FFmpeg: ${err.message}`));
    });
  });
}

/**
 * Create a concat file for FFmpeg
 */
async function createConcatFile(
  slides: string[],
  segments: SegmentInfo[],
  tempDir: string
): Promise<string> {
  const concatPath = path.join(tempDir, 'concat.txt');
  const lines: string[] = [];

  for (let i = 0; i < segments.length; i++) {
    // Add slide
    lines.push(`file '${slides[i]}'`);
    // Add segment video
    lines.push(`file '${segments[i].path}'`);
  }

  await fs.writeFile(concatPath, lines.join('\n'));
  return concatPath;
}

/**
 * Concatenate videos using FFmpeg
 */
async function concatenateVideos(
  concatFile: string,
  outputPath: string,
  resolution: '720p' | '1080p'
): Promise<void> {
  const { width, height } = RESOLUTIONS[resolution];

  const ffmpegArgs = [
    '-y',  // Overwrite output
    '-f', 'concat',
    '-safe', '0',
    '-i', concatFile,
    '-vf', `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`,
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-c:a', 'aac',
    outputPath,
  ];

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', ffmpegArgs);

    let stderr = '';
    ffmpeg.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg concat failed: ${stderr.slice(-500)}`));
      }
    });

    ffmpeg.on('error', (err) => {
      reject(new Error(`Failed to start FFmpeg: ${err.message}`));
    });
  });
}

/**
 * Generate a combined chapter recording
 */
export async function generateChapterRecording(
  chapter: ChapterSegments,
  options: GenerateOptions
): Promise<string> {
  // Ensure directories exist
  await fs.ensureDir(options.outputDir);
  await fs.ensureDir(options.tempDir);

  // Generate output filename: {chapter}-{label}.mov
  const outputFilename = `${chapter.chapter}-${chapter.label}.mov`;
  const outputPath = path.join(options.outputDir, outputFilename);

  // Generate title slides
  const slides: string[] = [];
  let cumulative = 0;

  for (let i = 0; i < chapter.segments.length; i++) {
    const segment = chapter.segments[i];
    const slidePath = await generateTitleSlide(i + 1, segment, cumulative, options);
    slides.push(slidePath);
    cumulative += segment.duration;
  }

  // Create concat file
  const concatFile = await createConcatFile(slides, chapter.segments, options.tempDir);

  // Concatenate everything
  await concatenateVideos(concatFile, outputPath, options.resolution);

  // Clean up temp files
  for (const slide of slides) {
    await fs.remove(slide).catch(() => {});
  }
  await fs.remove(concatFile).catch(() => {});

  return outputFilename;
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

  if (!await fs.pathExists(recordingsDir)) {
    return chapters;
  }

  const files = await fs.readdir(recordingsDir);
  const movFiles = files.filter(f => f.endsWith('.mov') && !f.startsWith('.'));

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
        label: parsed.name,  // Will be updated to first segment's name
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

/**
 * Check if FFmpeg is available
 */
export function checkFfmpegAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    exec('ffmpeg -version', (error) => {
      resolve(!error);
    });
  });
}
