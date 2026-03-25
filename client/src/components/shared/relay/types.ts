// Relay shared types and helpers
import type {
  RelaySubfolder,
  RelayDivergenceInfo,
  SyncDirection,
} from '../../../../../shared/types';
import { formatFileSize } from '../../../utils/formatting';

// Re-export SyncDirection from shared canonical source
export type { SyncDirection } from '../../../../../shared/types';

// Re-export formatFileSize as formatSize for relay consumers
export const formatSize = formatFileSize;

// ─── Lane Configuration ───

export type LaneKey = RelaySubfolder | 'final';

export interface LaneConfig {
  key: LaneKey;
  subfolder?: RelaySubfolder; // undefined for 'final' (no relay subfolder)
  label: string;
}

export const LANES: LaneConfig[] = [
  { key: 'recordings', subfolder: 'recordings', label: 'Recordings' },
  { key: 'edit-1st', subfolder: 'edit-1st', label: '1st Edit' },
  { key: 'edit-2nd', subfolder: 'edit-2nd', label: '2nd Edit' },
  { key: 'final', label: 'Final' },
];

// ─── Helpers ───

export function formatRelativeTime(isoDate: string): string {
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

export function getDirectionBorderClass(direction: SyncDirection): string {
  switch (direction) {
    case 'synced': return 'border-green-500';
    case 'outgoing': return 'border-blue-500';
    case 'incoming': return 'border-amber-500';
    case 'both': return 'border-red-500';
  }
}

export function getDirectionDotClass(direction: SyncDirection): string {
  switch (direction) {
    case 'synced': return 'bg-green-500';
    case 'outgoing': return 'bg-blue-500';
    case 'incoming': return 'bg-amber-500';
    case 'both': return 'bg-red-500';
  }
}

export function getDirectionStatusText(direction: SyncDirection, localOnly: number, relayOnly: number): string {
  switch (direction) {
    case 'synced': return '\u2713 Synced';
    case 'outgoing': return `\u2191 ${localOnly} to push`;
    case 'incoming': return `\u2193 ${relayOnly} incoming`;
    case 'both': return `\u2195 ${localOnly} out / ${relayOnly} in`;
  }
}

export function getDirectionStatusColorClass(direction: SyncDirection): string {
  switch (direction) {
    case 'synced': return 'text-green-600';
    case 'outgoing': return 'text-blue-600';
    case 'incoming': return 'text-amber-500';
    case 'both': return 'text-red-500';
  }
}

// Direction-aware labels: use actual divergence direction, not assumed role flow
export function getActionLabel(direction: SyncDirection, isCreator: boolean): string {
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
  return 'Push to Relay';
}

// Default push direction hint for when synced (role-based suggestion)
export function defaultIsPush(lane: RelaySubfolder, isCreator: boolean): boolean {
  if (lane === 'recordings') return isCreator;
  return !isCreator;
}
