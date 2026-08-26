/**
 * MicCheck colour-model tests.
 *
 * The two properties worth protecting are not the individual thresholds — those are
 * documented and easy to read. They are:
 *   - grey never silently becomes green
 *   - every non-green state carries an actionable imperative
 * Both are asserted exhaustively at the bottom of this file.
 */

import { describe, it, expect } from 'vitest';
import {
  gradeShortTermLoudness,
  gradeTruePeak,
  gradeClipping,
  hasSpeechSignal,
  SHORT_TERM_TARGET_LUFS,
} from '../micGrading';

const full = { windowFull: true, windowFillRatio: 1 };

describe('gradeShortTermLoudness', () => {
  it('is green inside the -26..-20 LUFS capture band', () => {
    for (const lufs of [-26, -23, -20]) {
      expect(gradeShortTermLoudness({ shortTermLufs: lufs, ...full }).grade).toBe('green');
    }
  });

  it('is orange just outside the band on both sides', () => {
    expect(gradeShortTermLoudness({ shortTermLufs: -28, ...full }).grade).toBe('orange');
    expect(gradeShortTermLoudness({ shortTermLufs: -18, ...full }).grade).toBe('orange');
  });

  it('is red below -30 and above -17', () => {
    expect(gradeShortTermLoudness({ shortTermLufs: -35, ...full }).grade).toBe('red');
    expect(gradeShortTermLoudness({ shortTermLufs: -15, ...full }).grade).toBe('red');
  });

  it('grades the real -39 LUFS take as red, not orange', () => {
    // The take that started all this. If this ever reads anything softer than red,
    // the tool has stopped doing its job.
    const reading = gradeShortTermLoudness({ shortTermLufs: -39, ...full });
    expect(reading.grade).toBe('red');
    expect(reading.message).toMatch(/GAIN knob up/);
  });

  it('names the direction and rough size of the knob move', () => {
    const quiet = gradeShortTermLoudness({ shortTermLufs: -28, ...full });
    expect(quiet.message).toMatch(/up ~5 dB/);

    const loud = gradeShortTermLoudness({ shortTermLufs: -18, ...full });
    expect(loud.message).toMatch(/down ~5 dB/);
  });

  it('aims its advice at the centre of the green band', () => {
    const reading = gradeShortTermLoudness({ shortTermLufs: SHORT_TERM_TARGET_LUFS, ...full });
    expect(reading.grade).toBe('green');
    expect(reading.message).toBeNull();
  });

  describe('GREY — the honesty cases', () => {
    it('is grey while the 3 s window is still filling, never green', () => {
      const reading = gradeShortTermLoudness({
        shortTermLufs: -23,
        windowFull: false,
        windowFillRatio: 0.5,
      });
      expect(reading.grade).toBe('grey');
      expect(reading.message).toMatch(/50%/);
    });

    it('is grey for room tone, not red — silence must not produce gain advice', () => {
      // Room tone measured -61.5 LUFS. Grading that red would tell David to turn the
      // gain up until his FANS reach -23 LUFS.
      const reading = gradeShortTermLoudness({ shortTermLufs: -61.5, ...full });
      expect(reading.grade).toBe('grey');
      expect(reading.message).toMatch(/No speech detected/);
      expect(reading.message).not.toMatch(/GAIN knob/);
    });

    it('is grey for -Infinity (digital silence)', () => {
      expect(gradeShortTermLoudness({ shortTermLufs: -Infinity, ...full }).grade).toBe('grey');
    });

    it('switches from grey to red at the speech floor', () => {
      expect(gradeShortTermLoudness({ shortTermLufs: -51, ...full }).grade).toBe('grey');
      expect(gradeShortTermLoudness({ shortTermLufs: -49, ...full }).grade).toBe('red');
    });
  });
});

