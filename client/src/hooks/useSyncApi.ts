// B044: Sync Hub — client hooks for sync endpoints
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { API_URL } from '../config';
import { QUERY_KEYS } from '../constants/queryKeys';
import type {
  SyncStatusResponse,
  SyncPushResponse,
  SyncPullResponse,
  SyncResolveRequest,
  SyncResolveResponse,
} from '../../../shared/types';

export function useSyncStatus() {
  return useQuery({
    queryKey: QUERY_KEYS.syncStatus,
    queryFn: async (): Promise<SyncStatusResponse> => {
      const res = await fetch(`${API_URL}/api/sync/status`);
      if (!res.ok) {
        throw new Error(`Sync API error: ${res.status} ${res.statusText}`);
      }
      const data: SyncStatusResponse = await res.json();
      return data;
    },
    refetchInterval: 120000,
  });
}

export function useSyncPush() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (channel: 'app-code' | 'video-project' = 'video-project'): Promise<SyncPushResponse> => {
      const res = await fetch(`${API_URL}/api/sync/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel }),
      });
      if (!res.ok) {
        throw new Error(`Sync API error: ${res.status} ${res.statusText}`);
      }
      const data: SyncPushResponse = await res.json();
      return data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`Pushed ${data.filesCommitted ?? 0} file(s) to sync`);
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.syncStatus });
      } else {
        toast.error(data.error || 'Push failed');
      }
    },
    onError: () => toast.error('Sync push failed'),
  });
}

export function useSyncPull() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (channel: 'app-code' | 'video-project'): Promise<SyncPullResponse> => {
      const res = await fetch(`${API_URL}/api/sync/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel }),
      });
      if (!res.ok) {
        throw new Error(`Sync API error: ${res.status} ${res.statusText}`);
      }
      const data: SyncPullResponse = await res.json();
      return data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Sync pull complete');
        if (data.restartInstructions) {
          toast.info(data.restartInstructions);
        }
        if (data.conflicts && data.conflicts.length > 0) {
          toast.warning(`${data.conflicts.length} conflict(s) detected`);
        }
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.syncStatus });
      } else {
        toast.error(data.error || 'Pull failed');
      }
    },
    onError: () => toast.error('Sync pull failed'),
  });
}

export function useSyncResolve() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: SyncResolveRequest): Promise<SyncResolveResponse> => {
      const res = await fetch(`${API_URL}/api/sync/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error(`Sync API error: ${res.status} ${res.statusText}`);
      }
      const data: SyncResolveResponse = await res.json();
      return data;
    },
    onSuccess: (data) => {
      if (data.success) {
        if ((data.remainingConflicts ?? 0) === 0) {
          toast.success('All conflicts resolved');
        } else {
          toast.info(`${data.remainingConflicts} conflict(s) remaining`);
        }
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.syncStatus });
      } else {
        toast.error(data.error || 'Resolve failed');
      }
    },
    onError: () => toast.error('Sync resolve failed'),
  });
}
