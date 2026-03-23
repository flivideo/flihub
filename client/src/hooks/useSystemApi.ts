import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { API_URL } from '../config';

// FR-64: Open inbox file in external application (browser for HTML)
export function useOpenInboxFile() {
  return useMutation({
    mutationFn: async ({ subfolder, filename }: { subfolder: string; filename: string }) => {
      const res = await fetch(`${API_URL}/api/system/open-file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subfolder, filename }),
      });
      if (!res.ok) {
        const data = await res.json();
        if (data.path) {
          try {
            await navigator.clipboard.writeText(data.path);
            toast.warning(`Couldn't open file — path copied to clipboard`);
            return data;
          } catch { /* clipboard failed, fall through to error */ }
        }
        throw new Error(data.error || 'Failed to open file');
      }
      return res.json() as Promise<{ success: boolean; path: string; windowsPath?: string }>;
    },
    onSuccess: (data) => {
      if (data.windowsPath) {
        toast.success(`Opened: ${data.windowsPath}`);
      } else if (data.success) {
        toast.success('File opened');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to open file');
    },
  });
}
