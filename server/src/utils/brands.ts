/**
 * Brand registry — reads ~/.config/appydave/brands.json (the canonical brand file)
 * and merges any on-disk v-* roots not registered there, so a new brand folder is
 * selectable before it has an entry. FliHub never writes brands.json.
 */
import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import { brandsFilePath, readMachineSettings, resolveBrandRoot } from '@flivideo/core';

const BRANDS_JSON = path.join(os.homedir(), '.config', 'appydave', 'brands.json');

export interface BrandInfo {
  key: string; // brands.json key — the identity
  name: string; // display name
  root: string; // absolute projectsRootDirectory for this brand
  publishedPath: string | null; // ssd_backup from brands.json, or derived
  holdingPath: string | null; // derived — brands.json has no holding field yet
  source: 'brands.json' | 'disk'; // disk = v-* folder with no registry entry
  active: boolean;
}

interface BrandsFileEntry {
  name?: string;
  locations?: { video_projects?: string; ssd_backup?: string };
}

function titleCase(key: string): string {
  return key
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// T7 layout convention (matches the existing appydave config values).
function derivedPublished(key: string): string {
  return `/Volumes/T7/youtube-PUBLISHED/${key}`;
}
function derivedHolding(key: string): string {
  return `/Volumes/T7/youtube-HOLDING/${key}`;
}

async function readBrandsFile(brandsPath = BRANDS_JSON): Promise<Record<string, BrandsFileEntry>> {
  try {
    const raw = await fs.readJson(brandsPath);
    return raw?.brands && typeof raw.brands === 'object' ? raw.brands : {};
  } catch (err) {
    console.warn(`[brands] Could not read ${brandsPath}:`, err);
    return {};
  }
}

/**
 * The T7 paths that move WITH a brand root (same values a brand switch writes):
 * ssd_backup from brands.json when present, otherwise the derived convention.
 */
export async function brandStoragePaths(
  key: string,
  brandsPath = BRANDS_JSON
): Promise<{ publishedPath: string; holdingPath: string }> {
  const entry = (await readBrandsFile(brandsPath))[key];
  return {
    publishedPath: entry?.locations?.ssd_backup || derivedPublished(key),
    holdingPath: derivedHolding(key),
  };
}

/**
 * List brands: brands.json entries first, then unregistered on-disk v-* roots
 * under the parent of the current projects root.
 *
 * W3 F2: a registry root resolves exactly as doors 2/3 resolve it (@flivideo/core
 * resolveBrandRoot: /Users/<anyone> rewritten to this machine's home, ~/.fli/machine.json
 * override), so a brand switch writes the same root POST /api/context would (C1).
 */
export async function listBrands(
  currentRoot: string,
  options: { home?: string } = {}
): Promise<BrandInfo[]> {
  const home = options.home ?? os.homedir();
  const entries = await readBrandsFile(brandsFilePath({ home }));
  const machine = await readMachineSettings({ home });
  const machineRoots = machine.kind === 'valid' ? machine.value : null;
  const current = currentRoot ? path.resolve(currentRoot) : null;
  const brands: BrandInfo[] = [];
  const seenRoots = new Set<string>();

  for (const [key, entry] of Object.entries(entries)) {
    const name = entry.name || titleCase(key);
    const videoProjects = entry.locations?.video_projects;
    const resolved = resolveBrandRoot({ key, name, videoProjects }, machineRoots, { home });
    if (!resolved) continue; // an entry without a video root cannot be switched to
    const root = path.resolve(resolved);
    seenRoots.add(root);
    brands.push({
      key,
      name,
      root,
      publishedPath: entry.locations?.ssd_backup || derivedPublished(key),
      holdingPath: derivedHolding(key),
      source: 'brands.json',
      active: root === current,
    });
  }

  // Merge unregistered v-* siblings (a brand is a subfolder; v- prefix optional per
  // David, but without a registry entry the prefix is the only safe marker).
  const parent = path.dirname(currentRoot);
  try {
    const dirents = await fs.readdir(parent, { withFileTypes: true });
    for (const d of dirents) {
      if (!d.isDirectory() || !d.name.startsWith('v-')) continue;
      const root = path.join(parent, d.name);
      if (seenRoots.has(root)) continue;
      const key = d.name.slice(2);
      brands.push({
        key,
        name: titleCase(key),
        root,
        publishedPath: derivedPublished(key),
        holdingPath: derivedHolding(key),
        source: 'disk',
        active: root === current,
      });
    }
  } catch (err) {
    console.warn('[brands] Could not scan brand roots:', err);
  }

  return brands.sort((a, b) => a.name.localeCompare(b.name));
}
