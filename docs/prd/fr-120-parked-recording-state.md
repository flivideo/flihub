# FR-120: Parked Recording State

**Status:** ✓ Complete
**Added:** 2026-01-02
**Implemented:** 2026-01-02

---

## User Story

As a video creator, I want to mark recordings as "parked" so I can exclude them from the current edit without deleting them.

---

## Problem

Some recordings are good content but not for this video:
- Too technical for the target audience
- Better suited for a future video
- B-roll material for later use
- Content for SKOOL community (not YouTube)

Currently only have two states:
- **Regular** - In the main recordings list
- **Safe** - Protected from accidental deletion

No way to mark "good but not for this edit" - recordings either stay in the edit or get marked safe (which has different semantics).

---

## Solution

Add a third recording state: **Parked**

### States Model

| State | Meaning | Visual | Action |
|-------|---------|--------|--------|
| Regular | Active in current edit | Green background | "Park" button |
| Safe | Protected recording | Cream/yellow background | "Unpark" / "Restore" buttons |
| Parked | Excluded from this edit | Light pink/light yellow | "Unpark" button |

### Visual Treatment

- **Regular:** Current green background (unchanged)
- **Safe:** Current cream/yellow background (unchanged)
- **Parked:** Light pink OR light yellow (distinct from both)

### Actions

| Current State | Available Actions |
|---------------|-------------------|
| Regular | "→ Safe", "→ Park" |
| Safe | "← Restore" |
| Parked | "← Unpark" (returns to Regular) |

### Storage

Stored in `.flihub-state.json` alongside `safeRecordings`:

```json
{
  "safeRecordings": ["01-1-intro.mov"],
  "parkedRecordings": ["02-3-technical-deep-dive.mov"]
}
```

---

## Acceptance Criteria

- [x] Parked state added to recording model
- [x] "→ Park" action on regular recordings
- [x] "← Unpark" action on parked recordings
- [x] Parked recordings show with distinct color (light pink - bg-pink-50)
- [x] Parked state persists in `.flihub-state.json`
- [x] Chapter grouping still works with parked recordings
- [x] Parked recordings still appear in chapter list (position preserved)
- [x] Toggle checkbox to show/hide parked files (bonus)
- [x] Chapter-level Park All / Unpark All actions (bonus)

---

## Technical Notes

### Extend ProjectState

```typescript
// shared/types.ts
interface ProjectState {
  safeRecordings?: string[]
  parkedRecordings?: string[]  // NEW
  // ... other fields
}
```

### Files to Modify

| File | Changes |
|------|---------|
| `shared/types.ts` | Add `parkedRecordings` to ProjectState |
| `server/src/utils/projectState.ts` | Add `parkRecording()`, `unparkRecording()` helpers |
| `server/src/routes/recordings.ts` | Add park/unpark endpoints |
| `client/src/components/RecordingsPanel.tsx` | Add Park/Unpark buttons, parked styling |

### Color Options

Option A: Light pink (`bg-pink-50` or `bg-rose-50`)
Option B: Light yellow/amber (`bg-amber-50`) - but may be too similar to Safe

Recommend: Light pink for clear visual distinction.

---

## Future Considerations (NOT in this FR)

- "Why parked" categorization (archived, b-roll, SKOOL, etc.) - see FR-123
- Filter to show/hide parked recordings
- Bulk park/unpark actions

---

## Dependencies

None - this is the foundation for FR-121, FR-122, FR-123.

---

## Completion Notes

**Implemented:** 2026-01-02

### Backend

**Types (shared/types.ts):**
- Added `parked?: boolean` to RecordingState
- Added `isParked: boolean` to RecordingFile and QueryRecording
- Created ParkResponse and UnparkResponse interfaces

**State Management (server/src/utils/projectState.ts):**
- `isRecordingParked()` - Check parked status
- `setRecordingParked()` - Set parked flag (immutable)
- `getParkedRecordings()` - Get list of parked files
- Updated `setRecordingSafe()` cleanup to check parked flag

**API Routes (server/src/routes/index.ts):**
- `POST /api/recordings/park` - Park files/chapters
- `POST /api/recordings/unpark` - Unpark files
- Added isParked to recording objects

**Query Endpoints:**
- `server/src/routes/query/recordings.ts` - Returns isParked flag
- `server/src/routes/query/export.ts` - Returns isParked flag

### Frontend

**API Hooks (client/src/hooks/useApi.ts):**
- `useParkRecording()` - Park mutation
- `useUnparkRecording()` - Unpark mutation

**UI (client/src/components/RecordingsView.tsx):**
- Added `showParked` state with toggle checkbox
- Updated filtering logic for safe + parked
- Pink background (`bg-pink-50`) for parked files
- Per-file actions: "→ Park" / "← Unpark"
- Chapter-level actions: "→ Park All" / "← Unpark All"
- Stats: "(X active, Y safe, Z parked)"
