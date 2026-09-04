// storage-panel WU1: Storage tree utility — per-project hierarchical view of
// Local / HOLDING / PUBLISHED with Heavy/Light classification.
//
// Re-derives state from disk on every call. Never trusts client-supplied state.
import { promises as fs } from 'fs';
import path from 'path';
import { getDirStats, checkSsdMounted } from './holdUtils.js';
import type {
  StorageTreeResponse,
  StorageTreeNode,
  StorageTreeSizes,
  StorageState,
  StorageClassification,
  StorageLocation,
} from '../../../shared/types.js';

// ---------------------------------------------------------------------------
// Single source of truth for Heavy subfolders. Anything outside this list that
// lives at the top of a project folder is classified as Light.
// `recordings/-chapters/` is nested within `recordings/` and rides along in
// the rsync — the directory walk treats it as a regular child of recordings.
// ---------------------------------------------------------------------------
export const HEAVY_SUBFOLDERS = ['recordings', 'recording-shadows', 'final', 'b-roll'] as const; // FR-161: b-roll travels on hold/offload
export type HeavySubfolder = typeof HEAVY_SUBFOLDERS[number];

export function isHeavySubfolder(name: string): boolean {
  return (HEAVY_SUBFOLDERS as readonly string[]).includes(name);
}

// ---------------------------------------------------------------------------
// Async predicates — never throw.
// ---------------------------------------------------------------------------

async function dirExists(p: string): Promise<boolean> {
  try {
    const stat = await fs.stat(p);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Returns true if NONE of the HEAVY_SUBFOLDERS exist (or all are empty) inside
 * localDir. Used by state derivation to distinguish `held` (heavy evacuated)
 * from `active`.
 */
async function heavySubfoldersAbsent(localDir: string): Promise<boolean> {
  for (const sub of HEAVY_SUBFOLDERS) {
    const p = path.join(localDir, sub);
    if (await dirExists(p)) {
      const stats = await getDirStats(p);
      if (stats.fileCount > 0) return false;
    }
  }
  return true;
}

async function hasAnyContent(dir: string): Promise<boolean> {
  if (!(await dirExists(dir))) return false;
  const stats = await getDirStats(dir);
  return stats.fileCount > 0;
}

// ---------------------------------------------------------------------------
// Tree walkers.
// ---------------------------------------------------------------------------

/**
 * Walk a single top-level child of a project folder and build a tree node.
 * - Classification is based on the TOP name (heavy subfolder or not).
 * - For directories, we recursively expand one level deep into files plus
 *   sub-directories (we don't go arbitrarily deep for file listing; we return
 *   direct children only to keep the payload small while still letting the UI
 *   show `recordings/-chapters/` as a child when present).
 */
async function buildTopLevelNode(
  parent: string,
  name: string,
  location: StorageLocation,
  classification: StorageClassification,
): Promise<StorageTreeNode | null> {
  const p = path.join(parent, name);
  try {
    const stat = await fs.stat(p);
    if (stat.isDirectory()) {
      // Total bytes (recursive) for the directory
      const dirStats = await getDirStats(p);
      const children = await listImmediateChildren(p, location, classification);
      return {
        name,
        path: p,
        sizeBytes: dirStats.totalBytes,
        classification,
        location,
        children: children.length > 0 ? children : undefined,
      };
    }
    return {
      name,
      path: p,
      sizeBytes: stat.size,
      classification,
      location,
    };
  } catch {
    return null;
  }
}

/**
 * Return immediate children (files + sub-dirs) of a directory. Sub-dirs are
 * rolled up (size = recursive bytes) so the UI doesn't explode with deep
 * content. Classification and location are inherited from the parent node.
 */
async function listImmediateChildren(
  dir: string,
  location: StorageLocation,
  classification: StorageClassification,
): Promise<StorageTreeNode[]> {
  const out: StorageTreeNode[] = [];
  let entries: import('fs').Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.name === '.DS_Store' || e.name.startsWith('._')) continue;
    const p = path.join(dir, e.name);
    try {
      if (e.isDirectory()) {
        const stats = await getDirStats(p);
        out.push({
          name: e.name,
          path: p,
          sizeBytes: stats.totalBytes,
          classification,
          location,
        });
      } else if (e.isFile()) {
        const stat = await fs.stat(p);
        out.push({
          name: e.name,
          path: p,
          sizeBytes: stat.size,
          classification,
          location,
        });
      }
    } catch {
      // ignore removed/unreadable entries
    }
  }
  // Largest first
  out.sort((a, b) => b.sizeBytes - a.sizeBytes);
  return out;
}

/**
 * Build the top-level tree for a folder (local, holding, or published).
 * Each direct child becomes one TreeNode; HEAVY_SUBFOLDERS get `classification: 'heavy'`.
 */
async function buildLocationTree(
  dir: string,
  location: StorageLocation,
): Promise<StorageTreeNode[]> {
  const out: StorageTreeNode[] = [];
  let entries: import('fs').Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.name === '.DS_Store' || e.name.startsWith('._')) continue;
    const classification: StorageClassification = isHeavySubfolder(e.name) ? 'heavy' : 'light';
    const node = await buildTopLevelNode(dir, e.name, location, classification);
    if (node) out.push(node);
  }
  // Heavy first, then largest within group
  out.sort((a, b) => {
    if (a.classification !== b.classification) {
      return a.classification === 'heavy' ? -1 : 1;
    }
    return b.sizeBytes - a.sizeBytes;
  });
  return out;
}

