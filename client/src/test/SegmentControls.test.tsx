// CT-0107: R7 placeholder flag and R4 move up / down on a recording row.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { RecordingFile } from '../../../shared/types';

const op = vi.fn();
const placeholder = vi.fn();
vi.mock('../hooks/useSegmentsApi', () => ({
  useSegmentOp: () => ({ mutateAsync: op, isPending: false }),
  useSegmentPlaceholder: () => ({ mutateAsync: placeholder, isPending: false }),
}));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast }));

import { SegmentControls } from '../components/shared/SegmentControls';

const rec = (filename: string, extra: Partial<RecordingFile> = {}): RecordingFile => {
  const [chapter, sequence] = filename.split('-');
  return {
    filename,
    path: `/p/${filename}`,
    size: 1,
    timestamp: '',
    chapter,
    sequence,
    name: 'x',
    tags: [],
    folder: 'recordings',
    isSafe: false,
    isParked: false,
    ...extra,
  };
};

beforeEach(() => {
  op.mockReset();
  placeholder.mockReset();
  toast.success.mockReset();
  toast.error.mockReset();
});

describe('Feature: move a segment up or down (R4)', () => {
  it('Scenario: given the first segment, when shown, then up is off and down is on; the last is the reverse', () => {
    const { rerender } = render(
      <SegmentControls recording={rec('06-1-a.mov')} chapterSegments={[1, 2, 3]} />
    );
    expect(screen.getByLabelText('Move 06-1-a.mov up')).toBeDisabled();
    expect(screen.getByLabelText('Move 06-1-a.mov down')).not.toBeDisabled();
    rerender(<SegmentControls recording={rec('06-3-c.mov')} chapterSegments={[1, 2, 3]} />);
    expect(screen.getByLabelText('Move 06-3-c.mov up')).not.toBeDisabled();
    expect(screen.getByLabelText('Move 06-3-c.mov down')).toBeDisabled();
  });

  it('Scenario: given a middle segment, when up is pressed, then a reorder up is sent for that chapter and segment', async () => {
    op.mockResolvedValue({
      success: true,
      op: { id: 's', summary: 'moved 06-2-b.mov up', promoted: null },
    });
    render(<SegmentControls recording={rec('06-2-b.mov')} chapterSegments={[1, 2, 3]} />);
    fireEvent.click(screen.getByLabelText('Move 06-2-b.mov up'));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('moved 06-2-b.mov up'));
    expect(op).toHaveBeenCalledWith({
      mode: 'reorder',
      chapter: '06',
      segment: 2,
      direction: 'up',
    });
  });

  it('Scenario: given the server refuses, when down is pressed, then the reason is shown as an error, not a success', async () => {
    op.mockResolvedValue({
      success: false,
      refused: true,
      reason: '06-3-c.mov is used by fli.cut.tour.json.',
    });
    render(<SegmentControls recording={rec('06-2-b.mov')} chapterSegments={[1, 2, 3]} />);
    fireEvent.click(screen.getByLabelText('Move 06-2-b.mov down'));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'Not done — 06-3-c.mov is used by fli.cut.tour.json.'
      )
    );
    expect(toast.success).not.toHaveBeenCalled();
  });
});

describe('Feature: a placeholder flag (R7)', () => {
  it('Scenario: given an unflagged segment, when ⟲ is pressed, then it is marked to re-record', async () => {
    placeholder.mockResolvedValue({ success: true });
    render(<SegmentControls recording={rec('06-1-a.mov')} chapterSegments={[1]} />);
    expect(screen.queryByTestId('placeholder-badge')).toBeNull();
    fireEvent.click(screen.getByLabelText('Mark 06-1-a.mov to re-record'));
    await waitFor(() =>
      expect(placeholder).toHaveBeenCalledWith({ filename: '06-1-a.mov', placeholder: true })
    );
  });

  it('Scenario: given a flagged segment, when shown, then it carries a "to re-record" badge that unmarks it', async () => {
    placeholder.mockResolvedValue({ success: true });
    render(
      <SegmentControls
        recording={rec('06-1-a.mov', { isPlaceholder: true })}
        chapterSegments={[1]}
      />
    );
    fireEvent.click(screen.getByTestId('placeholder-badge'));
    await waitFor(() =>
      expect(placeholder).toHaveBeenCalledWith({ filename: '06-1-a.mov', placeholder: false })
    );
  });
});
