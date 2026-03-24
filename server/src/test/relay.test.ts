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
const mockReaddir = vi.fn();
const mockStat = vi.fn();
const mockCopy = vi.fn().mockResolvedValue(undefined);
vi.mock('fs-extra', () => ({
  default: {
    ensureDir: (...args: unknown[]) => mockEnsureDir(...args),
    pathExists: (...args: unknown[]) => mockPathExists(...args),
    existsSync: (...args: unknown[]) => mockExistsSync(...args),
    readFileSync: vi.fn(),
    stat: (...args: unknown[]) => mockStat(...args),
    readdir: (...args: unknown[]) => mockReaddir(...args),
    readFile: vi.fn(),
    access: vi.fn(),
    copy: (...args: unknown[]) => mockCopy(...args),
  },
}));

// --- Mock pathUtils ---
vi.mock('../utils/pathUtils.js', () => ({
  expandPath: vi.fn((p: string) => p.replace('~', '/Users/test')),
}));

// Imports must come AFTER vi.mock() declarations
import { createRelayRoutes, parseRsyncDiff, getRelayPaths, rsyncExcludeArgs, RELAY_SUBFOLDERS, logRelayActivity, clearActivityLog, deriveSyncStatus } from '../routes/relay.js';
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

    it('calls fs.ensureDir for project recordings directory (default subfolder)', async () => {
      mockExecFile.mockReturnValue({ stdout: 'received files' });
      const app = buildRelayApp();
      await request(app).post('/api/relay/collect');
      expect(mockEnsureDir).toHaveBeenCalled();
      const ensureDirArg = mockEnsureDir.mock.calls[0][0] as string;
      expect(ensureDirArg).toContain('recordings');
    });

    it('calls rsync with correct collect direction (relay → project)', async () => {
      mockExecFile.mockReturnValue({ stdout: 'received files' });
      const app = buildRelayApp();
      await request(app).post('/api/relay/collect');
      const args = mockExecFile.mock.calls[0];
      expect(args[0]).toBe('rsync');
      const rsyncArgs = args[1] as string[];
      // Source should be relay recordings dir, dest should be project recordings dir
      const srcArg = rsyncArgs[rsyncArgs.length - 2];
      const destArg = rsyncArgs[rsyncArgs.length - 1];
      expect(srcArg).toContain('relay');
      expect(srcArg).toContain('recordings');
      expect(destArg).toContain('b17-test');
      expect(destArg).toContain('recordings');
    });

    it('returns rsync output on success', async () => {
      mockExecFile.mockReturnValue({ stdout: 'receiving incremental file list\nreceived 200 bytes' });
      const app = buildRelayApp();
      const res = await request(app).post('/api/relay/collect');
      expect(res.body.success).toBe(true);
      expect(res.body.output).toContain('receiving incremental file list');
    });
  });

  // --- Error-path tests (rsync failures) ---

  describe('rsync error paths', () => {
    it('POST /preview returns 500 when rsync fails', async () => {
      mockExecFile.mockImplementation(() => { throw new Error('rsync: connection refused'); });
      const app = buildRelayApp();
      const res = await request(app).post('/api/relay/preview');
      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });

    it('POST /push returns 500 when rsync fails', async () => {
      mockExecFile.mockImplementation(() => { throw new Error('rsync: connection refused'); });
      const app = buildRelayApp();
      const res = await request(app).post('/api/relay/push');
      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });

    it('POST /collect returns 500 when rsync fails', async () => {
      mockExecFile.mockImplementation(() => { throw new Error('rsync: connection refused'); });
      const app = buildRelayApp();
      const res = await request(app).post('/api/relay/collect');
      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  // --- Exclusion verification tests ---

  describe('rsync exclusion patterns', () => {
    it('POST /push includes all rsync exclusion patterns', async () => {
      mockExecFile.mockReturnValue({ stdout: '', stderr: '' });
      const app = buildRelayApp();
      await request(app).post('/api/relay/push');
      const args = mockExecFile.mock.calls[0][1] as string[];
      expect(args).toContain('.DS_Store');
      expect(args).toContain('._*');
      expect(args).toContain('.gitkeep');
      expect(args).toContain('.stfolder');
      expect(args).toContain('.stignore');
      expect(args).toContain('.stversions');
      expect(args).toContain('.Spotlight-V100');
      expect(args).toContain('.Trashes');
      expect(args).toContain('Thumbs.db');
    });

    it('POST /preview includes all rsync exclusion patterns', async () => {
      mockExecFile.mockReturnValue({ stdout: '', stderr: '' });
      const app = buildRelayApp();
      await request(app).post('/api/relay/preview');
      const args = mockExecFile.mock.calls[0][1] as string[];
      expect(args).toContain('.DS_Store');
      expect(args).toContain('._*');
      expect(args).toContain('.gitkeep');
      expect(args).toContain('.stfolder');
      expect(args).toContain('Thumbs.db');
    });
  });

  // --- Subfolder routing tests ---

  describe('subfolder param routing', () => {
    it('POST /preview with subfolder=edit-1st uses correct source/dest paths', async () => {
      mockExecFile.mockReturnValue({ stdout: '' });
      const app = buildRelayApp();
      const res = await request(app)
        .post('/api/relay/preview')
        .send({ subfolder: 'edit-1st' });
      expect(res.body.success).toBe(true);
      expect(res.body.subfolder).toBe('edit-1st');
      const rsyncArgs = mockExecFile.mock.calls[0][1] as string[];
      const srcArg = rsyncArgs[rsyncArgs.length - 2];
      const destArg = rsyncArgs[rsyncArgs.length - 1];
      expect(srcArg).toContain('edit-1st');
      expect(destArg).toContain('edit-1st');
    });

    it('POST /push with subfolder=edit-2nd uses correct source/dest paths', async () => {
      mockExecFile.mockReturnValue({ stdout: 'sent files' });
      const app = buildRelayApp();
      const res = await request(app)
        .post('/api/relay/push')
        .send({ subfolder: 'edit-2nd' });
      expect(res.body.success).toBe(true);
      expect(res.body.subfolder).toBe('edit-2nd');
      const rsyncArgs = mockExecFile.mock.calls[0][1] as string[];
      const srcArg = rsyncArgs[rsyncArgs.length - 2];
      const destArg = rsyncArgs[rsyncArgs.length - 1];
      expect(srcArg).toContain('edit-2nd');
      expect(destArg).toContain('edit-2nd');
    });

    it('POST /collect with subfolder=recordings uses relay→project direction', async () => {
      mockExecFile.mockReturnValue({ stdout: 'received files' });
      const app = buildRelayApp();
      const res = await request(app)
        .post('/api/relay/collect')
        .send({ subfolder: 'recordings' });
      expect(res.body.success).toBe(true);
      expect(res.body.subfolder).toBe('recordings');
      const rsyncArgs = mockExecFile.mock.calls[0][1] as string[];
      const srcArg = rsyncArgs[rsyncArgs.length - 2];
      const destArg = rsyncArgs[rsyncArgs.length - 1];
      // Source is relay, dest is project
      expect(srcArg).toContain('relay');
      expect(srcArg).toContain('recordings');
      expect(destArg).toContain('b17-test');
      expect(destArg).toContain('recordings');
    });

    it('POST /preview with invalid subfolder returns error', async () => {
      const app = buildRelayApp();
      const res = await request(app)
        .post('/api/relay/preview')
        .send({ subfolder: 'invalid-folder' });
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Invalid subfolder');
    });

    it('POST /push with invalid subfolder returns error', async () => {
      const app = buildRelayApp();
      const res = await request(app)
        .post('/api/relay/push')
        .send({ subfolder: 'malicious-folder' });
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Invalid subfolder');
    });

    it('POST /collect with invalid subfolder returns error', async () => {
      const app = buildRelayApp();
      const res = await request(app)
        .post('/api/relay/collect')
        .send({ subfolder: '../secrets' });
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Invalid subfolder');
    });

    it('POST /push defaults to recordings when no subfolder sent', async () => {
      mockExecFile.mockReturnValue({ stdout: 'sent files' });
      const app = buildRelayApp();
      const res = await request(app).post('/api/relay/push');
      expect(res.body.success).toBe(true);
      const rsyncArgs = mockExecFile.mock.calls[0][1] as string[];
      const srcArg = rsyncArgs[rsyncArgs.length - 2];
      expect(srcArg).toContain('recordings');
    });

    it('POST /collect defaults to recordings when no subfolder sent', async () => {
      mockExecFile.mockReturnValue({ stdout: 'received files' });
      const app = buildRelayApp();
      const res = await request(app).post('/api/relay/collect');
      expect(res.body.success).toBe(true);
      const rsyncArgs = mockExecFile.mock.calls[0][1] as string[];
      const srcArg = rsyncArgs[rsyncArgs.length - 2];
      expect(srcArg).toContain('recordings');
    });

    it('POST /push with subfolder sends correct rsync args', async () => {
      mockExecFile.mockReturnValue({ stdout: 'sent files' });
      const app = buildRelayApp();
      await request(app)
        .post('/api/relay/push')
        .send({ subfolder: 'edit-1st' });
      const args = mockExecFile.mock.calls[0];
      expect(args[0]).toBe('rsync');
      const rsyncArgs = args[1] as string[];
      expect(rsyncArgs).toContain('-av');
      expect(rsyncArgs).not.toContain('--dry-run');
      // Source is project/edit-1st/, dest is relay/edit-1st/
      const srcArg = rsyncArgs[rsyncArgs.length - 2];
      const destArg = rsyncArgs[rsyncArgs.length - 1];
      expect(srcArg).toMatch(/edit-1st\/$/);
      expect(destArg).toMatch(/edit-1st\/$/);
      // Push direction: project → relay
      expect(srcArg).toContain('b17-test');
      expect(destArg).toContain('relay');
    });

    it('POST /collect direction is relay→project (not project→relay)', async () => {
      mockExecFile.mockReturnValue({ stdout: 'received files' });
      const app = buildRelayApp();
      await request(app)
        .post('/api/relay/collect')
        .send({ subfolder: 'edit-2nd' });
      const rsyncArgs = mockExecFile.mock.calls[0][1] as string[];
      const srcArg = rsyncArgs[rsyncArgs.length - 2];
      const destArg = rsyncArgs[rsyncArgs.length - 1];
      // Collect direction: relay → project
      expect(srcArg).toContain('relay');
      expect(srcArg).toContain('edit-2nd');
      expect(destArg).toContain('b17-test');
      expect(destArg).toContain('edit-2nd');
    });

    it('POST /push with subfolder=edit-1st calls ensureDir for relay edit-1st', async () => {
      mockExecFile.mockReturnValue({ stdout: '' });
      const app = buildRelayApp();
      await request(app)
        .post('/api/relay/push')
        .send({ subfolder: 'edit-1st' });
      expect(mockEnsureDir).toHaveBeenCalled();
      const ensureDirArg = mockEnsureDir.mock.calls[0][0] as string;
      expect(ensureDirArg).toContain('edit-1st');
    });

    it('POST /collect with subfolder=edit-2nd calls ensureDir for project edit-2nd', async () => {
      mockExecFile.mockReturnValue({ stdout: '' });
      const app = buildRelayApp();
      await request(app)
        .post('/api/relay/collect')
        .send({ subfolder: 'edit-2nd' });
      expect(mockEnsureDir).toHaveBeenCalled();
      const ensureDirArg = mockEnsureDir.mock.calls[0][0] as string;
      expect(ensureDirArg).toContain('edit-2nd');
      expect(ensureDirArg).toContain('b17-test');
    });
  });
});

// ---------------------------------------------------------------------------
// getRelayPaths + rsyncExcludeArgs — unit tests
// ---------------------------------------------------------------------------

describe('getRelayPaths', () => {
  it('returns error when relay not enabled', () => {
    const config = makeConfig({ relayEnabled: false });
    const result = getRelayPaths(config);
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toMatch(/not enabled/i);
    }
  });

  it('returns error when relayDirectory missing', () => {
    const config = makeConfig({ relayDirectory: undefined });
    const result = getRelayPaths(config);
    expect('error' in result).toBe(true);
  });

  it('returns error when projectDirectory missing', () => {
    const config = makeConfig({ projectDirectory: '' });
    const result = getRelayPaths(config);
    expect('error' in result).toBe(true);
  });

  it('returns paths when properly configured', () => {
    const config = makeConfig();
    const result = getRelayPaths(config);
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.projectDir).toBe('/Users/test/dev/video-projects/v-appydave/b17-test');
      expect(result.projectCode).toBe('b17-test');
      expect(result.relayProjectDir).toContain('b17-test');
    }
  });
});

