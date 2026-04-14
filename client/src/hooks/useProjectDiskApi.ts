// B062: Disk space observability hooks
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { DiskSizeData } from '../../../shared/types';
import { QUERY_KEYS } from '../constants/queryKeys';
import { fetchApi } from './useApi';

// B062: Scan all projects — mutation because it's a heavy on-demand operation
export function useDiskScanAll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      fetchApi<{ success: boolean; results: Record<string, DiskSizeData> }>(
        '/api/projects/disk/scan-all',
        { method: 'POST' }
      ),
    onSuccess: (data) => {
      if (data.success && data.results) {
        // Populate per-project cache entries in React Query
        Object.entries(data.results).forEach(([code, diskData]) => {
          queryClient.setQueryData(QUERY_KEYS.projectDisk(code), {
            success: true,
            data: diskData,
            fromCache: true,
          });
        });
      }
    },
  });
}

// B062 Wave 2: Delete trash contents for a project
export function useDeleteTrash(code: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      fetchApi<{ success: boolean; deleted: Array<{ name: string; size: number }>; error?: string }>(
        `/api/projects/${code}/trash`,
        { method: 'DELETE' }
      ),
    onSuccess: (data) => {
      if (data.success) {
        // Clear disk cache so drawer refetches fresh data
        queryClient.removeQueries({ queryKey: QUERY_KEYS.projectDisk(code ?? '') });
        toast.success(`Deleted ${data.deleted.length} files from trash`);
      } else {
        toast.error(data.error ?? 'Failed to delete trash');
      }
    },
  });
}

// WU2: Delete contents of a project subfolder (pre-offload cleanup)
export function useDeleteSubfolder(code: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { subfolder: string }) => {
      const res = await fetch('/api/manage/delete-subfolder', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Delete failed');
      return res.json() as Promise<{ success: boolean; deleted: number; subfolder: string }>;
    },
    onSuccess: () => {
      // Refresh disk data so the breakdown updates
      if (code) {
        queryClient.removeQueries({ queryKey: QUERY_KEYS.projectDisk(code) });
      }
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.holdStatus(code ?? '') });
    },
  });
}

// B062: Get disk data for one project (on-demand, uses server cache)
export function useProjectDisk(code: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.projectDisk(code ?? ''),
    queryFn: () =>
      fetchApi<{ success: boolean; data: DiskSizeData; fromCache: boolean }>(
        `/api/projects/${code}/disk`
      ),
    enabled: !!code,
    staleTime: Infinity, // Never auto-refetch — user triggers refresh explicitly
  });
}
