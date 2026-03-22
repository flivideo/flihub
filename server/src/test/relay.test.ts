// Comprehensive tests for relay routes + parseRsyncDiff + git-sync
// Uses supertest + vitest mocks — no real filesystem, rsync, or git calls

import { vi, describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// --- Mock child_process (used by relay.ts and system.ts for execFile) ---
// mockExecFile controls what the promisified execFile resolves with.
// Return { stdout, stderr } or throw an Error.
const mockExecFile = vi.fn().mockReturnValue({ stdout: '', stderr: '' });
vi.mock('child_process', async () => {
  const { promisify } = await import('util');

  // Build a callback-style execFile that delegates to mockExecFile
  const execFileFn = (...args: unknown[]) => {
    const cb = args[args.length - 1];
    if (typeof cb === 'function') {
      try {
        const result = mockExecFile(...args.slice(0, -1));
        (cb as Function)(null, result?.stdout ?? '', result?.stderr ?? '');
      } catch (err) {
        (cb as Function)(err, '', '');
      }
    }
  };

  // Attach util.promisify.custom so promisify(execFile) returns { stdout, stderr }
  (execFileFn as any)[promisify.custom] = (...args: unknown[]) => {
    try {
      const result = mockExecFile(...args);
      return Promise.resolve({ stdout: result?.stdout ?? '', stderr: result?.stderr ?? '' });
    } catch (err) {
      return Promise.reject(err);
    }
  };

  return {
    execFile: execFileFn,
    exec: vi.fn(),
    execSync: vi.fn(),
  };
});

// --- Mock fs-extra ---
const mockEnsureDir = vi.fn().mockResolvedValue(undefined);
const mockPathExists = vi.fn().mockResolvedValue(true);
const mockExistsSync = vi.fn().mockReturnValue(true);
vi.mock('fs-extra', () => ({
  default: {
    ensureDir: (...args: unknown[]) => mockEnsureDir(...args),
    pathExists: (...args: unknown[]) => mockPathExists(...args),
    existsSync: (...args: unknown[]) => mockExistsSync(...args),
    readFileSync: vi.fn(),
    stat: vi.fn(),
    readdir: vi.fn(),
    readFile: vi.fn(),
    access: vi.fn(),
  },
}));

// --- Mock pathUtils ---
vi.mock('../utils/pathUtils.js', () => ({
  expandPath: vi.fn((p: string) => p.replace('~', '/Users/test')),
}));

// Imports must come AFTER vi.mock() declarations
import { createRelayRoutes, parseRsyncDiff } from '../routes/relay.js';
import { createSystemRoutes } from '../routes/system.js';
import type { Config } from '../../../shared/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(overrides: Partial<Config> = {}): Config {
  return {
    watchDirectory: '~/ecamm',
    projectDirectory: '~/dev/video-projects/v-appydave/b17-test',
    fileExtensions: ['.mov', '.mp4'],
    availableTags: [],
    commonNames: [],
    imageSourceDirectory: '~/Downloads',
    relayDirectory: '~/relay/flihub-appydave',
    relayEnabled: true,
    ...overrides,
  } as Config;
}

function buildRelayApp(config: Partial<Config> = {}) {
  const mockConfig = makeConfig(config);
  const app = express();
  app.use(express.json());
  app.use('/api/relay', createRelayRoutes(() => mockConfig));
  return app;
}

function buildSystemApp(config: Partial<Config> = {}) {
  const mockConfig = makeConfig(config);
  const app = express();
  app.use(express.json());
  app.use('/api/system', createSystemRoutes(() => mockConfig));
  return app;
}

// ---------------------------------------------------------------------------
// parseRsyncDiff — unit tests
// ---------------------------------------------------------------------------

