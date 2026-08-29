# MicCheck — Build Spec

**A live microphone environment & setup tester for the HyperX QuadCast.**

Target reader: a build agent, or David pasting this into FliHub.
Status: specification only. Nothing was built; FliHub was not modified.

**Scope**: a *standalone bench tool*, run from time to time to dial in the room and the mic.
It is **not** a live overlay for an active Ecamm recording (though §5 shows that mode is
technically available). It is **not** a post-processing tool — see §0.3 on `audio-clean`.

---

## 0. Ground rules for reading this document

### 0.1 Evidence markers

Every factual claim below carries one of these:

| Marker | Meaning |
|---|---|
| ✅ **MEASURED** | I ran it on this machine (mac-mini-m4, macOS 26.5, the actual QuadCast) today |
| 📄 **DOCUMENTED** | Stated in a primary source — ITU/EBU/AES/Apple/HyperX/W3C/MDN — cited inline |
| 🔶 **CONVENTION** | Real industry practice, but no standards body publishes it. A design choice. |
| ❓ **UNKNOWN** | Could not be established. Listed in full in §7. |

**Rule for the builder: never promote a 🔶 to a ✅ in the UI.** Where a threshold is a
convention, the tool must be able to say so when asked. This matters because the whole point of
this instrument is to be trusted about the room.

### 0.2 The three tasks this tool serves

David's stated needs map to exactly three physical actions, and every metric in §2 is tagged
to one of them:

| Tag | The physical thing he does | What it changes |
|---|---|---|
| **GAIN** | Turns the front-lower knob | How much of the converter's range the signal uses |
| **POSITION** | Moves himself relative to the mic | Direct-to-noise ratio, proximity effect, plosives |
| **PATTERN** | Turns the rear knob | Which directions the mic listens to |

⚠️ **These are not interchangeable, and conflating them is the core misconception this tool
must correct.** Turning the gain knob up does **not** improve the fan problem: it raises voice
and fans by the same amount. Only POSITION and PATTERN change the *ratio*. GAIN only decides
how well that ratio is captured into the converter.

### 0.3 How this differs from `audio-clean` — different job, different time

`audio-clean` lives at
`/Users/davidcruwys/dev/ad/appydave-plugins/video-editor/skills/audio-clean/SKILL.md`.

| | `audio-clean` | **MicCheck** |
|---|---|---|
| When | **After** the edit, on the export | **Before** recording, at the mic |
| Input | A finished video file | A live input stream |
| Acts on | The recording | **David** |
| Output | A cleaned file + JSON report | A live green/orange/red readout |
| Fixes | Noise and loudness *in the file* | The *cause*, so the file needs less fixing |

They are complementary, and MicCheck's success is measured by `audio-clean` having less to do.
The explicit link: `audio-clean` applied **+26.1 dB** of make-up gain to David's 11:24 recording
today ✅ **MEASURED** (report at `/Users/davidcruwys/ecamm/Ecamm Recording on 2026-08-26 at
11.24.57 - clean.audio-clean.json`). Every dB of that is a dB that lifted the room's noise floor
along with his voice. **MicCheck exists to drive that +26.1 dB number down.**

**Do not duplicate `audio-clean`'s processing here.** MicCheck never denoises, never normalises,
never writes an audio file that anyone publishes. It measures and it advises.

---

## 1. Recommendation: **Build it as a FliHub panel (Option 2)**

### 1.1 The verdict

**Build the FliHub panel. The assumption behind the TUI option is factually wrong, and I tested
it rather than accepting it.**

### 1.2 The TUI's assumed advantage does not exist

The premise was *"a TUI gets better hardware access."* For this specific microphone, there is
**no hardware to access**:

