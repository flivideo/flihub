/**
 * B044+B050: Persistent sync status indicators in the App header.
 *
 * Two pills — "Project" (video project git) and "Code" (app code git) —
 * that show the sync state with colour-coded dots, count badges, and
 * descriptive summary text. Clicking either pill navigates to the Sync tool.
 */

import { useSyncStatus } from '../../hooks/useSyncApi';
import type { SyncChannelStatus, SyncState } from '../../../../shared/types';

export interface SyncIndicatorProps {
  onNavigateToSync: () => void;
}

// State → visual config map
interface StateStyle {
  dot: string;
  text: string;
  bg: string;
  badgeBg: string;
}

const stateStyles: Record<SyncState, StateStyle> = {
  clean:    { dot: 'bg-green-600',  text: 'text-warm-muted',   bg: '',              badgeBg: '' },
  dirty:    { dot: 'bg-red-600',    text: 'text-red-600',    bg: 'bg-red-50',     badgeBg: 'bg-red-600' },
  behind:   { dot: 'bg-orange-500', text: 'text-orange-600', bg: 'bg-orange-50',  badgeBg: 'bg-orange-500' },
  ahead:    { dot: 'bg-blue-500',   text: 'text-blue-600',   bg: 'bg-blue-50',    badgeBg: 'bg-blue-500' },
  diverged: { dot: 'bg-red-600',    text: 'text-red-600',    bg: 'bg-red-50',     badgeBg: 'bg-red-600' },
  conflict: { dot: 'bg-purple-600', text: 'text-purple-600', bg: 'bg-purple-50',  badgeBg: 'bg-purple-600' },
  unknown:  { dot: 'bg-warm-muted',   text: 'text-warm-muted',   bg: '',              badgeBg: '' },
};

function getBadgeContent(status: SyncChannelStatus): string | null {
  switch (status.state) {
    case 'dirty':    return status.dirtyCount > 0 ? String(status.dirtyCount) : null;
    case 'behind':   return status.behindCount > 0 ? String(status.behindCount) : null;
    case 'ahead':    return status.aheadCount > 0 ? String(status.aheadCount) : null;
    case 'diverged': return status.dirtyCount > 0 ? String(status.dirtyCount) : null;
    case 'conflict': return '!';
    default:         return null;
  }
}

function getSummaryText(status: SyncChannelStatus): string | null {
  switch (status.state) {
    case 'dirty':    return status.dirtyCount === 1 ? 'file changed' : 'files changed';
    case 'behind':   return status.behindCount === 1 ? 'commit behind' : 'commits behind';
    case 'ahead':    return status.aheadCount === 1 ? 'ahead' : 'ahead';
    case 'diverged': return 'diverged';
    case 'conflict': return 'conflicts';
    default:         return null;
  }
}

/** Group dirty files by type and build a short summary */
function buildFileSummary(dirtyFiles: string[]): string {
  const groups: Record<string, number> = {};
  for (const line of dirtyFiles) {
    const path = line.substring(3).split(' -> ').pop() || line.substring(3);
    const ext = (path.split('.').pop() || '').toLowerCase();
    let group: string;
    if (['mov', 'mp4'].includes(ext)) group = 'recordings';
    else if (['txt', 'srt'].includes(ext)) group = 'transcripts';
    else if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) group = 'images';
    else if (['tsx', 'jsx'].includes(ext)) group = 'components';
    else if (['ts', 'js'].includes(ext)) group = 'source';
    else if (ext === 'css') group = 'styles';
    else group = 'other';
    groups[group] = (groups[group] || 0) + 1;
  }
  return Object.entries(groups)
    .map(([type, count]) => `${count} ${type}`)
    .join(', ');
}

function getTooltip(label: string, status: SyncChannelStatus | undefined): string {
  if (!status) return `${label}: not configured`;
  let base: string;
  switch (status.state) {
    case 'clean':    base = `${label}: up to date`; break;
    case 'dirty':    base = `${label}: ${status.dirtyCount} uncommitted file${status.dirtyCount !== 1 ? 's' : ''}`; break;
    case 'behind':   base = `${label}: ${status.behindCount} commit${status.behindCount !== 1 ? 's' : ''} behind`; break;
    case 'ahead':    base = `${label}: ${status.aheadCount} commit${status.aheadCount !== 1 ? 's' : ''} ahead`; break;
    case 'diverged': base = `${label}: diverged — ${status.dirtyCount} local change${status.dirtyCount !== 1 ? 's' : ''}`; break;
    case 'conflict': base = `${label}: merge conflicts`; break;
    case 'unknown':  base = `${label}: checking...`; break;
    default:         base = label;
  }
  // Add file type breakdown if dirty
  if (status.dirtyFiles && status.dirtyFiles.length > 0) {
    base += `\n${buildFileSummary(status.dirtyFiles)}`;
  }
  return base;
}

interface PillProps {
  icon: string;
  label: string;
  status: SyncChannelStatus | undefined;
  onClick: () => void;
}

function Pill({ icon, label, status, onClick }: PillProps) {
  const state = status?.state ?? 'unknown';
  const style = stateStyles[state];
  const badge = status ? getBadgeContent(status) : null;
  const summary = status ? getSummaryText(status) : null;
  const tooltip = getTooltip(label, status);

  return (
    <button
      onClick={onClick}
      title={tooltip}
      className={`flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded cursor-pointer transition-colors hover:bg-surface-hover ${style.bg} ${style.text}`}
    >
      <span className={`w-[7px] h-[7px] rounded-full flex-shrink-0 ${style.dot}`} />
      <span className="font-medium">{icon} {label}</span>
      {badge && (
        <span className={`text-[10px] font-semibold text-white rounded-full px-1 leading-4 ${style.badgeBg}`}>
          {badge}
        </span>
      )}
      {summary && (
        <span className="text-[10px] opacity-70">{summary}</span>
      )}
    </button>
  );
}

export function SyncIndicator({ onNavigateToSync }: SyncIndicatorProps) {
  const { data, isLoading, isError } = useSyncStatus();

  // While loading or on error, show inactive grey pills
  if (isLoading || isError || !data) {
    return (
      <div className="flex items-center gap-3">
        <Pill icon="⌘" label="Code" status={undefined} onClick={onNavigateToSync} />
        <Pill icon="🎬" label="Project" status={undefined} onClick={onNavigateToSync} />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {data.appCode && (
        <Pill icon="⌘" label="Code" status={data.appCode} onClick={onNavigateToSync} />
      )}
      {data.videoProject && (
        <Pill icon="🎬" label="Project" status={data.videoProject} onClick={onNavigateToSync} />
      )}
    </div>
  );
}
