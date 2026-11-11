/**
 * Recording sets (fli-core v0.38.0): one project holds several sets of takes,
 * `hub/sets/<set>/{recordings,transcripts}/`, ordered and titled by `hub/sets.json`.
 *
 * FliHub works in one set at a time, the ACTIVE set (`shared/paths.ts` activeSetSync): every
 * `getProjectPaths(project)` resolves to it, so naming, the Recordings/Watch/Transcripts lists, take
 * actions and the watcher are scoped to it without each route knowing about sets.
 *
 *   GET  /api/sets          the strip + "All sets" overview (one row per set: takes, length)
 *   POST /api/sets/active   { set }               switch the active set
 *   POST /api/sets          { id, title?, role? } add a set — only to a project that already has sets
 *
 * A project without `hub/sets/` answers `hasSets: false` and is never changed here: moving a
 * project into sets is a migration that belongs to FliStudio.
 */
import { Router, type Request, type Response } from 'express';
import fs from 'fs-extra';
import path from 'path';
import type { Server } from 'socket.io';
import { SET_ID, addSet, hasSetsSync, listSetsSync } from '@flivideo/core';
import type {
  Config,
  RecordingSetChangeResponse,
  RecordingSetSummary,
  RecordingSetsResponse,
} from '../../../shared/types.js';
import { activeSetSync, getProjectPaths, writeActiveSetSync } from '../../../shared/paths.js';
import { isRecordingFile, stripRecordingExtension } from '../../../shared/naming.js';
import { expandPath } from '../utils/pathUtils.js';
import { getVideoDuration } from '../utils/videoDuration.js';

export const NOT_A_SET_PROJECT =
  'Moving this project into sets comes from FliStudio';

async function summarise(projectDir: string): Promise<RecordingSetSummary[]> {
  const out: RecordingSetSummary[] = [];
  for (const set of listSetsSync(projectDir)) {
    if (set.id === null) continue;
    const paths = getProjectPaths(projectDir, 'hub', set.id);
    let takes: string[] = [];
    try {
      takes = (await fs.readdir(paths.recordings)).filter((f) => isRecordingFile(f));
    } catch {
      takes = [];
    }
    let txt = new Set<string>();
    try {
      txt = new Set(
        (await fs.readdir(paths.transcripts))
          .filter((f) => f.endsWith('.txt') && !f.endsWith('-chapter.txt'))
          .map((f) => f.slice(0, -4))
      );
    } catch {
      txt = new Set();
    }
    const durations = await Promise.all(
      takes.map((f) => getVideoDuration(path.join(paths.recordings, f)))
    );
    out.push({
      id: set.id,
      title: set.title,
      role: set.role,
      listed: set.listed,
      takes: takes.length,
      chapters: new Set(takes.map((f) => f.split('-')[0])).size,
      durationSec: Math.round(durations.reduce<number>((a, d) => a + (d ?? 0), 0)),
      transcribed: takes.filter((f) => txt.has(stripRecordingExtension(f))).length,
    });
  }
  return out;
}

export function createSetRoutes(
  getConfig: () => Config,
  io: Server,
  /** Re-point the recordings + transcripts watchers after the active set changes. */
  onActiveSetChanged: (projectDir: string) => void
): Router {
  const router = Router();

  const projectDir = (): string | null => {
    const dir = getConfig().projectDirectory;
    return dir ? expandPath(dir) : null;
  };

  router.get('/', async (_req: Request, res: Response) => {
    const dir = projectDir();
    if (!dir) {
      res.json({ success: false, hasSets: false, active: null, sets: [], error: 'No project selected' } satisfies RecordingSetsResponse);
      return;
    }
    try {
      if (!hasSetsSync(dir)) {
        res.json({ success: true, hasSets: false, active: null, sets: [] } satisfies RecordingSetsResponse);
        return;
      }
      res.json({
        success: true,
        hasSets: true,
        active: activeSetSync(dir),
        sets: await summarise(dir),
      } satisfies RecordingSetsResponse);
    } catch (error) {
      res.status(500).json({ success: false, hasSets: false, active: null, sets: [], error: String(error) } satisfies RecordingSetsResponse);
    }
  });

  router.post('/active', async (req: Request, res: Response) => {
    const dir = projectDir();
    const set = typeof req.body?.set === 'string' ? req.body.set : '';
    if (!dir) {
      res.status(400).json({ success: false, reason: 'no-project', error: 'No project selected' } satisfies RecordingSetChangeResponse);
      return;
    }
    if (!hasSetsSync(dir)) {
      res.status(409).json({ success: false, reason: 'not-a-set-project', error: NOT_A_SET_PROJECT } satisfies RecordingSetChangeResponse);
      return;
    }
    if (!listSetsSync(dir).some((s) => s.id === set)) {
      res.status(404).json({ success: false, reason: 'no-such-set', error: `No such set: ${set}` } satisfies RecordingSetChangeResponse);
      return;
    }
    writeActiveSetSync(dir, set);
    onActiveSetChanged(dir);
    io.emit('sets:changed');
    io.emit('recordings:changed');
    io.emit('transcripts:changed');
    res.json({ success: true, active: set } satisfies RecordingSetChangeResponse);
  });

  router.post('/', async (req: Request, res: Response) => {
    const dir = projectDir();
    const id = typeof req.body?.id === 'string' ? req.body.id.trim() : '';
    const title = typeof req.body?.title === 'string' ? req.body.title : undefined;
    const role = req.body?.role === 'part' ? 'part' : 'video';
    if (!dir) {
      res.status(400).json({ success: false, reason: 'no-project', error: 'No project selected' } satisfies RecordingSetChangeResponse);
      return;
    }
    if (!hasSetsSync(dir)) {
      res.status(409).json({ success: false, reason: 'not-a-set-project', error: NOT_A_SET_PROJECT } satisfies RecordingSetChangeResponse);
      return;
    }
    if (!SET_ID.test(id)) {
      res.status(400).json({ success: false, reason: 'bad-id', error: 'Set id must be kebab-case (a-z, 0-9, single hyphens)' } satisfies RecordingSetChangeResponse);
      return;
    }
    if (listSetsSync(dir).some((s) => s.id === id)) {
      res.status(409).json({ success: false, reason: 'set-exists', error: `Set already exists: ${id}` } satisfies RecordingSetChangeResponse);
      return;
    }
    try {
      await addSet(dir, { id, title, role });
      io.emit('sets:changed');
      res.json({ success: true, active: activeSetSync(dir), sets: await summarise(dir) } satisfies RecordingSetChangeResponse);
    } catch (error) {
      res.status(500).json({ success: false, error: String(error) } satisfies RecordingSetChangeResponse);
    }
  });

  return router;
}
