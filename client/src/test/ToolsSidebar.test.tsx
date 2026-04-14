import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToolsSidebar } from '../components/shared/ToolsSidebar';
import type { ActiveTool } from '../components/ManagePanel';

const defaultProps = {
  activeTool: 'regen' as ActiveTool,
  onToolClick: vi.fn(),
};

function renderSidebar(overrides: Partial<typeof defaultProps> = {}) {
  const props = { ...defaultProps, onToolClick: vi.fn(), ...overrides };
  render(<ToolsSidebar {...props} />);
  return props;
}

describe('ToolsSidebar', () => {
  it('renders tool labels', () => {
    renderSidebar();
    expect(screen.getByText('Regen')).toBeInTheDocument();
    expect(screen.getByText('Gling / Edit')).toBeInTheDocument();
    expect(screen.getByText('Relay')).toBeInTheDocument();
    expect(screen.getByText('AWB')).toBeInTheDocument();
    expect(screen.getByText('Sync')).toBeInTheDocument();
    // WU3: Storage heading + Storage tool button both exist — use getAllByText
    expect(screen.getAllByText('Storage').length).toBeGreaterThan(0);
    // WU3: SSD Status entry has been replaced by Storage.
    expect(screen.queryByText('SSD Status')).not.toBeInTheDocument();
    // WU4: Archive entry removed from sidebar.
    expect(screen.queryByText('Archive')).not.toBeInTheDocument();
  });

  it('WU3: clicking Storage button calls onToolClick with "storage"', () => {
    const props = renderSidebar();
    // Both heading and button render the text "Storage" — pick the BUTTON role.
    const storageButton = screen.getByRole('button', { name: /^Storage$/ });
    fireEvent.click(storageButton);
    expect(props.onToolClick).toHaveBeenCalledWith('storage');
  });

  it('active tool button has active styling (text-blue-600)', () => {
    renderSidebar({ activeTool: 'gling-edit' });
    const button = screen.getByText('Gling / Edit');
    expect(button.className).toContain('text-blue-600');
  });

  it('non-active tools have default styling (text-warm-secondary)', () => {
    renderSidebar({ activeTool: 'regen' });
    const button = screen.getByText('Gling / Edit');
    expect(button.className).toContain('text-warm-secondary');
  });

  describe('onToolClick', () => {
    const tools: { label: string; tool: ActiveTool }[] = [
      { label: 'Regen', tool: 'regen' },
      { label: 'Gling / Edit', tool: 'gling-edit' },
      { label: 'Relay', tool: 'relay' },
      { label: 'AWB', tool: 'awb' },
      { label: 'Sync', tool: 'sync' },
    ];

    tools.forEach(({ label, tool }) => {
      it(`clicking "${label}" calls onToolClick with '${tool}'`, () => {
        const props = renderSidebar();
        fireEvent.click(screen.getByText(label));
        expect(props.onToolClick).toHaveBeenCalledWith(tool);
      });
    });
  });

  describe('group headings', () => {
    it('renders Record heading', () => {
      renderSidebar();
      expect(screen.getByText('Record')).toBeInTheDocument();
    });

    it('renders Edit heading', () => {
      renderSidebar();
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });

    it('renders Collaborate heading', () => {
      renderSidebar();
      expect(screen.getByText('Collaborate')).toBeInTheDocument();
    });

    it('renders Storage heading', () => {
      renderSidebar();
      // Heading + button both labelled "Storage" — assert at least one exists.
      expect(screen.getAllByText('Storage').length).toBeGreaterThan(0);
    });
  });
});
