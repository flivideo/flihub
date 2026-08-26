/**
 * MicCheck — Phase 1: "am I loud enough?"
 *
 * Three metrics only: short-term loudness (the gain needle), sample peak (a guard), and
 * clip counts. Everything else in the spec — SNR, spectrum, proximity, pattern detection
 * — is Phase 2+ and deliberately absent rather than stubbed, because a stubbed metric
 * showing a plausible number is worse than no metric at all.
 *
 * See docs/miccheck-build-spec.md §6.
 */

import { useState } from 'react';
import { useMicAnalyser } from '../hooks/useMicAnalyser';
import {
  gradeShortTermLoudness,
  gradeTruePeak,
  gradeClipping,
  hasSpeechSignal,
  SHORT_TERM_GREEN,
  type Grade,
  type Reading,
} from '../utils/micGrading';

const GRADE_STYLES: Record<Grade, { dot: string; card: string; text: string; label: string }> = {
  green: {
    dot: 'bg-green-500',
    card: 'border-green-300 bg-green-50',
    text: 'text-green-800',
    label: 'In range',
  },
  orange: {
    dot: 'bg-orange-500',
    card: 'border-orange-300 bg-orange-50',
    text: 'text-orange-900',
    label: 'Improvable',
  },
  red: {
    dot: 'bg-red-500',
    card: 'border-red-300 bg-red-50',
    text: 'text-red-900',
    label: 'Will damage the recording',
  },
  grey: {
    dot: 'bg-gray-400',
    card: 'border-warm bg-surface-muted',
    text: 'text-warm-secondary',
    label: 'Not yet measurable',
  },
};

