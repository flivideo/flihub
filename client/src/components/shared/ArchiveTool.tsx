// WU2: ArchiveTool — filterable table for T7 offload lifecycle.
//
// Single surface for offload / restore / delete-local / delete-everything.
// Replaces the drawer SSD Offload section (drawer demotion lands in WU5).
//
// Design notes:
// - Filter tabs partition rows using predicates from archiveToolUtils.
// - Per-row actions are context-aware based on `row.state`.
// - Rows with `row.degraded` disable destructive actions and show the error.
// - Offload + restore fire immediately (WU5 adds restore confirm popover).
// - Inline "Delete local" uses a 2-second undo toast (sonner) then fires the
//   existing delete-project-local endpoint.
// - "Delete everything" opens the existing HoldDeleteModal (nuclear — typed
//   code). Note: server-side `DELETE /holding` currently requires a local
//   copy for verification; a true `held-only` delete-everything path may need
//   a new backend endpoint (see handoff notes).
// - WU3: selection state + header/row checkboxes + selection footer bar with
//   Offload / Delete-local batch buttons. Batch actions only appear when the
//   selection is homogeneous (same state) and no degraded rows are selected.
//   Selection is cleared when the filter changes. Successful rows are removed
//   from selection after a batch run; failed rows remain selected for retry.
// - Props `initialFilter` and `initialSearch` are accepted but inert; WU4
//   wires deep-link navigation.

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { ArchiveRow, ArchiveState } from '../../../../shared/types';
import {
  useArchiveInventory,
  useHoldProject,
  useRestoreFromHolding,
  useDeleteLocal,
  useDeleteHolding,
  useBatchOffload,
  useBatchDeleteLocal,
  type BatchArchiveResult,
} from '../../hooks/useHoldApi';
import { formatBytes } from '../../utils/formatBytes';
import {
  type ArchiveFilter,
  countArchiveFilters,
  filterArchiveRows,
  sumHeldBytes,
  sumReclaimableLocalBytes,
} from './archiveToolUtils';

// P5: Undo window for the inline delete-local toast. Single source of truth
// so the toast duration and the deferred mutation fire at exactly the same
// time. Also referenced by the unmount cleanup effect.
const UNDO_WINDOW_MS = 2000;

export interface ArchiveToolProps {
  // WU4: accepted but inert — WU4 will wire deep-link navigation through to
  // filter tab + search. Declared now so WU4 is a pure integration.
  initialFilter?: ArchiveFilter;
  initialSearch?: string;
}

