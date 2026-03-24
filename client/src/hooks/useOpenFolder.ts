// FR-29: Hook to open folders in Finder
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { API_URL } from '../config';
import type { FolderKey } from '../../../shared/types';

export type { FolderKey };

export interface OpenFolderOptions {
  folder: FolderKey;
  projectCode?: string; // Optional: open folder for specific project instead of current
}

export function useOpenFolder() {
  return useMutation({
    mutationFn: async (options: FolderKey | OpenFolderOptions) => {
      // Support both simple string and options object for backwards compatibility
      const body = typeof options === 'string' ? { folder: options } : options;

      const res = await fetch(`${API_URL}/api/system/open-folder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        // Copy path to clipboard as fallback when folder can't be opened
        if (data.path) {
          try {
            await navigator.clipboard.writeText(data.path);
            toast.warning(`Couldn't open folder — path copied to clipboard`);
            return data;
          } catch { /* clipboard failed, fall through to error */ }
        }
        throw new Error(data.error || 'Failed to open folder');
      }
      return res.json();
    },
    onSuccess: (data: { success: boolean; path: string; windowsPath?: string }) => {
      if (data.windowsPath) {
        toast.success(`Opened: ${data.windowsPath}`);
      } else if (data.success) {
        toast.success('Folder opened');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
