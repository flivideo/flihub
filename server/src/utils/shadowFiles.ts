/**
 * FR-83: Shadow Recording System (Video Shadows)
 *
 * Shadow files are lightweight 240p preview videos that mirror recordings.
 * They allow collaborators to watch content without heavy source files.
 *
 * Location: recording-shadows/ (sibling to recordings/)
 * Format: 240p H.264 video with 128kbps AAC audio
 *
 * Benefits over text shadows:
 * - Watch page plays actual video (not placeholder)
 * - Transcription works (128kbps audio good for Whisper)
 * - Transcript sync works
 * - Chapter generation works (low quality but functional)
 */

import path from 'path';
import fs from 'fs-extra';
import { spawn } from 'child_process';
import { readDirSafe, statSafe } from './filesystem.js';

/**
 * Shadow video settings
 * FR-89 Part 6: height is now configurable via config.shadowResolution
 */
const SHADOW_SETTINGS = {
  defaultHeight: 240,    // Default 240p, configurable via config.shadowResolution
  videoCodec: 'libx264',
  videoPreset: 'fast',   // Balance speed vs compression
  videoCrf: 28,          // Quality level (lower = better, 28 is reasonable for preview)
  audioCodec: 'aac',
  audioBitrate: '128k',  // Good enough for Whisper transcription
};

// FR-89 Part 6: Valid shadow resolutions
export const VALID_SHADOW_RESOLUTIONS = [240, 180, 160] as const;
export type ShadowResolution = typeof VALID_SHADOW_RESOLUTIONS[number];

/**
 * Get video duration using ffprobe
 */
export async function getVideoDuration(videoPath: string): Promise<number | null> {
  return new Promise((resolve) => {
    const ffprobe = spawn('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      videoPath,
    ]);

    let stdout = '';
    ffprobe.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    ffprobe.on('close', (code) => {
      if (code !== 0) {
        resolve(null);
        return;
      }
      const duration = parseFloat(stdout.trim());
      resolve(isNaN(duration) ? null : duration);
    });

    ffprobe.on('error', () => resolve(null));
  });
}

/**
 * Create shadow video file (preview) for a source video
 * FR-89 Part 6: Resolution is now configurable (default 240p)
 * Returns a promise that resolves when transcoding is complete
 */
export async function createShadowFile(
  videoPath: string,
  shadowDir: string,
  onProgress?: (percent: number) => void,
  resolution: number = SHADOW_SETTINGS.defaultHeight
): Promise<{ success: boolean; shadowPath?: string; error?: string }> {
  try {
    const videoFilename = path.basename(videoPath);
    const baseName = videoFilename.replace(/\.(mov|mp4)$/i, '');
    const shadowFilename = `${baseName}.mp4`;  // Always output as .mp4
    const shadowPath = path.join(shadowDir, shadowFilename);

    // Check if shadow already exists
    if (await fs.pathExists(shadowPath)) {
      return { success: false, error: 'Shadow file already exists' };
    }

    // Check source exists
    const stat = await statSafe(videoPath);
    if (!stat) {
      return { success: false, error: 'Video file not found' };
    }

    // Get source duration for progress calculation
    const duration = await getVideoDuration(videoPath);

    // Ensure shadow directory exists
    await fs.ensureDir(shadowDir);

    // FR-89 Part 6: Transcode using configurable resolution
    return new Promise((resolve) => {
      const ffmpeg = spawn('ffmpeg', [
        '-i', videoPath,
        '-vf', `scale=-2:${resolution}`,  // -2 maintains aspect ratio with even width
        '-c:v', SHADOW_SETTINGS.videoCodec,
        '-preset', SHADOW_SETTINGS.videoPreset,
        '-crf', SHADOW_SETTINGS.videoCrf.toString(),
        '-c:a', SHADOW_SETTINGS.audioCodec,
        '-b:a', SHADOW_SETTINGS.audioBitrate,
        '-y',  // Overwrite output file if exists
        shadowPath,
      ]);

      let stderr = '';
      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();

        // Parse progress from FFmpeg stderr
        if (duration && onProgress) {
          const timeMatch = stderr.match(/time=(\d+):(\d+):(\d+\.\d+)/);
          if (timeMatch) {
            const currentTime =
              parseInt(timeMatch[1]) * 3600 +
              parseInt(timeMatch[2]) * 60 +
              parseFloat(timeMatch[3]);
            const percent = Math.min(99, Math.round((currentTime / duration) * 100));
            onProgress(percent);
          }
        }
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          if (onProgress) onProgress(100);
          resolve({ success: true, shadowPath });
        } else {
          // Clean up failed output
          fs.remove(shadowPath).catch(() => {});
          resolve({ success: false, error: `FFmpeg exited with code ${code}` });
        }
      });

      ffmpeg.on('error', (err) => {
        resolve({ success: false, error: `FFmpeg error: ${err.message}` });
      });
    });
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * Unified file entry - either real or shadow
 */
export interface UnifiedRecording {
  baseName: string;       // Without extension (e.g., "01-1-intro")
  type: 'real' | 'shadow';
  realPath?: string;      // Path to source .mov file (if real)
  shadowPath?: string;    // Path to shadow .mp4 (if shadow only)
}

/**
 * Get unified list of recordings (merges real + shadow, real takes precedence)
 */
