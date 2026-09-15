// W3 — FliHub meets the open contract (flistudio docs/open-contract.md §3.1: one contract test per door).
// Every fixture lives in a temp dir; HOME and brands.json are injected, so nothing here can reach the real
// ~/.config/appydave or ~/dev/video-projects.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import fs from 'fs';
import http from 'http';
import os from 'os';
import path from 'path';
import { createContextRouter } from '../routes/context.js';
import { createSystemRoutes } from '../routes/system.js';
import { createContextController, LAUNCH_ID_ENV, type ContextDeps } from '../utils/openContext.js';
import type { Config, OpenContextState } from '../../../shared/types.js';

const XMEN_ID = '3f1c2a4e-8b7d-4c6e-9a1f-2b3c4d5e6f70';

let tmp: string;
let home: string;
let rootX: string;
let rootY: string;

function writeJson(file: string, value: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
}

function member(root: string, folder: string, id: string, brand: string) {
  const [code, ...rest] = folder.split('-');
  writeJson(path.join(root, folder, 'fli.studio.json'), {
    schema: 1,
    id,
    brand,
    code,
    name: rest.join('-'),
    createdAt: '2026-09-15T00:00:00.000Z',
  });
}

beforeEach(() => {
  tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'flihub-open-contract-')));
  home = path.join(tmp, 'home');
  rootX = path.join(tmp, 'video-projects', 'v-x');
  rootY = path.join(tmp, 'video-projects', 'v-y');
  vi.stubEnv('HOME', home);

  writeJson(path.join(home, '.config', 'appydave', 'brands.json'), {
    brands: {
      x: { name: 'Brand X', locations: { video_projects: rootX, ssd_backup: '/Volumes/T7/pub-x' } },
      y: { name: 'Brand Y', locations: { video_projects: rootY } },
    },
  });
  // Brand x: one fli.studio.json member and one plain FliHub folder.
  member(rootX, 'a01-xmen', XMEN_ID, 'x');
  fs.mkdirSync(path.join(rootX, 'b02-plain', 'recordings'), { recursive: true });
  fs.mkdirSync(path.join(rootX, 'a01-xmen', 'videos', '01-intro'), { recursive: true });
  // Brand y: two members sharing a code — an ambiguous reference.
  member(rootY, 'a01-alpha', '11111111-1111-4111-8111-111111111111', 'y');
  member(rootY, 'a01-beta', '22222222-2222-4222-8222-222222222222', 'y');
});

// Every test app listens on its own ephemeral port bound to 127.0.0.1 — the exact address supertest dials.
// supertest's own app.listen(0) binds [::] instead, and on macOS another process can bind 127.0.0.1 on that same
// port and take the request (how a concurrent run answered POST /api/context with 501).
const servers: http.Server[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise((resolve) => server.close(resolve))));
  vi.unstubAllEnvs();
  fs.rmSync(tmp, { recursive: true, force: true });
});

async function buildApp(initial: Partial<Config> = {}, extra: Partial<ContextDeps> = {}) {
  const config = {
    watchDirectory: '',
    projectDirectory: '',
    projectsRootDirectory: path.join(tmp, 'somewhere-else'),
    activeProject: '',
    availableTags: [],
    commonNames: [],
    imageSourceDirectory: '',
    ...initial,
  } as Config;
  const emitted: string[] = [];
  const logs: string[] = [];
  const controller = createContextController({
    getConfig: () => config,
    updateConfig: (patch) => Object.assign(config, patch),
    emit: (event) => emitted.push(event),
    home,
    log: (line) => logs.push(line),
    ...extra,
  });
  const app = express();
  app.use(express.json());
  app.use('/api/context', createContextRouter(controller));
  app.use('/api/system', createSystemRoutes(() => config));
  const server = http.createServer(app);
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { app: server, config, controller, emitted, logs };
}

// A status mismatch must say what actually answered: an express handler (JSON body) or something between the test
// and the in-process app (a proxy/sandbox answering 501 with its own body and headers).
function expectStatus(res: request.Response, status: number) {
  const seen = {
    status: res.status,
    method: res.request?.method,
    url: res.request?.url,
    contentType: res.headers['content-type'],
    server: res.headers['server'] ?? res.headers['via'] ?? null,
    body: res.body && Object.keys(res.body).length > 0 ? res.body : res.text,
  };
  expect(seen, `unexpected HTTP status: ${JSON.stringify(seen)}`).toMatchObject({ status });
}

const getContext = async (app: http.Server) => (await request(app).get('/api/context')).body as OpenContextState;

