// B044: Sync Hub — git sync status + push/pull/resolve endpoints
import express from 'express';
import { execFile } from 'child_process';
import { promisify } from 'util';
import type { Config, SyncChannelStatus, SyncState, SyncPushResponse, SyncPullResponse, SyncConflictFile, SyncResolveRequest, SyncResolveResponse } from '../../../shared/types.js';
import { expandPath } from '../utils/pathUtils.js';

const execFileAsync = promisify(execFile);

// Per-repo lock to prevent concurrent git operations (fetch vs pull race condition)
const repoLocks = new Map<string, Promise<void>>();

async function withRepoLock<T>(repoDir: string, fn: () => Promise<T>): Promise<T> {
  const existing = repoLocks.get(repoDir);
  let release: () => void;
  const lock = new Promise<void>((resolve) => { release = resolve; });
  // Wait for any existing operation to finish before starting ours
  const run = (existing ?? Promise.resolve()).then(fn).finally(() => {
    if (repoLocks.get(repoDir) === lock) repoLocks.delete(repoDir);
    release!();
  });
  repoLocks.set(repoDir, lock);
  return run;
}

async function getChannelStatus(channel: string, repoDir: string): Promise<SyncChannelStatus> {
  const now = new Date().toISOString();

  try {
    // Fetch latest from remote (quiet, non-blocking)
    try {
      await execFileAsync('git', ['fetch', '--quiet'], { cwd: repoDir, timeout: 15000 });
    } catch {
      // fetch may fail (no network, no remote) — continue with local state
    }

    // Local HEAD hash
    const { stdout: localHash } = await execFileAsync(
      'git', ['rev-parse', '--short', 'HEAD'],
      { cwd: repoDir, timeout: 5000 }
    );

    // Remote upstream hash
    let remoteHash = '';
    try {
      const { stdout: rh } = await execFileAsync(
        'git', ['rev-parse', '--short', '@{upstream}'],
        { cwd: repoDir, timeout: 5000 }
      );
      remoteHash = rh.trim();
    } catch {
      // No upstream configured — return clean with local info only
      const { stdout: porcelain } = await execFileAsync(
        'git', ['status', '--porcelain'],
        { cwd: repoDir, timeout: 5000 }
      );
      const dirtyFiles = porcelain.trim() ? porcelain.trim().split('\n') : [];
      const state: SyncState = dirtyFiles.length > 0 ? 'dirty' : 'clean';
      return {
        channel,
        state,
        localHash: localHash.trim(),
        remoteHash: '',
        dirtyCount: dirtyFiles.length,
        behindCount: 0,
        aheadCount: 0,
        lastFetch: now,
        ...(dirtyFiles.length > 0 ? { dirtyFiles } : {}),
      };
    }

    // Ahead/behind counts
    let aheadCount = 0;
    let behindCount = 0;
    try {
      const { stdout: leftRight } = await execFileAsync(
        'git', ['rev-list', '--left-right', '--count', 'HEAD...@{upstream}'],
        { cwd: repoDir, timeout: 5000 }
      );
      const parts = leftRight.trim().split(/\s+/);
      aheadCount = parseInt(parts[0], 10) || 0;
      behindCount = parseInt(parts[1], 10) || 0;
    } catch {
      // If rev-list fails, counts stay 0
    }

    // Dirty files
    const { stdout: porcelain } = await execFileAsync(
      'git', ['status', '--porcelain'],
      { cwd: repoDir, timeout: 5000 }
    );
    const dirtyFiles = porcelain.trim() ? porcelain.trim().split('\n') : [];
    const dirtyCount = dirtyFiles.length;

    // Determine state
    let state: SyncState;
    if (dirtyCount > 0 && behindCount > 0) {
      state = 'diverged';
    } else if (dirtyCount > 0) {
      state = 'dirty';
    } else if (behindCount > 0) {
      state = 'behind';
    } else if (aheadCount > 0) {
      state = 'ahead';
    } else {
      state = 'clean';
    }

    return {
      channel,
      state,
      localHash: localHash.trim(),
      remoteHash,
      dirtyCount,
      behindCount,
      aheadCount,
      lastFetch: now,
      ...(dirtyFiles.length > 0 ? { dirtyFiles } : {}),
    };
  } catch (err) {
    return {
      channel,
      state: 'unknown',
      localHash: '',
      remoteHash: '',
      dirtyCount: 0,
      behindCount: 0,
      aheadCount: 0,
      lastFetch: now,
      error: String(err),
    };
  }
}

