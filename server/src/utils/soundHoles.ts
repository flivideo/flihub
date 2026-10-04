// Sound holes (D01 editing pass, item 5, 2026-10-04): 15 of 33 d01 takes had mid-speech stretches
// at digital zero (−90…−105 dB, 0.1–0.7 s, instant on/off) that chop word ends — e.g.
// 03-4-flistudio.mov 12.30→12.97 s chops "we". Likely cause: Ecamm recording from
// KrispAudioDeviceMic, which zeroes what it judges non-voice. David wants to know at INGEST, before
// editing — so this flags them per take. Report only: FliHub has no audio cleanup step and gets none.
//
// Sibling of the live MicCheck (client/src/utils/micGrading.ts), which grades the mic BEFORE a take;
// this grades the take's audio AFTER it lands. Same rule: a take that could not be read is
// 'unknown' with a reason, never 'ok'.
import { spawn } from 'child_process';
import type { SoundHole, SoundHoleCheck } from '../../../shared/types.js';

/** Analysis grain: 10 ms RMS windows of a 16 kHz mono downmix. */
export const WINDOW_SEC = 0.01;
const SAMPLE_RATE = 16000;
const WINDOW_SAMPLES = SAMPLE_RATE * WINDOW_SEC;

/**
 * A window this quiet is below any real room tone (David's room sits around −55…−70 dB), so a run
 * of them is a candidate. AAC leaves codec noise in a zeroed stretch (−77…−110 dB measured), so
 * "digital zero" is never literally −∞.
 */
export const DEAD_DB = -75;
/** The run's median must reach digital-zero territory — the brief's −90…−105 dB. Quiet room tone does not. */
export const HOLE_FLOOR_DB = -90;
/** A neighbouring window this loud is speech. */
export const SPEECH_DB = -50;
/** "Instant on/off": speech must sit within 30 ms of the hole's edge. */
export const EDGE_WINDOWS = 3;
/** Codec blips (up to 3 windows, still below −55 dB) inside a hole do not split it. */
const BLIP_WINDOWS = 3;
const BLIP_CEILING_DB = -55;
/** Brief: 0.1–0.7 s. The upper bound carries one window of quantisation (03-1 measures 0.70). */
export const MIN_HOLE_SEC = 0.1;
export const MAX_HOLE_SEC = 0.71;

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Pure: find sound holes in a sequence of per-window levels (dB, one per WINDOW_SEC).
 * A hole is a run of near-zero windows that is interior to the take (not the Ecamm start/end
 * silence), short (0.1–0.7 s), deep (median ≤ −90 dB) and cut into speech on at least one side —
 * a hole flanked only by room tone is a zeroed pause and chops nothing.
 */
export function findSoundHoles(levelsDb: ArrayLike<number>): SoundHole[] {
  const n = levelsDb.length;
  const holes: SoundHole[] = [];
  const isDead = (i: number) => levelsDb[i] < DEAD_DB;
  const deadAhead = (j: number) => {
    for (let k = j + 1; k <= Math.min(n - 1, j + BLIP_WINDOWS); k++) if (isDead(k)) return true;
    return false;
  };

  let i = 0;
  while (i < n) {
    if (!isDead(i)) {
      i++;
      continue;
    }
    let j = i;
    while (j < n && (isDead(j) || (levelsDb[j] < BLIP_CEILING_DB && deadAhead(j)))) j++;
    // [i, j) is one run
    const start = i;
    const end = j;
    i = j;

    if (start === 0 || end >= n) continue; // the take's own lead-in / tail, not a hole
    const duration = (end - start) * WINDOW_SEC;
    if (duration < MIN_HOLE_SEC - 1e-9 || duration > MAX_HOLE_SEC + 1e-9) continue;

    const run: number[] = [];
    for (let k = start; k < end; k++) run.push(levelsDb[k]);
    const floorDb = median(run);
    if (floorDb > HOLE_FLOOR_DB) continue;

    let before = -Infinity;
    for (let k = Math.max(0, start - EDGE_WINDOWS); k < start; k++) before = Math.max(before, levelsDb[k]);
    let after = -Infinity;
    for (let k = end; k < Math.min(n, end + EDGE_WINDOWS); k++) after = Math.max(after, levelsDb[k]);
    const cutsBefore = before >= SPEECH_DB;
    const cutsAfter = after >= SPEECH_DB;
    if (!cutsBefore && !cutsAfter) continue;

    holes.push({
      start: round2(start * WINDOW_SEC),
      end: round2(end * WINDOW_SEC),
      duration: round2(duration),
      floorDb: Math.round(floorDb),
      cuts: cutsBefore && cutsAfter ? 'both' : cutsBefore ? 'word-end' : 'word-start',
    });
  }
  return holes;
}

