/**
 * FR-106: Incoming Video Preview Modal
 *
 * Modal video player for previewing incoming files before rename/discard.
 * Reuses video player patterns from WatchPage.
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { API_URL } from '../config'
import { formatDuration, formatFileSize } from '../utils/formatting'
import type { FileInfo } from '../../../shared/types'

// Speed presets (shared with WatchPage)
const SPEED_PRESETS = [1, 1.5, 2, 2.5, 3]
const DEFAULT_SPEED = 2

// localStorage key (shared with WatchPage for consistency)
const SPEED_STORAGE_KEY = 'flihub:watch:playbackSpeed'

interface IncomingVideoModalProps {
  file: FileInfo
  onClose: () => void
}

export function IncomingVideoModal({ file, onClose }: IncomingVideoModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(() => {
    const saved = localStorage.getItem(SPEED_STORAGE_KEY)
    return saved ? parseFloat(saved) : DEFAULT_SPEED
  })

  // Build video URL
  const videoUrl = `${API_URL}/api/video/incoming/${encodeURIComponent(file.filename)}`

  // Apply playback speed
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed
    }
  }, [playbackSpeed])

  // Handle speed change
  const handleSpeedChange = useCallback((speed: number) => {
    setPlaybackSpeed(speed)
    localStorage.setItem(SPEED_STORAGE_KEY, speed.toString())
    if (videoRef.current) {
      videoRef.current.playbackRate = speed
    }
  }, [])

  // Handle play/pause toggle
  const handlePlayPause = useCallback(() => {
    if (!videoRef.current) return
    if (isPlaying) {
      videoRef.current.pause()
    } else {
      videoRef.current.play()
    }
  }, [isPlaying])

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
          <h3 className="font-medium text-gray-800 truncate pr-4" title={file.filename}>
            {file.filename}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
            title="Close (Escape)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Video Player */}
        <div className="bg-black" style={{ aspectRatio: '16/9' }}>
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            autoPlay
            className="w-full h-full object-contain"
            onLoadedMetadata={() => {
              if (videoRef.current) {
                videoRef.current.playbackRate = playbackSpeed
              }
            }}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
          />
        </div>

        {/* Controls Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
          {/* Left: Play/Pause + Info */}
          <div className="flex items-center gap-4">
            <button
              onClick={handlePlayPause}
              className={`text-lg transition-colors ${
                isPlaying
                  ? 'text-red-500 hover:text-red-600'
                  : 'text-blue-500 hover:text-blue-600'
              }`}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? '⏹' : '▶'}
            </button>
            <span className="font-mono text-sm text-gray-600">
              {formatDuration(file.duration)}
            </span>
            <span className="text-sm text-gray-400">|</span>
            <span className="text-sm text-gray-600">
              {formatFileSize(file.size)}
            </span>
          </div>

          {/* Right: Speed Controls */}
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
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
