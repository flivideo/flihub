import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import type { Config, TranscriptionJob } from '../../../shared/types.js';
import { getProjectPaths, type ProjectPaths } from '../../../shared/paths.js';
import { readProjectState, setRecordingParked, writeProjectState } from '../utils/projectState.js';

/**
 * CT-0107 — segment editing on a TEMP project (never a real one). Every assertion is on the disk, not the response:
 * FliHub has a history of honest-looking no-ops (CT-0076, CT-0078).
 */

let root: string;
let project: string;
let inbox: string;
let paths: ProjectPaths;
let active: TranscriptionJob | null;
let queue: TranscriptionJob[];
const queued: string[] = [];

async function appFor() {
  // A fresh import each time: nothing may survive in memory between a "before" and an "after restart" app.
  const { createSegmentRoutes } = await import('../routes/segments.js');
  const config = { projectDirectory: project, watchDirectory: inbox } as Config;
  const app = express();
  app.use(express.json());
  app.use(
    '/api/segments',
    createSegmentRoutes(
      () => config,
      undefined,
      (p) => queued.push(p),
      () => active,
      () => queue
    )
  );
  return app;
}

async function write(file: string, content = path.basename(file)) {
  await fs.ensureDir(path.dirname(file));
  await fs.writeFile(file, content);
}

/** A recording with its transcripts, an engine copy and an image asset, each holding its own name as content. */
async function take(filename: string) {
  const base = filename.replace(/\.mov$/, '');
  await write(path.join(paths.recordings, filename));
  for (const ext of ['.srt', '.txt', '.json'])
    await write(path.join(paths.transcripts, `${base}${ext}`));
  await write(path.join(paths.transcripts, 'engines', `${base}.parakeet.srt`));
  const [ch, seg] = filename.split('-');
  await write(path.join(paths.images, `${ch}-${seg}-1a-${base.split('-').slice(2).join('-')}.png`));
}

/** Every file under the project and the inbox, with its content — the "disk" the tests compare. */
async function disk(): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const walk = async (dir: string, label: string) => {
    for (const e of await fs.readdir(dir, { withFileTypes: true }).catch(() => [])) {
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) await walk(abs, `${label}/${e.name}`);
      else if (e.name !== '.flihub-segment-journal.json')
        out[`${label}/${e.name}`] = await fs.readFile(abs, 'utf8');
    }
  };
  await walk(project, 'project');
  await walk(inbox, 'inbox');
  return out;
}

const names = async (dir: string) => (await fs.readdir(dir).catch(() => [])).sort();
const recordings = () => names(paths.recordings);
const content = (file: string) => fs.readFile(file, 'utf8');

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'flihub-segops-'));
  project = path.join(root, 'd99-segment-test');
  inbox = path.join(root, 'ecamm');
  await fs.ensureDir(path.join(project, 'hub', 'recordings'));
  await fs.ensureDir(inbox);
  paths = getProjectPaths(project);
  active = null;
  queue = [];
  queued.length = 0;
  vi.resetModules();
});
afterEach(async () => {
  await fs.remove(root);
});

describe('Feature: replace a segment (R2)', () => {
  it('Scenario: given 06-1 is a placeholder, when an inbox take replaces it, then the old take and everything keyed to it are in -trash/ and the new take is 06-1 with its transcript queued', async () => {
    await take('06-1-placeholder.mov');
    await take('06-2-next.mov');
    await write(path.join(inbox, 'Ecamm Take 7.mov'), 'NEW TAKE');

    const res = await request(await appFor())
      .post('/api/segments/op')
      .send({
        mode: 'replace',
        chapter: '06',
        segment: 1,
        source: path.join(inbox, 'Ecamm Take 7.mov'),
        name: 'better-intro',
      });

    expect(res.status).toBe(200);
    expect(await recordings()).toEqual(['06-1-better-intro.mov', '06-2-next.mov']);
    expect(await content(path.join(paths.recordings, '06-1-better-intro.mov'))).toBe('NEW TAKE');
    expect(await fs.pathExists(path.join(inbox, 'Ecamm Take 7.mov'))).toBe(false);
    expect(await names(paths.trash)).toEqual([
      '06-1-1a-placeholder.png',
      '06-1-placeholder.json',
      '06-1-placeholder.mov',
      '06-1-placeholder.parakeet.srt',
      '06-1-placeholder.srt',
      '06-1-placeholder.txt',
    ]);
    expect(await names(paths.transcripts)).toEqual([
      '06-2-next.json',
      '06-2-next.srt',
      '06-2-next.txt',
      'engines',
    ]);
    expect(queued).toEqual([path.join(paths.recordings, '06-1-better-intro.mov')]);
  });

  it('Scenario: given no new name, when 06-1 is replaced, then the new take keeps the old name and the old one is still recoverable from -trash/', async () => {
    await take('06-1-intro.mov');
    await write(path.join(inbox, 'take.mov'), 'NEW');
    await request(await appFor())
      .post('/api/segments/op')
      .send({ mode: 'replace', chapter: '06', segment: 1, source: path.join(inbox, 'take.mov') })
      .expect(200);
    expect(await content(path.join(paths.recordings, '06-1-intro.mov'))).toBe('NEW');
    expect(await content(path.join(paths.trash, '06-1-intro.mov'))).toBe('06-1-intro.mov');
  });
});

