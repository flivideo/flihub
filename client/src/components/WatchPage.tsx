/**
 * FR-70: Video Watch Page
 *
 * Dedicated video playback page with cascading chapter/segment panels.
 * Full-width video player for maximum viewing space.
 *
 * UX:
 * - Hover right edge → Chapter panel slides out
 * - Click chapter → plays chapter recording
 * - Hover chapter → Segment panel slides out to the left
 * - Click segment → plays that segment
 */

import { useMemo, useState, useRef, useCallback } from 'react'
import { useRecordings, useConfig } from '../hooks/useApi'
import { useRecordingsSocket } from '../hooks/useSocket'
import { extractTagsFromName } from '../../../shared/naming'
import { formatDuration, formatChapterTitle } from '../utils/formatting'
import { LoadingSpinner, ErrorMessage } from './shared'
import { API_URL } from '../config'
import type { RecordingFile } from '../../../shared/types'

// Chapter group with files and timing
interface ChapterGroup {
  chapterKey: string
  title: string
  files: RecordingFile[]
  totalDuration: number
  startTime: number
}

// Extract display name from first file in chapter, stripping tags
function getChapterDisplayName(files: RecordingFile[]): string {
  const firstFile = files.find(f => f.sequence === '1') || files[0]
  if (!firstFile) return ''
  const { name } = extractTagsFromName(firstFile.name)
  return name
}

// Group recordings by chapter and calculate timing
function groupByChapterWithTiming(recordings: RecordingFile[]): ChapterGroup[] {
  const groups = new Map<string, { files: RecordingFile[]; totalDuration: number }>()

  // Only include active recordings (not safe folder) for watching
  const activeRecordings = recordings.filter(r => r.folder !== 'safe')

  for (const recording of activeRecordings) {
    const key = recording.chapter
    if (!groups.has(key)) {
      groups.set(key, { files: [], totalDuration: 0 })
    }
    const group = groups.get(key)!
    group.files.push(recording)
    if (recording.duration != null) {
      group.totalDuration += recording.duration
    }
  }

  // Convert to array with cumulative timing
  const result: ChapterGroup[] = []
  let cumulative = 0

  for (const [chapterKey, group] of groups.entries()) {
    // Sort files by sequence within chapter
    group.files.sort((a, b) => parseInt(a.sequence) - parseInt(b.sequence))

    result.push({
      chapterKey,
      title: getChapterDisplayName(group.files),
      files: group.files,
      totalDuration: group.totalDuration,
      startTime: cumulative,
    })
    cumulative += group.totalDuration
  }

  return result
}

// Build video URL for a recording
function getVideoUrl(projectCode: string, filename: string, folder: 'recordings' | '-chapters' = 'recordings'): string {
  return `${API_URL}/api/video/${projectCode}/${folder}/${filename}`
}

