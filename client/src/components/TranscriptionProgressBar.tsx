// FR-52: Transcription Progress Bar
// Shows project-wide transcription status at a glance

import { useConfig, useProjects } from '../hooks/useApi'
import type { TranscriptionsResponse } from '../../../shared/types'

interface TranscriptionProgressBarProps {
  transcriptionData: TranscriptionsResponse | undefined
}

export function TranscriptionProgressBar({ transcriptionData }: TranscriptionProgressBarProps) {
  const { data: config } = useConfig()
  const { data: projectsData } = useProjects()

  // Find current project stats
  const currentProject = projectsData?.projects?.find(p => {
    if (!config?.projectDirectory) return false
    return config.projectDirectory === p.path ||
           config.projectDirectory === `${p.path}/`
  })

  // If no project selected or no stats, show nothing
  if (!currentProject) {
    return null
  }

  const { totalFiles, transcriptCount, transcriptPercent, transcriptSync } = currentProject
  const activeCount = transcriptionData?.active ? 1 : 0
  const queuedCount = transcriptionData?.queue?.length || 0
  const missingCount = transcriptSync?.missingCount || 0

  // Handle empty state
  if (totalFiles === 0) {
    return (
      <section className="mb-6">
        <div className="border rounded-lg p-4 bg-gray-50">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Transcription Progress</h3>
          <p className="text-sm text-gray-500">No recordings yet. Add recordings to start transcribing.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="mb-6">
      <div className="border rounded-lg p-4 bg-white">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Transcription Progress</h3>

        {/* Progress bar */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-300"
              style={{ width: `${transcriptPercent}%` }}
            />
          </div>
          <span className="text-sm text-gray-600 whitespace-nowrap font-medium">
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
          <span className="text-gray-300">│</span>

          {/* Active - only show if there's an active job */}
          {activeCount > 0 && (
            <>
              <span className="text-blue-600">
                <span className="mr-1">⏳</span>
                {activeCount} active
              </span>
              <span className="text-gray-300">│</span>
            </>
          )}

          {/* Queued - only show if queue is not empty */}
          {queuedCount > 0 && (
            <>
              <span className="text-gray-600">
                <span className="mr-1">📋</span>
                {queuedCount} queued
              </span>
              <span className="text-gray-300">│</span>
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
  )
}
