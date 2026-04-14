// WU1: Archive inventory utilities — shared aggregation logic for the Archive tool.
//
// Extracted from server/src/routes/manage.ts during WU1 delivery-review patches so
// the logic can live next to the hold routes in hold.ts and be unit-tested
// independently of the HTTP layer.
import { promises as fs } from 'fs';
import path from 'path';
import { getHoldStatus, getDirStats } from './holdUtils.js';
import { calculateProjectDiskSize } from './diskUtils.js';
import type { ArchiveRow, ArchiveState } from '../../../shared/types.js';

/**
 * WU1 Patch 2: Conservative predicate for project directory names.
 *
 * Guards both `projectsRoot` and `holdingRoot` scans against stray T7 folders
 * (backup, notes, rsync-tmp, dotfiles) that could otherwise surface as phantom
 * ArchiveRows — which Wave B batch actions could then delete.
 *
 * Rules:
 *   - No dotfiles (.DS_Store, .Trashes, .Spotlight-V100)
 *   - No dash-prefixed (-chapters, -trash)
 *   - Not the literal 'archived' sibling folder
 *   - Must start with alphanumeric and contain only [a-z0-9-] (case-insensitive)
 *     This matches real project codes like '07-bmad-relay', 'jfli-core' while
 *     excluding 'backup 2024', 'rsync-tmp~', 'notes.md'.
 */
export function isValidProjectDirName(name: string): boolean {
  if (!name) return false;
  if (name.startsWith('.')) return false;
  if (name.startsWith('-')) return false;
  if (name === 'archived') return false;
  return /^[a-z0-9][a-z0-9-]+$/i.test(name);
}

/**
 * WU1 Patch 3: Derive ArchiveState purely from byte counts.
 *
 * Held state is determined by `heldBytes > 0` — NOT by holdStatus.location,
 * because on-disk reality (what `getDirStats(holdingPath)` sees) is the source
 * of truth for display purposes. holdStatus is used elsewhere only to source
 * lastTouched.
 */
export function deriveArchiveState(localBytes: number, heldBytes: number): ArchiveState {
  const held = heldBytes > 0;
  if (held && localBytes > 0) return 'held-local';
  if (held && localBytes === 0) return 'held-only';
  return 'local';
}

/**
 * WU1 Patch 2: Collect valid project-code candidates from projects root
 * unioned with holding root. Both scans tolerate a missing root (T7 unplugged,
 * empty install) and filter through isValidProjectDirName.
 */
export async function listArchiveCandidates(
  projectsRoot: string,
  holdingRoot: string | null,
): Promise<string[]> {
  const codeSet = new Set<string>();

  async function scan(root: string): Promise<void> {
    try {
      const entries = await fs.readdir(root, { withFileTypes: true });
      for (const e of entries) {
        if (e.isDirectory() && isValidProjectDirName(e.name)) {
          codeSet.add(e.name);
        }
      }
    } catch {
      // Missing root — treat as empty; other root may still yield rows.
    }
  }

  await scan(projectsRoot);
  if (holdingRoot) {
    await scan(holdingRoot);
  }

  return Array.from(codeSet).sort();
}

export interface BuildArchiveRowOpts {
  projectsRoot: string;
  holdingRoot: string | null;
  relayRoot: string | null;
}

/**
 * WU1: Aggregate one project's state into an ArchiveRow.
 *
 * Applies:
 *   Patch 1 — lastTouched falls back to fs.stat(holdingPath).mtime when
 *             holdStatus.heldAt is absent and holdingExists is true.
 *   Patch 3 — state derived from bytes only via deriveArchiveState.
 *   Patch 4 — per-project failures surface as degraded rows with error, and
 *             are console.warn'd rather than silently swallowed.
 *   Patch 5 — localBytes = project tree minus relay subtrees, clamped to >= 0.
 */
export async function buildArchiveRow(
  projectCode: string,
  opts: BuildArchiveRowOpts,
): Promise<ArchiveRow> {
  const { projectsRoot, holdingRoot, relayRoot } = opts;
  const projectPath = path.join(projectsRoot, projectCode);
  const relayDir = relayRoot ? path.join(relayRoot, projectCode) : null;
  const holdingPath = holdingRoot ? path.join(holdingRoot, projectCode) : null;

  try {
    // Patch 4: if getHoldStatus or calculateProjectDiskSize throws, the
    // outer catch below converts the row to degraded. Inner .catch for
    // getDirStats is intentional — it already returns {0,0} on failure,
    // so no error signal is lost.
    const [diskData, holdStatus, heldDirStats] = await Promise.all([
      calculateProjectDiskSize(projectPath, relayDir),
      holdingRoot
        ? getHoldStatus(projectCode, projectPath, relayDir, holdingRoot)
        : Promise.resolve(null),
      holdingPath
        ? getDirStats(holdingPath)
        : Promise.resolve({ fileCount: 0, totalBytes: 0 }),
    ]);

    // Patch 5: calculateProjectDiskSize rolls relay subtrees (rRec/r1st/r2nd)
    // into `total`. Strip them so localBytes = bytes inside the project folder
    // only. Clamp because a misconfigured relayDirectory overlapping the
    // project tree could go negative.
    const localBytes = diskData
      ? Math.max(0, diskData.total - diskData.rRec - diskData.r1st - diskData.r2nd)
      : 0;
    const heldBytes = heldDirStats.totalBytes;

    // Patch 3: state derivation strictly from bytes.
    const state = deriveArchiveState(localBytes, heldBytes);
    const held = heldBytes > 0;

    // Patch 1: lastTouched from holdStatus.heldAt, else fs.stat(holdingPath).mtime
    // when the holding dir exists. Local-only rows → null.
    let lastTouched: string | null = holdStatus?.heldAt ?? null;
    if (!lastTouched && holdingPath && heldBytes > 0) {
      try {
        const stat = await fs.stat(holdingPath);
        lastTouched = stat.mtime.toISOString();
      } catch {
        lastTouched = null;
      }
    }

    return {
      projectCode,
      projectPath,
      localBytes,
      heldBytes,
      held,
      state,
      lastTouched,
    };
  } catch (err) {
    // Patch 4: surface degraded rows; don't silently swallow.
    console.warn('[archive-inventory] aggregation failed for', projectCode, err);
    return {
      projectCode,
      projectPath,
      localBytes: 0,
      heldBytes: 0,
      held: false,
      state: 'local',
      lastTouched: null,
      degraded: true,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
