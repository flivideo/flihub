// storage-panel WU1: Route + utility tests for storage.ts + storageTree.ts.
//
// Uses real temp directories for fs fixtures — mirrors the approach in
// holdArchiveInventory.test.ts. rsync is invoked via child_process, so we
// mock spawn so tests don't depend on rsync behavior; we simulate it by
// copying the files ourselves and then asserting counts.
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import os from 'os';
import * as nodeFs from 'fs';
import nodePath from 'path';
import { EventEmitter } from 'events';

// No-op path shim so expandPath doesn't touch ~.
vi.mock('../utils/pathUtils.js', () => ({
  expandPath: (p: string) => p,
  queryString: (s: unknown) => (typeof s === 'string' ? s : String(s ?? '')),
}));

// Fake rsync: copy source tree to dest tree so verification counts match.
// We intercept child_process.spawn and, when the command is 'rsync', perform
// a recursive copy of the last positional arg pair we can detect.
vi.mock('child_process', async () => {
  const actual = await vi.importActual<typeof import('child_process')>('child_process');
  return {
    ...actual,
    spawn: (cmd: string, args: string[]) => {
      // Expected form: ['-a', ...excludes, src + '/', dest + '/']
      if (cmd === 'rsync') {
        const src = args[args.length - 2];
        const dest = args[args.length - 1];
        // Simulate async success via EventEmitter
        const emitter = new EventEmitter() as EventEmitter & {
          stdin: unknown;
          stdout: EventEmitter;
          stderr: EventEmitter;
        };
        emitter.stdout = new EventEmitter();
        emitter.stderr = new EventEmitter();
        setImmediate(() => {
          try {
            // Strip trailing slash
            const srcDir = src.replace(/\/$/, '');
            const destDir = dest.replace(/\/$/, '');
            copyRecursive(srcDir, destDir);
            emitter.emit('close', 0);
          } catch (err) {
            emitter.emit('error', err);
          }
        });
        return emitter as unknown as import('child_process').ChildProcess;
      }
      return actual.spawn(cmd, args);
    },
  };
});

function copyRecursive(src: string, dest: string) {
  if (!nodeFs.existsSync(src)) return;
  const stat = nodeFs.statSync(src);
  if (stat.isDirectory()) {
    nodeFs.mkdirSync(dest, { recursive: true });
    for (const e of nodeFs.readdirSync(src)) {
      // Mimic holdExcludeArgs
      if (e === '.DS_Store' || e.startsWith('._') || e === '-trash' || e === 's3-staging') continue;
      copyRecursive(nodePath.join(src, e), nodePath.join(dest, e));
    }
  } else {
    nodeFs.mkdirSync(nodePath.dirname(dest), { recursive: true });
    nodeFs.copyFileSync(src, dest);
  }
}

// Imports AFTER mocks
import { createStorageRoutes } from '../routes/storage.js';
import { getStorageTree, HEAVY_SUBFOLDERS } from '../utils/storageTree.js';
import { readStorageActivity } from '../utils/storageActivityLog.js';
import * as activityLog from '../utils/storageActivityLog.js';
import type { Config, StorageMutationResponse, StorageTreeResponse } from '../../../shared/types.js';

