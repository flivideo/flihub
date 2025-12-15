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
  includeTitleSlides: boolean;  // FR-76: Optional title slides (default: false)
  transcriptsDir: string;       // FR-76: Directory containing segment .srt files
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

  // Build slide text content - keep it simple and readable
  const durationSecs = Math.round(segment.duration);

  // Simple format:
  // Segment 1: intro
  // (28 seconds)
  //
  // Tags if any
  const lines = [
    `Segment ${segment.sequence}`,
    segment.label,
    '',
    `${durationSecs} seconds`,
  ];

  // Add tags on separate line if present
  if (segment.tags.length > 0) {
    lines.push('');
    lines.push(segment.tags.join('  '));
  }

  // Escape text for FFmpeg drawtext filter
  // Use actual newlines (not \\n) - FFmpeg drawtext handles real newlines
  const escapedText = lines.join('\n')
    .replace(/:/g, '\\:')
    .replace(/'/g, "'\\''");

  // FR-72: Generate title slide in H.264 + AAC to match Ecamm recordings
  // Video: H.264 yuv420p, Audio: AAC stereo 48kHz (matches Ecamm output)
  // Audio: short beep followed by silence for full slide duration
  const ffmpegArgs = [
    '-y',  // Overwrite output
    '-f', 'lavfi',
    '-i', `color=c=${SLIDE_BG_COLOR.replace('#', '0x')}:s=${width}x${height}:d=${options.slideDuration}:r=30`,
    '-f', 'lavfi',
    '-i', `aevalsrc=0:d=${options.slideDuration}:s=48000:c=stereo`,  // Silent audio for full duration
    '-f', 'lavfi',
    '-i', `sine=frequency=${BEEP_FREQUENCY}:duration=${BEEP_DURATION}:sample_rate=48000`,  // Short beep
    '-filter_complex', '[1][2]amix=inputs=2:duration=first[a]',  // Mix silence with beep
    '-map', '0:v',
    '-map', '[a]',
    '-vf', `drawtext=text='${escapedText}':fontsize=${Math.floor(height / 15)}:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2:line_spacing=10`,
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-ac', '2',
    '-ar', '48000',
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
 * FR-72: Concatenate videos using FFmpeg concat filter
 *
 * The concat filter re-encodes everything through a unified pipeline.
 * Slower than concat demuxer, but handles any input format differences.
 */
async function concatenateVideos(
  slides: string[],
  segments: SegmentInfo[],
  outputPath: string,
  resolution: '720p' | '1080p'
): Promise<void> {
  const { width, height } = RESOLUTIONS[resolution];

  // Build input arguments: -i slide1 -i seg1 -i slide2 -i seg2 ...
  const inputArgs: string[] = [];
  for (let i = 0; i < segments.length; i++) {
    inputArgs.push('-i', slides[i]);
    inputArgs.push('-i', segments[i].path);
  }

  // Build filter_complex: scale each input, then concat
  // [0:v]scale=...[v0];[1:v]scale=...[v1];...;[v0][0:a][v1][1:a]...concat=n=N:v=1:a=1[v][a]
  const totalInputs = segments.length * 2;

  // Scale each video input
  const scaleFilters: string[] = [];
  for (let i = 0; i < totalInputs; i++) {
    scaleFilters.push(`[${i}:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1[v${i}]`);
  }

  // Build concat input refs: [v0][0:a][v1][1:a]...
  const concatRefs = Array.from({ length: totalInputs }, (_, i) => `[v${i}][${i}:a]`).join('');

  const filterComplex = `${scaleFilters.join(';')};${concatRefs}concat=n=${totalInputs}:v=1:a=1[v][a]`;

  const ffmpegArgs = [
    '-y',
    ...inputArgs,
    '-filter_complex', filterComplex,
    '-map', '[v]',
    '-map', '[a]',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-c:a', 'aac',
    '-ar', '48000',
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
 * FR-76: Concatenate videos without title slides
 */
async function concatenateVideosNoSlides(
  segments: SegmentInfo[],
  outputPath: string,
  resolution: '720p' | '1080p'
): Promise<void> {
  const { width, height } = RESOLUTIONS[resolution];

  // Build input arguments
  const inputArgs: string[] = [];
  for (const segment of segments) {
    inputArgs.push('-i', segment.path);
  }

  // Scale each video input
  const scaleFilters: string[] = [];
  for (let i = 0; i < segments.length; i++) {
    scaleFilters.push(`[${i}:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1[v${i}]`);
  }

  // Build concat input refs
  const concatRefs = Array.from({ length: segments.length }, (_, i) => `[v${i}][${i}:a]`).join('');

  const filterComplex = `${scaleFilters.join(';')};${concatRefs}concat=n=${segments.length}:v=1:a=1[v][a]`;

  const ffmpegArgs = [
    '-y',
    ...inputArgs,
    '-filter_complex', filterComplex,
    '-map', '[v]',
    '-map', '[a]',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-c:a', 'aac',
    '-ar', '48000',
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
        reject(new Error(`FFmpeg concat (no slides) failed: ${stderr.slice(-500)}`));
      }
    });

    ffmpeg.on('error', (err) => {
      reject(new Error(`Failed to start FFmpeg: ${err.message}`));
    });
  });
}

