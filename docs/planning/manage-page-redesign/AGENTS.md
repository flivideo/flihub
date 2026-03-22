# AGENTS.md — manage-page-redesign

**Project**: FliHub — video recording workflow management tool
**Campaign**: manage-page-redesign (B041 — context-sensitive tool pages)
**Stack**: TypeScript monorepo — React 19 + Vite + TailwindCSS v4 (client only — no server changes)
**Last updated**: 2026-03-22
**Inherits from**: `docs/planning/manage-relay-refactor-w2/AGENTS.md`

---

## Project Overview

FliHub is a TypeScript monorepo for managing video recording workflows. The Manage tab currently shows a generic file list with a sidebar of unrelated tools that open slide-out drawers. This campaign restructures it so each tool owns the center content when active — no more drawers, no more generic shell.

---

## Build & Run Commands

```bash
npm install                        # Install all workspace dependencies
npm run build -w shared            # ALWAYS run after changing shared/types.ts
npm run build -w client            # tsc -b && vite build
npm test                           # runs shared → server → client (842 tests currently passing)

lsof -i :5101 | grep LISTEN        # Check if server is running
```

**Never start the dev server in an agent** — it's a long-running process. Build and test only.

---

## Directory Structure

```
flihub/
├── client/src/
│   ├── App.tsx                    # MODIFY — remove "Manage & Export" h2 heading (line 853)
│   ├── components/
│   │   ├── ManagePanel.tsx        # MAJOR REFACTOR — core of this campaign
│   │   └── shared/
│   │       ├── ToolsSidebar.tsx   # MODIFY — simplify to pure navigation
│   │       ├── RelayTool.tsx      # READ ONLY — already self-contained, renders as-is
│   │       ├── RelayBrowser.tsx   # READ ONLY — embedded in RelayTool
│   │       ├── GlingEditTool.tsx  # READ ONLY — already self-contained, renders as-is
│   │       ├── RenamePanel.tsx    # READ ONLY — already self-contained, renders as-is
│   │       ├── ChapterListPanel.tsx # MODIFY — remove modal overlay wrapper
│   │       ├── SlideOutDrawer.tsx # NOT USED after this campaign (can be deleted or left)
│   │       ├── ConfirmationModal.tsx # READ ONLY — still used for regen confirmations
│   │       └── RegenToolbar.tsx   # READ ONLY — reference for regen button patterns
│   ├── hooks/
│   │   ├── useApi.ts              # READ ONLY
│   │   ├── useRelayApi.ts         # READ ONLY
│   │   └── useConfigApi.ts        # READ ONLY — has useEnvironment() for machineRole
│   └── config.ts                  # READ ONLY
├── server/                        # DO NOT MODIFY — no server changes this campaign
└── shared/                        # DO NOT MODIFY — no type changes needed
```

---

## DO NOT MODIFY (Explicit Scope Boundaries)

- **ALL server/ files** — this is a client-only restructure
- **ALL shared/ files** — no type changes needed
- `client/src/hooks/*` — hooks stay the same
- `client/src/components/shared/RelayTool.tsx` — already self-contained
- `client/src/components/shared/RelayBrowser.tsx` — embedded in RelayTool
- `client/src/components/shared/GlingEditTool.tsx` — already self-contained
- `client/src/components/shared/RenamePanel.tsx` — already self-contained
- `client/src/components/shared/ConfirmationModal.tsx` — still needed
- Any Watch/Incoming/Config/Recordings page components

---

## Current Architecture (what you're changing FROM)

ManagePanel.tsx currently:
1. Renders a **fixed left sidebar** (ToolsSidebar) at `fixed left-8 top-32 w-[200px]`
2. Renders a **centered file list** (max-w-4xl) with chapter grouping and checkboxes
3. Renders **4 SlideOutDrawer** components (Rename, Gling, Relay, Renumber) — all in DOM, translated off-screen
4. Has two handler types: `onSimpleToolClick` (fire-and-forget: regen-shadows, regen-transcripts, regen-all, git-sync) and `onComplexToolClick` (opens drawer: rename, gling-edit, renumber, relay)
5. App.tsx adds an `<h2>Manage & Export</h2>` above ManagePanel

---

