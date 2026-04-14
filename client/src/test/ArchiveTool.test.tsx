import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ArchiveRow } from '../../../shared/types';

// Mock sonner to avoid polluting test DOM
vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    dismiss: vi.fn(),
  }),
}));

// Hook mocks — inventory + mutations
const mockInventory = vi.fn();
vi.mock('../hooks/useHoldApi', () => ({
  useArchiveInventory: () => mockInventory(),
  useHoldProject: () => ({ mutate: vi.fn(), isPending: false, error: null }),
  useRestoreFromHolding: () => ({ mutate: vi.fn(), isPending: false, error: null }),
  useDeleteLocal: () => ({ mutate: vi.fn(), isPending: false, error: null }),
  useDeleteHolding: () => ({ mutate: vi.fn(), isPending: false, error: null }),
  // WU3: batch mutations — default to resolved empty result for tests that
  // don't exercise batch behaviour.
  useBatchOffload: () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn().mockResolvedValue({ results: [] }),
    isPending: false,
    error: null,
  }),
  useBatchDeleteLocal: () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn().mockResolvedValue({ results: [] }),
    isPending: false,
    error: null,
  }),
}));

import { ArchiveTool } from '../components/shared/ArchiveTool';

function row(overrides: Partial<ArchiveRow>): ArchiveRow {
  return {
    projectCode: 'proj',
    projectPath: '/tmp/proj',
    localBytes: 0,
    heldBytes: 0,
    held: false,
    state: 'local',
    lastTouched: null,
    ...overrides,
  };
}

function renderTool(rows: ArchiveRow[], props = {}) {
  mockInventory.mockReturnValue({
    data: { rows },
    isLoading: false,
    error: null,
  });
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ArchiveTool {...props} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockInventory.mockReset();
});

describe('ArchiveTool — state→actions rendering', () => {
  it('renders Offload + Delete local for local state', () => {
    renderTool([row({ projectCode: 'alpha', localBytes: 1000, state: 'local' })], {
      initialFilter: 'all' as const,
    });
    expect(screen.getByTestId('action-offload')).toBeInTheDocument();
    expect(screen.getByTestId('action-delete-local')).toBeInTheDocument();
    expect(screen.queryByTestId('action-restore')).toBeNull();
  });

  it('renders red Delete local + Clear T7 for held-local state', () => {
    renderTool(
      [
        row({
          projectCode: 'bravo',
          localBytes: 2000,
          heldBytes: 2000,
          held: true,
          state: 'held-local',
        }),
      ],
      { initialFilter: 'all' as const },
    );
    expect(screen.getByTestId('action-delete-local-primary')).toBeInTheDocument();
    expect(screen.getByTestId('action-clear-t7')).toBeInTheDocument();
    expect(screen.queryByTestId('action-offload')).toBeNull();
  });

  it('renders only Restore for held-only state (P2: delete-everything deferred)', () => {
    renderTool(
      [
        row({
          projectCode: 'charlie',
          heldBytes: 5000,
          held: true,
          state: 'held-only',
        }),
      ],
      { initialFilter: 'all' as const },
    );
    expect(screen.getByTestId('action-restore')).toBeInTheDocument();
    expect(screen.queryByTestId('action-delete-everything')).toBeNull();
  });

  it('degraded rows hide every destructive action button', () => {
    renderTool(
      [
        row({
          projectCode: 'delta',
          localBytes: 500,
          state: 'local',
          degraded: true,
          error: 'stat failed',
        }),
      ],
      { initialFilter: 'all' as const },
    );
    expect(screen.queryByTestId('action-offload')).toBeNull();
    expect(screen.queryByTestId('action-delete-local')).toBeNull();
    expect(screen.getByText('Refresh to retry')).toBeInTheDocument();
  });
});

