// FR-144: POEM WUI workflow intake hooks
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { API_URL } from '../config';

export interface AwbJsonInfo {
  exists: boolean;
  savedAt: string | null;
  currentStepId: string | null;
  sizeKb: number | null;
  fullPath: string;
}

export interface FliHubChapter {
  folderNumber: string;
  chapterName: string;
  firstWords: string | null;
}

export interface PoemWuiStatus {
  success: boolean;
  error?: string;
  projectFolder?: string;
  transcriptFound: boolean;
  srtFile: string | null;
  srtFiles?: string[];
  transcript: string | null;
  srtRaw?: string | null;
  brandConfigFound?: boolean;
  brandConfigPath?: string | null;
  brandConfig?: unknown;
  fliHubChapters?: FliHubChapter[];
  awbJson?: AwbJsonInfo;
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
        toast.success('Sent to AWB');
      } else {
        toast.error(data.error || 'Send failed');
      }
    },
    onError: () => {
      toast.error('AWB not reachable — is it running on port 3001?');
    },
  });
}

export interface YloResult {
  ok: boolean;
  error?: string;
  result?: {
    success: boolean;
    project_id?: string;
    project_name?: string;
    stage?: number;
    message?: string;
  };
}

export function useSendToYlo() {
  return useMutation<YloResult, Error, void>({
    mutationFn: async () => {
      const res = await fetch(`${API_URL}/api/poem-wui/send-ylo`, { method: 'POST' });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.ok) {
        const msg = data.result?.message || 'Sent to YouTube Launch Optimizer';
        toast.success(msg);
      } else {
        toast.error(data.error || 'Send to YLO failed');
      }
    },
    onError: () => {
      toast.error('YouTube Launch Optimizer not reachable');
    },
  });
}

export function useResumeInAwb() {
  return useMutation<SendResult, Error, void>({
    mutationFn: async () => {
      const res = await fetch(`${API_URL}/api/poem-wui/resume`, { method: 'POST' });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.ok) {
        toast.success('Resuming in AWB...');
      } else {
        toast.error(data.error || 'Resume failed');
      }
    },
    onError: () => {
      toast.error('AWB not reachable');
    },
  });
}