- ✅ **MEASURED** — The QuadCast input device (CoreAudio id 132) exposes **no software volume
  control at all**. I probed `kAudioDevicePropertyVolumeScalar` and
  `kAudioDevicePropertyVolumeDecibels` on the input scope at elements 0, 1 and 2: **all absent**,
  and `AudioObjectIsPropertySettable` returns an error. macOS *cannot* change this mic's gain.
  (A second CoreAudio device, id 138, is the QuadCast's *headphone output* and does carry a
  volume — that's the monitoring level, not mic gain.)
- 📄 **DOCUMENTED** — HyperX's NGENUITY software **does not support the original QuadCast** at
  all, and is **Windows-only** with no macOS build.
  (`https://hyperx.com/pages/ngenuity`)
- 📄 **DOCUMENTED** — There are **no buttons** on the QuadCast. Two rotary knobs and one
  capacitive touch sensor. Nothing software-addressable. (Manual 480HX-MICQC.A01, p.3.)

So the gain knob and the pattern knob are **purely physical, analog-domain, and invisible to
every process on the machine**. A native Rust/Go/Python app and a browser tab receive *precisely
the same thing*: PCM samples. There is no privileged access to win.

**The only thing either implementation can do is read the audio and reason about it.** That
collapses the decision onto ordinary software-engineering grounds — where FliHub wins clearly.

### 1.3 What I verified the browser can actually do

I ran a real Chrome instance against the real QuadCast today. Full result in §5.1. Headlines:

- ✅ **MEASURED** — `getUserMedia` with `{exact:false}` on `echoCancellation`, `noiseSuppression`,
  `autoGainControl` **succeeded**, and `getSettings()` returned all three `false`, plus
  `voiceIsolation:false`. **Browser AGC can be disabled.** This was the critical risk and it is
  retired.
- ✅ **MEASURED** — Pinned to the QuadCast by `deviceId`: `channelCount: 2`, `sampleRate: 48000`,
  `sampleSize: 16`. `getCapabilities()` reports `sampleRate {min:48000, max:48000}` — the device
  is fixed at 48 kHz, so **there is no resampler in the path**.
- ✅ **MEASURED** — An `AudioWorklet` running the full **ITU-R BS.1770 K-weighting biquad chain**
  on **2 channels** processed **750 of 750 render quanta in 2.000 s with zero dropouts**
  (750 × 128 = 96,000 frames = exactly 2 s at 48 kHz), delivering genuine `Float32Array` PCM. The
  measurement engine is proven to keep up on the audio thread.
- ✅ **MEASURED** — `http://localhost` is a secure context (`isSecureContext: true`). **No HTTPS
  needed** for the existing Express server.

### 1.4 The scoring

| Criterion | TUI (Python/Rust/Go) | **FliHub panel** |
|---|---|---|
| Hardware access | No advantage — §1.2 | No disadvantage |
| Raw unprocessed PCM | Yes | ✅ **Yes — verified** |
| Native 48 kHz, no resampling | Yes | ✅ **Yes — verified** |
| Real-time DSP headroom | Yes | ✅ **Yes — 750/750 quanta verified** |
| Toolchain present today | ❌ **No** — see below | ✅ Node 24 + FliHub already running |
| Spectrum / polar / colour UI | Poor (ASCII) | ✅ Native strength |
| Effort to add a surface | New app from zero | ✅ **5-line tab seam** — §5.6 |
| Glanceable while at the mic | Good | Good (full-screen the tab) |

**The toolchain point is not theoretical.** ✅ **MEASURED** on this machine: Python is **3.14.5**,
and `numpy`, `scipy`, `sounddevice`, `soundfile`, `textual` and `rich` are **all absent**;
`portaudio` is not installed. Python 3.14 is new enough that binary-wheel availability for the
scientific stack is a live risk, so Option 1 starts with an install project that may need
compilation — before a single line of the actual tool exists.

### 1.5 Honest case for the TUI

Two real advantages, neither decisive:

1. A terminal window is lighter to keep open beside a recording setup than a browser tab.
2. No dependency on FliHub's dev server being up.

Both are outweighed by the fact that **the core deliverable is graphical** — a live spectrum, a
green/orange/red panel, and a position-feedback display. Rendering that in ASCII is strictly
worse at the exact thing David asked for ("tell me where things are wrong").

### 1.6 The recommendation, stated plainly

> **Build MicCheck as a new FliHub tab.** The browser reaches the microphone with full fidelity
> — verified today, on this machine, on this mic. There is no hardware advantage to give up,
> the visual requirements favour the web, and the app is already running.

---

## 2. The metric set

### 2.0 How the thresholds were derived — and the one reframe that matters

⚠️ **The targets in the brief (−20 to −16 LUFS integrated, −12 to −6 dBTP) are *delivery*
targets, not *capture* targets. Using them at the microphone is arithmetically impossible for
David right now.** Here is the proof, from his own two recordings today:

| Take | Integrated | True peak | **PLR** (peak − loudness) | Source |
|---|---|---|---|---|
| 11:24:57 | −40.2 LUFS | −10.8 dBTP | **29.4 LU** | 📄 `audio-clean` report |
| 11:51:51 | −39.0 LUFS | −18.7 dBTP | **20.3 LU** | ✅ **MEASURED** (ffmpeg `ebur128`) |

To reach −18 LUFS from take B you must add **+21 dB**, which puts the true peak at **+2.3 dBTP** —
**clipped**. Conversely, setting gain so the true peak lands at a safe −8 dBTP yields only
**−28.3 LUFS**. ✅ **MEASURED / derived.**

**Both targets cannot be satisfied at once, at any gain setting, because his peak-to-loudness
ratio is 20–29 LU.** 📄 A healthy spoken-word PLR is around 11–15 LU (EBU Tech 3343 defines PLR;
AES TD1008 discusses it). David's delivery is roughly **6–15 LU too wide**.

This is the single most valuable thing the measurement revealed, and it reframes the tool:

> **Gain alone can never fix this. The peak meter is lying to him** — one loud transient parks
> the peak 20–29 dB above the body of his speech, so setting gain by peaks leaves the voice far
> too quiet. MicCheck must set gain by **short-term loudness**, use true peak only as a *guard*,
> and display **PLR/PSR as a first-class metric** because it is the number that reconciles them.

Accordingly, **MicCheck targets a capture window and hands final loudness to `audio-clean`:**

| At capture (MicCheck) | At delivery (`audio-clean`) |
|---|---|
| Short-term LUFS **−26 to −20** during speech | Integrated **−18 to −14 LUFS** |
| True peak **≤ −6 dBTP** | True peak **−1 dBTP** |
| Maximise SNR and minimise PLR | Apply make-up gain |

📄 **Anchor for the capture window** — ACX (Audible) publishes the only hard, public spoken-word
capture spec: programme **RMS −23 to −18 dBFS**, peak **≤ −3 dBFS**, noise floor **≤ −60 dB RMS**.
MicCheck's window sits deliberately a few dB below ACX's RMS band and well below its peak
ceiling, because ACX describes a *finished, processed* file while this is a *raw* capture that
still has an edit and a denoise pass ahead of it.

### 2.1 The metric table

Every metric is tagged **GAIN**, **POSITION** or **PATTERN** — the physical action it informs.

#### Group A — GAIN metrics (the converter question)

| # | Metric | Green | Orange | Red | Basis |
|---|---|---|---|---|---|
| A1 | **Short-term loudness** (3 s, ungated) — ⭐ *the primary gain needle* | −26 to −20 LUFS | −30…−26 or −20…−17 | < −30 or > −17 | Derived (§2.0) from ACX RMS band + his measured PLR. 📄 EBU Tech 3343 explicitly recommends the **3 s short-term** window for setting a narrator's voice level: *"bridges most gaps between words and sentences, resulting in a stable and easy-to-read indication."* |
| A2 | **Momentary loudness** (400 ms, ungated) | — | — | — | 📄 ITU-R BS.1770-5 / EBU Tech 3341. Display only, for transient detail. Not colour-coded. |
| A3 | **True peak (dBTP)** — *the guard, not the target* | −12 to −6 | −6 to −3 | > −3, or any sample ≥ 0 | 📄 ACX peak ceiling **−3 dBFS**; −6 keeps margin for an unrehearsed loud moment. 📄 True peak requires **4× oversampling** (BS.1770-5 Annex 2) — at 48 kHz that is exactly the required 192 kHz. |
| A4 | **Clip / near-clip count** | 0 | 1–2 near-clip | any true clip | 🔶 Convention. Near-clip = sample ≥ −0.5 dBFS; clip = ≥ 3 consecutive samples at full scale. |
| A5 | **PLR** (max true peak − integrated) and **PSR** (true peak − short-term) — ⭐ *the reconciler* | PSR 9–14 | 14–18 | > 18 or < 7 | 🔶 **Convention, must be labelled.** PLR is 📄 defined in EBU Tech 3343; PSR in 📄 AES e-Brief 373 (2017). The *thresholds* are not standardised. Calibrated against his measured 20.3 / 29.4 LU. |
| A6 | **DC offset** | < 0.1 % FS | 0.1–1 % | > 1 % | 🔶 **Convention — no vendor or standards body publishes a threshold.** ✅ **MEASURED**: his QuadCast reads −0.000013 (≈0.001 %), i.e. clean. Include as a fault detector only. |

**Why A1 and not "integrated"**: 📄 integrated loudness is gated and converges over a whole
programme — EBU Tech 3341 requires it update at only ≥1 Hz. It is the wrong instrument for a
man turning a knob. Short-term updates at ≥10 Hz and settles in ~3 s.

**A note on bit depth that justifies the whole GAIN task.** 📄 The QuadCast is **48 kHz / 16-bit,
fixed** (HyperX manual p.4; ✅ confirmed — Chrome reports `sampleSize: 16`). At his measured
speech RMS of **−42.8 dBFS**, he is using roughly **7 of the 16 bits**. That is the concrete cost
of under-gaining on a 16-bit device, and it is not recoverable in post.

#### Group B — POSITION metrics (where he sits)

| # | Metric | Green | Orange | Red | Basis |
|---|---|---|---|---|---|
| B1 | **Live SNR** = speech level − pause level — ⭐ *see §2.2* | ≥ 40 dB | 30–40 dB | < 30 dB | 📄 ACX's −60 dB floor against a −23…−18 dB programme **implies 37–42 dB**. Independently, `audio-clean`'s own doc: *"Under ~25 dB is poor; over 35 is good; broadcast wants >40."* Two sources agree. ✅ His measured SNR today: **33.8 dB** — orange. |
| B2 | **Proximity-effect index** = LF band (< 150 Hz) energy ÷ speech band (150 Hz–5 kHz), during speech | −9 to −5 dB | −5 to −2, or < −12 | > −2 dB (boomy) | 🔶 Convention, calibrated on ✅ **MEASURED** data: his 11:51 take reads **−6.15 dB** and sounds correct. 📄 The physics is real: a DPA 4011 cardioid shows **+12 dB at 20 Hz at 10 cm** vs **−18 dB at 100 cm**. Boost concentrates **below ~200 Hz**. |
| B3 | **Plosive / pop events** (LF transient burst during speech) | 0 per 30 s | 1–2 | ≥ 3 | 🔶 Convention. Detect a > 6 dB rise in the 20–300 Hz band over 20 ms **without** a matching rise in the speech band. ⚠️ **Label this "pop", not "plosive"** — 📄 the phonetic /p/ /t/ /k/ burst peaks **above 3 kHz**; the *pop artifact* is the LF aerodynamic blast. Conflating them makes the tool look broken to anyone who knows phonetics. |
| B4 | **Sibilance index** = 5–10 kHz ÷ speech-band energy | −16 to −10 dB | −10 to −7 | > −7 dB | 🔶 **Convention — no open standard exists.** ✅ His measured value: **−12.26 dB** (comfortable). ⚠️ 📄 Band must be **speaker-adjustable**: male /s/ peaks ~5–6 kHz, female ~7–8 kHz. Both FabFilter Pro-DS and Waves Sibilance expose the band precisely because there is no canonical value. |
| B5 | **Direct-to-reverberant estimate** | — | — | — | 📄 Blind RT/DRR estimation is real but immature (Ratnam et al., JASA 114(5), 2003; ACE Challenge 2016 — *"DRR estimation is a less mature field"*). **Ship as an unlabelled trend line, not a graded metric.** See §6, Phase 4. |

#### Group C — PATTERN metrics (which way it listens)

| # | Metric | Green | Orange | Red | Basis |
|---|---|---|---|---|---|
| C1 | **L/R correlation** — *pattern-mode detector* | See §2.3 | | | ✅ **MEASURED, and it settles a question HyperX never documents.** |
| C2 | **Fan-band rejection** (Δ vs reference) — ⭐⭐ *the headline readout, §2.2* | — | — | — | Relative meter; see §2.2. |
| C3 | **Off-axis response profile** | See §4, Step 3 | | | 📄 Derived from first-order polar math, cross-checked. |

### 2.2 ⭐ The background-noise-rejection readout — designed deliberately

This is flagged in the brief as likely the single most valuable number, and I agree. Here is
the design, grounded in what I measured in his actual room.

**What his room actually sounds like.** ✅ **MEASURED** — a 6-second idle capture (mic live, no
speech), octave-band RMS:

| Band | 63 Hz | 125 Hz | **250 Hz** | 500 Hz | 1 k | 2 k | 4 k | 8 k | 16 k |
|---|---|---|---|---|---|---|---|---|---|
| dBFS | −77.8 | −75.5 | **−74.2** | −76.8 | −79.5 | −82.8 | −88.1 | −92.2 | −99.0 |

**The noise is low-mid dominated and peaks at 250 Hz** — the classic signature of fans and HVAC.
It falls monotonically above that, ending **25 dB down by 16 kHz**.

This directly explains the "sting" David heard: the noise he could hear after processing was
never loud at the source, but `audio-clean`'s **+26.1 dB** lifted the whole curve, and the
6–16 kHz region — where the ear is most sensitive to hiss — rose from inaudible to audible.

**The mechanism, and the honest limit.** ✅ **MEASURED / derived** — his room tone sits at
**−63.6 dBFS RMS**, while 📄 the QuadCast's specified self-noise is **≤ −95 dBFS (A-weighted)**.
The room is **~31 dB louder than the microphone's own noise.**

> **Therefore: the room is the problem, not the microphone. A quieter mic would change
> nothing.** Only POSITION and PATTERN can improve this.

**The readout.** Three numbers, updated live:

```
┌─ BACKGROUND NOISE ────────────────────────────────┐
│                                                   │
│   Live SNR          33.8 dB      ●  needs work    │
│   Fan band (125–500 Hz)   −74.2 dBFS              │
│                                                   │
│   vs. reference        −4.2 dB   ▼  better        │
│   ▁▁▂▃▅▆█▆▅▃▂▁  (last 60 s)                       │
└───────────────────────────────────────────────────┘
```

**How it works** — a *dual-gated* meter, the same principle `audio-clean` uses offline:

1. Classify every 400 ms block as **SPEECH** or **PAUSE** (level threshold + spectral flatness).
2. Maintain two running levels: speech loudness (from SPEECH blocks) and noise floor (from
   PAUSE blocks).
3. **Live SNR = speech − pause.** Gain-invariant, so it does not move when he turns the knob —
   which is exactly what makes it the right meter for POSITION and PATTERN.
4. **Fan-band level** = pause-block energy in **125–500 Hz** (chosen from the measured spectrum
   above, not guessed).
5. **Δ vs reference**: snapshot a reference at session start; show the live delta prominently.
   As he rotates the pattern knob or moves, the delta moves. **This is the number he watches.**

⚠️ **Critical honesty requirement**: the noise floor **in dBFS rises when he turns up the gain**,
even though the room got no louder. If the UI showed only absolute dBFS, correctly setting gain
would look like ruining the room. **The Δ readout and the SNR must therefore be the prominent
numbers, and the absolute dBFS must be visually subordinate.**

**Set expectations honestly — pattern changes buy less than position changes.** 📄 Derived from
first-order polar math (verified by independent derivation and against Rane's technical notes):

| Pattern | Random Energy Efficiency | **Diffuse-field rejection vs omni** | Distance factor |
|---|---|---|---|
| Omni | 1.000 | 0 dB | 1.00 |
| **Cardioid** | 0.333 | **−4.77 dB** | 1.73 |
| Bidirectional | 0.333 | **−4.77 dB** | 1.73 |
| (Hypercardioid) | 0.250 | −6.02 dB | 2.00 |

> **Switching from omni to cardioid buys at most ~4.8 dB against diffuse fan noise.**
> **Halving his distance to the mic buys ~6 dB** — direct sound rises 6 dB per halving while the
> diffuse field stays put.
>
> **So POSITION is the bigger lever, and the tool should say so.** The trade-off it must then
> police is B2: moving closer increases proximity-effect bass boost and B3 pop risk.

This is the correct advice and it is quantified rather than asserted.

### 2.3 ⭐ The pattern detector — a genuinely undocumented question, settled by measurement

📄 HyperX **nowhere states** whether L and R carry different signals per polar pattern. The USB
descriptor is fixed at 2 channels regardless of knob position, so the OS always shows stereo.

✅ **MEASURED — I settled it.** Two independent tests:

- On a raw 6 s ffmpeg capture: the **L−R difference signal** measures **−93.0 dBFS RMS**, peak
  −80.8 dBFS, with a maximum sample difference of **±3 LSB** — i.e. the 16-bit quantisation floor.
- On his real 27 s speech recording: **L−R nulls to −inf dBFS** (a perfect null).

> **Conclusion: in its current position, the QuadCast duplicates one mono signal to both
> channels, exactly.** The mic is **not** in Stereo mode.

**This gives the tool a free, reliable Stereo-vs-mono detector:**

| Reading | Meaning |
|---|---|
| Correlation ≈ **+1.000**, L−R at the quantisation floor | A **mono** pattern — cardioid, omni or bidirectional |
| Correlation materially **< 1**, L−R well above the floor | **Stereo** mode |
| Correlation ≈ **−1** | Polarity fault — a red alert, never normal |

⚠️ **What this does NOT establish — and the tool must not pretend otherwise.**
**Correlation cannot distinguish cardioid from omni from bidirectional.** All three are mono, so
all three read +1.000 and look identical on this meter. Telling them apart requires an
*acoustic* test — moving a sound source around the mic — which is why §4 Step 3 exists.

**If MicCheck reported a pattern name from correlation alone, it would be guessing.** It must
report "mono pattern (one of three)" and offer the Step 3 wizard to identify which.

### 2.4 Metrics deliberately **excluded** from v1

| Metric | Why not |
|---|---|
| Integrated LUFS as a live gauge | Gated, converges slowly; 📄 EBU Tech 3341 requires only ≥1 Hz updates. Wrong instrument for knob-turning. Show it, don't grade it. |
| RT60 / reverb tail | 📄 Blind estimation is immature (ACE Challenge); accuracy runs to *tens of percent* RMSD. Would produce a confident-looking number that is wrong. Phase 4 at best. |
| STI (speech transmission index) | 📄 IEC 60268-16 gives the one ready-made 5-band scale — but STI needs a known test signal, not live speech. |
| Pop-filter effectiveness in dB | ⚠️ 📄 **No real figure exists.** The circulating "up to 15 dB" numbers trace to an AI-generated site with fake DOIs. Do not ship any such number. |
| A "which pattern are you in" auto-label | See §2.3 — not determinable electrically. |

---

## 3. UI layout and the green/orange/red model

> ### 🔄 PHASE 1.5 REVISION — 2026-08-26
>
> **The original §3 measured *state*. It needed to show *movement*.**
>
> David is turning a knob he cannot see while reading a meter he cannot look at simultaneously.
> A correct-but-static number does not help him: he needs to know whether the last thing he did
> made it **better or worse**, and by how much, in the unit he is adjusting.
>
> **The framing:** *you are not reading a meter, you are playing hot-and-cold with your own voice.*
>
> §3.0 (modes), §3.4 (trajectory), §3.5 (change events) and §3.6 (live events) are new.
> §3.1 and §3.2 are revised. Phase 1 shipped as `7553b9b`; this is a revision, not a rewrite.

### 3.0 Two modes — explicitly switched, never inferred

The original design derived speech-vs-pause by gating inside one continuous view. **Replace that
with an explicit mode toggle.** The two states need different screens, different metrics and
different instructions, and inferring the mode means a wrong inference produces a *confidently
wrong reading*.

| | **ROOM** | **SPEAKING** |
|---|---|---|
| David is | silent, ~10 s | talking, continuous |
| Purpose | Characterise the enemy, store the reference | Dial in |
| Shows | Noise floor · spectrum with fan band called out · **dominant frequency** | Everything else |
| Loudness / SNR / PSR | ⚪ **GREY, with the reason** — meaningless without speech | graded |
| Ends by | Capturing the room-tone reference every later Δ compares against | — |

**ROOM mode's headline readout is the dominant frequency**, not a level: *"Your room peaks at
250 Hz — fan/HVAC rumble."* A number he can act on beats a level he cannot interpret.

⚠️ **Mode must be obvious and persistent on screen** — a large, permanent indicator, not a subtle
tab. **A wrong-mode reading is a lying reading**, and an SNR computed against no reference, or a
loudness computed during silence, is exactly the absence-looks-like-success failure this spec
exists to avoid.

⚠️ **SPEAKING mode is unavailable until ROOM has been captured.** Every Δ, every rejection figure
and the whole background panel are *relative to the stored reference*. Offer it greyed with the
reason, never silently degraded.

### 3.1 The colour model *(revised)*

| Colour | Meaning | What the UI must do |
|---|---|---|
| 🟢 **Green** | In range | Say nothing more |
| 🟠 **Orange** | Usable, improvable | Name the action **and the distance** |
| 🔴 **Red** | Will damage the recording | Name the action, the distance **and the consequence** |
| ⚪ **Grey** | **Not yet measurable** | State the reason. **Never default to green** |

**Every non-green state carries three things, not one:**

1. **An imperative naming the physical control** — *"turn the GAIN knob"*, not *"level low"*
2. **The distance, in the unit he is adjusting** — *"+4 dB"*, never *"orange"*
3. **A direction indicator** — is the last thing he did helping? (§3.4)

⚠️ **The imperative must flip on overshoot.** *"turn GAIN up ~4 dB"* becomes *"back off ~2 dB"*
the moment he goes past. An instruction that only ever points one way trains him to overshoot.

**Grey remains load-bearing.** *"No pause detected, so SNR is unmeasured"* and *"SNR is fine"*
must never look the same. `audio-clean` hit exactly this on 2026-08-26 with
`SNR unmeasurable: no pause found`.

### 3.2 Layout — SPEAKING mode *(revised)*

> ⚠️ **This layout is the TARGET END-STATE, not the Phase 1.5 increment.**
>
> As drawn it shows B1 (SNR), B2 (proximity), B3 (pops), B4 (sibilance), C1 (correlation) and
> C2 (fan-band Δ) — which §6 assigns to **Phases 2 and 3**. The "1.5" label describes the *UX
> model* (modes + trajectory + events), **not** the metric coverage.
>
> Read as "the next small step after Phase 1" it will mislead: the layout needs nearly all of
> Phases 2 and 3 to populate. Build the frame in 1.5 and let panels arrive grey-with-reason as
> their metrics land — which is exactly what §3.1's grey state is for, and doubles as a live
> demonstration that grey ≠ green.
>
> *(Raised by `flihub-fix-bugs`, 2026-08-26. Correct catch.)*


```
┌─ MicCheck ─ [ ROOM │ ●SPEAKING ] ─── ● HyperX QuadCast · 48 kHz · 2ch · 16-bit ─┐
│                                                                                 │
│  ┌── GAIN ───────────────────────────────────────────────────────────────────┐  │
│  │  Short-term      -28.4 LUFS    🟠    ▲ improving                          │  │
│  │  ╭─────────────────────────────────────────────────────────────────────╮  │  │
│  │  │      ╷            ╷                                    ▁▂▃▄▅▆       │  │  │
│  │  │  ▁▁▂▂│▃▃▃▃▄▄▄▄▄▄▄▄│▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▆▆▆▆▆▆▆▆▆       │  │  │
│  │  ╰──────┴────────────┴─────────────────────────────────────────────────╯  │  │
│  │         ↑ knob        ↑ knob                              ← 30 s →        │  │
│  │                                                                           │  │
│  │  ▶  TURN GAIN UP  ~4 dB          target -26…-20 LUFS                      │  │
│  │                                                                           │  │
│  │  True peak       -18.7 dBTP    🟢    guard — headroom 12.7 dB             │  │
│  │  Clips  0   ·   Near-clip  0                                              │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  ┌── POSITION ─────────────────────┐  ┌── PATTERN ─────────────────────────┐    │
│  │  SNR       33.8 dB  🟠  ▼ worse │  │  Fan-band Δ   -4.2 dB   ▲ better   │    │
│  │  ▁▂▃▅▆▇▆▅▃▂▁▁▂▃▄▅▄▃▂            │  │  ▁▁▂▃▅▆█▆▅▃▂▁      vs ROOM ref     │    │
│  │  ▶ MOVE CLOSER — you're 6 dB    │  │  ▶ rear knob: keep turning         │    │
│  │    short, and gain won't fix it │  │    (rejection caps ~4.8 dB)        │    │
│  │  Proximity -6.2 dB  🟢  ● flat  │  │  ⓘ pattern change detected 8 s ago │    │
│  └─────────────────────────────────┘  └────────────────────────────────────┘    │
│                                                                                 │
│  ┌── EVENTS ─────────────────────────────────────────────────── last 60 s ──┐   │
│  │  12:41:08  ● pop            "…particular…"                               │   │
│  │  12:41:02  ◆ pattern change  correlation 1.00 → 0.62                     │   │
│  │  12:40:51  ● sibilance       -6.8 dB — above comfort                     │   │
│  │  12:40:44  ◆ gain change     level step +5.2 dB                          │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**ROOM mode** shows only: noise floor, the spectrum with the fan band shaded and labelled, the
dominant-frequency callout, and a capture button. **Everything speech-derived is grey with its
reason.** It ends by storing the reference and offering the switch to SPEAKING.

### 3.3 Non-negotiable UI rules

1. **The device name is always on screen.** See §5.2 — the default input on this machine is *not*
   the QuadCast, and picking the wrong one silently invalidates everything.
2. **The mode is always on screen** (§3.0).
3. **The spectrum overlays the stored ROOM reference** (dotted) under the live trace.
4. **Named band regions under the spectrum axis** — fan / speech / sibilance. It teaches while it
   measures.
5. **Grey ≠ green** (§3.1).
6. **A "why?" affordance on every threshold**, revealing its basis and whether it is 📄 standard or
   🔶 convention.

### 3.4 ⭐ Trajectory — the part the original spec was missing

Every graded metric carries **four** things: current value, colour, **direction**, and **distance
to target in the adjustment unit**.

#### Direction detection — and why it needs hysteresis

Naively comparing successive samples makes the arrow flicker on knob noise and normal speech
variation, and **a flickering arrow destroys trust faster than no arrow at all.**

🔶 **Convention — these values are a starting point, tune them on real use:**

| Parameter | Value | Why |
|---|---|---|
| Comparison window | **3 s median** vs the preceding **3 s median** | 📄 Matches the EBU Tech 3343 short-term window; median rejects single transients |
| Update rate | **2 Hz** | Fast enough to feel live, slow enough to be readable |
| **Dead-band** | **±0.7 dB** → show `● flat` | Below this is speech variation, not a knob turn |
| **Hysteresis** | **3 consecutive** same-direction updates before the arrow flips | ~1.5 s of agreement. Prevents oscillation at the boundary |
| Sparkline | **30 s**, 60 points at 2 Hz | Long enough to show two or three adjustments as a shape |

**Direction is relative to the target, not to the value.** Moving from −34 to −30 LUFS is
`▲ improving` (toward the window); moving from −22 to −18 is `▼ worsening` (past it). ⚠️ Getting
this backwards on the far side of the target is the obvious implementation bug — **write the test
first.**

#### Distance-to-target

Report against the **centre** of the green band, not its edge, so he lands mid-window rather than
teetering:

| Metric | Target centre | Reported as |
|---|---|---|
| Short-term LUFS | **−23 LUFS** | `TURN GAIN UP ~4 dB` |
| True peak | guard only | `headroom 12.7 dB` — never an instruction to raise |
| SNR | ≥ 40 dB | `you're 6 dB short` |
| Fan-band Δ | vs ROOM ref | `-4.2 dB` — signed, lower is better |

⚠️ **Round to whole dB.** `~4 dB` is actionable on a knob with no markings; `4.3 dB` implies a
precision the hardware does not have.

### 3.5 ⭐ Change-event markers — the causal link

**He cannot watch the knob and the meter simultaneously.** Without markers he sees *that* a number
moved but not *what moved it*, and the whole loop fails.

**Detect a discontinuity and drop a vertical marker on every sparkline**, timestamped into the
event log:

| Signal | 🔶 Trigger | Reads as |
|---|---|---|
| **Level step** | short-term LUFS moves **> 3 dB within 500 ms** and holds ≥ 2 s | `gain change` |
| **Correlation step** | \|Δ L/R correlation\| **> 0.15** sustained 1 s | `pattern change` |
| **Spectral shape** | cosine distance between successive 1 s mean spectra **> 0.15** | `position or pattern change` |

⚠️ **A marker is a hypothesis, not a fact.** Label it *"level step detected"*, not *"you turned the
gain"* — he may have leaned in, or a fan may have cycled. Overclaiming causation here is the same
error class as the rest of this document.

### 3.6 ⭐ Live event detection while speaking

David explicitly wants the tool to **tell him what it notices**. Each fires as a **timestamped
event on the timeline**, not merely a counter — a counter says *"3 pops"*; a timeline says *"a pop
when you said 'particular'"*, which he can act on.

| Event | 🔶 Detection | Note |
|---|---|---|
| **Pop** | > 6 dB rise in **20–300 Hz** over 20 ms **without** a matching speech-band rise | ⚠️ **Label "pop", never "plosive"** — 📄 the phonetic /p/ burst peaks *above* 3 kHz; the pop artifact is the LF aerodynamic blast. Conflating them makes the tool look broken to anyone who knows phonetics |
| **Sibilance excursion** | 5–10 kHz ÷ speech band exceeds **−7 dB** for > 200 ms | Band must be speaker-adjustable |
| **Clipping** | any true clip, or ≥ 3 near-clips in 10 s | Red, always |
| **Level instability** | short-term LUFS range **> 8 dB** across a 15 s window | Reads as *"you're moving"* — distinguishes drift from a deliberate adjustment |

#### 🔓 Open question — audible alerts

David asked to *hear* about events. A soft tick on a pop would close the loop faster than a visual.

⚠️ **But anything routed into his monitoring path risks contaminating the measurement** — the tick
re-enters through the microphone and could itself register as an event, or as noise in the floor.

**Deliberately unresolved.** Options, none chosen:
- Visual only *(safe, slowest feedback)*
- Audible, but **only in ROOM mode** *(no speech to contaminate — but events fire in SPEAKING)*
- Audible on a **separate output device** from the monitoring path *(needs verification that the tick is not picked up acoustically)*
- **Post-session** audible summary *(no contamination, no live loop)*

Decide with a measurement, not an opinion: fire the tick, measure whether the floor moves.

---


### 3.1 The colour model

Three states, and one rule that makes the tool trustworthy:

| Colour | Meaning | What the UI must do |
|---|---|---|
| 🟢 **Green** | In range | Say nothing more |
| 🟠 **Orange** | Usable, improvable | Name the action: *"turn the gain knob up slightly"* |
| 🔴 **Red** | Will damage the recording | Name the action **and** the consequence |

**Every non-green state must carry an imperative naming the physical action** — turn *this*
knob, move *this* way. A colour with no instruction is exactly the "I can't tell what's wrong"
problem David already has.

**Grey = not yet measurable.** A metric with insufficient data (no speech yet, no pause yet)
shows **grey with the reason**, never green. ⚠️ This is load-bearing: *"no pause detected, so
SNR is unmeasured"* and *"SNR is fine"* must never look the same. `audio-clean`'s own report hit
this exact failure today — `"SNR unmeasurable: no pause found"` — and the tool must show that
state honestly rather than defaulting to a reassuring colour.

### 3.2 Layout sketch

```
┌─ MicCheck ─────────────────────────────────── ● HyperX QuadCast (48 kHz · 2ch · 16-bit) ─┐
│                                                                                          │
│  ┌── LEVEL ──────────────────────────┐  ┌── BACKGROUND NOISE ─────────────────────────┐  │
│  │                                   │  │                                             │  │
│  │  Short-term    -28.4 LUFS   🟠    │  │  Live SNR         33.8 dB            🟠     │  │
│  │  ▁▁▂▃▅▆▇█▇▆▅▃▂  (3 s)             │  │  Fan band         -74.2 dBFS                │  │
│  │  ↑ turn GAIN knob up ~4 dB        │  │                                             │  │
│  │                                   │  │  vs reference     -4.2 dB   ▼ better        │  │
│  │  True peak     -18.7 dBTP   🟠    │  │  ▁▁▂▃▅▆█▆▅▃▂▁  (60 s)                       │  │
│  │  ├──────────────┤····┤             │  │                                             │  │
│  │  -20    -12   -6  -3  0           │  │  [ Set reference ]                          │  │
│  │                                   │  │                                             │  │
│  │  PSR           20.3 LU      🔴    │  └─────────────────────────────────────────────┘  │
│  │  ⚠ dynamics too wide — peaks are  │                                                   │
│  │    28 dB above your speech, so    │  ┌── POSITION ─────────────────────────────────┐  │
│  │    the peak meter misleads you    │  │  Proximity (LF)   -6.2 dB            🟢     │  │
│  │                                   │  │  Pops (30 s)      0                  🟢     │  │
│  │  Clips  0        Near-clip  0  🟢 │  │  Sibilance        -12.3 dB           🟢     │  │
│  └───────────────────────────────────┘  └─────────────────────────────────────────────┘  │
│                                                                                          │
│  ┌── SPECTRUM ─────────────────────────────────────────────────────────────────────────┐ │
│  │  dBFS                                    ── live    ┈┈ room reference (pause)       │ │
│  │   -40 ┤          ▄▄▄▄▄▄                                                             │ │
│  │   -60 ┤      ▄▄██████████▄▄▄                                                        │ │
│  │   -80 ┤┈┈┈▄███████████████████▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄            │ │
│  │  -100 ┤                                                                             │ │
│  │       └──┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬──            │ │
│  │         31    63   125   250   500    1k    2k    4k    8k   16k                    │ │
│  │              └── fan band ──┘         └────── speech ──────┘  └ sibilance ┘         │ │
│  └─────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                          │
│  ┌── PATTERN ──────────────────────────────────────────────────────────────────────────┐ │
│  │  L/R correlation  +1.000  →  MONO pattern (cardioid, omni or bidirectional)          │ │
│  │  ⓘ Correlation cannot tell these three apart.  [ Identify my pattern → ]             │ │
│  └─────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                          │
│  [ ● Guided calibration ]   [ Save session report ]        Device: not shared with Ecamm │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Non-negotiable UI rules

1. **The device name is always on screen.** ⚠️ See §5.2 — the default input on this machine is
   *not* the QuadCast, and picking the wrong one silently invalidates everything.
2. **The spectrum overlays a stored room-tone reference** (dotted) under the live trace. This is
   what makes fan noise *visible* rather than merely numeric.
3. **Named band regions under the spectrum axis** — fan / speech / sibilance. It teaches while
   it measures.
4. **Grey ≠ green** (§3.1).
5. **A "why?" affordance on every threshold** revealing its basis and whether it is 📄 standard
   or 🔶 convention. This is how the tool stays honest about §0.1.

---

## 4. Guided calibration flow

Five steps, strictly ordered. **The order is not arbitrary**: gain is set last-but-one because
moving position and pattern changes the level, and re-setting gain afterwards would be wasted
work. Each step has an explicit pass condition and cannot be skipped silently.

> ### 🔄 PHASE 1.5 — the flow is now mode-driven
>
> **Step 1 *is* ROOM mode. Steps 2–5 *are* SPEAKING mode.** The wizard is no longer a separate
> construct laid over a single view — it is a scripted walk through the two modes of §3.0, so
> the guided and free-running paths share one implementation and cannot drift apart.
>
> **Every step gains a trajectory target.** A step passes when its metric is not merely *in range*
> but **stable in range** — 🔶 within band and `● flat` for ≥ 3 s. Passing on a value that is
> still moving means passing on a value he is about to move past.
>
> **Every step shows its sparkline and change markers** (§3.4, §3.5), so the wizard teaches the
> same reading skill the free-running view needs. A user who finishes calibration should be able
> to drive the main screen unaided — that is the wizard's real output, alongside the settings.

### Step 0 — Device & integrity check *(automatic, ~2 s)*

- Enumerate inputs; **pin the QuadCast by `deviceId`**, never `default`.
- Assert `getSettings()` shows `autoGainControl:false`, `noiseSuppression:false`,
  `echoCancellation:false`, `voiceIsolation:false`, `channelCount:2`, `sampleRate:48000`.
- Display all four alongside `getCapabilities()` and `getSupportedConstraints()`.

**Pass**: all constraints honoured, QuadCast selected.
**Fail**: hard stop with the reason. Never measure through a virtual device.

### Step 1 — Room tone *(≈10 s, David silent)*

*"Sit where you'll record. Don't speak. Don't type."*

Captures the reference noise floor and the reference spectrum. Everything in §2.2 is measured
against this.

- **Pass**: 10 s captured with no speech detected.
- **Records**: octave-band noise profile, fan-band level, broadband RMS.
- **Reports**: *"Your room's noise peaks at 250 Hz — that's fan/HVAC rumble. It sits ~31 dB
  above your microphone's own noise, so the room is what we're fixing, not the mic."*

### Step 2 — Position *(≈60 s, David talking and moving)*

*"Read this passage. I'll ask you to move."* — a scripted passage rich in /p/ and /s/.

Sub-steps, each ~15 s: **current position → one hand-span closer → one hand-span further →
slightly off-axis (speak past the grille, not into it)**.

⚠️ 📄 The QuadCast is a **side-address** mic — he speaks into the **front grille**, not the top.
HyperX publishes **no** distance or angle guidance for it, so the tool must *find* his optimum
empirically rather than cite a number.

- **Live**: SNR (B1), proximity index (B2), pop count (B3).
- **Pass**: a position achieving **SNR ≥ 30 dB** with **proximity −9…−2 dB** and **≤ 1 pop**.
- **Output**: a small table of the four positions ranked, and *"stay here"*.
- **Teaches**: closer = better SNR (+6 dB per halving) but more bass and more pops. The tool
  shows him the trade-off rather than describing it.

### Step 3 — Pattern identification & selection *(≈45 s)*

**First, identify what he is in.** Correlation gives Stereo-vs-mono for free (§2.3). To
distinguish the three mono patterns, the wizard runs a real acoustic test — speak at roughly
constant distance from three angles:

📄 Expected results, derived from `r(θ) = A + B·cos θ`:

| Pattern | Front (0°) | Side (90°) | Rear (180°) |
|---|---|---|---|
| **Omnidirectional** | reference | ≈ **0 dB** | ≈ **0 dB** |
| **Cardioid** | reference | **−6 dB** | **deep null** |
| **Bidirectional** | reference | **deep null** | ≈ **0 dB** |
| **Stereo** | — | strong **L/R divergence** | — |

The three signatures are unambiguous, so the identification is sound.

**Then, choose.** With the reference from Step 1, rotate the rear knob through positions while
watching **Δ fan rejection** (§2.2).

- **Pass**: the pattern giving the best SNR at his Step 2 position — expected to be **cardioid**
  for a solo talking head.
- **Expectation set honestly up front**: *"This is worth about 4–5 dB at best. Your position
  mattered more."*
- ⚠️ **Tool cannot verify the knob's physical position** — it infers from acoustics. It must say
  *"this sounds like cardioid"*, never *"you are in cardioid."*

### Step 4 — Gain *(≈45 s, David reading at his final position)*

Only now, with position and pattern fixed.

*"Read at your normal presenting volume — including your loudest moment."*

- **Primary needle**: short-term LUFS (A1), target **−26 to −20**.
- **Guard**: true peak (A3) must stay **≤ −6 dBTP**.
- **Instruction**: an explicit dB delta and a direction — *"turn the gain knob up about 4 dB"* —
  updated live. 📄 HyperX documents the direction only as a **graphic** (a "+" and "−" rotation
  arrow, with five shrinking dots read against a fixed ▼ index). ⚠️ The widely-repeated
  *"clockwise increases gain"* is **not HyperX text** and is unverified. **So the tool must
  teach direction empirically**: *"turn it slightly and I'll tell you if that was the right
  way."*
- ✅ **Pass**: short-term LUFS in the green band **and** true peak ≤ −6 dBTP.
- 🔴 **The special case that will fire for David**: if short-term is in range but true peak
  breaches, **or** the two cannot be satisfied together, report the **PSR** finding explicitly:

  > *"Your loudest moments are ~20 dB above your speaking level. No gain setting fixes that.
  > It's dynamics, not gain — either even out your delivery, or accept a lower level and let
  > `audio-clean` make it up."*

  This is the specific failure that produced the −40.2 LUFS recording, and naming it is the
  main thing the tool exists to do.

### Step 5 — Verification & report *(30 s)*

A final 30 s take at settled position/pattern/gain. All metrics graded. Written to a JSON
report deliberately **shaped like `audio-clean`'s** so the two are comparable over time:

```json
{
  "tool": "miccheck", "version": "1.0.0",
  "timestamp": "2026-08-26T12:30:00+10:00",
  "device": { "name": "HyperX QuadCast", "sample_rate": 48000,
              "channels": 2, "bit_depth": 16, "processing_disabled": true },
  "room":    { "tone_rms_dbfs": -63.6, "fan_band_dbfs": -74.2, "peak_octave_hz": 250 },
  "capture": { "short_term_lufs": -23.1, "true_peak_dbtp": -7.4,
               "snr_db": 38.2, "psr_lu": 15.7,
               "proximity_db": -6.2, "sibilance_db": -12.3, "pops": 0 },
  "pattern": { "correlation": 1.0, "mode": "mono", "identified": "cardioid",
               "identified_by": "acoustic-test" },
  "checks":  { "level": "green", "peak": "green", "snr": "orange",
               "psr": "orange", "position": "green", "all_passed": false },
  "mode_sequence": [{"mode":"room","dur_s":10},{"mode":"speaking","dur_s":195}],
  "events":  [{"t":44.2,"type":"gain_change","detail":"level step +5.2 dB"},
              {"t":68.1,"type":"pop","detail":"LF burst, no speech-band rise"}],
  "not_measured": ["rt60", "drr"]
}
```

⚠️ Note the `not_measured` array — it is mandatory, and it is the structural fix for the
absence-looks-like-success failure mode.

---

## 5. Technical feasibility findings

### 5.1 Browser audio — ✅ **VERIFIED END-TO-END ON THIS MACHINE TODAY**

I served a test page from a local Node server and drove real Google Chrome (which already holds
macOS microphone TCC permission) against the real QuadCast. Verbatim results:

**Constraint handling** — the critical AGC question:

```json
"quadcast_settings": {
  "autoGainControl": false, "echoCancellation": false,
  "noiseSuppression": false, "voiceIsolation": false,
  "channelCount": 2, "sampleRate": 48000, "sampleSize": 16,
  "latency": 0.002666
}
"quadcast_capabilities": {
  "autoGainControl": [true, false], "echoCancellation": [true, false, "remote-only", "all"],
  "noiseSuppression": [true, false], "voiceIsolation": [true, false],
  "channelCount": {"min": 1, "max": 2},
  "sampleRate": {"min": 48000, "max": 48000},
  "sampleSize": {"min": 16, "max": 16}
}
```

- ✅ **All four processing flags are `false`, requested as `{exact: false}`** — which means
  Chrome *accepted a required constraint* rather than silently ignoring an advisory one. **Had
  it been unable to comply, `getUserMedia` would have thrown `OverconstrainedError`.** This is
  the strongest available in-browser proof.
- ✅ `sampleRate` min = max = **48000** — the device is fixed-rate, so **no resampler** can enter
  the path. 📄 This matters because the Web Audio spec mandates silent resampling when a
  `MediaStreamTrack`'s rate differs from the `AudioContext`'s.
- ✅ `isSecureContext: true` on `http://localhost` — 📄 confirmed by MDN's potentially-trustworthy
  origins rule. **No HTTPS required.**

**AudioWorklet** — the measurement engine:

```json
{ "trackSampleRate": 48000, "contextSampleRate": 48000,
  "workletModuleLoaded": true,
  "workletResult": { "channelsDelivered": 2, "renderQuantumFrames": 128,
                     "quantaProcessed": 750, "framesPerChannel": 96000,
                     "float32Confirmed": true,
                     "kWeighted_LUFS": "-49.78", "samplePeak_dBFS": "-38.36" },
  "renderQuantumSize_attr": "NOT IMPLEMENTED" }
```

- ✅ **750 quanta × 128 frames = 96,000 = exactly 2.000 s at 48 kHz. Zero dropouts** while
  running the two-stage BS.1770 K-weighting biquad chain on both channels.
- ✅ Genuine `Float32Array`, 2 channels, 128-frame quanta.
- ✅ `AudioContext` opened at exactly 48000 to match the device.
- ✅ `renderQuantumSize` (Web Audio 1.1) is **not implemented** in Chrome 152 — so **code
  defensively against `input[0].length`**, never assume 128.

⚠️ **What this does NOT establish.** The K-weighted value above (−49.78 LUFS) is **not a
calibration check**. It was captured at a different moment from my ffmpeg room measurement
(−61.5 LUFS integrated), in a live room whose noise genuinely varied — the browser's own sample
peak was 7 dB higher than ffmpeg's, so the room really was louder. **This test proves the
plumbing, not the accuracy.** 📄 EBU Tech 3341's calibration test (a 1 kHz sine at −18 dBFS must
read −18.0 LUFS ±0.1) is the correct accuracy check, and it must be run against generated files
at build time — see §6, Phase 1 acceptance.

⚠️ **The one hazard that a constraint check cannot see.** 📄 `getSettings()` reports *Chrome's*
view of *Chrome's* processing chain. It has **no visibility below Chrome**. If macOS applied a
system-level Mic Mode (Voice Isolation / Wide Spectrum), `getSettings()` would still say
`noiseSuppression: false` and be telling the truth about Chrome. **Absence of processing and
unreported processing look identical here.** Mitigation is specified in §6, Phase 1.

### 5.2 ⚠️ The device-selection hazard — the most likely way this tool silently lies

✅ **MEASURED** — the macOS **default input device on this machine is `krisp microphone`**, a
**1-channel virtual device** at 71 % volume. Chrome sees it too:

```
"defaultDevice_label": "Default - krisp microphone (Virtual)"
"defaultDevice_settings": { "channelCount": 1, ... }
```

✅ **MEASURED** — four virtual HAL drivers are installed:
`EcammLiveVirtualMic.driver`, `KrispAudio.driver`, `MSTeamsAudioDevice.driver`,
`ParrotAudioPlugin.driver`. Krisp is **running** (PID 28995).

📄 Krisp's own docs confirm it applies AI noise removal between the physical mic and its virtual
device. **Measuring through it would produce a spectacular, entirely fictitious noise-rejection
result.**

> **Mandatory requirement: MicCheck must pin `deviceId: {exact: <QuadCast>}` and must refuse to
> run on any device whose label matches `/krisp|virtual|ecamm|teams|blackhole|loopback/i`.**
> A plain `{audio: true}` gets Krisp's mono, denoised, 71 %-attenuated stream — and every number
> in this spec would be wrong.

Resolve the QuadCast by **label** (`/quadcast|hyperx/i`), then use its `deviceId` — 📄 device IDs
are salted per-origin and rotate when site data is cleared, so the label is the durable key.

### 5.3 Device sharing — ✅ **ANSWERED EMPIRICALLY: it works**

Demoted from blocker to documented capability, per the standalone-tool constraint — but I
answered it anyway, because it governs a future "monitor while recording" mode.

✅ **MEASURED** — with **Ecamm Live running** (PID 26454), I ran **two simultaneous ffmpeg
AVFoundation captures of the QuadCast**. Capture A (6 s) and capture B (3 s, started 2 s into A)
**both exited 0 and both produced valid, non-silent 48 kHz stereo audio.**

📄 **The documented rule**, from Apple's `CoreAudio/AudioHardware.h` on
`kAudioDevicePropertyHogMode`:

> *"A `pid_t` indicating the process that currently owns exclusive access to the AudioDevice or a
> value of **−1 indicating that the device is currently available to all processes**. If the
> AudioDevice is in a non-mixable mode, the HAL will automatically take hog mode on behalf of the
> first process to start an IOProc."*

✅ **MEASURED** — I read hog mode live on every relevant device:

```
HyperX QuadCast [id 132]  hogMode=-1  nominalRate=48000  runningSomewhere=0
HyperX QuadCast [id 138]  hogMode=-1  nominalRate=48000  runningSomewhere=1
krisp microphone [id 96]  hogMode=-1  nominalRate=48000  runningSomewhere=1
```

**Nothing is hogging.** CoreAudio input devices are **shared by default**; exclusivity is opt-in
and is essentially an audiophile *playback* feature (Audirvana, Roon, Tidal). Ecamm does not use
it — consistent with Ecamm shipping a Virtual Mic and documenting Loopback compatibility, both
impossible under hog mode.

**Stated limitation and fallback**, per the brief:

| Situation | Result |
|---|---|
| Normal case | ✅ Both apps read the mic concurrently. Verified. |
| Some app takes hog mode | MicCheck's `getUserMedia` fails or returns silence. **Detect and report** by reading hog mode; do not show zeros. |
| ⚠️ **Sample-rate contention** | 📄 The HAL nominal rate is **device-global**. If one client requests a different rate, the device rate can change **under the other client mid-stream**. |

> **Therefore, even though sharing works: MicCheck must open the device at its existing native
> rate (48 kHz) and never request a different one.** ✅ This is automatic here, since the
> QuadCast's capabilities pin `sampleRate` at min = max = 48000 — there is no other rate to
> request. The risk is real in general and neutralised in this specific case.

### 5.4 macOS audio routing options — and why this tool needs none of them

Raised because David half-remembers using routing to let Wispr Flow and Ecamm share one input.

| Option | Built in? | Cost | Shares one mic to 2 apps? | **Alters the signal?** |
|---|---|---|---|---|
| **Direct multi-client capture** | ✅ yes (CoreAudio) | free | ✅ **YES** — ✅ verified §5.3 | ✅ **No**, at native rate |
| **Aggregate Device** | ✅ yes (Audio MIDI Setup) | free | ❌ **No** | ⚠️ **Yes** if drift correction on |
| **Multi-Output Device** | ✅ yes | free | ❌ **No** — output only | n/a |
| **BlackHole** | ❌ install | free (GPL-3.0) | ❌ not alone | ⚠️ chain adds a clock domain |
| **Loopback** | ❌ install | **$99 USD** | ✅ yes | ⚠️ not established; docs admit lossy conversion |
| **Soundflower** | ❌ install | free | ❌ **non-functional** | n/a |
| **Krisp** *(already installed)* | ❌ | subscription | n/a | 🔴 **Yes — intentional AI DSP** |

**Detail on each:**

- **Aggregate Device** — 📄 Apple: *"combine several audio devices into a single device."* It
  combines **devices for one app**, not **clients for one device**. ⚠️ **The common forum advice
  that an Aggregate lets two apps share a mic is wrong.** Two apps can both open an Aggregate,
  but that is just ordinary multi-client behaviour which already works on the raw QuadCast. And
  📄 Apple defines drift correction as *"also known as resampling"* — **disqualifying for
  measurement whenever it is on.**
- **Multi-Output Device** — 📄 output-only. **Irrelevant to input sharing. Stated plainly so it
  is not tried.**
- **BlackHole** — 📄 free, GPL-3.0, HAL plugin (no kext, so Apple Silicon-clean), 2/16/64-channel
  variants, `brew install --cask blackhole-2ch`, "zero additional driver latency", 32-bit float.
  ⚠️ But it is a **loopback**: something must *write* to it. macOS has no built-in way to route a
  physical input into an output, so a mic→BlackHole chain needs a pumping app **plus** an
  Aggregate — and 📄 BlackHole's own wiki recipe **turns drift correction on**. **Disqualifying
  as a chain.**
- **Soundflower** — 📄 repo README: *"DEPRECATED Silicon Macs are not supported."* Last release
  **2.0b2, December 2014**; it is a **kernel extension**. Dead on macOS 26.5. Notably, Krisp's own
  device block-list contains `soundflower` — a fair signal about its standing.
- **Loopback** (Rogue Amoeba) — 📄 **$99 USD**; the polished GUI answer, and the only one that
  genuinely fans a *physical input* to multiple consumers. ⚠️ But bit-transparency is **not
  established**, and Rogue Amoeba's own manual warns about setting rates so the flow *"will not
  contain any lossy conversions"* — an admission that lossy conversion otherwise occurs. Plus a
  second clock domain. **Disqualifying for measurement.**

⚠️ **The feedback-loop rule — carry it into any routing advice.** Both `krisp microphone` and
`Ecamm Live Virtual Mic` are **outputs published as fake inputs**, listed by macOS beside real
mics with no visual distinction. David already built an accidental loop by pointing Krisp's
input at Ecamm's virtual mic.

> **Rule: a virtual device may only ever appear DOWNSTREAM of the app that publishes it.**
> If app A's virtual output is app B's input, then B's output must never be A's input.
> → `/Users/davidcruwys/dev/ad/brains/krisp/krisp-recording-onset.md` §6b

**Recommendation for MicCheck:**

> **Use no routing layer at all. Open the QuadCast directly, at its native 48 kHz.**
>
> Every routing option above either fails to solve input sharing, or inserts a clock domain and
> therefore sample-rate conversion. **A routing layer that alters the signal is disqualifying
> for a measurement tool.** And it is unnecessary: ✅ CoreAudio already permits direct
> multi-client access, verified today. The simplest architecture is also the only correct one.
>
> Routing would only ever be considered for a future concurrent-monitoring mode — and even then,
> §5.3 shows direct sharing already covers it, so the answer would still be "none".

### 5.5 The QuadCast's actual controls — ⚠️ **the brief's premise is wrong**

📄 **DOCUMENTED** against HyperX's own manual (Doc **480HX-MICQC.A01**,
`https://media.kingston.com/support/downloads/HyperX_QuadCast_Microhone_Manual.pdf` — HyperX's
own filename typo).

