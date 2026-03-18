import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '../constants/queryKeys';
import { fetchApi } from './useApi';

// FR-127: Developer Tools - Project State
export function useDeveloperProjectState() {
  return useQuery({
    queryKey: QUERY_KEYS.developerProjectState,
    queryFn: () =>
      fetchApi<{
        success: boolean;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        content: any;
        filePath: string;
        size: number;
        lastModified: string;
        note?: string;
      }>('/api/developer/project-state'),
  });
}

// FR-127: Developer Tools - Config
export function useDeveloperConfig() {
  return useQuery({
    queryKey: QUERY_KEYS.developerConfig,
    queryFn: () =>
      fetchApi<{
        success: boolean;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        content: any;
        filePath: string;
        size: number;
        lastModified: string;
      }>('/api/developer/config'),
  });
}

// FR-127: Developer Tools - Telemetry
export function useDeveloperTelemetry() {
  return useQuery({
    queryKey: QUERY_KEYS.developerTelemetry,
    queryFn: () =>
      fetchApi<{
        success: boolean;
        content: string;
        filePath: string;
        size: number;
        lastModified: string;
        lineCount: number;
        note?: string;
      }>('/api/developer/telemetry'),
  });
}
