/**
 * FR-59: Inbox Tab
 *
 * Displays inbox subfolders (raw, dataset, presentation) with file counts.
 * Uses chapter-row separator pattern from RecordingsView.
 */

import { useConfig, useInbox, type InboxSubfolder, type InboxFile } from '../hooks/useApi'
import { useInboxSocket } from '../hooks/useSocket'
import { OpenFolderButton, LoadingSpinner, ErrorMessage } from './shared'
import { formatFileSize } from '../utils/formatting'

// Calculate total size of files in a subfolder
function calculateTotalSize(files: InboxFile[]): number {
  return files.reduce((sum, file) => sum + file.size, 0)
}

// Format relative time (e.g., "Dec 14", "Dec 13")
function formatDate(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function InboxPage() {
  const { data: config } = useConfig()
  const projectCode = config?.projectDirectory?.split('/').pop() || null

  // FR-59: Subscribe to inbox changes for live updates
  useInboxSocket(projectCode)

  const { data: inboxData, isLoading, error } = useInbox(projectCode)

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
          <SubfolderGroup key={subfolder.name} subfolder={subfolder} />
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
    </div>
  )
}

// Individual subfolder group with separator and file list
function SubfolderGroup({ subfolder }: { subfolder: InboxSubfolder }) {
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
          {subfolder.files.map((file) => (
            <div
              key={file.filename}
              className="flex items-center justify-between px-4 py-2 rounded-lg border bg-gray-50 border-gray-200"
            >
              <span className="font-mono text-sm text-gray-700 truncate max-w-md">
                {file.filename}
              </span>
              <div className="flex items-center gap-6 text-sm text-gray-400">
                <span>{formatFileSize(file.size)}</span>
                <span className="w-16 text-right">{formatDate(file.modifiedAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