describe('parseRsyncDiff', () => {
  it('parses new files (>f+++++++++ prefix)', () => {
    const stdout = '>f+++++++++ recordings/01-1-intro.mov\n';
    const result = parseRsyncDiff(stdout);
    expect(result.new).toEqual(['recordings/01-1-intro.mov']);
    expect(result.updated).toEqual([]);
    expect(result.deleted).toEqual([]);
  });

  it('parses updated files (>f.st...... prefix)', () => {
    const stdout = '>f.st...... recordings/01-1-intro.mov\n';
    const result = parseRsyncDiff(stdout);
    expect(result.new).toEqual([]);
    expect(result.updated).toEqual(['recordings/01-1-intro.mov']);
    expect(result.deleted).toEqual([]);
  });

  it('parses deleted files (*deleting prefix)', () => {
    const stdout = '*deleting   recordings/old-file.mov\n';
    const result = parseRsyncDiff(stdout);
    expect(result.new).toEqual([]);
    expect(result.updated).toEqual([]);
    expect(result.deleted).toEqual(['recordings/old-file.mov']);
  });

  it('handles mixed output (new + updated + deleted)', () => {
    const stdout = [
      '>f+++++++++ recordings/01-1-intro.mov',
      '>f.st...... recordings/02-1-setup.mov',
      '*deleting   recordings/old-file.mov',
      '>f+++++++++ recordings/03-1-outro.mov',
    ].join('\n');
    const result = parseRsyncDiff(stdout);
    expect(result.new).toEqual(['recordings/01-1-intro.mov', 'recordings/03-1-outro.mov']);
    expect(result.updated).toEqual(['recordings/02-1-setup.mov']);
    expect(result.deleted).toEqual(['recordings/old-file.mov']);
  });

  it('returns empty arrays for empty output', () => {
    const result = parseRsyncDiff('');
    expect(result).toEqual({ new: [], updated: [], deleted: [] });
  });

  it('returns empty arrays for whitespace-only output', () => {
    const result = parseRsyncDiff('   \n  \n\n');
    expect(result).toEqual({ new: [], updated: [], deleted: [] });
  });

  it('ignores non-rsync metadata lines', () => {
    const stdout = [
      'sending incremental file list',
      '>f+++++++++ recordings/01-1-intro.mov',
      'sent 123 bytes  received 456 bytes  579.00 bytes/sec',
      'total size is 1234  speedup is 2.13',
    ].join('\n');
    const result = parseRsyncDiff(stdout);
    expect(result.new).toEqual(['recordings/01-1-intro.mov']);
    expect(result.updated).toEqual([]);
    expect(result.deleted).toEqual([]);
  });

  it('ignores directory entries (>d prefix)', () => {
    const stdout = [
      '>d+++++++++ recordings/',
      '>f+++++++++ recordings/01-1-intro.mov',
      '>d+++++++++ recordings/-safe/',
    ].join('\n');
    const result = parseRsyncDiff(stdout);
    expect(result.new).toEqual(['recordings/01-1-intro.mov']);
    expect(result.updated).toEqual([]);
    expect(result.deleted).toEqual([]);
  });

  it('skips lines with >f but no space after flags', () => {
    const stdout = '>f+++++++++\n';
    const result = parseRsyncDiff(stdout);
    expect(result).toEqual({ new: [], updated: [], deleted: [] });
  });

  it('handles multiple files of same type (all new)', () => {
    const stdout = [
      '>f+++++++++ recordings/01-1-intro.mov',
      '>f+++++++++ recordings/02-1-setup.mov',
      '>f+++++++++ recordings/03-1-demo.mov',
      '>f+++++++++ recordings/04-1-outro.mov',
    ].join('\n');
    const result = parseRsyncDiff(stdout);
    expect(result.new).toHaveLength(4);
    expect(result.new).toEqual([
      'recordings/01-1-intro.mov',
      'recordings/02-1-setup.mov',
      'recordings/03-1-demo.mov',
      'recordings/04-1-outro.mov',
    ]);
  });

  it('handles multiple files of same type (all updated)', () => {
    const stdout = [
      '>f.st...... recordings/01-1-intro.mov',
      '>f..t...... recordings/02-1-setup.mov',
      '>f.s....... recordings/03-1-demo.mov',
    ].join('\n');
    const result = parseRsyncDiff(stdout);
    expect(result.updated).toHaveLength(3);
  });

  it('handles multiple files of same type (all deleted)', () => {
    const stdout = [
      '*deleting   recordings/old-1.mov',
      '*deleting   recordings/old-2.mov',
    ].join('\n');
    const result = parseRsyncDiff(stdout);
    expect(result.deleted).toEqual(['recordings/old-1.mov', 'recordings/old-2.mov']);
  });

  it('handles filenames with spaces', () => {
    const stdout = '>f+++++++++ recordings/01-1-my intro file.mov\n';
    const result = parseRsyncDiff(stdout);
    expect(result.new).toEqual(['recordings/01-1-my intro file.mov']);
  });

  it('handles filenames with special characters', () => {
    const stdout = ">f+++++++++ recordings/01-1-intro (copy).mov\n";
    const result = parseRsyncDiff(stdout);
    expect(result.new).toEqual(['recordings/01-1-intro (copy).mov']);
  });

  it('handles filenames with unicode characters', () => {
    const stdout = '>f+++++++++ recordings/01-1-über-résumé.mov\n';
    const result = parseRsyncDiff(stdout);
    expect(result.new).toEqual(['recordings/01-1-über-résumé.mov']);
  });

  it('parses .DS_Store if present in output (filtering is at rsync flag level)', () => {
    const stdout = '>f+++++++++ .DS_Store\n';
    const result = parseRsyncDiff(stdout);
    expect(result.new).toEqual(['.DS_Store']);
  });

  it('handles *deleting with variable whitespace', () => {
    const stdout = '*deleting      recordings/old-file.mov\n';
    const result = parseRsyncDiff(stdout);
    expect(result.deleted).toEqual(['recordings/old-file.mov']);
  });

  it('handles >f with various update flag patterns', () => {
    const stdout = [
      '>f..t...... recordings/time-only.mov',
      '>f.s....... recordings/size-only.mov',
      '>f.st...... recordings/size-and-time.mov',
      '>fc.t...... recordings/checksum.mov',
    ].join('\n');
    const result = parseRsyncDiff(stdout);
    expect(result.updated).toHaveLength(4);
    expect(result.new).toHaveLength(0);
  });

  it('handles deeply nested paths', () => {
    const stdout = '>f+++++++++ recordings/-chapters/ch01/segment-1.mov\n';
    const result = parseRsyncDiff(stdout);
    expect(result.new).toEqual(['recordings/-chapters/ch01/segment-1.mov']);
  });
});

