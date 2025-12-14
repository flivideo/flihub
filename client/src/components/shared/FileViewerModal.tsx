/**
 * FR-64: Generic file viewer modal
 *
 * Displays file content in a modal with:
 * - Copy to clipboard button
 * - Open folder button (optional)
 * - Open externally button (optional, for HTML files)
 * - Close button + Escape key support
 *
 * Used by TranscriptModal and InboxPage for viewing text-based files.
 */
import { toast } from 'sonner'
import { OpenFolderButton } from './OpenFolderButton'
import type { FolderKey } from '../../hooks/useOpenFolder'

interface FileViewerModalProps {
  title: string
  content: string | null
  isLoading: boolean
  error: Error | null
  onClose: () => void
  onCopy?: () => void
  onOpenExternal?: () => void
  folderKey?: FolderKey
}

export function FileViewerModal({
  title,
  content,
  isLoading,
  error,
  onClose,
  onCopy,
  onOpenExternal,
  folderKey,
}: FileViewerModalProps) {
  const handleCopy = async () => {
    if (onCopy) {
      onCopy()
    } else if (content) {
      await navigator.clipboard.writeText(content)
      toast.success('Copied to clipboard')
    }
  }

  // Close on Escape key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div
        className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col mx-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-medium truncate flex-1 mr-4">{title}</h3>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Copy button */}
            <button
              onClick={handleCopy}
              disabled={!content}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
              title="Copy to clipboard"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
            </button>

            {/* Open externally button (for HTML files) */}
            {onOpenExternal && (
              <button
                onClick={onOpenExternal}
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                title="Open in browser"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </button>
            )}

            {/* Open folder button */}
            {folderKey && <OpenFolderButton folder={folderKey} />}

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
              title="Close"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="text-gray-500 text-center py-8">Loading...</div>
          ) : error ? (
            <div className="text-red-500 text-center py-8">
              {error instanceof Error ? error.message : 'Failed to load file'}
            </div>
          ) : (
            <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed">{content}</pre>
          )}
        </div>
      </div>
    </div>
  )
}
