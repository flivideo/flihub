/**
 * FR-58: Chapter Recording Routes — chapter previews are DEPRECATED (FliStudio roadmap §1.2e).
 *
 * POST /api/chapters/generate - 410 Gone: FliHub no longer makes chapter previews
 * GET /api/chapters/config - Get chapter recording configuration (legacy setting, read-only use)
 * PUT /api/chapters/config - Update chapter recording configuration (legacy setting)
 * GET /api/chapters/status - Existing recordings/-chapters/ files (legacy folders stay and still play)
 */

import { Router, Request, Response } from 'express';
import fs from 'fs-extra';
import type { Config, ChapterRecordingConfig } from '../../../shared/types.js';
import { getProjectPaths } from '../../../shared/paths.js';
import { expandPath } from '../utils/pathUtils.js';
import { groupRecordingsByChapter } from '../utils/chapterRecording.js';

export const CHAPTER_PREVIEWS_GONE =
  'Chapter previews are deprecated (FliStudio roadmap §1.2e); existing recordings/-chapters/ folders are left in place.';

// Default configuration
const DEFAULT_CHAPTER_CONFIG: ChapterRecordingConfig = {
  slideDuration: 1.0,
  resolution: '720p',
  autoGenerate: false,
  includeTitleSlides: false, // FR-76: Purple slides off by default
};

export function createChapterRoutes(
  getConfig: () => Config,
  saveConfig: (config: Config) => void
) {
  const router = Router();

  // Helper to get chapter recording config with defaults
  function getChapterConfig(): ChapterRecordingConfig {
    const config = getConfig();
    return config.chapterRecordings || DEFAULT_CHAPTER_CONFIG;
  }

  // GET /api/chapters/config - Get chapter recording configuration
  router.get('/config', (_req: Request, res: Response) => {
    const chapterConfig = getChapterConfig();
    res.json({
      success: true,
      config: chapterConfig,
    });
  });

  // PUT /api/chapters/config - Update chapter recording configuration
  router.put('/config', (req: Request, res: Response) => {
    const { slideDuration, resolution, autoGenerate, includeTitleSlides } = req.body;
    const config = getConfig();

    const newChapterConfig: ChapterRecordingConfig = {
      slideDuration:
        typeof slideDuration === 'number' ? slideDuration : DEFAULT_CHAPTER_CONFIG.slideDuration,
      resolution: resolution === '1080p' ? '1080p' : '720p',
      autoGenerate:
        typeof autoGenerate === 'boolean' ? autoGenerate : DEFAULT_CHAPTER_CONFIG.autoGenerate,
      includeTitleSlides:
        typeof includeTitleSlides === 'boolean'
          ? includeTitleSlides
          : DEFAULT_CHAPTER_CONFIG.includeTitleSlides,
    };

    config.chapterRecordings = newChapterConfig;
    saveConfig(config);

    res.json({
      success: true,
      config: newChapterConfig,
    });
  });

  // POST /api/chapters/generate - 410 Gone (roadmap §1.2e)
  router.post('/generate', (_req: Request, res: Response) => {
    res.status(410).json({ success: false, error: CHAPTER_PREVIEWS_GONE });
  });

  // GET /api/chapters/status - Existing chapter recordings (legacy) and the chapters available
  router.get('/status', async (_req: Request, res: Response) => {
    const config = getConfig();
    const projectDir = expandPath(config.projectDirectory);
    const paths = getProjectPaths(projectDir);

    // Get existing chapter recordings
    const existing: string[] = [];
    if (await fs.pathExists(paths.chapters)) {
      const files = await fs.readdir(paths.chapters);
      existing.push(...files.filter((f) => f.endsWith('.mov')));
    }

    // Get available chapters from recordings
    const chapters = await groupRecordingsByChapter(paths.recordings);
    const available = Array.from(chapters.entries()).map(([ch, data]) => ({
      chapter: ch,
      label: data.label,
      segmentCount: data.segments.length,
      totalDuration: data.totalDuration,
      hasRecording: existing.some((f) => f.startsWith(`${ch}-`)),
    }));

    res.json({
      success: true,
      isGenerating: false,
      existing,
      chapters: available,
    });
  });

  return router;
}