describe('Feature: insert a segment (R3)', () => {
  it('Scenario: given 06-1 and 06-2, when a take is inserted before 06-2, then NEW = 06-2, old 06-2 = 06-3, and transcripts, engine copies and images follow their videos', async () => {
    await take('06-1-hook.mov');
    await take('06-2-demo.mov');
    await write(path.join(inbox, 'take.mov'), 'NEW');

    await request(await appFor())
      .post('/api/segments/op')
      .send({
        mode: 'insert',
        chapter: '06',
        before: 2,
        source: path.join(inbox, 'take.mov'),
        name: 'bridge',
      })
      .expect(200);

    expect(await recordings()).toEqual(['06-1-hook.mov', '06-2-bridge.mov', '06-3-demo.mov']);
    expect(await content(path.join(paths.recordings, '06-2-bridge.mov'))).toBe('NEW');
    expect(await content(path.join(paths.recordings, '06-3-demo.mov'))).toBe('06-2-demo.mov');
    expect(await content(path.join(paths.transcripts, '06-3-demo.srt'))).toBe('06-2-demo.srt');
    expect(await content(path.join(paths.transcripts, 'engines', '06-3-demo.parakeet.srt'))).toBe(
      '06-2-demo.parakeet.srt'
    );
    expect(await content(path.join(paths.images, '06-3-1a-demo.png'))).toBe('06-2-1a-demo.png');
    expect(await fs.pathExists(path.join(paths.transcripts, '06-2-demo.srt'))).toBe(false);
    expect(await fs.pathExists(paths.trash)).toBe(false);
  });
});

describe('Feature: reorder a segment (R4)', () => {
  it('Scenario: given 06-1, 06-2, 06-3, when 06-3 moves up, then old 06-3 = 06-2 and old 06-2 = 06-3, transcripts and state following', async () => {
    await take('06-1-a.mov');
    await take('06-2-b.mov');
    await take('06-3-c.mov');
    await writeProjectState(project, {
      version: 1,
      recordings: { '06-3-c.mov': { safe: true, annotation: 'keep me' } },
    });

    await request(await appFor())
      .post('/api/segments/op')
      .send({ mode: 'reorder', chapter: '06', segment: 3, direction: 'up' })
      .expect(200);

    expect(await recordings()).toEqual(['06-1-a.mov', '06-2-c.mov', '06-3-b.mov']);
    expect(await content(path.join(paths.recordings, '06-2-c.mov'))).toBe('06-3-c.mov');
    expect(await content(path.join(paths.transcripts, '06-2-c.txt'))).toBe('06-3-c.txt');
    expect(await content(path.join(paths.transcripts, '06-3-b.txt'))).toBe('06-2-b.txt');
    expect((await readProjectState(project)).recordings).toEqual({
      '06-2-c.mov': { safe: true, annotation: 'keep me' },
    });
  });

  it('Scenario: given two segments with the same slug, when they swap, then the two-phase rename never meets itself', async () => {
    await take('06-1-intro.mov');
    await write(path.join(paths.recordings, '06-2-intro.mov'), 'SECOND');
    await request(await appFor())
      .post('/api/segments/op')
      .send({ mode: 'reorder', chapter: '06', segment: 1, direction: 'down' })
      .expect(200);
    expect(await content(path.join(paths.recordings, '06-1-intro.mov'))).toBe('SECOND');
    expect(await content(path.join(paths.recordings, '06-2-intro.mov'))).toBe('06-1-intro.mov');
    expect(await content(path.join(paths.transcripts, '06-2-intro.srt'))).toBe('06-1-intro.srt');
    expect((await fs.readdir(paths.recordings)).some((f) => f.startsWith('.seg_'))).toBe(false);
  });

  it('Scenario: given 06-1 is first, when it moves up, then it is refused and nothing changes', async () => {
    await take('06-1-a.mov');
    const before = await disk();
    const res = await request(await appFor())
      .post('/api/segments/op')
      .send({ mode: 'reorder', chapter: '06', segment: 1, direction: 'up' });
    expect(res.status).toBe(409);
    expect(res.body.reason).toContain('already the first');
    expect(await disk()).toEqual(before);
  });
});

