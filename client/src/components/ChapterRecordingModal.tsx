/**
 * FR-58: Chapter Recording Modal
 *
 * Options modal for generating combined chapter preview videos.
 * Allows configuration of slide duration, resolution, and chapter selection.
 */

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  useChapterRecordingConfig,
  useUpdateChapterRecordingConfig,
  useChapterRecordingStatus,
  useGenerateChapterRecordings,
} from '../hooks/useApi'
import { useChapterRecordingSocket } from '../hooks/useSocket'
import { formatDuration } from '../utils/formatting'

interface ChapterRecordingModalProps {
  onClose: () => void
}

export function ChapterRecordingModal({ onClose }: ChapterRecordingModalProps) {
  const { data: configData } = useChapterRecordingConfig()
  const { data: statusData, refetch: refetchStatus } = useChapterRecordingStatus()
  const updateConfig = useUpdateChapterRecordingConfig()
  const generateRecordings = useGenerateChapterRecordings()

  // FR-58: Listen for completion events (shows green toast)
  useChapterRecordingSocket()

  // Local state for form
  const [slideDuration, setSlideDuration] = useState(1.0)
  const [resolution, setResolution] = useState<'720p' | '1080p'>('720p')
  const [autoGenerate, setAutoGenerate] = useState(false)
  const [includeTitleSlides, setIncludeTitleSlides] = useState(false)
  const [scope, setScope] = useState<'all' | 'single'>('all')
  const [selectedChapter, setSelectedChapter] = useState<string>('')

  // Sync from server config when loaded
  useEffect(() => {
    if (configData?.config) {
      setSlideDuration(configData.config.slideDuration)
      setResolution(configData.config.resolution)
      setAutoGenerate(configData.config.autoGenerate)
      setIncludeTitleSlides(configData.config.includeTitleSlides ?? false)
    }
  }, [configData])

  // Set default selected chapter when status loads
  useEffect(() => {
    if (statusData?.chapters?.length && !selectedChapter) {
      setSelectedChapter(statusData.chapters[0].chapter)
    }
  }, [statusData, selectedChapter])

  // Handle generate
  const handleGenerate = async () => {
    // Save config first
    await updateConfig.mutateAsync({
      slideDuration,
      resolution,
      autoGenerate,
      includeTitleSlides,
    })

    // Generate recordings
    const request = scope === 'all' ? {} : { chapter: selectedChapter }
    generateRecordings.mutate(request, {
      onSuccess: () => {
        toast.info('Chapter recording generation started...')
        // Keep modal open to show progress
        refetchStatus()
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : 'Failed to start generation')
      },
    })
  }

  // Close on Escape
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !statusData?.isGenerating) {
      onClose()
    }
  }

  const isGenerating = statusData?.isGenerating || generateRecordings.isPending
  const chapters = statusData?.chapters || []

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={() => !isGenerating && onClose()}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div
        className="bg-white rounded-lg w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-medium">Create Chapter Recordings</h3>
          <button
            onClick={() => !isGenerating && onClose()}
            disabled={isGenerating}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
            title="Close"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* FR-76: Include Title Slides Toggle */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeTitleSlides}
                onChange={(e) => setIncludeTitleSlides(e.target.checked)}
                className="w-4 h-4 text-purple-500 rounded"
                disabled={isGenerating}
              />
              <span className="text-sm text-gray-700">
                Include purple title slides between segments
              </span>
            </label>
          </div>

          {/* Slide Duration - only show when slides enabled */}
          {includeTitleSlides && (
            <div className="ml-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Slide Duration
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={slideDuration}
                  onChange={(e) => setSlideDuration(parseFloat(e.target.value) || 1.0)}
                  min={0.5}
                  max={5}
                  step={0.5}
                  className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isGenerating}
                />
                <span className="text-sm text-gray-500">seconds</span>
              </div>
            </div>
          )}

          {/* Resolution */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Resolution
            </label>
            <div className="space-y-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="resolution"
                  value="720p"
                  checked={resolution === '720p'}
                  onChange={() => setResolution('720p')}
                  className="text-blue-500"
                  disabled={isGenerating}
                />
                <span className="text-sm">720p (1280x720)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="resolution"
                  value="1080p"
                  checked={resolution === '1080p'}
                  onChange={() => setResolution('1080p')}
                  className="text-blue-500"
                  disabled={isGenerating}
                />
                <span className="text-sm">1080p (1920x1080)</span>
              </label>
            </div>
          </div>

          {/* Auto-generate */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoGenerate}
                onChange={(e) => setAutoGenerate(e.target.checked)}
                className="w-4 h-4 text-blue-500 rounded"
                disabled={isGenerating}
              />
              <span className="text-sm text-gray-700">
                Auto-generate when creating new chapter
              </span>
            </label>
          </div>

          {/* Chapter Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Chapters to generate
            </label>
            <div className="space-y-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="scope"
                  value="all"
                  checked={scope === 'all'}
                  onChange={() => setScope('all')}
                  className="text-blue-500"
                  disabled={isGenerating}
                />
                <span className="text-sm">All chapters ({chapters.length})</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="scope"
                  value="single"
                  checked={scope === 'single'}
                  onChange={() => setScope('single')}
                  className="text-blue-500"
                  disabled={isGenerating}
                />
                <span className="text-sm">Current chapter only:</span>
                <select
                  value={selectedChapter}
                  onChange={(e) => {
                    setSelectedChapter(e.target.value)
                    setScope('single')
                  }}
                  className="px-2 py-0.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                  disabled={isGenerating}
                >
                  {chapters.map((ch) => (
                    <option key={ch.chapter} value={ch.chapter}>
                      {ch.chapter} {ch.label} ({ch.segmentCount} segments, {formatDuration(ch.totalDuration, 'smart')})
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {/* Generation Progress */}
          {isGenerating && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-sm text-blue-700">Generating chapter recordings...</span>
              </div>
            </div>
          )}

          {/* Existing Recordings Info */}
          {statusData?.existing && statusData.existing.length > 0 && (
            <div className="text-xs text-gray-500">
              <span className="font-medium">{statusData.existing.length}</span> existing chapter recording{statusData.existing.length !== 1 ? 's' : ''} will be overwritten
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t bg-gray-50 rounded-b-lg">
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={isGenerating || chapters.length === 0}
            className="px-4 py-2 text-sm text-white bg-purple-600 hover:bg-purple-700 rounded transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generating...
              </>
            ) : (
              'Generate'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
