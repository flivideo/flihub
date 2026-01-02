import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRecordings, useMoveToSafe, useRestoreFromSafe, useParkRecording, useUnparkRecording, useTranscribeAll, useGenerateChapterRecordings, usePendingTranscriptionCount } from '../hooks/useApi'
import { useRecordingsSocket, useChapterRecordingSocket } from '../hooks/useSocket'
import { QUERY_KEYS } from '../constants/queryKeys'
import { TranscriptModal } from './TranscriptModal'
import { VideoTranscriptModal } from './VideoTranscriptModal'
import { RenameLabelModal } from './RenameLabelModal'
import { ChapterPanel } from './ChapterPanel'
import { ChapterRecordingModal } from './ChapterRecordingModal'
import type { RecordingFile, TranscriptionStatusResponse } from '../../../shared/types'
import { extractTagsFromName } from '../../../shared/naming'
import { formatFileSize, formatDuration, formatChapterTitle, formatTimestamp } from '../utils/formatting'
import { LoadingSpinner, ErrorMessage } from './shared'
import { API_URL } from '../config'

// FR-41: Group info with active/safe/parked file counts and total duration
interface ChapterGroup {
  files: RecordingFile[]
  activeCount: number
  safeCount: number
  parkedCount: number  // FR-120: Count of parked files
  totalDuration: number  // Sum of all file durations in seconds
}

// FR-41: Extended group info with cumulative timing
interface ChapterGroupWithTiming extends ChapterGroup {
  chapterKey: string
  startTime: number  // Cumulative start time in seconds
}

// FR-35: Extract display name from first file in chapter, stripping tags
function getChapterDisplayName(files: RecordingFile[]): string {
  // Find sequence 1 file, or fall back to first file
  const firstFile = files.find(f => f.sequence === '1') || files[0]
  if (!firstFile) return ''

  // NFR-65: Use shared utility to strip tags from name
  const { name } = extractTagsFromName(firstFile.name)
  return name
}

// FR-35: Group recordings by chapter NUMBER only (not number + name)
function groupByChapter(recordings: RecordingFile[]): Map<string, ChapterGroup> {
  const groups = new Map<string, ChapterGroup>()

  for (const recording of recordings) {
    // Key by chapter number only
    const key = recording.chapter
    if (!groups.has(key)) {
      groups.set(key, { files: [], activeCount: 0, safeCount: 0, parkedCount: 0, totalDuration: 0 })
    }
    const group = groups.get(key)!
    group.files.push(recording)
    // FR-41: Sum up durations (skip if undefined)
    if (recording.duration != null) {
      group.totalDuration += recording.duration
    }
    // FR-111/FR-120: Count safe, parked, and active files
    if (recording.isSafe) {
      group.safeCount++
    } else if (recording.isParked) {
      group.parkedCount++
    } else {
      group.activeCount++
    }
  }

  return groups
}

// FR-41: Calculate cumulative start times for each chapter
function addCumulativeTiming(groups: Map<string, ChapterGroup>): ChapterGroupWithTiming[] {
  const result: ChapterGroupWithTiming[] = []
  let cumulative = 0

  for (const [chapterKey, group] of groups.entries()) {
    result.push({
      ...group,
      chapterKey,
      startTime: cumulative,
    })
    cumulative += group.totalDuration
  }

  return result
}

