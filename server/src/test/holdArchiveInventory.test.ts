// WU1: Route-level + utility tests for GET /archive-inventory.
//
// Uses real temp directories because the aggregation utilities (holdUtils,
// diskUtils) call node:fs directly. We mount the hold router on an Express
// app under /api/projects so the endpoint URL matches production.
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import os from 'os';
import * as nodeFs from 'fs';
import nodePath from 'path';

// pathUtils is the same no-op shim used across other route tests — mirror here
// so expandPath doesn't try to resolve ~ against a real home.
vi.mock('../utils/pathUtils.js', () => ({
  expandPath: (p: string) => p,
  queryString: (s: unknown) => (typeof s === 'string' ? s : String(s ?? '')),
}));

// projects.js exports disk-cache helpers that other hold routes call. For
// archive-inventory they aren't invoked, but the import chain needs them.
vi.mock('../routes/projects.js', () => ({
  updateDiskCacheHoldData: vi.fn(),
  invalidateDiskCacheEntry: vi.fn(),
}));

import { createHoldRoutes } from '../routes/hold.js';
import * as archiveInventory from '../utils/archiveInventory.js';
import type { Config, ArchiveInventoryResponse, ArchiveRow } from '../../../shared/types.js';

describe('GET /api/projects/archive-inventory', () => {
  let tmpRoot: string;
  let projectsRoot: string;
  let holdingRoot: string;

  beforeEach(() => {
    tmpRoot = nodeFs.mkdtempSync(nodePath.join(os.tmpdir(), 'archive-inv-'));
    projectsRoot = nodePath.join(tmpRoot, 'projects');
    holdingRoot = nodePath.join(tmpRoot, 'holding');
    nodeFs.mkdirSync(projectsRoot, { recursive: true });
    nodeFs.mkdirSync(holdingRoot, { recursive: true });
  });

  afterEach(() => {
    try {
      nodeFs.rmSync(tmpRoot, { recursive: true, force: true });
    } catch {
      // ignore
    }
    vi.restoreAllMocks();
  });

  function makeProjectRecording(code: string, fileBytes: number) {
    const dir = nodePath.join(projectsRoot, code, 'recordings');
    nodeFs.mkdirSync(dir, { recursive: true });
    nodeFs.writeFileSync(nodePath.join(dir, 'a.mov'), Buffer.alloc(fileBytes, 1));
  }

  function makeHolding(code: string, fileBytes: number) {
    const dir = nodePath.join(holdingRoot, code);
    nodeFs.mkdirSync(dir, { recursive: true });
    nodeFs.writeFileSync(nodePath.join(dir, 'a.mov'), Buffer.alloc(fileBytes, 1));
  }

  function createApp(configOverrides: Partial<Config> = {}) {
    const config: Config = {
      watchDirectory: '/tmp/watch',
      projectDirectory: projectsRoot,
      projectsRootDirectory: projectsRoot,
      holdingPath: holdingRoot,
      fileExtensions: ['.mov', '.mp4'],
      availableTags: [],
      commonNames: [],
      imageSourceDirectory: '/tmp/downloads',
      ...configOverrides,
    };
    const router = createHoldRoutes(() => config);
    const app = express();
    app.use(express.json());
    app.use('/api/projects', router);
    return app;
  }

  it('returns empty rows when projects and holding directories are empty', async () => {
    const app = createApp();

    const res = await request(app).get('/api/projects/archive-inventory');

    expect(res.status).toBe(200);
    const body: ArchiveInventoryResponse = res.body;
    expect(body.rows).toEqual([]);
  });

  it('returns 400 when projectsRootDirectory is not configured', async () => {
    const app = createApp({ projectsRootDirectory: undefined });

    const res = await request(app).get('/api/projects/archive-inventory');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('derives all three states (local, held-local, held-only) with correct shape', async () => {
    makeProjectRecording('proj-local', 1024);

    makeProjectRecording('proj-both', 2048);
    makeHolding('proj-both', 2048);

    makeHolding('proj-held', 4096);

    const app = createApp();

    const res = await request(app).get('/api/projects/archive-inventory');
    expect(res.status).toBe(200);
    const body: ArchiveInventoryResponse = res.body;
    expect(body.rows).toHaveLength(3);

    const byCode = new Map<string, ArchiveRow>(body.rows.map((r) => [r.projectCode, r]));

    const local = byCode.get('proj-local')!;
    expect(local.state).toBe('local');
    expect(local.held).toBe(false);
    expect(local.localBytes).toBeGreaterThan(0);
    expect(local.heldBytes).toBe(0);
    expect(local.lastTouched).toBeNull();

    const both = byCode.get('proj-both')!;
    expect(both.state).toBe('held-local');
    expect(both.held).toBe(true);

    const heldOnly = byCode.get('proj-held')!;
    expect(heldOnly.state).toBe('held-only');
    expect(heldOnly.held).toBe(true);
    expect(heldOnly.localBytes).toBe(0);
    expect(heldOnly.heldBytes).toBeGreaterThan(0);

    for (const row of body.rows) {
      expect(typeof row.projectCode).toBe('string');
      expect(typeof row.projectPath).toBe('string');
      expect(typeof row.localBytes).toBe('number');
      expect(typeof row.heldBytes).toBe('number');
      expect(typeof row.held).toBe('boolean');
      expect(['local', 'held-local', 'held-only']).toContain(row.state);
      expect(row.lastTouched === null || typeof row.lastTouched === 'string').toBe(true);
    }
  });

  it('ignores hidden, dash-prefixed, and invalid-named directories under both roots', async () => {
    makeProjectRecording('real-project', 512);
    // Invalid siblings under projectsRoot
    nodeFs.mkdirSync(nodePath.join(projectsRoot, '.hidden'), { recursive: true });
    nodeFs.mkdirSync(nodePath.join(projectsRoot, '-chapters'), { recursive: true });
    nodeFs.mkdirSync(nodePath.join(projectsRoot, 'archived'), { recursive: true });
    // Invalid siblings under holdingRoot (phantom T7 folders)
    nodeFs.mkdirSync(nodePath.join(holdingRoot, '.DS_Store-dir'), { recursive: true });
    nodeFs.mkdirSync(nodePath.join(holdingRoot, '-rsync-tmp'), { recursive: true });
    nodeFs.mkdirSync(nodePath.join(holdingRoot, 'backup 2024'), { recursive: true }); // space invalid
    nodeFs.mkdirSync(nodePath.join(holdingRoot, 'archived'), { recursive: true });

    const app = createApp();

    const res = await request(app).get('/api/projects/archive-inventory');
    expect(res.status).toBe(200);
    const body: ArchiveInventoryResponse = res.body;
    expect(body.rows.map((r) => r.projectCode)).toEqual(['real-project']);
  });

  // -------------------------------------------------------------------------
  // Patch 8 — Test hardening
  // -------------------------------------------------------------------------

  it('Patch 8: reports asymmetric local/held byte counts exactly', async () => {
    // local=1024, held=8192 — must flow through to the row values untouched.
    makeProjectRecording('proj-asym', 1024);
    makeHolding('proj-asym', 8192);

    const app = createApp();
    const res = await request(app).get('/api/projects/archive-inventory');
    expect(res.status).toBe(200);
    const body: ArchiveInventoryResponse = res.body;
    const row = body.rows.find((r) => r.projectCode === 'proj-asym')!;
    expect(row).toBeDefined();
    expect(row.state).toBe('held-local');
    expect(row.localBytes).toBe(1024);
    expect(row.heldBytes).toBe(8192);
  });

  it('Patch 8: subtracts relay subtrees from localBytes', async () => {
    // Project recordings = 2048 bytes
    const code = 'proj-with-relay';
    makeProjectRecording(code, 2048);

    // Set up a relay root and populate the project's relay recordings subtree
    const relayRoot = nodePath.join(tmpRoot, 'relay');
    const relayProjectDir = nodePath.join(relayRoot, code, 'recordings');
    nodeFs.mkdirSync(relayProjectDir, { recursive: true });
    const relayBytes = 512;
    nodeFs.writeFileSync(nodePath.join(relayProjectDir, 'r.mov'), Buffer.alloc(relayBytes, 1));

    const app = createApp({ relayEnabled: true, relayDirectory: relayRoot });
    const res = await request(app).get('/api/projects/archive-inventory');
    expect(res.status).toBe(200);
    const body: ArchiveInventoryResponse = res.body;
    const row = body.rows.find((r) => r.projectCode === code)!;
    expect(row).toBeDefined();
    // localBytes should reflect the project-tree-only bytes, with rRec stripped.
    // Project tree has 2048 in recordings; relay rRec=512 is rolled into
    // calculateProjectDiskSize.total then subtracted — so localBytes === 2048.
    expect(row.localBytes).toBe(2048);
  });

  it('Patch 8: partial failure — degraded row isolated, other rows healthy', async () => {
    makeProjectRecording('proj-healthy', 1024);
    makeProjectRecording('proj-broken', 2048);

    // Force buildArchiveRow for 'proj-broken' to throw by stubbing
    // calculateProjectDiskSize to reject for that path. Using the utility's
    // imported binding — archiveInventory.ts's calculateProjectDiskSize
    // reference is what gets exercised.
    const real = await import('../utils/diskUtils.js');
    const spy = vi.spyOn(real, 'calculateProjectDiskSize').mockImplementation(async (projectDir) => {
      if (projectDir.endsWith('proj-broken')) {
        throw new Error('synthetic disk failure');
      }
      // Fall through to real behaviour for the healthy project
      return {
        rec: 1024, trash: 0, other: 0,
        rRec: 0, r1st: 0, r2nd: 0, total: 1024,
        calculatedAt: new Date().toISOString(),
        detail: { other: {}, recTopFiles: [], trashFiles: [] },
      };
    });
    // Silence the expected console.warn from Patch 4's degraded path
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const app = createApp();
    const res = await request(app).get('/api/projects/archive-inventory');

    expect(res.status).toBe(200);
    const body: ArchiveInventoryResponse = res.body;
    const healthy = body.rows.find((r) => r.projectCode === 'proj-healthy')!;
    const broken = body.rows.find((r) => r.projectCode === 'proj-broken')!;

    expect(healthy).toBeDefined();
    expect(healthy.degraded).toBeFalsy();
    expect(healthy.localBytes).toBeGreaterThan(0);

    expect(broken).toBeDefined();
    expect(broken.degraded).toBe(true);
    expect(typeof broken.error).toBe('string');
    expect(broken.error).toContain('synthetic disk failure');
    expect(broken.localBytes).toBe(0);
    expect(broken.heldBytes).toBe(0);

    expect(warnSpy).toHaveBeenCalled();
    spy.mockRestore();
    warnSpy.mockRestore();
  });

  it('Patch 8: lastTouched is populated for held projects via fs.stat mtime fallback', async () => {
    // getHoldStatus does not populate heldAt in this codebase, so the row's
    // lastTouched must come from the fs.stat(holdingPath).mtime fallback.
    makeHolding('proj-stat-mtime', 4096);

    const app = createApp();
    const res = await request(app).get('/api/projects/archive-inventory');
    expect(res.status).toBe(200);
    const body: ArchiveInventoryResponse = res.body;
    const row = body.rows.find((r) => r.projectCode === 'proj-stat-mtime')!;
    expect(row).toBeDefined();
    expect(row.state).toBe('held-only');
    expect(typeof row.lastTouched).toBe('string');
    // Must parse as a valid ISO timestamp
    const parsed = new Date(row.lastTouched as string);
    expect(Number.isNaN(parsed.getTime())).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Unit tests for pure utility exports (Patch 2, Patch 3)
// ---------------------------------------------------------------------------
describe('archiveInventory utilities', () => {
  it('isValidProjectDirName rejects dotfiles, dash-prefix, archived, and garbage names', () => {
    expect(archiveInventory.isValidProjectDirName('07-bmad-relay')).toBe(true);
    expect(archiveInventory.isValidProjectDirName('jfli-core')).toBe(true);
    expect(archiveInventory.isValidProjectDirName('.DS_Store')).toBe(false);
    expect(archiveInventory.isValidProjectDirName('-chapters')).toBe(false);
    expect(archiveInventory.isValidProjectDirName('archived')).toBe(false);
    expect(archiveInventory.isValidProjectDirName('backup 2024')).toBe(false);
    expect(archiveInventory.isValidProjectDirName('')).toBe(false);
  });

  it('deriveArchiveState follows the bytes-only truth table', () => {
    expect(archiveInventory.deriveArchiveState(0, 0)).toBe('local');
    expect(archiveInventory.deriveArchiveState(1024, 0)).toBe('local');
    expect(archiveInventory.deriveArchiveState(1024, 1024)).toBe('held-local');
    expect(archiveInventory.deriveArchiveState(0, 1024)).toBe('held-only');
  });
});
