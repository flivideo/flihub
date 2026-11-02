// FR-177: the B-roll button calls broll.register (FliStudio) instead of moving into b-roll/.
// Fake FliStudio via an injected fetch; real temp dirs; no live app touched.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { registerBroll } from '../utils/brollRegister.js';
import { createBrollRegisterRouter } from '../routes/brollRegister.js';
import type { Config, FileInfo } from '../../../shared/types.js';

let tmp: string;
let control: string;
const TOKEN = 'secret-token-123';

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'broll-register-'));
  control = path.join(tmp, 'control.json');
  fs.writeFileSync(control, JSON.stringify({ port: 7151, token: TOKEN }));
});
afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

const input = { brand: 'appydave', project: 'd99-test', file: '/x/a.mov', tags: ['chin'], takeId: 'ecamm:a' };
const rpcErr = (failureMode: string, message = failureMode) =>
  new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, error: { code: -32010, message, data: { failureMode } } }));

describe('registerBroll', () => {
  it('calls broll.register with place:copy, bearer token and agent:flihub principal', async () => {
    let seen: { url: string; init?: RequestInit } | undefined;
    const r = await registerBroll(input, {
      controlPath: control,
      fetchImpl: async (url, init) => {
        seen = { url, init };
        return new Response(
          JSON.stringify({ jsonrpc: '2.0', id: 1, result: { created: true, placed: '/p/a.mov', asset: { id: 'r1', file: '/p/a.mov' }, warnings: [] } })
        );
      },
    });
    expect(r).toMatchObject({ ok: true, created: true, placed: '/p/a.mov', assetFile: '/p/a.mov' });
    expect(seen!.url).toBe('http://127.0.0.1:7151/api/rpc');
    const h = seen!.init!.headers as Record<string, string>;
    expect(h.authorization).toBe(`Bearer ${TOKEN}`);
    expect(h['x-fli-principal']).toBe('agent:flihub');
    const body = JSON.parse(seen!.init!.body as string);
    expect(body.method).toBe('broll.register');
    expect(body.params).toMatchObject({ place: 'copy', brand: 'appydave', project: 'd99-test', tags: ['chin'], from: { app: 'flihub', take: 'ecamm:a' } });
  });

  it('no control.json → unavailable ("FliStudio isn\'t running")', async () => {
    const r = await registerBroll(input, { controlPath: path.join(tmp, 'nope.json'), fetchImpl: async () => { throw new Error('unreachable'); } });
    expect(r).toMatchObject({ ok: false, refusal: 'unavailable', message: "FliStudio isn't running — not added to B-roll" });
  });

  it('connection refused with a stale control.json → unavailable', async () => {
    const r = await registerBroll(input, { controlPath: control, fetchImpl: async () => { throw new TypeError('fetch failed'); } });
    expect(r).toMatchObject({ ok: false, refusal: 'unavailable' });
  });

  it.each([
    ['file-not-found', 'File not found — not added'],
    ['unusable-file', 'Not an image or video'],
    ['project-not-found', 'Which project?'],
    ['project-ambiguous', 'Which project?'],
  ])('%s → clear message', async (mode, text) => {
    const r = await registerBroll(input, { controlPath: control, fetchImpl: async () => rpcErr(mode) });
    expect(r).toMatchObject({ ok: false, refusal: mode });
    expect((r as { message: string }).message).toContain(text);
  });

  it('invalid-input passes the server message through', async () => {
    const r = await registerBroll(input, { controlPath: control, fetchImpl: async () => rpcErr('invalid-input', 'bad tag') });
    expect(r).toMatchObject({ ok: false, refusal: 'invalid-input', message: 'bad tag' });
  });

  it('never leaks the token in a failure message', async () => {
    const r = await registerBroll(input, { controlPath: control, fetchImpl: async () => new Response('x', { status: 401 }) });
    expect(JSON.stringify(r)).not.toContain(TOKEN);
  });
});

describe('POST /api/broll-register', () => {
  let projectDir: string;
  let take: string;
  let pending: Map<string, FileInfo>;
  let app: express.Express;
  const config = () => ({ projectsRootDirectory: path.join(tmp, 'v-appydave'), projectDirectory: projectDir, activeProject: 'd99-test' }) as Config;
  const mk = (fn: Parameters<typeof createBrollRegisterRouter>[2]) => {
    app = express();
    app.use(express.json());
    app.use('/api/broll-register', createBrollRegisterRouter(pending, config, fn));
  };

  beforeEach(() => {
    projectDir = path.join(tmp, 'v-appydave', 'd99-test');
    fs.mkdirSync(projectDir, { recursive: true });
    take = path.join(tmp, 'ecamm', '2026-10-31 09-10-02.mov');
    fs.mkdirSync(path.dirname(take), { recursive: true });
    fs.writeFileSync(take, 'video');
    pending = new Map([[take, { path: take } as FileInfo]]);
  });

  it('success: registers, then moves the original to -trash/ and clears Incoming', async () => {
    const copy = path.join(tmp, 'registered.mov');
    fs.writeFileSync(copy, 'video');
    let got: unknown;
    mk(async (i) => { got = i; return { ok: true, created: true, placed: copy, assetFile: copy, assetId: 'r1', warnings: [] }; });
    const res = await request(app).post('/api/broll-register').send({ path: take, name: 'run panel', tags: [' chin ', ''] });
    expect(res.body).toMatchObject({ success: true, created: true, assetFile: copy });
    expect(got).toMatchObject({ brand: 'appydave', project: 'd99-test', file: take, title: 'run panel', tags: ['chin'], takeId: 'ecamm:2026-10-31 09-10-02' });
    expect(fs.existsSync(take)).toBe(false);
    expect(fs.existsSync(path.join(projectDir, '-trash', '2026-10-31 09-10-02.mov'))).toBe(true);
    expect(pending.has(take)).toBe(false);
  });

  it('refusal: the take stays put in Incoming, refusal named', async () => {
    mk(async () => ({ ok: false, refusal: 'unavailable', message: "FliStudio isn't running — not added to B-roll" }));
    const res = await request(app).post('/api/broll-register').send({ path: take, name: 'x', tags: [] });
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ success: false, refusal: 'unavailable' });
    expect(fs.existsSync(take)).toBe(true);
    expect(pending.has(take)).toBe(true);
  });

  it('OK but the registered copy is missing on disk: take is NOT moved', async () => {
    mk(async () => ({ ok: true, created: true, placed: '/nope/x.mov', assetFile: '/nope/x.mov', assetId: 'r', warnings: [] }));
    const res = await request(app).post('/api/broll-register').send({ path: take, tags: [] });
    expect(res.status).toBe(502);
    expect(fs.existsSync(take)).toBe(true);
  });

  it('a path that is not in Incoming is refused before any call', async () => {
    let called = false;
    mk(async () => { called = true; throw new Error('should not be called'); });
    const res = await request(app).post('/api/broll-register').send({ path: '/etc/hosts', tags: [] });
    expect(res.status).toBe(400);
    expect(called).toBe(false);
  });
});
