// B064: Shared confirmation modal for delete-local and delete-holding operations.
// Used from ProjectDetailDrawer (or any panel) when the user initiates a destructive offload action.

import { useState, useEffect, useCallback } from 'react';
import type { HoldVerification } from '../../../shared/types';
import { formatBytes } from '../utils/formatBytes';

// B064: Props for the hold-delete confirmation modal
interface HoldDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  target: 'local' | 'holding';       // which copy is being deleted
  projectCode: string;                // user must type this to confirm
  folderName: string;                 // display name of the folder being deleted
  bytesFreed: number;                 // how many bytes will be freed
  targetPath: string;                 // full path being deleted (shown for transparency)
  verification: HoldVerification | null; // must be non-null and match:true to enable confirm
  isLoading?: boolean;
}

// B064: HoldDeleteModal — two variants controlled by the `target` prop
export function HoldDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  target,
  projectCode,
  folderName,
  bytesFreed,
  targetPath,
  verification,
  isLoading = false,
}: HoldDeleteModalProps) {
  // B064: Typed confirmation code — must match projectCode exactly
  const [typedCode, setTypedCode] = useState('');

  // B064: Reset typed code whenever modal opens / target changes
  useEffect(() => {
    if (isOpen) setTypedCode('');
  }, [isOpen, target]);

  // B064: Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  // B064: All conditions must be met before confirm is enabled
  const verificationOk = verification !== null && verification.match === true;
  const codeMatches = typedCode === projectCode;
  const canConfirm = verificationOk && codeMatches && !isLoading;

  // B064: Human-readable sizes
  const freedLabel = formatBytes(bytesFreed);
  const localSizeLabel = verification ? formatBytes(verification.localBytes) : '—';
  const holdingSizeLabel = verification ? formatBytes(verification.holdingBytes) : '—';

  // B064: Variant-specific copy
  const isLocal = target === 'local';
  const title = isLocal ? 'Delete Local Copy' : 'Remove from HOLDING SSD';
  const folderLabel = isLocal ? 'Folder' : 'HOLDING folder';
  const pathLabel = isLocal ? 'HOLDING path' : 'Path';
  const sizeLabel = isLocal ? 'Freeing' : 'Freeing from SSD';
  const confirmButtonLabel = isLocal
    ? `Delete Local — Free ${freedLabel}`
    : 'Remove from HOLDING';

  // B064: Verification status block — green when ok, red when not
  const verificationBlock = verificationOk ? (
    <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
      <span>
        {isLocal
          ? `HOLDING verified \u2713 \u2014 ${verification!.holdingFiles} files, ${holdingSizeLabel}`
          : `Local copy verified \u2713 \u2014 ${verification!.localFiles} files, ${localSizeLabel}`}
      </span>
    </div>
  ) : (
    <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
      <span>Verification required \u2014 cannot delete</span>
    </div>
  );

  return (
    // B064: Backdrop — click closes modal
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      {/* B064: Modal panel — stop propagation so clicks inside don't close */}
      <div
        className="bg-surface rounded-lg w-full max-w-md mx-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-warm-strong">
          <h3 className="font-medium text-warm-primary">{title}</h3>
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
          {/* B064: Folder and path details */}
          <div className="space-y-1 text-sm">
            <div className="flex gap-2">
              <span className="text-warm-muted w-28 shrink-0">{folderLabel}:</span>
              <span className="text-warm-primary font-medium break-all">{folderName}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-warm-muted w-28 shrink-0">{sizeLabel}:</span>
              <span className="text-warm-primary">{freedLabel}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-warm-muted w-28 shrink-0">{pathLabel}:</span>
              <span className="text-warm-secondary break-all font-mono text-xs">{targetPath}</span>
            </div>
          </div>

          {/* B064: Verification status */}
          {verificationBlock}

          {/* B064: Typed confirmation input */}
          <div className="space-y-1">
            <label className="block text-sm text-warm-secondary">
              Type <span className="font-mono font-semibold text-warm-primary">{projectCode}</span> to confirm
            </label>
            <input
              type="text"
              value={typedCode}
              onChange={(e) => setTypedCode(e.target.value)}
              placeholder={projectCode}
              disabled={isLoading}
              autoFocus
              className="w-full px-3 py-1.5 border border-warm-strong rounded text-sm focus:ring-2 focus:ring-red-400 focus:border-red-400 disabled:opacity-50 font-mono"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-warm-strong bg-surface-muted rounded-b-lg">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm text-warm-secondary hover:bg-surface-hover rounded transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          {/* B064: Confirm is disabled until verification passes AND code matches */}
          <button
            onClick={onConfirm}
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
            {confirmButtonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
