/**
 * MicCheck Phase 1 — microphone acquisition and live measurement.
 *
 * The single most important job of this hook is NOT measuring. It is refusing to
 * measure the wrong device. The macOS default input on this machine is
 * `krisp microphone`, a mono virtual device that applies AI noise removal before
 * anything downstream sees the audio. A plain `{audio: true}` gets that stream, and
 * every number MicCheck could then display would be fiction — a spectacular,
 * entirely fake noise-rejection result. So the device is pinned by deviceId and any
 * virtual device is rejected outright rather than measured with a caveat.
 *
 * See docs/miccheck-build-spec.md §5.2.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { API_URL } from '../config';
import { TrajectoryTracker, type TrajectoryReading } from '../utils/micTrajectory';
import { SHORT_TERM_TARGET_LUFS } from '../utils/micGrading';
import type { MicCheckSession } from '../../../shared/types';

// ---------------------------------------------------------------------------
// Device policy
// ---------------------------------------------------------------------------

/** The physical microphone this tool is calibrated for. Matched by label — device IDs
 *  are salted per-origin and rotate when site data is cleared, so the label is durable. */
export const TARGET_DEVICE_PATTERN = /quadcast|hyperx/i;

/** Anything that interposes DSP between the capsule and the browser. Never measurable. */
export const VIRTUAL_DEVICE_PATTERN =
  /krisp|virtual|ecamm|teams|blackhole|loopback|soundflower|aggregate|multi-?output|obs|voicemeeter/i;

/** Device is fixed at 48 kHz (capabilities min = max), so no resampler can enter the path. */
const TARGET_SAMPLE_RATE = 48000;

/** Below this, the meter has no speech to measure and must say so rather than advise.
 *  Grounded in Appendix A: room tone measured -61.5 LUFS, speech -39.0 LUFS. */
export const SPEECH_FLOOR_LUFS = -50;

/**
 * How often rolling metrics are POSTed to the server.
 *
 * The worklet emits ~23 Hz. Posting at that rate would be ~23x the traffic for no extra
 * insight — the underlying measurement is a 3 s window, so consecutive emissions overlap
 * almost entirely. 1 Hz still resolves drift over a session, which is the question the
 * series exists to answer.
 */
export const TICK_POST_INTERVAL_MS = 1000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MicStatus = 'idle' | 'starting' | 'running' | 'error';

/**
 * DECLARED by the operator, never inferred (spec §3.0). ROOM characterises the background
 * noise; SPEAKING grades the voice. Guessing which one someone is in means a wrong guess
 * produces a confidently wrong reading.
 */
export type MicMode = 'room' | 'speaking';

export interface MicMetrics {
  shortTermLufs: number;
  samplePeakDbfs: number;
  samplePeakLinear: number;
  clipCount: number;
  nearClipCount: number;
  windowFull: boolean;
  windowFillRatio: number;
  channelCount: number;
  sampleRate: number;
}

export interface ConstraintReport {
  /** What we demanded. `exact` means Chrome throws rather than silently ignoring. */
  asked: Record<string, unknown>;
  /** What the track actually reports — Chrome's view of Chrome's own chain. */
  got: MediaTrackSettings;
  /** What the device says it can do. */
  capable: MediaTrackCapabilities | null;
  /** What this browser build understands as a constraint at all. */
  supported: MediaTrackSupportedConstraints;
}

export interface DeviceChoice {
  deviceId: string;
  label: string;
}

export interface MicError {
  title: string;
  detail: string;
  /** Devices seen, so a failure to find the mic is diagnosable rather than mysterious. */
  devicesSeen?: DeviceChoice[];
}

/** Gate 3 — the system-processing probe. */
export type ProbeVerdict = 'clean' | 'suspicious' | 'inconclusive';

export interface ProbeResult {
  verdict: ProbeVerdict;
  /** Plain-language findings; always populated, including for `inconclusive`. */
  findings: string[];
  capturedLevelDbfs: number;
  levelDriftDb: number;
  deepestNotchDb: number;
  spectrum: number[];
  binHz: number;
}

const INITIAL_METRICS: MicMetrics = {
  shortTermLufs: -Infinity,
  samplePeakDbfs: -Infinity,
  samplePeakLinear: 0,
  clipCount: 0,
  nearClipCount: 0,
  windowFull: false,
  windowFillRatio: 0,
  channelCount: 0,
  sampleRate: 0,
};

/** The constraint set. `exact: false` on the four processing flags is load-bearing:
 *  it makes getUserMedia throw OverconstrainedError rather than quietly hand back a
 *  processed stream, which is the strongest proof available inside the browser. */