export async function getUnifiedRecordings(
  recordingsDir: string,
  shadowDir: string
): Promise<Map<string, UnifiedRecording>> {
  const unified = new Map<string, UnifiedRecording>();

  // First, add shadow files
  const shadowFiles = await readDirSafe(shadowDir);
  for (const file of shadowFiles) {
    if (!file.match(/\.mp4$/i)) continue;

    const baseName = file.replace(/\.mp4$/i, '');
    const shadowPath = path.join(shadowDir, file);

    unified.set(baseName, {
      baseName,
      type: 'shadow',
      shadowPath,
    });
  }

  // Then, add real files (overwriting shadows where they exist)
  const realFiles = await readDirSafe(recordingsDir);
  for (const file of realFiles) {
    if (!file.match(/\.(mov|mp4)$/i)) continue;

    const baseName = file.replace(/\.(mov|mp4)$/i, '');
    const realPath = path.join(recordingsDir, file);
    const existing = unified.get(baseName);

    unified.set(baseName, {
      baseName,
      type: 'real',
      realPath,
      shadowPath: existing?.shadowPath,
    });
  }

  return unified;
}

/**
 * Count shadows and missing for a project
 * FR-111: Only scans recordings/ and recording-shadows/ (no more -safe folders)
 */
export async function getShadowCounts(
  recordingsDir: string,
  shadowDir: string
): Promise<{ recordings: number; shadows: number; missing: number }> {
  // Count real recordings
  const recordingFiles = await readDirSafe(recordingsDir);
  const realCount = recordingFiles.filter(f => f.match(/\.(mov|mp4)$/i)).length;

  // Count shadow files (now .mp4)
  const shadowFiles = await readDirSafe(shadowDir);
  const shadowCount = shadowFiles.filter(f => f.match(/\.mp4$/i)).length;

  // Get unified to count missing (real files without shadows)
  const realBaseNames = new Set<string>();
  for (const f of recordingFiles) {
    if (f.match(/\.(mov|mp4)$/i)) {
      realBaseNames.add(f.replace(/\.(mov|mp4)$/i, ''));
    }
  }

  const shadowBaseNames = new Set<string>();
  for (const f of shadowFiles) {
    if (f.match(/\.mp4$/i)) {
      shadowBaseNames.add(f.replace(/\.mp4$/i, ''));
    }
  }

  // Missing = real files without a corresponding shadow
  let missing = 0;
  for (const name of realBaseNames) {
    if (!shadowBaseNames.has(name)) {
      missing++;
    }
  }

  return { recordings: realCount, shadows: shadowCount, missing };
}

/**
 * Generate shadows for all recordings in a project that don't have them
 * FR-89 Part 6: Resolution is now configurable (default 240p)
 * FR-111: Only scans recordings/ (no more -safe folder)
 * Returns progress updates via onProgress callback
 */
export async function generateProjectShadows(
  projectPath: string,
  onProgress?: (current: number, total: number, filename: string) => void,
  resolution: number = SHADOW_SETTINGS.defaultHeight
): Promise<{ created: number; skipped: number; errors: string[] }> {
  const recordingsDir = path.join(projectPath, 'recordings');
  const shadowDir = path.join(projectPath, 'recording-shadows');

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  // Collect all files to process
  const filesToProcess: Array<{ videoPath: string; shadowDir: string; label: string }> = [];

  const recordingFiles = await readDirSafe(recordingsDir);
  for (const file of recordingFiles) {
    if (!file.match(/\.(mov|mp4)$/i)) continue;
    filesToProcess.push({
      videoPath: path.join(recordingsDir, file),
      shadowDir,
      label: file,
    });
  }

  const total = filesToProcess.length;

  // Process each file
  for (let i = 0; i < filesToProcess.length; i++) {
    const { videoPath, shadowDir: targetShadowDir, label } = filesToProcess[i];

    if (onProgress) {
      onProgress(i + 1, total, label);
    }

    const result = await createShadowFile(videoPath, targetShadowDir, undefined, resolution);

    if (result.success) {
      created++;
    } else if (result.error === 'Shadow file already exists') {
      skipped++;
    } else {
      errors.push(`${label}: ${result.error}`);
    }
  }

  return { created, skipped, errors };
}

/**
 * Rename a shadow file to match a renamed recording
 */
export async function renameShadowFile(
  oldBaseName: string,
  newBaseName: string,
  shadowDir: string
): Promise<{ success: boolean; error?: string }> {
  const oldPath = path.join(shadowDir, `${oldBaseName}.mp4`);
  const newPath = path.join(shadowDir, `${newBaseName}.mp4`);

  try {
    if (await fs.pathExists(oldPath)) {
      await fs.move(oldPath, newPath);
      return { success: true };
    }
    return { success: false, error: 'Shadow file not found' };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * Move a shadow file between directories (e.g., when moving to/from safe)
 */
export async function moveShadowFile(
  baseName: string,
  fromDir: string,
  toDir: string
): Promise<{ success: boolean; error?: string }> {
  const fromPath = path.join(fromDir, `${baseName}.mp4`);
  const toPath = path.join(toDir, `${baseName}.mp4`);

  try {
    if (await fs.pathExists(fromPath)) {
      await fs.ensureDir(toDir);
      await fs.move(fromPath, toPath);
      return { success: true };
    }
    return { success: false, error: 'Shadow file not found' };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * Delete a shadow file
 */
export async function deleteShadowFile(
  baseName: string,
  shadowDir: string
): Promise<{ success: boolean; error?: string }> {
  const shadowPath = path.join(shadowDir, `${baseName}.mp4`);

  try {
    if (await fs.pathExists(shadowPath)) {
      await fs.remove(shadowPath);
      return { success: true };
    }
    return { success: false, error: 'Shadow file not found' };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
