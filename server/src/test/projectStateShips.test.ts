/**
 * FR-168 — render grain (`ships`) round-trip, defaulting and sparseness.
 *
 * ⚠️ T1/T2 EXIST BECAUSE `writeProjectState` IS AN ALLOWLIST, NOT A SPREAD.
 * It rebuilds the object field by field (projectState.ts), so a field added to ProjectState
 * but not added there is dropped on write with NO error and NO warning — the read simply
 * returns a value that was never persisted. This already happened once, to FR-157.
 * If you add a field to ProjectState, add a test here too.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import os from 'os';
import path from 'path';
import { promises as fs } from 'fs';
import {
  readProjectState,
  writeProjectState,
  createEmptyState,
  resolveShips,
  setProjectShips,
} from '../utils/projectState.js';
import type { ProjectState } from '../../../shared/types.js';

let tmp: string;

beforeEach(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'flihub-ships-'));
});
afterEach(async () => {
  await fs.rm(tmp, { recursive: true, force: true });
});

const stateFile = () => path.join(tmp, '.flihub-state.json');
const rawFile = async () => JSON.parse(await fs.readFile(stateFile(), 'utf-8'));

describe('FR-168 ships — allowlist round-trip (T1/T2, mandatory)', () => {
  it('T1: write ships:per-chapter -> read back preserves it', async () => {
    await writeProjectState(tmp, setProjectShips(createEmptyState(), 'per-chapter'));
    const read = await readProjectState(tmp);
    expect(read.ships).toBe('per-chapter');
  });

  it('T2: ships survives ALONGSIDE every other allowlisted field', async () => {
    // T1 alone would still pass if someone added `ships` but broke a sibling; this asserts
    // the whole object survives one write, which is what the allowlist actually governs.
    const full: ProjectState = {
      version: 1,
      recordings: { '01-1-intro.mov': { safe: true, parked: false } },
      title: 'Agents That Actually Hold Together',
      chapters: { '01': { title: 'Deliverable one' }, '02': { title: 'Deliverable two' } },
      glingDictionary: ['Kybernesis', 'FliHub'],
      ships: 'per-chapter',
    };
    await writeProjectState(tmp, full);
    const read = await readProjectState(tmp);
    expect(read.ships).toBe('per-chapter');
    expect(read.title).toBe('Agents That Actually Hold Together');
    expect(read.chapters?.['02']?.title).toBe('Deliverable two');
    expect(read.glingDictionary).toEqual(['Kybernesis', 'FliHub']);
    expect(read.recordings['01-1-intro.mov']?.safe).toBe(true);
  });
});

describe('FR-168 ships — sparse storage', () => {
  it('T3: the default is NOT written to disk', async () => {
    await writeProjectState(tmp, setProjectShips(createEmptyState(), 'per-project'));
    expect(Object.keys(await rawFile())).not.toContain('ships');
  });

  it('setting per-chapter then back to per-project CLEARS the key', async () => {
    await writeProjectState(tmp, setProjectShips(createEmptyState(), 'per-chapter'));
    expect(await rawFile()).toHaveProperty('ships', 'per-chapter');

    const back = setProjectShips(await readProjectState(tmp), 'per-project');
    await writeProjectState(tmp, back);
    expect(Object.keys(await rawFile())).not.toContain('ships');
    expect(resolveShips(await readProjectState(tmp)).ships).toBe('per-project');
  });
});

describe('FR-168 ships — resolution never fails and never writes', () => {
  it('T4: no state file at all -> resolves to the default and creates NOTHING', async () => {
    // The common case: most projects have never been written to. Joy's a01 is exactly this.
    const read = await readProjectState(tmp);
    expect(resolveShips(read)).toEqual({ ships: 'per-project', declared: false });
    await expect(fs.access(stateFile())).rejects.toThrow(); // reading must not create it
  });

  it('T5: a hand-edited garbage value falls back to the default, does not propagate', async () => {
    await fs.writeFile(
      stateFile(),
      JSON.stringify({ version: 1, recordings: {}, ships: 'weekly' }),
      'utf-8'
    );
    const resolved = resolveShips(await readProjectState(tmp));
    expect(resolved.ships).toBe('per-project');
    expect(resolved.declared).toBe(false); // garbage is not a declaration
  });

  it('T6: shipsDeclared distinguishes "never declared" from "declared as the default"', async () => {
    expect(resolveShips(createEmptyState()).declared).toBe(false);
    expect(resolveShips({ version: 1, recordings: {}, ships: 'per-chapter' }).declared).toBe(true);
    // An explicit per-project declaration is indistinguishable from absence BY DESIGN —
    // that is the price of sparse storage, and it is the right trade: the alternative was
    // writing a state file into every project on disk to record the value they already have.
    expect(resolveShips({ version: 1, recordings: {}, ships: 'per-project' }).declared).toBe(true);
  });

  it('resolution is pure — it never mutates the state it is given', async () => {
    const state = createEmptyState();
    const snapshot = JSON.stringify(state);
    resolveShips(state);
    expect(JSON.stringify(state)).toBe(snapshot);
  });
});
