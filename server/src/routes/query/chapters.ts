/**
 * NFR-68: Query Routes - Chapters
 *
 * Endpoint: GET / (mounted at /projects/:code/chapters)
 */

import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs-extra';
import { expandPath } from '../../utils/pathUtils.js';
import { resolveProjectCode } from '../../utils/projectResolver.js';
import { getProjectPaths } from '../../../../shared/paths.js';
import { detectFinalMedia } from '../../utils/finalMedia.js';
import { extractChapters } from '../../utils/chapterExtraction.js';
import { readDirSafe } from '../../utils/filesystem.js';
import { formatChaptersReport } from '../../utils/reporters.js';
import type { Config, QueryChapter } from '../../../../shared/types.js';

const PROJECTS_ROOT = '~/dev/video-projects/v-appydave';

export function createChaptersRoutes(getConfig: () => Config): Router {
  const router = Router({ mergeParams: true });

  // ============================================
  // GET / - Get chapters with timestamps
  // ============================================
  router.get('/', async (req: Request, res: Response) => {
    const { code: codeInput } = req.params;

    try {
      // FR-119: Resolve short codes (e.g., "c10" -> "c10-poem-epic-3")
      const resolved = await resolveProjectCode(codeInput);
      if (!resolved) {
        res.status(404).json({ success: false, error: `Project not found: ${codeInput}` });
        return;
      }

      const { code, path: projectPath } = resolved;

      const paths = getProjectPaths(projectPath);

      // Get recording counts per chapter
      const chapterRecordings = new Map<string, number>();
      const chapterHasTranscript = new Map<string, boolean>();

      // NFR-67: Using readDirSafe - returns [] for missing dir
      for (const dir of [paths.recordings, paths.safe]) {
        const files = await readDirSafe(dir);
        for (const file of files) {
          const match = file.match(/^(\d{2})-/);
          if (match) {
            const chapter = match[1];
            chapterRecordings.set(chapter, (chapterRecordings.get(chapter) || 0) + 1);
          }
        }
      }

      // Check transcript existence per chapter
      // NFR-67: Using readDirSafe
      const transcriptFiles = await readDirSafe(paths.transcripts);
      for (const file of transcriptFiles) {
        if (!file.endsWith('.txt') || file.endsWith('-chapter.txt')) continue;
        const match = file.match(/^(\d{2})-/);
        if (match) {
          chapterHasTranscript.set(match[1], true);
        }
      }

      // Try to extract chapters with timestamps from SRT
      let chaptersWithTimestamps: QueryChapter[] = [];
      try {
        const finalMedia = await detectFinalMedia(projectPath, code);
        if (finalMedia.srt) {
          const result = await extractChapters(projectPath, finalMedia.srt.path);
          if (result.success) {
            chaptersWithTimestamps = result.chapters.map(ch => ({
              chapter: ch.chapter,
              name: ch.name,
              displayName: ch.displayName,
              timestamp: ch.timestamp || null,
              timestampSeconds: ch.timestampSeconds || null,
              recordingCount: chapterRecordings.get(String(ch.chapter).padStart(2, '0')) || 0,
              hasTranscript: chapterHasTranscript.get(String(ch.chapter).padStart(2, '0')) || false,
            }));
          }
        }
      } catch (err) {
        // SRT extraction failed - log but continue with recording-based chapters
        console.warn('Chapter extraction failed:', err);
      }

      // If no SRT-based chapters, generate from recordings
      if (chaptersWithTimestamps.length === 0) {
        for (const [chapter, count] of chapterRecordings) {
          chaptersWithTimestamps.push({
            chapter: parseInt(chapter, 10),
            name: '', // No name without transcript parsing
            displayName: `Chapter ${parseInt(chapter, 10)}`,
            timestamp: null,
            timestampSeconds: null,
            recordingCount: count,
            hasTranscript: chapterHasTranscript.get(chapter) || false,
          });
        }
        chaptersWithTimestamps.sort((a, b) => a.chapter - b.chapter);
      }

      // Generate formatted string for YouTube
      const formatted = chaptersWithTimestamps
        .filter(ch => ch.timestamp)
        .map(ch => `${ch.timestamp} ${ch.displayName}`)
        .join('\n');

      // FR-53: ASCII format support
      if (req.query.format === 'text') {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return res.send(formatChaptersReport(chaptersWithTimestamps, code, formatted));
      }

      res.json({
        success: true,
        chapters: chaptersWithTimestamps,
        formatted,
      });
    } catch (error) {
      console.error('Error extracting chapters:', error);
      res.status(500).json({ success: false, error: 'Failed to extract chapters' });
    }
  });

  return router;
}
