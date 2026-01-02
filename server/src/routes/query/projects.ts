/**
 * NFR-68: Query Routes - Projects
 *
 * Endpoints:
 * - GET / - List all projects
 * - GET /resolve - Resolve partial project code
 * - GET /:code - Get project detail
 */

import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs-extra';
import { expandPath } from '../../utils/pathUtils.js';
import { resolveProjectCode } from '../../utils/projectResolver.js';
import { getProjectPaths } from '../../../../shared/paths.js';
import { getProjectStatsRaw } from '../../utils/projectStats.js';
import { parseRecordingFilename } from '../../../../shared/naming.js';
import { readFileSafe } from '../../utils/filesystem.js';
import {
  countMovFiles,
  countTxtFiles,
  countUniqueChapters,
  countFiles,
  getProjectTimestamps,
  getTranscriptSyncStatus,
  getProjectIndicators,
} from '../../utils/scanning.js';
import {
  formatProjectsReport,
  formatProjectDetail,
} from '../../utils/reporters.js';
import type {
  Config,
  ProjectPriority,
  ProjectStage,
  QueryProjectSummary,
  QueryProjectDetail,
} from '../../../../shared/types.js';

const PROJECTS_ROOT = '~/dev/video-projects/v-appydave';

/**
 * FR-80: Migrate legacy stage values to new stage model
 */
function migrateOldStage(oldStage: string | undefined): ProjectStage | undefined {
  if (!oldStage) return undefined;

  const migration: Record<string, ProjectStage> = {
    'record': 'recording',
    'recording': 'recording',
    'edit': 'first-edit',
    'editing': 'first-edit',
    'done': 'published',
    'none': 'planning',
  };

  return migration[oldStage] || (oldStage as ProjectStage);
}

// Get all valid project folders
async function getProjectFolders(): Promise<string[]> {
  const projectsDir = expandPath(PROJECTS_ROOT);

  if (!await fs.pathExists(projectsDir)) {
    return [];
  }

  const entries = await fs.readdir(projectsDir, { withFileTypes: true });
  return entries
    .filter(e =>
      e.isDirectory() &&
      !e.name.startsWith('.') &&
      !e.name.startsWith('-') &&
      e.name !== 'archived'
    )
    .map(e => e.name);
}

