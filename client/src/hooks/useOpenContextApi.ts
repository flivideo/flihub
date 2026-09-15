// W3 open contract: the brand/project context set by launch args (door 2) or POST /api/context (door 3).
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { OpenContextState } from '../../../shared/types';
import { fetchApi } from './useApi';
import { getSocket } from './useSocket';

export const OPEN_CONTEXT_KEY = ['open-context'] as const;

export function useOpenContext() {
  return useQuery({
    queryKey: OPEN_CONTEXT_KEY,
    queryFn: () => fetchApi<OpenContextState>('/api/context'),
  });
}

// A door re-pointed the running app (C4): the whole UI is now on another root/project — refresh everything,
// exactly as a brand switch does.
export function useContextSocket() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = getSocket();
    const handleContextChanged = () => {
      queryClient.invalidateQueries();
    };
    socket.on('context:changed', handleContextChanged);
    return () => {
      socket.off('context:changed', handleContextChanged);
    };
  }, [queryClient]);
}
