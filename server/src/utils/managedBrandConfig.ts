/**
 * The managed home of AppyDave's publishing settings (2026-10-06,
 * /Users/davidcruwys/dev/ad/flivideo/docs/youtube-channel-architecture.md §2): the `publish` block of the brand's
 * `fli.brand.json`, git-tracked in the brand repo. It holds brand-config.json's exact shape, copied verbatim, so the
 * mapper below reads it unchanged. The bundled `server/brand-config.json` stays only as the fallback.
 */
import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import {
  brandSettingsVersion,
  readBrands,
  readMachineSettings,
  resolveBrandRoot,
  updateBrandSettings,
} from '@flivideo/core';

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

/** The file's version (fli-core `brandSettingsVersion`: sha256 of its bytes), or `null` when absent. */
export function managedPublishVersion(file: string): Promise<string | null> {
  return brandSettingsVersion(file);
}

/**
 * The file changed since the caller loaded `expected` (W8, 2026-10-29: a Save from a stale Config panel wiped
 * FliStudio's publish change). Nothing was written; the person reloads and saves again.
 */
export class ChangedElsewhereError extends Error {
  readonly code = 'changed-elsewhere';
  constructor(
    readonly file: string,
    readonly expected: string,
    readonly current: string | null
  ) {
    super(`${file} changed in another app since it was loaded; reload and save again.`);
  }
}

/** fli-core refused the write (`busy`, `unusable-file`, `invalid-input`, `io-error`). Nothing was written. */
export class BrandWriteRefusedError extends Error {
  constructor(
    readonly reason: string,
    message: string
  ) {
    super(message);
  }
}

/**
 * Replace the `publish` block, keeping every other field of fli.brand.json. Goes through fli-core's
 * `updateBrandSettings`: under `fli.brand.json.lock` (shared with FliStudio) the file is re-read and the block replaced
 * in what is on disk NOW, then written atomically. With `expectedVersion` (the version the caller loaded), a file that
 * changed since is refused with `ChangedElsewhereError` and left untouched. Answers the new version.
 */
export async function writeManagedPublish(
  file: string,
  publish: unknown,
  expectedVersion?: string
): Promise<string> {
  const result = await updateBrandSettings(path.dirname(file), async (current) => {
    if (current === null) {
      throw Object.assign(new Error(`ENOENT: no such file, ${file}`), { code: 'ENOENT' });
    }
    if (expectedVersion !== undefined) {
      const now = await brandSettingsVersion(file);
      if (now !== expectedVersion) throw new ChangedElsewhereError(file, expectedVersion, now);
    }
    return { ...current, publish: publish as typeof current.publish };
  });
  if (result.kind === 'refused') throw new BrandWriteRefusedError(result.reason, result.message);
  return result.version;
}