// FR-30: Transcription status badge for recording rows
// Enhancement A: Shows manual Transcribe button for recordings without transcripts
function TranscriptionBadge({
  filename,
  filePath,
  onViewTranscript
}: {
  filename: string
  filePath: string
  onViewTranscript: (filename: string) => void
}) {
  const queryClient = useQueryClient()

  const { data } = useQuery<TranscriptionStatusResponse>({
    queryKey: QUERY_KEYS.transcriptionStatus(filename),
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/transcriptions/status/${encodeURIComponent(filename)}`)
      return res.json()
    },
    refetchInterval: 10000,  // Poll every 10 seconds for status updates
  })

  // Enhancement A: Mutation to manually queue transcription
  const queueMutation = useMutation({
    mutationFn: async (videoPath: string) => {
      const res = await fetch(`${API_URL}/api/transcriptions/queue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoPath }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to queue transcription')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Transcription queued')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.transcriptionStatus(filename) })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.transcriptions })
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  if (!data) return null

  switch (data.status) {
    case 'queued':
      return <span className="text-xs text-yellow-600 px-1.5 py-0.5 bg-yellow-50 rounded font-medium" title="Queued for transcription">T</span>
    case 'transcribing':
      return <span className="text-xs text-blue-600 px-1.5 py-0.5 bg-blue-50 rounded font-medium animate-pulse" title="Transcribing...">T</span>
    case 'complete':
      return (
        <button
          onClick={() => onViewTranscript(filename)}
          className="text-xs text-green-600 hover:text-green-700 px-1.5 py-0.5 bg-green-50 hover:bg-green-100 rounded font-medium transition-colors"
          title="View transcript"
        >
          T
        </button>
      )
    case 'error':
      return (
        <button
          onClick={() => queueMutation.mutate(filePath)}
          disabled={queueMutation.isPending}
          className="text-xs text-red-600 hover:text-red-700 px-1.5 py-0.5 bg-red-50 hover:bg-red-100 rounded font-medium transition-colors disabled:opacity-50"
          title="Retry transcription"
        >
          T
        </button>
      )
    case 'none':
      return (
        <button
          onClick={() => queueMutation.mutate(filePath)}
          disabled={queueMutation.isPending}
          className="text-xs text-gray-400 hover:text-blue-600 px-1.5 py-0.5 bg-gray-100 hover:bg-blue-50 rounded font-medium transition-colors disabled:opacity-50"
          title="Start transcription"
        >
          T
        </button>
      )
    default:
      return null
  }
}

// Enhancement B: Chapter status response type
interface ChapterStatusResponse {
  chapter: string
  combinedExists: boolean
  combinedPath: string | null
  transcriptCount: number
}