describe('Feature: delete a segment and close up (R5)', () => {
  it('Scenario: given three segments, when 06-2 is deleted, then old 06-3 = 06-2 and the deleted files are in -trash/', async () => {
    await take('06-1-a.mov');
    await take('06-2-b.mov');
    await take('06-3-c.mov');

    await request(await appFor())
      .post('/api/segments/op')
      .send({ mode: 'delete', chapter: '06', segment: 2 })
      .expect(200);

    expect(await recordings()).toEqual(['06-1-a.mov', '06-2-c.mov']);
    expect(await content(path.join(paths.recordings, '06-2-c.mov'))).toBe('06-3-c.mov');
    expect(await content(path.join(paths.transcripts, '06-2-c.srt'))).toBe('06-3-c.srt');
    expect(await names(paths.trash)).toContain('06-2-b.mov');
    expect(await names(paths.trash)).toContain('06-2-b.srt');
    expect(await names(paths.trash)).toContain('06-2-1a-b.png');
  });

  it('Scenario: given the trash already holds a file of the same name, when a segment is deleted, then the earlier one is never overwritten', async () => {
    await take('06-1-a.mov');
    await write(path.join(paths.trash, '06-1-a.mov'), 'EARLIER');
    await request(await appFor())
      .post('/api/segments/op')
      .send({ mode: 'delete', chapter: '06', segment: 1 })
      .expect(200);
    expect(await content(path.join(paths.trash, '06-1-a.mov'))).toBe('EARLIER');
    expect(await content(path.join(paths.trash, '06-1-a-1.mov'))).toBe('06-1-a.mov');
  });
});

describe('Feature: send several takes in (R6)', () => {
  it('Scenario: given two inbox takes picked in order, when sent, then they land as the next segments 06-3, 06-4 in that order, each queued', async () => {
    await take('06-1-a.mov');
    await take('06-2-b.mov');
    await write(path.join(inbox, 'second.mov'), 'PICKED FIRST');
    await write(path.join(inbox, 'first.mov'), 'PICKED SECOND');
    await write(path.join(inbox, 'bad.mov'), 'LEFT BEHIND');

    const res = await request(await appFor())
      .post('/api/segments/op')
      .send({
        mode: 'send',
        chapter: '06',
        sources: [path.join(inbox, 'second.mov'), path.join(inbox, 'first.mov')],
        name: 'walkthrough',
      })
      .expect(200);

    expect(res.body.op.promoted).toEqual(['06-3-walkthrough.mov', '06-4-walkthrough.mov']);
    expect(await content(path.join(paths.recordings, '06-3-walkthrough.mov'))).toBe('PICKED FIRST');
    expect(await content(path.join(paths.recordings, '06-4-walkthrough.mov'))).toBe(
      'PICKED SECOND'
    );
    expect(await names(inbox)).toEqual(['bad.mov']);
    expect(queued).toEqual([
      path.join(paths.recordings, '06-3-walkthrough.mov'),
      path.join(paths.recordings, '06-4-walkthrough.mov'),
    ]);
  });

  it('Scenario: given an empty chapter, when two takes are sent, then they are 09-1 and 09-2; one undo sends both back to the inbox', async () => {
    await write(path.join(inbox, 'a.mov'), 'A');
    await write(path.join(inbox, 'b.mov'), 'B');
    const before = await disk();
    const app = await appFor();
    await request(app)
      .post('/api/segments/op')
      .send({
        mode: 'send',
        chapter: '09',
        sources: [path.join(inbox, 'a.mov'), path.join(inbox, 'b.mov')],
        name: 'new',
      })
      .expect(200);
    expect(await recordings()).toEqual(['09-1-new.mov', '09-2-new.mov']);
    await request(app).post('/api/segments/undo').send({}).expect(200);
    expect(await disk()).toEqual(before);
  });

  it('Scenario: given one of the picked takes is gone or listed twice, when sent, then the whole send is refused and nothing moves', async () => {
    await write(path.join(inbox, 'a.mov'), 'A');
    const before = await disk();
    const app = await appFor();
    const gone = await request(app)
      .post('/api/segments/op')
      .send({
        mode: 'send',
        chapter: '06',
        sources: [path.join(inbox, 'a.mov'), path.join(inbox, 'gone.mov')],
        name: 'x',
      });
    expect(gone.status).toBe(409);
    expect(gone.body.blockers).toEqual([expect.objectContaining({ kind: 'not-found' })]);
    const twice = await request(app)
      .post('/api/segments/op')
      .send({
        mode: 'send',
        chapter: '06',
        sources: [path.join(inbox, 'a.mov'), path.join(inbox, 'a.mov')],
        name: 'x',
      });
    expect(twice.body.blockers[0].kind).toBe('invalid');
    expect(await disk()).toEqual(before);
  });
});

