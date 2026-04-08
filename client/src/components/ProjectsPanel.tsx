// FR-148: Project list redesign
import { useState, useMemo, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import {
  useProjects,
  useUpdateProjectPriority,
  useUpdateProjectStage,
  useConfig,
  useUpdateConfig,
  useRefetchSuggestedNaming,
  useCreateProject,
} from '../hooks/useApi';
import { useProjectsSocket, useTranscriptsSocket } from '../hooks/useSocket';
import { useDelayedHover } from '../hooks/useDelayedHover';
import { useEnhancedRelayBrowse } from '../hooks/useRelayApi';
import { useDiskScanAll } from '../hooks/useProjectDiskApi';
import { useHoldStatus } from '../hooks/useHoldApi'; // B064
import { LoadingSpinner, ErrorMessage } from './shared';
import { ProjectListToolbar, STAGE_DISPLAY, STAGE_ORDER } from './ProjectListToolbar';
import { ProjectDrawer } from './ProjectDrawer';
import { copyProjectTranscript } from '../utils/clipboard';
import { filterProjects, extractProjectName } from '../utils/projectFilters';
import { formatShortDate } from '../utils/formatting';
import { formatBytes, getThresholdLevelClient } from '../utils/formatBytes';
import type {
  ProjectStats,
  ProjectPriority,
  ProjectStage,
  ProjectStageOverride,
  RelayProjectInfo,
  RelayProjectSyncInfo,
  RelaySyncStatus,
  RelaySubfolder,
  DiskSizeData,
  DiskThresholds,
  HoldLocation, // B064
} from '../../../shared/types';

interface ProjectsPanelProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onNavigateToTab?: (tab: any) => void;
}

// Valid project code pattern: letter + 2 digits + optional suffix (e.g., b71, b72-awesome)
const PROJECT_CODE_PATTERN = /^[a-zA-Z]\d{2}(-|$)/;

// Priority display config (NFR-87: visual rebrand to "starred" - code still uses "pinned")
const PRIORITY_DISPLAY: Record<ProjectPriority, { icon: string; iconClass: string; title: string }> = {
  pinned: { icon: '★', iconClass: 'text-amber-400', title: 'Starred (click to unstar)' },
  normal: { icon: '☆', iconClass: 'text-warm-faint', title: 'Click to star' },
};

// Simple toggle: normal ↔ pinned
function getNextPriority(current: ProjectPriority): ProjectPriority {
  return current === 'pinned' ? 'normal' : 'pinned';
}

// B050: Kanban mini-badge config for relay sync status
const SYNC_BADGE_CONFIG: Record<RelaySyncStatus, { bg: string; text: string; icon: (count: number) => string } | null> = {
  synced: { bg: 'bg-green-100', text: 'text-green-700', icon: () => '\u2713' },
  ahead: { bg: 'bg-blue-100', text: 'text-blue-700', icon: (n) => `\u2191${n}` },
  behind: { bg: 'bg-amber-100', text: 'text-amber-700', icon: (n) => `\u2193${n}` },
  diverged: { bg: 'bg-amber-100', text: 'text-amber-700', icon: () => '\u2195' },
  'local-only': { bg: 'bg-green-100', text: 'text-green-700', icon: () => '\u2713' },
  'relay-only': { bg: 'bg-amber-100', text: 'text-amber-700', icon: (n) => `↓${n}` },
};

const SUBFOLDER_LABELS: Record<RelaySubfolder, string> = {
  recordings: 'REC',
  'edit-1st': '1st',
  'edit-2nd': '2nd',
};

// Build tooltip description for a subfolder
function subfolderTooltipLine(
  label: string,
  localCount: number,
  relayCount: number,
  status: RelaySyncStatus
): string {
  if (localCount === 0 && relayCount === 0) return `${label}: \u2014 (no files)`;
  const localPart = `${localCount} local`;
  const relayPart = `${relayCount} relay`;
  let statusText: string;
  switch (status) {
    case 'synced': statusText = 'synced'; break;
    case 'ahead': statusText = `${localCount - relayCount} outgoing`; break;
    case 'behind': statusText = `${relayCount - localCount} incoming`; break;
    case 'diverged': statusText = 'diverged'; break;
    case 'local-only': statusText = 'local only'; break;
    case 'relay-only': statusText = `${relayCount} to collect`; break;
    default: statusText = String(status);
  }
  return `${label}: ${localPart}, ${relayPart} \u2014 ${statusText}`;
}

