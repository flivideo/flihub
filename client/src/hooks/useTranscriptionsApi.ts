import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  QueueAllResponse,
  ChapterRecordingConfig,
  ChapterRecordingRequest,
  ChapterRecordingResponse,
  ChapterRecordingStatusResponse,
} from '../../../shared/types';
import { QUERY_KEYS } from '../constants/queryKeys';
import { fetchApi } from './useApi';

// FR-30 Enhancement: Queue all untranscribed videos (NFR-66: using shared QueueAllResponse type)
export function useTranscribeAll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ scope, chapter }: { scope: 'project' | 'chapter'; chapter?: string }) =>
      fetchApi<QueueAllResponse>('/api/transcriptions/queue-all', {
        method: 'POST',
        body: JSON.stringify({ scope, chapter }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.transcriptions });
      // FR-92: Refresh pending count after transcription queue changes
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.pendingTranscriptionCount });
    },
  });
}

// FR-92: Get count of files pending transcription
export function usePendingTranscriptionCount() {
  return useQuery({
    queryKey: QUERY_KEYS.pendingTranscriptionCount,
    queryFn: () =>
      fetchApi<{ pendingCount: number; totalCount: number }>('/api/transcriptions/pending-count'),
  });
}

// FR-48: Queue transcription for a specific video
export function useQueueTranscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (videoPath: string) =>
      fetchApi<{ success: boolean; job: unknown }>('/api/transcriptions/queue', {
        method: 'POST',
        body: JSON.stringify({ videoPath }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.transcriptions });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects });
    },
  });
}

// FR-48: Delete orphaned transcript
// Accepts optional projectCode to delete from a specific project (for Projects panel use)
export function useDeleteTranscript() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ filename, projectCode }: { filename: string; projectCode?: string }) => {
      const url = projectCode
        ? `/api/transcriptions/transcript/${encodeURIComponent(filename)}?project=${encodeURIComponent(projectCode)}`
        : `/api/transcriptions/transcript/${encodeURIComponent(filename)}`;
      return fetchApi<{ success: boolean; filename: string; deleted: boolean }>(url, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects });
    },
  });
}

// FR-58: Get chapter recording configuration (NFR-66: using shared ChapterRecordingStatusResponse type)
export function useChapterRecordingConfig() {
  return useQuery({
    queryKey: QUERY_KEYS.chapterRecordingConfig,
    queryFn: () =>
      fetchApi<{ success: boolean; config: ChapterRecordingConfig }>('/api/chapters/config'),
    staleTime: 0, // FR-76: Always consider stale so defaults sync from Config page
    refetchOnMount: 'always', // FR-76: Force refetch when modal opens to get latest defaults
  });
}

// FR-58: Update chapter recording configuration
export function useUpdateChapterRecordingConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (config: Partial<ChapterRecordingConfig>) =>
      fetchApi<{ success: boolean }>('/api/chapters/config', {
        method: 'PUT',
        body: JSON.stringify(config),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.chapterRecordingConfig });
    },
  });
}

// FR-58: Get chapter recording status (chapters available, existing recordings)
export function useChapterRecordingStatus() {
  return useQuery({
    queryKey: QUERY_KEYS.chapterRecordingStatus,
    queryFn: () => fetchApi<ChapterRecordingStatusResponse>('/api/chapters/status'),
    refetchInterval: 5000, // Poll during generation
  });
}

// FR-58: Generate chapter recordings
export function useGenerateChapterRecordings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ChapterRecordingRequest) =>
      fetchApi<ChapterRecordingResponse>('/api/chapters/generate', {
        method: 'POST',
        body: JSON.stringify(request),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.chapterRecordingStatus });
    },
  });
}