describe('Feature: one guarded operation (R8) — a refused op changes nothing on disk', () => {
  it('Scenario: given 06-2 is referenced by a FliCut cut, when 06-1 is deleted (closing 06-2 up), then the whole op is refused, naming the cut', async () => {
    await take('06-1-a.mov');
    await take('06-2-b.mov');
    await write(
      path.join(project, 'fli.cut.tour.json'),
      JSON.stringify({ medias: [{ id: 'u1', filePath: 'hub/recordings/06-2-b.mov' }] })
    );
    const before = await disk();

    const res = await request(await appFor())
      .post('/api/segments/op')
      .send({ mode: 'delete', chapter: '06', segment: 1 });

    expect(res.status).toBe(409);
    expect(res.body.refused).toBe(true);
    expect(res.body.reason).toContain('fli.cut.tour.json');
    expect(res.body.blockers).toEqual([
      expect.objectContaining({ kind: 'referenced', file: '06-2-b.mov' }),
    ]);
    expect(await disk()).toEqual(before);
  });

  it('Scenario: given the FliStudio cut draft names a take, when it would be replaced, then it is refused', async () => {
    await take('06-1-a.mov');
    await write(path.join(inbox, 'take.mov'));
    await write(
      path.join(project, 'fli.studio.cut-draft.json'),
      JSON.stringify({ order: ['hub/recordings/06-1-a.mov'] })
    );
    const before = await disk();
    const res = await request(await appFor())
      .post('/api/segments/op')
      .send({ mode: 'replace', chapter: '06', segment: 1, source: path.join(inbox, 'take.mov') });
    expect(res.status).toBe(409);
    expect(res.body.reason).toContain('fli.studio.cut-draft.json');
    expect(await disk()).toEqual(before);
  });

  it('Scenario: given a later segment is being transcribed, when a take is inserted before it, then the whole op is refused', async () => {
    await take('06-1-a.mov');
    await take('06-2-b.mov');
    await write(path.join(inbox, 'take.mov'));
    queue = [{ videoFilename: '06-2-b.mov' } as TranscriptionJob];
    const before = await disk();
    const res = await request(await appFor())
      .post('/api/segments/op')
      .send({
        mode: 'insert',
        chapter: '06',
        before: 1,
        source: path.join(inbox, 'take.mov'),
        name: 'x',
      });
    expect(res.status).toBe(409);
    expect(res.body.blockers).toEqual([
      expect.objectContaining({ kind: 'transcribing', file: '06-2-b.mov' }),
    ]);
    expect(await disk()).toEqual(before);
  });

  it('Scenario: given an orphan transcript sits at a destination name, when the op would land on it, then it is refused as a collision', async () => {
    await take('06-1-a.mov');
    await take('06-2-b.mov');
    await write(path.join(paths.transcripts, '06-1-b.srt'), 'ORPHAN');
    const before = await disk();
    const res = await request(await appFor())
      .post('/api/segments/op')
      .send({ mode: 'delete', chapter: '06', segment: 1 });
    expect(res.status).toBe(409);
    expect(res.body.blockers).toEqual([
      expect.objectContaining({ kind: 'collision', file: '06-1-b.srt' }),
    ]);
    expect(await disk()).toEqual(before);
  });

  it('Scenario: given an unreadable state file, when a segment would move, then it is refused rather than wiping every flag', async () => {
    await take('06-1-a.mov');
    await take('06-2-b.mov');
    await write(paths.stateFile, '{ not json');
    const before = await disk();
    const res = await request(await appFor())
      .post('/api/segments/op')
      .send({ mode: 'reorder', chapter: '06', segment: 2, direction: 'up' });
    expect(res.status).toBe(409);
    expect(res.body.blockers).toEqual([expect.objectContaining({ kind: 'unreadable' })]);
    expect(await disk()).toEqual(before);
  });

  it('Scenario: given two recordings share a segment number, when that segment is touched, then it is refused as ambiguous', async () => {
    await take('06-1-a.mov');
    await write(path.join(paths.recordings, '06-1-dupe.mov'));
    const before = await disk();
    const res = await request(await appFor())
      .post('/api/segments/op')
      .send({ mode: 'delete', chapter: '06', segment: 1 });
    expect(res.status).toBe(409);
    expect(res.body.blockers[0].kind).toBe('ambiguous');
    expect(await disk()).toEqual(before);
  });

  it('Scenario: given a take outside the inbox, when it is sent in, then it is refused and stays where it is', async () => {
    await take('06-1-a.mov');
    const elsewhere = path.join(root, 'elsewhere', 'take.mov');
    await write(elsewhere);
    const before = await disk();
    const res = await request(await appFor())
      .post('/api/segments/op')
      .send({ mode: 'replace', chapter: '06', segment: 1, source: elsewhere });
    expect(res.status).toBe(409);
    expect(res.body.reason).toContain('outside it');
    expect(await fs.pathExists(elsewhere)).toBe(true);
    expect(await disk()).toEqual(before);
  });

  it('Scenario: given bad input or a missing segment or take, when asked, then each is refused with a plain reason', async () => {
    await take('06-1-a.mov');
    const app = await appFor();
    const before = await disk();
    for (const [body, kind] of [
      [{ mode: 'explode', chapter: '06', segment: 1 }, 'invalid'],
      [{ mode: 'delete', chapter: '6', segment: 1 }, 'invalid'],
      [{ mode: 'delete', chapter: '06', segment: 0 }, 'invalid'],
      [{ mode: 'delete', chapter: '06', segment: 4 }, 'not-found'],
      [
        { mode: 'replace', chapter: '06', segment: 1, source: path.join(inbox, 'nope.mov') },
        'not-found',
      ],
      [{ mode: 'replace', chapter: '06', segment: 1, source: 'relative.mov' }, 'invalid'],
      [
        { mode: 'insert', chapter: '06', before: 1, source: path.join(inbox, 'x.mov'), name: '' },
        'invalid',
      ],
    ] as const) {
      const res = await request(app).post('/api/segments/op').send(body);
      expect(res.status, JSON.stringify(body)).toBe(409);
      expect(res.body.blockers[0].kind, JSON.stringify(body)).toBe(kind);
      expect(res.body.reason.length).toBeGreaterThan(0);
    }
    expect(await disk()).toEqual(before);
  });
});

