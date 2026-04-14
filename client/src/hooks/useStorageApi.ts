// storage-panel WU2: React Query hooks for the Storage panel.
//
// Backs GET /api/projects/:code/storage-tree + the four mutation endpoints
// (POST hold / restore-held / archive / unarchive). Every mutation calls the
// shared `useInvalidateProjectStorage` helper on success so related caches
// (storage-tree, archive-inventory, hold-status, project-disk, relay-browse)
// all re-fetch — this is the DVR-BH-001 lesson; don't skip it.
//
// Response envelope (P5 from WU1): mutations return a flat
// `{ success, newState?, error? }` shape. We surface errors via toast and
// return the response so the component can react to `newState`.
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { API_URL } from '../config';
import { QUERY_KEYS } from '../constants/queryKeys';
import { useInvalidateProjectStorage } from './useInvalidateProjectStorage';
import type {
  StorageTreeResponse,
  StorageMutationResponse,
  StorageActivityResponse,
} from '../../../shared/types';

export function useStorageTree(projectCode: string | null | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.storageTree(projectCode ?? ''),
    enabled: Boolean(projectCode),
    queryFn: async (): Promise<StorageTreeResponse> => {
      const res = await fetch(
        `${API_URL}/api/projects/${encodeURIComponent(projectCode!)}/storage-tree`,
      );
      if (!res.ok) {
        throw new Error(`Storage API error: ${res.status} ${res.statusText}`);
      }
      return (await res.json()) as StorageTreeResponse;
    },
    refetchInterval: 30000,
  });
}

async function postMutation(code: string, verb: string): Promise<StorageMutationResponse> {
  const res = await fetch(
    `${API_URL}/api/projects/${encodeURIComponent(code)}/${verb}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' } },
  );
  // Server returns 4xx/5xx with a structured body — parse regardless.
  let body: StorageMutationResponse;
  try {
    body = (await res.json()) as StorageMutationResponse;
  } catch {
    body = { success: false, error: `HTTP ${res.status} ${res.statusText}` };
  }
  return body;
}

function buildMutation(
  verb: 'hold' | 'restore-held' | 'archive' | 'unarchive' | 'held-archive',
  successLabel: string,
) {
  return function useStorageMutation() {
    const invalidate = useInvalidateProjectStorage();
    return useMutation({
      mutationFn: async (projectCode: string): Promise<StorageMutationResponse> =>
        postMutation(projectCode, verb),
      onSuccess: (data, projectCode) => {
        invalidate(projectCode);
        if (data.success) {
          toast.success(successLabel);
        } else {
          toast.error(data.error || `${successLabel} failed`);
        }
      },
      onError: () => toast.error(`${successLabel} failed`),
    });
  };
}

export const useHoldProject = buildMutation('hold', 'Held heavy files to T7');
export const useRestoreHeld = buildMutation('restore-held', 'Restored heavy files from T7');
export const useArchiveProject = buildMutation('archive', 'Archived project to T7');
export const useUnarchiveProject = buildMutation('unarchive', 'Unarchived project from T7');
// P1 (review): atomic Held → Archive. Replaces the former client-side
// restore-then-archive chain that could leave an orphan HOLDING copy.
export const useHeldArchiveProject = buildMutation('held-archive', 'Archived held project to T7');

// storage-panel WU5: recent storage activity (hold / restore-held / archive /
// unarchive) for a given project. Backed by GET /api/projects/:code/storage-activity.
export function useStorageActivity(projectCode: string | null | undefined, limit: number = 10) {
  return useQuery({
    queryKey: QUERY_KEYS.storageActivity(projectCode ?? '', limit),
    enabled: Boolean(projectCode),
    queryFn: async (): Promise<StorageActivityResponse> => {
      const res = await fetch(
        `${API_URL}/api/projects/${encodeURIComponent(projectCode!)}/storage-activity?limit=${limit}`,
      );
      if (!res.ok) {
        throw new Error(`Storage activity API error: ${res.status} ${res.statusText}`);
      }
      return (await res.json()) as StorageActivityResponse;
    },
  });
}
