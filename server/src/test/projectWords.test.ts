// The project's fli.words.json ("remember for this video", fli-core v0.14.0): FliHub reads and writes project level only.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import os from 'os';
import path from 'path';
import { promises as fs } from 'fs';
import { createStateRoutes } from '../routes/state.js';
import type { Config } from '../../../shared/types.js';

let root: string;
let projectDir: string;
let app: express.Express;
const emitted: string[] = [];

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'flihub-words-'));
  projectDir = path.join(root, 'd01-flivideo-tour');
  await fs.mkdir(projectDir);
  const config = { projectsRootDirectory: root } as unknown as Config;
  const io = { emit: (event: string) => emitted.push(event) } as never;
  app = express();
  app.use(express.json());
  app.use(
    '/api',
    createStateRoutes(() => config, io)
  );
  emitted.length = 0;
});
afterEach(() => fs.rm(root, { recursive: true, force: true }));

const file = () => path.join(projectDir, 'fli.words.json');

describe('/api/projects/:code/words', () => {
  it('remembers a word for this video, stamped, and reads it back', async () => {
    const empty = await request(app).get('/api/projects/d01/words');
    expect(empty.body).toMatchObject({ success: true, words: null, issue: null });

    const added = await request(app)
      .post('/api/projects/d01/words')
      .set('x-fli-principal', 'agent:flicut')
      .send({ entry: { kind: 'name', term: 'D06', heardAs: ['D 0 six'] } });
    expect(added.status).toBe(200);
    expect(added.body.file).toBe(file());
    expect(added.body.words.names).toEqual([
      {
        term: 'D06',
        heardAs: ['D 0 six'],
        changed: { at: expect.any(String), by: 'agent:flicut' },
      },
    ]);
    expect(emitted).toContain('recordings:changed');

    await request(app)
      .post('/api/projects/d01/words')
      .send({ entry: { kind: 'name', term: 'FliStudio' } });
    const got = await request(app).get('/api/projects/d01/words');
    expect(
      got.body.words.names.map((n: { term: string; changed: { by: string } }) => [
        n.term,
        n.changed.by,
      ])
    ).toEqual([
      ['D06', 'agent:flicut'],
      ['FliStudio', 'human:ui'],
    ]);
    // Never higher than the project: nothing is written beside it.
    await expect(fs.access(path.join(root, 'fli.words.json'))).rejects.toThrow();
  });

  it('removes, and answers 404 when nothing matched', async () => {
    await request(app)
      .post('/api/projects/d01/words')
      .send({ entry: { kind: 'rule', find: 'fly studio', write: 'FliStudio' } });
    const gone = await request(app)
      .delete('/api/projects/d01/words')
      .send({ entry: { kind: 'rule', text: 'fly studio' } });
    expect(gone.body.words.rules).toEqual([]);
    const again = await request(app)
      .delete('/api/projects/d01/words')
      .send({ entry: { kind: 'rule', text: 'fly studio' } });
    expect(again.status).toBe(404);
    expect(again.body.reason).toBe('not-found');
  });

  it('refuses bad input, an unknown project, and never overwrites a hand-broken file', async () => {
    expect(
      (
        await request(app)
          .post('/api/projects/d01/words')
          .send({ entry: { kind: 'name' } })
      ).status
    ).toBe(400);
    expect((await request(app).delete('/api/projects/d01/words').send({})).status).toBe(400);
    expect(
      (
        await request(app)
          .post('/api/projects/zz9/words')
          .send({ entry: { kind: 'name', term: 'x' } })
      ).status
    ).toBe(404);
    expect((await request(app).get('/api/projects/zz9/words')).status).toBe(404);
    await fs.writeFile(file(), '{ nope');
    const read = await request(app).get('/api/projects/d01/words');
    expect(read.body.issue).toMatch(/^not-json/);
    const res = await request(app)
      .post('/api/projects/d01/words')
      .send({ entry: { kind: 'name', term: 'x' } });
    expect(res.status).toBe(409);
    expect(res.body.reason).toBe('unusable-file');
    expect(await fs.readFile(file(), 'utf8')).toBe('{ nope');
  });
});
