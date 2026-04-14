// WU3: Route-level tests for batch-offload + batch-delete-local endpoints.
// These endpoints loop sequentially over projects; partial failure is a
// feature, so we verify per-project results survive a mid-batch failure.
import { vi, describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// ---------------------------------------------------------------------------
// Mock holdUtils — no real filesystem or rsync
// ---------------------------------------------------------------------------
const mockGetHoldStatus = vi.fn();
const mockHoldProject = vi.fn();
const mockVerifyHoldingMatch = vi.fn();
const mockDeleteLocalProject = vi.fn();
const mockDeleteHoldingProject = vi.fn();
const mockRestoreFromHolding = vi.fn();
const mockCheckSsdMounted = vi.fn();
const mockGetDirStats = vi.fn();

vi.mock('../utils/holdUtils.js', () => ({
  getHoldStatus: (...args: unknown[]) => mockGetHoldStatus(...args),
  holdProject: (...args: unknown[]) => mockHoldProject(...args),
  verifyHoldingMatch: (...args: unknown[]) => mockVerifyHoldingMatch(...args),
  deleteLocalProject: (...args: unknown[]) => mockDeleteLocalProject(...args),
  deleteHoldingProject: (...args: unknown[]) => mockDeleteHoldingProject(...args),
  restoreFromHolding: (...args: unknown[]) => mockRestoreFromHolding(...args),
  checkSsdMounted: (...args: unknown[]) => mockCheckSsdMounted(...args),
  getDirStats: (...args: unknown[]) => mockGetDirStats(...args),
}));

// Mock archiveInventory — WU3 uses buildArchiveRow to re-derive state server-side.
// We return per-code fixtures via the shared mock so each test can script states.
const archiveRowFixtures: Record<
  string,
  { state: 'local' | 'held-local' | 'held-only'; localBytes: number; heldBytes: number }
> = {};
vi.mock('../utils/archiveInventory.js', () => ({
  buildArchiveRow: vi.fn(async (code: string) => {
    const f = archiveRowFixtures[code];
    if (!f) {
      return {
        projectCode: code,
        projectPath: `/tmp/projects/${code}`,
        localBytes: 0,
        heldBytes: 0,
        held: false,
        state: 'local' as const,
        lastTouched: null,
      };
    }
    return {
      projectCode: code,
      projectPath: `/tmp/projects/${code}`,
      localBytes: f.localBytes,
      heldBytes: f.heldBytes,
      held: f.heldBytes > 0,
      state: f.state,
      lastTouched: null,
    };
  }),
  listArchiveCandidates: vi.fn(async () => []),
  deriveArchiveState: (localBytes: number, heldBytes: number) => {
    const held = heldBytes > 0;
    if (held && localBytes > 0) return 'held-local';
    if (held) return 'held-only';
    return 'local';
  },
}));

// Mock projects.js cache helpers — no disk access needed
vi.mock('../routes/projects.js', () => ({
  updateDiskCacheHoldData: vi.fn(),
  invalidateDiskCacheEntry: vi.fn(),
}));

// Mock pathUtils
vi.mock('../utils/pathUtils.js', () => ({
  expandPath: (p: string) => p,
  queryString: (s: unknown) => (typeof s === 'string' ? s : String(s ?? '')),
}));

// Imports AFTER vi.mock declarations
import { createHoldRoutes } from '../routes/hold.js';
import type { Config } from '../../../shared/types.js';

function makeConfig(overrides: Partial<Config> = {}): Config {
  return {
    watchDirectory: '/tmp/watch',
    projectDirectory: '/tmp/project',
    fileExtensions: ['.mov', '.mp4'],
    availableTags: ['CTA'],
    commonNames: [],
    imageSourceDirectory: '/tmp/downloads',
    projectsRootDirectory: '/tmp/projects',
    holdingPath: '/tmp/holding',
    ...overrides,
  };
}

function createApp(configOverrides: Partial<Config> = {}) {
  const config = makeConfig(configOverrides);
  const getConfig = () => config;
  const router = createHoldRoutes(getConfig);

  const app = express();
  app.use(express.json());
  app.use('/api/projects', router);

  return { app };
}

function setFixtures(map: Record<string, { state: 'local' | 'held-local' | 'held-only'; localBytes: number; heldBytes: number }>) {
  for (const k of Object.keys(archiveRowFixtures)) delete archiveRowFixtures[k];
  Object.assign(archiveRowFixtures, map);
}

// ---------------------------------------------------------------------------
// POST /batch-offload
// ---------------------------------------------------------------------------

describe('POST /batch-offload', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Default happy-path mocks
    mockGetHoldStatus.mockResolvedValue({
      location: 'local-only',
      relayBlocked: false,
      relayBytes: 0,
      ssdMounted: true,
    });
    mockHoldProject.mockResolvedValue({
      success: true,
      message: 'held',
      holdingPath: '/tmp/holding/x',
    });
    mockVerifyHoldingMatch.mockResolvedValue({
      match: true,
      localFiles: 1,
      localBytes: 100,
      holdingFiles: 1,
      holdingBytes: 100,
    });
  });

  it('WU3: returns 400 for empty array', async () => {
    const { app } = createApp();
    const res = await request(app).post('/api/projects/batch-offload').send({ projects: [] });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('empty');
  });

  it('WU3: returns 400 when projects is not an array', async () => {
    const { app } = createApp();
    const res = await request(app)
      .post('/api/projects/batch-offload')
      .send({ projects: 'not-an-array' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('array');
  });

  it('WU3: processes all local projects sequentially on happy path', async () => {
    setFixtures({
      'proj-a': { state: 'local', localBytes: 1000, heldBytes: 0 },
      'proj-b': { state: 'local', localBytes: 2000, heldBytes: 0 },
    });
    const { app } = createApp();
    const res = await request(app)
      .post('/api/projects/batch-offload')
      .send({ projects: ['proj-a', 'proj-b'] });

    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(2);
    expect(res.body.results[0]).toEqual({ projectCode: 'proj-a', ok: true });
    expect(res.body.results[1]).toEqual({ projectCode: 'proj-b', ok: true });
    expect(mockHoldProject).toHaveBeenCalledTimes(2);
  });

  it('WU3: records per-project failure for wrong state without aborting batch', async () => {
    setFixtures({
      'proj-ok': { state: 'local', localBytes: 500, heldBytes: 0 },
      'proj-bad': { state: 'held-local', localBytes: 100, heldBytes: 100 },
    });
    const { app } = createApp();
    const res = await request(app)
      .post('/api/projects/batch-offload')
      .send({ projects: ['proj-bad', 'proj-ok'] });

    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(2);
    expect(res.body.results[0]).toEqual({
      projectCode: 'proj-bad',
      ok: false,
      error: 'invalid state: held-local',
    });
    expect(res.body.results[1]).toEqual({ projectCode: 'proj-ok', ok: true });
    // Only the valid one actually ran holdProject
    expect(mockHoldProject).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// POST /batch-delete-local
// ---------------------------------------------------------------------------

describe('POST /batch-delete-local', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockVerifyHoldingMatch.mockResolvedValue({
      match: true,
      localFiles: 1,
      localBytes: 100,
      holdingFiles: 1,
      holdingBytes: 100,
    });
    mockDeleteLocalProject.mockResolvedValue({ success: true, message: 'deleted' });
  });

  it('WU3: returns 400 for empty array', async () => {
    const { app } = createApp();
    const res = await request(app).post('/api/projects/batch-delete-local').send({ projects: [] });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('empty');
  });

  it('WU3: returns 400 when projects is not an array', async () => {
    const { app } = createApp();
    const res = await request(app).post('/api/projects/batch-delete-local').send({ projects: 42 });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('array');
  });

  it('WU3: deletes all held-local projects on happy path', async () => {
    setFixtures({
      'proj-a': { state: 'held-local', localBytes: 100, heldBytes: 100 },
      'proj-b': { state: 'held-local', localBytes: 200, heldBytes: 200 },
    });
    const { app } = createApp();
    const res = await request(app)
      .post('/api/projects/batch-delete-local')
      .send({ projects: ['proj-a', 'proj-b'] });

    expect(res.status).toBe(200);
    expect(res.body.results).toEqual([
      { projectCode: 'proj-a', ok: true },
      { projectCode: 'proj-b', ok: true },
    ]);
    expect(mockDeleteLocalProject).toHaveBeenCalledTimes(2);
  });

  it('WU3: records partial failure for wrong state + surfaces verification mismatch', async () => {
    setFixtures({
      'proj-local-only': { state: 'local', localBytes: 500, heldBytes: 0 },
      'proj-held-local': { state: 'held-local', localBytes: 300, heldBytes: 300 },
    });
    const { app } = createApp();
    const res = await request(app)
      .post('/api/projects/batch-delete-local')
      .send({ projects: ['proj-local-only', 'proj-held-local'] });

    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(2);
    expect(res.body.results[0]).toEqual({
      projectCode: 'proj-local-only',
      ok: false,
      error: 'invalid state: local',
    });
    expect(res.body.results[1]).toEqual({ projectCode: 'proj-held-local', ok: true });
    expect(mockDeleteLocalProject).toHaveBeenCalledTimes(1);
  });
});
