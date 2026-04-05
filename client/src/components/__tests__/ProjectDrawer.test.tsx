import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProjectDrawer } from '../ProjectDrawer';
import type { ProjectStats } from '../../../../shared/types';

// Mock useOpenFolder
const mutateMock = vi.fn();
vi.mock('../../hooks/useOpenFolder', () => ({
  useOpenFolder: () => ({ mutate: mutateMock }),
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

function makeProject(overrides: Partial<ProjectStats> = {}): ProjectStats {
  return ({
    code: 'b42',
    path: '/projects/b42',
    priority: 'normal',
    totalFiles: 5,
    chapterCount: 3,
    transcriptCount: 4,
    transcriptPercent: 80,
    transcriptSync: { matched: 4, missingCount: 1, orphanedCount: 0 },
    stage: 'recording',
    createdAt: '2026-01-01T00:00:00Z',
    lastModified: '2026-03-28T00:00:00Z',
    totalDuration: null,
    imageCount: 2,
    thumbCount: 1,
    hasInbox: false,
    hasAssets: true,
    hasChapters: true,
    inboxCount: 0,
    chapterVideoCount: 2,
    shadowCount: 0,
    ...overrides,
  }) as ProjectStats;
}

describe('ProjectDrawer', () => {
  it('renders nothing when project is null', () => {
    const { container } = render(<ProjectDrawer project={null} onClose={vi.fn()} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders project code and stage badge when given a project', () => {
    render(<ProjectDrawer project={makeProject()} onClose={vi.fn()} />);
    expect(screen.getByText('b42')).toBeInTheDocument();
    expect(screen.getByText('REC')).toBeInTheDocument();
  });

  it('shows correct stats numbers', () => {
    render(
      <ProjectDrawer
        project={makeProject({ totalFiles: 5, chapterCount: 3, imageCount: 2, thumbCount: 1, shadowCount: 0 })}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText('Recordings').previousElementSibling?.textContent).toBe('5');
    expect(screen.getByText('Chapters').previousElementSibling?.textContent).toBe('3');
    expect(screen.getByText('Images').previousElementSibling?.textContent).toBe('2');
    expect(screen.getByText('Thumbnails').previousElementSibling?.textContent).toBe('1');
    expect(screen.getByText('Shadows').previousElementSibling?.textContent).toBe('0');
    expect(screen.getByText('Transcript').previousElementSibling?.textContent).toBe('80%');
  });

  it('shows progress checklist items', () => {
    render(<ProjectDrawer project={makeProject()} onClose={vi.fn()} />);
    expect(screen.getByText('Has recordings')).toBeInTheDocument();
    expect(screen.getByText('Has transcripts')).toBeInTheDocument();
    expect(screen.getByText('Has chapters')).toBeInTheDocument();
    expect(screen.getByText('Has final video')).toBeInTheDocument();
    expect(screen.getByText('Has relay')).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(<ProjectDrawer project={makeProject()} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText('Close drawer'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key pressed', () => {
    const onClose = vi.fn();
    render(<ProjectDrawer project={makeProject()} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
