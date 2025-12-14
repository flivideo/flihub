// FR-30: Modal for viewing transcript content
// FR-64: Refactored to use shared FileViewerModal
import { useQuery } from '@tanstack/react-query'
import { FileViewerModal } from './shared'
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

  return (
    <FileViewerModal
      title={data?.filename || filename}
      content={data?.content || null}
      isLoading={isLoading}
      error={error}
      onClose={onClose}
      folderKey="transcripts"
    />
  )
}