// Enhancement B: Combine chapter transcripts button
function CombineChapterButton({ chapter, onViewCombined }: { chapter: string; onViewCombined: (filename: string) => void }) {
  const queryClient = useQueryClient()

  // Fetch chapter status
  const { data: status } = useQuery<ChapterStatusResponse>({
    queryKey: QUERY_KEYS.chapterStatus(chapter),
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/transcriptions/chapter-status/${encodeURIComponent(chapter)}`)
      return res.json()
    },
    refetchInterval: 30000,  // Check every 30 seconds
  })

  // Mutation to combine transcripts
  const combineMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_URL}/api/transcriptions/combine-chapter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapter }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to combine transcripts')
      }
      return res.json()
    },
    onSuccess: (data) => {
      toast.success(`Combined ${data.fileCount} transcripts`)
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.chapterStatus(chapter) })
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  // Don't show if no transcripts available
  if (!status || status.transcriptCount === 0) {
    return null
  }

  const combinedFilename = `${chapter}-chapter.txt`

  return (
    <span className="flex items-center gap-1">
      {status.combinedExists && (
        <button
          onClick={() => onViewCombined(combinedFilename)}
          className="text-xs text-blue-600 hover:text-blue-700 px-2 py-0.5 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
          title="View combined transcript"
        >
          View
        </button>
      )}
      <button
        onClick={() => combineMutation.mutate()}
        disabled={combineMutation.isPending}
        className={`text-xs px-2 py-0.5 rounded transition-colors disabled:opacity-50 ${
          status.combinedExists
            ? 'text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100'
            : 'text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100'
        }`}
        title={status.combinedExists ? 'Regenerate combined transcript' : 'Combine chapter transcripts'}
      >
        {combineMutation.isPending ? '...' : status.combinedExists ? 'Combine ✓' : 'Combine'}
      </button>
    </span>
  )
}

export function RecordingsView() {
  const { data, isLoading, error } = useRecordings()
  const moveToSafe = useMoveToSafe()
  const restoreFromSafe = useRestoreFromSafe()
  const parkRecording = useParkRecording()  // FR-120
  const unparkRecording = useUnparkRecording()  // FR-120
  const transcribeAll = useTranscribeAll()
  const generateChapter = useGenerateChapterRecordings()
  // FR-92: Get count of files pending transcription
  const { data: pendingData } = usePendingTranscriptionCount()
  const pendingCount = pendingData?.pendingCount ?? 0
  const [showSafe, setShowSafe] = useState(true)
  const [showParked, setShowParked] = useState(true)  // FR-120: Toggle for parked files
  const [viewingTranscript, setViewingTranscript] = useState<string | null>(null)
  // FR-47: State for editing chapter label
  // FR-111: Changed from folder to isSafe
  const [editingChapter, setEditingChapter] = useState<{
    chapter: string
    label: string
    files: { filename: string; isSafe: boolean }[]
  } | null>(null)

  // FR-55: State for video transcript modal
  const [showVideoTranscript, setShowVideoTranscript] = useState(false)

  // FR-58: State for chapter recording modal
  const [showChapterRecording, setShowChapterRecording] = useState(false)

  // FR-56: Refs and state for chapter navigation panel
  const chapterRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const [currentChapter, setCurrentChapter] = useState<string | null>(null)

  // NFR-5: Subscribe to real-time recordings changes via socket
  useRecordingsSocket()

  // FR-58: Listen for chapter recording completion events
  useChapterRecordingSocket()

  // Handle moving a single file to safe
  const handleMoveToSafe = (filename: string) => {
    moveToSafe.mutate(
      { files: [filename] },
      {
        onSuccess: (data) => {
          if (data.success && data.count && data.count > 0) {
            toast.success(`Moved ${filename} to safe`)
          } else if (data.errors?.length) {
            toast.error(data.errors[0])
          }
        },
        onError: (err) => {
          toast.error(err.message || 'Failed to move file')
        },
      }
    )
  }

  // Handle moving all files in a chapter to safe
  const handleMoveChapterToSafe = (chapter: string) => {
    moveToSafe.mutate(
      { chapter },
      {
        onSuccess: (data) => {
          if (data.success && data.count && data.count > 0) {
            toast.success(`Moved ${data.count} file${data.count > 1 ? 's' : ''} to safe`)
          } else if (data.errors?.length) {
            toast.error(data.errors[0])
          }
        },
        onError: (err) => {
          toast.error(err.message || 'Failed to move files')
        },
      }
    )
  }

  // Handle restoring a file from safe
  const handleRestore = (filename: string) => {
    restoreFromSafe.mutate([filename], {
      onSuccess: (data) => {
        if (data.success && data.count && data.count > 0) {
          toast.success(`Restored ${filename}`)
        } else if (data.errors?.length) {
          toast.error(data.errors[0])
        }
      },
      onError: (err) => {
        toast.error(err.message || 'Failed to restore file')
      },
    })
  }

  // Handle restoring all files from safe
  const handleRestoreAll = () => {
    // FR-111: Use isSafe flag instead of folder check
    const safeFilenames = data?.recordings
      .filter(r => r.isSafe)
      .map(r => r.filename) || []

    if (safeFilenames.length === 0) {
      toast.info('No files in safe folder')
      return
    }

    restoreFromSafe.mutate(safeFilenames, {
      onSuccess: (result) => {
        if (result.success && result.count && result.count > 0) {
          toast.success(`Restored ${result.count} file${result.count > 1 ? 's' : ''}`)
        } else if (result.errors?.length) {
          toast.error(result.errors[0])
        }
      },
      onError: (err) => {
        toast.error(err.message || 'Failed to restore files')
      },
    })
  }

  // FR-120: Handle parking a file
  const handlePark = (filename: string) => {
    parkRecording.mutate(
      { files: [filename] },
      {
        onSuccess: (data) => {
          if (data.success && data.count && data.count > 0) {
            toast.success(`Parked ${filename}`)
          } else if (data.errors?.length) {
            toast.error(data.errors[0])
          }
        },
        onError: (err) => {
          toast.error(err.message || 'Failed to park file')
        },
      }
    )
  }

  // FR-120: Handle unparking a file
  const handleUnpark = (filename: string) => {
    unparkRecording.mutate([filename], {
      onSuccess: (data) => {
        if (data.success && data.count && data.count > 0) {
          toast.success(`Unparked ${filename}`)
        } else if (data.errors?.length) {
          toast.error(data.errors[0])
        }
      },
      onError: (err) => {
        toast.error(err.message || 'Failed to unpark file')
      },
    })
  }

  // FR-120: Handle parking all files in a chapter
  const handleParkChapter = (chapter: string) => {
    parkRecording.mutate(
      { chapter },
      {
        onSuccess: (data) => {
          if (data.success && data.count && data.count > 0) {
            toast.success(`Parked ${data.count} file${data.count > 1 ? 's' : ''}`)
          } else if (data.errors?.length) {
            toast.error(data.errors[0])
          }
        },
        onError: (err) => {
          toast.error(err.message || 'Failed to park files')
        },
      }
    )
  }

  // FR-120: Handle unparking all files in a chapter
  const handleUnparkChapter = (filenames: string[]) => {
    if (filenames.length === 0) return

    unparkRecording.mutate(filenames, {
      onSuccess: (result) => {
        if (result.success && result.count && result.count > 0) {
          toast.success(`Unparked ${result.count} file${result.count > 1 ? 's' : ''}`)
        } else if (result.errors?.length) {
          toast.error(result.errors[0])
        }
      },
      onError: (err) => {
        toast.error(err.message || 'Failed to unpark files')
      },
    })
  }

  // Handle restoring all files in a chapter from safe
  const handleRestoreChapterFromSafe = (filenames: string[]) => {
    if (filenames.length === 0) return

    restoreFromSafe.mutate(filenames, {
      onSuccess: (result) => {
        if (result.success && result.count && result.count > 0) {
          toast.success(`Restored ${result.count} file${result.count > 1 ? 's' : ''}`)
        } else if (result.errors?.length) {
          toast.error(result.errors[0])
        }
      },
      onError: (err) => {
        toast.error(err.message || 'Failed to restore files')
      },
    })
  }

  // FR-30 Enhancement: Transcribe all videos in project
  const handleTranscribeProject = () => {
    transcribeAll.mutate(
      { scope: 'project' },
      {
        onSuccess: (data) => {
          if (data.queuedCount > 0) {
            toast.success(`Queued ${data.queuedCount} video${data.queuedCount > 1 ? 's' : ''} for transcription`)
          } else {
            toast.info('All videos already have transcripts')
          }
        },
        onError: (err) => {
          toast.error(err.message || 'Failed to queue transcriptions')
        },
      }
    )
  }

  // FR-30 Enhancement: Transcribe all videos in a chapter
  const handleTranscribeChapter = (chapter: string) => {
    transcribeAll.mutate(
      { scope: 'chapter', chapter },
      {
        onSuccess: (data) => {
          if (data.queuedCount > 0) {
            toast.success(`Queued ${data.queuedCount} video${data.queuedCount > 1 ? 's' : ''} for transcription`)
          } else {
            toast.info('All videos in chapter already have transcripts')
          }
        },
        onError: (err) => {
          toast.error(err.message || 'Failed to queue transcriptions')
        },
      }
    )
  }

  // Filter recordings based on showSafe and showParked toggles
  // FR-111/FR-120: Filter by isSafe and isParked flags
  const filteredRecordings = useMemo(() => {
    if (!data?.recordings) return []
    return data.recordings.filter(r => {
      if (!showSafe && r.isSafe) return false
      if (!showParked && r.isParked) return false
      return true
    })
  }, [data?.recordings, showSafe, showParked])

  // FR-41: Group recordings and calculate cumulative timing
  const chaptersWithTiming = useMemo(() => {
    const groups = groupByChapter(filteredRecordings)
    return addCumulativeTiming(groups)
  }, [filteredRecordings])

  // FR-35: Calculate total duration across all recordings
  // Note: This must be before early returns to maintain hook order
  const totalDuration = useMemo(() => {
    if (!data?.recordings) return 0
    return data.recordings.reduce((sum, r) => sum + (r.duration ?? 0), 0)
  }, [data?.recordings])

  // FR-56: Prepare chapter info for the panel
  const chapterPanelData = useMemo(() => {
    return chaptersWithTiming.map(ch => ({
      chapterKey: ch.chapterKey,
      title: getChapterDisplayName(ch.files),
      startTime: ch.startTime,
      fileCount: ch.files.length,
    }))
  }, [chaptersWithTiming])

  // FR-56: Intersection Observer to track current chapter in viewport
  useEffect(() => {
    if (chaptersWithTiming.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the first visible chapter
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const chapterKey = entry.target.getAttribute('data-chapter')
            if (chapterKey) {
              setCurrentChapter(chapterKey)
              break
            }
          }
        }
      },
      {
        root: null, // viewport
        rootMargin: '-100px 0px -60% 0px', // trigger when chapter is in upper portion
        threshold: 0,
      }
    )

    // Observe all chapter elements
    chapterRefs.current.forEach((element) => {
      observer.observe(element)
    })

    return () => observer.disconnect()
  }, [chaptersWithTiming])

  // FR-56: Handle click on chapter in panel - scroll to that chapter
  const handleChapterClick = useCallback((chapterKey: string) => {
    const element = chapterRefs.current.get(chapterKey)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

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

  // Count files by safe/parked status (FR-111/FR-120)
  const totalFiles = data.recordings.length
  const safeFiles = data.recordings.filter(r => r.isSafe).length
  const parkedFiles = data.recordings.filter(r => r.isParked).length
  const activeFiles = totalFiles - safeFiles - parkedFiles

  return (
    <div>
      {/* Toggle options - compact inline */}
      <div className="flex items-center gap-3 mb-3 text-xs text-gray-500">
        <span className="text-gray-700 font-medium">
          {totalFiles} files
          <span className="font-normal text-gray-400 ml-1">
            ({activeFiles} active, {safeFiles} safe, {parkedFiles} parked)
          </span>
          {/* FR-35: Total duration in header */}
          {totalDuration > 0 && (
            <span className="font-normal text-gray-400 ml-1">
              | {formatDuration(totalDuration, 'smart')}
            </span>
          )}
          {/* FR-95: Total recording and shadow sizes */}
          {data?.totalRecordingsSize != null && data.totalRecordingsSize > 0 && (
            <span className="font-normal text-gray-400 ml-1">
              | {formatFileSize(data.totalRecordingsSize)}
              {data.totalShadowsSize != null && data.totalShadowsSize > 0 && (
                <span className="text-purple-400"> (shadows: {formatFileSize(data.totalShadowsSize)})</span>
              )}
            </span>
          )}
        </span>
        <span className="text-gray-300">|</span>
        <label className="flex items-center gap-1.5 cursor-pointer hover:text-gray-700">
          <input
            type="checkbox"
            checked={showSafe}
            onChange={(e) => setShowSafe(e.target.checked)}
            className="w-3 h-3 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
          />
          Safe
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer hover:text-gray-700">
          <input
            type="checkbox"
            checked={showParked}
            onChange={(e) => setShowParked(e.target.checked)}
            className="w-3 h-3 rounded border-gray-300 text-pink-500 focus:ring-pink-500"
          />
          Parked
        </label>
        {safeFiles > 0 && (
          <button
            onClick={handleRestoreAll}
            disabled={restoreFromSafe.isPending}
            className="text-green-600 hover:text-green-700 disabled:opacity-50"
            title="Restore all files from safe folder"
          >
            ← Restore All
          </button>
        )}
        <span className="text-gray-300">|</span>
        <button
          onClick={handleTranscribeProject}
          disabled={transcribeAll.isPending || pendingCount === 0}
          className="text-purple-600 hover:text-purple-700 disabled:opacity-50"
          title={pendingCount > 0 ? `Queue ${pendingCount} untranscribed video${pendingCount > 1 ? 's' : ''} for transcription` : 'All videos already have transcripts'}
        >
          🎙️ {pendingCount > 0 ? `Transcribe ${pendingCount}` : 'All Transcribed'}
        </button>
        {/* FR-55: Video-level transcript export */}
        <span className="text-gray-300">|</span>
        <button
          onClick={() => setShowVideoTranscript(true)}
          className="text-blue-600 hover:text-blue-700"
          title="View combined video transcript"
        >
          📄 Transcript
        </button>
        <span className="text-gray-300">|</span>
        <button
          onClick={() => setShowChapterRecording(true)}
          className="text-purple-600 hover:text-purple-700"
          title="Create chapter preview recordings"
        >
          🎬 Chapter Recordings
        </button>
      </div>

      {/* Recordings list */}
      <div className="space-y-6">
        {chaptersWithTiming.map((chapterData) => {
          // FR-35: chapterKey is now just the chapter number
          const chapter = chapterData.chapterKey
          // FR-35: Get display name from first file, with tags stripped
          const name = getChapterDisplayName(chapterData.files)
          const group = chapterData
          const isAllSafe = group.activeCount === 0
          const hasActiveFiles = group.activeCount > 0
          // FR-111: Use isSafe flag instead of folder check
          const safeFilesInChapter = group.files.filter(f => f.isSafe)
          const hasSafeFiles = safeFilesInChapter.length > 0
          // FR-120: Track parked files in chapter
          const parkedFilesInChapter = group.files.filter(f => f.isParked)
          const hasParkedFiles = parkedFilesInChapter.length > 0

          return (
            <div
              key={chapterData.chapterKey}
              data-chapter={chapterData.chapterKey}
              ref={(el) => {
                if (el) {
                  chapterRefs.current.set(chapterData.chapterKey, el)
                } else {
                  chapterRefs.current.delete(chapterData.chapterKey)
                }
              }}
            >
              {/* Chapter separator */}
              <div className="flex items-center gap-3 mb-3">
                  <div className="h-px bg-gray-300 flex-1" />
                  <span className={`text-sm font-semibold px-2 ${isAllSafe ? 'text-gray-400' : 'text-gray-700'}`}>
                    {chapter} {formatChapterTitle(name)}
                    {/* FR-41: File count and total duration */}
                    <span className="font-normal text-xs ml-2">
                      ({group.files.length} file{group.files.length !== 1 ? 's' : ''}
                      {group.totalDuration > 0 && ` · ${formatDuration(group.totalDuration, 'smart')}`})
                    </span>
                  </span>
                  {/* FR-41: Cumulative start time (YouTube format) */}
                  <span className="text-xs text-gray-400 font-mono">
                    @ {formatDuration(chapterData.startTime, 'youtube')}
                  </span>
                  {/* FR-47: Rename chapter button */}
                  <button
                    onClick={() => setEditingChapter({
                      chapter,
                      label: name,
                      // FR-111: Use isSafe flag instead of folder
                      files: group.files.map(f => ({ filename: f.filename, isSafe: f.isSafe })),
                    })}
                    className="text-xs text-gray-400 hover:text-blue-600 px-1.5 py-0.5 hover:bg-blue-50 rounded transition-colors"
                    title="Rename chapter label"
                  >
                    ✏️
                  </button>
                  {/* Chapter action buttons */}
                  {hasActiveFiles && (
                    <button
                      onClick={() => handleMoveChapterToSafe(chapter)}
                      disabled={moveToSafe.isPending}
                      className="text-xs text-gray-500 hover:text-blue-600 px-2 py-0.5 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                    >
                      → Safe All
                    </button>
                  )}
                  {hasSafeFiles && (
                    <button
                      onClick={() => handleRestoreChapterFromSafe(safeFilesInChapter.map(f => f.filename))}
                      disabled={restoreFromSafe.isPending}
                      className="text-xs text-green-600 hover:text-green-700 px-2 py-0.5 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
                    >
                      ← Restore All
                    </button>
                  )}
                  {/* FR-120: Park/Unpark chapter buttons */}
                  {hasActiveFiles && (
                    <button
                      onClick={() => handleParkChapter(chapter)}
                      disabled={parkRecording.isPending}
                      className="text-xs text-gray-500 hover:text-pink-600 px-2 py-0.5 hover:bg-pink-50 rounded transition-colors disabled:opacity-50"
                    >
                      → Park All
                    </button>
                  )}
                  {hasParkedFiles && (
                    <button
                      onClick={() => handleUnparkChapter(parkedFilesInChapter.map(f => f.filename))}
                      disabled={unparkRecording.isPending}
                      className="text-xs text-pink-600 hover:text-pink-700 px-2 py-0.5 hover:bg-pink-50 rounded transition-colors disabled:opacity-50"
                    >
                      ← Unpark All
                    </button>
                  )}
                  {/* FR-30 Enhancement: Transcribe chapter button */}
                  <button
                    onClick={() => handleTranscribeChapter(chapter)}
                    disabled={transcribeAll.isPending}
                    className="text-xs text-purple-500 hover:text-purple-600 px-2 py-0.5 hover:bg-purple-50 rounded transition-colors disabled:opacity-50"
                    title="Queue all untranscribed videos in this chapter"
                  >
                    🎙️ All
                  </button>
                  {/* Enhancement B: Combine chapter transcripts button */}
                  <CombineChapterButton chapter={chapter} onViewCombined={setViewingTranscript} />
                  <div className="h-px bg-gray-300 flex-1" />
              </div>

              {/* Files in this chapter */}
              <div className="space-y-1">
                {group.files.map((file) => {
                  // FR-88: Check if shadow-only file
                  const isShadow = 'isShadow' in file && file.isShadow

                  // FR-83/FR-111/FR-120: Determine row styling based on shadow/safe/parked status
                  let rowClasses: string
                  let textClasses: string

                  if (isShadow) {
                    // Shadow-only file: purple tint for collaborator mode
                    rowClasses = 'bg-purple-50 border-purple-200'
                    textClasses = 'text-purple-700'
                  } else if (file.isSafe) {
                    // FR-111: Safe files (green background)
                    rowClasses = 'bg-green-50 border-green-200 text-gray-500'
                    textClasses = 'text-gray-500'
                  } else if (file.isParked) {
                    // FR-120: Parked files (pink background)
                    rowClasses = 'bg-pink-50 border-pink-200 text-gray-500'
                    textClasses = 'text-gray-500'
                  } else {
                    // Active files (blue background)
                    rowClasses = 'bg-blue-50 border-blue-200'
                    textClasses = 'text-gray-700'
                  }

                  return (
                    <div
                      key={file.path}
                      className={`flex items-center justify-between px-4 py-2 rounded-lg border ${rowClasses}`}
                    >
                      <div className="flex items-center gap-3">
                        {/* FR-88: Only show ghost icon for shadow-only files */}
                        {isShadow && (
                          <span className="text-sm" title="Shadow only - video not available locally">👻</span>
                        )}
                        <span className={`font-mono text-sm ${textClasses}`}>
                          {file.filename}
                        </span>
                        {file.tags.length > 0 && (
                          <span className="text-xs text-gray-500">
                            [{file.tags.join(', ')}]
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span className="font-mono">{formatDuration(file.duration)}</span>
                        {/* FR-95: File size with shadow tooltip */}
                        <span
                          title={file.shadowSize ? `Shadow: ${formatFileSize(file.shadowSize)}` : 'No shadow'}
                          className="cursor-help"
                        >
                          {formatFileSize(file.size)}
                        </span>
                        <span>{formatTimestamp(file.timestamp)}</span>
                        {/* FR-83: Transcription works for both real and shadow files (video shadows have audio) */}
                        <TranscriptionBadge
                          filename={file.filename}
                          filePath={file.path}
                          onViewTranscript={setViewingTranscript}
                        />
                        {/* Action buttons - disabled for shadow-only files */}
                        {/* FR-111/FR-120: Safe and Park actions */}
                        {isShadow ? (
                          <span className="text-xs text-gray-300 px-2 py-0.5" title="Actions unavailable for shadow files">-</span>
                        ) : file.isSafe ? (
                          <button
                            onClick={() => handleRestore(file.filename)}
                            disabled={restoreFromSafe.isPending}
                            className="text-xs text-green-600 hover:text-green-700 px-2 py-0.5 hover:bg-green-100 rounded transition-colors disabled:opacity-50"
                          >
                            ← Restore
                          </button>
                        ) : file.isParked ? (
                          <button
                            onClick={() => handleUnpark(file.filename)}
                            disabled={unparkRecording.isPending}
                            className="text-xs text-pink-600 hover:text-pink-700 px-2 py-0.5 hover:bg-pink-100 rounded transition-colors disabled:opacity-50"
                          >
                            ← Unpark
                          </button>
                        ) : (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleMoveToSafe(file.filename)}
                              disabled={moveToSafe.isPending}
                              className="text-xs text-gray-500 hover:text-green-600 px-2 py-0.5 hover:bg-green-100 rounded transition-colors disabled:opacity-50"
                            >
                              → Safe
                            </button>
                            <button
                              onClick={() => handlePark(file.filename)}
                              disabled={parkRecording.isPending}
                              className="text-xs text-gray-500 hover:text-pink-600 px-2 py-0.5 hover:bg-pink-100 rounded transition-colors disabled:opacity-50"
                            >
                              → Park
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
        </div>

        {/* FR-56: Slide-out Chapter Panel - hover to expand */}
        <div className="fixed right-0 top-32 bottom-4 z-40 group">
          {/* Hover trigger tab */}
          <div className="absolute right-0 top-0 h-full flex items-start pt-8">
            <div className="bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg px-1.5 py-3 cursor-pointer shadow-sm group-hover:opacity-0 transition-opacity">
              <span
                className="text-xs font-medium text-gray-600"
                style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
              >
                Chapters ({chapterPanelData.length})
              </span>
            </div>
          </div>
          {/* Slide-out panel */}
          <div className="h-full w-72 translate-x-full group-hover:translate-x-0 transition-transform duration-200 ease-out">
            <ChapterPanel
              chapters={chapterPanelData}
              currentChapter={currentChapter}
              onChapterClick={handleChapterClick}
            />
          </div>
        </div>

      {/* FR-30: Transcript Modal */}
      {viewingTranscript && (
        <TranscriptModal
          filename={viewingTranscript}
          onClose={() => setViewingTranscript(null)}
        />
      )}

      {/* FR-47: Rename Chapter Label Modal */}
      {editingChapter && (
        <RenameLabelModal
          chapterInfo={editingChapter}
          onClose={() => setEditingChapter(null)}
        />
      )}

      {/* FR-55: Video Transcript Modal */}
      {showVideoTranscript && (
        <VideoTranscriptModal
          onClose={() => setShowVideoTranscript(false)}
        />
      )}

      {/* FR-58: Chapter Recording Modal */}
      {showChapterRecording && (
        <ChapterRecordingModal
          onClose={() => setShowChapterRecording(false)}
        />
      )}

      {/* FR-35: Total duration footer */}
      {totalDuration > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200 text-sm text-gray-500 text-right">
          Total: {formatDuration(totalDuration, 'smart')}
        </div>
      )}
    </div>
  )
}
