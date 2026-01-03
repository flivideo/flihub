import { Router, Request, Response } from 'express';
import fs from 'fs-extra';
import path from 'path';
import type { FileInfo, Config, RenameRequest, RenameResponse, SuggestedNaming, RecordingFile, TranscriptionJob } from '../../../shared/types.js';
import { expandPath } from '../utils/pathUtils.js';
import { getProjectPaths } from '../../../shared/paths.js';
import { getVideoDuration } from '../utils/videoDuration.js';
import { createShadowFile, moveShadowFile, renameShadowFile, deleteShadowFile } from '../utils/shadowFiles.js';
import { readProjectState, writeProjectState, setRecordingSafe, isRecordingSafe, setRecordingParked, isRecordingParked, getRecordingAnnotation } from '../utils/projectState.js';
import { renameRecording } from '../utils/renameRecording.js';  // FR-130: Simplified rename logic
import {
  NAMING_RULES,
  parseRecordingFilename,
  buildRecordingFilename,
  calculateSuggestedNaming as calculateSuggested,
  parseChapterNum,
  parseSequenceNum,
} from '../../../shared/naming.js';

// FR-50: Track recent renames for undo functionality
interface RecentRename {
  id: string;
  originalPath: string;
  originalName: string;
  newPath: string;
  newName: string;
  timestamp: number;
}

// FR-50: Store recent renames in memory (auto-expires after 10 minutes)
const recentRenames: RecentRename[] = [];
const RENAME_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const MAX_RECENT_RENAMES = 5;