describe('ArchiveTool — WU3 batch selection', () => {
  it('shows Offload selected button when all selected rows are local state', () => {
    renderTool(
      [
        row({ projectCode: 'alpha', localBytes: 1000, state: 'local' }),
        row({ projectCode: 'beta', localBytes: 2000, state: 'local' }),
      ],
      { initialFilter: 'all' as const },
    );
    // Select both rows via their checkboxes
    fireEvent.click(screen.getByLabelText('Select alpha'));
    fireEvent.click(screen.getByLabelText('Select beta'));
    expect(screen.getByTestId('batch-offload')).toBeInTheDocument();
    expect(screen.queryByTestId('batch-delete-local')).toBeNull();
  });

  it('shows Delete local batch button when all selected rows are held-local', () => {
    renderTool(
      [
        row({
          projectCode: 'alpha',
          localBytes: 1000,
          heldBytes: 1000,
          held: true,
          state: 'held-local',
        }),
        row({
          projectCode: 'beta',
          localBytes: 2000,
          heldBytes: 2000,
          held: true,
          state: 'held-local',
        }),
      ],
      { initialFilter: 'all' as const },
    );
    fireEvent.click(screen.getByLabelText('Select alpha'));
    fireEvent.click(screen.getByLabelText('Select beta'));
    expect(screen.getByTestId('batch-delete-local')).toBeInTheDocument();
    expect(screen.queryByTestId('batch-offload')).toBeNull();
  });

  it('disables batch buttons for heterogeneous selection', () => {
    renderTool(
      [
        row({ projectCode: 'alpha', localBytes: 1000, state: 'local' }),
        row({
          projectCode: 'beta',
          localBytes: 2000,
          heldBytes: 2000,
          held: true,
          state: 'held-local',
        }),
      ],
      { initialFilter: 'all' as const },
    );
    fireEvent.click(screen.getByLabelText('Select alpha'));
    fireEvent.click(screen.getByLabelText('Select beta'));
    expect(screen.queryByTestId('batch-offload')).toBeNull();
    expect(screen.queryByTestId('batch-delete-local')).toBeNull();
    expect(screen.getByTestId('batch-mixed-note')).toBeInTheDocument();
  });

  it('does not allow selecting degraded rows (checkbox disabled)', () => {
    renderTool(
      [
        row({
          projectCode: 'alpha',
          localBytes: 1000,
          state: 'local',
          degraded: true,
          error: 'stat failed',
        }),
      ],
      { initialFilter: 'all' as const },
    );
    const checkbox = screen.getByLabelText('Select alpha') as HTMLInputElement;
    expect(checkbox.disabled).toBe(true);
  });

  it('header select-all toggles all non-degraded visible rows', () => {
    renderTool(
      [
        row({ projectCode: 'alpha', localBytes: 1000, state: 'local' }),
        row({ projectCode: 'beta', localBytes: 2000, state: 'local' }),
        row({
          projectCode: 'gamma',
          localBytes: 500,
          state: 'local',
          degraded: true,
          error: 'x',
        }),
      ],
      { initialFilter: 'all' as const },
    );
    fireEvent.click(screen.getByLabelText('Select all visible'));
    // Two non-degraded rows now selected → batch-offload visible
    expect(screen.getByTestId('batch-offload')).toHaveTextContent('(2)');
  });

  it('clears selection when filter changes', () => {
    renderTool(
      [
        row({ projectCode: 'alpha', localBytes: 1000, state: 'local' }),
        row({
          projectCode: 'beta',
          localBytes: 2000,
          heldBytes: 2000,
          held: true,
          state: 'held-local',
        }),
      ],
      { initialFilter: 'all' as const },
    );
    fireEvent.click(screen.getByLabelText('Select alpha'));
    expect(screen.getByTestId('batch-selection-bar')).toBeInTheDocument();
    // Switch filter to "On T7" — selection bar disappears
    fireEvent.click(screen.getByRole('button', { name: /^On T7/ }));
    expect(screen.queryByTestId('batch-selection-bar')).toBeNull();
  });
});

