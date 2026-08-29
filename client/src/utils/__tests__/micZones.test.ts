/**
 * Zone-track position tests.
 *
 * The one property worth protecting: these percentages must never drift from
 * micGrading.ts's real thresholds. If SHORT_TERM_GREEN or the peak guard values ever
 * change, this file changes with them because it imports the constants rather than
 * re-declaring them — these tests exist to catch anyone who breaks that link.
 */

import { describe, it, expect } from 'vitest';
import { loudnessTrack, peakTrack, clipTrack } from '../micZones';
import { SHORT_TERM_GREEN } from '../micGrading';

describe('loudnessTrack', () => {
  it('places the target zone at the real SHORT_TERM_GREEN band', () => {
    const track = loudnessTrack(-23);
    const [low, high] = SHORT_TERM_GREEN;
    const expectedStart = ((low - -40) / 30) * 100;
    const expectedWidth = ((high - -40) / 30) * 100 - expectedStart;
    expect(track.zones).toHaveLength(1);
    expect(track.zones[0].kind).toBe('target');
    expect(track.zones[0].startPct).toBeCloseTo(expectedStart, 5);
    expect(track.zones[0].widthPct).toBeCloseTo(expectedWidth, 5);
  });

  it('places the marker inside the target zone for a reading at the centre of the band', () => {
    const track = loudnessTrack(-23);
    const zone = track.zones[0];
    expect(track.markerPct).toBeGreaterThanOrEqual(zone.startPct);
    expect(track.markerPct).toBeLessThanOrEqual(zone.startPct + zone.widthPct);
  });

  it('clamps the marker within 0..100 for an extreme reading', () => {
    expect(loudnessTrack(-90).markerPct).toBe(0);
    expect(loudnessTrack(10).markerPct).toBe(100);
  });

  it('does not throw and reports 0 for a non-finite reading', () => {
    expect(loudnessTrack(Number.NEGATIVE_INFINITY).markerPct).toBe(0);
  });
});

describe('peakTrack', () => {
  it('starts the caution zone at -6 dBFS and the danger zone at -3 dBFS', () => {
    const track = peakTrack(-10);
    const [caution, danger] = track.zones;
    expect(caution.kind).toBe('caution');
    expect(danger.kind).toBe('danger');
    // -6 dBFS on a -30..0 scale is 80%; -3 dBFS is 90% — must match gradeTruePeak exactly.
    expect(caution.startPct).toBeCloseTo(80, 5);
    expect(danger.startPct).toBeCloseTo(90, 5);
  });

  it('places the marker inside the danger zone for a reading past -3 dBFS', () => {
    const track = peakTrack(-1);
    const danger = track.zones[1];
    expect(track.markerPct).toBeGreaterThanOrEqual(danger.startPct);
  });
});

describe('clipTrack', () => {
  it('marks zero clips at the clean end', () => {
    expect(clipTrack(0).markerPct).toBe(0);
  });

  it('moves the marker right as clip count rises, clamped at 100', () => {
    expect(clipTrack(3).markerPct).toBe(100);
    expect(clipTrack(30).markerPct).toBe(100);
  });
});
