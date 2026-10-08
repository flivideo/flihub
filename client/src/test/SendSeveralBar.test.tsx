// CT-0107 R6: tick several inbox takes → they land as consecutive segments, in the order picked.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const op = vi.fn();
vi.mock('../hooks/useSegmentsApi', () => ({
  useSegmentOp: () => ({ mutateAsync: op, isPending: false }),
}));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast }));

import { SendSeveralBar } from '../components/SendSeveralBar';

beforeEach(() => {
  op.mockReset();
  toast.success.mockReset();
  toast.error.mockReset();
});

const props = (over: Partial<Parameters<typeof SendSeveralBar>[0]> = {}) => ({
  picked: ['/ecamm/b.mov', '/ecamm/a.mov'],
  chapter: '06',
  name: 'walkthrough',
  tags: [],
  onSent: vi.fn(),
  onClear: vi.fn(),
  ...over,
});

describe('Feature: send several takes in (R6)', () => {
  it('Scenario: given fewer than two picked, when shown, then there is no bar (one take is an ordinary rename)', () => {
    const { container } = render(<SendSeveralBar {...props({ picked: ['/ecamm/a.mov'] })} />);
    expect(container.innerHTML).toBe('');
  });

  it('Scenario: given two takes picked b then a, when sent, then they go to the server in that order and the parent hears which landed', async () => {
    op.mockResolvedValue({
      success: true,
      op: {
        id: 's',
        summary: 'sent 2',
        promoted: ['06-3-walkthrough.mov', '06-4-walkthrough.mov'],
      },
    });
    const p = props();
    render(<SendSeveralBar {...p} />);
    fireEvent.click(screen.getByRole('button', { name: 'Send 2 as segments' }));
    await waitFor(() => expect(p.onSent).toHaveBeenCalledWith(['/ecamm/b.mov', '/ecamm/a.mov']));
    expect(op).toHaveBeenCalledWith({
      mode: 'send',
      chapter: '06',
      sources: ['/ecamm/b.mov', '/ecamm/a.mov'],
      name: 'walkthrough',
      tags: [],
    });
    expect(toast.success).toHaveBeenCalledWith('Sent: 06-3-walkthrough.mov, 06-4-walkthrough.mov');
  });

  it('Scenario: given the server refuses, when sent, then the reason shows and nothing leaves the inbox list', async () => {
    op.mockResolvedValue({
      success: false,
      refused: true,
      reason: 'The take to send in is not there: /ecamm/a.mov.',
    });
    const p = props();
    render(<SendSeveralBar {...p} />);
    fireEvent.click(screen.getByRole('button', { name: 'Send 2 as segments' }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'Not done — The take to send in is not there: /ecamm/a.mov.'
      )
    );
    expect(p.onSent).not.toHaveBeenCalled();
  });

  it('Scenario: given no name set, when sent, then it asks for one and sends nothing', async () => {
    render(<SendSeveralBar {...props({ name: '' })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Send 2 as segments' }));
    expect(toast.error).toHaveBeenCalledWith('Set a two-digit chapter and a name first');
    expect(op).not.toHaveBeenCalled();
  });
});
