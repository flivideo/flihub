// Relay Kanban Board — horizontal four-lane workflow with divergence status
import { useState, useMemo } from 'react';
import {
  useRelayStatus,
  useRelayBrowse,
  useRelayFiles,
  useRelayActivity,
  useRelayDivergence,
  useRelayPush,
  useRelayCollect,
  useRelayVersions,
  useRelayPromote,
  useEnsureFolders,
  useEnhancedRelayBrowse,
} from '../../hooks/useRelayApi';
import { useSyncPull } from '../../hooks/useSyncApi';
import { useEnvironment } from '../../hooks/useConfigApi';
import { useConfig } from '../../hooks/useApi';
import { useOpenFolder } from '../../hooks/useOpenFolder';
import type {
  RelaySubfolder,
  RelayFileInfo,
  RelayActivityEvent,
  RelayDivergenceInfo,
  RelayProjectSyncInfo,
} from '../../../../shared/types';

// ─── Lane Configuration ───

type LaneKey = RelaySubfolder | 'final';

interface LaneConfig {
  key: LaneKey;
  subfolder?: RelaySubfolder; // undefined for 'final' (no relay subfolder)
  label: string;
}

const LANES: LaneConfig[] = [
  { key: 'recordings', subfolder: 'recordings', label: 'Recordings' },
  { key: 'edit-1st', subfolder: 'edit-1st', label: '1st Edit' },
  { key: 'edit-2nd', subfolder: 'edit-2nd', label: '2nd Edit' },
  { key: 'final', label: 'Final' },
];

