// D07-UAT-1 (CT-0107 R5): the Recordings Delete button closes up the chapter, journals the change, and Undo reverts
// THIS delete. Driven through the real row, dialog and Undo button against the real segment router on a TEMP project
// (never a real one); every assertion is on the disk, not on a mocked response.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import express from 'express';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import type { AddressInfo } from 'net';
import type { Server } from 'http';
import type { Config, RecordingFile } from '../../../shared/types';
import { getProjectPaths, type ProjectPaths } from '../../../shared/paths';
import { createSegmentRoutes } from '../../../server/src/routes/segments';

const api = vi.hoisted(() => ({ url: '' }));
vi.mock('../config', () => ({
  get API_URL() {
    return api.url;
  },
}));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock('sonner', () => ({ toast }));
// FR-156's plain trash must not be the path a unique segment takes.
const fr156 = vi.hoisted(() => ({ preview: vi.fn(), trash: vi.fn() }));
vi.mock('../hooks/useRecordingsApi', () => ({
  usePreviewTrashRecordings: () => ({ mutate: fr156.preview }),
  useTrashRecordings: () => ({ mutate: fr156.trash }),
}));

import { EditableFileRow } from '../components/shared/EditableFileRow';
import {
  SegmentUndoButton,
  closeUpTarget,
  useRecordingDelete,
} from '../components/shared/RecordingDelete';

let root: string;
let project: string;
let paths: ProjectPaths;
let server: Server;
const JOURNAL = '.flihub-segment-journal.json';

beforeAll(async () => {
  const config = () =>
    ({ projectDirectory: project, watchDirectory: path.join(root, 'ecamm') }) as Config;
  const app = express();
  app.use(express.json());
  app.use('/api/segments', createSegmentRoutes(config));
  server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  api.url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'flihub-delete-ui-'));
  project = path.join(root, 'd99-delete-test');
  await fs.ensureDir(path.join(project, 'hub', 'recordings'));
  paths = getProjectPaths(project);
  toast.success.mockReset();
  toast.error.mockReset();
  fr156.preview.mockReset();
  fr156.trash.mockReset();
});
afterEach(async () => {
  await fs.remove(root);
});

/** A take and its transcript, each holding its own original name, so a renumber can be traced to the take. */
async function take(filename: string) {
  await fs.outputFile(path.join(paths.recordings, filename), filename);
  await fs.outputFile(path.join(paths.transcripts, filename.replace(/\.mov$/, '.srt')), filename);
}

const recordings = async () => (await fs.readdir(paths.recordings)).sort();
const content = (file: string) => fs.readFile(path.join(paths.recordings, file), 'utf8');
const journal = async () =>
  (await fs.readJson(path.join(project, JOURNAL)).catch(() => ({ entries: [] }))) as {
    entries: Array<{ op: { mode: string }; undoneAt?: string }>;
  };

const row = (filename: string): RecordingFile => {
  const [chapter, sequence, ...rest] = filename.replace(/\.mov$/, '').split('-');
  return {
    filename,
    path: path.join(paths.recordings, filename),
    size: 1,
    timestamp: '',
    chapter,
    sequence,
    name: rest.join('-'),
    tags: [],
    folder: 'recordings',
    isSafe: false,
    isParked: false,
  };
};

/** The Recordings page's delete wiring: the real row, the real dialog, the real Undo button. */
function Page({ filenames }: { filenames: string[] }) {
  const recordingDelete = useRecordingDelete();
  const noop = () => {};
  return (
    <>
      <SegmentUndoButton />
      {filenames.map((f) => (
        <div key={f} data-testid={`row-${f}`}>
          <EditableFileRow
            recording={row(f)}
            isSelected={false}
            onToggleSelect={noop}
            onInlineRename={noop}
            onTagRemove={noop}
            onPlay={noop}
            onSplitHere={noop}
            onPark={noop}
            onSafe={noop}
            onRestore={noop}
            onUnpark={noop}
            onDelete={(filename) => recordingDelete.requestDelete(filename, filenames)}
            formatDuration={() => ''}
            formatFileSize={() => ''}
            formatTimestamp={() => ''}
          />
        </div>
      ))}
      {recordingDelete.dialog}
    </>
  );
}

function renderPage(filenames: string[]) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <Page filenames={filenames} />
    </QueryClientProvider>
  );
}

const FOUR = ['02-1-hook.mov', '02-2-demo.mov', '02-3-demo.mov', '02-4-wrap.mov'];