export function createProjectsRoutes(getConfig: () => Config): Router {
  const router = Router({ mergeParams: true });

  // ============================================
  // FR-61: GET /resolve - Resolve partial project code
  // ============================================
  router.get('/resolve', async (req: Request, res: Response) => {
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      res.status(400).json({ success: false, error: 'Query parameter "q" is required' });
      return;
    }

    try {
      const folders = await getProjectFolders();
      const projectsDir = expandPath(PROJECTS_ROOT);

      // Find projects matching the prefix
      const matches = folders.filter(code => code.startsWith(q)).sort();

      if (matches.length === 0) {
        res.status(404).json({ success: false, error: `No project found matching: ${q}` });
        return;
      }

      // Return first match (alphabetically)
      const code = matches[0];
      const projectPath = path.join(projectsDir, code);

      // FR-61: Extract brand from parent directory name (v-appydave -> appydave)
      const brandDir = projectsDir.split('/').pop() || '';
      const brand = brandDir.startsWith('v-') ? brandDir.slice(2) : brandDir;

      res.json({
        success: true,
        project: {
          code,
          brand,
          path: projectPath,
        },
      });
    } catch (error) {
      console.error('Error resolving project:', error);
      res.status(500).json({ success: false, error: 'Failed to resolve project' });
    }
  });

  // ============================================
  // GET / - List projects
  // ============================================
  router.get('/', async (req: Request, res: Response) => {
    const config = getConfig();
    const { filter, stage, recent } = req.query;

    try {
      const folders = await getProjectFolders();
      const projectsDir = expandPath(PROJECTS_ROOT);
      const projects: QueryProjectSummary[] = [];

      for (const code of folders) {
        const projectPath = path.join(projectsDir, code);
        const paths = getProjectPaths(projectPath);

        // FR-111: Only count recordings/ (safe status is per-file in state)
        const totalFiles = await countMovFiles(paths.recordings);
        const chapterCount = await countUniqueChapters(paths.recordings);

        // Transcript sync (FR-111: Only recordings/)
        const syncStatus = await getTranscriptSyncStatus(paths.recordings, paths.transcripts);
        const transcriptPercent = totalFiles > 0
          ? Math.round((syncStatus.matched / totalFiles) * 100)
          : 0;

        // Assets
        const imageExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];
        const imageCount = await countFiles(paths.images, imageExtensions);
        const thumbCount = await countFiles(paths.thumbs, imageExtensions);

        // Timestamps
        const { lastModified } = await getProjectTimestamps(projectPath);

        // FR-80: Get content indicators
        const indicators = await getProjectIndicators(projectPath);

        // FR-80: Stage (manual override or auto-detect)
        // Use projectStageOverrides (new) or fall back to legacy projectStages
        const manualStage = config.projectStageOverrides?.[code] ||
          migrateOldStage(config.projectStages?.[code as keyof typeof config.projectStages] as string | undefined);

        let projectStage: ProjectStage;
        if (manualStage) {
          projectStage = manualStage;
        } else if (totalFiles === 0) {
          // Auto-detect: No recordings = planning
          projectStage = 'planning';
        } else {
          // Auto-detect: Has recordings = recording (auto-trigger)
          projectStage = 'recording';
        }

        // Priority
        const storedPriority = config.projectPriorities?.[code];
        const priority: ProjectPriority = storedPriority === 'pinned' ? 'pinned' : 'normal';

        // FR-61: Extract brand from parent directory name (v-appydave -> appydave)
        const brandDir = projectsDir.split('/').pop() || '';
        const brand = brandDir.startsWith('v-') ? brandDir.slice(2) : brandDir;

        projects.push({
          code,
          brand,
          path: projectPath,
          stage: projectStage,
          priority,
          stats: {
            recordings: totalFiles,
            chapters: chapterCount,
            transcriptPercent,
            images: imageCount,
            thumbs: thumbCount,
          },
          lastModified,
          // FR-80: Content indicators
          hasInbox: indicators.hasInbox,
          hasAssets: indicators.hasAssets,
          hasChapters: indicators.hasChapters,
        });
      }

      // Apply filters
      let filtered = projects;

      if (filter === 'pinned') {
        filtered = filtered.filter(p => p.priority === 'pinned');
      }

      if (stage && typeof stage === 'string') {
        filtered = filtered.filter(p => p.stage === stage);
      }

      // NFR-87: Sort by project code only (natural order) - stars just mark interest
      filtered.sort((a, b) => a.code.localeCompare(b.code));

      // Recent filter (after sorting by lastModified)
      if (recent && typeof recent === 'string') {
        const n = parseInt(recent, 10);
        if (!isNaN(n) && n > 0) {
          filtered.sort((a, b) => {
            const aTime = a.lastModified ? new Date(a.lastModified).getTime() : 0;
            const bTime = b.lastModified ? new Date(b.lastModified).getTime() : 0;
            return bTime - aTime;
          });
          filtered = filtered.slice(0, n);
        }
      }

      // FR-53: ASCII format support
      if (req.query.format === 'text') {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return res.send(formatProjectsReport(filtered));
      }

      res.json({ success: true, projects: filtered });
    } catch (error) {
      console.error('Error listing projects:', error);
      res.status(500).json({ success: false, error: 'Failed to list projects' });
    }
  });

  // ============================================
  // FR-114: GET /:code/transcript/text - Combined transcript as plain text
  // ============================================
  router.get('/:code/transcript/text', async (req: Request, res: Response) => {
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

      if (!await fs.pathExists(paths.transcripts)) {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return res.send('');
      }

      const files = await fs.readdir(paths.transcripts);
      const transcriptFiles: { chapter: string; sequence: string; content: string }[] = [];

      for (const filename of files) {
        if (!filename.endsWith('.txt') || filename.endsWith('-chapter.txt')) continue;

        const parsed = parseRecordingFilename(filename.replace('.txt', '.mov'));
        if (!parsed) continue;

        const filePath = path.join(paths.transcripts, filename);
        const content = await readFileSafe(filePath);

        if (content) {
          transcriptFiles.push({
            chapter: parsed.chapter,
            sequence: parsed.sequence || '0',
            content: content.trim(),
          });
        }
      }

      // Sort by chapter, sequence
      transcriptFiles.sort((a, b) => {
        const chapterCompare = parseInt(a.chapter, 10) - parseInt(b.chapter, 10);
        if (chapterCompare !== 0) return chapterCompare;
        return parseInt(a.sequence, 10) - parseInt(b.sequence, 10);
      });

      // Combine all transcripts with double newlines between them
      const combinedText = transcriptFiles.map(t => t.content).join('\n\n');

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.send(combinedText);
    } catch (error) {
      console.error('Error getting combined transcript:', error);
      res.status(500).json({ success: false, error: 'Failed to get transcript' });
    }
  });

  // ============================================
  // GET /:code - Project detail
  // ============================================
  router.get('/:code', async (req: Request, res: Response) => {
    const { code: codeInput } = req.params;
    const config = getConfig();

    try {
      // FR-119: Resolve short codes (e.g., "c10" -> "c10-poem-epic-3")
      const resolved = await resolveProjectCode(codeInput);
      if (!resolved) {
        res.status(404).json({ success: false, error: `Project not found: ${codeInput}` });
        return;
      }

      const { code, path: projectPath } = resolved;

      // NFR-9: Use shared utility for stats calculation
      const raw = await getProjectStatsRaw(projectPath, code, config, { includeFinalMedia: true });

      const project: QueryProjectDetail = {
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

      // FR-53: ASCII format support
      if (req.query.format === 'text') {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return res.send(formatProjectDetail(project));
      }

      res.json({ success: true, project });
    } catch (error) {
      console.error('Error getting project detail:', error);
      res.status(500).json({ success: false, error: 'Failed to get project detail' });
    }
  });

  return router;
}
