/**
 * NFR-68: Query Routes - Split into Sub-Modules
 *
 * Composes sub-routers for better organization:
 * - projects.ts: /projects, /projects/resolve, /projects/:code
 * - recordings.ts: /projects/:code/recordings
 * - transcripts.ts: /projects/:code/transcripts
 * - chapters.ts: /projects/:code/chapters
 * - images.ts: /projects/:code/images
 * - export.ts: /projects/:code/export
 * - inbox.ts: /projects/:code/inbox/*
 */

import { Router, Request, Response } from 'express';
import type { Config } from '../../../../shared/types.js';
import { createProjectsRoutes } from './projects.js';
import { createRecordingsRoutes } from './recordings.js';
import { createTranscriptsRoutes } from './transcripts.js';
import { createChaptersRoutes } from './chapters.js';
import { createImagesRoutes } from './images.js';
import { createExportRoutes } from './export.js';
import { createInboxRoutes } from './inbox.js';

export function createQueryRoutes(getConfig: () => Config): Router {
  const router = Router();

  // Request logging middleware for all query endpoints
  router.use((req, _res, next) => {
    const query = Object.keys(req.query).length > 0 ? `?${new URLSearchParams(req.query as Record<string, string>)}` : '';
    console.log(`[Query API] ${req.method} ${req.path}${query}`);
    next();
  });

  // Config endpoint (system metadata)
  router.get('/config', async (_req: Request, res: Response) => {
    const config = getConfig();

    res.json({
      success: true,
      stages: ['none', 'recording', 'editing', 'done'],
      priorities: ['pinned', 'normal'],
      filters: ['pinned'],
      stageFilters: ['none', 'recording', 'editing', 'done'],
      availableTags: config.availableTags || [],
      commonNames: (config.commonNames || []).map(cn => cn.name),
    });
  });

  // Mount sub-routers
  router.use('/projects', createProjectsRoutes(getConfig));
  router.use('/projects/:code/recordings', createRecordingsRoutes(getConfig));
  router.use('/projects/:code/transcripts', createTranscriptsRoutes(getConfig));
  router.use('/projects/:code/chapters', createChaptersRoutes(getConfig));
  router.use('/projects/:code/images', createImagesRoutes(getConfig));
  router.use('/projects/:code/export', createExportRoutes(getConfig));
  router.use('/projects/:code/inbox', createInboxRoutes(getConfig));

  return router;
}
