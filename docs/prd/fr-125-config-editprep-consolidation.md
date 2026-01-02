# FR-125: Config & EditPrep Consolidation

**Status:** Pending
**Added:** 2026-01-02
**Implemented:** -
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

_To be filled by developer._
