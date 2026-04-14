// storage-panel WU1: Storage routes — per-project Hold + Archive verbs.
//
// Endpoints:
//   GET  /api/projects/:code/storage-tree
//   POST /api/projects/:code/hold           — evacuate HEAVY subfolders to HOLDING
//   POST /api/projects/:code/restore-held   — restore HEAVY subfolders from HOLDING
//   POST /api/projects/:code/archive        — copy whole folder to PUBLISHED, delete local
//   POST /api/projects/:code/unarchive      — copy whole folder from PUBLISHED back to local
//
// All mutations:
//   - Re-derive state from disk before acting (never trust client-supplied state).
//   - Respect relay-blocked guard (Hold + Archive only).
//   - Pass holdExcludeArgs() to every rsync call.
//   - Write flat: `<brand>/<code>/` — never with range buckets.
//   - Never touch youtube-FAILS.
//   - Refuse when tree.degraded === true (P8).
//
// Response envelope (P5):
//   Mutations return { success: boolean, error?, newState? }.
//   `success` replaces the earlier `ok` field for consistency with every other
//   FliHub route. `newState` stays at the top level (not wrapped in `data`)
//   so Wave-B client code can read it alongside success/error — this matches
//   the shape used by /ssd-status (flat `{ success, ssdMounted, ... }`) rather
//   than the deeper `{ success, data }` shape used by /hold/status. Tests and
//   hooks should destructure `{ success, newState, error }`.
import { Router, Request, Response } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { expandPath, queryString } from '../utils/pathUtils.js';
import {
  holdExcludeArgs,
  checkSsdMounted,
  getDirStats,
  spawnAsync,
  verifyDirsMatch,
} from '../utils/holdUtils.js';
import {
  HEAVY_SUBFOLDERS,
  getStorageTree,
} from '../utils/storageTree.js';
import {
  appendStorageActivity,
  readStorageActivity,
  defaultStorageActivityLogPath,
} from '../utils/storageActivityLog.js';
import type {
  Config,
  StorageMutationResponse,
  StorageTreeResponse,
  StorageState,
  StorageActivityAction,
  StorageActivityResponse,
} from '../../../shared/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isValidCode(code: string): boolean {
  if (!code) return false;
  if (/[/\\]/.test(code)) return false;
  if (code.includes('..')) return false;
  return true;
}

function resolveRoots(config: Config): {
  projectsRoot: string | null;
  holdingRoot: string | null;
  publishedRoot: string | null;
  relayRoot: string | null;
} {
  const projectsRoot = config.projectsRootDirectory
    ? expandPath(config.projectsRootDirectory)
    : null;
  const holdingRoot = config.holdingPath ? expandPath(config.holdingPath) : null;
  const publishedRoot = config.publishedPath ? expandPath(config.publishedPath) : null;
  const relayRoot =
    config.relayEnabled && config.relayDirectory
      ? expandPath(config.relayDirectory)
      : null;
  return { projectsRoot, holdingRoot, publishedRoot, relayRoot };
}

