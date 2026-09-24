// 2026-09-25 (David, live on d01): after Undo, renaming again gave 01-2 and the template offered
// Seq 3 — the Naming Template kept its own counter that only goes up. The sequence must come
// from the files on disk, fetched fresh (a cached list still holds the undone take).
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useFetchRecordingsOnDisk } from '../hooks/useRecordingsApi';
import { nextSequenceOnDisk } from '../../../shared/naming';
import { QUERY_KEYS } from '../constants/queryKeys';

afterEach(() => vi.unstubAllGlobals());

describe('useFetchRecordingsOnDisk + nextSequenceOnDisk', () => {
  it('after an undo, reads disk fresh (not the cache) and offers the freed number', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    // Stale cache from before the undo: 01-1 and 01-2 both existed
    qc.setQueryData(QUERY_KEYS.suggestedNaming, {
      chapter: '01', sequence: '3', name: 'intro', existingFiles: ['01-1-intro-HOOK.mov', '01-2-intro-HOOK.mov'],
    });
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ chapter: '01', sequence: '2', name: 'intro', existingFiles: ['01-1-intro-HOOK.mov'] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;

    const { result } = renderHook(() => useFetchRecordingsOnDisk(), { wrapper });
    const onDisk = await result.current();
    expect(onDisk).toEqual(['01-1-intro-HOOK.mov']);
    expect(nextSequenceOnDisk(onDisk, '01')).toBe('2');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