describe('rsyncExcludeArgs', () => {
  it('returns correct patterns as --exclude pairs', () => {
    const args = rsyncExcludeArgs();
    // Should be pairs of ['--exclude', 'pattern', '--exclude', 'pattern', ...]
    expect(args.length).toBeGreaterThan(0);
    expect(args.length % 2).toBe(0);
    // Every odd-index element should be '--exclude'
    for (let i = 0; i < args.length; i += 2) {
      expect(args[i]).toBe('--exclude');
    }
    // Check key patterns are present
    expect(args).toContain('.DS_Store');
    expect(args).toContain('._*');
    expect(args).toContain('.gitkeep');
    expect(args).toContain('.stfolder');
    expect(args).toContain('Thumbs.db');
  });
});

describe('RELAY_SUBFOLDERS', () => {
  it('contains expected subfolder names', () => {
    expect(RELAY_SUBFOLDERS).toEqual(['recordings', 'edit-1st', 'edit-2nd']);
  });
});

// ---------------------------------------------------------------------------
// GET /api/relay/browse — integration tests
// ---------------------------------------------------------------------------

describe('GET /api/relay/browse', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error when relay not enabled', async () => {
    const app = buildRelayApp({ relayEnabled: false });
    const res = await request(app).get('/api/relay/browse');
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/not enabled/i);
  });

  it('returns empty projects when relay directory does not exist (readdir throws)', async () => {
    mockReaddir.mockRejectedValueOnce(new Error('ENOENT'));
    const app = buildRelayApp();
    const res = await request(app).get('/api/relay/browse');
    expect(res.body.success).toBe(true);
    expect(res.body.projects).toEqual([]);
    expect(res.body.relayDirectory).toBe('~/relay/flihub-appydave');
  });

  it('returns project list with subfolder breakdown', async () => {
    // Top-level readdir (relay dir with withFileTypes)
    mockReaddir.mockImplementation(async (dir: string, opts?: { withFileTypes?: boolean }) => {
      if (opts?.withFileTypes) {
        return [
          { name: 'b17-test', isDirectory: () => true },
          { name: 'c32-bmad', isDirectory: () => true },
        ];
      }
      // Sub-folder readdir (no withFileTypes)
      if (dir.includes('b17-test') && dir.includes('recordings')) return ['01-1-intro.mov'];
      if (dir.includes('b17-test') && dir.includes('edit-1st')) return [];
      if (dir.includes('b17-test') && dir.includes('edit-2nd')) return ['b17-final-v1.mp4'];
      if (dir.includes('c32-bmad') && dir.includes('recordings')) return [];
      if (dir.includes('c32-bmad') && dir.includes('edit-1st')) return [];
      if (dir.includes('c32-bmad') && dir.includes('edit-2nd')) return [];
      return [];
    });
    mockStat.mockResolvedValue({ isFile: () => true, size: 1024000 });

    const app = buildRelayApp();
    const res = await request(app).get('/api/relay/browse');
    expect(res.body.success).toBe(true);
    expect(res.body.projects).toHaveLength(2);

    const b17 = res.body.projects.find((p: { projectCode: string }) => p.projectCode === 'b17-test');
    expect(b17.subfolders.recordings.fileCount).toBe(1);
    expect(b17.subfolders.recordings.totalSize).toBe(1024000);
    expect(b17.subfolders['edit-1st'].fileCount).toBe(0);
    expect(b17.subfolders['edit-2nd'].fileCount).toBe(1);
  });

  it('filters out hidden directories (starting with .)', async () => {
    mockReaddir.mockImplementation(async (_dir: string, opts?: { withFileTypes?: boolean }) => {
      if (opts?.withFileTypes) {
        return [
          { name: 'b17-test', isDirectory: () => true },
          { name: '.stfolder', isDirectory: () => true },
          { name: '.stversions', isDirectory: () => true },
        ];
      }
      return [];
    });
    mockStat.mockResolvedValue({ isFile: () => true, size: 500 });

    const app = buildRelayApp();
    const res = await request(app).get('/api/relay/browse');
    expect(res.body.success).toBe(true);
    expect(res.body.projects).toHaveLength(1);
    expect(res.body.projects[0].projectCode).toBe('b17-test');
  });

  it('filters out hidden files within subfolders', async () => {
    mockReaddir.mockImplementation(async (dir: string, opts?: { withFileTypes?: boolean }) => {
      if (opts?.withFileTypes) {
        return [{ name: 'b17-test', isDirectory: () => true }];
      }
      if (dir.includes('recordings')) return ['01-1-intro.mov', '.DS_Store', '._metadata'];
      return [];
    });
    mockStat.mockResolvedValue({ isFile: () => true, size: 2048 });

    const app = buildRelayApp();
    const res = await request(app).get('/api/relay/browse');
    const b17 = res.body.projects[0];
    expect(b17.subfolders.recordings.fileCount).toBe(1);
    expect(b17.subfolders.recordings.totalSize).toBe(2048);
  });

  it('returns fileCount=0 when subfolder does not exist', async () => {
    mockReaddir.mockImplementation(async (dir: string, opts?: { withFileTypes?: boolean }) => {
      if (opts?.withFileTypes) {
        return [{ name: 'b17-test', isDirectory: () => true }];
      }
      // All subfolder reads throw (subfolders don't exist)
      throw new Error('ENOENT');
    });

    const app = buildRelayApp();
    const res = await request(app).get('/api/relay/browse');
    expect(res.body.success).toBe(true);
    expect(res.body.projects).toHaveLength(1);
    const b17 = res.body.projects[0];
    expect(b17.subfolders.recordings.fileCount).toBe(0);
    expect(b17.subfolders.recordings.totalSize).toBe(0);
    expect(b17.subfolders['edit-1st'].fileCount).toBe(0);
    expect(b17.subfolders['edit-2nd'].fileCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// GET /api/relay/versions — integration tests
// ---------------------------------------------------------------------------

describe('GET /api/relay/versions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns versions list from edit-2nd directory', async () => {
    mockReaddir.mockResolvedValueOnce(['b17-final-v1.mp4', 'b17-final-v2.mp4']);
    mockStat
      .mockResolvedValueOnce({ isFile: () => true, size: 5000000, mtime: new Date('2026-03-20T10:00:00Z') })
      .mockResolvedValueOnce({ isFile: () => true, size: 6000000, mtime: new Date('2026-03-21T10:00:00Z') });

    const app = buildRelayApp();
    const res = await request(app).get('/api/relay/versions');
    expect(res.body.success).toBe(true);
    expect(res.body.versions).toHaveLength(2);
    expect(res.body.versions[0].filename).toBe('b17-final-v2.mp4');
    expect(res.body.versions[0].size).toBe(6000000);
    expect(res.body.versions[1].filename).toBe('b17-final-v1.mp4');
  });

  it('returns empty array when edit-2nd does not exist', async () => {
    mockReaddir.mockRejectedValueOnce(new Error('ENOENT'));

    const app = buildRelayApp();
    const res = await request(app).get('/api/relay/versions');
    expect(res.body.success).toBe(true);
    expect(res.body.versions).toEqual([]);
  });

  it('filters out hidden files', async () => {
    mockReaddir.mockResolvedValueOnce(['.DS_Store', '._metadata', 'b17-final-v1.mp4']);
    mockStat.mockResolvedValueOnce({ isFile: () => true, size: 5000000, mtime: new Date('2026-03-20') });

    const app = buildRelayApp();
    const res = await request(app).get('/api/relay/versions');
    expect(res.body.success).toBe(true);
    expect(res.body.versions).toHaveLength(1);
    expect(res.body.versions[0].filename).toBe('b17-final-v1.mp4');
  });

  it('returns error when relay not configured', async () => {
    const app = buildRelayApp({ relayEnabled: false });
    const res = await request(app).get('/api/relay/versions');
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/not enabled/i);
  });

  it('sorts versions by modified date (newest first)', async () => {
    mockReaddir.mockResolvedValueOnce(['old.mp4', 'mid.mp4', 'new.mp4']);
    mockStat
      .mockResolvedValueOnce({ isFile: () => true, size: 1000, mtime: new Date('2026-03-18') })
      .mockResolvedValueOnce({ isFile: () => true, size: 2000, mtime: new Date('2026-03-19') })
      .mockResolvedValueOnce({ isFile: () => true, size: 3000, mtime: new Date('2026-03-21') });

    const app = buildRelayApp();
    const res = await request(app).get('/api/relay/versions');
    expect(res.body.versions[0].filename).toBe('new.mp4');
    expect(res.body.versions[1].filename).toBe('mid.mp4');
    expect(res.body.versions[2].filename).toBe('old.mp4');
  });
});

