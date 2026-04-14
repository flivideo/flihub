// storage-panel WU2: Shared invalidation helper for storage mutations.
//
// DVR-BH-001 lesson from the archive-tool campaign: a storage mutation (Hold /
// Restore / Archive / Unarchive) shifts bytes between local and T7 — every
// consumer that displays project bytes or storage state must be re-fetched.
// Calling a bespoke list in each mutation is how we missed an invalidation
// last round, so the full set lives here and every mutation's `onSuccess`
// calls this helper.
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../constants/queryKeys';

export function useInvalidateProjectStorage() {
  const qc = useQueryClient();
  return (projectCode: string) => {
    qc.invalidateQueries({ queryKey: QUERY_KEYS.storageTree(projectCode) });
    qc.invalidateQueries({ queryKey: QUERY_KEYS.archiveInventory });
    qc.invalidateQueries({ queryKey: QUERY_KEYS.holdStatus(projectCode) });
    qc.invalidateQueries({ queryKey: QUERY_KEYS.projectDisk(projectCode) });
    qc.invalidateQueries({ queryKey: QUERY_KEYS.relayBrowse });
    // WU5: also bump the activity feed so the latest entry appears immediately.
    // P4: use factory to keep prefix consistent with QUERY_KEYS.storageActivity.
    qc.invalidateQueries({ queryKey: QUERY_KEYS.storageActivityBase(projectCode) });
  };
}
