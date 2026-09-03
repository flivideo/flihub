// Brand dropdown: list brands and switch the whole app to another brand root.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from './useApi';

export interface BrandInfo {
  key: string;
  name: string;
  root: string;
  publishedPath: string | null;
  holdingPath: string | null;
  source: 'brands.json' | 'disk';
  active: boolean;
}

export function useBrands() {
  return useQuery({
    queryKey: ['brands'],
    queryFn: () =>
      fetchApi<{ success: boolean; brands: BrandInfo[]; activeKey: string | null }>('/api/brands'),
  });
}

export function useSwitchBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (key: string) =>
      fetchApi<{ success: boolean; brand?: { key: string; name: string; root: string }; error?: string }>(
        '/api/brands/switch',
        { method: 'POST', body: JSON.stringify({ key }) }
      ),
    onSuccess: () => {
      // The whole UI is now pointed at a different root — refresh everything.
      // ⚠️ FR-163 depends on this sweep: an open New Project form recomputes its
      // pre-filled code via QUERY_KEYS.nextProjectCode (AC 15). If this is ever
      // narrowed to specific keys, that key MUST stay in the list — a stale code
      // creates a real folder in the new root under the old brand's series.
      queryClient.invalidateQueries();
    },
  });
}
