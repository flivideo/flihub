import { Router, Request, Response } from 'express';
import fs from 'fs-extra';
import path from 'path';
import type { FileInfo, Config, RenameRequest, RenameResponse, SuggestedNaming, ProjectInfo, RecordingFile } from '../../../shared/types.js';
import { expandPath } from '../utils/pathUtils.js';
import { getProjectPaths } from '../../../shared/paths.js';
import { getVideoDuration } from '../utils/videoDuration.js';
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
  queueTranscription?: (videoPath: string) => void  // FR-30: Auto-transcribe on rename
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
      const paths = getProjectPaths(expandPath(config.projectDirectory));

      // Check if directory exists
      if (!await fs.pathExists(paths.recordings)) {
        res.json({
          chapter: '01',
          sequence: '1',
          name: 'intro',
          existingFiles: [],
        } as SuggestedNaming);
        return;
      }

      // Read all .mov files in recordings directory
      const files = await fs.readdir(paths.recordings);
      const movFiles = files.filter(f => f.endsWith('.mov')).sort();

      const suggestion = calculateSuggested(movFiles);
      res.json({ ...suggestion, existingFiles: movFiles } as SuggestedNaming);
    } catch (error) {
      console.error('Error calculating suggested naming:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to calculate suggested naming',
      });
    }
  });

  // POST /api/config - Update configuration
  // NFR-6: Using projectDirectory instead of targetDirectory
  router.post('/config', (req: Request, res: Response) => {
    const { watchDirectory, projectDirectory } = req.body;
    const updatedConfig = updateConfig({ watchDirectory, projectDirectory });
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
  router.get('/recordings', async (_req: Request, res: Response) => {
    try {
      const paths = getProjectPaths(expandPath(config.projectDirectory));

      const recordings: RecordingFile[] = [];

      // Known tags that can appear at the end of filenames
      const knownTags = new Set((config.availableTags || []).map(t => t.toLowerCase()));
      // Also check suggestTags from commonNames
      for (const cn of config.commonNames || []) {
        for (const tag of cn.suggestTags || []) {
          knownTags.add(tag.toLowerCase());
        }
      }

      // Helper to parse filename and get file info
      // Only returns files that match naming convention (chapter-sequence-name)
      const processFile = async (filePath: string, folder: 'recordings' | 'safe'): Promise<RecordingFile | null> => {
        const filename = path.basename(filePath);
        if (!filename.endsWith('.mov')) return null;

        const parsed = parseRecordingFilename(filename);

        // Only include files that match the naming convention
        if (!parsed) return null;

        const stats = await fs.stat(filePath);

        // FR-36: Get video duration
        const duration = await getVideoDuration(filePath);

        // Extract tags - only known tags at the end of the name
        const nameParts = parsed.name.split('-');
        const tags: string[] = [];

        // Work backwards to find known tags
        while (nameParts.length > 1 && knownTags.has(nameParts[nameParts.length - 1].toLowerCase())) {
          tags.unshift(nameParts.pop()!);
        }

        const name = nameParts.join('-');

        return {
          filename,
          path: filePath,
          size: stats.size,
          timestamp: stats.mtime.toISOString(),
          duration: duration ?? undefined,
          chapter: parsed.chapter,
          sequence: parsed.sequence || '1',
          name,
          tags,
          folder,
        };
      };

      // Read recordings folder (exclude directories like -safe) - FR-57: parallel processing
      if (await fs.pathExists(paths.recordings)) {
        const entries = await fs.readdir(paths.recordings, { withFileTypes: true });
        const results = await Promise.all(
          entries
            .filter(e => e.isFile())
            .map(e => processFile(path.join(paths.recordings, e.name), 'recordings'))
        );
        recordings.push(...results.filter((r): r is NonNullable<typeof r> => r !== null));
      }

      // Read -safe folder if it exists (inside recordings/) - FR-57: parallel processing
      if (await fs.pathExists(paths.safe)) {
        const entries = await fs.readdir(paths.safe, { withFileTypes: true });
        const results = await Promise.all(
          entries
            .filter(e => e.isFile())
            .map(e => processFile(path.join(paths.safe, e.name), 'safe'))
        );
        recordings.push(...results.filter((r): r is NonNullable<typeof r> => r !== null));
      }

      // Sort by chapter (numeric), then sequence (numeric), then timestamp
      recordings.sort((a, b) => {
        const chapterCompare = parseChapterNum(a.chapter) - parseChapterNum(b.chapter);
        if (chapterCompare !== 0) return chapterCompare;
        const seqCompare = parseSequenceNum(a.sequence) - parseSequenceNum(b.sequence);
        if (seqCompare !== 0) return seqCompare;
        return a.timestamp.localeCompare(b.timestamp);
      });

      res.json({ recordings });
    } catch (error) {
      console.error('Error listing recordings:', error);
      res.status(500).json({
        recordings: [],
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

  // FR-10: GET /api/projects - List available AppyDave video projects
  router.get('/projects', async (_req: Request, res: Response) => {
    try {
      const projectsRoot = expandPath('~/dev/video-projects/v-appydave');

      // Check if directory exists
      if (!await fs.pathExists(projectsRoot)) {
        res.json({ projects: [], error: 'Projects directory not found' });
        return;
      }

      // Read all directories in the projects root
      // Bug fix: Filter out system folders (hidden, -trash, -safe, archived)
      const entries = await fs.readdir(projectsRoot, { withFileTypes: true });
      const projectDirs = entries.filter(e =>
        e.isDirectory() &&
        !e.name.startsWith('.') &&     // hidden folders
        !e.name.startsWith('-') &&     // system folders (-trash, -safe)
        e.name !== 'archived'          // archive folder
      );

      const projects: ProjectInfo[] = await Promise.all(
        projectDirs.map(async (dir) => {
          const projectPath = path.join(projectsRoot, dir.name);
          const recordingsPath = path.join(projectPath, 'recordings');

          let fileCount = 0;
          let lastModified = new Date(0).toISOString();

          // Check if recordings folder exists
          if (await fs.pathExists(recordingsPath)) {
            const files = await fs.readdir(recordingsPath);
            const movFiles = files.filter(f => f.endsWith('.mov'));
            fileCount = movFiles.length;

            // Get most recent file modification time
            for (const file of movFiles) {
              const filePath = path.join(recordingsPath, file);
              const stats = await fs.stat(filePath);
              if (stats.mtime.toISOString() > lastModified) {
                lastModified = stats.mtime.toISOString();
              }
            }
          }

          return {
            code: dir.name,
            path: projectPath,
            fileCount,
            lastModified: fileCount > 0 ? lastModified : '',
          };
        })
      );

      // Sort by project code (which typically includes a number prefix like b72-)
      projects.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));

      res.json({ projects });
    } catch (error) {
      console.error('Error listing projects:', error);
      res.status(500).json({
        projects: [],
        error: error instanceof Error ? error.message : 'Failed to list projects',
      });
    }
  });

  // FR-15: POST /api/recordings/safe - Move file(s) to -safe folder
  // NFR-6: Using projectDirectory with getProjectPaths()
  router.post('/recordings/safe', async (req: Request, res: Response) => {
    const { files, chapter } = req.body;

    if (!files && !chapter) {
      res.status(400).json({ success: false, error: 'Either files array or chapter is required' });
      return;
    }

    try {
      const paths = getProjectPaths(expandPath(config.projectDirectory));

      // Ensure -safe directory exists
      await fs.ensureDir(paths.safe);

      let filesToMove: string[] = [];

      if (files && Array.isArray(files)) {
        // Move specific files
        filesToMove = files;
      } else if (chapter) {
        // Move all files in the chapter
        const entries = await fs.readdir(paths.recordings, { withFileTypes: true });
        filesToMove = entries
          .filter(e => e.isFile() && e.name.endsWith('.mov'))
          .map(e => e.name)
          .filter(name => {
            const parsed = parseRecordingFilename(name);
            return parsed && parsed.chapter === chapter;
          });
      }

      const moved: string[] = [];
      const errors: string[] = [];

      for (const filename of filesToMove) {
        const sourcePath = path.join(paths.recordings, filename);
        const destPath = path.join(paths.safe, filename);

        try {
          if (await fs.pathExists(sourcePath)) {
            await fs.move(sourcePath, destPath, { overwrite: true });
            moved.push(filename);
            console.log(`Moved to safe: ${filename}`);
          } else {
            errors.push(`File not found: ${filename}`);
          }
        } catch (err) {
          errors.push(`Failed to move ${filename}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }

      res.json({
        success: errors.length === 0,
        moved,
        count: moved.length,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error) {
      console.error('Error moving to safe:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to move files to safe',
      });
    }
  });

  // FR-15: POST /api/recordings/restore - Restore file(s) from -safe folder
  // NFR-6: Using projectDirectory with getProjectPaths()
  router.post('/recordings/restore', async (req: Request, res: Response) => {
    const { files } = req.body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      res.status(400).json({ success: false, error: 'Files array is required' });
      return;
    }

    try {
      const paths = getProjectPaths(expandPath(config.projectDirectory));

      const restored: string[] = [];
      const errors: string[] = [];

      for (const filename of files) {
        const sourcePath = path.join(paths.safe, filename);
        const destPath = path.join(paths.recordings, filename);

        try {
          // Check if file already exists in recordings
          if (await fs.pathExists(destPath)) {
            errors.push(`File already exists in recordings: ${filename}`);
            continue;
          }

          if (await fs.pathExists(sourcePath)) {
            await fs.move(sourcePath, destPath);
            restored.push(filename);
            console.log(`Restored from safe: ${filename}`);
          } else {
            errors.push(`File not found in safe: ${filename}`);
          }
        } catch (err) {
          errors.push(`Failed to restore ${filename}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
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

  // FR-47: POST /api/recordings/rename-chapter - Rename the label for all files in a chapter
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

      // Find all files matching this chapter-label pattern
      const filesToRename: { oldPath: string; newPath: string }[] = [];

      // Helper to process files in a directory
      const processDirectory = async (dirPath: string) => {
        if (!await fs.pathExists(dirPath)) return;

        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isFile()) continue;

          const filename = entry.name;
          const isMovFile = filename.endsWith('.mov');
          const isTxtFile = filename.endsWith('.txt');

          if (!isMovFile && !isTxtFile) continue;

          // Parse the filename
          const baseName = filename.replace(/\.(mov|txt)$/, '');
          const parsed = parseRecordingFilename(baseName + '.mov');

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
          const ext = isMovFile ? '.mov' : '.txt';
          const newFilename = buildRecordingFilename(parsed.chapter, parsed.sequence, newLabel, fileTags).replace('.mov', ext);

          // Handle chapter transcript suffix (e.g., 04-chapter.txt)
          const isChapterTranscript = filename.endsWith('-chapter.txt');
          const finalNewFilename = isChapterTranscript
            ? newFilename.replace('.txt', '-chapter.txt')
            : newFilename;

          filesToRename.push({
            oldPath: path.join(dirPath, filename),
            newPath: path.join(dirPath, finalNewFilename),
          });
        }
      };

      // Process recordings folder
      await processDirectory(paths.recordings);

      // Process -safe folder
      await processDirectory(paths.safe);

      // Process transcripts folder
      await processDirectory(paths.transcripts);

      if (filesToRename.length === 0) {
        res.status(404).json({
          success: false,
          renamedFiles: [],
          error: 'No files found to rename',
        });
        return;
      }

      // Check for conflicts
      for (const { newPath } of filesToRename) {
        if (await fs.pathExists(newPath)) {
          res.status(409).json({
            success: false,
            renamedFiles: [],
            error: `Target file already exists: ${path.basename(newPath)}`,
          });
          return;
        }
      }

      // Perform all renames
      const renamedFiles: string[] = [];
      for (const { oldPath, newPath } of filesToRename) {
        await fs.rename(oldPath, newPath);
        renamedFiles.push(path.basename(newPath));
        console.log(`Renamed: ${path.basename(oldPath)} -> ${path.basename(newPath)}`);
      }

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
