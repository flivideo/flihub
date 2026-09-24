// 2026-09-25 (David, live on d01): Undo left 01-2-intro-HOOK.{txt,srt,json} behind. A NEW take
// renamed 01-2-intro-HOOK.mov then skipped transcription ("already exists") and showed the old
// take's words. Two fixes: a transcript counts only when it is at least as new as its recording
// (never on name alone), and Undo moves the undone take's transcripts to the project's -trash.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createRoutes } from '../routes/index.js';
import { createTranscriptionRoutes } from '../routes/transcriptions.js';
import { getProjectPaths } from '../../../shared/paths.js';
import type { Config, FileInfo } from '../../../shared/types.js';

let tmp: string;
let project: string;
let config: Config;
let paths: ReturnType<typeof getProjectPaths>;

const setMtime = (p: string, secondsAgo: number) => {
  const t = new Date(Date.now() - secondsAgo * 1000);
  fs.utimesSync(p, t, t);
};
const writeTranscripts = (base: string, secondsAgo: number) => {
  fs.mkdirSync(paths.transcripts, { recursive: true });
  for (const ext of ['txt', 'srt', 'json']) {
    const p = path.join(paths.transcripts, `${base}.${ext}`);
    fs.writeFileSync(p, `old words for ${base}`);
    setMtime(p, secondsAgo);
  }
};

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stale-tx-'));
  project = path.join(tmp, 'd01-test');
  fs.mkdirSync(path.join(project, 'recordings'), { recursive: true });
  fs.mkdirSync(path.join(tmp, 'ecamm'), { recursive: true });
  config = {
    watchDirectory: path.join(tmp, 'ecamm'),
    projectDirectory: project,
    fileExtensions: ['.mov'],
    availableTags: [],
    commonNames: [],
    imageSourceDirectory: tmp,
  } as unknown as Config;
  paths = getProjectPaths(project);
});
afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

const txApp = () => {
  const app = express();
  app.use(express.json());
  const io = { emit: () => undefined } as never;
  app.use('/api/transcriptions', createTranscriptionRoutes(() => config, io).router);
  return app;
};

describe('a transcript older than its recording is not attached', () => {
  it('stale (transcript written before this take): status is not complete, and it counts as pending', async () => {
    writeTranscripts('01-2-intro-HOOK', 240); // from the undone take, 4 min ago
    const video = path.join(paths.recordings, '01-2-intro-HOOK.mov');
    fs.writeFileSync(video, 'new take'); // recorded just now

    const status = await request(txApp()).get('/api/transcriptions/status/01-2-intro-HOOK.mov');
    expect(status.body.status).not.toBe('complete');
    expect(status.body.transcriptPath).toBeNull();

    const pending = await request(txApp()).get('/api/transcriptions/pending-count');
    expect(pending.body.pendingCount).toBe(1);
  });

  it('fresh (transcript written after the take): complete, nothing pending', async () => {
    const video = path.join(paths.recordings, '01-1-intro-HOOK.mov');
    fs.writeFileSync(video, 'take');
    setMtime(video, 300);
    writeTranscripts('01-1-intro-HOOK', 240);

    const status = await request(txApp()).get('/api/transcriptions/status/01-1-intro-HOOK.mov');
    expect(status.body.status).toBe('complete');
    const pending = await request(txApp()).get('/api/transcriptions/pending-count');
    expect(pending.body.pendingCount).toBe(0);
  });
});

describe('Undo moves the undone take\'s transcripts to -trash', () => {
  it('renamed → transcribed → undone: no transcript is left under the freed name', async () => {
    const pending = new Map<string, FileInfo>();
    const raw = path.join(tmp, 'ecamm', 'raw.mov');
    fs.writeFileSync(raw, 'x');
    pending.set(raw, { path: raw, filename: 'raw.mov', timestamp: '', size: 1 });
    const app = express();
    app.use(express.json());
    app.use('/api', createRoutes(pending, config, (c) => Object.assign(config, c)));

    const renamed = await request(app)
      .post('/api/rename')
      .send({ originalPath: raw, chapter: '01', sequence: '2', name: 'intro', tags: ['HOOK'] });
    expect(renamed.status).toBe(200);
    writeTranscripts('01-2-intro-HOOK', 0);

    const recent = await request(app).get('/api/recordings/recent-renames');
    const id = (recent.body.renames ?? recent.body)[0].id;
    const undone = await request(app).post('/api/recordings/undo-rename').send({ id });
    expect(undone.body.success).toBe(true);

    expect(fs.existsSync(raw)).toBe(true);
    const left = fs.existsSync(paths.transcripts) ? fs.readdirSync(paths.transcripts) : [];
    expect(left.filter((f) => f.startsWith('01-2-intro-HOOK.'))).toEqual([]);
    expect(fs.readdirSync(paths.trash).sort()).toEqual(
      ['01-2-intro-HOOK.json', '01-2-intro-HOOK.srt', '01-2-intro-HOOK.txt'],
    );
    expect(undone.body.trashedTranscripts).toHaveLength(3);
  });
});
