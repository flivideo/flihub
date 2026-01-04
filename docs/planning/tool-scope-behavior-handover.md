# Developer Handover: Tool Scope Behavior

**Date:** 2026-01-04
**From:** Product Owner
**To:** Developer
**RE:** Critical UX issue - Regeneration tools scope behavior

---

## Executive Summary

**Decision:** Tools respect file selection (smart context-aware behavior)

**Rule:**
- **Simple tools (Regen):** Operate on selected files if any selected, otherwise operate on all files
- **Complex tools (Rename, Export):** Require selection - disabled when no files selected

**Impact:** 8 hours of implementation work to add selection awareness to regeneration tools.

---

## Answers to Developer Questions

### 1. Should regen respect file selection, or always operate on all files?

✅ **Answer:** Regen tools respect file selection.

**Behavior:**
- If files are selected → operate on selected files
- If no files selected → operate on all files

**Rationale:**
- Context-aware behavior is standard in professional creative software (Premiere Pro, DaVinci Resolve, After Effects, Photoshop)
- Selection is a powerful affordance users expect to be respected
- Regeneration operations have real costs (time, Whisper API quota)
- Users need fine-grained control for testing and incremental work
- Consistent with tool-oriented philosophy: "context first, action second"

---

### 2. If always "all" - add visual indicator?

✅ **Answer:** Not "always all", but YES add visual indicators regardless.

**Required indicators:**

**A. Selection Badge (always visible)**
```tsx
// When files selected
<SelectionBadge>5 files selected</SelectionBadge>  // Blue styling

// When no selection
<SelectionBadge>All files (26)</SelectionBadge>    // Neutral styling
```

**B. Tool Tooltips (on hover)**
```tsx
// When files selected
tooltip="Regenerate shadows for 5 selected files"

// When no selection
tooltip="Regenerate shadows for all 26 files"
```

**C. Confirmation Dialogs (explicit scope)**
```tsx
// When files selected
"Regenerate shadows for 5 selected files?\n\n" +
"• 01-1-intro.mov\n" +
"• 01-2-overview.mov\n" +
"... and 3 more\n\nContinue?"

// When no selection
"Regenerate shadows for all 26 files?\n\n" +
"This will regenerate shadow files for the entire project.\n\n" +
"Continue?"
```

**Rationale:** Visual clarity prevents user confusion and accidental bulk operations.

---

### 3. If "selected" - what happens when nothing selected?

✅ **Answer:** Depends on tool type.

**Simple tools (Regen) → Operate on all files**
- User gets confirmation dialog: "Regenerate shadows for all 26 files?"
- Makes sense: "Nothing selected = everything selected"
- Common pattern in professional software
- Rationale: Regen operations are idempotent (can run on same files multiple times safely)

**Complex tools (Rename, Export) → Disabled with tooltip**
- Button shows disabled state (grayed out)
- Tooltip: "Select files to rename"
- User cannot execute until files are selected
- Makes sense: These tools require explicit context
- Rationale: Rename/Export are destructive/explicit actions (require conscious selection)

**Examples:**

```tsx
// Simple tool (Regen Shadows)
const isDisabled = allFiles.length === 0  // Only disabled if NO files exist
const tooltip = allFiles.length === 0
  ? "No files to regenerate"
  : (selectedFiles.length > 0
    ? `Regenerate for ${selectedFiles.length} selected files`
    : `Regenerate for all ${allFiles.length} files`)

// Complex tool (Rename)
const isDisabled = selectedFiles.length === 0  // Disabled if nothing selected
const tooltip = selectedFiles.length === 0
  ? "Select files to rename"
  : `Rename ${selectedFiles.length} files`
```

---

### 4. Should there be separate "Regen Selected" vs "Regen All" buttons?

❌ **Answer:** No, use smart context-aware behavior instead.

**Why not separate buttons:**
- Doubles button count (8 buttons instead of 4)
- Clutters tool palette
- Inconsistent with rename/export (which only have one button)
- Uncommon pattern in professional software

