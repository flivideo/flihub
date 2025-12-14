/**
 * NFR-68: Query Routes - Transcripts
 *
 * Endpoints:
 * - GET / - List transcripts for a project
 * - GET /:recording - Get single transcript content
 */

import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs-extra';
import { expandPath } from '../../utils/pathUtils.js';
import { getProjectPaths } from '../../../../shared/paths.js';
import { parseRecordingFilename } from '../../../../shared/naming.js';
import { readFileSafe } from '../../utils/filesystem.js';
import { formatTranscriptsReport } from '../../utils/reporters.js';
import type { Config, QueryTranscript } from '../../../../shared/types.js';

const PROJECTS_ROOT = '~/dev/video-projects/v-appydave';

export function createTranscriptsRoutes(getConfig: () => Config): Router {
  const router = Router({ mergeParams: true });

  // ============================================
  // GET / - List transcripts for a project
  // ============================================
  router.get('/', async (req: Request, res: Response) => {
    const { code } = req.params;
    const { chapter: chapterFilter, include } = req.query;
    const includeContent = include === 'content';
    const projectsDir = expandPath(PROJECTS_ROOT);
    const projectPath = path.join(projectsDir, code);

    try {
      if (!await fs.pathExists(projectPath)) {
        res.status(404).json({ success: false, error: `Project not found: ${code}` });
        return;
      }

      const paths = getProjectPaths(projectPath);
      const transcripts: QueryTranscript[] = [];

      if (!await fs.pathExists(paths.transcripts)) {
        // FR-53: ASCII format support for empty case
        if (req.query.format === 'text') {
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          return res.send(formatTranscriptsReport([], code));
        }
        res.json({ success: true, transcripts: [] });
        return;
      }

      const files = await fs.readdir(paths.transcripts);
      for (const filename of files) {
        if (!filename.endsWith('.txt') || filename.endsWith('-chapter.txt')) continue;

        const parsed = parseRecordingFilename(filename.replace('.txt', '.mov'));
        if (!parsed) continue;

        const filePath = path.join(paths.transcripts, filename);
        const stat = await fs.stat(filePath);

        // Extract name parts (remove tags)
        const nameParts = (parsed.name || '').split('-');
        const nameWords = nameParts.filter(part => !/^[A-Z]+$/.test(part));

        const transcript: QueryTranscript = {
          filename,
          chapter: parsed.chapter,
          sequence: parsed.sequence || '0',
          name: nameWords.join('-'),
          size: stat.size,
        };

        // Read content if requested
        // NFR-67: Using readFileSafe - returns null for missing file
        if (includeContent) {
          transcript.content = await readFileSafe(filePath) ?? '';
        } else {
          // Preview: first ~100 chars
          const content = await readFileSafe(filePath);
          if (content) {
            transcript.preview = content.slice(0, 100).replace(/\n/g, ' ').trim();
            if (content.length > 100) transcript.preview += '...';
          } else {
            transcript.preview = '';
          }
        }

        transcripts.push(transcript);
      }

      // Sort by chapter, sequence
      transcripts.sort((a, b) => {
        const chapterCompare = parseInt(a.chapter, 10) - parseInt(b.chapter, 10);
        if (chapterCompare !== 0) return chapterCompare;
        return parseInt(a.sequence, 10) - parseInt(b.sequence, 10);
      });

      // Apply chapter filter
      let filtered = transcripts;
      if (chapterFilter && typeof chapterFilter === 'string') {
        const chapterNum = chapterFilter.padStart(2, '0');
        filtered = filtered.filter(t => t.chapter === chapterNum || t.chapter === chapterFilter);
      }

      // FR-53: ASCII format support
      if (req.query.format === 'text') {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return res.send(formatTranscriptsReport(filtered, code));
      }

      res.json({ success: true, transcripts: filtered });
    } catch (error) {
      console.error('Error listing transcripts:', error);
      res.status(500).json({ success: false, error: 'Failed to list transcripts' });
    }
  });

  // ============================================
  // GET /:recording - Get single transcript content
  // ============================================
  router.get('/:recording', async (req: Request, res: Response) => {
    const { code, recording } = req.params;
    const projectsDir = expandPath(PROJECTS_ROOT);
    const projectPath = path.join(projectsDir, code);

    try {
      if (!await fs.pathExists(projectPath)) {
        res.status(404).json({ success: false, error: `Project not found: ${code}` });
        return;
      }

      const paths = getProjectPaths(projectPath);

      // Try with .txt extension
      let filename = recording;
      if (!filename.endsWith('.txt')) {
        filename = filename.replace(/\.mov$/, '') + '.txt';
      }

      const filePath = path.join(paths.transcripts, filename);

      if (!await fs.pathExists(filePath)) {
        res.status(404).json({ success: false, error: `Transcript not found: ${filename}` });
        return;
      }

      const parsed = parseRecordingFilename(filename.replace('.txt', '.mov'));
      const stat = await fs.stat(filePath);
      const content = await fs.readFile(filePath, 'utf-8');

      // Extract name parts (remove tags)
      const nameParts = (parsed?.name || '').split('-');
      const nameWords = nameParts.filter(part => !/^[A-Z]+$/.test(part));

      res.json({
        success: true,
        transcript: {
          filename,
          chapter: parsed?.chapter || '00',
          sequence: parsed?.sequence || '0',
          name: nameWords.join('-'),
          content,
        },
      });
    } catch (error) {
      console.error('Error getting transcript:', error);
      res.status(500).json({ success: false, error: 'Failed to get transcript' });
    }
  });

  return router;
}
