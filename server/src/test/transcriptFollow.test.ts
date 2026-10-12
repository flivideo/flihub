// 2026-10-12 (D08 06-1-outro, 06-2-outro-SKOOL): a take renamed while its transcription is in
// flight — queued, running (pass 1) or FliTools' background pass 2 — gets its transcript under the
// CURRENT name, pass 2 still lands, and nothing is left behind under the old name.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createTranscriptionRoutes } from '../routes/transcriptions.js';
import { renameRecording } from '../utils/renameRecording.js';
import {
  currentPathOf,
  recordTakeRename,
  relocateTranscripts,
  setTakeRenames,
  getTakeRenames,
} from '../utils/transcriptFollow.js';
import { getProjectPaths } from '../../../shared/paths.js';
import {
  FlitoolsError,
  runFlitoolsJob,
  type FlitoolsClient,
  type FlitoolsJobView,
} from '../utils/flitoolsClient.js';
import type { Config } from '../../../shared/types.js';

let tmp: string;
let project: string;
let config: Config;
let paths: ReturnType<typeof getProjectPaths>;
let stops: Array<() => void> = [];

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'follow-'));
  project = path.join(tmp, 'd08-test');
  fs.mkdirSync(path.join(project, 'recordings'), { recursive: true });
  config = { projectDirectory: project, projectsRootDirectory: tmp } as unknown as Config;
  paths = getProjectPaths(project);
  fs.mkdirSync(paths.transcripts, { recursive: true });
  setTakeRenames([]);
});
afterEach(() => {
  stops.forEach((s) => s());
  stops = [];
  setTakeRenames([]);
  fs.rmSync(tmp, { recursive: true, force: true });
});

const rec = (name: string) => path.join(paths.recordings, name);
const tx = (name: string) => path.join(paths.transcripts, name);
const eng = (name: string) => path.join(paths.transcripts, 'engines', name);

function take(name: string, bytes = 'video') {
  fs.writeFileSync(rec(name), bytes);
}

/** What FliTools' save leaves beside the take: plain files + the engine copy, json naming the content. */
function saveAs(base: string, sha: string, engine: 'groq' | 'crisper', verbatim = engine === 'crisper') {
  const json = JSON.stringify({ text: `${engine} words`, verbatim, source: { sha256: sha } });
  fs.mkdirSync(path.join(paths.transcripts, 'engines'), { recursive: true });
  for (const [ext, body] of [['json', json], ['srt', '1\n'], ['txt', `${engine} words`]] as const) {
    fs.writeFileSync(tx(`${base}.${ext}`), body);
    fs.writeFileSync(eng(`${base}.${engine}.${ext}`), body);
  }
  return { json: tx(`${base}.json`), srt: tx(`${base}.srt`), txt: tx(`${base}.txt`) };
}

const doneView = (id: string, sha: string, files: { json: string; srt: string; txt: string } | null, extra: Partial<FlitoolsJobView> = {}): FlitoolsJobView => ({
  id,
  status: 'done',
  pct: 100,
  result: { reused: null, files, transcript: { engine: { name: 'groq' }, source: { sha256: sha } } },
  ...extra,
});

/** A FliTools the test drives: each submit is a running job until the test sets its view. */
function controllableFlitools() {
  const submits: Array<{ id: string; path: string; tier?: string; forceSave?: boolean; force?: boolean }> = [];
  const views = new Map<string, FlitoolsJobView>();
  let n = 0;
  const client: FlitoolsClient = {
    baseUrl: 'http://fake-flitools',
    async submit(videoPath, o = {}) {
      const id = `j${++n}`;
      submits.push({ id, path: videoPath, ...o });
      const view: FlitoolsJobView = { id, status: 'running' };
      views.set(id, view);
      return view;
    },
    async job(id) {
      const v = views.get(id);
      if (!v) throw new FlitoolsError(`no job ${id}`, 'job-not-found');
      return v;
    },
  };
  return { client, submits, views };
}

function routesWith(client: FlitoolsClient) {
  const io = { emit: () => undefined } as never;
  const r = createTranscriptionRoutes(
    () => config,
    io,
    client,
    { pollMs: 1, sleep: () => new Promise((res) => setTimeout(res, 2)) },
    { stateFile: null, pass2PollMs: 0 }
  );
  stops.push(r.killActiveProcess);
  return r;
}

async function until(cond: () => boolean | Promise<boolean>, what: string) {
  for (let i = 0; i < 300; i++) {
    if (await cond()) return;
    await new Promise((r) => setTimeout(r, 5));
  }
  throw new Error(`timed out waiting for: ${what}`);
}