// B064: Hold badge config — maps HoldLocation to display properties
const HOLD_BADGE_CONFIG: Partial<Record<HoldLocation, { text: string; bg: string; textColor: string; tooltip: string }>> = {
  both: {
    text: 'T7 ⚠',
    bg: 'bg-amber-100',
    textColor: 'text-amber-700',
    tooltip: 'Offload incomplete — space not freed',
  },
  'holding-only': {
    text: 'T7',
    bg: 'bg-warm-secondary/20',
    textColor: 'text-warm-secondary',
    tooltip: 'On HOLDING SSD — local deleted',
  },
};

// B064: Per-row hold badge — calls useHoldStatus(code) to derive badge from HoldLocation
function HoldBadge({ code }: { code: string }) {
  const { isHovered, handleMouseEnter, handleMouseLeave } = useDelayedHover(0, 150);
  const { data: holdStatus } = useHoldStatus(code);

  if (!holdStatus) return null;

  const badgeConfig = HOLD_BADGE_CONFIG[holdStatus.location];
  if (!badgeConfig) return null; // 'local-only' and 'unknown' — no badge

  return (
    <span
      className="inline-flex items-center cursor-help relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${badgeConfig.bg} ${badgeConfig.textColor}`}>
        {badgeConfig.text}
      </span>
      {isHovered && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap">
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
          {badgeConfig.tooltip}
        </div>
      )}
    </span>
  );
}

// B050: Relay kanban mini-badges — shows sync status per subfolder
function RelayIndicator({ relayProject }: { relayProject?: RelayProjectInfo }) {
  const { isHovered, handleMouseEnter, handleMouseLeave } = useDelayedHover(0, 150);

  if (!relayProject) return null;

  // Check if we have enhanced sync info (RelayProjectSyncInfo)
  const hasSyncInfo = 'syncStatus' in relayProject && 'localSubfolders' in relayProject;

  // Fallback: old dot behavior when no detailed info
  if (!hasSyncInfo) {
    const rec = relayProject.subfolders.recordings;
    const edit1 = relayProject.subfolders['edit-1st'];
    const edit2 = relayProject.subfolders['edit-2nd'];

    const hasAny = rec.fileCount > 0 || edit1.fileCount > 0 || edit2.fileCount > 0;
    if (!hasAny) return null;

    const parts: string[] = [];
    if (rec.fileCount > 0) parts.push(`${rec.fileCount} recording${rec.fileCount !== 1 ? 's' : ''}`);
    if (edit1.fileCount > 0) parts.push(`${edit1.fileCount} first edit`);
    if (edit2.fileCount > 0) parts.push(`${edit2.fileCount} final`);

    return (
      <span
        className="inline-flex items-center gap-0.5 cursor-help relative"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {rec.fileCount > 0 && <span className="w-2 h-2 rounded-full bg-blue-500" />}
        {edit1.fileCount > 0 && <span className="w-2 h-2 rounded-full bg-amber-500" />}
        {edit2.fileCount > 0 && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
        {isHovered && (
          <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap">
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
            <div className="font-medium">Relay</div>
            {parts.map((p) => (
              <div key={p} className="text-gray-300">{p}</div>
            ))}
          </div>
        )}
      </span>
    );
  }

  // Enhanced: kanban mini-badges with sync status
  const syncProject = relayProject as RelayProjectSyncInfo;

  // FR-147: If project doesn't exist locally, show a blocked indicator
  if ('projectExists' in syncProject && syncProject.projectExists === false) {
    const totalFiles = Object.values(syncProject.subfolders).reduce((s, v) => s + v.fileCount, 0);
    if (totalFiles === 0) return null;
    return (
      <span
        className="inline-flex items-center gap-0.5 cursor-help relative"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-amber-100 text-amber-700">
          &#9888; {totalFiles}
        </span>
        {isHovered && (
          <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1.5 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap">
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
            <div className="font-medium mb-1 text-amber-300">Project not synced locally</div>
            <div className="text-gray-300">{totalFiles} files waiting in relay</div>
            <div className="text-gray-400">Sync Video Project to unblock</div>
          </div>
        )}
      </span>
    );
  }

  const subfolders: RelaySubfolder[] = ['recordings', 'edit-1st', 'edit-2nd'];

  // Build badges — only show subfolders that have files on either side
  const badges: { label: string; status: RelaySyncStatus; localCount: number; relayCount: number }[] = [];
  for (const sf of subfolders) {
    const relayInfo = syncProject.subfolders[sf];
    const localInfo = syncProject.localSubfolders[sf];
    const status = syncProject.syncStatus[sf];
    const hasFiles = relayInfo.fileCount > 0 || localInfo.fileCount > 0;
    if (hasFiles) {
      badges.push({
        label: SUBFOLDER_LABELS[sf],
        status,
        localCount: localInfo.fileCount,
        relayCount: relayInfo.fileCount,
      });
    }
  }

  if (badges.length === 0) return null;

  // Tooltip lines
  const tooltipLines = subfolders.map((sf) => {
    const relayInfo = syncProject.subfolders[sf];
    const localInfo = syncProject.localSubfolders[sf];
    const status = syncProject.syncStatus[sf];
    const label = sf === 'recordings' ? 'Recordings' : sf === 'edit-1st' ? '1st Edit' : '2nd Edit';
    return subfolderTooltipLine(label, localInfo.fileCount, relayInfo.fileCount, status);
  });

  return (
    <span
      className="inline-flex items-center gap-0.5 cursor-help relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {badges.map((badge) => {
        const config = SYNC_BADGE_CONFIG[badge.status];
        if (!config) return null;
        const diff = Math.abs(badge.localCount - badge.relayCount);
        return (
          <span
            key={badge.label}
            className={`text-xs px-1.5 py-0.5 rounded font-medium ${config.bg} ${config.text}`}
          >
            {badge.label} {config.icon(diff)}
          </span>
        );
      })}
      {isHovered && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1.5 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap">
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
          <div className="font-medium mb-1">Relay Sync Status</div>
          {tooltipLines.map((line) => (
            <div key={line} className="text-gray-300">{line}</div>
          ))}
        </div>
      )}
    </span>
  );
}