export function ArchiveTool({ initialFilter, initialSearch }: ArchiveToolProps = {}) {
  const { data, isLoading, error } = useArchiveInventory();
  const rows = useMemo<ArchiveRow[]>(() => data?.rows ?? [], [data?.rows]);

  const holdProject = useHoldProject();
  const restoreFromHolding = useRestoreFromHolding();

  const [filter, setFilter] = useState<ArchiveFilter>(initialFilter ?? 'reclaimable');
  // WU4: Search input filters rows by projectCode substring (case-insensitive).
  // `initialSearch` pre-populates it when ArchiveTool is deep-linked from the
  // T7 badge or Storage "Manage in Archive" link.
  const [search, setSearch] = useState<string>(initialSearch ?? '');
  const counts = useMemo(() => countArchiveFilters(rows), [rows]);

  // Default-to-Reclaimable-when-there's-something-to-reclaim logic: if the
  // current filter is empty but rows exist, fall back to 'all'. Runs only on
  // first non-empty load to avoid stomping user selection.
  const [sawRows, setSawRows] = useState(false);
  useEffect(() => {
    if (sawRows) return;
    if (rows.length === 0) return;
    setSawRows(true);
    if (counts.reclaimable === 0 && !initialFilter) {
      setFilter('all');
    }
  }, [rows.length, counts.reclaimable, sawRows, initialFilter]);

  const visibleRows = useMemo(() => {
    const filtered = filterArchiveRows(rows, filter);
    const q = search.trim().toLowerCase();
    if (!q) return filtered;
    return filtered.filter((r) => r.projectCode.toLowerCase().includes(q));
  }, [rows, filter, search]);

  // Sticky footer aggregates
  const t7Used = useMemo(() => sumHeldBytes(rows), [rows]);
  const localReclaimable = useMemo(() => sumReclaimableLocalBytes(rows), [rows]);

  // P2: held-only "Delete everything" is deferred — the server's
  // DELETE /holding route requires a local copy for verification, so there's
  // no safe UI path until a held-only-specific backend endpoint exists.
  // The Restore button remains the only action on held-only rows.
  // WU5: Restore confirm target — drives the inline confirm popover.
  // Symmetric with the inline delete-local toast-with-undo pattern.
  const [restoreTarget, setRestoreTarget] = useState<ArchiveRow | null>(null);
  const deleteLocalMut = useDeleteLocal();
  const deleteHoldingMut = useDeleteHolding();

  // P5: track the in-flight undo timer so we can clear it if the component
  // unmounts mid-window. Without this, the setTimeout still fires after
  // unmount and calls mutate() on a torn-down mutation (React will warn +
  // in production could fire a real delete against an unmounted tree).
  const undoTimerRef = useRef<number | null>(null);
  useEffect(() => {
    return () => {
      if (undoTimerRef.current !== null) {
        window.clearTimeout(undoTimerRef.current);
        undoTimerRef.current = null;
      }
    };
  }, []);

  // ─── WU3: Batch selection state ───
  // Selection is a Set of projectCodes. Cleared when the filter changes so
  // users never act on rows they can no longer see.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  useEffect(() => {
    setSelected(new Set());
  }, [filter]);

  const batchOffloadMut = useBatchOffload();
  const batchDeleteLocalMut = useBatchDeleteLocal();
  // P4: progress is now total-only — we were showing "1/N: {code}…" for the
  // whole batch run which never advanced and misled David during long rsyncs.
  // Per-item progress needs SSE/streaming and is deferred.
  const [batchProgress, setBatchProgress] = useState<{
    verb: 'Offloading' | 'Deleting';
    total: number;
  } | null>(null);

  const selectedRows = useMemo(
    () => rows.filter((r) => selected.has(r.projectCode)),
    [rows, selected],
  );

  // All selected rows share the same state (for batch-action homogeneity check).
  // Degraded rows force batch actions off to prevent acting on stale data.
  const selectionSummary = useMemo(() => {
    if (selectedRows.length === 0) {
      return { homogeneousState: null as ArchiveState | null, anyDegraded: false, totalBytes: 0 };
    }
    const firstState = selectedRows[0]!.state;
    const homogeneous = selectedRows.every((r) => r.state === firstState);
    const anyDegraded = selectedRows.some((r) => r.degraded);
    const totalBytes = selectedRows.reduce((sum, r) => {
      // For offload: local bytes copied to T7; for delete-local: local bytes freed.
      return sum + (firstState === 'held-local' ? r.localBytes : r.localBytes);
    }, 0);
    return {
      homogeneousState: homogeneous ? firstState : null,
      anyDegraded,
      totalBytes,
    };
  }, [selectedRows]);

  const toggleRow = (code: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const selectableVisibleRows = useMemo(
    () => visibleRows.filter((r) => !r.degraded),
    [visibleRows],
  );
  const allVisibleSelected =
    selectableVisibleRows.length > 0 &&
    selectableVisibleRows.every((r) => selected.has(r.projectCode));

  const toggleSelectAllVisible = () => {
    setSelected((prev) => {
      if (allVisibleSelected) {
        const next = new Set(prev);
        for (const r of selectableVisibleRows) next.delete(r.projectCode);
        return next;
      }
      const next = new Set(prev);
      for (const r of selectableVisibleRows) next.add(r.projectCode);
      return next;
    });
  };

  const summariseBatchResults = (verb: string, results: BatchArchiveResult[]) => {
    const succeeded = results.filter((r) => r.ok).length;
    const failed = results.filter((r) => !r.ok);
    if (failed.length === 0) {
      toast.success(`${succeeded} ${verb}`);
    } else {
      const first = failed[0]!;
      toast.error(
        `${succeeded} ${verb}, ${failed.length} failed (${first.projectCode}: ${first.error ?? 'unknown'})`,
      );
    }
  };

  const runBatch = async (
    verb: 'Offloading' | 'Deleting',
    codes: string[],
    runner: (codes: string[]) => Promise<{ results: BatchArchiveResult[] }>,
    successVerb: string,
  ) => {
    if (codes.length === 0) return;
    // P4: single HTTP request drives the whole batch. Show total-only; per-item
    // progress is deferred until the server streams SSE events.
    setBatchProgress({ verb, total: codes.length });
    try {
      const res = await runner(codes);
      summariseBatchResults(successVerb, res.results);
      // Only clear successfully-processed codes; keep failures selected so the
      // user can retry or inspect.
      const okCodes = new Set(res.results.filter((r) => r.ok).map((r) => r.projectCode));
      setSelected((prev) => {
        const next = new Set(prev);
        for (const c of okCodes) next.delete(c);
        return next;
      });
    } catch (err) {
      toast.error(
        `Batch ${verb.toLowerCase()} failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setBatchProgress(null);
    }
  };

  const handleBatchOffload = () => {
    const codes = selectedRows.map((r) => r.projectCode);
    void runBatch(
      'Offloading',
      codes,
      (c) => batchOffloadMut.mutateAsync({ projects: c }),
      'offloaded',
    );
  };

  const handleBatchDeleteLocal = () => {
    const codes = selectedRows.map((r) => r.projectCode);
    void runBatch(
      'Deleting',
      codes,
      (c) => batchDeleteLocalMut.mutateAsync({ projects: c }),
      'deleted locally',
    );
  };

  const batchBusy = batchProgress !== null;

  const handleOffload = (row: ArchiveRow) => {
    if (row.degraded) return;
    holdProject.mutate(
      { code: row.projectCode },
      {
        onSuccess: () => toast.success(`Offloaded ${row.projectCode} to T7`),
        onError: (err) =>
          toast.error(
            `Offload failed: ${err instanceof Error ? err.message : String(err)}`,
          ),
      },
    );
  };

  const handleRestore = (row: ArchiveRow) => {
    if (row.degraded) return;
    // WU5: open the inline confirm popover instead of firing immediately.
    setRestoreTarget(row);
  };

  const confirmRestore = () => {
    if (!restoreTarget) return;
    // P6: re-read the row from the current inventory at confirm time — the
    // popover's captured snapshot may be stale (another client/process can
    // have changed the project state while the popover was open). If the
    // row vanished or left a restorable state, bail with a clear toast
    // instead of firing a mutation against outdated data.
    const fresh = rows.find((r) => r.projectCode === restoreTarget.projectCode);
    if (!fresh || (fresh.state !== 'held-only' && fresh.state !== 'held-local')) {
      toast.error('Project state changed — refresh and try again');
      setRestoreTarget(null);
      return;
    }
    restoreFromHolding.mutate(
      { code: fresh.projectCode },
      {
        onSuccess: () => {
          toast.success(`Restored ${fresh.projectCode} from T7`);
          setRestoreTarget(null);
        },
        onError: (err) => {
          toast.error(
            `Restore failed: ${err instanceof Error ? err.message : String(err)}`,
          );
          setRestoreTarget(null);
        },
      },
    );
  };

  const handleDeleteLocalWithUndo = (row: ArchiveRow) => {
    if (row.degraded) return;
    let undone = false;
    const toastId = toast(`Delete local copy of ${row.projectCode}?`, {
      duration: UNDO_WINDOW_MS,
      action: {
        label: 'Undo',
        onClick: () => {
          undone = true;
        },
      },
    });
    // P5: store the timer id so unmount cleanup can cancel it; otherwise the
    // delete would fire against a torn-down component.
    undoTimerRef.current = window.setTimeout(() => {
      undoTimerRef.current = null;
      if (undone) return;
      toast.dismiss(toastId);
      deleteLocalMut.mutate(
        { code: row.projectCode },
        {
          onSuccess: () => toast.success(`Deleted local copy of ${row.projectCode}`),
          onError: (err) =>
            toast.error(
              `Delete failed: ${err instanceof Error ? err.message : String(err)}`,
            ),
        },
      );
    }, UNDO_WINDOW_MS);
  };

  const handleClearT7 = (row: ArchiveRow) => {
    if (row.degraded) return;
    // held-local → remove T7 copy. Uses existing delete-holding endpoint
    // (requires local copy + verification match, which is the pre-condition
    // for held-local state).
    deleteHoldingMut.mutate(
      { code: row.projectCode },
      {
        onSuccess: () => toast.success(`Cleared T7 copy of ${row.projectCode}`),
        onError: (err) =>
          toast.error(
            `Clear T7 failed: ${err instanceof Error ? err.message : String(err)}`,
          ),
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-warm-muted text-sm">
        Loading archive inventory…
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
        Failed to load archive inventory:{' '}
        {error instanceof Error ? error.message : String(error)}
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-16">
      {/* WU4: Search input — filters rows by projectCode. Pre-filled via
          initialSearch when deep-linked from the T7 pill / table badge. */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          data-testid="archive-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search project code…"
          className="flex-1 max-w-xs px-3 py-1.5 text-sm rounded border border-warm bg-surface text-warm-primary placeholder:text-warm-faint focus:outline-none focus:border-blue-400"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="text-xs text-warm-muted hover:text-warm-secondary hover:underline"
          >
            Clear search
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 border-b border-warm">
        <FilterTab
          label="All"
          count={counts.all}
          active={filter === 'all'}
          onClick={() => setFilter('all')}
        />
        <FilterTab
          label="Local only"
          count={counts.local}
          active={filter === 'local'}
          onClick={() => setFilter('local')}
        />
        <FilterTab
          label="On T7"
          count={counts.held}
          active={filter === 'held'}
          onClick={() => setFilter('held')}
        />
        <FilterTab
          label="Reclaimable"
          count={counts.reclaimable}
          active={filter === 'reclaimable'}
          onClick={() => setFilter('reclaimable')}
        />
      </div>

      {/* Table */}
      {visibleRows.length === 0 ? (
        <div className="text-sm text-warm-muted py-8 text-center">
          No projects match the “{filter}” filter.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] font-bold uppercase tracking-wide text-warm-faint border-b border-warm">
                <th className="py-2 pr-2 w-8">
                  <input
                    type="checkbox"
                    aria-label="Select all visible"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAllVisible}
                    disabled={selectableVisibleRows.length === 0 || batchBusy}
                    className="w-4 h-4 rounded border-warm-strong cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                  />
                </th>
                <th className="py-2 pr-2">Project</th>
                <th className="py-2 px-2 text-right">Local</th>
                <th className="py-2 px-2 text-right">T7</th>
                <th className="py-2 px-2">State</th>
                <th className="py-2 px-2">Last touched</th>
                <th className="py-2 pl-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <ArchiveRowView
                  key={row.projectCode}
                  row={row}
                  selected={selected.has(row.projectCode)}
                  onToggleSelect={() => toggleRow(row.projectCode)}
                  selectionDisabled={batchBusy}
                  onOffload={() => handleOffload(row)}
                  onRestore={() => handleRestore(row)}
                  onDeleteLocal={() => handleDeleteLocalWithUndo(row)}
                  onClearT7={() => handleClearT7(row)}
                  offloading={holdProject.isPending}
                  restoring={restoreFromHolding.isPending}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sticky footer — aggregate when nothing selected, batch bar when selected */}
      <div className="fixed bottom-0 left-[232px] right-0 bg-surface-muted border-t border-warm px-6 py-2 text-xs text-warm-secondary z-20">
        {selected.size === 0 ? (
          <>
            <span className="tabular-nums">T7: {formatBytes(t7Used)} used</span>
            <span className="mx-3 text-warm-faint">·</span>
            <span className="tabular-nums">
              Local reclaimable: {formatBytes(localReclaimable)}
            </span>
          </>
        ) : (
          <div className="flex items-center gap-3" data-testid="batch-selection-bar">
            {batchProgress ? (
              <span className="text-warm-primary font-medium" data-testid="batch-progress">
                {batchProgress.verb} {batchProgress.total}{' '}
                {batchProgress.total === 1 ? 'project' : 'projects'}…
              </span>
            ) : (
              <span className="text-warm-primary font-medium">
                {selected.size} selected{' '}
                <span className="text-warm-faint mx-1">·</span>{' '}
                <span className="tabular-nums">{formatBytes(selectionSummary.totalBytes)}</span>
              </span>
            )}

            {/* Batch buttons — only when homogeneous + no degraded rows + not busy.
                P3: also disabled while either batch mutation is pending (belt +
                braces over `batchBusy`) to prevent a double-click race. */}
            {!batchBusy && selectionSummary.homogeneousState === 'local' && !selectionSummary.anyDegraded && (
              <button
                data-testid="batch-offload"
                onClick={handleBatchOffload}
                disabled={batchOffloadMut.isPending || batchDeleteLocalMut.isPending}
                className="px-2.5 py-1 text-xs font-medium rounded border border-warm bg-surface hover:bg-warm text-warm-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Offload selected ({selected.size})
              </button>
            )}
            {!batchBusy &&
              selectionSummary.homogeneousState === 'held-local' &&
              !selectionSummary.anyDegraded && (
                <button
                  data-testid="batch-delete-local"
                  onClick={handleBatchDeleteLocal}
                  disabled={batchOffloadMut.isPending || batchDeleteLocalMut.isPending}
                  className="px-2.5 py-1 text-xs font-medium rounded border border-red-300 bg-red-50 hover:bg-red-100 text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Delete local from selected ({selected.size})
                </button>
              )}
            {!batchBusy &&
              (selectionSummary.homogeneousState === null || selectionSummary.anyDegraded) && (
                <span
                  className="text-warm-muted italic"
                  data-testid="batch-mixed-note"
                  title={
                    selectionSummary.anyDegraded
                      ? 'Selection includes degraded rows — batch actions disabled'
                      : 'Mixed selection states — select rows of a single state'
                  }
                >
                  {selectionSummary.anyDegraded ? 'Degraded rows selected' : 'Mixed states'}
                </span>
              )}

            <button
              data-testid="batch-clear"
              onClick={() => setSelected(new Set())}
              disabled={batchBusy}
              className="ml-auto px-2 py-1 text-xs text-warm-muted hover:text-warm-secondary hover:underline disabled:opacity-50"
            >
              Clear selection
            </button>
          </div>
        )}
      </div>

      {/* WU5: Restore confirm popover — small inline mini-dialog, not a full
          modal. Matches the inline delete-local toast pattern for symmetry. */}
      {restoreTarget && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/30"
          onClick={() => {
            if (!restoreFromHolding.isPending) setRestoreTarget(null);
          }}
        >
          <div
            data-testid="restore-confirm-popover"
            onClick={(e) => e.stopPropagation()}
            className="bg-surface border border-warm-strong rounded-lg shadow-xl w-[420px] max-w-[90vw] p-5 space-y-3"
          >
            <h3 className="text-sm font-semibold text-warm-primary">
              Restore {restoreTarget.projectCode}?
            </h3>
            <p className="text-[13px] text-warm-secondary leading-relaxed">
              <span className="tabular-nums font-medium text-warm-primary">
                {formatBytes(restoreTarget.heldBytes)}
              </span>{' '}
              will be copied back to local disk.
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <button
                data-testid="restore-cancel"
                onClick={() => setRestoreTarget(null)}
                disabled={restoreFromHolding.isPending}
                className="px-3 py-1.5 text-xs font-medium rounded border border-warm bg-surface text-warm-secondary hover:bg-surface-muted disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                data-testid="restore-confirm"
                onClick={confirmRestore}
                disabled={restoreFromHolding.isPending}
                className="px-3 py-1.5 text-xs font-medium rounded border border-blue-600 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {restoreFromHolding.isPending ? 'Restoring…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* P2: held-only "Delete everything" deferred — server DELETE /holding
          requires a local copy for verification. The HoldDeleteModal launch
          site was removed here; re-add alongside a held-only-specific
          backend endpoint. */}
    </div>
  );
}

// ─── Sub-components ───

interface FilterTabProps {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}

function FilterTab({ label, count, active, onClick }: FilterTabProps) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
        active
          ? 'border-blue-600 text-blue-600'
          : 'border-transparent text-warm-secondary hover:text-warm-primary'
      }`}
    >
      {label}{' '}
      <span className={`text-xs tabular-nums ${active ? 'text-blue-600' : 'text-warm-faint'}`}>
        ({count})
      </span>
    </button>
  );
}

interface ArchiveRowViewProps {
  row: ArchiveRow;
  selected: boolean;
  onToggleSelect: () => void;
  selectionDisabled: boolean;
  onOffload: () => void;
  onRestore: () => void;
  onDeleteLocal: () => void;
  onClearT7: () => void;
  offloading: boolean;
  restoring: boolean;
}

function ArchiveRowView({
  row,
  selected,
  onToggleSelect,
  selectionDisabled,
  onOffload,
  onRestore,
  onDeleteLocal,
  onClearT7,
  offloading,
  restoring,
}: ArchiveRowViewProps) {
  const degraded = !!row.degraded;

  return (
    <tr className="border-b border-warm hover:bg-surface-hover">
      <td className="py-2 pr-2">
        <input
          type="checkbox"
          aria-label={`Select ${row.projectCode}`}
          checked={selected}
          onChange={onToggleSelect}
          // Degraded rows cannot be batch-operated on (Patch 4 invariant).
          disabled={degraded || selectionDisabled}
          className="w-4 h-4 rounded border-warm-strong cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
        />
      </td>
      <td className="py-2 pr-2 font-mono text-warm-primary">
        <div className="flex items-center gap-1.5">
          {row.projectCode}
          {degraded && (
            <span
              title={row.error ?? 'Row state unavailable'}
              className="inline-flex items-center justify-center w-4 h-4 text-[10px] rounded-full bg-amber-100 text-amber-700 border border-amber-300"
            >
              !
            </span>
          )}
        </div>
      </td>
      <td className="py-2 px-2 text-right tabular-nums text-warm-secondary">
        {row.localBytes > 0 ? formatBytes(row.localBytes) : '—'}
      </td>
      <td className="py-2 px-2 text-right tabular-nums text-warm-secondary">
        {row.heldBytes > 0 ? formatBytes(row.heldBytes) : '—'}
      </td>
      <td className="py-2 px-2">
        <StatePill state={row.state} />
      </td>
      <td className="py-2 px-2 text-warm-muted text-xs">
        {row.lastTouched
          ? new Date(row.lastTouched).toLocaleDateString('en-AU', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })
          : '—'}
      </td>
      <td className="py-2 pl-2 text-right">
        <div className="flex items-center justify-end gap-2">
          {degraded ? (
            <span className="text-xs text-amber-700" title={row.error}>
              Refresh to retry
            </span>
          ) : (
            <RowActions
              state={row.state}
              onOffload={onOffload}
              onRestore={onRestore}
              onDeleteLocal={onDeleteLocal}
              onClearT7={onClearT7}
              offloading={offloading}
              restoring={restoring}
            />
          )}
        </div>
      </td>
    </tr>
  );
}

