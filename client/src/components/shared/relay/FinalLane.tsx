import { formatSize } from './types';

// ─── Final Lane (versions / promote) ───

export interface FinalLaneProps {
  versions?: { filename: string; size: number; modified: string }[];
  selectedVersion: string | null;
  onSelectVersion: (v: string | null) => void;
  onPromote: () => void;
  isPending: boolean;
  isCreator: boolean;
}

export function FinalLane({
  versions,
  selectedVersion,
  onSelectVersion,
  onPromote,
  isPending,
  isCreator,
}: FinalLaneProps) {
  const versionCount = versions?.length ?? 0;
  const totalSize = versions?.reduce((sum, v) => sum + v.size, 0) ?? 0;

  return (
    <div className="bg-surface border-2 border-green-500 rounded-lg p-3 space-y-2.5 flex-1 min-w-0">
      {/* Lane header */}
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-green-500" />
        <span className="text-sm font-semibold text-warm-primary truncate">Final</span>
      </div>

      {/* Stats */}
      <div>
        <div className="text-2xl font-bold text-warm-primary">
          {versionCount}
          <span className="text-sm font-normal text-warm-muted ml-1">
            {versionCount === 1 ? 'version' : 'versions'}
          </span>
        </div>
        {versionCount > 0 && (
          <div className="text-xs text-warm-muted">{formatSize(totalSize)}</div>
        )}
      </div>

      {/* Version selector */}
      {isCreator && versions && versions.length > 0 && (
        <div className="border border-warm rounded max-h-24 overflow-y-auto divide-y divide-warm">
          {versions.map((v) => (
            <button
              key={v.filename}
              onClick={() => onSelectVersion(selectedVersion === v.filename ? null : v.filename)}
              className={`w-full px-2 py-1.5 text-left text-xs hover:bg-surface-hover flex items-center justify-between ${
                selectedVersion === v.filename ? 'bg-blue-50 border-l-2 border-blue-500' : ''
              }`}
            >
              <span className="font-mono truncate">{v.filename}</span>
              <span className="text-warm-muted ml-1 shrink-0">
                {formatSize(v.size)}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Promote button (creator only) */}
      {isCreator && (
        <button
          onClick={onPromote}
          disabled={isPending || versionCount === 0}
          className="w-full px-3 py-1.5 text-sm font-medium bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? 'Working...' : 'Promote to Final'}
        </button>
      )}

      {!isCreator && versionCount === 0 && (
        <div className="text-sm text-warm-muted py-1">No final versions yet</div>
      )}
    </div>
  );
}
