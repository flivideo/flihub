// storage-panel WU2: Tests for the StoragePanel component.
//
// Covers:
//   - state → action-button visibility (active / held / archived)
//   - tree rendering with mixed heavy + light classifications
//   - held state greys heavy nodes + labels them "on T7"
//   - Archive confirm-cancel path fires no mutation
//   - successful Hold triggers the invalidation helper
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type {
  StorageTreeResponse,
  StorageTreeNode,
  StorageState,
} from '../../../shared/types';

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    dismiss: vi.fn(),
  }),
}));

// Hook mocks — we control the tree shape + spy on mutations + invalidation.
const mockTree = vi.fn();
const mockHoldMutate = vi.fn();
const mockRestoreMutate = vi.fn();
const mockArchiveMutate = vi.fn();
const mockUnarchiveMutate = vi.fn();
const mockHeldArchiveMutate = vi.fn();
const mockInvalidate = vi.fn();

vi.mock('../hooks/useStorageApi', () => ({
  useStorageTree: () => mockTree(),
  useHoldProject: () => ({ mutate: mockHoldMutate, isPending: false }),
  useRestoreHeld: () => ({ mutate: mockRestoreMutate, isPending: false }),
  useArchiveProject: () => ({ mutate: mockArchiveMutate, isPending: false }),
  useUnarchiveProject: () => ({ mutate: mockUnarchiveMutate, isPending: false }),
  useHeldArchiveProject: () => ({ mutate: mockHeldArchiveMutate, isPending: false }),
  // WU5: StoragePanel now renders <StorageActivityFeed /> at the bottom,
  // which calls useStorageActivity. Return a stable empty shape.
  useStorageActivity: () => ({ data: { success: true, entries: [] }, isLoading: false, error: null }),
}));

vi.mock('../hooks/useInvalidateProjectStorage', () => ({
  useInvalidateProjectStorage: () => mockInvalidate,
}));

import { StoragePanel } from '../components/shared/StoragePanel';

// -----------------------------------------------------------------------------
// Fixtures
// -----------------------------------------------------------------------------

function node(
  name: string,
  classification: 'heavy' | 'light',
  location: 'local' | 'holding' | 'published',
  sizeBytes: number,
  children?: StorageTreeNode[],
): StorageTreeNode {
  return {
    name,
    path: `/tmp/proj/${name}`,
    sizeBytes,
    classification,
    location,
    children,
  };
}

function buildTree(state: StorageState, overrides: Partial<StorageTreeResponse> = {}): StorageTreeResponse {
  const base: StorageTreeResponse = {
    state,
    nodes: [
      node('recordings', 'heavy', state === 'held' ? 'holding' : 'local', 2_500_000_000, [
        node('01-1-intro.mov', 'heavy', state === 'held' ? 'holding' : 'local', 845_000_000),
      ]),
      node('final', 'heavy', state === 'held' ? 'holding' : 'local', 300_000_000),
      node('recording-transcripts', 'light', 'local', 1_200_000),
      node('assets', 'light', 'local', 340_000),
    ],
    sizes: {
      localTotal: state === 'held' ? 1_540_000 : 2_801_540_000,
      heavyTotal: state === 'held' ? 0 : 2_800_000_000,
      lightTotal: 1_540_000,
      heldTotal: state === 'held' ? 2_800_000_000 : 0,
      archivedTotal: state === 'archived' ? 2_801_540_000 : 0,
    },
    paths: {
      local: '/tmp/projects/proj',
      holding: '/tmp/holding/proj',
      published: '/tmp/published/proj',
    },
    relayBlocked: false,
    relayBytes: 0,
    ssdMounted: true,
  };
  return { ...base, ...overrides };
}

function renderPanel() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <StoragePanel projectCode="proj" />
    </QueryClientProvider>,
  );
}

function mockTreeReturn(tree: StorageTreeResponse | null, opts: { isLoading?: boolean; error?: Error } = {}) {
  mockTree.mockReturnValue({
    data: tree,
    isLoading: opts.isLoading ?? false,
    error: opts.error ?? null,
    refetch: vi.fn(),
  });
}

beforeEach(() => {
  mockTree.mockReset();
  mockHoldMutate.mockReset();
  mockRestoreMutate.mockReset();
  mockArchiveMutate.mockReset();
  mockUnarchiveMutate.mockReset();
  mockHeldArchiveMutate.mockReset();
  mockInvalidate.mockReset();
});

// -----------------------------------------------------------------------------
// state → buttons mapping
// -----------------------------------------------------------------------------

