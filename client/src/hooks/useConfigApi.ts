import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  Config,
  EnvironmentResponse,
} from '../../../shared/types';
import { QUERY_KEYS } from '../constants/queryKeys';
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
    queryFn: () => fetchApi<{ success: boolean; data: BrandConfigRaw; path: string }>('/api/poem-wui/brand-config'),
  });
}

export function useUpdateBrandConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<BrandConfigRaw>) =>
      fetchApi('/api/poem-wui/brand-config', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
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
