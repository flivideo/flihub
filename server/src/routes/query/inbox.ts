/**
 * NFR-68: Query Routes - Inbox
 *
 * Endpoints:
 * - GET / - List inbox files and subfolders
 * - GET /:subfolder/:filename - Read inbox file content
 */

import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs-extra';
import { expandPath } from '../../utils/pathUtils.js';
import { getProjectPaths } from '../../../../shared/paths.js';
import { readDirEntriesSafe, statSafe } from '../../utils/filesystem.js';
import type { Config, InboxFile, InboxSubfolder } from '../../../../shared/types.js';

const PROJECTS_ROOT = '~/dev/video-projects/v-appydave';

export function createInboxRoutes(getConfig: () => Config): Router {
  const router = Router({ mergeParams: true });

  // ============================================
  // GET / - List inbox files and subfolders (FR-59)
  // ============================================
  router.get('/', async (req: Request, res: Response) => {
    const { code } = req.params;
    const projectsDir = expandPath(PROJECTS_ROOT);
    const projectPath = path.join(projectsDir, code);

    try {
      if (!await fs.pathExists(projectPath)) {
        res.status(404).json({ success: false, error: `Project not found: ${code}` });
        return;
      }

      const paths = getProjectPaths(projectPath);

      // NFR-66: Using shared InboxFile and InboxSubfolder types
      const result: InboxSubfolder[] = [];

      // Scan inbox directory for actual subfolders (dynamic, not hardcoded)
      if (await fs.pathExists(paths.inbox)) {
        const entries = await readDirEntriesSafe(paths.inbox);

        // First, check for root-level files (files directly in inbox/)
        const rootFiles = entries.filter(e => e.isFile() && !e.name.startsWith('.'));
        if (rootFiles.length > 0) {
          const rootResult: InboxSubfolder = {
            name: '(root)',
            path: paths.inbox,
            fileCount: 0,
            files: [],
          };

          for (const file of rootFiles) {
            const filePath = path.join(paths.inbox, file.name);
            const stat = await statSafe(filePath);
            if (stat) {
              rootResult.files.push({
                filename: file.name,
                size: stat.size,
                modifiedAt: stat.mtime.toISOString(),
              });
            }
          }
          rootResult.fileCount = rootResult.files.length;
          // Sort files alphabetically
          rootResult.files.sort((a, b) => a.filename.localeCompare(b.filename));
          result.push(rootResult);
        }

        // Then scan subfolders
        const subfolderNames = entries
          .filter(e => e.isDirectory() && !e.name.startsWith('.') && !e.name.startsWith('-'))
          .map(e => e.name);

        // Preferred sort order: raw, dataset, presentation first, then alphabetical
        const preferredOrder = ['raw', 'dataset', 'presentation'];
        subfolderNames.sort((a, b) => {
          const aIndex = preferredOrder.indexOf(a);
          const bIndex = preferredOrder.indexOf(b);
          // Both in preferred list - sort by preferred order
          if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
          // Only a in preferred list - a comes first
          if (aIndex !== -1) return -1;
          // Only b in preferred list - b comes first
          if (bIndex !== -1) return 1;
          // Neither in preferred list - alphabetical
          return a.localeCompare(b);
        });

        for (const name of subfolderNames) {
          const subfolderPath = path.join(paths.inbox, name);
          const folderResult: InboxSubfolder = {
            name,
            path: subfolderPath,
            fileCount: 0,
            files: [],
          };

          const fileEntries = await readDirEntriesSafe(subfolderPath);
          const files = fileEntries.filter(e => e.isFile() && !e.name.startsWith('.'));

          // Get file details
          for (const file of files) {
            const filePath = path.join(subfolderPath, file.name);
            const stat = await statSafe(filePath);
            if (stat) {
              folderResult.files.push({
                filename: file.name,
                size: stat.size,
                modifiedAt: stat.mtime.toISOString(),
              });
            }
          }
          folderResult.fileCount = folderResult.files.length;

          // Sort files alphabetically
          folderResult.files.sort((a, b) => a.filename.localeCompare(b.filename));

          result.push(folderResult);
        }
      }

      const totalFiles = result.reduce((sum, f) => sum + f.fileCount, 0);

      res.json({
        success: true,
        inbox: {
          totalFiles,
          subfolders: result,
        },
      });
    } catch (error) {
      console.error('Error listing inbox:', error);
      res.status(500).json({ success: false, error: 'Failed to list inbox' });
    }
  });

  // ============================================
  // GET /:subfolder/:filename - Read inbox file content (FR-64)
  // ============================================
  router.get('/:subfolder/:filename', async (req: Request, res: Response) => {
    const { code, subfolder, filename } = req.params;
    const projectsDir = expandPath(PROJECTS_ROOT);
    const projectPath = path.join(projectsDir, code);

    try {
      // Security: Validate no path traversal in subfolder or filename
      if (subfolder.includes('..') || subfolder.includes('/') || subfolder.includes('\\')) {
        res.status(400).json({ success: false, error: 'Invalid subfolder' });
        return;
      }
      if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        res.status(400).json({ success: false, error: 'Invalid filename' });
        return;
      }

      if (!await fs.pathExists(projectPath)) {
        res.status(404).json({ success: false, error: `Project not found: ${code}` });
        return;
      }

      const paths = getProjectPaths(projectPath);

      // Handle (root) subfolder - files directly in inbox/
      let filePath: string;
      if (subfolder === '(root)') {
        filePath = path.join(paths.inbox, filename);
      } else {
        filePath = path.join(paths.inbox, subfolder, filename);
      }

      if (!await fs.pathExists(filePath)) {
        res.status(404).json({ success: false, error: `File not found: ${filename}` });
        return;
      }

      // Determine MIME type based on extension
      const ext = path.extname(filename).toLowerCase();
      const mimeTypes: Record<string, string> = {
        '.md': 'text/markdown',
        '.json': 'application/json',
        '.html': 'text/html',
        '.txt': 'text/plain',
        '.css': 'text/css',
        '.js': 'text/javascript',
        '.ts': 'text/typescript',
        '.yaml': 'text/yaml',
        '.yml': 'text/yaml',
        '.xml': 'text/xml',
      };
      const mimeType = mimeTypes[ext] || 'text/plain';

      // Only allow text-based files
      const allowedExtensions = ['.md', '.json', '.html', '.txt', '.css', '.js', '.ts', '.yaml', '.yml', '.xml'];
      if (!allowedExtensions.includes(ext)) {
        res.status(400).json({ success: false, error: `File type not supported for viewing: ${ext}` });
        return;
      }

      const content = await fs.readFile(filePath, 'utf-8');

      res.json({
        success: true,
        filename,
        content,
        mimeType,
      });
    } catch (error) {
      console.error('Error reading inbox file:', error);
      res.status(500).json({ success: false, error: 'Failed to read file' });
    }
  });

  return router;
}
