// storage-panel Wave-B review P6: contract test for useInvalidateProjectStorage.
//
// DVR-BH-001 guard — every storage mutation invalidates a fixed set of caches.
// If anyone silently drops an entry, archive-inventory / project-disk /
// hold-status / relay-browse / storage-activity will go stale and the Storage
// UI will lie to the user. This test pins the set.
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useInvalidateProjectStorage } from '../hooks/useInvalidateProjectStorage';
import { QUERY_KEYS } from '../constants/queryKeys';
import type { ReactNode } from 'react';

describe('useInvalidateProjectStorage', () => {
  it('invalidates exactly the 6 known caches (storageTree, archiveInventory, holdStatus, projectDisk, relayBrowse, storageActivityBase)', () => {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const spy = vi.spyOn(qc, 'invalidateQueries');
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useInvalidateProjectStorage(), { wrapper });
    result.current('test-code');

    // Collect the queryKey arg each call was made with.
    const calledKeys = spy.mock.calls.map((c) => (c[0] as { queryKey: unknown }).queryKey);

    expect(calledKeys).toContainEqual(QUERY_KEYS.storageTree('test-code'));
    expect(calledKeys).toContainEqual(QUERY_KEYS.archiveInventory);
    expect(calledKeys).toContainEqual(QUERY_KEYS.holdStatus('test-code'));
    expect(calledKeys).toContainEqual(QUERY_KEYS.projectDisk('test-code'));
    expect(calledKeys).toContainEqual(QUERY_KEYS.relayBrowse);
    expect(calledKeys).toContainEqual(QUERY_KEYS.storageActivityBase('test-code'));

    // Pin the total so a silent drop fails loudly.
    expect(spy).toHaveBeenCalledTimes(6);
  });
});
