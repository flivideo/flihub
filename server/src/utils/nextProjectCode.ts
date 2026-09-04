/**
 * FR-163: Next project code — {letter}{NN}, highest-ever + 1, gaps never refilled.
 *
 * next = max(scan, stored high-water mark) + 1  (D1/D2). The scan covers the live root
 * (one level, deliberately), and archived/ + publishedPath (when reachable) each scanned
 * TWO levels — their own listing plus one level into each hand-made bucket (D2 seeding, §3).
 * Ordering is letter-then-number on the parsed pair, never lexical on folder names (D3).
 * x99 → (x+1)00; z99 has no successor and must decline visibly (D4).
 */
import path from 'path';
import fs from 'fs-extra';
import type { Config } from '../../../shared/types.js';
import { expandPath } from './pathUtils.js';

const SERIES_PATTERN = /^([a-z])(\d{2})(-|$)/;

export interface SeriesCode {
  letter: string;
  num: number; // 0-99
}

export function parseSeriesCode(name: string): SeriesCode | null {
  const m = name.match(SERIES_PATTERN);
  if (!m) return null;
  return { letter: m[1], num: parseInt(m[2], 10) };
}

export function codeToString(c: SeriesCode): string {
  return `${c.letter}${String(c.num).padStart(2, '0')}`;
}

/** letter first, then numeric value (D3): b03 > a97 */
export function compareSeriesCodes(a: SeriesCode, b: SeriesCode): number {
  if (a.letter !== b.letter) return a.letter < b.letter ? -1 : 1;
  return a.num - b.num;
}

/** d02 → d03; x99 → (x+1)00; z99 → null (D4: exhausted, decline visibly) */
export function incrementSeriesCode(c: SeriesCode): SeriesCode | null {
  if (c.num < 99) return { letter: c.letter, num: c.num + 1 };
  if (c.letter === 'z') return null;
  return { letter: String.fromCharCode(c.letter.charCodeAt(0) + 1), num: 0 };
}

async function listDirsSafe(dir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
}

function maxOf(codes: SeriesCode[]): SeriesCode | null {
  let max: SeriesCode | null = null;
  for (const c of codes) {
    if (!max || compareSeriesCodes(c, max) > 0) max = c;
  }
  return max;
}

/** Max conforming code across a list of folder names (D5: non-conforming skipped silently). */
export function maxCodeInNames(names: string[]): SeriesCode | null {
  return maxOf(names.map(parseSeriesCode).filter((c): c is SeriesCode => c !== null));
}

export interface NextCodeResult {
  state: 'ok' | 'empty' | 'unreadable' | 'exhausted';
  next: string | null; // the code to pre-fill, e.g. "d03" ("a01" when state==='empty' — David's ruling 2026-09-04)
  highest: string | null; // the max this was computed from (scan ∪ mark)
  root: string; // expanded root the answer applies to (AC 15: client resets on change)
  reason?: string; // human-readable, for the D6/D4 decline paths
  seeded?: boolean; // true when this call seeded the high-water mark
}

/**
 * Compute the next code for the current root. Does NOT persist anything —
 * the caller decides whether to write the seed/mark back to config.
 */
export async function computeNextCode(config: Config): Promise<NextCodeResult> {
  const root = expandPath(config.projectsRootDirectory || '');

  if (!root || !(await fs.pathExists(root))) {
    return {
      state: 'unreadable',
      next: null,
      highest: null,
      root,
      reason: 'Could not read the projects directory — enter a code manually.',
    };
  }

  // Live root (existing exclusions: dot-, dash-prefixed, archived — projects.ts:114-120)
  let rootDirs: string[];
  try {
    const entries = await fs.readdir(root, { withFileTypes: true });
    rootDirs = entries
      .filter(
        (e) =>
          e.isDirectory() &&
          !e.name.startsWith('.') &&
          !e.name.startsWith('-') &&
          e.name !== 'archived'
      )
      .map((e) => e.name);
  } catch {
    return {
      state: 'unreadable',
      next: null,
      highest: null,
      root,
      reason: 'Could not read the projects directory — enter a code manually.',
    };
  }

  const candidates: SeriesCode[] = [];
  const collect = (names: string[]) => {
    const m = maxCodeInNames(names);
    if (m) candidates.push(m);
  };
  collect(rootDirs);

  // Collect a directory's own listing AND one level into each subdirectory.
  // Both levels matter: projects can sit directly in archived/ or the published
  // root, or inside hand-made buckets like b50-b99/ (review bugs 1+2 — a shallow
  // scan of a bucketed tree returns the bucket NAME's parse, a confident wrong code).
  const collectTwoLevels = async (dir: string) => {
    const top = await listDirsSafe(dir);
    collect(top);
    for (const sub of top) {
      collect(await listDirsSafe(path.join(dir, sub)));
    }
  };

  // archived/ — direct drop-ins and bucket contents (§3)
  await collectTwoLevels(path.join(root, 'archived'));

  // publishedPath when reachable — skipped silently when T7 is unmounted (§3);
  // scanned symmetrically with archived/ (projects accumulate in hand-made buckets there)
  if (config.publishedPath) {
    const pub = expandPath(config.publishedPath);
    if (await fs.pathExists(pub)) {
      await collectTwoLevels(pub);
    }
  }

  const scanMax = maxOf(candidates);
  const storedMarkStr = config.projectCodeHighWater?.[root];
  const storedMark = storedMarkStr ? parseSeriesCode(storedMarkStr) : null;

  const highest = maxOf([scanMax, storedMark].filter((c): c is SeriesCode => c !== null));

  if (!highest) {
    // Genuinely empty (root readable, zero conforming codes, no mark) — D6.
    return { state: 'empty', next: 'a01', highest: null, root, reason: 'First project in this root.' };
  }

  const next = incrementSeriesCode(highest);
  if (!next) {
    return {
      state: 'exhausted',
      next: null,
      highest: codeToString(highest),
      root,
      reason: 'Code series exhausted at z99 — enter a code manually.',
    };
  }

  return {
    state: 'ok',
    next: codeToString(next),
    highest: codeToString(highest),
    root,
    seeded: !storedMark && !!scanMax,
  };
}
