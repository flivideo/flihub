// FR-131: Manage Panel routes - Bulk operations and file management
import { Router } from 'express';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import type { Server } from 'socket.io';
import { getProjectPaths } from '../../../shared/paths.js';
import { parseRecordingFilename, buildRecordingFilename } from '../../../shared/naming.js';
import { renameRecording } from '../utils/renameRecording.js';
import { createShadowFile } from '../utils/shadowFiles.js';
import { generateChapterRecording, groupRecordingsByChapter } from '../utils/chapterRecording.js';
import { expandPath } from '../utils/pathUtils.js';
import { getVideoDuration } from '../utils/videoDuration.js';
import type { Config } from '../config.js';
import type { TranscriptionJob, ServerToClientEvents, ClientToServerEvents, RecordingFile } from '../../../shared/types.js';

/**
 * Create manage panel routes
 * @param getConfig - Function to get current config
 * @param io - Socket.io server instance for real-time events
 * @param queueTranscription - Function to queue transcription jobs
 * @param getActiveJob - Function to get active transcription job
 * @param getQueue - Function to get transcription queue
 */
export function createManageRoutes(
  getConfig: () => Config,
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  queueTranscription?: (videoPath: string) => void,
  getActiveJob?: () => TranscriptionJob | null,
  getQueue?: () => TranscriptionJob[]
): Router {
  const router = Router();

  /**
   * POST /api/manage/bulk-rename
   * Bulk rename multiple recordings with a new label
   *
   * Body:
   * {
   *   files: string[];      // Array of filenames to rename
   *   newLabel: string;     // New label to apply
   * }
   *
   * Returns:
   * {
   *   success: boolean;
   *   renamedCount: number;
   *   transcriptionQueued: boolean;
   *   files: Array<{ old: string; new: string }>;
   *   errors?: Array<{ file: string; error: string }>;
   * }
   */
  router.post('/bulk-rename', async (req, res) => {
    try {
      const { files, newLabel } = req.body;

      if (!Array.isArray(files) || files.length === 0) {
        return res.json({
          success: false,
          error: 'No files provided'
        });
      }

      if (!newLabel || typeof newLabel !== 'string') {
        return res.json({
          success: false,
          error: 'Invalid label provided'
        });
      }

      const config = getConfig();
      const paths = getProjectPaths(expandPath(config.projectDirectory));
      const activeJob = getActiveJob ? getActiveJob() : null;
      const queue = getQueue ? getQueue() : [];

      const renamed: Array<{ old: string; new: string }> = [];
      const errors: Array<{ file: string; error: string }> = [];

      console.log(`[FR-131] Bulk rename: ${files.length} files with label "${newLabel}"`);

      // Process each file
      for (const oldFilename of files) {
        try {
          // Parse the old filename
          const parsed = parseRecordingFilename(oldFilename);
          if (!parsed.success) {
            errors.push({
              file: oldFilename,
              error: 'Invalid filename format'
            });
            continue;
          }

          // Build new filename with same chapter/sequence but new label
          // Keep existing tags if any
          const newFilename = buildRecordingFilename(
            parsed.chapter!,
            parsed.sequence!,
            newLabel,
            parsed.tags || []
          );

          console.log(`[FR-131] Renaming: ${oldFilename} → ${newFilename}`);

          // Use FR-130 rename logic (delete+regenerate pattern)
          const result = await renameRecording(
            oldFilename,
            newFilename,
            paths,
            activeJob,
            queue,
            queueTranscription
          );

          if (result.success) {
            renamed.push({ old: oldFilename, new: newFilename });
          } else {
            errors.push({
              file: oldFilename,
              error: result.error || 'Rename failed'
            });
          }
        } catch (err) {
          console.error(`[FR-131] Error renaming ${oldFilename}:`, err);
          errors.push({
            file: oldFilename,
            error: err instanceof Error ? err.message : String(err)
          });
        }
      }

      console.log(`[FR-131] Bulk rename complete: ${renamed.length} renamed, ${errors.length} errors`);

      res.json({
        success: errors.length === 0,
        renamedCount: renamed.length,
        transcriptionQueued: renamed.length > 0,
        files: renamed,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (err) {
      console.error('[FR-131] Bulk rename error:', err);
      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Internal server error'
      });
    }
  });

  /**
   * POST /api/manage/regen-shadows
   * FR-131 Phase 2: Regenerate shadow files for all recordings
   *
   * Returns:
   * {
   *   success: boolean;
   *   completed: number;
   *   failed: number;
   *   total: number;
   *   errors?: Array<{ file: string; error: string }>;
   * }
   */
  router.post('/regen-shadows', async (req, res) => {
    try {
      const { files } = req.body;  // FR-136: Optional array of filenames
      const config = getConfig();
      const paths = getProjectPaths(expandPath(config.projectDirectory));

      const recordingsDir = paths.recordings;
      const shadowDir = path.join(paths.project, 'recording-shadows');

      // FR-136: Determine target files (selected or all)
      let recordings: string[];
      const scope = files && Array.isArray(files) && files.length > 0 ? 'selected' : 'all';

      if (scope === 'selected') {
        recordings = files;
      } else {
        const allFiles = await fs.readdir(recordingsDir);
        recordings = allFiles.filter(f => f.endsWith('.mov') || f.endsWith('.mp4'));
      }

      const results = { completed: 0, failed: 0, errors: [] as Array<{ file: string; error: string }> };

      console.log(`[FR-131] Regen shadows: Processing ${recordings.length} ${scope} recordings`);

      for (let i = 0; i < recordings.length; i++) {
        const filename = recordings[i];
        try {
          const recordingPath = path.join(recordingsDir, filename);
          const baseName = filename.replace(/\.(mov|mp4)$/i, '');

          // Emit progress update
          console.log(`[FR-131 Regen Progress] ${i + 1}/${recordings.length}: ${filename}`);
          io.emit('regen:shadows:progress', {
            current: i + 1,
            total: recordings.length,
            filename
          });

          // Delete existing shadow file
          const shadowPath = path.join(shadowDir, `${baseName}.mp4`);
          await fs.remove(shadowPath);

          // Regenerate shadow
          const result = await createShadowFile(
            recordingPath,
            shadowDir,
            undefined,
            config.shadowResolution || 240
          );

          if (result.success) {
            results.completed++;
            console.log(`[FR-131 Regen Shadows] Created: ${filename}`);
          } else {
            // If error is "already exists", count as skipped (race condition protection)
            if (result.error === 'Shadow file already exists') {
              results.completed++;
            } else {
              results.failed++;
              results.errors.push({ file: filename, error: result.error || 'Unknown error' });
              console.error(`[FR-131 Regen Shadows] Failed: ${filename}`, result.error);
            }
          }
        } catch (err) {
          results.failed++;
          results.errors.push({ file: filename, error: String(err) });
          console.error(`[FR-131 Regen Shadows] Error: ${filename}`, err);
        }
      }

      // Emit Socket.io event
      io.emit('regen:shadows:complete', {
        completed: results.completed,
        failed: results.failed,
        errors: results.errors.length > 0 ? results.errors : undefined
      });

      console.log(`[FR-131] Regen shadows complete: ${results.completed} created, ${results.failed} failed`);

      res.json({
        success: true,
        completed: results.completed,
        failed: results.failed,
        total: recordings.length,
        scope,  // FR-136: Report whether 'selected' or 'all'
        errors: results.errors.length > 0 ? results.errors : undefined
      });
    } catch (err) {
      console.error('[FR-131 Regen Shadows] Error:', err);
      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Internal server error'
      });
    }
  });

  /**
   * POST /api/manage/regen-transcripts
   * FR-131 Phase 2: Queue transcription for recordings
   *
   * Body:
   * {
   *   force?: boolean  // If true, re-transcribe ALL files (default: false)
   * }
   *
   * Returns:
   * {
   *   success: boolean;
   *   queued: number;
   *   total: number;
   *   force: boolean;
   * }
   */
  router.post('/regen-transcripts', async (req, res) => {
    try {
      const { force = false, files } = req.body;  // FR-136: Accept optional files param
      const config = getConfig();
      const paths = getProjectPaths(expandPath(config.projectDirectory));

      if (!queueTranscription) {
        return res.status(500).json({
          success: false,
          error: 'Transcription queue not available'
        });
      }

      const recordingsDir = paths.recordings;

      // FR-136: Determine target files (selected or all)
      let recordings: string[];
      const scope = files && Array.isArray(files) && files.length > 0 ? 'selected' : 'all';

      if (scope === 'selected') {
        recordings = files;
      } else {
        const allFiles = await fs.readdir(recordingsDir);
        recordings = allFiles.filter(f => f.endsWith('.mov') || f.endsWith('.mp4'));
      }

      let queued = 0;

      console.log(`[FR-131] Regen transcripts: Processing ${recordings.length} ${scope} recordings (force=${force})`);

      for (const filename of recordings) {
        const recordingPath = path.join(recordingsDir, filename);
        const baseName = path.basename(filename, path.extname(filename));
        const transcriptPath = path.join(paths.transcripts, `${baseName}.txt`);

        const hasTranscript = await fs.pathExists(transcriptPath);

        if (force || !hasTranscript) {
          // Queue transcription
          queueTranscription(recordingPath);
          queued++;
          console.log(`[FR-131 Regen Transcripts] Queued: ${filename}`);
        }
      }

      console.log(`[FR-131] Regen transcripts complete: ${queued} queued`);

      res.json({
        success: true,
        queued,
        total: recordings.length,
        scope,  // FR-136: Report whether 'selected' or 'all'
        force
      });
    } catch (err) {
      console.error('[FR-131 Regen Transcripts] Error:', err);
      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Internal server error'
      });
    }
  });

  /**
   * Helper: Group RecordingFile array by chapter
   * (The chapterRecording.ts version reads from disk, this works with arrays)
   */
  function groupRecordingFilesByChapter(recordings: RecordingFile[]): Map<string, RecordingFile[]> {
    const chapters = new Map<string, RecordingFile[]>();

    for (const recording of recordings) {
      const chapter = recording.chapter;
      if (!chapters.has(chapter)) {
        chapters.set(chapter, []);
      }
      chapters.get(chapter)!.push(recording);
    }

    // Sort files within each chapter by sequence
    for (const files of chapters.values()) {
      files.sort((a, b) => parseInt(a.sequence) - parseInt(b.sequence));
    }

    return chapters;
  }

  /**
   * POST /api/manage/regen-chapters
   * FR-131 Phase 2: Regenerate all chapter videos
   *
   * Emits Socket.io events for progress:
   * - regen:chapters:progress { current, total, chapter }
   * - regen:chapters:complete { completed, failed, errors }
   *
   * Returns immediately and processes async:
   * {
   *   success: boolean;
   *   started: boolean;
   *   chapters: number;
   * }
   */
  router.post('/regen-chapters', async (req, res) => {
    try {
      const { files, chapterSettings } = req.body;  // FR-136: Accept optional files param and chapter settings
      const config = getConfig();
      const paths = getProjectPaths(expandPath(config.projectDirectory));

      const recordingsDir = paths.recordings;

      // FR-136: Determine target files (selected or all)
      let recordings: string[];
      const scope = files && Array.isArray(files) && files.length > 0 ? 'selected' : 'all';

      if (scope === 'selected') {
        recordings = files;
      } else {
        const allFiles = await fs.readdir(recordingsDir);
        recordings = allFiles.filter(f => f.endsWith('.mov') || f.endsWith('.mp4'));
      }

      console.log(`[FR-131] Regen chapters: Processing ${recordings.length} ${scope} recordings`);

      // Build RecordingFile array for grouping
      const recordingFiles: RecordingFile[] = recordings.map(filename => {
        const parsed = parseRecordingFilename(filename);
        return {
          filename,
          path: path.join(recordingsDir, filename),
          chapter: parsed.chapter || '00',
          sequence: parsed.sequence || '0',
          name: parsed.name || '',
          tags: parsed.tags || [],
          size: 0, // Not needed for chapter generation
          timestamp: new Date().toISOString(),
          isSafe: false,
          isParked: false,
        };
      });

      // Group by chapter
      const chapters = groupRecordingFilesByChapter(recordingFiles);
      const chapterKeys = Array.from(chapters.keys()).sort();

      console.log(`[FR-131] Regen chapters: ${chapterKeys.length} chapters to process`);

      // Start async generation (don't await - return immediately)
      regenerateChaptersAsync(chapterKeys, chapters, paths, config, io, chapterSettings);

      res.json({
        success: true,
        started: true,
        chapters: chapterKeys.length,
        scope  // FR-136: Report whether 'selected' or 'all'
      });
    } catch (err) {
      console.error('[FR-131 Regen Chapters] Error:', err);
      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Internal server error'
      });
    }
  });

  /**
   * Async chapter regeneration with progress updates
   */
  async function regenerateChaptersAsync(
    chapterKeys: string[],
    chapters: Map<string, RecordingFile[]>,
    paths: any,
    config: Config,
    io: Server<ClientToServerEvents, ServerToClientEvents>,
    requestSettings?: { resolution?: '720p' | '1080p'; includeTitleSlides?: boolean; slideDuration?: number }
  ): Promise<void> {
    const results = { completed: 0, failed: 0, errors: [] as Array<{ chapter: string; error: string }> };

    // Build GenerateOptions (matching chapters.ts pattern)
    // Use request settings if provided, otherwise fall back to config
    const chapterConfig = config.chapterRecordings || {
      slideDuration: 1.0,
      resolution: '720p' as '720p' | '1080p',
      includeTitleSlides: false,
    };

    const tempDir = path.join(os.tmpdir(), 'flihub-chapters');

    const options = {
      slideDuration: requestSettings?.slideDuration ?? chapterConfig.slideDuration ?? 1.0,
      resolution: (requestSettings?.resolution ?? chapterConfig.resolution) as '720p' | '1080p',
      outputDir: paths.chapters,
      tempDir,
      includeTitleSlides: requestSettings?.includeTitleSlides ?? chapterConfig.includeTitleSlides ?? false,
      transcriptsDir: paths.transcripts,
    };

    for (let i = 0; i < chapterKeys.length; i++) {
      const chapterKey = chapterKeys[i];
      const chapterFiles = chapters.get(chapterKey)!;

      try {
        // Emit progress
        io.emit('regen:chapters:progress', {
          current: i + 1,
          total: chapterKeys.length,
          chapter: chapterKey
        });

        // Delete existing chapter video
        await fs.ensureDir(paths.chapters);

        // Find and delete existing chapter files
        const existingFiles = await fs.readdir(paths.chapters);
        for (const file of existingFiles) {
          if (file.startsWith(`${chapterKey}-`)) {
            await fs.remove(path.join(paths.chapters, file));
            console.log(`[FR-131 Regen Chapters] Deleted: ${file}`);
          }
        }

        // Convert RecordingFile[] to ChapterSegments format
        const chapterSegments = {
          chapter: chapterKey,
          label: chapterFiles[0]?.name || chapterKey,
          segments: await Promise.all(chapterFiles.map(async (file) => {
            const duration = await getVideoDuration(file.path) || 0;
            return {
              filename: file.filename,
              path: file.path,
              sequence: parseInt(file.sequence),
              label: file.name,
              tags: file.tags,
              duration,
            };
          })),
          totalDuration: 0, // Will be calculated by segments
        };

        // Calculate total duration
        chapterSegments.totalDuration = chapterSegments.segments.reduce((sum, seg) => sum + seg.duration, 0);

        // Generate new chapter video (correct signature!)
        await generateChapterRecording(chapterSegments, options);

        results.completed++;
        console.log(`[FR-131 Regen Chapters] Created: Chapter ${chapterKey}`);
      } catch (err) {
        results.failed++;
        results.errors.push({ chapter: chapterKey, error: String(err) });
        console.error(`[FR-131 Regen Chapters] Failed: Chapter ${chapterKey}`, err);
      }
    }

    // Clean up temp directory
    await fs.remove(tempDir).catch(() => {});

    // Emit completion
    io.emit('regen:chapters:complete', {
      completed: results.completed,
      failed: results.failed,
      errors: results.errors.length > 0 ? results.errors : undefined
    });

    console.log(`[FR-131] Regen chapters complete: ${results.completed} created, ${results.failed} failed`);
  }

  /**
   * POST /api/manage/regen-all
   * FR-131 Phase 2: Regenerate all derivative files (shadows, transcripts, chapters)
   * Runs sequentially with progress updates
   *
   * Returns immediately and processes async:
   * {
   *   success: boolean;
   *   started: boolean;
   * }
   */
  router.post('/regen-all', async (req, res) => {
    try {
      const { files, chapterSettings } = req.body;  // FR-136: Accept optional files param and chapter settings
      const scope = files && Array.isArray(files) && files.length > 0 ? 'selected' : 'all';

      // Start async regeneration (don't await - return immediately)
      regenerateAllAsync(getConfig, io, queueTranscription, files, chapterSettings);

      res.json({
        success: true,
        started: true,
        scope  // FR-136: Report whether 'selected' or 'all'
      });
    } catch (err) {
      console.error('[FR-131 Regen All] Error:', err);
      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Internal server error'
      });
    }
  });

  /**
   * Async regeneration of all derivative files
   * FR-136: Accept optional files parameter for selection-aware behavior
   */
  async function regenerateAllAsync(
    getConfig: () => Config,
    io: Server<ClientToServerEvents, ServerToClientEvents>,
    queueTranscription?: (path: string) => void,
    files?: string[],
    chapterSettings?: { resolution?: '720p' | '1080p'; includeTitleSlides?: boolean; slideDuration?: number }
  ): Promise<void> {
    try {
      io.emit('regen:all:started');
      const scope = files && files.length > 0 ? 'selected' : 'all';
      console.log(`[FR-131] Regen all: Starting (${scope})...`);

      // Step 1: Shadows
      io.emit('regen:all:progress', { step: 'shadows', current: 1, total: 3 });
      const shadowsResult = await regenerateShadowsInternal(getConfig, io, files);

      // Step 2: Transcripts
      io.emit('regen:all:progress', { step: 'transcripts', current: 2, total: 3 });
      const transcriptsResult = await regenerateTranscriptsInternal(getConfig, queueTranscription, files);

      // Step 3: Chapters
      io.emit('regen:all:progress', { step: 'chapters', current: 3, total: 3 });
      const chaptersResult = await regenerateChaptersInternal(getConfig, io, files, chapterSettings);

      // Emit completion
      io.emit('regen:all:complete', {
        shadows: shadowsResult,
        transcripts: transcriptsResult,
        chapters: chaptersResult
      });

      console.log('[FR-131] Regen all: Complete');
    } catch (err) {
      console.error('[FR-131 Regen All] Error:', err);
      io.emit('regen:all:error', { error: String(err) });
    }
  }

  /**
   * Internal helper: Regenerate shadows
   * FR-136: Accept optional files parameter for selection-aware behavior
   */
  async function regenerateShadowsInternal(
    getConfig: () => Config,
    io: Server<ClientToServerEvents, ServerToClientEvents>,
    targetFiles?: string[]
  ): Promise<{ completed: number; failed: number }> {
    const config = getConfig();
    const paths = getProjectPaths(expandPath(config.projectDirectory));
    const recordingsDir = paths.recordings;
    const shadowDir = path.join(paths.project, 'recording-shadows');

    // FR-136: Use provided files or get all
    let recordings: string[];
    if (targetFiles && targetFiles.length > 0) {
      recordings = targetFiles;
    } else {
      const allFiles = await fs.readdir(recordingsDir);
      recordings = allFiles.filter(f => f.endsWith('.mov') || f.endsWith('.mp4'));
    }

    const results = { completed: 0, failed: 0 };

    for (let i = 0; i < recordings.length; i++) {
      const filename = recordings[i];
      try {
        const recordingPath = path.join(recordingsDir, filename);
        const baseName = filename.replace(/\.(mov|mp4)$/i, '');
        const shadowPath = path.join(shadowDir, `${baseName}.mp4`);

        // Emit progress (for regen-all operation)
        io.emit('regen:shadows:progress', {
          current: i + 1,
          total: recordings.length,
          filename
        });

        await fs.remove(shadowPath);

        const result = await createShadowFile(
          recordingPath,
          shadowDir,
          undefined,
          config.shadowResolution || 240
        );

        if (result.success || result.error === 'Shadow file already exists') {
          results.completed++;
        } else {
          results.failed++;
        }
      } catch (err) {
        results.failed++;
      }
    }

    return results;
  }

  /**
   * Internal helper: Queue transcriptions
   * FR-136: Accept optional files parameter for selection-aware behavior
   */
  async function regenerateTranscriptsInternal(
    getConfig: () => Config,
    queueTranscription?: (path: string) => void,
    targetFiles?: string[]
  ): Promise<{ queued: number }> {
    const config = getConfig();
    const paths = getProjectPaths(expandPath(config.projectDirectory));
    const recordingsDir = paths.recordings;

    // FR-136: Use provided files or get all
    let recordings: string[];
    if (targetFiles && targetFiles.length > 0) {
      recordings = targetFiles;
    } else {
      const allFiles = await fs.readdir(recordingsDir);
      recordings = allFiles.filter(f => f.endsWith('.mov') || f.endsWith('.mp4'));
    }

    let queued = 0;

    for (const filename of recordings) {
      const recordingPath = path.join(recordingsDir, filename);
      const baseName = path.basename(filename, path.extname(filename));
      const transcriptPath = path.join(paths.transcripts, `${baseName}.txt`);
      const hasTranscript = await fs.pathExists(transcriptPath);

      if (!hasTranscript && queueTranscription) {
        queueTranscription(recordingPath);
        queued++;
      }
    }

    return { queued };
  }

  /**
   * Internal helper: Regenerate chapters
   * FR-136: Accept optional files parameter for selection-aware behavior
   */
  async function regenerateChaptersInternal(
    getConfig: () => Config,
    io: Server<ClientToServerEvents, ServerToClientEvents>,
    targetFiles?: string[],
    requestSettings?: { resolution?: '720p' | '1080p'; includeTitleSlides?: boolean; slideDuration?: number }
  ): Promise<{ completed: number; failed: number }> {
    const config = getConfig();
    const paths = getProjectPaths(expandPath(config.projectDirectory));
    const recordingsDir = paths.recordings;

    // FR-136: Use provided files or get all
    let recordings: string[];
    if (targetFiles && targetFiles.length > 0) {
      recordings = targetFiles;
    } else {
      const allFiles = await fs.readdir(recordingsDir);
      recordings = allFiles.filter(f => f.endsWith('.mov') || f.endsWith('.mp4'));
    }

    const recordingFiles: RecordingFile[] = recordings.map(filename => {
      const parsed = parseRecordingFilename(filename);
      return {
        filename,
        path: path.join(recordingsDir, filename),
        chapter: parsed.chapter || '00',
        sequence: parsed.sequence || '0',
        name: parsed.name || '',
        tags: parsed.tags || [],
        size: 0,
        timestamp: new Date().toISOString(),
        isSafe: false,
        isParked: false,
      };
    });

    const chapters = groupRecordingFilesByChapter(recordingFiles);
    const chapterKeys = Array.from(chapters.keys()).sort();

    const results = { completed: 0, failed: 0 };

    // Build GenerateOptions (matching chapters.ts pattern)
    // Use request settings if provided, otherwise fall back to config
    const chapterConfig = config.chapterRecordings || {
      slideDuration: 1.0,
      resolution: '720p' as '720p' | '1080p',
      includeTitleSlides: false,
    };

    const tempDir = path.join(os.tmpdir(), 'flihub-chapters');

    const options = {
      slideDuration: requestSettings?.slideDuration ?? chapterConfig.slideDuration ?? 1.0,
      resolution: (requestSettings?.resolution ?? chapterConfig.resolution) as '720p' | '1080p',
      outputDir: paths.chapters,
      tempDir,
      includeTitleSlides: requestSettings?.includeTitleSlides ?? chapterConfig.includeTitleSlides ?? false,
      transcriptsDir: paths.transcripts,
    };

    for (const chapterKey of chapterKeys) {
      const chapterFiles = chapters.get(chapterKey)!;
      try {
        await fs.ensureDir(paths.chapters);

        const existingFiles = await fs.readdir(paths.chapters);
        for (const file of existingFiles) {
          if (file.startsWith(`${chapterKey}-`)) {
            await fs.remove(path.join(paths.chapters, file));
          }
        }

        // Convert RecordingFile[] to ChapterSegments format
        const chapterSegments = {
          chapter: chapterKey,
          label: chapterFiles[0]?.name || chapterKey,
          segments: await Promise.all(chapterFiles.map(async (file) => {
            const duration = await getVideoDuration(file.path) || 0;
            return {
              filename: file.filename,
              path: file.path,
              sequence: parseInt(file.sequence),
              label: file.name,
              tags: file.tags,
              duration,
            };
          })),
          totalDuration: 0,
        };

        // Calculate total duration
        chapterSegments.totalDuration = chapterSegments.segments.reduce((sum, seg) => sum + seg.duration, 0);

        // Generate new chapter video (correct signature!)
        await generateChapterRecording(chapterSegments, options);
        results.completed++;
      } catch (err) {
        results.failed++;
      }
    }

    // Clean up temp directory
    await fs.remove(tempDir).catch(() => {});

    return results;
  }

  return router;
}
