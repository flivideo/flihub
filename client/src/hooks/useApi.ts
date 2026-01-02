import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type {
  Config,
  RenameRequest,
  RenameResponse,
  SuggestedNaming,
  ProjectInfo,
  RecordingFile,
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
  ChapterRecordingConfig,
  ChapterRecordingRequest,
  ChapterRecordingResponse,
  SafeResponse,
  RestoreResponse,
  ParkResponse,
  UnparkResponse,
  RenameChapterResponse,
  QueueAllResponse,
  RecentRename,
  InboxFile,
  InboxSubfolder,
  InboxResponse,
  ChapterRecordingStatusResponse,
  ShadowStatusResponse,
  ShadowGenerateResponse,
  ShadowGenerateAllResponse,
  EnvironmentResponse,
} from '../../../shared/types'
import { QUERY_KEYS } from '../constants/queryKeys'
import { API_URL } from '../config'

// Fetch helper
export async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || 'Request failed')
  }

  return response.json()
}

// Config queries
export function useConfig() {
  return useQuery({
    queryKey: QUERY_KEYS.config,
    queryFn: () => fetchApi<Config>('/api/config'),
  })
}

export function useUpdateConfig() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (config: Partial<Config>) =>
      fetchApi<Config>('/api/config', {
        method: 'POST',
        body: JSON.stringify(config),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.config })
    },
  })
}

// Rename mutation
export function useRename() {
  return useMutation({
    mutationFn: (request: RenameRequest) =>
      fetchApi<RenameResponse>('/api/rename', {
        method: 'POST',
        body: JSON.stringify(request),
      }),
  })
}

// FR-5: Trash file mutation (moves to -trash/ directory)
export function useTrashFile() {
  return useMutation({
    mutationFn: (path: string) =>
      fetchApi<{ success: boolean; trashPath?: string; error?: string }>('/api/trash', {
        method: 'POST',
        body: JSON.stringify({ path }),
      }),
  })
}

// FR-4: Get suggested naming based on existing files in target directory
export function useSuggestedNaming() {
  return useQuery({
    queryKey: QUERY_KEYS.suggestedNaming,
    queryFn: () => fetchApi<SuggestedNaming>('/api/suggested-naming'),
  })
}

// FR-4: Refetch suggested naming (call after config changes)
export function useRefetchSuggestedNaming() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.suggestedNaming })
}

// FR-12: Create a new project
export function useCreateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (code: string) =>
      fetchApi<{ success: boolean; project?: ProjectInfo; error?: string }>('/api/projects', {
        method: 'POST',
        body: JSON.stringify({ code }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects })
    },
  })
}

// FR-14: Get recordings in target directory
// FR-95: Response now includes total size fields
export function useRecordings() {
  return useQuery({
    queryKey: QUERY_KEYS.recordings,
    queryFn: () => fetchApi<{
      recordings: RecordingFile[];
      totalRecordingsSize: number;      // FR-95: Total size of real recordings in bytes
      totalShadowsSize: number | null;  // FR-95: Total shadow size (null if none)
      error?: string;
    }>('/api/recordings'),
  })
}

// FR-15: Move file(s) to -safe folder (NFR-66: using shared SafeResponse type)
export function useMoveToSafe() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: { files?: string[]; chapter?: string }) =>
      fetchApi<SafeResponse>('/api/recordings/safe', {
        method: 'POST',
        body: JSON.stringify(request),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.recordings })
    },
  })
}

// FR-15: Restore file(s) from -safe folder (NFR-66: using shared RestoreResponse type)
export function useRestoreFromSafe() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (files: string[]) =>
      fetchApi<RestoreResponse>('/api/recordings/restore', {
        method: 'POST',
        body: JSON.stringify({ files }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.recordings })
    },
  })
}

// FR-120: Park recording(s) (NFR-66: using shared ParkResponse type)
export function useParkRecording() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: { files?: string[]; chapter?: string }) =>
      fetchApi<ParkResponse>('/api/recordings/park', {
        method: 'POST',
        body: JSON.stringify(request),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.recordings })
    },
  })
}

