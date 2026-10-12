// FR-30: Transcription routes for video-to-text using Whisper
import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs-extra';
import type { Server } from 'socket.io';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  TranscriptionJob,
  TranscriptionStatus,
  Config,
} from '../../../shared/types.js';
import { getProjectPaths, projectDirFromRecordingPath } from '../../../shared/paths.js';
import { expandPath, queryString } from '../utils/pathUtils.js';
import { getVideoDuration } from '../utils/videoDuration.js';
import { appendTelemetryEntry } from '../utils/telemetry.js';
import { isTranscriptFresh, readTranscriptInfo } from '../utils/transcriptFiles.js';
import {
  createFlitoolsClient,
  FlitoolsError,
  runFlitoolsJob,
  type FlitoolsClient,
  type FlitoolsJobView,
  type RunOptions,
} from '../utils/flitoolsClient.js';
import { transcriptionLanguageFor } from '../utils/transcriptionLanguage.js';
import {
  currentPathOf,
  getTakeRenames,
  hasEditGradeTranscript,
  onTakeRenamed,
  relocateTranscripts,
  setTakeRenames,
  takeKey,
  type TakeRename,
} from '../utils/transcriptFollow.js';

/** FliTools' background pass 2 for a take FliHub transcribed: watched so it lands under the take's current name. */
interface Pass2Watch {
  jobId: string; // FliTools edit-grade job
  path: string; // the recording path FliHub submitted
  since: number; // ms epoch of that submit — renames after it are followed
  retried?: boolean; // FliHub already re-asked for pass 2 at the current name once
}

