import { describe, it, expect } from 'vitest';
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