// ---------------------------------------------------------------------------
// POST /api/relay/promote — integration tests
// ---------------------------------------------------------------------------

describe('POST /api/relay/promote', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('promotes file from edit-2nd to final with correct paths', async () => {
    mockPathExists.mockResolvedValueOnce(true);

    const app = buildRelayApp();
    const res = await request(app)
      .post('/api/relay/promote')
      .send({ filename: 'b17-final-v2.mp4' });
    expect(res.body.success).toBe(true);
    expect(res.body.promoted).toBe('b17-final-v2.mp4');
    // Verify ensureDir creates the final/ directory
    const ensureDirArg = mockEnsureDir.mock.calls[0][0] as string;
    expect(ensureDirArg).toContain('b17-test');
    expect(ensureDirArg).toMatch(/final$/);
    // Verify copy uses correct source (edit-2nd) and dest (final)
    expect(mockCopy).toHaveBeenCalled();
    const copySource = mockCopy.mock.calls[0][0] as string;
    const copyDest = mockCopy.mock.calls[0][1] as string;
    expect(copySource).toContain('edit-2nd');
    expect(copySource).toContain('b17-final-v2.mp4');
    expect(copyDest).toContain('final');
    expect(copyDest).toContain('b17-final-v2.mp4');
  });

  it('returns error when filename missing', async () => {
    const app = buildRelayApp();
    const res = await request(app)
      .post('/api/relay/promote')
      .send({});
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/filename is required/i);
  });

  it('returns error when filename contains path traversal (..)', async () => {
    const app = buildRelayApp();
    const res = await request(app)
      .post('/api/relay/promote')
      .send({ filename: '../etc/passwd' });
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/invalid filename/i);
  });

  it('returns error when filename contains slash', async () => {
    const app = buildRelayApp();
    const res = await request(app)
      .post('/api/relay/promote')
      .send({ filename: 'sub/file.mp4' });
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/invalid filename/i);
  });

  it('returns error when file does not exist', async () => {
    mockPathExists.mockResolvedValueOnce(false);

    const app = buildRelayApp();
    const res = await request(app)
      .post('/api/relay/promote')
      .send({ filename: 'nonexistent.mp4' });
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/file not found/i);
  });

  it('returns error when relay not configured', async () => {
    const app = buildRelayApp({ relayEnabled: false });
    const res = await request(app)
      .post('/api/relay/promote')
      .send({ filename: 'test.mp4' });
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/not enabled/i);
  });
});

