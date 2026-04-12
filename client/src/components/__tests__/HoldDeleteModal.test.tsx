// B064: Tests for HoldDeleteModal — covers both variants and all guard conditions.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HoldDeleteModal } from '../HoldDeleteModal';
import type { HoldVerification } from '../../../../shared/types';

// B064: Reusable base props for the modal
const BASE_PROPS = {
  isOpen: true,
  onClose: vi.fn(),
  onConfirm: vi.fn(),
  projectCode: 'b64',
  folderName: 'b64-my-project',
  bytesFreed: 2_000_000_000, // ~2 GB
  targetPath: '/Volumes/T7/youtube-HOLDING/b64-my-project',
  verification: null as HoldVerification | null,
  isLoading: false,
};

// B064: A passing verification object (local and holding match)
const GOOD_VERIFICATION: HoldVerification = {
  localFiles: 10,
  holdingFiles: 10,
  localBytes: 2_000_000_000,
  holdingBytes: 2_000_000_000,
  match: true,
};

// B064: A non-matching verification (file counts differ)
const BAD_VERIFICATION: HoldVerification = {
  localFiles: 10,
  holdingFiles: 8,
  localBytes: 2_000_000_000,
  holdingBytes: 1_500_000_000,
  match: false,
};

function renderModal(overrides: Partial<typeof BASE_PROPS> & { target: 'local' | 'holding' }) {
  const props = { ...BASE_PROPS, onClose: vi.fn(), onConfirm: vi.fn(), ...overrides };
  return { ...render(<HoldDeleteModal {...props} />), props };
}

describe('HoldDeleteModal — target=local', () => {
  it('renders correct title and labels for local variant', () => {
    renderModal({ target: 'local' });
    expect(screen.getByText('Delete Local Copy')).toBeInTheDocument();
    expect(screen.getByText('Folder:')).toBeInTheDocument();
    expect(screen.getByText('Freeing:')).toBeInTheDocument();
    expect(screen.getByText('SSD path:')).toBeInTheDocument();
    // Confirm button label
    expect(screen.getByRole('button', { name: /Delete Local/i })).toBeInTheDocument();
  });
});

describe('HoldDeleteModal — target=holding', () => {
  it('renders correct title and labels for holding variant', () => {
    renderModal({ target: 'holding' });
    expect(screen.getAllByText('Remove from SSD').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('SSD folder:')).toBeInTheDocument();
    expect(screen.getByText('Freeing from SSD:')).toBeInTheDocument();
    expect(screen.getByText('Path:')).toBeInTheDocument();
    // Confirm button label
    expect(screen.getByRole('button', { name: /Remove from SSD/i })).toBeInTheDocument();
  });
});

describe('HoldDeleteModal — confirm button guard conditions', () => {
  // B064: Helper to get the confirm button (the red destructive one)
  function getConfirmButton() {
    // The confirm button contains "Delete Local" or "Remove from SSD"
    return screen.getByRole('button', { name: /Delete Local|Remove from SSD/i });
  }

  it('confirm button is disabled when verification is null', () => {
    renderModal({ target: 'local', verification: null });
    expect(getConfirmButton()).toBeDisabled();
  });

  it('confirm button is disabled when verification.match is false', () => {
    renderModal({ target: 'local', verification: BAD_VERIFICATION });
    // Even if we type the correct code the verification flag blocks us
    const input = screen.getByPlaceholderText('b64');
    fireEvent.change(input, { target: { value: 'b64' } });
    expect(getConfirmButton()).toBeDisabled();
  });

  it('confirm button is disabled when typed code does not match projectCode', () => {
    renderModal({ target: 'local', verification: GOOD_VERIFICATION });
    const input = screen.getByPlaceholderText('b64');
    fireEvent.change(input, { target: { value: 'wrong' } });
    expect(getConfirmButton()).toBeDisabled();
  });

  it('confirm button is disabled when isLoading is true even with valid inputs', () => {
    renderModal({ target: 'local', verification: GOOD_VERIFICATION, isLoading: true });
    const input = screen.getByPlaceholderText('b64');
    fireEvent.change(input, { target: { value: 'b64' } });
    expect(getConfirmButton()).toBeDisabled();
  });

  it('confirm button is enabled when verification passes and code matches', () => {
    renderModal({ target: 'local', verification: GOOD_VERIFICATION });
    const input = screen.getByPlaceholderText('b64');
    fireEvent.change(input, { target: { value: 'b64' } });
    expect(getConfirmButton()).not.toBeDisabled();
  });

  it('calls onConfirm when confirm button is clicked with valid state', () => {
    const { props } = renderModal({ target: 'local', verification: GOOD_VERIFICATION });
    const input = screen.getByPlaceholderText('b64');
    fireEvent.change(input, { target: { value: 'b64' } });
    fireEvent.click(getConfirmButton());
    expect(props.onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Cancel button is clicked', () => {
    const { props } = renderModal({ target: 'local', verification: null });
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });
});

describe('HoldDeleteModal — renders nothing when closed', () => {
  it('returns null when isOpen is false', () => {
    const { container } = render(
      <HoldDeleteModal
        {...BASE_PROPS}
        target="local"
        isOpen={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    expect(container.innerHTML).toBe('');
  });
});
