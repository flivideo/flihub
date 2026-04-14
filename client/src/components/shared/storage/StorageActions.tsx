// storage-panel WU2: State-aware action buttons for the StoragePanel.
//
// Buttons render based on storage state:
//   active   → Hold (primary, no confirm) + Archive (red, confirm popover)
//   held     → Restore (primary, no confirm) + Archive everything (red, confirm)
//   archived → nothing here; `Unarchive →` link lives at the bottom of the panel
//
// Confirm popovers are anchored to the triggering button (absolute within a
// relatively-positioned wrapper) — NOT a full-screen modal. This is the
// DVR-AA-004 lesson from the archive-tool campaign.
//
// Disabled reasons (rendered as inline tooltip text) cover:
//   - T7 not mounted
//   - storage tree reports `degraded`
//   - relay is non-empty (blocks Hold + Archive only)
import { useState, useRef, useEffect } from 'react';
import type { StorageState } from '../../../../../shared/types';
import { formatBytes } from '../../../utils/formatBytes';

export interface StorageActionsProps {
  state: StorageState;
  heavyBytes: number;
  heldBytes: number;
  localBytes: number;
  ssdMounted: boolean;
  degraded: boolean;
  degradedReason?: string;
  relayBlocked: boolean;
  relayBytes: number;
  pendingAction: null | 'hold' | 'restore' | 'archive' | 'held-archive';
  onHold: () => void;
  onRestore: () => void;
  onArchive: () => void;
  /** Held → Archive chain: restore first, then archive on success. */
  onHeldArchive: () => void;
}

type PopoverName = 'archive' | 'held-archive' | null;

function disabledReason(opts: {
  ssdMounted: boolean;
  degraded: boolean;
  degradedReason?: string;
  relayBlocked: boolean;
  relayBytes: number;
  blockedByRelay: boolean; // only true for Hold + Archive
}): string | null {
  if (!opts.ssdMounted) return 'T7 SSD not mounted';
  if (opts.degraded) return opts.degradedReason || 'Storage is in a degraded state';
  if (opts.blockedByRelay && opts.relayBlocked) {
    return `Clear Relay first (${formatBytes(opts.relayBytes)})`;
  }
  return null;
}

