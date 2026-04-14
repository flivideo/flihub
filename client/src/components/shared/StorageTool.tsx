// Offload UX Redesign: Dedicated Manage tool for SSD hold/restore operations.
// Replaces the buried SSD Offload section in ProjectDrawer with a discoverable Manage page tool.
// Uses all existing useHoldApi hooks — no new API endpoints.

import { useState, useEffect } from 'react';
import {
  useSsdStatus,
  useHoldStatus,
  useHoldProject,
  useVerifyHolding,
  useDeleteLocal,
  useRestoreFromHolding,
  useDeleteHolding,
} from '../../hooks/useHoldApi';
import { useProjectDisk, useDeleteSubfolder } from '../../hooks/useProjectDiskApi';
import { HoldDeleteModal } from '../HoldDeleteModal';
import { formatBytes } from '../../utils/formatBytes';
import { useConfig } from '../../hooks/useApi';

interface StorageToolProps {
  projectCode: string;
  onNavigateToRelay?: () => void;
}

export function StorageTool({ projectCode, onNavigateToRelay }: StorageToolProps) {
  const { data: config } = useConfig();
  const projectPath = config?.projectDirectory ?? projectCode;
  const ssdStatus = useSsdStatus();
  const holdStatus = useHoldStatus(projectCode || null);
  const holdProject = useHoldProject();
  const verifyHolding = useVerifyHolding();
  const deleteLocal = useDeleteLocal();
  const restoreFromHolding = useRestoreFromHolding();
  const deleteHolding = useDeleteHolding();

  // WU2: Disk data for folder breakdown
  const { data: diskResult } = useProjectDisk(projectCode || null);
  const diskData = diskResult?.data;
  const deleteSubfolder = useDeleteSubfolder(projectCode || null);

  const [holdModal, setHoldModal] = useState<{ open: boolean; target: 'local' | 'holding' }>({
    open: false, target: 'local',
  });
  const [dryRunMessage, setDryRunMessage] = useState<string | null>(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);

  // Reset local state when project changes (component stays mounted across project switches)
  useEffect(() => {
    setHoldModal({ open: false, target: 'local' });
    setDryRunMessage(null);
    setShowRestoreConfirm(false);
    setConfirmingDelete(null);
  }, [projectCode]);

  // Auto-verify when location is 'both' without verification (abandoned mid-flow)
  useEffect(() => {
    if (
      holdStatus.data?.location === 'both' &&
      !holdStatus.data.verification &&
      !verifyHolding.isPending &&
      projectCode
    ) {
      verifyHolding.mutate({ code: projectCode });
    }
  }, [holdStatus.data?.location, holdStatus.data?.verification, projectCode]);

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
  const relayBlocked = hs?.relayBlocked ?? false;
  const ver = hs?.verification;

  // Determine which reason to show for disabled offload button
  const offloadDisabledReason = !ssdConfigured
    ? 'SSD offload not configured'
    : !ssdMounted
      ? 'T7 SSD not connected'
      : relayBlocked
        ? `Relay active — clear ${formatBytes(hs?.relayBytes ?? 0)} in relay before offloading`
        : null;

  return (
    <div className="space-y-6">
      {/* Status header */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <h4 className="text-[10px] font-bold uppercase tracking-wide text-warm-faint">
            SSD Status
          </h4>
          {ssdConfigured && (
            <span className={`flex items-center gap-1.5 text-[11px] ${ssdMounted ? 'text-green-700' : 'text-warm-muted'}`}>
              <span className={`w-[7px] h-[7px] rounded-full ${ssdMounted ? 'bg-green-600' : 'bg-warm-muted'}`} />
              {ssdMounted ? 'T7 connected' : 'T7 not connected'}
            </span>
          )}
        </div>

        {!ssdConfigured && (
          <p className="text-sm text-warm-muted">
            SSD offload not configured. Add <code className="text-xs font-mono bg-surface-muted px-1 py-0.5 rounded">holdingPath</code> to server config to enable.
          </p>
        )}
      </div>

      {/* Loading */}
      {holdStatus.isFetching && !hs && (
        <p className="text-sm text-warm-muted animate-pulse">Loading storage status...</p>
      )}

      {/* Main content — 3 user-facing states */}
      {hs && location !== 'unknown' && (
        <div className="space-y-4">
          {/* Location indicator */}
          <div className="space-y-1">
            <h4 className="text-[10px] font-bold uppercase tracking-wide text-warm-faint">
              Location
            </h4>
            <LocationBadge location={location} heldAt={hs.heldAt} />
          </div>

          {/* STATE 1: Local only — can offload */}
          {location === 'local-only' && (
            <div className="space-y-3">
              {/* WU2: Pre-offload folder breakdown */}
              {diskData && (
                <FolderBreakdown
                  diskData={diskData}
                  confirmingDelete={confirmingDelete}
                  setConfirmingDelete={setConfirmingDelete}
                  deleteSubfolder={deleteSubfolder}
                />
              )}

              {dryRunMessage && (
                <p className="text-[12px] text-warm-secondary bg-surface-muted border border-warm rounded px-3 py-2">
                  {dryRunMessage}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setDryRunMessage(null);
                    holdProject.mutate({ code: projectCode, dryRun: false });
                  }}
                  disabled={!!offloadDisabledReason || holdProject.isPending}
                  title={offloadDisabledReason ?? undefined}
                  className="flex-1 py-2 px-4 text-sm font-medium rounded-md border border-warm bg-surface-muted hover:bg-warm text-warm-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {holdProject.isPending ? 'Offloading...' : 'Offload to T7'}
                </button>
                <button
                  onClick={() => {
                    holdProject.mutate(
                      { code: projectCode, dryRun: true },
                      {
                        onSuccess: (result) => {
                          const r = result as unknown as { localBytes?: number; holdingPath?: string };
                          if (r.localBytes != null) {
                            setDryRunMessage(`Would copy ${formatBytes(r.localBytes)} to ${r.holdingPath ?? 'SSD'}`);
                          } else {
                            setDryRunMessage('Preview complete — no size info returned');
                          }
                        },
                      }
                    );
                  }}
                  disabled={!!offloadDisabledReason || holdProject.isPending}
                  title={offloadDisabledReason ?? 'Preview what would be copied'}
                  className="py-2 px-4 text-sm font-medium rounded-md border border-warm bg-surface-muted hover:bg-warm text-warm-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Preview
                </button>
              </div>

              {offloadDisabledReason && (
                <p className="text-[12px] text-amber-700">
                  {offloadDisabledReason}
                  {onNavigateToRelay && relayBlocked && (
                    <>
                      {' — '}
                      <button
                        onClick={onNavigateToRelay}
                        className="text-blue-600 hover:text-blue-700 hover:underline font-medium"
                      >
                        Go to Relay
                      </button>
                    </>
                  )}
                </p>
              )}
            </div>
          )}

          {/* STATE 2: Both copies — offload incomplete */}
          {location === 'both' && (
            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <p className="text-sm text-amber-800 font-medium">
                  Offload incomplete — space not freed yet
                </p>
              </div>

              {/* Verifying */}
              {!ver && (
                <p className="text-sm text-warm-muted flex items-center gap-2">
                  <span className="inline-block w-3.5 h-3.5 border-2 border-warm-muted border-t-transparent rounded-full animate-spin" />
                  Verifying files...
                </p>
              )}

              {/* Verified — match */}
              {ver && ver.match && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
                    SSD copy: {ver.holdingFiles} files, {formatBytes(ver.holdingBytes)} — matches local
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => setHoldModal({ open: true, target: 'local' })}
                      className="w-full py-2 px-4 text-sm font-medium rounded-md border border-red-300 bg-red-50 hover:bg-red-100 text-red-700 transition-colors"
                    >
                      Free {formatBytes(ver.localBytes)} — Delete Local
                    </button>
                    <button
                      onClick={() => setHoldModal({ open: true, target: 'holding' })}
                      className="w-full py-2 px-4 text-sm font-medium rounded-md border border-warm bg-surface-muted hover:bg-warm text-warm-secondary transition-colors"
                    >
                      Cancel — Remove T7 copy
                    </button>
                  </div>
                </div>
              )}

              {/* Verified — mismatch */}
              {ver && !ver.match && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
                    Files don't match — cannot delete local
                  </div>
                  <p className="text-[12px] text-warm-muted">
                    Local: {ver.localFiles} files &nbsp;|&nbsp; SSD: {ver.holdingFiles} files
                  </p>
                  <button
                    onClick={() => holdProject.mutate({ code: projectCode, dryRun: false })}
                    disabled={holdProject.isPending}
                    className="w-full py-2 px-4 text-sm font-medium rounded-md border border-warm bg-surface-muted hover:bg-warm text-warm-secondary transition-colors disabled:opacity-50"
                  >
                    Re-run rsync
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STATE 3: Holding only — can restore */}
          {location === 'holding-only' && (
            <div className="space-y-3">
              {/* Restore confirmation */}
              {showRestoreConfirm ? (
                <div className="bg-surface-muted border border-warm rounded-lg px-3 py-3 space-y-3">
                  <p className="text-sm text-warm-primary">
                    Restore <span className="font-medium">{projectCode}</span> from T7?
                  </p>
                  <p className="text-[12px] text-warm-muted">
                    This will copy the project back to local storage.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        restoreFromHolding.mutate(
                          { code: projectCode },
                          { onSuccess: () => setShowRestoreConfirm(false) }
                        );
                      }}
                      disabled={restoreFromHolding.isPending || !ssdMounted}
                      className="flex-1 py-2 px-4 text-sm font-medium rounded-md border border-warm bg-surface-muted hover:bg-warm text-warm-primary transition-colors disabled:opacity-50"
                    >
                      {restoreFromHolding.isPending ? 'Restoring...' : 'Confirm Restore'}
                    </button>
                    <button
                      onClick={() => setShowRestoreConfirm(false)}
                      disabled={restoreFromHolding.isPending}
                      className="py-2 px-4 text-sm font-medium rounded-md text-warm-muted hover:text-warm-secondary transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowRestoreConfirm(true)}
                  disabled={!ssdMounted}
                  title={!ssdMounted ? 'T7 SSD not connected' : undefined}
                  className="w-full py-2 px-4 text-sm font-medium rounded-md border border-warm bg-surface-muted hover:bg-warm text-warm-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Restore from T7
                </button>
              )}

              {!ssdMounted && (
                <p className="text-[12px] text-amber-700">T7 SSD not connected — plug in to restore</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* HoldDeleteModal — reused from B064 */}
      {hs && ver && (
        <HoldDeleteModal
          isOpen={holdModal.open}
          onClose={() => setHoldModal((s) => ({ ...s, open: false }))}
          onConfirm={() => {
            if (holdModal.target === 'local') {
              deleteLocal.mutate(
                { code: projectCode },
                { onSuccess: () => setHoldModal((s) => ({ ...s, open: false })) }
              );
            } else {
              deleteHolding.mutate(
                { code: projectCode },
                { onSuccess: () => setHoldModal((s) => ({ ...s, open: false })) }
              );
            }
          }}
          target={holdModal.target}
          projectCode={projectCode}
          folderName={
            holdModal.target === 'local'
              ? projectCode
              : (hs.holdingPath?.split('/').pop() ?? projectCode)
          }
          bytesFreed={
            holdModal.target === 'local'
              ? ver.localBytes
              : ver.holdingBytes
          }
          targetPath={
            holdModal.target === 'local'
              ? projectPath
              : (hs.holdingPath ?? '')
          }
          verification={ver}
          isLoading={deleteLocal.isPending || deleteHolding.isPending}
          errorMessage={
            deleteLocal.error
              ? (deleteLocal.error instanceof Error ? deleteLocal.error.message : 'Delete failed')
              : deleteHolding.error
                ? (deleteHolding.error instanceof Error ? deleteHolding.error.message : 'Delete failed')
                : null
          }
        />
      )}
    </div>
  );
}

// Location badge sub-component
function LocationBadge({ location, heldAt }: { location: string; heldAt?: string }) {
  if (location === 'local-only') {
    return (
      <p className="text-sm text-warm-secondary">Local only</p>
    );
  }
  if (location === 'holding-only') {
    return (
      <div className="space-y-0.5">
        <p className="text-sm text-warm-secondary">On T7 SSD (local deleted)</p>
        {heldAt && (
          <p className="text-[12px] text-warm-muted">
            Held: {new Date(heldAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        )}
      </div>
    );
  }
  if (location === 'both') {
    return (
      <p className="text-sm text-amber-700 font-medium">Both local and T7 (in progress)</p>
    );
  }
  return <p className="text-sm text-warm-muted">Unknown</p>;
}

// WU2: Deletable subfolder allowlist (must match server DELETABLE_SUBFOLDERS)
const DELETABLE_SUBFOLDERS = new Set(['edit-1st', 'edit-2nd', 'final', '-trash', 's3-staging', 'inbox']);

// WU2: Pre-offload folder breakdown with delete buttons
import type { DiskSizeData } from '../../../../shared/types';
import type { UseMutationResult } from '@tanstack/react-query';

function FolderBreakdown({
  diskData,
  confirmingDelete,
  setConfirmingDelete,
  deleteSubfolder,
}: {
  diskData: DiskSizeData;
  confirmingDelete: string | null;
  setConfirmingDelete: (v: string | null) => void;
  deleteSubfolder: UseMutationResult<{ success: boolean; deleted: number; subfolder: string }, Error, { subfolder: string }>;
}) {
  // Build rows: known top-level buckets + detail.other subfolders
  const rows: Array<{ name: string; bytes: number; deletable: boolean }> = [];

  // recordings (never deletable)
  if (diskData.rec > 0) {
    rows.push({ name: 'recordings', bytes: diskData.rec, deletable: false });
  }
  // recording-shadows (never deletable)
  if (diskData.shadows > 0) {
    rows.push({ name: 'recording-shadows', bytes: diskData.shadows, deletable: false });
  }
  // -trash (from top-level trash bucket)
  if (diskData.trash > 0) {
    rows.push({ name: '-trash', bytes: diskData.trash, deletable: true });
  }

  // detail.other subfolders (edit-1st, edit-2nd, final, s3-staging, inbox, etc.)
  if (diskData.detail?.other) {
    Object.entries(diskData.detail.other)
      .filter(([, size]) => size > 0)
      .sort(([, a], [, b]) => b - a)
      .forEach(([name, size]) => {
        // Skip -trash — already handled above from top-level bucket
        if (name === '-trash') return;
        rows.push({
          name,
          bytes: size,
          deletable: DELETABLE_SUBFOLDERS.has(name),
        });
      });
  }

  if (rows.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <h4 className="text-[10px] font-bold uppercase tracking-wide text-warm-faint">
        Folder Breakdown
      </h4>
      <div className="space-y-0.5">
        {rows.map(({ name, bytes, deletable }) => {
          if (confirmingDelete === name) {
            return (
              <div key={name} className="flex items-center justify-between gap-2 py-0.5 text-sm">
                <span className="text-warm-secondary truncate">
                  Delete {name}? {formatBytes(bytes)} freed.
                </span>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => {
                      deleteSubfolder.mutate(
                        { subfolder: name },
                        { onSuccess: () => setConfirmingDelete(null) }
                      );
                    }}
                    disabled={deleteSubfolder.isPending}
                    className="px-2 py-0.5 text-xs font-medium rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleteSubfolder.isPending ? 'Deleting...' : 'Confirm'}
                  </button>
                  <button
                    onClick={() => setConfirmingDelete(null)}
                    disabled={deleteSubfolder.isPending}
                    className="px-2 py-0.5 text-xs font-medium rounded text-warm-muted hover:text-warm-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div key={name} className="flex items-center justify-between gap-2 py-0.5 text-sm text-warm-secondary">
              <span className="truncate">{name}</span>
              <div className="flex items-center gap-2 shrink-0">
                <span className="tabular-nums">{formatBytes(bytes)}</span>
                {deletable && (
                  <button
                    onClick={() => setConfirmingDelete(name)}
                    className="w-5 h-5 flex items-center justify-center text-warm-muted hover:text-red-600 transition-colors"
                    title={`Delete ${name}`}
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
