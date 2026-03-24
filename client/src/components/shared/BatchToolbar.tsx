/**
 * B047: BatchToolbar — sticky toolbar for batch operations on selected recordings
 *
 * Appears when files are selected. Provides batch rename, move-to-chapter,
 * add/remove tags, split-here, and deselect-all actions. Each action button
 * opens an inline popover form.
 */

import { useState, useRef, useEffect } from 'react';
import { validateChapter, validateLabel } from '../../../../shared/naming';

export interface BatchToolbarProps {
  selectedCount: number;
  selectedChapterInfo: string;
  onRename: (newName: string) => void;
  onMoveToChapter: (chapter: string) => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  onSplitHere: () => void;
  onDeselectAll: () => void;
  availableTags?: string[];
  /** Tags present in the current selection, for the remove-tag popover */
  selectedTags?: string[];
}

type PopoverType = 'rename' | 'moveChapter' | 'addTag' | 'removeTag' | null;

export function BatchToolbar({
  selectedCount,
  selectedChapterInfo,
  onRename,
  onMoveToChapter,
  onAddTag,
  onRemoveTag,
  onSplitHere,
  onDeselectAll,
  selectedTags = [],
}: BatchToolbarProps) {
  const [activePopover, setActivePopover] = useState<PopoverType>(null);
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when popover opens
  useEffect(() => {
    if (activePopover && inputRef.current) {
      inputRef.current.focus();
    }
  }, [activePopover]);

  const openPopover = (type: PopoverType) => {
    setActivePopover(type);
    setInputValue('');
    setInputError(null);
  };

  const closePopover = () => {
    setActivePopover(null);
    setInputValue('');
    setInputError(null);
  };

  const handleRenameSubmit = () => {
    const trimmed = inputValue.trim();
    const err = validateLabel(trimmed);
    if (err) {
      setInputError(err);
      return;
    }
    onRename(trimmed);
    closePopover();
  };

  const handleMoveChapterSubmit = () => {
    const trimmed = inputValue.trim();
    const err = validateChapter(trimmed);
    if (err) {
      setInputError(err);
      return;
    }
    onMoveToChapter(trimmed);
    closePopover();
  };

  const handleAddTagSubmit = () => {
    const trimmed = inputValue.trim().toUpperCase();
    if (!trimmed || trimmed.length > 10) {
      setInputError('Tag must be 1-10 uppercase characters');
      return;
    }
    if (!/^[A-Z0-9]+$/.test(trimmed)) {
      setInputError('Tag must be uppercase letters/numbers only');
      return;
    }
    onAddTag(trimmed);
    closePopover();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (activePopover === 'rename') handleRenameSubmit();
      else if (activePopover === 'moveChapter') handleMoveChapterSubmit();
      else if (activePopover === 'addTag') handleAddTagSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closePopover();
    }
  };

  return (
    <div className="sticky top-0 z-50 bg-blue-800 text-white rounded-lg shadow-lg px-4 py-2 mb-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Selection info */}
          <span className="text-sm font-medium">
            {selectedCount} file{selectedCount !== 1 ? 's' : ''} selected
          </span>
          <span className="text-xs text-blue-200">{selectedChapterInfo}</span>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => openPopover(activePopover === 'rename' ? null : 'rename')}
              className={`text-xs px-3 py-1 rounded font-medium transition-colors ${
                activePopover === 'rename'
                  ? 'bg-surface text-blue-800'
                  : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
            >
              Rename
            </button>
            <button
              onClick={() => openPopover(activePopover === 'moveChapter' ? null : 'moveChapter')}
              className={`text-xs px-3 py-1 rounded font-medium transition-colors ${
                activePopover === 'moveChapter'
                  ? 'bg-surface text-blue-800'
                  : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
            >
              Move to Ch...
            </button>
            <button
              onClick={() => openPopover(activePopover === 'addTag' ? null : 'addTag')}
              className={`text-xs px-3 py-1 rounded font-medium transition-colors ${
                activePopover === 'addTag'
                  ? 'bg-surface text-blue-800'
                  : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
            >
              +Tag
            </button>
            {selectedTags.length > 0 && (
              <button
                onClick={() => openPopover(activePopover === 'removeTag' ? null : 'removeTag')}
                className={`text-xs px-3 py-1 rounded font-medium transition-colors ${
                  activePopover === 'removeTag'
                    ? 'bg-surface text-blue-800'
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
              >
                -Tag
              </button>
            )}
            <button
              onClick={onSplitHere}
              className="text-xs px-3 py-1 rounded font-medium bg-amber-600 hover:bg-amber-500 text-white transition-colors"
            >
              &#9986; Split Here
            </button>
          </div>
        </div>

        {/* Deselect all */}
        <button
          onClick={onDeselectAll}
          className="text-xs px-3 py-1 rounded font-medium bg-red-600 hover:bg-red-500 text-white transition-colors"
        >
          Deselect All
        </button>
      </div>

      {/* Popover forms */}
      {activePopover === 'rename' && (
        <div className="mt-2 p-3 bg-blue-900 rounded-lg">
          <div className="flex items-center gap-2">
            <label className="text-xs text-blue-200">New name (kebab-case):</label>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setInputError(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder="e.g. intro-demo"
              className="px-2 py-1 text-sm font-mono text-warm-primary bg-surface border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 w-48"
              maxLength={50}
            />
            <button
              onClick={handleRenameSubmit}
              className="text-xs px-3 py-1 rounded font-medium bg-surface text-blue-800 hover:bg-surface-hover transition-colors"
            >
              Preview Changes
            </button>
            <button
              onClick={closePopover}
              className="text-xs px-3 py-1 rounded font-medium text-blue-200 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
          {inputError && (
            <div className="text-xs text-red-300 mt-1">{inputError}</div>
          )}
        </div>
      )}

      {activePopover === 'moveChapter' && (
        <div className="mt-2 p-3 bg-blue-900 rounded-lg">
          <div className="flex items-center gap-2">
            <label className="text-xs text-blue-200">Target chapter (2 digits):</label>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setInputError(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder="e.g. 05"
              className="px-2 py-1 text-sm font-mono text-warm-primary bg-surface border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 w-16"
              maxLength={2}
            />
            <button
              onClick={handleMoveChapterSubmit}
              className="text-xs px-3 py-1 rounded font-medium bg-surface text-blue-800 hover:bg-surface-hover transition-colors"
            >
              Apply
            </button>
            <button
              onClick={closePopover}
              className="text-xs px-3 py-1 rounded font-medium text-blue-200 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
          {inputError && (
            <div className="text-xs text-red-300 mt-1">{inputError}</div>
          )}
        </div>
      )}

      {activePopover === 'addTag' && (
        <div className="mt-2 p-3 bg-blue-900 rounded-lg">
          <div className="flex items-center gap-2">
            <label className="text-xs text-blue-200">Tag (uppercase):</label>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value.toUpperCase());
                setInputError(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder="e.g. CTA"
              className="px-2 py-1 text-sm font-mono text-warm-primary bg-surface border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 w-24"
              maxLength={10}
            />
            <button
              onClick={handleAddTagSubmit}
              className="text-xs px-3 py-1 rounded font-medium bg-surface text-blue-800 hover:bg-surface-hover transition-colors"
            >
              Apply
            </button>
            <button
              onClick={closePopover}
              className="text-xs px-3 py-1 rounded font-medium text-blue-200 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
          {inputError && (
            <div className="text-xs text-red-300 mt-1">{inputError}</div>
          )}
        </div>
      )}

      {activePopover === 'removeTag' && (
        <div className="mt-2 p-3 bg-blue-900 rounded-lg">
          <div className="flex items-center gap-2">
            <label className="text-xs text-blue-200">Remove tags:</label>
            <div className="flex items-center gap-2">
              {selectedTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    onRemoveTag(tag);
                    closePopover();
                  }}
                  className="text-xs px-2 py-1 rounded font-medium bg-purple-100 text-purple-700 hover:bg-red-100 hover:text-red-700 transition-colors"
                >
                  {tag} &#215;
                </button>
              ))}
            </div>
            <button
              onClick={closePopover}
              className="text-xs px-3 py-1 rounded font-medium text-blue-200 hover:text-white transition-colors ml-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
