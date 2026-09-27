// B584 through FliHub's own queue: POST /api/transcriptions/queue → FliTools (faked) → status.
// FliHub sends force_save and never touches old files itself: FliTools moves FliHub's old whisper
// output to -trash/<date>-pre-flitools only once a good transcript is saved (orch ruling). A failed
// job leaves the old transcript in place. suspect reaches the status route; FliTools down is loud.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createTranscriptionRoutes } from '../routes/transcriptions.js';
import { getProjectPaths } from '../../../shared/paths.js';
import type { FlitoolsClient, FlitoolsJobView } from '../utils/flitoolsClient.js';
import type { Config } from '../../../shared/types.js';

let tmp: string;
let project: string;
let config: Config;
let paths: ReturnType<typeof getProjectPaths>;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'b584-'));
  project = path.join(tmp, 'd06-test');
  fs.mkdirSync(path.join(project, 'recordings'), { recursive: true });
  config = { projectDirectory: project, projectsRootDirectory: tmp } as unknown as Config;
  paths = getProjectPaths(project);
});
afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

/** A FliTools that "transcribes" like the real one: force_save moves FliHub's old whisper files
 *  (json without schema) to -trash/<date>-pre-flitools at save time, then writes .txt last. */
function fakeFlitools(health: { suspect: boolean; reasons: string[] }, opts: { fail?: boolean } = {}) {
  const submitted: { path: string; force?: boolean; forceSave?: boolean; oldFilesPresent: boolean }[] = [];
  const client: FlitoolsClient = {
    baseUrl: 'http://fake-flitools',
    async submit(videoPath, o = {}) {
      const base = path.basename(videoPath, path.extname(videoPath));
      const files = { json: path.join(paths.transcripts, `${base}.json`), srt: path.join(paths.transcripts, `${base}.srt`), txt: path.join(paths.transcripts, `${base}.txt`) };
      submitted.push({ path: videoPath, ...o, oldFilesPresent: fs.existsSync(files.txt) });
      if (opts.fail) return { id: 'j1', status: 'failed', error: { failureMode: 'engine-error', message: 'groq quota and mlx failed' } } as FlitoolsJobView;
      const trashed: string[] = [];
      if (fs.existsSync(files.json)) {
        let schema: string | undefined;
        try { schema = JSON.parse(fs.readFileSync(files.json, 'utf8')).schema; } catch { schema = undefined; }
        if (schema !== 'flitools.transcript/1') {
          if (!o.forceSave) return { id: 'j1', status: 'done', result: { files: null, saveError: `owned by another app: ${files.json}` } } as FlitoolsJobView;
          const dir = path.join(project, '-trash', '2026-09-27-pre-flitools');
          fs.mkdirSync(dir, { recursive: true });
          for (const f of Object.values(files)) {
            if (fs.existsSync(f)) { const to = path.join(dir, path.basename(f)); fs.renameSync(f, to); trashed.push(to); }
          }
        }
      }
      fs.mkdirSync(paths.transcripts, { recursive: true });
      fs.writeFileSync(files.json, JSON.stringify({ schema: 'flitools.transcript/1', text: 'new words', segments: [], words: [], health }));
      fs.writeFileSync(files.srt, '1\n00:00:00,000 --> 00:00:01,000\nnew words\n');
      fs.writeFileSync(files.txt, 'new words'); // .txt last
      return { id: 'j1', status: 'done', pct: 100, health, result: { reused: null, files, trashed, transcript: { engine: { name: 'groq', model: 'whisper-large-v3' } } } } as FlitoolsJobView;
    },
    async job() {
      throw new Error('not polled — submit answered');
    },
  };
  return { client, submitted };
}

const appWith = (client: FlitoolsClient) => {
  const app = express();
  app.use(express.json());
  const io = { emit: () => undefined } as never;
  app.use('/api/transcriptions', createTranscriptionRoutes(() => config, io, client, { sleep: async () => undefined }).router);
  return app;
};

async function waitForStatus(app: express.Express, filename: string, want: string) {
  let body: { status?: string; health?: unknown; transcriptPath?: string } = {};
  for (let i = 0; i < 50; i++) {
    body = (await request(app).get(`/api/transcriptions/status/${filename}`)).body;
    if (body.status === want) return body;
    await new Promise((r) => setTimeout(r, 10));
  }
  return body;
}

