import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { readTranscriptHealth, readTranscriptInfo } from '../utils/transcriptFiles.js';

describe('readTranscriptHealth', () => {
  let dir: string;
  const write = (doc: unknown) => {
    const p = path.join(dir, 'take.json');
    fs.writeFileSync(p, typeof doc === 'string' ? doc : JSON.stringify(doc));
    return p;
  };

  beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'th-')); });
  afterEach(() => fs.removeSync(dir));

  it('reads health from flitools.transcript/1', () => {
    expect(readTranscriptHealth(write({ schema: 'flitools.transcript/1', health: { suspect: true, reasons: ['loop'] } })))
      .toEqual({ suspect: true, reasons: ['loop'] });
  });

  it('reads health from a later version (flitools.transcript/2)', () => {
    expect(readTranscriptHealth(write({ schema: 'flitools.transcript/2', health: { suspect: false } })))
      .toEqual({ suspect: false, reasons: [] });
  });

  it('returns null for old whisper output, other schemas, missing health or bad JSON', () => {
    expect(readTranscriptHealth(write({ text: 'x', segments: [] }))).toBeNull();
    expect(readTranscriptHealth(write({ schema: 'flitools.transcriptx/2', health: { suspect: true } }))).toBeNull();
    expect(readTranscriptHealth(write({ schema: 'flitools.transcript/2' }))).toBeNull();
    expect(readTranscriptHealth(write('{not json'))).toBeNull();
  });
});

describe('readTranscriptInfo: what the redo control needs (D10 2026-10-12)', () => {
  let dir: string;
  const write = (doc: unknown) => {
    const p = path.join(dir, 'take.json');
    fs.writeFileSync(p, JSON.stringify(doc));
    return p;
  };
  beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ti-')); });
  afterEach(() => fs.removeSync(dir));

  it('carries the time-order fault and the chunk-overlap repair from FliTools', () => {
    const info = readTranscriptInfo(write({
      schema: 'flitools.transcript/2', pass: 2, verbatim: true, createdAt: '2026-10-12T07:34:00.846Z', engine: { name: 'crisperwhisper' },
      health: { suspect: false, reasons: [], lines: 9, overlapRepaired: [{ start: 41.7, end: 49.5, words: 29, text: 'x' }] },
    }));
    expect(info).toEqual({
      health: { suspect: false, reasons: [], overlapRepaired: [{ start: 41.7, end: 49.5, words: 29, text: 'x' }] },
      pass: 2, engine: 'crisperwhisper', createdAt: '2026-10-12T07:34:00.846Z',
    });
  });

  it('a fast (Whisper) transcript is pass 1', () => {
    expect(readTranscriptInfo(write({ schema: 'flitools.transcript/2', engine: { name: 'groq' }, health: { suspect: true, reasons: ['text repeated: transcriber duplicated 40–50s (9 words go back in time)'], wordsBackInTime: [{ start: 40, end: 50, words: 9 }] } })))
      .toMatchObject({ pass: 1, engine: 'groq', health: { suspect: true, wordsBackInTime: [{ start: 40, end: 50, words: 9 }] } });
  });
});
