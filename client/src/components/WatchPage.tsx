/**
 * FR-70: Video Watch Page
 * FR-71: Watch Page Enhancements
 * FR-75: Transcript Sync Highlighting (Segments)
 * FR-77: Transcript Sync Highlighting (Chapters)
 *
 * Dedicated video playback page with cascading chapter/segment panels.
 * Full-width video player for maximum viewing space.
 *
 * UX:
 * - Hover right edge → Chapter panel slides out
 * - Click chapter → plays chapter recording
 * - Hover chapter → Segment panel slides out to the left
 * - Click segment → plays that segment
 *
 * FR-71 Enhancements:
 * - Auto-select last recording on page load (highest chapter + sequence)
 * - Default to 2x playback speed with speed control bar
 * - Video size toggle (Normal/Large/Extra Large)
 * - Persist speed and size preferences to localStorage
 *
 * FR-75/FR-77 Transcript Sync:
 * - SRT-based highlighting with word/phrase modes for both segments and chapters
 * - Click on word/phrase to seek video to that timestamp
 * - Auto-scroll to keep highlighted text visible
 * - Mode preference persisted to localStorage
 * - Chapter videos use chapter SRT with offset timing
 */

import { useMemo, useState, useRef, useCallback, useEffect } from 'react'
import { useRecordings, useConfig } from '../hooks/useApi'
import { useRecordingsSocket } from '../hooks/useSocket'
import { extractTagsFromName } from '../../../shared/naming'
import { formatDuration, formatChapterTitle } from '../utils/formatting'
import { LoadingSpinner, ErrorMessage } from './shared'
import { TranscriptSyncPanel } from './TranscriptSyncPanel'
import { API_URL } from '../config'
import type { RecordingFile } from '../../../shared/types'

// FR-71: Speed presets
const SPEED_PRESETS = [1, 1.5, 2, 2.5, 3, 4]
const DEFAULT_SPEED = 2

// FR-71: Size options
// FR-91: Simplified to just N and L
type VideoSize = 'normal' | 'large'
// FR-91: Removed XL option
const SIZE_LABELS: Record<VideoSize, string> = {
  normal: 'N',
  large: 'L',
}

// FR-71: localStorage keys
const STORAGE_KEYS = {
  speed: 'flihub:watch:playbackSpeed',
  size: 'flihub:watch:videoSize',
  autoplay: 'flihub:watch:autoplay',
  autonext: 'flihub:watch:autonext',
}

// FR-71/FR-91: Size CSS classes
// N = 896px (max-w-4xl), L = breaks out of container to ~1280px
const SIZE_CLASSES: Record<VideoSize, string> = {
  normal: 'max-w-4xl mx-auto',
  large: 'w-[calc(100vw-2rem)] max-w-7xl relative left-1/2 -translate-x-1/2',  // Break out to viewport
}

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
// FR-83: Support shadow videos with different folder and .mp4 extension
function getVideoUrl(
  projectCode: string,
  filename: string,
  folder: 'recordings' | '-chapters' = 'recordings',
  options?: { isShadow?: boolean; shadowFolder?: 'recordings' | 'safe' }
): string {
  if (options?.isShadow) {
    // Shadow videos are .mp4 in recording-shadows/ folder
    const shadowFilename = filename.replace(/\.mov$/i, '.mp4')
    const shadowFolder = options.shadowFolder === 'safe' ? 'recording-shadows-safe' : 'recording-shadows'
    return `${API_URL}/api/video/${projectCode}/${shadowFolder}/${shadowFilename}`
  }
  return `${API_URL}/api/video/${projectCode}/${folder}/${filename}`
}

// FR-71: Video metadata for transcript loading
interface VideoMeta {
  url: string
  title: string
  isChapter?: boolean
  chapterKey?: string    // For chapter videos, the chapter number (e.g., "01")
  chapterLabel?: string  // FR-77: For chapter videos, the label (e.g., "intro")
  segmentName?: string   // For segment videos, the full name without extension (e.g., "01-1-intro")
  chapterFiles?: RecordingFile[]  // For chapter videos, all segments in the chapter
  isShadow?: boolean     // FR-83: True if playing 240p preview video
  sourceFile?: RecordingFile  // FR-88: Original file for fallback logic
}

