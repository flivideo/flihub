/**
 * FR-58: Chapter Recording Routes
 *
 * POST /api/chapters/generate - Generate chapter recordings
 * GET /api/chapters/config - Get chapter recording configuration
 * PUT /api/chapters/config - Update chapter recording configuration
 */

import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import type { Server } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents, Config, ChapterRecordingConfig } from '../../../shared/types.js';
import { getProjectPaths } from '../../../shared/paths.js';
import { expandPath } from '../utils/pathUtils.js';
import {
  generateChapterRecording,
  groupRecordingsByChapter,
  checkFfmpegAvailable,
  type GenerateOptions,
} from '../utils/chapterRecording.js';

// Default configuration
const DEFAULT_CHAPTER_CONFIG: ChapterRecordingConfig = {
  slideDuration: 1.0,
  resolution: '720p',
  autoGenerate: false,
};

// Generation state
let isGenerating = false;

export function createChapterRoutes(
  getConfig: () => Config,
  saveConfig: (config: Config) => void,
  io: Server<ClientToServerEvents, ServerToClientEvents>
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
    const { slideDuration, resolution, autoGenerate } = req.body;
    const config = getConfig();

    const newChapterConfig: ChapterRecordingConfig = {
      slideDuration: typeof slideDuration === 'number' ? slideDuration : DEFAULT_CHAPTER_CONFIG.slideDuration,
      resolution: resolution === '1080p' ? '1080p' : '720p',
      autoGenerate: typeof autoGenerate === 'boolean' ? autoGenerate : DEFAULT_CHAPTER_CONFIG.autoGenerate,
    };

    config.chapterRecordings = newChapterConfig;
    saveConfig(config);

    res.json({
      success: true,
      config: newChapterConfig,
    });
  });

  // POST /api/chapters/generate - Generate chapter recordings
  router.post('/generate', async (req: Request, res: Response) => {
    // Check if already generating
    if (isGenerating) {
      res.status(409).json({
        success: false,
        error: 'Generation already in progress',
      });
      return;
    }

    // Check FFmpeg availability
    const ffmpegAvailable = await checkFfmpegAvailable();
    if (!ffmpegAvailable) {
      res.status(500).json({
        success: false,
        error: 'FFmpeg is not installed or not available in PATH',
      });
      return;
    }

    const { chapter: targetChapter, slideDuration, resolution } = req.body;
    const config = getConfig();
    const chapterConfig = getChapterConfig();

    // Get project paths
    const projectDir = expandPath(config.projectDirectory);
    const paths = getProjectPaths(projectDir);

    // Get all recordings grouped by chapter
    const chapters = await groupRecordingsByChapter(paths.recordings);

    if (chapters.size === 0) {
      res.status(404).json({
        success: false,
        error: 'No recordings found',
      });
      return;
    }

    // Filter to specific chapter if requested
    const chaptersToGenerate = targetChapter
      ? new Map([[targetChapter, chapters.get(targetChapter)!]]).entries()
      : chapters.entries();

    const chaptersArray = Array.from(chaptersToGenerate).filter(([, ch]) => ch && ch.segments.length > 0);

    if (chaptersArray.length === 0) {
      res.status(404).json({
        success: false,
        error: targetChapter ? `Chapter ${targetChapter} not found` : 'No valid chapters found',
      });
      return;
    }

    // Mark as generating
    isGenerating = true;

    // Prepare options
    const options: GenerateOptions = {
      slideDuration: slideDuration ?? chapterConfig.slideDuration,
      resolution: (resolution as '720p' | '1080p') ?? chapterConfig.resolution,
      outputDir: paths.chapters,
      tempDir: path.join(os.tmpdir(), 'flihub-chapters'),
    };

    // Start generation in background
    const generated: string[] = [];
    const errors: string[] = [];

    // Send immediate response that generation has started
    res.json({
      success: true,
      message: 'Generation started',
      chaptersToGenerate: chaptersArray.map(([ch]) => ch),
    });

    // Generate chapters
    try {
      let current = 0;
      const total = chaptersArray.length;

      for (const [chapterNum, chapterData] of chaptersArray) {
        current++;

        // Emit progress
        io.emit('chapters:generating', {
          chapter: chapterNum,
          total,
          current,
        });

        try {
          const outputFile = await generateChapterRecording(chapterData, options);
          generated.push(outputFile);

          // Emit individual completion
          io.emit('chapters:generated', {
            chapter: chapterNum,
            outputFile,
          });
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Unknown error';
          errors.push(`Chapter ${chapterNum}: ${errorMsg}`);
          console.error(`Error generating chapter ${chapterNum}:`, errorMsg);
        }
      }
    } finally {
      isGenerating = false;

      // Clean up temp directory
      const tempDir = path.join(os.tmpdir(), 'flihub-chapters');
      await fs.remove(tempDir).catch(() => {});
    }

    // Emit final completion
    io.emit('chapters:complete', {
      generated,
      errors: errors.length > 0 ? errors : undefined,
    });
  });

  // GET /api/chapters/status - Get generation status and existing chapter recordings
  router.get('/status', async (_req: Request, res: Response) => {
    const config = getConfig();
    const projectDir = expandPath(config.projectDirectory);
    const paths = getProjectPaths(projectDir);

    // Get existing chapter recordings
    const existing: string[] = [];
    if (await fs.pathExists(paths.chapters)) {
      const files = await fs.readdir(paths.chapters);
      existing.push(...files.filter(f => f.endsWith('.mov')));
    }

    // Get available chapters from recordings
    const chapters = await groupRecordingsByChapter(paths.recordings);
    const available = Array.from(chapters.entries()).map(([ch, data]) => ({
      chapter: ch,
      label: data.label,
      segmentCount: data.segments.length,
      totalDuration: data.totalDuration,
      hasRecording: existing.some(f => f.startsWith(`${ch}-`)),
    }));

    res.json({
      success: true,
      isGenerating,
      existing,
      chapters: available,
    });
  });

  return router;
}
