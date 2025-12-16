// FR-29: Hook to open folders in Finder
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { API_URL } from '../config'

export type FolderKey = 'ecamm' | 'downloads' | 'recordings' | 'safe' | 'trash' | 'images' | 'thumbs' | 'transcripts' | 'project' | 'final' | 's3Staging' | 'inbox' | 'shadows' | 'chapters'

export interface OpenFolderOptions {
  folder: FolderKey
  projectCode?: string  // Optional: open folder for specific project instead of current
}

export function useOpenFolder() {
  return useMutation({
    mutationFn: async (options: FolderKey | OpenFolderOptions) => {
      // Support both simple string and options object for backwards compatibility
      const body = typeof options === 'string'
        ? { folder: options }
        : options

      const res = await fetch(`${API_URL}/api/system/open-folder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to open folder')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Folder opened')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}