describe('open contract — one test per door', () => {
  it('1 · launch args → context', async () => {
    const { app, controller, config } = await buildApp();

    const result = await controller.applyLaunch(['--brand', 'x', '--project', 'a01-xmen'], {});

    expect(result.kind).toBe('applied');
    expect(config.projectsRootDirectory).toBe(rootX);
    expect(config.activeProject).toBe('a01-xmen');
    expect(await getContext(app)).toEqual({
      context: {
        brand: 'x',
        root: rootX,
        project: 'a01-xmen',
        projectDir: path.join(rootX, 'a01-xmen'),
        projectId: XMEN_ID,
        membership: 'member',
      },
      missing: [],
    });
  });

  it('2 · API → the same context', async () => {
    const launched = await buildApp();
    await launched.controller.applyLaunch(['--brand', 'x', '--project', 'a01-xmen'], {});
    const viaLaunch = await getContext(launched.app);

    const { app, emitted, config } = await buildApp();
    const res = await request(app).post('/api/context').send({ brand: 'x', project: 'a01-xmen' });

    expectStatus(res, 200);
    expect(res.body.context).toEqual(viaLaunch.context);
    expect(await getContext(app)).toEqual(viaLaunch);
    // Same effect as a brand switch: T7 paths move with the root, and open UIs are told (C4).
    expect(config.publishedPath).toBe('/Volumes/T7/pub-x');
    expect(config.holdingPath).toBe('/Volumes/T7/youtube-HOLDING/x');
    expect(emitted).toEqual(['projects:changed', 'recordings:changed', 'context:changed']);
  });

  it('3 · missing → picker', async () => {
    const { app, controller, config } = await buildApp();
    const before = { ...config };

    expect((await controller.applyLaunch([], {})).kind).toBe('none');

    expect(await getContext(app)).toEqual({ context: null, missing: ['brand', 'project'] });
    expect(config).toEqual(before);
    const health = await request(app).get('/api/system/health');
    expectStatus(health, 200);
    // Door 3 names the missing field instead of guessing.
    const res = await request(app).post('/api/context').send({ brand: 'x' });
    expectStatus(res, 400);
    expect(res.body.missing).toEqual(['project']);
  });

  it('4 · refusal bites', async () => {
    const { app, controller, config, logs } = await buildApp({
      projectsRootDirectory: rootX,
      activeProject: 'b02-plain',
    });

    const unknown = await request(app).post('/api/context').send({ brand: 'nope', project: 'a01-xmen' });
    expectStatus(unknown, 404);
    expect(unknown.body.code).toBe('unknown-brand');

    const ambiguous = await request(app).post('/api/context').send({ brand: 'y', project: 'a01' });
    expectStatus(ambiguous, 409);
    expect(ambiguous.body.candidates).toEqual(['a01-alpha', 'a01-beta']);

    const launch = await controller.applyLaunch(['--brand', 'x', '--project', 'z99-nothing'], {});
    expect(launch.kind).toBe('refused');
    // No silent fallback: the config is exactly where it was, and the refusal says why.
    expect(config.activeProject).toBe('b02-plain');
    expect(config.projectsRootDirectory).toBe(rootX);
    const state = await getContext(app);
    expect(state.refused).toMatchObject({ code: 'project-not-found' });
    expect(state.refused?.reason).toContain('z99-nothing');
    expect(state.context?.project).toBe('b02-plain');
    expect(logs.filter((l) => l.includes('refused'))).toHaveLength(3);
  });

  it('5 · env door', async () => {
    const env = { FLIVIDEO_BRAND: 'x', FLIVIDEO_PROJECT: 'b02-plain' };

    const fromEnv = await buildApp();
    await fromEnv.controller.applyLaunch([], env);
    expect((await getContext(fromEnv.app)).context).toMatchObject({
      brand: 'x',
      project: 'b02-plain',
      projectId: null,
      membership: 'folder',
    });

    const argvWins = await buildApp();
    await argvWins.controller.applyLaunch(['--project', 'a01-xmen'], env);
    expect((await getContext(argvWins.app)).context).toMatchObject({ brand: 'x', project: 'a01-xmen' });
  });
});

