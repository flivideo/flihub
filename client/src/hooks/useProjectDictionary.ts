// B070: React Query hook for project state dictionary
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from './useApi';
import { QUERY_KEYS } from '../constants/queryKeys';

/**
 * B070: Fetch the project-specific Gling dictionary from state.
 * Disabled when projectCode is null (no active project).
 */
export function useProjectDictionary(projectCode: string | null) {
  return useQuery({
    queryKey: ['project-dictionary', projectCode],
    enabled: projectCode !== null,
    queryFn: async () => {
      const data = await fetchApi<{ state?: { glingDictionary?: string[] } }>(
        `/api/projects/${projectCode}/state`
      );
      return (data.state?.glingDictionary ?? []) as string[];
    },
  });
}

/**
 * B070: Add a word to the global Gling dictionary.
 * Posts the full updated array to /api/config (replaces, not appends).
 * Caller is responsible for passing existing words + new word.
 */
export function useAddGlobalDictionaryWord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (words: string[]) =>
      fetchApi('/api/config', {
        method: 'POST',
        body: JSON.stringify({ glingDictionary: words }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.config });
    },
  });
}

/**
 * B070: Add a word to the project-specific Gling dictionary.
 * PATCHes the full updated array to /api/projects/:code/state/dictionary.
 * Caller is responsible for passing existing words + new word.
 */
export function useAddProjectDictionaryWord(projectCode: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (words: string[]) => {
      if (!projectCode) throw new Error('No active project');
      return fetchApi(`/api/projects/${projectCode}/state/dictionary`, {
        method: 'PATCH',
        body: JSON.stringify({ words }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-dictionary', projectCode] });
    },
  });
}
