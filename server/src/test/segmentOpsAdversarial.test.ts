import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import type { Config } from '../../../shared/types.js';
import { getProjectPaths, type ProjectPaths } from '../../../shared/paths.js';
import { writeProjectState } from '../utils/projectState.js';

/**
 * CT-0107 Tester round 1 — what segmentOps.test.ts does not reach. TEMP project only; every assertion is on disk.
 * `it.fails` marks an open finding: it passes while the defect exists and goes red the day the fix lands (then flip it).
 */

let root: string;
let project: string;
let inbox: string;
let paths: ProjectPaths;

async function appFor(watchDirectory: string = inbox) {
  const { createSegmentRoutes } = await import('../routes/segments.js');
  const config = { projectDirectory: project, watchDirectory } as Config;
  const app = express();
  app.use(express.json());
  app.use(
    '/api/segments',
    createSegmentRoutes(
      () => config,
      undefined,
      () => {},
      () => null,
      () => []
    )
  );
  return app;
}
async function write(file: string, content = path.basename(file)) {
  await fs.ensureDir(path.dirname(file));
  await fs.writeFile(file, content);
}
async function take(filename: string) {
  const base = filename.replace(/\.mov$/, '');
  const [ch, seg] = filename.split('-');
  await write(path.join(paths.recordings, filename));
  await write(path.join(paths.transcripts, `${base}.srt`));
  await write(path.join(paths.images, `${ch}-${seg}-1a-${base.split('-').slice(2).join('-')}.png`));
}
/** Every file and every folder under the root; folders end in "/" so an empty leftover folder shows up. */
async function tree(dir = root, out: string[] = []): Promise<string[]> {
  for (const e of await fs.readdir(dir, { withFileTypes: true }).catch(() => [])) {
    const abs = path.join(dir, e.name);
    const rel = path.relative(root, abs);
    if (e.isDirectory()) {
      out.push(`${rel}/`);
      await tree(abs, out);
    } else if (e.name !== '.flihub-segment-journal.json') {
      out.push(`${rel} = ${await fs.readFile(abs, 'utf8')}`);
    }
  }
  return out.sort();
}
const names = async (dir: string) => (await fs.readdir(dir).catch(() => [])).sort();

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'flihub-segops-adv-'));
  project = path.join(root, 'd99-segment-test');
  inbox = path.join(root, 'ecamm');
  await fs.ensureDir(path.join(project, 'hub', 'recordings'));
  await fs.ensureDir(inbox);
  paths = getProjectPaths(project);
  vi.resetModules();
});
afterEach(async () => {
  await fs.chmod(paths.transcripts, 0o755).catch(() => undefined);
  await fs.remove(root);
});

describe('Feature: a step failing part-way puts every moved file back (R8)', () => {
  it('Scenario: given the transcripts folder is read-only, when a delete has already trashed the video, then the video is back and no file moved', async () => {
    await take('06-1-a.mov');
    await take('06-2-b.mov');
    const before = (await tree()).filter((l) => !l.endsWith('/'));
    await fs.chmod(paths.transcripts, 0o555);

    const res = await request(await appFor())
      .post('/api/segments/op')
      .send({ mode: 'delete', chapter: '06', segment: 1 });

    await fs.chmod(paths.transcripts, 0o755);
    expect(res.status).toBe(500);
    expect(res.body.reason).toContain('every file was put back');
    expect((await tree()).filter((l) => !l.endsWith('/'))).toEqual(before);
    expect((await request(await appFor()).get('/api/segments/journal')).body.entries).toEqual([]);
  });
});

describe('Feature: undo leaves the project exactly as it found it, folders included (R9)', () => {
  it('Scenario: given a delete that created -trash/, when it is undone after a restart, then no -trash/ folder is left behind', async () => {
    await take('06-1-a.mov');
    await take('06-2-b.mov');
    await writeProjectState(project, { version: 1, recordings: { '06-2-b.mov': { safe: true } } });
    const before = await tree();
    const done = await request(await appFor())
      .post('/api/segments/op')
      .send({ mode: 'delete', chapter: '06', segment: 1 })
      .expect(200);
    expect(await fs.pathExists(paths.trash)).toBe(true);

    vi.resetModules();
    await request(await appFor())
      .post('/api/segments/undo')
      .send({ id: done.body.op.id })
      .expect(200);

    expect(await tree()).toEqual(before);
  });

  it('Scenario: given the server died after the moves but before the journal was finalised (entry still pending), when it restarts and undo is asked, then the disk is identical to before', async () => {
    await take('06-1-a.mov');
    await take('06-2-b.mov');
    await take('06-3-c.mov');
    await writeProjectState(project, { version: 1, recordings: { '06-3-c.mov': { safe: true } } });
    const before = await tree();
    await request(await appFor())
      .post('/api/segments/op')
      .send({ mode: 'reorder', chapter: '06', segment: 3, direction: 'up' })
      .expect(200);
    const journalFile = path.join(project, '.flihub-segment-journal.json');
    const journal = await fs.readJson(journalFile);
    journal.entries[0].pending = true;
    await fs.writeJson(journalFile, journal);

    vi.resetModules();
    await request(await appFor())
      .post('/api/segments/undo')
      .send({})
      .expect(200);

    expect(await tree()).toEqual(before);
  });
});