// ---------------------------------------------------------------------------
// Relay route integration tests
// ---------------------------------------------------------------------------

describe('relay routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- GET /status ---

  describe('GET /api/relay/status', () => {
    it('returns configured=true and enabled=true when relay is fully configured', async () => {
      const app = buildRelayApp();
      const res = await request(app).get('/api/relay/status');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.configured).toBe(true);
      expect(res.body.enabled).toBe(true);
      expect(res.body.relayDirectory).toBe('~/relay/flihub-appydave');
    });

    it('returns configured=false when relayDirectory is not set', async () => {
      const app = buildRelayApp({ relayDirectory: undefined });
      const res = await request(app).get('/api/relay/status');
      expect(res.body.configured).toBe(false);
      expect(res.body.relayDirectory).toBeNull();
    });

    it('returns enabled=false when relayEnabled is false', async () => {
      const app = buildRelayApp({ relayEnabled: false });
      const res = await request(app).get('/api/relay/status');
      expect(res.body.enabled).toBe(false);
    });

    it('returns configured=false and enabled=false when both missing', async () => {
      const app = buildRelayApp({ relayDirectory: undefined, relayEnabled: false });
      const res = await request(app).get('/api/relay/status');
      expect(res.body.configured).toBe(false);
      expect(res.body.enabled).toBe(false);
    });
  });

  // --- POST /preview ---

  describe('POST /api/relay/preview', () => {
    it('returns error when relayEnabled is false', async () => {
      const app = buildRelayApp({ relayEnabled: false });
      const res = await request(app).post('/api/relay/preview');
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/not enabled/i);
    });

    it('returns error when relayDirectory is missing', async () => {
      const app = buildRelayApp({ relayDirectory: undefined });
      const res = await request(app).post('/api/relay/preview');
      expect(res.body.success).toBe(false);
    });

    it('returns error when projectDirectory is missing', async () => {
      const app = buildRelayApp({ projectDirectory: '' });
      const res = await request(app).post('/api/relay/preview');
      expect(res.body.success).toBe(false);
    });

    it('returns error when projectCode is empty (trailing slash)', async () => {
      // path.basename returns '' for paths ending with /
      // expandPath will return the path as-is (with ~ replaced), and path.basename of a dir with trailing slash
      // In reality, expandPath strips ~ → /Users/test, but if projectDirectory is just '/' then basename is ''
      const app = buildRelayApp({ projectDirectory: '/' });
      const res = await request(app).post('/api/relay/preview');
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/invalid/i);
    });

    it('returns error when projectCode contains path traversal', async () => {
      // expandPath replaces ~ with /Users/test, so we need a path where basename returns '..'
      const app = buildRelayApp({ projectDirectory: '/some/path/..' });
      const res = await request(app).post('/api/relay/preview');
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/invalid/i);
    });

    it('returns structured diff on success', async () => {
      mockExecFile.mockReturnValue({
        stdout: [
          '>f+++++++++ recordings/01-1-intro.mov',
          '>f.st...... recordings/02-1-setup.mov',
          '*deleting   recordings/old.mov',
        ].join('\n'),
      });
      const app = buildRelayApp();
      const res = await request(app).post('/api/relay/preview');
      expect(res.body.success).toBe(true);
      expect(res.body.diff).toEqual({
        new: ['recordings/01-1-intro.mov'],
        updated: ['recordings/02-1-setup.mov'],
        deleted: ['recordings/old.mov'],
      });
    });

    it('calls rsync with correct dry-run flags', async () => {
      mockExecFile.mockReturnValue({ stdout: '' });
      const app = buildRelayApp();
      await request(app).post('/api/relay/preview');
      expect(mockExecFile).toHaveBeenCalled();
      const args = mockExecFile.mock.calls[0];
      expect(args[0]).toBe('rsync');
      expect(args[1]).toContain('--dry-run');
      expect(args[1]).toContain('--itemize-changes');
      expect(args[1]).toContain('-av');
    });
  });

  // --- POST /push ---

  describe('POST /api/relay/push', () => {
    it('returns error when relay not enabled', async () => {
      const app = buildRelayApp({ relayEnabled: false });
      const res = await request(app).post('/api/relay/push');
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/not enabled/i);
    });

    it('returns error when relayDirectory missing', async () => {
      const app = buildRelayApp({ relayDirectory: undefined });
      const res = await request(app).post('/api/relay/push');
      expect(res.body.success).toBe(false);
    });

    it('returns error when projectDirectory missing', async () => {
      const app = buildRelayApp({ projectDirectory: '' });
      const res = await request(app).post('/api/relay/push');
      expect(res.body.success).toBe(false);
    });

    it('calls fs.ensureDir before rsync', async () => {
      mockExecFile.mockReturnValue({ stdout: 'sent files' });
      const app = buildRelayApp();
      await request(app).post('/api/relay/push');
      expect(mockEnsureDir).toHaveBeenCalled();
    });

    it('calls rsync with correct push args (no dry-run)', async () => {
      mockExecFile.mockReturnValue({ stdout: 'sent files' });
      const app = buildRelayApp();
      await request(app).post('/api/relay/push');
      expect(mockExecFile).toHaveBeenCalled();
      const args = mockExecFile.mock.calls[0];
      expect(args[0]).toBe('rsync');
      expect(args[1]).toContain('-av');
      expect(args[1]).not.toContain('--dry-run');
    });

    it('returns rsync output on success', async () => {
      mockExecFile.mockReturnValue({ stdout: 'sending incremental file list\nsent 100 bytes' });
      const app = buildRelayApp();
      const res = await request(app).post('/api/relay/push');
      expect(res.body.success).toBe(true);
      expect(res.body.output).toContain('sending incremental file list');
    });

    it('includes .DS_Store exclusion in rsync args', async () => {
      mockExecFile.mockReturnValue({ stdout: '' });
      const app = buildRelayApp();
      await request(app).post('/api/relay/push');
      const args = mockExecFile.mock.calls[0];
      const rsyncArgs = args[1] as string[];
      const dsStoreIdx = rsyncArgs.indexOf('.DS_Store');
      expect(dsStoreIdx).toBeGreaterThan(-1);
      expect(rsyncArgs[dsStoreIdx - 1]).toBe('--exclude');
    });
  });

  // --- POST /collect ---

  describe('POST /api/relay/collect', () => {
    it('returns error when relay not enabled', async () => {
      const app = buildRelayApp({ relayEnabled: false });
      const res = await request(app).post('/api/relay/collect');
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/not enabled/i);
    });

    it('returns error when relayDirectory missing', async () => {
      const app = buildRelayApp({ relayDirectory: undefined });
      const res = await request(app).post('/api/relay/collect');
      expect(res.body.success).toBe(false);
    });

    it('calls fs.ensureDir for project final directory', async () => {
      mockExecFile.mockReturnValue({ stdout: 'received files' });
      const app = buildRelayApp();
      await request(app).post('/api/relay/collect');
      expect(mockEnsureDir).toHaveBeenCalled();
      const ensureDirArg = mockEnsureDir.mock.calls[0][0] as string;
      expect(ensureDirArg).toContain('final');
    });

    it('calls rsync with correct collect direction (relay → project)', async () => {
      mockExecFile.mockReturnValue({ stdout: 'received files' });
      const app = buildRelayApp();
      await request(app).post('/api/relay/collect');
      const args = mockExecFile.mock.calls[0];
      expect(args[0]).toBe('rsync');
      const rsyncArgs = args[1] as string[];
      // Source should be relay final dir, dest should be project final dir
      const srcArg = rsyncArgs[rsyncArgs.length - 2];
      const destArg = rsyncArgs[rsyncArgs.length - 1];
      expect(srcArg).toContain('relay');
      expect(srcArg).toContain('final');
      expect(destArg).toContain('b17-test');
      expect(destArg).toContain('final');
    });

    it('returns rsync output on success', async () => {
      mockExecFile.mockReturnValue({ stdout: 'receiving incremental file list\nreceived 200 bytes' });
      const app = buildRelayApp();
      const res = await request(app).post('/api/relay/collect');
      expect(res.body.success).toBe(true);
      expect(res.body.output).toContain('receiving incremental file list');
    });
  });
});

