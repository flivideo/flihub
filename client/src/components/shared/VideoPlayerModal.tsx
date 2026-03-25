/**
 * Shared video player modal — used by IncomingVideoModal, RecordingVideoModal, and Relay previews.
 * Owns the modal shell (backdrop, header, video element, controls bar).
 * Optionally shows synchronized transcript highlighting when transcript props are provided.
 */

import { useState, useCallback } from 'react';
import { useVideoPlayback, SPEED_PRESETS } from '../../hooks/useVideoPlayback';
import { formatDuration, formatFileSize } from '../../utils/formatting';
import { TranscriptSyncPanel } from '../TranscriptSyncPanel';
import { parseRecordingFilename } from '../../../../shared/naming';

export interface VideoPlayerModalProps {
  title: string;
  videoUrl: string;
  onClose: () => void;
  duration?: number | null;
  size?: number | null;
  /** Optional: project code for transcript lookup */
  projectCode?: string;
  /** Optional: recording filename to derive segment name for transcript */
  recordingName?: string | null;
  /** Optional: show transcript sync panel (default false) */
  showTranscript?: boolean;
  /** Optional: direct URL to an SRT file — bypasses segment API lookup */
  srtUrl?: string | null;
}

export function VideoPlayerModal({ title, videoUrl, onClose, duration, size, projectCode, recordingName, showTranscript = false, srtUrl }: VideoPlayerModalProps) {
  const {
    videoRef,
    isPlaying,
    playbackSpeed,
    handlePlayPause,
    handleSpeedChange,
    videoEventHandlers,
  } = useVideoPlayback({ onEscape: onClose });

  const [currentTime, setCurrentTime] = useState(0);
  const [transcriptCollapsed, setTranscriptCollapsed] = useState(false);

  // Derive segmentName from recordingName
  const segmentName = (() => {
    if (!recordingName) return null;
    const parsed = parseRecordingFilename(recordingName);
    if (!parsed) return null;
    return `${parsed.chapter}-${parsed.sequence}-${parsed.name}`;
  })();

  const handleSeek = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  }, [videoRef]);

  const showTranscriptPanel = showTranscript && (!!srtUrl || (!!projectCode && !!segmentName));

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-surface-muted">
          <h3 className="font-medium text-warm-primary truncate pr-4" title={title}>
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-warm-muted hover:text-warm-secondary hover:bg-surface-hover rounded transition-colors"
            title="Close (Escape)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
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
            {...videoEventHandlers}
            onTimeUpdate={showTranscriptPanel ? (e) => setCurrentTime((e.target as HTMLVideoElement).currentTime) : undefined}
          />
        </div>

        {/* Controls Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-t bg-surface-muted">
          {/* Left: Play/Pause + Info */}
          <div className="flex items-center gap-4">
            <button
              onClick={handlePlayPause}
              className={`text-lg transition-colors ${
                isPlaying ? 'text-red-500 hover:text-red-600' : 'text-blue-500 hover:text-blue-600'
              }`}
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying ? '\u23F9' : '\u25B6'}
            </button>
            {duration != null && (
              <>
                <span className="font-mono text-sm text-warm-secondary">{formatDuration(duration)}</span>
                <span className="text-sm text-warm-muted">|</span>
              </>
            )}
            {size != null && (
              <span className="text-sm text-warm-secondary">{formatFileSize(size)}</span>
            )}
          </div>

          {/* Right: Speed Controls */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-warm-muted font-medium">Speed:</span>
            <div className="flex gap-1">
              {SPEED_PRESETS.map((speed) => (
                <button
                  key={speed}
                  onClick={() => handleSpeedChange(speed)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    playbackSpeed === speed
                      ? 'bg-blue-600 text-white font-medium'
                      : 'bg-surface-muted text-warm-secondary hover:bg-surface-hover'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Transcript Sync Panel */}
        {showTranscriptPanel && (
          <TranscriptSyncPanel
            projectCode={projectCode || ''}
            segmentName={segmentName}
            srtUrl={srtUrl}
            currentTime={currentTime}
            onSeek={handleSeek}
            isCollapsed={transcriptCollapsed}
            onToggleCollapse={() => setTranscriptCollapsed((prev) => !prev)}
          />
        )}
      </div>
    </div>
  );
}
