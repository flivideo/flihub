# FR-145: Escape Key Closes Video Preview Modal

**Added:** 2026-03-16
**Status:** Pending

## Summary

When a video preview modal is open, pressing the `Escape` key should close it.

## Affected Screens

- **Recordings screen** — video preview modal (FR-128)
- **Incoming screen** — video preview modal (FR-106)
- **Watch screen** — video preview modal (FR-71/FR-123)

## Behaviour

- Press `Escape` while a video modal is open → modal closes immediately
- Video playback stops on close
- No other UI side effects

## Implementation Notes

- Add a `keydown` event listener for `Escape` when the modal mounts; remove it on unmount
- Reuse whatever close handler is already wired to the modal's close button
- Should work consistently across all three screens

## Completion Notes

**What was done:**
- Recordings screen (`RecordingVideoModal.tsx`): `useEffect` adds `document.addEventListener('keydown', ...)` on mount, removes on unmount, calls `onClose()` on Escape. Close button tooltip updated to "Close (Escape)".
- Incoming screen (`IncomingVideoModal.tsx`): same pattern — `useEffect` with keydown listener calling `onClose()` on Escape. Close button tooltip updated to "Close (Escape)".
- Watch screen: uses an inline full-page video player (not a modal overlay), so no modal to wire — not applicable.

**Files changed:**
- `client/src/components/RecordingVideoModal.tsx` (lines 68–76)
- `client/src/components/IncomingVideoModal.tsx` (lines 63–71)

**Testing notes:**
- Open a recording preview on Recordings page → press Escape → modal closes and video stops
- Open a file preview on Incoming page → press Escape → modal closes and video stops
- Clicking the × button continues to work as before

**Status:** Complete
