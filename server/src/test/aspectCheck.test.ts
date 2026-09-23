// Aspect check (David, 2026-09-23). Classifier units, the fli.studio.json gate, the state-file
// trap (park/unpark must not drop the warning), promote → warning → dismiss through the real
// router, and a REAL ffmpeg run on a synthetic pillarboxed take (skipped when ffmpeg is absent).
import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'child_process';
import express from 'express';
import request from 'supertest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { classifyAspect, checkTakeAspect, probeFrame, detectPicture, type AspectCheckDeps } from '../utils/aspectCheck.js';
import {
  createEmptyState,
  setAspectWarning,
  setRecordingParked,
  setRecordingSafe,
  dismissAspectWarning,
  getActiveAspectWarning,
  writeProjectState,
  readProjectState,
} from '../utils/projectState.js';
import { createRoutes } from '../routes/index.js';
import type { AspectCheck, Config, FileInfo } from '../../../shared/types.js';

const identity = (extra: Record<string, unknown> = {}) => ({
  schema: 1,
  id: '956b85b5-79d2-4035-bf2c-8182a131718b',
  brand: 'beauty-and-joy',
  code: 'a01',
  name: 'Test project',
  createdAt: '2026-09-23T03:08:49.122Z',
  ...extra,
});

describe('classifyAspect', () => {
  it("David's real case: portrait feed pillarboxed in a 1920×1080 canvas, project 9:16", () => {
    const r = classifyAspect('9:16', { width: 1920, height: 1080 }, { width: 608, height: 1080 });
    expect(r.status).toBe('mismatch');
    expect(r.message).toBe(
      'expected 9:16 portrait · got 1920×1080 with a 608×1080 picture (68% black) — set Ecamm to a 1080×1920 canvas',
    );
  });

  it('a correct portrait take is ok (and encoder padding 1088×1920 still counts)', () => {
    expect(classifyAspect('9:16', { width: 1080, height: 1920 }, { width: 1080, height: 1920 }).status).toBe('ok');
    expect(classifyAspect('9:16', { width: 1088, height: 1920 }, null).status).toBe('ok');
  });

  it('wrong canvas with no bars', () => {
    const r = classifyAspect('16:9', { width: 1080, height: 1920 }, { width: 1080, height: 1920 });
    expect(r.status).toBe('mismatch');
    expect(r.message).toBe('expected 16:9 landscape · got 1080×1920 — set Ecamm to a 1920×1080 canvas');
  });

  it('right canvas, wrong picture inside it (landscape project, portrait feed)', () => {
    const r = classifyAspect('16:9', { width: 1920, height: 1080 }, { width: 608, height: 1080 });
    expect(r.status).toBe('mismatch');
    expect(r.message).toContain('the 1920×1080 canvas is right, but the picture inside is 608×1080 (68% black)');
  });

  it('small bars (≥90% coverage) are noise, not a mismatch', () => {
    expect(classifyAspect('16:9', { width: 1920, height: 1080 }, { width: 1920, height: 1040 }).status).toBe('ok');
  });

  it('unknown picture falls back to the frame alone', () => {
    expect(classifyAspect('9:16', { width: 1920, height: 1080 }, null).status).toBe('mismatch');
  });
});

describe('checkTakeAspect — the fli.studio.json gate', () => {
  let dir: string;
  const deps = (frame: { width: number; height: number } | null): AspectCheckDeps => ({
    probeFrame: async () => frame,
    detectPicture: async () => null,
    now: () => new Date('2026-09-23T00:00:00Z'),
  });
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aspect-gate-'));
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('no fli.studio.json → skipped, says why, never probes', async () => {
    let probed = false;
    const r = await checkTakeAspect('/x.mov', dir, 5, { ...deps(null), probeFrame: async () => ((probed = true), null) });
    expect(r.status).toBe('skipped');
    expect(r.message).toContain('no aspect set');
    expect(probed).toBe(false);
  });

  it('fli.studio.json without aspect → skipped (the 16:9 default is NOT assumed)', async () => {
    fs.writeFileSync(path.join(dir, 'fli.studio.json'), JSON.stringify(identity()));
    expect((await checkTakeAspect('/x.mov', dir, 5, deps({ width: 1080, height: 1920 }))).status).toBe('skipped');
  });

  it('aspect 9:16 declared → checked', async () => {
    fs.writeFileSync(path.join(dir, 'fli.studio.json'), JSON.stringify(identity({ aspect: '9:16' })));
    const r = await checkTakeAspect('/x.mov', dir, 5, deps({ width: 1920, height: 1080 }));
    expect(r).toMatchObject({ status: 'mismatch', expected: '9:16', checkedAt: '2026-09-23T00:00:00.000Z' });
  });

  it('unreadable video → unknown, not ok', async () => {
    fs.writeFileSync(path.join(dir, 'fli.studio.json'), JSON.stringify(identity({ aspect: '9:16' })));
    expect((await checkTakeAspect('/x.mov', dir, 5, deps(null))).status).toBe('unknown');
  });
});

