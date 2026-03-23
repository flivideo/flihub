// B044: Sync Hub — full sync page with channel cards and conflict UI
import { useState } from 'react';
import { useSyncStatus, useSyncPush, useSyncPull, useSyncResolve } from '../../hooks/useSyncApi';
import { useEnvironment } from '../../hooks/useConfigApi';
import { useConfig } from '../../hooks/useApi';
import type { SyncChannelStatus, SyncConflictFile } from '../../../../shared/types';

// ─── Helpers ───

function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  if (diffHours < 24) return `${diffHours} hr${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function shortHash(hash: string): string {
  return hash ? hash.slice(0, 7) : '—';
}

interface StatusBadgeConfig {
  bg: string;
  text: string;
  label: string;
}

function getStatusBadge(channel: SyncChannelStatus): StatusBadgeConfig {
  switch (channel.state) {
    case 'clean':
      return { bg: 'bg-green-50 border-green-200', text: 'text-green-700', label: 'Up to date' };
    case 'dirty':
      return { bg: 'bg-red-50 border-red-200', text: 'text-red-700', label: `${channel.dirtyCount} file${channel.dirtyCount !== 1 ? 's' : ''} changed` };
    case 'behind':
      return { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', label: `${channel.behindCount} commit${channel.behindCount !== 1 ? 's' : ''} behind` };
    case 'ahead':
      return { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', label: `${channel.aheadCount} ahead` };
    case 'diverged':
      return { bg: 'bg-red-50 border-red-200', text: 'text-red-700', label: `${channel.dirtyCount} dirty, ${channel.behindCount} behind` };
    case 'conflict':
      return { bg: 'bg-purple-50 border-purple-200', text: 'text-purple-700', label: `${channel.dirtyCount} conflict${channel.dirtyCount !== 1 ? 's' : ''}` };
    default:
      return { bg: 'bg-gray-50 border-gray-200', text: 'text-gray-500', label: 'Unknown' };
  }
}

// ─── Main Component ───

export function SyncTool() {
  const { data: env } = useEnvironment();
  const { data: config } = useConfig();
  const { data: status, isLoading } = useSyncStatus();
  const syncPush = useSyncPush();
  const syncPull = useSyncPull();
  const syncResolve = useSyncResolve();

  const [conflicts, setConflicts] = useState<SyncConflictFile[]>([]);
  const [conflictChannel, setConflictChannel] = useState<'app-code' | 'video-project'>('video-project');
  const [restartInfo, setRestartInfo] = useState<string | null>(null);

  const role = env?.machineRole || 'recorder';
  const isCreator = role !== 'editor';
  const projectCode = config?.activeProject || '';

  const hasConflicts = conflicts.length > 0;
  const isPending = syncPush.isPending || syncPull.isPending || syncResolve.isPending;

  // Handle push (video project only, creator only)
  const handlePush = () => {
    syncPush.mutate();
  };

  // Handle pull
  const handlePull = (channel: 'app-code' | 'video-project') => {
    syncPull.mutate(channel, {
      onSuccess: (data) => {
        if (data.conflicts && data.conflicts.length > 0) {
          setConflicts(data.conflicts);
          setConflictChannel(channel);
        }
        if (data.restartInstructions) {
          setRestartInfo(data.restartInstructions);
        }
      },
    });
  };

  // Handle conflict resolution
  const handleResolve = (file: string, resolution: 'keep-mine' | 'keep-theirs') => {
    // Determine channel from context — conflicts come from the last pull
    // For now, video-project is the main conflict source
    syncResolve.mutate(
      { channel: conflictChannel, file, resolution },
      {
        onSuccess: () => {
          setConflicts((prev) => {
            const next = prev.filter((c) => c.path !== file);
            return next;
          });
        },
      }
    );
  };

  if (isLoading) {
    return <div className="text-sm text-gray-500 p-4">Loading sync status...</div>;
  }

  if (!status?.success) {
    return (
      <div className="space-y-4 p-4">
        <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded p-3">
          Sync status unavailable{status?.error ? `: ${status.error}` : ''}
        </div>
      </div>
    );
  }

  const appCode = status.appCode;
  const videoProject = status.videoProject;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">
          Sync {projectCode && <span className="text-gray-500">&mdash; {projectCode}</span>}
        </h2>
      </div>

      {/* Notification banners */}
      {videoProject && videoProject.state === 'dirty' && isCreator && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <div className="text-sm text-amber-800">
            Video project has uncommitted changes. {videoProject.dirtyCount} new file{videoProject.dirtyCount !== 1 ? 's' : ''} since last push.
          </div>
          <button
            onClick={handlePush}
            disabled={isPending || hasConflicts}
            className="px-3 py-1.5 text-sm font-medium bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {syncPush.isPending ? 'Pushing...' : 'Push Project'}
          </button>
        </div>
      )}

      {appCode && appCode.state === 'behind' && !isCreator && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <div className="text-sm text-amber-800">
            App update available. {appCode.behindCount} new commit{appCode.behindCount !== 1 ? 's' : ''}. Pull to update.
          </div>
          <button
            onClick={() => handlePull('app-code')}
            disabled={isPending || hasConflicts}
            className="px-3 py-1.5 text-sm font-medium bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {syncPull.isPending ? 'Pulling...' : 'Pull & Restart'}
          </button>
        </div>
      )}

      {videoProject && videoProject.state === 'behind' && !isCreator && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <div className="text-sm text-amber-800">
            New recordings available. Pull to sync.
          </div>
          <button
            onClick={() => handlePull('video-project')}
            disabled={isPending || hasConflicts}
            className="px-3 py-1.5 text-sm font-medium bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {syncPull.isPending ? 'Pulling...' : 'Pull Project'}
          </button>
        </div>
      )}

      {hasConflicts && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-3">
          <div className="text-sm font-medium text-purple-800">
            {conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''} detected. Resolve before continuing.
          </div>
        </div>
      )}

      {/* Channel Cards */}
      <div className="grid grid-cols-2 gap-4">
        {appCode && (
          <ChannelCard
            title="App Code"
            icon="code"
            path="~/dev/ad/flivideo/flihub"
            channel={appCode}
            isCreator={isCreator}
            isPending={isPending}
            hasConflicts={hasConflicts}
            onPush={undefined}
            onPull={() => handlePull('app-code')}
            pushLabel="Push Code"
            pullLabel={!isCreator ? 'Pull & Restart' : 'Pull Code'}
            pushDisabled={true}
            pushHint="Use terminal to push code"
          />
        )}
        {videoProject && (
          <ChannelCard
            title="Video Project"
            icon="video"
            path={projectCode ? `~/.../projects/${projectCode}` : 'No project selected'}
            channel={videoProject}
            isCreator={isCreator}
            isPending={isPending}
            hasConflicts={hasConflicts}
            onPush={isCreator ? handlePush : undefined}
            onPull={() => handlePull('video-project')}
            pushLabel="Push Project"
            pullLabel="Pull Project"
            pushDisabled={!isCreator}
          />
        )}
      </div>

      {/* Restart instructions */}
      {restartInfo && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
          <div className="text-sm font-medium text-blue-800 mb-1">Code updated. To apply:</div>
          <ol className="text-sm text-blue-700 list-decimal list-inside space-y-0.5">
            <li>npm install (if dependencies changed)</li>
            <li>npm run build</li>
            <li>overmind restart (or ./start.sh)</li>
          </ol>
        </div>
      )}

      {/* Conflict resolution section */}
      {hasConflicts && <ConflictSection conflicts={conflicts} onResolve={handleResolve} isPending={syncResolve.isPending} />}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-400 border-t border-gray-100 pt-3">
        <span>Role: {isCreator ? 'Creator' : 'Editor'}</span>
      </div>
    </div>
  );
}

// ─── Channel Card ───

interface ChannelCardProps {
  title: string;
  icon: 'code' | 'video';
  path: string;
  channel: SyncChannelStatus;
  isCreator: boolean;
  isPending: boolean;
  hasConflicts: boolean;
  onPush?: () => void;
  onPull: () => void;
  pushLabel: string;
  pullLabel: string;
  pushDisabled?: boolean;
  pushHint?: string;
}

function ChannelCard({
  title,
  icon,
  path,
  channel,
  isCreator,
  isPending,
  hasConflicts,
  onPush,
  onPull,
  pushLabel,
  pullLabel,
  pushDisabled,
  pushHint,
}: ChannelCardProps) {
  const badge = getStatusBadge(channel);

  const canPush = onPush && !pushDisabled && (channel.state === 'dirty' || channel.state === 'diverged');
  const canPull = channel.state === 'behind' || channel.state === 'diverged';
  const nothingToSync = channel.state === 'clean';

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base">
              {icon === 'code' ? '💻' : '🎬'}
            </span>
            <span className="text-sm font-semibold text-gray-900">{title}</span>
          </div>
          <div className="text-xs text-gray-400 font-mono mt-0.5">{path}</div>
        </div>
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${badge.text} ${badge.bg} border rounded-full px-2.5 py-0.5`}>
          <span className={`w-1.5 h-1.5 rounded-full ${
            channel.state === 'clean' ? 'bg-green-500' :
            channel.state === 'dirty' ? 'bg-red-500' :
            channel.state === 'behind' ? 'bg-amber-500' :
            channel.state === 'ahead' ? 'bg-blue-500' :
            channel.state === 'diverged' ? 'bg-red-500' :
            channel.state === 'conflict' ? 'bg-purple-500' :
            'bg-gray-400'
          }`} />
          {badge.label}
        </span>
      </div>

      {/* Info boxes */}
      <div className="px-4 py-3 grid grid-cols-3 gap-3">
        <InfoBox label="LOCAL" value={shortHash(channel.localHash)} sub={formatRelativeTime(channel.lastFetch)} />
        <InfoBox
          label="REMOTE"
          value={shortHash(channel.remoteHash)}
          sub={channel.localHash === channel.remoteHash ? 'Same' : 'Different'}
        />
        <InfoBox label="LAST SYNC" value={formatRelativeTime(channel.lastFetch)} sub="" />
      </div>

      {/* Actions */}
      <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-2">
        {/* Push button */}
        <div className="relative group">
          <button
            onClick={onPush}
            disabled={isPending || hasConflicts || !canPush || pushDisabled}
            className="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pushLabel}
          </button>
          {pushHint && pushDisabled && (
            <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
              {pushHint}
            </div>
          )}
        </div>

        {/* Pull button */}
        <button
          onClick={onPull}
          disabled={isPending || hasConflicts || !canPull}
          className="px-3 py-1.5 text-sm font-medium bg-gray-100 text-gray-700 border border-gray-200 rounded hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pullLabel}
        </button>

        {nothingToSync && (
          <span className="text-xs text-gray-400 ml-2">Nothing to sync</span>
        )}
      </div>
    </div>
  );
}

