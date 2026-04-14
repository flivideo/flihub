import type { RelayDivergenceInfo } from '../../../../../shared/types';
import { useOpenFolder } from '../../../hooks/useOpenFolder';
import type { LaneConfig, SyncDirection } from './types';
import {
  formatSize,
  getDirectionBorderClass,
  getDirectionDotClass,
  getDirectionStatusText,
  getDirectionStatusColorClass,
  defaultIsPush,
} from './types';

// ─── Kanban Lane ───

export interface KanbanLaneProps {
  lane: LaneConfig;
  divergence?: RelayDivergenceInfo;
  actionLabel: string;
  onAction: () => void;
  isPending: boolean;
  isPush: boolean;
  isDrawerOpen: boolean;
  onToggleDrawer: () => void;
  onEnsureFolders: () => void;
  onClear?: () => void;
}

export function KanbanLane({
  lane,
  divergence,
  actionLabel,
  onAction,
  isPending,
  isPush,
  isDrawerOpen,
  onToggleDrawer,
  onEnsureFolders,
  onClear,
}: KanbanLaneProps) {
  const { mutate: openFolder } = useOpenFolder();
  const folderExists = divergence?.folderExists ?? true;
  const direction: SyncDirection = divergence?.direction ?? 'synced';
  const localCount = divergence?.local.fileCount ?? 0;
  const localSize = divergence?.local.totalSize ?? 0;
  const relayCount = divergence?.relay.fileCount ?? 0;
  const relaySize = divergence?.relay.totalSize ?? 0;
  const localOnlyCount = divergence?.localOnly.length ?? 0;
  const relayOnlyCount = divergence?.relayOnly.length ?? 0;

  // Show relay-aware styling even when folder is missing but relay has files
  const hasRelayFiles = relayCount > 0;
  const borderClass = folderExists ? getDirectionBorderClass(direction) : (hasRelayFiles ? 'border-amber-500' : 'border-gray-400');
  const dotClass = folderExists ? getDirectionDotClass(direction) : (hasRelayFiles ? 'bg-amber-500' : 'bg-gray-400');
  const statusText = folderExists
    ? getDirectionStatusText(direction, localOnlyCount, relayOnlyCount)
    : (hasRelayFiles ? `\u2193 ${relayCount} incoming` : 'No folder');
  const statusColorClass = folderExists
    ? getDirectionStatusColorClass(direction)
    : (hasRelayFiles ? 'text-amber-500' : 'text-gray-500');

  // Determine whether action button should be disabled
  const actionDisabled = isPending
    || (direction === 'synced' && !isPush)
    || (isPush && localCount === 0);

  // Show action button when folder exists OR when folder is missing but relay has files to collect
  const showActionButton = folderExists || (!folderExists && hasRelayFiles && !isPush);
  // Show create folders only when folder missing AND no relay files to collect
  const showCreateFolders = !folderExists && !hasRelayFiles;

  return (
    <div className={`bg-surface border-2 ${borderClass} rounded-lg p-3 space-y-2.5 flex-1 min-w-0`}>
      {/* Lane header */}
      <div className="flex items-center gap-2">
        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotClass}`} />
        <span className="text-sm font-semibold text-warm-primary truncate">{lane.label}</span>
        {folderExists && lane.subfolder && (
          <button
            onClick={() => openFolder(lane.subfolder!)}
            className="p-0.5 text-warm-muted hover:text-warm-secondary hover:bg-surface-hover rounded transition-colors ml-auto shrink-0"
            title={`Open ${lane.label} in Finder`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </button>
        )}
      </div>

      {/* Stats */}
      {folderExists ? (
        <div>
          <div className="text-2xl font-bold text-warm-primary">
            {localCount}
            <span className="text-sm font-normal text-warm-muted ml-1">
              {localCount === 1 ? 'file' : 'files'}
            </span>
          </div>
          <div className="text-xs text-warm-muted">{formatSize(localSize)}</div>
        </div>
      ) : hasRelayFiles ? (
        <div>
          <div className="flex items-center gap-1 text-sm text-amber-600 mb-1">
            <span>&#9888;</span>
            <span>Folder missing</span>
          </div>
          <div className="text-lg font-bold text-warm-primary">
            {relayCount}
            <span className="text-sm font-normal text-warm-muted ml-1">
              in relay
            </span>
          </div>
          <div className="text-xs text-warm-muted">{formatSize(relaySize)}</div>
        </div>
      ) : (
        <div className="py-1">
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <span>&#9888;</span>
            <span>Folder missing</span>
          </div>
        </div>
      )}

      {/* Sync status */}
      <div className={`text-xs font-medium ${statusColorClass}`}>
        {statusText}
      </div>

      {/* Action button — shown when folder exists or relay has files to collect */}
      {showActionButton && (
        <button
          onClick={onAction}
          disabled={actionDisabled}
          className="w-full px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? 'Working...' : actionLabel}
        </button>
      )}

      {/* Create folders — only when no relay files and folder missing */}
      {showCreateFolders && (
        <button
          onClick={onEnsureFolders}
          disabled={isPending}
          className="w-full px-3 py-1.5 text-sm font-medium bg-amber-500 text-white rounded hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? 'Creating...' : 'Create Folders'}
        </button>
      )}

      {/* Clear relay — only when synced and relay has files */}
      {onClear && direction === 'synced' && relayCount > 0 && (
        <button
          onClick={onClear}
          disabled={isPending}
          className="text-red-600 hover:text-red-700 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Clear
        </button>
      )}

      {/* Show files toggle */}
      {folderExists && localCount > 0 && (
        <button
          onClick={onToggleDrawer}
          className="w-full text-xs text-warm-muted hover:text-blue-600 transition-colors text-center"
        >
          {isDrawerOpen ? 'Hide files' : `Show ${localCount} files \u25BC`}
        </button>
      )}
    </div>
  );
}
