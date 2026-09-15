/**
 * W3 open contract, door 3 (flistudio docs/open-contract.md §3).
 *  GET  /api/context  — the current context: { context, missing, refused? }
 *  POST /api/context  — { brand, project, video? }: re-point the running app (C4).
 *    200 { context } · 400 { missing } / bad video · 404 unknown brand or project ·
 *    409 { candidates } when ambiguous (R31) · 503 registry or brand root unreadable.
 */
import { Router, Request, Response } from 'express';
import type { ContextController } from '../utils/openContext.js';
import { ContextBodySchema } from './contextSchemas.js';

const FIELDS = ['brand', 'project', 'video'] as const;

export function createContextRouter(controller: ContextController): Router {
  const router = Router();

  router.get('/', async (_req: Request, res: Response) => {
    res.json(await controller.getState());
  });

  router.post('/', async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    // An empty string is a missing argument (R25), not a malformed one.
    const given = Object.fromEntries(FIELDS.filter((f) => body[f] !== undefined && body[f] !== '').map((f) => [f, body[f]]));
    const parsed = ContextBodySchema.safeParse(given);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
      if (parsed.error.issues.every((i) => i.path[0] === 'video')) {
        const reason = `Video "${String(body.video)}" is not a <NN>-<name> folder name.`;
        return res.status(400).json({ error: reason, code: 'video-invalid', reason });
      }
      return res.status(400).json({ error: 'Invalid body', issues });
    }

    const result = await controller.applyContext(parsed.data, 'api');
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