// ---------------------------------------------------------------------------
// GET /api/relay/activity — activity ring buffer tests
// ---------------------------------------------------------------------------

describe('GET /api/relay/activity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearActivityLog();
  });

  it('returns empty events array initially', async () => {
    const app = buildRelayApp();
    const res = await request(app).get('/api/relay/activity');
    expect(res.body.success).toBe(true);
    expect(res.body.events).toEqual([]);
  });

  it('returns activity logged after successful push', async () => {
    mockExecFile.mockReturnValue({ stdout: 'sent files' });
    const app = buildRelayApp();
    await request(app).post('/api/relay/push').send({ subfolder: 'recordings' });

    const res = await request(app).get('/api/relay/activity');
    expect(res.body.success).toBe(true);
    expect(res.body.events).toHaveLength(1);
    expect(res.body.events[0].action).toBe('push');
    expect(res.body.events[0].subfolder).toBe('recordings');
    expect(res.body.events[0].projectCode).toBe('b17-test');
    expect(res.body.events[0].description).toContain('Pushed recordings to relay');
    expect(res.body.events[0].id).toBeDefined();
    expect(res.body.events[0].timestamp).toBeDefined();
  });

  it('returns activity logged after successful collect', async () => {
    mockExecFile.mockReturnValue({ stdout: 'received files' });
    const app = buildRelayApp();
    await request(app).post('/api/relay/collect').send({ subfolder: 'edit-1st' });

    const res = await request(app).get('/api/relay/activity');
    expect(res.body.success).toBe(true);
    expect(res.body.events).toHaveLength(1);
    expect(res.body.events[0].action).toBe('collect');
    expect(res.body.events[0].subfolder).toBe('edit-1st');
    expect(res.body.events[0].description).toContain('Collected edit-1st from relay');
  });

  it('returns activity logged after successful promote', async () => {
    mockPathExists.mockResolvedValueOnce(true);
    const app = buildRelayApp();
    await request(app).post('/api/relay/promote').send({ filename: 'b17-final-v2.mp4' });

    const res = await request(app).get('/api/relay/activity');
    expect(res.body.success).toBe(true);
    expect(res.body.events).toHaveLength(1);
    expect(res.body.events[0].action).toBe('promote');
    expect(res.body.events[0].subfolder).toBe('edit-2nd');
    expect(res.body.events[0].description).toContain('Promoted b17-final-v2.mp4 to final');
  });

  it('filters by projectCode query param', async () => {
    // Log events for two different projects
    logRelayActivity({
      projectCode: 'b17-test',
      subfolder: 'recordings',
      action: 'push',
      description: 'Pushed recordings to relay',
      timestamp: new Date().toISOString(),
    });
    logRelayActivity({
      projectCode: 'c32-bmad',
      subfolder: 'edit-1st',
      action: 'collect',
      description: 'Collected edit-1st from relay',
      timestamp: new Date().toISOString(),
    });

    const app = buildRelayApp();

    // Filter for b17-test only
    const res = await request(app).get('/api/relay/activity?projectCode=b17-test');
    expect(res.body.success).toBe(true);
    expect(res.body.events).toHaveLength(1);
    expect(res.body.events[0].projectCode).toBe('b17-test');

    // Without filter — returns all
    const resAll = await request(app).get('/api/relay/activity');
    expect(resAll.body.events).toHaveLength(2);
  });

  it('ring buffer overflow — caps at 50 events', () => {
    // Log 55 events
    for (let i = 0; i < 55; i++) {
      logRelayActivity({
        projectCode: `proj-${i}`,
        subfolder: 'recordings',
        action: 'push',
        description: `Event ${i}`,
        timestamp: new Date().toISOString(),
      });
    }

    // Verify via the endpoint
    const app = buildRelayApp();
    return request(app).get('/api/relay/activity').then((res) => {
      expect(res.body.success).toBe(true);
      expect(res.body.events).toHaveLength(50);
      // Most recent event should be first (unshift)
      expect(res.body.events[0].description).toBe('Event 54');
      // Oldest kept event should be event 5 (events 0-4 were pushed out)
      expect(res.body.events[49].description).toBe('Event 5');
    });
  });
});