export function StorageActions(props: StorageActionsProps) {
  const [popover, setPopover] = useState<PopoverName>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Dismiss popover on outside click (keeps it feeling anchored, not modal).
  useEffect(() => {
    if (!popover) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setPopover(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [popover]);

  const {
    state,
    heavyBytes,
    heldBytes,
    localBytes,
    pendingAction,
    onHold,
    onRestore,
    onArchive,
    onHeldArchive,
  } = props;

  if (state === 'archived') {
    // No primary-area actions for archived; Unarchive lives at panel bottom.
    return (
      <div ref={wrapperRef} data-testid="storage-actions-archived" className="text-sm text-warm-muted italic">
        Project is archived. See Unarchive link below.
      </div>
    );
  }

  const holdReason = disabledReason({
    ssdMounted: props.ssdMounted,
    degraded: props.degraded,
    degradedReason: props.degradedReason,
    relayBlocked: props.relayBlocked,
    relayBytes: props.relayBytes,
    blockedByRelay: true,
  });
  const archiveReason = disabledReason({
    ssdMounted: props.ssdMounted,
    degraded: props.degraded,
    degradedReason: props.degradedReason,
    relayBlocked: props.relayBlocked,
    relayBytes: props.relayBytes,
    blockedByRelay: true,
  });

  return (
    <div ref={wrapperRef} className="flex flex-wrap items-start gap-3 relative">
      {state === 'active' && (
        <>
          <div className="flex flex-col">
            <button
              type="button"
              data-testid="action-hold"
              disabled={Boolean(holdReason) || pendingAction !== null || heavyBytes === 0}
              onClick={onHold}
              className="px-3 py-1.5 text-sm font-medium rounded-md border border-warm bg-surface-muted hover:bg-warm text-warm-primary transition-colors disabled:opacity-50"
            >
              {pendingAction === 'hold'
                ? 'Holding…'
                : `Hold heavy files (${formatBytes(heavyBytes)} → T7)`}
            </button>
            {holdReason && (
              <span data-testid="action-hold-reason" className="text-[11px] text-warm-muted mt-1">
                {holdReason}
              </span>
            )}
            {!holdReason && heavyBytes === 0 && (
              <span className="text-[11px] text-warm-muted mt-1">No heavy content</span>
            )}
          </div>

          <div className="relative flex flex-col">
            <button
              type="button"
              data-testid="action-archive"
              disabled={Boolean(archiveReason) || pendingAction !== null}
              onClick={() => setPopover('archive')}
              className="px-3 py-1.5 text-sm font-medium rounded-md border border-red-300 bg-surface-muted hover:bg-red-50 text-red-700 transition-colors disabled:opacity-50"
            >
              {pendingAction === 'archive'
                ? 'Archiving…'
                : `Archive everything (${formatBytes(localBytes)} → T7)`}
            </button>
            {archiveReason && (
              <span data-testid="action-archive-reason" className="text-[11px] text-warm-muted mt-1">
                {archiveReason}
              </span>
            )}
            {popover === 'archive' && (
              <ConfirmPopover
                title="Archive project?"
                body={`${formatBytes(localBytes)} will be moved to T7 PUBLISHED and the local folder will be deleted.`}
                confirmLabel="Archive"
                confirmTestId="confirm-archive"
                cancelTestId="cancel-archive"
                danger
                onConfirm={() => {
                  setPopover(null);
                  onArchive();
                }}
                onCancel={() => setPopover(null)}
              />
            )}
          </div>
        </>
      )}

      {state === 'held' && (
        <>
          <div className="flex flex-col">
            <button
              type="button"
              data-testid="action-restore"
              disabled={!props.ssdMounted || props.degraded || pendingAction !== null}
              onClick={onRestore}
              className="px-3 py-1.5 text-sm font-medium rounded-md border border-warm bg-surface-muted hover:bg-warm text-warm-primary transition-colors disabled:opacity-50"
            >
              {pendingAction === 'restore'
                ? 'Restoring…'
                : `Restore heavy files (${formatBytes(heldBytes)} ← T7)`}
            </button>
            {!props.ssdMounted && (
              <span className="text-[11px] text-warm-muted mt-1">T7 SSD not mounted</span>
            )}
          </div>

          <div className="relative flex flex-col">
            <button
              type="button"
              data-testid="action-held-archive"
              disabled={Boolean(archiveReason) || pendingAction !== null}
              onClick={() => setPopover('held-archive')}
              className="px-3 py-1.5 text-sm font-medium rounded-md border border-red-300 bg-surface-muted hover:bg-red-50 text-red-700 transition-colors disabled:opacity-50"
            >
              {pendingAction === 'held-archive' ? 'Archiving…' : 'Archive everything'}
            </button>
            {archiveReason && (
              <span className="text-[11px] text-warm-muted mt-1">{archiveReason}</span>
            )}
            {popover === 'held-archive' && (
              <ConfirmPopover
                title="Archive from held?"
                body={`This will restore ${formatBytes(heldBytes)} of heavy files from T7, then archive the whole project (${formatBytes(localBytes + heldBytes)}) to T7 PUBLISHED and delete local.`}
                confirmLabel="Restore, then Archive"
                confirmTestId="confirm-held-archive"
                cancelTestId="cancel-held-archive"
                danger
                onConfirm={() => {
                  setPopover(null);
                  onHeldArchive();
                }}
                onCancel={() => setPopover(null)}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// ConfirmPopover — anchored to the triggering button via `absolute` positioning
// within the parent's `relative` wrapper. Intentionally NOT a full-screen modal
// (DVR-AA-004).
// -----------------------------------------------------------------------------
function ConfirmPopover({
  title,
  body,
  confirmLabel,
  confirmTestId,
  cancelTestId,
  danger,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  confirmTestId: string;
  cancelTestId: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      data-testid="confirm-popover"
      role="dialog"
      aria-label={title}
      className="absolute top-full left-0 mt-2 z-20 w-80 bg-surface border border-warm rounded-md shadow-lg p-3"
    >
      <div className="text-sm font-semibold text-warm-primary mb-1">{title}</div>
      <div className="text-xs text-warm-secondary mb-3">{body}</div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          data-testid={cancelTestId}
          onClick={onCancel}
          className="px-2.5 py-1 text-xs rounded border border-warm bg-surface-muted hover:bg-warm text-warm-primary"
        >
          Cancel
        </button>
        <button
          type="button"
          data-testid={confirmTestId}
          onClick={onConfirm}
          className={`px-2.5 py-1 text-xs rounded border ${
            danger
              ? 'border-red-400 bg-red-600 hover:bg-red-700 text-white'
              : 'border-warm bg-warm-primary text-white'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}

// Exported so the panel (Unarchive link) can reuse the same popover style.
export { ConfirmPopover };
