/**
 * NFR-8: Project Data Query API
 *
 * Read-only JSON endpoints under /api/query/ prefix for:
 * - LLM context gathering
 * - External tool integration (e.g., Claude Code skills)
 * - Future import/export
 */

import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs-extra';
import { expandPath } from '../utils/pathUtils.js';
import { detectFinalMedia } from '../utils/finalMedia.js';
import { extractChapters } from '../utils/chapterExtraction.js';
import {
  countMovFiles,
  countTxtFiles,
  countUniqueChapters,
  countFiles,
  getProjectTimestamps,
  getTranscriptSyncStatus,
  getTranscriptBasenames,
} from '../utils/scanning.js';
import { getProjectStatsRaw } from '../utils/projectStats.js';
import { getProjectPaths } from '../../../shared/paths.js';
import {
  parseRecordingFilename,
  parseImageFilename,
  compareImageAssets,
  extractTagsFromName,
} from '../../../shared/naming.js';
import type {
  Config,
  ProjectPriority,
  ProjectStage,
  RecordingFile,
  ImageAsset,
} from '../../../shared/types.js';
import {
  formatProjectsReport,
  formatProjectDetail,
  formatRecordingsReport,
  formatTranscriptsReport,
  formatChaptersReport,
  formatImagesReport,
  formatExportReport,
} from '../utils/reporters.js';

const PROJECTS_ROOT = '~/dev/video-projects/v-appydave';

// ============================================
// TYPES for Query API Responses
// ============================================

interface QueryProjectSummary {
  code: string;
  brand: string;  // FR-61: Brand derived from v-appydave -> appydave
  path: string;   // FR-61: Full project path
  stage: ProjectStage;
  priority: ProjectPriority;
  stats: {
    recordings: number;
    chapters: number;
    transcriptPercent: number;
    images: number;
    thumbs: number;
  };
  lastModified: string | null;
}

interface QueryProjectDetail {
  code: string;
  path: string;
  stage: ProjectStage;
  priority: ProjectPriority;
  stats: {
    recordings: number;
    safe: number;
    chapters: number;
    transcripts: {
      matched: number;
      missing: number;
      orphaned: number;
    };
    images: number;
    thumbs: number;
    totalDuration: number | null;
  };
  finalMedia: {
    video?: { filename: string; size: number };
    srt?: { filename: string };
  } | null;
  createdAt: string | null;
  lastModified: string | null;
}

interface QueryRecording {
  filename: string;
  chapter: string;
  sequence: string;
  name: string;
  tags: string[];
  folder: 'recordings' | 'safe';
  size: number;
  duration: number | null;
  hasTranscript: boolean;
}

interface QueryTranscript {
  filename: string;
  chapter: string;
  sequence: string;
  name: string;
  size: number;
  preview?: string;
  content?: string;
}

interface QueryChapter {
  chapter: number;
  name: string;
  displayName: string;
  timestamp: string | null;
  timestampSeconds: number | null;
  recordingCount: number;
  hasTranscript: boolean;
}

