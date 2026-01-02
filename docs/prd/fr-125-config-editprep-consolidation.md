# FR-125: Config & EditPrep Consolidation

**Status:** Complete
**Added:** 2026-01-02
**Implemented:** 2026-01-02
**Dependencies:** FR-124

---

## User Story

As a video creator, I want all Gling preparation features consolidated in the Export panel, with project dictionary editing and separate copy options, so I have one place for export workflow.

---

## Problem

1. **Project dictionary in wrong place** - Config panel has project dictionary, but it's project-specific prep, not a global setting
2. **Only one dictionary copy button** - Can only copy combined dictionary, not global or project separately
3. **EditPrep modal is redundant** - Export panel now has all the same features (FR-124)
4. **Scattered functionality** - User has to visit multiple places for export prep

---

## Solution

### Part 1: Move Project Dictionary to Export

Move project dictionary editing from Config to Export panel's Gling Prep section:

```
── Gling Prep ───────────────────────────────────
Filename: b87-poem-epic-3                 [Copy]

Dictionary:
  Global: 25 words                        [Copy]
  Project: 8 words                 [Edit] [Copy]
  ─────────────────────────────────────────────
  Combined: 33 words                      [Copy All]
```

### Part 2: Three Dictionary Copy Buttons

1. **Copy Global** - Just global dictionary words (from config.json)
2. **Copy Project** - Just project-specific words (from .flihub-state.json)
3. **Copy Combined** - Merged, deduplicated, sorted (for Gling)

### Part 3: Edit Project Words in Export

- Inline textarea or expandable section
- Auto-save on blur
- Same behavior as current Config panel

### Part 4: Remove Project Dictionary from Config

Since it moves to Export:
- Remove "Project Dictionary Words" textarea from ConfigPanel
- Keep "Global Dictionary Words" (that IS a global setting)

### Part 5: Remove EditPrep Modal

EditPrep is fully redundant after FR-124. Remove:
- Delete `EditPrepPage.tsx` component
- Remove menu item from App.tsx
- Clean up `useEditApi.ts` hooks (move needed ones to useApi.ts)

---

## Acceptance Criteria

### Must Have
- [ ] Project dictionary editing in Export panel (Gling Prep section)
- [ ] Three copy buttons: Global, Project, Combined
- [ ] Remove project dictionary from Config panel
- [ ] Remove EditPrep modal and menu item

### Should Have
- [ ] Word counts displayed for each dictionary type
- [ ] Combined count shows merged total (deduplicated)
- [ ] Auto-save on blur for project words

### Nice to Have
- [ ] Inline expandable textarea for editing
- [ ] Visual distinction between global/project/combined

---

## Technical Notes

### Dictionary Data

Update `/api/edit/prep` to return all three separately:
```json
{
  "glingFilename": "b87-poem-epic-3",
  "globalDictionary": ["word1", "word2"],
  "projectDictionary": ["word3", "word4"],
  "glingDictionary": ["word1", "word2", "word3", "word4"]  // Combined
}
```

### Project Dictionary Update

Reuse existing endpoint:
- `PATCH /api/projects/:code/state/dictionary` - Update project dictionary

### Files to Delete

| File | Reason |
|------|--------|
| `client/src/components/EditPrepPage.tsx` | Modal replaced by Export panel |

### Files to Modify

| File | Changes |
|------|---------|
| `client/src/components/ExportPanel.tsx` | Add project dictionary editing, three copy buttons |
| `client/src/components/ConfigPanel.tsx` | Remove project dictionary section |
| `client/src/App.tsx` | Remove EditPrep menu item and modal state |
| `server/src/routes/edit.ts` | Return split dictionaries (global, project, combined) |
| `client/src/hooks/useEditApi.ts` | Move needed hooks, delete file if empty |

---

## Migration Notes

**Data migration:** None needed - project dictionary stays in `.flihub-state.json`

**User impact:**
- EditPrep menu item removed
- Project dictionary editing moves to Export tab
- More copy options available
- Same functionality, better organization

---

## Dependencies

- **FR-124:** Export Panel Enhancements (provides Gling Prep section)
- **FR-118:** Project dictionary infrastructure

---

## Completion Notes

**What was done:**

1. **Export Panel Enhancements** - Added project dictionary editing with inline textarea
   - Global dictionary: X words [Copy] button
   - Project dictionary: Y words [Edit] [Copy] buttons
   - Edit mode: Inline textarea with Save/Cancel buttons
   - Combined dictionary: Z words [Copy All] button
   - Visual separator between project and combined sections
   - Word counts displayed for each type

2. **Config Panel Cleanup** - Removed redundant project dictionary section
   - Removed project dictionary textarea and state
   - Removed useProjectState and useUpdateProjectDictionary imports
   - Removed project dictionary initialization useEffect
   - Removed project dictionary from hasChanges check
   - Removed project dictionary save logic from handleSave
   - Kept global dictionary (correct location)

3. **EditPrep Modal Removal**
   - Deleted `EditPrepPage.tsx` component
   - Removed EditPrepPage import from App.tsx
   - Removed showEditPrep state variable
   - Removed EditPrepPage modal rendering
   - Removed "Edit Prep" menu item from settings dropdown

**Files changed:**
- `client/src/components/ExportPanel.tsx` - Added project dictionary editing UI and handlers
- `client/src/components/ConfigPanel.tsx` - Removed project dictionary section
- `client/src/App.tsx` - Removed EditPrep references
- `client/src/components/EditPrepPage.tsx` - DELETED

**API changes:**
- None required - `/api/edit/prep` already returns split dictionaries (globalDictionary, projectDictionary, glingDictionary)
- Reuses existing `PATCH /api/projects/:code/state/dictionary` for updates

**Testing notes:**
1. Navigate to Export tab
2. Click "Gling Prep Info" to expand
3. Verify three dictionary sections display:
   - Global: X words [Copy]
   - Project: Y words [Edit] [Copy]
   - Combined: Z words [Copy All]
4. Click [Edit] on project dictionary
5. Edit words in textarea
6. Click [Save] - should update and show success toast
7. Test all three copy buttons
8. Verify EditPrep menu item is gone from settings dropdown
9. Verify Config panel no longer has project dictionary section

**Status:** Complete
