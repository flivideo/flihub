// FR-131: Manage Panel routes - Bulk operations and file management
import { Router } from 'express';
import path from 'path';
import fs from 'fs-extra';
import type { Server } from 'socket.io';
import { getProjectPaths } from '../../../shared/paths.js';
import {
  parseRecordingFilename,
  buildRecordingFilename,
  extractTagsFromName,
  formatChapter,
} from '../../../shared/naming.js';
import { renameRecording } from '../utils/renameRecording.js';
import { CHAPTER_PREVIEWS_GONE } from './chapters.js';
import { expandPath } from '../utils/pathUtils.js';
import type {
  Config,
  TranscriptionJob,
  ServerToClientEvents,
  ClientToServerEvents,
  UndoRenameResponse,
} from '../../../shared/types.js';

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

  // B047: Last batch undo mapping — single array, replaced on every bulk operation
  let lastBatchMapping: Array<{ oldFilename: string; newFilename: string }> = [];

  /**
   * GET /api/manage/recordings-folder-path
   * FR-141: Returns the recordings folder path for the current project
   */
  router.get('/recordings-folder-path', (_req, res) => {
    const config = getConfig();
    if (!config.projectDirectory) {
      res.json({ success: false, error: 'No project directory configured' });
      return;
    }
    const projectPath = expandPath(config.projectDirectory);
    const paths = getProjectPaths(projectPath);
    res.json({ success: true, path: paths.recordings });
  });

  /**
   * POST /api/manage/bulk-rename
   * FR-138: Bulk rename multiple recordings with full control
   *
   * Body:
   * {
   *   files: string[];              // Array of filenames to rename
   *   chapter?: string;             // New chapter (01-99), optional = preserve from original
   *   sequenceMode: 'preserve' | 'renumber';  // Preserve original sequences or renumber
   *   sequenceStart?: number;       // Starting sequence (if renumber mode)
   *   label: string;                // New label (formerly newLabel)
   *   tags?: string[];              // Optional tags
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
      const { files, chapter, sequenceMode, sequenceStart, label, tags, newLabel } = req.body;

      if (!Array.isArray(files) || files.length === 0) {
        return res.json({
          success: false,
          error: 'No files provided',
        });
      }

      // Support both old API (newLabel) and new API (label) for backwards compatibility
      const finalLabel = label || newLabel;
      if (!finalLabel || typeof finalLabel !== 'string') {
        return res.json({
          success: false,
          error: 'Invalid label provided',
        });
      }

      // Default sequenceMode to 'preserve' for backwards compatibility with old API
      const finalSequenceMode = sequenceMode || 'preserve';

      const config = getConfig();
      const paths = getProjectPaths(expandPath(config.projectDirectory));
      const activeJob = getActiveJob ? getActiveJob() : null;
      const queue = getQueue ? getQueue() : [];

      const renamed: Array<{ old: string; new: string }> = [];
      const errors: Array<{ file: string; error: string }> = [];

      console.log(
        `[FR-138] Bulk rename: ${files.length} files with label "${finalLabel}", chapter=${chapter || 'preserve'}, mode=${finalSequenceMode}`
      );

      // Process each file
      for (let i = 0; i < files.length; i++) {
        const oldFilename = files[i];
        try {
          // Parse the old filename
          const parsed = parseRecordingFilename(oldFilename);
          if (!parsed) {
            errors.push({
              file: oldFilename,
              error: 'Invalid filename format',
            });
            continue;
          }

          // Determine new chapter (use provided chapter, or preserve original)
          const newChapter = chapter || parsed.chapter;

          // Determine new sequence
          let newSequence: string;
          if (finalSequenceMode === 'preserve') {
            // Preserve original sequence
            newSequence = parsed.sequence || '1';
          } else {
            // Renumber starting from sequenceStart
            newSequence = String((sequenceStart || 1) + i);
          }

          // Build new filename
          const newFilename = buildRecordingFilename(
            newChapter,
            newSequence,
            finalLabel,
            tags || []
          );

          console.log(`[FR-138] Renaming: ${oldFilename} → ${newFilename}`);

          // Use FR-130 rename logic (delete+regenerate pattern)
          const result = await renameRecording(
            oldFilename,
            newFilename,
            paths,
            activeJob,
            queue
          );

          if (result.success) {
            renamed.push({ old: oldFilename, new: newFilename });
          } else {
            errors.push({
              file: oldFilename,
              error: result.error || 'Rename failed',
            });
          }
        } catch (err) {
          console.error(`[FR-138] Error renaming ${oldFilename}:`, err);
          errors.push({
            file: oldFilename,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      console.log(
        `[FR-138] Bulk rename complete: ${renamed.length} renamed, ${errors.length} errors`
      );

      // B047: Store undo mapping after successful renames
      if (renamed.length > 0) {
        lastBatchMapping = renamed.map((r) => ({ oldFilename: r.old, newFilename: r.new }));
      }

      res.json({
        success: errors.length === 0,
        renamedCount: renamed.length,
        transcriptionQueued: renamed.length > 0,
        files: renamed,
        undoAvailable: renamed.length > 0,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (err) {
      console.error('[FR-138] Bulk rename error:', err);
      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Internal server error',
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
      const { force = false, files } = req.body; // FR-136: Accept optional files param
      const config = getConfig();
      const paths = getProjectPaths(expandPath(config.projectDirectory));

      if (!queueTranscription) {
        return res.status(500).json({
          success: false,
          error: 'Transcription queue not available',
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
        recordings = allFiles.filter((f) => f.endsWith('.mov') || f.endsWith('.mp4'));
      }

      let queued = 0;

      console.log(
        `[FR-131] Regen transcripts: Processing ${recordings.length} ${scope} recordings (force=${force})`
      );

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
        scope, // FR-136: Report whether 'selected' or 'all'
        force,
      });
    } catch (err) {
      console.error('[FR-131 Regen Transcripts] Error:', err);
      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Internal server error',
      });
    }
  });

  /**
   * POST /api/manage/regen-chapters, POST /api/manage/regen-all — 410 Gone.
   * Both made chapter preview videos (FR-58/FR-131), deprecated by FliStudio roadmap §1.2e.
   * Existing recordings/-chapters/ folders are left in place and still play; transcripts regen
   * remains at POST /api/manage/regen-transcripts.
   */
  router.post(['/regen-chapters', '/regen-all'], (_req, res) => {
    res.status(410).json({ success: false, error: CHAPTER_PREVIEWS_GONE });
  });

  /**
   * DELETE /api/manage/delete-transcripts
   * Delete transcript files (.txt, .srt, .json) for the current project.
   * Body: { files?: string[] } — recording filenames; omit for all.
   */
  router.delete('/delete-transcripts', async (req, res) => {
    try {
      const config = getConfig();
      const paths = getProjectPaths(expandPath(config.projectDirectory));
      const transcriptsDir = paths.transcripts;

      if (!fs.existsSync(transcriptsDir)) {
        return res.json({ success: true, deleted: 0 });
      }

      const { files: targetFiles } = req.body as { files?: string[] };
      let deleted = 0;

      if (targetFiles && targetFiles.length > 0) {
        // Delete only transcripts for the specified recording filenames
        for (const filename of targetFiles) {
          const baseName = path.basename(filename, path.extname(filename));
          for (const ext of ['.txt', '.srt', '.json']) {
            const filePath = path.join(transcriptsDir, `${baseName}${ext}`);
            if (fs.existsSync(filePath)) {
              await fs.remove(filePath);
              deleted++;
            }
          }
        }
      } else {
        // Delete all transcript files
        const allFiles = await fs.readdir(transcriptsDir);
        for (const file of allFiles.filter((f) => /\.(txt|srt|json)$/i.test(f))) {
          await fs.remove(path.join(transcriptsDir, file));
          deleted++;
        }
      }

      console.log(`[delete-transcripts] Deleted ${deleted} files from ${transcriptsDir}`);
      res.json({ success: true, deleted });
    } catch (err) {
      console.error('[delete-transcripts] Error:', err);
      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Internal server error',
      });
    }
  });

  /**
   * DELETE /api/manage/delete-subfolder
   * WU2: Delete contents of a project subfolder (pre-offload cleanup).
   * Body: { subfolder: string }
   * Only allowed subfolders can be deleted — recordings and transcripts are protected.
   */
  const DELETABLE_SUBFOLDERS = ['edit-1st', 'edit-2nd', 'final', '-trash', 's3-staging', 'inbox'];

  router.delete('/delete-subfolder', async (req, res) => {
    try {
      const { subfolder } = req.body as { subfolder?: string };

      if (!subfolder) {
        return res.status(400).json({ success: false, error: 'Missing subfolder' });
      }

      if (!DELETABLE_SUBFOLDERS.includes(subfolder)) {
        return res.status(400).json({
          success: false,
          error: `Subfolder '${subfolder}' is not deletable`,
        });
      }

      const config = getConfig();
      const projectPath = expandPath(config.projectDirectory);
      const folderPath = path.join(projectPath, subfolder);

      if (!fs.existsSync(folderPath)) {
        return res.json({ success: true, deleted: 0 });
      }

      const entries = await fs.readdir(folderPath);
      let deleted = 0;

      for (const entry of entries) {
        await fs.remove(path.join(folderPath, entry));
        deleted++;
      }

      console.log(`[delete-subfolder] Deleted ${deleted} entries from ${folderPath}`);
      res.json({ success: true, deleted, subfolder });
    } catch (err) {
      console.error('[delete-subfolder] Error:', err);
      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Internal server error',
      });
    }
  });

  /**
   * POST /api/manage/rename-chapter
   * FR-140: Rename all files in a chapter
   *
   * Body:
   * {
   *   oldChapter: string;  // "03"
   *   newChapter: string;  // "02"
   * }
   *
   * Returns:
   * {
   *   success: boolean;
   *   filesRenamed: number;
   *   error?: string;
   * }
   */
  router.post('/rename-chapter', async (req, res) => {
    try {
      const { oldChapter, newChapter } = req.body;

      if (!oldChapter || !newChapter) {
        return res.json({
          success: false,
          error: 'oldChapter and newChapter are required',
        });
      }

      const oldNum = parseInt(oldChapter, 10);
      const newNum = parseInt(newChapter, 10);

      if (isNaN(oldNum) || isNaN(newNum)) {
        return res.json({
          success: false,
          error: 'Invalid chapter numbers',
        });
      }

      if (oldNum < 1 || oldNum > 99 || newNum < 1 || newNum > 99) {
        return res.json({
          success: false,
          error: 'Chapter numbers must be between 01 and 99',
        });
      }

      if (oldNum === newNum) {
        return res.json({
          success: false,
          error: 'Old and new chapter cannot be the same',
        });
      }

      const config = getConfig();
      const paths = getProjectPaths(expandPath(config.projectDirectory));
      const recordingsDir = paths.recordings;
      const activeJob = getActiveJob ? getActiveJob() : null;
      const queue = getQueue ? getQueue() : [];

      // Check if any transcription is active
      if (activeJob) {
        return res.json({
          success: false,
          error: 'Cannot rename chapters while transcription is in progress',
        });
      }

      // Get all files in this chapter
      const allFiles = await fs.readdir(recordingsDir);
      const recordings = allFiles.filter((f) => f.endsWith('.mov') || f.endsWith('.mp4'));

      const chapterFiles = recordings.filter((f) => {
        const parsed = parseRecordingFilename(f);
        return parsed && parsed.chapter === oldChapter;
      });

      if (chapterFiles.length === 0) {
        return res.json({
          success: false,
          error: `No files found in chapter ${oldChapter}`,
        });
      }

      console.log(
        `[FR-140] Renaming chapter ${oldChapter} → ${newChapter} (${chapterFiles.length} files)`
      );

      let renamedCount = 0;

      // Rename each file
      for (const oldFilename of chapterFiles) {
        const parsed = parseRecordingFilename(oldFilename);
        if (!parsed) continue;

        // Build new filename with updated chapter
        const newFilename =
          buildRecordingFilename(newChapter, parsed.sequence, parsed.name) +
          path.extname(oldFilename);

        console.log(`[FR-140]   ${oldFilename} → ${newFilename}`);

        // Use FR-130 renameRecording (handles derivatives, state migration, etc.)
        const result = await renameRecording(
          oldFilename,
          newFilename,
          paths,
          activeJob,
          queue
        );

        if (result.success) {
          renamedCount++;
        }
      }

      // Emit Socket.io event
      io.emit('recordings:changed');

      console.log(`[FR-140] Rename chapter complete: ${renamedCount}/${chapterFiles.length} files`);

      return res.json({
        success: true,
        filesRenamed: renamedCount,
      });
    } catch (err) {
      console.error('[FR-140] Rename chapter error:', err);
      return res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to rename chapter',
      });
    }
  });

  /**
   * POST /api/manage/swap-chapters
   * FR-140: Swap two chapters
   *
   * Body:
   * {
   *   chapter1: string;  // "01"
   *   chapter2: string;  // "06"
   * }
   *
   * Returns:
   * {
   *   success: boolean;
   *   filesSwapped: number;
   *   error?: string;
   * }
   */
  router.post('/swap-chapters', async (req, res) => {
    try {
      const { chapter1, chapter2 } = req.body;

      if (!chapter1 || !chapter2) {
        return res.json({
          success: false,
          error: 'chapter1 and chapter2 are required',
        });
      }

      const ch1Num = parseInt(chapter1, 10);
      const ch2Num = parseInt(chapter2, 10);

      if (isNaN(ch1Num) || isNaN(ch2Num)) {
        return res.json({
          success: false,
          error: 'Invalid chapter numbers',
        });
      }

      if (ch1Num < 1 || ch1Num > 99 || ch2Num < 1 || ch2Num > 99) {
        return res.json({
          success: false,
          error: 'Chapter numbers must be between 01 and 99',
        });
      }

      if (ch1Num === ch2Num) {
        return res.json({
          success: false,
          error: 'Cannot swap chapter with itself',
        });
      }

      const config = getConfig();
      const paths = getProjectPaths(expandPath(config.projectDirectory));
      const recordingsDir = paths.recordings;
      const activeJob = getActiveJob ? getActiveJob() : null;
      const queue = getQueue ? getQueue() : [];

      // Check if any transcription is active
      if (activeJob) {
        return res.json({
          success: false,
          error: 'Cannot swap chapters while transcription is in progress',
        });
      }

      // Get all recording files
      const allFiles = await fs.readdir(recordingsDir);
      const recordings = allFiles.filter((f) => f.endsWith('.mov') || f.endsWith('.mp4'));

      // Guard: chapter 99 is used as staging area — reject if it already has files
      const ch99Files = recordings.filter((f) => f.startsWith('99-'));
      if (ch99Files.length > 0 && chapter1 !== '99' && chapter2 !== '99') {
        return res.json({
          success: false,
          error: `Chapter 99 is in use (${ch99Files.length} file(s)) — cannot use it as swap staging. Rename chapter 99 files first.`,
        });
      }

      console.log(`[FR-140] Swapping chapters ${chapter1} ↔ ${chapter2}`);

      const tempChapter = '99'; // Temporary chapter for 3-phase swap
      let swappedCount = 0;

      // Phase 1: chapter1 → temp (99)
      console.log(`[FR-140] Phase 1: ${chapter1} → ${tempChapter}`);
      const ch1Files = recordings.filter((f) => {
        const parsed = parseRecordingFilename(f);
        return parsed && parsed.chapter === chapter1;
      });

      for (const oldFilename of ch1Files) {
        const parsed = parseRecordingFilename(oldFilename);
        if (!parsed) continue;

        const newFilename =
          buildRecordingFilename(tempChapter, parsed.sequence, parsed.name) +
          path.extname(oldFilename);

        const result = await renameRecording(
          oldFilename,
          newFilename,
          paths,
          activeJob,
          queue
        );

        if (result.success) swappedCount++;
      }

      // Phase 2: chapter2 → chapter1
      console.log(`[FR-140] Phase 2: ${chapter2} → ${chapter1}`);
      const ch2Files = recordings.filter((f) => {
        const parsed = parseRecordingFilename(f);
        return parsed && parsed.chapter === chapter2;
      });

      for (const oldFilename of ch2Files) {
        const parsed = parseRecordingFilename(oldFilename);
        if (!parsed) continue;

        const newFilename =
          buildRecordingFilename(chapter1, parsed.sequence, parsed.name) +
          path.extname(oldFilename);

        const result = await renameRecording(
          oldFilename,
          newFilename,
          paths,
          activeJob,
          queue
        );

        if (result.success) swappedCount++;
      }

      // Phase 3: temp (99) → chapter2
      console.log(`[FR-140] Phase 3: ${tempChapter} → ${chapter2}`);

      // Re-read directory to get updated filenames
      const updatedFiles = await fs.readdir(recordingsDir);
      const updatedRecordings = updatedFiles.filter(
        (f) => f.endsWith('.mov') || f.endsWith('.mp4')
      );

      const tempFiles = updatedRecordings.filter((f) => {
        const parsed = parseRecordingFilename(f);
        return parsed && parsed.chapter === tempChapter;
      });

      for (const oldFilename of tempFiles) {
        const parsed = parseRecordingFilename(oldFilename);
        if (!parsed) continue;

        const newFilename =
          buildRecordingFilename(chapter2, parsed.sequence, parsed.name) +
          path.extname(oldFilename);

        const result = await renameRecording(
          oldFilename,
          newFilename,
          paths,
          activeJob,
          queue
        );

        if (result.success) swappedCount++;
      }

      // Emit Socket.io event
      io.emit('recordings:changed');

      console.log(`[FR-140] Swap complete: ${swappedCount} files renamed`);

      return res.json({
        success: true,
        filesSwapped: swappedCount,
      });
    } catch (err) {
      console.error('[FR-140] Swap chapters error:', err);
      return res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to swap chapters',
      });
    }
  });

  /**
   * POST /api/manage/undo-rename
   * B047: Undo the last bulk rename operation
   *
   * Returns:
   * {
   *   success: boolean;
   *   filesReverted: number;
   *   error?: string;
   * }
   */
  router.post('/undo-rename', async (_req, res) => {
    if (lastBatchMapping.length === 0) {
      return res.json({ success: false, filesReverted: 0, error: 'Nothing to undo' } satisfies UndoRenameResponse);
    }

    const config = getConfig();
    const paths = getProjectPaths(expandPath(config.projectDirectory));
    const activeJob = getActiveJob ? getActiveJob() : null;
    const queue = getQueue ? getQueue() : [];
    const errors: string[] = [];
    let revertedCount = 0;
    let skippedCount = 0;

    // Reverse in reverse order to avoid conflicts
    const reversedMapping = [...lastBatchMapping].reverse();

    for (const { oldFilename, newFilename } of reversedMapping) {
      // Validate file still has expected name before attempting undo
      const filePath = path.join(paths.recordings, newFilename);
      const exists = await fs.pathExists(filePath);
      if (!exists) {
        skippedCount++;
        errors.push(`Skipped ${newFilename}: file was modified since batch operation`);
        continue;
      }

      // Undo: rename newFilename back to oldFilename
      const result = await renameRecording(
        newFilename,    // current name (was the "new" name)
        oldFilename,    // target name (was the "old" name)
        paths,
        activeJob,
        queue
      );

      if (result.success) {
        revertedCount++;
      } else {
        errors.push(`Failed to revert ${newFilename}: ${result.error}`);
      }
    }

    // Clear the mapping — no undo-of-undo
    lastBatchMapping = [];

    // Notify clients
    io.emit('recordings:changed');

    return res.json({
      success: errors.length === 0,
      filesReverted: revertedCount,
      ...(errors.length > 0 && { error: errors.join('; ') }),
    } satisfies UndoRenameResponse);
  });

  /**
   * POST /api/manage/split-chapter
   * B047: Split a chapter at a given sequence number, cascading higher chapters up
   *
   * Body:
   * {
   *   chapter: string;          // source chapter, e.g. "04"
   *   splitAtSequence: number;  // files with seq >= this move to new chapter
   * }
   *
   * Returns: SplitChapterResponse
   */
  router.post('/split-chapter', async (req, res) => {
    try {
      const { chapter, splitAtSequence } = req.body;

      // Validate chapter: must be a 2-digit string
      if (!chapter || typeof chapter !== 'string' || !/^\d{2}$/.test(chapter)) {
        return res.json({
          success: false,
          sourceChapter: chapter || '',
          newChapter: '',
          filesMoved: 0,
          cascadedChapters: 0,
          undoMapping: [],
          error: 'chapter must be a 2-digit string (e.g. "04")',
        });
      }

      // Validate splitAtSequence: must be a positive integer
      if (
        splitAtSequence === undefined ||
        splitAtSequence === null ||
        typeof splitAtSequence !== 'number' ||
        !Number.isInteger(splitAtSequence) ||
        splitAtSequence < 1
      ) {
        return res.json({
          success: false,
          sourceChapter: chapter,
          newChapter: '',
          filesMoved: 0,
          cascadedChapters: 0,
          undoMapping: [],
          error: 'splitAtSequence must be a positive integer',
        });
      }

      const config = getConfig();
      const paths = getProjectPaths(expandPath(config.projectDirectory));
      const recordingsDir = paths.recordings;
      const activeJob = getActiveJob ? getActiveJob() : null;
      const queue = getQueue ? getQueue() : [];

      // Read all recording files
      const allFiles = await fs.readdir(recordingsDir);
      const recordings = allFiles.filter((f) => f.endsWith('.mov') || f.endsWith('.mp4'));

      // Parse all filenames and group by chapter
      const chapterMap = new Map<
        number,
        Array<{ filename: string; chapter: string; sequence: number; name: string; tags: string[] }>
      >();

      for (const filename of recordings) {
        const parsed = parseRecordingFilename(filename);
        if (!parsed || parsed.sequence === null) continue;
        const chNum = parseInt(parsed.chapter, 10);
        if (!chapterMap.has(chNum)) {
          chapterMap.set(chNum, []);
        }
        // Extract tags from the raw filename (parseRecordingFilename strips them)
        const base = filename.replace(/\.(mov|mp4)$/i, '');
        const nameParts = base.split('-').slice(2).join('-');
        const { tags } = extractTagsFromName(nameParts);
        chapterMap.get(chNum)!.push({
          filename,
          chapter: parsed.chapter,
          sequence: parseInt(parsed.sequence, 10),
          name: parsed.name,
          tags,
        });
      }

      const sourceChapterNum = parseInt(chapter, 10);
      const sourceFiles = chapterMap.get(sourceChapterNum) || [];

      // Partition into keep and move
      const moveFiles = sourceFiles
        .filter((f) => f.sequence >= splitAtSequence)
        .sort((a, b) => a.sequence - b.sequence);

      if (moveFiles.length === 0) {
        return res.json({
          success: false,
          sourceChapter: chapter,
          newChapter: '',
          filesMoved: 0,
          cascadedChapters: 0,
          undoMapping: [],
          error: 'No files to split',
        });
      }

      const targetChapterNum = sourceChapterNum + 1;

      // Find all chapters >= targetChapterNum that have files (need to cascade)
      const chaptersToShift = Array.from(chapterMap.keys())
        .filter((ch) => ch >= targetChapterNum)
        .sort((a, b) => b - a); // Sort descending — rename from top down to avoid collisions

      // Guard: check if cascade would push chapters past 99
      if (chaptersToShift.length > 0) {
        const highestExisting = Math.max(...chaptersToShift);
        if (highestExisting + 1 > 99) {
          return res.json({
            success: false,
            sourceChapter: chapter,
            newChapter: '',
            filesMoved: 0,
            cascadedChapters: 0,
            undoMapping: [],
            error: 'Split would push chapters past limit (99)',
          });
        }
      }

      const undoMapping: Array<{ oldFilename: string; newFilename: string }> = [];
      let cascadedChapters = 0;

      // CASCADE: Rename higher chapters from top down
      console.log(
        `[B047] Split chapter ${chapter} at seq ${splitAtSequence}: cascading ${chaptersToShift.length} chapters`
      );

      for (const chNum of chaptersToShift) {
        const files = chapterMap.get(chNum)!;
        const newChapterStr = formatChapter(chNum + 1);

        for (const file of files) {
          const newFilename =
            buildRecordingFilename(newChapterStr, String(file.sequence), file.name, file.tags);

          console.log(`[B047]   Cascade: ${file.filename} → ${newFilename}`);

          const result = await renameRecording(
            file.filename,
            newFilename,
            paths,
            activeJob,
            queue
          );

          if (result.success) {
            undoMapping.push({ oldFilename: file.filename, newFilename });
          }
        }
        cascadedChapters++;
      }

      // Move split files to target chapter with sequences starting from 1
      const targetChapterStr = formatChapter(targetChapterNum);
      let filesMoved = 0;

      console.log(`[B047] Moving ${moveFiles.length} files to chapter ${targetChapterStr}`);

      for (let i = 0; i < moveFiles.length; i++) {
        const file = moveFiles[i];
        const newSeq = String(i + 1);
        const newFilename =
          buildRecordingFilename(targetChapterStr, newSeq, file.name, file.tags);

        console.log(`[B047]   Move: ${file.filename} → ${newFilename}`);

        const result = await renameRecording(
          file.filename,
          newFilename,
          paths,
          activeJob,
          queue
        );

        if (result.success) {
          undoMapping.push({ oldFilename: file.filename, newFilename });
          filesMoved++;
        }
      }

      // Store undo mapping so POST /api/manage/undo-rename can use it
      lastBatchMapping = undoMapping;

      // Emit Socket.io event
      io.emit('recordings:changed');

      console.log(`[B047] Split complete: ${filesMoved} moved, ${cascadedChapters} cascaded`);

      return res.json({
        success: true,
        sourceChapter: chapter,
        newChapter: targetChapterStr,
        filesMoved,
        cascadedChapters,
        undoMapping,
      });
    } catch (err) {
      console.error('[B047] Split chapter error:', err);
      return res.status(500).json({
        success: false,
        sourceChapter: req.body?.chapter || '',
        newChapter: '',
        filesMoved: 0,
        cascadedChapters: 0,
        undoMapping: [],
        error: err instanceof Error ? err.message : 'Failed to split chapter',
      });
    }
  });

  return router;
}
