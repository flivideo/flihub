/**
 * MicCheck Phase 1.6 — zone-track position math for the snapshot verdict.
 *
 * Presentation only. This file must never grade anything — it takes an already-graded
 * value and maps it onto a 0..100 track position, importing its zone boundaries from
 * micGrading.ts so the track can never silently disagree with the disc/message it sits
 * under. See docs/miccheck-build-spec.md §9.2.
 */

import { SHORT_TERM_GREEN } from './micGrading';

export type ZoneKind = 'target' | 'caution' | 'danger';

export interface TrackZone {
  kind: ZoneKind;
  startPct: number;
  widthPct: number;
}

export interface TrackSpec {
  markerPct: number;
  zones: TrackZone[];
  poleLeft: string;
  poleRight: string;
}

function clampPct(n: number): number {
  return Math.max(0, Math.min(100, n));
}

function percentOf(value: number, min: number, max: number): number {
  return clampPct(((value - min) / (max - min)) * 100);
}

// Same -40..-10 LUFS scale the continuous-mode needle bar already uses (MicCheckPage.tsx),
// so a reading lands in the same visual place in both modes.
const LOUD_MIN = -40;
const LOUD_MAX = -10;

export function loudnessTrack(shortTermLufs: number): TrackSpec {
  const [low, high] = SHORT_TERM_GREEN;
  return {
    markerPct: Number.isFinite(shortTermLufs) ? percentOf(shortTermLufs, LOUD_MIN, LOUD_MAX) : 0,
    zones: [
      {
        kind: 'target',
        startPct: percentOf(low, LOUD_MIN, LOUD_MAX),
        widthPct: percentOf(high, LOUD_MIN, LOUD_MAX) - percentOf(low, LOUD_MIN, LOUD_MAX),
      },
    ],
    poleLeft: 'Too quiet',
    poleRight: 'Too loud',
  };
}

// Matches gradeTruePeak's real thresholds exactly (micGrading.ts): caution above -6 dBFS,
// danger above -3 dBFS. If those thresholds ever change, this track changes with them
// because nothing here re-declares the numbers independently.
const PEAK_MIN = -30;
const PEAK_MAX = 0;
const PEAK_CAUTION_DBFS = -6;
const PEAK_DANGER_DBFS = -3;

export function peakTrack(samplePeakDbfs: number): TrackSpec {
  const cautionStart = percentOf(PEAK_CAUTION_DBFS, PEAK_MIN, PEAK_MAX);
  const dangerStart = percentOf(PEAK_DANGER_DBFS, PEAK_MIN, PEAK_MAX);
  const end = percentOf(PEAK_MAX, PEAK_MIN, PEAK_MAX);
  return {
    markerPct: Number.isFinite(samplePeakDbfs) ? percentOf(samplePeakDbfs, PEAK_MIN, PEAK_MAX) : 0,
    zones: [
      { kind: 'caution', startPct: cautionStart, widthPct: dangerStart - cautionStart },
      { kind: 'danger', startPct: dangerStart, widthPct: end - dangerStart },
    ],
    poleLeft: 'Safe',
    poleRight: 'Clipping risk',
  };
}

// Clipping is a cumulative count, not a continuous scale — the track exists to say "any
// clip is bad", not to place a precise position. 0..3 is a display range only.
const CLIP_DISPLAY_MAX = 3;

export function clipTrack(clipCount: number): TrackSpec {
  return {
    markerPct: clampPct((clipCount / CLIP_DISPLAY_MAX) * 100),
    zones: [{ kind: 'danger', startPct: 8, widthPct: 92 }],
    poleLeft: 'Clean',
    poleRight: 'Clipped',
  };
}
