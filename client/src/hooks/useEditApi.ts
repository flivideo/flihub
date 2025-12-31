// FR-102: Edit Prep API hooks
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

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
