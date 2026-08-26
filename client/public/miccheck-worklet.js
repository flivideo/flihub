/**
 * MicCheck measurement worklet — Phase 1
 *
 * BS.1770 K-weighting -> short-term loudness (3 s, ungated) + sample peak + clip counts.
 *
 * WHY THIS FILE LIVES IN public/
 * Vite does not transform anything under public/, so what ships is byte-for-byte what was
 * written and tested. It is loaded with audioWorklet.addModule('/miccheck-worklet.js').
 * It therefore has NO imports — everything it needs is inline. That is deliberate, not lazy:
 * the acceptance tests import THIS FILE and exercise THIS DSP, so a passing test is evidence
 * about the code that actually runs in the browser, not about a copy of it.
 *
 * WHAT IT DOES NOT DO (Phase 1 scope)
 * - No true-peak oversampling. Sample peak only. BS.1770-5 Annex 2 requires 4x oversampling
 *   for a real dBTP figure; sample peak reads LOW by up to ~3 dB on inter-sample peaks.
 *   The UI labels this honestly. Oversampling is Phase 2.
 * - No gating. Short-term loudness is ungated by definition (EBU Tech 3341); the gated,
 *   integrated figure is a different instrument and the wrong one for setting a knob.
 * - No speech/pause detection, so no SNR. Phase 2.
 */

// ---------------------------------------------------------------------------
// K-weighting filter coefficients (ITU-R BS.1770-5)
//
// Derived analytically rather than hard-coded from the standard's 48 kHz table, so the
// filter stays correct if the context ever opens at another rate. At 48 kHz these
// reproduce the published table values. This is the same derivation libebur128 and
// ffmpeg's ebur128 filter use, which is what makes the ffmpeg cross-check meaningful.
// ---------------------------------------------------------------------------

/** Stage 1: high-frequency shelving filter ("pre-filter", head acoustics). */
function shelfCoefficients(rate) {
  const f0 = 1681.9744509555319;
  const G = 3.9998438533703346;
  const Q = 0.7071752369554196;

  const K = Math.tan((Math.PI * f0) / rate);
  const Vh = Math.pow(10, G / 20);
  const Vb = Math.pow(Vh, 0.4996667741545416);
  const den = 1 + K / Q + K * K;

  return {
    b0: (Vh + (Vb * K) / Q + K * K) / den,
    b1: (2 * (K * K - Vh)) / den,
    b2: (Vh - (Vb * K) / Q + K * K) / den,
    a1: (2 * (K * K - 1)) / den,
    a2: (1 - K / Q + K * K) / den,
  };
}

/** Stage 2: RLB high-pass filter. */
function highPassCoefficients(rate) {
  const f0 = 38.13547087602444;
  const Q = 0.5003270373238773;

  const K = Math.tan((Math.PI * f0) / rate);
  const den = 1 + K / Q + K * K;

  return {
    b0: 1,
    b1: -2,
    b2: 1,
    a1: (2 * (K * K - 1)) / den,
    a2: (1 - K / Q + K * K) / den,
  };
}

/** Direct Form I biquad. One instance per channel per stage — state must not be shared. */
class Biquad {
  constructor(c) {
    this.b0 = c.b0;
    this.b1 = c.b1;
    this.b2 = c.b2;
    this.a1 = c.a1;
    this.a2 = c.a2;
    this.x1 = 0;
    this.x2 = 0;
    this.y1 = 0;
    this.y2 = 0;
  }

  process(x) {
    const y =
      this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1;
    this.x1 = x;
    this.y2 = this.y1;
    this.y1 = y;
    return y;
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** BS.1770 absolute-scale offset. Its value is why a -18 dBFS 1 kHz sine reads -18.0 LUFS. */
const LUFS_OFFSET = -0.691;

/** Short-term window, EBU Tech 3341. 3 s is the window Tech 3343 recommends for narration. */
const SHORT_TERM_SECONDS = 3;

/** Near-clip threshold: -0.5 dBFS (convention, see spec A4). */
const NEAR_CLIP_LINEAR = Math.pow(10, -0.5 / 20);

/** A clip is >= 3 consecutive samples at (or beyond) full scale. */
const FULL_SCALE = 0.999969482421875; // 32767/32768 — the largest 16-bit sample
const CLIP_RUN_LENGTH = 3;

/** How often to post metrics to the main thread. ~23 Hz; Tech 3341 wants >= 10 Hz. */
const EMIT_INTERVAL_BLOCKS = 16;

class MicCheckProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();

    const rate = (options && options.processorOptions && options.processorOptions.sampleRate) ||
      (typeof sampleRate !== 'undefined' ? sampleRate : 48000);

    this.rate = rate;
    this.channelCount = 0;
    this.filters = [];

    // Per-block mean-square energy, one ring per channel. Summing the ring gives the
    // 3 s window. Recomputed from the ring on every emit rather than kept as a running
    // total, so float error cannot accumulate across a long session.
    this.ringLength = 0;
    this.rings = [];
    this.ringWrite = 0;
    this.blocksSeen = 0;

    this.samplePeak = 0;
    this.clipCount = 0;
    this.nearClipCount = 0;
    this.consecutiveFullScale = 0;

    this.blocksSinceEmit = 0;
    this.running = true;

    this.port.onmessage = (event) => {
      const data = event && event.data;
      if (!data) return;
      if (data.type === 'reset') this.reset();
      if (data.type === 'stop') this.running = false;
    };
  }