## Target Architecture (what you're changing TO)

ManagePanel.tsx will:
1. Render the **same left sidebar** (ToolsSidebar) but as pure navigation
2. **Conditionally render center content** based on `activeTool`:
   - `null` or `'regen'` → File list + inline regen toolbar (the default landing state)
   - `'rename'` → File list + RenamePanel rendered inline below/beside file list
   - `'renumber'` → ChapterListPanel rendered inline (no modal overlay)
   - `'gling-edit'` → GlingEditTool rendered full-width in center
   - `'relay'` → RelayTool rendered full-width in center
3. **No SlideOutDrawer usage** — all tools render inline in the center column
4. **Contextual heading** per tool (replaces "Manage & Export"):
   - regen: "Recordings" or no heading (file list speaks for itself)
   - rename: "Rename Recordings"
   - renumber: "Chapter Management"
   - gling-edit: "Gling / Edit Prep"
   - relay: "Relay Collaboration"
5. **Git Sync** stays as a sidebar action button (not a tool page)

### Layout pattern for file-list tools (regen, rename, renumber):
```tsx
<div className="max-w-4xl mx-auto px-4 py-6">
  {/* Contextual heading */}
  <h2 className="text-lg font-medium text-gray-700 mb-4">{toolHeading}</h2>

  {/* Tool-specific controls (e.g. regen buttons, rename form) */}
  <div className="mb-4">
    {activeTool === 'regen' && <RegenToolbar ... />}
    {activeTool === 'rename' && <RenamePanel ... />}
  </div>

  {/* File list with selection */}
  <FileList ... />
</div>
```

### Layout pattern for standalone tools (relay, gling):
```tsx
<div className="max-w-4xl mx-auto px-4 py-6">
  {/* No file list — tool owns the full area */}
  <RelayTool />  {/* or GlingEditTool */}
</div>
```

---

## Work Unit Details

### 1. manage-tool-pages (Wave 1)

**Purpose**: Core restructure — the single biggest change in this campaign.

**Files to modify**:
- `client/src/components/ManagePanel.tsx` — major refactor
- `client/src/components/shared/ToolsSidebar.tsx` — simplify
- `client/src/App.tsx` — remove h2 heading

**ManagePanel.tsx changes**:

1. **Remove all SlideOutDrawer imports and instances** (lines 570-615 approximately):
   ```tsx
   // DELETE these 4 blocks:
   <SlideOutDrawer isOpen={activeTool === 'rename'} ...> <RenamePanel /> </SlideOutDrawer>
   <SlideOutDrawer isOpen={activeTool === 'gling-edit'} ...> <GlingEditTool /> </SlideOutDrawer>
   <SlideOutDrawer isOpen={activeTool === 'relay'} ...> <RelayTool /> </SlideOutDrawer>
   <SlideOutDrawer isOpen={activeTool === 'renumber'} ...> <ChapterListPanel /> </SlideOutDrawer>
   ```

2. **Update activeTool type** — add `'regen'` as a valid state:
   ```tsx
   const [activeTool, setActiveTool] = useState<'regen' | 'rename' | 'gling-edit' | 'renumber' | 'relay' | null>('regen');
   ```
   Default to `'regen'` — the landing state.

3. **Define which tools need the file list**:
   ```tsx
   const needsFileList = activeTool === 'regen' || activeTool === 'rename' || activeTool === 'renumber' || activeTool === null;
   ```

4. **Add contextual heading map**:
   ```tsx
   const toolHeadings: Record<string, string> = {
     regen: 'Recordings',
     rename: 'Rename Recordings',
     renumber: 'Chapter Management',
     'gling-edit': 'Gling / Edit Prep',
     relay: 'Relay Collaboration',
   };
   ```

