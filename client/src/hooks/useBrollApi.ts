// FR-161: b-roll lane — list and delete. Promote goes through the existing useRename
// with destination: 'b-roll'.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from './useApi';

export interface BrollFile {
  filename: string;
  size: number;
  timestamp: string;
}

export const BROLL_QUERY_KEY = ['broll'] as const;

export function useBrollList() {
  return useQuery({
    queryKey: BROLL_QUERY_KEY,
    queryFn: () => fetchApi<{ success: boolean; files: BrollFile[] }>('/api/broll'),
  });
}

export function useDeleteBroll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (filename: string) =>
      fetchApi<{ success: boolean; error?: string }>(`/api/broll/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BROLL_QUERY_KEY });
    },
  });
}
