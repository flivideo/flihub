// B064: Archive-offload hold/restore hooks
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { HoldStatus, HoldOperationResult } from '../../../shared/types';
import { QUERY_KEYS } from '../constants/queryKeys';
import { fetchApi } from './useApi';

// B064: Global SSD mount check — used by header indicator, no project code needed
export function useSsdStatus() {
  return useQuery({
    queryKey: ['ssd-status'],
    queryFn: () =>
      fetchApi<{ success: boolean; ssdMounted: boolean; configured: boolean }>('/api/projects/ssd-status'),
    staleTime: 30_000,
    refetchInterval: 60_000, // Refresh every minute — drive might be plugged/unplugged
  });
}

// B064: Hold status — includes verification when location === 'both'
export function useHoldStatus(code: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.holdStatus(code ?? ''),
    queryFn: () =>
      fetchApi<{ success: boolean; data: HoldStatus }>(`/api/projects/${code}/hold/status`)
        .then(res => res.data),
    enabled: !!code,
    staleTime: 30_000,
  });
}

// B064: Step 1 of offload — rsync to HOLDING (server auto-verifies, result includes verification)
export function useHoldProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ code, dryRun }: { code: string; dryRun?: boolean }) =>
      fetchApi<HoldOperationResult>(`/api/projects/${code}/hold`, {
        method: 'POST',
        body: JSON.stringify({ dryRun }),
      }),
    onSuccess: (_data, { code }) => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.holdStatus(code) });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projectDisk(code) });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.archiveInventory });
    },
  });
}

// B064: On-demand verify — used on app restart to check abandoned state
export function useVerifyHolding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ code }: { code: string }) =>
      fetchApi<HoldOperationResult>(`/api/projects/${code}/hold/verify`, {
        method: 'POST',
      }),
    onSuccess: (_data, { code }) => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.holdStatus(code) });
      // Verify only reads state — no disk mutation — so archiveInventory stays fresh.
    },
  });
}

// B064: Delete local — only callable after verification.match === true (enforced server-side too)
export function useDeleteLocal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ code }: { code: string }) =>
      fetchApi<HoldOperationResult>(`/api/projects/${code}/local`, {
        method: 'DELETE',
        body: JSON.stringify({ confirmCode: code }),
      }),
    onSuccess: (_data, { code }) => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.holdStatus(code) });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projectDisk(code) });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.archiveInventory });
    },
  });
}

// B064: Step 1 of restore — rsync from HOLDING back to local (server auto-verifies)
export function useRestoreFromHolding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ code }: { code: string }) =>
      fetchApi<HoldOperationResult>(`/api/projects/${code}/hold/restore`, {
        method: 'POST',
      }),
    onSuccess: (_data, { code }) => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.holdStatus(code) });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projectDisk(code) });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.archiveInventory });
    },
  });
}

// B064: Delete HOLDING copy — only callable after verification.match === true
export function useDeleteHolding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ code }: { code: string }) =>
      fetchApi<HoldOperationResult>(`/api/projects/${code}/holding`, {
        method: 'DELETE',
        body: JSON.stringify({ confirmCode: code }),
      }),
    onSuccess: (_data, { code }) => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.holdStatus(code) });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.archiveInventory });
    },
  });
}
