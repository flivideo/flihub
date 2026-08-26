/**
 * Trajectory tests — written BEFORE the implementation, on instruction.
 *
 * The spec (§3.4) names the bug it expects: "Direction is relative to the TARGET, not the
 * value. -34 -> -30 is improving; -22 -> -18 is worsening. Inverting that on the far side
 * of the target is the obvious bug — write that test first."
 *
 * Two peer sessions independently flagged the same thing, so it is asserted from both
 * sides of the target and from a crossing that overshoots.
 */

import { describe, it, expect } from 'vitest';
import {
  TrajectoryTracker,
  DEAD_BAND_DB,
  HYSTERESIS_TICKS,
  SPARKLINE_SECONDS,
  type Direction,
} from '../micTrajectory';

const TARGET = -23;

/** Feed a run of readings at 2 Hz and return the direction after each. */
function run(values: number[], target = TARGET): Direction[] {
  const tracker = new TrajectoryTracker({ target });
  const out: Direction[] = [];
  let t = 0;
  for (const v of values) {
    t += 500;
    out.push(tracker.push(v, t).direction);
  }
  return out;
}

/** Hold a value long enough to clear hysteresis, then return the settled direction. */
function settle(from: number, to: number, target = TARGET): Direction {
  const tracker = new TrajectoryTracker({ target });
  let t = 0;
  for (let i = 0; i < 8; i++) tracker.push(from, (t += 500));
  let last: Direction = 'flat';
  for (let i = 0; i < 8; i++) last = tracker.push(to, (t += 500)).direction;
  return last;
}

describe('direction is relative to the TARGET, not the value', () => {
  it('BELOW target, getting louder is improving', () => {
    expect(settle(-34, -30)).toBe('improving');
  });

  it('BELOW target, getting quieter is worsening', () => {
    expect(settle(-30, -34)).toBe('worsening');
  });

  // The far side — this is the pair the spec says gets inverted.
  it('ABOVE target, getting louder is WORSENING (not improving)', () => {
    expect(settle(-22, -18)).toBe('worsening');
  });

  it('ABOVE target, getting quieter is IMPROVING', () => {
    expect(settle(-18, -22)).toBe('improving');
  });

  it('is symmetric about the target — equal distances either side agree', () => {
    // Moving 4 dB closer to target from below and from above must both read improving.
    expect(settle(-31, -27)).toBe('improving');
    expect(settle(-15, -19)).toBe('improving');
  });

  it('crossing the target and overshooting reads as worsening', () => {
    // -25 -> -21 crosses -23. Distance goes 2 -> 2, so a naive "did the value rise"
    // test says improving; distance-to-target says it is a wash, and continuing to
    // -17 is unambiguously worse.
    expect(settle(-25, -17)).toBe('worsening');
  });
});

describe('dead-band — speech variation is not a knob turn', () => {
  it('reports flat for a change smaller than the dead-band', () => {
    expect(settle(-28, -28 + DEAD_BAND_DB * 0.5)).toBe('flat');
  });

  it('reports a direction for a change larger than the dead-band', () => {
    expect(settle(-28, -28 + DEAD_BAND_DB * 3)).toBe('improving');
  });

  it('treats a value sitting exactly on target as flat', () => {
    expect(settle(TARGET, TARGET)).toBe('flat');
  });
});

describe('hysteresis — the arrow must not flicker', () => {
  it(`requires ${HYSTERESIS_TICKS} consecutive agreeing updates before flipping`, () => {
    const tracker = new TrajectoryTracker({ target: TARGET });
    let t = 0;
    for (let i = 0; i < 8; i++) tracker.push(-30, (t += 500));

    // One improving sample must not flip the arrow on its own.
    const first = tracker.push(-26, (t += 500)).direction;
    expect(first).not.toBe('improving');
  });

  it('does not oscillate when readings alternate around the dead-band edge', () => {
    // Alternating noise is exactly what makes a naive arrow unusable.
    const alternating: number[] = [];
    for (let i = 0; i < 20; i++) alternating.push(i % 2 === 0 ? -28 : -28 + DEAD_BAND_DB * 1.2);

    const directions = run(alternating);
    const settled = directions.slice(6);
    const flips = settled.filter((d, i) => i > 0 && d !== settled[i - 1]).length;
    expect(flips).toBeLessThanOrEqual(1);
  });

  it('does flip once a sustained move in the other direction arrives', () => {
    const tracker = new TrajectoryTracker({ target: TARGET });
    let t = 0;
    for (let i = 0; i < 10; i++) tracker.push(-30, (t += 500));
    for (let i = 0; i < 10; i++) tracker.push(-26, (t += 500));
    expect(tracker.push(-26, (t += 500)).direction).toBe('improving');

    for (let i = 0; i < 10; i++) tracker.push(-34, (t += 500));
    expect(tracker.push(-34, (t += 500)).direction).toBe('worsening');
  });
});

