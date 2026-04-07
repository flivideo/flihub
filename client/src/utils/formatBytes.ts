// B062: Format byte counts for disk size display
import type { DiskThresholds, DiskThresholdLevel } from '../../../shared/types';

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return '—';           // treat as empty / negligible
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

// B062: Parse human-readable size string to bytes (mirrors server diskUtils)
export function parseSizeString(s: string | null): number {
  if (s === null) return Infinity;
  if (s === '0') return 0;
  const match = s.match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB|TB)$/i);
  if (!match) return Infinity;
  const num = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  const multipliers: Record<string, number> = { B: 1, KB: 1024, MB: 1024**2, GB: 1024**3, TB: 1024**4 };
  return num * (multipliers[unit] ?? 1);
}

// B062: Determine threshold level for colour coding
export function getThresholdLevelClient(
  bytes: number,
  column: string,
  stage: string | null,
  thresholds: DiskThresholds
): DiskThresholdLevel {
  const colConfig = thresholds.columns[column as keyof typeof thresholds.columns];
  if (!colConfig) return null;
  const multiplier = (stage === 'published' || stage === 'archived')
    ? thresholds.stagePenaltyMultiplier
    : 1;
  if (colConfig.red !== null && bytes >= parseSizeString(colConfig.red) * multiplier) return 'red';
  if (colConfig.amber !== null && bytes >= parseSizeString(colConfig.amber) * multiplier) return 'amber';
  if (colConfig.faint !== null && bytes >= parseSizeString(colConfig.faint) * multiplier) return 'faint';
  return null;
}
