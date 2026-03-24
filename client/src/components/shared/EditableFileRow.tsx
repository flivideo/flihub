/**
 * B047: EditableFileRow — single recording row with inline editing
 *
 * Renders a recording as a row with:
 * - Checkbox for batch selection
 * - Play button
 * - Clickable filename segments (chapter, name) that turn into inline inputs
 * - Tags as purple badges with remove button
 * - Action buttons (Safe, Park, Restore, Unpark)
 * - Transcription badge
 * - Visual states: selected (blue ring), shadow (purple), safe (gray), parked (pink)
 */

import { useState, useRef, useEffect, type ReactNode } from 'react';
import type { RecordingFile } from '../../../../shared/types';
import { validateChapter, validateLabel } from '../../../../shared/naming';

export interface EditableFileRowProps {
  recording: RecordingFile;
  isSelected: boolean;
  onToggleSelect: (filename: string) => void;
  onInlineRename: (filename: string, field: 'chapter' | 'name', newValue: string) => void;
  onTagRemove: (filename: string, tag: string) => void;
  onPlay: (recording: RecordingFile) => void;
  onSplitHere: (filename: string) => void;
  onPark: (filename: string) => void;
  onSafe: (filename: string) => void;
  onRestore: (filename: string) => void;
  onUnpark: (filename: string) => void;
  /** Rendered in the right-hand action area, typically a TranscriptionBadge component */
  transcriptionBadge?: ReactNode;
  pendingChange?: { oldFilename: string; newFilename: string };
  disabled?: boolean;
  formatDuration: (duration?: number) => string;
  formatFileSize: (size: number) => string;
  formatTimestamp: (timestamp: string) => string;
}