// FR-120: Unpark recording(s) (NFR-66: using shared UnparkResponse type)
export function useUnparkRecording() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (files: string[]) =>
      fetchApi<UnparkResponse>('/api/recordings/unpark', {
        method: 'POST',
        body: JSON.stringify({ files }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.recordings })
    },
  })
}

// FR-47: Rename chapter label (NFR-66: using shared RenameChapterResponse type)
export function useRenameChapter() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ chapter, currentLabel, newLabel }: { chapter: string; currentLabel: string; newLabel: string }) =>
      fetchApi<RenameChapterResponse>('/api/recordings/rename-chapter', {
        method: 'POST',
        body: JSON.stringify({ chapter, currentLabel, newLabel }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.recordings })
    },
  })
}

// FR-32: Get project list with stats (file counts, transcript %, etc.)
export function useProjects() {
  return useQuery({
    queryKey: QUERY_KEYS.projects,
    queryFn: () => fetchApi<{ projects: ProjectStats[]; error?: string }>('/api/projects/stats'),
  })
}

// FR-32: Update project priority
export function useUpdateProjectPriority() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ code, priority }: { code: string; priority: ProjectPriority }) =>
      fetchApi<{ success: boolean; code: string; priority: ProjectPriority }>(`/api/projects/${code}/priority`, {
        method: 'PUT',
        body: JSON.stringify({ priority }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects })
    },
  })
}

// FR-32: Update project stage (manual override)
export function useUpdateProjectStage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ code, stage }: { code: string; stage: ProjectStageOverride }) =>
      fetchApi<{ success: boolean; code: string; stage: ProjectStageOverride }>(`/api/projects/${code}/stage`, {
        method: 'PUT',
        body: JSON.stringify({ stage }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects })
    },
  })
}

// FR-30 Enhancement: Queue all untranscribed videos (NFR-66: using shared QueueAllResponse type)
export function useTranscribeAll() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ scope, chapter }: { scope: 'project' | 'chapter'; chapter?: string }) =>
      fetchApi<QueueAllResponse>('/api/transcriptions/queue-all', {
        method: 'POST',
        body: JSON.stringify({ scope, chapter }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.transcriptions })
      // FR-92: Refresh pending count after transcription queue changes
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.pendingTranscriptionCount })
    },
  })
}

// FR-92: Get count of files pending transcription
export function usePendingTranscriptionCount() {
  return useQuery({
    queryKey: QUERY_KEYS.pendingTranscriptionCount,
    queryFn: () => fetchApi<{ pendingCount: number; totalCount: number }>('/api/transcriptions/pending-count'),
  })
}

// FR-33: Get final media info for a project
export function useFinalMedia(code: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.finalMedia(code || ''),
    queryFn: () => fetchApi<FinalMediaResponse>(`/api/projects/${code}/final`),
    enabled: !!code,  // Only fetch when code is provided
  })
}

// FR-34: Get chapter timestamps for a project
export function useChapters(code: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.chapters(code || ''),
    queryFn: () => fetchApi<ChaptersResponse>(`/api/projects/${code}/chapters`),
    enabled: !!code,  // Only fetch when code is provided
  })
}

// FR-34 Enhancement: Verify chapter with LLM
export function useVerifyChapter(code: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: ChapterVerifyRequest) =>
      fetchApi<ChapterVerifyResponse>(`/api/projects/${code}/chapters/verify`, {
        method: 'POST',
        body: JSON.stringify(request),
      }),
    onSuccess: () => {
      // Optionally invalidate chapters to refresh after verification
      if (code) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.chapters(code) })
      }
    },
  })
}

// FR-34 Enhancement: Get chapter overrides for a project
export function useChapterOverrides(code: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.chapterOverrides(code || ''),
    queryFn: () => fetchApi<{ success: boolean; overrides: ChapterOverride[] }>(`/api/projects/${code}/chapters/overrides`),
    enabled: !!code,
  })
}

// FR-34 Enhancement: Set a chapter override
export function useSetChapterOverride(code: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: SetChapterOverrideRequest) =>
      fetchApi<SetChapterOverrideResponse>(`/api/projects/${code}/chapters/override`, {
        method: 'POST',
        body: JSON.stringify(request),
      }),
    onSuccess: () => {
      if (code) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.chapterOverrides(code) })
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.chapters(code) })
      }
    },
  })
}

