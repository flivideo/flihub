/**
 * NFR-68: Query Routes - Images
 *
 * Endpoint: GET / (mounted at /projects/:code/images)
 */

import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs-extra';
import { expandPath } from '../../utils/pathUtils.js';
import { getProjectPaths } from '../../../../shared/paths.js';
import { parseImageFilename, compareImageAssets } from '../../../../shared/naming.js';
import { formatImagesReport } from '../../utils/reporters.js';
import type { Config, QueryImage } from '../../../../shared/types.js';

const PROJECTS_ROOT = '~/dev/video-projects/v-appydave';

export function createImagesRoutes(getConfig: () => Config): Router {
  const router = Router({ mergeParams: true });

  // ============================================
  // GET / - List images for a project
  // ============================================
  router.get('/', async (req: Request, res: Response) => {
    const { code } = req.params;
    const { chapter: chapterFilter } = req.query;
    const projectsDir = expandPath(PROJECTS_ROOT);
    const projectPath = path.join(projectsDir, code);

    try {
      if (!await fs.pathExists(projectPath)) {
        res.status(404).json({ success: false, error: `Project not found: ${code}` });
        return;
      }

      const paths = getProjectPaths(projectPath);
      const images: QueryImage[] = [];

      if (!await fs.pathExists(paths.images)) {
        // FR-53: ASCII format support for empty case
        if (req.query.format === 'text') {
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          return res.send(formatImagesReport([], code));
        }
        res.json({ success: true, images: [] });
        return;
      }

      const files = await fs.readdir(paths.images);
      for (const filename of files) {
        const parsed = parseImageFilename(filename);
        if (!parsed) continue;

        const filePath = path.join(paths.images, filename);
        const stat = await fs.stat(filePath);

        images.push({
          filename,
          chapter: parsed.chapter,
          sequence: parsed.sequence,
          imageOrder: parsed.imageOrder,
          variant: parsed.variant,
          label: parsed.label,
          size: stat.size,
        });
      }

      // Sort using shared comparator
      images.sort(compareImageAssets);

      // Apply chapter filter
      let filtered = images;
      if (chapterFilter && typeof chapterFilter === 'string') {
        const chapterNum = chapterFilter.padStart(2, '0');
        filtered = filtered.filter(img => img.chapter === chapterNum || img.chapter === chapterFilter);
      }

      // FR-53: ASCII format support
      if (req.query.format === 'text') {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return res.send(formatImagesReport(filtered, code));
      }

      res.json({ success: true, images: filtered });
    } catch (error) {
      console.error('Error listing images:', error);
      res.status(500).json({ success: false, error: 'Failed to list images' });
    }
  });

  return router;
}
