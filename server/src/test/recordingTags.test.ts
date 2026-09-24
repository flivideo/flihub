// 2026-09-25 (David, live on d01): a take renamed 01-1-intro-HOOK.mov showed as "01-1-intro".
// The rename wrote the tag; GET /api/recordings lost it — parseRecordingFilename already strips
// uppercase tags from `name`, and the route then looked for known tags in the stripped name.
// Inline edits rebuild filenames from `tags`, so an empty list could erase the tag on disk.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createRoutes } from '../routes/index.js';
import type { Config, FileInfo } from '../../../shared/types.js';

describe('GET /api/recordings keeps the tags that are in the filename', () => {
  let tmp: string;
  let app: express.Express;
  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rec-tags-'));
    fs.mkdirSync(path.join(tmp, 'recordings'), { recursive: true });
    const config = {
      watchDirectory: tmp,
      projectDirectory: tmp,
      fileExtensions: ['.mov'],
      availableTags: ['CTA'],
      commonNames: [],
      imageSourceDirectory: tmp,
    } as unknown as Config;
    app = express();
    app.use(express.json());
    app.use('/api', createRoutes(new Map<string, FileInfo>(), config, (c) => Object.assign(config, c)));
  });
  afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

  const rec = async (filename: string) => {
    fs.writeFileSync(path.join(tmp, 'recordings', filename), 'x');
    const res = await request(app).get('/api/recordings');
    expect(res.status).toBe(200);
    return (res.body.recordings as { filename: string; name: string; tags: string[] }[]).find(
      (r) => r.filename === filename,
    )!;
  };

  it('a custom typed tag (not in availableTags) comes back as a tag', async () => {
    expect(await rec('01-1-intro-HOOK.mov')).toMatchObject({ name: 'intro', tags: ['HOOK'] });
  });
  it('a configured tag and several tags come back in order', async () => {
    expect(await rec('02-3-demo-flow-CTA-HOOK.mov')).toMatchObject({ name: 'demo-flow', tags: ['CTA', 'HOOK'] });
  });
  it('no tags → empty list', async () => {
    expect(await rec('01-2-intro.mov')).toMatchObject({ name: 'intro', tags: [] });
  });
});
