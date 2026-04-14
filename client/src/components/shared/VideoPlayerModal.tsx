/**
 * Shared video player modal — used by IncomingVideoModal, RecordingVideoModal, and Relay previews.
 * Owns the modal shell (backdrop, header, video element, controls bar).
 * Optionally shows synchronized transcript highlighting when transcript props are provided.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useVideoPlayback } from '../../hooks/useVideoPlayback';
import { VideoControlsBar } from './VideoControlsBar';
import { formatDuration, formatFileSize } from '../../utils/formatting';
import { TranscriptSyncPanel } from '../TranscriptSyncPanel';
import { parseRecordingFilename } from '../../../../shared/naming';
import { DictionaryQuickAdd, type DictionaryQuickAddProps } from './DictionaryQuickAdd'; // B070

// B069: localStorage keys for modal-specific preferences (must NOT use flihub:watch:* prefix)
const MODAL_VIDEO_SIZE_KEY = 'flihub:modal:videoSize';
const MODAL_AUTOPLAY_KEY = 'flihub:modal:autoplay';
const MODAL_AUTONEXT_KEY = 'flihub:modal:autonext';

type VideoSize = 'N' | 'L';

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
  /** B069: Navigate to previous item */
  onPrevious?: () => void;
  /** B069: Navigate to next item */
  onNext?: () => void;
  /** B069: Current position in the list */
  position?: { current: number; total: number };
  /** B070: When provided, renders DictionaryQuickAdd in the controls bar after speed buttons */
  dictionaryProps?: DictionaryQuickAddProps;
}

export function VideoPlayerModal({ title, videoUrl, onClose, duration, size, projectCode, recordingName, showTranscript = false, srtUrl, onPrevious, onNext, position, dictionaryProps }: VideoPlayerModalProps) {
  // B069: Persisted size preference
  const [videoSize, setVideoSize] = useState<VideoSize>(() => {
    const saved = localStorage.getItem(MODAL_VIDEO_SIZE_KEY);
    return (saved === 'N' || saved === 'L') ? saved : 'N';
  });

  // B069: Persisted autoplay preference
  const [autoplay, setAutoplay] = useState<boolean>(() => {
    return localStorage.getItem(MODAL_AUTOPLAY_KEY) === 'true';
  });

  // B069: Persisted auto-next preference
  const [autoNext, setAutoNext] = useState<boolean>(() => {
    return localStorage.getItem(MODAL_AUTONEXT_KEY) === 'true';
  });

  // B069: Autoplay — fire programmatically when videoUrl changes (HTML autoPlay attr only fires on mount)
  useEffect(() => {
    if (autoplay && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [videoUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // B069: Stable ref for onNext to avoid stale closure in onEnded handler
  const onNextRef = useRef(onNext);
  onNextRef.current = onNext;
  const autoNextRef = useRef(autoNext);
  autoNextRef.current = autoNext;

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

  // B069: Auto-next — call onNext when video ends if auto-next is enabled
  const handleEnded = useCallback(() => {
    videoEventHandlers.onEnded();
    if (autoNextRef.current && onNextRef.current) {
      onNextRef.current();
    }
  }, [videoEventHandlers]);

  // B069: Keyboard left/right for prev/next navigation
  useEffect(() => {
    if (!onPrevious && !onNext) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'ArrowLeft' && onPrevious) {
        e.preventDefault();
        if (!position || position.current > 1) {
          onPrevious();
        }
      } else if (e.key === 'ArrowRight' && onNext) {
        e.preventDefault();
        if (!position || position.current < position.total) {
          onNext();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onPrevious, onNext, position]);

  // B069: Toggle helpers with localStorage persistence
  const toggleAutoplay = useCallback(() => {
    setAutoplay((prev) => {
      const next = !prev;
      localStorage.setItem(MODAL_AUTOPLAY_KEY, String(next));
      return next;
    });
  }, []);

  const toggleAutoNext = useCallback(() => {
    setAutoNext((prev) => {
      const next = !prev;
      localStorage.setItem(MODAL_AUTONEXT_KEY, String(next));
      return next;
    });
  }, []);

  const handleSizeChange = useCallback((s: VideoSize) => {
    setVideoSize(s);
    localStorage.setItem(MODAL_VIDEO_SIZE_KEY, s);
  }, []);

  const showTranscriptPanel = showTranscript && (!!srtUrl || (!!projectCode && !!segmentName));

  // B069: Max width based on size toggle
  const containerMaxWidth = videoSize === 'L' ? 'max-w-6xl' : 'max-w-4xl';

  // B069: Determine nav button disabled states
  const prevDisabled = !onPrevious || (!!position && position.current === 1);
  const nextDisabled = !onNext || (!!position && position.current === position.total);

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className={`bg-surface rounded-lg w-full ${containerMaxWidth} max-h-[90vh] flex flex-col mx-4 overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-surface-muted">
          <h3 className="font-medium text-warm-primary truncate pr-4" title={title}>
            {/* B069: Position counter next to filename when nav props provided */}
            {position && (
              <span className="text-warm-secondary text-sm font-normal mr-2">
                ({position.current}/{position.total})
              </span>
            )}
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
            autoPlay={autoplay}
            className="w-full h-full object-contain"
            {...videoEventHandlers}
            onEnded={handleEnded}
            onTimeUpdate={showTranscriptPanel ? (e) => setCurrentTime((e.target as HTMLVideoElement).currentTime) : undefined}
          />
        </div>

        {/* Controls Bar — VideoControlsBar shared component (same as Watch page) */}
        <div className="border-t bg-surface-muted">
          <VideoControlsBar
            isPlaying={isPlaying}
            onPlayPause={handlePlayPause}
            playbackSpeed={playbackSpeed}
            onSpeedChange={handleSpeedChange}
            videoSize={videoSize}
            onSizeChange={handleSizeChange}
            autoplay={autoplay}
            onToggleAutoplay={toggleAutoplay}
            autoNext={autoNext}
            onToggleAutoNext={toggleAutoNext}
            onPrevious={onPrevious}
            onNext={onNext}
            prevDisabled={prevDisabled}
            nextDisabled={nextDisabled}
            infoSlot={
              <>
                {duration != null && (
                  <span className="font-mono text-sm text-warm-secondary ml-2">{formatDuration(duration)}</span>
                )}
                {size != null && (
                  <>
                    <span className="text-warm-muted text-sm">|</span>
                    <span className="text-sm text-warm-secondary">{formatFileSize(size)}</span>
                  </>
                )}
              </>
            }
          />
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

        {/* Dictionary — below transcript so word-add doesn't interrupt playback review */}
        {dictionaryProps && (
          <div className="flex items-center gap-2 px-4 py-2 border-t border-warm bg-surface-muted">
            <span className="text-xs text-warm-muted shrink-0 font-medium">Dictionary:</span>
            <DictionaryQuickAdd {...dictionaryProps} />
          </div>
        )}
      </div>
    </div>
  );
}
