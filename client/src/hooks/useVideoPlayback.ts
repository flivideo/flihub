/**
 * Shared video playback hook — centralizes speed, play/pause, and keyboard controls.
 * Used by VideoPlayerModal (which powers IncomingVideoModal, RecordingVideoModal, and Relay FileDrawer).
 * WatchPage imports the exported constants but manages its own playback state.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { FORWARD_SPEEDS, jkl, type JklKey } from '@flivideo/core/contracts';

// Canonical speed ladder (fli-core's, shared by every Fli player) and storage.
// The default stays 2x: it is FliHub's viewing habit (per-app config, not part of the control).
export const SPEED_PRESETS: readonly number[] = FORWARD_SPEEDS;
export const DEFAULT_SPEED = 2;
export const SPEED_STORAGE_KEY = 'flihub:watch:playbackSpeed';

/** J / K / L as fli-core rules them (`jkl()`): the new rate, and whether the key means "be playing". */
export function jklPlayback(playing: boolean, rate: number, key: JklKey): { playing: boolean; rate: number } {
  return jkl({ playing, rate }, key);
}

export interface UseVideoPlaybackOptions {
  /** Called when Escape is pressed (e.g., close a modal) */
  onEscape?: () => void;
  /** Enable Space-to-pause keyboard shortcut (default: true) */
  keyboardControls?: boolean;
}

export interface UseVideoPlaybackReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isPlaying: boolean;
  playbackSpeed: number;
  handlePlayPause: () => void;
  handleSpeedChange: (speed: number) => void;
  /** Attach these to the <video> element */
  videoEventHandlers: {
    onLoadedMetadata: () => void;
    onPlay: () => void;
    onPause: () => void;
    onEnded: () => void;
  };
}

export function useVideoPlayback(options: UseVideoPlaybackOptions = {}): UseVideoPlaybackReturn {
  const { onEscape, keyboardControls = true } = options;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(() => {
    const saved = localStorage.getItem(SPEED_STORAGE_KEY);
    return saved ? (parseFloat(saved) || DEFAULT_SPEED) : DEFAULT_SPEED;
  });

  // Stable refs to avoid re-registering listener
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;
  const handlePlayPauseRef = useRef(() => {});
  const speedRef = useRef(playbackSpeed);
  const playingRef = useRef(isPlaying);

  const handleSpeedChange = useCallback((speed: number) => {
    setPlaybackSpeed(speed);
    localStorage.setItem(SPEED_STORAGE_KEY, speed.toString());
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  }, []);

  const handleSpeedChangeRef = useRef(handleSpeedChange);

  const handlePlayPause = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
    } else {
      videoRef.current.pause();
    }
  }, []);
  handlePlayPauseRef.current = handlePlayPause;

  // Keep the key handler's view of speed / playing fresh without re-registering the listener
  useEffect(() => {
    speedRef.current = playbackSpeed;
    playingRef.current = isPlaying;
    handleSpeedChangeRef.current = handleSpeedChange;
  });

  // Keyboard controls: Space to pause/resume, Escape to close, J / K / L for speed (fli-core jkl())
  useEffect(() => {
    if (!keyboardControls) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip when typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        handlePlayPauseRef.current();
      } else if (
        !e.metaKey && !e.ctrlKey && !e.altKey &&
        (e.key === 'j' || e.key === 'k' || e.key === 'l' || e.key === 'J' || e.key === 'K' || e.key === 'L')
      ) {
        const next = jklPlayback(playingRef.current, speedRef.current, e.key.toUpperCase() as JklKey);
        handleSpeedChangeRef.current(next.rate);
        const v = videoRef.current;
        if (v && next.playing && v.paused) void v.play();
      } else if (e.key === 'Escape' && onEscapeRef.current) {
        onEscapeRef.current();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [keyboardControls]);

  const videoEventHandlers = {
    onLoadedMetadata: () => {
      if (videoRef.current) {
        videoRef.current.playbackRate = playbackSpeed;
      }
    },
    onPlay: () => setIsPlaying(true),
    onPause: () => setIsPlaying(false),
    onEnded: () => setIsPlaying(false),
  };

  return {
    videoRef,
    isPlaying,
    playbackSpeed,
    handlePlayPause,
    handleSpeedChange,
    videoEventHandlers,
  };
}