> **There are no buttons on the QuadCast.** The brief's "3–4 buttons he never knows the meaning
> of" do not exist. There are **two rotary knobs and one touch sensor**.

| Control | Location | Function |
|---|---|---|
| **Tap-to-Mute sensor** | **Top** cap | Capacitive touch — tap to mute/unmute |
| **Gain knob** | **Front**, at the base, below the logo | Microphone gain |
| **Polar pattern knob** | **Rear**, upper (above the shock mount) | Rotate to select one of four patterns |
| Headphone jack | Rear, lower | Monitoring |
| USB port | Rear, lower | USB **Mini-B** |

📄 The four patterns, with HyperX's own stated use cases — a continuous **4-position rotary
selector**, not a cycling button:

| Pattern | HyperX's stated scenario |
|---|---|
| **Stereo** | Vocals, instruments |
| **Omnidirectional** | Multi-person podcasts, conference calls |
| **Cardioid** | **Podcasts, streaming, voiceovers** ← David's case |
| **Bidirectional** | Face-to-face interviews |

⚠️ **The LED is inverted from intuition** — 📄 manual: **Red = mute OFF (you are live)**;
**LED off = MUTED**. Worth surfacing in the UI, since "the light went out" reads as *off* but
means *muted*.

📄 **Verified specs**: 48 kHz / **16-bit** (single rate), three 14 mm electret condensers,
20 Hz–20 kHz, sensitivity **−36 dB (1 V/Pa @ 1 kHz)**, self-noise **≤ −95 dBFS (A-weighted)**,
SNR ≥ 90 dB. **Built-in internal pop filter and shock mount.** ✅ Confirmed live: USB VID
`0x03F0` PID `0x0491`, **USB Audio Class 1**, 2 input channels at 48 kHz.

