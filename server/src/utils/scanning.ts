/**
 * NFR-11: File Scanning Utilities
 *
 * Shared helpers for scanning directories, counting files, and getting project metadata.
 * Extracted from duplicated code in query.ts and projects.ts.
 */

import path from 'path';
import fs from 'fs-extra';
import type { TranscriptSyncStatus } from '../../../shared/types.js';

/**
 * Count .mov files in a directory
 */
export async function countMovFiles(dir: string): Promise<number> {
  try {
    const files = await fs.readdir(dir);
    return files.filter(f => f.endsWith('.mov')).length;
  } catch {
    return 0;
  }
}

/**
 * Count .txt files in a directory (excludes *-chapter.txt combined files)
 */
export async function countTxtFiles(dir: string): Promise<number> {
  try {
    const files = await fs.readdir(dir);
    return files.filter(f => f.endsWith('.txt') && !f.endsWith('-chapter.txt')).length;
  } catch {
    return 0;
  }
}

/**
 * Count files with specific extensions in a directory
 */
export async function countFiles(dir: string, extensions: string[]): Promise<number> {
  try {
    const files = await fs.readdir(dir);
    return files.filter(f => extensions.some(ext => f.toLowerCase().endsWith(ext))).length;
  } catch {
    return 0;
  }
}

/**
 * Count unique chapter numbers from recordings in both recordings/ and safe/ directories
 */
export async function countUniqueChapters(recordingsDir: string, safeDir: string): Promise<number> {
  const chapters = new Set<string>();

  for (const dir of [recordingsDir, safeDir]) {
    try {
      const files = await fs.readdir(dir);
      for (const file of files) {
        const match = file.match(/^(\d{2})-/);
        if (match) chapters.add(match[1]);
      }
    } catch {
      // Directory doesn't exist
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
    try {
      const files = await fs.readdir(dir);
      recordingFiles.push(
        ...files.filter(f => f.endsWith('.mov')).map(f => f.replace('.mov', ''))
      );
    } catch {
      // Directory doesn't exist
    }
  }

  // Get all .txt files (base names, exclude *-chapter.txt)
  let transcriptFiles: string[] = [];
  try {
    const files = await fs.readdir(transcriptsDir);
    transcriptFiles = files
      .filter(f => f.endsWith('.txt') && !f.endsWith('-chapter.txt'))
      .map(f => f.replace('.txt', ''));
  } catch {
    // Directory doesn't exist
  }

  const recordingSet = new Set(recordingFiles);
  const transcriptSet = new Set(transcriptFiles);

  const matched = recordingFiles.filter(r => transcriptSet.has(r)).length;
  const missingTranscripts = recordingFiles.filter(r => !transcriptSet.has(r));
  const orphanedTranscripts = transcriptFiles.filter(t => !recordingSet.has(t));

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
  try {
    const stat = await fs.stat(projectPath);
    const createdAt = stat.birthtime.toISOString();

    // Find most recent file across all subdirs
    let latestTime = 0;
    const subdirs = ['recordings', 'recordings/-safe', 'recording-transcripts', 'assets/images', 'assets/thumbs'];

    for (const subdir of subdirs) {
      try {
        const dir = path.join(projectPath, subdir);
        const files = await fs.readdir(dir);
        for (const file of files) {
          const fileStat = await fs.stat(path.join(dir, file));
          if (fileStat.mtimeMs > latestTime) {
            latestTime = fileStat.mtimeMs;
          }
        }
      } catch {
        // Directory doesn't exist
      }
    }

    return {
      createdAt,
      lastModified: latestTime > 0 ? new Date(latestTime).toISOString() : null,
    };
  } catch {
    return { createdAt: null, lastModified: null };
  }
}

/**
 * List .mov files in a directory
 */
export async function listMovFiles(dir: string): Promise<string[]> {
  try {
    const files = await fs.readdir(dir);
    return files.filter(f => f.endsWith('.mov'));
  } catch {
    return [];
  }
}

/**
 * List .txt transcript files in a directory (excludes *-chapter.txt combined files)
 */
export async function listTranscriptFiles(dir: string): Promise<string[]> {
  try {
    const files = await fs.readdir(dir);
    return files.filter(f => f.endsWith('.txt') && !f.endsWith('-chapter.txt'));
  } catch {
    return [];
  }
}
