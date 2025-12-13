import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '../constants/queryKeys'
import { API_URL } from '../config'

// Types
export interface ThumbInfo {
  filename: string
  path: string
  size: number
  timestamp: string
  order: number
}

export interface ZipInfo {
  filename: string
  path: string
  size: number
  timestamp: string
  imageCount: number
}

export interface ZipImagePreview {
  name: string
  size: number
  dataUrl: string
}

// Fetch helper
async function fetchApi<T>(
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

// FR-27: Get list of ZIP files in Downloads that contain images
// NFR-5: Real-time updates via socket events (useThumbsSocket)
export function useZipFiles() {
  return useQuery({
    queryKey: QUERY_KEYS.thumbZips,
    queryFn: () => fetchApi<{ zips: ZipInfo[] }>('/api/thumbs/zips'),
  })
}

// FR-27: Get contents of a specific ZIP file
export function useZipContents(filename: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.thumbZipContents(filename || ''),
    queryFn: () => fetchApi<{ images: ZipImagePreview[] }>(
      `/api/thumbs/zip/${encodeURIComponent(filename!)}/contents`
    ),
    enabled: !!filename,
  })
}

// FR-27: Get current thumbnails
// Manual refresh only (thumbs folder changes per project)
export function useThumbs() {
  return useQuery({
    queryKey: QUERY_KEYS.thumbs,
    queryFn: () => fetchApi<{ thumbs: ThumbInfo[] }>('/api/thumbs'),
    staleTime: 0, // Always consider stale so refetch() always hits the server
  })
}

// FR-27: Import selected images from a ZIP file
export function useImportFromZip() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: { zipFilename: string; selectedImages: string[] }) =>
      fetchApi<{ success: boolean; imported: string[]; count: number }>('/api/thumbs/import', {
        method: 'POST',
        body: JSON.stringify(request),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.thumbs })
    },
  })
}

// FR-27: Reorder thumbnails
export function useReorderThumbs() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (order: string[]) =>
      fetchApi<{ success: boolean }>('/api/thumbs/reorder', {
        method: 'POST',
        body: JSON.stringify({ order }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.thumbs })
    },
  })
}

// FR-27: Delete a thumbnail
export function useDeleteThumb() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (filename: string) =>
      fetchApi<{ success: boolean }>(
        `/api/thumbs/${encodeURIComponent(filename)}`,
        { method: 'DELETE' }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.thumbs })
    },
  })
}

// FR-27: Refetch thumbs
export function useRefetchThumbs() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.thumbs })
}

// FR-27: Refetch ZIP files
export function useRefetchZips() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.thumbZips })
}

// FR-27: Delete a ZIP file from Downloads
export function useDeleteZip() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (filename: string) =>
      fetchApi<{ success: boolean; deleted: string }>(
        `/api/thumbs/zip/${encodeURIComponent(filename)}`,
        { method: 'DELETE' }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.thumbZips })
    },
  })
}
