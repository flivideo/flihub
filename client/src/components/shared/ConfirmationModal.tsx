/**
 * Reusable confirmation modal for various actions
 * Replaces window.confirm with a nicer UI
 */

import { useEffect } from 'react';

export interface ChapterSettings {
  resolution: '720p' | '1080p';
  includeTitleSlides: boolean;
  slideDuration: number;
}

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
  /** Optional chapter settings for chapter regeneration */
  chapterSettings?: ChapterSettings;
  onChapterSettingsChange?: (settings: ChapterSettings) => void;
  /** Callbacks */
  onConfirm: (chapterSettings?: ChapterSettings) => void;
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
  chapterSettings,
  onChapterSettingsChange,
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

        {/* Chapter Settings (if provided) */}
        {chapterSettings && onChapterSettingsChange && (
          <div className="mb-3 p-4 bg-blue-50 rounded border border-blue-200">
            <p className="text-sm font-semibold text-warm-secondary mb-3">Chapter Generation Settings</p>

            {/* Resolution */}
            <div className="mb-3">
              <label className="block text-xs font-medium text-warm-secondary mb-1">Resolution</label>
              <select
                value={chapterSettings.resolution}
                onChange={(e) =>
                  onChapterSettingsChange({
                    ...chapterSettings,
                    resolution: e.target.value as '720p' | '1080p',
                  })
                }
                className="w-full px-3 py-2 text-sm border border-warm-strong rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="720p">720p (1280×720)</option>
                <option value="1080p">1080p (1920×1080)</option>
              </select>
            </div>

            {/* Include Title Slides */}
            <div className="mb-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={chapterSettings.includeTitleSlides}
                  onChange={(e) =>
                    onChapterSettingsChange({
                      ...chapterSettings,
                      includeTitleSlides: e.target.checked,
                    })
                  }
                  className="w-4 h-4 text-blue-600 border-warm-strong rounded focus:ring-blue-500"
                />
                <span className="text-sm text-warm-secondary">
                  Include purple title slides between segments
                </span>
              </label>
            </div>

            {/* Slide Duration (only if title slides enabled) */}
            {chapterSettings.includeTitleSlides && (
              <div>
                <label className="block text-xs font-medium text-warm-secondary mb-1">
                  Slide Duration (seconds)
                </label>
                <input
                  type="number"
                  min="0.5"
                  max="5"
                  step="0.5"
                  value={chapterSettings.slideDuration}
                  onChange={(e) =>
                    onChapterSettingsChange({
                      ...chapterSettings,
                      slideDuration: parseFloat(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-warm-strong rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
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
            onClick={() => onConfirm(chapterSettings)}
            className={`px-4 py-2 text-sm rounded transition-colors ${buttonClasses}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
