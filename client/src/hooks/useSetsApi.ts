// Recording sets (fli-core v0.38.0): the strip, "All sets" overview, active set and New set.
// Switching the active set changes what every take-listing query returns, so it refetches all of them.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from './useApi';
import { useConfig } from './useConfigApi';
import type {
  RecordingSetChangeResponse,
  RecordingSetRole,
  RecordingSetsResponse,
} from '../../../shared/types';

export const SETS_QUERY_KEY = ['recording-sets'] as const;

export function useRecordingSets() {
  // Keyed by project, so switching project never shows the last project's sets.
  const project = useConfig().data?.projectDirectory ?? '';
  return useQuery({
    queryKey: [...SETS_QUERY_KEY, project],
    queryFn: () => fetchApi<RecordingSetsResponse>('/api/sets'),
  });
}

/** The active set id, or null for a project without sets. */
export function useActiveSet(): string | null {
  return useRecordingSets().data?.active ?? null;
}

/** `?set=<id>` for a video URL, so two sets' same-named takes never share a cached URL. */
export function setQuery(active: string | null): string {
  return active ? `?set=${encodeURIComponent(active)}` : '';
}

export function useSetActiveSet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (set: string) =>
      fetchApi<RecordingSetChangeResponse>('/api/sets/active', {
        method: 'POST',
        body: JSON.stringify({ set }),
      }),
    // Every list (recordings, transcripts, naming, watch, chapters…) is now another set's.
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

export function useCreateSet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { id: string; title?: string; role?: RecordingSetRole }) =>
      fetchApi<RecordingSetChangeResponse>('/api/sets', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SETS_QUERY_KEY }),
  });
}
