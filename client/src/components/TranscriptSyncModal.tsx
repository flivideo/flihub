import { useState } from 'react'
import { toast } from 'sonner'
import { useTranscriptSync, useQueueTranscription, useDeleteTranscript } from '../hooks/useApi'
import { useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '../constants/queryKeys'

interface Props {
  projectCode: string
  projectPath: string
  onClose: () => void
}

export function TranscriptSyncModal({ projectCode, projectPath, onClose }: Props) {
  const queryClient = useQueryClient()
  const { data, isLoading, refetch } = useTranscriptSync(projectCode)
  const queueTranscription = useQueueTranscription()
  const deleteTranscript = useDeleteTranscript()

  const [processingFiles, setProcessingFiles] = useState<Set<string>>(new Set())

  // Queue a single recording for transcription
  const handleTranscribe = async (filename: string) => {
    // Build the full path to the recording
    // Try recordings/ first, then recordings/-safe/
    const videoPath = `${projectPath}/recordings/${filename}.mov`

    setProcessingFiles(prev => new Set(prev).add(filename))
    try {
      await queueTranscription.mutateAsync(videoPath)
      toast.success(`Queued: ${filename}`)
      refetch()
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects })
    } catch (error) {
      // Try the safe folder
      try {
        const safePath = `${projectPath}/recordings/-safe/${filename}.mov`
        await queueTranscription.mutateAsync(safePath)
        toast.success(`Queued: ${filename}`)
        refetch()
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects })
      } catch {
        toast.error(`Failed to queue: ${filename}`)
      }
    } finally {
      setProcessingFiles(prev => {
        const next = new Set(prev)
        next.delete(filename)
        return next
      })
    }
  }

  // Delete an orphaned transcript
  const handleDelete = async (filename: string) => {
    setProcessingFiles(prev => new Set(prev).add(filename))
    try {
      await deleteTranscript.mutateAsync({ filename, projectCode })
      toast.success(`Deleted: ${filename}.txt`)
      refetch()
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects })
    } catch {
      toast.error(`Failed to delete: ${filename}`)
    } finally {
      setProcessingFiles(prev => {
        const next = new Set(prev)
        next.delete(filename)
        return next
      })
    }
  }

  // Queue all missing transcriptions
  const handleTranscribeAll = async () => {
    if (!data?.missingTranscripts.length) return

    for (const filename of data.missingTranscripts) {
      await handleTranscribe(filename)
    }
  }

  // Delete all orphaned transcripts
  const handleDeleteAllOrphaned = async () => {
    if (!data?.orphanedTranscripts.length) return

    const confirmed = window.confirm(
      `Delete ${data.orphanedTranscripts.length} orphaned transcript(s)? This cannot be undone.`
    )
    if (!confirmed) return

    for (const filename of data.orphanedTranscripts) {
      await handleDelete(filename)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-[600px] max-w-[90vw] max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <div>
            <h3 className="font-semibold text-gray-800">Transcript Sync</h3>
            <span className="text-sm text-gray-500 font-mono">{projectCode}</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none px-2"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="text-center text-gray-400 py-8">Loading...</div>
          ) : !data ? (
            <div className="text-center text-red-500 py-8">Failed to load sync status</div>
          ) : (
            <div className="space-y-6">
              {/* Missing Transcripts */}
              {data.missingTranscripts.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-yellow-700">
                      Missing Transcripts ({data.missingTranscripts.length})
                    </h4>
                  </div>
                  <div className="space-y-1 max-h-48 overflow-y-auto border border-gray-100 rounded p-2">
                    {data.missingTranscripts.map(filename => (
                      <div
                        key={filename}
                        className="flex items-center justify-between py-1 px-2 hover:bg-gray-50 rounded"
                      >
                        <span className="text-sm font-mono text-gray-700 truncate flex-1 mr-2">
                          {filename}.mov
                        </span>
                        <button
                          onClick={() => handleTranscribe(filename)}
                          disabled={processingFiles.has(filename)}
                          className="text-xs px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded disabled:opacity-50"
                        >
                          {processingFiles.has(filename) ? '...' : 'Transcribe'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Orphaned Transcripts */}
              {data.orphanedTranscripts.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-orange-700">
                      Orphaned Transcripts ({data.orphanedTranscripts.length})
                    </h4>
                  </div>
                  <div className="space-y-1 max-h-48 overflow-y-auto border border-gray-100 rounded p-2">
                    {data.orphanedTranscripts.map(filename => (
                      <div
                        key={filename}
                        className="flex items-center justify-between py-1 px-2 hover:bg-gray-50 rounded"
                      >
                        <span className="text-sm font-mono text-gray-700 truncate flex-1 mr-2">
                          {filename}.txt
                        </span>
                        <button
                          onClick={() => handleDelete(filename)}
                          disabled={processingFiles.has(filename)}
                          className="text-xs px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded disabled:opacity-50"
                        >
                          {processingFiles.has(filename) ? '...' : 'Delete'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Matched (collapsed by default) */}
              {data.matched.length > 0 && (
                <details className="text-sm">
                  <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                    Matched ({data.matched.length} recordings with transcripts)
                  </summary>
                  <div className="mt-2 space-y-1 max-h-32 overflow-y-auto border border-gray-100 rounded p-2">
                    {data.matched.map(filename => (
                      <div key={filename} className="text-xs font-mono text-gray-500 py-0.5">
                        {filename}
                      </div>
                    ))}
                  </div>
                </details>
              )}

              {/* All synced message */}
              {data.missingTranscripts.length === 0 && data.orphanedTranscripts.length === 0 && (
                <div className="text-center text-green-600 py-8">
                  <span className="text-2xl">✓</span>
                  <p className="mt-2">All transcripts are synced!</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer with bulk actions */}
        {data && (data.missingTranscripts.length > 0 || data.orphanedTranscripts.length > 0) && (
          <div className="flex justify-between items-center p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex gap-2">
              {data.missingTranscripts.length > 0 && (
                <button
                  onClick={handleTranscribeAll}
                  disabled={processingFiles.size > 0}
                  className="text-sm px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
                >
                  Transcribe All Missing
                </button>
              )}
            </div>
            <div className="flex gap-2">
              {data.orphanedTranscripts.length > 0 && (
                <button
                  onClick={handleDeleteAllOrphaned}
                  disabled={processingFiles.size > 0}
                  className="text-sm px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded disabled:opacity-50"
                >
                  Delete All Orphaned
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
