/**
 * The end-of-run report — what a session actually found, in sentences.
 *
 * Pressing Stop used to return you to a blank start screen while a complete record was
 * written to disk that nothing on screen ever showed. This is that record.
 *
 * A report answers "can I use this, and what do I fix?" — not "here are some numbers".
 * So it leads with a verdict and an action, and the statistics sit underneath as evidence.
 */

import type { MicCheckSession } from '../../../shared/types';
import { SHORT_TERM_TARGET_LUFS, SHORT_TERM_GREEN } from '../utils/micGrading';

/** Where the session's loudness sat, and therefore what to do about it. */
function verdictFor(session: MicCheckSession): {
  tone: 'good' | 'bad' | 'unknown';
  headline: string;
  action: string | null;
  detail: string;
} {
  const s = session.summary;

  if (!s || s.measurableTickCount === 0 || !s.shortTermLufs) {
    const contaminated = session.events.some((e) => e.kind === 'room-contaminated');
    return {
      tone: 'unknown',
      headline: 'Nothing gradeable was captured',
      action: null,
      detail: contaminated
        ? 'Every sample was recorded in ROOM mode, but speech was detected throughout — so the ' +
          'run measured your voice while believing it was measuring silence. Switch to SPEAKING ' +
          'before you start talking.'
        : 'No sample reached a full 3 s window with speech present. Either nothing was said, or ' +
          'the run was too short. This is not a pass — it is an absence of measurement.',
    };
  }

  const { mean, min, max } = s.shortTermLufs;
  const [low, high] = SHORT_TERM_GREEN;
  const gap = SHORT_TERM_TARGET_LUFS - mean;
  const drift = s.driftLu ?? 0;
  const inBand = mean >= low && mean <= high;

  if (!inBand) {
    const direction = gap > 0 ? 'up' : 'down';
    return {
      tone: 'bad',
      headline: `Your level was ${Math.abs(Math.round(gap))} dB ${gap > 0 ? 'too quiet' : 'too loud'}`,
      action: `Turn the GAIN knob ${direction} about ${Math.abs(Math.round(gap))} dB before your next take.`,
      detail:
        gap > 0
          ? `You averaged ${mean.toFixed(1)} LUFS against a target of ${SHORT_TERM_TARGET_LUFS}. ` +
            `Your peak reached ${s.sessionPeakDbfs?.toFixed(1) ?? '—'} dBFS — nowhere near clipping, ` +
            'which is exactly why a peak meter would have told you everything was fine.'
          : `You averaged ${mean.toFixed(1)} LUFS. That is close enough to the ceiling that an ` +
            'unrehearsed loud moment would clip, and clipping cannot be repaired.',
    };
  }

  if (drift > 3) {
    return {
      tone: 'bad',
      headline: 'Level was in range, but it moved',
      action: 'Mark your seat position before recording, and glance at the meter once a minute.',
      detail:
        `You ranged ${min.toFixed(1)} to ${max.toFixed(1)} LUFS — a spread of ${drift.toFixed(1)} LU. ` +
        'A sliding level is usually distance, not gain: leaning back as you settle in. Halving your ' +
        'distance to the mic is worth about 6 dB.',
    };
  }

  return {
    tone: 'good',
    headline: 'Good take — level held steady',
    action: null,
    detail:
      `You averaged ${mean.toFixed(1)} LUFS and stayed within ${drift.toFixed(1)} LU across the run. ` +
      'Nothing to change.',
  };
}

function Stat({ label, value, meaning }: { label: string; value: string; meaning: string }) {
  return (
    <div className="border border-warm rounded p-3 bg-surface">
      <div className="text-[11px] font-medium uppercase tracking-wider text-warm-muted">{label}</div>
      <div className="font-mono text-xl text-warm-primary mt-0.5 tabular-nums">{value}</div>
      <div className="text-xs text-warm-muted leading-snug mt-0.5">{meaning}</div>
    </div>
  );
}

