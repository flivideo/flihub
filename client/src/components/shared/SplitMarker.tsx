/**
 * B047: SplitMarker — amber dashed line between files showing chapter break point.
 *
 * Renders between file rows at the split point to indicate where a chapter split
 * will occur. Includes a remove button to cancel the split.
 */

export interface SplitMarkerProps {
  newChapter: string;
  fileCount: number;
  onRemove: () => void;
}

export function SplitMarker({ newChapter, fileCount, onRemove }: SplitMarkerProps) {
  return (
    <div className="flex items-center gap-2 my-2">
      {/* Left dashed line */}
      <div className="flex-1 border-t-2 border-dashed border-amber-400" />

      {/* Center label */}
      <div className="flex items-center gap-2 bg-amber-50 text-amber-800 border border-amber-300 rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap">
        <span>
          &#9986; Split &#8594; New Chapter {newChapter} starts here ({fileCount} file{fileCount !== 1 ? 's' : ''}, renumbered 1-{fileCount})
        </span>
        <button
          onClick={onRemove}
          className="text-amber-500 hover:text-amber-800 transition-colors ml-1"
          title="Remove split point"
        >
          &#10005;
        </button>
      </div>

      {/* Right dashed line */}
      <div className="flex-1 border-t-2 border-dashed border-amber-400" />
    </div>
  );
}
