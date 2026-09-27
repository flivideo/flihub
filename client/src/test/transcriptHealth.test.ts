import { describe, it, expect } from 'vitest';
import { transcriptBadge } from '../utils/transcriptHealth';

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
