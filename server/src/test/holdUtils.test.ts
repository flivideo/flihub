// B064: Tests for holdUtils — safety chains, verification, rsync calls
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import os from 'os';
import path from 'path';
import { promises as fs } from 'fs';

// ---------------------------------------------------------------------------
// B064: Mock child_process.spawn for rsync tests
// We track the last call args and simulate success (exit 0) or failure.
// ---------------------------------------------------------------------------
let mockSpawnShouldFail = false;
let lastSpawnArgs: { cmd: string; args: string[] } | null = null;

vi.mock('child_process', () => {
  return {
    spawn: (cmd: string, args: string[]) => {
      lastSpawnArgs = { cmd, args };
      // Return an EventEmitter-like mock
      const listeners: Record<string, Function[]> = {};
      const proc = {
        on(event: string, cb: Function) {
          if (!listeners[event]) listeners[event] = [];
          listeners[event].push(cb);
          return proc;
        },
      };
      // Emit asynchronously so the promise wrapper can attach listeners first
      setImmediate(() => {
        if (mockSpawnShouldFail) {
          (listeners['close'] ?? []).forEach(cb => cb(1));
        } else {
          (listeners['close'] ?? []).forEach(cb => cb(0));
        }
      });
      return proc;
    },
  };
});

// Import after mocks
import {
  checkSsdMounted,
  verifyHoldingMatch,
  getHoldStatus,
  holdProject,
  restoreFromHolding,
  deleteLocalProject,
  deleteHoldingProject,
  HOLD_EXCLUDES,
  holdExcludeArgs,
} from '../utils/holdUtils.js';

// ---------------------------------------------------------------------------
// B064: Shared fixture helpers
// ---------------------------------------------------------------------------

/** Create a standard project fixture inside tmpRoot */
async function createProjectFixture(tmpRoot: string): Promise<{
  projectsRoot: string;
  projectDir: string;
  holdingRoot: string;
}> {
  const projectsRoot = path.join(tmpRoot, 'projects');
  const holdingRoot = path.join(tmpRoot, 'holding');
  const projectDir = path.join(projectsRoot, 'b72-test-project');

  await fs.mkdir(path.join(projectDir, 'recordings'), { recursive: true });
  await fs.writeFile(path.join(projectDir, 'recordings', 'clip.txt'), 'fake video data');

  return { projectsRoot, projectDir, holdingRoot };
}

/** Mirror project to holding (real copy, for verifyHoldingMatch tests) */
async function mirrorToHolding(projectDir: string, holdingRoot: string): Promise<string> {
  const holdingDir = path.join(holdingRoot, path.basename(projectDir));
  await fs.mkdir(path.join(holdingDir, 'recordings'), { recursive: true });

  // Copy all files from recordings
  const files = await fs.readdir(path.join(projectDir, 'recordings'));
  for (const f of files) {
    const src = path.join(projectDir, 'recordings', f);
    const dst = path.join(holdingDir, 'recordings', f);
    await fs.copyFile(src, dst);
  }
  return holdingDir;
}

// ---------------------------------------------------------------------------
// B064: deleteLocalProject — 5-gate safety chain
// ---------------------------------------------------------------------------

