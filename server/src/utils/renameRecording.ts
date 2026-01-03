// FR-130: Simplified rename logic using delete+regenerate pattern
import fs from 'fs-extra';
import path from 'path';
import type { ProjectPaths } from '../../../shared/paths.js';
import type { ProjectState, TranscriptionJob } from '../../../shared/types.js';
import { createShadowFile } from './shadowFiles.js';
import { readProjectState, writeProjectState } from './projectState.js';

/**
 * Check if a recording is currently being transcribed
 * Prevents rename conflicts with active transcription jobs
 */
export function checkTranscriptionQueue(
  filename: string,
  activeJob: TranscriptionJob | null,
  queue: TranscriptionJob[]
): boolean {
  const baseName = path.basename(filename, path.extname(filename));

  // Check if this file is the active job
  if (activeJob) {
    const activeBaseName = path.basename(activeJob.videoFilename, path.extname(activeJob.videoFilename));
    if (activeBaseName === baseName) {
      return true;
    }
  }

  // Check if this file is in the queue
  for (const job of queue) {
    const jobBaseName = path.basename(job.videoFilename, path.extname(job.videoFilename));
    if (jobBaseName === baseName) {
      return true;
    }
  }

  return false;
}

/**
 * Delete derivable files that can be regenerated
 * - Shadow files (both main and -safe directories)
 * - Transcript files (.txt and .srt)
 * - Chapter videos (if exists)
 */
export async function deleteDerivableFiles(
  oldFilename: string,
  paths: ProjectPaths
): Promise<void> {
  console.log(`[FR-130] Deleting derivable files for: ${oldFilename}`);
  const baseName = oldFilename.replace(/\.(mov|mp4)$/, '');

  // Delete shadow files
  // FR-111: Shadow files are always .mp4, only in main recording-shadows/ folder (no -safe subfolder)
  const shadowPaths = [
    path.join(paths.project, 'recording-shadows', `${baseName}.mp4`)
  ];

  // Delete transcript files (Whisper creates .txt, .srt, .json, .vtt, .tsv)
  const transcriptPaths = [
    path.join(paths.transcripts, `${baseName}.txt`),
    path.join(paths.transcripts, `${baseName}.srt`),
    path.join(paths.transcripts, `${baseName}.json`),
    path.join(paths.transcripts, `${baseName}.vtt`),
    path.join(paths.transcripts, `${baseName}.tsv`)
  ];

  // Delete all (log errors but don't fail the rename)
  await Promise.all(
    [...shadowPaths, ...transcriptPaths].map(async (p) => {
      try {
        await fs.unlink(p);
        console.log(`[FR-130] Deleted: ${path.basename(p)}`);
      } catch (err: any) {
        // Only ignore ENOENT (file doesn't exist) - log other errors
        if (err.code !== 'ENOENT') {
          console.error(`[FR-130] Failed to delete ${p}:`, err.message);
        }
      }
    })
  );

  // Delete chapter video (if exists)
  // Chapter videos are named like: 01-intro.mov (chapter-label.mov)
  // We need to detect if this recording's chapter had a generated video
  const chapterVideosDir = path.join(paths.recordings, '-chapters');
  if (await fs.pathExists(chapterVideosDir)) {
    // Parse chapter from filename (e.g., "01-1-intro.mov" -> "01")
    const chapterMatch = oldFilename.match(/^(\d{2})-/);
    if (chapterMatch) {
      const chapter = chapterMatch[1];

      // Delete any chapter video starting with this chapter number
      // (e.g., "01-intro.mov", "01-introduction.mov")
      const chapterFiles = await fs.readdir(chapterVideosDir);
      const chapterVideoPattern = new RegExp(`^${chapter}-.*\\.(mov|mp4)$`);

      for (const file of chapterFiles) {
        if (chapterVideoPattern.test(file)) {
          await fs.unlink(path.join(chapterVideosDir, file)).catch(() => {});
          // Also delete the matching .srt if it exists
          const srtFile = file.replace(/\.(mov|mp4)$/, '.srt');
          await fs.unlink(path.join(chapterVideosDir, srtFile)).catch(() => {});
        }
      }
    }
  }
}

/**
 * Migrate recording key in state file to preserve user data
 * Preserves: parked, annotation, safe flag, stage
 */
export function migrateRecordingKey(
  state: ProjectState,
  oldFilename: string,
  newFilename: string
): ProjectState {
  const oldEntry = state.recordings?.[oldFilename];

  // If no entry exists, nothing to migrate
  if (!oldEntry) return state;

  // Create new recordings object with migrated key
  const newRecordings = { ...state.recordings };
  delete newRecordings[oldFilename];
  newRecordings[newFilename] = oldEntry;

  return {
    ...state,
    recordings: newRecordings
  };
}

