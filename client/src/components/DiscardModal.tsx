import { useEffect, useRef } from 'react';

interface DiscardModalProps {
  remainingCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * CT-0107 R6 / FR-174: after "send several", ask about the rest of the incoming files.
 * Keep is on the left, neutral and focused by default; Enter and Escape always mean Keep —
 * only a deliberate click (or Space on the focused button) on "Discard the rest" trashes anything.
 */
export function DiscardModal({ remainingCount, onConfirm, onCancel }: DiscardModalProps) {
  const keepRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    keepRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onCancel();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="discard-modal-title"
        className="bg-surface rounded-lg p-6 max-w-sm mx-4 shadow-xl"
      >
        <h3 id="discard-modal-title" className="text-lg font-medium text-warm-primary mb-2">
          Rest of the incoming files?
        </h3>
        <p className="text-sm text-warm-secondary mb-4">
          {remainingCount === 1
            ? 'There is 1 other incoming file. Keep it, or move it to trash?'
            : `There are ${remainingCount} other incoming files. Keep them, or move them to trash?`}
        </p>
        <div className="flex justify-start gap-3">
          <button
            ref={keepRef}
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm text-warm-primary border border-warm rounded hover:bg-surface-hover transition-colors"
          >
            Keep the rest
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
          >
            Discard the rest
          </button>
        </div>
      </div>
    </div>
  );
}