describe('deleteLocalProject — safety chain', () => {
  let tmpRoot: string;

  beforeEach(async () => {
    tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'flihub-hold-'));
  });

  afterEach(async () => {
    await fs.rm(tmpRoot, { recursive: true, force: true });
  });

  it('B064: allows valid path inside projectsRoot (verified=true)', async () => {
    const { projectsRoot, projectDir } = await createProjectFixture(tmpRoot);

    const result = await deleteLocalProject(projectDir, projectsRoot, true);

    expect(result.success).toBe(true);
    // Directory should be gone
    await expect(fs.access(projectDir)).rejects.toThrow();
  });

  it('B064: rejects path outside projectsRoot', async () => {
    const { projectsRoot } = await createProjectFixture(tmpRoot);
    const evilPath = path.join(os.tmpdir(), 'evil-path');

    const result = await deleteLocalProject(evilPath, projectsRoot, true);

    expect(result.success).toBe(false);
    expect(result.message).toContain('outside');
  });

  it('B064: rejects path equal to projectsRoot', async () => {
    const { projectsRoot } = await createProjectFixture(tmpRoot);

    const result = await deleteLocalProject(projectsRoot, projectsRoot, true);

    expect(result.success).toBe(false);
    expect(result.message).toContain('equals projectsRoot');
  });

  it('B064: rejects path traversal after resolve (e.g. projectsRoot + /../etc)', async () => {
    const { projectsRoot, projectDir } = await createProjectFixture(tmpRoot);
    // Construct a traversal path that looks inside but resolves outside
    const traversalPath = path.join(projectDir, '..', '..', 'etc');

    const result = await deleteLocalProject(traversalPath, projectsRoot, true);

    expect(result.success).toBe(false);
    expect(result.message).toContain('outside');
  });

  it('B064: rejects when verified is false', async () => {
    const { projectsRoot, projectDir } = await createProjectFixture(tmpRoot);

    const result = await deleteLocalProject(projectDir, projectsRoot, false);

    expect(result.success).toBe(false);
    expect(result.message).toContain('verified is false');
    // Directory should still exist
    await expect(fs.access(projectDir)).resolves.toBeUndefined();
  });

  it('B064: rejects when project directory does not exist', async () => {
    const { projectsRoot } = await createProjectFixture(tmpRoot);
    const missingDir = path.join(projectsRoot, 'b99-nonexistent');

    const result = await deleteLocalProject(missingDir, projectsRoot, true);

    expect(result.success).toBe(false);
    expect(result.message).toContain('does not exist');
  });
});

// ---------------------------------------------------------------------------
// B064: deleteHoldingProject — symmetric 5-gate safety chain
// ---------------------------------------------------------------------------

describe('deleteHoldingProject — safety chain', () => {
  let tmpRoot: string;

  beforeEach(async () => {
    tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'flihub-hold-'));
  });

  afterEach(async () => {
    await fs.rm(tmpRoot, { recursive: true, force: true });
  });

  it('B064: allows valid path inside holdingRoot (verified=true)', async () => {
    const holdingRoot = path.join(tmpRoot, 'holding');
    const holdingDir = path.join(holdingRoot, 'b72-test-project');
    await fs.mkdir(holdingDir, { recursive: true });
    await fs.writeFile(path.join(holdingDir, 'clip.txt'), 'data');

    const result = await deleteHoldingProject(holdingDir, holdingRoot, true);

    expect(result.success).toBe(true);
    await expect(fs.access(holdingDir)).rejects.toThrow();
  });

  it('B064: rejects path outside holdingRoot', async () => {
    const holdingRoot = path.join(tmpRoot, 'holding');
    await fs.mkdir(holdingRoot, { recursive: true });
    const evilPath = path.join(os.tmpdir(), 'evil-holding');

    const result = await deleteHoldingProject(evilPath, holdingRoot, true);

    expect(result.success).toBe(false);
    expect(result.message).toContain('outside');
  });

  it('B064: rejects path equal to holdingRoot', async () => {
    const holdingRoot = path.join(tmpRoot, 'holding');
    await fs.mkdir(holdingRoot, { recursive: true });

    const result = await deleteHoldingProject(holdingRoot, holdingRoot, true);

    expect(result.success).toBe(false);
    expect(result.message).toContain('equals holdingRoot');
  });

  it('B064: rejects path traversal after resolve', async () => {
    const holdingRoot = path.join(tmpRoot, 'holding');
    const holdingDir = path.join(holdingRoot, 'b72-test-project');
    await fs.mkdir(holdingDir, { recursive: true });
    // Traversal: goes inside holdingDir then up past holdingRoot
    const traversalPath = path.join(holdingDir, '..', '..', 'etc');

    const result = await deleteHoldingProject(traversalPath, holdingRoot, true);

    expect(result.success).toBe(false);
    expect(result.message).toContain('outside');
  });

  it('B064: rejects when verified is false', async () => {
    const holdingRoot = path.join(tmpRoot, 'holding');
    const holdingDir = path.join(holdingRoot, 'b72-test-project');
    await fs.mkdir(holdingDir, { recursive: true });

    const result = await deleteHoldingProject(holdingDir, holdingRoot, false);

    expect(result.success).toBe(false);
    expect(result.message).toContain('verified is false');
    await expect(fs.access(holdingDir)).resolves.toBeUndefined();
  });

  it('B064: rejects when holding directory does not exist', async () => {
    const holdingRoot = path.join(tmpRoot, 'holding');
    await fs.mkdir(holdingRoot, { recursive: true });
    const missingDir = path.join(holdingRoot, 'b99-nonexistent');

    const result = await deleteHoldingProject(missingDir, holdingRoot, true);

    expect(result.success).toBe(false);
    expect(result.message).toContain('does not exist');
  });
});

