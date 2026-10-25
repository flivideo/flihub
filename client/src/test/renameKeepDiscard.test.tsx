// FR-174: the keep/discard choice is made on the Incoming card's button — never in a follow-up modal.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { UseMutationResult } from '@tanstack/react-query';
import type { FileInfo } from '../../../shared/types';

const rename = vi.fn();
vi.mock('../hooks/useApi', () => ({
  useRecordings: () => ({ data: { recordings: [] } }),
  useRename: () => ({ mutateAsync: rename, isPending: false }),
  useTrashFile: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock('../hooks/useSegmentsApi', () => ({
  useSegmentOp: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock('sonner', () => ({ toast }));

import { FileCard } from '../components/FileCard';
import { DiscardModal } from '../components/DiscardModal';
import { describeRenameDiscard, discardOtherIncoming } from '../utils/fileActions';

const file: FileInfo = { path: '/ecamm/Take 7.mov', filename: 'Take 7.mov', timestamp: '', size: 1 };
const naming = { chapter: '05', sequence: '6', name: 'bridge', tags: [], customTag: '' };

beforeEach(() => {
  rename.mockReset();
  Object.values(toast).forEach((t) => t.mockReset());
});

describe('Feature: Rename · Keep / Rename · Discard on the Incoming card (FR-174)', () => {
  it('Scenario: given the take is the only incoming file, when shown, then there is one plain Rename button and no discard choice', () => {
    render(<FileCard file={file} namingState={naming} onRenamed={vi.fn()} onDiscarded={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Rename' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Rename · Discard/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Rename · Keep/ })).toBeNull();
  });

  it('Scenario: given 2 other incoming files, when Rename · Keep is pressed, then the take is renamed, the parent is told to keep the rest, and the card toasts the rename', async () => {
    rename.mockResolvedValue({ success: true, newPath: '/p/05-6-bridge.mov' });
    const onRenamed = vi.fn();
    render(
      <FileCard
        file={file}
        namingState={naming}
        onRenamed={onRenamed}
        onDiscarded={vi.fn()}
        otherIncomingCount={2}
      />
    );
    expect(screen.queryByRole('button', { name: 'Rename' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Rename · Keep' }));
    await waitFor(() => expect(onRenamed).toHaveBeenCalled());
    expect(onRenamed).toHaveBeenCalledWith({
      discardOthers: false,
      summary: 'Renamed to: 05-6-bridge.mov',
    });
    expect(toast.success).toHaveBeenCalledWith('Renamed to: 05-6-bridge.mov');
  });

  it('Scenario: given 2 other incoming files, when Rename · Discard is pressed, then the parent is told to discard the others and the card leaves the toast to the parent', async () => {
    rename.mockResolvedValue({ success: true, newPath: '/p/05-6-bridge.mov' });
    const onRenamed = vi.fn();
    render(
      <FileCard
        file={file}
        namingState={naming}
        onRenamed={onRenamed}
        onDiscarded={vi.fn()}
        otherIncomingCount={2}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Rename · Discard' }));
    await waitFor(() => expect(onRenamed).toHaveBeenCalled());
    expect(onRenamed).toHaveBeenCalledWith({
      discardOthers: true,
      summary: 'Renamed to: 05-6-bridge.mov',
    });
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('Scenario: given a failed rename, when Rename · Discard is pressed, then nothing is reported as landed (so nothing gets discarded)', async () => {
    rename.mockResolvedValue({ success: false, error: 'boom' });
    const onRenamed = vi.fn();
    render(
      <FileCard
        file={file}
        namingState={naming}
        onRenamed={onRenamed}
        onDiscarded={vi.fn()}
        otherIncomingCount={1}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Rename · Discard' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('boom'));
    expect(onRenamed).not.toHaveBeenCalled();
  });
});

describe('Feature: Rename · Discard trashes only the others', () => {
  it('Scenario: given three incoming files, when the others are discarded after renaming one, then only the other two go to trash and the toast counts them', async () => {
    const trashed: string[] = [];
    const trash = {
      mutateAsync: vi.fn(async (p: string) => {
        trashed.push(p);
        return { success: true };
      }),
    } as unknown as UseMutationResult<{ success: boolean }, Error, string>;
    const removed = vi.fn();
    const result = await discardOtherIncoming(
      ['/ecamm/a.mov', '/ecamm/Take 7.mov', '/ecamm/b.mov'],
      '/ecamm/Take 7.mov',
      trash,
      removed
    );
    expect(trashed).toEqual(['/ecamm/a.mov', '/ecamm/b.mov']);
    expect(removed).toHaveBeenCalledTimes(2);
    expect(describeRenameDiscard('Renamed to: 05-6-bridge.mov', result)).toBe(
      'Renamed to: 05-6-bridge.mov; moved 2 other files to trash'
    );
    expect(describeRenameDiscard('Renamed to: x', { successCount: 1, failedCount: 0 })).toBe(
      'Renamed to: x; moved 1 other file to trash'
    );
  });
});

describe('Feature: the send-several confirm defaults to keep', () => {
  it('Scenario: given the confirm opens, then Keep the rest is first and focused, and the title asks about the rest', () => {
    render(<DiscardModal remainingCount={2} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.map((b) => b.textContent)).toEqual(['Keep the rest', 'Discard the rest']);
    expect(document.activeElement).toBe(buttons[0]);
    expect(screen.getByText('Rest of the incoming files?')).toBeTruthy();
  });

  it('Scenario: given the confirm is open, when Enter is pressed (even with Discard focused), then the rest are kept, never discarded', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<DiscardModal remainingCount={2} onConfirm={onConfirm} onCancel={onCancel} />);
    fireEvent.keyDown(document.activeElement!, { key: 'Enter' });
    const discard = screen.getByRole('button', { name: 'Discard the rest' });
    discard.focus();
    fireEvent.keyDown(discard, { key: 'Enter' });
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it('Scenario: given the confirm is open, when Discard the rest is clicked, then the rest are discarded', () => {
    const onConfirm = vi.fn();
    render(<DiscardModal remainingCount={1} onConfirm={onConfirm} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Discard the rest' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
