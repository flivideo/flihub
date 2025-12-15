/**
 * NFR-11: File Scanning Utilities
 *
 * Shared helpers for scanning directories, counting files, and getting project metadata.
 * Extracted from duplicated code in query.ts and projects.ts.
 *
 * NFR-67: Uses readDirSafe for consistent error handling - ENOENT returns empty,
 * real errors (permissions) are thrown.
 */

import path from 'path';
import fs from 'fs-extra';
import type { TranscriptSyncStatus } from '../../../shared/types.js';
import { readDirSafe, statSafe } from './filesystem.js';

/**
 * Count .mov files in a directory
 */
export async function countMovFiles(dir: string): Promise<number> {
  const files = await readDirSafe(dir);
  return files.filter(f => f.endsWith('.mov')).length;
}

/**
 * Count .txt files in a directory (excludes *-chapter.txt combined files)
 */
export async function countTxtFiles(dir: string): Promise<number> {
  const files = await readDirSafe(dir);
  return files.filter(f => f.endsWith('.txt') && !f.endsWith('-chapter.txt')).length;
}

/**
 * Count files with specific extensions in a directory
 */
export async function countFiles(dir: string, extensions: string[]): Promise<number> {
  const files = await readDirSafe(dir);
  return files.filter(f => extensions.some(ext => f.toLowerCase().endsWith(ext))).length;
}

/**
 * Count unique chapter numbers from recordings in both recordings/ and safe/ directories
 */
export async function countUniqueChapters(recordingsDir: string, safeDir: string): Promise<number> {
  const chapters = new Set<string>();

  for (const dir of [recordingsDir, safeDir]) {
    const files = await readDirSafe(dir);
    for (const file of files) {
      const match = file.match(/^(\d{2})-/);
      if (match) chapters.add(match[1]);
    }
  }

  return chapters.size;
}

/**
 * Get transcript sync status by matching recording filenames to transcript filenames
 * Returns a TranscriptSyncStatus object compatible with the shared type
 */
export async function getTranscriptSyncStatus(
  recordingsDir: string,
  safeDir: string,
  transcriptsDir: string
): Promise<TranscriptSyncStatus> {
  // Get all .mov files (base names without extension)
  const recordingFiles: string[] = [];
  for (const dir of [recordingsDir, safeDir]) {
    const files = await readDirSafe(dir);
    recordingFiles.push(
      ...files.filter(f => f.endsWith('.mov')).map(f => f.replace('.mov', ''))
    );
  }

  // FR-78: Get transcript files - require BOTH .txt AND .srt for "complete"
  const transcriptDirFiles = await readDirSafe(transcriptsDir);

  // Get base names for txt files (exclude chapter transcripts)
  const txtFiles = new Set(
    transcriptDirFiles
      .filter(f => f.endsWith('.txt') && !f.endsWith('-chapter.txt'))
      .map(f => f.replace('.txt', ''))
  );

  // Get base names for srt files
  const srtFiles = new Set(
    transcriptDirFiles
      .filter(f => f.endsWith('.srt'))
      .map(f => f.replace('.srt', ''))
  );

  // A transcript is "complete" only if BOTH .txt and .srt exist
  const completeTranscripts = new Set(
    [...txtFiles].filter(name => srtFiles.has(name))
  );

  const recordingSet = new Set(recordingFiles);

  const matched = recordingFiles.filter(r => completeTranscripts.has(r)).length;
  const missingTranscripts = recordingFiles.filter(r => !completeTranscripts.has(r));

  // Orphaned = txt files without matching recording (srt-only files are ignored)
  const orphanedTranscripts = [...txtFiles].filter(t => !recordingSet.has(t));

  return { matched, missingTranscripts, orphanedTranscripts };
}

/**
 * Project timestamp result
 */
export interface ProjectTimestamps {
  createdAt: string | null;
  lastModified: string | null;
}

/**
 * Get project creation and last modified timestamps
 * Scans subdirectories to find the most recently modified file
 */
export async function getProjectTimestamps(projectPath: string): Promise<ProjectTimestamps> {
  const projectStat = await statSafe(projectPath);
  if (!projectStat) {
    return { createdAt: null, lastModified: null };
  }

  const createdAt = projectStat.birthtime.toISOString();

  // Find most recent file across all subdirs
  let latestTime = 0;
  const subdirs = ['recordings', 'recordings/-safe', 'recording-transcripts', 'assets/images', 'assets/thumbs'];

  for (const subdir of subdirs) {
    const dir = path.join(projectPath, subdir);
    const files = await readDirSafe(dir);
    for (const file of files) {
      const fileStat = await statSafe(path.join(dir, file));
      if (fileStat && fileStat.mtimeMs > latestTime) {
        latestTime = fileStat.mtimeMs;
      }
    }
  }

  return {
    createdAt,
    lastModified: latestTime > 0 ? new Date(latestTime).toISOString() : null,
  };
}

/**
 * List .mov files in a directory
 */
export async function listMovFiles(dir: string): Promise<string[]> {
  const files = await readDirSafe(dir);
  return files.filter(f => f.endsWith('.mov'));
}

/**
 * List .txt transcript files in a directory (excludes *-chapter.txt combined files)
 */
export async function listTranscriptFiles(dir: string): Promise<string[]> {
  const files = await readDirSafe(dir);
  return files.filter(f => f.endsWith('.txt') && !f.endsWith('-chapter.txt'));
}

/**
 * NFR-65: Get transcript basenames (without .txt extension)
 * Filters .txt files, excludes *-chapter.txt combined files
 */
export async function getTranscriptBasenames(dir: string): Promise<string[]> {
  const files = await readDirSafe(dir);
  return files
    .filter(f => f.endsWith('.txt') && !f.endsWith('-chapter.txt'))
    .map(f => f.replace('.txt', ''));
}

/**
 * FR-80: Project content indicators
 * Returns booleans indicating presence of inbox, assets, and chapter videos
 */
export interface ProjectIndicators {
  hasInbox: boolean;
  hasAssets: boolean;
  hasChapters: boolean;
}

/**
 * FR-80: Check if a project has content in key directories
 */
export async function getProjectIndicators(projectPath: string): Promise<ProjectIndicators> {
  const inboxDir = path.join(projectPath, 'inbox');
  const imagesDir = path.join(projectPath, 'assets', 'images');
  const promptsDir = path.join(projectPath, 'assets', 'prompts');
  const chaptersDir = path.join(projectPath, 'recordings', '-chapters');

  // Check inbox - any files or subdirectories count
  const inboxFiles = await readDirSafe(inboxDir);
  const hasInbox = inboxFiles.length > 0;

  // Check assets - either images or prompts directory has files
  const imageFiles = await readDirSafe(imagesDir);
  const promptFiles = await readDirSafe(promptsDir);
  const hasAssets = imageFiles.length > 0 || promptFiles.length > 0;

  // Check chapters - .mov files in -chapters directory
  const chapterFiles = await readDirSafe(chaptersDir);
  const hasChapters = chapterFiles.some(f => f.endsWith('.mov'));

  return { hasInbox, hasAssets, hasChapters };
}
