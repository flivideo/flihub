# Implementation Status Report - 2026-01-04

## What You're Seeing vs What's Actually Built

### The Confusion

When you click the regen buttons, you see "coming soon" - but the functionality IS actually implemented. Here's why:

### What's Fully Implemented ✅

**Backend (server/src/routes/manage.ts):**

- ✅ `/api/manage/regen-shadows` (lines 161-255) - WORKING
- ✅ `/api/manage/regen-transcripts` (lines 274-335) - WORKING
- ✅ `/api/manage/regen-chapters` (lines 352-470) - WORKING
- ✅ `/api/manage/regen-all` (lines 483-709) - WORKING
- ✅ All endpoints respect file selection (FR-136 scope behavior)
- ✅ Socket.io progress events
- ✅ Error handling

**Frontend Component (client/src/components/shared/RegenToolbar.tsx):**

- ✅ All 4 buttons working
- ✅ Calls the backend endpoints
- ✅ Shows progress bars
- ✅ Socket.io event listeners
- ✅ Confirmation dialogs
- ✅ Selection awareness
- ✅ Collapsible section

### What's NOT Connected ❌

**The Problem (client/src/components/ManagePanel.tsx line 318-319):**

```typescript
const handleSimpleToolClick = (tool: 'regen-shadows' | ...) => {
  toast.info(`${tool} - coming soon`)  // ❌ STUB FUNCTION
}
```

**What's happening:**

1. Your screenshot shows **ToolsSidebar** (FR-136 vertical sidebar design)
2. ToolsSidebar buttons call `handleSimpleToolClick` (line 960)
3. `handleSimpleToolClick` is a stub that just shows "coming soon"
4. The REAL working code is in **RegenToolbar.tsx** but it's not being used

### Two Different UIs Exist

**Option 1: RegenToolbar (FR-131 Phase 2 style)**

- File: `client/src/components/shared/RegenToolbar.tsx`
- Status: ✅ FULLY WORKING
- Design: Horizontal toolbar with collapsible section
- Currently: NOT being used in ManagePanel

**Option 2: ToolsSidebar (FR-136 style)**

- File: `client/src/components/shared/ToolsSidebar.tsx`
- Status: ❌ UI only, buttons call stub functions
- Design: Vertical sidebar (your screenshot)
- Currently: BEING USED in ManagePanel

## The Fix (Simple)

### Option A: Use the Working RegenToolbar (5 minutes)

Replace ToolsSidebar with RegenToolbar in ManagePanel.tsx:

**Remove (line 956-963):**

```typescript
<ToolsSidebar
  selectedFiles={Array.from(selectedFiles)}
  totalFiles={filteredRecordings.length}
  activeTool={activeTool}
  onSimpleToolClick={handleSimpleToolClick}  // ❌ Stub
  onComplexToolClick={handleComplexToolClick}
/>
```

**Add instead:**

```typescript
<RegenToolbar
  projectCode={config?.projectCode || ''}
  selectedFiles={Array.from(selectedFiles)}
  totalFiles={filteredRecordings.length}
  onRegenComplete={(type) => {
    // Optional: Refresh recordings after regen
    console.log(`Regen ${type} complete`)
  }}
/>
```

This gives you the horizontal toolbar (like your screenshot) but WITH working buttons.

### Option B: Wire Up ToolsSidebar (30 minutes)

Replace the stub function with actual API calls:

```typescript
const handleSimpleToolClick = async (tool: string) => {
  // Copy the logic from RegenToolbar.tsx handleRegen()
  // Call the backend endpoints
  // Show progress
  // Listen to Socket.io events
};
```

## What About Export?

**Export functionality:**

- ❌ Line 1017: "Export functionality coming soon..."
- The old export code exists (FR-122/124/125) but needs to be wired up to the new UI

**Location of old export code:**

- Edit prep: `useEditPrep()` hook (line 77)
- Create folders: `createFolders()` (line 78)
- Gling prep UI exists below (lines 643-895)

**The issue:** Export is scattered throughout the ManagePanel. It needs to be:

1. Extracted into an "ExportConfig" component
2. Shown in the slide-out drawer (like Rename)
3. Triggered by clicking "Export" tool button

## Summary

### What Actually Works Right Now:

1. ✅ Bulk rename (you can test this safely)
2. ✅ Backend regen endpoints (all 4)
3. ✅ RegenToolbar component (just not being used)
4. ✅ File selection
5. ✅ Progress tracking via Socket.io

### What Doesn't Work:

1. ❌ ToolsSidebar regen buttons (stub functions)
2. ❌ Export tool (not wired up to new UI)
3. ❌ Folder creation tool (coming soon)

### Why You're Confused:

- Two different UI approaches were created (RegenToolbar vs ToolsSidebar)
- The one being used (ToolsSidebar) has stub functions
- The one that works (RegenToolbar) isn't being used

## Recommendation

**Immediate (5 minutes):**

- Replace ToolsSidebar with RegenToolbar
- Test regen shadows on 2-3 files
- Verify shadows regenerate correctly

**Then (2-3 hours):**

- Extract export functionality into ExportConfig component
- Wire up Export tool in slide-out drawer
- Test full workflow

**Or:**

- Go back to FR-131 Phase 2 design (simpler, already working)
- Defer FR-136 vertical sidebar until later

## Questions to Answer

1. **Do you want the vertical sidebar (FR-136) or horizontal toolbar (FR-131 Phase 2)?**
   - Vertical = More work to wire up, but matches your original design request
   - Horizontal = Already working, just swap components

2. **Can we test rename safely?**
   - Yes! Rename uses FR-130 delete+regenerate pattern
   - Shadows/transcripts/chapters will regenerate automatically
   - But... the regen buttons need to work first (see above)

3. **Where is Export?**
   - The old export UI is still there (scroll down in ManagePanel)
   - It's not in the tool sidebar yet
   - Needs to be extracted into a tool

---

**TL;DR:** The buttons say "coming soon" because they call stub functions, but the REAL working code exists in RegenToolbar.tsx. Quick fix: swap ToolsSidebar with RegenToolbar (5 minutes).