📄 **Monitoring on macOS** is on/off only — Audio MIDI Setup → the **Thru** checkbox. There is
**no hardware headphone-volume knob**, and HyperX does **not** claim zero-latency monitoring for
the *original* QuadCast (that wording belongs to the QuadCast 2).

### 5.6 FliHub integration seam

✅ **MEASURED** — `/Users/davidcruwys/dev/ad/flivideo/flihub/client/src/App.tsx` uses a `ViewTab`
string-union with hash routing. Adding a tab is **five mechanical edits**, matching the existing
`mockups` tab exactly:

| # | Location | Edit |
|---|---|---|
| 1 | `App.tsx` imports | `import { MicCheckPage } from './components/MicCheckPage';` |
| 2 | `type ViewTab` (line ~44) | add `\| 'miccheck'` |
| 3 | `VALID_TABS` (line ~57) | add `'miccheck'` |
| 4 | `HeaderDropdown` items (line ~593) | `{ label: 'Mic Check', onClick: () => changeTab('miccheck') }` |
| 5 | render block (line ~885) | `{activeTab === 'miccheck' && <MicCheckPage />}` |

**No server work is required for Phases 1–3** — everything runs client-side in the browser. The
Express server is needed only in Phase 4 to persist session reports.

Stack already present: React + Vite + TypeScript, `sonner` toasts, existing `shared/` component
library. New code is confined to `client/src/components/MicCheckPage.tsx`, a
`client/src/hooks/useMicAnalyser.ts`, and a worklet served as a static asset.

