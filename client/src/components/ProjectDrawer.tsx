// FR-148: Project detail drawer — matches Mochaccino mockup design
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

  const stats = [
    { value: project.totalFiles, label: 'Recordings' },
    { value: project.chapterCount, label: 'Chapters' },
    { value: `${project.transcriptPercent}%`, label: 'Transcripts' },
    { value: project.imageCount, label: 'Images' },
    { value: project.thumbCount, label: 'Thumbs' },
    { value: project.shadowCount, label: 'Shadows' },
  ];

  return (
    <div
      data-testid="drawer-panel"
      className="absolute top-0 right-0 h-full z-10 bg-surface border-l border-warm-strong overflow-y-auto transition-transform duration-300 ease-in-out"
      style={{
        width: '40%',
        minWidth: '360px',
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        boxShadow: '-4px 0 20px rgba(0,0,0,0.08)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-warm">
        <h2 className="flex items-center gap-2.5">
          <span className="text-lg font-bold text-warm-primary">{project.code}</span>
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${stage.bg} ${stage.text}`}
          >
            {stage.label}
          </span>
        </h2>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-md border border-warm bg-surface-muted flex items-center justify-center text-warm-muted hover:bg-warm hover:text-warm-primary transition-colors text-base leading-none"
          aria-label="Close drawer"
        >
          &times;
        </button>
      </div>

      {/* Body */}
      <div className="px-5 py-4 flex flex-col gap-4">
        {/* Project name */}
        <div className="text-[15px] font-semibold text-warm-primary">
          {project.code.replace(/^[a-zA-Z]\d{2}-?/, '')}
        </div>

        {/* Stats grid */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wide text-warm-faint mb-1.5">Stats</div>
          <div className="grid grid-cols-3 gap-2">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="bg-surface-muted border border-warm rounded-lg px-2.5 py-2 text-center"
              >
                <div className="text-xl font-bold text-warm-primary leading-tight">{stat.value}</div>
                <div className="text-[10px] uppercase tracking-wide text-warm-muted">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Progress checklist */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wide text-warm-faint mb-1.5">Progress Checklist</div>
          <div className="flex flex-col gap-1">
            {checklist.map((item) => (
              <div key={item.label} className="flex items-center gap-2 py-1 text-[13px]">
                <span
                  className={`w-[18px] h-[18px] rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${
                    item.ok
                      ? 'bg-green-100 text-green-600'
                      : 'bg-red-50 text-red-500'
                  }`}
                >
                  {item.ok ? '\u2713' : '\u2715'}
                </span>
                <span className={item.ok ? 'text-warm-secondary' : 'text-warm-muted'}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Health assessment */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wide text-warm-faint mb-1.5">Health Assessment</div>
          <div className="bg-surface-muted border border-warm rounded-lg px-3.5 py-3 text-[13px] leading-relaxed text-warm-secondary">
            {getHealthAssessment(project)}
          </div>
        </div>

        {/* Quick actions */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wide text-warm-faint mb-1.5">Quick Actions</div>
          <div className="flex gap-2">
            <button
              onClick={() =>
                openFolder.mutate({ folder: 'recordings', projectCode: project.code })
              }
              className="flex-1 py-1.5 px-3 text-xs font-medium rounded-md border border-warm bg-surface-muted hover:bg-warm text-warm-secondary transition-colors text-center"
            >
              Open in Finder
            </button>
            <button
              onClick={() => copyProjectTranscript(project.code)}
              className="flex-1 py-1.5 px-3 text-xs font-medium rounded-md border border-warm bg-surface-muted hover:bg-warm text-warm-secondary transition-colors text-center"
            >
              Copy Transcript
            </button>
          </div>
        </div>

        {/* Metadata */}
        <div className="flex justify-between text-[11px] text-warm-faint">
          <span>Last modified: {formatDate(project.lastModified)}</span>
          <span>{daysAgoLabel(project.lastModified)}</span>
        </div>
      </div>
    </div>
  );
}
