import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ContextRefusedBanner } from '../ContextRefusedBanner';

describe('ContextRefusedBanner', () => {
  it('says why the context was refused and that nothing moved', () => {
    render(
      <ContextRefusedBanner
        refused={{ code: 'project-not-found', reason: 'No project folder "z99" in /v-x.' }}
        onDismiss={() => {}}
      />
    );
    expect(screen.getByRole('alert')).toHaveTextContent('No project folder "z99" in /v-x.');
    expect(screen.getByRole('alert')).toHaveTextContent('FliHub stayed where it was');
    expect(screen.queryByText(/Did you mean/)).toBeNull();
  });

  it('lists the candidates of an ambiguous reference and can be dismissed', () => {
    const onDismiss = vi.fn();
    render(
      <ContextRefusedBanner
        refused={{ code: 'project-ambiguous', reason: 'Project "a01" matches 2 projects.', candidates: ['a01-alpha', 'a01-beta'] }}
        onDismiss={onDismiss}
      />
    );
    expect(screen.getByText('a01-alpha, a01-beta')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Dismiss'));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