**Why smart behavior is better:**
- Consistent with industry standards (Premiere, DaVinci, After Effects, Photoshop)
- Respects user's selection affordance
- Clear through confirmation dialogs
- Matches tool-oriented philosophy: "context first, action second"
- Confirmation dialogs eliminate ambiguity: scope is always explicitly stated

---

## Implementation Requirements

### Component Changes

**1. Update RegenToolbar Props**

**Before:**
```tsx
interface RegenToolbarProps {
  projectCode: string
  onRegenComplete: (type: string) => void
}
```

**After:**
```tsx
interface RegenToolbarProps {
  projectCode: string
  selectedFiles: string[]      // NEW: Array of selected filenames
  allFiles: RecordingFile[]     // NEW: All files in project
  onRegenComplete: (type: string) => void
}
```

**Where to pass from:** `ManagePanel.tsx` parent component (already has selectedFiles state)

---

**2. Add Selection Badge Component**

**Location:** `client/src/components/shared/SelectionBadge.tsx`

**Purpose:** Always show current selection scope

```tsx
interface SelectionBadgeProps {
  selectedCount: number
  totalCount: number
}

export function SelectionBadge({ selectedCount, totalCount }: SelectionBadgeProps) {
  if (selectedCount > 0) {
    return (
      <div className="px-3 py-1 bg-blue-500/10 border border-blue-500 rounded text-blue-500 text-xs font-mono">
        {selectedCount} file{selectedCount === 1 ? '' : 's'} selected
      </div>
    )
  } else {
    return (
      <div className="px-3 py-1 bg-gray-700/50 border border-gray-600 rounded text-gray-400 text-xs font-mono">
        All files ({totalCount})
      </div>
    )
  }
}
```

**Where to place:** In file list area, above chapter groups

---

**3. Update Tool Handlers**

**Pattern for all regen handlers:**

```tsx
const handleRegenShadows = async () => {
  // Determine scope
  const targetFiles = selectedFiles.length > 0
    ? selectedFiles
    : allFiles.map(f => f.filename)

  // Build confirmation message
  const scope = selectedFiles.length > 0
    ? `${selectedFiles.length} selected file${selectedFiles.length === 1 ? '' : 's'}`
    : `all ${allFiles.length} files`

  const fileList = targetFiles.length <= 5
    ? targetFiles.map(f => `• ${f}`).join('\n')
    : `• ${targetFiles.slice(0, 3).join('\n• ')}\n... and ${targetFiles.length - 3} more`

  const confirmed = window.confirm(
    `Regenerate shadows for ${scope}?\n\n` +
    `This will regenerate:\n${fileList}\n\n` +
    `Continue?`
  )

  if (!confirmed) return

  try {
    const response = await fetchApi('/api/manage/regen-shadows', {
      method: 'POST',
      body: JSON.stringify({ files: targetFiles })
    })

    if (response.success) {
      toast.success(
        selectedFiles.length > 0
          ? `Regenerated shadows for ${response.completed} selected files`
          : `Regenerated shadows for all ${response.completed} files`
      )
    }
  } catch (error) {
    toast.error(`Failed to regenerate shadows: ${error.message}`)
  }
}
```

**Apply this pattern to:**
- `handleRegenShadows`
- `handleRegenTranscripts`
- `handleRegenChapters` (detect affected chapters from selected files)
- `handleRegenAll`

---

**4. Update Tool Tooltips**

```tsx
<SimpleTool
  icon="⚡"
  name="Regen Shadows"
  onClick={handleRegenShadows}
  disabled={allFiles.length === 0}
  tooltip={
    allFiles.length === 0
      ? "No files to regenerate"
      : (selectedFiles.length > 0
        ? `Regenerate shadows for ${selectedFiles.length} selected files`
        : `Regenerate shadows for all ${allFiles.length} files`)
  }
/>

<ComplexTool
  icon="⚙"
  name="Rename"
  active={activeTool === 'rename'}
  onClick={() => setActiveTool('rename')}
  disabled={selectedFiles.length === 0}
  tooltip={
    selectedFiles.length === 0
      ? "Select files to rename"
      : `Rename ${selectedFiles.length} files`
  }
/>
```