describe('Feature: Delete on a recording closes up the chapter (D07-UAT-1, R5)', () => {
  it('Scenario: given 02-1..02-4, when 02-2 is deleted from its row and confirmed, then the chapter is 02-1, 02-2, 02-3 with no gap, one journal entry, and Undo restores the original four', async () => {
    for (const f of FOUR) await take(f);
    renderPage(FOUR);

    fireEvent.click(within(screen.getByTestId('row-02-2-demo.mov')).getByText('Delete'));

    // The dialog says what will happen BEFORE anything moves.
    expect(await screen.findByText('Delete 02-2 and close up?')).toBeInTheDocument();
    expect(screen.getByText(/02-3-demo\.mov → 02-2-demo\.mov/)).toBeInTheDocument();
    expect(screen.getByText(/02-4-wrap\.mov → 02-3-wrap\.mov/)).toBeInTheDocument();
    expect(await recordings()).toEqual(FOUR);
    expect((await journal()).entries).toHaveLength(0);

    fireEvent.click(screen.getByText('Delete and close up'));

    await waitFor(async () =>
      expect(await recordings()).toEqual(['02-1-hook.mov', '02-2-demo.mov', '02-3-wrap.mov'])
    );
    // The take now at 02-2 is the old 02-3, its transcript followed, and the deleted take is in -trash/.
    expect(await content('02-2-demo.mov')).toBe('02-3-demo.mov');
    expect(await content('02-3-wrap.mov')).toBe('02-4-wrap.mov');
    expect(await fs.readFile(path.join(paths.transcripts, '02-2-demo.srt'), 'utf8')).toBe(
      '02-3-demo.mov'
    );
    expect(await fs.readFile(path.join(paths.trash, '02-2-demo.mov'), 'utf8')).toBe(
      '02-2-demo.mov'
    );
    const entries = (await journal()).entries;
    expect(entries).toHaveLength(1);
    expect(entries[0].op.mode).toBe('delete');
    expect(fr156.trash).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('Deleted 02-2-demo.mov'))
    );

    fireEvent.click(screen.getByText('↶ Undo segment change'));

    await waitFor(async () => expect(await recordings()).toEqual(FOUR));
    for (const f of FOUR) expect(await content(f)).toBe(f);
    expect(await fs.readFile(path.join(paths.transcripts, '02-2-demo.srt'), 'utf8')).toBe(
      '02-2-demo.mov'
    );
    const after = (await journal()).entries;
    expect(after).toHaveLength(1);
    expect(after[0].undoneAt).toBeTruthy();
  });

  it('Scenario: given an older segment change, when a take is deleted and Undo is pressed, then Undo reverts the delete, not the older change', async () => {
    for (const f of ['02-1-a.mov', '02-2-b.mov', '02-3-c.mov']) await take(f);
    // An older change: move 02-3 up (02-2 ⇄ 02-3), straight through the API.
    const moved = await fetch(`${api.url}/api/segments/op`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'reorder', chapter: '02', segment: 3, direction: 'up' }),
    });
    expect(moved.status).toBe(200);
    const afterMove = await recordings();
    expect(afterMove).toEqual(['02-1-a.mov', '02-2-c.mov', '02-3-b.mov']);
    renderPage(afterMove);

    fireEvent.click(within(screen.getByTestId('row-02-1-a.mov')).getByText('Delete'));
    fireEvent.click(await screen.findByText('Delete and close up'));
    await waitFor(async () => expect(await recordings()).toEqual(['02-1-c.mov', '02-2-b.mov']));

    fireEvent.click(screen.getByText('↶ Undo segment change'));

    await waitFor(async () => expect(await recordings()).toEqual(afterMove));
    const entries = (await journal()).entries;
    expect(entries.map((e) => [e.op.mode, Boolean(e.undoneAt)])).toEqual([
      ['reorder', false],
      ['delete', true],
    ]);
  });

  it('Scenario: given a later segment is referenced by a FliCut cut, when Delete is pressed, then the refusal is shown and nothing on disk changes', async () => {
    for (const f of ['02-1-a.mov', '02-2-b.mov', '02-3-c.mov']) await take(f);
    await fs.writeJson(path.join(project, 'fli.cut.main.json'), {
      clips: [{ source: path.join(paths.recordings, '02-3-c.mov') }],
    });
    renderPage(['02-1-a.mov', '02-2-b.mov', '02-3-c.mov']);

    fireEvent.click(within(screen.getByTestId('row-02-2-b.mov')).getByText('Delete'));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/^Not done — .*02-3-c\.mov/))
    );
    expect(screen.queryByText('Delete and close up')).not.toBeInTheDocument();
    expect(await recordings()).toEqual(['02-1-a.mov', '02-2-b.mov', '02-3-c.mov']);
    expect((await journal()).entries).toHaveLength(0);
  });

  it('Scenario: given two takes share 02-2, when one is deleted, then FR-156 trash is used (nothing to close up)', async () => {
    const names = ['02-1-a.mov', '02-2-b.mov', '02-2-b2.mov', '02-3-c.mov'];
    for (const f of names) await take(f);
    renderPage(names);

    fireEvent.click(within(screen.getByTestId('row-02-2-b2.mov')).getByText('Delete'));

    await waitFor(() =>
      expect(fr156.preview).toHaveBeenCalledWith(['02-2-b2.mov'], expect.anything())
    );
    expect(await recordings()).toEqual(names.slice().sort());
  });
});

describe('Feature: which takes close up when deleted (D07-UAT-1)', () => {
  it('Scenario: a take alone at its number closes up; a shared number or a non-segment name does not', () => {
    const all = ['02-1-a.mov', '02-2-b.mov', '02-2-c.mov', '02-10-d.mov', 'notes.mov'];
    expect(closeUpTarget('02-1-a.mov', all)).toEqual({ chapter: '02', segment: 1 });
    expect(closeUpTarget('02-10-d.mov', all)).toEqual({ chapter: '02', segment: 10 });
    expect(closeUpTarget('02-2-b.mov', all)).toBeNull();
    expect(closeUpTarget('notes.mov', all)).toBeNull();
  });
});