describe('median smoothing rejects single transients', () => {
  it('one loud spike does not move the direction', () => {
    const tracker = new TrajectoryTracker({ target: TARGET });
    let t = 0;
    for (let i = 0; i < 12; i++) tracker.push(-30, (t += 500));
    const before = tracker.push(-30, (t += 500)).direction;
    const spiked = tracker.push(-5, (t += 500)).direction;
    expect(spiked).toBe(before);
  });
});

describe('distance to target', () => {
  it('reports the signed distance to the CENTRE of the band', () => {
    const tracker = new TrajectoryTracker({ target: TARGET });
    let t = 0;
    for (let i = 0; i < 8; i++) tracker.push(-27, (t += 500));
    expect(tracker.push(-27, (t += 500)).distanceDb).toBeCloseTo(4, 1);
  });

  it('reports a negative distance when above target', () => {
    const tracker = new TrajectoryTracker({ target: TARGET });
    let t = 0;
    for (let i = 0; i < 8; i++) tracker.push(-19, (t += 500));
    expect(tracker.push(-19, (t += 500)).distanceDb).toBeCloseTo(-4, 1);
  });
});

describe('sparkline', () => {
  it(`retains ${SPARKLINE_SECONDS} seconds of history`, () => {
    const tracker = new TrajectoryTracker({ target: TARGET });
    let t = 0;
    for (let i = 0; i < 200; i++) tracker.push(-25, (t += 500));
    const { sparkline } = tracker.push(-25, (t += 500));
    expect(sparkline.length).toBeLessThanOrEqual(SPARKLINE_SECONDS * 2 + 1);
    expect(sparkline.length).toBeGreaterThan(SPARKLINE_SECONDS);
  });

  it('starts empty and never reports a direction before it has data', () => {
    const tracker = new TrajectoryTracker({ target: TARGET });
    const first = tracker.push(-30, 500);
    expect(first.direction).toBe('unknown');
    expect(first.sparkline).toHaveLength(1);
  });
});

describe('unmeasurable input', () => {
  it('does not treat a null reading as a value', () => {
    const tracker = new TrajectoryTracker({ target: TARGET });
    let t = 0;
    for (let i = 0; i < 8; i++) tracker.push(-25, (t += 500));
    const withNull = tracker.push(null, (t += 500));
    expect(withNull.direction).toBe('unknown');
    expect(withNull.distanceDb).toBeNull();
  });

  it('resumes cleanly after a gap of nulls', () => {
    const tracker = new TrajectoryTracker({ target: TARGET });
    let t = 0;
    for (let i = 0; i < 8; i++) tracker.push(-30, (t += 500));
    for (let i = 0; i < 4; i++) tracker.push(null, (t += 500));
    for (let i = 0; i < 10; i++) tracker.push(-26, (t += 500));
    expect(tracker.push(-26, (t += 500)).direction).toBe('improving');
  });
});

describe('change-event detection (§3.5)', () => {
  it('detects a level step larger than 3 dB inside 500 ms that then holds', () => {
    const tracker = new TrajectoryTracker({ target: TARGET });
    let t = 0;
    for (let i = 0; i < 10; i++) tracker.push(-32, (t += 500));
    tracker.push(-26, (t += 500));
    let event = null;
    for (let i = 0; i < 6; i++) {
      const r = tracker.push(-26, (t += 500));
      if (r.changeEvent) event = r.changeEvent;
    }
    expect(event).toBeTruthy();
    expect(event!.deltaDb).toBeGreaterThan(3);
  });

  it('does NOT fire on a step that immediately reverts', () => {
    const tracker = new TrajectoryTracker({ target: TARGET });
    let t = 0;
    for (let i = 0; i < 10; i++) tracker.push(-32, (t += 500));
    tracker.push(-26, (t += 500));
    tracker.push(-32, (t += 500));
    let event = null;
    for (let i = 0; i < 6; i++) {
      const r = tracker.push(-32, (t += 500));
      if (r.changeEvent) event = r.changeEvent;
    }
    expect(event).toBeNull();
  });

  it('does not fire on gradual drift', () => {
    const tracker = new TrajectoryTracker({ target: TARGET });
    let t = 0;
    let level = -23;
    let event = null;
    for (let i = 0; i < 40; i++) {
      level -= 0.3;
      const r = tracker.push(level, (t += 500));
      if (r.changeEvent) event = r.changeEvent;
    }
    expect(event).toBeNull();
  });

  it('labels the event as detected, never as an attributed cause', () => {
    // "A marker is a hypothesis, not a fact" — it must not claim he turned the knob.
    const tracker = new TrajectoryTracker({ target: TARGET });
    let t = 0;
    for (let i = 0; i < 10; i++) tracker.push(-32, (t += 500));
    tracker.push(-26, (t += 500));
    let event = null;
    for (let i = 0; i < 6; i++) {
      const r = tracker.push(-26, (t += 500));
      if (r.changeEvent) event = r.changeEvent;
    }
    expect(event!.label).toMatch(/detected/i);
    expect(event!.label).not.toMatch(/you turned|you moved/i);
  });
});