// ---------------------------------------------------------------------------
// Git-sync route integration tests
// ---------------------------------------------------------------------------

describe('POST /api/system/git-sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error when projectsRootDirectory not configured', async () => {
    const app = buildSystemApp({ projectsRootDirectory: undefined });
    const res = await request(app).post('/api/system/git-sync');
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/projects root directory/i);
  });

  it('calls execFile with git pull --rebase on success', async () => {
    mockExecFile.mockReturnValue({ stdout: 'Already up to date.\n', stderr: '' });
    const app = buildSystemApp({ projectsRootDirectory: '~/dev/video-projects/v-appydave' });
    await request(app).post('/api/system/git-sync');
    expect(mockExecFile).toHaveBeenCalled();
    const args = mockExecFile.mock.calls[0];
    expect(args[0]).toBe('git');
    expect(args[1]).toEqual(['pull', '--rebase']);
  });

  it('returns stdout on success', async () => {
    mockExecFile.mockReturnValue({ stdout: 'Already up to date.\n', stderr: '' });
    const app = buildSystemApp({ projectsRootDirectory: '~/dev/video-projects/v-appydave' });
    const res = await request(app).post('/api/system/git-sync');
    expect(res.body.success).toBe(true);
    expect(res.body.output).toContain('Already up to date.');
  });

  it('returns stderr as output when stdout is empty', async () => {
    mockExecFile.mockReturnValue({ stdout: '', stderr: 'Current branch main is up to date.' });
    const app = buildSystemApp({ projectsRootDirectory: '~/dev/video-projects/v-appydave' });
    const res = await request(app).post('/api/system/git-sync');
    expect(res.body.success).toBe(true);
    expect(res.body.output).toContain('Current branch main is up to date.');
  });

  it('returns 500 on exec failure', async () => {
    mockExecFile.mockImplementationOnce(() => {
      throw new Error('fatal: not a git repository');
    });
    const app = buildSystemApp({ projectsRootDirectory: '~/dev/video-projects/v-appydave' });
    const res = await request(app).post('/api/system/git-sync');
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('not a git repository');
  });

  it('passes cwd option to execFile', async () => {
    mockExecFile.mockReturnValue({ stdout: 'ok', stderr: '' });
    const app = buildSystemApp({ projectsRootDirectory: '~/dev/video-projects/v-appydave' });
    await request(app).post('/api/system/git-sync');
    const args = mockExecFile.mock.calls[0];
    expect(args[2]).toHaveProperty('cwd', '/Users/test/dev/video-projects/v-appydave');
  });
});