function buildConstraints(deviceId: string): MediaTrackConstraints {
  return {
    deviceId: { exact: deviceId },
    echoCancellation: { exact: false },
    noiseSuppression: { exact: false },
    autoGainControl: { exact: false },
    // Not in the standard TS lib yet; Chrome supports it and the QuadCast advertises it.
    voiceIsolation: { exact: false },
    // ideal, not exact — the device is fixed at 48 kHz, and demanding a rate the HAL
    // would have to change is the documented way to break a device shared with Ecamm.
    sampleRate: { ideal: TARGET_SAMPLE_RATE },
    channelCount: { ideal: 2 },
  } as MediaTrackConstraints;
}

export function useMicAnalyser() {
  const [status, setStatus] = useState<MicStatus>('idle');
  const [error, setError] = useState<MicError | null>(null);
  const [device, setDevice] = useState<DeviceChoice | null>(null);
  const [constraints, setConstraints] = useState<ConstraintReport | null>(null);
  const [metrics, setMetrics] = useState<MicMetrics>(INITIAL_METRICS);
  const [probe, setProbe] = useState<ProbeResult | null>(null);
  const [probeRunning, setProbeRunning] = useState(false);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [mode, setModeState] = useState<MicMode>('room');
  /** The finished report, kept after Stop so the page can show it instead of a blank screen. */
  const [lastSession, setLastSession] = useState<MicCheckSession | null>(null);
  const [trajectory, setTrajectory] = useState<TrajectoryReading | null>(null);
  const trackerRef = useRef<TrajectoryTracker | null>(null);
  const lastTrajectoryRef = useRef<number>(0);
  const [roomReferenceLufs, setRoomReferenceLufs] = useState<number | null>(null);
  const modeRef = useRef<MicMode>('room');

  const streamRef = useRef<MediaStream | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const sessionStartRef = useRef<number>(0);
  const lastPostRef = useRef<number>(0);
  const probeRef = useRef<ProbeResult | null>(null);
  const constraintsRef = useRef<ConstraintReport | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const nodeRef = useRef<AudioWorkletNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  /**
   * Fire-and-forget POST. A telemetry failure must never break monitoring — the meter
   * on screen is the primary product; the server copy is a convenience for agents.
   */
  const post = useCallback(async (path: string, body: unknown): Promise<unknown | null> => {
    try {
      const res = await fetch(`${API_URL}/api/miccheck${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return await res.json();
    } catch {
      return null;
    }
  }, []);

  const stop = useCallback(() => {
    nodeRef.current?.port.postMessage({ type: 'stop' });
    nodeRef.current?.disconnect();
    nodeRef.current = null;
    analyserRef.current?.disconnect();
    analyserRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    contextRef.current?.close().catch(() => {});
    contextRef.current = null;

    // Finalise the server-side record. The server derives the summary from the series
    // it received rather than trusting anything computed here.
    const id = sessionIdRef.current;
    if (id) {
      sessionIdRef.current = null;
      setSessionId(null);
      void post(`/session/${id}/finish`, {
        constraints: constraintsRef.current,
        probe: probeRef.current,
      }).then((res) => {
        const session = (res as { session?: MicCheckSession } | null)?.session;
        if (session) setLastSession(session);
      });
    }

    setStatus('idle');
    setMetrics(INITIAL_METRICS);
  }, [post]);

  useEffect(() => stop, [stop]);

  const start = useCallback(async () => {
    setError(null);
    setProbe(null);
    setStatus('starting');

    try {
      // Step 1 — unlock device labels. enumerateDevices returns empty labels until the
      // origin holds mic permission. This briefly opens the OS default (which IS Krisp);
      // it is stopped immediately and never measured from.
      let permissionStream: MediaStream | null = null;
      try {
        permissionStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } finally {
        permissionStream?.getTracks().forEach((t) => t.stop());
      }

      // Step 2 — find the QuadCast by label.
      const all = await navigator.mediaDevices.enumerateDevices();
      const inputs: DeviceChoice[] = all
        .filter((d) => d.kind === 'audioinput')
        .map((d) => ({ deviceId: d.deviceId, label: d.label || '(unlabelled)' }));

      const target = inputs.find(
        (d) => TARGET_DEVICE_PATTERN.test(d.label) && !VIRTUAL_DEVICE_PATTERN.test(d.label)
      );

      if (!target) {
        const virtualOnly = inputs.filter((d) => VIRTUAL_DEVICE_PATTERN.test(d.label));
        setStatus('error');
        setError({
          title: 'HyperX QuadCast not found',
          detail:
            virtualOnly.length > 0
              ? `Only virtual devices are available (${virtualOnly
                  .map((d) => d.label)
                  .join(', ')}). These apply their own processing, so measuring through ` +
                'one would produce numbers that describe the software, not your microphone. ' +
                'Plug in the QuadCast and try again.'
              : 'No input device matching "QuadCast" or "HyperX" was found.',
          devicesSeen: inputs,
        });
        return;
      }

      // Step 3 — open the real device with processing explicitly forbidden.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: buildConstraints(target.deviceId),
      });
      streamRef.current = stream;

      const track = stream.getAudioTracks()[0];

      // Step 4 — defence in depth. Confirm what we were actually handed, because the
      // deviceId we asked for and the device we got are not guaranteed to be the same
      // thing across OS device changes between enumerate and open.
      if (VIRTUAL_DEVICE_PATTERN.test(track.label)) {
        stop();
        setStatus('error');
        setError({
          title: 'Refusing to measure a virtual device',
          detail: `The stream resolved to "${track.label}", which interposes its own audio processing. Any measurement through it would be fiction.`,
          devicesSeen: inputs,
        });
        return;
      }

      const settings = track.getSettings();
      const constraintReport: ConstraintReport = {
        asked: buildConstraints(target.deviceId) as Record<string, unknown>,
        got: settings,
        capable: typeof track.getCapabilities === 'function' ? track.getCapabilities() : null,
        supported: navigator.mediaDevices.getSupportedConstraints(),
      };
      constraintsRef.current = constraintReport;
      probeRef.current = null;
      setConstraints(constraintReport);
      setDevice({ deviceId: target.deviceId, label: track.label || target.label });

      // Step 5 — open the context at the device's own rate so no resampler appears.
      const context = new AudioContext({
        sampleRate: settings.sampleRate || TARGET_SAMPLE_RATE,
        latencyHint: 'interactive',
      });
      contextRef.current = context;
      if (context.state === 'suspended') await context.resume();

      await context.audioWorklet.addModule('/miccheck-worklet.js');

      const source = context.createMediaStreamSource(stream);
      const node = new AudioWorkletNode(context, 'miccheck-processor', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        channelCount: settings.channelCount || 2,
        channelCountMode: 'explicit',
        channelInterpretation: 'discrete',
      });
      nodeRef.current = node;

      // Open the server-side record. Failure here is non-fatal: the meter still works,
      // it just will not be visible outside this tab.
      modeRef.current = 'room';
      setModeState('room');
      setLastSession(null);
      setTrajectory(null);
      trackerRef.current = new TrajectoryTracker({ target: SHORT_TERM_TARGET_LUFS });
      lastTrajectoryRef.current = 0;
      setRoomReferenceLufs(null);
      sessionStartRef.current = performance.now();
      lastPostRef.current = 0;
      const started = (await post('/session/start', {
        device: {
          label: track.label || target.label,
          sampleRate: settings.sampleRate ?? null,
          channelCount: settings.channelCount ?? null,
          sampleSize: (settings as { sampleSize?: number }).sampleSize ?? null,
        },
        constraints: constraintReport,
      })) as { success?: boolean; sessionId?: string } | null;

      if (started?.success && started.sessionId) {
        sessionIdRef.current = started.sessionId;
        setSessionId(started.sessionId);
      }

      node.port.onmessage = (event) => {
        if (event.data?.type !== 'metrics') return;
        const m = event.data as MicMetrics & { workletVersion?: string };
        setMetrics(m);

        const now = performance.now();

        // Trajectory runs at 2 Hz — fast enough to feel live, slow enough to read.
        if (now - lastTrajectoryRef.current >= 500) {
          lastTrajectoryRef.current = now;
          const tracker = trackerRef.current;
          if (tracker) {
            const gradeable =
              modeRef.current === 'speaking' &&
              m.windowFull &&
              Number.isFinite(m.shortTermLufs) &&
              m.shortTermLufs >= SPEECH_FLOOR_LUFS;
            const reading = tracker.push(
              gradeable ? m.shortTermLufs : null,
              Math.round(now - sessionStartRef.current)
            );
            setTrajectory(reading);
            if (reading.changeEvent) {
              reportEventRef.current?.({
                t: reading.changeEvent.t,
                kind: 'level-step',
                label: reading.changeEvent.label,
                deltaDb: reading.changeEvent.deltaDb,
              });
            }
          }
        }

        // Throttle to ~1 Hz. The worklet emits ~23 Hz, but its underlying measurement is
        // a 3 s window — consecutive emissions overlap almost entirely, so posting them
        // all would multiply traffic without adding information.
        const id = sessionIdRef.current;
        if (!id) return;
        if (now - lastPostRef.current < TICK_POST_INTERVAL_MS) return;
        lastPostRef.current = now;

        // -Infinity does not survive JSON. Silence goes over the wire as null, never as
        // a number, so a consumer cannot mistake "nothing to measure" for a real level.
        const finite = (v: number) => (Number.isFinite(v) ? v : null);

        void post(`/session/${id}/tick`, {
          t: Math.round(now - sessionStartRef.current),
          // Declared, not derived — the server rejects a tick without it.
          mode: modeRef.current,
          shortTermLufs: finite(m.shortTermLufs),
          samplePeakDbfs: finite(m.samplePeakDbfs),
          clipCount: m.clipCount,
          nearClipCount: m.nearClipCount,
          windowFull: m.windowFull,
          // Measured, and deliberately separate from mode. Inside SPEAKING it keeps pauses
          // out of the average; inside ROOM it means the reference is contaminated.
          speechDetected:
            m.windowFull && Number.isFinite(m.shortTermLufs) && m.shortTermLufs >= SPEECH_FLOOR_LUFS,
        });
      };

      // Analyser is for the processing probe only — never for a graded metric.
      // It force-downmixes to mono regardless of its own channelCount (spec §6 Phase 2).
      const analyser = context.createAnalyser();
      analyser.fftSize = 8192;
      analyser.smoothingTimeConstant = 0; // the 0.8 default is a display prettifier
      analyserRef.current = analyser;

      source.connect(node);
      source.connect(analyser);

      // Silent sink. The graph must reach the destination to be pulled, but gain 0
      // guarantees nothing is audible and no feedback loop can form.
      const sink = context.createGain();
      sink.gain.value = 0;
      node.connect(sink);
      sink.connect(context.destination);

      setStatus('running');
    } catch (err) {
      stop();
      setStatus('error');
      const e = err as DOMException;
      const overconstrained = e?.name === 'OverconstrainedError';
      setError({
        title: overconstrained
          ? 'The microphone refused to disable its processing'
          : 'Could not open the microphone',
        detail: overconstrained
          ? 'getUserMedia rejected a required constraint, which means this device cannot ' +
            'guarantee echo cancellation / noise suppression / AGC are off. Measuring ' +
            'through it would describe the processing, not the microphone.'
          : `${e?.name || 'Error'}: ${e?.message || String(err)}`,
      });
    }
  }, [stop, post]);

  const setMode = useCallback((next: MicMode) => {
    modeRef.current = next;
    setModeState(next);
  }, []);

  /**
   * Store the ROOM noise floor. SPEAKING stays unavailable until this exists, because
   * every later "vs the room" figure is relative to it — offered greyed with the reason,
   * never silently degraded into a comparison against nothing.
   */
  const captureRoomReference = useCallback(
    (lufs: number | null) => {
      setRoomReferenceLufs(lufs);
      const id = sessionIdRef.current;
      if (id) void post(`/session/${id}/room-reference`, { lufs });
    },
    [post]
  );

  const reportEventRef = useRef<((e: { t: number; kind: string; label: string; deltaDb?: number }) => void) | null>(null);

  const reportEvent = useCallback(
    (event: { t: number; kind: string; label: string; deltaDb?: number }) => {
      const id = sessionIdRef.current;
      if (id) void post(`/session/${id}/event`, event);
    },
    [post]
  );
  reportEventRef.current = reportEvent;

  /**
   * Gate 3 — the system-processing probe.
   *
   * getSettings() reports Chrome's view of Chrome's chain and has no visibility below
   * Chrome. If macOS applied a system-level Mic Mode, getSettings() would still say
   * `noiseSuppression: false` and be telling the truth. "No processing" and "processing
   * I cannot see" are indistinguishable without actually listening to a known signal.
   *
   * This plays broadband noise through the speakers, captures it, and looks for the two
   * fingerprints of hidden DSP: an adaptive level collapse (a gate learning the room) and
   * narrow spectral holes (notching).
   */
  const runProcessingProbe = useCallback(async () => {
    const context = contextRef.current;
    const analyser = analyserRef.current;
    if (!context || !analyser) return;

    setProbeRunning(true);
    setProbe(null);
    try {
      // 3 s of white noise out of the speakers, at a deliberately modest level.
      const duration = 3;
      const buffer = context.createBuffer(1, context.sampleRate * duration, context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.25;

      const source = context.createBufferSource();
      source.buffer = buffer;
      const gain = context.createGain();
      gain.gain.value = 0.5;
      source.connect(gain);
      gain.connect(context.destination);

      const bins = new Float32Array(analyser.frequencyBinCount);
      const frames: Float32Array[] = [];

      source.start();
      const started = performance.now();
      while (performance.now() - started < duration * 1000) {
        analyser.getFloatFrequencyData(bins);
        frames.push(bins.slice());
        await new Promise((r) => setTimeout(r, 50));
      }
      source.stop();

      // Broadband level per frame, ignoring the lowest bins (room rumble, HVAC).
      const binHz = context.sampleRate / analyser.fftSize;
      const firstBin = Math.floor(200 / binHz);
      const lastBin = Math.floor(12000 / binHz);
      const frameLevel = frames.map((f) => {
        let sum = 0;
        for (let i = firstBin; i < lastBin; i++) sum += Math.pow(10, f[i] / 10);
        return 10 * Math.log10(sum / (lastBin - firstBin));
      });

      const head = frameLevel.slice(0, Math.max(1, Math.floor(frameLevel.length * 0.2)));
      const tail = frameLevel.slice(Math.floor(frameLevel.length * 0.8));
      const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / Math.max(1, a.length);
      const capturedLevelDbfs = mean(frameLevel);
      const levelDriftDb = mean(head) - mean(tail);

      // Average spectrum, then look for narrow holes against a smoothed baseline.
      const avg = new Float32Array(bins.length);
      for (const f of frames) for (let i = 0; i < bins.length; i++) avg[i] += f[i] / frames.length;

      let deepestNotchDb = 0;
      for (let i = firstBin + 8; i < lastBin - 8; i++) {
        let neighbourhood = 0;
        for (let k = -8; k <= 8; k++) if (k !== 0) neighbourhood += avg[i + k];
        const baseline = neighbourhood / 16;
        deepestNotchDb = Math.min(deepestNotchDb, avg[i] - baseline);
      }

      // --- verdict ---
      // The load-bearing rule: if the probe signal was never detected, the answer is
      // "I could not tell", NOT "clean". Silence and cleanliness must not look alike.
      const findings: string[] = [];
      let verdict: ProbeVerdict;

      if (capturedLevelDbfs < -75) {
        verdict = 'inconclusive';
        findings.push(
          `The probe tone was not detected (captured ${capturedLevelDbfs.toFixed(1)} dBFS). ` +
            'Either the speakers are muted, the volume is too low, or the mic is not hearing them. ' +
            'This is NOT a clean result — the test simply did not run.'
        );
      } else {
        const gated = levelDriftDb > 6;
        const notched = deepestNotchDb < -12;
        verdict = gated || notched ? 'suspicious' : 'clean';

        if (gated) {
          findings.push(
            `Captured level fell ${levelDriftDb.toFixed(1)} dB across the 3 s probe. That is the ` +
              'signature of an adaptive noise gate learning the room — something is processing ' +
              'this signal below Chrome.'
          );
        }
        if (notched) {
          findings.push(
            `A ${Math.abs(deepestNotchDb).toFixed(1)} dB narrow notch appears in the captured ` +
              'spectrum. Broadband noise should be smooth; holes suggest spectral subtraction.'
          );
        }
        if (verdict === 'clean') {
          findings.push(
            `Level held to within ${Math.abs(levelDriftDb).toFixed(1)} dB and the spectrum is ` +
              `smooth (deepest dip ${Math.abs(deepestNotchDb).toFixed(1)} dB). No gating or ` +
              'notching detected.'
          );
          findings.push(
            'Caveat: this rules out gating and notching loud enough to see. It cannot rule out ' +
              'gentle or wideband processing, and it says nothing about room acoustics.'
          );
        }
      }

      const result: ProbeResult = {
        verdict,
        findings,
        capturedLevelDbfs,
        levelDriftDb,
        deepestNotchDb,
        spectrum: Array.from(avg),
        binHz,
      };
      probeRef.current = result;
      setProbe(result);
    } finally {
      setProbeRunning(false);
    }
  }, []);

  return {
    status,
    error,
    sessionId,
    mode,
    setMode,
    trajectory,
    lastSession,
    roomReferenceLufs,
    captureRoomReference,
    reportEvent,
    device,
    constraints,
    metrics,
    probe,
    probeRunning,
    start,
    stop,
    runProcessingProbe,
  };
}