const transcriptFiles = () =>
  [
    ...fs.readdirSync(paths.transcripts).filter((f) => f !== 'engines'),
    ...(fs.existsSync(path.join(paths.transcripts, 'engines'))
      ? fs.readdirSync(path.join(paths.transcripts, 'engines')).map((f) => `engines/${f}`)
      : []),
  ].sort();

describe('currentPathOf — the rename record', () => {
  it('follows a chain of renames made after the job started', () => {
    const t0 = Date.now();
    recordTakeRename('/p/recordings/06-1-recap.mov', '/p/recordings/06-1-outro.mov', t0 + 1);
    recordTakeRename('/p/recordings/06-1-outro.mov', '/p/recordings/06-1-outro-RECAP.mov', t0 + 2);
    expect(currentPathOf('/p/recordings/06-1-recap.mov', t0)).toBe('/p/recordings/06-1-outro-RECAP.mov');
  });

  it('comes back to the first name after an undo', () => {
    const t0 = Date.now();
    recordTakeRename('/p/recordings/a.mov', '/p/recordings/b.mov', t0 + 1);
    recordTakeRename('/p/recordings/b.mov', '/p/recordings/a.mov', t0 + 2);
    expect(currentPathOf('/p/recordings/a.mov', t0)).toBe('/p/recordings/a.mov');
  });

  it('ignores renames from before the job started (a name reused by another take)', () => {
    recordTakeRename('/p/recordings/a.mov', '/p/recordings/b.mov', 1000);
    expect(currentPathOf('/p/recordings/a.mov', 2000)).toBe('/p/recordings/a.mov');
  });

  it('follows a renumber where one take moves onto the name another just left', () => {
    const t0 = Date.now();
    // renumber-chapter ascending: 06-2 → 06-1 (06-1 already moved to 06-0-x first)
    recordTakeRename('/p/recordings/06-1-a.mov', '/p/recordings/06-0-a.mov', t0 + 1);
    recordTakeRename('/p/recordings/06-2-b.mov', '/p/recordings/06-1-b.mov', t0 + 2);
    expect(currentPathOf('/p/recordings/06-1-a.mov', t0)).toBe('/p/recordings/06-0-a.mov');
    expect(currentPathOf('/p/recordings/06-2-b.mov', t0)).toBe('/p/recordings/06-1-b.mov');
  });
});

describe('relocateTranscripts', () => {
  it('moves plain files and engine copies for this content onto the current name', async () => {
    saveAs('06-1-recap', 'sha-A', 'crisper');
    const moved = await relocateTranscripts(rec('06-1-recap.mov'), rec('06-1-outro.mov'), 'sha-A');
    expect(moved.length).toBe(6);
    expect(transcriptFiles()).toEqual([
      '06-1-outro.json', '06-1-outro.srt', '06-1-outro.txt',
      'engines/06-1-outro.crisper.json', 'engines/06-1-outro.crisper.srt', 'engines/06-1-outro.crisper.txt',
    ]);
  });

  it("never moves another take's transcript that now holds the old name", async () => {
    saveAs('06-2-outro', 'sha-OTHER', 'groq');
    const moved = await relocateTranscripts(rec('06-2-outro.mov'), rec('06-2-outro-SKOOL.mov'), 'sha-MINE');
    expect(moved).toEqual([]);
    expect(fs.existsSync(tx('06-2-outro.txt'))).toBe(true);
  });
});

