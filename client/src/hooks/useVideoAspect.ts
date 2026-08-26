/**
 * FR-154: Track a video's intrinsic aspect ratio so the stage can size itself to the
 * source instead of assuming 16:9. Ecamm vertical recordings are true 1080x1920 files
 * (no rotation metadata), so a hardcoded landscape frame pillarboxes them badly.
 *
 * Used by VideoPlayerModal (Incoming / Recordings / Relay) and WatchPage.
 */

import { useState, useCallback } from 'react';

/** Landscape default — used until metadata arrives so the common case never flickers. */
export const DEFAULT_ASPECT = 16 / 9;

export interface UseVideoAspectReturn {
  /** width / height of the loaded video, or DEFAULT_ASPECT before metadata loads */
  aspect: number;
  isPortrait: boolean;
  /** Call from the <video> onLoadedMetadata handler */
  readAspect: (el: HTMLVideoElement | null) => void;
  /** Call when the source changes, so prev/next re-measures instead of inheriting */
  reset: () => void;
}

export function useVideoAspect(): UseVideoAspectReturn {
  const [aspect, setAspect] = useState<number>(DEFAULT_ASPECT);

  const readAspect = useCallback((el: HTMLVideoElement | null) => {
    if (!el) return;
    const { videoWidth, videoHeight } = el;
    // Audio-only or metadata not yet resolved — leave the default in place
    if (!videoWidth || !videoHeight) return;
    setAspect(videoWidth / videoHeight);
  }, []);

  const reset = useCallback(() => setAspect(DEFAULT_ASPECT), []);

  return { aspect, isPortrait: aspect < 1, readAspect, reset };
}