---

### Server Endpoint Changes

**Pattern for all endpoints:**

**Before (operates on all files):**
```typescript
router.post('/regen-shadows', async (req, res) => {
  const config = getConfig()
  const paths = getProjectPaths(config.projectDirectory)

  // Get all recordings from disk
  const allFilesOnDisk = await fs.readdir(paths.recordings)
  const recordings = allFilesOnDisk.filter(f => f.endsWith('.mov') || f.endsWith('.mp4'))

  // Regenerate all
  for (const filename of recordings) {
    await createShadowFile(...)
  }
})
```

**After (accepts optional file list):**
```typescript
router.post('/regen-shadows', async (req, res) => {
  const { files } = req.body  // NEW: Optional array of filenames
  const config = getConfig()
  const paths = getProjectPaths(config.projectDirectory)

  // Determine target files
  let targetFiles: string[]
  if (files && Array.isArray(files) && files.length > 0) {
    // Use provided file list
    targetFiles = files
  } else {
    // Fall back to all files
    const allFilesOnDisk = await fs.readdir(paths.recordings)
    targetFiles = allFilesOnDisk.filter(f => f.endsWith('.mov') || f.endsWith('.mp4'))
  }

  // Regenerate targeted files
  const results = { completed: 0, failed: 0, errors: [] }
  for (const filename of targetFiles) {
    try {
      const filePath = path.join(paths.recordings, filename)
      await createShadowFile(filePath, paths.shadows, config.shadowResolution || 240)
      results.completed++
    } catch (err) {
      results.failed++
      results.errors.push({ file: filename, error: String(err) })
    }
  }

  res.json({
    success: results.failed === 0,
    completed: results.completed,
    failed: results.failed,
    total: targetFiles.length,
    scope: files ? 'selected' : 'all',  // NEW: Report scope
    errors: results.errors.length > 0 ? results.errors : undefined
  })
})
```

**Apply this pattern to:**
- `POST /api/manage/regen-shadows`
- `POST /api/manage/regen-transcripts`
- `POST /api/manage/regen-chapters`
- `POST /api/manage/regen-all`

**Key changes:**
1. Accept optional `files: string[]` in request body
2. If files provided → use them, otherwise → get all from disk
3. Add `scope: 'selected' | 'all'` to response
4. Update progress messages to include scope

---

### Progress Updates

**Toast Notifications:**
```tsx
// Success
toast.success(
  response.scope === 'selected'
    ? `Regenerated shadows for ${response.completed} selected files`
    : `Regenerated shadows for all ${response.completed} files`
)

// Error
toast.error(
  `Failed to regenerate shadows for ${response.failed} files. See console for details.`
)
```

**Socket.io Events:**
```typescript
// Server emits
io.emit('regen:progress', {
  current: 5,
  total: targetFiles.length,
  scope: files ? 'selected' : 'all',
  currentFile: filename,
  message: files
    ? `Regenerating 5/${targetFiles.length} selected files`
    : `Regenerating 5/${targetFiles.length} files`
})

// Client listens
socket.on('regen:progress', (data) => {
  setProgress(data)
  // Show: "Regenerating 5/12 selected files: 01-1-intro.mov"
})
```

---

## Implementation Checklist

### Phase 1: Props & State (1 hour)
- [ ] Add `selectedFiles` prop to RegenToolbar component
- [ ] Add `allFiles` prop to RegenToolbar component
- [ ] Pass props from ManagePanel parent (already has selectedFiles state)
- [ ] Update SimpleTool to accept `tooltip` and `disabled` props
- [ ] Update ComplexTool to accept `tooltip` and `disabled` props

### Phase 2: Selection Badge (1 hour)
- [ ] Create `SelectionBadge.tsx` component
- [ ] Add to file list area in ManagePanel
- [ ] Style: blue for selected, gray for all
- [ ] Update in real-time as selection changes

