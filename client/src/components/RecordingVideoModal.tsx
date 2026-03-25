/**
 * FR-128: Recording Quick Preview Modal
 *
 * Thin wrapper around VideoPlayerModal for recordings.
 */

import { API_URL } from '../config';
import { VideoPlayerModal } from './shared/VideoPlayerModal';

interface RecordingVideoModalProps {
  filename: string;
  duration?: number;
  size?: number;
  onClose: () => void;
}

export function RecordingVideoModal({ filename, duration, size, onClose }: RecordingVideoModalProps) {
  const videoUrl = `${API_URL}/api/video/recordings/${encodeURIComponent(filename)}`;

  return (
    <VideoPlayerModal
      title={filename}
      videoUrl={videoUrl}
      onClose={onClose}
      duration={duration}
      size={size}
    />
  );
}
