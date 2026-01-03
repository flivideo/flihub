# Future: Bulk Operations in Manage Panel

**Status:** Future / Backlog
**Added:** 2026-01-03
**Priority:** Low
**Dependencies:** FR-131 (Manage Panel)

---

## Overview

This document tracks future bulk operation features for the Manage panel that were identified during the rename/export unification design (FR-130/131) but are NOT in scope for the initial implementation.

**Decision:** Document these as future features, do NOT include in FR-130/131 scope.

---

## Future Feature: Bulk Park/Unpark

### User Story

As a user, I want to park or unpark multiple recordings at once from the Manage panel, so I can quickly exclude groups of files from my edit without clicking each file individually.

### Use Cases

1. **Park entire chapter:** User decides chapter 05 is not needed for this edit → selects all files in chapter 05 → parks them
2. **Park by tag:** User wants to park all recordings with "CTA" tag → filters by tag → selects all → parks
3. **Unpark after review:** User reviews parked files, decides to include some → selects files → unparks

### Design Sketch

**Location:** Manage panel, bulk operations section

```
Bulk Operations
┌─────────────────────────────────────────────────────────┐
│ Selected files (12):                                    │
│ [Park Selected] [Unpark Selected]                       │
└─────────────────────────────────────────────────────────┘
```

**Workflow:**
1. User selects files via checkboxes
2. Clicks "Park Selected" or "Unpark Selected"
3. Confirmation dialog: "Park 12 files? They will be hidden from active view."
4. Backend updates state file for each file
5. Toast: "Parked 12 files"

### Technical Notes

**API endpoint:** `POST /api/manage/bulk-park`
```json
{
  "files": ["01-1-intro.mov", "01-2-intro.mov"],
  "parked": true
}
```

**Implementation:**
- Reuse existing park/unpark logic from FR-120
- Batch state file updates (one write instead of N writes)
- Socket.io events for real-time UI updates

### Acceptance Criteria

- [ ] "Park Selected" button in bulk operations section
- [ ] "Unpark Selected" button in bulk operations section
- [ ] Confirmation dialog before parking
- [ ] Batch state update (single file write)
- [ ] Toast notification with count
- [ ] Real-time update in Recordings panel (via Socket.io)

---

## Future Feature: Bulk Safe/Restore

### User Story

As a user, I want to move multiple recordings to the safe folder at once, so I can archive completed sections without moving each file individually.

### Use Cases

1. **Archive chapter:** Chapter 01 is complete, user wants to archive it → selects all files in chapter 01 → moves to safe
2. **Restore chapter:** User needs to re-edit chapter 03 → selects all files in chapter 03 → restores from safe

### Design Sketch

**Location:** Manage panel, bulk operations section

```
Bulk Operations
┌─────────────────────────────────────────────────────────┐
│ Selected files (12):                                    │
│ [Move to Safe] [Restore from Safe]                      │
└─────────────────────────────────────────────────────────┘
```

**Workflow:**
1. User selects files via checkboxes
2. Clicks "Move to Safe" or "Restore from Safe"
3. Confirmation dialog: "Move 12 files to safe folder? They will be hidden from active view."
4. Backend moves files to `recordings/-safe/`
5. Backend updates state file
6. Backend moves shadow files to `recording-shadows/-safe/`
7. Toast: "Moved 12 files to safe"

### Technical Notes

**API endpoint:** `POST /api/manage/bulk-safe`
```json
{
  "files": ["01-1-intro.mov", "01-2-intro.mov"],
  "safe": true
}
```

**Implementation:**
- Reuse existing safe/restore logic from FR-111
- Batch file moves (use `Promise.all`)
- Update state file once (batch update)
- Move shadow files in parallel

### Acceptance Criteria

- [ ] "Move to Safe" button in bulk operations section
- [ ] "Restore from Safe" button in bulk operations section
- [ ] Confirmation dialog before moving
- [ ] Files moved to `recordings/-safe/` or restored to `recordings/`
- [ ] Shadow files moved to `recording-shadows/-safe/` or restored
- [ ] State file updated (batch)
- [ ] Toast notification with count
- [ ] Real-time update in Recordings panel

---

## Future Feature: Sequence Renumbering

### User Story

As a user, I want to reorder recordings within a chapter by changing sequence numbers, so I can insert or rearrange recordings without manually renaming multiple files.

### Use Cases

1. **Insert recording:** User records a new intro after existing intro → wants to insert as 01-1 → existing 01-1 becomes 01-2, 01-2 becomes 01-3, etc.
2. **Reorder recordings:** User decides 01-5 should come before 01-3 → drag-and-drop to reorder → sequences update automatically

### Design Sketch

**Location:** Manage panel, advanced operations

**Option A: Drag-and-drop UI**
```
Chapter 01: intro (15 files)
┌─────────────────────────────────────────────────────────┐
│ ☰ 01-1-intro.mov                              [Drag]    │
│ ☰ 01-2-intro-retake.mov                       [Drag]    │
│ ☰ 01-3-intro-final.mov                        [Drag]    │
│ ...                                                      │
│                                    [Apply New Order]     │
└─────────────────────────────────────────────────────────┘
```