describe('Feature: a project with no state file is left without one (R9)', () => {
  // Open finding (Tester CT-0107 r1): every renumber/delete writes `.flihub-state.json` even when it has nothing to say.
  it.fails(
    'Scenario: given a project that never had a state file, when a reorder is undone, then the disk is identical to before (no new .flihub-state.json)',
    async () => {
      await take('06-1-a.mov');
      await take('06-2-b.mov');
      const before = await tree();
      const app = await appFor();
      await request(app)
        .post('/api/segments/op')
        .send({ mode: 'reorder', chapter: '06', segment: 2, direction: 'up' })
        .expect(200);
      await request(app).post('/api/segments/undo').send({}).expect(200);
      expect(await tree()).toEqual(before);
    }
  );
});

describe('Feature: segment numbers with more than one digit (R3, R5)', () => {
  it('Scenario: given 06-1 and 06-10, when 06-1 is deleted, then 06-10 closes up to 06-9 and 06-1 files in the trash are not 06-10 files', async () => {
    await take('06-1-a.mov');
    await take('06-10-j.mov');

    await request(await appFor())
      .post('/api/segments/op')
      .send({ mode: 'delete', chapter: '06', segment: 1 })
      .expect(200);

    expect(await names(paths.recordings)).toEqual(['06-9-j.mov']);
    expect(await names(paths.images)).toEqual(['06-9-1a-j.png']);
    expect(await names(paths.trash)).toEqual(['06-1-1a-a.png', '06-1-a.mov', '06-1-a.srt']);
  });

  it('Scenario: given 06-9 and 06-10, when a take is inserted before 06-9, then they become 06-10 and 06-11 with their images', async () => {
    await take('06-9-i.mov');
    await take('06-10-j.mov');
    await write(path.join(inbox, 'take.mov'), 'NEW');

    await request(await appFor())
      .post('/api/segments/op')
      .send({
        mode: 'insert',
        chapter: '06',
        before: 9,
        source: path.join(inbox, 'take.mov'),
        name: 'k',
      })
      .expect(200);

    expect(await names(paths.recordings)).toEqual(['06-10-i.mov', '06-11-j.mov', '06-9-k.mov']);
    expect(await names(paths.images)).toEqual(['06-10-1a-i.png', '06-11-1a-j.png']);
  });
});

describe('Feature: only a real take inside the inbox goes in, under a name that stays in recordings/ (R8)', () => {
  // Open findings (Tester CT-0107 r1). Each passes today BECAUSE the defect exists; flip to `it` with the fix.
  it.fails(
    'Scenario: given tags containing path separators, when a take is sent in, then it is refused and nothing lands outside recordings/',
    async () => {
      await take('06-1-a.mov');
      await write(path.join(inbox, 'take.mov'), 'NEW');
      const before = await tree();

      const res = await request(await appFor())
        .post('/api/segments/op')
        .send({
          mode: 'replace',
          chapter: '06',
          segment: 1,
          source: path.join(inbox, 'take.mov'),
          name: 'x',
          tags: ['/../../ESC'],
        });

      expect(res.status).toBe(409);
      expect(await fs.pathExists(path.join(project, 'hub', 'ESC.mov'))).toBe(false);
      expect(await tree()).toEqual(before);
    }
  );

  it.fails(
    'Scenario: given a source that is not a video, when it is sent in, then it is refused and stays in the inbox',
    async () => {
      await take('06-1-a.mov');
      await write(path.join(inbox, 'notes.txt'), 'TEXT');
      const before = await tree();

      const res = await request(await appFor())
        .post('/api/segments/op')
        .send({
          mode: 'replace',
          chapter: '06',
          segment: 1,
          source: path.join(inbox, 'notes.txt'),
          name: 'x',
        });

      expect(res.status).toBe(409);
      expect(await tree()).toEqual(before);
    }
  );

  it.fails(
    'Scenario: given tags that are not a list, when sent, then it is refused as invalid input (409), not a 500',
    async () => {
      await take('06-1-a.mov');
      await write(path.join(inbox, 'take.mov'));
      const res = await request(await appFor())
        .post('/api/segments/op')
        .send({
          mode: 'replace',
          chapter: '06',
          segment: 1,
          source: path.join(inbox, 'take.mov'),
          name: 'x',
          tags: 'CTA',
        });
      expect(res.status).toBe(409);
    }
  );

  it.fails(
    'Scenario: given no inbox is configured, when a take outside any inbox is sent in, then it is refused',
    async () => {
      await take('06-1-a.mov');
      await write(path.join(root, 'elsewhere', 'video.mov'), 'OTHER PROJECT TAKE');
      const res = await request(await appFor(''))
        .post('/api/segments/op')
        .send({
          mode: 'replace',
          chapter: '06',
          segment: 1,
          source: path.join(root, 'elsewhere', 'video.mov'),
          name: 'x',
        });
      expect(res.status).toBe(409);
      expect(await fs.pathExists(path.join(root, 'elsewhere', 'video.mov'))).toBe(true);
    }
  );
});

