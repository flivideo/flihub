/**
 * MicCheck write routes — mounted at /api/miccheck.
 *
 *   POST /session/start       -> { sessionId }
 *   POST /session/:id/tick    -> accepts one ~1 Hz rolling sample
 *   POST /session/:id/finish  -> finalises, writes the report to disk
 *
 * Reads live under /api/query/miccheck/* — see routes/query/miccheck.ts. That split
 * matches the rest of the server: /api/query is the read namespace the `flihub`
 * skill already reaches, mutations stay outside it.
 */

import { Router, Request, Response } from 'express';
import type { Server } from 'socket.io';
import type {
  Config,
  ClientToServerEvents,
  ServerToClientEvents,
  MicCheckTick,
  MicCheckMode,
} from '../../../shared/types.js';
import {
  startSession,
  appendTick,
  appendEvent,
  setRoomReference,
  finishSession,
  getActiveSession,
  defaultMicCheckDir,
} from '../utils/micCheckStore.js';

type IO = Server<ClientToServerEvents, ServerToClientEvents>;

/** Coerce an incoming number, mapping non-finite values to null rather than 0. */
function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function int(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

export function createMicCheckRoutes(
  getConfig: () => Config,
  io?: IO,
  dir: string = defaultMicCheckDir()
): Router {
  const router = Router();

  // POST /session/start
  router.post('/session/start', (req: Request, res: Response) => {
    const body = req.body ?? {};
    const device = body.device ?? {};

    if (!device.label || typeof device.label !== 'string') {
      res.status(400).json({ success: false, error: 'device.label is required' });
      return;
    }

    const config = getConfig();
    const session = startSession({
      device: {
        label: device.label,
        sampleRate: num(device.sampleRate),
        channelCount: num(device.channelCount),
        sampleSize: num(device.sampleSize),
      },
      // Recorded so a report can be attached to a take later, even though the
      // report itself is filed globally.
      projectCode: body.projectCode ?? config.activeProject ?? null,
      workletVersion: typeof body.workletVersion === 'string' ? body.workletVersion : null,
      constraints: body.constraints ?? null,
    });

    console.log(`[MicCheck] session started: ${session.sessionId} (${device.label})`);
    io?.emit('miccheck:started', { sessionId: session.sessionId });

    res.json({ success: true, sessionId: session.sessionId, startedAt: session.startedAt });
  });

  // POST /session/:id/tick
  router.post('/session/:id/tick', (req: Request, res: Response) => {
    const sessionId = String(req.params.id);
    const body = req.body ?? {};

    // Mode is DECLARED by the client, never guessed here. An unrecognised value is
    // rejected rather than defaulted — silently assuming 'speaking' would grade room
    // tone as a voice.
    const mode: MicCheckMode | null =
      body.mode === 'room' || body.mode === 'speaking' ? body.mode : null;
    if (!mode) {
      res.status(400).json({
        success: false,
        error: 'tick requires mode: "room" | "speaking" — it is declared, never inferred',
      });
      return;
    }

    const tick: MicCheckTick = {
      t: int(body.t),
      mode,
      shortTermLufs: num(body.shortTermLufs),
      samplePeakDbfs: num(body.samplePeakDbfs),
      clipCount: int(body.clipCount),
      nearClipCount: int(body.nearClipCount),
      windowFull: body.windowFull === true,
      speechDetected: body.speechDetected === true,
    };

    const accepted = appendTick(sessionId, tick);

    if (!accepted) {
      // A stale tab posting into a finished run. 409, not 404: the resource concept
      // exists, this client is simply no longer the live one.
      res.status(409).json({
        success: false,
        error: 'No active session with that id — it was finished or superseded.',
      });
      return;
    }

    // Intent vs behaviour disagreeing is itself a finding: speech during a room capture
    // contaminates the reference every later comparison depends on.
    if (tick.mode === 'room' && tick.speechDetected) {
      appendEvent(sessionId, {
        t: tick.t,
        kind: 'room-contaminated',
        label: 'Speech detected during room capture — reference may be contaminated',
      });
    }

    io?.emit('miccheck:tick', { sessionId, tick });
    res.json({ success: true });
  });

  // POST /session/:id/event — client-detected observations that cannot be re-derived
  // from the 1 Hz series (a level step is defined over 500 ms).
  router.post('/session/:id/event', (req: Request, res: Response) => {
    const sessionId = String(req.params.id);
    const body = req.body ?? {};
    if (typeof body.kind !== 'string' || typeof body.label !== 'string') {
      res.status(400).json({ success: false, error: 'event requires kind and label' });
      return;
    }
    const ok = appendEvent(sessionId, {
      t: int(body.t),
      kind: body.kind,
      label: body.label,
      deltaDb: num(body.deltaDb) ?? undefined,
    });
    if (!ok) {
      res.status(409).json({ success: false, error: 'No active session with that id' });
      return;
    }
    res.json({ success: true });
  });

  // POST /session/:id/room-reference — store the captured noise floor
  router.post('/session/:id/room-reference', (req: Request, res: Response) => {
    const sessionId = String(req.params.id);
    const ok = setRoomReference(sessionId, num((req.body ?? {}).lufs));
    if (!ok) {
      res.status(409).json({ success: false, error: 'No active session with that id' });
      return;
    }
    res.json({ success: true });
  });

  // POST /session/:id/finish
  router.post('/session/:id/finish', async (req: Request, res: Response) => {
    const sessionId = String(req.params.id);
    const body = req.body ?? {};

    const session = await finishSession(
      {
        sessionId,
        probe: body.probe ?? undefined,
        constraints: body.constraints ?? undefined,
        notMeasured: Array.isArray(body.not_measured) ? body.not_measured : undefined,
      },
      dir
    );

    if (!session) {
      res.status(409).json({
        success: false,
        error: 'No active session with that id — it was already finished or superseded.',
      });
      return;
    }

    console.log(
      `[MicCheck] session finished: ${sessionId} — ${session.summary?.tickCount ?? 0} ticks, ` +
        `${session.summary?.measurableTickCount ?? 0} measurable`
    );
    io?.emit('miccheck:finished', { sessionId });

    res.json({ success: true, session });
  });

  // POST /session/abandon — the tab closed without finishing.
  // Explicit so a stale run cannot masquerade as live forever.
  router.post('/session/abandon', async (_req: Request, res: Response) => {
    const active = getActiveSession();
    if (!active) {
      res.json({ success: true, abandoned: null });
      return;
    }
    const session = await finishSession(
      {
        sessionId: active.sessionId,
        notMeasured: [
          {
            metric: 'session.completeness',
            reason: 'Session was abandoned (tab closed or stopped abruptly), not finished cleanly.',
          },
        ],
      },
      dir
    );
    io?.emit('miccheck:finished', { sessionId: session?.sessionId ?? '' });
    res.json({ success: true, abandoned: session?.sessionId ?? null });
  });

  return router;
}