/** The level over time. Steady and drifting must be distinguishable at a glance. */
function SeriesChart({ session }: { session: MicCheckSession }) {
  const points = session.series.filter(
    (t) => t.mode === 'speaking' && t.speechDetected && typeof t.shortTermLufs === 'number'
  );
  if (points.length < 2) return null;

  const W = 640;
  const H = 130;
  const TOP = -14;
  const BOTTOM = -46;
  const y = (v: number) => ((TOP - v) / (TOP - BOTTOM)) * H;
  const x = (i: number) => (i / (points.length - 1)) * W;

  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.shortTermLufs!).toFixed(1)}`)
    .join(' ');

  return (
    <div className="border border-warm rounded bg-surface p-3">
      <div className="text-[11px] font-medium uppercase tracking-wider text-warm-muted mb-2">
        Your level, second by second
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block">
        <rect x={0} y={y(SHORT_TERM_GREEN[1])} width={W}
          height={y(SHORT_TERM_GREEN[0]) - y(SHORT_TERM_GREEN[1])} fill="#cde3d4" />
        <line x1={0} y1={y(SHORT_TERM_GREEN[1])} x2={W} y2={y(SHORT_TERM_GREEN[1])} stroke="#2f7d52" strokeWidth={1} />
        <line x1={0} y1={y(SHORT_TERM_GREEN[0])} x2={W} y2={y(SHORT_TERM_GREEN[0])} stroke="#2f7d52" strokeWidth={1} />
        <path d={path} fill="none" stroke="#342d2d" strokeWidth={2} strokeLinejoin="round" />
      </svg>
      <div className="flex justify-between text-[10px] font-mono text-warm-muted mt-1">
        <span>start</span>
        <span className="text-green-700">target band −26 … −20</span>
        <span>end</span>
      </div>
    </div>
  );
}

export function MicCheckReport({ session, onDismiss }: { session: MicCheckSession; onDismiss: () => void }) {
  const v = verdictFor(session);
  const s = session.summary;

  const tone = {
    good: 'border-green-300 bg-green-50 text-green-900',
    bad: 'border-red-300 bg-red-50 text-red-900',
    unknown: 'border-warm bg-surface-muted text-warm-secondary',
  }[v.tone];

  const seconds = Math.round((s?.durationMs ?? 0) / 1000);

  return (
    <div className="mb-4">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm font-medium text-warm-primary">
          Session report <span className="text-warm-muted font-normal">· {seconds}s · {s?.tickCount ?? 0} samples</span>
        </h3>
        <button onClick={onDismiss} className="text-xs text-warm-muted hover:text-warm-secondary underline">
          dismiss
        </button>
      </div>

      <div className={`rounded-lg border p-4 ${tone}`}>
        <div className="text-xl font-medium">{v.headline}</div>
        {v.action && <div className="mt-1.5 text-base font-medium">▶ {v.action}</div>}
        <p className="mt-2 text-sm leading-relaxed">{v.detail}</p>
      </div>

      {s && s.shortTermLufs && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
          <Stat label="Average" value={`${s.shortTermLufs.mean.toFixed(1)}`}
            meaning={`LUFS. Target is ${SHORT_TERM_TARGET_LUFS}.`} />
          <Stat label="Drift" value={`${(s.driftLu ?? 0).toFixed(1)} LU`}
            meaning="Quietest to loudest. Over ~3 means you moved." />
          <Stat label="Loudest peak" value={`${s.sessionPeakDbfs?.toFixed(1) ?? '—'}`}
            meaning="dBFS. A guard, never a target." />
          <Stat label="Clipping" value={`${s.clipCount}`} meaning="Clipped audio is destroyed, not quiet." />
        </div>
      )}

      <div className="mt-3">
        <SeriesChart session={session} />
      </div>

      {session.events.length > 0 && (
        <div className="mt-3 border border-warm rounded bg-surface p-3">
          <div className="text-[11px] font-medium uppercase tracking-wider text-warm-muted mb-2">
            What it noticed · {session.events.length}
          </div>
          <ul className="space-y-1 max-h-40 overflow-y-auto">
            {session.events.slice(-12).map((e, i) => (
              <li key={i} className="text-sm text-warm-secondary font-mono">
                <span className="text-warm-muted">{(e.t / 1000).toFixed(1)}s</span> · {e.label}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* not_measured, shown rather than buried — absence must not read as success */}
      <details className="mt-3 border border-warm rounded bg-surface-muted p-3">
        <summary className="text-[11px] font-medium uppercase tracking-wider text-warm-muted cursor-pointer">
          What this report does NOT tell you · {session.not_measured.length}
        </summary>
        <ul className="mt-2 space-y-1.5">
          {session.not_measured.map((n, i) => (
            <li key={i} className="text-xs text-warm-secondary leading-snug">
              <span className="font-mono text-warm-primary">{n.metric}</span> — {n.reason}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
