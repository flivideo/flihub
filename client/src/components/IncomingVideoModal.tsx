/**
 * FR-106: Incoming Video Preview Modal
 *
 * Thin wrapper around VideoPlayerModal for incoming files.
 */

import { API_URL } from '../config';
import { VideoPlayerModal } from './shared/VideoPlayerModal';
import { useConfig, useProjectDictionary, useAddGlobalDictionaryWord, useAddProjectDictionaryWord } from '../hooks/useApi'; // B070
import type { FileInfo } from '../../../shared/types';

interface IncomingVideoModalProps {
  file: FileInfo;
  onClose: () => void;
}

export function IncomingVideoModal({ file, onClose }: IncomingVideoModalProps) {
  const videoUrl = `${API_URL}/api/video/incoming/${encodeURIComponent(file.filename)}`;

  // B070: Dictionary data
  const { data: config } = useConfig();
  const projectCode = config?.activeProject ?? null;
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
      title={file.filename}
      videoUrl={videoUrl}
      onClose={onClose}
      duration={file.duration}
      size={file.size}
      dictionaryProps={dictionaryProps} // B070
    />
  );
}
