import type { UseMutationResult } from '@tanstack/react-query';

interface TrashResult {
  success: boolean;
  trashPath?: string;
  error?: string;
}

interface DiscardResult {
  successCount: number;
  failedCount: number;
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
  let successCount = 0;
  let failedCount = 0;

  for (const path of filePaths) {
    try {
      await trashMutation.mutateAsync(path);
      onFileRemoved(path);
      successCount++;
    } catch (error) {
      console.error('Failed to trash file:', path, error);
      failedCount++;
    }
  }

  return { successCount, failedCount };
}

/**
 * FR-174: Rename · Discard — trash every OTHER incoming file, never the one just renamed.
 */
export function discardOtherIncoming(
  incomingPaths: string[],
  renamedPath: string,
  trashMutation: UseMutationResult<TrashResult, Error, string>,
  onFileRemoved: (path: string) => void
): Promise<DiscardResult> {
  return discardFiles(
    incomingPaths.filter((p) => p !== renamedPath),
    trashMutation,
    onFileRemoved
  );
}

/** FR-174: "Renamed to: 05-6-x.mov; moved 2 other files to trash" — the toast names the trash count. */
export function describeRenameDiscard(summary: string, result: DiscardResult): string {
  const { successCount, failedCount } = result;
  const moved = `moved ${successCount} other file${successCount === 1 ? '' : 's'} to trash`;
  const failed = failedCount > 0 ? ` (${failedCount} could not be trashed)` : '';
  return `${summary}; ${moved}${failed}`;
}
