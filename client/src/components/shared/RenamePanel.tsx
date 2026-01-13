/**
 * FR-138: Rename Tool - Complete rename interface with chapter/sequence/tags/preview
 *
 * Full-featured rename drawer with:
 * - Chapter dropdown (01-99)
 * - Sequence preserve/renumber controls
 * - Tags checkboxes + custom input
 * - Real-time preview
 * - Validation
 */

import { useState, useMemo, useEffect } from 'react'
import { toast } from 'sonner'
import { useConfig } from '../../hooks/useApi'
import { parseRecordingFilename, extractTagsFromName, validateLabel, formatChapter } from '../../../../shared/naming'

interface RenamePanelProps {
  selectedFiles: string[]
  onClose: () => void
  onSuccess: () => void
}

interface PreviewItem {
  from: string
  to: string
  valid: boolean
  warning?: string
}

export function RenamePanel({ selectedFiles, onClose, onSuccess }: RenamePanelProps) {
  const { data: config } = useConfig()

  // State
  const [chapter, setChapter] = useState('')
  const [sequenceMode, setSequenceMode] = useState<'preserve' | 'renumber'>('renumber')
  const [sequenceStart, setSequenceStart] = useState(1)
  const [label, setLabel] = useState('')
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())
  const [customTag, setCustomTag] = useState('')
  const [showCustomTagInput, setShowCustomTagInput] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [chaptersInfo, setChaptersInfo] = useState<string | null>(null)

  // Pre-fill tags only (NOT chapter - user must choose explicitly)
  useEffect(() => {
    if (selectedFiles.length === 0) return

    // Detect which chapters are in selection (for info message only)
    const chaptersSet = new Set<string>()
    selectedFiles.forEach(f => {
      const parsed = parseRecordingFilename(f)
      if (parsed) {
        chaptersSet.add(parsed.chapter)
      }
    })

    const chapters = Array.from(chaptersSet).sort()

    if (chapters.length === 1) {
      // Single chapter - show simple info
      setChaptersInfo(`ℹ️ All files are from chapter ${chapters[0]}`)
    } else if (chapters.length > 1) {
      // Multiple chapters - show info message
      setChaptersInfo(`ℹ️ Selected files from chapters: ${chapters.join(', ')}`)
    } else {
      setChaptersInfo(null)
    }

    // Detect tags from first file
    const firstFile = selectedFiles[0]
    if (firstFile) {
      const nameWithTags = firstFile.replace('.mov', '')
      const { tags } = extractTagsFromName(nameWithTags)
      setSelectedTags(new Set(tags))
    }
  }, [selectedFiles])

  // Generate chapter options (01-99)
  const chapterOptions = useMemo(() => {
    const options = []
    for (let i = 1; i <= 99; i++) {
      options.push(formatChapter(i))
    }
    return options
  }, [])

  // Validation
  const labelError = useMemo(() => {
    if (!label) return null
    return validateLabel(label)
  }, [label])

  const isValid = useMemo(() => {
    return (
      chapter &&
      label.trim() !== '' &&
      !labelError &&
      selectedFiles.length > 0
    )
  }, [chapter, label, labelError, selectedFiles.length])

  // Preview generation
  const preview = useMemo((): PreviewItem[] => {
    if (!label || !chapter) return []

    return selectedFiles.map((filename, index) => {
      const parsed = parseRecordingFilename(filename)
      if (!parsed) {
        return {
          from: filename,
          to: filename,
          valid: false,
          warning: 'Invalid filename format'
        }
      }

      // Determine new sequence
      const newSequence = sequenceMode === 'preserve'
        ? parsed.sequence || '1'
        : String(sequenceStart + index)

      // Build new filename
      const tags = Array.from(selectedTags)
      const tagSuffix = tags.length > 0 ? `-${tags.join('-')}` : ''
      const newFilename = `${chapter}-${newSequence}-${label}${tagSuffix}.mov`

      return {
        from: filename,
        to: newFilename,
        valid: true
      }
    })
  }, [selectedFiles, chapter, sequenceMode, sequenceStart, label, selectedTags])

  // Calculate estimated transcript time
  const estimatedTime = useMemo(() => {
    const minutes = selectedFiles.length * 10
    return minutes
  }, [selectedFiles.length])

  // Toggle tag selection
  const toggleTag = (tag: string) => {
    setSelectedTags(prev => {
      const next = new Set(prev)
      if (next.has(tag)) {
        next.delete(tag)
      } else {
        if (next.size >= 5) {
          toast.error('Maximum 5 tags allowed')
          return prev
        }
        next.add(tag)
      }
      return next
    })
  }

  // Add custom tag
  const addCustomTag = () => {
    const trimmed = customTag.trim()
    if (!trimmed) return

    // Validate uppercase only
    if (!/^[A-Z]+$/.test(trimmed)) {
      toast.error('Tags must be uppercase letters only')
      return
    }

    if (trimmed.length > 10) {
      toast.error('Tag must be 10 characters or less')
      return
    }

    if (selectedTags.has(trimmed)) {
      toast.error('Tag already added')
      return
    }

    if (selectedTags.size >= 5) {
      toast.error('Maximum 5 tags allowed')
      return
    }

    setSelectedTags(prev => new Set([...prev, trimmed]))
    setCustomTag('')
    setShowCustomTagInput(false)
  }

  // Remove tag
  const removeTag = (tag: string) => {
    setSelectedTags(prev => {
      const next = new Set(prev)
      next.delete(tag)
      return next
    })
  }

  // Handle rename submission
  const handleRename = async () => {
    if (!isValid) return

    setIsRenaming(true)
    try {
      const response = await fetch('http://localhost:5101/api/manage/bulk-rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: selectedFiles,
          chapter,
          sequenceMode,
          sequenceStart: sequenceMode === 'renumber' ? sequenceStart : undefined,
          label,
          tags: Array.from(selectedTags)
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success(`Renamed ${data.renamedCount} file${data.renamedCount !== 1 ? 's' : ''}`, {
          duration: 5000
        })
        if (data.transcriptionQueued) {
          toast.info('Transcriptions queued (view progress in Transcriptions tab)', {
            duration: 5000
          })
        }
        onSuccess()
        onClose()
      } else {
        toast.error(data.error || 'Failed to rename files')
        if (data.errors && data.errors.length > 0) {
          console.error('Rename errors:', data.errors)
        }
      }
    } catch (err) {
      console.error('[RenamePanel] Error:', err)
      toast.error('Failed to rename files')
    } finally {
      setIsRenaming(false)
    }
  }

  const availableTags = config?.availableTags || []

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-sm text-gray-600">
        Renaming {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''}
      </div>

      {/* Chapter Dropdown */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Chapter Number
        </label>
        <select
          value={chapter}
          onChange={(e) => setChapter(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={isRenaming}
        >
          <option value="">Select chapter...</option>
          {chapterOptions.map(ch => (
            <option key={ch} value={ch}>{ch}</option>
          ))}
        </select>
        {chaptersInfo && (
          <p className="mt-1 text-xs text-blue-600">{chaptersInfo}</p>
        )}
      </div>

      {/* Sequence Numbering */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Sequence Numbering
        </label>
        <div className="space-y-2">
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="radio"
              checked={sequenceMode === 'preserve'}
              onChange={() => setSequenceMode('preserve')}
              disabled={isRenaming}
              className="mt-0.5 w-4 h-4 text-blue-600 focus:ring-blue-500"
            />
            <div className="flex-1">
              <div className="text-sm text-gray-700">Preserve original numbers</div>
              <div className="text-xs text-gray-500">
                ({chapter || '05'}-2 → {chapter || '05'}-2, {chapter || '05'}-5 → {chapter || '05'}-5)
              </div>
            </div>
          </label>
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="radio"
              checked={sequenceMode === 'renumber'}
              onChange={() => setSequenceMode('renumber')}
              disabled={isRenaming}
              className="mt-0.5 w-4 h-4 text-blue-600 focus:ring-blue-500"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">Renumber starting from:</span>
                <input
                  type="number"
                  min="1"
                  max="999"
                  value={sequenceStart}
                  onChange={(e) => setSequenceStart(Math.max(1, Math.min(999, parseInt(e.target.value) || 1)))}
                  disabled={isRenaming || sequenceMode !== 'renumber'}
                  className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                />
              </div>
              <div className="text-xs text-gray-500">
                ({chapter || '05'}-2 → {chapter || '05'}-{sequenceStart}, {chapter || '05'}-5 → {chapter || '05'}-{sequenceStart + 1})
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Name (Label) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Name (Label)
        </label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="intro-to-platform"
          disabled={isRenaming}
          className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 ${
            labelError ? 'border-red-300' : 'border-gray-300'
          }`}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && isValid && !isRenaming) {
              handleRename()
            }
          }}
        />
        {labelError ? (
          <p className="mt-1 text-xs text-red-600">{labelError}</p>
        ) : (
          <p className="mt-1 text-xs text-gray-500">Must be kebab-case (a-z, 0-9, hyphens)</p>
        )}
      </div>

      {/* Tags (Optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tags (Optional)
        </label>
        <div className="flex flex-wrap gap-2">
          {availableTags.map(tag => {
            const isSelected = selectedTags.has(tag)
            return (
              <label
                key={tag}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-blue-100 border-2 border-blue-500 text-blue-700'
                    : 'bg-gray-100 border-2 border-gray-300 text-gray-700 hover:border-gray-400'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleTag(tag)}
                  disabled={isRenaming}
                  className="w-3 h-3 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm font-medium">{tag}</span>
              </label>
            )
          })}
        </div>

        {/* Custom tags display */}
        {Array.from(selectedTags).filter(tag => !availableTags.includes(tag)).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {Array.from(selectedTags)
              .filter(tag => !availableTags.includes(tag))
              .map(tag => (
                <div
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 border border-purple-300 rounded text-sm"
                >
                  <span className="font-medium text-purple-700">{tag}</span>
                  <button
                    onClick={() => removeTag(tag)}
                    disabled={isRenaming}
                    className="text-purple-500 hover:text-purple-700 disabled:opacity-50"
                    title="Remove tag"
                  >
                    ×
                  </button>
                </div>
              ))}
          </div>
        )}

        {/* Add Custom Tag */}
        {!showCustomTagInput ? (
          <button
            onClick={() => setShowCustomTagInput(true)}
            disabled={isRenaming || selectedTags.size >= 5}
            className="mt-2 text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400"
          >
            + Add Custom Tag
          </button>
        ) : (
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={customTag}
              onChange={(e) => setCustomTag(e.target.value.toUpperCase())}
              placeholder="CUSTOM"
              maxLength={10}
              disabled={isRenaming}
              className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  addCustomTag()
                } else if (e.key === 'Escape') {
                  setCustomTag('')
                  setShowCustomTagInput(false)
                }
              }}
              autoFocus
            />
            <button
              onClick={addCustomTag}
              disabled={isRenaming || !customTag.trim()}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
            >
              Add
            </button>
            <button
              onClick={() => {
                setCustomTag('')
                setShowCustomTagInput(false)
              }}
              disabled={isRenaming}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        )}
        <p className="mt-1 text-xs text-gray-500">
          {selectedTags.size}/5 tags selected
        </p>
      </div>

      {/* Preview Section */}
      {preview.length > 0 && label && (
        <div className="border-t pt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Preview (first {Math.min(5, preview.length)} file{preview.length !== 1 ? 's' : ''}):
          </label>
          <div className="space-y-2 bg-gray-50 rounded-lg p-3 max-h-64 overflow-y-auto">
            {preview.slice(0, 5).map((item, index) => (
              <div key={index} className="text-xs font-mono">
                <div className="flex items-start gap-2">
                  <span className={item.valid ? 'text-green-600' : 'text-red-600'}>
                    {item.valid ? '✓' : '⚠'}
                  </span>
                  <div className="flex-1">
                    <div className="text-gray-500">{item.from}</div>
                    <div className="text-blue-600 ml-2">→ {item.to}</div>
                    {item.warning && (
                      <div className="text-orange-600 ml-2 text-xs">{item.warning}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {preview.length > 5 && (
              <div className="text-xs text-gray-500 text-center pt-1">
                ... and {preview.length - 5} more file{preview.length - 5 !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Warning Banner */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
        <p className="text-sm text-yellow-800">
          ⚠️ Transcripts will be regenerated (~{estimatedTime} minutes)
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={handleRename}
          disabled={!isValid || isRenaming}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {isRenaming ? 'Renaming...' : 'Apply Rename'}
        </button>
        <button
          onClick={onClose}
          disabled={isRenaming}
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Close
        </button>
      </div>
    </div>
  )
}