⚠️ **The worklet must be served from a real URL** (`audioWorklet.addModule('/miccheck-worklet.js')`)
— ✅ verified working. Under Vite, place it in `public/` so it is **not** bundled/transformed.

---

## 6. Build phases — smallest useful version first

### Phase 1 — "Am I loud enough?" ⭐ **the smallest useful version**

**This alone would have prevented today's −40.2 LUFS recording.**

- Device picker pinned to the QuadCast, with the virtual-device refusal (§5.2).
- The four-way constraint display (asked / got / capable / supported).
- AudioWorklet: K-weighting → **short-term LUFS (3 s)** + **sample peak**.
- Three metrics only: **short-term LUFS (A1)**, **true peak (A3)**, **clip count (A4)**.
- Green/orange/red with an imperative: *"turn the gain knob up ~4 dB."*

**Acceptance tests — these are the honesty gate, do not skip them:**
1. 📄 **EBU Tech 3341 calibration**: a generated 1 kHz sine at −18 dBFS must read
   **−18.0 LUFS ± 0.1**. Run against a file, not the mic.
2. Cross-check the worklet's LUFS against `ffmpeg -af ebur128` on the **same** generated file —
   agreement within **±0.1 LUFS**.
3. ⚠️ **The system-processing probe** (§5.1): play a known broadband noise file through a
   speaker, capture it, and inspect the spectrum for gating or notching. This is the **only**
   test that distinguishes "no processing" from "processing Chrome cannot see." **~20 lines, and
   it is the difference between a tool that measures and a tool that reassures.**

