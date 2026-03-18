// Integration tests for POST /api/poem-wui/send
// Uses supertest + vitest mocks — no real filesystem or network calls

import { vi, describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// --- Mock fs-extra (used by poem-wui.ts for readdir, readFile, stat AND by readDirSafe) ---
// poem-wui.ts now imports `fs from 'fs-extra'`, and readDirSafe in utils/filesystem.ts
// also uses fs-extra, so a single mock covers both.
vi.mock('fs-extra', () => ({
  default: {
    readdir: vi.fn().mockResolvedValue([]),
    readFile: vi.fn(),
    stat: vi.fn(),
    access: vi.fn(),
  },
}));

// --- Mock fetch globally ---
vi.stubGlobal('fetch', vi.fn());

// Imports must come AFTER vi.mock() declarations so hoisting works correctly
import fsExtra from 'fs-extra';
import { createPoemWuiRoutes } from '../routes/poem-wui.js';
import type { Config } from '../../../shared/types.js';

// ---------------------------------------------------------------------------
// Type aliases for mocked functions
// ---------------------------------------------------------------------------

// After import, `fsExtra` is the `default` value from the mock factory (the object with readdir etc.)
const fsMock = fsExtra as unknown as {
  readdir: ReturnType<typeof vi.fn>;
  readFile: ReturnType<typeof vi.fn>;
  stat: ReturnType<typeof vi.fn>;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(overrides: Partial<Config> = {}): Config {
  return {
    projectDirectory: '/test/project',
    poemWuiUrl: 'http://localhost:5041',
    watchDirectory: '',
    availableTags: [],
    commonNames: [],
    imageSourceDirectory: '',
    ...overrides,
  } as Config;
}

function buildApp(config: Partial<Config> = {}) {
  const mockConfig = makeConfig(config);
  const app = express();
  app.use(express.json());
  app.use('/api/poem-wui', createPoemWuiRoutes(() => mockConfig));
  return app;
}

// SRT fixture
const SAMPLE_SRT = `1\n00:00:01,000 --> 00:00:03,000\nHello world\n\n2\n00:00:04,000 --> 00:00:06,000\nSecond line\n`;

// ---------------------------------------------------------------------------
// Test setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();

  // Default: no files in any directory
  const noFile = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
  fsMock.readdir.mockResolvedValue([]);
  fsMock.readFile.mockRejectedValue(noFile);
});

// ---------------------------------------------------------------------------
// Happy path: SRT found, AWB returns ok: true
// ---------------------------------------------------------------------------

