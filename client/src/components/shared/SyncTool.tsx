// B044+B050: Sync Hub — full sync page with channel cards, file lists, confirmation modal, and conflict UI
import { useState } from 'react';
import { useSyncStatus, useSyncPush, useSyncPull, useSyncResolve } from '../../hooks/useSyncApi';
import { useEnvironment } from '../../hooks/useConfigApi';
import { useConfig } from '../../hooks/useApi';
import { useOpenFolder } from '../../hooks/useOpenFolder';
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
      return { bg: 'bg-surface-muted border-warm', text: 'text-warm-muted', label: 'Unknown' };
  }
}

/** Parse git porcelain status line into { status, path } */
function parseDirtyFile(line: string): { status: string; path: string } {
  // git status --porcelain format: "XY path" or "XY path -> newpath"
  const statusCode = line.substring(0, 2).trim();
  const filePath = line.substring(3).split(' -> ').pop() || line.substring(3);
  let status: string;
  if (statusCode === '??' || statusCode.includes('A')) {
    status = 'new';
  } else if (statusCode.includes('D')) {
    status = 'deleted';
  } else {
    status = 'modified';
  }
  return { status, path: filePath };
}

/** Group files by type category */
function groupFiles(files: { status: string; path: string }[]): Record<string, { status: string; path: string }[]> {
  const groups: Record<string, { status: string; path: string }[]> = {};
  for (const file of files) {
    const ext = (file.path.split('.').pop() || '').toLowerCase();
    let group: string;
    if (['mov', 'mp4', 'avi', 'mkv'].includes(ext)) {
      group = 'Recordings';
    } else if (['txt', 'srt', 'vtt'].includes(ext)) {
      group = 'Transcripts';
    } else if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) {
      group = 'Images';
    } else if (['tsx', 'jsx'].includes(ext)) {
      group = 'Components';
    } else if (ext === 'ts' || ext === 'js') {
      group = 'Source';
    } else if (ext === 'css') {
      group = 'Styles';
    } else if (['json', 'md', 'yml', 'yaml', 'toml'].includes(ext)) {
      group = 'Config';
    } else {
      group = 'Other';
    }
    if (!groups[group]) groups[group] = [];
    groups[group].push(file);
  }
  return groups;
}

