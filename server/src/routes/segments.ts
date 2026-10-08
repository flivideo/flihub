/**
 * CT-0107: segment editing — replace, insert, reorder, delete-and-close-up — as one guarded, journalled operation on
 * the active project (see utils/segmentOps.ts). A refusal answers 409 with `refused: true`, a plain `reason` and the
 * `blockers` behind it, and changes nothing on disk (FliHub's rule: a refusal never looks like success).
 */
import { Router, type Request, type Response } from 'express';
import path from 'path';
import type { Server } from 'socket.io';
import type { Config, TranscriptionJob } from '../../../shared/types.js';
import { getProjectPaths } from '../../../shared/paths.js';
import { expandPath } from '../utils/pathUtils.js';
import {
  SegmentOpFailed,
  SegmentOpRefused,
  applySegmentOp,
  readJournal,
  setPlaceholder,
  undoSegmentOp,
  type JournalEntry,
  type SegmentOpDeps,
  type SegmentOpInput,
} from '../utils/segmentOps.js';

export function createSegmentRoutes(
  getConfig: () => Config,
  io?: Server,
  queueTranscription?: (videoPath: string) => unknown,
  getActiveJob?: () => TranscriptionJob | null,
  getQueue?: () => TranscriptionJob[]
): Router {
  const router = Router();
  const project = () => expandPath(getConfig().projectDirectory);
  const deps = (): SegmentOpDeps => ({
    activeJob: getActiveJob ? getActiveJob() : null,
    queue: getQueue ? getQueue() : [],
    // No watch folder → no inbox → no take may be sent in (the op fails closed on an undefined inbox).
    inboxDir: getConfig().watchDirectory ? expandPath(getConfig().watchDirectory) : undefined,
  });
  const view = (e: JournalEntry) => ({
    id: e.id,
    at: e.at,
    summary: e.summary,
    mode: e.op.mode,
    renamed: e.renamed,
    trashed: e.steps
      .filter((s) => path.basename(path.dirname(s.to)) === '-trash')
      .map((s) => ({ from: path.basename(s.from), trashPath: s.to })),
    promoted: e.promoted.map((p) => p.filename),
    undoneAt: e.undoneAt ?? null,
  });
  const fail = (res: Response, error: unknown) => {
    if (error instanceof SegmentOpRefused) {
      res.status(409).json({
        success: false,
        refused: true,
        reason: error.message,
        blockers: error.blockers,
      });
      return;
    }
    console.error('[segment-op] failed:', error);
    res.status(500).json({
      success: false,
      refused: false,
      // SegmentOpFailed says whether every file went back; anything else failed before a file moved.
      reason:
        error instanceof SegmentOpFailed
          ? error.message
          : `Nothing was changed: ${error instanceof Error ? error.message : String(error)}`,
    });
  };

  /** POST /api/segments/op — `{ mode, chapter, segment | before, source? | sources?, name?, tags?, direction? }`. */
  router.post('/op', async (req: Request, res: Response) => {
    try {
      const entry = await applySegmentOp(project(), req.body as SegmentOpInput, deps());
      for (const promoted of queueTranscription ? entry.promoted : []) {
        const take = path.join(getProjectPaths(project()).recordings, promoted.filename);
        // The op has landed; a queue failure must not turn it into an error, but it must leave a trail.
        Promise.resolve(queueTranscription?.(take)).catch((e) =>
          console.error(`[segment-op] could not queue a transcript for ${take}:`, e)
        );
      }
      io?.emit('recordings:changed');
      res.json({ success: true, op: view(entry) });
    } catch (error) {
      fail(res, error);
    }
  });

  /** POST /api/segments/undo — `{ id? }`: the latest change, from the journal on disk (survives a restart). */
  router.post('/undo', async (req: Request, res: Response) => {
    try {
      const entry = await undoSegmentOp(project(), deps(), req.body?.id);
      io?.emit('recordings:changed');
      res.json({ success: true, op: view(entry) });
    } catch (error) {
      fail(res, error);
    }
  });

  /** POST /api/segments/placeholder — `{ filename, placeholder }`: R7, mark a segment to re-record (state only). */
  router.post('/placeholder', async (req: Request, res: Response) => {
    const { filename, placeholder } = (req.body ?? {}) as {
      filename?: unknown;
      placeholder?: unknown;
    };
    if (typeof filename !== 'string' || typeof placeholder !== 'boolean') {
      res.status(400).json({
        success: false,
        refused: true,
        reason: 'Send { filename, placeholder: true | false }.',
      });
      return;
    }
    try {
      await setPlaceholder(project(), filename, placeholder);
      io?.emit('recordings:changed');
      res.json({ success: true, filename, placeholder });
    } catch (error) {
      fail(res, error);
    }
  });

  /** GET /api/segments/journal — the project's segment changes, newest first. */
  router.get('/journal', async (_req: Request, res: Response) => {
    const journal = await readJournal(project());
    res.json({ success: true, entries: journal.entries.map(view).reverse() });
  });

  return router;
}