// FR-50: Generate unique ID for rename tracking
function generateRenameId(): string {
  return `rename-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// FR-50: Clean up expired renames
function cleanExpiredRenames(): void {
  const now = Date.now();
  while (recentRenames.length > 0 && now - recentRenames[0].timestamp > RENAME_EXPIRY_MS) {
    recentRenames.shift();
  }
}

export function createRoutes(
  pendingFiles: Map<string, FileInfo>,
  config: Config,
  updateConfig: (newConfig: Partial<Config>) => Config,
  queueTranscription?: (videoPath: string) => void,  // FR-30: Auto-transcribe on rename
  getActiveJob?: () => TranscriptionJob | null,      // FR-130: Check rename conflicts
  getQueue?: () => TranscriptionJob[],               // FR-130: Check rename conflicts
  io?: import('socket.io').Server<import('../../../shared/types.js').ClientToServerEvents, import('../../../shared/types.js').ServerToClientEvents>  // Socket.IO for real-time updates
): Router {
  const router = Router();

  // GET /api/config - Get current configuration
  router.get('/config', (_req: Request, res: Response) => {
    res.json(config);
  });

  // FR-4: GET /api/suggested-naming - Calculate next chapter/segment based on existing files
  // NFR-6: Using projectDirectory with getProjectPaths()
  router.get('/suggested-naming', async (_req: Request, res: Response) => {
    try {
      console.log('[FR-89 DEBUG suggested-naming] config.projectDirectory:', config.projectDirectory);
      const paths = getProjectPaths(expandPath(config.projectDirectory));
      console.log('[FR-89 DEBUG suggested-naming] paths.recordings:', paths.recordings);

      // Check if directory exists
      if (!await fs.pathExists(paths.recordings)) {
        const defaultResponse = {
          chapter: '01',
          sequence: '1',
          name: 'intro',
          existingFiles: [],
        } as SuggestedNaming;
        console.log('[FR-89 DEBUG suggested-naming] Directory not found, returning defaults:', defaultResponse);
        res.json(defaultResponse);
        return;
      }

      // Read all .mov files in recordings directory
      const files = await fs.readdir(paths.recordings);
      const movFiles = files.filter(f => f.endsWith('.mov')).sort();
      console.log('[FR-89 DEBUG suggested-naming] Found mov files:', movFiles);

      const suggestion = calculateSuggested(movFiles);
      const response = { ...suggestion, existingFiles: movFiles } as SuggestedNaming;
      console.log('[FR-89 DEBUG suggested-naming] Returning suggestion:', response);
      res.json(response);
    } catch (error) {
      console.error('Error calculating suggested naming:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to calculate suggested naming',
      });
    }
  });

  // POST /api/config - Update configuration
  // FR-89: Support all config fields including split project directory
  // FR-116: Support common names editing
  router.post('/config', (req: Request, res: Response) => {
    const {
      watchDirectory,
      projectDirectory,
      projectsRootDirectory,
      activeProject,
      imageSourceDirectory,
      shadowResolution,
      glingDictionary,
      commonNames,
    } = req.body;
    const updatedConfig = updateConfig({
      watchDirectory,
      projectDirectory,
      projectsRootDirectory,
      activeProject,
      imageSourceDirectory,
      shadowResolution,
      glingDictionary,
      commonNames,
    });
    console.log('Config updated:', updatedConfig);
    res.json(updatedConfig);
  });

  // GET /api/files - List pending files
  router.get('/files', (_req: Request, res: Response) => {
    const files = Array.from(pendingFiles.values());
    res.json(files);
  });

  // POST /api/rename - Rename and move a file
  router.post('/rename', async (req: Request, res: Response) => {
    const { originalPath, chapter, sequence, name, tags }: RenameRequest = req.body;

    // Validate inputs
    if (!originalPath || !chapter || !name) {
      res.status(400).json({
        success: false,
        oldPath: originalPath,
        newPath: '',
        error: 'Missing required fields: originalPath, chapter, and name are required',
      } as RenameResponse);
      return;
    }

    // Validate chapter format (2 digits)
    if (!NAMING_RULES.chapter.pattern.test(chapter)) {
      res.status(400).json({
        success: false,
        oldPath: originalPath,
        newPath: '',
        error: NAMING_RULES.chapter.errorMessage,
      } as RenameResponse);
      return;
    }

    // Validate sequence if provided (1 or more digits)
    if (sequence && !NAMING_RULES.sequence.pattern.test(sequence)) {
      res.status(400).json({
        success: false,
        oldPath: originalPath,
        newPath: '',
        error: NAMING_RULES.sequence.errorMessage,
      } as RenameResponse);
      return;
    }

    try {
      // Check if source file exists
      if (!await fs.pathExists(originalPath)) {
        res.status(404).json({
          success: false,
          oldPath: originalPath,
          newPath: '',
          error: 'Source file not found',
        } as RenameResponse);
        return;
      }

      // Build new filename
      // NFR-6: Using projectDirectory with getProjectPaths()
      const newFilename = buildRecordingFilename(chapter, sequence, name, tags || []);
      const paths = getProjectPaths(expandPath(config.projectDirectory));
      const newPath = path.join(paths.recordings, newFilename);

      // Check for conflicts
      if (await fs.pathExists(newPath)) {
        res.status(409).json({
          success: false,
          oldPath: originalPath,
          newPath,
          error: `Target file already exists: ${newFilename}`,
        } as RenameResponse);
        return;
      }

      // Ensure recordings directory exists
      await fs.ensureDir(paths.recordings);

      // Move and rename file
      await fs.move(originalPath, newPath);

      // Remove from pending files
      pendingFiles.delete(originalPath);

      // FR-50: Track rename for undo functionality
      cleanExpiredRenames();  // Clean up old entries first
      const renameEntry: RecentRename = {
        id: generateRenameId(),
        originalPath,
        originalName: path.basename(originalPath),
        newPath,
        newName: newFilename,
        timestamp: Date.now(),
      };
      recentRenames.push(renameEntry);
      // Keep only last MAX_RECENT_RENAMES entries
      while (recentRenames.length > MAX_RECENT_RENAMES) {
        recentRenames.shift();
      }
      console.log(`Tracked rename: ${renameEntry.originalName} -> ${renameEntry.newName}`);

      // FR-30: Auto-queue transcription after successful rename
      if (queueTranscription) {
        queueTranscription(newPath);
      }

      // FR-83: Auto-generate shadow file for collaborators
      const shadowDir = path.join(paths.project, 'recording-shadows');
      createShadowFile(newPath, shadowDir).catch(err => {
        console.warn('Failed to create shadow file:', err);
      });

      res.json({
        success: true,
        oldPath: originalPath,
        newPath,
      } as RenameResponse);
    } catch (error) {
      console.error('Rename error:', error);
      res.status(500).json({
        success: false,
        oldPath: originalPath,
        newPath: '',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      } as RenameResponse);
    }
  });

  // DELETE /api/files/:path - Remove a file from pending (discard without renaming)
  router.delete('/files/:encodedPath', (req: Request, res: Response) => {
    const filePath = decodeURIComponent(req.params.encodedPath);
    if (pendingFiles.has(filePath)) {
      pendingFiles.delete(filePath);
      res.json({ success: true, path: filePath });
    } else {
      res.status(404).json({ success: false, error: 'File not found in pending list' });
    }
  });

  // FR-5: POST /api/trash - Move file to .trash/ directory in target folder
  router.post('/trash', async (req: Request, res: Response) => {
    const { path: filePath } = req.body;

    if (!filePath) {
      res.status(400).json({ success: false, error: 'File path is required' });
      return;
    }

    try {
      // Check if source file exists
      if (!await fs.pathExists(filePath)) {
        // File already gone, just remove from pending
        pendingFiles.delete(filePath);
        res.json({ success: true, trashPath: null });
        return;
      }

      // Create -trash directory as sibling to recordings folder
      // NFR-6: Using projectDirectory with getProjectPaths()
      const paths = getProjectPaths(expandPath(config.projectDirectory));
      await fs.ensureDir(paths.trash);

      // Move file to trash
      const filename = path.basename(filePath);
      const trashPath = path.join(paths.trash, filename);

      // Handle duplicate filenames in trash
      let finalTrashPath = trashPath;
      let counter = 1;
      while (await fs.pathExists(finalTrashPath)) {
        const ext = path.extname(filename);
        const base = path.basename(filename, ext);
        finalTrashPath = path.join(paths.trash, `${base}-${counter}${ext}`);
        counter++;
      }

      await fs.move(filePath, finalTrashPath);

      // Remove from pending files
      pendingFiles.delete(filePath);

      console.log(`Trashed: ${filename} -> ${finalTrashPath}`);
      res.json({ success: true, trashPath: finalTrashPath });
    } catch (error) {
      console.error('Trash error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to trash file',
      });
    }
  });

  // FR-12: POST /api/projects - Create a new AppyDave video project
  router.post('/projects', async (req: Request, res: Response) => {
    const { code } = req.body;

    if (!code) {
      res.status(400).json({ success: false, error: 'Project code is required' });
      return;
    }

    // Validate project code format: kebab-case, typically starts with b followed by number
    if (!NAMING_RULES.name.pattern.test(code)) {
      res.status(400).json({
        success: false,
        error: NAMING_RULES.name.errorMessage,
      });
      return;
    }

    try {
      const projectsRoot = expandPath('~/dev/video-projects/v-appydave');
      const projectPath = path.join(projectsRoot, code);
      const recordingsPath = path.join(projectPath, 'recordings');

      // Check if project already exists
      if (await fs.pathExists(projectPath)) {
        res.status(409).json({
          success: false,
          error: `Project "${code}" already exists`,
        });
        return;
      }

      // Create project folder and recordings subdirectory
      await fs.ensureDir(recordingsPath);

      console.log(`Created project: ${code} at ${projectPath}`);

      res.json({
        success: true,
        project: {
          code,
          path: projectPath,
          fileCount: 0,
          lastModified: '',
        },
      });
    } catch (error) {
      console.error('Error creating project:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create project',
      });
    }
  });

  // FR-14: GET /api/recordings - List all recordings in project's recordings directory
  // NFR-6: Using projectDirectory with getProjectPaths()
  // FR-88: Unified scanning - merges real recordings with shadow video files
  // FR-111 Phase 3: Rewritten to use state file instead of -safe folder
  router.get('/recordings', async (_req: Request, res: Response) => {
    try {
      const paths = getProjectPaths(expandPath(config.projectDirectory));

      // FR-111: Read project state for isSafe flags
      const state = await readProjectState(config.projectDirectory);

      // FR-88: Shadow directory (no longer scanning -safe subfolder)
      const shadowDir = path.join(paths.project, 'recording-shadows');

      // Known tags that can appear at the end of filenames
      const knownTags = new Set((config.availableTags || []).map(t => t.toLowerCase()));
      // Also check suggestTags from commonNames
      for (const cn of config.commonNames || []) {
        for (const tag of cn.suggestTags || []) {
          knownTags.add(tag.toLowerCase());
        }
      }

      // Helper to extract name and tags from parsed name
      const extractNameAndTags = (parsedName: string): { name: string; tags: string[] } => {
        const nameParts = parsedName.split('-');
        const tags: string[] = [];
        while (nameParts.length > 1 && knownTags.has(nameParts[nameParts.length - 1].toLowerCase())) {
          tags.unshift(nameParts.pop()!);
        }
        return { name: nameParts.join('-'), tags };
      };

      // FR-88: Build unified map - baseName -> recording (real takes precedence over shadow)
      const unifiedMap = new Map<string, RecordingFile>();

      // FR-88: Track which baseNames have shadow files (for hasShadow flag)
      const shadowSet = new Map<string, { size: number; duration: number | null; shadowPath: string }>();

      // FR-111: Only scan main shadow directory (no -safe subfolder)
      if (await fs.pathExists(shadowDir)) {
        const entries = await fs.readdir(shadowDir, { withFileTypes: true });
        for (const entry of entries) {
          // Skip -safe directory if it still exists (migration not complete)
          if (entry.isDirectory() && entry.name === '-safe') continue;
          if (!entry.isFile() || !entry.name.match(/\.mp4$/i)) continue;

          const shadowPath = path.join(shadowDir, entry.name);
          const baseName = entry.name.replace(/\.mp4$/i, '');
          const parsed = parseRecordingFilename(baseName + '.mov');
          if (!parsed) continue;

          const stats = await fs.stat(shadowPath);
          const duration = await getVideoDuration(shadowPath);

          // Track shadow for hasShadow check on real files
          shadowSet.set(baseName, { size: stats.size, duration, shadowPath });

          // Extract name and tags
          const { name, tags } = extractNameAndTags(parsed.name);

          // FR-111/FR-120/FR-123: Check state for isSafe, isParked, and annotation
          const isSafe = isRecordingSafe(state, `${baseName}.mov`);
          const isParked = isRecordingParked(state, `${baseName}.mov`);
          const annotation = getRecordingAnnotation(state, `${baseName}.mov`);

          // Add as shadow-only entry (may be overwritten by real file)
          unifiedMap.set(baseName, {
            filename: `${baseName}.mov`,  // Report as .mov for UI consistency
            path: shadowPath,  // Path points to shadow video
            size: stats.size,
            timestamp: stats.mtime.toISOString(),
            duration: duration ?? undefined,
            chapter: parsed.chapter,
            sequence: parsed.sequence || '1',
            name,
            tags,
            folder: 'recordings',  // FR-111: Always 'recordings' now
            isSafe,                // FR-111: From state file
            isParked,              // FR-120: From state file
            annotation,            // FR-123: From state file
            isShadow: true,
            hasShadow: true,  // Shadow-only files obviously have shadow
            shadowSize: stats.size,  // FR-95: Shadow-only, so shadow size = file size
          });
        }
      }

      // FR-111: Only scan main recordings folder (no -safe subfolder)
      if (await fs.pathExists(paths.recordings)) {
        const entries = await fs.readdir(paths.recordings, { withFileTypes: true });
        // Skip -safe directory if it still exists (migration not complete)
        const fileEntries = entries.filter(e => e.isFile() && e.name.endsWith('.mov'));

        // FR-57: parallel processing
        const results = await Promise.all(fileEntries.map(async (entry) => {
          const filePath = path.join(paths.recordings, entry.name);
          const parsed = parseRecordingFilename(entry.name);
          if (!parsed) return null;

          const stats = await fs.stat(filePath);

          // Check if this recording has a shadow
          const baseName = entry.name.replace('.mov', '');
          const shadowInfo = shadowSet.get(baseName);

          // FR-36: Get video duration (prefer shadow duration if available, faster to read)
          const duration = shadowInfo?.duration ?? await getVideoDuration(filePath);

          const { name, tags } = extractNameAndTags(parsed.name);

          // FR-111/FR-120/FR-123: Check state for isSafe, isParked, and annotation
          const isSafe = isRecordingSafe(state, entry.name);
          const isParked = isRecordingParked(state, entry.name);
          const annotation = getRecordingAnnotation(state, entry.name);

          return {
            baseName,
            recording: {
              filename: entry.name,
              path: filePath,
              size: stats.size,
              timestamp: stats.mtime.toISOString(),
              duration: duration ?? undefined,
              chapter: parsed.chapter,
              sequence: parsed.sequence || '1',
              name,
              tags,
              folder: 'recordings' as const,  // FR-111: Always 'recordings' now
              isSafe,                         // FR-111: From state file
              isParked,                       // FR-120: From state file
              annotation,                     // FR-123: From state file
              isShadow: false,
              hasShadow: !!shadowInfo,
              shadowSize: shadowInfo?.size ?? null,  // FR-95: Shadow file size (null if no shadow)
            } satisfies RecordingFile,
          };
        }));

        // Add real recordings to map (overwrites shadow-only entries)
        for (const result of results) {
          if (result) {
            unifiedMap.set(result.baseName, result.recording);
          }
        }
      }

      // Convert map to array
      const recordings = Array.from(unifiedMap.values());

      // Sort by chapter (numeric), then sequence (numeric), then timestamp
      recordings.sort((a, b) => {
        const chapterCompare = parseChapterNum(a.chapter) - parseChapterNum(b.chapter);
        if (chapterCompare !== 0) return chapterCompare;
        const seqCompare = parseSequenceNum(a.sequence) - parseSequenceNum(b.sequence);
        if (seqCompare !== 0) return seqCompare;
        return a.timestamp.localeCompare(b.timestamp);
      });

      // FR-95: Calculate total sizes for header display
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

      res.json({
        recordings,
        totalRecordingsSize,  // FR-95: Total size of real recordings in bytes
        totalShadowsSize: totalShadowsSize > 0 ? totalShadowsSize : null,  // FR-95: Total shadow size (null if none)
      });
    } catch (error) {
      console.error('Error listing recordings:', error);
      res.status(500).json({
        recordings: [],
        totalRecordingsSize: 0,
        totalShadowsSize: null,
        error: error instanceof Error ? error.message : 'Failed to list recordings',
      });
    }
  });

  // FR-50: GET /api/recordings/recent-renames - Get recent renames for undo
  router.get('/recordings/recent-renames', (_req: Request, res: Response) => {
    cleanExpiredRenames();  // Clean up old entries first

    // Return recent renames (newest first) with human-readable info
    const renames = [...recentRenames].reverse().map(r => ({
      id: r.id,
      originalName: r.originalName,
      newName: r.newName,
      timestamp: r.timestamp,
      age: Date.now() - r.timestamp,  // milliseconds since rename
    }));

    res.json({ renames });
  });

  // FR-50: POST /api/recordings/undo-rename - Undo a recent rename
  router.post('/recordings/undo-rename', async (req: Request, res: Response) => {
    const { id } = req.body;

    if (!id) {
      res.status(400).json({ success: false, error: 'Rename ID is required' });
      return;
    }

    cleanExpiredRenames();  // Clean up old entries first

    // Find the rename entry
    const renameIndex = recentRenames.findIndex(r => r.id === id);
    if (renameIndex === -1) {
      res.status(404).json({
        success: false,
        error: 'Rename not found or expired',
      });
      return;
    }

    const rename = recentRenames[renameIndex];

    try {
      // Check if the renamed file still exists at newPath
      if (!await fs.pathExists(rename.newPath)) {
        // Remove from tracking since file is gone
        recentRenames.splice(renameIndex, 1);
        res.status(404).json({
          success: false,
          error: 'File has been moved or deleted since rename',
        });
        return;
      }

      // Check if original location is available (parent dir must exist)
      const originalDir = path.dirname(rename.originalPath);
      if (!await fs.pathExists(originalDir)) {
        res.status(400).json({
          success: false,
          error: 'Original directory no longer exists',
        });
        return;
      }

      // Check if a file already exists at the original path
      if (await fs.pathExists(rename.originalPath)) {
        res.status(409).json({
          success: false,
          error: 'A file already exists at the original location',
        });
        return;
      }

      // Move file back to original location with original name
      await fs.move(rename.newPath, rename.originalPath);

      // FR-83: Delete shadow file since recording is being moved back to watch directory
      const paths = getProjectPaths(expandPath(config.projectDirectory));
      const shadowDir = path.join(paths.project, 'recording-shadows');
      const baseName = rename.newName.replace(/\.mov$/i, '');
      deleteShadowFile(baseName, shadowDir).catch(err => {
        console.warn(`Failed to delete shadow for undone rename:`, err);
      });

      // Remove from tracking
      recentRenames.splice(renameIndex, 1);

      console.log(`Undid rename: ${rename.newName} -> ${rename.originalName}`);

      res.json({
        success: true,
        originalPath: rename.originalPath,
        originalName: rename.originalName,
      });
    } catch (error) {
      console.error('Undo rename error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to undo rename',
      });
    }
  });

  // FR-15: POST /api/recordings/safe - Mark file(s) as safe
  // FR-111 Phase 3: Rewritten to use state file instead of moving files
  router.post('/recordings/safe', async (req: Request, res: Response) => {
    const { files, chapter } = req.body;

    if (!files && !chapter) {
      res.status(400).json({ success: false, error: 'Either files array or chapter is required' });
      return;
    }

    try {
      const paths = getProjectPaths(expandPath(config.projectDirectory));

      // Read current state
      let state = await readProjectState(config.projectDirectory);

      let filesToMark: string[] = [];

      if (files && Array.isArray(files)) {
        // Mark specific files
        filesToMark = files;
      } else if (chapter) {
        // Mark all files in the chapter
        const entries = await fs.readdir(paths.recordings, { withFileTypes: true });
        filesToMark = entries
          .filter(e => e.isFile() && e.name.endsWith('.mov'))
          .map(e => e.name)
          .filter(name => {
            const parsed = parseRecordingFilename(name);
            return parsed && parsed.chapter === chapter;
          });
      }

      const marked: string[] = [];
      const errors: string[] = [];

      for (const filename of filesToMark) {
        const filePath = path.join(paths.recordings, filename);

        try {
          // Verify file exists
          if (await fs.pathExists(filePath)) {
            // Update state to mark as safe
            state = setRecordingSafe(state, filename, true);
            marked.push(filename);
            console.log(`[FR-111] Marked safe: ${filename}`);
          } else {
            errors.push(`File not found: ${filename}`);
          }
        } catch (err) {
          errors.push(`Failed to mark ${filename}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }

      // Write updated state
      await writeProjectState(config.projectDirectory, state);

      // Emit socket event for real-time UI updates
      if (io) {
        io.emit('recordings:changed');
      }

      res.json({
        success: errors.length === 0,
        moved: marked,  // Keep 'moved' for API compatibility
        count: marked.length,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error) {
      console.error('Error marking as safe:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to mark files as safe',
      });
    }
  });

  // FR-15: POST /api/recordings/restore - Restore file(s) from safe state
  // FR-111 Phase 3: Rewritten to use state file instead of moving files
  router.post('/recordings/restore', async (req: Request, res: Response) => {
    const { files } = req.body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      res.status(400).json({ success: false, error: 'Files array is required' });
      return;
    }

    try {
      // Read current state
      let state = await readProjectState(config.projectDirectory);

      const restored: string[] = [];
      const errors: string[] = [];

      for (const filename of files) {
        try {
          // Check if file is currently marked as safe
          if (isRecordingSafe(state, filename)) {
            // Update state to mark as not safe (active)
            state = setRecordingSafe(state, filename, false);
            restored.push(filename);
            console.log(`[FR-111] Restored from safe: ${filename}`);
          } else {
            errors.push(`File not marked as safe: ${filename}`);
          }
        } catch (err) {
          errors.push(`Failed to restore ${filename}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }

      // Write updated state
      await writeProjectState(config.projectDirectory, state);

      // Emit socket event for real-time UI updates
      if (io) {
        io.emit('recordings:changed');
      }

      res.json({
        success: errors.length === 0,
        restored,
        count: restored.length,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error) {
      console.error('Error restoring from safe:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to restore files from safe',
      });
    }
  });

  // FR-120: POST /api/recordings/park - Mark file(s) as parked
  router.post('/recordings/park', async (req: Request, res: Response) => {
    const { files, chapter } = req.body;

    if (!files && !chapter) {
      res.status(400).json({ success: false, error: 'Either files array or chapter is required' });
      return;
    }

    try {
      const paths = getProjectPaths(expandPath(config.projectDirectory));

      // Read current state
      let state = await readProjectState(config.projectDirectory);

      let filesToMark: string[] = [];

      if (files && Array.isArray(files)) {
        // Mark specific files
        filesToMark = files;
      } else if (chapter) {
        // Mark all files in the chapter
        const entries = await fs.readdir(paths.recordings, { withFileTypes: true });
        filesToMark = entries
          .filter(e => e.isFile() && e.name.endsWith('.mov'))
          .map(e => e.name)
          .filter(name => {
            const parsed = parseRecordingFilename(name);
            return parsed && parsed.chapter === chapter;
          });
      }

      const parked: string[] = [];
      const errors: string[] = [];

      for (const filename of filesToMark) {
        const filePath = path.join(paths.recordings, filename);

        try {
          // Verify file exists
          if (await fs.pathExists(filePath)) {
            // Update state to mark as parked
            state = setRecordingParked(state, filename, true);
            parked.push(filename);
            console.log(`[FR-120] Marked parked: ${filename}`);
          } else {
            errors.push(`File not found: ${filename}`);
          }
        } catch (err) {
          errors.push(`Failed to mark ${filename}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }

      // Write updated state
      await writeProjectState(config.projectDirectory, state);

      // Emit socket event for real-time UI updates
      if (io) {
        io.emit('recordings:changed');
      }

      res.json({
        success: errors.length === 0,
        parked,
        count: parked.length,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error) {
      console.error('Error marking as parked:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to mark files as parked',
      });
    }
  });

  // FR-120: POST /api/recordings/unpark - Restore file(s) from parked state
  router.post('/recordings/unpark', async (req: Request, res: Response) => {
    const { files } = req.body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      res.status(400).json({ success: false, error: 'Files array is required' });
      return;
    }

    try {
      // Read current state
      let state = await readProjectState(config.projectDirectory);

      const unparked: string[] = [];
      const errors: string[] = [];

      for (const filename of files) {
        try {
          // Check if file is currently marked as parked
          if (isRecordingParked(state, filename)) {
            // Update state to mark as not parked (active)
            state = setRecordingParked(state, filename, false);
            unparked.push(filename);
            console.log(`[FR-120] Unparked: ${filename}`);
          } else {
            errors.push(`File not marked as parked: ${filename}`);
          }
        } catch (err) {
          errors.push(`Failed to unpark ${filename}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }

      // Write updated state
      await writeProjectState(config.projectDirectory, state);

      // Emit socket event for real-time UI updates
      if (io) {
        io.emit('recordings:changed');
      }

      res.json({
        success: errors.length === 0,
        unparked,
        count: unparked.length,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error) {
      console.error('Error unparking:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to unpark files',
      });
    }
  });

  // FR-47/FR-130: POST /api/recordings/rename-chapter - Rename the label for all files in a chapter
  // Simplified using delete+regenerate pattern (152 lines → ~80 lines)
  router.post('/recordings/rename-chapter', async (req: Request, res: Response) => {
    const { chapter, currentLabel, newLabel } = req.body;

    if (!chapter || !currentLabel || !newLabel) {
      res.status(400).json({
        success: false,
        renamedFiles: [],
        error: 'chapter, currentLabel, and newLabel are required',
      });
      return;
    }

    // Validate new label format (kebab-case)
    if (!NAMING_RULES.name.pattern.test(newLabel)) {
      res.status(400).json({
        success: false,
        renamedFiles: [],
        error: NAMING_RULES.name.errorMessage,
      });
      return;
    }

    try {
      const paths = getProjectPaths(expandPath(config.projectDirectory));

      // Build set of known tags from config
      const knownTags = new Set((config.availableTags || []).map(t => t.toUpperCase()));
      for (const cn of config.commonNames || []) {
        for (const tag of cn.suggestTags || []) {
          knownTags.add(tag.toUpperCase());
        }
      }

      // Find all .mov files matching this chapter-label pattern
      const recordingsToRename: { oldFilename: string; newFilename: string }[] = [];

      // Helper to find recordings (only .mov files, not transcripts or shadows)
      const findRecordings = async (dirPath: string) => {
        if (!await fs.pathExists(dirPath)) return;

        const entries = await fs.readdir(dirPath);
        for (const filename of entries) {
          if (!filename.endsWith('.mov') && !filename.endsWith('.mp4')) continue;

          // Parse the filename
          const parsed = parseRecordingFilename(filename);
          if (!parsed || parsed.chapter !== chapter) continue;

          // Extract label (name without tags) from parsed name
          const nameParts = parsed.name.split('-');
          const fileTags: string[] = [];

          while (nameParts.length > 1 && knownTags.has(nameParts[nameParts.length - 1].toUpperCase())) {
            fileTags.unshift(nameParts.pop()!.toUpperCase());
          }

          const fileLabel = nameParts.join('-');

          // Check if this file's label matches what we're renaming
          if (fileLabel !== currentLabel) continue;

          // Build new filename
          const newFilename = buildRecordingFilename(parsed.chapter, parsed.sequence, newLabel, fileTags);

          recordingsToRename.push({ oldFilename: filename, newFilename });
        }
      };

      // Find recordings in both locations
      await findRecordings(paths.recordings);
      await findRecordings(paths.safe);

      if (recordingsToRename.length === 0) {
        res.status(404).json({
          success: false,
          renamedFiles: [],
          error: 'No files found to rename',
        });
        return;
      }

      // Check for conflicts
      for (const { newFilename } of recordingsToRename) {
        const newPath = path.join(paths.recordings, newFilename);
        const newSafePath = path.join(paths.safe, newFilename);
        if ((await fs.pathExists(newPath)) || (await fs.pathExists(newSafePath))) {
          res.status(409).json({
            success: false,
            renamedFiles: [],
            error: `Target file already exists: ${newFilename}`,
          });
          return;
        }
      }

      // FR-130: Use delete+regenerate pattern for each recording
      const renamedFiles: string[] = [];
      const activeJob = getActiveJob ? getActiveJob() : null;
      const queue = getQueue ? getQueue() : [];

      console.log(`[FR-130] Processing ${recordingsToRename.length} files for rename`);

      for (const { oldFilename, newFilename } of recordingsToRename) {
        const result = await renameRecording(
          oldFilename,
          newFilename,
          paths,
          activeJob,
          queue,
          queueTranscription
        );

        if (result.success) {
          renamedFiles.push(newFilename);
          console.log(`Renamed: ${oldFilename} -> ${newFilename}`);
        } else {
          console.error(`Failed to rename ${oldFilename}:`, result.error);
          res.status(500).json({
            success: false,
            renamedFiles,
            error: result.error || `Failed to rename ${oldFilename}`,
          });
          return;
        }
      }

      console.log(`[FR-130] All renames complete, sending success response with ${renamedFiles.length} files`);
      res.json({
        success: true,
        renamedFiles,
      });
    } catch (error) {
      console.error('Error renaming chapter:', error);
      res.status(500).json({
        success: false,
        renamedFiles: [],
        error: error instanceof Error ? error.message : 'Failed to rename files',
      });
    }
  });

  return router;
}
