// Trash visibility (David, 2026-09-23): a project's -trash/ is allowed only if it is ALWAYS
// visible (count + size) and emptiable any time. Header pill for the active project, next to
// the T7 pill. It renders even at 0 so "no trash" and "not loaded" never look the same.
// Emptying goes through DELETE /api/projects/:code/trash (safeDelete) after a confirm.
import { useState } from 'react';
import { useTrashSummary, useDeleteTrash } from '../../hooks/useProjectDiskApi';
import { formatBytes } from '../../utils/formatBytes';
import { ConfirmationModal } from './ConfirmationModal';

export function TrashIndicator({ projectCode }: { projectCode: string }) {
  const { data, isError } = useTrashSummary(projectCode || null);
  const deleteTrash = useDeleteTrash(projectCode || null);
  const [confirming, setConfirming] = useState(false);

  if (!projectCode) return null;

  const count = data?.fileCount ?? 0;
  const bytes = data?.totalBytes ?? 0;
  const nested = data?.nestedCount ?? 0;
  const unknown = isError || !data?.success;
  const canEmpty = !unknown && count > 0 && !deleteTrash.isPending;

  const label = unknown ? 'Trash ?' : count === 0 ? 'Trash 0' : `Trash ${count} · ${formatBytes(bytes)}`;
  const title = unknown
    ? `Could not read -trash/ for ${projectCode}${data?.error ? `: ${data.error}` : ''}`
    : count === 0
      ? `-trash/ is empty for ${projectCode}${nested > 0 ? ` (${nested} file(s) in subfolders — not emptied from here)` : ''}`
      : `${count} file(s), ${formatBytes(bytes)} in ${projectCode}/-trash/ — click to empty${nested > 0 ? ` (${nested} file(s) in subfolders are NOT emptied)` : ''}`;

  return (
    <>
      <button
        data-testid="trash-indicator"
        onClick={() => canEmpty && setConfirming(true)}
        disabled={!canEmpty}
        title={title}
        className={`flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded transition-colors ${
          canEmpty ? 'cursor-pointer hover:bg-surface-hover' : 'cursor-default'
        } ${count > 0 ? 'text-amber-700' : 'text-warm-faint'}`}
      >
        <span aria-hidden>🗑</span>
        <span className="font-medium tabular-nums">{deleteTrash.isPending ? 'Emptying…' : label}</span>
      </button>
      {confirming && (
        <ConfirmationModal
          title="Empty trash?"
          message={`Permanently delete ${count} file(s) (${formatBytes(bytes)}) from ${projectCode}/-trash/. This cannot be undone.`}
          warning={nested > 0 ? `${nested} file(s) inside subfolders of -trash/ are not removed by this.` : undefined}
          confirmText="Empty trash"
          variant="danger"
          onConfirm={() => {
            setConfirming(false);
            deleteTrash.mutate();
          }}
          onCancel={() => setConfirming(false)}
        />
      )}
    </>
  );
}