describe('storage-panel WU1', () => {
  let tmpRoot: string;
  let projectsRoot: string;
  let holdingRoot: string;
  let publishedRoot: string;
  let t7Mount: string;

  beforeEach(() => {
    tmpRoot = nodeFs.mkdtempSync(nodePath.join(os.tmpdir(), 'storage-panel-'));
    projectsRoot = nodePath.join(tmpRoot, 'projects');
    // Simulate T7 layout: <tmp>/T7/youtube-HOLDING/<brand>, <tmp>/T7/youtube-PUBLISHED/<brand>
    t7Mount = nodePath.join(tmpRoot, 'T7');
    holdingRoot = nodePath.join(t7Mount, 'youtube-HOLDING', 'appydave');
    publishedRoot = nodePath.join(t7Mount, 'youtube-PUBLISHED', 'appydave');
    nodeFs.mkdirSync(projectsRoot, { recursive: true });
    nodeFs.mkdirSync(holdingRoot, { recursive: true });
    nodeFs.mkdirSync(publishedRoot, { recursive: true });
  });

  afterEach(() => {
    try {
      nodeFs.rmSync(tmpRoot, { recursive: true, force: true });
    } catch {
      // ignore
    }
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------
  // Fixture helpers
  // ---------------------------------------------------------------------
  function makeActiveProject(code: string) {
    const base = nodePath.join(projectsRoot, code);
    nodeFs.mkdirSync(nodePath.join(base, 'recordings'), { recursive: true });
    nodeFs.writeFileSync(nodePath.join(base, 'recordings', 'a.mov'), Buffer.alloc(1024, 1));
    nodeFs.writeFileSync(nodePath.join(base, 'recordings', 'b.mov'), Buffer.alloc(2048, 1));
    nodeFs.mkdirSync(nodePath.join(base, 'final'), { recursive: true });
    nodeFs.writeFileSync(nodePath.join(base, 'final', 'final.mov'), Buffer.alloc(512, 1));
    nodeFs.mkdirSync(nodePath.join(base, 'recording-shadows'), { recursive: true });
    nodeFs.writeFileSync(nodePath.join(base, 'recording-shadows', 's.mp4'), Buffer.alloc(256, 1));
    // Light
    nodeFs.mkdirSync(nodePath.join(base, 'assets'), { recursive: true });
    nodeFs.writeFileSync(nodePath.join(base, 'assets', 'img.png'), Buffer.alloc(64, 1));
    nodeFs.mkdirSync(nodePath.join(base, 'inbox'), { recursive: true });
    nodeFs.writeFileSync(nodePath.join(base, 'inbox', 'n.md'), Buffer.from('note'));
    return base;
  }

  function makeHeldProject(code: string) {
    // Local: folder shell with only light files; heavy absent.
    const local = nodePath.join(projectsRoot, code);
    nodeFs.mkdirSync(nodePath.join(local, 'assets'), { recursive: true });
    nodeFs.writeFileSync(nodePath.join(local, 'assets', 'img.png'), Buffer.alloc(64, 1));
    // Holding: heavy subfolders present
    const held = nodePath.join(holdingRoot, code);
    nodeFs.mkdirSync(nodePath.join(held, 'recordings'), { recursive: true });
    nodeFs.writeFileSync(nodePath.join(held, 'recordings', 'a.mov'), Buffer.alloc(1024, 1));
    nodeFs.mkdirSync(nodePath.join(held, 'final'), { recursive: true });
    nodeFs.writeFileSync(nodePath.join(held, 'final', 'f.mov'), Buffer.alloc(256, 1));
    return local;
  }

  function makeArchivedProject(code: string) {
    // No local — only published.
    const pub = nodePath.join(publishedRoot, code);
    nodeFs.mkdirSync(nodePath.join(pub, 'recordings'), { recursive: true });
    nodeFs.writeFileSync(nodePath.join(pub, 'recordings', 'a.mov'), Buffer.alloc(1024, 1));
    nodeFs.mkdirSync(nodePath.join(pub, 'assets'), { recursive: true });
    nodeFs.writeFileSync(nodePath.join(pub, 'assets', 'img.png'), Buffer.alloc(64, 1));
    return pub;
  }

  function makeRelayNonEmpty(relayRoot: string, code: string) {
    const p = nodePath.join(relayRoot, code, 'recordings');
    nodeFs.mkdirSync(p, { recursive: true });
    nodeFs.writeFileSync(nodePath.join(p, 'r.mov'), Buffer.alloc(128, 1));
  }

  function createApp(overrides: Partial<Config> = {}): express.Express & { __logPath: string } {
    const config: Config = {
      watchDirectory: '/tmp/watch',
      projectDirectory: projectsRoot,
      projectsRootDirectory: projectsRoot,
      holdingPath: holdingRoot,
      publishedPath: publishedRoot,
      fileExtensions: ['.mov', '.mp4'],
      availableTags: [],
      commonNames: [],
      imageSourceDirectory: '/tmp/downloads',
      ...overrides,
    };
    // WU5: route tests inject a tmp log path so mutation tests don't touch
    // ~/.flihub on the host machine.
    const logPath = nodePath.join(tmpRoot, 'storage-activity.jsonl');
    const router = createStorageRoutes(() => config, () => logPath);
    const app = express() as express.Express & { __logPath: string };
    app.use(express.json());
    app.use('/api/projects', router);
    app.__logPath = logPath;
    return app;
  }

  // ---------------------------------------------------------------------
  // getStorageTree util
  // ---------------------------------------------------------------------
  describe('getStorageTree utility', () => {
    it('classifies heavy and light subfolders correctly for an active project', async () => {
      makeActiveProject('proj-active');
      const tree = await getStorageTree('proj-active', {
        projectsRoot,
        holdingRoot,
        publishedRoot,
        relayRoot: null,
      });
      expect(tree.state).toBe('active');
      const names = tree.nodes.map((n) => n.name).sort();
      // Heavy + light should be present
      expect(names).toEqual(expect.arrayContaining(['recordings', 'final', 'recording-shadows', 'assets', 'inbox']));
      const heavyNames = tree.nodes.filter((n) => n.classification === 'heavy').map((n) => n.name).sort();
      expect(heavyNames).toEqual(['final', 'recording-shadows', 'recordings']);
      const lightNames = tree.nodes.filter((n) => n.classification === 'light').map((n) => n.name).sort();
      expect(lightNames).toEqual(expect.arrayContaining(['assets', 'inbox']));
      expect(tree.sizes.heavyTotal).toBeGreaterThan(0);
      expect(tree.sizes.lightTotal).toBeGreaterThan(0);
      expect(tree.sizes.heldTotal).toBe(0);
      expect(tree.sizes.archivedTotal).toBe(0);
    });

    it('derives held state when HOLDING has content and heavy subfolders absent from local', async () => {
      makeHeldProject('proj-held');
      const tree = await getStorageTree('proj-held', {
        projectsRoot,
        holdingRoot,
        publishedRoot,
        relayRoot: null,
      });
      expect(tree.state).toBe('held');
      expect(tree.sizes.heldTotal).toBeGreaterThan(0);
    });

    it('derives archived state when PUBLISHED exists and local does not', async () => {
      makeArchivedProject('proj-archived');
      const tree = await getStorageTree('proj-archived', {
        projectsRoot,
        holdingRoot,
        publishedRoot,
        relayRoot: null,
      });
      expect(tree.state).toBe('archived');
      expect(tree.sizes.archivedTotal).toBeGreaterThan(0);
    });

    it('flags degraded when both HOLDING and PUBLISHED have the same project', async () => {
      makeHeldProject('proj-dup');
      // Also plant in published
      const pub = nodePath.join(publishedRoot, 'proj-dup');
      nodeFs.mkdirSync(pub, { recursive: true });
      nodeFs.writeFileSync(nodePath.join(pub, 'a.mov'), Buffer.alloc(64, 1));
      const tree = await getStorageTree('proj-dup', {
        projectsRoot,
        holdingRoot,
        publishedRoot,
        relayRoot: null,
      });
      expect(tree.degraded).toBe(true);
      expect(tree.error).toBeTruthy();
    });

    it('HEAVY_SUBFOLDERS is the documented allowlist', () => {
      expect([...HEAVY_SUBFOLDERS]).toEqual(['recordings', 'recording-shadows', 'final']);
    });
  });

  // ---------------------------------------------------------------------
  // GET /storage-tree
  // ---------------------------------------------------------------------
  describe('GET /:code/storage-tree', () => {
    it('returns the full storage tree for an active project', async () => {
      makeActiveProject('a1');
      const app = createApp();
      const res = await request(app).get('/api/projects/a1/storage-tree');
      expect(res.status).toBe(200);
      const body = res.body as StorageTreeResponse;
      expect(body.state).toBe('active');
      expect(body.nodes.length).toBeGreaterThan(0);
      expect(body.paths.local).toContain('a1');
    });

    it('rejects invalid project code', async () => {
      const app = createApp();
      const res = await request(app).get('/api/projects/..%2Fx/storage-tree');
      expect(res.status).toBe(400);
    });

    it('returns 400 when projectsRootDirectory not configured', async () => {
      const app = createApp({ projectsRootDirectory: undefined });
      const res = await request(app).get('/api/projects/a1/storage-tree');
      expect(res.status).toBe(400);
    });
  });

  // ---------------------------------------------------------------------
  // POST /hold
  // ---------------------------------------------------------------------
  describe('POST /:code/hold', () => {
    it('happy path: evacuates heavy subfolders to HOLDING and deletes them locally', async () => {
      const localDir = makeActiveProject('a1');
      const app = createApp();
      const res = await request(app).post('/api/projects/a1/hold').send({});
      expect(res.status).toBe(200);
      const body = res.body as StorageMutationResponse;
      expect(body.success).toBe(true);
      expect(body.newState).toBe('held');
      // Heavy subfolders gone from local
      for (const sub of HEAVY_SUBFOLDERS) {
        expect(nodeFs.existsSync(nodePath.join(localDir, sub))).toBe(false);
      }
      // Light content still present
      expect(nodeFs.existsSync(nodePath.join(localDir, 'assets', 'img.png'))).toBe(true);
      // HOLDING has the heavy content
      expect(nodeFs.existsSync(nodePath.join(holdingRoot, 'a1', 'recordings', 'a.mov'))).toBe(true);
    });

    it('refuses when relay is non-empty', async () => {
      makeActiveProject('a1');
      const relayRoot = nodePath.join(tmpRoot, 'relay');
      makeRelayNonEmpty(relayRoot, 'a1');
      const app = createApp({ relayEnabled: true, relayDirectory: relayRoot });
      const res = await request(app).post('/api/projects/a1/hold').send({});
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/relay/i);
    });

    it('refuses when T7 is not mounted', async () => {
      makeActiveProject('a1');
      // Point holdingPath at a path whose volume parent does not exist
      const app = createApp({ holdingPath: '/this/does/not/exist/youtube-HOLDING/appydave' });
      const res = await request(app).post('/api/projects/a1/hold').send({});
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/not mounted/i);
    });

    it('refuses when project is not in active state (already held)', async () => {
      makeHeldProject('a1');
      const app = createApp();
      const res = await request(app).post('/api/projects/a1/hold').send({});
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.newState).toBe('held');
    });
  });

  // ---------------------------------------------------------------------
  // POST /restore-held
  // ---------------------------------------------------------------------
  describe('POST /:code/restore-held', () => {
    it('happy path: restores heavy subfolders from HOLDING to local', async () => {
      const localDir = makeHeldProject('a1');
      const app = createApp();
      const res = await request(app).post('/api/projects/a1/restore-held').send({});
      expect(res.status).toBe(200);
      const body = res.body as StorageMutationResponse;
      expect(body.success).toBe(true);
      expect(body.newState).toBe('active');
      expect(nodeFs.existsSync(nodePath.join(localDir, 'recordings', 'a.mov'))).toBe(true);
      // HOLDING copy still exists
      expect(nodeFs.existsSync(nodePath.join(holdingRoot, 'a1', 'recordings', 'a.mov'))).toBe(true);
    });

    it('refuses when state is not held (active)', async () => {
      makeActiveProject('a1');
      const app = createApp();
      const res = await request(app).post('/api/projects/a1/restore-held').send({});
      expect(res.status).toBe(400);
      expect(res.body.newState).toBe('active');
    });

    it('refuses when T7 not mounted', async () => {
      makeHeldProject('a1');
      const app = createApp({ holdingPath: '/this/does/not/exist/youtube-HOLDING/appydave' });
      const res = await request(app).post('/api/projects/a1/restore-held').send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/not mounted/i);
    });

    it('rejects invalid code', async () => {
      const app = createApp();
      const res = await request(app).post('/api/projects/..%2Fbad/restore-held').send({});
      expect(res.status).toBe(400);
    });
  });

  // ---------------------------------------------------------------------
  // POST /archive
  // ---------------------------------------------------------------------
  describe('POST /:code/archive', () => {
    it('happy path: copies whole folder to PUBLISHED and deletes local', async () => {
      const localDir = makeActiveProject('a1');
      const app = createApp();
      const res = await request(app).post('/api/projects/a1/archive').send({});
      expect(res.status).toBe(200);
      const body = res.body as StorageMutationResponse;
      expect(body.success).toBe(true);
      expect(body.newState).toBe('archived');
      expect(nodeFs.existsSync(localDir)).toBe(false);
      expect(nodeFs.existsSync(nodePath.join(publishedRoot, 'a1', 'recordings', 'a.mov'))).toBe(true);
      expect(nodeFs.existsSync(nodePath.join(publishedRoot, 'a1', 'assets', 'img.png'))).toBe(true);
    });

    it('refuses when relay is non-empty', async () => {
      makeActiveProject('a1');
      const relayRoot = nodePath.join(tmpRoot, 'relay');
      makeRelayNonEmpty(relayRoot, 'a1');
      const app = createApp({ relayEnabled: true, relayDirectory: relayRoot });
      const res = await request(app).post('/api/projects/a1/archive').send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/relay/i);
    });

    it('refuses when T7 is not mounted', async () => {
      makeActiveProject('a1');
      const app = createApp({ publishedPath: '/this/does/not/exist/youtube-PUBLISHED/appydave' });
      const res = await request(app).post('/api/projects/a1/archive').send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/not mounted/i);
    });

    it('refuses when already archived', async () => {
      makeArchivedProject('a1');
      const app = createApp();
      const res = await request(app).post('/api/projects/a1/archive').send({});
      expect(res.status).toBe(400);
      expect(res.body.newState).toBe('archived');
      expect(res.body.error).toMatch(/already archived/i);
    });

    it('never writes to a range-bucket subfolder under PUBLISHED', async () => {
      makeActiveProject('b72-archon');
      const app = createApp();
      const res = await request(app).post('/api/projects/b72-archon/archive').send({});
      expect(res.status).toBe(200);
      // Flat layout: <publishedRoot>/b72-archon/... — NOT <publishedRoot>/b50-b99/b72-archon/...
      expect(nodeFs.existsSync(nodePath.join(publishedRoot, 'b72-archon'))).toBe(true);
      expect(nodeFs.existsSync(nodePath.join(publishedRoot, 'b50-b99'))).toBe(false);
    });
  });

  // ---------------------------------------------------------------------
  // POST /unarchive
  // ---------------------------------------------------------------------
  describe('POST /:code/unarchive', () => {
    it('happy path: restores whole folder from PUBLISHED to local (T7 copy stays)', async () => {
      makeArchivedProject('a1');
      const app = createApp();
      const res = await request(app).post('/api/projects/a1/unarchive').send({});
      expect(res.status).toBe(200);
      const body = res.body as StorageMutationResponse;
      expect(body.success).toBe(true);
      expect(body.newState).toBe('active');
      expect(nodeFs.existsSync(nodePath.join(projectsRoot, 'a1', 'recordings', 'a.mov'))).toBe(true);
      // T7 copy stays
      expect(nodeFs.existsSync(nodePath.join(publishedRoot, 'a1', 'recordings', 'a.mov'))).toBe(true);
    });

    it('refuses when not archived', async () => {
      makeActiveProject('a1');
      const app = createApp();
      const res = await request(app).post('/api/projects/a1/unarchive').send({});
      expect(res.status).toBe(400);
      expect(res.body.newState).toBe('active');
    });

    it('refuses when T7 not mounted', async () => {
      makeArchivedProject('a1');
      const app = createApp({ publishedPath: '/this/does/not/exist/youtube-PUBLISHED/appydave' });
      const res = await request(app).post('/api/projects/a1/unarchive').send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/not mounted/i);
    });

    it('rejects invalid code', async () => {
      const app = createApp();
      const res = await request(app).post('/api/projects/..%2Fbad/unarchive').send({});
      expect(res.status).toBe(400);
    });
  });

  // ---------------------------------------------------------------------
  // Post-review patches (Wave A → Wave B hardening)
  // ---------------------------------------------------------------------

  describe('P1: archive refuses when PUBLISHED destination has real content', () => {
    it('returns 409 when publishedDir already has files (either via degraded guard or P1 guard)', async () => {
      makeActiveProject('a1');
      // Pre-plant content in the published destination
      const pub = nodePath.join(publishedRoot, 'a1');
      nodeFs.mkdirSync(nodePath.join(pub, 'recordings'), { recursive: true });
      nodeFs.writeFileSync(nodePath.join(pub, 'recordings', 'leftover.mov'), Buffer.alloc(32, 1));
      const app = createApp();
      const res = await request(app).post('/api/projects/a1/archive').send({});
      // Both-present triggers `degraded` in getStorageTree, which the P8
      // guard catches first. Either error message is acceptable — the key
      // invariant is 409 + local preserved.
      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/PUBLISHED destination already has content|degraded/i);
      // Local must NOT be deleted
      expect(nodeFs.existsSync(nodePath.join(projectsRoot, 'a1'))).toBe(true);
    });
  });

  describe('P2: unarchive refuses when local dir exists', () => {
    it('returns 409 when localDir already exists', async () => {
      makeArchivedProject('a1');
      // Create an empty shell locally
      nodeFs.mkdirSync(nodePath.join(projectsRoot, 'a1'), { recursive: true });
      const app = createApp();
      const res = await request(app).post('/api/projects/a1/unarchive').send({});
      // Note: state derivation may see both local+published and flag degraded.
      // Either path returns a refusal (409), which is the safe outcome.
      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });
  });

  describe('P3: hold is transactional — verify-all then delete-all', () => {
    it('leaves ALL local heavy subfolders intact if verification fails on the 2nd subfolder', async () => {
      const localDir = makeActiveProject('a1');
      // Swap spawn mock: copy only a subset of files for the SECOND heavy
      // subfolder rsync. HEAVY_SUBFOLDERS is ['recordings','recording-shadows','final'].
      // We want subfolder #2 (recording-shadows) to verify-fail.
      let heavyCallIndex = 0;
      const cp = await import('child_process');
      const spawnSpy = vi.spyOn(cp, 'spawn').mockImplementation(((cmd: string, args: string[]) => {
        const src = args[args.length - 2];
        const dest = args[args.length - 1];
        const emitter = new EventEmitter() as EventEmitter & {
          stdin: unknown;
          stdout: EventEmitter;
          stderr: EventEmitter;
        };
        emitter.stdout = new EventEmitter();
        emitter.stderr = new EventEmitter();
        // Detect heavy-subfolder rsync (dest contains holdingRoot + /<code>/<sub>)
        const isHeavy = HEAVY_SUBFOLDERS.some((s) => dest.includes('/a1/' + s));
        const mySlot = isHeavy ? heavyCallIndex++ : -1;
        setImmediate(() => {
          try {
            const srcDir = src.replace(/\/$/, '');
            const destDir = dest.replace(/\/$/, '');
            if (mySlot === 1) {
              // Partial copy: create dest dir but skip files entirely
              nodeFs.mkdirSync(destDir, { recursive: true });
            } else {
              copyRecursive(srcDir, destDir);
            }
            emitter.emit('close', 0);
          } catch (err) {
            emitter.emit('error', err);
          }
        });
        return emitter as unknown as import('child_process').ChildProcess;
      }) as typeof cp.spawn);

      const app = createApp();
      const res = await request(app).post('/api/projects/a1/hold').send({});
      spawnSpy.mockRestore();

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/verification failed/i);
      // CRITICAL: every heavy subfolder must still exist on local
      for (const sub of HEAVY_SUBFOLDERS) {
        expect(nodeFs.existsSync(nodePath.join(localDir, sub))).toBe(true);
      }
      // First subfolder got rsynced successfully — the error message should
      // hint at the need for manual HOLDING cleanup.
      expect(res.body.error).toMatch(/manual cleanup|HOLDING/i);
    });
  });

  describe('P4: archive verify checks fileCount AND totalBytes', () => {
    it('fails with 500 and keeps local when bytes diverge even though count matches', async () => {
      const localDir = makeActiveProject('a1');
      const cp = await import('child_process');
      const spawnSpy = vi.spyOn(cp, 'spawn').mockImplementation(((cmd: string, args: string[]) => {
        const src = args[args.length - 2];
        const dest = args[args.length - 1];
        const emitter = new EventEmitter() as EventEmitter & {
          stdin: unknown;
          stdout: EventEmitter;
          stderr: EventEmitter;
        };
        emitter.stdout = new EventEmitter();
        emitter.stderr = new EventEmitter();
        setImmediate(() => {
          try {
            const srcDir = src.replace(/\/$/, '');
            const destDir = dest.replace(/\/$/, '');
            // Copy full tree BUT truncate every file to 1 byte — same count,
            // different totalBytes.
            copyRecursive(srcDir, destDir);
            const shrinkFiles = (dir: string) => {
              for (const e of nodeFs.readdirSync(dir, { withFileTypes: true })) {
                const p = nodePath.join(dir, e.name);
                if (e.isDirectory()) shrinkFiles(p);
                else if (e.isFile()) nodeFs.writeFileSync(p, Buffer.alloc(1, 0));
              }
            };
            shrinkFiles(destDir);
            emitter.emit('close', 0);
          } catch (err) {
            emitter.emit('error', err);
          }
        });
        return emitter as unknown as import('child_process').ChildProcess;
      }) as typeof cp.spawn);

      const app = createApp();
      const res = await request(app).post('/api/projects/a1/archive').send({});
      spawnSpy.mockRestore();

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/verification/i);
      // Local must still exist
      expect(nodeFs.existsSync(localDir)).toBe(true);
    });
  });

  describe('P7: getStorageTree reports ssdMounted false when paths unreachable', () => {
    it('returns ssdMounted: false via GET /storage-tree when configured T7 paths do not exist', async () => {
      makeActiveProject('a1');
      const app = createApp({
        holdingPath: '/nope/does/not/exist/youtube-HOLDING/appydave',
        publishedPath: '/nope/does/not/exist/youtube-PUBLISHED/appydave',
      });
      const res = await request(app).get('/api/projects/a1/storage-tree');
      expect(res.status).toBe(200);
      const body = res.body as StorageTreeResponse;
      expect(body.ssdMounted).toBe(false);
    });
  });

  describe('P8: mutations refuse when tree.degraded', () => {
    it('hold returns 409 when both HOLDING and PUBLISHED have the project', async () => {
      makeHeldProject('a1');
      // Also plant published content → degraded
      const pub = nodePath.join(publishedRoot, 'a1');
      nodeFs.mkdirSync(pub, { recursive: true });
      nodeFs.writeFileSync(nodePath.join(pub, 'a.mov'), Buffer.alloc(64, 1));
      const app = createApp();
      const res = await request(app).post('/api/projects/a1/hold').send({});
      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/degraded/i);
    });
  });

  describe('P9: hold refuses when there is nothing heavy to hold', () => {
    it('returns 400 when the active project has no heavy subfolders', async () => {
      // Light-only project
      const base = nodePath.join(projectsRoot, 'lite');
      nodeFs.mkdirSync(nodePath.join(base, 'assets'), { recursive: true });
      nodeFs.writeFileSync(nodePath.join(base, 'assets', 'x.png'), Buffer.alloc(64, 1));
      const app = createApp();
      const res = await request(app).post('/api/projects/lite/hold').send({});
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/no heavy content/i);
      expect(res.body.newState).toBe('active');
    });
  });

  describe('P11: rsync --exclude args are honored on every mutation', () => {
    async function captureRsyncCalls<T>(run: () => Promise<T>): Promise<{ calls: string[][]; result: T }> {
      const calls: string[][] = [];
      const cp = await import('child_process');
      const spawnSpy = vi.spyOn(cp, 'spawn').mockImplementation(((cmd: string, args: string[]) => {
        if (cmd === 'rsync') calls.push([...args]);
        const src = args[args.length - 2];
        const dest = args[args.length - 1];
        const emitter = new EventEmitter() as EventEmitter & {
          stdin: unknown;
          stdout: EventEmitter;
          stderr: EventEmitter;
        };
        emitter.stdout = new EventEmitter();
        emitter.stderr = new EventEmitter();
        setImmediate(() => {
          try {
            copyRecursive(src.replace(/\/$/, ''), dest.replace(/\/$/, ''));
            emitter.emit('close', 0);
          } catch (err) {
            emitter.emit('error', err);
          }
        });
        return emitter as unknown as import('child_process').ChildProcess;
      }) as typeof cp.spawn);
      const result = await run();
      spawnSpy.mockRestore();
      return { calls, result };
    }

    function assertExcludesPresent(args: string[]) {
      for (const pattern of ['-trash/', 's3-staging/', '.DS_Store', '._*']) {
        const idx = args.indexOf(pattern);
        expect(idx).toBeGreaterThan(-1);
        // Every exclude pattern must be preceded by --exclude
        expect(args[idx - 1]).toBe('--exclude');
      }
    }

    it('hold rsync calls include all holdExcludeArgs patterns', async () => {
      makeActiveProject('a1');
      const app = createApp();
      const { calls } = await captureRsyncCalls(() =>
        request(app).post('/api/projects/a1/hold').send({}),
      );
      expect(calls.length).toBeGreaterThan(0);
      for (const args of calls) assertExcludesPresent(args);
    });

    it('restore-held rsync calls include all holdExcludeArgs patterns', async () => {
      makeHeldProject('a1');
      const app = createApp();
      const { calls } = await captureRsyncCalls(() =>
        request(app).post('/api/projects/a1/restore-held').send({}),
      );
      expect(calls.length).toBeGreaterThan(0);
      for (const args of calls) assertExcludesPresent(args);
    });

    it('archive rsync call includes all holdExcludeArgs patterns', async () => {
      makeActiveProject('a1');
      const app = createApp();
      const { calls } = await captureRsyncCalls(() =>
        request(app).post('/api/projects/a1/archive').send({}),
      );
      expect(calls.length).toBeGreaterThan(0);
      for (const args of calls) assertExcludesPresent(args);
    });

    it('unarchive rsync call includes all holdExcludeArgs patterns', async () => {
      makeArchivedProject('a1');
      const app = createApp();
      const { calls } = await captureRsyncCalls(() =>
        request(app).post('/api/projects/a1/unarchive').send({}),
      );
      expect(calls.length).toBeGreaterThan(0);
      for (const args of calls) assertExcludesPresent(args);
    });
  });

  // ---------------------------------------------------------------------
  // P1 (review): POST /held-archive — atomic Held → Archive endpoint.
  // ---------------------------------------------------------------------
  describe('P1 (review): POST /:code/held-archive', () => {
    it('happy path: restores heavy from HOLDING, publishes to PUBLISHED, deletes local + HOLDING', async () => {
      makeHeldProject('a1');
      const app = createApp();
      const res = await request(app).post('/api/projects/a1/held-archive').send({});
      expect(res.status).toBe(200);
      const body = res.body as StorageMutationResponse;
      expect(body.success).toBe(true);
      expect(body.newState).toBe('archived');
      // Local folder deleted
      expect(nodeFs.existsSync(nodePath.join(projectsRoot, 'a1'))).toBe(false);
      // HOLDING deleted
      expect(nodeFs.existsSync(nodePath.join(holdingRoot, 'a1'))).toBe(false);
      // PUBLISHED has the heavy content + previously-local light files
      expect(nodeFs.existsSync(nodePath.join(publishedRoot, 'a1', 'recordings', 'a.mov'))).toBe(true);
      expect(nodeFs.existsSync(nodePath.join(publishedRoot, 'a1', 'assets', 'img.png'))).toBe(true);
    });

    it('refuses when relay is non-empty — nothing destructive', async () => {
      makeHeldProject('a1');
      const relayRoot = nodePath.join(tmpRoot, 'relay');
      makeRelayNonEmpty(relayRoot, 'a1');
      const app = createApp({ relayEnabled: true, relayDirectory: relayRoot });
      const res = await request(app).post('/api/projects/a1/held-archive').send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/relay/i);
      // HOLDING still intact
      expect(nodeFs.existsSync(nodePath.join(holdingRoot, 'a1', 'recordings', 'a.mov'))).toBe(true);
    });

    it('refuses when T7 (HOLDING) is not mounted', async () => {
      makeHeldProject('a1');
      const app = createApp({ holdingPath: '/this/does/not/exist/youtube-HOLDING/appydave' });
      const res = await request(app).post('/api/projects/a1/held-archive').send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/not mounted/i);
    });

    it('refuses when project state is not `held` (active)', async () => {
      makeActiveProject('a1');
      const app = createApp();
      const res = await request(app).post('/api/projects/a1/held-archive').send({});
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.newState).toBe('active');
    });

    it('refuses when tree is degraded', async () => {
      // Held + extra published content → degraded.
      makeHeldProject('a1');
      const pub = nodePath.join(publishedRoot, 'a1');
      nodeFs.mkdirSync(pub, { recursive: true });
      nodeFs.writeFileSync(nodePath.join(pub, 'extra.mov'), Buffer.alloc(32, 1));
      const app = createApp();
      const res = await request(app).post('/api/projects/a1/held-archive').send({});
      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/degraded/i);
    });

    it('leaves everything intact when publish-verify fails', async () => {
      makeHeldProject('a1');
      // spawn: perform real copy on HOLDING→local (restore step) but truncate
      // files on the local→PUBLISHED rsync so byte-count diverges.
      const cp = await import('child_process');
      const spawnSpy = vi.spyOn(cp, 'spawn').mockImplementation(((cmd: string, args: string[]) => {
        const src = args[args.length - 2];
        const dest = args[args.length - 1];
        const emitter = new EventEmitter() as EventEmitter & {
          stdin: unknown;
          stdout: EventEmitter;
          stderr: EventEmitter;
        };
        emitter.stdout = new EventEmitter();
        emitter.stderr = new EventEmitter();
        setImmediate(() => {
          try {
            const srcDir = src.replace(/\/$/, '');
            const destDir = dest.replace(/\/$/, '');
            copyRecursive(srcDir, destDir);
            // If this is the publish step (dest inside publishedRoot), shrink.
            if (destDir.startsWith(publishedRoot + nodePath.sep) || destDir === publishedRoot) {
              const shrink = (dir: string) => {
                for (const e of nodeFs.readdirSync(dir, { withFileTypes: true })) {
                  const p = nodePath.join(dir, e.name);
                  if (e.isDirectory()) shrink(p);
                  else if (e.isFile()) nodeFs.writeFileSync(p, Buffer.alloc(1, 0));
                }
              };
              shrink(destDir);
            }
            emitter.emit('close', 0);
          } catch (err) {
            emitter.emit('error', err);
          }
        });
        return emitter as unknown as import('child_process').ChildProcess;
      }) as typeof cp.spawn);

      const app = createApp();
      const res = await request(app).post('/api/projects/a1/held-archive').send({});
      spawnSpy.mockRestore();

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/verification/i);
      // HOLDING still intact (not deleted)
      expect(nodeFs.existsSync(nodePath.join(holdingRoot, 'a1', 'recordings', 'a.mov'))).toBe(true);
      // Local still exists
      expect(nodeFs.existsSync(nodePath.join(projectsRoot, 'a1'))).toBe(true);
    });
  });

  // ---------------------------------------------------------------------
  // P5 (review): mutation → activity-log side effect + no-log-on-failure.
  // ---------------------------------------------------------------------
  describe('P5 (review): mutation appends exactly one activity log entry on success', () => {
    it('hold: appends one entry', async () => {
      makeActiveProject('a1');
      const app = createApp();
      const res = await request(app).post('/api/projects/a1/hold').send({});
      expect(res.status).toBe(200);
      const entries = await readStorageActivity({ logPath: app.__logPath });
      expect(entries.length).toBe(1);
      expect(entries[0].action).toBe('hold');
      expect(entries[0].projectCode).toBe('a1');
    });

    it('restore-held: appends one entry', async () => {
      makeHeldProject('a1');
      const app = createApp();
      const res = await request(app).post('/api/projects/a1/restore-held').send({});
      expect(res.status).toBe(200);
      const entries = await readStorageActivity({ logPath: app.__logPath });
      expect(entries.length).toBe(1);
      expect(entries[0].action).toBe('restore-held');
    });

    it('archive: appends one entry', async () => {
      makeActiveProject('a1');
      const app = createApp();
      const res = await request(app).post('/api/projects/a1/archive').send({});
      expect(res.status).toBe(200);
      const entries = await readStorageActivity({ logPath: app.__logPath });
      expect(entries.length).toBe(1);
      expect(entries[0].action).toBe('archive');
    });

    it('unarchive: appends one entry', async () => {
      makeArchivedProject('a1');
      const app = createApp();
      const res = await request(app).post('/api/projects/a1/unarchive').send({});
      expect(res.status).toBe(200);
      const entries = await readStorageActivity({ logPath: app.__logPath });
      expect(entries.length).toBe(1);
      expect(entries[0].action).toBe('unarchive');
    });

    it('held-archive: appends one entry', async () => {
      makeHeldProject('a1');
      const app = createApp();
      const res = await request(app).post('/api/projects/a1/held-archive').send({});
      expect(res.status).toBe(200);
      const entries = await readStorageActivity({ logPath: app.__logPath });
      expect(entries.length).toBe(1);
      expect(entries[0].action).toBe('held-archive');
    });
  });

  describe('P5 (review): refused mutations do NOT append activity entries', () => {
    it('hold relay-blocked: no log entry', async () => {
      makeActiveProject('a1');
      const relayRoot = nodePath.join(tmpRoot, 'relay');
      makeRelayNonEmpty(relayRoot, 'a1');
      const app = createApp({ relayEnabled: true, relayDirectory: relayRoot });
      const res = await request(app).post('/api/projects/a1/hold').send({});
      expect(res.status).toBe(400);
      const entries = await readStorageActivity({ logPath: app.__logPath });
      expect(entries.length).toBe(0);
    });

    it('archive degraded: no log entry', async () => {
      // Both local + published → degraded.
      makeActiveProject('a1');
      const pub = nodePath.join(publishedRoot, 'a1');
      nodeFs.mkdirSync(nodePath.join(pub, 'recordings'), { recursive: true });
      nodeFs.writeFileSync(nodePath.join(pub, 'recordings', 'x.mov'), Buffer.alloc(16, 1));
      const app = createApp();
      const res = await request(app).post('/api/projects/a1/archive').send({});
      expect(res.status).toBe(409);
      const entries = await readStorageActivity({ logPath: app.__logPath });
      expect(entries.length).toBe(0);
    });

    it('held-archive not-held refusal: no log entry', async () => {
      makeActiveProject('a1');
      const app = createApp();
      const res = await request(app).post('/api/projects/a1/held-archive').send({});
      expect(res.status).toBe(400);
      const entries = await readStorageActivity({ logPath: app.__logPath });
      expect(entries.length).toBe(0);
    });
  });

  // ---------------------------------------------------------------------
  // P7 (review): activity-log failure must NOT fail the mutation.
  // ---------------------------------------------------------------------
  describe('P7 (review): mutation succeeds even when activity logging throws', () => {
    it('hold returns 200 success when appendStorageActivity rejects', async () => {
      makeActiveProject('a1');
      const app = createApp();
      const spy = vi.spyOn(activityLog, 'appendStorageActivity').mockRejectedValueOnce(
        new Error('simulated EACCES on log dir'),
      );
      const res = await request(app).post('/api/projects/a1/hold').send({});
      spy.mockRestore();
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.newState).toBe('held');
    });
  });
});
