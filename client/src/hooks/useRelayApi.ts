// B038: relay collaboration
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { API_URL } from '../config';
import { QUERY_KEYS } from '../constants/queryKeys';
import type {
  RelaySubfolder,
  RelayBrowseResponse,
  RelayEnhancedBrowseResponse,
  RelayStatusResponse,
  RelayPreviewResponse,
  RelayPushResponse,
  RelayCollectResponse,
  RelayClearResponse,
  RelayVersionsResponse,
  RelayPromoteResponse,
  RelayActivityResponse,
  RelayFilesResponse,
  RelayDivergenceResponse,
} from '../../../shared/types';

export function useRelayBrowse() {
  return useQuery({
    queryKey: QUERY_KEYS.relayBrowse,
    queryFn: async (): Promise<RelayBrowseResponse> => {
      const res = await fetch(`${API_URL}/api/relay/browse`);
      if (!res.ok) {
        throw new Error(`Relay API error: ${res.status} ${res.statusText}`);
      }
      const data: RelayBrowseResponse = await res.json();
      return data;
    },
    refetchInterval: 30000,
  });
}

export function useEnhancedRelayBrowse() {
  return useQuery({
    queryKey: QUERY_KEYS.relayEnhancedBrowse,
    queryFn: async (): Promise<RelayEnhancedBrowseResponse> => {
      const res = await fetch(`${API_URL}/api/relay/browse?detailed=true`);
      if (!res.ok) {
        throw new Error(`Relay API error: ${res.status} ${res.statusText}`);
      }
      const data: RelayEnhancedBrowseResponse = await res.json();
      return data;
    },
    refetchInterval: 30000,
  });
}

export function useRelayStatus() {
  return useQuery({
    queryKey: QUERY_KEYS.relayStatus,
    queryFn: async (): Promise<RelayStatusResponse> => {
      const res = await fetch(`${API_URL}/api/relay/status`);
      if (!res.ok) {
        throw new Error(`Relay API error: ${res.status} ${res.statusText}`);
      }
      const data: RelayStatusResponse = await res.json();
      return data;
    },
  });
}

export function useRelayPreview() {
  return useMutation({
    mutationFn: async (subfolder: RelaySubfolder = 'recordings'): Promise<RelayPreviewResponse> => {
      const res = await fetch(`${API_URL}/api/relay/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subfolder }),
      });
      if (!res.ok) {
        throw new Error(`Relay API error: ${res.status} ${res.statusText}`);
      }
      const data: RelayPreviewResponse = await res.json();
      return data;
    },
    onSuccess: (data) => {
      if (!data.success) toast.error(data.error || 'Preview failed');
    },
    onError: () => toast.error('Preview failed'),
  });
}

export function useRelayPush() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (subfolder: RelaySubfolder = 'recordings'): Promise<RelayPushResponse> => {
      const res = await fetch(`${API_URL}/api/relay/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subfolder }),
      });
      if (!res.ok) {
        throw new Error(`Relay API error: ${res.status} ${res.statusText}`);
      }
      const data: RelayPushResponse = await res.json();
      return data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`${data.subfolder || 'Files'} pushed to relay`);
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.relayStatus });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.relayBrowse });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.relayDivergence });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.relayActivity });
      } else {
        toast.error(data.error || 'Push failed');
      }
    },
    onError: () => toast.error('Push failed'),
  });
}

