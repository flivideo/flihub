// Chapter previews are deprecated (FliStudio roadmap §1.2e): every route that MADE one answers 410 Gone,
// and nothing is written. Reading the legacy recordings/-chapters/ folder still works.
import { describe, it, expect, afterEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { CHAPTER_PREVIEWS_GONE, createChapterRoutes } from '../routes/chapters.js';
import { createManageRoutes } from '../routes/manage.js';
import type { Config } from '../../../shared/types.js';

let tmp: string | null = null;

afterEach(() => {
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
  tmp = null;
});

function buildApp(projectDirectory: string) {
  const config: Config = {
    projectDirectory,
    watchDirectory: '',
    fileExtensions: ['.mov'],
    availableTags: [],
    commonNames: [],
    imageSourceDirectory: '',
  };
  const io = { emit: vi.fn() } as unknown as Parameters<typeof createManageRoutes>[1];
  const app = express();
  app.use(express.json());
  app.use('/api/chapters', createChapterRoutes(() => config));
  app.use('/api/manage', createManageRoutes(() => config, io, vi.fn(), () => null, () => []));
  return { app, io, config };
}

describe('chapter previews deprecated (§1.2e)', () => {
  it.each(['/api/chapters/generate', '/api/manage/regen-chapters', '/api/manage/regen-all'])(
    'POST %s → 410 Gone, nothing created',
    async (route) => {
      tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'flihub-chapters-gone-'));
      fs.mkdirSync(path.join(tmp, 'recordings'));
      fs.writeFileSync(path.join(tmp, 'recordings', '01-1-intro.mov'), '');
      const { app, io } = buildApp(tmp);

      const res = await request(app).post(route).send({});

      expect(res.status).toBe(410);
      expect(res.body).toEqual({ success: false, error: CHAPTER_PREVIEWS_GONE });
      expect(res.body.error).toContain('§1.2e');
      expect(fs.existsSync(path.join(tmp, 'recordings', '-chapters'))).toBe(false);
      expect(io.emit).not.toHaveBeenCalled();
    }
  );

  it('PUT /api/chapters/config → 410 Gone, the legacy settings are untouched (F8)', async () => {
    const { app, config } = buildApp('/nowhere');

    const res = await request(app).put('/api/chapters/config').send({ autoGenerate: true, resolution: '1080p' });

    expect(res.status).toBe(410);
    expect(res.body.error).toBe(CHAPTER_PREVIEWS_GONE);
    expect(config.chapterRecordings).toBeUndefined();
  });

  it('still lists an existing legacy recordings/-chapters/ folder', async () => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'flihub-chapters-gone-'));
    fs.mkdirSync(path.join(tmp, 'recordings', '-chapters'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'recordings', '-chapters', '01-intro.mov'), '');
    const { app } = buildApp(tmp);

    const res = await request(app).get('/api/chapters/status');

    expect(res.status).toBe(200);
    expect(res.body.existing).toEqual(['01-intro.mov']);
    expect(fs.existsSync(path.join(tmp, 'recordings', '-chapters', '01-intro.mov'))).toBe(true);
  });
});
