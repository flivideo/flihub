// FR-131: Manage Panel routes - Bulk operations and file management
import { Router } from 'express';
import { getProjectPaths } from '../../../shared/paths.js';
import { parseRecordingFilename, buildRecordingFilename } from '../../../shared/naming.js';
import { renameRecording } from '../utils/renameRecording.js';
import type { Config } from '../config.js';
import type { TranscriptionJob } from '../../../shared/types.js';

/**
 * Create manage panel routes
 * @param getConfig - Function to get current config
 * @param queueTranscription - Function to queue transcription jobs
 * @param getActiveJob - Function to get active transcription job
 * @param getQueue - Function to get transcription queue
 */
export function createManageRoutes(
  getConfig: () => Config,
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
      const paths = getProjectPaths(config.projectDirectory);
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

  return router;
}
