import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ImageInfo, ImageAsset, AssignImageRequest, AssignImageResponse, NextImageOrderResponse, PromptAsset, SavePromptRequest, SavePromptResponse, LoadPromptResponse } from '../../../shared/types'
import { QUERY_KEYS } from '../constants/queryKeys'
import { API_URL } from '../config'

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

// FR-17: Get incoming images from Downloads
export function useIncomingImages() {
  return useQuery({
    queryKey: QUERY_KEYS.incomingImages,
    queryFn: () => fetchApi<{
      images: ImageInfo[]
      duplicates: Array<{ keep: string; duplicate: string }>
    }>('/api/assets/incoming'),
  })
}

// FR-17: Get project images from assets/images/
// FR-22: Now also returns prompts
export function useProjectImages() {
  return useQuery({
    queryKey: QUERY_KEYS.projectImages,
    queryFn: () => fetchApi<{ images: ImageAsset[]; prompts: PromptAsset[] }>('/api/assets/images'),
  })
}

// FR-17: Get next image order for a chapter-sequence
export function useNextImageOrder(chapter: string, sequence: string) {
  return useQuery({
    queryKey: QUERY_KEYS.nextImageOrder(chapter, sequence),
    queryFn: () => fetchApi<NextImageOrderResponse>(
      `/api/assets/next-image-order?chapter=${chapter}&sequence=${sequence}`
    ),
    enabled: !!chapter && !!sequence,
  })
}

// FR-17: Assign an image (rename and move to project)
export function useAssignImage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: AssignImageRequest) =>
      fetchApi<AssignImageResponse>('/api/assets/assign', {
        method: 'POST',
        body: JSON.stringify(request),
      }),
    onSuccess: () => {
      // Invalidate both incoming and project images
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.incomingImages })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projectImages })
      // Invalidate all next-order queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.nextImageOrderPrefix })
    },
  })
}

// FR-17: Delete an incoming image
export function useDeleteIncomingImage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (imagePath: string) =>
      fetchApi<{ success: boolean; error?: string }>(
        `/api/assets/incoming/${encodeURIComponent(imagePath)}`,
        { method: 'DELETE' }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.incomingImages })
    },
  })
}

// FR-17: Refetch incoming images (call after changes)
export function useRefetchIncomingImages() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.incomingImages })
}

// FR-22: Save a prompt file
export function useSavePrompt() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: SavePromptRequest) =>
      fetchApi<SavePromptResponse>('/api/assets/prompt', {
        method: 'POST',
        body: JSON.stringify(request),
      }),
    onSuccess: () => {
      // Invalidate project images (which now includes prompts)
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projectImages })
      // Invalidate all next-order queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.nextImageOrderPrefix })
    },
  })
}

// FR-22: Load a prompt file for editing
export function useLoadPrompt(filename: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.prompt(filename || ''),
    queryFn: () => fetchApi<LoadPromptResponse>(`/api/assets/prompt/${filename}`),
    enabled: !!filename,
  })
}

// FR-38: Delete a prompt file (Option B)
export function useDeletePrompt() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (filename: string) =>
      fetchApi<{ success: boolean; filename: string; deleted: boolean; error?: string }>(
        `/api/assets/prompt/${encodeURIComponent(filename)}`,
        { method: 'DELETE' }
      ),
    onSuccess: () => {
      // Invalidate project images (which now includes prompts)
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projectImages })
      // Invalidate all next-order queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.nextImageOrderPrefix })
    },
  })
}

// FR-49: Delete an assigned image (move to trash)
export function useDeleteAssignedImage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (filename: string) =>
      fetchApi<{ success: boolean; filename: string; deleted: boolean; trashPath?: string; error?: string }>(
        `/api/assets/images/${encodeURIComponent(filename)}`,
        { method: 'DELETE' }
      ),
    onSuccess: () => {
      // Invalidate project images
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projectImages })
      // Invalidate all next-order queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.nextImageOrderPrefix })
    },
  })
}

// FR-42: Clipboard paste - assign directly to assets
interface ClipboardAssignRequest {
  imageData: string  // Base64 data URL
  chapter: string
  sequence: string
  imageOrder: string
  variant: string | null
  label: string
}

export function useClipboardAssign() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: ClipboardAssignRequest) =>
      fetchApi<{ success: boolean; filename: string; path: string; error?: string }>(
        '/api/assets/clipboard/assign',
        {
          method: 'POST',
          body: JSON.stringify(request),
        }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projectImages })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.nextImageOrderPrefix })
    },
  })
}

// FR-42: Clipboard paste - save to incoming folder
export function useClipboardToIncoming() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (imageData: string) =>
      fetchApi<{ success: boolean; filename: string; path: string; error?: string }>(
        '/api/assets/clipboard/incoming',
        {
          method: 'POST',
          body: JSON.stringify({ imageData }),
        }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.incomingImages })
    },
  })
}
