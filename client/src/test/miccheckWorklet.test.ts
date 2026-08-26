/**
 * MicCheck Phase 1 acceptance gate — the honesty test.
 *
 * These tests import `client/public/miccheck-worklet.js` — the exact file the browser
 * loads — by shimming the three AudioWorklet globals it depends on. They do NOT
 * reimplement the DSP. A reimplementation would prove that two pieces of my own code
 * agree with each other, which is worth nothing; the question is whether the shipped
 * filter agrees with ITU-R BS.1770.
 *
 * Gate 1: EBU Tech 3341 calibration — 1 kHz sine at -18 dBFS reads -18.0 LUFS +/- 0.1.
 * Gate 2: cross-check against `ffmpeg -af ebur128` on the SAME generated file.
 *
 * Gate 3 (the system-processing probe) cannot run headless — it needs a speaker, a
 * microphone and a room. It ships as an in-app diagnostic; see MicCheckPage.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { pathToFileURL } from 'url';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { execFileSync, spawnSync } from 'child_process';

const RATE = 48000;
const BLOCK = 128;
const WORKLET_PATH = path.resolve(__dirname, '../../public/miccheck-worklet.js');

interface Snapshot {
  shortTermLufs: number;
  samplePeakDbfs: number;
  clipCount: number;
  nearClipCount: number;
  windowFull: boolean;
  channelCount: number;
}

interface Processor {
  process(inputs: Float32Array[][]): boolean;
  snapshot(): Snapshot;
}

type ProcessorCtor = new (options?: unknown) => Processor;

let ProcessorClass: ProcessorCtor;

/**
 * Load the real worklet by providing the AudioWorkletGlobalScope surface it expects.
 * If the worklet ever grows a dependency this shim does not provide, this throws —
 * which is the correct outcome, not something to paper over.
 */
beforeAll(async () => {
  const g = globalThis as Record<string, unknown>;
  g.sampleRate = RATE;
  g.currentTime = 0;
  g.AudioWorkletProcessor = class {
    port = { postMessage: () => {}, onmessage: null };
  };
  g.registerProcessor = (_name: string, cls: ProcessorCtor) => {
    ProcessorClass = cls;
  };

  await import(pathToFileURL(WORKLET_PATH).href);
  expect(ProcessorClass, 'worklet did not call registerProcessor').toBeTruthy();
});

/** Generate a stereo sine. EBU Tech 3341 applies the test signal to BOTH L and R. */
function generateSine(freq: number, dbfs: number, seconds: number): [Float32Array, Float32Array] {
  const amplitude = Math.pow(10, dbfs / 20);
  const total = Math.floor(RATE * seconds);
  const left = new Float32Array(total);
  const right = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    const value = amplitude * Math.sin((2 * Math.PI * freq * i) / RATE);
    left[i] = value;
    right[i] = value;
  }
  return [left, right];
}

/** Feed a signal through the real processor in render quanta and read the final state. */
function measure(left: Float32Array, right: Float32Array, blockSize = BLOCK): Snapshot {
  const processor = new ProcessorClass({ processorOptions: { sampleRate: RATE } });
  const blocks = Math.floor(left.length / blockSize);
  for (let b = 0; b < blocks; b++) {
    const offset = b * blockSize;
    processor.process([
      [left.subarray(offset, offset + blockSize), right.subarray(offset, offset + blockSize)],
    ]);
  }
  return processor.snapshot();
}

/** Minimal 16-bit PCM WAV writer, so ffmpeg measures exactly what the worklet measured. */
function writeWav(filePath: string, left: Float32Array, right: Float32Array): void {
  const frames = left.length;
  const dataBytes = frames * 2 * 2;
  const buffer = Buffer.alloc(44 + dataBytes);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataBytes, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(2, 22); // stereo
  buffer.writeUInt32LE(RATE, 24);
  buffer.writeUInt32LE(RATE * 2 * 2, 28);
  buffer.writeUInt16LE(4, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataBytes, 40);

  let offset = 44;
  for (let i = 0; i < frames; i++) {
    // Round-trip through the same 16-bit quantisation the QuadCast uses.
    const l = Math.max(-1, Math.min(1, left[i]));
    const r = Math.max(-1, Math.min(1, right[i]));
    buffer.writeInt16LE(Math.round(l * 32767), offset);
    buffer.writeInt16LE(Math.round(r * 32767), offset + 2);
    offset += 4;
  }
  fs.writeFileSync(filePath, buffer);
}

