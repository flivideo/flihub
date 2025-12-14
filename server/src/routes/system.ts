/**
 * FR-29: System Routes
 *
 * This module handles non-CRUD system operations that interact with the
 * local operating system. All routes are prefixed with /api/system/.
 *
 * ## Pattern: /api/system/
 *
 * The /api/system/ namespace is reserved for operations that:
 * - Interact with the OS (opening folders, files, etc.)
 * - Perform system-level actions (health checks, config reloads)
 * - Are not typical REST CRUD operations
 *
 * ## Security Considerations
 *
 * IMPORTANT: These routes can execute OS commands. Security measures:
 *
 * 1. **Predefined folder keys only**: Routes accept folder keys (e.g., 'recordings',
 *    'safe'), NOT arbitrary paths. This prevents path traversal attacks.
 *
 * 2. **Path resolution via config**: All paths are derived from the config object
 *    or computed using getProjectPaths(). Users cannot specify arbitrary paths.
 *
 * 3. **Existence validation**: Before executing any OS command, the target path
 *    is validated to exist.
 *
 * 4. **Local-only**: This server is designed for local development use only.
 *    It should NOT be exposed to the public internet.
 *
 * 5. **macOS only**: Currently only supports macOS. Future OS support would
 *    require platform-specific implementations.
 *
 * ## Future Candidates for /api/system/
 *
 * - POST /api/system/open-file - Open file in default app
 * - POST /api/system/reveal-file - Reveal specific file in Finder
 * - GET /api/system/health - Server health check
 * - POST /api/system/restart-watchers - Reinitialize file watchers
 */
import { Router, Request, Response } from 'express';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import { expandPath } from '../utils/pathUtils.js';
import { getProjectPaths } from '../../../shared/paths.js';
import type { Config } from '../../../shared/types.js';

/**
 * Valid folder keys that can be opened.
 * This whitelist prevents arbitrary path execution.
 */
type FolderKey = 'ecamm' | 'downloads' | 'recordings' | 'safe' | 'trash' | 'images' | 'thumbs' | 'transcripts' | 'project' | 'final' | 's3Staging' | 'inbox';

export function createSystemRoutes(config: Config): Router {
  const router = Router();

  /**
   * POST /api/system/open-folder
   *
   * Opens a predefined folder in Finder (macOS only).
   *
   * Request body:
   *   { folder: FolderKey }
   *
   * Response:
   *   Success: { success: true, path: string }
   *   Error: { success: false, error: string }
   *
   * Security: Only accepts predefined folder keys, not arbitrary paths.
   * The actual path is resolved from config or derived via getProjectPaths().
   */
  router.post('/open-folder', async (req: Request, res: Response) => {
    const { folder } = req.body as { folder: FolderKey };

    if (!folder) {
      res.status(400).json({ success: false, error: 'Folder key is required' });
      return;
    }

    const paths = getProjectPaths(expandPath(config.projectDirectory));

    const folderMap: Record<FolderKey, string> = {
      ecamm: expandPath(config.watchDirectory),
      downloads: expandPath(config.imageSourceDirectory || '~/Downloads'),
      recordings: paths.recordings,
      safe: paths.safe,
      trash: paths.trash,
      images: paths.images,
      thumbs: paths.thumbs,
      transcripts: paths.transcripts,
      project: paths.project,
      final: paths.final,
      s3Staging: paths.s3Staging,
      inbox: paths.inbox,  // FR-59
    };

    const folderPath = folderMap[folder];

    if (!folderPath) {
      res.status(400).json({ success: false, error: 'Invalid folder key' });
      return;
    }

    // Check folder exists
    if (!await fs.pathExists(folderPath)) {
      res.status(404).json({ success: false, error: `Folder does not exist: ${folderPath}` });
      return;
    }

    // macOS: open in Finder
    exec(`open "${folderPath}"`, (error) => {
      if (error) {
        console.error('Failed to open folder:', error);
        res.status(500).json({ success: false, error: 'Failed to open folder' });
        return;
      }
      console.log(`Opened folder: ${folderPath}`);
      res.json({ success: true, path: folderPath });
    });
  });

  /**
   * GET /api/system/health
   *
   * Simple health check endpoint to verify FliHub is running.
   * Returns server status and current project info.
   */
  router.get('/health', (_req: Request, res: Response) => {
    res.json({
      success: true,
      status: 'ok',
      server: 'FliHub',
      port: 5101,
      project: config.projectDirectory?.split('/').pop() || null,
    });
  });

  /**
   * POST /api/system/open-file
   *
   * Opens a file in its default application (macOS only).
   * Used for opening HTML files from inbox in the browser.
   *
   * Request body:
   *   { subfolder: string, filename: string }
   *
   * Response:
   *   Success: { success: true, path: string }
   *   Error: { success: false, error: string }
   *
   * Security: Only accepts subfolder + filename, resolves path from project inbox.
   * Validates no path traversal characters.
   */
  router.post('/open-file', async (req: Request, res: Response) => {
    const { subfolder, filename } = req.body as { subfolder: string; filename: string };

    if (!subfolder || !filename) {
      res.status(400).json({ success: false, error: 'Subfolder and filename are required' });
      return;
    }

    // Security: Validate no path traversal
    if (subfolder.includes('..') || subfolder.includes('/') || subfolder.includes('\\')) {
      res.status(400).json({ success: false, error: 'Invalid subfolder' });
      return;
    }
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      res.status(400).json({ success: false, error: 'Invalid filename' });
      return;
    }

    const paths = getProjectPaths(expandPath(config.projectDirectory));

    // Handle (root) subfolder - files directly in inbox/
    let filePath: string;
    if (subfolder === '(root)') {
      filePath = path.join(paths.inbox, filename);
    } else {
      filePath = path.join(paths.inbox, subfolder, filename);
    }

    // Check file exists
    if (!await fs.pathExists(filePath)) {
      res.status(404).json({ success: false, error: `File does not exist: ${filename}` });
      return;
    }

    // macOS: open in default app
    exec(`open "${filePath}"`, (error) => {
      if (error) {
        console.error('Failed to open file:', error);
        res.status(500).json({ success: false, error: 'Failed to open file' });
        return;
      }
      console.log(`Opened file: ${filePath}`);
      res.json({ success: true, path: filePath });
    });
  });

  return router;
}