describe('POST /api/poem-wui/send — happy path', () => {
  it('returns { ok: true } when SRT is found and AWB responds ok', async () => {
    // Make readdir return a .srt file for the first scan dir (s3-staging/post)
    fsMock.readdir.mockImplementation((dir: unknown) => {
      if (String(dir).includes('s3-staging')) return Promise.resolve(['video.srt']);
      return Promise.resolve([]);
    });

    // Make readFile return SRT content for that file
    fsMock.readFile.mockImplementation((filePath: unknown) => {
      if (String(filePath).endsWith('.srt')) return Promise.resolve(SAMPLE_SRT);
      return Promise.reject(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
    });

    // AWB returns ok: true
    vi.mocked(fetch).mockResolvedValue({
      json: () => Promise.resolve({ ok: true }),
    } as Response);

    const app = buildApp();
    const res = await request(app).post('/api/poem-wui/send').send({});

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('calls fetch with POST to /api/workflow/intake', async () => {
    fsMock.readdir.mockImplementation((dir: unknown) => {
      if (String(dir).includes('s3-staging')) return Promise.resolve(['video.srt']);
      return Promise.resolve([]);
    });
    fsMock.readFile.mockImplementation((filePath: unknown) => {
      if (String(filePath).endsWith('.srt')) return Promise.resolve(SAMPLE_SRT);
      return Promise.reject(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
    });

    vi.mocked(fetch).mockResolvedValue({
      json: () => Promise.resolve({ ok: true }),
    } as Response);

    const app = buildApp();
    await request(app).post('/api/poem-wui/send').send({});

    expect(fetch).toHaveBeenCalledOnce();
    const [url, opts] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:5041/api/workflow/intake');
    expect(opts.method).toBe('POST');
  });
});

// ---------------------------------------------------------------------------
// No SRT found
// ---------------------------------------------------------------------------

describe('POST /api/poem-wui/send — no SRT found', () => {
  it('returns { ok: false } with an error mentioning SRT when no .srt files exist', async () => {
    // All three scan dirs return empty (default beforeEach behaviour)
    const app = buildApp();
    const res = await request(app).post('/api/poem-wui/send').send({});

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toMatch(/srt/i);
  });

  it('does not call fetch when no SRT is found', async () => {
    const app = buildApp();
    await request(app).post('/api/poem-wui/send').send({});

    expect(fetch).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// No project selected
// ---------------------------------------------------------------------------

describe('POST /api/poem-wui/send — no project selected', () => {
  it('returns { ok: false } with an error about project when projectDirectory is empty', async () => {
    const app = buildApp({ projectDirectory: '' });
    const res = await request(app).post('/api/poem-wui/send').send({});

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toMatch(/project/i);
  });

  it('returns { ok: false } with an error about project when projectDirectory is undefined', async () => {
    const app = buildApp({ projectDirectory: undefined as unknown as string });
    const res = await request(app).post('/api/poem-wui/send').send({});

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toMatch(/project/i);
  });

  it('does not call fetch when no project is selected', async () => {
    const app = buildApp({ projectDirectory: '' });
    await request(app).post('/api/poem-wui/send').send({});

    expect(fetch).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// AWB unreachable (fetch throws)
// ---------------------------------------------------------------------------

describe('POST /api/poem-wui/send — AWB unreachable', () => {
  beforeEach(() => {
    // SRT found so we get past the SRT check
    fsMock.readdir.mockImplementation((dir: unknown) => {
      if (String(dir).includes('s3-staging')) return Promise.resolve(['video.srt']);
      return Promise.resolve([]);
    });
    fsMock.readFile.mockImplementation((filePath: unknown) => {
      if (String(filePath).endsWith('.srt')) return Promise.resolve(SAMPLE_SRT);
      return Promise.reject(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
    });
  });

  it('returns { ok: false } with an error about not reachable when fetch throws', async () => {
    const connError = Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' });
    vi.mocked(fetch).mockRejectedValue(connError);

    const app = buildApp();
    const res = await request(app).post('/api/poem-wui/send').send({});

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toMatch(/not reachable|reachable/i);
  });

  it('includes the port number in the unreachable error', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('ECONNREFUSED'));

    const app = buildApp({ poemWuiUrl: 'http://localhost:5041' });
    const res = await request(app).post('/api/poem-wui/send').send({});

    expect(res.body.error).toContain('5041');
  });
});

// ---------------------------------------------------------------------------
// AWB returns ok: false
// ---------------------------------------------------------------------------

describe('POST /api/poem-wui/send — AWB returns ok: false', () => {
  beforeEach(() => {
    // SRT found so we reach the fetch call
    fsMock.readdir.mockImplementation((dir: unknown) => {
      if (String(dir).includes('s3-staging')) return Promise.resolve(['video.srt']);
      return Promise.resolve([]);
    });
    fsMock.readFile.mockImplementation((filePath: unknown) => {
      if (String(filePath).endsWith('.srt')) return Promise.resolve(SAMPLE_SRT);
      return Promise.reject(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
    });
  });

  it('returns { ok: false } when AWB body has ok: false', async () => {
    vi.mocked(fetch).mockResolvedValue({
      json: () => Promise.resolve({ ok: false, error: 'workflow not found' }),
    } as Response);

    const app = buildApp();
    const res = await request(app).post('/api/poem-wui/send').send({});

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(false);
  });

  it('includes the AWB error message in the response when AWB returns ok: false', async () => {
    vi.mocked(fetch).mockResolvedValue({
      json: () => Promise.resolve({ ok: false, error: 'workflow not found' }),
    } as Response);

    const app = buildApp();
    const res = await request(app).post('/api/poem-wui/send').send({});

    expect(res.body.error).toContain('workflow not found');
  });

  it('returns { ok: false } with unknown error phrase when AWB returns ok: false with no error field', async () => {
    vi.mocked(fetch).mockResolvedValue({
      json: () => Promise.resolve({ ok: false }),
    } as Response);

    const app = buildApp();
    const res = await request(app).post('/api/poem-wui/send').send({});

    expect(res.body.ok).toBe(false);
    expect(res.body.error).toMatch(/unknown error/i);
  });

  it('does NOT return ok: false for a body without ok field (treats as success)', async () => {
    // poemBody.ok is undefined — the check (poemBody.ok === false) is false → route returns { ok: true }
    vi.mocked(fetch).mockResolvedValue({
      json: () => Promise.resolve({}),
    } as Response);

    const app = buildApp();
    const res = await request(app).post('/api/poem-wui/send').send({});

    expect(res.body).toEqual({ ok: true });
  });
});

// ---------------------------------------------------------------------------
// Corrupt brand config JSON
// ---------------------------------------------------------------------------

describe('POST /api/poem-wui/send — corrupt brand config', () => {
  beforeEach(() => {
    // SRT found so we reach the fetch+response stage
    fsMock.readdir.mockImplementation((dir: unknown) => {
      if (String(dir).includes('s3-staging')) return Promise.resolve(['video.srt']);
      return Promise.resolve([]);
    });
    fsMock.readFile.mockImplementation((filePath: unknown) => {
      const p = String(filePath);
      if (p.endsWith('.srt')) return Promise.resolve(SAMPLE_SRT);
      // Any .json path (brand config candidates) returns invalid JSON
      if (p.endsWith('.json')) return Promise.resolve('{ this is not valid json }');
      return Promise.reject(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
    });

    // AWB returns ok: true
    vi.mocked(fetch).mockResolvedValue({
      json: () => Promise.resolve({ ok: true }),
    } as Response);
  });

  it('returns ok: true with a brandConfigError field when brand config JSON is corrupt', async () => {
    const app = buildApp({ brandConfigPath: '/some/brand-config.json' });
    const res = await request(app).post('/api/poem-wui/send').send({});

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.brandConfigError).toBeDefined();
    expect(typeof res.body.brandConfigError).toBe('string');
    expect(res.body.brandConfigError).toMatch(/corrupt|invalid json/i);
  });

  it('still calls AWB even when brand config is corrupt', async () => {
    const app = buildApp({ brandConfigPath: '/some/brand-config.json' });
    await request(app).post('/api/poem-wui/send').send({});

    expect(fetch).toHaveBeenCalledOnce();
  });
});
