// storage-panel WU5: tests for storageActivityLog util + activity endpoint.
//
// Verifies:
//   - appendStorageActivity writes JSONL lines that survive "restart"
//     (i.e. a fresh read via readStorageActivity picks them up)
//   - readStorageActivity filters by projectCode
//   - readStorageActivity respects limit + returns most-recent-first
//   - GET /api/projects/:code/storage-activity returns the right envelope
//   - Malformed lines are skipped, not fatal
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import os from 'os';
import * as nodeFs from 'fs';
import nodePath from 'path';
import {
  appendStorageActivity,
  readStorageActivity,
} from '../utils/storageActivityLog.js';
import { createStorageRoutes } from '../routes/storage.js';
import type { Config, StorageActivityEntry, StorageActivityResponse } from '../../../shared/types.js';

describe('storage-panel WU5: storageActivityLog', () => {
  let tmpRoot: string;
  let logPath: string;

  beforeEach(() => {
    tmpRoot = nodeFs.mkdtempSync(nodePath.join(os.tmpdir(), 'storage-activity-'));
    logPath = nodePath.join(tmpRoot, 'nested', 'storage-activity.jsonl');
  });

  afterEach(() => {
    try {
      nodeFs.rmSync(tmpRoot, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it('append + read survives "restart" (fresh reader sees entries)', async () => {
    await appendStorageActivity(
      { projectCode: 'c10', action: 'hold', sizeBytes: 1000, timestamp: '2026-04-14T10:00:00Z' },
      logPath,
    );
    await appendStorageActivity(
      { projectCode: 'c10', action: 'restore-held', sizeBytes: 1000, timestamp: '2026-04-14T11:00:00Z' },
      logPath,
    );
    // "Restart" = brand-new read invocation reads from the same file.
    const entries = await readStorageActivity({ projectCode: 'c10', logPath });
    expect(entries).toHaveLength(2);
    // Most recent first
    expect(entries[0].action).toBe('restore-held');
    expect(entries[1].action).toBe('hold');
  });

  it('filters by projectCode', async () => {
    await appendStorageActivity(
      { projectCode: 'c10', action: 'hold', sizeBytes: 1, timestamp: '2026-04-14T10:00:00Z' },
      logPath,
    );
    await appendStorageActivity(
      { projectCode: 'c20', action: 'archive', sizeBytes: 2, timestamp: '2026-04-14T10:01:00Z' },
      logPath,
    );
    const c10 = await readStorageActivity({ projectCode: 'c10', logPath });
    const c20 = await readStorageActivity({ projectCode: 'c20', logPath });
    expect(c10).toHaveLength(1);
    expect(c10[0].projectCode).toBe('c10');
    expect(c20).toHaveLength(1);
    expect(c20[0].projectCode).toBe('c20');
    const all = await readStorageActivity({ logPath });
    expect(all).toHaveLength(2);
  });

  it('respects limit and returns most-recent-first', async () => {
    for (let i = 0; i < 15; i++) {
      await appendStorageActivity(
        {
          projectCode: 'c10',
          action: 'hold',
          sizeBytes: i,
          timestamp: `2026-04-14T10:${String(i).padStart(2, '0')}:00Z`,
        },
        logPath,
      );
    }
    const entries = await readStorageActivity({ projectCode: 'c10', limit: 5, logPath });
    expect(entries).toHaveLength(5);
    // Newest first => sizeBytes 14, 13, 12, 11, 10
    expect(entries.map((e) => e.sizeBytes)).toEqual([14, 13, 12, 11, 10]);
  });

  it('returns [] when log file is missing', async () => {
    const missing = nodePath.join(tmpRoot, 'does-not-exist.jsonl');
    const entries = await readStorageActivity({ logPath: missing });
    expect(entries).toEqual([]);
  });

  it('skips malformed JSONL lines, keeps valid ones', async () => {
    nodeFs.mkdirSync(nodePath.dirname(logPath), { recursive: true });
    nodeFs.writeFileSync(
      logPath,
      [
        JSON.stringify({ projectCode: 'c10', action: 'hold', sizeBytes: 10, timestamp: '2026-04-14T10:00:00Z' }),
        'NOT JSON',
        '{ "partial": true }', // missing required fields
        JSON.stringify({ projectCode: 'c10', action: 'archive', sizeBytes: 20, timestamp: '2026-04-14T11:00:00Z' }),
        '',
      ].join('\n'),
    );
    const entries = await readStorageActivity({ projectCode: 'c10', logPath });
    expect(entries).toHaveLength(2);
    expect(entries[0].action).toBe('archive');
    expect(entries[1].action).toBe('hold');
  });
});

describe('storage-panel WU5: GET /api/projects/:code/storage-activity', () => {
  let tmpRoot: string;
  let logPath: string;

  function createApp() {
    const config: Config = {
      watchDirectory: '/tmp/watch',
      projectDirectory: tmpRoot,
      projectsRootDirectory: tmpRoot,
      holdingPath: nodePath.join(tmpRoot, 'holding'),
      publishedPath: nodePath.join(tmpRoot, 'published'),
      fileExtensions: ['.mov'],
      availableTags: [],
      commonNames: [],
      imageSourceDirectory: '/tmp/downloads',
    };
    const router = createStorageRoutes(() => config, () => logPath);
    const app = express();
    app.use(express.json());
    app.use('/api/projects', router);
    return app;
  }

  beforeEach(() => {
    tmpRoot = nodeFs.mkdtempSync(nodePath.join(os.tmpdir(), 'storage-activity-api-'));
    logPath = nodePath.join(tmpRoot, 'storage-activity.jsonl');
  });

  afterEach(() => {
    try {
      nodeFs.rmSync(tmpRoot, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it('returns empty entries when log file is absent', async () => {
    const app = createApp();
    const res = await request(app).get('/api/projects/c10/storage-activity');
    expect(res.status).toBe(200);
    const body = res.body as StorageActivityResponse;
    expect(body.success).toBe(true);
    expect(body.entries).toEqual([]);
  });

  it('returns entries filtered by project code, most-recent-first', async () => {
    await appendStorageActivity(
      { projectCode: 'c10', action: 'hold', sizeBytes: 100, timestamp: '2026-04-14T10:00:00Z' },
      logPath,
    );
    await appendStorageActivity(
      { projectCode: 'c20', action: 'archive', sizeBytes: 200, timestamp: '2026-04-14T10:01:00Z' },
      logPath,
    );
    await appendStorageActivity(
      { projectCode: 'c10', action: 'restore-held', sizeBytes: 100, timestamp: '2026-04-14T10:02:00Z' },
      logPath,
    );

    const app = createApp();
    const res = await request(app).get('/api/projects/c10/storage-activity');
    expect(res.status).toBe(200);
    const body = res.body as StorageActivityResponse;
    expect(body.success).toBe(true);
    expect(body.entries).toHaveLength(2);
    expect(body.entries[0].action).toBe('restore-held');
    expect(body.entries[1].action).toBe('hold');
    expect(body.entries.every((e: StorageActivityEntry) => e.projectCode === 'c10')).toBe(true);
  });

  it('respects ?limit= query param', async () => {
    for (let i = 0; i < 12; i++) {
      await appendStorageActivity(
        {
          projectCode: 'c10',
          action: 'hold',
          sizeBytes: i,
          timestamp: `2026-04-14T10:${String(i).padStart(2, '0')}:00Z`,
        },
        logPath,
      );
    }
    const app = createApp();
    const res = await request(app).get('/api/projects/c10/storage-activity?limit=3');
    expect(res.status).toBe(200);
    const body = res.body as StorageActivityResponse;
    expect(body.entries).toHaveLength(3);
  });

  it('rejects invalid project code', async () => {
    const app = createApp();
    const res = await request(app).get('/api/projects/..%2Fetc/storage-activity');
    expect(res.status).toBe(400);
    const body = res.body as StorageActivityResponse;
    expect(body.success).toBe(false);
  });
});
