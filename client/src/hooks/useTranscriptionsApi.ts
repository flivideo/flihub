import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { QueueAllResponse } from '../../../shared/types';
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

