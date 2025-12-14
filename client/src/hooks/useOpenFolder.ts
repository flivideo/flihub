// FR-29: Hook to open folders in Finder
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { API_URL } from '../config'

export type FolderKey = 'ecamm' | 'downloads' | 'recordings' | 'safe' | 'trash' | 'images' | 'thumbs' | 'transcripts' | 'project' | 'final' | 's3Staging' | 'inbox'

export function useOpenFolder() {
  return useMutation({
    mutationFn: async (folder: FolderKey) => {
      const res = await fetch(`${API_URL}/api/system/open-folder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to open folder')
      }
      return res.json()
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}