describe('state file: the warning survives, and dismissing keeps history', () => {
  const warning: AspectCheck = { status: 'mismatch', expected: '9:16', message: 'm', checkedAt: 't' };

  it('park then unpark does NOT delete the entry holding an aspect warning (cleanup trap)', () => {
    let s = setAspectWarning(createEmptyState(), '01-1-a.mov', warning);
    s = setRecordingParked(s, '01-1-a.mov', true);
    s = setRecordingParked(s, '01-1-a.mov', false);
    s = setRecordingSafe(s, '01-1-a.mov', false);
    expect(getActiveAspectWarning(s, '01-1-a.mov')).toEqual(warning);
  });

  it('dismiss hides it but keeps dismissedAt; round-trips through writeProjectState', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aspect-state-'));
    try {
      let s = setAspectWarning(createEmptyState(), '01-1-a.mov', warning);
      s = dismissAspectWarning(s, '01-1-a.mov', new Date('2026-09-23T01:00:00Z'));
      await writeProjectState(dir, s);
      const back = await readProjectState(dir);
      expect(getActiveAspectWarning(back, '01-1-a.mov')).toBeUndefined();
      expect(back.recordings['01-1-a.mov'].aspectWarning?.dismissedAt).toBe('2026-09-23T01:00:00.000Z');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('promote → warning on the recording → dismiss (real router)', () => {
  let tmp: string;
  let project: string;
  let pending: Map<string, FileInfo>;
  let app: express.Express;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aspect-route-'));
    project = path.join(tmp, 'root', 'a01-test');
    fs.mkdirSync(path.join(project, 'recordings'), { recursive: true });
    fs.mkdirSync(path.join(tmp, 'ecamm'));
    pending = new Map();
    const config = {
      watchDirectory: path.join(tmp, 'ecamm'),
      projectDirectory: project,
      projectsRootDirectory: path.join(tmp, 'root'),
      fileExtensions: ['.mov'],
      availableTags: [],
      commonNames: [],
      imageSourceDirectory: tmp,
    } as Config;
    app = express();
    app.use(express.json());
    app.use('/api', createRoutes(pending, config, (c) => Object.assign(config, c)));
  });
  afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

  const land = (name: string, aspectCheck?: AspectCheck) => {
    const p = path.join(tmp, 'ecamm', name);
    fs.writeFileSync(p, 'x');
    pending.set(p, { path: p, filename: name, timestamp: '', size: 1, aspectCheck });
    return p;
  };

  it('a mismatched take carries its warning onto the promoted recording; dismiss clears it', async () => {
    const bad: AspectCheck = { status: 'mismatch', expected: '9:16', message: 'expected 9:16 portrait · got 1920×1080', checkedAt: 't' };
    const res = await request(app)
      .post('/api/rename')
      .send({ originalPath: land('raw.mov', bad), chapter: '01', sequence: '1', name: 'intro', tags: [] });
    expect(res.status).toBe(200);
    const state = await readProjectState(project);
    expect(getActiveAspectWarning(state, '01-1-intro.mov')).toEqual(bad);

    const d = await request(app).post('/api/recordings/aspect-dismiss').send({ files: ['01-1-intro.mov', '01-2-other.mov'] });
    expect(d.body).toEqual({ success: true, dismissed: ['01-1-intro.mov'], notFlagged: ['01-2-other.mov'] });
    expect(getActiveAspectWarning(await readProjectState(project), '01-1-intro.mov')).toBeUndefined();
  });

  it('an ok take writes nothing to state', async () => {
    const ok: AspectCheck = { status: 'ok', expected: '9:16', message: 'Matches', checkedAt: 't' };
    await request(app).post('/api/rename').send({ originalPath: land('raw.mov', ok), chapter: '01', sequence: '1', name: 'intro', tags: [] });
    expect((await readProjectState(project)).recordings['01-1-intro.mov']).toBeUndefined();
  });

  it('race: a take promoted before its ingest probe finished is still checked, on the promoted file', async () => {
    // Fail-first (2026-09-23): an agent that renamed within the cropdetect window got no check and no warning.
    const bad: AspectCheck = { status: 'mismatch', expected: '9:16', message: 'expected 9:16 portrait · got 1920×1080', checkedAt: 't' };
    const probed: string[] = [];
    const slowProbe = async (file: string) => {
      probed.push(file);
      await new Promise((r) => setTimeout(r, 50));
      return bad;
    };
    const config = { watchDirectory: path.join(tmp, 'ecamm'), projectDirectory: project, fileExtensions: ['.mov'], availableTags: [], commonNames: [], imageSourceDirectory: tmp } as unknown as Config;
    const raceApp = express();
    raceApp.use(express.json());
    raceApp.use('/api', createRoutes(pending, config, (c) => Object.assign(config, c), undefined, undefined, undefined, undefined, slowProbe));

    const res = await request(raceApp)
      .post('/api/rename')
      .send({ originalPath: land('raw.mov' /* no aspectCheck yet */), chapter: '01', sequence: '1', name: 'intro', tags: [] });
    expect(res.status).toBe(200);
    expect(res.body.aspect).toBe('pending'); // says the check is still running, never silently skipped

    let warning: AspectCheck | undefined;
    for (let i = 0; i < 40 && !warning; i++) {
      await new Promise((r) => setTimeout(r, 25));
      warning = getActiveAspectWarning(await readProjectState(project), '01-1-intro.mov');
    }
    expect(warning).toEqual(bad);
    expect(probed).toEqual([path.join(project, 'recordings', '01-1-intro.mov')]);
  });

  it('a take whose probe already landed reports its status and is not probed again', async () => {
    const ok: AspectCheck = { status: 'ok', expected: '9:16', message: 'Matches', checkedAt: 't' };
    const res = await request(app).post('/api/rename').send({ originalPath: land('raw.mov', ok), chapter: '01', sequence: '1', name: 'intro', tags: [] });
    expect(res.body.aspect).toBe('ok');
  });

  it('dismiss rejects a bad body', async () => {
    expect((await request(app).post('/api/recordings/aspect-dismiss').send({ files: [] })).status).toBe(400);
  });
});

// Real ffmpeg: the check must SEE a pillarboxed portrait picture, not just do arithmetic on it.
let hasFfmpeg = true;
try {
  execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
} catch {
  hasFfmpeg = false;
}

describe.skipIf(!hasFfmpeg)('real ffmpeg: synthetic Beauty & Joy take', () => {
  let dir: string;
  let file: string;
  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aspect-ffmpeg-'));
    file = path.join(dir, 'pillarboxed.mov');
    // 608×1080 moving test picture, padded with black to a 1920×1080 canvas, 3 seconds.
    execFileSync('ffmpeg', [
      '-v', 'error', '-f', 'lavfi', '-i', 'testsrc2=s=608x1080:d=3:r=25,pad=1920:1080:(ow-iw)/2:0:black',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', file,
    ]);
  }, 30_000);

  it('probes 1920×1080, finds a ~608×1080 picture, and calls it a mismatch for 9:16', async () => {
    const frame = await probeFrame(file);
    expect(frame).toEqual({ width: 1920, height: 1080 });
    const picture = await detectPicture(file, 3);
    expect(picture).not.toBeNull();
    expect(Math.abs(picture!.width - 608)).toBeLessThanOrEqual(8);
    expect(picture!.height).toBe(1080);
    const r = classifyAspect('9:16', frame!, picture);
    expect(r.status).toBe('mismatch');
    expect(r.message).toContain('set Ecamm to a 1080×1920 canvas');
    fs.rmSync(dir, { recursive: true, force: true });
  }, 30_000);
});
