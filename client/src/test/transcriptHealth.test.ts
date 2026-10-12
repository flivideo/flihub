import { describe, it, expect } from 'vitest';
import { transcriptBadge, highQualityLanded, transcriptQuality } from '../utils/transcriptHealth';

describe('transcriptBadge (B584)', () => {
  it('suspect → a warning badge that names the reasons', () => {
    const b = transcriptBadge({ suspect: true, reasons: ['repeated line x12', 'segment past media end'] });
    expect(b.suspect).toBe(true);
    expect(b.label).toBe('T⚠');
    expect(b.className).toContain('text-red-700');
    expect(b.title).toContain('repeated line x12; segment past media end');
  });
  it('clean or unknown (old whisper output) → the plain green T', () => {
    expect(transcriptBadge({ suspect: false, reasons: [] })).toMatchObject({ suspect: false, label: 'T', title: 'View transcript' });
    expect(transcriptBadge(undefined).label).toBe('T');
  });
});

describe('words that go back in time, and the repair FliTools made (D10 2026-10-12)', () => {
  it('a duplicated stretch is a red T⚠ with the plain reason', () => {
    const b = transcriptBadge({ suspect: true, reasons: ['text repeated: transcriber duplicated 41.7–49.5s (29 words go back in time)'] });
    expect(b.label).toBe('T⚠');
    expect(b.className).toContain('text-red-700');
    expect(b.title).toContain('text repeated: transcriber duplicated 41.7–49.5s');
  });
  it('a repair already made stays visible: amber T⚠, not suspect, says what was dropped', () => {
    const b = transcriptBadge({ suspect: false, reasons: [], overlapRepaired: [{ start: 41.66, end: 49.5, words: 29, text: 'x' }] });
    expect(b.suspect).toBe(false);
    expect(b.label).toBe('T⚠');
    expect(b.className).toContain('text-amber-700');
    expect(b.title).toContain('repaired automatically: transcriber duplicated 41.7–49.5s; the 29 repeated words were dropped');
  });
});

describe('redo transcript: when the high-quality pass has landed', () => {
  it('pending → pass 2 on disk is the moment to say so', () => {
    expect(highQualityLanded({ status: 'complete', pass: 1, pass2Pending: true }, { status: 'complete', pass: 2, pass2Pending: false })).toBe(true);
    expect(highQualityLanded({ status: 'transcribing' }, { status: 'complete', pass: 2 })).toBe(true);
  });
  it('not while still waiting, and not on a plain re-read', () => {
    expect(highQualityLanded({ status: 'complete', pass: 1, pass2Pending: true }, { status: 'complete', pass: 1, pass2Pending: true })).toBe(false);
    expect(highQualityLanded({ status: 'complete', pass: 2 }, { status: 'complete', pass: 2 })).toBe(false);
  });
  it('says plainly which pass is on disk', () => {
    expect(transcriptQuality({ pass: 1, pass2Pending: true })).toBe('fast transcript (pass 1) — high-quality pass still running');
    expect(transcriptQuality({ pass: 2, engine: 'crisperwhisper' })).toBe('high-quality transcript (pass 2, crisperwhisper)');
  });
});
