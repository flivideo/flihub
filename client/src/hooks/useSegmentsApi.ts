// CT-0107: segment editing — replace / insert / reorder / delete-and-close-up, and undo (server: routes/segments.ts)
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { API_URL } from '../config';
import { QUERY_KEYS } from '../constants/queryKeys';

export type SegmentOpRequest =
  | {
      mode: 'replace';
      chapter: string;
      segment: number;
      source: string;
      name?: string;
      tags?: string[];
    }
  | {
      mode: 'insert';
      chapter: string;
      before: number;
      source: string;
      name: string;
      tags?: string[];
    }
  | { mode: 'reorder'; chapter: string; segment: number; direction: 'up' | 'down' }
  | { mode: 'delete'; chapter: string; segment: number };

export interface SegmentOpResult {
  success: boolean;
  /** True when the server declined the whole operation; nothing on disk changed. */
  refused?: boolean;
  /** Plain words: why it was refused or what failed. */
  reason?: string;
  blockers?: Array<{ kind: string; file?: string; detail: string }>;
  op?: { id: string; summary: string; promoted: string | null };
}

/** A refusal (409) is an answer, not an exception: it carries the reason the UI must show. */
async function post(endpoint: string, body: unknown): Promise<SegmentOpResult> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const result = (await response.json().catch(() => null)) as SegmentOpResult | null;
  return (
    result ?? { success: false, reason: `The server answered ${response.status} with no detail.` }
  );
}

function useSegmentMutation<T>(endpoint: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: T) => post(endpoint, body),
    onSuccess: (result) => {
      if (!result.success) return;
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.recordings });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.trashSummaryBase });
    },
  });
}

export function useSegmentOp() {
  return useSegmentMutation<SegmentOpRequest>('/api/segments/op');
}

export function useSegmentUndo() {
  return useSegmentMutation<{ id?: string }>('/api/segments/undo');
}

/** R7: mark or unmark a segment as a placeholder to re-record. */
export function useSegmentPlaceholder() {
  return useSegmentMutation<{ filename: string; placeholder: boolean }>(
    '/api/segments/placeholder'
  );
}