async function relayBytesFor(relayRoot: string | null, code: string): Promise<number> {
  if (!relayRoot) return 0;
  const base = path.join(relayRoot, code);
  let total = 0;
  for (const sub of ['recordings', 'edit-1st', 'edit-2nd']) {
    const s = await getDirStats(path.join(base, sub));
    total += s.totalBytes;
  }
  return total;
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

function okResponse(newState: StorageState): StorageMutationResponse {
  return { success: true, newState };
}

function errResponse(error: string, newState?: StorageState): StorageMutationResponse {
  return { success: false, error, ...(newState ? { newState } : {}) };
}

// ---------------------------------------------------------------------------
// Router factory
// ---------------------------------------------------------------------------

export function createStorageRoutes(
  getConfig: () => Config,
  getLogPath: () => string = defaultStorageActivityLogPath,
): Router {
  const router = Router();

  // WU5: append one entry per successful mutation. Failures here are
  // best-effort — never surface as a mutation error (the disk work is done).
  // P7: explicit try/catch in addition to the swallow inside
  // `appendStorageActivity` so a refactor of the latter can never propagate
  // a throw back into the mutation handler.
  async function logActivity(
    projectCode: string,
    action: StorageActivityAction,
    sizeBytes: number,
  ): Promise<void> {
    try {
      await appendStorageActivity(
        { projectCode, action, sizeBytes, timestamp: new Date().toISOString() },
        getLogPath(),
      );
    } catch (err) {
      console.warn('[storage] activity log failed:', err);
    }
  }

  // -------------------------------------------------------------------------
  // GET /:code/storage-tree
  // -------------------------------------------------------------------------
  router.get('/:code/storage-tree', async (req: Request, res: Response) => {
    const code = queryString(req.params.code);
    if (!isValidCode(code)) {
      res.status(400).json({ success: false, error: 'Invalid project code' });
      return;
    }
    const config = getConfig();
    const { projectsRoot, holdingRoot, publishedRoot, relayRoot } = resolveRoots(config);
    if (!projectsRoot) {
      res.status(400).json({ success: false, error: 'projectsRootDirectory not configured' });
      return;
    }

    try {
      const tree: StorageTreeResponse = await getStorageTree(code, {
        projectsRoot,
        holdingRoot,
        publishedRoot,
        relayRoot,
      });
      res.json(tree);
    } catch (error) {
      console.error(`[storage-panel] storage-tree error for ${code}:`, error);
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  // -------------------------------------------------------------------------
  // POST /:code/hold
  // Evacuate HEAVY subfolders from local to HOLDING/<brand>/<code>/.
  // Light files + folder shell stay on local.
  //
  // P3: transactional two-pass —
  //   Pass 1: rsync+verify every heavy subfolder to HOLDING. If ANY fails,
  //           STOP and return 500 with no local deletion. HOLDING may have
  //           partial copies of subfolders already rsynced — caller is told
  //           which so they can clean up manually.
  //   Pass 2: only if every Pass-1 step verified, delete heavy subfolders
  //           from local.
  // -------------------------------------------------------------------------
  router.post('/:code/hold', async (req: Request, res: Response) => {
    const code = queryString(req.params.code);
    if (!isValidCode(code)) {
      res.status(400).json(errResponse('Invalid project code'));
      return;
    }
    const config = getConfig();
    const { projectsRoot, holdingRoot, publishedRoot, relayRoot } = resolveRoots(config);

    if (!projectsRoot) {
      res.status(400).json(errResponse('projectsRootDirectory not configured'));
      return;
    }
    if (!holdingRoot) {
      res.status(400).json(errResponse('holdingPath not configured'));
      return;
    }

    const localDir = path.join(projectsRoot, code);
    const holdingDir = path.join(holdingRoot, code);

    try {
      // Mount check first — if T7 is unplugged, we cannot safely derive state
      // (holding / published probes would report false negatives).
      if (!(await checkSsdMounted(holdingRoot))) {
        res.status(400).json(errResponse('Holding SSD is not mounted'));
        return;
      }

      // Re-derive state from disk
      const tree = await getStorageTree(code, {
        projectsRoot,
        holdingRoot,
        publishedRoot,
        relayRoot,
      });

      // P8: refuse when storage is degraded
      if (tree.degraded) {
        res.status(409).json(
          errResponse(
            `Project is in a degraded storage state; resolve manually before mutating. Details: ${tree.error ?? 'unknown'}`,
            tree.state,
          ),
        );
        return;
      }

      if (tree.state !== 'active') {
        res.status(400).json(errResponse(`Cannot hold: project is in state '${tree.state}'`, tree.state));
        return;
      }

      // P9: refuse when there is nothing heavy to hold
      if (tree.sizes.heavyTotal === 0) {
        res.status(400).json(errResponse('No heavy content to hold', tree.state));
        return;
      }

      const relayBytes = await relayBytesFor(relayRoot, code);
      if (relayBytes > 0) {
        res.status(400).json(
          errResponse(
            `Relay is not empty (${relayBytes} bytes). Clear the Relay tool before holding.`,
            tree.state,
          ),
        );
        return;
      }

      // Ensure destination exists
      await fs.mkdir(holdingDir, { recursive: true });

      // P3 Pass 1: rsync + verify every heavy subfolder that exists locally.
      const excludeArgs = holdExcludeArgs();
      const verifiedSubfolders: string[] = [];
      const rsyncedSubfolders: string[] = []; // for caller cleanup hint on failure

      for (const sub of HEAVY_SUBFOLDERS) {
        const src = path.join(localDir, sub);
        const dest = path.join(holdingDir, sub);
        try {
          const stat = await fs.stat(src);
          if (!stat.isDirectory()) continue;
        } catch {
          // Subfolder doesn't exist on local — skip
          continue;
        }
        await fs.mkdir(dest, { recursive: true });
        try {
          await spawnAsync('rsync', ['-a', ...excludeArgs, src + '/', dest + '/']);
        } catch (err) {
          res.status(500).json(
            errResponse(
              `Hold Pass-1 rsync failed for '${sub}': ${String(err)}. Local NOT modified. Partial copies in HOLDING may need manual cleanup for: ${rsyncedSubfolders.concat(sub).join(', ')}`,
              tree.state,
            ),
          );
          return;
        }
        rsyncedSubfolders.push(sub);

        // P4: verify with both fileCount AND totalBytes
        const v = await verifyDirsMatch(src, dest);
        if (!v.ok) {
          res.status(500).json(
            errResponse(
              `Hold verification failed for '${sub}': local=${v.srcFiles} files/${v.srcBytes} bytes, holding=${v.destFiles} files/${v.destBytes} bytes. Local NOT deleted. Partial copies in HOLDING may need manual cleanup for: ${rsyncedSubfolders.join(', ')}`,
              tree.state,
            ),
          );
          return;
        }
        verifiedSubfolders.push(sub);
      }

      // P3 Pass 2: ALL verifications passed — now delete from local.
      for (const sub of verifiedSubfolders) {
        const src = path.join(localDir, sub);
        await fs.rm(src, { recursive: true, force: true });
      }

      await logActivity(code, 'hold', tree.sizes.heavyTotal);
      res.json(okResponse('held'));
    } catch (error) {
      console.error(`[storage-panel] hold error for ${code}:`, error);
      res.status(500).json(errResponse(String(error)));
    }
  });

  // -------------------------------------------------------------------------
  // POST /:code/restore-held
  // Restore HEAVY subfolders from HOLDING → local. HOLDING copy stays.
  // -------------------------------------------------------------------------
  router.post('/:code/restore-held', async (req: Request, res: Response) => {
    const code = queryString(req.params.code);
    if (!isValidCode(code)) {
      res.status(400).json(errResponse('Invalid project code'));
      return;
    }
    const config = getConfig();
    const { projectsRoot, holdingRoot, publishedRoot, relayRoot } = resolveRoots(config);

    if (!projectsRoot) {
      res.status(400).json(errResponse('projectsRootDirectory not configured'));
      return;
    }
    if (!holdingRoot) {
      res.status(400).json(errResponse('holdingPath not configured'));
      return;
    }

    const localDir = path.join(projectsRoot, code);
    const holdingDir = path.join(holdingRoot, code);

    try {
      if (!(await checkSsdMounted(holdingRoot))) {
        res.status(400).json(errResponse('Holding SSD is not mounted'));
        return;
      }

      const tree = await getStorageTree(code, {
        projectsRoot,
        holdingRoot,
        publishedRoot,
        relayRoot,
      });

      // P8: refuse when storage is degraded
      if (tree.degraded) {
        res.status(409).json(
          errResponse(
            `Project is in a degraded storage state; resolve manually before mutating. Details: ${tree.error ?? 'unknown'}`,
            tree.state,
          ),
        );
        return;
      }

      if (tree.state !== 'held') {
        res.status(400).json(
          errResponse(`Cannot restore-held: project is in state '${tree.state}'`, tree.state),
        );
        return;
      }

      // Ensure local dir exists
      await fs.mkdir(localDir, { recursive: true });

      const excludeArgs = holdExcludeArgs();
      for (const sub of HEAVY_SUBFOLDERS) {
        const src = path.join(holdingDir, sub);
        const dest = path.join(localDir, sub);
        try {
          const stat = await fs.stat(src);
          if (!stat.isDirectory()) continue;
        } catch {
          continue;
        }
        await fs.mkdir(dest, { recursive: true });
        await spawnAsync('rsync', ['-a', ...excludeArgs, src + '/', dest + '/']);
      }

      await logActivity(code, 'restore-held', tree.sizes.heldTotal);
      res.json(okResponse('active'));
    } catch (error) {
      console.error(`[storage-panel] restore-held error for ${code}:`, error);
      res.status(500).json(errResponse(String(error)));
    }
  });

  // -------------------------------------------------------------------------
  // POST /:code/archive
  // Copy WHOLE local folder → PUBLISHED/<brand>/<code>/ (flat, no buckets),
  // verify, then delete local folder entirely. Relay-blocked guard applies.
  //
  // P1: refuse when PUBLISHED destination already has real content.
  // P4: verify by fileCount AND totalBytes (reusing verifyDirsMatch).
  // -------------------------------------------------------------------------
  router.post('/:code/archive', async (req: Request, res: Response) => {
    const code = queryString(req.params.code);
    if (!isValidCode(code)) {
      res.status(400).json(errResponse('Invalid project code'));
      return;
    }
    const config = getConfig();
    const { projectsRoot, holdingRoot, publishedRoot, relayRoot } = resolveRoots(config);

    if (!projectsRoot) {
      res.status(400).json(errResponse('projectsRootDirectory not configured'));
      return;
    }
    if (!publishedRoot) {
      res.status(400).json(errResponse('publishedPath not configured'));
      return;
    }

    const localDir = path.join(projectsRoot, code);
    const publishedDir = path.join(publishedRoot, code);

    try {
      if (!(await checkSsdMounted(publishedRoot))) {
        res.status(400).json(errResponse('Published SSD is not mounted'));
        return;
      }

      const tree = await getStorageTree(code, {
        projectsRoot,
        holdingRoot,
        publishedRoot,
        relayRoot,
      });

      // P8: refuse when storage is degraded
      if (tree.degraded) {
        res.status(409).json(
          errResponse(
            `Project is in a degraded storage state; resolve manually before mutating. Details: ${tree.error ?? 'unknown'}`,
            tree.state,
          ),
        );
        return;
      }

      if (tree.state === 'archived') {
        res.status(400).json(errResponse('Already archived', tree.state));
        return;
      }
      // Also allow archive from `held` state but the local folder must still
      // exist with its light content. For simplicity in WU1, require `active`
      // — `held → archive` shortcut is a UI concern (WU2) that restores first.
      if (tree.state !== 'active') {
        res.status(400).json(
          errResponse(`Cannot archive: project is in state '${tree.state}' (restore first)`, tree.state),
        );
        return;
      }

      const relayBytes = await relayBytesFor(relayRoot, code);
      if (relayBytes > 0) {
        res.status(400).json(
          errResponse(
            `Relay is not empty (${relayBytes} bytes). Clear the Relay tool before archiving.`,
            tree.state,
          ),
        );
        return;
      }

      // P1: refuse when the PUBLISHED destination already has real content.
      // hasAnyContent is computed via getDirStats which already filters
      // .DS_Store / ._* (see getDirStats → readdir → isFile + stat walk).
      if (await pathExists(publishedDir)) {
        const existing = await getDirStats(publishedDir);
        if (existing.fileCount > 0) {
          res.status(409).json(
            errResponse(
              'PUBLISHED destination already has content for this project; resolve manually before archiving',
              tree.state,
            ),
          );
          return;
        }
      }

      await fs.mkdir(publishedDir, { recursive: true });

      const excludeArgs = holdExcludeArgs();
      await spawnAsync('rsync', ['-a', ...excludeArgs, localDir + '/', publishedDir + '/']);

      // P4: verify by file count AND total bytes (reuse verifyDirsMatch)
      const v = await verifyDirsMatch(localDir, publishedDir);
      if (!v.ok) {
        res.status(500).json(
          errResponse(
            `Archive verification failed: local=${v.srcFiles} files/${v.srcBytes} bytes, published=${v.destFiles} files/${v.destBytes} bytes. Local NOT deleted.`,
            tree.state,
          ),
        );
        return;
      }

      // Safety: must be inside projectsRoot and not equal to it
      const resolvedLocal = path.resolve(localDir);
      const resolvedRoot = path.resolve(projectsRoot);
      if (
        resolvedLocal === resolvedRoot ||
        !resolvedLocal.startsWith(resolvedRoot + path.sep)
      ) {
        res.status(500).json(errResponse('Safety gate: resolved local path is outside projectsRoot'));
        return;
      }

      await fs.rm(localDir, { recursive: true, force: true });

      await logActivity(code, 'archive', tree.sizes.localTotal);
      res.json(okResponse('archived'));
    } catch (error) {
      console.error(`[storage-panel] archive error for ${code}:`, error);
      res.status(500).json(errResponse(String(error)));
    }
  });

  // -------------------------------------------------------------------------
  // POST /:code/unarchive
  // Copy whole PUBLISHED folder → local. T7 copy stays.
  //
  // P2: refuse when local dir already exists (even empty shell).
  // -------------------------------------------------------------------------
  router.post('/:code/unarchive', async (req: Request, res: Response) => {
    const code = queryString(req.params.code);
    if (!isValidCode(code)) {
      res.status(400).json(errResponse('Invalid project code'));
      return;
    }
    const config = getConfig();
    const { projectsRoot, holdingRoot, publishedRoot, relayRoot } = resolveRoots(config);

    if (!projectsRoot) {
      res.status(400).json(errResponse('projectsRootDirectory not configured'));
      return;
    }
    if (!publishedRoot) {
      res.status(400).json(errResponse('publishedPath not configured'));
      return;
    }

    const localDir = path.join(projectsRoot, code);
    const publishedDir = path.join(publishedRoot, code);

    try {
      if (!(await checkSsdMounted(publishedRoot))) {
        res.status(400).json(errResponse('Published SSD is not mounted'));
        return;
      }

      const tree = await getStorageTree(code, {
        projectsRoot,
        holdingRoot,
        publishedRoot,
        relayRoot,
      });

      // P8: refuse when storage is degraded
      if (tree.degraded) {
        res.status(409).json(
          errResponse(
            `Project is in a degraded storage state; resolve manually before mutating. Details: ${tree.error ?? 'unknown'}`,
            tree.state,
          ),
        );
        return;
      }

      if (tree.state !== 'archived') {
        res.status(400).json(
          errResponse(`Cannot unarchive: project is in state '${tree.state}'`, tree.state),
        );
        return;
      }

      // P2: refuse when local dir already exists at all.
      if (await pathExists(localDir)) {
        res.status(409).json(
          errResponse(
            'Local folder already exists; resolve manually before unarchiving',
            tree.state,
          ),
        );
        return;
      }

      await fs.mkdir(localDir, { recursive: true });

      const excludeArgs = holdExcludeArgs();
      await spawnAsync('rsync', ['-a', ...excludeArgs, publishedDir + '/', localDir + '/']);

      await logActivity(code, 'unarchive', tree.sizes.archivedTotal);
      res.json(okResponse('active'));
    } catch (error) {
      console.error(`[storage-panel] unarchive error for ${code}:`, error);
      res.status(500).json(errResponse(String(error)));
    }
  });

  // -------------------------------------------------------------------------
  // POST /:code/held-archive  (P1, review patch)
  // Atomic Held → Archive transition. The earlier client-side two-step chain
  // (restore then archive) left an orphan HOLDING copy mid-sequence, which
  // made the tree read `degraded` and locked the user out. This endpoint
  // performs the whole transition server-side with verify-before-destroy:
  //   1) restore heavy subfolders HOLDING → local (rsync)
  //   2) verify restored dirs match HOLDING (verifyDirsMatch)
  //   3) rsync whole local → PUBLISHED
  //   4) verify PUBLISHED matches local (verifyDirsMatch)
  //   5) delete local folder
  //   6) delete HOLDING folder
  // Any failure short-circuits BEFORE a destructive step (5+6).
  // -------------------------------------------------------------------------
  router.post('/:code/held-archive', async (req: Request, res: Response) => {
    const code = queryString(req.params.code);
    if (!isValidCode(code)) {
      res.status(400).json(errResponse('Invalid project code'));
      return;
    }
    const config = getConfig();
    const { projectsRoot, holdingRoot, publishedRoot, relayRoot } = resolveRoots(config);

    if (!projectsRoot) {
      res.status(400).json(errResponse('projectsRootDirectory not configured'));
      return;
    }
    if (!holdingRoot) {
      res.status(400).json(errResponse('holdingPath not configured'));
      return;
    }
    if (!publishedRoot) {
      res.status(400).json(errResponse('publishedPath not configured'));
      return;
    }

    const localDir = path.join(projectsRoot, code);
    const holdingDir = path.join(holdingRoot, code);
    const publishedDir = path.join(publishedRoot, code);

    try {
      // Mount check: both HOLDING and PUBLISHED live on T7 — if either is
      // unreachable we must refuse before doing any disk work.
      if (!(await checkSsdMounted(holdingRoot))) {
        res.status(400).json(errResponse('Holding SSD is not mounted'));
        return;
      }
      if (!(await checkSsdMounted(publishedRoot))) {
        res.status(400).json(errResponse('Published SSD is not mounted'));
        return;
      }

      const tree = await getStorageTree(code, {
        projectsRoot,
        holdingRoot,
        publishedRoot,
        relayRoot,
      });

      if (tree.degraded) {
        res.status(409).json(
          errResponse(
            `Project is in a degraded storage state; resolve manually before mutating. Details: ${tree.error ?? 'unknown'}`,
            tree.state,
          ),
        );
        return;
      }

      if (tree.state !== 'held') {
        res.status(400).json(
          errResponse(`Cannot held-archive: project is in state '${tree.state}'`, tree.state),
        );
        return;
      }

      const relayBytes = await relayBytesFor(relayRoot, code);
      if (relayBytes > 0) {
        res.status(400).json(
          errResponse(
            `Relay is not empty (${relayBytes} bytes). Clear the Relay tool before archiving.`,
            tree.state,
          ),
        );
        return;
      }

      // P1: refuse when the PUBLISHED destination already has real content.
      if (await pathExists(publishedDir)) {
        const existing = await getDirStats(publishedDir);
        if (existing.fileCount > 0) {
          res.status(409).json(
            errResponse(
              'PUBLISHED destination already has content for this project; resolve manually before archiving',
              tree.state,
            ),
          );
          return;
        }
      }

      await fs.mkdir(localDir, { recursive: true });

      const excludeArgs = holdExcludeArgs();

      // Step 1: restore HOLDING heavy subfolders → local (rsync + verify).
      const restoredSubfolders: string[] = [];
      for (const sub of HEAVY_SUBFOLDERS) {
        const src = path.join(holdingDir, sub);
        const dest = path.join(localDir, sub);
        try {
          const stat = await fs.stat(src);
          if (!stat.isDirectory()) continue;
        } catch {
          continue;
        }
        await fs.mkdir(dest, { recursive: true });
        try {
          await spawnAsync('rsync', ['-a', ...excludeArgs, src + '/', dest + '/']);
        } catch (err) {
          res.status(500).json(
            errResponse(
              `Held-archive Pass-1 rsync failed for '${sub}': ${String(err)}. Nothing destructive has been done. Restored subfolders: ${restoredSubfolders.concat(sub).join(', ')}`,
              tree.state,
            ),
          );
          return;
        }
        // Step 2: verify per-subfolder HOLDING↔local match.
        const v = await verifyDirsMatch(src, dest);
        if (!v.ok) {
          res.status(500).json(
            errResponse(
              `Held-archive restore verification failed for '${sub}': holding=${v.srcFiles} files/${v.srcBytes} bytes, local=${v.destFiles} files/${v.destBytes} bytes. Nothing destructive has been done.`,
              tree.state,
            ),
          );
          return;
        }
        restoredSubfolders.push(sub);
      }

      // Step 3: rsync whole local → PUBLISHED.
      await fs.mkdir(publishedDir, { recursive: true });
      try {
        await spawnAsync('rsync', ['-a', ...excludeArgs, localDir + '/', publishedDir + '/']);
      } catch (err) {
        res.status(500).json(
          errResponse(
            `Held-archive publish rsync failed: ${String(err)}. Local restore succeeded — nothing destructive has been done.`,
            tree.state,
          ),
        );
        return;
      }

      // Step 4: verify PUBLISHED matches local.
      const pubVerify = await verifyDirsMatch(localDir, publishedDir);
      if (!pubVerify.ok) {
        res.status(500).json(
          errResponse(
            `Held-archive publish verification failed: local=${pubVerify.srcFiles} files/${pubVerify.srcBytes} bytes, published=${pubVerify.destFiles} files/${pubVerify.destBytes} bytes. Nothing destructive has been done.`,
            tree.state,
          ),
        );
        return;
      }

      // Safety: local must be inside projectsRoot, holding inside holdingRoot.
      const resolvedLocal = path.resolve(localDir);
      const resolvedProjectsRoot = path.resolve(projectsRoot);
      const resolvedHolding = path.resolve(holdingDir);
      const resolvedHoldingRoot = path.resolve(holdingRoot);
      if (
        resolvedLocal === resolvedProjectsRoot ||
        !resolvedLocal.startsWith(resolvedProjectsRoot + path.sep)
      ) {
        res.status(500).json(errResponse('Safety gate: resolved local path is outside projectsRoot'));
        return;
      }
      if (
        resolvedHolding === resolvedHoldingRoot ||
        !resolvedHolding.startsWith(resolvedHoldingRoot + path.sep)
      ) {
        res.status(500).json(errResponse('Safety gate: resolved holding path is outside holdingRoot'));
        return;
      }

      // Step 5 + 6: destructive. Both verifications passed — proceed.
      await fs.rm(localDir, { recursive: true, force: true });
      await fs.rm(holdingDir, { recursive: true, force: true });

      await logActivity(code, 'held-archive', tree.sizes.heldTotal + tree.sizes.localTotal);
      res.json(okResponse('archived'));
    } catch (error) {
      console.error(`[storage-panel] held-archive error for ${code}:`, error);
      res.status(500).json(errResponse(String(error)));
    }
  });

  // -------------------------------------------------------------------------
  // GET /:code/storage-activity?limit=10 — WU5: recent activity for project.
  // Returns most-recent-first. Tolerant of missing log file (returns []).
  // -------------------------------------------------------------------------
  router.get('/:code/storage-activity', async (req: Request, res: Response) => {
    const code = queryString(req.params.code);
    if (!isValidCode(code)) {
      res.status(400).json({ success: false, error: 'Invalid project code', entries: [] } satisfies StorageActivityResponse);
      return;
    }
    const rawLimit = Number(req.query.limit);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), 100) : 10;
    try {
      const entries = await readStorageActivity({
        projectCode: code,
        limit,
        logPath: getLogPath(),
      });
      res.json({ success: true, entries } satisfies StorageActivityResponse);
    } catch (error) {
      console.error(`[storage-panel] storage-activity error for ${code}:`, error);
      res.status(500).json({ success: false, error: String(error), entries: [] } satisfies StorageActivityResponse);
    }
  });

  return router;
}
