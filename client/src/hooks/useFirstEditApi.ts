// FR-102: First Edit Prep API hooks
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
  prepFolder: {
    exists: boolean
    path: string
    files: { name: string; size: number }[]
  }
}

export function useFirstEditPrep() {
  return useQuery<PrepData>({
    queryKey: ['first-edit-prep'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/first-edit/prep`)
      return res.json()
    }
  })
}

export function useCreatePrepFolder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/first-edit/create-prep-folder`, {
        method: 'POST'
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['first-edit-prep'] })
    }
  })
}
