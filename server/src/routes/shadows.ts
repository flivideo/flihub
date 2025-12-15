/**
 * FR-83: Shadow Recording System API Routes
 *
 * POST /api/shadows/generate - Generate shadows for current project
 * POST /api/shadows/generate-all - Generate shadows for all projects
 * GET /api/shadows/status - Get shadow status and watch directory status
 */

import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs-extra';
import type { Config, ShadowStatusResponse, ShadowGenerateResponse, ShadowGenerateAllResponse } from '../../../shared/types.js';
import { expandPath } from '../utils/pathUtils.js';
import { getShadowCounts, generateProjectShadows } from '../utils/shadowFiles.js';
import { readDirSafe } from '../utils/filesystem.js';

const PROJECTS_ROOT = '~/dev/video-projects/v-appydave';

export function createShadowsRouter(getConfig: () => Config) {
  const router = Router();

  // GET /api/shadows/status - Get shadow counts and watch directory status
  router.get('/status', async (_req: Request, res: Response) => {
    const config = getConfig();

    try {
      // Current project shadow counts
      const projectPath = expandPath(config.projectDirectory);
      const recordingsDir = path.join(projectPath, 'recordings');
      const safeDir = path.join(projectPath, 'recordings', '-safe');
      const shadowDir = path.join(projectPath, 'recording-shadows');
      const shadowSafeDir = path.join(projectPath, 'recording-shadows', '-safe');

      const counts = await getShadowCounts(recordingsDir, safeDir, shadowDir, shadowSafeDir);

      // Watch directory status
      const watchPath = expandPath(config.watchDirectory);
      const watchExists = await fs.pathExists(watchPath);
      const watchConfigured = !!config.watchDirectory && config.watchDirectory !== '';

      const response: ShadowStatusResponse = {
        currentProject: counts,
        watchDirectory: {
          configured: watchConfigured,
          exists: watchExists,
          path: config.watchDirectory,
        },
      };

      res.json(response);
    } catch (err) {
      res.status(500).json({
        currentProject: { recordings: 0, shadows: 0, missing: 0 },
        watchDirectory: { configured: false, exists: false, path: '' },
        error: String(err),
      });
    }
  });

  // POST /api/shadows/generate - Generate shadows for current project
  router.post('/generate', async (_req: Request, res: Response) => {
    const config = getConfig();

    try {
      const projectPath = expandPath(config.projectDirectory);
      const result = await generateProjectShadows(projectPath);

      const response: ShadowGenerateResponse = {
        success: true,
        created: result.created,
        skipped: result.skipped,
        errors: result.errors.length > 0 ? result.errors : undefined,
      };

      res.json(response);
    } catch (err) {
      res.status(500).json({
        success: false,
        created: 0,
        skipped: 0,
        error: String(err),
      });
    }
  });

  // POST /api/shadows/generate-all - Generate shadows for all projects
  router.post('/generate-all', async (_req: Request, res: Response) => {
    try {
      const projectsDir = expandPath(PROJECTS_ROOT);

      // Get all project directories
      const entries = await readDirSafe(projectsDir);
      const projectDirs = entries.filter(e => {
        const fullPath = path.join(projectsDir, e);
        return fs.statSync(fullPath).isDirectory() && !e.startsWith('.');
      });

      let totalCreated = 0;
      let totalSkipped = 0;
      const allErrors: string[] = [];

      for (const dir of projectDirs) {
        const projectPath = path.join(projectsDir, dir);
        const result = await generateProjectShadows(projectPath);

        totalCreated += result.created;
        totalSkipped += result.skipped;

        for (const error of result.errors) {
          allErrors.push(`${dir}: ${error}`);
        }
      }

      const response: ShadowGenerateAllResponse = {
        success: true,
        projects: projectDirs.length,
        created: totalCreated,
        skipped: totalSkipped,
        errors: allErrors.length > 0 ? allErrors : undefined,
      };

      res.json(response);
    } catch (err) {
      res.status(500).json({
        success: false,
        projects: 0,
        created: 0,
        skipped: 0,
        error: String(err),
      });
    }
  });

  return router;
}
