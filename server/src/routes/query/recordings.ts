/**
 * NFR-68: Query Routes - Recordings
 *
 * Endpoint: GET / (mounted at /projects/:code/recordings)
 *
 * FR-83: Unified scanning - merges real recordings with shadow video files.
 * Real files take precedence over shadows. Shadows are 240p preview videos.
 */

import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs-extra';
import { expandPath } from '../../utils/pathUtils.js';
import { getProjectPaths } from '../../../../shared/paths.js';
import { parseRecordingFilename, extractTagsFromName } from '../../../../shared/naming.js';
import { readDirSafe, statSafe } from '../../utils/filesystem.js';
import { formatRecordingsReport } from '../../utils/reporters.js';
import { getVideoDuration } from '../../utils/shadowFiles.js';
import type { Config, QueryRecording } from '../../../../shared/types.js';

const PROJECTS_ROOT = '~/dev/video-projects/v-appydave';

// FR-83/FR-111: Extended recording with shadow support
// isShadow: true = shadow-only (no real recording)
// hasShadow: true = real recording has a corresponding shadow
// FR-95: shadowSize = size of corresponding shadow file (null if no shadow)
// FR-111: folder is always 'recordings', isSafe comes from state file
interface UnifiedRecording extends QueryRecording {
  isShadow?: boolean;
  hasShadow?: boolean;
  shadowSize?: number | null;
}

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

      // FR-83/FR-111: Shadow directory (no more -safe folder)
      const shadowDir = path.join(projectPath, 'recording-shadows');

      // Build unified map: baseName -> recording (real takes precedence)
      const unifiedMap = new Map<string, UnifiedRecording>();

      // FR-83: Track which baseNames have shadow files
      const shadowSet = new Map<string, { size: number; duration: number | null }>();

      // FR-111: Read state file for safe flags
      const { readProjectState, isRecordingSafe } = await import('../../utils/projectState.js');
      const state = await readProjectState(projectPath);

      // Get transcript filenames for hasTranscript check
      // FR-94: .txt is the primary format - only .txt counts as "transcribed"
      const transcriptSet = new Set<string>();
      const transcriptFiles = await readDirSafe(paths.transcripts);
      for (const f of transcriptFiles) {
        if (f.endsWith('.txt') && !f.endsWith('-chapter.txt')) {
          transcriptSet.add(f.replace('.txt', ''));
        }
      }

      // FR-83/FR-111: First, scan shadow video files to build shadowSet
      // Then add shadow-only entries (will be overwritten by real files)
      // Only scan recording-shadows/ (no more -safe folder)
      const shadowFiles = await readDirSafe(shadowDir);
      for (const filename of shadowFiles) {
        if (!filename.match(/\.mp4$/i)) continue;

        const shadowPath = path.join(shadowDir, filename);
        const stat = await statSafe(shadowPath);
        if (!stat) continue;

        // Shadow filename matches original baseName (e.g., 01-1-intro.mp4)
        const baseName = filename.replace(/\.mp4$/i, '');
        const parsed = parseRecordingFilename(filename);
        if (!parsed) continue;

        // Get duration from shadow video
        const duration = await getVideoDuration(shadowPath);

        // Track that this baseName has a shadow
        shadowSet.set(baseName, { size: stat.size, duration });

        const { name: cleanName, tags } = extractTagsFromName(parsed.name || '');

        // Add as shadow-only entry (may be overwritten by real file)
        const recording: UnifiedRecording = {
          filename: `${baseName}.mov`,  // Report as .mov for consistency
          chapter: parsed.chapter,
          sequence: parsed.sequence || '0',
          name: cleanName,
          tags,
          folder: 'recordings',  // FR-111: Always recordings
          isSafe: isRecordingSafe(state, `${baseName}.mov`),  // FR-111: From state
          size: stat.size,
          duration: duration,
          hasTranscript: transcriptSet.has(baseName),
          isShadow: true,
          hasShadow: true,  // Shadow-only files obviously have shadow
          shadowSize: stat.size,  // FR-95: Shadow-only, so shadow size = file size
        };

        unifiedMap.set(baseName, recording);
      }

      // FR-111: Scan only recordings/ (no more -safe folder)
      const realFiles = await readDirSafe(paths.recordings);
      for (const filename of realFiles) {
        if (!filename.endsWith('.mov')) continue;

        const parsed = parseRecordingFilename(filename);
        if (!parsed) continue;

        const filePath = path.join(paths.recordings, filename);
        const stat = await statSafe(filePath);
        if (!stat) continue;

        const baseName = filename.replace('.mov', '');
        const { name: cleanName, tags } = extractTagsFromName(parsed.name || '');

        // Check if this real recording has a corresponding shadow
        const shadowInfo = shadowSet.get(baseName);
        const hasShadow = !!shadowInfo;

        const recording: UnifiedRecording = {
          filename,
          chapter: parsed.chapter,
          sequence: parsed.sequence || '0',
          name: cleanName,
          tags,
          folder: 'recordings',  // FR-111: Always recordings
          isSafe: isRecordingSafe(state, filename),  // FR-111: From state
          size: stat.size,
          duration: shadowInfo?.duration ?? null, // Use shadow duration if available
          hasTranscript: transcriptSet.has(baseName),
          isShadow: false,
          hasShadow,
          shadowSize: shadowInfo?.size ?? null,  // FR-95: Shadow file size (null if no shadow)
        };

        // Real file overwrites shadow
        unifiedMap.set(baseName, recording);
      }

      // Convert map to array
      const recordings = Array.from(unifiedMap.values());

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

      // FR-95: Calculate total sizes for header display
      // Real recordings: sum of actual .mov file sizes (excludes shadow-only)
      // Shadows: sum of all shadow file sizes
      let totalRecordingsSize = 0;
      let totalShadowsSize = 0;

      for (const r of recordings) {
        if (!r.isShadow) {
          totalRecordingsSize += r.size;
        }
        if (r.shadowSize) {
          totalShadowsSize += r.shadowSize;
        }
      }

      // FR-53: ASCII format support
      if (req.query.format === 'text') {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return res.send(formatRecordingsReport(filtered, code));
      }

      res.json({
        success: true,
        recordings: filtered,
        totalRecordingsSize,  // FR-95: Total size of real recordings in bytes
        totalShadowsSize: totalShadowsSize > 0 ? totalShadowsSize : null,  // FR-95: Total shadow size (null if none)
      });
    } catch (error) {
      console.error('Error listing recordings:', error);
      res.status(500).json({ success: false, error: 'Failed to list recordings' });
    }
  });

  return router;
}
