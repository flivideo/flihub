import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  ProjectInfo,
  ProjectStats,
  ProjectPriority,
  ProjectStageOverride,
  FinalMediaResponse,
  ChaptersResponse,
  ChapterVerifyRequest,
  ChapterVerifyResponse,
  ChapterOverride,
  SetChapterOverrideRequest,
  SetChapterOverrideResponse,
  TranscriptSyncResponse,
  FileContentResponse,
  InboxResponse,
} from '../../../shared/types';
import { QUERY_KEYS } from '../constants/queryKeys';
import { fetchApi } from './useApi';

// FR-12: Create a new project
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (code: string) =>
      fetchApi<{ success: boolean; project?: ProjectInfo; error?: string }>('/api/projects', {
        method: 'POST',
        body: JSON.stringify({ code }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects });
    },
  });
}

// FR-32: Get project list with stats (file counts, transcript %, etc.)
export function useProjects() {
  return useQuery({
    queryKey: QUERY_KEYS.projects,
    queryFn: () => fetchApi<{ projects: ProjectStats[]; error?: string }>('/api/projects/stats'),
  });
}

// FR-32: Update project priority
export function useUpdateProjectPriority() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ code, priority }: { code: string; priority: ProjectPriority }) =>
      fetchApi<{ success: boolean; code: string; priority: ProjectPriority }>(
        `/api/projects/${code}/priority`,
        {
          method: 'PUT',
          body: JSON.stringify({ priority }),
        }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects });
    },
  });
}

// FR-32: Update project stage (manual override)
export function useUpdateProjectStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ code, stage }: { code: string; stage: ProjectStageOverride }) =>
      fetchApi<{ success: boolean; code: string; stage: ProjectStageOverride }>(
        `/api/projects/${code}/stage`,
        {
          method: 'PUT',
          body: JSON.stringify({ stage }),
        }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects });
    },
  });
}

// FR-33: Get final media info for a project
export function useFinalMedia(code: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.finalMedia(code || ''),
    queryFn: () => fetchApi<FinalMediaResponse>(`/api/projects/${code}/final`),
    enabled: !!code, // Only fetch when code is provided
  });
}

// FR-34: Get chapter timestamps for a project
export function useChapters(code: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.chapters(code || ''),
    queryFn: () => fetchApi<ChaptersResponse>(`/api/projects/${code}/chapters`),
    enabled: !!code, // Only fetch when code is provided
  });
}

// FR-34 Enhancement: Verify chapter with LLM
export function useVerifyChapter(code: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ChapterVerifyRequest) =>
      fetchApi<ChapterVerifyResponse>(`/api/projects/${code}/chapters/verify`, {
        method: 'POST',
        body: JSON.stringify(request),
      }),
    onSuccess: () => {
      // Optionally invalidate chapters to refresh after verification
      if (code) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.chapters(code) });
      }
    },
  });
}

// FR-34 Enhancement: Get chapter overrides for a project
export function useChapterOverrides(code: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.chapterOverrides(code || ''),
    queryFn: () =>
      fetchApi<{ success: boolean; overrides: ChapterOverride[] }>(
        `/api/projects/${code}/chapters/overrides`
      ),
    enabled: !!code,
  });
}

// FR-34 Enhancement: Set a chapter override
export function useSetChapterOverride(code: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: SetChapterOverrideRequest) =>
      fetchApi<SetChapterOverrideResponse>(`/api/projects/${code}/chapters/override`, {
        method: 'POST',
        body: JSON.stringify(request),
      }),
    onSuccess: () => {
      if (code) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.chapterOverrides(code) });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.chapters(code) });
      }
    },
  });
}

// FR-34 Enhancement: Remove a chapter override
export function useRemoveChapterOverride(code: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ chapter, name }: { chapter: number; name: string }) =>
      fetchApi<{ success: boolean }>(
        `/api/projects/${code}/chapters/override/${chapter}/${encodeURIComponent(name)}`,
        {
          method: 'DELETE',
        }
      ),
    onSuccess: () => {
      if (code) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.chapterOverrides(code) });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.chapters(code) });
      }
    },
  });
}

// FR-48: Get detailed transcript sync status for a project
export function useTranscriptSync(code: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.transcriptSync(code || ''),
    queryFn: () => fetchApi<TranscriptSyncResponse>(`/api/projects/${code}/transcript-sync`),
    enabled: !!code,
  });
}

// FR-59: Get inbox contents for a project (NFR-66: using shared Inbox* types)
export function useInbox(code: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.inbox(code || ''),
    queryFn: () => fetchApi<InboxResponse>(`/api/query/projects/${code}/inbox`),
    enabled: !!code,
  });
}

// FR-59: Write file to inbox
export function useWriteToInbox(code: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      subfolder,
      filename,
      content,
    }: {
      subfolder: string;
      filename: string;
      content: string;
    }) =>
      fetchApi<{ success: boolean; path: string; subfolder: string; filename: string }>(
        `/api/projects/${code}/inbox/write`,
        {
          method: 'POST',
          body: JSON.stringify({ subfolder, filename, content }),
        }
      ),
    onSuccess: () => {
      if (code) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.inbox(code) });
      }
    },
  });
}

// FR-64: Get inbox file content for viewing
export function useInboxFileContent(
  code: string | null,
  subfolder: string | null,
  filename: string | null
) {
  return useQuery<FileContentResponse>({
    queryKey: QUERY_KEYS.inboxFile(code || '', subfolder || '', filename || ''),
    queryFn: () =>
      fetchApi<FileContentResponse>(
        `/api/query/projects/${code}/inbox/${encodeURIComponent(subfolder || '')}/${encodeURIComponent(filename || '')}`
      ),
    enabled: !!code && !!subfolder && !!filename,
  });
}

// FR-152: Permanently delete a project's local directory
export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ code, confirmationCode }: { code: string; confirmationCode: string }) =>
      fetchApi<{ success: boolean; deleted: string }>(`/api/projects/${code}`, {
        method: 'DELETE',
        body: JSON.stringify({ confirmationCode }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects });
    },
  });
}

// FR-118: Get project state (includes project dictionary)
export function useProjectState(projectCode: string | undefined) {
  return useQuery({
    queryKey: ['projectState', projectCode],
    queryFn: () =>
      fetchApi<{ success: boolean; state: { glingDictionary?: string[] } }>(
        `/api/projects/${projectCode}/state`
      ),
    enabled: !!projectCode,
  });
}

// FR-118: Update project dictionary
export function useUpdateProjectDictionary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectCode, words }: { projectCode: string; words: string[] }) =>
      fetchApi<{ success: boolean; words: string[] }>(
        `/api/projects/${projectCode}/state/dictionary`,
        {
          method: 'PATCH',
          body: JSON.stringify({ words }),
        }
      ),
    onSuccess: (_, { projectCode }) => {
      queryClient.invalidateQueries({ queryKey: ['projectState', projectCode] });
      queryClient.invalidateQueries({ queryKey: ['edit-prep'] }); // FR-136: Refresh combined dictionary
    },
  });
}

// FR-163: next project code for the current root (highest ever + 1, per-root mark)
export interface NextCodeResponse {
  success: boolean;
  state: 'ok' | 'empty' | 'unreadable' | 'exhausted';
  next: string | null;
  highest: string | null;
  root: string;
  reason?: string;
}

export function useNextProjectCode(enabled: boolean) {
  return useQuery({
    queryKey: QUERY_KEYS.nextProjectCode,
    queryFn: () => fetchApi<NextCodeResponse>('/api/projects/next-code'),
    enabled,
    staleTime: 0,
  });
}