describe('Feature: undo is guarded like the operation itself (R8, R9)', () => {
  it('Scenario: given a delete that closed 06-2 up to 06-1, when a FliCut cut then names 06-1, then undo is refused and the disk is unchanged', async () => {
    await take('06-1-a.mov');
    await take('06-2-b.mov');
    const app = await appFor();
    await request(app)
      .post('/api/segments/op')
      .send({ mode: 'delete', chapter: '06', segment: 1 })
      .expect(200);
    await write(
      path.join(project, 'fli.cut.tour.json'),
      JSON.stringify({ medias: [{ filePath: 'hub/recordings/06-1-b.mov' }] })
    );
    const before = await tree();

    const res = await request(app).post('/api/segments/undo').send({});

    expect(res.status).toBe(409);
    expect(res.body.blockers).toEqual([
      expect.objectContaining({ kind: 'referenced', file: '06-1-b.mov' }),
    ]);
    expect(await tree()).toEqual(before);
  });
});

describe('Feature: only image assets keyed to the segment travel with it (R3, R5)', () => {
  it('Scenario: given a hand-named image 06-1-notes.png beside the 06-1 asset, when 06-1 is deleted, then only the asset goes to the trash', async () => {
    await take('06-1-a.mov');
    await write(path.join(paths.images, '06-1-notes.png'), 'MINE');

    await request(await appFor())
      .post('/api/segments/op')
      .send({ mode: 'delete', chapter: '06', segment: 1 })
      .expect(200);

    expect(await names(paths.images)).toEqual(['06-1-notes.png']);
    expect(await names(paths.trash)).toEqual(['06-1-1a-a.png', '06-1-a.mov', '06-1-a.srt']);
  });
});

describe('Feature: a file that cannot be put back is still on the record (R8, R9)', () => {
  // Open finding (Tester CT-0107 r1): segmentOps.ts:715-717 forgets the journal entry on ANY step failure, even when
  // the rollback itself failed and files are stranded in -trash/ — the one case where the record matters most.
  it.fails(
    'Scenario: given the disk fails mid-op and the rollback fails too, when the answer says files could not be put back, then the journal still lists the moves',
    async () => {
      await take('06-1-a.mov');
      await take('06-2-b.mov');
      vi.doMock('fs-extra', async (importOriginal) => {
        const actual = await importOriginal<typeof import('fs-extra')>();
        let calls = 0;
        const move = async (...args: Parameters<typeof actual.default.move>) => {
          calls += 1;
          if (calls > 1) throw new Error('disk went away');
          return actual.default.move(...args);
        };
        return { ...actual, default: { ...actual.default, move } };
      });
      try {
        const res = await request(await appFor())
          .post('/api/segments/op')
          .send({ mode: 'delete', chapter: '06', segment: 1 });
        expect(res.status).toBe(500);
        expect(res.body.reason).toContain('could not be put back');
        expect(await fs.pathExists(path.join(paths.trash, '06-1-a.mov'))).toBe(true);
        const journal = await fs.readJson(path.join(project, '.flihub-segment-journal.json'));
        expect(journal.entries).toHaveLength(1);
      } finally {
        vi.doUnmock('fs-extra');
      }
    }
  );
});

describe('Feature: the journal is written before the first file moves (R9)', () => {
  it('Scenario: given a reorder, when its first file is about to move, then the journal on disk already holds the op marked pending', async () => {
    await take('06-1-a.mov');
    await take('06-2-b.mov');
    const seen: Array<{ pending?: boolean; steps: unknown[] } | undefined> = [];
    const journalFile = path.join(project, '.flihub-segment-journal.json');
    vi.doMock('fs-extra', async (importOriginal) => {
      const actual = await importOriginal<typeof import('fs-extra')>();
      const move = async (...args: Parameters<typeof actual.default.move>) => {
        if (seen.length === 0) seen.push((await actual.default.readJson(journalFile)).entries[0]);
        return actual.default.move(...args);
      };
      return { ...actual, default: { ...actual.default, move } };
    });
    try {
      await request(await appFor())
        .post('/api/segments/op')
        .send({ mode: 'reorder', chapter: '06', segment: 2, direction: 'up' })
        .expect(200);
    } finally {
      vi.doUnmock('fs-extra');
    }
    expect(seen[0]).toMatchObject({ pending: true });
    expect(seen[0]?.steps.length).toBeGreaterThan(0);
    expect((await fs.readJson(journalFile)).entries[0].pending).toBeUndefined();
  });
});
