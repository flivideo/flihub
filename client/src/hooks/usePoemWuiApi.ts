// FR-144: POEM WUI workflow intake hooks
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { API_URL } from '../config';

export interface PoemWuiStatus {
  success: boolean;
  error?: string;
  projectFolder?: string;
  transcriptFound: boolean;
  srtFile: string | null;
  transcript: string | null;
  srtRaw?: string | null;
  brandConfigFound?: boolean;
  brandConfigPath?: string | null;
}

interface SendResult {
  ok: boolean;
  error?: string;
}

export function usePoemWuiStatus() {
  return useQuery<PoemWuiStatus>({
    queryKey: ['poem-wui-status'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/poem-wui/status`);
      return res.json();
    },
  });
}

export function useSendToPoem() {
  return useMutation<SendResult, Error, void>({
    mutationFn: async () => {
      const res = await fetch(`${API_URL}/api/poem-wui/send`, { method: 'POST' });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.ok) {
        toast.success('Sent to POEM WUI');
      } else {
        toast.error(data.error || 'Send failed');
      }
    },
    onError: () => {
      toast.error('POEM WUI not reachable — is it running on port 3001?');
    },
  });
}