5. **Replace center content** — instead of always rendering the file list, conditionally render:
   ```tsx
   <div className="max-w-4xl mx-auto px-4 py-6">
     {/* Contextual heading */}
     <h2 className="text-lg font-medium text-gray-700 mb-4">
       {toolHeadings[activeTool || 'regen']}
     </h2>

     {needsFileList ? (
       <>
         {/* Regen inline toolbar — only when regen is active */}
         {activeTool === 'regen' && (
           <div className="flex items-center gap-2 mb-4">
             <button onClick={() => handleRegenClick('regen-shadows')} ...>Regen Shadows</button>
             <button onClick={() => handleRegenClick('regen-transcripts')} ...>Regen Transcripts</button>
             <button onClick={() => handleRegenClick('regen-all')} ...>Regen All</button>
           </div>
         )}

         {/* Rename panel — inline above file list */}
         {activeTool === 'rename' && (
           <div className="mb-6 border border-gray-200 rounded-lg p-4 bg-white">
             <RenamePanel
               selectedFiles={Array.from(selectedFiles)}
               onClose={() => setActiveTool('regen')}
               onSuccess={() => setSelectedFiles(new Set())}
             />
           </div>
         )}

         {/* Renumber — inline */}
         {activeTool === 'renumber' && (
           <div className="mb-6">
             <ChapterListPanel
               recordings={data.recordings.map(r => r.filename)}
               onClose={() => setActiveTool('regen')}
             />
           </div>
         )}

         {/* Stats bar + file list (shared across file-list tools) */}
         <div className="flex items-center gap-3 mb-3 text-xs text-gray-500">
           {/* ... existing stats bar ... */}
         </div>
         <div className="space-y-6">
           {/* ... existing chapter groups with checkboxes ... */}
         </div>
       </>
     ) : (
       <>
         {activeTool === 'relay' && <RelayTool />}
         {activeTool === 'gling-edit' && <GlingEditTool />}
       </>
     )}
   </div>
   ```

6. **Update handleSimpleToolClick** — regen actions no longer come from the sidebar. Rename this to `handleRegenClick` and simplify. Git Sync stays separate.

7. **Update handleComplexToolClick** — all sidebar clicks go through this now. When clicking the same tool, go back to regen (default) instead of null:
   ```tsx
   const handleToolClick = (tool: typeof activeTool) => {
     setActiveTool(activeTool === tool ? 'regen' : tool);
   };
   ```

8. **onClose callbacks** — when a tool "closes" (rename success, renumber done), return to regen view:
   ```tsx
   onClose={() => setActiveTool('regen')}
   ```

**ToolsSidebar.tsx changes**:

1. **Remove `onSimpleToolClick` prop entirely** — regen actions are now inline buttons, not sidebar buttons
2. **Collapse Record group** into a single "Regen" nav item:
   ```tsx
   <ToolButton label="Regen" active={activeTool === 'regen'} onClick={() => onToolClick('regen')} />
   ```
3. **All tools use the same callback**: `onToolClick: (tool: string) => void`
4. **Keep Git Sync** as a separate action button (different visual treatment — maybe a divider)
5. **Props simplification**:
   ```tsx
   interface ToolsSidebarProps {
     activeTool: string | null;
     onToolClick: (tool: 'regen' | 'rename' | 'gling-edit' | 'renumber' | 'relay') => void;
     onGitSync: () => void;
     isGitSyncPending?: boolean;
   }
   ```
   Remove `selectedFiles`, `totalFiles` — the sidebar no longer needs to know about file state.

**App.tsx change**:
- Remove line 853: `<h2 className="text-lg font-medium text-gray-700 mb-4">Manage & Export</h2>`
- Just render `<ManagePanel />` directly in the section.

**Test target**: 0 new tests (this is a UI restructure — existing tests cover the components; visual verification needed)

---

### 2. renumber-inline (Wave 2)

**Purpose**: ChapterListPanel currently renders its own modal overlay. Remove the overlay so it works as inline content.

**Files to modify**:
- `client/src/components/shared/ChapterListPanel.tsx`

**Current structure** (lines 140-240):
```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
  <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
    {/* Header with close button */}
    {/* Chapter list */}
    {/* Footer */}
  </div>
</div>
```

**Target structure** — remove the fixed overlay, keep the content:
```tsx
<div className="space-y-4">
  {/* Chapter list — no modal wrapper, no close button (parent handles navigation) */}
  <div className="space-y-2">
    {chapters.map(...)}
  </div>
  <p className="text-sm text-gray-600">
    Click any chapter number to rename it. Auto-swaps if target exists.
  </p>
</div>
```

Remove the header with close button (X) and the modal overlay div. The `onClose` prop is still accepted but called after rename success (to return to default view), not from a close button.