interface RowActionsProps {
  state: ArchiveState;
  onOffload: () => void;
  onRestore: () => void;
  onDeleteLocal: () => void;
  onClearT7: () => void;
  offloading: boolean;
  restoring: boolean;
}

// NOTE: data-testid values mirror `actionsForState` ActionId values so the
// state→actions mapping test can assert on them.
function RowActions({
  state,
  onOffload,
  onRestore,
  onDeleteLocal,
  onClearT7,
  offloading,
  restoring,
}: RowActionsProps) {
  switch (state) {
    case 'local':
      return (
        <>
          <button
            data-testid="action-offload"
            onClick={onOffload}
            disabled={offloading}
            className="px-2.5 py-1 text-xs font-medium rounded border border-warm bg-surface-muted hover:bg-warm text-warm-secondary disabled:opacity-50"
          >
            {offloading ? 'Offloading…' : 'Offload'}
          </button>
          <button
            data-testid="action-delete-local"
            onClick={onDeleteLocal}
            className="px-2 py-1 text-xs text-red-600 hover:text-red-700 hover:underline"
          >
            Delete local
          </button>
        </>
      );
    case 'held-local':
      return (
        <>
          <button
            data-testid="action-delete-local-primary"
            onClick={onDeleteLocal}
            className="px-2.5 py-1 text-xs font-medium rounded border border-red-300 bg-red-50 hover:bg-red-100 text-red-700"
          >
            Delete local
          </button>
          <button
            data-testid="action-clear-t7"
            onClick={onClearT7}
            className="px-2 py-1 text-xs text-warm-muted hover:text-warm-secondary hover:underline"
          >
            Clear T7 copy
          </button>
        </>
      );
    case 'held-only':
      // P2: held-only delete-everything deferred — server DELETE /holding
      // requires a local copy for verification, so the nuke path has no
      // backend today. Restore is the only action surfaced.
      return (
        <button
          data-testid="action-restore"
          onClick={onRestore}
          disabled={restoring}
          className="px-2.5 py-1 text-xs font-medium rounded border border-warm bg-surface-muted hover:bg-warm text-warm-secondary disabled:opacity-50"
        >
          {restoring ? 'Restoring…' : 'Restore'}
        </button>
      );
  }
}

function StatePill({ state }: { state: ArchiveState }) {
  if (state === 'local') {
    return (
      <span className="inline-block px-2 py-0.5 text-[11px] font-medium rounded-full border border-warm bg-surface-muted text-warm-secondary">
        Local
      </span>
    );
  }
  if (state === 'held-local') {
    return (
      <span className="inline-block px-2 py-0.5 text-[11px] font-medium rounded-full border border-amber-300 bg-amber-50 text-amber-800">
        Reclaimable
      </span>
    );
  }
  return (
    <span className="inline-block px-2 py-0.5 text-[11px] font-medium rounded-full border border-warm bg-surface-muted text-warm-muted">
      On T7
    </span>
  );
}