  reset() {
    for (const ring of this.rings) ring.fill(0);
    this.ringWrite = 0;
    this.blocksSeen = 0;
    this.samplePeak = 0;
    this.clipCount = 0;
    this.nearClipCount = 0;
    this.consecutiveFullScale = 0;
    for (const chain of this.filters) {
      chain.shelf.x1 = chain.shelf.x2 = chain.shelf.y1 = chain.shelf.y2 = 0;
      chain.hp.x1 = chain.hp.x2 = chain.hp.y1 = chain.hp.y2 = 0;
    }
  }

  /** Lazily size everything to the real channel count and block size we are handed. */
  configure(channelCount, blockSize) {
    this.channelCount = channelCount;

    this.filters = [];
    for (let c = 0; c < channelCount; c++) {
      this.filters.push({
        shelf: new Biquad(shelfCoefficients(this.rate)),
        hp: new Biquad(highPassCoefficients(this.rate)),
      });
    }

    // Ring length in blocks. Chrome's renderQuantumSize is not implemented (spec 5.1),
    // so this is derived from the block size actually delivered, never assumed to be 128.
    this.blockSize = blockSize;
    this.ringLength = Math.max(1, Math.ceil((SHORT_TERM_SECONDS * this.rate) / blockSize));
    this.rings = [];
    for (let c = 0; c < channelCount; c++) {
      this.rings.push(new Float64Array(this.ringLength));
    }
    this.ringWrite = 0;
    this.blocksSeen = 0;
  }

  process(inputs) {
    if (!this.running) return false;

    const input = inputs[0];
    if (!input || input.length === 0) return true;

    // Defensive against a zero-length quantum and against a mid-stream block-size change.
    const blockSize = input[0] ? input[0].length : 0;
    if (blockSize === 0) return true;

    if (this.channelCount !== input.length || this.blockSize !== blockSize) {
      this.configure(input.length, blockSize);
    }

    for (let c = 0; c < input.length; c++) {
      const samples = input[c];
      const chain = this.filters[c];
      let energy = 0;

      for (let i = 0; i < blockSize; i++) {
        const raw = samples[i];

        // --- peak / clip on the RAW signal, before K-weighting ---
        // The weighting curve is a loudness model; clipping is a converter fact.
        // Measuring peaks post-filter would report peaks the ADC never saw.
        const magnitude = raw < 0 ? -raw : raw;
        if (magnitude > this.samplePeak) this.samplePeak = magnitude;

        if (magnitude >= NEAR_CLIP_LINEAR) this.nearClipCount++;

        if (magnitude >= FULL_SCALE) {
          this.consecutiveFullScale++;
          if (this.consecutiveFullScale === CLIP_RUN_LENGTH) this.clipCount++;
        } else {
          this.consecutiveFullScale = 0;
        }

        // --- K-weighting: shelf -> high-pass -> mean square ---
        const weighted = chain.hp.process(chain.shelf.process(raw));
        energy += weighted * weighted;
      }

      this.rings[c][this.ringWrite] = energy / blockSize;
    }

    this.ringWrite = (this.ringWrite + 1) % this.ringLength;
    if (this.blocksSeen < this.ringLength) this.blocksSeen++;

    this.blocksSinceEmit++;
    if (this.blocksSinceEmit >= EMIT_INTERVAL_BLOCKS) {
      this.blocksSinceEmit = 0;
      this.port.postMessage(this.snapshot());
    }

    return true;
  }

  /**
   * Current measurement. Exposed as its own method so the acceptance tests can pull a
   * reading without depending on the message pump.
   */
  snapshot() {
    const windowFull = this.blocksSeen >= this.ringLength;

    // Ungated sum over the window, per BS.1770: L = -0.691 + 10*log10(sum_ch G_ch * z_ch).
    // G = 1.0 for L and R; Phase 1 is stereo/mono only, no surround weighting.
    let weightedSum = 0;
    for (let c = 0; c < this.rings.length; c++) {
      const ring = this.rings[c];
      let total = 0;
      for (let i = 0; i < this.blocksSeen; i++) total += ring[i];
      weightedSum += total / Math.max(1, this.blocksSeen);
    }

    const shortTermLufs =
      weightedSum > 0 ? LUFS_OFFSET + 10 * Math.log10(weightedSum) : -Infinity;

    return {
      type: 'metrics',
      shortTermLufs,
      samplePeakDbfs: this.samplePeak > 0 ? 20 * Math.log10(this.samplePeak) : -Infinity,
      samplePeakLinear: this.samplePeak,
      clipCount: this.clipCount,
      nearClipCount: this.nearClipCount,
      /** False until a full 3 s has been observed — the UI shows grey, never green. */
      windowFull,
      windowFillRatio: this.ringLength > 0 ? this.blocksSeen / this.ringLength : 0,
      channelCount: this.channelCount,
      sampleRate: this.rate,
    };
  }
}

registerProcessor('miccheck-processor', MicCheckProcessor);
