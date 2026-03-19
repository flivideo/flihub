// B038: relay collaboration
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { API_URL } from '../config';

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
    mutationFn: async () => {
      const res = await fetch(`${API_URL}/api/relay/preview`, { method: 'POST' });
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
    mutationFn: async () => {
      const res = await fetch(`${API_URL}/api/relay/push`, { method: 'POST' });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Recordings pushed to relay');
        queryClient.invalidateQueries({ queryKey: ['relay-status'] });
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
    mutationFn: async () => {
      const res = await fetch(`${API_URL}/api/relay/collect`, { method: 'POST' });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Edits collected from relay');
        queryClient.invalidateQueries({ queryKey: ['relay-status'] });
      } else {
        toast.error(data.error || 'Collect failed');
      }
    },
    onError: () => toast.error('Collect failed'),
  });
}
