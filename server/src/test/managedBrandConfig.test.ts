// The managed home of the brand config: AppyDave's fli.brand.json `publish` block (2026-10-06). Real files in a temp
// home, never the live one.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import os from 'os';
import path from 'path';
import { promises as fs } from 'fs';
import {
  managedBrandConfigFile,
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
