// Relay Kanban Board — horizontal four-lane workflow with divergence status
import { useState, useMemo } from 'react';
import {
  useRelayStatus,
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
  RelayDivergenceInfo,
  RelayProjectSyncInfo,
} from '../../../../shared/types';

import {
  LANES,
  defaultIsPush,
  KanbanLaneWrapper,
  FinalLane,
  FileDrawer,
  ActivityFeed,
  BlockedProjectsBanner,
  SetupGuide,
} from './relay';
import type { SyncDirection } from './relay';

// ─── Main Component ───

export function RelayTool() {
  const { data: env } = useEnvironment();
  const { data: config } = useConfig();
  const role = env?.machineRole || 'recorder';
  const isCreator = role !== 'editor';

  const { data: status, isLoading: statusLoading } = useRelayStatus();
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
          projectCode={projectCode}
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
