/**
 * W3 open contract, door 3 (flistudio docs/open-contract.md §3).
 *  GET  /api/context  — the current context: { context, missing, refused? }
 *  POST /api/context  — { brand, project, video? }: re-point the running app (C4).
 *    200 { context } · 400 { missing } / bad video · 404 unknown brand or project ·
 *    409 { candidates } when ambiguous (R31) · 503 registry or brand root unreadable.
 */
import { Router, Request, Response } from 'express';
import type { RawOpenArgs } from '@flivideo/core';
import type { ContextController } from '../utils/openContext.js';

function field(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined;
}

export function createContextRouter(controller: ContextController): Router {
  const router = Router();

  router.get('/', async (_req: Request, res: Response) => {
    res.json(await controller.getState());
  });

  router.post('/', async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const args: RawOpenArgs = {};
    const brand = field(body.brand);
    const project = field(body.project);
    const video = field(body.video);
    if (brand) args.brand = brand;
    if (project) args.project = project;
    if (video) args.video = video;

    const result = await controller.applyContext(args, 'api');
    switch (result.kind) {
      case 'applied':
        return res.json({ context: result.state.context });
      case 'missing':
        return res.status(400).json({ error: `Missing: ${result.missing.join(', ')}`, missing: result.missing });
      case 'refused':
        return res.status(result.status).json({ error: result.refusal.reason, ...result.refusal });
    }
  });

  return router;
}
