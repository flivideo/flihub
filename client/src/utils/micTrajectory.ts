/**
 * Trajectory — "am I getting warmer or colder?" (spec §3.4 / §3.5)
 *
 * A correct static number does not help someone turning a knob they cannot see while
 * reading a meter they cannot look at simultaneously. What helps is knowing whether the
 * last thing they did made it better or worse, and by how much, in the unit they are
 * adjusting.
 *
 * Three things make this usable rather than annoying:
 *   - a MEDIAN over the comparison window, so one transient cannot swing the arrow
 *   - a DEAD-BAND, so ordinary speech variation reads as `flat` rather than as a move
 *   - HYSTERESIS, so the arrow does not oscillate at the boundary. A flickering arrow
 *     destroys trust faster than no arrow at all.
 *
 * ⚠️ Direction is relative to the TARGET, not to the value. Getting louder is improving
 * below the target and worsening above it. Tests were written before this file.
 */

/** 🔶 Convention (§3.4) — starting points, expected to be tuned on real use. */
export const COMPARISON_WINDOW_SECONDS = 3;
export const UPDATE_HZ = 2;
export const DEAD_BAND_DB = 0.7;
export const HYSTERESIS_TICKS = 3;
export const SPARKLINE_SECONDS = 30;

/** A level step this large, appearing this fast and then holding, is a change event. */
const STEP_THRESHOLD_DB = 3;
const STEP_HOLD_MS = 2000;

const WINDOW_SAMPLES = COMPARISON_WINDOW_SECONDS * UPDATE_HZ;
const SPARKLINE_SAMPLES = SPARKLINE_SECONDS * UPDATE_HZ;

export type Direction = 'improving' | 'worsening' | 'flat' | 'unknown';

export interface SparkPoint {
  t: number;
  value: number | null;
}

export interface ChangeEvent {
  t: number;
  deltaDb: number;
  /** Deliberately "detected" — a marker is a hypothesis, not an attributed cause. */
  label: string;
}

export interface TrajectoryReading {
  direction: Direction;
  /** Signed dB to the target centre. Positive = needs to come up. Null when unmeasurable. */
  distanceDb: number | null;
  sparkline: SparkPoint[];
  /** Non-null only on the update where a change event is confirmed. */
  changeEvent: ChangeEvent | null;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

interface PendingStep {
  t: number;
  deltaDb: number;
  fromMedian: number;
  toValue: number;
}

export class TrajectoryTracker {
  private target: number;
  private samples: SparkPoint[] = [];
  private direction: Direction = 'unknown';
  private candidate: Direction = 'unknown';
  private candidateCount = 0;
  private pendingStep: PendingStep | null = null;

  constructor(options: { target: number }) {
    this.target = options.target;
  }

  /** Distance from the target, as a magnitude. Smaller is better, by definition. */
  private errorOf(value: number): number {
    return Math.abs(value - this.target);
  }

  private recentValues(count: number, skip = 0): number[] {
    const out: number[] = [];
    for (let i = this.samples.length - 1 - skip; i >= 0 && out.length < count; i--) {
      const v = this.samples[i].value;
      if (v !== null) out.push(v);
    }
    return out;
  }

  push(value: number | null, t: number): TrajectoryReading {
    this.samples.push({ t, value });
    if (this.samples.length > SPARKLINE_SAMPLES + 1) this.samples.shift();

    const sparkline = [...this.samples];

    if (value === null) {
      // Unmeasurable input must not be treated as a level. Hold the arrow rather than
      // inventing a direction from a gap.
      return { direction: 'unknown', distanceDb: null, sparkline, changeEvent: null };
    }

    const distanceDb = this.target - value;
    const changeEvent = this.detectStep(value, t);

    const current = this.recentValues(WINDOW_SAMPLES);
    const previous = this.recentValues(WINDOW_SAMPLES, WINDOW_SAMPLES);

    // Not enough history on either side to compare — say unknown rather than flat,
    // because "no reading yet" and "holding steady" are different facts.
    if (current.length < 2 || previous.length < 2) {
      return { direction: 'unknown', distanceDb, sparkline, changeEvent };
    }

    const currentError = this.errorOf(median(current));
    const previousError = this.errorOf(median(previous));
    const improvement = previousError - currentError;

    let observed: Direction;
    if (Math.abs(improvement) < DEAD_BAND_DB) {
      observed = 'flat';
    } else {
      observed = improvement > 0 ? 'improving' : 'worsening';
    }

    // Hysteresis: a new direction must be observed HYSTERESIS_TICKS times running before
    // it replaces the displayed one.
    if (observed === this.direction) {
      this.candidate = observed;
      this.candidateCount = 0;
    } else if (observed === this.candidate) {
      this.candidateCount++;
      if (this.candidateCount >= HYSTERESIS_TICKS) {
        this.direction = observed;
        this.candidateCount = 0;
      }
    } else {
      this.candidate = observed;
      this.candidateCount = 1;
    }

    return { direction: this.direction, distanceDb, sparkline, changeEvent };
  }

  /**
   * §3.5 — a level step that appears fast and then HOLDS. The hold requirement is what
   * separates a deliberate adjustment from a shout: a spike that reverts is not a change.
   */
  private detectStep(value: number, t: number): ChangeEvent | null {
    if (this.pendingStep) {
      const drifted = Math.abs(value - this.pendingStep.toValue) > STEP_THRESHOLD_DB / 2;
      if (drifted) {
        this.pendingStep = null;
        return null;
      }
      if (t - this.pendingStep.t >= STEP_HOLD_MS) {
        const confirmed = this.pendingStep;
        this.pendingStep = null;
        return {
          t: confirmed.t,
          deltaDb: confirmed.deltaDb,
          label: `Level step detected — ${confirmed.deltaDb > 0 ? '+' : ''}${confirmed.deltaDb.toFixed(1)} dB`,
        };
      }
      return null;
    }

    const baseline = this.recentValues(WINDOW_SAMPLES, 1);
    if (baseline.length < WINDOW_SAMPLES) return null;

    const from = median(baseline);
    const deltaDb = value - from;
    if (Math.abs(deltaDb) > STEP_THRESHOLD_DB) {
      this.pendingStep = { t, deltaDb, fromMedian: from, toValue: value };
    }
    return null;
  }

  reset(): void {
    this.samples = [];
    this.direction = 'unknown';
    this.candidate = 'unknown';
    this.candidateCount = 0;
    this.pendingStep = null;
  }
}
