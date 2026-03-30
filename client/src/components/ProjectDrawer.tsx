// FR-148: Project detail drawer
import { useEffect, useCallback } from 'react';
import { useOpenFolder } from '../hooks/useOpenFolder';
import { STAGE_DISPLAY } from './ProjectListToolbar';
import { copyProjectTranscript } from '../utils/clipboard';
import { daysAgo, formatDate } from '../utils/formatting';
import type { ProjectStats } from '../../../shared/types';

interface ProjectDrawerProps {
  project: ProjectStats | null;
  onClose: () => void;
}

function daysAgoLabel(dateStr: string | null): string {
  const d = daysAgo(dateStr);
  if (d === Infinity) return 'unknown';
  if (d === 0) return 'today';
  if (d === 1) return '1 day ago';
  return `${d} days ago`;
}

// FR-148: Health assessment logic
export function getHealthAssessment(project: ProjectStats): string {
  const { stage, totalFiles, transcriptPercent, lastModified } = project;
  const daysSince = daysAgo(lastModified);

  if (stage === 'planning' && totalFiles === 0) {
    return 'Project is in planning stage';
  }
  if (totalFiles <= 2 && daysSince > 30) {
    return 'This project appears inactive (no activity in 30+ days)';
  }
  if (transcriptPercent === 100 && stage === 'recording') {
    return 'Ready to edit — all recordings transcribed';
  }
  if (transcriptPercent > 0 && transcriptPercent < 100) {
    const missing = project.transcriptSync.missingCount;
    return missing > 0
      ? `Transcripts ${transcriptPercent}% complete — ${missing} recordings need transcription`
      : `Transcripts ${transcriptPercent}% complete`;
  }
  if (totalFiles > 0 && transcriptPercent === 0) {
    return 'Needs attention — recordings exist but no transcripts';
  }
  return STAGE_DISPLAY[stage]?.description ?? '';
}

export function ProjectDrawer({ project, onClose }: ProjectDrawerProps) {
  const openFolder = useOpenFolder();
  const isOpen = project !== null;

  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!project) return null;

  const stage = STAGE_DISPLAY[project.stage] ?? {
    label: project.stage,
    bg: '',
    text: 'text-warm-muted',
    description: '',
  };

  const checklist = [
    { label: 'Has recordings', ok: project.totalFiles > 0 },
    { label: 'Has transcripts', ok: project.transcriptPercent > 0 },
    { label: 'Has chapters', ok: project.hasChapters },
    { label: 'Has final video', ok: project.hasFinal },
  ];

  return (
    <>
      {/* Backdrop overlay */}
      <div
        data-testid="drawer-backdrop"
        className="fixed inset-0 bg-black/30 z-40 transition-opacity duration-300"
        style={{ opacity: isOpen ? 1 : 0 }}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        data-testid="drawer-panel"
        className="fixed top-0 right-0 h-full z-50 bg-surface border-l border-warm overflow-y-auto shadow-xl transition-transform duration-300 ease-in-out"
        style={{
          width: '40vw',
          minWidth: '360px',
          maxWidth: '600px',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-warm">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-mono font-bold text-warm-primary">
              {project.code}
            </span>
            <span
              className={`px-2 py-0.5 rounded text-xs font-semibold ${stage.bg} ${stage.text}`}
              title={stage.description}
            >
              {stage.label}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-warm-muted hover:text-warm-primary transition-colors text-xl leading-none p-1"
            aria-label="Close drawer"
          >
            ✕
          </button>
        </div>

        {/* Stats grid */}
        <div className="px-6 py-5 border-b border-warm">
          <div className="grid grid-cols-3 gap-4">
            {[
              { value: project.totalFiles, label: 'Recordings' },
              { value: project.chapterCount, label: 'Chapters' },
              { value: `${project.transcriptPercent}%`, label: 'Transcript' },
              { value: project.imageCount, label: 'Images' },
              { value: project.thumbCount, label: 'Thumbnails' },
              { value: project.shadowCount, label: 'Shadows' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl font-bold text-warm-primary">{stat.value}</div>
                <div className="text-xs text-warm-muted">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Progress checklist */}
        <div className="px-6 py-5 border-b border-warm">
          <h3 className="text-sm font-semibold text-warm-secondary mb-3">Progress</h3>
          <ul className="space-y-2">
            {checklist.map((item) => (
              <li key={item.label} className="flex items-center gap-2 text-sm">
                <span className={item.ok ? 'text-green-600' : 'text-warm-muted'}>
                  {item.ok ? '✓' : '—'}
                </span>
                <span className={item.ok ? 'text-warm-primary' : 'text-warm-muted'}>
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Health assessment */}
        <div className="px-6 py-5 border-b border-warm">
          <h3 className="text-sm font-semibold text-warm-secondary mb-2">Health</h3>
          <p className="text-sm text-warm-primary leading-relaxed">
            {getHealthAssessment(project)}
          </p>
        </div>

        {/* Quick actions */}
        <div className="px-6 py-5 border-b border-warm">
          <h3 className="text-sm font-semibold text-warm-secondary mb-3">Quick Actions</h3>
          <div className="flex gap-3">
            <button
              onClick={() =>
                openFolder.mutate({ folder: 'recordings', projectCode: project.code })
              }
              className="flex-1 px-4 py-2 text-sm font-medium rounded border border-warm bg-surface-muted hover:bg-surface-hover text-warm-primary transition-colors"
            >
              Open in Finder
            </button>
            <button
              onClick={() => copyProjectTranscript(project.code)}
              className="flex-1 px-4 py-2 text-sm font-medium rounded border border-warm bg-surface-muted hover:bg-surface-hover text-warm-primary transition-colors"
            >
              Copy Transcript
            </button>
          </div>
        </div>

        {/* Metadata */}
        <div className="px-6 py-5">
          <h3 className="text-sm font-semibold text-warm-secondary mb-2">Metadata</h3>
          <p className="text-sm text-warm-muted">
            Last modified: {formatDate(project.lastModified)}{' '}
            <span className="text-warm-faint">({daysAgoLabel(project.lastModified)})</span>
          </p>
        </div>
      </div>
    </>
  );
}
