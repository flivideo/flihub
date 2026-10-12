import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../constants/queryKeys';
import { fetchApi } from './useApi';
import type { SplitChapterRequest, SplitChapterResponse, UndoRenameResponse } from '../../../shared/types';

// B047: Bulk rename with undo support
export function useBulkRename() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      files: string[];
      chapter?: string;
      sequenceMode: 'preserve' | 'renumber';
      sequenceStart?: number;
      label: string;
      tags?: string[];
    }) => fetchApi<{
      success: boolean;
      renamedCount: number;
      transcriptionQueued: boolean;
      files: Array<{ old: string; new: string }>;
      undoAvailable?: boolean;
      errors?: string[];
    }>('/api/manage/bulk-rename', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.recordings });
    },
  });
}

// B047: Single file rename (existing endpoint, uses RenameRequest shape)
export function useRenameRecording() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      originalPath: string;
      chapter: string;
      sequence: string | null;
      name: string;
      tags: string[];
    }) =>
      fetchApi<{ success: boolean; oldPath: string; newPath: string; error?: string }>('/api/rename', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.recordings });
    },
  });
}

// B047: Split chapter
export function useSplitChapter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: SplitChapterRequest) =>
      fetchApi<SplitChapterResponse>('/api/manage/split-chapter', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.recordings });
    },
  });
}

// B047: Undo last batch rename (distinct from FR-50 useUndoRename which undoes individual renames by id)
export function useBatchUndoRename() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () =>
      fetchApi<UndoRenameResponse>('/api/manage/undo-rename', {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.recordings });
    },
  });
}

// Close the gaps in one chapter's sequence numbers (03-2, 03-3 → 03-1, 03-2). Undo: useBatchUndoRename.
export function useRenumberChapter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { chapter: string }) =>
      fetchApi<{ success: boolean; renamedCount: number; error?: string }>('/api/manage/renumber-chapter', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.recordings });
    },
  });
}
