// B047: Smart rename — renames derivative files in-place instead of delete+regenerate
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
    const activeBaseName = path.basename(
      activeJob.videoFilename,
      path.extname(activeJob.videoFilename)
    );
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
 * Rename a file, silently ignoring ENOENT (file doesn't exist)
 */
async function safeRename(oldPath: string, newPath: string): Promise<void> {
  try {
    await fs.rename(oldPath, newPath);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    if (err.code !== 'ENOENT') throw err;
  }
}

/**
 * Delete chapter video for a given chapter number
 * Chapter videos are named like: 01-intro.mov (chapter-label.mov)
 */
export async function deleteChapterVideo(
  chapter: string,
  paths: ProjectPaths
): Promise<void> {
  const chapterVideosDir = path.join(paths.recordings, '-chapters');
  if (await fs.pathExists(chapterVideosDir)) {
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

/**
 * Rename derivative files (shadows, transcripts) in-place via fs.rename
 * If chapter number changed, delete the old chapter video (it's now stale)
 */
export async function renameDerivableFiles(
  oldFilename: string,
  newFilename: string,
  paths: ProjectPaths
): Promise<void> {
  const oldBase = oldFilename.replace(/\.(mov|mp4)$/, '');
  const newBase = newFilename.replace(/\.(mov|mp4)$/, '');

  console.log(`[B047] Renaming derivative files: ${oldBase} → ${newBase}`);

  // Rename shadow file (.mp4 in recording-shadows/)
  const shadowDir = path.join(paths.project, 'recording-shadows');
  await safeRename(
    path.join(shadowDir, `${oldBase}.mp4`),
    path.join(shadowDir, `${newBase}.mp4`)
  );

  // Rename transcript files (all 5 extensions)
  const transcriptExts = ['.txt', '.srt', '.json', '.vtt', '.tsv'];
  await Promise.all(
    transcriptExts.map((ext) =>
      safeRename(
        path.join(paths.transcripts, `${oldBase}${ext}`),
        path.join(paths.transcripts, `${newBase}${ext}`)
      )
    )
  );

  // If chapter number changed, delete old chapter video (it's now stale)
  const oldChapter = oldFilename.match(/^(\d{2})-/)?.[1];
  const newChapter = newFilename.match(/^(\d{2})-/)?.[1];
  if (oldChapter && newChapter && oldChapter !== newChapter) {
    await deleteChapterVideo(oldChapter, paths);
  }
}

/**
 * Delete derivable files that can be regenerated
 * - Shadow files (both main and -safe directories)
 * - Transcript files (.txt and .srt)
 * - Chapter videos (if exists)
 *
 * NOTE: Still exported for use by Regen endpoints in manage.ts
 */
export async function deleteDerivableFiles(
  oldFilename: string,
  paths: ProjectPaths
): Promise<void> {
  console.log(`[FR-130] Deleting derivable files for: ${oldFilename}`);
  const baseName = oldFilename.replace(/\.(mov|mp4)$/, '');

  // Delete shadow files
  // FR-111: Shadow files are always .mp4, only in main recording-shadows/ folder (no -safe subfolder)
  const shadowPaths = [path.join(paths.project, 'recording-shadows', `${baseName}.mp4`)];

  // Delete transcript files (Whisper creates .txt, .srt, .json, .vtt, .tsv)
  const transcriptPaths = [
    path.join(paths.transcripts, `${baseName}.txt`),
    path.join(paths.transcripts, `${baseName}.srt`),
    path.join(paths.transcripts, `${baseName}.json`),
    path.join(paths.transcripts, `${baseName}.vtt`),
    path.join(paths.transcripts, `${baseName}.tsv`),
  ];

  // Delete all (log errors but don't fail the rename)
  await Promise.all(
    [...shadowPaths, ...transcriptPaths].map(async (p) => {
      try {
        await fs.unlink(p);
        console.log(`[FR-130] Deleted: ${path.basename(p)}`);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        // Only ignore ENOENT (file doesn't exist) - log other errors
        if (err.code !== 'ENOENT') {
          console.error(`[FR-130] Failed to delete ${p}:`, err.message);
        }
      }
    })
  );

  // Delete chapter video (if exists)
  const chapterMatch = oldFilename.match(/^(\d{2})-/);
  if (chapterMatch) {
    await deleteChapterVideo(chapterMatch[1], paths);
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
    recordings: newRecordings,
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

    const updatedFiles = manifest.files.map((file) =>
      file.filename === oldFilename ? { ...file, filename: newFilename } : file
    );

    updatedManifest[folder] = {
      ...manifest,
      files: updatedFiles,
    };
  }

  return {
    ...state,
    editManifest: updatedManifest,
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

  // Guard: prevent silent overwrite of existing files (POSIX fs.rename overwrites without error)
  if (await fs.pathExists(newPath)) {
    throw new Error(`Target file already exists: ${newFilename}`);
  }

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
 *
 * NOTE: Still exported for use by Regen endpoints in manage.ts
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
 * Rename recording using smart-rename pattern (B047)
 * Phase 1: Rename derivative files in-place (shadows, transcripts)
 * Phase 2: Rename core files (recording + state migration)
 */
export async function renameRecording(
  oldFilename: string,
  newFilename: string,
  paths: ProjectPaths,
  activeJob: TranscriptionJob | null,
  queue: TranscriptionJob[]
): Promise<{ success: boolean; error?: string }> {
  console.log(`[B047] Starting rename: ${oldFilename} → ${newFilename}`);

  try {
    // Check if file is being transcribed
    if (checkTranscriptionQueue(oldFilename, activeJob, queue)) {
      console.log(`[B047] Rename blocked - file is being transcribed`);
      return {
        success: false,
        error: 'Cannot rename while transcribing. Wait for completion or cancel transcription.',
      };
    }

    // Phase 1: Rename derivative files in-place
    console.log(`[B047] Phase 1: Rename derivative files`);
    await renameDerivableFiles(oldFilename, newFilename, paths);

    // Phase 2: Rename core files (recording + state migration)
    console.log(`[B047] Phase 2: Rename core files`);
    await renameCoreFiles(oldFilename, newFilename, paths);

    console.log(`[B047] Rename complete: ${newFilename}`);
    return { success: true };
  } catch (error) {
    console.error(`[B047] Rename failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to rename recording',
    };
  }
}
