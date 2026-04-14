// storage-panel WU5: Recent Activity feed for the Storage panel.
//
// Renders the last N storage actions for a given project (default 10) as a
// collapsible section (default open). One line per action, e.g.:
//
//     • Held — 7 Apr 2026 · 2.7 GB
//
// Data source: GET /api/projects/:code/storage-activity via useStorageActivity.
import { useState } from 'react';
import { useStorageActivity } from '../../../hooks/useStorageApi';
import { formatBytes } from '../../../utils/formatBytes';
import type { StorageActivityAction, StorageActivityEntry } from '../../../../../shared/types';

export interface StorageActivityFeedProps {
  projectCode: string;
  limit?: number;
}

const ACTION_LABEL: Record<StorageActivityAction, string> = {
  'hold': 'Held',
  'restore-held': 'Restored',
  'archive': 'Archived',
  'unarchive': 'Unarchived',
  'held-archive': 'Archived (from held)',
};

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

export function StorageActivityFeed({ projectCode, limit = 10 }: StorageActivityFeedProps) {
  const [open, setOpen] = useState(true);
  const { data, isLoading, error } = useStorageActivity(projectCode, limit);

  const entries: StorageActivityEntry[] = data?.entries ?? [];

  return (
    <section
      data-testid="storage-activity-feed"
      className="mt-4 border border-amber-200 bg-amber-50/40 rounded-md"
    >
      <button
        type="button"
        className="w-full flex items-center justify-between px-3 py-2 text-left text-sm font-medium text-amber-900 hover:bg-amber-100/50"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <span aria-hidden>{open ? '▾' : '▸'}</span>
          Recent activity
        </span>
        <span className="text-xs text-amber-700">{entries.length}</span>
      </button>
      {open && (
        <div className="px-4 pb-3 pt-1">
          {isLoading && (
            <p className="text-xs text-amber-700/80" role="status">Loading…</p>
          )}
          {error && !isLoading && (
            <p className="text-xs text-red-700" role="alert">Failed to load activity.</p>
          )}
          {!isLoading && !error && entries.length === 0 && (
            <p className="text-xs text-amber-700/80">No storage activity yet.</p>
          )}
          {!isLoading && !error && entries.length > 0 && (
            <ul className="space-y-1 text-sm text-amber-950">
              {entries.map((e, i) => (
                <li key={`${e.timestamp}-${i}`} className="flex items-baseline gap-2">
                  <span aria-hidden className="text-amber-700">•</span>
                  <span>
                    <strong className="font-semibold">{ACTION_LABEL[e.action] ?? e.action}</strong>
                    {' — '}
                    {formatDate(e.timestamp)}
                    {' · '}
                    <span className="text-amber-800">{formatBytes(e.sizeBytes)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
