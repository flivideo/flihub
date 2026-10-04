// B070: React Query hook for project state dictionary
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from './useApi';
import { QUERY_KEYS } from '../constants/queryKeys';

/**
 * B070: Fetch the project-specific dictionary: the legacy Gling list in `.flihub-state.json` plus the names in the
 * project's `fli.words.json` ("remember for this video", fli-core v0.14.0). Project level only — never brand or global.
 * Disabled when projectCode is null (no active project).
 */
export function useProjectDictionary(projectCode: string | null) {
  return useQuery({
    queryKey: ['project-dictionary', projectCode],
    enabled: projectCode !== null,
    queryFn: async () => {
      const [state, words] = await Promise.all([
        fetchApi<{ state?: { glingDictionary?: string[] } }>(`/api/projects/${projectCode}/state`),
        fetchApi<{ words?: { names?: Array<{ term: string }> } | null }>(
          `/api/projects/${projectCode}/words`
        ),
      ]);
      const all = [
        ...(state.state?.glingDictionary ?? []),
        ...(words.words?.names ?? []).map((n) => n.term),
      ];
      return [...new Set(all)];
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
 * Remember a word for this video: adds it as a name to the project's `fli.words.json` through fli-core's one write
 * path (the same rules as FliStudio's words.add, and it works with FliStudio down).
 */
export function useAddProjectDictionaryWord(projectCode: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (word: string) => {
      if (!projectCode) throw new Error('No active project');
      return fetchApi(`/api/projects/${projectCode}/words`, {
        method: 'POST',
        body: JSON.stringify({ entry: { kind: 'name', term: word } }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-dictionary', projectCode] });
    },
  });
}
