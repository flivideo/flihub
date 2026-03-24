/**
 * SelectionBadge - Shows current selection scope
 *
 * Displays:
 * - "5 files selected" (blue) when files are selected
 * - "All files (26)" (gray) when no selection
 *
 * Part of FR-136: Tool-oriented Manage Panel
 */

interface SelectionBadgeProps {
  selectedCount: number;
  totalCount: number;
}

export function SelectionBadge({ selectedCount, totalCount }: SelectionBadgeProps) {
  if (selectedCount > 0) {
    return (
      <div className="px-3 py-1 bg-blue-500/10 border border-blue-500 rounded text-blue-600 text-xs font-medium">
        {selectedCount} file{selectedCount === 1 ? '' : 's'} selected
      </div>
    );
  } else {
    return (
      <div className="px-3 py-1 bg-surface-muted border border-warm-strong rounded text-warm-secondary text-xs font-medium">
        All files ({totalCount})
      </div>
    );
  }
}
