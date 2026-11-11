// Recording sets: the strip, All sets overview and New set, driven through the real components against the
// real /api/sets router on TEMP projects (never a real one). Assertions are on the screen AND the disk.
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import express from 'express';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import type { AddressInfo } from 'net';
import type { Server } from 'http';
import type { Config } from '../../../shared/types';
import { activeSetSync } from '../../../shared/paths';
import { createSetRoutes } from '../../../server/src/routes/sets';

const api = vi.hoisted(() => ({ url: '', project: '' }));
vi.mock('../config', () => ({
  get API_URL() {
    return api.url;
  },
}));
vi.mock('../hooks/useConfigApi', () => ({
  useConfig: () => ({ data: { projectDirectory: api.project } }),
}));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock('sonner', () => ({ toast }));

import { AllSetsOverview, NewSetDisabled, NOT_A_SET_PROJECT, SetStrip } from '../components/RecordingSets';

let root: string;
let legacy: string;
let sets: string;
let server: Server;

beforeAll(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'sets-ui-'));
  const app = express();
  app.use(express.json());
  app.use('/api/sets', createSetRoutes(() => ({ projectDirectory: api.project }) as Config, { emit: () => true } as never, () => undefined));
  server = app.listen(0);
  api.url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(async () => {
  server.close();
  await fs.remove(root);
});

beforeEach(async () => {
  await fs.emptyDir(root);
  legacy = path.join(root, 'p01-legacy');
  await fs.outputFile(path.join(legacy, 'recordings', '01-1-intro.mov'), 'x');
  sets = path.join(root, 'p02-sets');
  await fs.outputJson(path.join(sets, 'hub', 'sets.json'), {
    sets: [
      { id: 'demo', title: 'Demo', role: 'part' },
      { id: 'story', title: 'Story', role: 'video' },
    ],
  });
  await fs.outputFile(path.join(sets, 'hub', 'sets', 'demo', 'recordings', '01-1-intro.mov'), 'a');
  await fs.outputFile(path.join(sets, 'hub', 'sets', 'story', 'recordings', '01-1-intro.mp4'), 'b');
});

function wrap(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('a project without sets', () => {
  it('shows no strip, and New set disabled with the FliStudio line', async () => {
    api.project = legacy;
    wrap(
      <>
        <SetStrip showAll={false} onShowAll={() => undefined} />
        <NewSetDisabled />
      </>
    );
    expect(await screen.findByText(NOT_A_SET_PROJECT)).toBeTruthy();
    expect((screen.getByRole('button', { name: '+ New set' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByTestId('set-strip')).toBeNull();
    expect(fs.existsSync(path.join(legacy, 'hub'))).toBe(false);
  });
});

describe('a project with two sets', () => {
  beforeEach(() => {
    api.project = sets;
  });

  it('shows All sets and one pill per set; clicking a set makes it active on disk', async () => {
    const onShowAll = vi.fn();
    wrap(<SetStrip showAll={false} onShowAll={onShowAll} />);
    const strip = await screen.findByTestId('set-strip');
    expect(within(strip).getByText(/All sets/)).toBeTruthy();
    expect(within(strip).getByText('Demo')).toBeTruthy();
    expect(within(strip).getByText('Story')).toBeTruthy();
    fireEvent.click(within(strip).getByText('Story'));
    await waitFor(() => expect(activeSetSync(sets)).toBe('story'));
    fireEvent.click(within(strip).getByText(/All sets/));
    expect(onShowAll).toHaveBeenLastCalledWith(true);
  });

  it('New set creates the set folder', async () => {
    wrap(<SetStrip showAll={false} onShowAll={() => undefined} />);
    fireEvent.click(await screen.findByText('+ New set'));
    fireEvent.change(screen.getByPlaceholderText('Set name'), { target: { value: 'Outro Bit' } });
    fireEvent.click(screen.getByText('Create'));
    await waitFor(() => expect(fs.existsSync(path.join(sets, 'hub', 'sets', 'outro-bit', 'recordings'))).toBe(true));
    expect((await fs.readJson(path.join(sets, 'hub', 'sets.json'))).sets.map((s: { id: string }) => s.id)).toEqual([
      'demo',
      'story',
      'outro-bit',
    ]);
  });

  it('All sets lists one row per set with takes and role', async () => {
    wrap(<AllSetsOverview onOpen={() => undefined} />);
    const table = await screen.findByTestId('all-sets');
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText('Demo')).toBeTruthy();
    expect(within(rows[0]).getByText('Part of final')).toBeTruthy();
    expect(within(rows[1]).getByText('Own video')).toBeTruthy();
  });
});