/** Build a summary string like "5 components, 3 styles, 2 config" */
function buildFileSummary(files: { status: string; path: string }[]): string {
  const groups = groupFiles(files);
  return Object.entries(groups)
    .map(([name, items]) => `${items.length} ${name.toLowerCase()}`)
    .join(' · ');
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
  const [pushConfirm, setPushConfirm] = useState<'app-code' | 'video-project' | null>(null);

  const role = env?.machineRole || 'recorder';
  const isCreator = role !== 'editor';
  const projectCode = config?.activeProject || '';

  const hasConflicts = conflicts.length > 0;
  const isPending = syncPush.isPending || syncPull.isPending || syncResolve.isPending;

  // Handle push — show confirmation first
  const handlePushRequest = (channel: 'app-code' | 'video-project') => {
    setPushConfirm(channel);
  };

  const handlePushConfirm = () => {
    if (!pushConfirm) return;
    syncPush.mutate(pushConfirm);
    setPushConfirm(null);
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
    syncResolve.mutate(
      { channel: conflictChannel, file, resolution },
      {
        onSuccess: () => {
          setConflicts((prev) => prev.filter((c) => c.path !== file));
        },
      }
    );
  };

  if (isLoading) {
    return <div className="text-sm text-warm-muted p-4">Loading sync status...</div>;
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

  // Parse dirty files for confirmation modal
  const confirmChannel = pushConfirm === 'app-code' ? appCode : pushConfirm === 'video-project' ? videoProject : null;
  const confirmFiles = confirmChannel?.dirtyFiles?.map(parseDirtyFile) || [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-warm-primary">
          Sync {projectCode && <span className="text-warm-muted">&mdash; {projectCode}</span>}
        </h2>
        <span className="text-xs text-warm-faint bg-surface border border-warm px-2.5 py-0.5 rounded-full uppercase tracking-wider font-semibold">
          {isCreator ? 'Creator' : 'Editor'}
        </span>
      </div>

      {/* Notification banners */}
      {videoProject && videoProject.state === 'dirty' && isCreator && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <div className="text-sm text-amber-800">
            <strong>{videoProject.dirtyCount} new file{videoProject.dirtyCount !== 1 ? 's' : ''}</strong> in video project since last push.
            {videoProject.dirtyFiles && (
              <span className="ml-1 text-amber-600">{buildFileSummary(videoProject.dirtyFiles.map(parseDirtyFile))}</span>
            )}
          </div>
          <button
            onClick={() => handlePushRequest('video-project')}
            disabled={isPending || hasConflicts}
            className="px-3 py-1.5 text-sm font-medium bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {syncPush.isPending ? 'Pushing...' : 'Push Project'}
          </button>
        </div>
      )}

      {appCode && appCode.state === 'dirty' && isCreator && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <div className="text-sm text-amber-800">
            <strong>{appCode.dirtyCount} file{appCode.dirtyCount !== 1 ? 's' : ''} changed</strong> in app code.
            {appCode.dirtyFiles && (
              <span className="ml-1 text-amber-600">{buildFileSummary(appCode.dirtyFiles.map(parseDirtyFile))}</span>
            )}
          </div>
          <button
            onClick={() => handlePushRequest('app-code')}
            disabled={isPending || hasConflicts}
            className="px-3 py-1.5 text-sm font-medium bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {syncPush.isPending ? 'Pushing...' : 'Push Code'}
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
            onPush={isCreator ? () => handlePushRequest('app-code') : undefined}
            onPull={() => handlePull('app-code')}
            pushLabel="Push Code"
            pullLabel={!isCreator ? 'Pull & Restart' : 'Pull Code'}
            pushDisabled={!isCreator}
            pushHint={!isCreator ? 'Only creators can push code' : undefined}
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
            onPush={isCreator ? () => handlePushRequest('video-project') : undefined}
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

      {/* Push Confirmation Modal */}
      {pushConfirm && confirmChannel && (
        <div
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
          onClick={() => setPushConfirm(null)}
        >
          <div
            className="bg-surface border border-warm rounded-xl shadow-xl w-[480px] max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-warm flex items-center gap-2 text-sm font-semibold text-warm-primary">
              {pushConfirm === 'app-code' ? '💻' : '🎬'}
              Push {pushConfirm === 'app-code' ? 'App Code' : 'Video Project'}
            </div>
            <div className="px-5 py-4 space-y-3">
              <p className="text-sm text-warm-secondary">
                This will commit and push <strong>{confirmFiles.length} file{confirmFiles.length !== 1 ? 's' : ''}</strong> to <code className="text-xs bg-surface-muted px-1.5 py-0.5 rounded">origin/main</code>.
              </p>

              {confirmFiles.length > 0 && (
                <div className="text-xs text-warm-muted">
                  {buildFileSummary(confirmFiles)}
                </div>
              )}

              {/* File list */}
              {confirmFiles.length > 0 && (
                <div className="border border-warm rounded-lg overflow-hidden max-h-[240px] overflow-y-auto">
                  {Object.entries(groupFiles(confirmFiles)).map(([group, files]) => (
                    <div key={group}>
                      <div className="text-[10px] font-bold text-warm-faint uppercase tracking-wider px-3 py-1.5 bg-surface-muted border-b border-warm sticky top-0">
                        {group} ({files.length})
                      </div>
                      {files.map((f) => (
                        <div key={f.path} className="flex items-center justify-between px-3 py-1.5 text-xs font-mono border-b border-warm last:border-b-0">
                          <span className="text-warm-secondary truncate mr-2">{f.path}</span>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0 ${
                            f.status === 'new' ? 'text-green-700 bg-green-50' :
                            f.status === 'deleted' ? 'text-red-700 bg-red-50' :
                            'text-amber-700 bg-amber-50'
                          }`}>
                            {f.status === 'new' ? 'A' : f.status === 'deleted' ? 'D' : 'M'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="px-5 py-3 border-t border-warm flex justify-end gap-2">
              <button
                onClick={() => setPushConfirm(null)}
                className="px-3 py-1.5 text-sm font-medium bg-surface-muted text-warm-secondary border border-warm rounded hover:bg-surface-hover transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePushConfirm}
                disabled={syncPush.isPending}
                className="px-3 py-1.5 text-sm font-medium bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {syncPush.isPending ? 'Pushing...' : 'Push to Remote'}
              </button>
            </div>
          </div>
        </div>
      )}
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
  const [showFiles, setShowFiles] = useState(false);
  const badge = getStatusBadge(channel);
  const { mutate: openFolder } = useOpenFolder();

  const canPush = onPush && !pushDisabled && (channel.state === 'dirty' || channel.state === 'diverged');
  const canPull = channel.state === 'behind' || channel.state === 'diverged';
  const nothingToSync = channel.state === 'clean';

  const dirtyFiles = channel.dirtyFiles?.map(parseDirtyFile) || [];
  const grouped = dirtyFiles.length > 0 ? groupFiles(dirtyFiles) : {};

  return (
    <div className="bg-surface border border-warm rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-warm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base">
              {icon === 'code' ? '💻' : '🎬'}
            </span>
            <span className="text-sm font-semibold text-warm-primary">{title}</span>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-xs text-warm-muted font-mono">{path}</span>
            <button
              onClick={() => openFolder(icon === 'code' ? 'project' : 'recordings')}
              className="p-0.5 text-warm-muted hover:text-warm-secondary hover:bg-surface-hover rounded transition-colors"
              title="Open in Finder"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </button>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${badge.text} ${badge.bg} border rounded-full px-2.5 py-0.5`}>
          <span className={`w-1.5 h-1.5 rounded-full ${
            channel.state === 'clean' ? 'bg-green-500' :
            channel.state === 'dirty' ? 'bg-red-500' :
            channel.state === 'behind' ? 'bg-amber-500' :
            channel.state === 'ahead' ? 'bg-blue-500' :
            channel.state === 'diverged' ? 'bg-red-500' :
            channel.state === 'conflict' ? 'bg-purple-500' :
            'bg-warm-muted'
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

      {/* File list — collapsible */}
      {dirtyFiles.length > 0 && (
        <div className="px-4 pb-3">
          <button
            onClick={() => setShowFiles(!showFiles)}
            className="flex items-center gap-1.5 text-xs font-medium text-warm-muted hover:text-warm-secondary transition-colors w-full text-left py-1"
          >
            <span className={`text-[10px] transition-transform ${showFiles ? 'rotate-90' : ''}`}>&#9654;</span>
            {showFiles ? 'Hide' : 'Show'} {dirtyFiles.length} changed file{dirtyFiles.length !== 1 ? 's' : ''}
            <span className="text-warm-faint ml-1">({buildFileSummary(dirtyFiles)})</span>
          </button>
          {showFiles && (
            <div className="border border-warm rounded-lg overflow-hidden mt-1.5 max-h-[280px] overflow-y-auto">
              {Object.entries(grouped).map(([group, files]) => (
                <div key={group}>
                  <div className="text-[10px] font-bold text-warm-faint uppercase tracking-wider px-3 py-1.5 bg-surface-muted border-b border-warm sticky top-0">
                    {group} ({files.length})
                  </div>
                  {files.map((f) => (
                    <div key={f.path} className="flex items-center justify-between px-3 py-1.5 text-xs font-mono border-b border-warm last:border-b-0">
                      <span className="text-warm-secondary truncate mr-2">{f.path}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0 ${
                        f.status === 'new' ? 'text-green-700 bg-green-50' :
                        f.status === 'deleted' ? 'text-red-700 bg-red-50' :
                        'text-amber-700 bg-amber-50'
                      }`}>
                        {f.status === 'new' ? 'A' : f.status === 'deleted' ? 'D' : 'M'}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="px-4 py-3 border-t border-warm flex items-center gap-2">
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
          className="px-3 py-1.5 text-sm font-medium bg-surface-muted text-warm-secondary border border-warm rounded hover:bg-surface-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pullLabel}
        </button>

        {nothingToSync && (
          <span className="text-xs text-warm-muted ml-2">Nothing to sync</span>
        )}
      </div>
    </div>
  );
}

// ─── Info Box ───

function InfoBox({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-surface-muted border border-warm rounded px-3 py-2">
      <div className="text-[10px] font-semibold text-warm-muted uppercase tracking-wider">{label}</div>
      <div className="text-sm font-mono font-medium text-warm-primary mt-0.5">{value}</div>
      {sub && <div className="text-[10px] text-warm-muted mt-0.5">{sub}</div>}
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
        <span className="text-base">&#9889;</span>
        <span className="text-sm font-semibold text-purple-800">
          Merge conflict in Video Project
        </span>
      </div>
      <div className="text-sm text-purple-700">
        Pull found {conflicts.length} file{conflicts.length !== 1 ? 's' : ''} changed both locally and remotely
      </div>

      <div className="space-y-2">
        {conflicts.map((conflict) => (
          <div key={conflict.path} className="bg-surface border border-purple-200 rounded-lg px-4 py-3">
            <div className="font-mono text-sm text-purple-900 mb-1">{conflict.path}</div>
            <div className="text-xs text-warm-muted mb-2">
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
                className="px-3 py-1.5 text-sm font-medium bg-surface-muted text-warm-secondary border border-warm rounded hover:bg-surface-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