function MetricCard({
  title,
  reading,
  subtitle,
}: {
  title: string;
  reading: Reading;
  subtitle?: string;
}) {
  const [showBasis, setShowBasis] = useState(false);
  const style = GRADE_STYLES[reading.grade];

  return (
    <div className={`rounded-lg border p-4 ${style.card}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className={`inline-block w-2.5 h-2.5 rounded-full ${style.dot}`} />
            <h3 className="text-sm font-medium text-warm-primary">{title}</h3>
          </div>
          {subtitle && <p className="text-xs text-warm-muted mt-0.5 ml-4.5">{subtitle}</p>}
        </div>
        <button
          onClick={() => setShowBasis((v) => !v)}
          className="text-xs text-warm-muted hover:text-warm-secondary underline shrink-0"
          title="Where does this threshold come from?"
        >
          why?
        </button>
      </div>

      <div className="mt-3 font-mono text-2xl text-warm-primary tabular-nums">
        {reading.value ?? <span className="text-warm-faint text-lg">—</span>}
      </div>

      <div className={`mt-1 text-xs font-medium ${style.text}`}>{style.label}</div>

      {reading.message && (
        <p className={`mt-2 text-sm leading-snug ${style.text}`}>
          {reading.grade !== 'grey' && <span className="mr-1">↑</span>}
          {reading.message}
        </p>
      )}

      {showBasis && (
        <div className="mt-3 pt-3 border-t border-warm text-xs text-warm-secondary leading-relaxed">
          <span className="font-medium">
            {reading.isConvention ? '🔶 Convention — ' : '📄 Standard — '}
          </span>
          {reading.basis}
        </div>
      )}
    </div>
  );
}

/** Four-way constraint display. Chrome accepting an `exact` constraint is the strongest
 *  in-browser proof that processing is genuinely off — but only above the OS line. */
function ConstraintTable({ report }: { report: NonNullable<ReturnType<typeof useMicAnalyser>['constraints']> }) {
  const flags = ['echoCancellation', 'noiseSuppression', 'autoGainControl', 'voiceIsolation'];
  const got = report.got as Record<string, unknown>;
  const capable = (report.capable ?? {}) as Record<string, unknown>;
  const supported = report.supported as unknown as Record<string, boolean>;
  const asked = report.asked as Record<string, unknown>;

  const render = (v: unknown): string => {
    if (v === undefined) return '—';
    if (v === null) return 'null';
    if (typeof v === 'object') {
      const o = v as Record<string, unknown>;
      if ('exact' in o) return `exact:${String(o.exact)}`;
      if ('ideal' in o) return `ideal:${String(o.ideal)}`;
      return JSON.stringify(v);
    }
    return String(v);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs font-mono">
        <thead>
          <tr className="text-left text-warm-muted border-b border-warm">
            <th className="py-1.5 pr-4 font-medium">constraint</th>
            <th className="py-1.5 pr-4 font-medium">asked</th>
            <th className="py-1.5 pr-4 font-medium">got</th>
            <th className="py-1.5 pr-4 font-medium">capable</th>
            <th className="py-1.5 font-medium">supported</th>
          </tr>
        </thead>
        <tbody className="text-warm-secondary">
          {[...flags, 'sampleRate', 'channelCount', 'sampleSize'].map((key) => {
            const gotValue = got[key];
            const isProcessingFlag = flags.includes(key);
            const clean = isProcessingFlag && gotValue === false;
            return (
              <tr key={key} className="border-b border-warm/40">
                <td className="py-1.5 pr-4 text-warm-primary">{key}</td>
                <td className="py-1.5 pr-4">{render(asked[key])}</td>
                <td className={`py-1.5 pr-4 ${clean ? 'text-green-700 font-medium' : ''}`}>
                  {render(gotValue)}
                </td>
                <td className="py-1.5 pr-4">{render(capable[key])}</td>
                <td className="py-1.5">{supported[key] === undefined ? '—' : String(supported[key])}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function MicCheckPage() {
  const {
    status,
    error,
    device,
    constraints,
    metrics,
    probe,
    probeRunning,
    start,
    stop,
    runProcessingProbe,
  } = useMicAnalyser();

  const [showConstraints, setShowConstraints] = useState(false);

  const running = status === 'running';
  const signal = hasSpeechSignal(metrics.shortTermLufs, metrics.windowFull);

  const loudness = gradeShortTermLoudness({
    shortTermLufs: metrics.shortTermLufs,
    windowFull: metrics.windowFull,
    windowFillRatio: metrics.windowFillRatio,
  });
  const peak = gradeTruePeak({ samplePeakDbfs: metrics.samplePeakDbfs, hasSignal: signal });
  const clipping = gradeClipping({
    clipCount: metrics.clipCount,
    nearClipCount: metrics.nearClipCount,
    hasSignal: signal,
  });

  // Position of the current reading on the -40..-10 LUFS scale, for the bar.
  const barPercent = Number.isFinite(metrics.shortTermLufs)
    ? Math.max(0, Math.min(100, ((metrics.shortTermLufs + 40) / 30) * 100))
    : 0;
  const greenStart = ((SHORT_TERM_GREEN[0] + 40) / 30) * 100;
  const greenWidth = ((SHORT_TERM_GREEN[1] - SHORT_TERM_GREEN[0]) / 30) * 100;

  return (
    <section className="max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-medium text-warm-secondary">Mic Check</h2>
          <p className="text-sm text-warm-muted mt-0.5">
            Set your gain by loudness, not by peaks. Phase 1 — level only.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {running ? (
            <button
              onClick={stop}
              className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
            >
              Stop
            </button>
          ) : (
            <button
              onClick={start}
              disabled={status === 'starting'}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50"
            >
              {status === 'starting' ? 'Opening microphone…' : 'Start monitoring'}
            </button>
          )}
        </div>
      </div>

      {/* UI rule 1: the device name is ALWAYS on screen. Picking the wrong one
          silently invalidates every number below it. */}
      {device && (
        <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 rounded border border-warm bg-surface-muted text-sm">
          <span className={`inline-block w-2 h-2 rounded-full ${running ? 'bg-green-500' : 'bg-gray-400'}`} />
          <span className="font-medium text-warm-primary">{device.label}</span>
          <span className="text-warm-muted font-mono text-xs">
            {metrics.sampleRate ? `${(metrics.sampleRate / 1000).toFixed(0)} kHz` : '—'} ·{' '}
            {metrics.channelCount ? `${metrics.channelCount} ch` : '—'}
            {constraints?.got.sampleSize ? ` · ${constraints.got.sampleSize}-bit` : ''}
          </span>
          <button
            onClick={() => setShowConstraints((v) => !v)}
            className="ml-auto text-xs text-warm-muted hover:text-warm-secondary underline"
          >
            {showConstraints ? 'hide' : 'show'} constraints
          </button>
        </div>
      )}

      {showConstraints && constraints && (
        <div className="mb-4 p-3 rounded border border-warm bg-surface">
          <ConstraintTable report={constraints} />
          <p className="mt-3 text-xs text-warm-muted leading-relaxed">
            <span className="font-medium">What this proves, and what it does not.</span> All four
            processing flags were requested as <code>exact: false</code>, so Chrome accepted a{' '}
            <em>required</em> constraint rather than ignoring an advisory one — had it been unable
            to comply, opening the microphone would have failed outright. But{' '}
            <code>getSettings()</code> only ever reports Chrome&apos;s view of Chrome&apos;s own
            chain. It cannot see below the browser: if macOS applied a system-level Mic Mode, this
            table would still read <code>false</code> and be telling the truth. Run the processing
            probe below to test that.
          </p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 rounded border border-red-300 bg-red-50">
          <h3 className="text-sm font-medium text-red-900">{error.title}</h3>
          <p className="mt-1 text-sm text-red-800 leading-snug">{error.detail}</p>
          {error.devicesSeen && error.devicesSeen.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium text-red-900">Inputs seen:</p>
              <ul className="mt-1 text-xs font-mono text-red-800 space-y-0.5">
                {error.devicesSeen.map((d) => (
                  <li key={d.deviceId}>• {d.label}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {status === 'idle' && !error && (
        <div className="p-4 rounded border border-warm bg-surface-muted text-sm text-warm-secondary leading-relaxed">
          <p>
            This measures <strong>short-term loudness</strong> — a 3-second window — because that
            is the number that tells you whether your voice is loud enough. The peak meter is not
            that number: a single transient can park the peak ~28&nbsp;dB above your speech, which
            is how a take can look healthy on peaks and still land 20&nbsp;dB too quiet.
          </p>
          <p className="mt-2">
            Press <strong>Start monitoring</strong>, talk normally at your recording distance, and
            adjust the QuadCast&apos;s gain knob until the level reads green.
          </p>
        </div>
      )}

      {running && (
        <>
          {/* Loudness bar — the primary needle */}
          <div className="mb-4 p-4 rounded-lg border border-warm bg-surface">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-sm font-medium text-warm-primary">Short-term loudness</span>
              <span className="text-xs text-warm-muted font-mono">3 s window · ungated</span>
            </div>
            <div className="relative h-8 rounded bg-surface-muted overflow-hidden border border-warm">
              <div
                className="absolute inset-y-0 bg-green-200"
                style={{ left: `${greenStart}%`, width: `${greenWidth}%` }}
              />
              {metrics.windowFull && Number.isFinite(metrics.shortTermLufs) && (
                <div
                  className="absolute inset-y-0 w-1 bg-warm-primary"
                  style={{ left: `${barPercent}%` }}
                />
              )}
            </div>
            <div className="flex justify-between mt-1 text-[10px] text-warm-muted font-mono">
              <span>-40</span>
              <span>-33</span>
              <span className="text-green-700 font-medium">-26 … -20</span>
              <span>-16</span>
              <span>-10 LUFS</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              title="Short-term loudness"
              subtitle="the gain needle"
              reading={loudness}
            />
            <MetricCard
              title="Sample peak"
              subtitle="session max — a guard, not a target"
              reading={peak}
            />
            <MetricCard title="Clipping" subtitle="cumulative this session" reading={clipping} />
          </div>

          {/* Gate 3 — the system-processing probe */}
          <div className="mt-4 p-4 rounded-lg border border-warm bg-surface">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-medium text-warm-primary">System-processing probe</h3>
                <p className="text-xs text-warm-muted mt-0.5 max-w-2xl leading-relaxed">
                  Plays 3 s of noise through your <strong>speakers</strong> and listens for gating
                  or notching. This is the only check that can distinguish &ldquo;no
                  processing&rdquo; from &ldquo;processing Chrome cannot see&rdquo;. Turn your
                  speakers on and up to a normal level first.
                </p>
              </div>
              <button
                onClick={runProcessingProbe}
                disabled={probeRunning}
                className="px-3 py-1.5 text-sm border border-warm-strong rounded hover:bg-surface-hover transition-colors disabled:opacity-50 shrink-0"
              >
                {probeRunning ? 'Listening…' : 'Run probe'}
              </button>
            </div>

            {probe && (
              <div
                className={`mt-3 p-3 rounded border ${
                  probe.verdict === 'clean'
                    ? 'border-green-300 bg-green-50'
                    : probe.verdict === 'suspicious'
                      ? 'border-orange-300 bg-orange-50'
                      : 'border-warm bg-surface-muted'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block w-2.5 h-2.5 rounded-full ${
                      probe.verdict === 'clean'
                        ? 'bg-green-500'
                        : probe.verdict === 'suspicious'
                          ? 'bg-orange-500'
                          : 'bg-gray-400'
                    }`}
                  />
                  <span className="text-sm font-medium text-warm-primary">
                    {probe.verdict === 'clean'
                      ? 'No hidden processing detected'
                      : probe.verdict === 'suspicious'
                        ? 'Something is processing this signal'
                        : 'Inconclusive — the test did not run'}
                  </span>
                </div>
                <ul className="mt-2 space-y-1">
                  {probe.findings.map((f, i) => (
                    <li key={i} className="text-sm text-warm-secondary leading-snug">
                      • {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-2 text-xs font-mono text-warm-muted">
                  captured {probe.capturedLevelDbfs.toFixed(1)} dBFS · drift{' '}
                  {probe.levelDriftDb.toFixed(1)} dB · deepest notch{' '}
                  {probe.deepestNotchDb.toFixed(1)} dB
                </div>
              </div>
            )}
          </div>

          <p className="mt-4 text-xs text-warm-muted leading-relaxed">
            <span className="font-medium">Phase 1 scope.</span> Loudness, peak and clipping only.
            No SNR, spectrum, proximity or pattern detection yet — those need speech/pause gating
            and a room-tone reference (Phase 2). Peak is <em>sample</em> peak, not true peak: without
            4× oversampling it can read up to ~3 dB low on inter-sample peaks, so treat it as
            slightly optimistic. These are <strong>capture</strong> targets; audio-clean applies
            make-up gain for delivery later.
          </p>
        </>
      )}
    </section>
  );
}