function hasFfmpeg(): boolean {
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/** Parse the integrated loudness ("I: -18.0 LUFS") from ffmpeg's ebur128 summary. */
function ffmpegIntegratedLufs(filePath: string): number {
  // ebur128 prints its summary to stderr, so both streams are captured and joined.
  const run = spawnSync(
    'ffmpeg',
    ['-nostats', '-i', filePath, '-af', 'ebur128=peak=true', '-f', 'null', '-'],
    { encoding: 'utf8' }
  );
  return parseSummary(`${run.stdout || ''}\n${run.stderr || ''}`);
}

function parseSummary(text: string): number {
  const summaryIndex = text.lastIndexOf('Integrated loudness');
  const region = summaryIndex >= 0 ? text.slice(summaryIndex) : text;
  const match = region.match(/I:\s*(-?\d+(?:\.\d+)?)\s*LUFS/);
  if (!match) throw new Error(`Could not parse ebur128 output:\n${text.slice(-800)}`);
  return parseFloat(match[1]);
}

describe('MicCheck worklet — EBU Tech 3341 calibration (Gate 1)', () => {
  it('reads -18.0 LUFS +/- 0.1 for a 1 kHz sine at -18 dBFS', () => {
    const [left, right] = generateSine(1000, -18, 5);
    const result = measure(left, right);

    expect(result.windowFull).toBe(true);
    expect(result.shortTermLufs).toBeGreaterThan(-18.1);
    expect(result.shortTermLufs).toBeLessThan(-17.9);
  });

  it('reads -23.0 LUFS +/- 0.1 for a 1 kHz sine at -23 dBFS (EBU R128 reference)', () => {
    const [left, right] = generateSine(1000, -23, 5);
    const result = measure(left, right);
    expect(Math.abs(result.shortTermLufs - -23)).toBeLessThan(0.1);
  });

  it('tracks a 10 dB level change linearly', () => {
    const quiet = measure(...generateSine(1000, -30, 5));
    const loud = measure(...generateSine(1000, -20, 5));
    expect(Math.abs(loud.shortTermLufs - quiet.shortTermLufs - 10)).toBeLessThan(0.05);
  });

  it('applies the K-weighting shelf — 10 kHz reads louder than 1 kHz at equal amplitude', () => {
    // The BS.1770 shelf is ~+4 dB at HF. If a refactor silently dropped the filter this
    // test fails while the 1 kHz calibration above would still pass.
    const low = measure(...generateSine(1000, -20, 5));
    const high = measure(...generateSine(10000, -20, 5));
    expect(high.shortTermLufs - low.shortTermLufs).toBeGreaterThan(2.5);
  });

  it('applies the RLB high-pass with the BS.1770 curve at 40 Hz and 20 Hz', () => {
    // The RLB stage is 2nd-order, f0 = 38.135 Hz, Q = 0.5003. At f = f0 the magnitude
    // response of s^2/(s^2 + s*w0/Q + w0^2) is exactly Q, i.e. -6.0 dB — so 40 Hz sits
    // ~6 dB down, NOT the 10+ dB a steeper filter would give. An earlier draft of this
    // test asserted >10 dB and failed; the assertion was wrong, not the filter.
    const mid = measure(...generateSine(1000, -20, 5)).shortTermLufs;
    const at40 = measure(...generateSine(40, -20, 5)).shortTermLufs;
    const at20 = measure(...generateSine(20, -20, 5)).shortTermLufs;

    expect(mid - at40).toBeGreaterThan(5);
    expect(mid - at40).toBeLessThan(9);
    // Roughly -13 dB at 20 Hz from the same transfer function.
    expect(mid - at20).toBeGreaterThan(11);
    expect(mid - at20).toBeLessThan(17);
  });
});

describe('MicCheck worklet — window and gating behaviour', () => {
  it('reports windowFull=false until a full 3 s has been seen', () => {
    const [left, right] = generateSine(1000, -18, 1.5);
    expect(measure(left, right).windowFull).toBe(false);
  });

  it('reports windowFull=true at 3 s', () => {
    const [left, right] = generateSine(1000, -18, 3.2);
    expect(measure(left, right).windowFull).toBe(true);
  });

  it('is a MOVING window — loud audio 10 s ago does not inflate the current reading', () => {
    // The whole point of short-term: it must forget. A running total that never
    // decays would keep reading the old level and tell David his gain is fine.
    const [loudL, loudR] = generateSine(1000, -10, 4);
    const [quietL, quietR] = generateSine(1000, -30, 6);

    const left = new Float32Array(loudL.length + quietL.length);
    const right = new Float32Array(loudR.length + quietR.length);
    left.set(loudL, 0);
    left.set(quietL, loudL.length);
    right.set(loudR, 0);
    right.set(quietR, loudR.length);

    const result = measure(left, right);
    expect(Math.abs(result.shortTermLufs - -30)).toBeLessThan(0.2);
  });

  it('is independent of render block size (Chrome does not implement renderQuantumSize)', () => {
    const [left, right] = generateSine(1000, -18, 5);
    const at128 = measure(left, right, 128).shortTermLufs;
    const at256 = measure(left, right, 256).shortTermLufs;
    expect(Math.abs(at128 - at256)).toBeLessThan(0.05);
  });
});

describe('MicCheck worklet — peak and clip detection', () => {
  it('measures sample peak on the raw signal, unaffected by K-weighting', () => {
    // Peak is a converter fact, not a loudness model. A 40 Hz tone is heavily
    // attenuated by the RLB high-pass; its PEAK must still read -6 dBFS.
    const [left, right] = generateSine(40, -6, 4);
    const result = measure(left, right);
    expect(Math.abs(result.samplePeakDbfs - -6)).toBeLessThan(0.1);
  });

  it('counts no clips or near-clips on a -18 dBFS signal', () => {
    const result = measure(...generateSine(1000, -18, 4));
    expect(result.clipCount).toBe(0);
    expect(result.nearClipCount).toBe(0);
  });

  it('counts near-clips above -0.5 dBFS without calling them clips', () => {
    const result = measure(...generateSine(1000, -0.2, 4));
    expect(result.nearClipCount).toBeGreaterThan(0);
    expect(result.clipCount).toBe(0);
  });

  it('detects a true clip: 3+ consecutive full-scale samples', () => {
    const [left, right] = generateSine(1000, -18, 4);
    for (let i = 1000; i < 1010; i++) {
      left[i] = 1.0;
      right[i] = 1.0;
    }
    const result = measure(left, right);
    expect(result.clipCount).toBeGreaterThan(0);
  });

  it('does NOT call two consecutive full-scale samples a clip', () => {
    const [left, right] = generateSine(1000, -18, 4);
    left[1000] = 1.0;
    left[1001] = 1.0;
    right[1000] = 1.0;
    right[1001] = 1.0;
    expect(measure(left, right).clipCount).toBe(0);
  });

  it('returns -Infinity LUFS for digital silence rather than NaN', () => {
    const silence = new Float32Array(RATE * 4);
    const result = measure(silence, silence.slice());
    expect(result.shortTermLufs).toBe(-Infinity);
    expect(Number.isNaN(result.shortTermLufs)).toBe(false);
  });
});

describe('MicCheck worklet — ffmpeg ebur128 cross-check (Gate 2)', () => {
  const ffmpegAvailable = hasFfmpeg();
  const runIf = ffmpegAvailable ? it : it.skip;

  if (!ffmpegAvailable) {
    it('ffmpeg is unavailable — cross-check NOT performed', () => {
      // Deliberately a visible failure rather than a silent skip: without this test,
      // Gate 1 only proves the worklet agrees with my own arithmetic.
      expect.fail('ffmpeg not found on PATH — Gate 2 cannot run. Install ffmpeg.');
    });
  }

  runIf('agrees with ffmpeg within 0.1 LUFS on a -18 dBFS sine', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'miccheck-'));
    const file = path.join(dir, 'sine-18.wav');
    try {
      const [left, right] = generateSine(1000, -18, 8);
      writeWav(file, left, right);

      const mine = measure(left, right).shortTermLufs;
      const theirs = ffmpegIntegratedLufs(file);

      expect(Math.abs(mine - theirs)).toBeLessThan(0.1);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  runIf('agrees with ffmpeg within 0.1 LUFS on broadband pink-ish noise', () => {
    // A sine only exercises one point on the K-weighting curve. Noise exercises all of it,
    // so this is the test that would actually catch a wrong filter coefficient.
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'miccheck-'));
    const file = path.join(dir, 'noise.wav');
    try {
      const total = RATE * 8;
      const left = new Float32Array(total);
      const right = new Float32Array(total);
      // Deterministic LCG — a flaky acceptance gate is worse than no gate.
      let seed = 12345;
      const rand = () => {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed / 0x7fffffff;
      };
      let b0 = 0;
      let b1 = 0;
      let b2 = 0;
      for (let i = 0; i < total; i++) {
        const white = rand() * 2 - 1;
        b0 = 0.99765 * b0 + white * 0.0990460;
        b1 = 0.96300 * b1 + white * 0.2965164;
        b2 = 0.57000 * b2 + white * 1.0526913;
        const pink = (b0 + b1 + b2 + white * 0.1848) * 0.06;
        const clamped = Math.max(-0.9, Math.min(0.9, pink));
        left[i] = clamped;
        right[i] = clamped;
      }
      writeWav(file, left, right);

      // Re-read the quantised file so both meters see identical samples.
      const wav = fs.readFileSync(file);
      const frames = (wav.length - 44) / 4;
      const qL = new Float32Array(frames);
      const qR = new Float32Array(frames);
      for (let i = 0; i < frames; i++) {
        qL[i] = wav.readInt16LE(44 + i * 4) / 32767;
        qR[i] = wav.readInt16LE(44 + i * 4 + 2) / 32767;
      }

      const mine = measure(qL, qR).shortTermLufs;
      const theirs = ffmpegIntegratedLufs(file);

      expect(Math.abs(mine - theirs)).toBeLessThan(0.1);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
