# Handover — MicCheck development

**Written:** 2026-08-27 · **Repo:** `/Users/davidcruwys/dev/ad/flivideo/flihub` · **Branch:** `main`
**State at handover:** MicCheck "One Page" built and pushed through `87293e4`.

You are continuing development on FliHub. Read this in full before touching anything.

---

## 1. Read first

- `/Users/davidcruwys/dev/ad/flivideo/flihub/CLAUDE.md` — dev-server rules. Ports **5100** (client)
  / **5101** (server). Check `lsof -i :5100 -i :5101 | grep LISTEN` before starting anything.
  **If it is up, do NOT restart it.** Use `overmind start -D`. Never `npm run dev` (collides).
  Never background `./start.sh`.
- `/Users/davidcruwys/dev/ad/flivideo/flihub/docs/miccheck-build-spec.md` — 1,262 lines.
  **Do NOT read it whole.** Everything current is fenced in blockquotes marked **🔄 PHASE 1.5**, in
  §3 and §4 only. `grep -n "PHASE 1.5" ` finds both.

**Evidence markers are load-bearing**, not decoration: 📄 = published standard (do not tune),
✅ = measured on this machine, 🔶 = convention (tune freely). Preserve them if you edit the spec.

## 2. What exists

| File | Role |
|---|---|
| `client/public/miccheck-worklet.js` | BS.1770 K-weighting → short-term LUFS, sample peak, clips |
| `client/src/hooks/useMicAnalyser.ts` | device pinning, mode, 1 Hz tick posting, trajectory feed |
| `client/src/utils/micTrajectory.ts` | direction / dead-band / hysteresis / sparkline + change events |
| `client/src/utils/micGrading.ts` | the colour model |
| `client/src/components/MicCheckPage.tsx` | live instrument |
| `client/src/components/MicCheckReport.tsx` | end-of-run report |
| `server/src/routes/miccheck.ts` | writes |
| `server/src/routes/query/miccheck.ts` | reads — under `/api/query`, the namespace the `flihub` skill reaches |
| `server/src/utils/micCheckStore.ts` | persistence to `~/.flihub/miccheck/<id>.json` (global, not per-project) |

## 3. Non-negotiable principles

**Every one was earned by a real failure. Do not "simplify" them away.**

1. **Grey never falls back to green.** "Not measured" and "fine" must never look the same.
2. **Mode is DECLARED, never inferred.** The server returns **400** on a tick without `mode`.
   An earlier inferred −50 LUFS threshold graded −48 room tone **RED** with *"turn the GAIN knob up
   ~25 dB"* — i.e. it told David to amplify his fans.
3. **Every non-green state names the physical action AND the distance in dB.**
4. **Device pinned by `deviceId`; virtual devices refused.** The macOS default input is
   `krisp microphone`.
5. **Change markers say "level step detected", never "you turned the gain".** A marker is a
   hypothesis, not an attributed cause.
6. **`not_measured` is mandatory in every report, with reasons.**
7. **Peak is a guard, never a target.** A low peak is not a reason to raise gain.

## 4. Outstanding — ask before starting any of these

- **The direction arrow is transient** (~5 s during a change, then "holding"). That is *correct* —
  the comparison is 3 s vs the preceding 3 s — but if David turns the knob and looks up 10 s later
  he misses it. He may want a longer-lived "since you last moved it" indicator. **Ask first.**
- **Audible-alert contamination test** (§3.6), unresolved by design. David monitors on **speakers**,
  so it is a real measurement: capture 10 s of room tone, repeat with the tick firing, compare the
  broadband floor **and** the spectrum at the tick frequency. 🔶 Pass if the floor moves < 1 dB and
  no new peak appears. Report as *"no contamination at this level on this path"* — never
  *"ticks are safe"*.
- **Gain-knob analog-vs-digital test.** Play steady noise at a fixed speaker level; record at low
  and high gain; compare SNR. SNR improves → analog; flat → digital. 🔶 A difference under ~2 dB is
  **inconclusive, not a null**. It changes the *advice*, not the code. Do not hold work for it.

## 5. Traps

- **`npm test` exits nonzero ~1 run in 4 with ZERO failing tests**, with and without recent files.
  Pre-existing harness flake. Verify per workspace (`npm test -w client|server|shared`) before
  believing a red run.
- **`docs/design/miccheck/`** holds the mockup working files. The published canvas
  `https://claude.ai/code/artifact/91b57ba1-585b-4bad-851e-a210c4af921d` **predates** the mode
  toggle, sparkline and event list, so it is partly superseded. **Do not treat it as agreed design.**
- **The tree has uncommitted files** (screenshots, triage docs, `AGENTS.md`, `pnpm-lock.yaml`).
  Check `git status` and **confirm with David** before committing or discarding any of them.

## 6. Out of scope

Unless David reopens it: SNR, spectrum, dominant frequency, proximity, sibilance, pop detection,
polar-pattern correlation, true-peak 4× oversampling, and the §4 wizard.

**§3.2's layout is the target END-STATE, not the next increment** — commit `00e9124` says so
explicitly. "1.5" describes the UX model (modes + trajectory + events), not metric coverage.

## 7. Model choice

This session runs **Opus**: the work is judgement and design — deciding what a reading *means* and
how to say it without overclaiming — not mechanical execution.

## 8. Done condition

Whatever David names next, **verified by running it in the real app at `localhost:5100`** — not by a
passing test alone.
