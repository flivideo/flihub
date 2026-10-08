// CT-0107 R1: the inbox "Lands as" control — next (today), replace NN-S, insert before NN-S. The server numbers.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { FileInfo } from '../../../shared/types';
import {
  describeLanding,
  landingOptions,
  parseLandsAs,
  segmentsInChapter,
} from '../utils/segmentLanding';

const rename = vi.fn();
const segmentOp = vi.fn();
const recordings = ['06-1-hook.mov', '06-2-demo.mov', '07-1-other.mov', '06-2-dupe.mov'].map(
  (filename) => ({
    filename,
  })
);
vi.mock('../hooks/useApi', () => ({
  useRecordings: () => ({ data: { recordings } }),
  useRename: () => ({ mutateAsync: rename, isPending: false }),
  useTrashFile: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock('../hooks/useSegmentsApi', () => ({
  useSegmentOp: () => ({ mutateAsync: segmentOp, isPending: false }),
}));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock('sonner', () => ({ toast }));

import { FileCard } from '../components/FileCard';

const file: FileInfo = {
  path: '/ecamm/Take 7.mov',
  filename: 'Take 7.mov',
  timestamp: '',
  size: 1,
};
const naming = { chapter: '06', sequence: '3', name: 'bridge', tags: [], customTag: '' };

beforeEach(() => {
  rename.mockReset();
  segmentOp.mockReset();
  Object.values(toast).forEach((t) => t.mockReset());
});

describe('Feature: the choices for where a take lands', () => {
  it('Scenario: given a chapter on disk, when the options are listed, then next comes first, then replace and insert for each segment once', () => {
    const names = recordings.map((r) => r.filename);
    expect(segmentsInChapter(names, '06')).toEqual([1, 2]);
    expect(landingOptions(names, '06', '3').map((o) => o.label)).toEqual([
      'next (06-3)',
      'replace 06-1',
      'replace 06-2',
      'insert before 06-1',
      'insert before 06-2',
    ]);
    expect(landingOptions([], '09', '1').map((o) => o.value)).toEqual(['next']);
  });

  it('Scenario: given a select value, when parsed, then anything unknown falls back to next', () => {
    expect(parseLandsAs('replace:2')).toEqual({ mode: 'replace', segment: 2 });
    expect(parseLandsAs('insert:1')).toEqual({ mode: 'insert', segment: 1 });
    for (const v of ['next', 'replace:0', 'insert:x', 'bogus'])
      expect(parseLandsAs(v)).toEqual({ mode: 'next' });
    expect(describeLanding({ mode: 'replace', segment: 1 }, '06', 'x')).toContain(
      'goes to the trash'
    );
    expect(describeLanding({ mode: 'insert', segment: 2 }, '06', 'x')).toContain('move up one');
    expect(describeLanding({ mode: 'next' }, '06', '06-3-bridge.mov')).toBe('06-3-bridge.mov');
  });
});

describe('Feature: the inbox card sends the take where it was asked to land', () => {
  it('Scenario: given Lands as = next, when Rename is pressed, then today’s rename runs unchanged', async () => {
    rename.mockResolvedValue({ success: true, newPath: '/p/06-3-bridge.mov' });
    const onRenamed = vi.fn();
    render(
      <FileCard file={file} namingState={naming} onRenamed={onRenamed} onDiscarded={vi.fn()} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Rename' }));
    await waitFor(() => expect(onRenamed).toHaveBeenCalled());
    expect(rename).toHaveBeenCalledWith(
      expect.objectContaining({ originalPath: file.path, chapter: '06', sequence: '3' })
    );
    expect(segmentOp).not.toHaveBeenCalled();
  });

  it('Scenario: given Lands as = replace 06-1, when Replace is pressed, then the segment op replaces 06-1 with this take', async () => {
    segmentOp.mockResolvedValue({
      success: true,
      op: { id: 'seg_1', summary: 'replaced 06-1-hook.mov', promoted: '06-1-bridge.mov' },
    });
    const onRenamed = vi.fn();
    render(
      <FileCard file={file} namingState={naming} onRenamed={onRenamed} onDiscarded={vi.fn()} />
    );
    fireEvent.change(screen.getByTestId('filecard-lands-as'), { target: { value: 'replace:1' } });
    expect(screen.getByTestId('filecard-landing').textContent).toContain('06-1 goes to the trash');
    fireEvent.click(screen.getByRole('button', { name: 'Replace' }));
    await waitFor(() => expect(onRenamed).toHaveBeenCalled());
    expect(segmentOp).toHaveBeenCalledWith({
      mode: 'replace',
      chapter: '06',
      segment: 1,
      source: file.path,
      name: 'bridge',
      tags: [],
    });
    expect(rename).not.toHaveBeenCalled();
  });

  it('Scenario: given Lands as = insert before 06-2 and the server refuses, when Insert is pressed, then the reason is shown and the take stays in the inbox', async () => {
    segmentOp.mockResolvedValue({
      success: false,
      refused: true,
      reason: '06-2-demo.mov is used by fli.cut.tour.json.',
    });
    const onRenamed = vi.fn();
    render(
      <FileCard file={file} namingState={naming} onRenamed={onRenamed} onDiscarded={vi.fn()} />
    );
    fireEvent.change(screen.getByTestId('filecard-lands-as'), { target: { value: 'insert:2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Insert' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(toast.error.mock.calls[0][0]).toContain(
      'Not done — 06-2-demo.mov is used by fli.cut.tour.json.'
    );
    expect(segmentOp).toHaveBeenCalledWith(expect.objectContaining({ mode: 'insert', before: 2 }));
    expect(onRenamed).not.toHaveBeenCalled();
  });
});
