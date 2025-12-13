// FR-30: Modal for viewing transcript content
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { OpenFolderButton } from './shared'
import { QUERY_KEYS } from '../constants/queryKeys'
import { API_URL } from '../config'
import type { TranscriptContentResponse } from '../../../shared/types'

interface TranscriptModalProps {
  filename: string
  onClose: () => void
}

export function TranscriptModal({ filename, onClose }: TranscriptModalProps) {
  const { data, isLoading, error } = useQuery<TranscriptContentResponse>({
    queryKey: QUERY_KEYS.transcript(filename),
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/transcriptions/transcript/${encodeURIComponent(filename)}`)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to load transcript')
      }
      return res.json()
    },
  })

  const copyToClipboard = async () => {
    if (data?.content) {
      await navigator.clipboard.writeText(data.content)
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
          <h3 className="font-medium truncate flex-1 mr-4">{data?.filename || filename}</h3>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={copyToClipboard}
              disabled={!data?.content}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
              title="Copy to clipboard"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
            </button>
            <OpenFolderButton folder="transcripts" />
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
            <div className="text-gray-500 text-center py-8">Loading transcript...</div>
          ) : error ? (
            <div className="text-red-500 text-center py-8">
              {error instanceof Error ? error.message : 'Failed to load transcript'}
            </div>
          ) : (
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{data?.content}</pre>
          )}
        </div>
      </div>
    </div>
  )
}