export function createSyncRoutes(getConfig: () => Config) {
  const router = express.Router();

  // GET /api/sync/status — git state for app-code and video-project repos
  router.get('/status', async (_req, res) => {
    try {
      const config = getConfig();

      // App code repo = where the server is running from
      const appCodeDir = process.cwd();
      const appCode = await withRepoLock(appCodeDir, () => getChannelStatus('app-code', appCodeDir));

      // Video project repo (optional — only if projectsRootDirectory is configured)
      let videoProject: SyncChannelStatus | undefined;
      if (config.projectsRootDirectory) {
        const videoDir = expandPath(config.projectsRootDirectory);
        videoProject = await withRepoLock(videoDir, () => getChannelStatus('video-project', videoDir));
      }

      res.json({
        success: true,
        appCode,
        ...(videoProject ? { videoProject } : {}),
      });
    } catch (error) {
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  /**
   * POST /api/sync/push — commit and push changes for a channel
   *
   * Accepts { channel: 'app-code' | 'video-project' } (defaults to 'video-project').
   * Stages all changes, builds a descriptive commit message, commits and pushes.
   */
  router.post('/push', async (req, res) => {
    try {
      const { channel = 'video-project' } = (req.body ?? {}) as { channel?: string };

      let repoDir: string;
      if (channel === 'app-code') {
        repoDir = process.cwd();
      } else {
        const config = getConfig();
        if (!config.projectsRootDirectory) {
          res.json({ success: false, error: 'No projects root directory configured' } as SyncPushResponse);
          return;
        }
        repoDir = expandPath(config.projectsRootDirectory);
      }

      const pushResult = await withRepoLock(repoDir, async (): Promise<SyncPushResponse> => {
        // Stage all changes
        await execFileAsync('git', ['add', '-A'], { cwd: repoDir, timeout: 30000 });

        // Get list of staged files
        const { stdout: diffOutput } = await execFileAsync(
          'git', ['diff', '--cached', '--name-only'],
          { cwd: repoDir, timeout: 10000 }
        );
        const files = diffOutput.trim().split('\n').filter(Boolean);

        if (files.length === 0) {
          return { success: false, error: 'Nothing to commit' };
        }

        // Build commit message, commit, push
        const commitMessage = buildCommitMessage(files);
        await execFileAsync('git', ['commit', '-m', commitMessage], { cwd: repoDir, timeout: 30000 });

        const { stdout: hashOutput } = await execFileAsync(
          'git', ['rev-parse', '--short', 'HEAD'],
          { cwd: repoDir, timeout: 5000 }
        );

        const { stdout: pushOutput, stderr: pushStderr } = await execFileAsync(
          'git', ['push'],
          { cwd: repoDir, timeout: 120000 }
        );

        return {
          success: true,
          commitHash: hashOutput.trim(),
          commitMessage,
          filesCommitted: files.length,
          output: pushOutput || pushStderr,
        };
      });

      res.json(pushResult as SyncPushResponse);
    } catch (error) {
      res.status(500).json({ success: false, error: String(error) } as SyncPushResponse);
    }
  });

  /**
   * POST /api/sync/pull — pull latest changes for a channel
   *
   * Accepts { channel: 'app-code' | 'video-project' }.
   * Uses git pull --rebase with 120s timeout.
   * On conflict, parses unresolved files and returns them.
   */
  router.post('/pull', async (req, res) => {
    try {
      const { channel } = req.body ?? {};
      if (channel !== 'app-code' && channel !== 'video-project') {
        res.status(400).json({ success: false, error: 'Invalid channel — must be app-code or video-project' } as SyncPullResponse);
        return;
      }

      let repoDir: string;
      if (channel === 'app-code') {
        repoDir = process.cwd();
      } else {
        const config = getConfig();
        if (!config.projectsRootDirectory) {
          res.json({ success: false, error: 'No projects root directory configured' } as SyncPullResponse);
          return;
        }
        repoDir = expandPath(config.projectsRootDirectory);
      }

      const result = await withRepoLock(repoDir, async (): Promise<SyncPullResponse> => {
        const { stdout, stderr } = await execFileAsync(
          'git', ['pull', '--rebase'],
          { cwd: repoDir, timeout: 120000 }
        );

        const r: SyncPullResponse = {
          success: true,
          output: stdout || stderr,
        };

        if (channel === 'app-code') {
          r.restartInstructions = 'App code updated. Restart the FliHub server to apply changes: npm run dev';
        }
        return r;
      });

      res.json(result);
    } catch (error) {
      // Check if this is a conflict error
      const errStr = String(error);
      if (errStr.includes('CONFLICT') || errStr.includes('could not apply')) {
        try {
          const { channel } = req.body ?? {};
          let repoDir: string;
          if (channel === 'app-code') {
            repoDir = process.cwd();
          } else {
            const config = getConfig();
            repoDir = expandPath(config.projectsRootDirectory!);
          }

          const conflicts = await parseConflictFiles(repoDir);
          res.json({
            success: false,
            error: 'Pull encountered conflicts',
            conflicts,
          } as SyncPullResponse);
        } catch {
          res.status(500).json({ success: false, error: errStr } as SyncPullResponse);
        }
        return;
      }
      res.status(500).json({ success: false, error: errStr } as SyncPullResponse);
    }
  });

  /**
   * POST /api/sync/resolve — resolve a single conflict file
   *
   * Accepts { channel, file, resolution } (SyncResolveRequest).
   * Validates file path for traversal attacks, then applies resolution.
   * When all conflicts are resolved, automatically continues the rebase.
   */
  router.post('/resolve', async (req, res) => {
    try {
      const { channel, file, resolution } = (req.body ?? {}) as SyncResolveRequest;

      if (channel !== 'app-code' && channel !== 'video-project') {
        res.status(400).json({ success: false, error: 'Invalid channel' } as SyncResolveResponse);
        return;
      }
      if (!file || !resolution) {
        res.status(400).json({ success: false, error: 'Missing file or resolution' } as SyncResolveResponse);
        return;
      }

      // Path traversal validation
      if (file.includes('..') || file.startsWith('/')) {
        res.status(400).json({ success: false, error: 'Invalid file path' } as SyncResolveResponse);
        return;
      }

      if (resolution !== 'keep-mine' && resolution !== 'keep-theirs') {
        res.status(400).json({ success: false, error: 'Invalid resolution — must be keep-mine or keep-theirs' } as SyncResolveResponse);
        return;
      }

      let repoDir: string;
      if (channel === 'app-code') {
        repoDir = process.cwd();
      } else {
        const config = getConfig();
        if (!config.projectsRootDirectory) {
          res.json({ success: false, error: 'No projects root directory configured' } as SyncResolveResponse);
          return;
        }
        repoDir = expandPath(config.projectsRootDirectory);
      }

      const resolveResult = await withRepoLock(repoDir, async (): Promise<SyncResolveResponse> => {
        // Apply resolution
        const checkoutFlag = resolution === 'keep-mine' ? '--ours' : '--theirs';
        await execFileAsync('git', ['checkout', checkoutFlag, '--', file], { cwd: repoDir, timeout: 10000 });
        await execFileAsync('git', ['add', file], { cwd: repoDir, timeout: 10000 });

        // Check remaining conflicts
        const remaining = await parseConflictFiles(repoDir);
        const remainingCount = remaining.length;

        // If no conflicts remain, continue the rebase
        if (remainingCount === 0) {
          try {
            await execFileAsync('git', ['rebase', '--continue'], {
              cwd: repoDir,
              timeout: 30000,
              env: { ...process.env, GIT_EDITOR: 'true' },
            });
          } catch {
            // rebase --continue may fail if there are more commits to rebase
            // — that's okay, the next pull/status will show the state
          }
        }

        return { success: true, remainingConflicts: remainingCount };
      });

      res.json(resolveResult as SyncResolveResponse);
    } catch (error) {
      res.status(500).json({ success: false, error: String(error) } as SyncResolveResponse);
    }
  });

  return router;
}

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

/**
 * Build a descriptive commit message from a list of changed file paths.
 * Groups by type. If ≤5 files, lists them. If >5, shows counts.
 */
export function buildCommitMessage(files: string[]): string {
  if (files.length === 0) return 'Push: empty commit';

  if (files.length <= 5) {
    const names = files.map(f => f.split('/').pop() || f);
    return `Push: ${names.join(', ')}`;
  }

  // Group by extension
  const groups: Record<string, number> = {};
  for (const f of files) {
    const ext = (f.split('.').pop() || '').toLowerCase();
    if (['mov', 'mp4'].includes(ext)) {
      groups['recordings'] = (groups['recordings'] || 0) + 1;
    } else if (['txt', 'srt'].includes(ext)) {
      groups['transcripts'] = (groups['transcripts'] || 0) + 1;
    } else if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) {
      groups['images'] = (groups['images'] || 0) + 1;
    } else {
      groups['other'] = (groups['other'] || 0) + 1;
    }
  }

  const parts = Object.entries(groups).map(([type, count]) => `${count} ${type}`);
  return `Push: ${files.length} files (${parts.join(', ')})`;
}

/**
 * Parse git unmerged files into SyncConflictFile entries.
 */
async function parseConflictFiles(repoDir: string): Promise<SyncConflictFile[]> {
  try {
    const { stdout } = await execFileAsync(
      'git', ['diff', '--name-only', '--diff-filter=U'],
      { cwd: repoDir, timeout: 10000 }
    );
    const lines = stdout.trim().split('\n').filter(Boolean);
    return lines.map(path => ({ path, status: 'both-modified' as const }));
  } catch {
    return [];
  }
}
