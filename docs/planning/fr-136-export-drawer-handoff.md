# Developer Handoff: FR-136 - Wire Export Tool to Drawer

## What You're Working On

**FR-136: Tool-Oriented Manage Panel**

- PRD: `/docs/prd/fr-136-tool-oriented-manage-panel.md`
- Status: Partially implemented (regen tools done, export/folders pending)

**This task:** Complete the Export tool by wiring existing Gling prep UI into the slide-out drawer.

---

## Headline

Extract existing Export/Gling prep functionality from ManagePanel.tsx into ExportPanel component and wire it to the Export tool's slide-out drawer.

---

## Description

The Export tool button exists in ToolsSidebar but shows "coming soon" placeholder. However, all the export/Gling prep functionality already exists in ManagePanel.tsx (lines 862-1057) - it just needs to be extracted into a component and shown in the drawer.

This is pure refactoring - no new functionality. The Gling prep UI (FR-122/124) already works, we're just moving it to match the FR-136 tool-oriented design pattern (like how Rename works).

---

## Resources

**PRD:**

- `/docs/prd/fr-136-tool-oriented-manage-panel.md` - Overall design
- `/docs/prd/fr-122-export-panel.md` - Export functionality (already implemented)
- `/docs/prd/fr-124-export-panel-enhancements.md` - Gling prep features (already implemented)

**Reference Implementation:**

- Rename tool in ManagePanel.tsx (lines 1133-1181) - Similar drawer pattern
- ToolsSidebar component - Shows Export button (lines 89-96)
- SlideOutDrawer component - Shared drawer UI

**Code to Extract:**

- ManagePanel.tsx lines 862-1057 - Gling prep UI
- ManagePanel.tsx lines 290-322 - handlePrepareForGling
- ManagePanel.tsx lines 495-580 - Export-related handlers

---

## What's Already Done

✅ ToolsSidebar with Export button
✅ SlideOutDrawer component
✅ All export/Gling prep functionality (FR-122/124)
✅ Backend hooks (useEditPrep, useCreateEditFolders, etc.)
✅ Export tool button hooked up to activeTool state

---

## What Needs to Be Done

1. Create `client/src/components/shared/ExportPanel.tsx` (~200 lines)
   - Extract Gling prep UI from ManagePanel
   - Move all export handlers and hooks
   - Keep same functionality, just in new component

2. Update `client/src/components/ManagePanel.tsx`
   - Remove lines 862-1057 (moved to ExportPanel)
   - Replace drawer placeholder with `<ExportPanel selectedFiles={...} />`
   - Import ExportPanel

3. Export from `client/src/components/shared/index.ts`

4. Test: Select files → Click Export → Drawer shows Gling prep UI

---

## Acceptance Criteria

- [ ] Export tool button opens drawer
- [ ] Drawer shows all Gling prep UI (filename, dictionary, folders, manifest)
- [ ] All buttons work (copy, prepare, create folders, clean, restore)
- [ ] Selected files display correctly
- [ ] Manifest status shows
- [ ] Drawer closes on X or ESC
- [ ] No console errors

---

## Estimated Time

2-3 hours (pure refactoring, no new logic)
