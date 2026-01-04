/**
 * FR-131: Manage Panel (formerly Export Panel)
 *
 * Power tools for bulk operations and file management:
 * - Bulk rename operations (selected files + chapter-level)
 * - Export to Gling AI (FR-122/124/125/126)
 * - Edit folder management
 * - Visual style matching RecordingsView
 */

import { useState, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import { useRecordings, useConfig, fetchApi, useUpdateProjectDictionary } from '../hooks/useApi'
import {
  useEditPrep,
  useCreateEditFolders,
  useCreateEditFolder,
  useManifestStatus,
  useCleanEditFolder,
  useRestoreEditFolder
} from '../hooks/useEditApi'
import { useRecordingsSocket } from '../hooks/useSocket'
import { formatFileSize, formatChapterTitle } from '../utils/formatting'
import { LoadingSpinner, ErrorMessage } from './shared'
import { extractTagsFromName } from '../../../shared/naming'
import type { RecordingFile, EditFolderKey } from '../../../shared/types'

interface ChapterGroup {
  chapterKey: string
  title: string
  files: RecordingFile[]
  totalSize: number
}

// Extract display name from first file in chapter
function getChapterDisplayName(files: RecordingFile[]): string {
  const firstFile = files.find(f => f.sequence === '1') || files[0]
  if (!firstFile) return ''
  const { name } = extractTagsFromName(firstFile.name)
  return name
}

// Group recordings by chapter
function groupByChapter(recordings: RecordingFile[]): ChapterGroup[] {
  const groups = new Map<string, { files: RecordingFile[]; totalSize: number }>()

  for (const recording of recordings) {
    const key = recording.chapter
    if (!groups.has(key)) {
      groups.set(key, { files: [], totalSize: 0 })
    }
    const group = groups.get(key)!
    group.files.push(recording)
    group.totalSize += recording.size || 0
  }

  const result: ChapterGroup[] = []
  for (const [chapterKey, group] of groups.entries()) {
    // Sort files by sequence within chapter
    group.files.sort((a, b) => parseInt(a.sequence) - parseInt(b.sequence))

    result.push({
      chapterKey,
      title: getChapterDisplayName(group.files),
      files: group.files,
      totalSize: group.totalSize,
    })
  }

  // Sort chapters numerically
  return result.sort((a, b) => parseInt(a.chapterKey) - parseInt(b.chapterKey))
}

export function ManagePanel() {
  const { data, isLoading, error } = useRecordings()
  const { data: config } = useConfig()
  const { data: editPrepData } = useEditPrep() // FR-124: Get folder status
  const createFolders = useCreateEditFolders() // FR-124: Create all folders
  const createFolder = useCreateEditFolder() // FR-124: Create single folder
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [isCopying, setIsCopying] = useState(false)
  const [showParked, setShowParked] = useState(false) // FR-122: Default to hidden
  const [showGlingInfo, setShowGlingInfo] = useState(true) // FR-124: Gling prep info collapsed state
  // FR-125: Project dictionary editing
  const [editingDictionary, setEditingDictionary] = useState(false)
  const [projectDictionary, setProjectDictionary] = useState('')
  const updateProjectDictionary = useUpdateProjectDictionary()

  // FR-131: Bulk rename
  const [bulkRenameLabel, setBulkRenameLabel] = useState('')
  const [isRenaming, setIsRenaming] = useState(false)

  // Subscribe to real-time updates
  useRecordingsSocket()

  // FR-125: Initialize project dictionary from API data
  useMemo(() => {
    if (editPrepData?.projectDictionary) {
      setProjectDictionary(editPrepData.projectDictionary.join('\n'))
    }
  }, [editPrepData?.projectDictionary])

  // Filter recordings based on showParked toggle
  const filteredRecordings = useMemo(() => {
    if (!data?.recordings) return []
    return data.recordings.filter(r => {
      if (!showParked && r.isParked) return false
      return true
    })
  }, [data?.recordings, showParked])

  // Group recordings by chapter
  const chapters = useMemo(() => {
    return groupByChapter(filteredRecordings)
  }, [filteredRecordings])

  // Calculate totals for selected files
  const { selectedCount, selectedSize } = useMemo(() => {
    const recordings = data?.recordings || []
    let count = 0
    let size = 0
    for (const file of recordings) {
      if (selectedFiles.has(file.filename)) {
        count++
        size += file.size || 0
      }
    }
    return { selectedCount: count, selectedSize: size }
  }, [data?.recordings, selectedFiles])

  // FR-131: No auto-selection - user must manually select files

  // Select all files
  const selectAll = useCallback(() => {
    const recordings = data?.recordings || []
    const allFiles = recordings
      .filter(r => !showParked ? !r.isParked : true)
      .map(r => r.filename)
    setSelectedFiles(new Set(allFiles))
  }, [data?.recordings, showParked])

  // Clear all selections
  const clearSelection = useCallback(() => {
    setSelectedFiles(new Set())
  }, [])

  // Toggle individual file
  const toggleFile = useCallback((filename: string) => {
    setSelectedFiles(prev => {
      const next = new Set(prev)
      if (next.has(filename)) {
        next.delete(filename)
      } else {
        next.add(filename)
      }
      return next
    })
  }, [])

  // Select all files in a chapter
  const selectAllInChapter = useCallback((chapter: ChapterGroup) => {
    setSelectedFiles(prev => {
      const next = new Set(prev)
      for (const file of chapter.files) {
        next.add(file.filename)
      }
      return next
    })
  }, [])

  // Deselect all files in a chapter
  const deselectAllInChapter = useCallback((chapter: ChapterGroup) => {
    setSelectedFiles(prev => {
      const next = new Set(prev)
      for (const file of chapter.files) {
        next.delete(file.filename)
      }
      return next
    })
  }, [])

  // Copy file list to clipboard
  const handleCopyFileList = async () => {
    if (!config?.projectDirectory) {
      toast.error('No project directory configured')
      return
    }

    const recordings = data?.recordings || []
    const selectedRecordings = recordings.filter(r => selectedFiles.has(r.filename))

    if (selectedRecordings.length === 0) {
      toast.error('No files selected')
      return
    }

    // Build absolute paths
    const paths = selectedRecordings.map(r => r.path).join('\n')

    try {
      await navigator.clipboard.writeText(paths)
      toast.success(`Copied ${selectedRecordings.length} file paths to clipboard`)
    } catch (err) {
      toast.error('Failed to copy to clipboard')
    }
  }

  // Prepare for Gling - copy files to edit-1st folder
  const handlePrepareForGling = async () => {
    if (!config?.projectDirectory) {
      toast.error('No project directory configured')
      return
    }

    const recordings = data?.recordings || []
    const selectedRecordings = recordings.filter(r => selectedFiles.has(r.filename))

    if (selectedRecordings.length === 0) {
      toast.error('No files selected')
      return
    }

    setIsCopying(true)
    try {
      const response = await fetchApi<{ success: boolean; copied: string[]; error?: string }>(
        '/api/export/copy-to-gling',
        {
          method: 'POST',
          body: JSON.stringify({
            files: selectedRecordings.map(r => r.filename),
          }),
        }
      )

      if (response.success) {
        toast.success(`Copied ${response.copied.length} files to edit-1st folder`)
      } else {
        toast.error(response.error || 'Failed to copy files')
      }
    } catch (err) {
      toast.error('Failed to prepare files for Gling')
    } finally {
      setIsCopying(false)
    }
  }

  // FR-131: Bulk rename selected files
  const handleBulkRename = async () => {
    if (!bulkRenameLabel || bulkRenameLabel.trim().length === 0) {
      toast.error('Please enter a new label')
      return
    }

    const recordings = data?.recordings || []
    const selectedRecordings = recordings.filter(r => selectedFiles.has(r.filename))

    if (selectedRecordings.length === 0) {
      toast.error('No files selected')
      return
    }

    // Confirmation dialog
    const confirmed = window.confirm(
      `Rename ${selectedRecordings.length} file${selectedRecordings.length > 1 ? 's' : ''}?\n\n` +
      `New label: "${bulkRenameLabel.trim()}"\n\n` +
      `Transcripts will be regenerated (may take 5-10 minutes).`
    )

    if (!confirmed) return

    setIsRenaming(true)
    try {
      const response = await fetchApi<{
        success: boolean
        renamedCount: number
        transcriptionQueued: boolean
        files?: Array<{ old: string; new: string }>
        errors?: Array<{ file: string; error: string }>
        error?: string
      }>(
        '/api/manage/bulk-rename',
        {
          method: 'POST',
          body: JSON.stringify({
            files: selectedRecordings.map(r => r.filename),
            newLabel: bulkRenameLabel.trim(),
          }),
        }
      )

      if (response.success) {
        toast.success(
          `Renamed ${response.renamedCount} file${response.renamedCount > 1 ? 's' : ''}`,
          { duration: 5000 }
        )
        if (response.transcriptionQueued) {
          toast.info('Transcription queued (view progress in Transcriptions tab)', { duration: 5000 })
        }
        setBulkRenameLabel('') // Clear input
      } else {
        toast.error(response.error || 'Failed to rename files')
        if (response.errors && response.errors.length > 0) {
          console.error('Rename errors:', response.errors)
        }
      }
    } catch (err) {
      toast.error('Failed to rename files')
      console.error('Bulk rename error:', err)
    } finally {
      setIsRenaming(false)
    }
  }

  // FR-124: Copy Gling filename
  const handleCopyFilename = async () => {
    if (!editPrepData?.glingFilename) return
    try {
      await navigator.clipboard.writeText(editPrepData.glingFilename)
      toast.success('Filename copied')
    } catch {
      toast.error('Failed to copy')
    }
  }

  // FR-125: Copy global dictionary
  const handleCopyGlobal = async () => {
    if (!editPrepData?.globalDictionary?.length) return
    try {
      await navigator.clipboard.writeText(editPrepData.globalDictionary.join('\n'))
      toast.success(`Copied ${editPrepData.globalDictionary.length} global words`)
    } catch {
      toast.error('Failed to copy')
    }
  }

  // FR-125: Copy project dictionary
  const handleCopyProject = async () => {
    if (!editPrepData?.projectDictionary?.length) return
    try {
      await navigator.clipboard.writeText(editPrepData.projectDictionary.join('\n'))
      toast.success(`Copied ${editPrepData.projectDictionary.length} project words`)
    } catch {
      toast.error('Failed to copy')
    }
  }

  // FR-125: Copy combined dictionary
  const handleCopyCombined = async () => {
    if (!editPrepData?.glingDictionary?.length) return
    try {
      await navigator.clipboard.writeText(editPrepData.glingDictionary.join('\n'))
      toast.success(`Copied ${editPrepData.glingDictionary.length} words (combined)`)
    } catch {
      toast.error('Failed to copy')
    }
  }

  // FR-125: Save project dictionary
  const handleSaveProjectDictionary = async () => {
    if (!config?.activeProject) return
    try {
      const words = projectDictionary
        .split('\n')
        .map(w => w.trim())
        .filter(w => w.length > 0)

      await updateProjectDictionary.mutateAsync({
        projectCode: config.activeProject,
        words,
      })

      toast.success('Project dictionary saved')
      setEditingDictionary(false)
    } catch {
      toast.error('Failed to save project dictionary')
    }
  }

  // FR-124: Open folder in Finder
  const handleOpenFolder = async (folder: string) => {
    try {
      const response = await fetchApi<{ success: boolean; error?: string }>(
        '/api/system/open-folder',
        {
          method: 'POST',
          body: JSON.stringify({ folder }),
        }
      )
      if (!response.success) {
        toast.error(response.error || 'Failed to open folder')
      }
    } catch (err) {
      toast.error('Failed to open folder')
    }
  }

  // FR-124: Create all edit folders
  const handleCreateFolders = () => {
    createFolders.mutate()
  }

  // FR-124: Create a single edit folder
  const handleCreateFolder = (folderName: string) => {
    createFolder.mutate(folderName)
  }

  // FR-126: Manifest status component for a single folder
  const FolderManifestStatus = ({ folder }: { folder: EditFolderKey }) => {
    const { data: manifestData } = useManifestStatus(folder)
    const cleanFolder = useCleanEditFolder()
    const restoreFolder = useRestoreEditFolder()

    if (!manifestData?.success || manifestData.detail.status === 'no-manifest') {
      return null
    }

    const { detail } = manifestData
    const statusEmoji = {
      'present': '🟢',
      'cleaned': '🔴',
      'changed': '⚠️',
      'missing': '❌',
      'no-manifest': '',
    }[detail.status]

    const statusText = {
      'present': `Present (${formatFileSize(detail.totalSize)})`,
      'cleaned': 'Cleaned',
      'changed': `Changed (${detail.changedFiles} files)`,
      'missing': `Missing (${detail.missingFiles} files)`,
      'no-manifest': '',
    }[detail.status]

    const handleClean = async () => {
      const confirmed = window.confirm(
        `Delete ${detail.manifestedFiles} source files from ${folder}?\n\n` +
        `This will free up ${formatFileSize(detail.totalSize)}.\n\n` +
        `Gling outputs will be preserved.\n` +
        `You can restore these files later from recordings/.`
      )

      if (!confirmed) return

      try {
        const result = await cleanFolder.mutateAsync(folder)
        if (result.success) {
          toast.success(
            `Cleaned ${result.deletedCount} files (${formatFileSize(result.spaceSaved)} freed)`
          )
        } else {
          toast.error(result.error || 'Failed to clean folder')
        }
      } catch {
        toast.error('Failed to clean folder')
      }
    }

    const handleRestore = async () => {
      try {
        const result = await restoreFolder.mutateAsync(folder)
        if (result.success) {
          if (result.warnings && result.warnings.length > 0) {
            toast.warning(
              `Restored ${result.restoredCount} files with ${result.warnings.length} warnings`,
              { duration: 5000 }
            )
          } else {
            toast.success(`Restored ${result.restoredCount} files`)
          }
        } else {
          toast.error(result.error || 'Failed to restore files')
        }
      } catch {
        toast.error('Failed to restore files')
      }
    }

    return (
      <div className="mt-2 pl-6 text-xs space-y-1">
        <div className="flex items-center gap-2 text-gray-600">
          <span>📋 Manifest:</span>
          <span className="font-medium">{detail.manifestedFiles} files tracked</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-600">Source files:</span>
          <span className="font-medium">
            {statusEmoji} {statusText}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-2">
          {detail.status === 'present' && (
            <button
              onClick={handleClean}
              disabled={cleanFolder.isPending}
              className="px-3 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50 transition-colors"
            >
              {cleanFolder.isPending ? 'Cleaning...' : 'Clean Edit Folder'}
            </button>
          )}
          {(detail.status === 'cleaned' || detail.status === 'changed') && (
            <button
              onClick={handleRestore}
              disabled={restoreFolder.isPending || detail.status === 'missing'}
              className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {restoreFolder.isPending ? 'Restoring...' : 'Restore for Gling'}
            </button>
          )}
        </div>
      </div>
    )
  }

  if (isLoading) {
    return <LoadingSpinner message="Loading recordings..." />
  }

  if (error) {
    return <ErrorMessage message="Error loading recordings" />
  }

  if (!data?.recordings || data.recordings.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
        <p className="text-gray-500">No recordings found</p>
        <p className="text-sm text-gray-400 mt-1">
          Recordings will appear here after you rename incoming files
        </p>
      </div>
    )
  }

  // Count files by parked status
  const totalFiles = data.recordings.length
  const parkedFiles = data.recordings.filter(r => r.isParked).length
  const activeFiles = totalFiles - parkedFiles

  return (
    <div>
      {/* Stats and filter toggle - matching RecordingsView style */}
      <div className="flex items-center gap-3 mb-3 text-xs text-gray-500">
        <span className="text-gray-700 font-medium">
          {selectedCount} of {filteredRecordings.length} selected
          <span className="font-normal text-gray-400 ml-1">
            ({formatFileSize(selectedSize)})
          </span>
          <span className="font-normal text-gray-400 ml-1">
            | {activeFiles} active, {parkedFiles} parked
          </span>
        </span>
        <span className="text-gray-300">|</span>
        <label className="flex items-center gap-1.5 cursor-pointer hover:text-gray-700">
          <input
            type="checkbox"
            checked={showParked}
            onChange={(e) => setShowParked(e.target.checked)}
            className="w-3 h-3 rounded border-gray-300 text-pink-500 focus:ring-pink-500"
          />
          Show Parked
        </label>
        <span className="text-gray-300">|</span>
        {selectedCount === 0 ? (
          <button
            onClick={selectAll}
            className="text-xs text-blue-600 hover:text-blue-700 px-2 py-0.5 hover:bg-blue-50 rounded transition-colors"
          >
            Select All
          </button>
        ) : (
          <button
            onClick={clearSelection}
            className="text-xs text-gray-600 hover:text-gray-700 px-2 py-0.5 hover:bg-gray-50 rounded transition-colors"
          >
            Clear Selection
          </button>
        )}
      </div>

      {/* FR-131: Bulk Rename Section */}
      {selectedCount > 0 && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 flex-1">
              <label htmlFor="bulk-rename-label" className="text-sm font-medium text-gray-700 whitespace-nowrap">
                Rename {selectedCount} file{selectedCount > 1 ? 's' : ''} to:
              </label>
              <input
                id="bulk-rename-label"
                type="text"
                value={bulkRenameLabel}
                onChange={(e) => setBulkRenameLabel(e.target.value)}
                placeholder="new-label"
                disabled={isRenaming}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isRenaming) {
                    handleBulkRename()
                  }
                }}
              />
            </div>
            <button
              onClick={handleBulkRename}
              disabled={isRenaming || !bulkRenameLabel.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              {isRenaming ? 'Renaming...' : 'Apply Rename'}
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-600">
            ⚠️ Transcripts will be regenerated (5-10 minutes). Chapter/sequence numbers will be preserved.
          </p>
        </div>
      )}

      {/* Recordings list - matching RecordingsView style */}
      <div className="space-y-6">
        {chapters.map((chapterData) => {
          const selectedInChapter = chapterData.files.filter(f => selectedFiles.has(f.filename)).length
          const allSelected = selectedInChapter === chapterData.files.length
          const someSelected = selectedInChapter > 0 && !allSelected

          return (
            <div key={chapterData.chapterKey}>
              {/* Chapter separator - matching RecordingsView */}
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px bg-gray-300 flex-1" />
                <span className="text-sm font-semibold px-2 text-gray-700">
                  {chapterData.chapterKey} {formatChapterTitle(chapterData.title)}
                  <span className="font-normal text-xs ml-2">
                    ({chapterData.files.length} file{chapterData.files.length !== 1 ? 's' : ''} · {formatFileSize(chapterData.totalSize)})
                  </span>
                </span>
                {/* Chapter-level select/deselect */}
                {someSelected ? (
                  <button
                    onClick={() => deselectAllInChapter(chapterData)}
                    className="text-xs text-gray-500 hover:text-blue-600 px-2 py-0.5 hover:bg-blue-50 rounded transition-colors"
                  >
                    ☐ Deselect All
                  </button>
                ) : allSelected ? (
                  <button
                    onClick={() => deselectAllInChapter(chapterData)}
                    className="text-xs text-blue-600 hover:text-gray-500 px-2 py-0.5 hover:bg-gray-50 rounded transition-colors"
                  >
                    ☑ Deselect All
                  </button>
                ) : (
                  <button
                    onClick={() => selectAllInChapter(chapterData)}
                    className="text-xs text-gray-500 hover:text-blue-600 px-2 py-0.5 hover:bg-blue-50 rounded transition-colors"
                  >
                    ☐ Select All
                  </button>
                )}
                <div className="h-px bg-gray-300 flex-1" />
              </div>

              {/* Files in this chapter - matching RecordingsView */}
              <div className="space-y-1">
                {chapterData.files.map((file) => {
                  const isSelected = selectedFiles.has(file.filename)
                  const isParked = file.isParked

                  // Determine row styling - matching RecordingsView
                  let rowClasses: string
                  let textClasses: string

                  if (isParked) {
                    rowClasses = 'bg-pink-50 border-pink-200 text-gray-500'
                    textClasses = 'text-gray-500'
                  } else if (isSelected) {
                    rowClasses = 'bg-blue-50 border-blue-200'
                    textClasses = 'text-gray-700'
                  } else {
                    rowClasses = 'bg-gray-50 border-gray-200'
                    textClasses = 'text-gray-500'
                  }

                  return (
                    <label
                      key={file.filename}
                      className={`flex items-center justify-between px-4 py-2 rounded-lg border cursor-pointer hover:border-blue-300 transition-colors ${rowClasses}`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleFile(file.filename)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                        />
                        <span className={`font-mono text-sm ${textClasses}`}>
                          {file.filename}
                        </span>
                        {isParked && (
                          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-pink-200 text-pink-800 rounded">
                            PARKED
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-gray-400 ml-4">
                        {formatFileSize(file.size || 0)}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* FR-124: Gling Prep Info (collapsible) */}
      {editPrepData?.success && (
        <div className="mt-6 bg-white rounded-lg border border-gray-200">
          <button
            onClick={() => setShowGlingInfo(!showGlingInfo)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="h-px bg-gray-300 w-8" />
              <span className="text-sm font-semibold text-gray-700">Gling Prep Info</span>
              <div className="h-px bg-gray-300 flex-1" />
            </div>
            <span className="text-gray-400">{showGlingInfo ? '▼' : '▶'}</span>
          </button>

          {showGlingInfo && (
            <div className="px-4 pb-4 space-y-3">
              {/* Filename */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Gling Filename</label>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 bg-gray-50 border border-gray-200 rounded px-3 py-2 font-mono text-sm text-gray-800">
                    {editPrepData.glingFilename}
                  </div>
                  <button
                    onClick={handleCopyFilename}
                    className="px-3 py-2 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>

              {/* FR-125: Dictionary - split into Global / Project / Combined */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">
                  Dictionary
                </label>

                {/* Global Dictionary */}
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Global:</span>
                    <span className="text-sm font-medium text-gray-800">
                      {editPrepData.globalDictionary?.length || 0} words
                    </span>
                  </div>
                  <button
                    onClick={handleCopyGlobal}
                    disabled={!editPrepData.globalDictionary?.length}
                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    Copy
                  </button>
                </div>

                {/* Project Dictionary */}
                <div className="flex items-center justify-between py-2 border-t border-gray-200">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Project:</span>
                    <span className="text-sm font-medium text-gray-800">
                      {editPrepData.projectDictionary?.length || 0} words
                    </span>
                    {config?.activeProject && (
                      <span className="text-xs text-blue-600 font-mono">({config.activeProject})</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingDictionary(!editingDictionary)}
                      className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                    >
                      {editingDictionary ? 'Cancel' : 'Edit'}
                    </button>
                    <button
                      onClick={handleCopyProject}
                      disabled={!editPrepData.projectDictionary?.length}
                      className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                {/* Project Dictionary Editor (when editing) */}
                {editingDictionary && (
                  <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded">
                    <textarea
                      value={projectDictionary}
                      onChange={(e) => setProjectDictionary(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                      placeholder="One word per line..."
                    />
                    <div className="flex items-center justify-end gap-2 mt-2">
                      <button
                        onClick={() => {
                          setProjectDictionary(editPrepData.projectDictionary?.join('\n') || '')
                          setEditingDictionary(false)
                        }}
                        className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveProjectDictionary}
                        disabled={updateProjectDictionary.isPending}
                        className="px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
                      >
                        {updateProjectDictionary.isPending ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Separator */}
                <div className="border-t border-gray-300 my-2" />

                {/* Combined Dictionary */}
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700 font-medium">Combined:</span>
                    <span className="text-sm font-medium text-gray-800">
                      {editPrepData.glingDictionary?.length || 0} words
                    </span>
                  </div>
                  <button
                    onClick={handleCopyCombined}
                    disabled={!editPrepData.glingDictionary?.length}
                    className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    Copy All
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* FR-124: Edit Folders Section */}
      {editPrepData?.success && (
        <div className="mt-6 bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-px bg-gray-300 w-8" />
            <span className="text-sm font-semibold text-gray-700">Edit Folders</span>
            <div className="h-px bg-gray-300 flex-1" />
          </div>

          <div className="space-y-3">
            {editPrepData.editFolders.folders.map(folder => {
              const exists = folder.exists
              return (
                <div key={folder.name}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <span className={exists ? 'text-green-500' : 'text-gray-300'}>
                        {exists ? '✓' : '○'}
                      </span>
                      <span className={exists ? 'text-gray-700 font-mono' : 'text-gray-400 font-mono'}>
                        {folder.name}/
                      </span>
                      <span className="text-xs text-gray-400">
                        {folder.name === 'edit-1st' && '← Gling exports'}
                        {folder.name === 'edit-2nd' && '← Jan\'s edits'}
                        {folder.name === 'edit-final' && '← Final publish'}
                      </span>
                    </div>
                    {exists ? (
                      <button
                        onClick={() => handleOpenFolder(folder.name)}
                        className="px-3 py-1 text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      >
                        Open
                      </button>
                    ) : (
                      <button
                        onClick={() => handleCreateFolder(folder.name)}
                        disabled={createFolder.isPending}
                        className="px-3 py-1 text-xs text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
                      >
                        Create
                      </button>
                    )}
                  </div>
                  {/* FR-126: Manifest status for this folder */}
                  {exists && <FolderManifestStatus folder={folder.name as EditFolderKey} />}
                </div>
              )
            })}
          </div>

          {!editPrepData.editFolders.allExist && (
            <button
              onClick={handleCreateFolders}
              disabled={createFolders.isPending}
              className="mt-3 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {createFolders.isPending ? 'Creating...' : 'Create All Folders'}
            </button>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-6 flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200">
        <button
          onClick={handleCopyFileList}
          disabled={selectedCount === 0}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2 text-sm font-medium"
        >
          <span>📋</span>
          <span>Copy File List</span>
        </button>

        <button
          onClick={handlePrepareForGling}
          disabled={selectedCount === 0 || isCopying}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2 text-sm font-medium"
        >
          {isCopying ? (
            <>
              <span className="animate-spin">⏳</span>
              <span>Copying...</span>
            </>
          ) : (
            <>
              <span>📁</span>
              <span>Prepare for Gling</span>
            </>
          )}
        </button>

        {/* FR-124: Smart Open/Create button for edit-1st */}
        {editPrepData?.editFolders.folders.find(f => f.name === 'edit-1st')?.exists ? (
          <button
            onClick={() => handleOpenFolder('edit-1st')}
            className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <span>📂</span>
            <span>Open Folder</span>
          </button>
        ) : (
          <button
            onClick={handleCreateFolders}
            disabled={createFolders.isPending}
            className="px-4 py-2 text-sm text-green-700 bg-green-50 border border-green-300 rounded-lg hover:bg-green-100 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <span>📂</span>
            <span>{createFolders.isPending ? 'Creating...' : 'Create Folder'}</span>
          </button>
        )}

        <div className="flex-1" />

        <span className="text-xs text-gray-500">
          First Edit Prep: <span className="font-mono">{config?.projectDirectory}/edit-1st/</span>
        </span>
      </div>
    </div>
  )
}
