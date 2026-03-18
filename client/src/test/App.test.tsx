import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConnectionIndicator } from '../components/ConnectionIndicator';

// ConnectionIndicator is rendered in the App footer to show server connection state.
// Testing it directly exercises real component behaviour without requiring the
// full App dependency tree (socket, react-query, etc.).

describe('ConnectionIndicator', () => {
  it('shows "Connected" tooltip when connected and not reconnecting', () => {
    render(<ConnectionIndicator isConnected={true} isReconnecting={false} />);
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('shows "Disconnected" tooltip when not connected', () => {
    render(<ConnectionIndicator isConnected={false} isReconnecting={false} />);
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
  });

  it('shows "Reconnecting..." tooltip when reconnecting flag is set', () => {
    render(<ConnectionIndicator isConnected={false} isReconnecting={true} />);
    expect(screen.getByText('Reconnecting...')).toBeInTheDocument();
  });
});
