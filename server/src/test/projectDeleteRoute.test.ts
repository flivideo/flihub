// FR-152: Route-level tests for DELETE /api/projects/:code endpoint
import { vi, describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// ---------------------------------------------------------------------------
// Mock fs-extra — no real filesystem access
// ---------------------------------------------------------------------------
const mockPathExists = vi.fn();
const mockRemove = vi.fn();
const mockReaddir = vi.fn();

vi.mock('fs-extra', () => ({
  default: {
    pathExists: (...args: unknown[]) => mockPathExists(...args),
    remove: (...args: unknown[]) => mockRemove(...args),
    readdir: (...args: unknown[]) => mockReaddir(...args),
    // other fs-extra methods needed by routes
    readJson: vi.fn(),
    writeJson: vi.fn(),
  },
}));

// Mock safeDelete utility
vi.mock('../utils/safeDelete.js', () => ({
  safeDelete: vi.fn(),
}));

// Mock projectResolver
vi.mock('../utils/projectResolver.js', () => ({
  resolveProjectCode: vi.fn(),
}));

// Mock finalMedia, chapterExtraction, llmVerification, projectStats, diskUtils
vi.mock('../utils/finalMedia.js', () => ({ detectFinalMedia: vi.fn() }));
vi.mock('../utils/chapterExtraction.js', () => ({ extractChapters: vi.fn() }));
vi.mock('../utils/llmVerification.js', () => ({ verifyChapterWithLLM: vi.fn() }));
vi.mock('../utils/projectStats.js', () => ({ getProjectStatsRaw: vi.fn() }));
vi.mock('../utils/diskUtils.js', () => ({ calculateProjectDiskSize: vi.fn() }));
vi.mock('../utils/filesystem.js', () => ({ readDirSafe: vi.fn() }));

// Mock pathUtils
vi.mock('../utils/pathUtils.js', () => ({
  expandPath: (p: string) => p,
  queryString: (s: unknown) => (typeof s === 'string' ? s : String(s ?? '')),
}));

// Mock shared paths
vi.mock('../../../shared/paths.js', () => ({
  getProjectPaths: vi.fn(() => ({})),
}));

import { createProjectRoutes } from '../routes/projects.js';
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
    ...overrides,
  };
}

function createApp(configOverrides: Partial<Config> = {}) {
  const config = makeConfig(configOverrides);
  const getConfig = () => config;
  const saveConfig = vi.fn();
  const router = createProjectRoutes(getConfig, saveConfig);

  const app = express();
  app.use(express.json());
  app.use('/api/projects', router);

  return { app };
}

// ---------------------------------------------------------------------------
// Tests: DELETE /api/projects/:code
// ---------------------------------------------------------------------------

describe('FR-152: DELETE /api/projects/:code', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('FR-152: returns 400 when confirmationCode does not match project code', async () => {
    const { app } = createApp();

    // Project directory exists — but confirmation code is wrong
    mockPathExists.mockResolvedValue(true);

    const res = await request(app)
      .delete('/api/projects/b72-test-project')
      .send({ confirmationCode: 'wrong-code' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/confirmation code/i);
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it('FR-152: returns 400 when confirmationCode is missing from body', async () => {
    const { app } = createApp();

    mockPathExists.mockResolvedValue(true);

    const res = await request(app)
      .delete('/api/projects/b72-test-project')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/confirmation code/i);
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it('FR-152: returns 400 when relay directory has files', async () => {
    const { app } = createApp({
      relayEnabled: true,
      relayDirectory: '/tmp/relay',
    });

    // Project dir exists
    mockPathExists.mockImplementation(async (p: string) => {
      // project dir: /tmp/projects/b72-test-project -> exists
      // relay dir:   /tmp/relay/b72-test-project -> exists
      // relay subdir: /tmp/relay/b72-test-project/recordings -> exists
      return true;
    });

    // Relay recordings folder has files
    mockReaddir.mockImplementation(async (p: string) => {
      if (p.includes('recordings')) return ['file1.mov', 'file2.mov'];
      return [];
    });

    const res = await request(app)
      .delete('/api/projects/b72-test-project')
      .send({ confirmationCode: 'b72-test-project' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/relay/i);
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it('FR-152: returns 404 when project directory does not exist', async () => {
    const { app } = createApp();

    mockPathExists.mockResolvedValue(false);

    const res = await request(app)
      .delete('/api/projects/b72-missing-project')
      .send({ confirmationCode: 'b72-missing-project' });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it('FR-152: deletes project directory when code matches and relay is clear', async () => {
    const { app } = createApp();

    // No relay configured — only project dir check
    mockPathExists.mockResolvedValue(true);
    mockRemove.mockResolvedValue(undefined);

    const res = await request(app)
      .delete('/api/projects/b72-test-project')
      .send({ confirmationCode: 'b72-test-project' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.deleted).toMatch(/b72-test-project/);
    expect(mockRemove).toHaveBeenCalledWith('/tmp/projects/b72-test-project');
  });

  it('FR-152: returns 400 for invalid code containing path traversal', async () => {
    const { app } = createApp();

    const res = await request(app)
      .delete('/api/projects/..%2Fevil')
      .send({ confirmationCode: '../evil' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(mockRemove).not.toHaveBeenCalled();
  });
});
