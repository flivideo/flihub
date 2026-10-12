import { describe, it, expect } from 'vitest';
import { planMovedSequences } from '../utils/chapterMove.js';

describe('planMovedSequences', () => {
  it('numbers takes moved into an empty chapter from 1, in their old order', () => {
    const plan = planMovedSequences(
      [
        { filename: '02-3-overview.mov', chapter: '02', sequence: 3 },
        { filename: '02-2-overview.mov', chapter: '02', sequence: 2 },
      ],
      '03',
      []
    );
    expect(plan.get('02-2-overview.mov')).toBe(1);
    expect(plan.get('02-3-overview.mov')).toBe(2);
  });

  it('appends after takes already in the target chapter', () => {
    const plan = planMovedSequences([{ filename: '02-2-overview.mov', chapter: '02', sequence: 2 }], '03', [1, 2]);
    expect(plan.get('02-2-overview.mov')).toBe(3);
  });

  it('leaves takes that stay in their chapter alone', () => {
    const plan = planMovedSequences([{ filename: '03-2-flihub.mov', chapter: '03', sequence: 2 }], '3', [2]);
    expect(plan.size).toBe(0);
  });
});