*Deliberately excluded from Phase 1*: true-peak oversampling. Sample peak is adequate as a
first-pass guard; 4× oversampling arrives in Phase 2.

### Phase 2 — "Is my room hurting me?"

- 📄 **True peak** with the BS.1770 4× polyphase FIR (48-tap, 4-phase). At 48 kHz this reaches
  exactly the required 192 kHz.
- Speech/pause gating → **live SNR (B1)**.
- Room-tone reference capture (Step 1) + **fan-band level** + **Δ vs reference** (§2.2).
- Live spectrum via `AnalyserNode`, `fftSize = 32768` (✅ verified accepted),
  ⚠️ **`smoothingTimeConstant = 0`** — 📄 the 0.8 default is a display prettifier that lies about
  transients.
- Room-tone reference overlaid on the spectrum.

⚠️ 📄 `AnalyserNode` **force-downmixes to mono** regardless of its own `channelCount`. For the
display that is fine. **Never compute a graded metric from it** — use a `ChannelSplitterNode`
plus one analyser per channel if per-channel spectra are ever needed.

### Phase 3 — "Where should I sit, and which pattern?"

- **PSR / PLR (A5)** with the dynamics message (§4 Step 4).
- Proximity index (B2), pop detection (B3), sibilance (B4) with a speaker-band setting.
- **L/R correlation pattern-mode detector (C1)** with its honest "one of three" caveat.
- The **guided calibration wizard**, Steps 0–5.
- The acoustic **pattern-identification** test (Step 3).

