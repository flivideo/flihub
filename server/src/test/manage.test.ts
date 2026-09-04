import { vi, describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createManageRoutes } from '../routes/manage.js';
import type {
  Config,
  TranscriptionJob,
  UndoRenameResponse,
  SplitChapterResponse,
} from '../../../shared/types.js';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock renameRecording
const mockRenameRecording = vi.fn();
vi.mock('../utils/renameRecording.js', () => ({
  renameRecording: (...args: unknown[]) => mockRenameRecording(...args),
}));


// Mock chapterRecording (used by regen-chapters routes)
vi.mock('../utils/chapterRecording.js', () => ({
  generateChapterRecording: vi.fn().mockResolvedValue(undefined),
}));

// Mock videoDuration
vi.mock('../utils/videoDuration.js', () => ({
  getVideoDuration: vi.fn().mockResolvedValue(10),
}));

// Mock pathUtils
vi.mock('../utils/pathUtils.js', () => ({
  expandPath: (p: string) => p,
}));

// Mock fs-extra
vi.mock('fs-extra', () => ({
  default: {
    readdir: vi.fn().mockResolvedValue([]),
    pathExists: vi.fn().mockResolvedValue(false),
    rename: vi.fn().mockResolvedValue(undefined),
    ensureDir: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    existsSync: vi.fn().mockReturnValue(false),
  },
}));

// Mock shared/paths
vi.mock('../../../shared/paths.js', () => ({
  getProjectPaths: (projectPath: string) => ({
    project: projectPath,
    recordings: `${projectPath}/recordings`,
    transcripts: `${projectPath}/recording-transcripts`,
    chapters: `${projectPath}/recordings/-chapters`,
  }),
}));

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
    ...overrides,
  };
}

function createApp() {
  const config = makeConfig();
  const getConfig = () => config;
  const mockIo = { emit: vi.fn() } as unknown as Parameters<typeof createManageRoutes>[1];
  const queueTranscription = vi.fn();
  const getActiveJob = (): TranscriptionJob | null => null;
  const getQueue = (): TranscriptionJob[] => [];

  const router = createManageRoutes(
    getConfig,
    mockIo,
    queueTranscription,
    getActiveJob,
    getQueue
  );

  const app = express();
  app.use(express.json());
  app.use('/api/manage', router);

  return { app, mockIo };
}

// ---------------------------------------------------------------------------
// Tests: POST /api/manage/undo-rename
// ---------------------------------------------------------------------------

