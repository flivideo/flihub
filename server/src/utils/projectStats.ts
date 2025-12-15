/**
 * NFR-9: Project Stats Utility
 *
 * Centralized function for computing project statistics.
 * Extracted from duplicated code in query.ts and projects.ts.
 */

import path from 'path';
import {
  countMovFiles,
  countUniqueChapters,
  countFiles,
  getProjectTimestamps,
  getTranscriptSyncStatus,
  getProjectIndicators,
} from './scanning.js';
import { detectFinalMedia } from './finalMedia.js';
import { getShadowCounts } from './shadowFiles.js';
import type {
  Config,
  ProjectPriority,
  ProjectStage,
  TranscriptSyncStatus,
} from '../../../shared/types.js';

/**
 * FR-80: Migrate legacy stage values to new stage model
 * - record → recording
 * - edit/editing → first-edit
 * - done → published
 */
function migrateOldStage(oldStage: string | undefined): ProjectStage | undefined {
  if (!oldStage) return undefined;

  const migration: Record<string, ProjectStage> = {
    'record': 'recording',
    'recording': 'recording',
    'edit': 'first-edit',
    'editing': 'first-edit',
    'done': 'published',
  };

  return migration[oldStage] || (oldStage as ProjectStage);
}

/**
 * Raw project stats - the core data before formatting for specific APIs
 */
export interface ProjectStatsRaw {
  code: string;
  projectPath: string;

  // File counts
  recordingsCount: number;
  safeCount: number;
  totalFiles: number;
  chapterCount: number;

  // Transcript sync
  transcriptSync: TranscriptSyncStatus;
  transcriptPercent: number;

  // Assets
  imageCount: number;
  thumbCount: number;

  // Timestamps
  createdAt: string | null;
  lastModified: string | null;

  // Computed state
  stage: ProjectStage;
  priority: ProjectPriority;

  // FR-80/FR-82: Content indicators with counts
  hasInbox: boolean;
  hasAssets: boolean;
  hasChapters: boolean;
  inboxCount: number;
  chapterVideoCount: number;

  // FR-83: Shadow recordings
  shadowCount: number;

  // Final media (optional, only if requested)
  finalMedia?: {
    video?: { filename: string; size: number };
    srt?: { filename: string };
  } | null;
}

/**
 * Options for computing project stats
 */
export interface GetProjectStatsOptions {
  includeFinalMedia?: boolean;
}

/**
 * Get comprehensive stats for a project
 * This is the single source of truth for project statistics
 */
export async function getProjectStatsRaw(
  projectPath: string,
  code: string,
  config: Config,
  options: GetProjectStatsOptions = {}
): Promise<ProjectStatsRaw> {
  const recordingsDir = path.join(projectPath, 'recordings');
  const safeDir = path.join(projectPath, 'recordings', '-safe');
  const transcriptsDir = path.join(projectPath, 'recording-transcripts');
  const imagesDir = path.join(projectPath, 'assets', 'images');
  const thumbsDir = path.join(projectPath, 'assets', 'thumbs');

  // Count files
  const recordingsCount = await countMovFiles(recordingsDir);
  const safeCount = await countMovFiles(safeDir);
  const totalFiles = recordingsCount + safeCount;

  // Transcript sync status
  const transcriptSync = await getTranscriptSyncStatus(recordingsDir, safeDir, transcriptsDir);
  const transcriptPercent = totalFiles > 0
    ? Math.round((transcriptSync.matched / totalFiles) * 100)
    : 0;

  // Chapter count
  const chapterCount = await countUniqueChapters(recordingsDir, safeDir);

  // Asset counts
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];
  const imageCount = await countFiles(imagesDir, imageExtensions);
  const thumbCount = await countFiles(thumbsDir, imageExtensions);

  // Timestamps
  const { createdAt, lastModified } = await getProjectTimestamps(projectPath);

  // FR-80: Get content indicators
  const indicators = await getProjectIndicators(projectPath);

  // FR-83: Get shadow counts
  const shadowDir = path.join(projectPath, 'recording-shadows');
  const shadowSafeDir = path.join(projectPath, 'recording-shadows', '-safe');
  const shadowCounts = await getShadowCounts(recordingsDir, safeDir, shadowDir, shadowSafeDir);

  // FR-80: Determine stage (check for manual override first)
  // Use projectStageOverrides (new) or fall back to legacy projectStages
  const manualStage = config.projectStageOverrides?.[code] ||
    migrateOldStage(config.projectStages?.[code as keyof typeof config.projectStages] as string | undefined);

  let stage: ProjectStage;
  if (manualStage) {
    stage = manualStage;
  } else if (totalFiles === 0) {
    // Auto-detect: No recordings = planning
    stage = 'planning';
  } else {
    // Auto-detect: Has recordings = recording (auto-trigger)
    stage = 'recording';
  }

  // Determine priority from config
  const storedPriority = config.projectPriorities?.[code];
  const priority: ProjectPriority = storedPriority === 'pinned' ? 'pinned' : 'normal';

  const result: ProjectStatsRaw = {
    code,
    projectPath,
    recordingsCount,
    safeCount,
    totalFiles,
    chapterCount,
    transcriptSync,
    transcriptPercent,
    imageCount,
    thumbCount,
    createdAt,
    lastModified,
    stage,
    priority,
    hasInbox: indicators.hasInbox,
    hasAssets: indicators.hasAssets,
    hasChapters: indicators.hasChapters,
    inboxCount: indicators.inboxCount,
    chapterVideoCount: indicators.chapterVideoCount,
    shadowCount: shadowCounts.shadows,
  };

  // Optionally include final media
  if (options.includeFinalMedia) {
    try {
      const finalResult = await detectFinalMedia(projectPath, code);
      if (finalResult.video || finalResult.srt) {
        result.finalMedia = {};
        if (finalResult.video) {
          result.finalMedia.video = {
            filename: finalResult.video.filename,
            size: finalResult.video.size,
          };
        }
        if (finalResult.srt) {
          result.finalMedia.srt = {
            filename: finalResult.srt.filename,
          };
        }
      } else {
        result.finalMedia = null;
      }
    } catch (err) {
      console.warn(`Failed to detect final media for ${code}:`, err);
      result.finalMedia = null;
    }
  }

  return result;
}
