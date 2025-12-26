// FR-32: Project stats and priority management
// FR-33: Final video and SRT detection
// FR-34: Chapter timestamp extraction
// FR-34 Enhancement: LLM-based chapter verification
// FR-59: Inbox management
import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs-extra';
import { expandPath } from '../utils/pathUtils.js';
import { detectFinalMedia } from '../utils/finalMedia.js';
import { extractChapters } from '../utils/chapterExtraction.js';
import { verifyChapterWithLLM } from '../utils/llmVerification.js';
import { getProjectStatsRaw } from '../utils/projectStats.js';
import { getProjectPaths } from '../../../shared/paths.js';
import { readDirSafe } from '../utils/filesystem.js';
import type {
  Config,
  ProjectStats,
  ProjectPriority,
  ProjectStage,
  ChapterVerifyRequest,
  ChapterOverride,
  SetChapterOverrideRequest,
  TranscriptSyncStatus,
  TranscriptSyncResponse,
} from '../../../shared/types.js';

const PROJECTS_ROOT = '~/dev/video-projects/v-appydave';

export function createProjectRoutes(
  getConfig: () => Config,
  saveConfig: (config: Config) => void
): Router {
  const router = Router();

  // NFR-9: Helper to convert raw stats to ProjectStats format
  async function getProjectStats(projectPath: string, code: string, config: Config): Promise<ProjectStats> {
    const raw = await getProjectStatsRaw(projectPath, code, config);

    // FR-111: recordingsCount and safeCount removed (safe status is per-file)
    return {
      code: raw.code,
      path: raw.projectPath,
      priority: raw.priority,
      totalFiles: raw.totalFiles,
      chapterCount: raw.chapterCount,
      transcriptCount: raw.transcriptSync.matched,
      transcriptPercent: raw.transcriptPercent,
      transcriptSync: {
        matched: raw.transcriptSync.matched,
        missingCount: raw.transcriptSync.missingTranscripts.length,
        orphanedCount: raw.transcriptSync.orphanedTranscripts.length,
      },
      stage: raw.stage,
      createdAt: raw.createdAt,
      lastModified: raw.lastModified,
      totalDuration: null,
      imageCount: raw.imageCount,
      thumbCount: raw.thumbCount,
      // FR-80/FR-82: Content indicators with counts
      hasInbox: raw.hasInbox,
      hasAssets: raw.hasAssets,
      hasChapters: raw.hasChapters,
      inboxCount: raw.inboxCount,
      chapterVideoCount: raw.chapterVideoCount,
      // FR-83: Shadow recordings
      shadowCount: raw.shadowCount,
    };
  }

  // GET /api/projects/stats - Get extended stats for all projects
  router.get('/stats', async (_req: Request, res: Response) => {
    const config = getConfig();
    const projectsDir = expandPath(PROJECTS_ROOT);

    try {
      // Check if projects directory exists
      if (!await fs.pathExists(projectsDir)) {
        res.json({ projects: [], error: 'Projects directory not found' });
        return;
      }

      const entries = await fs.readdir(projectsDir, { withFileTypes: true });
      // Bug fix: Filter out system folders (hidden, -trash, -safe, archived)
      const folders = entries.filter(e =>
        e.isDirectory() &&
        !e.name.startsWith('.') &&     // hidden folders
        !e.name.startsWith('-') &&     // system folders (-trash, -safe)
        e.name !== 'archived'          // archive folder
      );

      const stats: ProjectStats[] = [];

      for (const folder of folders) {
        const projectPath = path.join(projectsDir, folder.name);
        const projectStats = await getProjectStats(projectPath, folder.name, config);
        stats.push(projectStats);
      }

      // NFR-87: Sort by project code only (natural order) - stars just mark interest
      stats.sort((a, b) => a.code.localeCompare(b.code));

      res.json({ projects: stats });
    } catch (error) {
      console.error('Error getting project stats:', error);
      res.status(500).json({ success: false, error: 'Failed to get project stats' });
    }
  });

  // PUT /api/projects/:code/priority - Update project priority (pin/unpin)
  router.put('/:code/priority', async (req: Request, res: Response) => {
    const { code } = req.params;
    const { priority } = req.body;

    if (!['pinned', 'normal'].includes(priority)) {
      res.status(400).json({ success: false, error: 'Invalid priority value. Use "pinned" or "normal".' });
      return;
    }

    const config = getConfig();

    // Initialize if needed
    if (!config.projectPriorities) {
      config.projectPriorities = {};
    }

    // Set or remove priority
    if (priority === 'normal') {
      delete config.projectPriorities[code];
    } else {
      config.projectPriorities[code] = priority;
    }

    // Clean up empty object
    if (Object.keys(config.projectPriorities).length === 0) {
      delete config.projectPriorities;
    }

    saveConfig(config);

    console.log(`Updated priority for ${code}: ${priority}`);
    res.json({ success: true, code, priority });
  });

  // PUT /api/projects/:code/stage - Update project stage (manual override)
  // FR-80: Updated to support new 8-stage workflow
  router.put('/:code/stage', async (req: Request, res: Response) => {
    const { code } = req.params;
    const { stage } = req.body;

    // FR-80: Valid stages from the new workflow model + 'auto' for reset
    const validStages = [
      'planning', 'recording', 'first-edit', 'second-edit',
      'review', 'ready-to-publish', 'published', 'archived', 'auto'
    ];

    if (!validStages.includes(stage)) {
      res.status(400).json({
        success: false,
        error: `Invalid stage. Valid values: ${validStages.join(', ')}`
      });
      return;
    }

    const config = getConfig();

    // Initialize if needed
    if (!config.projectStageOverrides) {
      config.projectStageOverrides = {};
    }

    // Set or remove stage override ('auto' removes the override)
    if (stage === 'auto') {
      delete config.projectStageOverrides[code];
    } else {
      config.projectStageOverrides[code] = stage;
    }

    // Clean up empty object
    if (Object.keys(config.projectStageOverrides).length === 0) {
      delete config.projectStageOverrides;
    }

    saveConfig(config);

    console.log(`Updated stage for ${code}: ${stage}`);
    res.json({ success: true, code, stage });
  });

  // FR-48: GET /api/projects/:code/transcript-sync - Get detailed transcript sync status
  router.get('/:code/transcript-sync', async (req: Request, res: Response) => {
    const { code } = req.params;
    const projectsDir = expandPath(PROJECTS_ROOT);
    const projectPath = path.join(projectsDir, code);

    // Verify project exists
    if (!await fs.pathExists(projectPath)) {
      res.status(404).json({ success: false, error: `Project not found: ${code}` });
      return;
    }

    const recordingsDir = path.join(projectPath, 'recordings');
    const transcriptsDir = path.join(projectPath, 'recording-transcripts');

    // FR-111: Only scan recordings/ (no more -safe folder)
    const files = await readDirSafe(recordingsDir);
    const recordingFiles = files
      .filter(f => f.endsWith('.mov'))
      .map(f => f.replace('.mov', ''))

    // Get all .txt files (base names, exclude *-chapter.txt)
    const transcriptDirFiles = await readDirSafe(transcriptsDir);
    const transcriptFiles = transcriptDirFiles
      .filter(f => f.endsWith('.txt') && !f.endsWith('-chapter.txt'))
      .map(f => f.replace('.txt', ''));

    const recordingSet = new Set(recordingFiles);
    const transcriptSet = new Set(transcriptFiles);

    const matched = recordingFiles.filter(r => transcriptSet.has(r));
    const missingTranscripts = recordingFiles.filter(r => !transcriptSet.has(r));
    const orphanedTranscripts = transcriptFiles.filter(t => !recordingSet.has(t));

    const response: TranscriptSyncResponse = {
      success: true,
      matched,
      missingTranscripts,
      orphanedTranscripts,
    };

    res.json(response);
  });

  // GET /api/projects/:code/final - Get final video and SRT info for a project
  router.get('/:code/final', async (req: Request, res: Response) => {
    const { code } = req.params;
    const projectsDir = expandPath(PROJECTS_ROOT);
    const projectPath = path.join(projectsDir, code);

    // Verify project exists
    if (!await fs.pathExists(projectPath)) {
      res.status(404).json({ success: false, error: `Project not found: ${code}` });
      return;
    }

    try {
      const result = await detectFinalMedia(projectPath, code);
      res.json(result);
    } catch (error) {
      console.error(`Error detecting final media for ${code}:`, error);
      res.status(500).json({ success: false, error: 'Failed to detect final media' });
    }
  });

  // GET /api/projects/:code/chapters - FR-34: Extract chapter timestamps from SRT
  router.get('/:code/chapters', async (req: Request, res: Response) => {
    const { code } = req.params;
    const projectsDir = expandPath(PROJECTS_ROOT);
    const projectPath = path.join(projectsDir, code);

    // Verify project exists
    if (!await fs.pathExists(projectPath)) {
      res.status(404).json({ success: false, error: `Project not found: ${code}`, chapters: [], formatted: '' });
      return;
    }

    try {
      // First, detect final media to get SRT path
      const finalMedia = await detectFinalMedia(projectPath, code);

      if (!finalMedia.srt) {
        res.json({
          success: false,
          error: 'No SRT file found for this project',
          chapters: [],
          formatted: '',
        });
        return;
      }

      // Extract chapters using the SRT
      const result = await extractChapters(projectPath, finalMedia.srt.path);
      res.json(result);
    } catch (error) {
      console.error(`Error extracting chapters for ${code}:`, error);
      res.status(500).json({ success: false, error: 'Failed to extract chapters', chapters: [], formatted: '' });
    }
  });

  // POST /api/projects/:code/chapters/verify - FR-34 Enhancement: Verify chapter with LLM
  router.post('/:code/chapters/verify', async (req: Request, res: Response) => {
    const { code } = req.params;
    const verifyRequest = req.body as ChapterVerifyRequest;

    if (!verifyRequest.chapter || !verifyRequest.name) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: chapter, name',
      });
      return;
    }

    try {
      console.log(`LLM verification requested for ${code} chapter ${verifyRequest.chapter}: ${verifyRequest.name}`);
      const result = await verifyChapterWithLLM(verifyRequest);
      console.log(`LLM verification result: ${result.recommendation.action} (${result.recommendation.confidence}%)`);
      res.json(result);
    } catch (error) {
      console.error(`Error verifying chapter for ${code}:`, error);
      res.status(500).json({
        success: false,
        chapter: verifyRequest.chapter,
        name: verifyRequest.name,
        recommendation: {
          action: 'skip',
          confidence: 0,
          reasoning: 'Server error during LLM verification',
        },
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // GET /api/projects/:code/chapters/overrides - Get all chapter overrides for a project
  router.get('/:code/chapters/overrides', async (req: Request, res: Response) => {
    const { code } = req.params;
    const projectsDir = expandPath(PROJECTS_ROOT);
    const projectPath = path.join(projectsDir, code);
    const overridesPath = path.join(projectPath, '.chapter-overrides.json');

    try {
      if (await fs.pathExists(overridesPath)) {
        const overrides = await fs.readJson(overridesPath);
        res.json({ success: true, overrides });
      } else {
        res.json({ success: true, overrides: [] });
      }
    } catch (error) {
      console.error(`Error reading overrides for ${code}:`, error);
      res.status(500).json({ success: false, error: 'Failed to read overrides', overrides: [] });
    }
  });

  // POST /api/projects/:code/chapters/override - Set a chapter override
  router.post('/:code/chapters/override', async (req: Request, res: Response) => {
    const { code } = req.params;
    const overrideRequest = req.body as SetChapterOverrideRequest;

    if (!overrideRequest.chapter || !overrideRequest.name || !overrideRequest.action) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: chapter, name, action',
      });
      return;
    }

    if (overrideRequest.action === 'override' && !overrideRequest.timestamp) {
      res.status(400).json({
        success: false,
        error: 'Timestamp required when action is "override"',
      });
      return;
    }

    const projectsDir = expandPath(PROJECTS_ROOT);
    const projectPath = path.join(projectsDir, code);
    const overridesPath = path.join(projectPath, '.chapter-overrides.json');

    try {
      // Load existing overrides
      let overrides: ChapterOverride[] = [];
      if (await fs.pathExists(overridesPath)) {
        overrides = await fs.readJson(overridesPath);
      }

      // Parse timestamp to seconds if provided
      let timestampSeconds: number | undefined;
      if (overrideRequest.timestamp) {
        const parts = overrideRequest.timestamp.split(':').map(Number);
        if (parts.length === 2) {
          timestampSeconds = parts[0] * 60 + parts[1];
        } else if (parts.length === 3) {
          timestampSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
        }
      }

      // Create new override
      const newOverride: ChapterOverride = {
        chapter: overrideRequest.chapter,
        name: overrideRequest.name,
        action: overrideRequest.action,
        timestamp: overrideRequest.timestamp,
        timestampSeconds,
        reason: overrideRequest.reason,
        createdAt: new Date().toISOString(),
      };

      // Remove existing override for this chapter/name combo
      overrides = overrides.filter(
        o => !(o.chapter === overrideRequest.chapter && o.name === overrideRequest.name)
      );

      // Add new override
      overrides.push(newOverride);

      // Sort by chapter number
      overrides.sort((a, b) => a.chapter - b.chapter);

      // Save
      await fs.writeJson(overridesPath, overrides, { spaces: 2 });

      console.log(`Set override for ${code} chapter ${overrideRequest.chapter}: ${overrideRequest.action}`);
      res.json({ success: true, override: newOverride });
    } catch (error) {
      console.error(`Error setting override for ${code}:`, error);
      res.status(500).json({ success: false, error: 'Failed to set override' });
    }
  });

  // DELETE /api/projects/:code/chapters/override/:chapter/:name - Remove a chapter override
  router.delete('/:code/chapters/override/:chapter/:name', async (req: Request, res: Response) => {
    const { code, chapter, name } = req.params;
    const chapterNum = parseInt(chapter, 10);

    const projectsDir = expandPath(PROJECTS_ROOT);
    const projectPath = path.join(projectsDir, code);
    const overridesPath = path.join(projectPath, '.chapter-overrides.json');

    try {
      if (!await fs.pathExists(overridesPath)) {
        res.json({ success: true, message: 'No overrides file exists' });
        return;
      }

      let overrides: ChapterOverride[] = await fs.readJson(overridesPath);
      const initialLength = overrides.length;

      overrides = overrides.filter(
        o => !(o.chapter === chapterNum && o.name === name)
      );

      if (overrides.length === initialLength) {
        res.status(404).json({ success: false, error: 'Override not found' });
        return;
      }

      if (overrides.length === 0) {
        await fs.remove(overridesPath);
      } else {
        await fs.writeJson(overridesPath, overrides, { spaces: 2 });
      }

      console.log(`Removed override for ${code} chapter ${chapter}: ${name}`);
      res.json({ success: true });
    } catch (error) {
      console.error(`Error removing override for ${code}:`, error);
      res.status(500).json({ success: false, error: 'Failed to remove override' });
    }
  });

  // FR-59: POST /api/projects/:code/inbox/write - Write file to inbox subfolder
  router.post('/:code/inbox/write', async (req: Request, res: Response) => {
    const { code } = req.params;
    const { subfolder, filename, content } = req.body;

    // Validate subfolder
    const validSubfolders = ['raw', 'dataset', 'presentation'];
    if (!validSubfolders.includes(subfolder)) {
      res.status(400).json({
        success: false,
        error: `Invalid subfolder. Use one of: ${validSubfolders.join(', ')}`,
      });
      return;
    }

    if (!filename || typeof filename !== 'string') {
      res.status(400).json({ success: false, error: 'Filename is required' });
      return;
    }

    if (content === undefined) {
      res.status(400).json({ success: false, error: 'Content is required' });
      return;
    }

    const projectsDir = expandPath(PROJECTS_ROOT);
    const projectPath = path.join(projectsDir, code);

    // Verify project exists
    if (!await fs.pathExists(projectPath)) {
      res.status(404).json({ success: false, error: `Project not found: ${code}` });
      return;
    }

    const paths = getProjectPaths(projectPath);

    // Get the target folder
    const subfolderPaths: Record<string, string> = {
      raw: paths.inboxRaw,
      dataset: paths.inboxDataset,
      presentation: paths.inboxPresentation,
    };
    const targetDir = subfolderPaths[subfolder];

    try {
      // Ensure directory exists
      await fs.ensureDir(targetDir);

      // Write file
      const filePath = path.join(targetDir, filename);
      await fs.writeFile(filePath, content, 'utf-8');

      console.log(`[FR-59] Wrote file to inbox: ${code}/inbox/${subfolder}/${filename}`);
      res.json({
        success: true,
        path: filePath,
        subfolder,
        filename,
      });
    } catch (error) {
      console.error(`Error writing to inbox for ${code}:`, error);
      res.status(500).json({ success: false, error: 'Failed to write file to inbox' });
    }
  });

  return router;
}