// B044: git-sync tests removed — endpoint replaced by POST /api/sync/pull (see sync.test.ts)

// ---------------------------------------------------------------------------
// GET /api/relay/files — per-file detail for subfolders
// ---------------------------------------------------------------------------

describe('GET /api/relay/files', () => {
  const fixedDate = new Date('2026-03-22T14:10:00Z');

  beforeEach(() => {
    mockReaddir.mockReset();
    mockStat.mockReset();
  });

  it('returns recordings with correct chapter extraction', async () => {
    mockReaddir.mockResolvedValueOnce(['01-1-intro.mov', '01-2-outro.mov', '02-1-setup.mov']);
    mockStat.mockImplementation(async () => ({
      isFile: () => true,
      isDirectory: () => false,
      size: 27800000,
      mtime: fixedDate,
    }));

    const app = buildRelayApp();
    const res = await request(app).get('/api/relay/files?subfolder=recordings');

    expect(res.body.success).toBe(true);
    expect(res.body.subfolder).toBe('recordings');
    expect(res.body.files).toHaveLength(3);
    expect(res.body.files[0]).toMatchObject({
      filename: '01-1-intro.mov',
      chapter: '01',
      size: 27800000,
    });
    expect(res.body.files[1]).toMatchObject({ filename: '01-2-outro.mov', chapter: '01' });
    expect(res.body.files[2]).toMatchObject({ filename: '02-1-setup.mov', chapter: '02' });
  });

  it('filters out hidden files (.DS_Store)', async () => {
    mockReaddir.mockResolvedValueOnce(['.DS_Store', '01-1-intro.mov', '.hidden-file']);
    mockStat.mockImplementation(async () => ({
      isFile: () => true,
      isDirectory: () => false,
      size: 1000,
      mtime: fixedDate,
    }));

    const app = buildRelayApp();
    const res = await request(app).get('/api/relay/files?subfolder=recordings');

    expect(res.body.success).toBe(true);
    expect(res.body.files).toHaveLength(1);
    expect(res.body.files[0].filename).toBe('01-1-intro.mov');
  });

  it('returns empty array for empty directory', async () => {
    mockReaddir.mockResolvedValueOnce([]);

    const app = buildRelayApp();
    const res = await request(app).get('/api/relay/files?subfolder=recordings');

    expect(res.body.success).toBe(true);
    expect(res.body.files).toEqual([]);
  });

  it('returns empty array for non-existent directory (not error)', async () => {
    mockReaddir.mockRejectedValueOnce(new Error('ENOENT: no such file or directory'));

    const app = buildRelayApp();
    const res = await request(app).get('/api/relay/files?subfolder=recordings');

    expect(res.body.success).toBe(true);
    expect(res.body.files).toEqual([]);
  });

  it('returns error for invalid subfolder', async () => {
    const app = buildRelayApp();
    const res = await request(app).get('/api/relay/files?subfolder=../etc');

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Invalid subfolder');
  });

  it('reads from relay dir when source=relay', async () => {
    mockReaddir.mockResolvedValueOnce(['01-1-intro.mov']);
    mockStat.mockImplementation(async () => ({
      isFile: () => true,
      isDirectory: () => false,
      size: 5000,
      mtime: fixedDate,
    }));

    const app = buildRelayApp();
    const res = await request(app).get('/api/relay/files?subfolder=recordings&source=relay');

    expect(res.body.success).toBe(true);
    expect(res.body.files).toHaveLength(1);
    // Verify readdir was called with relay path (contains relay dir)
    const readdirPath = mockReaddir.mock.calls[0][0] as string;
    expect(readdirPath).toContain('/Users/test/relay/flihub-appydave/b17-test/recordings');
  });

  it('returns error when relay not configured', async () => {
    const app = buildRelayApp({ relayEnabled: false });
    const res = await request(app).get('/api/relay/files?subfolder=recordings');

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('not enabled');
  });

  it('sorts files by chapter then filename', async () => {
    mockReaddir.mockResolvedValueOnce([
      '02-1-setup.mov',
      '01-2-outro.mov',
      '01-1-intro.mov',
      'random-file.mov',
    ]);
    mockStat.mockImplementation(async () => ({
      isFile: () => true,
      isDirectory: () => false,
      size: 1000,
      mtime: fixedDate,
    }));

    const app = buildRelayApp();
    const res = await request(app).get('/api/relay/files?subfolder=recordings');

    expect(res.body.success).toBe(true);
    const filenames = res.body.files.map((f: { filename: string }) => f.filename);
    // "00" chapter (random-file.mov) first, then "01" chapter files, then "02"
    expect(filenames).toEqual([
      'random-file.mov',
      '01-1-intro.mov',
      '01-2-outro.mov',
      '02-1-setup.mov',
    ]);
    // Verify chapter fallback to "00" for non-matching filenames
    expect(res.body.files[0].chapter).toBe('00');
  });
});

