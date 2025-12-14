/**
 * NFR-68: Query Routes - Recordings
 *
 * Endpoint: GET / (mounted at /projects/:code/recordings)
 */

import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs-extra';
import { expandPath } from '../../utils/pathUtils.js';
import { getProjectPaths } from '../../../../shared/paths.js';
import { parseRecordingFilename, extractTagsFromName } from '../../../../shared/naming.js';
import { readDirSafe, statSafe } from '../../utils/filesystem.js';
import { formatRecordingsReport } from '../../utils/reporters.js';
import type { Config, QueryRecording } from '../../../../shared/types.js';

const PROJECTS_ROOT = '~/dev/video-projects/v-appydave';

export function createRecordingsRoutes(getConfig: () => Config): Router {
  const router = Router({ mergeParams: true });

  // ============================================
  // GET / - List recordings for a project
  // ============================================
  router.get('/', async (req: Request, res: Response) => {
    const { code } = req.params;
    const { chapter: chapterFilter, 'missing-transcripts': missingFilter } = req.query;
    const projectsDir = expandPath(PROJECTS_ROOT);
    const projectPath = path.join(projectsDir, code);

    try {
      if (!await fs.pathExists(projectPath)) {
        res.status(404).json({ success: false, error: `Project not found: ${code}` });
        return;
      }

      const paths = getProjectPaths(projectPath);
      const recordings: QueryRecording[] = [];

      // Get transcript filenames for hasTranscript check
      // NFR-67: Using readDirSafe - returns [] for missing dir, throws on real errors
      const transcriptSet = new Set<string>();
      const transcriptFiles = await readDirSafe(paths.transcripts);
      for (const f of transcriptFiles) {
        if (f.endsWith('.txt') && !f.endsWith('-chapter.txt')) {
          transcriptSet.add(f.replace('.txt', ''));
        }
      }

      // Scan recordings and safe folders
      const folders: Array<{ dir: string; folder: 'recordings' | 'safe' }> = [
        { dir: paths.recordings, folder: 'recordings' },
        { dir: paths.safe, folder: 'safe' },
      ];

      // NFR-67: Using readDirSafe - returns [] for missing dir
      for (const { dir, folder } of folders) {
        const files = await readDirSafe(dir);
        for (const filename of files) {
          if (!filename.endsWith('.mov')) continue;

          const parsed = parseRecordingFilename(filename);
          if (!parsed) continue;

          const filePath = path.join(dir, filename);
          const stat = await statSafe(filePath);
          if (!stat) continue; // File was deleted between readdir and stat

          const baseName = filename.replace('.mov', '');

          // NFR-65: Extract tags from name using shared utility
          const { name: cleanName, tags } = extractTagsFromName(parsed.name || '');

          const recording: QueryRecording = {
            filename,
            chapter: parsed.chapter,
            sequence: parsed.sequence || '0',
            name: cleanName,
            tags,
            folder,
            size: stat.size,
            duration: null, // Would require ffprobe
            hasTranscript: transcriptSet.has(baseName),
          };

          recordings.push(recording);
        }
      }

      // Sort by chapter, sequence
      recordings.sort((a, b) => {
        const chapterCompare = parseInt(a.chapter, 10) - parseInt(b.chapter, 10);
        if (chapterCompare !== 0) return chapterCompare;
        return parseInt(a.sequence, 10) - parseInt(b.sequence, 10);
      });

      // Apply filters
      let filtered = recordings;

      if (chapterFilter && typeof chapterFilter === 'string') {
        const chapterNum = chapterFilter.padStart(2, '0');
        filtered = filtered.filter(r => r.chapter === chapterNum || r.chapter === chapterFilter);
      }

      if (missingFilter === 'true') {
        filtered = filtered.filter(r => !r.hasTranscript);
      }

      // FR-53: ASCII format support
      if (req.query.format === 'text') {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return res.send(formatRecordingsReport(filtered, code));
      }

      res.json({ success: true, recordings: filtered });
    } catch (error) {
      console.error('Error listing recordings:', error);
      res.status(500).json({ success: false, error: 'Failed to list recordings' });
    }
  });

  return router;
}
