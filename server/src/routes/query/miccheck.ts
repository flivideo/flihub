/**
 * MicCheck read routes — mounted at /api/query/miccheck.
 *
 *   GET /live          -> the run in progress, or an explicit "no run" answer
 *   GET /sessions      -> list of finished reports
 *   GET /sessions/:id  -> one full report
 *
 * Under /api/query because that is the namespace the `flihub` skill reaches.
 *
 * THE LOAD-BEARING BIT IS /live. It reports three states that must never collapse
 * into one another:
 *
 *   active=false                  -> no run in progress
 *   active=true, measurable=false -> running, nothing gradeable yet, with the reason
 *   active=true, measurable=true  -> running and reading real numbers
 *
 * An empty or zeroed payload for the first two would rebuild, in the API, exactly the
 * grey-vs-green confusion the UI exists to avoid: an agent reading `shortTermLufs: 0`
 * or `{}` cannot tell "silent" from "not started" from "fine".
 */

import { Router, Request, Response } from 'express';
import type { Config, MicCheckLiveResponse } from '../../../../shared/types.js';
import {
  getActiveSession,
  listSessions,
  readSession,
  summarise,
  defaultMicCheckDir,
} from '../../utils/micCheckStore.js';

/** How many trailing ticks /live returns. 180 at 1 Hz = the last 3 minutes. */
const LIVE_WINDOW_TICKS = 180;

export function createMicCheckQueryRoutes(
  _getConfig: () => Config,
  dir: string = defaultMicCheckDir()
): Router {
  const router = Router();

  // GET /live
  router.get('/live', (_req: Request, res: Response) => {
    const active = getActiveSession();

    if (!active) {
      const payload: MicCheckLiveResponse = {
        success: true,
        active: false,
        measurable: false,
        reason: 'No MicCheck run is active. Open the Mic Check tab in FliHub and press Start monitoring.',
        session: null,
        latest: null,
      };
      res.json(payload);
      return;
    }

    const series = active.series.slice(-LIVE_WINDOW_TICKS);
    const latest = series.length > 0 ? series[series.length - 1] : null;

    // The rolling window is returned, not just the latest value: the question worth
    // answering mid-run is "is this level HOLDING or drifting?", and one instantaneous
    // number cannot answer it.
    const rolling = { ...active, series };

    let measurable = false;
    let reason: string | null = null;

    if (!latest) {
      reason = 'Run has started but no samples have arrived yet.';
    } else if (!latest.windowFull) {
      reason = 'The 3 s short-term window has not filled yet.';
    } else if (!latest.hasSpeech) {
      reason = 'Only room tone is present — no speech detected, so the level is not gradeable.';
    } else {
      measurable = true;
    }

    const payload: MicCheckLiveResponse = {
      success: true,
      active: true,
      measurable,
      reason,
      session: { ...rolling, summary: summarise(active.series) },
      latest,
    };
    res.json(payload);
  });

  // GET /sessions
  router.get('/sessions', async (req: Request, res: Response) => {
    const limitRaw = Number(req.query.limit);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(200, limitRaw) : 50;
    const sessions = await listSessions(dir, limit);
    res.json({ success: true, count: sessions.length, sessions });
  });

  // GET /sessions/:id
  router.get('/sessions/:id', async (req: Request, res: Response) => {
    const session = await readSession(String(req.params.id), dir);
    if (!session) {
      res.status(404).json({ success: false, error: 'Session report not found' });
      return;
    }
    res.json({ success: true, session });
  });

  return router;
}