export function useRelayCollect() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (subfolder: RelaySubfolder = 'recordings'): Promise<RelayCollectResponse> => {
      const res = await fetch(`${API_URL}/api/relay/collect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subfolder }),
      });
      if (!res.ok) {
        throw new Error(`Relay API error: ${res.status} ${res.statusText}`);
      }
      const data: RelayCollectResponse = await res.json();
      return data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`${data.subfolder || 'Files'} collected from relay`);
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.relayStatus });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.relayBrowse });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.relayDivergence });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.relayActivity });
      } else {
        // FR-147: Show specific message when blocked by missing project
        const msg = data.missingProject
          ? `Project "${data.missingProject}" not found locally — sync Video Project first`
          : (data.error || 'Collect failed');
        toast.error(msg);
      }
    },
    onError: () => toast.error('Collect failed'),
  });
}

export function useRelayClear() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ subfolder }: { subfolder: RelaySubfolder }): Promise<RelayClearResponse> => {
      const res = await fetch(`${API_URL}/api/relay/clear`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subfolder }),
      });
      if (!res.ok) {
        throw new Error(`Relay API error: ${res.status} ${res.statusText}`);
      }
      const data: RelayClearResponse = await res.json();
      return data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`Cleared ${data.deleted} files from relay ${data.subfolder || ''}`);
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.relayBrowse });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.relayEnhancedBrowse });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.relayDivergence });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.relayActivity });
        // Invalidate all hold-status queries so StorageTool sees relayBytes drop to 0
        queryClient.invalidateQueries({ queryKey: ['hold-status'] });
      } else {
        toast.error(data.error || 'Clear failed');
      }
    },
    onError: () => toast.error('Clear failed'),
  });
}

export function useRelayVersions() {
  return useQuery({
    queryKey: QUERY_KEYS.relayVersions,
    queryFn: async (): Promise<RelayVersionsResponse> => {
      const res = await fetch(`${API_URL}/api/relay/versions`);
      if (!res.ok) {
        throw new Error(`Relay API error: ${res.status} ${res.statusText}`);
      }
      const data: RelayVersionsResponse = await res.json();
      return data;
    },
  });
}

export function useRelayPromote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (filename: string): Promise<RelayPromoteResponse> => {
      const res = await fetch(`${API_URL}/api/relay/promote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename }),
      });
      if (!res.ok) {
        throw new Error(`Relay API error: ${res.status} ${res.statusText}`);
      }
      const data: RelayPromoteResponse = await res.json();
      return data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`Promoted ${data.promoted} to final/`);
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.relayVersions });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.relayBrowse });
      } else {
        toast.error(data.error || 'Promote failed');
      }
    },
    onError: () => toast.error('Promote failed'),
  });
}

export function useRelayActivity(projectCode?: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.relayActivity, projectCode],
    queryFn: async (): Promise<RelayActivityResponse> => {
      const qs = projectCode ? `?projectCode=${projectCode}` : '';
      const res = await fetch(`${API_URL}/api/relay/activity${qs}`);
      if (!res.ok) {
        throw new Error(`Relay API error: ${res.status} ${res.statusText}`);
      }
      return res.json() as Promise<RelayActivityResponse>;
    },
    refetchInterval: 30000,
  });
}

export function useRelayFiles(subfolder: RelaySubfolder, source: 'project' | 'relay' = 'project') {
  return useQuery({
    queryKey: [...QUERY_KEYS.relayFiles(subfolder), source],
    queryFn: async (): Promise<RelayFilesResponse> => {
      const res = await fetch(`${API_URL}/api/relay/files?subfolder=${subfolder}&source=${source}`);
      if (!res.ok) {
        throw new Error(`Relay API error: ${res.status} ${res.statusText}`);
      }
      return res.json() as Promise<RelayFilesResponse>;
    },
    refetchInterval: 30000,
  });
}

export function useRelayDivergence() {
  return useQuery({
    queryKey: QUERY_KEYS.relayDivergence,
    queryFn: async (): Promise<RelayDivergenceResponse> => {
      const res = await fetch(`${API_URL}/api/relay/divergence`);
      if (!res.ok) {
        throw new Error(`Relay API error: ${res.status} ${res.statusText}`);
      }
      return res.json() as Promise<RelayDivergenceResponse>;
    },
    refetchInterval: 15000,
  });
}

export function useEnsureFolders() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<{ success: boolean; error?: string }> => {
      const res = await fetch(`${API_URL}/api/relay/ensure-folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        throw new Error(`Relay API error: ${res.status} ${res.statusText}`);
      }
      return res.json() as Promise<{ success: boolean; error?: string }>;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Project folders created');
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.relayDivergence });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.relayBrowse });
      } else {
        toast.error(data.error || 'Failed to create folders');
      }
    },
    onError: () => toast.error('Failed to create folders'),
  });
}

/** @deprecated Use useEnsureFolders instead */
export const useEnsureEditFolders = useEnsureFolders;
