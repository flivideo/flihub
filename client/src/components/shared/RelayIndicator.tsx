/**
 * relay-kanban-fixes / F008: Persistent relay status indicator in the App header.
 *
 * A single pill — "Relay" — that shows the aggregate relay sync state with
 * colour-coded dot, count badge, and summary text. Clicking navigates to the
 * Relay tool. Pattern follows SyncIndicator.tsx exactly.
 */

import { useRelayDivergence } from '../../hooks/useRelayApi';
import type { RelayDivergenceInfo, RelaySubfolder } from '../../../../shared/types';

export interface RelayIndicatorProps {
  onNavigateToRelay: () => void;
}

// Aggregate state derived from divergence data
type RelayAggregateState = 'synced' | 'incoming' | 'outgoing' | 'both' | 'unknown';

interface StateStyle {
  dot: string;
  text: string;
  bg: string;
  badgeBg: string;
}

const stateStyles: Record<RelayAggregateState, StateStyle> = {
  synced:   { dot: 'bg-green-600',    text: 'text-warm-muted',   bg: '',              badgeBg: '' },
  incoming: { dot: 'bg-orange-500',   text: 'text-orange-600',   bg: 'bg-orange-50',  badgeBg: 'bg-orange-500' },
  outgoing: { dot: 'bg-blue-500',     text: 'text-blue-600',     bg: 'bg-blue-50',    badgeBg: 'bg-blue-500' },
  both:     { dot: 'bg-red-600',      text: 'text-red-600',      bg: 'bg-red-50',     badgeBg: 'bg-red-600' },
  unknown:  { dot: 'bg-warm-muted',   text: 'text-warm-muted',   bg: '',              badgeBg: '' },
};

const SUBFOLDER_LABELS: Record<RelaySubfolder, string> = {
  'recordings': 'Recordings',
  'edit-1st': '1st Edit',
  'edit-2nd': '2nd Edit',
};

function aggregateState(subfolders: RelayDivergenceInfo[]): {
  state: RelayAggregateState;
  badge: string | null;
  summary: string | null;
} {
  let hasIncoming = false;
  let hasOutgoing = false;
  let hasBoth = false;
  let totalIncoming = 0;
  let totalOutgoing = 0;

  for (const sf of subfolders) {
    if (sf.direction === 'both') hasBoth = true;
    if (sf.direction === 'incoming' || sf.direction === 'both') {
      hasIncoming = true;
      totalIncoming += sf.relayOnly.length;
    }
    if (sf.direction === 'outgoing' || sf.direction === 'both') {
      hasOutgoing = true;
      totalOutgoing += sf.localOnly.length;
    }
  }

  if (hasBoth) {
    return { state: 'both', badge: null, summary: 'sync needed' };
  }
  if (hasIncoming) {
    return { state: 'incoming', badge: String(totalIncoming), summary: 'incoming' };
  }
  if (hasOutgoing) {
    return { state: 'outgoing', badge: String(totalOutgoing), summary: 'to push' };
  }
  return { state: 'synced', badge: null, summary: null };
}

function buildTooltip(subfolders: RelayDivergenceInfo[] | undefined): string {
  if (!subfolders || subfolders.length === 0) return 'Relay: not configured';

  const lines = ['Relay Sync'];
  for (const sf of subfolders) {
    const label = SUBFOLDER_LABELS[sf.subfolder] || sf.subfolder;
    let detail: string;
    switch (sf.direction) {
      case 'incoming':
        detail = `${sf.relayOnly.length} incoming`;
        break;
      case 'outgoing':
        detail = `${sf.localOnly.length} outgoing`;
        break;
      case 'both':
        detail = `${sf.relayOnly.length} incoming, ${sf.localOnly.length} outgoing`;
        break;
      case 'synced':
        if (sf.local.fileCount === 0 && sf.relay.fileCount === 0) {
          detail = '\u2014 (no files)';
        } else {
          detail = 'synced';
        }
        break;
      default:
        detail = 'unknown';
    }
    lines.push(`${label}: ${detail}`);
  }
  return lines.join('\n');
}

export function RelayIndicator({ onNavigateToRelay }: RelayIndicatorProps) {
  const { data, isLoading, isError } = useRelayDivergence();

  // Don't render if relay isn't configured or data failed to load
  if (isError || (!isLoading && !data?.success)) {
    return null;
  }

  const subfolders = data?.subfolders;
  const { state, badge, summary } = subfolders
    ? aggregateState(subfolders)
    : { state: 'unknown' as const, badge: null, summary: null };
  const style = stateStyles[state];
  const tooltip = buildTooltip(subfolders);

  return (
    <button
      onClick={onNavigateToRelay}
      title={tooltip}
      className={`flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded cursor-pointer transition-colors hover:bg-surface-hover ${style.bg} ${style.text}`}
    >
      <span className={`w-[7px] h-[7px] rounded-full flex-shrink-0 ${style.dot}`} />
      <span className="font-medium">{'\uD83D\uDCE1'} Relay</span>
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
