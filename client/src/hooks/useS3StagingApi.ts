// FR-103: S3 Staging Page hooks
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { API_URL } from '../config'

interface FileInfo {
  name: string
  size: number
  synced?: boolean
  hasSrt?: boolean
  srtName?: string
}

interface S3StagingStatus {
  success: boolean
  error?: string
  project: string
  prep: {
    source: { path: string; exists: boolean; files: FileInfo[] }
    staging: { path: string; exists: boolean; files: FileInfo[] }
  }
  post: {
    staging: { path: string; exists: boolean; files: FileInfo[] }
    warnings: { type: string; file: string }[]
  }
  publish: {
    path: string
    exists: boolean
    files: FileInfo[]
  }
  // FR-104: Migration detection
  migration?: {
    hasLegacyFiles: boolean
    flatFileCount: number
  }
}

// FR-104: Migration types
export interface MigrationActions {
  delete: string[]
  toPrep: Array<{ from: string; to: string }>
  toPost: Array<{ from: string; to: string }>
  conflicts: Array<{ file: string; reason: string }>
}

interface MigrateResult {
  success: boolean
  error?: string
  dryRun: boolean
  actions: MigrationActions
  message?: string
}

interface SyncResult {
  success: boolean
  error?: string
  copied?: number
  totalSize?: number
}

interface PromoteResult {
  success: boolean
  error?: string
  files?: { from: string; to: string }[]
}

export function useS3StagingStatus() {
  return useQuery<S3StagingStatus>({
    queryKey: ['s3-staging-status'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/s3-staging/status`)
      return res.json()
    }
  })
}

export function useSyncPrep() {
  const queryClient = useQueryClient()
  return useMutation<SyncResult>({
    mutationFn: async () => {
      const res = await fetch(`${API_URL}/api/s3-staging/sync-prep`, { method: 'POST' })
      return res.json()
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`Synced ${data.copied} file(s) to staging`)
      } else {
        toast.error(data.error || 'Sync failed')
      }
      queryClient.invalidateQueries({ queryKey: ['s3-staging-status'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Sync failed')
    }
  })
}

export function usePromoteToPublish() {
  const queryClient = useQueryClient()
  return useMutation<PromoteResult, Error, string>({
    mutationFn: async (version: string) => {
      const res = await fetch(`${API_URL}/api/s3-staging/promote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version })
      })
      return res.json()
    },
    onSuccess: (data) => {
      if (data.success && data.files) {
        toast.success(`Promoted ${data.files.length} file(s) to publish`)
      } else {
        toast.error(data.error || 'Promote failed')
      }
      queryClient.invalidateQueries({ queryKey: ['s3-staging-status'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Promote failed')
    }
  })
}

// FR-104: Migration hook
export function useMigrate() {
  const queryClient = useQueryClient()
  return useMutation<MigrateResult, Error, boolean>({
    mutationFn: async (dryRun: boolean) => {
      const res = await fetch(`${API_URL}/api/s3-staging/migrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun })
      })
      return res.json()
    },
    onSuccess: (data) => {
      if (!data.dryRun && data.success) {
        toast.success('Migration complete')
        queryClient.invalidateQueries({ queryKey: ['s3-staging-status'] })
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Migration failed')
    }
  })
}

// FR-105: S3 Status types
interface S3Status {
  success: boolean
  error?: string
  project?: string
  brand?: string
  prep: {
    uploaded: boolean
    fileCount?: number
    totalSize?: number
    lastSync?: string
    inSync?: boolean
    error?: string
  }
  post: {
    fileCount: number
    totalSize?: number
    newFilesAvailable: number
    newFiles: string[]
  }
  rawOutput?: string
}

// FR-105: DAM command types
type DamAction = 'upload' | 'download' | 'cleanup-s3' | 'status'

interface DamResult {
  success: boolean
  action: DamAction
  command: string
  output?: string
  error?: string
  exitCode?: number
  duration?: number
}

interface CleanLocalResult {
  success: boolean
  error?: string
  deleted?: {
    prep: number
    post: number
  }
  freedSpace?: number
}

interface LocalSizeResult {
  success: boolean
  error?: string
  totalSize?: number
}

// FR-105: Get S3 status
export function useS3Status() {
  return useQuery<S3Status>({
    queryKey: ['s3-staging-s3-status'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/s3-staging/s3-status`)
      return res.json()
    },
    staleTime: 30000 // 30 seconds - don't refetch too often
  })
}

// FR-105: Execute DAM command
export function useDamCommand() {
  const queryClient = useQueryClient()
  return useMutation<DamResult, Error, DamAction>({
    mutationFn: async (action: DamAction) => {
      const res = await fetch(`${API_URL}/api/s3-staging/dam`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })
      return res.json()
    },
    onSuccess: (data) => {
      if (data.success) {
        const actionLabels: Record<DamAction, string> = {
          upload: 'Upload',
          download: 'Download',
          'cleanup-s3': 'S3 cleanup',
          status: 'Status check'
        }
        toast.success(`${actionLabels[data.action]} completed`)
        // Refresh both S3 status and local status
        queryClient.invalidateQueries({ queryKey: ['s3-staging-s3-status'] })
        queryClient.invalidateQueries({ queryKey: ['s3-staging-status'] })
      } else {
        toast.error(data.error || `${data.action} failed`)
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'DAM command failed')
    }
  })
}

// FR-105: Clean local staging files
export function useCleanLocal() {
  const queryClient = useQueryClient()
  return useMutation<CleanLocalResult, Error, void>({
    mutationFn: async () => {
      const res = await fetch(`${API_URL}/api/s3-staging/local`, {
        method: 'DELETE'
      })
      return res.json()
    },
    onSuccess: (data) => {
      if (data.success && data.deleted) {
        const total = data.deleted.prep + data.deleted.post
        toast.success(`Deleted ${total} file(s) from staging`)
        queryClient.invalidateQueries({ queryKey: ['s3-staging-status'] })
        queryClient.invalidateQueries({ queryKey: ['s3-staging-local-size'] })
      } else {
        toast.error(data.error || 'Clean failed')
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Clean failed')
    }
  })
}

// FR-105: Get local staging size
export function useLocalSize() {
  return useQuery<LocalSizeResult>({
    queryKey: ['s3-staging-local-size'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/s3-staging/local-size`)
      return res.json()
    }
  })
}