// FR-110: Stage cell with dropdown selector
function StageCell({
  project,
  onStageChange,
}: {
  project: ProjectStats;
  onStageChange: (stage: string) => void;
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const stageConfig = STAGE_DISPLAY[project.stage];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

  const handleSelect = (stage: string) => {
    setShowDropdown(false);
    onStageChange(stage);
  };

  return (
    <div ref={dropdownRef} className="relative inline-block">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowDropdown(!showDropdown);
        }}
        className={`text-xs font-medium px-1.5 py-0.5 rounded cursor-pointer hover:opacity-80 transition-opacity ${
          stageConfig?.bg || ''
        } ${stageConfig?.text || 'text-warm-muted'}`}
      >
        {stageConfig?.label || project.stage}
      </button>
      {showDropdown && (
        <div className="absolute z-50 top-full left-0 mt-1 bg-surface border border-warm rounded shadow-lg min-w-[120px]">
          {/* Auto option to reset */}
          <button
            onClick={() => handleSelect('auto')}
            className="w-full px-2 py-1 text-left text-xs hover:bg-surface-hover flex items-center gap-1 text-warm-secondary border-b border-warm"
          >
            <span>⟳</span> Auto
          </button>
          {/* All stages */}
          {STAGE_ORDER.map((stage) => {
            const config = STAGE_DISPLAY[stage];
            const isActive = project.stage === stage;
            return (
              <button
                key={stage}
                onClick={() => handleSelect(stage)}
                className={`w-full px-2 py-1 text-left text-xs hover:bg-surface-hover flex items-center gap-1 ${
                  isActive ? 'font-bold' : ''
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${config.bg}`}></span>
                <span className={config.text}>{config.label}</span>
                {isActive && <span className="ml-auto">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// FR-114: Copy transcript button - fetches combined transcript and copies to clipboard
// FR-148: Uses shared copyProjectTranscript utility
function TranscriptCopyButton({ project }: { project: ProjectStats }) {
  const [isCopying, setIsCopying] = useState(false);
  const isDisabled = project.transcriptPercent === 0 || project.totalFiles === 0;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDisabled || isCopying) return;

    setIsCopying(true);
    try {
      await copyProjectTranscript(project.code);
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <button
      onClick={handleCopy}
      disabled={isDisabled || isCopying}
      className={`text-xs transition-colors ${
        isDisabled ? 'opacity-0 cursor-default' : 'text-warm-muted hover:text-warm-primary cursor-pointer'
      }`}
      title={isDisabled ? 'No transcripts available' : 'Copy transcript to clipboard'}
    >
      {isCopying ? '…' : '⎘'}
    </button>
  );
}

// FR-48: Transcript percentage cell with color-coding and instant tooltip
// FR-117: Added hover delay to prevent flicker
function TranscriptPercentCell({ project }: { project: ProjectStats }) {
  const { isHovered, handleMouseEnter, handleMouseLeave } = useDelayedHover(0, 150);

  if (project.totalFiles === 0) {
    return <span className="text-warm-muted">-</span>;
  }

  const { transcriptPercent, transcriptSync } = project;
  const { matched, missingCount, orphanedCount } = transcriptSync;

  // Determine color based on sync status
  let colorClass: string;
  let displayText: string;

  if (transcriptPercent === 100 && orphanedCount === 0) {
    colorClass = 'text-green-600';
    displayText = '100%';
  } else if (transcriptPercent === 100 && orphanedCount > 0) {
    colorClass = 'text-orange-500';
    displayText = '100% ⚠️';
  } else if (transcriptPercent >= 50) {
    colorClass = 'text-yellow-600';
    displayText = `${transcriptPercent}%`;
  } else if (transcriptPercent > 0) {
    colorClass = 'text-red-500';
    displayText = `${transcriptPercent}%`;
  } else {
    colorClass = 'text-warm-muted';
    displayText = '0%';
  }

  // FR-148: Inline progress bar color
  const barColor =
    transcriptPercent === 100 ? 'bg-green-400' :
    transcriptPercent >= 50 ? 'bg-yellow-400' :
    transcriptPercent > 0 ? 'bg-red-400' : 'bg-warm-muted';

  return (
    <span
      className={`${colorClass} cursor-help relative inline-flex items-center gap-1.5`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* FR-148: Inline progress bar */}
      <span className="inline-block w-10 h-1.5 rounded-full bg-surface-muted overflow-hidden">
        <span
          className={`block h-full rounded-full ${barColor}`}
          style={{ width: `${transcriptPercent}%` }}
        />
      </span>
      {displayText}
      {isHovered && (
        <div className="absolute z-50 bottom-full right-0 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap">
          {/* FR-117: Tooltip arrow */}
          <div className="absolute top-full right-2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
          <div>{matched} matched</div>
          {missingCount > 0 && <div className="text-yellow-300">{missingCount} missing</div>}
          {orphanedCount > 0 && <div className="text-orange-300">{orphanedCount} orphaned</div>}
        </div>
      )}
    </span>
  );
}

// B062: Client-side default thresholds (mirrors server configManager.ts — keep in sync)
const DEFAULT_DISK_THRESHOLDS: DiskThresholds = {
  stagePenaltyMultiplier: 0.5,
  columns: {
    trash:   { faint: '0',      amber: '300MB',  red: '1GB'   },
    rec:     { faint: '2GB',    amber: '5GB',    red: '10GB'  },
    shadows: { faint: '100MB',  amber: '300MB',  red: '500MB' },
    other:   { faint: '500MB',  amber: '1GB',    red: null    },
    rRec:    { faint: '1GB',    amber: '3GB',    red: '6GB'   },
    r1st:    { faint: '500MB',  amber: '2GB',    red: '4GB'   },
    r2nd:    { faint: '500MB',  amber: '2GB',    red: '4GB'   },
    total:   { faint: '3GB',    amber: '8GB',    red: '15GB'  },
  }
};

// B062: Map DiskThresholdLevel to a className
function diskLevelClass(level: 'faint' | 'amber' | 'red' | null): string {
  if (level === 'red')   return 'text-red-600 font-medium';
  if (level === 'amber') return 'text-amber-600';
  if (level === 'faint') return 'text-amber-400';
  return 'text-warm-secondary';
}

// FR-148: Stage row tint — very faint background based on stage
const STAGE_ROW_TINT: Record<ProjectStage, string> = {
  planning: 'bg-purple-50/40',
  recording: 'bg-yellow-50/40',
  'first-edit': 'bg-blue-50/40',
  'second-edit': 'bg-blue-50/30',
  review: 'bg-orange-50/40',
  'ready-to-publish': 'bg-green-50/40',
  published: 'bg-green-50/30',
  archived: '',
};

export function ProjectsPanel(_props: ProjectsPanelProps) {
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectCode, setNewProjectCode] = useState('');
  // FR-148: Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStages, setActiveStages] = useState<Set<string>>(new Set());
  const [activePreset, setActivePreset] = useState('all');
  const [drawerCode, setDrawerCode] = useState<string | null>(null);
  // B062: Disk columns toggle + data
  const [diskColumnsEnabled, setDiskColumnsEnabled] = useState(false);
  const [diskData, setDiskData] = useState<Record<string, DiskSizeData>>({});
  const { mutate: scanAll, isPending: scanPending } = useDiskScanAll();

  const { data, isLoading, error } = useProjects();
  const { data: config } = useConfig();
  const updateConfig = useUpdateConfig();
  const refetchSuggestedNaming = useRefetchSuggestedNaming();
  const createProject = useCreateProject();
  const updatePriority = useUpdateProjectPriority();
  const updateStage = useUpdateProjectStage();
  const { data: relayBrowseData } = useEnhancedRelayBrowse();

  // Build a lookup map for relay projects by project code
  // Uses RelayProjectInfo as base type — may be RelayProjectSyncInfo when detailed=true
  const relayByCode = useMemo(() => {
    const map = new Map<string, RelayProjectInfo>();
    if (relayBrowseData?.projects) {
      for (const p of relayBrowseData.projects) {
        map.set(p.projectCode, p);
      }
    }
    return map;
  }, [relayBrowseData?.projects]);

  // NFR-5: Subscribe to real-time project changes via socket
  useProjectsSocket();
  // NFR-85: Subscribe to transcript changes (updates transcript % in table)
  useTranscriptsSocket();

  // FR-11: Switch to a project by updating active project
  // FR-89 Part 5: Now sends activeProject instead of full projectDirectory
  const handleSelectProject = async (_projectPath: string, projectCode: string) => {
    try {
      await updateConfig.mutateAsync({
        activeProject: projectCode,
      });
      refetchSuggestedNaming();
      toast.success(`Switched to project: ${projectCode}`);
    } catch (_err) {
      toast.error('Failed to switch project');
    }
  };

  // Check if a project is currently selected
  // FR-89 Part 5: Compare against activeProject
  const isProjectSelected = (projectPath: string) => {
    if (!config?.activeProject) return false;
    // Extract project code from path (basename)
    const projectCode = projectPath.split('/').pop() || '';
    return config.activeProject === projectCode;
  };

  // FR-32: Handle priority click (cycle through priorities)
  const handlePriorityClick = async (e: React.MouseEvent, project: ProjectStats) => {
    e.stopPropagation(); // Don't trigger row click
    const nextPriority = getNextPriority(project.priority);
    try {
      await updatePriority.mutateAsync({ code: project.code, priority: nextPriority });
    } catch (_err) {
      toast.error('Failed to update priority');
    }
  };

  // FR-110: Handle stage change from dropdown
  const handleStageChange = async (code: string, stage: string) => {
    try {
      await updateStage.mutateAsync({ code, stage: stage as ProjectStageOverride });
    } catch (_err) {
      toast.error('Failed to update stage');
    }
  };

  // FR-12: Create a new project and switch to it
  const handleCreateProject = async () => {
    if (!newProjectCode.trim()) {
      toast.error('Project code is required');
      return;
    }

    try {
      const result = await createProject.mutateAsync(newProjectCode.trim());
      if (result.success && result.project) {
        toast.success(`Created project: ${result.project.code}`);
        // Auto-switch to the new project
        await handleSelectProject(result.project.path, result.project.code);
        setNewProjectCode('');
        setShowNewProject(false);
      } else {
        toast.error(result.error || 'Failed to create project');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create project');
    }
  };

  // Split projects into valid and invalid (issues)
  // NFR-87: Data comes sorted by project code (natural order) - stars just mark interest
  const { projects, issueProjects } = useMemo(() => {
    const allProjects = data?.projects || [];
    const valid: ProjectStats[] = [];
    const issues: ProjectStats[] = [];

    for (const p of allProjects) {
      if (PROJECT_CODE_PATTERN.test(p.code)) {
        valid.push(p);
      } else {
        issues.push(p);
      }
    }

    return { projects: valid, issueProjects: issues };
  }, [data?.projects]);

  // FR-148: Derive drawer project from current query data (stays fresh on socket updates)
  const drawerProject = useMemo(() => {
    if (!drawerCode) return null;
    return projects.find(p => p.code === drawerCode) ?? null;
  }, [drawerCode, projects]);

  // FR-148: Filter logic (pure function extracted to utils/projectFilters.ts)
  const filteredProjects = useMemo(
    () => filterProjects(projects, { searchQuery, activeStages, activePreset }),
    [projects, searchQuery, activeStages, activePreset]
  );

  // FR-148: Stage toggle handler — resets preset to 'all' when toggling stages
  const handleStageToggle = (stage: string) => {
    setActiveStages(prev => {
      const next = new Set(prev);
      if (next.has(stage)) next.delete(stage);
      else next.add(stage);
      return next;
    });
    setActivePreset('all');
  };

  // FR-148: Preset change handler — clears stage filters when a preset is selected
  const handlePresetChange = (preset: string) => {
    setActivePreset(preset);
    if (preset !== 'all') setActiveStages(new Set());
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading projects..." />;
  }

  if (error) {
    return <ErrorMessage message="Error loading projects" />;
  }

  const isDrawerOpen = drawerProject !== null;

  return (
    <div className="flex flex-1 relative overflow-hidden">
      {/* Table panel — shrinks when drawer opens */}
      <div
        className="flex-1 flex flex-col min-w-0 overflow-hidden transition-[margin] duration-300 ease-in-out"
        style={{ marginRight: isDrawerOpen ? '40%' : '0' }}
      >
        {/* FR-148: Project list toolbar with search, stage filters, and presets */}
        <ProjectListToolbar
          totalCount={projects.length}
          filteredCount={filteredProjects.length}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          activeStages={activeStages}
          onStageToggle={handleStageToggle}
          activePreset={activePreset}
          onPresetChange={handlePresetChange}
          diskColumnsEnabled={diskColumnsEnabled}
          diskScanPending={scanPending}
          onDiskToggle={() => {
            const next = !diskColumnsEnabled;
            setDiskColumnsEnabled(next);
            if (next) {
              scanAll(undefined, {
                onSuccess: (data) => {
                  if (data.success && data.results) setDiskData(data.results);
                }
              });
            } else {
              setDiskData({});
            }
          }}
        />

        {data?.error && <p className="text-sm text-yellow-600 px-4 py-2">{data.error}</p>}

        {filteredProjects.length === 0 ? (
          <p className="text-warm-muted text-sm px-4 py-8">
            {projects.length === 0 ? 'No projects found' : 'No projects match current filters'}
          </p>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <table className="w-full" style={{ fontSize: '12px' }}>
              {/* FR-148: Sticky header */}
              <thead>
                <tr className="sticky top-0 z-10 bg-surface-muted border-b border-warm-strong text-left">
                  <th className="py-1.5 px-2 font-bold text-[10px] uppercase tracking-wide text-warm-muted w-8"></th>
                  <th className="py-1.5 px-2 font-bold text-[10px] uppercase tracking-wide text-warm-muted" style={{ width: '64px' }}>Code</th>
                  <th className="py-1.5 px-2 font-bold text-[10px] uppercase tracking-wide text-warm-muted">Name</th>
                  <th className="py-1.5 px-2 font-bold text-[10px] uppercase tracking-wide text-warm-muted" style={{ width: '56px' }}>Stage</th>
                  <th className="py-1.5 px-2 font-bold text-[10px] uppercase tracking-wide text-warm-muted text-right" style={{ width: '48px' }}>Files</th>
                  <th className="py-1.5 px-2 font-bold text-[10px] uppercase tracking-wide text-warm-muted text-right" style={{ width: '80px' }}>Trans%</th>
                  <th className="py-1.5 px-2 font-bold text-[10px] uppercase tracking-wide text-warm-muted text-center" style={{ width: '48px' }}>Final</th>
                  <th className="py-1.5 px-2 font-bold text-[10px] uppercase tracking-wide text-warm-muted text-center" style={{ width: '64px' }}>Relay</th> {/* B064: widened to fit hold badge */}
                  <th className="py-1.5 px-2 font-bold text-[10px] uppercase tracking-wide text-warm-muted text-right" style={{ width: '80px' }}>Modified</th>
                  {/* B062: Disk columns — only when disk toggle is on */}
                  {diskColumnsEnabled && (
                    <>
                      <th className="py-1.5 px-2 font-bold text-[10px] uppercase tracking-wide text-warm-muted text-right border-l border-warm-strong">REC</th>
                      <th className="py-1.5 px-2 font-bold text-[10px] uppercase tracking-wide text-warm-muted text-right">TRASH</th>
                      <th className="py-1.5 px-2 font-bold text-[10px] uppercase tracking-wide text-warm-muted text-right">SHADOWS</th>
                      <th className="py-1.5 px-2 font-bold text-[10px] uppercase tracking-wide text-warm-muted text-right">OTHER</th>
                      <th className="py-1.5 px-2 font-bold text-[10px] uppercase tracking-wide text-warm-muted text-right">R-REC</th>
                      <th className="py-1.5 px-2 font-bold text-[10px] uppercase tracking-wide text-warm-muted text-right">R-1ST</th>
                      <th className="py-1.5 px-2 font-bold text-[10px] uppercase tracking-wide text-warm-muted text-right">R-2ND</th>
                      <th className="py-1.5 px-2 font-bold text-[10px] uppercase tracking-wide text-warm-muted text-right">TOTAL</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {/* FR-148: Iterate over filteredProjects */}
                {filteredProjects.map((project) => {
                  const isSelected = isProjectSelected(project.path);
                  const isDrawerTarget = drawerCode === project.code;
                  // Handle legacy 'active' priority by treating as 'normal'
                  const effectivePriority: ProjectPriority =
                    project.priority === 'pinned' ? 'pinned' : 'normal';
                  const priorityConfig = PRIORITY_DISPLAY[effectivePriority];
                  const stageTint = STAGE_ROW_TINT[project.stage] || '';

                  return (
                    <tr
                      key={project.code}
                      onClick={() => setDrawerCode(project.code)}
                      className={`border-b border-warm cursor-pointer transition-colors ${
                        isDrawerTarget
                          ? 'border-l-3 border-l-blue-500 bg-blue-50/60'
                          : isSelected
                            ? 'bg-blue-50/30'
                            : `${stageTint} hover:bg-surface-muted`
                      }`}
                      style={{ height: '32px' }}
                    >
                      {/* Star */}
                      <td className="px-2 w-8 text-center">
                        <button
                          onClick={(e) => handlePriorityClick(e, project)}
                          className={`text-sm leading-none hover:opacity-80 transition-opacity ${priorityConfig.iconClass}`}
                          title={priorityConfig.title}
                        >
                          {priorityConfig.icon}
                        </button>
                      </td>

                      {/* FR-148: Code — clickable to switch project */}
                      <td className="px-2" style={{ width: '64px' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectProject(project.path, project.code);
                          }}
                          className={`text-left font-semibold truncate block w-full transition-colors ${
                            isSelected
                              ? 'text-warm-primary'
                              : 'text-warm-secondary hover:text-warm-primary'
                          }`}
                        >
                          {project.code}
                        </button>
                      </td>

                      {/* FR-148: Name — project code stripped of prefix */}
                      <td className="px-2 text-warm-secondary whitespace-nowrap overflow-hidden text-ellipsis">
                        {extractProjectName(project.code)}
                      </td>

                      {/* FR-148: Stage with dropdown selector */}
                      <td className="px-2 text-center" style={{ width: '56px' }}>
                        <StageCell
                          project={project}
                          onStageChange={(stage) => handleStageChange(project.code, stage)}
                        />
                      </td>

                      {/* FR-148: Files count */}
                      <td className="px-2 text-right" style={{ width: '48px' }}>
                        {project.totalFiles > 0 ? (
                          <span className="text-warm-secondary">{project.totalFiles}</span>
                        ) : (
                          <span className="text-warm-faint">-</span>
                        )}
                      </td>

                      {/* FR-148: Transcript % with copy button */}
                      <td className="px-2 text-right" style={{ width: '80px' }}>
                        <div className="flex items-center justify-end gap-1">
                          <TranscriptCopyButton project={project} />
                          <TranscriptPercentCell project={project} />
                        </div>
                      </td>

                      {/* FR-148: Final */}
                      <td className="px-2 text-center" style={{ width: '48px' }}>
                        {project.hasFinal ? (
                          <span className="text-green-600">✓</span>
                        ) : (
                          <span className="text-warm-faint">&mdash;</span>
                        )}
                      </td>

                      {/* FR-148: Relay indicators + B064: Hold badge */}
                      <td className="px-2 text-center" style={{ width: '64px' }}>
                        <span className="inline-flex items-center gap-0.5">
                          <RelayIndicator relayProject={relayByCode.get(project.code)} />
                          <HoldBadge code={project.code} /> {/* B064 */}
                        </span>
                      </td>

                      {/* FR-148: Modified — short date */}
                      <td className="px-2 text-right text-warm-muted" style={{ width: '80px', fontSize: '11px' }}>
                        {formatShortDate(project.lastModified)}
                      </td>

                      {/* B062: Disk usage cells — only when disk toggle is on */}
                      {diskColumnsEnabled && (() => {
                        const pd = diskData[project.code];
                        const thresholds = config?.diskThresholds ?? DEFAULT_DISK_THRESHOLDS;
                        const stage = project.stage;
                        const cellClass = scanPending || !pd
                          ? 'text-warm-muted opacity-50'
                          : '';

                        const diskCell = (bytes: number | undefined, col: string, extraClass = '') => {
                          if (scanPending || !pd || bytes === undefined) {
                            return <td key={col} className={`px-2 text-right text-warm-muted opacity-50 ${extraClass}`} style={{ fontSize: '11px' }}>—</td>;
                          }
                          const level = getThresholdLevelClient(bytes, col, stage, thresholds);
                          return (
                            <td key={col} className={`px-2 text-right ${diskLevelClass(level)} ${extraClass}`} style={{ fontSize: '11px' }}>
                              {formatBytes(bytes)}
                            </td>
                          );
                        };

                        return (
                          <>
                            {diskCell(pd?.rec,     'rec', 'border-l border-warm-strong')}
                            {diskCell(pd?.trash,   'trash')}
                            {diskCell(pd?.shadows, 'shadows')}
                            {diskCell(pd?.other,   'other')}
                            {diskCell(pd?.rRec,    'rRec')}
                            {diskCell(pd?.r1st,    'r1st')}
                            {diskCell(pd?.r2nd,    'r2nd')}
                            {diskCell(pd?.total,   'total')}
                          </>
                        );
                      })()}
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* FR-12: New Project Form - at bottom of table */}
            <div className="px-4 py-3">
              {showNewProject ? (
                <div className="p-3 bg-surface-muted rounded-lg border border-warm">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newProjectCode}
                      onChange={(e) => setNewProjectCode(e.target.value.toLowerCase())}
                      placeholder="b73-project-name"
                      className="flex-1 px-3 py-1.5 text-sm font-mono border border-warm-strong rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                      autoFocus
                    />
                    <button
                      onClick={handleCreateProject}
                      disabled={createProject.isPending}
                      className="px-3 py-1.5 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors disabled:opacity-50"
                    >
                      {createProject.isPending ? 'Creating...' : 'Create'}
                    </button>
                    <button
                      onClick={() => {
                        setShowNewProject(false);
                        setNewProjectCode('');
                      }}
                      className="px-3 py-1.5 text-sm text-warm-secondary hover:bg-surface-hover rounded transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                  <p className="text-xs text-warm-muted mt-2">Use kebab-case (e.g., b73-my-new-video)</p>
                </div>
              ) : (
                <button
                  onClick={() => setShowNewProject(true)}
                  className="text-sm text-green-600 hover:text-green-700"
                >
                  + Add new project...
                </button>
              )}
            </div>

            {/* Bug fix: Show projects with invalid naming in Issues section */}
            {issueProjects.length > 0 && (
              <div className="px-4 py-3 border-t-2 border-warm-strong">
                <h4 className="font-medium text-warm-secondary mb-3">
                  Issues
                  <span className="ml-2 text-sm font-normal text-warm-muted">
                    ({issueProjects.length} projects with invalid naming)
                  </span>
                </h4>
                <div className="space-y-1 text-sm">
                  {issueProjects.map((project) => (
                    <div key={project.code} className="flex items-center gap-2 px-2 py-1.5 rounded">
                      <span className="text-yellow-600">⚠️</span>
                      <button
                        onClick={() => handleSelectProject(project.path, project.code)}
                        className="font-mono text-warm-secondary hover:text-blue-600 hover:underline transition-colors"
                      >
                        {project.code}
                      </button>
                      <span className="text-xs text-warm-muted">
                        (expected: letter + 2 digits, e.g., b73-name)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* FR-148: Project detail drawer — absolute positioned, pushes table via margin */}
      <ProjectDrawer project={drawerProject} onClose={() => setDrawerCode(null)} />
    </div>
  );
}