describe('FliHub transcribes through FliTools', () => {
  it('forced redo: force_save, FliHub leaves old files for FliTools to move at save time; suspect reaches status', async () => {
    const video = path.join(paths.recordings, '03-2-setup.mov');
    fs.writeFileSync(video, 'take');
    const t = new Date(Date.now() - 600_000);
    fs.utimesSync(video, t, t);
    fs.mkdirSync(paths.transcripts, { recursive: true });
    for (const ext of ['txt', 'srt', 'json']) {
      fs.writeFileSync(path.join(paths.transcripts, `03-2-setup.${ext}`), 'old whisper loop loop loop'); // FliHub's own old output
    }

    const { client, submitted } = fakeFlitools({ suspect: true, reasons: ['repeated line x12'] });
    const app = appWith(client);
    const queued = await request(app).post('/api/transcriptions/queue').send({ videoPath: video, force: true });
    expect(queued.body.success).toBe(true);

    const status = await waitForStatus(app, '03-2-setup.mov', 'complete');
    expect(status.health).toEqual({ suspect: true, reasons: ['repeated line x12'] });
    // FliHub moved nothing itself: the old files were still there when FliTools got the job
    expect(submitted).toEqual([{ path: video, force: true, forceSave: true, language: 'en', oldFilesPresent: true }]);
    expect(fs.readFileSync(path.join(paths.transcripts, '03-2-setup.txt'), 'utf8')).toBe('new words');
    const pre = path.join(project, '-trash', '2026-09-27-pre-flitools');
    expect(fs.readdirSync(pre).sort()).toEqual(['03-2-setup.json', '03-2-setup.srt', '03-2-setup.txt']);
    expect(fs.readFileSync(path.join(pre, '03-2-setup.txt'), 'utf8')).toContain('old whisper');
  });

  it('a fresh transcript without force is still skipped (FR-159 reason), and FliTools is not called', async () => {
    const video = path.join(paths.recordings, '01-1-intro.mov');
    fs.writeFileSync(video, 'take');
    const t = new Date(Date.now() - 600_000);
    fs.utimesSync(video, t, t);
    fs.mkdirSync(paths.transcripts, { recursive: true });
    fs.writeFileSync(path.join(paths.transcripts, '01-1-intro.txt'), 'fine');
    const { client, submitted } = fakeFlitools({ suspect: false, reasons: [] });
    const res = await request(appWith(client)).post('/api/transcriptions/queue').send({ videoPath: video });
    expect(res.body).toMatchObject({ success: true, job: null, skipped: true });
    expect(submitted).toEqual([]);
  });

  it('a failed FliTools job leaves the old transcript exactly where it was', async () => {
    const video = path.join(paths.recordings, '04-1-annotate.mov');
    fs.writeFileSync(video, 'take');
    const t = new Date(Date.now() - 600_000);
    fs.utimesSync(video, t, t);
    fs.mkdirSync(paths.transcripts, { recursive: true });
    for (const ext of ['txt', 'srt', 'json']) fs.writeFileSync(path.join(paths.transcripts, `04-1-annotate.${ext}`), 'old but real');

    const { client } = fakeFlitools({ suspect: false, reasons: [] }, { fail: true });
    const app = appWith(client);
    await request(app).post('/api/transcriptions/queue').send({ videoPath: video, force: true });
    await waitForStatus(app, '04-1-annotate.mov', 'complete'); // job gone; old transcript still counts
    const list = (await request(app).get('/api/transcriptions')).body;
    expect(list.recent[0]).toMatchObject({ status: 'error' });
    expect(list.recent[0].error).toContain('engine-error');
    for (const ext of ['txt', 'srt', 'json']) {
      expect(fs.readFileSync(path.join(paths.transcripts, `04-1-annotate.${ext}`), 'utf8')).toBe('old but real');
    }
    expect(fs.existsSync(path.join(project, '-trash'))).toBe(false);
  });

  it('a fresh FliTools-made transcript (e.g. FliCut\'s) is refreshed in place, never binned', async () => {
    const video = path.join(paths.recordings, '05-1-artefact.mov');
    fs.writeFileSync(video, 'take');
    const t = new Date(Date.now() - 600_000);
    fs.utimesSync(video, t, t);
    fs.mkdirSync(paths.transcripts, { recursive: true });
    fs.writeFileSync(path.join(paths.transcripts, '05-1-artefact.json'), JSON.stringify({ schema: 'flitools.transcript/1', text: 'fliCut made this' }));
    fs.writeFileSync(path.join(paths.transcripts, '05-1-artefact.txt'), 'fliCut made this');
    const { client } = fakeFlitools({ suspect: false, reasons: [] });
    const app = appWith(client);
    await request(app).post('/api/transcriptions/queue').send({ videoPath: video, force: true });
    await waitForStatus(app, '05-1-artefact.mov', 'complete');
    await new Promise((r) => setTimeout(r, 20));
    expect(fs.existsSync(path.join(project, '-trash'))).toBe(false);
  });

  it('FliTools down → the job errors loudly with the reason, never a silent skip', async () => {
    const video = path.join(paths.recordings, '02-1-overview.mov');
    fs.writeFileSync(video, 'take');
    const down: FlitoolsClient = {
      baseUrl: 'http://127.0.0.1:7161',
      async submit() {
        const { FlitoolsError } = await import('../utils/flitoolsClient.js');
        throw new FlitoolsError('FliTools is not reachable at http://127.0.0.1:7161 (fetch failed)', 'unavailable');
      },
      async job() {
        throw new Error('unreachable');
      },
    };
    const app = appWith(down);
    await request(app).post('/api/transcriptions/queue').send({ videoPath: video });
    const status = await waitForStatus(app, '02-1-overview.mov', 'error');
    expect(status.status).toBe('error');
    const list = (await request(app).get('/api/transcriptions')).body;
    expect(list.recent[0].error).toContain('FliTools is not reachable');
  });
});
