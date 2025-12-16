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
 * 5. **Cross-platform support**: FR-89 adds Windows/Linux support for folder operations.
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
type FolderKey = 'ecamm' | 'downloads' | 'recordings' | 'safe' | 'trash' | 'images' | 'thumbs' | 'transcripts' | 'project' | 'final' | 's3Staging' | 'inbox' | 'shadows' | 'chapters';

/**
 * FR-89 Part 3: Cross-platform file explorer opener
 * Opens a folder in the native file explorer for the current OS.
 *
 * @param folderPath - The path to open
 * @returns Promise that resolves when the command completes
 */
function openInFileExplorer(folderPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const platform = os.platform();
    let command: string;

    switch (platform) {
      case 'darwin':
        // macOS: open in Finder
        command = `open "${folderPath}"`;
        break;
      case 'win32':
        // Windows: open in Explorer
        // Use start command with empty title ("") to handle paths with spaces
        command = `start "" "${folderPath}"`;
        break;
      case 'linux':
        // Linux: use xdg-open
        command = `xdg-open "${folderPath}"`;
        break;
      default:
        reject(new Error(`Unsupported platform: ${platform}`));
        return;
    }

    exec(command, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

/**
 * FR-89 Part 3: Cross-platform file opener
 * Opens a file in its default application.
 *
 * @param filePath - The path to the file to open
 * @returns Promise that resolves when the command completes
 */
function openInDefaultApp(filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const platform = os.platform();
    let command: string;

    switch (platform) {
      case 'darwin':
        // macOS: open in default app
        command = `open "${filePath}"`;
        break;
      case 'win32':
        // Windows: open in default app
        command = `start "" "${filePath}"`;
        break;
      case 'linux':
        // Linux: use xdg-open
        command = `xdg-open "${filePath}"`;
        break;
      default:
        reject(new Error(`Unsupported platform: ${platform}`));
        return;
    }

    exec(command, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

// FR-90: Import WatcherManager type
import type { WatcherManager } from '../WatcherManager.js';

export function createSystemRoutes(config: Config, watcherManager?: WatcherManager): Router {
  const router = Router();

  /**
   * POST /api/system/open-folder
   *
   * Opens a predefined folder in Finder (macOS only).
   *
   * Request body:
   *   { folder: FolderKey, projectCode?: string }
   *
   * Response:
   *   Success: { success: true, path: string }
   *   Error: { success: false, error: string }
   *
   * Security: Only accepts predefined folder keys, not arbitrary paths.
   * The actual path is resolved from config or derived via getProjectPaths().
   *
   * If projectCode is provided, opens folder for that specific project.
   * Otherwise uses the current project from config.
   */
  router.post('/open-folder', async (req: Request, res: Response) => {
    const { folder, projectCode } = req.body as { folder: FolderKey; projectCode?: string };

    if (!folder) {
      res.status(400).json({ success: false, error: 'Folder key is required' });
      return;
    }

    // Determine project path - use projectCode if provided, else current project
    // FR-97: Use config.projectsRootDirectory instead of hardcoded path
    let projectPath: string;
    if (projectCode) {
      // Validate projectCode doesn't contain path traversal
      if (projectCode.includes('..') || projectCode.includes('/') || projectCode.includes('\\')) {
        res.status(400).json({ success: false, error: 'Invalid project code' });
        return;
      }
      if (!config.projectsRootDirectory) {
        res.status(400).json({ success: false, error: 'projectsRootDirectory not configured' });
        return;
      }
      const projectsDir = expandPath(config.projectsRootDirectory);
      projectPath = path.join(projectsDir, projectCode);
    } else {
      projectPath = expandPath(config.projectDirectory);
    }

    const paths = getProjectPaths(projectPath);

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
      inbox: paths.inbox,
      shadows: path.join(projectPath, 'recording-shadows'),
      chapters: path.join(paths.recordings, '-chapters'),
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

    // FR-89 Part 3: Cross-platform folder opener
    try {
      await openInFileExplorer(folderPath);
      console.log(`Opened folder: ${folderPath}`);
      res.json({ success: true, path: folderPath });
    } catch (error) {
      console.error('Failed to open folder:', error);
      res.status(500).json({ success: false, error: 'Failed to open folder' });
    }
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

    // FR-89 Part 3: Cross-platform file opener
    try {
      await openInDefaultApp(filePath);
      console.log(`Opened file: ${filePath}`);
      res.json({ success: true, path: filePath });
    } catch (error) {
      console.error('Failed to open file:', error);
      res.status(500).json({ success: false, error: 'Failed to open file' });
    }
  });

  /**
   * GET /api/system/path-exists
   *
   * FR-89 Part 2: Check if a path exists on disk.
   * Used by Config panel to show path existence indicators.
   *
   * Query params:
   *   path: string - The path to check (must be a valid absolute path)
   *
   * Response:
   *   { exists: boolean, path: string }
   *
   * Security: Path is expanded (~ resolved) but not restricted to config paths.
   * This is safe because we're only checking existence, not executing anything.
   *
   * FR-89 Windows fix: Uses fs.stat() with try/catch for better UNC path support.
   */
  router.get('/path-exists', async (req: Request, res: Response) => {
    const pathToCheck = req.query.path as string;

    if (!pathToCheck) {
      res.status(400).json({ exists: false, error: 'Path is required' });
      return;
    }

    try {
      const expandedPath = expandPath(pathToCheck);

      // FR-89: Use fs.stat() instead of fs.pathExists() for better Windows UNC path support
      // fs.stat() is more reliable for paths like \\wsl$\Ubuntu\... on Windows
      try {
        await fs.stat(expandedPath);
        res.json({ exists: true, path: expandedPath });
      } catch (statError: unknown) {
        // ENOENT = path doesn't exist, other errors = path might exist but can't be accessed
        const code = (statError as { code?: string }).code;
        if (code === 'ENOENT' || code === 'ENOTDIR') {
          res.json({ exists: false, path: expandedPath });
        } else {
          // Log unexpected errors but still report as not accessible
          console.warn(`Path check warning for ${expandedPath}:`, statError);
          res.json({ exists: false, path: expandedPath, warning: 'Path not accessible' });
        }
      }
    } catch (error) {
      console.error('Error checking path:', error);
      res.json({ exists: false, path: pathToCheck, error: 'Failed to check path' });
    }
  });

  /**
   * GET /api/system/watchers
   *
   * FR-90: Get list of all active file watchers.
   * Used by Config panel to show watcher status.
   *
   * Response:
   *   { watchers: Array<{ name: string, pattern: string | string[], status: string }> }
   */
  router.get('/watchers', (_req: Request, res: Response) => {
    if (!watcherManager) {
      res.json({ watchers: [] });
      return;
    }

    const watchers = watcherManager.getWatcherInfo();
    res.json({ watchers });
  });

  return router;
}