describe('Feature: a failure part-way never leaves a half-renumbered chapter (R8)', () => {
  it('Scenario: given the state file cannot be written, when an op has already moved its files, then every file is put back and the answer says so', async () => {
    await take('06-1-a.mov');
    await take('06-2-b.mov');
    await take('06-3-c.mov');
    // A moving take has a state entry, so the op must write state — and that write is made to fail.
    await writeProjectState(project, { version: 1, recordings: { '06-2-b.mov': { safe: true } } });
    vi.doMock('../utils/projectState.js', async (importOriginal) => ({
      ...(await importOriginal<typeof import('../utils/projectState.js')>()),
      writeProjectState: async () => {
        throw new Error('disk full');
      },
    }));
    const before = await disk();

    try {
      const res = await request(await appFor())
        .post('/api/segments/op')
        .send({ mode: 'delete', chapter: '06', segment: 1 });

      expect(res.status).toBe(500);
      expect(res.body.reason).toBe('Nothing was changed: disk full (every file was put back).');
      expect(await disk()).toEqual(before);
      expect((await request(await appFor()).get('/api/segments/journal')).body.entries).toEqual([]);
    } finally {
      vi.doUnmock('../utils/projectState.js');
    }
  });

  it('Scenario: given two reorders sent at once, when both run, then they run one after the other and the chapter is consistent', async () => {
    await take('06-1-a.mov');
    await take('06-2-b.mov');
    const app = await appFor();
    const up = { mode: 'reorder', chapter: '06', segment: 2, direction: 'up' };
    const [r1, r2] = await Promise.all([
      request(app).post('/api/segments/op').send(up),
      request(app).post('/api/segments/op').send(up),
    ]);
    expect([r1.status, r2.status]).toEqual([200, 200]);
    // Two swaps of the same pair: back where it started, with no temp file left behind.
    expect(await recordings()).toEqual(['06-1-a.mov', '06-2-b.mov']);
    expect(await content(path.join(paths.recordings, '06-1-a.mov'))).toBe('06-1-a.mov');
    expect(await content(path.join(paths.transcripts, '06-2-b.srt'))).toBe('06-2-b.srt');
  });
});