// FR-34 Enhancement: Remove a chapter override
export function useRemoveChapterOverride(code: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ chapter, name }: { chapter: number; name: string }) =>
      fetchApi<{ success: boolean }>(`/api/projects/${code}/chapters/override/${chapter}/${encodeURIComponent(name)}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      if (code) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.chapterOverrides(code) })
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.chapters(code) })
      }
    },
  })
}

// FR-48: Get detailed transcript sync status for a project
export function useTranscriptSync(code: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.transcriptSync(code || ''),
    queryFn: () => fetchApi<TranscriptSyncResponse>(`/api/projects/${code}/transcript-sync`),
    enabled: !!code,
  })
}

// FR-48: Queue transcription for a specific video
export function useQueueTranscription() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (videoPath: string) =>
      fetchApi<{ success: boolean; job: unknown }>('/api/transcriptions/queue', {
        method: 'POST',
        body: JSON.stringify({ videoPath }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.transcriptions })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects })
    },
  })
}

// FR-48: Delete orphaned transcript
// Accepts optional projectCode to delete from a specific project (for Projects panel use)
export function useDeleteTranscript() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ filename, projectCode }: { filename: string; projectCode?: string }) => {
      const url = projectCode
        ? `/api/transcriptions/transcript/${encodeURIComponent(filename)}?project=${encodeURIComponent(projectCode)}`
        : `/api/transcriptions/transcript/${encodeURIComponent(filename)}`
      return fetchApi<{ success: boolean; filename: string; deleted: boolean }>(url, {
        method: 'DELETE',
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects })
    },
  })
}

// FR-50: Get recent renames for undo functionality (NFR-66: using shared RecentRename type)
export function useRecentRenames() {
  return useQuery({
    queryKey: QUERY_KEYS.recentRenames,
    queryFn: () => fetchApi<{ renames: RecentRename[] }>('/api/recordings/recent-renames'),
    refetchInterval: 30000,  // Refresh every 30 seconds to update ages
  })
}

// FR-50: Undo a recent rename
export function useUndoRename() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      fetchApi<{ success: boolean; originalPath?: string; originalName?: string; error?: string }>('/api/recordings/undo-rename', {
        method: 'POST',
        body: JSON.stringify({ id }),
      }),
    onSuccess: () => {
      // Invalidate recent renames list and recordings
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.recentRenames })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.recordings })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.suggestedNaming })
    },
  })
}

// FR-59: Get inbox contents for a project (NFR-66: using shared Inbox* types)
export function useInbox(code: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.inbox(code || ''),
    queryFn: () => fetchApi<InboxResponse>(`/api/query/projects/${code}/inbox`),
    enabled: !!code,
  })
}

// FR-59: Write file to inbox
export function useWriteToInbox(code: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ subfolder, filename, content }: { subfolder: string; filename: string; content: string }) =>
      fetchApi<{ success: boolean; path: string; subfolder: string; filename: string }>(`/api/projects/${code}/inbox/write`, {
        method: 'POST',
        body: JSON.stringify({ subfolder, filename, content }),
      }),
    onSuccess: () => {
      if (code) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.inbox(code) })
      }
    },
  })
}

// FR-64: Get inbox file content for viewing
export function useInboxFileContent(
  code: string | null,
  subfolder: string | null,
  filename: string | null
) {
  return useQuery<FileContentResponse>({
    queryKey: QUERY_KEYS.inboxFile(code || '', subfolder || '', filename || ''),
    queryFn: () => fetchApi<FileContentResponse>(
      `/api/query/projects/${code}/inbox/${encodeURIComponent(subfolder || '')}/${encodeURIComponent(filename || '')}`
    ),
    enabled: !!code && !!subfolder && !!filename,
  })
}

/// FR-64: Open inbox file in external application (browser for HTML)
export function useOpenInboxFile() {
  return useMutation({
    mutationFn: ({ subfolder, filename }: { subfolder: string; filename: string }) =>
      fetchApi<{ success: boolean; path: string }>('/api/system/open-file', {
        method: 'POST',
        body: JSON.stringify({ subfolder, filename }),
      }),
    onSuccess: () => {
      toast.success('File opened')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to open file')
    },
  })
}

// FR-58: Get chapter recording configuration (NFR-66: using shared ChapterRecordingStatusResponse type)
export function useChapterRecordingConfig() {
  return useQuery({
    queryKey: QUERY_KEYS.chapterRecordingConfig,
    queryFn: () => fetchApi<{ success: boolean; config: ChapterRecordingConfig }>('/api/chapters/config'),
    staleTime: 0,  // FR-76: Always consider stale so defaults sync from Config page
    refetchOnMount: 'always',  // FR-76: Force refetch when modal opens to get latest defaults
  })
}

// FR-58: Update chapter recording configuration
export function useUpdateChapterRecordingConfig() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (config: Partial<ChapterRecordingConfig>) =>
      fetchApi<{ success: boolean }>('/api/chapters/config', {
        method: 'PUT',
        body: JSON.stringify(config),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.chapterRecordingConfig })
    },
  })
}

// FR-58: Get chapter recording status (chapters available, existing recordings)
export function useChapterRecordingStatus() {
  return useQuery({
    queryKey: QUERY_KEYS.chapterRecordingStatus,
    queryFn: () => fetchApi<ChapterRecordingStatusResponse>('/api/chapters/status'),
    refetchInterval: 5000,  // Poll during generation
  })
}

// FR-58: Generate chapter recordings
export function useGenerateChapterRecordings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: ChapterRecordingRequest) =>
      fetchApi<ChapterRecordingResponse>('/api/chapters/generate', {
        method: 'POST',
        body: JSON.stringify(request),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.chapterRecordingStatus })
    },
  })
}

// FR-83: Get shadow recording status
export function useShadowStatus() {
  return useQuery({
    queryKey: QUERY_KEYS.shadowStatus,
    queryFn: () => fetchApi<ShadowStatusResponse>('/api/shadows/status'),
  })
}

// FR-83: Generate shadow files for current project
export function useGenerateShadows() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () =>
      fetchApi<ShadowGenerateResponse>('/api/shadows/generate', {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.shadowStatus })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.recordings })
    },
  })
}

// FR-83: Generate shadow files for all projects
export function useGenerateAllShadows() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () =>
      fetchApi<ShadowGenerateAllResponse>('/api/shadows/generate-all', {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.shadowStatus })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.recordings })
    },
  })
}

// FR-90: Get active file watchers
interface WatcherInfo {
  name: string
  pattern: string | string[]
  status: 'active' | 'error'
}

export function useWatchers() {
  return useQuery({
    queryKey: QUERY_KEYS.watchers,
    queryFn: () => fetchApi<{ watchers: WatcherInfo[] }>('/api/system/watchers'),
  })
}

// FR-96: Get server environment info for path format guidance
export function useEnvironment() {
  return useQuery({
    queryKey: ['environment'],
    queryFn: () => fetchApi<EnvironmentResponse>('/api/system/environment'),
    staleTime: Infinity,  // Environment won't change during session
  })
}

// FR-102: Open a predefined folder in Finder/Explorer
export function useOpenFolder() {
  return useMutation({
    mutationFn: ({ folderKey, projectCode }: { folderKey: string; projectCode?: string }) =>
      fetchApi<{ success: boolean; path?: string; error?: string }>('/api/system/open-folder', {
        method: 'POST',
        body: JSON.stringify({ folder: folderKey, projectCode }),
      }),
    onSuccess: () => {
      toast.success('Folder opened')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to open folder')
    },
  })
}

// FR-118: Get project state (includes project dictionary)
export function useProjectState(projectCode: string | undefined) {
  return useQuery({
    queryKey: ['projectState', projectCode],
    queryFn: () => fetchApi<{ success: boolean; state: { glingDictionary?: string[] } }>(`/api/projects/${projectCode}/state`),
    enabled: !!projectCode,
  })
}

// FR-118: Update project dictionary
export function useUpdateProjectDictionary() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectCode, words }: { projectCode: string; words: string[] }) =>
      fetchApi<{ success: boolean; words: string[] }>(`/api/projects/${projectCode}/state/dictionary`, {
        method: 'PATCH',
        body: JSON.stringify({ words }),
      }),
    onSuccess: (_, { projectCode }) => {
      queryClient.invalidateQueries({ queryKey: ['projectState', projectCode] })
    },
  })
}
