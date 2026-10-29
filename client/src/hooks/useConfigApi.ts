import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  Config,
  EnvironmentResponse,
} from '../../../shared/types';
import { QUERY_KEYS } from '../constants/queryKeys';
import { API_URL } from '../config';
import { fetchApi } from './useApi';

// Config queries
export function useConfig() {
  return useQuery({
    queryKey: QUERY_KEYS.config,
    queryFn: () => fetchApi<Config>('/api/config'),
  });
}

export function useUpdateConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (config: Partial<Config>) =>
      fetchApi<Config>('/api/config', {
        method: 'POST',
        body: JSON.stringify(config),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.config });
      queryClient.invalidateQueries({ queryKey: ['open-context'] }); // W3: a pick can clear a refusal
    },
  });
}

// FR-136: Update global dictionary
export function useUpdateGlobalDictionary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (words: string[]) =>
      fetchApi('/api/config', {
        method: 'POST',
        body: JSON.stringify({ glingDictionary: words }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.config });
      queryClient.invalidateQueries({ queryKey: ['edit-prep'] });
    },
  });
}

// FR-90: Get active file watchers
interface WatcherInfo {
  name: string;
  pattern: string | string[];
  status: 'active' | 'error';
}

export function useWatchers() {
  return useQuery({
    queryKey: QUERY_KEYS.watchers,
    queryFn: () => fetchApi<{ watchers: WatcherInfo[] }>('/api/system/watchers'),
  });
}

// Brand config raw shape
export interface BrandConfigAffiliate {
  name: string;
  url: string;
  active: boolean;
}
export interface BrandConfigRaw {
  brand: { name: string; realName: string; profession: string; tagline: string };
  socialLinks: { website: string; twitter: string; youtubeMain: string; youtubeAITLDR: string; skool: string };
  ctas: { primaryCta: { label: string; url: string }; foldCta: { label: string; url: string } };
  affiliates: BrandConfigAffiliate[];
  descriptionTemplate: { legalDisclosure: string; endNote: string };
  playlists?: Record<string, string>;
  _meta?: Record<string, string>;
}

export function useBrandConfig() {
  return useQuery({
    queryKey: ['brand-config'],
    queryFn: () =>
      fetchApi<{ success: boolean; data: BrandConfigRaw; path: string; managed?: boolean; version?: string | null }>(
        '/api/poem-wui/brand-config'
      ),
  });
}

/** The server refused a brand-config save: `code` is `changed-elsewhere` (409) when another app changed the file. */
export class BrandConfigSaveError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string | undefined
  ) {
    super(message);
  }
}

/** POST the brand config, sending back the `version` it was loaded at (W8: a stale save is refused, never lost). */
export async function postBrandConfig(data: Partial<BrandConfigRaw>, version: string | null | undefined): Promise<unknown> {
  const response = await fetch(`${API_URL}/api/poem-wui/brand-config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(version ? { 'x-brand-config-version': version } : {}) },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string; code?: string };
    throw new BrandConfigSaveError(body.error || 'Request failed', response.status, body.code);
  }
  return response.json();
}

export function useUpdateBrandConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, version }: { data: Partial<BrandConfigRaw>; version: string | null | undefined }) =>
      postBrandConfig(data, version),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brand-config'] });
    },
  });
}

// FR-96: Get server environment info for path format guidance
export function useEnvironment() {
  return useQuery({
    queryKey: ['environment'],
    queryFn: () => fetchApi<EnvironmentResponse>('/api/system/environment'),
    staleTime: Infinity, // Environment won't change during session
  });
}