### Phase 3: Tool Handlers (2 hours)
- [ ] Update `handleRegenShadows`: accept selectedFiles, build scope, show confirmation
- [ ] Update `handleRegenTranscripts`: same pattern
- [ ] Update `handleRegenChapters`: detect affected chapters from selected files
- [ ] Update `handleRegenAll`: same pattern
- [ ] Add confirmation dialogs with explicit scope
- [ ] Add file list preview (max 5 files, then "... and X more")

### Phase 4: Server Endpoints (2 hours)
- [ ] Update `POST /api/manage/regen-shadows`: accept optional files param
- [ ] Update `POST /api/manage/regen-transcripts`: same
- [ ] Update `POST /api/manage/regen-chapters`: same
- [ ] Update `POST /api/manage/regen-all`: same
- [ ] Add `scope` field to all responses
- [ ] Test: files param provided vs not provided

### Phase 5: Progress & Feedback (1 hour)
- [ ] Update toast messages: "for 5 selected files" or "for all 26 files"
- [ ] Update Socket.io progress events: include scope
- [ ] Update progress bars: "Regenerating 3/5 selected" or "Regenerating 12/26"
- [ ] Test real-time updates

### Phase 6: Tool Tooltips & States (1 hour)
- [ ] Add dynamic tooltips to SimpleTool components
- [ ] Add dynamic tooltips to ComplexTool components
- [ ] Disable complex tools when no selection
- [ ] Disable simple tools only when no files exist
- [ ] Test hover states and disabled states

**Total Effort:** 8 hours (1 day)

---

## Examples of Expected Behavior

### Example 1: Regen Shadows with Selection

**User actions:**
1. User selects 3 files: `01-1-intro.mov`, `01-2-overview.mov`, `02-1-setup.mov`
2. Selection badge shows: **"3 files selected"** (blue)
3. User hovers "Regen Shadows" → Tooltip: **"Regenerate shadows for 3 selected files"**
4. User clicks "Regen Shadows"
5. Confirmation dialog:
   ```
   Regenerate shadows for 3 selected files?

   This will regenerate:
   • 01-1-intro.mov
   • 01-2-overview.mov
   • 02-1-setup.mov

   Continue?
   ```
6. User clicks OK
7. API call: `POST /api/manage/regen-shadows` with `{ files: ['01-1-intro.mov', '01-2-overview.mov', '02-1-setup.mov'] }`
8. Only those 3 shadow files regenerate
9. Toast: **"Regenerated shadows for 3 selected files"**

---

### Example 2: Regen Transcripts without Selection

**User actions:**
1. User clears selection (no checkboxes checked)
2. Selection badge shows: **"All files (26)"** (gray)
3. User hovers "Regen Transcripts" → Tooltip: **"Queue transcription for all 26 files"**
4. User clicks "Regen Transcripts"
5. Confirmation dialog:
   ```
   Queue transcription for all 26 files?

   Estimated time: ~4 hours
   Estimated cost: ~$5 (Whisper API)

   Continue?
   ```
6. User clicks OK
7. API call: `POST /api/manage/regen-transcripts` with `{ files: undefined }` (or no files param)
8. Server queues all 26 files
9. Toast: **"Queued transcription for all 26 files"**

---

### Example 3: Rename with No Selection (Disabled)

**User actions:**
1. User clears selection
2. Selection badge shows: **"All files (26)"** (gray)
3. "Rename" tool button shows **disabled state** (grayed out, not clickable)
4. User hovers "Rename" → Tooltip: **"Select files to rename"**
5. User clicks "Rename" → **Nothing happens** (disabled)
6. User selects 2 files
7. "Rename" button becomes **enabled**
8. User hovers "Rename" → Tooltip: **"Rename 2 files"**
9. User clicks "Rename" → Config panel opens

---

### Example 4: Regen Chapters with Mixed Selection