describe('gradeTruePeak', () => {
  const signal = { hasSignal: true };

  it('is red above -3 dBFS', () => {
    expect(gradeTruePeak({ samplePeakDbfs: -1, ...signal }).grade).toBe('red');
  });

  it('is orange between -6 and -3 dBFS', () => {
    expect(gradeTruePeak({ samplePeakDbfs: -4.5, ...signal }).grade).toBe('orange');
  });

  it('is green at or below -6 dBFS', () => {
    expect(gradeTruePeak({ samplePeakDbfs: -8, ...signal }).grade).toBe('green');
  });

  it('is GREEN at a very low peak — the guard is satisfied, not violated', () => {
    // This is the design decision that prevents the original bug. A -18.7 dBTP peak
    // (his real take) must not be graded as "needs more gain" by the peak meter;
    // loudness alone drives the knob.
    const reading = gradeTruePeak({ samplePeakDbfs: -18.7, ...signal });
    expect(reading.grade).toBe('green');
    expect(reading.message).toBeNull();
  });

  it('is grey with no signal', () => {
    expect(gradeTruePeak({ samplePeakDbfs: -Infinity, hasSignal: false }).grade).toBe('grey');
  });

  it('warns that sample peak reads optimistically without oversampling', () => {
    expect(gradeTruePeak({ samplePeakDbfs: -8, ...signal }).basis).toMatch(/oversampling/i);
  });
});

describe('gradeClipping', () => {
  const signal = { hasSignal: true };

  it('is green at zero clips and zero near-clips', () => {
    expect(gradeClipping({ clipCount: 0, nearClipCount: 0, ...signal }).grade).toBe('green');
  });

  it('is orange on near-clips alone', () => {
    expect(gradeClipping({ clipCount: 0, nearClipCount: 2, ...signal }).grade).toBe('orange');
  });

  it('is red on any true clip', () => {
    expect(gradeClipping({ clipCount: 1, nearClipCount: 9, ...signal }).grade).toBe('red');
  });

  it('is grey with no signal rather than green', () => {
    const reading = gradeClipping({ clipCount: 0, nearClipCount: 0, hasSignal: false });
    expect(reading.grade).toBe('grey');
  });
});

describe('hasSpeechSignal', () => {
  it('requires both a full window and a level above the speech floor', () => {
    expect(hasSpeechSignal(-23, true)).toBe(true);
    expect(hasSpeechSignal(-23, false)).toBe(false);
    expect(hasSpeechSignal(-61, true)).toBe(false);
    expect(hasSpeechSignal(-Infinity, true)).toBe(false);
  });
});

describe('the two invariants that make the tool trustworthy', () => {
  const everyReading = () => [
    ...[-70, -61.5, -49, -39, -28, -23, -18, -15, -5].flatMap((lufs) =>
      [true, false].map((windowFull) =>
        gradeShortTermLoudness({ shortTermLufs: lufs, windowFull, windowFillRatio: 0.4 })
      )
    ),
    ...[-30, -18.7, -8, -4.5, -1].flatMap((peak) =>
      [true, false].map((hasSignal) => gradeTruePeak({ samplePeakDbfs: peak, hasSignal }))
    ),
    ...[0, 1, 5].flatMap((clips) =>
      [0, 2, 9].flatMap((near) =>
        [true, false].map((hasSignal) =>
          gradeClipping({ clipCount: clips, nearClipCount: near, hasSignal })
        )
      )
    ),
  ];

  it('every orange and red reading carries an actionable imperative', () => {
    for (const reading of everyReading()) {
      if (reading.grade === 'orange' || reading.grade === 'red') {
        expect(reading.message, `${reading.grade} reading had no message`).toBeTruthy();
        expect(reading.message!.length).toBeGreaterThan(20);
      }
    }
  });

  it('every grey reading states WHY it is unmeasured', () => {
    for (const reading of everyReading()) {
      if (reading.grade === 'grey') {
        expect(reading.message, 'grey reading had no reason').toBeTruthy();
      }
    }
  });

  it('never returns green when the underlying data is unavailable', () => {
    const unavailable = [
      gradeShortTermLoudness({ shortTermLufs: -23, windowFull: false, windowFillRatio: 0.9 }),
      gradeShortTermLoudness({ shortTermLufs: -Infinity, ...full }),
      gradeTruePeak({ samplePeakDbfs: -Infinity, hasSignal: false }),
      gradeClipping({ clipCount: 0, nearClipCount: 0, hasSignal: false }),
    ];
    for (const reading of unavailable) {
      expect(reading.grade).toBe('grey');
    }
  });

  it('every reading explains the basis of its threshold', () => {
    for (const reading of everyReading()) {
      expect(reading.basis.length).toBeGreaterThan(40);
    }
  });
});