export interface FollowOptions {
  /** Where the rename records and pass-2 watches survive a restart (null = memory only). */
  stateFile?: string | null;
  /** How often to ask FliTools about watched pass-2 jobs (0 = never on a timer; tests call checkPass2). */
  pass2PollMs?: number;
}


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
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  flitools: FlitoolsClient = createFlitoolsClient(), // B584: the suite's only transcriber
  runOptions: Pick<RunOptions, 'pollMs' | 'sleep'> = {},
  followOptions: FollowOptions = {}
) {
  const router = Router();

  // In-memory state (one per instance: production makes one; tests make their own)
  let queue: TranscriptionJob[] = [];
  let activeJob: TranscriptionJob | null = null;
  let recentJobs: TranscriptionJob[] = []; // Keep last 5
  let aborting = false; // set on shutdown: stop polling FliTools

  // === The job follows the take (2026-10-12) — see utils/transcriptFollow.ts ===
  const stateFile = followOptions.stateFile ?? null;
  let pass2Watches: Pass2Watch[] = [];
  if (stateFile) {
    try {
      const saved = fs.readJsonSync(stateFile) as { renames?: TakeRename[]; pass2?: Pass2Watch[] };
      setTakeRenames(saved.renames ?? []);
      pass2Watches = saved.pass2 ?? [];
    } catch {
      // first run, or unreadable: start empty
    }
  }
  function saveFollowState(): void {
    if (!stateFile) return;
    try {
      fs.writeJsonSync(stateFile, { renames: getTakeRenames(), pass2: pass2Watches }, { spaces: 2 });
    } catch (err) {
      console.error('[follow] could not save follow state:', err);
    }
  }

  // A rename re-targets the queued job and the active one (display/status) to the new name. The
  // active job's FliTools run keeps its submitted path; its result is mapped when it lands.
  const stopFollowing = onTakeRenamed((r) => {
    const retarget = (job: TranscriptionJob) => {
      if (takeKey(job.videoPath) !== takeKey(r.from)) return;
      job.videoPath = r.to;
      job.videoFilename = `${getBaseName(r.to)}.mov`;
      console.log(`[follow] ${job.status} job ${job.jobId} now follows ${path.basename(r.to)}`);
    };
    queue.forEach(retarget);
    if (activeJob) retarget(activeJob);
    saveFollowState();
  });

  // Get transcripts directory path (for current active project)
  function getTranscriptsDir(): string {
    const config = getConfig();
    const paths = getProjectPaths(expandPath(config.projectDirectory));
    return paths.transcripts;
  }

  // Derive transcripts directory from video path (cross-project safe)
  // This ensures we check/save in the correct project folder, not the active one
  function getTranscriptsDirFromVideoPath(videoPath: string): string {
    const projectDir = projectDirFromRecordingPath(videoPath);
    if (projectDir) {
      return getProjectPaths(projectDir).transcripts;
    }
    // Fallback to current config if path structure unexpected
    return getTranscriptsDir();
  }

  // Check if transcript exists for a video (for status checks)
  // FR-94: .txt is the primary format - only .txt counts as "complete"
  // 2026-09-25: never on name alone — a transcript older than its recording belongs to an earlier take
  function getTranscriptPath(videoFilename: string): string | null {
    const paths = getProjectPaths(expandPath(getConfig().projectDirectory));
    const baseName = path.basename(videoFilename, path.extname(videoFilename));
    const txtPath = path.join(paths.transcripts, `${baseName}.txt`);
    return isTranscriptFresh(txtPath, path.join(paths.recordings, `${baseName}.mov`))
      ? txtPath
      : null;
  }

  // FR-92: Check if transcript file exists (for skip logic)
  // FR-94: .txt is the primary format - only .txt counts as "transcribed"
  // BUGFIX: Now accepts optional videoPath to check in correct project folder
  function hasTranscriptFile(videoFilename: string, videoPath?: string): boolean {
    const transcriptsDir = videoPath
      ? getTranscriptsDirFromVideoPath(videoPath)
      : getTranscriptsDir();
    const baseName = path.basename(videoFilename, path.extname(videoFilename));
    const txtPath = path.join(transcriptsDir, `${baseName}.txt`);
    // 2026-09-25: never on name alone — a stale transcript is re-made, not attached
    const video =
      videoPath ??
      path.join(
        getProjectPaths(expandPath(getConfig().projectDirectory)).recordings,
        videoFilename
      );
    return isTranscriptFresh(txtPath, video);
  }

  // Get status for a specific video
  // FR-94: Uses base name comparison to handle both .mov and .mp4 extensions
  function getStatusForVideo(videoFilename: string): TranscriptionStatus {
    const baseName = getBaseName(videoFilename);

    // In-flight work wins over a transcript on disk: a forced redo (B584) is still running
    // while the old files are there. Check if active / queued (compare base names).
    if (activeJob && getBaseName(activeJob.videoFilename) === baseName) return 'transcribing';
    if (queue.some((j) => getBaseName(j.videoFilename) === baseName)) return 'queued';

    // Check if complete
    if (getTranscriptPath(videoFilename)) return 'complete';

    // Check if failed recently (compare base names)
    const recent = recentJobs.find((j) => getBaseName(j.videoFilename) === baseName);
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

    const job = activeJob;
    const currentJobId = job.jobId;
    const videoPath = job.videoPath; // what FliTools is given — results land under this name
    const submittedAt = Date.now();
    let requeuePath: string | null = null; // renamed mid-run and the run failed: redo at the new name
    // FR-109: Derive transcripts dir from video path, not current config
    const transcriptsDir = getTranscriptsDirFromVideoPath(videoPath);

    // FR-99: Capture timing data for telemetry
    const transcriptionStartTime = Date.now();
    const startTimestamp = new Date(transcriptionStartTime).toISOString();
    let videoFileSizeBytes = 0;
    try {
      videoFileSizeBytes = fs.statSync(videoPath).size;
    } catch {
      // File size unavailable, continue without it
    }

    console.log(`Starting transcription: ${job.videoFilename} via FliTools ${flitools.baseUrl}`);

    const finish = () => {
      // FR-94: Move to recent, deduping by base name first
      const doneBaseName = getBaseName(job.videoFilename);
      recentJobs = recentJobs.filter((j) => getBaseName(j.videoFilename) !== doneBaseName);
      recentJobs.unshift(job);
      recentJobs = recentJobs.slice(0, 5); // Keep last 5
      if (activeJob?.jobId === currentJobId) activeJob = null;
      if (requeuePath) {
        const again = requeuePath;
        requeuePath = null;
        void queueTranscription(again, { force: job.force }).catch((err) =>
          console.error(`[follow] could not re-queue ${again}:`, err)
        );
      }
      processNextJob();
    };

    // B584 (David, 2026-09-27): FliTools is the only transcriber. force_save = FliHub's consent as
    // owner of its old whisper output: FliTools moves it to <project>/-trash/<date>-pre-flitools/
    // only AT SAVE TIME, once a good transcript exists (never overwritten in place — orch ruling).
    // A failed job leaves the old transcript where it was; a FliTools-made file (e.g. FliCut's) is
    // refreshed, not binned.
    transcriptionLanguageFor(videoPath)
      .then((language) =>
        runFlitoolsJob(flitools, videoPath, {
          force: job.force,
          forceSave: true,
          language,
          ...runOptions,
          isAborted: () => aborting || activeJob?.jobId !== currentJobId,
          onProgress: (view) => {
            const text = `[FliTools] ${view.phase ?? view.status}${view.pct !== undefined ? ` ${view.pct}%` : ''}\n`;
            job.streamedText = text;
            io.emit('transcription:progress', { jobId: currentJobId, text });
          },
        })
      )
      .then(async (view) => {
        // Renamed while this ran: what FliTools saved under the submitted name moves to the current
        // one, and pass 2 is watched under the submitted path (currentPathOf maps it later).
        const current = currentPathOf(videoPath, submittedAt);
        const sha = view.result?.transcript?.source?.sha256 ?? null;
        if (current !== path.resolve(videoPath)) {
          await relocateTranscripts(videoPath, current, sha);
          job.videoPath = current;
          job.videoFilename = `${getBaseName(current)}.mov`;
          // Another take may hold the old name now: let it get its own transcript back (cache hit)
          if (await fs.pathExists(videoPath)) {
            void queueTranscription(videoPath).catch(() => undefined);
          }
        }
        const up = view.upgrade;
        if (up?.jobId && (up.status === 'queued' || up.status === 'running')) {
          watchPass2({ jobId: up.jobId, path: videoPath, since: submittedAt });
        }
        job.status = 'complete';
        job.completedAt = new Date().toISOString();
        job.health = view.health ?? view.result?.transcript?.health;
        const engine = view.result?.transcript?.engine;
        const transcriptPath =
          current !== path.resolve(videoPath)
            ? path.join(getTranscriptsDirFromVideoPath(current), `${getBaseName(current)}.txt`)
            : (view.result?.files?.txt ??
              path.join(transcriptsDir, `${getBaseName(job.videoFilename)}.txt`));
        if (view.result?.trashed?.length) {
          console.log(
            `[transcription] FliTools moved ${view.result.trashed.length} old whisper file(s) of ${job.videoFilename} to -trash`
          );
        }
        console.log(
          `Transcription complete: ${job.videoFilename} (${engine?.name ?? 'flitools'}${view.result?.reused ? `, reused ${view.result.reused}` : ''})` +
            (job.health?.suspect ? ` — SUSPECT: ${job.health.reasons.join('; ')}` : '')
        );

        io.emit('transcription:complete', {
          jobId: currentJobId,
          videoPath: job.videoPath,
          transcriptPath,
          health: job.health,
        });

        // FR-99: telemetry
        const transcriptionEndTime = Date.now();
        const transcriptionDurationSec = (transcriptionEndTime - transcriptionStartTime) / 1000;
        const completedProjectDir = projectDirFromRecordingPath(videoPath);
        const project = completedProjectDir ? path.basename(completedProjectDir) : 'unknown';
        getVideoDuration(videoPath)
          .then((videoDuration) => {
            const duration = videoDuration ?? 0;
            appendTelemetryEntry({
              startTimestamp,
              endTimestamp: new Date(transcriptionEndTime).toISOString(),
              project,
              filename: job.videoFilename,
              path: videoPath,
              videoDurationSec: duration,
              transcriptionDurationSec,
              ratio: duration > 0 ? transcriptionDurationSec / duration : 0,
              fileSizeBytes: videoFileSizeBytes,
              model: engine ? `flitools:${engine.name ?? '?'}/${engine.model ?? '?'}` : 'flitools',
              success: true,
            });
          })
          .catch((err) => console.error('Error getting video duration for telemetry:', err));
      })
      .catch((err: unknown) => {
        job.status = 'error';
        job.completedAt = new Date().toISOString();
        job.error = err instanceof Error ? err.message : String(err);
        console.error(`Transcription failed: ${job.videoFilename} — ${job.error}`);
        io.emit('transcription:error', { jobId: currentJobId, videoPath, error: job.error });
        // Renamed while this ran (FliTools may have lost the file under it): run it at the new name
        const current = currentPathOf(videoPath, submittedAt);
        if (current !== path.resolve(videoPath) && fs.existsSync(current)) {
          console.log(`[follow] ${job.videoFilename} was renamed while transcribing — re-queued as ${path.basename(current)}`);
          requeuePath = current;
        }
      })
      .finally(finish);
  }

  // === Pass 2 follows the take ===
  function watchPass2(w: Pass2Watch): void {
    if (pass2Watches.some((x) => x.jobId === w.jobId && x.path === w.path)) return;
    pass2Watches.push(w);
    saveFollowState();
  }

  let checking = false;
  /**
   * Ask FliTools about each watched pass-2 job. When one has finished for a take renamed since:
   * move what it saved under the old name to the current one; and if the current name still has
   * no edit-grade transcript (FliTools skips a pass 2 whose recording path is gone), ask for
   * pass 2 again at the current path — once.
   */
  async function checkPass2(): Promise<void> {
    if (checking || aborting) return;
    checking = true;
    try {
      for (const w of [...pass2Watches]) {
        let view: FlitoolsJobView | null = null;
        let lost = false;
        try {
          view = await flitools.job(w.jobId);
        } catch (err) {
          if (err instanceof FlitoolsError && err.failure === 'job-not-found') lost = true;
          else continue; // FliTools not answering: ask next round
        }
        if (view && (view.status === 'queued' || view.status === 'running')) continue;

        pass2Watches = pass2Watches.filter((x) => x !== w);
        const current = currentPathOf(w.path, w.since);
        const renamed = current !== path.resolve(w.path);
        const sha = view?.result?.transcript?.source?.sha256 ?? null;
        if (renamed) {
          const wroteOld =
            view?.result?.files?.json &&
            getBaseName(view.result.files.json) === getBaseName(w.path);
          if (wroteOld) await relocateTranscripts(w.path, current, sha);
          if (wroteOld && fs.existsSync(w.path)) void queueTranscription(w.path).catch(() => undefined);
        }
        const skipped = /changed or is gone/.test(view?.note ?? '');
        if (
          (renamed || skipped || lost) &&
          !w.retried &&
          fs.existsSync(current) &&
          !(await hasEditGradeTranscript(current))
        ) {
          try {
            const language = await transcriptionLanguageFor(current);
            const again = await flitools.submit(current, { tier: 'edit', forceSave: true, language });
            console.log(`[follow] pass 2 re-asked for ${path.basename(current)} (FliTools job ${again.id}, ${again.status})`);
            if (again.status === 'queued' || again.status === 'running') {
              // the same id = FliTools still has that job open (it forgot it across a restart): keep watching
              pass2Watches.push({
                jobId: again.id,
                path: current,
                since: Date.now(),
                retried: again.id === w.jobId ? w.retried : true,
              });
            }
          } catch (err) {
            console.error(`[follow] could not re-ask pass 2 for ${current}:`, err);
          }
        }
        saveFollowState();
      }
    } finally {
      checking = false;
    }
  }

  const pass2PollMs = followOptions.pass2PollMs ?? 0;
  const pass2Timer = pass2PollMs > 0 ? setInterval(() => void checkPass2(), pass2PollMs) : null;
  pass2Timer?.unref?.();

  // Queue a transcription job (exported for use by rename route)
  // `force` (explicit redo: Regen Transcripts force, POST /queue {force}) re-transcribes even when a
  // fresh transcript exists; the old files go to -trash first (processNextJob).
  async function queueTranscription(
    videoPath: string,
    opts: { force?: boolean } = {}
  ): Promise<TranscriptionJob | null> {
    const rawFilename = path.basename(videoPath);
    // FR-94: Normalize to base name for consistent comparison
    // This prevents duplicates when same recording is queued as .mov and .mp4
    const baseName = getBaseName(rawFilename);
    // Use normalized filename with .mov extension for display consistency
    const videoFilename = `${baseName}.mov`;

    // FR-92: Skip if transcript already exists (only check .txt, not .srt)
    // BUGFIX: Pass videoPath to check in correct project folder
    if (!opts.force && hasTranscriptFile(videoFilename, videoPath)) {
      console.log(`Transcript already exists for ${videoFilename} in ${videoPath}, skipping`);
      return null;
    }

    // FR-94: Skip if already queued or active (compare using base name)
    const activeBaseName = activeJob ? getBaseName(activeJob.videoFilename) : null;
    if (activeBaseName === baseName) {
      console.log(`${videoFilename} is already being transcribed`);
      return activeJob;
    }
    const existing = queue.find((j) => getBaseName(j.videoFilename) === baseName);
    if (existing) {
      console.log(`${videoFilename} is already in queue`);
      return existing;
    }

    // FR-94 → FR-159: a 'complete' entry in recentJobs is STALE if we got this far — the
    // hasTranscriptFile check above already established the transcript is missing (the
    // delete-then-re-record flow trashes the old transcript with the old take). Skipping
    // here silently blocked re-transcribes for up to 5 jobs; purge the stale entry instead.
    const inRecent = recentJobs.find((j) => getBaseName(j.videoFilename) === baseName);
    if (inRecent && inRecent.status === 'complete') {
      console.log(
        `${videoFilename}: stale 'complete' entry in recent (transcript missing on disk) — purging and re-queuing`
      );
      recentJobs = recentJobs.filter((j) => getBaseName(j.videoFilename) !== baseName);
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
      videoFilename, // FR-94: Now normalized to .mov extension
      status: 'queued',
      duration,
      size,
      queuedAt: new Date().toISOString(),
      ...(opts.force ? { force: true } : {}),
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
    const filename = queryString(req.params.filename);
    const status = getStatusForVideo(filename);
    const transcriptPath = getTranscriptPath(filename);
    // B584: FliTools' health verdict lives in the transcript .json, so it survives restarts
    const info = transcriptPath ? readTranscriptInfo(transcriptPath.replace(/\.txt$/, '.json')) : null;
    const health = info?.health ?? null;
    // Redo transcript: a high-quality pass is pending while a pass-2 watch for this take was asked
    // for after the transcript on disk was made (a stale watch is not "pending" once pass 2 lands).
    const base = getBaseName(filename);
    const made = info?.createdAt ? Date.parse(info.createdAt) : 0;
    const pass2Pending =
      info?.pass !== 2 && pass2Watches.some((w) => getBaseName(w.path) === base && w.since >= made - 60_000);

    res.json({
      filename,
      status,
      transcriptPath,
      ...(health ? { health } : {}),
      ...(info?.pass ? { pass: info.pass } : {}),
      ...(info?.engine ? { engine: info.engine } : {}),
      ...(info?.createdAt ? { createdAt: info.createdAt } : {}),
      ...(pass2Pending ? { pass2Pending: true } : {}),
    });
  });

  // GET /api/transcriptions/transcript/:filename - Get transcript content
  // FR-94: Supports ?format=txt|srt query param, defaults to txt if available
  router.get('/transcript/:filename', async (req: Request, res: Response) => {
    const filename = queryString(req.params.filename);
    const requestedFormat = queryString(req.query.format) || undefined;
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
    // FR-109: filename is already a base name (no extension), just append .txt
    // Don't use path.extname() - it breaks on filenames with dots like "23-1-develop.2.4-setup"
    const transcriptFilename = `${filename}.txt`;

    // Determine transcripts directory: use project param if provided, else current project
    let transcriptsDir: string;
    if (project && typeof project === 'string') {
      const projectsDir = expandPath(getConfig().projectsRootDirectory!);
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
      console.log(
        `Deleted orphaned transcript: ${transcriptFilename}${project ? ` (project: ${project})` : ''}`
      );
      res.json({ success: true, filename: transcriptFilename, deleted: true });
    } catch (error) {
      console.error('Error deleting transcript:', error);
      res.status(500).json({ success: false, error: 'Failed to delete transcript' });
    }
  });

  // POST /api/transcriptions/queue - Manually queue a transcription
  router.post('/queue', async (req: Request, res: Response) => {
    const { videoPath, force } = req.body as { videoPath?: string; force?: boolean };

    if (!videoPath) {
      res.status(400).json({ success: false, error: 'videoPath required' });
      return;
    }

    const expandedPath = expandPath(videoPath);
    if (!fs.existsSync(expandedPath)) {
      res.status(404).json({ success: false, error: 'Video file not found' });
      return;
    }

    const job = await queueTranscription(expandedPath, { force: force === true });
    // FR-159: a null job means the request was SKIPPED — say why, so the UI can show it
    if (!job) {
      res.json({
        success: true,
        job: null,
        skipped: true,
        reason: 'Transcript already exists for this recording',
      });
      return;
    }
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
        transcriptCount = files.filter((f) => chapterPattern.test(f)).length;
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
        .filter((f) => chapterPattern.test(f))
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

      console.log(
        `Created combined transcript: ${chapter}-chapter.txt (${transcriptFiles.length} files)`
      );

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
  // FR-94: Only transcribe real recordings
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
      // FR-94: Only scan real recordings
      const videoMap = new Map<string, { path: string }>();

      // Only scan real recordings
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

            videoMap.set(baseName, { path: path.join(dir, file) });
          }
        }
      }

      // Convert map to array of paths
      const videoFiles = Array.from(videoMap.values()).map((v) => v.path);

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

      console.log(
        `Queue-all (${scope}${chapter ? ` chapter ${chapter}` : ''}): queued ${queued.length}, skipped ${skipped.length}`
      );

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
      const videoMap = new Map<string, { path: string }>();

      const realDirs = [projectPaths.recordings, projectPaths.safe];

      for (const dir of realDirs) {
        if (fs.existsSync(dir)) {
          const files = await fs.readdir(dir);
          for (const file of files) {
            if (!file.endsWith('.mov')) continue;
            const baseName = file.replace('.mov', '');
            videoMap.set(baseName, { path: path.join(dir, file) });
          }
        }
      }

      // Count files without transcripts
      let pendingCount = 0;
      for (const [baseName, videoInfo] of videoMap) {
        // BUGFIX: Pass video path to check in correct project folder
        if (!hasTranscriptFile(`${baseName}.mov`, videoInfo.path)) {
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
      const sortedChapters = Array.from(chapterMap.entries()).sort(([a], [b]) =>
        a.localeCompare(b)
      );

      const chapters = sortedChapters.map(([chapter, transcripts]) => {
        // Sort by sequence within chapter
        transcripts.sort((a, b) => a.sequence - b.sequence);

        // Get title from first sequence
        const title = transcripts[0]?.name || '';

        // Combine all transcript content
        const content = transcripts.map((t) => t.content).join('\n\n');

        return { chapter, title, content };
      });

      res.json({ chapters });
    } catch (error) {
      console.error('Error building combined transcript:', error);
      res.status(500).json({ success: false, error: 'Failed to build combined transcript' });
    }
  });

  // Graceful shutdown: stop polling FliTools (B584 — its job runs on there; nothing to kill here)
  function killActiveProcess(): void {
    aborting = true;
    if (pass2Timer) clearInterval(pass2Timer);
    stopFollowing();
    // Clear the queue so nothing restarts
    queue = [];
    activeJob = null;
  }

  // FR-130: Getters for queue state (used by rename logic to check conflicts)
  function getActiveJob(): TranscriptionJob | null {
    return activeJob;
  }

  function getQueue(): TranscriptionJob[] {
    return queue;
  }

  // Export queueTranscription, killActiveProcess, and queue getters
  return {
    router,
    queueTranscription,
    killActiveProcess,
    getActiveJob,
    getQueue,
    checkPass2,
    getPass2Watches: () => [...pass2Watches],
  };
}
