import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { readTranscriptHealth } from '../utils/transcriptFiles.js';

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