describe('the job follows the take', () => {
  it('a QUEUED job is submitted under the name the take has when it runs', async () => {
    const fli = controllableFlitools();
    const r = routesWith(fli.client);
    take('01-1-first.mov');
    take('06-1-recap.mov');
    await r.queueTranscription(rec('01-1-first.mov'));
    await r.queueTranscription(rec('06-1-recap.mov')); // waits behind 01-1-first

    await renameRecording('06-1-recap.mov', '06-1-outro.mov', paths, r.getActiveJob(), r.getQueue());
    expect(r.getQueue()[0].videoFilename).toBe('06-1-outro.mov');

    fli.views.set('j1', doneView('j1', 'sha-first', saveAs('01-1-first', 'sha-first', 'groq')));
    await until(() => fli.submits.length === 2, 'second submit');
    expect(fli.submits[1].path).toBe(rec('06-1-outro.mov'));
  });

  it('pass 1 RUNNING when renamed: what it saves under the old name lands under the new one, no orphans', async () => {
    const fli = controllableFlitools();
    const r = routesWith(fli.client);
    take('06-1-recap.mov');
    await r.queueTranscription(rec('06-1-recap.mov'));
    await until(() => fli.submits.length === 1, 'submit');

    const renamed = await renameRecording('06-1-recap.mov', '06-1-outro.mov', paths, r.getActiveJob(), r.getQueue());
    expect(renamed.success).toBe(true); // no longer "cannot rename while transcribing"
    expect(r.getActiveJob()?.videoFilename).toBe('06-1-outro.mov');

    // FliTools finishes under the name it was given
    fli.views.set('j1', doneView('j1', 'sha-A', saveAs('06-1-recap', 'sha-A', 'groq'), {
      upgrade: { jobId: 'p2', status: 'queued', provider: 'crisperwhisper' },
    }));
    await until(() => r.getActiveJob() === null, 'job done');
    await until(() => fs.existsSync(tx('06-1-outro.txt')), 'relocated');

    expect(transcriptFiles()).toEqual([
      '06-1-outro.json', '06-1-outro.srt', '06-1-outro.txt',
      'engines/06-1-outro.groq.json', 'engines/06-1-outro.groq.srt', 'engines/06-1-outro.groq.txt',
    ]);
    expect(r.getPass2Watches()).toEqual([expect.objectContaining({ jobId: 'p2', path: rec('06-1-recap.mov') })]);
  });

  it('pass 1 FAILS because the take was renamed under it: re-queued at the new name', async () => {
    const fli = controllableFlitools();
    const r = routesWith(fli.client);
    take('06-2-outro.mov');
    await r.queueTranscription(rec('06-2-outro.mov'));
    await until(() => fli.submits.length === 1, 'submit');

    await renameRecording('06-2-outro.mov', '06-2-outro-SKOOL.mov', paths, r.getActiveJob(), r.getQueue());
    fli.views.set('j1', { id: 'j1', status: 'failed', error: { failureMode: 'file-not-found', message: 'No file' } });

    await until(() => fli.submits.length === 2, 're-queued');
    expect(fli.submits[1].path).toBe(rec('06-2-outro-SKOOL.mov'));
  });

  it('pass 2 SKIPPED by FliTools because the old path is gone: FliHub asks again at the current name, and it lands there', async () => {
    const fli = controllableFlitools();
    const r = routesWith(fli.client);
    take('06-1-recap.mov');
    await r.queueTranscription(rec('06-1-recap.mov'));
    await until(() => fli.submits.length === 1, 'submit');
    fli.views.set('j1', doneView('j1', 'sha-A', saveAs('06-1-recap', 'sha-A', 'groq'), {
      upgrade: { jobId: 'p2', status: 'queued', provider: 'crisperwhisper' },
    }));
    await until(() => r.getPass2Watches().length === 1, 'pass 2 watched');

    // David renames after pass 1 (the D08 case)
    await renameRecording('06-1-recap.mov', '06-1-outro.mov', paths, r.getActiveJob(), r.getQueue());
    fli.views.set('p2', { id: 'p2', status: 'running' });
    await r.checkPass2();
    expect(fli.submits).toHaveLength(1); // still running: nothing yet

    fli.views.set('p2', { id: 'p2', status: 'done', upgraded: false, note: 'the recording changed or is gone since this was queued' });
    await r.checkPass2();

    expect(fli.submits[1]).toMatchObject({ path: rec('06-1-outro.mov'), tier: 'edit', forceSave: true });
    const again = fli.submits[1].id;
    expect(r.getPass2Watches()).toEqual([expect.objectContaining({ jobId: again, retried: true })]);

    // pass 2 at the new name lands under the new name
    fli.views.set(again, doneView(again, 'sha-A', saveAs('06-1-outro', 'sha-A', 'crisper'), { upgraded: true }));
    await r.checkPass2();
    expect(r.getPass2Watches()).toEqual([]);
    expect(JSON.parse(fs.readFileSync(tx('06-1-outro.json'), 'utf8')).verbatim).toBe(true);
    expect(transcriptFiles().filter((f) => f.includes('recap'))).toEqual([]);
  });

  it('pass 2 that SAVED under the old name after a rename is moved to the current name', async () => {
    const fli = controllableFlitools();
    const r = routesWith(fli.client);
    take('06-2-outro.mov');
    await r.queueTranscription(rec('06-2-outro.mov'));
    await until(() => fli.submits.length === 1, 'submit');
    fli.views.set('j1', doneView('j1', 'sha-B', saveAs('06-2-outro', 'sha-B', 'groq'), {
      upgrade: { jobId: 'p2', status: 'running' },
    }));
    await until(() => r.getPass2Watches().length === 1, 'pass 2 watched');

    await renameRecording('06-2-outro.mov', '06-2-outro-SKOOL.mov', paths, r.getActiveJob(), r.getQueue());
    // pass 2 was already running on the old path and writes there
    fli.views.set('p2', doneView('p2', 'sha-B', saveAs('06-2-outro', 'sha-B', 'crisper'), { upgraded: true }));
    await r.checkPass2();

    expect(transcriptFiles().filter((f) => /06-2-outro\./.test(f))).toEqual([]);
    expect(JSON.parse(fs.readFileSync(tx('06-2-outro-SKOOL.json'), 'utf8')).verbatim).toBe(true);
    expect(fs.existsSync(eng('06-2-outro-SKOOL.crisper.json'))).toBe(true);
    expect(fs.existsSync(eng('06-2-outro-SKOOL.groq.json'))).toBe(true);
    expect(fli.submits).toHaveLength(1); // it landed: no second ask
  });

  it('bulk rename then undo while pass 2 is out: the result follows both and lands under the original name', async () => {
    const fli = controllableFlitools();
    const r = routesWith(fli.client);
    take('04-1-demo.mov');
    await r.queueTranscription(rec('04-1-demo.mov'));
    await until(() => fli.submits.length === 1, 'submit');
    fli.views.set('j1', doneView('j1', 'sha-C', saveAs('04-1-demo', 'sha-C', 'groq'), {
      upgrade: { jobId: 'p2', status: 'queued' },
    }));
    await until(() => r.getPass2Watches().length === 1, 'pass 2 watched');

    await renameRecording('04-1-demo.mov', '05-1-demo.mov', paths, null, []); // bulk-rename to chapter 5
    await renameRecording('05-1-demo.mov', '04-1-demo.mov', paths, null, []); // undo (lastBatchMapping)
    fli.views.set('p2', doneView('p2', 'sha-C', saveAs('04-1-demo', 'sha-C', 'crisper'), { upgraded: true }));
    await r.checkPass2();

    expect(JSON.parse(fs.readFileSync(tx('04-1-demo.json'), 'utf8')).verbatim).toBe(true);
    expect(transcriptFiles().filter((f) => f.includes('05-1'))).toEqual([]);
    expect(fli.submits).toHaveLength(1);
  });

  it('a pass 2 that finished without a rename is left alone (no re-ask, even if kept)', async () => {
    const fli = controllableFlitools();
    const r = routesWith(fli.client);
    take('07-1-x.mov');
    await r.queueTranscription(rec('07-1-x.mov'));
    await until(() => fli.submits.length === 1, 'submit');
    fli.views.set('j1', doneView('j1', 'sha-D', saveAs('07-1-x', 'sha-D', 'groq'), { upgrade: { jobId: 'p2', status: 'queued' } }));
    await until(() => r.getPass2Watches().length === 1, 'pass 2 watched');
    fli.views.set('p2', { id: 'p2', status: 'done', upgraded: false, note: 'kept: groq is healthier' });
    await r.checkPass2();
    expect(fli.submits).toHaveLength(1);
    expect(r.getPass2Watches()).toEqual([]);
  });
});

