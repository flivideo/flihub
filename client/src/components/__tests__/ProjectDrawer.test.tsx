import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProjectDrawer } from '../ProjectDrawer';
import type { ProjectStats } from '../../../../shared/types';

// FR-151: Mock useTranscribeAll
const transcribeAllMutateMock = vi.fn();
vi.mock('../../hooks/useTranscriptionsApi', () => ({
  useTranscribeAll: () => ({
    mutate: transcribeAllMutateMock,
    isPending: false,
  }),
}));

// Mock useOpenFolder
const mutateMock = vi.fn();
vi.mock('../../hooks/useOpenFolder', () => ({
  useOpenFolder: () => ({ mutate: mutateMock }),
}));

// B062: ProjectDrawer uses useProjectDisk (React Query) — wrap renders with a QueryClient
function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

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
    ...overrides,
  }) as ProjectStats;
}

describe('ProjectDrawer', () => {
  it('renders nothing when project is null', () => {
    const { container } = renderWithQuery(<ProjectDrawer project={null} onClose={vi.fn()} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders project code and stage badge when given a project', () => {
    renderWithQuery(<ProjectDrawer project={makeProject()} onClose={vi.fn()} />);
    expect(screen.getByText('b42')).toBeInTheDocument();
    expect(screen.getByText('REC')).toBeInTheDocument();
  });

  it('shows correct stats numbers', () => {
    renderWithQuery(
      <ProjectDrawer
        project={makeProject({ totalFiles: 5, chapterCount: 3, imageCount: 2, thumbCount: 1 })}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText('Recordings').previousElementSibling?.textContent).toBe('5');
    expect(screen.getByText('Chapters').previousElementSibling?.textContent).toBe('3');
    expect(screen.getByText('Images').previousElementSibling?.textContent).toBe('2');
    expect(screen.getByText('Thumbs').previousElementSibling?.textContent).toBe('1');
    expect(screen.getByText('Transcripts').previousElementSibling?.textContent).toBe('80%');
  });

  it('shows progress checklist items', () => {
    renderWithQuery(<ProjectDrawer project={makeProject()} onClose={vi.fn()} />);
    expect(screen.getByText('Has recordings')).toBeInTheDocument();
    expect(screen.getByText('Has transcripts')).toBeInTheDocument();
    expect(screen.getByText('Has chapters')).toBeInTheDocument();
    expect(screen.getByText('Has final video')).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    renderWithQuery(<ProjectDrawer project={makeProject()} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText('Close drawer'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key pressed', () => {
    const onClose = vi.fn();
    renderWithQuery(<ProjectDrawer project={makeProject()} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // FR-151: Transcribe All button visibility + click
  it('shows Transcribe All button when totalFiles > 0 and transcriptPercent < 100', () => {
    renderWithQuery(
      <ProjectDrawer
        project={makeProject({ totalFiles: 5, transcriptPercent: 80 })}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText('Transcribe All')).toBeInTheDocument();
  });

  it('hides Transcribe All button when transcriptPercent is 100', () => {
    renderWithQuery(
      <ProjectDrawer
        project={makeProject({ totalFiles: 5, transcriptPercent: 100 })}
        onClose={vi.fn()}
      />
    );
    expect(screen.queryByText('Transcribe All')).not.toBeInTheDocument();
  });

  it('hides Transcribe All button when totalFiles is 0', () => {
    renderWithQuery(
      <ProjectDrawer
        project={makeProject({ totalFiles: 0, transcriptPercent: 0 })}
        onClose={vi.fn()}
      />
    );
    expect(screen.queryByText('Transcribe All')).not.toBeInTheDocument();
  });

  it('calls transcribeAll.mutate with scope=project when Transcribe All clicked', async () => {
    transcribeAllMutateMock.mockClear();
    renderWithQuery(
      <ProjectDrawer
        project={makeProject({ totalFiles: 5, transcriptPercent: 50 })}
        onClose={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText('Transcribe All'));
    await waitFor(() => {
      expect(transcribeAllMutateMock).toHaveBeenCalledWith(
        { scope: 'project' },
        expect.any(Object)
      );
    });
  });
});
