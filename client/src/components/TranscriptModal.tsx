// FR-30: Modal for viewing transcript content
// FR-64: Refactored to use shared FileViewerModal
// FR-94: Added format toggle (TXT/SRT) when both available
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileViewerModal } from './shared'
import { QUERY_KEYS } from '../constants/queryKeys'
import { API_URL } from '../config'

// Extended response type for FR-94
interface TranscriptContentResponseExtended {
  filename: string
  content: string
  formats?: {
    txt: boolean
    srt: boolean
  }
  activeFormat?: 'txt' | 'srt'
}

interface TranscriptModalProps {
  filename: string
  onClose: () => void
}

export function TranscriptModal({ filename, onClose }: TranscriptModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<'txt' | 'srt' | null>(null)

  const { data, isLoading, error } = useQuery<TranscriptContentResponseExtended>({
    queryKey: [...QUERY_KEYS.transcript(filename), selectedFormat],
    queryFn: async () => {
      const formatParam = selectedFormat ? `?format=${selectedFormat}` : ''
      const res = await fetch(`${API_URL}/api/transcriptions/transcript/${encodeURIComponent(filename)}${formatParam}`)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to load transcript')
      }
      return res.json()
    },
  })

  // FR-94: Format toggle buttons
  const formatToggle = data?.formats && (data.formats.txt && data.formats.srt) ? (
    <div className="flex gap-1 bg-gray-100 rounded p-0.5">
      <button
        onClick={() => setSelectedFormat('txt')}
        className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
          data.activeFormat === 'txt'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        TXT
      </button>
      <button
        onClick={() => setSelectedFormat('srt')}
        className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
          data.activeFormat === 'srt'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        SRT
      </button>
    </div>
  ) : null

  return (
    <FileViewerModal
      title={data?.filename || filename}
      content={data?.content || null}
      isLoading={isLoading}
      error={error}
      onClose={onClose}
      folderKey="transcripts"
      headerExtra={formatToggle}
    />
  )
}
