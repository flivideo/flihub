/**
 * NFR-68: Query Routes - Export
 *
 * Endpoint: GET / (mounted at /projects/:code/export)
 * Combines project, recordings, transcripts, chapters, and images into single export
 */

import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs-extra';
import { expandPath } from '../../utils/pathUtils.js';
import { getProjectPaths } from '../../../../shared/paths.js';
import { getProjectStatsRaw } from '../../utils/projectStats.js';
import { detectFinalMedia } from '../../utils/finalMedia.js';
import { extractChapters } from '../../utils/chapterExtraction.js';
import {
  parseRecordingFilename,
  parseImageFilename,
  compareImageAssets,
  extractTagsFromName,
} from '../../../../shared/naming.js';
import { readDirSafe, statSafe, readFileSafe } from '../../utils/filesystem.js';
import { formatExportReport } from '../../utils/reporters.js';
import type {
  Config,
  QueryRecording,
  QueryTranscript,
  QueryChapter,
  QueryImage,
} from '../../../../shared/types.js';

const PROJECTS_ROOT = '~/dev/video-projects/v-appydave';

export function createExportRoutes(getConfig: () => Config): Router {
  const router = Router({ mergeParams: true });

  // ============================================
  // GET / - Export project data
  // ============================================
  router.get('/', async (req: Request, res: Response) => {
    const { code } = req.params;
    const { include } = req.query;
    const projectsDir = expandPath(PROJECTS_ROOT);
    const projectPath = path.join(projectsDir, code);

    try {
      if (!await fs.pathExists(projectPath)) {
        res.status(404).json({ success: false, error: `Project not found: ${code}` });
        return;
      }

      // Parse include param
      const includeSections = include
        ? (include as string).split(',').map(s => s.trim().toLowerCase())
        : ['project', 'recordings', 'transcripts', 'chapters', 'images'];

      const exportData: Record<string, unknown> = {
        success: true,
        exportedAt: new Date().toISOString(),
      };

      // Get project detail - NFR-9: Use shared utility
      if (includeSections.includes('project')) {
        const config = getConfig();
        const raw = await getProjectStatsRaw(projectPath, code, config, { includeFinalMedia: true });

        exportData.project = {
          // FR-111: recordingsCount and safeCount removed (safe status is per-file)
          code,
          path: projectPath,
          stage: raw.stage,
          priority: raw.priority,
          stats: {
            recordings: raw.totalFiles,  // FR-111: All files are in recordings/
            chapters: raw.chapterCount,
            transcripts: {
              matched: raw.transcriptSync.matched,
              missing: raw.transcriptSync.missingTranscripts.length,
              orphaned: raw.transcriptSync.orphanedTranscripts.length,
            },
            images: raw.imageCount,
            thumbs: raw.thumbCount,
            totalDuration: null,
          },
          finalMedia: raw.finalMedia || null,
          createdAt: raw.createdAt,
          lastModified: raw.lastModified,
        };
      }

      // Get recordings
      // NFR-67: Using readDirSafe for safe directory reading
      if (includeSections.includes('recordings')) {
        const paths = getProjectPaths(projectPath);
        const recordings: QueryRecording[] = [];

        const transcriptSet = new Set<string>();
        const transcriptFiles = await readDirSafe(paths.transcripts);
        for (const f of transcriptFiles) {
          if (f.endsWith('.txt') && !f.endsWith('-chapter.txt')) {
            transcriptSet.add(f.replace('.txt', ''));
          }
        }

        // FR-111: Only scan recordings/ (no more -safe folder)
        const { readProjectState, isRecordingSafe } = await import('../../utils/projectState.js');
        const state = await readProjectState(projectPath);

        const files = await readDirSafe(paths.recordings);
        for (const filename of files) {
          if (!filename.endsWith('.mov')) continue;
          const parsed = parseRecordingFilename(filename);
          if (!parsed) continue;

          const filePath = path.join(paths.recordings, filename);
          const stat = await statSafe(filePath);
          if (!stat) continue; // File deleted between readdir and stat

          const baseName = filename.replace('.mov', '');

          // NFR-65: Use extractTagsFromName utility
          const { name: cleanName, tags } = extractTagsFromName(parsed.name || '');

          recordings.push({
            filename,
            chapter: parsed.chapter,
            sequence: parsed.sequence || '0',
            name: cleanName,
            tags,
            folder: 'recordings',  // FR-111: Always recordings
            isSafe: isRecordingSafe(state, filename),  // FR-111: From state
            size: stat.size,
            duration: null,
            hasTranscript: transcriptSet.has(baseName),
          });
        }

        recordings.sort((a, b) => {
          const chapterCompare = parseInt(a.chapter, 10) - parseInt(b.chapter, 10);
          if (chapterCompare !== 0) return chapterCompare;
          return parseInt(a.sequence, 10) - parseInt(b.sequence, 10);
        });

        exportData.recordings = recordings;
      }

      // Get transcripts (with content for export)
      // NFR-67: Using readDirSafe and readFileSafe
      if (includeSections.includes('transcripts')) {
        const paths = getProjectPaths(projectPath);
        const transcripts: QueryTranscript[] = [];

        const files = await readDirSafe(paths.transcripts);
        for (const filename of files) {
          if (!filename.endsWith('.txt') || filename.endsWith('-chapter.txt')) continue;

          const parsed = parseRecordingFilename(filename.replace('.txt', '.mov'));
          if (!parsed) continue;

          const filePath = path.join(paths.transcripts, filename);
          const stat = await statSafe(filePath);
          if (!stat) continue;
          const content = await readFileSafe(filePath) ?? '';

          // NFR-65: Use extractTagsFromName utility
          const { name: cleanName } = extractTagsFromName(parsed.name || '');

          transcripts.push({
            filename,
            chapter: parsed.chapter,
            sequence: parsed.sequence || '0',
            name: cleanName,
            size: stat.size,
            content,
          });
        }

        transcripts.sort((a, b) => {
          const chapterCompare = parseInt(a.chapter, 10) - parseInt(b.chapter, 10);
          if (chapterCompare !== 0) return chapterCompare;
          return parseInt(a.sequence, 10) - parseInt(b.sequence, 10);
        });

        exportData.transcripts = transcripts;
      }

      // Get chapters
      // NFR-67: Using readDirSafe
      if (includeSections.includes('chapters')) {
        const paths = getProjectPaths(projectPath);
        const chapterRecordings = new Map<string, number>();
        const chapterHasTranscript = new Map<string, boolean>();

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

        const transcriptFiles = await readDirSafe(paths.transcripts);
        for (const file of transcriptFiles) {
          if (!file.endsWith('.txt') || file.endsWith('-chapter.txt')) continue;
          const match = file.match(/^(\d{2})-/);
          if (match) {
            chapterHasTranscript.set(match[1], true);
          }
        }

        let chapters: QueryChapter[] = [];
        try {
          const finalMedia = await detectFinalMedia(projectPath, code);
          if (finalMedia.srt) {
            const result = await extractChapters(projectPath, finalMedia.srt.path);
            if (result.success) {
              chapters = result.chapters.map(ch => ({
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
          // SRT extraction failed
          console.warn('Chapter extraction failed:', err);
        }

        if (chapters.length === 0) {
          for (const [chapter, count] of chapterRecordings) {
            chapters.push({
              chapter: parseInt(chapter, 10),
              name: '',
              displayName: `Chapter ${parseInt(chapter, 10)}`,
              timestamp: null,
              timestampSeconds: null,
              recordingCount: count,
              hasTranscript: chapterHasTranscript.get(chapter) || false,
            });
          }
          chapters.sort((a, b) => a.chapter - b.chapter);
        }

        exportData.chapters = chapters;
      }

      // Get images
      // NFR-67: Using readDirSafe and statSafe
      if (includeSections.includes('images')) {
        const paths = getProjectPaths(projectPath);
        const images: QueryImage[] = [];

        const files = await readDirSafe(paths.images);
        for (const filename of files) {
          const parsed = parseImageFilename(filename);
          if (!parsed) continue;

          const filePath = path.join(paths.images, filename);
          const stat = await statSafe(filePath);
          if (!stat) continue;

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

        images.sort(compareImageAssets);
        exportData.images = images;
      }

      // FR-53: ASCII format support
      if (req.query.format === 'text') {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return res.send(formatExportReport(exportData as Parameters<typeof formatExportReport>[0], code));
      }

      res.json(exportData);
    } catch (error) {
      console.error('Error exporting project:', error);
      res.status(500).json({ success: false, error: 'Failed to export project' });
    }
  });

  return router;
}