// ─── Helpers ───

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 MB';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays === 1) {
    return `Yesterday, ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
    ', ' + date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

type SyncDirection = 'synced' | 'outgoing' | 'incoming' | 'both';

function getDirectionBorderClass(direction: SyncDirection): string {
  switch (direction) {
    case 'synced': return 'border-green-500';
    case 'outgoing': return 'border-blue-500';
    case 'incoming': return 'border-amber-500';
    case 'both': return 'border-red-500';
  }
}

function getDirectionDotClass(direction: SyncDirection): string {
  switch (direction) {
    case 'synced': return 'bg-green-500';
    case 'outgoing': return 'bg-blue-500';
    case 'incoming': return 'bg-amber-500';
    case 'both': return 'bg-red-500';
  }
}

function getDirectionStatusText(direction: SyncDirection, localOnly: number, relayOnly: number): string {
  switch (direction) {
    case 'synced': return '\u2713 Synced';
    case 'outgoing': return `\u2191 ${localOnly} to push`;
    case 'incoming': return `\u2193 ${relayOnly} incoming`;
    case 'both': return `\u2195 ${localOnly} out / ${relayOnly} in`;
  }
}

function getDirectionStatusColorClass(direction: SyncDirection): string {
  switch (direction) {
    case 'synced': return 'text-green-600';
    case 'outgoing': return 'text-blue-600';
    case 'incoming': return 'text-amber-500';
    case 'both': return 'text-red-500';
  }
}

// Direction-aware labels: use actual divergence direction, not assumed role flow
function getActionLabel(direction: SyncDirection, isCreator: boolean): string {
  if (direction === 'outgoing') {
    return isCreator ? 'Send to Editor' : 'Send to Creator';
  }
  if (direction === 'incoming') {
    return isCreator ? 'Pull from Editor' : 'Pull into Project';
  }
  if (direction === 'both') {
    return 'Sync Needed';
  }
  // synced — show default based on role expectation
  return isCreator ? 'Push to Relay' : 'Push to Relay';
}

// Default push direction hint for when synced (role-based suggestion)
function defaultIsPush(lane: RelaySubfolder, isCreator: boolean): boolean {
  if (lane === 'recordings') return isCreator;
  return !isCreator;
}

// ─── Main Component ───

export function RelayTool() {
  const { data: env } = useEnvironment();
  const { data: config } = useConfig();
  const role = env?.machineRole || 'recorder';
  const isCreator = role !== 'editor';

  const { data: status, isLoading: statusLoading } = useRelayStatus();
  const { data: browseData } = useRelayBrowse();
  const { data: enhancedBrowse } = useEnhancedRelayBrowse();
  const { data: divergenceData } = useRelayDivergence();
  const { data: activityData } = useRelayActivity();
  const versions = useRelayVersions();
  const push = useRelayPush();
  const collect = useRelayCollect();
  const promote = useRelayPromote();
  const ensureFolders = useEnsureFolders();
  const { mutate: openRelay } = useOpenFolder();

  const [openDrawer, setOpenDrawer] = useState<RelaySubfolder | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);

  const syncPull = useSyncPull();
  const isConfigured = status?.configured && status?.enabled;
  const projectCode = config?.activeProject || '';

  // FR-147: Identify relay projects blocked because they don't exist locally
  const blockedProjects = useMemo(() => {
    const blocked: RelayProjectSyncInfo[] = [];
    if (enhancedBrowse?.projects) {
      for (const p of enhancedBrowse.projects) {
        const sp = p as RelayProjectSyncInfo;
        if ('projectExists' in sp && sp.projectExists === false) {
          const totalRelayFiles = Object.values(sp.subfolders).reduce((s, v) => s + v.fileCount, 0);
          if (totalRelayFiles > 0) blocked.push(sp);
        }
      }
    }
    return blocked;
  }, [enhancedBrowse?.projects]);

  // Build a map of divergence info by subfolder
  const divergenceMap = useMemo(() => {
    const map = new Map<RelaySubfolder, RelayDivergenceInfo>();
    if (divergenceData?.subfolders) {
      for (const info of divergenceData.subfolders) {
        map.set(info.subfolder, info);
      }
    }
    return map;
  }, [divergenceData?.subfolders]);

  // Handle lane action button click — direction-aware
  const handleAction = (lane: RelaySubfolder, direction: SyncDirection) => {
    if (direction === 'outgoing') {
      push.mutate(lane);
    } else if (direction === 'incoming') {
      collect.mutate(lane);
    } else {
      // synced or both — fall back to role-based default
      if (defaultIsPush(lane, isCreator)) {
        push.mutate(lane);
      } else {
        collect.mutate(lane);
      }
    }
  };

  const handlePromote = () => {
    const version = selectedVersion || versions.data?.versions?.[0]?.filename;
    if (version) {
      promote.mutate(version);
    }
  };

  const isActionPending = push.isPending || collect.isPending || promote.isPending || ensureFolders.isPending;

  // ─── Loading / Not Configured States ───

  if (statusLoading) {
    return <div className="text-sm text-warm-muted p-4">Loading relay status...</div>;
  }

  if (!status?.configured) {
    return (
      <div className="space-y-4 p-4">
        <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded p-3">
          Relay not configured — add <span className="font-mono">relayDirectory</span> to config.json
        </div>
        <SetupGuide />
      </div>
    );
  }

  if (!status?.enabled) {
    return (
      <div className="space-y-4 p-4">
        <div className="text-sm text-warm-muted bg-surface-muted border border-warm rounded p-3">
          Relay is configured but not enabled.
        </div>
        <SetupGuide />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-warm-primary">
          Relay {projectCode && <span className="text-warm-muted">— {projectCode}</span>}
        </h2>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
          Relay connected
        </span>
      </div>

      {/* FR-147: Blocked Projects — relay items waiting for video-project sync */}
      {blockedProjects.length > 0 && (
        <BlockedProjectsBanner
          projects={blockedProjects}
          onSyncVideoProject={() => syncPull.mutate('video-project')}
          isSyncing={syncPull.isPending}
        />
      )}

      {/* Kanban Board — four lane cards with arrows between */}
      <div className="flex items-start gap-2">
        {LANES.map((lane, index) => (
          <div key={lane.key} className="flex items-start gap-2 flex-1 min-w-0">
            {/* Arrow between lanes */}
            {index > 0 && (
              <div className="flex items-center pt-10 shrink-0">
                <span className="text-warm-muted text-lg">&rarr;</span>
              </div>
            )}

            {lane.subfolder ? (
              <KanbanLaneWrapper
                lane={lane}
                divergence={divergenceMap.get(lane.subfolder)}
                isCreator={isCreator}
                onAction={handleAction}
                isPending={isActionPending}
                isDrawerOpen={openDrawer === lane.subfolder}
                onToggleDrawer={() =>
                  setOpenDrawer(openDrawer === lane.subfolder ? null : lane.subfolder!)
                }
                onEnsureFolders={() => ensureFolders.mutate()}
              />
            ) : (
              <FinalLane
                versions={versions.data?.versions}
                selectedVersion={selectedVersion}
                onSelectVersion={setSelectedVersion}
                onPromote={handlePromote}
                isPending={isActionPending}
                isCreator={isCreator}
              />
            )}
          </div>
        ))}
      </div>

      {/* File Drawer — full width below the cards */}
      {openDrawer && isConfigured && (
        <FileDrawer
          subfolder={openDrawer}
          label={LANES.find(l => l.subfolder === openDrawer)?.label || openDrawer}
          isCreator={isCreator}
          direction={divergenceMap.get(openDrawer)?.direction ?? 'synced'}
          onClose={() => setOpenDrawer(null)}
        />
      )}

      {/* Activity Feed */}
      <ActivityFeed events={activityData?.events} />

      {/* Setup Guide */}
      <SetupGuide />

      {/* Footer */}
      {status.relayDirectory && (
        <div className="flex items-center justify-between text-xs text-warm-muted border-t border-warm pt-3">
          <span className="inline-flex items-center gap-1 font-mono truncate">
            {status.relayDirectory}
            <button
              onClick={() => openRelay('relay')}
              className="p-0.5 text-warm-muted hover:text-warm-secondary hover:bg-surface-hover rounded transition-colors shrink-0"
              title="Open relay folder in Finder"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </button>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            Connected
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Kanban Lane Wrapper — derives direction-aware props ───

function KanbanLaneWrapper({
  lane, divergence, isCreator, onAction, isPending, isDrawerOpen, onToggleDrawer, onEnsureFolders,
}: {
  lane: LaneConfig;
  divergence?: RelayDivergenceInfo;
  isCreator: boolean;
  onAction: (lane: RelaySubfolder, direction: SyncDirection) => void;
  isPending: boolean;
  isDrawerOpen: boolean;
  onToggleDrawer: () => void;
  onEnsureFolders: () => void;
}) {
  const direction: SyncDirection = divergence?.direction ?? 'synced';
  const isPush = direction === 'outgoing' || (direction === 'synced' && defaultIsPush(lane.subfolder!, isCreator));

  return (
    <KanbanLane
      lane={lane}
      divergence={divergence}
      actionLabel={getActionLabel(direction, isCreator)}
      onAction={() => onAction(lane.subfolder!, direction)}
      isPending={isPending}
      isPush={isPush}
      isDrawerOpen={isDrawerOpen}
      onToggleDrawer={onToggleDrawer}
      onEnsureFolders={onEnsureFolders}
    />
  );
}

// ─── Kanban Lane ───

interface KanbanLaneProps {
  lane: LaneConfig;
  divergence?: RelayDivergenceInfo;
  actionLabel: string;
  onAction: () => void;
  isPending: boolean;
  isPush: boolean;
  isDrawerOpen: boolean;
  onToggleDrawer: () => void;
  onEnsureFolders: () => void;
}

function KanbanLane({
  lane,
  divergence,
  actionLabel,
  onAction,
  isPending,
  isPush,
  isDrawerOpen,
  onToggleDrawer,
  onEnsureFolders,
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

// ─── Final Lane (versions / promote) ───

interface FinalLaneProps {
  versions?: { filename: string; size: number; modified: string }[];
  selectedVersion: string | null;
  onSelectVersion: (v: string | null) => void;
  onPromote: () => void;
  isPending: boolean;
  isCreator: boolean;
}

function FinalLane({
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
                {(v.size / (1024 * 1024)).toFixed(1)} MB
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

// ─── File Drawer ───

interface FileDrawerProps {
  subfolder: RelaySubfolder;
  label: string;
  isCreator: boolean;
  direction: SyncDirection;
  onClose: () => void;
}

function FileDrawer({ subfolder, label, isCreator, direction, onClose }: FileDrawerProps) {
  // Show files from the side that has content based on actual divergence direction
  const source = direction === 'outgoing' ? 'project'
    : direction === 'incoming' ? 'relay'
    : defaultIsPush(subfolder, isCreator) ? 'project' : 'relay';
  const { data, isLoading } = useRelayFiles(subfolder, source);

  const files = data?.files || [];

  // Group files by chapter
  const grouped = useMemo(() => {
    const map = new Map<string, RelayFileInfo[]>();
    for (const file of files) {
      const key = file.chapter;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(file);
    }
    return map;
  }, [files]);

  const totalChapters = grouped.size;
  const totalFiles = files.length;
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  return (
    <div className="bg-surface border border-warm rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-surface-muted border-b border-warm">
        <span className="text-sm font-semibold text-warm-secondary">
          {label} — {totalFiles} {totalFiles === 1 ? 'file' : 'files'}
        </span>
        <button
          onClick={onClose}
          className="text-warm-muted hover:text-warm-secondary text-sm px-1"
          title="Close"
        >
          &#10005;
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="px-4 py-3 text-sm text-warm-muted">Loading files...</div>
      ) : files.length === 0 ? (
        <div className="px-4 py-3 text-sm text-warm-muted">No files found</div>
      ) : (
        <div className="max-h-72 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs font-medium text-warm-muted uppercase bg-surface-muted sticky top-0">
              <tr>
                <th className="px-4 py-1.5">File</th>
                <th className="px-4 py-1.5 text-right w-20">Size</th>
                <th className="px-4 py-1.5 text-right w-32">Modified</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm">
              {Array.from(grouped.entries()).map(([chapter, chapterFiles]) => (
                <ChapterGroup key={chapter} chapter={chapter} files={chapterFiles} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      {files.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2 bg-surface-muted border-t border-warm text-xs text-warm-muted">
          <span>{totalChapters} {totalChapters === 1 ? 'chapter' : 'chapters'} · {totalFiles} {totalFiles === 1 ? 'file' : 'files'}</span>
          <span>{formatSize(totalSize)}</span>
        </div>
      )}
    </div>
  );
}

// ─── Chapter Group ───

function ChapterGroup({ chapter, files }: { chapter: string; files: RelayFileInfo[] }) {
  return (
    <>
      {/* Chapter header row */}
      <tr className="bg-surface-muted">
        <td colSpan={3} className="px-4 py-1 text-xs font-semibold text-warm-secondary">
          Chapter {chapter}
        </td>
      </tr>
      {/* File rows */}
      {files.map((file) => (
        <tr key={file.filename} className="hover:bg-surface-hover">
          <td className="px-4 py-1.5 font-mono text-xs text-warm-secondary truncate max-w-[300px]">
            {file.filename}
          </td>
          <td className="px-4 py-1.5 text-xs text-warm-muted text-right">
            {formatSize(file.size)}
          </td>
          <td className="px-4 py-1.5 text-xs text-warm-muted text-right">
            {formatRelativeTime(file.modified)}
          </td>
        </tr>
      ))}
    </>
  );
}

// ─── Activity Feed ───

function ActivityFeed({ events }: { events?: RelayActivityEvent[] }) {
  if (!events || events.length === 0) return null;

  const getArrow = (action: RelayActivityEvent['action']): string => {
    switch (action) {
      case 'push': return '\u2191';
      case 'collect': return '\u2193';
      case 'promote': return '\u21BB';
      case 'file-detected': return '\u2193';
      default: return '\u2022';
    }
  };

  return (
    <div className="bg-surface-muted border border-warm rounded-lg px-4 py-3">
      <h3 className="text-xs font-semibold text-warm-muted uppercase tracking-wider mb-2">
        Recent Activity
      </h3>
      <div className="space-y-1">
        {events.slice(0, 8).map((event) => (
          <div key={event.id} className="flex items-start gap-2 text-xs">
            <span className="text-warm-muted w-3 text-center shrink-0 font-mono">
              {getArrow(event.action)}
            </span>
            <span className="text-warm-secondary flex-1 truncate">{event.description}</span>
            <span className="text-warm-muted shrink-0">
              {formatRelativeTime(event.timestamp)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── FR-147: Blocked Projects Banner ───

function BlockedProjectsBanner({
  projects,
  onSyncVideoProject,
  isSyncing,
}: {
  projects: RelayProjectSyncInfo[];
  onSyncVideoProject: () => void;
  isSyncing: boolean;
}) {
  const totalFiles = projects.reduce(
    (sum, p) => sum + Object.values(p.subfolders).reduce((s, v) => s + v.fileCount, 0),
    0
  );

  return (
    <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-amber-800 flex items-center gap-1.5">
            <span>&#9888;</span>
            Waiting for project sync
          </h3>
          <p className="text-xs text-amber-700 mt-1">
            {projects.length} {projects.length === 1 ? 'project has' : 'projects have'} {totalFiles} {totalFiles === 1 ? 'file' : 'files'} in
            relay, but {projects.length === 1 ? "doesn't" : "don't"} exist locally yet. Sync Video Project to unblock.
          </p>
        </div>
        <button
          onClick={onSyncVideoProject}
          disabled={isSyncing}
          className="shrink-0 px-3 py-1.5 text-sm font-medium bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSyncing ? 'Syncing...' : 'Sync Video Project'}
        </button>
      </div>

      {/* Project list */}
      <div className="flex flex-wrap gap-2">
        {projects.map((p) => {
          const fileCount = Object.values(p.subfolders).reduce((s, v) => s + v.fileCount, 0);
          return (
            <span
              key={p.projectCode}
              className="inline-flex items-center gap-1.5 text-xs font-mono bg-amber-100 text-amber-800 rounded px-2 py-1"
            >
              {p.projectCode}
              <span className="text-amber-600">{fileCount} {fileCount === 1 ? 'file' : 'files'}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ─── Setup Guide ───

function SetupGuide() {
  return (
    <details className="border border-warm rounded-lg">
      <summary className="px-4 py-2.5 text-sm font-medium text-warm-secondary cursor-pointer hover:bg-surface-hover select-none">
        Setup Help — How to configure Relay for a new collaborator
      </summary>
      <div className="px-4 pb-4 pt-1 space-y-4 text-sm text-warm-secondary">
        {/* SyncThing install */}
        <div>
          <h4 className="font-semibold text-warm-secondary mb-2">1. Install &amp; Start SyncThing</h4>
          <ol className="list-decimal list-inside space-y-1.5 text-xs text-warm-secondary">
            <li>Install on both machines: <code className="font-mono bg-surface-muted px-1 rounded">brew install syncthing</code></li>
            <li>Start the service: <code className="font-mono bg-surface-muted px-1 rounded">brew services start syncthing</code></li>
            <li>Open the SyncThing web UI: <code className="font-mono bg-surface-muted px-1 rounded">http://localhost:8384</code></li>
            <li>Both machines need SyncThing running — repeat on the editor&#39;s machine</li>
          </ol>
        </div>

        {/* Folder setup */}
        <div>
          <h4 className="font-semibold text-warm-secondary mb-2">2. Create &amp; Share the Relay Folder</h4>
          <ol className="list-decimal list-inside space-y-1.5 text-xs text-warm-secondary">
            <li>Create relay folder: <code className="font-mono bg-surface-muted px-1 rounded">mkdir -p ~/relay/flihub-appydave</code></li>
            <li>In SyncThing UI &rarr; <strong>Add Folder</strong> &rarr; set path to <code className="font-mono bg-surface-muted px-1 rounded">~/relay/flihub-appydave</code></li>
            <li>Add a <strong>Remote Device</strong> — copy the Device ID from the editor&#39;s SyncThing UI (<strong>Actions &rarr; Show ID</strong>)</li>
            <li>Share the folder with the editor&#39;s device</li>
            <li>On the editor&#39;s machine: accept the incoming folder share in their SyncThing UI</li>
          </ol>
        </div>

        {/* Creator config */}
        <div>
          <h4 className="font-semibold text-warm-secondary mb-2">3. Configure FliHub — Recorder (David)</h4>
          <div className="text-xs text-warm-muted mb-1">Add to <code className="font-mono bg-surface-muted px-1 rounded">server/config.json</code>:</div>
          <pre className="font-mono text-xs bg-surface-muted border border-warm rounded p-2 overflow-x-auto">
{`"relayDirectory": "/Users/davidcruwys/relay/flihub-appydave",
"relayEnabled": true,
"machineRole": "recorder"`}
          </pre>
        </div>

        {/* Editor config */}
        <div>
          <h4 className="font-semibold text-warm-secondary mb-2">4. Configure FliHub — Editor (Jan)</h4>
          <div className="text-xs text-warm-muted mb-1">Add to <code className="font-mono bg-surface-muted px-1 rounded">server/config.json</code> on the editor&#39;s machine:</div>
          <pre className="font-mono text-xs bg-surface-muted border border-warm rounded p-2 overflow-x-auto">
{`"relayDirectory": "/home/jan/relay/flihub-appydave",
"relayEnabled": true,
"machineRole": "editor"`}
          </pre>
        </div>

        {/* Verify */}
        <div>
          <h4 className="font-semibold text-warm-secondary mb-2">5. Verify</h4>
          <ol className="list-decimal list-inside space-y-1.5 text-xs text-warm-secondary">
            <li>Restart FliHub server on both machines</li>
            <li>Check this page shows <span className="text-green-600 font-medium">● Relay connected</span></li>
            <li>Check SyncThing UI at <code className="font-mono bg-surface-muted px-1 rounded">http://localhost:8384</code> shows the folder as &quot;Up to Date&quot;</li>
          </ol>
        </div>
      </div>
    </details>
  );
}
