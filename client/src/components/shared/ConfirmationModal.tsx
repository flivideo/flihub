/**
 * Reusable confirmation modal for various actions
 * Replaces window.confirm with a nicer UI
 */

import { useEffect } from 'react';

interface ConfirmationModalProps {
  /** Modal title */
  title: string;
  /** Main message/question */
  message: string;
  /** Optional list of files to show */
  files?: string[];
  /** Heading above the file list (default: "Files to process:") */
  filesLabel?: string;
  /** How many files to list before collapsing to "... and N more" (default: 3) */
  maxFilesShown?: number;
  /** Optional warning message */
  warning?: string;
  /** Confirm button text (default: "Continue") */
  confirmText?: string;
  /** Cancel button text (default: "Cancel") */
  cancelText?: string;
  /** Confirm button color variant */
  variant?: 'primary' | 'danger' | 'warning';
  /** Callbacks */
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmationModal({
  title,
  message,
  files,
  filesLabel = 'Files to process:',
  maxFilesShown = 3,
  warning,
  confirmText = 'Continue',
  cancelText = 'Cancel',
  variant = 'primary',
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onCancel]);

  // Determine button colors based on variant
  const buttonClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    warning: 'bg-orange-600 hover:bg-orange-700 text-white',
  }[variant];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface rounded-lg p-6 max-w-md mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Title */}
        <h3 className="text-lg font-semibold text-warm-primary mb-3">{title}</h3>

        {/* Main message */}
        <p className="text-sm text-warm-secondary mb-3 whitespace-pre-line">{message}</p>

        {/* File list (if provided) */}
        {files && files.length > 0 && (
          <div className="mb-3 p-3 bg-surface-muted rounded border border-warm">
            <p className="text-xs font-medium text-warm-secondary mb-2">{filesLabel}</p>
            <ul className="text-sm text-warm-secondary space-y-1">
              {files.slice(0, maxFilesShown).map((file, i) => (
                <li key={i} className="font-mono text-xs truncate">
                  • {file}
                </li>
              ))}
              {files.length > maxFilesShown && (
                <li className="text-xs text-warm-muted italic">
                  ... and {files.length - maxFilesShown} more
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Warning (if provided) */}
        {warning && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-xs text-yellow-800 whitespace-pre-line">⚠️ {warning}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-warm-secondary hover:bg-surface-hover rounded transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={() => onConfirm()}
            className={`px-4 py-2 text-sm rounded transition-colors ${buttonClasses}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