// ---------------------------------------------------------------------------
// Public API: getStorageTree
// ---------------------------------------------------------------------------

export interface GetStorageTreeOpts {
  projectsRoot: string;
  holdingRoot: string | null;
  publishedRoot: string | null;
  relayRoot: string | null;
}

/**
 * Build a StorageTreeResponse for a project. Re-derives state from disk.
 *
 * State rules:
 *   - archived: PUBLISHED exists AND local does not exist
 *   - held:     HOLDING exists with content AND heavy subfolders absent from local
 *   - else:     active
 *
 * Degraded detection:
 *   - If PUBLISHED has content AND HOLDING has content → degraded (corruption).
 *     The state is still derived (archived takes precedence), but the response
 *     flags degraded=true with an error message.
 */
export async function getStorageTree(
  projectCode: string,
  opts: GetStorageTreeOpts,
): Promise<StorageTreeResponse> {
  const { projectsRoot, holdingRoot, publishedRoot, relayRoot } = opts;

  const localDir = path.join(projectsRoot, projectCode);
  const holdingDir = holdingRoot ? path.join(holdingRoot, projectCode) : null;
  const publishedDir = publishedRoot ? path.join(publishedRoot, projectCode) : null;

  // Existence checks
  const [localExists, holdingHas, publishedHas] = await Promise.all([
    dirExists(localDir),
    holdingDir ? hasAnyContent(holdingDir) : Promise.resolve(false),
    publishedDir ? hasAnyContent(publishedDir) : Promise.resolve(false),
  ]);

  // storage-panel P7: SSD mount probe — delegate to holdUtils.checkSsdMounted
  // which checks two dirname levels up (volume root). holdingRoot /
  // publishedRoot are the brand-scoped roots (e.g. .../T7/youtube-HOLDING/appydave).
  let ssdMounted = false;
  if (holdingRoot) {
    ssdMounted = await checkSsdMounted(holdingRoot);
  } else if (publishedRoot) {
    ssdMounted = await checkSsdMounted(publishedRoot);
  }

  // Relay bytes
  let relayBytes = 0;
  if (relayRoot) {
    const relayProjectDir = path.join(relayRoot, projectCode);
    for (const sub of ['recordings', 'edit-1st', 'edit-2nd']) {
      const s = await getDirStats(path.join(relayProjectDir, sub));
      relayBytes += s.totalBytes;
    }
  }
  const relayBlocked = relayBytes > 0;

  // Derive state
  let state: StorageState;
  let degraded = false;
  let error: string | undefined;

  if (publishedHas && !localExists) {
    state = 'archived';
  } else if (holdingHas && (await heavySubfoldersAbsent(localDir))) {
    state = 'held';
  } else if (publishedHas && localExists) {
    // Ambiguous — both published and local present. Treat as active but flag.
    state = 'active';
    degraded = true;
    error = `Published copy exists at ${publishedDir} while local folder still present — resolve manually.`;
  } else {
    state = 'active';
  }

  // Additional degraded detection: both HOLDING and PUBLISHED present
  if (holdingHas && publishedHas) {
    degraded = true;
    error =
      (error ? error + ' ' : '') +
      `Both HOLDING and PUBLISHED contain copies of ${projectCode} — data is in two places. Resolve via Finder.`;
  }

  // Build nodes. Prefer the active-storage location for the tree view:
  //   active  → local tree
  //   held    → local tree (light stays) + holding tree (heavy)
  //   archived → published tree
  const nodes: StorageTreeNode[] = [];
  let localTotal = 0;
  let heavyTotal = 0;
  let lightTotal = 0;
  let heldTotal = 0;
  let archivedTotal = 0;

  if (localExists) {
    const localNodes = await buildLocationTree(localDir, 'local');
    nodes.push(...localNodes);
    for (const n of localNodes) {
      localTotal += n.sizeBytes;
      if (n.classification === 'heavy') heavyTotal += n.sizeBytes;
      else lightTotal += n.sizeBytes;
    }
  }

  if (holdingHas && holdingDir) {
    const holdingNodes = await buildLocationTree(holdingDir, 'holding');
    // Annotate held content — merged into the tree so the UI can group.
    nodes.push(...holdingNodes);
    heldTotal = holdingNodes.reduce((sum, n) => sum + n.sizeBytes, 0);
  }

  if (publishedHas && publishedDir) {
    const publishedNodes = await buildLocationTree(publishedDir, 'published');
    // For archived state, the published tree IS the tree. For degraded cases,
    // we still surface it so the user can see where it is.
    if (state === 'archived') {
      nodes.push(...publishedNodes);
    }
    archivedTotal = publishedNodes.reduce((sum, n) => sum + n.sizeBytes, 0);
  }

  const sizes: StorageTreeSizes = {
    localTotal,
    heavyTotal,
    lightTotal,
    heldTotal,
    archivedTotal,
  };

  return {
    state,
    nodes,
    sizes,
    paths: {
      local: localDir,
      holding: holdingDir,
      published: publishedDir,
    },
    relayBlocked,
    relayBytes,
    ssdMounted,
    ...(degraded ? { degraded: true, error } : {}),
  };
}

// ---------------------------------------------------------------------------
// Heavy-subfolder rsync helpers — used by POST /hold and POST /restore-held.
// Kept close to HEAVY_SUBFOLDERS so adding a new heavy folder is a one-line change.
// ---------------------------------------------------------------------------

export function heavySubfolderPaths(projectDir: string): string[] {
  return HEAVY_SUBFOLDERS.map((s) => path.join(projectDir, s));
}
