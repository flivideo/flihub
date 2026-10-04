// Sound holes (D01 editing pass, item 5, 2026-10-04). Detector units built from the measured d01
// shape (03-4-flistudio.mov 12.30→12.97 s: speech −16 dB, hole −95…−110 dB, speech −20 dB), the
// state-file cleanup trap, promote + listing backfill through the real router, and a REAL ffmpeg
// decode of a synthetic take (skipped when ffmpeg is absent).
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'child_process';
import express from 'express';
import request from 'supertest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { findSoundHoles, checkTakeSoundHoles, readLevels } from '../utils/soundHoles.js';
import {
  createEmptyState,
  setSoundHoleCheck,
  setRecordingParked,
  setRecordingSafe,
  readProjectState,
  writeProjectState,
} from '../utils/projectState.js';
import { createRoutes } from '../routes/index.js';
import type { Config, FileInfo, SoundHoleCheck } from '../../../shared/types.js';

/** Levels (dB per 10 ms window) from [level, windows] segments. */
const levels = (...segments: [number, number][]) => segments.flatMap(([db, n]) => Array<number>(n).fill(db));
const LEAD_IN: [number, number] = [-150, 100]; // Ecamm's ~1 s of start silence
const SPEECH: [number, number] = [-20, 100];
const ROOM: [number, number] = [-65, 30];

describe('findSoundHoles', () => {
  it('d01 03-4 shape: a 0.67 s digital-zero hole between words is flagged, cutting both sides', () => {
    const holes = findSoundHoles(levels(LEAD_IN, SPEECH, [-100, 67], SPEECH));
    expect(holes).toEqual([{ start: 2, end: 2.67, duration: 0.67, floorDb: -100, cuts: 'both' }]);
  });

  it("the take's own lead-in and tail silence are not holes", () => {
    expect(findSoundHoles(levels(LEAD_IN, SPEECH, [-150, 40]))).toEqual([]);
  });

  it('a zeroed PAUSE (room tone on both sides) chops no word and is not flagged', () => {
    expect(findSoundHoles(levels(LEAD_IN, SPEECH, ROOM, [-100, 40], ROOM, SPEECH))).toEqual([]);
  });

  it('room tone before, speech straight after → it chops a word start', () => {
    const [hole] = findSoundHoles(levels(LEAD_IN, SPEECH, ROOM, [-110, 30], SPEECH));
    expect(hole.cuts).toBe('word-start');
  });

  it('speech before, room tone after → it chops a word end', () => {
    const [hole] = findSoundHoles(levels(LEAD_IN, SPEECH, [-110, 30], ROOM, SPEECH));
    expect(hole.cuts).toBe('word-end');
  });

  it('outside 0.1–0.7 s is not a hole (a click, or a real silence)', () => {
    expect(findSoundHoles(levels(LEAD_IN, SPEECH, [-100, 5], SPEECH))).toEqual([]);
    expect(findSoundHoles(levels(LEAD_IN, SPEECH, [-100, 90], SPEECH))).toEqual([]);
    expect(findSoundHoles(levels(LEAD_IN, SPEECH, [-100, 10], SPEECH))).toHaveLength(1);
    expect(findSoundHoles(levels(LEAD_IN, SPEECH, [-100, 70], SPEECH))).toHaveLength(1); // 03-1 measures 0.70
  });

  it('a quiet-but-live stretch (median above −90 dB) is not digital zero', () => {
    expect(findSoundHoles(levels(LEAD_IN, SPEECH, [-80, 40], SPEECH))).toEqual([]);
  });

  it('AAC codec blips inside a hole (−77 dB, as measured at 12.33 and 12.69 s) do not split it', () => {
    const holes = findSoundHoles(levels(LEAD_IN, SPEECH, [-100, 30], [-77, 2], [-100, 30], SPEECH));
    expect(holes).toHaveLength(1);
    expect(holes[0].duration).toBe(0.62);
  });

  it('speech further than 30 ms from the edge is not "instant on/off"', () => {
    expect(findSoundHoles(levels(LEAD_IN, SPEECH, [-65, 4], [-100, 40], [-65, 4], SPEECH))).toEqual([]);
  });
});

describe('checkTakeSoundHoles', () => {
  const now = () => new Date('2026-10-04T00:00:00Z');

  it('unreadable audio → unknown with the reason, never ok', async () => {
    const r = await checkTakeSoundHoles('/x.mov', { readLevels: async () => Promise.reject(new Error('the file has no audio track')), now });
    expect(r.status).toBe('unknown');
    expect(r.message).toContain('the file has no audio track');
  });

  it('holes → status holes with a message naming each time', async () => {
    const r = await checkTakeSoundHoles('/x.mov', { readLevels: async () => levels(LEAD_IN, SPEECH, [-100, 67], SPEECH), now });
    expect(r.status).toBe('holes');
    expect(r.message).toContain('1 sound hole');
    expect(r.message).toContain('2.00–2.67 s');
    expect(r.checkedAt).toBe('2026-10-04T00:00:00.000Z');
  });

  it('clean → ok', async () => {
    const r = await checkTakeSoundHoles('/x.mov', { readLevels: async () => levels(LEAD_IN, SPEECH, SPEECH), now });
    expect(r).toMatchObject({ status: 'ok', holes: [] });
  });
});

describe('state file: the check survives park/unpark/safe', () => {
  it('unpark and unsafe do NOT delete an entry that holds only a sound-hole check (cleanup trap)', () => {
    const check: SoundHoleCheck = { status: 'ok', holes: [], message: 'clean', checkedAt: 't' };
    let s = setSoundHoleCheck(createEmptyState(), '01-1-a.mov', check);
    s = setRecordingParked(setRecordingParked(s, '01-1-a.mov', true), '01-1-a.mov', false);
    s = setRecordingSafe(setRecordingSafe(s, '01-1-a.mov', true), '01-1-a.mov', false);
    expect(s.recordings['01-1-a.mov'].soundHoles).toEqual(check);
  });
});

