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
import { appendTelemetryEntry } from '../utils/telemetry.js';

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

// FR-94: Get base filename without extension for consistent comparison
// Both .mov and .mp4 files with same base name should be treated as the same recording
function getBaseName(filename: string): string {
  return path.basename(filename, path.extname(filename));
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

  // Check if transcript exists for a video (for status checks)
  // FR-94: .txt is the primary format - only .txt counts as "complete"
  function getTranscriptPath(videoFilename: string): string | null {
    const transcriptsDir = getTranscriptsDir();
    const baseName = path.basename(videoFilename, path.extname(videoFilename));
    const txtPath = path.join(transcriptsDir, `${baseName}.txt`);
    return fs.existsSync(txtPath) ? txtPath : null;
  }

  // FR-92: Check if transcript file exists (for skip logic)
  // FR-94: .txt is the primary format - only .txt counts as "transcribed"
  function hasTranscriptFile(videoFilename: string): boolean {
    const transcriptsDir = getTranscriptsDir();
    const baseName = path.basename(videoFilename, path.extname(videoFilename));
    const txtPath = path.join(transcriptsDir, `${baseName}.txt`);
    return fs.existsSync(txtPath);
  }

  // Get status for a specific video
  // FR-94: Uses base name comparison to handle both .mov and .mp4 extensions
  function getStatusForVideo(videoFilename: string): TranscriptionStatus {
    const baseName = getBaseName(videoFilename);

    // Check if complete
    if (getTranscriptPath(videoFilename)) return 'complete';

    // Check if active (compare base names)
    if (activeJob && getBaseName(activeJob.videoFilename) === baseName) return 'transcribing';

    // Check if queued (compare base names)
    if (queue.some(j => getBaseName(j.videoFilename) === baseName)) return 'queued';

    // Check if failed recently (compare base names)
    const recent = recentJobs.find(j => getBaseName(j.videoFilename) === baseName);
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

    // FR-99: Capture timing data for telemetry
    const transcriptionStartTime = Date.now();
    let videoFileSizeBytes = 0;
    try {
      const stats = fs.statSync(videoPath);
      videoFileSizeBytes = stats.size;
    } catch {
      // File size unavailable, continue without it
    }

    // FR-74: Output TXT (plain text), SRT (timed subtitles), and JSON (word-level timestamps)
    // FR-98: Only generate needed formats - removed tsv and vtt (were unused)
    // Whisper accepts multiple formats as separate arguments after --output_format
    activeProcess = spawn(pythonPath, [
      '-m', 'whisper',
      videoPath,
      '--model', WHISPER_MODEL,
      '--language', WHISPER_LANGUAGE,
      '--output_format', 'txt', 'srt', 'json',
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

        // FR-99: Log telemetry data
        const transcriptionEndTime = Date.now();
        const transcriptionDurationSec = (transcriptionEndTime - transcriptionStartTime) / 1000;
        getVideoDuration(activeJob.videoPath).then(videoDuration => {
          appendTelemetryEntry({
            timestamp: new Date().toISOString(),
            filename: activeJob!.videoFilename,
            videoDurationSec: videoDuration ?? 0,
            transcriptionDurationSec,
            fileSizeBytes: videoFileSizeBytes,
          });
        }).catch(err => {
          console.error('Error getting video duration for telemetry:', err);
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

      // FR-94: Move to recent, deduping by base name first
      const completedBaseName = getBaseName(activeJob.videoFilename);
      recentJobs = recentJobs.filter(j => getBaseName(j.videoFilename) !== completedBaseName);
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

        // FR-94: Move to recent, deduping by base name first
        const errorBaseName = getBaseName(activeJob.videoFilename);
        recentJobs = recentJobs.filter(j => getBaseName(j.videoFilename) !== errorBaseName);
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
    const rawFilename = path.basename(videoPath);
    // FR-94: Normalize to base name for consistent comparison
    // This prevents duplicates when same recording is queued as .mov and .mp4
    const baseName = getBaseName(rawFilename);
    // Use normalized filename with .mov extension for display consistency
    const videoFilename = `${baseName}.mov`;

    // FR-92: Skip if transcript already exists (only check .txt, not .srt)
    if (hasTranscriptFile(videoFilename)) {
      console.log(`Transcript already exists for ${videoFilename}, skipping`);
      return null;
    }

    // FR-94: Skip if already queued or active (compare using base name)
    const activeBaseName = activeJob ? getBaseName(activeJob.videoFilename) : null;
    if (activeBaseName === baseName) {
      console.log(`${videoFilename} is already being transcribed`);
      return activeJob;
    }
    const existing = queue.find(j => getBaseName(j.videoFilename) === baseName);
    if (existing) {
      console.log(`${videoFilename} is already in queue`);
      return existing;
    }

    // FR-94: Skip if already in recent (prevents re-queuing just-completed jobs)
    const inRecent = recentJobs.find(j => getBaseName(j.videoFilename) === baseName);
    if (inRecent && inRecent.status === 'complete') {
      console.log(`${videoFilename} was recently transcribed, skipping`);
      return null;
    }

    // FR-36: Get file size and duration
    let size: number | undefined;
    let duration: number | undefined;
    try {
      const stats = await fs.stat(videoPath);
      size = stats.size;
      duration = (await getVideoDuration(videoPath)) ?? undefined;
    } catch (err) {
      console.warn(`Could not get file info for ${rawFilename}:`, err);
    }

    const job: TranscriptionJob = {
      jobId: generateJobId(),
      videoPath,
      videoFilename,  // FR-94: Now normalized to .mov extension
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
  // FR-94: Supports ?format=txt|srt query param, defaults to txt if available
  router.get('/transcript/:filename', async (req: Request, res: Response) => {
    const { filename } = req.params;
    const requestedFormat = req.query.format as string | undefined;
    const baseName = path.basename(filename, path.extname(filename));
    const transcriptsDir = getTranscriptsDir();

    const txtPath = path.join(transcriptsDir, `${baseName}.txt`);
    const srtPath = path.join(transcriptsDir, `${baseName}.srt`);

    const hasTxt = fs.existsSync(txtPath);
    const hasSrt = fs.existsSync(srtPath);

    if (!hasTxt && !hasSrt) {
      res.status(404).json({ success: false, error: 'Transcript not found' });
      return;
    }

    // Determine which format to return
    let transcriptPath: string;
    let transcriptFilename: string;
    let activeFormat: 'txt' | 'srt';

    if (requestedFormat === 'srt' && hasSrt) {
      transcriptPath = srtPath;
      transcriptFilename = `${baseName}.srt`;
      activeFormat = 'srt';
    } else if (requestedFormat === 'txt' && hasTxt) {
      transcriptPath = txtPath;
      transcriptFilename = `${baseName}.txt`;
      activeFormat = 'txt';
    } else if (hasTxt) {
      // Default to txt
      transcriptPath = txtPath;
      transcriptFilename = `${baseName}.txt`;
      activeFormat = 'txt';
    } else {
      // Fallback to srt
      transcriptPath = srtPath;
      transcriptFilename = `${baseName}.srt`;
      activeFormat = 'srt';
    }

    try {
      const content = await fs.readFile(transcriptPath, 'utf-8');
      res.json({
        filename: transcriptFilename,
        content,
        // FR-94: Include available formats for UI toggle
        formats: {
          txt: hasTxt,
          srt: hasSrt,
        },
        activeFormat,
      });
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
  // FR-94: Only transcribe real recordings, NOT shadow files (shadows are just low-res copies)
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
      // FR-94: Only scan real recordings - shadows should never be transcribed
      const videoMap = new Map<string, { path: string; isShadow: boolean }>();

      // Only scan real recordings (not shadows)
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
