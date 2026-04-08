// B064: Hold/offload routes — move projects to/from T7 SSD holding area
import { Router, Request, Response } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { expandPath, queryString } from '../utils/pathUtils.js';
import {
  checkSsdMounted,
  verifyHoldingMatch,
  getHoldStatus,
  holdProject,
  restoreFromHolding,
  deleteLocalProject,
  deleteHoldingProject,
} from '../utils/holdUtils.js';
import { updateDiskCacheHoldData, invalidateDiskCacheEntry } from './projects.js';
import type { Config } from '../../../shared/types.js';

// B064: Resolve local project directory from config + project code
function resolveProjectDir(config: Config, code: string): string {
  const projectsRoot = expandPath(config.projectsRootDirectory!);
  return path.join(projectsRoot, code);
}

// B064: Resolve relay directory for a project (null if relay not configured)
function resolveRelayDir(config: Config, code: string): string | null {
  if (!config.relayEnabled || !config.relayDirectory) return null;
  return path.join(expandPath(config.relayDirectory), code);
}

export function createHoldRoutes(getConfig: () => Config): Router {
  const router = Router();

  // B064: GET /api/projects/:code/hold/status
  // Returns current hold status: location, SSD mount, relay bytes
  router.get('/:code/hold/status', async (req: Request, res: Response) => {
    const code = queryString(req.params.code);
    // B064: Validate project code — no path separators or parent traversal
    if (!code || /[/\\]/.test(code) || code.includes('..')) {
      res.status(400).json({ success: false, error: 'Invalid project code' });
      return;
    }
    const config = getConfig();

    if (!config.projectsRootDirectory) {
      res.status(400).json({ success: false, error: 'projectsRootDirectory not configured' });
      return;
    }

    const holdingRoot = config.holdingPath ? expandPath(config.holdingPath) : null;

    // B064: No holding path configured — return minimal unknown status
    if (!holdingRoot) {
      res.json({
        success: true,
        data: { location: 'unknown', relayBlocked: false, relayBytes: 0, ssdMounted: false },
      });
      return;
    }

    try {
      const projectDir = resolveProjectDir(config, code);
      const relayDir = resolveRelayDir(config, code);
      const status = await getHoldStatus(code, projectDir, relayDir, holdingRoot);
      res.json({ success: true, data: status });
    } catch (error) {
      console.error(`[B064] hold/status error for ${code}:`, error);
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  // B064: POST /api/projects/:code/hold
  // Body: { dryRun?: boolean }
  // rsync local project → T7 holding area; runs verify automatically on success
  router.post('/:code/hold', async (req: Request, res: Response) => {
    const code = queryString(req.params.code);
    // B064: Validate project code — no path separators or parent traversal
    if (!code || /[/\\]/.test(code) || code.includes('..')) {
      res.status(400).json({ success: false, error: 'Invalid project code' });
      return;
    }
    const { dryRun } = req.body as { dryRun?: boolean };
    const config = getConfig();

    if (!config.holdingPath) {
      res.status(400).json({ success: false, error: 'holdingPath not configured' });
      return;
    }

    if (!config.projectsRootDirectory) {
      res.status(400).json({ success: false, error: 'projectsRootDirectory not configured' });
      return;
    }

    const holdingRoot = expandPath(config.holdingPath);
    const projectDir = resolveProjectDir(config, code);
    const relayDir = resolveRelayDir(config, code);

    try {
      // B064: Get status to check relay + SSD guards
      const status = await getHoldStatus(code, projectDir, relayDir, holdingRoot);

      if (status.relayBlocked) {
        res.status(400).json({
          success: false,
          error: `Relay is not empty — ${status.relayBytes} bytes in relay folders. Clear relay before offloading.`,
        });
        return;
      }

      if (!status.ssdMounted) {
        res.status(400).json({ success: false, error: 'Holding SSD is not mounted' });
        return;
      }

      // B064: Compute holding path for dry-run response
      const computedHoldingPath = path.join(holdingRoot, path.basename(projectDir));

      if (dryRun) {
        // B064: Dry run — report what would be transferred without performing the rsync.
        // verifyHoldingMatch on local only gives us localFiles + localBytes.
        // We pass a path that won't exist so holdingFiles/holdingBytes stay 0.
        const dryVerification = await verifyHoldingMatch(projectDir, computedHoldingPath);
        res.json({
          success: true,
          dryRun: true,
          holdingPath: computedHoldingPath,
          localBytes: dryVerification.localBytes,
        });
        return;
      }

      // B064: Perform the hold (rsync)
      const result = await holdProject(projectDir, holdingRoot);

      if (!result.success) {
        res.status(500).json({ success: false, error: result.error, message: result.message });
        return;
      }

      // B064: Auto-verify on success
      const verification = await verifyHoldingMatch(projectDir, computedHoldingPath);
      result.verification = verification;

      // B064: Update disk cache with hold metadata — only when verification confirms match
      if (result.success && verification.match) {
        updateDiskCacheHoldData(code, new Date().toISOString(), result.holdingPath ?? '');
      }

      res.json({ success: true, data: result });
    } catch (error) {
      console.error(`[B064] hold error for ${code}:`, error);
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  // B064: POST /api/projects/:code/hold/verify
  // On-demand verification — compare local vs holding by file count + bytes
  router.post('/:code/hold/verify', async (req: Request, res: Response) => {
    const code = queryString(req.params.code);
    // B064: Validate project code — no path separators or parent traversal
    if (!code || /[/\\]/.test(code) || code.includes('..')) {
      res.status(400).json({ success: false, error: 'Invalid project code' });
      return;
    }
    const config = getConfig();

    if (!config.holdingPath) {
      res.status(400).json({ success: false, error: 'holdingPath not configured' });
      return;
    }

    if (!config.projectsRootDirectory) {
      res.status(400).json({ success: false, error: 'projectsRootDirectory not configured' });
      return;
    }

    try {
      const holdingRoot = expandPath(config.holdingPath);
      const projectDir = resolveProjectDir(config, code);
      const holdingDir = path.join(holdingRoot, path.basename(projectDir));

      const verification = await verifyHoldingMatch(projectDir, holdingDir);
      res.json({ success: true, verification });
    } catch (error) {
      console.error(`[B064] verify error for ${code}:`, error);
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  // B064: DELETE /api/projects/:code/local
  // Body: { confirmCode: string }
  // DANGER — deletes local project directory; requires HOLDING copy + verification
  router.delete('/:code/local', async (req: Request, res: Response) => {
    const code = queryString(req.params.code);
    // B064: Validate project code — no path separators or parent traversal
    if (!code || /[/\\]/.test(code) || code.includes('..')) {
      res.status(400).json({ success: false, error: 'Invalid project code' });
      return;
    }
    const { confirmCode } = req.body as { confirmCode?: string };
    const config = getConfig();

    // B064: Gate — confirmCode must exactly match project code
    if (confirmCode !== code) {
      res.status(400).json({
        success: false,
        error: `Confirmation code "${confirmCode}" does not match project code "${code}"`,
      });
      return;
    }

    if (!config.holdingPath) {
      res.status(400).json({ success: false, error: 'holdingPath not configured' });
      return;
    }

    if (!config.projectsRootDirectory) {
      res.status(400).json({ success: false, error: 'projectsRootDirectory not configured' });
      return;
    }

    try {
      const holdingRoot = expandPath(config.holdingPath);
      const projectDir = resolveProjectDir(config, code);
      const holdingDir = path.join(holdingRoot, path.basename(projectDir));

      // B064: Gate — HOLDING copy must exist
      try {
        await fs.access(holdingDir);
      } catch {
        res.status(400).json({
          success: false,
          error: `HOLDING copy not found at ${holdingDir}`,
        });
        return;
      }

      // B064: Gate — verify HOLDING matches local before allowing delete
      const verification = await verifyHoldingMatch(projectDir, holdingDir);
      if (!verification.match) {
        res.status(400).json({
          success: false,
          error: 'HOLDING copy does not match local — run hold again before deleting local',
          verification,
        });
        return;
      }

      // B064: All gates passed — delete local
      const result = await deleteLocalProject(projectDir, expandPath(config.projectsRootDirectory), true);

      // B064: Invalidate disk cache on successful delete
      if (result.success) {
        invalidateDiskCacheEntry(code);
      }

      res.json(result);
    } catch (error) {
      console.error(`[B064] delete local error for ${code}:`, error);
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  // B064: POST /api/projects/:code/hold/restore
  // rsync T7 holding → local project directory; runs verify automatically on success
  router.post('/:code/hold/restore', async (req: Request, res: Response) => {
    const code = queryString(req.params.code);
    // B064: Validate project code — no path separators or parent traversal
    if (!code || /[/\\]/.test(code) || code.includes('..')) {
      res.status(400).json({ success: false, error: 'Invalid project code' });
      return;
    }
    const config = getConfig();

    if (!config.holdingPath) {
      res.status(400).json({ success: false, error: 'holdingPath not configured' });
      return;
    }

    if (!config.projectsRootDirectory) {
      res.status(400).json({ success: false, error: 'projectsRootDirectory not configured' });
      return;
    }

    try {
      const holdingRoot = expandPath(config.holdingPath);
      const projectDir = resolveProjectDir(config, code);
      const holdingDir = path.join(holdingRoot, path.basename(projectDir));

      // B064: Check SSD mounted
      const ssdMounted = await checkSsdMounted(holdingRoot);
      if (!ssdMounted) {
        res.status(400).json({ success: false, error: 'Holding SSD is not mounted' });
        return;
      }

      // B064: Gate — HOLDING copy must exist
      try {
        await fs.access(holdingDir);
      } catch {
        res.status(400).json({
          success: false,
          error: `HOLDING copy not found at ${holdingDir}`,
        });
        return;
      }

      // B064: Perform the restore (rsync holding → local)
      const result = await restoreFromHolding(holdingDir, projectDir);

      if (!result.success) {
        res.status(500).json({ success: false, error: result.error, message: result.message });
        return;
      }

      // B064: Auto-verify on success
      const verification = await verifyHoldingMatch(projectDir, holdingDir);
      result.verification = verification;

      res.json({ success: true, data: result });
    } catch (error) {
      console.error(`[B064] restore error for ${code}:`, error);
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  // B064: DELETE /api/projects/:code/holding
  // Body: { confirmCode: string }
  // DANGER — deletes HOLDING copy from T7 SSD; requires local copy + verification
  router.delete('/:code/holding', async (req: Request, res: Response) => {
    const code = queryString(req.params.code);
    // B064: Validate project code — no path separators or parent traversal
    if (!code || /[/\\]/.test(code) || code.includes('..')) {
      res.status(400).json({ success: false, error: 'Invalid project code' });
      return;
    }
    const { confirmCode } = req.body as { confirmCode?: string };
    const config = getConfig();

    // B064: Gate — confirmCode must exactly match project code
    if (confirmCode !== code) {
      res.status(400).json({
        success: false,
        error: `Confirmation code "${confirmCode}" does not match project code "${code}"`,
      });
      return;
    }

    if (!config.holdingPath) {
      res.status(400).json({ success: false, error: 'holdingPath not configured' });
      return;
    }

    if (!config.projectsRootDirectory) {
      res.status(400).json({ success: false, error: 'projectsRootDirectory not configured' });
      return;
    }

    try {
      const holdingRoot = expandPath(config.holdingPath);
      const projectDir = resolveProjectDir(config, code);
      const holdingDir = path.join(holdingRoot, path.basename(projectDir));

      // B064: Gate — local project must exist
      try {
        await fs.access(projectDir);
      } catch {
        res.status(400).json({
          success: false,
          error: `Local project not found at ${projectDir}`,
        });
        return;
      }

      // B064: Gate — verify HOLDING matches local before allowing delete
      const verification = await verifyHoldingMatch(projectDir, holdingDir);
      if (!verification.match) {
        res.status(400).json({
          success: false,
          error: 'HOLDING copy does not match local — verify before deleting holding',
          verification,
        });
        return;
      }

      // B064: All gates passed — delete holding
      const result = await deleteHoldingProject(holdingDir, holdingRoot, true);

      res.json(result);
    } catch (error) {
      console.error(`[B064] delete holding error for ${code}:`, error);
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  return router;
}
