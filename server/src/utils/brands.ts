/**
 * Brand registry — reads ~/.config/appydave/brands.json (the canonical brand file)
 * and merges any on-disk v-* roots not registered there, so a new brand folder is
 * selectable before it has an entry. FliHub never writes brands.json.
 */
import path from 'path';
import os from 'os';
import fs from 'fs-extra';

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

async function readBrandsFile(): Promise<Record<string, BrandsFileEntry>> {
  try {
    const raw = await fs.readJson(BRANDS_JSON);
    return raw?.brands && typeof raw.brands === 'object' ? raw.brands : {};
  } catch (err) {
    console.warn(`[brands] Could not read ${BRANDS_JSON}:`, err);
    return {};
  }
}

/**
 * List brands: brands.json entries first, then unregistered on-disk v-* roots
 * under the parent of the current projects root.
 */
export async function listBrands(currentRoot: string): Promise<BrandInfo[]> {
  const entries = await readBrandsFile();
  const brands: BrandInfo[] = [];
  const seenRoots = new Set<string>();

  for (const [key, entry] of Object.entries(entries)) {
    const root = entry.locations?.video_projects;
    if (!root) continue; // an entry without a video root cannot be switched to
    seenRoots.add(root);
    brands.push({
      key,
      name: entry.name || titleCase(key),
      root,
      publishedPath: entry.locations?.ssd_backup || derivedPublished(key),
      holdingPath: derivedHolding(key),
      source: 'brands.json',
      active: root === currentRoot,
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
        active: root === currentRoot,
      });
    }
  } catch (err) {
    console.warn('[brands] Could not scan brand roots:', err);
  }

  return brands.sort((a, b) => a.name.localeCompare(b.name));
}
