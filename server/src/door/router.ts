import { Router } from 'express';
import { answerJsonRpc, type CallAnswer } from '@flivideo/core';
import { FAILURE_CODES, flihubDescribe, flihubStatus, type DoorIdentity } from './describe.js';

export interface DoorDeps {
  identity: DoorIdentity;
  /** The brand + project FliHub is pointed at, or null. */
  context: () => Promise<{ brand: string; project: string } | null>;
}

/** `GET /api/describe` and `POST /api/rpc` (JSON-RPC 2.0, by-name params). Read-only; loopback like the rest of FliHub. */
export function createDoorRouter(deps: DoorDeps): Router {
  const router = Router();

  router.get('/describe', (_req, res) => {
    res.json(flihubDescribe(deps.identity));
  });

  const call = async (method: string): Promise<CallAnswer> => {
    if (method === 'system.describe') return { ok: true, value: flihubDescribe(deps.identity) };
    if (method === 'system.status') {
      return { ok: true, value: flihubStatus(deps.identity, await deps.context()) };
    }
    return {
      ok: false,
      error: { failureMode: 'unknown-capability', message: `FliHub's door has no "${method}" yet.` },
    };
  };

  router.post('/rpc', async (req, res) => {
    const answer = await answerJsonRpc(req.body, (m) => call(m), { codes: FAILURE_CODES });
    if (answer === null) {
      res.status(204).end();
      return;
    }
    res.json(answer);
  });

  return router;
}
