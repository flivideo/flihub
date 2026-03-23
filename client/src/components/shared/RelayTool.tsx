// B040: Relay workflow lanes — three-column card layout with file drawers and activity feed
import { useState, useMemo } from 'react';
import {
  useRelayStatus,
  useRelayBrowse,
  useRelayFiles,
  useRelayActivity,
  useRelayPush,
  useRelayCollect,
  useRelayVersions,
  useRelayPromote,
} from '../../hooks/useRelayApi';
import { useEnvironment } from '../../hooks/useConfigApi';
import { useConfig } from '../../hooks/useApi';
import type {
  RelaySubfolder,
  RelayFileInfo,
  RelayActivityEvent,
  RelaySubfolderInfo,
} from '../../../../shared/types';

// ─── Lane Configuration ───

interface LaneConfig {
  key: RelaySubfolder;
  label: string;
  dotColor: string;
  dotBg: string;
}

const LANES: LaneConfig[] = [
  { key: 'recordings', label: 'Recordings', dotColor: '#3b82f6', dotBg: 'bg-blue-500' },
  { key: 'edit-1st', label: 'First Edit', dotColor: '#f59e0b', dotBg: 'bg-amber-500' },
  { key: 'edit-2nd', label: 'Final', dotColor: '#10b981', dotBg: 'bg-emerald-500' },
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

function getDirectionLabel(lane: RelaySubfolder, isCreator: boolean): string {
  if (lane === 'recordings') {
    return isCreator ? 'YOU \u2192 EDITOR' : 'CREATOR \u2192 YOU';
  }
  // edit-1st and edit-2nd flow editor → creator
  return isCreator ? 'EDITOR \u2192 YOU' : 'YOU \u2192 CREATOR';
}

function getActionLabel(lane: RelaySubfolder, isCreator: boolean): string {
  if (lane === 'recordings') {
    return isCreator ? 'Send to Editor' : 'Pull into Project';
  }
  if (lane === 'edit-1st') {
    return isCreator ? 'Pull from Editor' : 'Send to Creator';
  }
  // edit-2nd
  return isCreator ? 'Promote to Final' : 'Send to Creator';
}

function isPushAction(lane: RelaySubfolder, isCreator: boolean): boolean {
  if (lane === 'recordings') return isCreator;
  // edit-1st, edit-2nd: editor pushes, creator collects
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
  const { data: activityData } = useRelayActivity();
  const versions = useRelayVersions();
  const push = useRelayPush();
  const collect = useRelayCollect();
  const promote = useRelayPromote();

  const [openDrawer, setOpenDrawer] = useState<RelaySubfolder | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);

  const isConfigured = status?.configured && status?.enabled;
  const projectCode = config?.activeProject || '';

  // Find current project in browse data
  const currentProject = useMemo(() => {
    if (!browseData?.projects || !projectCode) return null;
    return browseData.projects.find(p => p.projectCode === projectCode) || null;
  }, [browseData?.projects, projectCode]);

  // Get subfolder stats for a lane
  const getStats = (lane: RelaySubfolder): RelaySubfolderInfo => {
    if (!currentProject) return { fileCount: 0, totalSize: 0 };
    return currentProject.subfolders[lane];
  };

  // Handle lane action button click
  const handleAction = (lane: RelaySubfolder) => {
    if (lane === 'edit-2nd' && isCreator) {
      // Promote: use selected version or first available
      const version = selectedVersion || versions.data?.versions?.[0]?.filename;
      if (version) {
        promote.mutate(version);
      }
      return;
    }

    if (isPushAction(lane, isCreator)) {
      push.mutate(lane);
    } else {
      collect.mutate(lane);
    }
  };

  const isActionPending = push.isPending || collect.isPending || promote.isPending;

  // ─── Loading / Not Configured States ───

  if (statusLoading) {
    return <div className="text-sm text-gray-500 p-4">Loading relay status...</div>;
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
        <div className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded p-3">
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
        <h2 className="text-base font-semibold text-gray-900">
          Relay {projectCode && <span className="text-gray-500">— {projectCode}</span>}
        </h2>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
          Relay connected
        </span>
      </div>

      {/* Three Lane Cards */}
      <div className="grid grid-cols-3 gap-4">
        {LANES.map((lane) => {
          const stats = getStats(lane.key);
          const direction = getDirectionLabel(lane.key, isCreator);
          const actionLabel = getActionLabel(lane.key, isCreator);

          return (
            <LaneCard
              key={lane.key}
              lane={lane}
              stats={stats}
              direction={direction}
              actionLabel={actionLabel}
              onAction={() => handleAction(lane.key)}
              isPending={isActionPending}
              isPush={isPushAction(lane.key, isCreator)}
              isDrawerOpen={openDrawer === lane.key}
              onToggleDrawer={() => setOpenDrawer(openDrawer === lane.key ? null : lane.key)}
              isCreator={isCreator}
              versions={lane.key === 'edit-2nd' ? versions.data?.versions : undefined}
              selectedVersion={selectedVersion}
              onSelectVersion={setSelectedVersion}
            />
          );
        })}
      </div>

      {/* File Drawer — full width below the cards */}
      {openDrawer && isConfigured && (
        <FileDrawer
          subfolder={openDrawer}
          label={LANES.find(l => l.key === openDrawer)?.label || openDrawer}
          isCreator={isCreator}
          onClose={() => setOpenDrawer(null)}
        />
      )}

      {/* Activity Feed */}
      <ActivityFeed events={activityData?.events} />

      {/* Setup Guide */}
      <SetupGuide />

      {/* Footer */}
      {status.relayDirectory && (
        <div className="flex items-center justify-between text-xs text-gray-400 border-t border-gray-100 pt-3">
          <span className="font-mono truncate">{status.relayDirectory}</span>
          <span className="inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            Connected
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Lane Card ───

interface LaneCardProps {
  lane: LaneConfig;
  stats: RelaySubfolderInfo;
  direction: string;
  actionLabel: string;
  onAction: () => void;
  isPending: boolean;
  isPush: boolean;
  isDrawerOpen: boolean;
  onToggleDrawer: () => void;
  isCreator: boolean;
  versions?: { filename: string; size: number; modified: string }[];
  selectedVersion: string | null;
  onSelectVersion: (v: string | null) => void;
}

function LaneCard({
  lane,
  stats,
  direction,
  actionLabel,
  onAction,
  isPending,
  isPush,
  isDrawerOpen,
  onToggleDrawer,
  isCreator,
  versions,
  selectedVersion,
  onSelectVersion,
}: LaneCardProps) {
  const hasFiles = stats.fileCount > 0;
  const isFinalLane = lane.key === 'edit-2nd';

  // For the final lane with promote action, show version selector
  const showVersionSelector = isFinalLane && isCreator && versions && versions.length > 0;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
      {/* Lane header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: lane.dotColor }}
          />
          <span className="text-sm font-semibold text-gray-900">{lane.label}</span>
        </div>
        <span className="text-[10px] font-medium text-gray-400 tracking-wide uppercase">
          {direction}
        </span>
      </div>

      {/* Stats */}
      <div>
        {hasFiles ? (
          <>
            <div className="text-2xl font-bold text-gray-900">
              {stats.fileCount}
              <span className="text-sm font-normal text-gray-500 ml-1">
                {stats.fileCount === 1 ? 'file' : 'files'}
              </span>
            </div>
            <div className="text-xs text-gray-500">{formatSize(stats.totalSize)}</div>
          </>
        ) : (
          <div className="text-sm text-gray-400 py-2">No files yet</div>
        )}
      </div>

      {/* Version selector for Final lane (creator only) */}
      {showVersionSelector && (
        <div className="border border-gray-200 rounded max-h-24 overflow-y-auto divide-y divide-gray-100">
          {versions.map((v) => (
            <button
              key={v.filename}
              onClick={() => onSelectVersion(selectedVersion === v.filename ? null : v.filename)}
              className={`w-full px-2 py-1.5 text-left text-xs hover:bg-gray-50 flex items-center justify-between ${
                selectedVersion === v.filename ? 'bg-blue-50 border-l-2 border-blue-500' : ''
              }`}
            >
              <span className="font-mono truncate">{v.filename}</span>
              <span className="text-gray-400 ml-1 shrink-0">
                {(v.size / (1024 * 1024)).toFixed(1)} MB
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Action button */}
      <button
        onClick={onAction}
        disabled={isPending || (!hasFiles && !isPush && !(isFinalLane && isCreator))}
        className="w-full px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? 'Working...' : actionLabel}
      </button>

      {/* Show files toggle */}
      {hasFiles && (
        <button
          onClick={onToggleDrawer}
          className="w-full text-xs text-gray-500 hover:text-blue-600 transition-colors text-center"
        >
          {isDrawerOpen ? 'Hide files' : `Show ${stats.fileCount} files \u25BC`}
        </button>
      )}
    </div>
  );
}

// ─── File Drawer ───

interface FileDrawerProps {
  subfolder: RelaySubfolder;
  label: string;
  isCreator: boolean;
  onClose: () => void;
}

function FileDrawer({ subfolder, label, isCreator, onClose }: FileDrawerProps) {
  // For push lanes, read from project; for collect lanes, read from relay
  const source = isPushAction(subfolder, isCreator) ? 'project' : 'relay';
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
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
        <span className="text-sm font-semibold text-gray-700">
          {label} — {totalFiles} {totalFiles === 1 ? 'file' : 'files'}
        </span>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-sm px-1"
          title="Close"
        >
          \u2715
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="px-4 py-3 text-sm text-gray-500">Loading files...</div>
      ) : files.length === 0 ? (
        <div className="px-4 py-3 text-sm text-gray-500">No files found</div>
      ) : (
        <div className="max-h-72 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs font-medium text-gray-500 uppercase bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-1.5">File</th>
                <th className="px-4 py-1.5 text-right w-20">Size</th>
                <th className="px-4 py-1.5 text-right w-32">Modified</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {Array.from(grouped.entries()).map(([chapter, chapterFiles]) => (
                <ChapterGroup key={chapter} chapter={chapter} files={chapterFiles} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      {files.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
          <span>{totalChapters} {totalChapters === 1 ? 'chapter' : 'chapters'} \u00B7 {totalFiles} {totalFiles === 1 ? 'file' : 'files'}</span>
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
      <tr className="bg-gray-50">
        <td colSpan={3} className="px-4 py-1 text-xs font-semibold text-gray-600">
          Chapter {chapter}
        </td>
      </tr>
      {/* File rows */}
      {files.map((file) => (
        <tr key={file.filename} className="hover:bg-gray-50">
          <td className="px-4 py-1.5 font-mono text-xs text-gray-700 truncate max-w-[300px]">
            {file.filename}
          </td>
          <td className="px-4 py-1.5 text-xs text-gray-500 text-right">
            {formatSize(file.size)}
          </td>
          <td className="px-4 py-1.5 text-xs text-gray-500 text-right">
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
      case 'push': return '\u2191';      // ↑
      case 'collect': return '\u2193';    // ↓
      case 'promote': return '\u21BB';    // ↻
      case 'file-detected': return '\u2193'; // ↓
      default: return '\u2022';
    }
  };

  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
        Recent Activity
      </h3>
      <div className="space-y-1.5">
        {events.slice(0, 10).map((event) => (
          <div key={event.id} className="flex items-start gap-2 text-sm">
            <span className="text-gray-400 w-4 text-center shrink-0 font-mono">
              {getArrow(event.action)}
            </span>
            <span className="text-gray-700 flex-1">{event.description}</span>
            <span className="text-xs text-gray-400 shrink-0">
              {formatRelativeTime(event.timestamp)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Setup Guide ───

function SetupGuide() {
  return (
    <details className="border border-gray-200 rounded-lg">
      <summary className="px-4 py-2.5 text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-50 select-none">
        Setup Help — How to configure Relay for a new collaborator
      </summary>
      <div className="px-4 pb-4 pt-1 space-y-4 text-sm text-gray-600">
        {/* SyncThing install */}
        <div>
          <h4 className="font-semibold text-gray-700 mb-2">1. Install &amp; Start SyncThing</h4>
          <ol className="list-decimal list-inside space-y-1.5 text-xs text-gray-600">
            <li>Install on both machines: <code className="font-mono bg-gray-100 px-1 rounded">brew install syncthing</code></li>
            <li>Start the service: <code className="font-mono bg-gray-100 px-1 rounded">brew services start syncthing</code></li>
            <li>Open the SyncThing web UI: <code className="font-mono bg-gray-100 px-1 rounded">http://localhost:8384</code></li>
            <li>Both machines need SyncThing running — repeat on the editor's machine</li>
          </ol>
        </div>

        {/* Folder setup */}
        <div>
          <h4 className="font-semibold text-gray-700 mb-2">2. Create &amp; Share the Relay Folder</h4>
          <ol className="list-decimal list-inside space-y-1.5 text-xs text-gray-600">
            <li>Create relay folder: <code className="font-mono bg-gray-100 px-1 rounded">mkdir -p ~/relay/flihub-appydave</code></li>
            <li>In SyncThing UI → <strong>Add Folder</strong> → set path to <code className="font-mono bg-gray-100 px-1 rounded">~/relay/flihub-appydave</code></li>
            <li>Add a <strong>Remote Device</strong> — copy the Device ID from the editor's SyncThing UI (<strong>Actions → Show ID</strong>)</li>
            <li>Share the folder with the editor's device</li>
            <li>On the editor's machine: accept the incoming folder share in their SyncThing UI</li>
          </ol>
        </div>

        {/* Creator config */}
        <div>
          <h4 className="font-semibold text-gray-700 mb-2">3. Configure FliHub — Recorder (David)</h4>
          <div className="text-xs text-gray-500 mb-1">Add to <code className="font-mono bg-gray-100 px-1 rounded">server/config.json</code>:</div>
          <pre className="font-mono text-xs bg-gray-50 border border-gray-200 rounded p-2 overflow-x-auto">
{`"relayDirectory": "/Users/davidcruwys/relay/flihub-appydave",
"relayEnabled": true,
"machineRole": "recorder"`}
          </pre>
        </div>

        {/* Editor config */}
        <div>
          <h4 className="font-semibold text-gray-700 mb-2">4. Configure FliHub — Editor (Jan)</h4>
          <div className="text-xs text-gray-500 mb-1">Add to <code className="font-mono bg-gray-100 px-1 rounded">server/config.json</code> on the editor's machine:</div>
          <pre className="font-mono text-xs bg-gray-50 border border-gray-200 rounded p-2 overflow-x-auto">
{`"relayDirectory": "/home/jan/relay/flihub-appydave",
"relayEnabled": true,
"machineRole": "editor"`}
          </pre>
        </div>

        {/* Verify */}
        <div>
          <h4 className="font-semibold text-gray-700 mb-2">5. Verify</h4>
          <ol className="list-decimal list-inside space-y-1.5 text-xs text-gray-600">
            <li>Restart FliHub server on both machines</li>
            <li>Check this page shows <span className="text-green-600 font-medium">● Relay connected</span></li>
            <li>Check SyncThing UI at <code className="font-mono bg-gray-100 px-1 rounded">http://localhost:8384</code> shows the folder as "Up to Date"</li>
          </ol>
        </div>
      </div>
    </details>
  );
}