// ─── Info Box ───

function InfoBox({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded px-3 py-2">
      <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label}</div>
      <div className="text-sm font-mono font-medium text-gray-900 mt-0.5">{value}</div>
      {sub && <div className="text-[10px] text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

// ─── Conflict Section ───

interface ConflictSectionProps {
  conflicts: SyncConflictFile[];
  onResolve: (file: string, resolution: 'keep-mine' | 'keep-theirs') => void;
  isPending: boolean;
}

function ConflictSection({ conflicts, onResolve, isPending }: ConflictSectionProps) {
  return (
    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-base">⚡</span>
        <span className="text-sm font-semibold text-purple-800">
          Merge conflict in Video Project
        </span>
      </div>
      <div className="text-sm text-purple-700">
        Pull found {conflicts.length} file{conflicts.length !== 1 ? 's' : ''} changed both locally and remotely
      </div>

      <div className="space-y-2">
        {conflicts.map((conflict) => (
          <div key={conflict.path} className="bg-white border border-purple-200 rounded-lg px-4 py-3">
            <div className="font-mono text-sm text-purple-900 mb-1">{conflict.path}</div>
            <div className="text-xs text-gray-500 mb-2">
              {conflict.status === 'both-modified' ? 'Both modified. Choose which to keep:' :
               conflict.status === 'deleted-by-them' ? 'Deleted remotely, modified locally:' :
               conflict.status === 'deleted-by-us' ? 'Deleted locally, modified remotely:' :
               'Added by both sides:'}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onResolve(conflict.path, 'keep-mine')}
                disabled={isPending}
                className="px-3 py-1.5 text-sm font-medium bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Keep mine
              </button>
              <button
                onClick={() => onResolve(conflict.path, 'keep-theirs')}
                disabled={isPending}
                className="px-3 py-1.5 text-sm font-medium bg-gray-100 text-gray-700 border border-gray-200 rounded hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Keep theirs
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
