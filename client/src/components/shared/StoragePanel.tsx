// storage-panel WU2: Per-active-project Storage panel.
//
// Shape mirrors RelayTool.tsx — title `Storage — <projectCode>`, state pill
// on the right, body, footer with project path + T7 status. The tree IS the
// main content (not a confirmation modal): Heavy/Light classification is read
// from the server response, never duplicated in the UI.
//
// Action button layout is state-aware:
//   active   → Hold + Archive
//   held     → Restore + Archive-everything (shortcut = Restore-then-Archive)
//   archived → no primary actions; bottom-of-panel Unarchive link
//
// All four mutations route through `useStorageApi`, which calls
// `useInvalidateProjectStorage()` on success so storage-tree + archive-
// inventory + hold-status + project-disk + relay-browse all re-fetch.
// (DVR-BH-001 — don't skip invalidation.)
//
// Held → Archive shortcut is a CLIENT-side chain: the backend refuses an
// atomic held→archive by design (WU1, deferred DVR-AA-002), so we restore
// first then archive on success.
//
// WU5 will replace the `data-slot="activity-feed"` placeholder with a real
// StorageActivityFeed — this panel deliberately does NOT import WU5 files.
import { useState } from 'react';
import {
  useStorageTree,
  useHoldProject,
  useRestoreHeld,
  useArchiveProject,
  useUnarchiveProject,
  useHeldArchiveProject,
} from '../../hooks/useStorageApi';
import { useConfig } from '../../hooks/useApi';
import { formatBytes } from '../../utils/formatBytes';
import {
  StorageStateHeader,
  StorageTree,
  StorageActions,
  ConfirmPopover,
  StorageActivityFeed,
} from './storage';

export interface StoragePanelProps {
  projectCode: string;
  /** Brand is currently unused by the panel (server derives paths from config),
   * but accepted so callers can pass it without TS errors and future changes
   * can surface it without a prop-churn. */
  brand?: string;
}

