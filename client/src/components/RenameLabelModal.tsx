// FR-47: Modal for renaming the label portion of all recordings in a chapter
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { useRenameChapter } from '../hooks/useApi'
import { toKebabCase } from '../utils/formatting'

interface FileToRename {
  filename: string
  isSafe: boolean  // FR-111: State-based safe flag
}

interface ChapterInfo {
  chapter: string      // e.g., "04"
  label: string        // e.g., "access-specification"
  files: FileToRename[]  // Files that will be renamed
}

interface RenameLabelModalProps {
  chapterInfo: ChapterInfo
  onClose: () => void
}

export function RenameLabelModal({ chapterInfo, onClose }: RenameLabelModalProps) {
  const renameMutation = useRenameChapter()
  const [newLabel, setNewLabel] = useState(chapterInfo.label)

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Enter' && !renameMutation.isPending && newLabel && newLabel !== chapterInfo.label) {
      e.preventDefault()
      handleRename()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }, [newLabel, chapterInfo.label, renameMutation.isPending, onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const handleRename = async () => {
    if (!newLabel || newLabel === chapterInfo.label) {
      return
    }

    try {
      const result = await renameMutation.mutateAsync({
        chapter: chapterInfo.chapter,
        currentLabel: chapterInfo.label,
        newLabel: newLabel,
      })

      if (result.success) {
        toast.success(`Renamed ${result.renamedFiles.length} file(s)`)
        onClose()
      } else {
        toast.error(result.error || 'Failed to rename')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to rename')
    }
  }

  const hasChanges = newLabel && newLabel !== chapterInfo.label

  // Build preview of new chapter name
  const previewName = `${chapterInfo.chapter}-*-${newLabel}[-tags].mov`

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Rename Chapter
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          {/* Chapter (locked) */}
          <div>
            <label className="block text-sm text-gray-500 mb-1">Chapter</label>
            <div className="px-3 py-2 bg-gray-100 border border-gray-200 rounded text-sm font-mono text-gray-500">
              {chapterInfo.chapter}
            </div>
          </div>

          {/* Current label */}
          <div>
            <label className="block text-sm text-gray-500 mb-1">Current Label</label>
            <div className="px-3 py-2 bg-gray-100 border border-gray-200 rounded text-sm font-mono text-gray-500">
              {chapterInfo.label}
            </div>
          </div>

          {/* New label (editable) */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">New Label</label>
            <input
              type="text"
              value={newLabel}
              onChange={(e) => {
                const val = e.target.value.toLowerCase().replace(/[^a-z0-9\s-]/g, '')
                setNewLabel(val)
              }}
              onBlur={(e) => {
                const kebab = toKebabCase(e.target.value)
                if (kebab !== newLabel) {
                  setNewLabel(kebab)
                }
              }}
              className="w-full px-3 py-2 text-sm font-mono border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="new-label"
              autoFocus
            />
          </div>

          {/* Preview */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">Preview Pattern</label>
            <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded text-sm font-mono text-blue-700">
              {previewName}
            </div>
          </div>

          {/* Files to rename */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Files to rename ({chapterInfo.files.length} recordings + transcripts)
            </label>
            <div className="max-h-40 overflow-y-auto border border-gray-200 rounded bg-gray-50">
              {chapterInfo.files.map((file, idx) => (
                <div
                  key={idx}
                  className="px-3 py-1.5 text-xs font-mono text-gray-600 border-b border-gray-100 last:border-b-0 flex items-center gap-2"
                >
                  {/* FR-111: Use isSafe flag instead of folder check */}
                  <span className={file.isSafe ? 'text-green-600' : 'text-gray-400'}>
                    {file.isSafe ? '🔒' : '📁'}
                  </span>
                  <span className="truncate">{file.filename}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Associated transcript files will also be renamed
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={renameMutation.isPending}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleRename}
            disabled={renameMutation.isPending || !hasChanges}
            className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {renameMutation.isPending ? 'Renaming...' : 'Rename All'}
          </button>
        </div>
      </div>
    </div>
  )
}
