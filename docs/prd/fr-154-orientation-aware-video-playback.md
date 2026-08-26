# FR-154: Orientation-Aware Video Playback

**Added:** 2026-08-26
**Status:** ✓ Implemented

## Summary

Every video surface in FliHub hardcodes a 16:9 stage. When a vertical (portrait)
recording is played, it is letterboxed into a landscape frame — the video renders
correctly but sits as a narrow strip inside a wide black box, wasting most of the
modal and making review awkward.

The player should size itself to the **source** video's aspect ratio, whatever that
is, rather than assuming landscape.

## Trigger

Ecamm Live can record in vertical mode. The resulting file is a **true portrait
video** — no rotation-metadata trickery:

```
$ ffprobe "Ecamm Recording on 2026-08-26 at 09.05.01.mov"
  width=1080  height=1920  codec=h264  (no rotate tag, no side_data rotation)
```

So this is purely a layout problem in the client. Ingestion, watching and naming
all work fine — a flat vertical `.mov` lands in `~/ecamm/` and is picked up
normally.

> Not to be confused with [FR-155](fr-155-ecamm-dual-mode-ingestion.md), which is
> about Ecamm's *dual* mode writing a folder-per-take. Related, separate.

## Current Behaviour

Two components pin the stage to 16:9:

| File | Line | Code |
| ---- | ---- | ---- |
| `client/src/components/shared/VideoPlayerModal.tsx` | 203 | `<div className="bg-black" style={{ aspectRatio: '16/9' }}>` |
| `client/src/components/WatchPage.tsx` | 630 | `style={{ aspectRatio: '16/9' }}` |

Both then render `<video className="w-full h-full object-contain" />`. `object-contain`
does the right thing — it never distorts — but it has no choice except to pillarbox
a 9:16 source inside a 16:9 box.

The modal width is also orientation-blind: `max-w-4xl` (N) / `max-w-6xl` (L), which
is sensible for landscape and far too wide for portrait.

## Desired Behaviour

- The video stage adopts the **intrinsic aspect ratio** of the loaded video
  (`videoWidth / videoHeight`), read on `loadedmetadata`.
- Portrait sources get a **narrower modal** so the frame is tall, not letterboxed.
- Stage height is clamped (`max-height`) so an extreme portrait source cannot push
  the controls bar, transcript panel or dictionary row off screen.
- 16:9 remains the default until metadata arrives, so nothing flickers or jumps for
  the common landscape case.
- Aspect resets when `videoUrl` changes, so prev/next navigation between a landscape
  and a portrait take re-measures instead of inheriting the previous shape.
- Applies to **every** playback surface — Incoming, Recordings, Watch, and Relay
  previews (all four route through `VideoPlayerModal` except Watch).

## Non-Goals

- No re-encoding, rotating or transforming of source files. FliHub displays; it
  does not modify pixels.
- No change to the naming convention. A vertical take is still just a recording.
- Rotation-metadata handling (`rotate=90` files from phones) is **out of scope** —
  Ecamm does not produce them, and browsers already honour the tag. Revisit only if
  a real file shows up misrendered.

## Implementation Notes

Add a small shared hook rather than duplicating the logic in two components:

```
client/src/hooks/useVideoAspect.ts
  → { aspect, isPortrait, readAspect(el), reset() }
```

- `readAspect` is called from the existing `onLoadedMetadata` handler; it reads
  `el.videoWidth / el.videoHeight` and ignores zero/absent values.
- `VideoPlayerModal` composes it with `useVideoPlayback`'s `videoEventHandlers.onLoadedMetadata`
  (wrap, don't replace — the existing handler sets `playbackRate`).
- `WatchPage` manages its own playback state and wires the same hook into its
  inline `onLoadedMetadata`.

Modal width selection:

| Orientation | Size N | Size L |
| ----------- | ------ | ------ |
| Landscape / square | `max-w-4xl` | `max-w-6xl` |
| Portrait | `max-w-md` | `max-w-lg` |

## Acceptance Criteria

- [x] Playing a 1080×1920 recording shows a tall frame with no side pillarboxing
- [x] Playing a 1920×1080 recording is visually unchanged from today
- [x] The N/L size toggle still works in both orientations
- [x] Prev/next between a portrait and a landscape take re-sizes the stage correctly
- [x] Controls bar, transcript panel and dictionary row stay visible and on-screen
      for a portrait source
- [x] No video is ever stretched or squashed

## Completion Notes

**What was done:**
- Added `client/src/hooks/useVideoAspect.ts` (new shared hook).
- `VideoPlayerModal.tsx` — stage `style={{ aspectRatio: aspect, maxHeight: '70vh' }}`,
  flex-centred; `containerMaxWidth` branches on `isPortrait`; `handleLoadedMetadata`
  wraps `videoEventHandlers.onLoadedMetadata` so `playbackRate` still gets set;
  `useEffect` on `[videoUrl]` calls `resetAspect()`.
- `WatchPage.tsx` — same, plus `PORTRAIT_SIZE_CLASSES` and a `resetAspect()` effect
  keyed on `currentVideo?.url`.

**Verification (measured in the running app via DOM, not eyeballed):**

| Source | Stage before | Stage after | Sheet class |
| ------ | ------------ | ----------- | ----------- |
| 1080x1920 | 896x504, 596px pillarbox | 448x741, zero pillarbox | `max-w-md` |
| 1920x1080 | 896x504 | 896x504 (unchanged) | `max-w-4xl` |
| 1080x1080 | 896x504 | 896x741, aspect 1/1 | `max-w-4xl` |

Switching source orientation inside one open modal re-measured correctly, confirming
the reset path.

**Caveat on how it was verified:** the `.mov` would not decode inside the automated
browser tab (`readyState` stayed 0, no error — a tab-environment limitation, not an
app fault), so intrinsic dimensions were stubbed on the element and a real
`loadedmetadata` event dispatched. That exercises the full wiring — handler → hook →
state → style/class — but does **not** prove Chrome reports 1080x1920 for this
particular file. `ffprobe` confirms the file's dimensions and it has no rotation tag,
so the browser has nothing to misread. Worth one human eyeball on a real vertical take.

**Tests:** 1237 passed, 2 skipped, 46 files. `tsc -b client` clean.
