// W8 (2026-10-29): GET /api/poem-wui/brand-config returns the managed file's `version`; the POST must send it back
// (x-brand-config-version) and is refused 409 changed-elsewhere when fli.brand.json changed since. Real files in a temp
// dir; only the managed file's location is pointed at it.
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import os from 'os';
import path from 'path';
import { promises as fs } from 'fs';

const where = vi.hoisted(() => ({ file: '' }));
vi.mock('../utils/managedBrandConfig.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../utils/managedBrandConfig.js')>()),
  managedBrandConfigFile: vi.fn(async () => where.file),
}));
vi.mock('../../../shared/paths.js', () => ({
  getProjectPaths: vi.fn(() => ({ recordings: '', safe: '', transcripts: '' })),
}));

import { createPoemWuiRoutes } from '../routes/poem-wui.js';
import { writeManagedPublish } from '../utils/managedBrandConfig.js';
import type { Config } from '../../../shared/types.js';

let dir: string;
beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'flihub-brand-version-'));
  where.file = path.join(dir, 'fli.brand.json');
  await fs.writeFile(
    where.file,
    `${JSON.stringify({ schema: 1, brand: 'appydave', colour: '#ffde59', publish: { ctas: { primaryCta: { label: 'Join', url: 'https://j' } } } }, null, 2)}\n`
  );
});
afterEach(() => fs.rm(dir, { recursive: true, force: true }));

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/poem-wui', createPoemWuiRoutes(() => ({ projectDirectory: '/x' }) as Config));
  return app;
}
const HUB = { ctas: { primaryCta: { label: 'HUB-CTA', url: 'https://h' } } };

describe('brand-config version (W8)', () => {
  it('GET returns the managed publish block with its version', async () => {
    const res = await request(buildApp()).get('/api/poem-wui/brand-config');
    expect(res.body).toMatchObject({ success: true, managed: true, data: { ctas: { primaryCta: { label: 'Join' } } } });
    expect(res.body.version).toMatch(/^[0-9a-f]{64}$/);
  });

  it('a POST with the loaded version saves and answers the new one', async () => {
    const app = buildApp();
    const { body } = await request(app).get('/api/poem-wui/brand-config');
    const res = await request(app).post('/api/poem-wui/brand-config').set('x-brand-config-version', body.version).send(HUB);
    expect(res.status).toBe(200);
    expect(res.body.version).not.toBe(body.version);
    expect(JSON.parse(await fs.readFile(where.file, 'utf8')).publish.ctas.primaryCta.label).toBe('HUB-CTA');
  });

  it('S1: the panel loaded, FliStudio changed the file, then Save → 409 changed-elsewhere, file untouched', async () => {
    const app = buildApp();
    const { body } = await request(app).get('/api/poem-wui/brand-config');
    await writeManagedPublish(where.file, { ctas: { primaryCta: { label: 'Join', url: 'https://j' } }, descriptionTemplate: { endNote: 'STUDIO' } });
    const before = await fs.readFile(where.file, 'utf8');
    const res = await request(app).post('/api/poem-wui/brand-config').set('x-brand-config-version', body.version).send(HUB);
    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ success: false, code: 'changed-elsewhere', error: 'Changed in another app — reload' });
    expect(await fs.readFile(where.file, 'utf8')).toBe(before);
  });

  it('a POST without a version is refused 428 and writes nothing', async () => {
    const before = await fs.readFile(where.file, 'utf8');
    const res = await request(buildApp()).post('/api/poem-wui/brand-config').send(HUB);
    expect(res.status).toBe(428);
    expect(res.body.code).toBe('version-required');
    expect(await fs.readFile(where.file, 'utf8')).toBe(before);
  });

  it('a payload fli-core refuses is 400, file untouched', async () => {
    const app = buildApp();
    const { body } = await request(app).get('/api/poem-wui/brand-config');
    const before = await fs.readFile(where.file, 'utf8');
    const res = await request(app)
      .post('/api/poem-wui/brand-config')
      .set('x-brand-config-version', body.version)
      .send({ ctas: { primaryCta: { label: 1 } } });
    expect(res.status).toBe(400);
    expect(await fs.readFile(where.file, 'utf8')).toBe(before);
  });
});