**User actions:**
1. User selects 8 files from chapters 1, 3, and 5
2. Selection badge shows: **"8 files selected"**
3. User clicks "Regen Chapters"
4. Backend detects affected chapters: `[1, 3, 5]`
5. Confirmation dialog:
   ```
   Regenerate 3 chapters (Ch 01, Ch 03, Ch 05) from selected files?

   Estimated time: ~1-3 minutes

   Continue?
   ```
6. User clicks OK
7. Only chapter videos 01, 03, 05 regenerate
8. Progress updates: "Regenerating chapter 1/3 (Ch 01)..." → "Regenerating chapter 2/3 (Ch 03)..." → etc.
9. Toast: **"Regenerated 3 chapters from selected files"**

---

## Testing Scenarios

### Scenario 1: Selection Respected
- [ ] Select 3 files → Regen Shadows → Only those 3 regenerate
- [ ] Select 5 files → Regen Transcripts → Only those 5 queued
- [ ] Select files from Ch 1 & 3 → Regen Chapters → Only Ch 1 & 3 regenerate

### Scenario 2: No Selection = All Files
- [ ] Clear selection → Regen Shadows → All 26 files regenerate
- [ ] Clear selection → Regen Transcripts → All 26 files queued
- [ ] Clear selection → Regen Chapters → All chapters regenerate

### Scenario 3: Complex Tools Require Selection
- [ ] Clear selection → "Rename" button disabled
- [ ] Clear selection → "Export" button disabled
- [ ] Hover disabled button → Tooltip says "Select files to rename"

### Scenario 4: Confirmation Dialogs
- [ ] All confirmation dialogs explicitly state scope
- [ ] File lists shown for <= 5 files
- [ ] File lists show first 3 + "... and X more" for > 5 files
- [ ] Time estimates shown for expensive operations

### Scenario 5: Progress Messages
- [ ] Toast messages show scope: "for 5 selected" or "for all 26"
- [ ] Socket.io progress includes scope
- [ ] Progress bars show correct total (selected count or all count)

### Scenario 6: Edge Cases
- [ ] No files exist → All tools disabled
- [ ] 1 file selected → Messages use singular "file" not "files"
- [ ] Select all → Same behavior as no selection (operate on all)
- [ ] API fails → Error message clear and helpful

---

## Risk Assessment

**Risk 1: User confusion about scope**
- **Mitigation:** Multiple visual indicators (badge, tooltip, confirmation)
- **Severity:** Low

**Risk 2: Accidental bulk operation**
- **Mitigation:** Confirmation dialogs for all regen tools, explicit scope stated
- **Severity:** Low

**Risk 3: Performance with large selections**
- **Mitigation:** Operations already designed for bulk (regen all), no new performance issues
- **Severity:** None

**Risk 4: Backend breaking change**
- **Mitigation:** Files param is optional, backward compatible if not provided
- **Severity:** None

---

## Success Criteria

**Implementation complete when:**
- [ ] All 6 phases checked off
- [ ] All 6 testing scenarios pass
- [ ] Selection badge always visible and accurate
- [ ] Tool tooltips update based on selection
- [ ] Confirmation dialogs explicit about scope
- [ ] API endpoints accept optional files param
- [ ] Progress messages show correct scope
- [ ] Complex tools disabled when no selection
- [ ] Simple tools work with or without selection

**User experience success:**
- User selects files → Tools operate on selected (expected)
- User clears selection → Simple tools operate on all (expected)
- User sees clear visual feedback at all times (badge, tooltips, confirmations)
- No confusion about what will be affected

---

## Questions?

If you have any questions during implementation:

1. **Scope ambiguity?** → Always err on side of clarity (add more visual indicators)
2. **Edge case unclear?** → Follow professional software conventions (Premiere, DaVinci)
3. **Performance concern?** → Operations already handle bulk, no new issues
4. **UX uncertainty?** → Add confirmation dialog (better safe than destructive)

**Contact:** Product Owner (this session)

---

**Handover complete.** Ready for implementation.

**Estimated effort:** 8 hours (1 day)
**Priority:** Critical (blocks FR-136 progress)
**Next:** Implement in order: Props → Badge → Handlers → Endpoints → Progress → Tooltips
