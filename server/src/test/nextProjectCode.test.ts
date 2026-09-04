/**
 * FR-163: next = max(scan, high-water) + 1 — the spec's D1-D6 at util level.
 * AC 9 (delete highest → next unchanged) is the mark test; AC 12/13/14 are ordering,
 * rollover, and non-conforming-skip.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import {
  parseSeriesCode,
  compareSeriesCodes,
  incrementSeriesCode,
  maxCodeInNames,
  computeNextCode,
} from '../utils/nextProjectCode.js';
import type { Config } from '../../../shared/types.js';

let tmp: string;
beforeEach(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'fr163-'));
});
afterEach(async () => {
  await fs.remove(tmp);
});

function cfg(extra: Partial<Config> = {}): Config {
  return { projectsRootDirectory: tmp, ...extra } as Config;
}

describe('parse / compare / increment', () => {
  it('parses only letter+2-digit prefixes', () => {
    expect(parseSeriesCode('d02-cutty')).toEqual({ letter: 'd', num: 2 });
    expect(parseSeriesCode('d02')).toEqual({ letter: 'd', num: 2 });
    expect(parseSeriesCode('phase-1')).toBeNull();
    expect(parseSeriesCode('catalog')).toBeNull();
    expect(parseSeriesCode('d2-short')).toBeNull();
    expect(parseSeriesCode('d021-x')).toBeNull(); // 3 digits then '-'? d02 then '1-' → no: needs (-|$) after NN
  });
  it('orders letter first, then number (D3): b03 > a97', () => {
    expect(compareSeriesCodes(parseSeriesCode('b03-x')!, parseSeriesCode('a97-y')!)).toBeGreaterThan(0);
  });
  it('rolls x99 → (x+1)00 and declines at z99 (D4)', () => {
    expect(incrementSeriesCode({ letter: 'a', num: 99 })).toEqual({ letter: 'b', num: 0 });
    expect(incrementSeriesCode({ letter: 'z', num: 99 })).toBeNull();
  });
  it('max ignores non-conforming names (D5)', () => {
    expect(maxCodeInNames(['catalog', 'd02-x', 'phase-1', 'tools'])).toEqual({ letter: 'd', num: 2 });
  });
});

describe('computeNextCode', () => {
  it('AC 12: a97 + b03 → b04', async () => {
    await fs.ensureDir(path.join(tmp, 'a97-old'));
    await fs.ensureDir(path.join(tmp, 'b03-new'));
    const r = await computeNextCode(cfg());
    expect(r).toMatchObject({ state: 'ok', next: 'b04', highest: 'b03' });
  });
  it('AC 13: a99 → b00', async () => {
    await fs.ensureDir(path.join(tmp, 'a99-last'));
    expect((await computeNextCode(cfg())).next).toBe('b00');
  });
  it('AC 14: non-conforming folders are skipped silently', async () => {
    for (const d of ['catalog', 'docs', 'poem', 'tools', 'phase-1', 'd02-x']) {
      await fs.ensureDir(path.join(tmp, d));
    }
    const r = await computeNextCode(cfg());
    expect(r).toMatchObject({ state: 'ok', next: 'd03' });
  });
  it('AC 9 (D1/D2): deleting the highest does not lower next when the mark holds it', async () => {
    await fs.ensureDir(path.join(tmp, 'd01-keep'));
    const r = await computeNextCode(cfg({ projectCodeHighWater: { [tmp]: 'd02' } }));
    expect(r.next).toBe('d03');
  });
  it('scans archived buckets one level deep', async () => {
    await fs.ensureDir(path.join(tmp, 'd01-live'));
    await fs.ensureDir(path.join(tmp, 'archived', 'b50-b99', 'b73-old'));
    const r = await computeNextCode(cfg());
    expect(r.highest).toBe('d01'); // d01 > b73
    await fs.remove(path.join(tmp, 'd01-live'));
    const r2 = await computeNextCode(cfg());
    expect(r2).toMatchObject({ next: 'b74', highest: 'b73' });
  });
  it('review bug 1: publishedPath BUCKETS are scanned one level deep', async () => {
    const pub = path.join(tmp, 'fake-t7');
    await fs.ensureDir(path.join(pub, 'b50-b99', 'b63-remotion-tutorial'));
    await fs.ensureDir(path.join(tmp, 'a01-live'));
    const r = await computeNextCode(cfg({ publishedPath: pub }));
    expect(r).toMatchObject({ next: 'b64', highest: 'b63' }); // not b51 from the bucket name
  });
  it('review bug 2: a project directly inside archived/ (no bucket) is counted', async () => {
    await fs.ensureDir(path.join(tmp, 'a01-live'));
    await fs.ensureDir(path.join(tmp, 'archived', 'd09-direct'));
    const r = await computeNextCode(cfg());
    expect(r).toMatchObject({ next: 'd10', highest: 'd09' });
  });
  it('includes publishedPath when reachable, skips silently when not', async () => {
    const pub = path.join(tmp, 'fake-t7');
    await fs.ensureDir(path.join(pub, 'e05-published'));
    await fs.ensureDir(path.join(tmp, 'd01-live'));
    const r = await computeNextCode(cfg({ publishedPath: pub }));
    expect(r.next).toBe('e06');
    const r2 = await computeNextCode(cfg({ publishedPath: path.join(tmp, 'missing') }));
    expect(r2.next).toBe('d02');
  });
  it('D6: empty root → a01/state empty; unreadable root → state unreadable, no code', async () => {
    await fs.ensureDir(path.join(tmp, 'not-a-project'));
    const r = await computeNextCode(cfg());
    expect(r).toMatchObject({ state: 'empty', next: 'a01' });
    const r2 = await computeNextCode(cfg({ projectsRootDirectory: path.join(tmp, 'gone') }));
    expect(r2).toMatchObject({ state: 'unreadable', next: null });
  });
  it('D4: z99 → exhausted, next null', async () => {
    await fs.ensureDir(path.join(tmp, 'z99-end'));
    const r = await computeNextCode(cfg());
    expect(r).toMatchObject({ state: 'exhausted', next: null, highest: 'z99' });
  });
  it('seeded is true only when scan found codes and no mark existed', async () => {
    await fs.ensureDir(path.join(tmp, 'd01-x'));
    expect((await computeNextCode(cfg())).seeded).toBe(true);
    expect((await computeNextCode(cfg({ projectCodeHighWater: { [tmp]: 'd01' } }))).seeded).toBeFalsy();
  });
});