export function EditableFileRow({
  recording,
  isSelected,
  onToggleSelect,
  onInlineRename,
  onTagRemove,
  onPlay,
  onSplitHere,
  onPark,
  onSafe,
  onRestore,
  onUnpark,
  transcriptionBadge,
  pendingChange,
  disabled,
  formatDuration: fmtDuration,
  formatFileSize: fmtFileSize,
  formatTimestamp: fmtTimestamp,
}: EditableFileRowProps) {
  const [editingField, setEditingField] = useState<'chapter' | 'name' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isShadow = !!recording.isShadow;
  const isDisabled = disabled || isShadow;

  // Focus input when editing starts
  useEffect(() => {
    if (editingField && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingField]);

  const startEditing = (field: 'chapter' | 'name') => {
    if (isDisabled) return;
    setEditingField(field);
    setEditValue(field === 'chapter' ? recording.chapter : recording.name);
    setEditError(null);
  };

  const cancelEditing = () => {
    setEditingField(null);
    setEditValue('');
    setEditError(null);
  };

  const confirmEditing = () => {
    if (!editingField) return;

    const trimmed = editValue.trim();
    if (!trimmed) {
      setEditError('Value cannot be empty');
      return;
    }

    if (editingField === 'chapter') {
      const err = validateChapter(trimmed);
      if (err) {
        setEditError(err);
        return;
      }
    } else {
      const err = validateLabel(trimmed);
      if (err) {
        setEditError(err);
        return;
      }
    }

    // Check if value actually changed
    const currentValue = editingField === 'chapter' ? recording.chapter : recording.name;
    if (trimmed === currentValue) {
      cancelEditing();
      return;
    }

    onInlineRename(recording.filename, editingField, trimmed);
    cancelEditing();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      confirmEditing();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEditing();
    }
  };

  // Extract extension from filename
  const ext = recording.filename.match(/\.[^.]+$/)?.[0] || '.mov';

  // Row styling
  let rowClasses: string;
  if (isShadow) {
    rowClasses = 'bg-purple-50 border-purple-200';
  } else if (recording.isSafe) {
    rowClasses = 'bg-surface-muted border-warm';
  } else if (recording.isParked) {
    rowClasses = 'bg-pink-50 border-pink-200';
  } else if (isSelected) {
    rowClasses = 'bg-blue-100 border-blue-300 ring-1 ring-blue-400';
  } else if (pendingChange) {
    rowClasses = 'bg-green-50 border-green-200';
  } else {
    rowClasses = 'bg-surface border-warm';
  }

  return (
    <div
      className={`group flex items-center justify-between px-4 py-2 rounded-lg border ${rowClasses} transition-colors`}
    >
      <div className="flex items-center gap-3">
        {/* Checkbox — faint until row hover or checked */}
        {!isShadow && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(recording.filename)}
            className={`w-3.5 h-3.5 rounded border-warm-strong focus:ring-blue-500 cursor-pointer transition-opacity ${
              isSelected ? 'opacity-100 text-blue-600' : 'opacity-15 group-hover:opacity-60'
            }`}
          />
        )}
        {isShadow && <span className="w-3.5" />}

        {/* Play button */}
        <button
          onClick={() => onPlay(recording)}
          disabled={isShadow}
          className={`text-blue-600 hover:text-blue-700 transition-colors ${
            isShadow ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'
          }`}
          title={isShadow ? 'Video not available locally' : 'Preview recording'}
        >
          ▶
        </button>

        {/* Shadow ghost icon */}
        {isShadow && (
          <span className="text-sm" title="Shadow only - video not available locally">
            👻
          </span>
        )}

        {/* Filename segments */}
        <div className="flex items-center font-mono text-sm">
          {/* Chapter segment */}
          {editingField === 'chapter' ? (
            <span className="inline-flex items-center gap-1">
              <input
                ref={inputRef}
                type="text"
                value={editValue}
                onChange={(e) => {
                  setEditValue(e.target.value);
                  setEditError(null);
                }}
                onKeyDown={handleKeyDown}
                onBlur={cancelEditing}
                className={`w-10 px-1 py-0 text-sm font-mono border rounded focus:outline-none focus:ring-1 ${
                  editError
                    ? 'border-red-300 focus:ring-red-400'
                    : 'border-blue-300 focus:ring-blue-400'
                }`}
                maxLength={2}
              />
              <span className="text-xs text-warm-muted whitespace-nowrap">
                Enter &#x2713; Esc &#x2717;
              </span>
            </span>
          ) : (
            <span
              onClick={() => startEditing('chapter')}
              className={`text-warm-muted ${
                !isDisabled
                  ? 'cursor-pointer hover:bg-surface-hover hover:text-warm-primary px-0.5 rounded'
                  : ''
              }`}
              title={isDisabled ? undefined : 'Click to edit chapter'}
            >
              {recording.chapter}
            </span>
          )}

          <span className="text-warm-faint">-</span>

          {/* Sequence segment (not editable) */}
          <span className="text-warm-muted">{recording.sequence}</span>

          <span className="text-warm-faint">-</span>

          {/* Name segment */}
          {editingField === 'name' ? (
            <span className="inline-flex items-center gap-1">
              <input
                ref={inputRef}
                type="text"
                value={editValue}
                onChange={(e) => {
                  setEditValue(e.target.value);
                  setEditError(null);
                }}
                onKeyDown={handleKeyDown}
                onBlur={cancelEditing}
                className={`w-40 px-1 py-0 text-sm font-mono border rounded focus:outline-none focus:ring-1 ${
                  editError
                    ? 'border-red-300 focus:ring-red-400'
                    : 'border-blue-300 focus:ring-blue-400'
                }`}
                maxLength={50}
              />
              <span className="text-xs text-warm-muted whitespace-nowrap">
                Enter &#x2713; Esc &#x2717;
              </span>
            </span>
          ) : (
            <span
              onClick={() => startEditing('name')}
              className={`text-warm-secondary ${
                !isDisabled
                  ? 'cursor-pointer hover:bg-surface-hover hover:text-warm-primary px-0.5 rounded'
                  : ''
              }`}
              title={isDisabled ? undefined : 'Click to edit name'}
            >
              {recording.name}
            </span>
          )}

          {/* Tags as purple badges */}
          {recording.tags.length > 0 && (
            <span className="flex items-center gap-1 ml-1">
              {recording.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-0.5 text-xs text-purple-700 bg-purple-100 px-1.5 py-0 rounded"
                >
                  {tag}
                  {!isDisabled && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onTagRemove(recording.filename, tag);
                      }}
                      className="text-purple-400 hover:text-purple-700 ml-0.5"
                      title={`Remove tag ${tag}`}
                    >
                      &#215;
                    </button>
                  )}
                </span>
              ))}
            </span>
          )}

          {/* Extension */}
          <span className="text-warm-muted ml-0">{ext}</span>
        </div>

        {/* Pending change indicator */}
        {pendingChange && (
          <span className="text-xs text-green-600 ml-2">
            &#8594; {pendingChange.newFilename}
          </span>
        )}

        {/* Edit error tooltip */}
        {editError && (
          <span className="text-xs text-red-500 ml-2">{editError}</span>
        )}
      </div>

      <div className="flex items-center gap-4 text-sm text-warm-muted">
        {/* Row actions on hover */}
        {!isDisabled && !recording.isSafe && !recording.isParked && (
          <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
            <button
              onClick={() => onSplitHere(recording.filename)}
              className="text-xs text-amber-500 hover:text-amber-700 px-1 py-0.5 hover:bg-amber-50 rounded transition-colors"
              title="Split chapter here"
            >
              &#9986;
            </button>
          </span>
        )}

        <span className="font-mono">{fmtDuration(recording.duration)}</span>

        {/* File size with shadow tooltip */}
        <span
          title={
            recording.shadowSize
              ? `Shadow: ${fmtFileSize(recording.shadowSize)}`
              : 'No shadow'
          }
          className="cursor-help"
        >
          {fmtFileSize(recording.size)}
        </span>

        <span>{fmtTimestamp(recording.timestamp)}</span>

        {/* Transcription badge — rendered as a slot from parent */}
        {transcriptionBadge}

        {/* Action buttons */}
        {isShadow ? (
          <span
            className="text-xs text-warm-faint px-2 py-0.5"
            title="Actions unavailable for shadow files"
          >
            -
          </span>
        ) : recording.isSafe ? (
          <button
            onClick={() => onRestore(recording.filename)}
            className="text-xs text-green-600 hover:text-green-700 px-2 py-0.5 hover:bg-green-100 rounded transition-colors"
          >
            &#8592; Restore
          </button>
        ) : recording.isParked ? (
          <button
            onClick={() => onUnpark(recording.filename)}
            className="text-xs text-pink-600 hover:text-pink-700 px-2 py-0.5 hover:bg-pink-100 rounded transition-colors"
          >
            &#8592; Unpark
          </button>
        ) : (
          <div className="flex gap-1">
            <button
              onClick={() => onSafe(recording.filename)}
              className="text-xs text-warm-muted hover:text-green-600 px-2 py-0.5 hover:bg-green-100 rounded transition-colors"
            >
              &#8594; Safe
            </button>
            <button
              onClick={() => onPark(recording.filename)}
              className="text-xs text-warm-muted hover:text-pink-600 px-2 py-0.5 hover:bg-pink-100 rounded transition-colors"
            >
              &#8594; Park
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
