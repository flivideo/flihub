/**
 * FR-106: Incoming Video Preview Modal
 *
 * Thin wrapper around VideoPlayerModal for incoming files.
 */

import { API_URL } from '../config';
import { VideoPlayerModal } from './shared/VideoPlayerModal';
import type { FileInfo } from '../../../shared/types';

interface IncomingVideoModalProps {
  file: FileInfo;
  onClose: () => void;
}

export function IncomingVideoModal({ file, onClose }: IncomingVideoModalProps) {
  const videoUrl = `${API_URL}/api/video/incoming/${encodeURIComponent(file.filename)}`;

  return (
    <VideoPlayerModal
      title={file.filename}
      videoUrl={videoUrl}
      onClose={onClose}
      duration={file.duration}
      size={file.size}
    />
  );
}