export function StoragePanel({ projectCode }: StoragePanelProps) {
  const { data: config } = useConfig();
  const { data: tree, isLoading, error, refetch } = useStorageTree(projectCode);

  // P2 (review): defense-in-depth. If the caller deep-linked into Storage for
  // project X but the active project is still Y (config mutation in flight /
  // not yet propagated), show a brief gate so we don't query the wrong tree.
  const activeProject = config?.activeProject;
  if (projectCode && activeProject && projectCode !== activeProject) {
    return (
      <div className="flex items-center justify-center h-64 text-warm-muted text-sm">
        Switching project…
      </div>
    );
  }
  const hold = useHoldProject();
  const restore = useRestoreHeld();
  const archive = useArchiveProject();
  const unarchive = useUnarchiveProject();
  const heldArchive = useHeldArchiveProject();

  // Tracks which button is currently running, so the UI can disable others +
  // render the "Holding…" label. `held-archive` is the two-step chain.
  const [pendingAction, setPendingAction] =
    useState<null | 'hold' | 'restore' | 'archive' | 'held-archive'>(null);
  const [unarchivePopoverOpen, setUnarchivePopoverOpen] = useState(false);

  if (!projectCode) {
    return (
      <div className="flex items-center justify-center h-64 text-warm-muted text-sm">
        No project selected.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-warm-muted text-sm">
        Loading storage…
      </div>
    );
  }

  if (error || !tree) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-2">
        <p className="text-sm text-red-700">Failed to load storage tree.</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="px-3 py-1 text-xs border border-warm rounded bg-surface-muted hover:bg-warm"
        >
          Retry
        </button>
      </div>
    );
  }

  const handleHold = () => {
    setPendingAction('hold');
    hold.mutate(projectCode, {
      onSettled: () => setPendingAction(null),
    });
  };

  const handleRestore = () => {
    setPendingAction('restore');
    restore.mutate(projectCode, {
      onSettled: () => setPendingAction(null),
    });
  };

  const handleArchive = () => {
    setPendingAction('archive');
    archive.mutate(projectCode, {
      onSettled: () => setPendingAction(null),
    });
  };

  // Held → Archive: single atomic server endpoint (P1, review patch).
  // The previous client-side chain (restore-then-archive) left an orphan
  // HOLDING copy mid-sequence, flipping the tree into `degraded`.
  const handleHeldArchive = () => {
    setPendingAction('held-archive');
    heldArchive.mutate(projectCode, {
      onSettled: () => setPendingAction(null),
    });
  };

  const handleUnarchive = () => {
    setPendingAction('archive'); // reuse label; archived state has no other actions
    unarchive.mutate(projectCode, {
      onSettled: () => setPendingAction(null),
    });
  };

  return (
    <div data-testid="storage-panel" className="flex flex-col gap-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-warm-primary">
          Storage — <span className="font-mono">{projectCode}</span>
        </h3>
        <StorageStateHeader state={tree.state} />
      </div>

      {/* Degraded banner */}
      {tree.degraded && (
        <div
          data-testid="storage-degraded-banner"
          className="bg-red-50 border border-red-300 text-red-800 text-xs rounded px-3 py-2"
        >
          <strong>Degraded:</strong> {tree.error || 'storage is in an ambiguous state'}
        </div>
      )}

      {/* Action buttons */}
      <StorageActions
        state={tree.state}
        heavyBytes={tree.sizes.heavyTotal}
        heldBytes={tree.sizes.heldTotal}
        localBytes={tree.sizes.localTotal}
        ssdMounted={tree.ssdMounted}
        degraded={Boolean(tree.degraded)}
        degradedReason={tree.error}
        relayBlocked={tree.relayBlocked}
        relayBytes={tree.relayBytes}
        pendingAction={pendingAction}
        onHold={handleHold}
        onRestore={handleRestore}
        onArchive={handleArchive}
        onHeldArchive={handleHeldArchive}
      />

      {/* Tree section */}
      <section className="border border-warm rounded-md p-3 bg-surface-muted">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-[10px] font-bold uppercase tracking-wide text-warm-faint">
            Project tree
          </h4>
          <div className="text-[11px] text-warm-muted tabular-nums">
            local {formatBytes(tree.sizes.localTotal)}
            {tree.sizes.heldTotal > 0 && (
              <> · held {formatBytes(tree.sizes.heldTotal)}</>
            )}
            {tree.sizes.archivedTotal > 0 && (
              <> · archived {formatBytes(tree.sizes.archivedTotal)}</>
            )}
          </div>
        </div>
        <StorageTree nodes={tree.nodes} state={tree.state} />
      </section>

      {/* WU5: Recent storage activity feed. */}
      <StorageActivityFeed projectCode={projectCode} />

      {/* Archived-state bottom link: Unarchive → */}
      {tree.state === 'archived' && (
        <div className="relative flex justify-start pt-2 border-t border-warm/50">
          <button
            type="button"
            data-testid="action-unarchive"
            disabled={!tree.ssdMounted || tree.degraded || pendingAction !== null}
            onClick={() => setUnarchivePopoverOpen(true)}
            className="text-sm text-warm-primary underline underline-offset-2 hover:text-warm-secondary disabled:opacity-50"
          >
            Unarchive →
          </button>
          {unarchivePopoverOpen && (
            <ConfirmPopover
              title="Unarchive project?"
              body={`${formatBytes(tree.sizes.archivedTotal)} will be copied back from T7 PUBLISHED to local. The T7 copy stays.`}
              confirmLabel="Unarchive"
              confirmTestId="confirm-unarchive"
              cancelTestId="cancel-unarchive"
              onConfirm={() => {
                setUnarchivePopoverOpen(false);
                handleUnarchive();
              }}
              onCancel={() => setUnarchivePopoverOpen(false)}
            />
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-warm/50 text-[11px] text-warm-muted">
        <span className="truncate font-mono" title={tree.paths.local}>
          {tree.paths.local}
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className={`w-1.5 h-1.5 rounded-full ${tree.ssdMounted ? 'bg-green-600' : 'bg-warm-muted'}`}
          />
          {tree.ssdMounted ? 'T7 connected' : 'T7 not connected'}
          {tree.relayBlocked && (
            <span className="ml-2 text-amber-700">
              · Relay has {formatBytes(tree.relayBytes)}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}