describe('ArchiveTool — WU4 deep-link search', () => {
  it('pre-populates the search input from initialSearch and filters to matching rows', () => {
    renderTool(
      [
        row({ projectCode: 'alpha', localBytes: 1000, state: 'local' }),
        row({ projectCode: 'alphabet', localBytes: 1000, state: 'local' }),
        row({ projectCode: 'beta', localBytes: 2000, state: 'local' }),
      ],
      { initialFilter: 'all' as const, initialSearch: 'alpha' },
    );
    const input = screen.getByTestId('archive-search') as HTMLInputElement;
    expect(input.value).toBe('alpha');
    // Both 'alpha' and 'alphabet' match; 'beta' should be filtered out
    expect(screen.getByText('alpha')).toBeInTheDocument();
    expect(screen.getByText('alphabet')).toBeInTheDocument();
    expect(screen.queryByText('beta')).toBeNull();
  });

  it('search is case-insensitive and narrows rows live', () => {
    renderTool(
      [
        row({ projectCode: 'b71-alpha', localBytes: 1, state: 'local' }),
        row({ projectCode: 'b72-beta', localBytes: 1, state: 'local' }),
      ],
      { initialFilter: 'all' as const },
    );
    const input = screen.getByTestId('archive-search') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'B72' } });
    expect(screen.queryByText('b71-alpha')).toBeNull();
    expect(screen.getByText('b72-beta')).toBeInTheDocument();
  });
});

describe('ArchiveTool — WU5 restore confirm popover', () => {
  it('clicking Restore opens confirm popover — does NOT fire mutation immediately', () => {
    renderTool(
      [
        row({
          projectCode: 'charlie',
          heldBytes: 5 * 1024 * 1024 * 1024,
          held: true,
          state: 'held-only',
        }),
      ],
      { initialFilter: 'all' as const },
    );
    fireEvent.click(screen.getByTestId('action-restore'));
    const popover = screen.getByTestId('restore-confirm-popover');
    expect(popover).toBeInTheDocument();
    expect(popover).toHaveTextContent('Restore charlie?');
    expect(popover).toHaveTextContent('will be copied back to local disk');
    expect(screen.getByTestId('restore-confirm')).toBeInTheDocument();
    expect(screen.getByTestId('restore-cancel')).toBeInTheDocument();
  });

  it('Cancel closes the popover', () => {
    renderTool(
      [
        row({
          projectCode: 'charlie',
          heldBytes: 1000,
          held: true,
          state: 'held-only',
        }),
      ],
      { initialFilter: 'all' as const },
    );
    fireEvent.click(screen.getByTestId('action-restore'));
    fireEvent.click(screen.getByTestId('restore-cancel'));
    expect(screen.queryByTestId('restore-confirm-popover')).toBeNull();
  });
});

describe('ArchiveTool — filter tab counts', () => {
  it('exposes counts per filter in tab labels', () => {
    renderTool([
      row({ projectCode: 'a', localBytes: 100, state: 'local' }),
      row({
        projectCode: 'b',
        localBytes: 200,
        heldBytes: 200,
        held: true,
        state: 'held-local',
      }),
      row({
        projectCode: 'c',
        heldBytes: 400,
        held: true,
        state: 'held-only',
      }),
    ]);
    // Each filter tab button contains "Label (count)" — use role=button to
    // disambiguate from state pills that share the same label text.
    const buttons = screen.getAllByRole('button');
    const tabAll = buttons.find((b) => b.textContent?.startsWith('All'));
    const tabLocal = buttons.find((b) => b.textContent?.startsWith('Local only'));
    const tabHeld = buttons.find((b) => b.textContent?.startsWith('On T7'));
    const tabReclaim = buttons.find((b) => b.textContent?.startsWith('Reclaimable'));
    expect(tabAll?.textContent).toContain('(3)');
    expect(tabLocal?.textContent).toContain('(1)');
    expect(tabHeld?.textContent).toContain('(2)');
    expect(tabReclaim?.textContent).toContain('(1)');
  });
});
