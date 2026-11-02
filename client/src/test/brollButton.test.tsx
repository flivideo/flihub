// FR-177: the purple B-roll button registers the take with B-Roll Pilot (FliStudio) — it no longer
// renames/moves into b-roll/. A refusal leaves the take in Incoming and says why.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { FileInfo } from '../../../shared/types';

const rename = vi.fn();
const register = vi.fn();
vi.mock('../hooks/useApi', () => ({
  useRecordings: () => ({ data: { recordings: [] } }),
  useRename: () => ({ mutateAsync: rename, isPending: false }),
  useTrashFile: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock('../hooks/useSegmentsApi', () => ({
  useSegmentOp: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock('../hooks/useBrollApi', () => ({
  useRegisterBroll: () => ({ mutateAsync: register, isPending: false }),
}));
const toast = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
}));
vi.mock('sonner', () => ({ toast }));

import { FileCard } from '../components/FileCard';

const file: FileInfo = { path: '/ecamm/Take 7.mov', filename: 'Take 7.mov', timestamp: '', size: 1 };
const naming = { chapter: '', sequence: '', name: 'run panel', tags: [], customTag: '' };

beforeEach(() => {
  rename.mockReset();
  register.mockReset();
  Object.values(toast).forEach((t) => t.mockReset());
});

function open(onRenamed = vi.fn()) {
  render(<FileCard file={file} namingState={naming} onRenamed={onRenamed} onDiscarded={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'B-roll' }));
  return onRenamed;
}

describe('Feature: the B-roll button registers with B-Roll Pilot (FR-177)', () => {
  it('Scenario: given tags typed, when Add is pressed, then broll register runs (not rename) and the take leaves Incoming', async () => {
    register.mockResolvedValue({ created: true, assetFile: '/p/resources/project/Take 7.mov', warnings: [] });
    const onRenamed = open();
    fireEvent.change(screen.getByTestId('filecard-broll-tags'), { target: { value: 'overlay-pilot, chin-bug' } });
    fireEvent.click(screen.getByTestId('filecard-broll-add'));
    await waitFor(() => expect(onRenamed).toHaveBeenCalled());
    expect(register).toHaveBeenCalledWith({ path: file.path, name: 'run panel', tags: ['overlay-pilot', 'chin-bug'] });
    expect(rename).not.toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalled();
  });

  it('Scenario: given FliStudio is down, when Add is pressed, then the refusal is toasted and the take stays', async () => {
    register.mockRejectedValue(new Error("FliStudio isn't running — not added to B-roll"));
    const onRenamed = open();
    fireEvent.click(screen.getByTestId('filecard-broll-add'));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("FliStudio isn't running — not added to B-roll"));
    expect(onRenamed).not.toHaveBeenCalled();
  });

  it('Scenario: given the file was already registered, when Add is pressed, then it says so (no false "added")', async () => {
    register.mockResolvedValue({ created: false, assetFile: '/p/x.mov', warnings: [] });
    open();
    fireEvent.click(screen.getByTestId('filecard-broll-add'));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Already in B-roll — tags merged'));
  });
});