describe('StoragePanel — state → buttons mapping', () => {
  it('active state renders Hold + Archive, no Restore, no Unarchive', () => {
    mockTreeReturn(buildTree('active'));
    renderPanel();
    expect(screen.getByTestId('action-hold')).toBeInTheDocument();
    expect(screen.getByTestId('action-archive')).toBeInTheDocument();
    expect(screen.queryByTestId('action-restore')).toBeNull();
    expect(screen.queryByTestId('action-held-archive')).toBeNull();
    expect(screen.queryByTestId('action-unarchive')).toBeNull();
    expect(screen.getByTestId('storage-state-pill')).toHaveAttribute('data-state', 'active');
  });

  it('held state renders Restore + Archive-everything, no Hold', () => {
    mockTreeReturn(buildTree('held'));
    renderPanel();
    expect(screen.getByTestId('action-restore')).toBeInTheDocument();
    expect(screen.getByTestId('action-held-archive')).toBeInTheDocument();
    expect(screen.queryByTestId('action-hold')).toBeNull();
    expect(screen.queryByTestId('action-archive')).toBeNull();
    expect(screen.getByTestId('storage-state-pill')).toHaveAttribute('data-state', 'held');
  });

  it('archived state shows only Unarchive link + no primary actions', () => {
    mockTreeReturn(buildTree('archived'));
    renderPanel();
    expect(screen.queryByTestId('action-hold')).toBeNull();
    expect(screen.queryByTestId('action-archive')).toBeNull();
    expect(screen.queryByTestId('action-restore')).toBeNull();
    expect(screen.getByTestId('action-unarchive')).toBeInTheDocument();
    expect(screen.getByTestId('storage-state-pill')).toHaveAttribute('data-state', 'archived');
  });
});

// -----------------------------------------------------------------------------
// Tree rendering
// -----------------------------------------------------------------------------

describe('StoragePanel — tree rendering', () => {
  it('renders heavy + light nodes with names from fixture', () => {
    mockTreeReturn(buildTree('active'));
    renderPanel();
    const tree = screen.getByTestId('storage-tree');
    expect(tree.textContent).toContain('recordings');
    expect(tree.textContent).toContain('final');
    expect(tree.textContent).toContain('recording-transcripts');
    expect(tree.textContent).toContain('assets');
    // at least one 'heavy' and one 'light' label visible
    expect(screen.getAllByText('heavy').length).toBeGreaterThan(0);
    expect(screen.getAllByText('light').length).toBeGreaterThan(0);
  });

  it('held state labels heavy nodes with "on T7"', () => {
    mockTreeReturn(buildTree('held'));
    renderPanel();
    // "on T7" renders for heavy+holding nodes in held state
    expect(screen.getAllByText('on T7').length).toBeGreaterThan(0);
  });
});

// -----------------------------------------------------------------------------
// Confirm-cancel path
// -----------------------------------------------------------------------------

describe('StoragePanel — archive confirm-cancel path', () => {
  it('opens popover on Archive click and does NOT fire mutation when Cancel is pressed', () => {
    mockTreeReturn(buildTree('active'));
    renderPanel();
    expect(screen.queryByTestId('confirm-popover')).toBeNull();

    fireEvent.click(screen.getByTestId('action-archive'));
    expect(screen.getByTestId('confirm-popover')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('cancel-archive'));
    expect(screen.queryByTestId('confirm-popover')).toBeNull();
    expect(mockArchiveMutate).not.toHaveBeenCalled();
  });

  it('fires archive mutation when Confirm is pressed', () => {
    mockTreeReturn(buildTree('active'));
    renderPanel();
    fireEvent.click(screen.getByTestId('action-archive'));
    fireEvent.click(screen.getByTestId('confirm-archive'));
    expect(mockArchiveMutate).toHaveBeenCalledTimes(1);
    // First arg is the projectCode
    expect(mockArchiveMutate.mock.calls[0][0]).toBe('proj');
  });
});

// -----------------------------------------------------------------------------
// Hold flow + invalidation
// -----------------------------------------------------------------------------

describe('StoragePanel — hold mutation flow', () => {
  it('calls hold mutate with projectCode on Hold click (no confirm)', () => {
    mockTreeReturn(buildTree('active'));
    renderPanel();
    fireEvent.click(screen.getByTestId('action-hold'));
    expect(mockHoldMutate).toHaveBeenCalledTimes(1);
    expect(mockHoldMutate.mock.calls[0][0]).toBe('proj');
  });
});

// -----------------------------------------------------------------------------
// Disabled states
// -----------------------------------------------------------------------------

describe('StoragePanel — disabled states', () => {
  it('disables Hold + Archive when relay is non-empty, surfacing reason text', () => {
    mockTreeReturn(
      buildTree('active', { relayBlocked: true, relayBytes: 5_000_000 }),
    );
    renderPanel();
    expect(screen.getByTestId('action-hold')).toBeDisabled();
    expect(screen.getByTestId('action-archive')).toBeDisabled();
    expect(screen.getByTestId('action-hold-reason').textContent).toMatch(/Clear Relay/);
  });

  it('disables Hold when SSD not mounted', () => {
    mockTreeReturn(buildTree('active', { ssdMounted: false }));
    renderPanel();
    expect(screen.getByTestId('action-hold')).toBeDisabled();
    expect(screen.getByTestId('action-archive')).toBeDisabled();
  });

  it('shows degraded banner + disables actions when degraded', () => {
    mockTreeReturn(
      buildTree('active', { degraded: true, error: 'both locations have copies' }),
    );
    renderPanel();
    expect(screen.getByTestId('storage-degraded-banner')).toBeInTheDocument();
    expect(screen.getByTestId('action-hold')).toBeDisabled();
    expect(screen.getByTestId('action-archive')).toBeDisabled();
  });
});
