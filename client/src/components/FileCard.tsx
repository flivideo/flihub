import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useRename, useTrashFile } from '../hooks/useApi'
import type { FileInfo, RenameRequest } from '../../../shared/types'
import type { NamingState } from '../App'
import { formatFileSize, formatDuration, formatRelativeTime } from '../utils/formatting'
import { buildPreviewFilename } from '../utils/naming'

interface FileCardProps {
  file: FileInfo
  namingState: NamingState
  onRenamed: () => void
  onDiscarded: () => void
  takeRank?: 'best' | 'good' | null // FR-8: Best take (green), good take (yellow), or neither
}

export function FileCard({ file, namingState, onRenamed, onDiscarded, takeRank }: FileCardProps) {
  const { chapter, sequence, name, tags, customTag } = namingState

  // FR-89 DEBUG: Log naming state received by FileCard
  console.log('[FR-89 DEBUG FileCard] namingState received:', {
    chapter,
    sequence,
    name,
    tags,
    customTag,
    file: file.filename,
  })

  const renameMutation = useRename()
  const trashMutation = useTrashFile()

  // FR-46: Periodic refresh for relative time display
  const [, setTick] = useState(0)
  useEffect(() => {
    // Refresh every 10 seconds for recent files
    const interval = setInterval(() => setTick(t => t + 1), 10000)
    return () => clearInterval(interval)
  }, [])

  const handleRename = async () => {
    if (!chapter || !name) {
      toast.error('Chapter and name are required')
      return
    }

    // Validate chapter format
    if (!/^\d{2}$/.test(chapter)) {
      toast.error('Chapter must be 2 digits (01-99)')
      return
    }

    // Validate sequence if provided
    if (sequence && !/^\d+$/.test(sequence)) {
      toast.error('Sequence must be a number (1, 2, 3, ...)')
      return
    }

    // FR-21: Include custom tag in the tags array for the API
    const allTags = customTag ? [...tags, customTag] : tags

    const request: RenameRequest = {
      originalPath: file.path,
      chapter,
      sequence: sequence || null,
      name,
      tags: allTags,
    }

    try {
      const result = await renameMutation.mutateAsync(request)
      if (result.success) {
        toast.success(`Renamed to: ${result.newPath.split('/').pop()}`)
        onRenamed()
      } else {
        toast.error(result.error || 'Rename failed')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Rename failed')
    }
  }

  // FR-5: Discard moves to .trash/ directory
  const handleDiscard = async () => {
    try {
      const result = await trashMutation.mutateAsync(file.path)
      if (result.success) {
        toast.info('File moved to trash')
        onDiscarded()
      } else {
        toast.error(result.error || 'Failed to trash file')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to trash file')
    }
  }

  const isLoading = renameMutation.isPending || trashMutation.isPending

  // FR-8: Dynamic styling based on take rank (best = green, good = yellow)
  const cardClasses = takeRank === 'best'
    ? 'bg-green-50 rounded-lg border-2 border-green-400 p-4 shadow-sm'
    : takeRank === 'good'
      ? 'bg-yellow-50 rounded-lg border-2 border-yellow-400 p-4 shadow-sm'
      : 'bg-white rounded-lg border border-gray-200 p-4 shadow-sm'

  return (
    <div className={cardClasses}>
      {/* Original filename and metadata */}
      <div className="mb-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 truncate" title={file.filename}>
            {file.filename}
          </p>
          <div className="flex items-center gap-2">
            {/* NFR-7: Duration badge */}
            <span className="text-xs text-gray-600 font-mono">
              {formatDuration(file.duration)}
            </span>
            {/* FR-8: File size badge */}
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${
              takeRank === 'best'
                ? 'bg-green-200 text-green-800'
                : takeRank === 'good'
                  ? 'bg-yellow-200 text-yellow-800'
                  : 'bg-gray-100 text-gray-600'
            }`}>
              {formatFileSize(file.size)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* FR-46: Relative time with full timestamp on hover */}
          <p
            className="text-xs text-gray-400"
            title={new Date(file.timestamp).toLocaleString()}
          >
            {formatRelativeTime(file.timestamp)}
          </p>
          {takeRank === 'best' && (
            <span className="text-xs text-green-600 font-medium">★ Best take</span>
          )}
          {takeRank === 'good' && (
            <span className="text-xs text-yellow-600 font-medium">★ Good take</span>
          )}
        </div>
      </div>

      {/* Preview and actions */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Will rename to: <span className="font-mono text-blue-600">{buildPreviewFilename(chapter, sequence, name, tags, customTag)}</span>
        </p>

        <div className="flex gap-2">
          <button
            onClick={handleDiscard}
            disabled={isLoading}
            className="px-3 py-1.5 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
          >
            {trashMutation.isPending ? 'Trashing...' : 'Discard'}
          </button>
          <button
            onClick={handleRename}
            disabled={isLoading || !chapter || !name}
            className="px-4 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {renameMutation.isPending ? 'Renaming...' : 'Rename'}
          </button>
        </div>
      </div>
    </div>
  )
}