### Phase 4 — Persistence and trend

- JSON session reports (§4 Step 5) written via the Express server, `not_measured` array included.
- Trend view across sessions — did the room get worse? did his technique improve?
- Optional: 📄 blind DRR/RT estimate as an **unlabelled trend line**, never a graded metric.

### Explicit non-goals

- ❌ No denoising, normalising or file output — that is `audio-clean`'s job (§0.3).
- ❌ No attempt to read or set the mic's knobs — 📄 impossible (§1.2).
- ❌ No auto-naming of the polar pattern from correlation alone (§2.3).
- ❌ No RT60 number presented as fact (§2.4).

---

## 7. What I could NOT establish

Listed so no one mistakes these for settled.

### About the microphone

1. ❓ **Gain knob range in dB.** 📄 HyperX publishes nothing. The manual's entire text is
   *"Rotate the gain control knob to adjust the gain of the microphone."* **Consequence**: the
   tool can say "turn it up about 4 dB" only as a *target delta*, never as a knob position.
2. ❓ **Whether the gain knob is analog (pre-ADC) or a digital attenuator.** 📄 Not stated
   anywhere by HyperX. **This matters**: if analog, correct gain genuinely improves converter
   SNR; if digital, turning it up merely scales an already-quantised signal and the real fix is
   entirely acoustic. **Testable in minutes** — turn the knob and watch whether the *noise floor
   in dBFS* rises with it (analog) or the signal scales against a fixed floor (digital). **I
   could not run it: it needs a hand on the knob.** ⭐ **This is the single highest-value
   outstanding test, and Phase 1 makes it trivial.**
3. ❓ **Knob direction in words.** 📄 Documented only as a rotation graphic. The common
   *"clockwise increases"* is **not HyperX text**. Hence the empirical approach in §4 Step 4.
4. ❓ **Maximum SPL.** Never published for the QuadCast.
5. ❓ **Whether cardioid/omni/bidirectional differ in their L/R duplication.** ✅ I proved the
   *current* pattern duplicates mono exactly, but I could not turn the knob to test the others.
6. ❓ **Whether monitoring is hardware or OS-mediated**, and its latency. The HyperX support
   article that would settle it is one of many now-dead `support.hyperx.com` URLs (all
   301-redirect to an HP 404).

### About the software stack

7. ❓ **Whether macOS Mic Modes (Voice Isolation / Wide Spectrum) affect Chrome's capture on
   macOS 26.5.** 📄 Apple documents the modes and says *"options vary by app"* but never defines
   the opt-in mechanism. ⚠️ **If they do apply, `getSettings()` will not reveal it** — this is
   precisely the absence-vs-unreported ambiguity. Mitigated by the Phase 1 probe, not by a flag.
8. ❓ **Chrome's `enable-webrtc-allow-input-volume-adjustment` flag state on this machine.** 📄 It
   lets Chrome drive the *system* mic level. ✅ Mostly moot here — the QuadCast exposes no
   software volume for Chrome to move (§1.2) — but worth asserting once.
9. ❓ **Whether Ecamm Live ever takes hog mode.** ✅ It is **not** hogging right now (`-1`
   measured), and no documentation suggests it ever does. Absence of evidence, not proof.
10. ❓ **Loopback's bit-transparency.** 📄 No vendor statement either way. My negative lean is
    architectural inference plus one sentence about lossy conversions — **not a measured result.**
    Moot given the §5.4 recommendation to use no routing at all.

### About the measurements

11. ⚠️ **My browser K-weighting figure is not calibrated.** §5.1 explains: the −49.78 LUFS
    reading proves the DSP chain *runs*, not that it is *correct*. Accuracy is a Phase 1
    acceptance test.
12. ⚠️ **The "+26.1 dB lifted 6–16 kHz by +25.2 dB" chain from the brief is second-hand to me.**
    ✅ I verified the +26.1 dB, the −40.2 LUFS, the −10.8 dBTP and the 33.8 dB SNR directly from
    the `audio-clean` report. **The original audio file no longer exists** (only the JSON
    remains), so I could not independently re-derive the band-lift figures.
13. ⚠️ **My noise-floor number and `audio-clean`'s disagree, because they measure different
    things.** Mine: **−63.6 dBFS RMS** over a 6 s idle capture. `audio-clean`'s: **−73.4 dBFS**,
    an adaptive percentile estimate taken during a speech recording. **Neither is wrong; they are
    not comparable.** MicCheck must define and display its own method explicitly.
14. ⚠️ **Everything about the room was measured at one moment, on one day.** ✅ The two captures
    I took minutes apart differed by ~7 dB in peak. **Fan noise is not stationary** — aircraft
    pass, fans cycle. Any single reference capture is a snapshot, and the tool should let David
    re-take it rather than treating the first one as ground truth.
15. ⚠️ **Crest factor units are a trap.** ffmpeg's `astats` reports crest as a **linear ratio**,
    not dB. His 11:51 take reads `16.02` linear = **24.1 dB**. The brief's "27.6 → 6.6" is
    likewise linear (**28.8 dB → 16.4 dB**). **Mixing the two units silently produces nonsense.**

### Standards gaps worth knowing

16. 📄 **Only 3 of the 11 requested metrics have standards-backed numeric thresholds** — LUFS,
    true peak, and (for spoken word) the ACX levels. **Crest factor, PSR/PLR, sibilance ratio,
    plosive band, DC offset, correlation and VO-booth RT60 have no standards-body threshold
    anywhere.** Every commercial tool invents its own. §2.1 marks each 🔶 accordingly — that
    labelling is a feature, not a hedge.
17. ⚠️ **Do not ship any "X dB pop filter attenuation" figure.** 📄 The circulating numbers
    (*"up to 15 dB"*, *"92.3 % ± 2.1 %"*) trace to an AI-generated site with **non-resolving
    DOIs**. No verified peer-reviewed figure exists.
18. 📄 **AES TD1004 is superseded** by **AESTD1008.1.21-9** (2021). Cite the latter. Note TD1008
    itself says its −18 LUFS is an interim compromise, with stated intent to drop all targets by
    6 LU later.
19. ⚠️ **YouTube's −14 LUFS target is not officially published** by Google — every citation is
    third-party reverse-engineering. Do not present it beside Apple's or Spotify's published
    figures at equal confidence.

---

## Appendix A — Verified reference values for this exact setup

Everything a builder can hard-code as a starting calibration, all ✅ **MEASURED** today
(2026-08-26, mac-mini-m4, macOS 26.5, HyperX QuadCast).

