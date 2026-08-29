/**
 * MicCheck Phase 1.6 — the snapshot verdict test.
 *
 * Replaces "watch a running meter and do the arithmetic yourself" with "press a button,
 * talk for 10 seconds, get a check/fail per metric and one sentence telling you what to
 * do." See docs/miccheck-build-spec.md §9 for why: a live 20-minute walkthrough of the
 * Phase 1.5 continuous meter showed the person running it could not use it unassisted —
 * every reading needed someone else to do the "-23 minus your number" math out loud.
 *
 * Deliberately its OWN palette (client/index.html loads Oswald + Roboto Mono for it) —
 * true neutral chrome with green/amber/red as the only saturated color, not FliHub's warm
 * theme. That is not an oversight; a warm palette was tried first and rejected on the
 * merits (an instrument reads its status lights, not its housing) — §9 note in the spec.
 *
 * Grading is NOT reimplemented here. Every Reading comes straight out of micGrading.ts —
 * the same functions the continuous mode uses — computed from the live `metrics` at the
 * moment the 10 s window closes. The zone tracks are pure presentation over those same
 * values (micZones.ts), imported from the same thresholds, so the track can never
 * disagree with the disc it sits under.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { useMicAnalyser } from '../hooks/useMicAnalyser';
import {
  gradeShortTermLoudness,
  gradeTruePeak,
  gradeClipping,
  hasSpeechSignal,
  type Grade,
  type Reading,
} from '../utils/micGrading';
import { loudnessTrack, peakTrack, clipTrack, type TrackSpec, type ZoneKind } from '../utils/micZones';

type Analyser = ReturnType<typeof useMicAnalyser>;
type Phase = 'idle' | 'testing' | 'verdict';

const TEST_DURATION_MS = 10_000;
const RING_RADIUS = 104;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

interface VerdictRowData {
  key: string;
  label: string;
  reading: Reading;
  track: TrackSpec;
}

// Reading.message is null on a green grade (micGrading.ts's own convention — silence is
// not an instruction). The snapshot screen never leaves a row blank, so each metric names
// its own pass sentence here rather than inventing one inside the shared grading module.
const PASS_MESSAGE: Record<string, string> = {
  loudness: 'In the target band — nothing to change.',
  peak: 'Plenty of headroom.',
  clipping: 'None — nothing to fix.',
};

const GRADE_ICON: Record<Grade, string> = { green: '✓', orange: '!', red: '✗', grey: '–' };

const GRADE_STYLE: Record<Grade, { discBg: string; discText: string; marker: string }> = {
  green: { discBg: 'bg-[#d9f2e3]', discText: 'text-[#15873f]', marker: 'bg-[#15873f]' },
  orange: { discBg: 'bg-[#fbe6c2]', discText: 'text-[#c46a00]', marker: 'bg-[#c46a00]' },
  red: { discBg: 'bg-[#fbdcd9]', discText: 'text-[#d32f2f]', marker: 'bg-[#d32f2f]' },
  grey: { discBg: 'bg-[#e7e9ec]', discText: 'text-[#5b6169]', marker: 'bg-[#9aa1a9]' },
};

// Zone color is fixed by MEANING, not by the current grade — the green bracket is always
// "aim here", the amber/red bands are always "this is the danger area", independent of
// where today's reading happens to land. Only the marker dot carries the live grade.
const ZONE_STYLE: Record<ZoneKind, string> = {
  target: 'border-2 border-dashed border-[#15873f] bg-[#d9f2e3]',
  caution: 'border-y-2 border-[#c46a00] bg-[#fbe6c2]',
  danger: 'border-y-2 border-[#d32f2f] bg-[#fbdcd9]',
};

function TrackVisual({ track, grade }: { track: TrackSpec; grade: Grade }) {
  const marker = GRADE_STYLE[grade].marker;
  return (
    <div>
      <div className="relative h-8">
        <div className="absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2 rounded bg-[#e7e9ec]" />
        {track.zones.map((z, i) => (
          <div
            key={i}
            className={`absolute top-1/2 h-5 -translate-y-1/2 rounded ${ZONE_STYLE[z.kind]}`}
            style={{ left: `${z.startPct}%`, width: `${z.widthPct}%` }}
          />
        ))}
        <div
          className={`absolute top-1/2 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[3px] border-white text-[11px] font-bold text-white shadow-[0_0_0_1.5px_#d7dbe0] ${marker}`}
          style={{ left: `${track.markerPct}%` }}
        >
          {GRADE_ICON[grade]}
        </div>
      </div>
      <div className="mt-1 flex justify-between font-mono text-[11px] uppercase tracking-wide text-[#5b6169]">
        <span>{track.poleLeft}</span>
        <span>{track.poleRight}</span>
      </div>
    </div>
  );
}

function VerdictRow({
  row,
  open,
  onToggle,
}: {
  row: VerdictRowData;
  open: boolean;
  onToggle: () => void;
}) {
  const { reading } = row;
  const style = GRADE_STYLE[reading.grade];
  const sentence = reading.message ?? PASS_MESSAGE[row.key] ?? 'Nothing to fix.';

  return (
    <div className="border border-[#d7dbe0] bg-white p-5">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-4 text-left"
      >
        <span
          className={`flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full text-2xl font-bold ${style.discBg} ${style.discText}`}
        >
          {GRADE_ICON[reading.grade]}
        </span>
        <span className="flex-grow font-['Oswald'] text-lg font-medium leading-snug text-[#16181b]">
          {sentence}
        </span>
        <span className="shrink-0 font-mono text-lg font-bold tabular-nums text-[#16181b]">
          {reading.value ?? '—'}
        </span>
        <span
          className={`shrink-0 text-[#9aa1a9] transition-transform ${open ? 'rotate-180' : ''}`}
        >
          ▾
        </span>
      </button>

      <div className="ml-[4.5rem] mt-4">
        <TrackVisual track={row.track} grade={reading.grade} />
      </div>

      {open && (
        <div className="ml-[4.5rem] mt-3 max-w-[46ch] border-t border-[#d7dbe0] pt-3 text-sm text-[#5b6169]">
          {reading.basis}
        </div>
      )}
    </div>
  );
}

export function MicCheckSnapshot({
  analyser,
  onSwitchToContinuous,
}: {
  analyser: Analyser;
  onSwitchToContinuous: () => void;
}) {
  const { status, metrics, start, setMode, getWaveform } = analyser;

  const [phase, setPhase] = useState<Phase>('idle');
  const [countdownLabel, setCountdownLabel] = useState('10s');
  const [verdict, setVerdict] = useState<VerdictRowData[] | null>(null);
  const [openKey, setOpenKey] = useState<string | null>(null);

  const ringFillRef = useRef<SVGCircleElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const lastWholeSecondRef = useRef(-1);

  // The loop reads whatever `metrics` currently holds without going through React state,
  // since re-rendering this component 60x/sec to read one object would be pointless work.
  const metricsRef = useRef(metrics);
  metricsRef.current = metrics;

  const finishTest = useCallback(() => {
    const m = metricsRef.current;
    const signal = hasSpeechSignal(m.shortTermLufs, m.windowFull);

    const loudness = gradeShortTermLoudness({
      shortTermLufs: m.shortTermLufs,
      windowFull: m.windowFull,
      windowFillRatio: m.windowFillRatio,
    });
    const peak = gradeTruePeak({ samplePeakDbfs: m.samplePeakDbfs, hasSignal: signal });
    const clipping = gradeClipping({
      clipCount: m.clipCount,
      nearClipCount: m.nearClipCount,
      hasSignal: signal,
    });

    setVerdict([
      { key: 'loudness', label: 'Loudness', reading: loudness, track: loudnessTrack(m.shortTermLufs) },
      { key: 'peak', label: 'Peak', reading: peak, track: peakTrack(m.samplePeakDbfs) },
      { key: 'clipping', label: 'Clipping', reading: clipping, track: clipTrack(m.clipCount) },
    ]);
    setOpenKey(null);
    analyser.stop();
    setPhase('verdict');
  }, [analyser]);

  const runTest = useCallback(() => {
    setVerdict(null);
    setPhase('testing');
    setCountdownLabel('10s');
    lastWholeSecondRef.current = -1;
    void start();
  }, [start]);

  // Only begins counting down once the device is actually live — the async permission /
  // device-open gap must not eat into the 10 s window.
  useEffect(() => {
    if (phase !== 'testing' || status !== 'running') return;
    setMode('speaking');
    startedAtRef.current = performance.now();

    const tick = () => {
      const elapsed = performance.now() - startedAtRef.current;
      const remaining = Math.max(0, TEST_DURATION_MS - elapsed);
      const pct = 1 - remaining / TEST_DURATION_MS;

      if (ringFillRef.current) {
        ringFillRef.current.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - pct));
      }
      const whole = Math.ceil(remaining / 1000);
      if (whole !== lastWholeSecondRef.current) {
        lastWholeSecondRef.current = whole;
        setCountdownLabel(`${whole}s`);
      }
      drawWaveform();

      if (remaining <= 0) {
        finishTest();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // finishTest is stable via useCallback; re-running this effect on every metrics tick
    // would restart the countdown, which is exactly what must not happen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, status, setMode]);

  // If the device fails mid-test (unplugged, permission revoked), fall back to idle so the
  // top-level error panel (driven by `analyser.error`) is what the user sees, not a frozen
  // countdown.
  useEffect(() => {
    if (phase === 'testing' && status === 'error') {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      setPhase('idle');
    }
  }, [phase, status]);

  function drawWaveform() {
    const canvas = canvasRef.current;
    const data = getWaveform();
    if (!canvas || !data) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#5b6169';
    const bars = 64;
    const step = data.length / bars;
    const barWidth = width / bars;
    for (let i = 0; i < bars; i++) {
      const sample = data[Math.floor(i * step)] / 255 - 0.5; // -0.5..0.5, centre = silence
      const barHeight = Math.max(2, Math.abs(sample) * 2 * height);
      ctx.fillRect(i * barWidth + 1, (height - barHeight) / 2, Math.max(1, barWidth - 2), barHeight);
    }
  }

  return (
    <div className="bg-[#f4f5f6] p-6">
      {phase === 'idle' && (
        <div className="flex flex-col items-center gap-6 py-14">
          <button
            type="button"
            onClick={runTest}
            className="flex h-44 w-44 items-center justify-center rounded-full bg-[#16181b] font-['Oswald'] text-base font-semibold uppercase tracking-wide text-white transition-transform hover:scale-[1.02]"
          >
            Test mic
          </button>
          <p className="max-w-xs text-center text-sm text-[#5b6169]">
            Press the button, then talk normally for 10 seconds.
          </p>
        </div>
      )}

      {phase === 'testing' && (
        <div className="flex flex-col items-center gap-6 py-14">
          <div className="relative flex h-56 w-56 items-center justify-center">
            <svg viewBox="0 0 220 220" className="absolute inset-0 -rotate-90">
              <circle cx={110} cy={110} r={RING_RADIUS} fill="none" stroke="#e7e9ec" strokeWidth={5} />
              <circle
                ref={ringFillRef}
                cx={110}
                cy={110}
                r={RING_RADIUS}
                fill="none"
                stroke="#16181b"
                strokeWidth={5}
                strokeLinecap="round"
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={RING_CIRCUMFERENCE}
                style={{ transition: 'stroke-dashoffset 0.1s linear' }}
              />
            </svg>
            <div className="absolute -top-10 font-mono text-sm tabular-nums text-[#5b6169]">
              {status === 'starting' ? 'opening mic…' : countdownLabel}
            </div>
            <div className="flex h-44 w-44 items-center justify-center rounded-full bg-[#16181b] font-['Oswald'] text-base font-semibold uppercase tracking-wide text-white">
              Listening
            </div>
          </div>
          <canvas ref={canvasRef} width={420} height={64} className="h-16 w-full max-w-md" />
          <p className="text-sm text-[#5b6169]">Talk at your normal recording distance.</p>
        </div>
      )}

      {phase === 'verdict' && verdict && (
        <div className="flex flex-col gap-3">
          {verdict.map((row) => (
            <VerdictRow
              key={row.key}
              row={row}
              open={openKey === row.key}
              onToggle={() => setOpenKey((k) => (k === row.key ? null : row.key))}
            />
          ))}
          <button
            type="button"
            onClick={runTest}
            className="w-full bg-[#16181b] py-5 font-['Oswald'] text-base font-semibold uppercase tracking-wide text-white transition-opacity hover:opacity-90"
          >
            Test again
          </button>
        </div>
      )}

      <div className="mt-6 border-t border-[#d7dbe0] pt-4 text-center">
        <button
          type="button"
          onClick={onSwitchToContinuous}
          className="text-xs uppercase tracking-wide text-[#9aa1a9] underline hover:text-[#5b6169]"
        >
          Switch to live monitor
        </button>
      </div>
    </div>
  );
}
