// Remembered speed (fli-core v0.33.0): FliHub keeps its rate as `fli:flihub:speed`, 2x by default, and moves the
// pre-v0.33 `flihub:watch:playbackSpeed` across once.
import { beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { rememberedSpeed } from '@flivideo/core/ui';
import {
  DEFAULT_SPEED,
  LEGACY_SPEED_KEY,
  SPEED_STORAGE_KEY,
  speedMemory,
  useVideoPlayback,
} from '../hooks/useVideoPlayback';

describe('FliHub remembered speed', () => {
  beforeEach(() => localStorage.clear());

  it('uses fli:flihub:speed and the old key is named', () => {
    expect(SPEED_STORAGE_KEY).toBe('fli:flihub:speed');
    expect(LEGACY_SPEED_KEY).toBe('flihub:watch:playbackSpeed');
  });

  it('defaults to 2x with nothing stored', () => {
    expect(renderHook(() => useVideoPlayback()).result.current.playbackSpeed).toBe(DEFAULT_SPEED);
  });

  it('a change is remembered and the next mount starts there', () => {
    const first = renderHook(() => useVideoPlayback());
    act(() => first.result.current.handleSpeedChange(1.5));
    expect(localStorage.getItem(SPEED_STORAGE_KEY)).toBe('1.5');
    expect(renderHook(() => useVideoPlayback()).result.current.playbackSpeed).toBe(1.5);
  });

  it('a stored value off the ladder snaps to the nearest rung', () => {
    localStorage.setItem(SPEED_STORAGE_KEY, '1.9');
    expect(speedMemory.get()).toBe(2);
  });

  it('the old key moves across once: new key written, old removed, and it is not read again', () => {
    localStorage.setItem(LEGACY_SPEED_KEY, '0.75');
    const m = rememberedSpeed('flihub', DEFAULT_SPEED, { migrateFrom: [LEGACY_SPEED_KEY] });
    expect(m.get()).toBe(0.75);
    expect(localStorage.getItem(SPEED_STORAGE_KEY)).toBe('0.75');
    expect(localStorage.getItem(LEGACY_SPEED_KEY)).toBeNull();
    localStorage.setItem(LEGACY_SPEED_KEY, '4');
    expect(m.get()).toBe(0.75);
  });
});
