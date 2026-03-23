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
  it('renders all 5 tool labels', () => {
    renderSidebar();
    expect(screen.getByText('Regen')).toBeInTheDocument();
    expect(screen.getByText('Rename')).toBeInTheDocument();
    expect(screen.getByText('Gling / Edit')).toBeInTheDocument();
    expect(screen.getByText('Renumber')).toBeInTheDocument();
    expect(screen.getByText('Relay')).toBeInTheDocument();
  });

  it('active tool button has active styling (text-blue-600)', () => {
    renderSidebar({ activeTool: 'rename' });
    const button = screen.getByText('Rename');
    expect(button.className).toContain('text-blue-600');
  });

  it('non-active tools have default styling (text-gray-600)', () => {
    renderSidebar({ activeTool: 'regen' });
    const button = screen.getByText('Rename');
    expect(button.className).toContain('text-gray-600');
  });

  describe('onToolClick', () => {
    const tools: { label: string; tool: ActiveTool }[] = [
      { label: 'Regen', tool: 'regen' },
      { label: 'Rename', tool: 'rename' },
      { label: 'Gling / Edit', tool: 'gling-edit' },
      { label: 'Renumber', tool: 'renumber' },
      { label: 'Relay', tool: 'relay' },
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
  });
});
