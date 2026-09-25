// 2026-09-25 (David, live on d01):
// - The player modal said "SRT file not found" for 01-1-intro-HOOK.mov: it rebuilt the segment
//   name from parsed parts (tags stripped) and asked for 01-1-intro.srt. The transcript is named
//   after the full base name, tags included.
// - Tags should read as coloured pills next to the name, one colour per tag, stable across rows.
import { describe, it, expect } from 'vitest';
import { segmentNameOf } from '../utils/naming';
import { tagPillClass } from '../utils/tagPills';

describe('segmentNameOf', () => {
  it('keeps the tags: 01-1-intro-HOOK.mov → 01-1-intro-HOOK', () => {
    expect(segmentNameOf('01-1-intro-HOOK.mov')).toBe('01-1-intro-HOOK');
  });
  it('no tags → unchanged base name', () => {
    expect(segmentNameOf('05-3-demo-flow.mov')).toBe('05-3-demo-flow');
  });
  it('not a recording name → null', () => {
    expect(segmentNameOf('Ecamm Recording on 2026-09-25.mov')).toBeNull();
    expect(segmentNameOf(undefined)).toBeNull();
  });
});

describe('tagPillClass', () => {
  it('is a rounded pill', () => {
    expect(tagPillClass('HOOK')).toContain('rounded-full');
  });
  it('HOOK, CTA and SKOOL each get their own colour', () => {
    const colours = ['HOOK', 'CTA', 'SKOOL'].map((t) => tagPillClass(t));
    expect(new Set(colours).size).toBe(3);
  });
  it('the same tag always gets the same colour; any other tag still gets one', () => {
    expect(tagPillClass('TECHSTACK')).toBe(tagPillClass('TECHSTACK'));
    expect(tagPillClass('TECHSTACK')).toMatch(/bg-\w+-100/);
  });
});
