// B062: Disk space observability — utility functions for calculating project folder sizes
import { promises as fs } from 'fs';
import path from 'path';
import type { DiskSizeData, DiskThresholds, DiskThresholdLevel } from '../../../shared/types.js';

/**
 * Recursively sum the total size (in bytes) of all files under dirPath.
 * Returns 0 if the directory does not exist or cannot be accessed.
 */
export async function getDirSize(dirPath: string): Promise<number> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true, recursive: true });
    let total = 0;
    await Promise.all(
      entries.map(async (entry) => {
        if (entry.isFile()) {
          try {
            // entry.parentPath is available in Node 20+; fall back to entry.path for older versions
            const dirent = entry as NodeDirent;
            const parent = dirent.parentPath ?? dirent.path ?? dirPath;
            const fullPath = path.join(parent, entry.name);
            const stat = await fs.stat(fullPath);
            total += stat.size;
          } catch {
            // File may have been removed between readdir and stat — ignore
          }
        }
      })
    );
    return total;
  } catch {
    // Directory doesn't exist or isn't accessible
    return 0;
  }
}

// Node 20 added parentPath; older versions use path. Both are valid Dirent fields.
type NodeDirent = { name: string; isFile(): boolean; parentPath?: string; path?: string };

const SIZE_UNITS: Record<string, number> = {
  b:  1,
  kb: 1024,
  mb: 1024 ** 2,
  gb: 1024 ** 3,
  tb: 1024 ** 4,
};

/**
 * Parse a human-readable size string into bytes.
 *
 * Examples:
 *   "0"      → 0
 *   "300MB"  → 314572800
 *   "2GB"    → 2147483648
 *   null     → Infinity  (no threshold configured)
 */
export function parseSizeString(s: string | null): number {
  if (s === null) return Infinity;

  const trimmed = s.trim();
  if (trimmed === '0') return 0;

  const match = trimmed.match(/^([\d.]+)\s*([a-zA-Z]+)$/);
  if (!match) {
    // Bare number with no unit — treat as bytes
    const n = parseFloat(trimmed);
    return isNaN(n) ? 0 : n;
  }

  const value = parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  const multiplier = SIZE_UNITS[unit];

  if (!multiplier) return 0;
  return value * multiplier;
}

/**
 * List all files directly inside dirPath with their sizes, sorted largest first.
 * Returns [] if the directory does not exist or cannot be accessed.
 */
async function getFileList(dirPath: string): Promise<Array<{ name: string; size: number }>> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const files = entries.filter(e => e.isFile());
    const results = await Promise.all(
      files.map(async (e) => {
        const stat = await fs.stat(path.join(dirPath, e.name));
        return { name: e.name, size: stat.size };
      })
    );
    return results.sort((a, b) => b.size - a.size); // largest first
  } catch {
    return [];
  }
}

/**
 * Measure all direct subdirectories of dirPath that are not in the exclude list.
 * Returns a map of subfolder name → bytes. Subfolders with 0 bytes are omitted.
 */
async function getSubfolderSizes(dirPath: string, exclude: string[]): Promise<Record<string, number>> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const subdirs = entries.filter(e => e.isDirectory() && !exclude.includes(e.name));
    const results = await Promise.all(
      subdirs.map(async (e) => {
        const size = await getDirSize(path.join(dirPath, e.name));
        return [e.name, size] as [string, number];
      })
    );
    return Object.fromEntries(results.filter(([, size]) => size > 0));
  } catch {
    return {};
  }
}

/**
 * Calculate the disk size breakdown for a project directory and optional relay project directory.
 */
export async function calculateProjectDiskSize(
  projectDir: string,
  relayProjectDir: string | null
): Promise<DiskSizeData> {
  const [rec, trash, rRec, r1st, r2nd, totalProjectDir, trashFiles, recTopFiles, otherSubfolders] = await Promise.all([
    getDirSize(path.join(projectDir, 'recordings')),
    getDirSize(path.join(projectDir, '-trash')),
    relayProjectDir ? getDirSize(path.join(relayProjectDir, 'recordings')) : Promise.resolve(0),
    relayProjectDir ? getDirSize(path.join(relayProjectDir, 'edit-1st')) : Promise.resolve(0),
    relayProjectDir ? getDirSize(path.join(relayProjectDir, 'edit-2nd')) : Promise.resolve(0),
    getDirSize(projectDir),
    getFileList(path.join(projectDir, '-trash')),
    getFileList(path.join(projectDir, 'recordings')).then(files => files.slice(0, 5)),
    getSubfolderSizes(projectDir, ['recordings', '-trash']), // legacy recording-shadows/ folders now itemize under 'other'
  ]);

  const other = Math.max(0, totalProjectDir - rec - trash);
  const total = rec + trash + other + rRec + r1st + r2nd;

  return {
    rec,
    trash,
    other,
    rRec,
    r1st,
    r2nd,
    total,
    calculatedAt: new Date().toISOString(),
    detail: {
      other: otherSubfolders,
      recTopFiles,
      trashFiles,
    },
  };
}

/**
 * Determine the threshold level (colour) for a given byte count, column, and project stage.
 *
 * Returns the highest triggered level: 'red' > 'amber' > 'faint' > null.
 * Applies stagePenaltyMultiplier when stage is 'published' or 'archived'.
 */
export function getThresholdLevel(
  bytes: number,
  column: keyof DiskThresholds['columns'],
  stage: string | null,
  thresholds: DiskThresholds
): DiskThresholdLevel {
  const penaltyStages = ['published', 'archived'];
  const multiplier =
    stage && penaltyStages.includes(stage) ? thresholds.stagePenaltyMultiplier : 1;

  const config = thresholds.columns[column];

  const triggered = (thresholdValue: string | null): boolean => {
    const limit = parseSizeString(thresholdValue);
    return bytes >= limit * multiplier;
  };

  if (triggered(config.red)) return 'red';
  if (triggered(config.amber)) return 'amber';
  if (triggered(config.faint)) return 'faint';
  return null;
}
