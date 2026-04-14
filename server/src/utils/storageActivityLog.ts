// storage-panel WU5: Storage activity log (file-based, JSONL).
//
// LOG LOCATION DECISION: **global** file at `~/.flihub/storage-activity.jsonl`.
//
// Reasoning: archived projects have no local folder, so per-project state
// (e.g. `<projectsRoot>/<code>/.flihub/activity.jsonl`) wouldn't survive
// archival. A global log with a `projectCode` field per entry works across
// all three storage states (active / held / archived). One line per entry
// (JSONL) means appends are crash-tolerant and reads can stream.
//
// The log path is injectable (`getLogPath`) so tests can redirect to tmp
// without touching the real user home.
//
// Append failures are swallowed (console.warn only). A storage mutation
// MUST NOT fail because activity logging failed — the mutation already
// succeeded on disk; the log is a breadcrumb, not a transaction.
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import type { StorageActivityEntry } from '../../../shared/types.js';

export function defaultStorageActivityLogPath(): string {
  return path.join(os.homedir(), '.flihub', 'storage-activity.jsonl');
}

export async function appendStorageActivity(
  entry: StorageActivityEntry,
  logPath: string = defaultStorageActivityLogPath(),
): Promise<void> {
  try {
    await fs.mkdir(path.dirname(logPath), { recursive: true });
    const line = JSON.stringify(entry) + '\n';
    await fs.appendFile(logPath, line, 'utf8');
  } catch (err) {
    // Best-effort; a storage mutation already succeeded on disk.
    console.warn('[storage-panel] appendStorageActivity failed:', err);
  }
}

export interface ReadStorageActivityOpts {
  projectCode?: string;
  limit?: number;
  logPath?: string;
}

export async function readStorageActivity(
  opts: ReadStorageActivityOpts = {},
): Promise<StorageActivityEntry[]> {
  const { projectCode, limit = 10, logPath = defaultStorageActivityLogPath() } = opts;
  let raw: string;
  try {
    raw = await fs.readFile(logPath, 'utf8');
  } catch {
    return [];
  }
  const entries: StorageActivityEntry[] = [];
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed) as StorageActivityEntry;
      if (
        parsed &&
        typeof parsed === 'object' &&
        typeof parsed.projectCode === 'string' &&
        typeof parsed.action === 'string' &&
        typeof parsed.sizeBytes === 'number' &&
        typeof parsed.timestamp === 'string'
      ) {
        if (!projectCode || parsed.projectCode === projectCode) {
          entries.push(parsed);
        }
      }
    } catch {
      // Skip malformed lines.
    }
  }
  // Most recent first.
  entries.reverse();
  return entries.slice(0, Math.max(0, limit));
}