// ---------------------------------------------------------------------------
// B064: verifyHoldingMatch
// ---------------------------------------------------------------------------

describe('verifyHoldingMatch', () => {
  let tmpRoot: string;

  beforeEach(async () => {
    tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'flihub-hold-'));
  });

  afterEach(async () => {
    await fs.rm(tmpRoot, { recursive: true, force: true });
  });

  it('B064: returns match:true when files and bytes are identical', async () => {
    const { projectDir } = await createProjectFixture(tmpRoot);
    const holdingRoot = path.join(tmpRoot, 'holding');
    const holdingDir = await mirrorToHolding(projectDir, holdingRoot);

    const result = await verifyHoldingMatch(projectDir, holdingDir);

    expect(result.match).toBe(true);
    expect(result.localFiles).toBe(result.holdingFiles);
    expect(result.localBytes).toBe(result.holdingBytes);
    expect(result.localFiles).toBeGreaterThan(0);
  });

  it('B064: returns match:false when file count differs', async () => {
    const { projectDir } = await createProjectFixture(tmpRoot);
    const holdingRoot = path.join(tmpRoot, 'holding');
    const holdingDir = await mirrorToHolding(projectDir, holdingRoot);

    // Add extra file to holding — count now differs
    await fs.writeFile(path.join(holdingDir, 'recordings', 'extra.txt'), 'bonus');

    const result = await verifyHoldingMatch(projectDir, holdingDir);

    expect(result.match).toBe(false);
    expect(result.holdingFiles).toBeGreaterThan(result.localFiles);
  });

  it('B065: returns match:true when file counts match even if bytes differ', async () => {
    // B065: match is file-count-only. Byte totals drift across filesystems due to
    // .DS_Store churn, resource forks, and extended attributes — not a reliable signal.
    const { projectDir } = await createProjectFixture(tmpRoot);
    const holdingRoot = path.join(tmpRoot, 'holding');
    const holdingDir = await mirrorToHolding(projectDir, holdingRoot);

    // Same file count, but different bytes — write different content
    await fs.writeFile(path.join(holdingDir, 'recordings', 'clip.txt'), 'different content that is much longer');

    const result = await verifyHoldingMatch(projectDir, holdingDir);

    expect(result.match).toBe(true); // B065: file counts equal → match
    expect(result.localFiles).toBe(result.holdingFiles); // same count
    expect(result.localBytes).not.toBe(result.holdingBytes); // bytes differ but ignored
  });

  it('B064: returns match:false (not throws) when holdingDir does not exist', async () => {
    const { projectDir } = await createProjectFixture(tmpRoot);
    const missingHolding = path.join(tmpRoot, 'holding', 'nonexistent-project');

    const result = await verifyHoldingMatch(projectDir, missingHolding);

    expect(result.match).toBe(false);
    expect(result.holdingFiles).toBe(0);
    expect(result.holdingBytes).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// B064: holdProject and restoreFromHolding — rsync arg verification
// ---------------------------------------------------------------------------

describe('holdProject — rsync args', () => {
  let tmpRoot: string;

  beforeEach(async () => {
    tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'flihub-hold-'));
    lastSpawnArgs = null;
    mockSpawnShouldFail = false;
  });

  afterEach(async () => {
    await fs.rm(tmpRoot, { recursive: true, force: true });
  });

  it('B064: calls rsync with correct array args (no shell interpolation)', async () => {
    const { projectDir, holdingRoot } = await createProjectFixture(tmpRoot);

    const result = await holdProject(projectDir, holdingRoot);

    expect(result.success).toBe(true);
    expect(lastSpawnArgs).not.toBeNull();
    expect(lastSpawnArgs!.cmd).toBe('rsync');
    // B064: Must be array args — never a shell-interpolated string
    expect(lastSpawnArgs!.args).toEqual([
      '-a',
      ...holdExcludeArgs(),
      projectDir + '/',
      path.join(holdingRoot, path.basename(projectDir)) + '/',
    ]);
  });

  it('B064: returns success:false when rsync fails', async () => {
    const { projectDir, holdingRoot } = await createProjectFixture(tmpRoot);
    mockSpawnShouldFail = true;

    const result = await holdProject(projectDir, holdingRoot);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  // B064: Integration test — skipped because child_process is mocked at the module level.
  // To run a real rsync integration test, use a separate test file without the vi.mock.
  it.skip('B064 integration: rsync actually copies files (skipped — module-level mock active)', async () => {
    // This test is intentionally skipped. The vi.mock('child_process') at the top of this
    // file replaces spawn for all tests, making real rsync calls impossible here.
    // Real integration is validated manually or in a dedicated integration test file.
  });
});

describe('restoreFromHolding — rsync args', () => {
  let tmpRoot: string;

  beforeEach(async () => {
    tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'flihub-hold-'));
    lastSpawnArgs = null;
    mockSpawnShouldFail = false;
  });

  afterEach(async () => {
    await fs.rm(tmpRoot, { recursive: true, force: true });
  });

  it('B064: calls rsync with correct array args', async () => {
    const holdingRoot = path.join(tmpRoot, 'holding');
    const holdingDir = path.join(holdingRoot, 'b72-test-project');
    const localDir = path.join(tmpRoot, 'projects', 'b72-test-project');
    await fs.mkdir(path.join(holdingDir, 'recordings'), { recursive: true });

    const result = await restoreFromHolding(holdingDir, localDir);

    expect(result.success).toBe(true);
    expect(lastSpawnArgs!.cmd).toBe('rsync');
    expect(lastSpawnArgs!.args).toEqual([
      '-a',
      ...holdExcludeArgs(),
      holdingDir + '/',
      localDir + '/',
    ]);
  });

  it('B064: creates localDir if it does not exist', async () => {
    const holdingRoot = path.join(tmpRoot, 'holding');
    const holdingDir = path.join(holdingRoot, 'b72-test-project');
    const localDir = path.join(tmpRoot, 'projects', 'b72-test-project');
    await fs.mkdir(holdingDir, { recursive: true });

    await restoreFromHolding(holdingDir, localDir);

    // localDir should have been created by mkdir
    await expect(fs.access(localDir)).resolves.toBeUndefined();
  });

  it('B064: returns success:false when rsync fails', async () => {
    const holdingDir = path.join(tmpRoot, 'holding', 'b72-test-project');
    const localDir = path.join(tmpRoot, 'projects', 'b72-test-project');
    await fs.mkdir(holdingDir, { recursive: true });
    mockSpawnShouldFail = true;

    const result = await restoreFromHolding(holdingDir, localDir);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// B064: checkSsdMounted
// ---------------------------------------------------------------------------

describe('checkSsdMounted', () => {
  let tmpRoot: string;

  beforeEach(async () => {
    tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'flihub-hold-'));
  });

  afterEach(async () => {
    await fs.rm(tmpRoot, { recursive: true, force: true });
  });

  it('B064: returns true when volume root (2 levels up) is accessible', async () => {
    // holdingRoot = tmpRoot/youtube-HOLDING/appydave
    // 2 levels up = tmpRoot (the simulated volume root) — always exists
    const holdingRoot = path.join(tmpRoot, 'youtube-HOLDING', 'appydave');
    const result = await checkSsdMounted(holdingRoot);
    expect(result).toBe(true);
  });

  it('B064: returns false (not throws) when volume root is not accessible', async () => {
    // holdingRoot = /nonexistent-mount-abc123/youtube-HOLDING/appydave
    // 2 levels up = /nonexistent-mount-abc123 — does not exist
    const result = await checkSsdMounted('/nonexistent-mount-abc123/youtube-HOLDING/appydave');
    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// B064: verifyHoldingMatch — missing localDir case
// ---------------------------------------------------------------------------

describe('verifyHoldingMatch — missing localDir', () => {
  let tmpRoot: string;

  beforeEach(async () => {
    tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'flihub-hold-'));
  });

  afterEach(async () => {
    await fs.rm(tmpRoot, { recursive: true, force: true });
  });

  it('B064: returns match:false when localDir does not exist (holdingDir has files)', async () => {
    // holdingDir has files, localDir does not exist — should return match:false
    const holdingRoot = path.join(tmpRoot, 'holding');
    const holdingDir = path.join(holdingRoot, 'b72-test-project');
    await fs.mkdir(path.join(holdingDir, 'recordings'), { recursive: true });
    await fs.writeFile(path.join(holdingDir, 'recordings', 'clip.txt'), 'video data');

    const missingLocalDir = path.join(tmpRoot, 'projects', 'b72-test-project');

    const result = await verifyHoldingMatch(missingLocalDir, holdingDir);

    // localDir doesn't exist — getDirStats returns 0 for local.
    // holdingDir exists with files — getDirStats returns N for holding.
    expect(result.match).toBe(false);
    expect(result.localFiles).toBe(0);
    expect(result.holdingFiles).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// B064: getHoldStatus
// ---------------------------------------------------------------------------

describe('getHoldStatus', () => {
  let tmpRoot: string;

  beforeEach(async () => {
    tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'flihub-hold-'));
  });

  afterEach(async () => {
    await fs.rm(tmpRoot, { recursive: true, force: true });
  });

  it('B064: returns local-only when only local exists', async () => {
    const { projectDir, holdingRoot } = await createProjectFixture(tmpRoot);

    const status = await getHoldStatus('b72-test-project', projectDir, null, holdingRoot);

    expect(status.location).toBe('local-only');
    expect(status.relayBlocked).toBe(false);
    expect(status.relayBytes).toBe(0);
  });

  it('B064: returns holding-only when only holding exists', async () => {
    const { projectDir, holdingRoot } = await createProjectFixture(tmpRoot);
    const holdingDir = await mirrorToHolding(projectDir, holdingRoot);

    // Remove local dir after mirroring
    await fs.rm(projectDir, { recursive: true });

    const status = await getHoldStatus('b72-test-project', projectDir, null, holdingRoot);

    expect(status.location).toBe('holding-only');
    expect(status.holdingPath).toBe(holdingDir);
  });

  it('B064: returns both when both exist and auto-runs verify', async () => {
    const { projectDir, holdingRoot } = await createProjectFixture(tmpRoot);
    await mirrorToHolding(projectDir, holdingRoot);

    const status = await getHoldStatus('b72-test-project', projectDir, null, holdingRoot);

    expect(status.location).toBe('both');
    // Auto-verify should have run
    expect(status.verification).toBeDefined();
  });

  it('B064: returns unknown when neither exists', async () => {
    const projectsRoot = path.join(tmpRoot, 'projects');
    const holdingRoot = path.join(tmpRoot, 'holding');
    const missingProjectDir = path.join(projectsRoot, 'b99-nonexistent');

    const status = await getHoldStatus('b99-nonexistent', missingProjectDir, null, holdingRoot);

    expect(status.location).toBe('unknown');
    expect(status.holdingPath).toBeUndefined();
  });

  it('B064: returns relayBlocked:true when relay dir has files', async () => {
    const { projectDir, holdingRoot } = await createProjectFixture(tmpRoot);
    const relayDir = path.join(tmpRoot, 'relay', 'b72-test-project');

    // Create a relay recordings folder with a file to simulate blocking
    await fs.mkdir(path.join(relayDir, 'recordings'), { recursive: true });
    await fs.writeFile(path.join(relayDir, 'recordings', 'pending.mov'), 'pending video');

    const status = await getHoldStatus('b72-test-project', projectDir, relayDir, holdingRoot);

    expect(status.relayBlocked).toBe(true);
    expect(status.relayBytes).toBeGreaterThan(0);
  });

  it('B064: both state verification.match is true when files match', async () => {
    const { projectDir, holdingRoot } = await createProjectFixture(tmpRoot);
    await mirrorToHolding(projectDir, holdingRoot);

    const status = await getHoldStatus('b72-test-project', projectDir, null, holdingRoot);

    expect(status.location).toBe('both');
    expect(status.verification).toBeDefined();
    expect(status.verification!.match).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// WU3: holdExcludeArgs — rsync exclude patterns
// ---------------------------------------------------------------------------

describe('holdExcludeArgs — rsync exclude patterns', () => {
  it('WU3: returns --exclude flag pairs for all HOLD_EXCLUDES', () => {
    const args = holdExcludeArgs();

    // Each pattern should produce ['--exclude', pattern]
    expect(args.length).toBe(HOLD_EXCLUDES.length * 2);
    for (let i = 0; i < HOLD_EXCLUDES.length; i++) {
      expect(args[i * 2]).toBe('--exclude');
      expect(args[i * 2 + 1]).toBe(HOLD_EXCLUDES[i]);
    }
  });

  it('WU3: includes -trash/, s3-staging/, .DS_Store, and ._* patterns', () => {
    expect(HOLD_EXCLUDES).toContain('-trash/');
    expect(HOLD_EXCLUDES).toContain('s3-staging/');
    expect(HOLD_EXCLUDES).toContain('.DS_Store');
    expect(HOLD_EXCLUDES).toContain('._*');
  });

  it('WU3: holdProject rsync args include exclude patterns', async () => {
    const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'flihub-hold-'));
    try {
      lastSpawnArgs = null;
      mockSpawnShouldFail = false;
      const { projectDir, holdingRoot } = await createProjectFixture(tmpRoot);

      await holdProject(projectDir, holdingRoot);

      // Verify exclude args are present between -a and source path
      const args = lastSpawnArgs!.args;
      expect(args[0]).toBe('-a');
      expect(args).toContain('--exclude');
      expect(args).toContain('-trash/');
      expect(args).toContain('s3-staging/');
    } finally {
      await fs.rm(tmpRoot, { recursive: true, force: true });
    }
  });

  it('WU3: restoreFromHolding rsync args include exclude patterns', async () => {
    const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'flihub-hold-'));
    try {
      lastSpawnArgs = null;
      mockSpawnShouldFail = false;
      const holdingDir = path.join(tmpRoot, 'holding', 'b72-test-project');
      const localDir = path.join(tmpRoot, 'projects', 'b72-test-project');
      await fs.mkdir(holdingDir, { recursive: true });

      await restoreFromHolding(holdingDir, localDir);

      const args = lastSpawnArgs!.args;
      expect(args[0]).toBe('-a');
      expect(args).toContain('--exclude');
      expect(args).toContain('-trash/');
      expect(args).toContain('s3-staging/');
    } finally {
      await fs.rm(tmpRoot, { recursive: true, force: true });
    }
  });
});
