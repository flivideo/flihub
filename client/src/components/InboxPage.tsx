/**
 * FR-59: Inbox Tab
 * FR-64: Inbox File Viewer
 *
 * Displays inbox subfolders (raw, dataset, presentation) with file counts.
 * Uses chapter-row separator pattern from RecordingsView.
 * Clicking on .md, .json, .html files opens a viewer modal.
 */

import { useState } from 'react'
import { useConfig, useInbox, useInboxFileContent, useOpenInboxFile, type InboxSubfolder, type InboxFile } from '../hooks/useApi'
import { useInboxSocket } from '../hooks/useSocket'
import { OpenFolderButton, LoadingSpinner, ErrorMessage, FileViewerModal } from './shared'
import { formatFileSize } from '../utils/formatting'
import { toast } from 'sonner'

// File extensions that can be viewed in the modal
const VIEWABLE_EXTENSIONS = ['.md', '.json', '.html', '.txt', '.css', '.js', '.ts', '.yaml', '.yml', '.xml']

// Check if a file is viewable
function isViewableFile(filename: string): boolean {
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'))
  return VIEWABLE_EXTENSIONS.includes(ext)
}

// Check if a file is HTML (for external open button)
function isHtmlFile(filename: string): boolean {
  return filename.toLowerCase().endsWith('.html')
}

// Calculate total size of files in a subfolder
function calculateTotalSize(files: InboxFile[]): number {
  return files.reduce((sum, file) => sum + file.size, 0)
}

// Format relative time (e.g., "Dec 14", "Dec 13")
function formatDate(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Selected file state type
interface SelectedFile {
  subfolder: string
  filename: string
}

export function InboxPage() {
  const { data: config } = useConfig()
  const projectCode = config?.projectDirectory?.split('/').pop() || null

  // FR-64: Track selected file for viewing
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null)

  // FR-59: Subscribe to inbox changes for live updates
  useInboxSocket(projectCode)

  const { data: inboxData, isLoading, error } = useInbox(projectCode)

  // FR-64: Fetch file content when a file is selected
  const {
    data: fileContent,
    isLoading: isFileLoading,
    error: fileError,
  } = useInboxFileContent(projectCode, selectedFile?.subfolder || null, selectedFile?.filename || null)

  // FR-64: Open file in browser mutation
  const openInboxFile = useOpenInboxFile()

  // FR-64: Handle open in browser for HTML files (from modal or row button)
  const handleOpenExternal = (subfolder?: string, filename?: string) => {
    const sub = subfolder || selectedFile?.subfolder
    const file = filename || selectedFile?.filename
    if (!sub || !file) return

    openInboxFile.mutate(
      { subfolder: sub, filename: file },
      {
        onSuccess: () => {
          toast.success('Opened in browser')
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : 'Failed to open file')
        },
      }
    )
  }

  // FR-64: Handle file click
  const handleFileClick = (subfolder: string, file: InboxFile) => {
    if (isViewableFile(file.filename)) {
      setSelectedFile({ subfolder, filename: file.filename })
    }
  }

  // FR-64: Close modal
  const handleCloseModal = () => {
    setSelectedFile(null)
  }

  if (!projectCode) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
        <p className="text-gray-500">No project selected</p>
        <p className="text-sm text-gray-400 mt-1">
          Select a project to view its inbox
        </p>
      </div>
    )
  }

  if (isLoading) {
    return <LoadingSpinner message="Loading inbox..." />
  }

  if (error) {
    return <ErrorMessage message="Failed to load inbox" />
  }

  const subfolders = inboxData?.inbox?.subfolders || []
  const totalFiles = inboxData?.inbox?.totalFiles || 0

  if (subfolders.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
        <p className="text-gray-500">No inbox folders found</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header with total count and open folder button */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-medium text-gray-700">Inbox</h2>
          <span className="text-sm text-gray-500">
            ({totalFiles} {totalFiles === 1 ? 'file' : 'files'})
          </span>
        </div>
        <OpenFolderButton folder="inbox" label="Open" />
      </div>

      {/* Subfolder groups with separator pattern */}
      <div className="space-y-6">
        {subfolders.map((subfolder) => (
          <SubfolderGroup
            key={subfolder.name}
            subfolder={subfolder}
            onFileClick={handleFileClick}
            onOpenExternal={handleOpenExternal}
          />
        ))}
      </div>

      {/* Empty state message */}
      {totalFiles === 0 && (
        <div className="text-center py-8 text-gray-500 text-sm">
          <p>No files in inbox yet.</p>
          <p className="mt-1 text-gray-400">
            Files placed in inbox/ subfolders will appear here.
          </p>
        </div>
      )}

      {/* FR-64: File viewer modal */}
      {selectedFile && (
        <FileViewerModal
          title={selectedFile.filename}
          content={fileContent?.content || null}
          isLoading={isFileLoading}
          error={fileError}
          onClose={handleCloseModal}
          onOpenExternal={isHtmlFile(selectedFile.filename) ? () => handleOpenExternal() : undefined}
          folderKey="inbox"
        />
      )}
    </div>
  )
}

// Individual subfolder group with separator and file list
function SubfolderGroup({
  subfolder,
  onFileClick,
  onOpenExternal,
}: {
  subfolder: InboxSubfolder
  onFileClick: (subfolder: string, file: InboxFile) => void
  onOpenExternal: (subfolder: string, filename: string) => void
}) {
  const isEmpty = subfolder.fileCount === 0
  const totalSize = calculateTotalSize(subfolder.files)

  return (
    <div>
      {/* Separator row - matches RecordingsView chapter separator */}
      <div className="flex items-center gap-3 mb-3">
        <div className="h-px bg-gray-300 flex-1" />
        <span className={`text-sm font-semibold px-2 ${isEmpty ? 'text-gray-400' : 'text-gray-700'}`}>
          {subfolder.name}
          {/* File count and total size */}
          <span className="font-normal text-xs ml-2">
            {isEmpty ? (
              '(empty)'
            ) : (
              <>({subfolder.fileCount} {subfolder.fileCount === 1 ? 'file' : 'files'} · {formatFileSize(totalSize)})</>
            )}
          </span>
        </span>
        <div className="h-px bg-gray-300 flex-1" />
      </div>

      {/* File list - indented under the separator */}
      {!isEmpty && (
        <div className="space-y-1 ml-4">
          {subfolder.files.map((file) => {
            const viewable = isViewableFile(file.filename)
            const isHtml = isHtmlFile(file.filename)
            return (
              <div
                key={file.filename}
                className={`flex items-center justify-between px-4 py-2 rounded-lg border bg-gray-50 border-gray-200 ${
                  viewable ? 'cursor-pointer hover:bg-gray-100 hover:border-gray-300' : ''
                }`}
                onClick={() => onFileClick(subfolder.name, file)}
              >
                <span className={`font-mono text-sm truncate max-w-md ${viewable ? 'text-blue-600' : 'text-gray-700'}`}>
                  {file.filename}
                </span>
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <span>{formatFileSize(file.size)}</span>
                  <span className="w-16 text-right">{formatDate(file.modifiedAt)}</span>
                  {/* Open in browser button for HTML files */}
                  {isHtml && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onOpenExternal(subfolder.name, file.filename)
                      }}
                      className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
                      title="Open in browser"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