export function WatchPage() {
  const { data: config } = useConfig()
  const { data, isLoading, error } = useRecordings()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [currentVideo, setCurrentVideo] = useState<VideoMeta | null>(null)
  const [hoveredChapter, setHoveredChapter] = useState<ChapterGroup | null>(null)

  // FR-71: Speed and size state with localStorage persistence
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.speed)
    return saved ? parseFloat(saved) : DEFAULT_SPEED
  })
  const [videoSize, setVideoSize] = useState<VideoSize>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.size)
    // FR-91: Validate saved value (xl was removed)
    if (saved === 'normal' || saved === 'large') return saved
    return 'normal'
  })

  // FR-75/FR-77: Transcript panel collapsed state
  const [transcriptCollapsed, setTranscriptCollapsed] = useState(false)

  // FR-75: Video time tracking for transcript sync
  const [currentTime, setCurrentTime] = useState(0)

  // Play/pause state for manual control
  const [isPlaying, setIsPlaying] = useState(false)

  // Autoplay state - starts playing when you click a video
  const [autoplay, setAutoplay] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.autoplay)
    return saved === 'true'
  })

  // Auto-next state - plays next segment when video ends
  const [autonext, setAutonext] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.autonext)
    return saved === 'true'
  })

  // Subscribe to real-time recordings changes
  useRecordingsSocket()

  // Get project code from config
  const projectCode = config?.projectDirectory?.split('/').pop() || ''

  // Group recordings by chapter with timing
  const chapters = useMemo(() => {
    if (!data?.recordings) return []
    return groupByChapterWithTiming(data.recordings)
  }, [data?.recordings])

  // FR-71: Find the most recent recording (highest chapter, then highest sequence)
  const mostRecentRecording = useMemo(() => {
    if (!data?.recordings) return null
    const activeRecordings = data.recordings.filter(r => r.folder !== 'safe')
    if (activeRecordings.length === 0) return null

    return activeRecordings.sort((a, b) => {
      const chapterDiff = parseInt(b.chapter) - parseInt(a.chapter)
      if (chapterDiff !== 0) return chapterDiff
      return parseInt(b.sequence) - parseInt(a.sequence)
    })[0]
  }, [data?.recordings])

  // FR-71: Auto-select last recording on page load
  const hasAutoSelected = useRef(false)
  useEffect(() => {
    if (mostRecentRecording && projectCode && !hasAutoSelected.current && !currentVideo) {
      hasAutoSelected.current = true
      const url = getVideoUrl(projectCode, mostRecentRecording.filename)
      const segmentName = mostRecentRecording.filename.replace(/\.mov$/, '')
      setCurrentVideo({
        url,
        title: mostRecentRecording.filename,
        segmentName,
      })
    }
  }, [mostRecentRecording, projectCode, currentVideo])

  // FR-71: Apply playback speed when video changes or speed changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed
    }
  }, [playbackSpeed, currentVideo])

  // FR-71: Persist speed preference
  const handleSpeedChange = useCallback((speed: number) => {
    setPlaybackSpeed(speed)
    localStorage.setItem(STORAGE_KEYS.speed, speed.toString())
    if (videoRef.current) {
      videoRef.current.playbackRate = speed
    }
  }, [])

  // FR-71: Persist size preference
  const handleSizeChange = useCallback((size: VideoSize) => {
    setVideoSize(size)
    localStorage.setItem(STORAGE_KEYS.size, size)
  }, [])

  // Toggle autoplay (start playing on click)
  const handleAutoplayToggle = useCallback(() => {
    setAutoplay(prev => {
      const newValue = !prev
      localStorage.setItem(STORAGE_KEYS.autoplay, String(newValue))
      return newValue
    })
  }, [])

  // Toggle auto-next (play next segment when video ends)
  const handleAutonextToggle = useCallback(() => {
    setAutonext(prev => {
      const newValue = !prev
      localStorage.setItem(STORAGE_KEYS.autonext, String(newValue))
      return newValue
    })
  }, [])

  // Toggle play/pause for current video
  const handlePlayPause = useCallback(() => {
    if (!videoRef.current) return
    if (isPlaying) {
      videoRef.current.pause()
    } else {
      videoRef.current.play()
    }
  }, [isPlaying])

  // FR-75: Seek video to a specific time (for transcript click-to-seek)
  const handleSeek = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time
    }
  }, [])

  // Get flat list of all segments for autoplay navigation
  const allSegments = useMemo(() => {
    return chapters.flatMap(ch => ch.files)
  }, [chapters])

  // Find and play the next segment
  // FR-88: Handle shadow files and include sourceFile for fallback
  const playNextSegment = useCallback(() => {
    if (!currentVideo || !projectCode || currentVideo.isChapter) return

    // Find current segment index
    const currentIndex = allSegments.findIndex(
      seg => currentVideo.url.includes(seg.filename) ||
             currentVideo.url.includes(seg.filename.replace(/\.mov$/i, '.mp4'))
    )

    if (currentIndex === -1 || currentIndex >= allSegments.length - 1) return

    // Play next segment
    const nextSegment = allSegments[currentIndex + 1]
    const isShadow = 'isShadow' in nextSegment && nextSegment.isShadow
    const shadowFolder = nextSegment.folder === 'safe' ? 'safe' : 'recordings'
    const url = getVideoUrl(projectCode, nextSegment.filename, 'recordings', {
      isShadow,
      shadowFolder,
    })
    const segmentName = nextSegment.filename.replace(/\.mov$/, '')
    setCurrentVideo({
      url,
      title: nextSegment.filename,
      segmentName,
      isShadow,
      sourceFile: nextSegment,  // FR-88: Include for fallback
    })

    // Auto-play the video
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.play()
      }
    }, 100)
  }, [currentVideo, projectCode, allSegments])

  // Play a specific recording (segment)
  // FR-83: Shadow files play from recording-shadows/ folder as .mp4
  // FR-88: Include source file for shadow fallback
  const playRecording = useCallback((file: RecordingFile) => {
    if (!projectCode) return
    const isShadow = 'isShadow' in file && file.isShadow
    const shadowFolder = file.folder === 'safe' ? 'safe' : 'recordings'
    const url = getVideoUrl(projectCode, file.filename, 'recordings', {
      isShadow,
      shadowFolder,
    })
    const segmentName = file.filename.replace(/\.mov$/, '')
    setCurrentVideo({
      url,
      title: file.filename,
      segmentName,
      isShadow,
      sourceFile: file,  // FR-88: Keep reference for fallback
    })
  }, [projectCode])

  // Play chapter recording (combined video from -chapters folder)
  const playChapterRecording = useCallback((chapter: ChapterGroup) => {
    if (!projectCode) return
    // Chapter recordings are named like: 01-intro.mov
    const chapterLabel = chapter.title || 'chapter'
    const chapterFilename = `${chapter.chapterKey}-${chapterLabel}.mov`
    const url = getVideoUrl(projectCode, chapterFilename, '-chapters')
    setCurrentVideo({
      url,
      title: `Chapter ${chapter.chapterKey}: ${formatChapterTitle(chapter.title)}`,
      isChapter: true,
      chapterKey: chapter.chapterKey,
      chapterLabel,  // FR-77: Store label for SRT filename
      chapterFiles: chapter.files,
    })
  }, [projectCode])

  // FR-88: Handle video load error with shadow fallback
  const handleVideoError = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    console.error('Video error:', e)

    // If we're already playing a shadow or no source file, nothing to fall back to
    if (!currentVideo || currentVideo.isShadow || !currentVideo.sourceFile) {
      console.log('[FR-88] No fallback available - already shadow or no source file')
      return
    }

    const file = currentVideo.sourceFile
    const hasShadow = 'hasShadow' in file && file.hasShadow

    if (hasShadow && projectCode) {
      console.log('[FR-88] Falling back to shadow video for:', file.filename)
      const shadowFolder = file.folder === 'safe' ? 'safe' : 'recordings'
      const shadowUrl = getVideoUrl(projectCode, file.filename, 'recordings', {
        isShadow: true,
        shadowFolder,
      })
      setCurrentVideo(prev => prev ? {
        ...prev,
        url: shadowUrl,
        isShadow: true,
      } : null)
    } else {
      console.log('[FR-88] No shadow available for fallback')
    }
  }, [currentVideo, projectCode])

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
      {/* FR-71: Size-responsive container */}
      <div className={SIZE_CLASSES[videoSize]}>
        {/* Full-width Video Player */}
        <div className="bg-black rounded-lg overflow-hidden relative" style={{ aspectRatio: '16/9' }}>
          {/* FR-83: Shadow indicator badge */}
          {currentVideo?.isShadow && (
            <div className="absolute top-3 left-3 z-10 bg-black/70 text-yellow-400 px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
              <span>👻</span>
              <span>240p Preview</span>
            </div>
          )}
          {currentVideo ? (
            <video
                ref={videoRef}
                src={currentVideo.url}
                controls
                className="w-full h-full object-contain"
                onLoadedMetadata={() => {
                  // FR-71: Apply saved playback speed when video loads
                  if (videoRef.current) {
                    videoRef.current.playbackRate = playbackSpeed
                    // Auto-start playback when autoplay is enabled
                    if (autoplay) {
                      videoRef.current.play()
                    }
                  }
                }}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                onError={handleVideoError}
                onEnded={() => {
                  setIsPlaying(false)
                  if (autonext) {
                    playNextSegment()
                  }
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

        {/* Now Playing Info + Controls Bar */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          {/* Left: Now Playing with Play/Stop control */}
          <div className="flex items-center gap-3">
            {currentVideo ? (
              <>
                <button
                  onClick={handlePlayPause}
                  className={`text-lg transition-colors ${
                    isPlaying
                      ? 'text-red-500 hover:text-red-600'
                      : 'text-blue-500 hover:text-blue-600'
                  }`}
                  title={isPlaying ? 'Stop playback' : 'Start playback'}
                >
                  {isPlaying ? '⏹' : '▶'}
                </button>
                <h3 className="font-medium text-gray-800">{currentVideo.title}</h3>
                {currentVideo.isChapter && (
                  <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                    Chapter Recording
                  </span>
                )}
                {currentVideo.isShadow && (
                  <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded flex items-center gap-1">
                    <span>👻</span> Shadow
                  </span>
                )}
              </>
            ) : (
              <span className="text-gray-400 text-sm">No video selected</span>
            )}
          </div>

          {/* Right: Speed + Size Controls */}
          <div className="flex items-center gap-6">
            {/* FR-71: Speed Control */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-medium">Speed:</span>
              <div className="flex gap-1">
                {SPEED_PRESETS.map((speed) => (
                  <button
                    key={speed}
                    onClick={() => handleSpeedChange(speed)}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      playbackSpeed === speed
                        ? 'bg-blue-600 text-white font-medium'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>

            {/* FR-71: Size Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-medium">Size:</span>
              <div className="flex gap-1">
                {(Object.keys(SIZE_LABELS) as VideoSize[]).map((size) => (
                  <button
                    key={size}
                    onClick={() => handleSizeChange(size)}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      videoSize === size
                        ? 'bg-blue-600 text-white font-medium'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {SIZE_LABELS[size]}
                  </button>
                ))}
              </div>
            </div>

            {/* Autoplay Toggle - starts playing on click */}
            <button
              onClick={handleAutoplayToggle}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                autoplay
                  ? 'bg-green-600 text-white font-medium'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title={autoplay ? 'Autoplay ON - videos start playing when clicked' : 'Autoplay OFF'}
            >
              Autoplay
            </button>

            {/* Auto-next Toggle - plays next segment when video ends */}
            <button
              onClick={handleAutonextToggle}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                autonext
                  ? 'bg-green-600 text-white font-medium'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title={autonext ? 'Auto-next ON - plays next segment when video ends' : 'Auto-next OFF'}
            >
              Auto Next
            </button>
          </div>
        </div>

        {/* FR-75/FR-77: Transcript Sync Panel (for both segment and chapter videos) */}
        {currentVideo && (
          <div className="mt-4">
            <TranscriptSyncPanel
              projectCode={projectCode}
              segmentName={currentVideo.isChapter ? null : (currentVideo.segmentName || null)}
              chapterName={currentVideo.isChapter ? `${currentVideo.chapterKey}-${currentVideo.chapterLabel}` : null}
              currentTime={currentTime}
              onSeek={handleSeek}
              isCollapsed={transcriptCollapsed}
              onToggleCollapse={() => setTranscriptCollapsed(!transcriptCollapsed)}
            />
          </div>
        )}
      </div>

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
                // FR-83: Recording status
                const isShadow = 'isShadow' in file && file.isShadow
                const hasShadow = 'hasShadow' in file && file.hasShadow

                // FR-88 DEBUG: Log shadow flags for each file
                console.log('[FR-88 DEBUG Segment]', file.filename, { isShadow, hasShadow, rawFile: file })

                // FR-83/FR-88: Status indicator - show both playing state AND shadow status
                // 📹 = Real | 👻 = Shadow only | 📹👻 = Real + Shadow
                // ▶ prefix = currently playing
                let statusIcon: string
                let statusTitle: string
                if (isShadow) {
                  statusIcon = isPlaying ? '▶ 👻' : '👻'
                  statusTitle = isPlaying ? 'Playing (shadow only)' : 'Shadow only (collaborator mode)'
                } else if (hasShadow) {
                  statusIcon = isPlaying ? '▶ 📹👻' : '📹👻'
                  statusTitle = isPlaying ? 'Playing (real + shadow)' : 'Real + Shadow'
                } else {
                  statusIcon = isPlaying ? '▶ 📹' : '📹'
                  statusTitle = isPlaying ? 'Playing (real only)' : 'Real recording (no shadow)'
                }

                return (
                  <button
                    key={file.path}
                    onClick={() => playRecording(file)}
                    className={`w-full text-left px-4 py-2 flex items-center gap-2 transition-colors ${
                      isPlaying
                        ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-500'
                        : isShadow
                          ? 'hover:bg-purple-50 text-purple-600 border-l-2 border-transparent'
                          : 'hover:bg-gray-50 text-gray-600 border-l-2 border-transparent'
                    }`}
                    title={statusTitle}
                  >
                    <span className={`text-xs ${isPlaying ? 'text-blue-500' : isShadow ? 'text-purple-400' : 'text-gray-400'}`}>
                      {statusIcon}
                    </span>
                    <span className={`flex-1 font-mono text-xs truncate ${
                      isPlaying ? 'font-medium' : ''
                    }`}>
                      {file.chapter}-{file.sequence}-{file.name}
                    </span>
                    {file.duration && (
                      <span className="font-mono text-xs text-gray-400">
                        {formatDuration(file.duration, 'smart')}
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