/**
 * Update manifest filename references (FR-126 integration)
 * If file was exported to edit folder, manifest must be updated
 */
export function updateManifestFilename(
  state: ProjectState,
  oldFilename: string,
  newFilename: string
): ProjectState {
  if (!state.editManifest) return state;

  const updatedManifest = { ...state.editManifest };

  // Update filename in all folder manifests
  for (const folder of ['edit-1st', 'edit-2nd', 'edit-final'] as const) {
    const manifest = updatedManifest[folder];
    if (!manifest) continue;

    const updatedFiles = manifest.files.map(file =>
      file.filename === oldFilename
        ? { ...file, filename: newFilename }
        : file
    );

    updatedManifest[folder] = {
      ...manifest,
      files: updatedFiles
    };
  }

  return {
    ...state,
    editManifest: updatedManifest
  };
}

/**
 * Rename core files (recording + state migration)
 * This is the only part that actually renames files - everything else is delete+regenerate
 */
export async function renameCoreFiles(
  oldFilename: string,
  newFilename: string,
  paths: ProjectPaths
): Promise<void> {
  // FR-111: All recordings stay in main recordings/ folder (safe is just a state flag)
  const oldPath = path.join(paths.recordings, oldFilename);
  const newPath = path.join(paths.recordings, newFilename);

  // Rename the recording file
  await fs.rename(oldPath, newPath);

  // Read state for migration
  const state = await readProjectState(paths.project);

  // Migrate state key (preserve parked, annotation, safe, stage)
  let updatedState = migrateRecordingKey(state, oldFilename, newFilename);

  // Update manifest if file was exported
  updatedState = updateManifestFilename(updatedState, oldFilename, newFilename);

  // Write updated state
  await writeProjectState(paths.project, updatedState);
}

/**
 * Regenerate derivable files using existing systems
 * - Shadow files: instant regeneration
 * - Transcripts: queued for async processing
 */
export async function regenerateDerivableFiles(
  newFilename: string,
  paths: ProjectPaths,
  queueTranscription?: (videoPath: string) => void
): Promise<void> {
  console.log(`[FR-130] Regenerating derivable files for: ${newFilename}`);

  // FR-111: All files stay in main folders (safe is just a state flag, not a physical location)
  const shadowDir = path.join(paths.project, 'recording-shadows');
  const videoPath = path.join(paths.recordings, newFilename);

  try {
    const result = await createShadowFile(videoPath, shadowDir);
    if (result.success) {
      console.log(`[FR-130] Created shadow file: ${path.basename(result.shadowPath!)}`);
    } else {
      console.error('[FR-130] Failed to create shadow file:', result.error);
    }
  } catch (err) {
    console.error('[FR-130] Failed to create shadow file:', err);
  }

  // Queue transcription (async, non-blocking)
  if (queueTranscription) {
    queueTranscription(videoPath);
  }
}

/**
 * Rename recording using delete+regenerate pattern
 * Simplified from 152 lines to ~80 lines (47% reduction)
 */
export async function renameRecording(
  oldFilename: string,
  newFilename: string,
  paths: ProjectPaths,
  activeJob: TranscriptionJob | null,
  queue: TranscriptionJob[],
  queueTranscription?: (videoPath: string) => void
): Promise<{ success: boolean; error?: string }> {
  console.log(`[FR-130] Starting rename: ${oldFilename} → ${newFilename}`);

  try {
    // Check if file is being transcribed
    if (checkTranscriptionQueue(oldFilename, activeJob, queue)) {
      console.log(`[FR-130] Rename blocked - file is being transcribed`);
      return {
        success: false,
        error: 'Cannot rename while transcribing. Wait for completion or cancel transcription.'
      };
    }

    // Phase 1: Delete derivable files
    console.log(`[FR-130] Phase 1: Delete derivable files`);
    await deleteDerivableFiles(oldFilename, paths);

    // Phase 2: Rename core files (recording + state migration)
    console.log(`[FR-130] Phase 2: Rename core files`);
    await renameCoreFiles(oldFilename, newFilename, paths);

    // Phase 3: Regenerate derivable files
    console.log(`[FR-130] Phase 3: Regenerate derivable files`);
    await regenerateDerivableFiles(newFilename, paths, queueTranscription);

    console.log(`[FR-130] Rename complete: ${newFilename}`);
    return { success: true };
  } catch (error) {
    console.error(`[FR-130] Rename failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to rename recording'
    };
  }
}
