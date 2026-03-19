import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  checkTranscriptionQueue,
  migrateRecordingKey,
  updateManifestFilename,
} from '../utils/renameRecording.js';
import type { TranscriptionJob, ProjectState } from '../../../shared/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeJob(videoFilename: string): TranscriptionJob {
  return {
    jobId: 'test-job',
    videoPath: `/project/recordings/${videoFilename}`,
    videoFilename,
    status: 'transcribing',
  };
}

function makeState(overrides: Partial<ProjectState> = {}): ProjectState {
  return {
    version: 1,
    recordings: {},
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// checkTranscriptionQueue
// ---------------------------------------------------------------------------

describe('checkTranscriptionQueue', () => {
  it('returns false when there is no active job and the queue is empty', () => {
    expect(checkTranscriptionQueue('01-1-intro.mov', null, [])).toBe(false);
  });

  it('returns true when the filename matches the active job (same base name)', () => {
    const activeJob = makeJob('01-1-intro.mov');
    expect(checkTranscriptionQueue('01-1-intro.mov', activeJob, [])).toBe(true);
  });

  it('returns false when the active job is for a different file', () => {
    const activeJob = makeJob('02-1-setup.mov');
    expect(checkTranscriptionQueue('01-1-intro.mov', activeJob, [])).toBe(false);
  });

  it('returns true when the filename matches a queued job (same base name)', () => {
    const queuedJob = makeJob('03-2-demo.mov');
    expect(checkTranscriptionQueue('03-2-demo.mov', null, [queuedJob])).toBe(true);
  });

  it('returns false when the filename does not match any queued job', () => {
    const queuedJob = makeJob('03-2-demo.mov');
    expect(checkTranscriptionQueue('01-1-intro.mov', null, [queuedJob])).toBe(false);
  });

  it('returns true when the filename matches a job deeper in the queue', () => {
    const queue = [makeJob('03-2-demo.mov'), makeJob('04-1-cta.mov')];
    expect(checkTranscriptionQueue('04-1-cta.mov', null, queue)).toBe(true);
  });

  it('compares base names without extension — .mov and .mp4 are the same base', () => {
    // Active job stored as .mp4, rename request uses .mov
    const activeJob = makeJob('01-1-intro.mp4');
    // Base of 'intro.mp4' != base of '01-1-intro' so this should be false (different base)
    expect(checkTranscriptionQueue('01-1-intro.mov', activeJob, [])).toBe(true);
  });

  it('returns false when active job exists but queue is searched — active mismatch, queue empty', () => {
    const activeJob = makeJob('99-9-unrelated.mov');
    expect(checkTranscriptionQueue('01-1-intro.mov', activeJob, [])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// migrateRecordingKey
// ---------------------------------------------------------------------------

describe('migrateRecordingKey', () => {
  it('returns the state unchanged when the old filename has no entry in recordings', () => {
    const state = makeState({ recordings: { 'other-file.mov': { safe: false } } });
    const result = migrateRecordingKey(state, 'missing.mov', 'new.mov');
    expect(result).toBe(state); // exact same reference
  });

  it('moves the recording entry from oldFilename key to newFilename key', () => {
    const state = makeState({
      recordings: { '01-1-intro.mov': { safe: true, parked: false } },
    });
    const result = migrateRecordingKey(state, '01-1-intro.mov', '01-1-introduction.mov');
    expect(result.recordings['01-1-intro.mov']).toBeUndefined();
    expect(result.recordings['01-1-introduction.mov']).toEqual({ safe: true, parked: false });
  });

  it('preserves all other recording entries that were not renamed', () => {
    const state = makeState({
      recordings: {
        '01-1-intro.mov': { safe: true },
        '02-1-setup.mov': { parked: true, annotation: 'skip' },
      },
    });
    const result = migrateRecordingKey(state, '01-1-intro.mov', '01-1-introduction.mov');
    expect(result.recordings['02-1-setup.mov']).toEqual({ parked: true, annotation: 'skip' });
  });

  it('does not mutate the original state object', () => {
    const state = makeState({
      recordings: { '01-1-intro.mov': { safe: true } },
    });
    migrateRecordingKey(state, '01-1-intro.mov', '01-1-new.mov');
    // Original state should still have the old key
    expect(state.recordings['01-1-intro.mov']).toBeDefined();
  });

  it('works when recordings object is empty', () => {
    const state = makeState({ recordings: {} });
    const result = migrateRecordingKey(state, 'old.mov', 'new.mov');
    expect(result).toBe(state);
    expect(result.recordings).toEqual({});
  });

  it('preserves all other top-level state fields (version, glingDictionary, editManifest)', () => {
    const state: ProjectState = {
      version: 1,
      recordings: { '01-1-intro.mov': { safe: false } },
      glingDictionary: ['AppyDave', 'BMAD'],
    };
    const result = migrateRecordingKey(state, '01-1-intro.mov', '01-1-new.mov');
    expect(result.version).toBe(1);
    expect(result.glingDictionary).toEqual(['AppyDave', 'BMAD']);
  });
});

// ---------------------------------------------------------------------------
// updateManifestFilename
// ---------------------------------------------------------------------------

describe('updateManifestFilename', () => {
  it('returns the state unchanged when there is no editManifest', () => {
    const state = makeState({ recordings: {} });
    const result = updateManifestFilename(state, 'old.mov', 'new.mov');
    expect(result).toBe(state);
  });

  it('updates the filename in edit-1st folder manifest', () => {
    const state = makeState({
      editManifest: {
        'edit-1st': {
          lastCopied: '2026-01-01T00:00:00.000Z',
          files: [{ filename: '01-1-intro.mov', sourceHash: 'abc123', copiedAt: '2026-01-01T00:00:00.000Z', sourceSize: 1000 }],
        },
        'edit-2nd': { lastCopied: null, files: [] },
        'edit-final': { lastCopied: null, files: [] },
      },
    });
    const result = updateManifestFilename(state, '01-1-intro.mov', '01-1-introduction.mov');
    expect(result.editManifest!['edit-1st'].files[0].filename).toBe('01-1-introduction.mov');
  });

  it('updates the filename in edit-2nd folder manifest', () => {
    const state = makeState({
      editManifest: {
        'edit-1st': { lastCopied: null, files: [] },
        'edit-2nd': {
          lastCopied: '2026-01-01T00:00:00.000Z',
          files: [{ filename: '02-1-setup.mov', sourceHash: 'def456', copiedAt: '2026-01-01T00:00:00.000Z', sourceSize: 2000 }],
        },
        'edit-final': { lastCopied: null, files: [] },
      },
    });
    const result = updateManifestFilename(state, '02-1-setup.mov', '02-1-setup-v2.mov');
    expect(result.editManifest!['edit-2nd'].files[0].filename).toBe('02-1-setup-v2.mov');
  });

  it('updates the filename in edit-final folder manifest', () => {
    const state = makeState({
      editManifest: {
        'edit-1st': { lastCopied: null, files: [] },
        'edit-2nd': { lastCopied: null, files: [] },
        'edit-final': {
          lastCopied: '2026-01-01T00:00:00.000Z',
          files: [{ filename: '03-1-cta.mov', sourceHash: 'ghi789', copiedAt: '2026-01-01T00:00:00.000Z', sourceSize: 500 }],
        },
      },
    });
    const result = updateManifestFilename(state, '03-1-cta.mov', '03-1-cta-new.mov');
    expect(result.editManifest!['edit-final'].files[0].filename).toBe('03-1-cta-new.mov');
  });

  it('leaves files with non-matching filenames unchanged in a folder', () => {
    const state = makeState({
      editManifest: {
        'edit-1st': {
          lastCopied: null,
          files: [
            { filename: '01-1-intro.mov', sourceHash: 'aaa', copiedAt: '2026-01-01T00:00:00.000Z', sourceSize: 100 },
            { filename: '02-1-setup.mov', sourceHash: 'bbb', copiedAt: '2026-01-01T00:00:00.000Z', sourceSize: 200 },
          ],
        },
        'edit-2nd': { lastCopied: null, files: [] },
        'edit-final': { lastCopied: null, files: [] },
      },
    });
    const result = updateManifestFilename(state, '01-1-intro.mov', '01-1-introduction.mov');
    const files = result.editManifest!['edit-1st'].files;
    expect(files[0].filename).toBe('01-1-introduction.mov');
    expect(files[1].filename).toBe('02-1-setup.mov'); // unchanged
  });

  it('does not mutate the original state object', () => {
    const state = makeState({
      editManifest: {
        'edit-1st': {
          lastCopied: null,
          files: [{ filename: '01-1-intro.mov', sourceHash: 'aaa', copiedAt: '2026-01-01T00:00:00.000Z', sourceSize: 100 }],
        },
        'edit-2nd': { lastCopied: null, files: [] },
        'edit-final': { lastCopied: null, files: [] },
      },
    });
    updateManifestFilename(state, '01-1-intro.mov', '01-1-new.mov');
    // Original manifest should be unchanged
    expect(state.editManifest!['edit-1st'].files[0].filename).toBe('01-1-intro.mov');
  });

  it('handles an old filename not present in any folder without crashing', () => {
    const state = makeState({
      editManifest: {
        'edit-1st': {
          lastCopied: null,
          files: [{ filename: '99-1-other.mov', sourceHash: 'zzz', copiedAt: '2026-01-01T00:00:00.000Z', sourceSize: 999 }],
        },
        'edit-2nd': { lastCopied: null, files: [] },
        'edit-final': { lastCopied: null, files: [] },
      },
    });
    const result = updateManifestFilename(state, 'missing.mov', 'new.mov');
    // No crash and the unrelated file is untouched
    expect(result.editManifest!['edit-1st'].files[0].filename).toBe('99-1-other.mov');
  });

  it('preserves non-filename fields on each manifest file entry', () => {
    const state = makeState({
      editManifest: {
        'edit-1st': {
          lastCopied: '2026-02-01T00:00:00.000Z',
          files: [{ filename: '01-1-intro.mov', sourceHash: 'hash-xyz', copiedAt: '2026-02-01T10:00:00.000Z', sourceSize: 4000 }],
        },
        'edit-2nd': { lastCopied: null, files: [] },
        'edit-final': { lastCopied: null, files: [] },
      },
    });
    const result = updateManifestFilename(state, '01-1-intro.mov', '01-1-introduction.mov');
    const file = result.editManifest!['edit-1st'].files[0];
    expect(file.sourceHash).toBe('hash-xyz');
    expect(file.copiedAt).toBe('2026-02-01T10:00:00.000Z');
    expect(file.sourceSize).toBe(4000);
  });
});

// ---------------------------------------------------------------------------
// renameRecording — main pipeline orchestration (B028)
// ---------------------------------------------------------------------------
//
// Mocking strategy:
//   renameRecording() calls deleteDerivableFiles / renameCoreFiles /
//   regenerateDerivableFiles via direct ESM references — vi.spyOn on the
//   exported bindings cannot intercept those internal calls.
//
//   Instead we track phase execution through the mocked dependencies:
//     delete phase  → fs.unlink  (deleteDerivableFiles calls fs.unlink per file)
//     rename phase  → fs.rename  (renameCoreFiles calls fs.rename)
//     regen phase   → createShadowFile (regenerateDerivableFiles calls createShadowFile)
//
// Mock fs-extra so file system calls don't touch disk
vi.mock('fs-extra', () => ({
  default: {
    pathExists: vi.fn().mockResolvedValue(false),
    rename: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockResolvedValue('{}'),
    writeFile: vi.fn().mockResolvedValue(undefined),
    ensureDir: vi.fn().mockResolvedValue(undefined),
    readdir: vi.fn().mockResolvedValue([]),
    unlink: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock projectState so renameCoreFiles doesn't need a real disk state file
vi.mock('../utils/projectState.js', () => ({
  readProjectState: vi.fn().mockResolvedValue({ version: 1, recordings: {} }),
  writeProjectState: vi.fn().mockResolvedValue(undefined),
}));

// Mock shadowFiles so regenerateDerivableFiles doesn't spawn ffmpeg
vi.mock('../utils/shadowFiles.js', () => ({
  createShadowFile: vi.fn().mockResolvedValue({ success: true, shadowPath: '/fake/shadow.mp4' }),
}));

describe('renameRecording', () => {
  let renameRecording: typeof import('../utils/renameRecording.js').renameRecording;
  let fsMock: typeof import('fs-extra').default;
  let createShadowFileMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../utils/renameRecording.js');
    renameRecording = mod.renameRecording;

    // Grab references to mocked objects so tests can assert / override them
    const fsExtra = await import('fs-extra');
    fsMock = fsExtra.default;

    const shadowMod = await import('../utils/shadowFiles.js');
    createShadowFileMock = shadowMod.createShadowFile as ReturnType<typeof vi.fn>;
  });

  /** Build a minimal ProjectPaths fixture — real paths not needed (all fs calls are mocked) */
  function makePaths() {
    return {
      project: '/fake/project',
      recordings: '/fake/project/recordings',
      safe: '/fake/project/recordings/-safe',
      chapters: '/fake/project/recordings/-chapters',
      trash: '/fake/project/-trash',
      assets: '/fake/project/assets',
      images: '/fake/project/assets/images',
      thumbs: '/fake/project/assets/thumbs',
      transcripts: '/fake/project/recording-transcripts',
      final: '/fake/project/final',
      s3Staging: '/fake/project/s3-staging',
      inbox: '/fake/project/inbox',
      inboxRaw: '/fake/project/inbox/raw',
      inboxDataset: '/fake/project/inbox/dataset',
      inboxPresentation: '/fake/project/inbox/presentation',
      stateFile: '/fake/project/.flihub-state.json',
    };
  }

  function makePipelineJob(videoFilename: string): TranscriptionJob {
    return {
      jobId: 'job-1',
      videoPath: `/fake/project/recordings/${videoFilename}`,
      videoFilename,
      status: 'transcribing',
    };
  }

  // ── 1. Abort when file is being transcribed ────────────────────────────────

  it('returns error without touching phases when active job matches the file', async () => {
    const activeJob = makePipelineJob('01-1-intro.mov');

    const result = await renameRecording(
      '01-1-intro.mov',
      '01-1-introduction.mov',
      makePaths(),
      activeJob,
      []
    );

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/transcri/i);
    // No phase started — delete/rename/regen dependency functions untouched
    expect(fsMock.unlink).not.toHaveBeenCalled();
    expect(fsMock.rename).not.toHaveBeenCalled();
    expect(createShadowFileMock).not.toHaveBeenCalled();
  });

  it('returns error without touching phases when file is queued for transcription', async () => {
    const queuedJob = makePipelineJob('02-1-setup.mov');

    const result = await renameRecording(
      '02-1-setup.mov',
      '02-1-setup-v2.mov',
      makePaths(),
      null,
      [queuedJob]
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(fsMock.unlink).not.toHaveBeenCalled();
    expect(fsMock.rename).not.toHaveBeenCalled();
    expect(createShadowFileMock).not.toHaveBeenCalled();
  });

  // ── 2. Phase ordering ──────────────────────────────────────────────────────
  //
  // Track order through mocked dependency calls:
  //   fs.unlink  → delete phase (deleteDerivableFiles)
  //   fs.rename  → rename phase (renameCoreFiles)
  //   createShadowFile → regenerate phase (regenerateDerivableFiles)

  it('delete phase fires before rename phase, which fires before regenerate phase', async () => {
    const callOrder: string[] = [];

    // Use *Once variants so implementations don't bleed into subsequent tests
    (fsMock.unlink as ReturnType<typeof vi.fn>).mockImplementationOnce(async () => {
      if (!callOrder.includes('delete')) callOrder.push('delete');
    });
    (fsMock.rename as ReturnType<typeof vi.fn>).mockImplementationOnce(async () => {
      callOrder.push('rename');
    });
    createShadowFileMock.mockImplementationOnce(async () => {
      callOrder.push('regenerate');
      return { success: true, shadowPath: '/fake/shadow.mp4' };
    });

    await renameRecording('01-1-intro.mov', '01-1-introduction.mov', makePaths(), null, []);

    expect(callOrder).toEqual(['delete', 'rename', 'regenerate']);
  });

  // ── 3. If the core rename fails, regenerate does NOT fire ──────────────────

  it('does not call createShadowFile when fs.rename throws (recording file not found)', async () => {
    // *Once so the rejection doesn't bleed into the happy-path tests that follow
    (fsMock.rename as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('ENOENT: file not found')
    );

    const result = await renameRecording(
      '01-1-intro.mov',
      '01-1-introduction.mov',
      makePaths(),
      null,
      []
    );

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/file not found/i);
    expect(createShadowFileMock).not.toHaveBeenCalled();
  });

  it('surfaces the error message from the thrown Error when fs.rename fails', async () => {
    (fsMock.rename as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('ENOENT: no such file or directory')
    );

    const result = await renameRecording('missing.mov', 'new.mov', makePaths(), null, []);

    expect(result.success).toBe(false);
    expect(result.error).toBe('ENOENT: no such file or directory');
  });

  // ── 4. Happy path ──────────────────────────────────────────────────────────

  it('returns { success: true } when all phases complete without error', async () => {
    const result = await renameRecording(
      '01-1-intro.mov',
      '01-1-introduction.mov',
      makePaths(),
      null,
      []
    );

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('invokes the queueTranscription callback on happy path', async () => {
    const queueTranscription = vi.fn();

    const result = await renameRecording(
      '01-1-intro.mov',
      '01-1-introduction.mov',
      makePaths(),
      null,
      [],
      queueTranscription
    );

    expect(result.success).toBe(true);
    expect(queueTranscription).toHaveBeenCalledOnce();
    // The path passed to queueTranscription should contain the NEW filename
    const calledWith: string = queueTranscription.mock.calls[0][0] as string;
    expect(calledWith).toContain('01-1-introduction.mov');
  });

  it('does NOT invoke queueTranscription when rename is blocked by transcription', async () => {
    const queueTranscription = vi.fn();
    const activeJob = makePipelineJob('01-1-intro.mov');

    await renameRecording(
      '01-1-intro.mov',
      '01-1-introduction.mov',
      makePaths(),
      activeJob,
      [],
      queueTranscription
    );

    expect(queueTranscription).not.toHaveBeenCalled();
  });
});