**Option B: Manual sequence input**
```
Sequence Renumbering
┌─────────────────────────────────────────────────────────┐
│ File: 01-3-intro-final.mov                              │
│ Current sequence: 3                                     │
│ New sequence: [1]                                       │
│                                                          │
│ This will:                                              │
│ • Rename 01-3-intro-final.mov → 01-1-intro-final.mov   │
│ • Rename 01-1-intro.mov → 01-2-intro.mov               │
│ • Rename 01-2-intro-retake.mov → 01-3-intro-retake.mov │
│                                                          │
│                              [Cancel] [Apply Renumber]  │
└─────────────────────────────────────────────────────────┘
```

### Complexity Warning

**Very high complexity:**
- Cascading renames (01-3 → 01-1 requires renaming 01-1 → 01-2, 01-2 → 01-3)
- Conflict detection (can't rename to existing sequence)
- Temporary filenames (avoid collisions during cascading renames)
- State file updates for all affected files
- Transcript/shadow regeneration for all affected files

**Recommendation:** Defer to Phase 4+ (2+ sprints of work)

### Acceptance Criteria (If Implemented)

- [ ] Drag-and-drop UI for reordering (Option A)
- [ ] Preview of changes (shows before/after)
- [ ] Cascading rename logic (handles conflicts)
- [ ] Temporary filenames during rename (prevents collisions)
- [ ] State file updates for all affected files
- [ ] Transcript/shadow regeneration
- [ ] Toast notification with count
- [ ] Undo support (complex, may require transaction log)

---

## Future Feature: Advanced Rename Templates

### User Story

As a user, I want to apply predefined rename rules to selected recordings, so I can quickly standardize naming across multiple files.

### Use Cases

1. **Strip tags:** User wants to remove all "CTA" tags from recordings → applies "Strip CTA" template → tags removed
2. **Add tags:** User wants to add "SKOOL" tag to all recordings in chapter 03 → applies "Add SKOOL" template → tags added
3. **Custom templates:** User creates custom template "SKOOL-ready" that strips CTA, adds SKOOL, renames to "final" → applies to selected files

### Design Sketch

**Location:** Manage panel, advanced operations

```
Rename Templates
┌─────────────────────────────────────────────────────────┐
│ Apply template to selected files (12):                  │
│                                                          │
│ [Strip CTA Tags ▼]  [Apply Template]                    │
│                                                          │
│ Available templates:                                    │
│ • Strip CTA Tags - Removes CTA tag from filename        │
│ • Strip All Tags - Removes all tags                     │
│ • Add SKOOL Tag - Adds SKOOL tag                        │
│ • SKOOL-ready - Strips CTA, adds SKOOL, renames final   │
│                                                          │
│ [+ Create Custom Template]                              │
└─────────────────────────────────────────────────────────┘
```

### Template Configuration

**Stored in:** `config.json` → `renameTemplates`

```json
{
  "renameTemplates": [
    {
      "name": "Strip CTA Tags",
      "rules": [
        { "action": "stripTag", "tag": "CTA" }
      ]
    },
    {
      "name": "SKOOL-ready",
      "rules": [
        { "action": "stripTag", "tag": "CTA" },
        { "action": "addTag", "tag": "SKOOL" },
        { "action": "setLabel", "label": "final" }
      ]
    }
  ]
}
```

### Acceptance Criteria (If Implemented)

- [ ] Template dropdown in Manage panel
- [ ] "Apply Template" button
- [ ] Preview of changes (before/after)
- [ ] Predefined templates (Strip CTA, Strip All, Add SKOOL)
- [ ] Custom template creation UI
- [ ] Template configuration in config.json
- [ ] Rules engine (stripTag, addTag, setLabel)
- [ ] Toast notification with count

---

## Prioritization

| Feature | Priority | Complexity | Estimated Effort | Value |
|---------|----------|-----------|------------------|-------|
| **Bulk Park/Unpark** | Medium | Low | 0.5 sprint | High (frequently requested) |
| **Bulk Safe/Restore** | Medium | Medium | 1 sprint | Medium (archive workflow) |
| **Sequence Renumbering** | Low | **Very High** | 2+ sprints | Low (rare use case) |
| **Advanced Rename Templates** | Low | High | 1.5 sprints | Medium (power users) |

**Recommendation:**
1. Implement Bulk Park/Unpark first (easiest, high value)
2. Implement Bulk Safe/Restore second (medium complexity, good value)
3. Defer Sequence Renumbering indefinitely (very complex, rare use case)
4. Consider Advanced Rename Templates if power users request it

---

## Dependencies

**All features depend on:**
- FR-131 (Manage Panel) - Provides bulk operations UI structure
- FR-130 (Delete+Regenerate) - Simplifies implementation

**Each feature enables:**
- Better bulk workflows
- Less repetitive clicking
- Power user features

---

## Related Work

**Similar features:**
- FR-120 (Parked Recording State) - Single-file park/unpark
- FR-111 (Safe Architecture) - Single-file safe/restore
- FR-47 (Rename Chapter Label) - Single-chapter rename

**These will be basis for bulk implementations.**

---

**Last updated:** 2026-01-03
