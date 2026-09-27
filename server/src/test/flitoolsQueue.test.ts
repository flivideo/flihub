// B584 through FliHub's own queue: POST /api/transcriptions/queue → FliTools (faked) → status.
// Old transcripts go to -trash before FliTools writes (orch ruling, never overwritten in place),
// suspect health reaches the status route from the .json, and FliTools down is a loud error.
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

/** A FliTools that "transcribes" by writing flitools.transcript/1 files, like the real one. */
function fakeFlitools(health: { suspect: boolean; reasons: string[] }) {
  const submitted: { path: string; force?: boolean; forceSave?: boolean }[] = [];
  const client: FlitoolsClient = {
    baseUrl: 'http://fake-flitools',
    async submit(videoPath, o = {}) {
      submitted.push({ path: videoPath, ...o });
      // the slot must be empty: FliHub moved the old files out first
      const base = path.basename(videoPath, path.extname(videoPath));
      const files = { json: path.join(paths.transcripts, `${base}.json`), srt: path.join(paths.transcripts, `${base}.srt`), txt: path.join(paths.transcripts, `${base}.txt`) };
      if (fs.existsSync(files.json)) throw new Error('slot not empty — old files were not moved to -trash');
      fs.mkdirSync(paths.transcripts, { recursive: true });
      fs.writeFileSync(files.json, JSON.stringify({ schema: 'flitools.transcript/1', text: 'new words', segments: [], words: [], health }));
      fs.writeFileSync(files.srt, '1\n00:00:00,000 --> 00:00:01,000\nnew words\n');
      fs.writeFileSync(files.txt, 'new words'); // .txt last
      const view: FlitoolsJobView = { id: 'j1', status: 'done', pct: 100, health, result: { reused: null, files, transcript: { engine: { name: 'groq', model: 'whisper-large-v3' } } } };
      return view;
    },
    async job() {
      throw new Error('not polled — submit answered done');
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
  it('forced redo: old whisper files go to -trash, FliTools writes fresh ones, suspect reaches status', async () => {
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
    expect(submitted).toEqual([{ path: video, force: true, forceSave: undefined }]);
    expect(fs.readFileSync(path.join(paths.transcripts, '03-2-setup.txt'), 'utf8')).toBe('new words');
    expect(fs.readdirSync(paths.trash).sort()).toEqual(['03-2-setup.json', '03-2-setup.srt', '03-2-setup.txt']);
    expect(fs.readFileSync(path.join(paths.trash, '03-2-setup.txt'), 'utf8')).toContain('old whisper');
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
