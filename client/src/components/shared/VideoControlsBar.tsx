/**
 * VideoControlsBar — single source of truth for video playback controls.
 * Used by both WatchPage and VideoPlayerModal so they render identically.
 *
 * Layout: flex-wrap row — nav/info on left, speed/size/toggles on right.
 * Optional props render extra buttons (Watch: Park, Safe, Parked) or an
 * extra row (modal: Dictionary). Absent props render nothing.
 */

import { SPEED_PRESETS } from '../../hooks/useVideoPlayback';
import { SpeedControl } from './SpeedControl';
import { PlayPauseButton } from './PlayPauseButton';
import { SizeToggle } from './SizeToggle';

const VIDEO_SIZES = ['N', 'L'] as const;
type VideoSize = typeof VIDEO_SIZES[number];

export interface VideoControlsBarProps {
  // Playback
  isPlaying: boolean;
  onPlayPause: () => void;
  playbackSpeed: number;
  onSpeedChange: (speed: number) => void;

  // Size
  videoSize: VideoSize;
  onSizeChange: (size: VideoSize) => void;

  // Autoplay / Auto Next
  autoplay: boolean;
  onToggleAutoplay: () => void;
  autoNext: boolean;
  onToggleAutoNext: () => void;

  // Navigation — absent = no ← → buttons rendered
  onPrevious?: () => void;
  onNext?: () => void;
  prevDisabled?: boolean;
  nextDisabled?: boolean;

  // Info slot rendered after ← → (filename+counter on Watch, duration+filesize on modal)
  infoSlot?: React.ReactNode;

  // Watch-only: Park button in nav row
  onPark?: () => void;
  isParkActive?: boolean;

  // Watch-only: filter toggles in controls row
  onShowSafe?: () => void;
  showSafe?: boolean;
  onShowParked?: () => void;
  showParked?: boolean;

}

export function VideoControlsBar({
  isPlaying,
  onPlayPause,
  playbackSpeed,
  onSpeedChange,
  videoSize,
  onSizeChange,
  autoplay,
  onToggleAutoplay,
  autoNext,
  onToggleAutoNext,
  onPrevious,
  onNext,
  prevDisabled = false,
  nextDisabled = false,
  infoSlot,
  onPark,
  isParkActive = false,
  onShowSafe,
  showSafe = false,
  onShowParked,
  showParked = false,
}: VideoControlsBarProps) {
  return (
    <>
      {/* Main controls row: nav/info left, speed/size/toggles right */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2">
        {/* Left: navigation + park + info slot */}
        <div className="flex items-center gap-2">
          {(onPrevious || onNext) && (
            <button
              onClick={onPrevious}
              disabled={prevDisabled}
              className={`px-2 py-1 text-lg transition-colors ${
                prevDisabled
                  ? 'text-warm-faint cursor-not-allowed'
                  : 'text-warm-secondary hover:text-warm-primary'
              }`}
              title="Previous (←)"
            >
              ←
            </button>
          )}

          <PlayPauseButton isPlaying={isPlaying} onClick={onPlayPause} />

          {(onPrevious || onNext) && (
            <button
              onClick={onNext}
              disabled={nextDisabled}
              className={`px-2 py-1 text-lg transition-colors ${
                nextDisabled
                  ? 'text-warm-faint cursor-not-allowed'
                  : 'text-warm-secondary hover:text-warm-primary'
              }`}
              title="Next (→)"
            >
              →
            </button>
          )}

          {onPark && (
            <button
              onClick={onPark}
              className={`px-3 py-1 text-xs rounded font-medium transition-colors ml-2 ${
                isParkActive
                  ? 'bg-pink-600 text-white hover:bg-pink-700'
                  : 'bg-surface-muted text-warm-secondary hover:bg-surface-hover'
              }`}
              title={isParkActive ? 'Click to unpark' : 'Click to park (exclude from edit)'}
            >
              {isParkActive ? '← Unpark' : 'Park →'}
            </button>
          )}

          {infoSlot}
        </div>

        {/* Right: speed + size + toggles */}
        <div className="flex items-center gap-6 flex-wrap">
          <SpeedControl presets={SPEED_PRESETS} value={playbackSpeed} onChange={onSpeedChange} />

          <div className="flex items-center gap-2">
            <span className="text-xs text-warm-muted font-medium">Size:</span>
            <SizeToggle sizes={VIDEO_SIZES} value={videoSize} onChange={onSizeChange} />
          </div>

          <button
            onClick={onToggleAutoplay}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              autoplay
                ? 'bg-green-600 text-white font-medium'
                : 'bg-surface-muted text-warm-secondary hover:bg-surface-hover'
            }`}
            title={autoplay ? 'Autoplay on' : 'Autoplay off'}
          >
            Autoplay
          </button>

          <button
            onClick={onToggleAutoNext}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              autoNext
                ? 'bg-green-600 text-white font-medium'
                : 'bg-surface-muted text-warm-secondary hover:bg-surface-hover'
            }`}
            title={autoNext ? 'Auto Next on' : 'Auto Next off'}
          >
            Auto Next
          </button>

          {onShowSafe !== undefined && (
            <button
              onClick={onShowSafe}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                showSafe
                  ? 'bg-yellow-500 text-white font-medium'
                  : 'bg-surface-muted text-warm-secondary hover:bg-surface-hover'
              }`}
              title={showSafe ? 'Showing safe recordings' : 'Safe recordings hidden'}
            >
              Safe
            </button>
          )}

          {onShowParked !== undefined && (
            <button
              onClick={onShowParked}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                showParked
                  ? 'bg-pink-500 text-white font-medium'
                  : 'bg-surface-muted text-warm-secondary hover:bg-surface-hover'
              }`}
              title={showParked ? 'Showing parked recordings' : 'Parked recordings hidden'}
            >
              Parked
            </button>
          )}
        </div>
      </div>
    </>
  );
}
