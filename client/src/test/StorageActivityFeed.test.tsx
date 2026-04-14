// storage-panel WU5: Tests for the StorageActivityFeed component.
//
// Covers:
//   - renders recent entries with action label, date, and size
//   - shows empty-state message when list is empty
//   - shows loading state
//   - collapses/expands via header button
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { StorageActivityResponse } from '../../../shared/types';

const mockActivity = vi.fn();

vi.mock('../hooks/useStorageApi', () => ({
  useStorageActivity: (code: string, limit?: number) => mockActivity(code, limit),
}));

import { StorageActivityFeed } from '../components/shared/storage/StorageActivityFeed';

function setActivity(
  data: StorageActivityResponse | undefined,
  opts: { isLoading?: boolean; error?: Error | null } = {},
) {
  mockActivity.mockReturnValue({
    data,
    isLoading: opts.isLoading ?? false,
    error: opts.error ?? null,
  });
}

describe('storage-panel WU5: StorageActivityFeed', () => {
  beforeEach(() => {
    mockActivity.mockReset();
  });

  it('renders entries with action label, date and size', () => {
    setActivity({
      success: true,
      entries: [
        { projectCode: 'c10', action: 'hold', sizeBytes: 2_700_000_000, timestamp: '2026-04-07T09:00:00Z' },
        { projectCode: 'c10', action: 'restore-held', sizeBytes: 2_700_000_000, timestamp: '2026-04-02T09:00:00Z' },
        { projectCode: 'c10', action: 'archive', sizeBytes: 3_100_000_000, timestamp: '2026-03-20T09:00:00Z' },
        { projectCode: 'c10', action: 'unarchive', sizeBytes: 3_100_000_000, timestamp: '2026-03-10T09:00:00Z' },
      ],
    });
    render(<StorageActivityFeed projectCode="c10" />);
    expect(screen.getByTestId('storage-activity-feed')).toBeInTheDocument();
    expect(screen.getByText('Held')).toBeInTheDocument();
    expect(screen.getByText('Restored')).toBeInTheDocument();
    expect(screen.getByText('Archived')).toBeInTheDocument();
    expect(screen.getByText('Unarchived')).toBeInTheDocument();
    // Formatted date (en-GB short month)
    expect(screen.getByText(/7 Apr 2026/)).toBeInTheDocument();
    // Size formatter is shared — assert something GB-ish appears
    expect(screen.getAllByText(/GB/i).length).toBeGreaterThan(0);
  });

  it('shows empty-state when entries is empty', () => {
    setActivity({ success: true, entries: [] });
    render(<StorageActivityFeed projectCode="c10" />);
    expect(screen.getByText(/No storage activity yet/i)).toBeInTheDocument();
  });

  it('shows loading state', () => {
    setActivity(undefined, { isLoading: true });
    render(<StorageActivityFeed projectCode="c10" />);
    expect(screen.getByRole('status')).toHaveTextContent(/Loading/i);
  });

  it('shows error state', () => {
    setActivity(undefined, { error: new Error('boom') });
    render(<StorageActivityFeed projectCode="c10" />);
    expect(screen.getByRole('alert')).toHaveTextContent(/Failed to load activity/i);
  });

  it('collapses and expands via header button', () => {
    setActivity({
      success: true,
      entries: [
        { projectCode: 'c10', action: 'hold', sizeBytes: 1000, timestamp: '2026-04-07T09:00:00Z' },
      ],
    });
    render(<StorageActivityFeed projectCode="c10" />);
    const toggle = screen.getByRole('button', { name: /Recent activity/i });
    // Default open — entry visible
    expect(screen.getByText('Held')).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(screen.queryByText('Held')).toBeNull();
    fireEvent.click(toggle);
    expect(screen.getByText('Held')).toBeInTheDocument();
  });
});
