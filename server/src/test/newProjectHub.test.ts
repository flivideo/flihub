// Step 4 (David: ruling 1 2026-09-22, option A 2026-09-23): New Project creates only the project
// folder, so it reads as the hub layout and the first promoted take lands in hub/recordings/.
// Real temp dirs through the real router; no project data touched.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createRoutes } from '../routes/index.js';
import { getProjectPaths, projectDirFromRecordingPath } from '../../../shared/paths.js';
import type { Config, FileInfo } from '../../../shared/types.js';

let tmp: string;
let root: string;
let watch: string;
let config: Config;
let queued: string[];

function buildApp() {
  queued = [];
  const updateConfig = (c: Partial<Config>) => Object.assign(config, c);
  const app = express();
  app.use(express.json());
  app.use('/api', createRoutes(new Map<string, FileInfo>(), config, updateConfig, (p) => queued.push(p)));
  return app;
}

function take(name = 'raw-take.mov') {
  const p = path.join(watch, name);
  fs.writeFileSync(p, 'fake video');
  return p;
}

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'new-project-hub-'));
  root = path.join(tmp, 'v-test');
  watch = path.join(tmp, 'ecamm');
  fs.mkdirSync(root, { recursive: true });
  fs.mkdirSync(watch, { recursive: true });
  config = {
    watchDirectory: watch,
    projectDirectory: '',
    projectsRootDirectory: root,
    fileExtensions: ['.mov', '.mp4'],
    availableTags: [],
    commonNames: [],
    imageSourceDirectory: tmp,
  } as Config;
});
afterEach(() => {
  vi.restoreAllMocks();
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe('New Project → hub layout', () => {
  it('creates only the project folder — no recordings/, no hub/ — and it reads as hub', async () => {
    const app = buildApp();
    const res = await request(app).post('/api/projects').send({ code: 'a01-new-thing' });
    expect(res.status).toBe(200);
    const dir = path.join(root, 'a01-new-thing');
    expect(fs.existsSync(dir)).toBe(true);
    expect(fs.readdirSync(dir)).toEqual([]);
    const paths = getProjectPaths(dir);
    expect(paths.layout).toBe('hub');
    expect(paths.recordings).toBe(path.join(dir, 'hub', 'recordings'));
    expect(paths.transcripts).toBe(path.join(dir, 'hub', 'transcripts'));
  });

  it('the first promoted take lands in hub/recordings/ and is queued for hub/transcripts/', async () => {
    const app = buildApp();
    await request(app).post('/api/projects').send({ code: 'a01-new-thing' });
    const dir = path.join(root, 'a01-new-thing');
    config.projectDirectory = dir;

    const res = await request(app)
      .post('/api/rename')
      .send({ originalPath: take(), chapter: '01', sequence: '1', name: 'intro', tags: [] });
    expect(res.status).toBe(200);

    const landed = path.join(dir, 'hub', 'recordings', '01-1-intro.mov');
    expect(fs.existsSync(landed)).toBe(true);
    expect(fs.existsSync(path.join(dir, 'recordings'))).toBe(false);
    expect(queued).toEqual([landed]);
    // Where the transcription worker will write (transcriptions.ts getTranscriptsDirFromVideoPath)
    expect(getProjectPaths(projectDirFromRecordingPath(landed)!).transcripts).toBe(path.join(dir, 'hub', 'transcripts'));
    // Once it has a take, it is unambiguously hub
    expect(getProjectPaths(dir).layout).toBe('hub');
  });

  it('an existing legacy project still promotes into top-level recordings/', async () => {
    const dir = path.join(root, 'd02-old');
    fs.mkdirSync(path.join(dir, 'recordings'), { recursive: true });
    config.projectDirectory = dir;
    const app = buildApp();

    const res = await request(app)
      .post('/api/rename')
      .send({ originalPath: take(), chapter: '02', sequence: '3', name: 'more', tags: [] });
    expect(res.status).toBe(200);
    expect(fs.existsSync(path.join(dir, 'recordings', '02-3-more.mov'))).toBe(true);
    expect(fs.existsSync(path.join(dir, 'hub'))).toBe(false);
  });
});
