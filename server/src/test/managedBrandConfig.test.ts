// The managed home of the brand config: AppyDave's fli.brand.json `publish` block (2026-10-06). Real files in a temp
// home, never the live one.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import os from 'os';
import path from 'path';
import { promises as fs } from 'fs';
import { updateBrandSettings } from '@flivideo/core';
import {
  ChangedElsewhereError,
  managedBrandConfigFile,
  managedPublishVersion,
  readManagedPublish,
  writeManagedPublish,
} from '../utils/managedBrandConfig.js';

let home: string;
const root = () => path.join(home, 'dev', 'video-projects', 'v-appydave');

beforeEach(async () => {
  home = await fs.mkdtemp(path.join(os.tmpdir(), 'flihub-brand-'));
  await fs.mkdir(path.join(home, '.config', 'appydave'), { recursive: true });
  await fs.mkdir(root(), { recursive: true });
  await fs.writeFile(
    path.join(home, '.config', 'appydave', 'brands.json'),
    JSON.stringify({ brands: { appydave: { name: 'AppyDave', locations: { video_projects: root() } } } })
  );
});
afterEach(() => fs.rm(home, { recursive: true, force: true }));

describe('managedBrandConfigFile', () => {
  it('places AppyDave’s fli.brand.json through the brand registry', async () => {
    expect(await managedBrandConfigFile(home)).toBe(path.join(root(), 'fli.brand.json'));
  });

  it('is null without a registry or without the brand', async () => {
    await fs.writeFile(path.join(home, '.config', 'appydave', 'brands.json'), JSON.stringify({ brands: {} }));
    expect(await managedBrandConfigFile(home)).toBeNull();
    await fs.rm(path.join(home, '.config'), { recursive: true });
    expect(await managedBrandConfigFile(home)).toBeNull();
  });
});

describe('readManagedPublish / writeManagedPublish', () => {
  it('reads the publish block, and a write replaces only that block', async () => {
    const file = path.join(root(), 'fli.brand.json');
    expect(await readManagedPublish(file)).toBeNull();
    await fs.writeFile(file, JSON.stringify({ schema: 1, brand: 'appydave', colour: '#ffde59', youtube: { activePlaylists: ['PLa'] } }));
    expect(await readManagedPublish(file)).toBeNull();
    await writeManagedPublish(file, { ctas: { foldCta: { label: 'Skool', url: 'https://skool.com/x' } } });
    expect(await readManagedPublish(file)).toEqual({ ctas: { foldCta: { label: 'Skool', url: 'https://skool.com/x' } } });
    const whole = JSON.parse(await fs.readFile(file, 'utf8'));
    expect(whole).toMatchObject({ schema: 1, colour: '#ffde59', youtube: { activePlaylists: ['PLa'] } });
  });

  it('throws on a corrupt file', async () => {
    const file = path.join(root(), 'fli.brand.json');
    await fs.writeFile(file, '{ broken');
    await expect(readManagedPublish(file)).rejects.toThrow(SyntaxError);
  });
});

// W8 (2026-10-29): FliHub and FliStudio both write fli.brand.json; neither may lose the other's change.
describe('writeManagedPublish — locked and versioned (W8)', () => {
  const file = () => path.join(root(), 'fli.brand.json');
  const seed = () =>
    fs.writeFile(
      file(),
      JSON.stringify({ schema: 1, brand: 'appydave', colour: '#ffde59', publish: { ctas: { foldCta: { label: 'Skool', url: 'https://s' } } } })
    );

  it('a stale version is refused with changed-elsewhere and the file is untouched', async () => {
    await seed();
    const loaded = await managedPublishVersion(file());
    // FliStudio changes the file after FliHub's panel loaded it.
    await writeManagedPublish(file(), { ctas: { foldCta: { label: 'STUDIO', url: 'https://s' } } });
    const before = await fs.readFile(file(), 'utf8');
    await expect(
      writeManagedPublish(file(), { ctas: { foldCta: { label: 'HUB', url: 'https://h' } } }, loaded as string)
    ).rejects.toMatchObject({ code: 'changed-elsewhere' });
    await expect(writeManagedPublish(file(), {}, loaded as string)).rejects.toBeInstanceOf(ChangedElsewhereError);
    expect(await fs.readFile(file(), 'utf8')).toBe(before);
  });

  it('the current version is accepted and the new version is answered', async () => {
    await seed();
    const loaded = (await managedPublishVersion(file())) as string;
    const next = await writeManagedPublish(file(), { ctas: { foldCta: { label: 'HUB', url: 'https://h' } } }, loaded);
    expect(next).toBe(await managedPublishVersion(file()));
    expect(next).not.toBe(loaded);
    expect(await readManagedPublish(file())).toEqual({ ctas: { foldCta: { label: 'HUB', url: 'https://h' } } });
  });

  it('writes under fli-core’s lock: a concurrent youtube write and a publish write both survive', async () => {
    await seed();
    await Promise.all([
      updateBrandSettings(root(), async (current) => {
        await new Promise((r) => setTimeout(r, 30));
        return { ...current!, youtube: { activePlaylists: ['PL-STUDIO'], defaultPlaylists: [] } };
      }),
      writeManagedPublish(file(), { ctas: { foldCta: { label: 'HUB', url: 'https://h' } } }),
    ]);
    const whole = JSON.parse(await fs.readFile(file(), 'utf8'));
    expect(whole.youtube.activePlaylists).toEqual(['PL-STUDIO']);
    expect(whole.publish.ctas.foldCta.label).toBe('HUB');
    expect(await fs.readdir(root())).toEqual(['fli.brand.json']);
  });

  it('a missing file throws ENOENT (as before) and creates nothing', async () => {
    await expect(writeManagedPublish(file(), {})).rejects.toMatchObject({ code: 'ENOENT' });
    expect(await fs.readdir(root())).toEqual([]);
  });

  it('a publish block fli-core rejects is refused, nothing written', async () => {
    await seed();
    const before = await fs.readFile(file(), 'utf8');
    await expect(writeManagedPublish(file(), { ctas: { x: { label: 1 } } })).rejects.toMatchObject({
      reason: 'invalid-input',
    });
    expect(await fs.readFile(file(), 'utf8')).toBe(before);
  });
});
