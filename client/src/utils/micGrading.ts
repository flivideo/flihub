/**
 * MicCheck Phase 1 — the colour model.
 *
 * Kept out of the component and unit-tested, because this is the part that can quietly
 * lie. A wrong number on screen is visible; a wrong *colour* is trusted.
 *
 * Two rules govern everything here:
 *
 * 1. Every non-green state carries an imperative naming the physical action. A colour
 *    with no instruction is exactly the "I can't tell what's wrong" problem the tool
 *    exists to fix.
 * 2. GREY means "not yet measurable", and always carries the reason. It must never
 *    fall back to green. "No speech yet, so loudness is unmeasured" and "loudness is
 *    fine" must never look the same.
 *
 * Thresholds are CAPTURE targets, not delivery targets — see spec §2.0. Delivery
 * loudness is audio-clean's job downstream.
 */

import { SPEECH_FLOOR_LUFS } from '../hooks/useMicAnalyser';

export type Grade = 'green' | 'orange' | 'red' | 'grey';

export interface Reading {
  grade: Grade;
  /** Formatted value, or null when there is nothing to show. */
  value: string | null;
  /** The imperative. Required for orange/red, and the reason for grey. */
  message: string | null;
  /** Where the threshold comes from — surfaced by the "why?" affordance (UI rule 5). */
  basis: string;
  /** True when the threshold is a convention rather than a published standard. */
  isConvention: boolean;
}

/** Centre of the green band — the target the gain advice aims at. */
export const SHORT_TERM_TARGET_LUFS = -23;
export const SHORT_TERM_GREEN: [number, number] = [-26, -20];

const LOUDNESS_BASIS =
  'Green band -26 to -20 LUFS is derived (spec §2.0) from the ACX spoken-word capture ' +
  'band and your measured peak-to-loudness ratio. EBU Tech 3343 recommends the 3 s ' +
  'short-term window specifically for setting a narrator\'s level. These are CAPTURE ' +
  'targets — audio-clean applies make-up gain to reach delivery loudness later.';

const PEAK_BASIS =
  'True peak is a GUARD, not a target. ACX caps peaks at -3 dBFS; -6 keeps headroom for ' +
  'an unrehearsed loud moment. Setting gain by the peak meter is what caused the -40 LUFS ' +
  'takes — one transient parks the peak ~28 dB above your speech. Phase 1 measures SAMPLE ' +
  'peak, not true peak: without 4x oversampling (BS.1770-5 Annex 2) this can read up to ' +
  '~3 dB LOW on inter-sample peaks, so treat it as slightly optimistic.';

const CLIP_BASIS =
  'Convention, not a standard. Near-clip = any sample at or above -0.5 dBFS. A clip = 3 or ' +
  'more consecutive samples at full scale. Clipping is unrecoverable in post.';

function formatLufs(value: number): string {
  return Number.isFinite(value) ? `${value.toFixed(1)} LUFS` : '—';
}

function formatDbfs(value: number): string {
  return Number.isFinite(value) ? `${value.toFixed(1)} dBFS` : '—';
}

/** Round a gain suggestion to something a physical knob can act on. */
function describeGainDelta(deltaDb: number): string {
  const magnitude = Math.abs(deltaDb);
  const rounded = magnitude < 2 ? magnitude.toFixed(1) : Math.round(magnitude).toString();
  const direction = deltaDb > 0 ? 'up' : 'down';
  return `turn the GAIN knob ${direction} ~${rounded} dB`;
}

export interface LoudnessInput {
  shortTermLufs: number;
  windowFull: boolean;
  windowFillRatio: number;
}

