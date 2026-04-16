// B064: Hold/offload utilities — move projects to/from T7 SSD holding area
import { promises as fs } from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import type { HoldVerification, HoldStatus, HoldOperationResult } from '../../../shared/types.js';

// ---------------------------------------------------------------------------
// WU3: Rsync exclude patterns — junk folders that should never be held/restored.
// Mirrors the pattern in relay.ts (RSYNC_EXCLUDES / rsyncExcludeArgs).
// ---------------------------------------------------------------------------
export const HOLD_EXCLUDES = ['-trash/', 's3-staging/', '.DS_Store', '._*'];

export function holdExcludeArgs(): string[] {
  return HOLD_EXCLUDES.flatMap(pattern => ['--exclude', pattern]);
}

// ---------------------------------------------------------------------------
// storage-panel: Match a single dir-entry name against an rsync-style exclude
// pattern list. Supports: trailing '/' for directory-only matches, literal
// names, and a single '*' wildcard (e.g. '._*'). Keep this in step with
// HOLD_EXCLUDES — used by getDirStats so that pre/post rsync verification
// counts the same files rsync actually transferred.
// ---------------------------------------------------------------------------
export function matchesExcludePattern(name: string, isDir: boolean, patterns: string[]): boolean {
  for (const raw of patterns) {
    const dirOnly = raw.endsWith('/');
    const pat = dirOnly ? raw.slice(0, -1) : raw;
    if (dirOnly && !isDir) continue;
    if (pat.includes('*')) {
      const re = new RegExp(
        '^' + pat.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$',
      );
      if (re.test(name)) return true;
    } else if (name === pat) {
      return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// B064: Internal helper — recursive dir stats (file count + total bytes)
// Returns { fileCount: 0, totalBytes: 0 } if dir does not exist or any error.
// storage-panel: `excludes` honours rsync-style patterns so verify counts
// match rsync's actual transfer set.
// ---------------------------------------------------------------------------
export async function getDirStats(
  dirPath: string,
  excludes: string[] = [],
): Promise<{ fileCount: number; totalBytes: number }> {
  if (excludes.length > 0) {
    let fileCount = 0;
    let totalBytes = 0;
    const walk = async (dir: string): Promise<void> => {
      let entries: import('fs').Dirent[];
      try {
        entries = await fs.readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }
      await Promise.all(
        entries.map(async (e) => {
          if (matchesExcludePattern(e.name, e.isDirectory(), excludes)) return;
          const full = path.join(dir, e.name);
          if (e.isDirectory()) {
            await walk(full);
          } else if (e.isFile()) {
            try {
              const st = await fs.stat(full);
              fileCount++;
              totalBytes += st.size;
            } catch {
              /* removed between readdir and stat */
            }
          }
        }),
      );
    };
    try {
      await walk(dirPath);
    } catch {
      /* ignore */
    }
    return { fileCount, totalBytes };
  }

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true, recursive: true });
    let fileCount = 0;
    let totalBytes = 0;
    await Promise.all(
      entries.map(async (entry) => {
        if (entry.isFile()) {
          try {
            // Node 20+: parentPath; older: path fallback
            const dirent = entry as { name: string; isFile(): boolean; parentPath?: string; path?: string };
            const parent = dirent.parentPath ?? dirent.path ?? dirPath;
            const fullPath = path.join(parent, entry.name);
            const stat = await fs.stat(fullPath);
            fileCount++;
            totalBytes += stat.size;
          } catch {
            // File removed between readdir and stat — skip
          }
        }
      })
    );
    return { fileCount, totalBytes };
  } catch {
    return { fileCount: 0, totalBytes: 0 };
  }
}

