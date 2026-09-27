// B584: FliHub calls FliTools (:7161) instead of spawning mlx_whisper. The client speaks the
// flitools caller contract (submit wait:false → poll /api/jobs/:id) against a fake server.
import { describe, it, expect } from 'vitest';
import { createFlitoolsClient, runFlitoolsJob, FlitoolsError, type FlitoolsJobView } from '../utils/flitoolsClient.js';

const FILES = { json: '/p/hub/transcripts/x.json', srt: '/p/hub/transcripts/x.srt', txt: '/p/hub/transcripts/x.txt' };
const ok = (value: unknown, status = 200) =>
  new Response(JSON.stringify({ ok: true, value }), { status, headers: { 'content-type': 'application/json' } });
const bad = (status: number, failureMode: string) =>
  new Response(JSON.stringify({ ok: false, error: { failureMode, message: failureMode } }), { status });

function fakeFlitools(script: Array<(url: string, init?: RequestInit) => Response>) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fetchImpl = async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    const step = script.shift();
    if (!step) throw new Error(`unexpected call ${url}`);
    return step(url, init);
  };
  return { client: createFlitoolsClient({ baseUrl: 'http://ft', fetchImpl }), calls };
}
const noSleep = async () => undefined;

describe('runFlitoolsJob', () => {
  it('submits as agent:flihub with JSON + wait:false, polls to done, returns health', async () => {
    const done: FlitoolsJobView = {
      id: 'j1', status: 'done', pct: 100, phase: 'done',
      health: { suspect: false, reasons: [] },
      result: { reused: null, files: FILES, transcript: { engine: { name: 'groq', model: 'whisper-large-v3' } } },
    };
    const { client, calls } = fakeFlitools([
      () => ok({ id: 'j1', status: 'queued', pct: 0, phase: 'queued' }),
      () => ok({ id: 'j1', status: 'running', pct: 40, phase: 'transcribing' }),
      () => ok(done),
    ]);
    const progress: number[] = [];
    const view = await runFlitoolsJob(client, '/p/hub/recordings/x.mov', {
      sleep: noSleep,
      onProgress: (v) => progress.push(v.pct ?? -1),
    });
    expect(view.health).toEqual({ suspect: false, reasons: [] });
    expect(progress).toEqual([40, 100]);

    const submit = calls[0];
    expect(submit.url).toBe('http://ft/api/transcribe');
    expect(submit.init?.method).toBe('POST');
    const headers = submit.init?.headers as Record<string, string>;
    expect(headers['content-type']).toBe('application/json');
    expect(headers['x-fli-principal']).toBe('agent:flihub');
    expect(JSON.parse(String(submit.init?.body))).toEqual({ path: '/p/hub/recordings/x.mov', wait: false });
    expect(calls[1].url).toBe('http://ft/api/jobs/j1');
  });

  it('passes force + force_save only when asked', async () => {
    const { client, calls } = fakeFlitools([
      () => ok({ id: 'j', status: 'done', result: { files: FILES } }),
    ]);
    await runFlitoolsJob(client, '/v.mov', { force: true, forceSave: true, sleep: noSleep });
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({ path: '/v.mov', wait: false, force: true, force_save: true });
  });

  it('suspect comes through (FliTools already retried once — FliHub must surface it)', async () => {
    const { client } = fakeFlitools([
      () => ok({ id: 'j', status: 'queued' }),
      () => ok({ id: 'j', status: 'done', health: { suspect: true, reasons: ['repeated line x12'], retried: true }, result: { files: FILES } }),
    ]);
    const view = await runFlitoolsJob(client, '/v.mov', { sleep: noSleep });
    expect(view.health).toEqual({ suspect: true, reasons: ['repeated line x12'], retried: true });
  });

  it('FliTools down → unavailable, loudly', async () => {
    const client = createFlitoolsClient({
      baseUrl: 'http://ft',
      fetchImpl: async () => { throw new TypeError('fetch failed'); },
    });
    await expect(runFlitoolsJob(client, '/v.mov', { sleep: noSleep })).rejects.toMatchObject({ failure: 'unavailable' });
  });

  it('job-not-found (FliTools restarted) → submits again once, then finishes', async () => {
    const { client, calls } = fakeFlitools([
      () => ok({ id: 'j1', status: 'queued' }),
      () => bad(404, 'job-not-found'),
      () => ok({ id: 'j2', status: 'done', result: { reused: 'cache', files: FILES } }),
    ]);
    const view = await runFlitoolsJob(client, '/v.mov', { sleep: noSleep });
    expect(view.id).toBe('j2');
    expect(calls.map((c) => c.url)).toEqual(['http://ft/api/transcribe', 'http://ft/api/jobs/j1', 'http://ft/api/transcribe']);
  });

  it('failed job → failed with the reason', async () => {
    const { client } = fakeFlitools([
      () => ok({ id: 'j', status: 'queued' }),
      () => ok({ id: 'j', status: 'failed', error: { failureMode: 'engine-error', message: 'mlx crashed' } }),
    ]);
    await expect(runFlitoolsJob(client, '/v.mov', { sleep: noSleep })).rejects.toThrow(/engine-error: mlx crashed/);
  });

  it('done but saveError (overwrite guard) → not-saved, never a silent success', async () => {
    const { client } = fakeFlitools([
      () => ok({ id: 'j', status: 'done', result: { files: null, saveError: 'owned by another app: /p/x.json' } }),
    ]);
    const err = await runFlitoolsJob(client, '/v.mov', { sleep: noSleep }).catch((e) => e);
    expect(err).toBeInstanceOf(FlitoolsError);
    expect(err.failure).toBe('not-saved');
    expect(err.message).toContain('owned by another app');
  });

  it('refusal on submit (415 / bad path) → refused', async () => {
    const { client } = fakeFlitools([() => bad(415, 'unsupported-media-type')]);
    await expect(runFlitoolsJob(client, '/v.mov', { sleep: noSleep })).rejects.toMatchObject({ failure: 'refused' });
  });
});