/** A1 — short-term loudness (3 s, ungated). The primary gain needle. */
export function gradeShortTermLoudness(input: LoudnessInput): Reading {
  const { shortTermLufs, windowFull, windowFillRatio } = input;

  const base = { basis: LOUDNESS_BASIS, isConvention: false };

  if (!windowFull) {
    const percent = Math.round(windowFillRatio * 100);
    return {
      ...base,
      grade: 'grey',
      value: null,
      message: `Filling the 3 s window (${percent}%). Keep talking — no reading yet.`,
    };
  }

  // Silence is not "too quiet". Advising a gain increase against room tone would send
  // David chasing his fans up into the green band. This is the grey rule doing real work.
  if (!Number.isFinite(shortTermLufs) || shortTermLufs < SPEECH_FLOOR_LUFS) {
    return {
      ...base,
      grade: 'grey',
      value: formatLufs(shortTermLufs),
      message:
        'No speech detected — this is room tone, not your voice. Start talking at your ' +
        'normal recording level and distance.',
    };
  }

  const [low, high] = SHORT_TERM_GREEN;
  const delta = SHORT_TERM_TARGET_LUFS - shortTermLufs;
  const value = formatLufs(shortTermLufs);

  if (shortTermLufs >= low && shortTermLufs <= high) {
    return { ...base, grade: 'green', value, message: null };
  }

  if (shortTermLufs < -30) {
    return {
      ...base,
      grade: 'red',
      value,
      message: `Far too quiet — ${describeGainDelta(delta)}. At this level you are using about 7 of the microphone's 16 bits, and that detail cannot be recovered in post.`,
    };
  }

  if (shortTermLufs > -17) {
    return {
      ...base,
      grade: 'red',
      value,
      message: `Too hot — ${describeGainDelta(delta)}. You are close to clipping, which is unrecoverable.`,
    };
  }

  return {
    ...base,
    grade: 'orange',
    value,
    message: `${describeGainDelta(delta).replace(/^t/, 'T')} to reach the -23 LUFS target.`,
  };
}

export interface PeakInput {
  samplePeakDbfs: number;
  hasSignal: boolean;
}

/** A3 — sample peak, used as a guard. */
export function gradeTruePeak(input: PeakInput): Reading {
  const { samplePeakDbfs, hasSignal } = input;
  const base = { basis: PEAK_BASIS, isConvention: false };

  if (!hasSignal || !Number.isFinite(samplePeakDbfs)) {
    return {
      ...base,
      grade: 'grey',
      value: null,
      message: 'No signal yet — nothing has peaked.',
    };
  }

  const value = formatDbfs(samplePeakDbfs);

  if (samplePeakDbfs > -3) {
    return {
      ...base,
      grade: 'red',
      value,
      message:
        'Peaks are dangerously close to full scale — turn the GAIN knob down. Clipping ' +
        'cannot be undone.',
    };
  }

  if (samplePeakDbfs > -6) {
    return {
      ...base,
      grade: 'orange',
      value,
      message: 'Less headroom than ideal. Turn the GAIN knob down slightly if you plan to raise your voice.',
    };
  }

  // Deliberately green below -12 as well as inside -12..-6.
  //
  // The spec's table lists green as -12 to -6 and leaves quieter unspecified. Grading a
  // low peak as a problem would tell David to raise gain because the PEAK is low — which
  // is precisely the mistake that produced the -40 LUFS takes. The peak is a guard: if it
  // is far from the ceiling the guard is satisfied, and loudness alone drives the knob.
  return { ...base, grade: 'green', value, message: null };
}

export interface ClipInput {
  clipCount: number;
  nearClipCount: number;
  hasSignal: boolean;
}

/** A4 — clip and near-clip counts. */
export function gradeClipping(input: ClipInput): Reading {
  const { clipCount, nearClipCount, hasSignal } = input;
  const base = { basis: CLIP_BASIS, isConvention: true };

  if (!hasSignal) {
    return { ...base, grade: 'grey', value: null, message: 'No signal yet.' };
  }

  const value = `${clipCount} clip${clipCount === 1 ? '' : 's'} · ${nearClipCount} near`;

  if (clipCount > 0) {
    return {
      ...base,
      grade: 'red',
      value,
      message: `${clipCount} clipped passage${clipCount === 1 ? '' : 's'} — turn the GAIN knob down and re-record. Clipped samples are destroyed, not quiet.`,
    };
  }

  if (nearClipCount > 0) {
    return {
      ...base,
      grade: 'orange',
      value,
      message: 'Touching the ceiling. Turn the GAIN knob down slightly to leave headroom.',
    };
  }

  return { ...base, grade: 'green', value, message: null };
}

/**
 * Is there enough signal for peak/clip readings to mean anything?
 * Uses the same floor as the loudness grade so the panel cannot disagree with itself.
 */
export function hasSpeechSignal(shortTermLufs: number, windowFull: boolean): boolean {
  return windowFull && Number.isFinite(shortTermLufs) && shortTermLufs >= SPEECH_FLOOR_LUFS;
}
