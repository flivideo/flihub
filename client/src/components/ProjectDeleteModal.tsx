// FR-152: Confirmation modal for permanently deleting a project's local directory.
// Requires typing the project code to enable the delete button.

import { useState, useEffect, useCallback } from 'react';
import type { ProjectStats } from '../../../shared/types';

// FR-152: Props for the project delete confirmation modal
interface ProjectDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (confirmationCode: string) => void;
  project: ProjectStats;
  diskBytes?: number;
  isLoading?: boolean;
  errorMessage?: string | null;
}

// FR-152: ProjectDeleteModal — asks user to type the project code before enabling delete
export function ProjectDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  project,
  diskBytes,
  isLoading = false,
  errorMessage,
}: ProjectDeleteModalProps) {
  // FR-152: Typed confirmation code — must match project.code exactly
  const [typedCode, setTypedCode] = useState('');

  // FR-152: Reset typed code whenever modal opens
  useEffect(() => {
    if (isOpen) setTypedCode('');
  }, [isOpen]);

  // FR-152: Close on Escape key — guarded so Escape during active deletion does nothing
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) onClose();
    },
    [onClose, isLoading],
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const codeMatches = typedCode === project.code;
  const canConfirm = codeMatches && !isLoading;

  // FR-152: Display-friendly project name (strip leading code prefix)
  const projectName = project.code.replace(/^[a-zA-Z]\d{2}-?/, '');

  // FR-152: Disk size — from parent's useProjectDisk data
  const diskLabel = diskBytes && diskBytes > 0
    ? diskBytes < 1024 * 1024 * 1024
      ? `${Math.round(diskBytes / (1024 * 1024))} MB`
      : `${(diskBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
    : '—';

  return (
    // FR-152: Backdrop — click closes modal
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      {/* FR-152: Modal panel — stop propagation so clicks inside don't close */}
      <div
        className="bg-surface rounded-lg w-full max-w-md mx-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-warm-strong">
          <h3 className="font-medium text-warm-primary">Delete Project</h3>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 text-warm-muted hover:text-warm-secondary hover:bg-surface-hover rounded transition-colors disabled:opacity-50"
            aria-label="Close modal"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          {/* FR-152: Project identity — large text */}
          <div className="bg-surface-muted border border-warm rounded-lg px-4 py-3 space-y-1">
            <div className="text-lg font-bold text-warm-primary">{project.code}</div>
            {projectName && (
              <div className="text-sm text-warm-secondary">{projectName}</div>
            )}
          </div>

          {/* FR-152: File count + disk size summary */}
          <div className="space-y-1 text-sm">
            <div className="flex gap-2">
              <span className="text-warm-muted w-28 shrink-0">Recordings:</span>
              <span className="text-warm-primary">{project.totalFiles} file{project.totalFiles !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-warm-muted w-28 shrink-0">Disk size:</span>
              <span className="text-warm-primary">{diskLabel}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-warm-muted w-28 shrink-0">Path:</span>
              <span className="text-warm-secondary break-all font-mono text-xs">{project.path ?? project.code}</span>
            </div>
          </div>

          {/* FR-152: Cannot be undone warning */}
          <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
            <span className="font-semibold shrink-0">This cannot be undone.</span>
            <span>The project directory will be permanently deleted from disk.</span>
          </div>

          {/* FR-152: Typed confirmation input */}
          <div className="space-y-1">
            <label className="block text-sm text-warm-secondary">
              Type <span className="font-mono font-semibold text-warm-primary">{project.code}</span> to confirm
            </label>
            <input
              type="text"
              value={typedCode}
              onChange={(e) => setTypedCode(e.target.value)}
              placeholder={project.code}
              disabled={isLoading}
              autoFocus
              className="w-full px-3 py-1.5 border border-warm-strong rounded text-sm focus:ring-2 focus:ring-red-400 focus:border-red-400 disabled:opacity-50 font-mono"
            />
          </div>
        </div>

        {/* FR-152: Error message from failed delete attempt */}
        {errorMessage && (
          <div className="mx-4 mb-3 px-3 py-2 rounded text-sm text-red-700 bg-red-50 border border-red-200">
            {errorMessage}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-warm-strong bg-surface-muted rounded-b-lg">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm text-warm-secondary hover:bg-surface-hover rounded transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          {/* FR-152: Confirm is disabled until code matches */}
          <button
            onClick={() => onConfirm(typedCode)}
            disabled={!canConfirm}
            className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading && (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            )}
            Delete Project
          </button>
        </div>
      </div>
    </div>
  );
}
