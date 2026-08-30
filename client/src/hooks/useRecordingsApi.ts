import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  RenameRequest,
  RenameResponse,
  SuggestedNaming,
  RecordingFile,
  SafeResponse,
  RestoreResponse,
  ParkResponse,
  UnparkResponse,
  RenameChapterResponse,
  RecentRename,
} from '../../../shared/types';
import { QUERY_KEYS } from '../constants/queryKeys';
import { fetchApi } from './useApi';

// FR-14: Get recordings in target directory
// FR-95: Response now includes total size fields
export function useRecordings() {
  return useQuery({
    queryKey: QUERY_KEYS.recordings,
    queryFn: () =>
      fetchApi<{
        recordings: RecordingFile[];
        totalRecordingsSize: number; // FR-95: Total size of real recordings in bytes
        totalShadowsSize: number | null; // FR-95: Total shadow size (null if none)
        chapterTitles?: Record<string, string>; // FR-157: persisted chapter titles by 2-digit key
        error?: string;
      }>('/api/recordings'),
  });
}

// Rename mutation
export function useRename() {
  return useMutation({
    mutationFn: (request: RenameRequest) =>
      fetchApi<RenameResponse>('/api/rename', {
        method: 'POST',
        body: JSON.stringify(request),
      }),
  });
}

// FR-5: Trash file mutation (moves to -trash/ directory)
export function useTrashFile() {
  return useMutation({
    mutationFn: (path: string) =>
      fetchApi<{ success: boolean; trashPath?: string; error?: string }>('/api/trash', {
        method: 'POST',
        body: JSON.stringify({ path }),
      }),
  });
}

// FR-156: Trash recording(s) plus every sibling artifact (shadow + transcripts)
export interface TrashArtifact {
  kind: 'recording' | 'shadow' | 'transcript';
  label: string;
  path: string;
  filename: string;
  size: number;
}

export interface TrashPreviewItem {
  filename: string;
  artifacts: TrashArtifact[];
  totalBytes: number;
}

export interface TrashRecordingsResponse {
  success: boolean;
  dryRun?: boolean;
  items?: TrashPreviewItem[];
  trashed?: string[];
  count?: number;
  artifactCount?: number;
  totalBytes?: number;
  errors?: string[];
  error?: string;
}

/**
 * Ask the server what WOULD be trashed, without moving anything.
 * The confirmation dialog is built from this so the warning can never drift
 * from what the trash call actually does — same server-side discovery.
 */
export function usePreviewTrashRecordings() {
  return useMutation({
    mutationFn: (files: string[]) =>
      fetchApi<TrashRecordingsResponse>('/api/recordings/trash', {
        method: 'POST',
        body: JSON.stringify({ files, dryRun: true }),
      }),
  });
}

export function useTrashRecordings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (files: string[]) =>
      fetchApi<TrashRecordingsResponse>('/api/recordings/trash', {
        method: 'POST',
        body: JSON.stringify({ files }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.recordings });
    },
  });
}

// FR-4: Get suggested naming based on existing files in target directory
export function useSuggestedNaming() {
  return useQuery({
    queryKey: QUERY_KEYS.suggestedNaming,
    queryFn: () => fetchApi<SuggestedNaming>('/api/suggested-naming'),
  });
}

// FR-4: Refetch suggested naming (call after config changes)
export function useRefetchSuggestedNaming() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.suggestedNaming });
}

// FR-15: Move file(s) to -safe folder (NFR-66: using shared SafeResponse type)
export function useMoveToSafe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: { files?: string[]; chapter?: string }) =>
      fetchApi<SafeResponse>('/api/recordings/safe', {
        method: 'POST',
        body: JSON.stringify(request),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.recordings });
    },
  });
}

// FR-15: Restore file(s) from -safe folder (NFR-66: using shared RestoreResponse type)
export function useRestoreFromSafe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (files: string[]) =>
      fetchApi<RestoreResponse>('/api/recordings/restore', {
        method: 'POST',
        body: JSON.stringify({ files }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.recordings });
    },
  });
}

// FR-120: Park recording(s) (NFR-66: using shared ParkResponse type)
export function useParkRecording() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: { files?: string[]; chapter?: string }) =>
      fetchApi<ParkResponse>('/api/recordings/park', {
        method: 'POST',
        body: JSON.stringify(request),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.recordings });
    },
  });
}

// FR-120: Unpark recording(s) (NFR-66: using shared UnparkResponse type)
export function useUnparkRecording() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (files: string[]) =>
      fetchApi<UnparkResponse>('/api/recordings/unpark', {
        method: 'POST',
        body: JSON.stringify({ files }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.recordings });
    },
  });
}

// FR-47: Rename chapter label (NFR-66: using shared RenameChapterResponse type)
export function useRenameChapter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      chapter,
      currentLabel,
      newLabel,
    }: {
      chapter: string;
      currentLabel: string;
      newLabel: string;
    }) =>
      fetchApi<RenameChapterResponse>('/api/recordings/rename-chapter', {
        method: 'POST',
        body: JSON.stringify({ chapter, currentLabel, newLabel }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.recordings });
    },
  });
}

// FR-50: Get recent renames for undo functionality (NFR-66: using shared RecentRename type)
export function useRecentRenames() {
  return useQuery({
    queryKey: QUERY_KEYS.recentRenames,
    queryFn: () => fetchApi<{ renames: RecentRename[] }>('/api/recordings/recent-renames'),
    refetchInterval: 30000, // Refresh every 30 seconds to update ages
  });
}

// FR-50: Undo a recent rename
export function useUndoRename() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      fetchApi<{ success: boolean; originalPath?: string; originalName?: string; error?: string }>(
        '/api/recordings/undo-rename',
        {
          method: 'POST',
          body: JSON.stringify({ id }),
        }
      ),
    onSuccess: () => {
      // Invalidate recent renames list and recordings
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.recentRenames });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.recordings });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.suggestedNaming });
    },
  });
}