Also fix: `window.location.reload()` (lines 78, 100) — replace with `onClose()` to return to regen view. The recordings will update via Socket.io.

**Test target**: 0 new tests

---

### 3. sidebar-active-state (Wave 2)

**Purpose**: Polish the sidebar visual state and clean up stale types.

**Files to modify**:
- `client/src/components/shared/ToolsSidebar.tsx`

**Changes**:
1. Verify the `active` prop on ToolButton works correctly with the new flow — the blue left border should show on the active tool
2. Remove stale `onSimpleToolClick` type references if any remain after WU1
3. Git Sync button should be visually distinct from nav items — e.g., smaller, different style, or separated by a divider:
   ```tsx
   {/* Separator before action buttons */}
   <div className="border-t border-gray-200 pt-4 mt-2">
     <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">
       Actions
     </div>
     <ToolButton label={isGitSyncPending ? 'Syncing...' : 'Git Sync'} ... />
   </div>
   ```
4. Ensure sidebar does not show disabled states for tools — all tools are always clickable (the tool view handles empty states internally)

**Test target**: 0 new tests

---

## Success Criteria Checklist

Before marking any work unit complete:

- [ ] `npm run build -w client` passes — TypeScript + Vite build clean
- [ ] `npm test` exits 0 — all 842+ tests pass
- [ ] No SlideOutDrawer usage remains in ManagePanel.tsx
- [ ] Each tool renders in the center content area (not in a drawer)
- [ ] Contextual heading shows per tool
- [ ] Default view is regen (file list + inline regen buttons)
- [ ] Relay and Gling render full-width without file list
- [ ] Clicking a sidebar tool swaps center content (no drawer animation)
- [ ] "Manage & Export" heading is gone from App.tsx
- [ ] Git Sync still works as a one-click action
- [ ] ChapterListPanel renders inline (no modal overlay)
- [ ] No new `any` types

---

## Anti-Patterns to Avoid

- **Do not add new SlideOutDrawer usage** — the entire point is removing drawers
- **Do not modify server files** — this is client-only
- **Do not modify shared/ types** — no type changes needed
- **Do not add top-level navigation tabs** — Manage stays as one tab with sidebar sub-nav
- **Do not modify RelayTool, GlingEditTool, or RenamePanel internals** — they're already self-contained
- **Do not remove the confirmation modal for regen** — it's still needed (inline regen buttons trigger it)
- **Do not start the dev server in agents** — build and test only

---

## Reference: Current ManagePanel Structure

```
ManagePanel.tsx (633 lines):
  Lines 1-75: imports, types, groupByChapter helper
  Lines 76-115: state (selectedFiles, showParked, activeTool, confirmationModal, chapterSettings)
  Lines 116-177: socket listeners for regen progress
  Lines 178-260: filtering, grouping, selection handlers
  Lines 261-380: handleSimpleToolClick (regen + git-sync logic)
  Lines 382-384: handleComplexToolClick (toggle drawer)
  Lines 386-404: loading/error/empty states
  Lines 410-555: CENTER CONTENT — stats bar + chapter file list with checkboxes
  Lines 557-567: SIDEBAR — fixed position ToolsSidebar
  Lines 569-615: 4x SLIDEOUT DRAWERS (rename, gling, relay, renumber)
  Lines 617-630: ConfirmationModal
```

---

## Quality Gates (non-negotiable)

1. `npm run build -w client` clean — no TypeScript errors or Vite build failures
2. `npm test` passes — all 842+ tests pass
3. No drawers in ManagePanel
4. File list tools (regen/rename/renumber) show files; standalone tools (relay/gling) don't
5. Sidebar navigation works — clicking a tool swaps the view

---

## Learnings (inherited from previous campaigns)

- **"DO NOT MODIFY" sections are essential** — prevents scope creep across all agents
- **Client restructures need visual verification** — build passes aren't sufficient; the coordinator should screenshot after each wave
- **Default state matters** — the landing view sets user expectations. Regen is the right default because it shows the file list (familiar) while adding tool-specific actions
- **`window.location.reload()` in ChapterListPanel is a hack** — should be replaced with proper state management (onClose callback + Socket.io updates)
