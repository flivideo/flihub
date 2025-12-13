// FR-55: Modal for viewing combined video transcript organized by chapters
import { useState, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { QUERY_KEYS } from '../constants/queryKeys'
import { API_URL } from '../config'
import { formatChapterTitle } from '../utils/formatting'

interface VideoTranscriptModalProps {
  onClose: () => void
}

interface CombinedTranscriptResponse {
  chapters: {
    chapter: string
    title: string
    content: string
  }[]
}

export function VideoTranscriptModal({ onClose }: VideoTranscriptModalProps) {
  // Toggle for chapter headings (default: show headings)
  const [showChapterHeadings, setShowChapterHeadings] = useState(true)

  // Fetch combined transcript from API
  const { data, isLoading, error } = useQuery<CombinedTranscriptResponse>({
    queryKey: QUERY_KEYS.combinedTranscript,
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/transcriptions/combined`)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to load transcript')
      }
      return res.json()
    },
  })

  // Build display text for copy - respects showChapterHeadings toggle
  const buildDisplayText = useCallback(() => {
    if (!data?.chapters) return ''

    if (showChapterHeadings) {
      // With chapter headings
      return data.chapters.map(ch => {
        const title = formatChapterTitle(ch.title)
        const header = `Chapter ${parseInt(ch.chapter, 10)}: ${title}`
        const separator = '─'.repeat(Math.min(header.length, 40))
        return `${header}\n${separator}\n${ch.content}`
      }).join('\n\n')
    } else {
      // Raw transcript only (no headings)
      return data.chapters.map(ch => ch.content).join('\n\n')
    }
  }, [data, showChapterHeadings])

  const copyToClipboard = async () => {
    const text = buildDisplayText()
    if (text) {
      try {
        await navigator.clipboard.writeText(text)
        toast.success('Copied to clipboard')
      } catch {
        toast.error('Failed to copy')
      }
    }
  }

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg w-full max-w-3xl max-h-[85vh] flex flex-col mx-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
          <div className="flex items-center gap-4">
            <h3 className="font-medium text-lg">Video Transcript</h3>
            {/* Toggle for chapter headings */}
            <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={showChapterHeadings}
                onChange={(e) => setShowChapterHeadings(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
              />
              Chapter headings
            </label>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copyToClipboard}
              disabled={!data?.chapters?.length}
              className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors flex items-center gap-1.5 disabled:opacity-50"
              title="Copy to clipboard"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              Copy
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
              title="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="text-gray-500 text-center py-12">Loading transcript...</div>
          ) : error ? (
            <div className="text-red-500 text-center py-12">
              {error instanceof Error ? error.message : 'Failed to load transcript'}
            </div>
          ) : !data?.chapters?.length ? (
            <div className="text-gray-500 text-center py-12">
              No transcripts available. Transcribe recordings first.
            </div>
          ) : showChapterHeadings ? (
            // With chapter headings
            <div className="space-y-8">
              {data.chapters.map((ch) => {
                const title = formatChapterTitle(ch.title)
                return (
                  <div key={ch.chapter}>
                    <h4 className="font-semibold text-gray-800 mb-1">
                      Chapter {parseInt(ch.chapter, 10)}: {title}
                    </h4>
                    <div className="h-px bg-gray-200 mb-3" />
                    <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {ch.content}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            // Raw transcript (no headings)
            <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {data.chapters.map(ch => ch.content).join('\n\n')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
