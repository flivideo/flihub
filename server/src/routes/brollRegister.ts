/**
 * FR-177: POST /api/broll-register — the purple B-roll button.
 * Registers an incoming take with B-Roll Pilot (`broll.register`, place:'copy'). On success the take
 * is cleared from Incoming by moving the ORIGINAL into <project>/-trash/ (recoverable), only after
 * FliStudio's registered file is verified on disk. On any refusal the take stays exactly where it is.
 */
import { Router, Request, Response } from 'express';
import fs from 'fs-extra';
import path from 'path';
import type { Config, FileInfo } from '../../../shared/types.js';
import { getProjectPaths } from '../../../shared/paths.js';
import { expandPath } from '../utils/pathUtils.js';
import { registerBroll, type BrollRegisterResult } from '../utils/brollRegister.js';

export type BrollRegisterFn = (
  input: Parameters<typeof registerBroll>[0]
) => Promise<BrollRegisterResult>;

/** brand key from the brand root (…/v-appydave → appydave). */
export function brandKeyOf(config: Config): string {
  const root = expandPath(config.projectsRootDirectory || '');
  const base = path.basename(root);
  return base.startsWith('v-') ? base.slice(2) : base;
}

export function createBrollRegisterRouter(
  pendingFiles: Map<string, FileInfo>,
  getConfig: () => Config,
  register: BrollRegisterFn = registerBroll
): Router {
  const router = Router();

  router.post('/', async (req: Request, res: Response) => {
    const { path: filePath, name, tags } = req.body as {
      path?: unknown;
      name?: unknown;
      tags?: unknown;
    };
    if (typeof filePath !== 'string' || !pendingFiles.has(filePath)) {
      res.status(400).json({ success: false, refusal: 'invalid-input', error: 'That take is not in Incoming' });
      return;
    }
    const cleanTags = Array.isArray(tags)
      ? tags.filter((t): t is string => typeof t === 'string').map((t) => t.trim()).filter(Boolean)
      : [];
    const config = getConfig();
    const projectDir = expandPath(config.projectDirectory);
    const project = config.activeProject || path.basename(projectDir);
    if (!project) {
      res.status(409).json({ success: false, refusal: 'project-not-found', error: 'Which project? Open a project first' });
      return;
    }
    if (!(await fs.pathExists(filePath))) {
      pendingFiles.delete(filePath);
      res.status(404).json({ success: false, refusal: 'file-not-found', error: 'File not found — not added' });
      return;
    }

    const stat = await fs.stat(filePath);
    const base = path.basename(filePath, path.extname(filePath));
    const result = await register({
      brand: brandKeyOf(config),
      project,
      file: filePath,
      title: typeof name === 'string' && name.trim() ? name.trim() : undefined,
      tags: cleanTags,
      takeId: `ecamm:${base}`,
      recordedAt: (stat.birthtime ?? stat.mtime).toISOString(),
    });

    if (!result.ok) {
      // Refusal: the take is untouched and still in Incoming. Say which refusal it was.
      res.status(result.refusal === 'unavailable' ? 503 : 422).json({
        success: false,
        refusal: result.refusal,
        error: result.message,
      });
      return;
    }

    // Verify FliStudio really holds the take before the original leaves Incoming.
    if (!result.assetFile || !(await fs.pathExists(result.assetFile))) {
      res.status(502).json({
        success: false,
        refusal: 'failed',
        error: 'B-roll said OK but its copy is not on disk — take left in Incoming',
      });
      return;
    }

    try {
      const paths = getProjectPaths(projectDir);
      await fs.ensureDir(paths.trash);
      const filename = path.basename(filePath);
      let dest = path.join(paths.trash, filename);
      for (let n = 1; await fs.pathExists(dest); n++) {
        dest = path.join(paths.trash, `${path.basename(filename, path.extname(filename))}-${n}${path.extname(filename)}`);
      }
      await fs.move(filePath, dest);
      pendingFiles.delete(filePath);
      res.json({
        success: true,
        created: result.created,
        placed: result.placed,
        assetFile: result.assetFile,
        warnings: result.warnings,
        originalTrashedTo: dest,
      });
    } catch (error) {
      // Registered but could not clear Incoming: still a success for B-roll, say so plainly.
      res.json({
        success: true,
        created: result.created,
        placed: result.placed,
        assetFile: result.assetFile,
        warnings: [
          ...result.warnings,
          `Added to B-roll, but the original could not be moved out of Incoming: ${error instanceof Error ? error.message : String(error)}`,
        ],
        originalTrashedTo: null,
      });
    }
  });

  return router;
}