describe('open contract — edges', () => {
  it('F1 · a code shared by a member and a plain folder is ambiguous through both doors (R31)', async () => {
    fs.mkdirSync(path.join(rootX, 'a01-old'));
    const { app, controller, config } = await buildApp({ projectsRootDirectory: rootX, activeProject: 'b02-plain' });

    const api = await request(app).post('/api/context').send({ brand: 'x', project: 'a01' });
    expectStatus(api, 409);
    expect(api.body).toMatchObject({ code: 'project-ambiguous', candidates: ['a01-old', 'a01-xmen'] });
    expect(config.activeProject).toBe('b02-plain');

    const launch = await controller.applyLaunch(['--brand', 'x', '--project', 'a01'], {});
    expect(launch).toMatchObject({ kind: 'refused', status: 409 });
    expect(config.activeProject).toBe('b02-plain');
    expect((await getContext(app)).refused).toMatchObject({ candidates: ['a01-old', 'a01-xmen'] });
  });

  it('F1 · codes match plain folders: two share one → 409, a single one resolves as a folder', async () => {
    fs.mkdirSync(path.join(rootX, 'b07-one'));
    fs.mkdirSync(path.join(rootX, 'b07-two'));
    fs.mkdirSync(path.join(rootX, 'c03-solo'));
    const { app } = await buildApp();

    const two = await request(app).post('/api/context').send({ brand: 'x', project: 'b07' });
    expectStatus(two, 409);
    expect(two.body.candidates).toEqual(['b07-one', 'b07-two']);

    const one = await request(app).post('/api/context').send({ brand: 'x', project: 'c03' });
    expectStatus(one, 200);
    expect(one.body.context).toMatchObject({ project: 'c03-solo', membership: 'folder', projectId: null });

    const prefix = await request(app).post('/api/context').send({ brand: 'x', project: 'c0' });
    expectStatus(prefix, 404);
  });

  it('carries a valid video with its project and refuses a malformed one', async () => {
    const { app, config } = await buildApp();

    const ok = await request(app).post('/api/context').send({ brand: 'x', project: 'a01-xmen', video: '01-intro' });
    expectStatus(ok, 200);
    expect(ok.body.context.video).toBe('01-intro');

    const bad = await request(app).post('/api/context').send({ brand: 'x', project: 'b02-plain', video: 'intro' });
    expectStatus(bad, 400);
    expect(bad.body.code).toBe('video-invalid');
    expect(config.activeProject).toBe('a01-xmen');

    // Picking another project drops the video that belonged to the first.
    await request(app).post('/api/context').send({ brand: 'x', project: 'b02-plain' });
    expect((await getContext(app)).context?.video).toBeUndefined();
  });

  it('a refusal stops showing once the context moves on', async () => {
    const { app } = await buildApp({ projectsRootDirectory: rootX, activeProject: 'b02-plain' });
    await request(app).post('/api/context').send({ brand: 'x', project: 'z99-nothing' });
    expect((await getContext(app)).refused).toBeDefined();

    await request(app).post('/api/context').send({ brand: 'x', project: 'a01-xmen' });
    expect((await getContext(app)).refused).toBeUndefined();
  });

  it('launch with only --brand switches the brand and leaves the project list as the picker', async () => {
    const { app, controller, config } = await buildApp({ projectsRootDirectory: rootY, activeProject: 'a01-alpha' });

    await controller.applyLaunch(['--brand', 'x'], {});

    expect(config.projectsRootDirectory).toBe(rootX);
    expect(config.activeProject).toBe('');
    expect(await getContext(app)).toEqual({ context: null, missing: ['project'] });
  });

  it('--project without --brand changes nothing', async () => {
    const { controller, config, logs } = await buildApp({ projectsRootDirectory: rootY, activeProject: 'a01-alpha' });

    expect(await controller.applyLaunch(['--project', 'a01-xmen'], {})).toEqual({ kind: 'missing', missing: ['brand'] });
    expect(config.activeProject).toBe('a01-alpha');
    expect(logs[0]).toContain('without --brand');
  });

  it('applies a launch id once, so a restart keeps a later pick', async () => {
    const launchStampPath = path.join(tmp, 'launch.json');
    const env = { FLIVIDEO_BRAND: 'x', FLIVIDEO_PROJECT: 'a01-xmen', [LAUNCH_ID_ENV]: 'launch-1' };
    const { app, controller, config } = await buildApp({}, { launchStampPath });

    expect((await controller.applyLaunch([], env)).kind).toBe('applied');
    await request(app).post('/api/context').send({ brand: 'x', project: 'b02-plain' });

    // nodemon / overmind restart: same process env, same launch id
    const restarted = createContextController({
      getConfig: () => config,
      updateConfig: (patch) => Object.assign(config, patch),
      home,
      launchStampPath,
      log: () => {},
    });
    expect(await restarted.applyLaunch([], env)).toEqual({ kind: 'already-applied', launchId: 'launch-1' });
    expect(config.activeProject).toBe('b02-plain');

    // a new launch applies again
    expect((await restarted.applyLaunch([], { ...env, [LAUNCH_ID_ENV]: 'launch-2' })).kind).toBe('applied');
    expect(config.activeProject).toBe('a01-xmen');
  });

  it('reports an unreadable registry, a brand without a root and an unreadable brand root', async () => {
    writeJson(path.join(home, '.config', 'appydave', 'brands.json'), {
      brands: {
        x: { name: 'Brand X', locations: { video_projects: rootX } },
        rootless: { name: 'No Root' },
        gone: { name: 'Gone', locations: { video_projects: path.join(tmp, 'unmounted', 'v-gone') } },
      },
    });
    const { app } = await buildApp();

    const rootless = await request(app).post('/api/context').send({ brand: 'rootless', project: 'a01' });
    expectStatus(rootless, 404);
    expect(rootless.body.code).toBe('no-brand-root');

    const gone = await request(app).post('/api/context').send({ brand: 'gone', project: 'a01' });
    expectStatus(gone, 503);
    expect(gone.body.code).toBe('brand-root-unreadable');

    fs.writeFileSync(path.join(home, '.config', 'appydave', 'brands.json'), 'not json');
    const broken = await request(app).post('/api/context').send({ brand: 'x', project: 'a01-xmen' });
    expectStatus(broken, 503);
    expect(broken.body.code).toBe('brands-unreadable');
    expect(await getContext(app)).toMatchObject({ context: null, missing: ['brand', 'project'] });

    fs.rmSync(path.join(home, '.config'), { recursive: true });
    const absent = await request(app).post('/api/context').send({ brand: 'x', project: 'a01-xmen' });
    expect(absent.body.code).toBe('brands-unreadable');
  });
});
