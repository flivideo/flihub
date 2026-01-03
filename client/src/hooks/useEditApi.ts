// FR-102: Edit Prep API hooks
// FR-126: Edit Folder Manifest & Cleanup API hooks
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  EditFolderKey,
  ManifestStatusResponse,
  CleanEditFolderResponse,
  RestoreEditFolderResponse
} from '../../../shared/types'

const API_BASE = 'http://localhost:5101/api'

interface PrepData {
  success: boolean
  error?: string
  project: {
    code: string
    name: string
    fullCode: string
  }
  glingFilename: string
  glingDictionary: string[]
  recordings: { name: string; size: number }[]
  recordingsTotal: number
  editFolders: {
    allExist: boolean
    folders: { name: string; exists: boolean }[]
  }
}

export function useEditPrep() {
  return useQuery<PrepData>({
    queryKey: ['edit-prep'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/edit/prep`)
      return res.json()
    }
  })
}

export function useCreateEditFolders() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/edit/create-folders`, {
        method: 'POST'
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['edit-prep'] })
    }
  })
}

// FR-124: Create a single edit folder
export function useCreateEditFolder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (folder: string) => {
      const res = await fetch(`${API_BASE}/edit/create-folder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ folder })
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['edit-prep'] })
    }
  })
}

// FR-126: Get manifest status for an edit folder
export function useManifestStatus(folder: EditFolderKey) {
  return useQuery<ManifestStatusResponse>({
    queryKey: ['manifest-status', folder],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/export/manifest-status/${folder}`)
      return res.json()
    },
    refetchInterval: 5000, // Poll every 5 seconds
  })
}

// FR-126: Clean edit folder (delete source files)
export function useCleanEditFolder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (folder: EditFolderKey) => {
      const res = await fetch(`${API_BASE}/export/clean-edit-folder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ folder })
      })
      return res.json() as Promise<CleanEditFolderResponse>
    },
    onSuccess: (_, folder) => {
      // Invalidate manifest status for this folder
      queryClient.invalidateQueries({ queryKey: ['manifest-status', folder] })
    }
  })
}

// FR-126: Restore edit folder (re-copy from recordings)
export function useRestoreEditFolder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (folder: EditFolderKey) => {
      const res = await fetch(`${API_BASE}/export/restore-edit-folder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ folder })
      })
      return res.json() as Promise<RestoreEditFolderResponse>
    },
    onSuccess: (_, folder) => {
      // Invalidate manifest status for this folder
      queryClient.invalidateQueries({ queryKey: ['manifest-status', folder] })
    }
  })
}