describe('Feature: journal and undo that survive a restart (R9)', () => {
  const ops = [
    ['replace', { mode: 'replace', chapter: '06', segment: 2, name: 'better' }],
    ['insert', { mode: 'insert', chapter: '06', before: 2, name: 'bridge' }],
    ['reorder', { mode: 'reorder', chapter: '06', segment: 3, direction: 'up' }],
    ['delete', { mode: 'delete', chapter: '06', segment: 2 }],
  ] as const;

  for (const [mode, op] of ops) {
    it(`Scenario: given a ${mode}, when the server restarts and the op is undone, then the disk is identical to before`, async () => {
      await take('06-1-a.mov');
      await take('06-2-b.mov');
      await take('06-3-c.mov');
      await writeProjectState(project, {
        version: 1,
        recordings: { '06-2-b.mov': { parked: true }, '06-3-c.mov': { safe: true } },
      });
      await write(path.join(inbox, 'take.mov'), 'NEW');
      const source = path.join(inbox, 'take.mov');
      const before = await disk();

      const done = await request(await appFor())
        .post('/api/segments/op')
        .send({ ...op, ...(mode === 'replace' || mode === 'insert' ? { source } : {}) })
        .expect(200);
      expect(await disk()).not.toEqual(before);

      // Restart: a brand-new module graph and app. Only the journal on disk carries the op.
      vi.resetModules();
      const restarted = await appFor();
      const journal = await request(restarted).get('/api/segments/journal').expect(200);
      expect(journal.body.entries[0]).toMatchObject({ id: done.body.op.id, mode, undoneAt: null });

      await request(restarted).post('/api/segments/undo').send({ id: done.body.op.id }).expect(200);
      expect(await disk()).toEqual(before);
      expect(
        (await request(restarted).get('/api/segments/journal')).body.entries[0].undoneAt
      ).not.toBeNull();
    });
  }

  it('Scenario: given a replace whose new take has since been transcribed, when undone, then the old take and its transcripts are back and the new take returns to the inbox', async () => {
    await take('06-1-intro.mov');
    await write(path.join(inbox, 'take.mov'), 'NEW');
    const app = await appFor();
    await request(app)
      .post('/api/segments/op')
      .send({ mode: 'replace', chapter: '06', segment: 1, source: path.join(inbox, 'take.mov') })
      .expect(200);
    await write(path.join(paths.transcripts, '06-1-intro.srt'), 'NEW TRANSCRIPT');

    await request(app).post('/api/segments/undo').send({}).expect(200);

    expect(await content(path.join(paths.recordings, '06-1-intro.mov'))).toBe('06-1-intro.mov');
    expect(await content(path.join(paths.transcripts, '06-1-intro.srt'))).toBe('06-1-intro.srt');
    expect(await content(path.join(inbox, 'take.mov'))).toBe('NEW');
    // The old transcript held the plain name in -trash/ when the new one went in, so the new one is suffixed.
    expect(await content(path.join(paths.trash, '06-1-intro-1.srt'))).toBe('NEW TRANSCRIPT');
  });

  it('Scenario: given nothing to undo, or an older op named, when undo is asked, then it is refused', async () => {
    const app = await appFor();
    const none = await request(app).post('/api/segments/undo').send({});
    expect(none.status).toBe(409);
    expect(none.body.blockers[0].kind).toBe('nothing-to-undo');

    await take('06-1-a.mov');
    await take('06-2-b.mov');
    const first = await request(app)
      .post('/api/segments/op')
      .send({ mode: 'reorder', chapter: '06', segment: 2, direction: 'up' });
    await request(app)
      .post('/api/segments/op')
      .send({ mode: 'reorder', chapter: '06', segment: 2, direction: 'up' })
      .expect(200);
    const before = await disk();
    const older = await request(app).post('/api/segments/undo').send({ id: first.body.op.id });
    expect(older.status).toBe(409);
    expect(older.body.reason).toContain('Only the latest change');
    expect(await disk()).toEqual(before);
  });

  it('Scenario: given a moved take was renamed by hand since, when undo is asked, then it is refused and nothing moves', async () => {
    await take('06-1-a.mov');
    await take('06-2-b.mov');
    const app = await appFor();
    await request(app)
      .post('/api/segments/op')
      .send({ mode: 'delete', chapter: '06', segment: 1 })
      .expect(200);
    await fs.move(
      path.join(paths.recordings, '06-1-b.mov'),
      path.join(paths.recordings, '06-1-renamed.mov')
    );
    const before = await disk();
    const res = await request(app).post('/api/segments/undo').send({});
    expect(res.status).toBe(409);
    expect(res.body.blockers.some((b: { kind: string }) => b.kind === 'not-found')).toBe(true);
    expect(await disk()).toEqual(before);
  });
});

