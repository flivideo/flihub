// Aspect warning UI (2026-09-23): unmissable at ingest, a dismissible chip on the recording row.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { FileInfo, AspectCheck } from '../../../shared/types';

const mutate = vi.fn();
vi.mock('../hooks/useRecordingsApi', () => ({
  useDismissAspectWarning: () => ({ mutate, isPending: false }),
}));

import { AspectWarningBanner, AspectWarningChip } from '../components/shared/AspectWarning';

const bad: AspectCheck = {
  status: 'mismatch',
  expected: '9:16',
  message: 'expected 9:16 portrait · got 1920×1080 with a 608×1080 picture (68% black) — set Ecamm to a 1080×1920 canvas',
  checkedAt: 't',
};
const take = (filename: string, aspectCheck?: AspectCheck): FileInfo => ({
  path: `/ecamm/${filename}`,
  filename,
  timestamp: '',
  size: 1,
  aspectCheck,
});

describe('AspectWarningBanner', () => {
  it('names each mismatched take with what was expected, what arrived and the fix', () => {
    render(<AspectWarningBanner files={[take('a.mov', bad), take('b.mov', { ...bad, status: 'ok', message: 'Matches' })]} />);
    const banner = screen.getByTestId('aspect-warning-banner');
    expect(banner).toHaveAttribute('role', 'alert');
    expect(banner.textContent).toContain('This take does not match');
    expect(banner.textContent).toContain('a.mov');
    expect(banner.textContent).toContain('set Ecamm to a 1080×1920 canvas');
    expect(banner.textContent).not.toContain('b.mov');
  });

  it('renders nothing when every take is ok, skipped or not yet checked', () => {
    const { container } = render(
      <AspectWarningBanner files={[take('a.mov'), take('b.mov', { ...bad, status: 'skipped', message: 'x' })]} />,
    );
    expect(container.innerHTML).toBe('');
  });
});

describe('AspectWarningChip', () => {
  it('shows the message on hover and dismisses that one file', () => {
    render(<AspectWarningChip filename="01-1-intro.mov" warning={bad} />);
    expect(screen.getByTestId('aspect-warning-chip')).toHaveAttribute('title', bad.message);
    fireEvent.click(screen.getByRole('button', { name: /Dismiss aspect warning for 01-1-intro.mov/ }));
    expect(mutate).toHaveBeenCalledWith(['01-1-intro.mov']);
  });
});