describe('runFlitoolsJob — a reused answer', () => {
  it('reads the job for its result when submit answers done without one (was "did not save")', async () => {
    const files = { json: '/t/a.json', srt: '/t/a.srt', txt: '/t/a.txt' };
    const client: FlitoolsClient = {
      baseUrl: 'x',
      async submit() {
        return { id: 'r1', status: 'done', reused: 'cache' } as FlitoolsJobView;
      },
      async job(id) {
        return { id, status: 'done', result: { reused: 'cache', files } };
      },
    };
    const view = await runFlitoolsJob(client, '/p/recordings/a.mov');
    expect(view.result?.files).toEqual(files);
  });
});

describe('rename records survive a restart', () => {
  it('reloads renames and pass-2 watches from the state file', async () => {
    const stateFile = path.join(tmp, 'follow.json');
    fs.writeFileSync(
      stateFile,
      JSON.stringify({
        renames: [{ from: rec('a.mov'), to: rec('b.mov'), at: 5 }],
        pass2: [{ jobId: 'p9', path: rec('a.mov'), since: 1 }],
      })
    );
    const io = { emit: () => undefined } as never;
    const r = createTranscriptionRoutes(() => config, io, controllableFlitools().client, {}, { stateFile, pass2PollMs: 0 });
    stops.push(r.killActiveProcess);
    expect(getTakeRenames()).toHaveLength(1);
    expect(r.getPass2Watches()).toEqual([expect.objectContaining({ jobId: 'p9' })]);
    expect(currentPathOf(rec('a.mov'), 1)).toBe(rec('b.mov'));
  });
});