describe('Feature: a placeholder flag on a segment (R7)', () => {
  const mark = (app: express.Express, filename: string, placeholder: boolean) =>
    request(app).post('/api/segments/placeholder').send({ filename, placeholder });

  it('Scenario: given a segment, when it is marked and unmarked, then only the state file changes, never the name', async () => {
    await take('06-1-a.mov');
    const app = await appFor();
    await mark(app, '06-1-a.mov', true).expect(200);
    expect((await readProjectState(project)).recordings).toEqual({
      '06-1-a.mov': { placeholder: true },
    });
    expect(await recordings()).toEqual(['06-1-a.mov']);
    await mark(app, '06-1-a.mov', false).expect(200);
    expect((await readProjectState(project)).recordings).toEqual({});
  });

  it('Scenario: given a placeholder segment, when it is replaced, then the flag is gone; when it is moved, the flag goes with it', async () => {
    await take('06-1-a.mov');
    await take('06-2-b.mov');
    await write(path.join(inbox, 'take.mov'));
    const app = await appFor();
    await mark(app, '06-2-b.mov', true).expect(200);
    await request(app)
      .post('/api/segments/op')
      .send({ mode: 'reorder', chapter: '06', segment: 2, direction: 'up' })
      .expect(200);
    expect((await readProjectState(project)).recordings).toEqual({
      '06-1-b.mov': { placeholder: true },
    });

    await request(app)
      .post('/api/segments/op')
      .send({
        mode: 'replace',
        chapter: '06',
        segment: 1,
        source: path.join(inbox, 'take.mov'),
        name: 'b-again',
      })
      .expect(200);
    expect((await readProjectState(project)).recordings).toEqual({});
    expect(await recordings()).toEqual(['06-1-b-again.mov', '06-2-a.mov']);
  });

  it('Scenario: given a placeholder segment that is also parked, when it is unparked, then the placeholder survives', () => {
    const parked = setRecordingParked(
      { version: 1, recordings: { 'x.mov': { placeholder: true } } },
      'x.mov',
      true
    );
    expect(setRecordingParked(parked, 'x.mov', false).recordings['x.mov']).toEqual({
      placeholder: true,
      parked: false,
    });
  });

  it('Scenario: given a missing recording, a path or a bad body, when marked, then it is refused and nothing is written', async () => {
    const app = await appFor();
    expect((await mark(app, '06-9-none.mov', true)).body.blockers[0].kind).toBe('not-found');
    expect((await mark(app, '../06-1-a.mov', true)).body.blockers[0].kind).toBe('invalid');
    expect(
      (await request(app).post('/api/segments/placeholder').send({ filename: 'x' })).status
    ).toBe(400);
    expect(await fs.pathExists(paths.stateFile)).toBe(false);
  });
});
