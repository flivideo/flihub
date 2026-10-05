// Trash visibility (David, 2026-09-23): GET /api/projects/:code/trash reports -trash/ fresh, and
// what it counts is exactly what DELETE empties — subfolders included since 2026-10-05. Real temp dirs; no project data touched.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createProjectRoutes } from '../routes/projects.js';
import type { Config } from '../../../shared/types.js';

let tmp: string;
let root: string;
let app: express.Express;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'trash-visibility-'));
  root = path.join(tmp, 'v-test');
  fs.mkdirSync(path.join(root, 'd09-demo'), { recursive: true });
  const config = { projectsRootDirectory: root, projectDirectory: path.join(root, 'd09-demo') } as Config;
  app = express();
  app.use(express.json());
  app.use('/api/projects', createProjectRoutes(() => config, () => {}));
});
afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

const trash = (...p: string[]) => path.join(root, 'd09-demo', '-trash', ...p);
const put = (rel: string, bytes: number) => {
  fs.mkdirSync(path.dirname(trash(rel)), { recursive: true });
  fs.writeFileSync(trash(rel), Buffer.alloc(bytes, 1));
};

describe('GET /api/projects/:code/trash', () => {
  it('no -trash/ folder: exists false, zero — never an error', async () => {
    const res = await request(app).get('/api/projects/d09-demo/trash');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, exists: false, fileCount: 0, totalBytes: 0, nestedCount: 0 });
  });

  it('counts top-level files and bytes, fresh on every call', async () => {
    put('01-1-intro.mov', 1000);
    put('01-1-intro.txt', 24);
    const first = await request(app).get('/api/projects/d09-demo/trash');
    expect(first.body).toMatchObject({ exists: true, fileCount: 2, totalBytes: 1024, nestedCount: 0 });

    put('02-1-more.mov', 500);
    const second = await request(app).get('/api/projects/d09-demo/trash');
    expect(second.body).toMatchObject({ fileCount: 3, totalBytes: 1524 });
  });

  it('counts files inside subfolders too, and says how many are there (David 2026-10-05)', async () => {
    put('a.mov', 10);
    put('old/b.mov', 10);
    put('old/deeper/c.mov', 10);
    const res = await request(app).get('/api/projects/d09-demo/trash');
    expect(res.body).toMatchObject({ fileCount: 3, totalBytes: 30, nestedCount: 2 });
  });

  it('what it counts is exactly what DELETE empties — subfolders included', async () => {
    put('a.mov', 10);
    put('b.mov', 20);
    put('2026-09-25-wrong-import/c.mp4', 5);
    put('2026-09-25-wrong-import/deeper/d.srt', 1);
    const before = await request(app).get('/api/projects/d09-demo/trash');
    const del = await request(app).delete('/api/projects/d09-demo/trash');
    expect(del.body.success).toBe(true);
    expect(del.body.deleted).toHaveLength(before.body.fileCount);
    expect(del.body.deleted).toContainEqual({ name: '2026-09-25-wrong-import/deeper/d.srt', size: 1 });
    expect(fs.readdirSync(trash())).toEqual([]);
    const after = await request(app).get('/api/projects/d09-demo/trash');
    expect(after.body).toMatchObject({ exists: true, fileCount: 0, totalBytes: 0, nestedCount: 0 });
  });

  it('a link inside -trash/ goes as itself; what it points at stays', async () => {
    const keep = path.join(tmp, 'elsewhere');
    fs.mkdirSync(path.join(keep, 'dir'), { recursive: true });
    fs.writeFileSync(path.join(keep, 'dir', 'keep.mov'), 'k');
    put('a.mov', 10);
    fs.symlinkSync(path.join(keep, 'dir'), trash('linked-dir'));
    fs.symlinkSync(path.join(keep, 'dir', 'keep.mov'), trash('linked.mov'));
    const del = await request(app).delete('/api/projects/d09-demo/trash');
    expect(del.body.success).toBe(true);
    expect(fs.readdirSync(trash())).toEqual([]);
    expect(fs.readdirSync(path.join(keep, 'dir'))).toEqual(['keep.mov']);
  });

  it('refuses a -trash that is a link to elsewhere, deleting nothing', async () => {
    const keep = path.join(tmp, 'elsewhere');
    fs.mkdirSync(path.join(keep, 'sub'), { recursive: true });
    fs.writeFileSync(path.join(keep, 'a.mov'), 'k');
    fs.writeFileSync(path.join(keep, 'sub', 'b.mov'), 'k');
    fs.symlinkSync(keep, trash());
    const del = await request(app).delete('/api/projects/d09-demo/trash');
    expect(del.body.success).toBe(false);
    expect(fs.readdirSync(keep).sort()).toEqual(['a.mov', 'sub']);
  });

  it('rejects a code that tries to leave the root', async () => {
    const res = await request(app).get('/api/projects/..%2F..%2Fetc/trash');
    expect(res.status).toBe(400);
  });
});