/**
 * FR-76: Format seconds to SRT timestamp format (HH:MM:SS,mmm)
 */
function formatSrtTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds - Math.floor(seconds)) * 1000);

  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

/**
 * FR-76: Parse SRT file content into entries
 */
interface SrtEntry {
  index: number;
  startTime: number;
  endTime: number;
  text: string;
}

function parseSrtContent(content: string): SrtEntry[] {
  const entries: SrtEntry[] = [];
  const blocks = content.trim().split(/\n\n+/);

  for (const block of blocks) {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 3) continue;

    const index = parseInt(lines[0], 10);
    if (isNaN(index)) continue;

    const timestampMatch = lines[1].match(/(\d{2}:\d{2}:\d{2}[,\.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,\.]\d{3})/);
    if (!timestampMatch) continue;

    const parseTs = (ts: string): number => {
      const normalized = ts.replace(',', '.');
      const parts = normalized.split(':');
      const hours = parseInt(parts[0], 10) || 0;
      const minutes = parseInt(parts[1], 10) || 0;
      const secondsParts = parts[2].split('.');
      const secs = parseInt(secondsParts[0], 10) || 0;
      const millis = parseInt(secondsParts[1] || '0', 10) || 0;
      return hours * 3600 + minutes * 60 + secs + millis / 1000;
    };

    entries.push({
      index,
      startTime: parseTs(timestampMatch[1]),
      endTime: parseTs(timestampMatch[2]),
      text: lines.slice(2).join('\n'),
    });
  }

  return entries;
}

/**
 * FR-76: Generate chapter SRT by concatenating segment SRTs with time offsets
 */
async function generateChapterSrt(
  chapter: ChapterSegments,
  options: GenerateOptions
): Promise<string | null> {
  const allEntries: SrtEntry[] = [];
  let cumulative = 0;
  let entryIndex = 1;

  for (const segment of chapter.segments) {
    // Add slide duration offset if slides are enabled
    if (options.includeTitleSlides) {
      cumulative += options.slideDuration;
    }

    // Try to read segment's SRT file
    const segmentBaseName = segment.filename.replace(/\.mov$/, '');
    const srtPath = path.join(options.transcriptsDir, `${segmentBaseName}.srt`);

    if (await fs.pathExists(srtPath)) {
      const srtContent = await fs.readFile(srtPath, 'utf-8');
      const entries = parseSrtContent(srtContent);

      // Add entries with cumulative time offset
      for (const entry of entries) {
        allEntries.push({
          index: entryIndex++,
          startTime: entry.startTime + cumulative,
          endTime: entry.endTime + cumulative,
          text: entry.text,
        });
      }
    }

    // Add segment duration to cumulative offset
    cumulative += segment.duration;
  }

  if (allEntries.length === 0) {
    return null;
  }

  // Generate SRT content
  const srtContent = allEntries.map(entry =>
    `${entry.index}\n${formatSrtTimestamp(entry.startTime)} --> ${formatSrtTimestamp(entry.endTime)}\n${entry.text}`
  ).join('\n\n');

  // Write SRT file
  const srtFilename = `${chapter.chapter}-${chapter.label}.srt`;
  const srtPath = path.join(options.outputDir, srtFilename);
  await fs.writeFile(srtPath, srtContent + '\n', 'utf-8');

  return srtFilename;
}

/**
 * Generate a combined chapter recording
 */
export async function generateChapterRecording(
  chapter: ChapterSegments,
  options: GenerateOptions
): Promise<{ videoFilename: string; srtFilename: string | null }> {
  // Ensure directories exist
  await fs.ensureDir(options.outputDir);
  await fs.ensureDir(options.tempDir);

  // Generate output filename: {chapter}-{label}.mov
  const outputFilename = `${chapter.chapter}-${chapter.label}.mov`;
  const outputPath = path.join(options.outputDir, outputFilename);

  // FR-76: Generate video - with or without title slides
  if (options.includeTitleSlides) {
    // Generate title slides
    const slides: string[] = [];
    let cumulative = 0;

    for (let i = 0; i < chapter.segments.length; i++) {
      const segment = chapter.segments[i];
      const slidePath = await generateTitleSlide(i + 1, segment, cumulative, options);
      slides.push(slidePath);
      cumulative += segment.duration;
    }

    // Concatenate with slides
    await concatenateVideos(slides, chapter.segments, outputPath, options.resolution);

    // Clean up temp files
    for (const slide of slides) {
      await fs.remove(slide).catch(() => {});
    }
  } else {
    // Concatenate segments directly without slides
    await concatenateVideosNoSlides(chapter.segments, outputPath, options.resolution);
  }

  // FR-76: Generate chapter SRT file
  const srtFilename = await generateChapterSrt(chapter, options);

  return { videoFilename: outputFilename, srtFilename };
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
