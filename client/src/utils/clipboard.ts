// FR-148: Shared transcript copy utility
import { toast } from 'sonner';
import { API_URL } from '../config';

/**
 * Copy a project's combined transcript to the clipboard.
 * Shows toast feedback on success/failure.
 */
export async function copyProjectTranscript(code: string): Promise<void> {
  try {
    const res = await fetch(`${API_URL}/api/query/projects/${code}/transcript/text`);
    if (!res.ok) {
      throw new Error('Failed to fetch transcript');
    }
    const text = await res.text();

    if (!text.trim()) {
      toast.error('No transcript content available');
      return;
    }

    await navigator.clipboard.writeText(text);
    toast.success(`Transcript copied (${text.length.toLocaleString()} chars)`);
  } catch (error) {
    toast.error('Failed to copy transcript');
  }
}