export function WatchPage() {
  const { data: config } = useConfig()
  const { data, isLoading, error } = useRecordings()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [currentVideo, setCurrentVideo] = useState<{
    url: string
    title: string
    isChapter?: boolean
  } | null>(null)
  const [hoveredChapter, setHoveredChapter] = useState<ChapterGroup | null>(null)

  // Subscribe to real-time recordings changes
  useRecordingsSocket()

  // Get project code from config
  const projectCode = config?.projectDirectory?.split('/').pop() || ''

  // Group recordings by chapter with timing
  const chapters = useMemo(() => {
    if (!data?.recordings) return []
    return groupByChapterWithTiming(data.recordings)
  }, [data?.recordings])

  // Play a specific recording (segment)
  const playRecording = useCallback((file: RecordingFile) => {
    if (!projectCode) return
    const url = getVideoUrl(projectCode, file.filename)
    setCurrentVideo({
      url,
      title: file.filename,
    })
  }, [projectCode])

  // Play chapter recording (combined video from -chapters folder)
  const playChapterRecording = useCallback((chapter: ChapterGroup) => {
    if (!projectCode) return
    // Chapter recordings are named like: 01-intro.mov
    const chapterFilename = `${chapter.chapterKey}-${chapter.title || 'chapter'}.mov`
    const url = getVideoUrl(projectCode, chapterFilename, '-chapters')
    setCurrentVideo({
      url,
      title: `Chapter ${chapter.chapterKey}: ${formatChapterTitle(chapter.title)}`,
      isChapter: true,
    })
  }, [projectCode])

  // Calculate total duration
  const totalDuration = useMemo(() => {
    return chapters.reduce((sum, ch) => sum + ch.totalDuration, 0)
  }, [chapters])

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

  return (
    <div className="relative">
      {/* Full-width Video Player */}
      <div className="bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
        {currentVideo ? (
          <video
            ref={videoRef}
            src={currentVideo.url}
            controls
            autoPlay
            className="w-full h-full object-contain"
            onError={(e) => {
              console.error('Video error:', e)
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500">
            <div className="text-center p-8">
              <svg className="w-20 h-20 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-lg">Select a recording to play</p>
              <p className="text-sm text-gray-600 mt-1">
                Hover over chapters panel on the right →
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Now Playing Info */}
      {currentVideo && (
        <div className="mt-3 flex items-center gap-3">
          <h3 className="font-medium text-gray-800">{currentVideo.title}</h3>
          {currentVideo.isChapter && (
            <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
              Chapter Recording
            </span>
          )}
        </div>
      )}

      {/* Cascading Panels Container */}
      <div
        className="fixed right-0 top-32 bottom-4 z-40 group"
        onMouseLeave={() => setHoveredChapter(null)}
      >
        {/* Hover trigger tab */}
        <div className="absolute right-0 top-0 h-full flex items-start pt-8">
          <div className="bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg px-1.5 py-3 cursor-pointer shadow-sm group-hover:opacity-0 transition-opacity">
            <span
              className="text-xs font-medium text-gray-600"
              style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
            >
              Chapters ({chapters.length})
            </span>
          </div>
        </div>

        {/* Segments Panel - slides out to the LEFT of chapters panel */}
        <div
          className={`absolute right-72 top-0 h-full w-64 transition-all duration-200 ease-out ${
            hoveredChapter ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0 pointer-events-none'
          }`}
        >
          <div className="bg-white rounded-l-lg border border-r-0 border-gray-200 shadow-lg h-full flex flex-col">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
              <h3 className="text-sm font-semibold text-gray-700">
                {hoveredChapter ? (
                  <>
                    <span className="text-gray-400">{hoveredChapter.chapterKey}</span>
                    {' '}
                    {formatChapterTitle(hoveredChapter.title) || 'Segments'}
                  </>
                ) : 'Segments'}
              </h3>
              {hoveredChapter && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {hoveredChapter.files.length} segment{hoveredChapter.files.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>

            {/* Segment List */}
            <div className="flex-1 overflow-y-auto py-1">
              {hoveredChapter?.files.map((file) => {
                const isPlaying = currentVideo?.url.includes(file.filename) && !currentVideo?.isChapter
                return (
                  <button
                    key={file.path}
                    onClick={() => playRecording(file)}
                    className={`w-full text-left px-4 py-2 flex items-center gap-2 transition-colors ${
                      isPlaying
                        ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-500'
                        : 'hover:bg-gray-50 text-gray-600 border-l-2 border-transparent'
                    }`}
                  >
                    <span className={`text-xs ${isPlaying ? 'text-blue-500' : 'text-gray-300'}`}>
                      {isPlaying ? '▶' : '○'}
                    </span>
                    <span className={`flex-1 font-mono text-xs truncate ${
                      isPlaying ? 'font-medium' : ''
                    }`}>
                      {file.chapter}-{file.sequence}-{file.name}
                    </span>
                    {file.duration && (
                      <span className="font-mono text-xs text-gray-400">
                        {formatDuration(file.duration, 'compact')}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Chapter Panel - slides out from right edge */}
        <div className="h-full w-72 translate-x-full group-hover:translate-x-0 transition-transform duration-200 ease-out">
          <div className="bg-white rounded-l-lg border border-r-0 border-gray-200 shadow-lg h-full flex flex-col">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Chapters ({chapters.length})
              </h3>
              {totalDuration > 0 && (
                <p className="text-xs text-gray-500 mt-0.5">
                  Total: {formatDuration(totalDuration, 'smart')}
                </p>
              )}
            </div>

            {/* Chapter List - flat, no expansion */}
            <div className="flex-1 overflow-y-auto py-1">
              {chapters.map((chapter) => {
                const title = formatChapterTitle(chapter.title)
                const isChapterPlaying = currentVideo?.isChapter && currentVideo.title.includes(`Chapter ${chapter.chapterKey}`)
                const isHovered = hoveredChapter?.chapterKey === chapter.chapterKey

                return (
                  <button
                    key={chapter.chapterKey}
                    onClick={() => playChapterRecording(chapter)}
                    onMouseEnter={() => setHoveredChapter(chapter)}
                    className={`w-full px-4 py-2 text-left flex items-center gap-2 transition-colors ${
                      isChapterPlaying
                        ? 'bg-purple-50 text-purple-700 border-l-2 border-purple-500'
                        : isHovered
                          ? 'bg-blue-50 border-l-2 border-blue-400'
                          : 'hover:bg-gray-50 border-l-2 border-transparent'
                    }`}
                  >
                    <span className={`font-mono text-xs w-5 ${
                      isChapterPlaying ? 'text-purple-500' : 'text-gray-400'
                    }`}>
                      {chapter.chapterKey}
                    </span>
                    <span className={`flex-1 text-sm truncate ${
                      isChapterPlaying ? 'font-medium text-purple-700' : 'text-gray-700'
                    }`}>
                      {title || `Chapter ${chapter.chapterKey}`}
                    </span>
                    <span className="font-mono text-xs text-gray-400">
                      {formatDuration(chapter.startTime, 'youtube')}
                    </span>
                    {isChapterPlaying && (
                      <span className="text-purple-500">▶</span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-gray-100 flex-shrink-0 text-center">
              <p className="text-xs text-gray-500">
                Click = play chapter
              </p>
              <p className="text-xs text-gray-400">
                Hover = show segments
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