describe('promote + listing backfill (real router)', () => {
  let tmp: string;
  let project: string;
  let pending: Map<string, FileInfo>;
  let checked: string[];
  let app: express.Express;
  const holes: SoundHoleCheck = {
    status: 'holes',
    holes: [{ start: 12.3, end: 12.97, duration: 0.67, floorDb: -100, cuts: 'both' }],
    message: '1 sound hole',
    checkedAt: 't',
  };

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'soundholes-route-'));
    project = path.join(tmp, 'root', 'd01-test');
    fs.mkdirSync(path.join(project, 'recordings'), { recursive: true });
    fs.mkdirSync(path.join(tmp, 'ecamm'));
    pending = new Map();
    checked = [];
    const config = {
      watchDirectory: path.join(tmp, 'ecamm'),
      projectDirectory: project,
      projectsRootDirectory: path.join(tmp, 'root'),
      fileExtensions: ['.mov'],
      availableTags: [],
      commonNames: [],
      imageSourceDirectory: tmp,
    } as Config;
    const fakeCheck = async (file: string) => {
      checked.push(path.basename(file));
      return holes;
    };
    const okAspect = async () => ({ status: 'skipped' as const, message: 'n/a', checkedAt: 't' });
    app = express();
    app.use(express.json());
    app.use('/api', createRoutes(pending, config, (c) => Object.assign(config, c), undefined, undefined, undefined, undefined, okAspect, fakeCheck));
  });
  afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

  const waitFor = async (pred: () => Promise<boolean>) => {
    for (let i = 0; i < 40; i++) {
      if (await pred()) return;
      await new Promise((r) => setTimeout(r, 25));
    }
    throw new Error('timed out');
  };

  it('a take whose ingest check landed carries it onto the promoted recording, not re-decoded', async () => {
    const p = path.join(tmp, 'ecamm', 'raw.mov');
    fs.writeFileSync(p, 'x');
    pending.set(p, { path: p, filename: 'raw.mov', timestamp: '', size: 1, soundHoles: holes });
    const res = await request(app).post('/api/rename').send({ originalPath: p, chapter: '03', sequence: '4', name: 'flistudio', tags: [] });
    expect(res.status).toBe(200);
    expect((await readProjectState(project)).recordings['03-4-flistudio.mov'].soundHoles).toEqual(holes);

    const list = await request(app).get('/api/recordings');
    expect(list.body.recordings[0].soundHoles).toEqual(holes);
    expect(checked).toEqual([]);
  });

  it('listing an unchecked recording reports it as unchecked, then backfills it once', async () => {
    fs.writeFileSync(path.join(project, 'recordings', '03-4-flistudio.mov'), 'x');
    const first = await request(app).get('/api/recordings');
    expect(first.body.recordings[0].filename).toBe('03-4-flistudio.mov');
    expect(first.body.recordings[0].soundHoles).toBeUndefined(); // unchecked — the row says "checking"

    await waitFor(async () => !!(await readProjectState(project)).recordings['03-4-flistudio.mov']?.soundHoles);
    const second = await request(app).get('/api/recordings');
    expect(second.body.recordings[0].soundHoles).toEqual(holes);
    expect(checked).toEqual(['03-4-flistudio.mov']);
  });

  it('an existing check is kept, not re-run', async () => {
    fs.writeFileSync(path.join(project, 'recordings', '01-1-intro.mov'), 'x');
    await writeProjectState(project, setSoundHoleCheck(createEmptyState(), '01-1-intro.mov', holes));
    await request(app).get('/api/recordings');
    await new Promise((r) => setTimeout(r, 50));
    expect(checked).toEqual([]);
  });
});

// Real ffmpeg: the decoder must SEE a zeroed stretch through AAC, not just do arithmetic on levels.
let hasFfmpeg = true;
try {
  execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
} catch {
  hasFfmpeg = false;
}

describe.skipIf(!hasFfmpeg)('real ffmpeg: synthetic Krisp-style take', () => {
  let dir: string;
  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'soundholes-ffmpeg-'));
    // Voice-like tone with a hard zero 1.50→2.00 s, AAC in a .mov like Ecamm's.
    execFileSync('ffmpeg', [
      '-v', 'error',
      '-f', 'lavfi', '-i', "aevalsrc='if(between(t,1.5,2),0,0.3*sin(2*PI*220*t))':d=3.5:s=48000",
      '-c:a', 'aac', path.join(dir, 'holed.mov'),
    ]);
    execFileSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'testsrc2=s=320x240:d=1:r=25', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', path.join(dir, 'silent.mov')]);
  }, 30_000);
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('finds the zeroed stretch at ~1.50–2.00 s, cutting speech on both sides', async () => {
    const r = await checkTakeSoundHoles(path.join(dir, 'holed.mov'));
    expect(r.status).toBe('holes');
    expect(r.holes).toHaveLength(1);
    expect(Math.abs(r.holes[0].start - 1.5)).toBeLessThanOrEqual(0.03);
    expect(Math.abs(r.holes[0].end - 2.0)).toBeLessThanOrEqual(0.03);
    expect(r.holes[0].cuts).toBe('both');
  }, 30_000);

  it('a file with no audio track is unknown with a plain reason', async () => {
    await expect(readLevels(path.join(dir, 'silent.mov'))).rejects.toThrow('the file has no audio track');
    const r = await checkTakeSoundHoles(path.join(dir, 'silent.mov'));
    expect(r.status).toBe('unknown');
  }, 30_000);
});
