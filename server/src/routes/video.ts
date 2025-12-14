/**
 * FR-70: Video Streaming Routes
 *
 * Endpoints:
 * - GET /video/:projectCode/*filepath - Stream video file with Range support
 */

import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs-extra';
import { expandPath } from '../utils/pathUtils.js';
import type { Config } from '../../../shared/types.js';

const PROJECTS_ROOT = '~/dev/video-projects/v-appydave';

// MIME types for video files
const VIDEO_MIME_TYPES: Record<string, string> = {
  '.mov': 'video/quicktime',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
  '.avi': 'video/x-msvideo',
};

export function createVideoRoutes(getConfig: () => Config): Router {
  const router = Router();

  /**
   * GET /:projectCode/:folder/:filename
   * Stream a video file from a project's recordings directory
   * Supports Range requests for seeking
   *
   * folder: 'recordings' or '-chapters'
   * filename: the video file name
   */
  router.get('/:projectCode/:folder/:filename', async (req: Request, res: Response) => {
    const { projectCode, folder, filename } = req.params;
    const filepath = `${folder}/${filename}`;

    // Security: Validate no path traversal and valid folder
    if (folder.includes('..') || filename.includes('..')) {
      res.status(400).json({ success: false, error: 'Invalid file path' });
      return;
    }

    // Only allow 'recordings' and '-chapters' folders
    const allowedFolders = ['recordings', '-chapters'];
    if (!allowedFolders.includes(folder)) {
      res.status(400).json({ success: false, error: 'Invalid folder' });
      return;
    }

    try {
      // Build full path to video file
      const projectsDir = expandPath(PROJECTS_ROOT);
      const videoPath = path.join(projectsDir, projectCode, filepath);

      // Verify file exists
      if (!await fs.pathExists(videoPath)) {
        res.status(404).json({ success: false, error: 'Video not found' });
        return;
      }

      // Get file stats
      const stat = await fs.stat(videoPath);
      const fileSize = stat.size;

      // Determine MIME type
      const ext = path.extname(videoPath).toLowerCase();
      const contentType = VIDEO_MIME_TYPES[ext] || 'video/mp4';

      // Handle Range requests for seeking
      const range = req.headers.range;

      if (range) {
        // Parse Range header
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        // Validate range
        if (start >= fileSize || end >= fileSize) {
          res.status(416).header('Content-Range', `bytes */${fileSize}`).end();
          return;
        }

        const chunkSize = end - start + 1;

        res.status(206);
        res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Content-Length', chunkSize);
        res.setHeader('Content-Type', contentType);

        // Stream the requested chunk
        const stream = fs.createReadStream(videoPath, { start, end });
        stream.pipe(res);
      } else {
        // No Range header - serve entire file
        res.setHeader('Content-Length', fileSize);
        res.setHeader('Content-Type', contentType);
        res.setHeader('Accept-Ranges', 'bytes');

        const stream = fs.createReadStream(videoPath);
        stream.pipe(res);
      }
    } catch (error) {
      console.error('Error streaming video:', error);
      res.status(500).json({ success: false, error: 'Failed to stream video' });
    }
  });

  return router;
}
