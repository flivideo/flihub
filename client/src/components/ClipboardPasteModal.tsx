// FR-42: Modal for pasting images from clipboard
import { useEffect, useCallback } from 'react';

interface ClipboardPasteModalProps {
  imageData: string; // Base64 data URL
  previewFilename: string;
  onAssign: () => void;
  onSaveToIncoming: () => void;
  onCancel: () => void;
  isAssigning: boolean;
  isSavingToIncoming: boolean;
}

export function ClipboardPasteModal({
  imageData,
  previewFilename,
  onAssign,
  onSaveToIncoming,
  onCancel,
  isAssigning,
  isSavingToIncoming,
}: ClipboardPasteModalProps) {
  // Handle Enter key for primary action
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !isAssigning && !isSavingToIncoming) {
        e.preventDefault();
        onAssign();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    },
    [onAssign, onCancel, isAssigning, isSavingToIncoming]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const isPending = isAssigning || isSavingToIncoming;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surface rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-warm">
          <h3 className="text-lg font-semibold text-warm-primary">Paste Image from Clipboard</h3>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {/* Image Preview */}
          <div className="flex justify-center mb-4">
            <img
              src={imageData}
              alt="Clipboard preview"
              className="max-w-full max-h-48 object-contain border border-warm rounded"
            />
          </div>

          {/* Filename Preview */}
          <div className="text-sm text-warm-secondary mb-2">Will be saved as:</div>
          <div className="font-mono text-sm bg-surface-muted px-3 py-2 rounded border border-warm text-warm-primary">
            {previewFilename || 'Set chapter/sequence/label first'}
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-warm space-y-3">
          {/* Primary actions row */}
          <div className="flex justify-between gap-3">
            <button
              onClick={onCancel}
              disabled={isPending}
              className="px-4 py-2 text-sm text-warm-secondary hover:text-warm-primary hover:bg-surface-hover rounded transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onAssign}
              disabled={isPending || !previewFilename}
              className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAssigning ? 'Assigning...' : 'Assign Now'}
            </button>
          </div>

          {/* Secondary action */}
          <div className="text-center">
            <button
              onClick={onSaveToIncoming}
              disabled={isPending}
              className="text-sm text-warm-muted hover:text-warm-secondary hover:underline transition-colors disabled:opacity-50"
            >
              {isSavingToIncoming ? 'Saving...' : 'or save to incoming folder'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
