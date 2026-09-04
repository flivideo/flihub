/**
 * FR-161: B-roll lane — chapter-less source media, outside the recording flow.
 * Thin list: play inline, delete to -trash/. Files arrive via Incoming → "B-roll" promote.
 */
import { useState } from 'react';
import { toast } from 'sonner';
import { useBrollList, useDeleteBroll } from '../hooks/useBrollApi';
import { useRecordings } from '../hooks/useApi';
import { API_URL } from '../config';

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

export function BRollPage() {
  const { data, isLoading } = useBrollList();
  const { data: recordingsData } = useRecordings();
  const deleteBroll = useDeleteBroll();
  const [playing, setPlaying] = useState<string | null>(null);

  const projectCode = recordingsData?.project?.code;
  const files = data?.files ?? [];

  const handleDelete = async (filename: string) => {
    try {
      const result = await deleteBroll.mutateAsync(filename);
      if (result.success) {
        toast.info(`Moved to trash: ${filename}`);
        if (playing === filename) setPlaying(null);
      } else {
        toast.error(result.error || 'Failed to delete');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete');
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-lg font-medium text-warm-secondary">B-Roll</h2>
        <span className="text-sm text-warm-muted">
          {files.length} file{files.length !== 1 ? 's' : ''} · chapter-less source media —
          promoted from Incoming, never transcribed, no shadows
        </span>
      </div>

      {isLoading ? (
        <p className="text-warm-muted">Loading…</p>
      ) : files.length === 0 ? (
        <div className="text-center py-12 bg-surface rounded-lg border border-warm">
          <p className="text-warm-muted">No b-roll yet</p>
          <p className="text-sm text-warm-muted mt-1">
            Record with Ecamm, then press <span className="font-medium">B-roll</span> on the
            incoming file (name it first — no chapter needed).
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {files.map((f) => (
            <div key={f.filename} className="bg-surface rounded-lg border border-warm p-3">
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() => setPlaying(playing === f.filename ? null : f.filename)}
                  className="text-blue-600 hover:text-blue-700 flex-shrink-0"
                  title={playing === f.filename ? 'Hide preview' : 'Play'}
                >
                  {playing === f.filename ? '⏹' : '▶'}
                </button>
                <span className="font-mono text-sm text-warm-primary truncate flex-grow">
                  {f.filename}
                </span>
                <span className="text-xs text-warm-muted font-mono flex-shrink-0">
                  {formatSize(f.size)}
                </span>
                <span
                  className="text-xs text-warm-muted flex-shrink-0"
                  title={new Date(f.timestamp).toLocaleString()}
                >
                  {new Date(f.timestamp).toLocaleDateString()}
                </span>
                <button
                  onClick={() => handleDelete(f.filename)}
                  disabled={deleteBroll.isPending}
                  className="text-sm text-warm-muted hover:text-red-600 flex-shrink-0"
                  title="Move to -trash/ (recoverable)"
                >
                  Delete
                </button>
              </div>
              {playing === f.filename && projectCode && (
                <video
                  controls
                  autoPlay
                  className="mt-3 w-full max-h-96 rounded"
                  src={`${API_URL}/api/video/${projectCode}/b-roll/${encodeURIComponent(f.filename)}`}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
