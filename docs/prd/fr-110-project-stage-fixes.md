# FR-110: Project Stage Persistence & Dropdown UI

**Type:** Bug Fix + Enhancement
**Priority:** High
**Added:** 2025-12-26

---

## Overview

Two issues with project stage management:

1. **Bug:** Stage overrides not persisting - changes lost on server restart
2. **Enhancement:** Replace click-to-cycle with dropdown menu for better UX

---

## Bug: Stage Overrides Not Persisting

### Problem

When clicking the stage badge to change a project's stage (e.g., setting b94 to "published"), the change appears to work but is lost on page refresh or server restart.

### Root Cause

**Same pattern as FR-108:** The `saveConfig()` function doesn't include `projectStageOverrides` in the saved object.

**File:** `server/src/index.ts:164-192`

```typescript
function saveConfig(config: Config): void {
  const toSave: Record<string, unknown> = {
    // ... other fields ...
  };
  // FR-32: Only save projectPriorities if it has values
  if (config.projectPriorities && Object.keys(config.projectPriorities).length > 0) {
    toSave.projectPriorities = config.projectPriorities;
  }
  // FR-32: Only save projectStages if it has values
  if (config.projectStages && Object.keys(config.projectStages).length > 0) {
    toSave.projectStages = config.projectStages;  // This is the STAGE LIST, not overrides
  }
  // MISSING: projectStageOverrides (per-project assignments)
}
```

The `projectStages` being saved is the list of available stages, NOT the `projectStageOverrides` which stores per-project manual stage assignments.

### Fix

Add `projectStageOverrides` to `saveConfig()`:

```typescript
// FR-110: Save project stage overrides if it has values
if (config.projectStageOverrides && Object.keys(config.projectStageOverrides).length > 0) {
  toSave.projectStageOverrides = config.projectStageOverrides;
}
```

**Location:** `server/src/index.ts` around line 183

---

## Enhancement: Dropdown Stage Selector

### Problem

The current click-to-cycle UI is unintuitive:
- Click = forward through stages
- Shift+Click = backward
- Users don't know what stages are available or where they are in the cycle
- Easy to overshoot the desired stage

### Solution

Replace with a dropdown menu showing all stages with their colors:

```
┌──────────────────────┐
│  ⟳ Auto              │  ← Reset to auto-detection
├──────────────────────┤
│ ◉ Plan    (purple)   │
│   REC     (yellow)   │  ← Currently selected
│   1st     (blue)     │
│   2nd     (blue)     │
│   Rev     (orange)   │
│   Rdy     (teal)     │
│   Pub     (green)    │
│   Arc     (gray)     │
└──────────────────────┘
```

### UI Requirements

1. **Click badge → opens dropdown** (instead of cycling)
2. **Dropdown shows all 8 stages** plus "Auto" option
3. **Each option has the stage's color** (matching the badge colors)
4. **Current stage is highlighted** (checkmark or bold)
5. **Click outside or select → closes dropdown**
6. **Position:** Below the badge, aligned left

### Implementation Approach

**File:** `client/src/components/ProjectsPanel.tsx`

1. Add `showStageDropdown` state to `StageCell` component
2. Replace `onClick` cycle logic with dropdown toggle
3. Create dropdown menu with all stages from `STAGE_DISPLAY`
4. Add "Auto" option at top to reset to auto-detection
5. Call `updateStage.mutateAsync()` when option selected

### Stage Options

| Value | Label | Color | Description |
|-------|-------|-------|-------------|
| auto | Auto | - | Reset to auto-detection |
| planning | Plan | Purple | Preparing content outline |
| recording | REC | Yellow | Actively recording |
| first-edit | 1st | Blue | Initial rough cut |
| second-edit | 2nd | Dark Blue | Refining edit |
| review | Rev | Orange | Final review |
| ready-to-publish | Rdy | Teal | Ready to publish |
| published | Pub | Green | Published |
| archived | Arc | Gray | Archived |

---

## Testing

### Bug Fix Test
1. Change a project's stage (e.g., b94 → "published")
2. Verify `server/config.json` contains `"projectStageOverrides": { "b94-...": "published" }`
3. Restart server or refresh page
4. Stage should persist

### Dropdown UI Test
1. Click on a stage badge
2. Dropdown menu appears with all stages
3. Select a different stage
4. Badge updates, dropdown closes
5. Select "Auto" → stage returns to auto-detected value

---

## Files to Change

**Bug Fix:**
- `server/src/index.ts` - Add `projectStageOverrides` to `saveConfig()`

**Dropdown UI:**
- `client/src/components/ProjectsPanel.tsx` - Replace `StageCell` click handler with dropdown

---

## Related

- FR-80: Enhanced Project List & Stage Model (original stage implementation)
- FR-82: Stage tooltips (added descriptions)
- FR-108: Gling Dictionary Not Saving (same saveConfig pattern)

---

## Completion Notes

**What was done:**

Bug Fix:
- Added `projectStageOverrides` to `saveConfig()` in server/src/index.ts
- Same pattern as FR-108 - conditional save when object has values

Dropdown UI:
- Replaced click-to-cycle with dropdown menu in StageCell component
- Shows all 8 stages with colored dots + "Auto" option at top
- Current stage has checkmark indicator
- Click outside closes dropdown
- Removed unused `getNextStage` and `DEFAULT_PROJECT_STAGES` constants

**Files changed:**
- `server/src/index.ts` (lines 184-187) - persistence fix
- `client/src/components/ProjectsPanel.tsx` - StageCell dropdown, removed cycle code

**Testing notes:**
1. Click stage badge → dropdown appears
2. Select a stage → badge updates, dropdown closes
3. Select "Auto" → returns to auto-detected stage
4. Restart server → stage persists (check config.json for `projectStageOverrides`)

**Status:** Complete
