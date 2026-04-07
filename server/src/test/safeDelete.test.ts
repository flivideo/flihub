// B062 Wave 2: Unit tests for safeDelete utility
import { vi, describe, it, expect, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — must be declared before imports
// ---------------------------------------------------------------------------

vi.mock('fs-extra', () => ({
  default: { pathExists: vi.fn() }
}));

vi.mock('fs/promises', () => ({
  readdir: vi.fn(),
  stat: vi.fn(),
  unlink: vi.fn(),
}));

// Imports after vi.mock()
import fsExtra from 'fs-extra';
import * as fsPromises from 'fs/promises';
import { safeDelete, SafeDeleteRule } from '../utils/safeDelete.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRule(overrides: Partial<SafeDeleteRule> = {}): SafeDeleteRule {
  return {
    rootDir: '/projects/my-project',
    allowedSuffix: '-trash',
    description: 'project trash folder',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('safeDelete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Step 1: rootDir must be non-empty
  it('rejects empty rootDir', async () => {
    const rule = makeRule({ rootDir: '' });
    const result = await safeDelete('/projects/my-project/-trash', rule);

    expect(result.success).toBe(false);
    expect(result.deleted).toHaveLength(0);
    expect(result.error).toContain('not configured');
  });

  it('rejects whitespace-only rootDir', async () => {
    const rule = makeRule({ rootDir: '   ' });
    const result = await safeDelete('/projects/my-project/-trash', rule);

    expect(result.success).toBe(false);
    expect(result.error).toContain('not configured');
  });

  // Step 2: rootDir must exist on disk
  it('rejects non-existent rootDir', async () => {
    // pathExists: false for root check (first call), irrelevant after
    vi.mocked(fsExtra.pathExists).mockResolvedValueOnce(false as never);

    const rule = makeRule({ rootDir: '/projects/missing-root' });
    const result = await safeDelete('/projects/missing-root/-trash', rule);

    expect(result.success).toBe(false);
    expect(result.deleted).toHaveLength(0);
    expect(result.error).toContain('does not exist');
  });

  // Step 3: targetPath must be non-empty
  it('rejects empty targetPath', async () => {
    vi.mocked(fsExtra.pathExists).mockResolvedValueOnce(true as never); // rootDir exists

    const rule = makeRule();
    const result = await safeDelete('', rule);

    expect(result.success).toBe(false);
    expect(result.deleted).toHaveLength(0);
    expect(result.error).toContain('empty');
  });

  it('rejects whitespace-only targetPath', async () => {
    vi.mocked(fsExtra.pathExists).mockResolvedValueOnce(true as never); // rootDir exists

    const rule = makeRule();
    const result = await safeDelete('   ', rule);

    expect(result.success).toBe(false);
    expect(result.error).toContain('empty');
  });

  // Step 4: targetPath must exist on disk
  it('rejects non-existent targetPath', async () => {
    vi.mocked(fsExtra.pathExists)
      .mockResolvedValueOnce(true as never)   // rootDir exists
      .mockResolvedValueOnce(false as never); // targetPath does not exist

    const rule = makeRule();
    const result = await safeDelete('/projects/my-project/-trash', rule);

    expect(result.success).toBe(false);
    expect(result.deleted).toHaveLength(0);
    expect(result.error).toContain('does not exist');
  });

  // Step 5: targetPath must be within rootDir
  it('rejects path outside rootDir', async () => {
    vi.mocked(fsExtra.pathExists)
      .mockResolvedValueOnce(true as never)  // rootDir exists
      .mockResolvedValueOnce(true as never); // targetPath exists

    const rule = makeRule({ rootDir: '/projects' });
    const result = await safeDelete('/tmp/evil/-trash', rule);

    expect(result.success).toBe(false);
    expect(result.deleted).toHaveLength(0);
    expect(result.error).toContain('outside');
  });

  // Step 6: last segment must match allowedSuffix
  it('rejects wrong suffix', async () => {
    vi.mocked(fsExtra.pathExists)
      .mockResolvedValueOnce(true as never)  // rootDir exists
      .mockResolvedValueOnce(true as never); // targetPath exists

    const rule = makeRule({ allowedSuffix: '-trash' });
    // Target ends in '-recordings', not '-trash'
    const result = await safeDelete('/projects/my-project/-recordings', rule);

    expect(result.success).toBe(false);
    expect(result.deleted).toHaveLength(0);
    expect(result.error).toContain('does not match');
    expect(result.error).toContain('-trash');
  });

  // Happy path: all checks pass, files get deleted
  it('deletes files inside the target folder and returns them', async () => {
    vi.mocked(fsExtra.pathExists)
      .mockResolvedValueOnce(true as never)  // rootDir exists
      .mockResolvedValueOnce(true as never); // targetPath exists

    // readdir returns 2 files
    const mockEntries = [
      { name: 'clip-01.mov', isFile: () => true },
      { name: 'clip-02.mov', isFile: () => true },
    ];
    vi.mocked(fsPromises.readdir).mockResolvedValue(mockEntries as any);

    // stat returns sizes
    vi.mocked(fsPromises.stat)
      .mockResolvedValueOnce({ size: 1024 } as any)
      .mockResolvedValueOnce({ size: 2048 } as any);

    // unlink resolves successfully
    vi.mocked(fsPromises.unlink).mockResolvedValue(undefined);

    const rule = makeRule();
    const result = await safeDelete('/projects/my-project/-trash', rule);

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
    expect(result.deleted).toHaveLength(2);
    expect(result.deleted).toContainEqual({ name: 'clip-01.mov', size: 1024 });
    expect(result.deleted).toContainEqual({ name: 'clip-02.mov', size: 2048 });

    // unlink called for each file
    expect(fsPromises.unlink).toHaveBeenCalledTimes(2);
    expect(fsPromises.unlink).toHaveBeenCalledWith('/projects/my-project/-trash/clip-01.mov');
    expect(fsPromises.unlink).toHaveBeenCalledWith('/projects/my-project/-trash/clip-02.mov');
  });

  it('returns empty deleted array and success: true when folder is already empty', async () => {
    vi.mocked(fsExtra.pathExists)
      .mockResolvedValueOnce(true as never)
      .mockResolvedValueOnce(true as never);

    vi.mocked(fsPromises.readdir).mockResolvedValue([]);

    const rule = makeRule();
    const result = await safeDelete('/projects/my-project/-trash', rule);

    expect(result.success).toBe(true);
    expect(result.deleted).toHaveLength(0);
    expect(fsPromises.unlink).not.toHaveBeenCalled();
  });
});