export function describeHoles(holes: SoundHole[]): string {
  if (holes.length === 0) return 'No sound holes — the audio never drops to digital zero mid-speech';
  const at = holes.map((h) => `${h.start.toFixed(2)}–${h.end.toFixed(2)} s`).join(', ');
  return (
    `${holes.length} sound hole${holes.length === 1 ? '' : 's'} (audio drops to digital zero mid-speech, ` +
    `chopping words) at ${at}. Likely the Krisp virtual mic in Ecamm — record from the real mic.`
  );
}

/**
 * Per-window RMS levels (dB) of a file's audio, streamed from ffmpeg — a long take is never held in
 * memory. Rejects when ffmpeg fails or the file has no audio.
 */
export function readLevels(file: string): Promise<Float32Array> {
  return new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', [
      '-hide_banner', '-nostats', '-v', 'error',
      '-i', file,
      '-vn', '-ac', '1', '-ar', String(SAMPLE_RATE),
      '-f', 'f32le', '-',
    ]);
    const levels: number[] = [];
    let carry: Buffer = Buffer.alloc(0);
    let sum = 0;
    let count = 0;
    let stderr = '';
    ff.stdout.on('data', (chunk: Buffer) => {
      const buf = carry.length ? Buffer.concat([carry, chunk]) : chunk;
      const whole = buf.length - (buf.length % 4);
      for (let o = 0; o < whole; o += 4) {
        const x = buf.readFloatLE(o);
        sum += x * x;
        if (++count === WINDOW_SAMPLES) {
          const rms = Math.sqrt(sum / WINDOW_SAMPLES);
          levels.push(rms > 0 ? 20 * Math.log10(rms) : -150);
          sum = 0;
          count = 0;
        }
      }
      carry = buf.subarray(whole);
    });
    ff.stderr.on('data', (d: Buffer) => {
      if (stderr.length < 2000) stderr += d.toString();
    });
    ff.on('error', reject);
    ff.on('close', (code) => {
      if (code !== 0 && /does not contain any stream/.test(stderr)) return reject(new Error('the file has no audio track'));
      if (code !== 0) return reject(new Error(`ffmpeg exited ${code}: ${stderr.trim().split('\n').pop() ?? ''}`));
      if (levels.length === 0) return reject(new Error('no audio stream'));
      resolve(Float32Array.from(levels));
    });
  });
}

export interface SoundHoleDeps {
  readLevels: (file: string) => Promise<ArrayLike<number>>;
  now: () => Date;
}

const realDeps: SoundHoleDeps = { readLevels, now: () => new Date() };

/** Check one take. Never throws: an unreadable take is 'unknown' with the reason. */
export async function checkTakeSoundHoles(file: string, deps: SoundHoleDeps = realDeps): Promise<SoundHoleCheck> {
  const checkedAt = deps.now().toISOString();
  let levels: ArrayLike<number>;
  try {
    levels = await deps.readLevels(file);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return { status: 'unknown', holes: [], message: `Sound not checked — could not read the audio (${reason})`, checkedAt };
  }
  const holes = findSoundHoles(levels);
  return { status: holes.length > 0 ? 'holes' : 'ok', holes, message: describeHoles(holes), checkedAt };
}

/** One decode at a time, whoever asks (ingest, backfill). A failed job never breaks the chain. */
let chain: Promise<unknown> = Promise.resolve();
export function enqueueSoundCheck<T>(job: () => Promise<T>): Promise<T> {
  const next = chain.then(job);
  chain = next.catch(() => undefined);
  return next;
}