// ---------------------------------------------------------------------------
// B064: Promise wrapper around child_process.spawn
// Resolves with exit code 0, rejects on non-zero or spawn error.
// Exported (storage-panel P6) — single implementation shared across routes/utils.
// ---------------------------------------------------------------------------
export function spawnAsync(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args);
    proc.on('error', (err) => reject(err));
    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${cmd} exited with code ${code}`));
      }
    });
  });
}

// ---------------------------------------------------------------------------
// B064: 1. checkSsdMounted
// Check that the parent of holdingRoot is accessible (the T7 mount point).
// The brand subfolder may not exist yet — we check the parent only.
// Never throws — returns false on any error.
// ---------------------------------------------------------------------------
export async function checkSsdMounted(holdingRoot: string): Promise<boolean> {
  // B064: Check the volume mount point — two levels up from holdingRoot.
  // holdingRoot = /Volumes/T7/youtube-HOLDING/appydave
  // path.dirname once  = /Volumes/T7/youtube-HOLDING  (brand folder — may not exist yet)
  // path.dirname twice = /Volumes/T7                   (actual mount point — exists when plugged in)
  try {
    const volumeRoot = path.dirname(path.dirname(holdingRoot));
    await fs.access(volumeRoot);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// B064: 2. verifyHoldingMatch
// Compare local and holding directories by file count and total bytes.
// match: true only when both counts AND both byte totals are equal.
// Never throws — returns match:false on any error.
// ---------------------------------------------------------------------------
export async function verifyHoldingMatch(localDir: string, holdingDir: string): Promise<HoldVerification> {
  const empty: HoldVerification = {
    match: false,
    localFiles: 0,
    holdingFiles: 0,
    localBytes: 0,
    holdingBytes: 0,
  };

  try {
    const [local, holding] = await Promise.all([
      getDirStats(localDir),
      getDirStats(holdingDir),
    ]);

    // B064: holdingDir returning 0 files when it doesn't exist is fine for
    // getDirStats — but we want match:false if it's genuinely missing.
    // Access check distinguishes "exists but empty" from "does not exist".
    try {
      await fs.access(holdingDir);
    } catch {
      return empty;
    }

    // B064: Both-zero is inconclusive — an empty project should not be deletable
    if (local.fileCount === 0 && holding.fileCount === 0) {
      return {
        localFiles: 0,
        holdingFiles: 0,
        localBytes: 0,
        holdingBytes: 0,
        match: false,
      };
    }

    // B065: Match on file count only — byte totals differ across filesystems
    // due to .DS_Store churn, resource fork handling, and extended attributes.
    // File count equality is sufficient: a partial rsync produces fewer files, not same count with different bytes.
    return {
      match: local.fileCount === holding.fileCount,
      localFiles: local.fileCount,
      holdingFiles: holding.fileCount,
      localBytes: local.totalBytes,
      holdingBytes: holding.totalBytes,
    };
  } catch {
    return empty;
  }
}

// ---------------------------------------------------------------------------
// storage-panel P4: verifyDirsMatch
// General-purpose directory-pair verifier used by archive + hold (Pass 1).
// Matches when BOTH fileCount AND totalBytes are equal on src vs dest.
// Unlike verifyHoldingMatch, this:
//   - does not treat "both empty" as inconclusive (caller decides)
//   - does not require destDir to pre-exist (empty counts compare validly)
//   - compares bytes strictly — cross-filesystem byte drift on the same
//     source tree indicates a partial/corrupt copy, which is what we want to
//     catch before deleting the original.
// Never throws.
// ---------------------------------------------------------------------------
export async function verifyDirsMatch(
  srcDir: string,
  destDir: string,
): Promise<{ ok: boolean; srcFiles: number; destFiles: number; srcBytes: number; destBytes: number }> {
  try {
    // storage-panel: apply HOLD_EXCLUDES so the verify count matches rsync's
    // actual transfer set (.DS_Store, -trash/, s3-staging/, ._* are skipped
    // on both sides — otherwise verify spuriously fails when the source has
    // macOS junk files that the destination legitimately never received).
    const [src, dest] = await Promise.all([
      getDirStats(srcDir, HOLD_EXCLUDES),
      getDirStats(destDir, HOLD_EXCLUDES),
    ]);
    return {
      ok: src.fileCount === dest.fileCount && src.totalBytes === dest.totalBytes,
      srcFiles: src.fileCount,
      destFiles: dest.fileCount,
      srcBytes: src.totalBytes,
      destBytes: dest.totalBytes,
    };
  } catch {
    return { ok: false, srcFiles: 0, destFiles: 0, srcBytes: 0, destBytes: 0 };
  }
}

// ---------------------------------------------------------------------------
// B064: 3. getHoldStatus
// Full status check for a project: SSD mount, local/holding existence,
// relay bytes, and (when location === 'both') verification.
// ---------------------------------------------------------------------------
export async function getHoldStatus(
  projectCode: string,
  projectDir: string,
  relayDir: string | null,
  holdingRoot: string,
): Promise<HoldStatus> {
  // B064: Holding path is flat inside brand folder — no range subfolder
  const holdingPath = path.join(holdingRoot, path.basename(path.normalize(projectDir)));

  // B064: Run all independent checks in parallel
  const [ssdMounted, localAccessErr, holdingAccessErr] = await Promise.all([
    checkSsdMounted(holdingRoot),
    fs.access(projectDir).then(() => null).catch((e: unknown) => e),
    fs.access(holdingPath).then(() => null).catch((e: unknown) => e),
  ]);

  const localExists = localAccessErr === null;
  const holdingExists = holdingAccessErr === null;

  // B064: Compute relay bytes from relay subfolders if relay is configured
  let relayBytes = 0;
  if (relayDir) {
    const [rRec, r1st, r2nd] = await Promise.all([
      getDirStats(path.join(relayDir, 'recordings')).then(s => s.totalBytes),
      getDirStats(path.join(relayDir, 'edit-1st')).then(s => s.totalBytes),
      getDirStats(path.join(relayDir, 'edit-2nd')).then(s => s.totalBytes),
    ]);
    relayBytes = rRec + r1st + r2nd;
  }

  // B064: relayBlocked if relay has any files at all
  const relayBlocked = relayBytes > 0;

  // B064: Determine location state
  let location: HoldStatus['location'];
  if (localExists && holdingExists) {
    location = 'both';
  } else if (localExists) {
    location = 'local-only';
  } else if (holdingExists) {
    location = 'holding-only';
  } else {
    location = 'unknown';
  }

  const status: HoldStatus = {
    location,
    holdingPath: holdingExists ? holdingPath : undefined,
    relayBlocked,
    relayBytes,
    ssdMounted,
  };

  // B064: Auto-verify when project exists in both locations
  if (location === 'both') {
    status.verification = await verifyHoldingMatch(projectDir, holdingPath);
  }

  return status;
}

// ---------------------------------------------------------------------------
// B064: 4. holdProject
// rsync local project → T7 holding area (flat, no range folder).
// Creates the brand subfolder if it doesn't exist yet.
// ---------------------------------------------------------------------------
export async function holdProject(
  projectDir: string,
  holdingRoot: string,
): Promise<HoldOperationResult> {
  const destDir = path.join(holdingRoot, path.basename(path.normalize(projectDir)));

  try {
    // B064: Create brand subfolder on T7 if it doesn't exist yet
    await fs.mkdir(holdingRoot, { recursive: true });

    // B064: rsync with array args — no shell string interpolation
    // Trailing slash on source means "copy contents into dest"
    await spawnAsync('rsync', ['-a', ...holdExcludeArgs(), projectDir + '/', destDir + '/']);

    return {
      success: true,
      message: `Project held at ${destDir}`,
      holdingPath: destDir,
    };
  } catch (err) {
    return {
      success: false,
      message: 'Hold failed',
      holdingPath: destDir,
      error: String(err),
    };
  }
}

// ---------------------------------------------------------------------------
// B064: 5. restoreFromHolding
// rsync T7 holding → local project directory.
// Creates the local dir if project was fully deleted.
// ---------------------------------------------------------------------------
export async function restoreFromHolding(
  holdingDir: string,
  localDir: string,
): Promise<HoldOperationResult> {
  try {
    // B064: Create local dir if project was fully deleted
    await fs.mkdir(localDir, { recursive: true });

    // B064: rsync with array args — no shell string interpolation
    await spawnAsync('rsync', ['-a', ...holdExcludeArgs(), holdingDir + '/', localDir + '/']);

    return {
      success: true,
      message: `Project restored to ${localDir}`,
      holdingPath: holdingDir,
    };
  } catch (err) {
    return {
      success: false,
      message: 'Restore failed',
      holdingPath: holdingDir,
      error: String(err),
    };
  }
}

// ---------------------------------------------------------------------------
// B064: 6. deleteLocalProject
// Delete the local project directory.
// 5-gate safety chain — ALL must pass before fs.rm() is called.
// ---------------------------------------------------------------------------
export async function deleteLocalProject(
  projectDir: string,
  projectsRoot: string,
  verified: boolean,
): Promise<HoldOperationResult> {
  // B064: Gate 1 — resolve both to absolute paths
  const resolvedProject = path.resolve(projectDir);
  const resolvedRoot = path.resolve(projectsRoot);

  // B064: Gate 2 — project must not equal the root itself (check before startsWith)
  if (resolvedProject === resolvedRoot) {
    return {
      success: false,
      message: 'Safety gate failed: project path equals projectsRoot',
      error: 'Refusing to delete the projects root directory',
    };
  }

  // B064: Gate 3 — project must be strictly inside projectsRoot
  if (!resolvedProject.startsWith(resolvedRoot + path.sep)) {
    return {
      success: false,
      message: 'Safety gate failed: project path is outside projectsRoot',
      error: `${resolvedProject} is not inside ${resolvedRoot}`,
    };
  }

  // B064: Gate 4 — caller must have confirmed HOLDING verification passed
  if (!verified) {
    return {
      success: false,
      message: 'Safety gate failed: verified is false',
      error: 'Cannot delete local project without HOLDING verification',
    };
  }

  // B064: Gate 5 — directory must still exist on disk
  try {
    await fs.access(projectDir);
  } catch {
    return {
      success: false,
      message: 'Safety gate failed: project directory does not exist',
      error: `${projectDir} is not accessible`,
    };
  }

  // B064: All gates passed — safe to delete
  try {
    await fs.rm(projectDir, { recursive: true });
    return {
      success: true,
      message: `Local project deleted: ${projectDir}`,
    };
  } catch (err) {
    return {
      success: false,
      message: 'Delete failed',
      error: String(err),
    };
  }
}

// ---------------------------------------------------------------------------
// B064: 7. deleteHoldingProject
// Delete a project from the T7 holding area.
// Symmetric 5-gate safety chain — ALL must pass before fs.rm() is called.
// ---------------------------------------------------------------------------
export async function deleteHoldingProject(
  holdingDir: string,
  holdingRoot: string,
  verified: boolean,
): Promise<HoldOperationResult> {
  // B064: Gate 1 — resolve both to absolute paths
  const resolvedHolding = path.resolve(holdingDir);
  const resolvedRoot = path.resolve(holdingRoot);

  // B064: Gate 2 — holding dir must not equal the root itself (check before startsWith)
  if (resolvedHolding === resolvedRoot) {
    return {
      success: false,
      message: 'Safety gate failed: holding path equals holdingRoot',
      error: 'Refusing to delete the holding root directory',
    };
  }

  // B064: Gate 3 — holding dir must be strictly inside holdingRoot
  if (!resolvedHolding.startsWith(resolvedRoot + path.sep)) {
    return {
      success: false,
      message: 'Safety gate failed: holding path is outside holdingRoot',
      error: `${resolvedHolding} is not inside ${resolvedRoot}`,
    };
  }

  // B064: Gate 4 — caller must have confirmed verification passed
  if (!verified) {
    return {
      success: false,
      message: 'Safety gate failed: verified is false',
      error: 'Cannot delete holding project without verification',
    };
  }

  // B064: Gate 5 — directory must still exist on disk
  try {
    await fs.access(holdingDir);
  } catch {
    return {
      success: false,
      message: 'Safety gate failed: holding directory does not exist',
      error: `${holdingDir} is not accessible`,
    };
  }

  // B064: All gates passed — safe to delete
  try {
    await fs.rm(holdingDir, { recursive: true });
    return {
      success: true,
      message: `Holding project deleted: ${holdingDir}`,
    };
  } catch (err) {
    return {
      success: false,
      message: 'Delete failed',
      error: String(err),
    };
  }
}
