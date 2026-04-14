// WU5: StorageTool demoted to a read-only per-project summary + "Manage in
// Archive →" escape hatch. All offload / restore / delete mutation calls,
// the 9-state mutually-exclusive action UI, and the HoldDeleteModal launch
// site that used to live here have all moved to ArchiveTool.tsx.
//
// The sidebar entry stays (labelled "Storage") so users who opened this tool
// historically still land somewhere useful — they see the current state of
// the active project and can click through to the unified Archive tool.
//
// Why the tool survives at all: it's the only place that shows per-project
// hold status + SSD mount state at a glance without scanning the Archive
// table. Cheap read-only convenience; no actions.

import { useSsdStatus, useHoldStatus } from '../../hooks/useHoldApi';
import { formatBytes } from '../../utils/formatBytes';

interface StorageToolProps {
  projectCode: string;
  // WU5: required callback — "Manage in Archive →" button.
  onNavigateToArchive?: (projectCode: string) => void;
}

export function StorageTool({ projectCode, onNavigateToArchive }: StorageToolProps) {
  const ssdStatus = useSsdStatus();
  const holdStatus = useHoldStatus(projectCode || null);

  if (!projectCode) {
    return (
      <div className="flex items-center justify-center h-64 text-warm-muted text-sm">
        No project selected
      </div>
    );
  }

  const hs = holdStatus.data;
  const ssd = ssdStatus.data;
  const ssdConfigured = ssd?.configured ?? false;
  const ssdMounted = ssd?.ssdMounted ?? false;
  const location = hs?.location ?? 'unknown';
  const ver = hs?.verification;
  const localBytes = ver?.localBytes ?? 0;
  const heldBytes = ver?.holdingBytes ?? 0;

  const locationLabel =
    location === 'local-only'
      ? 'Local only'
      : location === 'holding-only'
        ? 'On T7 SSD (local deleted)'
        : location === 'both'
          ? 'Both local and T7'
          : 'Unknown';

  return (
    <div className="space-y-4 max-w-md">
      <div className="space-y-1">
        <h4 className="text-[10px] font-bold uppercase tracking-wide text-warm-faint">SSD Status</h4>
        {ssdConfigured ? (
          <span
            className={`flex items-center gap-1.5 text-[11px] ${ssdMounted ? 'text-green-700' : 'text-warm-muted'}`}
          >
            <span className={`w-[7px] h-[7px] rounded-full ${ssdMounted ? 'bg-green-600' : 'bg-warm-muted'}`} />
            {ssdMounted ? 'T7 connected' : 'T7 not connected'}
          </span>
        ) : (
          <p className="text-sm text-warm-muted">SSD offload not configured.</p>
        )}
      </div>

      <div className="bg-surface-muted border border-warm rounded-lg p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wide text-warm-faint">
            {projectCode}
          </span>
          <span className="text-xs font-medium text-warm-secondary">{locationLabel}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-warm-muted">Local</span>
          <span className="tabular-nums text-warm-secondary">{formatBytes(localBytes)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-warm-muted">T7</span>
          <span className="tabular-nums text-warm-secondary">{formatBytes(heldBytes)}</span>
        </div>
      </div>

      <button
        onClick={() => onNavigateToArchive?.(projectCode)}
        disabled={!onNavigateToArchive}
        className="w-full py-2 px-4 text-sm font-medium rounded-md border border-warm bg-surface-muted hover:bg-warm text-warm-primary transition-colors disabled:opacity-50"
      >
        Manage in Archive →
      </button>
    </div>
  );
}