```
DEVICE
  CoreAudio input id ......... 132   (id 138 = headphone output, do not confuse)
  USB ........................ VID 0x03F0  PID 0x0491  USB Audio Class 1
  Sample rate ................ 48000 fixed (capabilities min = max)
  Channels ................... 2      Bit depth: 16
  Software volume control .... NONE (absent at elements 0,1,2 — knob is the only gain)
  Hog mode ................... -1 (shared)
  Available rates ............ 8000, 11025, 16000, 22050, 32000, 44100, 48000

ROOM (6 s idle capture, current gain)
  Broadband RMS .............. -63.56 dBFS      Peak: -45.25 dBFS
  astats noise floor ......... -68.03 dBFS
  Integrated (gated) ......... -61.5 LUFS       True peak: -45.2 dBFS
  Octave peak ................ 250 Hz @ -74.2 dBFS   (fan/HVAC signature)
  16 kHz band ................ -99.0 dBFS       (25 dB below the 250 Hz peak)
  Mic spec self-noise ........ <= -95 dBFS(A)  => room is ~31 dB above the mic

SPEECH (take 11:51:51, 27.6 s)
  Integrated ................. -39.0 LUFS       True peak: -18.7 dBTP
  RMS ........................ -42.80 dBFS      Crest: 16.02 linear = 24.1 dB
  PLR ........................ 20.3 LU          DC offset: -0.000030
  Band RMS   LF <150 Hz ...... -50.97   (-6.15 dB rel. speech band)
             150 Hz-5 kHz .... -44.82
             5-10 kHz ........ -57.08  (-12.26 dB rel. speech band)
             10-16 kHz ....... -67.02  (-22.20 dB rel. speech band)
  L-R difference ............. -inf dBFS  => EXACT mono duplication, not Stereo mode

SPEECH (take 11:24:57, from audio-clean report)
  Integrated ................. -40.2 LUFS       True peak: -10.8 dBTP
  Speech RMS ................. -39.58 dBFS      Noise floor: -73.35 dBFS
  SNR ........................ 33.8 dB          PLR: 29.4 LU
  Make-up gain applied ....... +26.1 dB         Result: -17.0 LUFS (target -15, MISSED)
```

## Appendix B — Primary sources

**Standards**
- ITU-R BS.1770-5 (11/2023) — K-weighting, gating, true peak —
  `https://www.itu.int/dms_pubrec/itu-r/rec/bs/R-REC-BS.1770-5-202311-I!!PDF-E.pdf`
  *(K-weighting coefficients, the −0.691 constant, channel weights, gating and true-peak spec are
  byte-identical to BS.1770-4; -5 only adds Annex 4 for object audio.)*
- EBU R 128 — `https://tech.ebu.ch/docs/r/r128.pdf`
- EBU Tech 3341 v4 (meter behaviour: M/S/I windows, tolerances) — `https://tech.ebu.ch/docs/tech/tech3341.pdf`
- EBU Tech 3342 (LRA) · EBU Tech 3343 (production guidance, PLR, the 3 s narrator recommendation)
- AES **TD1008**.1.21-9 (2021) — `https://aes2.org/wp-content/uploads/2024/01/20210924_TD1008_v3.13.pdf`
- AES e-Brief 373 (PSR) — `https://www.aes.org/e-lib/browse.cfm?elib=19324`
- ACX audio submission requirements —
  `http://web.archive.org/web/20230925035211/https://www.acx.com/help/acx-audio-submission-requirements/201456300`
- ITU-R BS.1116-3 / EBU Tech 3276 (room noise NR 10/15) · IEC 60268-4:2018 · IEC 60268-16 (STI)

**Hardware**
- HyperX QuadCast manual, Doc 480HX-MICQC.A01 —
  `https://media.kingston.com/support/downloads/HyperX_QuadCast_Microhone_Manual.pdf`
- HyperX NGENUITY compatibility — `https://hyperx.com/pages/ngenuity`
- Apple `CoreAudio/AudioHardware.h` — `kAudioDevicePropertyHogMode`
- Apple — Create an Aggregate Device — `https://support.apple.com/en-us/102171`

**Web platform**
- W3C Web Audio API 1.1 — `https://www.w3.org/TR/webaudio-1.1/`
- W3C Media Capture and Streams — `https://www.w3.org/TR/mediacapture-streams/`
- MDN — Secure Contexts, AudioWorkletProcessor.process, AnalyserNode, getSettings, enumerateDevices
- Chrome — Audio Worklet Design Pattern — `https://developer.chrome.com/blog/audio-worklet-design-pattern`

**Local**
- `audio-clean` skill — `/Users/davidcruwys/dev/ad/appydave-plugins/video-editor/skills/audio-clean/SKILL.md`
- Measured report — `/Users/davidcruwys/ecamm/Ecamm Recording on 2026-08-26 at 11.24.57 - clean.audio-clean.json`
- Virtual-device feedback-loop rule — `/Users/davidcruwys/dev/ad/brains/krisp/krisp-recording-onset.md` §6b
- FliHub tab seam — `/Users/davidcruwys/dev/ad/flivideo/flihub/client/src/App.tsx`

---

## 9. ⭐ PHASE 1.6 — Snapshot verdict test (supersedes continuous monitoring as primary mode)

**Written 2026-08-27, from a live usability session.** David ran Phase 1.5's continuous monitor
for real, live, on this document's author, for about 20 minutes. It did not fail — every number
it produced was correct — but David could not use it unassisted: every recheck required a human
(this session) to do the "`-23` minus your reading" arithmetic and say which way to turn the
knob. That is not a rare failure mode; it happened on **every single check**. A tool that requires
a person standing next to it to translate its own numbers has not shipped the thing it was built
to ship.

### 9.1 What was actually compared, and what it settled

Mid-session, David pulled up real screenshots of Adobe Podcast's actual Mic Check UI (not the
`vdash` mock he'd first mistaken for it — see §9.5 for that correction). ✅ **MEASURED** (observed
directly from the screenshots, not from memory or a review site):

Adobe's Mic Check is **four horizontal tracks** — Distance to microphone, Gain, Background noise,
Echo — each rendered identically:
- a scale with plain-English poles (`Too close` ↔ `Too far`, `Less gain` ↔ `More gain`)
- a **dashed bracket** marking the sweet spot, drawn on the track, not stated as a number
- a **pin marker** at the measured position, carrying either a green ✓ or a black ✗
- **one line of coaching text** under any failing track — imperative, plain, no jargon
  ("Turn down gain. Gain measures your microphone's sensitivity. Turn down the gain to reach the
  sweet spot.")

**No dB, no LUFS, no numeric readout is shown anywhere in this UI.** The number exists internally
— it has to — but the product deliberately never surfaces it. The user sees a position and a
verdict, never a figure to interpret.

**The flow is a discrete test, not a running meter**: click **"Test mic,"** say one prompted
sentence ("How is my microphone setup and placement?"), get all four results at once, adjust,
click test again. It is not something you watch while you talk indefinitely.

David's direct instruction on seeing this, verbatim: *"I don't want the continuous live thing. I
want a snapshot test. I want to talk for 10 seconds, figure out whether there's a problem, try and
modify a knob, then try again. And have little inputs or coaching along the way."*

⚠️ **This overrides the framing earlier in this document and in this session's own live
walkthrough**, which treated continuous monitoring as the correct model because it lets you watch
a needle move while turning the knob in real time. David is saying plainly that in practice, the
opposite is true for him: a bounded, disposable 10-second test — with a clear stop, a clear
verdict, and a deliberate re-test action — is what he can actually drive himself. Continuous
monitoring stays available (§9.4), but it is no longer the primary surface.

### 9.2 The new primary flow

Replaces "Start monitoring" / "Stop" as the default mode. 🔶 **CONVENTION** — durations below are
a starting point, not measured; tune on real use per the rule in §0.1.

1. **Button: "Test mic."** No mode toggle to get right first — this is the whole screen.
2. **Fixed test window, 10 s.** Long enough to fill the existing 3 s short-term LUFS window more
   than once with margin; short enough to not feel like a chore. A visible countdown
   ("listening… 4s") plus the *existing* live waveform/level display during the window — so David
   knows it is hearing him — but **no live verdict, no needle, no arrow** while the window runs.
   The grading trajectory/hysteresis machinery built for continuous viewing (§3.4/§3.5) solves a
   flicker problem a bounded window does not have; it is not needed here and should not be ported
   into this flow.
3. **Window ends automatically.** No stop button to remember to press.
4. **Verdict screen — one row per metric, Adobe's exact grammar:**
   - a large ✓ (green) or ✗ (red/orange) — reuses the `grade` already computed by
     `micGrading.ts`'s `gradeShortTermLoudness` / `gradeTruePeak` / clip grading; **no new
     measurement logic required**, this is a display change over data the tool already produces.
   - **one imperative sentence** under any ✗ — the `message` field these functions already return
     ("turn the GAIN knob up ~5 dB") is already written in this register; use it verbatim.
   - the raw number (LUFS, dBFS) is **demoted**, not deleted — small, monospace, secondary,
     revealed via the "why?" affordance the `basis` field already exists for. It is data for the
     curious, never the headline.
5. **Button: "Test again."** Re-runs step 2 immediately — this is the retry loop David asked for
   ("modify a knob, then try again"), and it should be the fastest, most obvious action on the
   verdict screen.

### 9.3 Coverage stays honest — do not synthesise the axes Phase 1 cannot measure

Adobe grades four axes; Phase 1 can only measure loudness, with peak and clipping as guards, not
targets in their own right (§2, §3.1). ⚠️ **Do not invent a ✓/✗ for distance, background noise, or
echo to visually match Adobe** — `proximityIndex` and `snrDb` are correctly in `not_measured` (§6)
and echo has no field at all yet. Applying the check/✗ *presentation* to peak and clipping is fine
— they are real guards with real pass/fail thresholds already. Applying it to axes with no
measurement behind them would violate the rule in §0.1: never promote a 🔶 (or, here, a
nonexistent measurement) to a ✅ in the UI. Where Adobe has four checked tracks, Phase 1.6 honestly
has one graded track (loudness) and two guard checks (peak, clipping) — say so, rather than
padding the screen with three fake green ticks.

### 9.4 Continuous monitoring is not deleted — it changes rank

The Phase 1.5 live view (needle, trajectory sparkline, direction arrow) remains useful for a
different task — actually watching level *during a real take*, not setting up gain beforehand. It
should survive as a secondary mode (a toggle or a second tab), not be thrown away. It should not
be the first thing David sees when he opens Mic Check.

### 9.5 Correction on the reference image, for whoever builds this

Mid-session David initially compared FliHub's loudness bar to a screenshot that turned out to be
the `vdash` audio-profile mock (a *different*, unbuilt tool for grading already-recorded footage —
see that project's own spec, referenced only for contrast, not reused here), not Adobe. The
visual grammar (bracketed target zone + position marker) is genuinely shared between `vdash`,
FliHub's existing loudness bar, and Adobe's real UI — three independent designs converging on the
same idea is a good sign the idea is right. But §9.1's description of Adobe's actual screen is
from real screenshots of Adobe Podcast, confirmed after that correction — treat §9.1–9.4 as the
reliable source for what to build, not the earlier mock comparison.