// ---------------------------------------------------------------------------
// deriveSyncStatus — unit tests (enhanced-browse)
// ---------------------------------------------------------------------------

describe('deriveSyncStatus', () => {
  it('returns synced when relay and local counts match', () => {
    expect(deriveSyncStatus(3, 3, true)).toBe('synced');
  });

  it('returns synced when both are zero and local exists', () => {
    expect(deriveSyncStatus(0, 0, true)).toBe('synced');
  });

  it('returns synced when both are zero and local does not exist', () => {
    expect(deriveSyncStatus(0, 0, false)).toBe('synced');
  });

  it('returns behind when relay has more files than local', () => {
    expect(deriveSyncStatus(5, 2, true)).toBe('behind');
  });

  it('returns ahead when local has more files than relay', () => {
    expect(deriveSyncStatus(2, 5, true)).toBe('ahead');
  });

  it('returns relay-only when local does not exist but relay has files', () => {
    expect(deriveSyncStatus(3, 0, false)).toBe('relay-only');
  });

  it('returns local-only when local has files but relay has zero', () => {
    expect(deriveSyncStatus(0, 4, true)).toBe('local-only');
  });
});

// ---------------------------------------------------------------------------
// GET /api/relay/browse?detailed=true — enhanced browse tests
// ---------------------------------------------------------------------------

