/**
 * The managed home of AppyDave's publishing settings (2026-10-06,
 * /Users/davidcruwys/dev/ad/flivideo/docs/youtube-channel-architecture.md §2): the `publish` block of the brand's
 * `fli.brand.json`, git-tracked in the brand repo. It holds brand-config.json's exact shape, copied verbatim, so the
 * mapper below reads it unchanged. The bundled `server/brand-config.json` stays only as the fallback.
 */
import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import { readBrands, readMachineSettings, resolveBrandRoot } from '@flivideo/core';

/** brand-config.json was always AppyDave's (it is not keyed by brand). */
export const BRAND_CONFIG_BRAND = 'appydave';

/** `<appydave brand root>/fli.brand.json`, or `null` when the registry cannot place the brand on this machine. */
export async function managedBrandConfigFile(home: string = os.homedir()): Promise<string | null> {
  const brands = await readBrands({ home });
  if (brands === null || brands.kind === 'invalid') return null;
  const brand = brands.value.find((b) => b.key === BRAND_CONFIG_BRAND);
  if (!brand) return null;
  const machine = await readMachineSettings({ home });
  const root = resolveBrandRoot(brand, machine.kind === 'valid' ? machine.value : null, { home });
  return root !== null && path.isAbsolute(root) ? path.join(root, 'fli.brand.json') : null;
}

/** The `publish` block of `file`, or `null` when the file or the block is absent. Throws on unreadable JSON. */
export async function readManagedPublish(file: string): Promise<Record<string, unknown> | null> {
  let raw: string;
  try {
    raw = await fs.readFile(file, 'utf-8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
  const publish = (JSON.parse(raw) as { publish?: unknown }).publish;
  return publish && typeof publish === 'object' ? (publish as Record<string, unknown>) : null;
}

/** Replace the `publish` block, keeping every other field of fli.brand.json (read-modify-write). */
export async function writeManagedPublish(file: string, publish: unknown): Promise<void> {
  const current = JSON.parse(await fs.readFile(file, 'utf-8')) as Record<string, unknown>;
  await fs.writeFile(file, `${JSON.stringify({ ...current, publish }, null, 2)}\n`, 'utf-8');
}