interface QueryImage {
  filename: string;
  chapter: string;
  sequence: string;
  imageOrder: string;
  variant: string | null;
  label: string;
  size: number;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

// NFR-11: Most helper functions moved to utils/scanning.ts
// Only keeping getProjectFolders() here as it's specific to query routes

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

// ============================================
// ROUTE FACTORY
// ============================================

export function createQueryRoutes(getConfig: () => Config): Router {
  const router = Router();

  // Request logging middleware for all query endpoints
  router.use((req, _res, next) => {
    const query = Object.keys(req.query).length > 0 ? `?${new URLSearchParams(req.query as Record<string, string>)}` : '';
    console.log(`[Query API] ${req.method} ${req.path}${query}`);
    next();
  });

  // ============================================
  // 0. GET /api/query/config - System metadata
  // ============================================
  router.get('/config', async (_req: Request, res: Response) => {
    const config = getConfig();

    res.json({
      success: true,
      stages: ['none', 'recording', 'editing', 'done'],
      priorities: ['pinned', 'normal'],
      filters: ['pinned'],
      stageFilters: ['none', 'recording', 'editing', 'done'],
      availableTags: config.availableTags || [],
      commonNames: (config.commonNames || []).map(cn => cn.name),
    });
  });

  // ============================================
  // FR-61: GET /api/query/projects/resolve - Resolve partial project code
  // ============================================
  router.get('/projects/resolve', async (req: Request, res: Response) => {
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
  // 1. GET /api/query/projects - List projects
  // ============================================
  router.get('/projects', async (req: Request, res: Response) => {
    const config = getConfig();
    const { filter, stage, recent } = req.query;

    try {
      const folders = await getProjectFolders();
      const projectsDir = expandPath(PROJECTS_ROOT);
      const projects: QueryProjectSummary[] = [];

      for (const code of folders) {
        const projectPath = path.join(projectsDir, code);
        const paths = getProjectPaths(projectPath);

        // Get counts
        const recordingsCount = await countMovFiles(paths.recordings);
        const safeCount = await countMovFiles(paths.safe);
        const totalFiles = recordingsCount + safeCount;
        const chapterCount = await countUniqueChapters(paths.recordings, paths.safe);

        // Transcript sync
        const syncStatus = await getTranscriptSyncStatus(paths.recordings, paths.safe, paths.transcripts);
        const transcriptPercent = totalFiles > 0
          ? Math.round((syncStatus.matched / totalFiles) * 100)
          : 0;

        // Assets
        const imageExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];
        const imageCount = await countFiles(paths.images, imageExtensions);
        const thumbCount = await countFiles(paths.thumbs, imageExtensions);

        // Timestamps
        const { lastModified } = await getProjectTimestamps(projectPath);

        // Stage (manual override or auto-detect)
        const manualStage = config.projectStages?.[code];
        let projectStage: ProjectStage;
        if (manualStage) {
          projectStage = manualStage;
        } else if (totalFiles === 0) {
          projectStage = 'none';
        } else {
          projectStage = transcriptPercent >= 100 ? 'editing' : 'recording';
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

      // Sort: pinned first, then by code
      filtered.sort((a, b) => {
        const priorityOrder: Record<ProjectPriority, number> = { pinned: 0, normal: 1 };
        const aPriority = priorityOrder[a.priority];
        const bPriority = priorityOrder[b.priority];
        if (aPriority !== bPriority) return aPriority - bPriority;
        return a.code.localeCompare(b.code);
      });

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
  // 2. GET /api/query/projects/:code - Project detail
  // ============================================
  router.get('/projects/:code', async (req: Request, res: Response) => {
    const { code } = req.params;
    const config = getConfig();
    const projectsDir = expandPath(PROJECTS_ROOT);
    const projectPath = path.join(projectsDir, code);

    try {
      if (!await fs.pathExists(projectPath)) {
        res.status(404).json({ success: false, error: `Project not found: ${code}` });
        return;
      }

      // NFR-9: Use shared utility for stats calculation
      const raw = await getProjectStatsRaw(projectPath, code, config, { includeFinalMedia: true });

      const project: QueryProjectDetail = {
        code,
        path: projectPath,
        stage: raw.stage,
        priority: raw.priority,
        stats: {
          recordings: raw.recordingsCount,
          safe: raw.safeCount,
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

  // ============================================
  // 3. GET /api/query/projects/:code/recordings
  // ============================================
  router.get('/projects/:code/recordings', async (req: Request, res: Response) => {
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
      const transcriptSet = new Set<string>();
      try {
        const transcriptFiles = await fs.readdir(paths.transcripts);
        for (const f of transcriptFiles) {
          if (f.endsWith('.txt') && !f.endsWith('-chapter.txt')) {
            transcriptSet.add(f.replace('.txt', ''));
          }
        }
      } catch {
        // No transcripts directory
      }

      // Scan recordings and safe folders
      const folders: Array<{ dir: string; folder: 'recordings' | 'safe' }> = [
        { dir: paths.recordings, folder: 'recordings' },
        { dir: paths.safe, folder: 'safe' },
      ];

      for (const { dir, folder } of folders) {
        try {
          const files = await fs.readdir(dir);
          for (const filename of files) {
            if (!filename.endsWith('.mov')) continue;

            const parsed = parseRecordingFilename(filename);
            if (!parsed) continue;

            const filePath = path.join(dir, filename);
            const stat = await fs.stat(filePath);
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
        } catch {
          // Directory doesn't exist
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

  // ============================================
  // 4. GET /api/query/projects/:code/transcripts
  // ============================================
  router.get('/projects/:code/transcripts', async (req: Request, res: Response) => {
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
        if (includeContent) {
          try {
            transcript.content = await fs.readFile(filePath, 'utf-8');
          } catch {
            transcript.content = '';
          }
        } else {
          // Preview: first ~100 chars
          try {
            const content = await fs.readFile(filePath, 'utf-8');
            transcript.preview = content.slice(0, 100).replace(/\n/g, ' ').trim();
            if (content.length > 100) transcript.preview += '...';
          } catch {
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

  // GET /api/query/projects/:code/transcripts/:recording - Single transcript
  router.get('/projects/:code/transcripts/:recording', async (req: Request, res: Response) => {
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

  // ============================================
  // 5. GET /api/query/projects/:code/chapters
  // ============================================
  router.get('/projects/:code/chapters', async (req: Request, res: Response) => {
    const { code } = req.params;
    const projectsDir = expandPath(PROJECTS_ROOT);
    const projectPath = path.join(projectsDir, code);

    try {
      if (!await fs.pathExists(projectPath)) {
        res.status(404).json({ success: false, error: `Project not found: ${code}` });
        return;
      }

      const paths = getProjectPaths(projectPath);

      // Get recording counts per chapter
      const chapterRecordings = new Map<string, number>();
      const chapterHasTranscript = new Map<string, boolean>();

      for (const dir of [paths.recordings, paths.safe]) {
        try {
          const files = await fs.readdir(dir);
          for (const file of files) {
            const match = file.match(/^(\d{2})-/);
            if (match) {
              const chapter = match[1];
              chapterRecordings.set(chapter, (chapterRecordings.get(chapter) || 0) + 1);
            }
          }
        } catch {
          // Directory doesn't exist
        }
      }

      // Check transcript existence per chapter
      try {
        const transcriptFiles = await fs.readdir(paths.transcripts);
        for (const file of transcriptFiles) {
          if (!file.endsWith('.txt') || file.endsWith('-chapter.txt')) continue;
          const match = file.match(/^(\d{2})-/);
          if (match) {
            chapterHasTranscript.set(match[1], true);
          }
        }
      } catch {
        // No transcripts
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
      } catch {
        // No SRT or extraction failed
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

  // ============================================
  // 6. GET /api/query/projects/:code/images
  // ============================================
  router.get('/projects/:code/images', async (req: Request, res: Response) => {
    const { code } = req.params;
    const { chapter: chapterFilter } = req.query;
    const projectsDir = expandPath(PROJECTS_ROOT);
    const projectPath = path.join(projectsDir, code);

    try {
      if (!await fs.pathExists(projectPath)) {
        res.status(404).json({ success: false, error: `Project not found: ${code}` });
        return;
      }

      const paths = getProjectPaths(projectPath);
      const images: QueryImage[] = [];

      if (!await fs.pathExists(paths.images)) {
        // FR-53: ASCII format support for empty case
        if (req.query.format === 'text') {
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          return res.send(formatImagesReport([], code));
        }
        res.json({ success: true, images: [] });
        return;
      }

      const files = await fs.readdir(paths.images);
      for (const filename of files) {
        const parsed = parseImageFilename(filename);
        if (!parsed) continue;

        const filePath = path.join(paths.images, filename);
        const stat = await fs.stat(filePath);

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

      // Sort using shared comparator
      images.sort(compareImageAssets);

      // Apply chapter filter
      let filtered = images;
      if (chapterFilter && typeof chapterFilter === 'string') {
        const chapterNum = chapterFilter.padStart(2, '0');
        filtered = filtered.filter(img => img.chapter === chapterNum || img.chapter === chapterFilter);
      }

      // FR-53: ASCII format support
      if (req.query.format === 'text') {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return res.send(formatImagesReport(filtered, code));
      }

      res.json({ success: true, images: filtered });
    } catch (error) {
      console.error('Error listing images:', error);
      res.status(500).json({ success: false, error: 'Failed to list images' });
    }
  });

  // ============================================
  // 7. GET /api/query/projects/:code/export
  // ============================================
  router.get('/projects/:code/export', async (req: Request, res: Response) => {
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
          code,
          path: projectPath,
          stage: raw.stage,
          priority: raw.priority,
          stats: {
            recordings: raw.recordingsCount,
            safe: raw.safeCount,
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
      if (includeSections.includes('recordings')) {
        const paths = getProjectPaths(projectPath);
        const recordings: QueryRecording[] = [];

        const transcriptSet = new Set<string>();
        try {
          const transcriptFiles = await fs.readdir(paths.transcripts);
          for (const f of transcriptFiles) {
            if (f.endsWith('.txt') && !f.endsWith('-chapter.txt')) {
              transcriptSet.add(f.replace('.txt', ''));
            }
          }
        } catch {
          // No transcripts
        }

        const folders: Array<{ dir: string; folder: 'recordings' | 'safe' }> = [
          { dir: paths.recordings, folder: 'recordings' },
          { dir: paths.safe, folder: 'safe' },
        ];

        for (const { dir, folder } of folders) {
          try {
            const files = await fs.readdir(dir);
            for (const filename of files) {
              if (!filename.endsWith('.mov')) continue;
              const parsed = parseRecordingFilename(filename);
              if (!parsed) continue;

              const filePath = path.join(dir, filename);
              const stat = await fs.stat(filePath);
              const baseName = filename.replace('.mov', '');

              const nameParts = (parsed.name || '').split('-');
              const tags: string[] = [];
              const nameWords: string[] = [];
              for (const part of nameParts) {
                if (/^[A-Z]+$/.test(part)) {
                  tags.push(part);
                } else {
                  nameWords.push(part);
                }
              }

              recordings.push({
                filename,
                chapter: parsed.chapter,
                sequence: parsed.sequence || '0',
                name: nameWords.join('-'),
                tags,
                folder,
                size: stat.size,
                duration: null,
                hasTranscript: transcriptSet.has(baseName),
              });
            }
          } catch {
            // Directory doesn't exist
          }
        }

        recordings.sort((a, b) => {
          const chapterCompare = parseInt(a.chapter, 10) - parseInt(b.chapter, 10);
          if (chapterCompare !== 0) return chapterCompare;
          return parseInt(a.sequence, 10) - parseInt(b.sequence, 10);
        });

        exportData.recordings = recordings;
      }

      // Get transcripts (with content for export)
      if (includeSections.includes('transcripts')) {
        const paths = getProjectPaths(projectPath);
        const transcripts: QueryTranscript[] = [];

        try {
          const files = await fs.readdir(paths.transcripts);
          for (const filename of files) {
            if (!filename.endsWith('.txt') || filename.endsWith('-chapter.txt')) continue;

            const parsed = parseRecordingFilename(filename.replace('.txt', '.mov'));
            if (!parsed) continue;

            const filePath = path.join(paths.transcripts, filename);
            const stat = await fs.stat(filePath);
            const content = await fs.readFile(filePath, 'utf-8');

            const nameParts = (parsed.name || '').split('-');
            const nameWords = nameParts.filter(part => !/^[A-Z]+$/.test(part));

            transcripts.push({
              filename,
              chapter: parsed.chapter,
              sequence: parsed.sequence || '0',
              name: nameWords.join('-'),
              size: stat.size,
              content,
            });
          }
        } catch {
          // No transcripts directory
        }

        transcripts.sort((a, b) => {
          const chapterCompare = parseInt(a.chapter, 10) - parseInt(b.chapter, 10);
          if (chapterCompare !== 0) return chapterCompare;
          return parseInt(a.sequence, 10) - parseInt(b.sequence, 10);
        });

        exportData.transcripts = transcripts;
      }

      // Get chapters
      if (includeSections.includes('chapters')) {
        const paths = getProjectPaths(projectPath);
        const chapterRecordings = new Map<string, number>();
        const chapterHasTranscript = new Map<string, boolean>();

        for (const dir of [paths.recordings, paths.safe]) {
          try {
            const files = await fs.readdir(dir);
            for (const file of files) {
              const match = file.match(/^(\d{2})-/);
              if (match) {
                const chapter = match[1];
                chapterRecordings.set(chapter, (chapterRecordings.get(chapter) || 0) + 1);
              }
            }
          } catch {
            // Directory doesn't exist
          }
        }

        try {
          const transcriptFiles = await fs.readdir(paths.transcripts);
          for (const file of transcriptFiles) {
            if (!file.endsWith('.txt') || file.endsWith('-chapter.txt')) continue;
            const match = file.match(/^(\d{2})-/);
            if (match) {
              chapterHasTranscript.set(match[1], true);
            }
          }
        } catch {
          // No transcripts
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
        } catch {
          // No SRT
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
      if (includeSections.includes('images')) {
        const paths = getProjectPaths(projectPath);
        const images: QueryImage[] = [];

        try {
          const files = await fs.readdir(paths.images);
          for (const filename of files) {
            const parsed = parseImageFilename(filename);
            if (!parsed) continue;

            const filePath = path.join(paths.images, filename);
            const stat = await fs.stat(filePath);

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
        } catch {
          // No images directory
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

  // ============================================
  // 8. GET /api/query/projects/:code/inbox - FR-59
  // ============================================
  router.get('/projects/:code/inbox', async (req: Request, res: Response) => {
    const { code } = req.params;
    const projectsDir = expandPath(PROJECTS_ROOT);
    const projectPath = path.join(projectsDir, code);

    try {
      if (!await fs.pathExists(projectPath)) {
        res.status(404).json({ success: false, error: `Project not found: ${code}` });
        return;
      }

      const paths = getProjectPaths(projectPath);

      interface InboxFile {
        filename: string;
        size: number;
        modifiedAt: string;
      }

      interface InboxSubfolder {
        name: string;
        path: string;
        fileCount: number;
        files: InboxFile[];
      }

      const result: InboxSubfolder[] = [];

      // Scan inbox directory for actual subfolders (dynamic, not hardcoded)
      if (await fs.pathExists(paths.inbox)) {
        try {
          const entries = await fs.readdir(paths.inbox, { withFileTypes: true });

          // First, check for root-level files (files directly in inbox/)
          const rootFiles = entries.filter(e => e.isFile() && !e.name.startsWith('.'));
          if (rootFiles.length > 0) {
            const rootResult: InboxSubfolder = {
              name: '(root)',
              path: paths.inbox,
              fileCount: 0,
              files: [],
            };

            for (const file of rootFiles) {
              const filePath = path.join(paths.inbox, file.name);
              const stat = await fs.stat(filePath);
              rootResult.files.push({
                filename: file.name,
                size: stat.size,
                modifiedAt: stat.mtime.toISOString(),
              });
            }
            rootResult.fileCount = rootResult.files.length;
            // Sort files alphabetically
            rootResult.files.sort((a, b) => a.filename.localeCompare(b.filename));
            result.push(rootResult);
          }

          // Then scan subfolders
          const subfolderNames = entries
            .filter(e => e.isDirectory() && !e.name.startsWith('.') && !e.name.startsWith('-'))
            .map(e => e.name);

          // Preferred sort order: raw, dataset, presentation first, then alphabetical
          const preferredOrder = ['raw', 'dataset', 'presentation'];
          subfolderNames.sort((a, b) => {
            const aIndex = preferredOrder.indexOf(a);
            const bIndex = preferredOrder.indexOf(b);
            // Both in preferred list - sort by preferred order
            if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
            // Only a in preferred list - a comes first
            if (aIndex !== -1) return -1;
            // Only b in preferred list - b comes first
            if (bIndex !== -1) return 1;
            // Neither in preferred list - alphabetical
            return a.localeCompare(b);
          });

          for (const name of subfolderNames) {
            const subfolderPath = path.join(paths.inbox, name);
            const folderResult: InboxSubfolder = {
              name,
              path: subfolderPath,
              fileCount: 0,
              files: [],
            };

            try {
              const fileEntries = await fs.readdir(subfolderPath, { withFileTypes: true });
              const files = fileEntries.filter(e => e.isFile() && !e.name.startsWith('.'));
              folderResult.fileCount = files.length;

              // Get file details
              for (const file of files) {
                const filePath = path.join(subfolderPath, file.name);
                const stat = await fs.stat(filePath);
                folderResult.files.push({
                  filename: file.name,
                  size: stat.size,
                  modifiedAt: stat.mtime.toISOString(),
                });
              }

              // Sort files alphabetically
              folderResult.files.sort((a, b) => a.filename.localeCompare(b.filename));
            } catch {
              // Error reading subfolder
            }

            result.push(folderResult);
          }
        } catch {
          // Error reading inbox directory
        }
      }

      const totalFiles = result.reduce((sum, f) => sum + f.fileCount, 0);

      res.json({
        success: true,
        inbox: {
          totalFiles,
          subfolders: result,
        },
      });
    } catch (error) {
      console.error('Error listing inbox:', error);
      res.status(500).json({ success: false, error: 'Failed to list inbox' });
    }
  });

  // ============================================
  // 9. GET /api/query/projects/:code/inbox/:subfolder/:filename - FR-64
  // Read inbox file content
  // ============================================
  router.get('/projects/:code/inbox/:subfolder/:filename', async (req: Request, res: Response) => {
    const { code, subfolder, filename } = req.params;
    const projectsDir = expandPath(PROJECTS_ROOT);
    const projectPath = path.join(projectsDir, code);

    try {
      // Security: Validate no path traversal in subfolder or filename
      if (subfolder.includes('..') || subfolder.includes('/') || subfolder.includes('\\')) {
        res.status(400).json({ success: false, error: 'Invalid subfolder' });
        return;
      }
      if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        res.status(400).json({ success: false, error: 'Invalid filename' });
        return;
      }

      if (!await fs.pathExists(projectPath)) {
        res.status(404).json({ success: false, error: `Project not found: ${code}` });
        return;
      }

      const paths = getProjectPaths(projectPath);

      // Handle (root) subfolder - files directly in inbox/
      let filePath: string;
      if (subfolder === '(root)') {
        filePath = path.join(paths.inbox, filename);
      } else {
        filePath = path.join(paths.inbox, subfolder, filename);
      }

      if (!await fs.pathExists(filePath)) {
        res.status(404).json({ success: false, error: `File not found: ${filename}` });
        return;
      }

      // Determine MIME type based on extension
      const ext = path.extname(filename).toLowerCase();
      const mimeTypes: Record<string, string> = {
        '.md': 'text/markdown',
        '.json': 'application/json',
        '.html': 'text/html',
        '.txt': 'text/plain',
        '.css': 'text/css',
        '.js': 'text/javascript',
        '.ts': 'text/typescript',
        '.yaml': 'text/yaml',
        '.yml': 'text/yaml',
        '.xml': 'text/xml',
      };
      const mimeType = mimeTypes[ext] || 'text/plain';

      // Only allow text-based files
      const allowedExtensions = ['.md', '.json', '.html', '.txt', '.css', '.js', '.ts', '.yaml', '.yml', '.xml'];
      if (!allowedExtensions.includes(ext)) {
        res.status(400).json({ success: false, error: `File type not supported for viewing: ${ext}` });
        return;
      }

      const content = await fs.readFile(filePath, 'utf-8');

      res.json({
        success: true,
        filename,
        content,
        mimeType,
      });
    } catch (error) {
      console.error('Error reading inbox file:', error);
      res.status(500).json({ success: false, error: 'Failed to read file' });
    }
  });

  return router;
}
