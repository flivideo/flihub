// Route-level tests for GET/POST /api/poem-wui/brand-config
import { vi, describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// ---------------------------------------------------------------------------
// Mock fs-extra — no real filesystem access
// ---------------------------------------------------------------------------
const mockReadFile = vi.fn();
const mockWriteFile = vi.fn();

vi.mock('fs-extra', () => ({
  default: {
    readFile: (...args: unknown[]) => mockReadFile(...args),
    writeFile: (...args: unknown[]) => mockWriteFile(...args),
    readdir: vi.fn().mockResolvedValue([]),
    stat: vi.fn(),
    access: vi.fn(),
  },
}));

// Mock shared paths (required by poemWuiUtils imports)
vi.mock('../../../shared/paths.js', () => ({
  getProjectPaths: vi.fn(() => ({ recordings: '', safe: '', transcripts: '' })),
}));

import { createPoemWuiRoutes } from '../routes/poem-wui.js';
import type { Config } from '../../../shared/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SAMPLE_BRAND_CONFIG = {
  brand: { name: 'AppyDave', realName: 'David Cruwys', profession: 'AI Strategist', tagline: 'AI for Creators' },
  socialLinks: { website: 'https://appydave.com', twitter: 'https://twitter.com/appyDave', youtubeMain: 'https://youtube.com/@appydave', youtubeAITLDR: 'https://youtube.com/@aitldr', skool: 'https://skool.com/appydave-6257' },
  ctas: { primaryCta: { label: 'Access Benefits', url: 'https://appydave.com/opt-in' }, foldCta: { label: 'Join Skool', url: 'https://skool.com/appydave-6257' } },
  affiliates: [{ name: 'Buy Me a Coffee', url: 'https://buymeacoffee.com/appydave', active: true }],
  descriptionTemplate: { legalDisclosure: 'Affiliate links disclaimer.', endNote: 'Thanks for watching!' },
};

function makeConfig(overrides: Partial<Config> = {}): Config {
  return {
    projectDirectory: '/test/project',
    watchDirectory: '',
    availableTags: [],
    commonNames: [],
    imageSourceDirectory: '',
    ...overrides,
  } as Config;
}

function buildApp(configOverrides: Partial<Config> = {}) {
  const config = makeConfig(configOverrides);
  const app = express();
  app.use(express.json());
  app.use('/api/poem-wui', createPoemWuiRoutes(() => config));
  return app;
}

// ---------------------------------------------------------------------------
// GET /api/poem-wui/brand-config
// ---------------------------------------------------------------------------

describe('GET /api/poem-wui/brand-config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the bundled brand config when no brandConfigPath is configured', async () => {
    mockReadFile.mockResolvedValue(JSON.stringify(SAMPLE_BRAND_CONFIG));

    const app = buildApp();
    const res = await request(app).get('/api/poem-wui/brand-config');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.brand.name).toBe('AppyDave');
    expect(res.body.path).toBeDefined();
  });

  it('returns the configured brandConfigPath file when set', async () => {
    const customConfig = { ...SAMPLE_BRAND_CONFIG, brand: { ...SAMPLE_BRAND_CONFIG.brand, name: 'CustomBrand' } };
    mockReadFile.mockImplementation((p: unknown) => {
      if (String(p) === '/custom/brand-config.json') return Promise.resolve(JSON.stringify(customConfig));
      return Promise.reject(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
    });

    const app = buildApp({ brandConfigPath: '/custom/brand-config.json' });
    const res = await request(app).get('/api/poem-wui/brand-config');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.brand.name).toBe('CustomBrand');
    expect(res.body.path).toBe('/custom/brand-config.json');
  });

  it('falls back to bundled file when brandConfigPath does not exist', async () => {
    mockReadFile.mockImplementation((p: unknown) => {
      if (String(p) === '/missing/brand-config.json') {
        return Promise.reject(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
      }
      return Promise.resolve(JSON.stringify(SAMPLE_BRAND_CONFIG));
    });

    const app = buildApp({ brandConfigPath: '/missing/brand-config.json' });
    const res = await request(app).get('/api/poem-wui/brand-config');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.brand.name).toBe('AppyDave');
  });

  it('returns success: false when no brand config file is found at all', async () => {
    mockReadFile.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));

    const app = buildApp();
    const res = await request(app).get('/api/poem-wui/brand-config');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/not found/i);
  });
});

// ---------------------------------------------------------------------------
// POST /api/poem-wui/brand-config
// ---------------------------------------------------------------------------

describe('POST /api/poem-wui/brand-config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('writes to the bundled brand config path when no brandConfigPath is configured', async () => {
    mockWriteFile.mockResolvedValue(undefined);

    const app = buildApp();
    const res = await request(app)
      .post('/api/poem-wui/brand-config')
      .send(SAMPLE_BRAND_CONFIG);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockWriteFile).toHaveBeenCalledOnce();
    const [writtenPath, content] = mockWriteFile.mock.calls[0] as [string, string, string];
    expect(writtenPath).toMatch(/brand-config\.json$/);
    expect(JSON.parse(content).brand.name).toBe('AppyDave');
  });

  it('writes to the configured brandConfigPath when set', async () => {
    mockWriteFile.mockResolvedValue(undefined);

    const app = buildApp({ brandConfigPath: '/custom/brand-config.json' });
    const res = await request(app)
      .post('/api/poem-wui/brand-config')
      .send(SAMPLE_BRAND_CONFIG);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const [writtenPath] = mockWriteFile.mock.calls[0] as [string, string, string];
    expect(writtenPath).toBe('/custom/brand-config.json');
  });

  it('returns the path it wrote to in the response', async () => {
    mockWriteFile.mockResolvedValue(undefined);

    const app = buildApp({ brandConfigPath: '/custom/brand-config.json' });
    const res = await request(app)
      .post('/api/poem-wui/brand-config')
      .send(SAMPLE_BRAND_CONFIG);

    expect(res.body.path).toBe('/custom/brand-config.json');
  });

  it('returns success: false with 500 when write fails', async () => {
    mockWriteFile.mockRejectedValue(new Error('disk full'));

    const app = buildApp();
    const res = await request(app)
      .post('/api/poem-wui/brand-config')
      .send(SAMPLE_BRAND_CONFIG);

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/disk full/i);
  });

  it('writes valid JSON with 2-space indentation', async () => {
    mockWriteFile.mockResolvedValue(undefined);

    const app = buildApp();
    await request(app).post('/api/poem-wui/brand-config').send(SAMPLE_BRAND_CONFIG);

    const [, content] = mockWriteFile.mock.calls[0] as [string, string, string];
    // Should parse without error and be pretty-printed
    const parsed = JSON.parse(content);
    expect(parsed.brand.name).toBe('AppyDave');
    expect(content).toContain('\n  '); // 2-space indent
  });
});
