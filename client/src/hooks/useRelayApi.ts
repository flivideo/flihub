// B038: relay collaboration
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { API_URL } from '../config';
import type { RelaySubfolder } from '../../../shared/types';

export function useRelayBrowse() {
  return useQuery({
    queryKey: ['relay-browse'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/relay/browse`);
      return res.json();
    },
    refetchInterval: 30000,
  });
}

export function useRelayStatus() {
  return useQuery({
    queryKey: ['relay-status'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/relay/status`);
      return res.json();
    },
  });
}

export function useRelayPreview() {
  return useMutation({
    mutationFn: async (subfolder: RelaySubfolder = 'recordings') => {
      const res = await fetch(`${API_URL}/api/relay/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subfolder }),
      });
      return res.json();
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
    mutationFn: async (subfolder: RelaySubfolder = 'recordings') => {
      const res = await fetch(`${API_URL}/api/relay/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subfolder }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`${data.subfolder || 'Files'} pushed to relay`);
        queryClient.invalidateQueries({ queryKey: ['relay-status'] });
        queryClient.invalidateQueries({ queryKey: ['relay-browse'] });
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
    mutationFn: async (subfolder: RelaySubfolder = 'recordings') => {
      const res = await fetch(`${API_URL}/api/relay/collect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subfolder }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`${data.subfolder || 'Files'} collected from relay`);
        queryClient.invalidateQueries({ queryKey: ['relay-status'] });
        queryClient.invalidateQueries({ queryKey: ['relay-browse'] });
      } else {
        toast.error(data.error || 'Collect failed');
      }
    },
    onError: () => toast.error('Collect failed'),
  });
}

export function useRelayVersions() {
  return useQuery({
    queryKey: ['relay-versions'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/relay/versions`);
      return res.json();
    },
  });
}

export function useRelayPromote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (filename: string) => {
      const res = await fetch(`${API_URL}/api/relay/promote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`Promoted ${data.promoted} to final/`);
        queryClient.invalidateQueries({ queryKey: ['relay-versions'] });
        queryClient.invalidateQueries({ queryKey: ['relay-browse'] });
      } else {
        toast.error(data.error || 'Promote failed');
      }
    },
    onError: () => toast.error('Promote failed'),
  });
}
