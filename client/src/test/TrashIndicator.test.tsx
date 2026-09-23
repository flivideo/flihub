// Trash visibility (2026-09-23): the header pill is always visible, and empties only after a confirm.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mutate = vi.fn();
let summary: { data?: unknown; isError?: boolean } = {};

vi.mock('../hooks/useProjectDiskApi', () => ({
  useTrashSummary: () => summary,
  useDeleteTrash: () => ({ mutate, isPending: false }),
}));

import { TrashIndicator } from '../components/shared/TrashIndicator';

beforeEach(() => {
  mutate.mockReset();
});

describe('TrashIndicator', () => {
  it('is visible at zero and cannot be emptied', () => {
    summary = { data: { success: true, exists: false, fileCount: 0, totalBytes: 0, nestedCount: 0 } };
    render(<TrashIndicator projectCode="d09-demo" />);
    const pill = screen.getByTestId('trash-indicator');
    expect(pill.textContent).toContain('Trash 0');
    expect(pill).toBeDisabled();
  });

  it('shows count and size, and empties only after confirming', () => {
    summary = { data: { success: true, exists: true, fileCount: 16, totalBytes: 169_000_000, nestedCount: 0 } };
    render(<TrashIndicator projectCode="d09-demo" />);
    const pill = screen.getByTestId('trash-indicator');
    expect(pill.textContent).toMatch(/Trash 16 · /);
    fireEvent.click(pill);
    expect(mutate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Empty trash' }));
    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it('cancel does not empty', () => {
    summary = { data: { success: true, exists: true, fileCount: 2, totalBytes: 10, nestedCount: 0 } };
    render(<TrashIndicator projectCode="d09-demo" />);
    fireEvent.click(screen.getByTestId('trash-indicator'));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(mutate).not.toHaveBeenCalled();
  });

  it('an unreadable trash says so instead of showing 0', () => {
    summary = { isError: true };
    render(<TrashIndicator projectCode="d09-demo" />);
    expect(screen.getByTestId('trash-indicator').textContent).toContain('Trash ?');
  });
});
