// B064: Route-level tests for hold.ts — highest-risk endpoints
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

vi.mock('../utils/holdUtils.js', () => ({
  getHoldStatus: (...args: unknown[]) => mockGetHoldStatus(...args),
  holdProject: (...args: unknown[]) => mockHoldProject(...args),
  verifyHoldingMatch: (...args: unknown[]) => mockVerifyHoldingMatch(...args),
  deleteLocalProject: (...args: unknown[]) => mockDeleteLocalProject(...args),
  deleteHoldingProject: (...args: unknown[]) => mockDeleteHoldingProject(...args),
  restoreFromHolding: (...args: unknown[]) => mockRestoreFromHolding(...args),
  checkSsdMounted: (...args: unknown[]) => mockCheckSsdMounted(...args),
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Tests: GET /:code/hold/status
// ---------------------------------------------------------------------------

describe('GET /:code/hold/status', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('B064: returns 400 for invalid code containing ".."', async () => {
    const { app } = createApp();

    const res = await request(app).get('/api/projects/..%2Fevil/hold/status');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Invalid project code');
  });

  it('B064: returns unknown status when holdingPath not configured', async () => {
    const { app } = createApp({ holdingPath: undefined });

    const res = await request(app).get('/api/projects/b72-test-project/hold/status');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.location).toBe('unknown');
    expect(res.body.data.ssdMounted).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tests: DELETE /:code/local
// ---------------------------------------------------------------------------

describe('DELETE /:code/local', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('B064: returns 400 when confirmCode missing from body', async () => {
    const { app } = createApp();

    const res = await request(app)
      .delete('/api/projects/b72-test-project/local')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    // confirmCode is undefined, which !== code
    expect(res.body.error).toContain('does not match');
  });

  it('B064: returns 400 when confirmCode does not match code', async () => {
    const { app } = createApp();

    const res = await request(app)
      .delete('/api/projects/b72-test-project/local')
      .send({ confirmCode: 'wrong-code' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('does not match');
  });

  it('B064: returns 400 when holdingPath not configured', async () => {
    const { app } = createApp({ holdingPath: undefined });

    const res = await request(app)
      .delete('/api/projects/b72-test-project/local')
      .send({ confirmCode: 'b72-test-project' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('holdingPath not configured');
  });
});

// ---------------------------------------------------------------------------
// Tests: DELETE /:code/holding
// ---------------------------------------------------------------------------

describe('DELETE /:code/holding', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('B064: returns 400 when confirmCode missing', async () => {
    const { app } = createApp();

    const res = await request(app)
      .delete('/api/projects/b72-test-project/holding')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('does not match');
  });

  it('B064: returns 400 when confirmCode does not match code', async () => {
    const { app } = createApp();

    const res = await request(app)
      .delete('/api/projects/b72-test-project/holding')
      .send({ confirmCode: 'other-project' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('does not match');
  });
});

// ---------------------------------------------------------------------------
// Tests: POST /:code/hold
// ---------------------------------------------------------------------------

describe('POST /:code/hold', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('B064: returns 400 for path traversal code (e.g. "../evil")', async () => {
    const { app } = createApp();

    // Encode the slash so Express routes it to the handler
    const res = await request(app)
      .post('/api/projects/..%2Fevil/hold')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Invalid project code');
  });

  it('B064: returns 400 when relay is blocked', async () => {
    const { app } = createApp();

    mockGetHoldStatus.mockResolvedValue({
      location: 'local-only',
      relayBlocked: true,
      relayBytes: 12345,
      ssdMounted: true,
    });

    const res = await request(app)
      .post('/api/projects/b72-test-project/hold')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Relay is not empty');
  });
});
