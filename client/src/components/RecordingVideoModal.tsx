/**
 * FR-128: Recording Quick Preview Modal
 *
 * Thin wrapper around VideoPlayerModal for recordings.
 */

import { API_URL } from '../config';
import { useConfig, useProjectDictionary, useAddGlobalDictionaryWord, useAddProjectDictionaryWord } from '../hooks/useApi'; // B070
import { VideoPlayerModal } from './shared/VideoPlayerModal';

interface RecordingVideoModalProps {
  filename: string;
  duration?: number;
  size?: number;
  onClose: () => void;
  /** B069: Navigate to previous recording */
  onPrevious?: () => void;
  /** B069: Navigate to next recording */
  onNext?: () => void;
  /** B069: Current position in the list */
  position?: { current: number; total: number };
}

export function RecordingVideoModal({ filename, duration, size, onClose, onPrevious, onNext, position }: RecordingVideoModalProps) {
  const { data: config } = useConfig();
  const projectCode = config?.activeProject ?? null; // B070: null when no active project
  const videoUrl = `${API_URL}/api/video/recordings/${encodeURIComponent(filename)}`;

  // B070: Dictionary data
  const globalWords = config?.glingDictionary ?? [];
  const { data: projectWords = [] } = useProjectDictionary(projectCode);
  const addGlobalMutation = useAddGlobalDictionaryWord();
  const addProjectMutation = useAddProjectDictionaryWord(projectCode);

  // B070: Build dictionaryProps for VideoPlayerModal
  const dictionaryProps = {
    globalWords,
    projectWords,
    projectCode,
    onAddGlobal: async (word: string): Promise<void> => {
      await addGlobalMutation.mutateAsync([...globalWords, word]);
    },
    onAddProject: async (word: string): Promise<void> => {
      await addProjectMutation.mutateAsync([...projectWords, word]);
    },
  };

  return (
    <VideoPlayerModal
      title={filename}
      videoUrl={videoUrl}
      onClose={onClose}
      duration={duration}
      size={size}
      projectCode={projectCode ?? ''}
      recordingName={filename}
      showTranscript={true}
      onPrevious={onPrevious}
      onNext={onNext}
      position={position}
      dictionaryProps={dictionaryProps} // B070
    />
  );
}