describe('GET /api/relay/browse?detailed=true', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns backward-compatible response when detailed is not set', async () => {
    mockReaddir.mockImplementation(async (_dir: string, opts?: { withFileTypes?: boolean }) => {
      if (opts?.withFileTypes) {
        return [{ name: 'b17-test', isDirectory: () => true }];
      }
      return [];
    });
    mockStat.mockResolvedValue({ isFile: () => true, size: 0 });

    const app = buildRelayApp();
    const res = await request(app).get('/api/relay/browse');
    expect(res.body.success).toBe(true);
    expect(res.body.projects).toHaveLength(1);
    const project = res.body.projects[0];
    // Should NOT have localSubfolders or syncStatus
    expect(project.localSubfolders).toBeUndefined();
    expect(project.syncStatus).toBeUndefined();
    expect(project.projectCode).toBe('b17-test');
  });

  it('returns backward-compatible response when detailed=false', async () => {
    mockReaddir.mockImplementation(async (_dir: string, opts?: { withFileTypes?: boolean }) => {
      if (opts?.withFileTypes) {
        return [{ name: 'b17-test', isDirectory: () => true }];
      }
      return [];
    });
    mockStat.mockResolvedValue({ isFile: () => true, size: 0 });

    const app = buildRelayApp();
    const res = await request(app).get('/api/relay/browse?detailed=false');
    expect(res.body.success).toBe(true);
    const project = res.body.projects[0];
    expect(project.localSubfolders).toBeUndefined();
    expect(project.syncStatus).toBeUndefined();
  });

  it('returns localSubfolders and syncStatus when detailed=true', async () => {
    // Relay dir readdir: one project with files in recordings
    mockReaddir.mockImplementation(async (dir: string, opts?: { withFileTypes?: boolean }) => {
      if (opts?.withFileTypes) {
        return [{ name: 'b17-test', isDirectory: () => true }];
      }
      // Relay recordings: 2 files
      if (dir.includes('relay') && dir.includes('recordings')) return ['01-1-intro.mov', '01-2-outro.mov'];
      // Relay edit-1st: 0 files
      if (dir.includes('relay') && dir.includes('edit-1st')) return [];
      // Relay edit-2nd: 1 file
      if (dir.includes('relay') && dir.includes('edit-2nd')) return ['b17-final-v1.mp4'];
      // Local recordings: 3 files (ahead)
      if (dir.includes('v-appydave') && dir.includes('recordings')) return ['01-1-intro.mov', '01-2-outro.mov', '02-1-setup.mov'];
      // Local edit-1st: 1 file
      if (dir.includes('v-appydave') && dir.includes('edit-1st')) return ['edit.mp4'];
      // Local edit-2nd: 1 file
      if (dir.includes('v-appydave') && dir.includes('edit-2nd')) return ['b17-final-v1.mp4'];
      return [];
    });
    mockStat.mockResolvedValue({ isFile: () => true, size: 1024 });

    const app = buildRelayApp({ projectsRootDirectory: '~/dev/video-projects/v-appydave' });
    const res = await request(app).get('/api/relay/browse?detailed=true');
    expect(res.body.success).toBe(true);
    expect(res.body.projects).toHaveLength(1);

    const project = res.body.projects[0];
    expect(project.projectCode).toBe('b17-test');

    // localSubfolders should be present
    expect(project.localSubfolders).toBeDefined();
    expect(project.localSubfolders.recordings.fileCount).toBe(3);
    expect(project.localSubfolders['edit-1st'].fileCount).toBe(1);
    expect(project.localSubfolders['edit-2nd'].fileCount).toBe(1);

    // syncStatus should reflect the comparison
    expect(project.syncStatus).toBeDefined();
    expect(project.syncStatus.recordings).toBe('ahead');  // local 3 > relay 2
    expect(project.syncStatus['edit-1st']).toBe('local-only');  // relay 0, local 1
    expect(project.syncStatus['edit-2nd']).toBe('synced');  // both 1
  });

  it('returns synced status when relay and local have same file counts', async () => {
    mockReaddir.mockImplementation(async (dir: string, opts?: { withFileTypes?: boolean }) => {
      if (opts?.withFileTypes) {
        return [{ name: 'b17-test', isDirectory: () => true }];
      }
      // Both relay and local have the same files
      if (dir.includes('recordings')) return ['01-1-intro.mov'];
      return [];
    });
    mockStat.mockResolvedValue({ isFile: () => true, size: 500 });

    const app = buildRelayApp({ projectsRootDirectory: '~/dev/video-projects/v-appydave' });
    const res = await request(app).get('/api/relay/browse?detailed=true');

    const project = res.body.projects[0];
    expect(project.syncStatus.recordings).toBe('synced');
  });

  it('falls back to basic response when projectsRootDirectory is not set', async () => {
    mockReaddir.mockImplementation(async (_dir: string, opts?: { withFileTypes?: boolean }) => {
      if (opts?.withFileTypes) {
        return [{ name: 'b17-test', isDirectory: () => true }];
      }
      return ['01-1-intro.mov'];
    });
    mockStat.mockResolvedValue({ isFile: () => true, size: 1024 });

    // No projectsRootDirectory configured
    const app = buildRelayApp({ projectsRootDirectory: undefined });
    const res = await request(app).get('/api/relay/browse?detailed=true');
    expect(res.body.success).toBe(true);
    const project = res.body.projects[0];
    // Without projectsRootDirectory, detailed mode can't scan local — falls back to basic
    expect(project.localSubfolders).toBeUndefined();
    expect(project.syncStatus).toBeUndefined();
  });

  it('handles local directory not existing (relay-only status)', async () => {
    mockReaddir.mockImplementation(async (dir: string, opts?: { withFileTypes?: boolean }) => {
      if (opts?.withFileTypes) {
        return [{ name: 'b17-test', isDirectory: () => true }];
      }
      // Relay has files
      if (dir.includes('relay') && dir.includes('recordings')) return ['01-1-intro.mov'];
      if (dir.includes('relay')) return [];
      // Local dirs don't exist
      throw new Error('ENOENT');
    });
    mockStat.mockResolvedValue({ isFile: () => true, size: 1024 });

    const app = buildRelayApp({ projectsRootDirectory: '~/dev/video-projects/v-appydave' });
    const res = await request(app).get('/api/relay/browse?detailed=true');

    const project = res.body.projects[0];
    expect(project.syncStatus.recordings).toBe('relay-only');
    expect(project.localSubfolders.recordings.fileCount).toBe(0);
  });

  it('scans multiple projects in parallel with detailed=true', async () => {
    mockReaddir.mockImplementation(async (dir: string, opts?: { withFileTypes?: boolean }) => {
      if (opts?.withFileTypes) {
        return [
          { name: 'b17-test', isDirectory: () => true },
          { name: 'c32-bmad', isDirectory: () => true },
        ];
      }
      if (dir.includes('b17-test') && dir.includes('recordings')) return ['01-1-intro.mov'];
      if (dir.includes('c32-bmad') && dir.includes('recordings')) return ['01-1-intro.mov', '02-1-setup.mov'];
      return [];
    });
    mockStat.mockResolvedValue({ isFile: () => true, size: 500 });

    const app = buildRelayApp({ projectsRootDirectory: '~/dev/video-projects/v-appydave' });
    const res = await request(app).get('/api/relay/browse?detailed=true');
    expect(res.body.success).toBe(true);
    expect(res.body.projects).toHaveLength(2);

    const b17 = res.body.projects.find((p: { projectCode: string }) => p.projectCode === 'b17-test');
    const c32 = res.body.projects.find((p: { projectCode: string }) => p.projectCode === 'c32-bmad');
    expect(b17.localSubfolders).toBeDefined();
    expect(c32.localSubfolders).toBeDefined();
    expect(b17.syncStatus).toBeDefined();
    expect(c32.syncStatus).toBeDefined();
  });
});
