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

// FR-177: the purple B-roll button registers the take with B-Roll Pilot (FliStudio broll.register).
export interface BrollRegisterRequest {
  path: string;
  name?: string;
  tags: string[];
}
export interface BrollRegisterResponse {
  success: boolean;
  created: boolean;
  placed: string | null;
  assetFile: string | null;
  warnings: string[];
  originalTrashedTo: string | null;
}

export function useRegisterBroll() {
  return useMutation({
    // fetchApi throws the server's own sentence on a refusal ("FliStudio isn't running — not added to B-roll")
    mutationFn: (req: BrollRegisterRequest) =>
      fetchApi<BrollRegisterResponse>('/api/broll-register', {
        method: 'POST',
        body: JSON.stringify(req),
      }),
  });
}
