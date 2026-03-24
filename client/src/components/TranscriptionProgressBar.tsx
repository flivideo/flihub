// FR-52: Transcription Progress Bar
// Shows project-wide transcription status at a glance

import { useConfig, useProjects } from '../hooks/useApi';
import type { TranscriptionsResponse } from '../../../shared/types';

interface TranscriptionProgressBarProps {
  transcriptionData: TranscriptionsResponse | undefined;
}

export function TranscriptionProgressBar({ transcriptionData }: TranscriptionProgressBarProps) {
  const { data: config } = useConfig();
  const { data: projectsData } = useProjects();

  // Find current project stats
  const currentProject = projectsData?.projects?.find((p) => {
    if (!config?.projectDirectory) return false;
    return config.projectDirectory === p.path || config.projectDirectory === `${p.path}/`;
  });

  // If no project selected or no stats, show nothing
  if (!currentProject) {
    return null;
  }

  const { totalFiles, transcriptCount, transcriptPercent, transcriptSync } = currentProject;
  const activeCount = transcriptionData?.active ? 1 : 0;
  const queuedCount = transcriptionData?.queue?.length || 0;
  const missingCount = transcriptSync?.missingCount || 0;

  // Handle empty state
  if (totalFiles === 0) {
    return (
      <section className="mb-6">
        <div className="border rounded-lg p-4 bg-surface-muted">
          <h3 className="text-sm font-medium text-warm-secondary mb-2">Transcription Progress</h3>
          <p className="text-sm text-warm-muted">
            No recordings yet. Add recordings to start transcribing.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-6">
      <div className="border rounded-lg p-4 bg-surface">
        <h3 className="text-sm font-medium text-warm-secondary mb-3">Transcription Progress</h3>

        {/* Progress bar */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 h-2 bg-warm rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-300"
              style={{ width: `${transcriptPercent}%` }}
            />
          </div>
          <span className="text-sm text-warm-secondary whitespace-nowrap font-medium">
            {transcriptCount}/{totalFiles} files ({Math.round(transcriptPercent)}%)
          </span>
        </div>

        {/* Status chips */}
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {/* Complete count */}
          <span className="text-green-600">
            <span className="mr-1">✓</span>
            {transcriptCount} complete
          </span>

          {/* Divider */}
          <span className="text-warm-faint">│</span>

          {/* Active - only show if there's an active job */}
          {activeCount > 0 && (
            <>
              <span className="text-blue-600">
                <span className="mr-1">⏳</span>
                {activeCount} active
              </span>
              <span className="text-warm-faint">│</span>
            </>
          )}

          {/* Queued - only show if queue is not empty */}
          {queuedCount > 0 && (
            <>
              <span className="text-warm-secondary">
                <span className="mr-1">📋</span>
                {queuedCount} queued
              </span>
              <span className="text-warm-faint">│</span>
            </>
          )}

          {/* Missing - only show if > 0 */}
          {missingCount > 0 && (
            <span className="text-amber-600">
              <span className="mr-1">⚠</span>
              {missingCount} missing
            </span>
          )}

          {/* All done message */}
          {transcriptPercent === 100 && queuedCount === 0 && activeCount === 0 && (
            <span className="text-green-600 font-medium">All recordings transcribed!</span>
          )}
        </div>
      </div>
    </section>
  );
}
