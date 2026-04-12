// FR-148: Project list toolbar tests
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  ProjectListToolbar,
  STAGE_ORDER,
  STAGE_DISPLAY,
} from '../ProjectListToolbar';

const defaultProps = {
  totalCount: 42,
  filteredCount: 10,
  searchQuery: '',
  onSearchChange: vi.fn(),
  activeStages: new Set<string>(),
  onStageToggle: vi.fn(),
  activePreset: 'all',
  onPresetChange: vi.fn(),
};

describe('ProjectListToolbar', () => {
  it('renders search input', () => {
    render(<ProjectListToolbar {...defaultProps} />);
    expect(
      screen.getByPlaceholderText('Filter by code or name...')
    ).toBeInTheDocument();
  });

  // FR-149: 'review' removed from pill row; 'shelved' and 'remix' added — now 9 stages
  it('renders all stage pills', () => {
    render(<ProjectListToolbar {...defaultProps} />);
    for (const stage of STAGE_ORDER) {
      expect(
        screen.getByText(STAGE_DISPLAY[stage].label)
      ).toBeInTheDocument();
    }
    // FR-149: was 8 (with review), now 9 (shelved + remix added, review removed)
    expect(STAGE_ORDER).toHaveLength(9);
  });

  it('renders 4 preset buttons', () => {
    render(<ProjectListToolbar {...defaultProps} />);
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Needs Attention')).toBeInTheDocument();
    expect(screen.getByText('Dead')).toBeInTheDocument();
    expect(screen.getByText('Ready to Edit')).toBeInTheDocument();
  });

  it('shows correct result count', () => {
    render(<ProjectListToolbar {...defaultProps} />);
    expect(screen.getByText('10 of 42')).toBeInTheDocument();
  });

  it('calls onSearchChange when typing', async () => {
    const onSearchChange = vi.fn();
    render(
      <ProjectListToolbar {...defaultProps} onSearchChange={onSearchChange} />
    );
    const input = screen.getByPlaceholderText('Filter by code or name...');
    await userEvent.type(input, 'hello');
    expect(onSearchChange).toHaveBeenCalledTimes(5);
    // Controlled component: each keystroke fires with the single character typed
    expect(onSearchChange).toHaveBeenNthCalledWith(1, 'h');
  });

  it('calls onStageToggle when clicking a pill', async () => {
    const onStageToggle = vi.fn();
    render(
      <ProjectListToolbar {...defaultProps} onStageToggle={onStageToggle} />
    );
    await userEvent.click(screen.getByText('REC'));
    expect(onStageToggle).toHaveBeenCalledWith('recording');
  });
});
