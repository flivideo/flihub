// NFR-architecture-refactor: partitioned into domain files
// This file is a barrel re-export — all hook logic lives in the domain files below.

import { API_URL } from '../config';

// Fetch helper — kept here so domain files can import it from './useApi'
export async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

export * from './useConfigApi.js';
export * from './useRecordingsApi.js';
export * from './useProjectsApi.js';
export * from './useTranscriptionsApi.js';
export * from './useDeveloperApi.js';
export * from './useSystemApi.js';
export * from './useRelayApi.js';
export * from './useSyncApi.js';
export * from './useEditingApi.js';
export * from './useProjectDiskApi.js';
export * from './useHoldApi.js';
export * from './useProjectDictionary.js';