describe('POST /api/manage/undo-rename', () => {
  beforeEach(() => {
    mockRenameRecording.mockReset();
    mockPathExists.mockReset();
    mockPathExists.mockResolvedValue(true as never);
  });

  it('returns error when there is nothing to undo', async () => {
    const { app } = createApp();

    const res = await request(app).post('/api/manage/undo-rename').send();

    expect(res.status).toBe(200);
    const body: UndoRenameResponse = res.body;
    expect(body.success).toBe(false);
    expect(body.filesReverted).toBe(0);
    expect(body.error).toBe('Nothing to undo');
  });

  it('reverts all files after a successful bulk-rename', async () => {
    const { app } = createApp();

    // First, do a bulk rename that succeeds
    mockRenameRecording.mockResolvedValue({ success: true });

    await request(app).post('/api/manage/bulk-rename').send({
      files: ['01-1-intro.mov', '01-2-setup.mov'],
      label: 'renamed',
      sequenceMode: 'preserve',
    });

    // Now undo
    mockRenameRecording.mockReset();
    mockRenameRecording.mockResolvedValue({ success: true });

    const res = await request(app).post('/api/manage/undo-rename').send();

    expect(res.status).toBe(200);
    const body: UndoRenameResponse = res.body;
    expect(body.success).toBe(true);
    expect(body.filesReverted).toBe(2);

    // Verify renameRecording was called with swapped args (new -> old)
    expect(mockRenameRecording).toHaveBeenCalledTimes(2);

    // The undo calls should swap old/new filenames
    const calls = mockRenameRecording.mock.calls;
    // First arg is the current name (was "new"), second arg is the target (was "old")
    for (const call of calls) {
      // call[0] should be a "renamed" filename, call[1] should be an original filename
      expect(call[0]).toMatch(/renamed/);
      expect(call[1]).toMatch(/intro|setup/);
    }
  });

  it('clears undo mapping after undo — second undo returns error', async () => {
    const { app } = createApp();

    // Bulk rename
    mockRenameRecording.mockResolvedValue({ success: true });
    await request(app).post('/api/manage/bulk-rename').send({
      files: ['01-1-intro.mov'],
      label: 'renamed',
      sequenceMode: 'preserve',
    });

    // First undo succeeds
    mockRenameRecording.mockReset();
    mockRenameRecording.mockResolvedValue({ success: true });
    const res1 = await request(app).post('/api/manage/undo-rename').send();
    expect(res1.body.success).toBe(true);

    // Second undo fails — mapping was cleared
    const res2 = await request(app).post('/api/manage/undo-rename').send();
    expect(res2.body.success).toBe(false);
    expect(res2.body.error).toBe('Nothing to undo');
  });

  it('new bulk-rename overwrites previous undo mapping', async () => {
    const { app } = createApp();

    // First bulk rename
    mockRenameRecording.mockResolvedValue({ success: true });
    await request(app).post('/api/manage/bulk-rename').send({
      files: ['01-1-intro.mov'],
      label: 'first',
      sequenceMode: 'preserve',
    });

    // Second bulk rename (overwrites mapping)
    mockRenameRecording.mockReset();
    mockRenameRecording.mockResolvedValue({ success: true });
    await request(app).post('/api/manage/bulk-rename').send({
      files: ['02-1-demo.mov'],
      label: 'second',
      sequenceMode: 'preserve',
    });

    // Undo should revert the SECOND bulk rename only
    mockRenameRecording.mockReset();
    mockRenameRecording.mockResolvedValue({ success: true });
    const res = await request(app).post('/api/manage/undo-rename').send();

    expect(res.body.success).toBe(true);
    expect(res.body.filesReverted).toBe(1);

    // Should revert the second rename (02-1-second.mov -> 02-1-demo.mov)
    const call = mockRenameRecording.mock.calls[0];
    expect(call[0]).toMatch(/second/);
    expect(call[1]).toBe('02-1-demo.mov');
  });

  it('reverses in reverse order', async () => {
    const { app } = createApp();

    // Bulk rename 3 files
    mockRenameRecording.mockResolvedValue({ success: true });
    await request(app).post('/api/manage/bulk-rename').send({
      files: ['01-1-a.mov', '01-2-b.mov', '01-3-c.mov'],
      label: 'new',
      sequenceMode: 'preserve',
    });

    // Undo
    mockRenameRecording.mockReset();
    mockRenameRecording.mockResolvedValue({ success: true });
    await request(app).post('/api/manage/undo-rename').send();

    // The last renamed file should be undone first (reverse order)
    const calls = mockRenameRecording.mock.calls;
    expect(calls).toHaveLength(3);
    // call[1] is the target (original) filename — should be in reverse order
    expect(calls[0][1]).toBe('01-3-c.mov');
    expect(calls[1][1]).toBe('01-2-b.mov');
    expect(calls[2][1]).toBe('01-1-a.mov');
  });

  it('handles partial failure — reverts some files and reports errors', async () => {
    const { app } = createApp();

    // Bulk rename 2 files
    mockRenameRecording.mockResolvedValue({ success: true });
    await request(app).post('/api/manage/bulk-rename').send({
      files: ['01-1-intro.mov', '01-2-setup.mov'],
      label: 'renamed',
      sequenceMode: 'preserve',
    });

    // Undo — first succeeds, second fails
    mockRenameRecording.mockReset();
    mockRenameRecording
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: false, error: 'File not found' });

    const res = await request(app).post('/api/manage/undo-rename').send();

    const body: UndoRenameResponse = res.body;
    expect(body.success).toBe(false);
    expect(body.filesReverted).toBe(1);
    expect(body.error).toContain('File not found');
  });

  it('returns correct filesReverted count', async () => {
    const { app } = createApp();

    // Bulk rename 3 files
    mockRenameRecording.mockResolvedValue({ success: true });
    await request(app).post('/api/manage/bulk-rename').send({
      files: ['01-1-a.mov', '01-2-b.mov', '01-3-c.mov'],
      label: 'new',
      sequenceMode: 'preserve',
    });

    // Undo — 2 succeed, 1 fails
    mockRenameRecording.mockReset();
    mockRenameRecording
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: false, error: 'oops' })
      .mockResolvedValueOnce({ success: true });

    const res = await request(app).post('/api/manage/undo-rename').send();

    expect(res.body.filesReverted).toBe(2);
    expect(res.body.success).toBe(false);
  });

  it('bulk-rename response includes undoAvailable flag', async () => {
    const { app } = createApp();

    mockRenameRecording.mockResolvedValue({ success: true });

    const res = await request(app).post('/api/manage/bulk-rename').send({
      files: ['01-1-intro.mov'],
      label: 'renamed',
      sequenceMode: 'preserve',
    });

    expect(res.body.undoAvailable).toBe(true);
  });

  // -------------------------------------------------------------------------
  // B053: Stale filename handling
  // -------------------------------------------------------------------------

  describe('stale filename handling', () => {
    it('skips files that no longer exist at expected path and reports them', async () => {
      const { app } = createApp();

      // Bulk rename 2 files
      mockRenameRecording.mockResolvedValue({ success: true });
      await request(app).post('/api/manage/bulk-rename').send({
        files: ['01-1-intro.mov', '01-2-setup.mov'],
        label: 'renamed',
        sequenceMode: 'preserve',
      });

      // Simulate: one file was modified (inline rename) since the batch
      mockRenameRecording.mockReset();
      mockRenameRecording.mockResolvedValue({ success: true });
      mockPathExists.mockImplementation((filePath: string) => {
        if (filePath.includes('01-1-renamed.mov')) return Promise.resolve(false) as never;
        return Promise.resolve(true) as never;
      });

      const res = await request(app).post('/api/manage/undo-rename').send();

      const body: UndoRenameResponse = res.body;
      expect(body.success).toBe(false);
      expect(body.filesReverted).toBe(1);
      expect(body.error).toContain('Skipped');
      expect(body.error).toContain('file was modified since batch operation');
    });

    it('still reverts other files in the batch that are valid', async () => {
      const { app } = createApp();

      // Bulk rename 3 files
      mockRenameRecording.mockResolvedValue({ success: true });
      await request(app).post('/api/manage/bulk-rename').send({
        files: ['01-1-a.mov', '01-2-b.mov', '01-3-c.mov'],
        label: 'new',
        sequenceMode: 'preserve',
      });

      // Simulate: middle file was modified
      mockRenameRecording.mockReset();
      mockRenameRecording.mockResolvedValue({ success: true });
      mockPathExists.mockImplementation((filePath: string) => {
        if (filePath.includes('01-2-new.mov')) return Promise.resolve(false) as never;
        return Promise.resolve(true) as never;
      });

      const res = await request(app).post('/api/manage/undo-rename').send();

      // 2 files should have been reverted, 1 skipped
      expect(res.body.filesReverted).toBe(2);
      expect(mockRenameRecording).toHaveBeenCalledTimes(2);
    });

    it('returns success: false when some files were skipped', async () => {
      const { app } = createApp();

      mockRenameRecording.mockResolvedValue({ success: true });
      await request(app).post('/api/manage/bulk-rename').send({
        files: ['01-1-intro.mov', '01-2-setup.mov'],
        label: 'renamed',
        sequenceMode: 'preserve',
      });

      // Simulate: one file was modified
      mockRenameRecording.mockReset();
      mockRenameRecording.mockResolvedValue({ success: true });
      mockPathExists.mockImplementation((filePath: string) => {
        if (filePath.includes('01-2-renamed.mov')) return Promise.resolve(false) as never;
        return Promise.resolve(true) as never;
      });

      const res = await request(app).post('/api/manage/undo-rename').send();

      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Skipped');
    });

    it('returns success: true when all files were valid and reverted', async () => {
      const { app } = createApp();

      mockRenameRecording.mockResolvedValue({ success: true });
      await request(app).post('/api/manage/bulk-rename').send({
        files: ['01-1-intro.mov', '01-2-setup.mov'],
        label: 'renamed',
        sequenceMode: 'preserve',
      });

      // All files still exist at expected paths
      mockRenameRecording.mockReset();
      mockRenameRecording.mockResolvedValue({ success: true });
      mockPathExists.mockResolvedValue(true as never);

      const res = await request(app).post('/api/manage/undo-rename').send();

      expect(res.body.success).toBe(true);
      expect(res.body.filesReverted).toBe(2);
      expect(res.body.error).toBeUndefined();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests: POST /api/manage/split-chapter
// ---------------------------------------------------------------------------

import fs from 'fs-extra';
const mockReaddir = vi.mocked(fs.readdir);
const mockPathExists = vi.mocked(fs.pathExists);
const mockRemove = vi.mocked(fs.remove);
const mockExistsSync = vi.mocked(fs.existsSync);

describe('POST /api/manage/split-chapter', () => {
  beforeEach(() => {
    mockRenameRecording.mockReset();
    mockReaddir.mockReset();
  });

  it('basic split: ch04 seq 11+ moves to ch05 (no existing ch05)', async () => {
    const { app } = createApp();

    mockReaddir.mockResolvedValue([
      '04-1-intro.mov',
      '04-5-setup.mov',
      '04-11-demo.mov',
      '04-12-outro.mov',
    ] as unknown as never);
    mockRenameRecording.mockResolvedValue({ success: true });

    const res = await request(app).post('/api/manage/split-chapter').send({
      chapter: '04',
      splitAtSequence: 11,
    });

    const body: SplitChapterResponse = res.body;
    expect(body.success).toBe(true);
    expect(body.sourceChapter).toBe('04');
    expect(body.newChapter).toBe('05');
    expect(body.filesMoved).toBe(2);
    expect(body.cascadedChapters).toBe(0);
    expect(body.undoMapping).toHaveLength(2);
  });

  it('split with single cascade: ch04 split, ch05 exists → ch05 pushed to ch06', async () => {
    const { app } = createApp();

    mockReaddir.mockResolvedValue([
      '04-1-intro.mov',
      '04-2-setup.mov',
      '04-3-demo.mov',
      '05-1-existing.mov',
    ] as unknown as never);
    mockRenameRecording.mockResolvedValue({ success: true });

    const res = await request(app).post('/api/manage/split-chapter').send({
      chapter: '04',
      splitAtSequence: 3,
    });

    const body: SplitChapterResponse = res.body;
    expect(body.success).toBe(true);
    expect(body.newChapter).toBe('05');
    expect(body.filesMoved).toBe(1);
    expect(body.cascadedChapters).toBe(1);

    // First rename call should be the cascade (05→06), then the move (04→05)
    const calls = mockRenameRecording.mock.calls;
    // Cascade: 05-1-existing.mov → 06-1-existing.mov
    expect(calls[0][0]).toBe('05-1-existing.mov');
    expect(calls[0][1]).toMatch(/^06-1-existing/);
    // Move: 04-3-demo.mov → 05-1-demo.mov
    expect(calls[1][0]).toBe('04-3-demo.mov');
    expect(calls[1][1]).toMatch(/^05-1-demo/);
  });

  it('split with multi-cascade: ch04 split, ch05+ch06+ch07 exist → all pushed up', async () => {
    const { app } = createApp();

    mockReaddir.mockResolvedValue([
      '04-1-intro.mov',
      '04-2-middle.mov',
      '05-1-a.mov',
      '06-1-b.mov',
      '07-1-c.mov',
    ] as unknown as never);
    mockRenameRecording.mockResolvedValue({ success: true });

    const res = await request(app).post('/api/manage/split-chapter').send({
      chapter: '04',
      splitAtSequence: 2,
    });

    const body: SplitChapterResponse = res.body;
    expect(body.success).toBe(true);
    expect(body.cascadedChapters).toBe(3);
    expect(body.filesMoved).toBe(1);

    // Cascade order: 07→08, 06→07, 05→06 (descending), then move 04→05
    const calls = mockRenameRecording.mock.calls;
    expect(calls[0][0]).toBe('07-1-c.mov');
    expect(calls[0][1]).toMatch(/^08-1-c/);
    expect(calls[1][0]).toBe('06-1-b.mov');
    expect(calls[1][1]).toMatch(/^07-1-b/);
    expect(calls[2][0]).toBe('05-1-a.mov');
    expect(calls[2][1]).toMatch(/^06-1-a/);
    expect(calls[3][0]).toBe('04-2-middle.mov');
    expect(calls[3][1]).toMatch(/^05-1-middle/);
  });

  it('guard: reject if cascade would push past ch99', async () => {
    const { app } = createApp();

    mockReaddir.mockResolvedValue([
      '98-1-intro.mov',
      '98-2-outro.mov',
      '99-1-last.mov',
    ] as unknown as never);

    const res = await request(app).post('/api/manage/split-chapter').send({
      chapter: '98',
      splitAtSequence: 2,
    });

    const body: SplitChapterResponse = res.body;
    expect(body.success).toBe(false);
    expect(body.error).toContain('past limit');
    expect(mockRenameRecording).not.toHaveBeenCalled();
  });

  it('sequences in new chapter renumbered starting from 1', async () => {
    const { app } = createApp();

    mockReaddir.mockResolvedValue([
      '04-5-alpha.mov',
      '04-8-beta.mov',
      '04-11-gamma.mov',
    ] as unknown as never);
    mockRenameRecording.mockResolvedValue({ success: true });

    const res = await request(app).post('/api/manage/split-chapter').send({
      chapter: '04',
      splitAtSequence: 8,
    });

    const body: SplitChapterResponse = res.body;
    expect(body.success).toBe(true);
    expect(body.filesMoved).toBe(2);

    // Move calls: 04-8-beta → 05-1-beta, 04-11-gamma → 05-2-gamma
    const calls = mockRenameRecording.mock.calls;
    expect(calls[0][1]).toMatch(/^05-1-beta/);
    expect(calls[1][1]).toMatch(/^05-2-gamma/);
  });

  it('no files to split → error response', async () => {
    const { app } = createApp();

    mockReaddir.mockResolvedValue([
      '04-1-intro.mov',
      '04-2-setup.mov',
    ] as unknown as never);

    const res = await request(app).post('/api/manage/split-chapter').send({
      chapter: '04',
      splitAtSequence: 10,
    });

    const body: SplitChapterResponse = res.body;
    expect(body.success).toBe(false);
    expect(body.error).toBe('No files to split');
  });

  it('invalid chapter (not 2 digits) → error', async () => {
    const { app } = createApp();

    const res = await request(app).post('/api/manage/split-chapter').send({
      chapter: '4',
      splitAtSequence: 3,
    });

    const body: SplitChapterResponse = res.body;
    expect(body.success).toBe(false);
    expect(body.error).toContain('2-digit');
  });

  it('splitAtSequence = 1 moves all files to new chapter', async () => {
    const { app } = createApp();

    mockReaddir.mockResolvedValue([
      '04-1-intro.mov',
      '04-2-setup.mov',
      '04-3-demo.mov',
    ] as unknown as never);
    mockRenameRecording.mockResolvedValue({ success: true });

    const res = await request(app).post('/api/manage/split-chapter').send({
      chapter: '04',
      splitAtSequence: 1,
    });

    const body: SplitChapterResponse = res.body;
    expect(body.success).toBe(true);
    expect(body.filesMoved).toBe(3);
    expect(body.newChapter).toBe('05');
  });

  it('returns correct undoMapping array', async () => {
    const { app } = createApp();

    mockReaddir.mockResolvedValue([
      '04-1-intro.mov',
      '04-3-demo.mov',
    ] as unknown as never);
    mockRenameRecording.mockResolvedValue({ success: true });

    const res = await request(app).post('/api/manage/split-chapter').send({
      chapter: '04',
      splitAtSequence: 3,
    });

    const body: SplitChapterResponse = res.body;
    expect(body.undoMapping).toHaveLength(1);
    expect(body.undoMapping[0].oldFilename).toBe('04-3-demo.mov');
    expect(body.undoMapping[0].newFilename).toMatch(/^05-1-demo/);
  });

  it('socket event recordings:changed emitted on success', async () => {
    const { app, mockIo } = createApp();

    mockReaddir.mockResolvedValue([
      '04-1-intro.mov',
      '04-2-demo.mov',
    ] as unknown as never);
    mockRenameRecording.mockResolvedValue({ success: true });

    await request(app).post('/api/manage/split-chapter').send({
      chapter: '04',
      splitAtSequence: 2,
    });

    expect(mockIo.emit).toHaveBeenCalledWith('recordings:changed');
  });

  it('returns success: true with correct counts', async () => {
    const { app } = createApp();

    mockReaddir.mockResolvedValue([
      '02-1-intro.mov',
      '02-2-setup.mov',
      '02-3-demo.mov',
      '03-1-outro.mov',
    ] as unknown as never);
    mockRenameRecording.mockResolvedValue({ success: true });

    const res = await request(app).post('/api/manage/split-chapter').send({
      chapter: '02',
      splitAtSequence: 3,
    });

    const body: SplitChapterResponse = res.body;
    expect(body.success).toBe(true);
    expect(body.sourceChapter).toBe('02');
    expect(body.newChapter).toBe('03');
    expect(body.filesMoved).toBe(1);
    expect(body.cascadedChapters).toBe(1);
    // cascade: 03-1-outro → 04-1-outro (1 call), move: 02-3-demo → 03-1-demo (1 call)
    expect(mockRenameRecording).toHaveBeenCalledTimes(2);
  });

  it('invalid splitAtSequence (zero) → error', async () => {
    const { app } = createApp();

    const res = await request(app).post('/api/manage/split-chapter').send({
      chapter: '04',
      splitAtSequence: 0,
    });

    const body: SplitChapterResponse = res.body;
    expect(body.success).toBe(false);
    expect(body.error).toContain('positive integer');
  });
});

// ---------------------------------------------------------------------------
// Tests: POST /api/manage/split-chapter — tag preservation (B050)
// ---------------------------------------------------------------------------

describe('POST /api/manage/split-chapter — tag preservation', () => {
  beforeEach(() => {
    mockRenameRecording.mockReset();
    mockReaddir.mockReset();
  });

  it('preserves tags on cascaded files (e.g. CTA tag survives ch04→ch05)', async () => {
    const { app } = createApp();

    mockReaddir.mockResolvedValue([
      '04-1-intro.mov',
      '04-2-demo.mov',
      '05-1-existing-CTA.mov',
    ] as unknown as never);
    mockRenameRecording.mockResolvedValue({ success: true });

    const res = await request(app).post('/api/manage/split-chapter').send({
      chapter: '04',
      splitAtSequence: 2,
    });

    const body: SplitChapterResponse = res.body;
    expect(body.success).toBe(true);

    // Cascade: 05-1-existing-CTA.mov → 06-1-existing-CTA.mov (tag preserved)
    const calls = mockRenameRecording.mock.calls;
    expect(calls[0][0]).toBe('05-1-existing-CTA.mov');
    expect(calls[0][1]).toBe('06-1-existing-CTA.mov');
  });

  it('preserves tags on moved files (split files keep their tags)', async () => {
    const { app } = createApp();

    mockReaddir.mockResolvedValue([
      '04-1-intro.mov',
      '04-3-demo-CTA.mov',
    ] as unknown as never);
    mockRenameRecording.mockResolvedValue({ success: true });

    const res = await request(app).post('/api/manage/split-chapter').send({
      chapter: '04',
      splitAtSequence: 3,
    });

    const body: SplitChapterResponse = res.body;
    expect(body.success).toBe(true);

    // Move: 04-3-demo-CTA.mov → 05-1-demo-CTA.mov (tag preserved)
    const calls = mockRenameRecording.mock.calls;
    expect(calls[0][0]).toBe('04-3-demo-CTA.mov');
    expect(calls[0][1]).toBe('05-1-demo-CTA.mov');
  });

  it('preserves multiple tags on files with more than one tag', async () => {
    const { app } = createApp();

    mockReaddir.mockResolvedValue([
      '04-1-intro.mov',
      '04-5-demo-setup-SKOOL-V2.mov',
    ] as unknown as never);
    mockRenameRecording.mockResolvedValue({ success: true });

    const res = await request(app).post('/api/manage/split-chapter').send({
      chapter: '04',
      splitAtSequence: 5,
    });

    const body: SplitChapterResponse = res.body;
    expect(body.success).toBe(true);

    // Move: 04-5-demo-setup-SKOOL-V2.mov → 05-1-demo-setup-SKOOL-V2.mov (both tags preserved)
    const calls = mockRenameRecording.mock.calls;
    expect(calls[0][0]).toBe('04-5-demo-setup-SKOOL-V2.mov');
    expect(calls[0][1]).toBe('05-1-demo-setup-SKOOL-V2.mov');
  });
});

// ---------------------------------------------------------------------------
// Tests: POST /api/manage/split-chapter — undo mapping (B051)
// ---------------------------------------------------------------------------

describe('POST /api/manage/split-chapter — undo mapping', () => {
  beforeEach(() => {
    mockRenameRecording.mockReset();
    mockReaddir.mockReset();
  });

  it('stores lastBatchMapping so undo-rename works after split', async () => {
    const { app } = createApp();

    mockReaddir.mockResolvedValue([
      '04-1-intro.mov',
      '04-3-demo.mov',
    ] as unknown as never);
    mockRenameRecording.mockResolvedValue({ success: true });

    // Perform split
    await request(app).post('/api/manage/split-chapter').send({
      chapter: '04',
      splitAtSequence: 3,
    });

    // Undo should find the stored mapping
    const undoRes = await request(app).post('/api/manage/undo-rename').send();
    const undoBody: UndoRenameResponse = undoRes.body;
    expect(undoBody.success).toBe(true);
    expect(undoBody.filesReverted).toBe(1);
  });

  it('undo after split reverts all cascade and move renames', async () => {
    const { app } = createApp();

    mockReaddir.mockResolvedValue([
      '04-1-intro.mov',
      '04-2-demo.mov',
      '05-1-existing.mov',
    ] as unknown as never);
    mockRenameRecording.mockResolvedValue({ success: true });

    // Perform split (cascade 05→06, then move 04-2→05-1)
    await request(app).post('/api/manage/split-chapter').send({
      chapter: '04',
      splitAtSequence: 2,
    });

    // Reset to track undo calls separately
    mockRenameRecording.mockClear();
    mockRenameRecording.mockResolvedValue({ success: true });

    // Undo should revert both the cascade and the move
    const undoRes = await request(app).post('/api/manage/undo-rename').send();
    const undoBody: UndoRenameResponse = undoRes.body;
    expect(undoBody.success).toBe(true);
    expect(undoBody.filesReverted).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Tests: DELETE /api/manage/delete-subfolder
// ---------------------------------------------------------------------------

describe('DELETE /api/manage/delete-subfolder', () => {
  beforeEach(() => {
    mockExistsSync.mockReset();
    mockExistsSync.mockReturnValue(false);
    mockReaddir.mockReset();
    mockReaddir.mockResolvedValue([] as unknown as never);
    mockRemove.mockReset();
    mockRemove.mockResolvedValue(undefined as never);
  });

  it('returns 400 for missing subfolder', async () => {
    const { app } = createApp();

    const res = await request(app).delete('/api/manage/delete-subfolder').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Missing subfolder/);
  });

  it('returns 400 for disallowed subfolder (recordings)', async () => {
    const { app } = createApp();

    const res = await request(app)
      .delete('/api/manage/delete-subfolder')
      .send({ subfolder: 'recordings' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not deletable/);
  });

  it('returns 400 for disallowed subfolder (recording-transcripts)', async () => {
    const { app } = createApp();

    const res = await request(app)
      .delete('/api/manage/delete-subfolder')
      .send({ subfolder: 'recording-transcripts' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not deletable/);
  });

  it('returns deleted: 0 when folder does not exist', async () => {
    const { app } = createApp();
    mockExistsSync.mockReturnValue(false);

    const res = await request(app)
      .delete('/api/manage/delete-subfolder')
      .send({ subfolder: 'edit-2nd' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, deleted: 0 });
  });

  it('deletes files for allowed subfolder and returns count', async () => {
    const { app } = createApp();
    mockExistsSync.mockReturnValue(true);
    mockReaddir.mockResolvedValue([
      'file1.mp4',
      'file2.mp4',
      'subdir',
    ] as unknown as never);

    const res = await request(app)
      .delete('/api/manage/delete-subfolder')
      .send({ subfolder: 'edit-2nd' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.deleted).toBe(3);
    expect(res.body.subfolder).toBe('edit-2nd');

    // Verify fs.remove was called for each entry
    expect(mockRemove).toHaveBeenCalledTimes(3);
    expect(mockRemove).toHaveBeenCalledWith('/tmp/project/edit-2nd/file1.mp4');
    expect(mockRemove).toHaveBeenCalledWith('/tmp/project/edit-2nd/file2.mp4');
    expect(mockRemove).toHaveBeenCalledWith('/tmp/project/edit-2nd/subdir');
  });

  it('leaves the folder itself intact after deletion', async () => {
    const { app } = createApp();
    mockExistsSync.mockReturnValue(true);
    mockReaddir.mockResolvedValue(['only-file.txt'] as unknown as never);

    await request(app)
      .delete('/api/manage/delete-subfolder')
      .send({ subfolder: 'final' });

    // fs.remove should only be called for the file, not the folder itself
    expect(mockRemove).toHaveBeenCalledTimes(1);
    expect(mockRemove).toHaveBeenCalledWith('/tmp/project/final/only-file.txt');
    // The folder path itself should NOT be passed to remove
    expect(mockRemove).not.toHaveBeenCalledWith('/tmp/project/final');
  });
});
