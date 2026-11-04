// Speed STEP 3: FliHub runs fli-core's shared speed control (3 visible, chevrons step like J / L, 2x default)
// in both the WatchPage and the modal (they share VideoControlsBar), and J / K / L follow fli-core jkl().
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { FORWARD_SPEEDS } from '@flivideo/core/contracts';
import { SpeedControl } from '../components/shared/SpeedControl';
import { VideoControlsBar } from '../components/shared/VideoControlsBar';
import {
  DEFAULT_SPEED,
  SPEED_PRESETS,
  SPEED_STORAGE_KEY,
  jklPlayback,
  useVideoPlayback,
} from '../hooks/useVideoPlayback';

const rungs = () =>
  screen
    .getAllByRole('button')
    .filter((b) => /^\d+(\.\d+)?x$/.test(b.textContent ?? ''))
    .map((b) => b.textContent);
const lit = () =>
  screen
    .getAllByRole('button')
    .filter((b) => b.getAttribute('aria-pressed') === 'true')
    .map((b) => b.textContent);

describe('SpeedControl (FliHub skin of the shared control)', () => {
  it('shows exactly three rungs, centred on the rate, with the active one lit', () => {
    render(<SpeedControl value={2} onChange={vi.fn()} />);
    expect(rungs()).toEqual(['1.5x', '2x', '2.5x']);
    expect(lit()).toEqual(['2x']);
  });

  it('pins at the edges: 0.25x and 4x slide the window, and that chevron greys out', () => {
    const { rerender } = render(<SpeedControl value={0.25} onChange={vi.fn()} />);
    expect(rungs()).toEqual(['0.25x', '0.5x', '0.75x']);
    expect(screen.getByLabelText('Slower')).toBeDisabled();
    expect(screen.getByLabelText('Faster')).toBeEnabled();
    rerender(<SpeedControl value={4} onChange={vi.fn()} />);
    expect(rungs()).toEqual(['3x', '3.5x', '4x']);
    expect(screen.getByLabelText('Faster')).toBeDisabled();
    expect(screen.getByLabelText('Slower')).toBeEnabled();
  });

  it('chevrons step the rate one rung, like J and L', () => {
    const onChange = vi.fn();
    render(<SpeedControl value={2} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('Faster'));
    expect(onChange).toHaveBeenLastCalledWith(2.5);
    fireEvent.click(screen.getByLabelText('Slower'));
    expect(onChange).toHaveBeenLastCalledWith(1.5);
  });

  it('clicking a rung picks it; keys live in tooltips, not inline text', () => {
    const onChange = vi.fn();
    render(<SpeedControl value={2} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: '1.5x' }));
    expect(onChange).toHaveBeenCalledWith(1.5);
    expect(screen.getByLabelText('Faster').title).toMatch(/L/);
    expect(screen.getByLabelText('Slower').title).toMatch(/J/);
    expect(screen.queryByText(/J slower|L faster/)).toBeNull();
  });

  it('an off-ladder rate (stale localStorage) lights no rung', () => {
    render(<SpeedControl value={1.25} onChange={vi.fn()} />);
    expect(lit()).toEqual([]);
    expect(rungs()).toHaveLength(3);
  });

  it('disabled greys out every button', () => {
    render(<SpeedControl value={2} onChange={vi.fn()} disabled />);
    screen.getAllByRole('button').forEach((b) => expect(b).toBeDisabled());
  });
});

describe('VideoControlsBar (WatchPage and modal share it)', () => {
  it('renders the shared control at the playback speed', () => {
    render(
      <VideoControlsBar
        isPlaying={false}
        onPlayPause={vi.fn()}
        playbackSpeed={3}
        onSpeedChange={vi.fn()}
        videoSize="N"
        onSizeChange={vi.fn()}
        autoplay={false}
        onToggleAutoplay={vi.fn()}
        autoNext={false}
        onToggleAutoNext={vi.fn()}
      />
    );
    expect(screen.getByTestId('playback-speed')).toBeInTheDocument();
    expect(lit()).toEqual(['3x']);
  });
});

describe('speed ladder and defaults', () => {
  it('uses fli-core FORWARD_SPEEDS, and 2x stays the FliHub default', () => {
    expect(SPEED_PRESETS).toEqual([...FORWARD_SPEEDS]);
    expect(DEFAULT_SPEED).toBe(2);
    expect(FORWARD_SPEEDS).toContain(DEFAULT_SPEED);
  });
});

describe('jklPlayback (fli-core jkl)', () => {
  it('L: paused → 1x playing, else one rung faster; J: paused → 0.75x, else one slower; K → 1x', () => {
    expect(jklPlayback(false, 2, 'L')).toEqual({ playing: true, rate: 1 });
    expect(jklPlayback(true, 2, 'L')).toEqual({ playing: true, rate: 2.5 });
    expect(jklPlayback(false, 2, 'J')).toEqual({ playing: true, rate: 0.75 });
    expect(jklPlayback(true, 2, 'J')).toEqual({ playing: true, rate: 1.5 });
    expect(jklPlayback(true, 3, 'K')).toEqual({ playing: true, rate: 1 });
    expect(jklPlayback(true, 4, 'L').rate).toBe(4);
    expect(jklPlayback(true, 0.25, 'J').rate).toBe(0.25);
  });
});

describe('useVideoPlayback keys', () => {
  beforeEach(() => localStorage.clear());

  const key = (k: string, init: KeyboardEventInit = {}) =>
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, ...init }));
    });

  function mount() {
    const hook = renderHook(() => useVideoPlayback());
    const video = { paused: true, playbackRate: 1, play: vi.fn(() => { video.paused = false; return Promise.resolve(); }), pause: vi.fn() };
    (hook.result.current.videoRef as { current: unknown }).current = video;
    return { hook, video };
  }

  it('starts at 2x', () => {
    const { hook } = mount();
    expect(hook.result.current.playbackSpeed).toBe(2);
  });

  it('L while paused plays at 1x; again goes one rung faster (once playing)', () => {
    const { hook, video } = mount();
    key('l');
    expect(hook.result.current.playbackSpeed).toBe(1);
    expect(video.play).toHaveBeenCalled();
    expect(video.playbackRate).toBe(1);
    act(() => hook.result.current.videoEventHandlers.onPlay());
    key('L');
    expect(hook.result.current.playbackSpeed).toBe(1.5);
    expect(localStorage.getItem(SPEED_STORAGE_KEY)).toBe('1.5');
  });

  it('J while playing steps slower; K returns to 1x without pausing', () => {
    const { hook, video } = mount();
    act(() => hook.result.current.videoEventHandlers.onPlay());
    key('j');
    expect(hook.result.current.playbackSpeed).toBe(1.5);
    key('k');
    expect(hook.result.current.playbackSpeed).toBe(1);
    expect(video.pause).not.toHaveBeenCalled();
  });

  it('ignores J/K/L with a modifier and while typing in an input', () => {
    const { hook } = mount();
    key('l', { metaKey: true });
    expect(hook.result.current.playbackSpeed).toBe(2);
    const input = document.createElement('input');
    document.body.appendChild(input);
    act(() => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'l', bubbles: true }));
    });
    expect(hook.result.current.playbackSpeed).toBe(2);
    input.remove();
  });
});
