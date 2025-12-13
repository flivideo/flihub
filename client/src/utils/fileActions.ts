import type { UseMutationResult } from '@tanstack/react-query'

interface TrashResult {
  success: boolean
  trashPath?: string
  error?: string
}

interface DiscardResult {
  successCount: number
  failedCount: number
}

/**
 * Discard multiple files by moving them to trash
 * Centralized logic to avoid duplication across components
 */
export async function discardFiles(
  filePaths: string[],
  trashMutation: UseMutationResult<TrashResult, Error, string>,
  onFileRemoved: (path: string) => void
): Promise<DiscardResult> {
  let successCount = 0
  let failedCount = 0

  for (const path of filePaths) {
    try {
      await trashMutation.mutateAsync(path)
      onFileRemoved(path)
      successCount++
    } catch (error) {
      console.error('Failed to trash file:', path, error)
      failedCount++
    }
  }

  return { successCount, failedCount }
}
