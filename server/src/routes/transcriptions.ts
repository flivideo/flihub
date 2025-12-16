// FR-30: Transcription routes for video-to-text using Whisper
import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs-extra';
import { spawn, ChildProcess } from 'child_process';
import type { Server } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents, TranscriptionJob, TranscriptionStatus, Config } from '../../../shared/types.js';
import { getProjectPaths } from '../../../shared/paths.js';
import { expandPath } from '../utils/pathUtils.js';
import { getVideoDuration } from '../utils/videoDuration.js';

// In-memory state
let queue: TranscriptionJob[] = [];
let activeJob: TranscriptionJob | null = null;
let recentJobs: TranscriptionJob[] = [];  // Keep last 5
let activeProcess: ChildProcess | null = null;

// Config (could move to server config.json in future)
const WHISPER_PYTHON = '~/.pyenv/versions/3.11.12/bin/python';
const WHISPER_MODEL = 'medium';
const WHISPER_LANGUAGE = 'en';
const PROJECTS_ROOT = '~/dev/video-projects/v-appydave';

function generateJobId(): string {
  return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function createTranscriptionRoutes(
  getConfig: () => Config,
  io: Server<ClientToServerEvents, ServerToClientEvents>
) {
  const router = Router();

  // Get transcripts directory path
  function getTranscriptsDir(): string {
    const config = getConfig();
    const paths = getProjectPaths(expandPath(config.projectDirectory));
    return paths.transcripts;
  }

  // Check if transcript exists for a video
  // FR-74: Returns path only if BOTH .txt and .srt exist (complete transcript set)
  function getTranscriptPath(videoFilename: string): string | null {
    const transcriptsDir = getTranscriptsDir();
    const baseName = path.basename(videoFilename, path.extname(videoFilename));
    const txtPath = path.join(transcriptsDir, `${baseName}.txt`);
    const srtPath = path.join(transcriptsDir, `${baseName}.srt`);
    // Both files must exist for transcript to be considered complete
    return (fs.existsSync(txtPath) && fs.existsSync(srtPath)) ? txtPath : null;
  }

  // FR-92: Check if ANY transcript file exists (for skip logic)
  // Only requires .txt - older transcripts may not have .srt
  function hasTranscriptFile(videoFilename: string): boolean {
    const transcriptsDir = getTranscriptsDir();
    const baseName = path.basename(videoFilename, path.extname(videoFilename));
    const txtPath = path.join(transcriptsDir, `${baseName}.txt`);
    return fs.existsSync(txtPath);
  }

  // Get status for a specific video
  function getStatusForVideo(videoFilename: string): TranscriptionStatus {
    // Check if complete
    if (getTranscriptPath(videoFilename)) return 'complete';

    // Check if active
    if (activeJob?.videoFilename === videoFilename) return 'transcribing';

    // Check if queued
    if (queue.some(j => j.videoFilename === videoFilename)) return 'queued';

    // Check if failed recently
    const recent = recentJobs.find(j => j.videoFilename === videoFilename);
    if (recent?.status === 'error') return 'error';

    return 'none';
  }

  // Process next job in queue
  function processNextJob(): void {
    if (activeJob || queue.length === 0) return;

    activeJob = queue.shift()!;
    activeJob.status = 'transcribing';
    activeJob.startedAt = new Date().toISOString();
    activeJob.streamedText = '';

    io.emit('transcription:started', {
      jobId: activeJob.jobId,
      videoPath: activeJob.videoPath,
    });

    const transcriptsDir = getTranscriptsDir();
    fs.ensureDirSync(transcriptsDir);

    const pythonPath = expandPath(WHISPER_PYTHON);
    const videoPath = activeJob.videoPath;

    console.log(`Starting transcription: ${activeJob.videoFilename}`);
    console.log(`Using Python: ${pythonPath}`);
    console.log(`Output dir: ${transcriptsDir}`);

    // FR-74: Output both TXT (plain text) and SRT (timed subtitles) formats
    activeProcess = spawn(pythonPath, [
      '-m', 'whisper',
      videoPath,
      '--model', WHISPER_MODEL,
      '--language', WHISPER_LANGUAGE,
      '--output_format', 'txt',
      '--output_format', 'srt',
      '--output_dir', transcriptsDir,
    ]);

    const currentJobId = activeJob.jobId;

    activeProcess.stdout?.on('data', (data) => {
      const text = data.toString();
      if (activeJob && activeJob.jobId === currentJobId) {
        activeJob.streamedText = (activeJob.streamedText || '') + text;
        io.emit('transcription:progress', { jobId: currentJobId, text });
      }
    });

    activeProcess.stderr?.on('data', (data) => {
      // Whisper outputs progress info to stderr
      const text = data.toString();
      console.log(`Whisper: ${text}`);
      if (activeJob && activeJob.jobId === currentJobId) {
        io.emit('transcription:progress', { jobId: currentJobId, text });
      }
    });

    activeProcess.on('close', (code) => {
      if (!activeJob || activeJob.jobId !== currentJobId) return;

      activeJob.completedAt = new Date().toISOString();

      if (code === 0) {
        activeJob.status = 'complete';
        const transcriptPath = getTranscriptPath(activeJob.videoFilename);
        console.log(`Transcription complete: ${activeJob.videoFilename}`);
        io.emit('transcription:complete', {
          jobId: activeJob.jobId,
          videoPath: activeJob.videoPath,
          transcriptPath: transcriptPath || '',
        });
      } else {
        activeJob.status = 'error';
        activeJob.error = `Whisper exited with code ${code}`;
        console.error(`Transcription failed: ${activeJob.videoFilename} (code ${code})`);
        io.emit('transcription:error', {
          jobId: activeJob.jobId,
          videoPath: activeJob.videoPath,
          error: activeJob.error,
        });
      }

      // Move to recent
      recentJobs.unshift(activeJob);
      recentJobs = recentJobs.slice(0, 5);  // Keep last 5

      activeJob = null;
      activeProcess = null;

      // Process next
      processNextJob();
    });

    activeProcess.on('error', (err) => {
      console.error('Failed to start Whisper process:', err);
      if (activeJob && activeJob.jobId === currentJobId) {
        activeJob.status = 'error';
        activeJob.error = `Failed to start Whisper: ${err.message}`;
        activeJob.completedAt = new Date().toISOString();

        io.emit('transcription:error', {
          jobId: activeJob.jobId,
          videoPath: activeJob.videoPath,
          error: activeJob.error,
        });

        recentJobs.unshift(activeJob);
        recentJobs = recentJobs.slice(0, 5);

        activeJob = null;
        activeProcess = null;
        processNextJob();
      }
    });
  }

  // Queue a transcription job (exported for use by rename route)
  async function queueTranscription(videoPath: string): Promise<TranscriptionJob | null> {
    const videoFilename = path.basename(videoPath);

    // FR-92: Skip if transcript already exists (only check .txt, not .srt)
    if (hasTranscriptFile(videoFilename)) {
      console.log(`Transcript already exists for ${videoFilename}, skipping`);
      return null;
    }

    // Skip if already queued or active
    if (activeJob?.videoFilename === videoFilename) {
      console.log(`${videoFilename} is already being transcribed`);
      return activeJob;
    }
    const existing = queue.find(j => j.videoFilename === videoFilename);
    if (existing) {
      console.log(`${videoFilename} is already in queue`);
      return existing;
    }

    // FR-36: Get file size and duration
    let size: number | undefined;
    let duration: number | undefined;
    try {
      const stats = await fs.stat(videoPath);
      size = stats.size;
      duration = (await getVideoDuration(videoPath)) ?? undefined;
    } catch (err) {
      console.warn(`Could not get file info for ${videoFilename}:`, err);
    }

    const job: TranscriptionJob = {
      jobId: generateJobId(),
      videoPath,
      videoFilename,
      status: 'queued',
      duration,
      size,
      queuedAt: new Date().toISOString(),
    };

    queue.push(job);
    console.log(`Queued transcription: ${videoFilename} (position ${queue.length})`);

    io.emit('transcription:queued', {
      jobId: job.jobId,
      videoPath: job.videoPath,
      position: queue.length,
    });

    // Start processing if nothing active
    processNextJob();

    return job;
  }

  // === API Routes ===

  // GET /api/transcriptions - Get all transcription state
  router.get('/', (_req: Request, res: Response) => {
    res.json({
      active: activeJob,
      queue: queue,
      recent: recentJobs,
    });
  });

  // GET /api/transcriptions/status/:filename - Get status for specific file
  router.get('/status/:filename', (req: Request, res: Response) => {
    const { filename } = req.params;
    const status = getStatusForVideo(filename);
    const transcriptPath = getTranscriptPath(filename);

    res.json({
      filename,
      status,
      transcriptPath,
    });
  });

  // GET /api/transcriptions/transcript/:filename - Get transcript content
  router.get('/transcript/:filename', async (req: Request, res: Response) => {
    const { filename } = req.params;
    const baseName = path.basename(filename, path.extname(filename));
    const transcriptFilename = `${baseName}.txt`;
    const transcriptsDir = getTranscriptsDir();
    const transcriptPath = path.join(transcriptsDir, transcriptFilename);

    try {
      if (!fs.existsSync(transcriptPath)) {
        res.status(404).json({ success: false, error: 'Transcript not found' });
        return;
      }
      const content = await fs.readFile(transcriptPath, 'utf-8');
      res.json({ filename: transcriptFilename, content });
    } catch (error) {
      console.error('Error reading transcript:', error);
      res.status(500).json({ success: false, error: 'Failed to read transcript' });
    }
  });

  // FR-48: DELETE /api/transcriptions/transcript/:filename - Delete orphaned transcript
  // Supports optional ?project=code query param to delete from a specific project
  router.delete('/transcript/:filename', async (req: Request, res: Response) => {
    const { filename } = req.params;
    const { project } = req.query;
    const baseName = path.basename(filename, path.extname(filename));
    const transcriptFilename = `${baseName}.txt`;

    // Determine transcripts directory: use project param if provided, else current project
    let transcriptsDir: string;
    if (project && typeof project === 'string') {
      const projectsDir = expandPath(PROJECTS_ROOT);
      const projectPath = path.join(projectsDir, project);
      const paths = getProjectPaths(projectPath);
      transcriptsDir = paths.transcripts;
    } else {
      transcriptsDir = getTranscriptsDir();
    }

    const transcriptPath = path.join(transcriptsDir, transcriptFilename);

    try {
      if (!fs.existsSync(transcriptPath)) {
        res.status(404).json({ success: false, error: 'Transcript not found' });
        return;
      }

      await fs.remove(transcriptPath);
      console.log(`Deleted orphaned transcript: ${transcriptFilename}${project ? ` (project: ${project})` : ''}`);
      res.json({ success: true, filename: transcriptFilename, deleted: true });
    } catch (error) {
      console.error('Error deleting transcript:', error);
      res.status(500).json({ success: false, error: 'Failed to delete transcript' });
    }
  });

  // POST /api/transcriptions/queue - Manually queue a transcription
  router.post('/queue', async (req: Request, res: Response) => {
    const { videoPath } = req.body;

    if (!videoPath) {
      res.status(400).json({ success: false, error: 'videoPath required' });
      return;
    }

    const expandedPath = expandPath(videoPath);
    if (!fs.existsSync(expandedPath)) {
      res.status(404).json({ success: false, error: 'Video file not found' });
      return;
    }

    const job = await queueTranscription(expandedPath);
    res.json({ success: true, job });
  });

  // Enhancement B: GET /api/transcriptions/chapter-status/:chapter - Check chapter transcript status
  router.get('/chapter-status/:chapter', async (req: Request, res: Response) => {
    const { chapter } = req.params;
    const transcriptsDir = getTranscriptsDir();

    try {
      // Check if combined chapter transcript exists
      const combinedPath = path.join(transcriptsDir, `${chapter}-chapter.txt`);
      const combinedExists = fs.existsSync(combinedPath);

      // Count available individual transcripts for this chapter
      let transcriptCount = 0;
      if (fs.existsSync(transcriptsDir)) {
        const files = await fs.readdir(transcriptsDir);
        // Match files like "07-1-intro.txt", "07-2-demo.txt" but not "07-chapter.txt"
        const chapterPattern = new RegExp(`^${chapter}-\\d+-.*\\.txt$`);
        transcriptCount = files.filter(f => chapterPattern.test(f)).length;
      }

      res.json({
        chapter,
        combinedExists,
        combinedPath: combinedExists ? combinedPath : null,
        transcriptCount,
      });
    } catch (error) {
      console.error('Error checking chapter status:', error);
      res.status(500).json({ success: false, error: 'Failed to check chapter status' });
    }
  });

  // Enhancement B: POST /api/transcriptions/combine-chapter - Combine all chapter transcripts
  router.post('/combine-chapter', async (req: Request, res: Response) => {
    const { chapter } = req.body;

    if (!chapter) {
      res.status(400).json({ success: false, error: 'chapter required' });
      return;
    }

    const transcriptsDir = getTranscriptsDir();

    try {
      // Ensure transcripts directory exists
      if (!fs.existsSync(transcriptsDir)) {
        res.status(404).json({ success: false, error: 'No transcripts directory found' });
        return;
      }

      // Find all transcript files for this chapter
      const files = await fs.readdir(transcriptsDir);
      // Match files like "07-1-intro.txt" but not "07-chapter.txt"
      const chapterPattern = new RegExp(`^${chapter}-(\\d+)-(.+)\\.txt$`);
      const transcriptFiles = files
        .filter(f => chapterPattern.test(f))
        .sort((a, b) => {
          // Sort by sequence number
          const seqA = parseInt(a.match(chapterPattern)?.[1] || '0', 10);
          const seqB = parseInt(b.match(chapterPattern)?.[1] || '0', 10);
          return seqA - seqB;
        });

      if (transcriptFiles.length === 0) {
        res.status(404).json({ success: false, error: 'No transcripts found for this chapter' });
        return;
      }

      // Build combined content - just content with blank lines between
      const parts: string[] = [];
      for (const filename of transcriptFiles) {
        const filePath = path.join(transcriptsDir, filename);
        const content = await fs.readFile(filePath, 'utf-8');
        parts.push(content.trim());
      }

      const combinedContent = parts.join('\n\n');
      const combinedPath = path.join(transcriptsDir, `${chapter}-chapter.txt`);

      // Write combined file
      await fs.writeFile(combinedPath, combinedContent, 'utf-8');

      console.log(`Created combined transcript: ${chapter}-chapter.txt (${transcriptFiles.length} files)`);

      res.json({
        success: true,
        filename: `${chapter}-chapter.txt`,
        path: combinedPath,
        fileCount: transcriptFiles.length,
        files: transcriptFiles,
      });
    } catch (error) {
      console.error('Error combining chapter transcripts:', error);
      res.status(500).json({ success: false, error: 'Failed to combine transcripts' });
    }
  });

  // FR-30 Enhancement: POST /api/transcriptions/queue-all - Queue transcription for all videos
  // FR-83: Also supports shadow files (.mp4) when real recordings don't exist
  router.post('/queue-all', async (req: Request, res: Response) => {
    const { scope, chapter } = req.body;

    if (!scope || !['project', 'chapter'].includes(scope)) {
      res.status(400).json({ success: false, error: 'scope required: "project" or "chapter"' });
      return;
    }

    if (scope === 'chapter' && !chapter) {
      res.status(400).json({ success: false, error: 'chapter required when scope is "chapter"' });
      return;
    }

    const config = getConfig();
    const projectPath = expandPath(config.projectDirectory);
    const projectPaths = getProjectPaths(projectPath);

    try {
      // FR-83: Build unified map of videos (real takes precedence over shadow)
      // Key: baseName, Value: { path, isShadow }
      const videoMap = new Map<string, { path: string; isShadow: boolean }>();

      // First, add shadow files (will be overwritten by real files)
      const shadowDirs = [
        { dir: path.join(projectPath, 'recording-shadows'), folder: 'recordings' },
        { dir: path.join(projectPath, 'recording-shadows', '-safe'), folder: 'safe' },
      ];

      for (const { dir } of shadowDirs) {
        if (fs.existsSync(dir)) {
          const files = await fs.readdir(dir);
          for (const file of files) {
            if (!file.match(/\.mp4$/i)) continue;

            const baseName = file.replace(/\.mp4$/i, '');

            // Filter by chapter if scope is 'chapter'
            if (scope === 'chapter') {
              const match = baseName.match(/^(\d{2})-/);
              if (!match || match[1] !== chapter) continue;
            }

            videoMap.set(baseName, { path: path.join(dir, file), isShadow: true });
          }
        }
      }

      // Then, add real recordings (overwrite shadows)
      const realDirs = [projectPaths.recordings, projectPaths.safe];

      for (const dir of realDirs) {
        if (fs.existsSync(dir)) {
          const files = await fs.readdir(dir);
          for (const file of files) {
            if (!file.endsWith('.mov')) continue;

            const baseName = file.replace('.mov', '');

            // Filter by chapter if scope is 'chapter'
            if (scope === 'chapter') {
              const match = baseName.match(/^(\d{2})-/);
              if (!match || match[1] !== chapter) continue;
            }

            // Real file overwrites shadow
            videoMap.set(baseName, { path: path.join(dir, file), isShadow: false });
          }
        }
      }

      // Convert map to array of paths
      const videoFiles = Array.from(videoMap.values()).map(v => v.path);

      // Queue transcription for each file that doesn't have a transcript
      const queued: string[] = [];
      const skipped: string[] = [];

      for (const videoPath of videoFiles) {
        const job = await queueTranscription(videoPath);
        if (job) {
          queued.push(path.basename(videoPath));
        } else {
          skipped.push(path.basename(videoPath));
        }
      }

      console.log(`Queue-all (${scope}${chapter ? ` chapter ${chapter}` : ''}): queued ${queued.length}, skipped ${skipped.length}`);

      res.json({
        success: true,
        scope,
        chapter: chapter || null,
        queued,
        skipped,
        queuedCount: queued.length,
        skippedCount: skipped.length,
      });
    } catch (error) {
      console.error('Error queuing all transcriptions:', error);
      res.status(500).json({ success: false, error: 'Failed to queue transcriptions' });
    }
  });

  // FR-92: GET /api/transcriptions/pending-count - Count files needing transcription
  router.get('/pending-count', async (_req: Request, res: Response) => {
    const config = getConfig();
    const projectPath = expandPath(config.projectDirectory);
    const projectPaths = getProjectPaths(projectPath);

    try {
      // FR-92: Build unified map of videos (same logic as queue-all)
      const videoMap = new Map<string, { path: string; isShadow: boolean }>();

      // First, add shadow files
      const shadowDirs = [
        { dir: path.join(projectPath, 'recording-shadows'), folder: 'recordings' },
        { dir: path.join(projectPath, 'recording-shadows', '-safe'), folder: 'safe' },
      ];

      for (const { dir } of shadowDirs) {
        if (fs.existsSync(dir)) {
          const files = await fs.readdir(dir);
          for (const file of files) {
            if (!file.match(/\.mp4$/i)) continue;
            const baseName = file.replace(/\.mp4$/i, '');
            videoMap.set(baseName, { path: path.join(dir, file), isShadow: true });
          }
        }
      }

      // Then, add real recordings (overwrite shadows)
      const realDirs = [projectPaths.recordings, projectPaths.safe];

      for (const dir of realDirs) {
        if (fs.existsSync(dir)) {
          const files = await fs.readdir(dir);
          for (const file of files) {
            if (!file.endsWith('.mov')) continue;
            const baseName = file.replace('.mov', '');
            videoMap.set(baseName, { path: path.join(dir, file), isShadow: false });
          }
        }
      }

      // Count files without transcripts
      let pendingCount = 0;
      for (const [baseName] of videoMap) {
        if (!hasTranscriptFile(`${baseName}.mov`)) {
          pendingCount++;
        }
      }

      res.json({
        pendingCount,
        totalCount: videoMap.size,
      });
    } catch (error) {
      console.error('Error counting pending transcriptions:', error);
      res.status(500).json({ success: false, error: 'Failed to count pending transcriptions' });
    }
  });

  // FR-55: GET /api/transcriptions/combined - Get combined transcript for entire video
  router.get('/combined', async (_req: Request, res: Response) => {
    const transcriptsDir = getTranscriptsDir();

    try {
      if (!fs.existsSync(transcriptsDir)) {
        res.json({ chapters: [] });
        return;
      }

      // Find all transcript files (not chapter-combined files)
      const files = await fs.readdir(transcriptsDir);
      // Match files like "07-1-intro.txt" but not "07-chapter.txt"
      const transcriptPattern = /^(\d{1,2})-(\d+)-(.+)\.txt$/;

      // Group by chapter
      const chapterMap = new Map<string, { sequence: number; name: string; content: string }[]>();

      for (const filename of files) {
        const match = filename.match(transcriptPattern);
        if (!match) continue;

        const chapter = match[1].padStart(2, '0');
        const sequence = parseInt(match[2], 10);
        const name = match[3];

        const filePath = path.join(transcriptsDir, filename);
        const content = await fs.readFile(filePath, 'utf-8');

        if (!chapterMap.has(chapter)) {
          chapterMap.set(chapter, []);
        }
        chapterMap.get(chapter)!.push({ sequence, name, content: content.trim() });
      }

      // Sort chapters and build response
      const sortedChapters = Array.from(chapterMap.entries())
        .sort(([a], [b]) => a.localeCompare(b));

      const chapters = sortedChapters.map(([chapter, transcripts]) => {
        // Sort by sequence within chapter
        transcripts.sort((a, b) => a.sequence - b.sequence);

        // Get title from first sequence
        const title = transcripts[0]?.name || '';

        // Combine all transcript content
        const content = transcripts.map(t => t.content).join('\n\n');

        return { chapter, title, content };
      });

      res.json({ chapters });
    } catch (error) {
      console.error('Error building combined transcript:', error);
      res.status(500).json({ success: false, error: 'Failed to build combined transcript' });
    }
  });

  // Export queueTranscription for use by rename route
  return { router, queueTranscription };
}
