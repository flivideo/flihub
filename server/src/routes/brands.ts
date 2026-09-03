/**
 * Brand switching API.
 *  GET  /api/brands         — list brands (brands.json + unregistered v-* roots)
 *  POST /api/brands/switch  — { key }: point FliHub at that brand's root.
 *
 * A switch sets projectsRootDirectory, clears activeProject, and moves the two
 * T7 paths WITH the root (publishedPath from brands.json ssd_backup when present,
 * holdingPath derived) so the paths can never desynchronise from the brand.
 */
import { Router, Request, Response } from 'express';
import type { Server as SocketServer } from 'socket.io';
import type { Config, ServerToClientEvents, ClientToServerEvents } from '../../../shared/types.js';
import { expandPath } from '../utils/pathUtils.js';
import { listBrands } from '../utils/brands.js';

export function createBrandsRouter(
  getConfig: () => Config,
  updateConfig: (newConfig: Partial<Config>) => Config,
  io: SocketServer<ClientToServerEvents, ServerToClientEvents>
): Router {
  const router = Router();

  router.get('/', async (_req: Request, res: Response) => {
    try {
      const currentRoot = expandPath(getConfig().projectsRootDirectory || '');
      const brands = await listBrands(currentRoot);
      res.json({
        success: true,
        brands,
        activeKey: brands.find((b) => b.active)?.key ?? null,
      });
    } catch (error) {
      console.error('[brands] list failed:', error);
      res.status(500).json({ success: false, error: 'Failed to list brands' });
    }
  });

  router.post('/switch', async (req: Request, res: Response) => {
    const { key } = req.body as { key?: unknown };
    if (typeof key !== 'string' || !key) {
      return res.status(400).json({ success: false, error: 'Missing brand key' });
    }
    try {
      const currentRoot = expandPath(getConfig().projectsRootDirectory || '');
      const brands = await listBrands(currentRoot);
      const brand = brands.find((b) => b.key === key);
      if (!brand) {
        return res.status(404).json({ success: false, error: `Unknown brand: ${key}` });
      }
      const updated = updateConfig({
        projectsRootDirectory: brand.root,
        activeProject: '', // never leave the old brand's project dangling
        ...(brand.publishedPath ? { publishedPath: brand.publishedPath } : {}),
        ...(brand.holdingPath ? { holdingPath: brand.holdingPath } : {}),
      });
      console.log(`[brands] Switched to ${brand.key} (${brand.root})`);
      io.emit('projects:changed');
      io.emit('recordings:changed');
      res.json({
        success: true,
        brand: { key: brand.key, name: brand.name, root: brand.root },
        activeProject: updated.activeProject ?? '',
      });
    } catch (error) {
      console.error('[brands] switch failed:', error);
      res.status(500).json({ success: false, error: 'Failed to switch brand' });
    }
  });

  return router;
}
